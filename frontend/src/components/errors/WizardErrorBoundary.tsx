'use client';

import React from 'react';
import ErrorBoundary, { ErrorFallbackProps } from './ErrorBoundary';

// Specialized error fallback for wizard components
const WizardErrorFallback: React.FC<ErrorFallbackProps> = ({
  error,
  errorId,
  resetError,
}) => {
  const handleRestartWizard = () => {
    // Clear any wizard state from localStorage/sessionStorage
    try {
      localStorage.removeItem('wizard_progress');
      sessionStorage.removeItem('wizard_step');
      sessionStorage.removeItem('wizard_data');
    } catch (e) {
      console.warn('Failed to clear wizard state:', e);
    }

    // Navigate back to wizard start
    window.location.href = '/wizard';
  };

  const handleGoToDashboard = () => {
    window.location.href = '/dashboard';
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4" data-testid="wizard-error-boundary">
      <div className="max-w-lg w-full">
        <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-8">
          {/* Error Icon */}
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center">
              <svg
                className="w-10 h-10 text-red-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                data-testid="wizard-error-icon"
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
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-4">
            Wizard Error
          </h2>

          {/* Error Message */}
          <p className="text-gray-600 text-center mb-6">
            The directory creation wizard encountered an unexpected error.
            Your progress may have been saved, but we recommend starting fresh to ensure everything works correctly.
          </p>

          {/* Error Context */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-amber-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-amber-800">
                  What happened?
                </h3>
                <div className="mt-1 text-sm text-amber-700">
                  <p>
                    The wizard step you were on encountered a technical issue. This could be due to:
                  </p>
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>Network connectivity problems</li>
                    <li>Invalid data format in uploaded files</li>
                    <li>Server communication issues</li>
                    <li>Browser compatibility problems</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <button
              onClick={resetError}
              className="w-full bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 transition-colors font-medium"
              data-testid="retry-wizard-step"
            >
              Try Current Step Again
            </button>

            <button
              onClick={handleRestartWizard}
              className="w-full bg-gray-600 text-white px-6 py-3 rounded-md hover:bg-gray-700 transition-colors font-medium"
              data-testid="restart-wizard"
            >
              Restart Wizard from Beginning
            </button>

            <button
              onClick={handleGoToDashboard}
              className="w-full border border-gray-300 text-gray-700 px-6 py-3 rounded-md hover:bg-gray-50 transition-colors font-medium"
              data-testid="go-to-dashboard"
            >
              Go to Dashboard
            </button>
          </div>

          {/* Help Section */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h4 className="text-sm font-medium text-gray-900 mb-3">Need Help?</h4>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <a
                href="/help/wizard-guide"
                className="text-blue-600 hover:text-blue-500 underline"
              >
                Wizard Guide
              </a>
              <a
                href="/help/troubleshooting"
                className="text-blue-600 hover:text-blue-500 underline"
              >
                Troubleshooting
              </a>
              <a
                href="/support"
                className="text-blue-600 hover:text-blue-500 underline"
              >
                Contact Support
              </a>
              <a
                href="/help/faq"
                className="text-blue-600 hover:text-blue-500 underline"
              >
                FAQ
              </a>
            </div>
          </div>

          {/* Error ID for Support */}
          <div className="mt-6 pt-4 border-t border-gray-200">
            <p className="text-xs text-gray-500 text-center">
              Error ID: <span className="font-mono" data-testid="wizard-error-id">{errorId}</span>
            </p>
            <p className="text-xs text-gray-400 text-center mt-1">
              Please include this ID when contacting support
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

// Wizard-specific error boundary component
interface WizardErrorBoundaryProps {
  children: React.ReactNode;
  onError?: (error: Error, errorInfo: any, errorId: string) => void;
}

const WizardErrorBoundary: React.FC<WizardErrorBoundaryProps> = ({
  children,
  onError,
}) => {
  const handleWizardError = (error: Error, errorInfo: any, errorId: string) => {
    // Log wizard-specific error details
    console.error('Wizard Error:', {
      error: error.message,
      stack: error.stack,
      errorId,
      currentStep: sessionStorage.getItem('wizard_step'),
      wizardData: sessionStorage.getItem('wizard_data'),
      timestamp: new Date().toISOString(),
    });

    // Call custom error handler if provided
    if (onError) {
      onError(error, errorInfo, errorId);
    }

    // Track wizard errors specifically
    try {
      const wizardErrors = JSON.parse(localStorage.getItem('wizard_errors') || '[]');
      wizardErrors.push({
        errorId,
        message: error.message,
        step: sessionStorage.getItem('wizard_step'),
        timestamp: new Date().toISOString(),
      });
      // Keep only last 5 wizard errors
      if (wizardErrors.length > 5) {
        wizardErrors.splice(0, wizardErrors.length - 5);
      }
      localStorage.setItem('wizard_errors', JSON.stringify(wizardErrors));
    } catch (e) {
      console.warn('Failed to store wizard error:', e);
    }
  };

  return (
    <ErrorBoundary
      fallback={WizardErrorFallback}
      onError={handleWizardError}
      level="page"
      resetOnPropsChange={true}
      resetKeys={[sessionStorage.getItem('wizard_step')]}
    >
      {children}
    </ErrorBoundary>
  );
};

export default WizardErrorBoundary;