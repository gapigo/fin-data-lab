import pandas as pd
from sqlalchemy import create_engine, text
import pandas as pd
from sqlalchemy import create_engine, text

class PostgresConnector:
    def __init__(self, connection_string='postgresql://postgres:a@localhost:5432/postgres'):
        self.engine = create_engine(connection_string)

    def _split_table(self, table_name):
        """Extrai nomes de schema e tabela protegidos por aspas."""
        if "." in table_name:
            s, t = table_name.split(".", 1)
            return f'"{s}"', f'"{t}"', s, t
        return '"public"', f'"{table_name}"', "public", table_name

    def drop_table(self, table_name: str):
        """Deleta a tabela e seu conteúdo permanentemente."""
        s_quoted, t_quoted, _, _ = self._split_table(table_name)
        with self.engine.begin() as conn:
            conn.execute(text(f"DROP TABLE IF EXISTS {s_quoted}.{t_quoted} CASCADE;"))
        print(f"Tabela {table_name} removida com sucesso.")

    def read_sql(self, query: str) -> pd.DataFrame:
        """Lê os dados e remove a coluna '__id' conforme sua instrução."""
        try:
            with self.engine.connect() as conn:
                df = pd.read_sql(text(query), conn)
                # Conforme solicitado, removemos a coluna de controle interna
                if "__id" in df.columns:
                    df = df.drop(columns=["__id"])
                return df
        except Exception as e:
            return pd.DataFrame()
    
    def execute_sql(self, query: str):
        """Executa comandos SQL que não retornam dados (DDL/DML)."""
        try:
            with self.engine.begin() as conn:
                conn.execute(text(query))
            print("Operação realizada com sucesso.")
        except Exception as e:
            print(f"Erro ao executar SQL: {e}")

    def create_table(self, df: pd.DataFrame, table_name: str):
        """Cria a tabela apenas se não existir, protegendo os dados atuais."""
        s_quoted, t_quoted, s_raw, t_raw = self._split_table(table_name)
        
        check_query = f"""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = '{s_raw}' 
                AND table_name = '{t_raw}'
            );
        """
        
        with self.engine.begin() as conn:
            conn.execute(text(f"CREATE SCHEMA IF NOT EXISTS {s_quoted};"))
            exists = conn.execute(text(check_query)).scalar()
            
            if not exists:
                df.head(0).to_sql(t_raw, conn, schema=s_raw, if_exists='replace', index=False)
                # Usamos __id como nome da PK para evitar conflitos com colunas 'id' reais
                conn.execute(text(f"ALTER TABLE {s_quoted}.{t_quoted} ADD COLUMN __id SERIAL PRIMARY KEY;"))
                print(f"Tabela {table_name} criada do zero.")
            else:
                print(f"Tabela {table_name} já existe. Pulando criação.")

    def upsert_dataframe(self, df: pd.DataFrame, table_name: str, logical_pks: list):
        """Realiza o Upsert: Insere novos e atualiza existentes via PK lógica."""
        s_quoted, t_quoted, s_raw, t_raw = self._split_table(table_name)
        temp_name = f"temp_up_{t_raw}"
        
        with self.engine.begin() as conn:
            df.to_sql(temp_name, conn, schema=s_raw, if_exists='replace', index=False)
            
            where_clause = " AND ".join([f't1."{col}" = t2."{col}"' for col in logical_pks])
            delete_sql = f'DELETE FROM {s_quoted}.{t_quoted} t1 USING {s_quoted}."{temp_name}" t2 WHERE {where_clause}'
            conn.execute(text(delete_sql))
            
            cols = ", ".join([f'"{c}"' for c in df.columns])
            insert_sql = f'INSERT INTO {s_quoted}.{t_quoted} ({cols}) SELECT {cols} FROM {s_quoted}."{temp_name}"'
            conn.execute(text(insert_sql))
            
            conn.execute(text(f'DROP TABLE {s_quoted}."{temp_name}"'))
