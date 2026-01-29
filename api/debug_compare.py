
"""
Debug script to compare the user's SQL query with our Python logic.
"""
import sys
import os
import pandas as pd

# Add project root to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from common.postgresql import PostgresConnector

db = PostgresConnector()

print("=" * 60)
print("RUNNING USER'S EXACT SQL QUERY")
print("=" * 60)

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
SELECT ultima_aberta.cliente, ultima_aberta.cliente_segmentado, ultima_aberta.cnpj_fundo, 
ultima_aberta.cnpj_fundo_cota,
ultima_metrics.janela, ultima_metrics.ret, ultima_metrics.vol, ultima_metrics.mdd, ultima_metrics.recovery_time, ultima_metrics.sharpe, ultima_metrics.calmar, 
ultima_metrics.hit_ratio, ultima_metrics.info_ratio
FROM ultima_aberta
LEFT JOIN ultima_metrics ON ultima_metrics.cnpj_fundo = ultima_aberta.cnpj_fundo_cota
WHERE ultima_aberta.cliente = 'Itaú' 
  AND ultima_aberta.peer = 'Multimercado'
  AND ultima_aberta.cliente_segmentado = 'Itaú Orion'
LIMIT 20
"""

df_sql = db.read_sql(user_query)
print(f"SQL returned {len(df_sql)} rows")
if not df_sql.empty:
    print(df_sql[['cliente', 'cliente_segmentado', 'cnpj_fundo_cota', 'janela', 'ret']].head(10))
else:
    print("SQL query returned empty!")

print("\n" + "=" * 60)
print("NOW TESTING OUR PYTHON LOGIC")
print("=" * 60)

from data_models.allocators_data import load_carteira_base, load_metrics_full

df_cart = load_carteira_base()
df_metrics = load_metrics_full()

print(f"load_carteira_base returned {len(df_cart)} rows")
print(f"load_metrics_full returned {len(df_metrics)} rows")

# Filter client/segment/peer as the API does
df_filtered = df_cart[
    (df_cart['cliente'] == 'Itaú') & 
    (df_cart['peer'] == 'Multimercado') &
    (df_cart['cliente_segmentado'] == 'Itaú Orion')
]
print(f"After filters: {len(df_filtered)} rows")

if df_filtered.empty:
    print("ERROR: Filtered carteira is empty!")
else:
    # Replicate _get_allocator_fund_metrics logic
    min_date = pd.Timestamp.now() - pd.DateOffset(years=5)
    df_cart_recent = df_filtered[df_filtered['dt_comptc'] > min_date]
    print(f"After 5y filter: {len(df_cart_recent)} rows")
    
    if 'gestor_cota' in df_cart_recent.columns and 'cliente' in df_cart_recent.columns:
        df_cart_recent = df_cart_recent[df_cart_recent['cliente'] != df_cart_recent['gestor_cota']]
    print(f"After self-invest filter: {len(df_cart_recent)} rows")
    
    last_7m = pd.Timestamp.now() - pd.DateOffset(months=7)
    df_active_candidates = df_cart_recent[df_cart_recent['dt_comptc'] > last_7m]
    print(f"After 7m filter: {len(df_active_candidates)} rows")
    
    if df_active_candidates.empty:
        print("ERROR: No active candidates in last 7m!")
    else:
        latest_dates = df_active_candidates.groupby('cnpj_fundo')['dt_comptc'].max().reset_index()
        df_ultima_aberta = df_cart_recent.merge(latest_dates, on=['cnpj_fundo', 'dt_comptc'])
        print(f"Ultima aberta: {len(df_ultima_aberta)} rows")
        
        # Metrics
        print(f"\nMetrics sample cnpj_fundo values:")
        print(df_metrics['cnpj_fundo'].head(3).tolist())
        
        print(f"\nUltima aberta sample cnpj_fundo_cota values:")
        print(df_ultima_aberta['cnpj_fundo_cota'].head(3).tolist())
        
        latest_metric_date = df_metrics['dt_comptc'].max()
        df_ultima_metrics = df_metrics[df_metrics['dt_comptc'] == latest_metric_date]
        print(f"\nUltima metrics (date={latest_metric_date}): {len(df_ultima_metrics)} rows")
        
        # Check overlap
        overlap = set(df_ultima_aberta['cnpj_fundo_cota'].unique()) & set(df_ultima_metrics['cnpj_fundo'].unique())
        print(f"\nOverlap between cnpj_fundo_cota and metrics.cnpj_fundo: {len(overlap)} funds")
        
        if len(overlap) == 0:
            print("ERROR: No overlap - checking format differences...")
            sample_cota = df_ultima_aberta['cnpj_fundo_cota'].iloc[0] if len(df_ultima_aberta) > 0 else "N/A"
            sample_metric = df_ultima_metrics['cnpj_fundo'].iloc[0] if len(df_ultima_metrics) > 0 else "N/A"
            print(f"  Sample cnpj_fundo_cota: '{sample_cota}' (len={len(str(sample_cota))})")
            print(f"  Sample metric cnpj_fundo: '{sample_metric}' (len={len(str(sample_metric))})")
        
        # Perform merge
        df_merged = df_ultima_aberta.merge(
            df_ultima_metrics,
            left_on='cnpj_fundo_cota',
            right_on='cnpj_fundo',
            how='left',
            suffixes=('_cart', '_metric')
        )
        print(f"\nMerged result: {len(df_merged)} rows")
        
        # Check if janela filled
        has_metrics = df_merged['janela'].notna().sum()
        print(f"Rows with valid janela (metrics joined): {has_metrics}")

