'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';

export interface CustomErrorInfo {
  componentStack: string;
  errorBoundary?: string;
  errorBoundaryStack?: string;
}

export interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: CustomErrorInfo | null;
  errorId: string | null;
}

export interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: React.ComponentType<ErrorFallbackProps>;
  onError?: (error: Error, errorInfo: CustomErrorInfo, errorId: string) => void;
  level?: 'app' | 'page' | 'component';
  resetOnPropsChange?: boolean;
  resetKeys?: Array<string | number>;
}

export interface ErrorFallbackProps {
  error: Error;
  errorInfo: CustomErrorInfo;
  errorId: string;
  resetError: () => void;
  level: 'app' | 'page' | 'component';
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private resetTimeoutId: number | null = null;

  constructor(props: ErrorBoundaryProps) {
    super(props);

    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    // Generate unique error ID for tracking
    const errorId = `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    return {
      hasError: true,
      error,
      errorId,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const errorId = this.state.errorId || `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    this.setState({
      errorInfo,
      errorId,
    });

    // Log error details
    console.error('ErrorBoundary caught an error:', {
      error,
      errorInfo,
      errorId,
      level: this.props.level || 'component',
      timestamp: new Date().toISOString(),
    });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo, errorId);
    }

    // Report to error tracking service (e.g., Sentry, LogRocket)
    this.reportError(error, errorInfo, errorId);
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps) {
    const { resetOnPropsChange, resetKeys } = this.props;
    const { hasError } = this.state;

    // Reset error state if props change and resetOnPropsChange is enabled
    if (hasError && resetOnPropsChange && this.hasResetKeyChanged(prevProps.resetKeys, resetKeys)) {
      this.resetError();
    }
  }

  componentWillUnmount() {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId);
    }
  }

  private hasResetKeyChanged(prevResetKeys?: Array<string | number>, nextResetKeys?: Array<string | number>): boolean {
    if (!prevResetKeys && !nextResetKeys) return false;
    if (!prevResetKeys || !nextResetKeys) return true;
    if (prevResetKeys.length !== nextResetKeys.length) return true;

    return prevResetKeys.some((key, index) => key !== nextResetKeys[index]);
  }

  private reportError = (error: Error, errorInfo: ErrorInfo, errorId: string) => {
    // In a real application, this would send the error to a monitoring service
    const errorReport = {
      errorId,
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      level: this.props.level || 'component',
      timestamp: new Date().toISOString(),
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'unknown',
      url: typeof window !== 'undefined' ? window.location.href : 'unknown',
    };

    // Store in localStorage for development debugging
    try {
      const existingErrors = JSON.parse(localStorage.getItem('error_reports') || '[]');
      existingErrors.push(errorReport);
      // Keep only last 10 errors
      if (existingErrors.length > 10) {
        existingErrors.splice(0, existingErrors.length - 10);
      }
      localStorage.setItem('error_reports', JSON.stringify(existingErrors));
    } catch (e) {
      console.warn('Failed to store error report in localStorage:', e);
    }

    // In production, you would send this to your error reporting service:
    // Sentry.captureException(error, { extra: errorReport });
    // LogRocket.captureException(error);
    // etc.
  };

  resetError = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
    });
  };

  render() {
    if (this.state.hasError && this.state.error && this.state.errorInfo && this.state.errorId) {
      const FallbackComponent = this.props.fallback || DefaultErrorFallback;

      return (
        <FallbackComponent
          error={this.state.error}
          errorInfo={this.state.errorInfo}
          errorId={this.state.errorId}
          resetError={this.resetError}
          level={this.props.level || 'component'}
        />
      );
    }

    return this.props.children;
  }
}

// Default error fallback component
const DefaultErrorFallback: React.FC<ErrorFallbackProps> = ({
  error,
  errorInfo,
  errorId,
  resetError,
  level,
}) => {
  const isDevelopment = process.env.NODE_ENV === 'development';

  const handleReportIssue = () => {
    const subject = encodeURIComponent(`Error Report: ${error.message}`);
    const body = encodeURIComponent(
      `Error ID: ${errorId}\n` +
      `Message: ${error.message}\n` +
      `Level: ${level}\n` +
      `Timestamp: ${new Date().toISOString()}\n` +
      `URL: ${window.location.href}\n\n` +
      `Stack Trace:\n${error.stack}\n\n` +
      `Component Stack:\n${errorInfo.componentStack}`
    );

    // Open email client with pre-filled error report
    window.open(`mailto:support@directoryplatform.com?subject=${subject}&body=${body}`);
  };

  const handleReload = () => {
    window.location.reload();
  };

  return (
    <div
      className={`flex items-center justify-center min-h-screen bg-gray-50 px-4 ${
        level === 'component' ? 'min-h-96' : ''
      }`}
      data-testid="error-boundary-fallback"
      role="alert"
      aria-live="assertive"
    >
      <div className="max-w-md w-full">
        <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6">
          {/* Error Icon */}
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
              <svg
                className="w-8 h-8 text-red-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                data-testid="error-icon"
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
            {level === 'app' ? 'Application Error' :
             level === 'page' ? 'Page Error' :
             'Something went wrong'}
          </h2>

          {/* Error Message */}
          <p className="text-gray-600 text-center mb-4">
            {level === 'app'
              ? 'The application encountered an unexpected error. Please try refreshing the page.'
              : level === 'page'
              ? 'This page failed to load properly. Please try again or navigate back.'
              : 'This component encountered an error. You can try refreshing or continue using other parts of the application.'
            }
          </p>

          {/* Error Details (Development only) */}
          {isDevelopment && (
            <details className="mb-4 p-3 bg-gray-50 rounded text-sm">
              <summary className="cursor-pointer font-medium text-gray-700 mb-2">
                Error Details (Development)
              </summary>
              <div className="space-y-2 text-xs">
                <div>
                  <strong>Error ID:</strong> <code className="bg-gray-200 px-1 rounded">{errorId}</code>
                </div>
                <div>
                  <strong>Message:</strong> <code className="bg-gray-200 px-1 rounded">{error.message}</code>
                </div>
                <div>
                  <strong>Stack:</strong>
                  <pre className="bg-gray-200 p-2 rounded mt-1 overflow-auto max-h-32 text-xs">
                    {error.stack}
                  </pre>
                </div>
              </div>
            </details>
          )}

          {/* Action Buttons */}
          <div className="space-y-3">
            <button
              onClick={resetError}
              className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors font-medium"
              data-testid="retry-button"
            >
              Try Again
            </button>

            {level === 'app' || level === 'page' ? (
              <button
                onClick={handleReload}
                className="w-full bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition-colors font-medium"
                data-testid="reload-button"
              >
                Reload Page
              </button>
            ) : (
              <button
                onClick={() => window.history.back()}
                className="w-full bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition-colors font-medium"
                data-testid="go-back-button"
              >
                Go Back
              </button>
            )}

            <button
              onClick={handleReportIssue}
              className="w-full border border-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-50 transition-colors font-medium"
              data-testid="report-issue-button"
            >
              Report Issue
            </button>
          </div>

          {/* Error ID for Support */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <p className="text-xs text-gray-500 text-center">
              Error ID: <span className="font-mono" data-testid="error-id">{errorId}</span>
            </p>
            <p className="text-xs text-gray-400 text-center mt-1">
              Please include this ID when reporting the issue
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ErrorBoundary;