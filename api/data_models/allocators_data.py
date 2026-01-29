"""
Allocators Data - Optimized data loading with caching for allocators dashboard.

This module centralizes data loading and joins for the allocators intelligence dashboard.
Uses @temp caching to avoid repeated SQL queries and performs joins in pandas for performance.

Key concepts:
- cnpj_fundo: Fund that allocates (investor fund) - cliente/gestor_cotista
- cnpj_fundo_cota: Fund being invested in (target fund) - gestor_cota
- cliente: Main client group (BTG, XP, etc.)
- cliente_segmentado: Segmented client (Itaú Prev, Itaú Exclusivo, etc.)
- gestor_cota: Manager of the fund being invested in

Tables used:
- cvm.carteira: Historical portfolio positions
- alocadores.fluxo_veiculos: Flow data by fund investor
- cvm.metrics: Performance metrics for funds
"""

import pandas as pd
import numpy as np
from common.cache import temp
from common.postgresql import PostgresConnector

# Whitelist of allowed clients
ALLOWED_CLIENTS = ('BTG', 'XP', 'Bradesco', 'BB', 'Empiricus', 'Itaú', 'Santander')


@temp(ttl=86400)
def load_carteira_base() -> pd.DataFrame:
    """
    Load base carteira data with all relevant filters applied.
    
    Returns only the 7 allowed clients and filters out espelhos and self-management.
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
          AND cliente <> gestor_cota
          AND cliente IN ('BTG', 'XP', 'Bradesco', 'BB', 'Empiricus', 'Itaú', 'Santander')
    """
    
    df = db.read_sql(query)
    
    if not df.empty:
        df['dt_comptc'] = pd.to_datetime(df['dt_comptc'])
    
    return df


@temp(ttl=86400)
def load_fluxo_base() -> pd.DataFrame:
    """
    Load flow data from alocadores.fluxo_veiculos.
    
    This contains flow aggregations for each cnpj_fundo (investor fund).
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
    
    if not df.empty:
        df['dt_comptc'] = pd.to_datetime(df['dt_comptc'])
    
    return df


@temp(ttl=86400)
def load_metrics_full() -> pd.DataFrame:
    """
    Load performance metrics from cvm.metrics.
    
    Metrics are for cnpj_fundo_cota (invested funds).
    """
    db = PostgresConnector()
    
    try:
        query = """
            SELECT 
                cnpj_fundo,
                dt_comptc,
                janela,
                ret,
                vol,
                sharpe,
                mdd as max_dd,
                recovery_time,
                calmar,
                hit_ratio,
                info_ratio,
                meta,
                bench
            FROM cvm.metrics
        """
        
        df = db.read_sql(query)
        
        if not df.empty:
            df['dt_comptc'] = pd.to_datetime(df['dt_comptc'])
        
        return df
    except Exception as e:
        print(f"[allocators_data] Warning: Could not load metrics - {e}")
        return pd.DataFrame(columns=[
            'cnpj_fundo', 'dt_comptc', 'janela', 
            'ret', 'vol', 'sharpe', 'max_dd', 'meta', 'bench'
        ])


@temp(ttl=86400)
def get_carteira_with_flow() -> pd.DataFrame:
    """
    Join carteira with flow data.
    
    Carteira has cnpj_fundo (investor), flow has cnpj_fundo data.
    Join on (cnpj_fundo, dt_comptc) to get flow for each investor fund.
    """
    df_cart = load_carteira_base()
    df_flow = load_fluxo_base()
    
    if df_cart.empty or df_flow.empty:
        return df_cart
    
    # Get latest flow data per cnpj_fundo
    df_flow_latest = df_flow.sort_values('dt_comptc').groupby('cnpj_fundo').tail(1)
    
    # Join on cnpj_fundo
    df_merged = df_cart.merge(
        df_flow_latest[['cnpj_fundo', 'fluxo_6m', 'fluxo_12m', 'fluxo_24m', 
                        'fluxo_36m', 'fluxo_48m', 'fluxo_60m']],
        on='cnpj_fundo',
        how='left'
    )
    
    return df_merged


@temp(ttl=86400)
def get_carteira_with_metrics() -> pd.DataFrame:
    """
    Join carteira with metrics data.
    
    Carteira has cnpj_fundo_cota (invested fund), metrics has cnpj_fundo data.
    Join on cnpj_fundo_cota = cnpj_fundo to get performance of invested funds.
    """
    df_cart = load_carteira_base()
    df_metrics = load_metrics_full()
    
    if df_cart.empty or df_metrics.empty:
        return df_cart
    
    # Get latest metrics per (cnpj_fundo, janela)
    df_metrics_latest = df_metrics.sort_values('dt_comptc').groupby(['cnpj_fundo', 'janela']).tail(1)
    
    # Join on cnpj_fundo_cota = cnpj_fundo
    df_merged = df_cart.merge(
        df_metrics_latest,
        left_on='cnpj_fundo_cota',
        right_on='cnpj_fundo',
        how='left',
        suffixes=('', '_metric')
    )
    
    return df_merged


@temp(ttl=86400)
def get_full_allocators_data() -> pd.DataFrame:
    """
    Get complete allocators dataset with all joins.
    
    This combines carteira, flow, and metrics into a single dataframe.
    """
    df_cart = load_carteira_base()
    df_flow = load_fluxo_base()
    df_metrics = load_metrics_full()
    
    if df_cart.empty:
        return df_cart
    
    # Join flow data (based on cnpj_fundo - investor)
    if not df_flow.empty:
        df_flow_latest = df_flow.sort_values('dt_comptc').groupby('cnpj_fundo').tail(1)
        df_cart = df_cart.merge(
            df_flow_latest[['cnpj_fundo', 'fluxo_6m', 'fluxo_12m', 'fluxo_24m', 
                            'fluxo_36m', 'fluxo_48m', 'fluxo_60m']],
            on='cnpj_fundo',
            how='left'
        )
    
    # Join metrics data (based on cnpj_fundo_cota - invested fund)
    if not df_metrics.empty:
        df_metrics_latest = df_metrics.sort_values('dt_comptc').groupby(['cnpj_fundo', 'janela']).tail(1)
        df_cart = df_cart.merge(
            df_metrics_latest,
            left_on='cnpj_fundo_cota',
            right_on='cnpj_fundo',
            how='left',
            suffixes=('', '_metric')
        )
    
    return df_cart


@temp(ttl=86400)
def get_filters() -> dict:
    """
    Get available filter values (only the 7 allowed clients).
    """
    df = load_carteira_base()
    
    if df.empty:
        return {
            "clients": list(ALLOWED_CLIENTS),
            "segments": [],
            "segments_by_client": {},
            "peers": ['Ações', 'Multimercado', 'Renda Fixa']
        }
    
    # Get unique clients and segments
    clients = sorted(df['cliente'].dropna().unique().tolist())
    segments = sorted(df['cliente_segmentado'].dropna().unique().tolist())
    
    # Map client -> segments
    segments_by_client = {}
    client_segment_pairs = df[['cliente', 'cliente_segmentado']].drop_duplicates()
    
    for _, row in client_segment_pairs.iterrows():
        c = row['cliente']
        s = row['cliente_segmentado']
        if c and s:
            if c not in segments_by_client:
                segments_by_client[c] = []
            segments_by_client[c].append(s)
    
    # Sort segments for each client
    for c in segments_by_client:
        segments_by_client[c] = sorted(segments_by_client[c])
    
    return {
        "clients": clients,
        "segments": segments,
        "segments_by_client": segments_by_client,
        "peers": ['Ações', 'Multimercado', 'Renda Fixa']
    }
