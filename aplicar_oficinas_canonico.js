const fs = require('fs');

// 1. BACKUP MANDATÓRIO
const backupDir = 'backups/checkpoint_v104_modulo_oficinas_12_campos_verified';
if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
fs.copyFileSync('Code.gs', backupDir + '/Code.gs');
fs.copyFileSync('index.html', backupDir + '/index.html');
fs.copyFileSync('App.html', backupDir + '/App.html');
fs.copyFileSync('appsscript.json', backupDir + '/appsscript.json');

// 2. ATUALIZAR CODE.GS
let codeGs = fs.readFileSync('Code.gs', 'utf8');

const backendOficinas = `
/**
 * MÓDULO CORPORATIVO DE GESTÃO DE OFICINAS - 12 CAMPOS OFICIAIS (SIGMA CMMS)
 */
function salvarOficina(dadosOficina) {
  var ss = getSpreadsheet();
  var aba = ss.getSheetByName("Oficinas") || ss.insertSheet("Oficinas");
  
  if (aba.getLastRow() === 0) {
    aba.appendRow([
      "ID_Oficina", "Nome_Fantasia", "Nome_Juridico", "CNPJ", "Endereco", 
      "Contato_Mensagens", "Contato_Celular", "Telefone_Fisico", "Emails", 
      "Tipo_Atendimento", "Mecanico_Responsavel", "Flag_Oficina_Base"
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
    dadosOficina.tipoAtendimento || dadosOficina.Tipo_Atendimento || "Mecânica Geral",
    dadosOficina.mecanicoResponsavel || dadosOficina.Mecanico_Responsavel || "",
    isBase ? "TRUE" : "FALSE"
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
      "Tipo_Atendimento", "Mecanico_Responsavel", "Flag_Oficina_Base"
    ]);
    aba.appendRow([
      "OFI_001", "Oficina Mecânica Precision Auto", "Precision Manutenções Automotivas LTDA", "12.345.678/0001-90",
      "Av. Principal, 1500 - São Paulo, SP", "5511987654321", "(11) 98765-4321", "(11) 3456-7890", "contato@precisionauto.com.br",
      "Mecânica Geral e Injeção", "Carlos Silva (Chefe de Oficina)", "TRUE"
    ]);
    aba.appendRow([
      "OFI_002", "FLORIPA CASA E CONSTRUCAO LTDA", "Floripa Casa e Construção LTDA", "59.997.717/0001-00",
      "Estrada Vereador Onildo Lemos, 728 - Florianópolis, SC", "5548996720566", "(48) 99672-0566", "(48) 3269-1000", "fiscal@floripacasa.com.br",
      "Fornecedor de Peças / Insumos", "Central de Vendas", "FALSE"
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
  codeGs += '\n' + backendOficinas;
}

if (codeGs.includes('getInitialData()') && !codeGs.includes('oficinas:')) {
  codeGs = codeGs.replace('return {\n    vehicles: vehicles,', 'return {\n    oficinas: getOficinas(),\n    vehicles: vehicles,');
}

fs.writeFileSync('Code.gs', codeGs, 'utf8');

// 3. RECUPERAR INDEX.HTML
let html = fs.readFileSync('index.html', 'utf8');

if (!html.includes('openOficinasModal()')) {
  const menuOficinaBtn = '<button onclick="openOficinasModal()" class="w-full text-left px-3 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 text-xs flex items-center gap-2 transition">\n            <i data-lucide="building-2" class="w-4 h-4 text-sky-400"></i>\n            <span>Oficinas Credenciadas</span>\n          </button>\n          <button onclick="openVehicleModal()"';
  html = html.replace('<button onclick="openVehicleModal()"', menuOficinaBtn);
}

const oldBannerRegex = /document\.getElementById\('vehicleOficinaText'\)\.innerText\s*=\s*ultimaOficina;/g;
if (oldBannerRegex.test(html)) {
  html = html.replace(oldBannerRegex, `
      const oficinas = state.oficinas || [];
      const ofBase = oficinas.find(o => o.isBase || o.Flag_Oficina_Base);
      const nomeOficinaExibir = ofBase ? (ofBase.nomeFantasia || ofBase.Nome_Fantasia) : 'Definir Oficina Base';
      const elOf = document.getElementById('vehicleOficinaText');
      if (elOf) elOf.innerHTML = '<span class="cursor-pointer hover:underline text-amber-300 font-semibold" onclick="openOficinasModal()">' + nomeOficinaExibir + '</span>';
  `);
}

if (!html.includes('id="modalOficinasSIGMA"')) {
  const modalHTML = `
  <!-- MODAL DE GESTÃO DE OFICINAS (12 CAMPOS OFICIAIS) -->
  <div id="modalOficinasSIGMA" class="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 hidden">
    <div class="bg-slate-950 border border-slate-800 rounded-2xl w-full max-w-3xl max-h-[92vh] flex flex-col shadow-2xl">
      <div class="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900/60">
        <div class="flex items-center gap-2">
          <i data-lucide="building-2" class="w-5 h-5 text-sky-400"></i>
          <div>
            <h3 class="text-sm font-bold text-white">Gestão de Oficinas Credenciadas & Oficina Base</h3>
            <p class="text-[11px] text-slate-400">Base oficial de 12 campos: credenciamento e acionamento direto.</p>
          </div>
        </div>
        <button type="button" onclick="closeOficinasModal()" class="text-slate-400 hover:text-white p-1 rounded-lg">
          <i data-lucide="x" class="w-5 h-5"></i>
        </button>
      </div>

      <div class="p-4 overflow-y-auto space-y-5 flex-1">
        <div>
          <h4 class="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center justify-between">
            <span>Oficinas Cadastradas</span>
            <span class="text-[10px] text-slate-400 font-normal">Clique no ícone ⭐ para eleger a Oficina Base</span>
          </h4>
          <div id="oficinasListContainer" class="space-y-2 max-h-56 overflow-y-auto pr-1"></div>
        </div>

        <div class="pt-4 border-t border-slate-800">
          <h4 id="formOficinaTitle" class="text-xs font-bold text-sky-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <i data-lucide="plus-circle" class="w-4 h-4"></i>
            <span>Cadastrar Nova Oficina</span>
          </h4>
          <form id="formOficinaSIGMA" onsubmit="submitFormOficina(event)" class="space-y-3">
            <input type="hidden" id="ofiEditId" value="">

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-semibold text-slate-300 mb-1">Nome Fantasia (Comercial)</label>
                <input type="text" id="ofiNomeFantasia" required placeholder="Ex: Oficina Mecânica Precision Auto" class="w-full bg-slate-900 text-xs text-slate-200 rounded-lg px-3 py-2 border border-slate-700">
              </div>
              <div>
                <label class="block text-xs font-semibold text-slate-300 mb-1">Nome Jurídico (Razão Social)</label>
                <input type="text" id="ofiNomeJuridico" placeholder="Ex: Precision Manutenções Automotivas LTDA" class="w-full bg-slate-900 text-xs text-slate-200 rounded-lg px-3 py-2 border border-slate-700">
              </div>
            </div>

            <div class="grid grid-cols-3 gap-3">
              <div>
                <label class="block text-xs font-semibold text-slate-300 mb-1">CNPJ Formatado</label>
                <input type="text" id="ofiCNPJ" placeholder="00.000.000/0001-00" class="w-full bg-slate-900 text-xs text-slate-200 rounded-lg px-3 py-2 border border-slate-700 font-mono">
              </div>
              <div>
                <label class="block text-xs font-semibold text-slate-300 mb-1">Tipo de Atendimento</label>
                <select id="ofiTipoAtendimento" required class="w-full bg-slate-900 text-xs text-slate-200 rounded-lg px-2 py-2 border border-slate-700">
                  <option value="Mecânica Geral e Injeção">Mecânica Geral e Injeção</option>
                  <option value="Mecânica Pesada">Mecânica Pesada</option>
                  <option value="Hidráulica e Suspensão">Hidráulica e Suspensão</option>
                  <option value="Injeção Eletrônica e Diagnóstico">Injeção Eletrônica e Diagnóstico</option>
                  <option value="Corretiva Geral">Corretiva Geral</option>
                  <option value="Troca de Óleo e Lubrificação">Troca de Óleo e Lubrificação</option>
                  <option value="Concessionária Autorizada">Concessionária Autorizada</option>
                  <option value="Fornecedor de Peças / Insumos">Fornecedor de Peças / Insumos</option>
                </select>
              </div>
              <div>
                <label class="block text-xs font-semibold text-slate-300 mb-1">Mecânico / Técnico Responsável</label>
                <input type="text" id="ofiMecanico" placeholder="Ex: Carlos Silva (Chefe de Oficina)" class="w-full bg-slate-900 text-xs text-slate-200 rounded-lg px-3 py-2 border border-slate-700">
              </div>
            </div>

            <div class="grid grid-cols-3 gap-3">
              <div>
                <label class="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1">
                  <i data-lucide="message-circle" class="w-3.5 h-3.5 text-emerald-400"></i>
                  <span>Contato Mensagens (WhatsApp)</span>
                </label>
                <input type="text" id="ofiWhatsApp" required placeholder="5511987654321" class="w-full bg-slate-900 text-xs text-slate-200 rounded-lg px-3 py-2 border border-slate-700 font-mono">
              </div>
              <div>
                <label class="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1">
                  <i data-lucide="phone" class="w-3.5 h-3.5 text-sky-400"></i>
                  <span>Contato Celular (Voz)</span>
                </label>
                <input type="text" id="ofiCelular" placeholder="(11) 98765-4321" class="w-full bg-slate-900 text-xs text-slate-200 rounded-lg px-3 py-2 border border-slate-700 font-mono">
              </div>
              <div>
                <label class="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1">
                  <i data-lucide="phone-call" class="w-3.5 h-3.5 text-slate-400"></i>
                  <span>Telefone Físico (Fixo)</span>
                </label>
                <input type="text" id="ofiFixo" placeholder="(11) 3456-7890" class="w-full bg-slate-900 text-xs text-slate-200 rounded-lg px-3 py-2 border border-slate-700 font-mono">
              </div>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1">
                  <i data-lucide="mail" class="w-3.5 h-3.5 text-amber-400"></i>
                  <span>E-mails (Contato / Orçamentos)</span>
                </label>
                <input type="email" id="ofiEmail" placeholder="contato@oficina.com.br" class="w-full bg-slate-900 text-xs text-slate-200 rounded-lg px-3 py-2 border border-slate-700">
              </div>
              <div>
                <label class="block text-xs font-semibold text-slate-300 mb-1">Endereço (Logística, Cidade, Região)</label>
                <input type="text" id="ofiEndereco" placeholder="Av. Principal, 1500 - São Paulo, SP" class="w-full bg-slate-900 text-xs text-slate-200 rounded-lg px-3 py-2 border border-slate-700">
              </div>
            </div>

            <div class="flex items-center justify-between pt-2">
              <label class="flex items-center gap-2 text-xs text-amber-300 cursor-pointer">
                <input type="checkbox" id="ofiIsBase" class="rounded bg-slate-900 border-slate-700 text-amber-500">
                <span class="font-semibold">Definir como Oficina Base de Preferência do Veículo</span>
              </label>

              <div class="flex items-center gap-2">
                <button type="button" id="btnCancelEditOficina" onclick="cancelarEdicaoOficina()" class="px-3.5 py-2 rounded-lg bg-slate-800 text-slate-300 text-xs hidden">Cancelar</button>
                <button type="submit" class="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs flex items-center gap-1.5 shadow transition">
                  <i data-lucide="save" class="w-4 h-4"></i>
                  <span id="btnSalvarOficinaText">Salvar Oficina</span>
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>

  <script>
    function openOficinasModal() {
      renderOficinasList();
      document.getElementById('modalOficinasSIGMA').classList.remove('hidden');
      if (window.lucide) lucide.createIcons();
    }

    function closeOficinasModal() {
      cancelarEdicaoOficina();
      document.getElementById('modalOficinasSIGMA').classList.add('hidden');
    }

    function renderOficinasList() {
      const container = document.getElementById('oficinasListContainer');
      const oficinas = state.oficinas || [];
      if (oficinas.length === 0) {
        container.innerHTML = '<div class="p-6 text-center text-slate-400 text-xs">Nenhuma oficina cadastrada. Cadastre uma nova oficina abaixo.</div>';
        return;
      }

      container.innerHTML = oficinas.map(o => {
        const isBase = o.isBase || o.Flag_Oficina_Base;
        const oId = o.id || o.ID_Oficina;
        const nome = o.nomeFantasia || o.Nome_Fantasia;
        const cnpj = o.cnpjh || o.CNPJ || '';
        const msg = o.contatoMensagens || o.Contato_Mensagens || '';
        const cel = o.contatoCelular || o.Contato_Celular || '';
        const email = o.emails || o.Emails || '';
        const tipo = o.tipoAtendimento || o.Tipo_Atendimento || 'Mecânica Geral';
        const mecanico = o.mecanicoResponsavel || o.Mecanico_Responsavel || '';

        return `
          <div class="p-3 rounded-xl bg-slate-900 border ${isBase ? 'border-amber-500/80 bg-amber-950/20' : 'border-slate-800'} flex items-center justify-between gap-3">
            <div class="space-y-1">
              <div class="flex items-center gap-2">
                <span class="text-sm font-bold text-white">${nome}</span>
                ${isBase ? '<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">★ OFICINA BASE</span>' : ''}
              </div>
              <div class="text-xs text-slate-400">${tipo} ${cnpj ? '• CNPJ: ' + cnpj : ''} ${mecanico ? '• Resp: ' + mecanico : ''}</div>
              <div class="text-[11px] text-slate-300 flex items-center gap-3 pt-0.5">
                ${msg ? `<span class="flex items-center gap-1 text-emerald-400 font-mono"><i data-lucide="message-circle" class="w-3 h-3"></i>WhatsApp: ${msg}</span>` : ''}
                ${cel ? `<span class="flex items-center gap-1 text-sky-400 font-mono"><i data-lucide="phone" class="w-3 h-3"></i>${cel}</span>` : ''}
                ${email ? `<span class="flex items-center gap-1 text-slate-400"><i data-lucide="mail" class="w-3 h-3"></i>${email}</span>` : ''}
              </div>
            </div>
            <div class="flex items-center gap-1.5 shrink-0">
              ${!isBase ? `<button type="button" onclick="setOficinaBaseOficial('${oId}')" title="Tornar Oficina Base" class="p-1.5 rounded-lg bg-slate-800 hover:bg-amber-600 hover:text-white text-amber-400 transition">
                <i data-lucide="star" class="w-4 h-4"></i>
              </button>` : ''}
              <button type="button" onclick="editarOficina('${oId}')" title="Editar Oficina" class="p-1.5 rounded-lg bg-slate-800 hover:bg-sky-600 hover:text-white text-slate-300 transition">
                <i data-lucide="edit-3" class="w-4 h-4"></i>
              </button>
              <button type="button" onclick="removerOficina('${oId}')" title="Excluir Oficina" class="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-600 hover:text-white text-rose-400 transition">
                <i data-lucide="trash-2" class="w-4 h-4"></i>
              </button>
            </div>
          </div>
        `;
      }).join('');
      if (window.lucide) lucide.createIcons();
    }

    function setOficinaBaseOficial(idOficina) {
      if (state.oficinas) {
        state.oficinas.forEach(o => {
          const match = (String(o.id || o.ID_Oficina) === String(idOficina));
          o.isBase = match;
          o.Flag_Oficina_Base = match;
        });
      }
      renderCurrentVehicleView();
      renderOficinasList();
      if (typeof google !== 'undefined' && google.script && google.script.run) {
        google.script.run.definirOficinaBaseOficial(idOficina);
      }
      if (typeof showToast === 'function') showToast('Oficina base definida com sucesso!');
    }

    function editarOficina(idOficina) {
      const o = (state.oficinas || []).find(item => String(item.id || item.ID_Oficina) === String(idOficina));
      if (!o) return;
      document.getElementById('ofiEditId').value = o.id || o.ID_Oficina;
      document.getElementById('ofiNomeFantasia').value = o.nomeFantasia || o.Nome_Fantasia || '';
      document.getElementById('ofiNomeJuridico').value = o.nomeJuridico || o.Nome_Juridico || '';
      document.getElementById('ofiCNPJ').value = o.cnpjh || o.CNPJ || '';
      document.getElementById('ofiEndereco').value = o.endereco || o.Endereco || '';
      document.getElementById('ofiWhatsApp').value = o.contatoMensagens || o.Contato_Mensagens || '';
      document.getElementById('ofiCelular').value = o.contatoCelular || o.Contato_Celular || '';
      document.getElementById('ofiFixo').value = o.telefoneFisico || o.Telefone_Fisico || '';
      document.getElementById('ofiEmail').value = o.emails || o.Emails || '';
      document.getElementById('ofiTipoAtendimento').value = o.tipoAtendimento || o.Tipo_Atendimento || 'Mecânica Geral e Injeção';
      document.getElementById('ofiMecanico').value = o.mecanicoResponsavel || o.Mecanico_Responsavel || '';
      document.getElementById('ofiIsBase').checked = Boolean(o.isBase || o.Flag_Oficina_Base);

      document.getElementById('formOficinaTitle').innerHTML = '<i data-lucide="edit-3" class="w-4 h-4 text-amber-400"></i><span>Editar Cadastro de Oficina</span>';
      document.getElementById('btnSalvarOficinaText').innerText = 'Salvar Alterações';
      document.getElementById('btnCancelEditOficina').classList.remove('hidden');
      if (window.lucide) lucide.createIcons();
    }

    function cancelarEdicaoOficina() {
      document.getElementById('ofiEditId').value = '';
      document.getElementById('formOficinaSIGMA').reset();
      document.getElementById('formOficinaTitle').innerHTML = '<i data-lucide="plus-circle" class="w-4 h-4"></i><span>Cadastrar Nova Oficina</span>';
      document.getElementById('btnSalvarOficinaText').innerText = 'Salvar Oficina';
      document.getElementById('btnCancelEditOficina').classList.add('hidden');
      if (window.lucide) lucide.createIcons();
    }

    function removerOficina(idOficina) {
      if (!confirm('Deseja realmente excluir esta oficina da base?')) return;
      if (state.oficinas) state.oficinas = state.oficinas.filter(o => String(o.id || o.ID_Oficina) !== String(idOficina));
      renderCurrentVehicleView();
      renderOficinasList();
      if (typeof google !== 'undefined' && google.script && google.script.run) {
        google.script.run.excluirOficina(idOficina);
      }
      if (typeof showToast === 'function') showToast('Oficina excluída com sucesso.');
    }

    function submitFormOficina(e) {
      e.preventDefault();
      const editId = document.getElementById('ofiEditId').value.trim();
      const oId = editId || ('OFI_' + new Date().getTime());
      const isBase = document.getElementById('ofiIsBase').checked;

      const ofiObj = {
        id: oId,
        ID_Oficina: oId,
        nomeFantasia: document.getElementById('ofiNomeFantasia').value.trim(),
        Nome_Fantasia: document.getElementById('ofiNomeFantasia').value.trim(),
        nomeJuridico: document.getElementById('ofiNomeJuridico').value.trim(),
        Nome_Juridico: document.getElementById('ofiNomeJuridico').value.trim(),
        cnpjh: document.getElementById('ofiCNPJ').value.trim(),
        CNPJ: document.getElementById('ofiCNPJ').value.trim(),
        endereco: document.getElementById('ofiEndereco').value.trim(),
        Endereco: document.getElementById('ofiEndereco').value.trim(),
        contatoMensagens: document.getElementById('ofiWhatsApp').value.trim(),
        Contato_Mensagens: document.getElementById('ofiWhatsApp').value.trim(),
        contatoCelular: document.getElementById('ofiCelular').value.trim(),
        Contato_Celular: document.getElementById('ofiCelular').value.trim(),
        telefoneFisico: document.getElementById('ofiFixo').value.trim(),
        Telefone_Fisico: document.getElementById('ofiFixo').value.trim(),
        emails: document.getElementById('ofiEmail').value.trim(),
        Emails: document.getElementById('ofiEmail').value.trim(),
        tipoAtendimento: document.getElementById('ofiTipoAtendimento').value,
        Tipo_Atendimento: document.getElementById('ofiTipoAtendimento').value,
        mecanicoResponsavel: document.getElementById('ofiMecanico').value.trim(),
        Mecanico_Responsavel: document.getElementById('ofiMecanico').value.trim(),
        isBase: isBase,
        Flag_Oficina_Base: isBase
      };

      if (!state.oficinas) state.oficinas = [];
      if (isBase) {
        state.oficinas.forEach(item => { item.isBase = false; item.Flag_Oficina_Base = false; });
      }

      if (editId) {
        const idx = state.oficinas.findIndex(item => String(item.id || item.ID_Oficina) === String(editId));
        if (idx >= 0) state.oficinas[idx] = ofiObj;
      } else {
        state.oficinas.push(ofiObj);
      }

      renderCurrentVehicleView();
      renderOficinasList();
      cancelarEdicaoOficina();

      if (typeof google !== 'undefined' && google.script && google.script.run) {
        google.script.run.salvarOficina(ofiObj);
      }
      if (typeof showToast === 'function') showToast(editId ? 'Oficina atualizada com sucesso!' : 'Oficina cadastrada com sucesso!');
    }
  </script>
  `;
  html = html.replace('</body>', modalHTML + '\n</body>');
}

fs.writeFileSync('index.html', html, 'utf8');
fs.writeFileSync('App.html', html, 'utf8');
console.log('✅ Arquivos atualizados com sucesso!');
