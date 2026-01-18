import sys
sys.path.append('.')
from common.postgresql import PostgresConnector
import pandas as pd

db = PostgresConnector()

# Check specific fund
cnpj = '29.206.196/0001-57'
print(f"--- Checking {cnpj} ---")

tables = ['cda_fi_blc_1', 'cda_fi_blc_2', 'cda_fi_blc_3', 'cda_fi_blc_4', 'cda_fi_blc_5', 'cda_fi_blc_6', 'cda_fi_blc_7', 'cda_fi_blc_8']
for t in tables:
    try:
        df = db.read_sql(f"SELECT * FROM cvm.{t} WHERE cnpj_fundo = '{cnpj}' LIMIT 5")
        print(f"Table {t}: {len(df)} rows")
        if not df.empty:
            print("Cols:", df.columns.tolist())
            print("First row samp:", df.iloc[0].values)
    except Exception as e:
        print(f"Table {t} error: {e}")
