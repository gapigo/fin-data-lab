import { cn } from '@/lib/utils';

interface Tab {
  id: string;
  label: string;
}

interface ContextTabsProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export const ContextTabs = ({
  tabs,
  activeTab,
  onTabChange,
}: ContextTabsProps) => {
  return (
    <div className="border-b border-border bg-card/50">
      <div className="flex items-center gap-1 px-4 overflow-x-auto">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                'relative px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap',
                isActive
                  ? 'text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {tab.label}
              {isActive && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-full" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
