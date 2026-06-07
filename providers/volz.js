'use strict';

const path = require('path');
const fs   = require('fs');

// ── Shared helpers injected by core engine ──────────────────────────────────
// (normalizeDuration, formatTimeSafe, calculateDayShift, normalizeFlightNumber,
//  getLaunchOptions, getPuppeteer, logDebugError, lookupAirport are passed via ctx)

module.exports = {
  // ── Identity ──────────────────────────────────────────────────────────────
  name:        'volz',
  bookingName: 'Volz.app',
  cacheFile:   'volz_flights.json',

  // ── Step 3: Build the URL Puppeteer navigates to ──────────────────────────
  buildSearchUrl(from, to, departDate, returnDate, pax) {
    const depDate = new Date(departDate).toISOString().split('T')[0];
    const isRT    = returnDate ? 'RT' : 'OW';
    let query = [
      `trip_type=${isRT}`,
      `max_connections=2`,
      `luggage_included=0`,
      `refundable=0`,
      `cabin=0`,
      `adults=${pax || 1}`,
      `children=0`,
      `held_infants=0`,
      `seated_infants=0`,
      `origin[0]=${from}`,
      `destination[0]=${to}`,
      `departure_date[0]=${depDate}`,
      `originMeta[0]=${from}`,
      `destinationMeta[0]=${to}`,
      `length=1`,
    ].join('&');
    if (returnDate) {
      const retDate = new Date(returnDate).toISOString().split('T')[0];
      query += `&return_date[0]=${retDate}`;
    }
    return `https://volz.app/en/flights?${query}`;
  },

  // ── Step 4: Which network request to intercept ────────────────────────────
  interceptFilter(url) {
    return url.includes('/flight/availability');
  },

  // ── Step 5: Is the intercepted JSON valid? ────────────────────────────────
  validateJson(json) {
    return json && json.data && Array.isArray(json.data) && json.data.length > 0;
  },

  // ── Step 6: Extract the raw offers array ──────────────────────────────────
  getOffers(json) {
    return json.data;
  },

  // ── Step 7: Normalize ONE raw offer → Standard Output Format ─────────────
  parseOffer(offer, ctx) {
    const { from, to, isRoundTrip, normalizeDuration, formatTimeSafe,
            calculateDayShift, normalizeFlightNumber } = ctx;

    const jOut     = offer.itineraries[0];
    const sOut     = jOut.segments[0];
    const sOutLast = jOut.segments[jOut.segments.length - 1];

    const carrier          = sOut.carrier || sOut.operatingCarrier || 'XX';
    const rawFlightNum     = String(sOut.flightNumber || sOut.flight_number || '');
    const flightNum        = rawFlightNum.includes('-') ? rawFlightNum.split('-')[1] : rawFlightNum;
    const operatingAirline = sOut.operatingCarrier || carrier;
    const duration         = normalizeDuration(jOut.totalDuration || jOut.duration);
    const realOrigin       = sOut.departure?.iataCode   || from.toUpperCase();
    const realDest         = sOutLast.arrival?.iataCode || to.toUpperCase();

    const hasLuggage = (() => {
      try {
        const bags = offer.travelerPricings?.[0]?.fareDetailsBySegment?.[0]?.includedCheckedBags;
        return !!(bags && bags.quantity > 0);
      } catch (e) { return false; }
    })();

    let returnLeg = null;
    if (isRoundTrip && offer.itineraries.length > 1) {
      const jIn      = offer.itineraries[1];
      const sIn      = jIn.segments[0];
      const sInLast  = jIn.segments[jIn.segments.length - 1];
      const rCarrier = sIn.carrier || sIn.operatingCarrier || 'XX';
      const rawRflightNum = String(sIn.flightNumber || sIn.flight_number || '');
      const rFlightNum    = rawRflightNum.includes('-') ? rawRflightNum.split('-')[1] : rawRflightNum;
      returnLeg = {
        flightNo:        normalizeFlightNumber(rCarrier, rFlightNum),
        operatingAirline: sIn.operatingCarrier || rCarrier,
        origin:          sIn.departure?.iataCode    || to.toUpperCase(),
        destination:     sInLast.arrival?.iataCode  || from.toUpperCase(),
        departureDate:   (sIn.departure?.at || '').split('T')[0],
        departure:       formatTimeSafe(sIn.departure?.at),
        arrival:         formatTimeSafe(sInLast.arrival?.at),
        arrivalDayShift: calculateDayShift(sIn.departure?.at, sInLast.arrival?.at),
        duration:        normalizeDuration(jIn.totalDuration || jIn.duration),
        stops:           sIn.numberOfStops || jIn.segments.length - 1,
      };
    }

    return {
      isRoundTrip,
      airline:    carrier,
      stops:      jOut.numOfStops || 0,
      hasLuggage,
      price:      offer.price.acTotal || offer.price.grandTotal || offer.price.total,
      _basePriceGDS: offer.price.total || 0,
      _commission: (offer.price.acTotal || offer.price.total || 0) - (offer.price.total || 0),
      outbound: {
        flightNo:         normalizeFlightNumber(carrier, flightNum),
        operatingAirline,
        origin:           realOrigin,
        destination:      realDest,
        departureDate:    (sOut.departure?.at || '').split('T')[0],
        departure:        formatTimeSafe(sOut.departure?.at),
        arrival:          formatTimeSafe(sOutLast.arrival?.at),
        arrivalDayShift:  calculateDayShift(sOut.departure?.at, sOutLast.arrival?.at),
        duration,
      },
      returnLeg,
      provider: 'volz',
    };
  },

  async augmentData(page, initialJson, securityHeaders = {}, capturedApiRequest = null) {
    if (!initialJson || !initialJson.data) return initialJson;
    
    // We already have some initial offers
    const currentOffers = initialJson.data ? initialJson.data.length : 0;
    if (currentOffers === 0) return initialJson;
    
    const newOffers = [];
    const seenIds = new Set(initialJson.data.map(o => JSON.stringify(o)));
    
    if (capturedApiRequest && capturedApiRequest.body) {
      console.log('[Volz] Executing direct programmatic pagination from initial request...');
      
      // Loop up to 50 pages (1000 flights max) to be safe, break when no more flights
      for (let p = 2; p <= 50; p++) {
        const fetched = await page.evaluate(async (url, headers, bodyStr, pageNum) => {
          try {
            // Filter headers to avoid forbidden header names in fetch
            const safeHeaders = {};
            for (const [k, v] of Object.entries(headers)) {
              const lowerK = k.toLowerCase();
              if (k.startsWith(':') || ['host', 'connection', 'content-length', 'origin', 'referer', 'accept-encoding'].includes(lowerK)) {
                continue;
              }
              safeHeaders[k] = v;
            }
            
            let bodyObj = JSON.parse(bodyStr);
            bodyObj.page = pageNum;
            
            const res = await fetch(url, {
              method: 'POST',
              headers: safeHeaders,
              body: JSON.stringify(bodyObj)
            });
            
            if (!res.ok) {
               return { error: `Fetch failed with status: ${res.status}` };
            }
            const json = await res.json();
            return (json && json.data && Array.isArray(json.data)) ? json.data : [];
          } catch (e) {
            return { error: `Fetch error: ${e.message}` };
          }
        }, capturedApiRequest.url, capturedApiRequest.headers, capturedApiRequest.body, p);
        
        if (fetched && fetched.error) {
          console.log(`[Volz] Pagination fetch failed on page ${p}:`, fetched.error);
          break; // Stop paginating if server blocks us
        } else if (fetched && fetched.length > 0) {
          let addedCount = 0;
          for (const offer of fetched) {
            const id = JSON.stringify(offer);
            if (!seenIds.has(id)) {
              seenIds.add(id);
              newOffers.push(offer);
              addedCount++;
            }
          }
          if (addedCount === 0) {
            console.log(`[Volz] Page ${p} returned duplicate flights, stopping pagination.`);
            break;
          }
        } else {
          console.log(`[Volz] Page ${p} returned empty, finished pagination.`);
          break; // Reached the end
        }
      }
    } else {
      console.log('[Volz] No captured POST payload available. Skipping pagination.');
    }

    if (newOffers && newOffers.length > 0) {
      initialJson.data.push(...newOffers);
      console.log(`[Volz] Added ${newOffers.length} new offers!`);
    }
    
    return initialJson;
  },

  // ── Step 8: Pre-filled search redirect URL ────────────────────────────────
  buildBookingUrl(from, to, departDate, returnDate, pax) {
    return this.buildSearchUrl(from, to, departDate, returnDate, pax);
  },
};
