
import sys
import os
import pandas as pd
import numpy as np

# Adicionar path para importar common
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from common.postgresql import PostgresConnector

def calcular_fluxo():
    db = PostgresConnector()
    print("Iniciando cálculo de fluxo de veículos (Histórico Completo) usando cvm.carteira...")

    # 1. Carregar lista de fundos (Alocadores) da view
    print("Carregando lista de fundos alocadores...")
    df_cnpjs = db.read_sql("SELECT DISTINCT cnpj_fundo, cliente_segmentado FROM cvm.carteira")
    
    if df_cnpjs.empty:
        print("Erro: View cvm.carteira retornou zero alocadores.")
        return

    # Garantir unicidade
    df_cnpjs = df_cnpjs.drop_duplicates('cnpj_fundo')
    alocadores = df_cnpjs.to_dict('records') 
    print(f"Total de alocadores identificados: {len(alocadores)}")

    janelas = [1, 3, 6, 12, 24, 36, 48, 60]
    
    # Otimização: Batch processing para reduzir queries
    batch_size = 10000
    all_results = []
    
    # Mapa de segmento para acesso rápido
    seg_map = {row['cnpj_fundo']: row['cliente_segmentado'] for row in alocadores}
    
    print(f"Processando em lotes de {batch_size}...")
    
    for i in range(0, len(alocadores), batch_size):
        chunk = alocadores[i:i+batch_size]
        # Formatar CNPJs para clausula IN
        cnpjs_list = [f"'{x['cnpj_fundo']}'" for x in chunk]
        where_in = ",".join(cnpjs_list)
        
        # Query Batch
        query = f"""
            SELECT cnpj_fundo, dt_comptc, peer, SUM(vl_merc_pos_final) as total_pos
            FROM cvm.carteira
            WHERE cnpj_fundo IN ({where_in})
            GROUP BY cnpj_fundo, dt_comptc, peer
            ORDER BY cnpj_fundo, dt_comptc
        """
        df_batch = db.read_sql(query)
        
        if df_batch.empty:
            continue
            
        df_batch['dt_comptc'] = pd.to_datetime(df_batch['dt_comptc'])
        
        # Processar cada fundo do batch localmente
        for cnpj, df_fundo in df_batch.groupby('cnpj_fundo'):
            segmento = seg_map.get(cnpj, 'Desconhecido')
            
            # Pivot
            pivot = df_fundo.pivot(index='dt_comptc', columns='peer', values='total_pos')
            # Resample mensal para garantir continuidade
            pivot = pivot.resample('ME').last().fillna(0.0)
            
            # Formato Long (Posição)
            df_long = pivot.stack().reset_index().rename(columns={0: 'total_pos'})
            df_long['cnpj_fundo'] = cnpj
            df_long['cliente_segmentado'] = segmento
            
            # Calcular Fluxos
            fluxo_cols = {}
            for m in janelas:
                diff_m = pivot.diff(periods=m)
                stacked_diff = diff_m.stack().reset_index().rename(columns={0: f'fluxo_{m}m'})
                # Indexar para join fácil
                fluxo_cols[m] = stacked_diff.set_index(['dt_comptc', 'peer'])[f'fluxo_{m}m']

            # Adicionar colunas de fluxo ao df principal
            df_long = df_long.set_index(['dt_comptc', 'peer'])
            for m in janelas:
                df_long[f'fluxo_{m}m'] = fluxo_cols[m]
            
            df_long = df_long.reset_index()
            
            # Filtrar dados anteriores ao inicio real
            start_date = df_fundo['dt_comptc'].min()
            from pandas.tseries.offsets import MonthEnd
            start_date = start_date + MonthEnd(0)
            df_long = df_long[df_long['dt_comptc'] >= start_date]
            
            all_results.append(df_long)
        
        # Logging de progresso
        if (i + batch_size) % 500 == 0 or (i + batch_size) >= len(alocadores):
            processed_count = min(i + batch_size, len(alocadores))
            print(f"Processados {processed_count}/{len(alocadores)} fundos...")

    if not all_results:
        print("Nenhum resultado gerado.")
        return

    print("Concatenando resultados finais...")
    final_df = pd.concat(all_results, ignore_index=True)
    final_df['dt_comptc'] = final_df['dt_comptc'].dt.date
    
    # Renomear peer -> peer_ativo para compatibilidade com API
    final_df.rename(columns={'peer': 'peer_ativo'}, inplace=True)
    
    print(f"Salvando {len(final_df)} registros em alocadores.fluxo_veiculos...")
    db.overwrite_table(final_df, 'alocadores.fluxo_veiculos')
    print("Concluído!")

if __name__ == "__main__":
    calcular_fluxo()
