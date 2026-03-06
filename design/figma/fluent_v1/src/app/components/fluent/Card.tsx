import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  shadow?: boolean;
  hover?: boolean;
}

export function Card({ 
  children, 
  className = '', 
  padding = 'md',
  shadow = true,
  hover = false
}: CardProps) {
  const paddingStyles = {
    none: '',
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6',
  };
  
  const shadowClass = shadow ? 'shadow-[var(--shadow-md)]' : '';
  const hoverClass = hover ? 'hover:shadow-[var(--shadow-lg)] transition-shadow duration-200' : '';
  
  return (
    <div 
      className={`
        bg-[var(--card)] 
        border border-[var(--border)] 
        rounded-[var(--radius-lg)]
        ${shadowClass}
        ${hoverClass}
        ${paddingStyles[padding]}
        ${className}
      `}
    >
      {children}
    </div>
  );
}

interface CardHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  className?: string;
}

export function CardHeader({ title, subtitle, action, className = '' }: CardHeaderProps) {
  return (
    <div className={`flex items-start justify-between mb-4 ${className}`}>
      <div>
        <h3 className="text-[var(--text-lg)] font-semibold text-[var(--foreground)]">
          {title}
        </h3>
        {subtitle && (
          <p className="text-[var(--text-sm)] text-[var(--muted-foreground)] mt-0.5">
            {subtitle}
          </p>
        )}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}

interface CardSectionProps {
  children: React.ReactNode;
  className?: string;
}

export function CardSection({ children, className = '' }: CardSectionProps) {
  return (
    <div className={`border-t border-[var(--border)] pt-4 mt-4 ${className}`}>
      {children}
    </div>
  );
}
