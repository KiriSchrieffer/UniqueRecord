interface LogoProps {
  colorMode: 'color' | 'dark' | 'light';
  compact?: boolean;
}

// 方案 A：录制核心 - 圆形录制按钮结合窗口框架
export function LogoA({ colorMode, compact = false }: LogoProps) {
  const colors = {
    color: { primary: '#0078D4', secondary: '#0F6CBD', accent: '#E74856', text: '#1F2937' },
    dark: { primary: '#1F2937', secondary: '#374151', accent: '#1F2937', text: '#1F2937' },
    light: { primary: '#FFFFFF', secondary: '#F3F4F6', accent: '#FFFFFF', text: '#FFFFFF' }
  };
  const c = colors[colorMode];

  return (
    <div className="space-y-8">
      {/* 图形标 Symbol */}
      <div className="flex flex-col items-center gap-3">
        <span className={`text-xs font-bold ${colorMode === 'light' ? 'text-gray-400' : 'text-gray-500'}`}>图形标</span>
        <svg width={compact ? "80" : "120"} height={compact ? "80" : "120"} viewBox="0 0 120 120" fill="none">
          {/* 外框窗口 */}
          <rect x="15" y="15" width="90" height="90" rx="8" stroke={c.primary} strokeWidth="4" fill="none"/>
          {/* 内圈 */}
          <circle cx="60" cy="60" r="28" fill={c.primary} opacity="0.1"/>
          {/* 录制按钮 */}
          <circle cx="60" cy="60" r="18" fill={c.accent}/>
          {/* 装饰圆环 */}
          <circle cx="60" cy="60" r="24" stroke={c.primary} strokeWidth="2.5" fill="none"/>
        </svg>
      </div>

      {/* 字标 Logotype */}
      {!compact && (
        <div className="flex flex-col items-center gap-3">
          <span className={`text-xs font-bold ${colorMode === 'light' ? 'text-gray-400' : 'text-gray-500'}`}>字标</span>
          <svg width="280" height="40" viewBox="0 0 280 40" fill="none">
            <text x="0" y="30" fontFamily="Arial, sans-serif" fontSize="28" fontWeight="700" fill={c.text} letterSpacing="-0.5">
              UniqueRecord
            </text>
          </svg>
        </div>
      )}

      {/* 组合版 Combination */}
      <div className="flex flex-col items-center gap-3">
        <span className={`text-xs font-bold ${colorMode === 'light' ? 'text-gray-400' : 'text-gray-500'}`}>组合版</span>
        <svg width={compact ? "200" : "320"} height={compact ? "60" : "80"} viewBox="0 0 320 80" fill="none">
          {/* 图形 */}
          <rect x="10" y="15" width="50" height="50" rx="4" stroke={c.primary} strokeWidth="2.5" fill="none"/>
          <circle cx="35" cy="40" r="8" fill={c.accent}/>
          <circle cx="35" cy="40" r="12" stroke={c.primary} strokeWidth="1.5" fill="none"/>
          {/* 文字 */}
          <text x="75" y="50" fontFamily="Arial, sans-serif" fontSize={compact ? "20" : "24"} fontWeight="700" fill={c.text} letterSpacing="-0.5">
            UniqueRecord
          </text>
        </svg>
      </div>
    </div>
  );
}
