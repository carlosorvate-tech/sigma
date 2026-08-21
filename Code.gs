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
  if (e && e.parameter) {
    if (e.parameter.debug === 'db') {
      var data = getInitialData();
      return ContentService.createTextOutput(JSON.stringify(data, null, 2)).setMimeType(ContentService.MimeType.JSON);
    }
    if (e.parameter.teste === 'ia') {
      var res = consultarGeminiSigma('Responda exatamente: Conexão corporativa estabelecida com sucesso.', {ativo: 'Infinitus-Core-Test'});
      return HtmlService.createHtmlOutput('<h2>Status da IA Corporativa (Gemini Pro)</h2><pre>' + JSON.stringify(res, null, 2) + '</pre>');
    }
  }
  return HtmlService.createHtmlOutputFromFile('index');
}


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
      const prompt = "Você é o Engenheiro Especialista Chefe em Manutenção Automotiva Preventiva e Prescritiva OEM do SIGMA CMMS.\n" +
        "Gere a lista estrita de diretrizes de manutenção periódica recomendadas pela MONTADORA (OEM) para o seguinte veículo:\n" +
        "- Marca: " + cleanMarca + "\n" +
        "- Modelo: " + cleanModelo + "\n" +
        "- Ano/Modelo: " + cleanAno + "\n" +
        "- Motorização: " + cleanMotor + "\n" +
        "- Combustível: " + combustivel + "\n" +
        "- Transmissão: " + cleanTrans + "\n" +
        "- Tipo de Distribuição: " + cleanDist + "\n" +
        "- Regime de Uso: " + (isSevero ? "SEVERO URBANO (redução proporcional de intervalos)" : "NORMAL / RODOVIÁRIO") + "\n\n" +
        "Retorne ESTRITAMENTE um array JSON puro (sem markdown) contendo as diretrizes de manutenção periódica com os seguintes campos:\n" +
        "[\n" +
        "  {\n" +
        '    "intervencao": "Nome da Intervenção (ex: Substituição do Óleo do Motor e Filtro)",\n' +
        '    "subsistema": "Motor / Trem de Força | Arrefecimento | Freios | Sincronismo / Motor | Ignição / Motor | Habitáculo / Climatização | Transmissão / Câmbio | Suspensão / Direção",\n' +
        '    "intervaloKm": 10000,\n' +
        '    "intervaloMeses": 12,\n' +
        '    "prioridade": "CRITICA | ALERTA",\n' +
        '    "especificacao": "Norma técnica exata ou viscosidade (ex: Óleo 10W40 PSA B71 2296 / Fluido DOT 4 / Vela de Iridium)",\n' +
        '    "origemFonte": "MANUAL_OEM_FABRICANTE",\n' +
        '    "observacao": "Orientações técnicas e precauções de montadora"\n' +
        "  }\n" +
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
        const cleanJson = rawText.replace(/```json/gi, '').replace(/```/gi, '').trim();
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


/**
 * REGISTRO DE PARECER TÉCNICO / LAUDO DE INSPEÇÃO PREVENTIVA (SIGMA CMMS)
 */
function saveParecerTecnicoInspecao(parecerData) {
  try {
    const ss = getSpreadsheet();
    const sheetLog = getOrCreateSheet(ss, SHEET_NAMES.REGISTRO_OCORRENCIAS);
    
    const id = 'LOG-PAR-' + Date.now();
    const vId = parecerData.veiculoId || 'VEIC-001';
    const placa = parecerData.placa || '';
    const data = parecerData.dataInspecao || new Date().toISOString().split('T')[0];
    const km = Number(parecerData.kmAtual || 0);
    const tipo = 'PREVENTIVA';
    const sub = parecerData.subsistema || 'Motor/Trem de Força';
    const itemNombre = parecerData.itemNombre || 'Inspeção Técnica';
    const oficina = parecerData.oficinaNome || 'Oficina Credenciada';
    const laudo = parecerData.parecerTexto || 'Parecer Técnico de Inspeção Presencial';
    const desc = '[PARECER TÉCNICO / LAUDO]: ' + laudo + ' (Avaliador: ' + oficina + ')';

    sheetLog.appendRow([
      id, data, km, tipo, sub, itemNombre, 0, 0, 0.5,
      oficina, 'LAUDO-' + Date.now().toString().slice(-4), '',
      desc, vId, 'Inspeção física presencial homologada'
    ]);

    return { 
      success: true, 
      message: 'Parecer Técnico de Inspeção registrado com sucesso no histórico do ativo!' 
    };
  } catch(e) {
    Logger.log('Erro ao salvar parecer técnico: ' + e.toString());
    return { success: false, message: 'Erro ao registrar parecer: ' + e.toString() };
  }
}


/**
 * ENDPOINTS DE SUPORTE À INGESTÃO MULTIMODAL E GESTÃO TÉCNICA (SIGMA CMMS)
 */
function diagnosticarProblemaComIA(relato, dadosVeiculo) {
  const vId = typeof dadosVeiculo === 'object' && dadosVeiculo !== null ? (dadosVeiculo.id || dadosVeiculo.ID || 'VEIC-001') : String(dadosVeiculo || 'VEIC-001');
  return processarDiagnosticoIA(vId, relato);
}

function deletePrescriptiveItem(veiculoId, itemId) {
  try {
    const ss = getSpreadsheet();
    const sheet = getOrCreateSheet(ss, SHEET_NAMES.PLANO_PRESCRITIVO);
    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][0]) === String(itemId) || String(data[i][1]) === String(itemId) || String(data[i][2]) === String(itemId)) {
        sheet.deleteRow(i + 1);
        return { success: true, message: 'Diretriz prescritiva excluída com sucesso da base de dados.' };
      }
    }
    return { success: true, message: 'Item removido do plano ativo.' };
  } catch(e) {
    Logger.log('Erro ao excluir item prescritivo: ' + e.toString());
    return { success: false, message: 'Erro ao excluir item: ' + e.toString() };
  }
}

function arquivarDossieCronologico(dossiePayload) {
  try {
    if (typeof dossiePayload === 'object' && dossiePayload !== null) {
      return arquivarLaudoNoRepositorio(
        dossiePayload.placa || dossiePayload.placaVeiculo || 'EEQ-9C28',
        dossiePayload.tipo || dossiePayload.tipoRelatorio || 'DOSSIE_TECNICO',
        dossiePayload.resumo || dossiePayload.resumoSintoma || 'Dossiê Técnico Consolidado',
        dossiePayload.base64Pdf || dossiePayload.pdf || '',
        dossiePayload.usuario || dossiePayload.userId || 'SIGMA_OPERATOR'
      );
    }
    return { status: "sucesso", url: "#" };
  } catch(e) {
    Logger.log('Erro ao arquivar dossiê: ' + e.toString());
    return { status: "erro", mensagem: e.toString() };
  }
}
