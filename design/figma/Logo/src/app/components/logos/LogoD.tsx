interface LogoProps {
  colorMode: 'color' | 'dark' | 'light';
  compact?: boolean;
}

// 方案 D：窗口捕获 - 窗口框架内嵌录制点
export function LogoD({ colorMode, compact = false }: LogoProps) {
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
          {/* 窗口外框 */}
          <rect x="15" y="15" width="90" height="90" rx="6" stroke={c.primary} strokeWidth="4" fill="none"/>
          {/* 窗口标题栏 */}
          <rect x="15" y="15" width="90" height="18" rx="6" fill={c.primary}/>
          <rect x="15" y="26" width="90" height="7" fill={c.primary}/>
          {/* 窗口控制点 */}
          <circle cx="25" cy="24" r="2.5" fill={c.accent}/>
          <circle cx="33" cy="24" r="2.5" fill="#FFB900"/>
          <circle cx="41" cy="24" r="2.5" fill="#00CC6A"/>
          {/* 中心录制点 */}
          <circle cx="60" cy="65" r="20" fill={c.accent}/>
          <circle cx="60" cy="65" r="14" fill={c.accent} opacity="0.3"/>
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
          <rect x="10" y="15" width="50" height="10" rx="4" fill={c.primary}/>
          <rect x="10" y="21" width="50" height="4" fill={c.primary}/>
          <circle cx="35" cy="45" r="10" fill={c.accent}/>
          {/* 文字 */}
          <text x="75" y="50" fontFamily="Arial, sans-serif" fontSize={compact ? "20" : "24"} fontWeight="700" fill={c.text} letterSpacing="-0.5">
            UniqueRecord
          </text>
        </svg>
      </div>
    </div>
  );
}
