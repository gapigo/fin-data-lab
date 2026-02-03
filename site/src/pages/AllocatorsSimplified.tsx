/**
 * Alocadores Simplificado - Dashboard de alocadores com 3 telas.
 * 
 * Tela 1: Fluxo do Cliente
 * Tela 2: Performance da Carteira
 * Tela 3: Carteira Completa
 */

import React, { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
    BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend,
    ComposedChart
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import {
    Loader2, ChevronDown, ChevronRight, TrendingUp, TrendingDown,
    BarChart3, PieChart as PieChartIcon, Activity, Wallet
} from 'lucide-react';

// ============================================================================
// CONFIGURAÇÃO
// ============================================================================

const API_BASE = 'http://localhost:8000';

// Cores
const COLORS = {
    highlight: '#1e40af',
    normal: '#3b82f6',
    positive: '#10b981',
    negative: '#ef4444',
    highlightActive: '#16a34a',
    highlightInactive: '#8b5cf6'
};

// ============================================================================
// HELPERS
// ============================================================================

const formatValue = (val: number): string => {
    if (val === undefined || val === null) return '-';
    const abs = Math.abs(val);
    if (abs >= 1e9) return `${(val / 1e9).toFixed(1)}B`;
    if (abs >= 1e6) return `${(val / 1e6).toFixed(1)}M`;
    if (abs >= 1e3) return `${(val / 1e3).toFixed(1)}K`;
    return val.toFixed(0);
};

const formatCurrency = (val: number): string => {
    if (val === undefined || val === null) return '-';
    return `R$ ${formatValue(val)}`;
};

const formatPercent = (val: number): string => {
    if (val === undefined || val === null) return '-';
    return `${val.toFixed(2)}%`;
};

// ============================================================================
// API SERVICE
// ============================================================================

const AllocatorsSimpleApi = {
    getFilters: async () => {
        const res = await fetch(`${API_BASE}/allocators-simple/filters`);
        return res.json();
    },

    getFlow: async (client: string, peers?: string[], window = '12M') => {
        const params = new URLSearchParams({ client, window });
        if (peers?.length) params.append('peers', peers.join(','));
        const res = await fetch(`${API_BASE}/allocators-simple/flow?${params}`);
        return res.json();
    },

    getPerformance: async (client: string, segment: string, peers?: string[], metric = 'ret', windows?: string[]) => {
        const params = new URLSearchParams({ client, segment, metric });
        if (peers?.length) params.append('peers', peers.join(','));
        if (windows?.length) params.append('windows', windows.join(','));
        const res = await fetch(`${API_BASE}/allocators-simple/performance?${params}`);
        return res.json();
    },

    getFundHighlight: async (client: string, segment: string, cnpj: string, peers?: string[]) => {
        const params = new URLSearchParams({ client, segment, cnpj });
        if (peers?.length) params.append('peers', peers.join(','));
        const res = await fetch(`${API_BASE}/allocators-simple/fund-highlight?${params}`);
        return res.json();
    },

    getPortfolio: async (client?: string, segment?: string, cnpj?: string) => {
        const params = new URLSearchParams();
        if (client) params.append('client', client);
        if (segment) params.append('segment', segment);
        if (cnpj) params.append('cnpj', cnpj);
        const res = await fetch(`${API_BASE}/allocators-simple/portfolio?${params}`);
        return res.json();
    }
};

// ============================================================================
// TELA 1: FLUXO DO CLIENTE
// ============================================================================

interface FlowTabProps {
    client: string;
    peers: string[];
}

const FlowTab: React.FC<FlowTabProps> = ({ client, peers }) => {
    const [selectedWindow, setSelectedWindow] = useState('12M');

    const { data, isLoading } = useQuery({
        queryKey: ['allocators-simple-flow', client, peers, selectedWindow],
        queryFn: () => AllocatorsSimpleApi.getFlow(client, peers, selectedWindow),
        enabled: !!client
    });

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="animate-spin text-emerald-500 w-10 h-10" />
            </div>
        );
    }

    const barData = data?.bar_chart || [];
    const lineData = data?.line_chart || [];

    return (
        <div className="space-y-8">
            {/* Gráfico de Barras - Fluxo por Segmento */}
            <Card className="bg-slate-900/50 border-slate-800">
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle className="text-lg text-slate-200">
                            Fluxo por Cliente Segmentado
                        </CardTitle>
                        <CardDescription>
                            Verde = fluxo positivo, Vermelho = fluxo negativo
                        </CardDescription>
                    </div>
                    <div className="flex gap-1 bg-slate-950 p-1 rounded-md border border-slate-800">
                        {['6M', '12M', '24M', '36M', '48M', '60M'].map(w => (
                            <button
                                key={w}
                                onClick={() => setSelectedWindow(w)}
                                className={cn(
                                    "px-3 py-1 text-xs rounded transition-all",
                                    selectedWindow === w
                                        ? "bg-slate-800 text-emerald-400 font-medium"
                                        : "text-slate-500 hover:text-slate-300"
                                )}
                            >
                                {w}
                            </button>
                        ))}
                    </div>
                </CardHeader>
                <CardContent className="h-[400px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={barData} layout="vertical" margin={{ left: 20, right: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                            <XAxis
                                type="number"
                                stroke="#64748b"
                                fontSize={11}
                                tickLine={false}
                                tickFormatter={(v) => formatCurrency(v)}
                            />
                            <YAxis
                                type="category"
                                dataKey="cliente_segmentado"
                                stroke="#64748b"
                                fontSize={11}
                                tickLine={false}
                                width={150}
                            />
                            <Tooltip
                                cursor={{ fill: '#1e293b', opacity: 0.3 }}
                                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f1f5f9' }}
                                formatter={(val: number) => [formatCurrency(val), 'Fluxo']}
                            />
                            <Bar dataKey="flow" radius={[0, 4, 4, 0]} barSize={20}>
                                {barData.map((entry: any, index: number) => (
                                    <Cell key={index} fill={entry.flow >= 0 ? COLORS.positive : COLORS.negative} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

            {/* Gráfico de Linha - Posição Histórica (5 anos) */}
            <Card className="bg-slate-900/50 border-slate-800">
                <CardHeader>
                    <CardTitle className="text-lg text-slate-200">
                        Posição Histórica (5 anos)
                    </CardTitle>
                    <CardDescription>
                        Soma das posições dos peers selecionados
                    </CardDescription>
                </CardHeader>
                <CardContent className="h-[350px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={lineData} margin={{ left: 10, right: 10 }}>
                            <defs>
                                <linearGradient id="colorLine" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                            <XAxis
                                dataKey="date"
                                stroke="#64748b"
                                fontSize={11}
                                tickLine={false}
                                minTickGap={60}
                            />
                            <YAxis
                                stroke="#64748b"
                                fontSize={11}
                                tickLine={false}
                                tickFormatter={(v) => formatCurrency(v)}
                            />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }}
                                formatter={(val: number) => [formatCurrency(val), 'Posição']}
                            />
                            <Line
                                type="monotone"
                                dataKey="value"
                                stroke="#10b981"
                                strokeWidth={2}
                                dot={false}
                                fill="url(#colorLine)"
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>
        </div>
    );
};

