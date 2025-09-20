'use client';

import React from 'react';
import LoadingSpinner from './LoadingSpinner';

export interface LoadingOverlayProps {
  isVisible: boolean;
  message?: string;
  submessage?: string;
  variant?: 'default' | 'transparent' | 'blur';
  spinnerSize?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  spinnerVariant?: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'white';
  className?: string;
  zIndex?: number;
  showProgress?: boolean;
  progress?: number;
  cancelable?: boolean;
  onCancel?: () => void;
}

const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  isVisible,
  message = 'Loading...',
  submessage,
  variant = 'default',
  spinnerSize = 'lg',
  spinnerVariant = 'primary',
  className = '',
  zIndex = 50,
  showProgress = false,
  progress = 0,
  cancelable = false,
  onCancel,
}) => {
  if (!isVisible) return null;

  const getVariantClasses = () => {
    switch (variant) {
      case 'transparent':
        return 'bg-black/20';
      case 'blur':
        return 'bg-white/80 backdrop-blur-sm';
      case 'default':
      default:
        return 'bg-black/50';
    }
  };

  const getSpinnerVariant = () => {
    if (variant === 'blur') {
      return 'primary';
    }
    return spinnerVariant === 'white' ? 'white' : spinnerVariant;
  };

  return (
    <div
      className={`
        fixed inset-0 flex items-center justify-center
        ${getVariantClasses()}
        ${className}
      `}
      style={{ zIndex }}
      data-testid="loading-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={message}
    >
      {/* Loading Content */}
      <div className="flex flex-col items-center max-w-sm mx-4">
        {/* Loading Card */}
        <div className={`
          bg-white rounded-lg shadow-lg p-6 min-w-64 text-center
          ${variant === 'blur' ? 'bg-white/90 backdrop-blur-md' : ''}
        `}>
          {/* Spinner */}
          <div className="flex justify-center mb-4">
            <LoadingSpinner
              size={spinnerSize}
              variant={getSpinnerVariant()}
              label={message}
            />
          </div>

          {/* Message */}
          <h3 className="text-lg font-medium text-gray-900 mb-2" data-testid="loading-message">
            {message}
          </h3>

          {/* Submessage */}
          {submessage && (
            <p className="text-sm text-gray-600 mb-4" data-testid="loading-submessage">
              {submessage}
            </p>
          )}

          {/* Progress Bar */}
          {showProgress && (
            <div className="mb-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs text-gray-500">Progress</span>
                <span className="text-xs text-gray-500" data-testid="loading-progress-text">
                  {Math.round(progress)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${Math.max(0, Math.min(progress, 100))}%` }}
                  data-testid="loading-progress-bar"
                />
              </div>
            </div>
          )}

          {/* Cancel Button */}
          {cancelable && onCancel && (
            <button
              onClick={onCancel}
              className="mt-4 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 transition-colors"
              data-testid="loading-cancel-button"
            >
              Cancel
            </button>
          )}
        </div>

        {/* Loading Dots Animation */}
        <div className="mt-4 flex space-x-1" data-testid="loading-dots">
          <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>

      {/* Click-outside backdrop */}
      <div
        className="absolute inset-0 -z-10"
        onClick={cancelable && onCancel ? onCancel : undefined}
        data-testid="loading-backdrop"
      />
    </div>
  );
};

export default LoadingOverlay;