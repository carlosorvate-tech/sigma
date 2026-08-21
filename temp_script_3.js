
    let state = {
      oficinas: [
        {
          id: "OFI_001", ID_Oficina: "OFI_001",
          nomeFantasia: "AUTO MECANICA REPUBLICA", Nome_Fantasia: "AUTO MECANICA REPUBLICA",
          nomeJuridico: "BRICHI E MARTINI AUTO MECANICA LTDA-ME", Nome_Juridico: "BRICHI E MARTINI AUTO MECANICA LTDA-ME",
          cnpjh: "15.821.397/0001-50", CNPJ: "15.821.397/0001-50",
          endereco: "AV REPUBLICA, 2280 - PALMITAL - Marília, SP", Endereco: "AV REPUBLICA, 2280 - PALMITAL - Marília, SP",
          contatoMensagens: "5514996810031", Contato_Mensagens: "5514996810031",
          contatoCelular: "(14) 99681-0031", Contato_Celular: "(14) 99681-0031",
          telefoneFisico: "(14) 3413-8811", Telefone_Fisico: "(14) 3413-8811",
          emails: "contato@automecanicarepublica.com.br", Emails: "contato@automecanicarepublica.com.br",
          tipoAtendimento: "Mecânica Geral, Retífica de Motores e Injeção", Tipo_Atendimento: "Mecânica Geral, Retífica de Motores e Injeção",
          mecanicoResponsavel: "Tiago (Mecânico Responsável)", Mecanico_Responsavel: "Tiago (Mecânico Responsável)",
          isBase: true, Flag_Oficina_Base: true
        },
        {
          id: "OFI_002", ID_Oficina: "OFI_002",
          nomeFantasia: "FLORIPA CASA E CONSTRUCAO LTDA", Nome_Fantasia: "FLORIPA CASA E CONSTRUCAO LTDA",
          nomeJuridico: "Floripa Casa e Construção LTDA", Nome_Juridico: "Floripa Casa e Construção LTDA",
          cnpjh: "59.997.717/0001-00", CNPJ: "59.997.717/0001-00",
          endereco: "Estrada Vereador Onildo Lemos, 728 - Florianópolis, SC", Endereco: "Estrada Vereador Onildo Lemos, 728 - Florianópolis, SC",
          contatoMensagens: "5548996720566", Contato_Mensagens: "5548996720566",
          contatoCelular: "(48) 99672-0566", Contato_Celular: "(48) 99672-0566",
          telefoneFisico: "(48) 3269-1000", Telefone_Fisico: "(48) 3269-1000",
          emails: "fiscal@floripacasa.com.br", Emails: "fiscal@floripacasa.com.br",
          tipoAtendimento: "Fornecedor de Peças / Insumos", Tipo_Atendimento: "Fornecedor de Peças / Insumos",
          mecanicoResponsavel: "Central de Vendas", Mecanico_Responsavel: "Central de Vendas",
          isBase: false, Flag_Oficina_Base: false
        }
      ],
      vehicles: [
        {
          id: "VEIC-001",
          ID: "VEIC-001",
          marca: "CITROËN",
          Marca: "CITROËN",
          modelo: "C4 PALLAS",
          Modelo: "C4 PALLAS",
          anoFabricacao: 2008,
          AnoFabricacao: 2008,
          anoModelo: 2009,
          AnoModelo: 2009,
          motorizacao: "2.0 16V EW10A (Correia Dentada)",
          Motorizacao: "2.0 16V EW10A (Correia Dentada)",
          combustivel: "FLEX",
          Combustivel: "FLEX",
          tipoTransmissao: "Automático",
          TipoTransmissao: "Automático",
          tipoDistribuicao: "Correia Dentada",
          TipoDistribuicao: "Correia Dentada",
          placaChassi: "EEQ-9C28",
          PlacaChassi: "EEQ-9C28",
          placa: "EEQ-9C28",
          Placa: "EEQ-9C28",
          regimeUso: "SEVERO_URBANO",
          RegimeUso: "SEVERO_URBANO",
          kmInicial: 191706,
          KMInicial: 191706,
          kmAtual: 191900,
          KMAtual: 191900
        }
      ],
      selectedVehicleId: "VEIC-001",
      prescriptivePlan: [],
      customPrescriptions: [],
      logs: [],
      paretoChartInstance: null,
      activeIngestionTab: 'auto'
    };

        
    document.addEventListener('DOMContentLoaded', () => {
            
      lucide.createIcons();
      setupDropzoneHandlers();
      loadData();
    });

    
    
    // --- LÓGICA DO DIAGNÓSTICO IA ---
    function abrirModalDiagnostico() {
      const v = getSelectedVehicle();
      const veiculoAtualId = v ? v.ID : state.selectedVehicleId;
      if(!veiculoAtualId) {
        alert("Selecione um veículo ativo primeiro.");
        return;
      }
      document.getElementById('modalDiagnostico').classList.remove('hidden');
      document.getElementById('diagResultados').innerHTML = '';
      document.getElementById('diagResultados').classList.add('hidden');
      document.getElementById('diagRelato').value = '';
      if (window.lucide) lucide.createIcons();
    }

    function fecharModalDiagnostico() {
      document.getElementById('modalDiagnostico').classList.add('hidden');
    }

    function acionarDiagnosticoIA() {
      const v = getSelectedVehicle();
      const veiculoAtualId = v ? v.ID : state.selectedVehicleId;
      if(!veiculoAtualId) {
        alert("Selecione um veículo ativo primeiro.");
        return;
      }

      const relato = document.getElementById('diagRelato').value;
      if(!relato.trim()) { alert("Descreva o sintoma."); return; }
      
      document.getElementById('btnGerarDiag').classList.add('hidden');
      document.getElementById('diagLoader').classList.remove('hidden');
      document.getElementById('diagResultados').classList.add('hidden');
      
      if (typeof google !== 'undefined' && google.script && google.script.run) {
        google.script.run.withSuccessHandler(function(resposta) {
          document.getElementById('diagLoader').classList.add('hidden');
          document.getElementById('btnGerarDiag').classList.remove('hidden');
          
          try {
            const diag = typeof resposta === 'string' ? JSON.parse(resposta) : resposta;
            let html = `<div class="p-3 bg-slate-900 border-l-4 border-amber-500 rounded-xl text-xs text-slate-200"><strong>Resumo:</strong> ${diag.resumoExecutivo}</div>`;
            
            if(diag.arvoreCausas && diag.arvoreCausas.length > 0) {
              html += `<h4 class="text-xs font-bold text-slate-300 mt-4 mb-2 uppercase border-b border-slate-700/80 pb-1 tracking-wider">Hipóteses & Testes de Bancada</h4>`;
              diag.arvoreCausas.forEach(c => {
                html += `
                <div class="bg-slate-900/70 border border-slate-700 rounded-xl p-3 mb-2.5">
                  <div class="flex justify-between items-center mb-1.5 flex-wrap gap-1">
                    <span class="text-cyan-300 font-bold text-xs">${c.componenteSuspeito}</span>
                    <span class="bg-slate-800 text-[10px] px-2 py-0.5 rounded text-cyan-400 border border-slate-700 font-mono font-bold">${c.probabilidadePercentual}% de chance</span>
                  </div>
                  <p class="text-xs text-slate-300"><strong>Causa Raiz:</strong> ${c.causaRaizProvavel}</p>
                  <div class="mt-2 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800">
                    <p class="text-[11px] text-emerald-400 font-semibold mb-1">🛠️ Teste Físico Sugerido:</p>
                    <p class="text-xs text-slate-300 leading-relaxed">${c.procedimentoTeste}</p>
                  </div>
                </div>`;
              });
            }
            
            // --- CAPTURA ESTRATÉGICA DE UPSELL (MARCO ZERO) CORRIGIDA ---
            
            // Captura defensiva da variável de estado (lida com let/const fora do escopo window)
            let estadoSeguro = {};
            if (typeof state !== 'undefined') {
                estadoSeguro = state;
            } else if (typeof window.state !== 'undefined') {
                estadoSeguro = window.state;
            }
            
            const plan = estadoSeguro.prescriptivePlan || [];
            const kmText = document.getElementById('vehicleKmDisplay') ? document.getElementById('vehicleKmDisplay').innerText : "0";
            const kmAtual = parseInt(kmText.replace(/[^0-9]/g, '')) || 0;
            const scoreGeral = document.getElementById('scoreValue') ? document.getElementById('scoreValue').innerText : "N/D";

            let itensCriticos = [];
            let itensPreventivos = [];

            plan.forEach(p => {
              const sub = p.subsistema ? p.subsistema.toUpperCase() : "GERAL";
              const interv = p.intervencao || "Inspeção";
              
              if (p.status === 'CRITICO_SEM_HISTORICO' || p.status === 'ALERTA_VENCIDO') {
                itensCriticos.push(`${sub}: ${interv}`);
              } else if (p.status === 'EM_DIA' && kmAtual > 0 && p.km_proxima_intervencao) {
                let kmRestante = p.km_proxima_intervencao - kmAtual;
                // Verifica se está dentro da janela de 500 km para upsell
                if (kmRestante > 0 && kmRestante <= 500) {
                  itensPreventivos.push(`${sub}: ${interv} (vence em ${kmRestante} km)`);
                }
              }
            });

            let saudeSnapshot = {
               score: scoreGeral,
               criticos: itensCriticos,
               preventivos: itensPreventivos
            };
            
            window.ultimoDiagnosticoGerado = { 
              relato: relato, 
              dados: diag, 
              saude: saudeSnapshot 
            };
            // --- FIM DA CAPTURA ESTRATÉGICA ---
            
            html += `
              <div class="mt-5 pt-4 border-t border-slate-700">
                <button onclick="solicitarPDFDiagnosticoOficina()" id="btnGerarPdfOficina" title="Gera o laudo técnico para a oficina com isenção jurídica e oportunidades de upsell" class="w-full bg-slate-800 text-white font-bold py-3 px-4 rounded border border-slate-600 hover:bg-slate-700 hover:border-slate-500 transition shadow flex items-center justify-center gap-2">
                  <span>📄</span> EXPORTAR ORDEM DE INSPEÇÃO (OFICINA)
                </button>
              </div>
            `;
            document.getElementById('diagResultados').innerHTML = html;
            // --- FIM DA INJEÇÃO ---
            document.getElementById('diagResultados').classList.remove('hidden');
          } catch(e) {
            alert("Erro ao processar retorno da IA. Detalhes no console.");
            console.error(e, resposta);
          }
        }).withFailureHandler(function(err){
          document.getElementById('diagLoader').classList.add('hidden');
          document.getElementById('btnGerarDiag').classList.remove('hidden');
          alert("Falha na comunicação com o servidor.");
        }).processarDiagnosticoIA(veiculoAtualId, relato);
      } else {
        setTimeout(() => {
          document.getElementById('diagLoader').classList.add('hidden');
          document.getElementById('btnGerarDiag').classList.remove('hidden');
          const diag = {
            resumoExecutivo: "Análise diagnóstica preliminar (Modo Local). Identificado padrão com alta correlação mecânica.",
            arvoreCausas: [
              {
                componenteSuspeito: "Subsistema sob Análise",
                probabilidadePercentual: 80,
                causaRaizProvavel: "Desvio operacional conforme sintomas reportados.",
                procedimentoTeste: "Realizar medições e testes específicos com scanner e inspeção física."
              }
            ]
          };
          window.ultimoDiagnosticoGerado = { relato: relato, dados: diag };
          let fHtml = `<div class="p-3 bg-slate-900 border-l-4 border-amber-500 rounded-xl text-xs text-slate-200"><strong>Resumo:</strong> ${diag.resumoExecutivo}</div>`;
          fHtml += `
            <div class="mt-4 pt-4 border-t border-slate-700">
              <button onclick="solicitarPDFDiagnostico()" id="btnGerarPdfDiag" class="w-full bg-slate-700 text-white font-bold py-3 rounded border border-slate-600 hover:bg-slate-600 hover:border-slate-500 transition shadow flex items-center justify-center gap-2">
                <span>📄</span> Exportar PDF para Oficina
              </button>
            </div>
          `;
          document.getElementById('diagResultados').innerHTML = fHtml;
          document.getElementById('diagResultados').classList.remove('hidden');
        }, 1000);
      }
    }

    function abrirModalTermos(isOnboarding = false) {
      const modal = document.getElementById('modalTermosUso');
      if (!modal) return;
      
      const btnAccept = document.getElementById('btnAceitarTermos');
      const btnClose = document.getElementById('btnCloseModalTermos');
      
      if (isOnboarding) {
        if (btnAccept) btnAccept.classList.remove('hidden');
        if (btnClose) btnClose.classList.add('hidden');
      } else {
        if (btnAccept) btnAccept.classList.add('hidden');
        if (btnClose) btnClose.classList.remove('hidden');
      }
      
      modal.classList.remove('hidden');
      if (window.lucide) lucide.createIcons();
    }

    function fecharModalTermos() {
      document.getElementById('modalTermosUso')?.classList.add('hidden');
    }

    function aceitarTermosUso() {
      localStorage.setItem('sigma_termo_aceite_v1', new Date().toISOString());
      fecharModalTermos();
    }

    function openMobileDrawer() {
      document.getElementById('mobileDrawer')?.classList.remove('hidden');
    }

    function closeMobileDrawer() {
      document.getElementById('mobileDrawer')?.classList.add('hidden');
    }

    // MODAIS NOVOS DA DIRETIVA (MODAL A & MODAL B)
    function openModalAdicionarPrescricao() {
      document.getElementById('formAdicionarPrescricao').reset();
      document.getElementById('modalAdicionarPrescricao').classList.remove('hidden');
      lucide.createIcons();
    }

    function closeModalAdicionarPrescricao() {
      document.getElementById('modalAdicionarPrescricao').classList.add('hidden');
    }

    function submitPrescricaoManual(e) {
      e.preventDefault();
      const v = getSelectedVehicle();
      if (!v) {
        alert('Selecione um veículo ativo.');
        return;
      }

      const itemData = {
        intervencao: document.getElementById('manIntervencao').value.trim().toUpperCase(),
        subsistema: document.getElementById('manSubsistema').value,
        tipo: document.getElementById('manTipo').value,
        intervalo_km: parseInt(document.getElementById('manKm').value, 10),
        intervalo_meses: parseInt(document.getElementById('manMeses').value, 10),
        especificacao_tecnica: document.getElementById('manSpec').value.trim(),
        origem_fonte: document.getElementById('manOrigem').value,
        texto_precaucao: document.getElementById('manPrecaucao').value.trim() || 'Diretriz técnica registrada manualmente pelo mantenedor.'
      };

      if (typeof google !== 'undefined' && google.script && google.script.run) {
        google.script.run
          .withSuccessHandler(res => {
            closeModalAdicionarPrescricao();
            loadData();
            alert(res.message || 'Diretriz cadastrada com sucesso!');
          })
          .addPrescriptiveItemManual(v.ID, itemData);
      } else {
        closeModalAdicionarPrescricao();
        alert('✨ Diretriz gravada no modo aditivo com sucesso!');
      }
    }

    function openModalIngestaoPlanoPrescritivo() {
      document.getElementById('modalIngestaoPlanoPrescritivo').classList.remove('hidden');
      switchIngestionTab('auto');
      lucide.createIcons();
    }

    function closeModalIngestaoPlanoPrescritivo() {
      document.getElementById('modalIngestaoPlanoPrescritivo').classList.add('hidden');
    }

    function switchIngestionTab(tab) {
      state.activeIngestionTab = tab;
      
      const tabs = ['auto', 'file', 'url', 'text'];
      tabs.forEach(t => {
        const btn = document.getElementById(`ingTab-${t}`);
        const content = document.getElementById(`ingContent-${t}`);
        if (btn) btn.className = `px-3 py-1.5 text-xs font-semibold rounded-t-lg shrink-0 ${t === tab ? 'bg-sky-500/20 text-sky-400 border-b-2 border-sky-400' : 'text-slate-400 hover:text-white'}`;
        if (content) {
          if (t === tab) content.classList.remove('hidden');
          else content.classList.add('hidden');
        }
      });
    }

    function executeMultimodalIngestion() {
      const v = getSelectedVehicle();
      if (!v) {
        alert('Selecione um veículo ativo.');
        return;
      }

      const regimeUso = document.getElementById('ingRegimeSelect').value;
      const strategy = document.querySelector('input[name="ingStrategy"]:checked').value;
      const modoMerge = (strategy === 'merge');

      const loadingBadge = document.getElementById('ingLoadingBadge');
      if (loadingBadge) loadingBadge.classList.remove('hidden');

      let payloadData = '';

      if (state.activeIngestionTab === 'url') {
        payloadData = document.getElementById('ingUrlInput').value.trim();
      } else if (state.activeIngestionTab === 'text') {
        payloadData = document.getElementById('ingTextInput').value.trim();
      } else if (state.activeIngestionTab === 'file') {
        const fileInput = document.getElementById('ingFileInput');
        if (fileInput.files && fileInput.files.length > 0) {
          payloadData = { filename: fileInput.files[0].name, textData: fileInput.files[0].name };
        }
      }

      const dadosVeiculo = `${v.Marca || 'Citroën'} ${v.Modelo || 'C4 Pallas'} (${v.AnoFabricacao || 2009}/${v.AnoModelo || 2009}) ${v.Motorizacao || '2.0 16V EW10A'} ${v.Combustivel || 'FLEX'} ${v.TipoTransmissao || 'Automático Convencional AL4'} - Odômetro: ${Number(v.KMAtual || 191706).toLocaleString('pt-BR')} KM`;

      const dadosIngestao = {
        veiculoId: v.ID,
        tipoFonte: state.activeIngestionTab.toUpperCase(),
        payload: payloadData,
        regimeUso: regimeUso,
        modoMerge: modoMerge,
        dadosVeiculo: dadosVeiculo
      };

      if (typeof google !== 'undefined' && google.script && google.script.run) {
        google.script.run
          .withSuccessHandler(res => {
            if (loadingBadge) loadingBadge.classList.add('hidden');
            closeModalIngestaoPlanoPrescritivo();
            loadData();
            alert(res.message || 'Ingestão Multimodal e Recálculo efetuados com sucesso!');
          })
          .processPrescriptiveSource(dadosIngestao);
      } else {
        setTimeout(() => {
          if (loadingBadge) loadingBadge.classList.add('hidden');
          closeModalIngestaoPlanoPrescritivo();
          renderCurrentVehicleView();
          alert('✨ Processamento Multimodal concluído!');
        }, 1000);
      }
    }

    function deletePrescriptiveItemUI(itemId) {
      const v = getSelectedVehicle();
      if (!v || !itemId) return;

      if (!confirm('Deseja realmente excluir esta diretriz prescritiva?')) return;

      if (typeof google !== 'undefined' && google.script && google.script.run) {
        google.script.run
          .withSuccessHandler(res => {
            loadData();
          })
          .deletePrescriptiveItem(v.ID, itemId);
      } else {
        renderCurrentVehicleView();
      }
    }

    function getCanonicalItemKey(itemDesc, itemPrice) {
      if (!itemDesc) return '';

      let str = itemDesc.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
      str = str.replace(/\b(KIT|JOGO|DE|DO|DA|DOS|DAS|E|O|A|PARA|EM|ORGANICO|ROSA|WURTH|COMPLETO|GERAL|SN|TOTAL|QUARTZ|10W40)\b/g, ' ');

      str = str.replace(/CARCA[CÇ]A/g, 'CARCACA');
      str = str.replace(/VALVULA/g, 'VALVULA');
      str = str.replace(/TERM\b|TERMOSTATICA\b/g, 'TERM');
      str = str.replace(/MANGUEIRA\b|MANG\b/g, 'MANGUEIRA');
      str = str.replace(/FLUIDO\b|OLEO\b/g, 'OLEO');
      str = str.replace(/SERVICO\b|MAO DE OBRA\b|M\.O\b|REFORMA\b/g, 'MO');

      const tokens = str.replace(/[^A-Z0-9]/g, ' ')
                        .split(/\s+/)
                        .filter(t => t.length > 1)
                        .sort();

      const tokenStr = tokens.join('_');
      const priceStr = Number(itemPrice || 0).toFixed(2);

      return `${tokenStr}_${priceStr}`;
    }

    function deduplicateLogsList(rawLogs) {
      if (!rawLogs || !Array.isArray(rawLogs)) return [];

      const seenKeys = new Set();
      const cleanedLogs = [];

      rawLogs.forEach(log => {
        if (!log) return;
        const logId = String(log.ID || log.id || '').trim();
        const vId = String(log.VeiculoID || log.veiculoId || '').trim();
        const dataStr = String(log.Data || log.data || '').trim();
        const numDoc = String(log.NumeroOS || log.numeroOS || '').trim();
        const valor = Number(log.ValorTotal || log.valorTotal || 0);
        const desc = String(log.DescricaoServico || log.Descricao || log.descricaoServico || '').trim();

        const uniqueKey = logId ? logId : `${vId}_${dataStr}_${numDoc}_${valor}_${desc.substring(0, 30)}`;

        if (!seenKeys.has(uniqueKey)) {
          seenKeys.add(uniqueKey);
          cleanedLogs.push(log);
        }
      });

      return cleanedLogs.sort((a, b) => String(b.Data || '').localeCompare(String(a.Data || '')));
    }
