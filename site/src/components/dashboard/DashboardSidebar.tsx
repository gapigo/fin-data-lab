import { useState } from 'react';
import { cn } from '@/lib/utils';
import {
  BarChart3,
  TrendingUp,
  Bitcoin,
  Database,
  Terminal,
  BookOpen,
  Bot,
  Download,
  Settings,
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
} from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';
import { StatusIndicator } from '@/components/ui/StatusIndicator';

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  pillar?: 'cvm' | 'acoes' | 'crypto';
}

interface NavSection {
  title: string;
  items: NavItem[];
}

interface DashboardSidebarProps {
  collapsed: boolean;
  activeView: string;
  onViewChange: (view: string) => void;
  showAnalytics?: boolean;
  viewMode?: string;
  onViewModeChange?: (mode: string) => void;
}

const SECTIONS: NavSection[] = [
  {
    title: 'DADOS',
    items: [
      { id: 'fund-lab', label: 'CVM / Fundos', icon: <BarChart3 size={18} />, pillar: 'cvm' },
      { id: 'acoes', label: 'Ações B3', icon: <TrendingUp size={18} />, pillar: 'acoes' },
      { id: 'crypto', label: 'Crypto', icon: <Bitcoin size={18} />, pillar: 'crypto' },
    ],
  },
  {
    title: 'WORKSPACE',
    items: [
      { id: 'sql-console', label: 'SQL Console', icon: <Terminal size={18} /> },
      { id: 'notebooks', label: 'Notebooks', icon: <BookOpen size={18} /> },
      { id: 'ai-research', label: 'AI Research', icon: <Bot size={18} /> },
    ],
  },
  {
    title: 'SISTEMA',
    items: [
      { id: 'ingestion', label: 'Ingestão', icon: <Download size={18} /> },
      { id: 'banco', label: 'Banco', icon: <Database size={18} /> },
      { id: 'config', label: 'Config', icon: <Settings size={18} /> },
    ],
  },
];

const PILLAR_COLORS: Record<string, string> = {
  cvm: 'var(--cvm-color)',
  acoes: 'var(--acoes-color)',
  crypto: 'var(--crypto-color)',
};

export const DashboardSidebar = ({
  collapsed,
  activeView,
  onViewChange,
}: DashboardSidebarProps) => {
  const { theme, toggleTheme } = useTheme();

  // Mock status data — will be replaced with real API data
  const now = new Date();
  const yesterday = new Date(now.getTime() - 20 * 60 * 60 * 1000);
  const twoDaysAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);

  return (
    <aside
      className={cn(
        'flex flex-col h-[calc(100vh-var(--header-height))] bg-[var(--bg-secondary)] border-r border-[var(--border-subtle)] transition-all duration-300 fixed top-[var(--header-height)] left-0 z-40',
        collapsed ? 'w-[var(--sidebar-collapsed)]' : 'w-[var(--sidebar-width)]'
      )}
    >
      {/* Logo area */}
      <div className="flex items-center gap-3 px-4 h-14 border-b border-[var(--border-subtle)]">
        {!collapsed && (
          <>
            <img src="/src/assets/logo.svg" alt="FDL" className="w-7 h-7" />
            <span className="font-semibold text-[var(--text-primary)] text-sm tracking-tight">
              Fin·Data·Lab
            </span>
          </>
        )}
        {collapsed && (
          <img src="/src/assets/logo.svg" alt="FDL" className="w-7 h-7 mx-auto" />
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3">
        {SECTIONS.map((section) => (
          <div key={section.title} className="mb-4">
            {!collapsed && (
              <div className="px-4 py-2">
                <span className="text-[var(--text-muted)] text-xs uppercase tracking-wider font-medium">
                  {section.title}
                </span>
              </div>
            )}
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const isActive = activeView === item.id;
                const pillarColor = item.pillar ? PILLAR_COLORS[item.pillar] : undefined;

                return (
                  <li key={item.id}>
                    <button
                      onClick={() => onViewChange(item.id)}
                      className={cn(
                        'w-full flex items-center gap-3 px-4 py-2 text-sm transition-all duration-150 relative',
                        isActive
                          ? 'text-[var(--text-primary)]'
                          : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-primary)]'
                      )}
                      style={
                        isActive
                          ? {
                              backgroundColor: 'var(--accent-light)',
                              borderLeft: `3px solid var(--accent-primary)`,
                            }
                          : { borderLeft: '3px solid transparent' }
                      }
                      title={collapsed ? item.label : undefined}
                    >
                      <span
                        style={{
                          color: pillarColor || 'var(--text-muted)',
                        }}
                      >
                        {item.icon}
                      </span>
                      {!collapsed && (
                        <span className="truncate">{item.label}</span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Bottom status area */}
      <div className="border-t border-[var(--border-subtle)] p-3 space-y-2">
        {!collapsed && (
          <>
            <div className="space-y-1.5">
              <StatusIndicator lastUpdate={yesterday} thresholds={{ green: 24, yellow: 48 }} />
              <StatusIndicator lastUpdate={twoDaysAgo} thresholds={{ green: 24, yellow: 48 }} />
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                onClick={toggleTheme}
                className="flex items-center gap-2 px-2 py-1.5 rounded text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-primary)] transition-colors"
                title={theme === 'light' ? 'Modo escuro' : 'Modo claro'}
              >
                {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
                <span className="text-xs">
                  {theme === 'light' ? 'Escuro' : 'Claro'}
                </span>
              </button>
              <span className="text-[var(--text-muted)] text-xs">FDL v1.0</span>
            </div>
          </>
        )}
        {collapsed && (
          <button
            onClick={toggleTheme}
            className="w-full flex justify-center py-1.5 text-[var(--text-secondary)] hover:bg-[var(--bg-primary)] rounded transition-colors"
            title={theme === 'light' ? 'Modo escuro' : 'Modo claro'}
          >
            {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
          </button>
        )}
      </div>
    </aside>
  );
};

export { getMenuGroupsByViewMode } from '@/config/menuConfig';
