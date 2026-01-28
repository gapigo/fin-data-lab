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
        """Retorna filtros disponíveis usando cvm.carteira."""
        sql = """
            SELECT DISTINCT cliente, cliente_segmentado 
            FROM cvm.carteira 
            WHERE cliente IS NOT NULL
            ORDER BY cliente, cliente_segmentado
        """
        df = self.db.read_sql(sql)
        
        clients = sorted(df['cliente'].dropna().unique().tolist())
        segments = sorted(df['cliente_segmentado'].dropna().unique().tolist())
        
        # Mapa Cliente -> Segmentos
        segments_by_client = {}
        for _, row in df.iterrows():
            c = row['cliente']
            s = row['cliente_segmentado']
            if c and s:
                if c not in segments_by_client:
                    segments_by_client[c] = []
                if s not in segments_by_client[c]:
                    segments_by_client[c].append(s)
        
        # Peers (Classes de ativos)
        sql_peers = "SELECT DISTINCT peer FROM cvm.carteira WHERE peer IS NOT NULL ORDER BY peer"
        df_peers = self.db.read_sql(sql_peers)
        peers = df_peers['peer'].tolist()
        
        return {
            "clients": clients,
            "segments": segments,
            "segments_by_client": segments_by_client,
            "peers": peers
        }

    def get_flow(self, client: str = None, segment: str = None, peer: str = None, window: int = 12) -> Dict[str, Any]:
        """Dados para a aba Fluxo e Posição."""
        
        # Filtros para carteira
        cart_filters = []
        if client:
            cart_filters.append(f"cliente = '{client}'")
        if segment and segment != 'all':
            cart_filters.append(f"cliente_segmentado = '{segment}'")
        if peer and peer != 'all':
            cart_filters.append(f"peer = '{peer}'")
        cart_where = " AND ".join(cart_filters) if cart_filters else "1=1"
        
        # 1. Evolução Patrimonial
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
                "value": float(x['total_pl']) if pd.notnull(x['total_pl']) else 0,
                "multimercado": float(x['total_pl']) if pd.notnull(x['total_pl']) else 0
            }, axis=1).tolist()

        # 2. Distribuição de Fluxo
        col_fluxo = f"fluxo_{window}m"
        sql_flow = f"""
            SELECT c.cliente_segmentado as client, SUM(f.{col_fluxo}) as flow
            FROM alocadores.fluxo_veiculos f
            JOIN cvm.carteira c ON c.cnpj_fundo = f.cnpj_fundo
            WHERE {cart_where}
            GROUP BY c.cliente_segmentado
            ORDER BY flow DESC
        """
        try:
            df_flow = self.db.read_sql(sql_flow)
            flow_data = df_flow.to_dict('records') if not df_flow.empty else []
        except:
            flow_data = []
        
        return {
            "evolution": evolution_data,
            "flow_distribution": flow_data
        }

    def get_performance(self, client: str = None, segment: str = None, window: int = 12) -> Dict[str, Any]:
        """Dados para a aba Performance."""
        
        cart_filters = []
        if client:
            cart_filters.append(f"cliente = '{client}'")
        if segment and segment != 'all':
            cart_filters.append(f"cliente_segmentado = '{segment}'")
        cart_where = " AND ".join(cart_filters) if cart_filters else "1=1"
        
        janela = f"{window}M"
        
        sql = f"""
            SELECT DISTINCT c.cnpj_fundo, c.cliente_segmentado as name,
                   m.ret, m.vol, m.sharpe
            FROM cvm.carteira c
            JOIN cvm.metrics m ON m.cnpj_fundo = c.cnpj_fundo
            WHERE {cart_where} 
              AND m.janela = '{janela}'
              AND m.dt_comptc = (SELECT MAX(dt_comptc) FROM cvm.metrics WHERE janela = '{janela}')
        """
        try:
            df = self.db.read_sql(sql)
        except Exception as e:
            print(f"[Performance] Error: {e}")
            df = pd.DataFrame()
            
        scatter_data = []
        if not df.empty:
            df = df.dropna(subset=['vol', 'ret'])
            scatter_data = df.apply(lambda x: {
                "x": float(x['vol']) if pd.notnull(x['vol']) else 0,
                "y": float(x['ret']) if pd.notnull(x['ret']) else 0,
                "z": 10,
                "name": x['name']
            }, axis=1).tolist()
            
        return {
            "scatter": scatter_data,
            "boxplots": []
        }

    def get_allocation(self, client: str = None, segment: str = None, peer: str = None) -> Dict[str, Any]:
        """Dados para a aba Alocação (cache-first via cvm.carteira)."""
        
        filter_clauses = []
        if client:
            filter_clauses.append(f"cliente = '{client}'")
        if segment and segment != 'all':
            filter_clauses.append(f"cliente_segmentado = '{segment}'")
        if peer and peer != 'all':
            filter_clauses.append(f"peer = '{peer}'")
        where_sql = " AND ".join(filter_clauses) if filter_clauses else "1=1"
        
        # Data mais recente para os filtros
        sql_max_date = f"SELECT MAX(dt_comptc) FROM cvm.carteira WHERE {where_sql}"
        max_dt = self.db.read_sql(sql_max_date).iloc[0,0]
        
        if not max_dt:
            return {"snapshot": [], "evolution_manager": []}
        
        # Snapshot
        sql_snapshot = f"""
            SELECT cnpj_fundo_cota, 
                   MAX(nm_fundo_cota) as name, 
                   MAX(peer) as desc,
                   SUM(vl_merc_pos_final) as value_raw
            FROM cvm.carteira
            WHERE {where_sql} AND dt_comptc = '{max_dt}'
            GROUP BY cnpj_fundo_cota
            ORDER BY value_raw DESC
            LIMIT 20
        """
        df_snap = self.db.read_sql(sql_snapshot)
        
        total_pl = df_snap['value_raw'].sum() if not df_snap.empty else 0
        snapshot_data = []
        if not df_snap.empty and total_pl > 0:
            snapshot_data = df_snap.apply(lambda x: {
                "symbol": (str(x['desc'] or 'N/A')[:3]).upper(),
                "name": str(x['name'] or x['cnpj_fundo_cota'])[:40],
                "desc": x['desc'] or 'Fundo',
                "pl": float(x['value_raw']),
                "value": round((float(x['value_raw']) / total_pl) * 100, 2)
            }, axis=1).tolist()

        return {
            "snapshot": snapshot_data,
            "evolution_manager": []
        }


# Singleton para uso global
_allocator_service = None

def get_allocator_service() -> AllocatorService:
    global _allocator_service
    if _allocator_service is None:
        _allocator_service = AllocatorService()
    return _allocator_service
