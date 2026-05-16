from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Optional
from config.postgresql import PostgresConnector

router = APIRouter()
db = PostgresConnector()

class AnnotationCreate(BaseModel):
    cnpj_fundo: str
    note: str
    tags: List[str] = []

@router.get("/annotations/{cnpj}")
def list_annotations(cnpj: str):
    df = db.read_sql("""
        SELECT id, cnpj_fundo, note, tags, created_at, updated_at
        FROM user_annotations
        WHERE cnpj_fundo = :cnpj
        ORDER BY updated_at DESC
    """, {"cnpj": cnpj})
    records = df.to_dict(orient="records")
    for r in records:
        if isinstance(r.get("tags"), str):
            r["tags"] = r["tags"].strip("{}").split(",") if r["tags"].strip("{}") else []
    return records

@router.post("/annotations")
def create_annotation(req: AnnotationCreate):
    db.execute_sql("""
        INSERT INTO user_annotations (cnpj_fundo, note, tags)
        VALUES (:cnpj, :note, :tags)
    """, {"cnpj": req.cnpj_fundo, "note": req.note, "tags": req.tags})
    return {"ok": True}

@router.delete("/annotations/{id}")
def delete_annotation(id: int):
    db.execute_sql("DELETE FROM user_annotations WHERE id = :id", {"id": id})
    return {"ok": True}
