import sys; sys.path.append('..')
import pandas as pd
import numpy as np
from datetime import datetime
from sqlalchemy import text
from common.postgresql import PostgresConnector

def get_recovery_time(prices_series):
    """Calcula o tempo de recuperação médio de drawdown em dias úteis."""
    if prices_series.empty: return np.nan
    rolling_max = prices_series.cummax()
    drawdown = (prices_series < rolling_max)
    
    # Identifica grupos de drawdown
    is_new_high = ~drawdown
    groups = is_new_high.cumsum()
    
    # Filtra apenas períodos em drawdown
    recovery_periods = drawdown.groupby(groups).sum()
    return recovery_periods[recovery_periods > 0].mean()

def calculate_metrics_175_optimized():
    db = PostgresConnector()
    
    print("Carregando cotas (CVM 175 ready)...")
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
    
    if "__id" in df_cotas.columns:
        df_cotas = df_cotas.drop(columns=["__id"])

    print("Limpando duplicatas...")
    df_cotas = df_cotas.drop_duplicates(subset=['dt_comptc', 'cnpj_fundo', 'id_subclasse_clean'], keep='last')
    df_cotas['dt_comptc'] = pd.to_datetime(df_cotas['dt_comptc'])
    df_cotas['entity_id'] = df_cotas['cnpj_fundo'] + " | " + df_cotas['id_subclasse_clean']
    
    # Carregar Benchmarks
    df_bench = db.read_sql("SELECT data as dt_comptc, codigo, valor FROM middle.indices_cotas")
    df_bench['dt_comptc'] = pd.to_datetime(df_bench['dt_comptc'])
    bench_pivot = df_bench.pivot(index='dt_comptc', columns='codigo', values='valor').ffill()
    bench_ret = np.log(bench_pivot / bench_pivot.shift(1))

    print("Gerando matriz de cotas...")
    matrix = df_cotas.pivot(index='dt_comptc', columns='entity_id', values='vl_quota').sort_index().ffill()
    returns = np.log(matrix / matrix.shift(1))
    
    # LÓGICA DE DATAS: Mensal até final de 2025, Diário depois.
    datas_disponiveis = matrix.index.sort_values()
    fechamentos_mensais = df_cotas[df_cotas['dt_comptc'] <= '2025-12-31']['dt_comptc'].groupby(
        [df_cotas['dt_comptc'].dt.year, df_cotas['dt_comptc'].dt.month]).max()
    datas_pos_2025 = datas_disponiveis[datas_disponiveis > '2025-12-31']
    
    todas_datas_alvo = pd.to_datetime(pd.concat([pd.Series(fechamentos_mensais), pd.Series(datas_pos_2025)]).unique()).sort_values()
    todas_datas_alvo = todas_datas_alvo[todas_datas_alvo >= '2015-01-01']

    # Check de existência (Incremental)
    tabela_destino = "metrics"
    schema_destino = "cvm"
    try:
        # Apenas tenta ler se a tabela existir
        df_existente = db.read_sql(f"SELECT DISTINCT dt_comptc, cnpj_fundo FROM {schema_destino}.{tabela_destino}")
        df_existente['dt_comptc'] = pd.to_datetime(df_existente['dt_comptc'])
        print("Histórico existente carregado para controle de duplicidade.")
    except:
        df_existente = pd.DataFrame(columns=['dt_comptc', 'cnpj_fundo'])
        print("Tabela de métricas não encontrada. Iniciando carga do zero.")

    janelas = {'6M': 126, '12M': 252, '24M': 504, '36M': 756, '48M': 1008, '60M': 1260}
    primeira_cota = matrix.apply(lambda x: x.first_valid_index())

    # Cache de Classes para o Info Ratio
    df_classes = db.read_sql("SELECT cnpj_fundo, classe FROM cvm.fi_cad_fi_hist_classe")
    if "__id" in df_classes.columns: df_classes = df_classes.drop(columns=["__id"])
    df_classes = df_classes.drop_duplicates('cnpj_fundo').set_index('cnpj_fundo')

    print(f"Iniciando processamento em batches para {len(todas_datas_alvo)} datas...")

    for dt_ref in todas_datas_alvo:
        dt_str = dt_ref.strftime('%Y-%m-%d')
        idx_fim = matrix.index.get_indexer([dt_ref], method='pad')[0]
        
        # Filtro incremental: remover fundos que já possuem essa data na tabela final
        fundos_ja_processados = df_existente[df_existente['dt_comptc'] == dt_ref]['cnpj_fundo'].unique()
        
        batch_results = []
        
        for label, dias in janelas.items():
            idx_ini = max(0, idx_fim - dias)
            if idx_fim <= idx_ini: continue
            
            window_ret = returns.iloc[idx_ini+1 : idx_fim+1]
            window_prices = matrix.iloc[idx_ini : idx_fim+1] # Para drawdown/recovery
            if window_ret.empty: continue

            # Cálculos Vetorizados
            cum_ret = np.exp(window_ret.sum()) - 1
            vol = window_ret.std() * np.sqrt(252)
            
            cum_prices = np.exp(window_ret.cumsum())
            running_max = cum_prices.cummax()
            mdd = ((cum_prices / running_max) - 1).min()
            
            # Recovery Time
            recovery_time = window_prices.apply(get_recovery_time)
            
            rf_total = np.exp(bench_ret['CDINI'].reindex(window_ret.index).sum()) - 1
            vol_safe = vol.replace(0, np.nan)
            sharpe = (cum_ret - rf_total) / vol_safe
            calmar = cum_ret / abs(mdd).replace(0, np.nan)
            
            # Filtro de existência da entidade na data
            valid_entities = primeira_cota[primeira_cota <= dt_ref].index
            
            df_batch = pd.DataFrame({
                'entity_id': valid_entities,
                'dt_comptc': dt_ref.date(),
                'janela': label,
                'ret': cum_ret.reindex(valid_entities),
                'vol': vol.reindex(valid_entities),
                'mdd': mdd.reindex(valid_entities),
                'recovery_time': recovery_time.reindex(valid_entities),
                'sharpe': sharpe.reindex(valid_entities),
                'calmar': calmar.reindex(valid_entities),
                'hit_ratio': (window_ret > 0).sum().reindex(valid_entities) / len(window_ret)
            }).dropna(subset=['ret'])

            # Split CNPJ / Subclasse
            split = df_batch['entity_id'].str.split(" | ", expand=True, n=1)
            df_batch['cnpj_fundo'] = split[0]
            df_batch['id_subclasse'] = split[1].replace('MASTER', np.nan)
            
            # Filtro Incremental (CNPJ + Data)
            df_batch = df_batch[~df_batch['cnpj_fundo'].isin(fundos_ja_processados)]
            
            if not df_batch.empty:
                batch_results.append(df_batch)

        if batch_results:
            df_to_save = pd.concat(batch_results, ignore_index=True)
            
            # Cálculo de Info Ratio antes de salvar
            df_to_save = df_to_save.join(df_classes, on='cnpj_fundo', how='left')
            ret_ibov = np.exp(bench_ret['IBOV'].reindex(pd.date_range(end=dt_ref, periods=252, freq='B')).sum())-1
            ir_ibov = (df_to_save['ret'] - ret_ibov) / df_to_save['vol'].replace(0, np.nan)
            ir_cdi = (df_to_save['ret'] - rf_total) / df_to_save['vol'].replace(0, np.nan)
            df_to_save['info_ratio'] = np.where(df_to_save['classe'].str.contains('Ações', na=False), ir_ibov, ir_cdi)
            
            # Ingestão do Batch
            with db.engine.begin() as conn:
                df_to_save.drop(columns=['entity_id', 'classe']).to_sql(
                    tabela_destino, conn, schema=schema_destino, if_exists='append', index=False
                )
            print(f"Batch {dt_str} salvo: {len(df_to_save)} linhas.")
        else:
            print(f"Data {dt_str} pulada (já processada ou sem dados).")

    print("Processo concluído!")

if __name__ == "__main__":
    calculate_metrics_175_optimized()
