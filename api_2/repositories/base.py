"""
Base repository — helper utilities shared by all repositories.

Every repository receives a `db` (PostgresConnector) and uses @temp for caching.
"""

import re
import pandas as pd
from common.postgresql import PostgresConnector


class BaseRepository:
    """Helpers reutilizáveis por todos os repos."""

    def __init__(self, db: PostgresConnector):
        self.db = db

    # ── CNPJ ─────────────────────────────────────────────────────────────
    @staticmethod
    def normalize_cnpj(cnpj: str) -> str:
        """Formata CNPJ para o padrão XX.XXX.XXX/XXXX-XX."""
        raw = re.sub(r"\D", "", cnpj)
        if len(raw) == 14:
            return (
                f"{raw[:2]}.{raw[2:5]}.{raw[5:8]}"
                f"/{raw[8:12]}-{raw[12:]}"
            )
        return cnpj.strip().replace("'", "''")

    # ── Helper para NaN → None ───────────────────────────────────────────
    @staticmethod
    def val(v):
        """Retorna None se NaN/NaT."""
        return v if pd.notnull(v) else None
