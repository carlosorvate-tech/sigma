const fs = require('fs');

// 1. BACKUP MANDATÓRIO
const backupDir = 'backups/checkpoint_v102_prestadores_crud_complete';
if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
fs.copyFileSync('Code.gs', backupDir + '/Code.gs');
fs.copyFileSync('index.html', backupDir + '/index.html');
fs.copyFileSync('App.html', backupDir + '/App.html');
fs.copyFileSync('appsscript.json', backupDir + '/appsscript.json');

// 2. ATUALIZAR CODE.GS COM CRUD COMPLETO E AUTO-ENRIQUECIMENTO
let codeGs = fs.readFileSync('Code.gs', 'utf8');

if (!codeGs.includes("PRESTADORES: 'PRESTADORES_SERVICO'")) {
  codeGs = codeGs.replace("DASH_CALCULOS: 'DASH_CALCULOS'", "DASH_CALCULOS: 'DASH_CALCULOS',\n  PRESTADORES: 'PRESTADORES_SERVICO'");
}

const crudPrestadoresBackend = `
/**
 * CRUD E AUTO-ENRIQUECIMENTO DE PRESTADORES DE SERVIÇO (SIGMA CMMS)
 */
function getPrestadores() {
  const ss = getSpreadsheet();
  const sheet = getOrCreateSheet(ss, SHEET_NAMES.PRESTADORES);
  if (sheet.getLastRow() <= 1) {
    sheet.clear();
    sheet.appendRow(['ID', 'Nome', 'Tipo', 'Especialidade', 'TelefoneFixoCelular', 'WhatsApp', 'Email', 'CidadeUF', 'OficinaBase', 'VeiculoID', 'Observacoes']);
    sheet.appendRow(['PREST-001', 'Oficina Mecânica Precision', 'Oficina Mecânica Especializada', 'Mecânica Geral, Injeção e Câmbio AL4', '(11) 3456-7890', '(11) 98765-4321', 'contato@precisionauto.com.br', 'São Paulo - SP', true, 'VEIC-001', 'Oficina base de preferência']);
    sheet.appendRow(['PREST-002', 'FLORIPA CASA E CONSTRUCAO LTDA', 'Fornecedor de Peças / Insumos', 'Autopeças, Aditivos e Fluídos', '(48) 3269-1000', '(48) 99672-0566', 'fiscal@floripacasa.com.br', 'Florianópolis - SC', false, 'VEIC-001', 'Fornecedor de peças']);
  }
  const data = sheet.getDataRange().getValues();
  const prestadores = [];
  for (let i = 1; i < data.length; i++) {
    if (data[i][0]) {
      prestadores.push({
        id: String(data[i][0]),
        ID: String(data[i][0]),
        nome: String(data[i][1] || ''),
        Nome: String(data[i][1] || ''),
        tipo: String(data[i][2] || 'Oficina Mecânica'),
        Tipo: String(data[i][2] || 'Oficina Mecânica'),
        especialidade: String(data[i][3] || ''),
        Especialidade: String(data[i][3] || ''),
        telefone: String(data[i][4] || ''),
        Telefone: String(data[i][4] || ''),
        whatsapp: String(data[i][5] || ''),
        WhatsApp: String(data[i][5] || ''),
        email: String(data[i][6] || ''),
        Email: String(data[i][6] || ''),
        cidadeUF: String(data[i][7] || ''),
        CidadeUF: String(data[i][7] || ''),
        oficinaBase: Boolean(data[i][8]),
        OficinaBase: Boolean(data[i][8]),
        veiculoId: String(data[i][9] || 'VEIC-001'),
        VeiculoID: String(data[i][9] || 'VEIC-001'),
        observacoes: String(data[i][10] || ''),
        Observacoes: String(data[i][10] || '')
      });
    }
  }
  return prestadores;
}

function savePrestador(p) {
  const ss = getSpreadsheet();
  const sheet = getOrCreateSheet(ss, SHEET_NAMES.PRESTADORES);
  const pId = p.id || p.ID || ('PREST-' + String(new Date().getTime()).slice(-4));
  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(pId)) {
      sheet.getRange(i + 1, 2).setValue(p.nome || data[i][1]);
      sheet.getRange(i + 1, 3).setValue(p.tipo || data[i][2]);
      sheet.getRange(i + 1, 4).setValue(p.especialidade || data[i][3]);
      sheet.getRange(i + 1, 5).setValue(p.telefone || data[i][4]);
      sheet.getRange(i + 1, 6).setValue(p.whatsapp || data[i][5]);
      sheet.getRange(i + 1, 7).setValue(p.email || data[i][6]);
      sheet.getRange(i + 1, 8).setValue(p.cidadeUF || data[i][7]);
      sheet.getRange(i + 1, 9).setValue(Boolean(p.oficinaBase));
      sheet.getRange(i + 1, 10).setValue(p.veiculoId || data[i][9] || 'VEIC-001');
      sheet.getRange(i + 1, 11).setValue(p.observacoes || data[i][10]);
      return { success: true, message: 'Prestador atualizado com sucesso.', id: pId };
    }
  }

  sheet.appendRow([
    pId,
    p.nome || '',
    p.tipo || 'Oficina Mecânica Especializada',
    p.especialidade || '',
    p.telefone || '',
    p.whatsapp || '',
    p.email || '',
    p.cidadeUF || '',
    Boolean(p.oficinaBase),
    p.veiculoId || 'VEIC-001',
    p.observacoes || ''
  ]);
  return { success: true, message: 'Prestador cadastrado com sucesso.', id: pId };
}

function deletePrestador(prestadorId) {
  const ss = getSpreadsheet();
  const sheet = getOrCreateSheet(ss, SHEET_NAMES.PRESTADORES);
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(prestadorId)) {
      sheet.deleteRow(i + 1);
      return { success: true, message: 'Prestador removido com sucesso.' };
    }
  }
  return { success: false, message: 'Prestador não encontrado.' };
}

function definirOficinaBase(prestadorId, veiculoId) {
  const ss = getSpreadsheet();
  const sheet = getOrCreateSheet(ss, SHEET_NAMES.PRESTADORES);
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    const isTarget = String(data[i][0]) === String(prestadorId);
    sheet.getRange(i + 1, 9).setValue(isTarget);
  }
  return { success: true, message: 'Oficina base atualizada com sucesso.' };
}

function enriquecerPrestadorPorDocumento(nomeEmitente, foneDoc, emailDoc) {
  if (!nomeEmitente) return;
  const ss = getSpreadsheet();
  const sheet = getOrCreateSheet(ss, SHEET_NAMES.PRESTADORES);
  const data = sheet.getDataRange().getValues();
  const cleanNome = String(nomeEmitente).trim().toUpperCase();

  for (let i = 1; i < data.length; i++) {
    const nomeBase = String(data[i][1]).trim().toUpperCase();
    if (cleanNome.includes(nomeBase) || nomeBase.includes(cleanNome)) {
      if (foneDoc && !data[i][4]) sheet.getRange(i + 1, 5).setValue(foneDoc);
      if (foneDoc && !data[i][5]) sheet.getRange(i + 1, 6).setValue(foneDoc);
      if (emailDoc && !data[i][6]) sheet.getRange(i + 1, 7).setValue(emailDoc);
      return;
    }
  }
}
`;

