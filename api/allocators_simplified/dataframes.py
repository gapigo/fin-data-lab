"""
Dataframes - Funções que retornam DataFrames estruturados.

Cada função aqui:
1. Recebe parâmetros de filtro (client, segment, etc)
2. Retorna um pd.DataFrame limpo e pronto para uso
3. É registrada no register.py

REGRA: Cada função deve ser independente e retornar um DataFrame.
       O cache (@temp) fica nas queries de banco, não aqui.
"""

import pandas as pd
import numpy as np
from typing import Optional, List
from datetime import datetime, timedelta
from common.cache import temp
from common.postgresql import PostgresConnector


# ============================================================================
# CONFIGURAÇÃO
# ============================================================================

ALLOWED_CLIENTS = ('BTG', 'XP', 'Bradesco', 'BB', 'Empiricus', 'Itaú', 'Santander')
HIGHLIGHT_GESTORA = 'Kinea'


# ============================================================================
# QUERIES BASE (com cache)
# ============================================================================

@temp(ttl=86400)
def _load_carteira_raw() -> pd.DataFrame:
    """Carrega carteira base do banco."""
    db = PostgresConnector()
    query = """
        SELECT 
            dt_comptc, cnpj_fundo, denom_social, cliente, cliente_segmentado,
            cnpj_fundo_cota, nm_fundo_cota, gestor_cota, vl_merc_pos_final, peer
        FROM cvm.carteira
        WHERE dt_comptc > CURRENT_DATE - INTERVAL '5 years'
          AND peer IN ('Ações', 'Multimercado', 'Renda Fixa')
          AND cliente <> gestor_cota
          AND cliente IN ('BTG', 'XP', 'Bradesco', 'BB', 'Empiricus', 'Itaú', 'Santander')
    """
    df = db.read_sql(query)
    if not df.empty:
        df['dt_comptc'] = pd.to_datetime(df['dt_comptc'])
    return df


@temp(ttl=86400)
def _load_fluxo_raw() -> pd.DataFrame:
    """Carrega fluxo base do banco."""
    db = PostgresConnector()
    query = """
        SELECT cnpj_fundo, peer_ativo, dt_comptc,
               total_pos, fluxo_6m, fluxo_12m, fluxo_24m, fluxo_36m, fluxo_48m, fluxo_60m
        FROM alocadores.fluxo_veiculos
    """
    df = db.read_sql(query)
    if not df.empty:
        df['dt_comptc'] = pd.to_datetime(df['dt_comptc'])
    return df


@temp(ttl=86400)
def _load_metrics_raw() -> pd.DataFrame:
    """Carrega métricas do banco."""
    db = PostgresConnector()
    try:
        query = """
            SELECT cnpj_fundo, dt_comptc, janela, ret, vol, sharpe,
                   mdd as max_dd, recovery_time, calmar, hit_ratio, info_ratio, meta, bench
            FROM cvm.metrics
        """
        df = db.read_sql(query)
        if not df.empty:
            df['dt_comptc'] = pd.to_datetime(df['dt_comptc'])
        return df
    except Exception as e:
        print(f"[dataframes] Aviso: metrics não disponível - {e}")
        return pd.DataFrame()


@temp(ttl=86400)
def _load_ativos_carteira_raw() -> pd.DataFrame:
    """Carrega ativos da carteira do banco."""
    db = PostgresConnector()
    query = """
        WITH depara AS (
            SELECT DISTINCT cliente, cliente_segmentado, cnpj_fundo FROM cvm.carteira
        )
        SELECT d.cliente, d.cliente_segmentado,
               a.cnpj_fundo, a.tp_aplic, a.tp_ativo,
               a.vl_merc_pos_final, a.nm_ativo, a.cd_ativo, a.tp_cd_ativo
        FROM cvm.ativos_carteira a
        LEFT JOIN depara d ON d.cnpj_fundo = a.cnpj_fundo
        WHERE a.dt_comptc = (SELECT MAX(dt_comptc) FROM cvm.ativos_carteira)
    """
    df = db.read_sql(query)
    return df


def _filter_carteira(df: pd.DataFrame, client: Optional[str] = None, 
                     segment: Optional[str] = None) -> pd.DataFrame:
    """Aplica filtros de cliente e segmento."""
    if df.empty:
        return df
    mask = pd.Series(True, index=df.index)
    if client:
        mask &= df['cliente'] == client
    if segment and segment != 'all':
        mask &= df['cliente_segmentado'] == segment
    return df[mask].copy()


