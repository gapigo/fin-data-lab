"""
Alocadores Simplificado - Sistema otimizado com cache JSON pré-computado.

Este módulo implementa um dashboard simplificado de alocadores com:
1. Fluxo do Cliente - Gráficos de fluxo e posição histórica
2. Carteira - Sub-tabs: Performance, Completa, Movimentação
   - Performance: Posição, métricas e boxplots
   - Completa: Donut chart, colunas azul decrescente e tabela detalhada
   - Movimentação: Barras empilhadas + scatter plot (dados mock)

Arquivos:
- register.py: Mapeamento central key -> DataFrame
- dataframes.py: Funções que retornam DataFrames
- queries.py: Queries SQL
- service.py: Lógica de negócio
- router.py: Endpoints FastAPI
- data_cache.py: Cache JSON
- config.py: Configurações
"""

from .data_cache import AllocatorsCache
from .router import router
from .register import get_dataframe, list_keys, describe

__all__ = ['AllocatorsCache', 'router', 'get_dataframe', 'list_keys', 'describe']
