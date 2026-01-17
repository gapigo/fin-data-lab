import sys
import pandas as pd
import numpy as np

# Adjust path to find common modules
sys.path.append('..')
sys.path.append('../..')

from common.postgresql import PostgresConnector

def run_update():
    db = PostgresConnector()
    read_sql = db.read_sql
    
    TABLES_MAP = {
        'fi_cad_fi_hist_admin': ['cnpj_admin', 'admin', 'dt_ini_admin', 'dt_fim_admin'],
        'fi_cad_fi_hist_auditor': ['cnpj_auditor', 'auditor', 'dt_fim_auditor'],
        'fi_cad_fi_hist_classe': ['classe', 'dt_fim_classe'],
        'fi_cad_fi_hist_condom': ['condom', 'dt_fim_condom'],
        'fi_cad_fi_hist_controlador': ['cnpj_controlador', 'controlador', 'dt_fim_controlador'],
        'fi_cad_fi_hist_custodiante': ['cnpj_custodiante', 'custodiante', 'dt_fim_custodiante'],
        'fi_cad_fi_hist_denom_social': ['denom_social', 'dt_fim_denom_social'],
        'fi_cad_fi_hist_denom_comerc': ['denom_comerc', 'dt_fim_denom_comerc'],
        'fi_cad_fi_hist_diretor_resp': ['diretor', 'dt_fim_diretor'],
        'fi_cad_fi_hist_exclusivo': ['fundo_exclusivo', 'dt_fim_st_exclusivo'],
        'fi_cad_fi_hist_fic': ['fundo_cotas', 'dt_fim_st_cotas'],
        'fi_cad_fi_hist_gestor': ['pf_pj_gestor', 'cpf_cnpj_gestor', 'gestor', 'dt_ini_gestor', 'dt_fim_gestor'],
        'fi_cad_fi_hist_publico_alvo': ['publico_alvo', 'dt_fim_publico_alvo'],
        'fi_cad_fi_hist_rentab': ['rentab_fundo', 'dt_fim_rentab'],
        'fi_cad_fi_hist_sit': ['sit', 'dt_ini_sit', 'dt_fim_sit'],
        'fi_cad_fi_hist_taxa_adm': ['taxa_adm', 'inf_taxa_adm'],
        'fi_cad_fi_hist_taxa_perfm': ['vl_taxa_perfm', 'ds_taxa_perfm'],
        'fi_cad_fi_hist_trib_lprazo': ['trib_lprazo', 'dt_fim_st_trib_lprazo']
    }

    final_cols = [
        'cnpj_fundo', 'dt_reg', 'dt_ini', 
        'cnpj_admin', 'admin', 
        'cnpj_auditor', 'auditor',
        'cnpj_custodiante', 'custodiante',
        'classe', 'condom', 
        'cnpj_controlador', 'controlador',
        'denom_comerc', 'denom_social', 'diretor',
        'fundo_exclusivo', 'fundo_cotas',
        'pf_pj_gestor', 'cpf_cnpj_gestor', 'gestor',
        'publico_alvo', 'rentab_fundo', 'sit',
        'taxa_adm', 'inf_taxa_adm', 'vl_taxa_perfm', 'ds_taxa_perfm', 'trib_lprazo',
        'dt_fim'
    ]

    print("Step 1: Load and Deduplicate")
    cleaned_tables = {}

    for table_name, target_cols in TABLES_MAP.items():
        print(f"Processing {table_name}...")
        # Select all required columns plus standard keys
        cols_to_fetch = list(set(['cnpj_fundo', 'dt_reg'] + target_cols))
        cols_str = ", ".join(cols_to_fetch)
        
        query = f"SELECT {cols_str} FROM cvm.{table_name}"
        df = read_sql(query)
        
        # Standardize 'dt_ini' and 'dt_fim' names for the merge logic
        rename_dict = {}
        for c in df.columns:
            if 'dt_ini' in c and c not in ['dt_reg', 'dt_ini']: rename_dict[c] = 'dt_ini'
            if 'dt_fim' in c and c not in ['dt_reg', 'dt_fim']: rename_dict[c] = 'dt_fim'
        
        if 'dt_ini' not in rename_dict.values() and 'dt_ini' not in df.columns:
            df['dt_ini'] = df['dt_reg']
            
        df.rename(columns=rename_dict, inplace=True)
        
        # Convert dates
        for c in ['dt_reg', 'dt_ini', 'dt_fim']:
            if c in df.columns:
                df[c] = pd.to_datetime(df[c], errors='coerce')
                
        # DEDUPLICATION LOGIC
        if 'dt_ini' in df.columns:
            df = df.sort_values('dt_reg', ascending=False)
            df = df.drop_duplicates(subset=['cnpj_fundo', 'dt_ini'], keep='first')
            
        cleaned_tables[table_name] = df
        print(f"  -> {len(df)} unique records")

    print("Step 2: Create Master Spine (Timeline)")
    all_spines = []
    for name, df in cleaned_tables.items():
        if 'dt_ini' in df.columns:
            all_spines.append(df[['cnpj_fundo', 'dt_ini']])

    if not all_spines:
        print("No data found.")
        return

    df_spine = pd.concat(all_spines).drop_duplicates().sort_values(['cnpj_fundo', 'dt_ini'])
    df_spine = df_spine.drop_duplicates(subset=['cnpj_fundo', 'dt_ini'])
    df_spine = df_spine.sort_values(['cnpj_fundo', 'dt_ini'])
    df_spine.reset_index(drop=True, inplace=True)
    print(f"Master Spine Size: {len(df_spine)} rows")

    print("Step 3: Temporal Merge & Forward Fill")
    df_master = df_spine.copy()

    for table_name, df in cleaned_tables.items():
        print(f"Merging {table_name}...")
        
        cols_to_merge = [c for c in df.columns if c not in ['dt_fim']]
        
        # Keep dt_reg only for denom_social
        if table_name != 'fi_cad_fi_hist_denom_social' and 'dt_reg' in cols_to_merge:
            cols_to_merge.remove('dt_reg')
            
        cols_check = [c for c in cols_to_merge if c not in ['cnpj_fundo', 'dt_ini']]
        
        df_part = df[['cnpj_fundo', 'dt_ini'] + cols_check]
        df_master = pd.merge(df_master, df_part, on=['cnpj_fundo', 'dt_ini'], how='left')

    print("Forward Filling...")
    # Forward Fill
    # groupby().ffill() loses the grouping key in output (usually), so we restore it
    df_filled = df_master.groupby('cnpj_fundo').ffill()

    # Restore keys
    df_filled['cnpj_fundo'] = df_master['cnpj_fundo']
    df_filled['dt_ini'] = df_master['dt_ini']

    # --- Recalculate Logic for dt_fim ---
    print("Calculating dt_fim...")
    df_filled = df_filled.sort_values(['cnpj_fundo', 'dt_ini'])
    df_filled['next_dt_ini'] = df_filled.groupby('cnpj_fundo')['dt_ini'].shift(-1)
    df_filled['dt_fim'] = df_filled['next_dt_ini'] - pd.Timedelta(days=1)
    df_filled.drop(columns=['next_dt_ini'], inplace=True)

    df_master = df_filled
    
    # Final Column Selection
    available_cols = [c for c in final_cols if c in df_master.columns]
    df_final = df_master[available_cols]
    
    print(f"Writing {len(df_final)} columns to DB (Replace)...")
    # Replace the table completely as requested ("complete" mode logic implicit since we rebuild everything)
    df_final.to_sql('cadastro', db.engine, schema='cvm', if_exists='replace', index=False, chunksize=2000)
    print("Done.")

if __name__ == '__main__':
    run_update()
