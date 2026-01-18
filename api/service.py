import sys
import os
from typing import List, Optional
import pandas as pd
from datetime import date

# Add project root to path to import common
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from common.postgresql import PostgresConnector
from models import FundSearchResponse, FundDetail, QuotaData
from cache import cache

class DataService:
    def __init__(self):
        self.db = PostgresConnector()

    def search_funds(self, query: str = None, limit: int = 50) -> List[FundSearchResponse]:
        # Try to cache 'all' query roughly if no query, but pagination makes it tricky.
        # We'll just cache specific search queries.
        cache_key = f"search_funds:{query}:{limit}"
        cached = cache.get(cache_key)
        if cached:
            return cached

        sql = """
            SELECT cnpj_fundo, denom_social, gestor, classe, sit, dt_ini
            FROM cvm.cadastro
            WHERE sit = 'EM FUNCIONAMENTO NORMAL'
        """
        
        if query:
            # Safe basic sanitization for query
            clean_query = query.replace("'", "''").upper()
            sql += f" AND (denom_social ILIKE '%%{clean_query}%%' OR cnpj_fundo ILIKE '%%{clean_query}%%')"
            
        sql += f" ORDER BY vl_patrim_liq DESC NULLS LAST LIMIT {limit}"
        # create_table logic in common/postgresql implies we might strictly assume read_sql is available
        # Note: vl_patrim_liq is NOT in cadastro table strictly based on cadastro_update.py
        # Wait, cadastro_update.py script does NOT include vl_patrim_liq anywhere in final_cols!
        # It's in cvm.cotas (or fi_doc_cda_fi_pl).
        # We should join or just order by something else. Or maybe just simple limit.
        
        # Let's fix the query to not use vl_patrim_liq if it's not there.
        # I'll rely on demon_social or dt_ini.
        
        sql = """
            SELECT cnpj_fundo, denom_social, gestor, classe, sit, dt_ini
            FROM cvm.cadastro
            WHERE sit = 'EM FUNCIONAMENTO NORMAL'
        """
        if query:
             clean_query = query.replace("'", "''")
             sql += f" AND (denom_social ILIKE '%%{clean_query}%%' OR cnpj_fundo ILIKE '%%{clean_query}%%')"
        
        sql += f" ORDER BY dt_ini DESC LIMIT {limit}"

        df = self.db.read_sql(sql)
        
        results = []
        for _, row in df.iterrows():
            results.append(FundSearchResponse(
                cnpj_fundo=row['cnpj_fundo'],
                denom_social=row['denom_social'],
                gestor=row['gestor'],
                classe=row['classe'],
                sit=row['sit'],
                dt_ini=row['dt_ini'] if pd.notnull(row['dt_ini']) else None
            ))
            
        cache.set(cache_key, results, ttl=60) # Cache search for 1 min
        return results

    def get_fund_detail(self, cnpj: str) -> Optional[FundDetail]:
        cache_key = f"fund_detail:{cnpj}"
        cached = cache.get(cache_key)
        if cached:
            return cached

        # Use parameterized query approach if possible, but read_sql takes a string.
        # We must manually sanitize.
        # Normalize CNPJ: remove non-digits, then checks if it is 14 chars -> format it
        import re
        raw_cnpj = re.sub(r'\D', '', cnpj)
        
        target_cnpj = cnpj.strip()
        if len(raw_cnpj) == 14:
            target_cnpj = f"{raw_cnpj[:2]}.{raw_cnpj[2:5]}.{raw_cnpj[5:8]}/{raw_cnpj[8:12]}-{raw_cnpj[12:]}"
        
        # SQL Injection safety: simple replace (though parameterized is better, we stick to current pattern for now)
        clean_cnpj = target_cnpj.replace("'", "''")
        
        # Use ILIKE to be safer, though CNPJ should be exact. Adding LIMIT 1.
        sql = f"""
            SELECT * FROM cvm.cadastro WHERE cnpj_fundo = '{clean_cnpj}' LIMIT 1
        """
        df = self.db.read_sql(sql)
        
        if df.empty:

            print(f"Debug: Fund {clean_cnpj} not found in cadastro (DB: {self.db.engine.url.database})")
            return None
            
        row = df.iloc[0]
        try:
            # Helper to handle NaN/None for Pydantic
            def val(v):
                return v if pd.notnull(v) else None
                
            detail = FundDetail(
                cnpj_fundo=str(val(row['cnpj_fundo']) or ""),
                denom_social=str(val(row['denom_social']) or "SEM NOME"),
                gestor=val(row['gestor']),
                classe=val(row['classe']),
                sit=val(row['sit']),
                dt_ini=val(row['dt_ini']),
                publico_alvo=val(row.get('publico_alvo')),
                dt_reg=val(row.get('dt_reg')),
                auditor=val(row.get('auditor')), 
                custodiante=val(row.get('custodiante')),
                controlador=val(row.get('controlador'))
            )
            cache.set(cache_key, detail, ttl=3600)
            return detail
        except Exception as e:
            import traceback
            traceback.print_exc()
            print(f"Error instantiating FundDetail: {e}")
            raise e

    def get_fund_history(self, cnpj: str, start_date: date = None) -> List[QuotaData]:
        # Caching history is critical
        s_date_str = start_date.isoformat() if start_date else "all"
        cache_key = f"fund_history:{cnpj}:{s_date_str}"
        cached = cache.get(cache_key)
        if cached:
            return cached

        # Normalize CNPJ
        import re
        raw_cnpj = re.sub(r'\D', '', cnpj)
        
        target_cnpj = cnpj.strip()
        if len(raw_cnpj) == 14:
            target_cnpj = f"{raw_cnpj[:2]}.{raw_cnpj[2:5]}.{raw_cnpj[5:8]}/{raw_cnpj[8:12]}-{raw_cnpj[12:]}"

        clean_cnpj = target_cnpj.replace("'", "''")
        
        # cvm.cotas view
        sql = f"""
            SELECT dt_comptc, vl_quota, vl_patrim_liq, vl_total, captc_dia, resg_dia, nr_cotst
            FROM cvm.cotas
            WHERE cnpj_fundo = '{clean_cnpj}'
        """
        if start_date:
            sql += f" AND dt_comptc >= '{start_date}'"
            
        sql += " ORDER BY dt_comptc ASC"
        
        # This might be slow if the table is huge and not indexed on cnpj_fundo. 
        # But 'cvm.cotas' is a view on 'cvm.fi_doc_inf_diario_inf_diario_fi'.
        # Hopefully that table is indexed.
        
        df = self.db.read_sql(sql)
        
        if df.empty:
            return []
            
        history = []
        for _, row in df.iterrows():
            history.append(QuotaData(
                dt_comptc=row['dt_comptc'],
                vl_quota=row['vl_quota'],
                vl_patrim_liq=row.get('vl_patrim_liq'),
                vl_total=row.get('vl_total'),
                captc_dia=row.get('captc_dia'),
                resg_dia=row.get('resg_dia'),
                nr_cotst=row.get('nr_cotst')
            ))
            
        cache.set(cache_key, history, ttl=3600) # Cache for 1 hour
        return history
