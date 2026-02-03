from fastapi import FastAPI, HTTPException, Query, Path, BackgroundTasks
from fastapi.responses import JSONResponse
from typing import List, Optional
from datetime import date
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import asyncio
from concurrent.futures import ThreadPoolExecutor
import time

import sys
import os

# Ensure project root is in path for common imports
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

try:
    from .service import DataService
    # Try relative import first (module mode)
    from .services.allocators_service import allocators_service
    from .allocators_simplified.router import router as allocators_simplified_router
    from common.cache import cache, request_dedup, get_all_cache_info, delete_cache_file, clear_all_cache, CACHE_DIR
except ImportError:
    # Fallback for script mode (absolute imports from root handled by sys.path above)
    from service import DataService
    from services.allocators_service import allocators_service
    from allocators_simplified.router import router as allocators_simplified_router
    from common.cache import cache, request_dedup, get_all_cache_info, delete_cache_file, clear_all_cache, CACHE_DIR

app = FastAPI(title="Fin Data Lab API", description="API for CVM Fund Data")

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

service = DataService()
executor = ThreadPoolExecutor(max_workers=10)

# ============================================================================
# ROUTERS - Alocadores Simplificado
# ============================================================================
app.include_router(allocators_simplified_router)


# ============================================================================
# MIDDLEWARE PARA CONTROLE DE REQUISIÇÕES DUPLICADAS
# ============================================================================

@app.middleware("http")
async def deduplicate_requests(request, call_next):
    """
    Middleware que adiciona headers informando sobre requisições em andamento.
    """
    response = await call_next(request)
    
    # Adicionar informações sobre requisições pendentes no header
    pending = request_dedup.get_pending_requests()
    response.headers["X-Pending-Requests"] = str(len(pending))
    
    return response


# ============================================================================
# HEALTH CHECK
# ============================================================================

@app.get("/")
def health_check():
    stats = request_dedup.get_stats()
    return {
        "status": "ok", 
        "message": "Fin Data Lab API is running",
        "pending_requests": stats["pending_count"],
        "deduplicated_requests": stats["deduplicated_count"]
    }


# ============================================================================
# VERIFICAÇÃO DE STATUS DE REQUISIÇÃO
# ============================================================================

@app.get("/status")
def get_request_status():
    """
    Endpoint para verificar o status de requisições em andamento.
    Use isso para informar o usuário que a requisição está sendo processada.
    """
    pending = request_dedup.get_pending_requests()
    stats = request_dedup.get_stats()
    
    return {
        "pending_requests": pending,
        "stats": stats,
        "message": f"{len(pending)} requisição(ões) em andamento" if pending else "Nenhuma requisição em andamento"
    }


# ============================================================================
# CACHE MANAGEMENT ENDPOINTS
# ============================================================================

@app.get("/cache")
def get_cache_info():
    """Retorna informações completas sobre o cache."""
    return get_all_cache_info()


@app.delete("/cache/memory/{key}")
def delete_memory_cache(key: str):
    """Deleta uma entrada específica do cache em memória."""
    success = cache.delete(key)
    if success:
        return {"status": "ok", "message": f"Cache key '{key}' deleted"}
    raise HTTPException(status_code=404, detail="Cache key not found")


@app.delete("/cache/file/{filename}")
def delete_file_cache(filename: str):
    """Deleta um arquivo de cache específico."""
    success = delete_cache_file(filename)
    if success:
        return {"status": "ok", "message": f"Cache file '{filename}' deleted"}
    raise HTTPException(status_code=404, detail="Cache file not found")


@app.delete("/cache/all")
def clear_all_caches():
    """Limpa todos os caches (memória e arquivo)."""
    cache.clear()
    clear_all_cache()
    return {"status": "ok", "message": "All caches cleared"}


@app.delete("/cache/memory")
def clear_memory_cache():
    """Limpa apenas o cache em memória."""
    cache.clear()
    return {"status": "ok", "message": "Memory cache cleared"}


