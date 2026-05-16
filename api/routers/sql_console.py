from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from config.postgresql import PostgresConnector
import time, re

router = APIRouter()
db = PostgresConnector()

class QueryRequest(BaseModel):
    query: str
    limit: int = 1000

def is_safe_query(sql: str) -> bool:
    """Only allow SELECT and WITH (CTEs)."""
    clean = sql.strip().upper()
    return clean.startswith("SELECT") or clean.startswith("WITH")

@router.post("/execute")
def execute_query(req: QueryRequest):
    if not is_safe_query(req.query):
        raise HTTPException(400, "Only SELECT queries are allowed.")
    t0 = time.time()
    try:
        q = req.query.strip()
        if not q.upper().endswith('LIMIT') and ' LIMIT ' not in q.upper():
            q += f" LIMIT {req.limit}"
        df = db.read_sql(q)
        elapsed = int((time.time() - t0) * 1000)
        return {
            "columns": df.columns.tolist(),
            "rows": df.values.tolist(),
            "row_count": len(df),
            "execution_time_ms": elapsed
        }
    except Exception as e:
        raise HTTPException(500, str(e))

@router.get("/schema")
def get_schema():
    df = db.read_sql("""
        SELECT table_schema, table_name, column_name, data_type
        FROM information_schema.columns
        WHERE table_schema IN ('cvm','alocadores','middle','public')
        ORDER BY table_schema, table_name, ordinal_position
    """)
    schema = {}
    for _, row in df.iterrows():
        s, t, c, d = row['table_schema'], row['table_name'], row['column_name'], row['data_type']
        schema.setdefault(s, {}).setdefault(t, []).append({"name": c, "type": d})
    return schema

@router.get("/history")
def get_history():
    try:
        df = db.read_sql("SELECT id, query, executed_at, row_count, execution_time_ms FROM user_sql_history ORDER BY executed_at DESC LIMIT 50")
        return df.to_dict(orient="records")
    except:
        return []

@router.post("/history")
def save_to_history(req: QueryRequest, row_count: int = 0, execution_time_ms: int = 0):
    db.execute_sql("""
        INSERT INTO user_sql_history (query, row_count, execution_time_ms)
        VALUES (:query, :row_count, :ms)
    """, {"query": req.query, "row_count": row_count, "ms": execution_time_ms})
    return {"ok": True}

@router.get("/saved")
def get_saved():
    try:
        df = db.read_sql("SELECT * FROM user_saved_queries ORDER BY created_at DESC")
        return df.to_dict(orient="records")
    except:
        return []

@router.post("/saved")
def save_query(name: str, description: str, query: str):
    db.execute_sql("""
        INSERT INTO user_saved_queries (name, description, query)
        VALUES (:name, :desc, :query)
    """, {"name": name, "desc": description, "query": query})
    return {"ok": True}
