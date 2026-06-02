/* ================================================================
   TayaranDZ Backend Aggregator — server.js
   Lightweight Axios × High-Speed Flight Aggregator & Normalizer
   ================================================================ */
'use strict';

const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const config = require('./config.json');
const PORT = process.env.PORT || config.port || 5000;
const path = require('path');
const fs = require('fs');

let puppeteerModule = null;
let chromiumModule = null;

async function getPuppeteer() {
  if (!puppeteerModule) {
    if (process.env.VERCEL) {
      puppeteerModule = require('puppeteer-core');
      chromiumModule = require('@sparticuz/chromium');
    } else {
      puppeteerModule = (await import('puppeteer-core')).default;
    }
  }
  return puppeteerModule;
}

async function getLaunchOptions() {
  if (process.env.VERCEL) {
    // Vercel Serverless Chromium config
    return {
      args: chromiumModule.args,
      defaultViewport: chromiumModule.defaultViewport,
      executablePath: await chromiumModule.executablePath(),
      headless: chromiumModule.headless,
      ignoreHTTPSErrors: true,
    };
  }

  // Local fallback
  const opts = {
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-features=AsyncDns']
  };
  const chromeExe = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  if (fs.existsSync(chromeExe)) {
    opts.executablePath = chromeExe;
  }
  return opts;
}

let airportsData = [];
try {
  const dbPath = path.join(__dirname, 'public/airports-db.js');
  const dbContent = fs.readFileSync(dbPath, 'utf8');
  const cleanContent = dbContent.replace(/^\uFEFF/, '');
  const jsonStr = cleanContent.replace(/^window\.globalAirportsData\s*=\s*/, '').replace(/;\s*$/, '');
  airportsData = JSON.parse(jsonStr);
  console.log(`[Database] Loaded ${airportsData.length} airports from airports-db.js successfully.`);
} catch (e) {
  console.error('[Database] Failed to load airports-db.js, using fallback lookup:', e.message);
}

function lookupAirport(iata) {
  const code = (iata || '').toUpperCase();
  const found = airportsData.find(a => a.iata === code);
  if (found) {
    return {
      iata_code: code,
      airport_name: found.name || found.city || code,
      city_name: found.city || code,
      country: found.country === 'DZ' ? 'Algeria' : (found.country || ''),
      country_code: found.country || 'DZ'
    };
  }
  return {
    iata_code: code,
    airport_name: code,
    city_name: code,
    country: 'Algeria',
    country_code: 'DZ'
  };
}

function logDebugError(context, err) {
  const logMsg = `[${new Date().toISOString()}] [${context}] ${err.stack || err.message}\n`;
  try {
    fs.appendFileSync(path.join(__dirname, 'debug_error.log'), logMsg);
  } catch (e) {}
}

// Removed static PUPPETEER_LAUNCH_OPTIONS (now dynamically built per request)
/**
 * Safely retrieves a nested value from an object using an array path.
 * Returns undefined if any segment is missing.
 */
function getValueByPath(obj, pathArray) {
  return pathArray.reduce((acc, key) => (acc && acc[key] !== undefined ? acc[key] : undefined), obj);
}



// Enable CORS so the front-end file:// client can communicate seamlessly
app.use(cors());
app.use(express.json());

// Serve the frontend static files
app.use(express.static(path.join(__dirname, 'public')));

// ===== Helper Functions =====

/**
 * Normalizes duration string or minutes to standard "Xh Ym" format
 */
