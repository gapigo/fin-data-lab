
import sys
import os
import pandas as pd
import numpy as np
from datetime import date

# Adicionar path para importar common
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from common.postgresql import PostgresConnector

def calcular_fluxo_refatorado():
    db = PostgresConnector()
    print("Iniciando cálculo de fluxo de veículos (Refatorado - FFill até Data Ref)...")

    # 1. Obter Data de Referência Global (Máxima em cvm.cda_fi_blc_2)
    print("Obtendo data de referência global...")
    sql_global_date = "SELECT MAX(dt_comptc) as max_date FROM cvm.cda_fi_blc_2"
    df_date = db.read_sql(sql_global_date)
    if df_date.empty or pd.isnull(df_date.iloc[0]['max_date']):
        print("Erro: Não foi possível obter data de referência de cvm.cda_fi_blc_2")
        return
    
    global_max_date = pd.to_datetime(df_date.iloc[0]['max_date'])
    print(f"Data de Referência Global: {global_max_date.date()}")

    # 2. Carregar dados brutos de carteira
    # Precisamos de todo o histórico para fazer o ffill corretamente e calcular diffs longos (60m)
    print("Carregando histórico de posições da cvm.carteira...")
    query = """
        SELECT cnpj_fundo, dt_comptc, peer, SUM(vl_merc_pos_final) as total_pos
        FROM cvm.carteira
        GROUP BY cnpj_fundo, dt_comptc, peer
        ORDER BY cnpj_fundo, dt_comptc
    """
    df = db.read_sql(query)
    
    if df.empty:
        print("Erro: cvm.carteira vazia.")
        return

    df['dt_comptc'] = pd.to_datetime(df['dt_comptc'])
    
    # Lista de janelas solicitadas
    janelas = [6, 12, 24, 36, 48, 60]
    results = []
    
    # Processar por Fundo
    print(f"Processando {df['cnpj_fundo'].nunique()} fundos...")
    
    # Otimização: Agrupar e aplicar
    # Para cada grupo (fundo), vamos fazer reindex até a data global
    
    def process_group(group):
        if group.empty:
            return None
            
        cnpj = group['cnpj_fundo'].iloc[0]
        # O peer pode mudar ao longo do tempo? Assumimos que queremos agrupar fluxo por peer.
        # Se um fundo muda de peer, isso complica. Vamos assumir o peer mais recente para a "linha" final,
        # mas calcular o fluxo baseando-se no histórico. O usuário pediu "por cnpj_fundo e peer".
        # Se um fundo tem Peer A em Jan e Peer B em Dez, o fluxo de Dez deve ser atribuído ao Peer B?
        # Sim, faz sentido.
        
        # Vamos pivotar por peer para tratar caso de múltiplos peers no histórico (raro mas possível)
        # Se o fundo investe em múltiplos peers ao msm tempo? Sim, "peer" aqui é do ATIVO (fundo investido).
        # A cvm.carteira tem `peer` da cota investida.
        # Então um Allocador investe em vários ativos com peers diferentes.
        # O cálculo deve ser por (Allocador, Peer_Ativo).
        
        # Nesse caso, o group deve ser ['cnpj_fundo', 'peer']
        
        # Reindexar mensalmente até a global_max_date
        # Start date: primeira data do fundo nesse peer
        start_date = group['dt_comptc'].min()
        
        # Criar range mensal completo
        full_idx = pd.date_range(start=start_date, end=global_max_date, freq='ME')
        
        # Set index e reindex
        g_indexed = group.set_index('dt_comptc')
        # Remove duplicatas de index se houver (mesmo fundo/peer/data)
        g_indexed = g_indexed[~g_indexed.index.duplicated(keep='last')]
        
        # Reindex com forward fill (propaga a última posição conhecida até hoje)
        g_filled = g_indexed.reindex(full_idx, method='ffill')
        
        # Fill zeros para datas antes do inicio (não deve acontecer dado start_date) 
        # ou buracos no meio que ffill pegou
        g_filled['total_pos'] = g_filled['total_pos'].fillna(0)
        g_filled['cnpj_fundo'] = cnpj
        g_filled['peer'] = group['peer'].iloc[0] # Peer é constante neste grupo do apply
        
        # Calcular Fluxos para a ÚLTIMA data (que é global_max_date)
        # Queremos o valor nesta data
        last_row = g_filled.iloc[-1]
        
        # Se a última data real do fundo for muito antiga (ex: fundo fechou em 2020), 
        # o ffill vai trazer saldo de 2020 até 2025. Isso é correto?
        # Para "calcular fluxo", se o fundo morreu, saldo é zero.
        # Mas 'cvm.carteira' normalmente filtra fundos ativos ou 'dt_fim is null'.
        # Assumiremos que ffill é o desejado para "atraso de divulgação".
        
        res = {
            'cnpj_fundo': cnpj,
            'peer_ativo': group['peer'].iloc[0],
            'dt_comptc': global_max_date,  # Forçamos a data ser a de referência
            'total_pos': last_row['total_pos']
        }
        
        # Calcular diffs
        # Posição atual (na data ref) menos Posição na data (ref - janela)
        # Como g_filled tem todas as datas mensais, podemos usar shift ou loc
        
        current_val = last_row['total_pos']
        
        for m in janelas:
            # Data alvo no passado
            target_date = global_max_date - pd.DateOffset(months=m)
            # Encontrar o valor mais próximo ou exato no índice
            # Como é freq='ME', target_date deve bater se for fim de mês.
            # Ajustar target_date para fim de mês se necessário
            target_date = target_date + pd.offsets.MonthEnd(0)
            
            if target_date in g_filled.index:
                past_val = g_filled.loc[target_date, 'total_pos']
                # Se past_val for NaN (antes do inicio do fundo), fluxo é desde o inicio
                if pd.isna(past_val):
                    past_val = 0
                fluxo = current_val - past_val
            else:
                # Se a data alvo é antes do início do histórico do fundo + ffill,
                # assumimos que a posição era 0?
                # "todo fundo que teve fluxo 6M precisa ter fluxo 12M em diante"
                # Se o fundo começou há 1 mês, Pos(Hoje) - Pos(-6M = 0) = Pos(Hoje).
                past_val = 0
                fluxo = current_val - 0
            
            res[f'fluxo_{m}m'] = fluxo
            
        return res

    # Agrupar por Allocador e PeerInvestido
    # Isso gera muitas linhas, processar pandas apply pode ser lento.
    # Vamos tentar vetorizar se possível, ou iterar grupos.
    
    # Lista de resultados
    final_rows = []
    
    grouped = df.groupby(['cnpj_fundo', 'peer'])
    
    # Processamento
    # Para performance, vamos trabalhar com pivot table global
    print("Pivotando dados para cálculo vetorizado...")
    pivot = df.pivot_table(index='dt_comptc', columns=['cnpj_fundo', 'peer'], values='total_pos', aggfunc='sum')
    
    # Reindex pivot até data global
    full_idx = pd.date_range(start=pivot.index.min(), end=global_max_date, freq='ME')
    pivot = pivot.reindex(full_idx)
    
    # FFill para propagar dados recentes
    pivot = pivot.ffill()
    pivot = pivot.fillna(0) # Zeros antes do inicio
    
    # Pegar valores na data final
    if global_max_date not in pivot.index:
         # Isso não deve acontecer se o reindex funcionou e global_max é MonthEnd
         # Se global_max não for month end, precisamos ajustar
         pass

    # Garantir que pegamos a última linha que corresponde à global_max_date
    final_pos = pivot.loc[pivot.index == global_max_date].iloc[0] # Series com MultiIndex (CNPJ, Peer)
    
    # Dicionário para montar DataFrame final
    data_dict = {
        'cnpj_fundo': final_pos.index.get_level_values(0),
        'peer_ativo': final_pos.index.get_level_values(1),
        'dt_comptc': [global_max_date] * len(final_pos),
        'total_pos': final_pos.values
    }
    
    # Calcular fluxos vetorizados
    for m in janelas:
        print(f"Calculando janela {m}M...")
        # Data no passado
        # Como o índice é DatetimeIndex, podemos usar shift se os intervalos fossem regulares.
        # Mas 'm' é meses. 'ME' garante regularidade mensal.
        # shift(m) pega m linhas atrás.
        
        diff = pivot.diff(m) # pivot - pivot.shift(m)
        
        # Valor do fluxo na data final
        fluxos_na_data = diff.loc[diff.index == global_max_date].iloc[0]
        
        # Se shift resultou em NaN (período antes do início), diff é NaN.
        # Devemos tratar como (Valor Atual - 0) ?
        # shift(m) retorna NaN para os primeiros m meses.
        # diff = col - col.shift(). Se col.shift é NaN, diff é NaN.
        # Queremos: se NaN, considerar 0. 
        # Então fazemos: pivot - pivot.shift(m).fillna(0)
        
        shifted = pivot.shift(m).fillna(0)
        diff_calculated = pivot - shifted
        
        vals = diff_calculated.loc[diff_calculated.index == global_max_date].iloc[0]
        data_dict[f'fluxo_{m}m'] = vals.values

    df_final = pd.DataFrame(data_dict)
    
    # Filtrar onde total_pos e fluxos são todos zero?
    # O usuário não especificou, mas dados zerados poluem o banco.
    # Mas se um fundo zerou posição recentemente, o "fluxo" é negativo, não zero.
    # Vamos manter se houver qualquer valor não nulo relevante ou se total_pos > 0.
    
    cols_fluxo = [f'fluxo_{m}m' for m in janelas]
    mask = (df_final['total_pos'] != 0)
    for c in cols_fluxo:
        mask |= (df_final[c] != 0)
        
    df_final = df_final[mask]
    
    print(f"Gerados {len(df_final)} registros para a data {global_max_date.date()}.")
    
    # Salvar
    print("Salvando em alocadores.fluxo_veiculos...")
    db.overwrite_table(df_final, 'alocadores.fluxo_veiculos')
    print("Concluído sucesso.")

if __name__ == "__main__":
    calcular_fluxo_refatorado()
