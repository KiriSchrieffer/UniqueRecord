interface LogoProps {
  colorMode: 'color' | 'dark' | 'light';
  compact?: boolean;
}

// 方案 E：时间轴 - 时间轴上的关键帧
export function LogoE({ colorMode, compact = false }: LogoProps) {
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
          {/* 圆形背景 */}
          <circle cx="60" cy="60" r="45" fill={c.primary} opacity="0.08"/>
          {/* 主时间轴 */}
          <line x1="25" y1="60" x2="95" y2="60" stroke={c.primary} strokeWidth="4" strokeLinecap="round"/>
          {/* 关键帧点 */}
          <circle cx="35" cy="60" r="5" fill={c.secondary} opacity="0.5"/>
          <circle cx="50" cy="60" r="5" fill={c.secondary} opacity="0.5"/>
          <circle cx="70" cy="60" r="5" fill={c.secondary} opacity="0.5"/>
          <circle cx="85" cy="60" r="5" fill={c.secondary} opacity="0.5"/>
          {/* 中心录制关键帧 */}
          <circle cx="60" cy="60" r="16" fill={c.accent}/>
          <circle cx="60" cy="60" r="10" fill={c.accent} stroke="#FFFFFF" strokeWidth="2"/>
          {/* 装饰刻度线 */}
          <line x1="35" y1="52" x2="35" y2="55" stroke={c.primary} strokeWidth="2"/>
          <line x1="50" y1="52" x2="50" y2="55" stroke={c.primary} strokeWidth="2"/>
          <line x1="70" y1="52" x2="70" y2="55" stroke={c.primary} strokeWidth="2"/>
          <line x1="85" y1="52" x2="85" y2="55" stroke={c.primary} strokeWidth="2"/>
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
          <line x1="15" y1="40" x2="55" y2="40" stroke={c.primary} strokeWidth="3" strokeLinecap="round"/>
          <circle cx="22" cy="40" r="3" fill={c.secondary} opacity="0.5"/>
          <circle cx="35" cy="40" r="8" fill={c.accent}/>
          <circle cx="48" cy="40" r="3" fill={c.secondary} opacity="0.5"/>
          {/* 文字 */}
          <text x="75" y="50" fontFamily="Arial, sans-serif" fontSize={compact ? "20" : "24"} fontWeight="700" fill={c.text} letterSpacing="-0.5">
            UniqueRecord
          </text>
        </svg>
      </div>
    </div>
  );
}
