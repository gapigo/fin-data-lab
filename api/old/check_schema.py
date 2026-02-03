
import sys
import os
import pandas as pd

# Add project root to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname('__file__'), '..')))

from common.postgresql import PostgresConnector

def check_columns():
    db = PostgresConnector()
    
    # Check cadastro columns
    print("--- CVM.CADASTRO Columns ---")
    try:
        df = db.read_sql("SELECT * FROM cvm.cadastro LIMIT 1")
        print(df.columns.tolist())
    except Exception as e:
        print(f"Error checking cadastro: {e}")

    # Check cda tables
    print("\n--- CVM.CDA Tables Check ---")
    tables = [
        "cvm.cda_fi_blc_1", 
        "cvm.cda_fi_blc_2", 
        "cvm.cda_fi_blc_3", 
        "cvm.cda_fi_blc_4",
        "cvm.cda_fi_blc_6" # Distribution often
    ]
    for t in tables:
        try:
             df = db.read_sql(f"SELECT * FROM {t} LIMIT 1")
             print(f"{t} columns: {df.columns.tolist()}")
        except Exception as e:
             # print(f"Table {t} likely not found or empty.")
             pass

if __name__ == "__main__":
    check_columns()
