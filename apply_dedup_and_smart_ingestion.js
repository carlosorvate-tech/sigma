const fs = require('fs');

// 1. BACKUP DE SEGURANÇA MANDATÓRIO
const backupDir = 'backups/checkpoint_v114_multivehicle_dedup_and_smart_text_ingestion';
if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
fs.copyFileSync('Code.gs', backupDir + '/Code.gs');
fs.copyFileSync('index.html', backupDir + '/index.html');
fs.copyFileSync('App.html', backupDir + '/App.html');

// 2. ATUALIZAR CODE.GS:
let codeGs = fs.readFileSync('Code.gs', 'utf8');

// 2.1. Deduplicação inteligente de veículos na leitura (getInitialData)
const dedupVehiclesBackend = `
function deduplicateVehiclesList(vehicles) {
  if (!Array.isArray(vehicles) || vehicles.length === 0) return [];
  const seenPlacas = new Map();
  const result = [];

  vehicles.forEach(v => {
    const placaRaw = String(v.PlacaChassi || v.placaChassi || v.Placa || v.placa || '').replace(/[^A-Z0-9]/gi, '').toUpperCase();
    const idRaw = String(v.ID || v.id || '').trim();
    const key = placaRaw || idRaw;
    if (!key) return;

    if (!seenPlacas.has(key)) {
      seenPlacas.set(key, v);
      result.push(v);
    } else {
      // Mesclar dados mantendo o mais completo
      const existing = seenPlacas.get(key);
      Object.assign(existing, v);
    }
  });

  return result;
}
`;

if (!codeGs.includes('function deduplicateVehiclesList(')) {
  codeGs = dedupVehiclesBackend + '\n' + codeGs;
}

codeGs = codeGs.replace(
  'let vehicles = parseSheetRows(sheetAtivos.getDataRange().getValues());',
  'let vehicles = deduplicateVehiclesList(parseSheetRows(sheetAtivos.getDataRange().getValues()));'
);

// 2.2. Ingestão Inteligente de Texto Multimodal (Separa Diretrizes de Ocorrências Realizadas)
const smartProcessPrescriptiveSource = `function processPrescriptiveSource(dadosIngestao, regimeArg, tipoFonteArg, dadosVeiculoArg) {
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

  const ss = SpreadsheetApp.getActiveSpreadsheet() || getSpreadsheet();
  let vPlaca = '';
  let vKmAtual = 0;

  // Busca os dados cadastrais reais do veículo ativo na planilha
  if (veiculoId) {
    try {
      const sheetAtivos = getOrCreateSheet(ss, SHEET_NAMES.ATIVOS);
      const ativosData = sheetAtivos.getDataRange().getValues();
      for (let i = 1; i < ativosData.length; i++) {
        if (String(ativosData[i][0]) === String(veiculoId) || String(ativosData[i][7]).replace(/[^A-Z0-9]/gi, '') === String(veiculoId).replace(/[^A-Z0-9]/gi, '')) {
          vPlaca = String(ativosData[i][7] || '').trim();
          vKmAtual = Number(ativosData[i][10] || 0);
          if (!dadosVeiculo) {
            dadosVeiculo = \`\${ativosData[i][1]} \${ativosData[i][2]} (Ano \${ativosData[i][3]}/\${ativosData[i][4]}) - Motor: \${ativosData[i][5]} - Placa: \${vPlaca} - KM: \${vKmAtual}\`;
          }
          break;
        }
      }
    } catch(e) {}
  }

  let extractedDirectives = [];
  let extractedExecutedLogs = [];

  const apiKey = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY') || DEFAULT_GEMINI_KEY;

  if (apiKey && (tipoFonte === 'AUTO' || tipoFonte === 'IA' || tipoFonte === 'TEXT' || tipoFonte === 'FILE')) {
    try {
      const prompt = \`Você é o Engenheiro Especialista Chefe em Manutenção Automotiva e Auditoria Forense do SIGMA CMMS.
Analise a entrada abaixo referente ao seguinte ativo veicular:
- Configuração do Veículo: \${dadosVeiculo || "Veículo Automotor"}
- Regime Operacional: \${regimeUso}
- Texto / Documento Fornecido:
"\${typeof payload === 'string' ? payload.slice(0, 15000) : JSON.stringify(payload)}"

TAREFA OBRIGATÓRIA:
1. Extraia o PLANO PRESCRITIVO COMPLETO do veículo com os INTERVALOS PERIÓDICOS NORMAIS DE FÁBRICA (ex: Óleo a cada 10.000 KM, Filtros a cada 10.000 ou 20.000 KM, Correia Dentada a cada 70.000 KM / 56.000 KM severo, Velas a cada 40.000 KM, Arrefecimento a cada 40.000 KM, Freios a cada 20.000 KM). NUNCA coloque a quilometragem atual do carro como intervalo periódico!
2. Identifique se o texto descreve MANUTENÇÕES JÁ REALIZADAS / EXECUTADAS NO PASSADO com suas respectivas quilometragens (ex: "trocado óleo aos 140000 km", "correia trocada com 130000", "revisão aos 142.000 km").

Retorne ESTRITAMENTE um objeto JSON puro no seguinte formato:
{
  "diretrizes": [
    {
      "intervencao": "Nome da Intervenção",
      "subsistema": "Motor/Trem de Força | Arrefecimento | Freios | Sincronismo / Motor | Ignição / Motor | Habitáculo / Climatização | Transmissão | Suspensão/Direção",
      "tipo": "PREVENTIVA",
      "intervalo_km": 10000,
      "intervalo_meses": 12,
      "especificacao_tecnica": "Norma técnica e especificação",
      "origem_fonte": "MANUAL_OEM_FABRICANTE",
      "texto_precaucao": "Justificativa técnica"
    }
  ],
  "ocorrenciasRealizadas": [
    {
      "subcausa": "Nome da intervenção executada",
      "subsistema": "Subsistema correspondente",
      "km": 140000,
      "data": "2026-08-10",
      "descricao": "Detalhes do serviço realizado e peças trocadas",
      "oficina": "Oficina Registrada"
    }
  ]
}\`;

      const url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" + apiKey;
      const res = UrlFetchApp.fetch(url, {
        method: "post",
        contentType: "application/json",
        payload: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.1, responseMimeType: "application/json" }
        }),
        muteHttpExceptions: true
      });

      if (res.getResponseCode() === 200) {
        const jsonRes = JSON.parse(res.getContentText());
        const rawText = jsonRes.candidates[0].content.parts[0].text.replace(/\\\`\\\`\\\`json/gi, '').replace(/\\\`\\\`\\\`/gi, '').trim();
        const parsed = JSON.parse(rawText);
        if (parsed.diretrizes && Array.isArray(parsed.diretrizes)) extractedDirectives = parsed.diretrizes;
        if (parsed.ocorrenciasRealizadas && Array.isArray(parsed.ocorrenciasRealizadas)) extractedExecutedLogs = parsed.ocorrenciasRealizadas;
      }
    } catch(e) {
      Logger.log("Erro no processamento Gemini de texto: " + e.toString());
    }
  }

  // Fallback se necessário
  if (!extractedDirectives || extractedDirectives.length === 0) {
    extractedDirectives = getDefaultOemPlanForVehicle(regimeUso);
  }

  // Gravar ocorrências realizadas identificadas na planilha REGISTRO_OCORRENCIAS
  if (extractedExecutedLogs && extractedExecutedLogs.length > 0) {
    try {
      const sheetLogs = getOrCreateSheet(ss, SHEET_NAMES.REGISTRO_OCORRENCIAS);
      extractedExecutedLogs.forEach(oc => {
        const idLog = 'LOG-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
        sheetLogs.appendRow([
          idLog,
          oc.data || new Date().toISOString().split('T')[0],
          Number(oc.km || vKmAtual),
          'PREVENTIVA',
          oc.subsistema || 'Motor/Trem de Força',
          oc.subcausa || 'Manutenção Preventiva Registrada',
          0, 0, 1.0,
          oc.oficina || 'Oficina Registrada',
          'DOC-' + Date.now().toString().slice(-4),
          '',
          oc.descricao || oc.subcausa,
          veiculoId,
          'Registro importado via ingestão de histórico'
        ]);
      });
    } catch(e) {
      Logger.log("Erro ao salvar logs executados: " + e.toString());
    }
  }

  return savePrescriptivePlan(veiculoId, extractedDirectives, modoMerge);
}`;

