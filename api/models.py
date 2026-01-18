from datetime import date, datetime
from typing import List, Optional
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
    # Add other fields as necessary

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
    history: List[QuotaData]
