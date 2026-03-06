import React from 'react';
import { Sidebar } from './Sidebar';

interface AppLayoutProps {
  children: React.ReactNode;
  showSidebar?: boolean;
}

export function AppLayout({ children, showSidebar = true }: AppLayoutProps) {
  return (
    <div className="flex h-screen bg-[var(--background)] overflow-hidden">
      {showSidebar && <Sidebar />}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
