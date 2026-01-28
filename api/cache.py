"""
Sistema robusto de cache para a API Fin Data Lab.

Inclui:
- SimpleCache: Cache em memória com TTL
- @tmp decorator: Cache em arquivo .pkl
- RequestDeduplicator: Controle de requisições em andamento para evitar duplicação
- Funções utilitárias para gerenciamento de cache
"""
import time
import threading
import hashlib
import pickle
import os
import functools
from pathlib import Path
from typing import Any, Dict, Tuple, Callable, Optional, List
from concurrent.futures import Future
from dataclasses import dataclass
from datetime import datetime


# ============================================================================
# SIMPLE IN-MEMORY CACHE
# ============================================================================

class SimpleCache:
    """In-memory cache with TTL support."""
    
    def __init__(self, default_ttl: int = 86400):  # 1 day default
        self._cache: Dict[str, Tuple[float, Any]] = {}
        self._default_ttl = default_ttl
        self._lock = threading.Lock()

    def get(self, key: str) -> Any:
        with self._lock:
            if key in self._cache:
                expiry, value = self._cache[key]
                if time.time() < expiry:
                    return value
                else:
                    del self._cache[key]
        return None

    def set(self, key: str, value: Any, ttl: int = None):
        if ttl is None:
            ttl = self._default_ttl
        with self._lock:
            self._cache[key] = (time.time() + ttl, value)

    def delete(self, key: str) -> bool:
        with self._lock:
            if key in self._cache:
                del self._cache[key]
                return True
            return False

    def clear(self):
        with self._lock:
            self._cache.clear()

    def keys(self) -> List[str]:
        with self._lock:
            current_time = time.time()
            return [k for k, (expiry, _) in self._cache.items() if current_time < expiry]

    def get_all_entries(self) -> List[dict]:
        """Return all cache entries with metadata for admin interface."""
        with self._lock:
            current_time = time.time()
            entries = []
            for key, (expiry, value) in self._cache.items():
                if current_time < expiry:
                    entries.append({
                        "key": key,
                        "expires_at": datetime.fromtimestamp(expiry).isoformat(),
                        "ttl_remaining": int(expiry - current_time),
                        "value_type": type(value).__name__,
                        "value_size": len(str(value)) if value else 0
                    })
            return entries


# Global cache instance - 1 day default (86400 seconds)
cache = SimpleCache(default_ttl=86400)


# ============================================================================
# REQUEST DEDUPLICATOR - Evita requisições duplicadas
# ============================================================================

@dataclass
class PendingRequest:
    """Representa uma requisição em andamento."""
    key: str
    started_at: float
    future: Future
    endpoint: str
    params: str


class RequestDeduplicator:
    """
    Controla requisições em andamento para evitar duplicação.
    
    Quando uma requisição chega e já existe uma igual em andamento:
    - Não inicia uma nova requisição
    - Aguarda o resultado da requisição existente
    - Retorna o mesmo resultado para ambas
    
    Isso é crucial para APIs lentas com múltiplos clientes fazendo
    as mesmas requisições simultaneamente.
    """
    
    def __init__(self, timeout: int = 300):  # 5 min timeout
        self._pending: Dict[str, PendingRequest] = {}
        self._lock = threading.Lock()
        self._timeout = timeout
        self._completed_count = 0
        self._deduplicated_count = 0

    def get_request_key(self, endpoint: str, *args, **kwargs) -> str:
        """Gera uma chave única para a requisição."""
        try:
            params_repr = str((args, sorted(kwargs.items())))
            params_hash = hashlib.md5(params_repr.encode()).hexdigest()[:16]
            return f"{endpoint}:{params_hash}"
        except Exception:
            return f"{endpoint}:{time.time()}"

    def get_or_create(self, key: str, endpoint: str, params_str: str) -> Tuple[bool, Optional[Future]]:
        """
        Verifica se já existe uma requisição em andamento para esta chave.
        
        Returns:
            (is_new, future): 
            - Se is_new=True, é uma nova requisição e future é None
            - Se is_new=False, já existe uma requisição e future é o Future dela
        """
        with self._lock:
            # Limpar requisições expiradas
            current_time = time.time()
            expired = [k for k, v in self._pending.items() 
                      if current_time - v.started_at > self._timeout]
            for k in expired:
                del self._pending[k]
            
            # Verificar se já existe
            if key in self._pending:
                self._deduplicated_count += 1
                return (False, self._pending[key].future)
            
            # Criar nova entrada
            future = Future()
            self._pending[key] = PendingRequest(
                key=key,
                started_at=current_time,
                future=future,
                endpoint=endpoint,
                params=params_str
            )
            return (True, None)

    def complete(self, key: str, result: Any, error: Exception = None):
        """Marca uma requisição como completa e notifica todos os aguardando."""
        with self._lock:
            if key in self._pending:
                future = self._pending[key].future
                del self._pending[key]
                self._completed_count += 1
                
                if error:
                    future.set_exception(error)
                else:
                    future.set_result(result)

    def get_pending_requests(self) -> List[dict]:
        """Retorna lista de requisições em andamento para admin."""
        with self._lock:
            current_time = time.time()
            return [{
                "key": req.key,
                "endpoint": req.endpoint,
                "params": req.params,
                "running_for": int(current_time - req.started_at),
                "started_at": datetime.fromtimestamp(req.started_at).isoformat()
            } for req in self._pending.values()]

    def get_stats(self) -> dict:
        """Retorna estatísticas do deduplicador."""
        with self._lock:
            return {
                "pending_count": len(self._pending),
                "completed_count": self._completed_count,
                "deduplicated_count": self._deduplicated_count,
                "timeout": self._timeout
            }


