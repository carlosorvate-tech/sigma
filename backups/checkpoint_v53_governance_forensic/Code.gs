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

  const sortedLogs = [...rawLogs].sort((a, b) => {
    const valA = Number(a.ValorTotal || a.valorTotal || 0);
    const valB = Number(b.ValorTotal || b.valorTotal || 0);
    return valB - valA;
  });

  const registeredCanonicalItems = new Map();
  const seenLogKeys = new Set();
  const cleanedLogs = [];

  sortedLogs.forEach(log => {
    let placaClean = String(log.Placa || log.placa || '').replace(/[^A-Z0-9]/gi, '').toUpperCase();
    if (placaClean === 'EEQ9228') placaClean = 'EEQ9C28';

    const numDoc = String(log.NumeroOS || log.numeroOS || '').trim().toUpperCase();
    const dataStr = String(log.Data || log.data || '').trim();
    const km = String(log.KM || log.km || '');
    const logId = String(log.ID || log.id || '');

    let occKey = numDoc ? `${placaClean}_DOC_${numDoc}_${dataStr}` : `${placaClean}_EVT_${dataStr}_KM_${km}`;
    if (seenLogKeys.has(occKey)) {
      return;
    }

    const descText = log.DescricaoServico || log.Descricao || log.descricaoServico || '';
    const rawLines = descText.split('\n');

    const uniqueLines = [];
    let logCalculatedTotal = 0;

    rawLines.forEach(line => {
      if (!line.trim()) return;

      let itemDesc = line.replace(/^•\s*/, '');
      let itemPrice = 0;
      let itemCategory = 'Peça';

      const match = line.match(/•?\s*(.*?)\s*-\s*R\$\s*([\d.]+)\s*\((.*?)\)/);
      if (match) {
        itemDesc = match[1].trim();
        itemPrice = Number(match[2]);
        itemCategory = match[3].trim();
      } else {
        itemPrice = Number(log.ValorTotal || log.valorTotal || 0);
      }

      const canonicalKey = getCanonicalItemKey(itemDesc, itemPrice);

      if (canonicalKey && registeredCanonicalItems.has(canonicalKey)) {
        // Item duplicado ignorado entre ordens de serviço
      } else {
        if (canonicalKey) {
          registeredCanonicalItems.set(canonicalKey, { logId, desc: itemDesc, price: itemPrice });
        }
        uniqueLines.push(line.trim().startsWith('•') ? line.trim() : `• ${itemDesc} - R$ ${itemPrice.toFixed(2)} (${itemCategory})`);
        logCalculatedTotal += itemPrice;
      }
    });

    if (uniqueLines.length > 0) {
      seenLogKeys.add(occKey);
      
      const newLog = Object.assign({}, log, {
        Placa: placaClean,
        DescricaoServico: uniqueLines.join('\n'),
        ValorTotal: logCalculatedTotal > 0 ? logCalculatedTotal : Number(log.ValorTotal || 0)
      });
      cleanedLogs.push(newLog);
    }
  });

  return cleanedLogs.sort((a, b) => String(a.Data || '').localeCompare(String(b.Data || '')));
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
  const headers = matrix[0];
  const rows = matrix.slice(1);
  return rows.map(row => {
    const obj = {};
    headers.forEach((h, index) => {
      let val = row[index];
      if (val instanceof Date) {
        val = val.toISOString().split('T')[0];
      }
      obj[h] = val;
    });
    return obj;
  });
}

/**
 * PERSISTÊNCIA E MESCLAGEM POR CHAVE COMPOSTA (MERGE VS OVERWRITE)
 */
