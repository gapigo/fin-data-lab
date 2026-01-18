import time
import threading
from typing import Any, Dict, Tuple

class SimpleCache:
    def __init__(self, default_ttl: int = 300):
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

# Global cache instance
cache = SimpleCache(default_ttl=3600)  # 1 hour default
