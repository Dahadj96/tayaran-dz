'use strict';

/**
 * ============================================================
 *  TayaranDZ — PROVIDER TEMPLATE
 *  Copy this file to providers/<yoursite>.js and fill it in.
 *  The core engine will pick it up automatically on restart.
 *  You do NOT need to touch server.js at all.
 * ============================================================
 *
 *  STANDARD OUTPUT FORMAT
 *  Every parseOffer() call MUST return this exact shape:
 *  ─────────────────────────────────────────────────────────
 *  {
 *    isRoundTrip: Boolean,
 *    airline:     'XX',          // 2-letter IATA marketing airline code
 *    stops:       Number,        // 0 = direct
 *    hasLuggage:  Boolean,
 *    price:       Number,        // Total price in DZD
 *    outbound: {
 *      flightNo:          'AH 1234',
 *      operatingAirline:  'TK',         // The REAL airline flying the plane
 *      origin:            'ALG',
 *      destination:       'CDG',
 *      departureDate:     '2026-06-15', // YYYY-MM-DD  ← used for deduplication
 *      departure:         '09:40',      // HH:mm       ← displayed to user
 *      arrival:           '13:20',      // HH:mm       ← displayed to user
 *      arrivalDayShift:   0,            // 1 = arrives next day (+1 badge)
 *      duration:          '3h 40m',
 *    },
 *    returnLeg: null,           // Same shape as outbound, or null for one-way
 *    provider:  'yourprovider', // Must exactly match module.exports.name
 *  }
 */

module.exports = {

  // ── STEP 2: Set the provider identity ─────────────────────────────────────
  name:        'template',          // lowercase, no spaces — used as key in prices object
  bookingName: 'Template Site',     // displayed on the "Book" button in the UI
  cacheFile:   'template_flights.json', // filename for the on-disk cache fallback

  // ── STEP 3: Build the URL Puppeteer will navigate to ─────────────────────
  //   `from` and `to` are IATA codes (e.g. 'ALG', 'CDG')
  //   `departDate` and `returnDate` are strings 'YYYY-MM-DD'
  //   `pax` is the number of adult passengers
  buildSearchUrl(from, to, departDate, returnDate, pax) {
    // Example:
    // return `https://example.com/search?origin=${from}&dest=${to}&date=${departDate}`;
    throw new Error('[Template] buildSearchUrl() is not implemented.');
  },

  // ── STEP 4: Which network request should be intercepted? ─────────────────
  //   Return true for the URL of the JSON API call the site makes internally.
  //   TIP: Open DevTools → Network tab → filter by "Fetch/XHR" while searching.
  interceptFilter(url) {
    // Example:
    // return url.includes('/api/flights/search');
    throw new Error('[Template] interceptFilter() is not implemented.');
  },

  // ── STEP 5: Is the intercepted JSON actually useful? ─────────────────────
  //   Return true only if the JSON contains real flight offers.
  validateJson(json) {
    // Example:
    // return json && json.results && json.results.length > 0;
    throw new Error('[Template] validateJson() is not implemented.');
  },

  // ── STEP 6: Extract the raw offers array from the JSON ───────────────────
  getOffers(json) {
    // Example:
    // return json.results;
    throw new Error('[Template] getOffers() is not implemented.');
  },

  // ── STEP 7: Normalize ONE raw offer into the Standard Output Format ───────
  //   `ctx` contains shared helpers:
  //     ctx.from, ctx.to           — IATA strings
  //     ctx.isRoundTrip            — Boolean
  //     ctx.normalizeDuration(x)   — converts minutes or "PT2H30M" → "2h 30m"
  //     ctx.formatTimeSafe(iso)    — "2026-06-15T09:40:00" → "09:40"
  //     ctx.calculateDayShift(d,a) — returns 0, 1, or 2 (next-day arrivals)
  //     ctx.normalizeFlightNumber(airline, num) → "AH 1234"
  parseOffer(offer, ctx) {
    const { from, to, isRoundTrip } = ctx;

    // ── Outbound leg ────────────────────────────────────────────────────────
    // TODO: Replace these with your site's actual JSON field names
    const airline          = offer.marketingCarrier || 'XX';
    const operatingAirline = offer.operatingCarrier || airline;  // IMPORTANT for codeshares!
    const flightNum        = String(offer.flightNumber || '');
    const origin           = offer.departure?.iataCode || from.toUpperCase();
    const destination      = offer.arrival?.iataCode   || to.toUpperCase();
    const departureIso     = offer.departure?.dateTime  || '';   // Full ISO string
    const arrivalIso       = offer.arrival?.dateTime    || '';   // Full ISO string
    const price            = offer.price?.total         || 0;
    const stops            = offer.stops                || 0;
    const hasLuggage       = offer.includedBaggage      || false;
    const durationRaw      = offer.duration             || 0;    // minutes or ISO string

    const outbound = {
      flightNo:         ctx.normalizeFlightNumber(airline, flightNum),
      operatingAirline,
      origin,
      destination,
      departureDate:    departureIso.split('T')[0],
      departure:        ctx.formatTimeSafe(departureIso),
      arrival:          ctx.formatTimeSafe(arrivalIso),
      arrivalDayShift:  ctx.calculateDayShift(departureIso, arrivalIso),
      duration:         ctx.normalizeDuration(durationRaw),
    };

    // ── Return leg (only for round-trip) ─────────────────────────────────────
    let returnLeg = null;
    if (isRoundTrip && offer.returnFlight) {
      const r            = offer.returnFlight;
      const rAirline     = r.marketingCarrier || airline;
      const rOperating   = r.operatingCarrier || rAirline;
      const rDepIso      = r.departure?.dateTime || '';
      const rArrIso      = r.arrival?.dateTime   || '';
      returnLeg = {
        flightNo:         ctx.normalizeFlightNumber(rAirline, String(r.flightNumber || '')),
        operatingAirline: rOperating,
        origin:           r.departure?.iataCode || to.toUpperCase(),
        destination:      r.arrival?.iataCode   || from.toUpperCase(),
        departureDate:    rDepIso.split('T')[0],
        departure:        ctx.formatTimeSafe(rDepIso),
        arrival:          ctx.formatTimeSafe(rArrIso),
        arrivalDayShift:  ctx.calculateDayShift(rDepIso, rArrIso),
        duration:         ctx.normalizeDuration(r.duration || 0),
        stops:            r.stops || 0,
      };
    }

    return {
      isRoundTrip,
      airline,
      stops,
      hasLuggage,
      price,
      outbound,
      returnLeg,
      provider: this.name,  // Must match module.exports.name exactly
    };
  },

  // ── STEP 8: Build the pre-filled search redirect URL ─────────────────────
  //   Shown when user clicks "Book on Template Site"
  buildBookingUrl(from, to, departDate, returnDate, pax) {
    // Most of the time this is the same as buildSearchUrl()
    return this.buildSearchUrl(from, to, departDate, returnDate, pax);
  },
};
