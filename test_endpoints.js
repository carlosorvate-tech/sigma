const https = require('https');

function testUrl(url) {
  return new Promise((resolve) => {
    https.get(url, { rejectUnauthorized: false }, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          bodySnippet: data.slice(0, 500)
        });
      });
    }).on('error', (err) => {
      resolve({ error: err.message });
    });
  });
}

async function run() {
  console.log("1. Testando Cloudflare Custom Domain:");
  const cf = await testUrl("https://sigma.infinitussistemas.com.br");
  console.log("Status:", cf.statusCode);
  console.log("Snippet:", cf.bodySnippet || cf.error);

  console.log("\n2. Testando Apps Script Endpoint Direto:");
  const scriptUrl = "https://script.google.com/macros/s/AKfycbyKXV5Baii9wdpmqPFp2FI8FhImLqBEDKqijg_NZa8MWt1jyx0RI3oNNEHPV3CtM-wnZQ/exec";
  const gas = await testUrl(scriptUrl);
  console.log("Status:", gas.statusCode);
  console.log("Location:", gas.headers ? gas.headers.location : '');
  console.log("Snippet:", gas.bodySnippet || gas.error);
}

run();
