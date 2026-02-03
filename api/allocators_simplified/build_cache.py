"""
Script para rebuild do cache de alocadores.

Este script pode ser executado de forma standalone para pré-computar
os dados e salvá-los em arquivos JSON.

Uso:
    python -m api.allocators_simplified.build_cache

Ou via API:
    POST /allocators-simple/build-cache
"""

import sys
import os
from datetime import datetime

# Add project root to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))

from api.allocators_simplified.data_cache import AllocatorsCache
from api.allocators_simplified.config import get_cache_dir
from common.postgresql import PostgresConnector


def main():
    """Build cache from database."""
    print("=" * 60)
    print("ALOCADORES SIMPLIFICADO - CACHE BUILDER")
    print("=" * 60)
    print(f"Start time: {datetime.now()}")
    print(f"Cache directory: {get_cache_dir()}")
    print("-" * 60)
    
    try:
        # Initialize database connector
        print("\n[1/2] Connecting to database...")
        db = PostgresConnector()
        
        # Initialize cache
        print("[2/2] Building cache...")
        cache = AllocatorsCache()
        cache.build_all(db)
        
        print("\n" + "=" * 60)
        print("CACHE BUILD COMPLETED SUCCESSFULLY!")
        print("=" * 60)
        
    except Exception as e:
        print(f"\n[ERROR] Failed to build cache: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
