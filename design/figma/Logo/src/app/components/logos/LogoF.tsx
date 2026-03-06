interface LogoProps {
  colorMode: 'color' | 'dark' | 'light';
  compact?: boolean;
}

// 方案 F：可靠盾牌 - 盾牌形态结合 REC 标识
export function LogoF({ colorMode, compact = false }: LogoProps) {
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
          {/* 盾牌形状 */}
          <path
            d="M 60 15 L 85 25 C 90 27 95 32 95 38 L 95 65 C 95 75 88 85 60 100 C 32 85 25 75 25 65 L 25 38 C 25 32 30 27 35 25 L 60 15 Z"
            fill={c.primary}
            opacity="0.12"
          />
          <path
            d="M 60 15 L 85 25 C 90 27 95 32 95 38 L 95 65 C 95 75 88 85 60 100 C 32 85 25 75 25 65 L 25 38 C 25 32 30 27 35 25 L 60 15 Z"
            stroke={c.primary}
            strokeWidth="3"
            fill="none"
          />
          {/* REC 文字 */}
          <text x="60" y="55" fontFamily="Arial, sans-serif" fontSize="18" fontWeight="900" fill={c.primary} textAnchor="middle">
            REC
          </text>
          {/* 录制点 */}
          <circle cx="60" cy="70" r="8" fill={c.accent}/>
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
            d="M 35 18 L 48 22 C 51 23 54 26 54 29 L 54 45 C 54 50 50 55 35 62 C 20 55 16 50 16 45 L 16 29 C 16 26 19 23 22 22 L 35 18 Z"
            stroke={c.primary}
            strokeWidth="2"
            fill="none"
          />
          <text x="35" y="42" fontFamily="Arial, sans-serif" fontSize="10" fontWeight="900" fill={c.primary} textAnchor="middle">
            REC
          </text>
          <circle cx="35" cy="50" r="4" fill={c.accent}/>
          {/* 文字 */}
          <text x="75" y="50" fontFamily="Arial, sans-serif" fontSize={compact ? "20" : "24"} fontWeight="700" fill={c.text} letterSpacing="-0.5">
            UniqueRecord
          </text>
        </svg>
      </div>
    </div>
  );
}