# Global request deduplicator
request_dedup = RequestDeduplicator(timeout=300)


# ============================================================================
# FILE-BASED CACHE DECORATOR (@tmp)
# ============================================================================

# Define cache directory at repository root
CACHE_DIR = Path(__file__).parent.parent / "cache"


def _get_params_hash(args: tuple, kwargs: dict) -> str:
    """Generate a hash from function parameters."""
    try:
        params_repr = str((args, sorted(kwargs.items())))
        return hashlib.md5(params_repr.encode()).hexdigest()[:16]
    except Exception:
        try:
            params_bytes = pickle.dumps((args, kwargs))
            return hashlib.md5(params_bytes).hexdigest()[:16]
        except Exception:
            return hashlib.md5(str(time.time()).encode()).hexdigest()[:16]


def _ensure_cache_dir():
    """Create cache directory if it doesn't exist."""
    if not CACHE_DIR.exists():
        CACHE_DIR.mkdir(parents=True, exist_ok=True)


def _parse_cache_filename(filename: str) -> Optional[Tuple[str, str, int]]:
    """Parse cache filename to extract function name, params hash, and unix time."""
    if not filename.endswith('.pkl'):
        return None
    
    name = filename[:-4]
    parts = name.rsplit('_', 2)
    
    if len(parts) != 3:
        return None
    
    func_name, params_hash, unix_time_str = parts
    
    try:
        unix_time = int(unix_time_str)
        return (func_name, params_hash, unix_time)
    except ValueError:
        return None


def _cleanup_expired_cache(func_name: str, ttl: int):
    """Remove expired cache files for a specific function."""
    if not CACHE_DIR.exists():
        return
    
    current_time = time.time()
    
    for cache_file in CACHE_DIR.glob(f"{func_name}_*.pkl"):
        parsed = _parse_cache_filename(cache_file.name)
        if parsed:
            _, _, unix_time = parsed
            if current_time > unix_time + ttl:
                try:
                    cache_file.unlink()
                except Exception:
                    pass


def _find_valid_cache(func_name: str, params_hash: str, ttl: int) -> Optional[Path]:
    """Find a valid (non-expired) cache file for the given function and params hash."""
    if not CACHE_DIR.exists():
        return None
    
    current_time = time.time()
    
    for cache_file in CACHE_DIR.glob(f"{func_name}_{params_hash}_*.pkl"):
        parsed = _parse_cache_filename(cache_file.name)
        if parsed:
            _, file_params_hash, unix_time = parsed
            if file_params_hash == params_hash:
                if current_time <= unix_time + ttl:
                    return cache_file
    
    return None


def _remove_old_cache_for_params(func_name: str, params_hash: str):
    """Remove old cache files for the same function and params hash."""
    if not CACHE_DIR.exists():
        return
    
    for cache_file in CACHE_DIR.glob(f"{func_name}_{params_hash}_*.pkl"):
        try:
            cache_file.unlink()
        except Exception:
            pass


