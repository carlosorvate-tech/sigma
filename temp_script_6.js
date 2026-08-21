
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
      var container = document.getElementById('oficinasListContainer');
      var oficinas = state.oficinas || [];
      if (oficinas.length === 0) {
        container.innerHTML = '<div class="p-6 text-center text-slate-400 text-xs">Nenhuma oficina cadastrada. Cadastre uma nova oficina abaixo.</div>';
        return;
      }

      var htmlItems = '';
      for (var i = 0; i < oficinas.length; i++) {
        var o = oficinas[i];
        var isBase = Boolean(o.isBase || o.Flag_Oficina_Base);
        var oId = o.id || o.ID_Oficina;
        var nome = o.nomeFantasia || o.Nome_Fantasia || '';
        var cnpj = o.cnpjh || o.CNPJ || '';
        var msg = o.contatoMensagens || o.Contato_Mensagens || '';
        var cel = o.contatoCelular || o.Contato_Celular || '';
        var email = o.emails || o.Emails || '';
        var tipo = o.tipoAtendimento || o.Tipo_Atendimento || 'Mecânica Geral';
        var mecanico = o.mecanicoResponsavel || o.Mecanico_Responsavel || '';

        var borderClass = isBase ? 'border-amber-500/80 bg-amber-950/20' : 'border-slate-800';
        var badgeBase = isBase ? '<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">★ OFICINA BASE</span>' : '';
        var btnTornarBase = !isBase ? '<button type="button" onclick="setOficinaBaseOficial(\'' + oId + '\')" title="Tornar Oficina Base" class="p-1.5 rounded-lg bg-slate-800 hover:bg-amber-600 hover:text-white text-amber-400 transition"><i data-lucide="star" class="w-4 h-4"></i></button>' : '';

        htmlItems += '<div class="p-3 rounded-xl bg-slate-900 border ' + borderClass + ' flex items-center justify-between gap-3">' +
          '<div class="space-y-1">' +
            '<div class="flex items-center gap-2"><span class="text-sm font-bold text-white">' + nome + '</span>' + badgeBase + '</div>' +
            '<div class="text-xs text-slate-400">' + tipo + (cnpj ? ' • CNPJ: ' + cnpj : '') + (mecanico ? ' • Resp: ' + mecanico : '') + '</div>' +
            '<div class="text-[11px] text-slate-300 flex items-center gap-3 pt-0.5">' +
              (msg ? '<span class="flex items-center gap-1 text-emerald-400 font-mono"><i data-lucide="message-circle" class="w-3 h-3"></i>' + msg + '</span>' : '') +
              (cel ? '<span class="flex items-center gap-1 text-sky-400 font-mono"><i data-lucide="phone" class="w-3 h-3"></i>' + cel + '</span>' : '') +
              (email ? '<span class="flex items-center gap-1 text-slate-400"><i data-lucide="mail" class="w-3 h-3"></i>' + email + '</span>' : '') +
            '</div>' +
          '</div>' +
          '<div class="flex items-center gap-1.5 shrink-0">' +
            btnTornarBase +
            '<button type="button" onclick="editarOficina(\'' + oId + '\')" title="Editar Oficina" class="p-1.5 rounded-lg bg-slate-800 hover:bg-sky-600 hover:text-white text-slate-300 transition"><i data-lucide="edit-3" class="w-4 h-4"></i></button>' +
            '<button type="button" onclick="removerOficina(\'' + oId + '\')" title="Excluir Oficina" class="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-600 hover:text-white text-rose-400 transition"><i data-lucide="trash-2" class="w-4 h-4"></i></button>' +
          '</div>' +
        '</div>';
      }
      container.innerHTML = htmlItems;
      if (window.lucide) lucide.createIcons();
    }

    function setOficinaBaseOficial(idOficina) {
      if (state.oficinas) {
        for (var i = 0; i < state.oficinas.length; i++) {
          var match = (String(state.oficinas[i].id || state.oficinas[i].ID_Oficina) === String(idOficina));
          state.oficinas[i].isBase = match;
          state.oficinas[i].Flag_Oficina_Base = match;
        }
      }
      renderCurrentVehicleView();
      renderOficinasList();
      if (typeof google !== 'undefined' && google.script && google.script.run) {
        google.script.run.definirOficinaBaseOficial(idOficina);
      }
      if (typeof showToast === 'function') showToast('Oficina base definida com sucesso!');
    }

    function editarOficina(idOficina) {
      var o = null;
      var list = state.oficinas || [];
      for (var i = 0; i < list.length; i++) {
        if (String(list[i].id || list[i].ID_Oficina) === String(idOficina)) {
          o = list[i];
          break;
        }
      }
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
      if (state.oficinas) {
        state.oficinas = state.oficinas.filter(function(o) { return String(o.id || o.ID_Oficina) !== String(idOficina); });
      }
      renderCurrentVehicleView();
      renderOficinasList();
      if (typeof google !== 'undefined' && google.script && google.script.run) {
        google.script.run.excluirOficina(idOficina);
      }
      if (typeof showToast === 'function') showToast('Oficina excluída com sucesso.');
    }

    function submitFormOficina(e) {
      e.preventDefault();
      var editId = document.getElementById('ofiEditId').value.trim();
      var oId = editId || ('OFI_' + new Date().getTime());
      var isBase = document.getElementById('ofiIsBase').checked;

      var ofiObj = {
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
        for (var i = 0; i < state.oficinas.length; i++) {
          state.oficinas[i].isBase = false;
          state.oficinas[i].Flag_Oficina_Base = false;
        }
      }

      if (editId) {
        for (var j = 0; j < state.oficinas.length; j++) {
          if (String(state.oficinas[j].id || state.oficinas[j].ID_Oficina) === String(editId)) {
            state.oficinas[j] = ofiObj;
            break;
          }
        }
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
  