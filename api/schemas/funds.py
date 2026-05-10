"""
Schemas Pydantic para endpoints de Fundos.

Responsabilidade: definir formatos de entrada e saída da API.
"""

from datetime import date
from typing import Dict, List, Optional, Any
from pydantic import BaseModel


# ============================================================================
# SEARCH & DETAIL
# ============================================================================

class FundSearchResponse(BaseModel):
    cnpj_fundo: str
    denom_social: str
    gestor: Optional[str] = None
    classe: Optional[str] = None
    sit: Optional[str] = None
    dt_ini: Optional[date] = None


class FundDetail(FundSearchResponse):
    publico_alvo: Optional[str] = None
    dt_reg: Optional[date] = None
    auditor: Optional[str] = None
    custodiante: Optional[str] = None
    controlador: Optional[str] = None
    admin: Optional[str] = None
    taxa_adm: Optional[str] = None
    taxa_perf: Optional[str] = None
    benchmark: Optional[str] = None
    condom: Optional[str] = None
    fundo_exclusivo: Optional[str] = None
    fundo_cotas: Optional[str] = None
    peer_grupo: Optional[str] = None
    peer_detalhado: Optional[str] = None


# ============================================================================
# HISTORY & METRICS
# ============================================================================

class QuotaData(BaseModel):
    dt_comptc: date
    vl_quota: float
    vl_patrim_liq: Optional[float] = None
    vl_total: Optional[float] = None
    captc_dia: Optional[float] = None
    resg_dia: Optional[float] = None
    nr_cotst: Optional[int] = None


# ============================================================================
# PORTFOLIO
# ============================================================================

class AssetPosition(BaseModel):
    nome: str
    valor: float
    percentual: float
    tipo: Optional[str] = None
    cnpj_emissor: Optional[str] = None
    dt_venc: Optional[str] = None
    extra: Optional[Dict[str, Any]] = None


class PortfolioBlock(BaseModel):
    tipo: str
    nome_display: str
    total_valor: float
    total_percentual: float
    ativos: List[AssetPosition]


class PortfolioDetailed(BaseModel):
    cnpj_fundo: str
    dt_comptc: Optional[str] = None
    vl_patrim_liq: Optional[float] = None
    blocos: List[PortfolioBlock]
    resumo: Dict[str, float]


# ============================================================================
# STRUCTURE
# ============================================================================

class FundRelationship(BaseModel):
    cnpj_fundo: str
    cnpj_relacionado: str
    nome_relacionado: str
    tipo_relacao: str
    valor: Optional[float] = None
    percentual: Optional[float] = None


class FundStructure(BaseModel):
    cnpj_fundo: str
    nome_fundo: str
    tipo: Optional[str] = None
    investe_em: List[FundRelationship]
    investido_por: List[FundRelationship]
    espelho_de: Optional[str] = None


# ============================================================================
# PEER GROUPS
# ============================================================================

class PeerGroupCreate(BaseModel):
    name: str
    description: Optional[str] = None
    category: Optional[str] = None


class PeerGroupFundAdd(BaseModel):
    cnpj_fundo: str
    apelido: Optional[str] = None
    peer_cat: Optional[str] = None
    descricao: Optional[str] = None
    comentario: Optional[str] = None
