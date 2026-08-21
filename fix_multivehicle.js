const fs = require('fs');

// 1. BACKUP DE SEGURANÇA MANDATÓRIO
const backupDir = 'backups/checkpoint_v105_multivehicle_persistence_fix';
if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
fs.copyFileSync('Code.gs', backupDir + '/Code.gs');
fs.copyFileSync('index.html', backupDir + '/index.html');
fs.copyFileSync('App.html', backupDir + '/App.html');

// 2. ATUALIZAR CODE.GS
let codeGs = fs.readFileSync('Code.gs', 'utf8');

// 2.1. Corrigir getInitialData para NÃO resetar/limpar o banco de dados a cada requisição
codeGs = codeGs.replace(
  'function getInitialData() {\n  try { recomporBancoDadosCanonico(); } catch(e) { Logger.log(e); }\n  setupSpreadsheet();',
  'function getInitialData() {\n  setupSpreadsheet();'
);

// 2.2. Corrigir recomporBancoDadosCanonico para só executar se a tabela estiver vazia
const newRecompor = `function recomporBancoDadosCanonico() {
  const ss = getSpreadsheet();
  const sheetAtivos = getOrCreateSheet(ss, SHEET_NAMES.ATIVOS);
  if (sheetAtivos.getLastRow() > 1) {
    return { success: true, message: 'Banco de dados já possui veículos cadastrados.' };
  }
  
  // 1. ATIVOS (Ano 2008/2009, 191.900 KM)
  sheetAtivos.clear();
  sheetAtivos.appendRow(['ID', 'Marca', 'Modelo', 'AnoFabricacao', 'AnoModelo', 'Motorizacao', 'Combustivel', 'PlacaChassi', 'DataCadastro', 'KMInicial', 'KMAtual', 'DataUltimaAtualizacaoKM', 'RegimeUso', 'TipoTransmissao', 'TipoDistribuicao']);
  sheetAtivos.appendRow(['VEIC-001', 'CITROËN', 'C4 PALLAS', 2008, 2009, '2.0 16V EW10A', 'FLEX', 'EEQ-9C28', '2026-08-01', 191706, 191900, '2026-08-20', 'SEVERO_URBANO', 'Automático', 'Correia Dentada']);

  // 2. REGISTRO_OCORRENCIAS
  const sheetLogs = getOrCreateSheet(ss, SHEET_NAMES.REGISTRO_OCORRENCIAS);
  if (sheetLogs.getLastRow() <= 1) {
    sheetLogs.clear();
    sheetLogs.appendRow(['ID', 'Data', 'KM', 'Tipo', 'Sistema', 'Subcausa', 'CustoPecas', 'CustoMaoDeObra', 'TempoParadaHoras', 'OficinaNome', 'NumeroNF', 'ChaveAcessoNFe', 'DescricaoServico', 'VeiculoID', 'Observacoes']);
    const canonicalLogs = [
      ['LOG-001', '2026-08-10', 191706, 'PREVENTIVA', 'Motor / Trem de Força', 'Substituição do Óleo do Motor e Filtro', 240.00, 80.00, 1.5, 'FLORIPA CASA E CONSTRUCAO LTDA', 'NF-5481', '35260800000000000000550010000054811000000001', 'Troca de óleo de motor 10W40 semissintético e filtro de óleo Mann', 'VEIC-001', 'Manutenção preventiva periódica'],
      ['LOG-002', '2026-08-10', 191706, 'PREVENTIVA', 'Motor / Trem de Força', 'Substituição do Filtro de Combustível de Linha', 95.00, 40.00, 1.0, 'FLORIPA CASA E CONSTRUCAO LTDA', 'NF-5481', '35260800000000000000550010000054811000000002', 'Troca de filtro de combustível de linha FLEX', 'VEIC-001', 'Substituição preventiva de filtro'],
      ['LOG-003', '2026-08-10', 191706, 'PREVENTIVA', 'Motor / Trem de Força', 'Substituição do Filtro de Ar do Motor', 85.00, 30.00, 0.5, 'FLORIPA CASA E CONSTRUCAO LTDA', 'NF-5481', '35260800000000000000550010000054811000000003', 'Substituição do elemento filtrante de ar', 'VEIC-001', 'Filtro de ar em dia'],
      ['LOG-004', '2026-08-10', 191706, 'PREVENTIVA', 'Habitáculo / Climatização', 'Substituição do Filtro de Cabine / Ar-Condicionado', 75.00, 30.00, 0.5, 'FLORIPA CASA E CONSTRUCAO LTDA', 'NF-5481', '35260800000000000000550010000054811000000004', 'Troca de filtro de cabine anti-pólen e higienização', 'VEIC-001', 'Higienização de ar-condicionado'],
      ['LOG-005', '2026-06-09', 191706, 'PREVENTIVA', 'Arrefecimento', 'Sistema de Arrefecimento Completo (Bomba, Válvula, Trocador)', 111.36, 0.00, 1.0, 'FLORIPA CASA E CONSTRUCAO LTDA', '000.001.414', '42260659997717000100550020000014141208982535', 'WURTH FLUIDO RADIADOR ROSA 1L (2 unidades) e revisão do arrefecimento', 'VEIC-001', 'Aplicação de aditivo de arrefecimento Wurth Rosa']
    ];
    canonicalLogs.forEach(row => sheetLogs.appendRow(row));
  }

  // 3. PLANO_PRESCRITIVO
  const sheetPlano = getOrCreateSheet(ss, SHEET_NAMES.PLANO_PRESCRITIVO);
  if (sheetPlano.getLastRow() <= 1) {
    sheetPlano.clear();
    sheetPlano.appendRow(['ID', 'Subcausa', 'Sistema', 'IntervaloKM_Normal', 'IntervaloMeses_Normal', 'IntervaloKM_Severo', 'IntervaloMeses_Severo', 'Prioridade', 'Ativo', 'Fonte', 'Observacoes', 'VeiculoID']);
    const canonicalPrescriptions = [
      ['PRES-001', 'Substituição do Óleo do Motor e Filtro', 'Motor / Trem de Força', 10000, 12, 10000, 12, 'CRITICA', true, 'MANTENEDOR', 'Óleo 10W40 semissintético PSA B71 2296', 'VEIC-001'],
      ['PRES-002', 'Substituição do Filtro de Combustível de Linha', 'Motor / Trem de Força', 10000, 12, 10000, 12, 'CRITICA', true, 'MANTENEDOR', 'Proteção do sistema de injeção', 'VEIC-001'],
      ['PRES-003', 'Substituição do Filtro de Ar do Motor', 'Motor / Trem de Força', 10000, 12, 10000, 12, 'ALERTA', true, 'MANTENEDOR', 'Elemento de ar do motor', 'VEIC-001'],
      ['PRES-004', 'Substituição do Filtro de Cabine / Ar-Condicionado', 'Habitáculo / Climatização', 10000, 12, 10000, 12, 'ALERTA', true, 'MANTENEDOR', 'Filtro anti-pólen e higienização', 'VEIC-001'],
      ['PRES-005', 'Sistema de Arrefecimento Completo (Bomba, Válvula, Trocador)', 'Arrefecimento', 10000, 12, 10000, 12, 'CRITICA', true, 'MANTENEDOR', 'Fluido Wurth Rosa NF 000.001.414', 'VEIC-001'],
      ['PRES-006', 'Substituição Completa do Fluido de Freio (DOT 4)', 'Freios', 10000, 12, 10000, 12, 'CRITICA', true, 'MANTENEDOR', 'Diretriz técnica sob acompanhamento', 'VEIC-001'],
      ['PRES-007', 'Substituição do Kit Correia Dentada e Tensor', 'Sincronismo / Motor', 70000, 48, 56000, 36, 'CRITICA', true, 'OEM', 'Kit correia sincronizadora e tensor', 'VEIC-001'],
      ['PRES-008', 'Substituição das Velas de Ignição', 'Ignição / Motor', 40000, 24, 32000, 24, 'CRITICA', true, 'OEM', 'Jogo de 4 velas de ignição', 'VEIC-001']
    ];
    canonicalPrescriptions.forEach(row => sheetPlano.appendRow(row));
  }

  return { success: true, message: 'Banco de dados validado com sucesso.' };
}`;

