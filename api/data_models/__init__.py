"""
Models module - Cached data access layer for database tables.

Each module in this package represents a database table and provides
cached access to that table's data using the @tmp decorator.

Tables:
- carteira: cvm.carteira view data
- fluxo_veiculos: alocadores.fluxo_veiculos table
- metrics: cvm.metrics table
"""

from .carteira import get_carteira_df, get_carteira_aggregated
from .fluxo_veiculos import get_fluxo_veiculos_df
from .metrics import get_metrics_df

__all__ = [
    'get_carteira_df',
    'get_carteira_aggregated', 
    'get_fluxo_veiculos_df',
    'get_metrics_df'
]
