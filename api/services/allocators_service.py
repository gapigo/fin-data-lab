"""
Allocators Service - Business logic for allocators dashboard.

Uses cached models from the data_models/ package to avoid direct database queries.
All data comes from:
- cvm.carteira (via data_models.carteira)
- alocadores.fluxo_veiculos (via data_models.fluxo_veiculos)
- cvm.metrics (via data_models.metrics)
"""

import pandas as pd
import numpy as np
from typing import Optional, Dict, Any, List


try:
    from ..data_models.carteira import get_carteira_df, get_carteira_filters
    from ..data_models.fluxo_veiculos import get_fluxo_veiculos_df, get_fluxo_latest
    from ..data_models.metrics import get_metrics_df, get_metrics_latest, get_performance_status
except ImportError:
    from data_models.carteira import get_carteira_df, get_carteira_filters
    from data_models.fluxo_veiculos import get_fluxo_veiculos_df, get_fluxo_latest
    from data_models.metrics import get_metrics_df, get_metrics_latest, get_performance_status


class AllocatorsService:
    """Service for allocators dashboard data."""
    
    def get_filters(self) -> Dict[str, Any]:
        """
        Get available filter options for the dashboard.
        
        Returns dict with:
        - clients: list of client names
        - segments: list of all segments
        - segments_by_client: dict mapping client -> [segments]
        - peers: list of peer/class names
        """
        return get_carteira_filters()
    
    def get_performance_data(
        self, 
        client: Optional[str] = None, 
        segment: Optional[str] = None, 
        peer: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Get performance data for the Performance Carteira tab.
        
        Args:
            client: Filter by client (gestor)
            segment: Filter by cliente_segmentado
            peer: Filter by peer class
            
        Returns dict with:
        - flow_by_window: bar chart data with flow per window
        - metrics_by_window: bar charts for ret, vol, max_dd per window
        - scatter_12m: scatter plot data (vol x ret)
        - performance_table: table with absolute performance status
        """
        # Load data from cached models
        df_fluxo = get_fluxo_latest()
        df_metrics = get_metrics_latest()
        df_carteira = get_carteira_df()
        
        # Get list of CNPJs matching filters
        cnpjs_filter = self._get_filtered_cnpjs(df_carteira, client, segment, peer)
        
        # -----------------------------------------------------
        # 1. Flow by Window (bar chart)
        # -----------------------------------------------------
        flow_by_window = []
        if not df_fluxo.empty:
            df_flow_filtered = df_fluxo[df_fluxo['cnpj_fundo'].isin(cnpjs_filter)]
            
            windows = [6, 12, 24, 36, 48, 60]
            for w in windows:
                col = f'fluxo_{w}m'
                if col in df_flow_filtered.columns:
                    total = df_flow_filtered[col].sum()
                    flow_by_window.append({
                        'window': f'{w}M',
                        'value': float(total) if pd.notnull(total) else 0
                    })
        
        # -----------------------------------------------------
        # 2. Metrics by Window (ret, vol, max_dd bar charts)
        # -----------------------------------------------------
        metrics_ret = []
        metrics_vol = []
        metrics_dd = []
        
        if not df_metrics.empty:
            df_m_filtered = df_metrics[df_metrics['cnpj_fundo'].isin(cnpjs_filter)]
            
            for janela in ['6M', '12M', '24M', '36M', '48M', '60M']:
                df_w = df_m_filtered[df_m_filtered['janela'] == janela]
                
                if not df_w.empty:
                    # Calculate quartiles for box plot data
                    ret_q = df_w['ret'].dropna().quantile([0.25, 0.5, 0.75]).tolist() if 'ret' in df_w.columns else [0,0,0]
                    vol_q = df_w['vol'].dropna().quantile([0.25, 0.5, 0.75]).tolist() if 'vol' in df_w.columns else [0,0,0]
                    dd_q = df_w['max_dd'].dropna().quantile([0.25, 0.5, 0.75]).tolist() if 'max_dd' in df_w.columns else [0,0,0]
                    
                    metrics_ret.append({'window': janela, 'q1': ret_q[0], 'median': ret_q[1], 'q3': ret_q[2]})
                    metrics_vol.append({'window': janela, 'q1': vol_q[0], 'median': vol_q[1], 'q3': vol_q[2]})
                    metrics_dd.append({'window': janela, 'q1': dd_q[0], 'median': dd_q[1], 'q3': dd_q[2]})
                else:
                    metrics_ret.append({'window': janela, 'q1': 0, 'median': 0, 'q3': 0})
                    metrics_vol.append({'window': janela, 'q1': 0, 'median': 0, 'q3': 0})
                    metrics_dd.append({'window': janela, 'q1': 0, 'median': 0, 'q3': 0})
        
        # -----------------------------------------------------
        # 3. Scatter Plot 12M (vol x ret)
        # -----------------------------------------------------
        scatter_data = []
        if not df_metrics.empty:
            df_scatter = df_metrics[
                (df_metrics['cnpj_fundo'].isin(cnpjs_filter)) & 
                (df_metrics['janela'] == '12M')
            ].dropna(subset=['vol', 'ret'])
            
            # Get fund names from carteira
            fund_names = df_carteira.drop_duplicates('cnpj_fundo').set_index('cnpj_fundo')['denom_social'].to_dict()
            
            for _, row in df_scatter.head(50).iterrows():
                scatter_data.append({
                    'x': float(row['vol']) if pd.notnull(row['vol']) else 0,
                    'y': float(row['ret']) if pd.notnull(row['ret']) else 0,
                    'z': 10,
                    'name': fund_names.get(row['cnpj_fundo'], row['cnpj_fundo'][:20])
                })
        
        # -----------------------------------------------------
        # 4. Performance Absoluta Table
        # -----------------------------------------------------
        perf_table = []
        if not df_metrics.empty:
            df_table = df_metrics[df_metrics['cnpj_fundo'].isin(cnpjs_filter)]
            
            # Pivot to have windows as columns
            funds_unique = df_table['cnpj_fundo'].unique()[:20]  # Limit to top 20
            
            for cnpj in funds_unique:
                df_fund = df_table[df_table['cnpj_fundo'] == cnpj]
                fund_name = df_carteira[df_carteira['cnpj_fundo'] == cnpj]['denom_social'].iloc[0] if not df_carteira[df_carteira['cnpj_fundo'] == cnpj].empty else cnpj[:20]
                
                row_data = {'name': fund_name, 'cnpj': cnpj}
                
                for janela in ['6M', '12M', '24M', '36M']:
                    df_j = df_fund[df_fund['janela'] == janela]
                    if not df_j.empty:
                        ret = df_j['ret'].iloc[0] if 'ret' in df_j.columns else None
                        meta = df_j['meta'].iloc[0] if 'meta' in df_j.columns and pd.notnull(df_j['meta'].iloc[0]) else None
                        bench = df_j['bench'].iloc[0] if 'bench' in df_j.columns and pd.notnull(df_j['bench'].iloc[0]) else None
                        
                        row_data[janela] = {
                            'value': round(float(ret), 2) if pd.notnull(ret) else None,
                            'status': get_performance_status(ret, meta, bench)
                        }
                    else:
                        row_data[janela] = {'value': None, 'status': 'gray'}
                
                perf_table.append(row_data)
        
        return {
            'flow_by_window': flow_by_window,
            'metrics_ret': metrics_ret,
            'metrics_vol': metrics_vol,
            'metrics_dd': metrics_dd,
            'scatter_12m': scatter_data,
            'performance_table': perf_table
        }
    
    def get_allocation_data(
        self, 
        client: Optional[str] = None, 
        segment: Optional[str] = None, 
        peer: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Get allocation data for the Alocação Carteira tab.
        
        Args:
            client: Filter by client (gestor)
            segment: Filter by cliente_segmentado
            peer: Filter by peer class
            
        Returns dict with:
        - flow_by_window: bar chart data with flow per window
        - evolution: monthly stacked bar chart by gestor
        - movement_diff: difference chart between months
        - snapshot: current portfolio snapshot with fund details
        - pie_data: pie chart data for current allocation
        """
        df_fluxo = get_fluxo_latest()
        df_carteira = get_carteira_df()
        
        # Get list of CNPJs matching filters
        cnpjs_filter = self._get_filtered_cnpjs(df_carteira, client, segment, peer)
        
        # Filter carteira
        df_cart_filtered = df_carteira[df_carteira['cnpj_fundo'].isin(cnpjs_filter)]
        
        # -----------------------------------------------------
        # 1. Flow by Window (same as performance)
        # -----------------------------------------------------
        flow_by_window = []
        if not df_fluxo.empty:
            df_flow_filtered = df_fluxo[df_fluxo['cnpj_fundo'].isin(cnpjs_filter)]
            
            windows = [6, 12, 24, 36, 48, 60]
            for w in windows:
                col = f'fluxo_{w}m'
                if col in df_flow_filtered.columns:
                    total = df_flow_filtered[col].sum()
                    flow_by_window.append({
                        'window': f'{w}M',
                        'value': float(total) if pd.notnull(total) else 0
                    })
        
        # -----------------------------------------------------
        # 2. Monthly Evolution by Gestor (stacked bar)
        # -----------------------------------------------------
        evolution_data = []
        if not df_cart_filtered.empty:
            # Aggregate by (dt_comptc, gestor_cota)
            df_evo = df_cart_filtered.groupby(['dt_comptc', 'gestor_cota'])['vl_merc_pos_final'].sum().reset_index()
            
            # Pivot to have gestores as columns
            pivot = df_evo.pivot(index='dt_comptc', columns='gestor_cota', values='vl_merc_pos_final').fillna(0)
            
            # Get top N gestores by total value
            top_gestores = pivot.sum().nlargest(10).index.tolist()
            
            for dt in pivot.index:
                row = {'month': dt.strftime('%b/%y'), 'date': dt.isoformat()}
                for g in top_gestores:
                    row[g] = float(pivot.loc[dt, g]) if g in pivot.columns else 0
                evolution_data.append(row)
        
        # -----------------------------------------------------
        # 3. Movement Difference (month over month change)
        # -----------------------------------------------------
        movement_diff = []
        if not df_cart_filtered.empty:
            # Sum by month
            df_monthly = df_cart_filtered.groupby('dt_comptc')['vl_merc_pos_final'].sum().reset_index()
            df_monthly = df_monthly.sort_values('dt_comptc')
            df_monthly['diff'] = df_monthly['vl_merc_pos_final'].diff()
            
            for _, row in df_monthly.tail(12).iterrows():
                movement_diff.append({
                    'month': row['dt_comptc'].strftime('%b/%y'),
                    'value': float(row['diff']) if pd.notnull(row['diff']) else 0
                })
        
        # -----------------------------------------------------
        # 4. Current Snapshot (list of funds)
        # -----------------------------------------------------
        snapshot = []
        pie_data = []
        
        if not df_cart_filtered.empty:
            # Get latest date
            max_dt = df_cart_filtered['dt_comptc'].max()
            df_latest = df_cart_filtered[df_cart_filtered['dt_comptc'] == max_dt]
            
            # Aggregate by fund invested
            df_snap = df_latest.groupby(['cnpj_fundo_cota', 'nm_fundo_cota', 'peer']).agg({
                'vl_merc_pos_final': 'sum'
            }).reset_index()
            
            df_snap = df_snap.sort_values('vl_merc_pos_final', ascending=False).head(20)
            
            total_pl = df_snap['vl_merc_pos_final'].sum()
            
            for idx, row in df_snap.iterrows():
                pct = (row['vl_merc_pos_final'] / total_pl * 100) if total_pl > 0 else 0
                
                snapshot.append({
                    'symbol': (row['peer'] or 'N/A')[:3].upper(),
                    'name': (row['nm_fundo_cota'] or row['cnpj_fundo_cota'])[:40],
                    'desc': row['peer'] or 'Fundo',
                    'pl': float(row['vl_merc_pos_final']),
                    'value': round(pct, 2)
                })
                
                pie_data.append({
                    'name': (row['nm_fundo_cota'] or row['cnpj_fundo_cota'])[:30],
                    'value': round(pct, 2),
                    'pl': float(row['vl_merc_pos_final'])
                })
        
        return {
            'flow_by_window': flow_by_window,
            'evolution': evolution_data,
            'gestores': list({g for row in evolution_data for g in row.keys() if g not in ['month', 'date']}),
            'movement_diff': movement_diff,
            'snapshot': snapshot,
            'pie_data': pie_data
        }
    
    def get_flow_data(
        self, 
        client: Optional[str] = None, 
        segment: Optional[str] = None, 
        peer: Optional[str] = None,
        window: int = 12
    ) -> Dict[str, Any]:
        """
        Get flow data for the Fluxo e Posição tab.
        
        Returns dict with:
        - evolution: monthly PL evolution
        - flow_distribution: flow by segment
        """
        df_carteira = get_carteira_df()
        df_fluxo = get_fluxo_latest()
        
        # Get CNPJs
        cnpjs_filter = self._get_filtered_cnpjs(df_carteira, client, segment, peer)
        
        df_cart_filtered = df_carteira[df_carteira['cnpj_fundo'].isin(cnpjs_filter)]
        
        # Evolution
        evolution = []
        if not df_cart_filtered.empty:
            df_evo = df_cart_filtered.groupby('dt_comptc')['vl_merc_pos_final'].sum().reset_index()
            for _, row in df_evo.iterrows():
                evolution.append({
                    'month': row['dt_comptc'].strftime('%b/%y'),
                    'date': row['dt_comptc'].isoformat(),
                    'value': float(row['vl_merc_pos_final']) if pd.notnull(row['vl_merc_pos_final']) else 0,
                    'multimercado': float(row['vl_merc_pos_final']) if pd.notnull(row['vl_merc_pos_final']) else 0
                })
        
        # Flow distribution by peer (peer_ativo is in fluxo_veiculos)
        flow_distribution = []
        if not df_fluxo.empty:
            df_flow_filtered = df_fluxo[df_fluxo['cnpj_fundo'].isin(cnpjs_filter)]
            col = f'fluxo_{window}m'
            
            if col in df_flow_filtered.columns and 'peer_ativo' in df_flow_filtered.columns:
                df_by_peer = df_flow_filtered.groupby('peer_ativo')[col].sum().reset_index()
                df_by_peer = df_by_peer.sort_values(col, ascending=False)
                
                for _, row in df_by_peer.iterrows():
                    flow_distribution.append({
                        'client': row['peer_ativo'],
                        'flow': float(row[col]) if pd.notnull(row[col]) else 0
                    })
        
        return {
            'evolution': evolution,
            'flow_distribution': flow_distribution
        }
    
    def _get_filtered_cnpjs(
        self, 
        df: pd.DataFrame, 
        client: Optional[str], 
        segment: Optional[str], 
        peer: Optional[str]
    ) -> set:
        """Helper to get CNPJs matching the filters."""
        if df.empty:
            return set()
        
        mask = pd.Series([True] * len(df), index=df.index)
        
        if client:
            mask &= df['cliente'] == client
        if segment and segment != 'all':
            mask &= df['cliente_segmentado'] == segment
        if peer and peer != 'all':
            mask &= df['peer'] == peer
        
        return set(df[mask]['cnpj_fundo'].unique())


# Singleton instance
allocators_service = AllocatorsService()
