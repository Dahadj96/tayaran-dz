const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  
  let allOffers = [];
  
  page.on('response', async (response) => {
    const url = response.url();
    if (url.includes('/server/api/') && url.includes('/results')) {
      try {
        const json = await response.json();
        if (json && json.data && json.data.offers) {
          console.log(`[Network] Intercepted ${json.data.offers.length} offers from ${url}`);
          allOffers.push(...json.data.offers);
        }
      } catch (e) {}
    }
  });

  console.log('Navigating...');
  await page.goto('https://vols.h24voyages.com/fr/flight-results/ALG/PAR/2026-07-15/2026-07-25/1/0/0/ECONOMY', { waitUntil: 'networkidle2' });
  
  console.log(`Initial load finished. Captured ${allOffers.length} offers`);
  await page.screenshot({path: 'scratch/h24_after_load.png', fullPage: true});

  // Evaluate buttons
  const buttonTexts = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('button, a, .ant-pagination-item, [role="button"]'))
      .map(b => b.innerText || b.textContent)
      .map(t => t.trim())
      .filter(t => t.length > 0 && t.length < 50);
  });
  console.log('Button/Link texts:', Array.from(new Set(buttonTexts)).join(' | '));
  
  await browser.close();
})();
