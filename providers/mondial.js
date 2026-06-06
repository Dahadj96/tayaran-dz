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
      _basePriceGDS: offer.originalOffer?.price?.total ? parseFloat(offer.originalOffer.price.total) : (offer.fare?.baseFare || 0),
      _commission: offer.fare?.serviceFees || (offer.fare?.fareBreakdown?.[0]?.paxRate?.serviceFees) || 0,
      outbound,
      returnLeg,
      provider: 'mondial',
    };
  },

  async augmentData(page, initialJson, securityHeaders = {}) {
    if (!initialJson || !initialJson.data || !initialJson.data.offers) return initialJson;
    
    const searchCode = initialJson.searchCode || initialJson.data.searchCode;
    const availableAirlines = initialJson.data.filterDependencies?.airlines || [];
    
    if (!searchCode) {
      console.log('[Mondial] No searchCode found, skipping augmentation.');
      return initialJson;
    }
    
    const baseHeaders = {
      'accept': 'application/json',
      'content-type': 'application/json',
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
      'referer': 'https://vols.mondialbooking.com/',
      'origin': 'https://vols.mondialbooking.com',
      ...securityHeaders,
    };
    
    const fetchResultsPage = async (airline, pageNum) => {
      try {
        const url = `https://vols.mondialbooking.com/server/api/flights/flights/results?searchCode=${searchCode}&airline=${airline || ''}&supplier=&page=${pageNum}`;
        const result = await page.evaluate(async (fetchUrl) => {
          try {
            const res = await fetch(fetchUrl);
            if (!res.ok) return { offers: [], total: 0 };
            const json = await res.json();
            if (json && json.data && json.data.offers && Array.isArray(json.data.offers)) {
              return { offers: json.data.offers, total: json.data.total || 0 };
            }
            return { offers: [], total: 0 };
          } catch (e) {
            return { offers: [], total: 0 };
          }
        }, url);
        return result;
      } catch (e) {
        return { offers: [], total: 0 };
      }
    };

    // Fetch all pages
    const totalOffers = initialJson.data.total || 0;
    const currentOffers = initialJson.data.offers.length;
    
    if (totalOffers > currentOffers) {
      const totalPages = Math.ceil(totalOffers / 50);
      console.log(`[Mondial] Found ${totalOffers} total offers, fetching all ${totalPages} pages...`);
      
      const allPageOffers = [];
      for (let p = 1; p <= totalPages; p++) {
        const { offers } = await fetchResultsPage('', p);
        allPageOffers.push(...offers);
      }
      
      if (allPageOffers.length > 0) {
        initialJson.data.offers = allPageOffers;
        console.log(`[Mondial] Replaced with ${allPageOffers.length} offers from full fetch!`);
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
    
    console.log(`[Mondial] Missing airlines detected: ${missingAirlines.join(', ')}`);
    
    const newOffers = [];
    for (const airline of missingAirlines) {
      const { offers, total } = await fetchResultsPage(airline, 1);
      newOffers.push(...offers);
      
      if (total > offers.length) {
        const extraPages = Math.ceil(total / 50);
        for (let p = 2; p <= extraPages; p++) {
          const { offers: extra } = await fetchResultsPage(airline, p);
          newOffers.push(...extra);
        }
      }
    }
    
    if (newOffers.length > 0) {
      initialJson.data.offers.push(...newOffers);
      console.log(`[Mondial] Added ${newOffers.length} new offers!`);
    }
    
    return initialJson;
  },

  // ── Step 8: Pre-filled search redirect URL ────────────────────────────────
  buildBookingUrl(from, to, departDate, returnDate, pax) {
    return this.buildSearchUrl(from, to, departDate, returnDate, pax);
  },
};