function savePrescriptivePlan(veiculoId, novosItens, modoMerge) {
  if (!veiculoId || !novosItens || !Array.isArray(novosItens)) {
    return { success: false, message: 'Dados inválidos para salvamento do plano prescritivo.' };
  }

  const ss = getSpreadsheet();
  const sheet = getOrCreateSheet(ss, SHEET_NAMES.PLANO_PRESCRITIVO);
  const matrix = sheet.getDataRange().getValues();
  const now = new Date().toISOString().split('T')[0];

  const headersPrescritivo = [
    'ID', 'VeiculoID', 'Intervencao', 'Subsistema', 'Tipo', 
    'IntervaloKM', 'IntervaloMeses', 'EspecificacaoTecnica', 
    'OrigemFonte', 'TextoPrecaucao', 'DataAtualizacao'
  ];

  if (matrix.length === 0) {
    sheet.getRange(1, 1, 1, headersPrescritivo.length)
      .setValues([headersPrescritivo])
      .setFontWeight('bold')
      .setBackground('#1e293b')
      .setFontColor('#ffffff');
  }

  const existingRows = matrix.length > 1 ? matrix.slice(1) : [];

  if (modoMerge === false) {
    // MODO OVERWRITE: Remover linhas antigas do veículo
    for (let i = matrix.length - 1; i >= 1; i--) {
      if (String(matrix[i][1]) === String(veiculoId)) {
        sheet.deleteRow(i + 1);
      }
    }

    // Inserir todos os novos itens
    novosItens.forEach(item => {
      const kmEstrito = Math.max(1, parseInt(item.intervalo_km || item.IntervaloKM || 10000, 10));
      const mesesEstritos = Math.max(1, parseInt(item.intervalo_meses || item.IntervaloMeses || 12, 10));
      const id = item.ID || item.id || ('PRES-' + Date.now() + '-' + Math.floor(Math.random()*1000));

      sheet.appendRow([
        id,
        veiculoId,
        item.intervencao || item.Intervencao || '',
        item.subsistema || item.Subsistema || 'Motor/Trem de Força',
        item.tipo || item.Tipo || 'PREVENTIVA',
        kmEstrito,
        mesesEstritos,
        item.especificacao_tecnica || item.EspecificacaoTecnica || '',
        item.origem_fonte || item.OrigemFonte || 'MANUAL_OEM_FABRICANTE',
        item.texto_precaucao || item.TextoPrecaucao || '',
        now
      ]);
    });
  } else {
    // MODO MERGE BLINDADO: Atualiza por chave composta única ou anexa novos
    const keyToRowIndex = new Map();
    for (let i = 1; i < matrix.length; i++) {
      if (String(matrix[i][1]) === String(veiculoId)) {
        const key = makeItemKey(matrix[i][3], matrix[i][2]); // subsistema, intervencao
        keyToRowIndex.set(key, i + 1);
      }
    }

    novosItens.forEach(item => {
      const interv = item.intervencao || item.Intervencao || '';
      const subsys = item.subsistema || item.Subsistema || 'Motor/Trem de Força';
      const key = makeItemKey(subsys, interv);

      const kmEstrito = Math.max(1, parseInt(item.intervalo_km || item.IntervaloKM || 10000, 10));
      const mesesEstritos = Math.max(1, parseInt(item.intervalo_meses || item.IntervaloMeses || 12, 10));
      const origem = item.origem_fonte || item.OrigemFonte || 'MANTENEDOR_ESPECIALISTA';
      const spec = item.especificacao_tecnica || item.EspecificacaoTecnica || '';
      const prec = item.texto_precaucao || item.TextoPrecaucao || '';
      const tipo = item.tipo || item.Tipo || 'PREVENTIVA';

      if (keyToRowIndex.has(key)) {
        const rowNum = keyToRowIndex.get(key);
        sheet.getRange(rowNum, 5).setValue(tipo);
        sheet.getRange(rowNum, 6).setValue(kmEstrito);
        sheet.getRange(rowNum, 7).setValue(mesesEstritos);
        sheet.getRange(rowNum, 8).setValue(spec);
        sheet.getRange(rowNum, 9).setValue(origem);
        sheet.getRange(rowNum, 10).setValue(prec);
        sheet.getRange(rowNum, 11).setValue(now);
      } else {
        const id = item.ID || item.id || ('PRES-' + Date.now() + '-' + Math.floor(Math.random()*1000));
        sheet.appendRow([
          id, veiculoId, interv, subsys, tipo,
          kmEstrito, mesesEstritos, spec, origem, prec, now
        ]);
      }
    });
  }

  return { success: true, message: 'Plano prescritivo sincronizado com sucesso.' };
}

/**
 * ADIÇÃO MANUAL DIRETA DE UMA DIRETRIZ PRESCRITIVA
 */
function addPrescriptiveItemManual(veiculoId, itemData) {
  if (!veiculoId || !itemData || !itemData.intervencao) {
    return { success: false, message: 'Dados inválidos para inclusão da diretriz.' };
  }

  const cleanItem = {
    intervencao: itemData.intervencao,
    subsistema: itemData.subsistema || 'Motor/Trem de Força',
    tipo: itemData.tipo || 'PREVENTIVA',
    intervalo_km: Math.max(1, parseInt(itemData.intervalo_km, 10)),
    intervalo_meses: Math.max(1, parseInt(itemData.intervalo_meses, 10)),
    especificacao_tecnica: itemData.especificacao_tecnica || '',
    origem_fonte: itemData.origem_fonte || 'MANTENEDOR_ESPECIALISTA',
    texto_precaucao: itemData.texto_precaucao || ''
  };

  return savePrescriptivePlan(veiculoId, [cleanItem], true);
}

