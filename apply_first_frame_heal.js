const fs = require('fs');

// 1. BACKUP DE SEGURANÇA MANDATÓRIO
const backupDir = 'backups/checkpoint_v108_instant_first_frame_render';
if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
fs.copyFileSync('Code.gs', backupDir + '/Code.gs');
fs.copyFileSync('index.html', backupDir + '/index.html');
fs.copyFileSync('App.html', backupDir + '/App.html');

// 2. ATUALIZAR INDEX.HTML E APP.HTML COM ESTADO 100% PRÉ-HIDRATADO E RENDERIZAÇÃO NO DOMCONTENTLOADED
let html = fs.readFileSync('index.html', 'utf8');

// 2.1. Injetar logs e prescrições canônicas no state inicial
const completeState = `let state = {
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
      customPrescriptions: [
        { ID: 'PRES-001', Subcausa: 'Substituição do Óleo do Motor e Filtro', Sistema: 'Motor / Trem de Força', IntervaloKM_Normal: 10000, IntervaloMeses_Normal: 12, IntervaloKM_Severo: 10000, IntervaloMeses_Severo: 12, Prioridade: 'CRITICA', Ativo: true, Fonte: 'MANTENEDOR', Observacoes: 'Óleo 10W40 semissintético PSA B71 2296', VeiculoID: 'VEIC-001' },
        { ID: 'PRES-002', Subcausa: 'Substituição do Filtro de Combustível de Linha', Sistema: 'Motor / Trem de Força', IntervaloKM_Normal: 10000, IntervaloMeses_Normal: 12, IntervaloKM_Severo: 10000, IntervaloMeses_Severo: 12, Prioridade: 'CRITICA', Ativo: true, Fonte: 'MANTENEDOR', Observacoes: 'Proteção do sistema de injeção', VeiculoID: 'VEIC-001' },
        { ID: 'PRES-003', Subcausa: 'Substituição do Filtro de Ar do Motor', Sistema: 'Motor / Trem de Força', IntervaloKM_Normal: 10000, IntervaloMeses_Normal: 12, IntervaloKM_Severo: 10000, IntervaloMeses_Severo: 12, Prioridade: 'ALERTA', Ativo: true, Fonte: 'MANTENEDOR', Observacoes: 'Elemento de ar do motor', VeiculoID: 'VEIC-001' },
        { ID: 'PRES-004', Subcausa: 'Substituição do Filtro de Cabine / Ar-Condicionado', Sistema: 'Habitáculo / Climatização', IntervaloKM_Normal: 10000, IntervaloMeses_Normal: 12, IntervaloKM_Severo: 10000, IntervaloMeses_Severo: 12, Prioridade: 'ALERTA', Ativo: true, Fonte: 'MANTENEDOR', Observacoes: 'Filtro anti-pólen e higienização', VeiculoID: 'VEIC-001' },
        { ID: 'PRES-005', Subcausa: 'Sistema de Arrefecimento Completo (Bomba, Válvula, Trocador)', Sistema: 'Arrefecimento', IntervaloKM_Normal: 10000, IntervaloMeses_Normal: 12, IntervaloKM_Severo: 10000, IntervaloMeses_Severo: 12, Prioridade: 'CRITICA', Ativo: true, Fonte: 'MANTENEDOR', Observacoes: 'Fluido Wurth Rosa NF 000.001.414', VeiculoID: 'VEIC-001' },
        { ID: 'PRES-006', Subcausa: 'Substituição Completa do Fluido de Freio (DOT 4)', Sistema: 'Freios', IntervaloKM_Normal: 10000, IntervaloMeses_Normal: 12, IntervaloKM_Severo: 10000, IntervaloMeses_Severo: 12, Prioridade: 'CRITICA', Ativo: true, Fonte: 'MANTENEDOR', Observacoes: 'Diretriz técnica sob acompanhamento', VeiculoID: 'VEIC-001' },
        { ID: 'PRES-007', Subcausa: 'Substituição do Kit Correia Dentada e Tensor', Sistema: 'Sincronismo / Motor', IntervaloKM_Normal: 70000, IntervaloMeses_Normal: 48, IntervaloKM_Severo: 56000, IntervaloMeses_Severo: 36, Prioridade: 'CRITICA', Ativo: true, Fonte: 'OEM', Observacoes: 'Kit correia sincronizadora e tensor', VeiculoID: 'VEIC-001' },
        { ID: 'PRES-008', Subcausa: 'Substituição das Velas de Ignição', Sistema: 'Ignição / Motor', IntervaloKM_Normal: 40000, IntervaloMeses_Normal: 24, IntervaloKM_Severo: 32000, IntervaloMeses_Severo: 24, Prioridade: 'CRITICA', Ativo: true, Fonte: 'OEM', Observacoes: 'Jogo de 4 velas de ignição', VeiculoID: 'VEIC-001' }
      ],
      logs: [
        { ID: 'LOG-001', Data: '2026-08-10', KM: 191706, TipoManutencao: 'PREVENTIVA', Tipo: 'PREVENTIVA', Subsistema: 'Motor / Trem de Força', Sistema: 'Motor / Trem de Força', Subcausa: 'Substituição do Óleo do Motor e Filtro', DescricaoServico: 'Troca de óleo de motor 10W40 semissintético e filtro de óleo Mann', ValorTotal: 320, CustoPecas: 240, CustoMaoDeObra: 80, OficinaNome: 'FLORIPA CASA E CONSTRUCAO LTDA', NumeroNF: 'NF-5481', VeiculoID: 'VEIC-001', Placa: 'EEQ-9C28' },
        { ID: 'LOG-002', Data: '2026-08-10', KM: 191706, TipoManutencao: 'PREVENTIVA', Tipo: 'PREVENTIVA', Subsistema: 'Motor / Trem de Força', Sistema: 'Motor / Trem de Força', Subcausa: 'Substituição do Filtro de Combustível de Linha', DescricaoServico: 'Troca de filtro de combustível de linha FLEX', ValorTotal: 135, CustoPecas: 95, CustoMaoDeObra: 40, OficinaNome: 'FLORIPA CASA E CONSTRUCAO LTDA', NumeroNF: 'NF-5481', VeiculoID: 'VEIC-001', Placa: 'EEQ-9C28' },
        { ID: 'LOG-003', Data: '2026-08-10', KM: 191706, TipoManutencao: 'PREVENTIVA', Tipo: 'PREVENTIVA', Subsistema: 'Motor / Trem de Força', Sistema: 'Motor / Trem de Força', Subcausa: 'Substituição do Filtro de Ar do Motor', DescricaoServico: 'Substituição do elemento filtrante de ar', ValorTotal: 115, CustoPecas: 85, CustoMaoDeObra: 30, OficinaNome: 'FLORIPA CASA E CONSTRUCAO LTDA', NumeroNF: 'NF-5481', VeiculoID: 'VEIC-001', Placa: 'EEQ-9C28' },
        { ID: 'LOG-004', Data: '2026-08-10', KM: 191706, TipoManutencao: 'PREVENTIVA', Tipo: 'PREVENTIVA', Subsistema: 'Habitáculo / Climatização', Sistema: 'Habitáculo / Climatização', Subcausa: 'Substituição do Filtro de Cabine / Ar-Condicionado', DescricaoServico: 'Troca de filtro de cabine anti-pólen e higienização', ValorTotal: 105, CustoPecas: 75, CustoMaoDeObra: 30, OficinaNome: 'FLORIPA CASA E CONSTRUCAO LTDA', NumeroNF: 'NF-5481', VeiculoID: 'VEIC-001', Placa: 'EEQ-9C28' },
        { ID: 'LOG-005', Data: '2026-06-09', KM: 191706, TipoManutencao: 'PREVENTIVA', Tipo: 'PREVENTIVA', Subsistema: 'Arrefecimento', Sistema: 'Arrefecimento', Subcausa: 'Sistema de Arrefecimento Completo (Bomba, Válvula, Trocador)', DescricaoServico: 'WURTH FLUIDO RADIADOR ROSA 1L (2 unidades) e revisão do arrefecimento', ValorTotal: 111.36, CustoPecas: 111.36, CustoMaoDeObra: 0, OficinaNome: 'FLORIPA CASA E CONSTRUCAO LTDA', NumeroNF: '000.001.414', VeiculoID: 'VEIC-001', Placa: 'EEQ-9C28' }
      ],
      paretoChartInstance: null,
      activeIngestionTab: 'auto'
    };`;

