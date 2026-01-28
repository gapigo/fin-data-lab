"""
Fluxo Veiculos Model - Cached access to alocadores.fluxo_veiculos table.

Table: alocadores.fluxo_veiculos

Columns (actual as of 2026-01-28):
--------
- cnpj_fundo: VARCHAR - CNPJ do fundo alocador
- peer_ativo: VARCHAR - Classe/peer do ativo investido (ex: "Multimercado", "Ações")
- dt_comptc: DATE - Data de competência (fim do mês)
- total_pos: DECIMAL - Posição total na data
- fluxo_6m: DECIMAL - Fluxo líquido nos últimos 6 meses
- fluxo_12m: DECIMAL - Fluxo líquido nos últimos 12 meses
- fluxo_24m: DECIMAL - Fluxo líquido nos últimos 24 meses
- fluxo_36m: DECIMAL - Fluxo líquido nos últimos 36 meses
- fluxo_48m: DECIMAL - Fluxo líquido nos últimos 48 meses
- fluxo_60m: DECIMAL - Fluxo líquido nos últimos 60 meses

Usage:
------
from data_models import get_fluxo_veiculos_df

# Get all flow data (cached for 1 day)
df = get_fluxo_veiculos_df()

# Filter by peer
df_mm = df[df['peer_ativo'] == 'Multimercado']
"""

import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

import pandas as pd
from common.cache import temp
from common.postgresql import PostgresConnector


@temp(ttl=86400)  # Cache for 1 day
def get_fluxo_veiculos_df() -> pd.DataFrame:
    """
    Loads the entire alocadores.fluxo_veiculos table into a DataFrame.
    
    This function is cached to avoid repeated database queries.
    The cache is stored as a pickle file and refreshes every 24 hours.
    
    Returns:
        pd.DataFrame: Complete flow data with all window columns.
    """
    db = PostgresConnector()
    query = """
        SELECT 
            cnpj_fundo,
            peer_ativo,
            dt_comptc,
            total_pos,
            fluxo_6m,
            fluxo_12m,
            fluxo_24m,
            fluxo_36m,
            fluxo_48m,
            fluxo_60m
        FROM alocadores.fluxo_veiculos
    """
    df = db.read_sql(query)
    
    # Ensure date column is datetime
    if not df.empty and 'dt_comptc' in df.columns:
        df['dt_comptc'] = pd.to_datetime(df['dt_comptc'])
    
    return df


@temp(ttl=86400)
def get_fluxo_latest() -> pd.DataFrame:
    """
    Returns only the most recent date's flow data.
    
    Useful for current snapshot views.
    
    Returns:
        pd.DataFrame: Flow data for the most recent date.
    """
    db = PostgresConnector()
    query = """
        SELECT * FROM alocadores.fluxo_veiculos
        WHERE dt_comptc = (SELECT MAX(dt_comptc) FROM alocadores.fluxo_veiculos)
    """
    df = db.read_sql(query)
    
    if not df.empty and 'dt_comptc' in df.columns:
        df['dt_comptc'] = pd.to_datetime(df['dt_comptc'])
    
    return df


@temp(ttl=86400)
def get_fluxo_aggregated_by_peer() -> pd.DataFrame:
    """
    Returns flow data aggregated by (dt_comptc, peer_ativo).
    
    Sums the flow columns across all funds within each peer.
    
    Returns:
        pd.DataFrame: Aggregated flow data.
    """
    db = PostgresConnector()
    query = """
        SELECT 
            dt_comptc,
            peer_ativo,
            SUM(total_pos) as total_pos,
            SUM(fluxo_6m) as fluxo_6m,
            SUM(fluxo_12m) as fluxo_12m,
            SUM(fluxo_24m) as fluxo_24m,
            SUM(fluxo_36m) as fluxo_36m,
            SUM(fluxo_48m) as fluxo_48m,
            SUM(fluxo_60m) as fluxo_60m,
            COUNT(DISTINCT cnpj_fundo) as num_fundos
        FROM alocadores.fluxo_veiculos
        GROUP BY dt_comptc, peer_ativo
        ORDER BY dt_comptc, peer_ativo
    """
    df = db.read_sql(query)
    
    if not df.empty and 'dt_comptc' in df.columns:
        df['dt_comptc'] = pd.to_datetime(df['dt_comptc'])
    
    return df
