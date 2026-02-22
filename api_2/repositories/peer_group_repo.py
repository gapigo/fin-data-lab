"""
Peer Groups Repository — CRUD para site.peer_groups / site.peer_group_funds.
"""

import pandas as pd
from typing import Optional

from common.postgresql import PostgresConnector

from .base import BaseRepository


class PeerGroupRepository(BaseRepository):

    def _ensure_tables(self):
        self.db.execute_sql("CREATE SCHEMA IF NOT EXISTS site")
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

    def list_all(self) -> pd.DataFrame:
        self._ensure_tables()
        sql = """
            SELECT g.id, g.name, g.description, g.category, g.created_at,
                   COUNT(f.id) as fund_count
            FROM site.peer_groups g
            LEFT JOIN site.peer_group_funds f ON f.group_id = g.id
            GROUP BY g.id, g.name, g.description, g.category, g.created_at
            ORDER BY g.name
        """
        return self.db.read_sql(sql)

    def get_by_id(self, group_id: int) -> pd.DataFrame:
        self._ensure_tables()
        return self.db.read_sql(
            f"SELECT * FROM site.peer_groups WHERE id = {group_id}"
        )

    def get_funds(self, group_id: int) -> pd.DataFrame:
        self._ensure_tables()
        sql = f"""
            SELECT f.*, c.denom_social, c.gestor, c.classe, c.sit
            FROM site.peer_group_funds f
            LEFT JOIN cvm.cadastro c ON c.cnpj_fundo = f.cnpj_fundo AND c.dt_fim IS NULL
            WHERE f.group_id = {group_id}
        """
        return self.db.read_sql(sql)

    def create(self, name: str, description: Optional[str], category: Optional[str]) -> int:
        self._ensure_tables()
        desc_sql = f"'{description}'" if description else "NULL"
        cat_sql = f"'{category}'" if category else "NULL"
        sql = f"""
            INSERT INTO site.peer_groups (name, description, category)
            VALUES ('{name}', {desc_sql}, {cat_sql})
            RETURNING id
        """
        df = self.db.read_sql(sql)
        return int(df.iloc[0]["id"]) if not df.empty else 0

    def delete(self, group_id: int):
        self._ensure_tables()
        self.db.execute_sql(f"DELETE FROM site.peer_groups WHERE id = {group_id}")

    def add_fund(
        self, group_id: int, cnpj: str,
        apelido: Optional[str], peer_cat: Optional[str],
        desc: Optional[str], comment: Optional[str],
    ) -> int:
        self._ensure_tables()
        san = lambda v: f"'{v}'" if v else "NULL"
        sql = f"""
            INSERT INTO site.peer_group_funds
            (group_id, cnpj_fundo, apelido, peer_cat, descricao, comentario)
            VALUES ({group_id}, '{cnpj}', {san(apelido)}, {san(peer_cat)},
                    {san(desc)}, {san(comment)})
            RETURNING id
        """
        df = self.db.read_sql(sql)
        return int(df.iloc[0]["id"]) if not df.empty else 0

    def update_fund(
        self, group_id: int, cnpj: str,
        apelido: Optional[str], peer_cat: Optional[str],
        desc: Optional[str], comment: Optional[str],
    ):
        self._ensure_tables()
        updates = []
        if apelido is not None:
            updates.append(f"apelido = '{apelido}'")
        if peer_cat is not None:
            updates.append(f"peer_cat = '{peer_cat}'")
        if desc is not None:
            updates.append(f"descricao = '{desc}'")
        if comment is not None:
            updates.append(f"comentario = '{comment}'")
        if not updates:
            return
        sql = f"""
            UPDATE site.peer_group_funds
            SET {', '.join(updates)}, updated_at = CURRENT_TIMESTAMP
            WHERE group_id = {group_id} AND cnpj_fundo = '{cnpj}'
        """
        self.db.execute_sql(sql)

    def remove_fund(self, group_id: int, cnpj: str):
        self._ensure_tables()
        self.db.execute_sql(
            f"DELETE FROM site.peer_group_funds WHERE group_id = {group_id} AND cnpj_fundo = '{cnpj}'"
        )
