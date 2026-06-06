const puppeteer = require('puppeteer');
const fs = require('fs');
const crypto = require('crypto');

const searchParams = {
  from: 'CDG',
  to: 'ALG',
  departDate: '2026-07-20',
  pax: 1
};

async function inspectProviders() {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  const rawData = {};

  console.log('[Inspect] Starting inspection for Zone B flight: CDG -> ALG');

  try {
    // 1. Dune Voyages
    console.log('[Inspect] Fetching Dune...');
    const duneState = {
      tripType: "One Way",
      adults: 1, children: 0, infants: 0,
      classType: "ECONOMY",
      legs: [{ origin: searchParams.from, destination: searchParams.to, departureDate: searchParams.departDate }]
    };
    const duneUrl = `https://vols.dunevoyages.com/flights/results?${Buffer.from(JSON.stringify(duneState)).toString('base64')}=`;
    await page.goto(duneUrl, { waitUntil: 'networkidle2', timeout: 30000 }).catch(e => console.log('Timeout Dune'));
    
    let duneJson = await page.evaluate(() => window.__INITIAL_DATA__);
    if (duneJson && duneJson.data && duneJson.data.offers) {
      console.log(`[Dune] Got ${duneJson.data.offers.length} offers.`);
      rawData.dune = duneJson.data.offers.slice(0, 5);
    }

    // 2. Volz 
    console.log('[Inspect] Fetching Volz...');
    const vUrl = `https://volz.app/en/flights?trip_type=OW&origin[0]=${searchParams.from}&destination[0]=${searchParams.to}&departure_date[0]=${searchParams.departDate}&adults=1&children=0&held_infants=0&seated_infants=0&max_connections=2&refundable=0&luggage_included=0&lang=en&currency=DZD`;
    await page.goto(vUrl, { waitUntil: 'networkidle2', timeout: 30000 }).catch(e => console.log('Timeout Volz'));
    
    // Wait for the specific API response
    // Actually, Volz uses an API call. Let's just grab any state we can find or intercept
    
    // 3. Mondial Booking
    console.log('[Inspect] Fetching Mondial...');
    const mondialState = {
      tripType: "One Way",
      adults: 1, children: 0, infants: 0,
      classType: "ECONOMY",
      legs: [{ origin: searchParams.from, destination: searchParams.to, departureDate: searchParams.departDate }]
    };
    const mUrl = `https://vols.mondialbooking.com/flights/results?${encodeURIComponent(JSON.stringify(mondialState))}=`;
    await page.goto(mUrl, { waitUntil: 'networkidle2', timeout: 30000 }).catch(e => console.log('Timeout Mondial'));
    let mJson = await page.evaluate(() => window.__INITIAL_DATA__);
    if (mJson && mJson.data && mJson.data.offers) {
      console.log(`[Mondial] Got ${mJson.data.offers.length} offers.`);
      rawData.mondial = mJson.data.offers.slice(0, 5);
    }

    fs.writeFileSync('scratch/raw_inspection.json', JSON.stringify(rawData, null, 2));
    console.log('[Inspect] Data saved to scratch/raw_inspection.json');

  } catch (err) {
    console.error('Error during inspection:', err);
  } finally {
    await browser.close();
  }
}

inspectProviders();
