from datetime import datetime
from typing import Optional

from pydantic import Field
from sqlmodel import SQLModel


class FundBase(SQLModel):
    """Base schema for a financial fund."""

    cnpj: str = Field(..., description="CNPJ do fundo (identificador único)", max_length=18)
    nome: str = Field(..., description="Nome do fundo de investimento")
    data_constituicao: datetime = Field(..., description="Data de constituição do fundo")
    patrimonio_liquido: Optional[float] = Field(
        default=None, description="Patrimônio líquido atual do fundo", gt=0
    )


class FundCreate(FundBase):
    """Schema for creating a new fund."""

    pass  # No additional fields for creation beyond FundBase


class FundRead(FundBase):
    """Schema for reading fund data, including database-generated fields."""

    id: int = Field(..., description="ID único do fundo")
    created_at: datetime = Field(..., description="Timestamp de criação do registro")
    updated_at: datetime = Field(..., description="Timestamp da última atualização do registro")
