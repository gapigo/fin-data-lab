from typing import Optional
from datetime import datetime

from sqlmodel import Field, SQLModel


class Fund(SQLModel, table=True):
    """SQLModel for a financial fund."""

    id: Optional[int] = Field(default=None, primary_key=True)
    cnpj: str = Field(index=True, unique=True, max_length=18)
    nome: str = Field(index=True)
    patrimonio_liquido: Optional[float] = Field(default=None, nullable=True)
    data_constituicao: datetime
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)
    updated_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)

    # TODO: Adicionar relacionamento com dados de cotas e outros se necessário
