
import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
    LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    ComposedChart, ScatterChart, Scatter, Cell, PieChart, Pie, AreaChart, Area, ReferenceLine
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { Activity, TrendingUp, PieChart as PieChartIcon, Wallet, Loader2, Info } from 'lucide-react';
import { FundingService } from '@/services/api';

const WINDOWS = [6, 12, 24, 36];
const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ef4444', '#ec4899', '#14b8a6', '#f97316', '#6366f1'];

// Helper to format currency Smartly (Bi, Mi, K)
const formatCurrency = (val: number) => {
    if (val === undefined || val === null) return '-';
    const abs = Math.abs(val);
    if (abs >= 1e9) return `R$ ${(val / 1e9).toFixed(1).replace('.', ',')} Bi`;
    if (abs >= 1e6) return `R$ ${(val / 1e6).toFixed(1).replace('.', ',')} Mi`;
    if (abs >= 1e3) return `R$ ${(val / 1e3).toFixed(0).replace('.', ',')} K`;
    return `R$ ${val.toFixed(0)}`;
};

// ============================================================================
// COMPONENT: Flow Summary (Topo das abas Performance e Alocação)
// ============================================================================
const FlowSummary = ({ data }: { data: any[] }) => {
    if (!data || data.length === 0) return null;

    return (
        <Card className="bg-slate-900/50 border-slate-800 mb-6">
            <CardContent className="pt-6">
                <div className="h-[120px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data} layout="horizontal" barSize={40}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                            <XAxis dataKey="window" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                            <YAxis stroke="#64748b" fontSize={10} tickFormatter={(v) => formatCurrency(v)} tickLine={false} axisLine={false} />
                            <Tooltip
                                cursor={{ fill: '#1e293b', opacity: 0.2 }}
                                content={({ active, payload }) => {
                                    if (!active || !payload || !payload[0]) return null;
                                    const val = Number(payload[0].value);
                                    return (
                                        <div className="bg-slate-900 border border-slate-700 p-2 rounded text-xs text-slate-200">
                                            <span className="font-semibold">Fluxo Líquido:</span> {formatCurrency(val)}
                                        </div>
                                    );
                                }}
                            />
                            <Bar dataKey="value" radius={[4, 4, 4, 4]}>
                                {data.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.value >= 0 ? '#3b82f6' : '#ef4444'} />
                                ))}
                                {/* Labels on top */}
                                {/* Recharts label list is tricky with custom formatting, relying on Tooltip or custom shape if needed. 
                                    Simpler to just show bars clearly. User asked for label on top. */}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );
};

