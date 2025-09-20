// Error Boundary Components
export { default as ErrorBoundary } from './ErrorBoundary';
export { default as AppErrorBoundary } from './AppErrorBoundary';
export { default as WizardErrorBoundary } from './WizardErrorBoundary';
export { default as ClaimErrorBoundary } from './ClaimErrorBoundary';
export { default as AsyncErrorBoundary, useAsyncError } from './AsyncErrorBoundary';

// Error Boundary Types
export type {
  ErrorFallbackProps,
  ErrorBoundaryProps,
  ErrorBoundaryState,
} from './ErrorBoundary';

// Error Boundary Hooks
export {
  default as useErrorBoundary,
  useAsyncErrorHandler,
  useFormErrorHandler,
  useNetworkErrorHandler,
  useErrorBoundaryReset,
} from '../hooks/useErrorBoundary';

// Re-export hook from hooks directory for convenience
export { default as useErrorBoundaryHook } from '../hooks/useErrorBoundary';

// Utility function to wrap components with appropriate error boundaries
export const withErrorBoundary = (
  Component: React.ComponentType<any>,
  errorBoundaryProps?: {
    level?: 'app' | 'page' | 'component';
    fallback?: React.ComponentType<any>;
    onError?: (error: Error, errorInfo: any, errorId: string) => void;
  }
) => {
  const WrappedComponent = (props: any) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;

  return WrappedComponent;
};

// Higher-order component for async error boundaries
export const withAsyncErrorBoundary = (
  Component: React.ComponentType<any>,
  level: 'app' | 'page' | 'component' = 'component'
) => {
  const WrappedComponent = (props: any) => (
    <AsyncErrorBoundary level={level}>
      <Component {...props} />
    </AsyncErrorBoundary>
  );

  WrappedComponent.displayName = `withAsyncErrorBoundary(${Component.displayName || Component.name})`;

  return WrappedComponent;
};

// HOC for wizard components
export const withWizardErrorBoundary = (Component: React.ComponentType<any>) => {
  const WrappedComponent = (props: any) => (
    <WizardErrorBoundary>
      <Component {...props} />
    </WizardErrorBoundary>
  );

  WrappedComponent.displayName = `withWizardErrorBoundary(${Component.displayName || Component.name})`;

  return WrappedComponent;
};

// HOC for claim components
export const withClaimErrorBoundary = (
  Component: React.ComponentType<any>,
  defaultProps?: { claimId?: string; listingId?: string }
) => {
  const WrappedComponent = (props: any) => (
    <ClaimErrorBoundary {...defaultProps} {...props}>
      <Component {...props} />
    </ClaimErrorBoundary>
  );

  WrappedComponent.displayName = `withClaimErrorBoundary(${Component.displayName || Component.name})`;

  return WrappedComponent;
};