@app.delete("/cache/files")
def clear_file_cache():
    """Limpa apenas o cache em arquivo."""
    clear_all_cache()
    return {"status": "ok", "message": "File cache cleared"}


# ============================================================================
# PEER GROUPS MANAGEMENT
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

@app.get("/peer-groups")
def list_peer_groups():
    """Lista todos os peer groups."""
    return service.list_peer_groups()

@app.post("/peer-groups")
def create_peer_group(group: PeerGroupCreate):
    """Cria um novo peer group."""
    result = service.create_peer_group(group.name, group.description, group.category)
    return result

@app.get("/peer-groups/{group_id}")
def get_peer_group(group_id: int):
    """Retorna detalhes de um peer group."""
    result = service.get_peer_group(group_id)
    if not result:
        raise HTTPException(status_code=404, detail="Peer group not found")
    return result

@app.delete("/peer-groups/{group_id}")
def delete_peer_group(group_id: int):
    """Deleta um peer group."""
    success = service.delete_peer_group(group_id)
    if success:
        return {"status": "ok", "message": f"Peer group {group_id} deleted"}
    raise HTTPException(status_code=404, detail="Peer group not found")

@app.post("/peer-groups/{group_id}/funds")
def add_fund_to_peer_group(group_id: int, fund: PeerGroupFundAdd):
    """Adiciona um fundo a um peer group."""
    result = service.add_fund_to_peer_group(
        group_id, 
        fund.cnpj_fundo, 
        fund.apelido, 
        fund.peer_cat, 
        fund.descricao, 
        fund.comentario
    )
    return result

@app.put("/peer-groups/{group_id}/funds/{cnpj}")
def update_fund_in_peer_group(group_id: int, cnpj: str, fund: PeerGroupFundAdd):
    """Atualiza informações de um fundo em um peer group."""
    result = service.update_fund_in_peer_group(
        group_id,
        cnpj,
        fund.apelido,
        fund.peer_cat,
        fund.descricao,
        fund.comentario
    )
    return result

@app.delete("/peer-groups/{group_id}/funds/{cnpj}")
def remove_fund_from_peer_group(group_id: int, cnpj: str):
    """Remove um fundo de um peer group."""
    success = service.remove_fund_from_peer_group(group_id, cnpj)
    if success:
        return {"status": "ok", "message": f"Fund {cnpj} removed from group {group_id}"}
    raise HTTPException(status_code=404, detail="Fund not found in peer group")


# ============================================================================
# FUND SEARCH & DETAIL
# ============================================================================

@app.get("/funds")
def search_funds(
    q: Optional[str] = Query(None, description="Search term for fund name or CNPJ"),
    limit: int = Query(50, le=100)
):
    """Search for funds by name or CNPJ."""
    return service.search_funds(query=q, limit=limit)

@app.get("/funds/suggest")
def suggest_funds(q: str = Query(..., min_length=2)):
    return service.suggest_funds(q)


# ============================================================================
# FUND ENDPOINTS COM DEDUPLICAÇÃO DE REQUISIÇÕES
# ============================================================================

def _execute_with_dedup(endpoint: str, params_str: str, func, *args, **kwargs):
    """
    Executa uma função com controle de deduplicação.
    Se já existe uma requisição em andamento para os mesmos parâmetros,
    aguarda o resultado dela ao invés de executar novamente.
    """
    key = request_dedup.get_request_key(endpoint, *args, **kwargs)
    is_new, existing_future = request_dedup.get_or_create(key, endpoint, params_str)
    
    if not is_new:
        # Já existe uma requisição em andamento, aguardar resultado
        try:
            return existing_future.result(timeout=300)  # 5 min timeout
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error waiting for result: {str(e)}")
    
    try:
        # Executar a função
        result = func(*args, **kwargs)
        request_dedup.complete(key, result)
        return result
    except Exception as e:
        request_dedup.complete(key, None, e)
        raise


