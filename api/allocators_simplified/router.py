"""
Router FastAPI para Alocadores Simplificado.

Endpoints:
- GET /allocators-simple/filters - Retorna filtros disponíveis
- GET /allocators-simple/flow - Tela 1: Fluxo do Cliente
- GET /allocators-simple/performance - Tela 2: Performance da Carteira
- GET /allocators-simple/portfolio - Tela 3: Carteira Completa
- GET /allocators-simple/fund-highlight - Ponto de destaque no boxplot
- POST /allocators-simple/build-cache - Reconstrói cache (admin)
"""

from fastapi import APIRouter, Query, HTTPException, BackgroundTasks
from typing import Optional, List
import pandas as pd

from .service import get_service
from .data_cache import get_cache
from .config import DEFAULT_WINDOWS, AVAILABLE_METRICS, ALL_WINDOWS

router = APIRouter(prefix="/allocators-simple", tags=["Alocadores Simplificado"])


@router.get("/filters")
def get_filters():
    """
    Retorna opções de filtro disponíveis.
    
    Response:
    {
        "clients": ["BTG", "XP", ...],
        "segments_by_client": {"BTG": ["BTG Asset", ...], ...},
        "peers": ["Ações", "Multimercado", "Renda Fixa"],
        "windows": ["6M", "12M", ...],
        "metrics": ["ret", "vol", ...]
    }
    """
    service = get_service()
    filters = service.get_filters()
    
    # Adicionar opções estáticas
    filters['windows'] = ALL_WINDOWS
    filters['default_windows'] = DEFAULT_WINDOWS
    filters['metrics'] = AVAILABLE_METRICS
    
    return filters


@router.get("/flow")
def get_client_flow(
    client: str = Query(..., description="Cliente selecionado"),
    peers: Optional[str] = Query(None, description="Peers separados por vírgula"),
    window: str = Query("12M", description="Janela de fluxo (6M, 12M, etc)")
):
    """
    Tela 1: Fluxo do Cliente.
    
    Retorna dados para:
    - Gráfico de barras: Fluxo por cliente_segmentado
    - Gráfico de linha: Posição histórica (5 anos)
    
    Params:
        client: Cliente único selecionado
        peers: Lista de peers (opcional, separados por vírgula)
        window: Janela de fluxo para gráfico de barras
    """
    service = get_service()
    
    # Parse peers
    peers_list = None
    if peers:
        peers_list = [p.strip() for p in peers.split(',')]
    
    result = service.get_client_flow(
        client=client,
        peers=peers_list,
        window=window
    )
    
    return result


@router.get("/performance")
def get_portfolio_performance(
    client: str = Query(..., description="Cliente selecionado"),
    segment: str = Query(..., description="Cliente segmentado"),
    peers: Optional[str] = Query(None, description="Peers separados por vírgula"),
    metric: str = Query("ret", description="Métrica para gráficos"),
    windows: Optional[str] = Query(None, description="Janelas separadas por vírgula")
):
    """
    Tela 2: Performance da Carteira.
    
    Retorna dados para:
    - Gráfico de posição: Barras ordenadas decrescente
    - Gráficos de métricas: Um por janela selecionada
    - Boxplots: Ret, Vol, MDD para todas as janelas
    - Fundos disponíveis: Para dropdown de destaque
    """
    service = get_service()
    
    # Parse peers
    peers_list = None
    if peers:
        peers_list = [p.strip() for p in peers.split(',')]
    
    # Parse windows
    windows_list = None
    if windows:
        windows_list = [w.strip() for w in windows.split(',')]
    
    result = service.get_portfolio_performance(
        client=client,
        segment=segment,
        peers=peers_list,
        metric=metric,
        windows=windows_list
    )
    
    return result


