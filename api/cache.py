import time
import threading
import hashlib
import pickle
import os
import functools
from pathlib import Path
from typing import Any, Dict, Tuple, Callable, Optional


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

    def clear(self):
        with self._lock:
            self._cache.clear()


# Global cache instance - 1 day default (86400 seconds)
cache = SimpleCache(default_ttl=86400)


# ============================================================================
# FILE-BASED CACHE DECORATOR (@tmp)
# ============================================================================

# Define cache directory at repository root
CACHE_DIR = Path(__file__).parent.parent / "cache"


def _get_params_hash(args: tuple, kwargs: dict) -> str:
    """
    Generate a hash from function parameters.
    Converts all arguments to a string representation and hashes it.
    """
    try:
        # Create a consistent representation of the parameters
        params_repr = str((args, sorted(kwargs.items())))
        return hashlib.md5(params_repr.encode()).hexdigest()[:16]
    except Exception:
        # Fallback: use pickle to serialize
        try:
            params_bytes = pickle.dumps((args, kwargs))
            return hashlib.md5(params_bytes).hexdigest()[:16]
        except Exception:
            # Last resort: use a random hash
            return hashlib.md5(str(time.time()).encode()).hexdigest()[:16]


def _ensure_cache_dir():
    """Create cache directory if it doesn't exist."""
    if not CACHE_DIR.exists():
        CACHE_DIR.mkdir(parents=True, exist_ok=True)


def _parse_cache_filename(filename: str) -> Optional[Tuple[str, str, int]]:
    """
    Parse cache filename to extract function name, params hash, and unix time.
    Expected format: {func_name}_{params_hash}_{unix_time}.pkl
    Returns: (func_name, params_hash, unix_time) or None if invalid
    """
    if not filename.endswith('.pkl'):
        return None
    
    name = filename[:-4]  # Remove .pkl extension
    parts = name.rsplit('_', 2)  # Split from right to preserve function names with underscores
    
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
                    pass  # Ignore errors during cleanup


def _find_valid_cache(func_name: str, params_hash: str, ttl: int) -> Optional[Path]:
    """
    Find a valid (non-expired) cache file for the given function and params hash.
    Returns the path to the cache file if found, None otherwise.
    """
    if not CACHE_DIR.exists():
        return None
    
    current_time = time.time()
    
    # Look for matching cache files
    for cache_file in CACHE_DIR.glob(f"{func_name}_{params_hash}_*.pkl"):
        parsed = _parse_cache_filename(cache_file.name)
        if parsed:
            _, file_params_hash, unix_time = parsed
            if file_params_hash == params_hash:
                # Check if still valid (not expired)
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
    
    Usage:
        @tmp()  # Uses default 1 day TTL
        def my_function(param1, param2):
            return expensive_computation()
        
        @tmp(ttl=3600)  # Custom 1 hour TTL
        def another_function(data):
            return process_data(data)
    """
    def decorator(func: Callable) -> Callable:
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            # Ensure cache directory exists
            _ensure_cache_dir()
            
            # Get function name and params hash
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
                    # If reading fails, continue to execute function
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
                # If saving fails, still return the result
                pass
            
            # Cleanup expired cache files (async-like, non-blocking)
            try:
                _cleanup_expired_cache(func_name, ttl)
            except Exception:
                pass
            
            return result
        
        # Add method to clear cache for this function
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


def clear_all_cache():
    """Clear all cache files in the cache directory."""
    if CACHE_DIR.exists():
        for cache_file in CACHE_DIR.glob("*.pkl"):
            try:
                cache_file.unlink()
            except Exception:
                pass


def get_cache_stats() -> Dict[str, Any]:
    """Get statistics about the current cache."""
    if not CACHE_DIR.exists():
        return {"total_files": 0, "total_size_mb": 0, "functions": {}}
    
    stats = {
        "total_files": 0,
        "total_size_mb": 0,
        "functions": {}
    }
    
    for cache_file in CACHE_DIR.glob("*.pkl"):
        stats["total_files"] += 1
        stats["total_size_mb"] += cache_file.stat().st_size / (1024 * 1024)
        
        parsed = _parse_cache_filename(cache_file.name)
        if parsed:
            func_name, _, _ = parsed
            if func_name not in stats["functions"]:
                stats["functions"][func_name] = 0
            stats["functions"][func_name] += 1
    
    stats["total_size_mb"] = round(stats["total_size_mb"], 2)
    return stats
