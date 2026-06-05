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

    const pageUrlStr = page.url();
    const urlObj = new URL(pageUrlStr);
    const urlParams = urlObj.searchParams;
    const tripType = urlParams.get('trip_type') || 'OW';
    const origin = urlParams.get('origin[0]');
    const dest = urlParams.get('destination[0]');
    const depDate = urlParams.get('departure_date[0]');
    
    const basePayload = {
      search_code: searchCode,
      trip_type: tripType,
      adults: parseInt(urlParams.get('adults')) || 1,
      children: parseInt(urlParams.get('children')) || 0,
      held_infants: parseInt(urlParams.get('held_infants')) || 0,
      seated_infants: parseInt(urlParams.get('seated_infants')) || 0,
      max_connections: parseInt(urlParams.get('max_connections')) || 2,
      refundable: parseInt(urlParams.get('refundable')) || 0,
      luggage_included: parseInt(urlParams.get('luggage_included')) || 0,
      cabin: "ECONOMY",
      destinations: [{ origin: origin, destination: dest, departure_date: depDate }],
    };

    if (tripType === 'RT') {
      const retDate = urlParams.get('return_date[0]');
      if (retDate) {
        basePayload.destinations.push({ origin: dest, destination: origin, departure_date: retDate });
      }
    }

    const baseHeaders = {
      'accept': 'application/json',
      'content-type': 'application/json',
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
      'referer': 'https://vols.volz.app/',
      'origin': 'https://vols.volz.app',
      ...securityHeaders,
    };

    const fetchAvailability = async (payload) => {
      try {
        const res = await fetch('https://api.volz.app/v1/flight/availability', {
          method: 'POST',
          headers: baseHeaders,
          body: JSON.stringify(payload)
        });
        if (!res.ok) return { offers: [], total: 0 };
        const json = await res.json();
        if (json && json.data && Array.isArray(json.data)) {
          return { offers: json.data, total: json.total || json.data.length || 0 };
        }
        return { offers: [], total: 0 };
      } catch (e) {
        return { offers: [], total: 0 };
      }
    };

    const fetchedOffers = [];

    // Fetch remaining pages first for the main search
    if (totalOffers > currentOffers) {
      const tPages = Math.ceil(totalOffers / 20);
      for (let p = 2; p <= tPages; p++) {
        const mainPayload = { ...basePayload, page: p, sort: "price", desc: false, itinerary_stops: {} };
        const { offers } = await fetchAvailability(mainPayload);
        fetchedOffers.push(...offers);
      }
    }

    // Fetch missing airlines
    for (const airline of missingAirlines) {
      const payload = { ...basePayload, air_companies: [airline], sort: "price", desc: false, itinerary_stops: {} };
      const { offers, total } = await fetchAvailability(payload);
      fetchedOffers.push(...offers);

      if (total > offers.length) {
        const exPages = Math.ceil(total / 20);
        for (let p = 2; p <= exPages; p++) {
          const payloadEx = { ...payload, page: p };
          const { offers: extra } = await fetchAvailability(payloadEx);
          fetchedOffers.push(...extra);
        }
      }
    }

    const newOffers = fetchedOffers;
    
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