@router.get("/fund-highlight")
def get_fund_highlight(
    client: str = Query(..., description="Cliente"),
    segment: str = Query(..., description="Cliente segmentado"),
    cnpj: str = Query(..., description="CNPJ do fundo a destacar"),
    peers: Optional[str] = Query(None, description="Peers separados por vírgula")
):
    """
    Retorna pontos de destaque de um fundo para os boxplots.
    
    Usado quando o usuário seleciona um fundo diferente no dropdown.
    """
    service = get_service()
    
    peers_list = None
    if peers:
        peers_list = [p.strip() for p in peers.split(',')]
    
    result = service.get_fund_highlight_point(
        client=client,
        segment=segment,
        cnpj_fundo=cnpj,
        peers=peers_list
    )
    
    return result


@router.get("/portfolio")
def get_complete_portfolio(
    client: Optional[str] = Query(None, description="Cliente"),
    segment: Optional[str] = Query(None, description="Cliente segmentado"),
    cnpj: Optional[str] = Query(None, description="CNPJ do fundo (busca direta)")
):
    """
    Tela 3: Carteira Completa.
    
    Pode ser chamado de duas formas:
    1. Por cliente segmentado: client + segment
    2. Por CNPJ: cnpj
    
    Retorna dados para:
    - Donut chart: Hierarquia tp_aplic -> tp_ativo -> nm_ativo
    - Tabela expandível: Agrupada por tp_aplic
    """
    service = get_service()
    
    if not cnpj and (not client or not segment):
        raise HTTPException(
            status_code=400,
            detail="Forneça 'client' + 'segment' OU 'cnpj'"
        )
    
    result = service.get_complete_portfolio(
        client=client,
        segment=segment,
        cnpj_fundo=cnpj
    )
    
    return result


@router.get("/movimentacao")
def get_movimentacao(
    client: str = Query(..., description="Cliente selecionado"),
    segment: str = Query(..., description="Cliente segmentado"),
):
    """
    Carteira > Movimentação - Dados MOCK.
    
    Retorna TODOS os períodos de uma vez (1M a 60M).
    O cliente não precisa recarregar ao trocar período.
    
    Response:
    {
        "barras": {"1M": [...], "3M": [...], ...},
        "scatter": {"1M": [...], "3M": [...], ...},
        "gestores": [...],
        "periodos": ["1M", "3M", ...],
        "gestor_comparado_default": "Kinea"
    }
    """
    from .dataframes import _generate_mock_movimentacao
    
    result = _generate_mock_movimentacao(client=client, segment=segment)
    return result


@router.get("/cotas-posicao")
def get_cotas_posicao(
    client: str = Query(..., description="Cliente selecionado"),
    segment: str = Query(..., description="Cliente segmentado"),
):
    """
    Carteira > Completa - Gráfico de colunas azul decrescente.
    Posição em cotas de fundos da última carteira aberta.
    """
    from .dataframes import get_cotas_fundos_posicao
    
    df = get_cotas_fundos_posicao(client=client, segment=segment)
    
    if df.empty:
        return {"data": []}
    
    result = []
    for _, row in df.iterrows():
        result.append({
            'cnpj': row.get('cnpj_fundo_cota', ''),
            'name': str(row.get('nm_fundo_cota', ''))[:50],
            'gestor': str(row.get('gestor_cota', '')),
            'value': float(row['vl_merc_pos_final']) if pd.notnull(row['vl_merc_pos_final']) else 0
        })
    
    return {"data": result}


@router.get("/cache-status")
def get_cache_status():
    """
    Retorna status do cache.
    """
    cache = get_cache()
    metadata = cache.get_metadata()
    is_valid = cache.is_cache_valid()
    
    return {
        "is_valid": is_valid,
        "metadata": metadata,
        "cache_dir": str(cache.cache_dir)
    }


@router.post("/build-cache")
async def build_cache(background_tasks: BackgroundTasks):
    """
    Inicia rebuild do cache em background.
    
    Este endpoint dispara a reconstrução do cache em segundo plano.
    Pode demorar até 2 horas para completar.
    """
    from common.postgresql import PostgresConnector
    
    def _build_cache_task():
        try:
            db = PostgresConnector()
            cache = get_cache()
            cache.build_all(db)
        except Exception as e:
            print(f"[CACHE] Error building cache: {e}")
    
    background_tasks.add_task(_build_cache_task)
    
    return {
        "status": "started",
        "message": "Cache rebuild iniciado em background"
    }
