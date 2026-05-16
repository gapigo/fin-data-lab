import { useState } from 'react';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar';

export default function NotebooksPlaceholder() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <DashboardHeader
        onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
        sidebarCollapsed={sidebarCollapsed}
      />

      <div className="flex w-full">
        <DashboardSidebar
          collapsed={sidebarCollapsed}
          activeView="notebooks"
          onViewChange={(view) => {
            if (view !== 'notebooks') {
              window.location.href = `/?view=${view}`;
            }
          }}
        />

        <main
          className="flex-1 min-w-0 transition-all duration-300"
          style={{
            marginLeft: sidebarCollapsed ? 'var(--sidebar-collapsed)' : 'var(--sidebar-width)',
          }}
        >
          <div className="flex items-center justify-center h-[calc(100vh-var(--header-height))] text-[var(--text-muted)]">
            <div className="text-center space-y-2">
              <h2 className="text-xl font-semibold text-[var(--text-primary)]">Notebooks</h2>
              <p className="text-sm">Em breve: Jupyter notebooks integrados.</p>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
