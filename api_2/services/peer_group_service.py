"""
Peer Group Service — lógica de negócio para peer groups.
"""

from typing import List, Optional

from ..repositories.peer_group_repo import PeerGroupRepository
from ..repositories.base import BaseRepository


class PeerGroupService:
    def __init__(self, repo: PeerGroupRepository):
        self.repo = repo

    _normalize = staticmethod(BaseRepository.normalize_cnpj)

    def list_groups(self) -> List[dict]:
        df = self.repo.list_all()
        return df.to_dict("records") if not df.empty else []

    def create_group(self, name: str, description: Optional[str] = None, category: Optional[str] = None) -> dict:
        gid = self.repo.create(name, description, category)
        return {"id": gid, "name": name, "description": description, "category": category}

    def get_group(self, group_id: int) -> Optional[dict]:
        df = self.repo.get_by_id(group_id)
        if df.empty:
            return None
        group = df.iloc[0].to_dict()
        df_funds = self.repo.get_funds(group_id)
        group["funds"] = df_funds.to_dict("records") if not df_funds.empty else []
        return group

    def delete_group(self, group_id: int) -> bool:
        self.repo.delete(group_id)
        return True

    def add_fund(self, group_id: int, cnpj: str, apelido=None, peer_cat=None, desc=None, comment=None) -> dict:
        clean = self._normalize(cnpj)
        fid = self.repo.add_fund(group_id, clean, apelido, peer_cat, desc, comment)
        return {"id": fid, "cnpj_fundo": clean}

    def update_fund(self, group_id: int, cnpj: str, apelido=None, peer_cat=None, desc=None, comment=None) -> dict:
        clean = self._normalize(cnpj)
        self.repo.update_fund(group_id, clean, apelido, peer_cat, desc, comment)
        return {"status": "updated"}

    def remove_fund(self, group_id: int, cnpj: str) -> bool:
        clean = self._normalize(cnpj)
        self.repo.remove_fund(group_id, clean)
        return True
