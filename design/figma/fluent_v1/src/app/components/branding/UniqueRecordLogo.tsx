import React from 'react';

type LogoTone = 'color' | 'monochrome' | 'inverse';

interface UniqueRecordLogoSymbolProps {
  size?: number;
  tone?: LogoTone;
  className?: string;
}

interface UniqueRecordLogoLockupProps {
  size?: number;
  tone?: LogoTone;
  className?: string;
}

function resolveTone(tone: LogoTone) {
  if (tone === 'inverse') {
    return {
      primary: '#FFFFFF',
      secondary: '#FFFFFF',
      accent: '#FFFFFF',
      box: 'rgba(255,255,255,0.18)',
    };
  }
  if (tone === 'monochrome') {
    return {
      primary: '#1F2937',
      secondary: '#374151',
      accent: '#1F2937',
      box: 'rgba(31,41,55,0.08)',
    };
  }
  return {
    primary: '#0078D4',
    secondary: '#0F6CBD',
    accent: '#E74856',
    box: 'rgba(15,108,189,0.08)',
  };
}

export function UniqueRecordLogoSymbol({
  size = 32,
  tone = 'color',
  className,
}: UniqueRecordLogoSymbolProps) {
  const c = resolveTone(tone);
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <rect x="20" y="20" width="80" height="80" rx="12" fill={c.box} />
      <path
        d="M 35 35 L 35 58 C 35 66 40 72 48 72 L 52 72 C 60 72 65 66 65 58"
        stroke={c.primary}
        strokeWidth="8"
        strokeLinecap="round"
        fill="none"
      />
      <path d="M 70 45 L 70 85" stroke={c.secondary} strokeWidth="8" strokeLinecap="round" />
      <path
        d="M 70 45 C 70 45 82 45 82 55 C 82 65 70 65 70 65"
        stroke={c.secondary}
        strokeWidth="8"
        strokeLinecap="round"
        fill="none"
      />
      <path d="M 70 65 L 82 85" stroke={c.secondary} strokeWidth="8" strokeLinecap="round" />
      <circle cx="50" cy="60" r="6" fill={c.accent} />
    </svg>
  );
}

export function UniqueRecordLogoLockup({
  size = 28,
  tone = 'color',
  className,
}: UniqueRecordLogoLockupProps) {
  const textClassName =
    tone === 'inverse' ? 'text-white' : tone === 'monochrome' ? 'text-[#1F2937]' : 'text-[var(--foreground)]';
  return (
    <div className={`inline-flex items-center gap-2 ${className || ''}`.trim()}>
      <UniqueRecordLogoSymbol size={size} tone={tone} />
      <span className={`font-semibold tracking-[-0.01em] ${textClassName}`}>UniqueRecord</span>
    </div>
  );
}

