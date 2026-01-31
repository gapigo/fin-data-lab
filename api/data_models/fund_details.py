
"""
Fund Details Model - Access to fund registration and structure data.

Tables:
- cvm.cadastro
- cvm.cda_fi_blc_2 (for structure relationships)
- cvm.espelhos (for master/feeder logic)
"""

import sys
import os
import pandas as pd
from typing import Optional, Dict, Any, List

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from common.postgresql import PostgresConnector
from common.cache import temp

@temp()
def get_fund_detail_data(cnpj: str) -> pd.DataFrame:
    """
    Fetches registration details for a specific fund.
    
    Tables: cvm.cadastro
    Columns: All columns from view
    
    Args:
        cnpj: Normalized CNPJ string
        
    Returns:
        pd.DataFrame: Single row with fund details
    """
    db = PostgresConnector()
    # clean_cnpj handling should be done by caller or here? 
    # Usually data access expects valid inputs, but let's be safe.
    
    sql = f"""
        SELECT c.*, p.peer_grupo, p.peer_detalhado
        FROM cvm.cadastro c
        LEFT JOIN cvm.peer p ON c.cnpj_fundo = p.cnpj_fundo
        WHERE c.cnpj_fundo = '{cnpj}' 
        AND c.dt_fim IS NULL 
        LIMIT 1
    """
    return db.read_sql(sql)

@temp()
def search_funds_data(query: Optional[str], limit: int = 50) -> pd.DataFrame:
    """
    Search for funds by name or CNPJ.
    
    Tables: cvm.cadastro
    """
    db = PostgresConnector()
    sql = """
        SELECT cnpj_fundo, denom_social, gestor, classe, sit, dt_ini
        FROM cvm.cadastro
        WHERE sit = 'EM FUNCIONAMENTO NORMAL'
    """
    if query:
        clean_query = query.replace("'", "''")
        sql += f" AND (denom_social ILIKE '%%{clean_query}%%' OR cnpj_fundo ILIKE '%%{clean_query}%%')"
    
    sql += f" ORDER BY dt_ini DESC LIMIT {limit}"
    return db.read_sql(sql)

@temp()
def suggest_funds_data(query: str) -> pd.DataFrame:
    """
    Simple search for autocomplete.
    """
    db = PostgresConnector()
    clean_query = query.replace("'", "''").upper()
    sql = f"""
        SELECT DISTINCT denom_social, cnpj_fundo 
        FROM cvm.cadastro 
        WHERE dt_fim IS NULL 
        AND denom_social ILIKE '%%{clean_query}%%' 
        LIMIT 10
    """
    return db.read_sql(sql)

@temp()
def get_fund_structure_data(cnpj: str) -> Dict[str, Any]:
    """
    Fetches investment relationships (invests in / invested by).
    
    Tables: 
        - cvm.cadastro (name)
        - cvm.cda_fi_blc_2 (positions)
        - cvm.espelhos (mirror logic)
        
    Args:
        cnpj: CNPJ of the fund
        
    Returns:
        Dict with raw dataframes or lists for structure analysis
    """
    db = PostgresConnector()
    
    # 1. Get Fund Name
    sql_name = f"SELECT denom_social FROM cvm.cadastro WHERE cnpj_fundo = '{cnpj}' AND dt_fim IS NULL LIMIT 1"
    df_name = db.read_sql(sql_name)
    nome = df_name['denom_social'].iloc[0] if not df_name.empty else "Fundo"
    
    # 2. Latest Date
    sql_date = f"SELECT MAX(dt_comptc) as max_date FROM cvm.cda_fi_blc_2 WHERE cnpj_fundo = '{cnpj}'"
    df_date = db.read_sql(sql_date)
    max_date = df_date['max_date'].iloc[0] if not df_date.empty and pd.notnull(df_date.iloc[0]['max_date']) else None
    
    investe_em_df = pd.DataFrame()
    investido_por_df = pd.DataFrame()
    
    if max_date:
        # Invests In
        sql_invests = f"""
            SELECT cnpj_fundo_cota, nm_fundo_cota, SUM(vl_merc_pos_final) as valor
            FROM cvm.cda_fi_blc_2
            WHERE cnpj_fundo = '{cnpj}' AND dt_comptc = '{max_date}'
            GROUP BY cnpj_fundo_cota, nm_fundo_cota
            ORDER BY valor DESC
            LIMIT 20
        """
        investe_em_df = db.read_sql(sql_invests)
        
        # Invested By (Inverse relationship)
        # Note: This checks who holds 'cnpj' as an asset
        # We need the max date for EACH holder, or a global max date?
        # The original query used a subquery for max date per holder context.
        sql_invested = f"""
            SELECT cnpj_fundo, denom_social, SUM(vl_merc_pos_final) as valor
            FROM cvm.cda_fi_blc_2
            WHERE cnpj_fundo_cota = '{cnpj}'
            AND dt_comptc = (SELECT MAX(dt_comptc) FROM cvm.cda_fi_blc_2 WHERE cnpj_fundo_cota = '{cnpj}')
            GROUP BY cnpj_fundo, denom_social
            ORDER BY valor DESC
            LIMIT 20
        """
        investido_por_df = db.read_sql(sql_invested)
        
    # Check Mirror
    sql_mirror = f"SELECT cnpj_fundo_cota FROM cvm.espelhos WHERE cnpj_fundo = '{cnpj}' LIMIT 1"
    df_mirror = db.read_sql(sql_mirror)
    
    return {
        "nome_fundo": nome,
        "investe_em": investe_em_df,
        "investido_por": investido_por_df,
        "espelho_de": df_mirror['cnpj_fundo_cota'].iloc[0] if not df_mirror.empty else None
    }
