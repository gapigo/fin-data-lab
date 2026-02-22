"""
Fund Repository — todas as queries de fundos num só lugar.

Cada método é uma query. Cache é controlado pelo decorator @temp.
Não há lógica de negócio aqui — apenas acesso a dados.
"""

import pandas as pd
from typing import Optional
from datetime import date

from common.cache import temp
from common.postgresql import PostgresConnector

from .base import BaseRepository


class FundRepository(BaseRepository):

    # ── SEARCH ───────────────────────────────────────────────────────────

    @temp()
    def search(self, query: Optional[str], limit: int = 50) -> pd.DataFrame:
        sql = """
            SELECT cnpj_fundo, denom_social, gestor, classe, sit, dt_ini
            FROM cvm.cadastro
            WHERE sit = 'EM FUNCIONAMENTO NORMAL'
        """
        if query:
            q = query.replace("'", "''")
            sql += f" AND (denom_social ILIKE '%%{q}%%' OR cnpj_fundo ILIKE '%%{q}%%')"
        sql += f" ORDER BY dt_ini DESC LIMIT {limit}"
        return self.db.read_sql(sql)

    @temp()
    def suggest(self, query: str) -> pd.DataFrame:
        q = query.replace("'", "''").upper()
        sql = f"""
            SELECT DISTINCT denom_social, cnpj_fundo
            FROM cvm.cadastro
            WHERE dt_fim IS NULL AND denom_social ILIKE '%%{q}%%'
            LIMIT 10
        """
        return self.db.read_sql(sql)

    # ── DETAIL ───────────────────────────────────────────────────────────

    @temp()
    def get_detail(self, cnpj: str) -> pd.DataFrame:
        sql = f"""
            SELECT c.*, p.peer_grupo, p.peer_detalhado
            FROM cvm.cadastro c
            LEFT JOIN cvm.peer p ON c.cnpj_fundo = p.cnpj_fundo
            WHERE c.cnpj_fundo = '{cnpj}' AND c.dt_fim IS NULL
            LIMIT 1
        """
        return self.db.read_sql(sql)

    # ── HISTORY ──────────────────────────────────────────────────────────

    @temp()
    def get_history(self, cnpj: str, start_date: Optional[date] = None) -> pd.DataFrame:
        sql = f"""
            SELECT dt_comptc, vl_quota, vl_patrim_liq, vl_total,
                   captc_dia, resg_dia, nr_cotst
            FROM cvm.cotas
            WHERE cnpj_fundo = '{cnpj}'
        """
        if start_date:
            sql += f" AND dt_comptc >= '{start_date}'"
        sql += " ORDER BY dt_comptc ASC"
        return self.db.read_sql(sql)

    @temp()
    def get_quota_series(self, cnpj: str) -> pd.DataFrame:
        """Série de cotas para cálculo de métricas."""
        sql = f"""
            SELECT dt_comptc, vl_quota
            FROM cvm.cotas
            WHERE cnpj_fundo = '{cnpj}'
            ORDER BY dt_comptc ASC
        """
        return self.db.read_sql(sql)

    # ── PORTFOLIO ────────────────────────────────────────────────────────

    @temp()
    def get_latest_portfolio_date(self, cnpj: str) -> pd.DataFrame:
        sql = f"""
            SELECT MAX(dt_comptc) as max_date, MAX(vl_patrim_liq) as pl
            FROM cvm.cda_fi_pl
            WHERE cnpj_fundo = '{cnpj}'
        """
        return self.db.read_sql(sql)

    @temp()
    def get_portfolio_block(self, cnpj: str, dt: str, block: int) -> pd.DataFrame:
        sql = f"""
            SELECT *
            FROM cvm.cda_fi_blc_{block}
            WHERE cnpj_fundo = '{cnpj}' AND dt_comptc = '{dt}'
        """
        return self.db.read_sql(sql)

    # ── STRUCTURE ────────────────────────────────────────────────────────

    @temp()
    def get_fund_name(self, cnpj: str) -> str:
        sql = f"""
            SELECT denom_social FROM cvm.cadastro
            WHERE cnpj_fundo = '{cnpj}' AND dt_fim IS NULL LIMIT 1
        """
        df = self.db.read_sql(sql)
        return df["denom_social"].iloc[0] if not df.empty else "Fundo"

    @temp()
    def get_invests_in(self, cnpj: str, max_date: str) -> pd.DataFrame:
        sql = f"""
            SELECT cnpj_fundo_cota, nm_fundo_cota,
                   SUM(vl_merc_pos_final) as valor
            FROM cvm.cda_fi_blc_2
            WHERE cnpj_fundo = '{cnpj}' AND dt_comptc = '{max_date}'
            GROUP BY cnpj_fundo_cota, nm_fundo_cota
            ORDER BY valor DESC LIMIT 20
        """
        return self.db.read_sql(sql)

    @temp()
    def get_invested_by(self, cnpj: str) -> pd.DataFrame:
        sql = f"""
            SELECT cnpj_fundo, denom_social,
                   SUM(vl_merc_pos_final) as valor
            FROM cvm.cda_fi_blc_2
            WHERE cnpj_fundo_cota = '{cnpj}'
              AND dt_comptc = (
                  SELECT MAX(dt_comptc)
                  FROM cvm.cda_fi_blc_2
                  WHERE cnpj_fundo_cota = '{cnpj}'
              )
            GROUP BY cnpj_fundo, denom_social
            ORDER BY valor DESC LIMIT 20
        """
        return self.db.read_sql(sql)

    @temp()
    def get_mirror(self, cnpj: str) -> Optional[str]:
        sql = f"""
            SELECT cnpj_fundo_cota FROM cvm.espelhos
            WHERE cnpj_fundo = '{cnpj}' LIMIT 1
        """
        df = self.db.read_sql(sql)
        return df["cnpj_fundo_cota"].iloc[0] if not df.empty else None

    @temp()
    def get_blc2_max_date(self, cnpj: str) -> Optional[str]:
        sql = f"SELECT MAX(dt_comptc) as max_date FROM cvm.cda_fi_blc_2 WHERE cnpj_fundo = '{cnpj}'"
        df = self.db.read_sql(sql)
        if df.empty or pd.isnull(df.iloc[0]["max_date"]):
            return None
        return str(df.iloc[0]["max_date"])