def _get_ultima_aberta(df: pd.DataFrame) -> pd.DataFrame:
    """Calcula última carteira aberta (último dt_comptc por cnpj_fundo nos últimos 7 meses)."""
    if df.empty:
        return df
    recent = df[df['dt_comptc'] > pd.Timestamp.now() - pd.DateOffset(months=7)]
    if recent.empty:
        return df.head(0)
    max_dates = recent.groupby('cnpj_fundo')['dt_comptc'].max().reset_index()
    result = df.merge(max_dates, on=['cnpj_fundo', 'dt_comptc'])
    return result


# ============================================================================
# FUNÇÕES REGISTRADAS - MENU / FILTROS
# ============================================================================

def get_filtros_disponiveis(**kwargs) -> pd.DataFrame:
    """Retorna clientes, segmentos e peers disponíveis."""
    df = _load_carteira_raw()
    if df.empty:
        return pd.DataFrame({
            'cliente': list(ALLOWED_CLIENTS),
            'cliente_segmentado': [''] * len(ALLOWED_CLIENTS),
            'peer': [''] * len(ALLOWED_CLIENTS)
        })
    
    pairs = df[['cliente', 'cliente_segmentado', 'peer']].drop_duplicates()
    return pairs.sort_values(['cliente', 'cliente_segmentado']).reset_index(drop=True)


# ============================================================================
# FUNÇÕES REGISTRADAS - FLUXO DO CLIENTE
# ============================================================================

def get_fluxo_por_segmento(client: Optional[str] = None, **kwargs) -> pd.DataFrame:
    """Fluxo agregado por cliente_segmentado."""
    df_cart = _load_carteira_raw()
    df_fluxo = _load_fluxo_raw()
    
    if df_cart.empty or df_fluxo.empty:
        return pd.DataFrame()
    
    if client:
        df_cart = df_cart[df_cart['cliente'] == client]
    
    # Depara cnpj_fundo -> cliente, cliente_segmentado
    depara = df_cart[['cnpj_fundo', 'cliente', 'cliente_segmentado']].drop_duplicates()
    
    # Join
    df = df_fluxo.merge(depara, on='cnpj_fundo', how='inner')
    
    # Aggregate per segment
    agg = df.groupby(['cliente', 'cliente_segmentado', 'peer_ativo']).agg({
        'fluxo_6m': 'sum', 'fluxo_12m': 'sum', 'fluxo_24m': 'sum',
        'fluxo_36m': 'sum', 'fluxo_48m': 'sum', 'fluxo_60m': 'sum',
    }).reset_index()
    
    return agg


def get_posicao_historica(client: Optional[str] = None, **kwargs) -> pd.DataFrame:
    """Posição mensal agregada."""
    df = _load_carteira_raw()
    if client:
        df = df[df['cliente'] == client]
    
    if df.empty:
        return pd.DataFrame()
    
    agg = df.groupby(['cliente', 'cliente_segmentado', 'peer', 'dt_comptc']).agg({
        'vl_merc_pos_final': 'sum'
    }).reset_index()
    
    return agg.sort_values('dt_comptc')


# ============================================================================
# FUNÇÕES REGISTRADAS - CARTEIRA > PERFORMANCE
# ============================================================================

def get_posicao_atual(client: Optional[str] = None, segment: Optional[str] = None, **kwargs) -> pd.DataFrame:
    """Posição atual por fundo - última data disponível."""
    df = _load_carteira_raw()
    df = _filter_carteira(df, client, segment)
    df = _get_ultima_aberta(df)
    
    if df.empty:
        return pd.DataFrame()
    
    agg = df.groupby(['cnpj_fundo_cota', 'nm_fundo_cota', 'gestor_cota', 'peer']).agg({
        'vl_merc_pos_final': 'sum'
    }).reset_index()
    
    return agg.sort_values('vl_merc_pos_final', ascending=False)


