
"""
Simple debug to check column names and data
"""
import sys
import os
import pandas as pd

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from common.postgresql import PostgresConnector

db = PostgresConnector()

print("=== Checking Metrics Table ===")
df_m = db.read_sql("SELECT * FROM cvm.metrics LIMIT 5")
print(f"Columns: {df_m.columns.tolist()}")
print(f"Row count: {len(df_m)}")

print("\n=== Max date in metrics ===")
df_max = db.read_sql("SELECT max(dt_comptc) FROM cvm.metrics")
print(df_max)

print("\n=== Checking Carteira for Itaú Orion ===")
df_c = db.read_sql("""
    SELECT cliente, cliente_segmentado, cnpj_fundo_cota, dt_comptc 
    FROM cvm.carteira 
    WHERE cliente = 'Itaú' 
      AND cliente_segmentado = 'Itaú Orion' 
      AND peer = 'Multimercado'
    ORDER BY dt_comptc DESC
    LIMIT 5
""")
print(f"Rows: {len(df_c)}")
print(df_c)

print("\n=== User's Full Query ===")
user_query = """
WITH carteira AS (
	SELECT * FROM cvm.carteira
	WHERE dt_comptc > CURRENT_DATE - INTERVAL '5 years' AND peer IN ('Ações', 'Multimercado', 'Renda Fixa') AND cliente <> gestor_cota
),
ultima_aberta AS (
	SELECT carteira.* FROM carteira 
	INNER JOIN (SELECT cnpj_fundo, max(dt_comptc) dt_comptc FROM carteira WHERE dt_comptc > CURRENT_DATE - INTERVAL '7 months' GROUP BY cnpj_fundo ) max 
	ON max.cnpj_fundo = carteira.cnpj_fundo AND max.dt_comptc = carteira.dt_comptc
),
ultima_metrics AS (
	SELECT metrics.* FROM cvm.metrics WHERE dt_comptc = (SELECT max(dt_comptc) FROM cvm.metrics)
)
SELECT ultima_aberta.cliente, ultima_aberta.cliente_segmentado, ultima_aberta.cnpj_fundo, ultima_aberta.cnpj_fundo_cota,
ultima_metrics.janela, ultima_metrics.ret
FROM ultima_aberta
LEFT JOIN ultima_metrics ON ultima_metrics.cnpj_fundo = ultima_aberta.cnpj_fundo_cota
WHERE ultima_aberta.cliente = 'Itaú' 
  AND ultima_aberta.peer = 'Multimercado'
  AND ultima_aberta.cliente_segmentado = 'Itaú Orion'
  AND ultima_metrics.janela IS NOT NULL
LIMIT 10
"""
df_q = db.read_sql(user_query)
print(f"Rows with metrics: {len(df_q)}")
print(df_q)
