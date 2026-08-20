/**
 * SIGMA - Sistema Inteligente para Gestão de Manutenções Automotivas
 * Powered by Gemini AI & Google Apps Script
 * 
 * MÓDULO BACKEND - ARQUITETURA PURA BASEADA EM BANCO DE DADOS / GOOGLE SHEETS
 * INGESTÃO MULTIMODAL, MESCLAGEM POR CHAVE COMPOSTA & PAREAMENTO DETERMINÍSTICO
 * Conta Alvo: carlos.orvate@gmail.com
 */

const DEFAULT_GEMINI_KEY = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY') || '';

const SHEET_NAMES = {
  ATIVOS: 'ATIVOS',
  PLANO_PRESCRITIVO: 'PLANO_PRESCRITIVO',
  REGISTRO_OCORRENCIAS: 'REGISTRO_OCORRENCIAS',
  DASH_CALCULOS: 'DASH_CALCULOS'
};

function doGet(e) {
  let template;
  try {
    template = HtmlService.createTemplateFromFile('index');
  } catch(e1) {
    try {
      template = HtmlService.createTemplateFromFile('Index');
    } catch(e2) {
      template = HtmlService.createTemplateFromFile('App');
    }
  }
  return template.evaluate()
      .setTitle('SIGMA - Gestão Inteligente de Manutenções Automotivas')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function getSpreadsheet() {
  let ss = null;

  try {
    ss = SpreadsheetApp.getActiveSpreadsheet();
    if (ss && ss.getId()) return ss;
  } catch (e) {
    ss = null;
  }

  const props = PropertiesService.getScriptProperties();
  const savedId = props.getProperty('SPREADSHEET_ID');
  if (savedId) {
    try {
      ss = SpreadsheetApp.openById(savedId);
      if (ss) return ss;
    } catch (e) {
      Logger.log('Falha ao abrir planilha por ID salvo: ' + e.message);
    }
  }

  try {
    const searchNames = ['SIGMA_Diario_De_Bordo', 'CMMS_Diario_De_Bordo'];
    for (let name of searchNames) {
      const files = DriveApp.getFilesByName(name);
      while (files.hasNext()) {
        const file = files.next();
        if (file.getMimeType() === MimeType.GOOGLE_SHEETS) {
          ss = SpreadsheetApp.openById(file.getId());
          props.setProperty('SPREADSHEET_ID', file.getId());
          return ss;
        }
      }
    }
  } catch (e) {
    Logger.log('Falha ao buscar no Drive: ' + e.message);
  }

  try {
    ss = SpreadsheetApp.create('SIGMA_Diario_De_Bordo');
    props.setProperty('SPREADSHEET_ID', ss.getId());
    return ss;
  } catch (e) {
    throw new Error('Não foi possível obter ou criar a Planilha Google SIGMA: ' + e.message);
  }
}

function getOrCreateSheet(ss, sheetName) {
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    const sheets = ss.getSheets();
    for (let i = 0; i < sheets.length; i++) {
      if (sheets[i].getName().trim().toUpperCase() === sheetName.toUpperCase()) {
        sheet = sheets[i];
        break;
      }
    }
  }
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
  }
  return sheet;
}

function setupSpreadsheet() {
  const ss = getSpreadsheet();
  
  const sheetAtivos = getOrCreateSheet(ss, SHEET_NAMES.ATIVOS);
  if (sheetAtivos.getLastRow() === 0) {
    const headersAtivos = [
      'ID', 'Marca', 'Modelo', 'AnoFabricacao', 'AnoModelo', 
      'Motorizacao', 'Combustivel', 'PlacaChassi', 'DataApropriacao', 
      'KMInicial', 'KMAtual', 'DataUltimaAtualizacao',
      'RegimeUso', 'TipoTransmissao', 'TipoDistribuicao'
    ];
    sheetAtivos.getRange(1, 1, 1, headersAtivos.length)
      .setValues([headersAtivos])
      .setFontWeight('bold')
      .setBackground('#1e293b')
      .setFontColor('#ffffff');
  }

  const sheetPrescritivo = getOrCreateSheet(ss, SHEET_NAMES.PLANO_PRESCRITIVO);
  if (sheetPrescritivo.getLastRow() === 0) {
    const headersPrescritivo = [
      'ID', 'VeiculoID', 'Intervencao', 'Subsistema', 'Tipo', 
      'IntervaloKM', 'IntervaloMeses', 'EspecificacaoTecnica', 
      'OrigemFonte', 'TextoPrecaucao', 'DataAtualizacao'
    ];
    sheetPrescritivo.getRange(1, 1, 1, headersPrescritivo.length)
      .setValues([headersPrescritivo])
      .setFontWeight('bold')
      .setBackground('#1e293b')
      .setFontColor('#ffffff');
  }

  const sheetOcorrencias = getOrCreateSheet(ss, SHEET_NAMES.REGISTRO_OCORRENCIAS);
  if (sheetOcorrencias.getLastRow() === 0) {
    const headersOcorrencias = [
      'ID', 'VeiculoID', 'Placa', 'Data', 'KM', 'TipoManutencao', 
      'Subsistema', 'DescricaoServico', 'ValorTotal', 
      'OficinaNome', 'OficinaCNPJ', 'OficinaCidade', 'NumeroOS', 'ComprovanteUrl'
    ];
    sheetOcorrencias.getRange(1, 1, 1, headersOcorrencias.length)
      .setValues([headersOcorrencias])
      .setFontWeight('bold')
      .setBackground('#1e293b')
      .setFontColor('#ffffff');
  }

  const props = PropertiesService.getScriptProperties();
  if (props.getProperty('CLEAN_SLATE_RESET_V32_ALL') !== 'DONE') {
    resetDatabaseToZero();
    props.setProperty('CLEAN_SLATE_RESET_V32_ALL', 'DONE');
  }

  cleanPhysicalSheetDuplicates();
  repairAndCleanAtivosSheet(ss);
    try { PropertiesService.getScriptProperties().setProperty('GEMINI_API_KEY', DEFAULT_GEMINI_KEY); } catch(e) {}
  sanitizePrescriptiveSheet(ss);
  return { success: true, message: 'Estrutura de tabelas inicializada com sucesso.' };
}


/**
 * GERADOR DE CHAVE COMPOSTA ÚNICA PARA MERGE BLINDADO
 */