function normalizeDuration(dur) {
  if (dur == null || dur === '') return '—';
  let h = 0, m = 0;
  if (typeof dur === 'number') {
    h = Math.floor(dur / 60);
    m = dur % 60;
  } else if (typeof dur === 'string') {
    let d = dur.toUpperCase().replace('PT', '').trim();
    const hMatch = d.match(/(\d+)\s*H/);
    const mMatch = d.match(/(\d+)\s*M/);
    if (hMatch || mMatch) {
      h = hMatch ? parseInt(hMatch[1], 10) : 0;
      m = mMatch ? parseInt(mMatch[1], 10) : 0;
    } else {
      const mins = parseInt(d, 10);
      if (!isNaN(mins)) {
        h = Math.floor(mins / 60);
        m = mins % 60;
      } else {
        return dur;
      }
    }
  }
  if (h === 0 && m === 0) return '—';
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

function normalizeFlightNumber(airline, flightNo) {
  if (!flightNo) return '';
  const numStr = String(flightNo).replace(/^[A-Z]{2}[-\s]?/i, '').trim();
  const num = parseInt(numStr, 10);
  return `${airline.toUpperCase()} ${isNaN(num) ? numStr : num}`;
}

function formatTimeSafe(str) {
  if (!str) return '';
  if (str.includes('T')) {
    return str.split('T')[1].substring(0, 5);
  }
  return str.substring(0, 5);
}

function getJourneySubpath(pathArray) {
  if (pathArray && pathArray[0] === 'journey' && pathArray.length > 2) {
    return pathArray.slice(2);
  }
  return pathArray;
}

// ===== Dynamic Data Retrievers =====

/**
 * Fetch flights from MondialBooking using Puppeteer
 */
async function fetchMondialBooking(from, to, departDate, returnDate, pax) {
  let interceptedJson = null;
  const isRoundTrip = !!returnDate;

  try {
    console.log(`[MondialBooking] Fetching via JSON interception: ${from} -> ${to}`);
    const isRT = isRoundTrip;

    // Build search URL
    const fromAirport = lookupAirport(from);
    const toAirport = lookupAirport(to);

    const searchObj = {
      tripType: returnDate ? 'Round Trip' : 'One Way',
      passengerDrop: { adults: parseInt(pax) || 1, child: 0, infants: 0 },
      classe: 'economy',
      depart1: fromAirport.airport_name,
      depart1iata: fromAirport,
      destination1: toAirport.airport_name,
      destination1iata: toAirport,
      stops: false,
      baggage: false,
      refundable: false,
      lang: 'fr'
    };
    if (returnDate) {
      searchObj.datePickerRange1 = [new Date(departDate).toISOString(), new Date(returnDate).toISOString()];
    } else {
      searchObj.datePicker1 = new Date(departDate).toISOString();
    }
    const encodedSearch = encodeURIComponent(JSON.stringify(searchObj));
    const targetUrl = `https://vols.mondialbooking.com/flights/results?${encodedSearch}=`;

    const puppeteer = await getPuppeteer();
    const launchOptions = await getLaunchOptions();
    const browser = await puppeteer.launch(launchOptions);
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36');

    page.on('response', async (response) => {
      const url = response.url();
      if (url.includes('/flights/search') && !url.includes('price-calendar')) {
        try {
          const ct = response.headers()['content-type'] || '';
          if (ct.includes('application/json')) {
            const json = await response.json();
            const offers = getValueByPath(json, config.providers.mondial.offersPath);
            if (offers && offers.length > 0) {
              interceptedJson = json;
            }
          }
        } catch (e) { }
      }
    });

    await page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 30000 });
    // wait for capture up to 15 seconds
    for (let i = 0; i < 15; i++) {
      if (interceptedJson) break;
      await new Promise(r => setTimeout(r, 1000));
    }
    await browser.close();

    // Store with route metadata (fix #2)
    if (interceptedJson) {
      try {
        const storedPayload = {
          route: { from: from.toUpperCase(), to: to.toUpperCase() },
          departDate,
          returnDate: returnDate || null,
          storedAt: new Date().toISOString(),
          data: interceptedJson
        };
        const storedPath = path.join(__dirname, 'mondial_flights.json');
        fs.writeFileSync(storedPath, JSON.stringify(storedPayload, null, 2), 'utf8');
        console.log('[MondialBooking] Stored successfully intercepted flights to disk with route metadata.');
      } catch (e) {
        console.error('[MondialBooking] Failed to store intercepted flights to disk:', e.message);
      }
    }
  } catch (error) {
    console.error('[MondialBooking API Error]:', error.message);
    logDebugError('MondialBooking', error);
  }

  // Load from disk if live scraper failed — with route validation (fix #2)
  if (!interceptedJson) {
    console.log('[MondialBooking] Loading stored flights data from disk...');
    try {
      const storedPath = path.join(__dirname, 'mondial_flights.json');
      if (fs.existsSync(storedPath)) {
        const content = fs.readFileSync(storedPath, 'utf8');
        const stored = JSON.parse(content);

        if (stored.route) {
          // New format with metadata — validate route and dates
          const isDateMatch = stored.departDate === departDate && (stored.returnDate || null) === (returnDate || null);
          if (stored.route.from === from.toUpperCase() && stored.route.to === to.toUpperCase() && isDateMatch) {
            interceptedJson = stored.data;
            console.log('[MondialBooking] Loaded stored flights (route and date match).');
          } else {
            console.log(`[MondialBooking] Cache mismatch: stored=${stored.route.from}->${stored.route.to} on ${stored.departDate}, requested=${from.toUpperCase()}->${to.toUpperCase()} on ${departDate}. Skipping.`);
          }
        } else {
          // Legacy format (raw Mondial response without metadata)
          // Validate by checking actual IATA codes in segment data
          const offers = getValueByPath(stored, config.providers.mondial.offersPath);
          if (offers && offers.length > 0) {
            const firstSeg = offers[0]?.journey?.[0]?.flightSegments?.[0];
            const lastSeg = offers[0]?.journey?.[0]?.flightSegments?.slice(-1)?.[0];
            const storedFrom = firstSeg?.departureAirportCode;
            const storedTo = lastSeg?.arrivalAirportCode;
            if (storedFrom === from.toUpperCase() && storedTo === to.toUpperCase()) {
              interceptedJson = stored;
              console.log('[MondialBooking] Loaded legacy stored data (IATA route match).');
            } else {
              console.log(`[MondialBooking] Legacy data route mismatch: stored=${storedFrom}->${storedTo}, requested=${from.toUpperCase()}->${to.toUpperCase()}. Skipping.`);
            }
          }
        }
      }
    } catch (e) {
      console.error('[MondialBooking] Failed to load stored flights:', e.message);
    }
  }

  if (!interceptedJson) {
    console.log('[MondialBooking] No offers captured or loaded.');
    return [];
  }

  try {
    const offers = getValueByPath(interceptedJson, config.providers.mondial.offersPath);
    if (!offers || !offers.length) {
      console.log('[MondialBooking] No offers found in data.');
      return [];
    }
    console.log(`[MondialBooking] Parsing ${offers.length} offers.`);
    return offers.map((offer, idx) => {
      const flightNum = getValueByPath(offer, config.providers.mondial.flightNumberPath) || '';
      const departure = getValueByPath(offer, config.providers.mondial.departurePath) || '';
      const arrival = getValueByPath(offer, config.providers.mondial.arrivalPath) || '';
      const airline = getValueByPath(offer, config.providers.mondial.airlinePath) || 'XX';
      const price = getValueByPath(offer, config.providers.mondial.pricePath) || 0;

      // Extract real duration from journey data (fix #8)
      const durationMins = offer.journey?.[0]?.flight?.flightInfo?.durationTime;
      const realDuration = normalizeDuration(durationMins);

      // Extract real stops (fix #10)
      const realStops = offer.journey?.[0]?.flight?.stopQuantity || 0;

      // Extract real luggage info (fix #9)
      const hasLuggage = offer.detail?.checkedBaggageIncluded === true;

      // Use real IATA codes from segment data (fix #2)
      const firstSeg = offer.journey?.[0]?.flightSegments?.[0];
      const lastSeg = offer.journey?.[0]?.flightSegments?.slice(-1)?.[0];
      const realOrigin = firstSeg?.departureAirportCode || from.toUpperCase();
      const realDest = lastSeg?.arrivalAirportCode || to.toUpperCase();

      const outbound = {
        flightNo: normalizeFlightNumber(airline, flightNum),
        origin: realOrigin,
        destination: realDest,
        departure: formatTimeSafe(departure),
        arrival: formatTimeSafe(arrival),
        duration: realDuration
      };

      // Build return leg ONLY from real journey data — no fabricated legs (fix #12)
      let returnLeg = null;
      if (isRoundTrip && offer.journey && offer.journey.length > 1) {
        const ret = offer.journey[1];
        const rFlightNum = getValueByPath(ret, getJourneySubpath(config.providers.mondial.flightNumberPath)) || '';
        const rDeparture = getValueByPath(ret, getJourneySubpath(config.providers.mondial.departurePath)) || '';
        const rArrival = getValueByPath(ret, getJourneySubpath(config.providers.mondial.arrivalPath)) || '';
        const rAirline = getValueByPath(ret, getJourneySubpath(config.providers.mondial.airlinePath)) || airline;
        const rDurationMins = ret?.flight?.flightInfo?.durationTime;
        const rStops = ret?.flight?.stopQuantity || 0;
        const rFirstSeg = ret?.flightSegments?.[0];
        const rLastSeg = ret?.flightSegments?.slice(-1)?.[0];
        returnLeg = {
          flightNo: normalizeFlightNumber(rAirline, rFlightNum),
          origin: rFirstSeg?.departureAirportCode || to.toUpperCase(),
          destination: rLastSeg?.arrivalAirportCode || from.toUpperCase(),
          departure: formatTimeSafe(rDeparture),
          arrival: formatTimeSafe(rArrival),
          duration: normalizeDuration(rDurationMins),
          stops: rStops
        };
      }

      return {
        id: `m-${idx}`,
        isRoundTrip,
        airline,
        stops: realStops,
        hasLuggage,
        price,
        outbound,
        returnLeg,
        provider: 'mondial'
      };
    });
  } catch (parseError) {
    console.error('[MondialBooking Parsing Error]:', parseError.message);
    return [];
  }
}

