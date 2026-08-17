# DOCUMENTO DE ARQUITETURA, PROCESSOS, ENGENHARIA E CODIFICAÇÃO — SIGMA v1.0
**Revisão Oficial:** 17 de Agosto de 2026 (`rev 17Ago26`)  
**Autoria Intelectual & Concepção:** ORVATE, Carlos A.  
**Propriedade Comercial & Industrial:** Infinitus Sistemas Inteligentes Ltda (CNPJ: 09.371.580/0001-06)  
**URL Oficial de Produção:** [https://sigma.infinitussistemas.com.br](https://sigma.infinitussistemas.com.br)

---

## 1. Visão Geral, Problema e Proposta de Valor

O **SIGMA (Sistema Inteligente de Gestão de Manutenções Automotivas)** é uma plataforma avançada de CMMS (*Computerized Maintenance Management System*) e triagem B2B de alta precisão desenvolvida para transformar a relação operacional entre condutores, frotistas e oficinas mecânicas.

* **O Problema Resolvido:** O setor automotivo sofre historicamente com a assimetria de informações entre o proprietário do veículo e o reparador, a ausência de rastreabilidade do histórico de manutenções, a confusão cadastral entre fornecedores de autopeças e oficinas mecânicas prestadoras de serviço, a perda de oportunidades comerciais preventivas (*upsell*) por falta de diagnósticos estruturados, o risco de falhas mecânicas catastróficas por negligência e a desconfiança técnica mútua.
* **Proposta de Valor:** Conectar o relato em linguagem natural do condutor ao diagnóstico causal profundo por Inteligência Artificial (Google Gemini 3.5 Flash), gerando ordens de inspeção técnica blindadas juridicamente para o chão de oficina, estimulando receitas preventivas baseadas em quilometragem e garantindo a preservação integral do ativo veicular sob a Lei 12.965/2014 (Marco Civil da Internet).

---

## 2. Atores do Ecossistema

1. **Condutores / Proprietários:** Buscam transparência técnica, segurança, previsibilidade orçamentária, gestão de suas oficinas mecânicas de confiança e preservação do valor de revenda do patrimônio veicular.
2. **Chefes de Oficina / Reparadores Mecânicos:** Usuários B2B que necessitam de triagens diagnósticas rápidas, hipóteses direcionadas para testes de bancada/elevador, isenção de responsabilidade por queixas subjetivas e identificação imediata de oportunidades de faturamento preventivo (*upsell*).
3. **Fornecedores & Autopeças:** Distribuidores de componentes que emitem notas fiscais (NF-e) registradas na auditoria de custos do veículo, diferenciados conceitualmente das oficinas executoras.
4. **Gestores de Frota (Módulo v2.0 Ready):** Necessitam de gestão multi-veículo, isolamento multi-tenant por frota, trilhas de auditoria centralizadas, métricas de fornecedores/prestadores e conformidade operacional.

---

## 3. Os 3 Pilares Fundamentais do SIGMA

* **Pilar 1 — Preservação do Ativo Veicular:** Monitoramento rigoroso de fluidos, tolerâncias, intervalos estritos de quilometragem/tempo e ciclos térmicos para maximizar a vida útil do motor e subsistemas críticos.
* **Pilar 2 — Prevenção Contra Falhas Graves e Destrutivas:** Antecipação a colapsos catastróficos (rompimento de correia dentada, degradação térmica do fluido de transmissão automática, colapso de juntas por superaquecimento no arrefecimento) por meio de diretrizes prescritivas calibradas pelo regime de severidade de uso.
* **Pilar 3 — Auditoria Financeira e Histórico Causal:** Registro imutável de todas as peças, insumos, serviços, notas fiscais (XML/PDF) e prestadores aplicados ao longo da vida útil do ativo.

---

## 4. Arquitetura Tecnológica e Stack

O SIGMA adota uma arquitetura híbrida de alta performance e disponibilidade, otimizada para o ecossistema Google Cloud e Google Workspace:

* **Backend (Servidor & Microsserviços):** Google Apps Script (Motor V8), executando endpoints REST/RPC assíncronos (`google.script.run`), manipulação de dados, ingestão OCR/XML e automação documental.
* **Banco de Dados Relacional Estruturado:** Google Sheets atuando como banco relacional de alta fidelidade, composto por 5 tabelas canônicas:
  1. `ATIVOS`: Cadastro completo de veículos (Marca, Modelo, Ano Fabricação/Modelo, Motorização, Combustível, Placa/Chassi, KM Inicial, KM Atual, Regime de Uso, Tipo de Transmissão, Tipo de Distribuição, OficinaBaseID, OficinaBaseNome).
  2. `PLANO_PRESCRITIVO`: Matriz prescritiva calibrada por ativo (`ID`, `VeiculoID`, `Intervencao`, `Subsistema`, `Tipo`, `IntervaloKM`, `IntervaloMeses`, `EspecificacaoTecnica`, `OrigemFonte`, `TextoPrecaucao`, `DataAtualizacao`).
  3. `REGISTRO_OCORRENCIAS`: Histórico de manutenções e auditoria financeira (`ID`, `VeiculoID`, `Placa`, `Data`, `KM`, `TipoManutencao`, `Subsistema`, `DescricaoServico`, `ValorTotal`, `OficinaNome`, `OficinaCNPJ`, `OficinaCidade`, `NumeroOS`, `ComprovanteUrl`).
  4. `HISTORICO_LAUDOS`: Repositório relacional de laudos e trilha de auditoria (`TIMESTAMP`, `PLACA_ATIVO`, `TIPO_DOCUMENTO`, `USUARIO_RESPONSAVEL`, `RESUMO_DIAGNOSTICO`, `LINK_DIRETO_DRIVE`).
  5. `PRESTADORES_OFICINAS`: Catálogo relacional de oficinas e fornecedores (`ID`, `NomeFantasia`, `RazaoSocial`, `CNPJ`, `TipoPrestador`, `Especialidade`, `CidadeUF`, `Telefone`, `Email`, `Observacoes`, `DataCadastro`).
* **Repositório de Arquivos & Blobs (Armazenamento Imutável):** Google Drive (Pasta raiz gerenciada automaticamente: `SIGMA_REPOSITORIO_HISTORICO_FROTAS`).
* **Frontend (Interface do Usuário):** Single Page Application (SPA) responsiva em HTML5 semântico, Tailwind CSS compilado, componentes dinâmicos Lucide Icons e JavaScript Vanilla com gerenciamento de estado reativo em memória (`window.state`).
* **Motor de Inteligência Artificial Híbrido:**
  * **IA Primária em Nuvem:** Google Gemini API (`gemini-3.5-flash` via endpoint `v1beta`), configurado com baixa temperatura (`0.1` a `0.2`) e schema JSON estrito.
  * **Motor Heurístico Local (Fallback de Segurança):** Dicionário determinístico de engenharia automotiva que garante respostas diagnósticas mesmo em contingências de conectividade.

---

## 5. Módulos Funcionais e Engenharia de Software

### 5.1. Gestão de Estado Front-End e Auditoria "Marco Zero"
O front-end gerencia a aplicação através de um objeto de estado global defensivo (`state`), contendo `vehicles`, `selectedVehicleId`, `logs`, `customPrescriptions` e `prestadores`. O algoritmo de cálculo cruza o odômetro atual com os registros de notas fiscais/OS para classificar cada diretriz prescritiva em 4 estados operacionais: `EM_DIA`, `INDETERMINADO_PRECAUCAO`, `CRITICO_SEM_HISTORICO` e `ALERTA_VENCIDO`.

### 5.2. Módulo de Prestadores de Serviço & Oficinas de Preferência
Permite o cadastro e vinculação formal da **Oficina Mecânica Base / de Confiança** a cada ativo veicular, separando claramente:
* **Fornecedores de Peças / Insumos**: Empresas emissoras de notas de compra de material (ex: distribuidores de autopeças).
* **Oficinas Mecânicas de Serviço**: Estabelecimentos responsáveis pela mão de obra de reparação e manutenção do ativo.
* **Métricas Financeiras B2B**: Cálculo dinâmico do total acumulado investido por prestador/oficina com base no histórico de ocorrências.

### 5.3. Motor de Diagnóstico Causal e Triagem Mecânica (IA + Heurística)
O usuário descreve sintomas em linguagem natural e o sistema cruza com a motorização, transmissão e histórico para gerar parecer executivo, árvore causal com probabilidades e roteiro físico de testes de bancada/elevador.

### 5.4. Ingestão Multimodal Inteligente (SEFAZ XML, OCR, URL e IA Autônoma)
Leitura automatizada de NF-e (XML modelo 55), extração OCR de comprovantes e IA Autônoma com calibração de TSBs oficiais da montadora.

### 5.5. Geração de Laudos e Ordens de Inspeção em PDF
* **Ordem de Investigação Técnica (Oficina):** Layout limpo em prancha de chão de oficina, sem emojis, com checkboxes `[   ]`, isolamento de relato literal, gatilhos de upsell preventivo nos próximos 500 km e nota de isenção pericial.
* **Dossiê Forense de Auditoria Veicular (Cliente):** Histórico consolidado de notas fiscais e conformidade do ativo.

### 5.6. Repositório Cronológico Inteligente no Google Drive
Gravação automática de todos os PDFs na pasta `SIGMA_REPOSITORIO_HISTORICO_FROTAS` e indexação perpétua na aba `HISTORICO_LAUDOS`.

---

## 6. Guia Operacional Tela a Tela (Comandos, Ações e Tooltips)

| Elemento / Botão (UI) | Localização no Sistema | Tooltip Associado (`title`) | Resultado Esperado |
| :--- | :--- | :--- | :--- |
| **Oficinas & Prestadores** | Menu Lateral & Cabeçalho Ativo | `Gerenciar oficinas de preferência, fornecedores de autopeças e métricas B2B` | Abre modal para cadastrar oficinas de confiança, vincular Oficina Base e ver gastos por prestador. |
| **Manual / Ajuda SIGMA** | Topo do Sidebar (2º Item) & Banner | `Abre o manual completo, arquitetura e guia operacional do sistema` | Abre modal com documentação técnica, guia de telas e governança. |
| **Diagnóstico Preliminar IA** | Menu Lateral & Banner | `Insira o relato do sintoma para o Gemini cruzar com o histórico e motorização` | Abre modal para relato de sintomas e processamento da árvore causal. |
| **Ordem de Inspeção (PDF)** | Rodapé do Diagnóstico IA | `Gera o laudo técnico para a oficina com isenção jurídica e oportunidades de upsell` | Gera e arquiva no Drive o laudo com checklist `[   ]` e nota jurídica. |
| **Recalcular Plano / Merge** | Painel Prescritivo Superior | `Executa reanálise inteligente preservando os registros manuais do mantenedor` | Aciona a IA Gemini para calibrar o plano prescritivo com opção Merge/Overwrite. |
| **Nova Ocorrência** | Sidebar & Topo Mobile | `Cadastrar nova ocorrência de manutenção` | Abre modal para inserção manual ou upload de XML/OCR de notas fiscais. |

---
**Ponto de Retorno Homologado:** `v89-checkpoint-modulo-prestadores-oficinas`  
**Deploy Ativo:** Google Apps Script Version `@89` (em conformidade estrita)
