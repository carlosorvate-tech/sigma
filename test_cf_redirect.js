const https = require('https');

function follow(url, depth = 0) {
  if (depth > 5) {
    console.log("Too many redirects");
    return;
  }
  https.get(url, { rejectUnauthorized: false }, (res) => {
    console.log(`[${depth}] GET ${url} -> Status ${res.statusCode}`);
    if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
      console.log(`    Redirecting to: ${res.headers.location}`);
      follow(res.headers.location, depth + 1);
    } else {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        console.log(`    Final Body Length: ${data.length}`);
        console.log(`    Body snippet: ${data.slice(0, 300)}`);
      });
    }
  }).on('error', err => {
    console.error("Error:", err.message);
  });
}

follow("https://sigma.infinitussistemas.com.br");
