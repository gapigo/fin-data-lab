import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
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
    Share2,
    Edit3,
    Send,
    Bot,
    AlertCircle,
    Loader2
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
import { Skeleton } from '@/components/ui/skeleton';
import { FundingService } from '../services/api';
import { FundSelector } from '@/components/dashboard/FundSelector';

const COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#6366F1', '#14B8A6'];

const CHAT_MESSAGES_INITIAL = [
    { id: 1, sender: 'ai', text: "Olá! Sou o analista virtual do Lab. Posso ajudar com dúvidas sobre este fundo, limites de investimento, política de investimento ou histórico. O que deseja saber?" }
];

// Utility functions
const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: "compact" }).format(val);
};

const formatPercent = (val: number | undefined) => {
    if (val === undefined || val === null) return '-';
    return `${val.toFixed(2)}%`;
};

interface FundLabProps {
    initialCnpj?: string | null;
    defaultTab?: string;
}

const FundLab = ({ initialCnpj, defaultTab = "overview" }: FundLabProps) => {
    const location = useLocation();
    const [activeTab, setActiveTab] = useState(defaultTab);
    const [chatInput, setChatInput] = useState("");
    const [messages, setMessages] = useState(CHAT_MESSAGES_INITIAL);
    const [fundDesc, setFundDesc] = useState("");
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [selectedCnpj, setSelectedCnpj] = useState<string | null>(null);
    const [assetFilter, setAssetFilter] = useState("");

    // Receive CNPJ from props (Flagship Peer), navigation state, or default
    useEffect(() => {
        if (initialCnpj) {
            setSelectedCnpj(initialCnpj);
        } else {
            const state = location.state as { cnpj?: string } | null;
            if (state?.cnpj) {
                setSelectedCnpj(state.cnpj);
            } else {
                setSelectedCnpj("29.206.196/0001-57");
            }
        }
    }, [initialCnpj, location.state]);

    // API Queries
    const { data: fund, isLoading: loadingFund, isError } = useQuery({
        queryKey: ['fund', selectedCnpj],
        queryFn: () => FundingService.getFundDetail(selectedCnpj!),
        enabled: !!selectedCnpj,
        staleTime: 1000 * 60 * 5,
    });

    const { data: history, isLoading: loadingHistory } = useQuery({
        queryKey: ['history', selectedCnpj],
        queryFn: () => FundingService.getFundHistory(selectedCnpj!),
        enabled: !!selectedCnpj,
        staleTime: 1000 * 60 * 5,
    });

    const { data: metrics, isLoading: loadingMetrics } = useQuery({
        queryKey: ['metrics', selectedCnpj],
        queryFn: () => FundingService.getFundMetrics(selectedCnpj!),
        enabled: !!selectedCnpj,
        staleTime: 1000 * 60 * 5,
    });

    const { data: composition, isLoading: loadingComposition } = useQuery({
        queryKey: ['composition', selectedCnpj],
        queryFn: () => FundingService.getFundComposition(selectedCnpj!),
        enabled: !!selectedCnpj,
        staleTime: 1000 * 60 * 5,
    });

    const { data: portfolio, isLoading: loadingPortfolio } = useQuery({
        queryKey: ['portfolio', selectedCnpj],
        queryFn: () => FundingService.getPortfolioDetailed(selectedCnpj!),
        enabled: !!selectedCnpj,
        staleTime: 1000 * 60 * 5,
    });

    const { data: structure, isLoading: loadingStructure } = useQuery({
        queryKey: ['structure', selectedCnpj],
        queryFn: () => FundingService.getFundStructure(selectedCnpj!),
        enabled: !!selectedCnpj,
        staleTime: 1000 * 60 * 5,
    });

    const { data: topAssets, isLoading: loadingTopAssets } = useQuery({
        queryKey: ['topAssets', selectedCnpj],
        queryFn: () => FundingService.getTopAssets(selectedCnpj!, 15),
        enabled: !!selectedCnpj,
        staleTime: 1000 * 60 * 5,
    });

    useEffect(() => {
        if (fund) {
            setFundDesc(`Fundo de ${fund.classe || 'Investimento'} gerido por ${fund.gestor || 'Gestora'}.`);
        }
    }, [fund]);

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
                text: "Estou analisando essa informação nos documentos oficiais da CVM... (Funcionalidade em desenvolvimento)"
            }]);
        }, 1500);
    };

    const handleExport = () => {
        alert("Iniciando exportação para PDF... (Funcionalidade em desenvolvimento)");
    };

    // Loading State
    if (loadingFund) {
        return (
            <div className="bg-[#020617] min-h-screen text-slate-100 font-sans p-6">
                <div className="max-w-7xl mx-auto space-y-6">
                    <Skeleton className="h-8 w-1/3 bg-slate-800" />
                    <Skeleton className="h-12 w-2/3 bg-slate-800" />
                    <div className="grid grid-cols-2 gap-4">
                        <Skeleton className="h-24 bg-slate-800" />
                        <Skeleton className="h-24 bg-slate-800" />
                    </div>
                    <Skeleton className="h-[400px] bg-slate-800" />
                </div>
            </div>
        );
    }

    // Error State
    if (isError || !fund) {
        return (
            <div className="bg-[#020617] min-h-screen text-slate-100 font-sans">
                <div className="flex flex-col items-center justify-center h-[calc(100vh-100px)] text-slate-400">
                    <AlertCircle className="w-12 h-12 mb-4 text-rose-500" />
                    <h2 className="text-xl font-semibold text-slate-200">Fundo não encontrado</h2>
                    <p>Verifique o CNPJ e tente novamente.</p>
                </div>
            </div>
        );
    }

    // Calculate derived data
    const lastQuota = history && history.length > 0 ? history[history.length - 1] : null;
    const prevQuota = history && history.length > 1 ? history[history.length - 2] : null;
    const quotaChange = lastQuota && prevQuota ? ((lastQuota.vl_quota / prevQuota.vl_quota) - 1) * 100 : 0;

    const rentabilidadeAcum = metrics?.rentabilidade_acumulada
        ? Object.values(metrics.rentabilidade_acumulada).pop()
        : 0;

    // Performance data for chart (normalize to 100)
    const performanceData = history ? (() => {
        const sorted = [...history].sort((a, b) => new Date(a.dt_comptc).getTime() - new Date(b.dt_comptc).getTime());
        const firstQuota = sorted[0]?.vl_quota || 1;
        return sorted.map(h => ({
            date: h.dt_comptc,
            value: (h.vl_quota / firstQuota) * 100
        }));
    })() : [];

    // Filter top assets
    const filteredAssets = topAssets?.filter(a =>
        a.nome.toLowerCase().includes(assetFilter.toLowerCase()) ||
        (a.codigo && a.codigo.toLowerCase().includes(assetFilter.toLowerCase()))
    ) || [];

    return (
        <div className="bg-[#020617] min-h-screen text-slate-100 font-sans selection:bg-emerald-500/30">

            {/* --- FUND SELECTOR --- */}
            <div className="py-4 px-6 border-b border-slate-800 bg-[#0F172A]">
                <div className="max-w-7xl mx-auto">
                    <div className="flex items-center gap-4">
                        <div className="flex-1 max-w-xl">
                            <FundSelector
                                onSelect={(cnpj) => setSelectedCnpj(cnpj)}
                                selectedCnpj={selectedCnpj || undefined}
                            />
                        </div>
                        <div className="text-sm text-slate-500">
                            Pesquise um fundo para visualizar no Lab
                        </div>
                    </div>
                </div>
            </div>

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
                                    {fund.classe || 'Fundo'}
                                </Badge>
                                <Badge variant="outline" className="text-slate-400 border-slate-700">
                                    {fund.publico_alvo || 'Investidores em Geral'}
                                </Badge>
                                {fund.fundo_cotas === 'S' && (
                                    <Badge variant="outline" className="text-blue-400 border-blue-700">
                                        FIC
                                    </Badge>
                                )}
                            </div>

                            <h1 className="text-3xl md:text-5xl font-bold tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
                                {fund.denom_social}
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
                                        <span className="text-2xl font-bold text-white">
                                            R$ {lastQuota?.vl_quota?.toFixed(4) || '-'}
                                        </span>
                                        {quotaChange !== 0 && (
                                            <span className={`text-xs flex items-center ${quotaChange >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                {quotaChange >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                                                {quotaChange >= 0 ? '+' : ''}{quotaChange.toFixed(2)}%
                                            </span>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm min-w-[200px]">
                                <CardContent className="p-4">
                                    <p className="text-slate-500 text-xs uppercase font-medium">Patrimônio Líquido</p>
                                    <div className="flex items-baseline gap-2 mt-1">
                                        <span className="text-2xl font-bold text-white">
                                            {lastQuota?.vl_patrim_liq ? formatCurrency(lastQuota.vl_patrim_liq) : '-'}
                                        </span>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-4 mt-8">
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
                                            <span className="font-semibold text-white">{fund.taxa_adm || '-'}</span>
                                        </div>
                                        <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                                            <span className="text-slate-300">Taxa de Performance</span>
                                            <span className="font-semibold text-white">{fund.taxa_perf || '-'}</span>
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wider">Informações</h3>
                                        <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                                            <span className="text-slate-300">Benchmark</span>
                                            <span className="font-semibold text-emerald-400">{fund.benchmark || '-'}</span>
                                        </div>
                                        <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                                            <span className="text-slate-300">Tipo de Condomínio</span>
                                            <span className="font-semibold text-white">{fund.condom || '-'}</span>
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
                                            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold">
                                                {fund.gestor?.slice(0, 2).toUpperCase() || 'GE'}
                                            </div>
                                            <div>
                                                <p className="font-semibold text-white">{fund.gestor || '-'}</p>
                                                <p className="text-xs text-blue-400 group-hover:underline">Ver perfil</p>
                                            </div>
                                        </div>
                                    </div>
                                    <Separator className="bg-slate-800" />
                                    <div>
                                        <p className="text-xs text-slate-500 mb-1">ADMINISTRADOR</p>
                                        <p className="font-medium text-slate-300">{fund.admin || '-'}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-500 mb-1">CUSTODIANTE</p>
                                        <p className="font-medium text-slate-300">{fund.custodiante || '-'}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-500 mb-1">AUDITOR</p>
                                        <p className="font-medium text-slate-300">{fund.auditor || '-'}</p>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* CLASSIFICATION & BENCHMARK */}
                            <Card className="bg-slate-900/30 border-slate-800 md:col-span-3">
                                <CardContent className="p-6 grid grid-cols-1 md:grid-cols-5 gap-6">
                                    <div>
                                        <p className="text-xs text-slate-500 mb-1">CLASSE CVM</p>
                                        <p className="text-lg font-medium text-white">{fund.classe || '-'}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-500 mb-1">PÚBLICO ALVO</p>
                                        <p className="text-lg font-medium text-white">{fund.publico_alvo || '-'}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-500 mb-1">SITUAÇÃO</p>
                                        <p className={`text-lg font-medium ${fund.sit === 'EM FUNCIONAMENTO NORMAL' ? 'text-emerald-400' : 'text-slate-400'}`}>
                                            {fund.sit || '-'}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-500 mb-1">COTISTAS</p>
                                        <p className="text-lg font-medium text-white">{lastQuota?.nr_cotst?.toLocaleString('pt-BR') || '-'}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-500 mb-1">BENCHMARK</p>
                                        <div className="flex items-center gap-2">
                                            <BarChart3 className="text-slate-400" size={16} />
                                            <p className="text-lg font-medium text-emerald-400">{fund.benchmark || '-'}</p>
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
                                    {composition?.date && (
                                        <p className="text-xs text-slate-500">Ref: {new Date(composition.date).toLocaleDateString('pt-BR')}</p>
                                    )}
                                </CardHeader>
                                <CardContent className="h-[300px]">
                                    {loadingComposition ? (
                                        <div className="h-full flex items-center justify-center">
                                            <Loader2 className="animate-spin text-slate-500" />
                                        </div>
                                    ) : composition?.items && composition.items.length > 0 ? (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={composition.items}
                                                    innerRadius={60}
                                                    outerRadius={80}
                                                    paddingAngle={5}
                                                    dataKey="value"
                                                    nameKey="name"
                                                >
                                                    {composition.items.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="none" />
                                                    ))}
                                                </Pie>
                                                <Tooltip
                                                    contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px', color: '#fff' }}
                                                    formatter={(value: number) => formatCurrency(value)}
                                                />
                                                <Legend verticalAlign="bottom" height={36} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    ) : (
                                        <div className="h-full flex items-center justify-center text-slate-500">
                                            Composição não disponível
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            {/* ASSETS TABLE */}
                            <Card className="bg-slate-900/30 border-slate-800 lg:col-span-2">
                                <CardHeader className="flex flex-row items-center justify-between">
                                    <CardTitle className="text-slate-200">Principais Ativos (Maiores Posições)</CardTitle>
                                    <div className="relative w-48">
                                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-500" />
                                        <Input
                                            placeholder="Filtrar ativo..."
                                            className="pl-8 bg-slate-950/50 border-slate-800 h-9"
                                            value={assetFilter}
                                            onChange={(e) => setAssetFilter(e.target.value)}
                                        />
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    {loadingTopAssets ? (
                                        <div className="py-8 flex justify-center">
                                            <Loader2 className="animate-spin text-slate-500" />
                                        </div>
                                    ) : (
                                        <Table>
                                            <TableHeader className="bg-slate-950/50">
                                                <TableRow className="border-slate-800 hover:bg-slate-950/50">
                                                    <TableHead className="text-slate-400">Ativo</TableHead>
                                                    <TableHead className="text-slate-400">Tipo</TableHead>
                                                    <TableHead className="text-right text-slate-400">Valor</TableHead>
                                                    <TableHead className="text-right text-slate-400">% PL</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {filteredAssets.slice(0, 10).map((asset, idx) => (
                                                    <TableRow key={idx} className="border-slate-800 hover:bg-slate-800/50">
                                                        <TableCell className="font-medium">
                                                            <div className="flex flex-col">
                                                                <span className="text-white">{asset.codigo || asset.nome.slice(0, 10)}</span>
                                                                <span className="text-xs text-slate-500 truncate max-w-[200px]">{asset.nome}</span>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge variant="outline" className="text-xs text-slate-400 border-slate-700">
                                                                {asset.tipo === 'acao' ? 'Ação' :
                                                                    asset.tipo === 'cota_fundo' ? 'Cota Fundo' :
                                                                        asset.tipo === 'titulo_publico' ? 'Título Público' :
                                                                            asset.tipo === 'credito_privado' ? 'Crédito Privado' : asset.tipo}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell className="text-right text-slate-300">{formatCurrency(asset.valor)}</TableCell>
                                                        <TableCell className="text-right font-bold text-emerald-400">{asset.percentual}%</TableCell>
                                                    </TableRow>
                                                ))}
                                                {filteredAssets.length === 0 && (
                                                    <TableRow>
                                                        <TableCell colSpan={4} className="text-center py-8 text-slate-500">
                                                            Nenhum ativo encontrado
                                                        </TableCell>
                                                    </TableRow>
                                                )}
                                            </TableBody>
                                        </Table>
                                    )}
                                </CardContent>
                            </Card>
                        </div>

                        {/* Portfolio Blocks */}
                        {portfolio?.blocos && portfolio.blocos.length > 0 && (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {portfolio.blocos.map((bloco, idx) => (
                                    <Card key={idx} className="bg-slate-900/30 border-slate-800">
                                        <CardHeader className="pb-2">
                                            <CardTitle className="text-base text-slate-200">{bloco.nome_display}</CardTitle>
                                            <p className="text-xs text-slate-500">
                                                {formatCurrency(bloco.total_valor)} • {bloco.total_percentual}% do PL
                                            </p>
                                        </CardHeader>
                                        <CardContent>
                                            <ScrollArea className="h-[150px]">
                                                <div className="space-y-2">
                                                    {bloco.ativos.slice(0, 5).map((ativo, i) => (
                                                        <div key={i} className="flex justify-between items-center text-sm">
                                                            <span className="text-slate-300 truncate max-w-[180px]" title={ativo.nome}>
                                                                {ativo.nome}
                                                            </span>
                                                            <span className="text-emerald-400 font-medium">{ativo.percentual}%</span>
                                                        </div>
                                                    ))}
                                                    {bloco.ativos.length > 5 && (
                                                        <p className="text-xs text-slate-500 text-center pt-2">
                                                            +{bloco.ativos.length - 5} outros ativos
                                                        </p>
                                                    )}
                                                </div>
                                            </ScrollArea>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </TabsContent>

                    {/* PERFORMANCE TAB */}
                    <TabsContent value="performance" className="space-y-6">
                        <Card className="bg-slate-900/30 border-slate-800">
                            <CardHeader>
                                <CardTitle className="text-slate-200">Rentabilidade Acumulada</CardTitle>
                                <CardDescription className="text-slate-400">Evolução normalizada (base 100)</CardDescription>
                            </CardHeader>
                            <CardContent className="h-[400px]">
                                {loadingHistory ? (
                                    <div className="h-full flex items-center justify-center">
                                        <Loader2 className="animate-spin text-slate-500" />
                                    </div>
                                ) : (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={performanceData}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.2} vertical={false} />
                                            <XAxis
                                                dataKey="date"
                                                stroke="#64748b"
                                                tickFormatter={(val) => new Date(val).toLocaleDateString(undefined, { month: 'short', year: '2-digit' })}
                                                tickLine={false}
                                                axisLine={false}
                                                minTickGap={50}
                                            />
                                            <YAxis stroke="#64748b" tickLine={false} axisLine={false} domain={['auto', 'auto']} />
                                            <Tooltip
                                                contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px', color: '#fff' }}
                                                labelFormatter={(label) => new Date(label).toLocaleDateString('pt-BR')}
                                                formatter={(value: number) => [`${value.toFixed(2)}`, 'Índice']}
                                            />
                                            <Line type="monotone" dataKey="value" name="Fundo" stroke="#10B981" strokeWidth={3} dot={false} activeDot={{ r: 6 }} />
                                        </LineChart>
                                    </ResponsiveContainer>
                                )}
                            </CardContent>
                        </Card>

                        {/* Returns summary */}
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                            {metrics && Object.entries(metrics.rentabilidade_ano).sort((a, b) => Number(b[0]) - Number(a[0])).slice(0, 6).map(([year, value]) => (
                                <Card key={year} className="bg-slate-900/30 border-slate-800">
                                    <CardContent className="p-4 flex flex-col items-center justify-center">
                                        <span className="text-slate-500 text-xs font-bold uppercase mb-1">{year}</span>
                                        <span className={`text-xl font-bold ${value >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                            {value > 0 ? '+' : ''}{value}%
                                        </span>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>

                        {/* Monthly Returns Table */}
                        {metrics && (
                            <Card className="bg-slate-900/30 border-slate-800">
                                <CardHeader>
                                    <CardTitle className="text-slate-200">Rentabilidade Mensal</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="overflow-x-auto">
                                        <Table>
                                            <TableHeader>
                                                <TableRow className="bg-slate-900 border-none hover:bg-slate-900">
                                                    <TableHead className="text-slate-300 w-20">ANO</TableHead>
                                                    {['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'].map(m => (
                                                        <TableHead key={m} className="text-slate-300 text-center">{m}</TableHead>
                                                    ))}
                                                    <TableHead className="text-slate-300 text-center">Ano</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {Object.keys(metrics.rentabilidade_mes).sort((a, b) => Number(b) - Number(a)).map(year => (
                                                    <TableRow key={year} className="hover:bg-slate-800/50 border-slate-800">
                                                        <TableCell className="font-semibold bg-slate-800/30 text-slate-200">{year}</TableCell>
                                                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(month => {
                                                            const val = metrics.rentabilidade_mes[year]?.[month.toString()];
                                                            return (
                                                                <TableCell key={month} className={`text-center text-xs ${val !== undefined ? (val >= 0 ? 'text-emerald-500' : 'text-rose-500') : 'text-slate-600'}`}>
                                                                    {val !== undefined ? `${val.toFixed(2)}%` : '-'}
                                                                </TableCell>
                                                            );
                                                        })}
                                                        <TableCell className="text-center font-semibold text-xs text-slate-200">
                                                            {metrics.rentabilidade_ano[year] !== undefined ? `${metrics.rentabilidade_ano[year]}%` : '-'}
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </TabsContent>

                    {/* STRUCTURE TAB */}
                    <TabsContent value="structure" className="space-y-6">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <Card className="bg-slate-900/30 border-slate-800">
                                <CardHeader>
                                    <CardTitle className="text-slate-200">Estrutura do Fundo</CardTitle>
                                    {structure && (
                                        <Badge variant="outline" className={`w-fit ${structure.tipo === 'FIC' ? 'text-blue-400 border-blue-700' : structure.tipo === 'MASTER' ? 'text-purple-400 border-purple-700' : 'text-slate-400 border-slate-700'}`}>
                                            {structure.tipo || 'FI'}
                                        </Badge>
                                    )}
                                </CardHeader>
                                <CardContent className="flex items-center justify-center min-h-[300px] border-2 border-dashed border-slate-800 rounded-lg m-4">
                                    {loadingStructure ? (
                                        <Loader2 className="animate-spin text-slate-500" />
                                    ) : structure ? (
                                        <div className="text-center space-y-4 w-full p-4">
                                            <div className="relative">
                                                <div className="w-20 h-20 rounded-full bg-emerald-500/20 border-2 border-emerald-500 mx-auto flex items-center justify-center text-emerald-500 font-bold z-10 relative">
                                                    {structure.tipo || 'FI'}
                                                </div>
                                                {structure.investe_em.length > 0 && (
                                                    <div className="absolute top-20 left-1/2 w-0.5 h-10 bg-slate-700 -translate-x-1/2"></div>
                                                )}
                                            </div>
                                            {structure.investe_em.length > 0 && (
                                                <div className="pt-10 flex flex-wrap gap-4 justify-center">
                                                    {structure.investe_em.slice(0, 4).map((rel, i) => (
                                                        <div key={i} className="flex flex-col items-center">
                                                            <div className="w-14 h-14 rounded-full bg-slate-800 border border-slate-600 flex items-center justify-center text-xs text-slate-300">
                                                                FI
                                                            </div>
                                                            <span className="text-xs text-slate-500 mt-2 max-w-[100px] text-center truncate" title={rel.nome_relacionado}>
                                                                {rel.nome_relacionado.slice(0, 15)}...
                                                            </span>
                                                        </div>
                                                    ))}
                                                    {structure.investe_em.length > 4 && (
                                                        <div className="flex flex-col items-center">
                                                            <div className="w-14 h-14 rounded-full bg-slate-800 border border-slate-600 flex items-center justify-center text-xs text-slate-300">
                                                                +{structure.investe_em.length - 4}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                            {structure.espelho_de && (
                                                <p className="text-xs text-blue-400 mt-4">
                                                    Espelho de: {structure.espelho_de}
                                                </p>
                                            )}
                                        </div>
                                    ) : (
                                        <p className="text-slate-500">Estrutura não disponível</p>
                                    )}
                                </CardContent>
                            </Card>

                            <div className="space-y-6">
                                {/* Investing in */}
                                {structure?.investe_em && structure.investe_em.length > 0 && (
                                    <Card className="bg-slate-900/30 border-slate-800">
                                        <CardHeader>
                                            <CardTitle className="text-slate-200 text-base">Este fundo investe em</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <ScrollArea className="h-[150px]">
                                                <ul className="space-y-3">
                                                    {structure.investe_em.map((f, i) => (
                                                        <li key={i} className="flex items-center justify-between text-sm border-b border-slate-800/50 pb-2 last:border-0">
                                                            <span className="text-slate-300 hover:text-emerald-400 cursor-pointer truncate max-w-[250px]" title={f.nome_relacionado}>
                                                                {f.nome_relacionado}
                                                            </span>
                                                            {f.valor && <span className="text-xs text-slate-500">{formatCurrency(f.valor)}</span>}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </ScrollArea>
                                        </CardContent>
                                    </Card>
                                )}

                                {/* Invested by */}
                                {structure?.investido_por && structure.investido_por.length > 0 && (
                                    <Card className="bg-slate-900/30 border-slate-800">
                                        <CardHeader>
                                            <CardTitle className="text-slate-200 text-base">Fundos que investem neste</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <ScrollArea className="h-[150px]">
                                                <ul className="space-y-3">
                                                    {structure.investido_por.map((f, i) => (
                                                        <li key={i} className="flex items-center justify-between text-sm border-b border-slate-800/50 pb-2 last:border-0">
                                                            <span className="text-slate-300 hover:text-emerald-400 cursor-pointer truncate max-w-[250px]" title={f.nome_relacionado}>
                                                                {f.nome_relacionado}
                                                            </span>
                                                            {f.valor && <span className="text-xs text-slate-500">{formatCurrency(f.valor)}</span>}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </ScrollArea>
                                        </CardContent>
                                    </Card>
                                )}

                                {/* Metrics */}
                                {metrics?.consistency && (
                                    <Card className="bg-slate-900/30 border-slate-800">
                                        <CardHeader>
                                            <CardTitle className="text-slate-200 text-base">Consistência</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="text-center">
                                                    <p className="text-xs text-slate-500">Meses Positivos</p>
                                                    <p className="text-2xl font-bold text-emerald-400">{metrics.consistency.pos_months}</p>
                                                </div>
                                                <div className="text-center">
                                                    <p className="text-xs text-slate-500">Meses Negativos</p>
                                                    <p className="text-2xl font-bold text-rose-400">{metrics.consistency.neg_months}</p>
                                                </div>
                                                <div className="text-center">
                                                    <p className="text-xs text-slate-500">Melhor Mês</p>
                                                    <p className="text-lg font-semibold text-emerald-400">{formatPercent(metrics.consistency.best_month)}</p>
                                                </div>
                                                <div className="text-center">
                                                    <p className="text-xs text-slate-500">Pior Mês</p>
                                                    <p className="text-lg font-semibold text-rose-400">{formatPercent(metrics.consistency.worst_month)}</p>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                )}
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
                                <CardDescription>Pergunte sobre o fundo, regulamento ou comparações.</CardDescription>
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
                                <CardTitle className="text-sm text-slate-400 uppercase">Informações do Fundo</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div className="flex items-center gap-3 p-2 bg-slate-800/50 rounded border border-slate-700/50">
                                    <div className="bg-emerald-500/20 p-2 rounded text-emerald-400 font-bold text-xs">CNPJ</div>
                                    <div>
                                        <p className="text-sm font-medium text-slate-300">{fund.cnpj_fundo}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 p-2 bg-slate-800/50 rounded border border-slate-700/50">
                                    <div className="bg-blue-500/20 p-2 rounded text-blue-400 font-bold text-xs">PL</div>
                                    <div>
                                        <p className="text-sm font-medium text-slate-300">
                                            {lastQuota?.vl_patrim_liq ? formatCurrency(lastQuota.vl_patrim_liq) : '-'}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 p-2 bg-slate-800/50 rounded border border-slate-700/50">
                                    <div className="bg-purple-500/20 p-2 rounded text-purple-400 font-bold text-xs">VOL</div>
                                    <div>
                                        <p className="text-sm font-medium text-slate-300">
                                            {formatPercent(metrics?.volatilidade_12m)}
                                        </p>
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
        </div >
    );
};

export default FundLab;
