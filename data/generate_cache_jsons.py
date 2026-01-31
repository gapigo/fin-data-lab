import sys
import os
import json
import pandas as pd
from datetime import date, datetime

# Add project root to path
current_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.abspath(os.path.join(current_dir, '..'))
if project_root not in sys.path:
    sys.path.append(project_root)

# Import DataService
try:
    from api.service import DataService
except ImportError:
    # Try adding api to path directly if needed
    sys.path.append(os.path.join(project_root, 'api'))
    from api.service import DataService

from common.postgresql import PostgresConnector

class DateTimeEncoder(json.JSONEncoder):
    """Helper to serialize dates/datetimes."""
    def default(self, o):
        if isinstance(o, (date, datetime)):
            return o.isoformat()
        return super().default(o)

def generate_cache():
    print("--- Starting JSON Cache Generation ---")
    service = DataService()
    db = PostgresConnector()
    
    # ensure output dir
    output_dir = os.path.join(project_root, 'api', 'static_cache')
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
        
    # Get list of funds to cache
    # Strategy: Cache funds that are in 'alocadores' portfolios OR top funds by PL in cvm.peer
    # For now, let's pick top 100 funds from cvm.peer (active)
    print("Fetching target funds...")
    try:
        # We need cvm.peer to exist. If not, fallback to cvm.cadastro
        sql_funds = """
        SELECT cnpj_fundo, denom_social 
        FROM cvm.peer 
        LIMIT 50;
        """
        funds = db.read_sql(sql_funds)
        if funds.empty:
            print("cvm.peer returned 0 rows. Falling back to cvm.cadastro...")
            raise Exception("Empty peer view")
            
    except Exception as e:
        print(f"Error fetching peers (maybe view not ready or empty): {e}")
        # Fallback
        funds = db.read_sql("SELECT cnpj_fundo, denom_social FROM cvm.cadastro WHERE dt_fim IS NULL LIMIT 50")
        
    print(f"Processing {len(funds)} funds...")
    
    count = 0
    for _, row in funds.iterrows():
        cnpj = row['cnpj_fundo']
        try:
            # 1. Profile Data (Details + Metrics + History)
            # We bundle this into 'profile_{cnpj}.json'
            detail = service.get_fund_detail(cnpj)
            metrics = service.get_fund_metrics(cnpj)
            structure = service.get_fund_structure(cnpj)
            
            # Serialize objects
            # Sanitize CNPJ for filename (digits only)
            safe_cnpj = "".join(filter(str.isdigit, cnpj))
            
            profile_data = {
                "detail": detail.__dict__ if detail else None,
                "metrics": metrics,
                "structure": structure
            }
            
            with open(os.path.join(output_dir, f"profile_{safe_cnpj}.json"), 'w', encoding='utf-8') as f:
                json.dump(profile_data, f, cls=DateTimeEncoder, ensure_ascii=False)
                
            # 2. Portfolio Data (Composition + Detailed Grid)
            # Bundle into 'portfolio_{cnpj}.json'
            composition = service.get_fund_composition(cnpj)
            detailed = service.get_portfolio_detailed(cnpj)
            
            portfolio_data = {
                "composition": composition,
                "detailed": detailed
            }
            
            with open(os.path.join(output_dir, f"portfolio_{safe_cnpj}.json"), 'w', encoding='utf-8') as f:
                json.dump(portfolio_data, f, cls=DateTimeEncoder, ensure_ascii=False)
                
            count += 1
            if count % 10 == 0:
                print(f"Processed {count} funds...")
                
        except Exception as e:
            print(f"Error processing {cnpj}: {e}")
            
    print("--- JSON Cache Generation Completed ---")

if __name__ == "__main__":
    generate_cache()
