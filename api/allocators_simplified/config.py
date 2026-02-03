"""
Configuração do Alocadores Simplificado.

Este arquivo contém todas as configurações facilmente editáveis:
- Pasta de cache (local ou Azure)
- String de destaque para gráficos
- Cores e estilos
- Janelas de métricas
- Limite de fundos por segmento
"""

from pathlib import Path
from typing import Optional
import os

# ============================================================================
# CONFIGURAÇÃO DE CACHE
# ============================================================================

# Pasta local para cache de dados (desenvolvimento)
LOCAL_CACHE_DIR = Path(r"E:\Cache\Finlab")

# Fallback se a pasta não existir
FALLBACK_CACHE_DIR = Path(__file__).parent.parent.parent / "cache" / "allocators"

def get_cache_dir() -> Path:
    """Retorna a pasta de cache configurada."""
    env_dir = os.environ.get('FINLAB_CACHE_DIR')
    if env_dir:
        cache_dir = Path(env_dir)
        cache_dir.mkdir(parents=True, exist_ok=True)
        return cache_dir
    
    if LOCAL_CACHE_DIR.exists() or LOCAL_CACHE_DIR.parent.exists():
        LOCAL_CACHE_DIR.mkdir(parents=True, exist_ok=True)
        return LOCAL_CACHE_DIR
    
    FALLBACK_CACHE_DIR.mkdir(parents=True, exist_ok=True)
    return FALLBACK_CACHE_DIR


# ============================================================================
# CONFIGURAÇÃO DE DESTAQUE (HIGHLIGHT)
# ============================================================================

# String usada para destacar fundos nos gráficos (case insensitive)
HIGHLIGHT_STRING = "KINEA"

# Cores para destaque
COLOR_HIGHLIGHT = "#1e40af"      # Azul escuro para fundos com destaque
COLOR_NORMAL = "#3b82f6"         # Azul claro para fundos normais
COLOR_POSITIVE = "#10b981"       # Verde para fluxo positivo
COLOR_NEGATIVE = "#ef4444"       # Vermelho para fluxo negativo
COLOR_HIGHLIGHT_ACTIVE = "#16a34a"   # Verde para métrica com posição E destacado
COLOR_HIGHLIGHT_INACTIVE = "#8b5cf6" # Roxo para métrica sem posição


# ============================================================================
# LIMITE DE FUNDOS POR SEGMENTO
# ============================================================================

# Quantos fundos exibir por defaul (top N por vl_merc_pos_final)
# Isso afeta os gráficos de performance e também o cache de fund_metrics
TOP_FUNDS_LIMIT = 30


# ============================================================================
# CONFIGURAÇÃO DE JANELAS DE MÉTRICAS
# ============================================================================

ALL_WINDOWS = ['6M', '12M', '24M', '36M', '48M', '60M']
DEFAULT_WINDOWS = ['6M', '12M', '24M', '36M']
AVAILABLE_METRICS = ['ret', 'vol', 'mdd', 'sharpe', 'calmar', 'hit_ratio', 'info_ratio', 'recovery_time']
DEFAULT_METRIC = 'ret'


# ============================================================================
# HELPER PARA PARSING DE JANELA
# ============================================================================

def parse_window(window_str: str) -> int:
    """Parseia string de janela para número de meses."""
    return int(window_str.replace('M', ''))

def sort_windows(windows: list) -> list:
    """Ordena lista de janelas numericamente."""
    return sorted(windows, key=parse_window)
