import React from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'subtle' | 'accent' | 'destructive';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: React.ReactNode;
}

export function Button({ 
  variant = 'primary', 
  size = 'md', 
  className = '',
  disabled,
  children,
  ...props 
}: ButtonProps) {
  const baseStyles = 'inline-flex items-center justify-center gap-2 transition-all duration-100 outline-none border';
  
  const variantStyles = {
    primary: `
      bg-[var(--fluent-blue)] text-white border-[var(--fluent-blue)]
      hover:bg-[var(--fluent-blue-hover)] hover:border-[var(--fluent-blue-hover)]
      active:bg-[var(--fluent-blue-pressed)] active:border-[var(--fluent-blue-pressed)]
      focus-visible:ring-2 focus-visible:ring-[var(--fluent-blue)] focus-visible:ring-offset-2
      disabled:bg-[var(--neutral-30)] disabled:text-[var(--neutral-60)] disabled:border-[var(--neutral-40)] disabled:cursor-not-allowed
    `,
    secondary: `
      bg-white text-[var(--neutral-90)] border-[var(--neutral-40)]
      hover:bg-[var(--neutral-10)] hover:border-[var(--neutral-50)]
      active:bg-[var(--neutral-20)] active:border-[var(--neutral-60)]
      focus-visible:ring-2 focus-visible:ring-[var(--fluent-blue)] focus-visible:ring-offset-2
      disabled:bg-[var(--neutral-20)] disabled:text-[var(--neutral-60)] disabled:border-[var(--neutral-40)] disabled:cursor-not-allowed
    `,
    subtle: `
      bg-transparent text-[var(--neutral-90)] border-transparent
      hover:bg-[var(--neutral-10)] hover:border-[var(--neutral-30)]
      active:bg-[var(--neutral-20)] active:border-[var(--neutral-40)]
      focus-visible:ring-2 focus-visible:ring-[var(--fluent-blue)] focus-visible:ring-offset-2
      disabled:text-[var(--neutral-60)] disabled:cursor-not-allowed
    `,
    accent: `
      bg-[var(--fluent-blue-lighter)] text-[var(--fluent-blue)] border-[var(--fluent-blue-light)]
      hover:bg-[var(--fluent-blue-light)] hover:border-[var(--fluent-blue)]
      active:bg-[var(--fluent-blue-light)] active:border-[var(--fluent-blue-pressed)]
      focus-visible:ring-2 focus-visible:ring-[var(--fluent-blue)] focus-visible:ring-offset-2
      disabled:bg-[var(--neutral-20)] disabled:text-[var(--neutral-60)] disabled:border-[var(--neutral-40)] disabled:cursor-not-allowed
    `,
    destructive: `
      bg-[var(--status-error)] text-white border-[var(--status-error)]
      hover:bg-[#c50f1f] hover:border-[#c50f1f]
      active:bg-[#a80000] active:border-[#a80000]
      focus-visible:ring-2 focus-visible:ring-[var(--status-error)] focus-visible:ring-offset-2
      disabled:bg-[var(--neutral-30)] disabled:text-[var(--neutral-60)] disabled:border-[var(--neutral-40)] disabled:cursor-not-allowed
    `,
  };
  
  const sizeStyles = {
    sm: 'px-3 py-1.5 text-[12px] rounded-[var(--radius-sm)]',
    md: 'px-4 py-2 text-[14px] rounded-[var(--radius-md)]',
    lg: 'px-5 py-2.5 text-[14px] rounded-[var(--radius-lg)]',
  };
  
  return (
    <button
      className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}
