const fs = require('fs');

const html = fs.readFileSync('index.html', 'utf8');

// Extrair scripts
const scriptRegex = /<script>([\s\S]*?)<\/script>/gi;
let match;
let scriptIdx = 0;

while ((match = scriptRegex.exec(html)) !== null) {
  scriptIdx++;
  const code = match[1];
  const testFile = `temp_script_${scriptIdx}.js`;
  fs.writeFileSync(testFile, code, 'utf8');
  try {
    // Testar se tem erro de sintaxe
    require('child_process').execSync(`node --check ${testFile}`);
    console.log(`Script #${scriptIdx} sintaxe OK!`);
  } catch(e) {
    console.error(`ERRO DE SINTAXE NO SCRIPT #${scriptIdx}:`, e.message);
  }
}
