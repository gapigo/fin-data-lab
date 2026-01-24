import {
  BarChart3,
  LineChart,
  PieChart,
  TrendingUp,
  Users,
  DollarSign,
  ShoppingCart,
  Target,
  Activity,
  Globe,
  LucideProps,
  Layers,
  Zap,
  FlaskConical,
  Users2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<LucideProps>;
}

interface NavGroup {
  id: string;
  label: string;
  color: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    id: 'funds',
    label: 'Fundos',
    color: 'nav-group-1',
    items: [
      { id: 'view-fund', label: 'Visualizar fundo', icon: Target },
      { id: 'fund-lab', label: 'Lab', icon: FlaskConical },
      { id: 'flagship-peer', label: 'Flagship Peer', icon: Users2 },
    ]
  },
  {
    id: 'overview',
    label: 'Visão Geral',
    color: 'nav-group-1',
    items: [
      { id: 'home', label: 'Dashboard', icon: BarChart3 },
      { id: 'performance', label: 'Performance', icon: TrendingUp },
      { id: 'realtime', label: 'Tempo Real', icon: Activity },
    ],
  },
  {
    id: 'analytics',
    label: 'Analytics',
    color: 'nav-group-2',
    items: [
      { id: 'users', label: 'Usuários', icon: Users },
      { id: 'traffic', label: 'Tráfego', icon: Globe },
      { id: 'engagement', label: 'Engajamento', icon: Target },
    ],
  },
  {
    id: 'business',
    label: 'Negócios',
    color: 'nav-group-3',
    items: [
      { id: 'revenue', label: 'Receita', icon: DollarSign },
      { id: 'sales', label: 'Vendas', icon: ShoppingCart },
      { id: 'products', label: 'Produtos', icon: Layers },
    ],
  },
  {
    id: 'insights',
    label: 'Insights',
    color: 'nav-group-4',
    items: [
      { id: 'trends', label: 'Tendências', icon: LineChart },
      { id: 'distribution', label: 'Distribuição', icon: PieChart },
      { id: 'predictions', label: 'Previsões', icon: Zap },
    ],
  },
];

interface DashboardSidebarProps {
  collapsed: boolean;
  activeView: string;
  onViewChange: (view: string) => void;
}

export const DashboardSidebar = ({
  collapsed,
  activeView,
  onViewChange,
}: DashboardSidebarProps) => {
  return (
    <aside
      className={cn(
        'bg-sidebar border-r border-sidebar-border flex flex-col transition-all duration-300 ease-in-out h-[calc(100vh-56px)] sticky top-14',
        collapsed ? 'w-16' : 'w-60'
      )}
    >
      <nav className="flex-1 overflow-y-auto py-4 px-2">
        {navGroups.map((group, groupIndex) => (
          <div key={group.id} className={cn('mb-6', groupIndex > 0 && 'mt-2')}>
            {!collapsed && (
              <h3 className="px-3 mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground sidebar-group-label">
                {group.label}
              </h3>
            )}

            <div className="space-y-1">
              {group.items.map((item) => {
                const isActive = activeView === item.id;
                const Icon = item.icon;

                return (
                  <button
                    key={item.id}
                    onClick={() => onViewChange(item.id)}
                    className={cn(
                      'w-full relative flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group',
                      isActive
                        ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                        : 'text-sidebar-foreground hover:bg-sidebar-accent/50'
                    )}
                  >
                    {isActive && (
                      <span
                        className="nav-indicator"
                        style={{
                          backgroundColor: `hsl(var(--${group.color}))`,
                        }}
                      />
                    )}

                    <div
                      className={cn(
                        'flex items-center justify-center w-8 h-8 rounded-lg transition-all',
                        isActive
                          ? `bg-${group.color}/20`
                          : 'bg-transparent group-hover:bg-secondary'
                      )}
                      style={
                        isActive
                          ? {
                            backgroundColor: `hsl(var(--${group.color}) / 0.15)`,
                          }
                          : {}
                      }
                    >
                      <Icon
                        className={cn(
                          'w-5 h-5 transition-colors',
                          isActive
                            ? ''
                            : 'text-muted-foreground group-hover:text-foreground'
                        )}
                        style={
                          isActive
                            ? { color: `hsl(var(--${group.color}))` }
                            : {}
                        }
                      />
                    </div>

                    {!collapsed && (
                      <span
                        className={cn(
                          'text-sm font-medium transition-opacity sidebar-text',
                          isActive ? 'text-foreground' : ''
                        )}
                      >
                        {item.label}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {!collapsed && (
        <div className="p-4 border-t border-sidebar-border">
          <div className="glass-effect rounded-lg p-3">
            <p className="text-xs text-muted-foreground">Última atualização</p>
            <p className="text-sm font-medium">Há 2 minutos</p>
          </div>
        </div>
      )}
    </aside>
  );
};

export { navGroups };
