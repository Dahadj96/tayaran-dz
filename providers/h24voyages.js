'use strict';

const fs = require('fs');
const path = require('path');

// Lazy load airport database for H24 URL construction
let airportsData = null;
function lookupAirport(code) {
  if (!airportsData) {
    try {
      const dbContent = fs.readFileSync(path.join(__dirname, '../public/airports-db.js'), 'utf8');
      const match = dbContent.match(/\[.*\]/s);
      if (match) {
        airportsData = JSON.parse(match[0]);
      } else {
        airportsData = [];
      }
    } catch(e) {
      airportsData = [];
    }
  }
  return airportsData.find(a => a.iata === code) || { iata: code, name: code, city: code, country: '' };
}

module.exports = {
  name:        'h24voyages',
  bookingName: 'H24 Voyages',
  cacheFile:   'h24_flights.json',

  buildSearchUrl(from, to, departDate, returnDate, pax) {
    const fromInfo = lookupAirport(from);
    const toInfo   = lookupAirport(to);
    const isRT     = returnDate ? 'Round Trip' : 'One Way';
    
    // Exactly matches H24's encoded URL state
    const state = {
      tripType: isRT,
      passengerDrop: {
        adults: pax || 1,
        young: 0,
        seniors: 0,
        child: 0,
        infants: 0
      },
      classe: "economy",
      depart1: `${fromInfo.name} ${fromInfo.city}`,
      depart1iata: {
        airport_name: fromInfo.name,
        country: fromInfo.country,
        city_name: fromInfo.city,
        iata_code: fromInfo.iata,
        country_code: fromInfo.country
      },
      destination1: `${toInfo.name} ${toInfo.city}`,
      destination1iata: {
        airport_name: toInfo.name,
        country: toInfo.country,
        city_name: toInfo.city,
        iata_code: toInfo.iata,
        country_code: toInfo.country
      },
      stops: false,
      baggage: false,
      refundable: false,
    };

    if (returnDate) {
      state.datePickerRange1 = [
        `${departDate}T23:00:00.000Z`,
        `${returnDate}T23:00:00.000Z`
      ];
    } else {
      state.datePicker1 = `${departDate}T23:00:00.000Z`;
    }

    const encodedState = encodeURIComponent(JSON.stringify(state));
    return `https://vols.h24voyages.com/flights/results?${encodedState}=`;
  },

  interceptFilter(url) {
    // We want the flight search response
    return url.includes('flights/flights/search');
  },

  validateJson(json) {
    return json && json.data && json.data.offers && Array.isArray(json.data.offers);
  },

  getOffers(json) {
    return json.data.offers;
  },

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
    
    // H24 duration logic
    const durationMins = jOut.flight?.flightInfo?.durationTime || (parseInt(sOutFirst.duration) * 60) || 0;
    const duration     = durationMins ? `${Math.floor(durationMins/60)}h ${durationMins%60}m` : (jOut.flight?.flightInfo?.duration || '');

    const hasLuggage = (() => {
      try {
        const bags = sOutFirst.baggageAllowance?.checkedInBaggage;
        return bags && bags.length > 0;
      } catch (e) { return false; }
    })();

    let returnLeg = null;
    if (isRoundTrip && offer.journey.length > 1) {
      const jIn      = offer.journey[1];
      if (jIn.flightSegments && jIn.flightSegments.length > 0) {
        const sInFirst = jIn.flightSegments[0];
        const sInLast  = jIn.flightSegments[jIn.flightSegments.length - 1];
        const rCarrier = sInFirst.marketingAirline || 'XX';
        
        const rDurationMins = jIn.flight?.flightInfo?.durationTime || 0;
        const rDuration     = rDurationMins ? `${Math.floor(rDurationMins/60)}h ${rDurationMins%60}m` : (jIn.flight?.flightInfo?.duration || '');
        
        returnLeg = {
          flightNo:        normalizeFlightNumber(rCarrier, String(sInFirst.flightNumber || '')),
          operatingAirline: sInFirst.operatingAirline || rCarrier,
          origin:          sInFirst.departureAirportCode,
          destination:     sInLast.arrivalAirportCode,
          departureDate:   (sInFirst.departureDateTime || '').split('T')[0],
          departure:       formatTimeSafe(sInFirst.departureDateTime),
          arrival:         formatTimeSafe(sInLast.arrivalDateTime),
          arrivalDayShift: calculateDayShift(sInFirst.departureDateTime, sInLast.arrivalDateTime),
          duration:        rDuration,
          stops:           jIn.flightSegments.length - 1,
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
      provider: 'h24voyages',
    };
  },

  buildBookingUrl(from, to, departDate, returnDate, pax) {
    // Same as search URL since the UI supports deep linking perfectly
    return this.buildSearchUrl(from, to, departDate, returnDate, pax);
  },
};
