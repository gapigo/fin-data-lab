"""
Allocator Service — lógica de negócio para dashboard de alocadores.

Consolida allocators_service.py (769 linhas) e allocators.py (361 linhas)
em uma implementação única e limpa.

Tabs:
1. Fluxo e Posição
2. Performance
3. Alocação
"""

import pandas as pd
import numpy as np
from typing import Optional, Dict, Any, List

from ..repositories.allocator_repo import AllocatorRepository


class AllocatorService:
    def __init__(self, repo: AllocatorRepository):
        self.repo = repo

    # ── FILTERS ──────────────────────────────────────────────────────────

    def get_filters(self) -> Dict[str, Any]:
        df = self.repo.load_carteira()
        if df.empty:
            return {"clients": [], "segments": [], "segments_by_client": {}, "peers": list(("Ações", "Multimercado", "Renda Fixa"))}

        clients = sorted(df["cliente"].dropna().unique().tolist())
        segments = sorted(df["cliente_segmentado"].dropna().unique().tolist())
        pairs = df[["cliente", "cliente_segmentado"]].drop_duplicates()

        sbc: dict = {}
        for _, r in pairs.iterrows():
            c, s = r["cliente"], r["cliente_segmentado"]
            if c and s:
                sbc.setdefault(c, []).append(s)
        for c in sbc:
            sbc[c] = sorted(set(sbc[c]))

        return {
            "clients": clients,
            "segments": segments,
            "segments_by_client": sbc,
            "peers": ["Ações", "Multimercado", "Renda Fixa"],
        }

    # ── TAB 1: FLUXO E POSIÇÃO ───────────────────────────────────────────

    def get_flow_position(
        self,
        client: Optional[str] = None,
        segment: Optional[str] = None,
        peer: Optional[str] = None,
        window: int = 12,
    ) -> Dict[str, Any]:
        df_cart = self._filtered(client, segment, peer)
        df_flow = self.repo.load_fluxo()

        # Posição mensal
        monthly = []
        if not df_cart.empty:
            agg = df_cart.groupby("dt_comptc")["vl_merc_pos_final"].sum().reset_index().sort_values("dt_comptc")
            monthly = [
                {"month": r["dt_comptc"].strftime("%b/%y"), "date": r["dt_comptc"].isoformat(),
                 "position": float(r["vl_merc_pos_final"]) if pd.notnull(r["vl_merc_pos_final"]) else 0}
                for _, r in agg.iterrows()
            ]

        # Fluxo por segmento
        seg_flow = []
        if not df_cart.empty and not df_flow.empty:
            cnpjs = df_cart["cnpj_fundo"].unique()
            df_fl = df_flow[df_flow["cnpj_fundo"].isin(cnpjs)]
            df_fl = df_fl.sort_values("dt_comptc").groupby("cnpj_fundo").tail(1)
            df_j = df_fl.merge(
                df_cart[["cnpj_fundo", "cliente_segmentado"]].drop_duplicates(),
                on="cnpj_fundo", how="left",
            )
            col = f"fluxo_{window}m"
            if col in df_j.columns:
                agg = df_j.groupby("cliente_segmentado")[col].sum().reset_index().sort_values(col, ascending=False)
                seg_flow = [
                    {"segment": r["cliente_segmentado"], "flow": float(r[col]) if pd.notnull(r[col]) else 0}
                    for _, r in agg.iterrows()
                ]

        return {"monthly_position": monthly, "segment_flow": seg_flow, "selected_window": window}

    # ── TAB 2: PERFORMANCE ───────────────────────────────────────────────

    def get_performance(
        self,
        client: Optional[str] = None,
        segment: Optional[str] = None,
        peer: Optional[str] = None,
    ) -> Dict[str, Any]:
        df_cart = self._filtered(client, segment, peer)
        df_flow = self.repo.load_fluxo()
        df_metrics = self.repo.load_metrics()

        flow_by_segment = self._calc_flow_by_segment(df_cart, df_flow)
        returns_by_window = self._calc_returns_by_window(df_cart, df_metrics)
        boxplots = self._calc_boxplots(df_cart, df_metrics)
        scatter = self._calc_scatter(df_cart, df_metrics)
        perf_table = self._calc_perf_table(df_cart, df_metrics)

        # Fund detailed metrics via CTE
        fund_detailed = []
        if not df_cart.empty:
            clients = df_cart["cliente"].unique().tolist()
            segments = df_cart["cliente_segmentado"].dropna().unique().tolist()
            peers = df_cart["peer"].unique().tolist()
            df_cte = self.repo.get_fund_metrics_cte(clients, segments, peers)
            if not df_cte.empty:
                for _, r in df_cte.iterrows():
                    fund_detailed.append({
                        "client": r["cliente"], "segment": r["cliente_segmentado"],
                        "fund_cnpj": r["cnpj_fundo_cota"],
                        "fund_name": r["nm_fundo_cota"] if pd.notnull(r["nm_fundo_cota"]) else r["cnpj_fundo_cota"],
                        "window": r["janela"],
                        "ret": float(r["ret"]) if pd.notnull(r["ret"]) else None,
                        "vol": float(r["vol"]) if pd.notnull(r["vol"]) else None,
                        "max_dd": float(r["max_dd"]) if pd.notnull(r["max_dd"]) else None,
                        "sharpe": float(r["sharpe"]) if pd.notnull(r["sharpe"]) else None,
                        "bench": float(r["bench"]) if pd.notnull(r["bench"]) else None,
                    })

        return {
            "flow_by_segment": flow_by_segment,
            "returns_by_window": returns_by_window,
            "boxplots": boxplots,
            "scatter_12m": scatter,
            "fund_performance": perf_table,
            "fund_detailed_metrics": fund_detailed,
        }

    # ── TAB 3: ALOCAÇÃO ─────────────────────────────────────────────────

    def get_allocation(
        self,
        client: Optional[str] = None,
        segment: Optional[str] = None,
        peer: Optional[str] = None,
    ) -> Dict[str, Any]:
        df_cart = self._filtered(client, segment, peer)
        df_flow = self.repo.load_fluxo()

        flow_by_segment = self._calc_flow_by_segment(df_cart, df_flow)
        evo = self._calc_monthly_evo(df_cart)
        month_diff = self._calc_month_diff(df_cart)
        snapshot = self._calc_snapshot(df_cart)
        pie = self._calc_pie(df_cart)

        return {
            "flow_by_window": flow_by_segment,
            "evolution": evo.get("data", []),
            "gestores": evo.get("gestores", []),
            "month_difference": month_diff,
            "portfolio_snapshot": snapshot,
            "pie_data": pie,
        }

    # ── PRIVATE HELPERS ──────────────────────────────────────────────────

    def _filtered(self, client, segment, peer) -> pd.DataFrame:
        df = self.repo.load_carteira()
        if df.empty:
            return df
        mask = pd.Series(True, index=df.index)
        if client:
            mask &= df["cliente"] == client
        if segment and segment != "all":
            mask &= df["cliente_segmentado"] == segment
        if peer and peer != "all":
            mask &= df["peer"] == peer
        return df[mask].copy()

    def _calc_flow_by_segment(self, df_cart: pd.DataFrame, df_flow: pd.DataFrame) -> List[dict]:
        if df_cart.empty or df_flow.empty:
            return []
        cnpjs = df_cart["cnpj_fundo"].unique()
        df_fl = df_flow[df_flow["cnpj_fundo"].isin(cnpjs)].sort_values("dt_comptc").groupby("cnpj_fundo").tail(1)
        df_j = df_fl.merge(df_cart[["cnpj_fundo", "cliente_segmentado"]].drop_duplicates(), on="cnpj_fundo", how="left")
        result = []
        for w in [6, 12, 24, 36, 48, 60]:
            col = f"fluxo_{w}m"
            if col in df_j.columns:
                total = df_j[col].sum()
                result.append({"window": f"{w}M", "value": float(total) if pd.notnull(total) else 0})
        return result

    def _calc_returns_by_window(self, df_cart: pd.DataFrame, df_metrics: pd.DataFrame) -> List[dict]:
        if df_cart.empty or df_metrics.empty:
            return []
        max_dt = df_cart["dt_comptc"].max()
        df_l = df_cart[df_cart["dt_comptc"] == max_dt]
        cnpjs = df_l["cnpj_fundo_cota"].unique()
        df_mf = df_metrics[df_metrics["cnpj_fundo"].isin(cnpjs)]
        result = []
        for janela in ["6M", "12M", "24M", "36M"]:
            dfw = df_mf[df_mf["janela"] == janela]
            if dfw.empty:
                continue
            df_wp = dfw.merge(
                df_l[["cnpj_fundo_cota", "vl_merc_pos_final"]].groupby("cnpj_fundo_cota").sum().reset_index(),
                left_on="cnpj_fundo", right_on="cnpj_fundo_cota", how="left",
            )
            total = df_wp["vl_merc_pos_final"].sum()
            if total > 0:
                wret = (df_wp["ret"] * df_wp["vl_merc_pos_final"]).sum() / total
                result.append({"window": janela, "value": float(wret) if pd.notnull(wret) else 0})
        return result

    def _calc_boxplots(self, df_cart: pd.DataFrame, df_metrics: pd.DataFrame) -> Dict[str, list]:
        if df_cart.empty or df_metrics.empty:
            return {"ret": [], "vol": [], "max_dd": []}
        last7m = pd.Timestamp.now() - pd.DateOffset(months=7)
        active = df_cart[df_cart["dt_comptc"] > last7m]
        if active.empty:
            return {"ret": [], "vol": [], "max_dd": []}
        latest = active.groupby("cnpj_fundo")["dt_comptc"].max().reset_index()
        ultima = df_cart.merge(latest, on=["cnpj_fundo", "dt_comptc"])
        cnpjs = ultima["cnpj_fundo_cota"].unique()
        df_mf = df_metrics[df_metrics["cnpj_fundo"].isin(cnpjs)]

        out: Dict[str, list] = {"ret": [], "vol": [], "max_dd": []}
        for janela in ["6M", "12M", "24M", "36M", "48M", "60M"]:
            dfw = df_mf[df_mf["janela"] == janela]
            if dfw.empty:
                continue
            for metric, key in [("ret", "ret"), ("vol", "vol"), ("max_dd", "max_dd")]:
                vals = dfw[metric].dropna()
                if len(vals) > 0:
                    q = vals.quantile([0, 0.25, 0.5, 0.75, 1.0]).tolist()
                    out[key].append({"window": janela, "min": q[0], "q1": q[1], "median": q[2], "q3": q[3], "max": q[4]})
        return out

    def _calc_scatter(self, df_cart: pd.DataFrame, df_metrics: pd.DataFrame) -> List[dict]:
        if df_cart.empty or df_metrics.empty:
            return []
        last7m = pd.Timestamp.now() - pd.DateOffset(months=7)
        active = df_cart[df_cart["dt_comptc"] > last7m]
        if active.empty:
            return []
        latest = active.groupby("cnpj_fundo")["dt_comptc"].max().reset_index()
        df_l = df_cart.merge(latest, on=["cnpj_fundo", "dt_comptc"])
        df12 = df_metrics[df_metrics["janela"] == "12M"]
        df_s = df12.merge(
            df_l[["cnpj_fundo_cota", "nm_fundo_cota", "vl_merc_pos_final"]]
                .groupby(["cnpj_fundo_cota", "nm_fundo_cota"]).sum().reset_index(),
            left_on="cnpj_fundo", right_on="cnpj_fundo_cota", how="inner",
        ).dropna(subset=["vol", "ret", "vl_merc_pos_final"]).nlargest(50, "vl_merc_pos_final")
        return [
            {"x": float(r["vol"]), "y": float(r["ret"]), "z": float(r["vl_merc_pos_final"]) / 1e6,
             "name": r["nm_fundo_cota"][:40] if pd.notnull(r["nm_fundo_cota"]) else "N/A"}
            for _, r in df_s.iterrows()
        ]

    def _calc_perf_table(self, df_cart: pd.DataFrame, df_metrics: pd.DataFrame) -> Dict[str, Any]:
        if df_cart.empty or df_metrics.empty:
            return {"funds": [], "selected_fund": None}
        max_dt = df_cart["dt_comptc"].max()
        df_l = df_cart[df_cart["dt_comptc"] == max_dt]
        df_top = (
            df_l.groupby(["cnpj_fundo_cota", "nm_fundo_cota"])
            .agg({"vl_merc_pos_final": "sum"}).reset_index()
            .nlargest(20, "vl_merc_pos_final")
        )
        kinea = df_top[df_top["nm_fundo_cota"].str.contains("KINEA", case=False, na=False)]
        selected = kinea.iloc[0]["cnpj_fundo_cota"] if not kinea.empty else (
            df_top.iloc[0]["cnpj_fundo_cota"] if not df_top.empty else None)

        funds = []
        for _, fr in df_top.iterrows():
            cnpj_c = fr["cnpj_fundo_cota"]
            dfm = df_metrics[df_metrics["cnpj_fundo"] == cnpj_c]
            windows_data = {}
            for j in ["6M", "12M", "24M", "36M"]:
                dfj = dfm[dfm["janela"] == j]
                if not dfj.empty:
                    ret = dfj["ret"].iloc[0]
                    meta = dfj["meta"].iloc[0] if "meta" in dfj.columns else None
                    bench = dfj["bench"].iloc[0] if "bench" in dfj.columns else None
                    status = "gray"
                    if pd.notnull(ret):
                        if pd.notnull(meta) and ret >= meta:
                            status = "green"
                        elif pd.notnull(bench) and ret >= bench:
                            status = "yellow"
                        else:
                            status = "red"
                    windows_data[j] = {
                        "ret": round(float(ret), 2) if pd.notnull(ret) else None,
                        "meta": round(float(meta), 2) if pd.notnull(meta) else None,
                        "bench": round(float(bench), 2) if pd.notnull(bench) else None,
                        "status": status,
                    }
            funds.append({
                "cnpj": cnpj_c,
                "name": fr["nm_fundo_cota"][:50] if pd.notnull(fr["nm_fundo_cota"]) else "N/A",
                "windows": windows_data,
            })
        return {"funds": funds, "selected_fund": selected}

    def _calc_monthly_evo(self, df_cart: pd.DataFrame) -> Dict[str, Any]:
        if df_cart.empty:
            return {"data": [], "gestores": []}
        agg = df_cart.groupby(["dt_comptc", "gestor_cota"])["vl_merc_pos_final"].sum().reset_index()
        pivot = agg.pivot(index="dt_comptc", columns="gestor_cota", values="vl_merc_pos_final").fillna(0)
        top = pivot.sum().nlargest(10).index.tolist()
        data = []
        for dt in sorted(pivot.index):
            row = {"month": dt.strftime("%b/%y"), "date": dt.isoformat()}
            for g in top:
                row[g] = float(pivot.loc[dt, g]) if g in pivot.columns else 0
            data.append(row)
        return {"data": data, "gestores": top}

    def _calc_month_diff(self, df_cart: pd.DataFrame) -> List[dict]:
        if df_cart.empty:
            return []
        agg = df_cart.groupby(["dt_comptc", "gestor_cota"])["vl_merc_pos_final"].sum().reset_index()
        top = agg.groupby("gestor_cota")["vl_merc_pos_final"].sum().nlargest(10).index.tolist()
        result = []
        for g in top:
            dfg = agg[agg["gestor_cota"] == g].sort_values("dt_comptc")
            dfg["diff"] = dfg["vl_merc_pos_final"].diff()
            for _, r in dfg.tail(12).iterrows():
                result.append({
                    "gestor": g, "month": r["dt_comptc"].strftime("%b/%y"),
                    "difference": float(r["diff"]) if pd.notnull(r["diff"]) else 0,
                })
        return result

    def _calc_snapshot(self, df_cart: pd.DataFrame) -> List[dict]:
        if df_cart.empty:
            return []
        max_dt = df_cart["dt_comptc"].max()
        df_l = df_cart[df_cart["dt_comptc"] == max_dt]
        snap = (
            df_l.groupby(["cnpj_fundo_cota", "nm_fundo_cota", "peer", "gestor_cota"])
            .agg({"vl_merc_pos_final": "sum"}).reset_index()
            .sort_values("vl_merc_pos_final", ascending=False).head(20)
        )
        total = snap["vl_merc_pos_final"].sum()
        return [
            {
                "symbol": (r["peer"] or "N/A")[:3].upper(),
                "name": (r["nm_fundo_cota"] or r["cnpj_fundo_cota"])[:50],
                "gestor": (r["gestor_cota"] or "N/A")[:30],
                "peer": r["peer"] or "N/A",
                "pl": float(r["vl_merc_pos_final"]),
                "percentage": round(r["vl_merc_pos_final"] / total * 100, 2) if total else 0,
            }
            for _, r in snap.iterrows()
        ]

    def _calc_pie(self, df_cart: pd.DataFrame) -> List[dict]:
        if df_cart.empty:
            return []
        max_dt = df_cart["dt_comptc"].max()
        df_l = df_cart[df_cart["dt_comptc"] == max_dt]
        pie = df_l.groupby("gestor_cota")["vl_merc_pos_final"].sum().reset_index().sort_values("vl_merc_pos_final", ascending=False).head(10)
        total = pie["vl_merc_pos_final"].sum()
        return [
            {"name": r["gestor_cota"][:30], "value": round(r["vl_merc_pos_final"] / total * 100, 2) if total else 0,
             "pl": float(r["vl_merc_pos_final"])}
            for _, r in pie.iterrows()
        ]
