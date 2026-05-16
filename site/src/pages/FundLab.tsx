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
    AlertCircle
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
import { LoadingSkeleton, LoadingSkeleton as Skeleton } from '@/components/ui/LoadingSkeleton';
import { FundingService } from '../services/api';
import { FundSelector } from '@/components/dashboard/FundSelector';
import { FundGraph } from '@/components/cvm/FundGraph';

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
  const [annotations, setAnnotations] = useState<any[]>([]);
  const [newNote, setNewNote] = useState("");
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [annotationTags, setAnnotationTags] = useState<string[]>([]);

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
        staleTime: 1000 * 60 * 60, // 60 min
    });

    const { data: history, isLoading: loadingHistory } = useQuery({
        queryKey: ['history', selectedCnpj],
        queryFn: () => FundingService.getFundHistory(selectedCnpj!),
        enabled: !!selectedCnpj,
        staleTime: 1000 * 60 * 240, // 240 min
    });

    const { data: metrics, isLoading: loadingMetrics } = useQuery({
        queryKey: ['metrics', selectedCnpj],
        queryFn: () => FundingService.getFundMetrics(selectedCnpj!),
        enabled: !!selectedCnpj,
        staleTime: 1000 * 60 * 360, // 360 min
    });

    const { data: composition, isLoading: loadingComposition } = useQuery({
        queryKey: ['composition', selectedCnpj],
        queryFn: () => FundingService.getFundComposition(selectedCnpj!),
        enabled: !!selectedCnpj,
        staleTime: 1000 * 60 * 720, // 720 min
    });

    const { data: portfolio, isLoading: loadingPortfolio } = useQuery({
        queryKey: ['portfolio', selectedCnpj],
        queryFn: () => FundingService.getPortfolioDetailed(selectedCnpj!),
        enabled: !!selectedCnpj,
        staleTime: 1000 * 60 * 60, // 60 min
    });

    const { data: structure, isLoading: loadingStructure } = useQuery({
        queryKey: ['structure', selectedCnpj],
        queryFn: () => FundingService.getFundStructure(selectedCnpj!),
        enabled: !!selectedCnpj,
        staleTime: 1000 * 60 * 60, // 60 min
    });

    const { data: topAssets, isLoading: loadingTopAssets } = useQuery({
        queryKey: ['topAssets', selectedCnpj],
        queryFn: () => FundingService.getTopAssets(selectedCnpj!, 15),
        enabled: !!selectedCnpj,
        staleTime: 1000 * 60 * 60, // 60 min
    });

    useEffect(() => {
        if (fund) {
            setFundDesc(`Fundo de ${fund?.classe || 'Investimento'} gerido por ${fund?.gestor || 'Gestora'}.`);
        }
    }, [fund]);
  // Fetch annotations
  useEffect(() => {
    if (!selectedCnpj) return;
    fetch('/api/annotations/' + selectedCnpj).then(r => r.json()).then(setAnnotations).catch(() => {});
  }, [selectedCnpj]);


    
  const handleAddAnnotation = async (tag?: string) => {
    if (!selectedCnpj || (!newNote.trim() && !tag)) return;
    const tags = tag ? [tag] : annotationTags;
    await fetch('/api/annotations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cnpj_fundo: selectedCnpj, note: newNote || tag || '', tags })
    });
    setNewNote('');
    setShowNoteInput(false);
    setAnnotationTags([]);
    if (selectedCnpj) fetch('/api/annotations/' + selectedCnpj).then(r => r.json()).then(setAnnotations).catch(() => {});
  };

  const handleDeleteAnnotation = async (id: number) => {
    await fetch('/api/annotations/' + id, { method: 'DELETE' });
    if (selectedCnpj) fetch('/api/annotations/' + selectedCnpj).then(r => r.json()).then(setAnnotations).catch(() => {});
  };

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

    // Progressive rendering: each section shows its own skeleton — no global barrier

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
        <div className="bg-[var(--bg-primary)] min-h-screen text-[var(--text-primary)] font-sans">

            {/* --- FUND SELECTOR --- */}
            <div className="py-4 px-6 border-b border-[var(--border-subtle)] bg-[var(--bg-secondary)]">
                <div className="max-w-7xl mx-auto">
                    <div className="flex items-center gap-4">
                        <div className="flex-1 max-w-xl">
                            <FundSelector
                                onSelect={(cnpj) => setSelectedCnpj(cnpj)}
                                selectedCnpj={selectedCnpj || undefined}
                            />
                        </div>
                        <div className="text-sm text-[var(--text-muted)]">
                            Pesquise um fundo para visualizar no Lab
                        </div>
                    </div>
                </div>
            </div>

            {/* --- HERO SECTION --- */}
            <div className="relative overflow-hidden border-b border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-6 lg:p-10">
                <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                    <Building2 size={300} />
                </div>

                <div className="relative z-10 max-w-7xl mx-auto">
                    {loadingFund ? (
                        <div className="space-y-4">
                            <Skeleton variant="text" width={120} height={24} />
                            <Skeleton variant="text" width="60%" height={48} />
                            <Skeleton variant="text" width="40%" height={20} />
                            <div className="flex gap-4 mt-4">
                                <Skeleton variant="card" width={200} height={80} />
                                <Skeleton variant="card" width={200} height={80} />
                            </div>
                        </div>
                    ) : isError || !fund ? (
                        <div className="flex flex-col items-center justify-center py-12 text-[var(--text-muted)]">
                            <AlertCircle className="w-12 h-12 mb-4 text-[var(--negative)]" />
                            <h2 className="text-xl font-semibold text-[var(--text-primary)]">Fundo não encontrado</h2>
                            <p>Verifique o CNPJ e tente novamente.</p>
                        </div>
                    ) : (
                        <>
                            <div className="flex flex-col lg:flex-row justify-between items-start gap-6">
                                <div className="space-y-4 max-w-2xl">
                                    <div className="flex gap-2">
                                        <Badge className="bg-[var(--positive-bg)] text-[var(--positive)] border-[var(--positive)]/20 hover:bg-[var(--positive-bg)] transition-colors">
                                            {fund?.classe || 'Fundo'}
                                        </Badge>
                                        <Badge variant="outline" className="text-[var(--text-muted)] border-[var(--border-default)]">
                                            {fund?.publico_alvo || 'Investidores em Geral'}
                                        </Badge>
                                        {fund?.fundo_cotas === 'S' && (
                                            <Badge variant="outline" className="text-[var(--cvm-color)] border-[var(--cvm-color)]">
                                                FIC
                                            </Badge>
                                        )}
                                    </div>
                                    <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-[var(--text-primary)]">
                                        {fund?.denom_social}
                                    </h1>
                                    <div className="flex items-center gap-2 text-[var(--text-muted)] text-sm md:text-base">
                                        <p className="line-clamp-2 md:line-clamp-none max-w-xl">{fundDesc}</p>
                                        <Button variant="ghost" size="icon" onClick={() => setIsEditOpen(true)} className="h-6 w-6 text-[var(--text-muted)] hover:text-[var(--positive)]">
                                            <Edit3 size={14} />
                                        </Button>
                                    </div>
                                </div>
                                <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
                                    <Card className="bg-[var(--bg-elevated)] border-[var(--border-subtle)] min-w-[200px]">
                                        <CardContent className="p-4">
                                            <p className="text-[var(--text-muted)] text-xs uppercase font-medium">Cota Atual</p>
                                            <div className="flex items-baseline gap-2 mt-1">
                                                <span className="text-2xl font-bold text-[var(--text-primary)]">R$ {lastQuota?.vl_quota?.toFixed(4) || '-'}</span>
                                                {quotaChange !== 0 && (
                                                    <span className={`text-xs flex items-center ${quotaChange >= 0 ? 'text-[var(--positive)]' : 'text-[var(--negative)]'}`}>
                                                        {quotaChange >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                                                        {quotaChange >= 0 ? '+' : ''}{quotaChange.toFixed(2)}%
                                                    </span>
                                                )}
                                            </div>
                                        </CardContent>
                                    </Card>
                                    <Card className="bg-[var(--bg-elevated)] border-[var(--border-subtle)] min-w-[200px]">
                                        <CardContent className="p-4">
                                            <p className="text-[var(--text-muted)] text-xs uppercase font-medium">Patrimônio Líquido</p>
                                            <div className="flex items-baseline gap-2 mt-1">
                                                <span className="text-2xl font-bold text-[var(--text-primary)]">{lastQuota?.vl_patrim_liq ? formatCurrency(lastQuota.vl_patrim_liq) : '-'}</span>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>
                            </div>
                            <div className="flex flex-wrap gap-4 mt-8">
                                <Button variant="outline" className="border-[var(--border-default)] hover:bg-[var(--bg-elevated)] text-[var(--text-secondary)]" onClick={handleExport}>
                                    <Download size={16} className="mr-2" /> Exportar PDF
                                </Button>
                                <Button variant="outline" className="border-[var(--border-default)] hover:bg-[var(--bg-elevated)] text-[var(--text-secondary)]">
                                    <Share2 size={16} className="mr-2" /> Compartilhar
                                </Button>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* --- MAIN CONTENT --- */}
            <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-10 pt-4">
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => setShowNoteInput(v => !v)} className="text-sm px-3 py-1.5 rounded border border-[var(--border-default)] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] transition-colors">
              + Adicionar anotação
            </button>
            <button onClick={() => handleAddAnnotation('favorito')} className="text-sm px-3 py-1.5 rounded border border-[var(--border-default)] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] transition-colors">
              favorito
            </button>
            <button onClick={() => handleAddAnnotation('monitorar')} className="text-sm px-3 py-1.5 rounded border border-[var(--border-default)] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] transition-colors">
              monitorar
            </button>
            <button onClick={() => handleAddAnnotation('suspeito')} className="text-sm px-3 py-1.5 rounded border border-[var(--border-default)] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] transition-colors">
              suspeito
            </button>
          </div>
          {showNoteInput && (
            <div className="mt-2 flex gap-2">
              <textarea
                value={newNote}
                onChange={e => setNewNote(e.target.value)}
                placeholder="Escreva sua anotação..."
                className="flex-1 bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none"
                rows={2}
                onKeyDown={e => { if (e.ctrlKey && e.key === 'Enter') handleAddAnnotation(); }}
              />
              <button onClick={() => handleAddAnnotation()} className="self-start px-3 py-2 bg-[var(--accent-primary)] text-white rounded text-sm">Salvar</button>
            </div>
          )}
          {annotations.length > 0 && (
            <div className="mt-3 space-y-2">
              <p className="text-xs text-[var(--text-muted)] uppercase font-medium">Suas anotações</p>
              {annotations.map(a => (
                <div key={a.id} className="flex items-start justify-between p-2 rounded bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-sm">
                  <div>
                    <p className="text-[var(--text-primary)]">{a.note}</p>
                    <p className="text-[10px] text-[var(--text-muted)] mt-0.5">{a.tags?.join(', ')} · {new Date(a.created_at).toLocaleDateString('pt-BR')}</p>
                  </div>
                  <button onClick={() => handleDeleteAnnotation(a.id)} className="text-[var(--negative)] hover:opacity-70 text-xs">Remover</button>
                </div>
              ))}
            </div>
          )}
        </div>
<div className="max-w-7xl mx-auto p-4 md:p-6 lg:p-10">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
                    <TabsList className="bg-[var(--bg-secondary)] border border-[var(--border-subtle)] p-1 h-auto flex-wrap justify-start w-full md:w-auto">
                        <TabsTrigger value="overview" className="data-[state=active]:bg-[var(--positive)] data-[state=active]:text-white px-4 py-2">Visão Geral</TabsTrigger>
                        <TabsTrigger value="portfolio" className="data-[state=active]:bg-[var(--positive)] data-[state=active]:text-white px-4 py-2">Carteira</TabsTrigger>
                        <TabsTrigger value="performance" className="data-[state=active]:bg-[var(--positive)] data-[state=active]:text-white px-4 py-2">Rentabilidade</TabsTrigger>
                        <TabsTrigger value="structure" className="data-[state=active]:bg-[var(--positive)] data-[state=active]:text-white px-4 py-2">Estrutura</TabsTrigger>
                        <TabsTrigger value="ai" className="data-[state=active]:bg-[var(--accent-primary)] data-[state=active]:text-white px-4 py-2 flex gap-2">
                            <Bot size={16} /> AI Analyst
                        </TabsTrigger>
                    </TabsList>

                    {/* OVERVIEW TAB */}
                    <TabsContent value="overview" className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {loadingFund ? (
                            <div className="space-y-4">
                                <Skeleton variant="card" height={200} />
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <Skeleton variant="card" height={200} />
                                    <Skeleton variant="card" height={200} />
                                    <Skeleton variant="card" height={200} />
                                </div>
                            </div>
                        ) : (
                            <>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                            {/* FEES & TERMS */}
                            <Card className="bg-[var(--bg-secondary)] border-[var(--border-subtle)] md:col-span-2">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2 text-[var(--positive)]">
                                        <Clock size={20} />
                                        Taxas e Prazos
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        <h3 className="text-sm font-medium text-[var(--text-muted)] uppercase tracking-wider">Custos</h3>
                                        <div className="flex justify-between items-center border-b border-[var(--border-subtle)] pb-2">
                                            <span className="text-[var(--text-secondary)]">Taxa de Administração</span>
                                            <span className="font-semibold text-[var(--text-primary)]">{fund?.taxa_adm || '-'}</span>
                                        </div>
                                        <div className="flex justify-between items-center border-b border-[var(--border-subtle)] pb-2">
                                            <span className="text-[var(--text-secondary)]">Taxa de Performance</span>
                                            <span className="font-semibold text-[var(--text-primary)]">{fund?.taxa_perf || '-'}</span>
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <h3 className="text-sm font-medium text-[var(--text-muted)] uppercase tracking-wider">Informações</h3>
                                        <div className="flex justify-between items-center border-b border-[var(--border-subtle)] pb-2">
                                            <span className="text-[var(--text-secondary)]">Benchmark</span>
                                            <span className="font-semibold text-[var(--positive)]">{fund?.benchmark || '-'}</span>
                                        </div>
                                        <div className="flex justify-between items-center border-b border-[var(--border-subtle)] pb-2">
                                            <span className="text-[var(--text-secondary)]">Tipo de Condomínio</span>
                                            <span className="font-semibold text-[var(--text-primary)]">{fund?.condom || '-'}</span>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* ACTORS */}
                            <Card className="bg-[var(--bg-secondary)] border-[var(--border-subtle)]">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2 text-[var(--cvm-color)]">
                                        <Users size={20} />
                                        Atores Principais
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="group cursor-pointer">
                                        <p className="text-xs text-[var(--text-muted)] mb-1">GESTORA (ASSET)</p>
                                        <div className="flex items-center gap-3 p-2 rounded-md hover:bg-[var(--bg-elevated)] transition-colors">
                                            <div className="w-8 h-8 rounded-full bg-[var(--bg-sunken)] flex items-center justify-center text-xs font-bold text-[var(--text-primary)]">
                                                {fund?.gestor?.slice(0, 2).toUpperCase() || 'GE'}
                                            </div>
                                            <div>
                                                <p className="font-semibold text-[var(--text-primary)]">{fund?.gestor || '-'}</p>
                                                <p className="text-xs text-[var(--accent-primary)] group-hover:underline">Ver perfil</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-xs text-[var(--text-muted)] mb-1">ADMINISTRADOR</p>
                                        <p className="font-medium text-[var(--text-secondary)]">{fund?.admin || '-'}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-[var(--text-muted)] mb-1">CUSTODIANTE</p>
                                        <p className="font-medium text-[var(--text-secondary)]">{fund?.custodiante || '-'}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-[var(--text-muted)] mb-1">AUDITOR</p>
                                        <p className="font-medium text-[var(--text-secondary)]">{fund?.auditor || '-'}</p>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* CLASSIFICATION & BENCHMARK */}
                            <Card className="bg-[var(--bg-secondary)] border-[var(--border-subtle)] md:col-span-3">
                                <CardContent className="p-6 grid grid-cols-1 md:grid-cols-5 gap-6">
                                    <div>
                                        <p className="text-xs text-[var(--text-muted)] mb-1">CLASSE CVM</p>
                                        <p className="text-lg font-medium text-[var(--text-primary)]">{fund?.classe || '-'}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-[var(--text-muted)] mb-1">PÚBLICO ALVO</p>
                                        <p className="text-lg font-medium text-[var(--text-primary)]">{fund?.publico_alvo || '-'}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-[var(--text-muted)] mb-1">SITUAÇÃO</p>
                                        <p className={`text-lg font-medium ${fund?.sit === 'EM FUNCIONAMENTO NORMAL' ? 'text-[var(--positive)]' : 'text-[var(--text-muted)]'}`}>
                                            {fund?.sit || '-'}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-[var(--text-muted)] mb-1">COTISTAS</p>
                                        <p className="text-lg font-medium text-[var(--text-primary)]">{lastQuota?.nr_cotst?.toLocaleString('pt-BR') || '-'}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-[var(--text-muted)] mb-1">BENCHMARK</p>
                                        <div className="flex items-center gap-2">
                                            <BarChart3 className="text-[var(--text-muted)]" size={16} />
                                            <p className="text-lg font-medium text-[var(--positive)]">{fund?.benchmark || '-'}</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                            </>
                        )}
                    </TabsContent>


                    {/* PORTFOLIO TAB */}
                    <TabsContent value="portfolio" className="space-y-6">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* ASSET ALLOCATION CHART */}
                            <Card className="bg-[var(--bg-secondary)] border-[var(--border-subtle)] lg:col-span-1">
                                <CardHeader>
                                    <CardTitle className="text-[var(--text-primary)]">Alocação por Tipo</CardTitle>
                                    {composition?.date && (
                                        <p className="text-xs text-[var(--text-muted)]">Ref: {new Date(composition.date).toLocaleDateString('pt-BR')}</p>
                                    )}
                                </CardHeader>
                                <CardContent className="h-[300px]">
                                    {loadingComposition ? (
                                        <div className="h-full flex items-center justify-center">
                                            <LoadingSkeleton variant="chart" height={300} />
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
                                        <div className="h-full flex items-center justify-center text-[var(--text-muted)]">
                                            Composição não disponível
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            {/* ASSETS TABLE */}
                            <Card className="bg-[var(--bg-secondary)] border-[var(--border-subtle)] lg:col-span-2">
                                <CardHeader className="flex flex-row items-center justify-between">
                                    <CardTitle className="text-[var(--text-primary)]">Principais Ativos (Maiores Posições)</CardTitle>
                                    <div className="relative w-48">
                                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-[var(--text-muted)]" />
                                        <Input
                                            placeholder="Filtrar ativo..."
                                            className="pl-8 bg-[var(--bg-elevated)] border-[var(--border-subtle)] h-9"
                                            value={assetFilter}
                                            onChange={(e) => setAssetFilter(e.target.value)}
                                        />
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    {loadingTopAssets ? (
                                        <div className="py-8 flex justify-center">
                                            <LoadingSkeleton variant="table" height={200} />
                                        </div>
                                    ) : (
                                        <Table>
                                            <TableHeader className="bg-[var(--bg-elevated)]">
                                                <TableRow className="border-[var(--border-subtle)] hover:bg-[var(--bg-elevated)]">
                                                    <TableHead className="text-[var(--text-muted)]">Ativo</TableHead>
                                                    <TableHead className="text-[var(--text-muted)]">Tipo</TableHead>
                                                    <TableHead className="text-right text-[var(--text-muted)]">Valor</TableHead>
                                                    <TableHead className="text-right text-[var(--text-muted)]">% PL</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {filteredAssets.slice(0, 10).map((asset, idx) => (
                                                    <TableRow key={idx} className="border-[var(--border-subtle)] hover:bg-[var(--bg-elevated)]/50">
                                                        <TableCell className="font-medium">
                                                            <div className="flex flex-col">
                                                                <span className="text-[var(--text-primary)]">{asset.codigo || asset.nome.slice(0, 10)}</span>
                                                                <span className="text-xs text-[var(--text-muted)] truncate max-w-[200px]">{asset.nome}</span>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge variant="outline" className="text-xs text-[var(--text-muted)] border-[var(--border-default)]">
                                                                {asset.tipo === 'acao' ? 'Ação' :
                                                                    asset.tipo === 'cota_fundo' ? 'Cota Fundo' :
                                                                        asset.tipo === 'titulo_publico' ? 'Título Público' :
                                                                            asset.tipo === 'credito_privado' ? 'Crédito Privado' : asset.tipo}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell className="text-right text-[var(--text-secondary)]">{formatCurrency(asset.valor)}</TableCell>
                                                        <TableCell className="text-right font-bold text-[var(--positive)]">{asset.percentual}%</TableCell>
                                                    </TableRow>
                                                ))}
                                                {filteredAssets.length === 0 && (
                                                    <TableRow>
                                                        <TableCell colSpan={4} className="text-center py-8 text-[var(--text-muted)]">
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
                                    <Card key={idx} className="bg-[var(--bg-secondary)] border-[var(--border-subtle)]">
                                        <CardHeader className="pb-2">
                                            <CardTitle className="text-base text-[var(--text-primary)]">{bloco.nome_display}</CardTitle>
                                            <p className="text-xs text-[var(--text-muted)]">
                                                {formatCurrency(bloco.total_valor)} • {bloco.total_percentual}% do PL
                                            </p>
                                        </CardHeader>
                                        <CardContent>
                                            <ScrollArea className="h-[150px]">
                                                <div className="space-y-2">
                                                    {bloco.ativos.slice(0, 5).map((ativo, i) => (
                                                        <div key={i} className="flex justify-between items-center text-sm">
                                                            <span className="text-[var(--text-secondary)] truncate max-w-[180px]" title={ativo.nome}>
                                                                {ativo.nome}
                                                            </span>
                                                            <span className="text-[var(--positive)] font-medium">{ativo.percentual}%</span>
                                                        </div>
                                                    ))}
                                                    {bloco.ativos.length > 5 && (
                                                        <p className="text-xs text-[var(--text-muted)] text-center pt-2">
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
                        <Card className="bg-[var(--bg-secondary)] border-[var(--border-subtle)]">
                            <CardHeader>
                                <CardTitle className="text-[var(--text-primary)]">Rentabilidade Acumulada</CardTitle>
                                <CardDescription className="text-[var(--text-muted)]">Evolução normalizada (base 100)</CardDescription>
                            </CardHeader>
                            <CardContent className="h-[400px]">
                                {loadingHistory ? (
                                    <div className="h-full flex items-center justify-center">
                                        <LoadingSkeleton variant="chart" height={400} />
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
                                <Card key={year} className="bg-[var(--bg-secondary)] border-[var(--border-subtle)]">
                                    <CardContent className="p-4 flex flex-col items-center justify-center">
                                        <span className="text-[var(--text-muted)] text-xs font-bold uppercase mb-1">{year}</span>
                                        <span className={`text-xl font-bold ${value >= 0 ? 'text-[var(--positive)]' : 'text-[var(--negative)]'}`}>
                                            {value > 0 ? '+' : ''}{value}%
                                        </span>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                        {/* Monthly Returns Table */}
                        {metrics && (
                            <Card className="bg-[var(--bg-secondary)] border-[var(--border-subtle)]">
                                <CardHeader>
                                    <CardTitle className="text-[var(--text-primary)]">Rentabilidade Mensal</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="overflow-x-auto">
                                        <Table>
                                            <TableHeader>
                                                <TableRow className="bg-[var(--bg-sunken)] border-none hover:bg-[var(--bg-sunken)]">
                                                    <TableHead className="text-[var(--text-secondary)] w-20">ANO</TableHead>
                                                    {['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'].map(m => (
                                                        <TableHead key={m} className="text-[var(--text-secondary)] text-center">{m}</TableHead>
                                                    ))}
                                                    <TableHead className="text-[var(--text-secondary)] text-center">Ano</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {Object.keys(metrics.rentabilidade_mes).sort((a, b) => Number(b) - Number(a)).map(year => (
                                                    <TableRow key={year} className="hover:bg-[var(--bg-elevated)]/50 border-[var(--border-subtle)]">
                                                        <TableCell className="font-semibold bg-[var(--bg-elevated)]/30 text-[var(--text-primary)]">{year}</TableCell>
                                                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(month => {
                                                            const val = metrics.rentabilidade_mes[year]?.[month.toString()];
                                                            return (
                                                                <TableCell key={month} className={`text-center text-xs ${val !== undefined ? (val >= 0 ? 'text-[var(--positive)]' : 'text-[var(--negative)]') : 'text-[var(--text-muted)]'}`}>
                                                                    {val !== undefined ? `${val.toFixed(2)}%` : '-'}
                                                                </TableCell>
                                                            );
                                                        })}
                                                        <TableCell className="text-center font-semibold text-xs text-[var(--text-primary)]">
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
                        <FundGraph cnpj={selectedCnpj} />
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <Card className="bg-[var(--bg-secondary)] border-[var(--border-subtle)]">
                                <CardHeader>
                                    <CardTitle className="text-[var(--text-primary)]">Estrutura do Fundo</CardTitle>
                                    {structure && (
                                        <Badge variant="outline" className={`w-fit ${structure.tipo === 'FIC' ? 'text-[var(--cvm-color)] border-[var(--cvm-color)]' : structure.tipo === 'MASTER' ? 'text-[var(--crypto-color)] border-[var(--crypto-color)]' : 'text-[var(--text-muted)] border-[var(--border-default)]'}`}>
                                            {structure.tipo || 'FI'}
                                        </Badge>
                                    )}
                                </CardHeader>
                                <CardContent className="flex items-center justify-center min-h-[300px] border-2 border-dashed border-[var(--border-subtle)] rounded-lg m-4">
                                    {loadingStructure ? (
                                        <LoadingSkeleton variant="card" height={300} />
                                    ) : structure ? (
                                        <div className="text-center space-y-4 w-full p-4">
                                            <div className="relative">
                                                <div className="w-20 h-20 rounded-full bg-[var(--positive-bg)] border-2 border-[var(--positive)] mx-auto flex items-center justify-center text-[var(--positive)] font-bold z-10 relative">
                                                    {structure.tipo || 'FI'}
                                                </div>
                                                {structure.investe_em.length > 0 && (
                                                    <div className="absolute top-20 left-1/2 w-0.5 h-10 bg-[var(--border-strong)] -translate-x-1/2"></div>
                                                )}
                                            </div>
                                            {structure.investe_em.length > 0 && (
                                                <div className="pt-10 flex flex-wrap gap-4 justify-center">
                                                    {structure.investe_em.slice(0, 4).map((rel, i) => (
                                                        <div key={i} className="flex flex-col items-center">
                                                            <div className="w-14 h-14 rounded-full bg-[var(--bg-elevated)] border border-[var(--border-default)] flex items-center justify-center text-xs text-[var(--text-secondary)]">
                                                                FI
                                                            </div>
                                                            <span className="text-xs text-[var(--text-muted)] mt-2 max-w-[100px] text-center truncate" title={rel.nome_relacionado}>
                                                                {rel.nome_relacionado.slice(0, 15)}...
                                                            </span>
                                                        </div>
                                                    ))}
                                                    {structure.investe_em.length > 4 && (
                                                        <div className="flex flex-col items-center">
                                                            <div className="w-14 h-14 rounded-full bg-[var(--bg-elevated)] border border-[var(--border-default)] flex items-center justify-center text-xs text-[var(--text-secondary)]">
                                                                +{structure.investe_em.length - 4}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                            {structure.espelho_de && (
                                                <p className="text-xs text-[var(--accent-primary)] mt-4">
                                                    Espelho de: {structure.espelho_de}
                                                </p>
                                            )}
                                        </div>
                                    ) : (
                                        <p className="text-[var(--text-muted)]">Estrutura não disponível</p>
                                    )}
                                </CardContent>
                            </Card>

                            <div className="space-y-6">
                                {/* Investing in */}
                                {structure?.investe_em && structure.investe_em.length > 0 && (
                                    <Card className="bg-[var(--bg-secondary)] border-[var(--border-subtle)]">
                                        <CardHeader>
                                            <CardTitle className="text-[var(--text-primary)] text-base">Este fundo investe em</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <ScrollArea className="h-[150px]">
                                                <ul className="space-y-3">
                                                    {structure.investe_em.map((f, i) => (
                                                        <li key={i} className="flex items-center justify-between text-sm border-b border-[var(--border-subtle)]/50 pb-2 last:border-0">
                                                            <span className="text-[var(--text-secondary)] hover:text-[var(--positive)] cursor-pointer truncate max-w-[250px]" title={f.nome_relacionado}>
                                                                {f.nome_relacionado}
                                                            </span>
                                                            {f.valor && <span className="text-xs text-[var(--text-muted)]">{formatCurrency(f.valor)}</span>}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </ScrollArea>
                                        </CardContent>
                                    </Card>
                                )}
                                {/* Invested by */}
                                {structure?.investido_por && structure.investido_por.length > 0 && (
                                    <Card className="bg-[var(--bg-secondary)] border-[var(--border-subtle)]">
                                        <CardHeader>
                                            <CardTitle className="text-[var(--text-primary)] text-base">Fundos que investem neste</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <ScrollArea className="h-[150px]">
                                                <ul className="space-y-3">
                                                    {structure.investido_por.map((f, i) => (
                                                        <li key={i} className="flex items-center justify-between text-sm border-b border-[var(--border-subtle)]/50 pb-2 last:border-0">
                                                            <span className="text-[var(--text-secondary)] hover:text-[var(--positive)] cursor-pointer truncate max-w-[250px]" title={f.nome_relacionado}>
                                                                {f.nome_relacionado}
                                                            </span>
                                                            {f.valor && <span className="text-xs text-[var(--text-muted)]">{formatCurrency(f.valor)}</span>}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </ScrollArea>
                                        </CardContent>
                                    </Card>
                                )}
                                {/* Metrics */}
                                {metrics?.consistency && (
                                    <Card className="bg-[var(--bg-secondary)] border-[var(--border-subtle)]">
                                        <CardHeader>
                                            <CardTitle className="text-[var(--text-primary)] text-base">Consistência</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="text-center">
                                                    <p className="text-xs text-[var(--text-muted)]">Meses Positivos</p>
                                                    <p className="text-2xl font-bold text-[var(--positive)]">{metrics.consistency.pos_months}</p>
                                                </div>
                                                <div className="text-center">
                                                    <p className="text-xs text-[var(--text-muted)]">Meses Negativos</p>
                                                    <p className="text-2xl font-bold text-[var(--negative)]">{metrics.consistency.neg_months}</p>
                                                </div>
                                                <div className="text-center">
                                                    <p className="text-xs text-[var(--text-muted)]">Melhor Mês</p>
                                                    <p className="text-lg font-semibold text-[var(--positive)]">{formatPercent(metrics.consistency.best_month)}</p>
                                                </div>
                                                <div className="text-center">
                                                    <p className="text-xs text-[var(--text-muted)]">Pior Mês</p>
                                                    <p className="text-lg font-semibold text-[var(--negative)]">{formatPercent(metrics.consistency.worst_month)}</p>
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
                        {loadingFund ? (
                            <div className="flex-1 space-y-4">
                                <Skeleton variant="card" height={400} />
                            </div>
                        ) : (
                            <>
                                <Card className="flex-1 bg-[var(--bg-secondary)] border-[var(--border-subtle)] flex flex-col">
                            <CardHeader className="bg-[var(--bg-elevated)] border-b border-[var(--border-subtle)]">
                                <CardTitle className="flex items-center gap-2 text-[var(--accent-primary)]">
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
                                                    ? 'bg-[var(--accent-primary)] text-white rounded-br-none'
                                                    : 'bg-[var(--bg-elevated)] text-[var(--text-primary)] rounded-bl-none border border-[var(--border-default)]'
                                                    }`}>
                                                    <p>{msg.text}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </ScrollArea>
                                <div className="p-4 border-t border-[var(--border-subtle)] bg-[var(--bg-secondary)]">
                                    <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }} className="flex gap-2">
                                        <Input
                                            value={chatInput}
                                            onChange={e => setChatInput(e.target.value)}
                                            placeholder="Ex: Qual o limite de investimento no exterior?"
                                            className="bg-[var(--bg-elevated)] border-[var(--border-default)] focus:border-[var(--accent-primary)]"
                                        />
                                        <Button type="submit" size="icon" className="bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)]">
                                        </Button>
                                    </form>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="w-80 hidden xl:flex flex-col bg-[var(--bg-secondary)] border-[var(--border-subtle)]">
                            <CardHeader>
                                <CardTitle className="text-sm text-[var(--text-muted)] uppercase">Informações do Fundo</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div className="flex items-center gap-3 p-2 bg-[var(--bg-elevated)]/50 rounded border border-[var(--border-default)]/50">
                                    <div className="bg-[var(--positive-bg)] p-2 rounded text-[var(--positive)] font-bold text-xs">CNPJ</div>
                                    <div>
                                        <p className="text-sm font-medium text-[var(--text-secondary)]">{fund?.cnpj_fundo}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 p-2 bg-[var(--bg-elevated)]/50 rounded border border-[var(--border-default)]/50">
                                    <div className="bg-[var(--cvm-light)] p-2 rounded text-[var(--cvm-color)] font-bold text-xs">PL</div>
                                    <div>
                                        <p className="text-sm font-medium text-[var(--text-secondary)]">
                                            {lastQuota?.vl_patrim_liq ? formatCurrency(lastQuota.vl_patrim_liq) : '-'}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 p-2 bg-[var(--bg-elevated)]/50 rounded border border-[var(--border-default)]/50">
                                    <div className="bg-[var(--crypto-light)] p-2 rounded text-[var(--crypto-color)] font-bold text-xs">VOL</div>
                                    <div>
                                        <p className="text-sm font-medium text-[var(--text-secondary)]">
                                            {formatPercent(metrics?.volatilidade_12m)}
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                            </>
                        )}
                    </TabsContent>

                </Tabs>
            </div>

            {/* EDIT DIALOG */}
            <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                <DialogContent className="bg-[var(--bg-elevated)] border-[var(--border-subtle)] text-[var(--text-primary)]">
                    <DialogHeader>
                        <DialogTitle>Editar Informações do Fundo</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <label className="text-sm text-[var(--text-muted)]">Descrição do Fundo</label>
                            <Textarea
                                value={fundDesc}
                                onChange={(e) => setFundDesc(e.target.value)}
                                className="bg-[var(--bg-secondary)] border-[var(--border-subtle)] min-h-[150px]"
                            />
                        </div>
                    </div>
                    <div className="flex justify-end gap-2">
                        <Button variant="ghost" onClick={() => setIsEditOpen(false)}>Cancelar</Button>
                        <Button className="bg-[var(--positive)] hover:bg-[var(--positive)]/80" onClick={() => setIsEditOpen(false)}>Salvar Alterações</Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div >
    );
};

export default FundLab;
