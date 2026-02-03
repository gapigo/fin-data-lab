import { useState, useEffect } from 'react';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar';
import { ContextTabs } from '@/components/dashboard/ContextTabs';
import { FundSelector } from '@/components/dashboard/FundSelector';
import FundDetails from './FundDetails';
import FundLab from './FundLab';
import FlagshipPeer from './FlagshipPeer';
import CacheManager from './CacheManager';
import Allocators from './AllocatorsIntelligence';
import AllocatorsSimplified from './AllocatorsSimplified';
import {
  HomeView,
  PerformanceView,
  RealtimeView,
  UsersView,
  TrafficView,
  EngagementView,
  RevenueView,
  SalesView,
  ProductsView,
  TrendsView,
  DistributionView,
  PredictionsView,
} from '@/components/dashboard/views';

// ============================================================================
// CONFIGURAÇÃO: Mostrar ou ocultar abas de analytics (para desenvolvimento)
// ============================================================================
const SHOW_ANALYTICS_VIEWS = false;  // Altere para true para ver as abas de analytics

interface ViewConfig {
  id: string;
  title: string;
  tabs: { id: string; label: string }[];
}

const viewConfigs: Record<string, ViewConfig> = {
  home: {
    id: 'home',
    title: 'Início',
    tabs: [],
  },
  'fund-summary': {
    id: 'fund-summary',
    title: 'Resumo Fundo',
    tabs: []
  },
  'fund-lab': {
    id: 'fund-lab',
    title: 'Fund Lab',
    tabs: []
  },
  'flagship-peer': {
    id: 'flagship-peer',
    title: 'Flagship Peer',
    tabs: []
  },
  'cache-manager': {
    id: 'cache-manager',
    title: 'Gerenciador de Cache',
    tabs: []
  },
  'allocators': {
    id: 'allocators',
    title: 'Alocadores',
    tabs: []
  },
  'allocators-simplified': {
    id: 'allocators-simplified',
    title: 'Alocadores - Simplificado',
    tabs: []
  },
  // Analytics views (controladas por SHOW_ANALYTICS_VIEWS)
  performance: {
    id: 'performance',
    title: 'Performance',
    tabs: [
      { id: 'overview', label: 'Visão Geral' },
      { id: 'goals', label: 'Metas' },
      { id: 'comparison', label: 'Comparativo' },
    ],
  },
  realtime: {
    id: 'realtime',
    title: 'Tempo Real',
    tabs: [
      { id: 'live', label: 'Ao Vivo' },
      { id: 'events', label: 'Eventos' },
      { id: 'alerts', label: 'Alertas' },
    ],
  },
  users: {
    id: 'users',
    title: 'Usuários',
    tabs: [
      { id: 'overview', label: 'Visão Geral' },
      { id: 'demographics', label: 'Demografia' },
      { id: 'behavior', label: 'Comportamento' },
    ],
  },
  traffic: {
    id: 'traffic',
    title: 'Tráfego',
    tabs: [
      { id: 'sources', label: 'Fontes' },
      { id: 'channels', label: 'Canais' },
      { id: 'campaigns', label: 'Campanhas' },
    ],
  },
  engagement: {
    id: 'engagement',
    title: 'Engajamento',
    tabs: [
      { id: 'funnel', label: 'Funil' },
      { id: 'retention', label: 'Retenção' },
      { id: 'actions', label: 'Ações' },
    ],
  },
  revenue: {
    id: 'revenue',
    title: 'Receita',
    tabs: [
      { id: 'overview', label: 'Visão Geral' },
      { id: 'breakdown', label: 'Detalhamento' },
      { id: 'forecast', label: 'Previsão' },
    ],
  },
  sales: {
    id: 'sales',
    title: 'Vendas',
    tabs: [
      { id: 'overview', label: 'Visão Geral' },
      { id: 'products', label: 'Produtos' },
      { id: 'regions', label: 'Regiões' },
    ],
  },
  products: {
    id: 'products',
    title: 'Produtos',
    tabs: [
      { id: 'catalog', label: 'Catálogo' },
      { id: 'performance', label: 'Performance' },
      { id: 'inventory', label: 'Estoque' },
    ],
  },
  trends: {
    id: 'trends',
    title: 'Tendências',
    tabs: [
      { id: 'analysis', label: 'Análise' },
      { id: 'patterns', label: 'Padrões' },
      { id: 'seasonality', label: 'Sazonalidade' },
    ],
  },
  distribution: {
    id: 'distribution',
    title: 'Distribuição',
    tabs: [
      { id: 'segments', label: 'Segmentos' },
      { id: 'categories', label: 'Categorias' },
      { id: 'geography', label: 'Geografia' },
    ],
  },
  predictions: {
    id: 'predictions',
    title: 'Previsões',
    tabs: [
      { id: 'forecast', label: 'Forecast' },
      { id: 'scenarios', label: 'Cenários' },
      { id: 'insights', label: 'Insights' },
    ],
  },
};