codeGs = codeGs.replace(/function recomporBancoDadosCanonico\(\)[\s\S]*?return \{ success: true, message: 'Banco de dados 100% auditado e calibrado com a NF-e 000\.001\.414\.' \};\s*\}/, newRecompor);

// 2.3. Melhorar addVehicle para gerar o plano prescritivo mestre para o novo veículo
const newAddVehicle = `function addVehicle(vehicle) {
  const ss = getSpreadsheet();
  const sheet = getOrCreateSheet(ss, SHEET_NAMES.ATIVOS);
  const totalRows = sheet.getLastRow();
  const id = vehicle.id || vehicle.ID || ('VEIC-' + String(totalRows).padStart(3, '0'));
  const now = new Date().toISOString().split('T')[0];

  const marca = String(vehicle.marca || vehicle.Marca || '').trim().toUpperCase();
  const modelo = String(vehicle.modelo || vehicle.Modelo || '').trim().toUpperCase();
  const anoFab = Number(vehicle.anoFabricacao || vehicle.AnoFabricacao || 2015);
  const anoMod = Number(vehicle.anoModelo || vehicle.AnoModelo || 2015);
  const motor = String(vehicle.motorizacao || vehicle.Motorizacao || '').trim();
  const comb = String(vehicle.combustivel || vehicle.Combustivel || 'FLEX').trim();
  const placa = String(vehicle.placaChassi || vehicle.PlacaChassi || vehicle.placa || vehicle.Placa || '').trim().toUpperCase();
  const dataAprop = String(vehicle.dataApropriacao || vehicle.DataApropriacao || now).trim();
  const kmIni = Number(vehicle.kmInicial || vehicle.KMInicial || 0);
  const kmAt = Number(vehicle.kmAtual || vehicle.KMAtual || kmIni);
  const regime = String(vehicle.regimeUso || vehicle.RegimeUso || 'SEVERO_URBANO').trim();
  const trans = String(vehicle.tipoTransmissao || vehicle.TipoTransmissao || 'Manual').trim();
  const dist = String(vehicle.tipoDistribuicao || vehicle.TipoDistribuicao || 'Correia Dentada').trim();
  
  const row = [
    id, marca, modelo, anoFab, anoMod,
    motor, comb, placa, dataAprop,
    kmIni, kmAt, now, regime, trans, dist
  ];
  
  sheet.appendRow(row);

  // Inicializar Plano Prescritivo Base para o novo veículo
  try {
    const sheetPlano = getOrCreateSheet(ss, SHEET_NAMES.PLANO_PRESCRITIVO);
    const defaultPlans = [
      ['Substituição do Óleo do Motor e Filtro', 'Motor / Trem de Força', 10000, 12, 10000, 12, 'CRITICA', true, 'OEM', 'Óleo e filtro de motor'],
      ['Substituição do Filtro de Combustível de Linha', 'Motor / Trem de Força', 10000, 12, 10000, 12, 'CRITICA', true, 'OEM', 'Filtro de combustível'],
      ['Substituição do Filtro de Ar do Motor', 'Motor / Trem de Força', 10000, 12, 10000, 12, 'ALERTA', true, 'OEM', 'Elemento de ar'],
      ['Substituição do Filtro de Cabine / Ar-Condicionado', 'Habitáculo / Climatização', 10000, 12, 10000, 12, 'ALERTA', true, 'OEM', 'Filtro anti-pólen'],
      ['Sistema de Arrefecimento Completo (Bomba, Válvula, Trocador)', 'Arrefecimento', 30000, 24, 20000, 12, 'CRITICA', true, 'OEM', 'Aditivo de arrefecimento'],
      ['Substituição Completa do Fluido de Freio (DOT 4)', 'Freios', 20000, 24, 10000, 12, 'CRITICA', true, 'OEM', 'Fluido DOT 4'],
      ['Substituição do Kit Correia Dentada e Tensor', 'Sincronismo / Motor', 70000, 48, 50000, 36, 'CRITICA', true, 'OEM', 'Kit de sincronismo'],
      ['Substituição das Velas de Ignição', 'Ignição / Motor', 40000, 24, 30000, 24, 'CRITICA', true, 'OEM', 'Velas de ignição']
    ];
    defaultPlans.forEach((p, idx) => {
      sheetPlano.appendRow([
        'PRES-' + id + '-' + (idx + 1),
        p[0], p[1], p[2], p[3], p[4], p[5], p[6], p[7], p[8], p[9], id
      ]);
    });
  } catch(e) { Logger.log('Erro ao criar plano prescritivo para ' + id + ': ' + e); }

  return { success: true, vehicleId: id, placa: placa, data: row };
}`;

