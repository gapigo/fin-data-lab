# Data Structure Documentation for LLMs

Este documento descreve a estrutura de dados do sistema Alocadores Simplificado.
Destinado a LLMs que precisam inserir, appendar ou modificar dados.

## Conceitos Fundamentais

### Entidades Principais

| Entidade | Descrição |
|----------|-----------|
| **Cliente** | Grupo de gestores de fundos (ex: Itaú, BTG, XP) |
| **Cliente Segmentado** | Área específica de um cliente (ex: Itaú Orion, Itaú Prev) |
| **Cota/Fundo Cota** | Fundo comprado por um alocador |
| **Gestor Cota** | Casa que gere o fundo comprado |
| **Peer** | Categoria de fundo: Ações, Multimercado, Renda Fixa |

### Relacionamentos

```
Cliente (1) ─────────────► (N) Cliente Segmentado
Cliente Segmentado (1) ──► (N) Fundos Cota
Fundo Cota (1) ──────────► (1) Gestor Cota
Fundo Cota (1) ──────────► (1) Peer
```

## Estrutura de Arquivos de Cache

Os dados são pré-computados e salvos em JSON na pasta de cache.

### Estratégia de Build do Cache

**IMPORTANTE:** O build é otimizado para:
1. Rodar TODAS as 6 queries SQL **uma única vez** (isso é o gargalo)
2. Iterar pelos DataFrames **na memória** (rápido)
3. Salvar JSONs **incrementalmente** com feedback visual

Isso significa que mesmo que o processo demore, você verá arquivos sendo criados progressivamente.

### Estrutura de Diretórios

```
E:\Cache\Finlab\                      # Pasta de cache (configurável)
├── metadata.json                     # Informações do último build
├── menu.json                         # Opções disponíveis (filtros)
├── flow_by_segment/
│   └── {cliente}.json                # Fluxo por cliente
├── historical_position/
│   └── {cliente}.json                # Posição histórica por cliente
├── current_position/
│   └── {cliente}__{segmento}.json    # Posição atual (SEGMENTADO)
├── fund_metrics/
│   └── {cliente}__{segmento}.json    # Métricas (SEGMENTADO)
└── portfolio_assets/
    ├── {cliente}__{segmento}__index.json  # Índice de CNPJs
    └── {cliente}__{segmento}__{cnpj}.json # Ativos POR FUNDO (granular)
```

**Nota:** A segmentação granular garante arquivos pequenos (~10KB-10MB cada) para carregamento rápido.

---

## Estruturas de Dados

### 1. menu.json

Contém opções disponíveis para filtros.

```json
{
  "clients": ["BTG", "XP", "Bradesco", "BB", "Empiricus", "Itaú", "Santander"],
  "segments_by_client": {
    "Itaú": ["Itaú Orion", "Itaú Prev", "Itaú Private"],
    "BTG": ["BTG Asset", "BTG Pactual"]
  },
  "peers": ["Ações", "Multimercado", "Renda Fixa"],
  "updated_at": "2025-01-30T10:00:00"
}
```

**Campos:**
- `clients` (array<string>): Lista de clientes permitidos
- `segments_by_client` (object): Mapa cliente → segmentos
- `peers` (array<string>): Categorias de fundos
- `updated_at` (ISO string): Timestamp do último update

---

### 2. flow_by_segment/{cliente}.json

Dados de fluxo de um cliente específico.

```json
{
  "client": "Itaú",
  "data": [
    {
      "cliente": "Itaú",
      "cliente_segmentado": "Itaú Orion",
      "peer_ativo": "Multimercado",
      "fluxo_6m": 1500000.00,
      "fluxo_12m": 3200000.00,
      "fluxo_24m": 5100000.00,
      "fluxo_36m": 7800000.00,
      "fluxo_48m": 9500000.00,
      "fluxo_60m": 12000000.00
    }
  ],
  "count": 45,
  "updated_at": "2025-01-30T10:00:00"
}
```

**Campos do item:**
- `cliente` (string): Nome do cliente
- `cliente_segmentado` (string): Nome do segmento
- `peer_ativo` (string): Categoria do peer
- `fluxo_Xm` (number|null): Fluxo acumulado em X meses

---

### 3. historical_position/{cliente}.json

Posição histórica de um cliente (5 anos de dados).

```json
{
  "client": "Itaú",
  "data": [
    {
      "cliente": "Itaú",
      "cliente_segmentado": "Itaú Orion",
      "peer": "Multimercado",
      "dt_comptc": "2024-01-31",
      "vl_merc_pos_final": 150000000.00
    }
  ],
  "count": 1250,
  "updated_at": "2025-01-30T10:00:00"
}
```

**Campos do item:**
- `dt_comptc` (string YYYY-MM-DD): Data de competência
- `vl_merc_pos_final` (number): Valor de mercado da posição

---

### 4. current_position/{cliente}__{segmento}.json

Posição atual dos fundos na carteira de um cliente+segmento.

```json
{
  "client": "Itaú",
  "segment": "Itaú Orion",
  "data": [
    {
      "dt_comptc": "2025-06-30",
      "cliente": "Itaú",
      "cliente_segmentado": "Itaú Orion",
      "cnpj_fundo_cota": "12.345.678/0001-90",
      "nm_fundo_cota": "KINEA ZEUS FIM",
      "gestor_cota": "KINEA",
      "peer": "Multimercado",
      "vl_merc_pos_final": 50000000.00
    }
  ],
  "count": 85,
  "updated_at": "2025-01-30T10:00:00"
}
```

**Campos do item:**
- `cnpj_fundo_cota` (string): CNPJ do fundo investido
- `nm_fundo_cota` (string): Nome do fundo investido
- `gestor_cota` (string): Gestor do fundo

---

