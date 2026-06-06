const duneProvider = require('../providers/dunevoyages.js');
const mondialProvider = require('../providers/mondial.js');
const volzProvider = require('../providers/volz.js');
const fs = require('fs');

async function testZoneB() {
  const ctx = {
    tripType: 'oneway',
    origin: 'CDG',
    destination: 'ALG',
    departDate: '2026-07-20'
  };
  
  console.log('Testing Mondial Zone B...');
  try {
    const mRes = await fetch(mondialProvider.buildSearchUrl('CDG', 'ALG', '2026-07-20', null, 1, 0));
    const mHtml = await mRes.text();
    const match = mHtml.match(/window\.__INITIAL_DATA__\s*=\s*(\{.*?\});/);
    if(match) {
      const mJson = JSON.parse(match[1]);
      fs.writeFileSync('scratch/zoneb_mondial.json', JSON.stringify(mJson, null, 2));
      console.log('Saved Mondial Zone B raw data');
    }
  } catch(e) { console.log('Mondial failed', e.message); }

  console.log('Testing Dune Zone B...');
  try {
    const dRes = await fetch(duneProvider.buildSearchUrl('CDG', 'ALG', '2026-07-20', null, 1, 0));
    const dHtml = await dRes.text();
    const match2 = dHtml.match(/window\.__INITIAL_DATA__\s*=\s*(\{.*?\});/);
    if(match2) {
      const dJson = JSON.parse(match2[1]);
      fs.writeFileSync('scratch/zoneb_dune.json', JSON.stringify(dJson, null, 2));
      console.log('Saved Dune Zone B raw data');
    }
  } catch(e) { console.log('Dune failed', e.message); }
}

testZoneB();
