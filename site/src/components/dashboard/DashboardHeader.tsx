import { useState } from 'react';
import { Menu, Bell, Settings, Sun, Moon, Search, Command } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';
import { cn } from '@/lib/utils';

interface DashboardHeaderProps {
  onToggleSidebar: () => void;
  sidebarCollapsed: boolean;
}

export const DashboardHeader = ({
  onToggleSidebar,
  sidebarCollapsed,
}: DashboardHeaderProps) => {
  const { theme, toggleTheme } = useTheme();
  const [searchFocused, setSearchFocused] = useState(false);

  return (
    <>
      <header
        className="fixed top-0 left-0 right-0 z-50 flex items-center px-4 border-b border-[var(--border-subtle)] bg-[var(--bg-elevated)]"
        style={{ height: 'var(--header-height)' }}
      >
        <button
          onClick={onToggleSidebar}
          className="flex items-center justify-center w-9 h-9 rounded-md text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] transition-colors mr-3"
          title={sidebarCollapsed ? 'Expandir sidebar' : 'Colapsar sidebar'}
        >
          <Menu size={20} />
        </button>

        {/* Wordmark */}
        <div className="flex items-center gap-2 mr-6 shrink-0">
          <img src="/src/assets/logo.svg" alt="FDL" className="w-6 h-6" />
          <span
            className="hidden md:inline text-lg font-medium text-[var(--text-primary)]"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Fin·Data·Lab
          </span>
        </div>

        {/* Search bar */}
        <div className="flex-1 max-w-xl mx-auto relative">
          <div
            className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-lg border transition-all duration-150',
              searchFocused
                ? 'border-[var(--accent-primary)] bg-[var(--bg-primary)] shadow-sm ring-1 ring-[var(--accent-border)]'
                : 'border-[var(--border-subtle)] bg-[var(--bg-sunken)] hover:border-[var(--border-default)]'
            )}
          >
            <Search size={16} className="text-[var(--text-muted)] shrink-0" />
            <input
              type="text"
              placeholder="Buscar fundos, ações, crypto..."
              className="flex-1 bg-transparent text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none"
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
            />
            <span className="hidden sm:flex items-center gap-0.5 text-[var(--text-muted)] text-xs shrink-0">
              <Command size={12} />
              <span>K</span>
            </span>
          </div>

          {/* Command palette overlay placeholder */}
          {searchFocused && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-lg shadow-lg p-4 z-50">
              <p className="text-xs text-[var(--text-muted)] mb-2">Busque por nome, CNPJ ou ticker</p>
              <div className="space-y-1">
                <div className="px-3 py-2 rounded text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] cursor-pointer">
                  Kinea Atlas II
                </div>
                <div className="px-3 py-2 rounded text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] cursor-pointer">
                  PETR4
                </div>
                <div className="px-3 py-2 rounded text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] cursor-pointer">
                  BTC-USD
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-1 ml-4 shrink-0">
          <button
            className="relative flex items-center justify-center w-9 h-9 rounded-md text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] transition-colors"
            title="Notificações"
          >
            <Bell size={18} />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[var(--negative)]" />
          </button>

          <button
            className="flex items-center justify-center w-9 h-9 rounded-md text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] transition-colors"
            title="Configurações"
          >
            <Settings size={18} />
          </button>

          <button
            onClick={toggleTheme}
            className="flex items-center justify-center w-9 h-9 rounded-md text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] transition-colors"
            title={theme === 'light' ? 'Modo escuro' : 'Modo claro'}
          >
            {theme === 'light' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      </header>

      {/* Spacer for fixed header */}
      <div style={{ height: 'var(--header-height)' }} />
    </>
  );
};