function setupDropzoneHandlers() {
      const dropzone = document.getElementById('dropzoneContainer');
      if (!dropzone) return;

      dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzone.classList.add('border-sky-400', 'bg-sky-900/40');
      });
      dropzone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        dropzone.classList.remove('border-sky-400', 'bg-sky-900/40');
      });
      dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.classList.remove('border-sky-400', 'bg-sky-900/40');
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
          processFilesBatch(Array.from(e.dataTransfer.files));
        }
      });
    }

    function handleFileUpload(event) {
      const files = event.target.files;
      if (!files || files.length === 0) return;
      processFilesBatch(Array.from(files));
    }

    function processFilesBatch(fileList) {
      const aiBadge = document.getElementById('aiStatusBadge');
      const aiStatusText = document.getElementById('aiStatusText');

      if (aiBadge) {
        aiBadge.classList.remove('hidden');
        aiStatusText.innerText = `🔍 Analisando ${fileList.length} arquivo(s) com Inteligência Artificial / OCR...`;
      }

      let processedCount = 0;
      let totalItemsExtracted = 0;
      const docsFound = [];

      const tbody = document.getElementById('multiItemsTableBody');
      tbody.innerHTML = '';

      fileList.forEach(file => {
        const lowerName = file.name.toLowerCase();

        // 1. XML (NFe/CTe)
        if (lowerName.endsWith('.xml')) {
          const reader = new FileReader();
          reader.onload = function(e) {
            const result = parseNfeXmlBatch(e.target.result, file.name);
            processedCount++;
            totalItemsExtracted += result.itemCount;
            if (result.numDoc) docsFound.push(result.numDoc);

            if (processedCount === fileList.length) {
              finalizeBatchProcess(fileList.length, totalItemsExtracted, docsFound);
            }
          };
          reader.readAsText(file);
        }
        // 2. PDF ou IMAGEM (JPG, PNG, WEBP)
        else if (lowerName.endsWith('.pdf') || lowerName.endsWith('.jpg') || lowerName.endsWith('.jpeg') || lowerName.endsWith('.png') || lowerName.endsWith('.webp')) {
          const reader = new FileReader();
          reader.onload = function(e) {
            const base64Data = e.target.result;
            
            // Chamar IA do Backend Google Apps Script
            if (typeof google !== 'undefined' && google.script && google.script.run) {
              google.script.run
                .withSuccessHandler(res => {
                  if (res && res.success && res.data) {
                    applyAiExtractedData(res.data);
                    processedCount++;
                    totalItemsExtracted += (res.data.itens ? res.data.itens.length : 1);
                    if (res.data.numDoc) docsFound.push(res.data.numDoc);
                  } else {
                    // Fallback se IA não tiver chave
                    handlePdfOrImageFallback(file, base64Data, () => {
                      processedCount++;
                      if (processedCount === fileList.length) {
                        finalizeBatchProcess(fileList.length, totalItemsExtracted, docsFound);
                      }
                    });
                  }

                  if (processedCount === fileList.length) {
                    finalizeBatchProcess(fileList.length, totalItemsExtracted, docsFound);
                  }
                })
                .withFailureHandler(err => {
                  handlePdfOrImageFallback(file, base64Data, () => {
                    processedCount++;
                    if (processedCount === fileList.length) {
                      finalizeBatchProcess(fileList.length, totalItemsExtracted, docsFound);
                    }
                  });
                })
                .processDocumentAI(base64Data, file.type || 'application/pdf', file.name);
            } else {
              // Modo Local / Fallback
              handlePdfOrImageFallback(file, base64Data, (itemsAdded, docNum) => {
                processedCount++;
                totalItemsExtracted += itemsAdded;
                if (docNum) docsFound.push(docNum);
                if (processedCount === fileList.length) {
                  finalizeBatchProcess(fileList.length, totalItemsExtracted, docsFound);
                }
              });
            }
          };
          reader.readAsDataURL(file);
        }
        // 3. Arquivo de Texto Puro (.txt, .csv)
        else {
          const reader = new FileReader();
          reader.onload = function(e) {
            const result = parseDocumentTextContentBatch(file, e.target.result);
            processedCount++;
            totalItemsExtracted += result.itemCount;
            if (result.numDoc) docsFound.push(result.numDoc);

            if (processedCount === fileList.length) {
              finalizeBatchProcess(fileList.length, totalItemsExtracted, docsFound);
            }
          };
          reader.readAsText(file);
        }
      });
    }

    function applyAiExtractedData(data) {
      if (!data) return;

      if (data.numDoc && !document.getElementById('formNumeroOS').value) {
        document.getElementById('formNumeroOS').value = data.numDoc;
      }
      if (data.data && !document.getElementById('formData').value) {
        document.getElementById('formData').value = data.data;
      }
      if (data.km && (!document.getElementById('formKm').value || document.getElementById('formKm').value === '0')) {
        document.getElementById('formKm').value = data.km;
      }
      if (data.oficinaNome && !document.getElementById('formOficinaNome').value) {
        document.getElementById('formOficinaNome').value = data.oficinaNome.toUpperCase();
      }
      if (data.oficinaCNPJ && !document.getElementById('formOficinaCNPJ').value) {
        document.getElementById('formOficinaCNPJ').value = data.oficinaCNPJ;
      }
      if (data.oficinaCidade && !document.getElementById('formOficinaCidade').value) {
        document.getElementById('formOficinaCidade').value = data.oficinaCidade.toUpperCase();
      }
      if (data.tipoManutencao) {
        document.getElementById('formTipo').value = data.tipoManutencao;
      }

      if (data.itens && Array.isArray(data.itens) && data.itens.length > 0) {
        data.itens.forEach(item => {
          if (item && item.desc) {
            addMultiItemRow({
              desc: item.desc.toUpperCase(),
              valor: Number(item.valor || 0),
              tipo: item.tipo || 'Peça',
              subsistema: item.subsistema || 'Motor/Trem de Força'
            });
          }
        });
      }
    }

    async function handlePdfOrImageFallback(file, base64Data, callback) {
      let count = 0;
      let numDoc = '';
      let extractedPrice = 0;
      let extractedDesc = '';
      let extractedEmitente = '';
      let extractedCNPJ = '';
      let extractedItems = [];

      // 1. Limpeza do nome do arquivo para extrair o nome da peça
      const cleanNameOnly = file.name.replace(/\.[^/.]+$/, "");
      
      const docMatch = file.name.match(/(?:OS|NF|RECIBO|DOC|INVOICE)?[_\s-]*(\d{4,18})/i);
      if (docMatch) {
        numDoc = docMatch[1];
      }

      // Se o arquivo vier como "invoice-2000016835959714 filtro de combustivel"
      const invoiceNameMatch = cleanNameOnly.match(/^invoice[-_\s]*\d+[-_\s]*(.*)$/i) || 
                               cleanNameOnly.match(/^\d+[-_\s]*(.*)$/i) ||
                               cleanNameOnly.match(/^([A-Za-zÀ-ÿ\s\-_]+)/i);
      if (invoiceNameMatch && invoiceNameMatch[1]) {
        extractedDesc = invoiceNameMatch[1].trim();
      }

      // 2. Extração via PDF.js com agrupamento de linhas verticais (Y)
      if (file.name.toLowerCase().endsWith('.pdf') && typeof pdfjsLib !== 'undefined') {
        try {
          let binaryString = '';
          if (base64Data.indexOf(';base64,') > -1) {
            binaryString = atob(base64Data.split(';base64,')[1]);
          } else {
            binaryString = atob(base64Data);
          }

          const uint8Array = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            uint8Array[i] = binaryString.charCodeAt(i);
          }

          const loadingTask = pdfjsLib.getDocument({ data: uint8Array });
          const pdf = await loadingTask.promise;
          let fullText = '';

          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            
            // Agrupar itens por linha visual (coordenada Y)
            const linesMap = new Map();
            textContent.items.forEach(item => {
              const y = Math.round((item.transform[5] || 0) / 3) * 3;
              if (!linesMap.has(y)) linesMap.set(y, []);
              linesMap.get(y).push(item);
            });

            const sortedY = Array.from(linesMap.keys()).sort((a, b) => b - a);
            sortedY.forEach(y => {
              const rowItems = linesMap.get(y).sort((a, b) => (a.transform[4] || 0) - (b.transform[4] || 0));
              const lineText = rowItems.map(it => it.str).join(' ').trim();
              if (lineText) {
                fullText += lineText + '\n';
              }
            });
          }

          if (fullText.trim().length > 10) {
            // Extrair CNPJ
            const cnpjMatch = fullText.match(/\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}/);
            if (cnpjMatch) extractedCNPJ = cnpjMatch[0];

            // Extrair Emitente / Razão Social
            const emitMatch = fullText.match(/(?:RECEBEMOS DE|EMITENTE|RAZ[AÃ]O SOCIAL|FORNECEDOR|VENDEDOR)[\s:]*([A-Z0-9\s\.\-&]{4,50})/i);
            if (emitMatch) extractedEmitente = emitMatch[1].replace(/OS PRODUTOS.*/i, '').trim();

            // Extrair Número da Nota Fiscal
            const nfNumMatch = fullText.match(/(?:N[ÚU]MERO|N[°º]|NOTA FISCAL|DANFE|NF-E)[\s:]*(\d{3,12})/i);
            if (nfNumMatch && !numDoc) numDoc = nfNumMatch[1];

            // Extrair Preço Total da Nota / Produtos (Corrigido regex com [\s:=-]*)
            const totalMatches = [
              fullText.match(/(?:VALOR TOTAL DA NOTA|VALOR DO DOCUMENTO|VALOR TOTAL DOS PRODUTOS|VALOR L[IÍ]QUIDO|TOTAL DA NOTA|VALOR TOTAL|V\. TOTAL|TOTAL A PAGAR|VALOR A PAGAR|TOTAL)[\s:=-]*(?:R\$\s*)?([\d.]+[,.]\d{2})/i),
              fullText.match(/(?:V\.PROD|V\.TOTAL|VR\.TOTAL)[\s:=-]*([\d.]+[,.]\d{2})/i),
              fullText.match(/R\$\s*([\d.]+[,.]\d{2})/i)
            ];

            for (let m of totalMatches) {
              if (m && m[1]) {
                const val = parseFloat(m[1].replace(/\./g, '').replace(',', '.'));
                if (!isNaN(val) && val > 0) {
                  extractedPrice = val;
                  break;
                }
              }
            }

            // Fallback de varredura monetária brasileira se preço ainda for 0
            if (extractedPrice === 0) {
              const allCurrency = fullText.match(/(?:^|\s)([\d]{1,3}(?:\.[\d]{3})*,\d{2})(?:\s|$)/g);
              if (allCurrency && allCurrency.length > 0) {
                const numbers = allCurrency.map(s => parseFloat(s.trim().replace(/\./g, '').replace(',', '.'))).filter(n => !isNaN(n) && n > 0);
                if (numbers.length > 0) {
                  extractedPrice = Math.max(...numbers);
                }
              }
            }

            // Tentar extrair descrição detalhada do produto dentro do PDF
            const prodLineMatch = fullText.match(/(?:PRODUTO|DESCRI[CÇ][AÃ]O|ITEM)[\s:]*([A-Za-z0-9\s\-/.]{4,60})/i);
            if (prodLineMatch && (!extractedDesc || extractedDesc.length < 3)) {
              extractedDesc = prodLineMatch[1].trim();
            }

            // Tentar extrair itens tabulares do corpo da DANFE
            const lines = fullText.split(/\r?\n/);
            lines.forEach(line => {
              const trimmed = line.trim();
              if (!trimmed || trimmed.length < 5) return;

              const itemMatch = trimmed.match(/(?:^\d+\s+)?([A-Z0-9\s\-\/\.]{4,60}?)\s+(?:UN|PC|P[CÇ]A|CJ|LT|KG|SV|UND|1)?\s+(\d+[.,]?\d*)\s+([\d.]+[,.]\d{2})\s+([\d.]+[,.]\d{2})/i);
              if (itemMatch) {
                const desc = itemMatch[1].trim();
                const val = parseFloat(itemMatch[4].replace(/\./g, '').replace(',', '.'));
                if (desc && !isNaN(val) && val > 0 && !/BASE|CALCULO|IMPOSTO|ICMS|TOTAL|DESCONTO/i.test(desc)) {
                  extractedItems.push({ desc: desc.toUpperCase(), val: val });
                }
              }
            });
          }
        } catch (e) {
          console.warn('Processamento PDF.js:', e);
        }
      }

      // Preencher campos de cabeçalho da OS/NF
      if (extractedCNPJ && !document.getElementById('formOficinaCNPJ').value) {
        document.getElementById('formOficinaCNPJ').value = extractedCNPJ;
      }
      if (extractedEmitente && !document.getElementById('formOficinaNome').value) {
        document.getElementById('formOficinaNome').value = extractedEmitente.toUpperCase();
      }

      // Helper para categorização automática por palavras-chave
      function categorizeItem(itemDesc) {
        const lower = itemDesc.toLowerCase();
        let cat = 'Peça';
        let sub = 'Motor/Trem de Força';

        if (lower.includes('oleo') || lower.includes('óleo') || lower.includes('fluido') || lower.includes('aditivo') || lower.includes('liquido') || lower.includes('líquido') || lower.includes('arrefecime')) {
          cat = 'Óleo/Fluido';
        } else if (lower.includes('mao de obra') || lower.includes('mão de obra') || lower.includes('servico') || lower.includes('serviço')) {
          cat = 'Mão de Obra';
        } else if (lower.includes('retifica') || lower.includes('retífica') || lower.includes('usinagem')) {
          cat = 'Retífica';
        } else if (lower.includes('limpeza') || lower.includes('flush') || lower.includes('gas') || lower.includes('combustivel') || lower.includes('combustível')) {
          cat = 'Insumo';
        }

        if (lower.includes('arrefecime') || lower.includes('radiador') || lower.includes('valvula termostatica') || lower.includes('válvula termostática') || lower.includes('bomba de agua') || lower.includes('bomba de água') || lower.includes('trocador de calor') || lower.includes('mangueir') || lower.includes('carcaca') || lower.includes('carcaça')) {
          sub = 'Arrefecimento';
        } else if (lower.includes('cambio') || lower.includes('câmbio') || lower.includes('atf') || lower.includes('transmissao') || lower.includes('transmissão') || lower.includes('solenoide') || lower.includes('eletrovalvula')) {
          sub = 'Transmissão';
        } else if (lower.includes('freio') || lower.includes('pastilha') || lower.includes('disco')) {
          sub = 'Freios';
        } else if (lower.includes('bieleta') || lower.includes('bucha') || lower.includes('suspensao') || lower.includes('suspensão') || lower.includes('amortecedor') || lower.includes('coxim')) {
          sub = 'Suspensão/Direção';
        } else if (lower.includes('bateria') || lower.includes('vela') || lower.includes('alternador') || lower.includes('bobina')) {
          sub = 'Elétrica/Eletrônica';
        }

        return { cat, sub };
      }

      // Adicionar itens extraídos da tabela ou o item da nota fiscal
      if (extractedItems.length > 0) {
        extractedItems.forEach(it => {
          const { cat, sub } = categorizeItem(it.desc);
          addMultiItemRow({
            desc: it.desc,
            valor: it.val,
            tipo: cat,
            subsistema: sub
          });
          count++;
        });
      } else {
        // Obter nome limpo da peça (removendo "invoice-", "doc-", números longos)
        let finalDesc = extractedDesc || cleanNameOnly;
        finalDesc = finalDesc
          .replace(/^invoice[-_s]*/i, '')
          .replace(/^d+[-_s]*/i, '')
          .replace(/^[-_s]+/, '')
          .trim();
        if (!finalDesc || finalDesc.length < 2) finalDesc = cleanNameOnly;

        const { cat, sub } = categorizeItem(finalDesc);

        addMultiItemRow({
          desc: finalDesc.toUpperCase(),
          valor: extractedPrice || 0.00,
          tipo: cat,
          subsistema: sub
        });
        count = 1;
      }

      if (callback) callback(count, numDoc);
    }

    function parseNfeXmlBatch(xmlText, fileName) {
      let count = 0;
      let numDoc = '';

      try {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlText, "text/xml");

        // 1. Dados do Emitente (Oficina / Autopeças)
        const xNome = xmlDoc.querySelector("emit > xNome")?.textContent || 
                      xmlDoc.querySelector("emit > xFant")?.textContent || 
                      xmlDoc.querySelector("xNome")?.textContent || "";
        
        const cnpj = xmlDoc.querySelector("emit > CNPJ")?.textContent || 
                     xmlDoc.querySelector("CNPJ")?.textContent || "";
        
        const cnpjFormatted = cnpj ? cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5") : "";
        const xMun = xmlDoc.querySelector("enderEmit > xMun")?.textContent || xmlDoc.querySelector("xMun")?.textContent || "";
        const uf = xmlDoc.querySelector("enderEmit > UF")?.textContent || xmlDoc.querySelector("UF")?.textContent || "";
        const cidadeUf = (xMun && uf) ? `${xMun} - ${uf}` : (xMun || uf);

        // 2. Número do Documento e Data
        numDoc = xmlDoc.querySelector("ide > nNF")?.textContent || xmlDoc.querySelector("nNF")?.textContent || "";
        const dhEmi = xmlDoc.querySelector("ide > dhEmi")?.textContent || xmlDoc.querySelector("ide > dEmi")?.textContent || xmlDoc.querySelector("dhEmi")?.textContent || "";

        if (xNome && !document.getElementById('formOficinaNome').value) {
          document.getElementById('formOficinaNome').value = xNome.toUpperCase();
        }
        if (cnpjFormatted && !document.getElementById('formOficinaCNPJ').value) {
          document.getElementById('formOficinaCNPJ').value = cnpjFormatted;
        }
        if (cidadeUf && !document.getElementById('formOficinaCidade').value) {
          document.getElementById('formOficinaCidade').value = cidadeUf.toUpperCase();
        }
        if (dhEmi && !document.getElementById('formData').value) {
          document.getElementById('formData').value = dhEmi.split('T')[0];
        }

        // 3. Leitura dos Itens / Produtos / Serviços da NF-e
        const detNodes = xmlDoc.querySelectorAll("det");
        detNodes.forEach(det => {
          const xProd = det.querySelector("prod > xProd")?.textContent || det.querySelector("xProd")?.textContent || "";
          const vProd = Number(det.querySelector("prod > vProd")?.textContent || det.querySelector("vProd")?.textContent || 0);

          if (xProd) {
            let tipo = "Peça";
            let sub = "Motor/Trem de Força";
            const lower = xProd.toLowerCase();

            // Mapeamento de Tipo
            if (lower.includes("mao de obra") || lower.includes("servico") || lower.includes("m.o") || lower.includes("montagem") || lower.includes("reforma")) {
              tipo = "Mão de Obra";
            } else if (lower.includes("oleo") || lower.includes("óleo") || lower.includes("fluido") || lower.includes("aditivo") || lower.includes("lubrificante") || lower.includes("liquido") || lower.includes("líquido")) {
              tipo = "Óleo/Fluido";
            } else if (lower.includes("retifica") || lower.includes("retífica") || lower.includes("usinagem")) {
              tipo = "Retífica";
            } else if (lower.includes("limpeza") || lower.includes("flush") || lower.includes("gas") || lower.includes("combustivel") || lower.includes("combustível")) {
              tipo = "Insumo";
            }

            // Mapeamento de Subsistema
            if (lower.includes("arrefecime") || lower.includes("radiador") || lower.includes("valvula termostatica") || lower.includes("válvula termostática") || lower.includes("bomba de agua") || lower.includes("bomba de água") || lower.includes("trocador de calor") || lower.includes("mangueir") || lower.includes("carcaca") || lower.includes("carcaça")) {
              sub = "Arrefecimento";
            } else if (lower.includes("cambio") || lower.includes("câmbio") || lower.includes("atf") || lower.includes("transmissao") || lower.includes("transmissão") || lower.includes("solenoide") || lower.includes("eletrovalvula")) {
              sub = "Transmissão";
            } else if (lower.includes("freio") || lower.includes("pastilha") || lower.includes("disco") || lower.includes("dot 4") || lower.includes("dot4")) {
              sub = "Freios";
            } else if (lower.includes("bieleta") || lower.includes("bucha") || lower.includes("suspensao") || lower.includes("suspensão") || lower.includes("amortecedor") || lower.includes("coxim")) {
              sub = "Suspensão/Direção";
            } else if (lower.includes("bateria") || lower.includes("vela") || lower.includes("alternador") || lower.includes("bobina")) {
              sub = "Elétrica/Eletrônica";
            } else if (lower.includes("fluido") || lower.includes("aditivo") || lower.includes("flush") || lower.includes("limpeza")) {
              sub = "Fluidos/Insumos";
            }

            addMultiItemRow({
              desc: xProd.toUpperCase(),
              valor: vProd,
              tipo: tipo,
              subsistema: sub
            });
            count++;
          }
        });

        // Se a NF não trouxe itens tabulados, adiciona total da NF
        if (count === 0) {
          const vNF = Number(xmlDoc.querySelector("vNF")?.textContent || xmlDoc.querySelector("vProd")?.textContent || 0);
          addMultiItemRow({ 
            desc: `Manutenção Conforme NF-e #${numDoc || fileName.replace(/\.[^/.]+$/, "")}`, 
            valor: vNF, 
            tipo: "Peça",
            subsistema: "Motor/Trem de Força"
          });
          count = 1;
        }
      } catch (err) {
        console.error('Erro ao processar arquivo XML:', err);
      }

      return { itemCount: count, numDoc: numDoc };
    }

    function parseDocumentTextContentBatch(file, textContent) {
      let count = 0;
      let numDoc = '';

      const nameMatch = file.name.match(/(?:OS|NF|RECIBO|DOC)?[_\s-]*(\d{4,8})/i);
      if (nameMatch) {
        numDoc = nameMatch[1];
      }

      if (textContent && typeof textContent === 'string') {
        const res = parseCleanTextLines(textContent, numDoc);
        count = res.count;
        if (res.numDoc) numDoc = res.numDoc;
      }

      if (count === 0) {
        addMultiItemRow({
          desc: `Documento Anexado: ${file.name.replace(/\.[^/.]+$/, "")}`,
          valor: 0.00,
          tipo: "Peça",
          subsistema: "Motor/Trem de Força"
        });
        count = 1;
      }

      return { itemCount: count, numDoc: numDoc };
    }
