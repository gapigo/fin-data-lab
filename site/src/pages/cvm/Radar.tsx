import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Info, RefreshCw } from 'lucide-react';

interface Anomaly {
  type: string;
  severity: 'high' | 'info';
  cnpj: string;
  name: string;
  description: string;
}

export default function Radar() {
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [generatedAt, setGeneratedAt] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const fetchAnomalies = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/radar/anomalies');
      const data = await res.json();
      setAnomalies(data.anomalies || []);
      setGeneratedAt(data.generated_at || '');
    } catch {
      setAnomalies([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnomalies();
  }, []);

  const high = anomalies.filter(a => a.severity === 'high');
  const info = anomalies.filter(a => a.severity === 'info');

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]" style={{ fontFamily: 'var(--font-display)' }}>
            Radar de Anomalias
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Última análise: {generatedAt ? new Date(generatedAt).toLocaleString('pt-BR') : '—'}
          </p>
        </div>
        <button
          onClick={fetchAnomalies}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[var(--border-default)] text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] transition-colors"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Atualizar
        </button>
      </div>

      {high.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-[var(--negative)] uppercase tracking-wider mb-3">
            Alta Prioridade ({high.length})
          </h2>
          <div className="space-y-3">
            {high.map((a, i) => (
              <div
                key={i}
                className="flex items-start gap-3 p-4 rounded-lg border border-[var(--negative)]/20 bg-[var(--negative-bg)]"
              >
                <AlertTriangle size={18} className="text-[var(--negative)] mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-[var(--text-primary)]">{a.name}</span>
                    <span className="text-xs text-[var(--text-muted)]">CNPJ: {a.cnpj}</span>
                  </div>
                  <p className="text-sm text-[var(--text-secondary)] mt-1">{a.description}</p>
                  <button
                    onClick={() => navigate(`/cvm/lab/${a.cnpj}`)}
                    className="text-xs text-[var(--accent-primary)] hover:underline mt-2"
                  >
                    Ver fundo →
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {info.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-[var(--cvm-color)] uppercase tracking-wider mb-3">
            Informativo ({info.length})
          </h2>
          <div className="space-y-3">
            {info.map((a, i) => (
              <div
                key={i}
                className="flex items-start gap-3 p-4 rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)]"
              >
                <Info size={18} className="text-[var(--cvm-color)] mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-[var(--text-primary)]">{a.name}</span>
                    <span className="text-xs text-[var(--text-muted)]">CNPJ: {a.cnpj}</span>
                  </div>
                  <p className="text-sm text-[var(--text-secondary)] mt-1">{a.description}</p>
                  <button
                    onClick={() => navigate(`/cvm/lab/${a.cnpj}`)}
                    className="text-xs text-[var(--accent-primary)] hover:underline mt-2"
                  >
                    Ver fundo →
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {anomalies.length === 0 && !loading && (
        <div className="text-center py-12 text-[var(--text-muted)]">
          Nenhuma anomalia detectada no momento.
        </div>
      )}
    </div>
  );
}
