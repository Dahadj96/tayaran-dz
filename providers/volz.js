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

  async augmentData(page, initialJson, securityHeaders = {}) {
    if (!initialJson || !initialJson.data || !initialJson.search_code) return initialJson;
    
    const searchCode = initialJson.search_code;
    const availableAirlines = initialJson.filters?.cheapests ? Object.keys(initialJson.filters.cheapests) : [];
    
    if (availableAirlines.length === 0) return initialJson;
    
    // Find airlines we already have in the initial offers
    const existingAirlines = new Set();
    for (const offer of initialJson.data) {
      if (offer.itineraries && offer.itineraries.length > 0 && offer.itineraries[0].segments && offer.itineraries[0].segments.length > 0) {
        existingAirlines.add(offer.itineraries[0].segments[0].carrier);
      }
    }
    
    // Find missing airlines
    const missingAirlines = availableAirlines
      .filter(code => code && !existingAirlines.has(code));
      
    const totalOffers = initialJson.total || 0;
    const currentOffers = initialJson.data ? initialJson.data.length : 0;
    
    if (missingAirlines.length === 0 && totalOffers <= currentOffers) return initialJson;
    
    if (missingAirlines.length > 0) {
      console.log(`[Volz] Missing airlines detected: ${missingAirlines.join(', ')}`);
    }
    if (totalOffers > currentOffers) {
      console.log(`[Volz] Found ${totalOffers} total offers (only got ${currentOffers}), fetching pagination...`);
    }

    console.log(`[Volz] Starting UI interaction data augmentation...`);
    
    const newOffers = [];
    const seenIds = new Set(initialJson.data.map(o => JSON.stringify(o))); // Volz offers might not have flightId at root, so stringify
    
    // Set up response interceptor
    const responseHandler = async (response) => {
      const url = response.url();
      if (url.includes('/flight/availability') && response.request().method() === 'POST') {
        try {
          const json = await response.json();
          if (json && json.data && Array.isArray(json.data)) {
            for (const offer of json.data) {
              const id = JSON.stringify(offer);
              if (!seenIds.has(id)) {
                seenIds.add(id);
                newOffers.push(offer);
              }
            }
          }
        } catch (e) {}
      }
    };
    
    page.on('response', responseHandler);
    
    try {
      // Step 1: Scroll to bottom repeatedly
      for (let i = 0; i < 4; i++) {
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        await new Promise(r => setTimeout(r, 1000));
      }
      
      // Step 2: Try to click all filter checkboxes (like airlines)
      await page.evaluate(async () => {
        const checkboxes = Array.from(document.querySelectorAll('input[type="checkbox"], .checkbox, .ant-checkbox-wrapper'));
        for (const cb of checkboxes) {
          try {
            if (cb.offsetHeight > 0) {
              cb.click();
              await new Promise(r => setTimeout(r, 500));
            }
          } catch(e) {}
        }
      });
      
      await new Promise(r => setTimeout(r, 3000));
      
      // Step 3: Try standard pagination Next button / Load More button
      for (let p = 0; p < 10; p++) {
        const clicked = await page.evaluate(() => {
          const buttons = Array.from(document.querySelectorAll('button, a'));
          const nextBtn = buttons.find(b => {
            const txt = (b.innerText || '').toLowerCase();
            return txt.includes('plus') || txt.includes('more') || txt.includes('suiv') || b.classList.contains('ant-pagination-next');
          });
          
          if (nextBtn && !nextBtn.disabled && nextBtn.offsetHeight > 0) {
            nextBtn.click();
            return true;
          }
          return false;
        });
        if (!clicked) break;
        await new Promise(r => setTimeout(r, 2000));
      }
    } catch (e) {
      console.log(`[Volz] UI interaction error: ${e.message}`);
    } finally {
      page.off('response', responseHandler);
    }

    // newOffers already holds the offers captured by the interceptor
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
