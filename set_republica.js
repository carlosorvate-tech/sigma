const fs = require('fs');

// 1. ATUALIZAR CODE.GS COM A AUTO MECÂNICA REPÚBLICA COMO BASE OFICIAL
let codeGs = fs.readFileSync('Code.gs', 'utf8');

codeGs = codeGs.replace(
  /aba\.appendRow\(\[\s*"OFI_001",\s*"Oficina Mecânica Precision Auto"[\s\S]*?\]\);/,
  `aba.appendRow([
      "OFI_001", "Auto Mecânica República", "Auto Mecânica República LTDA", "00.000.000/0001-00",
      "Rua da República, Centro - São Paulo, SP", "5511987654321", "(11) 98765-4321", "(11) 3255-0000", "contato@automecanicarepublica.com.br",
      "Mecânica Especializada PSA, Injeção e Câmbio", "Responsável Técnico", "TRUE"
    ]);`
);

fs.writeFileSync('Code.gs', codeGs, 'utf8');

// 2. ATUALIZAR INDEX.HTML COM A AUTO MECÂNICA REPÚBLICA
let html = fs.readFileSync('index.html', 'utf8');

html = html.replace(/Oficina Mecânica Precision Auto/g, 'Auto Mecânica República');
html = html.replace(/Precision Manutenções Automotivas LTDA/g, 'Auto Mecânica República LTDA');
html = html.replace(/contato@precisionauto\.com\.br/g, 'contato@automecanicarepublica.com.br');

fs.writeFileSync('index.html', html, 'utf8');
fs.writeFileSync('App.html', html, 'utf8');
console.log('✅ Auto Mecânica República cadastrada como Oficina Base Oficial!');
