import React from 'react';
import { Outlet, NavLink } from 'react-router';
import { Video, Activity, Info } from 'lucide-react';
import { Card } from '../components/fluent/Card';
import { useI18n } from '../i18n';

export default function Settings() {
  const { tr } = useI18n();

  const settingsTabs = [
    { path: '/settings', label: tr('录制设置', 'Recording Settings'), icon: Video },
    { path: '/settings/detection', label: tr('检测与引擎', 'Detection & Engine'), icon: Activity },
    { path: '/settings/about', label: tr('关于', 'About'), icon: Info },
  ];

  return (
    <div className="h-full p-6 space-y-6">
      <div>
        <h1 className="text-[var(--text-2xl)] font-semibold text-foreground mb-1">{tr('设置', 'Settings')}</h1>
        <p className="text-[var(--text-sm)] text-foreground-secondary">{tr('配置录制参数、检测规则和系统行为', 'Configure recording profile, detection rules, and app behavior')}</p>
      </div>

      <div className="flex gap-6">
        <Card className="w-56 h-fit" padding="sm">
          <nav className="space-y-1">
            {settingsTabs.map((tab) => (
              <NavLink
                key={tab.path}
                to={tab.path}
                end={tab.path === '/settings'}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 rounded-[var(--radius-md)] transition-all duration-150 ${
                    isActive
                      ? 'bg-accent-light text-accent'
                      : 'text-foreground-secondary hover:bg-hover-overlay hover:text-foreground'
                  }`
                }
              >
                <tab.icon size={18} />
                <span className="text-[var(--text-sm)] font-medium">{tab.label}</span>
              </NavLink>
            ))}
          </nav>
        </Card>

        <div className="flex-1">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
