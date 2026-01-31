import sys
import os
import pandas as pd
from sqlalchemy import text

# Add project root to path
current_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.abspath(os.path.join(current_dir, '..'))
if project_root not in sys.path:
    sys.path.append(project_root)

from common.postgresql import PostgresConnector

def run():
    db = PostgresConnector()
    print("--- Populating cvm.depara_gestores ---")
    
    # Ensure table exists
    db.execute_sql("CREATE TABLE IF NOT EXISTS cvm.depara_gestores (gestor VARCHAR, grupo VARCHAR, tabela VARCHAR);")
    
    # Get distinct gestores
    df = db.read_sql("SELECT DISTINCT gestor FROM cvm.cadastro WHERE gestor IS NOT NULL")
    
    updates = []
    
    for _, row in df.iterrows():
        raw_gestor = row['gestor']
        upper_gestor = raw_gestor.upper()
        grupo = raw_gestor # Default
        
        # Heuristics
        if 'ITAU' in upper_gestor or 'ITAÚ' in upper_gestor:
            grupo = 'ITAU'
        elif 'BRADESCO' in upper_gestor or 'BRAM' in upper_gestor:
            grupo = 'BRADESCO'
        elif 'SANTANDER' in upper_gestor:
            grupo = 'SANTANDER'
        elif 'BB ' in upper_gestor or 'BANCO DO BRASIL' in upper_gestor or 'BB DTVM' in upper_gestor:
            grupo = 'BB'
        elif 'CAIXA' in upper_gestor and 'FEDERAL' in upper_gestor:
            grupo = 'CAIXA'
        elif 'SAFRA' in upper_gestor:
            grupo = 'SAFRA'
        elif 'BTG' in upper_gestor or 'PACTUAL' in upper_gestor:
            grupo = 'BTG PACTUAL'
        elif 'XP ' in upper_gestor or 'XP VISTA' in upper_gestor or 'XP GEST' in upper_gestor:
            grupo = 'XP'
        elif 'KINEA' in upper_gestor:
            grupo = 'KINEA'
        elif 'BV ' in upper_gestor:
            grupo = 'BV'
        elif 'CREDIT SUISSE' in upper_gestor or 'CSHG' in upper_gestor:
            grupo = 'CREDIT SUISSE'
        elif 'J.P. MORGAN' in upper_gestor or 'JP MORGAN' in upper_gestor:
            grupo = 'JP MORGAN'
        elif 'VINCI' in upper_gestor:
            grupo = 'VINCI'
        elif 'OPPORTUNITY' in upper_gestor:
            grupo = 'OPPORTUNITY'
        elif 'ARX' in upper_gestor:
            grupo = 'ARX'
        elif 'ABSOLUTE' in upper_gestor:
            grupo = 'ABSOLUTE'
        elif 'SPX' in upper_gestor:
            grupo = 'SPX'
        elif 'IBIUNA' in upper_gestor:
            grupo = 'IBIUNA'
        elif 'VERDE' in upper_gestor and 'ASSET' in upper_gestor:
            grupo = 'VERDE'
            
        updates.append({'gestor': raw_gestor, 'grupo': grupo, 'tabela': 'MANUAL'})
        
    # Bulk insert (clearing first to avoid duplicates in this run)
    db.execute_sql("DELETE FROM cvm.depara_gestores WHERE tabela = 'MANUAL'")
    
    if updates:
        # Construct large INSERT
        values_list = []
        for u in updates:
            g = u['gestor'].replace("'", "''")
            gr = u['grupo'].replace("'", "''")
            values_list.append(f"('{g}', '{gr}', 'MANUAL')")
        
        # Chunk validation
        chunk_size = 1000
        for i in range(0, len(values_list), chunk_size):
            chunk = values_list[i:i+chunk_size]
            sql = f"INSERT INTO cvm.depara_gestores (gestor, grupo, tabela) VALUES {','.join(chunk)};"
            db.execute_sql(sql)
            
    print(f"Populated {len(updates)} gestores.")

if __name__ == "__main__":
    run()
