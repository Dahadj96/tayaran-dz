const ES = require('eventsource');
const EventSource = ES.EventSource || ES;

console.log("Connecting to SSE...");
const url = 'http://localhost:5000/api/flights/stream?from=ALG&to=AZR&departDate=2026-06-23&returnDate=2026-06-30&pax=1';
const es = new EventSource(url);

es.onmessage = (event) => {
  const payload = JSON.parse(event.data);
  console.log("Received type:", payload.type);
  if (payload.type === 'update') {
    console.log(`Update with ${payload.data.length} flights`);
  } else if (payload.type === 'done') {
    console.log("Done.");
    es.close();
  } else if (payload.type === 'error') {
    console.log("Error:", payload.message);
    es.close();
  }
};
es.onerror = (err) => {
  console.error("SSE Error:", err);
  es.close();
};
