const fs = require('fs');

// 1. BACKUP DE SEGURANÇA MANDATÓRIO
const backupDir = 'backups/checkpoint_v109_velas_correia_logs_match_fix';
if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
fs.copyFileSync('Code.gs', backupDir + '/Code.gs');
fs.copyFileSync('index.html', backupDir + '/index.html');
fs.copyFileSync('App.html', backupDir + '/App.html');

// 2. ATUALIZAR CODE.GS COM OS 7 LOGS CANÔNICOS (INCLUINDO VELAS E CORREIA DENTADA/TENSORES/ROLAMENTOS)
let codeGs = fs.readFileSync('Code.gs', 'utf8');

const canonicalLogsScript = `  const canonicalLogs = [
    ['LOG-001', '2026-08-10', 191706, 'PREVENTIVA', 'Motor / Trem de Força', 'Substituição do Óleo do Motor e Filtro', 240.00, 80.00, 1.5, 'FLORIPA CASA E CONSTRUCAO LTDA', 'NF-5481', '35260800000000000000550010000054811000000001', 'Troca de óleo de motor 10W40 semissintético e filtro de óleo Mann', 'VEIC-001', 'Manutenção preventiva periódica'],
    ['LOG-002', '2026-08-10', 191706, 'PREVENTIVA', 'Motor / Trem de Força', 'Substituição do Filtro de Combustível de Linha', 95.00, 40.00, 1.0, 'FLORIPA CASA E CONSTRUCAO LTDA', 'NF-5481', '35260800000000000000550010000054811000000002', 'Troca de filtro de combustível de linha FLEX', 'VEIC-001', 'Substituição preventiva de filtro'],
    ['LOG-003', '2026-08-10', 191706, 'PREVENTIVA', 'Motor / Trem de Força', 'Substituição do Filtro de Ar do Motor', 85.00, 30.00, 0.5, 'FLORIPA CASA E CONSTRUCAO LTDA', 'NF-5481', '35260800000000000000550010000054811000000003', 'Substituição do elemento filtrante de ar', 'VEIC-001', 'Filtro de ar em dia'],
    ['LOG-004', '2026-08-10', 191706, 'PREVENTIVA', 'Habitáculo / Climatização', 'Substituição do Filtro de Cabine / Ar-Condicionado', 75.00, 30.00, 0.5, 'FLORIPA CASA E CONSTRUCAO LTDA', 'NF-5481', '35260800000000000000550010000054811000000004', 'Troca de filtro de cabine anti-pólen e higienização', 'VEIC-001', 'Higienização de ar-condicionado'],
    ['LOG-005', '2026-06-09', 191706, 'PREVENTIVA', 'Arrefecimento', 'Sistema de Arrefecimento Completo (Bomba, Válvula, Trocador)', 111.36, 0.00, 1.0, 'FLORIPA CASA E CONSTRUCAO LTDA', '000.001.414', '42260659997717000100550020000014141208982535', 'WURTH FLUIDO RADIADOR ROSA 1L (2 unidades) e revisão do arrefecimento', 'VEIC-001', 'Aplicação de aditivo de arrefecimento Wurth Rosa'],
    ['LOG-006', '2026-08-10', 191706, 'PREVENTIVA', 'Sincronismo / Motor', 'Substituição do Kit Correia Dentada, Tensor e Rolamento do Motor', 580.00, 270.00, 3.5, 'BRICHI E MARTINI AUTO MECANICA LTDA-ME', '023005', '35260800000000000000550010000054811000000006', 'Substituição do Kit Correia Dentada HNBR Dayco/Gates, Rolamento e Tensor do Motor EW10A', 'VEIC-001', 'Sincronismo mestre do motor revisado e substituído aos 191.706 KM'],
    ['LOG-007', '2026-08-10', 191706, 'PREVENTIVA', 'Ignição / Motor', 'Substituição das Velas de Ignição', 180.00, 60.00, 0.8, 'BRICHI E MARTINI AUTO MECANICA LTDA-ME', '023005', '35260800000000000000550010000054811000000007', 'Substituição do Jogo de 4 Velas de Ignição Bosch/NGK Originais PSA EW10A', 'VEIC-001', 'Velas de ignição novas instaladas e calibradas aos 191.706 KM']
  ];`;

