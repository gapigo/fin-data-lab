
import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
    LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    ComposedChart, ScatterChart, Scatter, Cell, PieChart, Pie, AreaChart, Area
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { Activity, TrendingUp, PieChart as PieChartIcon, Wallet, Loader2, ChevronDown } from 'lucide-react';
import { FundingService } from '@/services/api';

const WINDOWS = [6, 12, 24, 36, 48, 60];
const COLORS = ['#10b981', '#059669', '#3b82f6', '#f59e0b', '#8b5cf6', '#ef4444', '#ec4899', '#14b8a6', '#f97316', '#6366f1'];

// Helper to format currency
const formatCurrency = (val: number) => {
    if (Math.abs(val) >= 1e9) return `R$ ${(val / 1e9).toFixed(1)}B`;
    if (Math.abs(val) >= 1e6) return `R$ ${(val / 1e6).toFixed(1)}M`;
    if (Math.abs(val) >= 1e3) return `R$ ${(val / 1e3).toFixed(0)}K`;
    return `R$ ${val.toFixed(0)}`;
};

// ============================================================================
// 1. FLUXO E POSIÇÃO TAB
// ============================================================================
const FlowPositionTab = ({ data, window, setWindow }: any) => {
    const lineData = data?.evolution || [];
    const barData = data?.flow_distribution || [];

    return (
        <div className="space-y-6 animate-in fade-in">
            <div className="grid grid-cols-1 gap-6">
                {/* Gráfico 1: Posição Mês a Mês */}
                <Card className="bg-slate-900/50 border-slate-800">
                    <CardHeader>
                        <CardTitle className="text-lg text-slate-200">Evolução Patrimonial</CardTitle>
                        <CardDescription>Soma de posição (vl_merc_pos_final)</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={lineData}>
                                <defs>
                                    <linearGradient id="colorPl" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                                <XAxis dataKey="month" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => formatCurrency(v)} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#f1f5f9' }}
                                    formatter={(val: number) => [formatCurrency(val), 'PL']}
                                />
                                <Area type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorPl)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* Gráfico 2: Segmentação de Clientes (Fluxo) */}
                <Card className="bg-slate-900/50 border-slate-800">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <div>
                            <CardTitle className="text-lg text-slate-200">Fluxo por Segmento ({window} Meses)</CardTitle>
                            <CardDescription>Captação líquida segmentada</CardDescription>
                        </div>
                        <div className="flex gap-1 bg-slate-950 p-1 rounded-md border border-slate-800">
                            {WINDOWS.map(w => (
                                <button
                                    key={w}
                                    onClick={() => setWindow(w)}
                                    className={cn(
                                        "px-3 py-1 text-xs rounded transition-all",
                                        window === w ? "bg-slate-800 text-blue-400 font-medium shadow-sm" : "text-slate-500 hover:text-slate-300"
                                    )}
                                >
                                    {w}M
                                </button>
                            ))}
                        </div>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={barData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                                <XAxis dataKey="client" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} interval={0} angle={-15} textAnchor="end" height={60} />
                                <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => formatCurrency(v)} />
                                <Tooltip
                                    cursor={{ fill: '#1e293b', opacity: 0.4 }}
                                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#f1f5f9' }}
                                    formatter={(val: number) => [formatCurrency(val), 'Fluxo']}
                                />
                                <Bar dataKey="flow" radius={[4, 4, 0, 0]}>
                                    {barData.map((entry: any, index: number) => (
                                        <Cell key={`cell-${index}`} fill={entry.flow > 0 ? '#10b981' : '#ef4444'} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

// ============================================================================
// 2. PERFORMANCE CARTEIRA TAB
// ============================================================================
const PerformanceTab = ({ data }: any) => {
    const [metricType, setMetricType] = useState<'retorno' | 'vol' | 'max_dd'>('retorno');

    const flowByWindow = data?.flow_by_window || [];
    const metricsRet = data?.metrics_ret || [];
    const metricsVol = data?.metrics_vol || [];
    const metricsDd = data?.metrics_dd || [];
    const scatterData = data?.scatter_12m || [];
    const perfTable = data?.performance_table || [];

    const currentMetrics = metricType === 'retorno' ? metricsRet :
        metricType === 'vol' ? metricsVol : metricsDd;

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'green': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
            case 'yellow': return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
            case 'red': return 'bg-red-500/20 text-red-400 border-red-500/30';
            default: return 'bg-slate-700/30 text-slate-500 border-slate-600/30';
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in">
            {/* Row 1: Flow by Window */}
            <Card className="bg-slate-900/50 border-slate-800">
                <CardHeader>
                    <CardTitle className="text-lg text-slate-200">Fluxo por Janela</CardTitle>
                    <CardDescription>Fluxo acumulado em cada janela temporal</CardDescription>
                </CardHeader>
                <CardContent className="h-[180px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={flowByWindow} layout="horizontal">
                            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                            <XAxis dataKey="window" stroke="#64748b" fontSize={12} />
                            <YAxis stroke="#64748b" fontSize={10} tickFormatter={(v) => formatCurrency(v)} />
                            <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b' }} formatter={(v: number) => formatCurrency(v)} />
                            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                                {flowByWindow.map((entry: any, idx: number) => (
                                    <Cell key={idx} fill={entry.value >= 0 ? '#10b981' : '#ef4444'} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

            {/* Row 2: Metrics Box Plots */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                    { key: 'retorno', label: 'Retorno', data: metricsRet, color: '#10b981' },
                    { key: 'vol', label: 'Volatilidade', data: metricsVol, color: '#3b82f6' },
                    { key: 'max_dd', label: 'Max Drawdown', data: metricsDd, color: '#ef4444' }
                ].map(m => (
                    <Card key={m.key} className="bg-slate-900/50 border-slate-800">
                        <CardHeader className="py-3">
                            <CardTitle className="text-sm font-medium text-slate-400 uppercase tracking-wider">{m.label}</CardTitle>
                        </CardHeader>
                        <CardContent className="h-[150px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={m.data}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                                    <XAxis dataKey="window" stroke="#64748b" fontSize={10} />
                                    <YAxis stroke="#64748b" fontSize={10} tickFormatter={(v) => `${v.toFixed(1)}%`} />
                                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b' }} />
                                    <Bar dataKey="median" fill={m.color} radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Row 3: Scatter Plot */}
            <Card className="bg-slate-900/50 border-slate-800">
                <CardHeader>
                    <CardTitle className="text-lg text-slate-200">Risco x Retorno (12M)</CardTitle>
                    <CardDescription>Volatilidade vs Retorno dos fundos</CardDescription>
                </CardHeader>
                <CardContent className="h-[350px]">
                    <ResponsiveContainer width="100%" height="100%">
                        {scatterData.length > 0 ? (
                            <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                                <XAxis type="number" dataKey="x" name="Volatilidade" stroke="#64748b" unit="%" label={{ value: 'Vol 12M (%)', position: 'bottom', fill: '#64748b' }} />
                                <YAxis type="number" dataKey="y" name="Retorno" stroke="#64748b" unit="%" label={{ value: 'Ret 12M (%)', angle: -90, position: 'insideLeft', fill: '#64748b' }} />
                                <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#f1f5f9' }} />
                                <Scatter name="Fundos" data={scatterData} fill="#8884d8">
                                    {scatterData.map((entry: any, index: number) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Scatter>
                            </ScatterChart>
                        ) : (
                            <div className="flex items-center justify-center h-full text-slate-500">
                                Sem dados de performance para os filtros selecionados
                            </div>
                        )}
                    </ResponsiveContainer>
                </CardContent>
            </Card>

            {/* Row 4: Performance Absoluta Table */}
            <Card className="bg-slate-900/50 border-slate-800">
                <CardHeader>
                    <CardTitle className="text-lg text-slate-200">Performance Absoluta</CardTitle>
                    <CardDescription>
                        <span className="inline-flex items-center gap-2 text-xs">
                            <span className="w-3 h-3 rounded-full bg-emerald-500"></span> Bate Meta
                            <span className="w-3 h-3 rounded-full bg-amber-500 ml-2"></span> Bate Bench
                            <span className="w-3 h-3 rounded-full bg-red-500 ml-2"></span> Abaixo
                        </span>
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <ScrollArea className="h-[300px]">
                        <Table>
                            <TableHeader>
                                <TableRow className="border-slate-800">
                                    <TableHead className="text-slate-400">Fundo</TableHead>
                                    <TableHead className="text-slate-400 text-center">6M</TableHead>
                                    <TableHead className="text-slate-400 text-center">12M</TableHead>
                                    <TableHead className="text-slate-400 text-center">24M</TableHead>
                                    <TableHead className="text-slate-400 text-center">36M</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {perfTable.map((row: any, idx: number) => (
                                    <TableRow key={idx} className="border-slate-800/50 hover:bg-slate-800/30">
                                        <TableCell className="font-medium text-slate-200 max-w-[200px] truncate">{row.name}</TableCell>
                                        {['6M', '12M', '24M', '36M'].map(w => (
                                            <TableCell key={w} className="text-center">
                                                {row[w]?.value !== null ? (
                                                    <span className={cn("px-2 py-1 rounded-md text-xs font-mono border", getStatusColor(row[w]?.status))}>
                                                        {row[w]?.value?.toFixed(1)}%
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-600">—</span>
                                                )}
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                ))}
                                {perfTable.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center text-slate-500 py-8">
                                            Sem dados de performance disponíveis
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </ScrollArea>
                </CardContent>
            </Card>
        </div>
    );
};

// ============================================================================
// 3. ALOCAÇÃO CARTEIRA TAB
// ============================================================================
const AllocationTab = ({ data }: any) => {
    const flowByWindow = data?.flow_by_window || [];
    const evolution = data?.evolution || [];
    const gestores = data?.gestores || [];
    const movementDiff = data?.movement_diff || [];
    const snapshot = data?.snapshot || [];
    const pieData = data?.pie_data || [];

    return (
        <div className="space-y-6 animate-in fade-in">
            {/* Row 1: Flow by Window */}
            <Card className="bg-slate-900/50 border-slate-800">
                <CardHeader>
                    <CardTitle className="text-lg text-slate-200">Fluxo por Janela</CardTitle>
                </CardHeader>
                <CardContent className="h-[150px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={flowByWindow}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                            <XAxis dataKey="window" stroke="#64748b" fontSize={12} />
                            <YAxis stroke="#64748b" fontSize={10} tickFormatter={(v) => formatCurrency(v)} />
                            <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b' }} formatter={(v: number) => formatCurrency(v)} />
                            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                                {flowByWindow.map((entry: any, idx: number) => (
                                    <Cell key={idx} fill={entry.value >= 0 ? '#10b981' : '#ef4444'} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

            {/* Row 2: Evolution by Gestor (Stacked Bar) */}
            <Card className="bg-slate-900/50 border-slate-800">
                <CardHeader>
                    <CardTitle className="text-lg text-slate-200">Evolução Mensal por Gestor</CardTitle>
                    <CardDescription>Composição patrimonial ao longo do tempo</CardDescription>
                </CardHeader>
                <CardContent className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={evolution}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                            <XAxis dataKey="month" stroke="#64748b" fontSize={10} tickLine={false} />
                            <YAxis stroke="#64748b" fontSize={10} tickFormatter={(v) => formatCurrency(v)} />
                            <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b' }} formatter={(v: number) => formatCurrency(v)} />
                            <Legend wrapperStyle={{ fontSize: '10px' }} />
                            {gestores.slice(0, 8).map((g: string, idx: number) => (
                                <Bar key={g} dataKey={g} stackId="a" fill={COLORS[idx % COLORS.length]} />
                            ))}
                        </BarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

            {/* Row 3: Movement Difference */}
            <Card className="bg-slate-900/50 border-slate-800">
                <CardHeader>
                    <CardTitle className="text-lg text-slate-200">Variação Mensal</CardTitle>
                    <CardDescription>Diferença de posição mês a mês</CardDescription>
                </CardHeader>
                <CardContent className="h-[150px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={movementDiff}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                            <XAxis dataKey="month" stroke="#64748b" fontSize={10} />
                            <YAxis stroke="#64748b" fontSize={10} tickFormatter={(v) => formatCurrency(v)} />
                            <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b' }} formatter={(v: number) => formatCurrency(v)} />
                            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                                {movementDiff.map((entry: any, idx: number) => (
                                    <Cell key={idx} fill={entry.value >= 0 ? '#10b981' : '#ef4444'} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

            {/* Row 4: Snapshot + Pie Chart */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Lista de Fundos Detalhada */}
                <Card className="bg-slate-900/50 border-slate-800 flex flex-col">
                    <CardHeader>
                        <CardTitle className="text-lg text-slate-200">Foto da Carteira (Top 20)</CardTitle>
                        <CardDescription>Posição atual alocada</CardDescription>
                    </CardHeader>
                    <ScrollArea className="flex-1 max-h-[400px]">
                        <div className="p-4 space-y-3">
                            {snapshot.map((fund: any, idx: number) => (
                                <div key={idx} className="flex items-center gap-4 p-3 rounded-lg bg-slate-950/50 border border-slate-800 hover:border-slate-700 transition-colors">
                                    <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs shadow-lg shrink-0"
                                        style={{ backgroundColor: `${COLORS[idx % COLORS.length]}20`, color: COLORS[idx % COLORS.length], border: `1px solid ${COLORS[idx % COLORS.length]}` }}>
                                        {fund.symbol}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-semibold text-slate-200 truncate" title={fund.name}>{fund.name}</p>
                                        <p className="text-xs text-slate-500 truncate">{fund.desc} • {formatCurrency(fund.pl)}</p>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <p className="font-mono text-emerald-400 font-medium">{fund.value}%</p>
                                    </div>
                                </div>
                            ))}
                            {snapshot.length === 0 && (
                                <div className="text-center text-slate-500 py-8">Sem dados de carteira</div>
                            )}
                        </div>
                    </ScrollArea>
                </Card>

                {/* Pie Chart */}
                <Card className="bg-slate-900/50 border-slate-800 flex flex-col items-center justify-center p-6">
                    {pieData.length > 0 ? (
                        <>
                            <ResponsiveContainer width="100%" height={280}>
                                <PieChart>
                                    <Pie
                                        data={pieData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={70}
                                        outerRadius={110}
                                        paddingAngle={2}
                                        dataKey="value"
                                        nameKey="name"
                                    >
                                        {pieData.map((entry: any, index: number) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="rgba(0,0,0,0.5)" strokeWidth={1} />
                                        ))}
                                    </Pie>
                                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#f1f5f9' }} formatter={(v: number) => `${v.toFixed(1)}%`} />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="text-center mt-2">
                                <p className="text-3xl font-bold text-slate-200">100%</p>
                                <p className="text-sm text-slate-500 uppercase tracking-widest">Alocado</p>
                            </div>
                        </>
                    ) : (
                        <div className="text-slate-500 flex flex-col items-center">
                            <PieChartIcon className="w-12 h-12 mb-2 opacity-20" />
                            <p>Sem dados de alocação</p>
                        </div>
                    )}
                </Card>
            </div>
        </div>
    );
};

// ============================================================================
// MAIN ALLOCATORS COMPONENT
// ============================================================================
const Allocators = () => {
    // Shared State
    const [selectedClient, setSelectedClient] = useState('');
    const [selectedPeer, setSelectedPeer] = useState('all');
    const [selectedSegment, setSelectedSegment] = useState('all');
    const [activeTab, setActiveTab] = useState('fluxo');
    const [flowWindow, setFlowWindow] = useState(12);

    // Queries
    const { data: filtersData, isLoading: isLoadingFilters } = useQuery({
        queryKey: ['allocator-filters'],
        queryFn: () => FundingService.getAllocatorFilters(),
        staleTime: 1000 * 60 * 60 // 1h
    });

    // Available segments for selected client
    const availableSegments = useMemo(() => {
        if (!filtersData || !selectedClient) return [];
        return filtersData.segments_by_client?.[selectedClient] || [];
    }, [filtersData, selectedClient]);

    // Auto-select first client
    React.useEffect(() => {
        if (filtersData && !selectedClient && filtersData.clients.length > 0) {
            setSelectedClient(filtersData.clients[0]);
        }
    }, [filtersData, selectedClient]);

    // Reset segment when client changes
    React.useEffect(() => {
        setSelectedSegment('all');
    }, [selectedClient]);

    // Data Queries
    const { data: flowData, isLoading: isLoadingFlow } = useQuery({
        queryKey: ['allocator-flow', selectedClient, selectedSegment, selectedPeer, flowWindow],
        queryFn: () => FundingService.getAllocatorFlow(selectedClient || undefined, selectedSegment || undefined, selectedPeer, flowWindow),
        enabled: !!selectedClient
    });

    const { data: perfData, isLoading: isLoadingPerf } = useQuery({
        queryKey: ['allocator-perf', selectedClient, selectedSegment, selectedPeer],
        queryFn: () => FundingService.getAllocatorPerformance(selectedClient || undefined, selectedSegment || undefined, selectedPeer),
        enabled: !!selectedClient
    });

    const { data: allocData, isLoading: isLoadingAlloc } = useQuery({
        queryKey: ['allocator-alloc', selectedClient, selectedSegment, selectedPeer],
        queryFn: () => FundingService.getAllocatorAllocation(selectedClient || undefined, selectedSegment || undefined, selectedPeer),
        enabled: !!selectedClient
    });

    if (isLoadingFilters) {
        return <div className="flex h-screen items-center justify-center bg-[#0F172A]"><Loader2 className="animate-spin text-emerald-500" /></div>;
    }

    return (
        <div className="flex flex-col h-full bg-[#0F172A] text-slate-100 p-6 overflow-hidden">
            {/* Header Global */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent flex items-center gap-2">
                        <Wallet className="w-8 h-8 text-emerald-500" />
                        Alocadores
                    </h1>
                    <p className="text-sm text-slate-400">Análise integrada de patrimônio, fluxo e performance</p>
                </div>

                <div className="flex items-center gap-3 bg-slate-900/80 p-2 rounded-lg border border-slate-800 shadow-xl">
                    <Select value={selectedClient} onValueChange={setSelectedClient}>
                        <SelectTrigger className="w-[180px] bg-slate-950 border-slate-700 h-9">
                            <SelectValue placeholder="Cliente" />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-900 border-slate-700 max-h-[300px]">
                            {filtersData?.clients.map((c: string) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                        </SelectContent>
                    </Select>

                    <Select value={selectedPeer} onValueChange={setSelectedPeer}>
                        <SelectTrigger className="w-[180px] bg-slate-950 border-slate-700 h-9">
                            <SelectValue placeholder="Peer Ativo" />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-900 border-slate-700 max-h-[300px]">
                            <SelectItem value="all">Todos Peers</SelectItem>
                            {filtersData?.peers.map((p: string) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                        </SelectContent>
                    </Select>

                    <Select value={selectedSegment} onValueChange={setSelectedSegment}>
                        <SelectTrigger className="w-[220px] bg-slate-950 border-slate-700 h-9">
                            <SelectValue placeholder="Segmento" />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-900 border-slate-700 max-h-[300px]">
                            <SelectItem value="all">Todos Segmentos</SelectItem>
                            {availableSegments.map((s: string) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0 space-y-4">
                <TabsList className="bg-slate-900 p-1 w-fit border border-slate-800">
                    <TabsTrigger value="fluxo" className="data-[state=active]:bg-emerald-600/20 data-[state=active]:text-emerald-400 border-transparent">
                        <Activity className="w-4 h-4 mr-2" />Fluxo e Posição
                    </TabsTrigger>
                    <TabsTrigger value="performance" className="data-[state=active]:bg-blue-600/20 data-[state=active]:text-blue-400 border-transparent">
                        <TrendingUp className="w-4 h-4 mr-2" />Performance Carteira
                    </TabsTrigger>
                    <TabsTrigger value="alocacao" className="data-[state=active]:bg-purple-600/20 data-[state=active]:text-purple-400 border-transparent">
                        <PieChartIcon className="w-4 h-4 mr-2" />Alocação Carteira
                    </TabsTrigger>
                </TabsList>

                <ScrollArea className="flex-1 pr-4">
                    <TabsContent value="fluxo" className="mt-0">
                        {isLoadingFlow ? <div className="h-64 flex items-center justify-center"><Loader2 className="animate-spin" /></div> :
                            <FlowPositionTab data={flowData} window={flowWindow} setWindow={setFlowWindow} />
                        }
                    </TabsContent>

                    <TabsContent value="performance" className="mt-0">
                        {isLoadingPerf ? <div className="h-64 flex items-center justify-center"><Loader2 className="animate-spin" /></div> :
                            <PerformanceTab data={perfData} />
                        }
                    </TabsContent>

                    <TabsContent value="alocacao" className="mt-0">
                        {isLoadingAlloc ? <div className="h-64 flex items-center justify-center"><Loader2 className="animate-spin" /></div> :
                            <AllocationTab data={allocData} />
                        }
                    </TabsContent>
                </ScrollArea>
            </Tabs>
        </div>
    );
};

export default Allocators;
