import sys; sys.path.append('..')
import pandas as pd
import numpy as np
from datetime import datetime
from sqlalchemy import text
from common.postgresql import PostgresConnector
import warnings

# Suprimir avisos de divisão por zero/log que trataremos no código
warnings.filterwarnings('ignore', category=RuntimeWarning)

def get_recovery_time(prices_series):
    """Calcula o tempo de recuperação médio de drawdown em dias úteis."""
    if prices_series.empty: return np.nan
    rolling_max = prices_series.cummax()
    drawdown = (prices_series < rolling_max)
    
    # Se não houver drawdown, retorna 0
    if not drawdown.any(): return 0.0
    
    # Identifica grupos de drawdown
    is_new_high = ~drawdown
    groups = is_new_high.cumsum()
    
    # Filtra apenas períodos em drawdown
    recovery_periods = drawdown.groupby(groups).sum()
    # Retorna média apenas dos periodos onde houve queda > 0 dias
    valid_periods = recovery_periods[recovery_periods > 0]
    return valid_periods.mean() if not valid_periods.empty else 0.0

def calculate_metrics_175_final():
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
    
    # [FIX] Remoção de colunas técnicas
    if "__id" in df_cotas.columns:
        df_cotas = df_cotas.drop(columns=["__id"])

    print("Limpando duplicatas e preparando matriz...")
    # Garante ordenação para o drop_duplicates manter o mais recente corretamente
    df_cotas = df_cotas.sort_values('dt_comptc')
    df_cotas = df_cotas.drop_duplicates(subset=['dt_comptc', 'cnpj_fundo', 'id_subclasse_clean'], keep='last')
    
    df_cotas['dt_comptc'] = pd.to_datetime(df_cotas['dt_comptc'])
    df_cotas['entity_id'] = df_cotas['cnpj_fundo'] + " | " + df_cotas['id_subclasse_clean']
    
    # Carregar Benchmarks
    print("Carregando Benchmarks...")
    df_bench = db.read_sql("SELECT data as dt_comptc, codigo, valor FROM middle.indices_cotas")
    df_bench['dt_comptc'] = pd.to_datetime(df_bench['dt_comptc'])
    # Pivot e clean benchmarks
    bench_pivot = df_bench.pivot(index='dt_comptc', columns='codigo', values='valor')
    bench_pivot = bench_pivot[~bench_pivot.index.duplicated(keep='last')].sort_index().ffill()
    bench_ret = np.log(bench_pivot / bench_pivot.shift(1))

    print("Gerando matriz de cotas (Pivot)...")
    matrix = df_cotas.pivot(index='dt_comptc', columns='entity_id', values='vl_quota').sort_index().ffill()
    
    # [FIX] Tratamento rigoroso de zeros/negativos antes do log
    # Substitui <= 0 por NaN, faz fill forward, e se ainda sobrar NaN no começo, fica NaN mesmo
    matrix = matrix.mask(matrix <= 0, np.nan).ffill()
    returns = np.log(matrix / matrix.shift(1))
    
    # --- LÓGICA DE DATAS (CORRIGIDA) ---
    print("Definindo datas alvo...")
    datas_disponiveis = pd.Index(matrix.index) # Garante que é Index
    
    fechamentos_mensais = df_cotas[df_cotas['dt_comptc'] <= '2025-12-31']['dt_comptc'].groupby(
        [df_cotas['dt_comptc'].dt.year, df_cotas['dt_comptc'].dt.month]).max()
    
    datas_pos_2025 = datas_disponiveis[datas_disponiveis > '2025-12-31']
    
    # Concatena e converte explicitamente para DatetimeIndex para ter acesso ao sort_values
    concat_dates = pd.concat([pd.Series(fechamentos_mensais), pd.Series(datas_pos_2025)])
    todas_datas_alvo = pd.DatetimeIndex(concat_dates.unique()).sort_values()
    
    # Filtro final de data
    todas_datas_alvo = todas_datas_alvo[todas_datas_alvo >= '2015-01-01']
    
    # Check de existência
    tabela_destino = "metrics"
    schema_destino = "cvm"
    try:
        df_existente = db.read_sql(f"SELECT DISTINCT dt_comptc, cnpj_fundo FROM {schema_destino}.{tabela_destino}")
        df_existente['dt_comptc'] = pd.to_datetime(df_existente['dt_comptc'])
        print(f"Histórico existente carregado: {len(df_existente)} registros.")
    except:
        df_existente = pd.DataFrame(columns=['dt_comptc', 'cnpj_fundo'])
        print("Iniciando carga do zero.")

    janelas = {'6M': 126, '12M': 252, '24M': 504, '36M': 756, '48M': 1008, '60M': 1260}
    primeira_cota = matrix.apply(lambda x: x.first_valid_index())

    # Cache de Classes
    df_classes = db.read_sql("SELECT cnpj_fundo, classe FROM cvm.fi_cad_fi_hist_classe")
    if "__id" in df_classes.columns: df_classes = df_classes.drop(columns=["__id"])
    # Remove duplicatas de classe pegando a mais recente se houver (simplificação) ou apenas distinct
    df_classes = df_classes.drop_duplicates('cnpj_fundo').set_index('cnpj_fundo')

    total_datas = len(todas_datas_alvo)
    print(f"Iniciando processamento de {total_datas} datas...")

    for i, dt_ref in enumerate(todas_datas_alvo):
        dt_str = dt_ref.strftime('%Y-%m-%d')
        
        # [BLINDAGEM] Try/Except por data para não perder tudo se der erro em uma
        try:
            # Verifica se já processou todos os fundos desta data? 
            # (Otimização simples: se já processou a data, precisamos ver se tem fundos novos, 
            # mas aqui vamos filtrar por fundo dentro do loop)
            fundos_ja_na_data = df_existente[df_existente['dt_comptc'] == dt_ref]['cnpj_fundo'].unique()
            
            # Encontra índice numérico da data
            if dt_ref not in matrix.index:
                # Se a data alvo não está na matriz (ex: feriado que foi fim de mês), pega o anterior válido
                idx_fim = matrix.index.get_indexer([dt_ref], method='pad')[0]
            else:
                idx_fim = matrix.index.get_loc(dt_ref)

            batch_results = []
            
            for label, dias in janelas.items():
                idx_ini = idx_fim - dias
                if idx_ini < 0: continue # Janela maior que histórico
                
                # Slicing por Posição Inteira (muito mais rápido e seguro)
                window_ret = returns.iloc[idx_ini+1 : idx_fim+1]
                window_prices = matrix.iloc[idx_ini : idx_fim+1]
                
                if window_ret.empty: continue

                # Identifica entidades válidas (que já existiam no início da janela)
                dt_ini_window = matrix.index[idx_ini]
                valid_entities_mask = primeira_cota <= dt_ini_window
                valid_entities = valid_entities_mask[valid_entities_mask].index
                
                # Filtra apenas colunas válidas para os cálculos numpy (Performance)
                current_ret = window_ret[valid_entities]
                if current_ret.empty: continue

                # --- CÁLCULOS VETORIZADOS ---
                # Retorno Acumulado
                cum_ret = np.exp(current_ret.sum()) - 1
                
                # Volatilidade Anualizada
                vol = current_ret.std() * np.sqrt(252)
                
                # Drawdown e MDD
                cum_prices_rel = np.exp(current_ret.cumsum())
                running_max = cum_prices_rel.cummax()
                mdd = ((cum_prices_rel / running_max) - 1).min()
                
                # Recovery Time (Apply é lento, mas necessário aqui)
                # Otimização: passar apenas colunas que tiveram MDD < 0
                cols_with_dd = mdd[mdd < 0].index
                rec_time = pd.Series(0.0, index=valid_entities)
                if not cols_with_dd.empty:
                    rec_time.loc[cols_with_dd] = window_prices[cols_with_dd].apply(get_recovery_time)

                # --- BENCHMARK DA JANELA ESPECÍFICA (FIX DO INFO RATIO) ---
                # Pega o retorno do benchmark EXATAMENTE nas mesmas datas do fundo
                bench_slice = bench_ret.loc[window_ret.index] 
                
                # CDI Acumulado da Janela
                rf_window_ret = np.exp(bench_slice['CDINI'].sum(min_count=1)) - 1
                
                # IBOV Acumulado da Janela (para Info Ratio)
                ibov_window_ret = np.exp(bench_slice['IBOV'].sum(min_count=1)) - 1
                
                # Sharpe (Retorno do fundo - Retorno Livre de Risco da Janela) / Vol
                sharpe = (cum_ret - rf_window_ret) / vol.replace(0, np.nan)
                
                # Calmar
                calmar = cum_ret / abs(mdd).replace(0, np.nan)
                
                # Hit Ratio
                hit_ratio = (current_ret > 0).sum() / len(current_ret)

                # Montagem do DataFrame temporário
                df_batch_janela = pd.DataFrame({
                    'entity_id': valid_entities,
                    'dt_comptc': dt_ref.date(),
                    'janela': label,
                    'ret': cum_ret,
                    'vol': vol,
                    'mdd': mdd,
                    'recovery_time': rec_time,
                    'sharpe': sharpe,
                    'calmar': calmar,
                    'hit_ratio': hit_ratio,
                    # Métricas auxiliares para Info Ratio depois
                    'rf_window': rf_window_ret, 
                    'ibov_window': ibov_window_ret
                })
                
                batch_results.append(df_batch_janela)

            if batch_results:
                df_to_save = pd.concat(batch_results, ignore_index=True)
                
                # Split IDs
                split = df_to_save['entity_id'].str.split(" | ", expand=True, n=1)
                df_to_save['cnpj_fundo'] = split[0]
                df_to_save['id_subclasse'] = split[1].replace('MASTER', np.nan)
                
                # Filtra o que já existe no banco
                df_to_save = df_to_save[~df_to_save['cnpj_fundo'].isin(fundos_ja_na_data)]
                
                if not df_to_save.empty:
                    # Join com Classes para Info Ratio
                    df_to_save = df_to_save.join(df_classes, on='cnpj_fundo', how='left')
                    
                    # Cálculo Info Ratio Correto (Janela a Janela)
                    # Se for Ações -> (Ret - Ibov_da_Janela) / Vol
                    # Se for Outros -> (Ret - CDI_da_Janela) / Vol
                    is_acoes = df_to_save['classe'].str.contains('Ações', na=False)
                    
                    ir_ibov = (df_to_save['ret'] - df_to_save['ibov_window']) / df_to_save['vol'].replace(0, np.nan)
                    ir_cdi = (df_to_save['ret'] - df_to_save['rf_window']) / df_to_save['vol'].replace(0, np.nan)
                    
                    df_to_save['info_ratio'] = np.where(is_acoes, ir_ibov, ir_cdi)
                    
                    # Limpeza final antes de salvar
                    cols_db = ['cnpj_fundo', 'id_subclasse', 'dt_comptc', 'janela', 'ret', 'vol', 
                               'mdd', 'recovery_time', 'sharpe', 'calmar', 'hit_ratio', 'info_ratio']
                    
                    # Salva no DB
                    with db.engine.begin() as conn:
                        df_to_save[cols_db].to_sql(
                            tabela_destino, conn, schema=schema_destino, if_exists='append', index=False
                        )
                    print(f"[{i+1}/{total_datas}] {dt_str}: Salvo {len(df_to_save)} registros.")
                else:
                    print(f"[{i+1}/{total_datas}] {dt_str}: Todos os fundos já processados.")
            else:
                print(f"[{i+1}/{total_datas}] {dt_str}: Sem dados suficientes para janelas.")

        except KeyboardInterrupt:
            print("Interrupção pelo usuário. Parando com segurança.")
            break
        except Exception as e:
            print(f"ERRO CRÍTICO na data {dt_str}: {e}")
            # Continua para a próxima data em vez de crashar
            continue

    print("Processo concluído!")

if __name__ == "__main__":
    calculate_metrics_175_final()