/**
 * Fetch flights from Volz.app using Puppeteer
 */
async function fetchVolz(from, to, departDate, returnDate, pax) {
  let interceptedJson = null;
  const isRoundTrip = !!returnDate;

  try {
    console.log(`[Volz.app] Fetching via JSON interception: ${from} -> ${to}`);
    const depDate = new Date(departDate).toISOString().split('T')[0];
    const isRT = returnDate ? 'RT' : 'OW';
    
    let query = `trip_type=${isRT}&max_connections=2&luggage_included=0&refundable=0&cabin=0&adults=${pax || 1}&children=0&held_infants=0&seated_infants=0&origin[0]=${from}&destination[0]=${to}&departure_date[0]=${depDate}&originMeta[0]=${from}&destinationMeta[0]=${to}&length=1`;
    if (returnDate) {
      const retDate = new Date(returnDate).toISOString().split('T')[0];
      query += `&return_date[0]=${retDate}`;
    }
    const targetUrl = `https://volz.app/en/flights?${query}`;

    const puppeteer = await getPuppeteer();
    const launchOptions = await getLaunchOptions();
    const browser = await puppeteer.launch(launchOptions);
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36');

    page.on('response', async (response) => {
      const url = response.url();
      if (url.includes('/flight/availability')) {
        try {
          const contentType = response.headers()['content-type'];
          if (contentType && contentType.includes('application/json')) {
            const json = await response.json();
            if (json && json.data && Array.isArray(json.data) && json.data.length > 0) {
              interceptedJson = json;
            }
          }
        } catch(e) {}
      }
    });

    await page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 30000 });
    
    for (let i = 0; i < 15; i++) {
      if (interceptedJson) break;
      await new Promise(r => setTimeout(r, 1000));
    }

    await browser.close();

    // Store with route metadata (fix #2)
    if (interceptedJson) {
      try {
        const storedPayload = {
          route: { from: from.toUpperCase(), to: to.toUpperCase() },
          departDate,
          returnDate: returnDate || null,
          storedAt: new Date().toISOString(),
          data: interceptedJson
        };
        const storedPath = path.join(__dirname, 'volz_flights.json');
        fs.writeFileSync(storedPath, JSON.stringify(storedPayload, null, 2), 'utf8');
        console.log('[Volz.app] Stored successfully intercepted flights to disk with route metadata.');
      } catch (e) {
        console.error('[Volz.app] Failed to store intercepted flights to disk:', e.message);
      }
    }
  } catch (error) {
    console.error('[Volz.app API Error]:', error.message);
    logDebugError('Volz', error);
  }

  // Load from disk if live scraper failed — with route validation (fix #2)
  if (!interceptedJson) {
    console.log('[Volz.app] Loading stored flights data from disk...');
    try {
      const storedPath = path.join(__dirname, 'volz_flights.json');
      if (fs.existsSync(storedPath)) {
        const content = fs.readFileSync(storedPath, 'utf8');
        const stored = JSON.parse(content);

        if (stored.route) {
          // New format with metadata — validate route and dates
          const isDateMatch = stored.departDate === departDate && (stored.returnDate || null) === (returnDate || null);
          if (stored.route.from === from.toUpperCase() && stored.route.to === to.toUpperCase() && isDateMatch) {
            interceptedJson = stored.data;
            console.log('[Volz.app] Loaded stored flights (route and date match).');
          } else {
            console.log(`[Volz.app] Cache mismatch: stored=${stored.route.from}->${stored.route.to} on ${stored.departDate}, requested=${from.toUpperCase()}->${to.toUpperCase()} on ${departDate}. Skipping.`);
          }
        } else if (stored.data && Array.isArray(stored.data) && stored.data.length > 0) {
          // Legacy format (raw Volz response without metadata)
          // Validate by checking actual IATA codes in segment data
          const firstOffer = stored.data[0];
          const segs = firstOffer?.itineraries?.[0]?.segments;
          if (segs && segs.length > 0) {
            const storedFrom = segs[0]?.departure?.iataCode;
            const storedTo = segs[segs.length - 1]?.arrival?.iataCode;
            if (storedFrom === from.toUpperCase() && storedTo === to.toUpperCase()) {
              interceptedJson = stored;
              console.log('[Volz.app] Loaded legacy stored data (IATA route match).');
            } else {
              console.log(`[Volz.app] Legacy data route mismatch: stored=${storedFrom}->${storedTo}, requested=${from.toUpperCase()}->${to.toUpperCase()}. Skipping.`);
            }
          }
        }
      }
    } catch (e) {
      console.error('[Volz.app] Failed to load stored flights:', e.message);
    }
  }

  if (!interceptedJson) {
    console.log('[Volz.app] Interception returned no offers.');
    return [];
  }

  try {
    const offers = interceptedJson.data;
    if (!offers || !offers.length) {
      console.log('[Volz.app] No offers found in data.');
      return [];
    }
    console.log(`[Volz.app] Parsing ${offers.length} flights.`);

    return offers.map((offer, idx) => {
      const jOut = offer.itineraries[0];
      const sOut = jOut.segments[0];
      const sOutLast = jOut.segments[jOut.segments.length - 1];
      const carrier = sOut.carrier || sOut.operatingCarrier || 'XX';
      const flightNum = String(sOut.flightNumber || '');
      const duration = normalizeDuration(jOut.totalDuration || jOut.duration);

      // Use real IATA codes from segment data (fix #2)
      const realOrigin = sOut.departure?.iataCode || from.toUpperCase();
      const realDest = sOutLast.arrival?.iataCode || to.toUpperCase();

      // Extract real luggage info (fix #9)
      const hasLuggage = (() => {
        try {
          const bags = offer.travelerPricings?.[0]?.fareDetailsBySegment?.[0]?.includedCheckedBags;
          return !!(bags && bags.quantity > 0);
        } catch (e) { return false; }
      })();

      // Build return leg ONLY from real itinerary data — no fabricated legs (fix #12)
      let rLeg = null;
      if (isRoundTrip && offer.itineraries.length > 1) {
        const jIn = offer.itineraries[1];
        const sIn = jIn.segments[0];
        const sInLast = jIn.segments[jIn.segments.length - 1];
        const rCarrier = sIn.carrier || sIn.operatingCarrier || 'XX';
        const rFlightNum = String(sIn.flightNumber || '');
        const rDuration = normalizeDuration(jIn.totalDuration || jIn.duration);
        rLeg = {
          flightNo: normalizeFlightNumber(rCarrier, rFlightNum),
          origin: sIn.departure?.iataCode || to.toUpperCase(),
          destination: sInLast.arrival?.iataCode || from.toUpperCase(),
          departure: formatTimeSafe(sIn.departure?.at),
          arrival: formatTimeSafe(sInLast.arrival?.at),
          duration: rDuration,
          stops: sIn.numberOfStops || jIn.segments.length - 1
        };
      }

      return {
        id: `v-${idx}`,
        isRoundTrip: isRoundTrip,
        airline: carrier,
        stops: jOut.numOfStops || 0,
        hasLuggage,
        price: offer.price.acTotal || offer.price.grandTotal || offer.price.total,
        outbound: {
          flightNo: normalizeFlightNumber(carrier, flightNum),
          origin: realOrigin,
          destination: realDest,
          departure: formatTimeSafe(sOut.departure?.at),
          arrival: formatTimeSafe(sOutLast.arrival?.at),
          duration: duration
        },
        returnLeg: rLeg,
        provider: 'volz'
      };
    });
  } catch (parseError) {
    console.error('[Volz.app Parsing Error]:', parseError.message);
    return [];
  }
}

