const puppeteer = require('puppeteer');
const dune = require('../providers/dunevoyages.js');

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  
  let initialJson = null;
  
  page.on('response', async (response) => {
    const url = response.url();
    if (url.includes('/server/api/flights/flights/results')) {
      try {
        const json = await response.json();
        if (json && json.success) {
          initialJson = json;
          console.log('[Test] Captured initial JSON with', json.data?.offers?.length, 'offers out of', json.data?.total);
        }
      } catch (e) {}
    }
  });

  console.log('Navigating to Dune...');
  await page.goto('https://vols.dunevoyages.com/fr/flight-results/ALG/PAR/2026-07-15/2026-07-25/1/0/0/ECONOMY', { waitUntil: 'networkidle2' });
  
  for (let i = 0; i < 20; i++) {
    if (initialJson) break;
    await new Promise(r => setTimeout(r, 1000));
  }
  
  if (!initialJson) {
    console.log('Failed to capture initial JSON.');
    await browser.close();
    return;
  }
  
  console.log('Running augmentData...');
  const augmented = await dune.augmentData(page, initialJson);
  
  console.log(`[Test] Final offers count: ${augmented.data.offers.length}`);
  
  await browser.close();
})();
