'use strict';

// ── Shared helpers injected by core engine ──────────────────────────────────
// (normalizeDuration, formatTimeSafe, calculateDayShift, normalizeFlightNumber,
//  getLaunchOptions, getPuppeteer, logDebugError, lookupAirport are passed via ctx)

module.exports = {
  // ── Identity ──────────────────────────────────────────────────────────────
  name:        'mondial',
  bookingName: 'MondialBooking',
  cacheFile:   'mondial_flights.json',

  // ── Step 3: Build the URL Puppeteer navigates to ──────────────────────────
  buildSearchUrl(from, to, departDate, returnDate, pax) {
    const fromAirport = { iata_code: from.toUpperCase(), airport_name: from, city_name: from, country: '', country_code: 'DZ' };
    const toAirport   = { iata_code: to.toUpperCase(),   airport_name: to,   city_name: to,   country: '', country_code: 'DZ' };

    const searchObj = {
      tripType:         returnDate ? 'Round Trip' : 'One Way',
      passengerDrop:    { adults: parseInt(pax) || 1, child: 0, infants: 0 },
      classe:           'economy',
      depart1:          fromAirport.airport_name,
      depart1iata:      fromAirport,
      destination1:     toAirport.airport_name,
      destination1iata: toAirport,
      stops:            false,
      baggage:          false,
      refundable:       false,
      lang:             'fr',
    };

    if (returnDate) {
      searchObj.datePickerRange1 = [
        new Date(departDate).toISOString(),
        new Date(returnDate).toISOString(),
      ];
    } else {
      searchObj.datePicker1 = new Date(departDate).toISOString();
    }

    return `https://vols.mondialbooking.com/flights/results?${encodeURIComponent(JSON.stringify(searchObj))}=`;
  },

  // ── Step 4: Which network request to intercept ────────────────────────────
  interceptFilter(url) {
    return url.includes('/flights/search') && !url.includes('price-calendar');
  },

  // ── Step 5: Is the intercepted JSON valid? ────────────────────────────────
  validateJson(json) {
    const offers = json?.data?.offers;
    return offers && Array.isArray(offers) && offers.length > 0;
  },

  // ── Step 6: Extract the raw offers array ──────────────────────────────────
  getOffers(json) {
    return json.data.offers;
  },

  // ── Step 7: Normalize ONE raw offer → Standard Output Format ─────────────
  parseOffer(offer, ctx) {
    const { from, to, isRoundTrip, normalizeDuration, formatTimeSafe,
            calculateDayShift, normalizeFlightNumber } = ctx;

    // Flight number & airline (marketing)
    const flightNum = offer.journey?.[0]?.flightSegments?.[0]?.flightNumber || '';
    const airline   = offer.journey?.[0]?.flightSegments?.[0]?.marketingAirline
                   || offer.journey?.[0]?.flightSegments?.[0]?.operatingAirline
                   || 'XX';
    const price     = offer.fare?.totalFare || 0;

    // Duration & stops from flight info
    const durationMins   = offer.journey?.[0]?.flight?.flightInfo?.durationTime;
    const realDuration   = normalizeDuration(durationMins);
    const realStops      = offer.journey?.[0]?.flight?.stopQuantity || 0;
    const hasLuggage     = offer.detail?.checkedBaggageIncluded === true;

    // IATA codes from segment data (most reliable)
    const firstSeg        = offer.journey?.[0]?.flightSegments?.[0];
    const lastSeg         = offer.journey?.[0]?.flightSegments?.slice(-1)?.[0];
    const realOrigin      = firstSeg?.departureAirportCode || from.toUpperCase();
    const realDest        = lastSeg?.arrivalAirportCode    || to.toUpperCase();
    const operatingAirline = firstSeg?.operatingAirline   || airline;

    // Full ISO timestamps for day-shift calculation & deduplication
    const departureIso = offer.journey?.[0]?.flight?.flightInfo?.departureDate || '';
    const arrivalIso   = offer.journey?.[0]?.flight?.flightInfo?.arrivalDate   || '';

    const outbound = {
      flightNo:         normalizeFlightNumber(airline, flightNum),
      operatingAirline,
      origin:           realOrigin,
      destination:      realDest,
      departureDate:    departureIso.split('T')[0],
      departure:        formatTimeSafe(departureIso),
      arrival:          formatTimeSafe(arrivalIso),
      arrivalDayShift:  calculateDayShift(departureIso, arrivalIso),
      duration:         realDuration,
    };

    // Return leg
    let returnLeg = null;
    if (isRoundTrip && offer.journey && offer.journey.length > 1) {
      const ret            = offer.journey[1];
      const rFirstSeg      = ret?.flightSegments?.[0];
      const rLastSeg       = ret?.flightSegments?.slice(-1)?.[0];
      const rAirline       = rFirstSeg?.marketingAirline || rFirstSeg?.operatingAirline || airline;
      const rFlightNum     = rFirstSeg?.flightNumber || '';
      const rOperating     = rFirstSeg?.operatingAirline || rAirline;
      const rDepartureIso  = ret?.flight?.flightInfo?.departureDate || '';
      const rArrivalIso    = ret?.flight?.flightInfo?.arrivalDate   || '';
      const rDurationMins  = ret?.flight?.flightInfo?.durationTime;
      const rStops         = ret?.flight?.stopQuantity || 0;

      returnLeg = {
        flightNo:         normalizeFlightNumber(rAirline, rFlightNum),
        operatingAirline: rOperating,
        origin:           rFirstSeg?.departureAirportCode || to.toUpperCase(),
        destination:      rLastSeg?.arrivalAirportCode    || from.toUpperCase(),
        departureDate:    rDepartureIso.split('T')[0],
        departure:        formatTimeSafe(rDepartureIso),
        arrival:          formatTimeSafe(rArrivalIso),
        arrivalDayShift:  calculateDayShift(rDepartureIso, rArrivalIso),
        duration:         normalizeDuration(rDurationMins),
        stops:            rStops,
      };
    }

    return {
      isRoundTrip,
      airline,
      stops: realStops,
      hasLuggage,
      price,
      outbound,
      returnLeg,
      provider: 'mondial',
    };
  },

  // ── Step 8: Pre-filled search redirect URL ────────────────────────────────
  buildBookingUrl(from, to, departDate, returnDate, pax) {
    return this.buildSearchUrl(from, to, departDate, returnDate, pax);
  },
};
