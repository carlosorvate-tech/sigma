const fs = require('fs');

// 1. BACKUP DE SEGURANÇA MANDATÓRIO
const backupDir = 'backups/checkpoint_v101_pre_prestadores_module';
if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
fs.copyFileSync('Code.gs', backupDir + '/Code.gs');
fs.copyFileSync('index.html', backupDir + '/index.html');
fs.copyFileSync('App.html', backupDir + '/App.html');
fs.copyFileSync('appsscript.json', backupDir + '/appsscript.json');

// 2. ATUALIZAR CODE.GS
let codeGs = fs.readFileSync('Code.gs', 'utf8');

if (!codeGs.includes("PRESTADORES: 'PRESTADORES_SERVICO'")) {
  codeGs = codeGs.replace("DASH_CALCULOS: 'DASH_CALCULOS'", "DASH_CALCULOS: 'DASH_CALCULOS',\n  PRESTADORES: 'PRESTADORES_SERVICO'");
}

const prestadoresBackend = `
/**
 * MÓDULO ANEXO DE PRESTADORES DE SERVIÇO E OFICINA BASE
 */
function getPrestadores() {
  const ss = getSpreadsheet();
  const sheet = getOrCreateSheet(ss, SHEET_NAMES.PRESTADORES);
  if (sheet.getLastRow() <= 1) {
    sheet.clear();
    sheet.appendRow(['ID', 'Nome', 'Tipo', 'Especialidade', 'Telefone', 'WhatsApp', 'Email', 'CidadeUF', 'OficinaBase', 'VeiculoID', 'Observacoes']);
    sheet.appendRow(['PREST-001', 'Oficina Especializada Precision Auto', 'Oficina Mecânica Especializada', 'Mecânica Geral, Injeção e Câmbio AL4', '(11) 98765-4321', '5511987654321', 'contato@precisionauto.com.br', 'São Paulo - SP', true, 'VEIC-001', 'Oficina base de preferência do veículo']);
    sheet.appendRow(['PREST-002', 'FLORIPA CASA E CONSTRUCAO LTDA', 'Fornecedor de Peças / Insumos', 'Autopeças, Aditivos e Fluídos', '(48) 99672-0566', '5548996720566', 'contato@floripacasa.com.br', 'Florianópolis - SC', false, 'VEIC-001', 'Fornecedor de peças e aditivos']);
  }
  const data = sheet.getDataRange().getValues();
  const prestadores = [];
  for (let i = 1; i < data.length; i++) {
    if (data[i][0]) {
      prestadores.push({
        id: data[i][0],
        ID: data[i][0],
        nome: data[i][1],
        Nome: data[i][1],
        tipo: data[i][2],
        Tipo: data[i][2],
        especialidade: data[i][3],
        Especialidade: data[i][3],
        telefone: data[i][4],
        Telefone: data[i][4],
        whatsapp: data[i][5],
        WhatsApp: data[i][5],
        email: data[i][6],
        Email: data[i][6],
        cidadeUF: data[i][7],
        CidadeUF: data[i][7],
        oficinaBase: Boolean(data[i][8]),
        OficinaBase: Boolean(data[i][8]),
        veiculoId: data[i][9],
        VeiculoID: data[i][9],
        observacoes: data[i][10],
        Observacoes: data[i][10]
      });
    }
  }
  return prestadores;
}

function savePrestador(prestador) {
  const ss = getSpreadsheet();
  const sheet = getOrCreateSheet(ss, SHEET_NAMES.PRESTADORES);
  const pId = prestador.id || prestador.ID || ('PREST-' + String(new Date().getTime()).slice(-4));
  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(pId)) {
      sheet.getRange(i + 1, 2).setValue(prestador.nome || data[i][1]);
      sheet.getRange(i + 1, 3).setValue(prestador.tipo || data[i][2]);
      sheet.getRange(i + 1, 4).setValue(prestador.especialidade || data[i][3]);
      sheet.getRange(i + 1, 5).setValue(prestador.telefone || data[i][4]);
      sheet.getRange(i + 1, 6).setValue(prestador.whatsapp || data[i][5]);
      sheet.getRange(i + 1, 7).setValue(prestador.email || data[i][6]);
      sheet.getRange(i + 1, 8).setValue(prestador.cidadeUF || data[i][7]);
      sheet.getRange(i + 1, 9).setValue(Boolean(prestador.oficinaBase));
      sheet.getRange(i + 1, 10).setValue(prestador.veiculoId || data[i][9] || 'VEIC-001');
      sheet.getRange(i + 1, 11).setValue(prestador.observacoes || data[i][10]);
      return { success: true, message: 'Prestador atualizado com sucesso.', id: pId };
    }
  }

  sheet.appendRow([
    pId,
    prestador.nome || '',
    prestador.tipo || 'Oficina Mecânica Especializada',
    prestador.especialidade || '',
    prestador.telefone || '',
    prestador.whatsapp || '',
    prestador.email || '',
    prestador.cidadeUF || '',
    Boolean(prestador.oficinaBase),
    prestador.veiculoId || 'VEIC-001',
    prestador.observacoes || ''
  ]);
  return { success: true, message: 'Prestador cadastrado com sucesso.', id: pId };
}

function definirOficinaBase(prestadorId, veiculoId) {
  const ss = getSpreadsheet();
  const sheet = getOrCreateSheet(ss, SHEET_NAMES.PRESTADORES);
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    const isTarget = String(data[i][0]) === String(prestadorId);
    sheet.getRange(i + 1, 9).setValue(isTarget);
  }
  return { success: true, message: 'Oficina base de preferência atualizada com sucesso.' };
}
`;

