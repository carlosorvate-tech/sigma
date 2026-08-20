const fs = require('fs');

// 1. ATUALIZAR CODE.GS COM OS DADOS REAIS AUDITADOS DA AUTO MECÂNICA REPÚBLICA
let codeGs = fs.readFileSync('Code.gs', 'utf8');

const realOficinaSeed = `aba.appendRow([
      "OFI_001", 
      "AUTO MECANICA REPUBLICA", 
      "BRICHI E MARTINI AUTO MECANICA LTDA-ME", 
      "15.821.397/0001-50",
      "AV REPUBLICA, 2280 - PALMITAL - Marília, SP", 
      "5514996810031", 
      "(14) 99681-0031", 
      "(14) 3413-8811", 
      "contato@automecanicarepublica.com.br",
      "Mecânica Geral, Retífica de Motores e Injeção", 
      "Tiago (Mecânico Responsável)", 
      "TRUE"
    ]);`;

codeGs = codeGs.replace(/aba\.appendRow\(\[\s*"OFI_001",[\s\S]*?\]\);/, realOficinaSeed);
fs.writeFileSync('Code.gs', codeGs, 'utf8');

// 2. ATUALIZAR INDEX.HTML E APP.HTML COM OS DADOS REAIS AUDITADOS
let html = fs.readFileSync('index.html', 'utf8');

const realOficinaJsObj = `{
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
        }`;

html = html.replace(/\{\s*id:\s*"OFI_001"[\s\S]*?isBase:\s*true[\s\S]*?\}/, realOficinaJsObj);

fs.writeFileSync('index.html', html, 'utf8');
fs.writeFileSync('App.html', html, 'utf8');
console.log('✅ Dados reais da Auto Mecânica República (Brichi e Martini) auditados e gravados!');
