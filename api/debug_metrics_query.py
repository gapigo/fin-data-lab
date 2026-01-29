
import sys
import os
import pandas as pd

# Add project root to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from common.postgresql import PostgresConnector

db = PostgresConnector()

try:
    print("Checking cvm.metrics columns...")
    cols = db.read_sql("SELECT * FROM cvm.metrics LIMIT 1")
    print("Columns:", cols.columns.tolist())
    
    print("Testing load_metrics_base query columns...")
    query = """
        SELECT 
            cnpj_fundo,
            dt_comptc,
            janela,
            ret,
            vol,
            sharpe,
            max_dd,
            meta,
            bench
        FROM cvm.metrics
        LIMIT 5
    """
    df = db.read_sql(query)
    print("Query success!")
    print(df.head())

except Exception as e:
    print(f"Query failed: {e}")

