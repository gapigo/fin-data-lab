import sys
import os
import pandas as pd

# Add parent dir to path to import common
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), 'api')))
from common.postgresql import PostgresConnector

def debug_data():
    db = PostgresConnector()
    
    print("--- Searching for variants of 'Itaú' in cvm.carteira ---")
    sql_clients = """
        SELECT DISTINCT cliente, cliente_segmentado
        FROM cvm.carteira
        WHERE cliente ILIKE '%Itau%' OR cliente ILIKE '%Itaú%'
    """
    try:
        df = db.read_sql(sql_clients)
        print(df.to_string())
    except Exception as e:
        print(f"Error querying clients: {e}")

    print("\n--- Checking specific availability ---")
    # Check if there are rows for 'Itaú'
    sql_count = "SELECT COUNT(*) FROM cvm.carteira WHERE cliente = 'Itaú'"
    try:
        count = db.read_sql(sql_count).iloc[0,0]
        print(f"Rows for cliente='Itaú': {count}")
    except:
        pass

    # Check 'fluxo_veiculos' mapping
    print("\n--- Checking alocadores.fluxo_veiculos sample ---")
    sql_fluxo = """
        SELECT DISTINCT c.cliente, c.cliente_segmentado
        FROM alocadores.fluxo_veiculos f
        JOIN cvm.carteira c ON c.cnpj_fundo = f.cnpj_fundo
        WHERE c.cliente ILIKE '%Itaú%' OR c.cliente ILIKE '%Itau%'
        LIMIT 20
    """
    try:
        df_f = db.read_sql(sql_fluxo)
        print(df_f.to_string())
    except Exception as e:
        print(f"Error querying flow: {e}")

if __name__ == "__main__":
    debug_data()
