const https = require('https');

function fetchFollow(url, depth = 0) {
  if (depth > 10) return;
  https.get(url, { rejectUnauthorized: false }, (res) => {
    if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
      fetchFollow(res.headers.location, depth + 1);
    } else {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          console.log("=== RELATÓRIO DE AUDITORIA DO BANCO DE DADOS REMOTO ===");
          console.log("Total Veículos:", json.vehicles ? json.vehicles.length : 0);
          console.log("Veículos:", JSON.stringify(json.vehicles, null, 2));
          console.log("\nTotal Logs:", json.logs ? json.logs.length : 0);
          console.log("Logs:", JSON.stringify(json.logs, null, 2));
          console.log("\nTotal Prescrições:", json.prescriptivePlans ? json.prescriptivePlans.length : 0);
          console.log("Primeiras 3 Prescrições:", JSON.stringify(json.prescriptivePlans.slice(0, 3), null, 2));
        } catch(e) {
          console.log("Status:", res.statusCode, "Length:", data.length);
          console.log("Content:", data.slice(0, 300));
        }
      });
    }
  }).on('error', err => console.error(err));
}

fetchFollow("https://script.google.com/macros/s/AKfycbyKXV5Baii9wdpmqPFp2FI8FhImLqBEDKqijg_NZa8MWt1jyx0RI3oNNEHPV3CtM-wnZQ/exec?debug=db");
