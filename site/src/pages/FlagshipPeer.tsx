
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Plus, ArrowUpDown, Trash2, GripVertical, ChevronDown, Search, Check, Building2,
    ArrowUp, ArrowDown, Settings2, Eye, EyeOff, Copy
} from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    Treemap, Cell
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// --- UTILITIES ---
const formatKMB = (num: number): string => {
    if (Math.abs(num) >= 1e9) return (num / 1e9).toFixed(1) + 'B';
    if (Math.abs(num) >= 1e6) return (num / 1e6).toFixed(1) + 'M';
    if (Math.abs(num) >= 1e3) return (num / 1e3).toFixed(1) + 'K';
    return num.toFixed(0);
};

const getQuartileColor = (q: number) => {
    if (q === 1) return 'bg-emerald-500/20 text-emerald-400';
    if (q === 2) return 'bg-yellow-500/20 text-yellow-400'; // Changed to yellow
    if (q === 3) return 'bg-amber-500/20 text-amber-400';
    return 'bg-red-500/20 text-red-400';
};

const getBenchColor = (val: number) => val >= 100 ? 'text-emerald-400' : 'text-red-400';
const getSharpeColor = (val: number) => val >= 0.5 ? 'text-emerald-400' : val >= 0 ? 'text-amber-400' : 'text-red-400';

// --- MOCK DATA ---
const PEER_GROUPS = [
    { id: '1', name: 'Multimercado Macro', color: '#3b82f6' },
    { id: '2', name: 'Ações Long Only', color: '#10b981' },
    { id: '3', name: 'Renda Fixa CP', color: '#8b5cf6' },
];

const PEER_CATEGORIES = [
    { id: 'p1', name: 'Small Caps', color: '#10b981' },
    { id: 'p2', name: 'Multimercado', color: '#3b82f6' },
    { id: 'p3', name: 'Ações Livre', color: '#f59e0b' },
    { id: 'p4', name: 'Total Return', color: '#8b5cf6' },
    { id: 'p5', name: 'Long Biased', color: '#ec4899' },
    { id: 'p6', name: 'Crédito Privado', color: '#06b6d4' },
];

// Funds by group
const FUNDS_BY_GROUP: Record<string, any[]> = {
    '1': [
        { id: 'f1', cnpj: '29.206.196/0001-57', name: 'Trígono Flagship Small Caps FIC FIA', manager: 'Trígono Capital', pl: 450230000, peer_id: 'p1', nickname: 'Trígono Flag', description: 'Foco em valor', comment: 'Boa performance' },
        { id: 'f2', cnpj: '41.776.752/0001-26', name: 'Kinea Zeus FIF Multimercado RL', manager: 'Kinea Investimentos', pl: 1250000000, peer_id: 'p2', nickname: 'Kinea Zeus', description: 'Vol controlada', comment: 'Estável' },
        { id: 'f3', cnpj: '12.345.678/0001-90', name: 'Alaska Black FIC FIA', manager: 'Alaska Asset', pl: 2100000000, peer_id: 'p3', nickname: 'Alaska Black', description: 'High Beta', comment: 'Recuperando' },
        { id: 'f4', cnpj: '98.765.432/0001-10', name: 'Dahlia Total Return FIC FIM', manager: 'Dahlia Capital', pl: 890000000, peer_id: 'p4', nickname: 'Dahlia TR', description: 'Crédito e Ações', comment: 'Consistente' },
    ],
    '2': [
        { id: 'f5', cnpj: '11.222.333/0001-44', name: 'Dynamo Cougar FIA', manager: 'Dynamo', pl: 3500000000, peer_id: 'p3', nickname: 'Dynamo Cougar', description: 'Long Only BR', comment: 'Top tier' },
        { id: 'f6', cnpj: '22.333.444/0001-55', name: 'Atmos Ações FIA', manager: 'Atmos Capital', pl: 2800000000, peer_id: 'p3', nickname: 'Atmos Ações', description: 'Qualidade', comment: 'Premium' },
        { id: 'f7', cnpj: '33.444.555/0001-66', name: 'Squadra Long Only FIC FIA', manager: 'Squadra', pl: 1900000000, peer_id: 'p3', nickname: 'Squadra LO', description: 'Value investing', comment: 'Conservador' },
    ],
    '3': [
        { id: 'f8', cnpj: '44.555.666/0001-77', name: 'JGP Corporate FIC FIM CP', manager: 'JGP', pl: 4200000000, peer_id: 'p6', nickname: 'JGP Corp', description: 'Crédito HG', comment: 'AAA focus' },
        { id: 'f9', cnpj: '55.666.777/0001-88', name: 'Augme 45 FIC FIM CP', manager: 'Augme Capital', pl: 1600000000, peer_id: 'p6', nickname: 'Augme 45', description: 'Mid grade', comment: 'Yield alto' },
        { id: 'f10', cnpj: '66.777.888/0001-99', name: 'Polo Crédito Corporativo FIC FIM CP', manager: 'Polo Capital', pl: 2100000000, peer_id: 'p6', nickname: 'Polo CP', description: 'Diversificado', comment: 'Estável' },
    ],
};

