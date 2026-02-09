import { cn } from '@/lib/utils';
import { ViewModeSelector } from './ViewModeSelector';
import {
  getMenuGroupsByViewMode,
  getDefaultViewMode,
  saveViewMode,
  ViewMode,
  NavGroup,
} from '@/config/menuConfig';
import { useState, useEffect } from 'react';

// ============================================================================
// INTERFACES (mantidas para compatibilidade)
// ============================================================================

interface DashboardSidebarProps {
  collapsed: boolean;
  activeView: string;
  onViewChange: (view: string) => void;
  showAnalytics?: boolean;
  viewMode?: ViewMode;
  onViewModeChange?: (viewMode: ViewMode) => void;
}

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export const DashboardSidebar = ({
  collapsed,
  activeView,
  onViewChange,
  showAnalytics = false,
  viewMode: externalViewMode,
  onViewModeChange,
}: DashboardSidebarProps) => {
  // Estado interno para o modo de visualização (se não for controlado externamente)
  const [internalViewMode, setInternalViewMode] = useState<ViewMode>(getDefaultViewMode);

  // Usar modo externo se fornecido, caso contrário usar interno
  const viewMode = externalViewMode ?? internalViewMode;

  // Handler para mudança de modo
  const handleViewModeChange = (newMode: ViewMode) => {
    saveViewMode(newMode);
    if (onViewModeChange) {
      onViewModeChange(newMode);
    } else {
      setInternalViewMode(newMode);
    }
  };

  // Obter grupos de navegação baseado no modo atual
  const navGroups = getMenuGroupsByViewMode(viewMode, showAnalytics);

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
              {group.items.filter(item => !item.hidden).map((item) => {
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

      {/* SELETOR DE MODO DE VISUALIZAÇÃO */}
      <div className={cn(
        "border-t border-sidebar-border",
        collapsed ? "p-2" : "p-4"
      )}>
        <ViewModeSelector
          currentViewMode={viewMode}
          onViewModeChange={handleViewModeChange}
          collapsed={collapsed}
        />
      </div>

      {/* VERSÃO */}
      {!collapsed && (
        <div className="px-4 pb-4">
          <div className="glass-effect rounded-lg p-3">
            <p className="text-xs text-muted-foreground">Fin Data Lab</p>
            <p className="text-sm font-medium">v1.0.0</p>
          </div>
        </div>
      )}
    </aside>
  );
};

// Exportação para compatibilidade com código existente
export { getMenuGroupsByViewMode };
