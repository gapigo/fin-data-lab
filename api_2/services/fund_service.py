"""
Fund Service — lógica de negócio para fundos.

Orquestra: FundRepository → transformação → resposta.
"""

import pandas as pd
import numpy as np
from typing import List, Optional
from datetime import date

from ..repositories.fund_repo import FundRepository
from ..repositories.base import BaseRepository
from ..schemas.funds import (
    FundSearchResponse, FundDetail, QuotaData,
)


class FundService:
    def __init__(self, repo: FundRepository):
        self.repo = repo

    # shortcut
    _val = staticmethod(BaseRepository.val)
    _normalize = staticmethod(BaseRepository.normalize_cnpj)

    # ── SEARCH ───────────────────────────────────────────────────────────

    def search_funds(self, query: Optional[str] = None, limit: int = 50) -> List[FundSearchResponse]:
        df = self.repo.search(query, limit)
        return [
            FundSearchResponse(
                cnpj_fundo=row["cnpj_fundo"],
                denom_social=row["denom_social"],
                gestor=self._val(row.get("gestor")),
                classe=self._val(row.get("classe")),
                sit=self._val(row.get("sit")),
                dt_ini=self._val(row.get("dt_ini")),
            )
            for _, row in df.iterrows()
        ]

    def suggest_funds(self, query: str) -> List[dict]:
        df = self.repo.suggest(query)
        if df.empty:
            return []
        return df[["denom_social", "cnpj_fundo"]].to_dict("records")

    # ── DETAIL ───────────────────────────────────────────────────────────

    def get_fund_detail(self, cnpj: str) -> Optional[FundDetail]:
        clean = self._normalize(cnpj)
        df = self.repo.get_detail(clean)
        if df.empty:
            return None
        row = df.iloc[0]
        return FundDetail(
            cnpj_fundo=str(self._val(row["cnpj_fundo"]) or ""),
            denom_social=str(self._val(row["denom_social"]) or "SEM NOME"),
            gestor=self._val(row.get("gestor")),
            classe=self._val(row.get("classe")),
            sit=self._val(row.get("sit")),
            dt_ini=self._val(row.get("dt_ini")),
            publico_alvo=self._val(row.get("publico_alvo")),
            dt_reg=self._val(row.get("dt_reg")),
            auditor=self._val(row.get("auditor")),
            custodiante=self._val(row.get("custodiante")),
            controlador=self._val(row.get("controlador")),
            admin=self._val(row.get("admin")),
            taxa_adm=str(self._val(row.get("taxa_adm"))) if pd.notnull(row.get("taxa_adm")) else None,
            taxa_perf=str(self._val(row.get("vl_taxa_perfm"))) if pd.notnull(row.get("vl_taxa_perfm")) else None,
            benchmark=self._val(row.get("rentab_fundo")),
            condom=self._val(row.get("condom")),
            fundo_exclusivo=self._val(row.get("fundo_exclusivo")),
            fundo_cotas=self._val(row.get("fundo_cotas")),
            peer_grupo=self._val(row.get("peer_grupo")),
            peer_detalhado=self._val(row.get("peer_detalhado")),
        )

    # ── HISTORY ──────────────────────────────────────────────────────────

    def get_fund_history(self, cnpj: str, start_date: Optional[date] = None) -> List[QuotaData]:
        clean = self._normalize(cnpj)
        df = self.repo.get_history(clean, start_date)
        if df.empty:
            return []
        return [
            QuotaData(
                dt_comptc=row["dt_comptc"],
                vl_quota=row["vl_quota"],
                vl_patrim_liq=self._val(row.get("vl_patrim_liq")),
                vl_total=self._val(row.get("vl_total")),
                captc_dia=self._val(row.get("captc_dia")),
                resg_dia=self._val(row.get("resg_dia")),
                nr_cotst=self._val(row.get("nr_cotst")),
            )
            for _, row in df.iterrows()
        ]

    # ── METRICS ──────────────────────────────────────────────────────────

    def get_fund_metrics(self, cnpj: str) -> Optional[dict]:
        clean = self._normalize(cnpj)
        df = self.repo.get_quota_series(clean)
        if df.empty:
            return None

        df["dt_comptc"] = pd.to_datetime(df["dt_comptc"])
        df = df.set_index("dt_comptc")
        df["ret"] = df["vl_quota"].pct_change()

        df_m = df["vl_quota"].resample("ME").last()
        df_m_ret = df_m.pct_change()

        rent_mes, rent_ano = {}, {}
        for y in df_m_ret.index.year.unique():
            year_data = df_m_ret[df_m_ret.index.year == y]
            rent_mes[int(y)] = {
                m: round(v * 100, 2)
                for m, v in zip(year_data.index.month, year_data.values)
                if pd.notnull(v)
            }
            try:
                end_q = df_m[df_m.index.year == y].iloc[-1]
                prev = df_m[df_m.index.year == y - 1]
                start_q = prev.iloc[-1] if not prev.empty else df["vl_quota"][df.index.year == y].iloc[0]
                rent_ano[int(y)] = round(((end_q / start_q) - 1) * 100, 2)
            except Exception:
                rent_ano[int(y)] = 0.0

        first_q = df["vl_quota"].iloc[0]
        rent_accum = {}
        for y in df_m_ret.index.year.unique():
            try:
                end_q_y = df_m[df_m.index.year == y].iloc[-1]
                rent_accum[int(y)] = round(((end_q_y / first_q) - 1) * 100, 2)
            except Exception:
                pass

        vol_12m = 0.0
        if len(df) > 252:
            vol_12m = float(df["ret"].tail(252).std() * np.sqrt(252) * 100)

        sharpe = 0.0
        if vol_12m > 0 and len(df) > 252:
            ret_12m = (df["vl_quota"].iloc[-1] / df["vl_quota"].iloc[-252]) - 1
            sharpe = (ret_12m * 100 - 10) / vol_12m

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
                "worst_month": round(df_m_ret.min() * 100, 2) if not df_m_ret.empty else 0,
            },
        }

    # ── COMPOSITION ──────────────────────────────────────────────────────

    def get_fund_composition(self, cnpj: str) -> Optional[dict]:
        clean = self._normalize(cnpj)
        df_date = self.repo.get_latest_portfolio_date(clean)
        if df_date.empty or pd.isnull(df_date.iloc[0]["max_date"]):
            return {"items": [], "date": None}

        max_date = str(df_date.iloc[0]["max_date"])
        blocks = {
            "Títulos Públicos": 1, "Cotas de Fundos": 2,
            "Operações de Swap": 3, "Ações e Derivativos": 4,
            "Crédito Privado": 5, "Outros Créditos": 6,
            "Investimentos no Exterior": 7, "Demais Ativos": 8,
        }
        composition = {}
        for name, num in blocks.items():
            df = self.repo.get_portfolio_block(clean, max_date, num)
            if not df.empty:
                val = df["vl_merc_pos_final"].sum()
                if val > 0:
                    composition[name] = float(val)

        total = sum(composition.values()) or 1
        items = [
            {"name": n, "value": v, "percentage": round((v / total) * 100, 2)}
            for n, v in sorted(composition.items(), key=lambda x: -x[1])
        ]
        return {"items": items, "date": max_date}

    # ── PORTFOLIO DETAILED ───────────────────────────────────────────────

    def get_portfolio_detailed(self, cnpj: str) -> Optional[dict]:
        clean = self._normalize(cnpj)
        df_date = self.repo.get_latest_portfolio_date(clean)
        if df_date.empty or pd.isnull(df_date.iloc[0]["max_date"]):
            return None

        max_date = str(df_date.iloc[0]["max_date"])
        pl_total = float(df_date.iloc[0]["pl"] or 1)

        blocos, resumo = [], {}
        block_configs = [
            (1, "titulos_publicos", "Títulos Públicos", ["tp_titpub", "tp_ativo", "dt_venc"]),
            (2, "cotas_fundos", "Cotas de Fundos", ["nm_fundo_cota", "cnpj_fundo_cota"]),
            (4, "acoes_derivativos", "Ações e Derivativos", ["cd_ativo", "ds_ativo"]),
            (5, "credito_privado", "Crédito Privado", ["emissor", "cnpj_emissor", "dt_venc"]),
            (7, "exterior", "Investimentos no Exterior", ["ds_ativo_exterior", "pais"]),
        ]

        for blk_num, tipo, display, group_cols in block_configs:
            df = self.repo.get_portfolio_block(clean, max_date, blk_num)
            if df.empty:
                continue
            valid_cols = [c for c in group_cols if c in df.columns]
            if not valid_cols:
                continue
            df_g = df.groupby(valid_cols)["vl_merc_pos_final"].sum().reset_index()
            df_g = df_g.sort_values("vl_merc_pos_final", ascending=False)

            ativos = []
            for _, r in df_g.iterrows():
                nome_parts = [str(r.get(c, "")) for c in valid_cols[:2] if pd.notnull(r.get(c, ""))]
                ativos.append({
                    "nome": " - ".join(nome_parts).strip(" -") or "Ativo",
                    "valor": float(r["vl_merc_pos_final"]),
                    "percentual": round((r["vl_merc_pos_final"] / pl_total) * 100, 2),
                })

            total_blc = df_g["vl_merc_pos_final"].sum()
            blocos.append({
                "tipo": tipo, "nome_display": display,
                "total_valor": float(total_blc),
                "total_percentual": round((total_blc / pl_total) * 100, 2),
                "ativos": ativos,
            })
            resumo[display] = round((total_blc / pl_total) * 100, 2)

        return {
            "cnpj_fundo": clean, "dt_comptc": max_date,
            "vl_patrim_liq": pl_total, "blocos": blocos, "resumo": resumo,
        }

    # ── STRUCTURE ────────────────────────────────────────────────────────

    def get_fund_structure(self, cnpj: str) -> Optional[dict]:
        clean = self._normalize(cnpj)
        nome = self.repo.get_fund_name(clean)
        max_date = self.repo.get_blc2_max_date(clean)

        investe_em, investido_por = [], []
        if max_date:
            df_in = self.repo.get_invests_in(clean, max_date)
            for _, r in df_in.iterrows():
                investe_em.append({
                    "cnpj_fundo": clean,
                    "cnpj_relacionado": r["cnpj_fundo_cota"],
                    "nome_relacionado": r["nm_fundo_cota"] or "Fundo",
                    "tipo_relacao": "INVESTE_EM",
                    "valor": float(r["valor"]) if pd.notnull(r["valor"]) else None,
                })

            df_by = self.repo.get_invested_by(clean)
            for _, r in df_by.iterrows():
                investido_por.append({
                    "cnpj_fundo": clean,
                    "cnpj_relacionado": r["cnpj_fundo"],
                    "nome_relacionado": r["denom_social"] or "Fundo",
                    "tipo_relacao": "INVESTIDO_POR",
                    "valor": float(r["valor"]) if pd.notnull(r["valor"]) else None,
                })

        tipo = "FI"
        if investe_em and not investido_por:
            tipo = "FIC"
        elif not investe_em and investido_por:
            tipo = "MASTER"

        return {
            "cnpj_fundo": clean, "nome_fundo": nome, "tipo": tipo,
            "investe_em": investe_em, "investido_por": investido_por,
            "espelho_de": self.repo.get_mirror(clean),
        }

    # ── TOP ASSETS ───────────────────────────────────────────────────────

    def get_top_assets(self, cnpj: str, limit: int = 10) -> List[dict]:
        clean = self._normalize(cnpj)
        df_date = self.repo.get_latest_portfolio_date(clean)
        if df_date.empty or pd.isnull(df_date.iloc[0]["max_date"]):
            return []

        dt = str(df_date.iloc[0]["max_date"])
        pl = float(df_date.iloc[0]["pl"] or 1)
        all_assets: list = []

        block_configs = [
            (4, ["cd_ativo", "ds_ativo"], "acao"),
            (2, ["nm_fundo_cota", "cnpj_fundo_cota"], "cota_fundo"),
            (1, ["tp_titpub", "tp_ativo"], "titulo_publico"),
            (5, ["emissor", "cnpj_emissor"], "credito_privado"),
        ]

        for blk, cols, tipo in block_configs:
            df = self.repo.get_portfolio_block(clean, dt, blk)
            if df.empty:
                continue
            valid_cols = [c for c in cols if c in df.columns]
            if not valid_cols:
                continue
            df_g = df.groupby(valid_cols)["vl_merc_pos_final"].sum().reset_index()
            for _, r in df_g.iterrows():
                code = str(r.get(valid_cols[0], ""))
                name = str(r.get(valid_cols[-1], code) or code)
                all_assets.append({
                    "codigo": code, "nome": name,
                    "valor": float(r["vl_merc_pos_final"]),
                    "percentual": round((r["vl_merc_pos_final"] / pl) * 100, 2),
                    "tipo": tipo,
                })

        all_assets.sort(key=lambda x: -x["valor"])
        return all_assets[:limit]
