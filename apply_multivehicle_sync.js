const fs = require('fs');

// 1. BACKUP DE SEGURANÇA MANDATÓRIO
const backupDir = 'backups/checkpoint_v113_multivehicle_plan_sync_and_health_calc';
if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
fs.copyFileSync('Code.gs', backupDir + '/Code.gs');
fs.copyFileSync('index.html', backupDir + '/index.html');
fs.copyFileSync('App.html', backupDir + '/App.html');

// 2. ATUALIZAR CODE.GS: CORRIGIR SCHEMA DE INSERÇÃO EM PLANO_PRESCRITIVO NO ADDVEHICLE
let codeGs = fs.readFileSync('Code.gs', 'utf8');

const correctedAddVehiclePrescription = `  // GERAÇÃO PERSONALIZADA DO PLANO OEM VIA IA COM SCHEMA CANÔNICO PADRONIZADO
  try {
    const planoResultado = gerarPlanoPrescritivoOEMComIA(id, marca, modelo, anoMod, motor, comb, trans, dist, regime);
    const diretrizes = planoResultado.diretrizes || [];
    const sheetPlano = getOrCreateSheet(ss, SHEET_NAMES.PLANO_PRESCRITIVO);
    
    diretrizes.forEach((d, idx) => {
      sheetPlano.appendRow([
        'PRES-' + id + '-' + (idx + 1),
        id, // Coluna 2: VeiculoID
        d.intervencao, // Coluna 3: Intervencao
        d.subsistema || 'Motor/Trem de Força', // Coluna 4: Subsistema
        'PREVENTIVA', // Coluna 5: Tipo
        Number(d.intervaloKm || 10000), // Coluna 6: IntervaloKM
        Number(d.intervaloMeses || 12), // Coluna 7: IntervaloMeses
        d.especificacao || 'Conforme Manual do Fabricante', // Coluna 8: EspecificacaoTecnica
        d.origemFonte || 'MANUAL_OEM_FABRICANTE', // Coluna 9: OrigemFonte
        d.observacao || 'Diretriz técnica recomendada pela montadora', // Coluna 10: TextoPrecaucao
        now // Coluna 11: DataAtualizacao
      ]);
    });
  } catch(e) { 
    Logger.log('Erro ao gerar plano prescritivo com IA para ' + id + ': ' + e); 
  }`;

codeGs = codeGs.replace(
  /\/\/ GERAÇÃO PERSONALIZADA DO PLANO OEM VIA IA COM TRAVAS DE SEGURANÇA[\s\S]*?sheetPlano\.appendRow\(\[[\s\S]*?\]\);\s*\}\);\s*\}\s*catch\(e\)\s*\{[\s\S]*?\}/,
  correctedAddVehiclePrescription
);

fs.writeFileSync('Code.gs', codeGs, 'utf8');

// 3. ATUALIZAR INDEX.HTML E APP.HTML COM MAPEAMENTO POLIMÓRFICO DE COLUNAS E RECÁLCULO AUTOMÁTICO DE SAÚDE
let html = fs.readFileSync('index.html', 'utf8');

