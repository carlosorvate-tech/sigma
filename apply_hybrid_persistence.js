const fs = require('fs');

// 1. BACKUP DE SEGURANÇA MANDATÓRIO
const backupDir = 'backups/checkpoint_v110_multivehicle_localstorage_persistence';
if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
fs.copyFileSync('Code.gs', backupDir + '/Code.gs');
fs.copyFileSync('index.html', backupDir + '/index.html');
fs.copyFileSync('App.html', backupDir + '/App.html');

// 2. ATUALIZAR CODE.GS: ELIMINAR QUALQUER LIMPEZA/SOBREESCRITA DESTRUTIVA EM GETINITIALDATA
let codeGs = fs.readFileSync('Code.gs', 'utf8');

// 2.1. getInitialData deve ser 100% LEITURA PURA (READ-ONLY)
const readOnlyGetInitialData = `function getInitialData() {
  try {
    const ss = getSpreadsheet();
    
    const sheetAtivos = getOrCreateSheet(ss, SHEET_NAMES.ATIVOS);
    let vehicles = parseSheetRows(sheetAtivos.getDataRange().getValues());
    
    // Se a planilha de ativos estiver totalmente vazia (primeiro uso), popula o C4 Pallas
    if (!vehicles || vehicles.length === 0) {
      const headersAtivos = [
        'ID', 'Marca', 'Modelo', 'AnoFabricacao', 'AnoModelo', 
        'Motorizacao', 'Combustivel', 'PlacaChassi', 'DataApropriacao', 
        'KMInicial', 'KMAtual', 'DataUltimaAtualizacao',
        'RegimeUso', 'TipoTransmissao', 'TipoDistribuicao'
      ];
      sheetAtivos.clear();
      sheetAtivos.appendRow(headersAtivos);
      sheetAtivos.appendRow([
        'VEIC-001', 'CITROËN', 'C4 PALLAS', 2008, 2009,
        '2.0 16V EW10A', 'FLEX', 'EEQ-9C28', '2026-08-01',
        191706, 191900, '2026-08-21',
        'SEVERO_URBANO', 'Automático', 'Correia Dentada'
      ]);
      vehicles = parseSheetRows(sheetAtivos.getDataRange().getValues());
    }

    const sheetPrescritivo = getOrCreateSheet(ss, SHEET_NAMES.PLANO_PRESCRITIVO);
    let prescriptivePlans = parseSheetRows(sheetPrescritivo.getDataRange().getValues());

    const sheetOcorrencias = getOrCreateSheet(ss, SHEET_NAMES.REGISTRO_OCORRENCIAS);
    let rawLogs = parseSheetRows(sheetOcorrencias.getDataRange().getValues());
    let logs = deduplicateLogsAndItems(rawLogs);

    return {
      vehicles: vehicles,
      prescriptivePlans: prescriptivePlans,
      logs: logs,
      oficinas: getOficinas()
    };
  } catch(err) {
    Logger.log('Erro em getInitialData: ' + err.toString());
    return {
      vehicles: [],
      prescriptivePlans: [],
      logs: [],
      oficinas: getOficinas()
    };
  }
}`;

codeGs = codeGs.replace(/function getInitialData\(\)[\s\S]*?return \{\s*vehicles: vehicles,[\s\S]*?\};\s*\}/, readOnlyGetInitialData);

// 2.2. Desativar repairAndCleanAtivosSheet para nunca apagar linhas de novos veículos
codeGs = codeGs.replace(
  'function repairAndCleanAtivosSheet(ss) {',
  'function repairAndCleanAtivosSheet(ss) {\n  return; // DESATIVADO PARA PRESERVAR TODOS OS VEÍCULOS'
);

fs.writeFileSync('Code.gs', codeGs, 'utf8');

// 3. ATUALIZAR INDEX.HTML E APP.HTML COM PERSISTÊNCIA LOCALSTORAGE
let html = fs.readFileSync('index.html', 'utf8');