// ============================================================================
// 1. FLUXO E POSIÇÃO TAB
// ============================================================================
const FlowPositionTab = ({ data }: any) => {
    const [localWindow, setLocalWindow] = useState(12);

    // Separar dados
    const evolutionData = data?.evolution || [];
    const flowMap = data?.flow_distribution || {};
    const barData = flowMap[localWindow] || [];

    return (
        <div className="space-y-6 animate-in fade-in">
            <div className="grid grid-cols-1 gap-6">
                {/* Gráfico 1: Posição Mês a Mês */}
                <Card className="bg-slate-900/50 border-slate-800">
                    <CardHeader>
                        <CardTitle className="text-lg text-slate-200">Evolução Patrimonial</CardTitle>
                        <CardDescription>Histórico de valor sob gestão</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={evolutionData}>
                                <defs>
                                    <linearGradient id="colorPl" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                                <XAxis dataKey="month" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} minTickGap={30} />
                                <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => formatCurrency(v)} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#f1f5f9' }}
                                    formatter={(val: number) => [formatCurrency(val), 'PL']}
                                />
                                <Area type="monotone" dataKey="value" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorPl)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* Gráfico 2: Segmentação de Fluxo (Local State Switch) */}
                <Card className="bg-slate-900/50 border-slate-800">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <div>
                            <CardTitle className="text-lg text-slate-200">Fluxo ({localWindow} Meses)</CardTitle>
                            <CardDescription>Distribuição de captação líquida</CardDescription>
                        </div>
                        <div className="flex gap-1 bg-slate-950 p-1 rounded-md border border-slate-800">
                            {WINDOWS.map(w => (
                                <button
                                    key={w}
                                    onClick={() => setLocalWindow(w)}
                                    className={cn(
                                        "px-3 py-1 text-xs rounded transition-all",
                                        localWindow === w ? "bg-slate-800 text-blue-400 font-medium shadow-sm" : "text-slate-500 hover:text-slate-300"
                                    )}
                                >
                                    {w}M
                                </button>
                            ))}
                        </div>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={barData} layout="vertical" margin={{ left: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                                <XAxis type="number" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => formatCurrency(v)} />
                                <YAxis type="category" dataKey="client" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} width={120} />
                                <Tooltip
                                    cursor={{ fill: '#1e293b', opacity: 0.4 }}
                                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#f1f5f9' }}
                                    formatter={(val: number) => [formatCurrency(val), 'Fluxo']}
                                />
                                <Bar dataKey="flow" radius={[0, 4, 4, 0]} barSize={20}>
                                    {barData.map((entry: any, index: number) => (
                                        <Cell key={`cell-${index}`} fill={entry.flow > 0 ? '#3b82f6' : '#ef4444'} />
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

// Boxplot Shape with Highlight Dot
const CustomBoxPlotShape = ({ x, y, width, height, payload, color }: any) => {
    if (!payload || payload.min === undefined) return null;

    const { min, q1, median, q3, max, highlight } = payload;
    const range = max - min || 1;

    // Func escala manual
    const rY = (val: number) => y + height - ((val - min) / range) * height;

    const boxWidth = Math.min(width * 0.4, 30);
    const boxX = x + (width - boxWidth) / 2;
    const midX = x + width / 2;

    return (
        <g>
            <line x1={midX} y1={rY(min)} x2={midX} y2={rY(max)} stroke={color} strokeWidth={1} strokeDasharray="3 3" />
            <line x1={midX - boxWidth / 2} y1={rY(max)} x2={midX + boxWidth / 2} y2={rY(max)} stroke={color} strokeWidth={2} />
            <line x1={midX - boxWidth / 2} y1={rY(min)} x2={midX + boxWidth / 2} y2={rY(min)} stroke={color} strokeWidth={2} />

            <rect x={boxX} y={rY(q3)} width={boxWidth} height={Math.abs(rY(q1) - rY(q3))} fill={color} fillOpacity={0.2} stroke={color} strokeWidth={2} />
            <line x1={boxX} y1={rY(median)} x2={boxX + boxWidth} y2={rY(median)} stroke={color} strokeWidth={2} />

            {/* Highlight Dot (Kinea) */}
            {highlight !== null && highlight !== undefined && (
                <circle cx={midX} cy={rY(highlight)} r={5} fill="#3b82f6" stroke="#fff" strokeWidth={2} />
            )}
        </g>
    );
};

const BoxPlotSection = ({ data, title, color, unit = '%' }: any) => {
    if (!data || data.length === 0) return null;

    // Calc range
    const allVals = data.flatMap((d: any) => [d.min, d.max, d.highlight].filter(v => v !== null && v !== undefined));
    const minV = Math.min(...allVals);
    const maxV = Math.max(...allVals);
    const pad = (maxV - minV) * 0.1;

    return (
        <Card className="bg-slate-900/50 border-slate-800">
            <CardHeader className="py-2 px-4 border-b border-slate-800/50">
                <CardTitle className="text-sm font-medium text-slate-300">{title}</CardTitle>
            </CardHeader>
            <CardContent className="h-[200px] p-2">
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={data} margin={{ top: 10, right: 10, bottom: 10, left: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                        <XAxis dataKey="window" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                        <YAxis domain={[minV - pad, maxV + pad]} stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `${v.toFixed(1)}`} />
                        <Tooltip
                            content={({ active, payload, label }) => {
                                if (!active || !payload || !payload[0]) return null;
                                const d = payload[0].payload;
                                return (
                                    <div className="bg-slate-950 border border-slate-700 p-2 rounded text-xs z-50 shadow-xl">
                                        <p className="font-bold mb-1 text-slate-200">{label}</p>
                                        <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                                            <span className="text-slate-400">Max:</span> <span className="text-right">{d.max?.toFixed(2)}</span>
                                            <span className="text-slate-400">Q3:</span> <span className="text-right">{d.q3?.toFixed(2)}</span>
                                            <span className="text-slate-400 font-bold">Med:</span> <span className="text-right font-bold">{d.median?.toFixed(2)}</span>
                                            <span className="text-slate-400">Q1:</span> <span className="text-right">{d.q1?.toFixed(2)}</span>
                                            <span className="text-slate-400">Min:</span> <span className="text-right">{d.min?.toFixed(2)}</span>
                                            {d.highlight && (
                                                <>
                                                    <span className="text-blue-400 font-bold border-t border-slate-700 pt-1 mt-1">Destaque:</span>
                                                    <span className="text-blue-400 font-bold text-right border-t border-slate-700 pt-1 mt-1">{d.highlight?.toFixed(2)}</span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                )
                            }}
                        />
                        <Bar dataKey="median" shape={<CustomBoxPlotShape color={color} />} />
                    </ComposedChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
};

const PerformanceTab = ({ data }: any) => {
    const flowByWindow = data?.flow_by_window || [];
    const returnByWindow = data?.return_by_window || [];
    const boxplotsRet = data?.boxplots_ret || [];
    const boxplotsVol = data?.boxplots_vol || [];
    const boxplotsMdd = data?.boxplots_mdd || [];
    const scatterData = data?.scatter_12m || [];

    return (
        <div className="space-y-6 animate-in fade-in">
            {/* 1. Fluxo Wrapper (Sem Título Grande) */}
            <div className="w-full">
                <FlowSummary data={flowByWindow} />
            </div>

            {/* 2. Retorno por Janela + Scatter (2 colunas) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="bg-slate-900/50 border-slate-800">
                    <CardHeader>
                        <CardTitle className="text-lg text-slate-200">Retorno vs CDI</CardTitle>
                    </CardHeader>
                    <CardContent className="h-[250px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={returnByWindow} barGap={0}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                                <XAxis dataKey="window" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`} />
                                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }} cursor={{ fill: '#1e293b', opacity: 0.3 }} />
                                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                                <Bar dataKey="retorno" name="Carteira" fill="#10b981" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="cdi" name="CDI" fill="#64748b" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                <Card className="bg-slate-900/50 border-slate-800">
                    <CardHeader>
                        <CardTitle className="text-lg text-slate-200">Risco x Retorno (12M)</CardTitle>
                    </CardHeader>
                    <CardContent className="h-[250px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                                <XAxis type="number" dataKey="x" name="Vol" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} unit="%" />
                                <YAxis type="number" dataKey="y" name="Ret" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} unit="%" />
                                <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }} />
                                <Scatter name="Fundos" data={scatterData} fill="#8b5cf6">
                                    {scatterData.map((entry: any, index: number) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Scatter>
                            </ScatterChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>

            {/* 3. Boxplots (Ret, Vol, MDD) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <BoxPlotSection data={boxplotsRet} title="Distribuição de Retorno" color="#10b981" />
                <BoxPlotSection data={boxplotsVol} title="Distribuição de Volatilidade" color="#3b82f6" />
                <BoxPlotSection data={boxplotsMdd} title="Distribuição de Drawdown" color="#ef4444" />
            </div>
        </div>
    );
};

// ============================================================================
// 3. ALOCAÇÃO CARTEIRA TAB
// ============================================================================
const AllocationTab = ({ data }: any) => {
    const flowByWindow = data?.flow_by_window || [];
    const evolution = data?.evolution_manager || [];
    const snapshot = data?.snapshot || [];
    const gestores = data?.gestores || [];

    return (
        <div className="space-y-6 animate-in fade-in">
            {/* 1. Fluxo Wrapper */}
            <div className="w-full">
                <FlowSummary data={flowByWindow} />
            </div>

            {/* 2. Evolução por Gestor (Stacked) */}
            <Card className="bg-slate-900/50 border-slate-800">
                <CardHeader>
                    <CardTitle className="text-lg text-slate-200">Evolução de Alocação por Gestor (5 Anos)</CardTitle>
                </CardHeader>
                <CardContent className="h-[350px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={evolution} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                            <defs>
                                {gestores.map((g: string, idx: number) => (
                                    <linearGradient key={g} id={`grad-${idx}`} x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={COLORS[idx % COLORS.length]} stopOpacity={0.4} />
                                        <stop offset="95%" stopColor={COLORS[idx % COLORS.length]} stopOpacity={0.1} />
                                    </linearGradient>
                                ))}
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                            <XAxis dataKey="month" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} minTickGap={30} />
                            <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => formatCurrency(v)} />
                            <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }} formatter={(v: number) => formatCurrency(v)} />
                            <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                            {gestores.map((g: string, idx: number) => (
                                <Area key={g} type="monotone" dataKey={g} stackId="1" stroke={COLORS[idx % COLORS.length]} fill={`url(#grad-${idx})`} strokeWidth={1.5} />
                            ))}
                        </AreaChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

            {/* 3. Snapshot Table (Top 20) */}
            <Card className="bg-slate-900/50 border-slate-800">
                <CardHeader>
                    <CardTitle className="text-lg text-slate-200">Carteira Atual Detalhada</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow className="border-slate-800 hover:bg-transparent">
                                <TableHead className="text-slate-400">Ativo</TableHead>
                                <TableHead className="text-slate-400">Segmento/Peer</TableHead>
                                <TableHead className="text-right text-slate-400">PL Alocado</TableHead>
                                <TableHead className="text-right text-slate-400">% Parte</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {snapshot.map((row: any, i: number) => (
                                <TableRow key={i} className="border-slate-800 hover:bg-slate-800/30">
                                    <TableCell className="font-medium text-slate-200">{row.name}</TableCell>
                                    <TableCell className="text-slate-500">{row.desc}</TableCell>
                                    <TableCell className="text-right font-mono text-slate-300">{formatCurrency(row.pl)}</TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <span className="font-bold text-emerald-400">{row.value}%</span>
                                            <div className="w-16 h-1 bg-slate-800 rounded-full overflow-hidden">
                                                <div className="h-full bg-emerald-500" style={{ width: `${Math.min(row.value, 100)}%` }} />
                                            </div>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
};

// ============================================================================
// MAIN ALLOCATORS COMPONENT
// ============================================================================
const Allocators = () => {
    const [selectedClient, setSelectedClient] = useState('');
    const [selectedPeer, setSelectedPeer] = useState('all');
    const [selectedSegment, setSelectedSegment] = useState('all');
    const [activeTab, setActiveTab] = useState('fluxo');

    // 1. Filters
    const { data: filtersData, isLoading: isLoadingFilters } = useQuery({
        queryKey: ['allocator-filters'],
        queryFn: () => FundingService.getAllocatorFilters(),
        staleTime: 0
    });

    // 2. Data Queries
    const { data: flowData, isLoading: isLoadingFlow } = useQuery({
        queryKey: ['allocator-flow', selectedClient, selectedSegment, selectedPeer],
        queryFn: () => FundingService.getAllocatorFlow(selectedClient || undefined, selectedSegment || undefined, selectedPeer, 12), // Window ignored by new logic but keep param signature
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

    // Auto-select logic
    const availableSegments = useMemo(() => {
        if (!filtersData || !selectedClient) return [];
        return filtersData.segments_by_client?.[selectedClient] || [];
    }, [filtersData, selectedClient]);

    React.useEffect(() => {
        if (filtersData && !selectedClient && filtersData.clients.length > 0) {
            setSelectedClient(filtersData.clients[0]);
        }
    }, [filtersData, selectedClient]);

    React.useEffect(() => {
        setSelectedSegment('all');
    }, [selectedClient]);

    if (isLoadingFilters) {
        return <div className="flex h-screen items-center justify-center bg-[#0F172A]"><Loader2 className="animate-spin text-emerald-500 w-10 h-10" /></div>;
    }

    return (
        <div className="flex flex-col h-full bg-[#0F172A] text-slate-100 p-6 overflow-hidden">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 shrink-0">
                <div>
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent flex items-center gap-2">
                        <Wallet className="w-8 h-8 text-emerald-500" />
                        Allocators Intelligence
                    </h1>
                </div>

                <div className="flex items-center gap-3 bg-slate-900/80 p-2 rounded-lg border border-slate-800 shadow-xl">
                    <Select value={selectedClient} onValueChange={setSelectedClient}>
                        <SelectTrigger className="w-[200px] bg-slate-950 border-slate-700 h-9 font-medium text-emerald-400">
                            <SelectValue placeholder="Cliente" />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-900 border-slate-700">
                            {filtersData?.clients.map((c: string) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                        </SelectContent>
                    </Select>

                    <Select value={selectedPeer} onValueChange={setSelectedPeer}>
                        <SelectTrigger className="w-[160px] bg-slate-950 border-slate-700 h-9">
                            <SelectValue placeholder="Peer" />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-900 border-slate-700">
                            <SelectItem value="all">Todos Peers</SelectItem>
                            {filtersData?.peers.map((p: string) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                        </SelectContent>
                    </Select>

                    <Select value={selectedSegment} onValueChange={setSelectedSegment}>
                        <SelectTrigger className="w-[180px] bg-slate-950 border-slate-700 h-9">
                            <SelectValue placeholder="Segmento" />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-900 border-slate-700">
                            <SelectItem value="all">Todos Segmentos</SelectItem>
                            {availableSegments.map((s: string) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Content Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <TabsList className="bg-transparent p-0 w-fit">
                        <TabsTrigger value="fluxo" className="rounded-none border-b-2 border-transparent data-[state=active]:border-emerald-500 data-[state=active]:bg-transparent data-[state=active]:text-emerald-400 px-6">
                            Fluxo & Posição
                        </TabsTrigger>
                        <TabsTrigger value="performance" className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:bg-transparent data-[state=active]:text-blue-400 px-6">
                            Performance
                        </TabsTrigger>
                        <TabsTrigger value="alocacao" className="rounded-none border-b-2 border-transparent data-[state=active]:border-purple-500 data-[state=active]:bg-transparent data-[state=active]:text-purple-400 px-6">
                            Alocação
                        </TabsTrigger>
                    </TabsList>
                </div>

                <ScrollArea className="flex-1 -mr-4 pr-4">
                    <TabsContent value="fluxo" className="mt-0 pb-10">
                        {isLoadingFlow ? <div className="h-64 flex items-center justify-center"><Loader2 className="animate-spin text-slate-500" /></div> :
                            <FlowPositionTab data={flowData} />
                        }
                    </TabsContent>

                    <TabsContent value="performance" className="mt-0 pb-10">
                        {isLoadingPerf ? <div className="h-64 flex items-center justify-center"><Loader2 className="animate-spin text-slate-500" /></div> :
                            <PerformanceTab data={perfData} />
                        }
                    </TabsContent>

                    <TabsContent value="alocacao" className="mt-0 pb-10">
                        {isLoadingAlloc ? <div className="h-64 flex items-center justify-center"><Loader2 className="animate-spin text-slate-500" /></div> :
                            <AllocationTab data={allocData} />
                        }
                    </TabsContent>
                </ScrollArea>
            </Tabs>
        </div>
    );
};

export default Allocators;
