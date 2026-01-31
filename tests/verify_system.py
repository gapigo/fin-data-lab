import sys
import os
import requests
import pandas as pd
import time
from datetime import datetime

# Add project root
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

try:
    from common.postgresql import PostgresConnector
except ImportError:
    print("Could not import common.postgresql")

def check_db_views():
    print("\n[DB] Checking Database Views...")
    try:
        db = PostgresConnector()
        views = {
            "cvm.ativos_carteira": "SELECT count(*) FROM cvm.ativos_carteira",
            "cvm.cotas": "SELECT count(*) FROM cvm.cotas",
            "cvm.peer": "SELECT count(*) FROM cvm.peer",
            "cvm.carteira": "SELECT count(*) FROM cvm.carteira",
            "alocadores.r_amostral_2": "SELECT count(*) FROM alocadores.r_amostral_2"
        }
        
        for name, query in views.items():
            try:
                # Use a small limit execution or just count if fast enough. 
                # Count on materialized view is fast.
                df = db.read_sql(query)
                count = df.iloc[0, 0]
                print(f"  ✅ {name}: {count} rows")
            except Exception as e:
                print(f"  ❌ {name}: ERROR ({e})")
    except Exception as e:
        print(f"DB Connection failed: {e}")

def check_cache_files():
    print("\n[CACHE] Checking Static JSON Files...")
    cache_dir = os.path.join(os.path.dirname(__file__), '..', 'api', 'static_cache')
    if not os.path.exists(cache_dir):
        print(f"  ❌ Directory not found: {cache_dir}")
        return

    files = os.listdir(cache_dir)
    profiles = [f for f in files if f.startswith('profile_')]
    portfolios = [f for f in files if f.startswith('portfolio_')]
    
    print(f"  Stats: {len(profiles)} profiles, {len(portfolios)} portfolios found.")
    if len(profiles) > 0:
        print("  ✅ Cache generation seems active.")
    else:
        print("  ⚠️ No cache files found.")

def check_api(base_url="http://localhost:8000"):
    print(f"\n[API] Checking API at {base_url}...")
    try:
        # Check health or root
        t0 = time.time()
        r = requests.get(f"{base_url}/")
        print(f"  Root: {'✅' if r.status_code == 200 else '❌'} ({r.status_code}) - {time.time()-t0:.3f}s")
        
        # Check a specific fund (if known)
        # Random pick from db if possible, or hardcoded famous one
        # Kinea Chronos: 29.206.196/0001-57
        cnpj = "29.206.196/0001-57" 
        t1 = time.time()
        r2 = requests.get(f"{base_url}/funds/{cnpj}")
        print(f"  Fund Detail ({cnpj}): {'✅' if r2.status_code == 200 else '❌'} - {time.time()-t1:.3f}s")
        if r2.status_code == 200:
            data = r2.json()
            if data.get('denom_social'):
                print(f"    -> Found: {data['denom_social']}")
                
    except requests.exceptions.ConnectionError:
        print("  ❌ API is NOT responding (Connection Error)")

def run():
    print("=== SYSTEM VERIFICATION SUITE ===")
    check_db_views()
    check_cache_files()
    check_api()
    print("=================================")

if __name__ == "__main__":
    run()
