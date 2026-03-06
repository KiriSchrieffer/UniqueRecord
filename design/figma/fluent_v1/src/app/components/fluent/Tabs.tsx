import React from 'react';

interface Tab {
  id: string;
  label: string;
  icon?: React.ReactNode;
}

interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  onChange: (tabId: string) => void;
  className?: string;
}

export function Tabs({ tabs, activeTab, onChange, className = '' }: TabsProps) {
  return (
    <div className={`flex gap-1 border-b border-[var(--border)] ${className}`}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`
            px-4 py-2.5 text-[14px] font-medium
            flex items-center gap-2
            border-b-2 transition-all duration-200
            outline-none
            ${activeTab === tab.id
              ? 'border-[var(--fluent-blue)] text-[var(--fluent-blue)]'
              : 'border-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--neutral-10)]'
            }
            focus-visible:ring-2 focus-visible:ring-[var(--fluent-blue)] focus-visible:ring-offset-2
            rounded-t-[var(--radius-sm)]
          `}
        >
          {tab.icon}
          {tab.label}
        </button>
      ))}
    </div>
  );
}
