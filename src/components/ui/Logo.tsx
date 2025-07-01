import React, { useState } from 'react';

interface LogoProps {
  variant?: 'primary' | 'secondary' | 'white' | 'black';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  className?: string;
}

const Logo: React.FC<LogoProps> = ({ 
  variant = 'primary', 
  size = 'md', 
  showText = true,
  className = '' 
}) => {
  const [imageError, setImageError] = useState(false);

  const sizeClasses = {
    sm: 'h-6',
    md: 'h-8',
    lg: 'h-12',
    xl: 'h-16'
  };

  const textSizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-xl',
    xl: 'text-2xl'
  };

  const getSubmarkPath = () => {
    switch (variant) {
      case 'primary':
        return '/submark-primary.svg';
      case 'secondary':
        return '/submark-secondary.svg';
      case 'white':
        return '/submark-white.svg';
      case 'black':
        return '/submark-black.svg';
      default:
        return '/submark-primary.svg';
    }
  };

  const getTextColor = () => {
    switch (variant) {
      case 'primary':
        return 'text-neutral-800';
      case 'secondary':
        return 'text-neutral-600';
      case 'white':
        return 'text-white';
      case 'black':
        return 'text-black';
      default:
        return 'text-neutral-800';
    }
  };

  const LogoFallback = () => (
    <div className={`${sizeClasses[size]} w-8 bg-gradient-to-br from-primary-500 to-primary-600 rounded-lg flex items-center justify-center flex-shrink-0`}>
      <span className="text-white font-bold text-sm">IX</span>
    </div>
  );

  return (
    <div className={`flex items-center space-x-3 ${className}`}>
      {!imageError ? (
        <img 
          src={getSubmarkPath()} 
          alt="Innovate X Labs" 
          className={`${sizeClasses[size]} w-auto flex-shrink-0`}
          onError={() => setImageError(true)}
        />
      ) : (
        <LogoFallback />
      )}
      {showText && (
        <span className={`${textSizeClasses[size]} font-bold tracking-tight ${getTextColor()}`}>
          Innovate X Labs
        </span>
      )}
    </div>
  );
};

export default Logo;