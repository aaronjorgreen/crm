import React from 'react';
import { DivideIcon as LucideIcon } from 'lucide-react';

interface ButtonProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  icon?: LucideIcon;
  iconPosition?: 'left' | 'right';
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  className?: string;
}

const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  icon: Icon,
  iconPosition = 'left',
  disabled = false,
  loading = false,
  fullWidth = false,
  onClick,
  type = 'button',
  className = ''
}) => {
  const baseClasses = 'inline-flex items-center justify-center font-bold rounded-2xl transition-all duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transform active:scale-[0.98] relative overflow-hidden';
  
  const variantClasses = {
    primary: 'bg-gradient-to-r from-primary-600 to-primary-700 text-white hover:from-primary-700 hover:to-primary-800 focus:ring-primary-500/40 shadow-xl hover:shadow-2xl border border-primary-600/20',
    secondary: 'bg-gradient-to-r from-secondary-100 to-secondary-200 text-secondary-800 hover:from-secondary-200 hover:to-secondary-300 focus:ring-secondary-500/30 shadow-lg hover:shadow-xl border border-secondary-300/50',
    outline: 'border-2 border-primary-400 text-primary-700 hover:bg-primary-50 hover:border-primary-500 focus:ring-primary-500/30 bg-white/70 backdrop-blur-sm hover:bg-white shadow-lg hover:shadow-xl',
    ghost: 'text-primary-700 hover:bg-primary-50 focus:ring-primary-500/30 hover:shadow-md',
    danger: 'bg-gradient-to-r from-red-600 to-red-700 text-white hover:from-red-700 hover:to-red-800 focus:ring-red-500/40 shadow-xl hover:shadow-2xl border border-red-600/20'
  };

  const sizeClasses = {
    sm: 'px-5 py-3 text-sm',
    md: 'px-7 py-4 text-sm',
    lg: 'px-9 py-5 text-base'
  };

  const iconSizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-4 w-4',
    lg: 'h-5 w-5'
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`
        ${baseClasses}
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${fullWidth ? 'w-full' : ''}
        ${className}
      `}
    >
      {/* Shimmer effect for primary buttons */}
      {variant === 'primary' && (
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
      )}
      
      {loading ? (
        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-current mr-3" />
      ) : (
        Icon && iconPosition === 'left' && (
          <Icon className={`${iconSizeClasses[size]} mr-3 transition-transform duration-200 group-hover:scale-110`} />
        )
      )}
      <span className="relative z-10">{children}</span>
      {Icon && iconPosition === 'right' && !loading && (
        <Icon className={`${iconSizeClasses[size]} ml-3 transition-transform duration-200 group-hover:translate-x-1`} />
      )}
    </button>
  );
};

export default Button;