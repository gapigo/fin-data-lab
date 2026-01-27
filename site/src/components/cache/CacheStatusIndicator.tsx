import { useState } from 'react';
import { useCacheStats } from '@/hooks/use-cache';
import { Database, RefreshCw, Trash2, ChevronDown, ChevronUp, Zap } from 'lucide-react';

interface CacheStatusIndicatorProps {
    compact?: boolean;
}

/**
 * Indicador visual do status do cache
 * Mostra estatísticas e permite limpar o cache
 */
export function CacheStatusIndicator({ compact = false }: CacheStatusIndicatorProps) {
    const { stats, loading, refreshStats, clearCache } = useCacheStats();
    const [expanded, setExpanded] = useState(false);
    const [clearing, setClearing] = useState(false);

    const handleClear = async () => {
        setClearing(true);
        try {
            await clearCache();
        } finally {
            setClearing(false);
        }
    };

    if (loading || !stats) {
        return (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800/50 text-slate-400 text-sm">
                <Database className="w-4 h-4 animate-pulse" />
                <span>Carregando cache...</span>
            </div>
        );
    }

    if (compact) {
        return (
            <div
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gradient-to-r from-emerald-900/30 to-teal-900/30 border border-emerald-800/40 text-emerald-300 text-sm cursor-pointer hover:bg-emerald-800/30 transition-all"
                onClick={() => setExpanded(!expanded)}
                title={`Cache: ${stats.todayEntries} entradas de hoje`}
            >
                <Zap className="w-4 h-4" />
                <span className="font-medium">{stats.todayEntries}</span>
                {expanded && (
                    <div className="absolute top-full right-0 mt-2 p-4 bg-slate-900 rounded-xl border border-slate-700 shadow-xl z-50 min-w-[250px]">
                        <CacheDetails stats={stats} onClear={handleClear} onRefresh={refreshStats} clearing={clearing} />
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl border border-slate-700/50 overflow-hidden">
            {/* Header */}
            <button
                onClick={() => setExpanded(!expanded)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-800/50 transition-colors"
            >
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500/20 to-teal-500/20 flex items-center justify-center">
                        <Database className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div className="text-left">
                        <h3 className="text-sm font-semibold text-slate-200">Cache de Dados</h3>
                        <p className="text-xs text-slate-400">
                            {stats.todayEntries} entradas de hoje • {stats.totalEntries} total
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {stats.todayEntries > 0 && (
                        <span className="px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-medium flex items-center gap-1">
                            <Zap className="w-3 h-3" />
                            Ativo
                        </span>
                    )}
                    {expanded ? (
                        <ChevronUp className="w-5 h-5 text-slate-400" />
                    ) : (
                        <ChevronDown className="w-5 h-5 text-slate-400" />
                    )}
                </div>
            </button>

            {/* Details */}
            {expanded && (
                <div className="px-4 pb-4 border-t border-slate-700/50">
                    <CacheDetails stats={stats} onClear={handleClear} onRefresh={refreshStats} clearing={clearing} />
                </div>
            )}
        </div>
    );
}

interface CacheDetailsProps {
    stats: { totalEntries: number; todayEntries: number; size: string };
    onClear: () => void;
    onRefresh: () => void;
    clearing: boolean;
}

function CacheDetails({ stats, onClear, onRefresh, clearing }: CacheDetailsProps) {
    return (
        <div className="pt-4 space-y-4">
            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-3">
                <div className="bg-slate-800/50 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-emerald-400">{stats.todayEntries}</p>
                    <p className="text-xs text-slate-400">Hoje</p>
                </div>
                <div className="bg-slate-800/50 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-blue-400">{stats.totalEntries}</p>
                    <p className="text-xs text-slate-400">Total</p>
                </div>
                <div className="bg-slate-800/50 rounded-lg p-3 text-center">
                    <p className="text-lg font-bold text-purple-400">{stats.size}</p>
                    <p className="text-xs text-slate-400">Tamanho</p>
                </div>
            </div>

            {/* Info Text */}
            <div className="text-xs text-slate-400 bg-slate-800/30 rounded-lg p-3">
                <p className="flex items-center gap-2 mb-1">
                    <Zap className="w-3 h-3 text-amber-400" />
                    <span className="text-slate-300 font-medium">Como funciona:</span>
                </p>
                <p>
                    Dados de fundos são salvos automaticamente.
                    Recarregar uma página que já foi visitada hoje é <strong className="text-emerald-400">instantâneo</strong>.
                    O cache é renovado automaticamente a cada dia.
                </p>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
                <button
                    onClick={onRefresh}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm transition-colors"
                >
                    <RefreshCw className="w-4 h-4" />
                    Atualizar
                </button>
                <button
                    onClick={onClear}
                    disabled={clearing}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-red-900/30 hover:bg-red-900/50 text-red-400 text-sm transition-colors disabled:opacity-50"
                >
                    <Trash2 className="w-4 h-4" />
                    {clearing ? 'Limpando...' : 'Limpar Cache'}
                </button>
            </div>
        </div>
    );
}

/**
 * Indicador inline que mostra quando dados vieram do cache
 */
export function CacheHitBadge({ fromCache }: { fromCache: boolean }) {
    if (!fromCache) return null;

    return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-medium animate-fade-in">
            <Zap className="w-3 h-3" />
            Cache
        </span>
    );
}
