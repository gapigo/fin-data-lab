import sys; sys.path.append('..')
import pandas as pd
import numpy as np
from datetime import datetime
from sqlalchemy import text
from common.postgresql import PostgresConnector

def calculate_metrics_175_optimized():
    db = PostgresConnector()
    
    print("Carregando cotas (CVM 175 ready)...")
    # Coalesce no id_subclasse para evitar problemas de chave nula no DataFrame
    query_cotas = """
        SELECT 
            cnpj_fundo, 
            COALESCE(TEXT(id_subclasse), 'MASTER') as id_subclasse_clean,
            dt_comptc, 
            vl_quota 
        FROM cvm.cotas 
        WHERE dt_comptc >= '2014-06-01'
    """
    df_cotas = db.read_sql(query_cotas)
    
    # [PERSONALIZAÇÃO] Removendo __id conforme instrução
    if "__id" in df_cotas.columns:
        df_cotas = df_cotas.drop(columns=["__id"])

    # 1. TRATAMENTO DE DUPLICADOS (Prevenção do ValueError)
    # Mantemos apenas o último registro caso haja duplicidade para a mesma data/entidade
    print("Limpando duplicatas...")
    df_cotas = df_cotas.drop_duplicates(subset=['dt_comptc', 'cnpj_fundo', 'id_subclasse_clean'], keep='last')

    # Criar chave única para o pivot
    df_cotas['entity_id'] = df_cotas['cnpj_fundo'] + " | " + df_cotas['id_subclasse_clean']
    
    # Carregar Benchmarks
    df_bench = db.read_sql("SELECT data as dt_comptc, codigo, valor FROM middle.indices_cotas")
    bench_pivot = df_bench.pivot(index='dt_comptc', columns='codigo', values='valor').ffill()
    bench_ret = np.log(bench_pivot / bench_pivot.shift(1))

    print("Pivoteando matriz volumosa...")
    df_cotas['dt_comptc'] = pd.to_datetime(df_cotas['dt_comptc'])
    
    # Agora o pivot não falhará pois limpamos as duplicatas acima
    matrix = df_cotas.pivot(index='dt_comptc', columns='entity_id', values='vl_quota').sort_index().ffill()
    
    # Retornos logarítmicos matriciais
    returns = np.log(matrix / matrix.shift(1))
    
    # Fechamentos de mês (último dia útil)
    fechamentos = df_cotas['dt_comptc'].groupby([df_cotas['dt_comptc'].dt.year, df_cotas['dt_comptc'].dt.month]).max()
    fechamentos = fechamentos[(fechamentos >= '2015-01-01') & (fechamentos <= '2025-12-31')]

    janelas = {'6M': 126, '12M': 252, '24M': 504, '36M': 756, '48M': 1008, '60M': 1260}
    final_results = []

    # Cache de idade (primeira cota de cada entidade)
    primeira_cota = matrix.apply(lambda x: x.first_valid_index())

    for dt_ref in fechamentos:
        print(f"Calculando {dt_ref.date()}...")
        idx_fim = matrix.index.get_indexer([dt_ref], method='pad')[0]
        
        for label, dias in janelas.items():
            idx_ini = max(0, idx_fim - dias)
            if idx_fim <= idx_ini: continue
            
            window_ret = returns.iloc[idx_ini+1 : idx_fim+1]
            if window_ret.empty: continue

            # --- VETORIZAÇÃO ---
            cum_ret = np.exp(window_ret.sum()) - 1
            vol = window_ret.std() * np.sqrt(252)
            
            # Drawdown e MDD
            cum_prices = np.exp(window_ret.cumsum())
            running_max = cum_prices.cummax()
            mdd = ((cum_prices / running_max) - 1).min()
            
            # Sharpe (RF = CDINI)
            rf_total = np.exp(bench_ret['CDINI'].iloc[idx_ini+1 : idx_fim+1].sum()) - 1
            # Evita divisão por zero na volatilidade
            vol_safe = vol.replace(0, np.nan)
            sharpe = (cum_ret - rf_total) / vol_safe
            
            # Calmar e Sortino
            calmar = cum_ret / abs(mdd).replace(0, np.nan)
            downside_std = window_ret[window_ret < 0].std() * np.sqrt(252)
            sortino = (cum_ret - rf_total) / downside_std.replace(0, np.nan)
            
            # Expected Shortfall (5%)
            es = window_ret.quantile(0.05)

            # Idade e Filtro de Existência
            idade_real_meses = ((dt_ref - primeira_cota).dt.days / 30.44).round(2)
            
            batch = pd.DataFrame({
                'entity_id': matrix.columns,
                'dt_comptc': dt_ref.date(),
                'janela': label,
                'ret': cum_ret,
                'vol': vol,
                'mdd': mdd,
                'sharpe': sharpe,
                'sortino': sortino,
                'calmar': calmar,
                'es': es,
                'hit_ratio': (window_ret > 0).sum() / len(window_ret),
                'meses_observados': np.minimum(idade_real_meses, dias/21)
            }).dropna(subset=['ret'])

            batch = batch[batch['entity_id'].map(primeira_cota) <= dt_ref]
            
            # Reverter entity_id para colunas separadas
            split_cols = batch['entity_id'].str.split(" | ", expand=True, n=1)
            batch['cnpj_fundo'] = split_cols[0]
            batch['id_subclasse'] = split_cols[1].replace('MASTER', np.nan)
            
            final_results.append(batch.drop(columns=['entity_id']))

    # Consolidação e Information Ratio
    df_final = pd.concat(final_results, ignore_index=True)
    
    # [INFO RATIO]
    df_classes = db.read_sql("SELECT cnpj_fundo, classe FROM cvm.fi_cad_fi_hist_classe")
    # [PERSONALIZAÇÃO] Drop __id da tabela de classe
    if "__id" in df_classes.columns: df_classes = df_classes.drop(columns=["__id"])
    
    df_final = df_final.merge(df_classes.drop_duplicates('cnpj_fundo'), on='cnpj_fundo', how='left')
    
    # Benchmarks para IR
    ret_ibov = np.exp(bench_ret['IBOV'].sum())-1
    ir_ibov = (df_final['ret'] - ret_ibov) / df_final['vol'].replace(0, np.nan)
    ir_cdi = (df_final['ret'] - rf_total) / df_final['vol'].replace(0, np.nan)
    
    df_final['info_ratio'] = np.where(df_final['classe'].str.contains('Ações', na=False), ir_ibov, ir_cdi)

    print(f"Salvando {len(df_final)} linhas...")
    with db.engine.begin() as conn:
        conn.execute(text("CREATE SCHEMA IF NOT EXISTS middle;"))
        df_final.to_sql('fundos_metricas_175', conn, schema='middle', if_exists='replace', index=False)
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_metricas_175 
            ON middle.fundos_metricas_175 (cnpj_fundo, id_subclasse, dt_comptc, janela);
        """))

    print("Processo concluído com sucesso!")

if __name__ == "__main__":
    calculate_metrics_175_optimized()