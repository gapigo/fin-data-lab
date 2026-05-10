"""
Allocators Router — endpoints para o dashboard de alocadores.
"""

from fastapi import APIRouter, Query
from typing import Optional

from ..dependencies import get_db
from ..repositories.allocator_repo import AllocatorRepository
from ..services.allocator_service import AllocatorService

router = APIRouter(prefix="/allocators", tags=["Allocators"])

_service: Optional[AllocatorService] = None


def _svc() -> AllocatorService:
    global _service
    if _service is None:
        _service = AllocatorService(AllocatorRepository(get_db()))
    return _service


@router.get("/filters")
def get_filters():
    return _svc().get_filters()


@router.get("/flow")
def get_flow(
    client: Optional[str] = None,
    segment: Optional[str] = None,
    peer: Optional[str] = None,
    window: int = 12,
):
    return _svc().get_flow_position(client, segment, peer, window)


@router.get("/performance")
def get_performance(
    client: Optional[str] = None,
    segment: Optional[str] = None,
    peer: Optional[str] = None,
):
    return _svc().get_performance(client, segment, peer)


@router.get("/allocation")
def get_allocation(
    client: Optional[str] = None,
    segment: Optional[str] = None,
    peer: Optional[str] = None,
):
    return _svc().get_allocation(client, segment, peer)