### 5. fund_metrics/{cliente}__{segmento}.json

Métricas de performance dos fundos de um cliente+segmento.

```json
{
  "client": "Itaú",
  "segment": "Itaú Orion",
  "data": [
    {
      "cliente": "Itaú",
      "cliente_segmentado": "Itaú Orion",
      "cnpj_fundo": "12.345.678/0001-90",
      "nm_fundo_cota": "KINEA ZEUS FIM",
      "peer": "Multimercado",
      "vl_merc_pos_final": 50000000.00,
      "janela": "12M",
      "ret": 15.5,
      "vol": 8.2,
      "mdd": -5.3,
      "recovery_time": 45,
      "sharpe": 1.2,
      "calmar": 2.9,
      "hit_ratio": 0.65,
      "info_ratio": 0.8
    }
  ],
  "count": 420,
  "updated_at": "2025-01-30T10:00:00"
}
```

**Campos de métricas:**
- `janela` (string): "6M", "12M", "24M", "36M", "48M", "60M"
- `ret` (number|null): Retorno percentual
- `vol` (number|null): Volatilidade percentual
- `mdd` (number|null): Max Drawdown percentual (negativo)
- `recovery_time` (number|null): Dias para recuperação
- `sharpe` (number|null): Índice Sharpe
- `calmar` (number|null): Índice Calmar
- `hit_ratio` (number|null): Taxa de acerto (0-1)
- `info_ratio` (number|null): Information Ratio

---

### 6. portfolio_assets (Estrutura Granular)

Os ativos são organizados de forma granular para evitar arquivos grandes:

#### 6a. Índice: {cliente}__{segmento}__index.json

```json
{
  "client": "Itaú",
  "segment": "Itaú Orion",
  "cnpjs": ["12.345.678/0001-90", "23.456.789/0001-01"],
  "count": 2,
  "updated_at": "2025-01-30T10:00:00"
}
```

#### 6b. Por Fundo: {cliente}__{segmento}__{cnpj}.json

```json
{
  "client": "Itaú",
  "segment": "Itaú Orion",
  "cnpj_fundo": "12.345.678/0001-90",
  "data": [
    {
      "cliente": "Itaú",
      "cliente_segmentado": "Itaú Orion",
      "cnpj_fundo": "12.345.678/0001-90",
      "tp_aplic": "Renda Fixa",
      "tp_ativo": "Títulos Públicos",
      "nm_ativo": "LTN 01/01/2026",
      "cd_ativo": "LTN010126",
      "tp_cd_ativo": "ISIN",
      "vl_merc_pos_final": 25000000.00
    }
  ],
  "count": 150,
  "updated_at": "2025-01-30T10:00:00"
}
```

**Campos do item:**
- `tp_aplic` (string): Tipo de aplicação (nível 1 do donut)
- `tp_ativo` (string): Tipo do ativo (nível 2 do donut)
- `nm_ativo` (string): Nome do ativo (nível 3 do donut)
- `cd_ativo` (string): Código do ativo
- `tp_cd_ativo` (string): Tipo do código (ISIN, CUSIP, etc)

---

## Como Adicionar Novos Dados

### Adicionando Nova Query

1. Edite `api/allocators_simplified/queries.py`
2. Adicione a query SQL como constante
3. Registre no dicionário `QUERIES`
4. Atualize `data_cache.py` para processar a nova query

```python
# queries.py
NEW_QUERY = """
SELECT ... FROM ...
"""

QUERIES = {
    ...,
    'new_query': NEW_QUERY,
}
```

### Modificando Limite de Fundos por Segmento

Por padrão, apenas os **top 30 fundos** (por `vl_merc_pos_final`) são salvos por segmento.
Isso evita arquivos de 300MB+ em fund_metrics.

1. Edite `api/allocators_simplified/config.py`
2. Altere `TOP_FUNDS_LIMIT`

```python
TOP_FUNDS_LIMIT = 30  # Aumentar ou diminuir conforme necessário
```


### Modificando String de Destaque

1. Edite `api/allocators_simplified/config.py`
2. Altere `HIGHLIGHT_STRING`

```python
HIGHLIGHT_STRING = "KINEA"  # Mude para outro nome
```

---

## API Endpoints

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/allocators-simple/filters` | GET | Lista opções de filtro |
| `/allocators-simple/flow` | GET | Tela 1: Fluxo do Cliente |
| `/allocators-simple/performance` | GET | Tela 2: Performance |
| `/allocators-simple/portfolio` | GET | Tela 3: Carteira |
| `/allocators-simple/fund-highlight` | GET | Ponto no boxplot |
| `/allocators-simple/build-cache` | POST | Rebuild do cache |
| `/allocators-simple/cache-status` | GET | Status do cache |

---

## Formato de Resposta dos Endpoints

### GET /flow

```json
{
  "bar_chart": [
    {
      "cliente_segmentado": "Itaú Orion",
      "flow": 3200000.00,
      "color": "#10b981"
    }
  ],
  "line_chart": [
    {
      "date": "2024-01-31",
      "value": 150000000.00
    }
  ]
}
```

### GET /performance

```json
{
  "position_chart": [...],
  "metrics_charts": {
    "6M": [...],
    "12M": [...]
  },
  "boxplots": {
    "ret": [...],
    "vol": [...],
    "mdd": [...]
  },
  "highlighted_funds": [...],
  "all_funds": [...],
  "default_fund": {...}
}
```

### GET /portfolio

```json
{
  "donut_chart": {
    "name": "Carteira",
    "children": [...]
  },
  "table_data": [
    {
      "tp_aplic": "Renda Fixa",
      "total_value": 500000000,
      "percentage": 45.5,
      "items": [...]
    }
  ],
  "total_value": 1100000000
}
```
