const fs = require('fs');

// 1. BACKUP DE SEGURANÇA MANDATÓRIO
const backupDir = 'backups/checkpoint_v107_vehicle_hydration_heal';
if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
fs.copyFileSync('Code.gs', backupDir + '/Code.gs');
fs.copyFileSync('index.html', backupDir + '/index.html');
fs.copyFileSync('App.html', backupDir + '/App.html');

// 2. ATUALIZAR CODE.GS
let codeGs = fs.readFileSync('Code.gs', 'utf8');

// 2.1. Garantir que getInitialData inclua oficinas e nunca falhe
const getInitialDataClean = `function getInitialData() {
  try {
    setupSpreadsheet();
    const ss = getSpreadsheet();
    
    const sheetAtivos = getOrCreateSheet(ss, SHEET_NAMES.ATIVOS);
    let vehicles = parseSheetRows(sheetAtivos.getDataRange().getValues());
    if (!vehicles || vehicles.length === 0) {
      recomporBancoDadosCanonico();
      vehicles = parseSheetRows(sheetAtivos.getDataRange().getValues());
    }

    const sheetPrescritivo = getOrCreateSheet(ss, SHEET_NAMES.PLANO_PRESCRITIVO);
    const prescriptivePlans = parseSheetRows(sheetPrescritivo.getDataRange().getValues());

    const sheetOcorrencias = getOrCreateSheet(ss, SHEET_NAMES.REGISTRO_OCORRENCIAS);
    const rawLogs = parseSheetRows(sheetOcorrencias.getDataRange().getValues());
    const logs = deduplicateLogsAndItems(rawLogs);

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

codeGs = codeGs.replace(/function getInitialData\(\)[\s\S]*?return \{\s*vehicles: vehicles,[\s\S]*?\};\s*\}/, getInitialDataClean);
fs.writeFileSync('Code.gs', codeGs, 'utf8');

// 3. ATUALIZAR INDEX.HTML E APP.HTML COM PRE-HYDRATION NATIVA DO VEÍCULO C4 PALLAS
let html = fs.readFileSync('index.html', 'utf8');

// Injetar o estado inicial pré-carregado para renderização instantânea do C4 Pallas
const preHydratedState = `let state = {
      oficinas: [
        {
          id: "OFI_001", ID_Oficina: "OFI_001",
          nomeFantasia: "AUTO MECANICA REPUBLICA", Nome_Fantasia: "AUTO MECANICA REPUBLICA",
          nomeJuridico: "BRICHI E MARTINI AUTO MECANICA LTDA-ME", Nome_Juridico: "BRICHI E MARTINI AUTO MECANICA LTDA-ME",
          cnpjh: "15.821.397/0001-50", CNPJ: "15.821.397/0001-50",
          endereco: "AV REPUBLICA, 2280 - PALMITAL - Marília, SP", Endereco: "AV REPUBLICA, 2280 - PALMITAL - Marília, SP",
          contatoMensagens: "5514996810031", Contato_Mensagens: "5514996810031",
          contatoCelular: "(14) 99681-0031", Contato_Celular: "(14) 99681-0031",
          telefoneFisico: "(14) 3413-8811", Telefone_Fisico: "(14) 3413-8811",
          emails: "contato@automecanicarepublica.com.br", Emails: "contato@automecanicarepublica.com.br",
          tipoAtendimento: "Mecânica Geral, Retífica de Motores e Injeção", Tipo_Atendimento: "Mecânica Geral, Retífica de Motores e Injeção",
          mecanicoResponsavel: "Tiago (Mecânico Responsável)", Mecanico_Responsavel: "Tiago (Mecânico Responsável)",
          isBase: true, Flag_Oficina_Base: true
        },
        {
          id: "OFI_002", ID_Oficina: "OFI_002",
          nomeFantasia: "FLORIPA CASA E CONSTRUCAO LTDA", Nome_Fantasia: "FLORIPA CASA E CONSTRUCAO LTDA",
          nomeJuridico: "Floripa Casa e Construção LTDA", Nome_Juridico: "Floripa Casa e Construção LTDA",
          cnpjh: "59.997.717/0001-00", CNPJ: "59.997.717/0001-00",
          endereco: "Estrada Vereador Onildo Lemos, 728 - Florianópolis, SC", Endereco: "Estrada Vereador Onildo Lemos, 728 - Florianópolis, SC",
          contatoMensagens: "5548996720566", Contato_Mensagens: "5548996720566",
          contatoCelular: "(48) 99672-0566", Contato_Celular: "(48) 99672-0566",
          telefoneFisico: "(48) 3269-1000", Telefone_Fisico: "(48) 3269-1000",
          emails: "fiscal@floripacasa.com.br", Emails: "fiscal@floripacasa.com.br",
          tipoAtendimento: "Fornecedor de Peças / Insumos", Tipo_Atendimento: "Fornecedor de Peças / Insumos",
          mecanicoResponsavel: "Central de Vendas", Mecanico_Responsavel: "Central de Vendas",
          isBase: false, Flag_Oficina_Base: false
        }
      ],
      vehicles: [
        {
          id: "VEIC-001",
          ID: "VEIC-001",
          marca: "CITROËN",
          Marca: "CITROËN",
          modelo: "C4 PALLAS",
          Modelo: "C4 PALLAS",
          anoFabricacao: 2008,
          AnoFabricacao: 2008,
          anoModelo: 2009,
          AnoModelo: 2009,
          motorizacao: "2.0 16V EW10A (Correia Dentada)",
          Motorizacao: "2.0 16V EW10A (Correia Dentada)",
          combustivel: "FLEX",
          Combustivel: "FLEX",
          tipoTransmissao: "Automático",
          TipoTransmissao: "Automático",
          tipoDistribuicao: "Correia Dentada",
          TipoDistribuicao: "Correia Dentada",
          placaChassi: "EEQ-9C28",
          PlacaChassi: "EEQ-9C28",
          placa: "EEQ-9C28",
          Placa: "EEQ-9C28",
          regimeUso: "SEVERO_URBANO",
          RegimeUso: "SEVERO_URBANO",
          kmInicial: 191706,
          KMInicial: 191706,
          kmAtual: 191900,
          KMAtual: 191900
        }
      ],
      selectedVehicleId: "VEIC-001",
      prescriptivePlan: [],
      customPrescriptions: [],
      logs: [],
      paretoChartInstance: null,
      activeIngestionTab: 'auto'
    };`;

html = html.replace(/let state = \{[\s\S]*?activeIngestionTab: 'auto'\s*\};/, preHydratedState);

fs.writeFileSync('index.html', html, 'utf8');
fs.writeFileSync('App.html', html, 'utf8');
console.log('✅ Hidratação instantânea do veículo padrão consolidada!');
