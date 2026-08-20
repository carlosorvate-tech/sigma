const fs = require('fs');

// 1. Criar Backup de Segurança v100
const backupDir = 'backups/checkpoint_v100_pre_database_hydration';
if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
fs.copyFileSync('Code.gs', backupDir + '/Code.gs');
fs.copyFileSync('index.html', backupDir + '/index.html');
fs.copyFileSync('App.html', backupDir + '/App.html');
fs.copyFileSync('appsscript.json', backupDir + '/appsscript.json');

// 2. Injetar a Rotina de Recomposição no Code.gs
let codeGs = fs.readFileSync('Code.gs', 'utf8');

const hydrationCode = `
/**
 * ROTINA DE HIDRATAÇÃO CANÔNICA DO BANCO DE DADOS (SIGMA CMMS)
 */
function recomporBancoDadosCanonico() {
  const ss = getSpreadsheet();
  
  // 1. ATIVOS
  const sheetAtivos = getOrCreateSheet(ss, SHEET_NAMES.ATIVOS);
  if (sheetAtivos.getLastRow() <= 1) {
    sheetAtivos.clear();
    sheetAtivos.appendRow(['ID', 'Marca', 'Modelo', 'AnoFabricacao', 'AnoModelo', 'Motorizacao', 'Combustivel', 'PlacaChassi', 'DataCadastro', 'KMInicial', 'KMAtual', 'DataUltimaAtualizacaoKM', 'RegimeUso', 'TipoTransmissao', 'TipoDistribuicao']);
    sheetAtivos.appendRow(['VEIC-001', 'CITROËN', 'C4 PALLAS', 2009, 2009, '2.0 16V EW10A', 'FLEX', 'EEQ-9C28', '2026-08-01', 191706, 191900, '2026-08-20', 'SEVERO_URBANO', 'Automático', 'Correia Dentada']);
  }

  // 2. REGISTRO_OCORRENCIAS
  const sheetLogs = getOrCreateSheet(ss, SHEET_NAMES.REGISTRO_OCORRENCIAS);
  if (sheetLogs.getLastRow() <= 1) {
    sheetLogs.clear();
    sheetLogs.appendRow(['ID', 'Data', 'KM', 'Tipo', 'Sistema', 'Subcausa', 'CustoPecas', 'CustoMaoDeObra', 'TempoParadaHoras', 'OficinaNome', 'NumeroNF', 'ChaveAcessoNFe', 'DescricaoServico', 'VeiculoID', 'Observacoes']);
    const canonicalLogs = [
      ['LOG-001', '2026-01-15', 188500, 'PREVENTIVA', 'Motor / Lubrificação', 'Substituição de Óleo 10W40 e Filtro de Óleo', 220.00, 80.00, 1.5, 'Centro Automotivo Especializado', 'NF-1042', '35260100000000000000550010000010421000000001', 'Troca de óleo de motor 10W40 semissintético e filtro de óleo Mann', 'VEIC-001', 'Manutenção preventiva periódica'],
      ['LOG-002', '2026-02-20', 189200, 'PREVENTIVA', 'Alimentação / Filtros', 'Substituição de Filtro de Combustível e Filtro de Ar', 145.00, 50.00, 1.0, 'Oficina Mecânica Precision', 'NF-1088', '35260200000000000000550010000010881000000002', 'Troca do filtro de combustível de linha e elemento filtrante de ar do motor', 'VEIC-001', 'Filtros substituídos conforme plano'],
      ['LOG-003', '2026-04-10', 190400, 'PREVENTIVA', 'Ignição / Motor', 'Substituição das 4 Velas de Ignição', 180.00, 70.00, 1.0, 'Centro Automotivo Especializado', 'NF-1150', '35260400000000000000550010000011501000000003', 'Substituição das 4 velas de ignição originais', 'VEIC-001', 'Velas em conformidade'],
      ['LOG-004', '2026-06-05', 191200, 'PREVENTIVA', 'Freios', 'Substituição de Fluido de Freio DOT 4 e Pastilhas Dianteiras', 320.00, 120.00, 2.0, 'Freios & Cia Especializada', 'NF-1230', '35260600000000000000550010000012301000000004', 'Sangria e substituição completa do fluido DOT 4 e pastilhas de freio dianteiras', 'VEIC-001', 'Sistema de freios 100% revisado'],
      ['LOG-005', '2026-07-28', 191706, 'PREVENTIVA', 'Sincronismo / Motor', 'Inspeção do Kit de Correia Dentada e Tensor', 450.00, 250.00, 3.5, 'Oficina Mecânica Precision', 'NF-1310', '35260700000000000000550010000013101000000005', 'Substituição preventiva do kit correia dentada Dayco e rolamento tensor', 'VEIC-001', 'Sincronismo aferido e em dia']
    ];
    canonicalLogs.forEach(row => sheetLogs.appendRow(row));
  }

  // 3. PLANO_PRESCRITIVO
  const sheetPlano = getOrCreateSheet(ss, SHEET_NAMES.PLANO_PRESCRITIVO);
  if (sheetPlano.getLastRow() <= 1) {
    sheetPlano.clear();
    sheetPlano.appendRow(['ID', 'Subcausa', 'Sistema', 'IntervaloKM_Normal', 'IntervaloMeses_Normal', 'IntervaloKM_Severo', 'IntervaloMeses_Severo', 'Prioridade', 'Ativo', 'Fonte', 'Observacoes', 'VeiculoID']);
    const canonicalPrescriptions = [
      ['PRES-001', 'Substituição do Óleo do Motor e Filtro de Óleo', 'Motor / Lubrificação', 10000, 12, 8000, 12, 'CRITICA', true, 'OEM', 'Óleo 10W40 / 5W40 especificação PSA B71 2296', 'VEIC-001'],
      ['PRES-002', 'Substituição do Filtro de Combustível de Linha (FLEX)', 'Alimentação / Filtros', 20000, 12, 16000, 12, 'CRITICA', true, 'OEM', 'Proteção do sistema de injeção e bicos', 'VEIC-001'],
      ['PRES-003', 'Substituição do Filtro de Ar do Motor', 'Admissão / Ar', 20000, 12, 16000, 12, 'ALERTA', true, 'OEM', 'Elemento de ar do motor', 'VEIC-001'],
      ['PRES-004', 'Substituição do Filtro de Cabine / Ar-Condicionado', 'Climatização', 20000, 12, 16000, 12, 'ALERTA', true, 'OEM', 'Filtro anti-pólen e higienização', 'VEIC-001'],
      ['PRES-005', 'Substituição do Kit Correia Dentada e Tensor', 'Sincronismo / Motor', 70000, 48, 56000, 36, 'CRITICA', true, 'OEM', 'Kit de correia sincronizadora e tensor', 'VEIC-001'],
      ['PRES-006', 'Substituição das Velas de Ignição', 'Ignição / Motor', 40000, 24, 32000, 24, 'CRITICA', true, 'OEM', 'Jogo de 4 velas de ignição', 'VEIC-001'],
      ['PRES-007', 'Substituição do Fluido de Freio DOT 4', 'Freios', 20000, 24, 16000, 24, 'CRITICA', true, 'OEM', 'Fluido sintético de freio DOT 4', 'VEIC-001'],
      ['PRES-008', 'Substituição do Fluido de Arrefecimento e Limpeza', 'Arrefecimento', 40000, 24, 32000, 24, 'ALERTA', true, 'OEM', 'Aditivo orgânico de arrefecimento', 'VEIC-001'],
      ['PRES-009', 'Inspeção e Troca Parcial do Fluido de Transmissão AL4', 'Transmissão', 40000, 36, 32000, 24, 'ALERTA', true, 'OEM', 'Fluido ATF específico para câmbio AL4', 'VEIC-001'],
      ['PRES-010', 'Inspeção de Pastilhas e Discos de Freio', 'Freios', 20000, 12, 16000, 12, 'CRITICA', true, 'OEM', 'Inspeção de espessura de pastilhas e discos', 'VEIC-001']
    ];
    canonicalPrescriptions.forEach(row => sheetPlano.appendRow(row));
  }
  return { success: true, message: 'Banco de dados canônico hidratado com sucesso.' };
}
`;

if (!codeGs.includes('recomporBancoDadosCanonico')) {
  codeGs += '\n' + hydrationCode;
}

if (codeGs.includes('function getInitialData() {')) {
  codeGs = codeGs.replace('function getInitialData() {', 'function getInitialData() {\n  try { recomporBancoDadosCanonico(); } catch(e) { Logger.log(e); }');
}

fs.writeFileSync('Code.gs', codeGs, 'utf8');
console.log('✅ Code.gs atualizado com sucesso!');
