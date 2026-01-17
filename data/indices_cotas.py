import pandas as pd
import yfinance as yf
import requests
from bcb import sgs
from datetime import datetime, date
from sqlalchemy import text
from common.postgresql import PostgresConnector as db

def get_robust_cdi(start_year=2000):
    print(f"Baixando CDI (Série 12) em blocos de 10 anos desde {start_year}...")
    current_year = datetime.now().year
    all_chunks = []
    
    # Divide a busca em janelas de 10 anos para evitar o erro do BCB
    for year in range(start_year, current_year + 1, 10):
        end_year = min(year + 9, current_year)
        start_str = f"{year}-01-01"
        end_str = f"{end_year}-12-31"
        
        try:
            # sgs.get já lida com os headers que causavam o erro 406
            df_chunk = sgs.get({'valor': 12}, start=start_str, end=end_str)
            if not df_chunk.empty:
                all_chunks.append(df_chunk)
        except Exception as e:
            print(f"  [AVISO] Falha no bloco {year}-{end_year}: {e}")

    if not all_chunks:
        return pd.DataFrame()

    df = pd.concat(all_chunks)
    
    # [PERSONALIZAÇÃO] Removendo __id se a biblioteca bcb a incluir futuramente
    if "__id" in df.columns:
        df = df.drop(columns=["__id"])

    # Ordenação e Cálculo do CDINI (Cota Acumulada)
    df = df.sort_index()
    df['valor'] = (1 + df['valor'] / 100).cumprod()
    df = df.reset_index().rename(columns={'Date': 'data'})
    df['codigo'] = 'CDINI'
    
    return df[['codigo', 'valor', 'data']]

def process_all_indices_v6():
    # 1. Mercado (Yahoo)
    try:
        print("Baixando Mercado (Yahoo Finance)...")
        tickers = ['^BVSP', 'BRL=X']
        data = yf.download(tickers, start='2000-01-01', progress=False)
        
        # Tratamento de MultiIndex para versões novas do yfinance
        if isinstance(data.columns, pd.MultiIndex):
            prices = data.xs('Adj Close', level=0, axis=1) if 'Adj Close' in data.columns.get_level_values(0) else data.xs('Close', level=0, axis=1)
        else:
            prices = data['Adj Close'] if 'Adj Close' in data.columns else data['Close']
            
        df_ibov = prices['^BVSP'].dropna().reset_index()
        df_ibov.columns = ['data', 'valor']
        df_ibov['codigo'] = 'IBOV'
        
        df_dolar = prices['BRL=X'].dropna().reset_index()
        df_dolar.columns = ['data', 'valor']
        df_dolar['codigo'] = 'DOLAR_VENDA'
        df_m = pd.concat([df_ibov, df_dolar])
    except Exception as e:
        print(f"Erro no Yahoo: {e}")
        df_m = pd.DataFrame()

    # 2. CDI (Obrigatório) - Método Robusto por Blocos
    df_c = get_robust_cdi(2000)
    if df_c.empty:
        raise Exception("O CDINI falhou em todas as tentativas. Processo interrompido.")

    # 3. IPCA (Série 433)
    print("Baixando IPCA...")
    try:
        # IPCA é mensal, então a restrição de 10 anos não se aplica (ou é menos rigorosa)
        df_ipca_m = sgs.get({'taxa': 433}, start='2000-01-01')
        
        # [PERSONALIZAÇÃO] Drop de __id
        if "__id" in df_ipca_m.columns:
            df_ipca_m = df_ipca_m.drop(columns=["__id"])
            
        # Projeção Diária do IPCA
        dr = pd.date_range(df_ipca_m.index.min(), datetime.now(), freq='D')
        df_ipca_d = pd.DataFrame({'data': dr}).set_index('data')
        df_ipca_d = df_ipca_d.join(df_ipca_m).ffill()
        df_ipca_d['valor'] = ((1 + df_ipca_d['taxa']/100)**(1/30)).cumprod()
        df_ipca_d['codigo'] = 'IPCADIANI'
        df_ipca_final = df_ipca_d.reset_index()[['codigo', 'valor', 'data']]
    except Exception as e:
        print(f"Erro no IPCA: {e}")
        df_ipca_final = pd.DataFrame()

    # Unificar
    df_final = pd.concat([df_m, df_c, df_ipca_final], ignore_index=True)
    
    # [PERSONALIZAÇÃO] Garantia final contra __id
    if "__id" in df_final.columns:
        df_final = df_final.drop(columns=["__id"])
        
    df_final['data'] = pd.to_datetime(df_final['data']).dt.date
    df_final.columns = [c.lower() for c in df_final.columns]

    # Salvar no Banco
    connector = db()
    with connector.engine.begin() as conn:
        conn.execute(text("CREATE SCHEMA IF NOT EXISTS middle;"))
        df_final.to_sql('indices_cotas', conn, schema='middle', if_exists='replace', index=False)
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_indices_v6 ON middle.indices_cotas (data, codigo);"))
    
    print(f"Sucesso! Índices processados: {df_final['codigo'].unique()}")

if __name__ == "__main__":
    process_all_indices_v6()