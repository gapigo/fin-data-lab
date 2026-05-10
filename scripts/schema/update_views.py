"""
Update CVM materialized views — incremental REFRESH (not DROP+CREATE).

Uses REFRESH MATERIALIZED VIEW CONCURRENTLY to avoid locking readers
and to preserve existing data. This is safe to run as new data is ingested.

Materialized views refreshed:
  - cvm.cotas        — daily fund quota data
  - cvm.carteira     — fund-of-funds positions with client segmentation

Prerequisite: cvm.cadastro, cvm.cda_fi_blc_2, cvm.depara_gestores,
              alocadores.cliente_segmentado must be up to date.

Usage:
    python scripts/schema/update_views.py
"""

import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from config.postgresql import PostgresConnector


def refresh_cotas(db: PostgresConnector) -> None:
    """Refresh cvm.cotas materialized view concurrently."""
    print("  [VIEW] Atualizando cvm.cotas...")
    db.execute_sql("REFRESH MATERIALIZED VIEW CONCURRENTLY cvm.cotas;")
    print("  [VIEW] cvm.cotas atualizada.")


def refresh_carteira(db: PostgresConnector) -> None:
    """Refresh cvm.carteira materialized view concurrently."""
    print("  [VIEW] Atualizando cvm.carteira...")
    # carteira depends on ativos_carteira and peer views; refresh those first
    db.execute_sql(
        "REFRESH MATERIALIZED VIEW CONCURRENTLY cvm.ativos_carteira;"
    )
    db.execute_sql("REFRESH MATERIALIZED VIEW CONCURRENTLY cvm.peer;")
    db.execute_sql("REFRESH MATERIALIZED VIEW CONCURRENTLY cvm.carteira;")
    print("  [VIEW] cvm.carteira atualizada.")


def ensure_unique_indexes(db: PostgresConnector) -> None:
    """CONCURRENTLY refresh requires at least one unique index on the MV."""
    # cvm.cotas
    db.execute_sql("""
        CREATE UNIQUE INDEX IF NOT EXISTS idx_cotas_unique
        ON cvm.cotas (cnpj_fundo, dt_comptc, COALESCE(id_subclasse, ''));
    """)
    # cvm.carteira — might already have one; create if missing
    db.execute_sql("""
        CREATE UNIQUE INDEX IF NOT EXISTS idx_carteira_unique
        ON cvm.carteira (dt_comptc, cnpj_fundo, cnpj_fundo_cota);
    """)
    # cvm.ativos_carteira
    db.execute_sql("""
        CREATE UNIQUE INDEX IF NOT EXISTS idx_ativos_carteira_unique
        ON cvm.ativos_carteira (dt_comptc, cnpj_fundo, bloco, cd_ativo);
    """)
    # cvm.peer
    db.execute_sql("""
        CREATE UNIQUE INDEX IF NOT EXISTS idx_peer_unique
        ON cvm.peer (cnpj_fundo);
    """)


def main() -> None:
    db = PostgresConnector()
    print("--- Atualizando Views Materializadas (REFRESH CONCURRENTLY) ---")

    ensure_unique_indexes(db)
    refresh_cotas(db)
    refresh_carteira(db)

    print("--- Views atualizadas com sucesso. ---")


if __name__ == "__main__":
    main()