if (!codeGs.includes('function getPrestadores()')) {
  codeGs += '\n' + crudPrestadoresBackend;
} else {
  codeGs = codeGs.replace(/function getPrestadores\(\)[\s\S]*?function enriquecerPrestadorPorDocumento[\s\S]*?\n\}/, crudPrestadoresBackend.trim());
}

if (codeGs.includes('getInitialData()') && !codeGs.includes('prestadores:')) {
  codeGs = codeGs.replace('return {\n    vehicles: vehicles,', 'return {\n    prestadores: getPrestadores(),\n    vehicles: vehicles,');
}

fs.writeFileSync('Code.gs', codeGs, 'utf8');

// 3. ATUALIZAR INDEX.HTML E APP.HTML COM MODAL CRUD COMPLETO
let html = fs.readFileSync('index.html', 'utf8');

const oldMenuBtn = `<button onclick="openVehicleModal()" class="w-full text-left px-3 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 text-xs flex items-center gap-2">
            <i data-lucide="plus-circle" class="w-4 h-4 text-emerald-400"></i>
            <span>Cadastrar Novo Veículo</span>
          </button>`;

const newMenuBtn = `<button onclick="openPrestadoresModal()" class="w-full text-left px-3 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 text-xs flex items-center gap-2 transition">
            <i data-lucide="building-2" class="w-4 h-4 text-sky-400"></i>
            <span>Prestadores & Oficinas</span>
          </button>
          ` + oldMenuBtn;

