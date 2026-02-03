
import sys
import os
import pandas as pd

# Add project root to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from data_models.allocators_data import load_carteira_base, load_metrics_base

try:
    print("Loading data...")
    df_cart = load_carteira_base()
    df_metrics = load_metrics_base()

    if df_cart.empty:
        print("Carteira is empty!")
    else:
        print(f"Carteira Max Date: {df_cart['dt_comptc'].max()}")
    
    if df_metrics.empty:
        print("Metrics is empty!")
    else:
        print(f"Metrics Max Date: {df_metrics['dt_comptc'].max()}")

    now = pd.Timestamp.now()
    print(f"Current System Time: {now}")
    last_7m = now - pd.DateOffset(months=7)
    print(f"Last 7m Threshold: {last_7m}")

    if not df_cart.empty:
        recent_cart = df_cart[df_cart['dt_comptc'] > last_7m]
        print(f"Rows in Carteira > 7m ago: {len(recent_cart)}")
        if len(recent_cart) == 0:
            print("WARNING: No data in last 7 months! Filters will return empty.")
            
except Exception as e:
    print(f"Error: {e}")
