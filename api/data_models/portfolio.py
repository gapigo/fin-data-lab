
"""
Portfolio Model - Access to detailed portfolio composition and assets.

Tables:
- cvm.cda_fi_pl
- cvm.cda_fi_blc_1 (Títulos Públicos)
- cvm.cda_fi_blc_2 (Cotas de Fundos)
- cvm.cda_fi_blc_3 (Swaps)
- cvm.cda_fi_blc_4 (Ações/Derivativos)
- cvm.cda_fi_blc_5 (Crédito Privado)
- cvm.cda_fi_blc_6 (Outros Créditos)
- cvm.cda_fi_blc_7 (Exterior)
- cvm.cda_fi_blc_8 (Demais Ativos)
"""

import sys
import os
import pandas as pd
from typing import Dict, Any, List

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from common.postgresql import PostgresConnector
from common.cache import temp

@temp()
def get_latest_composition_date(cnpj: str) -> pd.DataFrame:
    """Get max date and PL for valid portfolio."""
    db = PostgresConnector()
    sql = f"SELECT MAX(dt_comptc) as max_date, MAX(vl_patrim_liq) as pl FROM cvm.cda_fi_pl WHERE cnpj_fundo = '{cnpj}'"
    return db.read_sql(sql)

@temp()
def get_portfolio_block_data(cnpj: str, date_str: str, block_num: int) -> pd.DataFrame:
    """
    Fetches data from a specific CVM portfolio block (blc_1 to blc_8).
    
    Args:
        cnpj: Fund CNPJ
        date_str: Date filter (YYYY-MM-DD)
        block_num: Block number (1-8)
        
    Returns:
        pd.DataFrame: Raw block data
    """
    db = PostgresConnector()
    table = f"cvm.cda_fi_blc_{block_num}"
    
    # Select all relevant columns based on block type would be ideal, 
    # but strictly we can select * or specific ones. 
    # To keep it generic for the aggregation logic in service, we fetch what's needed.
    # Service logic uses specific columns per block.
    
    # To avoid huge generic queries, we branch slightly or select * and let pandas handle.
    # Given the volume, selecting * for a single fund/date is fine.
    
    sql = f"""
        SELECT *
        FROM {table}
        WHERE cnpj_fundo = '{cnpj}' AND dt_comptc = '{date_str}'
    """
    return db.read_sql(sql)
