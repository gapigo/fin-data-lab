import React, { useState, useEffect, useRef } from 'react';
import { Database, Play, RefreshCw, Clock, AlertTriangle, CheckCircle, XCircle, Download, History } from 'lucide-react';

const API_BASE = 'http://127.0.0.1:8000';

interface IngestionStatus {
    cotas_last_date: string | null;
    carteira_last_date: string | null;
    days_outdated: number | null;
    raw_last_date: string | null;
}

interface HistoryEntry {
    file_name: string;
    relative_path: string;
    downloaded_at: string;
}

const IngestionPage: React.FC = () => {
    const [status, setStatus] = useState<IngestionStatus | null>(null);
    const [loading, setLoading] = useState(true);
    const [running, setRunning] = useState(false);
    const [logs, setLogs] = useState<string[]>([]);
    const [history, setHistory] = useState<HistoryEntry[]>([]);
    const [historyLoading, setHistoryLoading] = useState(true);
    const logEndRef = useRef<HTMLDivElement>(null);

    // ── Fetch status on load ────────────────────────────────────────────

    const fetchStatus = async () => {
        try {
            const resp = await fetch(`${API_BASE}/ingestion/status`);
            const data = await resp.json();
            setStatus(data);
        } catch (e) {
            console.error('Failed to fetch status', e);
        } finally {
            setLoading(false);
        }
    };

    const fetchHistory = async () => {
        setHistoryLoading(true);
        try {
            const resp = await fetch(`${API_BASE}/ingestion/history`);
            const data = await resp.json();
            setHistory(data.history || []);
        } catch (e) {
            console.error('Failed to fetch history', e);
        } finally {
            setHistoryLoading(false);
        }
    };

    useEffect(() => {
        fetchStatus();
        fetchHistory();
    }, []);

    // ── Auto-scroll logs ─────────────────────────────────────────────────

    useEffect(() => {
        logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [logs]);

    // ── Run update ───────────────────────────────────────────────────────

    const runUpdate = async () => {
        setRunning(true);
        setLogs([]);

        try {
            const resp = await fetch(`${API_BASE}/ingestion/run`, { method: 'POST' });
            const reader = resp.body?.getReader();
            if (!reader) throw new Error('No response body');

            const decoder = new TextDecoder();
            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const payload = line.slice(6);
                        try {
                            const parsed = JSON.parse(payload);
                            if (parsed.type === 'log') {
                                setLogs(prev => [...prev, parsed.message]);
                            } else if (parsed.type === 'done') {
                                setLogs(prev => [...prev, '', `✅ ${parsed.message}`]);
                                setRunning(false);
                                fetchStatus();
                                fetchHistory();
                            } else if (parsed.type === 'error') {
                                setLogs(prev => [...prev, '', `❌ ${parsed.message}`]);
                                setRunning(false);
                            } else if (parsed.type === 'info') {
                                setLogs(prev => [...prev, `ℹ️ ${parsed.message}`]);
                            }
                        } catch {
                            setLogs(prev => [...prev, line]);
                        }
                    }
                }
            }
        } catch (e: any) {
            setLogs(prev => [...prev, '', `❌ Erro de conexão: ${e.message}`]);
        } finally {
            setRunning(false);
        }
    };

    // ── Helpers ──────────────────────────────────────────────────────────

    const daysOutdated = status?.days_outdated ?? null;
    const badgeColor =
        daysOutdated === null
            ? 'bg-gray-600'
            : daysOutdated < 7
                ? 'bg-emerald-500'
                : daysOutdated < 30
                    ? 'bg-amber-500'
                    : 'bg-red-500';

    const badgeText =
        daysOutdated === null
            ? 'Sem dados'
            : daysOutdated < 7
                ? 'Atualizado'
                : daysOutdated < 30
                    ? `${daysOutdated} dias`
                    : `${daysOutdated} dias`;

    return (
        <div className="min-h-screen bg-[var(--bg-primary)] pb-20">
            {/* Header */}
            <div className="sticky top-0 z-30 bg-[var(--bg-primary)]/80 backdrop-blur-md border-b border-[var(--border-subtle)] px-8 py-6">
                <div className="max-w-[1400px] mx-auto flex items-center gap-3">
                    <div className="p-2 bg-[var(--accent-light)] rounded-lg">
                        <Database className="w-6 h-6 text-[var(--accent-primary)]" />
                    </div>
                    <h1 className="text-2xl font-bold text-[var(--text-primary)]">
                        Ingestão de Dados
                    </h1>
                </div>
            </div>

            <div className="max-w-[1400px] mx-auto px-8 py-8 space-y-8 animate-in fade-in duration-500">

                {/* ── Section 1: Data Freshness Status ──────────────────── */}

                <section>
                    <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
                        <Clock className="w-5 h-5 text-[var(--text-muted)]" />
                        Status dos Dados
                    </h2>

                    {loading ? (
                        <div className="text-[var(--text-muted)]">Carregando...</div>
                    ) : status ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <StatusCard
                                label="Cotas (última data)"
                                value={status.cotas_last_date || 'N/A'}
                                badge={badgeText}
                                badgeColor={badgeColor}
                            />
                            <StatusCard
                                label="Carteira (última data)"
                                value={status.carteira_last_date || 'N/A'}
                                badge={badgeText}
                                badgeColor={badgeColor}
                            />
                            <StatusCard
                                label="Dados Brutos (última data)"
                                value={status.raw_last_date || 'N/A'}
                                badge={badgeText}
                                badgeColor={badgeColor}
                            />
                            <StatusCard
                                label="Dias desatualizado"
                                value={daysOutdated !== null ? `${daysOutdated} dias` : 'N/A'}
                                badge={badgeText}
                                badgeColor={badgeColor}
                            />
                        </div>
                    ) : (
                        <div className="text-[var(--negative)]">Erro ao carregar status.</div>
                    )}
                </section>

                {/* ── Section 2: Run Update ─────────────────────────────── */}

                <section>
                    <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
                        <RefreshCw className="w-5 h-5 text-[var(--text-muted)]" />
                        Atualizar Dados
                    </h2>

                    <div className="bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-xl p-6">
                        <p className="text-[var(--text-muted)] text-sm mb-4">
                            Executa o pipeline incremental de atualização: download, ingestão, atualização de views e métricas.
                            Nenhum dado existente é removido.
                        </p>

                        <button
                            onClick={runUpdate}
                            disabled={running}
                            className={`
                                inline-flex items-center gap-2 px-6 py-3 rounded-lg font-medium text-sm transition-all
                                ${running
                                    ? 'bg-[var(--bg-sunken)] text-[var(--text-muted)] cursor-not-allowed'
                                    : 'bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)] text-white shadow-lg'
                                }
                            `}
                        >
                            {running ? (
                                <>
                                    <RefreshCw className="w-4 h-4 animate-spin" />
                                    Executando...
                                </>
                            ) : (
                                <>
                                    <Play className="w-4 h-4" />
                                    Atualizar Dados
                                </>
                            )}
                        </button>

                        {/* Terminal-style log output */}
                        {logs.length > 0 && (
                            <div className="mt-4 bg-[var(--bg-sunken)] border border-[var(--border-subtle)] rounded-lg p-4 font-mono text-xs leading-relaxed max-h-96 overflow-y-auto">
                                {logs.map((line, i) => (
                                    <div
                                        key={i}
                                        className={
                                            line.startsWith('❌')
                                                ? 'text-[var(--negative)]'
                                                : line.startsWith('✅')
                                                    ? 'text-[var(--positive)]'
                                                    : line.startsWith('ℹ️')
                                                        ? 'text-[var(--cvm-color)]'
                                                        : line.startsWith('[ERROR]')
                                                            ? 'text-[var(--negative)]'
                                                            : line.startsWith('[OK]')
                                                                ? 'text-[var(--positive)]'
                                                                : line.startsWith('STEP')
                                                                    ? 'text-[var(--accent-primary)] font-bold'
                                                                    : 'text-[var(--text-secondary)]'
                                        }
                                    >
                                        {line}
                                    </div>
                                ))}
                                <div ref={logEndRef} />
                            </div>
                        )}
                    </div>
                </section>

                {/* ── Section 3: Ingestion History ──────────────────────── */}

                <section>
                    <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
                        <History className="w-5 h-5 text-[var(--text-muted)]" />
                        Histórico de Downloads
                    </h2>

                    {historyLoading ? (
                        <div className="text-[var(--text-muted)]">Carregando...</div>
                    ) : history.length === 0 ? (
                        <div className="bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-xl p-6 text-[var(--text-muted)] text-sm">
                            Nenhum download registrado. Execute uma atualização para começar.
                        </div>
                    ) : (
                        <div className="bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-xl overflow-hidden">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-[var(--border-subtle)] text-[var(--text-muted)]">
                                        <th className="text-left px-4 py-3 font-medium">Arquivo</th>
                                        <th className="text-left px-4 py-3 font-medium">Caminho</th>
                                        <th className="text-left px-4 py-3 font-medium">Data</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {history.map((entry, i) => (
                                        <tr
                                            key={i}
                                            className="border-b border-[var(--border-subtle)]/50 text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)]/30 transition-colors"
                                        >
                                            <td className="px-4 py-3 flex items-center gap-2">
                                                <Download className="w-3.5 h-3.5 text-[var(--accent-primary)] shrink-0" />
                                                {entry.file_name}
                                            </td>
                                            <td className="px-4 py-3 text-[var(--text-muted)] font-mono text-xs">
                                                {entry.relative_path}
                                            </td>
                                            <td className="px-4 py-3 text-[var(--text-muted)]">
                                                {entry.downloaded_at}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>

            </div>
        </div>
    );
};

// ── Status Card Component ──────────────────────────────────────────────────

interface StatusCardProps {
    label: string;
    value: string;
    badge: string;
    badgeColor: string;
}

const StatusCard: React.FC<StatusCardProps> = ({ label, value, badge, badgeColor }) => (
    <div className="bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-xl p-5 space-y-2">
        <div className="text-[var(--text-muted)] text-xs uppercase tracking-wider">{label}</div>
        <div className="text-[var(--text-primary)] text-xl font-semibold">{value}</div>
        <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium text-white ${badgeColor}`}>
            {badge}
        </span>
    </div>
);

export default IngestionPage;
