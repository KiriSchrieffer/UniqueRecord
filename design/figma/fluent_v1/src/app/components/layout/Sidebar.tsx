import React, { useMemo } from 'react';
import { Link, useLocation } from 'react-router';
import {
  LayoutDashboard,
  History,
  Stethoscope,
  Video,
  ScanEye,
  Palette,
  Package,
  UserCircle2,
} from 'lucide-react';
import { UniqueRecordLogoSymbol } from '../branding/UniqueRecordLogo';
import { useI18n } from '../../i18n';
import { isEngineeringUiEnabled } from '../../lib/featureFlags';

interface NavItem {
  path: string;
  label: string;
  icon: React.ReactNode;
}

export function Sidebar() {
  const location = useLocation();
  const { tr } = useI18n();

  const navItems = useMemo<NavItem[]>(
    () => {
      const items: NavItem[] = [
        { path: '/dashboard', label: tr('控制台', 'Dashboard'), icon: <LayoutDashboard size={18} /> },
        { path: '/history', label: tr('视频管理', 'Video Management'), icon: <History size={18} /> },
        { path: '/settings/recording', label: tr('录制设置', 'Recording Settings'), icon: <Video size={18} /> },
        { path: '/settings/detection', label: tr('检测与引擎', 'Detection & Engine'), icon: <ScanEye size={18} /> },
        { path: '/account-update', label: tr('账号与更新', 'Account & Updates'), icon: <UserCircle2 size={18} /> },
        { path: '/diagnostics', label: tr('诊断中心', 'Diagnostics'), icon: <Stethoscope size={18} /> },
      ];
      if (isEngineeringUiEnabled) {
        items.push(
          { path: '/design-tokens', label: tr('设计令牌', 'Design Tokens'), icon: <Palette size={18} /> },
          { path: '/component-library', label: tr('组件库', 'Components'), icon: <Package size={18} /> }
        );
      }
      return items;
    },
    [tr]
  );

  return (
    <aside className="w-60 bg-[var(--sidebar)] border-r border-[var(--sidebar-border)] flex flex-col">
      <div className="px-5 py-6 border-b border-[var(--sidebar-border)]">
        <div className="flex items-center gap-3">
          <UniqueRecordLogoSymbol size={32} />
          <div>
            <h1 className="text-[16px] font-semibold text-[var(--foreground)]">UniqueRecord</h1>
            <p className="text-[11px] text-[var(--muted-foreground)]">v1.0.0</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`
                flex items-center gap-3 px-3 py-2.5
                rounded-[var(--radius-md)]
                text-[14px] font-medium
                transition-all duration-100
                outline-none
                ${
                  isActive
                    ? 'bg-[var(--fluent-blue-lighter)] text-[var(--fluent-blue)]'
                    : 'text-[var(--sidebar-foreground)] hover:bg-[var(--sidebar-accent)]'
                }
                focus-visible:ring-2 focus-visible:ring-[var(--fluent-blue)] focus-visible:ring-offset-2
              `}
            >
              {item.icon}
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="px-5 py-4 border-t border-[var(--sidebar-border)]">
        <p className="text-[11px] text-[var(--muted-foreground)]">© 2026 UniqueRecord</p>
      </div>
    </aside>
  );
}