const FUND_SEARCH_RESULTS = [
    { cnpj: '11.111.111/0001-11', name: 'Ibiuna Hedge STH FIC FIM', manager: 'Ibiuna Investimentos', pl: 3200000000 },
    { cnpj: '22.222.222/0001-22', name: 'Verde AM Long Bias FIC FIM', manager: 'Verde Asset', pl: 1800000000 },
    { cnpj: '33.333.333/0001-33', name: 'SPX Nimitz FIC FIM', manager: 'SPX Capital', pl: 2500000000 },
];

const MANAGERS = ['Trígono', 'Kinea', 'Alaska', 'Dahlia', 'Ibiuna', 'Legacy', 'Verde', 'SPX'];

const generateFlowData = () => {
    const data = [];
    for (let i = 0; i < 104; i++) {
        const entry: any = { week: `S${i + 1}` };
        MANAGERS.forEach(m => { entry[m] = Math.floor(Math.random() * 25e6) - 10e6; });
        data.push(entry);
    }
    return data;
};
const FLOW_DATA = generateFlowData();

const generateTreemapData = (type: 'captacao' | 'resgate', by: 'gestor' | 'fundo', funds: any[]) => {
    if (by === 'gestor') {
        const managers = [...new Set(funds.map(f => f.manager))];
        return managers.map((m, i) => ({
            name: m,
            size: Math.random() * 100e6,
            fill: ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#ef4444', '#84cc16'][i % 8],
            funds: funds.filter(f => f.manager === m).map(f => ({
                nickname: f.nickname,
                value: Math.random() * 30e6,
                cnpj: f.cnpj,
                peer: PEER_CATEGORIES.find(p => p.id === f.peer_id)?.name || 'N/A'
            }))
        }));
    }
    return funds.map((f, i) => ({
        name: f.nickname,
        size: Math.random() * 50e6,
        fill: ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'][i % 4],
        funds: [{
            nickname: f.nickname,
            value: Math.random() * 50e6,
            cnpj: f.cnpj,
            peer: PEER_CATEGORIES.find(p => p.id === f.peer_id)?.name || 'N/A'
        }]
    }));
};

const ALL_COLUMNS = [
    { id: 'cnpj', label: 'CNPJ', w: 140, default: true },
    { id: 'q12m', label: 'Q 12M', w: 70, default: true },
    { id: 'b12m', label: '% Bench 12M', w: 100, default: true },
    { id: 'q6m', label: 'Q 6M', w: 70, default: true },
    { id: 'b6m', label: '% Bench 6M', w: 100, default: true },
    { id: 'q1m', label: 'Q 1M', w: 70, default: true },
    { id: 'b1m', label: '% Bench 1M', w: 100, default: true },
    { id: 'sharpe', label: 'Sharpe 12M', w: 90, default: true },
    { id: 'flow_month', label: 'Fluxo Mês', w: 100, default: true },
    { id: 'flow_diff', label: 'Dif Fluxo', w: 90, default: true },
    { id: 'pl', label: 'PL Atual', w: 100, default: true },
    { id: 'pl_percent', label: '% PL', w: 70, default: true },
    { id: 'q24m', label: 'Q 24M', w: 70, default: false },
    { id: 'b24m', label: '% Bench 24M', w: 100, default: false },
    { id: 'q36m', label: 'Q 36M', w: 70, default: false },
    { id: 'b36m', label: '% Bench 36M', w: 100, default: false },
    { id: 'vol12m', label: 'Vol 12M', w: 80, default: false },
    { id: 'drawdown', label: 'Max DD', w: 80, default: false },
];

