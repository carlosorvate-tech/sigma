# DOCUMENTO DE ARQUITETURA, PROCESSOS, ENGENHARIA E CODIFICAÇÃO — SIGMA v1.0
**Revisão Oficial:** 17 de Agosto de 2026 (`rev 17Ago26`)  
**Autoria Intelectual & Concepção:** ORVATE, Carlos A.  
**Propriedade Comercial & Industrial:** Infinitus Sistemas Inteligentes Ltda (CNPJ: 09.371.580/0001-06)  
**URL Oficial de Produção:** [https://sigma.infinitussistemas.com.br](https://sigma.infinitussistemas.com.br)

---

## 1. Visão Geral, Problema e Proposta de Valor

O **SIGMA (Sistema Inteligente de Gestão de Manutenções Automotivas)** é uma plataforma avançada de CMMS (*Computerized Maintenance Management System*) e triagem B2B de alta precisão desenvolvida para transformar a relação operacional entre condutores, frotistas e oficinas mecânicas.

* **O Problema Resolvido:** O setor automotivo sofre historicamente com a assimetria de informações entre o proprietário do veículo e o reparador, a ausência de rastreabilidade do histórico de manutenções, a perda de oportunidades comerciais preventivas (*upsell*) por falta de diagnósticos estruturados, o risco de falhas mecânicas catastróficas por negligência e a desconfiança técnica mútua.
* **Proposta de Valor:** Conectar o relato em linguagem natural do condutor ao diagnóstico causal profundo por Inteligência Artificial (Google Gemini 3.5 Flash), gerando ordens de inspeção técnica blindadas juridicamente para o chão de oficina, estimulando receitas preventivas baseadas em quilometragem e garantindo a preservação integral do ativo veicular sob a Lei 12.965/2014 (Marco Civil da Internet).

---

## 2. Atores do Ecossistema

1. **Condutores / Proprietários:** Buscam transparência técnica, segurança, previsibilidade orçamentária, alertas preditivos em tempo real e preservação do valor de revenda do patrimônio veicular com comprovação pericial.
2. **Chefes de Oficina / Reparadores Mecânicos:** Usuários B2B que necessitam de triagens diagnósticas rápidas, hipóteses direcionadas para testes de bancada/elevador, isenção de responsabilidade por queixas subjetivas e identificação imediata de oportunidades de faturamento preventivo (*upsell*).
3. **Gestores de Frota (Módulo v2.0 Ready):** Necessitam de gestão multi-veículo, isolamento multi-tenant por frota, trilhas de auditoria centralizadas, controle de custos por subsistema (Pareto) e conformidade operacional.

---

## 3. Os 3 Pilares Fundamentais do SIGMA

* **Pilar 1 — Preservação do Ativo Veicular:** Monitoramento rigoroso de fluidos, tolerâncias, intervalos estritos de quilometragem/tempo e ciclos térmicos para maximizar a vida útil do motor e subsistemas críticos.
* **Pilar 2 — Prevenção Contra Falhas Graves e Destrutivas:** Antecipação a colapsos catastróficos (rompimento de correia dentada, degradação térmica do fluido de transmissão automática, colapso de juntas por superaquecimento no arrefecimento) por meio de diretrizes prescritivas calibradas pelo regime de severidade de uso.
* **Pilar 3 — Auditoria Financeira e Histórico Causal:** Registro imutável de todas as peças, insumos, serviços, notas fiscais (XML/PDF) e oficinas executoras aplicados ao longo da vida útil do ativo.

---

## 4. Arquitetura Tecnológica e Stack

O SIGMA adota uma arquitetura híbrida de alta performance e disponibilidade, otimizada para o ecossistema Google Cloud e Google Workspace:

* **Backend (Servidor & Microsserviços):** Google Apps Script (Motor V8), executando endpoints REST/RPC assíncronos (`google.script.run`), manipulação de dados, ingestão OCR/XML e automação documental.
* **Banco de Dados Relacional Estruturado:** Google Sheets atuando como banco relacional de alta fidelidade, composto por 4 tabelas canônicas:
  1. `ATIVOS`: Cadastro completo de veículos (Marca, Modelo, Ano Fabricação/Modelo, Motorização, Combustível, Placa/Chassi, KM Inicial, KM Atual, Regime de Uso, Tipo de Transmissão, Tipo de Distribuição).
  2. `PLANO_PRESCRITIVO`: Matriz prescritiva calibrada por ativo (`ID`, `VeiculoID`, `Intervencao`, `Subsistema`, `Tipo`, `IntervaloKM`, `IntervaloMeses`, `EspecificacaoTecnica`, `OrigemFonte`, `TextoPrecaucao`, `DataAtualizacao`).
  3. `REGISTRO_OCORRENCIAS`: Histórico de manutenções e auditoria financeira (`ID`, `VeiculoID`, `Placa`, `Data`, `KM`, `TipoManutencao`, `Subsistema`, `DescricaoServico`, `ValorTotal`, `OficinaNome`, `OficinaCNPJ`, `OficinaCidade`, `NumeroOS`, `ComprovanteUrl`).
  4. `HISTORICO_LAUDOS`: Repositório relacional de laudos e trilha de auditoria (`TIMESTAMP`, `PLACA_ATIVO`, `TIPO_DOCUMENTO`, `USUARIO_RESPONSAVEL`, `RESUMO_DIAGNOSTICO`, `LINK_DIRETO_DRIVE`).
* **Repositório de Arquivos & Blobs (Armazenamento Imutável):** Google Drive (Pasta raiz gerenciada automaticamente: `SIGMA_REPOSITORIO_HISTORICO_FROTAS`).
* **Frontend (Interface do Usuário):** Single Page Application (SPA) responsiva em HTML5 semântico, Tailwind CSS compilado, componentes dinâmicos Lucide Icons e JavaScript Vanilla com gerenciamento de estado reativo em memória (`window.state`).
* **Motor de Inteligência Artificial Híbrido:**
  * **IA Primária em Nuvem:** Google Gemini API (`gemini-3.5-flash` via endpoint `v1beta`), configurado com baixa temperatura (`0.1` a `0.2`) e schema JSON estrito.
  * **Motor Heurístico Local (Fallback de Segurança):** Dicionário determinístico de engenharia automotiva que garante respostas diagnósticas mesmo em contingências de conectividade.

---

## 5. Módulos Funcionais e Engenharia de Software

### 5.1. Gestão de Estado Front-End e Auditoria "Marco Zero"
O front-end gerencia a aplicação através de um objeto de estado global defensivo (`state`), contendo `vehicles`, `selectedVehicleId`, `logs` e `customPrescriptions`. O algoritmo de cálculo cruza o odômetro atual com os registros de notas fiscais/OS para classificar cada diretriz prescritiva em 4 estados operacionais:
* `EM_DIA`: Manutenção realizada dentro da janela de quilometragem e tempo prescritos.
* `INDETERMINADO_PRECAUCAO`: Manutenção em período de observação sem evidência de falha iminente.
* `CRITICO_SEM_HISTORICO`: Diretriz mandatória sem nenhuma comprovação documental no histórico do veículo (Marco Zero).
* `ALERTA_VENCIDO`: Quilometragem atual ultrapassou o limite máximo estrito sem intervenção registrada.

O **Health Score Dinâmico (0 a 100)** e o indicador visual Gauge em SVG refletem a média ponderada de conformidade do ativo em tempo real.

### 5.2. Motor de Diagnóstico Causal e Triagem Mecânica (IA + Heurística)
O usuário descreve sintomas ou anomalias em linguagem natural. O sistema combina os atributos mecânicos do veículo (ex: *Motor 2.0 16V EW10A, Transmissão Automática AL4, Quilometragem Atual, Regime Severo*) e o histórico de intervenções para gerar:
1. Parecer Executivo de Engenharia.
2. Árvore Causal com Probabilidades Percentuais.
3. Causa Raiz Estrutural Provável.
4. Roteiro Físico de Testes no Elevador / Bancada para o Mecânico.

### 5.3. Ingestão Multimodal Inteligente (SEFAZ XML, OCR, URL e IA Autônoma)
O SIGMA dispõe de múltiplos canais de alimentação cadastral:
* **Ingestão Automática SEFAZ XML (NF-e):** Parser nativo via `DOMParser` que lê notas fiscais eletrônicas brasileiras de peças e serviços (modelo 55), desmembrando itens, valores, CNPJ emitente e atribuindo subsistemas automaticamente.
* **OCR de Comprovantes e Faturas:** Leitura de imagens e PDFs via Gemini Multimodal.
* **IA Autônoma (OEM & TSBs):** Consulta a inteligência do Gemini 3.5 Flash para gerar planos prescritivos universais calibrados para qualquer montadora, modelo e regime de uso.

### 5.4. Geração de Laudos e Ordens de Inspeção em PDF

* **Ordem de Investigação Técnica (Oficina):**
  * Layout limpo em prancha de oficina, isento de emojis para evitar corrupção de caracteres em renderizadores nativos.
  * Checkboxes de validação física no box: `[     ] Hipótese X: Componente`.
  * Rótulo conciliador: `[ RELATO LITERAL DO CONDUTOR QUANDO NOTOU O PROBLEMA ]`.
  * **Gatilhos Comerciais de Upsell (B2B)**: Lista de itens críticos e manutenções preventivas com vencimento nos **próximos 500 km**.
  * **Nota Jurídica de Isenção ao Reparador**: Isenção de responsabilidade pericial, posicionando o SIGMA como ferramenta consultiva de apoio técnico.
* **Dossiê Forense de Auditoria Veicular (Cliente / Venda do Ativo):**
  * Relatório gerencial com linha do tempo de intervenções, agregação de custos por subsistema (Pareto), atestado de autenticidade forense e comprovação de Marco Zero.

### 5.5. Repositório Cronológico Inteligente no Google Drive
Toda emissão de laudo é convertida em PDF binário, gravada na pasta `SIGMA_REPOSITORIO_HISTORICO_FROTAS` no Google Drive sob o padrão biblioteconômico de recuperação rápida:
`[PLACA]_[YYYY-MM-DD_HH-mm-ss]_[TIPO_DOCUMENTO].pdf`
e indexada imediatamente com link direto permanente na aba `HISTORICO_LAUDOS`.

### 5.6. Persistência Blindada e Modo Merge vs. Overwrite
* **Modo Mesclar (Merge):** Mapeia o banco por chave composta única (`Subsistema + Intervenção`). Atualiza especificações e prazos dos itens equivalentes e insere novos itens descobertos pela IA. **Preserva 100% dos itens cadastrados manualmente por especialistas (`MANTENEDOR_ESPECIALISTA` e `BOLETIM_TECNICO`)**, impedindo sobrescritas acidentais.
* **Modo Substituição (Overwrite):** Remove as linhas antigas daquele veículo específico de trás para frente e regrava o plano limpo gerado pela IA.
* **Renderização Zero-Duplicates:** O front-end prioriza com exclusividade as diretrizes gravadas na planilha, eliminando qualquer empilhamento de listas fixas na interface.

---

## 6. Governança de Código e Regras Pétreas (`sigma-code-governance`)

1. **Atualizações Não-Destrutivas (Cirúrgicas):** Proibição de reescrita cega de arquivos inteiros. As modificações devem ser aplicadas em blocos funcionais isolados com testes de ciclo de vida prévios.
2. **Consistência Tipográfica em PDFs:** Proibição de caracteres especiais ou emojis em templates PDF que possam causar falhas de codificação (`Ø=Þàþ`).
3. **Escopo Defensivo JavaScript:** Garantia de encapsulamento seguro de variáveis de estado no front-end (`state` / `window.state`) para evitar exceções de `TypeError`.
4. **Resiliência Multi-Veículo:** O código do backend e os prompts da IA devem permanecer 100% dinâmicos e universais, recebendo os parâmetros cadastrais reais de qualquer veículo ativo.

---

## 7. Guia Operacional Tela a Tela (Comandos, Ações e Tooltips)

| Elemento / Botão (UI) | Localização no Sistema | Tooltip Associado (`title`) | Resultado Esperado |
| :--- | :--- | :--- | :--- |
| **Manual / Ajuda SIGMA** | Topo do Sidebar (2º Item) & Banner | `Abre o manual completo, arquitetura e guia operacional do sistema` | Abre o modal com a documentação embutida, guia de telas e governança. |
| **Diagnóstico Preliminar IA** | Menu Lateral & Banner | `Insira o relato do sintoma para o Gemini cruzar com o histórico e motorização` | Abre modal para relato de sintomas e processamento da árvore causal. |
| **Ordem de Inspeção (PDF)** | Rodapé do Diagnóstico IA | `Gera o laudo técnico para a oficina com isenção jurídica e oportunidades de upsell` | Gera e arquiva no Drive o laudo com checklist `[   ]` e nota jurídica. |
| **Recalcular Plano / Merge** | Painel Prescritivo Superior | `Executa reanálise inteligente preservando os registros manuais do mantenedor` | Aciona a IA Gemini para calibrar o plano prescritivo com opção Merge/Overwrite. |
| **Nova Ocorrência** | Sidebar & Topo Mobile | `Cadastrar nova ocorrência de manutenção` | Abre modal para inserção manual ou upload de XML/OCR de notas fiscais. |
| **Emitir Dossiê PDF** | Menu de Gestão de Ativos | `Emitir Dossiê completo de auditoria do ativo` | Gera o dossiê pericial de histórico financeiro e conformidade do veículo. |
| **Termos & Governança** | Rodapé Institucional | `Termos de Uso e Governança Jurídica` | Exibe os limites de responsabilidade técnica sob a Lei 12.965/2014. |

---
**Ponto de Retorno Homologado:** `v84-checkpoint-doc-arquitetura-rev17ago26`  
**Deploy Ativo:** Google Apps Script Version `@83` (em conformidade estrita)
