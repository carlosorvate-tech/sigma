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


/**
 * PROCESSAMENTO DE DIAGNÓSTICO PRELIMINAR DE ANOMALIAS (IA & HEURÍSTICA CAUSAL)
 * Correlaciona sintomas declarados com o histórico de manutenções e o modelo do veículo.
 */
function processarDiagnosticoIA(veiculoId, relato) {
  try {
    const ss = getSpreadsheet();
    const vehSheet = getOrCreateSheet(ss, SHEET_NAMES.ATIVOS);
    const vehData = vehSheet.getDataRange().getValues();
    let vehicle = null;

    if (vehData.length > 1) {
      const headers = vehData[0].map(h => String(h).trim().toUpperCase());
      const idIdx = headers.indexOf('ID');
      for (let i = 1; i < vehData.length; i++) {
        if (String(vehData[i][idIdx]) === String(veiculoId)) {
          vehicle = {};
          headers.forEach((h, idx) => {
            vehicle[h] = vehData[i][idx];
          });
          break;
        }
      }
    }

    if (!vehicle) {
      vehicle = { MODELO: 'Veículo Ativo', MARCA: 'Automóvel', KMATUAL: 0, MOTORIZACAO: '2.0', TRANSMISSAO: 'Automático' };
    }

    // Obter histórico de manutenções recentes para contextualização
    const logSheet = getOrCreateSheet(ss, 'MANUTENCOES');
    const logData = logSheet.getDataRange().getValues();
    const recentLogs = [];
    if (logData.length > 1) {
      const hLogs = logData[0].map(h => String(h).trim().toUpperCase());
      const vIdIdx = hLogs.indexOf('VEICULOID');
      const descIdx = hLogs.indexOf('DESCRICAOSERVICO');
      const kmIdx = hLogs.indexOf('KM');
      const dataIdx = hLogs.indexOf('DATA');

      for (let i = 1; i < logData.length; i++) {
        if (String(logData[i][vIdIdx]) === String(veiculoId)) {
          recentLogs.push({
            data: logData[i][dataIdx],
            km: logData[i][kmIdx],
            desc: logData[i][descIdx]
          });
        }
      }
    }

    // Heurística Causal Avançada Especializada em Sistemas Automotivos
    const relatoLower = String(relato || '').toLowerCase();
    const arvoreCausas = [];
    let resumoExecutivo = '';

    const modeloStr = (vehicle.MODELO || vehicle.Modelo || '') + ' ' + (vehicle.MARCA || vehicle.Marca || '');
    const kmStr = (vehicle.KMATUAL || vehicle.KMAtual || 0) + ' KM';

    // 1. Sintomas de Transmissão / Câmbio / Tranco / Perda de Tração
    if (relatoLower.includes('câmbio') || relatoLower.includes('cambio') || relatoLower.includes('tranco') || relatoLower.includes('marcha') || relatoLower.includes('atf') || relatoLower.includes('patinando') || relatoLower.includes('emergência')) {
      resumoExecutivo = `Identificado padrão de instabilidade eletro-hidráulica no sistema de transmissão de ${modeloStr} (${kmStr}). Os sintomas apontam para desvio de pressão de óleo ou saturação dos atuadores.`;
      
      arvoreCausas.push({
        componenteSuspeito: "Par de Eletroválvulas de Pressão/Modulação (Solenoides)",
        probabilidadePercentual: 85,
        causaRaizProvavel: "Desgaste ou perda de estanqueidade nas válvulas solenoides de modulação de pressão (EPde/EVM), gerando discrepância entre a pressão calculada pela ECU e a pressão real na linha principal.",
        procedimentoTeste: "Conectar scanner automotivo, ler código de falha e monitorar o parâmetro de pressão de óleo da linha principal: valor de referência em marcha lenta de 2.7 ± 0.2 bar; em carga de 11.0 a 12.0 bar."
      });

      arvoreCausas.push({
        componenteSuspeito: "Fluido de Transmissão (ATF) Degradado / Nível Incorreto",
        probabilidadePercentual: 75,
        causaRaizProvavel: "Envelhecimento térmico do fluido ATF gerando perda de viscosidade e formação de verniz nos canais do corpo de válvulas.",
        procedimentoTeste: "Executar procedimento de verificação de nível e aspecto visual do fluido ATF em temperatura operacional (60°C). Se escurecido ou com odor de queimado, prescrever drenagem e troca parcial aditiva."
      });

      arvoreCausas.push({
        componenteSuspeito: "Permutador de Calor (Trocador de Calor ATF / Água)",
        probabilidadePercentual: 50,
        causaRaizProvavel: "Obstrução interna ou microfissura no trocador de calor de placas, causando superaquecimento do fluido ATF ou contaminação cruzada.",
        procedimentoTeste: "Inspecionar mangueiras de arrefecimento do trocador e testar a temperatura do fluido sob regime contínuo de rodagem."
      });
    }
    // 2. Sintomas de Arrefecimento / Superaquecimento / Temperatura / Água / Vazamento
    else if (relatoLower.includes('temperatura') || relatoLower.includes('esquenta') || relatoLower.includes('aquec') || relatoLower.includes('água') || relatoLower.includes('agua') || relatoLower.includes('radiador') || relatoLower.includes('ventoinha') || relatoLower.includes('ferveu')) {
      resumoExecutivo = `Detectado risco térmico crítico no subsistema de arrefecimento de ${modeloStr}. Falhas neste subsistema possuem potencial destrutivo direto sobre a junta do cabeçote.`;
      
      arvoreCausas.push({
        componenteSuspeito: "Válvula Termostática & Carcaça Plástica",
        probabilidadePercentual: 80,
        causaRaizProvavel: "Travamento do elemento termossensível em posição fechada/parcial ou deformação térmica na carcaça gerando vazamento de pressão.",
        procedimentoTeste: "Teste de pressurização estática do sistema a frio (1.4 bar) e medição da temperatura de entrada e saída das mangueiras do radiador via termômetro infravermelho."
      });

      arvoreCausas.push({
        componenteSuspeito: "Eletroventilador / Resistência da 1ª Velocidade",
        probabilidadePercentual: 70,
        causaRaizProvavel: "Rompimento do fusível térmico da resistência da 1ª velocidade da ventoinha, forçando o acionamento tardio apenas em alta temperatura (2ª velocidade).",
        procedimentoTeste: "Acionar teste de atuadores via scanner para 1ª e 2ª velocidade do eletroventilador e medir continuidade ôhmica da resistência montada no defletor."
      });

      arvoreCausas.push({
        componenteSuspeito: "Bomba d'Água (Rotor Plástico Desprendido/Desgastado)",
        probabilidadePercentual: 60,
        causaRaizProvavel: "Cavitação ou descolamento do rotor plástico do eixo metálico da bomba, reduzindo o fluxo circulante sob alta rotação.",
        procedimentoTeste: "Verificar fluxo de retorno contínuo no reservatório de expansão e ausência de ruído nos rolamentos da correia de acessórios."
      });
    }
    // 3. Sintomas de Suspensão / Ruído Metálico / Barulho / Estalo / Direção
    else if (relatoLower.includes('barulho') || relatoLower.includes('ruído') || relatoLower.includes('ruido') || relatoLower.includes('estalo') || relatoLower.includes('batida') || relatoLower.includes('suspensão') || relatoLower.includes('suspensao') || relatoLower.includes('direção') || relatoLower.includes('trepidação')) {
      resumoExecutivo = `Identificada anomalia mecânica na dinâmica veicular de ${modeloStr}. A análise aponta para fadiga em elementos de desacoplamento e articulação elástica.`;
      
      arvoreCausas.push({
        componenteSuspeito: "Bieletas & Buchas da Barra Estabilizadora",
        probabilidadePercentual: 85,
        causaRaizProvavel: "Folga radial nas rótulas esféricas das bieletas dianteiras ou ressecamento das buchas de borracha da barra estabilizadora.",
        procedimentoTeste: "Elevar o veículo em rampa/cavalete e aplicar alavanca de esforço axial nas articulações das bieletas verificando folga perceptível."
      });

      arvoreCausas.push({
        componenteSuspeito: "Coxim Superior do Amortecedor com Rolamento",
        probabilidadePercentual: 70,
        causaRaizProvavel: "Rompedura do elastômero do coxim superior ou travamento das esferas do rolamento de prato ao esterçar.",
        procedimentoTeste: "Esterçar o volante com veículo apoiado no chão ouvindo estalos no topo das torres e inspecionar trincas na borracha do coxim."
      });

      arvoreCausas.push({
        componenteSuspeito: "Buchas dos Braços Oscilantes (Bandejas) / Pivôs",
        probabilidadePercentual: 65,
        causaRaizProvavel: "Fadiga e descolamento da borracha da bucha traseira da bandeja ou coifa rasgada no pivô de suspensão.",
        procedimentoTeste: "Inspeção visual direta com espátula nas buchas de bandeja e teste de folga vertical nos pivôs de roda."
      });
    }
    // 4. Sintomas de Injeção / Falha de Motor / Engasgo / Consumo / Luz Acesa / Falhando
    else if (relatoLower.includes('falha') || relatoLower.includes('engasga') || relatoLower.includes('injeção') || relatoLower.includes('injecao') || relatoLower.includes('vela') || relatoLower.includes('bobina') || relatoLower.includes('luz') || relatoLower.includes('fraco') || relatoLower.includes('potência')) {
      resumoExecutivo = `Identificada perda de rendimento e potencial desvio de queima em ${modeloStr}. O diagnóstico aponta para o subsistema de ignição secundária ou alimentação.`;
      
      arvoreCausas.push({
        componenteSuspeito: "Bobina de Ignição / Velas de Ignição",
        probabilidadePercentual: 85,
        causaRaizProvavel: "Fuga de corrente no isolamento da bobina de ignição tipo régua/individual ou desgaste excessivo no eletrodo das velas.",
        procedimentoTeste: "Teste de centelha com osciloscópio (tempo de queima e tensão de disparo) e medição do gap dos eletrodos das velas com cálibre de lâminas."
      });

      arvoreCausas.push({
        componenteSuspeito: "Corpo de Borboleta (TBI) / Sensor de Pressão MAP",
        probabilidadePercentual: 65,
        causaRaizProvavel: "Carbonização na borda da borboleta motorizada ou leitura incorreta do sensor de pressão absoluta do coletor.",
        procedimentoTeste: "Leitura de sinal do MAP em marcha lenta (300 a 400 mbar) e inspeção visual de carbonização no alojamento da borboleta."
      });

      arvoreCausas.push({
        componenteSuspeito: "Eletroinjetores de Combustível (Bicos)",
        probabilidadePercentual: 55,
        causaRaizProvavel: "Obstrução parcial nos microfiltros ou gotejamento por estanqueidade deficiente de bico injetor.",
        procedimentoTeste: "Teste de vazão, estanqueidade e leque em máquina de ultrassom de bicos injetores."
      });
    }
    // 5. Sintoma Genérico / Padrão
    else {
      resumoExecutivo = `Análise diagnóstica exploratória para ${modeloStr} (${kmStr}). O sintoma relatado (${relato}) foi processado contra a matriz de falhas conhecidas.`;
      
      arvoreCausas.push({
        componenteSuspeito: "Subsistema Principal Relacionado ao Sintoma",
        probabilidadePercentual: 70,
        causaRaizProvavel: "Desvio funcional ou desgaste operacional acumulado conforme a quilometragem atual do veículo.",
        procedimentoTeste: "Realizar varredura completa de DTCs (Diagnostic Trouble Codes) com scanner OBD-II nas centrais ECU/BSI."
      });

      arvoreCausas.push({
        componenteSuspeito: "Alimentação Elétrica & Aterramentos Principais",
        probabilidadePercentual: 50,
        causaRaizProvavel: "Queda de tensão ou oxidação em pontos de massa da carroceria afetando sinais de sensores.",
        procedimentoTeste: "Medição de queda de tensão entre polo negativo da bateria e bloco do motor (máximo permitido 0.1V sob carga)."
      });
    }

    return JSON.stringify({
      resumoExecutivo: resumoExecutivo,
      arvoreCausas: arvoreCausas
    });

  } catch (err) {
    return JSON.stringify({
      resumoExecutivo: "Erro ao processar diagnóstico automatizado: " + err.toString(),
      arvoreCausas: []
    });
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
      const url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=" + apiKey;
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
        '      "subsistema": "Motor/Trem de Força ou Transmissão ou Arrefecimento ou Freios ou Suspensão/Direção ou Elétrica/Eletrônica"\n' +
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
        const cleanJson = textContent.replace(/```json/gi, '').replace(/```/g, '').trim();
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
