
import sys
import os
import time

# Path setup
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from common.postgresql import PostgresConnector

def create_indexes():
    db = PostgresConnector()
    print("Iniciando criação de índices...")
    
    # 1. Tabelas de Carteiras (BLC)
    # As views cda_fi_blc_X apontam para fi_doc_cda_fi_blc_X
    # As colunas variam um pouco (cnpj_fundo vs cnpj_fundo_classe), vamos checar
    # Mas geralmente as tabelas base brutas importadas têm 'cnpj_fundo' ou similar.
    
    # Lista de tabelas base (conforme montar_views.ipynb)
    tables = [
        "fi_doc_cda_fi_blc_1",
        "fi_doc_cda_fi_blc_2",
        "fi_doc_cda_fi_blc_3",
        "fi_doc_cda_fi_blc_4",
        "fi_doc_cda_fi_blc_5",
        "fi_doc_cda_fi_blc_6",
        "fi_doc_cda_fi_blc_7",
        "fi_doc_cda_fi_blc_8",
        "fi_doc_cda_fi_pl",
        # "fi_doc_cda_fi_confid"
    ]
    
    for t in tables:
        print(f"Indexando {t}...")
        # Check colunas para saber se é cnpj_fundo ou cnpj_fundo_classe
        try:
            sample = db.read_sql(f"SELECT * FROM cvm.{t} LIMIT 1")
            cols = sample.columns.tolist()
            
            # Identificar colunas chaves
            cnpj_col = 'cnpj_fundo' if 'cnpj_fundo' in cols else ('cnpj_fundo_classe' if 'cnpj_fundo_classe' in cols else None)
            dt_col = 'dt_comptc' if 'dt_comptc' in cols else None
            
            if cnpj_col and dt_col:
                idx_name = f"idx_{t}_cnpj_dt"
                sql = f"CREATE INDEX IF NOT EXISTS {idx_name} ON cvm.{t} ({cnpj_col}, {dt_col});"
                start = time.time()
                db.execute_sql(sql)
                print(f"  - Índice principal criado em {time.time()-start:.2f}s")
            
            # Para BLC 2 (fundos), indexar também o cnpj_fundo_cota (ativo) para reverse lookup "quem investe em mim"
            if t == "fi_doc_cda_fi_blc_2" and "cnpj_fundo_cota" in cols:
                idx_inv = f"idx_{t}_inv"
                sql = f"CREATE INDEX IF NOT EXISTS {idx_inv} ON cvm.{t} (cnpj_fundo_cota, {dt_col});"
                start = time.time()
                db.execute_sql(sql)
                print(f"  - Índice reverso (investido) criado em {time.time()-start:.2f}s")
                
        except Exception as e:
            print(f"Erro ao indexar {t}: {e}")

    # 2. Cotas
    print("Indexando Cotas (fi_doc_inf_diario_inf_diario_fi)...")
    t_cotas = "fi_doc_inf_diario_inf_diario_fi"
    try:
        # cnpj_fundo e dt_comptc
        idx_cotas = f"idx_{t_cotas}_cnpj_dt"
        sql = f"CREATE INDEX IF NOT EXISTS {idx_cotas} ON cvm.{t_cotas} (cnpj_fundo, dt_comptc);"
        start = time.time()
        db.execute_sql(sql)
        print(f"  - Índice cotas criado em {time.time()-start:.2f}s")
    except Exception as e:
        print(f"Erro ao indexar cotas: {e}")
        
    # 3. Cadastro
    # Se cvm.cadastro for tabela, indexar.
    print("Indexando Cadastro...")
    try:
        # Verificar se é tabela ou view mat
        # Assumindo tabela cvm.cadastro se existir, ou as tabelas base hist
        # O usuário disse que cvm.cadastro existe como tabela no schema check.
        
        idx_cad = "idx_cadastro_cnpj"
        sql = "CREATE INDEX IF NOT EXISTS idx_cadastro_cnpj ON cvm.cadastro (cnpj_fundo);"
        db.execute_sql(sql)
        
        # Nome para busca
        idx_name = "idx_cadastro_nome"
        # Trigram index seria melhor mas requer extensão. Vamos de btree simples.
        sql = "CREATE INDEX IF NOT EXISTS idx_cadastro_nome ON cvm.cadastro (denom_social);"
        db.execute_sql(sql)
        print("  - Índices cadastro criados.")
        
    except Exception as e:
        print(f"Erro ao indexar cadastro: {e}")

    print("Concluído!")

if __name__ == "__main__":
    create_indexes()