const Index = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeView, setActiveView] = useState(() => {
    // Restaurar última view do localStorage
    const saved = localStorage.getItem('fin_data_lab_active_view');
    return saved || 'home';
  });
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedFundCnpj, setSelectedFundCnpj] = useState(() => {
    const saved = localStorage.getItem('fin_data_lab_selected_fund');
    return saved || "41776752000126";
  });
  const [labFundCnpj, setLabFundCnpj] = useState<string | null>(null);

  const currentViewConfig = viewConfigs[activeView] || viewConfigs.home;

  const handleViewChange = (view: string) => {
    setActiveView(view);
    setActiveTab(viewConfigs[view]?.tabs[0]?.id || 'overview');
    // Salvar no localStorage
    localStorage.setItem('fin_data_lab_active_view', view);
  };

  // Persistir fundo selecionado
  useEffect(() => {
    localStorage.setItem('fin_data_lab_selected_fund', selectedFundCnpj);
  }, [selectedFundCnpj]);

  // Função para navegar para o Lab com um fundo específico
  const navigateToLab = (cnpj: string) => {
    setLabFundCnpj(cnpj);
    setActiveView('fund-lab');
    localStorage.setItem('fin_data_lab_active_view', 'fund-lab');
  };

  const renderView = () => {
    switch (activeView) {
      case 'home':
        return <HomeViewCustom onNavigateToView={handleViewChange} />;
      case 'fund-summary':
        return (
          <div className="flex flex-col min-h-screen bg-[#0F172A]">
            <div className="py-6 px-6 border-b border-slate-800 bg-[#0F172A]">
              <FundSelector onSelect={(cnpj) => setSelectedFundCnpj(cnpj)} selectedCnpj={selectedFundCnpj} />
            </div>
            <FundDetails cnpj={selectedFundCnpj} />
          </div>
        );
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

      // Analytics views (só renderiza se SHOW_ANALYTICS_VIEWS = true)
      case 'performance':
        return SHOW_ANALYTICS_VIEWS ? <PerformanceView /> : <HomeViewCustom onNavigateToView={handleViewChange} />;
      case 'realtime':
        return SHOW_ANALYTICS_VIEWS ? <RealtimeView /> : <HomeViewCustom onNavigateToView={handleViewChange} />;
      case 'users':
        return SHOW_ANALYTICS_VIEWS ? <UsersView /> : <HomeViewCustom onNavigateToView={handleViewChange} />;
      case 'traffic':
        return SHOW_ANALYTICS_VIEWS ? <TrafficView /> : <HomeViewCustom onNavigateToView={handleViewChange} />;
      case 'engagement':
        return SHOW_ANALYTICS_VIEWS ? <EngagementView /> : <HomeViewCustom onNavigateToView={handleViewChange} />;
      case 'revenue':
        return SHOW_ANALYTICS_VIEWS ? <RevenueView /> : <HomeViewCustom onNavigateToView={handleViewChange} />;
      case 'sales':
        return SHOW_ANALYTICS_VIEWS ? <SalesView /> : <HomeViewCustom onNavigateToView={handleViewChange} />;
      case 'products':
        return SHOW_ANALYTICS_VIEWS ? <ProductsView /> : <HomeViewCustom onNavigateToView={handleViewChange} />;
      case 'trends':
        return SHOW_ANALYTICS_VIEWS ? <TrendsView /> : <HomeViewCustom onNavigateToView={handleViewChange} />;
      case 'distribution':
        return SHOW_ANALYTICS_VIEWS ? <DistributionView /> : <HomeViewCustom onNavigateToView={handleViewChange} />;
      case 'predictions':
        return SHOW_ANALYTICS_VIEWS ? <PredictionsView /> : <HomeViewCustom onNavigateToView={handleViewChange} />;
      default:
        return <HomeViewCustom onNavigateToView={handleViewChange} />;
    }
  };

  const showTabs = SHOW_ANALYTICS_VIEWS &&
    activeView !== 'fund-summary' &&
    activeView !== 'fund-lab' &&
    activeView !== 'flagship-peer' &&
    activeView !== 'allocators' &&
    activeView !== 'allocators-simplified' &&
    activeView !== 'cache-manager' &&
    activeView !== 'home';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <DashboardHeader
        onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
        sidebarCollapsed={sidebarCollapsed}
      />

      <div className="flex w-full">
        <DashboardSidebar
          collapsed={sidebarCollapsed}
          activeView={activeView}
          onViewChange={handleViewChange}
          showAnalytics={SHOW_ANALYTICS_VIEWS}
        />

        <main className="flex-1 min-w-0">
          {showTabs && (
            <div className="border-b border-border bg-card/30">
              <div className="px-6 pt-6 pb-0">
                <h1 className="text-2xl font-bold mb-1">
                  {currentViewConfig.title}
                </h1>
                <p className="text-sm text-muted-foreground mb-4">
                  Análise completa e métricas em tempo real
                </p>
              </div>
              <ContextTabs
                tabs={currentViewConfig.tabs}
                activeTab={activeTab}
                onTabChange={setActiveTab}
              />
            </div>
          )}

          <div className="overflow-auto">{renderView()}</div>
        </main>
      </div>
    </div>
  );
};

