import sys; sys.path.append('..')
import os
import pandas as pd
import re
import csv
import argparse
from sqlalchemy import text
from common.postgresql import PostgresConnector as db

# Configurações de Path
ROOT_DIR = r"E:/Download/cvm"
START_DIR = r"E:/Download/cvm/FI"

class CVMIngestor:
    def __init__(self, full_clean=False):
        self.connector = db()
        self.tables_cleaned = set()
        self.full_clean = full_clean

    def clean_table_name(self, relative_dir, file_name):
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
            if i == 0 or p != parts[i-1]: clean_parts.append(p)
        return "_".join(clean_parts)

    def reconcile_and_convert(self, conn, df, s_quoted, t_quoted):
        """
        1. Adiciona colunas novas (limite 5).
        2. Resolve mismatch de tipo alterando a coluna no banco para TEXT.
        3. Retorna a lista de colunas que devem ser tratadas como string no DF.
        """
        # Busca metadados das colunas (nome e tipo)
        query = text("""
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_schema = :schema AND table_name = :table
        """)
        db_info = {row[0]: row[1] for row in conn.execute(query, {
            "schema": s_quoted.strip('"'), 
            "table": t_quoted.strip('"')
        })}
        
        existing_cols = set(db_info.keys())
        df_cols = set(df.columns)
        
        # 1. Adicionar colunas faltantes (Limite 5)
        missing_cols = df_cols - existing_cols
        if 0 < len(missing_cols) <= 5:
            print(f"  [SCHEMA] Adicionando novas colunas: {missing_cols}")
            for col in missing_cols:
                # Criamos colunas novas sempre como TEXT para máxima compatibilidade
                conn.execute(text(f"ALTER TABLE {s_quoted}.{t_quoted} ADD COLUMN {col} TEXT;"))
                db_info[col] = 'text' # Atualiza info local
        elif len(missing_cols) > 5:
            raise Exception(f"Divergência de schema muito grande ({len(missing_cols)} colunas).")

        # 2. Verificar Mismatch de tipo e forçar String no DataFrame
        cols_to_force_string = []
        for col in df.columns:
            if col in db_info:
                db_type = db_info[col].lower()
                
                # Se a coluna no banco é string, o DF precisa ser string para evitar erro de objeto
                if 'char' in db_type or 'text' in db_type:
                    cols_to_force_string.append(col)
                else:
                    # Se o banco é numérico mas o DF não é, mudamos a COLUNA DO BANCO para TEXT
                    is_df_numeric = pd.api.types.is_numeric_dtype(df[col])
                    if not is_df_numeric:
                        print(f"  [TYPE MISMATCH] Alterando coluna {col} no banco para TEXT (era {db_type})")
                        conn.execute(text(f"ALTER TABLE {s_quoted}.{t_quoted} ALTER COLUMN {col} TYPE TEXT;"))
                        cols_to_force_string.append(col)
        
        return cols_to_force_string

    def fast_bulk_ingest(self, df, table_name, is_first_file, current_file):
        s_quoted, t_quoted, s_raw, t_raw = self.connector._split_table(table_name)
        
        with self.connector.engine.begin() as conn:
            table_exists = conn.execute(text(f"SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = '{s_raw}' AND table_name = '{t_raw}')")).scalar()
            
            if is_first_file or not table_exists:
                print(f"  [FULL] Resetando tabela {table_name}")
                conn.execute(text(f"DROP TABLE IF EXISTS {s_quoted}.{t_quoted} CASCADE;"))
                # Na criação inicial, tudo bem deixar o pandas inferir
                df.head(0).to_sql(t_raw, conn, schema=s_raw, if_exists='replace', index=False)
                conn.execute(text(f"ALTER TABLE {s_quoted}.{t_quoted} ADD COLUMN __id SERIAL PRIMARY KEY;"))
            else:
                # Reconciliação e obtenção de colunas que precisam ser castadas para string
                str_columns = self.reconcile_and_convert(conn, df, s_quoted, t_quoted)
                
                # Converte colunas problemáticas no DataFrame para string, lidando com NaNs
                for col in str_columns:
                    df[col] = df[col].astype(str).replace(['nan', 'None', '<NA>'], None)

                print(f"  [CLEANUP] Removendo registros de: {current_file}")
                conn.execute(text(f"DELETE FROM {s_quoted}.{t_quoted} WHERE __file = :filename"), {"filename": current_file})
            
            df.to_sql(t_raw, conn, schema=s_raw, if_exists='append', index=False, method='multi', chunksize=15000)

    def get_all_csvs(self, start_path, skip_hist=False):
        csv_files = []
        for root, dirs, files in os.walk(start_path):
            if 'META' in root.upper(): continue
            if skip_hist and 'HIST' in root.upper(): continue
            for f in files:
                if f.lower().endswith('.csv'): csv_files.append(os.path.join(root, f))
        return csv_files

    def ingest_list(self, file_list):
        for file_path in file_list:
            if not os.path.exists(file_path): continue
            root, file = os.path.split(file_path)
            relative_dir = os.path.relpath(root, ROOT_DIR)
            table_name = self.clean_table_name(relative_dir, file)
            if not table_name: continue
            
            try:
                # Usando on_bad_lines para evitar o ParserError que vimos antes
                df = pd.read_csv(file_path, sep=';', encoding='iso-8859-1', low_memory=False, on_bad_lines='skip', quoting=csv.QUOTE_NONE)
                df.columns = [c.lower() for c in df.columns]
                
                # Sua regra de negócio: dropar __id se existir no arquivo
                if '__id' in df.columns: df = df.drop(columns=['__id'])
                df['__file'] = file 

                is_first = False
                if table_name not in self.tables_cleaned and self.full_clean:
                    is_first = True
                    self.tables_cleaned.add(table_name)

                print(f"Ingerindo: {file} -> {table_name}")
                self.fast_bulk_ingest(df, table_name, is_first, file)
            except Exception as e:
                print(f"Erro em {file}: {e}")

    def run_update_hot(self):
        print("--- MODO UPDATE HOT ---")
        targets = [
            os.path.join(ROOT_DIR, r"FI\CAD\DADOS\registro_classe.csv"),
            os.path.join(ROOT_DIR, r"FI\CAD\DADOS\registro_fundo.csv"),
            os.path.join(ROOT_DIR, r"FI\CAD\DADOS\registro_subclasse.csv"),
        ]
        targets.extend(self.get_all_csvs(os.path.join(ROOT_DIR, r"FI\DOC\CDA\DADOS"), skip_hist=True))
        targets.extend(self.get_all_csvs(os.path.join(ROOT_DIR, r"FI\DOC\INF_DIARIO\DADOS"), skip_hist=True))
        self.ingest_list(targets)

    def run_specify(self, target_table):
        all_files = self.get_all_csvs(ROOT_DIR)
        queue = [f for f in all_files if self.clean_table_name(os.path.relpath(os.path.dirname(f), ROOT_DIR), os.path.basename(f)) == target_table]
        self.ingest_list(queue)

    def run_complete_missing(self):
        query = "SELECT table_schema || '.' || table_name as full_name FROM information_schema.tables WHERE table_schema = 'cvm'"
        with self.connector.engine.connect() as conn:
            tables = pd.read_sql(query, conn)['full_name'].tolist()
            all_local = self.get_all_csvs(ROOT_DIR)
            for table in tables:
                try:
                    existing = pd.read_sql(text(f"SELECT DISTINCT __file FROM {table}"), conn)['__file'].tolist()
                    to_ingest = [f for f in all_local if self.clean_table_name(os.path.relpath(os.path.dirname(f), ROOT_DIR), os.path.basename(f)) == table and os.path.basename(f) not in existing]
                    if to_ingest: self.ingest_list(to_ingest)
                except: continue

    def run_full(self):
        queue = self.get_all_csvs(START_DIR)
        processed = set(queue)
        remaining = [f for f in self.get_all_csvs(ROOT_DIR) if f not in processed]
        self.ingest_list(queue + remaining)

def main():
    parser = argparse.ArgumentParser()
    group = parser.add_mutually_exclusive_group()
    group.add_argument('--update-hot', action='store_true')
    group.add_argument('--specify', type=str)
    group.add_argument('--complete-missing', action='store_true')
    group.add_argument('--full', action='store_true', default=False)

    args = parser.parse_args()
    is_full = args.full or not (args.update_hot or args.specify or args.complete_missing)
    ingestor = CVMIngestor(full_clean=is_full)

    if args.update_hot: ingestor.run_update_hot()
    elif args.specify: ingestor.run_specify(args.specify)
    elif args.complete_missing: ingestor.run_complete_missing()
    else: ingestor.run_full()

if __name__ == "__main__":
    main()