'use client';

import React, { useState, useEffect, useCallback } from 'react';
import ErrorBoundary, { ErrorFallbackProps } from './ErrorBoundary';

// Async error fallback component
const AsyncErrorFallback: React.FC<ErrorFallbackProps & { asyncError?: boolean }> = ({
  error,
  errorId,
  resetError,
  level,
}) => {
  const [isRetrying, setIsRetrying] = useState(false);

  const handleRetry = async () => {
    setIsRetrying(true);
    try {
      // Wait a bit before retrying to avoid immediate failure
      await new Promise(resolve => setTimeout(resolve, 1000));
      resetError();
    } finally {
      setIsRetrying(false);
    }
  };

  const handleReload = () => {
    window.location.reload();
  };

  return (
    <div
      className={`flex items-center justify-center bg-gray-50 px-4 ${
        level === 'component' ? 'min-h-64' : 'min-h-screen'
      }`}
      data-testid="async-error-boundary"
    >
      <div className="max-w-md w-full">
        <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6">
          {/* Error Icon */}
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center">
              <svg
                className="w-8 h-8 text-orange-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                data-testid="async-error-icon"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
          </div>

          {/* Error Title */}
          <h2 className="text-xl font-semibold text-gray-900 text-center mb-2">
            Connection Error
          </h2>

          {/* Error Message */}
          <p className="text-gray-600 text-center mb-4">
            We're having trouble connecting to our servers. This is usually a temporary issue.
          </p>

          {/* Network Status */}
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-orange-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-orange-800">
                  Possible causes:
                </h3>
                <div className="mt-1 text-sm text-orange-700">
                  <ul className="list-disc list-inside space-y-1">
                    <li>Slow or unstable internet connection</li>
                    <li>Server maintenance in progress</li>
                    <li>Temporary service disruption</li>
                    <li>Firewall or proxy blocking the request</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <button
              onClick={handleRetry}
              disabled={isRetrying}
              className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium flex items-center justify-center"
              data-testid="retry-async"
            >
              {isRetrying ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Retrying...
                </>
              ) : (
                'Try Again'
              )}
            </button>

            {level === 'page' || level === 'app' ? (
              <button
                onClick={handleReload}
                className="w-full bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition-colors font-medium"
                data-testid="reload-async"
              >
                Reload Page
              </button>
            ) : (
              <button
                onClick={() => window.history.back()}
                className="w-full bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition-colors font-medium"
                data-testid="go-back-async"
              >
                Go Back
              </button>
            )}
          </div>

          {/* Network Status Check */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Network Status:</span>
              <span className={`font-medium ${navigator.onLine ? 'text-green-600' : 'text-red-600'}`}>
                {navigator.onLine ? '🟢 Online' : '🔴 Offline'}
              </span>
            </div>
          </div>

          {/* Error ID for Support */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <p className="text-xs text-gray-500 text-center">
              Error ID: <span className="font-mono" data-testid="async-error-id">{errorId}</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

// Hook for handling async errors
export const useAsyncError = () => {
  const [, setError] = useState();

  return useCallback((error: Error) => {
    setError(() => {
      throw error;
    });
  }, []);
};

// Async error boundary component
interface AsyncErrorBoundaryProps {
  children: React.ReactNode;
  onError?: (error: Error, errorInfo: any, errorId: string) => void;
  level?: 'app' | 'page' | 'component';
}

const AsyncErrorBoundary: React.FC<AsyncErrorBoundaryProps> = ({
  children,
  onError,
  level = 'component',
}) => {
  const handleAsyncError = (error: Error, errorInfo: any, errorId: string) => {
    // Log async error details
    console.error('Async Error:', {
      error: error.message,
      stack: error.stack,
      errorId,
      isNetworkError: error.name === 'NetworkError' || error.message.includes('fetch'),
      isOnline: navigator.onLine,
      timestamp: new Date().toISOString(),
    });

    // Call custom error handler if provided
    if (onError) {
      onError(error, errorInfo, errorId);
    }

    // Track network-related errors
    try {
      const networkErrors = JSON.parse(localStorage.getItem('network_errors') || '[]');
      networkErrors.push({
        errorId,
        message: error.message,
        isNetworkError: error.name === 'NetworkError' || error.message.includes('fetch'),
        isOnline: navigator.onLine,
        timestamp: new Date().toISOString(),
      });
      // Keep only last 10 network errors
      if (networkErrors.length > 10) {
        networkErrors.splice(0, networkErrors.length - 10);
      }
      localStorage.setItem('network_errors', JSON.stringify(networkErrors));
    } catch (e) {
      console.warn('Failed to store network error:', e);
    }
  };

  // Create enhanced fallback component
  const EnhancedAsyncErrorFallback: React.FC<ErrorFallbackProps> = (props) => (
    <AsyncErrorFallback {...props} level={level} asyncError={true} />
  );

  return (
    <ErrorBoundary
      fallback={EnhancedAsyncErrorFallback}
      onError={handleAsyncError}
      level={level}
      resetOnPropsChange={true}
      resetKeys={[navigator.onLine]}
    >
      {children}
    </ErrorBoundary>
  );
};

export default AsyncErrorBoundary;