@app.get("/funds/{cnpj:path}/history")
def get_fund_history(
    cnpj: str = Path(..., description="Fund CNPJ (e.g., 29.206.196/0001-57)"),
    start_date: Optional[date] = Query(None, description="Start date for history (YYYY-MM-DD)")
):
    """Get historical quota data for a fund."""
    return _execute_with_dedup(
        "fund_history",
        f"cnpj={cnpj}&start_date={start_date}",
        service.get_fund_history,
        cnpj, start_date
    )


@app.get("/funds/{cnpj:path}/metrics")
def get_fund_metrics(cnpj: str = Path(...)):
    """Get performance metrics for a fund."""
    result = _execute_with_dedup(
        "fund_metrics",
        f"cnpj={cnpj}",
        service.get_fund_metrics,
        cnpj
    )
    if not result:
        raise HTTPException(status_code=404, detail="Metrics not found")
    return result


@app.get("/funds/{cnpj:path}/composition")
def get_fund_composition(cnpj: str = Path(...)):
    """Get portfolio composition summary by asset type."""
    result = _execute_with_dedup(
        "fund_composition",
        f"cnpj={cnpj}",
        service.get_fund_composition,
        cnpj
    )
    if not result:
        raise HTTPException(status_code=404, detail="Composition not found")
    return result


@app.get("/funds/{cnpj:path}/portfolio")
def get_portfolio_detailed(cnpj: str = Path(...)):
    """Get detailed portfolio with all assets by block (BLC 1-8)."""
    result = _execute_with_dedup(
        "fund_portfolio",
        f"cnpj={cnpj}",
        service.get_portfolio_detailed,
        cnpj
    )
    if not result:
        raise HTTPException(status_code=404, detail="Portfolio not found")
    return result


@app.get("/funds/{cnpj:path}/structure")
def get_fund_structure(cnpj: str = Path(...)):
    """Get fund structure and relationships."""
    result = _execute_with_dedup(
        "fund_structure",
        f"cnpj={cnpj}",
        service.get_fund_structure,
        cnpj
    )
    if not result:
        raise HTTPException(status_code=404, detail="Structure not found")
    return result


@app.get("/funds/{cnpj:path}/top-assets")
def get_top_assets(
    cnpj: str = Path(...),
    limit: int = Query(10, le=50)
):
    """Get top assets in the portfolio by value."""
    return _execute_with_dedup(
        "fund_top_assets",
        f"cnpj={cnpj}&limit={limit}",
        service.get_top_assets,
        cnpj, limit
    )


# Este endpoint deve vir por ÚLTIMO para não conflitar com os outros paths
@app.get("/funds/{cnpj:path}")
def get_fund_details(cnpj: str = Path(...)):
    """Get detailed information about a specific fund."""
    result = _execute_with_dedup(
        "fund_detail",
        f"cnpj={cnpj}",
        service.get_fund_detail,
        cnpj
    )
    if not result:
        raise HTTPException(status_code=404, detail="Fund not found")
    return result


# ============================================================================
# ALLOCATORS ENDPOINTS (NEW - Using AllocatorsService)
# ============================================================================

@app.get("/allocators/filters")
def get_allocator_filters():
    """Get available filter options for allocators dashboard."""
    return allocators_service.get_filters()


@app.get("/allocators/flow")
def get_allocator_flow(
    client: Optional[str] = None, 
    segment: Optional[str] = None, 
    peer: Optional[str] = None,
    window: int = 12
):
    """Get flow and position data for allocators (Fluxo e Posição tab)."""
    return allocators_service.get_flow_position_data(client, segment, peer, window)


@app.get("/allocators/performance")
def get_allocator_performance(
    client: Optional[str] = None, 
    segment: Optional[str] = None,
    peer: Optional[str] = None
):
    """Get performance data for allocators (Performance tab)."""
    return allocators_service.get_performance_data(client, segment, peer)


@app.get("/allocators/allocation")
def get_allocator_allocation(
    client: Optional[str] = None, 
    segment: Optional[str] = None,
    peer: Optional[str] = None
):
    """Get allocation data for allocators (Alocação tab)."""
    return allocators_service.get_allocation_data(client, segment, peer)



if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