html = html.replace(/let state = \{[\s\S]*?activeIngestionTab: 'auto'\s*\};/, completeState);

// 2.2. Atualizar DOMContentLoaded para renderizar imediatamente
const newDomLoaded = `document.addEventListener('DOMContentLoaded', () => {
      lucide.createIcons();
      setupDropzoneHandlers();
      renderVehicleSelectors();
      renderCurrentVehicleView();
      loadData();
    });`;

html = html.replace(/document\.addEventListener\('DOMContentLoaded'[\s\S]*?loadData\(\);\s*\}\);/, newDomLoaded);

// 2.3. Atualizar onDataLoaded para mesclagem blindada
const newOnDataLoaded = `function onDataLoaded(data) {
      if (!data) return;
      if (data.vehicles && data.vehicles.length > 0) {
        state.vehicles = data.vehicles;
      }
      if (data.prescriptivePlans && data.prescriptivePlans.length > 0) {
        state.customPrescriptions = data.prescriptivePlans;
      }
      if (data.logs && data.logs.length > 0) {
        state.logs = deduplicateLogsAndItems(data.logs);
      }
      if (data.oficinas && data.oficinas.length > 0) {
        state.oficinas = data.oficinas;
      }

      const currentExists = state.vehicles.some(v => String(v.ID || v.id) === String(state.selectedVehicleId));
      if (!currentExists && state.vehicles.length > 0) {
        state.selectedVehicleId = state.vehicles[0].ID || state.vehicles[0].id;
      }

      renderVehicleSelectors();
      renderCurrentVehicleView();
    }`;

html = html.replace(/function onDataLoaded\(data\)[\s\S]*?renderVehicleSelectors\(\);\s*renderCurrentVehicleView\(\);\s*\}/, newOnDataLoaded);

fs.writeFileSync('index.html', html, 'utf8');
fs.writeFileSync('App.html', html, 'utf8');
console.log('✅ Renderização de primeiro frame blindada com sucesso!');
