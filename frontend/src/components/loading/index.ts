// Loading Components
export { default as LoadingSpinner } from './LoadingSpinner';
export { default as ProgressBar } from './ProgressBar';
export { default as WizardProgress } from './WizardProgress';
export { default as LoadingOverlay } from './LoadingOverlay';
export { default as SkeletonLoader, SkeletonCard, SkeletonList, SkeletonTable, SkeletonForm } from './SkeletonLoader';
export { default as FileUploadProgress } from './FileUploadProgress';

// Loading Types
export type {
  LoadingSpinnerProps,
} from './LoadingSpinner';

export type {
  ProgressBarProps,
} from './ProgressBar';

export type {
  WizardStep,
  WizardProgressProps,
} from './WizardProgress';

export type {
  LoadingOverlayProps,
} from './LoadingOverlay';

export type {
  SkeletonLoaderProps,
} from './SkeletonLoader';

export type {
  FileUploadProgressProps,
} from './FileUploadProgress';

// Loading Hooks
export {
  default as useLoading,
  useMultiLoading,
} from '../hooks/useLoading';

export {
  default as useFileUpload,
} from '../hooks/useFileUpload';

export type {
  LoadingState,
  UseLoadingOptions,
  UseLoadingReturn,
  UseMultiLoadingReturn,
} from '../hooks/useLoading';

export type {
  UploadProgress,
  FileUploadState,
  UseFileUploadOptions,
  UseFileUploadReturn,
} from '../hooks/useFileUpload';

// Utility functions for loading states
export const createLoadingState = (isLoading: boolean = false, message?: string): LoadingState => ({
  isLoading,
  message,
  progress: undefined,
  error: undefined,
});

export const createWizardStep = (
  id: string,
  title: string,
  status: 'pending' | 'current' | 'completed' | 'error' = 'pending',
  description?: string,
  optional?: boolean
): WizardStep => ({
  id,
  title,
  description,
  status,
  optional,
});

// Higher-order components for loading states
export const withLoadingState = <P extends object>(
  Component: React.ComponentType<P>,
  loadingComponent?: React.ComponentType<any>
) => {
  const WrappedComponent = (props: P & { isLoading?: boolean; loadingMessage?: string }) => {
    const { isLoading, loadingMessage, ...componentProps } = props;

    if (isLoading) {
      const LoadingComponent = loadingComponent || SkeletonLoader;
      return <LoadingComponent message={loadingMessage} />;
    }

    return <Component {...(componentProps as P)} />;
  };

  WrappedComponent.displayName = `withLoadingState(${Component.displayName || Component.name})`;

  return WrappedComponent;
};

// Loading state constants
export const LOADING_MESSAGES = {
  UPLOADING_FILE: 'Uploading file...',
  PROCESSING_DATA: 'Processing data...',
  SAVING_CHANGES: 'Saving changes...',
  LOADING_CONTENT: 'Loading content...',
  SUBMITTING_FORM: 'Submitting form...',
  GENERATING_PREVIEW: 'Generating preview...',
  VALIDATING_DATA: 'Validating data...',
  CREATING_DIRECTORY: 'Creating directory...',
  PUBLISHING_SITE: 'Publishing site...',
  VERIFYING_CLAIM: 'Verifying claim...',
} as const;

export const LOADING_TIMEOUTS = {
  SHORT: 5000,    // 5 seconds
  MEDIUM: 15000,  // 15 seconds
  LONG: 30000,    // 30 seconds
  VERY_LONG: 60000, // 1 minute
} as const;