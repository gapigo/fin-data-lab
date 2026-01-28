
import React, { useState, useMemo } from 'react';
import {
    LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    ComposedChart, ScatterChart, Scatter, Cell, PieChart, Pie, Sector, AreaChart, Area
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { ArrowUpRight, ArrowDownRight, TrendingUp, Activity, PieChart as PieChartIcon, LayoutDashboard, Wallet } from 'lucide-react';

// --- MOCK DATA GENERATORS ---

const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const WINDOWS = [6, 12, 24, 36, 48, 60];

const generateMonthlyData = (points = 12) => {
    return Array.from({ length: points }, (_, i) => ({
        month: MONTHS[i % 12],
        value: 100 + Math.random() * 50 + (i * 2),
        multimercado: 50 + Math.random() * 20 + (i * 1.5),
        ibov: 80 + Math.random() * 30
    }));
};

const generateDistributionData = () => {
    return Array.from({ length: 15 }, (_, i) => ({
        client: `Cli ${i + 1}`,
        flow: (Math.random() - 0.4) * 1000,
    })).sort((a, b) => b.flow - a.flow);
};

const generateManagerAllocation = (months = 12) => {
    return Array.from({ length: months }, (_, i) => ({
        month: MONTHS[i % 12],
        'Kinea': 20 + Math.random() * 5,
        'Verde': 15 + Math.random() * 5,
        'SPX': 10 + Math.random() * 5,
        'Legacy': 12 + Math.random() * 5,
        'Ibiuna': 8 + Math.random() * 5,
    }));
};

const MANAGERS_COLORS = {
    'Kinea': '#10b981',
    'Verde': '#059669',
    'SPX': '#3b82f6',
    'Legacy': '#f59e0b',
    'Ibiuna': '#8b5cf6'
};

const FUNDS_SNAPSHOT = [
    { symbol: 'MM', name: 'Kinea Atlas II', desc: 'Multimercado Macro', pl: 15.4, value: 25 },
    { symbol: 'MM', name: 'Verde AM', desc: 'Multimercado Livre', pl: 3.2, value: 20 },
    { symbol: 'L/S', name: 'SPX Nimitz', desc: 'Long and Short', pl: 8.9, value: 15 },
    { symbol: 'FIA', name: 'Legacy Capital', desc: 'Ações Livre', pl: 1.2, value: 25 },
    { symbol: 'CP', name: 'Ibiuna Credit', desc: 'Crédito Privado', pl: 4.5, value: 15 },
];

const COLORS = ['#10b981', '#059669', '#3b82f6', '#f59e0b', '#8b5cf6'];

// --- SUB-COMPONENTS ---

// 1. FLUXO E POSIÇÃO
const FlowPositionTab = ({ window, setWindow }: any) => {
    const lineData = useMemo(() => generateMonthlyData(12), []);
    const barData = useMemo(() => generateDistributionData(), [window]);

    return (
        <div className="space-y-6 animate-in fade-in">
            <div className="grid grid-cols-1 gap-6">
                {/* Gráfico 1: Posição Mês a Mês */}
                <Card className="bg-slate-900/50 border-slate-800">
                    <CardHeader>
                        <CardTitle className="text-lg text-slate-200">Evolução Patrimonial (Multimercado)</CardTitle>
                        <CardDescription>Soma de vl_merc_pos_final mês a mês</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={lineData}>
                                <defs>
                                    <linearGradient id="colorMm" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                                <XAxis dataKey="month" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `R$ ${v}M`} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#f1f5f9' }}
                                    itemStyle={{ color: '#3b82f6' }}
                                />
                                <Area type="monotone" dataKey="multimercado" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorMm)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* Gráfico 2: Segmentação de Clientes */}
                <Card className="bg-slate-900/50 border-slate-800">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <div>
                            <CardTitle className="text-lg text-slate-200">Fluxo por Cliente ({window} Meses)</CardTitle>
                            <CardDescription>Comportamento de fluxo segmentado na janela selecionada</CardDescription>
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
                                <XAxis dataKey="client" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} interval={0} />
                                <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                                <Tooltip
                                    cursor={{ fill: '#1e293b', opacity: 0.4 }}
                                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#f1f5f9' }}
                                />
                                <Bar dataKey="flow" radius={[4, 4, 0, 0]}>
                                    {barData.map((entry, index) => (
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

// 2. PERFORMANCE CARTEIRA
const PerformanceTab = () => {
    // Mock Data Specific for Performance
    const returnBars = [
        { name: '6M', cdi: 6.2, fund: 5.8 },
        { name: '12M', cdi: 12.5, fund: 14.2 },
        { name: '24M', cdi: 24.8, fund: 28.5 },
        { name: '36M', cdi: 35.1, fund: 32.0 },
    ];

    const boxPlotData = WINDOWS.map(w => ({
        window: `${w}M`,
        min: Math.random() * -5,
        q1: Math.random() * 2,
        median: 2 + Math.random() * 5,
        q3: 8 + Math.random() * 5,
        max: 15 + Math.random() * 5
    }));

    const scatterData = Array.from({ length: 20 }, (_, i) => ({
        x: 2 + Math.random() * 15, // Vol
        y: -2 + Math.random() * 20, // Retorno
        z: Math.random() * 100, // Size
        name: `Fundo ${i}`
    }));

    const perfTableRows = [
        { label: 'Kinea Nix', meta: 10, bench: 12 },
        { label: 'Meta', meta: null, bench: null },
        { label: 'CDI', meta: null, bench: null }
    ];

    const getCellColor = (val: number, meta: number, bench: number) => {
        if (!val) return '';
        if (val > meta) return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50';
        if (val > bench) return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50';
        return 'bg-red-500/20 text-red-400 border-red-500/50';
    };

    return (
        <div className="space-y-6 animate-in fade-in">
            {/* Retorno vs CDI (Barras com linha) */}
            <div className="grid grid-cols-3 gap-6">
                <Card className="col-span-2 bg-slate-900/50 border-slate-800">
                    <CardHeader>
                        <CardTitle className="text-lg text-slate-200">Retorno vs Benchmark (CDI)</CardTitle>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={returnBars}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                                <XAxis dataKey="name" stroke="#64748b" />
                                <YAxis stroke="#64748b" />
                                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#f1f5f9' }} />
                                <Legend />
                                <Bar dataKey="fund" name="Fundo/Carteira" fill="#3b82f6" barSize={40} radius={[4, 4, 0, 0]} />
                                <Line type="monotone" dataKey="cdi" name="CDI" stroke="#ef4444" strokeWidth={3} dot={{ r: 4 }} />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* Scatter Plot */}
                <Card className="bg-slate-900/50 border-slate-800">
                    <CardHeader>
                        <CardTitle className="text-lg text-slate-200">Retorno vs Vol (12M)</CardTitle>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                                <XAxis type="number" dataKey="x" name="Volatilidade" stroke="#64748b" unit="%" />
                                <YAxis type="number" dataKey="y" name="Retorno" stroke="#64748b" unit="%" />
                                <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#f1f5f9' }} />
                                <Scatter name="Fundos" data={scatterData} fill="#8884d8">
                                    {scatterData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Scatter>
                            </ScatterChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>

            {/* Box Plots (Simulados com Composed Chart de Min/Max/Median) */}
            <div className="grid grid-cols-3 gap-4">
                {['Retorno', 'Volatilidade', 'Max Drawdown'].map((metric, idx) => (
                    <Card key={metric} className="bg-slate-900/50 border-slate-800">
                        <CardHeader className="py-3">
                            <CardTitle className="text-sm font-medium text-slate-400 uppercase tracking-wider">{metric}</CardTitle>
                        </CardHeader>
                        <CardContent className="h-[200px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <ComposedChart data={boxPlotData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                                    <XAxis dataKey="window" stroke="#64748b" fontSize={10} />
                                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b' }} />
                                    {/* Using Bar stack to simulate box-ish range */}
                                    <Bar dataKey="q3" stackId="a" fill="transparent" />
                                    <Bar dataKey="median" stackId="a" fill="#3b82f6" opacity={0.5} />
                                    <Line type="monotone" dataKey="max" stroke="#10b981" dot={false} strokeWidth={1} />
                                    <Line type="monotone" dataKey="min" stroke="#ef4444" dot={false} strokeWidth={1} />
                                </ComposedChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Tabela Performance Absoluta */}
            <Card className="bg-slate-900/50 border-slate-800">
                <CardHeader>
                    <CardTitle className="text-lg text-slate-200">Performance Absoluta</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border border-slate-800 overflow-hidden">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-950 text-slate-400 font-medium uppercase text-xs">
                                <tr>
                                    <th className="px-4 py-3">Fundo / Benchmark</th>
                                    {WINDOWS.map(w => <th key={w} className="px-4 py-3 text-center">{w}M</th>)}
                                    <th className="px-4 py-3 text-center">SI (Desde Início)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800">
                                {/* Fundo Row with Colors */}
                                <tr className="bg-slate-900/50">
                                    <td className="px-4 py-3 font-medium text-white">Kinea Nix</td>
                                    {WINDOWS.map(w => {
                                        const val = 10 + Math.random() * 10; // Mock ROI
                                        const meta = 11;
                                        const bench = 9;
                                        return (
                                            <td key={w} className="px-4 py-2">
                                                <div className={cn("text-center py-1 px-2 rounded border", getCellColor(val, meta, bench))}>
                                                    {val.toFixed(1)}%
                                                </div>
                                            </td>
                                        );
                                    })}
                                    <td className="px-4 py-2 text-center text-slate-300">145.2%</td>
                                </tr>
                                {/* Meta Row */}
                                <tr className="bg-slate-900/30 text-slate-400">
                                    <td className="px-4 py-3">Meta (CDI + 2%)</td>
                                    {WINDOWS.map(w => <td key={w} className="px-4 py-3 text-center">{(11 + Math.random()).toFixed(1)}%</td>)}
                                    <td className="px-4 py-3 text-center">130.0%</td>
                                </tr>
                                {/* CDI Row */}
                                <tr className="bg-slate-900/30 text-slate-500 italic">
                                    <td className="px-4 py-3">CDI</td>
                                    {WINDOWS.map(w => <td key={w} className="px-4 py-3 text-center">{(9 + Math.random()).toFixed(1)}%</td>)}
                                    <td className="px-4 py-3 text-center">110.0%</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

// 3. ALOCAÇÃO CARTEIRA
const AllocationTab = () => {
    const timeData = useMemo(() => generateManagerAllocation(12), []);
    const diffData = useMemo(() => generateMonthlyData(12).map(d => ({ month: d.month, diff: (Math.random() - 0.5) * 50 })), []);

    return (
        <div className="space-y-6 animate-in fade-in">
            {/* Gráfico 1: Evolução Mensal (Stacked Bar - Gestores) */}
            <Card className="bg-slate-900/50 border-slate-800">
                <CardHeader>
                    <CardTitle className="text-lg text-slate-200">Evolução da Alocação por Gestor</CardTitle>
                    <CardDescription>Composição da carteira ao longo do tempo</CardDescription>
                </CardHeader>
                <CardContent className="h-[350px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={timeData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                            <XAxis dataKey="month" stroke="#64748b" />
                            <YAxis stroke="#64748b" />
                            <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#f1f5f9' }} />
                            <Legend />
                            {Object.keys(MANAGERS_COLORS).map(manager => (
                                <Bar key={manager} dataKey={manager} stackId="a" fill={MANAGERS_COLORS[manager as keyof typeof MANAGERS_COLORS]} />
                            ))}
                        </BarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

            {/* Gráfico 2: Diferença de Movimentação */}
            <Card className="bg-slate-900/50 border-slate-800">
                <CardHeader>
                    <CardTitle className="text-sm font-medium text-slate-400 uppercase">Diferença de Movimentação</CardTitle>
                </CardHeader>
                <CardContent className="h-[150px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={diffData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                            <XAxis dataKey="month" stroke="#64748b" fontSize={10} />
                            <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b' }} />
                            <Bar dataKey="diff">
                                {diffData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.diff > 0 ? '#10b981' : '#ef4444'} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

            {/* Seção 3: Foto da Carteira (Lista e Pie Chart) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Lista de Fundos */}
                <Card className="bg-slate-900/50 border-slate-800 flex flex-col">
                    <CardHeader>
                        <CardTitle className="text-lg text-slate-200">Composição Atual (Foto)</CardTitle>
                    </CardHeader>
                    <ScrollArea className="flex-1 max-h-[400px]">
                        <div className="p-4 space-y-3">
                            {FUNDS_SNAPSHOT.map((fund, idx) => (
                                <div key={idx} className="flex items-center gap-4 p-3 rounded-lg bg-slate-950/50 border border-slate-800 hover:border-slate-700 transition-colors">
                                    <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs shadow-lg"
                                        style={{ backgroundColor: `${COLORS[idx % COLORS.length]}20`, color: COLORS[idx % COLORS.length], border: `1px solid ${COLORS[idx % COLORS.length]}` }}>
                                        {fund.symbol}
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-semibold text-slate-200">{fund.name}</p>
                                        <p className="text-xs text-slate-500">{fund.desc}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-mono text-emerald-400 font-medium">{fund.value}%</p>
                                        <p className="text-[10px] text-slate-600">PL: {fund.pl}B</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </ScrollArea>
                </Card>

                {/* Pie Chart */}
                <Card className="bg-slate-900/50 border-slate-800 flex flex-col items-center justify-center p-6">
                    <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                            <Pie
                                data={FUNDS_SNAPSHOT}
                                cx="50%"
                                cy="50%"
                                innerRadius={80}
                                outerRadius={120}
                                paddingAngle={2}
                                dataKey="value"
                            >
                                {FUNDS_SNAPSHOT.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="rgba(0,0,0,0.5)" strokeWidth={1} />
                                ))}
                            </Pie>
                            <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#f1f5f9' }} itemStyle={{ color: '#fff' }} />
                            <Legend layout="vertical" align="right" verticalAlign="middle" wrapperStyle={{ fontSize: '12px', color: '#94a3b8' }} />
                        </PieChart>
                    </ResponsiveContainer>
                    <div className="text-center mt-4">
                        <p className="text-3xl font-bold text-slate-200">100%</p>
                        <p className="text-sm text-slate-500 uppercase tracking-widest">Alocado</p>
                    </div>
                </Card>
            </div>
        </div>
    );
};

// --- MAIN WRAPPER ---

const Allocators = () => {
    // Shared State for Synchronization
    const [selectedClient, setSelectedClient] = useState('itau');
    const [selectedPeer, setSelectedPeer] = useState('multi');
    const [selectedSegment, setSelectedSegment] = useState('private');

    // Tab Specific State
    const [flowWindow, setFlowWindow] = useState(12);

    return (
        <div className="flex flex-col h-full bg-[#0F172A] text-slate-100 p-6 overflow-hidden">
            {/* Header Global Sincronizado */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent flex items-center gap-2">
                        <Wallet className="w-8 h-8 text-emerald-500" />
                        Alocadores
                    </h1>
                    <p className="text-sm text-slate-400">Análise integrada de patrimônio e alocação</p>
                </div>

                <div className="flex items-center gap-3 bg-slate-900/80 p-2 rounded-lg border border-slate-800 shadow-xl">
                    <Select value={selectedClient} onValueChange={setSelectedClient}>
                        <SelectTrigger className="w-[180px] bg-slate-950 border-slate-700 h-9">
                            <SelectValue placeholder="Cliente" />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-900 border-slate-700">
                            <SelectItem value="itau">Itaú</SelectItem>
                            <SelectItem value="bradesco">Bradesco</SelectItem>
                            <SelectItem value="santander">Santander</SelectItem>
                            <SelectItem value="btg">BTG Pactual</SelectItem>
                        </SelectContent>
                    </Select>

                    <Select value={selectedPeer} onValueChange={setSelectedPeer}>
                        <SelectTrigger className="w-[180px] bg-slate-950 border-slate-700 h-9">
                            <SelectValue placeholder="Peer" />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-900 border-slate-700">
                            <SelectItem value="multi">Multimercado</SelectItem>
                            <SelectItem value="acoes">Ações</SelectItem>
                            <SelectItem value="renda_fixa">Renda Fixa</SelectItem>
                        </SelectContent>
                    </Select>

                    <Select value={selectedSegment} onValueChange={setSelectedSegment}>
                        <SelectTrigger className="w-[180px] bg-slate-950 border-slate-700 h-9">
                            <SelectValue placeholder="Segmento" />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-900 border-slate-700">
                            <SelectItem value="private">Private</SelectItem>
                            <SelectItem value="varejo">Varejo</SelectItem>
                            <SelectItem value="wealth">Wealth</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Conteúdo das Abas */}
            <Tabs defaultValue="fluxo" className="flex-1 flex flex-col min-h-0 space-y-4">
                <TabsList className="bg-slate-900 p-1 w-fit border border-slate-800">
                    <TabsTrigger value="fluxo" className="data-[state=active]:bg-emerald-600/20 data-[state=active]:text-emerald-400 data-[state=active]:border-emerald-500/50 border border-transparent">
                        <Activity className="w-4 h-4 mr-2" />Fluxo e Posição
                    </TabsTrigger>
                    <TabsTrigger value="performance" className="data-[state=active]:bg-blue-600/20 data-[state=active]:text-blue-400 data-[state=active]:border-blue-500/50 border border-transparent">
                        <TrendingUp className="w-4 h-4 mr-2" />Performance Carteira
                    </TabsTrigger>
                    <TabsTrigger value="alocacao" className="data-[state=active]:bg-purple-600/20 data-[state=active]:text-purple-400 data-[state=active]:border-purple-500/50 border border-transparent">
                        <PieChartIcon className="w-4 h-4 mr-2" />Alocação Carteira
                    </TabsTrigger>
                </TabsList>

                <ScrollArea className="flex-1 pr-4">
                    <TabsContent value="fluxo" className="mt-0">
                        <FlowPositionTab window={flowWindow} setWindow={setFlowWindow} />
                    </TabsContent>

                    <TabsContent value="performance" className="mt-0">
                        <PerformanceTab />
                    </TabsContent>

                    <TabsContent value="alocacao" className="mt-0">
                        <AllocationTab />
                    </TabsContent>
                </ScrollArea>
            </Tabs>
        </div>
    );
};

export default Allocators;
