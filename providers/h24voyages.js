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
        `${departDate}T12:00:00.000Z`,
        `${returnDate}T12:00:00.000Z`
      ];
    } else {
      state.datePicker1 = `${departDate}T12:00:00.000Z`;
    }

    const encodedState = encodeURIComponent(JSON.stringify(state));
    return `https://vols.h24voyages.com/flights/results?${encodedState}=`;
  },

  interceptFilter(url) {
    // We want the flight search response
    return url.includes('flights/search') && !url.includes('price-calendar');
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

  async augmentData(page, initialJson, securityHeaders = {}) {
    if (!initialJson || !initialJson.data || !initialJson.data.offers) return initialJson;
    
    const searchCode = initialJson.searchCode || initialJson.data.searchCode;
    const availableAirlines = initialJson.data.filterDependencies?.airlines || [];
    
    if (!searchCode) {
      console.log('[H24Voyages] No searchCode found, skipping augmentation.');
      return initialJson;
    }
    
    const secret = 'your-secret-key-change-in-production';
    const crypto = require('crypto');
    
    const baseHeaders = {
      'accept': 'application/json',
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
      'referer': 'https://vols.h24voyages.com/',
      'origin': 'https://vols.h24voyages.com',
      ...securityHeaders,
    };
    
    // Helper to fetch a results page using server-side fetch with generated signatures
    const fetchResultsPage = async (airline, pageNum) => {
      try {
        const resultsPath = `/server/api/flightsagg/flights/results?searchCode=${searchCode}&airline=${airline || ''}&supplier=&page=${pageNum}`;
        const timestamp = Date.now().toString();
        const message = `GET:${resultsPath}::${timestamp}`;
        const signature = crypto.createHmac('sha256', secret).update(message).digest('hex');

        const headers = {
          ...baseHeaders,
          'x-api-signature': signature,
          'x-api-timestamp': timestamp,
        };
        
        const url = `https://vols.h24voyages.com${resultsPath}`;
        const res = await fetch(url, { headers });
        if (!res.ok) {
          const errText = await res.text();
          if (pageNum === 1 && airline) {
            console.log(`[H24Voyages] Failed to fetch airline ${airline}: HTTP ${res.status}`);
          }
          return [];
        }
        const json = await res.json();
        if (json && json.data && json.data.offers && Array.isArray(json.data.offers)) {
          return json.data.offers;
        }
        return [];
      } catch (e) {
        return [];
      }
    };

    // Fetch remaining pages first (all pages, starting from 1)
    const totalOffers = initialJson.data.total || 0;
    const currentOffers = initialJson.data.offers.length;
    
    if (totalOffers > currentOffers) {
      const totalPages = Math.ceil(totalOffers / 50);
      console.log(`[H24Voyages] Found ${totalOffers} total offers, fetching all ${totalPages} pages...`);
      
      const allPageOffers = [];
      for (let p = 1; p <= totalPages; p++) {
        const offers = await fetchResultsPage('', p);
        allPageOffers.push(...offers);
      }
      
      if (allPageOffers.length > 0) {
        initialJson.data.offers = allPageOffers;
        console.log(`[H24Voyages] Replaced with ${allPageOffers.length} offers from full fetch!`);
      }
    }
    
    if (availableAirlines.length === 0) return initialJson;
    
    const existingAirlines = new Set();
    for (const offer of initialJson.data.offers) {
      if (offer.journey && offer.journey.length > 0 && offer.journey[0].flightSegments && offer.journey[0].flightSegments.length > 0) {
        existingAirlines.add(offer.journey[0].flightSegments[0].marketingAirline);
      }
    }
    
    const missingAirlines = availableAirlines
      .map(a => a.IataCode)
      .filter(code => code && !existingAirlines.has(code));
      
    if (missingAirlines.length === 0) return initialJson;
    
    console.log(`[H24Voyages] Missing airlines detected: ${missingAirlines.join(', ')}`);
    
    // Fetch each missing airline using server-side fetch
    const newOffers = [];
    for (const airline of missingAirlines) {
      const offers = await fetchResultsPage(airline, 1);
      newOffers.push(...offers);
      
      // Check if this airline has multiple pages
      if (offers.length > 0) {
        // We got page 1; try to figure out total from the response
        try {
          const params = new URLSearchParams({ searchCode, airline, supplier: '', page: '1' });
          const url = `https://vols.h24voyages.com/server/api/flightsagg/flights/results?${params}`;
          const res = await fetch(url, { headers: baseHeaders });
          if (res.ok) {
            const json = await res.json();
            if (json.data && json.data.total > json.data.offers.length) {
              const extraPages = Math.ceil(json.data.total / 50);
              for (let p = 2; p <= extraPages; p++) {
                const extra = await fetchResultsPage(airline, p);
                newOffers.push(...extra);
              }
            }
          }
        } catch (e) {}
      }
    }
    
    if (newOffers.length > 0) {
      initialJson.data.offers.push(...newOffers);
      console.log(`[H24Voyages] Added ${newOffers.length} new offers!`);
    }
    
    return initialJson;
  },

  buildBookingUrl(from, to, departDate, returnDate, pax) {
    // Same as search URL since the UI supports deep linking perfectly
    return this.buildSearchUrl(from, to, departDate, returnDate, pax);
  },
};
