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
    const flightNum        = String(sOut.flightNumber || '');
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
      returnLeg = {
        flightNo:        normalizeFlightNumber(rCarrier, String(sIn.flightNumber || '')),
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

  // ── Step 8: Pre-filled search redirect URL ────────────────────────────────
  buildBookingUrl(from, to, departDate, returnDate, pax) {
    return this.buildSearchUrl(from, to, departDate, returnDate, pax);
  },
};
