import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from './Button';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function Modal({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  footer,
  size = 'md',
  className = '' 
}: ModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);
  
  if (!isOpen) return null;
  
  const sizeStyles = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
  };
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div 
        className={`
          relative w-full ${sizeStyles[size]}
          max-h-[calc(100vh-2rem)] overflow-hidden flex flex-col
          bg-[var(--card)] 
          border border-[var(--border)]
          rounded-[var(--radius-lg)]
          shadow-[var(--shadow-xl)]
          ${className}
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
          <h2 className="text-[var(--text-lg)] font-semibold text-[var(--foreground)]">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="
              p-1.5 rounded-[var(--radius-sm)]
              text-[var(--muted-foreground)] 
              hover:bg-[var(--neutral-10)]
              hover:text-[var(--foreground)]
              transition-colors duration-100
              outline-none
              focus-visible:ring-2 focus-visible:ring-[var(--fluent-blue)]
            "
          >
            <X size={18} />
          </button>
        </div>
        
        {/* Content */}
        <div className="px-6 py-4 overflow-y-auto min-h-0">
          {children}
        </div>
        
        {/* Footer */}
        {footer && (
          <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-[var(--border)] bg-[var(--neutral-10)]">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
