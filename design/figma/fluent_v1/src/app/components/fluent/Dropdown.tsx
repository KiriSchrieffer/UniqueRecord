import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { useI18n } from '../../i18n';

interface DropdownOption {
  value: string;
  label: string;
  recommended?: boolean;
}

interface DropdownProps {
  label?: string;
  options: DropdownOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function Dropdown({
  label,
  options,
  value,
  onChange,
  placeholder,
  disabled,
  className = '',
}: DropdownProps) {
  const { tr } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);
  const resolvedPlaceholder = placeholder || tr('请选择...', 'Please select...');

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={`flex flex-col gap-1.5 ${className}`} ref={containerRef}>
      {label && <label className="text-[14px] font-semibold text-[var(--foreground)]">{label}</label>}
      <div className="relative">
        <button
          type="button"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
          className="
            w-full px-3 py-2
            bg-[var(--input-background)]
            border border-[var(--border)]
            rounded-[var(--radius-md)]
            text-[14px] text-left
            outline-none
            transition-all duration-100
            flex items-center justify-between
            hover:border-[var(--neutral-50)]
            focus:border-[var(--fluent-blue)]
            focus:ring-2 focus:ring-[var(--fluent-blue)] focus:ring-opacity-20
            disabled:bg-[var(--neutral-20)] disabled:text-[var(--muted-foreground)] disabled:cursor-not-allowed
          "
        >
          <span className={selectedOption ? 'text-[var(--foreground)]' : 'text-[var(--muted-foreground)]'}>
            {selectedOption?.label || resolvedPlaceholder}
          </span>
          <ChevronDown
            size={16}
            className={`text-[var(--muted-foreground)] transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          />
        </button>

        {isOpen && !disabled && (
          <div
            className="
              absolute z-50 w-full mt-1
              bg-[var(--popover)]
              border border-[var(--border)]
              rounded-[var(--radius-md)]
              shadow-[var(--shadow-lg)]
              max-h-60 overflow-auto
            "
          >
            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className={`
                  w-full px-3 py-2 text-left text-[14px]
                  flex items-center justify-between gap-2
                  transition-colors duration-100
                  ${
                    option.value === value
                      ? 'bg-[var(--fluent-blue-lighter)] text-[var(--fluent-blue)]'
                      : 'text-[var(--foreground)] hover:bg-[var(--neutral-10)]'
                  }
                `}
              >
                <div className="flex items-center gap-2 flex-1">
                  <span>{option.label}</span>
                  {option.recommended && (
                    <span className="text-[11px] px-1.5 py-0.5 bg-[var(--fluent-blue-light)] text-[var(--fluent-blue)] rounded-[var(--radius-sm)]">
                      {tr('推荐', 'Recommended')}
                    </span>
                  )}
                </div>
                {option.value === value && <Check size={16} className="text-[var(--fluent-blue)]" />}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
