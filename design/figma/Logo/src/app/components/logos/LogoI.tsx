interface LogoProps {
  colorMode: 'color' | 'dark' | 'light';
  compact?: boolean;
}

// 方案 I：字母融合 - U+R 首字母创意组合
export function LogoI({ colorMode, compact = false }: LogoProps) {
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
          {/* 外框 */}
          <rect x="20" y="20" width="80" height="80" rx="12" fill={c.primary} opacity="0.08"/>
          {/* U 字母 */}
          <path
            d="M 35 35 L 35 58 C 35 66 40 72 48 72 L 52 72 C 60 72 65 66 65 58"
            stroke={c.primary}
            strokeWidth="8"
            strokeLinecap="round"
            fill="none"
          />
          {/* R 字母融合 */}
          <path
            d="M 70 45 L 70 85"
            stroke={c.secondary}
            strokeWidth="8"
            strokeLinecap="round"
          />
          <path
            d="M 70 45 C 70 45 82 45 82 55 C 82 65 70 65 70 65"
            stroke={c.secondary}
            strokeWidth="8"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M 70 65 L 82 85"
            stroke={c.secondary}
            strokeWidth="8"
            strokeLinecap="round"
          />
          {/* 录制点装饰 */}
          <circle cx="50" cy="60" r="6" fill={c.accent}/>
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
          <path
            d="M 18 25 L 18 38 C 18 44 21 48 26 48 L 28 48 C 33 48 36 44 36 38"
            stroke={c.primary}
            strokeWidth="4.5"
            strokeLinecap="round"
            fill="none"
          />
          <path d="M 40 30 L 40 53" stroke={c.secondary} strokeWidth="4.5" strokeLinecap="round"/>
          <path d="M 40 30 C 40 30 48 30 48 36 C 48 42 40 42 40 42" stroke={c.secondary} strokeWidth="4.5" strokeLinecap="round" fill="none"/>
          <path d="M 40 42 L 48 53" stroke={c.secondary} strokeWidth="4.5" strokeLinecap="round"/>
          {/* 文字 */}
          <text x="75" y="50" fontFamily="Arial, sans-serif" fontSize={compact ? "20" : "24"} fontWeight="700" fill={c.text} letterSpacing="-0.5">
            UniqueRecord
          </text>
        </svg>
      </div>
    </div>
  );
}
