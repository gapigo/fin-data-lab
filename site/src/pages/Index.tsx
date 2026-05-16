import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar';
import { DataCard } from '@/components/ui/DataCard';
import { PillarTag } from '@/components/ui/PillarTag';
import { StatusIndicator } from '@/components/ui/StatusIndicator';
import { LoadingSkeleton as Skeleton } from '@/components/ui/LoadingSkeleton';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart3,
  TrendingUp,
  Bitcoin,
  ArrowRight,
  FlaskConical,
  Users,
  Database,
  AlertTriangle,
  Download,
  BookOpen,
  Bot,
} from 'lucide-react';
import FundDetails from './FundDetails';
import FundLab from './FundLab';
import FlagshipPeer from './FlagshipPeer';
import CacheManager from './CacheManager';
import Allocators from './Allocators';
import AllocatorsSimplified from './AllocatorsSimplified';
import AllocatorsIntelligence from './AllocatorsIntelligence';
import Ingestion from './Ingestion';

// ============================================================================
// TYPES
// ============================================================================

interface ViewConfig {
  id: string;
  title: string;
  tabs: { id: string; label: string }[];
}

interface IngestionStatus {
  cotas_last_date: string | null;
  carteira_last_date: string | null;
  cadastro_last_date: string | null;
  raw_last_date: string | null;
  fund_count?: number;
  total_pl?: number;
}

// ============================================================================
// VIEW CONFIGS
// ============================================================================

const viewConfigs: Record<string, ViewConfig> = {
  home: { id: 'home', title: 'Início', tabs: [] },
  'fund-summary': { id: 'fund-summary', title: 'Resumo Fundo', tabs: [] },
  'fund-lab': { id: 'fund-lab', title: 'Fund Lab', tabs: [] },
  'flagship-peer': { id: 'flagship-peer', title: 'Flagship Peer', tabs: [] },
  'cache-manager': { id: 'cache-manager', title: 'Gerenciador de Cache', tabs: [] },
  allocators: { id: 'allocators', title: 'Alocadores', tabs: [] },
  'allocators-simplified': { id: 'allocators-simplified', title: 'Alocadores - Simplificado', tabs: [] },
  'allocators-intelligence': { id: 'allocators-intelligence', title: 'Allocators Intelligence', tabs: [] },
  ingestion: { id: 'ingestion', title: 'Ingestão', tabs: [] },
  acoes: { id: 'acoes', title: 'Ações B3', tabs: [] },
  crypto: { id: 'crypto', title: 'Crypto', tabs: [] },
  'sql-console': { id: 'sql-console', title: 'SQL Console', tabs: [] },
  notebooks: { id: 'notebooks', title: 'Notebooks', tabs: [] },
  'ai-research': { id: 'ai-research', title: 'AI Research', tabs: [] },
  banco: { id: 'banco', title: 'Banco de Dados', tabs: [] },
  config: { id: 'config', title: 'Configurações', tabs: [] },
};

// ============================================================================
// INGESTION STATUS FETCH
// ============================================================================

async function fetchIngestionStatus(): Promise<IngestionStatus> {
  const res = await fetch('http://localhost:8000/ingestion/status');
  if (!res.ok) throw new Error('Failed to fetch ingestion status');
  return res.json();
}

// ============================================================================
// HOME VIEW
// ============================================================================

