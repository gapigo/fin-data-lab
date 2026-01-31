
import sys
import os
from typing import List, Optional, Dict, Any
import pandas as pd
from datetime import date
import numpy as np

# Add project root to path to import common
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))


try:
    from .models import (
        FundSearchResponse, FundDetail, QuotaData, FundMetrics, FundComposition,
        AssetPosition, PortfolioBlock, PortfolioDetailed, FundRelationship, 
        FundStructure, TopAsset
    )
    from common.cache import cache, temp
    from .data_models import fund_details, fund_history, portfolio, peer_groups
except ImportError:
    from models import (
        FundSearchResponse, FundDetail, QuotaData, FundMetrics, FundComposition,
        AssetPosition, PortfolioBlock, PortfolioDetailed, FundRelationship, 
        FundStructure, TopAsset
    )
    from common.cache import cache, temp
    from data_models import fund_details, fund_history, portfolio, peer_groups

class DataService:
    def __init__(self):
        # DB access is now handled by models, but we might keep db for edge cases if needed.
        # Ideally, we don't need self.db anymore here, but let's keep it if we missed anything.
        pass

    def __repr__(self):
        return "DataServiceSingleton"

    def _normalize_cnpj(self, cnpj: str) -> str:
        """Helper to format CNPJ."""
        import re
        raw_cnpj = re.sub(r'\D', '', cnpj)
        target_cnpj = cnpj.strip()
        if len(raw_cnpj) == 14:
            target_cnpj = f"{raw_cnpj[:2]}.{raw_cnpj[2:5]}.{raw_cnpj[5:8]}/{raw_cnpj[8:12]}-{raw_cnpj[12:]}"
        return target_cnpj.replace("'", "''")

    def _val(self, v):
        """Returns None if value is NaN/NaT"""
        return v if pd.notnull(v) else None

    # ========================================================================
    # FUND SEARCH & DETAIL
    # ========================================================================
    
    @temp()
    def search_funds(self, query: str = None, limit: int = 50) -> List[FundSearchResponse]:
        df = fund_details.search_funds_data(query, limit)
        
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
            
        return results

    def suggest_funds(self, query: str) -> List[dict]:
        df = fund_details.suggest_funds_data(query)
        if df.empty:
            return []
        return df[['denom_social', 'cnpj_fundo']].to_dict('records')

    @temp()
    def get_fund_detail(self, cnpj: str) -> Optional[FundDetail]:
        # Try static cache
        cached = self._get_static_data(cnpj, "detail")
        if cached:
            # Reconstruct object
            try:
                return FundDetail(**cached)
            except:
                pass

        clean_cnpj = self._normalize_cnpj(cnpj)
        df = fund_details.get_fund_detail_data(clean_cnpj)
        
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
                peer_grupo=self._val(row.get('peer_grupo')),
                peer_detalhado=self._val(row.get('peer_detalhado'))
            )
            return detail
        except Exception as e:
            print(f"Error instantiating FundDetail: {e}")
            raise e

    # ========================================================================
    # FUND HISTORY (COTAS)
    # ========================================================================

    def _get_static_data(self, cnpj: str, type_key: str):
        """Helper to try to load from static JSON cache."""
        try:
            clean_cnpj = self._normalize_cnpj(cnpj)
            safe_cnpj = "".join(filter(str.isdigit, clean_cnpj))
            # Adjust path relative to service.py location or project root
            # Assuming running from api/ or root, let's look for api/static_cache
            # better to use absolute based on file
            base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            cache_file = os.path.join(base_dir, 'api', 'static_cache', f"profile_{safe_cnpj}.json")
            
            if os.path.exists(cache_file):
                with open(cache_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    return data.get(type_key)
        except Exception as e:
            # print(f"Cache miss or error: {e}")
            pass
        return None
    
    def _get_static_portfolio(self, cnpj: str, type_key: str):
        try:
            clean_cnpj = self._normalize_cnpj(cnpj)
            safe_cnpj = "".join(filter(str.isdigit, clean_cnpj))
            base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            cache_file = os.path.join(base_dir, 'api', 'static_cache', f"portfolio_{safe_cnpj}.json")
            if os.path.exists(cache_file):
                with open(cache_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    return data.get(type_key)
        except:
            pass
        return None

    @temp()
    def get_fund_history(self, cnpj: str, start_date: date = None) -> List[QuotaData]:
        clean_cnpj = self._normalize_cnpj(cnpj)
        df = fund_history.get_fund_history_raw(clean_cnpj, start_date)
        
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
            
        return history

    # ========================================================================
    # FUND METRICS (RENTABILIDADE)
    # ========================================================================

    @temp()
    def get_fund_metrics(self, cnpj: str) -> Optional[dict]:
        # Try static cache
        cached = self._get_static_data(cnpj, "metrics")
        if cached:
             return cached

        clean_cnpj = self._normalize_cnpj(cnpj)
        
        # Get raw data from model
        df = fund_history.get_fund_metrics_raw(clean_cnpj)
        
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

    @temp()
    def get_fund_composition(self, cnpj: str) -> Optional[dict]:
        # Try static cache
        cached = self._get_static_portfolio(cnpj, "composition")
        if cached:
             return cached

        clean_cnpj = self._normalize_cnpj(cnpj)
        
        # Check date
        df_date = portfolio.get_latest_composition_date(clean_cnpj)
        if df_date.empty or pd.isnull(df_date.iloc[0]['max_date']):
            return {"items": [], "date": None}
             
        max_date = df_date.iloc[0]['max_date']
        date_str = str(max_date)
        
        composition = {}
        
        # Block mapping: name -> block_num
        blocks = {
            'Títulos Públicos': 1,
            'Cotas de Fundos': 2,
            'Operações de Swap': 3,
            'Ações e Derivativos': 4,
            'Crédito Privado': 5,
            'Outros Créditos': 6,
            'Investimentos no Exterior': 7,
            'Demais Ativos': 8
        }
        
        for name, num in blocks.items():
            df = portfolio.get_portfolio_block_data(clean_cnpj, date_str, num)
            if not df.empty:
                val = df['vl_merc_pos_final'].sum()
                if val > 0:
                    composition[name] = float(val)

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
            "date": date_str
        }

    # ========================================================================
    # PORTFOLIO DETAILED (CARTEIRA COMPLETA POR BLOCO)
    # ========================================================================

    @temp()
    def get_portfolio_detailed(self, cnpj: str) -> Optional[dict]:
        """Retorna a carteira completa do fundo com todos os ativos por bloco"""
        # Try static cache
        cached = self._get_static_portfolio(cnpj, "detailed")
        if cached:
             return cached

        clean_cnpj = self._normalize_cnpj(cnpj)
        
        df_date = portfolio.get_latest_composition_date(clean_cnpj)
        if df_date.empty or pd.isnull(df_date.iloc[0]['max_date']):
            return None
        
        max_date = df_date.iloc[0]['max_date']
        date_str = str(max_date)
        pl_total = float(df_date.iloc[0]['pl'] or 1)
        
        blocos = []
        resumo = {}
        
        # --- BLC 1: Títulos Públicos ---
        df = portfolio.get_portfolio_block_data(clean_cnpj, date_str, 1)
        if not df.empty:
            # Aggregation logic specific to block types
            df_g = df.groupby(['tp_titpub', 'tp_ativo', 'dt_venc'])['vl_merc_pos_final'].sum().reset_index()
            df_g = df_g.sort_values('vl_merc_pos_final', ascending=False)
            
            ativos = []
            for _, row in df_g.iterrows():
                ativos.append({
                    "nome": f"{row['tp_titpub'] or ''} - {row['tp_ativo'] or 'Título'}".strip(' -'),
                    "valor": float(row['vl_merc_pos_final']),
                    "percentual": round((row['vl_merc_pos_final'] / pl_total) * 100, 2),
                    "dt_venc": str(row['dt_venc']) if pd.notnull(row['dt_venc']) else None
                })
            
            total_blc = df_g['vl_merc_pos_final'].sum()
            blocos.append({
                "tipo": "titulos_publicos",
                "nome_display": "Títulos Públicos",
                "total_valor": float(total_blc),
                "total_percentual": round((total_blc / pl_total) * 100, 2),
                "ativos": ativos
            })
            resumo["Títulos Públicos"] = round((total_blc / pl_total) * 100, 2)
        
        # --- BLC 2: Cotas de Fundos ---
        df = portfolio.get_portfolio_block_data(clean_cnpj, date_str, 2)
        if not df.empty:
            df_g = df.groupby(['nm_fundo_cota', 'cnpj_fundo_cota'])['vl_merc_pos_final'].sum().reset_index()
            df_g = df_g.sort_values('vl_merc_pos_final', ascending=False)
            
            ativos = []
            for _, row in df_g.iterrows():
                ativos.append({
                    "nome": row['nm_fundo_cota'] or "Fundo",
                    "valor": float(row['vl_merc_pos_final']),
                    "percentual": round((row['vl_merc_pos_final'] / pl_total) * 100, 2),
                    "cnpj_emissor": row['cnpj_fundo_cota']
                })
            
            total_blc = df_g['vl_merc_pos_final'].sum()
            blocos.append({
                "tipo": "cotas_fundos",
                "nome_display": "Cotas de Fundos",
                "total_valor": float(total_blc),
                "total_percentual": round((total_blc / pl_total) * 100, 2),
                "ativos": ativos
            })
            resumo["Cotas de Fundos"] = round((total_blc / pl_total) * 100, 2)

        # --- BLC 4: Ações/Derivativos ---
        df = portfolio.get_portfolio_block_data(clean_cnpj, date_str, 4)
        if not df.empty:
            df_g = df.groupby(['cd_ativo', 'ds_ativo'])['vl_merc_pos_final'].sum().reset_index()
            df_g = df_g.sort_values('vl_merc_pos_final', ascending=False)
            
            ativos = []
            for _, row in df_g.iterrows():
                ativos.append({
                    "nome": f"{row['cd_ativo'] or ''} - {row['ds_ativo'] or 'Ativo'}".strip(' -'),
                    "valor": float(row['vl_merc_pos_final']),
                    "percentual": round((row['vl_merc_pos_final'] / pl_total) * 100, 2),
                    "tipo": "acao"
                })
            
            total_blc = df_g['vl_merc_pos_final'].sum()
            blocos.append({
                "tipo": "acoes_derivativos",
                "nome_display": "Ações e Derivativos",
                "total_valor": float(total_blc),
                "total_percentual": round((total_blc / pl_total) * 100, 2),
                "ativos": ativos
            })
            resumo["Ações e Derivativos"] = round((total_blc / pl_total) * 100, 2)

        # --- BLC 5: Crédito Privado ---
        df = portfolio.get_portfolio_block_data(clean_cnpj, date_str, 5)
        if not df.empty:
            df_g = df.groupby(['emissor', 'cnpj_emissor', 'dt_venc'])['vl_merc_pos_final'].sum().reset_index()
            df_g = df_g.sort_values('vl_merc_pos_final', ascending=False)
            
            ativos = []
            for _, row in df_g.iterrows():
                ativos.append({
                    "nome": row['emissor'] or "Emissor",
                    "valor": float(row['vl_merc_pos_final']),
                    "percentual": round((row['vl_merc_pos_final'] / pl_total) * 100, 2),
                    "cnpj_emissor": row['cnpj_emissor'],
                    "dt_venc": str(row['dt_venc']) if pd.notnull(row['dt_venc']) else None
                })
            
            total_blc = df_g['vl_merc_pos_final'].sum()
            blocos.append({
                "tipo": "credito_privado",
                "nome_display": "Crédito Privado",
                "total_valor": float(total_blc),
                "total_percentual": round((total_blc / pl_total) * 100, 2),
                "ativos": ativos
            })
            resumo["Crédito Privado"] = round((total_blc / pl_total) * 100, 2)

        # --- BLC 7: Exterior ---
        df = portfolio.get_portfolio_block_data(clean_cnpj, date_str, 7)
        if not df.empty:
            df_g = df.groupby(['ds_ativo_exterior', 'pais'])['vl_merc_pos_final'].sum().reset_index()
            df_g = df_g.sort_values('vl_merc_pos_final', ascending=False)
            
            ativos = []
            for _, row in df_g.iterrows():
                ativos.append({
                    "nome": row['ds_ativo_exterior'] or "Ativo Exterior",
                    "valor": float(row['vl_merc_pos_final']),
                    "percentual": round((row['vl_merc_pos_final'] / pl_total) * 100, 2),
                    "extra": {"pais": row['pais']}
                })
            
            total_blc = df_g['vl_merc_pos_final'].sum()
            blocos.append({
                "tipo": "exterior",
                "nome_display": "Investimentos no Exterior",
                "total_valor": float(total_blc),
                "total_percentual": round((total_blc / pl_total) * 100, 2),
                "ativos": ativos
            })
            resumo["Exterior"] = round((total_blc / pl_total) * 100, 2)
        
        return {
            "cnpj_fundo": clean_cnpj,
            "dt_comptc": date_str,
            "vl_patrim_liq": pl_total,
            "blocos": blocos,
            "resumo": resumo
        }

    # ========================================================================
    # FUND STRUCTURE (RELACIONAMENTOS)
    # ========================================================================

    @temp()
    def get_fund_structure(self, cnpj: str) -> Optional[dict]:
        cached = self._get_static_data(cnpj, "structure")
        if cached:
             return cached

        clean_cnpj = self._normalize_cnpj(cnpj)
        
        data = fund_details.get_fund_structure_data(clean_cnpj)
        if not data:
            return None
            
        # Parse data frames to lists
        investe_em = []
        if not data['investe_em'].empty:
            for _, row in data['investe_em'].iterrows():
                investe_em.append({
                    "cnpj_fundo": clean_cnpj,
                    "cnpj_relacionado": row['cnpj_fundo_cota'],
                    "nome_relacionado": row['nm_fundo_cota'] or "Fundo",
                    "tipo_relacao": "INVESTE_EM",
                    "valor": float(row['valor']) if pd.notnull(row['valor']) else None
                })
                
        investido_por = []
        if not data['investido_por'].empty:
            for _, row in data['investido_por'].iterrows():
                investido_por.append({
                    "cnpj_fundo": clean_cnpj,
                    "cnpj_relacionado": row['cnpj_fundo'],
                    "nome_relacionado": row['denom_social'] or "Fundo",
                    "tipo_relacao": "INVESTIDO_POR",
                    "valor": float(row['valor']) if pd.notnull(row['valor']) else None
                })
        
        # Determine type
        tipo = "FI"
        if investe_em and not investido_por:
            tipo = "FIC"
        elif not investe_em and investido_por:
            tipo = "MASTER"
        
        return {
            "cnpj_fundo": clean_cnpj,
            "nome_fundo": data['nome_fundo'],
            "tipo": tipo,
            "investe_em": investe_em,
            "investido_por": investido_por,
            "espelho_de": data['espelho_de']
        }

    # ========================================================================
    # TOP ASSETS (MAIORES POSIÇÕES)
    # ========================================================================

    @temp()
    def get_top_assets(self, cnpj: str, limit: int = 10) -> List[dict]:
        """Retorna os maiores ativos da carteira"""
        clean_cnpj = self._normalize_cnpj(cnpj)
        
        df_date = portfolio.get_latest_composition_date(clean_cnpj)
        if df_date.empty or pd.isnull(df_date.iloc[0]['max_date']):
            return []
        
        date_str = str(df_date.iloc[0]['max_date'])
        pl_total = float(df_date.iloc[0]['pl'] or 1)
        
        all_assets = []
        
        # BLC 4 (Ações)
        df = portfolio.get_portfolio_block_data(clean_cnpj, date_str, 4)
        if not df.empty:
            df_g = df.groupby(['cd_ativo', 'ds_ativo'])['vl_merc_pos_final'].sum().reset_index()
            for _, row in df_g.iterrows():
                all_assets.append({
                    "codigo": row['cd_ativo'],
                    "nome": row['ds_ativo'] or row['cd_ativo'] or "Ativo",
                    "valor": float(row['vl_merc_pos_final']),
                    "percentual": round((row['vl_merc_pos_final'] / pl_total) * 100, 2),
                    "tipo": "acao"
                })
        
        # BLC 2 (Fundos)
        df = portfolio.get_portfolio_block_data(clean_cnpj, date_str, 2)
        if not df.empty:
            df_g = df.groupby(['nm_fundo_cota', 'cnpj_fundo_cota'])['vl_merc_pos_final'].sum().reset_index()
            for _, row in df_g.iterrows():
                all_assets.append({
                    "codigo": row['cnpj_fundo_cota'],
                    "nome": row['nm_fundo_cota'] or "Fundo",
                    "valor": float(row['vl_merc_pos_final']),
                    "percentual": round((row['vl_merc_pos_final'] / pl_total) * 100, 2),
                    "tipo": "cota_fundo"
                })

        # BLC 1 (Títulos Públicos)
        df = portfolio.get_portfolio_block_data(clean_cnpj, date_str, 1)
        if not df.empty:
            df_g = df.groupby(['tp_titpub', 'tp_ativo'])['vl_merc_pos_final'].sum().reset_index()
            for _, row in df_g.iterrows():
                all_assets.append({
                    "codigo": row['tp_titpub'],
                    "nome": f"{row['tp_titpub'] or ''} {row['tp_ativo'] or ''}".strip(),
                    "valor": float(row['vl_merc_pos_final']),
                    "percentual": round((row['vl_merc_pos_final'] / pl_total) * 100, 2),
                    "tipo": "titulo_publico"
                })

        # BLC 5 (Crédito Privado)
        df = portfolio.get_portfolio_block_data(clean_cnpj, date_str, 5)
        if not df.empty:
            df_g = df.groupby(['emissor', 'cnpj_emissor'])['vl_merc_pos_final'].sum().reset_index()
            for _, row in df_g.iterrows():
                all_assets.append({
                    "codigo": row['cnpj_emissor'],
                    "nome": row['emissor'] or "Emissor",
                    "valor": float(row['vl_merc_pos_final']),
                    "percentual": round((row['vl_merc_pos_final'] / pl_total) * 100, 2),
                    "tipo": "credito_privado"
                })
        
        # Sort and limit
        all_assets.sort(key=lambda x: -x['valor'])
        return all_assets[:limit]

    # ========================================================================
    # PEER GROUPS MANAGEMENT
    # ========================================================================

    def list_peer_groups(self) -> List[dict]:
        df = peer_groups.get_all_peer_groups()
        return df.to_dict('records') if not df.empty else []

    def create_peer_group(self, name: str, description: str = None, category: str = None) -> dict:
        gid = peer_groups.insert_peer_group(name, description, category)
        return {"id": gid, "name": name, "description": description, "category": category}

    def get_peer_group(self, group_id: int) -> Optional[dict]:
        df = peer_groups.get_peer_group_by_id(group_id)
        if df.empty:
            return None
            
        group = df.iloc[0].to_dict()
        
        # Get funds
        df_funds = peer_groups.get_peer_group_funds(group_id)
        funds = []
        if not df_funds.empty:
            funds = df_funds.to_dict('records')
            
        group['funds'] = funds
        return group

    def delete_peer_group(self, group_id: int) -> bool:
        peer_groups.delete_peer_group_record(group_id)
        return True

    def add_fund_to_peer_group(self, group_id: int, cnpj: str, apelido: str, peer_cat: str, desc: str, comment: str):
        clean_cnpj = self._normalize_cnpj(cnpj)
        fid = peer_groups.add_fund_to_peer_group_record(group_id, clean_cnpj, apelido, peer_cat, desc, comment)
        return {"id": fid, "cnpj_fundo": clean_cnpj}

    def update_fund_in_peer_group(self, group_id: int, cnpj: str, apelido: str, peer_cat: str, desc: str, comment: str):
        clean_cnpj = self._normalize_cnpj(cnpj)
        peer_groups.update_fund_peer_record(group_id, clean_cnpj, apelido, peer_cat, desc, comment)
        return {"status": "updated"}

    def remove_fund_from_peer_group(self, group_id: int, cnpj: str) -> bool:
        clean_cnpj = self._normalize_cnpj(cnpj)
        peer_groups.remove_fund_peer_record(group_id, clean_cnpj)
        return True