/**
 * EXCLUSÃO INDIVIDUAL DE UMA DIRETRIZ PRESCRITIVA
 */
function deletePrescriptiveItem(veiculoId, itemId) {
  const ss = getSpreadsheet();
  const sheet = getOrCreateSheet(ss, SHEET_NAMES.PLANO_PRESCRITIVO);
  const matrix = sheet.getDataRange().getValues();

  for (let i = 1; i < matrix.length; i++) {
    if (String(matrix[i][1]) === String(veiculoId) && String(matrix[i][0]) === String(itemId)) {
      sheet.deleteRow(i + 1);
      return { success: true, message: 'Diretriz prescritiva removida com sucesso.' };
    }
  }

  return { success: false, message: 'Diretriz não localizada para exclusão.' };
}

/**
 * INGESTÃO MULTIMODAL COMPLETA VIA GEMINI (FILE, URL, TEXT, AUTO)
 */
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
  const id = 'VEIC-' + String(sheet.getLastRow()).padStart(3, '0');
  const now = new Date().toISOString().split('T')[0];
  const placa = String(vehicle.placaChassi || vehicle.placa || '').trim().toUpperCase();
  
  const row = [
    id, vehicle.marca || '', vehicle.modelo || '', 
    Number(vehicle.anoFabricacao || 2009), Number(vehicle.anoModelo || 2009),
    vehicle.motorizacao || '', vehicle.combustivel || 'FLEX', 
    placa, vehicle.dataApropriacao || '',
    Number(vehicle.kmInicial || 0), Number(vehicle.kmAtual || 0), now,
    vehicle.regimeUso || 'SEVERO_URBANO',
    vehicle.tipoTransmissao || 'Automático Convencional',
    vehicle.tipoDistribuicao || 'Correia Dentada'
  ];
  
  sheet.appendRow(row);
  return { success: true, vehicleId: id, placa: placa, data: row };
}

function updateVehicle(vehicle) {
  const ss = getSpreadsheet();
  const sheet = getOrCreateSheet(ss, SHEET_NAMES.ATIVOS);
  const data = sheet.getDataRange().getValues();
  const vId = String(vehicle.id || vehicle.ID);

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === vId) {
      const now = new Date().toISOString().split('T')[0];
      sheet.getRange(i + 1, 2).setValue(vehicle.marca || data[i][1]);
      sheet.getRange(i + 1, 3).setValue(vehicle.modelo || data[i][2]);
      sheet.getRange(i + 1, 4).setValue(Number(vehicle.anoFabricacao || data[i][3]));
      sheet.getRange(i + 1, 5).setValue(Number(vehicle.anoModelo || data[i][4]));
      sheet.getRange(i + 1, 6).setValue(vehicle.motorizacao || data[i][5]);
      sheet.getRange(i + 1, 7).setValue(vehicle.combustivel || data[i][6]);
      sheet.getRange(i + 1, 8).setValue(String(vehicle.placaChassi || vehicle.placa || data[i][7]).toUpperCase());
      sheet.getRange(i + 1, 9).setValue(vehicle.dataApropriacao || '');
      sheet.getRange(i + 1, 10).setValue(Number(vehicle.kmInicial || data[i][9]));
      sheet.getRange(i + 1, 11).setValue(Number(vehicle.kmAtual || data[i][10]));
      sheet.getRange(i + 1, 12).setValue(now);
      sheet.getRange(i + 1, 13).setValue(vehicle.regimeUso || data[i][12]);
      sheet.getRange(i + 1, 14).setValue(vehicle.tipoTransmissao || data[i][13]);
      sheet.getRange(i + 1, 15).setValue(vehicle.tipoDistribuicao || data[i][14]);
      
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
      sheet.getRange(i + 1, 8).setValue(logData.descricaoServico || data[i][7]);
      sheet.getRange(i + 1, 9).setValue(Number(logData.valorTotal || data[i][8]));
      sheet.getRange(i + 1, 10).setValue(logData.oficinaNome || data[i][9]);
      sheet.getRange(i + 1, 11).setValue(logData.oficinaCNPJ || data[i][10]);
      sheet.getRange(i + 1, 12).setValue(logData.oficinaCidade || data[i][11]);
      sheet.getRange(i + 1, 13).setValue(logData.numeroOS || data[i][12]);
      
      cleanPhysicalSheetDuplicates();
      return { success: true, logId: lId };
    }
  }
  return { success: false, message: 'Ocorrência não encontrada para atualização.' };
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
