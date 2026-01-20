import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { FundingService } from '../services/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
    LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell, Legend
} from 'recharts';
import { TrendingUp, Users, DollarSign, Activity, AlertCircle, Info } from 'lucide-react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const FundDetails = ({ cnpj: propCnpj }: { cnpj?: string }) => {
    const { cnpj: paramCnpj } = useParams<{ cnpj: string }>();
    const cnpj = propCnpj || paramCnpj;


    const { data: fund, isLoading: loadingFund, isError } = useQuery({
        queryKey: ['fund', cnpj],
        queryFn: () => FundingService.getFundDetail(cnpj!),
        enabled: !!cnpj,
        staleTime: 1000 * 60 * 5,
    });

    const { data: history, isLoading: loadingHistory } = useQuery({
        queryKey: ['history', cnpj],
        queryFn: () => FundingService.getFundHistory(cnpj!),
        enabled: !!cnpj,
        staleTime: 1000 * 60 * 5,
    });

    const { data: metrics, isLoading: loadingMetrics } = useQuery({
        queryKey: ['metrics', cnpj],
        queryFn: () => FundingService.getFundMetrics(cnpj!),
        enabled: !!cnpj,
        staleTime: 1000 * 60 * 5,
    });

    const { data: composition, isLoading: loadingComposition } = useQuery({
        queryKey: ['composition', cnpj],
        queryFn: () => FundingService.getFundComposition(cnpj!),
        enabled: !!cnpj,
        staleTime: 1000 * 60 * 5,
    });

    const LoadingSkeleton = () => (
        <div className="bg-[#0F172A] min-h-screen">
            <div className="p-6 space-y-8">
                <div className="space-y-2">
                    <Skeleton className="h-4 w-32 bg-slate-800" />
                    <Skeleton className="h-8 w-1/2 bg-slate-800" />
                    <div className="flex gap-2">
                        <Skeleton className="h-6 w-24 bg-slate-800" />
                        <Skeleton className="h-6 w-24 bg-slate-800" />
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-6 gap-4">
                    {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-24 w-full bg-slate-800" />)}
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <Skeleton className="lg:col-span-2 h-[400px] bg-slate-800" />
                    <div className="space-y-6">
                        <Skeleton className="h-[200px] bg-slate-800" />
                        <Skeleton className="h-[200px] bg-slate-800" />
                    </div>
                </div>
                <Skeleton className="h-[300px] w-full bg-slate-800" />
                <Skeleton className="h-[300px] w-full bg-slate-800" />
            </div>
        </div>
    );

    if (loadingFund || loadingHistory) {
        return <LoadingSkeleton />;
    }

    if (isError || !fund) {
        return (
            <div className="bg-[#0F172A] min-h-screen">
                <div className="flex flex-col items-center justify-center h-[calc(100vh-100px)] text-slate-400">
                    <AlertCircle className="w-12 h-12 mb-4 text-rose-500" />
                    <h2 className="text-xl font-semibold text-slate-200">Fundo não encontrado</h2>
                    <p>Verifique o CNPJ e tente novamente.</p>
                </div>
            </div>
        );
    }

    // Calculate some fallback metrics
    const lastQuota = history && history.length > 0 ? history[history.length - 1] : null;
    const rentabilidade12m = metrics?.rentabilidade_acumulada && Object.keys(metrics.rentabilidade_acumulada).length > 0
        ? Object.values(metrics.rentabilidade_acumulada).pop()
        : 0;

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: "compact" }).format(val);
    };

    const formatPercent = (val: number | undefined) => {
        if (val === undefined || val === null) return '-';
        return `${val.toFixed(2)}%`;
    }

    const COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#6366F1'];

    return (
        <div className="bg-[#0F172A] min-h-screen">
            <div className="p-6 space-y-8 font-sans animate-in fade-in duration-500 pb-20 text-slate-100">
                {/* Header */}

                <div className="space-y-2">
                    <div className="flex items-center space-x-2 text-sm text-slate-400">
                        <span className="cursor-pointer hover:text-slate-200" onClick={() => window.location.href = '/'}>Dashboard</span>
                        <span>/</span>
                        <span>Fundos</span>
                        <span>/</span>
                        <span className="text-emerald-400">{fund.classe || 'Fundo'}</span>
                    </div>
                    <h1 className="text-3xl font-bold text-white tracking-tight">{fund.denom_social || 'Nome Indisponível'}</h1>
                    <div className="flex gap-2 text-xs text-slate-400">
                        <Badge variant="secondary" className="font-normal text-slate-300 bg-slate-800 border border-slate-700 hover:bg-slate-700">
                            CNPJ: {fund.cnpj_fundo}
                        </Badge>
                        <Badge variant="outline" className={`font-normal ${fund.sit === 'EM FUNCIONAMENTO NORMAL' ? 'text-emerald-400 bg-emerald-950/30 border-emerald-800' : 'text-slate-300'}`}>
                            {fund.sit}
                        </Badge>
                    </div>
                </div>

                {/* KPI Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                    <KpiCard
                        title="Patrimônio Líquido"
                        value={lastQuota?.vl_patrim_liq ? formatCurrency(lastQuota.vl_patrim_liq) : '-'}
                        icon={<DollarSign className="w-4 h-4 text-emerald-500" />}
                    />
                    <KpiCard
                        title="Rentabilidade Acum."
                        value={formatPercent(Number(rentabilidade12m))}
                        valueClass={Number(rentabilidade12m) >= 0 ? "text-emerald-500" : "text-rose-500"}
                        icon={<TrendingUp className="w-4 h-4 text-emerald-500" />}
                    />
                    <KpiCard
                        title="Cotistas"
                        value={lastQuota?.nr_cotst?.toString() || '-'}
                        icon={<Users className="w-4 h-4 text-slate-400" />}
                    />
                    <KpiCard
                        title="Volatilidade 12M"
                        value={formatPercent(metrics?.volatilidade_12m)}
                        icon={<Activity className="w-4 h-4 text-slate-400" />}
                    />
                    <KpiCard
                        title="Índice Sharpe"
                        value={metrics?.sharpe_12m?.toFixed(2) || '-'}
                        icon={<Activity className="w-4 h-4 text-slate-400" />}
                    />
                    <KpiCard title="Gestor" value={fund.gestor || '-'} />
                </div>

                {/* Main Charts & Side */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                    {/* Chart Section */}
                    <div className="lg:col-span-2 space-y-6">
                        <Card className="border-0 shadow-sm ring-1 ring-slate-800 bg-[#0F172A]">
                            <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-slate-800">
                                <CardTitle className="text-lg font-medium text-slate-200">Gráfico de Rentabilidade</CardTitle>
                                <Tabs defaultValue="rentabilidade" className="w-[300px]">
                                    <TabsList className="grid w-full grid-cols-2 bg-slate-800">
                                        <TabsTrigger value="rentabilidade" className="data-[state=active]:bg-slate-700 data-[state=active]:text-white text-slate-400">Rentabilidade</TabsTrigger>
                                        <TabsTrigger value="janelas" className="data-[state=active]:bg-slate-700 data-[state=active]:text-white text-slate-400">Janelas Móveis</TabsTrigger>
                                    </TabsList>
                                </Tabs>
                            </CardHeader>
                            <CardContent className="h-[400px] pt-4">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={history}>
                                        <defs>
                                            <linearGradient id="colorQuota" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#10B981" stopOpacity={0.2} />
                                                <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <XAxis
                                            dataKey="dt_comptc"
                                            tickFormatter={(val) => new Date(val).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })}
                                            stroke="#64748b"
                                            fontSize={12}
                                            tickLine={false}
                                            axisLine={false}
                                            minTickGap={30}
                                        />
                                        <YAxis
                                            domain={['auto', 'auto']}
                                            stroke="#64748b"
                                            fontSize={12}
                                            tickLine={false}
                                            axisLine={false}
                                            tickFormatter={(val) => `R$ ${val}`}
                                        />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#1e293b', borderRadius: '8px', border: '1px solid #334155', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', color: '#fff' }}
                                            formatter={(value: number) => [`R$ ${value.toFixed(2)}`, 'Cota']}
                                            labelFormatter={(label) => new Date(label).toLocaleDateString('pt-BR')}
                                        />
                                        <Area
                                            type="monotone"
                                            dataKey="vl_quota"
                                            stroke="#10B981"
                                            strokeWidth={2}
                                            fillOpacity={1}
                                            fill="url(#colorQuota)"
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Sidebar Info Section */}
                    <div className="space-y-6">
                        <Card className="border-0 shadow-sm ring-1 ring-slate-800 bg-[#0F172A]">
                            <CardHeader>
                                <CardTitle className="text-base font-medium text-slate-200">Informações do Fundo</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4 text-sm">
                                <InfoRow label="Administrador" value={fund.admin || '-'} />
                                <InfoRow label="Custodiante" value={fund.custodiante || '-'} />
                                <InfoRow label="Auditor" value={fund.auditor || '-'} />
                                <InfoRow label="Público Alvo" value={fund.publico_alvo || '-'} />
                                <InfoRow label="Classe" value={fund.classe || '-'} />
                            </CardContent>
                        </Card>
                    </div>
                </div>

                {/* Rentabilidade Histórica Table */}
                <Card className="border-0 shadow-sm ring-1 ring-slate-800 bg-[#0F172A]">
                    <CardHeader>
                        <CardTitle className="text-lg font-medium text-slate-200">Rentabilidade Histórica</CardTitle>
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
                                        <TableHead className="text-slate-300 text-center">No ano</TableHead>
                                        <TableHead className="text-slate-300 text-center">Acumulado</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {metrics && Object.keys(metrics.rentabilidade_mes).sort((a, b) => Number(b) - Number(a)).map(year => (
                                        <TableRow key={year} className="hover:bg-slate-800/50 border-slate-800">
                                            <TableCell className="font-semibold bg-slate-800/30 text-slate-200">{year}</TableCell>
                                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(month => {
                                                const val = metrics.rentabilidade_mes[year]?.[month.toString()];
                                                return (
                                                    <TableCell key={month} className={`text-center text-xs ${val >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                                        {val !== undefined ? `${val.toFixed(2)}%` : '-'}
                                                    </TableCell>
                                                );
                                            })}
                                            <TableCell className="text-center font-semibold text-xs text-slate-200">
                                                {metrics.rentabilidade_ano[year] !== undefined ? `${metrics.rentabilidade_ano[year]}%` : '-'}
                                            </TableCell>
                                            <TableCell className="text-center font-semibold text-xs text-slate-400">
                                                {metrics.rentabilidade_acumulada[year] !== undefined ? `${metrics.rentabilidade_acumulada[year]}%` : '-'}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {!metrics && <TableRow><TableCell colSpan={14} className="text-center py-4 text-slate-500">Carregando dados...</TableCell></TableRow>}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>

                {/* Metrics & Consistency & Composition */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Consistência */}
                    <Card className="border-0 shadow-sm ring-1 ring-slate-800 bg-[#0F172A]">
                        <CardHeader>
                            <div className="flex items-center gap-2">
                                <CardTitle className="text-lg font-medium text-slate-200">Consistência</CardTitle>
                                <Info className="w-4 h-4 text-slate-500" />
                            </div>
                            <p className="text-xs text-slate-500 uppercase">{fund.denom_social}</p>
                        </CardHeader>
                        <CardContent>
                            {metrics?.consistency && (
                                <div className="mt-4">
                                    <Table>
                                        <TableHeader className="bg-slate-900">
                                            <TableRow className="border-none hover:bg-slate-900">
                                                <TableHead className="text-slate-300">Meses Positivos</TableHead>
                                                <TableHead className="text-slate-300">Meses Negativos</TableHead>
                                                <TableHead className="text-slate-300">Maior Retorno</TableHead>
                                                <TableHead className="text-slate-300">Menor Retorno</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            <TableRow className="border-slate-800 hover:bg-transparent">
                                                <TableCell className="text-center py-4">
                                                    <div className="text-xl font-bold text-emerald-500">{metrics.consistency.pos_months}</div>
                                                </TableCell>
                                                <TableCell className="text-center py-4">
                                                    <div className="text-xl font-bold text-rose-500">{metrics.consistency.neg_months}</div>
                                                </TableCell>
                                                <TableCell className="text-center py-4">
                                                    <div className="text-base font-semibold text-emerald-500">{metrics.consistency.best_month}%</div>
                                                </TableCell>
                                                <TableCell className="text-center py-4">
                                                    <div className="text-base font-semibold text-rose-500">{metrics.consistency.worst_month}%</div>
                                                </TableCell>
                                            </TableRow>
                                        </TableBody>
                                    </Table>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Composição da Carteira */}
                    <Card className="border-0 shadow-sm ring-1 ring-slate-800 bg-[#0F172A]">
                        <CardHeader>
                            <CardTitle className="text-lg font-medium text-slate-200">Composição da carteira</CardTitle>
                            <p className="text-xs text-slate-500">{composition?.date ? `Ref: ${new Date(composition.date).toLocaleDateString()}` : ''}</p>
                        </CardHeader>
                        <CardContent className="flex flex-col md:flex-row items-center justify-center gap-8">
                            {composition?.items.length > 0 ? (
                                <>
                                    <div className="h-[250px] w-[250px] relative">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={composition.items}
                                                    innerRadius={60}
                                                    outerRadius={100}
                                                    paddingAngle={2}
                                                    dataKey="value"
                                                    stroke="none"
                                                >
                                                    {composition.items.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                    ))}
                                                </Pie>
                                                <Tooltip
                                                    formatter={(val: number) => formatCurrency(val)}
                                                    contentStyle={{ backgroundColor: '#1e293b', borderRadius: '8px', border: '1px solid #334155', color: '#fff' }}
                                                />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                    <div className="flex-1 space-y-2 w-full">
                                        {composition.items.map((item, index) => (
                                            <div key={index} className="flex items-center justify-between text-sm">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                                                    <span className="text-slate-300 truncate max-w-[150px]" title={item.name}>{item.name || 'Outros'}</span>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    <span className="font-medium text-slate-200">{item.percentage}%</span>
                                                    <span className="text-xs text-slate-500 w-20 text-right">{new Intl.NumberFormat('pt-BR', { notation: "compact", style: 'currency', currency: 'BRL' }).format(item.value)}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            ) : (
                                <div className="py-12 text-slate-500 text-sm">Composição não disponível</div>
                            )}
                        </CardContent>
                    </Card>

                </div>

                {/* Technical Charts Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Cotistas */}
                    <Card className="border-0 shadow-sm ring-1 ring-slate-800 bg-[#0F172A]">
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-base font-medium text-slate-200">Cotistas</CardTitle>
                                <div className="text-right">
                                    <div className="text-emerald-500 font-bold text-sm">Atual</div>
                                    <div className="text-slate-200 font-semibold">{lastQuota?.nr_cotst?.toLocaleString('pt-BR') || '-'}</div>
                                </div>
                            </div>
                            <p className="text-xs text-slate-500 uppercase">{fund.denom_social}</p>
                        </CardHeader>
                        <CardContent className="h-[250px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={history}>
                                    <XAxis
                                        dataKey="dt_comptc"
                                        hide
                                    />
                                    <YAxis
                                        domain={['auto', 'auto']}
                                        hide
                                    />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#1e293b', borderRadius: '8px', border: '1px solid #334155', color: '#fff' }}
                                        labelFormatter={(label) => new Date(label).toLocaleDateString('pt-BR')}
                                        formatter={(value: number) => [value.toLocaleString('pt-BR'), 'Cotistas']}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="nr_cotst"
                                        stroke="#10B981"
                                        strokeWidth={2}
                                        dot={false}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>

                    {/* Drawdown */}
                    <Card className="border-0 shadow-sm ring-1 ring-slate-800 bg-[#0F172A]">
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-base font-medium text-slate-200">Drawdown</CardTitle>
                                <div className="text-right">
                                    <div className="text-emerald-500 font-bold text-sm">Atual</div>
                                    <div className="text-slate-200 font-semibold">{(() => {
                                        if (!history || history.length === 0) return '-';
                                        const sorted = [...history].sort((a, b) => new Date(a.dt_comptc).getTime() - new Date(b.dt_comptc).getTime());
                                        let peak = -Infinity;
                                        let currentDD = 0;
                                        for (const h of sorted) {
                                            if (h.vl_quota > peak) peak = h.vl_quota;
                                            currentDD = (h.vl_quota / peak) - 1;
                                        }
                                        return formatPercent(currentDD * 100);
                                    })()}</div>
                                </div>
                            </div>
                            <p className="text-xs text-slate-500 uppercase">{fund.denom_social}</p>
                        </CardHeader>
                        <CardContent className="h-[250px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={(() => {
                                    if (!history) return [];
                                    const sorted = [...history].sort((a, b) => new Date(a.dt_comptc).getTime() - new Date(b.dt_comptc).getTime());
                                    let peak = -Infinity;
                                    return sorted.map(h => {
                                        if (h.vl_quota > peak) peak = h.vl_quota;
                                        const dd = (h.vl_quota / peak) - 1;
                                        return { ...h, drawdown: dd * 100 };
                                    });
                                })()}>
                                    <defs>
                                        <linearGradient id="colorDrawdown" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#EF4444" stopOpacity={0.2} />
                                            <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <XAxis dataKey="dt_comptc" hide />
                                    <YAxis hide />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#1e293b', borderRadius: '8px', border: '1px solid #334155', color: '#fff' }}
                                        labelFormatter={(label) => new Date(label).toLocaleDateString('pt-BR')}
                                        formatter={(value: number) => [`${value.toFixed(2)}%`, 'Drawdown']}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="drawdown"
                                        stroke="#EF4444"
                                        fill="url(#colorDrawdown)"
                                        strokeWidth={2}
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>

                    {/* Patrimônio Líquido */}
                    <Card className="border-0 shadow-sm ring-1 ring-slate-800 bg-[#0F172A]">
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-base font-medium text-slate-200">Patrimônio</CardTitle>
                                <div className="text-right">
                                    <div className="text-emerald-500 font-bold text-sm">Atual</div>
                                    <div className="text-slate-200 font-semibold">{lastQuota?.vl_patrim_liq ? formatCurrency(lastQuota.vl_patrim_liq) : '-'}</div>
                                </div>
                            </div>
                            <p className="text-xs text-slate-500 uppercase">{fund.denom_social}</p>
                        </CardHeader>
                        <CardContent className="h-[250px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={history}>
                                    <defs>
                                        <linearGradient id="colorPatrimonio" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10B981" stopOpacity={0.4} />
                                            <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <XAxis dataKey="dt_comptc" hide />
                                    <YAxis hide />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#1e293b', borderRadius: '8px', border: '1px solid #334155', color: '#fff' }}
                                        labelFormatter={(label) => new Date(label).toLocaleDateString('pt-BR')}
                                        formatter={(value: number) => [formatCurrency(value), 'Patrimônio']}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="vl_patrim_liq"
                                        stroke="#10B981"
                                        fill="url(#colorPatrimonio)"
                                        strokeWidth={2}
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>

                    {/* Volatilidade */}
                    <Card className="border-0 shadow-sm ring-1 ring-slate-800 bg-[#0F172A]">
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-base font-medium text-slate-200">Volatilidade (21d)</CardTitle>
                                <div className="text-right">
                                    <div className="text-emerald-500 font-bold text-sm">Atual</div>
                                    <div className="text-slate-200 font-semibold">{metrics?.volatilidade_12m !== undefined ? formatPercent(metrics.volatilidade_12m) : '-'}</div>
                                    {/* Note: Showing 12m vol here as summary, but chart is 21d rolling if implemented correctly, or maybe just 12m logic? 
                                        User asked for 'Volatilidade' chart. Usually rolling. 
                                        Code below calculates rolling 21d vol. 
                                        The summary 'Atual' could be the last point of rolling vol.
                                    */}
                                </div>
                            </div>
                            <p className="text-xs text-slate-500 uppercase">{fund.denom_social}</p>
                        </CardHeader>
                        <CardContent className="h-[250px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={(() => {
                                    if (!history || history.length < 22) return [];
                                    const sorted = [...history].sort((a, b) => new Date(a.dt_comptc).getTime() - new Date(b.dt_comptc).getTime());

                                    // Calculate returns
                                    const rets = [];
                                    for (let i = 1; i < sorted.length; i++) {
                                        const r = (sorted[i].vl_quota / sorted[i - 1].vl_quota) - 1;
                                        rets.push(r);
                                    }

                                    // Rolling Vol 21d
                                    const window = 21;
                                    const volData = [];
                                    for (let i = window; i < sorted.length; i++) {
                                        const slice = rets.slice(i - window, i);
                                        // std dev
                                        const mean = slice.reduce((a, b) => a + b, 0) / window;
                                        const variance = slice.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / window;
                                        const std = Math.sqrt(variance);
                                        const volAnn = std * Math.sqrt(252);

                                        volData.push({
                                            dt_comptc: sorted[i].dt_comptc,
                                            volatility: volAnn * 100
                                        });
                                    }
                                    return volData;
                                })()}>
                                    <XAxis dataKey="dt_comptc" hide />
                                    <YAxis hide />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#1e293b', borderRadius: '8px', border: '1px solid #334155', color: '#fff' }}
                                        labelFormatter={(label) => new Date(label).toLocaleDateString('pt-BR')}
                                        formatter={(value: number) => [`${value.toFixed(2)}%`, 'Volatilidade']}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="volatility"
                                        stroke="#10B981"
                                        strokeWidth={2}
                                        dot={false}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                </div>



            </div>
        </div>
    );
};

// Helper Components
const KpiCard = ({ title, value, icon, className, valueClass }: { title: string, value: string, icon?: React.ReactNode, className?: string, valueClass?: string }) => (
    <Card className={`border-0 shadow-sm ring-1 ring-slate-800 bg-[#0F172A] ${className}`}>
        <CardContent className="p-4 flex flex-col justify-between h-full">
            <div className="text-xs font-medium text-slate-400 mb-2 flex items-center justify-between">
                {title}
                {icon}
            </div>
            <div className={`text-xl font-bold ${valueClass || 'text-slate-100'}`}>
                {value}
            </div>
        </CardContent>
    </Card>
);

const InfoRow = ({ label, value }: { label: string, value: string }) => (
    <div className="flex flex-col border-b border-slate-800 pb-2 last:border-0 last:pb-0">
        <span className="text-xs text-slate-500">{label}</span>
        <span className="text-slate-300 font-medium truncate" title={value}>{value}</span>
    </div>
);

export default FundDetails;
