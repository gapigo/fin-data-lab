"""
Allocator Repository — queries para o dashboard de alocadores.

Consolida allocators_data.py, carteira.py, fluxo_veiculos.py, metrics.py
num único ponto de acesso a dados.
"""

import pandas as pd
from typing import Optional, List

from common.cache import temp
from common.postgresql import PostgresConnector

from .base import BaseRepository
from ..config import ALLOWED_CLIENTS, ALLOWED_PEERS


class AllocatorRepository(BaseRepository):

    # ── CARTEIRA ─────────────────────────────────────────────────────────

    @temp(ttl=86400)
    def load_carteira(self) -> pd.DataFrame:
        """Carteira filtrada: últimos 5 anos, peers principais, clientes permitidos."""
        clients_str = ", ".join(f"'{c}'" for c in ALLOWED_CLIENTS)
        peers_str = ", ".join(f"'{p}'" for p in ALLOWED_PEERS)

        sql = f"""
            SELECT dt_comptc, cnpj_fundo, denom_social, cliente,
                   cliente_segmentado, cnpj_fundo_cota, nm_fundo_cota,
                   gestor_cota, vl_merc_pos_final, peer
            FROM cvm.carteira
            WHERE dt_comptc > CURRENT_DATE - INTERVAL '5 years'
              AND peer IN ({peers_str})
              AND cliente <> gestor_cota
              AND cliente IN ({clients_str})
        """
        df = self.db.read_sql(sql)
        if not df.empty:
            df["dt_comptc"] = pd.to_datetime(df["dt_comptc"])
        return df

    # ── FLUXO ────────────────────────────────────────────────────────────

    @temp(ttl=86400)
    def load_fluxo(self) -> pd.DataFrame:
        sql = """
            SELECT cnpj_fundo, peer_ativo, dt_comptc, total_pos,
                   fluxo_6m, fluxo_12m, fluxo_24m,
                   fluxo_36m, fluxo_48m, fluxo_60m
            FROM alocadores.fluxo_veiculos
        """
        df = self.db.read_sql(sql)
        if not df.empty:
            df["dt_comptc"] = pd.to_datetime(df["dt_comptc"])
        return df

    # ── METRICS ──────────────────────────────────────────────────────────

    @temp(ttl=86400)
    def load_metrics(self) -> pd.DataFrame:
        try:
            sql = """
                SELECT cnpj_fundo, dt_comptc, janela,
                       ret, vol, sharpe, mdd as max_dd,
                       recovery_time, calmar, hit_ratio,
                       info_ratio, meta, bench
                FROM cvm.metrics
            """
            df = self.db.read_sql(sql)
            if not df.empty:
                df["dt_comptc"] = pd.to_datetime(df["dt_comptc"])
            return df
        except Exception as e:
            print(f"[AllocatorRepo] Aviso: metrics indisponível — {e}")
            return pd.DataFrame(columns=[
                "cnpj_fundo", "dt_comptc", "janela",
                "ret", "vol", "sharpe", "max_dd", "meta", "bench",
            ])

    # ── ATIVOS CARTEIRA ──────────────────────────────────────────────────

    @temp(ttl=86400)
    def load_ativos_carteira(self) -> pd.DataFrame:
        sql = """
            WITH depara AS (
                SELECT DISTINCT cliente, cliente_segmentado, cnpj_fundo
                FROM cvm.carteira
            )
            SELECT d.cliente, d.cliente_segmentado,
                   a.cnpj_fundo, a.tp_aplic, a.tp_ativo,
                   a.vl_merc_pos_final, a.nm_ativo, a.cd_ativo, a.tp_cd_ativo
            FROM cvm.ativos_carteira a
            LEFT JOIN depara d ON d.cnpj_fundo = a.cnpj_fundo
            WHERE a.dt_comptc = (SELECT MAX(dt_comptc) FROM cvm.ativos_carteira)
        """
        return self.db.read_sql(sql)

    # ── FUND-LEVEL METRICS (CTE avançada) ────────────────────────────────

    @temp(ttl=86400)
    def get_fund_metrics_cte(
        self,
        clients: List[str],
        segments: Optional[List[str]] = None,
        peers: Optional[List[str]] = None,
    ) -> pd.DataFrame:
        """Query CTE completa para métricas dos fundos investidos."""
        client_filter = f"AND carteira.cliente IN ({','.join(repr(c) for c in clients)})" if clients else ""
        segment_filter = f"AND carteira.cliente_segmentado IN ({','.join(repr(s) for s in segments)})" if segments else ""
        peer_filter = f"AND carteira.peer IN ({','.join(repr(p) for p in peers)})" if peers else ""

        sql = f"""
        WITH base_carteira AS (
            SELECT * FROM cvm.carteira
            WHERE dt_comptc > CURRENT_DATE - INTERVAL '5 years'
              AND peer IN ('Ações', 'Multimercado', 'Renda Fixa')
              AND cliente <> gestor_cota
              {client_filter} {segment_filter} {peer_filter}
        ),
        ultima_aberta AS (
            SELECT c.* FROM base_carteira c
            INNER JOIN (
                SELECT cnpj_fundo, max(dt_comptc) as dt_comptc
                FROM base_carteira
                WHERE dt_comptc > CURRENT_DATE - INTERVAL '7 months'
                GROUP BY cnpj_fundo
            ) m ON m.cnpj_fundo = c.cnpj_fundo AND m.dt_comptc = c.dt_comptc
        ),
        ultima_metrics AS (
            SELECT * FROM cvm.metrics
            WHERE dt_comptc = (SELECT max(dt_comptc) FROM cvm.metrics)
        )
        SELECT
            ua.cliente, ua.cliente_segmentado,
            ua.cnpj_fundo_cota, ua.nm_fundo_cota,
            um.janela, um.ret, um.vol,
            um.mdd as max_dd, um.sharpe, um.bench
        FROM ultima_aberta ua
        LEFT JOIN ultima_metrics um ON um.cnpj_fundo = ua.cnpj_fundo_cota
        WHERE um.janela IS NOT NULL
        """
        try:
            return self.db.read_sql(sql)
        except Exception as e:
            print(f"[AllocatorRepo] Erro na CTE de métricas: {e}")
            return pd.DataFrame()

    # ── QUERIES PARA ALLOCATORS SIMPLIFIED (cache JSON) ──────────────────

    @temp(ttl=86400)
    def load_flow_by_segment_full(self) -> pd.DataFrame:
        """Fluxo agregado por cliente+segmento+peer."""
        sql = """
            WITH depara AS (
                SELECT DISTINCT cliente, cliente_segmentado, cnpj_fundo
                FROM cvm.carteira
            )
            SELECT dep.cliente, dep.cliente_segmentado, fv.peer_ativo,
                   SUM(fluxo_6m) AS fluxo_6m, SUM(fluxo_12m) AS fluxo_12m,
                   SUM(fluxo_24m) AS fluxo_24m, SUM(fluxo_36m) AS fluxo_36m,
                   SUM(fluxo_48m) AS fluxo_48m, SUM(fluxo_60m) AS fluxo_60m
            FROM alocadores.fluxo_veiculos fv
            LEFT JOIN depara dep ON dep.cnpj_fundo = fv.cnpj_fundo
            GROUP BY dep.cliente, dep.cliente_segmentado, fv.peer_ativo
        """
        return self.db.read_sql(sql)

    @temp(ttl=86400)
    def load_historical_position(self) -> pd.DataFrame:
        sql = """
            SELECT cliente, cliente_segmentado, peer, dt_comptc,
                   SUM(vl_merc_pos_final) AS vl_merc_pos_final
            FROM cvm.carteira
            GROUP BY cliente, cliente_segmentado, peer, dt_comptc
        """
        return self.db.read_sql(sql)

    @temp(ttl=86400)
    def load_current_position(self) -> pd.DataFrame:
        sql = """
            SELECT dt_comptc, cliente, cliente_segmentado,
                   cnpj_fundo_cota, nm_fundo_cota, gestor_cota, peer,
                   SUM(vl_merc_pos_final) AS vl_merc_pos_final
            FROM cvm.carteira
            WHERE dt_comptc = '2025-06-30'
            GROUP BY dt_comptc, cliente, cliente_segmentado,
                     cnpj_fundo_cota, nm_fundo_cota, gestor_cota, peer
        """
        return self.db.read_sql(sql)

    @temp(ttl=86400)
    def load_fund_metrics_full(self) -> pd.DataFrame:
        """Métricas detalhadas para cache de allocators simplified."""
        sql = """
            WITH ultima_carteira_aberta AS (
                SELECT dt_comptc, cliente, cliente_segmentado,
                       cnpj_fundo_cota, nm_fundo_cota, gestor_cota, peer,
                       SUM(vl_merc_pos_final) AS vl_merc_pos_final
                FROM cvm.carteira
                WHERE dt_comptc = '2025-06-30'
                GROUP BY dt_comptc, cliente, cliente_segmentado,
                         cnpj_fundo_cota, nm_fundo_cota, gestor_cota, peer
            ),
            metrics AS (
                SELECT m.cnpj_fundo, m.janela,
                       m.ret, m.vol, m.mdd, m.recovery_time,
                       m.sharpe, m.calmar, m.hit_ratio, m.info_ratio
                FROM cvm.metrics m
                INNER JOIN (
                    SELECT cnpj_fundo, id_subclasse, MAX(dt_comptc) AS dt_comptc
                    FROM cvm.metrics GROUP BY cnpj_fundo, id_subclasse
                ) md ON md.cnpj_fundo = m.cnpj_fundo
                       AND md.id_subclasse = m.id_subclasse
                WHERE m.id_subclasse IN (SELECT DISTINCT id_subclasse FROM cvm.subs_principais)
                   OR m.id_subclasse LIKE '%MASTER%'
            )
            SELECT ua.cliente, ua.cliente_segmentado,
                   met.cnpj_fundo, ua.nm_fundo_cota, ua.peer,
                   ua.vl_merc_pos_final,
                   met.janela, met.ret, met.vol, met.mdd,
                   met.recovery_time, met.sharpe, met.calmar,
                   met.hit_ratio, met.info_ratio
            FROM ultima_carteira_aberta ua
            LEFT JOIN metrics met ON met.cnpj_fundo = ua.cnpj_fundo_cota
        """
        return self.db.read_sql(sql)

    @temp(ttl=86400)
    def load_available_options(self) -> pd.DataFrame:
        sql = """
            SELECT DISTINCT cliente, cliente_segmentado, peer
            FROM cvm.carteira
            WHERE cliente IS NOT NULL AND cliente_segmentado IS NOT NULL
            ORDER BY cliente, cliente_segmentado
        """
        return self.db.read_sql(sql)
