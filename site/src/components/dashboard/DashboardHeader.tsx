import { Activity, Bell, Search, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CacheStatusIndicator } from '@/components/cache/CacheStatusIndicator';

interface DashboardHeaderProps {
  onToggleSidebar: () => void;
  sidebarCollapsed: boolean;
}

export const DashboardHeader = ({
  onToggleSidebar,
  sidebarCollapsed,
}: DashboardHeaderProps) => {
  return (
    <header className="h-14 bg-header border-b border-header-border flex items-center justify-between px-4 sticky top-0 z-50">
      <div className="flex items-center gap-4">
        <button
          onClick={onToggleSidebar}
          className="p-2 rounded-lg hover:bg-secondary transition-colors"
          aria-label="Toggle sidebar"
        >
          <div className="w-5 h-4 flex flex-col justify-between">
            <span
              className={`block h-0.5 bg-foreground transition-all duration-300 ${sidebarCollapsed ? 'w-5' : 'w-4'
                }`}
            />
            <span className="block h-0.5 w-5 bg-foreground" />
            <span
              className={`block h-0.5 bg-foreground transition-all duration-300 ${sidebarCollapsed ? 'w-5' : 'w-3'
                }`}
            />
          </div>
        </button>

        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
            <Activity className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="font-semibold text-lg gradient-text">DataViz</span>
        </div>
      </div>

      <div className="hidden md:flex items-center gap-2 flex-1 max-w-md mx-8">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar dashboards, métricas..."
            className="pl-10 bg-secondary border-0 focus-visible:ring-1 focus-visible:ring-primary"
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Indicador de Cache */}
        <div className="hidden lg:block">
          <CacheStatusIndicator compact />
        </div>

        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-5 h-5" />
          <span className="absolute top-2 right-2 w-2 h-2 bg-accent rounded-full" />
        </Button>
        <Button variant="ghost" size="icon">
          <Settings className="w-5 h-5" />
        </Button>
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-sm font-medium">
          U
        </div>
      </div>
    </header>
  );
};
