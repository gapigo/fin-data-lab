#!/usr/bin/env python3
"""
Script para explorar as tabelas CVM disponíveis no banco de dados.
Usado para entender a estrutura e planejar a integração.
"""
import sys
sys.path.append('..')
from common.postgresql import PostgresConnector

db = PostgresConnector()

def list_all_fi_tables():
    """Lista todas as tabelas que começam com fi_ no schema CVM"""
    query = """
    SELECT CONCAT(table_schema, '.', table_name) tabela 
    FROM information_schema.tables 
    WHERE table_schema = 'cvm' AND table_name LIKE 'fi_%' 
    ORDER BY table_name DESC;
    """
    df = db.read_sql(query)
    print("=== Tabelas CVM que iniciam com 'fi_' ===")
    print(f"Total: {len(df)} tabelas\n")
    for _, row in df.iterrows():
        print(f"  - {row['tabela']}")
    return df['tabela'].tolist()

def list_all_views():
    """Lista todas as views no schema CVM"""
    query = """
    SELECT table_name, table_type
    FROM information_schema.tables 
    WHERE table_schema = 'cvm' 
    AND table_type = 'VIEW'
    ORDER BY table_name;
    """
    df = db.read_sql(query)
    print("\n=== Views no schema CVM ===")
    print(f"Total: {len(df)} views\n")
    for _, row in df.iterrows():
        print(f"  - cvm.{row['table_name']}")
    return df

def sample_table(table_name: str, limit: int = 1):
    """Mostra uma amostra de uma tabela, excluindo __id e __file"""
    print(f"\n=== Amostra: {table_name} ===")
    query = f"SELECT * FROM {table_name} LIMIT {limit}"
    df = db.read_sql(query)
    
    # Remove colunas internas
    cols_to_drop = [c for c in df.columns if c.startswith('__')]
    if cols_to_drop:
        df = df.drop(columns=cols_to_drop)
    
    print(f"Colunas ({len(df.columns)}): {df.columns.tolist()}")
    if not df.empty:
        print("\nValores de exemplo:")
        for col in df.columns:
            print(f"  {col}: {df[col].iloc[0]}")
    return df

def check_fund_exists_in_cda(cnpj: str):
    """Verifica em quais tabelas CDA um fundo aparece"""
    cnpj_clean = cnpj.strip()
    print(f"\n=== Buscando fundo {cnpj_clean} em tabelas CDA ===\n")
    
    cda_tables = [
        'cvm.cda_fi_blc_1',
        'cvm.cda_fi_blc_2', 
        'cvm.cda_fi_blc_3',
        'cvm.cda_fi_blc_4',
        'cvm.cda_fi_blc_5',
        'cvm.cda_fi_blc_6',
        'cvm.cda_fi_blc_7',
        'cvm.cda_fi_blc_8',
        'cvm.cda_fi_pl',
        'cvm.cda_fie',
        'cvm.cda_fiim',
    ]
    
    results = {}
    for table in cda_tables:
        try:
            query = f"SELECT COUNT(*) as cnt FROM {table} WHERE cnpj_fundo = '{cnpj_clean}'"
            df = db.read_sql(query)
            count = df['cnt'].iloc[0] if not df.empty else 0
            results[table] = count
            print(f"  {table}: {count} registros")
        except Exception as e:
            print(f"  {table}: ERRO - {e}")
            results[table] = -1
    
    return results

