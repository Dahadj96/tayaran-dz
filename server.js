/* ================================================================
   TayaranDZ Backend Aggregator — server.js
   Provider-Plugin Architecture  ·  Core Engine
   ================================================================
   To add a new booking website:
     1. Copy providers/TEMPLATE.js → providers/<name>.js
     2. Fill in the 8 required methods
     3. Restart the server — no changes needed here
   ================================================================ */
'use strict';

const express = require('express');
const cors    = require('cors');
const path    = require('path');
const fs      = require('fs');

const app    = express();
const config = require('./config.json');
const PORT   = process.env.PORT || config.port || 5000;
const predictivePricing = require('./predictive_pricing.js');

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ─────────────────────────────────────────────────────────────────────────────
//  Constants
// ─────────────────────────────────────────────────────────────────────────────
const POPULAR_PRICES_FILE = path.join(__dirname, 'popular_prices.json');

// ─────────────────────────────────────────────────────────────────────────────
//  Puppeteer — lazy-loaded once on first use
// ─────────────────────────────────────────────────────────────────────────────
let puppeteerModule = null;

async function getPuppeteer() {
  if (!puppeteerModule) {
    puppeteerModule = (await import('puppeteer')).default;
  }
  return puppeteerModule;
}

function getLaunchOptions() {
  const opts = {
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--disable-features=AsyncDns',
      '--single-process',
    ],
  };
  if (process.env.PUPPETEER_EXECUTABLE_PATH) {
    opts.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
  } else {
    const chromeExe = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
    if (fs.existsSync(chromeExe)) opts.executablePath = chromeExe;
  }
  return opts;
}

// ─────────────────────────────────────────────────────────────────────────────
//  Airport database
// ─────────────────────────────────────────────────────────────────────────────
let airportsData = [];
try {
  const dbContent = fs.readFileSync(path.join(__dirname, 'public/airports-db.js'), 'utf8');
  const jsonStr   = dbContent.replace(/^\uFEFF/, '')
                             .replace(/^window\.globalAirportsData\s*=\s*/, '')
                             .replace(/;\s*$/, '');
  airportsData = JSON.parse(jsonStr);
  console.log(`[Database] Loaded ${airportsData.length} airports successfully.`);
} catch (e) {
  console.error('[Database] Failed to load airports-db.js:', e.message);
}

function lookupAirport(iata) {
  const code  = (iata || '').toUpperCase();
  const found = airportsData.find(a => a.iata === code);
  return found
    ? { iata_code: code, airport_name: found.name || found.city || code, city_name: found.city || code, country: found.country === 'DZ' ? 'Algeria' : (found.country || ''), country_code: found.country || 'DZ' }
    : { iata_code: code, airport_name: code, city_name: code, country: 'Algeria', country_code: 'DZ' };
}

// ─────────────────────────────────────────────────────────────────────────────
//  Shared helper functions (injected into every provider via ctx)
// ─────────────────────────────────────────────────────────────────────────────

function logDebugError(context, err) {
  const msg = `[${new Date().toISOString()}] [${context}] ${err.stack || err.message}\n`;
  try { fs.appendFileSync(path.join(__dirname, 'debug_error.log'), msg); } catch (e) {}
}

