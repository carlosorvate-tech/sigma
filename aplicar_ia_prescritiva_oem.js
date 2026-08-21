const fs = require('fs');

// 1. BACKUP DE SEGURANÇA MANDATÓRIO
const backupDir = 'backups/checkpoint_v106_ia_prescriptive_oem_engine';
if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
fs.copyFileSync('Code.gs', backupDir + '/Code.gs');
fs.copyFileSync('index.html', backupDir + '/index.html');
fs.copyFileSync('App.html', backupDir + '/App.html');

// 2. ATUALIZAR CODE.GS COM A IA PRESCRITIVA OEM BLINDADA
let codeGs = fs.readFileSync('Code.gs', 'utf8');

const iaPrescritivaEngine = `
/**
 * MOTOR DE GERAÇÃO PRESCRITIVA OEM AUTOMOTIVA VIA IA (GEMINI CORE + TRAVAS DE SEGURANÇA)
 */
function gerarPlanoPrescritivoOEMComIA(veiculoId, marca, modelo, ano, motorizacao, combustivel, transmissao, tipoDistribuicao, regimeUso) {
  try {
    const apiKey = PropertiesService.getScriptProperties().getProperty("GEMINI_API_KEY") || DEFAULT_GEMINI_KEY || '';
    const cleanMarca = String(marca || '').trim().toUpperCase();
    const cleanModelo = String(modelo || '').trim().toUpperCase();
    const cleanAno = String(ano || '2015').trim();
    const cleanMotor = String(motorizacao || 'Motor 2.0 16V').trim();
    const cleanTrans = String(transmissao || 'Manual').trim();
    const cleanDist = String(tipoDistribuicao || 'Correia Dentada').trim();
    const isSevero = String(regimeUso || '').toUpperCase().includes('SEVERO');

    if (apiKey && cleanMarca && cleanModelo) {
      const prompt = "Você é o Engenheiro Especialista Chefe em Manutenção Automotiva Preventiva e Prescritiva OEM do SIGMA CMMS.\\n" +
        "Gere a lista estrita de diretrizes de manutenção periódica recomendadas pela MONTADORA (OEM) para o seguinte veículo:\\n" +
        "- Marca: " + cleanMarca + "\\n" +
        "- Modelo: " + cleanModelo + "\\n" +
        "- Ano/Modelo: " + cleanAno + "\\n" +
        "- Motorização: " + cleanMotor + "\\n" +
        "- Combustível: " + combustivel + "\\n" +
        "- Transmissão: " + cleanTrans + "\\n" +
        "- Tipo de Distribuição: " + cleanDist + "\\n" +
        "- Regime de Uso: " + (isSevero ? "SEVERO URBANO (redução proporcional de intervalos)" : "NORMAL / RODOVIÁRIO") + "\\n\\n" +
        "Retorne ESTRITAMENTE um array JSON puro (sem markdown) contendo as diretrizes de manutenção periódica com os seguintes campos:\\n" +
        "[\\n" +
        "  {\\n" +
        '    "intervencao": "Nome da Intervenção (ex: Substituição do Óleo do Motor e Filtro)",\\n' +
        '    "subsistema": "Motor / Trem de Força | Arrefecimento | Freios | Sincronismo / Motor | Ignição / Motor | Habitáculo / Climatização | Transmissão / Câmbio | Suspensão / Direção",\\n' +
        '    "intervaloKm": 10000,\\n' +
        '    "intervaloMeses": 12,\\n' +
        '    "prioridade": "CRITICA | ALERTA",\\n' +
        '    "especificacao": "Norma técnica exata ou viscosidade (ex: Óleo 10W40 PSA B71 2296 / Fluido DOT 4 / Vela de Iridium)",\\n' +
        '    "origemFonte": "MANUAL_OEM_FABRICANTE",\\n' +
        '    "observacao": "Orientações técnicas e precauções de montadora"\\n' +
        "  }\\n" +
        "]";

      const url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" + apiKey;
      const payload = {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.1,
          responseMimeType: "application/json"
        }
      };

      const res = UrlFetchApp.fetch(url, {
        method: "post",
        contentType: "application/json",
        payload: JSON.stringify(payload),
        muteHttpExceptions: true
      });

      if (res.getResponseCode() === 200) {
        const jsonRes = JSON.parse(res.getContentText());
        const rawText = jsonRes.candidates[0].content.parts[0].text;
        const cleanJson = rawText.replace(/\`\`\`json/gi, '').replace(/\`\`\`/gi, '').trim();
        const parsedArray = JSON.parse(cleanJson);

        if (Array.isArray(parsedArray) && parsedArray.length > 0) {
          // APLICAR TRAVAS DE ENGENHARIA (Sanity Checks)
          const diretrizesValidadas = parsedArray.map(item => {
            let km = Number(item.intervaloKm || 10000);
            let meses = Number(item.intervaloMeses || 12);

            // Travas de segurança física
            if (item.subsistema === 'Motor / Trem de Força' && item.intervencao.toLowerCase().includes('óleo')) {
              if (km > 15000) km = isSevero ? 7500 : 10000;
              if (km < 5000) km = 5000;
            }
            if (cleanDist.includes('Corrente') && item.intervencao.toLowerCase().includes('correia dentada')) {
              km = 200000;
              item.intervencao = 'Inspeção da Corrente de Distribuição';
            }

            return {
              intervencao: item.intervencao,
              subsistema: item.subsistema || 'Motor / Trem de Força',
              intervaloKm: km,
              intervaloMeses: meses,
              prioridade: (item.prioridade || 'CRITICA').toUpperCase(),
              especificacao: item.especificacao || 'Conforme Manual do Fabricante',
              origemFonte: 'MANUAL_OEM_FABRICANTE',
              observacao: item.observacao || 'Diretriz técnica gerada com base no manual do veículo'
            };
          });

          return { success: true, diretrizes: diretrizesValidadas, fonte: 'GEMINI_OEM_AI' };
        }
      }
    }
  } catch(err) {
    Logger.log('Aviso ao consultar Gemini para Plano Prescritivo: ' + err.toString());
  }

  // FALLBACK DETERMINÍSTICO BLINDADO
  const fallback = [
    { intervencao: 'Substituição do Óleo do Motor e Filtro', subsistema: 'Motor / Trem de Força', intervaloKm: 10000, intervaloMeses: 12, prioridade: 'CRITICA', especificacao: 'Lubrificante Homologado Montadora', origemFonte: 'CATALOGO_CANONICO_SIGMA', observacao: 'Troca periódica do óleo e filtro' },
    { intervencao: 'Substituição do Filtro de Combustível de Linha', subsistema: 'Motor / Trem de Força', intervaloKm: 10000, intervaloMeses: 12, prioridade: 'CRITICA', especificacao: 'Elemento Filtrante de Linha', origemFonte: 'CATALOGO_CANONICO_SIGMA', observacao: 'Proteção dos bicos injetores' },
    { intervencao: 'Substituição do Filtro de Ar do Motor', subsistema: 'Motor / Trem de Força', intervaloKm: 10000, intervaloMeses: 12, prioridade: 'ALERTA', especificacao: 'Filtro de Ar Seco', origemFonte: 'CATALOGO_CANONICO_SIGMA', observacao: 'Eficiência de queima e admissão' },
    { intervencao: 'Substituição do Filtro de Cabine / Ar-Condicionado', subsistema: 'Habitáculo / Climatização', intervaloKm: 10000, intervaloMeses: 12, prioridade: 'ALERTA', especificacao: 'Filtro Anti-pólen', origemFonte: 'CATALOGO_CANONICO_SIGMA', observacao: 'Higienização e qualidade do ar' },
    { intervencao: 'Sistema de Arrefecimento Completo (Bomba, Válvula, Trocador)', subsistema: 'Arrefecimento', intervaloKm: 20000, intervaloMeses: 12, prioridade: 'CRITICA', especificacao: 'Fluido Orgânico Concentrado', origemFonte: 'CATALOGO_CANONICO_SIGMA', observacao: 'Prevenção de corrosão e superaquecimento' },
    { intervencao: 'Substituição Completa do Fluido de Freio (DOT 4)', subsistema: 'Freios', intervaloKm: 10000, intervaloMeses: 12, prioridade: 'CRITICA', especificacao: 'Fluido Sintético DOT 4', origemFonte: 'CATALOGO_CANONICO_SIGMA', observacao: 'Prevenção de vapor lock e umidade' },
    { intervencao: tipoDistribuicao && tipoDistribuicao.includes('Corrente') ? 'Inspeção da Corrente de Distribuição' : 'Substituição do Kit Correia Dentada e Tensor', subsistema: 'Sincronismo / Motor', intervaloKm: tipoDistribuicao && tipoDistribuicao.includes('Corrente') ? 200000 : 70000, intervaloMeses: 48, prioridade: 'CRITICA', especificacao: 'Kit de Sincronismo OEM', origemFonte: 'CATALOGO_CANONICO_SIGMA', observacao: 'Sincronismo mestre do motor' },
    { intervencao: 'Substituição das Velas de Ignição', subsistema: 'Ignição / Motor', intervaloKm: 40000, intervaloMeses: 24, prioridade: 'CRITICA', especificacao: 'Jogo de Velas Homologado', origemFonte: 'CATALOGO_CANONICO_SIGMA', observacao: 'Queima estequiométrica ideal' }
  ];

  return { success: true, diretrizes: fallback, fonte: 'CATALOGO_CANONICO_SIGMA' };
}
`;

