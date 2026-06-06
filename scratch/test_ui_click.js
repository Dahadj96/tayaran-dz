const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  
  let allOffers = [];
  let totalAvailable = 0;
  
  page.on('response', async (response) => {
    const url = response.url();
    if (url.includes('/server/api/flights/flights/results')) {
      try {
        const json = await response.json();
        if (json && json.data && json.data.offers) {
          console.log(`[Network] Intercepted ${json.data.offers.length} offers`);
          allOffers.push(...json.data.offers);
          if (json.data.total) totalAvailable = json.data.total;
        }
      } catch (e) {}
    }
  });

  console.log('Navigating...');
  // Use H24 as test
  await page.goto('https://vols.h24voyages.com/fr/flight-results/ALG/PAR/2026-07-15/2026-07-25/1/0/0/ECONOMY', { waitUntil: 'networkidle2' });
  
  console.log(`Initial load finished. Captured ${allOffers.length} offers out of ${totalAvailable}`);

  // Now let's try to find and click the pagination/load more button
  // We can look for buttons containing text like "Afficher plus", "Plus de résultats", "Voir plus", etc.
  
  while (allOffers.length < totalAvailable) {
    const clicked = await page.evaluate(() => {
      // Find buttons or links that might load more results
      const buttons = Array.from(document.querySelectorAll('button, a'));
      const loadMoreBtn = buttons.find(b => {
        const text = b.textContent.toLowerCase();
        return text.includes('plus') || text.includes('more') || text.includes('suiv');
      });
      
      if (loadMoreBtn && loadMoreBtn.offsetHeight > 0) {
        loadMoreBtn.click();
        return true;
      }
      
      // Some platforms use standard pagination numbers
      const paginationLinks = Array.from(document.querySelectorAll('.ant-pagination-item, .pagination li'));
      const activeLink = paginationLinks.find(el => el.classList.contains('ant-pagination-item-active') || el.classList.contains('active'));
      if (activeLink) {
        const next = activeLink.nextElementSibling;
        if (next && next.tagName === 'LI') {
          const clickTarget = next.querySelector('a') || next;
          clickTarget.click();
          return true;
        }
      }
      return false;
    });
    
    if (clicked) {
      console.log('Clicked "Load More" or "Next Page". Waiting for response...');
      await new Promise(r => setTimeout(r, 3000));
    } else {
      console.log('No more buttons found.');
      break;
    }
  }
  
  console.log(`Finished. Total collected: ${allOffers.length}`);
  
  await browser.close();
})();
