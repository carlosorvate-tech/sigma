const fs = require('fs');

// 1. BACKUP MANDATÓRIO
const backupDir = 'backups/checkpoint_v103_modulo_oficinas_e_auditoria_v2';
if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
fs.copyFileSync('Code.gs', backupDir + '/Code.gs');
fs.copyFileSync('index.html', backupDir + '/index.html');
fs.copyFileSync('App.html', backupDir + '/App.html');
fs.copyFileSync('appsscript.json', backupDir + '/appsscript.json');

// 2. ATUALIZAR CODE.GS COM AS FUNÇÕES OFICIAIS DE OFICINAS E AUDITORIA
let codeGs = fs.readFileSync('Code.gs', 'utf8');

const oficinasBackend = `
/**
 * MÓDULO CORPORATIVO DE GESTÃO DE OFICINAS, ROTEAMENTO & AUDITORIA (SIGMA V2.0 READY)
 */

function salvarOficina(dadosOficina) {
  var ss = getSpreadsheet();
  var aba = ss.getSheetByName("Oficinas") || ss.insertSheet("Oficinas");
  
  if (aba.getLastRow() === 0) {
    aba.appendRow([
      "ID_Oficina", "Nome_Fantasia", "Nome_Juridico", "CNPJ", "Endereco", 
      "Contato_Mensagens", "Contato_Celular", "Telefone_Fisico", "Emails", 
      "Tipo_Atendimento", "Mecanico_Responsavel", "Flag_Oficina_Base", "Data_Cadastro"
    ]);
  }
  
  var id = dadosOficina.id || dadosOficina.ID_Oficina || "OFI_" + new Date().getTime();
  var isBase = Boolean(dadosOficina.isBase === true || dadosOficina.isBase === "true" || dadosOficina.Flag_Oficina_Base === "TRUE" || dadosOficina.Flag_Oficina_Base === true);

  if (isBase) {
    desmarcarOutrasOficinasBase(aba);
  }
  
  var rowIndex = encontrarLinhaPorId(aba, id);
  var linhaDados = [
    id,
    dadosOficina.nomeFantasia || dadosOficina.Nome_Fantasia || "",
    dadosOficina.nomeJuridico || dadosOficina.Nome_Juridico || "",
    dadosOficina.cnpjh || dadosOficina.CNPJ || "",
    dadosOficina.endereco || dadosOficina.Endereco || "",
    dadosOficina.contatoMensagens || dadosOficina.Contato_Mensagens || "",
    dadosOficina.contatoCelular || dadosOficina.Contato_Celular || "",
    dadosOficina.telefoneFisico || dadosOficina.Telefone_Fisico || "",
    dadosOficina.emails || dadosOficina.Emails || "",
    dadosOficina.tipoAtendimento || dadosOficina.Tipo_Atendimento || "Oficina Mecânica Especializada",
    dadosOficina.mecanicoResponsavel || dadosOficina.Mecanico_Responsavel || "",
    isBase ? "TRUE" : "FALSE",
    new Date()
  ];
  
  if (rowIndex > 0) {
    aba.getRange(rowIndex, 1, 1, linhaDados.length).setValues([linhaDados]);
  } else {
    aba.appendRow(linhaDados);
  }
  
  return { status: "sucesso", id: id, mensagem: "Oficina salva com sucesso." };
}

function getOficinas() {
  var ss = getSpreadsheet();
  var aba = ss.getSheetByName("Oficinas");
  if (!aba || aba.getLastRow() <= 1) {
    if (!aba) aba = ss.insertSheet("Oficinas");
    aba.clear();
    aba.appendRow([
      "ID_Oficina", "Nome_Fantasia", "Nome_Juridico", "CNPJ", "Endereco", 
      "Contato_Mensagens", "Contato_Celular", "Telefone_Fisico", "Emails", 
      "Tipo_Atendimento", "Mecanico_Responsavel", "Flag_Oficina_Base", "Data_Cadastro"
    ]);
    aba.appendRow([
      "OFI_001", "Oficina Mecânica Precision Auto", "Precision Manutenções Automotivas LTDA", "12.345.678/0001-90",
      "Av. Principal, 1500 - São Paulo, SP", "5511987654321", "(11) 98765-4321", "(11) 3456-7890", "contato@precisionauto.com.br",
      "Oficina Mecânica Especializada", "Carlos Silva (Chefe de Oficina)", "TRUE", new Date()
    ]);
    aba.appendRow([
      "OFI_002", "FLORIPA CASA E CONSTRUCAO LTDA", "Floripa Casa e Construção LTDA", "59.997.717/0001-00",
      "Estrada Vereador Onildo Lemos, 728 - Florianópolis, SC", "5548996720566", "(48) 99672-0566", "(48) 3269-1000", "fiscal@floripacasa.com.br",
      "Fornecedor de Peças / Insumos", "Central de Vendas", "FALSE", new Date()
    ]);
  }
  
  var dados = aba.getDataRange().getValues();
  var lista = [];
  for (var i = 1; i < dados.length; i++) {
    if (dados[i][0]) {
      lista.push({
        id: String(dados[i][0]),
        ID_Oficina: String(dados[i][0]),
        nomeFantasia: String(dados[i][1] || ""),
        Nome_Fantasia: String(dados[i][1] || ""),
        nomeJuridico: String(dados[i][2] || ""),
        Nome_Juridico: String(dados[i][2] || ""),
        cnpjh: String(dados[i][3] || ""),
        CNPJ: String(dados[i][3] || ""),
        endereco: String(dados[i][4] || ""),
        Endereco: String(dados[i][4] || ""),
        contatoMensagens: String(dados[i][5] || ""),
        Contato_Mensagens: String(dados[i][5] || ""),
        contatoCelular: String(dados[i][6] || ""),
        Contato_Celular: String(dados[i][6] || ""),
        telefoneFisico: String(dados[i][7] || ""),
        Telefone_Fisico: String(dados[i][7] || ""),
        emails: String(dados[i][8] || ""),
        Emails: String(dados[i][8] || ""),
        tipoAtendimento: String(dados[i][9] || ""),
        Tipo_Atendimento: String(dados[i][9] || ""),
        mecanicoResponsavel: String(dados[i][10] || ""),
        Mecanico_Responsavel: String(dados[i][10] || ""),
        isBase: String(dados[i][11]).toUpperCase() === "TRUE",
        Flag_Oficina_Base: String(dados[i][11]).toUpperCase() === "TRUE"
      });
    }
  }
  return lista;
}

function excluirOficina(idOficina) {
  var ss = getSpreadsheet();
  var aba = ss.getSheetByName("Oficinas");
  if (!aba) return { status: "erro", mensagem: "Aba não encontrada." };
  var rowIndex = encontrarLinhaPorId(aba, idOficina);
  if (rowIndex > 0) {
    aba.deleteRow(rowIndex);
    return { status: "sucesso", mensagem: "Oficina excluída com sucesso." };
  }
  return { status: "erro", mensagem: "Oficina não encontrada." };
}

function definirOficinaBaseOficial(idOficina) {
  var ss = getSpreadsheet();
  var aba = ss.getSheetByName("Oficinas") || ss.insertSheet("Oficinas");
  desmarcarOutrasOficinasBase(aba);
  var rowIndex = encontrarLinhaPorId(aba, idOficina);
  if (rowIndex > 0) {
    aba.getRange(rowIndex, 12).setValue("TRUE");
    return { status: "sucesso", mensagem: "Oficina base definida com sucesso." };
  }
  return { status: "erro", mensagem: "Oficina não encontrada." };
}

function dispararSolicitacaoOficina(dadosDiagnostico, idOficinaEscolhida) {
  var oficina = obterOficinaPorId(idOficinaEscolhida);
  if (!oficina) {
    throw new Error("Oficina selecionada não encontrada na base de dados.");
  }
  
  var mensagem = "*SOLICITAÇÃO DE AGENDAMENTO / DIAGNÓSTICO - SIGMA V2.0*\\n\\n" +
                 "Frota/Ativo: " + (dadosDiagnostico.ativo || "CITROËN C4 PALLAS (EEQ-9C28)") + "\\n" +
                 "Problema Relatado: " + (dadosDiagnostico.falha || "Revisão e Manutenção Periódica") + "\\n" +
                 "Diagnóstico Prévio: " + (dadosDiagnostico.diagnosticoPrevio || "Conforme Plano Prescritivo SIGMA") + "\\n" +
                 "Urgência: " + (dadosDiagnostico.urgencia || "Alta") + "\\n\\n" +
                 "Favor confirmar recebimento e disponibilidade.";
  
  var foneLimpo = (oficina.contatoMensagens || "").replace(/\\D/g, '');
  var linkWhatsApp = "https://wa.me/" + foneLimpo + "?text=" + encodeURIComponent(mensagem);
  
  registrarAuditoriaSolicitacao({
    timestamp: new Date(),
    ativo: dadosDiagnostico.ativo || "CITROËN C4 PALLAS (EEQ-9C28)",
    oficinaDestino: oficina.nomeFantasia,
    cnpj: oficina.cnpjh,
    tecnicoResponsavel: oficina.mecanicoResponsavel,
    conteudoMensagem: mensagem
  });
  
  return {
    status: "sucesso",
    linkWhatsApp: linkWhatsApp,
    mensagemAuditoria: "Solicitação arquivada com sucesso para fins de auditoria."
  };
}

function registrarAuditoriaSolicitacao(registro) {
  var ss = getSpreadsheet();
  var abaAuditoria = ss.getSheetByName("Auditoria_Solicitacoes") || ss.insertSheet("Auditoria_Solicitacoes");
  
  if (abaAuditoria.getLastRow() === 0) {
    abaAuditoria.appendRow(["Timestamp", "Ativo", "Oficina Destino", "CNPJ", "Mecânico", "Detalhes"]);
  }
  
  abaAuditoria.appendRow([
    registro.timestamp,
    registro.ativo,
    registro.oficinaDestino,
    registro.cnpj,
    registro.tecnicoResponsavel,
    registro.conteudoMensagem
  ]);
}

function desmarcarOutrasOficinasBase(aba) {
  var dados = aba.getDataRange().getValues();
  for (var i = 1; i < dados.length; i++) {
    aba.getRange(i + 1, 12).setValue("FALSE");
  }
}

function encontrarLinhaPorId(aba, id) {
  var dados = aba.getDataRange().getValues();
  for (var i = 1; i < dados.length; i++) {
    if (String(dados[i][0]) === String(id)) return i + 1;
  }
  return -1;
}

function obterOficinaPorId(id) {
  var ss = getSpreadsheet();
  var aba = ss.getSheetByName("Oficinas");
  if (!aba) return null;
  var dados = aba.getDataRange().getValues();
  for (var i = 1; i < dados.length; i++) {
    if (String(dados[i][0]) === String(id)) {
      return {
        id: dados[i][0],
        nomeFantasia: dados[i][1],
        cnpjh: dados[i][3],
        contatoMensagens: dados[i][5],
        mecanicoResponsavel: dados[i][10]
      };
    }
  }
  return null;
}
`;

