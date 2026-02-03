"""
Queries SQL para Alocadores Simplificado.

IMPORTANTE: Este arquivo é o ponto central para edição de queries.
Cada query tem um nome único e pode ser facilmente modificada.

O conceito aqui é "query-centered" - todas as queries ficam neste arquivo
e são referenciadas pelo nome em outros módulos.
"""

# ============================================================================
# QUERIES PARA TELA 1: FLUXO DO CLIENTE
# ============================================================================

# Gráfico de colunas - Fluxo por cliente segmentado
FLOW_BY_SEGMENT = """
WITH depara_fundo_cliente AS (
    SELECT DISTINCT cliente, cliente_segmentado, cnpj_fundo 
    FROM cvm.carteira
)
SELECT 
    dep.cliente, 
    dep.cliente_segmentado, 
    fluxo_veiculos.peer_ativo, 
    SUM(fluxo_6m) AS fluxo_6m, 
    SUM(fluxo_12m) AS fluxo_12m, 
    SUM(fluxo_24m) AS fluxo_24m, 
    SUM(fluxo_36m) AS fluxo_36m, 
    SUM(fluxo_48m) AS fluxo_48m, 
    SUM(fluxo_60m) AS fluxo_60m
FROM alocadores.fluxo_veiculos
LEFT JOIN depara_fundo_cliente dep ON dep.cnpj_fundo = fluxo_veiculos.cnpj_fundo
GROUP BY dep.cliente, dep.cliente_segmentado, fluxo_veiculos.peer_ativo
"""

# Gráfico de linha - Histórico de posição (5 anos)
HISTORICAL_POSITION = """
SELECT 
    cliente, 
    cliente_segmentado, 
    peer, 
    dt_comptc, 
    SUM(vl_merc_pos_final) AS vl_merc_pos_final 
FROM cvm.carteira  
GROUP BY cliente, cliente_segmentado, peer, dt_comptc
"""


# ============================================================================
# QUERIES PARA TELA 2: PERFORMANCE DA CARTEIRA
# ============================================================================

# Gráfico de colunas de posição - Posição atual por fundo
CURRENT_POSITION = """
SELECT 
    dt_comptc, 
    cliente, 
    cliente_segmentado, 
    cnpj_fundo_cota, 
    nm_fundo_cota, 
    gestor_cota, 
    peer, 
    SUM(vl_merc_pos_final) AS vl_merc_pos_final
FROM cvm.carteira
WHERE dt_comptc = '2025-06-30'
GROUP BY dt_comptc, cliente, cliente_segmentado, cnpj_fundo_cota, nm_fundo_cota, gestor_cota, peer
"""

# Gráfico de métricas e boxplots - Métricas por fundo
FUND_METRICS = """
WITH ultima_carteira_aberta AS (
    SELECT 
        dt_comptc, 
        cliente, 
        cliente_segmentado, 
        cnpj_fundo_cota, 
        nm_fundo_cota, 
        gestor_cota, 
        peer, 
        SUM(vl_merc_pos_final) AS vl_merc_pos_final
    FROM cvm.carteira
    WHERE dt_comptc = '2025-06-30'
    GROUP BY dt_comptc, cliente, cliente_segmentado, cnpj_fundo_cota, nm_fundo_cota, gestor_cota, peer
),
metrics AS (
    SELECT 
        metrics.cnpj_fundo, 
        metrics.janela, 
        metrics.ret, 
        metrics.vol, 
        metrics.mdd, 
        metrics.recovery_time, 
        metrics.sharpe, 
        metrics.calmar, 
        metrics.hit_ratio, 
        metrics.info_ratio 
    FROM cvm.metrics
    INNER JOIN (
        SELECT cnpj_fundo, id_subclasse, MAX(dt_comptc) AS dt_comptc 
        FROM cvm.metrics 
        GROUP BY cnpj_fundo, id_subclasse
    ) max_dates
    ON max_dates.cnpj_fundo = metrics.cnpj_fundo 
       AND max_dates.id_subclasse = metrics.id_subclasse
    WHERE metrics.id_subclasse IN (SELECT DISTINCT id_subclasse FROM cvm.subs_principais) 
       OR metrics.id_subclasse LIKE '%MASTER%'
)
SELECT 
    ultima_aberta.cliente, 
    ultima_aberta.cliente_segmentado, 
    metrics.cnpj_fundo, 
    ultima_aberta.nm_fundo_cota, 
    ultima_aberta.peer,
    ultima_aberta.vl_merc_pos_final,
    metrics.janela, 
    metrics.ret, 
    metrics.vol, 
    metrics.mdd, 
    metrics.recovery_time, 
    metrics.sharpe, 
    metrics.calmar, 
    metrics.hit_ratio, 
    metrics.info_ratio
FROM ultima_carteira_aberta ultima_aberta 
LEFT JOIN metrics ON metrics.cnpj_fundo = ultima_aberta.cnpj_fundo_cota
"""


# ============================================================================
# QUERIES PARA TELA 3: CARTEIRA COMPLETA
# ============================================================================

# Gráfico donut e tabela detalhada - Ativos da carteira
PORTFOLIO_ASSETS = """
WITH depara_fundo_cliente AS (
    SELECT DISTINCT cliente, cliente_segmentado, cnpj_fundo 
    FROM cvm.carteira
)
SELECT 
    depara_fundo_cliente.cliente, 
    depara_fundo_cliente.cliente_segmentado, 
    ativos_carteira.cnpj_fundo, 
    ativos_carteira.tp_aplic,
    ativos_carteira.tp_ativo,
    ativos_carteira.vl_merc_pos_final, 
    ativos_carteira.nm_ativo, 
    ativos_carteira.cd_ativo, 
    ativos_carteira.tp_cd_ativo 
FROM cvm.ativos_carteira 
LEFT JOIN depara_fundo_cliente ON depara_fundo_cliente.cnpj_fundo = ativos_carteira.cnpj_fundo
WHERE dt_comptc = '2025-06-30'
"""


# ============================================================================
# QUERY PARA MENU/OPÇÕES DISPONÍVEIS
# ============================================================================

# Lista de clientes e segmentos disponíveis (sem filtro - pega tudo)
AVAILABLE_OPTIONS = """
SELECT DISTINCT 
    cliente, 
    cliente_segmentado,
    peer
FROM cvm.carteira
WHERE cliente IS NOT NULL
  AND cliente_segmentado IS NOT NULL
ORDER BY cliente, cliente_segmentado
"""


# ============================================================================
# MAPEAMENTO DE QUERIES POR NOME
# ============================================================================

QUERIES = {
    # Tela 1: Fluxo do Cliente
    'flow_by_segment': FLOW_BY_SEGMENT,
    'historical_position': HISTORICAL_POSITION,
    
    # Tela 2: Performance
    'current_position': CURRENT_POSITION,
    'fund_metrics': FUND_METRICS,
    
    # Tela 3: Carteira Completa
    'portfolio_assets': PORTFOLIO_ASSETS,
    
    # Menu
    'available_options': AVAILABLE_OPTIONS,
}


def get_query(name: str) -> str:
    """
    Retorna uma query pelo nome.
    
    Args:
        name: Nome da query conforme definido em QUERIES
        
    Returns:
        String SQL da query
        
    Raises:
        KeyError: Se o nome da query não existir
    """
    if name not in QUERIES:
        raise KeyError(f"Query '{name}' não encontrada. Queries disponíveis: {list(QUERIES.keys())}")
    return QUERIES[name]


def list_queries() -> list:
    """Retorna lista de nomes de queries disponíveis."""
    return list(QUERIES.keys())