// ============================================================================
// HOME VIEW CUSTOMIZADA
// ============================================================================
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  LineChart,
  FlaskConical,
  Users,
  Database,
  ArrowRight,
  TrendingUp,
  Building2,
  BarChart3
} from 'lucide-react';

interface HomeViewCustomProps {
  onNavigateToView: (view: string) => void;
}

const HomeViewCustom = ({ onNavigateToView }: HomeViewCustomProps) => {
  const features = [
    {
      id: 'fund-summary',
      icon: LineChart,
      title: 'Resumo Fundo',
      description: 'Visualize métricas rápidas, gráficos de rentabilidade e informações essenciais de qualquer fundo.',
      color: 'from-blue-500 to-cyan-500',
      bgColor: 'bg-blue-500/10'
    },
    {
      id: 'fund-lab',
      icon: FlaskConical,
      title: 'Fund Lab',
      description: 'Análise profunda com carteira detalhada, estrutura do fundo, relacionamentos e AI Analyst.',
      color: 'from-emerald-500 to-teal-500',
      bgColor: 'bg-emerald-500/10'
    },
    {
      id: 'flagship-peer',
      icon: Users,
      title: 'Flagship Peer',
      description: 'Compare fundos side-by-side, crie peer groups personalizados e analise fluxos.',
      color: 'from-purple-500 to-pink-500',
      bgColor: 'bg-purple-500/10'
    },
    {
      id: 'cache-manager',
      icon: Database,
      title: 'Gerenciador de Cache',
      description: 'Visualize e gerencie o cache do sistema. Limpe dados obsoletos e monitore performance.',
      color: 'from-orange-500 to-amber-500',
      bgColor: 'bg-orange-500/10'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-8">
      {/* Hero Section */}
      <div className="max-w-6xl mx-auto mb-12">
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-4">
            <div className="p-4 bg-gradient-to-r from-emerald-500/20 to-blue-500/20 rounded-2xl border border-emerald-500/30">
              <BarChart3 className="w-12 h-12 text-emerald-400" />
            </div>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent mb-4">
            Fin Data Lab
          </h1>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto">
            Plataforma completa para análise de fundos de investimento com dados da CVM.
            Explore carteiras, compare performance e tome decisões baseadas em dados.
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
          <Card className="bg-slate-900/50 border-slate-800">
            <CardContent className="p-4 text-center">
              <TrendingUp className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
              <p className="text-2xl font-bold text-white">30k+</p>
              <p className="text-xs text-slate-500">Fundos Ativos</p>
            </CardContent>
          </Card>
          <Card className="bg-slate-900/50 border-slate-800">
            <CardContent className="p-4 text-center">
              <Building2 className="w-8 h-8 text-blue-400 mx-auto mb-2" />
              <p className="text-2xl font-bold text-white">800+</p>
              <p className="text-xs text-slate-500">Gestoras</p>
            </CardContent>
          </Card>
          <Card className="bg-slate-900/50 border-slate-800">
            <CardContent className="p-4 text-center">
              <BarChart3 className="w-8 h-8 text-purple-400 mx-auto mb-2" />
              <p className="text-2xl font-bold text-white">R$ 8T+</p>
              <p className="text-xs text-slate-500">Total PL</p>
            </CardContent>
          </Card>
          <Card className="bg-slate-900/50 border-slate-800">
            <CardContent className="p-4 text-center">
              <Database className="w-8 h-8 text-orange-400 mx-auto mb-2" />
              <p className="text-2xl font-bold text-white">10+</p>
              <p className="text-xs text-slate-500">Anos de Dados</p>
            </CardContent>
          </Card>
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {features.map((feature) => (
            <Card
              key={feature.id}
              className="bg-slate-900/30 border-slate-800 hover:border-slate-700 transition-all duration-300 cursor-pointer group"
              onClick={() => onNavigateToView(feature.id)}
            >
              <CardHeader className="pb-4">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-xl ${feature.bgColor}`}>
                    <feature.icon className={`w-6 h-6 bg-gradient-to-r ${feature.color} bg-clip-text`} style={{ color: feature.color.includes('emerald') ? '#10b981' : feature.color.includes('blue') ? '#3b82f6' : feature.color.includes('purple') ? '#a855f7' : '#f97316' }} />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-lg text-white group-hover:text-emerald-400 transition-colors">
                      {feature.title}
                    </CardTitle>
                  </div>
                  <ArrowRight className="w-5 h-5 text-slate-600 group-hover:text-emerald-400 group-hover:translate-x-1 transition-all" />
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-slate-400">
                  {feature.description}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Index;
