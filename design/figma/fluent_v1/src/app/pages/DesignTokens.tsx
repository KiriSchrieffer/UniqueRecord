import React from 'react';
import { Card, CardHeader } from '../components/fluent/Card';
import { StatusBadge } from '../components/fluent/StatusBadge';
import { AppLayout } from '../components/layout/AppLayout';
import { useI18n } from '../i18n';

export default function DesignTokens() {
  const { tr } = useI18n();

  const colorTokens = [
    { name: 'Neutral 0', var: '--neutral-0', value: '#ffffff' },
    { name: 'Neutral 10', var: '--neutral-10', value: '#fafafa' },
    { name: 'Neutral 20', var: '--neutral-20', value: '#f5f5f5' },
    { name: 'Neutral 30', var: '--neutral-30', value: '#ededed' },
    { name: 'Neutral 40', var: '--neutral-40', value: '#e0e0e0' },
    { name: 'Neutral 50', var: '--neutral-50', value: '#cccccc' },
    { name: 'Neutral 60', var: '--neutral-60', value: '#999999' },
    { name: 'Neutral 70', var: '--neutral-70', value: '#707070' },
    { name: 'Neutral 80', var: '--neutral-80', value: '#484848' },
    { name: 'Neutral 90', var: '--neutral-90', value: '#2b2b2b' },
    { name: 'Neutral 100', var: '--neutral-100', value: '#1a1a1a' },
  ];

  const accentColors = [
    { name: 'Fluent Blue', var: '--fluent-blue', value: '#0078d4' },
    { name: 'Blue Hover', var: '--fluent-blue-hover', value: '#106ebe' },
    { name: 'Blue Pressed', var: '--fluent-blue-pressed', value: '#005a9e' },
    { name: 'Blue Light', var: '--fluent-blue-light', value: '#deecf9' },
    { name: 'Blue Lighter', var: '--fluent-blue-lighter', value: '#eff6fc' },
  ];

  const statusColors = [
    { name: tr('待机', 'Idle'), var: '--status-idle', value: '#8a8886', key: 'idle' as const },
    { name: tr('检测中', 'Detecting'), var: '--status-detecting', value: '#0078d4', key: 'detecting' as const },
    { name: tr('录制中', 'Recording'), var: '--status-recording', value: '#d83b01', key: 'recording' as const },
    { name: tr('错误', 'Error'), var: '--status-error', value: '#e81123', key: 'error' as const },
    { name: tr('成功', 'Success'), var: '--status-success', value: '#107c10', key: 'success' as const },
  ];

  const typographyTokens = [
    { name: tr('极小号', 'Extra Small'), var: '--text-xs', value: '11px' },
    { name: tr('小号', 'Small'), var: '--text-sm', value: '12px' },
    { name: tr('基础', 'Base'), var: '--text-base', value: '14px' },
    { name: tr('大号', 'Large'), var: '--text-lg', value: '16px' },
    { name: tr('特大号', 'Extra Large'), var: '--text-xl', value: '20px' },
    { name: tr('2XL', '2X Large'), var: '--text-2xl', value: '24px' },
    { name: tr('3XL', '3X Large'), var: '--text-3xl', value: '28px' },
  ];

  const spacingTokens = [
    { name: 'XS', var: '--spacing-xs', value: '4px' },
    { name: 'SM', var: '--spacing-sm', value: '8px' },
    { name: 'MD', var: '--spacing-md', value: '12px' },
    { name: 'LG', var: '--spacing-lg', value: '16px' },
    { name: 'XL', var: '--spacing-xl', value: '20px' },
    { name: '2XL', var: '--spacing-2xl', value: '24px' },
    { name: '3XL', var: '--spacing-3xl', value: '32px' },
  ];

  const radiusTokens = [
    { name: tr('小', 'Small'), var: '--radius-sm', value: '4px' },
    { name: tr('中', 'Medium'), var: '--radius-md', value: '6px' },
    { name: tr('大', 'Large'), var: '--radius-lg', value: '8px' },
    { name: tr('超大', 'Extra Large'), var: '--radius-xl', value: '10px' },
  ];

  return (
    <AppLayout>
      <div className="p-8 max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-[var(--text-3xl)] font-semibold mb-2">{tr('设计令牌', 'Design Tokens')}</h1>
          <p className="text-[14px] text-[var(--muted-foreground)]">{tr('UniqueRecord Fluent Design 设计令牌体系', 'UniqueRecord Fluent Design token system')}</p>
        </div>

        <Card padding="lg" className="mb-6">
          <CardHeader title={tr('中性色板', 'Neutral Palette')} subtitle={tr('Fluent 灰度色阶', 'Fluent grayscale palette')} />
          <div className="grid grid-cols-11 gap-2">
            {colorTokens.map((token) => (
              <div key={token.var}>
                <div className="w-full h-20 rounded-[var(--radius-md)] border border-[var(--border)] mb-2" style={{ backgroundColor: `var(${token.var})` }} />
                <p className="text-[10px] text-[var(--muted-foreground)] mb-0.5">{token.name}</p>
                <p className="text-[10px] font-mono text-[var(--foreground)]">{token.value}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card padding="lg" className="mb-6">
          <CardHeader title={tr('强调色', 'Accent Colors')} subtitle={tr('Windows 蓝色系', 'Windows blue palette')} />
          <div className="grid grid-cols-5 gap-4">
            {accentColors.map((token) => (
              <div key={token.var}>
                <div className="w-full h-24 rounded-[var(--radius-lg)] border border-[var(--border)] mb-2" style={{ backgroundColor: `var(${token.var})` }} />
                <p className="text-[12px] font-medium mb-0.5">{token.name}</p>
                <p className="text-[11px] font-mono text-[var(--muted-foreground)]">{token.value}</p>
                <p className="text-[10px] font-mono text-[var(--muted-foreground)]">var({token.var})</p>
              </div>
            ))}
          </div>
        </Card>

        <Card padding="lg" className="mb-6">
          <CardHeader title={tr('状态色', 'Status Colors')} subtitle={tr('应用状态视觉编码', 'Visual coding for app states')} />
          <div className="grid grid-cols-5 gap-4">
            {statusColors.map((token) => (
              <div key={token.var}>
                <div
                  className="w-full h-24 rounded-[var(--radius-lg)] border border-[var(--border)] mb-2 flex items-center justify-center"
                  style={{ backgroundColor: `var(${token.var})` }}
                >
                  <span className="text-white font-semibold text-[14px]">{token.name}</span>
                </div>
                <p className="text-[11px] font-mono text-[var(--muted-foreground)] mb-1">{token.value}</p>
                <StatusBadge status={token.key} text={token.name} size="sm" />
              </div>
            ))}
          </div>
        </Card>

        <Card padding="lg" className="mb-6">
          <CardHeader title={tr('字体层级', 'Typography')} subtitle={tr('文本排版尺寸系统', 'Type scale system')} />
          <div className="space-y-3">
            {typographyTokens.map((token) => (
              <div key={token.var} className="flex items-baseline gap-4 p-3 bg-[var(--neutral-10)] rounded-[var(--radius-md)]">
                <div className="w-32">
                  <p className="text-[12px] font-medium">{token.name}</p>
                  <p className="text-[10px] text-[var(--muted-foreground)] font-mono">var({token.var})</p>
                </div>
                <div className="w-16 text-[11px] text-[var(--muted-foreground)]">{token.value}</div>
                <div style={{ fontSize: `var(${token.var})` }} className="flex-1">
                  {tr('UniqueRecord - 英雄联盟自动录制工具', 'UniqueRecord - League of Legends Auto Recorder')}
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card padding="lg" className="mb-6">
          <CardHeader title={tr('间距系统', 'Spacing')} subtitle={tr('标准化空间尺度', 'Standard spacing scale')} />
          <div className="space-y-2">
            {spacingTokens.map((token) => (
              <div key={token.var} className="flex items-center gap-4">
                <div className="w-24">
                  <p className="text-[12px] font-medium">{token.name}</p>
                  <p className="text-[10px] text-[var(--muted-foreground)] font-mono">{token.value}</p>
                </div>
                <div className="h-8 bg-[var(--fluent-blue)] rounded-[var(--radius-sm)]" style={{ width: `var(${token.var})` }} />
              </div>
            ))}
          </div>
        </Card>

        <Card padding="lg" className="mb-6">
          <CardHeader title={tr('圆角系统', 'Corner Radius')} subtitle={tr('Fluent 圆角标准', 'Fluent corner radius scale')} />
          <div className="grid grid-cols-4 gap-4">
            {radiusTokens.map((token) => (
              <div key={token.var} className="text-center">
                <div className="w-full h-24 bg-[var(--fluent-blue-lighter)] border-2 border-[var(--fluent-blue)] mb-2" style={{ borderRadius: `var(${token.var})` }} />
                <p className="text-[12px] font-medium mb-0.5">{token.name}</p>
                <p className="text-[11px] font-mono text-[var(--muted-foreground)]">{token.value}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card padding="lg">
          <CardHeader title={tr('阴影系统', 'Shadow System')} subtitle={tr('层级阴影定义', 'Elevation shadow tokens')} />
          <div className="grid grid-cols-4 gap-4">
            {['sm', 'md', 'lg', 'xl'].map((size) => (
              <div key={size} className="text-center">
                <div className="w-full h-24 bg-[var(--card)] mb-2 flex items-center justify-center" style={{ boxShadow: `var(--shadow-${size})` }}>
                  <span className="text-[var(--muted-foreground)] font-medium">{tr('阴影', 'Shadow')}</span>
                </div>
                <p className="text-[12px] font-medium">{size.toUpperCase()}</p>
                <p className="text-[10px] font-mono text-[var(--muted-foreground)]">var(--shadow-{size})</p>
              </div>
            ))}
          </div>
        </Card>

        <Card padding="lg" className="mt-6">
          <CardHeader title={tr('组件预览', 'Component Preview')} subtitle={tr('基于 Design Tokens 的状态徽章', 'Status badges built with design tokens')} />
          <div className="space-y-4">
            <div>
              <p className="text-[12px] font-medium mb-2 text-[var(--muted-foreground)]">{tr('状态徽章', 'Status Badges')}</p>
              <div className="flex items-center gap-2">
                <StatusBadge status="idle" text={tr('待机中', 'Idle')} />
                <StatusBadge status="detecting" text={tr('检测中', 'Detecting')} />
                <StatusBadge status="recording" text={tr('录制中', 'Recording')} />
                <StatusBadge status="error" text={tr('错误', 'Error')} />
                <StatusBadge status="success" text={tr('成功', 'Success')} />
              </div>
            </div>
          </div>
        </Card>
      </div>
    </AppLayout>
  );
}