def tmp(ttl: int = 86400):
    """
    File-based cache decorator that saves function results as pickle files.
    
    Features:
    - Caches function results based on parameter hash
    - Saves pickle files to the 'cache' directory in repository root
    - Automatically creates cache directory if it doesn't exist
    - Removes expired cache files on cleanup
    - File naming: {function_name}_{params_hash}_{unix_time}.pkl
    
    Args:
        ttl: Time-to-live in seconds (default: 86400 = 1 day)
    """
    def decorator(func: Callable) -> Callable:
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            _ensure_cache_dir()
            
            func_name = func.__name__
            params_hash = _get_params_hash(args, kwargs)
            
            # Try to find valid cache
            cached_file = _find_valid_cache(func_name, params_hash, ttl)
            
            if cached_file:
                try:
                    with open(cached_file, 'rb') as f:
                        result = pickle.load(f)
                    return result
                except Exception:
                    pass
            
            # Execute function
            result = func(*args, **kwargs)
            
            # Remove old cache files for same params
            _remove_old_cache_for_params(func_name, params_hash)
            
            # Save new cache file
            unix_time = int(time.time())
            cache_filename = f"{func_name}_{params_hash}_{unix_time}.pkl"
            cache_path = CACHE_DIR / cache_filename
            
            try:
                with open(cache_path, 'wb') as f:
                    pickle.dump(result, f)
            except Exception:
                pass
            
            # Cleanup expired cache files
            try:
                _cleanup_expired_cache(func_name, ttl)
            except Exception:
                pass
            
            return result
        
        def clear_cache():
            """Clear all cache files for this function."""
            if CACHE_DIR.exists():
                for cache_file in CACHE_DIR.glob(f"{func.__name__}_*.pkl"):
                    try:
                        cache_file.unlink()
                    except Exception:
                        pass
        
        wrapper.clear_cache = clear_cache
        return wrapper
    
    return decorator


# ============================================================================
# CACHE MANAGEMENT FUNCTIONS
# ============================================================================

def clear_all_cache():
    """Clear all cache files in the cache directory."""
    if CACHE_DIR.exists():
        for cache_file in CACHE_DIR.glob("*.pkl"):
            try:
                cache_file.unlink()
            except Exception:
                pass


def delete_cache_file(filename: str) -> bool:
    """Delete a specific cache file."""
    if not CACHE_DIR.exists():
        return False
    
    cache_path = CACHE_DIR / filename
    if cache_path.exists():
        try:
            cache_path.unlink()
            return True
        except Exception:
            return False
    return False


def get_cache_stats() -> Dict[str, Any]:
    """Get statistics about the current cache."""
    if not CACHE_DIR.exists():
        return {"total_files": 0, "total_size_mb": 0, "functions": {}, "files": []}
    
    stats = {
        "total_files": 0,
        "total_size_mb": 0,
        "functions": {},
        "files": []
    }
    
    current_time = time.time()
    
    for cache_file in CACHE_DIR.glob("*.pkl"):
        file_stat = cache_file.stat()
        stats["total_files"] += 1
        stats["total_size_mb"] += file_stat.st_size / (1024 * 1024)
        
        parsed = _parse_cache_filename(cache_file.name)
        if parsed:
            func_name, params_hash, unix_time = parsed
            if func_name not in stats["functions"]:
                stats["functions"][func_name] = 0
            stats["functions"][func_name] += 1
            
            # Add file info
            stats["files"].append({
                "filename": cache_file.name,
                "function": func_name,
                "params_hash": params_hash,
                "created_at": datetime.fromtimestamp(unix_time).isoformat(),
                "age_seconds": int(current_time - unix_time),
                "size_bytes": file_stat.st_size
            })
    
    stats["total_size_mb"] = round(stats["total_size_mb"], 2)
    return stats


def get_all_cache_info() -> dict:
    """Get complete cache information for admin interface."""
    file_cache = get_cache_stats()
    memory_cache = cache.get_all_entries()
    pending = request_dedup.get_pending_requests()
    dedup_stats = request_dedup.get_stats()
    
    return {
        "file_cache": file_cache,
        "memory_cache": memory_cache,
        "pending_requests": pending,
        "deduplication_stats": dedup_stats
    }