const generatePerfData = (funds: any[]) => funds.map(f => ({
    ...f,
    q12m: Math.ceil(Math.random() * 4), b12m: 80 + Math.random() * 40,
    q6m: Math.ceil(Math.random() * 4), b6m: 85 + Math.random() * 30,
    q1m: Math.ceil(Math.random() * 4), b1m: 90 + Math.random() * 20,
    q24m: Math.ceil(Math.random() * 4), b24m: 75 + Math.random() * 50,
    q36m: Math.ceil(Math.random() * 4), b36m: 70 + Math.random() * 60,
    sharpe: -0.5 + Math.random() * 2.5,
    flow_month: (Math.random() - 0.3) * 20e6,
    flow_diff: (Math.random() - 0.5) * 5e6,
    pl_percent: Math.random() * 100,
    vol12m: 5 + Math.random() * 20,
    drawdown: -(Math.random() * 30),
}));

// --- COMPONENTS ---
const EditableCell = ({ value, onSave, className = '' }: { value: string; onSave: (v: string) => void; className?: string }) => {
    const [editing, setEditing] = useState(false);
    const [val, setVal] = useState(value);
    const handleSave = () => { onSave(val); setEditing(false); };
    const handleKeyDown = (e: React.KeyboardEvent) => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') { setVal(value); setEditing(false); } };

    if (editing) {
        return <Input autoFocus value={val} onChange={e => setVal(e.target.value)} onBlur={handleSave} onKeyDown={handleKeyDown} className={cn("h-7 text-xs bg-slate-950 border-blue-500", className)} />;
    }
    return (
        <div onClick={() => setEditing(true)} className={cn("cursor-text px-1 py-0.5 rounded hover:bg-slate-800 truncate min-h-[24px]", className)}>
            {value || <span className="text-slate-600 italic">Clique para editar</span>}
        </div>
    );
};

const PeerSelector = ({ value, peers, onSelect }: { value: string; peers: typeof PEER_CATEGORIES; onSelect: (id: string) => void }) => {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState('');
    const current = peers.find(p => p.id === value);
    const filtered = peers.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <button className="flex items-center gap-1.5 px-2 py-1 rounded text-xs border border-transparent hover:border-slate-700 transition-colors">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: current?.color || '#666' }} />
                    <span className="text-slate-300">{current?.name || 'Selecionar'}</span>
                    <ChevronDown size={12} className="text-slate-500" />
                </button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-2 bg-slate-900 border-slate-700">
                <div className="relative mb-2">
                    <Search className="absolute left-2 top-2 h-4 w-4 text-slate-500" />
                    <Input placeholder="Buscar peer..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-8 bg-slate-950 border-slate-800 text-xs" />
                </div>
                <ScrollArea className="max-h-48">
                    {filtered.map(p => (
                        <button key={p.id} onClick={() => { onSelect(p.id); setOpen(false); setSearch(''); }}
                            className={cn("w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm hover:bg-slate-800 transition-colors", value === p.id && "bg-slate-800")}>
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: p.color }} />
                            <span>{p.name}</span>
                            {value === p.id && <Check size={14} className="ml-auto text-emerald-400" />}
                        </button>
                    ))}
                    {filtered.length === 0 && <p className="text-xs text-slate-500 p-2 text-center">Nenhum peer encontrado</p>}
                </ScrollArea>
            </PopoverContent>
        </Popover>
    );
};

