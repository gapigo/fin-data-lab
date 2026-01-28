
"""
Fund History Model - Access to quota history and performance metrics raw data.

Tables:
- cvm.cotas
"""

import sys
import os
import pandas as pd
from datetime import date
from typing import Optional

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from common.postgresql import PostgresConnector
from common.cache import temp

@temp()
def get_fund_history_raw(cnpj: str, start_date: Optional[date] = None) -> pd.DataFrame:
    """
    Fetches raw quota history for a fund.
    
    Tables: cvm.cotas
    Columns: dt_comptc, vl_quota, vl_patrim_liq, vl_total, captc_dia, resg_dia, nr_cotst
    
    Args:
        cnpj: CNPJ string
        start_date: Optional filter for start date
        
    Returns:
        pd.DataFrame: History data
    """
    db = PostgresConnector()
    
    sql = f"""
        SELECT dt_comptc, vl_quota, vl_patrim_liq, vl_total, captc_dia, resg_dia, nr_cotst
        FROM cvm.cotas
        WHERE cnpj_fundo = '{cnpj}'
    """
    if start_date:
        sql += f" AND dt_comptc >= '{start_date}'"
        
    sql += " ORDER BY dt_comptc ASC"
    
    return db.read_sql(sql)

@temp()
def get_fund_metrics_raw(cnpj: str) -> pd.DataFrame:
    """
    Fetches raw daily quota data for metrics calculation.
    
    Tables: cvm.cotas
    Columns: dt_comptc, vl_quota
    
    Args:
        cnpj: CNPJ string
        
    Returns:
        pd.DataFrame: Time series of quotas
    """
    db = PostgresConnector()
    
    sql = f"SELECT dt_comptc, vl_quota FROM cvm.cotas WHERE cnpj_fundo = '{cnpj}' ORDER BY dt_comptc ASC"
    return db.read_sql(sql)
