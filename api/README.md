# API - Fin Data Lab

## Estrutura

```
api/
├── main.py              # FastAPI entry point (endpoints atuais)
├── models.py            # Pydantic models
├── cache.py             # Cache utilities
├── service.py           # DataService monolítico (legacy)
├── services/            # Módulos de serviço (novo - cache-first)
│   ├── __init__.py
│   └── allocators.py    # Serviço de Alocadores
└── routers/             # Routers FastAPI (novo)
    ├── __init__.py
    └── allocators.py    # Endpoints de Alocadores
```

## Padrão Cache-First

A estratégia principal é usar **views pré-processadas** no banco de dados em vez de fazer JOINs complexos em runtime.

### Fontes de Dados Principais

| Tabela/View | Descrição | Uso |
|-------------|-----------|-----|
| `cvm.carteira` | View com cliente, cliente_segmentado, peer, nm_fundo_cota | Alocação, Filtros |
| `alocadores.fluxo_veiculos` | Fluxo calculado por janela (6m, 12m, ...) | Fluxo |
| `cvm.metrics` | Métricas de performance (ret, vol, sharpe) por janela | Performance |

### Colunas de cvm.carteira

- `dt_comptc`: Data de competência
- `cnpj_fundo`: CNPJ do fundo alocador
- `cliente`: Nome do cliente (BB, BTG, Itaú, etc)
- `cliente_segmentado`: Segmentação detalhada (BB Exclusivo, Itaú Private, etc)
- `cnpj_fundo_cota`: CNPJ do fundo investido
- `nm_fundo_cota`: Nome do fundo investido
- `peer`: Classe do ativo (Renda Fixa, Multimercado, Ações, etc)
- `vl_merc_pos_final`: Valor de mercado da posição

### Colunas de cvm.metrics

- `cnpj_fundo`: CNPJ do fundo
- `janela`: Janela temporal (6M, 12M, 24M, 36M, 48M, 60M)
- `dt_comptc`: Data de referência
- `ret`: Retorno acumulado
- `vol`: Volatilidade
- `sharpe`: Índice de Sharpe
- `mdd`: Maximum Drawdown

## Endpoints

### Allocators Dashboard

| Endpoint | Descrição |
|----------|-----------|
| `GET /allocators/filters` | Lista de clientes, segmentos e peers disponíveis |
| `GET /allocators/flow` | Evolução patrimonial e distribuição de fluxo |
| `GET /allocators/performance` | Risco x Retorno (scatter plot) |
| `GET /allocators/allocation` | Snapshot da carteira atual |

### Parâmetros

- `client`: Filtro por cliente (ex: "BB", "Itaú")
- `segment`: Filtro por segmento (ex: "BB Exclusivo")
- `peer`: Filtro por classe de ativo (ex: "Multimercado")
- `window`: Janela temporal em meses (6, 12, 24, 36, 48, 60)

## Executando

```bash
cd api
python main.py
# API disponível em http://localhost:8000
```

## Testando

```bash
# Filtros
curl http://localhost:8000/allocators/filters

# Flow
curl "http://localhost:8000/allocators/flow?client=BB&window=12"

# Performance
curl "http://localhost:8000/allocators/performance?client=BB"

# Allocation
curl "http://localhost:8000/allocators/allocation?client=BB&peer=Multimercado"
```
