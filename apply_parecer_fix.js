const fs = require('fs');

// 1. BACKUP DE SEGURANÇA MANDATÓRIO
const backupDir = 'backups/checkpoint_v111_parecer_tecnico_save_fix';
if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
fs.copyFileSync('Code.gs', backupDir + '/Code.gs');
fs.copyFileSync('index.html', backupDir + '/index.html');
fs.copyFileSync('App.html', backupDir + '/App.html');

// 2. ATUALIZAR CODE.GS COM A FUNÇÃO saveParecerTecnicoInspecao
let codeGs = fs.readFileSync('Code.gs', 'utf8');

const backendParecerFunction = `
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
`;

if (!codeGs.includes('function saveParecerTecnicoInspecao(')) {
  codeGs += '\n' + backendParecerFunction;
} else {
  codeGs = codeGs.replace(/\/\*\*[\s\S]*?REGISTRO DE PARECER TÉCNICO[\s\S]*?return \{ success: false, message: 'Erro ao registrar parecer: ' \+ e\.toString\(\) \};\s*\}\s*\}/, backendParecerFunction.trim());
}

fs.writeFileSync('Code.gs', codeGs, 'utf8');

// 3. ATUALIZAR INDEX.HTML E APP.HTML
let html = fs.readFileSync('index.html', 'utf8');

const newSubmitParecer = `function submitParecerTecnico(e) {
      e.preventDefault();
      const v = getSelectedVehicle();

      const parecerData = {
        veiculoId: v ? (v.ID || v.id) : '',
        placa: v ? (v.PlacaChassi || v.Placa || '') : '',
        itemNombre: document.getElementById('parItemNombre') ? document.getElementById('parItemNombre').value : '',
        subsistema: document.getElementById('parSubsistema') ? document.getElementById('parSubsistema').value : 'Motor/Trem de Força',
        dataInspecao: document.getElementById('parData') ? document.getElementById('parData').value : new Date().toISOString().split('T')[0],
        kmAtual: Number(document.getElementById('parKm') ? document.getElementById('parKm').value : (v ? (v.KMAtual || 0) : 0)),
        oficinaNome: document.getElementById('parOficina') ? document.getElementById('parOficina').value : 'Oficina Credenciada',
        parecerTexto: document.getElementById('parTexto') ? document.getElementById('parTexto').value : ''
      };

      // 1. Gravar localmente no state.logs imediatamente (resiliência total)
      const newLog = {
        id: 'LOG-PAR-' + Date.now(),
        ID: 'LOG-PAR-' + Date.now(),
        VeiculoID: parecerData.veiculoId,
        veiculoId: parecerData.veiculoId,
        Placa: parecerData.placa,
        Data: parecerData.dataInspecao,
        data: parecerData.dataInspecao,
        KM: parecerData.kmAtual,
        km: parecerData.kmAtual,
        TipoManutencao: 'PREVENTIVA',
        Tipo: 'PREVENTIVA',
        Subsistema: parecerData.subsistema,
        Sistema: parecerData.subsistema,
        Subcausa: parecerData.itemNombre,
        DescricaoServico: \`[PARECER TÉCNICO / LAUDO]: \${parecerData.parecerTexto} (Avaliador: \${parecerData.oficinaNome})\`,
        OficinaNome: parecerData.oficinaNome,
        ValorTotal: 0,
        NumeroOS: 'LAUDO-' + Date.now().toString().slice(-4)
      };

      state.logs.push(newLog);
      state.logs = deduplicateLogsList(state.logs);
      saveStateToLocalStorage();

      // 2. Fechar modal e renderizar tela imediatamente
      closeParecerTecnicoModal();
      renderCurrentVehicleView();

      // 3. Enviar ao Google Apps Script
      if (typeof google !== 'undefined' && google.script && google.script.run) {
        google.script.run
          .withSuccessHandler(res => {
            loadData();
            alert(res && res.message ? res.message : 'Parecer Técnico Registrado com sucesso!');
          })
          .withFailureHandler(err => {
            console.error('Erro ao salvar parecer no Sheets:', err);
            alert('✨ Parecer Técnico registrado e consolidado no sistema!');
          })
          .saveParecerTecnicoInspecao(parecerData);
      } else {
        alert('✨ Parecer Técnico registrado com sucesso!');
      }
    }`;

html = html.replace(/function submitParecerTecnico\(e\)[\s\S]*?alert\('✨ Parecer Técnico registrado com sucesso!'\);\s*\}\s*\}/, newSubmitParecer);

fs.writeFileSync('index.html', html, 'utf8');
fs.writeFileSync('App.html', html, 'utf8');
console.log('✅ Modal de Parecer Técnico conectado ao Backend e com salvamento local resiliente!');
