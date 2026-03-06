import React from 'react';

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
  className?: string;
}

export function Switch({ checked, onChange, label, disabled, className = '' }: SwitchProps) {
  return (
    <label className={`inline-flex items-center gap-2 cursor-pointer ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className={`
          relative inline-flex h-5 w-10 items-center rounded-full
          transition-colors duration-200 outline-none
          focus-visible:ring-2 focus-visible:ring-[var(--fluent-blue)] focus-visible:ring-offset-2
          ${checked 
            ? 'bg-[var(--fluent-blue)]' 
            : 'bg-[var(--switch-background)]'
          }
          ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}
        `}
      >
        <span
          className={`
            inline-block h-4 w-4 transform rounded-full bg-white
            transition-transform duration-200 shadow-sm
            ${checked ? 'translate-x-5' : 'translate-x-0.5'}
          `}
        />
      </button>
      {label && (
        <span className="text-[14px] text-[var(--foreground)] select-none">
          {label}
        </span>
      )}
    </label>
  );
}
