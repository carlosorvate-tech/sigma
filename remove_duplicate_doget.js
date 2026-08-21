const fs = require('fs');

let codeGs = fs.readFileSync('Code.gs', 'utf8');

// Remover a segunda declaração de doGet na linha 1865
codeGs = codeGs.replace(
  /function doGet\(e\) \{\s*if \(e && e\.parameter && e\.parameter\.teste === 'ia'\) \{[\s\S]*?return HtmlService\.createHtmlOutputFromFile\('index'\);\s*\}/,
  ''
);

fs.writeFileSync('Code.gs', codeGs, 'utf8');
console.log('✅ Segundo doGet removido! Total de doGet:', (codeGs.match(/function doGet/g) || []).length);
