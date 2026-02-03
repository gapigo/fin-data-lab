"""
Serviço de negócio para Alocadores Simplificado.

Este serviço processa os dados do cache e os transforma nos formatos
esperados pelos gráficos do frontend.

Três telas principais:
1. Fluxo do Cliente - Gráfico de barras + linha histórica
2. Performance da Carteira - Posição, métricas compostas e boxplots
3. Carteira Completa - Donut e tabela expandível
"""

from typing import Optional, List, Dict, Any
import numpy as np
from collections import defaultdict

from .data_cache import get_cache
from .config import (
    HIGHLIGHT_STRING, 
    COLOR_HIGHLIGHT, 
    COLOR_NORMAL, 
    COLOR_POSITIVE, 
    COLOR_NEGATIVE,
    COLOR_HIGHLIGHT_ACTIVE,
    COLOR_HIGHLIGHT_INACTIVE,
    DEFAULT_WINDOWS,
    sort_windows,
    parse_window
)


class AllocatorsSimplifiedService:
    """Serviço com lógica de negócio para dashboard simplificado."""
    
    def __init__(self):
        self.cache = get_cache()
    
    # ========================================================================
    # TELA 1: FLUXO DO CLIENTE
    # ========================================================================
    
    def get_client_flow(
        self, 
        client: str, 
        peers: Optional[List[str]] = None,
        window: str = '12M'
    ) -> Dict[str, Any]:
        """
        Retorna dados para Tela 1: Fluxo do Cliente.
        
        Args:
            client: Cliente selecionado (único)
            peers: Lista de peers selecionados
            window: Janela para gráfico de barras (6M, 12M, etc)
            
        Returns:
            {
                "bar_chart": [...],  # Dados do gráfico de barras por cliente_segmentado
                "line_chart": [...]  # Dados do gráfico de linha (5 anos)
            }
        """
        # Gráfico de barras - fluxo por segmento
        flow_data = self.cache.get_flow_by_segment(client=client, peers=peers)
        
        # Agregar por cliente_segmentado
        segment_flows = defaultdict(lambda: {
            'fluxo_6m': 0, 'fluxo_12m': 0, 'fluxo_24m': 0,
            'fluxo_36m': 0, 'fluxo_48m': 0, 'fluxo_60m': 0
        })
        
        for row in flow_data:
            seg = row.get('cliente_segmentado')
            if seg:
                for key in segment_flows[seg]:
                    segment_flows[seg][key] += row.get(key) or 0
        
        # Formatar para gráfico de barras
        window_key = f'fluxo_{window.lower()}'
        bar_chart = []
        for seg, flows in segment_flows.items():
            flow_value = flows.get(window_key, 0)
            bar_chart.append({
                'cliente_segmentado': seg,
                'flow': flow_value,
                'color': COLOR_POSITIVE if flow_value >= 0 else COLOR_NEGATIVE
            })
        
        # Ordenar por valor absoluto (maiores primeiro)
        bar_chart.sort(key=lambda x: abs(x['flow']), reverse=True)
        
        # Gráfico de linha - histórico 5 anos
        historical_data = self.cache.get_historical_position(client=client, peers=peers)
        
        # Agregar por data
        date_totals = defaultdict(float)
        for row in historical_data:
            dt = row.get('dt_comptc')
            val = row.get('vl_merc_pos_final') or 0
            date_totals[dt] += val
        
        line_chart = [
            {'date': dt, 'value': val}
            for dt, val in sorted(date_totals.items())
        ]
        
        return {
            'bar_chart': bar_chart,
            'line_chart': line_chart
        }
    
    # ========================================================================
    # TELA 2: PERFORMANCE DA CARTEIRA
    # ========================================================================
    
    def get_portfolio_performance(
        self, 
        client: str, 
        segment: str,
        peers: Optional[List[str]] = None,
        metric: str = 'ret',
        windows: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        Retorna dados para Tela 2: Performance da Carteira.
        
        Args:
            client: Cliente selecionado
            segment: Cliente segmentado (único)
            peers: Lista de peers
            metric: Métrica selecionada (ret, vol, mdd, etc)
            windows: Janelas a exibir (default: 6M, 12M, 24M, 36M)
            
        Returns:
            {
                "position_chart": [...],    # Gráfico de barras de posição
                "metrics_charts": {...},    # Gráficos de métricas por janela
                "boxplots": {...},          # Dados de boxplot
                "highlighted_funds": [...], # Fundos com KINEA
                "all_funds": [...]          # Todos os fundos (para dropdown)
            }
        """
        if windows is None:
            windows = DEFAULT_WINDOWS
        
        windows = sort_windows(windows)
        
        # Carregar dados
        position_data = self.cache.get_current_position(
            client=client, segment=segment, peers=peers
        )
        metrics_data = self.cache.get_fund_metrics(
            client=client, segment=segment, peers=peers
        )
        
        # === 1. Gráfico de Posição ===
        # Agregar posição por fundo
        fund_positions = {}
        for row in position_data:
            cnpj = row.get('cnpj_fundo_cota')
            name = row.get('nm_fundo_cota', '')
            if cnpj:
                if cnpj not in fund_positions:
                    fund_positions[cnpj] = {
                        'name': name,
                        'value': 0,
                        'is_highlighted': HIGHLIGHT_STRING.lower() in name.lower()
                    }
                fund_positions[cnpj]['value'] += row.get('vl_merc_pos_final') or 0
        
        position_chart = []
        for cnpj, info in fund_positions.items():
            position_chart.append({
                'cnpj': cnpj,
                'name': info['name'],
                'value': info['value'],
                'label': self._format_value(info['value']),
                'color': COLOR_HIGHLIGHT if info['is_highlighted'] else COLOR_NORMAL,
                'is_highlighted': info['is_highlighted']
            })
        
        # Ordenar decrescente
        position_chart.sort(key=lambda x: x['value'], reverse=True)
        
        # === 2. Gráficos de Métricas por Janela ===
        # Organizar métricas por fundo
        fund_metrics = defaultdict(dict)
        for row in metrics_data:
            cnpj = row.get('cnpj_fundo')
            name = row.get('nm_fundo_cota', '')
            janela = row.get('janela')
            
            if cnpj and janela:
                if 'name' not in fund_metrics[cnpj]:
                    fund_metrics[cnpj]['name'] = name
                    fund_metrics[cnpj]['vl_merc_pos_final'] = row.get('vl_merc_pos_final') or 0
                    fund_metrics[cnpj]['is_highlighted'] = HIGHLIGHT_STRING.lower() in name.lower()
                
                fund_metrics[cnpj][janela] = {
                    'ret': row.get('ret'),
                    'vol': row.get('vol'),
                    'mdd': row.get('mdd'),
                    'sharpe': row.get('sharpe'),
                    'calmar': row.get('calmar'),
                    'hit_ratio': row.get('hit_ratio'),
                    'info_ratio': row.get('info_ratio'),
                    'recovery_time': row.get('recovery_time')
                }
        
        # Gerar dados para cada janela
        metrics_charts = {}
        for window in windows:
            window_data = []
            for cnpj, info in fund_metrics.items():
                if window in info and info[window].get(metric) is not None:
                    has_position = info.get('vl_merc_pos_final', 0) > 0
                    is_highlighted = info.get('is_highlighted', False)
                    
                    # Determinar cor
                    if is_highlighted and has_position:
                        color = COLOR_HIGHLIGHT_ACTIVE  # Verde
                    elif not has_position:
                        color = COLOR_HIGHLIGHT_INACTIVE  # Roxo
                    else:
                        color = COLOR_NORMAL  # Azul claro
                    
                    window_data.append({
                        'cnpj': cnpj,
                        'name': info['name'],
                        'value': info[window][metric],
                        'color': color,
                        'has_position': has_position,
                        'is_highlighted': is_highlighted
                    })
            
            # Ordenar decrescente
            window_data.sort(key=lambda x: x['value'] or 0, reverse=True)
            metrics_charts[window] = window_data
        
        # === 3. Boxplots ===
        boxplots = self._calculate_boxplots(
            fund_metrics, 
            windows=['6M', '12M', '24M', '36M', '48M', '60M']
        )
        
        # === 4. Fundos para dropdown ===
        all_funds = [
            {'cnpj': cnpj, 'name': info['name'], 'is_highlighted': info.get('is_highlighted', False)}
            for cnpj, info in fund_metrics.items()
        ]
        all_funds.sort(key=lambda x: (0 if x['is_highlighted'] else 1, x['name']))
        
        # Fundos destacados (KINEA)
        highlighted_funds = [f for f in all_funds if f['is_highlighted']]
        
        return {
            'position_chart': position_chart,
            'metrics_charts': metrics_charts,
            'boxplots': boxplots,
            'highlighted_funds': highlighted_funds,
            'all_funds': all_funds,
            'default_fund': highlighted_funds[0] if highlighted_funds else (all_funds[0] if all_funds else None)
        }
    
    def _calculate_boxplots(
        self, 
        fund_metrics: dict, 
        windows: List[str]
    ) -> Dict[str, Any]:
        """
        Calcula dados de boxplot para ret, vol e mdd.
        
        Retorna estrutura para 3 gráficos lado a lado.
        """
        metrics_to_plot = ['ret', 'vol', 'mdd']
        result = {}
        
        for metric in metrics_to_plot:
            result[metric] = []
            
            for window in windows:
                values = []
                for cnpj, info in fund_metrics.items():
                    if window in info and info[window].get(metric) is not None:
                        values.append(info[window][metric])
                
                if len(values) >= 5:  # Mínimo para boxplot
                    q1 = np.percentile(values, 25)
                    median = np.percentile(values, 50)
                    q3 = np.percentile(values, 75)
                    iqr = q3 - q1
                    lower_whisker = max(min(values), q1 - 1.5 * iqr)
                    upper_whisker = min(max(values), q3 + 1.5 * iqr)
                    
                    outliers = [v for v in values if v < lower_whisker or v > upper_whisker]
                    
                    result[metric].append({
                        'window': window,
                        'min': lower_whisker,
                        'q1': q1,
                        'median': median,
                        'q3': q3,
                        'max': upper_whisker,
                        'outliers': outliers,
                        'count': len(values)
                    })
        
        return result
    
    def get_fund_highlight_point(
        self, 
        client: str,
        segment: str,
        cnpj_fundo: str,
        peers: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        Retorna pontos de destaque de um fundo específico para os boxplots.
        
        Args:
            cnpj_fundo: CNPJ do fundo a destacar
        """
        metrics_data = self.cache.get_fund_metrics(
            client=client, segment=segment, peers=peers
        )
        
        # Encontrar o fundo
        fund_data = [r for r in metrics_data if r.get('cnpj_fundo') == cnpj_fundo]
        
        if not fund_data:
            return {}
        
        # Organizar por janela
        result = {}
        for row in fund_data:
            window = row.get('janela')
            if window:
                result[window] = {
                    'ret': row.get('ret'),
                    'vol': row.get('vol'),
                    'mdd': row.get('mdd')
                }
        
        return result
    
    # ========================================================================
    # TELA 3: CARTEIRA COMPLETA
    # ========================================================================
    
    def get_complete_portfolio(
        self,
        client: Optional[str] = None,
        segment: Optional[str] = None,
        cnpj_fundo: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Retorna dados para Tela 3: Carteira Completa.
        
        Pode ser chamado de duas formas:
        1. Por cliente segmentado: client + segment
        2. Por CNPJ: cnpj_fundo
        
        Returns:
            {
                "donut_chart": {...},  # Dados hierárquicos para donut
                "table_data": [...],   # Dados para tabela expandível
                "total_value": float   # Total da carteira
            }
        """
        # Carregar dados
        if cnpj_fundo:
            assets = self.cache.get_portfolio_assets(cnpj_fundo=cnpj_fundo)
        else:
            assets = self.cache.get_portfolio_assets(client=client, segment=segment)
        
        if not assets:
            return {'donut_chart': {}, 'table_data': [], 'total_value': 0}
        
        # Calcular total
        total_value = sum(a.get('vl_merc_pos_final') or 0 for a in assets)
        
        # === Donut Chart (3 camadas) ===
        # Estrutura: tp_aplic -> tp_ativo -> nm_ativo
        donut_data = self._build_donut_data(assets, total_value)
        
        # === Tabela Expandível ===
        table_data = self._build_table_data(assets, total_value)
        
        return {
            'donut_chart': donut_data,
            'table_data': table_data,
            'total_value': total_value
        }
    
    def _build_donut_data(self, assets: list, total_value: float) -> dict:
        """
        Constrói dados hierárquicos para gráfico de donut.
        
        Estrutura de saída:
        {
            "name": "Root",
            "children": [
                {
                    "name": "tp_aplic_1",
                    "value": ...,
                    "children": [
                        {
                            "name": "tp_ativo_1",
                            "value": ...,
                            "children": [...]
                        }
                    ]
                }
            ]
        }
        """
        # Agregar dados
        hierarchy = defaultdict(lambda: defaultdict(lambda: defaultdict(float)))
        
        for asset in assets:
            tp_aplic = asset.get('tp_aplic') or 'Outros'
            tp_ativo = asset.get('tp_ativo') or 'Outros'
            nm_ativo = asset.get('nm_ativo') or 'Desconhecido'
            value = asset.get('vl_merc_pos_final') or 0
            
            hierarchy[tp_aplic][tp_ativo][nm_ativo] += value
        
        # Construir estrutura hierárquica
        root = {'name': 'Carteira', 'children': []}
        
        for tp_aplic, tipos_ativo in sorted(hierarchy.items()):
            tp_aplic_value = sum(sum(assets.values()) for assets in tipos_ativo.values())
            tp_aplic_node = {
                'name': tp_aplic,
                'value': tp_aplic_value,
                'percentage': (tp_aplic_value / total_value * 100) if total_value else 0,
                'children': []
            }
            
            for tp_ativo, ativos in sorted(tipos_ativo.items()):
                tp_ativo_value = sum(ativos.values())
                tp_ativo_node = {
                    'name': tp_ativo,
                    'value': tp_ativo_value,
                    'percentage': (tp_ativo_value / total_value * 100) if total_value else 0,
                    'children': []
                }
                
                for nm_ativo, value in sorted(ativos.items(), key=lambda x: -x[1]):
                    tp_ativo_node['children'].append({
                        'name': nm_ativo,
                        'value': value,
                        'percentage': (value / total_value * 100) if total_value else 0
                    })
                
                tp_aplic_node['children'].append(tp_ativo_node)
            
            root['children'].append(tp_aplic_node)
        
        return root
    
    def _build_table_data(self, assets: list, total_value: float) -> list:
        """
        Constrói dados para tabela expandível agrupada por tp_aplic.
        """
        # Agregar por tp_aplic
        groups = defaultdict(list)
        group_totals = defaultdict(float)
        
        for asset in assets:
            tp_aplic = asset.get('tp_aplic') or 'Outros'
            value = asset.get('vl_merc_pos_final') or 0
            
            groups[tp_aplic].append({
                'nm_ativo': asset.get('nm_ativo'),
                'cd_ativo': asset.get('cd_ativo'),
                'tp_cd_ativo': asset.get('tp_cd_ativo'),
                'vl_merc_pos_final': value,
                'percentage': (value / total_value * 100) if total_value else 0
            })
            group_totals[tp_aplic] += value
        
        # Formatar para tabela
        result = []
        for tp_aplic in sorted(groups.keys(), key=lambda x: -group_totals[x]):
            items = sorted(groups[tp_aplic], key=lambda x: -x.get('vl_merc_pos_final', 0))
            result.append({
                'tp_aplic': tp_aplic,
                'total_value': group_totals[tp_aplic],
                'percentage': (group_totals[tp_aplic] / total_value * 100) if total_value else 0,
                'count': len(items),
                'items': items
            })
        
        return result
    
    # ========================================================================
    # UTILITÁRIOS
    # ========================================================================
    
    def _format_value(self, value: float) -> str:
        """Formata valor para exibição (K, M, B)."""
        if value is None:
            return '-'
        
        abs_val = abs(value)
        if abs_val >= 1e9:
            return f'{value/1e9:.1f}B'
        elif abs_val >= 1e6:
            return f'{value/1e6:.1f}M'
        elif abs_val >= 1e3:
            return f'{value/1e3:.1f}K'
        else:
            return f'{value:.0f}'
    
    def get_filters(self) -> dict:
        """Retorna filtros disponíveis."""
        return self.cache.get_menu()


# ============================================================================
# INSTÂNCIA SINGLETON
# ============================================================================

_service_instance = None

def get_service() -> AllocatorsSimplifiedService:
    """Retorna instância singleton do serviço."""
    global _service_instance
    if _service_instance is None:
        _service_instance = AllocatorsSimplifiedService()
    return _service_instance
