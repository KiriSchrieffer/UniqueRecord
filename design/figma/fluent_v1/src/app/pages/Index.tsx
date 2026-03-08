import React from 'react';
import { Link } from 'react-router';
import { Card } from '../components/fluent/Card';
import {
  LayoutDashboard,
  History,
  Video,
  ScanEye,
  Stethoscope,
  Palette,
  Package,
  Home,
  Maximize2,
} from 'lucide-react';
import { UniqueRecordLogoSymbol } from '../components/branding/UniqueRecordLogo';
import { useI18n } from '../i18n';
import { isEngineeringUiEnabled } from '../lib/featureFlags';

export default function Index() {
  const { tr } = useI18n();

  const pages = [
    {
      category: tr('核心页面', 'Core pages'),
      items: [
        {
          path: '/welcome',
          title: tr('欢迎向导', 'Welcome wizard'),
          icon: <Home size={24} />,
          desc: tr('4 步完成初始化配置。', 'Complete initial setup in 4 steps.'),
        },
        {
          path: '/dashboard',
          title: tr('控制台', 'Dashboard'),
          icon: <LayoutDashboard size={24} />,
          desc: tr('实时状态监控与录制控制。', 'Realtime status and recording controls.'),
        },
        {
          path: '/history',
          title: tr('视频管理', 'Video Management'),
          icon: <History size={24} />,
          desc: tr('视频列表、对局详情、导出与删除。', 'Video list, match details, export, and delete.'),
        },
        {
          path: '/settings/recording',
          title: tr('录制设置', 'Recording settings'),
          icon: <Video size={24} />,
          desc: tr('分辨率、FPS、编码器、音频配置。', 'Resolution, FPS, encoder, and audio setup.'),
        },
        {
          path: '/settings/detection',
          title: tr('检测与引擎', 'Detection & engine'),
          icon: <ScanEye size={24} />,
          desc: tr('LoL 检测与原生录制引擎参数。', 'LoL detection and native recorder settings.'),
        },
        {
          path: '/diagnostics',
          title: tr('诊断中心', 'Diagnostics'),
          icon: <Stethoscope size={24} />,
          desc: tr('运行检查、日志与错误分析。', 'Checks, logs, and error analysis.'),
        },
        {
          path: '/mini-panel',
          title: tr('迷你面板', 'Mini panel'),
          icon: <Maximize2 size={24} />,
          desc: tr('悬浮录制状态与快捷操作。', 'Floating status and quick actions.'),
        },
      ],
    },
    ...(isEngineeringUiEnabled
      ? [
          {
            category: tr('设计系统', 'Design system'),
            items: [
              {
                path: '/design-tokens',
                title: tr('设计令牌', 'Design Tokens'),
                icon: <Palette size={24} />,
                desc: tr('颜色、字号、间距与阴影定义。', 'Color, typography, spacing, and shadow tokens.'),
              },
              {
                path: '/component-library',
                title: tr('组件库', 'Component Library'),
                icon: <Package size={24} />,
                desc: tr('Fluent 组件样例与交互态展示。', 'Fluent component examples and interaction states.'),
              },
            ],
          },
        ]
      : []),
  ];

  return (
    <div className="min-h-screen bg-[var(--background)] p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-12 text-center">
          <div className="w-20 h-20 bg-[var(--neutral-10)] rounded-[var(--radius-xl)] flex items-center justify-center mx-auto mb-6 border border-[var(--border)]">
            <UniqueRecordLogoSymbol size={56} />
          </div>
          <h1 className="text-[var(--text-3xl)] font-semibold mb-3">UniqueRecord</h1>
          <p className="text-[var(--text-lg)] text-[var(--muted-foreground)] mb-2">
            {tr('英雄联盟自动录制工具 - Fluent UI', 'League of Legends Auto Recorder - Fluent UI')}
          </p>
          <p className="text-[14px] text-[var(--muted-foreground)]">
            {tr('完整用户流程 · 多页面覆盖 · 原生录制引擎', 'End-to-end workflow · multi-page coverage · native recorder backend')}
          </p>
        </div>

        {pages.map((category, idx) => (
          <div key={idx} className="mb-8">
            <h2 className="text-[var(--text-xl)] font-semibold mb-4 text-[var(--foreground)]">{category.category}</h2>

            <div className="grid grid-cols-3 gap-4">
              {category.items.map((page) => (
                <Link key={page.path} to={page.path}>
                  <Card padding="lg" hover className="h-full transition-all duration-200 hover:border-[var(--fluent-blue)]">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-[var(--fluent-blue-lighter)] rounded-[var(--radius-md)] flex items-center justify-center flex-shrink-0">
                        <div className="text-[var(--fluent-blue)]">{page.icon}</div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-[14px] font-semibold mb-1 text-[var(--foreground)]">{page.title}</h3>
                        <p className="text-[12px] text-[var(--muted-foreground)] line-clamp-2">{page.desc}</p>
                      </div>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        ))}

        <Card padding="lg" className="mt-12 bg-[var(--fluent-blue-lighter)] border-[var(--fluent-blue-light)]">
          <h3 className="text-[var(--text-lg)] font-semibold mb-4 text-[var(--fluent-blue)]">{tr('设计亮点', 'Highlights')}</h3>
          <div className="grid grid-cols-3 gap-6">
            <div>
              <h4 className="text-[14px] font-semibold mb-2">Fluent Design</h4>
              <ul className="text-[13px] text-[var(--foreground)] space-y-1">
                <li>{tr('中性灰阶 + Windows 蓝', 'Neutral grays + Windows blue')}</li>
                <li>{tr('中等圆角 (8-10px)', 'Moderate corner radius (8-10px)')}</li>
                <li>{tr('柔和阴影系统', 'Soft shadow system')}</li>
                <li>{tr('清晰视觉层级', 'Clear visual hierarchy')}</li>
              </ul>
            </div>
            <div>
              <h4 className="text-[14px] font-semibold mb-2">{tr('状态系统', 'State system')}</h4>
              <ul className="text-[13px] text-[var(--foreground)] space-y-1">
                <li>{tr('Idle - 灰色', 'Idle - gray')}</li>
                <li>{tr('Detecting - 蓝色', 'Detecting - blue')}</li>
                <li>{tr('Recording - 橙红', 'Recording - orange-red')}</li>
                <li>{tr('Error - 红色', 'Error - red')}</li>
              </ul>
            </div>
            <div>
              <h4 className="text-[14px] font-semibold mb-2">{tr('组件能力', 'Component scope')}</h4>
              <ul className="text-[13px] text-[var(--foreground)] space-y-1">
                <li>{tr('Fluent 核心组件', 'Core Fluent components')}</li>
                <li>{tr('完整交互状态', 'Complete interaction states')}</li>
                {isEngineeringUiEnabled && <li>{tr('设计令牌体系', 'Design token system')}</li>}
                <li>{tr('统一视觉语言', 'Unified visual language')}</li>
              </ul>
            </div>
          </div>
        </Card>

        <Card padding="md" className="mt-6 bg-[var(--neutral-10)]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[13px] text-[var(--muted-foreground)]">
                {tr('文档：DESIGN_SYSTEM / PAGES_SPECIFICATION / PROJECT_README / QUICK_START', 'Docs: DESIGN_SYSTEM / PAGES_SPECIFICATION / PROJECT_README / QUICK_START')}
              </p>
            </div>
            <div className="text-[12px] text-[var(--muted-foreground)]">v1.0.1 · © 2026 UniqueRecord</div>
          </div>
        </Card>
      </div>
    </div>
  );
}
