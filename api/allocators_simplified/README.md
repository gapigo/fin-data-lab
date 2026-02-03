# Alocadores Simplificado

Dashboard otimizado de alocadores com cache JSON pré-computado.

## Arquitetura

```
allocators_simplified/
├── __init__.py          # Exports principais
├── config.py            # Configurações (pasta cache, highlight string, cores)
├── queries.py           # Queries SQL centralizadas
├── data_cache.py        # Sistema de cache JSON
├── service.py           # Lógica de negócio
├── router.py            # Endpoints FastAPI
└── build_cache.py       # Script standalone para rebuild
```

## Conceitos

| Termo | Descrição |
|-------|-----------|
| Cliente | Grupo de gestores (BTG, XP, Itaú) |
| Cliente Segmentado | Área específica do cliente (Itaú Orion) |
| Fundo Cota | Fundo comprado pelo cliente |
| Gestor Cota | Casa que gere o fundo comprado |
| Peer | Categoria: Ações, Multimercado, Renda Fixa |

## 3 Telas

### Tela 1: Fluxo do Cliente
- **Filtros**: Cliente (único), Peers (múltiplos)
- **Gráfico de barras**: Fluxo por cliente_segmentado (verde/vermelho)
- **Gráfico de linha**: Posição histórica 5 anos

### Tela 2: Performance da Carteira
- **Filtros**: Cliente + Segmento (únicos), Peers (múltiplos)
- **Gráfico de posição**: Barras ordenadas decrescente
- **Gráficos de métricas**: Um por janela (6M, 12M, 24M, 36M)
- **Boxplots**: Ret, Vol, MDD com ponto de destaque

### Tela 3: Carteira Completa
- **Filtros**: Cliente Segmentado OU CNPJ
- **Donut chart**: tp_aplic → tp_ativo → nm_ativo
- **Tabela expandível**: Agrupada por tp_aplic

## Configuração

Edite `config.py` para alterar:

```python
# Pasta de cache
LOCAL_CACHE_DIR = Path(r"E:\Cache\Finlab")

# String de destaque (fundos KINEA ficam destacados)
HIGHLIGHT_STRING = "KINEA"

# Cores
COLOR_HIGHLIGHT = "#1e40af"      # Azul escuro
COLOR_POSITIVE = "#10b981"       # Verde
COLOR_NEGATIVE = "#ef4444"       # Vermelho
```

## Editando Queries

Todas as queries SQL estão em `queries.py`:

```python
# Adicione uma nova query
NOVA_QUERY = """
SELECT ... FROM ...
"""

# Registre no dicionário
QUERIES = {
    ...,
    'nova_query': NOVA_QUERY,
}
```

## Build do Cache

### Via Script

```bash
python -m api.allocators_simplified.build_cache
```

### Via API

```bash
curl -X POST http://localhost:8000/allocators-simple/build-cache
```

### Verificar Status

```bash
curl http://localhost:8000/allocators-simple/cache-status
```

## Estrutura do Cache

```
E:\Cache\Finlab\
├── metadata.json           # Info do último build
├── menu.json              # Opções disponíveis
├── flow_by_segment.json   # Fluxo agregado
├── historical_position/
│   └── {cliente}.json
├── current_position/
│   └── {cliente}.json
├── fund_metrics/
│   └── {cliente}.json
└── portfolio_assets/
    └── {cliente}.json
```

## API Endpoints

| Endpoint | Descrição |
|----------|-----------|
| `GET /allocators-simple/filters` | Opções de filtro |
| `GET /allocators-simple/flow?client=X&peers=Y` | Tela 1 |
| `GET /allocators-simple/performance?client=X&segment=Y` | Tela 2 |
| `GET /allocators-simple/portfolio?client=X&segment=Y` | Tela 3 |
| `GET /allocators-simple/fund-highlight?...` | Ponto no boxplot |
| `POST /allocators-simple/build-cache` | Rebuild cache |
| `GET /allocators-simple/cache-status` | Status do cache |
