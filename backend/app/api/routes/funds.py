from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select

from app.db.database import get_session
from app.models.fund import Fund
from app.schemas.fund import FundCreate, FundRead

router = APIRouter(prefix="/funds", tags=["funds"])


@router.post("/", response_model=FundRead, status_code=status.HTTP_201_CREATED)
def create_fund(*, session: Session = Depends(get_session), fund: FundCreate):
    """Cria um novo fundo no banco de dados."""
    try:
        db_fund = Fund.model_validate(fund)
        session.add(db_fund)
        session.commit()
        session.refresh(db_fund)
        return db_fund
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=f"Erro ao criar fundo: {e}"
        )


@router.get("/", response_model=List[FundRead])
def read_funds(
    *, session: Session = Depends(get_session), skip: int = 0, limit: int = 10
):
    """Lista todos os fundos com paginação."""
    try:
        funds = session.exec(select(Fund).offset(skip).limit(limit)).all()
        return funds
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao buscar fundos: {e}",
        )


@router.get("/{cnpj}", response_model=FundRead)
def read_fund_by_cnpj(*, session: Session = Depends(get_session), cnpj: str):
    """Busca um fundo específico pelo CNPJ."""
    try:
        fund = session.exec(select(Fund).where(Fund.cnpj == cnpj)).first()
        if not fund:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Fundo não encontrado")
        return fund
    except HTTPException as http_e:
        raise http_e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao buscar fundo por CNPJ: {e}",
        )
