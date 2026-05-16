"""
Fund Router — endpoints para busca, detalhe, histórico, portfolio.

Thin controller: recebe HTTP, delega ao service, retorna JSON.
"""

from fastapi import APIRouter, HTTPException, Query, Path
from typing import Optional
from datetime import date

from ..dependencies import get_db, get_dedup
from ..repositories.fund_repo import FundRepository
from ..services.fund_service import FundService
from ..repositories.base import BaseRepository

router = APIRouter(tags=["Funds"])

# ── Factory para service (evita criação repetida) ────────────────────────
_service: Optional[FundService] = None


def _get_service() -> FundService:
    global _service
    if _service is None:
        _service = FundService(FundRepository(get_db()))
    return _service


def _dedup_exec(endpoint: str, params: str, func, *args, **kwargs):
    """Executa com controle de dedup."""
    dedup = get_dedup()
    key = dedup.get_request_key(endpoint, *args, **kwargs)
    is_new, future = dedup.get_or_create(key, endpoint, params)
    if not is_new:
        try:
            return future.result(timeout=300)
        except Exception as e:
            raise HTTPException(500, f"Error waiting: {e}")
    try:
        result = func(*args, **kwargs)
        dedup.complete(key, result)
        return result
    except Exception as e:
        dedup.complete(key, None, e)
        raise


# ── SEARCH ───────────────────────────────────────────────────────────────

@router.get("/funds")
def search_funds(q: Optional[str] = Query(None), limit: int = Query(50, le=100)):
    return _get_service().search_funds(query=q, limit=limit)


@router.get("/funds/suggest")
def suggest_funds(q: str = Query(..., min_length=2)):
    return _get_service().suggest_funds(q)


# ── DETAIL ───────────────────────────────────────────────────────────────

@router.get("/funds/{cnpj:path}/history")
def get_fund_history(
    cnpj: str = Path(...),
    start_date: Optional[date] = Query(None),
):
    return _dedup_exec("fund_history", f"cnpj={cnpj}", _get_service().get_fund_history, cnpj, start_date)


@router.get("/funds/{cnpj:path}/metrics")
def get_fund_metrics(cnpj: str = Path(...)):
    result = _dedup_exec("fund_metrics", f"cnpj={cnpj}", _get_service().get_fund_metrics, cnpj)
    if not result:
        raise HTTPException(404, "Metrics not found")
    return result


@router.get("/funds/{cnpj:path}/composition")
def get_fund_composition(cnpj: str = Path(...)):
    result = _dedup_exec("fund_composition", f"cnpj={cnpj}", _get_service().get_fund_composition, cnpj)
    if not result:
        raise HTTPException(404, "Composition not found")
    return result


@router.get("/funds/{cnpj:path}/portfolio")
def get_portfolio_detailed(cnpj: str = Path(...)):
    result = _dedup_exec("fund_portfolio", f"cnpj={cnpj}", _get_service().get_portfolio_detailed, cnpj)
    if not result:
        raise HTTPException(404, "Portfolio not found")
    return result


@router.get("/funds/{cnpj:path}/structure")
def get_fund_structure(cnpj: str = Path(...)):
    result = _dedup_exec("fund_structure", f"cnpj={cnpj}", _get_service().get_fund_structure, cnpj)
    if not result:
        raise HTTPException(404, "Structure not found")
    return result


@router.get("/funds/{cnpj:path}/graph")
def get_fund_graph(cnpj: str = Path(...)):
    clean = BaseRepository.normalize_cnpj(cnpj)
    df = _get_service().repo.db.read_sql("""
        SELECT 
            b.cnpj_fundo as source,
            b.cnpj_fundo_cota as target,
            MAX(b.nm_fundo_cota) as target_name,
            SUM(b.vl_merc_pos_final) as value,
            MAX(c.classe) as target_classe
        FROM cvm.cda_fi_blc_2 b
        LEFT JOIN cvm.cadastro c ON c.cnpj_fundo = b.cnpj_fundo_cota
        WHERE b.cnpj_fundo = :cnpj
        AND b.dt_comptc = (
            SELECT MAX(dt_comptc) FROM cvm.cda_fi_blc_2 WHERE cnpj_fundo = :cnpj
        )
        AND b.cnpj_fundo_cota IS NOT NULL
        GROUP BY b.cnpj_fundo, b.cnpj_fundo_cota
        ORDER BY value DESC
        LIMIT 50
    """, {"cnpj": clean})
    
    nodes = [{"id": clean, "name": "", "pl": 0, "classe": "source", "isRoot": True}]
    links = []
    
    total_value = df['value'].sum() if len(df) > 0 else 1
    
    for _, row in df.iterrows():
        nodes.append({
            "id": row['target'],
            "name": row['target_name'] or row['target'],
            "pl": float(row['value']),
            "classe": row['target_classe'] or 'Outros'
        })
        links.append({
            "source": clean,
            "target": row['target'],
            "weight": float(row['value']) / total_value if total_value > 0 else 0
        })
    
    return {"nodes": nodes, "links": links}


@router.get("/funds/{cnpj:path}/top-assets")
def get_top_assets(cnpj: str = Path(...), limit: int = Query(10, le=50)):
    return _dedup_exec("fund_top_assets", f"cnpj={cnpj}", _get_service().get_top_assets, cnpj, limit)


# ⚠️ Este endpoint DEVE vir por último para não conflitar com sub-paths
@router.get("/funds/{cnpj:path}")
def get_fund_details(cnpj: str = Path(...)):
    result = _dedup_exec("fund_detail", f"cnpj={cnpj}", _get_service().get_fund_detail, cnpj)
    if not result:
        raise HTTPException(404, "Fund not found")
    return result
