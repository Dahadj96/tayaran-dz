'use strict';

const fs   = require('fs');
const path = require('path');

// Lazy load airport database for URL construction
let airportsData = null;
function lookupAirport(code) {
  if (!airportsData) {
    try {
      const dbContent = fs.readFileSync(path.join(__dirname, '../public/airports-db.js'), 'utf8');
      const match = dbContent.match(/\[.*\]/s);
      airportsData = match ? JSON.parse(match[0]) : [];
    } catch (e) {
      airportsData = [];
    }
  }
  return airportsData.find(a => a.iata === code) || { iata: code, name: code, city: code, country: '' };
}

module.exports = {
  // ── Identity ────────────────────────────────────────────────────────────────
  name:        'dunevoyages',
  bookingName: 'Dune Voyages',
  cacheFile:   'dune_flights.json',

  // ── Step 3: Build the URL Puppeteer navigates to ────────────────────────────
  buildSearchUrl(from, to, departDate, returnDate, pax) {
    const fromInfo = lookupAirport(from);
    const toInfo   = lookupAirport(to);
    const isRT     = returnDate ? 'Round Trip' : 'One Way';

    // Matches Dune's expected JSON state — uses 'city' key (not 'city_name' like H24)
    const searchState = {
      tripType: isRT,
      passengerDrop: {
        adults:  parseInt(pax) || 1,
        child:   0,
        infants: 0,
      },
      classe:       'economy',
      depart1:      fromInfo.name,
      depart1iata: {
        iata_code:    fromInfo.iata,
        airport_name: fromInfo.name,
        city:         fromInfo.city,
        country:      fromInfo.country || 'Algeria',
        country_code: 'DZ',
      },
      destination1:     toInfo.name,
      destination1iata: {
        iata_code:    toInfo.iata,
        airport_name: toInfo.name,
        city:         toInfo.city,
        country:      toInfo.country || '',
        country_code: toInfo.country || 'DZ',
      },
      stops:      false,
      baggage:    false,
      refundable: false,
    };

    // Dune uses T00:00:00.000Z (midnight UTC = 01:00 Algeria — safe for correct day)
    if (returnDate) {
      searchState.datePickerRange1 = [
        `${departDate}T00:00:00.000Z`,
        `${returnDate}T00:00:00.000Z`,
      ];
    } else {
      searchState.datePicker1 = `${departDate}T00:00:00.000Z`;
    }

    const encoded = encodeURIComponent(JSON.stringify(searchState));
    return `https://vols.dunevoyages.com/flights/results?${encoded}=`;
  },

  // ── Step 4: Intercept filter ─────────────────────────────────────────────────
  // Confirmed URL: https://vols.dunevoyages.com/server/api/flights/flights/search
  interceptFilter(url) {
    return url.includes('flights/flights/search');
  },

  // ── Step 5: Validate intercepted JSON ────────────────────────────────────────
  // Same API platform as H24 Voyages — identical response shape
  validateJson(json) {
    return json && json.data && json.data.offers && Array.isArray(json.data.offers);
  },

  // ── Step 6: Extract raw offers ───────────────────────────────────────────────
  getOffers(json) {
    return json.data.offers;
  },

  // ── Step 7: Parse one offer → Standard Output Format ─────────────────────────
  // Identical to h24voyages.js — same platform, same response structure
  parseOffer(offer, ctx) {
    const { isRoundTrip, normalizeDuration, formatTimeSafe,
            calculateDayShift, normalizeFlightNumber } = ctx;

    if (!offer.journey || offer.journey.length === 0) return null;

    const jOut = offer.journey[0];
    if (!jOut.flightSegments || jOut.flightSegments.length === 0) return null;

    const sOutFirst = jOut.flightSegments[0];
    const sOutLast  = jOut.flightSegments[jOut.flightSegments.length - 1];

    const carrier          = sOutFirst.marketingAirline || 'XX';
    const flightNum        = String(sOutFirst.flightNumber || '');
    const operatingAirline = sOutFirst.operatingAirline || carrier;

    const durationMins = jOut.flight?.flightInfo?.durationTime
                      || (parseInt(sOutFirst.duration) * 60)
                      || 0;
    const duration = durationMins
      ? `${Math.floor(durationMins / 60)}h ${durationMins % 60}m`
      : (jOut.flight?.flightInfo?.duration || '');

    const hasLuggage = (() => {
      try {
        const bags = sOutFirst.baggageAllowance?.checkedInBaggage;
        return bags && bags.length > 0;
      } catch (e) { return false; }
    })();

    let returnLeg = null;
    if (isRoundTrip && offer.journey.length > 1) {
      const jIn = offer.journey[1];
      if (jIn.flightSegments && jIn.flightSegments.length > 0) {
        const sInFirst = jIn.flightSegments[0];
        const sInLast  = jIn.flightSegments[jIn.flightSegments.length - 1];
        const rCarrier = sInFirst.marketingAirline || 'XX';

        const rDurationMins = jIn.flight?.flightInfo?.durationTime || 0;
        const rDuration = rDurationMins
          ? `${Math.floor(rDurationMins / 60)}h ${rDurationMins % 60}m`
          : (jIn.flight?.flightInfo?.duration || '');

        returnLeg = {
          flightNo:         normalizeFlightNumber(rCarrier, String(sInFirst.flightNumber || '')),
          operatingAirline: sInFirst.operatingAirline || rCarrier,
          origin:           sInFirst.departureAirportCode,
          destination:      sInLast.arrivalAirportCode,
          departureDate:    (sInFirst.departureDateTime || '').split('T')[0],
          departure:        formatTimeSafe(sInFirst.departureDateTime),
          arrival:          formatTimeSafe(sInLast.arrivalDateTime),
          arrivalDayShift:  calculateDayShift(sInFirst.departureDateTime, sInLast.arrivalDateTime),
          duration:         rDuration,
          stops:            jIn.flightSegments.length - 1,
        };
      }
    }

    return {
      isRoundTrip,
      airline:    carrier,
      stops:      jOut.flightSegments.length - 1,
      hasLuggage,
      price:      offer.fare?.totalFare || offer.pricingInfo?.totalFare || 0,
      outbound: {
        flightNo:         normalizeFlightNumber(carrier, flightNum),
        operatingAirline,
        origin:           sOutFirst.departureAirportCode,
        destination:      sOutLast.arrivalAirportCode,
        departureDate:    (sOutFirst.departureDateTime || '').split('T')[0],
        departure:        formatTimeSafe(sOutFirst.departureDateTime),
        arrival:          formatTimeSafe(sOutLast.arrivalDateTime),
        arrivalDayShift:  calculateDayShift(sOutFirst.departureDateTime, sOutLast.arrivalDateTime),
        duration,
      },
      returnLeg,
      provider: 'dunevoyages',
    };
  },

  // ── Step 8: Pre-filled booking redirect URL ───────────────────────────────────
  buildBookingUrl(from, to, departDate, returnDate, pax) {
    return this.buildSearchUrl(from, to, departDate, returnDate, pax);
  },
};