function normalizeDuration(dur) {
  if (dur == null || dur === '') return '—';
  let h = 0, m = 0;
  if (typeof dur === 'number') {
    h = Math.floor(dur / 60); m = dur % 60;
  } else if (typeof dur === 'string') {
    const d = dur.toUpperCase().replace('PT', '').trim();
    const hM = d.match(/(\d+)\s*H/); const mM = d.match(/(\d+)\s*M/);
    if (hM || mM) {
      h = hM ? parseInt(hM[1], 10) : 0;
      m = mM ? parseInt(mM[1], 10) : 0;
    } else {
      const mins = parseInt(d, 10);
      if (!isNaN(mins)) { h = Math.floor(mins / 60); m = mins % 60; }
      else return dur;
    }
  }
  if (h === 0 && m === 0) return '—';
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

function formatTimeSafe(str) {
  if (!str) return '';
  return str.includes('T') ? str.split('T')[1].substring(0, 5) : str.substring(0, 5);
}

function calculateDayShift(depIso, arrIso) {
  if (!depIso || !arrIso) return 0;
  try {
    const d = new Date(depIso); d.setHours(0, 0, 0, 0);
    const a = new Date(arrIso); a.setHours(0, 0, 0, 0);
    const diff = Math.round((a - d) / 86400000);
    return diff > 0 ? diff : 0;
  } catch (e) { return 0; }
}

function normalizeFlightNumber(airline, fnum) {
  const code = (airline || '').trim().toUpperCase();
  const num  = String(fnum || '').trim().toUpperCase().replace(/^[A-Z]{1,3}\s*/i, '');
  return num ? `${code} ${num}` : code;
}

// Bundle all shared helpers into a single object for injection into providers
const sharedHelpers = {
  normalizeDuration,
  formatTimeSafe,
  calculateDayShift,
  normalizeFlightNumber,
  lookupAirport,
  getPuppeteer,
  getLaunchOptions,
  logDebugError,
};

// ─────────────────────────────────────────────────────────────────────────────
//  Auto-discover and load all provider plugins from ./providers/
// ─────────────────────────────────────────────────────────────────────────────
const providersDir = path.join(__dirname, 'providers');
const providers    = [];

fs.readdirSync(providersDir)
  .filter(f => f.endsWith('.js') && f !== 'TEMPLATE.js')
  .forEach(file => {
    try {
      const p = require(path.join(providersDir, file));
      if (p.name && p.buildSearchUrl && p.interceptFilter && p.validateJson && p.getOffers && p.parseOffer) {
        providers.push(p);
        console.log(`[Provider] Loaded: ${p.bookingName} (${p.name})`);
      } else {
        console.warn(`[Provider] Skipped ${file} — missing required methods.`);
      }
    } catch (e) {
      console.error(`[Provider] Failed to load ${file}:`, e.message);
    }
  });

console.log(`[Provider] ${providers.length} provider(s) active: ${providers.map(p => p.name).join(', ')}`);

// ─────────────────────────────────────────────────────────────────────────────
//  Core scraper engine — works for ANY provider plugin
// ─────────────────────────────────────────────────────────────────────────────
async function fetchProvider(provider, from, to, departDate, returnDate, pax, bypassCache = false) {
  const tag         = `[${provider.bookingName}]`;
  const cacheFile   = path.join(__dirname, provider.cacheFile);
  const isRoundTrip = !!returnDate;
  let interceptedJson = null;
  let capturedSecurityHeaders = {};
  let capturedApiRequest = null;

  // ── Live scrape ────────────────────────────────────────────────────────────
  try {
    console.log(`${tag} Fetching via JSON interception: ${from} -> ${to}`);
    const targetUrl = provider.buildSearchUrl(from, to, departDate, returnDate, pax);
    const puppeteer = await getPuppeteer();
    const browser   = await puppeteer.launch(getLaunchOptions());
    const page      = await browser.newPage();

    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36'
    );

    // Capture security headers from the browser's outgoing API requests
    page.on('request', (request) => {
      const url = request.url();
      if (provider.interceptFilter(url) || url.includes('flights/search') || url.includes('flightsagg')) {
        const headers = request.headers();
        for (const [k, v] of Object.entries(headers)) {
          if (k.startsWith('x-') || k === 'authorization') {
            capturedSecurityHeaders[k] = v;
          }
        }
        // Also capture cookies
        if (headers['cookie']) {
          capturedSecurityHeaders['cookie'] = headers['cookie'];
        }
        // Capture initial POST request payload for programmatic pagination
        if (request.method() === 'POST' && request.postData() && !capturedApiRequest) {
          capturedApiRequest = {
            url: url,
            headers: headers,
            body: request.postData()
          };
        }
      }
    });

    page.on('response', async (response) => {
      if (!provider.interceptFilter(response.url())) return;
      try {
        const ct = response.headers()['content-type'] || '';
        if (!ct.includes('application/json')) return;
        const json = await response.json();
        if (provider.validateJson(json)) {
          interceptedJson = json;
        }
      } catch (e) {}
    });

    try {
      await page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 60000 });
    } catch (e) {
      if (!interceptedJson) {
        console.error(`${tag} Navigation error: ${e.message}`);
      } else {
        console.log(`${tag} Navigation timeout, but JSON was already intercepted. Proceeding...`);
      }
    }

    // Wait for the specific JSON response
    let waitTime = 0;
    while (!interceptedJson && waitTime < 25000) {
      await new Promise(r => setTimeout(r, 500));
      waitTime += 500;
    }

    page.removeAllListeners('response');

    if (interceptedJson && provider.augmentData) {
      console.log(`${tag} Augmenting data via provider script...`);
      if (Object.keys(capturedSecurityHeaders).length > 0) {
        console.log(`${tag} Captured ${Object.keys(capturedSecurityHeaders).length} security headers for augmentation.`);
      }
      try {
        interceptedJson = await provider.augmentData(page, interceptedJson, capturedSecurityHeaders, capturedApiRequest);
      } catch (e) {
        console.error(`${tag} Augment error:`, e.message);
      }
    }

    await browser.close();

    // Cache to disk on success
    if (interceptedJson) {
      try {
        fs.writeFileSync(cacheFile, JSON.stringify({
          route: { from: from.toUpperCase(), to: to.toUpperCase() },
          departDate,
          returnDate: returnDate || null,
          storedAt: new Date().toISOString(),
          data: interceptedJson,
        }, null, 2), 'utf8');
        console.log(`${tag} Cached to disk.`);
      } catch (e) {
        console.error(`${tag} Cache write failed:`, e.message);
      }
    }
  } catch (err) {
    console.error(`${tag} Scrape error:`, err.message);
    logDebugError(provider.name, err);
  }

  // ── Disk cache fallback ────────────────────────────────────────────────────
  if (!interceptedJson && !bypassCache) {
    console.log(`${tag} Trying disk cache...`);
    try {
      if (fs.existsSync(cacheFile)) {
        const stored = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
        if (stored.route) {
          const dateMatch = stored.departDate === departDate &&
                            (stored.returnDate || null) === (returnDate || null);
          const routeMatch = stored.route.from === from.toUpperCase() &&
                             stored.route.to   === to.toUpperCase();
          if (routeMatch && dateMatch) {
            interceptedJson = stored.data;
            console.log(`${tag} Loaded from cache (route + date match).`);
          } else {
            console.log(`${tag} Cache mismatch — skipping.`);
          }
        }
      }
    } catch (e) {
      console.error(`${tag} Cache read failed:`, e.message);
    }
  }

  if (!interceptedJson) {
    console.log(`${tag} No data available.`);
    return [];
  }

  // ── Parse offers ───────────────────────────────────────────────────────────
  try {
    const rawOffers = provider.getOffers(interceptedJson);
    if (!rawOffers || !rawOffers.length) {
      console.log(`${tag} No offers in data.`);
      return [];
    }
    console.log(`${tag} Parsing ${rawOffers.length} offers.`);

    const flightZone = predictivePricing.getFlightZone(from, to, airportsData);
    const ctx = {
      from, to, departDate, returnDate, pax,
      isRoundTrip,
      flightZone,
      ...sharedHelpers
    };

    return rawOffers.map((offer, idx) => {
      try {
        const result = provider.parseOffer(offer, ctx);
        if (!result) return null;
        
        // Ensure id and provider are always set
        result.id       = result.id       || `${provider.name}-${idx}`;
        result.provider = result.provider || provider.name;
        
        // Self-Learning Commission Table Logic
        if (result._commission != null && result._commission > 0) {
          predictivePricing.learnCommission(provider.name, flightZone, result.airline, result._commission);
        }
        
        return result;
      } catch (e) {
        console.warn(`${tag} parseOffer failed for offer #${idx}:`, e.message);
        return null;
      }
    }).filter(Boolean);

  } catch (parseErr) {
    console.error(`${tag} Parse error:`, parseErr.message);
    return [];
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  Deduplication / aggregation
// ─────────────────────────────────────────────────────────────────────────────
function getComboKey(flight) {
  // Normalize codeshares: if marketing carrier is 'VF' (AJet), the physical operator should be treated as 'VF'
  let outboundOp = flight.outbound.operatingAirline;
  if (flight.airline === 'VF' && outboundOp === 'TK') {
    outboundOp = 'VF';
  }

  let key = `${outboundOp}-${flight.outbound.departureDate}T${flight.outbound.departure}-${flight.outbound.arrival}`;
  if (flight.isRoundTrip && flight.returnLeg) {
    let returnOp = flight.returnLeg.operatingAirline;
    if (flight.returnLeg.marketingAirline === 'VF' && returnOp === 'TK') {
      returnOp = 'VF';
    }
    key += `__${returnOp}-${flight.returnLeg.departureDate}T${flight.returnLeg.departure}-${flight.returnLeg.arrival}`;
  }
  return key;
}

function aggregateResults(allProviderResults) {
  const combinedMap = new Map();

  allProviderResults.forEach(({ flights, provider }) => {
    flights.forEach(flight => {
      const key = getComboKey(flight);

      if (combinedMap.has(key)) {
        // Same physical flight found in another provider — just add their price
        combinedMap.get(key).prices[provider] = flight.price;
        if (flight._basePriceGDS && !combinedMap.get(key)._basePriceGDS) {
          combinedMap.get(key)._basePriceGDS = flight._basePriceGDS;
        }
      } else {
        // First time seeing this flight — create the merged entry
        const entry = {
          id:          `f-${flight.airline}-${flight.outbound.departure.replace(':', '')}-${flight.isRoundTrip ? 'rt' : 'ow'}`,
          isRoundTrip: flight.isRoundTrip,
          airline:     flight.airline,
          stops:       flight.stops,
          hasLuggage:  flight.hasLuggage,
          prices:      {},   // Dynamically built from provider names
          isPredicted: {},   // Track predicted providers
          _basePriceGDS: null,
          outbound:    flight.outbound,
          returnLeg:   flight.returnLeg,
        };
        // Initialise all provider prices to null
        providers.forEach(p => { 
          entry.prices[p.name] = null; 
          entry.isPredicted[p.name] = false;
        });
        entry.prices[provider] = flight.price;
        if (flight._basePriceGDS) entry._basePriceGDS = flight._basePriceGDS;
        combinedMap.set(key, entry);
      }
    });
  });

  return Array.from(combinedMap.values());
}

// ─────────────────────────────────────────────────────────────────────────────
//  Popular Prices Cache
// ─────────────────────────────────────────────────────────────────────────────
const popularRoutesKeys = [
  'ALG-CDG', 'ALG-IST', 'ALG-DXB', 'ALG-LHR', 
  'ALG-BCN', 'ALG-TUN', 'ORN-CDG', 'ALG-MAD'
];

function updatePopularPrices(mergedFlights, from, to) {
  const routeKey = `${from}-${to}`;
  if (!popularRoutesKeys.includes(routeKey)) return;

  // Find the absolute cheapest price among all merged flights for this route
  let cheapest = Infinity;
  mergedFlights.forEach(flight => {
    Object.values(flight.prices).forEach(price => {
      if (price !== null && price < cheapest) {
        cheapest = price;
      }
    });
  });

  if (cheapest === Infinity) return;

  let cache = {};
  if (fs.existsSync(POPULAR_PRICES_FILE)) {
    try {
      cache = JSON.parse(fs.readFileSync(POPULAR_PRICES_FILE, 'utf-8'));
    } catch (e) {
      console.error('[Popular Prices] Error reading cache:', e.message);
    }
  }

  // Only update if it's a new route or cheaper than what we have, 
  // OR just update it to keep it fresh (let's just update it to keep it fresh)
  cache[routeKey] = {
    price: cheapest,
    updatedAt: new Date().toISOString()
  };

  try {
    fs.writeFileSync(POPULAR_PRICES_FILE, JSON.stringify(cache, null, 2), 'utf-8');
  } catch (e) {
    console.error('[Popular Prices] Error writing cache:', e.message);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  API Routes
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/flights/search
 * Runs all providers in parallel and returns deduplicated results.
 */
app.get('/api/flights/search', async (req, res) => {
  const { from, to, departDate, returnDate, pax } = req.query;

  if (!from || !to || !departDate) {
    return res.status(400).json({ error: 'Missing required parameters: from, to, departDate' });
  }

  const passengerCount = parseInt(pax) || 1;

  try {
    // Run ALL providers in parallel
    const results = await Promise.all(
      providers.map(async provider => ({
        provider: provider.name,
        flights:  await fetchProvider(provider, from, to, departDate, returnDate, passengerCount),
      }))
    );

    // Log what each provider returned
    results.forEach(r => console.log(`[Aggregator] ${r.provider}: ${r.flights.length} flights`));

    const merged = aggregateResults(results);
    
    // Asynchronously update popular prices cache if applicable
    updatePopularPrices(merged, from, to);

    // Clean up hidden fields before sending
    merged.forEach(f => {
      delete f._basePriceGDS;
    });

    res.json(merged);
  } catch (err) {
    console.error('[Aggregator] Fatal error:', err.message);
    res.status(500).json({ error: 'Internal Aggregator Server Error', details: err.message });
  }
});

/**
 * GET /api/flights/stream
 * Server-Sent Events (SSE) endpoint to progressively stream results as providers finish.
 */
app.get('/api/flights/stream', async (req, res) => {
  const { from, to, departDate, returnDate, pax } = req.query;

  if (!from || !to || !departDate) {
    return res.status(400).json({ error: 'Missing required parameters: from, to, departDate' });
  }

  const passengerCount = parseInt(pax) || 1;

  // Setup SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  
  // Flush headers immediately
  res.flushHeaders();

  const collectedResults = [];

  try {
    const promises = providers.map(async provider => {
      try {
        const flights = await fetchProvider(provider, from, to, departDate, returnDate, passengerCount, true /* force bypass cache */);
        collectedResults.push({ provider: provider.name, flights });
        
        // Merge the current collected results
        const merged = aggregateResults(collectedResults);
        
        // --- Prediction Engine Logic ---
        const flightZone = predictivePricing.getFlightZone(from, to, airportsData);
        if (flightZone === 'Zone A' || flightZone === 'Zone C') {
          const finishedProviders = new Set(collectedResults.map(r => r.provider));
          const pendingProviders = providers.map(p => p.name).filter(p => !finishedProviders.has(p));
          
          if (pendingProviders.length > 0) {
            merged.forEach(flight => {
              if (flight._basePriceGDS) {
                pendingProviders.forEach(pending => {
                  if (flight.prices[pending] == null) {
                    const comm = predictivePricing.getCommission(pending, flightZone, flight.airline);
                    flight.prices[pending] = flight._basePriceGDS + comm;
                    flight.isPredicted[pending] = true;
                  }
                });
              }
            });
          }
        }
        
        // Clean up hidden fields before sending
        merged.forEach(f => {
          delete f._basePriceGDS;
        });
        
        // Stream update to the client
        res.write(`data: ${JSON.stringify({ type: 'update', data: merged })}\n\n`);
      } catch (err) {
        console.error(`[SSE] Error in provider ${provider.name}:`, err.message);
      }
    });

    await Promise.allSettled(promises);

    // Update popular prices at the very end using the final set
    const finalMerged = aggregateResults(collectedResults);
    updatePopularPrices(finalMerged, from, to);

    // Tell the client we're done
    res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
    res.end();
  } catch (err) {
    console.error('[SSE] Fatal error:', err.message);
    res.write(`data: ${JSON.stringify({ type: 'error', message: err.message })}\n\n`);
    res.end();
  }
});

/**
 * GET /api/flights/book
 * Generates a pre-filled search redirect URL for a given provider.
 */
app.get('/api/flights/book', (req, res) => {
  const { provider: providerName, from, to, departDate, returnDate, pax } = req.query;

  if (!providerName || !from || !to || !departDate) {
    return res.status(400).json({ error: 'Missing parameters: provider, from, to, departDate' });
  }

  const provider = providers.find(p => p.name === providerName.toLowerCase());
  if (!provider) {
    return res.status(404).json({ error: `Unknown provider: ${providerName}` });
  }

  const redirectUrl = provider.buildBookingUrl(from, to, departDate, returnDate, parseInt(pax) || 1);
  res.json({ redirectUrl });
});

/**
 * GET /api/popular-prices
 * Returns the cached cheapest prices for popular routes.
 */
app.get('/api/popular-prices', (req, res) => {
  if (fs.existsSync(POPULAR_PRICES_FILE)) {
    try {
      const data = fs.readFileSync(POPULAR_PRICES_FILE, 'utf-8');
      res.setHeader('Content-Type', 'application/json');
      res.send(data);
    } catch (e) {
      res.json({});
    }
  } else {
    res.json({});
  }
});

// ─────────────────────────────────────────────────────────────────────────────
//  Start server
// ─────────────────────────────────────────────────────────────────────────────
app.listen(PORT, '0.0.0.0', () => {
  console.log('================================================================');
  console.log(`🚀 TayaranDZ Aggregator running on port ${PORT}`);
  console.log(`✈  Active providers: ${providers.map(p => p.bookingName).join(', ')}`);
  console.log('================================================================');
});
