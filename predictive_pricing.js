const fs = require('fs');
const path = require('path');

const COMMISSIONS_FILE = path.join(__dirname, 'commissions.json');
const DEFAULT_COMMISSIONS_FILE = path.join(__dirname, 'commissions.default.json');

// Helper to determine the zone of the flight
function getFlightZone(originIata, destIata, airportsData) {
  function lookupCountry(iata) {
    const code = (iata || '').toUpperCase();
    const found = airportsData.find(a => a.iata === code);
    return found ? (found.country || 'DZ') : 'DZ'; // Fallback to DZ if unknown
  }

  const originCountry = lookupCountry(originIata);
  const destCountry = lookupCountry(destIata);

  const isOriginDZ = originCountry === 'DZ';
  const isDestDZ = destCountry === 'DZ';

  if (isOriginDZ && isDestDZ) return 'Zone C'; // Domestic
  if (isOriginDZ && !isDestDZ) return 'Zone A'; // Intl departing DZ
  if (!isOriginDZ && isDestDZ) return 'Zone B'; // Intl arriving to DZ
  return 'Zone B'; // Default to Zone B if neither is DZ
}

// Load commissions from disk
function loadCommissions() {
  if (fs.existsSync(COMMISSIONS_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(COMMISSIONS_FILE, 'utf-8'));
    } catch (e) {
      console.error('[PredictivePricing] Error reading commissions:', e);
    }
  } else if (fs.existsSync(DEFAULT_COMMISSIONS_FILE)) {
    try {
      const defaultData = fs.readFileSync(DEFAULT_COMMISSIONS_FILE, 'utf-8');
      fs.writeFileSync(COMMISSIONS_FILE, defaultData, 'utf-8'); // Create the local editable copy
      return JSON.parse(defaultData);
    } catch (e) {
      console.error('[PredictivePricing] Error initializing default commissions:', e);
    }
  }
  return {};
}

// Save commissions to disk
function saveCommissions(data) {
  try {
    fs.writeFileSync(COMMISSIONS_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (e) {
    console.error('[PredictivePricing] Error saving commissions:', e);
  }
}

// Update the table dynamically (Self-Learning)
function learnCommission(providerName, zone, airlineCode, actualCommission) {
  if (zone === 'Zone B' || actualCommission == null || isNaN(actualCommission) || actualCommission <= 0) return;
  
  const comms = loadCommissions();
  
  if (!comms[providerName]) comms[providerName] = {};
  if (!comms[providerName][zone]) comms[providerName][zone] = {};
  
  const existing = comms[providerName][zone][airlineCode];
  
  // If we don't have it, or it changed by a significant amount (e.g. they changed prices)
  if (existing !== actualCommission) {
    console.log(`[PredictivePricing] Learning new commission: ${providerName} | ${zone} | ${airlineCode} = ${actualCommission} DZD`);
    comms[providerName][zone][airlineCode] = actualCommission;
    saveCommissions(comms);
  }
}

// Get the commission for a specific provider, zone, and airline
function getCommission(providerName, zone, airlineCode) {
  const comms = loadCommissions();
  
  if (comms[providerName] && comms[providerName][zone]) {
    if (comms[providerName][zone][airlineCode]) {
      return comms[providerName][zone][airlineCode];
    }
    // Fallback to default for that zone
    if (comms[providerName][zone]['default']) {
      return comms[providerName][zone]['default'];
    }
  }
  
  // Hard defaults if table is totally empty for this provider/zone
  if (zone === 'Zone C') return 1500;
  if (zone === 'Zone A') return 4000;
  return 0;
}

module.exports = {
  getFlightZone,
  learnCommission,
  getCommission
};
