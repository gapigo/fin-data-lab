import { useState, useEffect } from 'react';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar';
import { ContextTabs } from '@/components/dashboard/ContextTabs';
import { FundSelector } from '@/components/dashboard/FundSelector';
import FundDetails from './FundDetails';
import FundLab from './FundLab';
import FlagshipPeer from './FlagshipPeer';
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

interface ViewConfig {
  id: string;
  title: string;
  tabs: { id: string; label: string }[];
}

const viewConfigs: Record<string, ViewConfig> = {
  home: {
    id: 'home',
    title: 'Dashboard',
    tabs: [
      { id: 'overview', label: 'Visão Geral' },
      { id: 'metrics', label: 'Métricas' },
      { id: 'reports', label: 'Relatórios' },
    ],
  },
  'view-fund': {
    id: 'view-fund',
    title: 'Análise de Fundos',
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
  const [activeView, setActiveView] = useState('home');
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedFundCnpj, setSelectedFundCnpj] = useState("41776752000126");

  const currentViewConfig = viewConfigs[activeView] || viewConfigs.home;

  const handleViewChange = (view: string) => {
    setActiveView(view);
    setActiveTab(viewConfigs[view]?.tabs[0]?.id || 'overview');
  };

  const renderView = () => {
    switch (activeView) {
      case 'home':
        return <HomeView />;
      case 'view-fund':
        return (
          <div className="flex flex-col min-h-screen bg-[#0F172A]">
            <div className="py-6 px-6 border-b border-slate-800 bg-[#0F172A]">
              <FundSelector onSelect={(cnpj) => setSelectedFundCnpj(cnpj)} selectedCnpj={selectedFundCnpj} />
            </div>
            <FundDetails cnpj={selectedFundCnpj} />
          </div>
        );
      case 'fund-lab':
        return <FundLab />;
      case 'flagship-peer':
        return <FlagshipPeer />;
      case 'performance':
        return <PerformanceView />;
      case 'realtime':
        return <RealtimeView />;
      case 'users':
        return <UsersView />;
      case 'traffic':
        return <TrafficView />;
      case 'engagement':
        return <EngagementView />;
      case 'revenue':
        return <RevenueView />;
      case 'sales':
        return <SalesView />;
      case 'products':
        return <ProductsView />;
      case 'trends':
        return <TrendsView />;
      case 'distribution':
        return <DistributionView />;
      case 'predictions':
        return <PredictionsView />;
      default:
        return <HomeView />;
    }
  };

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
        />

        <main className="flex-1 min-w-0">
          {activeView !== 'view-fund' && activeView !== 'fund-lab' && activeView !== 'flagship-peer' && (
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

export default Index;
