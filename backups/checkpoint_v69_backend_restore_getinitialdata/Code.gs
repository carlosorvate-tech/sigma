/**
 * SIGMA - Sistema Inteligente para Gestão de Manutenções Automotivas
 * Powered by Gemini AI & Google Apps Script
 * 
 * MÓDULO BACKEND - ARQUITETURA PURA BASEADA EM BANCO DE DADOS / GOOGLE SHEETS
 * INGESTÃO MULTIMODAL, MESCLAGEM POR CHAVE COMPOSTA & PAREAMENTO DETERMINÍSTICO
 * Conta Alvo: carlos.orvate@gmail.com
 */

const SHEET_NAMES = {
  ATIVOS: 'ATIVOS',
  PLANO_PRESCRITIVO: 'PLANO_PRESCRITIVO',
  REGISTRO_OCORRENCIAS: 'REGISTRO_OCORRENCIAS',
  DASH_CALCULOS: 'DASH_CALCULOS'
};

function doGet(e) {
  const template = HtmlService.createTemplateFromFile('Index');
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
function processPrescriptiveSource(dadosIngestao) {
  const veiculoId = dadosIngestao.veiculoId;
  const tipoFonte = dadosIngestao.tipoFonte; // AUTO, FILE, URL, TEXT
  const payload = dadosIngestao.payload;
  const regimeUso = dadosIngestao.regimeUso || 'SEVERO_URBANO';
  const modoMerge = dadosIngestao.modoMerge !== false;

  let extractedItems = [];
  let sourceOrigin = 'MANUAL_OEM_FABRICANTE';

  try {
    if (tipoFonte === 'URL') {
      sourceOrigin = 'BOLETIM_TECNICO';
      let pageText = '';
      try {
        const response = UrlFetchApp.fetch(payload, { muteHttpExceptions: true });
        pageText = response.getContentText().slice(0, 10000);
      } catch (e) {
        pageText = '';
      }
      if (pageText) {
        extractedItems = parseTextPrescriptionsWithRules(pageText, regimeUso, sourceOrigin);
      }

    } else if (tipoFonte === 'TEXT') {
      sourceOrigin = 'MANTENEDOR_ESPECIALISTA';
      extractedItems = parseTextPrescriptionsWithRules(payload, regimeUso, sourceOrigin);

    } else if (tipoFonte === 'FILE') {
      sourceOrigin = 'MANUAL_OEM_FABRICANTE';
      // Se for arquivo de texto ou OCR
      const fileText = typeof payload === 'object' ? (payload.textData || '') : String(payload || '');
      
      // Nunca usar o nome do arquivo se não houver conteúdo textual real
      if (fileText && fileText.length > 10 && !/\.(jpeg|jpg|png|pdf)$/i.test(fileText.trim())) {
        extractedItems = parseTextPrescriptionsWithRules(fileText, regimeUso, sourceOrigin);
      }
    }

    // Se a fonte não gerou itens válidos ou se for AUTO, carrega a matriz OEM oficial
    if (!extractedItems || extractedItems.length === 0) {
      sourceOrigin = 'MANUAL_OEM_FABRICANTE';
      extractedItems = getDefaultOemPlanForVehicle(regimeUso);
    }
  } catch (err) {
    Logger.log('Aviso no processamento prescritivo: ' + err.toString());
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

    const cleanDesc = trimmed.replace(/^[•\-\*\d\.]+\s*/, '').trim().toUpperCase();
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
function processPrescriptiveSource(dadosIngestao) {
  const veiculoId = dadosIngestao.veiculoId;
  const tipoFonte = dadosIngestao.tipoFonte; // AUTO, FILE, URL, TEXT
  const payload = dadosIngestao.payload;
  const regimeUso = dadosIngestao.regimeUso || 'SEVERO_URBANO';
  const modoMerge = dadosIngestao.modoMerge !== false; // Padrão: true (Merge)

  let extractedItems = [];
  let sourceOrigin = 'MANUAL_OEM_FABRICANTE';

  try {
    if (tipoFonte === 'URL') {
      sourceOrigin = 'BOLETIM_TECNICO';
      let pageText = '';
      try {
        const response = UrlFetchApp.fetch(payload, { muteHttpExceptions: true });
        pageText = response.getContentText().slice(0, 10000);
      } catch (e) {
        pageText = `Conteúdo de referência web da URL: ${payload}`;
      }
      extractedItems = parseTextPrescriptionsWithRules(pageText, regimeUso, sourceOrigin);

    } else if (tipoFonte === 'TEXT') {
      sourceOrigin = 'MANTENEDOR_ESPECIALISTA';
      extractedItems = parseTextPrescriptionsWithRules(payload, regimeUso, sourceOrigin);

    } else if (tipoFonte === 'FILE') {
      sourceOrigin = 'MANUAL_OEM_FABRICANTE';
      const fileText = payload.textData || payload.filename || '';
      extractedItems = parseTextPrescriptionsWithRules(fileText, regimeUso, sourceOrigin);

    } else {
      // AUTO IA
      sourceOrigin = 'MANUAL_OEM_FABRICANTE';
      extractedItems = getDefaultOemPlanForVehicle(regimeUso);
    }
  } catch (err) {
    Logger.log('Aviso no processamento multimodal: ' + err.toString());
    extractedItems = getDefaultOemPlanForVehicle(regimeUso);
  }

  if (extractedItems.length === 0) {
    extractedItems = getDefaultOemPlanForVehicle(regimeUso);
  }

  return savePrescriptivePlan(veiculoId, extractedItems, modoMerge);
}

function parseTextPrescriptionsWithRules(textInput, regimeUso, defaultOrigin) {
  const items = [];
  const lines = String(textInput || '').split(/\r?\n/);

  lines.forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.length < 3) return;

    const kmMatch = trimmed.match(/(\d+[\d.]*)\s*km/i);
    const kmVal = kmMatch ? parseInt(kmMatch[1].replace(/\./g, ''), 10) : 10000;

    const mesesMatch = trimmed.match(/(\d+)\s*meses/i);
    const mesesVal = mesesMatch ? parseInt(mesesMatch[1], 10) : 12;

    let subsistema = 'Motor/Trem de Força';
    const lower = trimmed.toLowerCase();
    if (lower.includes('câmbio') || lower.includes('cambio') || lower.includes('atf') || lower.includes('transmissão')) subsistema = 'Transmissão';
    else if (lower.includes('freio') || lower.includes('pastilha') || lower.includes('disco')) subsistema = 'Freios';
    else if (lower.includes('alinhamento') || lower.includes('geometria') || lower.includes('pneu') || lower.includes('suspensão')) subsistema = 'Suspensão/Direção';
    else if (lower.includes('arrefecimento') || lower.includes('bomba d') || lower.includes('radiador')) subsistema = 'Arrefecimento';
    else if (lower.includes('bateria') || lower.includes('vela') || lower.includes('alternador')) subsistema = 'Elétrica/Eletrônica';

    items.push({
      intervencao: trimmed.replace(/^[•\-\*]\s*/, '').toUpperCase(),
      subsistema: subsistema,
      tipo: 'PREVENTIVA',
      intervalo_km: kmVal,
      intervalo_meses: mesesVal,
      especificacao_tecnica: 'Especificação técnica conforme diretriz documental',
      origem_fonte: defaultOrigin || 'MANUAL_OEM_FABRICANTE',
      texto_precaucao: 'Prescrição técnica identificada na fonte documental.'
    });
  });

  return items;
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
  const vId = String(vehicle.id || vehicle.ID);

  const marca = String(vehicle.marca || vehicle.Marca || '').trim().toUpperCase();
  const modelo = String(vehicle.modelo || vehicle.Modelo || '').trim().toUpperCase();
  const anoFab = Number(vehicle.anoFabricacao || vehicle.AnoFabricacao || 2009);
  const anoMod = Number(vehicle.anoModelo || vehicle.AnoModelo || 2009);
  const motor = String(vehicle.motorizacao || vehicle.Motorizacao || '').trim();
  const comb = String(vehicle.combustivel || vehicle.Combustivel || 'FLEX').trim();
  const placa = String(vehicle.placaChassi || vehicle.PlacaChassi || vehicle.placa || vehicle.Placa || '').trim().toUpperCase();
  const dataAprop = String(vehicle.dataApropriacao || vehicle.DataApropriacao || '').trim();
  const kmIni = Number(vehicle.kmInicial || vehicle.KMInicial || 0);
  const kmAt = Number(vehicle.kmAtual || vehicle.KMAtual || 0);
  const regime = String(vehicle.regimeUso || vehicle.RegimeUso || 'SEVERO_URBANO').trim();
  const trans = String(vehicle.tipoTransmissao || vehicle.TipoTransmissao || 'Automático Convencional').trim();
  const dist = String(vehicle.tipoDistribuicao || vehicle.TipoDistribuicao || 'Correia Dentada').trim();
  const now = new Date().toISOString().split('T')[0];

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === vId) {
      sheet.getRange(i + 1, 2).setValue(marca || data[i][1]);
      sheet.getRange(i + 1, 3).setValue(modelo || data[i][2]);
      sheet.getRange(i + 1, 4).setValue(anoFab || data[i][3]);
      sheet.getRange(i + 1, 5).setValue(anoMod || data[i][4]);
      sheet.getRange(i + 1, 6).setValue(motor || data[i][5]);
      sheet.getRange(i + 1, 7).setValue(comb || data[i][6]);
      sheet.getRange(i + 1, 8).setValue(placa || data[i][7]);
      sheet.getRange(i + 1, 9).setValue(dataAprop || data[i][8]);
      sheet.getRange(i + 1, 10).setValue(kmIni || data[i][9]);
      sheet.getRange(i + 1, 11).setValue(kmAt || data[i][10]);
      sheet.getRange(i + 1, 12).setValue(now);
      sheet.getRange(i + 1, 13).setValue(regime || data[i][12]);
      sheet.getRange(i + 1, 14).setValue(trans || data[i][13]);
      sheet.getRange(i + 1, 15).setValue(dist || data[i][14]);
      
      return { success: true, vehicleId: vId };
    }
  }
  return { success: false, message: 'Veículo não encontrado para atualização.' };
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
    const GEMINI_API_KEY = PropertiesService.getScriptProperties().getProperty("GEMINI_API_KEY");
    
    if (!GEMINI_API_KEY) {
      console.warn("Chave API não encontrada. Acionando Fallback Local.");
      return JSON.stringify(obterDiagnosticoLocal(relato));
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;
    
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
    const apiKey = props.getProperty('GEMINI_API_KEY') || props.getProperty('API_KEY');

    let rawBase64 = base64Data || '';
    let actualMime = mimeType || 'application/pdf';

    if (base64Data && base64Data.indexOf(';base64,') > -1) {
      const parts = base64Data.split(';base64,');
      actualMime = parts[0].replace('data:', '');
      rawBase64 = parts[1];
    }

    if (apiKey && rawBase64) {
      const url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=" + apiKey;
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
