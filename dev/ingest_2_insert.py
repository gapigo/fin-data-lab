import sys; sys.path.append('..')
from common.postgresql import PostgresConnector as db
import os
import pandas as pd
import re
from sqlalchemy import text

# Configurações
ROOT_DIR = r"E:/Download/cvm"
START_DIR = r"E:/Download/cvm/FI" # Pasta prioritária
FULL_CLEAN_INSTALL = True 

connector = db()
tables_cleaned = set()
processed_files = set() # Para garantir que não processe o mesmo arquivo duas vezes

def clean_table_name(relative_dir, file_name):
    """Aplica as regras de limpeza de nome de tabela."""
    path_parts = relative_dir.replace('\\', '/').split('/')
    ignore_terms = {'DADOS', 'HIST'}
    path_parts = [p for p in path_parts if p.upper() not in ignore_terms]
    
    if 'META' in [p.upper() for p in path_parts]: return None
    
    schema_prefix = "cvm." + "_".join(path_parts).lower()
    name_base = os.path.splitext(file_name)[0]
    name_base = re.sub(r'_?\d{4,6}', '', name_base).strip('_').lower()

    full_name = f"{schema_prefix}_{name_base}"
    parts = full_name.split('_')
    clean_parts = []
    for i, p in enumerate(parts):
        if i == 0 or p != parts[i-1]:
            clean_parts.append(p)
    return "_".join(clean_parts)

def fast_bulk_ingest(df, table_name, is_first_file):
    """Ingestão massiva com criação de __id serial."""
    s_quoted, t_quoted, s_raw, t_raw = connector._split_table(table_name)
    
    with connector.engine.begin() as conn:
        if is_first_file:
            conn.execute(text(f"DROP TABLE IF EXISTS {s_quoted}.{t_quoted} CASCADE;"))
            df.head(0).to_sql(t_raw, conn, schema=s_raw, if_exists='replace', index=False)
            conn.execute(text(f"ALTER TABLE {s_quoted}.{t_quoted} ADD COLUMN __id SERIAL PRIMARY KEY;"))
        
        df.to_sql(t_raw, conn, schema=s_raw, if_exists='append', index=False, method='multi', chunksize=15000)

def ingest_directory(target_path):
    """Função auxiliar para iterar e ingerir arquivos de uma pasta específica."""
    for root, dirs, files in os.walk(target_path):
        if 'META' in root.upper(): continue

        for file in files:
            file_path = os.path.join(root, file)
            
            # Evita processar o mesmo arquivo se ele já foi pego na rodada inicial
            if file_path in processed_files: continue
            if not file.lower().endswith('.csv'): continue

            relative_dir = os.path.relpath(root, ROOT_DIR)
            table_name = clean_table_name(relative_dir, file)
            if not table_name: continue

            try:
                df = pd.read_csv(file_path, sep=';', encoding='iso-8859-1', low_memory=False)
                df.columns = [c.lower() for c in df.columns]
                df['__file'] = file
                
                is_first = False
                if table_name not in tables_cleaned:
                    if FULL_CLEAN_INSTALL: is_first = True
                    tables_cleaned.add(table_name)

                print(f"Ingerindo: {file} -> {table_name}")
                fast_bulk_ingest(df, table_name, is_first)
                processed_files.add(file_path)
                
            except Exception as e:
                print(f"Erro em {file}: {e}")

def process_all():
    # 1. Começa pela pasta prioritária (FI)
    print(f"--- FASE 1: Iniciando pela pasta prioritária: {START_DIR} ---")
    ingest_directory(START_DIR)
    
    # 2. Processa todo o restante da pasta raiz
    print(f"--- FASE 2: Processando restante dos arquivos em {ROOT_DIR} ---")
    ingest_directory(ROOT_DIR)

if __name__ == "__main__":
    process_all()
    print("\n--- Processamento completo finalizado ---")