'use client';

import React from 'react';
import ErrorBoundary, { ErrorFallbackProps } from './ErrorBoundary';

// Application-level error fallback
const AppErrorFallback: React.FC<ErrorFallbackProps> = ({
  error,
  errorId,
  resetError,
}) => {
  const handleReload = () => {
    window.location.reload();
  };

  const handleGoHome = () => {
    window.location.href = '/';
  };

  const handleReportCriticalIssue = () => {
    const subject = encodeURIComponent(`Critical Application Error: ${error.message}`);
    const body = encodeURIComponent(
      `CRITICAL ERROR REPORT\n\n` +
      `Error ID: ${errorId}\n` +
      `Error Message: ${error.message}\n` +
      `Stack Trace: ${error.stack}\n` +
      `User Agent: ${navigator.userAgent}\n` +
      `Page URL: ${window.location.href}\n` +
      `Timestamp: ${new Date().toISOString()}\n\n` +
      `This is a critical application error that prevented the app from working.`
    );

    window.open(`mailto:critical-errors@directoryplatform.com?subject=${subject}&body=${body}`);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4" data-testid="app-error-boundary">
      <div className="max-w-lg w-full">
        <div className="bg-white rounded-lg shadow-xl border border-gray-200 p-8">
          {/* Critical Error Icon */}
          <div className="flex justify-center mb-6">
            <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center">
              <svg
                className="w-12 h-12 text-red-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                data-testid="app-error-icon"
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
          <h1 className="text-2xl font-bold text-gray-900 text-center mb-4">
            Application Error
          </h1>

          {/* Error Message */}
          <p className="text-gray-600 text-center mb-6">
            The Directory Wizard application has encountered a critical error and cannot continue.
            This is likely a temporary issue with our service.
          </p>

          {/* Critical Error Alert */}
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">
                  Critical System Error
                </h3>
                <div className="mt-1 text-sm text-red-700">
                  <p>
                    The application core has failed. This error has been automatically reported to our development team.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Recovery Instructions */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h3 className="text-sm font-medium text-blue-800 mb-2">
              Immediate Steps:
            </h3>
            <ol className="list-decimal list-inside text-sm text-blue-700 space-y-1">
              <li>Try reloading the page</li>
              <li>Clear your browser cache and cookies</li>
              <li>Try using a different browser</li>
              <li>Check our status page for known issues</li>
              <li>Contact support if the problem persists</li>
            </ol>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <button
              onClick={handleReload}
              className="w-full bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 transition-colors font-medium"
              data-testid="reload-app"
            >
              Reload Application
            </button>

            <button
              onClick={resetError}
              className="w-full bg-gray-600 text-white px-6 py-3 rounded-md hover:bg-gray-700 transition-colors font-medium"
              data-testid="retry-app"
            >
              Try to Recover
            </button>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handleGoHome}
                className="border border-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-50 transition-colors font-medium text-sm"
                data-testid="go-home"
              >
                Go to Home
              </button>

              <a
                href="https://status.directoryplatform.com"
                target="_blank"
                rel="noopener noreferrer"
                className="border border-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-50 transition-colors font-medium text-sm text-center"
                data-testid="status-page"
              >
                Status Page
              </a>
            </div>

            <button
              onClick={handleReportCriticalIssue}
              className="w-full border-2 border-red-300 text-red-700 px-6 py-3 rounded-md hover:bg-red-50 transition-colors font-medium"
              data-testid="report-critical-issue"
            >
              Report Critical Issue
            </button>
          </div>

          {/* Support Information */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h4 className="text-sm font-medium text-gray-900 mb-3">Need Immediate Help?</h4>
            <div className="grid grid-cols-1 gap-2 text-sm">
              <a
                href="mailto:emergency@directoryplatform.com"
                className="text-red-600 hover:text-red-500 font-medium"
              >
                📧 Emergency Support Email
              </a>
              <a
                href="tel:+1-800-DIR-HELP"
                className="text-blue-600 hover:text-blue-500 font-medium"
              >
                📞 Emergency Support Hotline
              </a>
              <a
                href="/help/emergency"
                className="text-green-600 hover:text-green-500 font-medium"
              >
                🆘 Emergency Help Center
              </a>
            </div>
          </div>

          {/* Error ID for Support */}
          <div className="mt-6 pt-4 border-t border-gray-200">
            <p className="text-xs text-gray-500 text-center">
              Critical Error ID: <span className="font-mono font-bold" data-testid="app-error-id">{errorId}</span>
            </p>
            <p className="text-xs text-gray-400 text-center mt-1">
              This ID has been automatically reported. Please include it when contacting support.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

// App-level error boundary component
interface AppErrorBoundaryProps {
  children: React.ReactNode;
  onError?: (error: Error, errorInfo: any, errorId: string) => void;
}

const AppErrorBoundary: React.FC<AppErrorBoundaryProps> = ({
  children,
  onError,
}) => {
  const handleAppError = (error: Error, errorInfo: any, errorId: string) => {
    // Log critical app error details
    console.error('CRITICAL APP ERROR:', {
      error: error.message,
      stack: error.stack,
      errorId,
      componentStack: errorInfo.componentStack,
      userAgent: navigator.userAgent,
      url: window.location.href,
      timestamp: new Date().toISOString(),
      localStorage: Object.keys(localStorage),
      sessionStorage: Object.keys(sessionStorage),
    });

    // Call custom error handler if provided
    if (onError) {
      onError(error, errorInfo, errorId);
    }

    // Report critical error immediately to monitoring service
    try {
      // In a real app, this would send to Sentry, DataDog, etc.
      const criticalError = {
        errorId,
        level: 'CRITICAL',
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        userAgent: navigator.userAgent,
        url: window.location.href,
        timestamp: new Date().toISOString(),
      };

      // Store critical error
      const criticalErrors = JSON.parse(localStorage.getItem('critical_errors') || '[]');
      criticalErrors.push(criticalError);
      // Keep only last 3 critical errors
      if (criticalErrors.length > 3) {
        criticalErrors.splice(0, criticalErrors.length - 3);
      }
      localStorage.setItem('critical_errors', JSON.stringify(criticalErrors));

      // Send to monitoring service (mock)
      fetch('/api/errors/critical', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(criticalError),
      }).catch(e => {
        console.error('Failed to report critical error to monitoring service:', e);
      });
    } catch (e) {
      console.error('Failed to store critical error:', e);
    }
  };

  return (
    <ErrorBoundary
      fallback={AppErrorFallback}
      onError={handleAppError}
      level="app"
      resetOnPropsChange={false}
    >
      {children}
    </ErrorBoundary>
  );
};

export default AppErrorBoundary;