def get_metricas_fundos(client: Optional[str] = None, segment: Optional[str] = None, **kwargs) -> pd.DataFrame:
    """Métricas dos fundos investidos."""
    df_cart = _load_carteira_raw()
    df_cart = _filter_carteira(df_cart, client, segment)
    df_cart = _get_ultima_aberta(df_cart)
    df_metrics = _load_metrics_raw()
    
    if df_cart.empty or df_metrics.empty:
        return pd.DataFrame()
    
    # Get cnpj_fundo_cota list  
    cnpjs = df_cart['cnpj_fundo_cota'].unique()
    
    # Latest metrics per (cnpj_fundo, janela)
    df_m = df_metrics[df_metrics['cnpj_fundo'].isin(cnpjs)]
    if df_m.empty:
        return pd.DataFrame()
    
    df_m = df_m.sort_values('dt_comptc').groupby(['cnpj_fundo', 'janela']).tail(1)
    
    # Join with carteira for names and position
    pos_info = df_cart.groupby(['cnpj_fundo_cota', 'nm_fundo_cota']).agg({
        'vl_merc_pos_final': 'sum'
    }).reset_index()
    
    result = df_m.merge(
        pos_info,
        left_on='cnpj_fundo',
        right_on='cnpj_fundo_cota',
        how='left'
    )
    
    return result


# ============================================================================
# FUNÇÕES REGISTRADAS - CARTEIRA > COMPLETA
# ============================================================================

def get_carteira_ultima_aberta(client: Optional[str] = None, segment: Optional[str] = None, **kwargs) -> pd.DataFrame:
    """Última carteira aberta - dados completos do cvm.carteira."""
    df = _load_carteira_raw()
    df = _filter_carteira(df, client, segment)
    df = _get_ultima_aberta(df)
    return df


def get_ativos_carteira(client: Optional[str] = None, segment: Optional[str] = None, 
                        cnpj_fundo: Optional[str] = None, **kwargs) -> pd.DataFrame:
    """Ativos detalhados da carteira."""
    df = _load_ativos_carteira_raw()
    
    if df.empty:
        return df
    
    if cnpj_fundo:
        return df[df['cnpj_fundo'] == cnpj_fundo]
    
    if client:
        df = df[df['cliente'] == client]
    if segment and segment != 'all':
        df = df[df['cliente_segmentado'] == segment]
    
    return df


def get_cotas_fundos_posicao(client: Optional[str] = None, segment: Optional[str] = None, **kwargs) -> pd.DataFrame:
    """
    Posição em cotas de fundos para gráfico de colunas azul decrescente.
    Filtra apenas seção de cotas de fundos da última carteira aberta.
    """
    df = _load_carteira_raw()
    df = _filter_carteira(df, client, segment)
    df = _get_ultima_aberta(df)
    
    if df.empty:
        return pd.DataFrame()
    
    # Agregar por fundo investido (cnpj_fundo_cota)
    agg = df.groupby(['cnpj_fundo_cota', 'nm_fundo_cota', 'gestor_cota']).agg({
        'vl_merc_pos_final': 'sum'
    }).reset_index()
    
    agg = agg.sort_values('vl_merc_pos_final', ascending=False)
    return agg


# ============================================================================
# FUNÇÕES REGISTRADAS - CARTEIRA > MOVIMENTAÇÃO (MOCK)
# ============================================================================

def _get_gestores_reais(client: Optional[str] = None, segment: Optional[str] = None) -> list:
    """Retorna a lista de gestores reais do cliente/segmento."""
    df = _load_carteira_raw()
    df = _filter_carteira(df, client, segment)
    df = _get_ultima_aberta(df)
    
    if df.empty:
        return ['Kinea', 'Itaú', 'SPX', 'Verde', 'Ibiuna', 'JGP', 'Legacy', 'Kapitalo', 'Adam', 'Absolute']
    
    # Top gestores by position
    top = df.groupby('gestor_cota')['vl_merc_pos_final'].sum().nlargest(15).reset_index()
    return top['gestor_cota'].tolist()


