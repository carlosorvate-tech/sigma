/**
 * SIGMA - Sistema Inteligente para Gestão de Manutenções Automotivas
 * Powered by Gemini AI & Google Apps Script
 * 
 * MÓDULO BACKEND - ARQUITETURA PURA BASEADA EM BANCO DE DADOS / GOOGLE SHEETS
 * MÓDULO DE DEDUPLICAÇÃO ALGORÍTMICA DE ITENS E INTEGRIDADE FINANCEIRA (V27.0)
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
      .addMetaTag('viewport', 'width=device-width, initial-scale=1.0')
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

  cleanPhysicalSheetDuplicates();
  return { success: true, message: 'Estrutura de tabelas da planilha inicializada com sucesso.' };
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
        Logger.log(`SIGMA Deduplicador: Item duplicado ignorado: "${itemDesc}" (${canonicalKey})`);
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

  const sheetOcorrencias = getOrCreateSheet(ss, SHEET_NAMES.REGISTRO_OCORRENCIAS);
  const rawLogs = parseSheetRows(sheetOcorrencias.getDataRange().getValues());
  const logs = deduplicateLogsAndItems(rawLogs);

  return {
    vehicles: vehicles,
    prescriptivePlans: [],
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

  // Deletar também os registros de ocorrências vinculados no banco físico
  const sheetOcorrencias = getOrCreateSheet(ss, SHEET_NAMES.REGISTRO_OCORRENCIAS);
  const dataOcorrencias = sheetOcorrencias.getDataRange().getValues();
  for (let i = dataOcorrencias.length - 1; i >= 1; i--) {
    if (String(dataOcorrencias[i][1]) === String(vehicleId)) {
      sheetOcorrencias.deleteRow(i + 1);
    }
  }

  if (found) {
    return { success: true, message: 'Veículo e históricos excluídos com sucesso do banco de dados.' };
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