const HomeView = ({ onNavigateToView }: { onNavigateToView: (view: string) => void }) => {
  const { data: status, isLoading: statusLoading } = useQuery({
    queryKey: ['ingestion-status'],
    queryFn: fetchIngestionStatus,
    staleTime: 1000 * 60 * 2,
  });

  const now = new Date();
  const cotasDate = status?.cotas_last_date ? new Date(status.cotas_last_date) : null;
  const cadastroDate = status?.cadastro_last_date ? new Date(status.cadastro_last_date) : null;

  return (
    <div className="min-h-[calc(100vh-var(--header-height))] bg-[var(--bg-primary)]">
      {/* Section 1 — Hero */}
      <section className="px-6 py-10 lg:px-12 lg:py-14 border-b border-[var(--border-subtle)]">
        <div className="max-w-5xl">
          <h1
            className="text-4xl lg:text-5xl font-normal text-[var(--text-primary)] mb-3"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Fin·Data·Lab
          </h1>
          <p className="text-lg text-[var(--text-secondary)] mb-6">
            Pesquisa Financeira. Dados Abertos. Sem Filtro.
          </p>

          <div className="flex flex-wrap gap-4 items-center">
            {statusLoading ? (
              <Skeleton width={200} height={20} />
            ) : (
              <>
                {cotasDate && (
                  <div className="flex items-center gap-2">
                    <PillarTag pillar="cvm" />
                    <StatusIndicator lastUpdate={cotasDate} thresholds={{ green: 24, yellow: 72 }} />
                  </div>
                )}
                {cadastroDate && (
                  <div className="flex items-center gap-2">
                    <PillarTag pillar="acoes" />
                    <StatusIndicator lastUpdate={cadastroDate} thresholds={{ green: 24, yellow: 72 }} />
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </section>

      {/* Section 2 — Three Pillars */}
      <section className="px-6 py-8 lg:px-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-6xl">
          {/* CVM Card */}
          <button
            onClick={() => onNavigateToView('fund-lab')}
            className="text-left group rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-6 transition-all duration-150 hover:border-[var(--cvm-color)] hover:shadow-sm"
          >
            <div className="flex items-center gap-3 mb-4">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: 'var(--cvm-light)', color: 'var(--cvm-color)' }}
              >
                <BarChart3 size={20} />
              </div>
              <div>
                <h3 className="font-semibold text-[var(--text-primary)]">CVM / Fundos</h3>
                <PillarTag pillar="cvm" />
              </div>
            </div>
            <div className="space-y-1.5 mb-4">
              <p className="text-sm text-[var(--text-secondary)]">
                {statusLoading ? <Skeleton width={160} height={16} /> : (
                  status?.fund_count
                    ? `${status.fund_count.toLocaleString('pt-BR')} fundos · ${status.total_pl ? 'R$' + (status.total_pl / 1e12).toFixed(1) + 'T PL' : 'PL indisponível'}`
                    : '30k+ fundos · R$8T+ PL'
                )}
              </p>
              <p className="text-xs text-[var(--text-muted)]">
                {statusLoading ? <Skeleton width={100} height={14} /> : `Dados até ${cotasDate?.toLocaleDateString('pt-BR') || '—'}`}
              </p>
            </div>
            <span className="inline-flex items-center gap-1 text-sm font-medium text-[var(--cvm-color)] group-hover:gap-2 transition-all">
              Explorar <ArrowRight size={14} />
            </span>
          </button>

          {/* Ações Card */}
          <button
            onClick={() => onNavigateToView('acoes')}
            className="text-left group rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-6 transition-all duration-150 hover:border-[var(--acoes-color)] hover:shadow-sm"
          >
            <div className="flex items-center gap-3 mb-4">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: 'var(--acoes-light)', color: 'var(--acoes-color)' }}
              >
                <TrendingUp size={20} />
              </div>
              <div>
                <h3 className="font-semibold text-[var(--text-primary)]">Ações B3</h3>
                <PillarTag pillar="acoes" />
              </div>
            </div>
            <div className="space-y-1.5 mb-4">
              <p className="text-sm text-[var(--text-secondary)]">
                {statusLoading ? <Skeleton width={120} height={16} /> : '456 ativos · IBOV 127k'}
              </p>
              <p className="text-xs text-[var(--text-muted)]">
                {statusLoading ? <Skeleton width={100} height={14} /> : `Atualizado ${now.toLocaleDateString('pt-BR')}`}
              </p>
            </div>
            <span className="inline-flex items-center gap-1 text-sm font-medium text-[var(--acoes-color)] group-hover:gap-2 transition-all">
              Explorar <ArrowRight size={14} />
            </span>
          </button>

          {/* Crypto Card */}
          <button
            onClick={() => onNavigateToView('crypto')}
            className="text-left group rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-6 transition-all duration-150 hover:border-[var(--crypto-color)] hover:shadow-sm"
          >
            <div className="flex items-center gap-3 mb-4">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: 'var(--crypto-light)', color: 'var(--crypto-color)' }}
              >
                <Bitcoin size={20} />
              </div>
              <div>
                <h3 className="font-semibold text-[var(--text-primary)]">Crypto</h3>
                <PillarTag pillar="crypto" />
              </div>
            </div>
            <div className="space-y-1.5 mb-4">
              <p className="text-sm text-[var(--text-secondary)]">
                {statusLoading ? <Skeleton width={120} height={16} /> : '200+ pares · BTC 95k USD'}
              </p>
              <p className="text-xs text-[var(--text-muted)]">Tempo real</p>
            </div>
            <span className="inline-flex items-center gap-1 text-sm font-medium text-[var(--crypto-color)] group-hover:gap-2 transition-all">
              Explorar <ArrowRight size={14} />
            </span>
          </button>
        </div>
      </section>

      {/* Section 3 — Quick Access */}
      <section className="px-6 py-4 lg:px-12">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-4">
          Acesso Rápido
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-3xl">
          <button
            onClick={() => onNavigateToView('fund-summary')}
            className="flex items-center gap-3 p-4 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] text-left hover:border-[var(--accent-border)] hover:bg-[var(--accent-light)] transition-all"
          >
            <FlaskConical size={18} className="text-[var(--accent-primary)]" />
            <div>
              <p className="text-sm font-medium text-[var(--text-primary)]">Resumo Fundo</p>
              <p className="text-xs text-[var(--text-muted)]">Análise detalhada por CNPJ</p>
            </div>
          </button>

          <button
            onClick={() => onNavigateToView('fund-lab')}
            className="flex items-center gap-3 p-4 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] text-left hover:border-[var(--accent-border)] hover:bg-[var(--accent-light)] transition-all"
          >
            <BookOpen size={18} className="text-[var(--accent-primary)]" />
            <div>
              <p className="text-sm font-medium text-[var(--text-primary)]">Fund Lab</p>
              <p className="text-xs text-[var(--text-muted)]">Laboratório de análise de fundos</p>
            </div>
          </button>

          <button
            onClick={() => onNavigateToView('flagship-peer')}
            className="flex items-center gap-3 p-4 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] text-left hover:border-[var(--accent-border)] hover:bg-[var(--accent-light)] transition-all"
          >
            <Users size={18} className="text-[var(--accent-primary)]" />
            <div>
              <p className="text-sm font-medium text-[var(--text-primary)]">Peer Groups</p>
              <p className="text-xs text-[var(--text-muted)]">Comparação entre fundos</p>
            </div>
          </button>

          <button
            onClick={() => onNavigateToView('ingestion')}
            className="flex items-center gap-3 p-4 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] text-left hover:border-[var(--accent-border)] hover:bg-[var(--accent-light)] transition-all"
          >
            <Download size={18} className="text-[var(--accent-primary)]" />
            <div>
              <p className="text-sm font-medium text-[var(--text-primary)]">Ingestão</p>
              <p className="text-xs text-[var(--text-muted)]">Pipeline de dados CVM</p>
            </div>
          </button>
        </div>
      </section>

      {/* Section 4 — Recent Alerts */}
      <section className="px-6 py-8 lg:px-12">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-4">
          Alertas Recentes
        </h2>
        <div className="max-w-3xl space-y-2">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-[var(--negative-bg)] border border-[var(--negative-bg)]">
            <AlertTriangle size={16} className="text-[var(--negative)] shrink-0" />
            <p className="text-sm text-[var(--text-primary)]">
              3 fundos com variação de cota {'>'} 5% hoje
            </p>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)]">
            <AlertTriangle size={16} className="text-[var(--accent-primary)] shrink-0" />
            <p className="text-sm text-[var(--text-primary)]">
              12 novos fundos cadastrados na CVM esta semana
            </p>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-lg bg-[var(--positive-bg)] border border-[var(--positive-bg)]">
            <TrendingUp size={16} className="text-[var(--positive)] shrink-0" />
            <p className="text-sm text-[var(--text-primary)]">
              PETR4 acima da média móvel 200d
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};

