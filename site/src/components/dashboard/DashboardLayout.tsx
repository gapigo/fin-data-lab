import { useState, ReactNode } from 'react';
import { DashboardHeader } from './DashboardHeader';
import { DashboardSidebar } from './DashboardSidebar';

interface DashboardLayoutProps {
    children: ReactNode;
    activeView?: string;
}

export const DashboardLayout = ({ children, activeView = 'home' }: DashboardLayoutProps) => {
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    // We manage activeView state primarily for the sidebar highlighting. 
    // For standard pages like FundDetails, we might just set a static activeView or 'home'.

    // If we really wanted to support view switching from the sidebar on the FundDetails page 
    // that redirects back to home, we'd need to handle onViewChange to navigation.
    // For now, simple prop passing is enough to visually integrate it.

    const handleViewChange = (view: string) => {
        // If we are on a detail page, clicking a sidebar item should usually navigate.
        // Since we are decoupling the Index logic, for now we will just allow the sidebar 
        // to visually update or maybe we should navigate?
        // Given the constraints, let's just navigate to root if it's not the current view.
        if (view !== activeView) {
            window.location.href = '/';
        }
    };

    return (
        <div className="min-h-screen bg-background">
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

                <main className="flex-1 min-w-0 bg-slate-50/50">
                    {children}
                </main>
            </div>
        </div>
    );
};
