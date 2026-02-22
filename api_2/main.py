"""
Fin Data Lab API — Entry Point.

Este arquivo faz APENAS:
1. Criar o app FastAPI
2. Configurar CORS
3. Registrar middleware
4. Registrar routers
5. Health check

ZERO lógica de negócio. ZERO modelos inline. ZERO SQL.
"""

import sys
import os

# Garantir que o root do projeto está no path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from common.cache import request_dedup

from .middleware.dedup import deduplicate_requests
from .routers import funds, peer_groups, allocators, allocators_simple, cache

# ── App ──────────────────────────────────────────────────────────────────

app = FastAPI(
    title="Fin Data Lab API",
    description="API for CVM Fund Data — Clean Architecture",
    version="2.0.0",
)

# ── CORS ─────────────────────────────────────────────────────────────────

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Middleware ───────────────────────────────────────────────────────────

app.middleware("http")(deduplicate_requests)

# ── Routers ──────────────────────────────────────────────────────────────

app.include_router(funds.router)
app.include_router(peer_groups.router)
app.include_router(allocators.router)
app.include_router(allocators_simple.router)
app.include_router(cache.router)

# ── Health ───────────────────────────────────────────────────────────────


@app.get("/")
def health_check():
    stats = request_dedup.get_stats()
    return {
        "status": "ok",
        "message": "Fin Data Lab API v2 is running",
        "pending_requests": stats["pending_count"],
        "deduplicated_requests": stats["deduplicated_count"],
    }


@app.get("/status")
def get_status():
    pending = request_dedup.get_pending_requests()
    stats = request_dedup.get_stats()
    return {
        "pending_requests": pending,
        "stats": stats,
        "message": (
            f"{len(pending)} requisição(ões) em andamento"
            if pending else "Nenhuma requisição em andamento"
        ),
    }


# ── Run ──────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