// ============================================================================
// MAIN INDEX / LAYOUT
// ============================================================================

const Index = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeView, setActiveView] = useState(() => {
    const saved = localStorage.getItem('fin_data_lab_active_view');
    return saved || 'home';
  });
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedFundCnpj, setSelectedFundCnpj] = useState(() => {
    const saved = localStorage.getItem('fin_data_lab_selected_fund');
    return saved || '41776752000126';
  });
  const [labFundCnpj, setLabFundCnpj] = useState<string | null>(null);

  const currentViewConfig = viewConfigs[activeView] || viewConfigs.home;

  const handleViewChange = (view: string) => {
    setActiveView(view);
    setActiveTab(viewConfigs[view]?.tabs[0]?.id || 'overview');
    localStorage.setItem('fin_data_lab_active_view', view);
  };

  useEffect(() => {
    localStorage.setItem('fin_data_lab_selected_fund', selectedFundCnpj);
  }, [selectedFundCnpj]);

  const navigateToLab = (cnpj: string) => {
    setLabFundCnpj(cnpj);
    setActiveView('fund-lab');
    localStorage.setItem('fin_data_lab_active_view', 'fund-lab');
  };

  const renderView = () => {
    switch (activeView) {
      case 'home':
        return <HomeView onNavigateToView={handleViewChange} />;
      case 'fund-summary':
        return <FundDetails cnpj={selectedFundCnpj} />;
      case 'fund-lab':
        return <FundLab initialCnpj={labFundCnpj} />;
      case 'flagship-peer':
        return <FlagshipPeer onNavigateToLab={navigateToLab} />;
      case 'cache-manager':
        return <CacheManager />;
      case 'allocators':
        return <Allocators />;
      case 'allocators-simplified':
        return <AllocatorsSimplified />;
      case 'allocators-intelligence':
        return <AllocatorsIntelligence />;
      case 'ingestion':
        return <Ingestion />;
      case 'acoes':
        return (
          <div className="p-8 text-center text-[var(--text-muted)]">
            <TrendingUp size={48} className="mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-2">Ações B3</h2>
            <p>Módulo em desenvolvimento</p>
          </div>
        );
      case 'crypto':
        return (
          <div className="p-8 text-center text-[var(--text-muted)]">
            <Bitcoin size={48} className="mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-2">Crypto</h2>
            <p>Módulo em desenvolvimento</p>
          </div>
        );
      case 'sql-console':
      case 'notebooks':
      case 'ai-research':
      case 'banco':
      case 'config':
        return (
          <div className="p-8 text-center text-[var(--text-muted)]">
            <Bot size={48} className="mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-2">{currentViewConfig.title}</h2>
            <p>Módulo em desenvolvimento</p>
          </div>
        );
      default:
        return <HomeView onNavigateToView={handleViewChange} />;
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <DashboardHeader
        onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
        sidebarCollapsed={sidebarCollapsed}
      />

      <div className="flex w-full">
        <DashboardSidebar
          collapsed={sidebarCollapsed}
          activeView={activeView}
          onViewChange={handleViewChange}
        />

        <main
          className="flex-1 min-w-0 transition-all duration-300"
          style={{
            marginLeft: sidebarCollapsed ? 'var(--sidebar-collapsed)' : 'var(--sidebar-width)',
          }}
        >
          <div className="overflow-auto">{renderView()}</div>
        </main>
      </div>
    </div>
  );
};

export default Index;
