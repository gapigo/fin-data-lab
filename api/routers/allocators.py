"""
Allocators Router
Endpoints para dashboard de Alocadores
"""
from fastapi import APIRouter, Query
from typing import Optional, Dict, Any

from ..services.allocators import get_allocator_service

router = APIRouter(prefix="/allocators", tags=["allocators"])


@router.get("/filters")
async def get_filters() -> Dict[str, Any]:
    """Retorna filtros disponíveis para o dashboard."""
    service = get_allocator_service()
    return service.get_filters()


@router.get("/flow")
async def get_flow(
    client: Optional[str] = Query(None),
    segment: Optional[str] = Query(None),
    peer: Optional[str] = Query(None),
    window: int = Query(12)
) -> Dict[str, Any]:
    """Dados para aba Fluxo e Posição."""
    service = get_allocator_service()
    return service.get_flow(client, segment, peer, window)


@router.get("/performance")
async def get_performance(
    client: Optional[str] = Query(None),
    segment: Optional[str] = Query(None),
    window: int = Query(12)
) -> Dict[str, Any]:
    """Dados para aba Performance."""
    service = get_allocator_service()
    return service.get_performance(client, segment, window)


@router.get("/allocation")
async def get_allocation(
    client: Optional[str] = Query(None),
    segment: Optional[str] = Query(None),
    peer: Optional[str] = Query(None)
) -> Dict[str, Any]:
    """Dados para aba Alocação."""
    service = get_allocator_service()
    return service.get_allocation(client, segment, peer)
