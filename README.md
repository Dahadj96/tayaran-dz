# TayaranDZ ✈

**TayaranDZ** is a flight aggregator for Algeria. It fetches real-time flight offers from multiple booking websites simultaneously, deduplicates codeshare flights, and presents them in a clean, unified search interface in Arabic, French, and English.

---

## Live Demo

Deployed on Railway: **[your-railway-url.up.railway.app]**

---

## Architecture Overview

```
TayaranDZ_App/
├── server.js              ← Core engine (provider-agnostic)
├── config.json            ← Global settings (port)
├── providers/
│   ├── volz.js            ← Volz.app scraper + parser
│   ├── mondial.js         ← MondialBooking scraper + parser
│   └── TEMPLATE.js        ← Guide for adding new providers
├── public/
│   ├── index.html         ← Main page
│   ├── app.js             ← All frontend logic
│   ├── style.css          ← All styles
│   ├── airports-db.js     ← Airport database (9000+ airports)
│   └── airlines-db.js     ← Airline logos & names
├── Procfile               ← Railway start command
├── nixpacks.toml          ← Railway build config
├── push.ps1               ← One-click GitHub push script
└── .gitignore
```

---

## How It Works

### 1. Search Request
When a user searches, the frontend (`app.js`) calls:
```
GET /api/flights/search?from=ALG&to=CDG&departDate=2026-06-15&pax=1
```

### 2. Parallel Scraping
`server.js` discovers all `.js` files in `/providers/` and runs them **all in parallel** using `Promise.all`. Each provider:
1. Opens a headless Chrome browser (Puppeteer)
2. Navigates to the booking website's search page
3. Intercepts the internal JSON API response the website makes
4. Saves the raw JSON to disk as a cache fallback

### 3. Deduplication (Codeshare Handling)
Airlines often sell the same physical flight under different flight numbers (e.g., Air Algérie `AH 8670` and Turkish Airlines `TK 8670` are the same plane). The aggregator handles this by:
- Extracting the **operating airline** (the company flying the actual plane) from segment data
- Grouping flights by: `operatingAirline + departure date + departure time + arrival time`
- When two providers match, their prices are merged into one card: `{ volz: 38900, mondial: 41500 }`

### 4. Standard Output Format
Every flight returned by the API has this structure:
```json
{
  "id": "f-AH-0940-ow",
  "isRoundTrip": false,
  "airline": "AH",
  "stops": 0,
  "hasLuggage": true,
  "prices": { "volz": 38900, "mondial": 41500 },
  "outbound": {
    "flightNo": "AH 1014",
    "operatingAirline": "AH",
    "origin": "ALG",
    "destination": "CDG",
    "departureDate": "2026-06-15",
    "departure": "09:40",
    "arrival": "13:20",
    "arrivalDayShift": 0,
    "duration": "3h 40m"
  },
  "returnLeg": null
}
```

---

## How to Add a New Booking Website

The system is designed as a **plugin architecture**. You only need to fill in one file:

### Step-by-Step
1. **Copy** `providers/TEMPLATE.js` → `providers/newsite.js`
2. **Fill in** `name` (e.g. `'kiwi'`) and `bookingName` (e.g. `'Kiwi.com'`)
3. **Fill in** `buildSearchUrl()` — the URL Puppeteer navigates to
4. **Fill in** `interceptFilter(url)` — return `true` for the internal JSON API URL
   - *Tip: Open DevTools → Network tab → filter XHR/Fetch while searching on their website*
5. **Fill in** `validateJson(json)` — return `true` if the intercepted data has offers
6. **Fill in** `getOffers(json)` — return the raw offers array
7. **Fill in** `parseOffer(offer, ctx)` — map raw data to the Standard Output Format
   - ⚠️ Always extract `operatingAirline` (not marketing airline) for correct codeshare handling
   - ⚠️ Always use full ISO timestamps for `departureDate` and `arrivalDayShift`
8. **Fill in** `buildBookingUrl()` — the pre-filled search redirect URL
9. **Drop the file** into `/providers/` and restart — no other file needs to change ✅

---

## Running Locally

```bash
npm install
node server.js
# Open http://localhost:5000
```

---

## Deploying to Railway

1. Push all changes to GitHub using `push.ps1` (see below)
2. Railway auto-deploys from your connected GitHub repository
3. New providers are picked up automatically on the next deploy

### Required Files for Railway
- `server.js`
- `providers/` (all files)
- `public/` (all files)
- `package.json`
- `Procfile`
- `nixpacks.toml`
- `config.json`

### DO NOT upload
- `node_modules/`
- `volz_flights.json` (runtime cache)
- `mondial_flights.json` (runtime cache)
- `debug_error.log`

---

## Pushing to GitHub

A helper script `push.ps1` is included. Run it from PowerShell:

```powershell
.\push.ps1 "Your commit message describing what changed"
```

**Example:**
```powershell
.\push.ps1 "Add +1 day indicator for overnight flights"
.\push.ps1 "Add Kiwi.com provider"
.\push.ps1 "Fix codeshare deduplication bug"
```

The script will:
1. Stage all changed files
2. Create a commit with your message + timestamp
3. Push to the `main` branch on GitHub

---

## Key Design Decisions

| Decision | Reason |
|---|---|
| Puppeteer JSON interception (not direct API calls) | Booking sites don't expose public APIs — we intercept their internal calls |
| Disk cache fallback | If the live scrape fails (e.g. timeout), the last successful result is served |
| Operating airline for deduplication | Marketing airline varies per provider for codeshare flights |
| Full ISO timestamp for deduplication key | Prevents merging flights that share the same HH:mm but depart on different days |
| `arrivalDayShift` field | Tells the UI to show a `+1` badge for overnight flights |
| Plugin architecture | Adding a new provider requires zero changes to core engine |

---

## Environment Variables (Railway)

| Variable | Description |
|---|---|
| `PORT` | Set automatically by Railway |
| `PUPPETEER_EXECUTABLE_PATH` | Path to Chromium binary on Railway (set in nixpacks.toml) |
