"""
Script de diagnóstico para verificar dados do Itaú em Multimercado
"""
import sys
import os
import pandas as pd

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), 'api')))
from common.postgresql import PostgresConnector

def debug_itau_multimercado():
    db = PostgresConnector()
    
    print("=" * 80)
    print("DIAGNÓSTICO: Itaú em Multimercado")
    print("=" * 80)
    
    # 1. Verificar se existem dados de Itaú + Multimercado na carteira
    print("\n1. Contagem de registros Itaú + Multimercado em cvm.carteira:")
    sql_count = """
        SELECT COUNT(*) as total
        FROM cvm.carteira 
        WHERE cliente = 'Itaú' 
          AND peer = 'Multimercado'
    """
    try:
        result = db.read_sql(sql_count)
        print(f"   Total: {result['total'].iloc[0]:,}")
    except Exception as e:
        print(f"   Erro: {e}")

    # 2. Verificar com os filtros completos que usamos na API
    print("\n2. Com filtros completos da API (5 anos, excluir espelhos, cliente <> gestor_cota):")
    sql_filtered = """
        SELECT COUNT(*) as total
        FROM cvm.carteira 
        WHERE cliente = 'Itaú' 
          AND peer = 'Multimercado'
          AND dt_comptc > CURRENT_DATE - INTERVAL '5 years'
          AND cnpj_fundo NOT IN (SELECT DISTINCT cnpj_fundo FROM cvm.espelhos)
          AND cliente <> gestor_cota
    """
    try:
        result = db.read_sql(sql_filtered)
        print(f"   Total: {result['total'].iloc[0]:,}")
    except Exception as e:
        print(f"   Erro: {e}")
    
    # 3. Breakdown por filtro para identificar o problema
    print("\n3. Análise de cada filtro separadamente:")
    
    filters_to_test = [
        ("Base: Itaú + Multimercado", 
         "cliente = 'Itaú' AND peer = 'Multimercado'"),
        ("+ Últimos 5 anos", 
         "cliente = 'Itaú' AND peer = 'Multimercado' AND dt_comptc > CURRENT_DATE - INTERVAL '5 years'"),
        ("+ Excluir espelhos", 
         "cliente = 'Itaú' AND peer = 'Multimercado' AND dt_comptc > CURRENT_DATE - INTERVAL '5 years' AND cnpj_fundo NOT IN (SELECT DISTINCT cnpj_fundo FROM cvm.espelhos)"),
        ("+ cliente <> gestor_cota", 
         "cliente = 'Itaú' AND peer = 'Multimercado' AND dt_comptc > CURRENT_DATE - INTERVAL '5 years' AND cnpj_fundo NOT IN (SELECT DISTINCT cnpj_fundo FROM cvm.espelhos) AND cliente <> gestor_cota"),
    ]
    
    for label, where_clause in filters_to_test:
        sql = f"SELECT COUNT(*) as total FROM cvm.carteira WHERE {where_clause}"
        try:
            result = db.read_sql(sql)
            print(f"   {label}: {result['total'].iloc[0]:,}")
        except Exception as e:
            print(f"   {label}: Erro - {e}")
    
    # 4. Verificar gestor_cota para linhas de Itaú + Multimercado
    print("\n4. Top 10 gestor_cota para Itaú + Multimercado:")
    sql_gestor = """
        SELECT gestor_cota, COUNT(*) as total
        FROM cvm.carteira 
        WHERE cliente = 'Itaú' 
          AND peer = 'Multimercado'
          AND dt_comptc > CURRENT_DATE - INTERVAL '5 years'
        GROUP BY gestor_cota
        ORDER BY total DESC
        LIMIT 10
    """
    try:
        result = db.read_sql(sql_gestor)
        print(result.to_string(index=False))
    except Exception as e:
        print(f"   Erro: {e}")
    
    # 5. Verificar se cliente = gestor_cota em muitos casos
    print("\n5. Quantos registros têm cliente = gestor_cota?")
    sql_same = """
        SELECT 
            SUM(CASE WHEN cliente = gestor_cota THEN 1 ELSE 0 END) as cliente_igual_gestor,
            SUM(CASE WHEN cliente <> gestor_cota THEN 1 ELSE 0 END) as cliente_diferente_gestor,
            COUNT(*) as total
        FROM cvm.carteira 
        WHERE cliente = 'Itaú' 
          AND peer = 'Multimercado'
          AND dt_comptc > CURRENT_DATE - INTERVAL '5 years'
    """
    try:
        result = db.read_sql(sql_same)
        print(result.to_string(index=False))
    except Exception as e:
        print(f"   Erro: {e}")
    
    # 6. Verificar datas disponíveis para Itaú + Multimercado
    print("\n6. Range de datas para Itaú + Multimercado (com todos os filtros):")
    sql_dates = """
        SELECT 
            MIN(dt_comptc) as data_mais_antiga,
            MAX(dt_comptc) as data_mais_recente
        FROM cvm.carteira 
        WHERE cliente = 'Itaú' 
          AND peer = 'Multimercado'
          AND dt_comptc > CURRENT_DATE - INTERVAL '5 years'
          AND cnpj_fundo NOT IN (SELECT DISTINCT cnpj_fundo FROM cvm.espelhos)
          AND cliente <> gestor_cota
    """
    try:
        result = db.read_sql(sql_dates)
        print(result.to_string(index=False))
    except Exception as e:
        print(f"   Erro: {e}")
    
    # 7. Amostra de dados
    print("\n7. Amostra de 5 registros (se existirem):")
    sql_sample = """
        SELECT dt_comptc, cliente, cliente_segmentado, nm_fundo_cota, gestor_cota, peer, vl_merc_pos_final
        FROM cvm.carteira 
        WHERE cliente = 'Itaú' 
          AND peer = 'Multimercado'
          AND dt_comptc > CURRENT_DATE - INTERVAL '5 years'
          AND cnpj_fundo NOT IN (SELECT DISTINCT cnpj_fundo FROM cvm.espelhos)
          AND cliente <> gestor_cota
        ORDER BY dt_comptc DESC
        LIMIT 5
    """
    try:
        result = db.read_sql(sql_sample)
        if result.empty:
            print("   NENHUM REGISTRO ENCONTRADO!")
        else:
            print(result.to_string(index=False))
    except Exception as e:
        print(f"   Erro: {e}")
    
    print("\n" + "=" * 80)
    print("FIM DO DIAGNÓSTICO")
    print("=" * 80)

if __name__ == "__main__":
    debug_itau_multimercado()
