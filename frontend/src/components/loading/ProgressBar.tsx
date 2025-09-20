'use client';

import React from 'react';

export interface ProgressBarProps {
  value: number; // 0-100
  max?: number;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'error';
  showPercentage?: boolean;
  showValue?: boolean;
  label?: string;
  className?: string;
  animated?: boolean;
  striped?: boolean;
}

const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  max = 100,
  size = 'md',
  variant = 'primary',
  showPercentage = false,
  showValue = false,
  label,
  className = '',
  animated = false,
  striped = false,
}) => {
  // Ensure value is within bounds
  const normalizedValue = Math.max(0, Math.min(value, max));
  const percentage = (normalizedValue / max) * 100;

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'h-2';
      case 'md':
        return 'h-3';
      case 'lg':
        return 'h-4';
      default:
        return 'h-3';
    }
  };

  const getVariantClasses = () => {
    switch (variant) {
      case 'primary':
        return 'bg-blue-600';
      case 'secondary':
        return 'bg-gray-600';
      case 'success':
        return 'bg-green-600';
      case 'warning':
        return 'bg-yellow-500';
      case 'error':
        return 'bg-red-600';
      default:
        return 'bg-blue-600';
    }
  };

  const getStripedClasses = () => {
    if (!striped) return '';
    return 'bg-gradient-to-r from-transparent via-white/20 to-transparent bg-[length:1rem_100%]';
  };

  const getAnimatedClasses = () => {
    if (!animated) return '';
    return 'animate-pulse';
  };

  return (
    <div className={`w-full ${className}`} data-testid="progress-bar">
      {/* Label */}
      {label && (
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700" data-testid="progress-label">
            {label}
          </span>
          {(showPercentage || showValue) && (
            <span className="text-sm text-gray-500" data-testid="progress-value">
              {showPercentage && `${Math.round(percentage)}%`}
              {showValue && `${normalizedValue}/${max}`}
            </span>
          )}
        </div>
      )}

      {/* Progress Bar Container */}
      <div
        className={`
          w-full bg-gray-200 rounded-full overflow-hidden
          ${getSizeClasses()}
        `}
        data-testid="progress-container"
        role="progressbar"
        aria-valuenow={normalizedValue}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-label={label || `Progress: ${Math.round(percentage)}%`}
      >
        {/* Progress Bar Fill */}
        <div
          className={`
            h-full rounded-full transition-all duration-300 ease-out
            ${getVariantClasses()}
            ${getStripedClasses()}
            ${getAnimatedClasses()}
          `}
          style={{ width: `${percentage}%` }}
          data-testid="progress-fill"
        />
      </div>

      {/* Accessibility */}
      <div className="sr-only" data-testid="progress-sr-text">
        {label ? `${label}: ` : ''}
        Progress {Math.round(percentage)} percent complete
      </div>
    </div>
  );
};

export default ProgressBar;