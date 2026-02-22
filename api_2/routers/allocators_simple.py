"""
Allocators Simplified Router — endpoints para o dashboard simplificado.

Reutiliza o service e cache do sistema allocators_simplified legado,
mas registrado de forma limpa.
"""

from fastapi import APIRouter, Query, HTTPException, BackgroundTasks
from typing import Optional
import pandas as pd

# Importar módulos do subsistema allocators_simplified da api original
# Esses módulos contêm lógica de cache JSON pesada que é mantida intacta
from api.allocators_simplified.service import get_service
from api.allocators_simplified.data_cache import get_cache
from api.allocators_simplified.config import DEFAULT_WINDOWS, AVAILABLE_METRICS, ALL_WINDOWS
from api.allocators_simplified.dataframes import (
    _generate_mock_movimentacao,
    get_cotas_fundos_posicao,
)

router = APIRouter(prefix="/allocators-simple", tags=["Alocadores Simplificado"])


@router.get("/filters")
def get_filters():
    service = get_service()
    filters = service.get_filters()
    filters["windows"] = ALL_WINDOWS
    filters["default_windows"] = DEFAULT_WINDOWS
    filters["metrics"] = AVAILABLE_METRICS
    return filters


@router.get("/flow")
def get_client_flow(
    client: str = Query(...),
    peers: Optional[str] = Query(None),
    window: str = Query("12M"),
):
    service = get_service()
    peers_list = [p.strip() for p in peers.split(",")] if peers else None
    return service.get_client_flow(client=client, peers=peers_list, window=window)


@router.get("/performance")
def get_portfolio_performance(
    client: str = Query(...),
    segment: str = Query(...),
    peers: Optional[str] = Query(None),
    metric: str = Query("ret"),
    windows: Optional[str] = Query(None),
):
    service = get_service()
    peers_list = [p.strip() for p in peers.split(",")] if peers else None
    windows_list = [w.strip() for w in windows.split(",")] if windows else None
    return service.get_portfolio_performance(
        client=client, segment=segment,
        peers=peers_list, metric=metric, windows=windows_list,
    )


@router.get("/fund-highlight")
def get_fund_highlight(
    client: str = Query(...),
    segment: str = Query(...),
    cnpj: str = Query(...),
    peers: Optional[str] = Query(None),
):
    service = get_service()
    peers_list = [p.strip() for p in peers.split(",")] if peers else None
    return service.get_fund_highlight_point(
        client=client, segment=segment, cnpj_fundo=cnpj, peers=peers_list,
    )


@router.get("/portfolio")
def get_complete_portfolio(
    client: Optional[str] = Query(None),
    segment: Optional[str] = Query(None),
    cnpj: Optional[str] = Query(None),
):
    if not cnpj and (not client or not segment):
        raise HTTPException(400, "Forneça 'client' + 'segment' OU 'cnpj'")
    service = get_service()
    return service.get_complete_portfolio(client=client, segment=segment, cnpj_fundo=cnpj)


@router.get("/movimentacao")
def get_movimentacao(
    client: str = Query(...),
    segment: str = Query(...),
):
    return _generate_mock_movimentacao(client=client, segment=segment)


@router.get("/cotas-posicao")
def get_cotas_posicao(
    client: str = Query(...),
    segment: str = Query(...),
):
    df = get_cotas_fundos_posicao(client=client, segment=segment)
    if df.empty:
        return {"data": []}
    return {"data": [
        {
            "cnpj": row.get("cnpj_fundo_cota", ""),
            "name": str(row.get("nm_fundo_cota", ""))[:50],
            "gestor": str(row.get("gestor_cota", "")),
            "value": float(row["vl_merc_pos_final"]) if pd.notnull(row["vl_merc_pos_final"]) else 0,
        }
        for _, row in df.iterrows()
    ]}


@router.get("/cache-status")
def get_cache_status():
    c = get_cache()
    return {
        "is_valid": c.is_cache_valid(),
        "metadata": c.get_metadata(),
        "cache_dir": str(c.cache_dir),
    }


@router.post("/build-cache")
async def build_cache(background_tasks: BackgroundTasks):
    from common.postgresql import PostgresConnector

    def _build():
        try:
            db = PostgresConnector()
            c = get_cache()
            c.build_all(db)
        except Exception as e:
            print(f"[CACHE] Error: {e}")

    background_tasks.add_task(_build)
    return {"status": "started", "message": "Cache rebuild iniciado em background"}