codeGs = codeGs.replace(/function processPrescriptiveSource\(dadosIngestao, regimeArg, tipoFonteArg, dadosVeiculoArg\)[\s\S]*?return savePrescriptivePlan\(veiculoId, extractedItems, modoMerge\);\s*\}/, smartProcessPrescriptiveSource);
fs.writeFileSync('Code.gs', codeGs, 'utf8');

// 3. ATUALIZAR INDEX.HTML E APP.HTML COM DEDUPLICAÇÃO DE VEÍCULOS POR PLACA
let html = fs.readFileSync('index.html', 'utf8');

const dedupFrontendVehicles = `
    function deduplicateVehicles(vList) {
      if (!Array.isArray(vList) || vList.length === 0) return [];
      const seen = new Map();
      const result = [];

      vList.forEach(v => {
        const placa = String(v.PlacaChassi || v.placaChassi || v.Placa || v.placa || '').replace(/[^A-Z0-9]/gi, '').toUpperCase();
        const id = String(v.ID || v.id || '').trim();
        const key = placa || id;
        if (!key) return;

        if (!seen.has(key)) {
          seen.set(key, v);
          result.push(v);
        } else {
          const existing = seen.get(key);
          Object.assign(existing, v);
        }
      });

      return result;
    }
`;

if (!html.includes('function deduplicateVehicles(')) {
  html = html.replace('function renderVehicleSelectors() {', dedupFrontendVehicles + '\n    function renderVehicleSelectors() {');
}

html = html.replace(
  'state.vehicles = data.vehicles;',
  'state.vehicles = deduplicateVehicles(data.vehicles);'
);

html = html.replace(
  'state.vehicles = parsed;',
  'state.vehicles = deduplicateVehicles(parsed);'
);

fs.writeFileSync('index.html', html, 'utf8');
fs.writeFileSync('App.html', html, 'utf8');
console.log('✅ Deduplicação por placa e ingestão inteligente com reconhecimento de manutenções executadas aplicadas!');