codeGs = codeGs.replace(/function addVehicle\(vehicle\)[\s\S]*?return \{ success: true, vehicleId: id, placa: placa, data: row \};\s*\}/, newAddVehicle);
fs.writeFileSync('Code.gs', codeGs, 'utf8');

// 3. ATUALIZAR INDEX.HTML E APP.HTML
let html = fs.readFileSync('index.html', 'utf8');

// 3.1. Preservar o veículo selecionado ao recarregar os dados
const newOnDataLoaded = `function onDataLoaded(data) {
      state.vehicles = data.vehicles || [];
      state.customPrescriptions = data.prescriptivePlans || [];
      state.logs = deduplicateLogsAndItems(data.logs || []);
      if (data.oficinas && data.oficinas.length > 0) state.oficinas = data.oficinas;

      const currentExists = state.vehicles.some(v => String(v.ID || v.id) === String(state.selectedVehicleId));
      if (!currentExists && state.vehicles.length > 0) {
        state.selectedVehicleId = state.vehicles[0].ID || state.vehicles[0].id;
      }

      renderVehicleSelectors();
      renderCurrentVehicleView();
    }`;

html = html.replace(/function onDataLoaded\(data\)[\s\S]*?renderVehicleSelectors\(\);\s*renderCurrentVehicleView\(\);\s*\}/, newOnDataLoaded);

