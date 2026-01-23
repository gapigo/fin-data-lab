
import React, { useState } from 'react';
import {
    Building2,
    BarChart3,
    PieChart as PieChartIcon,
    Settings,
    Download,
    MessageSquare,
    Search,
    Filter,
    ArrowUpRight,
    ArrowDownRight,
    Clock,
    Shield,
    Users,
    Briefcase,
    Share2,
    Edit3,
    Send,
    Bot
} from 'lucide-react';
import {
    LineChart,
    Line,
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    Legend
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

// --- MOCK DATA ---

const FUND_DATA = {
    name: "Trígono Flagship Small Caps FIC FIA",
    cnpj: "29.206.196/0001-57",
    start_date: "2018-04-10",
    net_worth: 450230000,
    shareholders: 12503,
    quota_val: 2.4532,
    description: "O fundo tem como objetivo proporcionar ganhos de capital a longo prazo através do investimento em empresas de menor capitalização (Small Caps), com foco em análise fundamentalista e governança corporativa.",
    fees: {
        admin: "2.00%",
        performance: "20% sobre o que exceder o SMLL",
    },
    liquidity: {
        quotation: "D+30",
        settlement: "D+2 (úteis)"
    },
    actors: {
        manager: "Trígono Capital",
        admin: "BNY Mellon",
        custodian: "BNY Mellon",
        auditor: "KPMG"
    },
    classification: {
        cvm_class: "Ações",
        anbima_class: "Ações Small Caps",
        audience: "Investidor Qualificado"
    },
    benchmark: "SMLL (Índice Small Cap)",
    subclasses: ["Trígono Delphos", "Trígono Verbier"],
    client_profile: {
        institutional: 30,
        distributors: 45,
        direct: 25
    },
    buying_funds: [
        { name: "Itaú Seleção Small Caps", manager: "Itaú Asset" },
        { name: "XP Long Term Equity", manager: "XP Asset" },
        { name: "Safra Galileo", manager: "Safra Asset" }
    ]
};

const PERFORMANCE_DATA = [
    { date: '2023-01', value: 100, benchmark: 100 },
    { date: '2023-02', value: 102, benchmark: 101 },
    { date: '2023-03', value: 98, benchmark: 99 },
    { date: '2023-04', value: 105, benchmark: 102 },
    { date: '2023-05', value: 108, benchmark: 104 },
    { date: '2023-06', value: 112, benchmark: 106 },
    { date: '2023-07', value: 115, benchmark: 108 },
    { date: '2023-08', value: 110, benchmark: 105 },
    { date: '2023-09', value: 114, benchmark: 107 },
    { date: '2023-10', value: 109, benchmark: 103 },
    { date: '2023-11', value: 118, benchmark: 110 },
    { date: '2023-12', value: 125, benchmark: 115 },
    { date: '2024-01', value: 122, benchmark: 114 },
];

const ASSET_ALLOCATION = [
    { name: 'Ações', value: 92, color: '#10B981' },
    { name: 'Caixa', value: 5, color: '#3B82F6' },
    { name: 'Títulos Públicos', value: 3, color: '#F59E0B' },
];

const TOP_ASSETS = [
    { ticker: 'TUPY3', name: 'Tupy S.A.', sector: 'Bens Industriais', participation: 12.5 },
    { ticker: 'KEPL3', name: 'Kepler Weber', sector: 'Bens Industriais', participation: 9.8 },
    { ticker: 'FESA4', name: 'Ferbasa', sector: 'Materiais Básicos', participation: 8.4 },
    { ticker: 'SHUL4', name: 'Schulz', sector: 'Bens Industriais', participation: 7.2 },
    { ticker: 'LEVE3', name: 'Mahle Metal Leve', sector: 'Consumo Cíclico', participation: 6.9 },
    { ticker: 'RANI3', name: 'Irani', sector: 'Materiais Básicos', participation: 5.5 },
];

const RETURNS_TABLE = {
    '1M': 2.45,
    '3M': 5.12,
    '6M': 12.30,
    '12M': 25.40,
    '2Y': 35.20,
    '3Y': 45.10,
    '5Y': 110.50,
    'Início': 145.32
};

const CHAT_MESSAGES_INITIAL = [
    { id: 1, sender: 'ai', text: "Olá! Sou o analista virtual do Lab. Acabei de ler o regulamento do fundo Trígono Flagship. Posso ajudar com dúvidas sobre limites de alavancagem, política de investimento ou histórico do gestor. O que deseja saber?" }
];

// --- COMPONENTS ---

const FundLab = () => {
    const [activeTab, setActiveTab] = useState("overview");
    const [chatInput, setChatInput] = useState("");
    const [messages, setMessages] = useState(CHAT_MESSAGES_INITIAL);
    const [fundDesc, setFundDesc] = useState(FUND_DATA.description);
    const [isEditOpen, setIsEditOpen] = useState(false);

    const handleSendMessage = () => {
        if (!chatInput.trim()) return;
        const newMsg = { id: Date.now(), sender: 'user', text: chatInput };
        setMessages([...messages, newMsg]);
        setChatInput("");

        // Simulate AI response
        setTimeout(() => {
            setMessages(prev => [...prev, {
                id: Date.now() + 1,
                sender: 'ai',
                text: "Estou analisando essa informação nos documentos oficiais da CVM... (Simulação: O fundo permite até 20% de alavancagem segundo o Art. 15 do regulamento)."
            }]);
        }, 1500);
    };

    const handleExport = () => {
        alert("Iniciando exportação para PDF... (Funcionalidade Mock)");
    };

    return (
        <div className="bg-[#020617] min-h-screen text-slate-100 font-sans selection:bg-emerald-500/30">

            {/* --- HERO SECTION --- */}
            <div className="relative overflow-hidden border-b border-slate-800 bg-[#0F172A] p-6 lg:p-10">
                <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                    <Building2 size={300} />
                </div>

                <div className="relative z-10 max-w-7xl mx-auto">
                    <div className="flex flex-col lg:flex-row justify-between items-start gap-6">
                        <div className="space-y-4 max-w-2xl">
                            <div className="flex gap-2">
                                <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20 transition-colors">
                                    {FUND_DATA.classification.cvm_class}
                                </Badge>
                                <Badge variant="outline" className="text-slate-400 border-slate-700">
                                    {FUND_DATA.classification.audience}
                                </Badge>
                            </div>

                            <h1 className="text-3xl md:text-5xl font-bold tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
                                {FUND_DATA.name}
                            </h1>

                            <div className="flex items-center gap-2 text-slate-400 text-sm md:text-base">
                                <p className="line-clamp-2 md:line-clamp-none max-w-xl">{fundDesc}</p>
                                <Button variant="ghost" size="icon" onClick={() => setIsEditOpen(true)} className="h-6 w-6 text-slate-500 hover:text-emerald-400">
                                    <Edit3 size={14} />
                                </Button>
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
                            <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm min-w-[200px]">
                                <CardContent className="p-4">
                                    <p className="text-slate-500 text-xs uppercase font-medium">Cota Atual</p>
                                    <div className="flex items-baseline gap-2 mt-1">
                                        <span className="text-2xl font-bold text-white">R$ {FUND_DATA.quota_val.toFixed(4)}</span>
                                        <span className="text-xs text-emerald-400 flex items-center">
                                            <ArrowUpRight size={12} /> +1.2%
                                        </span>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm min-w-[200px]">
                                <CardContent className="p-4">
                                    <p className="text-slate-500 text-xs uppercase font-medium">Patrimônio Líquido</p>
                                    <div className="flex items-baseline gap-2 mt-1">
                                        <span className="text-2xl font-bold text-white">
                                            {(FUND_DATA.net_worth / 1000000).toFixed(1)}M
                                        </span>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-4 mt-8">
                        <Button className="bg-emerald-500 hover:bg-emerald-600 text-white font-medium shadow-lg shadow-emerald-500/20">
                            <Briefcase size={16} className="mr-2" /> Investir Agora
                        </Button>
                        <Button variant="outline" className="border-slate-700 hover:bg-slate-800 text-slate-300" onClick={handleExport}>
                            <Download size={16} className="mr-2" /> Exportar PDF
                        </Button>
                        <Button variant="outline" className="border-slate-700 hover:bg-slate-800 text-slate-300">
                            <Share2 size={16} className="mr-2" /> Compartilhar
                        </Button>
                    </div>
                </div>
            </div>

            {/* --- MAIN CONTENT --- */}
            <div className="max-w-7xl mx-auto p-4 md:p-6 lg:p-10">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
                    <TabsList className="bg-slate-900/80 border border-slate-800 p-1 h-auto flex-wrap justify-start w-full md:w-auto">
                        <TabsTrigger value="overview" className="data-[state=active]:bg-emerald-500 data-[state=active]:text-white px-4 py-2">Visão Geral</TabsTrigger>
                        <TabsTrigger value="portfolio" className="data-[state=active]:bg-emerald-500 data-[state=active]:text-white px-4 py-2">Carteira</TabsTrigger>
                        <TabsTrigger value="performance" className="data-[state=active]:bg-emerald-500 data-[state=active]:text-white px-4 py-2">Rentabilidade</TabsTrigger>
                        <TabsTrigger value="structure" className="data-[state=active]:bg-emerald-500 data-[state=active]:text-white px-4 py-2">Estrutura</TabsTrigger>
                        <TabsTrigger value="ai" className="data-[state=active]:bg-indigo-500 data-[state=active]:text-white px-4 py-2 flex gap-2">
                            <Bot size={16} /> AI Analyst
                        </TabsTrigger>
                    </TabsList>

                    {/* OVERVIEW TAB */}
                    <TabsContent value="overview" className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                            {/* FEES & TERMS */}
                            <Card className="bg-slate-900/30 border-slate-800 md:col-span-2">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2 text-emerald-400">
                                        <Clock size={20} />
                                        Taxas e Prazos
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                                    <div className="space-y-4">
                                        <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wider">Custos</h3>
                                        <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                                            <span className="text-slate-300">Taxa de Administração</span>
                                            <span className="font-semibold text-white">{FUND_DATA.fees.admin}</span>
                                        </div>
                                        <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                                            <span className="text-slate-300">Taxa de Performance</span>
                                            <span className="font-semibold text-white">{FUND_DATA.fees.performance}</span>
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wider">Liquidez</h3>
                                        <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                                            <span className="text-slate-300">Cotização (Resgate)</span>
                                            <span className="font-semibold text-emerald-400">{FUND_DATA.liquidity.quotation}</span>
                                        </div>
                                        <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                                            <span className="text-slate-300">Liquidação Financeira</span>
                                            <span className="font-semibold text-white">{FUND_DATA.liquidity.settlement}</span>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* ACTORS */}
                            <Card className="bg-slate-900/30 border-slate-800">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2 text-blue-400">
                                        <Users size={20} />
                                        Atores Principais
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="group cursor-pointer">
                                        <p className="text-xs text-slate-500 mb-1">GESTORA (ASSET)</p>
                                        <div className="flex items-center gap-3 p-2 rounded-md hover:bg-slate-800 transition-colors">
                                            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold">TC</div>
                                            <div>
                                                <p className="font-semibold text-white">{FUND_DATA.actors.manager}</p>
                                                <p className="text-xs text-blue-400 group-hover:underline">Ver perfil</p>
                                            </div>
                                        </div>
                                    </div>
                                    <Separator className="bg-slate-800" />
                                    <div>
                                        <p className="text-xs text-slate-500 mb-1">ADMINISTRADOR</p>
                                        <p className="font-medium text-slate-300">{FUND_DATA.actors.admin}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-500 mb-1">CUSTODIANTE</p>
                                        <p className="font-medium text-slate-300">{FUND_DATA.actors.custodian}</p>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* CLASSIFICATION & BENCHMARK */}
                            <Card className="bg-slate-900/30 border-slate-800 md:col-span-3">
                                <CardContent className="p-6 grid grid-cols-1 md:grid-cols-4 gap-6">
                                    <div>
                                        <p className="text-xs text-slate-500 mb-1">CLASSE CVM</p>
                                        <p className="text-lg font-medium text-white">{FUND_DATA.classification.cvm_class}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-500 mb-1">CLASSE ANBIMA</p>
                                        <p className="text-lg font-medium text-white">{FUND_DATA.classification.anbima_class}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-500 mb-1">PÚBLICO ALVO</p>
                                        <p className="text-lg font-medium text-white">{FUND_DATA.classification.audience}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-500 mb-1">BENCHMARK</p>
                                        <div className="flex items-center gap-2">
                                            <BarChart3 className="text-slate-400" size={16} />
                                            <p className="text-lg font-medium text-emerald-400">{FUND_DATA.benchmark}</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>


                    {/* PORTFOLIO TAB */}
                    <TabsContent value="portfolio" className="space-y-6">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* ASSET ALLOCATION CHART */}
                            <Card className="bg-slate-900/30 border-slate-800 lg:col-span-1">
                                <CardHeader>
                                    <CardTitle className="text-slate-200">Alocação por Tipo</CardTitle>
                                </CardHeader>
                                <CardContent className="h-[300px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={ASSET_ALLOCATION}
                                                innerRadius={60}
                                                outerRadius={80}
                                                paddingAngle={5}
                                                dataKey="value"
                                            >
                                                {ASSET_ALLOCATION.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                                                ))}
                                            </Pie>
                                            <Tooltip
                                                contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px', color: '#fff' }}
                                                itemStyle={{ color: '#fff' }}
                                            />
                                            <Legend verticalAlign="bottom" height={36} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </CardContent>
                            </Card>

                            {/* ASSETS TABLE */}
                            <Card className="bg-slate-900/30 border-slate-800 lg:col-span-2">
                                <CardHeader className="flex flex-row items-center justify-between">
                                    <CardTitle className="text-slate-200">Principais Ativos (Maiores Posições)</CardTitle>
                                    <div className="relative w-48">
                                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-500" />
                                        <Input placeholder="Filtrar ativo..." className="pl-8 bg-slate-950/50 border-slate-800 h-9" />
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <Table>
                                        <TableHeader className="bg-slate-950/50">
                                            <TableRow className="border-slate-800 hover:bg-slate-950/50">
                                                <TableHead className="text-slate-400">Ativo</TableHead>
                                                <TableHead className="text-slate-400">Setor</TableHead>
                                                <TableHead className="text-right text-slate-400">% PL</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {TOP_ASSETS.map((asset) => (
                                                <TableRow key={asset.ticker} className="border-slate-800 hover:bg-slate-800/50">
                                                    <TableCell className="font-medium">
                                                        <div className="flex flex-col">
                                                            <span className="text-white">{asset.ticker}</span>
                                                            <span className="text-xs text-slate-500">{asset.name}</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-slate-300">{asset.sector}</TableCell>
                                                    <TableCell className="text-right font-bold text-emerald-400">{asset.participation}%</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>

                    {/* PERFORMANCE TAB */}
                    <TabsContent value="performance" className="space-y-6">
                        <Card className="bg-slate-900/30 border-slate-800">
                            <CardHeader>
                                <CardTitle className="text-slate-200">Rentabilidade Acumulada</CardTitle>
                                <CardDescription className="text-slate-400">Comparativo Fundo x Benchmark ({FUND_DATA.benchmark})</CardDescription>
                            </CardHeader>
                            <CardContent className="h-[400px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={PERFORMANCE_DATA}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.2} vertical={false} />
                                        <XAxis
                                            dataKey="date"
                                            stroke="#64748b"
                                            tickFormatter={(val) => new Date(val).toLocaleDateString(undefined, { month: 'short' })}
                                            tickLine={false}
                                            axisLine={false}
                                        />
                                        <YAxis stroke="#64748b" tickLine={false} axisLine={false} domain={['auto', 'auto']} />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px', color: '#fff' }}
                                        />
                                        <Line type="monotone" dataKey="value" name={FUND_DATA.name} stroke="#10B981" strokeWidth={3} dot={false} activeDot={{ r: 6 }} />
                                        <Line type="monotone" dataKey="benchmark" name="Benchmark" stroke="#64748b" strokeWidth={2} strokeDasharray="5 5" dot={false} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            {Object.entries(RETURNS_TABLE).map(([key, value]) => (
                                <Card key={key} className="bg-slate-900/30 border-slate-800">
                                    <CardContent className="p-4 flex flex-col items-center justify-center">
                                        <span className="text-slate-500 text-xs font-bold uppercase mb-1">{key}</span>
                                        <span className={`text-xl font-bold ${value >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                            {value > 0 ? '+' : ''}{value}%
                                        </span>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </TabsContent>

                    {/* STRUCTURE TAB */}
                    <TabsContent value="structure" className="space-y-6">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <Card className="bg-slate-900/30 border-slate-800">
                                <CardHeader>
                                    <CardTitle className="text-slate-200">Estrutura do Fundo</CardTitle>
                                </CardHeader>
                                <CardContent className="flex items-center justify-center min-h-[300px] border-2 border-dashed border-slate-800 rounded-lg m-4">
                                    <div className="text-center space-y-4">
                                        <div className="relative">
                                            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-500 mx-auto flex items-center justify-center text-emerald-500 font-bold z-10 relative">
                                                MASTER
                                            </div>
                                            <div className="absolute top-16 left-1/2 w-0.5 h-10 bg-slate-700 -translate-x-1/2"></div>
                                        </div>
                                        <div className="pt-10 flex gap-8 justify-center">
                                            {FUND_DATA.subclasses.map((sub, i) => (
                                                <div key={i} className="flex flex-col items-center">
                                                    <div className="w-12 h-12 rounded-full bg-slate-800 border border-slate-600 flex items-center justify-center text-xs text-slate-300">
                                                        FIC {i + 1}
                                                    </div>
                                                    <span className="text-xs text-slate-500 mt-2 max-w-[80px] text-center">{sub}</span>
                                                </div>
                                            ))}
                                        </div>
                                        <p className="text-xs text-slate-500 mt-4 italic">Visualização Simplificada</p>
                                    </div>
                                </CardContent>
                            </Card>

                            <div className="space-y-6">
                                <Card className="bg-slate-900/30 border-slate-800">
                                    <CardHeader>
                                        <CardTitle className="text-slate-200 text-base">Perfil dos Cotistas</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        {Object.entries(FUND_DATA.client_profile).map(([key, val]) => (
                                            <div key={key}>
                                                <div className="flex justify-between text-sm mb-1">
                                                    <span className="capitalize text-slate-400">{key}</span>
                                                    <span className="text-white font-medium">{val}%</span>
                                                </div>
                                                <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                                                    <div className="h-full bg-indigo-500 transition-all duration-1000" style={{ width: `${val}%` }}></div>
                                                </div>
                                            </div>
                                        ))}
                                    </CardContent>
                                </Card>

                                <Card className="bg-slate-900/30 border-slate-800">
                                    <CardHeader>
                                        <CardTitle className="text-slate-200 text-base">Fundos que investem aqui</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <ul className="space-y-3">
                                            {FUND_DATA.buying_funds.map((f, i) => (
                                                <li key={i} className="flex items-center justify-between text-sm border-b border-slate-800/50 pb-2 last:border-0">
                                                    <span className="text-slate-300 hover:text-emerald-400 cursor-pointer">{f.name}</span>
                                                    <span className="text-xs text-slate-500">{f.manager}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </CardContent>
                                </Card>
                            </div>
                        </div>
                    </TabsContent>

                    {/* AI ANALYST TAB */}
                    <TabsContent value="ai" className="h-[600px] flex gap-4">
                        <Card className="flex-1 bg-slate-950 border-indigo-500/30 border shadow-lg shadow-indigo-500/5 flex flex-col">
                            <CardHeader className="bg-slate-900/50 border-b border-slate-800">
                                <CardTitle className="flex items-center gap-2 text-indigo-400">
                                    <Bot size={20} />
                                    Lab AI Analyst
                                </CardTitle>
                                <CardDescription>Pergunte sobre o regulamento, gestora ou comparações.</CardDescription>
                            </CardHeader>
                            <CardContent className="flex-1 overflow-hidden flex flex-col p-0">
                                <ScrollArea className="flex-1 p-4">
                                    <div className="space-y-4">
                                        {messages.map((msg) => (
                                            <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                                                <div className={`max-w-[80%] rounded-lg p-3 text-sm ${msg.sender === 'user'
                                                        ? 'bg-indigo-600 text-white rounded-br-none'
                                                        : 'bg-slate-800 text-slate-200 rounded-bl-none border border-slate-700'
                                                    }`}>
                                                    <p>{msg.text}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </ScrollArea>
                                <div className="p-4 border-t border-slate-800 bg-slate-900/30">
                                    <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }} className="flex gap-2">
                                        <Input
                                            value={chatInput}
                                            onChange={e => setChatInput(e.target.value)}
                                            placeholder="Ex: Qual o limite de investimento no exterior?"
                                            className="bg-slate-950 border-slate-700 focus:border-indigo-500"
                                        />
                                        <Button type="submit" size="icon" className="bg-indigo-600 hover:bg-indigo-700">
                                            <Send size={18} />
                                        </Button>
                                    </form>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="w-80 hidden xl:flex flex-col bg-slate-900/30 border-slate-800">
                            <CardHeader>
                                <CardTitle className="text-sm text-slate-400 uppercase">Documentos Analisados</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div className="flex items-center gap-3 p-2 bg-slate-800/50 rounded border border-slate-700/50">
                                    <div className="bg-red-500/20 p-2 rounded text-red-400 font-bold text-xs">PDF</div>
                                    <div>
                                        <p className="text-sm font-medium text-slate-300">Regulamento.pdf</p>
                                        <p className="text-xs text-slate-500">2.4 MB • Atualizado hoje</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 p-2 bg-slate-800/50 rounded border border-slate-700/50">
                                    <div className="bg-blue-500/20 p-2 rounded text-blue-400 font-bold text-xs">DOC</div>
                                    <div>
                                        <p className="text-sm font-medium text-slate-300">Lâmina.pdf</p>
                                        <p className="text-xs text-slate-500">1.1 MB • 2023</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                </Tabs>
            </div>

            {/* EDIT DIALOG */}
            <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                <DialogContent className="bg-slate-900 border-slate-800 text-slate-100">
                    <DialogHeader>
                        <DialogTitle>Editar Informações do Fundo</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <label className="text-sm text-slate-400">Descrição do Fundo</label>
                            <Textarea
                                value={fundDesc}
                                onChange={(e) => setFundDesc(e.target.value)}
                                className="bg-slate-950 border-slate-800 min-h-[150px]"
                            />
                        </div>
                    </div>
                    <div className="flex justify-end gap-2">
                        <Button variant="ghost" onClick={() => setIsEditOpen(false)}>Cancelar</Button>
                        <Button className="bg-emerald-500 hover:bg-emerald-600" onClick={() => setIsEditOpen(false)}>Salvar Alterações</Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default FundLab;
