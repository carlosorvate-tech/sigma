const fs = require('fs');

let codeGs = fs.readFileSync('Code.gs', 'utf8');

const debugDoGet = `function doGet(e) {
  if (e && e.parameter) {
    if (e.parameter.debug === 'db') {
      var data = getInitialData();
      return ContentService.createTextOutput(JSON.stringify(data, null, 2)).setMimeType(ContentService.MimeType.JSON);
    }
    if (e.parameter.teste === 'ia') {
      var res = consultarGeminiSigma('Responda exatamente: Conexão corporativa estabelecida com sucesso.', {ativo: 'Infinitus-Core-Test'});
      return HtmlService.createHtmlOutput('<h2>Status da IA Corporativa (Gemini Pro)</h2><pre>' + JSON.stringify(res, null, 2) + '</pre>');
    }
  }
  return HtmlService.createHtmlOutputFromFile('index');
}`;

codeGs = codeGs.replace(/function doGet\(e\)[\s\S]*?return HtmlService\.createHtmlOutputFromFile\('index'\);\s*\}/, debugDoGet);
fs.writeFileSync('Code.gs', codeGs, 'utf8');

console.log('✅ Endpoint de debug de banco de dados adicionado!');
