interface LogoProps {
  colorMode: 'color' | 'dark' | 'light';
  compact?: boolean;
}

// 方案 K：波形律动 - 音视频波形与录制点结合
export function LogoK({ colorMode, compact = false }: LogoProps) {
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
          {/* 圆形背景 */}
          <circle cx="60" cy="60" r="45" fill={c.primary} opacity="0.06"/>
          {/* 波形条 */}
          <rect x="30" y="45" width="4" height="30" rx="2" fill={c.primary} opacity="0.4"/>
          <rect x="38" y="35" width="4" height="50" rx="2" fill={c.primary} opacity="0.5"/>
          <rect x="46" y="25" width="4" height="70" rx="2" fill={c.primary} opacity="0.7"/>
          <rect x="54" y="15" width="4" height="90" rx="2" fill={c.primary}/>
          <rect x="62" y="25" width="4" height="70" rx="2" fill={c.secondary}/>
          <rect x="70" y="35" width="4" height="50" rx="2" fill={c.secondary} opacity="0.7"/>
          <rect x="78" y="45" width="4" height="30" rx="2" fill={c.secondary} opacity="0.5"/>
          <rect x="86" y="50" width="4" height="20" rx="2" fill={c.secondary} opacity="0.3"/>
          {/* 中心录制点 */}
          <circle cx="60" cy="60" r="12" fill={c.accent}/>
          <circle cx="60" cy="60" r="8" fill={c.accent} opacity="0.5"/>
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
          <rect x="18" y="32" width="3" height="16" rx="1.5" fill={c.primary} opacity="0.4"/>
          <rect x="24" y="28" width="3" height="24" rx="1.5" fill={c.primary} opacity="0.6"/>
          <rect x="30" y="20" width="3" height="40" rx="1.5" fill={c.primary}/>
          <circle cx="35" cy="40" r="6" fill={c.accent}/>
          <rect x="40" y="20" width="3" height="40" rx="1.5" fill={c.secondary}/>
          <rect x="46" y="28" width="3" height="24" rx="1.5" fill={c.secondary} opacity="0.6"/>
          <rect x="52" y="32" width="3" height="16" rx="1.5" fill={c.secondary} opacity="0.4"/>
          {/* 文字 */}
          <text x="75" y="50" fontFamily="Arial, sans-serif" fontSize={compact ? "20" : "24"} fontWeight="700" fill={c.text} letterSpacing="-0.5">
            UniqueRecord
          </text>
        </svg>
      </div>
    </div>
  );
}
