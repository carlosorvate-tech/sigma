<![CDATA[<div align="center">

# σ SIGMA

### Sistema Inteligente para Gestão de Manutenções Automotivas

**Versão 1.0 — Apresentação Institucional**

---

*Infinitus Sistemas Inteligentes Ltda*
*CNPJ: 09.371.580/0001-06*

*Autoria Intelectual & Concepção: ORVATE, Carlos A.*

---

</div>

---

## 1. O Problema

### 1.1. A Realidade do Proprietário de Veículo no Brasil

O Brasil possui uma frota de mais de **115 milhões de veículos** (DENATRAN, 2025). Para a esmagadora maioria desses proprietários, a gestão de manutenção do veículo é feita de uma única maneira: **memória e sorte**.

> *"Quando foi a última troca de óleo? Qual a quilometragem? Já trocou a correia dentada? Quanto já gastei nesse carro? O que significa esse tranco no câmbio?"*

Essas perguntas revelam uma lacuna crítica: **não existe, para o motorista comum ou pequeno frotista, um sistema acessível, contínuo e inteligente que registre, analise, prescreva e diagnostique manutenções veiculares** com base em dados reais — e não em palpites.

### 1.2. As Consequências da Gestão Inexistente

A ausência de controle estruturado e diagnóstico precoce gera três categorias de dano:

| Categoria | Consequência Direta | Impacto |
|---|---|---|
| **Patrimonial** | Falhas destrutivas evitáveis (motor fundido, câmbio AL4 travado, superaquecimento) | Perda de R$ 5.000 a R$ 25.000+ por evento |
| **Segurança** | Componentes de frenagem, direção ou suspensão degradados sem aviso | Risco de acidente grave ou fatal |
| **Financeira** | Impossibilidade de comprovar histórico em revenda; troca de peças às cegas (*parts cannon*) | Desvalorização de 15-30% do ativo |

### 1.3. O Público Afetado

- **Proprietários individuais** que dependem do veículo para trabalho e mobilidade diária.
- **Pequenos frotistas** (2 a 20 veículos) sem acesso a sistemas ERP/CMMS industriais de alto custo.
- **Motoristas de aplicativo e frotas leves** que rodam altas quilometragens em regime severo contínuo.
- **Famílias** que compartilham veículos e perdem rastreabilidade de intervenções anteriores.
- **Compradores de veículos usados** que buscam auditar a integridade real do bem antes da compra.

### 1.4. O Propósito do SIGMA

O **SIGMA** foi concebido para eliminar essa lacuna com uma premissa radical:

> **Todo veículo merece um prontuário técnico — tão rigoroso e auditável quanto um prontuário médico.**

O sistema transforma dados dispersos (notas fiscais, ordens de serviço, manuais do fabricante, memória do proprietário e relatos de anomalias) em **inteligência prescritiva e diagnóstica**, entregando ao dono do veículo o controle total sobre:

1. 🛡️ **Preservação do Ativo** — saber exatamente o estado de cada subsistema.
2. ⚠️ **Prevenção de Falhas Críticas** — alertas antecipados de risco destrutivo e diagnóstico IA de sintomas.
3. 📊 **Auditoria Financeira & Causal** — quanto, quando, onde e por quê cada real foi investido.

---

## 2. Telas e Módulos do Aplicativo: Função, Detalhes e Resultados

### 2.1. Tela de Aceite de Termos de Uso (Clickwrap de Onboarding)

**Quando aparece:** Exclusivamente no primeiro acesso do usuário ao sistema.

**Função:**
Apresenta os Termos de Uso, Governança e Limites de Responsabilidade Técnica do SIGMA, estruturados em 4 blocos jurídicos: (1) Finalidade Prescritiva e CMMS, (2) Caráter Consultivo e Não Pericial, (3) Responsabilidade pela Veracidade dos Dados Declarados, (4) Propriedade Intelectual e Direitos Comerciais.

**Detalhes técnicos:**
- Verificação via `localStorage` (chave `sigma_termo_aceite_v1`).
- Após o aceite, o sistema nunca mais exibe o modal automaticamente.
- O usuário pode reler os termos a qualquer momento via link estético no rodapé institucional.

**Resultado esperado:** Conformidade legal plena (Lei 12.965/2014 — Marco Civil da Internet) e transparência total sobre a natureza consultiva do sistema.

---

### 2.2. Banner Hero & Painel de Identidade do Ativo

**Localização:** Topo da área principal, sempre visível.

**Função:**
Área de contexto permanente que identifica instantaneamente qual veículo está sendo gerenciado, seu estado operacional e seu Score de Saúde em tempo real.

**Detalhes:**
- **Título do Veículo**: Marca, Modelo, Ano (ex: *Citroën C4 Pallas 2009/2009*).
- **Badges Técnicos**: Placa oficial, tipo de combustível, tipo de câmbio, regime de uso.
- **Odômetro Editável**: Quilometragem atual com botão de atualização imediata.
- **Oficina Base**: Última oficina registrada no histórico.
- **Gauge Circular de Saúde**: Score de 0 a 100 com código de cores (verde ≥ 80, âmbar ≥ 55, vermelho < 55). Calculado algoritmicamente com base no plano prescritivo vs. histórico real.
- **Semáforo de Alertas**: Contadores numéricos para itens *Em Dia*, *Crítico* e *Atenção*.
- **Widget de Telemetria**: Indicadores `MOTOR ATIVO`, `100% AUDITABILIDADE` e `MARCO ZERO`.

**Resultado esperado:** O usuário sabe, em menos de 2 segundos, qual é a "temperatura" geral do veículo — sem precisar navegar por tabelas complexas.

---

### 2.3. Tela: Plano Mestre Prescritivo & Protocolo do Marco Zero

**Localização:** Primeira aba do sistema (aba padrão ao abrir o app).

**Função:**
É o núcleo de inteligência do SIGMA. Exibe todas as **diretrizes de manutenção** que o veículo precisa cumprir, classificadas por risco, com prazos em quilômetros e meses.

**Detalhes:**
- Cada diretriz é um card expansível contendo:
  - **Nome da intervenção** (ex: *"Troca de Fluido ATF Câmbio AL4 e Eletroválvulas"*).
  - **Subsistema** (Motor, Transmissão, Arrefecimento, Freios, Suspensão, Elétrica).
  - **Intervalo prescrito** em KM e meses.
  - **Especificação técnica** (tipo de óleo, marca, norma de homologação).
  - **Classificação de risco** (`CRÍTICO DESTRUTIVO`, `INSPECIONÁVEL`, `EM DIA`).
  - **Diretiva de precaução técnica** — texto descritivo do risco caso a manutenção seja negligenciada.
  - **Ações**: Botão para registrar Parecer Técnico de inspeção ou criar Ocorrência de Marco Zero.
- **Protocolo do Marco Zero**: Quando o veículo é cadastrado, todas as diretrizes iniciam em estado `CRÍTICO SEM HISTÓRICO`. O proprietário então "zera" cada item com evidência documental (data, KM, oficina).
- **Dois botões de ação no cabeçalho**:
  - `[ + Nova Diretriz de Manutenção ]` — cadastro manual rápido com merge por chave composta.
  - `[ Recalcular / Ingerir Fontes ]` — ingestão multimodal inteligente (IA + OCR + texto + URL).

**Resultado esperado:** O proprietário enxerga tudo o que precisa ser feito no veículo, ordenado por gravidade de risco, com ações imediatas a um clique.

---

### 2.4. Tela: Histórico de Ocorrências e Serviços

**Localização:** Segunda aba do sistema.

**Função:**
Registro cronológico completo de todos os eventos de manutenção realizados no veículo: preventivas, corretivas, emergenciais e inspeções.

**Detalhes:**
- Tabela com colunas: Data/Doc, Placa, KM, Tipo, Composição de Peças & Mão de Obra, Valor Total, Ações.
- Cada linha representa uma Ordem de Serviço (OS) consolidada.
- Composição de peças exibida item a item com categoria (Peça, Mão de Obra, Óleo/Fluido, Retífica, Insumo) e valor unitário.
- **Deduplicação Inteligente**: Algoritmo canônico que previne lançamentos duplicados por importações repetidas.
- Ações por registro: **Editar** (reabertura do formulário preenchido) e **Excluir** (com confirmação segura).

**Resultado esperado:** O veículo ganha um "extrato bancário e técnico" auditável de toda intervenção mecânica já realizada.

---

### 2.5. Tela: Dashboard Executivo & Pareto

**Localização:** Terceira aba do sistema.

**Função:**
Visão analítica e financeira consolidada sobre os investimentos realizados no ativo veicular.

**Detalhes:**
- **Gráfico de Pareto** (barras de custo + curva de percentual acumulado): identifica visualmente quais subsistemas concentram a maior parte dos gastos (princípio 80/20).
- **Lista de Custos por Categoria**: ranking de investimento por subsistema com barras de progresso proporcionais.
- **Investimento Total Acumulado**: somatório financeiro geral em destaque.

**Resultado esperado:** O proprietário identifica onde o orçamento é drenado, embasando decisões estratégicas: manter, reparar ou substituir o veículo.

---

### 2.6. Modal: Diagnóstico Preliminar de Anomalias (IA & Heurística Causal)

**Acionamento:** Botão `[ Diagnóstico Preliminar IA ]` na Sidebar Desktop ou na Gaveta Mobile.

**Função:**
Motor de inteligência artificial e heurística causal automotiva que analisa relatos de sintomas em linguagem natural, correlacionando-os com o modelo, quilometragem e histórico de manutenções do ativo.

**Detalhes:**
- **Entrada em Linguagem Natural**: Textarea onde o usuário descreve ruídos, comportamentos anormais, trancos, luzes no painel ou falhas intermitentes.
- **Processamento Causal Especializado**: O backend processa o relato contra matrizes especializadas (ex: transmissões automáticas AL4/AT8, gestão térmica EW10/TU5, suspensão e buchas, ignição secundária e injeção).
- **Saída Estruturada com 3 Níveis**:
  1. *Resumo Executivo*: Parecer contextualizado cruzando o sintoma com a KM atual do ativo.
  2. *Árvore de Causas Raiz*: Hipóteses diagnosticadas com probabilidade percentual calculada (ex: *85% de chance*).
  3. *Testes de Bancada & Scanner Sugeridos*: Procedimentos físicos precisos para orientar o mecânico na oficina.
- **Micro-Disclaimer Just-In-Time**: Nota técnica legal reforçando o caráter consultivo do parecer.

**Resultado esperado:** O proprietário não vai mais à oficina "no escuro". Ele chega munido de hipóteses fundamentadas e procedimentos de teste específicos, eliminando diagnósticos incorretos e trocas desnecessárias de peças.

---

### 2.7. Modal: Nova Ocorrência de Manutenção

**Acionamento:** Botão "Nova Ocorrência" na sidebar ou topbar móvel.

**Função:**
Formulário dinâmico para registro de intervenções mecânicas com suporte a múltiplos itens por Ordem de Serviço.

**Detalhes:**
- Campos: Data, KM, Tipo (Preventiva, Corretiva, Emergencial, Inspeção), Oficina/Mecânico, CNPJ da Oficina, Cidade, Nº da OS.
- Tabela dinâmica de itens: cada linha contém Tipo do item, Descrição, Subsistema e Valor Unitário.
- Cálculo automático do valor total em tempo real.

**Resultado esperado:** Registro completo de qualquer evento de manutenção em menos de 2 minutos.

---

### 2.8. Modal: Nova Diretriz Prescritiva (Cadastro Manual)

**Acionamento:** Botão `[ + Nova Diretriz de Manutenção ]` no Plano Prescritivo.

**Função:**
Permite ao usuário ou técnico inserir manualmente uma diretriz customizada (ex: recomendação de boletim técnico, preparação ou uso específico).

**Detalhes:**
- Campos: Nome da Intervenção, Subsistema, Tipo, Intervalo em KM, Intervalo em Meses, Especificação Técnica, Origem/Fonte e Texto de Precaução.
- Merge inteligente por chave composta (subsistema + intervenção): se já existir, atualiza sem duplicar.

**Resultado esperado:** O Plano Prescritivo se torna flexível e adaptável a qualquer necessidade específica do veículo.

---

### 2.9. Modal: Ingestão Multimodal & Recálculo (Motor de IA)

**Acionamento:** Botão `[ Recalcular / Ingerir Fontes ]` no Plano Prescritivo.

**Função:**
Motor de ingestão de dados que aceita múltiplas fontes para gerar ou complementar o Plano Prescritivo.

**Detalhes:**
- **4 modos de ingestão**: Automático (plano OEM por regime de uso), Upload de Arquivo (PDF/imagem de manual ou OS), URL (link web) e Texto Livre.
- **Seleção de Regime de Uso**: Normal, Severo Urbano, Severo Estrada, Frota, Taxi.
- **Estratégia de Merge**: Substituição total ou Merge Aditivo blindado.

**Resultado esperado:** Capacidade de absorver manuais de fábrica ou notas técnicas e convertê-los em diretrizes acionáveis.

---

### 2.10. Modal: Cadastro e Edição de Veículo

**Acionamento:** Sidebar → "Cadastrar Novo Veículo" ou "Editar Veículo Ativo".

**Função:**
CRUD completo do ativo veicular.

**Detalhes:**
- Campos: Marca, Modelo, Ano Fabricação, Ano Modelo, Placa (Chassi), Motorização, Combustível, Transmissão, Regime de Uso e KM Atual.
- Ação de exclusão com confirmação segura e limpeza em cascata.

**Resultado esperado:** Suporte multi-veículo com alternância instantânea de contexto.

---

### 2.11. Modal: Parecer Técnico de Inspeção

**Acionamento:** Botão "Registrar Parecer" em cada diretriz prescritiva.

**Função:**
Permite que um mecânico registre um laudo presencial sobre um item prescritivo — atestando conformidade física.

**Detalhes:**
- Campos: Item Prescrito (pré-preenchido), Data da Inspeção, KM, Oficina/Mecânico Responsável, Laudo Técnico.
- Micro-disclaimer legal de responsabilidade integrado.

**Resultado esperado:** Documentação formal de que o item foi inspecionado presencialmente por profissional habilitado.

---

### 2.12. Dossiê Veicular em PDF (Auditoria Forense)

**Acionamento:** Sidebar → "Emitir Dossiê PDF".

**Função:**
Geração instantânea de documento técnico consolidado em formato PDF para impressão, envio ou arquivamento.

**Detalhes:**
- **Seção 1**: Quadro de Gestão de Riscos — todas as diretrizes com status e precaução.
- **Seção 2**: Histórico de Manutenções — eventos com composição detalhada de peças e valores.
- **Box Forense Final**: Hash SHA-256 de integridade documental, data/hora de emissão e selo institucional da Infinitus (Lei 12.965/2014).

**Resultado esperado:** Prontuário com validade auditável para revenda, seguradoras, perícia ou garantia.

---

### 2.13. Sidebar & Navegação

**Função:**
Centro de comando responsivo com navegação entre módulos, ações de gestão e seletor de ativo.

**Detalhes:**
- **Desktop**: Sidebar fixa lateral com seções: Identidade nativa, Seletor de Veículo, Botão Nova Ocorrência, Navegação Operacional (3 abas), Ações de Gestão de Ativos (Cadastrar, Editar, Dossiê PDF, Diagnóstico IA) e Rodapé com status do sistema.
- **Mobile**: Topbar compacta + Drawer lateral deslizante + Bottom Navigation Bar fixa.

**Resultado esperado:** Experiência de uso fluida em smartphones, tablets e computadores de mesa.

---

## 3. Atores do Sistema, Relações e Problemas Resolvidos

### 3.1. Mapa de Atores

```mermaid
graph TD
    P["Proprietario do Veiculo<br/>(Ator Principal)"]
    M["Mecanico / Oficina<br/>(Ator Tecnico)"]
    C["Comprador de Usado<br/>(Ator Eventual)"]
    S["Seguradora / Perito<br/>(Ator Institucional)"]
    F["Frotista / Gestor<br/>(Ator Operacional)"]
    
    SIGMA["SIGMA<br/>CMMS Automotivo"]

    P -->|"Cadastra veiculo,<br/>lanca ocorrencias,<br/>relata sintomas IA"| SIGMA
    M -->|"Registra parecer tecnico,<br/>executa testes sugeridos"| SIGMA
    SIGMA -->|"Emite Dossie PDF<br/>com hash forense"| C
    SIGMA -->|"Fornece prontuario<br/>auditavel"| S
    F -->|"Gerencia multiplos<br/>ativos e custos"| SIGMA
    SIGMA -->|"Prescreve manutencoes,<br/>diagnostica anomalias,<br/>calcula risco"| P
    SIGMA -->|"Informa historico<br/>e hipoteses de bancada"| M
```

### 3.2. Detalhamento por Ator

#### Proprietário do Veículo (Ator Principal)

**Problema:** Não sabe o histórico exato do carro, não sabe quando fazer manutenções, não entende os sintomas de falhas e gasta excessivamente por falta de diagnóstico prévio.

**Como o SIGMA resolve:**
- Centraliza todo o histórico em um prontuário digital único.
- Prescreve automaticamente manutenções por KM e tempo.
- **Diagnóstico IA de Sintomas**: Transforma barulhos e trancos relatados em hipóteses técnicas com testes práticos antes de ir à oficina.
- Emite Dossiê PDF auditável com hash SHA-256.

---

#### Mecânico / Oficina (Ator Técnico)

**Problema:** Recebe veículos sem histórico, perde horas em diagnósticos às cegas e tem dificuldade de justificar preventivas para clientes céticos.

**Como o SIGMA resolve:**
- Acessa o prontuário completo antes de desmontar qualquer componente.
- Utiliza a árvore de hipóteses e os testes de bancada sugeridos pela IA para validar falhas com rapidez.
- Registra Pareceres Técnicos de inspeção, criando respaldo documental do serviço realizado.

---

#### Comprador de Veículo Usado (Ator Eventual)

**Problema:** Insegurança total sobre o estado mecânico real do veículo anunciado.

**Como o SIGMA resolve:**
- O Dossiê PDF funciona como um relatório auditável de saúde mecânica com hash de autenticidade documental.
- O Score de Saúde fornece um indicador objetivo e algorítmico do histórico do ativo.

---

#### Seguradora / Perito (Ator Institucional)

**Problema:** Necessidade de comprovação documental de manutenções preventivas em litígios ou perícias de sinistro.

**Como o SIGMA resolve:**
- Dossiê com rastreabilidade forense, hash SHA-256 e conformidade com o Marco Civil da Internet (Lei 12.965/2014).
- Demonstração inequívoca de cumprimento ou omissão de planos de manutenção.

---

#### Frotista / Gestor de Frota (Ator Operacional)

**Problema:** Gestão descentralizada de múltiplos veículos em planilhas frágeis, com custos invisíveis de manutenção corretiva.

**Como o SIGMA resolve:**
- Multi-veículos nativo com alternância instantânea.
- Dashboard de Pareto identifica gargalos de custo por subsistema.
- Protocolo do Marco Zero padroniza a entrada de qualquer novo veículo na frota.

---

## 4. Benefícios Além do Problema Principal

O SIGMA produz vantagens estratégicas em múltiplas frentes:

### 4.1. Eliminação do "Parts Cannon" & Diagnóstico Preciso

A prática de trocar peças por tentativa e erro custa caro. O módulo de **Diagnóstico IA** orienta a investigação diretamente para as causas mais prováveis e prescreve testes de bancada objetivos (ex: medição de pressão de linha com scanner, teste de continuidade de resistências).

### 4.2. Valorização do Ativo na Revenda

Um veículo com histórico comprovado pelo Dossiê SIGMA destaca-se no mercado de usados, aumentando a liquidez e permitindo negociação pelo valor real do bem conservado.

### 4.3. Economia por Antecipação (4x a 8x)

Manutenções preventivas custam de **4 a 8 vezes menos** do que reparos emergenciais pós-falha. O SIGMA antecipa intervenções antes do dano destrutivo.

### 4.4. Segurança Viária Aumentada

Garante que subsistemas críticos (freios, arrefecimento, direção e suspensão) não ultrapassem seus limites de fadiga mecânica.

### 4.5. Unificação da Memória Mecânica

Mesmo que o proprietário troque de oficina ao longo dos anos, todo o histórico permanece unificado no prontuário do ativo.

### 4.6. Tomada de Decisão Financeira Baseada em Dados

O Gráfico de Pareto substitui o achismo por métricas claras sobre a viabilidade econômica de manter ou renovar o veículo.

### 4.7. Conformidade Jurídica & Rastreabilidade Forense

Clickwrap de onboarding, micro-disclaimers just-in-time e hashes SHA-256 asseguram transparência legal sob a legislação brasileira.

### 4.8. Custo Zero de Infraestrutura (Serverless)

Construído sobre Google Apps Script e Google Sheets, o SIGMA entrega performance corporativa sem mensalidades de servidores ou custos ocultos de banco de dados.

---

## 5. Ficha Técnica

| Atributo | Valor |
|---|---|
| **Produto** | σ SIGMA — Sistema Inteligente para Gestão de Manutenções Automotivas |
| **Versão** | 1.0 (Agosto 2026) |
| **Arquitetura** | Google Apps Script (Backend) + HTML5/Tailwind CSS/JS (Frontend) |
| **Módulos Core** | Plano Prescritivo • Histórico de OS • Dashboard Pareto • Diagnóstico IA • Dossiê PDF |
| **Banco de Dados** | Google Sheets (Serverless, Zero-Cost) |
| **Hospedagem** | Google Cloud (via Apps Script Web App) |
| **Licença de Uso** | Proprietária — Infinitus Sistemas Inteligentes Ltda |
| **URL de Produção** | https://sigma.infinitussistemas.com.br |
| **Conformidade Legal** | Lei 12.965/2014 (Marco Civil da Internet) |
| **Autoria Intelectual** | ORVATE, Carlos A. |
| **Propriedade Comercial** | Infinitus Sistemas Inteligentes Ltda - CNPJ: 09.371.580/0001-06 |
| **Suporte** | infinitus.sistemas@gmail.com - WhatsApp: (14) 99705-7170 |

---

<div align="center">

*Este documento é propriedade intelectual da Infinitus Sistemas Inteligentes Ltda.*
*Reprodução, distribuição ou uso comercial sem autorização prévia é vedado.*

**σ SIGMA — Porque todo veículo merece um prontuário.**

</div>
]]>
