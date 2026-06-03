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

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

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
async function fetchProvider(provider, from, to, departDate, returnDate, pax) {
  const tag         = `[${provider.bookingName}]`;
  const cacheFile   = path.join(__dirname, provider.cacheFile);
  const isRoundTrip = !!returnDate;
  let interceptedJson = null;

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

    await page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 30000 });

    // Wait up to 15 seconds for the interception to succeed
    for (let i = 0; i < 15; i++) {
      if (interceptedJson) break;
      await new Promise(r => setTimeout(r, 1000));
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
  if (!interceptedJson) {
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
    const offers = provider.getOffers(interceptedJson);
    if (!offers || !offers.length) {
      console.log(`${tag} No offers in data.`);
      return [];
    }
    console.log(`${tag} Parsing ${offers.length} offers.`);

    // Build the context object passed to parseOffer()
    const ctx = { from, to, isRoundTrip, ...sharedHelpers };

    return offers.map((offer, idx) => {
      try {
        const result = provider.parseOffer(offer, ctx);
        // Ensure id and provider are always set
        result.id       = result.id       || `${provider.name}-${idx}`;
        result.provider = result.provider || provider.name;
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
  // Key = operatingAirline + full departure datetime + arrival time
  // Using the full date prevents merging flights that happen to depart at the same HH:mm on different days
  let key = `${flight.outbound.operatingAirline}-${flight.outbound.departureDate}T${flight.outbound.departure}-${flight.outbound.arrival}`;
  if (flight.isRoundTrip && flight.returnLeg) {
    key += `__${flight.returnLeg.operatingAirline}-${flight.returnLeg.departureDate}T${flight.returnLeg.departure}-${flight.returnLeg.arrival}`;
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
      } else {
        // First time seeing this flight — create the merged entry
        const entry = {
          id:          `f-${flight.airline}-${flight.outbound.departure.replace(':', '')}-${flight.isRoundTrip ? 'rt' : 'ow'}`,
          isRoundTrip: flight.isRoundTrip,
          airline:     flight.airline,
          stops:       flight.stops,
          hasLuggage:  flight.hasLuggage,
          prices:      {},   // Dynamically built from provider names
          outbound:    flight.outbound,
          returnLeg:   flight.returnLeg,
        };
        // Initialise all provider prices to null
        providers.forEach(p => { entry.prices[p.name] = null; });
        entry.prices[provider] = flight.price;
        combinedMap.set(key, entry);
      }
    });
  });

  return Array.from(combinedMap.values());
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
    res.json(merged);
  } catch (err) {
    console.error('[Aggregator] Fatal error:', err.message);
    res.status(500).json({ error: 'Internal Aggregator Server Error', details: err.message });
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

// ─────────────────────────────────────────────────────────────────────────────
//  Start server
// ─────────────────────────────────────────────────────────────────────────────
app.listen(PORT, '0.0.0.0', () => {
  console.log('================================================================');
  console.log(`🚀 TayaranDZ Aggregator running on port ${PORT}`);
  console.log(`✈  Active providers: ${providers.map(p => p.bookingName).join(', ')}`);
  console.log('================================================================');
});
