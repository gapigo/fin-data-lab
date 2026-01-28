
"""
Peer Groups Model - Management of peer group definitions.

Tables:
- site.peer_groups
- site.peer_group_funds
"""

import sys
import os
import pandas as pd
from typing import List, Dict, Any, Optional

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from common.postgresql import PostgresConnector

def ensure_peer_tables():
    """Ensure peer group tables exist."""
    db = PostgresConnector()
    db.execute_sql("CREATE SCHEMA IF NOT EXISTS site")
    
    db.execute_sql("""
        CREATE TABLE IF NOT EXISTS site.peer_groups (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            description TEXT,
            category VARCHAR(100),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    db.execute_sql("""
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

def get_all_peer_groups() -> pd.DataFrame:
    """List all peer groups with fund counts."""
    ensure_peer_tables()
    db = PostgresConnector()
    sql = """
        SELECT g.id, g.name, g.description, g.category, g.created_at,
               COUNT(f.id) as fund_count
        FROM site.peer_groups g
        LEFT JOIN site.peer_group_funds f ON f.group_id = g.id
        GROUP BY g.id, g.name, g.description, g.category, g.created_at
        ORDER BY g.name
    """
    return db.read_sql(sql)

def insert_peer_group(name: str, description: Optional[str], category: Optional[str]) -> int:
    """Create new peer group and return ID."""
    ensure_peer_tables()
    db = PostgresConnector()
    desc_sql = f"'{description}'" if description else "NULL"
    cat_sql = f"'{category}'" if category else "NULL"
    
    # Since PostgresConnector.execute_sql doesn't return ID directly easily without specialized logic,
    # we might need to use read_sql with RETURNING or adjust logic.
    # PostgresConnector.read_sql works for RETURNING queries.
    
    sql = f"""
        INSERT INTO site.peer_groups (name, description, category)
        VALUES ('{name}', {desc_sql}, {cat_sql})
        RETURNING id
    """
    df = db.read_sql(sql)
    return int(df.iloc[0]['id']) if not df.empty else 0

def get_peer_group_by_id(group_id: int) -> pd.DataFrame:
    """Get peer group details."""
    ensure_peer_tables()
    db = PostgresConnector()
    sql = f"SELECT * FROM site.peer_groups WHERE id = {group_id}"
    return db.read_sql(sql)

def get_peer_group_funds(group_id: int) -> pd.DataFrame:
    """Get all funds in a group with details."""
    ensure_peer_tables()
    db = PostgresConnector()
    sql = f"""
        SELECT f.*, c.denom_social, c.gestor, c.classe, c.sit
        FROM site.peer_group_funds f
        LEFT JOIN cvm.cadastro c ON c.cnpj_fundo = f.cnpj_fundo 
            AND c.dt_fim IS NULL -- Join with active funds info
        WHERE f.group_id = {group_id}
    """
    return db.read_sql(sql)

def delete_peer_group_record(group_id: int):
    """Delete a peer group."""
    ensure_peer_tables()
    db = PostgresConnector()
    db.execute_sql(f"DELETE FROM site.peer_groups WHERE id = {group_id}")

def add_fund_to_peer_group_record(group_id: int, cnpj: str, apelido: str, peer_cat: str, desc: str, comment: str) -> int:
    """Add fund to group."""
    ensure_peer_tables()
    db = PostgresConnector()
    
    def sanitize(v): return f"'{v}'" if v else "NULL"
    
    sql = f"""
        INSERT INTO site.peer_group_funds 
        (group_id, cnpj_fundo, apelido, peer_cat, descricao, comentario)
        VALUES ({group_id}, '{cnpj}', {sanitize(apelido)}, {sanitize(peer_cat)}, {sanitize(desc)}, {sanitize(comment)})
        RETURNING id
    """
    df = db.read_sql(sql)
    return int(df.iloc[0]['id']) if not df.empty else 0

def update_fund_peer_record(group_id: int, cnpj: str, apelido: str, peer_cat: str, desc: str, comment: str):
    """Update fund details in group."""
    ensure_peer_tables()
    db = PostgresConnector()
    
    updates = []
    if apelido is not None: updates.append(f"apelido = '{apelido}'")
    if peer_cat is not None: updates.append(f"peer_cat = '{peer_cat}'")
    if desc is not None: updates.append(f"descricao = '{desc}'")
    if comment is not None: updates.append(f"comentario = '{comment}'")
    
    if not updates: return
    
    sql = f"""
        UPDATE site.peer_group_funds
        SET {', '.join(updates)}, updated_at = CURRENT_TIMESTAMP
        WHERE group_id = {group_id} AND cnpj_fundo = '{cnpj}'
    """
    db.execute_sql(sql)

def remove_fund_peer_record(group_id: int, cnpj: str):
    """Remove fund from group."""
    ensure_peer_tables()
    db = PostgresConnector()
    sql = f"DELETE FROM site.peer_group_funds WHERE group_id = {group_id} AND cnpj_fundo = '{cnpj}'"
    db.execute_sql(sql)
