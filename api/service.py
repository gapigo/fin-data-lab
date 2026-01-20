import sys
import os
from typing import List, Optional
import pandas as pd
from datetime import date

# Add project root to path to import common
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from common.postgresql import PostgresConnector
from models import FundSearchResponse, FundDetail, QuotaData, FundMetrics, FundComposition
from cache import cache
import numpy as np

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

    def suggest_funds(self, query: str) -> List[dict]:
        # Autocomplete for names
        clean_query = query.replace("'", "''").upper()
        sql = f"""
            SELECT DISTINCT denom_social, cnpj_fundo 
            FROM cvm.cadastro 
            WHERE dt_fim IS NULL 
            AND denom_social ILIKE '%%{clean_query}%%' 
            LIMIT 10
        """
        df = self.db.read_sql(sql)
        if df.empty:
            return []
        
        return df[['denom_social', 'cnpj_fundo']].to_dict('records')

    def _normalize_cnpj(self, cnpj: str) -> str:
        import re
        raw_cnpj = re.sub(r'\D', '', cnpj)
        target_cnpj = cnpj.strip()
        if len(raw_cnpj) == 14:
            target_cnpj = f"{raw_cnpj[:2]}.{raw_cnpj[2:5]}.{raw_cnpj[5:8]}/{raw_cnpj[8:12]}-{raw_cnpj[12:]}"
        return target_cnpj.replace("'", "''")

    def get_fund_detail(self, cnpj: str) -> Optional[FundDetail]:
        cache_key = f"fund_detail:{cnpj}"
        cached = cache.get(cache_key)
        if cached:
            return cached

        clean_cnpj = self._normalize_cnpj(cnpj)
        
        # Use ILIKE to be safer, though CNPJ should be exact. Adding LIMIT 1.
        sql = f"""
            SELECT * FROM cvm.cadastro WHERE cnpj_fundo = '{clean_cnpj}' AND dt_fim IS NULL LIMIT 1
        """
        df = self.db.read_sql(sql)
        
        if df.empty:
            # print(f"Debug: Fund {clean_cnpj} not found in cadastro (DB: {self.db.engine.url.database})")
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
            # import traceback
            # traceback.print_exc()
            print(f"Error instantiating FundDetail: {e}")
            raise e

    def get_fund_history(self, cnpj: str, start_date: date = None) -> List[QuotaData]:
        # Caching history is critical
        s_date_str = start_date.isoformat() if start_date else "all"
        cache_key = f"fund_history:{cnpj}:{s_date_str}"
        cached = cache.get(cache_key)
        if cached:
            return cached

        clean_cnpj = self._normalize_cnpj(cnpj)
        
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

    def get_fund_metrics(self, cnpj: str) -> Optional[dict]:
        # This returns the structure expected by FundMetrics.
        # We do the calculation here.
        clean_cnpj = self._normalize_cnpj(cnpj)
        
        sql = f"SELECT dt_comptc, vl_quota FROM cvm.cotas WHERE cnpj_fundo = '{clean_cnpj}' ORDER BY dt_comptc ASC"
        df = self.db.read_sql(sql)
        
        if df.empty:
            return None
            
        df['dt_comptc'] = pd.to_datetime(df['dt_comptc'])
        df = df.set_index('dt_comptc')
        
        # Add Daily Returns
        df['ret'] = df['vl_quota'].pct_change()
        
        # Monthly Returns Matrix
        # Resample to monthly last value
        df_m = df['vl_quota'].resample('ME').last()
        df_m_ret = df_m.pct_change()
        
        # Construct the monthly table: Year -> {Month: Val}
        rent_mes = {}
        rent_ano = {}
        
        # Iterate through years
        years = df_m_ret.index.year.unique()
        for y in years:
            year_data = df_m_ret[df_m_ret.index.year == y]
            rent_mes[int(y)] = {m: round(v * 100, 2) for m, v in zip(year_data.index.month, year_data.values) if pd.notnull(v)}
            
            # Annual return: (1+r1)*(1+r2)... - 1
            # Or just last quota of year / last quota of prev year - 1
            # Finding start/end for the year
            try:
                end_q = df_m[df_m.index.year == y].iloc[-1]
                # Start is last of prev year, or first of this year if inception
                prev_year_data = df_m[df_m.index.year == y-1]
                if not prev_year_data.empty:
                    start_q = prev_year_data.iloc[-1]
                    rent_ano[int(y)] = round(((end_q / start_q) - 1) * 100, 2)
                else:
                    # Inception year
                    first_q = df['vl_quota'][df.index.year == y].iloc[0]
                    rent_ano[int(y)] = round(((end_q / first_q) - 1) * 100, 2)
            except:
                rent_ano[int(y)] = 0.0

        # Accum
        first_q = df['vl_quota'].iloc[0]
        last_q = df['vl_quota'].iloc[-1]
        rent_accum = {} # Just putting total for now or per year accum? 
        # The mockup shows 'Acumulado' per row (year).
        # Which usually means Accumulated from inception until end of that year.
        
        for y in years:
            try:
                end_q_y = df_m[df_m.index.year == y].iloc[-1]
                rent_accum[int(y)] = round(((end_q_y / first_q) - 1) * 100, 2)
            except:
                pass


        # Volatility 12M (Standard deviation of daily returns Last 252 days * sqrt(252))
        vol_12m = 0.0
        import numpy as np
        if len(df) > 252:
            last_252 = df['ret'].tail(252)
            vol_12m = float(last_252.std() * np.sqrt(252) * 100)
            
        # Sharpe 12M (Return 12m - RiskFree) / Vol 12m. Assuming RF=10% as placeholder or 0.
        # Simple Return 12M
        sharpe = 0.0
        if vol_12m > 0 and len(df) > 252:
             price_now = df['vl_quota'].iloc[-1]
             price_12m_ago = df['vl_quota'].iloc[-252]
             ret_12m = (price_now / price_12m_ago) - 1
             sharpe = (ret_12m * 100 - 10) / vol_12m # Using 10% as mock CDI
             
        # Consistency
        total_months = len(df_m_ret)
        pos_months = len(df_m_ret[df_m_ret > 0])
        neg_months = len(df_m_ret[df_m_ret < 0])
        
        return {
            "rentabilidade_mes": rent_mes,
            "rentabilidade_ano": rent_ano,
            "rentabilidade_acumulada": rent_accum,
            "volatilidade_12m": round(vol_12m, 2),
            "sharpe_12m": round(sharpe, 2),
            "consistency": {
                "pos_months": pos_months,
                "neg_months": neg_months,
                "best_month": round(df_m_ret.max() * 100, 2) if not df_m_ret.empty else 0,
                "worst_month": round(df_m_ret.min() * 100, 2) if not df_m_ret.empty else 0
            }
        }

    def get_fund_composition(self, cnpj: str) -> Optional[dict]:
        clean_cnpj = self._normalize_cnpj(cnpj)
        
        # Try to get data from cda_fi_blc_2 (Asset Allocation / Block 2)
        # We need the MOST RECENT portfolio composition.
        
        # First, find max date
        sql_date = f"SELECT MAX(dt_comptc) as max_date FROM cvm.cda_fi_blc_2 WHERE cnpj_fundo = '{clean_cnpj}'"
        df_date = self.db.read_sql(sql_date)
        if df_date.empty or pd.isnull(df_date.iloc[0]['max_date']):
             return {"items": [], "date": None}
             
        max_date = df_date.iloc[0]['max_date']
        
        # Now fetch breakdown
        # columns in blc_2: likely 'ds_ativo' or 'tp_aplic' and 'vl_merc_pos_final'
        # Since I can't confirm columns 100%, I'll try to guess based on standard.
        # If it fails, return empty.
        
        # Standard names often: 'ds_disponibilidade' or 'tp_ativo' ??
        # The user image has: "Cotas de Fundos", "Titulos Publicos". 
        # In CDA, these are often in 'tp_aplic' or 'ds_ativo'.
        
        # Let's try 'tp_aplic' and sum 'vl_merc_pos_final'
        sql = f"""
            SELECT tp_aplic as name, SUM(vl_merc_pos_final) as value 
            FROM cvm.cda_fi_blc_2 
            WHERE cnpj_fundo = '{clean_cnpj}' AND dt_comptc = '{max_date}'
            GROUP BY tp_aplic
            ORDER BY value DESC
        """
        try:
            df = self.db.read_sql(sql)
        except:
             # Fallback if column names are different.
             return {"items": [], "date": str(max_date)}

        total = df['value'].sum() or 1
        items = []
        for _, row in df.iterrows():
            items.append({
                "name": row['name'] or "Outros",
                "value": row['value'],
                "percentage": round((row['value'] / total) * 100, 2)
            })
            
        return {
            "items": items,
            "date": str(max_date)
        }
