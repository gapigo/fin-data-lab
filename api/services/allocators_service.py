"""
Allocators Service - Complete business logic for Allocators Intelligence dashboard.

This service provides data for all tabs with complete visualizations as specified.

Tabs:
1. Fluxo e Posição - Flow and position analysis by client
2. Performance - Performance metrics for invested funds (cnpj_fundo_cota)
3. Alocação - Allocation analysis by manager (gestor_cota)
"""

import pandas as pd
import numpy as np
from typing import Optional, Dict, Any, List
from datetime import datetime, timedelta

try:
    from ..data_models.allocators_data import (
        load_carteira_base,
        load_fluxo_base,
        load_metrics_full as load_metrics_base,
        get_full_allocators_data,
        get_filters as get_allocators_filters
    )
except ImportError:
    from data_models.allocators_data import (
        load_carteira_base,
        load_fluxo_base,
        load_metrics_full as load_metrics_base,
        get_full_allocators_data,
        get_filters as get_allocators_filters
    )


class AllocatorsService:
    """Service for allocators dashboard with all required visualizations."""
    
    def get_filters(self) -> Dict[str, Any]:
        """Get available filter options - only 7 allowed clients."""
        return get_allocators_filters()
    
    # =========================================================================
    # TAB 1: FLUXO E POSIÇÃO
    # =========================================================================
    
    def get_flow_position_data(
        self,
        client: Optional[str] = None,
        segment: Optional[str] = None,
        peer: Optional[str] = None,
        window: int = 12
    ) -> Dict[str, Any]:
        """
        Get flow and position data.
        
        Visão 1: Monthly position evolution (line chart) - vl_merc_pos_final by month
        Visão 2: Flow distribution by cliente_segmentado (bar chart, selectable windows)
        
        Args:
            client: Filter by cliente
            segment: Filter by cliente_segmentado
            peer: Filter by peer class
            window: Window in months for flow distribution (6, 12, 24, 36, 48, 60)
        """
        df_cart = load_carteira_base()
        df_flow = load_fluxo_base()
        
        if df_cart.empty:
            return {"monthly_position": [], "segment_flow": []}
        
        # Apply filters
        df_filtered = self._apply_filters(df_cart, client, segment, peer)
        
        # ---- Visão 1: Monthly Position Evolution ----
        monthly_position = []
        if not df_filtered.empty:
            # Group by month and sum vl_merc_pos_final
            df_monthly = df_filtered.groupby('dt_comptc')['vl_merc_pos_final'].sum().reset_index()
            df_monthly = df_monthly.sort_values('dt_comptc')
            
            for _, row in df_monthly.iterrows():
                monthly_position.append({
                    'month': row['dt_comptc'].strftime('%b/%y'),
                    'date': row['dt_comptc'].isoformat(),
                    'position': float(row['vl_merc_pos_final']) if pd.notnull(row['vl_merc_pos_final']) else 0
                })
        
        # ---- Visão 2: Flow Distribution by Segment ----
        segment_flow = []
        if not df_filtered.empty and not df_flow.empty:
            # Get cnpj_fundos from filtered carteira
            cnpj_list = df_filtered['cnpj_fundo'].unique()
            
            # Filter flow data
            df_flow_filtered = df_flow[df_flow['cnpj_fundo'].isin(cnpj_list)]
            
            # Get latest flow data
            df_flow_latest = df_flow_filtered.sort_values('dt_comptc').groupby('cnpj_fundo').tail(1)
            
            # Join with carteira to get cliente_segmentado
            df_join = df_flow_latest.merge(
                df_filtered[['cnpj_fundo', 'cliente_segmentado']].drop_duplicates(),
                on='cnpj_fundo',
                how='left'
            )
            
            # Aggregate by cliente_segmentado
            flow_col = f'fluxo_{window}m'
            if flow_col in df_join.columns:
                df_seg_flow = df_join.groupby('cliente_segmentado')[flow_col].sum().reset_index()
                df_seg_flow = df_seg_flow.sort_values(flow_col, ascending=False)
                
                for _, row in df_seg_flow.iterrows():
                    segment_flow.append({
                        'segment': row['cliente_segmentado'],
                        'flow': float(row[flow_col])  if pd.notnull(row[flow_col]) else 0
                    })
        
        return {
            "monthly_position": monthly_position,
            "segment_flow": segment_flow,
            "selected_window": window
        }
    
    # =========================================================================
    # TAB 2: PERFORMANCE
    # =========================================================================
    
    def get_performance_data(
        self,
        client: Optional[str] = None,
        segment: Optional[str] = None,
        peer: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Get performance data for invested funds (cnpj_fundo_cota).
        
        Visão 1: Flow by segment in windows (bar chart) - for cnpj_fundo
        Visão 2: Returns by window (bar chart, selectable metric) - for cnpj_fundo_cota
        Visão 3: Box plots for ret/vol/max_dd - for cnpj_fundo_cota
        Visão 4: Scatter plot (ret vs vol 12M) - for cnpj_fundo_cota
        Visão 5: Fund vs Meta vs Bench table - for selected fund
        """
        df_cart = load_carteira_base()
        df_flow = load_fluxo_base()
        df_metrics = load_metrics_base()
        
        # Apply filters
        df_filtered = self._apply_filters(df_cart, client, segment, peer)
        
        # ---- Visão 1: Flow by Segment (same as allocation) ----
        flow_by_segment = self._get_flow_by_segment(df_filtered, df_flow)
        
        # ---- Visão 2: Returns by Window (for cnpj_fundo_cota) ----
        returns_by_window = self._get_returns_by_window(df_filtered, df_metrics)
        
        # ---- Visão 3: Box Plots (ret, vol, max_dd) ----
        boxplots = self._get_performance_boxplots(df_filtered, df_metrics)
        
        # ---- Visão 4: Scatter Plot (ret vs vol 12M) ----
        scatter_data = self._get_risk_return_scatter(df_filtered, df_metrics)
        
        # ---- Visão 5: Fund vs Meta vs Bench ----
        fund_performance = self._get_fund_performance_table(df_filtered, df_metrics)
        
        return {
            "flow_by_segment": flow_by_segment,
            "returns_by_window": returns_by_window,
            "boxplots": boxplots,
            "scatter_12m": scatter_data,
            "fund_performance": fund_performance,
            "fund_detailed_metrics": self._get_allocator_fund_metrics(df_filtered, df_metrics)
        }
    
    # =========================================================================
    # TAB 3: ALOCAÇÃO
    # =========================================================================
    
    def get_allocation_data(
        self,
        client: Optional[str] = None,
        segment: Optional[str] = None,
        peer: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Get allocation data by gestor_cota (manager of invested funds).
        
        Visão 1: Flow by segment in windows (bar chart)
        Visão 2: Monthly evolution by gestor_cota (stacked bar chart)
        Visão 3: Month-over-month difference by gestor_cota
        Visão 4: Portfolio snapshot (current allocation details)
        Visão 5: Pie chart of current allocation
        """
        df_cart = load_carteira_base()
        df_flow = load_fluxo_base()
        
        # Apply filters
        df_filtered = self._apply_filters(df_cart, client, segment, peer)
        
        # ---- Visão 1: Flow by Segment ----
        flow_by_segment = self._get_flow_by_segment(df_filtered, df_flow)
        
        # ---- Visão 2: Monthly Evolution by Gestor_Cota ----
        monthly_evolution_data = self._get_monthly_evolution_by_gestor(df_filtered)
        
        # ---- Visão 3: Month-over-Month Difference by Gestor ----
        month_diff = self._get_month_difference_by_gestor(df_filtered)
        
        # ---- Visão 4: Portfolio Snapshot ----
        portfolio_snapshot = self._get_portfolio_snapshot(df_filtered)
        
        # ---- Visão 5: Pie Chart ----
        pie_data = self._get_allocation_pie(df_filtered)
        
        return {
            "flow_by_window": flow_by_segment,
            "evolution": monthly_evolution_data.get("data", []),
            "gestores": monthly_evolution_data.get("gestores", []),
            "month_difference": month_diff,
            "portfolio_snapshot": portfolio_snapshot,
            "pie_data": pie_data
        }
    
    # =========================================================================
    # HELPER METHODS
    # =========================================================================
    
    def _apply_filters(
        self,
        df: pd.DataFrame,
        client: Optional[str],
        segment: Optional[str],
        peer: Optional[str]
    ) -> pd.DataFrame:
        """Apply filters to dataframe."""
        if df.empty:
            return df
        
        mask = pd.Series([True] * len(df), index=df.index)
        
        if client:
            mask &= df['cliente'] == client
        if segment and segment != 'all':
            mask &= df['cliente_segmentado'] == segment
        if peer and peer != 'all':
            mask &= df['peer'] == peer
        
        return df[mask].copy()

    def _get_allocator_fund_metrics(
        self,
        df_cart: pd.DataFrame,
        df_metrics: pd.DataFrame
    ) -> List[Dict[str, Any]]:
        """
        Get detailed metrics for active funds in the allocator's portfolio.
        Uses direct SQL query matching user's CTE logic for reliability.
        """
        # Import here to avoid circular imports
        try:
            from ..data_models.allocators_data import PostgresConnector
        except ImportError:
            from common.postgresql import PostgresConnector
        
        # Get filter values from the already-filtered df_cart
        if df_cart.empty:
            return []
        
        clients = df_cart['cliente'].unique().tolist()
        segments = df_cart['cliente_segmentado'].dropna().unique().tolist()
        peers = df_cart['peer'].unique().tolist()
        
        # Build WHERE clause for filters
        client_filter = f"AND carteira.cliente IN ({','.join(repr(c) for c in clients)})" if clients else ""
        segment_filter = f"AND carteira.cliente_segmentado IN ({','.join(repr(s) for s in segments)})" if segments else ""
        peer_filter = f"AND carteira.peer IN ({','.join(repr(p) for p in peers)})" if peers else ""
        
        # User's exact SQL logic as a CTE
        query = f"""
        WITH base_carteira AS (
            SELECT * FROM cvm.carteira
            WHERE dt_comptc > CURRENT_DATE - INTERVAL '5 years' 
              AND peer IN ('Ações', 'Multimercado', 'Renda Fixa') 
              AND cliente <> gestor_cota
              {client_filter}
              {segment_filter}
              {peer_filter}
        ),
        ultima_aberta AS (
            SELECT carteira.* FROM base_carteira carteira
            INNER JOIN (
                SELECT cnpj_fundo, max(dt_comptc) as dt_comptc 
                FROM base_carteira 
                WHERE dt_comptc > CURRENT_DATE - INTERVAL '7 months' 
                GROUP BY cnpj_fundo
            ) max_dates
            ON max_dates.cnpj_fundo = carteira.cnpj_fundo 
            AND max_dates.dt_comptc = carteira.dt_comptc
        ),
        ultima_metrics AS (
            SELECT * FROM cvm.metrics 
            WHERE dt_comptc = (SELECT max(dt_comptc) FROM cvm.metrics)
        )
        SELECT 
            ultima_aberta.cliente,
            ultima_aberta.cliente_segmentado,
            ultima_aberta.cnpj_fundo_cota,
            ultima_aberta.nm_fundo_cota,
            ultima_metrics.janela,
            ultima_metrics.ret,
            ultima_metrics.vol,
            ultima_metrics.mdd as max_dd,
            ultima_metrics.sharpe,
            ultima_metrics.bench
        FROM ultima_aberta
        LEFT JOIN ultima_metrics ON ultima_metrics.cnpj_fundo = ultima_aberta.cnpj_fundo_cota
        WHERE ultima_metrics.janela IS NOT NULL
        """
        
        try:
            db = PostgresConnector()
            df_result = db.read_sql(query)
            
            if df_result.empty:
                return []
            
            result = []
            for _, row in df_result.iterrows():
                result.append({
                    'client': row['cliente'],
                    'segment': row['cliente_segmentado'],
                    'fund_cnpj': row['cnpj_fundo_cota'],
                    'fund_name': row['nm_fundo_cota'] if pd.notnull(row['nm_fundo_cota']) else row['cnpj_fundo_cota'],
                    'window': row['janela'],
                    'ret': float(row['ret']) if pd.notnull(row['ret']) else None,
                    'vol': float(row['vol']) if pd.notnull(row['vol']) else None,
                    'max_dd': float(row['max_dd']) if pd.notnull(row['max_dd']) else None,
                    'sharpe': float(row['sharpe']) if pd.notnull(row['sharpe']) else None,
                    'bench': float(row['bench']) if pd.notnull(row['bench']) else None
                })
            
            return result
            
        except Exception as e:
            print(f"[AllocatorsService] Error in fund metrics query: {e}")
            return []
    
    def _get_flow_by_segment(
        self,
        df_cart: pd.DataFrame,
        df_flow: pd.DataFrame
    ) -> List[Dict[str, Any]]:
        """Get flow aggregated by segment for all windows."""
        if df_cart.empty or df_flow.empty:
            return []
        
        # Get cnpj_fundos
        cnpj_list = df_cart['cnpj_fundo'].unique()
        df_flow_filtered = df_flow[df_flow['cnpj_fundo'].isin(cnpj_list)]
        df_flow_latest = df_flow_filtered.sort_values('dt_comptc').groupby('cnpj_fundo').tail(1)
        
        # Join with carteira to get cliente_segmentado
        df_join = df_flow_latest.merge(
            df_cart[['cnpj_fundo', 'cliente_segmentado']].drop_duplicates(),
            on='cnpj_fundo',
            how='left'
        )
        
        # Aggregate by cliente_segmentado for each window
        result = []
        for window in [6, 12, 24, 36, 48, 60]:
            col = f'fluxo_{window}m'
            if col in df_join.columns:
                total = df_join[col].sum()
                result.append({
                    'window': f'{window}M',
                    'value': float(total) if pd.notnull(total) else 0
                })
        
        return result
    
    def _get_returns_by_window(
        self,
        df_cart: pd.DataFrame,
        df_metrics: pd.DataFrame
    ) -> List[Dict[str, Any]]:
        """Get average returns by window for cnpj_fundo_cota."""
        if df_cart.empty or df_metrics.empty:
            return []
        
        # Get latest date from carteira
        max_date = df_cart['dt_comptc'].max()
        df_latest = df_cart[df_cart['dt_comptc'] == max_date]
        
        # Get cnpj_fundo_cotas
        cnpj_cotas = df_latest['cnpj_fundo_cota'].unique()
        
        # Filter metrics
        df_metrics_filtered = df_metrics[df_metrics['cnpj_fundo'].isin(cnpj_cotas)]
        
        # Calculate weighted average by vl_merc_pos_final
        result = []
        for janela in ['6M', '12M', '24M', '36M']:
            df_window = df_metrics_filtered[df_metrics_filtered['janela'] == janela]
            
            if not df_window.empty:
                # Join with position values
                df_with_pos = df_window.merge(
                    df_latest[['cnpj_fundo_cota', 'vl_merc_pos_final']].groupby('cnpj_fundo_cota').sum().reset_index(),
                    left_on='cnpj_fundo',
                    right_on='cnpj_fundo_cota',
                    how='left'
                )
                
                # Calculate weighted average return
                total_pos = df_with_pos['vl_merc_pos_final'].sum()
                if total_pos > 0:
                    weighted_ret = (df_with_pos['ret'] * df_with_pos['vl_merc_pos_final']).sum() / total_pos
                    result.append({
                        'window': janela,
                        'value': float(weighted_ret) if pd.notnull(weighted_ret) else 0
                    })
        
        return result
    
    def _get_performance_boxplots(
        self,
        df_cart: pd.DataFrame,
        df_metrics: pd.DataFrame
    ) -> Dict[str, List[Dict[str, Any]]]:
        """Get box plot data for ret, vol, max_dd across all windows."""
        if df_cart.empty or df_metrics.empty:
            return {"ret": [], "vol": [], "max_dd": []}
        
        # Get cnpj_fundo_cotas from active allocations (Logic: >5y, active in last 7m, max date per fund)
        min_date = pd.Timestamp.now() - pd.DateOffset(years=5)
        df_recent = df_cart[df_cart['dt_comptc'] > min_date]
        if 'gestor_cota' in df_recent.columns and 'cliente' in df_recent.columns:
             df_recent = df_recent[df_recent['cliente'] != df_recent['gestor_cota']]
             
        last_7m = pd.Timestamp.now() - pd.DateOffset(months=7)
        df_active = df_recent[df_recent['dt_comptc'] > last_7m]
        
        if df_active.empty:
             cnpj_cotas = []
        else:
             latest = df_active.groupby('cnpj_fundo')['dt_comptc'].max().reset_index()
             df_ultima_aberta = df_recent.merge(latest, on=['cnpj_fundo', 'dt_comptc'])
             cnpj_cotas = df_ultima_aberta['cnpj_fundo_cota'].unique()
        
        # Filter metrics
        df_metrics_filtered = df_metrics[df_metrics['cnpj_fundo'].isin(cnpj_cotas)]
        
        ret_data = []
        vol_data = []
        dd_data = []
        
        for janela in ['6M', '12M', '24M', '36M', '48M', '60M']:
            df_window = df_metrics_filtered[df_metrics_filtered['janela'] == janela]
            
            if not df_window.empty:
                ret_vals = df_window['ret'].dropna()
                vol_vals = df_window['vol'].dropna()
                dd_vals = df_window['max_dd'].dropna()
                
                if len(ret_vals) > 0:
                    ret_q = ret_vals.quantile([0, 0.25, 0.5, 0.75, 1.0]).tolist()
                    ret_data.append({
                        'window': janela,
                        'min': ret_q[0],
                        'q1': ret_q[1],
                        'median': ret_q[2],
                        'q3': ret_q[3],
                        'max': ret_q[4]
                    })
                
                if len(vol_vals) > 0:
                    vol_q = vol_vals.quantile([0, 0.25, 0.5, 0.75, 1.0]).tolist()
                    vol_data.append({
                        'window': janela,
                        'min': vol_q[0],
                        'q1': vol_q[1],
                        'median': vol_q[2],
                        'q3': vol_q[3],
                        'max': vol_q[4]
                    })
                
                if len(dd_vals) > 0:
                    dd_q = dd_vals.quantile([0, 0.25, 0.5, 0.75, 1.0]).tolist()
                    dd_data.append({
                        'window': janela,
                        'min': dd_q[0],
                        'q1': dd_q[1],
                        'median': dd_q[2],
                        'q3': dd_q[3],
                        'max': dd_q[4]
                    })
        
        return {
            "ret": ret_data,
            "vol": vol_data,
            "max_dd": dd_data
        }
    
    def _get_risk_return_scatter(
        self,
        df_cart: pd.DataFrame,
        df_metrics: pd.DataFrame
    ) -> List[Dict[str, Any]]:
        """Get scatter plot data (vol x ret for 12M) for cnpj_fundo_cota."""
        if df_cart.empty or df_metrics.empty:
            return []
        
        # Get active allocations
        min_date = pd.Timestamp.now() - pd.DateOffset(years=5)
        df_recent = df_cart[df_cart['dt_comptc'] > min_date]
        
        last_7m = pd.Timestamp.now() - pd.DateOffset(months=7)
        df_active = df_recent[df_recent['dt_comptc'] > last_7m]
        
        if df_active.empty:
            return []
            
        latest = df_active.groupby('cnpj_fundo')['dt_comptc'].max().reset_index()
        df_latest = df_recent.merge(latest, on=['cnpj_fundo', 'dt_comptc'])
        
        # Get 12M metrics for cnpj_fundo_cotas
        df_metrics_12m = df_metrics[df_metrics['janela'] == '12M']
        
        # Join metrics with carteira to get position sizes
        df_scatter = df_metrics_12m.merge(
            df_latest[['cnpj_fundo_cota', 'nm_fundo_cota', 'vl_merc_pos_final']].groupby(['cnpj_fundo_cota', 'nm_fundo_cota']).sum().reset_index(),
            left_on='cnpj_fundo',
            right_on='cnpj_fundo_cota',
            how='inner'
        )
        
        # Filter valid data
        df_scatter = df_scatter.dropna(subset=['vol', 'ret', 'vl_merc_pos_final'])
        
        # Limit to top 50 by position
        df_scatter = df_scatter.nlargest(50, 'vl_merc_pos_final')
        
        result = []
        for _, row in df_scatter.iterrows():
            result.append({
                'x': float(row['vol']),
                'y': float(row['ret']),
                'z': float(row['vl_merc_pos_final']) / 1e6,  # Size in millions
                'name': row['nm_fundo_cota'][:40] if pd.notnull(row['nm_fundo_cota']) else 'N/A'
            })
        
        return result
    
    def _get_fund_performance_table(
        self,
        df_cart: pd.DataFrame,
        df_metrics: pd.DataFrame
    ) -> Dict[str, Any]:
        """Get fund performance vs meta vs bench."""
        if df_cart.empty or df_metrics.empty:
            return {"funds": [], "selected_fund": None}
        
        # Get latest carteira
        max_date = df_cart['dt_comptc'].max()
        df_latest = df_cart[df_cart['dt_comptc'] == max_date]
        
        # Get top funds by position
        df_top_funds = df_latest.groupby(['cnpj_fundo_cota', 'nm_fundo_cota']).agg({
            'vl_merc_pos_final': 'sum'
        }).reset_index().nlargest(20, 'vl_merc_pos_final')
        
        # Prefer KINEA funds
        kinea_funds = df_top_funds[df_top_funds['nm_fundo_cota'].str.contains('KINEA', case=False, na=False)]
        if not kinea_funds.empty:
            selected_fund = kinea_funds.iloc[0]['cnpj_fundo_cota']
        elif not df_top_funds.empty:
            selected_fund = df_top_funds.iloc[0]['cnpj_fundo_cota']
        else:
            selected_fund = None
        
        # Get performance data for each window
        funds_data = []
        for _, fund_row in df_top_funds.iterrows():
            cnpj_cota = fund_row['cnpj_fundo_cota']
            fund_name = fund_row['nm_fundo_cota']
            
            # Get metrics for this fund
            df_fund_metrics = df_metrics[df_metrics['cnpj_fundo'] == cnpj_cota]
            
            windows_data = {}
            for janela in ['6M', '12M', '24M', '36M']:
                df_j = df_fund_metrics[df_fund_metrics['janela'] == janela]
                if not df_j.empty:
                    ret = df_j['ret'].iloc[0] if 'ret' in df_j.columns else None
                    meta = df_j['meta'].iloc[0] if 'meta' in df_j.columns else None
                    bench = df_j['bench'].iloc[0] if 'bench' in df_j.columns else None
                    
                    # Determine status
                    status = self._get_performance_status(ret, meta, bench)
                    
                    windows_data[janela] = {
                        'ret': round(float(ret), 2) if pd.notnull(ret) else None,
                        'meta': round(float(meta), 2) if pd.notnull(meta) else None,
                        'bench': round(float(bench), 2) if pd.notnull(bench) else None,
                        'status': status
                    }
            
            funds_data.append({
                'cnpj': cnpj_cota,
                'name': fund_name[:50] if pd.notnull(fund_name) else 'N/A',
                'windows': windows_data
            })
        
        return {
            "funds": funds_data,
            "selected_fund": selected_fund
        }
    
    def _get_monthly_evolution_by_gestor(
        self,
        df_cart: pd.DataFrame
    ) -> Dict[str, Any]:
        """Get monthly evolution stacked by gestor_cota."""
        if df_cart.empty:
            return {"data": [], "gestores": []}
        
        # Aggregate by (dt_comptc, gestor_cota)
        df_agg = df_cart.groupby(['dt_comptc', 'gestor_cota'])['vl_merc_pos_final'].sum().reset_index()
        
        # Pivot to have gestores as columns
        pivot = df_agg.pivot(index='dt_comptc', columns='gestor_cota', values='vl_merc_pos_final').fillna(0)
        
        # Get top 10 gestores by total value
        top_gestores = pivot.sum().nlargest(10).index.tolist()
        
        # Build result
        result = []
        for dt in sorted(pivot.index):
            row = {
                'month': dt.strftime('%b/%y'),
                'date': dt.isoformat()
            }
            for g in top_gestores:
                row[g] = float(pivot.loc[dt, g]) if g in pivot.columns else 0
            result.append(row)
        
        return {
            "data": result,
            "gestores": top_gestores
        }
    
    def _get_month_difference_by_gestor(
        self,
        df_cart: pd.DataFrame
    ) -> List[Dict[str, Any]]:
        """Get month-over-month difference by gestor_cota."""
        if df_cart.empty:
            return []
        
        # Aggregate by (dt_comptc, gestor_cota)
        df_agg = df_cart.groupby(['dt_comptc', 'gestor_cota'])['vl_merc_pos_final'].sum().reset_index()
        
        # Get top gestores
        top_gestores = df_agg.groupby('gestor_cota')['vl_merc_pos_final'].sum().nlargest(10).index.tolist()
        
        result = []
        for gestor in top_gestores:
            df_gestor = df_agg[df_agg['gestor_cota'] == gestor].sort_values('dt_comptc')
            df_gestor['diff'] = df_gestor['vl_merc_pos_final'].diff()
            
            # Get last 12 months
            df_recent = df_gestor.tail(12)
            
            for _, row in df_recent.iterrows():
                result.append({
                    'gestor': gestor,
                    'month': row['dt_comptc'].strftime('%b/%y'),
                    'difference': float(row['diff']) if pd.notnull(row['diff']) else 0
                })
        
        return result
    
    def _get_portfolio_snapshot(
        self,
        df_cart: pd.DataFrame
    ) -> List[Dict[str, Any]]:
        """Get current portfolio snapshot with fund details."""
        if df_cart.empty:
            return []
        
        # Get latest date
        max_date = df_cart['dt_comptc'].max()
        df_latest = df_cart[df_cart['dt_comptc'] == max_date]
        
        # Aggregate by cnpj_fundo_cota
        df_snap = df_latest.groupby(['cnpj_fundo_cota', 'nm_fundo_cota', 'peer', 'gestor_cota']).agg({
            'vl_merc_pos_final': 'sum'
        }).reset_index()
        
        df_snap = df_snap.sort_values('vl_merc_pos_final', ascending=False).head(20)
        
        total_pl = df_snap['vl_merc_pos_final'].sum()
        
        result = []
        for _, row in df_snap.iterrows():
            pct = (row['vl_merc_pos_final'] / total_pl * 100) if total_pl > 0 else 0
            
            result.append({
                'symbol': (row['peer'] or 'N/A')[:3].upper(),
                'name': (row['nm_fundo_cota'] or row['cnpj_fundo_cota'])[:50],
                'gestor': (row['gestor_cota'] or 'N/A')[:30],
                'peer': row['peer'] or 'N/A',
                'pl': float(row['vl_merc_pos_final']),
                'percentage': round(pct, 2)
            })
        
        return result
    
    def _get_allocation_pie(
        self,
        df_cart: pd.DataFrame
    ) -> List[Dict[str, Any]]:
        """Get pie chart data for current allocation."""
        if df_cart.empty:
            return []
        
        # Get latest date
        max_date = df_cart['dt_comptc'].max()
        df_latest = df_cart[df_cart['dt_comptc'] == max_date]
        
        # Aggregate by gestor_cota
        df_pie = df_latest.groupby('gestor_cota')['vl_merc_pos_final'].sum().reset_index()
        df_pie = df_pie.sort_values('vl_merc_pos_final', ascending=False).head(10)
        
        total = df_pie['vl_merc_pos_final'].sum()
        
        result = []
        for _, row in df_pie.iterrows():
            pct = (row['vl_merc_pos_final'] / total * 100) if total > 0 else 0
            result.append({
                'name': row['gestor_cota'][:30],
                'value': round(pct, 2),
                'pl': float(row['vl_merc_pos_final'])
            })
        
        return result
    
    def _get_performance_status(
        self,
        ret: Optional[float],
        meta: Optional[float],
        bench: Optional[float]
    ) -> str:
        """Determine performance status color."""
        if ret is None or pd.isna(ret):
            return 'gray'
        
        if meta is not None and pd.notnull(meta) and ret >= meta:
            return 'green'
        elif bench is not None and pd.notnull(bench) and ret >= bench:
            return 'yellow'
        else:
            return 'red'


# Singleton instance
allocators_service = AllocatorsService()