def _generate_mock_movimentacao(client: Optional[str] = None, segment: Optional[str] = None) -> dict:
    """
    Gera dados mockados de movimentação.
    O servidor gera esses dados - o cliente não sabe que são mock.
    
    Retorna dict com:
        - barras: dados para gráfico de barras empilhadas (12 meses x gestores)
        - scatter: dados para scatter plot (x=crescimento, y=alocacao, por gestor)
        - gestores: lista de gestores
    Para TODOS os períodos (1M a 60M) de uma vez.
    """
    gestores = _get_gestores_reais(client, segment)
    
    np.random.seed(hash(f"{client}_{segment}") % (2**31))
    
    periodos = ['1M', '3M', '6M', '12M', '24M', '36M', '48M', '60M']
    
    # ========================================================================
    # GRÁFICO DE BARRAS: Movimentação mês a mês por gestor
    # ========================================================================
    barras_por_periodo = {}
    
    for periodo in periodos:
        n_meses = int(periodo.replace('M', ''))
        meses_data = []
        
        for i in range(min(n_meses, 12)):  # max 12 barras visíveis
            dt = datetime.now() - timedelta(days=30 * (min(n_meses, 12) - i))
            mes_label = dt.strftime('%b/%y')
            
            mes_row = {'month': mes_label}
            for gestor in gestores:
                # Simular movimentação do gestor nesse mês
                base = np.random.normal(0, 50_000_000)  # 50M std
                # Kinea: tendência positiva
                if 'kinea' in gestor.lower():
                    base += np.random.uniform(10_000_000, 80_000_000)
                # Itaú: pequena tendência positiva
                elif 'itaú' in gestor.lower() or 'itau' in gestor.lower():
                    base += np.random.uniform(-20_000_000, 40_000_000)
                    
                mes_row[gestor] = round(base, 2)
            
            meses_data.append(mes_row)
        
        barras_por_periodo[periodo] = meses_data
    
    # ========================================================================
    # SCATTER PLOT: CL vs crescimento por gestor  
    # X = crescimento % vs posição inicial (CL/posição_inicial)
    # Y = movimentação % no gestor (alocação no período)
    # ========================================================================
    scatter_por_periodo = {}
    
    for periodo in periodos:
        n_meses = int(periodo.replace('M', ''))
        scatter_points = []
        
        for gestor in gestores:
            # Posição inicial simulada
            pos_inicial = np.random.uniform(50_000_000, 500_000_000)
            
            # CL (captação líquida) do período
            cl_abs = np.random.normal(0, pos_inicial * 0.3)
            
            # Crescimento % = CL / posição_inicial
            crescimento_pct = cl_abs / pos_inicial  # pode ser > 1 (mais de 100%)
            
            # Movimentação % no gestor (Y) - vai de -1 a infinito
            # mas travamos visualização de -100% a 100%
            mov_pct = np.random.uniform(-0.8, 1.5)
            if 'kinea' in gestor.lower():
                mov_pct = np.random.uniform(0.1, 0.8)  # Kinea tende positivo
            
            # Valores absolutos para tooltip
            valor_cliente = float(cl_abs)
            valor_gestor_comparado = float(pos_inicial * mov_pct)
            cl_pct_cliente = float(crescimento_pct)
            mov_pct_gestor = float(mov_pct)
            
            scatter_points.append({
                'gestor': gestor,
                'x': round(crescimento_pct, 4),  # float, pode ser > 1
                'y': round(mov_pct, 4),           # float, mín -1, sem máx
                'valor_cliente': round(valor_cliente, 2),
                'valor_gestor_comparado': round(valor_gestor_comparado, 2),
                'cl_pct_cliente': round(cl_pct_cliente, 4),
                'mov_pct_gestor': round(mov_pct_gestor, 4),
                'pos_inicial': round(pos_inicial, 2),
            })
        
        scatter_por_periodo[periodo] = scatter_points
    
    return {
        'barras': barras_por_periodo,
        'scatter': scatter_por_periodo,
        'gestores': gestores,
        'periodos': periodos,
        'gestor_comparado_default': 'Kinea' if 'Kinea' in gestores else (gestores[0] if gestores else ''),
    }


def get_movimentacao_barras(client: Optional[str] = None, segment: Optional[str] = None, **kwargs) -> pd.DataFrame:
    """
    Gráfico de barras empilhadas - movimentação mês a mês por gestor.
    DADOS MOCK - o servidor gera, cliente não sabe.
    
    Retorna DataFrame com colunas: month, gestor1, gestor2, ...
    """
    mock = _generate_mock_movimentacao(client, segment)
    # Para o register, retornamos o df do período 12M como default
    data = mock['barras'].get('12M', [])
    if not data:
        return pd.DataFrame()
    return pd.DataFrame(data)


def get_movimentacao_scatter(client: Optional[str] = None, segment: Optional[str] = None, **kwargs) -> pd.DataFrame:
    """
    Scatter plot - CL vs crescimento por gestor.
    DADOS MOCK - o servidor gera, cliente não sabe.
    
    Retorna DataFrame com colunas: gestor, x, y, valor_cliente, etc.
    """
    mock = _generate_mock_movimentacao(client, segment)
    data = mock['scatter'].get('12M', [])
    if not data:
        return pd.DataFrame()
    return pd.DataFrame(data)