const enhancedBuildDynamicPlan = `    function buildDynamicPrescriptivePlan(v) {
      if (!v) {
        state.prescriptivePlan = [];
        return;
      }

      const vId = String(v.ID || v.id || '').trim();
      const vPlaca = String(v.PlacaChassi || v.placaChassi || v.Placa || v.placa || '').replace(/[^A-Z0-9]/gi, '').toUpperCase();
      const vKmAtual = Number(v.KMAtual !== undefined ? v.KMAtual : (v.kmAtual !== undefined ? v.kmAtual : 0));
      const regimeUso = String(v.RegimeUso || v.regimeUso || 'SEVERO_URBANO');
      const multKm = regimeUso.includes('SEVERO') ? 0.8 : 1.0;

      // Filtrar prescrições do veículo atual na base consolidada
      const validCustomItems = (state.customPrescriptions || []).filter(p => {
        const itemVId = String(p.VeiculoID || p.veiculoId || p.VeiculoId || p.veiculo_id || '').trim();
        const vMatching = (itemVId === vId) || (vPlaca && itemVId === vPlaca);
        const interv = String(p.Intervencao || p.intervencao || p.Subcausa || p.subcausa || '').trim();
        const isFile = /\\.(jpeg|jpg|png|webp|pdf|txt|xml)$/i.test(interv);
        return vMatching && !isFile && interv.length >= 3;
      });

      const mergedMap = new Map();

      if (validCustomItems.length > 0) {
        validCustomItems.forEach(c => {
          const intervencao = c.Intervencao || c.intervencao || c.Subcausa || c.subcausa || '';
          const subsistema = c.Subsistema || c.subsistema || c.Sistema || c.sistema || 'Motor/Trem de Força';
          const key = (subsistema + '__' + intervencao).toUpperCase();
          
          mergedMap.set(key, {
            dbId: c.ID || c.id || '',
            intervencao: intervencao,
            subsistema: subsistema,
            tipo: c.Tipo || c.tipo || 'PREVENTIVA',
            intervalo_km: Number(c.IntervaloKM || c.intervalo_km || c.IntervaloKM_Severo || c.IntervaloKM_Normal || 10000),
            intervalo_meses: Number(c.IntervaloMeses || c.intervalo_meses || c.IntervaloMeses_Severo || c.IntervaloMeses_Normal || 12),
            especificacao_tecnica: c.EspecificacaoTecnica || c.especificacao_tecnica || c.Observacoes || 'Conforme especificação documental',
            origem_fonte: c.OrigemFonte || c.origem_fonte || c.Fonte || 'MANUAL_OEM_FABRICANTE',
            texto_precaucao: c.TextoPrecaucao || c.texto_precaucao || c.Observacoes || 'Diretriz técnica sob acompanhamento.',
            palavrasChave: getKeywordsForIntervention(intervencao, subsistema)
          });
        });
      } else {
        // Matriz Prescritiva Padrão da Montadora
        const defaultItems = [
          { intervencao: 'Substituição do Óleo do Motor e Filtro de Óleo', subsistema: 'Motor/Trem de Força', tipo: 'PREVENTIVA', intervalo_km: Math.round(10000 * multKm), intervalo_meses: 12, especificacao_tecnica: 'Lubrificante e Filtro Homologados pelo Fabricante', origem_fonte: 'MANUAL_OEM_FABRICANTE', texto_precaucao: 'Sem registro de troca de óleo no histórico do ativo.', palavrasChave: ['oleo', 'óleo', 'filtro de oleo', 'filtro de óleo', 'lubrificante'] },
          { intervencao: 'Substituição do Filtro de Combustível de Linha (FLEX)', subsistema: 'Motor/Trem de Força', tipo: 'PREVENTIVA', intervalo_km: Math.round(20000 * multKm), intervalo_meses: 12, especificacao_tecnica: 'Filtro Blindado de Linha de Combustível', origem_fonte: 'MANUAL_OEM_FABRICANTE', texto_precaucao: 'Sem registro de substituição do filtro de combustível.', palavrasChave: ['filtro de combustivel', 'filtro de combustível', 'combustivel', 'combustível'] },
          { intervencao: 'Substituição do Filtro de Ar do Motor', subsistema: 'Motor/Trem de Força', tipo: 'PREVENTIVA', intervalo_km: Math.round(20000 * multKm), intervalo_meses: 12, especificacao_tecnica: 'Elemento Filtrante de Ar do Motor', origem_fonte: 'MANUAL_OEM_FABRICANTE', texto_precaucao: 'Sem registro de substituição do elemento de ar.', palavrasChave: ['filtro de ar', 'elemento filtrante', 'elemento de ar'] },
          { intervencao: 'Substituição do Filtro de Ar Condicionado (Cabine)', subsistema: 'Elétrica/Eletrônica', tipo: 'PREVENTIVA', intervalo_km: Math.round(30000 * multKm), intervalo_meses: 12, especificacao_tecnica: 'Filtro Antipólen / Carvão Ativado', origem_fonte: 'MANUAL_OEM_FABRICANTE', texto_precaucao: 'Sem registro de troca do filtro de cabine.', palavrasChave: ['ar condicionado', 'cabine', 'higienizacao', 'polen', 'pólen'] },
          { intervencao: 'Substituição das Velas de Ignição', subsistema: 'Motor/Trem de Força', tipo: 'PREVENTIVA', intervalo_km: Math.round(40000 * multKm), intervalo_meses: 24, especificacao_tecnica: 'Jogo de Velas de Ignição Homologadas', origem_fonte: 'MANUAL_OEM_FABRICANTE', texto_precaucao: 'Sem histórico documental de substituição de velas.', palavrasChave: ['vela', 'velas', 'ignicao', 'ignição', 'jogo de velas'] },
          { intervencao: (v.TipoDistribuicao || v.tipoDistribuicao || '').includes('Corrente') ? 'Inspeção da Corrente de Distribuição' : 'Substituição do Kit de Correia Dentada (Distribuição)', subsistema: 'Motor/Trem de Força', tipo: 'PREVENTIVA', intervalo_km: (v.TipoDistribuicao || v.tipoDistribuicao || '').includes('Corrente') ? 200000 : Math.round(70000 * multKm), intervalo_meses: 60, especificacao_tecnica: 'Kit Correia Dentada e Tensores de Sincronismo', origem_fonte: 'MANUAL_OEM_FABRICANTE', texto_precaucao: 'CRÍTICO DESTRUTIVO: Sem comprovação documental de sincronismo.', palavrasChave: ['correia dentada', 'distribuicao', 'distribuição', 'kit correia', 'tensor', 'rolamento'] },
          { intervencao: 'Sistema de Arrefecimento Completo (Bomba, Válvula, Trocador, Aditivo)', subsistema: 'Arrefecimento', tipo: 'PREVENTIVA', intervalo_km: Math.round(40000 * multKm), intervalo_meses: 24, especificacao_tecnica: 'Aditivo Orgânico Concentrado + Água Desmineralizada', origem_fonte: 'MANUAL_OEM_FABRICANTE', texto_precaucao: 'CRÍTICO: Monitoramento de temperatura e corrosão.', palavrasChave: ['arrefecimento', 'bomba d', 'bomba de agua', 'valvula termostatica', 'aditivo', 'radiador'] },
          { intervencao: 'Substituição Completa do Fluido de Freio Sintético (DOT 4)', subsistema: 'Freios', tipo: 'PREVENTIVA', intervalo_km: Math.round(20000 * multKm), intervalo_meses: 24, especificacao_tecnica: 'Fluido Sintético DOT 4', origem_fonte: 'MANUAL_OEM_FABRICANTE', texto_precaucao: 'Fluido higroscópico com risco de perda de eficiência de frenagem.', palavrasChave: ['fluido de freio', 'dot 4', 'dot4', 'pastilha', 'disco'] }
        ];
        defaultItems.forEach(item => {
          const key = (item.subsistema + '__' + item.intervencao).toUpperCase();
          mergedMap.set(key, item);
        });
      }

      // Cruzar com os registros de manutenção (state.logs)
      const vehicleLogs = (state.logs || []).filter(l => {
        const lVId = String(l.VeiculoID || l.veiculoId || '').trim();
        const lPlaca = String(l.Placa || l.placa || '').replace(/[^A-Z0-9]/gi, '').toUpperCase();
        return (lVId && lVId === vId) || (lPlaca && vPlaca && lPlaca === vPlaca);
      });

      let cntEmDia = 0;
      let cntCritico = 0;
      let cntAlerta = 0;

      const calculatedPlan = Array.from(mergedMap.values()).map(item => {
        const keywords = item.palavrasChave || getKeywordsForIntervention(item.intervencao, item.subsistema);
        
        let latestLog = null;
        for (let log of vehicleLogs) {
          const desc = (String(log.DescricaoServico || log.descricaoServico || '') + ' ' + String(log.Subcausa || log.subcausa || '')).toLowerCase();
          const sub = String(log.Subsistema || log.subsistema || log.Sistema || log.sistema || '').toLowerCase();
          
          const match = keywords.some(kw => desc.includes(kw.toLowerCase())) || 
                        (sub && sub === item.subsistema.toLowerCase() && desc.length > 5);
          
          if (match) {
            if (!latestLog || (Number(log.KM || log.km || 0) > Number(latestLog.KM || latestLog.km || 0))) {
              latestLog = log;
            }
          }
        }

        let status = 'CRITICO';
        let kmUltimaExec = null;
        let dataUltimaExec = null;
        let kmProxima = null;
        let kmRestante = null;

        if (latestLog) {
          kmUltimaExec = Number(latestLog.KM || latestLog.km || 0);
          dataUltimaExec = latestLog.Data || latestLog.data || '';
          kmProxima = kmUltimaExec + item.intervalo_km;
          kmRestante = kmProxima - vKmAtual;

          if (kmRestante <= 0) {
            status = 'CRITICO';
          } else if (kmRestante <= (item.intervalo_km * 0.2)) {
            status = 'ALERTA';
          } else {
            status = 'EM_DIA';
          }
        } else {
          status = 'CRITICO';
        }

        if (status === 'EM_DIA') cntEmDia++;
        else if (status === 'ALERTA') cntAlerta++;
        else cntCritico++;

        return {
          ...item,
          status: status,
          km_ultima_execucao: kmUltimaExec,
          data_ultima_execucao: dataUltimaExec,
          km_proxima_intervencao: kmProxima,
          km_restante: kmRestante,
          oficina_responsavel: latestLog ? (latestLog.OficinaNome || latestLog.oficinaNome || '') : ''
        };
      });

      state.prescriptivePlan = calculatedPlan;

      const elEmDia = document.getElementById('cntEmDia');
      const elCritico = document.getElementById('cntCritico');
      const elAlerta = document.getElementById('cntAlerta');
      if (elEmDia) elEmDia.innerText = String(cntEmDia);
      if (elCritico) elCritico.innerText = String(cntCritico);
      if (elAlerta) elAlerta.innerText = String(cntAlerta);
    }`;

html = html.replace(/function buildDynamicPrescriptivePlan\(v\)[\s\S]*?if \(elAlerta\) elAlerta\.innerText = String\(cntAlerta\);\s*\}/, enhancedBuildDynamicPlan);

fs.writeFileSync('index.html', html, 'utf8');
fs.writeFileSync('App.html', html, 'utf8');
console.log('✅ Sincronização e recálculo multi-veículos homologados!');