if (html.includes(oldMenuBtn) && !html.includes('openPrestadoresModal()')) {
  html = html.replace(oldMenuBtn, newMenuBtn);
}

const oldOficinaBanner = `document.getElementById('vehicleOficinaText').innerText = ultimaOficina;`;
const newOficinaBanner = `
      const prestadores = state.prestadores || [];
      const oficinaPref = prestadores.find(p => p.oficinaBase || p.OficinaBase);
      const nomeOficinaExibir = oficinaPref ? (oficinaPref.nome || oficinaPref.Nome) : 'Definir Oficina Base';
      const elOficina = document.getElementById('vehicleOficinaText');
      if (elOficina) {
        elOficina.innerHTML = \`<span class="cursor-pointer hover:underline text-amber-300 font-semibold" onclick="openPrestadoresModal()" title="Clique para gerenciar o credenciamento de oficinas">\${nomeOficinaExibir}</span>\`;
      }
`;

if (html.includes(oldOficinaBanner)) {
  html = html.replace(oldOficinaBanner, newOficinaBanner);
}

const modalPrestadoresCrudHtml = `
  <!-- MODAL DE GESTÃO E CREDENCIAMENTO DE PRESTADORES (CRUD COMPLETO) -->
  <div id="modalPrestadores" class="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 hidden">
    <div class="bg-slate-950 border border-slate-800 rounded-2xl w-full max-w-3xl max-h-[92vh] flex flex-col shadow-2xl">
      <div class="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900/60">
        <div class="flex items-center gap-2">
          <i data-lucide="building-2" class="w-5 h-5 text-sky-400"></i>
          <div>
            <h3 class="text-sm font-bold text-white">Credenciamento de Prestadores & Oficina Base</h3>
            <p class="text-[11px] text-slate-400">Gerencie oficinas de preferência, canais de contato e auto-enriquecimento por NF-e.</p>
          </div>
        </div>
        <button type="button" onclick="closePrestadoresModal()" class="text-slate-400 hover:text-white p-1 rounded-lg">
          <i data-lucide="x" class="w-5 h-5"></i>
        </button>
      </div>

      <div class="p-4 overflow-y-auto space-y-5 flex-1">
        <div>
          <h4 class="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center justify-between">
            <span>Prestadores Cadastrados</span>
            <span class="text-[10px] text-slate-400 font-normal">Clique no ícone ⭐ para definir como Oficina Base</span>
          </h4>
          <div id="prestadoresListContainer" class="space-y-2 max-h-60 overflow-y-auto pr-1">
          </div>
        </div>

        <div class="pt-4 border-t border-slate-800">
          <h4 id="formPrestadorTitle" class="text-xs font-bold text-sky-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <i data-lucide="plus-circle" class="w-4 h-4"></i>
            <span>Cadastrar Novo Prestador / Oficina</span>
          </h4>
          <form id="formNovoPrestador" onsubmit="submitNovoPrestador(event)" class="space-y-3">
            <input type="hidden" id="pEditId" value="">

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-semibold text-slate-300 mb-1">Nome / Razão Social</label>
                <input type="text" id="pNome" required placeholder="Ex: Oficina Mecânica Precision" class="w-full bg-slate-900 text-xs text-slate-200 rounded-lg px-3 py-2 border border-slate-700">
              </div>
              <div>
                <label class="block text-xs font-semibold text-slate-300 mb-1">Tipo de Prestador</label>
                <select id="pTipo" required class="w-full bg-slate-900 text-xs text-slate-200 rounded-lg px-2 py-2 border border-slate-700">
                  <option value="Oficina Mecânica Especializada">Oficina Mecânica Especializada</option>
                  <option value="Auto Elétrica & Injeção">Auto Elétrica & Injeção</option>
                  <option value="Centro Automotivo / Troca de Óleo">Centro Automotivo / Troca de Óleo</option>
                  <option value="Concessionária Autorizada">Concessionária Autorizada</option>
                  <option value="Fornecedor de Peças / Insumos">Fornecedor de Peças / Insumos</option>
                </select>
              </div>
            </div>

            <div class="grid grid-cols-3 gap-3">
              <div>
                <label class="block text-xs font-semibold text-slate-300 mb-1">Especialidade / Foco</label>
                <input type="text" id="pEspecialidade" placeholder="Ex: Mecânica Geral PSA" class="w-full bg-slate-900 text-xs text-slate-200 rounded-lg px-3 py-2 border border-slate-700">
              </div>
              <div>
                <label class="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1">
                  <i data-lucide="message-circle" class="w-3.5 h-3.5 text-emerald-400"></i>
                  <span>WhatsApp / Msg App</span>
                </label>
                <input type="text" id="pWhatsApp" placeholder="(11) 98765-4321" class="w-full bg-slate-900 text-xs text-slate-200 rounded-lg px-3 py-2 border border-slate-700 font-mono">
              </div>
              <div>
                <label class="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1">
                  <i data-lucide="phone" class="w-3.5 h-3.5 text-sky-400"></i>
                  <span>Telefone Fixo / Voz</span>
                </label>
                <input type="text" id="pTelefone" placeholder="(11) 3456-7890" class="w-full bg-slate-900 text-xs text-slate-200 rounded-lg px-3 py-2 border border-slate-700 font-mono">
              </div>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1">
                  <i data-lucide="mail" class="w-3.5 h-3.5 text-amber-400"></i>
                  <span>E-mail de Contato</span>
                </label>
                <input type="email" id="pEmail" placeholder="contato@oficina.com.br" class="w-full bg-slate-900 text-xs text-slate-200 rounded-lg px-3 py-2 border border-slate-700">
              </div>
              <div>
                <label class="block text-xs font-semibold text-slate-300 mb-1">Cidade / UF</label>
                <input type="text" id="pCidadeUF" placeholder="São Paulo - SP" class="w-full bg-slate-900 text-xs text-slate-200 rounded-lg px-3 py-2 border border-slate-700">
              </div>
            </div>

            <div class="flex items-center justify-between pt-2">
              <label class="flex items-center gap-2 text-xs text-amber-300 cursor-pointer">
                <input type="checkbox" id="pIsBase" class="rounded bg-slate-900 border-slate-700 text-amber-500">
                <span class="font-semibold">Definir como Oficina Base de Preferência do Veículo</span>
              </label>

              <div class="flex items-center gap-2">
                <button type="button" id="btnCancelEditPrestador" onclick="cancelarEdicaoPrestador()" class="px-3.5 py-2 rounded-lg bg-slate-800 text-slate-300 text-xs hidden">Cancelar Edição</button>
                <button type="submit" class="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs flex items-center gap-1.5 shadow transition">
                  <i data-lucide="save" class="w-4 h-4"></i>
                  <span id="btnSalvarPrestadorText">Salvar Prestador</span>
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
`;

