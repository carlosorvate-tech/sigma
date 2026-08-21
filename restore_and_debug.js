const fs = require('fs');

// Restaurar Code.gs do backup v113
fs.copyFileSync('backups/checkpoint_v113_multivehicle_plan_sync_and_health_calc/Code.gs', 'Code.gs');

let codeGs = fs.readFileSync('Code.gs', 'utf8');

// Adicionar endpoint de debug precisamente dentro de doGet
const oldDoGet = `function doGet(e) {
  if (e && e.parameter && e.parameter.teste === 'ia') {
    var res = consultarGeminiSigma('Responda exatamente: Conexão corporativa estabelecida com sucesso.', {ativo: 'Infinitus-Core-Test'});
    return HtmlService.createHtmlOutput('<h2>Status da IA Corporativa (Gemini Pro)</h2><pre>' + JSON.stringify(res, null, 2) + '</pre>');
  }
  return HtmlService.createHtmlOutputFromFile('index');
}`;

const newDoGet = `function doGet(e) {
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

codeGs = codeGs.replace(oldDoGet, newDoGet);
fs.writeFileSync('Code.gs', codeGs, 'utf8');

console.log('✅ Code.gs restaurado com sucesso (total linhas:', codeGs.split('\n').length, ')');
