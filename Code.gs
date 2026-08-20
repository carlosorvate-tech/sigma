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
      "Mecânica Pesada / Injeção Eletrônica", "Carlos Silva (Chefe de Oficina)", "TRUE"
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

function dispararSolicitacaoOficina(dadosDiagnostico, idOficinaEscolhida) {
  var oficina = obterOficinaPorId(idOficinaEscolhida);
  if (!oficina) {
    throw new Error("Oficina selecionada não encontrada na base de dados.");
  }
  
  var mensagem = "*SOLICITAÇÃO DE AGENDAMENTO / DIAGNÓSTICO - SIGMA V2.0*\n\n" +
                 "Frota/Ativo: " + (dadosDiagnostico.ativo || "CITROËN C4 PALLAS (EEQ-9C28)") + "\n" +
                 "Problema Relatado: " + (dadosDiagnostico.falha || "Revisão Prescritiva Periódica") + "\n" +
                 "Diagnóstico Prévio: " + (dadosDiagnostico.diagnosticoPrevio || "Conforme Plano Prescritivo SIGMA") + "\n" +
                 "Urgência: " + (dadosDiagnostico.urgencia || "Alta") + "\n\n" +
                 "Favor confirmar recebimento e disponibilidade técnica.";
  
  var foneLimpo = (oficina.contatoMensagens || "").replace(/\D/g, '');
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
