import React from 'react';
import { useI18n } from '../../i18n';

interface TextFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  icon?: React.ReactNode;
  onIconClick?: () => void;
  iconButtonLabel?: string;
  containerClassName?: string;
}

export function TextField({ 
  label, 
  error, 
  helperText,
  icon,
  onIconClick,
  iconButtonLabel,
  className = '',
  containerClassName = '',
  disabled,
  ...props 
}: TextFieldProps) {
  const { tr } = useI18n();
  const resolvedIconButtonLabel = iconButtonLabel || tr('图标按钮', 'Icon button');

  return (
    <div className={`flex flex-col gap-1.5 ${containerClassName}`}>
      {label && (
        <label className="text-[14px] font-semibold text-[var(--foreground)]">
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          onIconClick ? (
            <button
              type="button"
              className="absolute left-2 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] hover:text-[var(--fluent-blue)] p-1 rounded-[var(--radius-sm)]"
              onClick={onIconClick}
              disabled={disabled}
              aria-label={resolvedIconButtonLabel}
            >
              {icon}
            </button>
          ) : (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]">
              {icon}
            </div>
          )
        )}
        <input
          className={`
            w-full px-3 py-2 
            bg-[var(--input-background)] 
            border border-[var(--border)]
            rounded-[var(--radius-md)]
            text-[14px] text-[var(--foreground)]
            placeholder:text-[var(--muted-foreground)]
            outline-none
            transition-all duration-100
            hover:border-[var(--neutral-50)]
            focus:border-[var(--fluent-blue)]
            focus:ring-2 focus:ring-[var(--fluent-blue)] focus:ring-opacity-20
            disabled:bg-[var(--neutral-20)] disabled:text-[var(--muted-foreground)] disabled:cursor-not-allowed
            ${error ? 'border-[var(--status-error)] focus:border-[var(--status-error)] focus:ring-[var(--status-error)]' : ''}
            ${icon ? 'pl-10' : ''}
            ${className}
          `}
          disabled={disabled}
          {...props}
        />
      </div>
      {error && (
        <span className="text-[12px] text-[var(--status-error)]">{error}</span>
      )}
      {helperText && !error && (
        <span className="text-[12px] text-[var(--muted-foreground)]">{helperText}</span>
      )}
    </div>
  );
}