if (!html.includes('id="modalPrestadores"')) {
  html = html.replace('</body>', modalPrestadoresCrudHtml + '\n</body>');
}

const jsPrestadoresCrud = `
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
      const prestadores = state.prestadores || [];
      if (prestadores.length === 0) {
        listContainer.innerHTML = '<div class="p-6 text-center text-slate-400 text-xs">Nenhum prestador cadastrado. Cadastre uma oficina de preferência abaixo.</div>';
        return;
      }

      listContainer.innerHTML = prestadores.map(p => {
        const isBase = p.oficinaBase || p.OficinaBase;
        const pId = p.id || p.ID;
        const nome = p.nome || p.Nome;
        const tipo = p.tipo || p.Tipo || 'Oficina Mecânica';
        const esp = p.especialidade || p.Especialidade || 'Mecânica Geral';
        const whatsapp = p.whatsapp || p.WhatsApp || '';
        const fone = p.telefone || p.Telefone || '';
        const email = p.email || p.Email || '';

        return \`
          <div class="p-3 rounded-xl bg-slate-900 border \${isBase ? 'border-amber-500/80 bg-amber-950/20' : 'border-slate-800'} flex items-center justify-between gap-3">
            <div class="space-y-0.5">
              <div class="flex items-center gap-2">
                <span class="text-sm font-bold text-white">\${nome}</span>
                \${isBase ? '<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">★ OFICINA BASE</span>' : ''}
              </div>
              <div class="text-xs text-slate-400">\${tipo} • \${esp}</div>
              <div class="text-[11px] text-slate-300 flex items-center gap-3 pt-0.5">
                \${whatsapp ? \`<span class="flex items-center gap-1 text-emerald-400 font-mono"><i data-lucide="message-circle" class="w-3 h-3"></i>\${whatsapp}</span>\` : ''}
                \${fone ? \`<span class="flex items-center gap-1 text-sky-400 font-mono"><i data-lucide="phone" class="w-3 h-3"></i>\${fone}</span>\` : ''}
                \${email ? \`<span class="flex items-center gap-1 text-slate-400"><i data-lucide="mail" class="w-3 h-3"></i>\${email}</span>\` : ''}
              </div>
            </div>
            <div class="flex items-center gap-1.5 shrink-0">
              \${!isBase ? \`<button type="button" onclick="setOficinaBase('\${pId}')" title="Definir como Oficina Base" class="p-1.5 rounded-lg bg-slate-800 hover:bg-amber-600 hover:text-white text-amber-400 transition">
                <i data-lucide="star" class="w-4 h-4"></i>
              </button>\` : ''}
              <button type="button" onclick="editarPrestador('\${pId}')" title="Editar Prestador" class="p-1.5 rounded-lg bg-slate-800 hover:bg-sky-600 hover:text-white text-slate-300 transition">
                <i data-lucide="edit-3" class="w-4 h-4"></i>
              </button>
              <button type="button" onclick="removerPrestador('\${pId}')" title="Excluir Prestador" class="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-600 hover:text-white text-rose-400 transition">
                <i data-lucide="trash-2" class="w-4 h-4"></i>
              </button>
            </div>
          </div>
        \`;
      }).join('');
      if (window.lucide) lucide.createIcons();
    }

    function setOficinaBase(prestadorId) {
      if (state.prestadores) {
        state.prestadores.forEach(p => {
          const match = (String(p.id || p.ID) === String(prestadorId));
          p.oficinaBase = match;
          p.OficinaBase = match;
        });
      }
      renderCurrentVehicleView();
      renderPrestadoresList();
      if (typeof google !== 'undefined' && google.script && google.script.run) {
        google.script.run.definirOficinaBase(prestadorId, state.selectedVehicleId || 'VEIC-001');
      }
      if (typeof showToast === 'function') showToast('Oficina base de preferência atualizada!');
    }

    function editarPrestador(prestadorId) {
      const p = (state.prestadores || []).find(item => String(item.id || item.ID) === String(prestadorId));
      if (!p) return;
      document.getElementById('pEditId').value = p.id || p.ID;
      document.getElementById('pNome').value = p.nome || p.Nome || '';
      document.getElementById('pTipo').value = p.tipo || p.Tipo || 'Oficina Mecânica Especializada';
      document.getElementById('pEspecialidade').value = p.especialidade || p.Especialidade || '';
      document.getElementById('pWhatsApp').value = p.whatsapp || p.WhatsApp || '';
      document.getElementById('pTelefone').value = p.telefone || p.Telefone || '';
      document.getElementById('pEmail').value = p.email || p.Email || '';
      document.getElementById('pCidadeUF').value = p.cidadeUF || p.CidadeUF || '';
      document.getElementById('pIsBase').checked = Boolean(p.oficinaBase || p.OficinaBase);

      document.getElementById('formPrestadorTitle').innerHTML = '<i data-lucide="edit-3" class="w-4 h-4 text-amber-400"></i><span>Editar Prestador / Oficina</span>';
      document.getElementById('btnSalvarPrestadorText').innerText = 'Salvar Alterações';
      document.getElementById('btnCancelEditPrestador').classList.remove('hidden');
      if (window.lucide) lucide.createIcons();
    }

    function cancelarEdicaoPrestador() {
      document.getElementById('pEditId').value = '';
      document.getElementById('formNovoPrestador').reset();
      document.getElementById('formPrestadorTitle').innerHTML = '<i data-lucide="plus-circle" class="w-4 h-4"></i><span>Cadastrar Novo Prestador / Oficina</span>';
      document.getElementById('btnSalvarPrestadorText').innerText = 'Salvar Prestador';
      document.getElementById('btnCancelEditPrestador').classList.add('hidden');
      if (window.lucide) lucide.createIcons();
    }

    function removerPrestador(prestadorId) {
      if (!confirm('Deseja realmente remover este prestador?')) return;
      state.prestadores = (state.prestadores || []).filter(item => String(item.id || item.ID) !== String(prestadorId));
      renderCurrentVehicleView();
      renderPrestadoresList();
      if (typeof google !== 'undefined' && google.script && google.script.run) {
        google.script.run.deletePrestador(prestadorId);
      }
      if (typeof showToast === 'function') showToast('Prestador removido com sucesso.');
    }

    function submitNovoPrestador(e) {
      e.preventDefault();
      const editId = document.getElementById('pEditId').value.trim();
      const pId = editId || ('PREST-' + String(new Date().getTime()).slice(-4));
      const isBase = document.getElementById('pIsBase').checked;

      const pObj = {
        id: pId,
        ID: pId,
        nome: document.getElementById('pNome').value.trim(),
        tipo: document.getElementById('pTipo').value,
        especialidade: document.getElementById('pEspecialidade').value.trim(),
        whatsapp: document.getElementById('pWhatsApp').value.trim(),
        telefone: document.getElementById('pTelefone').value.trim(),
        email: document.getElementById('pEmail').value.trim(),
        cidadeUF: document.getElementById('pCidadeUF').value.trim(),
        oficinaBase: isBase,
        OficinaBase: isBase,
        veiculoId: state.selectedVehicleId || 'VEIC-001'
      };

      if (!state.prestadores) state.prestadores = [];
      if (isBase) {
        state.prestadores.forEach(item => { item.oficinaBase = false; item.OficinaBase = false; });
      }

      if (editId) {
        const idx = state.prestadores.findIndex(item => String(item.id || item.ID) === String(editId));
        if (idx >= 0) state.prestadores[idx] = pObj;
      } else {
        state.prestadores.push(pObj);
      }

      renderCurrentVehicleView();
      renderPrestadoresList();
      cancelarEdicaoPrestador();

      if (typeof google !== 'undefined' && google.script && google.script.run) {
        google.script.run.savePrestador(pObj);
      }
      if (typeof showToast === 'function') showToast(editId ? 'Prestador atualizado com sucesso!' : 'Prestador cadastrado com sucesso!');
    }
`;

if (!html.includes('function openPrestadoresModal()')) {
  html = html.replace('function openEditVehicleModal()', jsPrestadoresCrud + '\n    function openEditVehicleModal()');
}

fs.writeFileSync('index.html', html, 'utf8');
fs.writeFileSync('App.html', html, 'utf8');
console.log('✅ Arquivos locais atualizados com sucesso!');
