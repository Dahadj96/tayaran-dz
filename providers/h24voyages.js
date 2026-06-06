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
    
    console.log(`[H24Voyages] Starting UI interaction data augmentation...`);
    const totalOffersExpected = initialJson.data.total || 0;
    
    const newOffers = [];
    const seenIds = new Set(initialJson.data.offers.map(o => o.flightId || JSON.stringify(o)));
    
    // Set up response interceptor
    const responseHandler = async (response) => {
      const url = response.url();
      if (url.includes('/server/api/flights') && url.includes('/results')) {
        try {
          const json = await response.json();
          if (json && json.data && json.data.offers && Array.isArray(json.data.offers)) {
            for (const offer of json.data.offers) {
              const id = offer.flightId || JSON.stringify(offer);
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
      // Step 1: Scroll to bottom repeatedly to trigger any lazy loading or reveal pagination
      for (let i = 0; i < 3; i++) {
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        await new Promise(r => setTimeout(r, 1000));
      }
      
      // Step 2: Try to click all airline filter checkboxes one by one to force loading
      // This is often the most reliable way to get all flights when pagination is tricky
      await page.evaluate(async () => {
        // Find checkboxes that might be airlines. Usually they are in a filter panel.
        const checkboxes = Array.from(document.querySelectorAll('.ant-checkbox-wrapper, [type="checkbox"]'));
        // We will just click the ones that appear to have a label
        for (const cb of checkboxes) {
          try {
            if (cb.offsetHeight > 0) {
              cb.click();
              // wait a bit for network request to fire
              await new Promise(r => setTimeout(r, 500));
            }
          } catch(e) {}
        }
      });
      
      // Wait for any final requests to finish
      await new Promise(r => setTimeout(r, 3000));
      
      // Step 3: Try standard pagination Next button if present
      for (let p = 0; p < 10; p++) {
        const clicked = await page.evaluate(() => {
          const nextBtn = document.querySelector('.ant-pagination-next:not(.ant-pagination-disabled)');
          if (nextBtn && nextBtn.offsetHeight > 0) {
            nextBtn.click();
            return true;
          }
          return false;
        });
        if (!clicked) break;
        await new Promise(r => setTimeout(r, 2000));
      }
    } catch (e) {
      console.log(`[H24Voyages] UI interaction error: ${e.message}`);
    } finally {
      page.off('response', responseHandler);
    }
    
    if (newOffers.length > 0) {
      initialJson.data.offers.push(...newOffers);
      console.log(`[H24Voyages] Added ${newOffers.length} new offers via UI interaction!`);
    } else {
      console.log(`[H24Voyages] No new offers captured via UI interaction.`);
    }
    
    return initialJson;
  },

  buildBookingUrl(from, to, departDate, returnDate, pax) {
    // Same as search URL since the UI supports deep linking perfectly
    return this.buildSearchUrl(from, to, departDate, returnDate, pax);
  },
};