// 3.2. Garantir que ao submeter o veículo, a seleção permaneça no novo veículo
const newSubmitVehicle = `function submitVehicle(e) {
      e.preventDefault();
      const vId = document.getElementById('vId').value;

      const vObj = {
        id: vId,
        ID: vId,
        marca: document.getElementById('vMarca').value.toUpperCase(),
        Marca: document.getElementById('vMarca').value.toUpperCase(),
        modelo: document.getElementById('vModelo').value.toUpperCase(),
        Modelo: document.getElementById('vModelo').value.toUpperCase(),
        anoFabricacao: Number(document.getElementById('vAnoFab').value),
        AnoFabricacao: Number(document.getElementById('vAnoFab').value),
        anoModelo: Number(document.getElementById('vAnoMod').value),
        AnoModelo: Number(document.getElementById('vAnoMod').value),
        placaChassi: document.getElementById('vPlaca').value.toUpperCase(),
        PlacaChassi: document.getElementById('vPlaca').value.toUpperCase(),
        placa: document.getElementById('vPlaca').value.toUpperCase(),
        Placa: document.getElementById('vPlaca').value.toUpperCase(),
        motorizacao: document.getElementById('vMotor').value,
        Motorizacao: document.getElementById('vMotor').value,
        combustivel: document.getElementById('vCombustivel').value,
        Combustivel: document.getElementById('vCombustivel').value,
        tipoTransmissao: document.getElementById('vTransmissao').value,
        TipoTransmissao: document.getElementById('vTransmissao').value,
        tipoDistribuicao: document.getElementById('vDistribuicao') ? document.getElementById('vDistribuicao').value : 'Correia Dentada',
        TipoDistribuicao: document.getElementById('vDistribuicao') ? document.getElementById('vDistribuicao').value : 'Correia Dentada',
        regimeUso: document.getElementById('vRegimeUso').value,
        RegimeUso: document.getElementById('vRegimeUso').value,
        kmInicial: Number(document.getElementById('vKmInicial').value),
        KMInicial: Number(document.getElementById('vKmInicial').value),
        kmAtual: Number(document.getElementById('vKmAtual').value),
        KMAtual: Number(document.getElementById('vKmAtual').value)
      };

      if (vId) {
        const v = state.vehicles.find(item => String(item.ID || item.id) === String(vId));
        if (v) Object.assign(v, vObj);
        if (typeof google !== 'undefined' && google.script && google.script.run) {
          google.script.run
            .withSuccessHandler(res => { loadData(); })
            .updateVehicle(vObj);
        }
      } else {
        const nextNum = state.vehicles.length + 1;
        const newId = 'VEIC-' + String(nextNum).padStart(3, '0');
        vObj.id = newId;
        vObj.ID = newId;
        
        state.vehicles.push(vObj);
        state.selectedVehicleId = newId;
        
        if (typeof google !== 'undefined' && google.script && google.script.run) {
          google.script.run
            .withSuccessHandler(res => { 
              if (res && res.vehicleId) state.selectedVehicleId = res.vehicleId;
              loadData(); 
            })
            .addVehicle(vObj);
        }
      }

      closeVehicleModal();
      renderVehicleSelectors();
      renderCurrentVehicleView();
    }`;

html = html.replace(/function submitVehicle\(e\)[\s\S]*?renderVehicleSelectors\(\);\s*renderCurrentVehicleView\(\);\s*\}/, newSubmitVehicle);

fs.writeFileSync('index.html', html, 'utf8');
fs.writeFileSync('App.html', html, 'utf8');
console.log('✅ Correção multi-veículos aplicada com sucesso!');