function makeItemKey(subsistema, intervencao) {
  const slugS = String(subsistema || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const slugI = String(intervencao || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  return `${slugS}_${slugI}`;
}

/**
 * NORMALIZAÇÃO CANÔNICA DE PEÇAS E ITENS
 */
function getCanonicalItemKey(itemDesc, itemPrice) {
  if (!itemDesc) return '';

  let str = itemDesc.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
  str = str.replace(/\b(KIT|JOGO|DE|DO|DA|DOS|DAS|E|O|A|PARA|EM|ORGANICO|ROSA|WURTH|COMPLETO|GERAL|SN|TOTAL|QUARTZ|10W40)\b/g, ' ');

  str = str.replace(/CARCA[CÇ]A/g, 'CARCACA');
  str = str.replace(/VALVULA/g, 'VALVULA');
  str = str.replace(/TERM\b|TERMOSTATICA\b/g, 'TERM');
  str = str.replace(/MANGUEIRA\b|MANG\b/g, 'MANGUEIRA');
  str = str.replace(/FLUIDO\b|OLEO\b/g, 'OLEO');
  str = str.replace(/SERVICO\b|MAO DE OBRA\b|M\.O\b|REFORMA\b/g, 'MO');

  const tokens = str.replace(/[^A-Z0-9]/g, ' ')
                    .split(/\s+/)
                    .filter(t => t.length > 1)
                    .sort();

  const tokenStr = tokens.join('_');
  const priceStr = Number(itemPrice || 0).toFixed(2);

  return `${tokenStr}_${priceStr}`;
}

/**
 * DEDUPLICAÇÃO ALGORÍTMICA EM 2 NÍVEIS
 */
function deduplicateLogsAndItems(rawLogs) {
  if (!rawLogs || !Array.isArray(rawLogs)) return [];

  const seenKeys = new Set();
  const cleanedLogs = [];

  rawLogs.forEach(log => {
    if (!log) return;
    const logId = String(log.ID || log.id || '').trim();
    const vId = String(log.VeiculoID || log.veiculoId || '').trim();
    const dataStr = String(log.Data || log.data || '').trim();
    const numDoc = String(log.NumeroOS || log.numeroOS || '').trim();
    const valor = Number(log.ValorTotal || log.valorTotal || 0);
    const desc = String(log.DescricaoServico || log.Descricao || log.descricaoServico || '').trim();

    // Chave de unicidade real: apenas remove duplicatas idênticas exatas
    const uniqueKey = logId ? logId : `${vId}_${dataStr}_${numDoc}_${valor}_${desc.substring(0, 30)}`;

    if (!seenKeys.has(uniqueKey)) {
      seenKeys.add(uniqueKey);
      cleanedLogs.push(log);
    }
  });

  return cleanedLogs.sort((a, b) => String(b.Data || '').localeCompare(String(a.Data || '')));
}
function cleanPhysicalSheetDuplicates() {
  try {
    const ss = getSpreadsheet();
    const sheet = getOrCreateSheet(ss, SHEET_NAMES.REGISTRO_OCORRENCIAS);
    const matrix = sheet.getDataRange().getValues();
    if (matrix.length <= 2) return;

    const rawLogs = parseSheetRows(matrix);
    const cleanedLogs = deduplicateLogsAndItems(rawLogs);

    sheet.clearContents();
    
    const headersOcorrencias = [
      'ID', 'VeiculoID', 'Placa', 'Data', 'KM', 'TipoManutencao', 
      'Subsistema', 'DescricaoServico', 'ValorTotal', 
      'OficinaNome', 'OficinaCNPJ', 'OficinaCidade', 'NumeroOS', 'ComprovanteUrl'
    ];
    sheet.getRange(1, 1, 1, headersOcorrencias.length)
      .setValues([headersOcorrencias])
      .setFontWeight('bold')
      .setBackground('#1e293b')
      .setFontColor('#ffffff');

    cleanedLogs.forEach(l => {
      sheet.appendRow([
        l.ID || ('LOG-' + Date.now()),
        l.VeiculoID || 'VEIC-001',
        l.Placa || 'EEQ-9C28',
        l.Data || new Date().toISOString().split('T')[0],
        Number(l.KM || 0),
        l.TipoManutencao || 'PREVENTIVA',
        l.Subsistema || 'Motor/Trem de Força',
        l.DescricaoServico || '',
        Number(l.ValorTotal || 0),
        l.OficinaNome || '',
        l.OficinaCNPJ || '',
        l.OficinaCidade || '',
        l.NumeroOS || '',
        l.ComprovanteUrl || ''
      ]);
    });
  } catch (err) {
    Logger.log('Aviso ao efetuar limpeza física no Sheets: ' + err.toString());
  }
}

function getInitialData() {
  try { recomporBancoDadosCanonico(); } catch(e) { Logger.log(e); }
  setupSpreadsheet();
  cleanPhysicalSheetDuplicates();

  const ss = getSpreadsheet();
  
  const sheetAtivos = getOrCreateSheet(ss, SHEET_NAMES.ATIVOS);
  const vehicles = parseSheetRows(sheetAtivos.getDataRange().getValues());

  const sheetPrescritivo = getOrCreateSheet(ss, SHEET_NAMES.PLANO_PRESCRITIVO);
  const prescriptivePlans = parseSheetRows(sheetPrescritivo.getDataRange().getValues());

  const sheetOcorrencias = getOrCreateSheet(ss, SHEET_NAMES.REGISTRO_OCORRENCIAS);
  const rawLogs = parseSheetRows(sheetOcorrencias.getDataRange().getValues());
  const logs = deduplicateLogsAndItems(rawLogs);

  return {
    vehicles: vehicles,
    prescriptivePlans: prescriptivePlans,
    logs: logs
  };
}

function parseSheetRows(matrix) {
  if (!matrix || matrix.length < 2) return [];
  const headers = matrix[0].map(h => String(h).trim());
  const rows = matrix.slice(1);
  return rows
    .filter(row => row.some(cell => cell !== '' && cell !== null && cell !== undefined))
    .map(row => {
      const obj = {};
      headers.forEach((h, index) => {
        let val = row[index];
        if (val instanceof Date) {
          val = val.toISOString().split('T')[0];
        }
        obj[h] = val;
        // CamelCase key
        const camel = h.charAt(0).toLowerCase() + h.slice(1);
        obj[camel] = val;
      });
      return obj;
    });
}
function processPrescriptiveSource(dadosIngestao, regimeArg, tipoFonteArg, dadosVeiculoArg) {
  let veiculoId, tipoFonte, payload, regimeUso, modoMerge, dadosVeiculo;
  
  if (typeof dadosIngestao === 'object' && dadosIngestao !== null) {
    veiculoId = dadosIngestao.veiculoId;
    tipoFonte = (dadosIngestao.tipoFonte || 'AUTO').toUpperCase();
    payload = dadosIngestao.payload;
    regimeUso = dadosIngestao.regimeUso || 'SEVERO_URBANO';
    modoMerge = dadosIngestao.modoMerge !== false;
    dadosVeiculo = dadosIngestao.dadosVeiculo || '';
  } else {
    veiculoId = dadosIngestao;
    regimeUso = regimeArg || 'SEVERO_URBANO';
    tipoFonte = (tipoFonteArg || 'AUTO').toUpperCase();
    dadosVeiculo = dadosVeiculoArg || '';
    modoMerge = true;
  }

  // Busca os dados cadastrais reais do veículo ativo na planilha se não vieram preenchidos
  if (!dadosVeiculo && veiculoId) {
    try {
      const ss = SpreadsheetApp.getActiveSpreadsheet() || getSpreadsheet();
      const sheetAtivos = getOrCreateSheet(ss, SHEET_NAMES.ATIVOS);
      const ativosData = sheetAtivos.getDataRange().getValues();
      if (ativosData.length > 1) {
        for (let i = 1; i < ativosData.length; i++) {
          if (String(ativosData[i][0]) === String(veiculoId)) {
            const marca = ativosData[i][1] || '';
            const modelo = ativosData[i][2] || '';
            const anoFab = ativosData[i][3] || '';
            const anoMod = ativosData[i][4] || '';
            const motor = ativosData[i][5] || '';
            const comb = ativosData[i][6] || '';
            const placa = ativosData[i][7] || '';
            const kmAtual = ativosData[i][10] || 0;
            const regime = ativosData[i][12] || regimeUso;
            const trans = ativosData[i][13] || '';
            const dist = ativosData[i][14] || '';
            dadosVeiculo = `${marca} ${modelo} (Ano ${anoFab}/${anoMod}) - Motor: ${motor} - Combustível: ${comb} - Câmbio: ${trans} - Distribuição: ${dist} - Placa: ${placa} - Odômetro: ${Number(kmAtual).toLocaleString('pt-BR')} KM`;
            regimeUso = regime || regimeUso;
            break;
          }
        }
      }
    } catch(e) {
      Logger.log("Aviso ao buscar veículo no Sheets: " + e.toString());
    }
  }

  let extractedItems = [];

  if (tipoFonte === 'AUTO' || tipoFonte === 'IA') {
    try {
      const apiKey = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY') || DEFAULT_GEMINI_KEY;
      if (!apiKey) throw new Error("Chave GEMINI_API_KEY não configurada.");

      const modelName = 'gemini-3.5-flash';
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

      const prompt = `Você é o engenheiro-chefe de confiabilidade automotiva e mantenedor especialista do sistema SIGMA CMMS.
Gere um plano prescritivo completo, rigoroso e altamente calibrado sob medida para o seguinte ativo veicular:
- Veículo / Configuração Cadastrada: ${dadosVeiculo || "Veículo Automotor Padrão"}
- Regime Operacional de Severidade: ${regimeUso || "SEVERO_URBANO"}

DIRETRIZES TÉCNICAS E DE ENGENHARIA OBRIGATÓRIAS:
1. Analise as especificações EXATAS da montadora deste veículo específico (fabricante, modelo, motorização, tipo de combustível, tipo de transmissão/câmbio manual, automático convencional, CVT ou dupla embreagem, e tipo de distribuição por correia dentada ou corrente).
2. Descubra e inclua TODOS os subsistemas essenciais com seus respectivos componentes para este modelo e ano:
   - Motor/Trem de Força (Óleo com especificação e viscosidade exata da montadora, Filtros de Óleo, Ar e Combustível, Velas de Ignição, Sistema de Distribuição/Correia/Tensores, Coxins do Motor)
   - Transmissão (Fluido de Câmbio com especificação OEM exata, seja manual, automático, CVT ou automatizado, filtros e vedantes)
   - Arrefecimento (Bomba d'Água, Válvula Termostática, Radiador/Trocador de Calor, Aditivo homologado pela montadora com proporção correta)
   - Freios (Fluido de Freio DOT homologado, Pastilhas e Discos de Freio Dianteiros e Traseiros)
   - Suspensão/Direção (Amortecedores, Batentes, Bieletas, Buchas de Bandeja, Rótulas/Pivôs, Fluido da Direção se hidráulica/eletro-hidráulica, Alinhamento 3D e Balanceamento)
   - Fluidos/Insumos (Fluidos de consumo, lubrificantes especiais e aditivos preventivos homologados pelo fabricante)
   - Elétrica/Eletrônica/Climatização (Filtro de Cabine / Ar Condicionado, Bateria e Sistema de Carga)
3. Aplique correções preventivas reais baseadas em Boletins Técnicos (TSBs) oficiais da montadora e histórico de falhas crônicas conhecidas para o motor e transmissão deste modelo específico.
4. Calibre os intervalos de quilometragem e tempo em meses de acordo com o regime operacional de severidade informado (${regimeUso}).
5. Retorne ESTRITAMENTE um array JSON puro, sem formatação markdown, contendo objetos com o formato exato:
[
  {
    "subsistema": "Nome do subsistema (ex: Motor/Trem de Força, Transmissão, Arrefecimento, Freios, Suspensão/Direção, Fluidos/Insumos, Elétrica/Eletrônica, Climatização)",
    "intervencao": "Nome técnico claro da intervenção preventiva",
    "tipo": "PREVENTIVA",
    "intervalo_km": 40000,
    "intervalo_meses": 24,
    "especificacao_tecnica": "Especificação técnica oficial exata de peças, fluidos e normas da montadora para este veículo",
    "origem_fonte": "MANUAL_OEM_FABRICANTE",
    "texto_precaucao": "Justificativa técnica / Consequência de falha / Referência a boletim técnico ou recomendação de fábrica"
  }
]`;

      const payloadBody = {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.1,
          responseMimeType: "application/json"
        }
      };

      const options = {
        method: "post",
        contentType: "application/json",
        payload: JSON.stringify(payloadBody),
        muteHttpExceptions: true
      };

      const response = UrlFetchApp.fetch(url, options);
      if (response.getResponseCode() === 200) {
        const data = JSON.parse(response.getContentText());
        if (data.candidates && data.candidates.length > 0) {
          let respostaIA = data.candidates[0].content.parts[0].text;
          respostaIA = respostaIA.replace(/\`\`\`json/gi, '').replace(/\`\`\`/g, '').trim();
          const itensGerados = JSON.parse(respostaIA);
          if (Array.isArray(itensGerados) && itensGerados.length > 0) {
            extractedItems = itensGerados;
          }
        }
      } else {
        Logger.log("Aviso na chamada Gemini IA: " + response.getContentText());
      }
    } catch (e) {
      Logger.log("Falha na IA Autônoma, operando com fallback seguro: " + e.message);
    }
  } else if (tipoFonte === 'URL') {
    let pageText = '';
    try {
      const response = UrlFetchApp.fetch(payload, { muteHttpExceptions: true });
      pageText = response.getContentText().slice(0, 10000);
    } catch (e) { pageText = ''; }
    if (pageText) {
      extractedItems = parseTextPrescriptionsWithRules(pageText, regimeUso, 'BOLETIM_TECNICO');
    }
  } else if (tipoFonte === 'TEXT') {
    extractedItems = parseTextPrescriptionsWithRules(payload, regimeUso, 'MANTENEDOR_ESPECIALISTA');
  } else if (tipoFonte === 'FILE') {
    const fileText = typeof payload === 'object' ? (payload.textData || '') : String(payload || '');
    if (fileText && fileText.length > 10 && !/\.(jpeg|jpg|png|pdf)$/i.test(fileText.trim())) {
      extractedItems = parseTextPrescriptionsWithRules(fileText, regimeUso, 'MANUAL_OEM_FABRICANTE');
    }
  }

  // Se nenhum item foi extraído, carrega o plano padrão da montadora calibrado
  if (!extractedItems || extractedItems.length === 0) {
    extractedItems = getDefaultOemPlanForVehicle(regimeUso);
  }

  return savePrescriptivePlan(veiculoId, extractedItems, modoMerge);
}

function parseTextPrescriptionsWithRules(textInput, regimeUso, defaultOrigin) {
  const items = [];
  const lines = String(textInput || '').split(/\r?\n/);
  const invalidExtensionsRegex = /\.(jpeg|jpg|png|webp|gif|pdf|txt|xml|docx|csv)$/i;

  lines.forEach(line => {
    const trimmed = line.trim();
    // Filtro de saneamento: ignorar linhas curtas, lixo ou nomes de arquivos
    if (!trimmed || trimmed.length < 5 || invalidExtensionsRegex.test(trimmed)) return;

    const kmMatch = trimmed.match(/(\d+[\d.]*)\s*km/i);
    const kmVal = kmMatch ? parseInt(kmMatch[1].replace(/\./g, ''), 10) : 10000;

    const mesesMatch = trimmed.match(/(\d+)\s*meses/i);
    const mesesVal = mesesMatch ? parseInt(mesesMatch[1], 10) : 12;

    let subsistema = 'Motor/Trem de Força';
    const lower = trimmed.toLowerCase();
    if (lower.includes('câmbio') || lower.includes('cambio') || lower.includes('atf') || lower.includes('transmissão') || lower.includes('transmissao')) subsistema = 'Transmissão';
    else if (lower.includes('freio') || lower.includes('pastilha') || lower.includes('disco')) subsistema = 'Freios';
    else if (lower.includes('alinhamento') || lower.includes('geometria') || lower.includes('pneu') || lower.includes('suspensão') || lower.includes('suspensao')) subsistema = 'Suspensão/Direção';
    else if (lower.includes('arrefecimento') || lower.includes('bomba d') || lower.includes('radiador') || lower.includes('termost')) subsistema = 'Arrefecimento';
    else if (lower.includes('bateria') || lower.includes('vela') || lower.includes('alternador') || lower.includes('ar condicionado')) subsistema = 'Elétrica/Eletrônica';
    else if (lower.includes('fluido') || lower.includes('aditivo') || lower.includes('lubrificante') || lower.includes('oleo') || lower.includes('óleo')) subsistema = 'Fluidos/Insumos';

    const cleanDesc = trimmed.replace(/^[•\-\S\*\d\.]+\s*/, '').trim().toUpperCase();
    if (cleanDesc.length >= 4 && !invalidExtensionsRegex.test(cleanDesc)) {
      items.push({
        intervencao: cleanDesc,
        subsistema: subsistema,
        tipo: 'PREVENTIVA',
        intervalo_km: kmVal,
        intervalo_meses: mesesVal,
        especificacao_tecnica: 'Especificação técnica conforme diretriz documental homologada',
        origem_fonte: defaultOrigin || 'MANUAL_OEM_FABRICANTE',
        texto_precaucao: 'Diretriz técnica sob acompanhamento periódico do plano de manutenção.'
      });
    }
  });

  return items;
}

function savePrescriptivePlan(veiculoId, novosItens, modoMerge) {
  if (!veiculoId || !novosItens || !Array.isArray(novosItens)) {
    return { success: false, status: 'erro', message: 'Dados inválidos para salvamento do plano prescritivo.' };
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet() || getSpreadsheet();
  let aba = ss.getSheetByName(SHEET_NAMES.PLANO_PRESCRITIVO) || ss.getSheetByName("PLANO_PRESCRITIVO");
  
  const headersPrescritivo = [
    'ID', 'VeiculoID', 'Intervencao', 'Subsistema', 'Tipo', 
    'IntervaloKM', 'IntervaloMeses', 'EspecificacaoTecnica', 
    'OrigemFonte', 'TextoPrecaucao', 'DataAtualizacao'
  ];

  if (!aba) {
    aba = ss.insertSheet(SHEET_NAMES.PLANO_PRESCRITIVO);
    aba.appendRow(headersPrescritivo);
    aba.getRange("A1:K1").setFontWeight("bold").setBackground("#1e293b").setFontColor("#ffffff");
  }
  
  const dados = aba.getDataRange().getValues();
  if (dados.length === 0) {
    aba.appendRow(headersPrescritivo);
    aba.getRange("A1:K1").setFontWeight("bold").setBackground("#1e293b").setFontColor("#ffffff");
  }

  const now = new Date().toISOString().split('T')[0];
  let itensExistentes = [];
  let linhasParaExcluir = [];
  
  // Detecta se a coluna 0 é ID (schema 11 colunas) ou VeiculoID (schema 9 colunas)
  const isCol0Id = dados.length > 0 && String(dados[0][0]).toUpperCase() === 'ID';
  const vIdCol = isCol0Id ? 1 : 0;
  const intervCol = isCol0Id ? 2 : 2;
  const subsysCol = isCol0Id ? 3 : 1;
  const origemCol = isCol0Id ? 8 : 8;

  // Mapeia linhas existentes do veículo
  for (let i = dados.length - 1; i >= 1; i--) {
    if (String(dados[i][vIdCol]) === String(veiculoId)) {
      if (modoMerge !== false) {
        // Guarda para comparação por chave composta
        const chave = (String(dados[i][subsysCol]) + "|" + String(dados[i][intervCol])).toLowerCase();
        itensExistentes.push({
          chave: chave,
          origem: String(dados[i][origemCol] || ''),
          linha: i + 1
        });
      } else {
        // Se overwrite, marca para exclusão
        linhasParaExcluir.push(i + 1);
      }
    }
  }
  
  // Se overwrite, remove todas as antigas do veículo de trás para frente
  if (modoMerge === false && linhasParaExcluir.length > 0) {
    linhasParaExcluir.forEach(l => aba.deleteRow(l));
  }
  
  // Insere ou atualiza os novos itens
  novosItens.forEach(item => {
    const interv = item.intervencao || item.Intervencao || '';
    const subsys = item.subsistema || item.Subsistema || 'Motor/Trem de Força';
    const tipo = item.tipo || item.Tipo || 'PREVENTIVA';
    const kmVal = Math.max(1, parseInt(item.intervalo_km || item.IntervaloKM || item.km_proxima_intervencao || 10000, 10));
    const mesesVal = Math.max(1, parseInt(item.intervalo_meses || item.IntervaloMeses || 12, 10));
    const spec = item.especificacao_tecnica || item.EspecificacaoTecnica || '';
    const origem = item.origem_fonte || item.OrigemFonte || 'MANUAL_OEM_FABRICANTE';
    const prec = item.texto_precaucao || item.TextoPrecaucao || '';
    const id = item.ID || item.id || ('PRES-' + Date.now() + '-' + Math.floor(Math.random() * 1000));

    const chaveNova = (subsys + "|" + interv).toLowerCase();
    const jaExiste = itensExistentes.find(e => e.chave === chaveNova);
    
    if (modoMerge !== false && jaExiste) {
      // Se for item manual/especialista, NÃO sobrescreve
      if (jaExiste.origem === "MANTENEDOR_ESPECIALISTA" || jaExiste.origem === "BOLETIM_TECNICO") {
        return; 
      }
      // Caso contrário, atualiza a linha existente
      if (isCol0Id) {
        aba.getRange(jaExiste.linha, 5).setValue(tipo);
        aba.getRange(jaExiste.linha, 6).setValue(kmVal);
        aba.getRange(jaExiste.linha, 7).setValue(mesesVal);
        aba.getRange(jaExiste.linha, 8).setValue(spec);
        aba.getRange(jaExiste.linha, 9).setValue(origem);
        aba.getRange(jaExiste.linha, 10).setValue(prec);
        aba.getRange(jaExiste.linha, 11).setValue(now);
      } else {
        aba.getRange(jaExiste.linha, 1, 1, 9).setValues([[
          veiculoId, subsys, interv, 'PREVENTIVA', 0, kmVal, kmVal, prec, origem
        ]]);
      }
    } else {
      // Insere nova linha
      if (isCol0Id) {
        aba.appendRow([
          id, veiculoId, interv, subsys, tipo,
          kmVal, mesesVal, spec, origem, prec, now
        ]);
      } else {
        aba.appendRow([
          veiculoId, subsys, interv, 'PREVENTIVA', 0, kmVal, kmVal, prec, origem
        ]);
      }
    }
  });
  
  return { 
    success: true, 
    status: "sucesso", 
    message: "Plano prescritivo sincronizado com sucesso.", 
    totalProcessado: novosItens.length 
  };
}

function getDefaultOemPlanForVehicle(regimeUso) {
  const multKm = regimeUso.includes('SEVERO') ? 0.8 : 1.0;

  return [
    {
      intervencao: 'Substituição do Óleo do Motor e Filtro',
      subsistema: 'Motor/Trem de Força',
      tipo: 'PREVENTIVA',
      intervalo_km: Math.round(5000 * multKm),
      intervalo_meses: 6,
      especificacao_tecnica: 'Sintético 10W40 API SN / Quartz 7000 PSA',
      origem_fonte: 'MANUAL_OEM_FABRICANTE',
      texto_precaucao: 'Sem registro de troca de óleo no histórico. Recomendada verificação de nível e troca preventiva.'
    },
    {
      intervencao: 'Substituição do Filtro de Combustível de Linha',
      subsistema: 'Motor/Trem de Força',
      tipo: 'PREVENTIVA',
      intervalo_km: Math.round(10000 * multKm),
      intervalo_meses: 12,
      especificacao_tecnica: 'Filtro Blindado de Linha 5.0 Bar',
      origem_fonte: 'MANUAL_OEM_FABRICANTE',
      texto_precaucao: 'Sem registro de substituição do filtro de combustível. Recomendada troca preventiva.'
    },
    {
      intervencao: 'Verificação da Folga de Eletrodos e Velas de Ignição',
      subsistema: 'Motor/Trem de Força',
      tipo: 'PREVENTIVA',
      intervalo_km: Math.round(20000 * multKm),
      intervalo_meses: 24,
      especificacao_tecnica: 'Velas Eletrodo Liga de Níquel / Iridium',
      origem_fonte: 'MANUAL_OEM_FABRICANTE',
      texto_precaucao: 'Sem registro de substituição de velas. Recomendada inspeção dos eletrodos.'
    },
    {
      intervencao: 'Sistema de Arrefecimento Completo (Bomba, Válvula, Trocador)',
      subsistema: 'Arrefecimento',
      tipo: 'PREVENTIVA',
      intervalo_km: Math.round(40000 * multKm),
      intervalo_meses: 24,
      especificacao_tecnica: 'Aditivo Orgânico Concentrado Rosa PSA',
      origem_fonte: 'MANUAL_OEM_FABRICANTE',
      texto_precaucao: 'Sem registro de manutenção no arrefecimento. Recomendada verificação de estanqueidade.'
    },
    {
      intervencao: 'Substituição do Kit de Correia Dentada Completo',
      subsistema: 'Motor/Trem de Força',
      tipo: 'PREVENTIVA',
      intervalo_km: Math.round(50000 * multKm),
      intervalo_meses: 48,
      especificacao_tecnica: 'Kit Correia Dentada HNBR + Tensionador Automático',
      origem_fonte: 'MANUAL_OEM_FABRICANTE',
      texto_precaucao: 'Sem comprovação documental de troca da correia dentada. Componente de risco crítico.'
    },
    {
      intervencao: 'Substituição Completa do Fluido de Freio (DOT 4)',
      subsistema: 'Freios',
      tipo: 'PREVENTIVA',
      intervalo_km: Math.round(20000 * multKm),
      intervalo_meses: 24,
      especificacao_tecnica: 'Fluido Sintético DOT 4 Alta Temperatura',
      origem_fonte: 'MANUAL_OEM_FABRICANTE',
      texto_precaucao: 'Fluido higroscópico sem registro de troca. Recomendada medição da ebulição.'
    },
    {
      intervencao: 'Fluido ATF Câmbio Automático AL4',
      subsistema: 'Transmissão',
      tipo: 'PREVENTIVA',
      intervalo_km: Math.round(40000 * multKm),
      intervalo_meses: 48,
      especificacao_tecnica: 'Mobil ATF LT 71141 / Eletroválvulas BorgWarner',
      origem_fonte: 'MANUAL_OEM_FABRICANTE',
      texto_precaucao: 'Transmissão sensível à degradação térmica do fluido. Recomendada verificação de contaminação.'
    },
    {
      intervencao: 'Alinhamento 3D de Geometria e Balanceamento',
      subsistema: 'Suspensão/Direção',
      tipo: 'PREVENTIVA',
      intervalo_km: Math.round(10000 * multKm),
      intervalo_meses: 6,
      especificacao_tecnica: 'Geometria Eixo Dianteiro/Traseiro 3D',
      origem_fonte: 'MANUAL_OEM_FABRICANTE',
      texto_precaucao: 'Sem histórico de alinhamento recente. Recomendada aferição de geometria 3D.'
    }
  ];
}

function addVehicle(vehicle) {
  const ss = getSpreadsheet();
  const sheet = getOrCreateSheet(ss, SHEET_NAMES.ATIVOS);
  const id = vehicle.id || vehicle.ID || ('VEIC-' + String(sheet.getLastRow()).padStart(3, '0'));
  const now = new Date().toISOString().split('T')[0];

  const marca = String(vehicle.marca || vehicle.Marca || '').trim().toUpperCase();
  const modelo = String(vehicle.modelo || vehicle.Modelo || '').trim().toUpperCase();
  const anoFab = Number(vehicle.anoFabricacao || vehicle.AnoFabricacao || 2009);
  const anoMod = Number(vehicle.anoModelo || vehicle.AnoModelo || 2009);
  const motor = String(vehicle.motorizacao || vehicle.Motorizacao || '').trim();
  const comb = String(vehicle.combustivel || vehicle.Combustivel || 'FLEX').trim();
  const placa = String(vehicle.placaChassi || vehicle.PlacaChassi || vehicle.placa || vehicle.Placa || '').trim().toUpperCase();
  const dataAprop = String(vehicle.dataApropriacao || vehicle.DataApropriacao || '').trim();
  const kmIni = Number(vehicle.kmInicial || vehicle.KMInicial || 0);
  const kmAt = Number(vehicle.kmAtual || vehicle.KMAtual || kmIni);
  const regime = String(vehicle.regimeUso || vehicle.RegimeUso || 'SEVERO_URBANO').trim();
  const trans = String(vehicle.tipoTransmissao || vehicle.TipoTransmissao || 'Automático Convencional').trim();
  const dist = String(vehicle.tipoDistribuicao || vehicle.TipoDistribuicao || 'Correia Dentada').trim();
  
  const row = [
    id, marca, modelo, anoFab, anoMod,
    motor, comb, placa, dataAprop,
    kmIni, kmAt, now, regime, trans, dist
  ];
  
  sheet.appendRow(row);
  return { success: true, vehicleId: id, placa: placa, data: row };
}

function updateVehicle(vehicle) {
  const ss = getSpreadsheet();
  const sheet = getOrCreateSheet(ss, SHEET_NAMES.ATIVOS);
  const data = sheet.getDataRange().getValues();
  const vId = vehicle.id || vehicle.ID;

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(vId)) {
      sheet.getRange(i + 1, 2).setValue(vehicle.marca || data[i][1]);
      sheet.getRange(i + 1, 3).setValue(vehicle.modelo || data[i][2]);
      sheet.getRange(i + 1, 4).setValue(vehicle.anoFabricacao || data[i][3]);
      sheet.getRange(i + 1, 5).setValue(vehicle.anoModelo || data[i][4]);
      sheet.getRange(i + 1, 6).setValue(vehicle.motorizacao || data[i][5]);
      sheet.getRange(i + 1, 7).setValue(vehicle.combustivel || data[i][6]);
      sheet.getRange(i + 1, 8).setValue(vehicle.placaChassi || vehicle.placa || data[i][7]);
      sheet.getRange(i + 1, 10).setValue(Number(vehicle.kmInicial) || data[i][9]);
      sheet.getRange(i + 1, 11).setValue(Number(vehicle.kmAtual) || data[i][10]);
      sheet.getRange(i + 1, 12).setValue(new Date().toISOString().split('T')[0]);
      sheet.getRange(i + 1, 13).setValue(vehicle.regimeUso || data[i][12]);
      sheet.getRange(i + 1, 14).setValue(vehicle.tipoTransmissao || data[i][13]);
      sheet.getRange(i + 1, 15).setValue(vehicle.tipoDistribuicao || vehicle.TipoDistribuicao || data[i][14] || 'Correia Dentada');
      return { success: true, message: 'Veículo atualizado com sucesso.' };
    }
  }
  return { success: false, message: 'Veículo não encontrado.' };
}
function deleteVehicle(vehicleId) {
  const ss = getSpreadsheet();
  const sheetAtivos = getOrCreateSheet(ss, SHEET_NAMES.ATIVOS);
  const dataAtivos = sheetAtivos.getDataRange().getValues();
  let found = false;

  for (let i = dataAtivos.length - 1; i >= 1; i--) {
    if (String(dataAtivos[i][0]) === String(vehicleId)) {
      sheetAtivos.deleteRow(i + 1);
      found = true;
      break;
    }
  }

  const sheetPrescritivo = getOrCreateSheet(ss, SHEET_NAMES.PLANO_PRESCRITIVO);
  const dataPresc = sheetPrescritivo.getDataRange().getValues();
  for (let i = dataPresc.length - 1; i >= 1; i--) {
    if (String(dataPresc[i][1]) === String(vehicleId)) {
      sheetPrescritivo.deleteRow(i + 1);
    }
  }

  const sheetOcorrencias = getOrCreateSheet(ss, SHEET_NAMES.REGISTRO_OCORRENCIAS);
  const dataOcorrencias = sheetOcorrencias.getDataRange().getValues();
  for (let i = dataOcorrencias.length - 1; i >= 1; i--) {
    if (String(dataOcorrencias[i][1]) === String(vehicleId)) {
      sheetOcorrencias.deleteRow(i + 1);
    }
  }

  if (found) {
    return { success: true, message: 'Veículo e registros excluídos com sucesso.' };
  }
  return { success: false, message: 'Veículo não encontrado.' };
}

function updateVehicleKm(vehicleId, kmAtual) {
  const ss = getSpreadsheet();
  const sheet = getOrCreateSheet(ss, SHEET_NAMES.ATIVOS);
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(vehicleId)) {
      sheet.getRange(i + 1, 11).setValue(Number(kmAtual));
      sheet.getRange(i + 1, 12).setValue(new Date().toISOString().split('T')[0]);
      return { success: true };
    }
  }
  return { success: false, message: 'Veículo não encontrado' };
}

function addMaintenanceLog(logData) {
  const ss = getSpreadsheet();
  const sheet = getOrCreateSheet(ss, SHEET_NAMES.REGISTRO_OCORRENCIAS);
  const id = 'LOG-' + String(Date.now()).slice(-6);
  
  const row = [
    id,
    logData.veiculoId || '',
    logData.placa || '',
    logData.data || new Date().toISOString().split('T')[0],
    Number(logData.km || 0),
    logData.tipoManutencao || 'PREVENTIVA',
    logData.subsistema || 'Motor/Trem de Força',
    logData.descricaoServico || '',
    Number(logData.valorTotal || 0),
    logData.oficinaNome || 'N/I',
    logData.oficinaCNPJ || '',
    logData.oficinaCidade || '',
    logData.numeroOS || '',
    logData.comprovanteUrl || ''
  ];
  
  sheet.appendRow(row);
  cleanPhysicalSheetDuplicates();
  return { success: true, logId: id, data: row };
}

function updateMaintenanceLog(logData) {
  const ss = getSpreadsheet();
  const sheet = getOrCreateSheet(ss, SHEET_NAMES.REGISTRO_OCORRENCIAS);
  const data = sheet.getDataRange().getValues();
  const lId = String(logData.id || logData.ID);

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === lId) {
      sheet.getRange(i + 1, 4).setValue(logData.data || data[i][3]);
      sheet.getRange(i + 1, 5).setValue(Number(logData.km || data[i][4]));
      sheet.getRange(i + 1, 6).setValue(logData.tipoManutencao || data[i][5]);
      sheet.getRange(i + 1, 7).setValue(logData.subsistema || data[i][6]);
      sheet.getRange(i + 1, 8).setValue(logData.descricaoServico || data[i][7]);
      sheet.getRange(i + 1, 9).setValue(Number(logData.valorTotal || data[i][8]));
      sheet.getRange(i + 1, 10).setValue(logData.oficinaNome || data[i][9]);
      sheet.getRange(i + 1, 11).setValue(logData.oficinaCNPJ || data[i][10]);
      sheet.getRange(i + 1, 12).setValue(logData.oficinaCidade || data[i][11]);
      sheet.getRange(i + 1, 13).setValue(logData.numeroOS || data[i][12]);
      return { success: true };
    }
  }
  return { success: false, message: 'Registro não encontrado' };
}
function deleteMaintenanceLog(logId) {
  const ss = getSpreadsheet();
  const sheet = getOrCreateSheet(ss, SHEET_NAMES.REGISTRO_OCORRENCIAS);
  const data = sheet.getDataRange().getValues();
  const lId = String(logId);

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === lId) {
      sheet.deleteRow(i + 1);
      cleanPhysicalSheetDuplicates();
      return { success: true, message: 'Ocorrência excluída com sucesso.' };
    }
  }
  return { success: false, message: 'Ocorrência não encontrada.' };
}

/**
 * RESET COMPLETO DA BASE DE DADOS (ZERA TODOS OS ATIVOS, PRESCRITIVOS E OCORRÊNCIAS)
 */
function resetDatabaseToZero() {
  const ss = getSpreadsheet();
  
  // 1. Limpa ATIVOS preservando apenas os cabeçalhos (linha 1)
  const sheetAtivos = getOrCreateSheet(ss, SHEET_NAMES.ATIVOS);
  if (sheetAtivos.getLastRow() > 1) {
    sheetAtivos.getRange(2, 1, sheetAtivos.getLastRow() - 1, sheetAtivos.getLastColumn()).clearContent();
  }

  // 2. Limpa PLANO_PRESCRITIVO preservando apenas os cabeçalhos (linha 1)
  const sheetPresc = getOrCreateSheet(ss, SHEET_NAMES.PLANO_PRESCRITIVO);
  if (sheetPresc.getLastRow() > 1) {
    sheetPresc.getRange(2, 1, sheetPresc.getLastRow() - 1, sheetPresc.getLastColumn()).clearContent();
  }

  // 3. Limpa REGISTRO_OCORRENCIAS preservando apenas os cabeçalhos (linha 1)
  const sheetLog = getOrCreateSheet(ss, SHEET_NAMES.REGISTRO_OCORRENCIAS);
  if (sheetLog.getLastRow() > 1) {
    sheetLog.getRange(2, 1, sheetLog.getLastRow() - 1, sheetLog.getLastColumn()).clearContent();
  }

  return { success: true, message: 'Base de dados zerada com sucesso. Todos os veículos e históricos foram excluídos.' };
}

function purgeTestRecords() {
  return resetDatabaseToZero();
}






/**
 * GERA HASH SHA-256 DE INTEGRIDADE FORENSE DO DOSSIÊ VEICULAR
 * Em conformidade com a Lei 12.965/2014 (Marco Civil da Internet)
 */
function gerarHashIntegridadeForense(veiculoId, kmAtual) {
  try {
    const rawString = `${veiculoId || 'V0'}_${kmAtual || 0}_${new Date().getTime()}`;
    const hashBytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, rawString);
    return hashBytes.map(b => ('0' + (b & 0xFF).toString(16)).slice(-2)).join('').substring(0, 24).toUpperCase();
  } catch (e) {
    return 'SIGMA' + new Date().getTime().toString(16).toUpperCase().substring(0, 18);
  }
}


/**
 * PROCESSAMENTO DE DIAGNÓSTICO PRELIMINAR DE ANOMALIAS (IA & HEURÍSTICA CAUSAL)
 * Correlaciona sintomas declarados com o histórico de manutenções e o modelo do veículo.
 */
// --- MÓDULO ISOLADO DE DIAGNÓSTICO PRÉVIO (HÍBRIDO: GEMINI + HEURÍSTICA LOCAL) ---
function processarDiagnosticoIA(veiculoId, relato) {
  
  // 1. DICIONÁRIO HEURÍSTICO LOCAL (FALLBACK DE SEGURANÇA)
  // Estrutura macro-direcional acionada apenas se a IA falhar ou não houver chave.
  function obterDiagnosticoLocal(texto) {
    const txt = texto.toLowerCase();
    
    const heuristica = [
      {
        termos: ["escapament", "pressão", "vazasse", "catalisador", "coletor", "fumaça", "soprando", "abafador"],
        json: {
          resumoExecutivo: "[MODO LOCAL] Anomalia mecânica detectada na dinâmica do fluxo de gases. A análise aponta para fadiga no Sistema de Exaustão ou Admissão.",
          arvoreCausas: [
            { probabilidadePercentual: 65, componenteSuspeito: "Tubo Flexível do Escapamento (Malha)", causaRaizProvavel: "Ruptura ou trinca na malha metálica devido à fadiga térmica/torcional.", procedimentoTeste: "Elevar o veículo e inspecionar visualmente a malha buscando marcas escuras de fuligem e vazamento." },
            { probabilidadePercentual: 25, componenteSuspeito: "Junta do Coletor de Escape", causaRaizProvavel: "Queima da junta de vedação ou afrouxamento dos prisioneiros do cabeçote.", procedimentoTeste: "Inspeção tátil (com motor frio) e visual na união do coletor com o cabeçote." },
            { probabilidadePercentual: 10, componenteSuspeito: "Catalisador Primário", causaRaizProvavel: "Fissura na solda do anel cônico ou miolo cerâmico quebrado.", procedimentoTeste: "Pancada leve com martelo de borracha para ouvir miolo solto; inspeção com fumaça." }
          ]
        }
      },
      {
        termos: ["freio", "trepida", "pedal", "assobio", "chiado", "disco", "pastilha"],
        json: {
          resumoExecutivo: "[MODO LOCAL] Anomalia mecânica detectada no Sistema de Frenagem. A descrição sugere atrito irregular ou empenamento.",
          arvoreCausas: [
            { probabilidadePercentual: 70, componenteSuspeito: "Discos de Freio Dianteiros", causaRaizProvavel: "Empenamento axial do disco por choque térmico ou desgaste.", procedimentoTeste: "Medição de empenamento com Relógio Comparador na bancada (tolerância max 0,05mm)." },
            { probabilidadePercentual: 30, componenteSuspeito: "Pastilhas de Freio", causaRaizProvavel: "Vitrificação da superfície ou desgaste atingindo a chapa de apoio.", procedimentoTeste: "Desmontagem da pinça e inspeção da espessura e textura do material de atrito." }
          ]
        }
      },
      {
        termos: ["tranco", "cambio", "marcha", "patinando", "neutro", "automático", "transmissão"],
        json: {
          resumoExecutivo: "[MODO LOCAL] Anomalia operacional detectada no Sistema de Transmissão. Comportamento indicativo de falha hidráulica ou eletrônica.",
          arvoreCausas: [
            { probabilidadePercentual: 60, componenteSuspeito: "Eletroválvulas de Modulação (AL4/AT8)", causaRaizProvavel: "Perda de pressão na linha hidráulica principal do corpo de válvulas.", procedimentoTeste: "Leitura via Scanner da pressão de linha em marcha lenta (D/R) vs pressão de referência." },
            { probabilidadePercentual: 40, componenteSuspeito: "Fluido de Transmissão (ATF)", causaRaizProvavel: "Degradação química do óleo, reduzindo a fricção correta dos discos.", procedimentoTeste: "Coleta de amostra de fluido para verificação de cor, odor de queimado e saturação." }
          ]
        }
      }
    ];

    // Busca o primeiro padrão que coincida com o texto relatado
    for (let i = 0; i < heuristica.length; i++) {
      if (heuristica[i].termos.some(termo => txt.includes(termo))) {
        return heuristica[i].json;
      }
    }
    
    // Fallback genérico se nada for encontrado
    return {
      resumoExecutivo: "[MODO LOCAL] Sintoma não correlacionado diretamente a um subsistema crítico específico. Requer investigação holística.",
      arvoreCausas: [
        { probabilidadePercentual: 50, componenteSuspeito: "Inspeção Dinâmica Geral", causaRaizProvavel: "Origem difusa ou múltiplas falhas simultâneas.", procedimentoTeste: "Teste de rodagem com scanner conectado para monitoramento de parâmetros em tempo real." }
      ]
    };
  }

  // 2. TENTATIVA DE CONEXÃO COGNITIVA (GEMINI API)
  try {
    let GEMINI_API_KEY = PropertiesService.getScriptProperties().getProperty("GEMINI_API_KEY") || DEFAULT_GEMINI_KEY;
    
    if (!GEMINI_API_KEY) {
      console.warn("Chave API não encontrada. Acionando Fallback Local.");
      return JSON.stringify(obterDiagnosticoLocal(relato));
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${GEMINI_API_KEY}`;
    
    // Prompt com Scratchpad (Raciocínio) e restrição rigorosa
    const prompt = `Você é um engenheiro mecânico sênior do sistema SIGMA.
    Analise o sintoma e formule um diagnóstico prévio. 
    Sintoma relatado: "${relato}"
    
    INSTRUÇÃO DE RACIOCÍNIO (Passo a passo invisível ao cliente):
    1. Identifique o sistema macro automotivo exato (Ex: Exaustão, Suspensão, Motor).
    2. Liste os componentes diretamente ligados a essa descrição.
    3. Formule as hipóteses.
    
    CRÍTICO: Retorne APENAS um JSON válido. Não use blocos de código markdown (json). O JSON DEVE ter esta estrutura exata:
    {
      "raciocinio_interno_ignorado_pelo_front": "Sua análise passo a passo aqui",
      "resumoExecutivo": "Explicação técnica breve da anomalia identificada no sistema macro",
      "arvoreCausas": [
        {
          "probabilidadePercentual": 80,
          "componenteSuspeito": "Nome específico da peça",
          "causaRaizProvavel": "O que quebrou estrutural ou funcionalmente",
          "procedimentoTeste": "Passo a passo físico de como o mecânico deve testar isso na oficina"
        }
      ]
    }`;

    const payload = {
      "contents": [{"parts": [{"text": prompt}]}],
      "generationConfig": {
        "temperature": 0.1, // Temperatura ultrabaixa para evitar alucinações
        "response_mime_type": "application/json"
      }
    };

    const options = {
      "method": "post",
      "contentType": "application/json",
      "payload": JSON.stringify(payload),
      "muteHttpExceptions": true
    };

    const response = UrlFetchApp.fetch(url, options);
    const code = response.getResponseCode();
    
    if (code !== 200) {
      console.error("Falha na API Gemini:", response.getContentText());
      return JSON.stringify(obterDiagnosticoLocal(relato)); // Aciona Fallback Local
    }

    const jsonStr = response.getContentText();
    const data = JSON.parse(jsonStr);
    
    if (data.candidates && data.candidates.length > 0) {
       let respostaIA = data.candidates[0].content.parts[0].text;
       // Limpeza preventiva de blocos markdown caso a IA desobedeça
       respostaIA = respostaIA.replace(/```(?:json)?/g, '').replace(/```/g, '').trim();
       return respostaIA;
    } else {
       return JSON.stringify(obterDiagnosticoLocal(relato));
    }

  } catch (error) {
    console.error("Erro fatal na função IA:", error);
    return JSON.stringify(obterDiagnosticoLocal(relato)); // Aciona Fallback Local em caso de quebra de código
  }
}



/**
 * PROCESSAMENTO INTELIGENTE DE DOCUMENTOS (PDF, IMAGEM, OS, NFE) VIA IA / OCR
 * Extrai dados estruturados de Ordens de Serviço e Notas Fiscais
 */
function processDocumentAI(base64Data, mimeType, fileName) {
  try {
    const props = PropertiesService.getScriptProperties();
    const apiKey = props.getProperty('GEMINI_API_KEY') || props.getProperty('API_KEY') || DEFAULT_GEMINI_KEY;

    let rawBase64 = base64Data || '';
    let actualMime = mimeType || 'application/pdf';

    if (base64Data && base64Data.indexOf(';base64,') > -1) {
      const parts = base64Data.split(';base64,');
      actualMime = parts[0].replace('data:', '');
      rawBase64 = parts[1];
    }

    if (apiKey && rawBase64) {
      const url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=" + apiKey;
      const prompt = "Você é um perito automotivo e auditor de ordens de serviço do SIGMA.\n" +
        "Analise o documento anexo (Ordem de Serviço ou Nota Fiscal) e extraia rigorosamente os dados no seguinte formato JSON (apenas o JSON puro, sem markdown):\n" +
        "{\n" +
        '  "numDoc": "número da OS ou NF (ex: 023005)",\n' +
        '  "data": "YYYY-MM-DD (ex: 2026-07-22)",\n' +
        '  "oficinaNome": "razão social ou nome fantasia da oficina",\n' +
        '  "oficinaCNPJ": "CNPJ formatado se constar",\n' +
        '  "oficinaCidade": "Cidade - UF",\n' +
        '  "km": 0,\n' +
        '  "placa": "placa do veículo se constar",\n' +
        '  "tipoManutencao": "PREVENTIVA ou CORRETIVA",\n' +
        '  "itens": [\n' +
        '    {\n' +
        '      "desc": "descrição da peça ou serviço",\n' +
        '      "valor": 0.00,\n' +
        '      "tipo": "Peça ou Mão de Obra ou Óleo/Fluido ou Retífica ou Insumo",\n' +
        '      "subsistema": "Motor/Trem de Força ou Transmissão ou Arrefecimento ou Freios ou Suspensão/Direção ou Elétrica/Eletrônica ou Fluidos/Insumos"\n' +
        '    }\n' +
        '  ],\n' +
        '  "valorTotal": 0.00\n' +
        "}";

      const payload = {
        contents: [{
          parts: [
            { inline_data: { mime_type: actualMime, data: rawBase64 } },
            { text: prompt }
          ]
        }],
        generationConfig: {
          temperature: 0.1,
          responseMimeType: "application/json"
        }
      };

      const response = UrlFetchApp.fetch(url, {
        method: 'post',
        contentType: 'application/json',
        payload: JSON.stringify(payload),
        muteHttpExceptions: true
      });

      if (response.getResponseCode() === 200) {
        const jsonRes = JSON.parse(response.getContentText());
        const textContent = jsonRes.candidates[0].content.parts[0].text;
        const cleanJson = textContent.replace(/\`\`\`json/gi, '').replace(/\`\`\`/g, '').trim();
        const extracted = JSON.parse(cleanJson);
        return {
          success: true,
          source: 'GEMINI_AI',
          data: extracted
        };
      }
    }

    return {
      success: false,
      message: 'GEMINI_API_KEY não configurada ou documento sem chave de IA.',
      fileName: fileName
    };
  } catch (err) {
    return {
      success: false,
      error: err.toString()
    };
  }
}


function repairAndCleanAtivosSheet(ss) {
  try {
    const sheet = getOrCreateSheet(ss, SHEET_NAMES.ATIVOS);
    const data = sheet.getDataRange().getValues();
    
    const headersAtivos = [
      'ID', 'Marca', 'Modelo', 'AnoFabricacao', 'AnoModelo', 
      'Motorizacao', 'Combustivel', 'PlacaChassi', 'DataApropriacao', 
      'KMInicial', 'KMAtual', 'DataUltimaAtualizacao',
      'RegimeUso', 'TipoTransmissao', 'TipoDistribuicao'
    ];

    if (data.length <= 1) {
      sheet.clearContents();
      sheet.getRange(1, 1, 1, headersAtivos.length).setValues([headersAtivos]);
      sheet.appendRow([
        'VEIC-001', 'CITROËN', 'C4 PALLAS', 2009, 2009,
        '2.0 16V EW10A', 'FLEX', 'EEQ-9C28', '2026-07-22',
        191706, 191706, new Date().toISOString().split('T')[0],
        'SEVERO_URBANO', 'Automático Convencional (AL4)', 'Correia Dentada'
      ]);
      return;
    }

    const rowsToKeep = [data[0]];
    let validCount = 0;

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const marca = String(row[1] || '').trim();
      const modelo = String(row[2] || '').trim();
      const placa = String(row[7] || '').trim();

      if (marca || modelo || placa) {
        rowsToKeep.push(row);
        validCount++;
      }
    }

    if (validCount === 0) {
      rowsToKeep.push([
        'VEIC-001', 'CITROËN', 'C4 PALLAS', 2009, 2009,
        '2.0 16V EW10A', 'FLEX', 'EEQ-9C28', '2026-07-22',
        191706, 191706, new Date().toISOString().split('T')[0],
        'SEVERO_URBANO', 'Automático Convencional (AL4)', 'Correia Dentada'
      ]);
    }

    sheet.clearContents();
    sheet.getRange(1, 1, rowsToKeep.length, rowsToKeep[0].length).setValues(rowsToKeep);
  } catch (e) {
    Logger.log('Erro no autoreparo de ATIVOS: ' + e.toString());
  }
}

function sanitizePrescriptiveSheet(ss) {
  try {
    const sheet = getOrCreateSheet(ss, SHEET_NAMES.PLANO_PRESCRITIVO);
    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) return;

    const headers = data[0];
    const rowsToKeep = [headers];
    const invalidExtensionsRegex = /\.(jpeg|jpg|png|webp|gif|pdf|txt|xml|docx|csv)$/i;
    const invalidPrefixRegex = /^(invoice-|doc-|manual-|arquivo-|comprovante-)/i;

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const intervencao = String(row[2] || '').trim();

      // Critérios de saneamento rigoroso:
      // 1. Não pode ser vazio ou ter menos de 4 letras
      // 2. Não pode terminar com extensão de arquivo (.jpeg, .pdf, etc.)
      // 3. Não pode ser prefixo genérico de arquivo
      const isFile = invalidExtensionsRegex.test(intervencao) || invalidPrefixRegex.test(intervencao);
      const isTooShort = intervencao.length < 4;

      if (!isFile && !isTooShort) {
        rowsToKeep.push(row);
      } else {
        Logger.log('Saneamento: Removida diretriz espúria do Sheets: ' + intervencao);
      }
    }

    if (rowsToKeep.length !== data.length) {
      sheet.clearContents();
      sheet.getRange(1, 1, rowsToKeep.length, rowsToKeep[0].length).setValues(rowsToKeep);
    }
  } catch (err) {
    Logger.log('Erro no saneamento de PLANO_PRESCRITIVO: ' + err.toString());
  }
}


/**
 * GERAÇÃO DE LAUDO DE TRIAGEM PARA OFICINA (HTML-TO-PDF NATIVO COM CHECKLIST E NOTA JURÍDICA)
 */
function gerarLaudoOficina(veiculoId, relato, diag, saude) {
  try {
    const dataAtual = new Date().toLocaleDateString('pt-BR');
    if (typeof diag === 'string') {
      try { diag = JSON.parse(diag); } catch(e) {}
    }
    if (!saude) saude = { motor: "Monitorado", transmissao: "Monitorado", freios: "Monitorado", suspensao: "Monitorado", arrefecimento: "Monitorado" };

    // --- OVERRIDE OBRIGATÓRIO DE LAYOUT (CHECKLIST + RODAPÉ JURÍDICO) ---
    let htmlCausas = '';
    if (diag.arvoreCausas && diag.arvoreCausas.length > 0) {
      diag.arvoreCausas.forEach((c, index) => {
        htmlCausas += `
          <div style="margin-bottom: 15px; padding: 12px; border: 1px solid #94a3b8; background-color: #f8fafc;">
            <div style="font-weight: bold; font-size: 11pt; color: #0f172a; margin-bottom: 6px;">
              [ &nbsp;&nbsp;&nbsp; ] Hipótese ${index + 1}: ${c.componenteSuspeito} <span style="float:right; font-weight:normal; color: #475569;">${c.probabilidadePercentual}% de probabilidade</span>
            </div>
            <div style="font-size: 9pt; color: #334155; margin-bottom: 10px;"><strong>Causa Estrutural:</strong> ${c.causaRaizProvavel}</div>
            <div style="background-color: #e2e8f0; border-left: 4px solid #475569; padding: 10px; font-size: 9pt; color: #0f172a;">
              <strong>ROTEIRO DE TESTE FÍSICO (BANCADA/ELEVADOR):</strong><br>
              &gt;&gt; ${c.procedimentoTeste}
            </div>
          </div>
        `;
      });
    }

    const htmlTemplate = `
      <html>
      <head>
        <style>
          body { font-family: 'Helvetica', 'Arial', sans-serif; color: #1e293b; margin: 0; padding: 15px; font-size: 10pt; line-height: 1.4; }
          .header { border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 15px; }
          .title { font-size: 16pt; font-weight: bold; color: #000; text-transform: uppercase; margin: 0; }
          .subtitle { font-size: 9pt; color: #475569; margin: 2px 0 0 0; }
          .meta-grid { display: table; width: 100%; border: 1px solid #cbd5e1; margin-bottom: 15px; font-size: 9pt; background-color: #f1f5f9;}
          .meta-cell { display: table-cell; padding: 8px; border-right: 1px solid #cbd5e1; width: 50%; }
          .section-title { font-size: 11pt; font-weight: bold; color: #000; border-bottom: 1px solid #94a3b8; padding-bottom: 3px; margin-top: 15px; margin-bottom: 10px; text-transform: uppercase;}
          
          /* RÓTULO CONCILIADOR OBRIGATÓRIO */
          .box-relato-wrapper { border: 1px dashed #64748b; background-color: #f8fafc; padding: 10px; margin-bottom: 15px; }
          .box-relato-label { font-size: 8pt; font-weight: bold; color: #64748b; text-transform: uppercase; margin-bottom: 5px; }
          .box-relato-text { font-style: italic; color: #1e293b; }
          
          .box-resumo { font-weight: bold; color: #1e293b; margin-bottom: 15px; text-align: justify; }
          
          /* Tabela de Saúde Oficina */
          table.saude-table { width: 100%; border-collapse: collapse; margin-top: 15px; margin-bottom: 20px; font-size: 8.5pt; }
          table.saude-table th, table.saude-table td { border: 1px solid #cbd5e1; padding: 6px; text-align: center; }
          table.saude-table th { background-color: #e2e8f0; font-weight: bold; text-transform: uppercase; color: #334155; }
          
          /* RODAPÉ JURÍDICO OBRIGATÓRIO (NÃO USE MARKETING) */
          .footer { margin-top: 30px; border-top: 1px solid #cbd5e1; padding-top: 8px; font-size: 7.5pt; color: #64748b; text-align: justify; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="title">SIGMA | ORDEM DE INVESTIGAÇÃO TÉCNICA</div>
          <div class="subtitle">Documento Preliminar de Entrada na Oficina</div>
        </div>
        
        <div class="meta-grid">
          <div class="meta-cell"><strong>ID Veículo:</strong> ${veiculoId}<br><strong>Data de Emissão:</strong> ${dataAtual}</div>
          <div class="meta-cell"><strong>Natureza do Laudo:</strong> Triagem Diagnóstica Baseada em Relato<br><strong>Ação Requerida:</strong> Validação Física no Elevador</div>
        </div>

        <div class="section-title">1. Queixa Principal do Veículo</div>
        <div class="box-relato-wrapper">
          <div class="box-relato-label">[ RELATO LITERAL DO CONDUTOR QUANDO NOTOU O PROBLEMA ]</div>
          <div class="box-relato-text">"${relato}"</div>
        </div>

        <div class="section-title">2. Parecer Técnico SIGMA (Análise Preliminar)</div>
        <div class="box-resumo">${diag.resumoExecutivo}</div>

        <div class="section-title">3. Roteiro de Verificação no Box (Hipóteses Causais)</div>
        ${htmlCausas}

        <div class="section-title">4. Panorama Geral do Veículo (Auditoria Marco Zero & Score: ${saude.score || 'N/D'}/100)</div>
        ${
          (saude.criticos && saude.criticos.length > 0) || (saude.preventivos && saude.preventivos.length > 0)
          ? `
            <div style="background-color: #f8fafc; border: 1px solid #cbd5e1; padding: 10px; font-size: 8.5pt; margin-bottom: 15px;">
              ${saude.criticos && saude.criticos.length > 0 ? `
                <div style="color: #be123c; font-weight: bold; margin-bottom: 4px;">[ ATENÇÃO CRÍTICA / MARCO ZERO NECESSÁRIO ]:</div>
                <ul style="margin: 0 0 8px 15px; padding: 0; color: #334155;">
                  ${saude.criticos.map(it => `<li>${it}</li>`).join('')}
                </ul>
              ` : ''}
              ${saude.preventivos && saude.preventivos.length > 0 ? `
                <div style="color: #b45309; font-weight: bold; margin-bottom: 4px;">[ OPORTUNIDADE PREVENTIVA / PRÓXIMOS 500 KM ]:</div>
                <ul style="margin: 0 0 4px 15px; padding: 0; color: #334155;">
                  ${saude.preventivos.map(it => `<li>${it}</li>`).join('')}
                </ul>
              ` : ''}
            </div>
          `
          : `
            <div style="background-color: #f8fafc; border: 1px solid #cbd5e1; padding: 8px; font-size: 8.5pt; color: #059669; font-weight: bold; margin-bottom: 15px;">
              [ CONFORMIDADE ]: Plano prescritivo atualizado sem intervenções emergenciais pendentes.
            </div>
          `
        }

        <div class="footer">
          <strong>NOTA JURÍDICA AO PROFISSIONAL REPARADOR:</strong><br>
          Este documento é um parecer algorítmico consultivo formulado a partir de sintomatologia descrita pelo proprietário. 
          As diretrizes aqui impressas não possuem caráter pericial definitivo e NÃO substituem a desmontagem, aferição e diagnóstico 
          do mecânico profissional responsável pela oficina. O sistema SIGMA atua exclusivamente como ferramenta de apoio à triagem mecânica.
        </div>
      </body>
      </html>
    `;

    // Converte e retorna
    const blob = Utilities.newBlob(htmlTemplate, MimeType.HTML).setName("Ordem_Oficina_SIGMA.pdf").getAs(MimeType.PDF);
    return {
      success: true,
      base64: Utilities.base64Encode(blob.getBytes()),
      fileName: "SIGMA_Ordem_Investigacao_Oficina_" + String(veiculoId).replace(/[^A-Z0-9]/gi, '_') + ".pdf"
    };
  } catch(err) {
    return {
      success: false,
      error: err.toString()
    };
  }
}


// --- MÓDULO DE REPOSITÓRIO CRONOLÓGICO INTELIGENTE (V2.0) ---

/**
 * Função utilitária interna para gerenciar a pasta raiz de arquivamento no Drive.
 * Garante resiliência: se a pasta não existir, ela é criada automaticamente.
 */
function obterPastaRepositorioSigma_() {
  const nomePasta = "SIGMA_REPOSITORIO_HISTORICO_FROTAS";
  const pastas = DriveApp.getFoldersByName(nomePasta);
  if (pastas.hasNext()) {
    return pastas.next();
  } else {
    return DriveApp.createFolder(nomePasta);
  }
}

/**
 * Registra o laudo gerado no repositório digital e na trilha de auditoria cronológica.
 * Projetado para suportar isolamento por Frota/Placa e ID de Usuário (v2.0).
 */
function arquivarLaudoNoRepositorio(placaVeiculo, tipoRelatorio, resumoSintoma, base64Pdf, userId) {
  try {
    const pastaRaiz = obterPastaRepositorioSigma_();
    const dataHora = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd_HH-mm-ss");
    const dataFormatada = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd/MM/yyyy HH:mm:ss");
    
    // Tratamento de segurança para identificadores
    const placaClean = (placaVeiculo || "GERAL").replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
    const usuarioClean = userId || "USER_DEFAULT";
    const tipoClean = tipoRelatorio || "ORDEM_INSPECAO";
    
    // 1. Criação do Nome Padronizado do Arquivo (Padrão Biblioteconômico de Recuperação)
    // Ex: [EEQ9C28]_[2026-08-17_23-50-00]_[ORDEM_INSPECAO].pdf
    const nomeArquivo = `[${placaClean}]_[${dataHora}]_[${tipoClean}].pdf`;
    
    // 2. Conversão do Base64 em Blob e Gravação no Google Drive
    const blob = Utilities.newBlob(Utilities.base64Decode(base64Pdf), MimeType.PDF, nomeArquivo);
    const arquivoSalvo = pastaRaiz.createFile(blob);
    const urlArquivo = arquivoSalvo.getUrl();
    
    // 3. Indexação Relacional na Planilha (Smart Log / Trilha de Auditoria)
    // Tenta gravar em uma aba dedicada "HISTORICO_LAUDOS". Se ela não existir, o sistema cria dinamicamente.
    const ss = SpreadsheetApp.getActiveSpreadsheet() || getSpreadsheet();
    let abaHistorico = ss.getSheetByName("HISTORICO_LAUDOS");
    
    if (!abaHistorico) {
      abaHistorico = ss.insertSheet("HISTORICO_LAUDOS");
      // Cabeçalho profissional preparado para Múltiplas Frotas e Múltiplos Usuários (v2.0)
      abaHistorico.appendRow([
        "TIMESTAMP", 
        "PLACA_ATIVO", 
        "TIPO_DOCUMENTO", 
        "USUARIO_RESPONSAVEL", 
        "RESUMO_DIAGNOSTICO", 
        "LINK_DIRETO_DRIVE"
      ]);
      // Formatação visual do cabeçalho
      abaHistorico.getRange("A1:F1").setFontWeight("bold").setBackground("#e2e8f0");
    }
    
    // Insere a nova linha cronológica no topo (logo abaixo do cabeçalho) para consulta rápida
    abaHistorico.insertRowAfter(1);
    abaHistorico.getRange(2, 1, 1, 6).setValues([[
      dataFormatada,
      placaClean,
      tipoClean,
      usuarioClean,
      resumoSintoma || "Sem resumo declarado",
      urlArquivo
    ]]);
    
    return { status: "sucesso", url: urlArquivo };
    
  } catch (e) {
    console.error("Erro no arquivamento cronológico: " + e.message);
    // Retorna falha silenciosa para não travar o fluxo principal do usuário
    return { status: "erro", mensagem: e.message };
  }
}


/**
 * CONSULTA INTELIGENTE DE FICHA TÉCNICA VIA GEMINI IA (OU FALLBACK HEURÍSTICO)
 */
function consultarFichaTecnicaVeiculoIA(marca, modelo, ano) {
  try {
    const apiKey = PropertiesService.getScriptProperties().getProperty("GEMINI_API_KEY") || DEFAULT_GEMINI_KEY || '';
    const cleanMarca = String(marca || '').trim();
    const cleanModelo = String(modelo || '').trim();
    const cleanAno = String(ano || '2020').trim();

    if (!cleanMarca || !cleanModelo) {
      return { success: false, message: 'Informe a marca e o modelo do veículo para consulta.' };
    }

    if (apiKey) {
      const prompt = "Você é o Engenheiro Especialista Chefe em Fichas Técnicas Automotivas OEM do SIGMA CMMS.\n" +
        "Identifique com máxima precisão técnica de montadora os dados do seguinte veículo:\n" +
        "- Marca: " + cleanMarca + "\n" +
        "- Modelo: " + cleanModelo + "\n" +
        "- Ano de Fabricação/Modelo: " + cleanAno + "\n\n" +
        "Retorne ESTRITAMENTE um objeto JSON válido (sem blocos markdown) com o seguinte formato:\n" +
        "{\n" +
        '  "motorizacao": "Ex: 2.0 16V EW10A (ou código OEM exato)",\n' +
        '  "combustivel": "FLEX | GASOLINA | DIESEL | ELETRICO | HIBRIDO",\n' +
        '  "transmissao": "Automático | Manual | CVT | Automatizado | Dupla Embreagem",\n' +
        '  "tipoDistribuicao": "Correia Dentada | Corrente de Distribuição | Correia Banhada a Óleo | Engrenagens | 100% Elétrico",\n' +
        '  "capacidadeOleo": "Ex: 4.25L 10W40",\n' +
        '  "observacaoTecnica": "Ex: Sincronismo do motor acionado por correia dentada com intervalo de substituição estrito."\n' +
        "}";

      const url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" + apiKey;
      const payload = {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.1,
          responseMimeType: "application/json"
        }
      };

      const options = {
        method: "post",
        contentType: "application/json",
        payload: JSON.stringify(payload),
        muteHttpExceptions: true
      };

      const res = UrlFetchApp.fetch(url, options);
      if (res.getResponseCode() === 200) {
        const jsonRes = JSON.parse(res.getContentText());
        const rawText = jsonRes.candidates[0].content.parts[0].text;
        const cleanJson = rawText.replace(/```json/gi, '').replace(/```/gi, '').trim();
        const parsed = JSON.parse(cleanJson);
        return { success: true, data: parsed, fonte: 'GEMINI_AI' };
      }
    }
  } catch (err) {
    Logger.log('Aviso ao consultar Gemini para ficha técnica: ' + err.toString());
  }

  // Fallback heurístico de engenharia automotiva
  const mUpper = (String(modelo) + ' ' + String(marca)).toUpperCase();
  let motor = '1.6 16V';
  let dist = 'Correia Dentada';
  let trans = 'Manual';
  let comb = 'FLEX';

  if (mUpper.includes('C4') || mUpper.includes('PALLAS') || mUpper.includes('PICASSO') || mUpper.includes('307') || mUpper.includes('308') || mUpper.includes('408')) {
    motor = '2.0 16V EW10A';
    dist = 'Correia Dentada';
    trans = 'Automático';
    comb = 'FLEX';
  } else if (mUpper.includes('COROLLA') || mUpper.includes('CIVIC') || mUpper.includes('ETIOS') || mUpper.includes('YARIS')) {
    motor = '2.0 16V Dual VVT-i';
    dist = 'Corrente de Distribuição';
    trans = 'CVT';
    comb = 'FLEX';
  } else if (mUpper.includes('ONIX') || mUpper.includes('TRACKER') || mUpper.includes('MONTANA')) {
    motor = '1.0 Turbo CSS Prime';
    dist = 'Correia Banhada a Óleo';
    trans = 'Automático';
    comb = 'FLEX';
  } else if (mUpper.includes('DOLPHIN') || mUpper.includes('SEAL') || mUpper.includes('LEAF') || mUpper.includes('VOLVO EX30')) {
    motor = 'Motor Elétrico Síncrono';
    dist = '100% Elétrico';
    trans = 'Automático';
    comb = 'ELETRICO';
  }

  return {
    success: true,
    data: {
      motorizacao: motor,
      combustivel: comb,
      transmissao: trans,
      tipoDistribuicao: dist,
      capacidadeOleo: '4.0L',
      observacaoTecnica: 'Ficha técnica identificada pela base determinística de engenharia.'
    },
    fonte: 'HEURISTICA_AUTOMOTIVA'
  };
}


/**
 * ROTINA DE HIDRATAÇÃO CANÔNICA DO BANCO DE DADOS (SIGMA CMMS)
 */
/**
 * ROTINA DE HIDRATAÇÃO CANÔNICA DE ALTA FIDELIDADE (SIGMA CMMS)
 */
/**
 * ROTINA DE HIDRATAÇÃO AUDITADA COM BASE NA DANFE NF-E 000.001.414 (SIGMA CMMS)
 */
function recomporBancoDadosCanonico() {
  const ss = getSpreadsheet();
  
  // 1. ATIVOS (Ano 2008/2009, 191.900 KM)
  const sheetAtivos = getOrCreateSheet(ss, SHEET_NAMES.ATIVOS);
  sheetAtivos.clear();
  sheetAtivos.appendRow(['ID', 'Marca', 'Modelo', 'AnoFabricacao', 'AnoModelo', 'Motorizacao', 'Combustivel', 'PlacaChassi', 'DataCadastro', 'KMInicial', 'KMAtual', 'DataUltimaAtualizacaoKM', 'RegimeUso', 'TipoTransmissao', 'TipoDistribuicao']);
  sheetAtivos.appendRow(['VEIC-001', 'CITROËN', 'C4 PALLAS', 2008, 2009, '2.0 16V EW10A', 'FLEX', 'EEQ-9C28', '2026-08-01', 191706, 191900, '2026-08-20', 'SEVERO_URBANO', 'Automático', 'Correia Dentada']);

  // 2. REGISTRO_OCORRENCIAS (Auditado com NF-e 000.001.414 FLORIPA CASA E CONSTRUCAO LTDA)
  const sheetLogs = getOrCreateSheet(ss, SHEET_NAMES.REGISTRO_OCORRENCIAS);
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

  // 3. PLANO_PRESCRITIVO (Exatamente os 8 Cards da Origem)
  const sheetPlano = getOrCreateSheet(ss, SHEET_NAMES.PLANO_PRESCRITIVO);
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

  return { success: true, message: 'Banco de dados 100% auditado e calibrado com a NF-e 000.001.414.' };
}


/**
 * MÓDULO CORPORATIVO DE GESTÃO DE OFICINAS - 12 CAMPOS OFICIAIS (SIGMA CMMS)
 */
function salvarOficina(dadosOficina) {
  var ss = getSpreadsheet();
  var aba = ss.getSheetByName("Oficinas") || ss.insertSheet("Oficinas");
  
  if (aba.getLastRow() === 0) {
    aba.appendRow([
      "ID_Oficina", "Nome_Fantasia", "Nome_Juridico", "CNPJ", "Endereco", 
      "Contato_Mensagens", "Contato_Celular", "Telefone_Fisico", "Emails", 
      "Tipo_Atendimento", "Mecanico_Responsavel", "Flag_Oficina_Base"
    ]);
  }
  
  var id = dadosOficina.id || dadosOficina.ID_Oficina || "OFI_" + new Date().getTime();
  var isBase = Boolean(dadosOficina.isBase === true || dadosOficina.isBase === "true" || dadosOficina.Flag_Oficina_Base === "TRUE" || dadosOficina.Flag_Oficina_Base === true);

  if (isBase) {
    desmarcarOutrasOficinasBase(aba);
  }
  
  var rowIndex = encontrarLinhaPorId(aba, id);
  var linhaDados = [
    id,
    dadosOficina.nomeFantasia || dadosOficina.Nome_Fantasia || "",
    dadosOficina.nomeJuridico || dadosOficina.Nome_Juridico || "",
    dadosOficina.cnpjh || dadosOficina.CNPJ || "",
    dadosOficina.endereco || dadosOficina.Endereco || "",
    dadosOficina.contatoMensagens || dadosOficina.Contato_Mensagens || "",
    dadosOficina.contatoCelular || dadosOficina.Contato_Celular || "",
    dadosOficina.telefoneFisico || dadosOficina.Telefone_Fisico || "",
    dadosOficina.emails || dadosOficina.Emails || "",
    dadosOficina.tipoAtendimento || dadosOficina.Tipo_Atendimento || "Mecânica Geral",
    dadosOficina.mecanicoResponsavel || dadosOficina.Mecanico_Responsavel || "",
    isBase ? "TRUE" : "FALSE"
  ];
  
  if (rowIndex > 0) {
    aba.getRange(rowIndex, 1, 1, linhaDados.length).setValues([linhaDados]);
  } else {
    aba.appendRow(linhaDados);
  }
  
  return { status: "sucesso", id: id, mensagem: "Oficina salva com sucesso." };
}

function getOficinas() {
  var ss = getSpreadsheet();
  var aba = ss.getSheetByName("Oficinas");
  if (!aba || aba.getLastRow() <= 1) {
    if (!aba) aba = ss.insertSheet("Oficinas");
    aba.clear();
    aba.appendRow([
      "ID_Oficina", "Nome_Fantasia", "Nome_Juridico", "CNPJ", "Endereco", 
      "Contato_Mensagens", "Contato_Celular", "Telefone_Fisico", "Emails", 
      "Tipo_Atendimento", "Mecanico_Responsavel", "Flag_Oficina_Base"
    ]);
    aba.appendRow([
      "OFI_001", "Oficina Mecânica Precision Auto", "Precision Manutenções Automotivas LTDA", "12.345.678/0001-90",
      "Av. Principal, 1500 - São Paulo, SP", "5511987654321", "(11) 98765-4321", "(11) 3456-7890", "contato@precisionauto.com.br",
      "Mecânica Geral / Injeção", "Carlos Silva (Chefe de Oficina)", "TRUE"
    ]);
    aba.appendRow([
      "OFI_002", "FLORIPA CASA E CONSTRUCAO LTDA", "Floripa Casa e Construção LTDA", "59.997.717/0001-00",
      "Estrada Vereador Onildo Lemos, 728 - Florianópolis, SC", "5548996720566", "(48) 99672-0566", "(48) 3269-1000", "fiscal@floripacasa.com.br",
      "Fornecedor de Peças / Insumos", "Central de Vendas", "FALSE"
    ]);
  }
  
  var dados = aba.getDataRange().getValues();
  var lista = [];
  for (var i = 1; i < dados.length; i++) {
    if (dados[i][0]) {
      lista.push({
        id: String(dados[i][0]),
        ID_Oficina: String(dados[i][0]),
        nomeFantasia: String(dados[i][1] || ""),
        Nome_Fantasia: String(dados[i][1] || ""),
        nomeJuridico: String(dados[i][2] || ""),
        Nome_Juridico: String(dados[i][2] || ""),
        cnpjh: String(dados[i][3] || ""),
        CNPJ: String(dados[i][3] || ""),
        endereco: String(dados[i][4] || ""),
        Endereco: String(dados[i][4] || ""),
        contatoMensagens: String(dados[i][5] || ""),
        Contato_Mensagens: String(dados[i][5] || ""),
        contatoCelular: String(dados[i][6] || ""),
        Contato_Celular: String(dados[i][6] || ""),
        telefoneFisico: String(dados[i][7] || ""),
        Telefone_Fisico: String(dados[i][7] || ""),
        emails: String(dados[i][8] || ""),
        Emails: String(dados[i][8] || ""),
        tipoAtendimento: String(dados[i][9] || ""),
        Tipo_Atendimento: String(dados[i][9] || ""),
        mecanicoResponsavel: String(dados[i][10] || ""),
        Mecanico_Responsavel: String(dados[i][10] || ""),
        isBase: String(dados[i][11]).toUpperCase() === "TRUE",
        Flag_Oficina_Base: String(dados[i][11]).toUpperCase() === "TRUE"
      });
    }
  }
  return lista;
}

function excluirOficina(idOficina) {
  var ss = getSpreadsheet();
  var aba = ss.getSheetByName("Oficinas");
  if (!aba) return { status: "erro", mensagem: "Aba não encontrada." };
  var rowIndex = encontrarLinhaPorId(aba, idOficina);
  if (rowIndex > 0) {
    aba.deleteRow(rowIndex);
    return { status: "sucesso", mensagem: "Oficina excluída com sucesso." };
  }
  return { status: "erro", mensagem: "Oficina não encontrada." };
}

function definirOficinaBaseOficial(idOficina) {
  var ss = getSpreadsheet();
  var aba = ss.getSheetByName("Oficinas") || ss.insertSheet("Oficinas");
  desmarcarOutrasOficinasBase(aba);
  var rowIndex = encontrarLinhaPorId(aba, idOficina);
  if (rowIndex > 0) {
    aba.getRange(rowIndex, 12).setValue("TRUE");
    return { status: "sucesso", mensagem: "Oficina base definida com sucesso." };
  }
  return { status: "erro", mensagem: "Oficina não encontrada." };
}

function desmarcarOutrasOficinasBase(aba) {
  var dados = aba.getDataRange().getValues();
  for (var i = 1; i < dados.length; i++) {
    aba.getRange(i + 1, 12).setValue("FALSE");
  }
}

function encontrarLinhaPorId(aba, id) {
  var dados = aba.getDataRange().getValues();
  for (var i = 1; i < dados.length; i++) {
    if (String(dados[i][0]) === String(id)) return i + 1;
  }
  return -1;
}

function obterOficinaPorId(id) {
  var ss = getSpreadsheet();
  var aba = ss.getSheetByName("Oficinas");
  if (!aba) return null;
  var dados = aba.getDataRange().getValues();
  for (var i = 1; i < dados.length; i++) {
    if (String(dados[i][0]) === String(id)) {
      return {
        id: dados[i][0],
        nomeFantasia: dados[i][1],
        cnpjh: dados[i][3],
        contatoMensagens: dados[i][5],
        mecanicoResponsavel: dados[i][10]
      };
    }
  }
  return null;
}
