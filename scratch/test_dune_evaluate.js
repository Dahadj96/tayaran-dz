const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  
  // Set up response interceptor to catch the first search result
  let searchCode = null;
  let firstResponse = null;

  page.on('response', async (response) => {
    const url = response.url();
    if (url.includes('/server/api/flights/flights/results')) {
      try {
        const json = await response.json();
        if (json && json.success) {
          console.log('[Dune] Found results response, status:', response.status());
          searchCode = json.searchCode || (json.data && json.data.searchCode);
          firstResponse = json;
          console.log('Search code:', searchCode);
          console.log('Offers in first response:', json.data?.offers?.length);
          console.log('Total available:', json.data?.total);
        }
      } catch (e) {
        // ignore
      }
    }
  });

  console.log('Navigating to Dune...');
  await page.goto('https://vols.dunevoyages.com/fr/flight-results/ALG/PAR/2026-07-15/2026-07-25/1/0/0/ECONOMY', { waitUntil: 'networkidle2' });
  
  console.log('Waiting for searchCode...');
  for (let i=0; i<20; i++) {
    if (searchCode) break;
    await new Promise(r => setTimeout(r, 1000));
  }
  
  if (!searchCode) {
    console.log('Did not find searchCode');
    await browser.close();
    return;
  }
  
  // Try fetching page 2 inside page.evaluate
  console.log('Fetching page 2 inside page.evaluate...');
  const result = await page.evaluate(async (sc) => {
    try {
      const res = await fetch(`https://vols.dunevoyages.com/server/api/flights/flights/results?searchCode=${sc}&page=2`);
      const json = await res.json();
      return { success: true, count: json.data?.offers?.length };
    } catch (e) {
      return { success: false, error: e.toString() };
    }
  }, searchCode);
  
  console.log('Page 2 result:', result);
  
  await browser.close();
})();
