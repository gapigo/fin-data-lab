# API v2 — Clean Architecture

## Como rodar

```bash
# Do root do projeto:
cd fin-data-lab
uvicorn api_2.main:app --host 127.0.0.1 --port 8000 --reload
```

## Arquitetura

```
api_2/
├── main.py              # 75 linhas  — ZERO lógica, só registra routers
├── config.py            # Configuração centralizada (1 arquivo vs 10+)
├── dependencies.py      # Injeção de dependências via lru_cache
│
├── schemas/             # Modelos Pydantic (entrada/saída)
│   └── funds.py         # Todos os schemas do domínio
│
├── routers/             # Controllers HTTP (thin!)
│   ├── funds.py         # GET /funds, /funds/{cnpj}/...
│   ├── peer_groups.py   # CRUD /peer-groups
│   ├── allocators.py    # GET /allocators/...
│   ├── allocators_simple.py  # GET /allocators-simple/...
│   └── cache.py         # GET/DELETE /cache/...
│
├── services/            # Lógica de negócio
│   ├── fund_service.py           # Busca, detalhe, métricas, portfolio
│   ├── peer_group_service.py     # CRUD de peer groups
│   └── allocator_service.py      # Tabs: Fluxo, Performance, Alocação
│
├── repositories/        # Acesso a dados (uma query = um método)
│   ├── base.py          # Helpers: normalize_cnpj, val()
│   ├── fund_repo.py     # Queries de fundos (cadastro, cotas, portfolio)
│   ├── peer_group_repo.py  # CRUD site.peer_groups
│   └── allocator_repo.py  # Queries de alocadores (carteira, fluxo, metrics)
│
└── middleware/
    └── dedup.py          # Request deduplication header
```

## Comparação: api/ vs api_2/

| Aspecto | api/ (antes) | api_2/ (agora) |
|---|---|---|
| `main.py` | **422 linhas** — rotas, models, middleware, dedup logic | **75 linhas** — só registra routers |
| `service.py` | **663 linhas** — God class com tudo | 3 services focados (~250L cada) |
| Implementações de Allocators | **3 paralelas** (allocators.py, allocators_service.py, allocators_simplified/) | **1 service** + 1 wrapper para simplified |
| Queries SQL | Espalhadas em 9+ arquivos | Centralizadas em 3 repositories |
| `sys.path.append` | Em TODOS os arquivos | **1 lugar** (main.py) |
| `try/except ImportError` | Em TODOS os módulos | **Zero** |
| Configuração | Espalhada em 5+ arquivos | **1 arquivo** (config.py) |
| Pasta `old/` | Dentro do código | **Removida** |
| Código duplicado | Massivo (carteira loaded 4x) | **Zero** duplicação |
| Total de arquivos Python | 27 | 19 |

## Para adicionar um novo domínio

1. Crie `repositories/novo_repo.py` com queries `@temp()` cached
2. Crie `services/novo_service.py` com lógica de negócio
3. Crie `routers/novo.py` com endpoints
4. Registre o router em `main.py`: `app.include_router(novo.router)`

**4 passos previsíveis. Sempre a mesma estrutura.**

## Princípios aplicados

- **Single Responsibility**: cada arquivo faz UMA coisa
- **Dependency Injection**: `get_db()` fornece o DB, repos recebem via construtor
- **Open/Closed**: adicionar features = adicionar arquivos, sem modificar existentes
- **Repository Pattern**: queries isoladas do resto do código
- **Thin Controllers**: routers delegam tudo ao service
- **DRY**: `BaseRepository` centraliza `normalize_cnpj`, `val()`