// ===== API ROUTES =====

/**
 * GET /api/flights/search
 * Concurrent aggregator — real data only, no mock fallback
 */
app.get('/api/flights/search', async (req, res) => {
  let { from, to, departDate, returnDate, pax } = req.query;
  
  if (!from || !to || !departDate) {
    return res.status(400).json({ error: 'Missing required parameters: from, to, departDate' });
  }

  const passengerCount = parseInt(pax) || 1;

  try {
    // Run both scraper fetch operations in parallel concurrently!
    const [mondialRaw, volzRaw] = await Promise.all([
      fetchMondialBooking(from, to, departDate, returnDate, passengerCount),
      fetchVolz(from, to, departDate, returnDate, passengerCount)
    ]);

    console.log(`[Aggregator] Found Mondial flights: ${mondialRaw.length}, Volz flights: ${volzRaw.length}`);

    // Merge and deduplicate by outbound departure time + flight number
    const combinedMap = new Map();

    const getComboKey = (flight) => {
      let key = `${flight.airline}-${flight.outbound.flightNo}`;
      // Fix: use flightNo instead of non-existent returnLeg.airline (fix #15)
      if (flight.isRoundTrip && flight.returnLeg) {
        key += `__${flight.returnLeg.flightNo}`;
      }
      return key;
    };

    const addToMap = (flight, provider) => {
      const key = getComboKey(flight);
      
      if (combinedMap.has(key)) {
        const existing = combinedMap.get(key);
        existing.prices[provider] = flight.price;
      } else {
        const newItinerary = {
          id: `f-${flight.airline}-${flight.outbound.departure.replace(':', '')}-${flight.isRoundTrip ? 'rt' : 'ow'}`,
          isRoundTrip: flight.isRoundTrip,
          airline: flight.airline,
          stops: flight.stops,
          hasLuggage: flight.hasLuggage,
          prices: {
            volz: null,
            mondial: null
          },
          outbound: flight.outbound,
          returnLeg: flight.returnLeg
        };
        newItinerary.prices[provider] = flight.price;
        combinedMap.set(key, newItinerary);
      }
    };

    volzRaw.forEach(f => addToMap(f, 'volz'));
    mondialRaw.forEach(f => addToMap(f, 'mondial'));

    let mergedResults = Array.from(combinedMap.values());

    // No mock fallback — only real data (fix #5)

    // Removed restrictive domestic filtering to allow Tassili Airlines and others (fix #17)

    res.json(mergedResults);
  } catch (error) {
    res.status(500).json({ error: 'Internal Aggregator Server Error', details: error.message });
  }
});

