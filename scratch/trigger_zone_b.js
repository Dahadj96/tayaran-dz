

async function testApi() {
  console.log("Fetching ALG -> AZR (Roundtrip)");
  
  const url = 'http://localhost:5000/api/flights/search?from=ALG&to=AZR&departDate=2026-07-23&returnDate=2026-07-30&pax=1';
  
  try {
    const res = await fetch(url);
    const data = await res.json();
    console.log(`Received ${data.length} unique flights!`);
    if (data.length > 0) {
      console.log(JSON.stringify(data[0], null, 2));
    }
  } catch (e) {
    console.error("API error:", e);
  }
}

testApi();
