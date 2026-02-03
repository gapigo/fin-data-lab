"""
Alocadores Simplificado - Sistema otimizado com cache JSON pré-computado.

Este módulo implementa um dashboard simplificado de alocadores com 3 telas:
1. Fluxo do Cliente - Gráficos de fluxo e posição histórica
2. Performance da Carteira - Posição, métricas e boxplots
3. Carteira Completa - Donut chart e tabela detalhada
"""

from .data_cache import AllocatorsCache
from .router import router

__all__ = ['AllocatorsCache', 'router']
