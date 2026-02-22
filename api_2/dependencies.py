"""
Dependências injetáveis via FastAPI Depends().

Uma instância de cada dependência é criada uma vez e reutilizada.
Isso elimina singletons espalhados e facilita testes.
"""

from functools import lru_cache

from common.postgresql import PostgresConnector
from common.cache import request_dedup

from .config import DB_CONNECTION


@lru_cache()
def get_db() -> PostgresConnector:
    """Conexão com o banco de dados (singleton via lru_cache)."""
    return PostgresConnector(DB_CONNECTION)


def get_dedup():
    """Deduplicador de requisições (global)."""
    return request_dedup
