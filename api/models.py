from datetime import date, datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel

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
    condom: Optional[str] = None  # aberto ou fechado
    fundo_exclusivo: Optional[str] = None
    fundo_cotas: Optional[str] = None  # FIC ou não
    peer_grupo: Optional[str] = None
    peer_detalhado: Optional[str] = None

class QuotaData(BaseModel):
    dt_comptc: date
    vl_quota: float
    vl_patrim_liq: Optional[float] = None
    vl_total: Optional[float] = None
    captc_dia: Optional[float] = None
    resg_dia: Optional[float] = None
    nr_cotst: Optional[int] = None

class FundHistory(BaseModel):
    cnpj_fundo: str

class FundMetrics(BaseModel):
    rentabilidade_mes: dict  # {year: {month: value}}
    rentabilidade_ano: dict # {year: value}
    rentabilidade_acumulada: dict # {year: value}
    volatilidade_12m: Optional[float] = None
    sharpe_12m: Optional[float] = None
    consistency: dict # {pos_months: int, neg_months: int, ...}

class CompositionItem(BaseModel):
    name: str
    value: float
    percentage: float

class FundComposition(BaseModel):
    items: List[CompositionItem]
    date: Optional[str] = None

# ============ NOVOS MODELOS PARA CARTEIRA DETALHADA ============

class AssetPosition(BaseModel):
    """Posição genérica de um ativo na carteira"""
    nome: str
    valor: float
    percentual: float
    tipo: Optional[str] = None
    cnpj_emissor: Optional[str] = None
    dt_venc: Optional[str] = None
    extra: Optional[Dict[str, Any]] = None

class PortfolioBlock(BaseModel):
    """Bloco de ativos (títulos públicos, ações, etc)"""
    tipo: str
    nome_display: str
    total_valor: float
    total_percentual: float
    ativos: List[AssetPosition]

class PortfolioDetailed(BaseModel):
    """Carteira completa do fundo com todos os blocos"""
    cnpj_fundo: str
    dt_comptc: Optional[str] = None
    vl_patrim_liq: Optional[float] = None
    blocos: List[PortfolioBlock]
    resumo: Dict[str, float]  # {tipo: percentual total}

class FundRelationship(BaseModel):
    """Relacionamento entre fundos (FIC, espelhos, etc)"""
    cnpj_fundo: str
    cnpj_relacionado: str
    nome_relacionado: str
    tipo_relacao: str  # "INVESTE_EM" ou "INVESTIDO_POR" ou "ESPELHO"
    valor: Optional[float] = None
    percentual: Optional[float] = None

class FundStructure(BaseModel):
    """Estrutura do fundo incluindo feeders e master"""
    cnpj_fundo: str
    nome_fundo: str
    tipo: Optional[str] = None  # FIC, FI, MASTER
    investe_em: List[FundRelationship]
    investido_por: List[FundRelationship]
    espelho_de: Optional[str] = None

class TopAsset(BaseModel):
    """Ativo de maior posição na carteira"""
    codigo: Optional[str] = None
    nome: str
    setor: Optional[str] = None
    valor: float
    percentual: float
    tipo: str  # acao, titulo_publico, credito_privado, cota_fundo

class FundLamina(BaseModel):
    """Dados da lâmina do fundo"""
    objetivo: Optional[str] = None
    politica_investimento: Optional[str] = None
    taxa_administracao: Optional[str] = None
    taxa_performance: Optional[str] = None
    rentabilidade_meses: Optional[Dict[str, float]] = None
    benchmark: Optional[str] = None
