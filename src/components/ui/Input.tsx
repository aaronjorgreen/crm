import React, { forwardRef } from 'react';
import { DivideIcon as LucideIcon } from 'lucide-react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: LucideIcon;
  iconPosition?: 'left' | 'right';
  helperText?: string;
  fullWidth?: boolean;
}

const Input = forwardRef<HTMLInputElement, InputProps>(({
  label,
  error,
  icon: Icon,
  iconPosition = 'left',
  helperText,
  fullWidth = false,
  className = '',
  ...props
}, ref) => {
  const inputClasses = `
    block w-full px-4 py-4 border rounded-2xl text-sm font-medium
    placeholder-neutral-400 bg-white/70 backdrop-blur-sm
    focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 focus:bg-white
    disabled:bg-neutral-50 disabled:text-neutral-500 disabled:cursor-not-allowed
    transition-all duration-300 ease-in-out
    hover:bg-white hover:border-neutral-400
    ${error 
      ? 'border-red-300 text-red-900 focus:ring-red-500/30 focus:border-red-500' 
      : 'border-neutral-300 text-neutral-900'
    }
    ${Icon && iconPosition === 'left' ? 'pl-12' : ''}
    ${Icon && iconPosition === 'right' ? 'pr-12' : ''}
    ${className}
  `;

  return (
    <div className={`space-y-3 ${fullWidth ? 'w-full' : ''}`}>
      {label && (
        <label className="block text-sm font-bold text-neutral-800 mb-3 tracking-wide">
          {label}
        </label>
      )}
      <div className="relative">
        {Icon && (
          <div className={`absolute inset-y-0 ${iconPosition === 'left' ? 'left-0 pl-4' : 'right-0 pr-4'} flex items-center pointer-events-none`}>
            <Icon className={`h-5 w-5 ${error ? 'text-red-400' : 'text-neutral-500'} transition-colors duration-200`} />
          </div>
        )}
        <input
          ref={ref}
          className={inputClasses}
          {...props}
        />
      </div>
      {error && (
        <p className="text-sm text-red-600 font-semibold flex items-center space-x-1">
          <span className="w-1 h-1 bg-red-500 rounded-full"></span>
          <span>{error}</span>
        </p>
      )}
      {helperText && !error && (
        <p className="text-sm text-neutral-500 font-medium">{helperText}</p>
      )}
    </div>
  );
});

Input.displayName = 'Input';

export default Input;