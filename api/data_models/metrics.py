"""
Metrics Model - Cached access to cvm.metrics table.

Table: cvm.metrics

Columns:
--------
- cnpj_fundo: VARCHAR - CNPJ do fundo
- dt_comptc: DATE - Data de competência das métricas
- janela: VARCHAR - Janela temporal (6M, 12M, 24M, 36M, 48M, 60M)
- ret: DECIMAL - Retorno acumulado na janela (percentual)
- vol: DECIMAL - Volatilidade anualizada na janela (percentual)
- sharpe: DECIMAL - Sharpe ratio na janela
- max_dd: DECIMAL - Maximum drawdown na janela (percentual, negativo)
- meta: DECIMAL - Meta de retorno do fundo (percentual)
- bench: DECIMAL - Retorno do benchmark na janela (percentual)

Note: If the table doesn't exist yet or has different columns, 
the function will return an empty DataFrame with expected columns.

Usage:
------
from models import get_metrics_df

# Get all metrics (cached for 1 day)
df = get_metrics_df()

# Filter by window
df_12m = df[df['janela'] == '12M']
"""

import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

import pandas as pd
from common.cache import temp
from common.postgresql import PostgresConnector


@temp(ttl=86400)  # Cache for 1 day
def get_metrics_df() -> pd.DataFrame:
    """
    Loads the entire cvm.metrics table into a DataFrame.
    
    This function is cached to avoid repeated database queries.
    The cache is stored as a pickle file and refreshes every 24 hours.
    
    Returns:
        pd.DataFrame: Complete metrics data with all windows.
    """
    db = PostgresConnector()
    
    # First check if table exists
    try:
        query = """
            SELECT 
                cnpj_fundo,
                dt_comptc,
                janela,
                ret,
                vol,
                sharpe,
                max_dd,
                meta,
                bench
            FROM cvm.metrics
        """
        df = db.read_sql(query)
        
        if not df.empty and 'dt_comptc' in df.columns:
            df['dt_comptc'] = pd.to_datetime(df['dt_comptc'])
        
        return df
    except Exception as e:
        print(f"[metrics] Warning: Could not load cvm.metrics - {e}")
        # Return empty DataFrame with expected columns
        return pd.DataFrame(columns=[
            'cnpj_fundo', 'dt_comptc', 'janela', 
            'ret', 'vol', 'sharpe', 'max_dd', 'meta', 'bench'
        ])


@temp(ttl=86400)
def get_metrics_latest() -> pd.DataFrame:
    """
    Returns only the most recent date's metrics for each fund and window.
    
    Returns:
        pd.DataFrame: Latest metrics data.
    """
    db = PostgresConnector()
    
    try:
        # Get latest date per (cnpj_fundo, janela) combination
        query = """
            WITH latest AS (
                SELECT cnpj_fundo, janela, MAX(dt_comptc) as max_dt
                FROM cvm.metrics
                GROUP BY cnpj_fundo, janela
            )
            SELECT m.*
            FROM cvm.metrics m
            INNER JOIN latest l 
                ON m.cnpj_fundo = l.cnpj_fundo 
                AND m.janela = l.janela 
                AND m.dt_comptc = l.max_dt
        """
        df = db.read_sql(query)
        
        if not df.empty and 'dt_comptc' in df.columns:
            df['dt_comptc'] = pd.to_datetime(df['dt_comptc'])
        
        return df
    except Exception as e:
        print(f"[metrics] Warning: Could not load latest metrics - {e}")
        return pd.DataFrame(columns=[
            'cnpj_fundo', 'dt_comptc', 'janela', 
            'ret', 'vol', 'sharpe', 'max_dd', 'meta', 'bench'
        ])


def get_performance_status(ret: float, meta: float, bench: float) -> str:
    """
    Determines the performance status color based on returns.
    
    Args:
        ret: Fund return
        meta: Target return (meta)
        bench: Benchmark return
    
    Returns:
        str: 'green' if beats meta, 'yellow' if beats bench, 'red' otherwise
    """
    if ret is None:
        return 'gray'
    
    if meta is not None and ret >= meta:
        return 'green'
    elif bench is not None and ret >= bench:
        return 'yellow'
    else:
        return 'red'