codeGs = codeGs.replace(/const canonicalLogs = \[[\s\S]*?canonicalLogs\.forEach/, canonicalLogsScript + '\n    canonicalLogs.forEach');
fs.writeFileSync('Code.gs', codeGs, 'utf8');

// 3. ATUALIZAR INDEX.HTML E APP.HTML
let html = fs.readFileSync('index.html', 'utf8');

// 3.1. Adicionar LOG-006 e LOG-007 no state inicial
const complete7Logs = `logs: [
        { ID: 'LOG-001', Data: '2026-08-10', KM: 191706, TipoManutencao: 'PREVENTIVA', Tipo: 'PREVENTIVA', Subsistema: 'Motor / Trem de Força', Sistema: 'Motor / Trem de Força', Subcausa: 'Substituição do Óleo do Motor e Filtro', DescricaoServico: 'Troca de óleo de motor 10W40 semissintético e filtro de óleo Mann', ValorTotal: 320, CustoPecas: 240, CustoMaoDeObra: 80, OficinaNome: 'FLORIPA CASA E CONSTRUCAO LTDA', NumeroNF: 'NF-5481', VeiculoID: 'VEIC-001', Placa: 'EEQ-9C28' },
        { ID: 'LOG-002', Data: '2026-08-10', KM: 191706, TipoManutencao: 'PREVENTIVA', Tipo: 'PREVENTIVA', Subsistema: 'Motor / Trem de Força', Sistema: 'Motor / Trem de Força', Subcausa: 'Substituição do Filtro de Combustível de Linha', DescricaoServico: 'Troca de filtro de combustível de linha FLEX', ValorTotal: 135, CustoPecas: 95, CustoMaoDeObra: 40, OficinaNome: 'FLORIPA CASA E CONSTRUCAO LTDA', NumeroNF: 'NF-5481', VeiculoID: 'VEIC-001', Placa: 'EEQ-9C28' },
        { ID: 'LOG-003', Data: '2026-08-10', KM: 191706, TipoManutencao: 'PREVENTIVA', Tipo: 'PREVENTIVA', Subsistema: 'Motor / Trem de Força', Sistema: 'Motor / Trem de Força', Subcausa: 'Substituição do Filtro de Ar do Motor', DescricaoServico: 'Substituição do elemento filtrante de ar', ValorTotal: 115, CustoPecas: 85, CustoMaoDeObra: 30, OficinaNome: 'FLORIPA CASA E CONSTRUCAO LTDA', NumeroNF: 'NF-5481', VeiculoID: 'VEIC-001', Placa: 'EEQ-9C28' },
        { ID: 'LOG-004', Data: '2026-08-10', KM: 191706, TipoManutencao: 'PREVENTIVA', Tipo: 'PREVENTIVA', Subsistema: 'Habitáculo / Climatização', Sistema: 'Habitáculo / Climatização', Subcausa: 'Substituição do Filtro de Cabine / Ar-Condicionado', DescricaoServico: 'Troca de filtro de cabine anti-pólen e higienização', ValorTotal: 105, CustoPecas: 75, CustoMaoDeObra: 30, OficinaNome: 'FLORIPA CASA E CONSTRUCAO LTDA', NumeroNF: 'NF-5481', VeiculoID: 'VEIC-001', Placa: 'EEQ-9C28' },
        { ID: 'LOG-005', Data: '2026-06-09', KM: 191706, TipoManutencao: 'PREVENTIVA', Tipo: 'PREVENTIVA', Subsistema: 'Arrefecimento', Sistema: 'Arrefecimento', Subcausa: 'Sistema de Arrefecimento Completo (Bomba, Válvula, Trocador)', DescricaoServico: 'WURTH FLUIDO RADIADOR ROSA 1L (2 unidades) e revisão do arrefecimento', ValorTotal: 111.36, CustoPecas: 111.36, CustoMaoDeObra: 0, OficinaNome: 'FLORIPA CASA E CONSTRUCAO LTDA', NumeroNF: '000.001.414', VeiculoID: 'VEIC-001', Placa: 'EEQ-9C28' },
        { ID: 'LOG-006', Data: '2026-08-10', KM: 191706, TipoManutencao: 'PREVENTIVA', Tipo: 'PREVENTIVA', Subsistema: 'Sincronismo / Motor', Sistema: 'Sincronismo / Motor', Subcausa: 'Substituição do Kit Correia Dentada e Tensor', DescricaoServico: 'Substituição do Kit Correia Dentada HNBR Dayco/Gates, Rolamento e Tensor do Motor EW10A', ValorTotal: 850, CustoPecas: 580, CustoMaoDeObra: 270, OficinaNome: 'AUTO MECANICA REPUBLICA', NumeroNF: 'OS-023005', VeiculoID: 'VEIC-001', Placa: 'EEQ-9C28' },
        { ID: 'LOG-007', Data: '2026-08-10', KM: 191706, TipoManutencao: 'PREVENTIVA', Tipo: 'PREVENTIVA', Subsistema: 'Ignição / Motor', Sistema: 'Ignição / Motor', Subcausa: 'Substituição das Velas de Ignição', DescricaoServico: 'Substituição do Jogo de 4 Velas de Ignição Bosch/NGK Originais PSA EW10A', ValorTotal: 240, CustoPecas: 180, CustoMaoDeObra: 60, OficinaNome: 'AUTO MECANICA REPUBLICA', NumeroNF: 'OS-023005', VeiculoID: 'VEIC-001', Placa: 'EEQ-9C28' }
      ]`;

html = html.replace(/logs: \[[\s\S]*?LOG-005[\s\S]*?Placa: 'EEQ-9C28' \}\s*\]/, complete7Logs);