if (!codeGs.includes('function salvarOficina(')) {
  codeGs += '\n' + oficinasBackend;
}

if (codeGs.includes('getInitialData()') && !codeGs.includes('oficinas:')) {
  codeGs = codeGs.replace('return {\n    vehicles: vehicles,', 'return {\n    oficinas: getOficinas(),\n    vehicles: vehicles,');
}

fs.writeFileSync('Code.gs', codeGs, 'utf8');

// 3. ATUALIZAR INDEX.HTML E APP.HTML COM O NOVO ESQUEMA DE CAMPOS E AUDITORIA
let html = fs.readFileSync('index.html', 'utf8');

const bannerUpdate = `
      // Renderizar Oficina Base da tabela Oficinas
      const oficinasList = state.oficinas || state.prestadores || [];
      const oficinaBase = oficinasList.find(o => o.isBase || o.Flag_Oficina_Base || o.oficinaBase);
      const nomeOficinaExibir = oficinaBase ? (oficinaBase.nomeFantasia || oficinaBase.Nome_Fantasia || oficinaBase.nome) : 'Definir Oficina Base';
      const elOficina = document.getElementById('vehicleOficinaText');
      if (elOficina) {
        elOficina.innerHTML = \`<span class="cursor-pointer hover:underline text-amber-300 font-semibold" onclick="openPrestadoresModal()" title="Clique para gerenciar a oficina base">\${nomeOficinaExibir}</span>\`;
      }
`;

