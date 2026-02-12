"""
Register - Arquivo central de registro de dados.

Este é O ARQUIVO mais importante para usabilidade de dados.
Cada key JSON → uma função que retorna um DataFrame.

COMO USAR:
    from register import get_dataframe, list_keys, get_all_dataframes

    # Obter um dataframe específico
    df = get_dataframe('carteira_ultima_aberta')
    
    # Listar todas as keys disponíveis
    keys = list_keys()
    
    # Obter todos os dataframes de uma visão
    dfs = get_all_dataframes(view='carteira')

COMO ADICIONAR NOVOS DADOS:
    1. Crie uma função que retorna pd.DataFrame em dataframes.py
    2. Registre aqui no REGISTRY com uma key descritiva
    3. Pronto! O frontend pode acessar via API
"""

import pandas as pd
from typing import Dict, Any, Optional, Callable, List
from . import dataframes as df_funcs


# ============================================================================
# REGISTRO CENTRAL
# ============================================================================
# Formato: 'key' -> {
#     'fn': função que retorna DataFrame,
#     'view': visão a que pertence (carteira, fluxo, movimentacao, performance),
#     'description': descrição para documentação,
#     'cache_ttl': tempo de cache em segundos (default 86400 = 24h),
# }

REGISTRY: Dict[str, Dict[str, Any]] = {
    
    # ========================================================================
    # VISÃO: FILTROS / MENU
    # ========================================================================
    'filtros_disponiveis': {
        'fn': df_funcs.get_filtros_disponiveis,
        'view': 'menu',
        'description': 'Clientes, segmentos e peers disponíveis para filtro',
    },
    
    # ========================================================================
    # VISÃO: FLUXO DO CLIENTE  
    # ========================================================================
    'fluxo_por_segmento': {
        'fn': df_funcs.get_fluxo_por_segmento,
        'view': 'fluxo',
        'description': 'Fluxo agregado por cliente_segmentado (6M a 60M)',
    },
    'posicao_historica': {
        'fn': df_funcs.get_posicao_historica,
        'view': 'fluxo',
        'description': 'Posição histórica mensal (5 anos)',
    },
    
    # ========================================================================
    # VISÃO: CARTEIRA > PERFORMANCE
    # ========================================================================
    'posicao_atual': {
        'fn': df_funcs.get_posicao_atual,
        'view': 'carteira_performance',
        'description': 'Posição atual por fundo (última data disponível)',
    },
    'metricas_fundos': {
        'fn': df_funcs.get_metricas_fundos,
        'view': 'carteira_performance',
        'description': 'Métricas de performance dos fundos investidos (ret, vol, mdd, sharpe...)',
    },
    
    # ========================================================================
    # VISÃO: CARTEIRA > COMPLETA
    # ========================================================================
    'carteira_ultima_aberta': {
        'fn': df_funcs.get_carteira_ultima_aberta,
        'view': 'carteira_completa',
        'description': 'Última carteira aberta do CVM - SELECT * FROM cvm.carteira para o segmento/cliente',
    },
    'ativos_carteira': {
        'fn': df_funcs.get_ativos_carteira,
        'view': 'carteira_completa',
        'description': 'Ativos detalhados da carteira (donut + tabela expandível)',
    },
    'cotas_fundos_posicao': {
        'fn': df_funcs.get_cotas_fundos_posicao,
        'view': 'carteira_completa',
        'description': 'Posição em cotas de fundos (gráfico de colunas decrescente azul)',
    },
    
    # ========================================================================
    # VISÃO: CARTEIRA > MOVIMENTAÇÃO (MOCK)
    # ========================================================================
    'movimentacao_barras': {
        'fn': df_funcs.get_movimentacao_barras,
        'view': 'carteira_movimentacao',
        'description': 'Gráfico de barras empilhadas - movimentação mês a mês por gestor (12 meses)',
    },
    'movimentacao_scatter': {
        'fn': df_funcs.get_movimentacao_scatter,
        'view': 'carteira_movimentacao',
        'description': 'Scatter plot - CL vs crescimento por gestor. X=crescimento, Y=movimentação',
    },
}


# ============================================================================
# API PÚBLICA
# ============================================================================

def get_dataframe(key: str, **kwargs) -> pd.DataFrame:
    """
    Retorna um DataFrame pela key do registro.
    
    Args:
        key: Chave do registro (ex: 'carteira_ultima_aberta')
        **kwargs: Parâmetros passados para a função (client, segment, etc)
    
    Returns:
        pd.DataFrame
        
    Raises:
        KeyError: Se a key não existir
    """
    if key not in REGISTRY:
        raise KeyError(
            f"Key '{key}' não encontrada. Keys disponíveis:\n"
            + "\n".join(f"  - {k}: {v['description']}" for k, v in REGISTRY.items())
        )
    return REGISTRY[key]['fn'](**kwargs)


def list_keys(view: Optional[str] = None) -> List[str]:
    """
    Lista todas as keys registradas.
    
    Args:
        view: Filtrar por visão (ex: 'carteira', 'fluxo')
    """
    if view:
        return [k for k, v in REGISTRY.items() if v['view'] == view or v['view'].startswith(view)]
    return list(REGISTRY.keys())


def get_all_dataframes(view: str, **kwargs) -> Dict[str, pd.DataFrame]:
    """
    Retorna todos os DataFrames de uma visão.
    
    Args:
        view: Nome da visão (ex: 'carteira', 'fluxo')
        **kwargs: Parâmetros passados para todas as funções
    """
    result = {}
    for key in list_keys(view):
        try:
            result[key] = REGISTRY[key]['fn'](**kwargs)
        except Exception as e:
            print(f"[register] Erro ao carregar '{key}': {e}")
            result[key] = pd.DataFrame()
    return result


def describe() -> str:
    """Retorna documentação completa do registro."""
    lines = ["=" * 70, "REGISTRO DE DADOS - FIN DATA LAB", "=" * 70, ""]
    
    current_view = None
    for key, info in REGISTRY.items():
        if info['view'] != current_view:
            current_view = info['view']
            lines.append(f"\n--- {current_view.upper()} ---\n")
        lines.append(f"  [{key}]")
        lines.append(f"    {info['description']}")
    
    lines.append(f"\nTotal de registros: {len(REGISTRY)}")
    return "\n".join(lines)
