interface LogoProps {
  colorMode: 'color' | 'dark' | 'light';
  compact?: boolean;
}

// 方案 G：立方视角 - 立方体代表独特性与多维度
export function LogoG({ colorMode, compact = false }: LogoProps) {
  const colors = {
    color: { primary: '#0078D4', secondary: '#0F6CBD', accent: '#50E6FF', text: '#1F2937' },
    dark: { primary: '#1F2937', secondary: '#374151', accent: '#6B7280', text: '#1F2937' },
    light: { primary: '#FFFFFF', secondary: '#F3F4F6', accent: '#E5E7EB', text: '#FFFFFF' }
  };
  const c = colors[colorMode];

  return (
    <div className="space-y-8">
      {/* 图形标 Symbol */}
      <div className="flex flex-col items-center gap-3">
        <span className={`text-xs font-bold ${colorMode === 'light' ? 'text-gray-400' : 'text-gray-500'}`}>图形标</span>
        <svg width={compact ? "80" : "120"} height={compact ? "80" : "120"} viewBox="0 0 120 120" fill="none">
          {/* 立方体 - 等距视角 */}
          {/* 顶面 */}
          <path d="M 60 30 L 85 45 L 60 60 L 35 45 Z" fill={c.accent} opacity="0.8"/>
          <path d="M 60 30 L 85 45 L 60 60 L 35 45 Z" stroke={c.primary} strokeWidth="2.5" fill="none"/>
          {/* 左面 */}
          <path d="M 35 45 L 35 75 L 60 90 L 60 60 Z" fill={c.primary} opacity="0.6"/>
          <path d="M 35 45 L 35 75 L 60 90 L 60 60 Z" stroke={c.primary} strokeWidth="2.5" fill="none"/>
          {/* 右面 */}
          <path d="M 60 60 L 60 90 L 85 75 L 85 45 Z" fill={c.secondary}/>
          <path d="M 60 60 L 60 90 L 85 75 L 85 45 Z" stroke={c.primary} strokeWidth="2.5" fill="none"/>
          {/* 中心录制点 */}
          <circle cx="60" cy="60" r="8" fill="#E74856"/>
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
          <path d="M 35 22 L 48 30 L 35 38 L 22 30 Z" fill={c.accent} opacity="0.8"/>
          <path d="M 35 22 L 48 30 L 35 38 L 22 30 Z" stroke={c.primary} strokeWidth="1.8" fill="none"/>
          <path d="M 22 30 L 22 48 L 35 56 L 35 38 Z" fill={c.primary} opacity="0.6"/>
          <path d="M 22 30 L 22 48 L 35 56 L 35 38 Z" stroke={c.primary} strokeWidth="1.8" fill="none"/>
          <path d="M 35 38 L 35 56 L 48 48 L 48 30 Z" fill={c.secondary}/>
          <path d="M 35 38 L 35 56 L 48 48 L 48 30 Z" stroke={c.primary} strokeWidth="1.8" fill="none"/>
          {/* 文字 */}
          <text x="75" y="50" fontFamily="Arial, sans-serif" fontSize={compact ? "20" : "24"} fontWeight="700" fill={c.text} letterSpacing="-0.5">
            UniqueRecord
          </text>
        </svg>
      </div>
    </div>
  );
}
