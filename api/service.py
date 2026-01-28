import sys
import os
from typing import List, Optional, Dict, Any
import pandas as pd
from datetime import date

# Add project root to path to import common
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from common.postgresql import PostgresConnector
from models import (
    FundSearchResponse, FundDetail, QuotaData, FundMetrics, FundComposition,
    AssetPosition, PortfolioBlock, PortfolioDetailed, FundRelationship, 
    FundStructure, TopAsset
)
from cache import cache, tmp
import numpy as np

class DataService:
    def __init__(self):
        self.db = PostgresConnector()

    def _normalize_cnpj(self, cnpj: str) -> str:
        import re
        raw_cnpj = re.sub(r'\D', '', cnpj)
        target_cnpj = cnpj.strip()
        if len(raw_cnpj) == 14:
            target_cnpj = f"{raw_cnpj[:2]}.{raw_cnpj[2:5]}.{raw_cnpj[5:8]}/{raw_cnpj[8:12]}-{raw_cnpj[12:]}"
        return target_cnpj.replace("'", "''")

    def _val(self, v):
        """Retorna None se o valor for NaN/NaT"""
        return v if pd.notnull(v) else None

    # ========================================================================
    # FUND SEARCH & DETAIL
    # ========================================================================
    
    def search_funds(self, query: str = None, limit: int = 50) -> List[FundSearchResponse]:
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
            clean_query = query.replace("'", "''")
            sql += f" AND (denom_social ILIKE '%%{clean_query}%%' OR cnpj_fundo ILIKE '%%{clean_query}%%')"
        
        sql += f" ORDER BY dt_ini DESC LIMIT {limit}"

        df = self.db.read_sql(sql)
        
        results = []
        for _, row in df.iterrows():
            results.append(FundSearchResponse(
                cnpj_fundo=row['cnpj_fundo'],
                denom_social=row['denom_social'],
                gestor=self._val(row['gestor']),
                classe=self._val(row['classe']),
                sit=self._val(row['sit']),
                dt_ini=self._val(row['dt_ini'])
            ))
            
        cache.set(cache_key, results, ttl=60)
        return results

    def suggest_funds(self, query: str) -> List[dict]:
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

    def get_fund_detail(self, cnpj: str) -> Optional[FundDetail]:
        cache_key = f"fund_detail:{cnpj}"
        cached = cache.get(cache_key)
        if cached:
            return cached

        clean_cnpj = self._normalize_cnpj(cnpj)
        
        sql = f"""
            SELECT * FROM cvm.cadastro WHERE cnpj_fundo = '{clean_cnpj}' AND dt_fim IS NULL LIMIT 1
        """
        df = self.db.read_sql(sql)
        
        if df.empty:
            return None
            
        row = df.iloc[0]
        try:
            detail = FundDetail(
                cnpj_fundo=str(self._val(row['cnpj_fundo']) or ""),
                denom_social=str(self._val(row['denom_social']) or "SEM NOME"),
                gestor=self._val(row.get('gestor')),
                classe=self._val(row.get('classe')),
                sit=self._val(row.get('sit')),
                dt_ini=self._val(row.get('dt_ini')),
                publico_alvo=self._val(row.get('publico_alvo')),
                dt_reg=self._val(row.get('dt_reg')),
                auditor=self._val(row.get('auditor')), 
                custodiante=self._val(row.get('custodiante')),
                controlador=self._val(row.get('controlador')),
                admin=self._val(row.get('admin')),
                taxa_adm=str(self._val(row.get('taxa_adm'))) if pd.notnull(row.get('taxa_adm')) else None,
                taxa_perf=str(self._val(row.get('vl_taxa_perfm'))) if pd.notnull(row.get('vl_taxa_perfm')) else None,
                benchmark=self._val(row.get('rentab_fundo')),
                condom=self._val(row.get('condom')),
                fundo_exclusivo=self._val(row.get('fundo_exclusivo')),
                fundo_cotas=self._val(row.get('fundo_cotas')),
            )
            cache.set(cache_key, detail, ttl=3600)
            return detail
        except Exception as e:
            print(f"Error instantiating FundDetail: {e}")
            raise e

    # ========================================================================
    # FUND HISTORY (COTAS)
    # ========================================================================

    def get_fund_history(self, cnpj: str, start_date: date = None) -> List[QuotaData]:
        s_date_str = start_date.isoformat() if start_date else "all"
        cache_key = f"fund_history:{cnpj}:{s_date_str}"
        cached = cache.get(cache_key)
        if cached:
            return cached

        clean_cnpj = self._normalize_cnpj(cnpj)
        
        sql = f"""
            SELECT dt_comptc, vl_quota, vl_patrim_liq, vl_total, captc_dia, resg_dia, nr_cotst
            FROM cvm.cotas
            WHERE cnpj_fundo = '{clean_cnpj}'
        """
        if start_date:
            sql += f" AND dt_comptc >= '{start_date}'"
            
        sql += " ORDER BY dt_comptc ASC"
        
        df = self.db.read_sql(sql)
        
        if df.empty:
            return []
            
        history = []
        for _, row in df.iterrows():
            history.append(QuotaData(
                dt_comptc=row['dt_comptc'],
                vl_quota=row['vl_quota'],
                vl_patrim_liq=self._val(row.get('vl_patrim_liq')),
                vl_total=self._val(row.get('vl_total')),
                captc_dia=self._val(row.get('captc_dia')),
                resg_dia=self._val(row.get('resg_dia')),
                nr_cotst=self._val(row.get('nr_cotst'))
            ))
            
        cache.set(cache_key, history, ttl=3600)
        return history

    # ========================================================================
    # FUND METRICS (RENTABILIDADE)
    # ========================================================================

    def get_fund_metrics(self, cnpj: str) -> Optional[dict]:
        clean_cnpj = self._normalize_cnpj(cnpj)
        
        sql = f"SELECT dt_comptc, vl_quota FROM cvm.cotas WHERE cnpj_fundo = '{clean_cnpj}' ORDER BY dt_comptc ASC"
        df = self.db.read_sql(sql)
        
        if df.empty:
            return None
            
        df['dt_comptc'] = pd.to_datetime(df['dt_comptc'])
        df = df.set_index('dt_comptc')
        
        df['ret'] = df['vl_quota'].pct_change()
        
        df_m = df['vl_quota'].resample('ME').last()
        df_m_ret = df_m.pct_change()
        
        rent_mes = {}
        rent_ano = {}
        
        years = df_m_ret.index.year.unique()
        for y in years:
            year_data = df_m_ret[df_m_ret.index.year == y]
            rent_mes[int(y)] = {m: round(v * 100, 2) for m, v in zip(year_data.index.month, year_data.values) if pd.notnull(v)}
            
            try:
                end_q = df_m[df_m.index.year == y].iloc[-1]
                prev_year_data = df_m[df_m.index.year == y-1]
                if not prev_year_data.empty:
                    start_q = prev_year_data.iloc[-1]
                    rent_ano[int(y)] = round(((end_q / start_q) - 1) * 100, 2)
                else:
                    first_q = df['vl_quota'][df.index.year == y].iloc[0]
                    rent_ano[int(y)] = round(((end_q / first_q) - 1) * 100, 2)
            except:
                rent_ano[int(y)] = 0.0

        first_q = df['vl_quota'].iloc[0]
        rent_accum = {}
        
        for y in years:
            try:
                end_q_y = df_m[df_m.index.year == y].iloc[-1]
                rent_accum[int(y)] = round(((end_q_y / first_q) - 1) * 100, 2)
            except:
                pass

        vol_12m = 0.0
        if len(df) > 252:
            last_252 = df['ret'].tail(252)
            vol_12m = float(last_252.std() * np.sqrt(252) * 100)
            
        sharpe = 0.0
        if vol_12m > 0 and len(df) > 252:
            price_now = df['vl_quota'].iloc[-1]
            price_12m_ago = df['vl_quota'].iloc[-252]
            ret_12m = (price_now / price_12m_ago) - 1
            sharpe = (ret_12m * 100 - 10) / vol_12m
             
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

    # ========================================================================
    # FUND COMPOSITION (RESUMO)
    # ========================================================================

    def get_fund_composition(self, cnpj: str) -> Optional[dict]:
        clean_cnpj = self._normalize_cnpj(cnpj)
        
        sql_date = f"SELECT MAX(dt_comptc) as max_date FROM cvm.cda_fi_pl WHERE cnpj_fundo = '{clean_cnpj}'"
        df_date = self.db.read_sql(sql_date)
        if df_date.empty or pd.isnull(df_date.iloc[0]['max_date']):
            return {"items": [], "date": None}
             
        max_date = df_date.iloc[0]['max_date']
        
        # Agregação por tipo de aplicação de todos os blocos
        composition = {}
        
        # BLC 1 - Títulos Públicos
        sql = f"""
            SELECT 'Títulos Públicos' as tp_aplic, SUM(vl_merc_pos_final) as valor
            FROM cvm.cda_fi_blc_1
            WHERE cnpj_fundo = '{clean_cnpj}' AND dt_comptc = '{max_date}'
            HAVING SUM(vl_merc_pos_final) > 0
        """
        df = self.db.read_sql(sql)
        if not df.empty and df['valor'].iloc[0]:
            composition['Títulos Públicos'] = float(df['valor'].iloc[0])
        
        # BLC 2 - Cotas de Fundos
        sql = f"""
            SELECT 'Cotas de Fundos' as tp_aplic, SUM(vl_merc_pos_final) as valor
            FROM cvm.cda_fi_blc_2
            WHERE cnpj_fundo = '{clean_cnpj}' AND dt_comptc = '{max_date}'
            HAVING SUM(vl_merc_pos_final) > 0
        """
        df = self.db.read_sql(sql)
        if not df.empty and df['valor'].iloc[0]:
            composition['Cotas de Fundos'] = float(df['valor'].iloc[0])
        
        # BLC 3 - Swaps
        sql = f"""
            SELECT 'Operações de Swap' as tp_aplic, SUM(vl_merc_pos_final) as valor
            FROM cvm.cda_fi_blc_3
            WHERE cnpj_fundo = '{clean_cnpj}' AND dt_comptc = '{max_date}'
            HAVING SUM(vl_merc_pos_final) > 0
        """
        df = self.db.read_sql(sql)
        if not df.empty and df['valor'].iloc[0]:
            composition['Operações de Swap'] = float(df['valor'].iloc[0])
        
        # BLC 4 - Ações/Derivativos
        sql = f"""
            SELECT 'Ações e Derivativos' as tp_aplic, SUM(vl_merc_pos_final) as valor
            FROM cvm.cda_fi_blc_4
            WHERE cnpj_fundo = '{clean_cnpj}' AND dt_comptc = '{max_date}'
            HAVING SUM(vl_merc_pos_final) > 0
        """
        df = self.db.read_sql(sql)
        if not df.empty and df['valor'].iloc[0]:
            composition['Ações e Derivativos'] = float(df['valor'].iloc[0])
        
        # BLC 5 - Debêntures/Crédito Privado
        sql = f"""
            SELECT 'Crédito Privado' as tp_aplic, SUM(vl_merc_pos_final) as valor
            FROM cvm.cda_fi_blc_5
            WHERE cnpj_fundo = '{clean_cnpj}' AND dt_comptc = '{max_date}'
            HAVING SUM(vl_merc_pos_final) > 0
        """
        df = self.db.read_sql(sql)
        if not df.empty and df['valor'].iloc[0]:
            composition['Crédito Privado'] = float(df['valor'].iloc[0])
        
        # BLC 6 - Outros Créditos
        sql = f"""
            SELECT 'Outros Créditos' as tp_aplic, SUM(vl_merc_pos_final) as valor
            FROM cvm.cda_fi_blc_6
            WHERE cnpj_fundo = '{clean_cnpj}' AND dt_comptc = '{max_date}'
            HAVING SUM(vl_merc_pos_final) > 0
        """
        df = self.db.read_sql(sql)
        if not df.empty and df['valor'].iloc[0]:
            composition['Outros Créditos'] = float(df['valor'].iloc[0])
        
        # BLC 7 - Exterior
        sql = f"""
            SELECT 'Investimentos no Exterior' as tp_aplic, SUM(vl_merc_pos_final) as valor
            FROM cvm.cda_fi_blc_7
            WHERE cnpj_fundo = '{clean_cnpj}' AND dt_comptc = '{max_date}'
            HAVING SUM(vl_merc_pos_final) > 0
        """
        df = self.db.read_sql(sql)
        if not df.empty and df['valor'].iloc[0]:
            composition['Investimentos no Exterior'] = float(df['valor'].iloc[0])
        
        # BLC 8 - Demais Ativos
        sql = f"""
            SELECT 'Demais Ativos' as tp_aplic, SUM(vl_merc_pos_final) as valor
            FROM cvm.cda_fi_blc_8
            WHERE cnpj_fundo = '{clean_cnpj}' AND dt_comptc = '{max_date}'
            HAVING SUM(vl_merc_pos_final) > 0
        """
        df = self.db.read_sql(sql)
        if not df.empty and df['valor'].iloc[0]:
            composition['Demais Ativos'] = float(df['valor'].iloc[0])

        total = sum(composition.values()) or 1
        items = []
        for name, value in sorted(composition.items(), key=lambda x: -x[1]):
            items.append({
                "name": name,
                "value": value,
                "percentage": round((value / total) * 100, 2)
            })
            
        return {
            "items": items,
            "date": str(max_date)
        }

    # ========================================================================
    # PORTFOLIO DETAILED (CARTEIRA COMPLETA POR BLOCO)
    # ========================================================================

    def get_portfolio_detailed(self, cnpj: str) -> Optional[dict]:
        """Retorna a carteira completa do fundo com todos os ativos por bloco"""
        clean_cnpj = self._normalize_cnpj(cnpj)
        
        # 1. Buscar data mais recente e PL
        sql = f"SELECT MAX(dt_comptc) as max_date, MAX(vl_patrim_liq) as pl FROM cvm.cda_fi_pl WHERE cnpj_fundo = '{clean_cnpj}'"
        df_date = self.db.read_sql(sql)
        if df_date.empty or pd.isnull(df_date.iloc[0]['max_date']):
            return None
        
        max_date = df_date.iloc[0]['max_date']
        pl_total = float(df_date.iloc[0]['pl'] or 1)
        
        blocos = []
        resumo = {}
        
        # BLC 1 - Títulos Públicos
        sql = f"""
            SELECT tp_titpub as codigo, tp_ativo as nome, dt_venc,
                   SUM(vl_merc_pos_final) as valor
            FROM cvm.cda_fi_blc_1
            WHERE cnpj_fundo = '{clean_cnpj}' AND dt_comptc = '{max_date}'
            GROUP BY tp_titpub, tp_ativo, dt_venc
            ORDER BY valor DESC
        """
        df = self.db.read_sql(sql)
        if not df.empty:
            total_blc = df['valor'].sum()
            ativos = []
            for _, row in df.iterrows():
                ativos.append({
                    "nome": f"{row['codigo'] or ''} - {row['nome'] or 'Título'}".strip(' -'),
                    "valor": float(row['valor']),
                    "percentual": round((row['valor'] / pl_total) * 100, 2),
                    "dt_venc": str(row['dt_venc']) if pd.notnull(row['dt_venc']) else None
                })
            blocos.append({
                "tipo": "titulos_publicos",
                "nome_display": "Títulos Públicos",
                "total_valor": float(total_blc),
                "total_percentual": round((total_blc / pl_total) * 100, 2),
                "ativos": ativos
            })
            resumo["Títulos Públicos"] = round((total_blc / pl_total) * 100, 2)
        
        # BLC 2 - Cotas de Fundos
        sql = f"""
            SELECT nm_fundo_cota as nome, cnpj_fundo_cota as cnpj,
                   SUM(vl_merc_pos_final) as valor
            FROM cvm.cda_fi_blc_2
            WHERE cnpj_fundo = '{clean_cnpj}' AND dt_comptc = '{max_date}'
            GROUP BY nm_fundo_cota, cnpj_fundo_cota
            ORDER BY valor DESC
        """
        df = self.db.read_sql(sql)
        if not df.empty:
            total_blc = df['valor'].sum()
            ativos = []
            for _, row in df.iterrows():
                ativos.append({
                    "nome": row['nome'] or "Fundo",
                    "valor": float(row['valor']),
                    "percentual": round((row['valor'] / pl_total) * 100, 2),
                    "cnpj_emissor": row['cnpj']
                })
            blocos.append({
                "tipo": "cotas_fundos",
                "nome_display": "Cotas de Fundos",
                "total_valor": float(total_blc),
                "total_percentual": round((total_blc / pl_total) * 100, 2),
                "ativos": ativos
            })
            resumo["Cotas de Fundos"] = round((total_blc / pl_total) * 100, 2)
        
        # BLC 4 - Ações/Derivativos
        sql = f"""
            SELECT cd_ativo as codigo, ds_ativo as nome,
                   SUM(vl_merc_pos_final) as valor
            FROM cvm.cda_fi_blc_4
            WHERE cnpj_fundo = '{clean_cnpj}' AND dt_comptc = '{max_date}'
            GROUP BY cd_ativo, ds_ativo
            ORDER BY valor DESC
        """
        df = self.db.read_sql(sql)
        if not df.empty:
            total_blc = df['valor'].sum()
            ativos = []
            for _, row in df.iterrows():
                ativos.append({
                    "nome": f"{row['codigo'] or ''} - {row['nome'] or 'Ativo'}".strip(' -'),
                    "valor": float(row['valor']),
                    "percentual": round((row['valor'] / pl_total) * 100, 2),
                    "tipo": "acao"
                })
            blocos.append({
                "tipo": "acoes_derivativos",
                "nome_display": "Ações e Derivativos",
                "total_valor": float(total_blc),
                "total_percentual": round((total_blc / pl_total) * 100, 2),
                "ativos": ativos
            })
            resumo["Ações e Derivativos"] = round((total_blc / pl_total) * 100, 2)
        
        # BLC 5 - Crédito Privado (Debêntures)
        sql = f"""
            SELECT emissor as nome, cnpj_emissor, dt_venc,
                   SUM(vl_merc_pos_final) as valor
            FROM cvm.cda_fi_blc_5
            WHERE cnpj_fundo = '{clean_cnpj}' AND dt_comptc = '{max_date}'
            GROUP BY emissor, cnpj_emissor, dt_venc
            ORDER BY valor DESC
        """
        df = self.db.read_sql(sql)
        if not df.empty:
            total_blc = df['valor'].sum()
            ativos = []
            for _, row in df.iterrows():
                ativos.append({
                    "nome": row['nome'] or "Emissor",
                    "valor": float(row['valor']),
                    "percentual": round((row['valor'] / pl_total) * 100, 2),
                    "cnpj_emissor": row['cnpj_emissor'],
                    "dt_venc": str(row['dt_venc']) if pd.notnull(row['dt_venc']) else None
                })
            blocos.append({
                "tipo": "credito_privado",
                "nome_display": "Crédito Privado",
                "total_valor": float(total_blc),
                "total_percentual": round((total_blc / pl_total) * 100, 2),
                "ativos": ativos
            })
            resumo["Crédito Privado"] = round((total_blc / pl_total) * 100, 2)
        
        # BLC 7 - Exterior
        sql = f"""
            SELECT ds_ativo_exterior as nome, pais,
                   SUM(vl_merc_pos_final) as valor
            FROM cvm.cda_fi_blc_7
            WHERE cnpj_fundo = '{clean_cnpj}' AND dt_comptc = '{max_date}'
            GROUP BY ds_ativo_exterior, pais
            ORDER BY valor DESC
        """
        df = self.db.read_sql(sql)
        if not df.empty:
            total_blc = df['valor'].sum()
            ativos = []
            for _, row in df.iterrows():
                ativos.append({
                    "nome": row['nome'] or "Ativo Exterior",
                    "valor": float(row['valor']),
                    "percentual": round((row['valor'] / pl_total) * 100, 2),
                    "extra": {"pais": row['pais']}
                })
            blocos.append({
                "tipo": "exterior",
                "nome_display": "Investimentos no Exterior",
                "total_valor": float(total_blc),
                "total_percentual": round((total_blc / pl_total) * 100, 2),
                "ativos": ativos
            })
            resumo["Exterior"] = round((total_blc / pl_total) * 100, 2)
        
        return {
            "cnpj_fundo": clean_cnpj.replace("''", "'"),
            "dt_comptc": str(max_date),
            "vl_patrim_liq": pl_total,
            "blocos": blocos,
            "resumo": resumo
        }

    # ========================================================================
    # FUND STRUCTURE (RELACIONAMENTOS)
    # ========================================================================

    def get_fund_structure(self, cnpj: str) -> Optional[dict]:
        """Retorna a estrutura do fundo (em qual fundo investe e quem investe nele)"""
        clean_cnpj = self._normalize_cnpj(cnpj)
        
        # Buscar nome do fundo
        sql = f"SELECT denom_social FROM cvm.cadastro WHERE cnpj_fundo = '{clean_cnpj}' AND dt_fim IS NULL LIMIT 1"
        df = self.db.read_sql(sql)
        nome_fundo = df['denom_social'].iloc[0] if not df.empty else "Fundo"
        
        # Data mais recente
        sql = f"SELECT MAX(dt_comptc) as max_date FROM cvm.cda_fi_blc_2 WHERE cnpj_fundo = '{clean_cnpj}'"
        df_date = self.db.read_sql(sql)
        max_date = df_date['max_date'].iloc[0] if not df_date.empty and pd.notnull(df_date.iloc[0]['max_date']) else None
        
        investe_em = []
        investido_por = []
        
        if max_date:
            # Fundos em que este fundo investe
            sql = f"""
                SELECT cnpj_fundo_cota, nm_fundo_cota, SUM(vl_merc_pos_final) as valor
                FROM cvm.cda_fi_blc_2
                WHERE cnpj_fundo = '{clean_cnpj}' AND dt_comptc = '{max_date}'
                GROUP BY cnpj_fundo_cota, nm_fundo_cota
                ORDER BY valor DESC
                LIMIT 20
            """
            df = self.db.read_sql(sql)
            for _, row in df.iterrows():
                investe_em.append({
                    "cnpj_fundo": clean_cnpj.replace("''", "'"),
                    "cnpj_relacionado": row['cnpj_fundo_cota'],
                    "nome_relacionado": row['nm_fundo_cota'] or "Fundo",
                    "tipo_relacao": "INVESTE_EM",
                    "valor": float(row['valor']) if pd.notnull(row['valor']) else None
                })
            
            # Fundos que investem neste
            sql = f"""
                SELECT cnpj_fundo, denom_social, SUM(vl_merc_pos_final) as valor
                FROM cvm.cda_fi_blc_2
                WHERE cnpj_fundo_cota = '{clean_cnpj}'
                AND dt_comptc = (SELECT MAX(dt_comptc) FROM cvm.cda_fi_blc_2 WHERE cnpj_fundo_cota = '{clean_cnpj}')
                GROUP BY cnpj_fundo, denom_social
                ORDER BY valor DESC
                LIMIT 20
            """
            df = self.db.read_sql(sql)
            for _, row in df.iterrows():
                investido_por.append({
                    "cnpj_fundo": clean_cnpj.replace("''", "'"),
                    "cnpj_relacionado": row['cnpj_fundo'],
                    "nome_relacionado": row['denom_social'] or "Fundo",
                    "tipo_relacao": "INVESTIDO_POR",
                    "valor": float(row['valor']) if pd.notnull(row['valor']) else None
                })
        
        # Verificar espelho
        espelho_de = None
        try:
            sql = f"SELECT cnpj_fundo_cota FROM cvm.espelhos WHERE cnpj_fundo = '{clean_cnpj}' LIMIT 1"
            df = self.db.read_sql(sql)
            if not df.empty:
                espelho_de = df['cnpj_fundo_cota'].iloc[0]
        except:
            pass
        
        # Determinar tipo
        tipo = "FI"
        if investe_em and not investido_por:
            tipo = "FIC"  # Investe em outros mas ninguém investe nele
        elif not investe_em and investido_por:
            tipo = "MASTER"  # Não investe em outros mas outros investem nele
        
        return {
            "cnpj_fundo": clean_cnpj.replace("''", "'"),
            "nome_fundo": nome_fundo,
            "tipo": tipo,
            "investe_em": investe_em,
            "investido_por": investido_por,
            "espelho_de": espelho_de
        }

    # ========================================================================
    # TOP ASSETS (MAIORES POSIÇÕES)
    # ========================================================================

    def get_top_assets(self, cnpj: str, limit: int = 10) -> List[dict]:
        """Retorna os maiores ativos da carteira"""
        clean_cnpj = self._normalize_cnpj(cnpj)
        
        # Buscar data mais recente
        sql = f"SELECT MAX(dt_comptc) as max_date FROM cvm.cda_fi_pl WHERE cnpj_fundo = '{clean_cnpj}'"
        df_date = self.db.read_sql(sql)
        if df_date.empty or pd.isnull(df_date.iloc[0]['max_date']):
            return []
        
        max_date = df_date.iloc[0]['max_date']
        
        # Buscar PL para calcular percentual
        sql = f"SELECT vl_patrim_liq FROM cvm.cda_fi_pl WHERE cnpj_fundo = '{clean_cnpj}' AND dt_comptc = '{max_date}'"
        df_pl = self.db.read_sql(sql)
        pl_total = float(df_pl['vl_patrim_liq'].iloc[0]) if not df_pl.empty else 1
        
        all_assets = []
        
        # Ações (BLC 4)
        sql = f"""
            SELECT cd_ativo as codigo, ds_ativo as nome, SUM(vl_merc_pos_final) as valor
            FROM cvm.cda_fi_blc_4
            WHERE cnpj_fundo = '{clean_cnpj}' AND dt_comptc = '{max_date}'
            GROUP BY cd_ativo, ds_ativo
            ORDER BY valor DESC
            LIMIT 20
        """
        df = self.db.read_sql(sql)
        for _, row in df.iterrows():
            all_assets.append({
                "codigo": row['codigo'],
                "nome": row['nome'] or row['codigo'] or "Ativo",
                "valor": float(row['valor']),
                "percentual": round((row['valor'] / pl_total) * 100, 2),
                "tipo": "acao"
            })
        
        # Cotas de fundos (BLC 2)
        sql = f"""
            SELECT nm_fundo_cota as nome, cnpj_fundo_cota as codigo, SUM(vl_merc_pos_final) as valor
            FROM cvm.cda_fi_blc_2
            WHERE cnpj_fundo = '{clean_cnpj}' AND dt_comptc = '{max_date}'
            GROUP BY nm_fundo_cota, cnpj_fundo_cota
            ORDER BY valor DESC
            LIMIT 20
        """
        df = self.db.read_sql(sql)
        for _, row in df.iterrows():
            all_assets.append({
                "codigo": row['codigo'],
                "nome": row['nome'] or "Fundo",
                "valor": float(row['valor']),
                "percentual": round((row['valor'] / pl_total) * 100, 2),
                "tipo": "cota_fundo"
            })
        
        # Títulos públicos (BLC 1)
        sql = f"""
            SELECT tp_titpub as codigo, tp_ativo as nome, SUM(vl_merc_pos_final) as valor
            FROM cvm.cda_fi_blc_1
            WHERE cnpj_fundo = '{clean_cnpj}' AND dt_comptc = '{max_date}'
            GROUP BY tp_titpub, tp_ativo
            ORDER BY valor DESC
            LIMIT 20
        """
        df = self.db.read_sql(sql)
        for _, row in df.iterrows():
            all_assets.append({
                "codigo": row['codigo'],
                "nome": f"{row['codigo'] or ''} {row['nome'] or ''}".strip(),
                "valor": float(row['valor']),
                "percentual": round((row['valor'] / pl_total) * 100, 2),
                "tipo": "titulo_publico"
            })
        
        # Crédito privado (BLC 5)
        sql = f"""
            SELECT emissor as nome, cnpj_emissor as codigo, SUM(vl_merc_pos_final) as valor
            FROM cvm.cda_fi_blc_5
            WHERE cnpj_fundo = '{clean_cnpj}' AND dt_comptc = '{max_date}'
            GROUP BY emissor, cnpj_emissor
            ORDER BY valor DESC
            LIMIT 20
        """
        df = self.db.read_sql(sql)
        for _, row in df.iterrows():
            all_assets.append({
                "codigo": row['codigo'],
                "nome": row['nome'] or "Emissor",
                "valor": float(row['valor']),
                "percentual": round((row['valor'] / pl_total) * 100, 2),
                "tipo": "credito_privado"
            })
        
        # Ordenar por valor e retornar top N
        all_assets.sort(key=lambda x: -x['valor'])
        return all_assets[:limit]

    # ========================================================================
    # PEER GROUPS MANAGEMENT
    # ========================================================================

    def _ensure_peer_tables(self):
        """Cria as tabelas de peer groups se não existirem."""
        # Criar schema site se não existir
        self.db.execute_sql("CREATE SCHEMA IF NOT EXISTS site")
        
        # Tabela de grupos
        self.db.execute_sql("""
            CREATE TABLE IF NOT EXISTS site.peer_groups (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                description TEXT,
                category VARCHAR(100),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Tabela de fundos em grupos
        self.db.execute_sql("""
            CREATE TABLE IF NOT EXISTS site.peer_group_funds (
                id SERIAL PRIMARY KEY,
                group_id INTEGER REFERENCES site.peer_groups(id) ON DELETE CASCADE,
                cnpj_fundo VARCHAR(20) NOT NULL,
                apelido VARCHAR(255),
                peer_cat VARCHAR(100),
                descricao TEXT,
                comentario TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(group_id, cnpj_fundo)
            )
        """)

    def list_peer_groups(self) -> List[dict]:
        """Lista todos os peer groups."""
        self._ensure_peer_tables()
        sql = """
            SELECT g.id, g.name, g.description, g.category, g.created_at,
                   COUNT(f.id) as fund_count
            FROM site.peer_groups g
            LEFT JOIN site.peer_group_funds f ON f.group_id = g.id
            GROUP BY g.id, g.name, g.description, g.category, g.created_at
            ORDER BY g.name
        """
        df = self.db.read_sql(sql)
        return df.to_dict('records') if not df.empty else []

    def create_peer_group(self, name: str, description: str = None, category: str = None) -> dict:
        """Cria um novo peer group."""
        self._ensure_peer_tables()
        desc_sql = f"'{description}'" if description else "NULL"
        cat_sql = f"'{category}'" if category else "NULL"
        
        sql = f"""
            INSERT INTO site.peer_groups (name, description, category)
            VALUES ('{name}', {desc_sql}, {cat_sql})
            RETURNING id, name, description, category, created_at
        """
        print(f"DEBUG: Executing PeerGroup Insert: {sql}")
        df = self.db.read_sql(sql)
        print(f"DEBUG: Result DF Empty? {df.empty}")
        if not df.empty:
            return df.iloc[0].to_dict()
        return {"error": "Failed to create peer group"}

    def get_peer_group(self, group_id: int) -> Optional[dict]:
        """Retorna detalhes de um peer group com seus fundos."""
        self._ensure_peer_tables()
        
        # Buscar grupo
        sql = f"SELECT * FROM site.peer_groups WHERE id = {group_id}"
        df_group = self.db.read_sql(sql)
        
        if df_group.empty:
            return None
        
        group = df_group.iloc[0].to_dict()
        
        # Buscar fundos do grupo com dados do cadastro
        sql = f"""
            SELECT pgf.*, c.denom_social, c.gestor, c.classe, c.sit
            FROM site.peer_group_funds pgf
            LEFT JOIN cvm.cadastro c ON c.cnpj_fundo = pgf.cnpj_fundo AND c.dt_fim IS NULL
            WHERE pgf.group_id = {group_id}
            ORDER BY pgf.apelido, c.denom_social
        """
        df_funds = self.db.read_sql(sql)
        group['funds'] = df_funds.to_dict('records') if not df_funds.empty else []
        
        return group

    def delete_peer_group(self, group_id: int) -> bool:
        """Deleta um peer group."""
        self._ensure_peer_tables()
        sql = f"DELETE FROM site.peer_groups WHERE id = {group_id}"
        try:
            self.db.execute_sql(sql)
            return True
        except:
            return False

    def add_fund_to_peer_group(self, group_id: int, cnpj_fundo: str, 
                                apelido: str = None, peer_cat: str = None,
                                descricao: str = None, comentario: str = None) -> dict:
        """Adiciona um fundo a um peer group."""
        self._ensure_peer_tables()
        clean_cnpj = self._normalize_cnpj(cnpj_fundo)
        
        apelido_sql = f"'{apelido}'" if apelido else "NULL"
        peer_cat_sql = f"'{peer_cat}'" if peer_cat else "NULL"
        descricao_sql = f"'{descricao}'" if descricao else "NULL"
        comentario_sql = f"'{comentario}'" if comentario else "NULL"
        
        sql = f"""
            INSERT INTO site.peer_group_funds (group_id, cnpj_fundo, apelido, peer_cat, descricao, comentario)
            VALUES ({group_id}, '{clean_cnpj}', {apelido_sql}, {peer_cat_sql}, {descricao_sql}, {comentario_sql})
            ON CONFLICT (group_id, cnpj_fundo) DO UPDATE SET
                apelido = EXCLUDED.apelido,
                peer_cat = EXCLUDED.peer_cat,
                descricao = EXCLUDED.descricao,
                comentario = EXCLUDED.comentario,
                updated_at = CURRENT_TIMESTAMP
            RETURNING id, group_id, cnpj_fundo, apelido, peer_cat, descricao, comentario
        """
        df = self.db.read_sql(sql)
        if not df.empty:
            return df.iloc[0].to_dict()
        return {"error": "Failed to add fund to peer group"}

    def update_fund_in_peer_group(self, group_id: int, cnpj: str,
                                   apelido: str = None, peer_cat: str = None,
                                   descricao: str = None, comentario: str = None) -> dict:
        """Atualiza informações de um fundo em um peer group."""
        clean_cnpj = self._normalize_cnpj(cnpj)
        
        updates = []
        if apelido is not None:
            updates.append(f"apelido = '{apelido}'")
        if peer_cat is not None:
            updates.append(f"peer_cat = '{peer_cat}'")
        if descricao is not None:
            updates.append(f"descricao = '{descricao}'")
        if comentario is not None:
            updates.append(f"comentario = '{comentario}'")
        
        if not updates:
            return {"error": "Nothing to update"}
        
        updates.append("updated_at = CURRENT_TIMESTAMP")
        updates_sql = ", ".join(updates)
        
        sql = f"""
            UPDATE site.peer_group_funds
            SET {updates_sql}
            WHERE group_id = {group_id} AND cnpj_fundo = '{clean_cnpj}'
            RETURNING id, group_id, cnpj_fundo, apelido, peer_cat, descricao, comentario
        """
        df = self.db.read_sql(sql)
        if not df.empty:
            return df.iloc[0].to_dict()
        return {"error": "Fund not found in peer group"}

    def remove_fund_from_peer_group(self, group_id: int, cnpj: str) -> bool:
        """Remove um fundo de um peer group."""
        clean_cnpj = self._normalize_cnpj(cnpj)
        sql = f"DELETE FROM site.peer_group_funds WHERE group_id = {group_id} AND cnpj_fundo = '{clean_cnpj}'"
        try:
            self.db.execute_sql(sql)
            return True
        except:
            return False