const AddFundDialog = ({ open, onOpenChange, onAdd }: { open: boolean; onOpenChange: (o: boolean) => void; onAdd: (fund: any) => void }) => {
    const [search, setSearch] = useState('');
    const [selected, setSelected] = useState<typeof FUND_SEARCH_RESULTS[0] | null>(null);
    const filtered = FUND_SEARCH_RESULTS.filter(f => f.cnpj.includes(search) || f.name.toLowerCase().includes(search.toLowerCase()));

    const handleAdd = () => {
        if (selected) {
            onAdd({ ...selected, id: `f${Date.now()}`, peer_id: '', nickname: '', description: '', comment: '' });
            setSelected(null); setSearch(''); onOpenChange(false);
            toast.success('Fundo adicionado!');
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="bg-slate-900 border-slate-800 max-w-lg">
                <DialogHeader>
                    <DialogTitle className="text-slate-100">Adicionar Fundo ao Peer Group</DialogTitle>
                    <DialogDescription className="text-slate-400">Busque pelo CNPJ ou nome do fundo</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                        <Input placeholder="Digite CNPJ ou nome..." value={search} onChange={e => { setSearch(e.target.value); setSelected(null); }} className="pl-10 bg-slate-950 border-slate-700" />
                    </div>
                    {search && !selected && (
                        <ScrollArea className="max-h-48 border border-slate-800 rounded-lg">
                            {filtered.map(f => (
                                <button key={f.cnpj} onClick={() => setSelected(f)} className="w-full flex items-center gap-3 p-3 hover:bg-slate-800 border-b border-slate-800 last:border-0 text-left">
                                    <Building2 size={20} className="text-slate-500" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-white truncate">{f.name}</p>
                                        <p className="text-xs text-slate-500">{f.cnpj} • {f.manager}</p>
                                    </div>
                                    <span className="text-xs text-emerald-400 font-mono">{formatKMB(f.pl)}</span>
                                </button>
                            ))}
                            {filtered.length === 0 && <p className="text-sm text-slate-500 p-4 text-center">Nenhum fundo encontrado</p>}
                        </ScrollArea>
                    )}
                    {selected && (
                        <Card className="bg-slate-950 border-emerald-500/30">
                            <CardContent className="p-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center"><Check className="text-emerald-400" /></div>
                                    <div className="flex-1">
                                        <p className="font-medium text-white">{selected.name}</p>
                                        <p className="text-xs text-slate-400">{selected.cnpj} • PL: R$ {formatKMB(selected.pl)}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>
                <DialogFooter>
                    <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
                    <Button disabled={!selected} onClick={handleAdd} className="bg-emerald-600 hover:bg-emerald-700">Adicionar Fundo</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

const CreateGroupDialog = ({ open, onOpenChange, onCreate }: { open: boolean; onOpenChange: (o: boolean) => void; onCreate: (name: string) => void }) => {
    const [name, setName] = useState('');
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="bg-slate-900 border-slate-800 max-w-sm">
                <DialogHeader><DialogTitle className="text-slate-100">Criar Novo Grupo</DialogTitle></DialogHeader>
                <Input placeholder="Nome do grupo..." value={name} onChange={e => setName(e.target.value)} className="bg-slate-950 border-slate-700" />
                <DialogFooter>
                    <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
                    <Button disabled={!name.trim()} onClick={() => { onCreate(name); setName(''); onOpenChange(false); }} className="bg-blue-600 hover:bg-blue-700">Criar Grupo</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

const TreemapTooltip = ({ active, payload, type, viewBy }: any) => {
    if (!active || !payload?.[0]) return null;
    const data = payload[0].payload;
    return (
        <div className="bg-slate-900 border border-slate-700 rounded-lg p-3 shadow-xl min-w-[240px] max-w-[320px]">
            <p className="font-bold text-white mb-2">{data.name}</p>
            <p className={cn("text-sm mb-3", type === 'captacao' ? 'text-emerald-400' : 'text-red-400')}>Total: R$ {formatKMB(data.size)}</p>
            {viewBy === 'gestor' && data.funds?.length > 0 && (
                <div className="border-t border-slate-800 pt-2">
                    <div className="grid grid-cols-[1fr_60px_70px_90px] gap-1 text-[10px] text-slate-500 uppercase mb-1 px-1">
                        <span>Fundo</span><span>Peer</span><span className="text-right">Valor</span><span className="text-right">CNPJ</span>
                    </div>
                    {data.funds.map((f: any, i: number) => (
                        <div key={i} className="grid grid-cols-[1fr_60px_70px_90px] gap-1 text-xs py-1 border-b border-slate-800/50 last:border-0 px-1">
                            <span className="text-slate-300 truncate">{f.nickname}</span>
                            <span className="text-slate-500 truncate">{f.peer}</span>
                            <span className={cn("text-right", type === 'captacao' ? 'text-emerald-400' : 'text-red-400')}>{formatKMB(f.value)}</span>
                            <span className="text-right text-slate-500 font-mono text-[9px]">{f.cnpj.split('/')[0]}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

const CustomTreemapContent = (props: any) => {
    const { x, y, width, height, name, size, fill } = props;
    if (typeof x !== 'number' || typeof y !== 'number' || typeof width !== 'number' || typeof height !== 'number') return null;
    if (width < 30 || height < 20) return null;
    return (
        <g>
            <rect x={x} y={y} width={width} height={height} fill={fill || '#666'} stroke="#1e293b" strokeWidth={2} />
            {width > 50 && <text x={x + width / 2} y={y + height / 2 - 6} textAnchor="middle" fill="#fff" fontSize={11} fontWeight={500}>{name || ''}</text>}
            {width > 50 && height > 35 && <text x={x + width / 2} y={y + height / 2 + 10} textAnchor="middle" fill="#ccc" fontSize={10}>{formatKMB(size || 0)}</text>}
        </g>
    );
};

const ColumnSelector = ({ columns, visibleIds, onToggle }: { columns: typeof ALL_COLUMNS; visibleIds: string[]; onToggle: (id: string) => void }) => {
    const [open, setOpen] = useState(false);
    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="border-slate-700 text-slate-300"><Settings2 size={14} className="mr-2" />Colunas</Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-2 bg-slate-900 border-slate-700">
                <p className="text-xs text-slate-400 uppercase mb-2 px-2">Selecionar Colunas</p>
                <ScrollArea className="max-h-64">
                    {columns.map(col => (
                        <div key={col.id} onClick={() => onToggle(col.id)} className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-800 rounded cursor-pointer">
                            <Checkbox checked={visibleIds.includes(col.id)} className="border-slate-600" />
                            <span className="text-sm">{col.label}</span>
                        </div>
                    ))}
                </ScrollArea>
            </PopoverContent>
        </Popover>
    );
};

// --- MAIN COMPONENT ---
const FlagshipPeer = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('peers');
    const [peerGroups, setPeerGroups] = useState(PEER_GROUPS);
    const [activePeerGroup, setActivePeerGroup] = useState(PEER_GROUPS[0].id);
    const [fundsByGroup, setFundsByGroup] = useState(FUNDS_BY_GROUP);
    const [addDialogOpen, setAddDialogOpen] = useState(false);
    const [createGroupOpen, setCreateGroupOpen] = useState(false);
    const [flowViewBy, setFlowViewBy] = useState<'gestor' | 'fundo'>('gestor');

    // Performance columns with localStorage
    const [visibleColIds, setVisibleColIds] = useState<string[]>(() => {
        const saved = localStorage.getItem('flagship_peer_cols');
        if (saved) return JSON.parse(saved);
        return ALL_COLUMNS.filter(c => c.default).map(c => c.id);
    });
    const [sortCol, setSortCol] = useState<string>('b12m');
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

    useEffect(() => {
        localStorage.setItem('flagship_peer_cols', JSON.stringify(visibleColIds));
    }, [visibleColIds]);

    const funds = fundsByGroup[activePeerGroup] || [];
    const selectedGroup = peerGroups.find(p => p.id === activePeerGroup);
    const captacaoData = generateTreemapData('captacao', flowViewBy, funds);
    const resgateData = generateTreemapData('resgate', flowViewBy, funds);

    const perfData = generatePerfData(funds).sort((a, b) => {
        const aVal = a[sortCol] ?? 0;
        const bVal = b[sortCol] ?? 0;
        return sortDir === 'desc' ? bVal - aVal : aVal - bVal;
    });

    const visibleColumns = ALL_COLUMNS.filter(c => visibleColIds.includes(c.id));

    const updateFund = (id: string, field: string, value: string) => {
        setFundsByGroup({
            ...fundsByGroup,
            [activePeerGroup]: funds.map(f => f.id === id ? { ...f, [field]: value } : f)
        });
    };

    const toggleColumn = (id: string) => {
        setVisibleColIds(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]);
    };

    const handleSort = (colId: string) => {
        if (sortCol === colId) {
            setSortDir(prev => prev === 'desc' ? 'asc' : 'desc');
        } else {
            setSortCol(colId);
            setSortDir('desc');
        }
    };

    const handleCreateGroup = (name: string) => {
        const newId = `g${Date.now()}`;
        const colors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6', '#0ea5e9', '#6366f1', '#a855f7'];
        setPeerGroups([...peerGroups, { id: newId, name, color: colors[peerGroups.length % colors.length] }]);
        setFundsByGroup({ ...fundsByGroup, [newId]: [] });
        setActivePeerGroup(newId);
        toast.success(`Grupo "${name}" criado!`);
    };

    const openLabWithCnpj = (cnpj: string) => {
        // Navigate to lab with CNPJ as state
        navigate('/lab', { state: { cnpj: cnpj.replace(/\D/g, '') } });
    };

    const copyCnpj = (cnpj: string) => {
        navigator.clipboard.writeText(cnpj);
        toast.success('CNPJ copiado!');
    };

    const renderPerfCell = (col: typeof ALL_COLUMNS[0], row: any) => {
        const val = row[col.id];
        if (col.id === 'cnpj') return <span className="font-mono text-xs text-slate-400">{val}</span>;
        if (col.id.startsWith('q')) return <Badge className={cn("text-xs", getQuartileColor(val))}>{val}º</Badge>;
        if (col.id.startsWith('b')) return <span className={getBenchColor(val)}>{val.toFixed(1)}%</span>;
        if (col.id === 'sharpe') return <span className={getSharpeColor(val)}>{val.toFixed(2)}</span>;
        if (col.id === 'flow_month' || col.id === 'flow_diff') return <span className={val >= 0 ? 'text-emerald-400' : 'text-red-400'}>{formatKMB(val)}</span>;
        if (col.id === 'pl') return <span className="text-emerald-400 font-mono">{formatKMB(row.pl)}</span>;
        if (col.id === 'pl_percent') return <span className="text-slate-300">{val.toFixed(1)}%</span>;
        if (col.id === 'vol12m') return <span className="text-slate-300">{val.toFixed(1)}%</span>;
        if (col.id === 'drawdown') return <span className="text-red-400">{val.toFixed(1)}%</span>;
        return val;
    };

    return (
        <div className="flex flex-col h-full bg-[#0F172A] text-slate-100 p-6 overflow-hidden">
            {/* HEADER */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">Flagship Peer</h1>
                        <Badge style={{ backgroundColor: selectedGroup?.color + '20', color: selectedGroup?.color, borderColor: selectedGroup?.color + '40' }} className="border">{selectedGroup?.name}</Badge>
                    </div>
                    <p className="text-sm text-slate-400">Gerencie e analise seus grupos de fundos</p>
                </div>
                <div className="flex items-center gap-3">
                    <Select value={activePeerGroup} onValueChange={setActivePeerGroup}>
                        <SelectTrigger className="w-[240px] bg-slate-900 border-slate-700"><SelectValue /></SelectTrigger>
                        <SelectContent className="bg-slate-900 border-slate-700">
                            {peerGroups.map(pg => (
                                <SelectItem key={pg.id} value={pg.id}><div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full" style={{ backgroundColor: pg.color }} />{pg.name}</div></SelectItem>
                            ))}
                            <DropdownMenuSeparator className="bg-slate-800" />
                            <Button variant="ghost" size="sm" className="w-full justify-start text-xs mt-1" onClick={() => setCreateGroupOpen(true)}><Plus size={14} className="mr-2" />Criar novo grupo</Button>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* TABS */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
                <TabsList className="bg-slate-900/50 p-1 mb-4 w-fit border border-slate-800/50">
                    <TabsTrigger value="peers" className="data-[state=active]:bg-blue-600">Peers & Categorias</TabsTrigger>
                    <TabsTrigger value="flow" className="data-[state=active]:bg-blue-600">Fluxo & Gestoras</TabsTrigger>
                    <TabsTrigger value="performance" className="data-[state=active]:bg-blue-600">Performance Detalhada</TabsTrigger>
                </TabsList>

                {/* TAB 1: PEERS */}
                <TabsContent value="peers" className="flex-1 flex flex-col min-h-0">
                    <Card className="flex-1 bg-slate-900/40 border-slate-800 flex flex-col overflow-hidden">
                        <div className="flex items-center px-4 py-2 bg-slate-950/50 border-b border-slate-800 text-xs font-semibold text-slate-400 uppercase">
                            <div className="w-8" /><div className="w-[200px]">Fundo</div><div className="w-[150px]">CNPJ</div><div className="w-[140px]">Gestora</div><div className="w-[100px] text-right">PL</div>
                            <div className="flex-1 grid grid-cols-4 gap-2 px-4 ml-4 border-l border-slate-800/50">
                                <div>Peer Cat.</div><div>Apelido</div><div>Descrição</div><div>Comentário</div>
                            </div>
                        </div>
                        <ScrollArea className="flex-1">
                            {funds.map(fund => (
                                <div key={fund.id} className="group flex items-center px-4 py-2 hover:bg-slate-800/40 border-b border-slate-800/30 text-sm">
                                    <div className="w-8 opacity-0 group-hover:opacity-100 cursor-grab"><GripVertical size={14} className="text-slate-600" /></div>
                                    <div className="w-[200px] font-medium text-white truncate cursor-pointer hover:text-blue-400 hover:underline" onClick={() => openLabWithCnpj(fund.cnpj)}>{fund.name}</div>
                                    <div className="w-[150px] flex items-center gap-1">
                                        <span className="text-slate-400 font-mono text-xs select-all">{fund.cnpj}</span>
                                        <button onClick={() => copyCnpj(fund.cnpj)} className="opacity-0 group-hover:opacity-100 p-1 hover:bg-slate-700 rounded"><Copy size={12} className="text-slate-500" /></button>
                                    </div>
                                    <div className="w-[140px] text-slate-300 truncate">{fund.manager}</div>
                                    <div className="w-[100px] text-right text-emerald-400 font-mono">{formatKMB(fund.pl)}</div>
                                    <div className="flex-1 grid grid-cols-4 gap-2 px-4 ml-4 border-l border-slate-800/50 items-center">
                                        <PeerSelector value={fund.peer_id} peers={PEER_CATEGORIES} onSelect={id => updateFund(fund.id, 'peer_id', id)} />
                                        <EditableCell value={fund.nickname} onSave={v => updateFund(fund.id, 'nickname', v)} className="text-slate-300" />
                                        <EditableCell value={fund.description} onSave={v => updateFund(fund.id, 'description', v)} className="text-slate-500 text-xs" />
                                        <EditableCell value={fund.comment} onSave={v => updateFund(fund.id, 'comment', v)} className="text-slate-500 text-xs" />
                                    </div>
                                    <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400"><Trash2 size={14} /></Button>
                                </div>
                            ))}
                            {funds.length === 0 && <p className="text-center text-slate-500 py-8">Nenhum fundo neste grupo. Adicione fundos abaixo.</p>}
                            <div onClick={() => setAddDialogOpen(true)} className="flex items-center justify-center gap-2 p-4 m-2 border-2 border-dashed border-slate-800 hover:border-blue-500/50 rounded-lg cursor-pointer text-slate-500 hover:text-blue-400 transition-all hover:bg-blue-500/5">
                                <Plus size={18} /><span>Adicionar Novo Fundo</span>
                            </div>
                        </ScrollArea>
                    </Card>
                    <AddFundDialog open={addDialogOpen} onOpenChange={setAddDialogOpen} onAdd={f => setFundsByGroup({ ...fundsByGroup, [activePeerGroup]: [...funds, f] })} />
                </TabsContent>

                {/* TAB 2: FLOW */}
                <TabsContent value="flow" className="flex-1 min-h-0 space-y-4 overflow-auto">
                    <div className="flex gap-2">
                        <Button variant={flowViewBy === 'gestor' ? 'default' : 'outline'} size="sm" onClick={() => setFlowViewBy('gestor')} className={flowViewBy === 'gestor' ? 'bg-blue-600' : 'border-slate-700'}>Por Gestora</Button>
                        <Button variant={flowViewBy === 'fundo' ? 'default' : 'outline'} size="sm" onClick={() => setFlowViewBy('fundo')} className={flowViewBy === 'fundo' ? 'bg-blue-600' : 'border-slate-700'}>Por Fundo</Button>
                    </div>
                    <div className="grid grid-cols-2 gap-4 h-[280px]">
                        <Card className="bg-slate-900/40 border-slate-800">
                            <CardHeader className="py-3"><CardTitle className="text-sm text-slate-300">Captação por {flowViewBy === 'gestor' ? 'Gestora' : 'Fundo'}</CardTitle></CardHeader>
                            <CardContent className="h-[220px]">
                                <ResponsiveContainer>
                                    <Treemap data={captacaoData} dataKey="size" content={<CustomTreemapContent />} isAnimationActive={false}>
                                        <Tooltip content={<TreemapTooltip type="captacao" viewBy={flowViewBy} />} />
                                    </Treemap>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>
                        <Card className="bg-slate-900/40 border-slate-800">
                            <CardHeader className="py-3"><CardTitle className="text-sm text-slate-300">Resgate por {flowViewBy === 'gestor' ? 'Gestora' : 'Fundo'}</CardTitle></CardHeader>
                            <CardContent className="h-[220px]">
                                <ResponsiveContainer>
                                    <Treemap data={resgateData} dataKey="size" content={<CustomTreemapContent />} isAnimationActive={false}>
                                        <Tooltip content={<TreemapTooltip type="resgate" viewBy={flowViewBy} />} />
                                    </Treemap>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>
                    </div>
                    <Card className="bg-slate-900/40 border-slate-800">
                        <CardHeader className="py-3"><CardTitle className="text-slate-200">Histórico de Fluxo Semanal (2 Anos)</CardTitle></CardHeader>
                        <CardContent className="h-[280px]">
                            <ResponsiveContainer>
                                <BarChart data={FLOW_DATA}><CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} vertical={false} />
                                    <XAxis dataKey="week" hide /><YAxis stroke="#64748b" tickFormatter={v => formatKMB(v)} width={60} tick={{ fontSize: 10 }} />
                                    <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155' }} formatter={(v: number) => formatKMB(v)} /><Legend />
                                    {MANAGERS.slice(0, 4).map((m, i) => <Bar key={m} dataKey={m} stackId="a" fill={['#10b981', '#3b82f6', '#f59e0b', '#ec4899'][i]} />)}
                                </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                    <Card className="bg-slate-900/40 border-slate-800">
                        <CardHeader className="py-3"><CardTitle className="text-slate-200">PL por {flowViewBy === 'gestor' ? 'Gestora' : 'Fundo'}</CardTitle></CardHeader>
                        <CardContent className="h-[200px]">
                            <ResponsiveContainer>
                                <BarChart data={captacaoData} layout="vertical"><CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} horizontal={false} />
                                    <XAxis type="number" tickFormatter={v => formatKMB(v)} stroke="#64748b" tick={{ fontSize: 10 }} />
                                    <YAxis type="category" dataKey="name" width={80} stroke="#64748b" tick={{ fontSize: 11 }} />
                                    <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155' }} formatter={(v: number) => formatKMB(v)} />
                                    <Bar dataKey="size" radius={[0, 4, 4, 0]}>{captacaoData.map((e, i) => <Cell key={i} fill={e.fill} />)}</Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* TAB 3: PERFORMANCE */}
                <TabsContent value="performance" className="flex-1 flex flex-col min-h-0">
                    <Card className="flex-1 bg-slate-900/40 border-slate-800 flex flex-col overflow-hidden">
                        <div className="p-3 border-b border-slate-800 flex justify-between items-center bg-slate-950/30">
                            <p className="text-xs text-slate-400">Clique no header para ordenar • Arraste para reordenar</p>
                            <ColumnSelector columns={ALL_COLUMNS} visibleIds={visibleColIds} onToggle={toggleColumn} />
                        </div>
                        <div className="flex-1 overflow-auto">
                            <div className="min-w-max">
                                <div className="flex border-b border-slate-800 bg-slate-950/50 sticky top-0 z-10">
                                    <div className="w-[160px] p-2 text-xs font-semibold text-slate-400 uppercase sticky left-0 bg-slate-950/90 z-20 border-r border-slate-800">Apelido</div>
                                    {visibleColumns.map(col => (
                                        <div key={col.id} onClick={() => handleSort(col.id)} style={{ width: col.w }}
                                            className={cn("p-2 text-xs font-semibold text-slate-400 uppercase text-center border-r border-slate-800/30 cursor-pointer select-none hover:bg-slate-800/50 flex items-center justify-center gap-1", sortCol === col.id && "text-blue-400")}>
                                            {col.label}
                                            {sortCol === col.id && (sortDir === 'desc' ? <ArrowDown size={12} /> : <ArrowUp size={12} />)}
                                        </div>
                                    ))}
                                </div>
                                {perfData.map(row => (
                                    <div key={row.id} className="flex hover:bg-slate-800/30 border-b border-slate-800/30">
                                        <div className="w-[160px] p-2 font-medium text-white truncate sticky left-0 bg-[#0F172A] z-10 border-r border-slate-800">{row.nickname || row.name}</div>
                                        {visibleColumns.map(col => (
                                            <div key={col.id} style={{ width: col.w }} className="p-2 text-center text-sm border-r border-slate-800/30 flex items-center justify-center">
                                                {renderPerfCell(col, row)}
                                            </div>
                                        ))}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </Card>
                </TabsContent>
            </Tabs>

            <CreateGroupDialog open={createGroupOpen} onOpenChange={setCreateGroupOpen} onCreate={handleCreateGroup} />
        </div>
    );
};

export default FlagshipPeer;
