'use client';

import React, { createContext, useContext, ReactNode } from 'react';
import AppErrorBoundary from './AppErrorBoundary';

// Context for error boundary configuration
interface ErrorBoundaryContextType {
  reportError: (error: Error, context?: any) => void;
  isEnabled: boolean;
}

const ErrorBoundaryContext = createContext<ErrorBoundaryContextType | null>(null);

export const useErrorBoundaryContext = () => {
  const context = useContext(ErrorBoundaryContext);
  if (!context) {
    throw new Error('useErrorBoundaryContext must be used within an ErrorBoundaryProvider');
  }
  return context;
};

interface ErrorBoundaryProviderProps {
  children: ReactNode;
  onError?: (error: Error, errorInfo: any, errorId: string) => void;
  isEnabled?: boolean;
}

export const ErrorBoundaryProvider: React.FC<ErrorBoundaryProviderProps> = ({
  children,
  onError,
  isEnabled = true,
}) => {
  const reportError = (error: Error, context?: any) => {
    // Enhanced error reporting with context
    const enhancedError = new Error(error.message);
    enhancedError.name = error.name;
    enhancedError.stack = error.stack;

    // Add context if provided
    if (context) {
      (enhancedError as any).context = context;
    }

    console.error('Manual error report:', {
      error: enhancedError,
      context,
      timestamp: new Date().toISOString(),
    });

    // In a real app, this would send to error monitoring service
    // Sentry.captureException(enhancedError, { extra: context });
  };

  const contextValue: ErrorBoundaryContextType = {
    reportError,
    isEnabled,
  };

  if (!isEnabled) {
    return (
      <ErrorBoundaryContext.Provider value={contextValue}>
        {children}
      </ErrorBoundaryContext.Provider>
    );
  }

  return (
    <ErrorBoundaryContext.Provider value={contextValue}>
      <AppErrorBoundary onError={onError}>
        {children}
      </AppErrorBoundary>
    </ErrorBoundaryContext.Provider>
  );
};