const fs = require('fs');

const codeGs = fs.readFileSync('Code.gs', 'utf8');

const expectedFunctions = [
  'diagnosticarProblemaComIA',
  'processPrescriptiveSource',
  'deletePrescriptiveItem',
  'processDocumentAI',
  'getInitialData',
  'consultarFichaTecnicaVeiculoIA',
  'deleteVehicle',
  'updateVehicle',
  'addVehicle',
  'updateVehicleKm',
  'updateMaintenanceLog',
  'addMaintenanceLog',
  'deleteMaintenanceLog',
  'saveParecerTecnicoInspecao',
  'arquivarDossieCronologico',
  'definirOficinaBaseOficial',
  'excluirOficina',
  'salvarOficina'
];

console.log("=== AUDITORIA DE FUNÇÕES BACKEND EXPOSTAS PARA O FRONTEND ===");
expectedFunctions.forEach(fn => {
  const regex = new RegExp('function\\s+' + fn + '\\s*\\(', 'g');
  const exists = regex.test(codeGs);
  console.log(`${exists ? '✅' : '❌'} ${fn}: ${exists ? 'IMPLEMENTADA' : 'AUSENTE'}`);
});
