"""
Configuração centralizada da API.

Toda configuração editável fica AQUI — um só lugar para ajustar:
- Cache TTLs
- Highlight strings
- Cores do dashboard
- Limites de fundos
- Janelas de métricas
- Clientes permitidos
"""

from pathlib import Path
import os


# ============================================================================
# DATABASE
# ============================================================================

DB_CONNECTION = os.getenv(
    "DATABASE_URL",
    "postgresql://postgres:a@localhost:5432/postgres"
)


# ============================================================================
# CACHE
# ============================================================================

# TTL padrão para queries de banco (1 dia)
CACHE_TTL_DEFAULT = 86400

# Pasta de cache para pickle files
CACHE_DIR = Path(__file__).parent.parent / "cache"

# Pasta de cache para JSONs de allocators_simple
ALLOCATORS_CACHE_LOCAL = Path(r"E:\Cache\Finlab")
ALLOCATORS_CACHE_FALLBACK = CACHE_DIR / "allocators"

def get_allocators_cache_dir() -> Path:
    """Retorna o diretório para cache de allocators simplificado."""
    env_dir = os.environ.get("FINLAB_CACHE_DIR")
    if env_dir:
        d = Path(env_dir)
        d.mkdir(parents=True, exist_ok=True)
        return d
    if ALLOCATORS_CACHE_LOCAL.exists() or ALLOCATORS_CACHE_LOCAL.parent.exists():
        ALLOCATORS_CACHE_LOCAL.mkdir(parents=True, exist_ok=True)
        return ALLOCATORS_CACHE_LOCAL
    ALLOCATORS_CACHE_FALLBACK.mkdir(parents=True, exist_ok=True)
    return ALLOCATORS_CACHE_FALLBACK


# ============================================================================
# ALLOCATORS — FILTROS E DOMÍNIO
# ============================================================================

ALLOWED_CLIENTS = ("BTG", "XP", "Bradesco", "BB", "Empiricus", "Itaú", "Santander")
ALLOWED_PEERS = ("Ações", "Multimercado", "Renda Fixa")

# Quandos fundos exibir (top N por posição)
TOP_FUNDS_LIMIT = 30


# ============================================================================
# DASHBOARD — VISUAL
# ============================================================================

HIGHLIGHT_STRING = "KINEA"

COLOR_HIGHLIGHT = "#1e40af"
COLOR_NORMAL = "#3b82f6"
COLOR_POSITIVE = "#10b981"
COLOR_NEGATIVE = "#ef4444"
COLOR_HIGHLIGHT_ACTIVE = "#16a34a"
COLOR_HIGHLIGHT_INACTIVE = "#8b5cf6"


# ============================================================================
# JANELAS DE MÉTRICAS
# ============================================================================

ALL_WINDOWS = ["6M", "12M", "24M", "36M", "48M", "60M"]
DEFAULT_WINDOWS = ["6M", "12M", "24M", "36M"]
AVAILABLE_METRICS = [
    "ret", "vol", "mdd", "sharpe", "calmar",
    "hit_ratio", "info_ratio", "recovery_time",
]


# ============================================================================
# HELPERS
# ============================================================================

def parse_window(window_str: str) -> int:
    """Converte '12M' -> 12."""
    return int(window_str.replace("M", ""))


def sort_windows(windows: list) -> list:
    """Ordena janelas numericamente."""
    return sorted(windows, key=parse_window)