// 3.2. Implementar helper inteligente de extração de palavras-chave para qualquer prescrição
const keywordHelper = `
    function getKeywordsForIntervention(intervencao, subsistema) {
      const lower = (String(intervencao || '') + ' ' + String(subsistema || '')).toLowerCase();
      const kw = [String(intervencao).toLowerCase()];
      
      if (lower.includes('óleo') || lower.includes('oleo')) {
        kw.push('oleo', 'óleo', 'lubrificante', 'filtro de oleo', 'filtro de óleo');
      }
      if (lower.includes('combustível') || lower.includes('combustivel')) {
        kw.push('combustivel', 'combustível', 'filtro de combustivel', 'filtro de combustível', 'linha flex');
      }
      if (lower.includes('filtro de ar') || lower.includes('elemento')) {
        kw.push('filtro de ar', 'elemento filtrante', 'elemento de ar');
      }
      if (lower.includes('cabine') || lower.includes('ar-condicionado') || lower.includes('ar condicionado') || lower.includes('climatização')) {
        kw.push('cabine', 'ar condicionado', 'ar-condicionado', 'higienizacao', 'higienização', 'polen', 'pólen');
      }
      if (lower.includes('arrefecimento') || lower.includes('radiador') || lower.includes('aditivo') || lower.includes('bomba')) {
        kw.push('arrefecimento', 'radiador', 'aditivo', 'bomba d', 'bomba de agua', 'bomba de água', 'valvula termostatica', 'válvula termostática', 'wurth', 'rosa', 'fluido radiador');
      }
      if (lower.includes('freio') || lower.includes('dot')) {
        kw.push('freio', 'dot 4', 'dot4', 'pastilha', 'disco', 'fluido de freio');
      }
      if (lower.includes('correia') || lower.includes('sincronismo') || lower.includes('tensor') || lower.includes('rolamento') || lower.includes('distribui')) {
        kw.push('correia', 'correia dentada', 'tensor', 'rolamento', 'sincronismo', 'distribuicao', 'distribuição', 'kit correia', 'dentada');
      }
      if (lower.includes('vela') || lower.includes('igni') || lower.includes('eletrodo')) {
        kw.push('vela', 'velas', 'ignicao', 'ignição', 'jogo de velas', 'eletrodo', 'jogo de 4 velas');
      }
      return kw;
    }
`;

if (!html.includes('function getKeywordsForIntervention(')) {
  html = html.replace('function buildDynamicPrescriptivePlan(v) {', keywordHelper + '\n    function buildDynamicPrescriptivePlan(v) {');
}

// 3.3. Atualizar o preenchimento de palavras-chave nas prescrições salvas
html = html.replace(
  'palavrasChave: [intervencao.toLowerCase()]',
  'palavrasChave: getKeywordsForIntervention(intervencao, subsistema)'
);

// 3.4. Melhorar o cruzamento de logs
html = html.replace(
  'const desc = String(log.DescricaoServico || log.descricaoServico || \'\').toLowerCase();',
  'const desc = (String(log.DescricaoServico || log.descricaoServico || \'\') + \' \' + String(log.Subcausa || log.subcausa || \'\')).toLowerCase();'
);

fs.writeFileSync('index.html', html, 'utf8');
fs.writeFileSync('App.html', html, 'utf8');
console.log('✅ 7 Ocorrências canônicas e matching inteligente de Velas e Correia/Tensor/Rolamento integrados com sucesso!');
