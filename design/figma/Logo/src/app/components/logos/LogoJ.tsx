interface LogoProps {
  colorMode: 'color' | 'dark' | 'light';
  compact?: boolean;
}

// 方案 J：像素网格 - 像素化录制按钮
export function LogoJ({ colorMode, compact = false }: LogoProps) {
  const colors = {
    color: { primary: '#0078D4', secondary: '#50E6FF', accent: '#E74856', text: '#1F2937' },
    dark: { primary: '#1F2937', secondary: '#374151', accent: '#1F2937', text: '#1F2937' },
    light: { primary: '#FFFFFF', secondary: '#F3F4F6', accent: '#FFFFFF', text: '#FFFFFF' }
  };
  const c = colors[colorMode];

  const pixelSize = 8;
  const pattern = [
    [0, 0, 1, 1, 1, 1, 0, 0],
    [0, 1, 1, 1, 1, 1, 1, 0],
    [1, 1, 2, 2, 2, 2, 1, 1],
    [1, 1, 2, 3, 3, 2, 1, 1],
    [1, 1, 2, 3, 3, 2, 1, 1],
    [1, 1, 2, 2, 2, 2, 1, 1],
    [0, 1, 1, 1, 1, 1, 1, 0],
    [0, 0, 1, 1, 1, 1, 0, 0],
  ];

  return (
    <div className="space-y-8">
      {/* 图形标 Symbol */}
      <div className="flex flex-col items-center gap-3">
        <span className={`text-xs font-bold ${colorMode === 'light' ? 'text-gray-400' : 'text-gray-500'}`}>图形标</span>
        <svg width={compact ? "80" : "120"} height={compact ? "80" : "120"} viewBox="0 0 120 120" fill="none">
          <g transform="translate(28, 28)">
            {pattern.map((row, y) =>
              row.map((cell, x) => {
                if (cell === 0) return null;
                let fill = c.primary;
                let opacity = 1;
                if (cell === 2) {
                  fill = c.secondary;
                  opacity = 0.8;
                }
                if (cell === 3) {
                  fill = c.accent;
                  opacity = 1;
                }
                return (
                  <rect
                    key={`${x}-${y}`}
                    x={x * pixelSize}
                    y={y * pixelSize}
                    width={pixelSize}
                    height={pixelSize}
                    fill={fill}
                    opacity={opacity}
                  />
                );
              })
            )}
          </g>
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
          <g transform="translate(15, 20)">
            {[
              [0, 0, 1, 1, 1, 0, 0],
              [0, 1, 2, 2, 2, 1, 0],
              [1, 2, 3, 3, 3, 2, 1],
              [1, 2, 3, 3, 3, 2, 1],
              [0, 1, 2, 2, 2, 1, 0],
              [0, 0, 1, 1, 1, 0, 0],
            ].map((row, y) =>
              row.map((cell, x) => {
                if (cell === 0) return null;
                let fill = c.primary;
                if (cell === 2) fill = c.secondary;
                if (cell === 3) fill = c.accent;
                return (
                  <rect
                    key={`${x}-${y}`}
                    x={x * 5}
                    y={y * 5}
                    width={5}
                    height={5}
                    fill={fill}
                    opacity={cell === 2 ? 0.8 : 1}
                  />
                );
              })
            )}
          </g>
          {/* 文字 */}
          <text x="75" y="50" fontFamily="Arial, sans-serif" fontSize={compact ? "20" : "24"} fontWeight="700" fill={c.text} letterSpacing="-0.5">
            UniqueRecord
          </text>
        </svg>
      </div>
    </div>
  );
}
