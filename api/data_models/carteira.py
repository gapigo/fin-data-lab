"""
Carteira Model - Cached access to cvm.carteira view.

View: cvm.carteira

Columns:
--------
- dt_comptc: DATE - Data de competência do registro
- cnpj_fundo: VARCHAR - CNPJ do fundo investidor (alocador)
- denom_social: VARCHAR - Denominação social do fundo investidor
- cliente: VARCHAR - Nome do gestor/cliente (grupo)
- cliente_segmentado: VARCHAR - Segmentação do cliente (ex: "Itaú Prev", "Itaú Exclusivo")
- cnpj_fundo_cota: VARCHAR - CNPJ do fundo investido (ativo)
- nm_fundo_cota: VARCHAR - Nome do fundo investido
- gestor_cota: VARCHAR - Gestor do fundo investido
- vl_merc_pos_final: DECIMAL - Valor de mercado da posição final
- peer: VARCHAR - Classe/peer do fundo investido (ex: "Multimercado", "Ações")

Usage:
------
from models import get_carteira_df

# Get all data (cached for 1 day)
df = get_carteira_df()

# Get aggregated data
df_agg = get_carteira_aggregated()
"""

import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

import pandas as pd
from common.cache import temp
from common.postgresql import PostgresConnector


@temp(ttl=86400)  # Cache for 1 day
def get_carteira_df() -> pd.DataFrame:
    """
    Loads the entire cvm.carteira view into a DataFrame.
    
    This function is cached to avoid repeated database queries.
    The cache is stored as a pickle file and refreshes every 24 hours.
    
    Returns:
        pd.DataFrame: Complete carteira data with all columns.
    """
    db = PostgresConnector()
    query = """
        SELECT 
            dt_comptc,
            cnpj_fundo,
            denom_social,
            cliente,
            cliente_segmentado,
            cnpj_fundo_cota,
            nm_fundo_cota,
            gestor_cota,
            vl_merc_pos_final,
            peer
        FROM cvm.carteira
        WHERE dt_comptc > CURRENT_DATE - INTERVAL '5 years'
          AND peer IN ('Ações', 'Multimercado', 'Renda Fixa')
          --AND cnpj_fundo NOT IN (SELECT DISTINCT cnpj_fundo FROM cvm.espelhos)
          AND cliente <> gestor_cota
          AND cliente IN ('BTG', 'XP', 'Bradesco', 'BB', 'Empiricus', 'Itaú', 'Santander')
    """
    df = db.read_sql(query)
    
    # Ensure date column is datetime
    if not df.empty and 'dt_comptc' in df.columns:
        df['dt_comptc'] = pd.to_datetime(df['dt_comptc'])
    
    return df


@temp(ttl=86400)  # Cache for 1 day
def get_carteira_aggregated() -> pd.DataFrame:
    """
    Returns aggregated carteira data by (dt_comptc, cliente, cliente_segmentado, peer).
    
    Useful for dashboard summaries without needing individual fund positions.
    
    Returns:
        pd.DataFrame: Aggregated data with total positions.
    """
    db = PostgresConnector()
    query = """
        SELECT 
            dt_comptc,
            cliente,
            cliente_segmentado,
            gestor_cota,
            peer,
            SUM(vl_merc_pos_final) as total_pos,
            COUNT(DISTINCT cnpj_fundo_cota) as num_fundos
        FROM cvm.carteira
        WHERE dt_comptc > CURRENT_DATE - INTERVAL '5 years'
          AND peer IN ('Ações', 'Multimercado', 'Renda Fixa')
          AND cnpj_fundo NOT IN (SELECT DISTINCT cnpj_fundo FROM cvm.espelhos)
          AND cliente <> gestor_cota
          AND cliente IN ('BTG', 'XP', 'Bradesco', 'BB', 'Empiricus', 'Itaú', 'Santander')
        GROUP BY dt_comptc, cliente, cliente_segmentado, gestor_cota, peer
        ORDER BY dt_comptc, cliente
    """
    df = db.read_sql(query)
    
    if not df.empty and 'dt_comptc' in df.columns:
        df['dt_comptc'] = pd.to_datetime(df['dt_comptc'])
    
    return df


@temp(ttl=86400)
def get_carteira_filters() -> dict:
    """
    Returns available filter values for the carteira dashboard.
    
    Returns:
        dict: {clients, segments, segments_by_client, peers}
    """
    db = PostgresConnector()
    
    # Whitelist de clientes permitidos
    allowed_clients = ('BTG', 'XP', 'Bradesco', 'BB', 'Empiricus', 'Itaú', 'Santander')
    
    # Clients and segments - com filtros restritivos
    sql = """
        SELECT DISTINCT cliente, cliente_segmentado 
        FROM cvm.carteira 
        WHERE cliente IS NOT NULL
          AND dt_comptc > CURRENT_DATE - INTERVAL '5 years'
          AND peer IN ('Ações', 'Multimercado', 'Renda Fixa')
          AND cnpj_fundo NOT IN (SELECT DISTINCT cnpj_fundo FROM cvm.espelhos)
          AND cliente <> gestor_cota
          AND cliente IN ('BTG', 'XP', 'Bradesco', 'BB', 'Empiricus', 'Itaú', 'Santander')
        ORDER BY cliente, cliente_segmentado
    """
    df = db.read_sql(sql)
    
    clients = sorted(df['cliente'].dropna().unique().tolist())
    segments = sorted(df['cliente_segmentado'].dropna().unique().tolist())
    
    # Map client -> segments
    segments_by_client = {}
    for _, row in df.iterrows():
        c = row['cliente']
        s = row['cliente_segmentado']
        if c and s:
            if c not in segments_by_client:
                segments_by_client[c] = []
            if s not in segments_by_client[c]:
                segments_by_client[c].append(s)
    
    # Peers - apenas os 3 permitidos
    peers = ['Ações', 'Multimercado', 'Renda Fixa']
    
    return {
        "clients": clients,
        "segments": segments,
        "segments_by_client": segments_by_client,
        "peers": peers
    }
