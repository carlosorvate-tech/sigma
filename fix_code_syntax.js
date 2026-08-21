const fs = require('fs');
const { execSync } = require('child_process');

let codeGs = fs.readFileSync('Code.gs', 'utf8');

// Remover o catch duplicado
codeGs = codeGs.replace(
  /}\s*catch\(err\)\s*\{\s*Logger\.log\('Erro em getInitialData: ' \+ err\.toString\(\)\);\s*return \{\s*vehicles: \[\],\s*prescriptivePlans: \[\],\s*logs: \[\],\s*oficinas: getOficinas\(\)\s*\};\s*\}\s*\}\s*catch\(err\)\s*\{\s*Logger\.log\('Erro em getInitialData: ' \+ err\.toString\(\)\);\s*return \{\s*vehicles: \[\],\s*prescriptivePlans: \[\],\s*logs: \[\],\s*oficinas: getOficinas\(\)\s*\};\s*\}/,
  `} catch(err) {
    Logger.log('Erro em getInitialData: ' + err.toString());
    return {
      vehicles: [],
      prescriptivePlans: [],
      logs: [],
      oficinas: getOficinas()
    };
  }`
);

fs.writeFileSync('Code.gs', codeGs, 'utf8');

// Validar sintaxe com node
try {
  execSync('node --check Code.gs');
  console.log('✅ Code.gs sintaxe 100% perfeita sem erros!');
} catch(e) {
  console.error('Erro de sintaxe em Code.gs:', e.message);
}