/**
 * GET /api/flights/book
 * Compiles a deep link dynamically to redirect user directly to checkouts
 */
app.get('/api/flights/book', (req, res) => {
  const { provider, from, to, departDate, returnDate, pax } = req.query;

  if (!provider || !from || !to || !departDate) {
    return res.status(400).json({ error: 'Missing parameters for checkout compiling' });
  }

  let redirectUrl = '';

  if (provider.toLowerCase() === 'volz') {
    const isRT = returnDate ? 'RT' : 'OW';
    const depDate = new Date(departDate).toISOString().split('T')[0];
    let query = `trip_type=${isRT}&max_connections=2&luggage_included=0&refundable=0&cabin=0&adults=${pax || 1}&children=0&held_infants=0&seated_infants=0&origin[0]=${from}&destination[0]=${to}&departure_date[0]=${depDate}&originMeta[0]=${from}&destinationMeta[0]=${to}&length=1`;
    if (returnDate) {
      const retDate = new Date(returnDate).toISOString().split('T')[0];
      query += `&return_date[0]=${retDate}`;
    }
    redirectUrl = `https://volz.app/en/flights?${query}`;
  } else {
    // Mondial booking structured search deep link
    const fromAirport = lookupAirport(from);
    const toAirport = lookupAirport(to);

    const searchObj = {
      tripType: returnDate ? 'Round Trip' : 'One Way',
      passengerDrop: {
        adults: parseInt(pax) || 1,
        child: 0,
        infants: 0
      },
      classe: 'economy',
      depart1: fromAirport.airport_name,
      depart1iata: fromAirport,
      destination1: toAirport.airport_name,
      destination1iata: toAirport,
      stops: false,
      baggage: false,
      refundable: false,
      lang: 'fr'
    };

    if (returnDate) {
      searchObj.datePickerRange1 = [
        new Date(departDate).toISOString(),
        new Date(returnDate).toISOString()
      ];
    } else {
      searchObj.datePicker1 = new Date(departDate).toISOString();
    }

    const encodedSearch = encodeURIComponent(JSON.stringify(searchObj));
    redirectUrl = `https://vols.mondialbooking.com/flights/results?${encodedSearch}=`;
  }

  res.json({ redirectUrl });
});

// ===== EXPORT FOR VERCEL OR START LOCALLY =====
if (process.env.VERCEL) {
  module.exports = app;
} else {
  app.listen(PORT, '127.0.0.1', () => {
    console.log(`================================================================`);
    console.log(`🚀 TayaranDZ Aggregator Server running at http://127.0.0.1:${PORT}`);
    console.log(`💼 Unified CORS-free API endpoints active.`);
    console.log(`================================================================`);
  });
}