if (html.includes("document.getElementById('vehicleOficinaText')")) {
  html = html.replace(/const prestadores = state\.prestadores[\s\S]*?elOficina\.innerHTML = `[\s\S]*?`;\s*\}/, bannerUpdate.trim());
}

const jsOficinasUpdated = `
    // --- GESTÃO CORPORATIVA DE OFICINAS & AUDITORIA ---
    function openPrestadoresModal() {
      renderPrestadoresList();
      document.getElementById('modalPrestadores').classList.remove('hidden');
      if (window.lucide) lucide.createIcons();
    }

    function closePrestadoresModal() {
      cancelarEdicaoPrestador();
      document.getElementById('modalPrestadores').classList.add('hidden');
    }

    function renderPrestadoresList() {
      const listContainer = document.getElementById('prestadoresListContainer');
      const oficinas = state.oficinas || state.prestadores || [];
      if (oficinas.length === 0) {
        listContainer.innerHTML = '<div class="p-6 text-center text-slate-400 text-xs">Nenhuma oficina cadastrada na base. Preencha o formulário abaixo.</div>';
        return;
      }

      listContainer.innerHTML = oficinas.map(o => {
        const isBase = o.isBase || o.Flag_Oficina_Base || o.oficinaBase;
        const oId = o.id || o.ID_Oficina;
        const nome = o.nomeFantasia || o.Nome_Fantasia || o.nome;
        const cnpj = o.cnpjh || o.CNPJ || '';
        const msg = o.contatoMensagens || o.Contato_Mensagens || '';
        const cel = o.contatoCelular || o.Contato_Celular || o.telefone || '';
        const email = o.emails || o.Emails || '';
        const tipo = o.tipoAtendimento || o.Tipo_Atendimento || 'Oficina Especializada';
        const mecanico = o.mecanicoResponsavel || o.Mecanico_Responsavel || '';

        return \`
          <div class="p-3 rounded-xl bg-slate-900 border \${isBase ? 'border-amber-500/80 bg-amber-950/20' : 'border-slate-800'} flex items-center justify-between gap-3">
            <div class="space-y-1">
              <div class="flex items-center gap-2">
                <span class="text-sm font-bold text-white">\${nome}</span>
                \${isBase ? '<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">★ OFICINA BASE</span>' : ''}
              </div>
              <div class="text-xs text-slate-400">\${tipo} \${cnpj ? '• CNPJ: ' + cnpj : ''} \${mecanico ? '• Resp: ' + mecanico : ''}</div>
              <div class="text-[11px] text-slate-300 flex items-center gap-3 pt-0.5">
                \${msg ? \`<span class="flex items-center gap-1 text-emerald-400 font-mono"><i data-lucide="message-circle" class="w-3 h-3"></i>WhatsApp: \${msg}</span>\` : ''}
                \${cel ? \`<span class="flex items-center gap-1 text-sky-400 font-mono"><i data-lucide="phone" class="w-3 h-3"></i>\${cel}</span>\` : ''}
                \${email ? \`<span class="flex items-center gap-1 text-slate-400"><i data-lucide="mail" class="w-3 h-3"></i>\${email}</span>\` : ''}
              </div>
            </div>
            <div class="flex items-center gap-1.5 shrink-0">
              \${!isBase ? \`<button type="button" onclick="setOficinaBaseOficial('\${oId}')" title="Tornar Oficina Base" class="p-1.5 rounded-lg bg-slate-800 hover:bg-amber-600 hover:text-white text-amber-400 transition">
                <i data-lucide="star" class="w-4 h-4"></i>
              </button>\` : ''}
              <button type="button" onclick="editarOficina('\${oId}')" title="Editar Oficina" class="p-1.5 rounded-lg bg-slate-800 hover:bg-sky-600 hover:text-white text-slate-300 transition">
                <i data-lucide="edit-3" class="w-4 h-4"></i>
              </button>
              <button type="button" onclick="removerOficina('\${oId}')" title="Excluir Oficina" class="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-600 hover:text-white text-rose-400 transition">
                <i data-lucide="trash-2" class="w-4 h-4"></i>
              </button>
            </div>
          </div>
        \`;
      }).join('');
      if (window.lucide) lucide.createIcons();
    }

    function setOficinaBaseOficial(idOficina) {
      const lista = state.oficinas || state.prestadores || [];
      lista.forEach(o => {
        const match = (String(o.id || o.ID_Oficina) === String(idOficina));
        o.isBase = match;
        o.Flag_Oficina_Base = match;
        o.oficinaBase = match;
      });
      renderCurrentVehicleView();
      renderPrestadoresList();
      if (typeof google !== 'undefined' && google.script && google.script.run) {
        google.script.run.definirOficinaBaseOficial(idOficina);
      }
      if (typeof showToast === 'function') showToast('Oficina base de preferência definida com sucesso!');
    }

    function editarOficina(idOficina) {
      const lista = state.oficinas || state.prestadores || [];
      const o = lista.find(item => String(item.id || item.ID_Oficina) === String(idOficina));
      if (!o) return;
      document.getElementById('pEditId').value = o.id || o.ID_Oficina;
      document.getElementById('pNome').value = o.nomeFantasia || o.Nome_Fantasia || o.nome || '';
      document.getElementById('pNomeJuridico').value = o.nomeJuridico || o.Nome_Juridico || '';
      document.getElementById('pCNPJ').value = o.cnpjh || o.CNPJ || '';
      document.getElementById('pEndereco').value = o.endereco || o.Endereco || '';
      document.getElementById('pWhatsApp').value = o.contatoMensagens || o.Contato_Mensagens || o.whatsapp || '';
      document.getElementById('pTelefone').value = o.contatoCelular || o.Contato_Celular || o.telefone || '';
      document.getElementById('pTelefoneFisico').value = o.telefoneFisico || o.Telefone_Fisico || '';
      document.getElementById('pEmail').value = o.emails || o.Emails || o.email || '';
      document.getElementById('pTipo').value = o.tipoAtendimento || o.Tipo_Atendimento || 'Oficina Mecânica Especializada';
      document.getElementById('pMecanico').value = o.mecanicoResponsavel || o.Mecanico_Responsavel || '';
      document.getElementById('pIsBase').checked = Boolean(o.isBase || o.Flag_Oficina_Base || o.oficinaBase);

      document.getElementById('formPrestadorTitle').innerHTML = '<i data-lucide="edit-3" class="w-4 h-4 text-amber-400"></i><span>Editar Cadastro de Oficina</span>';
      document.getElementById('btnSalvarPrestadorText').innerText = 'Salvar Alterações';
      document.getElementById('btnCancelEditPrestador').classList.remove('hidden');
      if (window.lucide) lucide.createIcons();
    }

    function cancelarEdicaoPrestador() {
      document.getElementById('pEditId').value = '';
      document.getElementById('formNovoPrestador').reset();
      document.getElementById('formPrestadorTitle').innerHTML = '<i data-lucide="plus-circle" class="w-4 h-4"></i><span>Cadastrar Nova Oficina / Prestador</span>';
      document.getElementById('btnSalvarPrestadorText').innerText = 'Salvar Oficina';
      document.getElementById('btnCancelEditPrestador').classList.add('hidden');
      if (window.lucide) lucide.createIcons();
    }

    function removerOficina(idOficina) {
      if (!confirm('Deseja realmente excluir esta oficina da base?')) return;
      if (state.oficinas) state.oficinas = state.oficinas.filter(o => String(o.id || o.ID_Oficina) !== String(idOficina));
      if (state.prestadores) state.prestadores = state.prestadores.filter(o => String(o.id || o.ID_Oficina) !== String(idOficina));
      renderCurrentVehicleView();
      renderPrestadoresList();
      if (typeof google !== 'undefined' && google.script && google.script.run) {
        google.script.run.excluirOficina(idOficina);
      }
      if (typeof showToast === 'function') showToast('Oficina excluída com sucesso.');
    }

    function submitNovoPrestador(e) {
      e.preventDefault();
      const editId = document.getElementById('pEditId').value.trim();
      const oId = editId || ('OFI_' + new Date().getTime());
      const isBase = document.getElementById('pIsBase').checked;

      const oficinaObj = {
        id: oId,
        ID_Oficina: oId,
        nomeFantasia: document.getElementById('pNome').value.trim(),
        Nome_Fantasia: document.getElementById('pNome').value.trim(),
        nomeJuridico: document.getElementById('pNomeJuridico').value.trim(),
        Nome_Juridico: document.getElementById('pNomeJuridico').value.trim(),
        cnpjh: document.getElementById('pCNPJ').value.trim(),
        CNPJ: document.getElementById('pCNPJ').value.trim(),
        endereco: document.getElementById('pEndereco').value.trim(),
        Endereco: document.getElementById('pEndereco').value.trim(),
        contatoMensagens: document.getElementById('pWhatsApp').value.trim(),
        Contato_Mensagens: document.getElementById('pWhatsApp').value.trim(),
        contatoCelular: document.getElementById('pTelefone').value.trim(),
        Contato_Celular: document.getElementById('pTelefone').value.trim(),
        telefoneFisico: document.getElementById('pTelefoneFisico').value.trim(),
        Telefone_Fisico: document.getElementById('pTelefoneFisico').value.trim(),
        emails: document.getElementById('pEmail').value.trim(),
        Emails: document.getElementById('pEmail').value.trim(),
        tipoAtendimento: document.getElementById('pTipo').value,
        Tipo_Atendimento: document.getElementById('pTipo').value,
        mecanicoResponsavel: document.getElementById('pMecanico').value.trim(),
        Mecanico_Responsavel: document.getElementById('pMecanico').value.trim(),
        isBase: isBase,
        Flag_Oficina_Base: isBase
      };

      if (!state.oficinas) state.oficinas = [];
      if (isBase) {
        state.oficinas.forEach(item => { item.isBase = false; item.Flag_Oficina_Base = false; });
      }

      if (editId) {
        const idx = state.oficinas.findIndex(item => String(item.id || item.ID_Oficina) === String(editId));
        if (idx >= 0) state.oficinas[idx] = oficinaObj;
      } else {
        state.oficinas.push(oficinaObj);
      }
      state.prestadores = state.oficinas;

      renderCurrentVehicleView();
      renderPrestadoresList();
      cancelarEdicaoPrestador();

      if (typeof google !== 'undefined' && google.script && google.script.run) {
        google.script.run.salvarOficina(oficinaObj);
      }
      if (typeof showToast === 'function') showToast(editId ? 'Oficina atualizada com sucesso!' : 'Oficina cadastrada com sucesso!');
    }
`;

if (html.includes('function openPrestadoresModal()')) {
  html = html.replace(/function openPrestadoresModal\(\)[\s\S]*?function submitNovoPrestador[\s\S]*?\n    \}/, jsOficinasUpdated.trim());
}

fs.writeFileSync('index.html', html, 'utf8');
fs.writeFileSync('App.html', html, 'utf8');
console.log('✅ Código atualizado com sucesso!');