if (!codeGs.includes('function gerarPlanoPrescritivoOEMComIA(')) {
  codeGs += '\n' + iaPrescritivaEngine;
} else {
  codeGs = codeGs.replace(/\/\*\*[\s\S]*?MOTOR DE GERAÇÃO PRESCRITIVA OEM AUTOMOTIVA[\s\S]*?return \{ success: true, diretrizes: fallback, fonte: 'CATALOGO_CANONICO_SIGMA' \};\s*\}/, iaPrescritivaEngine.trim());
}

// 2.2. Conectar addVehicle à IA Prescritiva OEM
const newAddVehicleComIA = `function addVehicle(vehicle) {
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

  // GERAÇÃO PERSONALIZADA DO PLANO OEM VIA IA COM TRAVAS DE SEGURANÇA
  try {
    const planoResultado = gerarPlanoPrescritivoOEMComIA(id, marca, modelo, anoMod, motor, comb, trans, dist, regime);
    const diretrizes = planoResultado.diretrizes || [];
    const sheetPlano = getOrCreateSheet(ss, SHEET_NAMES.PLANO_PRESCRITIVO);
    
    diretrizes.forEach((d, idx) => {
      sheetPlano.appendRow([
        'PRES-' + id + '-' + (idx + 1),
        d.intervencao,
        d.subsistema,
        d.intervaloKm,
        d.intervaloMeses,
        d.intervaloKm,
        d.intervaloMeses,
        d.prioridade,
        true,
        d.origemFonte || 'MANUAL_OEM_FABRICANTE',
        d.especificacao + ' - ' + (d.observacao || ''),
        id
      ]);
    });
  } catch(e) { 
    Logger.log('Erro ao gerar plano prescritivo com IA para ' + id + ': ' + e); 
  }

  return { success: true, vehicleId: id, placa: placa, data: row };
}`;

codeGs = codeGs.replace(/function addVehicle\(vehicle\)[\s\S]*?return \{ success: true, vehicleId: id, placa: placa, data: row \};\s*\}/, newAddVehicleComIA);
fs.writeFileSync('Code.gs', codeGs, 'utf8');

console.log('✅ Motor de Inteligência Prescritiva OEM conectado ao cadastro de veículos!');
