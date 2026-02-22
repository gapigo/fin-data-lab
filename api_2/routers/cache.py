"""
Cache Router — gerenciamento de cache.
"""

from fastapi import APIRouter, HTTPException

from common.cache import (
    cache, get_all_cache_info, delete_cache_file, clear_all_cache,
)

router = APIRouter(prefix="/cache", tags=["Cache"])


@router.get("")
def get_cache_info():
    """Informações completas sobre o cache."""
    return get_all_cache_info()


@router.delete("/memory/{key}")
def delete_memory_cache(key: str):
    if cache.delete(key):
        return {"status": "ok", "message": f"Cache key '{key}' deleted"}
    raise HTTPException(404, "Cache key not found")


@router.delete("/file/{filename}")
def delete_file_cache(filename: str):
    if delete_cache_file(filename):
        return {"status": "ok", "message": f"Cache file '{filename}' deleted"}
    raise HTTPException(404, "Cache file not found")


@router.delete("/all")
def clear_all():
    cache.clear()
    clear_all_cache()
    return {"status": "ok", "message": "All caches cleared"}


@router.delete("/memory")
def clear_memory():
    cache.clear()
    return {"status": "ok", "message": "Memory cache cleared"}


@router.delete("/files")
def clear_files():
    clear_all_cache()
    return {"status": "ok", "message": "File cache cleared"}