if (!codeGs.includes('function getPrestadores()')) {
  codeGs += '\n' + prestadoresBackend;
}

if (codeGs.includes('getInitialData()')) {
  codeGs = codeGs.replace('return {\n    vehicles: vehicles,', 'return {\n    prestadores: getPrestadores(),\n    vehicles: vehicles,');
}

fs.writeFileSync('Code.gs', codeGs, 'utf8');

// 3. ATUALIZAR INDEX.HTML E APP.HTML
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
        elOficina.innerHTML = \`<span class="cursor-pointer hover:underline text-amber-300 font-semibold" onclick="openPrestadoresModal()" title="Clique para gerenciar ou alterar a oficina base">\${nomeOficinaExibir}</span>\`;
      }
`;

if (html.includes(oldOficinaBanner)) {
  html = html.replace(oldOficinaBanner, newOficinaBanner);
}

const jsPrestadores = `
    function openPrestadoresModal() {
      renderPrestadoresList();
      document.getElementById('modalPrestadores').classList.remove('hidden');
      if (window.lucide) lucide.createIcons();
    }

    function closePrestadoresModal() {
      document.getElementById('modalPrestadores').classList.add('hidden');
    }

    function renderPrestadoresList() {
      const listContainer = document.getElementById('prestadoresListContainer');
      const prestadores = state.prestadores || [];
      if (prestadores.length === 0) {
        listContainer.innerHTML = '<div class="p-6 text-center text-slate-400 text-xs">Nenhum prestador ou oficina cadastrado. Adicione um novo prestador abaixo.</div>';
        return;
      }

      listContainer.innerHTML = prestadores.map(p => {
        const isBase = p.oficinaBase || p.OficinaBase;
        const pId = p.id || p.ID;
        const nome = p.nome || p.Nome;
        const tipo = p.tipo || p.Tipo || 'Oficina Mecânica';
        const esp = p.especialidade || p.Especialidade || 'Mecânica Geral';
        const tel = p.telefone || p.Telefone || p.whatsapp || p.WhatsApp || 'Não informado';
        return \`
          <div class="p-3 rounded-xl bg-slate-900 border \${isBase ? 'border-amber-500/80 bg-amber-950/20' : 'border-slate-800'} flex items-center justify-between gap-3">
            <div>
              <div class="flex items-center gap-2">
                <span class="text-sm font-bold text-white">\${nome}</span>
                \${isBase ? '<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">★ OFICINA BASE</span>' : ''}
              </div>
              <div class="text-xs text-slate-400 mt-0.5">\${tipo} • \${esp}</div>
              <div class="text-xs text-slate-300 mt-0.5 flex items-center gap-1">
                <i data-lucide="phone" class="w-3 h-3 text-sky-400"></i>
                <span>\${tel}</span>
              </div>
            </div>
            <div>
              \${!isBase ? \`<button type="button" onclick="setOficinaBase('\${pId}')" class="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-amber-600 hover:text-white text-slate-300 text-xs font-semibold transition flex items-center gap-1">
                <i data-lucide="check-circle" class="w-3.5 h-3.5"></i>
                <span>Tornar Base</span>
              </button>\` : '<span class="text-xs font-bold text-amber-400">Ativa no Banner</span>'}
            </div>
          </div>
        \`;
      }).join('');
    }

    function setOficinaBase(prestadorId) {
      if (state.prestadores) {
        state.prestadores.forEach(p => {
          p.oficinaBase = (String(p.id || p.ID) === String(prestadorId));
          p.OficinaBase = p.oficinaBase;
        });
      }
      renderCurrentVehicleView();
      renderPrestadoresList();
      if (typeof google !== 'undefined' && google.script && google.script.run) {
        google.script.run.definirOficinaBase(prestadorId, state.selectedVehicleId || 'VEIC-001');
      }
      if (typeof showToast === 'function') showToast('Oficina base de preferência atualizada!');
    }

    function submitNovoPrestador(e) {
      e.preventDefault();
      const novo = {
        nome: document.getElementById('pNome').value.trim(),
        tipo: document.getElementById('pTipo').value,
        especialidade: document.getElementById('pEspecialidade').value.trim(),
        telefone: document.getElementById('pTelefone').value.trim(),
        whatsapp: document.getElementById('pTelefone').value.trim(),
        oficinaBase: document.getElementById('pIsBase').checked,
        veiculoId: state.selectedVehicleId || 'VEIC-001'
      };

      if (!state.prestadores) state.prestadores = [];
      if (novo.oficinaBase) {
        state.prestadores.forEach(p => { p.oficinaBase = false; p.OficinaBase = false; });
      }
      const pId = 'PREST-' + String(new Date().getTime()).slice(-4);
      novo.id = pId;
      novo.ID = pId;
      state.prestadores.push(novo);

      renderCurrentVehicleView();
      renderPrestadoresList();
      document.getElementById('formNovoPrestador').reset();

      if (typeof google !== 'undefined' && google.script && google.script.run) {
        google.script.run.savePrestador(novo);
      }
      if (typeof showToast === 'function') showToast('Prestador cadastrado com sucesso!');
    }
`;