// ============================================================================
// TELA 2: PERFORMANCE DA CARTEIRA
// ============================================================================

interface PerformanceTabProps {
    client: string;
    segment: string;
    peers: string[];
}

const PerformanceTab: React.FC<PerformanceTabProps> = ({ client, segment, peers }) => {
    const [selectedMetric, setSelectedMetric] = useState('ret');
    const [selectedWindows, setSelectedWindows] = useState(['6M', '12M', '24M', '36M']);
    const [highlightedFund, setHighlightedFund] = useState<string | null>(null);

    const { data, isLoading } = useQuery({
        queryKey: ['allocators-simple-performance', client, segment, peers, selectedMetric, selectedWindows],
        queryFn: () => AllocatorsSimpleApi.getPerformance(client, segment, peers, selectedMetric, selectedWindows),
        enabled: !!client && !!segment
    });

    const { data: highlightData } = useQuery({
        queryKey: ['allocators-simple-highlight', client, segment, highlightedFund, peers],
        queryFn: () => highlightedFund
            ? AllocatorsSimpleApi.getFundHighlight(client, segment, highlightedFund, peers)
            : null,
        enabled: !!highlightedFund
    });

    // Auto-selecionar o fundo destacado inicial
    useEffect(() => {
        if (data?.default_fund?.cnpj && !highlightedFund) {
            setHighlightedFund(data.default_fund.cnpj);
        }
    }, [data]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="animate-spin text-emerald-500 w-10 h-10" />
            </div>
        );
    }

    const positionData = data?.position_chart || [];
    const metricsCharts = data?.metrics_charts || {};
    const boxplots = data?.boxplots || {};
    const allFunds = data?.all_funds || [];

    const METRIC_LABELS: Record<string, string> = {
        ret: 'Retorno',
        vol: 'Volatilidade',
        mdd: 'Max Drawdown',
        sharpe: 'Sharpe',
        calmar: 'Calmar',
        hit_ratio: 'Hit Ratio',
        info_ratio: 'Info Ratio',
        recovery_time: 'Recovery Time'
    };

    return (
        <div className="space-y-8">
            {/* Gráfico 1: Posição por Fundo */}
            <Card className="bg-slate-900/50 border-slate-800">
                <CardHeader>
                    <CardTitle className="text-lg text-slate-200 flex items-center gap-2">
                        <BarChart3 className="w-5 h-5 text-blue-400" />
                        Posição por Fundo
                    </CardTitle>
                    <CardDescription>
                        Azul escuro = fundos com destaque (KINEA) | Azul claro = demais
                    </CardDescription>
                </CardHeader>
                <CardContent className="h-[400px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={positionData} margin={{ top: 20, right: 30 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                            <XAxis
                                dataKey="name"
                                stroke="#64748b"
                                fontSize={10}
                                tickLine={false}
                                angle={-45}
                                textAnchor="end"
                                height={100}
                                interval={0}
                            />
                            <YAxis
                                stroke="#64748b"
                                fontSize={11}
                                tickLine={false}
                                tickFormatter={(v) => formatValue(v)}
                            />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }}
                                formatter={(val: number, name: string, props: any) => [
                                    formatCurrency(val),
                                    props.payload.name
                                ]}
                            />
                            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                                {positionData.map((entry: any, index: number) => (
                                    <Cell key={index} fill={entry.color} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

            {/* Gráfico 2: Métricas por Janela */}
            <Card className="bg-slate-900/50 border-slate-800">
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle className="text-lg text-slate-200 flex items-center gap-2">
                            <Activity className="w-5 h-5 text-emerald-400" />
                            Métricas por Janela
                        </CardTitle>
                        <CardDescription>
                            Verde = destaque + posição | Roxo = sem posição | Azul = outros
                        </CardDescription>
                    </div>
                    <div className="flex gap-3">
                        <Select value={selectedMetric} onValueChange={setSelectedMetric}>
                            <SelectTrigger className="w-[150px] bg-slate-950 border-slate-700">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-900 border-slate-700">
                                {Object.entries(METRIC_LABELS).map(([key, label]) => (
                                    <SelectItem key={key} value={key}>{label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {selectedWindows.map(window => {
                            const windowData = (metricsCharts[window] || []).slice(0, 15);
                            return (
                                <div key={window} className="bg-slate-950 rounded-lg p-3 border border-slate-800">
                                    <h4 className="text-sm font-medium text-slate-300 mb-3">{window}</h4>
                                    <div className="h-[250px]">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={windowData} layout="vertical">
                                                <XAxis type="number" fontSize={9} tickFormatter={(v) => formatPercent(v)} />
                                                <YAxis type="category" dataKey="name" fontSize={8} width={80} tickLine={false} />
                                                <Tooltip
                                                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', fontSize: 11 }}
                                                    formatter={(val: number) => [formatPercent(val), METRIC_LABELS[selectedMetric]]}
                                                />
                                                <Bar dataKey="value">
                                                    {windowData.map((entry: any, idx: number) => (
                                                        <Cell key={idx} fill={entry.color} />
                                                    ))}
                                                </Bar>
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </CardContent>
            </Card>

            {/* Gráfico 3: Boxplots */}
            <Card className="bg-slate-900/50 border-slate-800">
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle className="text-lg text-slate-200">
                            Distribuição de Métricas (Boxplots)
                        </CardTitle>
                        <CardDescription>
                            Ponto azul = fundo destacado no dropdown
                        </CardDescription>
                    </div>
                    <Select
                        value={highlightedFund || ''}
                        onValueChange={setHighlightedFund}
                    >
                        <SelectTrigger className="w-[300px] bg-slate-950 border-slate-700">
                            <SelectValue placeholder="Selecione um fundo" />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-900 border-slate-700 max-h-[300px]">
                            {allFunds.map((fund: any) => (
                                <SelectItem key={fund.cnpj} value={fund.cnpj}>
                                    {fund.is_highlighted && <span className="text-emerald-400">★ </span>}
                                    {fund.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-3 gap-4">
                        {['ret', 'vol', 'mdd'].map(metric => {
                            const metricData = boxplots[metric] || [];
                            const metricLabel = { ret: 'Retorno', vol: 'Volatilidade', mdd: 'Max Drawdown' }[metric];
                            const metricColor = { ret: '#10b981', vol: '#3b82f6', mdd: '#ef4444' }[metric];

                            return (
                                <div key={metric} className="bg-slate-950 rounded-lg p-4 border border-slate-800">
                                    <h4 className="text-sm font-medium text-slate-300 mb-3 text-center">{metricLabel}</h4>
                                    <BoxPlotChart
                                        data={metricData}
                                        color={metricColor!}
                                        highlightValues={highlightData || {}}
                                        metric={metric}
                                    />
                                </div>
                            );
                        })}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

// BoxPlot Component
interface BoxPlotChartProps {
    data: any[];
    color: string;
    highlightValues: Record<string, any>;
    metric: string;
}

const BoxPlotChart: React.FC<BoxPlotChartProps> = ({ data, color, highlightValues, metric }) => {
    if (!data?.length) {
        return <div className="h-[200px] flex items-center justify-center text-slate-500">Sem dados</div>;
    }

    // Add highlight points to data
    const dataWithHighlight = data.map(d => ({
        ...d,
        highlight: highlightValues[d.window]?.[metric]
    }));

    return (
        <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={dataWithHighlight} margin={{ top: 10, left: 5, right: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                    <XAxis dataKey="window" fontSize={10} stroke="#64748b" />
                    <YAxis fontSize={10} stroke="#64748b" tickFormatter={(v) => `${v.toFixed(1)}%`} />
                    <Tooltip
                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', fontSize: 11 }}
                        content={({ active, payload }) => {
                            if (!active || !payload?.[0]) return null;
                            const d = payload[0].payload;
                            return (
                                <div className="bg-slate-900 border border-slate-700 p-2 rounded text-xs">
                                    <p className="font-bold mb-1">{d.window}</p>
                                    <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                                        <span className="text-slate-400">Max:</span><span>{d.max?.toFixed(2)}%</span>
                                        <span className="text-slate-400">Q3:</span><span>{d.q3?.toFixed(2)}%</span>
                                        <span className="text-slate-400 font-bold">Med:</span><span className="font-bold">{d.median?.toFixed(2)}%</span>
                                        <span className="text-slate-400">Q1:</span><span>{d.q1?.toFixed(2)}%</span>
                                        <span className="text-slate-400">Min:</span><span>{d.min?.toFixed(2)}%</span>
                                        {d.highlight !== null && d.highlight !== undefined && (
                                            <>
                                                <span className="text-blue-400 font-bold border-t border-slate-700 pt-1 mt-1">★ Destaque:</span>
                                                <span className="text-blue-400 font-bold border-t border-slate-700 pt-1 mt-1">{d.highlight?.toFixed(2)}%</span>
                                            </>
                                        )}
                                    </div>
                                </div>
                            );
                        }}
                    />
                    <Bar dataKey="median" shape={<CustomBoxPlotShape color={color} />} />
                </ComposedChart>
            </ResponsiveContainer>
        </div>
    );
};

// Custom BoxPlot Shape
const CustomBoxPlotShape = ({ x, y, width, height, payload, color }: any) => {
    if (!payload || payload.min === undefined) return null;

    const { min, q1, median, q3, max, highlight } = payload;
    const range = max - min || 1;

    const rY = (val: number) => y + height - ((val - min) / range) * height;

    const boxWidth = Math.min(width * 0.4, 20);
    const boxX = x + (width - boxWidth) / 2;
    const midX = x + width / 2;

    return (
        <g>
            {/* Whiskers */}
            <line x1={midX} y1={rY(min)} x2={midX} y2={rY(max)} stroke={color} strokeWidth={1} strokeDasharray="3 3" />
            <line x1={midX - boxWidth / 2} y1={rY(max)} x2={midX + boxWidth / 2} y2={rY(max)} stroke={color} strokeWidth={2} />
            <line x1={midX - boxWidth / 2} y1={rY(min)} x2={midX + boxWidth / 2} y2={rY(min)} stroke={color} strokeWidth={2} />

            {/* Box */}
            <rect x={boxX} y={rY(q3)} width={boxWidth} height={Math.abs(rY(q1) - rY(q3))} fill={color} fillOpacity={0.2} stroke={color} strokeWidth={2} />
            <line x1={boxX} y1={rY(median)} x2={boxX + boxWidth} y2={rY(median)} stroke={color} strokeWidth={2} />

            {/* Highlight Point */}
            {highlight !== null && highlight !== undefined && (
                <circle cx={midX} cy={rY(highlight)} r={5} fill="#3b82f6" stroke="#fff" strokeWidth={2} />
            )}
        </g>
    );
};

// ============================================================================
// TELA 3: CARTEIRA COMPLETA
// ============================================================================

interface PortfolioTabProps {
    client: string;
    segment: string;
}

const PortfolioTab: React.FC<PortfolioTabProps> = ({ client, segment }) => {
    const [viewMode, setViewMode] = useState<'segment' | 'cnpj'>('segment');
    const [searchCnpj, setSearchCnpj] = useState('');
    const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

    const { data, isLoading } = useQuery({
        queryKey: ['allocators-simple-portfolio', viewMode === 'segment' ? client : null, viewMode === 'segment' ? segment : null, viewMode === 'cnpj' ? searchCnpj : null],
        queryFn: () => viewMode === 'segment'
            ? AllocatorsSimpleApi.getPortfolio(client, segment)
            : AllocatorsSimpleApi.getPortfolio(undefined, undefined, searchCnpj),
        enabled: viewMode === 'segment' ? (!!client && !!segment) : searchCnpj.length > 10
    });

    const toggleGroup = (tp_aplic: string) => {
        const newExpanded = new Set(expandedGroups);
        if (newExpanded.has(tp_aplic)) {
            newExpanded.delete(tp_aplic);
        } else {
            newExpanded.add(tp_aplic);
        }
        setExpandedGroups(newExpanded);
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="animate-spin text-emerald-500 w-10 h-10" />
            </div>
        );
    }

    const donutData = data?.donut_chart?.children || [];
    const tableData = data?.table_data || [];
    const totalValue = data?.total_value || 0;

    // Transform donut data for Recharts
    const pieData = donutData.map((item: any, i: number) => ({
        name: item.name,
        value: item.value,
        percentage: item.percentage,
        fill: [
            '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
            '#ec4899', '#14b8a6', '#f97316', '#6366f1'
        ][i % 9]
    }));

    return (
        <div className="space-y-8">
            {/* Seletor de modo */}
            <Card className="bg-slate-900/50 border-slate-800">
                <CardContent className="py-4">
                    <div className="flex gap-4 items-center">
                        <div className="flex gap-2">
                            <Button
                                variant={viewMode === 'segment' ? 'default' : 'outline'}
                                onClick={() => setViewMode('segment')}
                                size="sm"
                            >
                                Por Cliente Segmentado
                            </Button>
                            <Button
                                variant={viewMode === 'cnpj' ? 'default' : 'outline'}
                                onClick={() => setViewMode('cnpj')}
                                size="sm"
                            >
                                Por CNPJ/Nome
                            </Button>
                        </div>
                        {viewMode === 'cnpj' && (
                            <Input
                                placeholder="Digite CNPJ ou nome do fundo"
                                value={searchCnpj}
                                onChange={(e) => setSearchCnpj(e.target.value)}
                                className="w-[300px] bg-slate-950 border-slate-700"
                            />
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Donut Chart */}
            <Card className="bg-slate-900/50 border-slate-800">
                <CardHeader>
                    <CardTitle className="text-lg text-slate-200 flex items-center gap-2">
                        <PieChartIcon className="w-5 h-5 text-purple-400" />
                        Composição da Carteira
                    </CardTitle>
                    <CardDescription>
                        Total: {formatCurrency(totalValue)}
                    </CardDescription>
                </CardHeader>
                <CardContent className="h-[400px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={pieData}
                                cx="50%"
                                cy="50%"
                                innerRadius={80}
                                outerRadius={150}
                                paddingAngle={2}
                                dataKey="value"
                                label={({ name, percentage }) => `${name}: ${percentage?.toFixed(1)}%`}
                                labelLine={{ stroke: '#64748b' }}
                            >
                                {pieData.map((entry: any, index: number) => (
                                    <Cell key={index} fill={entry.fill} />
                                ))}
                            </Pie>
                            <Tooltip
                                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }}
                                formatter={(val: number) => formatCurrency(val)}
                            />
                            <Legend
                                verticalAlign="bottom"
                                height={36}
                                formatter={(value) => <span className="text-slate-300 text-sm">{value}</span>}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

            {/* Tabela Expandível */}
            <Card className="bg-slate-900/50 border-slate-800">
                <CardHeader>
                    <CardTitle className="text-lg text-slate-200">
                        Detalhamento por Tipo de Aplicação
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow className="border-slate-800 hover:bg-transparent">
                                <TableHead className="text-slate-400 w-10"></TableHead>
                                <TableHead className="text-slate-400">Classe / Ativo</TableHead>
                                <TableHead className="text-slate-400">Código</TableHead>
                                <TableHead className="text-slate-400">Tipo Código</TableHead>
                                <TableHead className="text-right text-slate-400">Valor</TableHead>
                                <TableHead className="text-right text-slate-400">%</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {tableData.map((group: any) => (
                                <React.Fragment key={group.tp_aplic}>
                                    {/* Linha do grupo */}
                                    <TableRow
                                        className="border-slate-800 hover:bg-slate-800/30 cursor-pointer"
                                        onClick={() => toggleGroup(group.tp_aplic)}
                                    >
                                        <TableCell className="p-2">
                                            {expandedGroups.has(group.tp_aplic)
                                                ? <ChevronDown className="w-4 h-4 text-slate-500" />
                                                : <ChevronRight className="w-4 h-4 text-slate-500" />
                                            }
                                        </TableCell>
                                        <TableCell className="font-medium text-slate-200">
                                            {group.tp_aplic}
                                            <span className="text-slate-500 text-xs ml-2">({group.count} ativos)</span>
                                        </TableCell>
                                        <TableCell></TableCell>
                                        <TableCell></TableCell>
                                        <TableCell className="text-right font-mono text-slate-300">
                                            {formatCurrency(group.total_value)}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <span className="font-bold text-emerald-400">{group.percentage?.toFixed(2)}%</span>
                                        </TableCell>
                                    </TableRow>

                                    {/* Linhas de itens (expandidas) */}
                                    {expandedGroups.has(group.tp_aplic) && group.items?.map((item: any, idx: number) => (
                                        <TableRow key={idx} className="border-slate-800 hover:bg-slate-800/20 bg-slate-950/30">
                                            <TableCell></TableCell>
                                            <TableCell className="text-slate-400 pl-8 text-sm">{item.nm_ativo}</TableCell>
                                            <TableCell className="text-slate-500 text-xs">{item.cd_ativo}</TableCell>
                                            <TableCell className="text-slate-500 text-xs">{item.tp_cd_ativo}</TableCell>
                                            <TableCell className="text-right font-mono text-slate-400 text-sm">
                                                {formatCurrency(item.vl_merc_pos_final)}
                                            </TableCell>
                                            <TableCell className="text-right text-slate-400 text-sm">
                                                {item.percentage?.toFixed(2)}%
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </React.Fragment>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
};

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

const AllocatorsSimplified: React.FC = () => {
    const [selectedClient, setSelectedClient] = useState('');
    const [selectedSegment, setSelectedSegment] = useState('');
    const [selectedPeers, setSelectedPeers] = useState<string[]>([]);
    const [activeTab, setActiveTab] = useState('fluxo');

    // Carregar filtros
    const { data: filtersData, isLoading: loadingFilters } = useQuery({
        queryKey: ['allocators-simple-filters'],
        queryFn: AllocatorsSimpleApi.getFilters
    });

    // Segmentos disponíveis para o cliente selecionado
    const availableSegments = useMemo(() => {
        if (!filtersData || !selectedClient) return [];
        return filtersData.segments_by_client?.[selectedClient] || [];
    }, [filtersData, selectedClient]);

    // Auto-selecionar primeiro cliente
    useEffect(() => {
        if (filtersData?.clients?.length && !selectedClient) {
            setSelectedClient(filtersData.clients[0]);
        }
    }, [filtersData, selectedClient]);

    // Auto-selecionar primeiro segmento quando cliente muda
    useEffect(() => {
        if (availableSegments.length && !availableSegments.includes(selectedSegment)) {
            setSelectedSegment(availableSegments[0]);
        }
    }, [availableSegments, selectedSegment]);

    if (loadingFilters) {
        return (
            <div className="flex h-screen items-center justify-center bg-[#0F172A]">
                <Loader2 className="animate-spin text-emerald-500 w-10 h-10" />
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-[#0F172A] text-slate-100 p-6 overflow-hidden">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 shrink-0">
                <div>
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent flex items-center gap-2">
                        <Wallet className="w-8 h-8 text-purple-500" />
                        Alocadores - Simplificado
                    </h1>
                    <p className="text-slate-500 text-sm mt-1">
                        Dashboard otimizado com cache JSON pré-computado
                    </p>
                </div>

                <div className="flex items-center gap-3 bg-slate-900/80 p-2 rounded-lg border border-slate-800 shadow-xl">
                    {/* Cliente */}
                    <Select value={selectedClient} onValueChange={setSelectedClient}>
                        <SelectTrigger className="w-[160px] bg-slate-950 border-slate-700 h-9 font-medium text-purple-400">
                            <SelectValue placeholder="Cliente" />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-900 border-slate-700">
                            {filtersData?.clients?.map((c: string) => (
                                <SelectItem key={c} value={c}>{c}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    {/* Segmento */}
                    <Select value={selectedSegment} onValueChange={setSelectedSegment}>
                        <SelectTrigger className="w-[180px] bg-slate-950 border-slate-700 h-9">
                            <SelectValue placeholder="Segmento" />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-900 border-slate-700">
                            {availableSegments.map((s: string) => (
                                <SelectItem key={s} value={s}>{s}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    {/* Peers (Multi-select simple) */}
                    <Select
                        value={selectedPeers.join(',') || 'all'}
                        onValueChange={(v) => setSelectedPeers(v === 'all' ? [] : [v])}
                    >
                        <SelectTrigger className="w-[150px] bg-slate-950 border-slate-700 h-9">
                            <SelectValue placeholder="Peers" />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-900 border-slate-700">
                            <SelectItem value="all">Todos Peers</SelectItem>
                            {filtersData?.peers?.map((p: string) => (
                                <SelectItem key={p} value={p}>{p}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <TabsList className="bg-transparent p-0 w-fit">
                        <TabsTrigger
                            value="fluxo"
                            className="rounded-none border-b-2 border-transparent data-[state=active]:border-emerald-500 data-[state=active]:bg-transparent data-[state=active]:text-emerald-400 px-6"
                        >
                            <TrendingUp className="w-4 h-4 mr-2" />
                            Fluxo do Cliente
                        </TabsTrigger>
                        <TabsTrigger
                            value="performance"
                            className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:bg-transparent data-[state=active]:text-blue-400 px-6"
                        >
                            <Activity className="w-4 h-4 mr-2" />
                            Performance
                        </TabsTrigger>
                        <TabsTrigger
                            value="carteira"
                            className="rounded-none border-b-2 border-transparent data-[state=active]:border-purple-500 data-[state=active]:bg-transparent data-[state=active]:text-purple-400 px-6"
                        >
                            <PieChartIcon className="w-4 h-4 mr-2" />
                            Carteira Completa
                        </TabsTrigger>
                    </TabsList>
                </div>

                <ScrollArea className="flex-1 -mr-4 pr-4">
                    <TabsContent value="fluxo" className="mt-0 pb-10">
                        <FlowTab client={selectedClient} peers={selectedPeers} />
                    </TabsContent>

                    <TabsContent value="performance" className="mt-0 pb-10">
                        <PerformanceTab
                            client={selectedClient}
                            segment={selectedSegment}
                            peers={selectedPeers}
                        />
                    </TabsContent>

                    <TabsContent value="carteira" className="mt-0 pb-10">
                        <PortfolioTab client={selectedClient} segment={selectedSegment} />
                    </TabsContent>
                </ScrollArea>
            </Tabs>
        </div>
    );
};

export default AllocatorsSimplified;
