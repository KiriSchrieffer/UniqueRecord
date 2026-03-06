import React from 'react';
import { Circle } from 'lucide-react';

type Status = 'idle' | 'detecting' | 'recording' | 'error' | 'success';

interface StatusBadgeProps {
  status: Status;
  text: string;
  showDot?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

export function StatusBadge({ 
  status, 
  text, 
  showDot = true,
  size = 'md',
  className = '' 
}: StatusBadgeProps) {
  const statusConfig = {
    idle: {
      bg: 'bg-[var(--neutral-10)]',
      text: 'text-[var(--status-idle)]',
      border: 'border-[var(--neutral-40)]',
      dot: 'text-[var(--status-idle)]',
    },
    detecting: {
      bg: 'bg-[var(--fluent-blue-lighter)]',
      text: 'text-[var(--status-detecting)]',
      border: 'border-[var(--fluent-blue-light)]',
      dot: 'text-[var(--status-detecting)]',
    },
    recording: {
      bg: 'bg-[#fef6f6]',
      text: 'text-[var(--status-recording)]',
      border: 'border-[#f9d6cc]',
      dot: 'text-[var(--status-recording)]',
    },
    error: {
      bg: 'bg-[#fef6f6]',
      text: 'text-[var(--status-error)]',
      border: 'border-[#f9d6d6]',
      dot: 'text-[var(--status-error)]',
    },
    success: {
      bg: 'bg-[#f0f9f0]',
      text: 'text-[var(--status-success)]',
      border: 'border-[#c7e6c7]',
      dot: 'text-[var(--status-success)]',
    },
  };
  
  const sizeStyles = {
    sm: 'px-2 py-0.5 text-[11px] gap-1',
    md: 'px-2.5 py-1 text-[12px] gap-1.5',
  };
  
  const config = statusConfig[status];
  
  return (
    <span 
      className={`
        inline-flex items-center 
        ${config.bg} 
        ${config.text} 
        border ${config.border}
        rounded-[var(--radius-sm)]
        font-medium
        ${sizeStyles[size]}
        ${className}
      `}
    >
      {showDot && (
        <Circle 
          className={`${config.dot} fill-current`} 
          size={size === 'sm' ? 6 : 8} 
        />
      )}
      {text}
    </span>
  );
}