const localStorageLogic = `
    // --- PERSISTÊNCIA LOCALSTORAGE RESILIENTE ---
    function saveStateToLocalStorage() {
      try {
        if (state.vehicles && state.vehicles.length > 0) {
          localStorage.setItem('sigma_vehicles', JSON.stringify(state.vehicles));
        }
        if (state.selectedVehicleId) {
          localStorage.setItem('sigma_selected_vehicle_id', state.selectedVehicleId);
        }
        if (state.logs && state.logs.length > 0) {
          localStorage.setItem('sigma_logs', JSON.stringify(state.logs));
        }
        if (state.customPrescriptions && state.customPrescriptions.length > 0) {
          localStorage.setItem('sigma_prescriptions', JSON.stringify(state.customPrescriptions));
        }
        if (state.oficinas && state.oficinas.length > 0) {
          localStorage.setItem('sigma_oficinas', JSON.stringify(state.oficinas));
        }
      } catch(e) {
        console.warn('Aviso ao salvar no localStorage:', e);
      }
    }

    function loadStateFromLocalStorage() {
      try {
        const savedVehicles = localStorage.getItem('sigma_vehicles');
        if (savedVehicles) {
          const parsed = JSON.parse(savedVehicles);
          if (Array.isArray(parsed) && parsed.length > 0) {
            state.vehicles = parsed;
          }
        }
        const savedSelectedId = localStorage.getItem('sigma_selected_vehicle_id');
        if (savedSelectedId && state.vehicles.some(v => String(v.ID || v.id) === String(savedSelectedId))) {
          state.selectedVehicleId = savedSelectedId;
        }
        const savedLogs = localStorage.getItem('sigma_logs');
        if (savedLogs) {
          const parsedLogs = JSON.parse(savedLogs);
          if (Array.isArray(parsedLogs) && parsedLogs.length > 0) {
            state.logs = deduplicateLogsList(parsedLogs);
          }
        }
        const savedPrescriptions = localStorage.getItem('sigma_prescriptions');
        if (savedPrescriptions) {
          const parsedPresc = JSON.parse(savedPrescriptions);
          if (Array.isArray(parsedPresc) && parsedPresc.length > 0) {
            state.customPrescriptions = parsedPresc;
          }
        }
        const savedOficinas = localStorage.getItem('sigma_oficinas');
        if (savedOficinas) {
          const parsedOfi = JSON.parse(savedOficinas);
          if (Array.isArray(parsedOfi) && parsedOfi.length > 0) {
            state.oficinas = parsedOfi;
          }
        }
      } catch(e) {
        console.warn('Aviso ao carregar do localStorage:', e);
      }
    }
`;

if (!html.includes('function saveStateToLocalStorage()')) {
  html = html.replace('document.addEventListener(\'DOMContentLoaded\', () => {', localStorageLogic + '\n    document.addEventListener(\'DOMContentLoaded\', () => {');
}

// Chamar loadStateFromLocalStorage() no DOMContentLoaded
html = html.replace(
  'document.addEventListener(\'DOMContentLoaded\', () => {\n      lucide.createIcons();',
  'document.addEventListener(\'DOMContentLoaded\', () => {\n      loadStateFromLocalStorage();\n      lucide.createIcons();'
);

// Atualizar onDataLoaded para salvar no localStorage
const newOnDataLoadedWithStorage = `function onDataLoaded(data) {
      if (!data) return;
      if (data.vehicles && data.vehicles.length > 0) {
        // Mesclar veículos remotos preservando novos cadastrados localmente
        const existingIds = new Set(data.vehicles.map(v => String(v.ID || v.id)));
        state.vehicles.forEach(localV => {
          if (!existingIds.has(String(localV.ID || localV.id))) {
            data.vehicles.push(localV);
          }
        });
        state.vehicles = data.vehicles;
      }
      if (data.prescriptivePlans && data.prescriptivePlans.length > 0) {
        state.customPrescriptions = data.prescriptivePlans;
      }
      if (data.logs && data.logs.length > 0) {
        state.logs = deduplicateLogsAndItems(data.logs);
      }
      if (data.oficinas && data.oficinas.length > 0) {
        state.oficinas = data.oficinas;
      }

      const currentExists = state.vehicles.some(v => String(v.ID || v.id) === String(state.selectedVehicleId));
      if (!currentExists && state.vehicles.length > 0) {
        state.selectedVehicleId = state.vehicles[0].ID || state.vehicles[0].id;
      }

      saveStateToLocalStorage();
      renderVehicleSelectors();
      renderCurrentVehicleView();
    }`;

html = html.replace(/function onDataLoaded\(data\)[\s\S]*?renderVehicleSelectors\(\);\s*renderCurrentVehicleView\(\);\s*\}/, newOnDataLoadedWithStorage);

// Atualizar submitVehicle para salvar no localStorage
html = html.replace(
  'closeVehicleModal();\n      renderVehicleSelectors();\n      renderCurrentVehicleView();',
  'saveStateToLocalStorage();\n      closeVehicleModal();\n      renderVehicleSelectors();\n      renderCurrentVehicleView();'
);

// Atualizar onVehicleChange para salvar no localStorage
html = html.replace(
  'function onVehicleChange(id) {\n      state.selectedVehicleId = id;',
  'function onVehicleChange(id) {\n      state.selectedVehicleId = id;\n      saveStateToLocalStorage();'
);

// Atualizar submitMaintenanceLog para salvar no localStorage
html = html.replace(
  'state.logs = deduplicateLogsList(state.logs);\n      closeMaintenanceModal();',
  'state.logs = deduplicateLogsList(state.logs);\n      saveStateToLocalStorage();\n      closeMaintenanceModal();'
);

fs.writeFileSync('index.html', html, 'utf8');
fs.writeFileSync('App.html', html, 'utf8');
console.log('✅ Persistência híbrida resiliente (LocalStorage + Google Sheets Read-Only) aplicada!');