def get_fund_portfolio_details(cnpj: str):
    """Busca detalhes da carteira de um fundo usando todas as tabelas CDA"""
    cnpj_clean = cnpj.strip()
    print(f"\n=== Carteira do fundo {cnpj_clean} ===\n")
    
    # Primeiro, vamos ver a data mais recente disponível
    query = f"""
    SELECT MAX(dt_comptc) as max_date 
    FROM cvm.cda_fi_pl 
    WHERE cnpj_fundo = '{cnpj_clean}'
    """
    df_date = db.read_sql(query)
    if df_date.empty or df_date['max_date'].iloc[0] is None:
        print("  Fundo não encontrado em cda_fi_pl")
        return None
    
    max_date = df_date['max_date'].iloc[0]
    print(f"  Data mais recente: {max_date}\n")
    
    # Buscar composição por bloco
    portfolio = {}
    
    # BLC 1: Títulos Públicos
    query = f"""
    SELECT tp_titpub, tp_ativo, SUM(vl_merc_pos_final) as valor
    FROM cvm.cda_fi_blc_1
    WHERE cnpj_fundo = '{cnpj_clean}' AND dt_comptc = '{max_date}'
    GROUP BY tp_titpub, tp_ativo
    ORDER BY valor DESC
    LIMIT 10
    """
    df = db.read_sql(query)
    if not df.empty:
        portfolio['titulos_publicos'] = df.to_dict('records')
        print(f"  BLC 1 (Títulos Públicos): {len(df)} tipos de ativos")
    
    # BLC 2: Cotas de Fundos
    query = f"""
    SELECT nm_fundo_cota, cnpj_fundo_cota, SUM(vl_merc_pos_final) as valor
    FROM cvm.cda_fi_blc_2
    WHERE cnpj_fundo = '{cnpj_clean}' AND dt_comptc = '{max_date}'
    GROUP BY nm_fundo_cota, cnpj_fundo_cota
    ORDER BY valor DESC
    LIMIT 10
    """
    df = db.read_sql(query)
    if not df.empty:
        portfolio['cotas_fundos'] = df.to_dict('records')
        print(f"  BLC 2 (Cotas de Fundos): {len(df)} fundos")
    
    # BLC 4: Ações
    query = f"""
    SELECT cd_ativo, ds_ativo, SUM(vl_merc_pos_final) as valor
    FROM cvm.cda_fi_blc_4
    WHERE cnpj_fundo = '{cnpj_clean}' AND dt_comptc = '{max_date}'
    GROUP BY cd_ativo, ds_ativo
    ORDER BY valor DESC
    LIMIT 10
    """
    df = db.read_sql(query)
    if not df.empty:
        portfolio['acoes'] = df.to_dict('records')
        print(f"  BLC 4 (Ações/Derivativos): {len(df)} ativos")
    
    # BLC 5: Crédito Privado (Debêntures, CRI, CRA)
    query = f"""
    SELECT emissor, SUM(vl_merc_pos_final) as valor
    FROM cvm.cda_fi_blc_5
    WHERE cnpj_fundo = '{cnpj_clean}' AND dt_comptc = '{max_date}'
    GROUP BY emissor
    ORDER BY valor DESC
    LIMIT 10
    """
    df = db.read_sql(query)
    if not df.empty:
        portfolio['credito_privado'] = df.to_dict('records')
        print(f"  BLC 5 (Crédito Privado): {len(df)} emissores")
    
    # BLC 7: Ativos no Exterior
    query = f"""
    SELECT ds_ativo_exterior, pais, SUM(vl_merc_pos_final) as valor
    FROM cvm.cda_fi_blc_7
    WHERE cnpj_fundo = '{cnpj_clean}' AND dt_comptc = '{max_date}'
    GROUP BY ds_ativo_exterior, pais
    ORDER BY valor DESC
    LIMIT 10
    """
    df = db.read_sql(query)
    if not df.empty:
        portfolio['exterior'] = df.to_dict('records')
        print(f"  BLC 7 (Exterior): {len(df)} ativos")
    
    return portfolio

def get_fund_structure(cnpj: str):
    """Busca informações sobre a estrutura do fundo (FIC, espelhos, etc)"""
    cnpj_clean = cnpj.strip()
    print(f"\n=== Estrutura do fundo {cnpj_clean} ===\n")
    
    # Fundos em que este fundo investe (BLC 2)
    query = f"""
    SELECT DISTINCT cnpj_fundo_cota, nm_fundo_cota
    FROM cvm.cda_fi_blc_2
    WHERE cnpj_fundo = '{cnpj_clean}'
    AND dt_comptc = (
        SELECT MAX(dt_comptc) FROM cvm.cda_fi_blc_2 WHERE cnpj_fundo = '{cnpj_clean}'
    )
    LIMIT 10
    """
    df = db.read_sql(query)
    if not df.empty:
        print("  Este fundo investe em:")
        for _, row in df.iterrows():
            print(f"    - {row['nm_fundo_cota']} ({row['cnpj_fundo_cota']})")
    
    # Fundos que investem neste fundo
    query = f"""
    SELECT DISTINCT cnpj_fundo, denom_social
    FROM cvm.cda_fi_blc_2
    WHERE cnpj_fundo_cota = '{cnpj_clean}'
    AND dt_comptc = (
        SELECT MAX(dt_comptc) FROM cvm.cda_fi_blc_2 WHERE cnpj_fundo_cota = '{cnpj_clean}'
    )
    LIMIT 10
    """
    df = db.read_sql(query)
    if not df.empty:
        print("\n  Fundos que investem neste:")
        for _, row in df.iterrows():
            print(f"    - {row['denom_social']} ({row['cnpj_fundo']})")
    
    # Verificar se é espelho
    query = f"""
    SELECT cnpj_fundo, cnpj_fundo_cota 
    FROM cvm.espelhos 
    WHERE cnpj_fundo = '{cnpj_clean}' OR cnpj_fundo_cota = '{cnpj_clean}'
    LIMIT 5
    """
    try:
        df = db.read_sql(query)
        if not df.empty:
            print("\n  Relações de espelho encontradas:")
            for _, row in df.iterrows():
                print(f"    {row['cnpj_fundo']} -> {row['cnpj_fundo_cota']}")
    except:
        print("\n  View 'espelhos' não disponível")

def main():
    print("="*60)
    print("EXPLORADOR DE TABELAS CVM")
    print("="*60)
    
    # 1. Listar tabelas fi_
    tables = list_all_fi_tables()
    
    # 2. Listar views
    list_all_views()
    
    # 3. Testar com um fundo conhecido
    test_cnpj = "29.206.196/0001-57"  # Trígono Flagship
    
    # 4. Verificar onde o fundo aparece
    check_fund_exists_in_cda(test_cnpj)
    
    # 5. Buscar carteira
    get_fund_portfolio_details(test_cnpj)
    
    # 6. Verificar estrutura
    get_fund_structure(test_cnpj)

if __name__ == "__main__":
    main()