if (!html.includes('function openPrestadoresModal()')) {
  html = html.replace('function openEditVehicleModal()', jsPrestadores + '\n    function openEditVehicleModal()');
}

const modalPrestadoresHtml = `
  <div id="modalPrestadores" class="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 hidden">
    <div class="bg-slate-950 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">
      <div class="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900/60">
        <div class="flex items-center gap-2">
          <i data-lucide="building-2" class="w-5 h-5 text-sky-400"></i>
          <h3 class="text-sm font-bold text-white">Prestadores de Serviço & Oficina Base de Preferência</h3>
        </div>
        <button type="button" onclick="closePrestadoresModal()" class="text-slate-400 hover:text-white p-1 rounded-lg">
          <i data-lucide="x" class="w-5 h-5"></i>
        </button>
      </div>

      <div class="p-4 overflow-y-auto space-y-4 flex-1">
        <div>
          <h4 class="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Oficinas e Fornecedores Cadastrados</h4>
          <div id="prestadoresListContainer" class="space-y-2 max-h-56 overflow-y-auto pr-1">
          </div>
        </div>

        <div class="pt-4 border-t border-slate-800">
          <h4 class="text-xs font-bold text-sky-400 uppercase tracking-wider mb-3">Cadastrar Novo Prestador / Oficina</h4>
          <form id="formNovoPrestador" onsubmit="submitNovoPrestador(event)" class="space-y-3">
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

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-semibold text-slate-300 mb-1">Especialidade / Foco</label>
                <input type="text" id="pEspecialidade" placeholder="Ex: Mecânica PSA, Câmbio AL4, Suspensão" class="w-full bg-slate-900 text-xs text-slate-200 rounded-lg px-3 py-2 border border-slate-700">
              </div>
              <div>
                <label class="block text-xs font-semibold text-slate-300 mb-1">WhatsApp / Telefone</label>
                <input type="text" id="pTelefone" placeholder="(11) 98765-4321" class="w-full bg-slate-900 text-xs text-slate-200 rounded-lg px-3 py-2 border border-slate-700">
              </div>
            </div>

            <div class="flex items-center justify-between pt-2">
              <label class="flex items-center gap-2 text-xs text-amber-300 cursor-pointer">
                <input type="checkbox" id="pIsBase" class="rounded bg-slate-900 border-slate-700 text-amber-500">
                <span class="font-semibold">Definir como Oficina Base de Preferência do Veículo</span>
              </label>

              <button type="submit" class="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs flex items-center gap-1.5 shadow transition">
                <i data-lucide="plus" class="w-4 h-4"></i>
                <span>Salvar Prestador</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
`;

if (!html.includes('id="modalPrestadores"')) {
  html = html.replace('</body>', modalPrestadoresHtml + '\n</body>');
}

if (html.includes('selectedVehicleId:')) {
  html = html.replace('selectedVehicleId:', 'prestadores: [\n        { id: "PREST-001", ID: "PREST-001", nome: "Oficina Mecânica Precision", Nome: "Oficina Mecânica Precision", tipo: "Oficina Mecânica Especializada", Tipo: "Oficina Mecânica Especializada", especialidade: "Mecânica PSA e Câmbio AL4", Especialidade: "Mecânica PSA e Câmbio AL4", telefone: "(11) 98765-4321", Telefone: "(11) 98765-4321", oficinaBase: true, OficinaBase: true },\n        { id: "PREST-002", ID: "PREST-002", nome: "FLORIPA CASA E CONSTRUCAO LTDA", Nome: "FLORIPA CASA E CONSTRUCAO LTDA", tipo: "Fornecedor de Peças / Insumos", Tipo: "Fornecedor de Peças / Insumos", especialidade: "Autopeças e Aditivos", Especialidade: "Autopeças e Aditivos", telefone: "(48) 99672-0566", Telefone: "(48) 99672-0566", oficinaBase: false, OficinaBase: false }\n      ],\n      selectedVehicleId:');
}

fs.writeFileSync('index.html', html, 'utf8');
fs.writeFileSync('App.html', html, 'utf8');
console.log('✅ Arquivos atualizados com sucesso!');
