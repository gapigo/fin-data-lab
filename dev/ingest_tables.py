import sys; sys.path.append('..')
import os
import pandas as pd
import re
import csv
import argparse
from datetime import datetime
from sqlalchemy import text, exc
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
        name_base_clean = re.sub(r'_?\d{4,6}', '', name_base).strip('_').lower()
        full_name = f"{schema_prefix}_{name_base_clean}"
        parts = full_name.split('_')
        clean_parts = []
        for i, p in enumerate(parts):
            if i == 0 or p != parts[i-1]: clean_parts.append(p)
        return "_".join(clean_parts)

    def _should_ingest_file(self, file_name, from_date_str):
        if not from_date_str: return True
        try:
            from_date = datetime.strptime(from_date_str, '%Y-%m-%d')
            match = re.search(r'_(\d{4})(\d{2})?(?=\.csv$|$)', file_name)
            if not match: return True
            file_year = int(match.group(1))
            file_month = int(match.group(2)) if match.group(2) else None
            if file_year > from_date.year: return True
            if file_year == from_date.year:
                if file_month is None: return True
                if file_month >= from_date.month: return True
            return False
        except: return True

    def force_column_migration(self, s_quoted, t_quoted, col_name):
        """Migração pesada: cria temp, copia dados ::TEXT, dropa original CASCADE e renomeia."""
        print(f"  [FORCE MIGRATION] Convertendo {col_name} para TEXT na tabela {s_quoted}.{t_quoted}...")
        with self.connector.engine.begin() as conn:
            sql = f"""
            ALTER TABLE {s_quoted}.{t_quoted} ADD COLUMN "{col_name}_new" TEXT;
            UPDATE {s_quoted}.{t_quoted} SET "{col_name}_new" = "{col_name}"::TEXT;
            ALTER TABLE {s_quoted}.{t_quoted} DROP COLUMN "{col_name}" CASCADE;
            ALTER TABLE {s_quoted}.{t_quoted} RENAME COLUMN "{col_name}_new" TO "{col_name}";
            """
            conn.execute(text(sql))
        print(f"  [SUCCESS] Coluna {col_name} migrada.")

    def ensure_schema_compatibility(self, df, s_raw, t_raw, s_quoted, t_quoted):
        """Garante que as colunas do banco aceitem os dados do DF (converte para TEXT se necessário)."""
        with self.connector.engine.connect() as conn:
            query = text("""
                SELECT column_name, data_type 
                FROM information_schema.columns 
                WHERE table_schema = :schema AND table_name = :table
            """)
            db_info = {row[0]: row[1] for row in conn.execute(query, {"schema": s_raw, "table": t_raw})}
        
        if not db_info: return []

        cols_to_force_string = []
        df_cols = set(df.columns)
        existing_cols = set(db_info.keys())

        # 1. Novas colunas detectadas no CSV
        missing_cols = df_cols - existing_cols
        if 0 < len(missing_cols) <= 10:
            with self.connector.engine.begin() as conn:
                for col in missing_cols:
                    conn.execute(text(f"ALTER TABLE {s_quoted}.{t_quoted} ADD COLUMN \"{col}\" TEXT;"))

        # 2. Validação de tipos (Mismatch banco numérico vs CSV texto)
        for col in df.columns:
            if col in db_info:
                db_type = db_info[col].lower()
                is_df_numeric = pd.api.types.is_numeric_dtype(df[col])

                if 'char' in db_type or 'text' in db_type:
                    cols_to_force_string.append(col)
                elif not is_df_numeric:
                    try:
                        with self.connector.engine.begin() as conn:
                            conn.execute(text(f"ALTER TABLE {s_quoted}.{t_quoted} ALTER COLUMN \"{col}\" TYPE TEXT;"))
                        cols_to_force_string.append(col)
                    except exc.SQLAlchemyError:
                        self.force_column_migration(s_quoted, t_quoted, col)
                        cols_to_force_string.append(col)
        
        return cols_to_force_string

    def fast_bulk_ingest(self, df, table_name, is_first_for_table, current_file):
        s_quoted, t_quoted, s_raw, t_raw = self.connector._split_table(table_name)
        
        with self.connector.engine.connect() as conn:
            table_exists = conn.execute(text(f"SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = '{s_raw}' AND table_name = '{t_raw}')")).scalar()

        # Fluxo de Criação (se for a primeira vez ou não existir)
        if (is_first_for_table and self.full_clean) or not table_exists:
            with self.connector.engine.begin() as conn:
                print(f"  [DB_SYNC] Criando/Resetando tabela {table_name}")
                conn.execute(text(f"DROP TABLE IF EXISTS {s_quoted}.{t_quoted} CASCADE;"))
                df.head(0).to_sql(t_raw, conn, schema=s_raw, if_exists='replace', index=False)
                conn.execute(text(f"ALTER TABLE {s_quoted}.{t_quoted} ADD COLUMN __id SERIAL PRIMARY KEY;"))
            str_columns = []
        else:
            # Compatibilidade de Schema antes de inserir
            str_columns = self.ensure_schema_compatibility(df, s_raw, t_raw, s_quoted, t_quoted)

        # Forçar STRING no DataFrame para as colunas mapeadas
        for col in str_columns:
            df[col] = df[col].astype(str).replace(['nan', 'None', '<NA>', 'nan'], None)

        # Inserção de dados
        with self.connector.engine.begin() as conn:
            if table_exists:
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

    def ingest_list(self, file_list, from_date=None):
        for file_path in file_list:
            if not os.path.exists(file_path): continue
            root, file = os.path.split(file_path)
            if not self._should_ingest_file(file, from_date): continue

            relative_dir = os.path.relpath(root, ROOT_DIR)
            table_name = self.clean_table_name(relative_dir, file)
            if not table_name: continue
            
            try:
                df = pd.read_csv(file_path, sep=';', encoding='iso-8859-1', low_memory=False, on_bad_lines='skip', quoting=csv.QUOTE_NONE)
                df.columns = [c.lower() for c in df.columns]
                
                # Regra salva: 'id' pode existir, mas '__id' é o PK universal interno
                if '__id' in df.columns: df = df.drop(columns=['__id'])
                df['__file'] = file 

                is_first = False
                if table_name not in self.tables_cleaned and self.full_clean:
                    is_first = True
                    self.tables_cleaned.add(table_name)

                print(f"Ingerindo: {file} -> {table_name}")
                self.fast_bulk_ingest(df, table_name, is_first, file)
            except Exception as e:
                print(f"Erro fatal em {file}: {e}")

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

    def run_specify(self, target_table, from_date=None):
        all_files = self.get_all_csvs(ROOT_DIR)
        queue = [f for f in all_files if self.clean_table_name(os.path.relpath(os.path.dirname(f), ROOT_DIR), os.path.basename(f)) == target_table]
        self.ingest_list(queue, from_date=from_date)

    def run_complete_missing(self):
        print("--- MODO COMPLETE MISSING (SCAN LOCAL -> DB) ---")
        all_local_files = self.get_all_csvs(ROOT_DIR)
        
        # Agrupar arquivos locais pelo nome da tabela que eles vão gerar
        files_by_table = {}
        for f_path in all_local_files:
            t_name = self.clean_table_name(os.path.relpath(os.path.dirname(f_path), ROOT_DIR), os.path.basename(f_path))
            if t_name:
                files_by_table.setdefault(t_name, []).append(f_path)

        for table_name, files in files_by_table.items():
            s_quoted, t_quoted, s_raw, t_raw = self.connector._split_table(table_name)
            
            # Checar se tabela existe (em conexão isolada)
            try:
                with self.connector.engine.connect() as conn:
                    table_exists = conn.execute(text(f"SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = '{s_raw}' AND table_name = '{t_raw}')")).scalar()
                
                if not table_exists:
                    print(f"\n[NOVA TABELA] Criando {table_name} com {len(files)} arquivos...")
                    self.ingest_list(files)
                else:
                    # Se existe, pegamos só o que falta
                    with self.connector.engine.connect() as conn:
                        existing = pd.read_sql(text(f"SELECT DISTINCT __file FROM {table_name}"), conn)['__file'].tolist()
                    to_ingest = [f for f in files if os.path.basename(f) not in existing]
                    
                    if to_ingest:
                        print(f"\n[ATUALIZANDO] {table_name}: {len(to_ingest)} novos arquivos encontrados.")
                        self.ingest_list(to_ingest)
            except Exception as e:
                print(f"  [ERROR] Pulo na tabela {table_name}: {str(e).splitlines()[0]}")
                continue

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
    parser.add_argument('--from', dest='from_date', type=str)

    args = parser.parse_args()
    
    # Se nenhum argumento for passado, o padrão é o --full
    is_full = args.full or not (args.update_hot or args.specify or args.complete_missing)
    ingestor = CVMIngestor(full_clean=is_full)

    if args.update_hot: ingestor.run_update_hot()
    elif args.specify: ingestor.run_specify(args.specify, from_date=args.from_date)
    elif args.complete_missing: ingestor.run_complete_missing()
    else: ingestor.run_full()

if __name__ == "__main__":
    main()