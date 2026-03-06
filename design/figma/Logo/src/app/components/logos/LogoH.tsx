interface LogoProps {
  colorMode: 'color' | 'dark' | 'light';
  compact?: boolean;
}

// 方案 H：循环轨道 - 圆环轨道象征持续捕捉
export function LogoH({ colorMode, compact = false }: LogoProps) {
  const colors = {
    color: { primary: '#0078D4', secondary: '#50E6FF', accent: '#E74856', text: '#1F2937' },
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
          {/* 外圈轨道 */}
          <circle cx="60" cy="60" r="42" stroke={c.primary} strokeWidth="6" fill="none" opacity="0.2"/>
          {/* 中圈轨道 */}
          <circle cx="60" cy="60" r="32" stroke={c.primary} strokeWidth="5" fill="none"/>
          {/* 内圈轨道 */}
          <circle cx="60" cy="60" r="22" stroke={c.secondary} strokeWidth="4" fill="none" opacity="0.6"/>
          {/* 轨道上的录制点 */}
          <circle cx="60" cy="18" r="7" fill={c.accent}/>
          <circle cx="92" cy="60" r="6" fill={c.primary} opacity="0.5"/>
          <circle cx="60" cy="102" r="6" fill={c.primary} opacity="0.3"/>
          {/* 中心点 */}
          <circle cx="60" cy="60" r="10" fill={c.primary}/>
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
          <circle cx="35" cy="40" r="20" stroke={c.primary} strokeWidth="3" fill="none"/>
          <circle cx="35" cy="40" r="12" stroke={c.secondary} strokeWidth="2.5" fill="none" opacity="0.6"/>
          <circle cx="35" cy="20" r="4" fill={c.accent}/>
          <circle cx="35" cy="40" r="5" fill={c.primary}/>
          {/* 文字 */}
          <text x="75" y="50" fontFamily="Arial, sans-serif" fontSize={compact ? "20" : "24"} fontWeight="700" fill={c.text} letterSpacing="-0.5">
            UniqueRecord
          </text>
        </svg>
      </div>
    </div>
  );
}