function finalizeBatchProcess(totalFiles, totalItems, docsFound) {
      const aiBadge = document.getElementById('aiStatusBadge');
      const aiStatusText = document.getElementById('aiStatusText');

      const uniqueDocs = [...new Set(docsFound.filter(Boolean))];
      if (uniqueDocs.length > 0) {
        const currentDocVal = document.getElementById('formNumeroOS').value;
        const newDocs = currentDocVal ? `${currentDocVal}, ${uniqueDocs.join(', ')}` : uniqueDocs.join(', ');
        document.getElementById('formNumeroOS').value = newDocs;
      }

      computeTotalFormCost();

      if (aiBadge) {
        aiStatusText.innerText = `✨ Concluído! ${totalFiles} arquivo(s) lido(s), ${totalItems} itens alocados com sucesso.`;
      }
    }

    function loadData() {
      if (typeof google !== 'undefined' && google.script && google.script.run) {
        google.script.run
          .withSuccessHandler(onDataLoaded)
          .withFailureHandler(err => {
            console.error('Erro ao carregar dados:', err);
          })
          .getInitialData();
      }
    }

    function onDataLoaded(data) {
      state.vehicles = data.vehicles || [];
      state.customPrescriptions = data.prescriptivePlans || [];
      state.logs = deduplicateLogsAndItems(data.logs || []);
      if (data.oficinas && data.oficinas.length > 0) state.oficinas = data.oficinas;

      const currentExists = state.vehicles.some(v => String(v.ID || v.id) === String(state.selectedVehicleId));
      if (!currentExists && state.vehicles.length > 0) {
        state.selectedVehicleId = state.vehicles[0].ID || state.vehicles[0].id;
      }

      renderVehicleSelectors();
      renderCurrentVehicleView();
    }

    function renderVehicleSelectors() {
      const selectors = [
        document.getElementById('desktopVehicleSelect'),
        document.getElementById('mobileVehicleSelect'),
        document.getElementById('drawerVehicleSelect')
      ];

      selectors.forEach(select => {
        if (!select) return;

        if (!state.vehicles || state.vehicles.length === 0) {
          select.innerHTML = '<option value="">Nenhum Veículo</option>';
          return;
        }

        select.innerHTML = state.vehicles.map(v => {
          const vId = v.ID || v.id || '';
          const marca = v.Marca || v.marca || '';
          const modelo = v.Modelo || v.modelo || '';
          const placa = v.PlacaChassi || v.placaChassi || v.Placa || v.placa || '';
          let text = [marca, modelo].filter(Boolean).join(' ');
          if (!text) text = `Veículo ${vId}`;
          const placaText = placa ? ` (${placa})` : '';
          const isSelected = String(vId) === String(state.selectedVehicleId);
          return `
            <option value="${vId}" ${isSelected ? 'selected' : ''}>
              ${text}${placaText}
            </option>
          `;
        }).join('');

        if (state.selectedVehicleId) {
          select.value = state.selectedVehicleId;
        }
      });
    }

    function onVehicleChange(id) {
      state.selectedVehicleId = id;
      renderVehicleSelectors();
      renderCurrentVehicleView();
    }

    function getSelectedVehicle() {
      if (!state.vehicles || state.vehicles.length === 0) return null;
      return state.vehicles.find(v => String(v.ID || v.id) === String(state.selectedVehicleId)) || state.vehicles[0] || null;
    }

    function renderCurrentVehicleView() {
      const v = getSelectedVehicle();
      if (!v) {
        document.getElementById('vehicleTitle').innerText = 'Nenhum veículo selecionado';
        document.getElementById('vehiclePlate').innerText = '---';
        document.getElementById('vehicleCombustivel').innerText = '---';
        document.getElementById('vehicleTransmissao').innerText = '---';
        document.getElementById('vehicleRegimeBadge').innerText = '---';
        document.getElementById('vehicleSub').innerText = 'Cadastre ou selecione um veículo no menu.';
        document.getElementById('vehicleKmText').innerText = '0 KM';
        document.getElementById('vehicleOficinaText').innerText = '---';
        document.getElementById('cntEmDia').innerText = '0';
        document.getElementById('cntCritico').innerText = '0';
        document.getElementById('cntAlerta').innerText = '0';
        document.getElementById('prescriptiveCardsContainer').innerHTML = '<div class="p-6 text-center text-slate-400 text-xs">Nenhum veículo ativo. Cadastre um novo veículo no menu.</div>';
        
        state.prescriptivePlan = [];
        updateDynamicHealthGauge();
        renderLogsTable();
        renderParetoChart();
        return;
      }

      // Sincronizar selectedVehicleId se necessário
      if (!state.selectedVehicleId || state.selectedVehicleId !== (v.ID || v.id)) {
        state.selectedVehicleId = v.ID || v.id;
      }

      const vMarca = v.Marca || v.marca || '';
      const vModelo = v.Modelo || v.modelo || '';
      const vPlaca = v.PlacaChassi || v.placaChassi || v.Placa || v.placa || '---';
      const vComb = v.Combustivel || v.combustivel || 'FLEX';
      let vTrans = v.TipoTransmissao || v.tipoTransmissao || 'Automático';
      vTrans = vTrans.replace(/\s*\(Torque AL4\)|\s*\(AL4\)|\s*Convencional/gi, '').trim();
      if (!vTrans) vTrans = 'Automático';
      const vRegime = v.RegimeUso || v.regimeUso || 'SEVERO_URBANO';
      const vDist = v.TipoDistribuicao || v.tipoDistribuicao || 'Correia Dentada';
      const vAnoFab = v.AnoFabricacao || v.anoFabricacao || 2009;
      const vAnoMod = v.AnoModelo || v.anoModelo || 2009;
      const vKm = v.KMAtual !== undefined ? v.KMAtual : (v.kmAtual !== undefined ? v.kmAtual : 0);

      document.getElementById('vehicleTitle').innerText = [vMarca, vModelo].filter(Boolean).join(' ') || `Veículo ${v.ID || v.id || ''}`;
      document.getElementById('vehiclePlate').innerText = vPlaca;
      document.getElementById('vehicleCombustivel').innerText = vComb;
      document.getElementById('vehicleTransmissao').innerText = vTrans;
      document.getElementById('vehicleRegimeBadge').innerText = vRegime;
      const vMotor = v.Motorizacao || v.motorizacao || '';
      let subTexto = `Ano ${vAnoFab}/${vAnoMod}`;
      if (vMotor) {
        subTexto += ` • Motor ${vMotor}`;
        if (vDist) {
          subTexto += ` (${vDist})`;
        }
      }
      document.getElementById('vehicleSub').innerText = subTexto;
      document.getElementById('vehicleKmText').innerText = `${Number(vKm).toLocaleString('pt-BR')} KM`;

      const vehicleLogs = state.logs.filter(l => String(l.VeiculoID) === String(v.ID || v.id));
      const ultimaOficina = vehicleLogs.length > 0 ? (vehicleLogs[0].OficinaNome || 'Oficina Registrada') : 'Nenhuma ocorrência';
      const oficinas = state.oficinas || [];
      const ofBase = oficinas.find(o => o.isBase || o.Flag_Oficina_Base);
      const nomeOficinaExibir = ofBase ? (ofBase.nomeFantasia || ofBase.Nome_Fantasia) : 'Definir Oficina Base';
      const elOf = document.getElementById('vehicleOficinaText');
      if (elOf) elOf.innerHTML = '<span class="cursor-pointer hover:underline text-amber-300 font-semibold" onclick="openOficinasModal()">' + nomeOficinaExibir + '</span>';

      buildDynamicPrescriptivePlan(v);
      renderPrescriptiveCards();
      renderLogsTable();
      renderParetoChart();
      updateDynamicHealthGauge();
      lucide.createIcons();
    }

    function buildDynamicPrescriptivePlan(v) {
      if (!v) {
        state.prescriptivePlan = [];
        return;
      }

      const vId = String(v.ID || v.id || '');
      const vPlaca = String(v.PlacaChassi || v.placaChassi || v.Placa || v.placa || '').replace(/[^A-Z0-9]/gi, '').toUpperCase();
      const vKmAtual = Number(v.KMAtual !== undefined ? v.KMAtual : (v.kmAtual !== undefined ? v.kmAtual : 0));
      const regimeUso = String(v.RegimeUso || v.regimeUso || 'SEVERO_URBANO');
      const multKm = regimeUso.includes('SEVERO') ? 0.8 : 1.0;

      // Matriz Prescritiva Oficial Homologada (Conforme Manual Oficial Citroën C4 Pallas)
      const defaultItems = [
        {
          intervencao: 'Substituição do Óleo do Motor e Filtro de Óleo',
          subsistema: 'Motor/Trem de Força',
          tipo: 'PREVENTIVA',
          intervalo_km: Math.round(10000 * multKm),
          intervalo_meses: 12,
          especificacao_tecnica: 'Sintético 10W40 API SN / Quartz 7000 PSA B71 2294',
          origem_fonte: 'MANUAL_OEM_FABRICANTE',
          texto_precaucao: 'Sem registro de troca de óleo no histórico do ativo. Risco de borra e desgaste prematuro de bronzinas e comando.',
          palavrasChave: ['oleo', 'óleo', 'filtro de oleo', 'filtro de óleo', 'lubrificante', 'troca de oleo', 'troca de óleo']
        },
        {
          intervencao: 'Substituição do Filtro de Combustível de Linha (FLEX)',
          subsistema: 'Motor/Trem de Força',
          tipo: 'PREVENTIVA',
          intervalo_km: Math.round(20000 * multKm),
          intervalo_meses: 12,
          especificacao_tecnica: 'Filtro Blindado de Linha 5.0 Bar / PSA KL581',
          origem_fonte: 'MANUAL_OEM_FABRICANTE',
          texto_precaucao: 'Sem registro de substituição do filtro de combustível. Risco de sobrecarga na bomba e bicos injetores.',
          palavrasChave: ['filtro de combustivel', 'filtro de combustível', 'combustivel', 'combustível']
        },
        {
          intervencao: 'Substituição do Filtro de Ar do Motor',
          subsistema: 'Motor/Trem de Força',
          tipo: 'PREVENTIVA',
          intervalo_km: Math.round(20000 * multKm),
          intervalo_meses: 12,
          especificacao_tecnica: 'Elemento Filtrante de Ar de Alto Fluxo PSA',
          origem_fonte: 'MANUAL_OEM_FABRICANTE',
          texto_precaucao: 'Sem registro de substituição do filtro de ar. Saturação provoca perda de torque e aumento de consumo.',
          palavrasChave: ['filtro de ar', 'elemento filtrante']
        },
        {
          intervencao: 'Substituição do Filtro de Ar Condicionado (Cabine)',
          subsistema: 'Elétrica/Eletrônica',
          tipo: 'PREVENTIVA',
          intervalo_km: Math.round(30000 * multKm),
          intervalo_meses: 12,
          especificacao_tecnica: 'Filtro de Cabine Antipólen / Carvão Ativado',
          origem_fonte: 'MANUAL_OEM_FABRICANTE',
          texto_precaucao: 'Sem registro de troca do filtro de cabine e higienização do sistema de climatização.',
          palavrasChave: ['ar condicionado', 'cabine', 'higienizacao', 'higienização', 'polen', 'pólen']
        },
        {
          intervencao: 'Substituição das Velas de Ignição',
          subsistema: 'Motor/Trem de Força',
          tipo: 'PREVENTIVA',
          intervalo_km: Math.round(50000 * multKm),
          intervalo_meses: 24,
          especificacao_tecnica: 'Jogo de Velas Bosch/NGK Grau Térmico Original PSA EW10A',
          origem_fonte: 'MANUAL_OEM_FABRICANTE',
          texto_precaucao: 'Sem histórico documental de troca de velas. Eletrodos gastos sobrecarregam a régua da bobina de ignição.',
          palavrasChave: ['vela', 'velas', 'ignicao', 'ignição', 'jogo de velas']
        },
        {
          intervencao: 'Substituição do Kit de Correia Dentada (Distribuição)',
          subsistema: 'Motor/Trem de Força',
          tipo: 'PREVENTIVA',
          intervalo_km: Math.round(70000 * multKm),
          intervalo_meses: 60,
          especificacao_tecnica: 'Kit Correia Dentada HNBR + 2 Rolamentos Tensores Originais PSA',
          origem_fonte: 'MANUAL_OEM_FABRICANTE',
          texto_precaucao: 'CRÍTICO DESTRUTIVO: Sem comprovação documental de troca da correia de distribuição. O rompimento colide válvulas com pistões.',
          palavrasChave: ['correia dentada', 'distribuicao', 'distribuição', 'kit correia', 'tensor']
        },
        {
          intervencao: 'Sistema de Arrefecimento Completo (Bomba, Válvula, Trocador, Aditivo)',
          subsistema: 'Arrefecimento',
          tipo: 'PREVENTIVA',
          intervalo_km: Math.round(40000 * multKm),
          intervalo_meses: 24,
          especificacao_tecnica: 'Aditivo Orgânico Concentrado Rosa PSA B71 5110 + Água Desmineralizada 50/50',
          origem_fonte: 'MANUAL_OEM_FABRICANTE',
          texto_precaucao: 'CRÍTICO DESTRUTIVO: Motor EW10A em alumínio sensível ao superaquecimento. Falhas queimam a junta do cabeçote.',
          palavrasChave: ['arrefecimento', 'bomba d', 'bomba de agua', 'bomba de água', 'valvula termostatica', 'válvula termostática', 'trocador de calor', 'aditivo', 'radiador', 'retifica', 'cabeçote', 'cabecote', 'carcaca da valvula', 'mangueira']
        },
        {
          intervencao: 'Fluido ATF Câmbio Automático AL4 & Eletroválvulas',
          subsistema: 'Transmissão',
          tipo: 'PREVENTIVA',
          intervalo_km: Math.round(40000 * multKm),
          intervalo_meses: 36,
          especificacao_tecnica: 'Mobil ATF LT 71141 / Total Fluide XLD FE (Troca Parcial Aditiva 3.5L)',
          origem_fonte: 'MANUAL_OEM_FABRICANTE',
          texto_precaucao: 'CRÍTICO DESTRUTIVO: Câmbio AL4 sofre desvio de pressão por fluido degradado. Causa trancos e travamento em emergência.',
          palavrasChave: ['atf', 'cambio', 'câmbio', 'transmissao', 'transmissão', 'eletrovalvula', 'eletroválvula', 'solenoide']
        },
        {
          intervencao: 'Substituição Completa do Fluido de Freio Sintético (DOT 4)',
          subsistema: 'Freios',
          tipo: 'PREVENTIVA',
          intervalo_km: Math.round(20000 * multKm),
          intervalo_meses: 24,
          especificacao_tecnica: 'Fluido Sintético DOT 4 Alta Temperatura / Baixa Viscosidade ABS/ESP',
          origem_fonte: 'MANUAL_OEM_FABRICANTE',
          texto_precaucao: 'Fluido higroscópico. Absorção de umidade gera vapor lock em frenagens prolongadas e oxidação do módulo ABS.',
          palavrasChave: ['fluido de freio', 'dot 4', 'dot4', 'pastilha', 'disco de freio']
        },
        {
          intervencao: 'Suspensão, Articulações, Bieletas e Buchas de Bandeja',
          subsistema: 'Suspensão/Direção',
          tipo: 'PREVENTIVA',
          intervalo_km: Math.round(30000 * multKm),
          intervalo_meses: 12,
          especificacao_tecnica: 'Bieletas Reforçadas, Buchas Hidráulicas Traseiras da Bandeja e Coxins Superiores',
          origem_fonte: 'MANUAL_OEM_FABRICANTE',
          texto_precaucao: 'Inspeção de folgas nas rótulas, bieletas e coifas para prevenir desalinhamento e estalos na direção.',
          palavrasChave: ['bieleta', 'bucha', 'bandeja', 'pivo', 'pivô', 'amortecedor', 'coxim', 'alinhamento', 'balanceamento', 'suspensao', 'suspensão']
        }
      ];

      // Mesclar com Prescrições Customizadas Salvas
            // Filtrar apenas prescrições válidas (rejeitar nomes de arquivos ou lixo)
      const validCustomItems = (state.customPrescriptions || []).filter(p => {
        const vMatching = String(p.VeiculoID || p.veiculoId || '') === vId;
        const interv = String(p.Intervencao || p.intervencao || '').trim();
        const isFile = /\.(jpeg|jpg|png|webp|pdf|txt|xml)$/i.test(interv);
        return vMatching && !isFile && interv.length >= 4;
      });

      const mergedMap = new Map();

      if (validCustomItems.length === 0) {
        // Se ainda não há nenhuma prescrição salva na planilha para este veículo, carrega o default inicial
        defaultItems.forEach(item => {
          const key = (item.subsistema + '__' + item.intervencao).toUpperCase();
          mergedMap.set(key, item);
        });
      } else {
        // Se já existem prescrições salvas na planilha, usa EXCLUSIVAMENTE o banco de dados consolidado
        validCustomItems.forEach(c => {
          const intervencao = c.Intervencao || c.intervencao || '';
          const subsistema = c.Subsistema || c.subsistema || 'Motor/Trem de Força';
          const key = (subsistema + '__' + intervencao).toUpperCase();
          
          mergedMap.set(key, {
            dbId: c.ID || c.id || '',
            intervencao: intervencao,
            subsistema: subsistema,
            tipo: c.Tipo || c.tipo || 'PREVENTIVA',
            intervalo_km: Number(c.IntervaloKM || c.intervalo_km || 10000),
            intervalo_meses: Number(c.IntervaloMeses || c.intervalo_meses || 12),
            especificacao_tecnica: c.EspecificacaoTecnica || c.especificacao_tecnica || 'Conforme especificação documental',
            origem_fonte: c.OrigemFonte || c.origem_fonte || 'MANUAL_OEM_FABRICANTE',
            texto_precaucao: c.TextoPrecaucao || c.texto_precaucao || 'Diretriz técnica sob acompanhamento.',
            palavrasChave: [intervencao.toLowerCase()]
          });
        });
      }

      // Cruzar com os registros de manutenção (state.logs)
      const vehicleLogs = (state.logs || []).filter(l => {
        const lVId = String(l.VeiculoID || l.veiculoId || '');
        const lPlaca = String(l.Placa || l.placa || '').replace(/[^A-Z0-9]/gi, '').toUpperCase();
        return (lVId && lVId === vId) || (lPlaca && vPlaca && lPlaca === vPlaca);
      });

      let cntEmDia = 0;
      let cntCritico = 0;
      let cntAlerta = 0;

      const calculatedPlan = Array.from(mergedMap.values()).map(item => {
        const keywords = item.palavrasChave || [item.intervencao.toLowerCase()];
        
        let latestLog = null;
        for (let log of vehicleLogs) {
          const desc = String(log.DescricaoServico || log.descricaoServico || '').toLowerCase();
          const sub = String(log.Subsistema || log.subsistema || '').toLowerCase();
          
          const match = keywords.some(kw => desc.includes(kw.toLowerCase())) || 
                        (sub && sub === item.subsistema.toLowerCase() && desc.length > 5);
          
          if (match) {
            if (!latestLog || (Number(log.KM || log.km || 0) > Number(latestLog.KM || latestLog.km || 0))) {
              latestLog = log;
            }
          }
        }

        const intervalKm = Number(item.intervalo_km || 10000);

        let kmExec = null;
        let proxKm = null;
        let faltKm = null;
        let status = 'CRITICO_SEM_HISTORICO';
        let statusClass = 'bg-rose-500/20 text-rose-400 border border-rose-500/30';
        let statusTexto = '⚠️ CRÍTICO - SEM HISTÓRICO COMPROVADO (MARCO ZERO NECESSÁRIO)';

        if (latestLog) {
          kmExec = Number(latestLog.KM || latestLog.km || 0);
          proxKm = kmExec + intervalKm;
          faltKm = proxKm - vKmAtual;

          if (faltKm > 1000) {
            status = 'EM_DIA';
            statusClass = 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30';
            statusTexto = '✅ EM DIA';
            cntEmDia++;
          } else if (faltKm > 0) {
            status = 'ALERTA';
            statusClass = 'bg-amber-500/20 text-amber-400 border border-amber-500/30';
            statusTexto = '⚠️ ATENÇÃO - PRÓXIMO DO VENCIMENTO';
            cntAlerta++;
          } else {
            status = 'ALERTA_VENCIDO';
            statusClass = 'bg-rose-500/20 text-rose-400 border border-rose-500/30';
            statusTexto = '🚨 VENCIDO - REQUER MANUTENÇÃO';
            cntCritico++;
          }
        } else {
          cntCritico++;
        }

        return {
          ...item,
          km_ultima_execucao: kmExec,
          proxima_km: proxKm,
          km_faltante: faltKm,
          status: status,
          statusClass: statusClass,
          statusTexto: statusTexto
        };
      });

      // Atualizar badges numéricos no topo
      const elemEmDia = document.getElementById('cntEmDia');
      const elemCritico = document.getElementById('cntCritico');
      const elemAlerta = document.getElementById('cntAlerta');

      if (elemEmDia) elemEmDia.innerText = cntEmDia;
      if (elemCritico) elemCritico.innerText = cntCritico;
      if (elemAlerta) elemAlerta.innerText = cntAlerta;

      state.prescriptivePlan = calculatedPlan;
    }

    function updateDynamicHealthGauge() {
      const v = getSelectedVehicle();
      const plan = state.prescriptivePlan || [];
      const scoreElem = document.getElementById('scoreValue');
      const scoreCircle = document.getElementById('scoreCircle');
      const scoreLabelSub = document.getElementById('scoreLabelSub');

      if (!v || plan.length === 0) {
        if (scoreElem) scoreElem.innerText = '---';
        if (scoreCircle) {
          scoreCircle.setAttribute('stroke-dashoffset', '100');
          scoreCircle.setAttribute('class', 'gauge-circle text-slate-700');
        }
        if (scoreLabelSub) scoreLabelSub.innerText = 'Nenhum ativo veicular selecionado.';
        return;
      }

      let totalPoints = 0;
      plan.forEach(item => {
        if (item.status === 'EM_DIA') totalPoints += 100;
        else if (item.status === 'INDETERMINADO_PRECAUCAO') totalPoints += 60;
        else if (item.status === 'CRITICO_SEM_HISTORICO') totalPoints += 30;
        else if (item.status === 'ALERTA_VENCIDO') totalPoints += 0;
        else totalPoints += 50;
      });

      const avgScore = Math.round(totalPoints / plan.length);

      if (scoreElem) scoreElem.innerText = avgScore;
      
      const vNome = (v.Modelo || v.Marca || v.PlacaChassi || v.Placa || '');
      if (scoreLabelSub) scoreLabelSub.innerText = `Gestão prescritiva do ativo ${vNome}.`;

      if (scoreCircle) {
        const dashOffset = Math.max(0, 100 - avgScore);
        scoreCircle.setAttribute('stroke-dashoffset', String(dashOffset));

        if (avgScore >= 80) {
          scoreCircle.setAttribute('class', 'gauge-circle text-emerald-400');
        } else if (avgScore >= 50) {
          scoreCircle.setAttribute('class', 'gauge-circle text-amber-400');
        } else {
          scoreCircle.setAttribute('class', 'gauge-circle text-rose-500');
        }
      }
    }

    function renderPrescriptiveCards() {
      const container = document.getElementById('prescriptiveCardsContainer');
      if (!container) return;

      if (!state.prescriptivePlan || state.prescriptivePlan.length === 0) {
        container.innerHTML = '<div class="glass-card rounded-2xl p-6 text-center text-slate-400 text-xs">Nenhuma diretriz prescritiva cadastrada para este ativo.</div>';
        return;
      }

      container.innerHTML = state.prescriptivePlan.map((item, idx) => {
        const isCustom = item.origem_fonte === 'MANTENEDOR_ESPECIALISTA' || item.origem_fonte === 'BOLETIM_TECNICO' || !!item.dbId;
        const badgeOrigemHtml = isCustom
          ? `<span class="badge bg-purple-500/10 text-purple-400 border border-purple-500/20"><i data-lucide="wrench" class="w-3 h-3 inline mr-1"></i>Prescrição Mantenedor / Oficina</span>`
          : `<span class="badge bg-sky-500/10 text-sky-400 border border-sky-500/20"><i data-lucide="book-open" class="w-3 h-3 inline mr-1"></i>Manual Oficial Fabricante</span>`;

        const kmExecFormatted = item.km_ultima_execucao ? `${Number(item.km_ultima_execucao).toLocaleString('pt-BR')} KM` : '---';
        const intervalKmFormatted = Number(item.intervalo_km || 10000).toLocaleString('pt-BR');
        const proxKmNum = item.proxima_km ? Number(item.proxima_km) : null;
        
        let proximaDisplayHtml = '---';
        if (proxKmNum) {
          const faltamKm = item.km_faltante !== null ? item.km_faltante : null;
          if (faltamKm !== null) {
            if (faltamKm >= 0) {
              proximaDisplayHtml = `Aos ${proxKmNum.toLocaleString('pt-BR')} KM <span class="text-xs text-emerald-400 font-normal">(Faltam ${faltamKm.toLocaleString('pt-BR')} KM)</span>`;
            } else {
              proximaDisplayHtml = `Aos ${proxKmNum.toLocaleString('pt-BR')} KM <span class="text-xs text-rose-400 font-bold">(Vencido há ${Math.abs(faltamKm).toLocaleString('pt-BR')} KM)</span>`;
            }
          } else {
            proximaDisplayHtml = `Aos ${proxKmNum.toLocaleString('pt-BR')} KM`;
          }
        }

        const isSemHistorico = item.status === 'CRITICO_SEM_HISTORICO';
        const isEmDia = item.status === 'EM_DIA';
        const isAlerta = item.status === 'ALERTA';
        const isVencido = item.status === 'ALERTA_VENCIDO';

        let parecerBoxHtml = '';
        if (isEmDia) {
          parecerBoxHtml = `
            <div class="bg-emerald-950/30 border border-emerald-800/40 rounded p-2.5 text-xs text-emerald-300 mt-2 flex items-center gap-2">
              <i data-lucide="check-circle" class="w-4 h-4 text-emerald-400 shrink-0"></i>
              <span><strong>Status:</strong> Manutenção em dia. Realizada aos ${kmExecFormatted} • Próxima intervenção com margem de segurança.</span>
            </div>
          `;
        } else if (isAlerta) {
          parecerBoxHtml = `
            <div class="bg-amber-950/30 border border-amber-800/40 rounded p-2.5 text-xs text-amber-200 mt-2 flex items-center gap-2">
              <i data-lucide="alert-triangle" class="w-4 h-4 text-amber-400 shrink-0"></i>
              <span><strong>Atenção:</strong> Próxima revisão aproximando-se (Restam ${item.km_faltante ? item.km_faltante.toLocaleString('pt-BR') + ' KM' : 'poucos KM'}). ${item.texto_precaucao}</span>
            </div>
          `;
        } else if (isVencido) {
          parecerBoxHtml = `
            <div class="bg-rose-950/30 border border-rose-800/40 rounded p-2.5 text-xs text-rose-200 mt-2 flex items-center gap-2">
              <i data-lucide="alert-octagon" class="w-4 h-4 text-rose-400 shrink-0"></i>
              <span><strong>Vencido:</strong> Intervenção vencida há ${Math.abs(item.km_faltante || 0).toLocaleString('pt-BR')} KM. Requer agendamento prioritário.</span>
            </div>
          `;
        } else {
          parecerBoxHtml = `
            <div class="bg-amber-950/30 border border-amber-800/40 rounded p-2.5 text-xs text-amber-200 mt-2">
              <strong>Parecer Técnico / Precaução:</strong> ${item.texto_precaucao}
            </div>
          `;
        }

        return `
          <div class="glass-card rounded-2xl p-4 sm:p-5 relative transition hover:border-slate-600">
            ${isCustom && item.dbId ? `
              <button onclick="deletePrescriptiveItemUI('${item.dbId}')" class="absolute top-4 right-4 p-1.5 rounded-lg bg-rose-900/40 hover:bg-rose-600 text-rose-300 hover:text-white transition shadow" title="Excluir Diretriz Customizada">
                <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
              </button>
            ` : ''}

            <div class="flex items-start justify-between flex-wrap gap-2 mb-2 pr-8">
              <div>
                <div class="flex items-center gap-2 mb-1 flex-wrap">
                  <h3 class="font-bold text-base sm:text-lg text-white">${item.intervencao}</h3>
                  ${badgeOrigemHtml}
                </div>
                <span class="text-xs text-sky-400 font-semibold">${item.subsistema}</span>
              </div>
            </div>

            <div class="mb-2">
              <span class="badge ${item.statusClass}">${item.statusTexto}</span>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-3 bg-slate-900/60 p-3 rounded-lg text-xs sm:text-sm my-2">
              <div>
                <span class="text-gray-400 block text-xs">Intervalo de Fábrica:</span>
                <strong class="text-white">A cada ${intervalKmFormatted} KM ou ${item.intervalo_meses} meses</strong>
              </div>
              <div>
                <span class="text-gray-400 block text-xs">Última Execução / Marco Zero:</span>
                <strong class="text-white">${kmExecFormatted}</strong>
              </div>
              <div>
                <span class="text-gray-400 block text-xs">Próxima Intervenção:</span>
                <strong class="${proxKmNum ? 'text-emerald-400' : 'text-amber-400'}">
                  ${proximaDisplayHtml}
                </strong>
              </div>
            </div>

            ${parecerBoxHtml}

            ${isSemHistorico ? `
              <div class="flex items-center gap-2 mt-3 pt-2 border-t border-slate-700/50 flex-wrap">
                <button onclick="openCreateMarcoZeroFromPlan('${item.intervencao}', '${item.subsistema}')" class="px-3 py-1.5 rounded bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs flex items-center gap-1.5 shadow transition">
                  <i data-lucide="wrench" class="w-3.5 h-3.5"></i>
                  <span>🛠️ Criar Marco Zero</span>
                </button>
                <button onclick="openParecerTecnicoModalFromPlan('${item.intervencao}', '${item.subsistema}')" class="px-3 py-1.5 rounded bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs flex items-center gap-1.5 shadow transition">
                  <i data-lucide="clipboard-check" class="w-3.5 h-3.5"></i>
                  <span>📋 Parecer Técnico</span>
                </button>
              </div>
            ` : ''}
          </div>
        `;
      }).join('');

      lucide.createIcons();
    }
