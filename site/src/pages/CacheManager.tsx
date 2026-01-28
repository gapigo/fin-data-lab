import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Database,
    Trash2,
    RefreshCw,
    HardDrive,
    Clock,
    AlertCircle,
    CheckCircle,
    Loader2,
    Server,
    Monitor
} from 'lucide-react';
import { FundingService } from '@/services/api';

interface FileCacheEntry {
    filename: string;
    function: string;
    params_hash: string;
    created_at: string;
    age_seconds: number;
    size_bytes: number;
}

interface MemoryCacheEntry {
    key: string;
    expires_at: string;
    ttl_remaining: number;
    value_type: string;
    value_size: number;
}

interface PendingRequest {
    key: string;
    endpoint: string;
    params: string;
    running_for: number;
    started_at: string;
}

interface CacheInfo {
    file_cache: {
        total_files: number;
        total_size_mb: number;
        functions: Record<string, number>;
        files: FileCacheEntry[];
    };
    memory_cache: MemoryCacheEntry[];
    pending_requests: PendingRequest[];
    deduplication_stats: {
        pending_count: number;
        completed_count: number;
        deduplicated_count: number;
        timeout: number;
    };
}

const API_BASE = 'http://localhost:8000';

const CacheManager = () => {
    const [cacheInfo, setCacheInfo] = useState<CacheInfo | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const fetchCacheInfo = async () => {
        try {
            setLoading(true);
            const response = await fetch(`${API_BASE}/cache`);
            const data = await response.json();
            setCacheInfo(data);
            setError(null);
        } catch (err) {
            setError('Erro ao carregar informações do cache');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCacheInfo();
        // Atualizar a cada 30 segundos
        const interval = setInterval(fetchCacheInfo, 30000);
        return () => clearInterval(interval);
    }, []);

    const showMessage = (type: 'success' | 'error', text: string) => {
        setMessage({ type, text });
        setTimeout(() => setMessage(null), 3000);
    };

    const deleteFileCache = async (filename: string) => {
        setActionLoading(filename);
        try {
            const response = await fetch(`${API_BASE}/cache/file/${filename}`, { method: 'DELETE' });
            if (response.ok) {
                showMessage('success', `Arquivo ${filename} removido`);
                fetchCacheInfo();
            } else {
                showMessage('error', 'Erro ao remover arquivo');
            }
        } catch (err) {
            showMessage('error', 'Erro ao remover arquivo');
        } finally {
            setActionLoading(null);
        }
    };

    const deleteMemoryCache = async (key: string) => {
        setActionLoading(key);
        try {
            const response = await fetch(`${API_BASE}/cache/memory/${encodeURIComponent(key)}`, { method: 'DELETE' });
            if (response.ok) {
                showMessage('success', `Chave ${key} removida`);
                fetchCacheInfo();
            } else {
                showMessage('error', 'Erro ao remover chave');
            }
        } catch (err) {
            showMessage('error', 'Erro ao remover chave');
        } finally {
            setActionLoading(null);
        }
    };

    const clearAllCache = async () => {
        setActionLoading('all');
        try {
            const response = await fetch(`${API_BASE}/cache/all`, { method: 'DELETE' });
            if (response.ok) {
                showMessage('success', 'Todo o cache foi limpo');
                fetchCacheInfo();
                // Limpar também o cache do frontend
                FundingService.clearCache();
            } else {
                showMessage('error', 'Erro ao limpar cache');
            }
        } catch (err) {
            showMessage('error', 'Erro ao limpar cache');
        } finally {
            setActionLoading(null);
        }
    };

    const clearMemoryCache = async () => {
        setActionLoading('memory');
        try {
            const response = await fetch(`${API_BASE}/cache/memory`, { method: 'DELETE' });
            if (response.ok) {
                showMessage('success', 'Cache em memória limpo');
                fetchCacheInfo();
            } else {
                showMessage('error', 'Erro ao limpar cache');
            }
        } catch (err) {
            showMessage('error', 'Erro ao limpar cache');
        } finally {
            setActionLoading(null);
        }
    };

    const clearFileCache = async () => {
        setActionLoading('files');
        try {
            const response = await fetch(`${API_BASE}/cache/files`, { method: 'DELETE' });
            if (response.ok) {
                showMessage('success', 'Cache em arquivo limpo');
                fetchCacheInfo();
            } else {
                showMessage('error', 'Erro ao limpar cache');
            }
        } catch (err) {
            showMessage('error', 'Erro ao limpar cache');
        } finally {
            setActionLoading(null);
        }
    };

    const clearFrontendCache = () => {
        FundingService.clearCache();
        showMessage('success', 'Cache do frontend limpo');
    };

    const formatBytes = (bytes: number) => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    };

    const formatDuration = (seconds: number) => {
        if (seconds < 60) return `${seconds}s`;
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
        return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
    };

    if (loading && !cacheInfo) {
        return (
            <div className="min-h-screen bg-slate-950 p-8 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-8">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-orange-500/20 rounded-xl border border-orange-500/30">
                            <Database className="w-8 h-8 text-orange-400" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-white">Gerenciador de Cache</h1>
                            <p className="text-sm text-slate-400">Visualize e gerencie o cache do sistema</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={fetchCacheInfo}
                            disabled={loading}
                            className="border-slate-700 text-slate-300"
                        >
                            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                            Atualizar
                        </Button>
                        <Button
                            variant="destructive"
                            size="sm"
                            onClick={clearAllCache}
                            disabled={actionLoading === 'all'}
                        >
                            {actionLoading === 'all' ? (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                                <Trash2 className="w-4 h-4 mr-2" />
                            )}
                            Limpar Todo Cache
                        </Button>
                    </div>
                </div>

                {/* Message */}
                {message && (
                    <div className={`mb-4 p-4 rounded-lg flex items-center gap-2 ${message.type === 'success' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'
                        }`}>
                        {message.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                        {message.text}
                    </div>
                )}

                {error && (
                    <div className="mb-4 p-4 rounded-lg bg-red-500/20 text-red-300 flex items-center gap-2">
                        <AlertCircle className="w-5 h-5" />
                        {error}
                    </div>
                )}

                {/* Stats Overview */}
                {cacheInfo && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                        <Card className="bg-slate-900/50 border-slate-800">
                            <CardContent className="p-4">
                                <div className="flex items-center gap-3">
                                    <HardDrive className="w-8 h-8 text-blue-400" />
                                    <div>
                                        <p className="text-2xl font-bold text-white">{cacheInfo.file_cache.total_files}</p>
                                        <p className="text-xs text-slate-500">Arquivos de Cache</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="bg-slate-900/50 border-slate-800">
                            <CardContent className="p-4">
                                <div className="flex items-center gap-3">
                                    <Database className="w-8 h-8 text-emerald-400" />
                                    <div>
                                        <p className="text-2xl font-bold text-white">{cacheInfo.memory_cache.length}</p>
                                        <p className="text-xs text-slate-500">Entradas em Memória</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="bg-slate-900/50 border-slate-800">
                            <CardContent className="p-4">
                                <div className="flex items-center gap-3">
                                    <Clock className="w-8 h-8 text-orange-400" />
                                    <div>
                                        <p className="text-2xl font-bold text-white">{cacheInfo.pending_requests.length}</p>
                                        <p className="text-xs text-slate-500">Requisições Pendentes</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="bg-slate-900/50 border-slate-800">
                            <CardContent className="p-4">
                                <div className="flex items-center gap-3">
                                    <Server className="w-8 h-8 text-purple-400" />
                                    <div>
                                        <p className="text-2xl font-bold text-white">{cacheInfo.deduplication_stats.deduplicated_count}</p>
                                        <p className="text-xs text-slate-500">Deduplicadas</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* Tabs */}
                <Tabs defaultValue="backend" className="space-y-6">
                    <TabsList className="bg-slate-900/50 border border-slate-800">
                        <TabsTrigger value="backend" className="data-[state=active]:bg-slate-800">
                            <Server className="w-4 h-4 mr-2" />
                            Backend
                        </TabsTrigger>
                        <TabsTrigger value="frontend" className="data-[state=active]:bg-slate-800">
                            <Monitor className="w-4 h-4 mr-2" />
                            Frontend
                        </TabsTrigger>
                        <TabsTrigger value="pending" className="data-[state=active]:bg-slate-800">
                            <Clock className="w-4 h-4 mr-2" />
                            Pendentes
                        </TabsTrigger>
                    </TabsList>

                    {/* Backend Tab */}
                    <TabsContent value="backend" className="space-y-6">
                        {/* File Cache */}
                        <Card className="bg-slate-900/30 border-slate-800">
                            <CardHeader className="flex flex-row items-center justify-between">
                                <div>
                                    <CardTitle className="text-white flex items-center gap-2">
                                        <HardDrive className="w-5 h-5 text-blue-400" />
                                        Cache em Arquivo
                                    </CardTitle>
                                    <CardDescription>
                                        {cacheInfo?.file_cache.total_size_mb.toFixed(2)} MB total
                                    </CardDescription>
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={clearFileCache}
                                    disabled={actionLoading === 'files'}
                                    className="border-slate-700"
                                >
                                    {actionLoading === 'files' ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <Trash2 className="w-4 h-4" />
                                    )}
                                </Button>
                            </CardHeader>
                            <CardContent>
                                {cacheInfo?.file_cache.files.length === 0 ? (
                                    <p className="text-slate-500 text-center py-4">Nenhum arquivo de cache</p>
                                ) : (
                                    <div className="space-y-2 max-h-80 overflow-y-auto">
                                        {cacheInfo?.file_cache.files.map((file) => (
                                            <div
                                                key={file.filename}
                                                className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg"
                                            >
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium text-white truncate">{file.function}</p>
                                                    <p className="text-xs text-slate-500">
                                                        {file.params_hash} • {formatBytes(file.size_bytes)} • {formatDuration(file.age_seconds)} atrás
                                                    </p>
                                                </div>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => deleteFileCache(file.filename)}
                                                    disabled={actionLoading === file.filename}
                                                    className="text-red-400 hover:text-red-300"
                                                >
                                                    {actionLoading === file.filename ? (
                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                    ) : (
                                                        <Trash2 className="w-4 h-4" />
                                                    )}
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Memory Cache */}
                        <Card className="bg-slate-900/30 border-slate-800">
                            <CardHeader className="flex flex-row items-center justify-between">
                                <div>
                                    <CardTitle className="text-white flex items-center gap-2">
                                        <Database className="w-5 h-5 text-emerald-400" />
                                        Cache em Memória
                                    </CardTitle>
                                    <CardDescription>
                                        {cacheInfo?.memory_cache.length} entradas
                                    </CardDescription>
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={clearMemoryCache}
                                    disabled={actionLoading === 'memory'}
                                    className="border-slate-700"
                                >
                                    {actionLoading === 'memory' ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <Trash2 className="w-4 h-4" />
                                    )}
                                </Button>
                            </CardHeader>
                            <CardContent>
                                {cacheInfo?.memory_cache.length === 0 ? (
                                    <p className="text-slate-500 text-center py-4">Nenhuma entrada em memória</p>
                                ) : (
                                    <div className="space-y-2 max-h-80 overflow-y-auto">
                                        {cacheInfo?.memory_cache.map((entry) => (
                                            <div
                                                key={entry.key}
                                                className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg"
                                            >
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium text-white truncate">{entry.key}</p>
                                                    <p className="text-xs text-slate-500">
                                                        {entry.value_type} • TTL: {formatDuration(entry.ttl_remaining)}
                                                    </p>
                                                </div>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => deleteMemoryCache(entry.key)}
                                                    disabled={actionLoading === entry.key}
                                                    className="text-red-400 hover:text-red-300"
                                                >
                                                    {actionLoading === entry.key ? (
                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                    ) : (
                                                        <Trash2 className="w-4 h-4" />
                                                    )}
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Frontend Tab */}
                    <TabsContent value="frontend">
                        <Card className="bg-slate-900/30 border-slate-800">
                            <CardHeader className="flex flex-row items-center justify-between">
                                <div>
                                    <CardTitle className="text-white flex items-center gap-2">
                                        <Monitor className="w-5 h-5 text-purple-400" />
                                        Cache do Frontend
                                    </CardTitle>
                                    <CardDescription>
                                        Cache local no navegador (Session Storage)
                                    </CardDescription>
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={clearFrontendCache}
                                    className="border-slate-700"
                                >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Limpar
                                </Button>
                            </CardHeader>
                            <CardContent>
                                <div className="text-center py-8">
                                    <Monitor className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                                    <p className="text-slate-400">
                                        O cache do frontend é armazenado localmente no navegador.
                                    </p>
                                    <p className="text-sm text-slate-500 mt-2">
                                        Clique em "Limpar" para remover todas as entradas cacheadas.
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Pending Requests Tab */}
                    <TabsContent value="pending">
                        <Card className="bg-slate-900/30 border-slate-800">
                            <CardHeader>
                                <CardTitle className="text-white flex items-center gap-2">
                                    <Clock className="w-5 h-5 text-orange-400" />
                                    Requisições em Andamento
                                </CardTitle>
                                <CardDescription>
                                    Requisições sendo processadas pelo servidor
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                {cacheInfo?.pending_requests.length === 0 ? (
                                    <div className="text-center py-8">
                                        <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
                                        <p className="text-slate-400">Nenhuma requisição em andamento</p>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {cacheInfo?.pending_requests.map((req) => (
                                            <div
                                                key={req.key}
                                                className="p-4 bg-slate-800/50 rounded-lg border-l-4 border-orange-500"
                                            >
                                                <div className="flex items-center justify-between mb-2">
                                                    <Badge variant="secondary" className="bg-orange-500/20 text-orange-300">
                                                        {req.endpoint}
                                                    </Badge>
                                                    <span className="text-sm text-slate-400">
                                                        {formatDuration(req.running_for)}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-slate-500 font-mono">{req.params}</p>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Dedup Stats */}
                                <div className="mt-6 p-4 bg-slate-800/30 rounded-lg">
                                    <h4 className="text-sm font-medium text-slate-300 mb-3">Estatísticas de Deduplicação</h4>
                                    <div className="grid grid-cols-3 gap-4 text-center">
                                        <div>
                                            <p className="text-xl font-bold text-emerald-400">{cacheInfo?.deduplication_stats.completed_count}</p>
                                            <p className="text-xs text-slate-500">Completadas</p>
                                        </div>
                                        <div>
                                            <p className="text-xl font-bold text-purple-400">{cacheInfo?.deduplication_stats.deduplicated_count}</p>
                                            <p className="text-xs text-slate-500">Deduplicadas</p>
                                        </div>
                                        <div>
                                            <p className="text-xl font-bold text-blue-400">{cacheInfo?.deduplication_stats.timeout}s</p>
                                            <p className="text-xs text-slate-500">Timeout</p>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
};

export default CacheManager;
