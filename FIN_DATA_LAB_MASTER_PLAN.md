# FIN-DATA-LAB — MASTER IMPLEMENTATION PLAN
### Plano de 2 dias para o code agent · Versão 1.0

---

## ÍNDICE

1. [Visão e Identidade](#1-visão-e-identidade)
2. [Análise das Inspirações](#2-análise-das-inspirações)
3. [Arquitetura de Informação](#3-arquitetura-de-informação)
4. [Design System](#4-design-system)
5. [Os Três Pilares de Dados](#5-os-três-pilares-de-dados)
6. [Pilar CVM — Fundos de Investimento](#6-pilar-cvm--fundos-de-investimento)
7. [Pilar Ações — Mercado B3](#7-pilar-ações--mercado-b3)
8. [Pilar Crypto](#8-pilar-crypto)
9. [Núcleo AI-Native](#9-núcleo-ai-native)
10. [Console SQL & Notebooks](#10-console-sql--notebooks)
11. [Performance — Fim dos 3 Minutos](#11-performance--fim-dos-3-minutos)
12. [CRUD Simultâneo e Painéis de Controle](#12-crud-simultâneo-e-painéis-de-controle)
13. [Grafo de Fundos](#13-grafo-de-fundos)
14. [Cronograma de 2 Dias](#14-cronograma-de-2-dias)
15. [Prompts de Execução por Fase](#15-prompts-de-execução-por-fase)

---

## 1. VISÃO E IDENTIDADE

### O que é o Fin-Data-Lab

Fin-Data-Lab é uma **plataforma de pesquisa financeira pessoal**, construída localmente, que serve como:

- Terminal Bloomberg pessoal, mas open-source e focado no mercado brasileiro
- Interface de análise AI-native sobre dados da CVM, B3 e Crypto
- Ambiente de trabalho analítico com SQL console, notebooks e visualizações
- Sistema de descoberta de padrões, anomalias e possíveis fraudes no SFN

**Missão em uma frase:** *"Ser o melhor analista de CVM do Brasil usando dados públicos."*

### Logo e Nome

**Nome visual:** `FDL` como monograma. `Fin·Data·Lab` com separadores tipográficos.

**Conceito da logo:**
- Letra F estilizada que se lê também como um gráfico de barras (remetendo à análise)
- Ou: três barras verticais de altura diferente formando "FDL" — referência direta a três pilares (CVM, Ações, Crypto)
- Paleta: não usar azul corporativo genérico. Usar **âmbar/ouro** como cor primária de acento sobre fundo claro — referência a terminais financeiros clássicos, Bloomberg original, Reuters dos anos 90
- Tipografia da logo: **Instrument Serif** ou **Playfair Display** para o nome — peso editorial, não tech genérico

**Tagline:** `Pesquisa Financeira. Dados Abertos. Sem Filtro.`

---

## 2. ANÁLISE DAS INSPIRAÇÕES

### 2.1 awesome-design-skills (bergside)
**O que é:** 67 arquivos DESIGN.md + SKILL.md prontos, cada um definindo um sistema de design completo com tokens de cor, tipografia, espaçamento, componentes.

**O que tirar para o FDL:**
- Criar um `DESIGN.md` próprio na raiz do projeto que o code agent leia ANTES de escrever qualquer componente React
- Estrutura do arquivo: tokens de cor em CSS variables, escala tipográfica, grid system, estado de hover/focus, animações permitidas
- Isso garante que todo componente gerado seja coerente, sem o code agent "inventar" cores novas a cada arquivo
- **Ação concreta:** baixar o repo, escolher o design system mais próximo do estilo editorial/financeiro (provavelmente o "editorial" ou "brutalist-refined"), adaptar para o FDL

**Workaround para o code agent:**
```
git clone https://github.com/bergside/awesome-design-skills /tmp/design-skills
ls /tmp/design-skills/skills/
cat /tmp/design-skills/skills/editorial/DESIGN.md
# escolher o mais adequado e copiar para site/DESIGN.md
# instruir o agent a ler site/DESIGN.md antes de criar qualquer componente
```

### 2.2 frontend-guidelines (bendc)
**O que é:** O documento original de boas práticas de frontend — HTML semântico, CSS de qualidade, JavaScript idiomático.

**O que tirar para o FDL:**
- Checklist de qualidade para cada componente criado
- Regras de acessibilidade (ARIA labels para gráficos financeiros — cegos também investem)
- Convenções de naming para classes CSS e variáveis
- Guideline de performance: não usar `!important`, não usar inline styles, preferir CSS custom properties
- **Ação concreta:** baixar e extrair as regras mais relevantes para um `site/FRONTEND_RULES.md` que o agent consulta

**Workaround:**
```
curl -o /tmp/frontend-guidelines.md https://raw.githubusercontent.com/bendc/frontend-guidelines/master/README.md
# extrair seções relevantes para site/FRONTEND_RULES.md
```

### 2.3 ValueCell AI (automates stock selection with agents)
**O que é:** Agentes que fazem análise e seleção de ações automaticamente.

**O que tirar para o FDL:**
- Arquitetura de agentes especializados: um agente por domínio (CVM agent, B3 agent, Crypto agent)
- Como estruturar tool-calling para que a IA possa consultar o banco de dados local
- Padrão de "research loop": AI faz hipótese → consulta dados → refina → apresenta
- Inspiração para o módulo AI Analyst dentro do Fund Lab
- **Ação concreta:** estudar como eles estruturam os prompts de system para cada agente especializado e replicar para o contexto CVM

### 2.4 CLI-Anything (HKUDS — 33K stars)
**O que é:** Ferramenta que permite operar qualquer software GUI via CLI, tornando todo software "operável por AI agents".

**O que tirar para o FDL:**
- O console do FDL deveria ser operável via CLI/API — não apenas via interface gráfica
- Criar endpoints que exponham todas as operações do dashboard como comandos
- Isso permite que o próprio code agent interaja com o FDL programaticamente durante o desenvolvimento
- Inspiração para o **terminal embutido** na plataforma: um shell que conversa com o backend
- **Ação concreta:** criar `api/routers/shell.py` com endpoints que executam operações do sistema (refresh de view, trigger de ingestão, query SQL) — base para o console interno

### 2.5 visual-explainer (nicobailon)
**O que é:** Transforma output complexo de terminal em páginas HTML estilizadas.

**O que tirar para o FDL:**
- O log de ingestão (que já temos via SSE) deveria ser renderizado como HTML rico, não texto puro
- Cada etapa do pipeline deveria ter um card visual com status, tempo, linhas processadas — não apenas texto monospace
- Inspiração para a página de Ingestão que já criamos: transformar o terminal em um dashboard de progresso
- **Ação concreta:** instalar e usar como helper para renderizar outputs do pipeline de ingestão na UI

### 2.6 Algebrica.org (visual/math graphics)
**O que é:** Biblioteca de imagens e SVGs matemáticos/gráficos editáveis, progressivamente open-source.

**O que tirar para o FDL:**
- SVGs como elementos decorativos nas páginas de análise — não usar imagens genéricas de stock
- Gráficos matemáticos como fundos ou elementos de seção (ondas, grids, redes de nós)
- Para o grafo de fundos: inspiração visual em redes neurais/moleculares para visualizar relacionamentos entre fundos
- **Ação concreta:** baixar SVGs relevantes do repo, usar como backgrounds e elementos decorativos no design system

### 2.7 HyperspaceAI (P2P agent training network)
**O que é:** Distribui treinamento de AI em rede P2P de agentes.

**O que tirar para o FDL:**
- Arquitetura de múltiplos agentes especializados trabalhando em paralelo
- Inspiração para o futuro: múltiplos agentes analisando fundos simultaneamente
- Para agora: separar o AI Analyst em agentes especializados (Agente CVM, Agente Estrutura, Agente Risco)
- **Ação concreta:** estruturar o `api/routers/ai.py` com endpoints separados por especialidade, cada um com system prompt próprio

### 2.8 Website-downloader (AhmadIbrahiim)
**O que é:** Baixa websites completos com todos os assets.

**O que tirar para o FDL:**
- Ferramenta de ingestão de dados web: capturar páginas de gestoras, regulamentos de fundos, cartas de gestores
- Integrar como fonte de dados não-estruturados para o AI Analyst processar
- Base para o módulo de "News & Research" — baixar e indexar documentos públicos de gestoras
- **Ação concreta:** criar `ingestion/web/fund_docs_crawler.py` que baixa regulamentos e cartas de gestores do site da CVM

### 2.9 LEANN (201GB → 6GB, 97% menor que vector DBs)
**O que é:** Comprime texto massivo sem perder acurácia, roda localmente, drop-in MCP para Claude.

**O que tirar para o FDL:**
- RAG sobre os dados da CVM sem precisar de vector database pesado
- Indexar regulamentos, cadastros, históricos de fundos e buscar semanticamente
- "O que os fundos multimercado macro com mais de R$1bi têm em comum na carteira?"
- Resposta: LEANN indexa tudo localmente, AI faz query semântica
- **Ação concreta:** instalar LEANN, indexar `cvm.cadastro` + regulamentos baixados, conectar via MCP ao AI Analyst

---

## 3. ARQUITETURA DE INFORMAÇÃO

### Estrutura de Navegação

```
FIN-DATA-LAB
│
├── HOME (/)
│   ├── Status dos três pilares (última ingestão, freshness)
│   ├── Alertas e anomalias recentes
│   ├── Métricas globais (30k fundos, R$8T PL, etc.)
│   └── Quick search global
│
├── CVM (/cvm)
│   ├── Explorer (/cvm/explorer) — busca e filtro de fundos
│   ├── Fund Lab (/cvm/lab/:cnpj) — análise profunda individual
│   │   ├── Visão Geral
│   │   ├── Carteira (o que o fundo compra)
│   │   ├── Grafo de Estrutura (quem compra quem)
│   │   ├── Rentabilidade
│   │   ├── Estrutura Legal
│   │   └── AI Analyst
│   ├── Peer Groups (/cvm/peers) — grupos comparativos
│   ├── Alocadores (/cvm/allocators) — distribuição/fluxo
│   ├── Gestoras (/cvm/gestoras) — books por gestora
│   └── Radar (/cvm/radar) — anomalias e alertas
│
├── AÇÕES (/acoes)
│   ├── Screener (/acoes/screener)
│   ├── Ticker Lab (/acoes/lab/:ticker)
│   ├── Setores (/acoes/setores)
│   └── Eventos (/acoes/eventos)
│
├── CRYPTO (/crypto)
│   ├── Markets (/crypto/markets)
│   ├── Asset Lab (/crypto/lab/:symbol)
│   └── On-chain (/crypto/onchain)
│
├── WORKSPACE (/workspace)
│   ├── Notebooks (/workspace/notebooks) — Jupyter-like
│   ├── SQL Console (/workspace/sql) — query editor
│   ├── Modelos (/workspace/models) — regressões salvas
│   └── Exports (/workspace/exports)
│
├── AI (/ai)
│   ├── Research Chat (/ai/chat) — conversa com os dados
│   ├── Agentes (/ai/agents) — agentes especializados ativos
│   └── Histórico (/ai/history)
│
└── SISTEMA (/sistema)
    ├── Ingestão (/sistema/ingestao)
    ├── Banco de Dados (/sistema/banco)
    ├── Cache (/sistema/cache)
    └── Configurações (/sistema/config)
```

### URLs Canônicas (deep linking)

Cada entidade tem URL própria e shareable:
- `/cvm/lab/29762315000158` — Kinea Atlas II
- `/cvm/peers/flagship-mm-guga` — peer group específico
- `/cvm/gestoras/kinea-investimentos` — página da gestora
- `/acoes/lab/PETR4` — Petrobras
- `/crypto/lab/BTC` — Bitcoin
- `/workspace/sql/query-123` — query salva

---

## 4. DESIGN SYSTEM

### Filosofia: Editorial Financeiro

**Referências visuais:** Financial Times, Bloomberg Terminal (não a interface moderna, o terminal original âmbar), The Economist, Reuters Eikon, Morningstar Direct.

**Não é:** dark mode neon, glassmorphism genérico, purple gradient SaaS.

**É:** clareza de dados, hierarquia tipográfica forte, uso inteligente de cor como sinal (não decoração), densidade de informação com conforto visual.

### Tokens de Cor

```css
:root {
  /* === MODO LIGHT (padrão) === */
  
  /* Backgrounds */
  --bg-primary: #FAFAF8;        /* Off-white quente, não branco frio */
  --bg-secondary: #F4F3EF;      /* Papel envelhecido */
  --bg-elevated: #FFFFFF;       /* Cards e modais */
  --bg-sunken: #EEECEA;         /* Inputs, áreas recuadas */
  
  /* Texto */
  --text-primary: #1A1814;      /* Quase preto, não preto puro */
  --text-secondary: #5C5750;    /* Secundário quente */
  --text-muted: #9C9489;        /* Labels, metadados */
  --text-disabled: #C4BFB8;
  
  /* Acento principal — Âmbar/Ouro (referência Bloomberg) */
  --accent-primary: #C8860A;    /* Âmbar escuro */
  --accent-hover: #A36D08;
  --accent-light: #FDF3DC;      /* Background de destaque âmbar */
  --accent-border: #E8B85A;
  
  /* Dados financeiros */
  --positive: #1A7A4A;          /* Verde escuro, não neon */
  --positive-bg: #EBF7F1;
  --negative: #B83232;          /* Vermelho escuro */
  --negative-bg: #FAECEC;
  --neutral: #5C5750;
  
  /* Pilares (identidade por seção) */
  --cvm-color: #1E4A8C;         /* Azul CVM institucional */
  --cvm-light: #EBF0F9;
  --acoes-color: #1A7A4A;       /* Verde B3 */
  --acoes-light: #EBF7F1;
  --crypto-color: #7B3FA0;      /* Roxo Crypto */
  --crypto-light: #F3EBF9;
  
  /* Bordas */
  --border-subtle: #E8E5DF;
  --border-default: #D4CFC8;
  --border-strong: #A8A39C;
  
  /* === MODO DARK (toggle) === */
  --bg-primary-dark: #13120F;
  --bg-secondary-dark: #1C1B17;
  --bg-elevated-dark: #242320;
  --text-primary-dark: #F0EDE6;
  --accent-primary-dark: #E8A020;  /* Âmbar mais brilhante no dark */
}
```

### Tipografia

```css
/* Importar via Google Fonts ou self-hosted */

/* Display / Headers principais */
--font-display: 'Instrument Serif', 'Playfair Display', Georgia, serif;

/* Interface / UI (não usar Inter ou Roboto) */
--font-ui: 'DM Sans', 'Geist', system-ui, sans-serif;

/* Dados / Monospace (tabelas, números, código) */
--font-mono: 'JetBrains Mono', 'Geist Mono', 'Fira Code', monospace;

/* Escala tipográfica */
--text-xs: 0.75rem;    /* 12px — metadados, labels */
--text-sm: 0.875rem;   /* 14px — corpo secundário */
--text-base: 1rem;     /* 16px — corpo principal */
--text-lg: 1.125rem;   /* 18px — destaque */
--text-xl: 1.25rem;    /* 20px — subtítulos */
--text-2xl: 1.5rem;    /* 24px — títulos de seção */
--text-3xl: 1.875rem;  /* 30px — títulos de página */
--text-4xl: 2.25rem;   /* 36px — display grande */
--text-5xl: 3rem;      /* 48px — hero numbers */
```

### Grid e Espaçamento

```css
/* Sistema de 4px */
--space-1: 4px;
--space-2: 8px;
--space-3: 12px;
--space-4: 16px;
--space-5: 20px;
--space-6: 24px;
--space-8: 32px;
--space-10: 40px;
--space-12: 48px;
--space-16: 64px;
--space-20: 80px;

/* Layout */
--sidebar-width: 240px;
--sidebar-collapsed: 60px;
--header-height: 56px;
--panel-max-width: 1400px;
```

### Componentes Base (criar em site/src/components/ui/)

Cada componente deve ter variante `light` e `dark`, e respeitar os tokens acima.

**Componentes prioritários:**
1. `DataCard` — card com valor numérico, label, delta colorido
2. `MetricBadge` — badge inline (positivo/negativo/neutro)
3. `PillarTag` — tag colorida por pilar (CVM azul / Ações verde / Crypto roxo)
4. `DataTable` — tabela densa com sort, filter, column toggle
5. `TimeseriesChart` — recharts wrapper com tema próprio
6. `SearchCombobox` — busca global com atalho de teclado (Cmd+K)
7. `StatusIndicator` — frescor do dado (verde/amarelo/vermelho)
8. `SqlEditor` — CodeMirror com syntax highlight SQL
9. `NotebookCell` — célula de código executável
10. `GraphCanvas` — canvas para grafo de fundos (usando d3-force)

### Animações

```css
/* Transições rápidas e funcionais — não decorativas */
--transition-fast: 80ms ease;
--transition-base: 150ms ease;
--transition-slow: 300ms ease;

/* Entrada de dados (quando novo dado chega) */
@keyframes data-update {
  0% { background-color: var(--accent-light); }
  100% { background-color: transparent; }
}

/* Skeleton loading (nunca spinner puro) */
@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
```

### DESIGN.md (arquivo que o agent lê antes de qualquer componente)

Criar `site/DESIGN.md` com:
- Resumo de tokens em 1 página
- Regras do que NÃO fazer (lista negra de padrões genéricos)
- Exemplos de uso correto de cada componente
- Hierarquia de z-index
- Regras de responsividade

---

## 5. OS TRÊS PILARES DE DADOS

### Identidade Visual por Pilar

Cada pilar tem:
- Cor primária própria
- Ícone/símbolo próprio
- Fonte de dados própria
- Agente AI especializado próprio

```
CVM (Fundos)    → Azul #1E4A8C  → Ícone: Escudo/balança  → Fonte: dados.cvm.gov.br
Ações (B3)      → Verde #1A7A4A → Ícone: Gráfico de velas → Fonte: Yahoo Finance / B3
Crypto          → Roxo #7B3FA0  → Ícone: Hexágono/rede   → Fonte: Binance / CoinGecko
```

### Home Page — The Three Pillars View

```
┌─────────────────────────────────────────────────────────────┐
│  FIN·DATA·LAB                              [Search] [AI] [⚙] │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Última atualização: 15/05/2026 21:55    [↻ Atualizar]     │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  CVM / SFN   │  │   AÇÕES B3   │  │    CRYPTO    │      │
│  │  ───────────│  │  ───────────│  │  ───────────│      │
│  │  30.4k fundos│  │  456 ativos  │  │  200+ pares  │      │
│  │  R$ 8.2T PL  │  │  IBOV 127k  │  │  BTC 95k USD │      │
│  │  ✓ Mai 2026  │  │  ✓ Hoje      │  │  ✓ Tempo real│      │
│  │              │  │              │  │              │      │
│  │  [Explorar →]│  │  [Explorar →]│  │  [Explorar →]│      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                                                             │
│  ALERTAS RECENTES                                           │
│  ─────────────────                                          │
│  • 3 fundos com variação de cota > 5% hoje                  │
│  • 12 novos fundos cadastrados na CVM esta semana           │
│  • PETR4 acima da média móvel 200d                          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 6. PILAR CVM — FUNDOS DE INVESTIMENTO

### 6.1 Fund Lab — URL Canônica

**URL:** `/cvm/lab/:cnpj`
**Exemplo:** `/cvm/lab/29762315000158` → Kinea Atlas II

**Problema atual:** demora 3 minutos para abrir. **Causa:** a página tenta carregar 7 endpoints sequencialmente. **Solução:** carregar em paralelo + progressive rendering.

**Estrutura da página:**

```
/cvm/lab/29762315000158
│
├── HEADER (carrega imediatamente — só de cvm.cadastro, <100ms)
│   ├── Nome do fundo
│   ├── CNPJ, classe, situação
│   ├── PL atual, cotistas
│   └── Tags: [Multimercado] [Profissional] [Kinea]
│
├── TABS (cada tab é lazy-loaded — só carrega quando clicado)
│   ├── Visão Geral (carrega junto com o header)
│   │   ├── Gráfico de cota (history endpoint)
│   │   ├── Rentabilidade mensal (tabela)
│   │   └── Métricas (sharpe, vol, mdd)
│   │
│   ├── Carteira (lazy — /funds/:cnpj/composition)
│   │   ├── Pie chart por classe de ativo
│   │   ├── Top 20 posições
│   │   └── Histórico de alocação
│   │
│   ├── Estrutura (lazy — /funds/:cnpj/structure)
│   │   ├── Grafo de fundos (D3 force-directed)
│   │   ├── Quem o fundo compra
│   │   ├── Quem compra esse fundo
│   │   └── Fundos espelho
│   │
│   ├── Gestora (lazy — /cvm/gestoras/:gestor_id)
│   │   ├── Todos os fundos da gestora
│   │   ├── PL total gerido
│   │   └── Performance histórica da gestora
│   │
│   └── AI Analyst (lazy — call on demand)
│       ├── Análise automática do fundo
│       ├── Chat com o fundo como contexto
│       └── Comparação com peers
```

### 6.2 Explorer — Busca e Filtro

**URL:** `/cvm/explorer`

Funcionalidade:
- Busca full-text por nome, CNPJ, gestor
- Filtros: classe, situação, PL mínimo/máximo, rentabilidade 12M, Sharpe
- Ordenação por qualquer coluna
- Seleção múltipla → criar peer group
- Export CSV de qualquer visão filtrada
- "Salvar busca" para acessar depois

### 6.3 Radar de Anomalias

**URL:** `/cvm/radar`

O módulo mais diferenciado da plataforma:
- Fundos com variação de cota anormal (> 3σ)
- Gestoras com PL em queda acelerada
- Fundos com alta concentração em um único ativo (risco de concentração)
- Carteiras com ativos ilíquidos em fundos de resgate rápido
- CNPJs duplicados ou suspeitos
- Fundos com PL muito alto mas 0 cotistas (estruturas artificiais)

### 6.4 Gestoras — Books por Gestora

**URL:** `/cvm/gestoras/:slug`

- Todos os fundos da gestora
- PL total sob gestão
- Breakdown por classe (MM, RF, Ações, etc.)
- Histórico de crescimento de PL
- Ranking de performance dos fundos
- Comparação com peers de gestoras

---

## 7. PILAR AÇÕES — MERCADO B3

### Fontes de dados

- **Yahoo Finance** via `yfinance` — histórico de preços, splits, dividendos
- **B3 FTP** — dados históricos oficiais
- **BACEN/SGS** — taxas de referência

### Módulos

**Screener (/acoes/screener)**
- Filtros: setor, subsetor, P/L, P/VP, dividend yield, margem líquida, ROE, ROIC, EV/EBITDA
- Alertas quando ativo cruza critérios
- Comparação lado a lado de até 5 ativos

**Ticker Lab (/acoes/lab/:ticker)**
- Gráfico de preços (candlestick com d3)
- Indicadores técnicos sobrepostos (MA, Bollinger, RSI, MACD)
- Fundamentals (quando disponível via scraping)
- Correlação com índices e setores
- Eventos societários (splits, dividendos, follow-ons)

### Ingestão de Ações

```python
# ingestion/b3/download_history.py
# ingestion/b3/ingest_prices.py
# ingestion/b3/corporate_actions.py
```

---

## 8. PILAR CRYPTO

### Fontes de dados

- **Binance API** via `python-binance` ou `ccxt` — preços, orderbook, trades
- **CoinGecko API** — metadados, market cap, circulating supply
- **Etherscan / blockchain explorers** — on-chain data

### Módulos

**Markets (/crypto/markets)**
- Tabela de top 100 cripto em tempo real
- Filtros: capitalização, volume 24h, variação, setor (DeFi, L1, L2, etc.)
- Heatmap de variação

**Asset Lab (/crypto/lab/:symbol)**
- Histórico de preços
- Volume on-chain
- Métricas de rede (para L1s: hash rate, active addresses)
- Correlação com BTC e ETH

---

## 9. NÚCLEO AI-NATIVE

### Arquitetura dos Agentes

```
AI Gateway (/ai/chat)
│
├── Router Agent (decide qual especialista acionar)
│
├── CVM Agent
│   ├── System prompt: especialista em fundos brasileiros
│   ├── Tools: search_funds, get_fund_history, compare_peers, get_carteira
│   └── RAG: LEANN indexando cadastro + regulamentos
│
├── B3 Agent
│   ├── System prompt: analista de ações e mercado
│   ├── Tools: get_price_history, get_fundamentals, screen_stocks
│   └── RAG: LEANN indexando relatórios anuais scrapeados
│
├── Crypto Agent
│   ├── System prompt: especialista em cripto e blockchain
│   ├── Tools: get_crypto_price, get_on_chain_data, compare_assets
│   └── RAG: LEANN indexando whitepapers e relatórios
│
└── SQL Agent
    ├── System prompt: DBA especializado no schema do FDL
    ├── Tools: execute_read_query, explain_query, suggest_index
    └── Schema: context completo do banco
```

### Interface do AI Chat

Não é uma aba separada — é um **panel deslizante** que abre sobre qualquer página:
- `Cmd+Shift+A` ou botão no header → abre o painel
- O contexto da página atual é passado automaticamente para o agente
- Exemplo: no Fund Lab do Kinea Atlas II, o agente já sabe qual fundo está sendo visualizado

**Controle de tokens:**
- Usuário vê estimativa de tokens antes de enviar
- Toggle para escolher modelo (local DeepSeek, Qwen, ou Claude via API)
- Histórico de conversas indexado localmente

---

## 10. CONSOLE SQL & NOTEBOOKS

### SQL Console (/workspace/sql)

**Componentes:**
- Editor CodeMirror com syntax highlight PostgreSQL
- Autocomplete de tabelas e colunas do schema atual
- Botão "Executar" + `Ctrl+Enter`
- Resultado em tabela paginada ou como gráfico
- Botão "Explicar" → AI explica a query
- Botão "Otimizar" → AI sugere índices ou rewrite
- Queries salvas com nome e descrição
- Histórico de execuções

**Backend:**
```python
# api/routers/sql_console.py
POST /sql/execute    → executa SELECT (somente leitura por padrão)
POST /sql/explain    → EXPLAIN ANALYZE
GET  /sql/schema     → lista schemas, tabelas, colunas
GET  /sql/history    → últimas 50 queries executadas
GET  /sql/saved      → queries salvas
POST /sql/saved      → salva query
```

**Segurança:**
- Somente queries SELECT permitidas por padrão
- Toggle "Modo Escrita" para UPDATE/INSERT (com confirmação)
- Queries que demoram mais de 30s são canceladas automaticamente

### Notebooks (/workspace/notebooks)

**Arquitetura:**
- Jupyter kernel rodando como processo separado
- Comunicação via WebSocket (protocolo nativo do Jupyter)
- Interface React que emula o Jupyter Lab, mas com estilo do FDL
- Cada célula: code (Python) ou markdown
- Output: texto, tabela, gráfico (Plotly renderiza inline)

**Backend:**
```python
# workspace/jupyter_manager.py
# Gerencia kernels Jupyter como subprocessos
# Expõe via WebSocket na /ws/notebook/:notebook_id
```

**Diferencial do Databricks:**
- Variável `db` disponível em todo notebook já conectada ao PostgreSQL
- Variável `fdl` com helpers: `fdl.cotas('21624757000126')` retorna DataFrame
- Auto-import de pandas, numpy, matplotlib, plotly
- Botão "→ Dashboard" que converte o output do notebook em uma página de análise publicada

---

## 11. PERFORMANCE — FIM DOS 3 MINUTOS

### Diagnóstico atual

O Fund Lab demora 3 minutos porque:
1. Todos os endpoints chamados em sequência (waterfall)
2. Alguns endpoints fazem queries pesadas sem cache
3. O frontend aguarda TODOS os dados antes de renderizar qualquer coisa

### Solução: Progressive Rendering + Parallel Fetching

```typescript
// site/src/pages/cvm/FundLab.tsx

// ❌ ERRADO — waterfall sequencial
const detail = await fetchDetail(cnpj);
const history = await fetchHistory(cnpj);
const metrics = await fetchMetrics(cnpj);
const composition = await fetchComposition(cnpj);

// ✅ CORRETO — paralelo + progressive
const [detail, history, metrics, composition] = await Promise.allSettled([
  fetchDetail(cnpj),
  fetchHistory(cnpj),
  fetchMetrics(cnpj),
  fetchComposition(cnpj),
]);

// Renderiza header com detail imediatamente
// Renderiza gráfico com history quando disponível
// Renderiza métricas quando disponível
// etc.
```

### Cache Strategy por Endpoint

```
/funds/:cnpj          → Cache IndexedDB 1 hora (dados de cadastro mudam pouco)
/funds/:cnpj/history  → Cache IndexedDB 4 horas (cotas diárias)
/funds/:cnpj/metrics  → Cache IndexedDB 6 horas (métricas rolantes)
/funds/:cnpj/composition → Cache IndexedDB 12 horas (carteira mensal)
/funds/:cnpj/structure   → Cache IndexedDB 24 horas (estrutura raramente muda)
/allocators/filters   → Cache backend pickle 24 horas (já existe)
```

### Skeleton Loading

Cada seção da página deve ter um skeleton loading enquanto carrega:
- Nunca mostrar spinner global que bloqueia a página
- O header deve aparecer em < 200ms
- O gráfico de cota em < 1 segundo (com cache)
- A composição pode demorar mais — usuário já está lendo outras informações

### Pre-fetching

Quando o usuário hovera sobre um link de fundo no Explorer, pre-fetch os dados:
```typescript
onMouseEnter={() => queryClient.prefetchQuery(['fund', cnpj], () => fetchDetail(cnpj))}
```

---

## 12. CRUD SIMULTÂNEO E PAINÉIS DE CONTROLE

### Princípio: Edição Inline

Tudo que é editável deve ser editável diretamente na tela, sem modal ou página separada:
- Clicou no nome do peer group → edita inline
- Clicou no peso de um fundo → edita o número inline
- Arrastou um fundo para outro grupo → move imediatamente

### Gestão de Peer Groups

**URL:** `/cvm/peers/:slug`

```
[+ Criar Peer Group]

Peer Groups
─────────────────────────────────────────
• Flagship MM Guga (3 fundos)  [✎] [🗑]
• Macro Brasil Large Cap (8 fundos) [✎] [🗑]
• Long Biased Seleção (5 fundos) [✎] [🗑]

[+ Criar novo grupo]
```

**Dentro de um peer group:**
- Busca de fundo → clica → adiciona ao grupo imediatamente
- Arrasta para reordenar
- Toggle de visibilidade por fundo (esconde da comparação sem remover)
- Edita o "apelido" do fundo no grupo (ex: "Kinea Atlas" em vez do nome completo)

### Anotações e Tags

Em qualquer fundo, o usuário pode:
- Adicionar tags customizadas: `[favorito]` `[monitorar]` `[suspeito]` `[estudo]`
- Escrever anotações livres (markdown)
- Marcar como "visto hoje"

Essas informações ficam em uma tabela local `user_annotations` no PostgreSQL.

### Modificação de Peer Automático

Quando a plataforma classifica um fundo automaticamente em um peer:
- O usuário vê: `"Peer automático: Multimercado Macro → [Confirmar] [Mover para: ___]"`
- Um clique para aceitar, dois cliques para mover
- Fica registrado que o usuário modificou aquele peer

---

## 13. GRAFO DE FUNDOS

### O que é

Visualização do grafo de relacionamentos entre fundos:
- Cada nó = um fundo
- Cada aresta = "fundo A investe em fundo B"
- Tamanho do nó = PL do fundo
- Cor = classe do fundo
- Espessura da aresta = % da carteira alocada naquela posição

### Implementação

```typescript
// site/src/components/cvm/FundGraph.tsx
// Usando d3-force para layout de força dirigida

import * as d3 from 'd3';

// Dados vêm de:
// GET /funds/:cnpj/structure
// {
//   nodes: [{id, name, pl, classe, gestor}],
//   links: [{source, target, weight}]  // weight = % da carteira
// }
```

**Interatividade:**
- Hover no nó → tooltip com info do fundo
- Clique no nó → navega para `/cvm/lab/:cnpj`
- Double-click → expande os investimentos daquele fundo (adiciona um nível)
- Scroll → zoom in/out
- Drag → mover nós
- Botão "Expandir tudo" → carrega N níveis de profundidade
- Botão "Focar em nó" → centraliza o grafo no fundo selecionado

**Casos de uso:**
1. Ver a estrutura interna de uma gestora: todos os seus fundos e como se interconectam
2. Rastrear fluxo de capital: onde o dinheiro de um fundo vai parar
3. Detectar estruturas circulares (fundo A investe em B, B investe em A)
4. Detectar "super-nós" — fundos que captam de muitos outros (fundos master)

### Backend

```python
# api/repositories/fund_repo.py
# GET /funds/:cnpj/structure

def get_fund_structure(cnpj: str, depth: int = 2):
    """
    Retorna grafo de N níveis de profundidade.
    depth=1: só investimentos diretos
    depth=2: investimentos dos investimentos
    depth=3: etc.
    """
    # Query recursiva com CTE no PostgreSQL
    # Usa cvm.cda_fi_blc_2 (investimentos em cotas de outros fundos)
```

---

## 14. CRONOGRAMA DE 2 DIAS

### DIA 1 — Design System + Estrutura + Performance (8 fases)

**Fase 1.1 — Setup do Design System (2h)**
- Baixar awesome-design-skills e frontend-guidelines
- Criar `site/DESIGN.md` com tokens adaptados
- Criar `site/FRONTEND_RULES.md`
- Instalar Instrument Serif + DM Sans + JetBrains Mono
- Configurar CSS variables no `site/src/index.css`
- Criar tema light/dark com toggle

**Fase 1.2 — Componentes Base (3h)**
- `DataCard`, `MetricBadge`, `PillarTag`
- `DataTable` com sort + filter + column toggle
- `SearchCombobox` com Cmd+K
- `StatusIndicator` para frescor de dados
- `Skeleton` loading padronizado

**Fase 1.3 — Layout Shell (2h)**
- Sidebar refatorada com seções por pilar (CVM / Ações / Crypto / Workspace / AI / Sistema)
- Header com search global, tema toggle, status badge
- Light mode como padrão
- Preservar dark mode como opção

**Fase 1.4 — Home Page (2h)**
- Três cards de pilares
- Status de freshness de cada pilar
- Alertas recentes
- Quick access cards

**Fase 1.5 — Fund Lab — Performance Fix (3h)**
- Refatorar para Promise.allSettled
- Implementar skeleton loading por seção
- Cache strategy por endpoint
- Pre-fetch on hover no Explorer

**Fase 1.6 — URLs Canônicas (1h)**
- `/cvm/lab/:cnpj` — rota dedicada
- `/cvm/peers/:slug` — peer group
- Breadcrumbs em todas as páginas
- Deep linking funcional

**Fase 1.7 — Logo e Identidade (1h)**
- SVG da logo FDL
- Favicon
- Loading screen com logo

**Fase 1.8 — Testes e Commit (1h)**
- Testar todos os fluxos no browser
- Commit: "feat: design system v1, light theme, performance fix"

### DIA 2 — Funcionalidades Avançadas (8 fases)

**Fase 2.1 — SQL Console (3h)**
- Instalar CodeMirror com extensão PostgreSQL
- Backend `api/routers/sql_console.py`
- Interface `/workspace/sql`
- Autocomplete de schema
- Histórico de queries

**Fase 2.2 — Grafo de Fundos (3h)**
- Instalar d3-force
- Componente `FundGraph.tsx`
- Backend `/funds/:cnpj/structure` com CTE recursiva
- Interatividade: hover, click, expand, zoom

**Fase 2.3 — Notebooks (2h)**
- Setup Jupyter kernel manager
- Componente `NotebookCell.tsx`
- WebSocket connection `/ws/notebook/:id`
- Variáveis pré-injetadas (`db`, `fdl`)

**Fase 2.4 — CRUD de Peer Groups (2h)**
- Edição inline de grupos
- Drag-to-reorder
- Toggle de visibilidade por fundo
- Apelidos customizados

**Fase 2.5 — AI Panel (2h)**
- Painel deslizante ativado por Cmd+Shift+A
- Context passado da página atual
- Selector de modelo (local / cloud)
- Estimativa de tokens

**Fase 2.6 — Radar de Anomalias (2h)**
- Backend: queries de detecção de anomalias
- Frontend: `/cvm/radar` com lista de alertas
- Badge de alertas no header

**Fase 2.7 — LEANN Integration (2h)**
- Instalar LEANN
- Indexar cvm.cadastro
- Conectar ao AI Analyst como tool
- Teste: "fundos de ações com mais de R$500M que investem em BDRs"

**Fase 2.8 — Polish e Commit (1h)**
- Revisar consistência do design em todas as páginas
- Testar light/dark em todas as telas
- Commit: "feat: sql console, fund graph, notebooks, ai panel, radar"

---

## 15. PROMPTS DE EXECUÇÃO POR FASE

### PROMPT FASE 1.1 — Design System Setup

```
TASK: Setup design system — read all referenced files before starting

Step 1 — Download inspiration repos
git clone https://github.com/bergside/awesome-design-skills /tmp/awesome-design
git clone https://github.com/bendc/frontend-guidelines /tmp/frontend-guidelines

Step 2 — Study and select
Read /tmp/awesome-design/skills/ directory. List all available design systems.
Read the one closest to "editorial" or "financial" or "refined-minimal" aesthetic.
Read /tmp/frontend-guidelines/README.md fully.

Step 3 — Create site/DESIGN.md
Based on what you read, create site/DESIGN.md with:
- Color tokens (use the exact CSS variables from section 4 of this plan)
- Typography scale (Instrument Serif + DM Sans + JetBrains Mono)
- Spacing scale
- Component guidelines
- Rules of what NOT to do (list of banned patterns)

Step 4 — Create site/FRONTEND_RULES.md
Extract the most relevant rules from frontend-guidelines and adapt for React/TypeScript.
Focus on: accessibility, performance, naming conventions, CSS organization.

Step 5 — Configure CSS
Open site/src/index.css. Replace all existing CSS variables with the new design tokens.
Add @import for Google Fonts (Instrument Serif, DM Sans, JetBrains Mono).
Add light/dark mode CSS variables using [data-theme="dark"] selector.

Step 6 — Create theme toggle
Create site/src/hooks/useTheme.ts that:
- Reads from localStorage
- Defaults to 'light'
- Sets data-theme attribute on document.documentElement
- Exports { theme, toggleTheme }

Verify: open the browser, confirm fonts loaded, confirm CSS variables applied.
```

### PROMPT FASE 1.5 — Performance Fix

```
TASK: Fix Fund Lab performance — target < 2 seconds to first meaningful render

Step 1 — Profile current state
Open browser devtools Network tab.
Navigate to /cvm/lab/29762315000158
Record: which endpoints are called, in what order, how long each takes.
Report the waterfall.

Step 2 — Refactor to parallel fetching
Open site/src/pages/cvm/FundLab.tsx (or wherever the fund lab page lives).
Find all API calls. Convert from sequential await to Promise.allSettled([...]).
Each section should render as soon as its own data is available.

Step 3 — Add skeleton loading
For each section that loads async, add a skeleton placeholder that shows immediately.
Use a consistent Skeleton component (create site/src/components/ui/Skeleton.tsx if needed).

Step 4 — Implement cache strategy
Open site/src/services/api.ts.
For each fund endpoint, set appropriate TTL in IndexedDB cache:
- /funds/:cnpj → 60 minutes
- /funds/:cnpj/history → 240 minutes  
- /funds/:cnpj/metrics → 360 minutes
- /funds/:cnpj/composition → 720 minutes

Step 5 — Add prefetching on hover
In the fund search results list, add onMouseEnter prefetch:
queryClient.prefetchQuery(['fund', cnpj], () => api.getFundDetail(cnpj))

Step 6 — Measure result
Navigate to /cvm/lab/29762315000158 (cold cache).
Report: time to first render of header, time to chart render, time to full page.
Target: header < 300ms, chart < 1500ms.
```

### PROMPT FASE 2.2 — Grafo de Fundos

```
TASK: Implement fund structure graph using D3 force-directed layout

Step 1 — Backend: structure endpoint
Check if GET /funds/:cnpj/structure exists in api/routers/funds.py.
If not, create it. It should:
1. Query cvm.cda_fi_blc_2 for the fund's investments in other funds
2. Return nodes (id, name, pl, classe, gestor) and links (source, target, weight)
3. Weight = percentage of carteira allocated to that position
4. Depth parameter: default 1, max 3

SQL hint — investments in other funds are in BLC_2 where TP_APLIC = 'Cotas de Fundos':
SELECT cnpj_fundo_invest, nm_fundo_invest, vl_merc_pos_final
FROM cvm.cda_fi_blc_2
WHERE cnpj_fundo = :cnpj
AND dt_comptc = (SELECT MAX(dt_comptc) FROM cvm.cda_fi_blc_2 WHERE cnpj_fundo = :cnpj)

Step 2 — Install D3
cd site && npm install d3 @types/d3

Step 3 — Create FundGraph component
Create site/src/components/cvm/FundGraph.tsx

The component receives { nodes, links } and renders a force-directed graph where:
- Node size = proportional to PL (use d3.scaleSqrt)
- Node color = by classe (use pillar colors from design system)
- Link thickness = proportional to weight (% allocation)
- Node label = fund name (truncated to 20 chars)
- Hover = tooltip with full name, PL, gestor
- Click = navigate to /cvm/lab/:cnpj
- Double-click = expand (emit event to parent to load depth+1)
- Scroll = zoom (d3.zoom)
- Drag = move nodes (d3.drag)

Step 4 — Add to Fund Lab structure tab
In the Estrutura tab of Fund Lab, render <FundGraph /> with the structure data.
Add controls: [Expandir nível] [Recolher] [Centralizar] [Fullscreen]

Step 5 — Test with Kinea Atlas II
Navigate to /cvm/lab/29762315000158 → Estrutura tab
Verify: graph renders with at least some nodes
Interact: hover, click, zoom
Report: how many nodes and edges are shown
```

### PROMPT FASE 2.1 — SQL Console

```
TASK: Build SQL console at /workspace/sql

Step 1 — Install CodeMirror
cd site
npm install @codemirror/view @codemirror/state @codemirror/lang-sql @codemirror/theme-one-dark

Step 2 — Backend router
Create api/routers/sql_console.py with:

POST /sql/execute
  body: { query: string, limit: number (default 1000) }
  - Only allow SELECT statements (reject any query not starting with SELECT or WITH)
  - Execute with 30 second timeout
  - Return: { columns, rows, row_count, execution_time_ms }

GET /sql/schema
  - Return all schemas, tables, columns with types
  - Format: { cvm: { cotas: { columns: [{name, type}] }, ... }, ... }

GET /sql/history
  - Return last 50 executed queries from a new table user_sql_history
  - Columns: id, query, executed_at, row_count, execution_time_ms

POST /sql/saved
  - Save a query with name and description
  - Store in user_saved_queries table

Create the two tables if they don't exist:
CREATE TABLE IF NOT EXISTS user_sql_history (...)
CREATE TABLE IF NOT EXISTS user_saved_queries (...)

Register router in api/main.py with prefix /sql.

Step 3 — Frontend page
Create site/src/pages/workspace/SqlConsole.tsx

Layout (split pane):
┌─────────────────────────────────────────┐
│ SQL Console                 [⌘↵ Run]    │
├──────────────────────┬──────────────────┤
│                      │ Schema Browser   │
│  CodeMirror Editor   │ ─────────────── │
│  (SQL syntax)        │ ▶ cvm           │
│                      │   ▶ cotas       │
│                      │   ▶ cadastro    │
│  [Run] [Explain]     │ ▶ alocadores   │
│  [Save] [History]    │ ▶ middle        │
├──────────────────────┴──────────────────┤
│ Results (1,234 rows · 0.43s)            │
│ [Table] [Chart] [Export CSV]            │
│                                         │
│ col1  col2  col3  col4                  │
│ ...   ...   ...   ...                   │
└─────────────────────────────────────────┘

Step 4 — Add route
In site/src/App.tsx add: <Route path="/workspace/sql" element={<SqlConsole />} />
In menuConfig.ts add SQL Console to Workspace section.

Step 5 — Test
Navigate to /workspace/sql
Type: SELECT cnpj_fundo, denom_social, sit FROM cvm.cadastro LIMIT 10
Press Ctrl+Enter
Verify results appear in table.
```

---

## APÊNDICE A — Arquivos a Criar no Dia 1

```
site/DESIGN.md                          ← tokens, regras, exemplos
site/FRONTEND_RULES.md                  ← guidelines de qualidade
site/src/index.css                      ← CSS variables completas (light + dark)
site/src/hooks/useTheme.ts              ← toggle light/dark
site/src/components/ui/DataCard.tsx
site/src/components/ui/MetricBadge.tsx
site/src/components/ui/PillarTag.tsx
site/src/components/ui/DataTable.tsx
site/src/components/ui/SearchCombobox.tsx
site/src/components/ui/StatusIndicator.tsx
site/src/components/ui/Skeleton.tsx
site/src/components/layout/Sidebar.tsx  ← refatorada com pilares
site/src/components/layout/Header.tsx   ← search + tema + status
site/src/pages/Home.tsx                 ← três pilares + alertas
site/src/assets/logo.svg                ← logo FDL
```

## APÊNDICE B — Arquivos a Criar no Dia 2

```
site/src/pages/workspace/SqlConsole.tsx
site/src/pages/workspace/Notebooks.tsx
site/src/pages/cvm/Radar.tsx
site/src/components/cvm/FundGraph.tsx
site/src/components/ai/AiPanel.tsx
api/routers/sql_console.py
api/routers/ai.py
api/routers/radar.py
workspace/jupyter_manager.py
ingestion/web/fund_docs_crawler.py
```

## APÊNDICE C — Dependências a Instalar

```bash
# Frontend
cd site
npm install d3 @types/d3
npm install @codemirror/view @codemirror/state @codemirror/lang-sql
npm install @codemirror/theme-one-dark @codemirror/autocomplete
npm install framer-motion                    # animações
npm install @radix-ui/react-slider           # controles
npm install react-split                      # split panes

# Backend
pip install jupyter-client --break-system-packages    # notebooks
pip install websockets --break-system-packages        # ws para notebooks
pip install bleach --break-system-packages            # sanitizar SQL input
```

## APÊNDICE D — Tabelas a Criar no PostgreSQL

```sql
-- Anotações do usuário em fundos
CREATE TABLE IF NOT EXISTS user_annotations (
  id SERIAL PRIMARY KEY,
  cnpj_fundo VARCHAR(14),
  note TEXT,
  tags TEXT[],
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Histórico de queries SQL
CREATE TABLE IF NOT EXISTS user_sql_history (
  id SERIAL PRIMARY KEY,
  query TEXT,
  executed_at TIMESTAMP DEFAULT NOW(),
  row_count INTEGER,
  execution_time_ms INTEGER
);

-- Queries salvas
CREATE TABLE IF NOT EXISTS user_saved_queries (
  id SERIAL PRIMARY KEY,
  name VARCHAR(200),
  description TEXT,
  query TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Peer groups customizados do usuário
CREATE TABLE IF NOT EXISTS user_peer_groups (
  id SERIAL PRIMARY KEY,
  slug VARCHAR(100) UNIQUE,
  name VARCHAR(200),
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_peer_group_funds (
  id SERIAL PRIMARY KEY,
  peer_group_id INTEGER REFERENCES user_peer_groups(id) ON DELETE CASCADE,
  cnpj_fundo VARCHAR(14),
  alias VARCHAR(100),  -- apelido customizado
  visible BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0
);
```

---

*FIN-DATA-LAB Master Plan v1.0 — Gerado em 15/05/2026*
*Pronto para execução pelo code agent. Tempo estimado: 48h de trabalho.*
