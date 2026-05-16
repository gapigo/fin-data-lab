"""
Ingestion Router — endpoints for monitoring and triggering CVM data ingestion.

Endpoints:
    GET  /ingestion/status   — data freshness info
    GET  /ingestion/history  — last 20 downloaded files (from ingest_control)
    POST /ingestion/run      — run the incremental update pipeline (SSE stream)
"""

import sys
import os
import asyncio
import json
from datetime import date

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from config.postgresql import PostgresConnector

router = APIRouter(prefix="/ingestion", tags=["ingestion"])

_db = PostgresConnector()


# ── Models ─────────────────────────────────────────────────────────────────

class IngestionStatus(BaseModel):
    cotas_last_date: str | None = None
    carteira_last_date: str | None = None
    cadastro_last_date: str | None = None
    days_outdated: int | None = None
    raw_last_date: str | None = None
    fund_count: int | None = None
    total_pl: float | None = None

# ── GET /ingestion/status ──────────────────────────────────────────────────

@router.get("/status", response_model=IngestionStatus)
def get_status():
    """Return data freshness info (last dates, days outdated)."""
    df_cotas = _db.read_sql("SELECT MAX(dt_comptc) AS max_date FROM cvm.cotas")
    df_carteira = _db.read_sql(
        "SELECT MAX(dt_comptc) AS max_date FROM cvm.carteira"
    )
    df_raw = _db.read_sql(
        "SELECT MAX(dt_comptc) AS max_date FROM cvm.fi_doc_inf_diario_inf_diario_fi"
    )

    cotas_date = _extract_date(df_cotas)
    carteira_date = _extract_date(df_carteira)
    raw_date = _extract_date(df_raw)

    # Calculate days outdated (use cotas as reference)
    today = date.today()
    days_out = None
    if cotas_date:
        days_out = (today - cotas_date).days

    # Stats
    df_fund_count = _db.read_sql("SELECT COUNT(*) AS cnt FROM cvm.cadastro WHERE sit = 'EM FUNCIONAMENTO NORMAL'")
    df_pl = _db.read_sql("""
        SELECT SUM(vl_patrim_liq) AS total_pl
        FROM cvm.cotas c
        INNER JOIN (
            SELECT cnpj_fundo, MAX(dt_comptc) AS max_date
            FROM cvm.cotas
            GROUP BY cnpj_fundo
        ) latest ON c.cnpj_fundo = latest.cnpj_fundo AND c.dt_comptc = latest.max_date
    """)
    fund_count = int(df_fund_count['cnt'].iloc[0]) if not df_fund_count.empty else None
    total_pl = float(df_pl['total_pl'].iloc[0]) if not df_pl.empty and df_pl['total_pl'].iloc[0] is not None else None

    return IngestionStatus(
        cotas_last_date=cotas_date.isoformat() if cotas_date else None,
        carteira_last_date=carteira_date.isoformat() if carteira_date else None,
        days_outdated=days_out,
        raw_last_date=raw_date.isoformat() if raw_date else None,
        fund_count=fund_count,
        total_pl=total_pl,
    )


# ── GET /ingestion/history ─────────────────────────────────────────────────

@router.get("/history")
def get_history():
    """Return last 20 entries from cvm.ingest_control."""
    try:
        df = _db.read_sql(
            "SELECT file_name, relative_path, downloaded_at "
            "FROM cvm.ingest_control "
            "ORDER BY downloaded_at DESC LIMIT 20"
        )
        if df.empty:
            return {"history": []}
        # Convert DataFrame to records
        records = df.to_dict(orient="records")
        # Convert any non-serializable types
        for r in records:
            for k, v in r.items():
                if hasattr(v, "isoformat"):
                    r[k] = v.isoformat()
        return {"history": records}
    except Exception as e:
        # Table may not exist yet — return empty
        return {"history": [], "note": str(e)}


# ── POST /ingestion/run (SSE stream) ──────────────────────────────────────

@router.post("/run")
async def run_ingestion():
    """Run the incremental pipeline, streaming log lines as SSE."""

    async def event_stream():
        project_root = os.path.abspath(
            os.path.join(os.path.dirname(__file__), "..", "..")
        )
        python_exe = sys.executable
        script = os.path.join(
            project_root, "ingestion", "run_update.py"
        )

        yield f"data: {json.dumps({'type': 'info', 'message': 'Iniciando pipeline de atualização...'})}\n\n"

        process = await asyncio.create_subprocess_exec(
            python_exe,
            script,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.STDOUT,
            cwd=project_root,
        )

        assert process.stdout is not None
        async for line_bytes in process.stdout:
            line = line_bytes.decode("utf-8", errors="replace").rstrip()
            if line:
                yield f"data: {json.dumps({'type': 'log', 'message': line})}\n\n"

        return_code = await process.wait()

        if return_code == 0:
            yield (
                f"data: {json.dumps({'type': 'done', 'message': 'Pipeline concluída com sucesso.'})}\n\n"
            )
        else:
            yield (
                f"data: {json.dumps({'type': 'error', 'message': f'Pipeline falhou (exit={return_code}).'})}\n\n"
            )

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


# ── Helpers ────────────────────────────────────────────────────────────────

def _extract_date(df) -> date | None:
    """Extract date from a one-row DataFrame with 'max_date' column."""
    if df.empty or df.iloc[0]["max_date"] is None:
        return None
    val = df.iloc[0]["max_date"]
    if hasattr(val, "date"):
        return val.date()
    if isinstance(val, str):
        return date.fromisoformat(val[:10])
    return val
