interface LogoProps {
  colorMode: 'color' | 'dark' | 'light';
  compact?: boolean;
}

// 方案 L：双环交织 - 双环交织代表游戏与录制的无缝连接
export function LogoL({ colorMode, compact = false }: LogoProps) {
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
          {/* 左环 */}
          <circle cx="45" cy="60" r="28" stroke={c.primary} strokeWidth="6" fill="none"/>
          <circle cx="45" cy="60" r="22" stroke={c.primary} strokeWidth="3" fill="none" opacity="0.3"/>
          {/* 右环 */}
          <circle cx="75" cy="60" r="28" stroke={c.secondary} strokeWidth="6" fill="none"/>
          <circle cx="75" cy="60" r="22" stroke={c.secondary} strokeWidth="3" fill="none" opacity="0.3"/>
          {/* 交织区域装饰 */}
          <circle cx="60" cy="60" r="10" fill={c.accent}/>
          <circle cx="60" cy="60" r="6" fill={c.accent} opacity="0.5"/>
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
          <circle cx="25" cy="40" r="14" stroke={c.primary} strokeWidth="3.5" fill="none"/>
          <circle cx="45" cy="40" r="14" stroke={c.secondary} strokeWidth="3.5" fill="none"/>
          <circle cx="35" cy="40" r="5" fill={c.accent}/>
          {/* 文字 */}
          <text x="75" y="50" fontFamily="Arial, sans-serif" fontSize={compact ? "20" : "24"} fontWeight="700" fill={c.text} letterSpacing="-0.5">
            UniqueRecord
          </text>
        </svg>
      </div>
    </div>
  );
}
