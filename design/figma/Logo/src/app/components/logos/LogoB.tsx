interface LogoProps {
  colorMode: 'color' | 'dark' | 'light';
  compact?: boolean;
}

// 方案 B：镜头光圈 - 相机光圈几何图形
export function LogoB({ colorMode, compact = false }: LogoProps) {
  const colors = {
    color: { primary: '#0078D4', secondary: '#50E6FF', accent: '#0F6CBD', text: '#1F2937' },
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
          {/* 外圆 */}
          <circle cx="60" cy="60" r="45" stroke={c.primary} strokeWidth="3" fill="none"/>
          {/* 光圈叶片 - 8个三角形 */}
          {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => {
            const rad = (angle * Math.PI) / 180;
            const x1 = 60 + Math.cos(rad) * 25;
            const y1 = 60 + Math.sin(rad) * 25;
            const x2 = 60 + Math.cos(rad + 0.4) * 35;
            const y2 = 60 + Math.sin(rad + 0.4) * 35;
            const x3 = 60 + Math.cos(rad - 0.4) * 35;
            const y3 = 60 + Math.sin(rad - 0.4) * 35;
            return (
              <path
                key={i}
                d={`M ${x1} ${y1} L ${x2} ${y2} L ${x3} ${y3} Z`}
                fill={c.primary}
                opacity="0.7"
              />
            );
          })}
          {/* 中心圆 */}
          <circle cx="60" cy="60" r="15" fill={c.accent}/>
          <circle cx="60" cy="60" r="8" fill={c.primary}/>
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
          <circle cx="35" cy="40" r="22" stroke={c.primary} strokeWidth="2" fill="none"/>
          {[0, 90, 180, 270].map((angle, i) => {
            const rad = (angle * Math.PI) / 180;
            const x1 = 35 + Math.cos(rad) * 12;
            const y1 = 40 + Math.sin(rad) * 12;
            const x2 = 35 + Math.cos(rad + 0.5) * 18;
            const y2 = 40 + Math.sin(rad + 0.5) * 18;
            const x3 = 35 + Math.cos(rad - 0.5) * 18;
            const y3 = 40 + Math.sin(rad - 0.5) * 18;
            return (
              <path
                key={i}
                d={`M ${x1} ${y1} L ${x2} ${y2} L ${x3} ${y3} Z`}
                fill={c.primary}
                opacity="0.7"
              />
            );
          })}
          <circle cx="35" cy="40" r="6" fill={c.primary}/>
          {/* 文字 */}
          <text x="75" y="50" fontFamily="Arial, sans-serif" fontSize={compact ? "20" : "24"} fontWeight="700" fill={c.text} letterSpacing="-0.5">
            UniqueRecord
          </text>
        </svg>
      </div>
    </div>
  );
}
