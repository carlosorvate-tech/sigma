const fs = require('fs');

let html = fs.readFileSync('index.html', 'utf8');

// 1. Garantir que no mock inicial state.oficinas já possua a oficina base como padrão
if (html.includes('state = {')) {
  if (!html.includes('oficinas:')) {
    html = html.replace('state = {', `state = {\n      oficinas: [\n        {\n          id: "OFI_001", ID_Oficina: "OFI_001",\n          nomeFantasia: "Oficina Mecânica Precision Auto", Nome_Fantasia: "Oficina Mecânica Precision Auto",\n          nomeJuridico: "Precision Manutenções Automotivas LTDA", Nome_Juridico: "Precision Manutenções Automotivas LTDA",\n          cnpjh: "12.345.678/0001-90", CNPJ: "12.345.678/0001-90",\n          endereco: "Av. Principal, 1500 - São Paulo, SP", Endereco: "Av. Principal, 1500 - São Paulo, SP",\n          contatoMensagens: "5511987654321", Contato_Mensagens: "5511987654321",\n          contatoCelular: "(11) 98765-4321", Contato_Celular: "(11) 98765-4321",\n          telefoneFisico: "(11) 3456-7890", Telefone_Fisico: "(11) 3456-7890",\n          emails: "contato@precisionauto.com.br", Emails: "contato@precisionauto.com.br",\n          tipoAtendimento: "Mecânica Geral e Injeção", Tipo_Atendimento: "Mecânica Geral e Injeção",\n          mecanicoResponsavel: "Carlos Silva (Chefe de Oficina)", Mecanico_Responsavel: "Carlos Silva (Chefe de Oficina)",\n          isBase: true, Flag_Oficina_Base: true\n        },\n        {\n          id: "OFI_002", ID_Oficina: "OFI_002",\n          nomeFantasia: "FLORIPA CASA E CONSTRUCAO LTDA", Nome_Fantasia: "FLORIPA CASA E CONSTRUCAO LTDA",\n          nomeJuridico: "Floripa Casa e Construção LTDA", Nome_Juridico: "Floripa Casa e Construção LTDA",\n          cnpjh: "59.997.717/0001-00", CNPJ: "59.997.717/0001-00",\n          endereco: "Estrada Vereador Onildo Lemos, 728 - Florianópolis, SC", Endereco: "Estrada Vereador Onildo Lemos, 728 - Florianópolis, SC",\n          contatoMensagens: "5548996720566", Contato_Mensagens: "5548996720566",\n          contatoCelular: "(48) 99672-0566", Contato_Celular: "(48) 99672-0566",\n          telefoneFisico: "(48) 3269-1000", Telefone_Fisico: "(48) 3269-1000",\n          emails: "fiscal@floripacasa.com.br", Emails: "fiscal@floripacasa.com.br",\n          tipoAtendimento: "Fornecedor de Peças / Insumos", Tipo_Atendimento: "Fornecedor de Peças / Insumos",\n          mecanicoResponsavel: "Central de Vendas", Mecanico_Responsavel: "Central de Vendas",\n          isBase: false, Flag_Oficina_Base: false\n        }\n      ],`);
  }
}

// 2. Garantir que no callback de dados iniciais state.oficinas seja atualizado e re-renderizado
if (html.includes('function fetchInitialData()')) {
  html = html.replace('state.vehicles = data.vehicles || [];', 'state.vehicles = data.vehicles || [];\n      if (data.oficinas && data.oficinas.length > 0) state.oficinas = data.oficinas;');
}

fs.writeFileSync('index.html', html, 'utf8');
fs.writeFileSync('App.html', html, 'utf8');
console.log('✅ Estado inicial pré-populado com a Oficina Base oficial!');
