'use client';

import React from 'react';
import { useRouter } from 'next/router';
import ErrorBoundary, { ErrorFallbackProps } from './ErrorBoundary';

// Specialized error fallback for claim components
const ClaimErrorFallback: React.FC<ErrorFallbackProps> = ({
  error,
  errorId,
  resetError,
}) => {
  const handleGoToListings = () => {
    window.location.href = '/listings';
  };

  const handleGoToDashboard = () => {
    window.location.href = '/dashboard/claims';
  };

  const handleContactSupport = () => {
    const subject = encodeURIComponent(`Claim Error Report: ${error.message}`);
    const body = encodeURIComponent(
      `I encountered an error while working with business claims.\n\n` +
      `Error ID: ${errorId}\n` +
      `Error Message: ${error.message}\n` +
      `Page URL: ${window.location.href}\n` +
      `Timestamp: ${new Date().toISOString()}\n\n` +
      `Please help me resolve this issue.`
    );

    window.open(`mailto:support@directoryplatform.com?subject=${subject}&body=${body}`);
  };

  return (
    <div className="min-h-96 bg-gray-50 flex items-center justify-center px-4" data-testid="claim-error-boundary">
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
                data-testid="claim-error-icon"
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
            Claim Processing Error
          </h2>

          {/* Error Message */}
          <p className="text-gray-600 text-center mb-4">
            We encountered an issue while processing your business claim.
            This might be a temporary problem with our servers.
          </p>

          {/* Error Context */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800">
                  What you can do:
                </h3>
                <div className="mt-1 text-sm text-blue-700">
                  <ul className="list-disc list-inside space-y-1">
                    <li>Try submitting your claim again</li>
                    <li>Check your internet connection</li>
                    <li>Refresh the page and try again</li>
                    <li>Contact support if the problem persists</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <button
              onClick={resetError}
              className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors font-medium"
              data-testid="retry-claim"
            >
              Try Again
            </button>

            <button
              onClick={handleGoToDashboard}
              className="w-full bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition-colors font-medium"
              data-testid="go-to-claims-dashboard"
            >
              Go to Claims Dashboard
            </button>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handleGoToListings}
                className="border border-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-50 transition-colors font-medium text-sm"
                data-testid="browse-listings"
              >
                Browse Listings
              </button>

              <button
                onClick={handleContactSupport}
                className="border border-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-50 transition-colors font-medium text-sm"
                data-testid="contact-claim-support"
              >
                Contact Support
              </button>
            </div>
          </div>

          {/* Error ID for Support */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <p className="text-xs text-gray-500 text-center">
              Error ID: <span className="font-mono" data-testid="claim-error-id">{errorId}</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

// Claims-specific error boundary component
interface ClaimErrorBoundaryProps {
  children: React.ReactNode;
  claimId?: string;
  listingId?: string;
  onError?: (error: Error, errorInfo: any, errorId: string) => void;
}

const ClaimErrorBoundary: React.FC<ClaimErrorBoundaryProps> = ({
  children,
  claimId,
  listingId,
  onError,
}) => {
  const handleClaimError = (error: Error, errorInfo: any, errorId: string) => {
    // Log claim-specific error details
    console.error('Claim Error:', {
      error: error.message,
      stack: error.stack,
      errorId,
      claimId,
      listingId,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
    });

    // Call custom error handler if provided
    if (onError) {
      onError(error, errorInfo, errorId);
    }

    // Track claim errors specifically
    try {
      const claimErrors = JSON.parse(localStorage.getItem('claim_errors') || '[]');
      claimErrors.push({
        errorId,
        message: error.message,
        claimId,
        listingId,
        timestamp: new Date().toISOString(),
      });
      // Keep only last 5 claim errors
      if (claimErrors.length > 5) {
        claimErrors.splice(0, claimErrors.length - 5);
      }
      localStorage.setItem('claim_errors', JSON.stringify(claimErrors));
    } catch (e) {
      console.warn('Failed to store claim error:', e);
    }
  };

  return (
    <ErrorBoundary
      fallback={ClaimErrorFallback}
      onError={handleClaimError}
      level="component"
      resetOnPropsChange={true}
      resetKeys={[claimId, listingId]}
    >
      {children}
    </ErrorBoundary>
  );
};

export default ClaimErrorBoundary;