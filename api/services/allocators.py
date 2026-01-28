"""
Allocators Service Module
Padrão: Cache-first usando cvm.carteira como fonte principal
"""
import pandas as pd
from typing import Dict, Any
import sys
import os

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))
from common.postgresql import PostgresConnector


class AllocatorService:
    """Serviço para dashboard de Alocadores.
    
    Fontes de dados:
    - cvm.carteira: View pré-processada com cliente, cliente_segmentado, peer
    - alocadores.fluxo_veiculos: Fluxo calculado
    - cvm.metrics: Métricas de performance (ret, vol, sharpe)
    """
    
    def __init__(self, db: PostgresConnector = None):
        self.db = db or PostgresConnector()
    
    def get_filters(self) -> Dict[str, Any]:
        """Retorna filtros disponíveis restringindo aos Big Players."""
        
        # Whitelist de clientes solicitada
        # HARDCODED para performance imediata e respeito à whitelist estrita
        # A query anterior estava fazendo full scan na view cvm.carteira com regex, o que é inviável em tempo real.
        # Whitelist exata conforme os valores na base
        clients = sorted([
            'BTG', 'XP', 'Bradesco', 'BB', 'Empiricus', 'Itaú', 'Santander'
        ])
        
        # Segmentos comuns (pode ser refinado depois ou carregado async)
        segments = ['Varejo', 'Private', 'Alta Renda', 'Digital', 'Exclusive', 'Personalité']
        
        # Map simples para UX
        segments_by_client = {c: segments for c in clients}
        
        # Peers 
        # Tentar pegar peers rapido ou estatico
        peers = ['Multimercado', 'Ações', 'Renda Fixa', 'Cambial'] # Placeholder seguro
        try:
             # Tentar query rapida com limit
             sql_peers = "SELECT DISTINCT peer FROM cvm.carteira WHERE peer IS NOT NULL LIMIT 50"
             df_peers = self.db.read_sql(sql_peers)
             if not df_peers.empty:
                 peers = sorted(df_peers['peer'].tolist())
        except:
             pass
        
        return {
            "clients": clients,
            "segments": segments,
            "segments_by_client": segments_by_client,
            "peers": peers
        }

    def _get_base_filters(self, client, segment, peer):
        """Helper para construir filtros SQL.
        
        Os valores de cliente na base já estão normalizados para:
        BTG, XP, Bradesco, BB, Empiricus, Itaú, Santander
        """
        filters = []
        
        # Filtros base que sempre aplicamos (performance)
        filters.append("dt_comptc > CURRENT_DATE - INTERVAL '5 years'")
        filters.append("peer IN ('Ações', 'Multimercado', 'Renda Fixa')")
        filters.append("cnpj_fundo NOT IN (SELECT DISTINCT cnpj_fundo FROM cvm.espelhos)")
        filters.append("cliente <> gestor_cota")
        filters.append("cliente IN ('BTG', 'XP', 'Bradesco', 'BB', 'Empiricus', 'Itaú', 'Santander')")
        
        if client:
            # Match exato - os valores já estão normalizados na base
            filters.append(f"cliente = '{client}'")
                
        if segment and segment != 'all':
            filters.append(f"cliente_segmentado = '{segment}'")
            
        if peer and peer != 'all':
            filters.append(f"peer = '{peer}'")
            
        return " AND ".join(filters)

    def get_flow(self, client: str = None, segment: str = None, peer: str = None, window: int = 12) -> Dict[str, Any]:
        """Dados para a aba Fluxo e Posição."""
        cart_where = self._get_base_filters(client, segment, peer)
        
        # 1. Evolução Patrimonial (Agregado)
        sql_evolution = f"""
            SELECT dt_comptc, SUM(vl_merc_pos_final) as total_pl
            FROM cvm.carteira
            WHERE {cart_where}
            GROUP BY dt_comptc
            ORDER BY dt_comptc
        """
        df_ev = self.db.read_sql(sql_evolution)
        evolution_data = []
        if not df_ev.empty:
            df_ev['dt_comptc'] = pd.to_datetime(df_ev['dt_comptc'])
            evolution_data = df_ev.apply(lambda x: {
                "month": x['dt_comptc'].strftime('%b/%y'),
                "date": x['dt_comptc'].isoformat(),
                "value": float(x['total_pl']) if pd.notnull(x['total_pl']) else 0
            }, axis=1).tolist()

        # 2. Distribuição de Fluxo (Todas as janelas para switch rápido no front)
        flow_data = {}
        for w in [6, 12, 24, 36]:
            col = f"fluxo_{w}m"
            group_by = "cliente_segmentado" if not segment or segment == 'all' else "peer"
            
            sql_flow = f"""
                SELECT c.{group_by} as label, SUM(f.{col}) as flow
                FROM alocadores.fluxo_veiculos f
                JOIN cvm.carteira c ON c.cnpj_fundo = f.cnpj_fundo
                WHERE {cart_where}
                GROUP BY c.{group_by}
                ORDER BY flow DESC
            """
            try:
                df_f = self.db.read_sql(sql_flow)
                if not df_f.empty:
                    flow_data[w] = df_f.apply(lambda x: {
                        "client": str(x['label'])[:20],
                        "flow": float(x['flow'])
                    }, axis=1).tolist()
                else:
                    flow_data[w] = []
            except:
                flow_data[w] = []
        
        return {
            "evolution": evolution_data,
            "flow_distribution": flow_data
        }

    def get_performance(self, client: str = None, segment: str = None, peer: str = None, window: int = 12) -> Dict[str, Any]:
        """Dados para a aba Performance Carteira (Otimizado)."""
        import numpy as np
        
        cart_where = self._get_base_filters(client, segment, peer)
        
        # 1. Determinar última data da carteira para saber quais fundos ativos
        sql_max_date = f"SELECT MAX(dt_comptc) FROM cvm.carteira WHERE {cart_where}"
        try:
            max_dt = self.db.read_sql(sql_max_date).iloc[0,0]
        except:
            max_dt = None
            
        if not max_dt:
            return {}

        # 2. Query Única: Pegar métricas de TODOS os fundos da carteira para TODAS as janelas de interesse
        # Evita loops e múltiplas conexões.
        # Primeiro pegamos os CNPJs Relevantes e Nomes
        sql_funds = f"""
            SELECT DISTINCT cnpj_fundo_cota, nm_fundo_cota
            FROM cvm.carteira
            WHERE {cart_where} AND dt_comptc = '{max_dt}'
        """
        df_funds = self.db.read_sql(sql_funds)
        if df_funds.empty:
             return {"boxplots_ret": [], "boxplots_vol": [], "boxplots_mdd": [], "return_by_window": [], "scatter_12m": [], "performance_table": []}

        cnpjs = df_funds['cnpj_fundo_cota'].tolist()
        cnpj_tuple = tuple(cnpjs) if len(cnpjs) > 1 else f"('{cnpjs[0]}')" if cnpjs else "('')"
        
        # Agora query em cvm.metrics filtrando por esses CNPJs
        # Assumindo que metrics tem dados recentes. Pegamos data máxima de metrics.
        sql_metrics = f"""
            SELECT m.cnpj_fundo, m.janela, m.ret, m.vol, m.max_dd, m.bench, m.meta
            FROM cvm.metrics m
            WHERE m.cnpj_fundo IN {cnpj_tuple}
              AND m.janela IN ('6M', '12M', '24M', '36M')
              AND m.dt_comptc = (SELECT MAX(dt_comptc) FROM cvm.metrics)
        """
        
        try:
            df_m = self.db.read_sql(sql_metrics)
        except Exception as e:
            print(f"Error metrics query: {e}")
            df_m = pd.DataFrame()

        # Processar dados em memória (Pandas é rápido)
        boxplots_data = {'ret': [], 'vol': [], 'mdd': []}
        return_by_window = [] # Placeholder se precisar calcular media ponderada, mas o user pediu boxplot
        
        if not df_m.empty:
            # Merge com nomes para identificar Kinea
            df_full = df_m.merge(df_funds, left_on='cnpj_fundo', right_on='cnpj_fundo_cota', how='left')
            
            for janela in ['6M', '12M', '24M', '36M']:
                df_j = df_full[df_full['janela'] == janela]
                if df_j.empty: continue
                
                # Identificar destaque Kinea (mediana dos Kinea na carteira)
                kinea_mask = df_j['nm_fundo_cota'].str.contains('KINEA', case=False, na=False)
                df_kinea = df_j[kinea_mask]
                
                highlight_vals = {}
                if not df_kinea.empty:
                    highlight_vals = {
                        'ret': df_kinea['ret'].median(),
                        'vol': df_kinea['vol'].median(),
                        'mdd': df_kinea['max_dd'].median()
                    }
                
                # Boxplots
                for metric, key in [('ret', 'ret'), ('vol', 'vol'), ('max_dd', 'mdd')]:
                    vals = df_j[metric].dropna()
                    if not vals.empty:
                        boxplots_data[key].append({
                            'window': janela,
                            'min': float(np.percentile(vals, 0)),
                            'q1': float(np.percentile(vals, 25)),
                            'median': float(np.percentile(vals, 50)),
                            'q3': float(np.percentile(vals, 75)),
                            'max': float(np.percentile(vals, 100)),
                            'highlight': float(highlight_vals.get(key)) if key in highlight_vals else None
                        })

                # Retorno Médio vs CDI (Return Bars)
                # Média aritmética simples dos fundos da carteira (como pedido 'avg(ret)')
                avg_ret = df_j['ret'].mean()
                avg_cdi = df_j['bench'].mean() # CDI geralmente igual pra todos, mas ok
                if pd.notnull(avg_ret):
                    return_by_window.append({
                        'window': janela,
                        'retorno': round(float(avg_ret), 2),
                        'cdi': round(float(avg_cdi), 2)
                    })

        # Scatter 12M
        scatter_data = []
        if not df_m.empty:
            df_12m = df_m[df_m['janela'] == '12M'].merge(df_funds, left_on='cnpj_fundo', right_on='cnpj_fundo_cota', how='left')
            if not df_12m.empty:
                df_12m = df_12m.dropna(subset=['vol', 'ret'])
                scatter_data = df_12m.apply(lambda x: {
                    "x": round(float(x['vol']), 2),
                    "y": round(float(x['ret']), 2),
                    "name": str(x['nm_fundo_cota'])[:30]
                }, axis=1).tolist()[:100] # Limit points

        # Flow Summary (Topo da página)
        flow_by_window = []
        # Query separada mas rápida
        for w in [6, 12, 24, 36]:
            col = f"fluxo_{w}m"
            # Otimização: Filtrar fluxo_veiculos onde cnpj_fundo IN (nossos CNPJs)
            # Como já temos cnpjs (lista), usamos isso.
            # Atenção: 'alocadores.fluxo_veiculos' tem cnpj_fundo.
            
            if cnpjs:
                 sql_flow_w = f"""
                    SELECT SUM({col}) 
                    FROM alocadores.fluxo_veiculos 
                    WHERE cnpj_fundo IN {cnpj_tuple}
                 """
                 try:
                    val = self.db.read_sql(sql_flow_w).iloc[0,0]
                    flow_by_window.append({'window': f"{w}M",'value': float(val) if val else 0})
                 except: pass

        return {
            "flow_by_window": flow_by_window,
            "return_by_window": return_by_window,
            "boxplots_ret": boxplots_data['ret'],
            "boxplots_vol": boxplots_data['vol'],
            "boxplots_mdd": boxplots_data['mdd'],
            "scatter_12m": scatter_data
        }

    def get_allocation(self, client: str = None, segment: str = None, peer: str = None) -> Dict[str, Any]:
        """Dados para a aba Alocação."""
        
        cart_where = self._get_base_filters(client, segment, peer)
        
        # 1. Flow by Window (igual ao da Performance)
        flow_by_window = []
        for w in [6, 12, 24, 36]:
            col = f"fluxo_{w}m"
            sql_flow_w = f"""
                SELECT SUM(f.{col})
                FROM alocadores.fluxo_veiculos f
                WHERE f.cnpj_fundo IN (
                    SELECT DISTINCT cnpj_fundo 
                    FROM cvm.carteira 
                    WHERE {cart_where}
                )
            """
            try:
                val = self.db.read_sql(sql_flow_w).iloc[0,0]
                flow_by_window.append({
                    'window': f"{w}M",
                    'value': float(val) if val else 0
                })
            except:
                pass

        # 2. Evolução Mensal por GESTOR (gestor_cota) - Últimos 5 anos
        # Precisamos limitar a data. 5 anos = 60 meses
        sql_evol_gestor = f"""
            SELECT dt_comptc, gestor_cota, SUM(vl_merc_pos_final) as total
            FROM cvm.carteira
            WHERE {cart_where}
              AND dt_comptc >= (CURRENT_DATE - INTERVAL '5 years')
            GROUP BY dt_comptc, gestor_cota
            ORDER BY dt_comptc
        """
        df_eg = self.db.read_sql(sql_evol_gestor)
        evolution_manager = []
        top_managers = []
        
        if not df_eg.empty:
            df_eg['dt_comptc'] = pd.to_datetime(df_eg['dt_comptc'])
            # Pivotar para ter colunas por gestor
            pivot_df = df_eg.pivot_table(index='dt_comptc', columns='gestor_cota', values='total', aggfunc='sum').fillna(0)
            
            # Identificar Top 8 gestores para exibir explicitamente, o resto agrupar em 'Outros'?
            # O user disse "evolução mensal por gestor... por gestor_cota da carteira do cliente". 
            # Não pediu 'Outros', mas se tiver muitos, o gráfico quebra. Vou pegar top 10.
            totals = pivot_df.sum().sort_values(ascending=False)
            top_10 = totals.head(10).index.tolist()
            
            pivot_df['Outros'] = pivot_df.loc[:, ~pivot_df.columns.isin(top_10)].sum(axis=1)
            pivot_df = pivot_df[top_10 + ['Outros']]
            top_managers = top_10 # + ['Outros'] se quiser na legenda
            
            # Formatar para Recharts
            pivot_df = pivot_df.reset_index()
            # Ordenar por data
            pivot_df = pivot_df.sort_values('dt_comptc')
            
            evolution_manager = pivot_df.apply(lambda x: {
                **{k: float(v) for k, v in x.items() if k != 'dt_comptc'},
                "month": x['dt_comptc'].strftime('%b/%y'),
                "date": x['dt_comptc'].isoformat()
            }, axis=1).tolist()

        return {
            "flow_by_window": flow_by_window,
            "evolution_manager": evolution_manager,
            "gestores": top_managers
        }


# Singleton para uso global
_allocator_service = None

def get_allocator_service() -> AllocatorService:
    global _allocator_service
    if _allocator_service is None:
        _allocator_service = AllocatorService()
    return _allocator_service
