"""
Peer Groups Router — CRUD para peer groups.
"""

from fastapi import APIRouter, HTTPException
from typing import Optional

from ..dependencies import get_db
from ..repositories.peer_group_repo import PeerGroupRepository
from ..services.peer_group_service import PeerGroupService
from ..schemas.funds import PeerGroupCreate, PeerGroupFundAdd

router = APIRouter(tags=["Peer Groups"])

_service: Optional[PeerGroupService] = None


def _svc() -> PeerGroupService:
    global _service
    if _service is None:
        _service = PeerGroupService(PeerGroupRepository(get_db()))
    return _service


@router.get("/peer-groups")
def list_peer_groups():
    return _svc().list_groups()


@router.post("/peer-groups")
def create_peer_group(group: PeerGroupCreate):
    return _svc().create_group(group.name, group.description, group.category)


@router.get("/peer-groups/{group_id}")
def get_peer_group(group_id: int):
    result = _svc().get_group(group_id)
    if not result:
        raise HTTPException(404, "Peer group not found")
    return result


@router.delete("/peer-groups/{group_id}")
def delete_peer_group(group_id: int):
    if _svc().delete_group(group_id):
        return {"status": "ok", "message": f"Peer group {group_id} deleted"}
    raise HTTPException(404, "Peer group not found")


@router.post("/peer-groups/{group_id}/funds")
def add_fund(group_id: int, fund: PeerGroupFundAdd):
    return _svc().add_fund(
        group_id, fund.cnpj_fundo, fund.apelido,
        fund.peer_cat, fund.descricao, fund.comentario,
    )


@router.put("/peer-groups/{group_id}/funds/{cnpj}")
def update_fund(group_id: int, cnpj: str, fund: PeerGroupFundAdd):
    return _svc().update_fund(
        group_id, cnpj, fund.apelido,
        fund.peer_cat, fund.descricao, fund.comentario,
    )


@router.delete("/peer-groups/{group_id}/funds/{cnpj}")
def remove_fund(group_id: int, cnpj: str):
    if _svc().remove_fund(group_id, cnpj):
        return {"status": "ok", "message": f"Fund {cnpj} removed"}
    raise HTTPException(404, "Fund not found")
