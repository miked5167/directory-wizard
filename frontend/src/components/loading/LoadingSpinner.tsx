'use client';

import React from 'react';

export interface LoadingSpinnerProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'white';
  className?: string;
  label?: string;
  speed?: 'slow' | 'normal' | 'fast';
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  variant = 'primary',
  className = '',
  label = 'Loading...',
  speed = 'normal',
}) => {
  const getSizeClasses = () => {
    switch (size) {
      case 'xs':
        return 'w-3 h-3';
      case 'sm':
        return 'w-4 h-4';
      case 'md':
        return 'w-6 h-6';
      case 'lg':
        return 'w-8 h-8';
      case 'xl':
        return 'w-12 h-12';
      default:
        return 'w-6 h-6';
    }
  };

  const getVariantClasses = () => {
    switch (variant) {
      case 'primary':
        return 'border-blue-600 border-t-transparent';
      case 'secondary':
        return 'border-gray-600 border-t-transparent';
      case 'success':
        return 'border-green-600 border-t-transparent';
      case 'warning':
        return 'border-yellow-600 border-t-transparent';
      case 'error':
        return 'border-red-600 border-t-transparent';
      case 'white':
        return 'border-white border-t-transparent';
      default:
        return 'border-blue-600 border-t-transparent';
    }
  };

  const getSpeedClasses = () => {
    switch (speed) {
      case 'slow':
        return 'animate-spin-slow';
      case 'normal':
        return 'animate-spin';
      case 'fast':
        return 'animate-spin-fast';
      default:
        return 'animate-spin';
    }
  };

  return (
    <div
      className={`inline-flex items-center ${className}`}
      data-testid="loading-spinner"
      role="status"
      aria-label={label}
    >
      <div
        className={`
          border-2 rounded-full
          ${getSizeClasses()}
          ${getVariantClasses()}
          ${getSpeedClasses()}
        `}
        data-testid="spinner-element"
      />
      {label && (
        <span className="sr-only" data-testid="spinner-label">
          {label}
        </span>
      )}
    </div>
  );
};

export default LoadingSpinner;