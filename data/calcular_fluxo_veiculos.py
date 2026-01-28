

import sys
import os
import pandas as pd
import numpy as np

# Adicionar path para importar common
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from common.postgresql import PostgresConnector

def calcular_fluxo():
    db = PostgresConnector()
    print("Iniciando cálculo de fluxo de veículos com quebra por Peer (Classe)...")

    # 1. Carregar os CNPJs de interesse (Alocadores) e sua Segmentação
    print("Carregando alocadores e segmentos...")
    df_alocadores = db.read_sql("SELECT DISTINCT cnpj_fundo, segmentacao FROM alocadores.cliente_segmentado")
    if df_alocadores.empty:
        print("Erro: Tabela alocadores.cliente_segmentado está vazia.")
        return
    
    # Normalizar CNPJs dos alocadores para garantir match
    cnpjs_alocadores = tuple(df_alocadores['cnpj_fundo'].tolist())
    
    # 2. Carregar dados da Carteira (blc_2)
    print("Carregando dados da carteira (cvm.cda_fi_blc_2)...")
    if len(cnpjs_alocadores) == 1:
        where_clause = f"= '{cnpjs_alocadores[0]}'"
    else:
        where_clause = f"IN {str(cnpjs_alocadores).replace(',)', ')')}"

    query_carteira = f"""
        SELECT cnpj_fundo, cnpj_fundo_cota, dt_comptc, vl_merc_pos_final
        FROM cvm.cda_fi_blc_2
        WHERE cnpj_fundo {where_clause}
    """
    df_carteira = db.read_sql(query_carteira)
    
    if df_carteira.empty:
        print("Nenhum dado de carteira encontrado.")
        return

    print(f"Dados de carteira carregados: {len(df_carteira)} registros.")
    
    # 3. Carregar Classes (Peers) dos Fundos Investidos
    # Pegamos todos os CNPJs que aparecem como ativos
    cnpjs_investidos = df_carteira['cnpj_fundo_cota'].dropna().unique().tolist()
    
    # Batch processing se forem muitos CNPJs
    print(f"Buscando classes para {len(cnpjs_investidos)} fundos investidos...")
    
    # Buscar classe mais recente (dt_fim IS NULL ou maior dt_ini)
    # Otimização: ler cadastro simplificado
    chunk_size = 5000
    peer_map = {}
    
    for i in range(0, len(cnpjs_investidos), chunk_size):
        chunk = cnpjs_investidos[i:i+chunk_size]
        if len(chunk) == 1:
            chunk_where = f"= '{chunk[0]}'"
        else:
            chunk_where = f"IN {str(tuple(chunk)).replace(',)', ')')}"
            
        q_classe = f"""
            SELECT cnpj_fundo, classe, sit 
            FROM cvm.cadastro 
            WHERE cnpj_fundo {chunk_where}
            ORDER BY dt_ini DESC
        """
        df_classes = db.read_sql(q_classe)
        # Drop duplicates mantendo o primeiro (mais recente devido ao order by)
        df_classes.drop_duplicates('cnpj_fundo', keep='first', inplace=True)
        
        # Criar mapa CNPJ -> Classe
        batch_map = df_classes.set_index('cnpj_fundo')['classe'].to_dict()
        peer_map.update(batch_map)
        
    print("Mapeamento de classes concluído.")
    
    # 4. Enriquecer Carteira com Peer e Segmentação do Alocador
    # Mapear Peer do Ativo
    df_carteira['peer_ativo'] = df_carteira['cnpj_fundo_cota'].map(peer_map).fillna('Outros')
    
    # Mapear Segmentação do Alocador (Peer do CNPJ Fundo)
    # O usuário pediu "cnpj_fundo e peer mais recente". 
    # Vou incluir o peer do alocador (segmentação) como coluna também.
    alocador_map = df_alocadores.set_index('cnpj_fundo')['segmentacao'].to_dict()
    df_carteira['peer_alocador'] = df_carteira['cnpj_fundo'].map(alocador_map)
    
    # 5. Agrupar Somando Posição
    # Agrupamos por Alocador, Peer do Ativo, Data
    print("Agrupando dados...")
    df_grouped = df_carteira.groupby(['cnpj_fundo', 'peer_ativo', 'dt_comptc'])['vl_merc_pos_final'].sum().reset_index()
    df_grouped.rename(columns={'vl_merc_pos_final': 'total_pos'}, inplace=True)
    
    # 6. Calcular Fluxos Janelados (Lógica Snapshot Referência Global com Ffill)
    print("Calculando fluxos (Referência Global c/ Ffill)...")
    df_grouped['dt_comptc'] = pd.to_datetime(df_grouped['dt_comptc'])
    
    # Definir Data de Referência (Máxima encontrada na base GERAL)
    max_date = df_grouped['dt_comptc'].max()
    # Normalizar para final de mês para garantir
    from pandas.tseries.offsets import MonthEnd
    max_date = max_date + MonthEnd(0)
    
    print(f"Data de Referência Global: {max_date.date()}")
    
    janelas = [6, 12, 24, 36, 48, 60]
    final_rows = []
    
    # Processar Fundo a Fundo para evitar explosão de memória e garantir ffill correto
    cnpjs_unicos = df_grouped['cnpj_fundo'].unique()
    
    print(f"Processando {len(cnpjs_unicos)} fundos individuais...")
    
    for i, cnpj in enumerate(cnpjs_unicos):
        # Filtrar dados do fundo
        df_fundo = df_grouped[df_grouped['cnpj_fundo'] == cnpj].copy()
        
        # Pivotar: Index=Data, Columns=PeerAtivo
        pivot = df_fundo.pivot(index='dt_comptc', columns='peer_ativo', values='total_pos')
        
        # Criar índice de datas completo do início do fundo até a DATA MÁXIMA GLOBAL
        start_date = pivot.index.min()
        full_idx = pd.date_range(start=start_date, end=max_date, freq='ME') 
        
        # Reindexar e Ffill
        pivot_filled = pivot.reindex(full_idx).ffill()
        
        # Preencher NaNs residuais com 0 (caso fundo começou depois ou gaps no início - embora ffill cubra gaps)
        pivot_filled = pivot_filled.fillna(0)
        
        # Agora pegamos apenas a linha da Data de Referência
        if max_date not in pivot_filled.index:
            continue
            
        row_ref = pivot_filled.loc[max_date] 
        
        # Para cada Peer Ativo, calcular os fluxos
        for peer_ativo in row_ref.index:
            val_atual = row_ref[peer_ativo]
            
            # Se a posição atual é zero, mas já teve posição antes, pode ser saída relevante
            # Se nunca teve (sempre 0), é ruído, mas deixamos
            
            res = {
                'cnpj_fundo': cnpj,
                'peer_ativo': peer_ativo,
                'dt_comptc': max_date.date(),
                'total_pos': val_atual
            }
            
            for m in janelas:
                # Calcular data passada exata
                dt_past = max_date - pd.DateOffset(months=m) + MonthEnd(0)
                
                # Buscar valor passado no pivot preenchido
                val_past = 0.0
                if dt_past in pivot_filled.index:
                    val_past = pivot_filled.loc[dt_past, peer_ativo]
                
                # Fluxo
                res[f'fluxo_{m}m'] = val_atual - val_past
            
            final_rows.append(res)
            
    # Criar DF final
    final_df = pd.DataFrame(final_rows)
    
    print("Amostra:")
    print(final_df.head())
    
    # 7. Salvar
    print("Salvando tabela alocadores.fluxo_veiculos...")
    db.overwrite_table(final_df, 'alocadores.fluxo_veiculos')
    print("Concluído!")

if __name__ == "__main__":
    calcular_fluxo()