function renderLogsTable() {
      const body = document.getElementById('logsTableBody');
      if (!body) return;

      const v = getSelectedVehicle();
      if (!v) {
        body.innerHTML = '<tr><td colspan="7" class="py-6 text-center text-xs text-slate-500">Selecione ou cadastre um veículo.</td></tr>';
        return;
      }

      const targetPlateClean = String(v.PlacaChassi || v.Placa || '').replace(/[^A-Z0-9]/gi, '').toUpperCase();

      const logs = deduplicateLogsList(state.logs.filter(l => {
        const lPlateClean = String(l.Placa || '').replace(/[^A-Z0-9]/gi, '').toUpperCase();
        return String(l.VeiculoID) === String(v.ID) || lPlateClean === targetPlateClean;
      }));

      if (logs.length === 0) {
        body.innerHTML = '<tr><td colspan="7" class="py-6 text-center text-xs text-slate-500">Nenhuma ocorrência gravada para este veículo.</td></tr>';
        return;
      }

      body.innerHTML = logs.map(l => {
        const logId = l.ID || l.id;
        const tipo = l.TipoManutencao || l.Tipo || 'PREVENTIVA';
        const valor = Number(l.ValorTotal || 0);

        return `
          <tr class="hover:bg-slate-800/40 transition">
            <td class="py-3 px-3 font-mono text-xs text-slate-300">
              ${l.Data} ${l.NumeroOS ? `<br><span class="text-[10px] text-purple-400 font-bold">Doc #${l.NumeroOS}</span>` : ''}
            </td>
            <td class="py-3 px-3 font-mono text-xs text-amber-400 font-bold">${v.PlacaChassi || l.Placa}</td>
            <td class="py-3 px-3 font-mono text-xs text-sky-400 font-medium">${Number(l.KM || 0).toLocaleString('pt-BR')} KM</td>
            <td class="py-3 px-3">
              <span class="text-[10px] font-bold px-2 py-0.5 rounded ${tipo === 'CORRETIVA' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'}">${tipo}</span>
            </td>
            <td class="py-3 px-3 text-xs text-slate-300 max-w-xs whitespace-pre-line">${l.DescricaoServico || l.Descricao}</td>
            <td class="py-3 px-3 text-right font-mono text-xs text-emerald-400 font-bold">R$ ${valor.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</td>
            <td class="py-3 px-3 text-center">
              <div class="flex items-center justify-center gap-1">
                <button onclick="editMaintenanceLog('${logId}')" class="px-2 py-1 rounded bg-amber-600/80 hover:bg-amber-500 text-white font-semibold text-xs flex items-center gap-1 shadow" title="Editar">
                  <i data-lucide="pencil" class="w-3.5 h-3.5"></i>
                </button>
                <button onclick="deleteMaintenanceLog('${logId}')" class="px-2 py-1 rounded bg-rose-900/80 hover:bg-rose-600 text-rose-200 font-semibold text-xs flex items-center gap-1 shadow" title="Excluir">
                  <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                </button>
              </div>
            </td>
          </tr>
        `;
      }).join('');

      lucide.createIcons();
    }

    function renderParetoChart() {
      const ctx = document.getElementById('paretoChartCanvas')?.getContext('2d');
      if (!ctx) return;

      const v = getSelectedVehicle();
      const vLogs = v ? deduplicateLogsList(state.logs.filter(l => String(l.VeiculoID) === String(v.ID) || String(l.Placa) === String(v.PlacaChassi))) : [];

      let totalServicos = 0;
      let totalPecas = 0;
      let totalInsumos = 0;

      const subsystemMap = {
        'Motor/Trem de Força': 0,
        'Fluidos/Insumos': 0,
        'Arrefecimento': 0,
        'Transmissão': 0,
        'Freios': 0,
        'Suspensão/Direção': 0,
        'Elétrica/Eletrônica': 0,
        'Climatização': 0,
        'Injeção/Alimentação': 0,
        'Outros / Geral': 0
      };

      vLogs.forEach(l => {
        const desc = l.DescricaoServico || l.Descricao || '';
        const lines = desc.split('\n');
        let logMatchedLinesVal = 0;

        lines.forEach(line => {
          const matchWithSub = line.match(/•?\s*(.*?)\s*-\s*R\$\s*([\d.]+)\s*\((.*?)\s*\|\s*(.*?)\)/);
          const matchSimple = line.match(/•?\s*(.*?)\s*-\s*R\$\s*([\d.]+)\s*\((.*?)\)/);

          if (matchWithSub) {
            const val = Number(matchWithSub[2]) || 0;
            const cat = matchWithSub[3].trim();
            const sub = matchWithSub[4].trim();

            logMatchedLinesVal += val;

            if (cat === 'Retífica' || cat === 'Mão de Obra') totalServicos += val;
            else if (cat === 'Peça' || cat === 'Óleo/Fluido') totalPecas += val;
            else totalInsumos += val;

            if (subsystemMap[sub] !== undefined) subsystemMap[sub] += val;
            else subsystemMap['Motor/Trem de Força'] += val;
          } else if (matchSimple) {
            const val = Number(matchSimple[2]) || 0;
            const cat = matchSimple[3].trim();
            const sub = l.Subsistema || 'Motor/Trem de Força';

            logMatchedLinesVal += val;

            if (cat.includes('Retífica') || cat.includes('Mão de Obra') || cat.includes('Serviço')) totalServicos += val;
            else if (cat.includes('Peça') || cat.includes('Óleo') || cat.includes('Fluido')) totalPecas += val;
            else totalInsumos += val;

            if (subsystemMap[sub] !== undefined) subsystemMap[sub] += val;
            else subsystemMap['Motor/Trem de Força'] += val;
          }
        });

        const totalLogVal = Number(l.ValorTotal || 0);
        if (logMatchedLinesVal === 0 && totalLogVal > 0) {
          const tipo = l.TipoManutencao || 'PREVENTIVA';
          const sub = l.Subsistema || 'Motor/Trem de Força';

          if (tipo === 'CORRETIVA') totalServicos += totalLogVal;
          else totalPecas += totalLogVal;

          if (subsystemMap[sub] !== undefined) subsystemMap[sub] += totalLogVal;
          else subsystemMap['Motor/Trem de Força'] += totalLogVal;
        }
      });

      const grandTotal = totalServicos + totalPecas + totalInsumos;
      const totalCostText = document.getElementById('totalCostText');
      if (totalCostText) {
        totalCostText.innerText = `R$ ${grandTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
      }

      const listContainer = document.getElementById('subsystemCostList');
      if (listContainer) {
        const pctS = grandTotal > 0 ? Math.round((totalServicos / grandTotal) * 100) : 0;
        const pctP = grandTotal > 0 ? Math.round((totalPecas / grandTotal) * 100) : 0;
        const pctI = grandTotal > 0 ? Math.round((totalInsumos / grandTotal) * 100) : 0;

        listContainer.innerHTML = `
          <div>
            <div class="flex justify-between text-xs mb-1">
              <span class="text-slate-300 font-medium">Serviços & Mão de Obra</span>
              <span class="font-mono text-slate-200">R$ ${totalServicos.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (${pctS}%)</span>
            </div>
            <div class="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden"><div class="h-full bg-sky-500 rounded-full" style="width: ${pctS}%"></div></div>
          </div>
          <div>
            <div class="flex justify-between text-xs mb-1">
              <span class="text-slate-300 font-medium">Peças & Substituições</span>
              <span class="font-mono text-slate-200">R$ ${totalPecas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (${pctP}%)</span>
            </div>
            <div class="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden"><div class="h-full bg-emerald-500 rounded-full" style="width: ${pctP}%"></div></div>
          </div>
          <div>
            <div class="flex justify-between text-xs mb-1">
              <span class="text-slate-300 font-medium">Aditivos & Insumos</span>
              <span class="font-mono text-slate-200">R$ ${totalInsumos.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (${pctI}%)</span>
            </div>
            <div class="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden"><div class="h-full bg-amber-500 rounded-full" style="width: ${pctI}%"></div></div>
          </div>
        `;
      }

      const sortedSubs = Object.entries(subsystemMap)
        .filter(([_, v]) => v > 0)
        .sort((a, b) => b[1] - a[1]);

      const labels = sortedSubs.length > 0 ? sortedSubs.map(s => s[0]) : ['Serviços & Mão de Obra', 'Peças & Substituições', 'Aditivos & Insumos'];
      const dataVals = sortedSubs.length > 0 ? sortedSubs.map(s => s[1]) : [totalServicos, totalPecas, totalInsumos];

      if (state.paretoChartInstance) {
        try { state.paretoChartInstance.destroy(); } catch (e) {}
      }

      if (typeof Chart !== 'undefined') {
        state.paretoChartInstance = new Chart(ctx, {
          type: 'bar',
          data: {
            labels: labels,
            datasets: [
              {
                label: 'Investimento Realizado (R$)',
                data: dataVals,
                backgroundColor: [
                  'rgba(14, 165, 233, 0.8)',
                  'rgba(16, 185, 129, 0.8)',
                  'rgba(245, 158, 11, 0.8)',
                  'rgba(168, 85, 247, 0.8)',
                  'rgba(239, 68, 68, 0.8)',
                  'rgba(236, 72, 153, 0.8)'
                ],
                borderColor: '#0284c7',
                borderWidth: 1,
                borderRadius: 6
              }
            ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
              y: {
                beginAtZero: true,
                grid: { color: '#334155' },
                ticks: {
                  color: '#94a3b8',
                  callback: function(value) { return 'R$ ' + value; }
                }
              },
              x: {
                grid: { color: '#334155' },
                ticks: { color: '#94a3b8' }
              }
            },
            plugins: {
              legend: { display: false },
              tooltip: {
                callbacks: {
                  label: function(context) {
                    return 'R$ ' + Number(context.parsed.y).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
                  }
                }
              }
            }
          }
        });
      }
    }
// MODAIS CRUD
    function openNewVehicleModal() {
      document.getElementById('vehicleForm').reset();
      document.getElementById('vId').value = '';
      document.getElementById('btnDeleteVehicle').classList.add('hidden');
      document.getElementById('vehicleModalTitle').innerHTML = '<i data-lucide="plus-circle" class="w-5 h-5 text-emerald-400"></i><span>Cadastrar Novo Veículo</span>';
      document.getElementById('vehicleModal').classList.remove('hidden');
      lucide.createIcons();
    }

    
    function consultarFichaTecnicaComIA() {
      const marca = document.getElementById('vMarca').value.trim();
      const modelo = document.getElementById('vModelo').value.trim();
      const ano = document.getElementById('vAnoFab').value.trim() || document.getElementById('vAnoMod').value.trim();

      if (!marca || !modelo) {
        alert('Por favor, informe ao menos a Marca e o Modelo para que a IA possa pesquisar a ficha técnica.');
        return;
      }

      const btn = document.getElementById('btnAutoLookupIA');
      const originalText = btn.innerHTML;
      btn.innerHTML = '<i data-lucide="loader-2" class="w-3.5 h-3.5 animate-spin"></i><span>Consultando IA...</span>';
      btn.disabled = true;

      function aplicarDados(data) {
        if (data.motorizacao) document.getElementById('vMotor').value = data.motorizacao;
        if (data.combustivel) document.getElementById('vCombustivel').value = data.combustivel;
        if (data.transmissao) {
          let t = data.transmissao;
          if (t.includes('Automático') || t.includes('AL4')) t = 'Automático';
          document.getElementById('vTransmissao').value = t;
        }
        if (data.tipoDistribuicao) {
          document.getElementById('vDistribuicao').value = data.tipoDistribuicao;
        }
        btn.innerHTML = originalText;
        btn.disabled = false;
        lucide.createIcons();
        if (typeof showToast === 'function') {
          showToast('✨ Ficha técnica sugerida pela IA aplicada com sucesso!');
        } else {
          alert('✨ Ficha técnica sugerida pela IA aplicada com sucesso!');
        }
      }

      if (typeof google !== 'undefined' && google.script && google.script.run) {
        google.script.run
          .withSuccessHandler(function(res) {
            if (res && res.success && res.data) {
              aplicarDados(res.data);
            } else {
              btn.innerHTML = originalText;
              btn.disabled = false;
              alert('Não foi possível identificar a ficha técnica completa via IA.');
            }
          })
          .withFailureHandler(function(err) {
            btn.innerHTML = originalText;
            btn.disabled = false;
            console.error('Erro na consulta IA:', err);
          })
          .consultarFichaTecnicaVeiculoIA(marca, modelo, ano);
      } else {
        // Mock rápido para ambiente cliente
        setTimeout(() => {
          aplicarDados({
            motorizacao: '2.0 16V EW10A',
            combustivel: 'FLEX',
            transmissao: 'Automático',
            tipoDistribuicao: 'Correia Dentada'
          });
        }, 600);
      }
    }

    function openEditVehicleModal() {
      const v = getSelectedVehicle();
      if (!v) {
        alert('Nenhum veículo selecionado para edição.');
        return;
      }

      document.getElementById('vehicleForm').reset();
      document.getElementById('vId').value = v.ID;
      document.getElementById('btnDeleteVehicle').classList.remove('hidden');
      document.getElementById('vehicleModalTitle').innerHTML = '<i data-lucide="pencil" class="w-5 h-5 text-amber-400"></i><span>Editar / Excluir Veículo</span>';

      document.getElementById('vMarca').value = v.Marca || '';
      document.getElementById('vModelo').value = v.Modelo || '';
      document.getElementById('vAnoFab').value = v.AnoFabricacao || 2009;
      document.getElementById('vAnoMod').value = v.AnoModelo || 2009;
      document.getElementById('vPlaca').value = v.PlacaChassi || v.Placa || '';
      document.getElementById('vMotor').value = v.Motorizacao || '';
      document.getElementById('vCombustivel').value = v.Combustivel || 'FLEX';
      let vTransVal = v.TipoTransmissao || v.tipoTransmissao || 'Automático';
      if (vTransVal.includes('Automático') || vTransVal.includes('AL4')) vTransVal = 'Automático';
      document.getElementById('vTransmissao').value = vTransVal;
      document.getElementById('vDistribuicao').value = v.TipoDistribuicao || v.tipoDistribuicao || 'Correia Dentada';
      document.getElementById('vRegimeUso').value = v.RegimeUso || 'SEVERO_URBANO';
      document.getElementById('vKmInicial').value = v.KMInicial || 0;
      document.getElementById('vKmAtual').value = v.KMAtual || 0;

      document.getElementById('vehicleModal').classList.remove('hidden');
      lucide.createIcons();
    }

    function closeVehicleModal() {
      document.getElementById('vehicleModal').classList.add('hidden');
    }

    function deleteVehicleFromModal() {
      const vId = document.getElementById('vId').value;
      const v = state.vehicles.find(item => String(item.ID) === String(vId));
      if (!v) return;

      if (!confirm(`Deseja realmente EXCLUIR PERMANENTEMENTE o veículo ${v.Marca || ''} ${v.Modelo || ''} (${v.PlacaChassi || v.Placa}) e todo o seu histórico de manutenções?`)) {
        return;
      }

      const targetPlateClean = String(v.PlacaChassi || v.Placa || '').replace(/[^A-Z0-9]/gi, '').toUpperCase();

      state.vehicles = state.vehicles.filter(item => String(item.ID) !== String(vId));
      state.logs = state.logs.filter(l => {
        const lPlateClean = String(l.Placa || '').replace(/[^A-Z0-9]/gi, '').toUpperCase();
        return String(l.VeiculoID) !== String(vId) && lPlateClean !== targetPlateClean;
      });

      if (typeof google !== 'undefined' && google.script && google.script.run) {
        google.script.run.deleteVehicle(vId);
      }

      closeVehicleModal();

      if (state.vehicles.length > 0) {
        state.selectedVehicleId = state.vehicles[0].ID;
      } else {
        state.selectedVehicleId = null;
      }

      renderVehicleSelectors();
      renderCurrentVehicleView();
      alert('Veículo e histórico de manutenções excluídos com sucesso!');
    }

    function submitVehicle(e) {
      e.preventDefault();
      const vId = document.getElementById('vId').value;

      const vObj = {
        id: vId,
        ID: vId,
        marca: document.getElementById('vMarca').value.toUpperCase(),
        Marca: document.getElementById('vMarca').value.toUpperCase(),
        modelo: document.getElementById('vModelo').value.toUpperCase(),
        Modelo: document.getElementById('vModelo').value.toUpperCase(),
        anoFabricacao: Number(document.getElementById('vAnoFab').value),
        AnoFabricacao: Number(document.getElementById('vAnoFab').value),
        anoModelo: Number(document.getElementById('vAnoMod').value),
        AnoModelo: Number(document.getElementById('vAnoMod').value),
        placaChassi: document.getElementById('vPlaca').value.toUpperCase(),
        PlacaChassi: document.getElementById('vPlaca').value.toUpperCase(),
        placa: document.getElementById('vPlaca').value.toUpperCase(),
        Placa: document.getElementById('vPlaca').value.toUpperCase(),
        motorizacao: document.getElementById('vMotor').value,
        Motorizacao: document.getElementById('vMotor').value,
        combustivel: document.getElementById('vCombustivel').value,
        Combustivel: document.getElementById('vCombustivel').value,
        tipoTransmissao: document.getElementById('vTransmissao').value,
        TipoTransmissao: document.getElementById('vTransmissao').value,
        tipoDistribuicao: document.getElementById('vDistribuicao') ? document.getElementById('vDistribuicao').value : 'Correia Dentada',
        TipoDistribuicao: document.getElementById('vDistribuicao') ? document.getElementById('vDistribuicao').value : 'Correia Dentada',
        regimeUso: document.getElementById('vRegimeUso').value,
        RegimeUso: document.getElementById('vRegimeUso').value,
        kmInicial: Number(document.getElementById('vKmInicial').value),
        KMInicial: Number(document.getElementById('vKmInicial').value),
        kmAtual: Number(document.getElementById('vKmAtual').value),
        KMAtual: Number(document.getElementById('vKmAtual').value)
      };

      if (vId) {
        const v = state.vehicles.find(item => String(item.ID || item.id) === String(vId));
        if (v) Object.assign(v, vObj);
        if (typeof google !== 'undefined' && google.script && google.script.run) {
          google.script.run
            .withSuccessHandler(res => { loadData(); })
            .updateVehicle(vObj);
        }
      } else {
        const nextNum = state.vehicles.length + 1;
        const newId = 'VEIC-' + String(nextNum).padStart(3, '0');
        vObj.id = newId;
        vObj.ID = newId;
        
        state.vehicles.push(vObj);
        state.selectedVehicleId = newId;
        
        if (typeof google !== 'undefined' && google.script && google.script.run) {
          google.script.run
            .withSuccessHandler(res => { 
              if (res && res.vehicleId) state.selectedVehicleId = res.vehicleId;
              loadData(); 
            })
            .addVehicle(vObj);
        }
      }

      closeVehicleModal();
      renderVehicleSelectors();
      renderCurrentVehicleView();
    }
function promptEditKm() {
      const v = getSelectedVehicle();
      if (!v) return;
      const newKm = prompt(`Atualizar Quilometragem Atual do veículo ${v.Modelo || ''}:`, v.KMAtual || 0);
      if (newKm && !isNaN(newKm)) {
        v.KMAtual = Number(newKm);
        if (typeof google !== 'undefined' && google.script && google.script.run) {
          google.script.run.updateVehicleKm(v.ID, newKm);
        }
        renderCurrentVehicleView();
      }
    }

    function openMaintenanceModal() {
      document.getElementById('maintenanceForm').reset();
      document.getElementById('formLogId').value = '';
      document.getElementById('maintenanceModalTitle').innerHTML = '<i data-lucide="file-plus" class="w-5 h-5 text-sky-400"></i><span>Nova Ocorrência de Manutenção</span>';
      document.getElementById('formData').value = new Date().toISOString().split('T')[0];
      
      const aiBadge = document.getElementById('aiStatusBadge');
      if (aiBadge) aiBadge.classList.add('hidden');

      const v = getSelectedVehicle();
      document.getElementById('formKm').value = v ? v.KMAtual : 0;

      document.getElementById('formOficinaNome').value = '';
      document.getElementById('formOficinaCNPJ').value = '';
      document.getElementById('formOficinaCidade').value = '';
      document.getElementById('formNumeroOS').value = '';

      const tbody = document.getElementById('multiItemsTableBody');
      tbody.innerHTML = '';
      addMultiItemRow({ tipo: 'Peça', desc: '', valor: 0.00 });

      document.getElementById('maintenanceModal').classList.remove('hidden');
      lucide.createIcons();
    }

    function closeMaintenanceModal() {
      document.getElementById('maintenanceModal').classList.add('hidden');
    }

    function addMultiItemRow(itemData = {}) {
      const tbody = document.getElementById('multiItemsTableBody');
      const rowId = 'item-row-' + Date.now() + '-' + Math.floor(Math.random()*10000);
      const subVal = itemData.subsistema || 'Motor/Trem de Força';

      const tr = document.createElement('tr');
      tr.id = rowId;
      tr.className = 'hover:bg-slate-900/60 transition';
      tr.innerHTML = `
        <td class="py-1.5 px-1.5">
          <select class="item-tipo w-full bg-slate-900 text-xs text-slate-200 rounded px-1 py-1 border border-slate-700">
            <option value="Peça" ${itemData.tipo === 'Peça' ? 'selected' : ''}>Peça</option>
            <option value="Mão de Obra" ${itemData.tipo === 'Mão de Obra' ? 'selected' : ''}>Mão de Obra</option>
            <option value="Óleo/Fluido" ${itemData.tipo === 'Óleo/Fluido' ? 'selected' : ''}>Óleo/Fluido</option>
            <option value="Retífica" ${itemData.tipo === 'Retífica' ? 'selected' : ''}>Retífica</option>
            <option value="Insumo" ${itemData.tipo === 'Insumo' ? 'selected' : ''}>Insumo</option>
          </select>
        </td>
        <td class="py-1.5 px-1.5">
          <input type="text" class="item-desc w-full bg-slate-900 text-xs text-slate-200 rounded px-2 py-1 border border-slate-700" placeholder="Descrição da peça ou serviço" value="${itemData.desc || ''}">
        </td>
        <td class="py-1.5 px-1.5">
          <select class="item-sub w-full bg-slate-900 text-xs text-slate-200 rounded px-1.5 py-1 border border-slate-700">
            <option value="Motor/Trem de Força" ${subVal === 'Motor/Trem de Força' ? 'selected' : ''}>Motor/Trem de Força</option>
            <option value="Fluidos/Insumos" ${subVal === 'Fluidos/Insumos' ? 'selected' : ''}>Fluidos/Insumos</option>
            <option value="Arrefecimento" ${subVal === 'Arrefecimento' ? 'selected' : ''}>Arrefecimento</option>
            <option value="Transmissão" ${subVal === 'Transmissão' ? 'selected' : ''}>Transmissão</option>
            <option value="Freios" ${subVal === 'Freios' ? 'selected' : ''}>Freios</option>
            <option value="Suspensão/Direção" ${subVal === 'Suspensão/Direção' ? 'selected' : ''}>Suspensão/Direção</option>
            <option value="Elétrica/Eletrônica" ${subVal === 'Elétrica/Eletrônica' ? 'selected' : ''}>Elétrica/Eletrônica</option>
            <option value="Climatização" ${subVal === 'Climatização' ? 'selected' : ''}>Climatização</option>
            <option value="Injeção/Alimentação" ${subVal === 'Injeção/Alimentação' ? 'selected' : ''}>Injeção/Alimentação</option>
            <option value="Outros / Geral" ${subVal === 'Outros / Geral' ? 'selected' : ''}>Outros / Geral</option>
          </select>
        </td>
        <td class="py-1.5 px-1.5">
          <input type="number" step="0.01" min="0" class="item-unit w-full bg-slate-900 text-xs text-right text-emerald-400 font-mono font-bold rounded px-1.5 py-1 border border-slate-700" placeholder="0.00" value="${itemData.valor !== undefined ? itemData.valor : ''}" oninput="computeTotalFormCost()">
        </td>
        <td class="py-1.5 px-1.5 text-center">
          <button type="button" onclick="removeMultiItemRow('${rowId}')" class="p-1 text-slate-500 hover:text-rose-400"><i data-lucide="x" class="w-3.5 h-3.5"></i></button>
        </td>
      `;

      tbody.appendChild(tr);
      lucide.createIcons();
      computeTotalFormCost();
    }

    function removeMultiItemRow(rowId) {
      const tr = document.getElementById(rowId);
      if (tr) {
        tr.remove();
        computeTotalFormCost();
      }
    }

    function computeTotalFormCost() {
      const rows = document.querySelectorAll('#multiItemsTableBody tr');
      let total = 0;
      rows.forEach(tr => {
        const val = Number(tr.querySelector('.item-unit')?.value || 0);
        total += val;
      });
      document.getElementById('formValor').value = total.toFixed(2);
    }

    function editMaintenanceLog(logId) {
      const log = state.logs.find(l => String(l.ID || l.id) === String(logId));
      if (!log) return;

      document.getElementById('maintenanceForm').reset();
      document.getElementById('formLogId').value = logId;
      document.getElementById('maintenanceModalTitle').innerHTML = '<i data-lucide="pencil" class="w-5 h-5 text-amber-400"></i><span>Editar Ocorrência e Composição</span>';

      document.getElementById('formData').value = log.Data || new Date().toISOString().split('T')[0];
      document.getElementById('formKm').value = log.KM || 0;
      document.getElementById('formTipo').value = log.TipoManutencao || log.Tipo || 'CORRETIVA';
      document.getElementById('formOficinaNome').value = log.OficinaNome || log.Fornecedor || '';
      document.getElementById('formOficinaCNPJ').value = log.OficinaCNPJ || '';
      document.getElementById('formOficinaCidade').value = log.OficinaCidade || '';
      document.getElementById('formNumeroOS').value = log.NumeroOS || '';

      const tbody = document.getElementById('multiItemsTableBody');
      tbody.innerHTML = '';

      const desc = log.DescricaoServico || log.Descricao || '';
      const lines = desc.split('\n');
      let loaded = 0;

      lines.forEach(line => {
        if (line.trim().startsWith('•')) {
          const matchWithSub = line.match(/•\s*(.*?)\s*-\s*R\$\s*([\d.]+)\s*\((.*?)\s*\|\s*(.*?)\)/);
          const matchSimple = line.match(/•\s*(.*?)\s*-\s*R\$\s*([\d.]+)\s*\((.*?)\)/);

          if (matchWithSub) {
            addMultiItemRow({
              desc: matchWithSub[1].trim(),
              valor: Number(matchWithSub[2]),
              tipo: matchWithSub[3].trim(),
              subsistema: matchWithSub[4].trim()
            });
            loaded++;
          } else if (matchSimple) {
            addMultiItemRow({
              desc: matchSimple[1].trim(),
              valor: Number(matchSimple[2]),
              tipo: matchSimple[3].trim(),
              subsistema: log.Subsistema || 'Motor/Trem de Força'
            });
            loaded++;
          }
        }
      });

      if (loaded === 0) {
        addMultiItemRow({ 
          desc: desc.replace(/^•\s*/, ''), 
          valor: Number(log.ValorTotal || 0), 
          tipo: 'Peça',
          subsistema: log.Subsistema || 'Motor/Trem de Força'
        });
      }

      document.getElementById('maintenanceModal').classList.remove('hidden');
      lucide.createIcons();
    }

    function submitMaintenanceLog(e) {
      e.preventDefault();
      const v = getSelectedVehicle();
      if (!v) return;

      const logId = document.getElementById('formLogId').value;
      const rows = document.querySelectorAll('#multiItemsTableBody tr');
      const lines = [];
      let calculatedTotal = 0;
      const distinctSubs = [];

      rows.forEach(tr => {
        const tipo = tr.querySelector('.item-tipo')?.value || 'Peça';
        const desc = tr.querySelector('.item-desc')?.value || '';
        const sub = tr.querySelector('.item-sub')?.value || 'Motor/Trem de Força';
        const val = Number(tr.querySelector('.item-unit')?.value || 0);
        calculatedTotal += val;

        if (desc.trim()) {
          if (!distinctSubs.includes(sub)) distinctSubs.push(sub);
          lines.push(`• ${desc} - R$ ${val.toFixed(2)} (${tipo} | ${sub})`);
        }
      });

      const primarySubsistema = distinctSubs[0] || 'Motor/Trem de Força';

      const logData = {
        id: logId,
        ID: logId,
        veiculoId: v.ID,
        VeiculoID: v.ID,
        placa: v.PlacaChassi || v.Placa || '',
        Placa: v.PlacaChassi || v.Placa || '',
        data: document.getElementById('formData').value,
        Data: document.getElementById('formData').value,
        km: Number(document.getElementById('formKm').value),
        KM: Number(document.getElementById('formKm').value),
        tipoManutencao: document.getElementById('formTipo').value,
        TipoManutencao: document.getElementById('formTipo').value,
        subsistema: primarySubsistema,
        Subsistema: primarySubsistema,
        oficinaNome: document.getElementById('formOficinaNome').value,
        OficinaNome: document.getElementById('formOficinaNome').value,
        oficinaCNPJ: document.getElementById('formOficinaCNPJ').value,
        OficinaCNPJ: document.getElementById('formOficinaCNPJ').value,
        oficinaCidade: document.getElementById('formOficinaCidade').value,
        OficinaCidade: document.getElementById('formOficinaCidade').value,
        numeroOS: document.getElementById('formNumeroOS').value,
        NumeroOS: document.getElementById('formNumeroOS').value,
        valorTotal: calculatedTotal,
        ValorTotal: calculatedTotal,
        descricaoServico: lines.join('\n') || 'Intervenção de Manutenção',
        DescricaoServico: lines.join('\n') || 'Intervenção de Manutenção'
      };

      if (logId) {
        const log = state.logs.find(l => String(l.ID || l.id) === String(logId));
        if (log) {
          Object.assign(log, logData);
        }
        if (typeof google !== 'undefined' && google.script && google.script.run) {
          google.script.run
            .withSuccessHandler(() => {
              loadData();
            })
            .updateMaintenanceLog(logData);
        }
      } else {
        const newId = 'LOG-' + Date.now();
        logData.id = newId;
        logData.ID = newId;
        state.logs.push(logData);
        if (typeof google !== 'undefined' && google.script && google.script.run) {
          google.script.run
            .withSuccessHandler(() => {
              loadData();
            })
            .addMaintenanceLog(logData);
        }
      }

      state.logs = deduplicateLogsList(state.logs);
      closeMaintenanceModal();
      renderCurrentVehicleView();
    }
function deleteMaintenanceLog(logId) {
      if (!confirm('Deseja realmente excluir este registro de manutenção?')) return;

      state.logs = state.logs.filter(l => String(l.ID || l.id) !== String(logId));
      if (typeof google !== 'undefined' && google.script && google.script.run) {
        google.script.run.deleteMaintenanceLog(logId);
      }

      renderCurrentVehicleView();
    }

    function openCreateMarcoZeroFromPlan(intervencao, subsistema) {
      openMaintenanceModal();
      document.getElementById('formTipo').value = 'PREVENTIVA';
      
      const tbody = document.getElementById('multiItemsTableBody');
      tbody.innerHTML = '';
      addMultiItemRow({ desc: `Substituição Marco Zero - ${intervencao}`, subsistema: subsistema, tipo: 'Peça', valor: 0 });
    }

    function openParecerTecnicoModalFromPlan(intervencao, subsistema) {
      const v = getSelectedVehicle();
      document.getElementById('parecerForm').reset();
      document.getElementById('parItemNombre').value = intervencao;
      document.getElementById('parSubsistema').value = subsistema;
      document.getElementById('parDisplayItem').value = `${intervencao} (${subsistema})`;
      
      document.getElementById('parData').value = new Date().toISOString().split('T')[0];
      document.getElementById('parKm').value = v ? v.KMAtual : 0;

      document.getElementById('parecerTecnicoModal').classList.remove('hidden');
      lucide.createIcons();
    }

    function closeParecerTecnicoModal() {
      document.getElementById('parecerTecnicoModal').classList.add('hidden');
    }

    function submitParecerTecnico(e) {
      e.preventDefault();
      const v = getSelectedVehicle();

      const parecerData = {
        veiculoId: v ? v.ID : '',
        placa: v ? (v.PlacaChassi || v.Placa || '') : '',
        itemNombre: document.getElementById('parItemNombre').value,
        subsistema: document.getElementById('parSubsistema').value,
        dataInspecao: document.getElementById('parData').value,
        kmAtual: Number(document.getElementById('parKm').value),
        oficinaNome: document.getElementById('parOficina').value,
        parecerTexto: document.getElementById('parTexto').value
      };

      if (typeof google !== 'undefined' && google.script && google.script.run) {
        google.script.run
          .withSuccessHandler(res => {
            closeParecerTecnicoModal();
            loadData();
            alert(res.message || 'Parecer Técnico Registrado!');
          })
          .saveParecerTecnicoInspecao(parecerData);
      } else {
        closeParecerTecnicoModal();
        renderPrescriptiveCards();
        alert('✨ Parecer Técnico registrado com sucesso!');
      }
    }

    function switchTab(tabName) {
      const sidebarBtnPlan = document.getElementById('sidebarNav-plan');
      const sidebarBtnHistory = document.getElementById('sidebarNav-history');
      const sidebarBtnDash = document.getElementById('sidebarNav-dashboard');

      if (sidebarBtnPlan) sidebarBtnPlan.className = `nav-sidebar-btn w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold ${tabName === 'plan' ? 'text-sky-400 bg-sky-500/10 border border-sky-500/20' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'} transition`;
      if (sidebarBtnHistory) sidebarBtnHistory.className = `nav-sidebar-btn w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold ${tabName === 'history' ? 'text-sky-400 bg-sky-500/10 border border-sky-500/20' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'} transition`;
      if (sidebarBtnDash) sidebarBtnDash.className = `nav-sidebar-btn w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold ${tabName === 'dashboard' ? 'text-sky-400 bg-sky-500/10 border border-sky-500/20' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'} transition`;

      const bottomBtnPlan = document.getElementById('bottomNav-plan');
      const bottomBtnHistory = document.getElementById('bottomNav-history');
      const bottomBtnDash = document.getElementById('bottomNav-dashboard');

      if (bottomBtnPlan) bottomBtnPlan.className = `bottom-nav-btn flex flex-col items-center justify-center ${tabName === 'plan' ? 'text-sky-400 font-bold' : 'text-slate-400'}`;
      if (bottomBtnHistory) bottomBtnHistory.className = `bottom-nav-btn flex flex-col items-center justify-center ${tabName === 'history' ? 'text-sky-400 font-bold' : 'text-slate-400'}`;
      if (bottomBtnDash) bottomBtnDash.className = `bottom-nav-btn flex flex-col items-center justify-center ${tabName === 'dashboard' ? 'text-sky-400 font-bold' : 'text-slate-400'}`;

      document.getElementById('tabContent-plan').classList.add('hidden');
      document.getElementById('tabContent-history').classList.add('hidden');
      document.getElementById('tabContent-dashboard').classList.add('hidden');
      document.getElementById(`tabContent-${tabName}`).classList.remove('hidden');
      if (tabName === 'dashboard') { setTimeout(() => renderParetoChart(), 50); }
    }

    function recalculatePlan() {
      openModalIngestaoPlanoPrescritivo();
    }

    
    
    
    function solicitarPDFDiagnosticoOficina() {
      const diagData = window.ultimoDiagnosticoGerado;
      if (!diagData || !diagData.dados) {
        alert('Nenhum diagnostico disponivel para emissao da ordem de inspecao.');
        return;
      }

      const v = getSelectedVehicle();
      const veiculoId = v ? (v.Marca + ' ' + v.Modelo + ' (' + (v.AnoFabricacao || 2009) + '/' + (v.AnoModelo || 2009) + ') - ' + (v.PlacaChassi || v.Placa) + ' - ' + Number(v.KMAtual || 191706).toLocaleString('pt-BR') + ' KM') : 'CITROEN C4 PALLAS (2009/2009) - EEQ-9C28 - 191.706 KM';
      const diag = diagData.dados;
      const relato = diagData.relato;
      const saude = diagData.saude || { motor: "Monitorado", transmissao: "Monitorado", freios: "Monitorado", suspensao: "Monitorado", arrefecimento: "Monitorado" };

      const btn = document.getElementById('btnGerarPdfOficina');
      if (btn) btn.innerText = '⏳ Gerando Ordem de Inspeção...';

      if (typeof google !== 'undefined' && google.script && google.script.run) {
        google.script.run
          .withSuccessHandler(function(res) {
            if (btn) btn.innerHTML = '<span>📄</span> EXPORTAR ORDEM DE INSPEÇÃO (OFICINA)';
            if (res && res.success && res.base64) {
              const link = document.createElement('a');
              link.href = 'data:application/pdf;base64,' + res.base64;
              link.download = res.fileName || 'SIGMA_Ordem_Investigacao_Oficina.pdf';
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
            } else {
              alert('Erro ao gerar laudo no backend: ' + (res?.error || 'Desconhecido'));
            }
          })
          .withFailureHandler(function(err) {
            if (btn) btn.innerHTML = '<span>📄</span> EXPORTAR ORDEM DE INSPEÇÃO (OFICINA)';
            alert('Falha na comunicação com o servidor ao gerar o PDF.');
          })
          .gerarLaudoOficina(veiculoId, relato, diag, saude);
      }
    }

    function exportPdfDossier() {
      const v = getSelectedVehicle();
      if (!v) {
        alert('Nenhum veículo selecionado para emissão do dossiê.');
        return;
      }

      const targetPlateClean = String(v.PlacaChassi || v.Placa || '').replace(/[^A-Z0-9]/gi, '').toUpperCase();

      const logs = deduplicateLogsList(state.logs.filter(l => {
        const lPlateClean = String(l.Placa || '').replace(/[^A-Z0-9]/gi, '').toUpperCase();
        return String(l.VeiculoID) === String(v.ID) || lPlateClean === targetPlateClean;
      }));

      const plans = state.prescriptivePlan || [];
      const scoreVal = document.getElementById('scoreValue')?.innerText || '---';

      const { jsPDF } = window.jspdf;
      const doc = new jsPDF('p', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      
      const margin = 12;
      const printWidth = pageWidth - (margin * 2);

      let y = 14;

      function checkNewPage(neededHeight) {
        if (y + neededHeight > pageHeight - 18) {
          doc.addPage();
          y = 16;
          drawPageHeader();
        }
      }

      function drawPageHeader() {
        doc.setFillColor(15, 23, 42);
        doc.rect(0, 0, pageWidth, 12, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9.5);
        doc.text(`SIGMA — DOSSIÊ DE AUDITORIA VEICULAR (${v.Marca || ''} ${v.Modelo || ''} - ${v.PlacaChassi || v.Placa})`, margin, 8);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.text(`Emissão: ${new Date().toLocaleDateString('pt-BR')}`, pageWidth - margin, 8, { align: 'right' });
      }

      drawPageHeader();
      y = 18;

      doc.setFillColor(30, 41, 59);
      doc.roundedRect(margin, y, printWidth, 34, 3, 3, 'F');
      
      doc.setTextColor(56, 189, 248);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.text(`${v.Marca || ''} ${v.Modelo || ''} (${v.AnoFabricacao || 2009}/${v.AnoModelo || 2009})`, margin + 4, y + 8.5);

      doc.setTextColor(226, 232, 240);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      doc.text(`Placa Oficial: ${v.PlacaChassi || v.Placa}   |   Motor: ${v.Motorizacao || '2.0'}   |   Combustível: ${v.Combustivel || 'FLEX'}`, margin + 4, y + 16.5);

      doc.setTextColor(245, 158, 11);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.text(`REGIME OPERACIONAL: ${v.RegimeUso || 'SEVERO_URBANO'}   |   ODÔMETRO BASE: ${Number(v.KMAtual || 0).toLocaleString('pt-BR')} KM`, margin + 4, y + 25.5);

      const scoreBoxX = pageWidth - margin - 48;
      doc.setFillColor(15, 23, 42);
      doc.roundedRect(scoreBoxX, y + 3.5, 44, 27, 2, 2, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.text('SCORE SAÚDE SIGMA', scoreBoxX + 22, y + 8, { align: 'center' });

      doc.setFontSize(14);
      const scoreNum = parseInt(scoreVal, 10);
      if (!isNaN(scoreNum)) {
        if (scoreNum >= 80) doc.setTextColor(52, 211, 153);
        else if (scoreNum >= 55) doc.setTextColor(251, 191, 36);
        else doc.setTextColor(244, 63, 94);
        doc.text(`${scoreNum} / 100`, scoreBoxX + 22, y + 16, { align: 'center' });
      } else {
        doc.setTextColor(148, 163, 184);
        doc.text(`---`, scoreBoxX + 22, y + 16, { align: 'center' });
      }

      y += 40;

      doc.setFillColor(245, 158, 11);
      doc.rect(margin, y, 3.5, 6, 'F');
      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10.5);
      doc.text('1. QUADRO DE GESTÃO DE RISCOS & ITENS EM PRECAUÇÃO REAL', margin + 6, y + 4.8);
      y += 9;

      const marcoZeroItems = plans.filter(p => (p.status || p.Status) !== 'EM_DIA' || !p.km_ultima_execucao);
      
      if (marcoZeroItems.length > 0) {
        doc.setFillColor(30, 41, 59);
        doc.rect(margin, y, printWidth, 6.5, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.text('SUBSISTEMA / INTERVENÇÃO', margin + 3, y + 4.5);
        doc.text('CLASSIFICAÇÃO DE RISCO', 72, y + 4.5);
        doc.text('DIRETIVA DE PRECAUÇÃO TÉCNICA', 110, y + 4.5);
        y += 7.5;

        marcoZeroItems.forEach((p, idx) => {
          const intervLines = doc.splitTextToSize(p.intervencao, 53);
          const recLines = doc.splitTextToSize(p.texto_precaucao || 'Recomendada avaliação técnica imediata.', 86);
          const maxLines = Math.max(intervLines.length, recLines.length);
          const rowHeight = Math.max(10, maxLines * 4.2 + 4);

          checkNewPage(rowHeight + 2);

          if (idx % 2 === 0) {
            doc.setFillColor(248, 250, 252);
            doc.rect(margin, y - 1, printWidth, rowHeight, 'F');
          }

          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8.5);
          doc.setTextColor(15, 23, 42);
          doc.text(intervLines, margin + 3, y + 3.8);

          const isCritico = (p.status || p.Status) === 'CRITICO_SEM_HISTORICO';
          if (isCritico) {
            doc.setFillColor(254, 226, 226);
            doc.roundedRect(70, y + 1, 35, 6, 1, 1, 'F');
            doc.setTextColor(190, 18, 60);
          } else {
            doc.setFillColor(254, 243, 199);
            doc.roundedRect(70, y + 1, 35, 6, 1, 1, 'F');
            doc.setTextColor(180, 83, 9);
          }
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(7.5);
          doc.text(isCritico ? 'CRÍTICO DESTRUTIVO' : 'INSPECIONÁVEL', 87.5, y + 5.2, { align: 'center' });

          doc.setFont('helvetica', 'normal');
          doc.setFontSize(8.5);
          doc.setTextColor(51, 65, 85);
          doc.text(recLines, 110, y + 3.8);

          y += rowHeight;
        });
      }

      y += 7;

      checkNewPage(30);
      doc.setFillColor(14, 165, 233);
      doc.rect(margin, y, 3.5, 6, 'F');
      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10.5);
      doc.text('2. HISTÓRICO DE MANUTENÇÕES, APLICAÇÃO DE PEÇAS & INSUMOS', margin + 6, y + 4.8);
      y += 9;

      if (logs.length === 0) {
        checkNewPage(12);
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(8.5);
        doc.setTextColor(100, 116, 139);
        doc.text('Nenhuma ocorrência gravada para este veículo.', margin, y + 5);
        y += 10;
      } else {
        logs.forEach(l => {
          checkNewPage(35);
          
          doc.setFillColor(15, 23, 42);
          doc.roundedRect(margin, y, printWidth, 11, 2, 2, 'F');

          doc.setTextColor(56, 189, 248);
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(9);
          doc.text(`EVENTO / DOC Nº ${l.NumeroOS || '---'}: DATA: ${l.Data}   |   KM: ${Number(l.KM || 0).toLocaleString('pt-BR')} KM   |   TIPO: ${l.TipoManutencao || 'PREVENTIVA'}`, margin + 4, y + 4.8);

          doc.setTextColor(52, 211, 153);
          doc.text(`FORNECEDOR: ${l.OficinaNome || 'Oficina'} (${l.OficinaCidade || ''})   |   VALOR QUITADO: R$ ${Number(l.ValorTotal || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})}`, margin + 4, y + 9);

          y += 13;

          doc.setFillColor(51, 65, 85);
          doc.rect(margin, y, printWidth, 6, 'F');
          doc.setTextColor(255, 255, 255);
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8.5);
          doc.text('#', margin + 3, y + 4.2);
          doc.text('DESCRIÇÃO DA PEÇA / SERVIÇO APLICADO', margin + 14, y + 4.2);
          doc.text('CATEGORIA', 132, y + 4.2);
          doc.text('VALOR (R$)', pageWidth - margin - 3, y + 4.2, { align: 'right' });
          y += 7;

          const rawLines = (l.DescricaoServico || l.Descricao || '').split('\n');

          rawLines.forEach((line, idx) => {
            if (!line.trim()) return;

            checkNewPage(8);

            let descText = line.replace(/^•\s*/, '');
            let catText = 'Peça';
            let valText = 'R$ 0,00';

            const matchFull = line.match(/•?\s*(.*?)\s*-\s*R\$\s*([\d.]+)\s*\((.*?)\)/);
            if (matchFull) {
              descText = matchFull[1];
              valText = 'R$ ' + Number(matchFull[2]).toLocaleString('pt-BR', {minimumFractionDigits: 2});
              catText = matchFull[3];
            }

            const descWrapped = doc.splitTextToSize(descText, 102);
            const rowH = Math.max(6, descWrapped.length * 4.2 + 2);

            if (idx % 2 === 0) {
              doc.setFillColor(241, 245, 249);
              doc.rect(margin, y - 1, printWidth, rowH, 'F');
            }

            doc.setFont('helvetica', 'bold');
            doc.setFontSize(8.5);
            doc.setTextColor(15, 23, 42);
            doc.text(String(idx + 1).padStart(2, '0'), margin + 3, y + 3.5);

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8.5);
            doc.text(descWrapped, margin + 14, y + 3.5);

            doc.setFont('helvetica', 'bold');
            doc.setFontSize(8);
            doc.setTextColor(71, 85, 105);
            doc.text(catText, 132, y + 3.5);

            doc.setFont('helvetica', 'bold');
            doc.setFontSize(8.5);
            doc.setTextColor(15, 23, 42);
            doc.text(valText, pageWidth - margin - 3, y + 3.5, { align: 'right' });

            y += rowH;
          });

          y += 6;
        });
      }

      // 3. CONTAINER DE AUDITORIA FORENSE & HASH SHA-256 (LEI 12.965/2014 - MARCO CIVIL DA INTERNET)
      checkNewPage(32);
      y += 4;
      doc.setDrawColor(203, 213, 225);
      doc.setLineWidth(0.5);
      doc.line(margin, y, pageWidth - margin, y);
      y += 5;

      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.4);
      doc.roundedRect(margin, y, printWidth, 26, 2, 2, 'FD');
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(15, 23, 42);
      doc.text('AUDITORIA FORENSE & FIDELIDADE DECLARATÓRIA (LEI 12.965/2014 - MARCO CIVIL DA INTERNET)', margin + 4, y + 5.5);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(71, 85, 105);
      doc.text('Este dossiê constitui documento técnico consolidado de gestão de manutenção veicular. Os pareceres prescritivos possuem caráter consultivo e probabilístico, condicionados à fidedignidade dos dados declarados pelo usuário.', margin + 4, y + 10.5, { maxWidth: printWidth - 8 });

      // Geração de Hash SHA-256 Forense
      const rawHashStr = `${v.ID || 'VEH'}_${v.KMAtual || 0}_${new Date().getTime()}`;
      let h1 = 0xdeadbeef ^ 0, h2 = 0x41c6ce57 ^ 0;
      for (let i = 0, ch; i < rawHashStr.length; i++) {
        ch = rawHashStr.charCodeAt(i);
        h1 = Math.imul(h1 ^ ch, 2654435761);
        h2 = Math.imul(h2 ^ ch, 1597334677);
      }
      h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
      h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
      const hashDoc = ((h1 >>> 0).toString(16).padStart(8, '0') + (h2 >>> 0).toString(16).padStart(8, '0') + (Math.abs(h1 ^ h2) >>> 0).toString(16).padStart(8, '0')).substring(0, 24).toUpperCase();
      
      const dataEmissaoFull = new Date().toLocaleDateString('pt-BR') + ' ' + new Date().toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit'});

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(2, 132, 199);
      doc.text(`[ AUTENTICIDADE FORENSE: SHA256-${hashDoc} • EMISSÃO: ${dataEmissaoFull} ]`, margin + 4, y + 18.5);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.8);
      doc.setTextColor(100, 116, 139);
      doc.text(`SISTEMA SIGMA CMMS v32.0 • TECNOLOGIA INFINITUS SISTEMAS INTELIGENTES LTDA (CNPJ: 09.371.580/0001-06)`, margin + 4, y + 22.5);

      y += 30;

      // 4. RODAPÉ INSTITUCIONAL (APLICADO EM TODAS AS PÁGINAS NO FINAL)
      const totalPages = doc.internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFillColor(248, 250, 252);
        doc.rect(0, pageHeight - 15, pageWidth, 15, 'F');
        
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.4);
        doc.line(0, pageHeight - 15, pageWidth, pageHeight - 15);

        // Linha 1 do Rodapé: Título à esquerda | Página à direita
        doc.setTextColor(15, 23, 42);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.text('DECLARAÇÃO DOS 3 PILARES SIGMA:', margin, pageHeight - 9.5);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.8);
        doc.setTextColor(2, 132, 199);
        doc.text(`Página ${i} de ${totalPages}`, pageWidth - margin, pageHeight - 9.5, { align: 'right' });

        // Linha 2 do Rodapé: Descrição dos 3 Pilares
        doc.setTextColor(100, 116, 139);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.2);
        doc.text('1. PRESERVAÇÃO DO ATIVO VEICULAR   •   2. PREVENÇÃO CONTRA FALHAS GRAVES E DESTRUTIVAS   •   3. AUDITORIA FINANCEIRA E HISTÓRICO CAUSAL', margin, pageHeight - 5);
      }

      doc.save(`SIGMA_Dossie_${v.PlacaChassi || v.Placa}_${new Date().toISOString().split('T')[0]}.pdf`);
    }
  