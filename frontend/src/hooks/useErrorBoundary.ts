'use client';

import { useState, useCallback } from 'react';

/**
 * Hook for manually triggering error boundaries from functional components
 * Useful for handling async errors, validation errors, or other errors
 * that occur outside the React render cycle
 */
export const useErrorBoundary = () => {
  const [, setError] = useState();

  return useCallback((error: Error | string) => {
    setError(() => {
      // If error is a string, convert it to an Error object
      const errorObject = typeof error === 'string' ? new Error(error) : error;

      // Add some context to help with debugging
      errorObject.name = errorObject.name || 'ManualError';

      // Throw the error to trigger the nearest error boundary
      throw errorObject;
    });
  }, []);
};

/**
 * Hook for handling async operations with automatic error boundary triggering
 * Wraps async functions to automatically catch and re-throw errors to error boundaries
 */
export const useAsyncErrorHandler = () => {
  const throwError = useErrorBoundary();

  return useCallback(<T extends (...args: any[]) => Promise<any>>(
    asyncFn: T,
    options?: {
      retries?: number;
      retryDelay?: number;
      onRetry?: (attempt: number, error: Error) => void;
      onError?: (error: Error) => void;
    }
  ) => {
    const { retries = 0, retryDelay = 1000, onRetry, onError } = options || {};

    return async (...args: Parameters<T>): Promise<Awaited<ReturnType<T>>> => {
      let lastError: Error;

      for (let attempt = 0; attempt <= retries; attempt++) {
        try {
          return await asyncFn(...args);
        } catch (error) {
          lastError = error instanceof Error ? error : new Error(String(error));

          if (attempt < retries) {
            // Call retry callback if provided
            if (onRetry) {
              onRetry(attempt + 1, lastError);
            }

            // Wait before retrying
            if (retryDelay > 0) {
              await new Promise(resolve => setTimeout(resolve, retryDelay));
            }
          }
        }
      }

      // All retries exhausted, handle the error
      if (onError) {
        onError(lastError);
      }

      // Throw to error boundary
      throwError(lastError);

      // This line should never be reached, but TypeScript needs it
      throw lastError;
    };
  }, [throwError]);
};

/**
 * Hook for handling form submission errors
 * Provides utilities for form-specific error handling
 */
export const useFormErrorHandler = () => {
  const throwError = useErrorBoundary();

  const handleSubmissionError = useCallback((error: Error | unknown, formData?: FormData | object) => {
    let errorMessage = 'Form submission failed';
    let errorObject: Error;

    if (error instanceof Error) {
      errorObject = error;
    } else {
      errorObject = new Error(errorMessage);
    }

    // Add form context to error
    errorObject.name = 'FormSubmissionError';

    // In development, attach form data for debugging
    if (process.env.NODE_ENV === 'development' && formData) {
      (errorObject as any).formData = formData instanceof FormData
        ? Object.fromEntries(formData.entries())
        : formData;
    }

    throwError(errorObject);
  }, [throwError]);

  const handleValidationError = useCallback((validationErrors: Record<string, string>, formData?: object) => {
    const error = new Error('Form validation failed');
    error.name = 'FormValidationError';

    // Attach validation details
    (error as any).validationErrors = validationErrors;

    if (process.env.NODE_ENV === 'development' && formData) {
      (error as any).formData = formData;
    }

    throwError(error);
  }, [throwError]);

  return {
    handleSubmissionError,
    handleValidationError,
  };
};

/**
 * Hook for handling network/API errors
 * Provides utilities for network-specific error handling
 */
export const useNetworkErrorHandler = () => {
  const throwError = useErrorBoundary();

  const handleFetchError = useCallback(async (response: Response, request?: RequestInfo) => {
    let errorMessage = `HTTP ${response.status}: ${response.statusText}`;

    try {
      // Try to extract error details from response body
      const errorData = await response.json();
      if (errorData.message) {
        errorMessage = errorData.message;
      }
    } catch {
      // If response body is not JSON, use status text
    }

    const error = new Error(errorMessage);
    error.name = 'NetworkError';

    // Add response details
    (error as any).status = response.status;
    (error as any).statusText = response.statusText;
    (error as any).url = response.url;

    if (request) {
      (error as any).request = typeof request === 'string' ? request : request.toString();
    }

    throwError(error);
  }, [throwError]);

  const handleNetworkError = useCallback((error: Error, url?: string) => {
    const networkError = new Error(`Network request failed: ${error.message}`);
    networkError.name = 'NetworkError';
    networkError.stack = error.stack;

    if (url) {
      (networkError as any).url = url;
    }

    // Check if it's an offline error
    if (!navigator.onLine) {
      networkError.message = 'Network request failed: You appear to be offline';
      (networkError as any).offline = true;
    }

    throwError(networkError);
  }, [throwError]);

  return {
    handleFetchError,
    handleNetworkError,
  };
};

/**
 * Hook for creating error boundary reset functions
 * Useful for providing custom reset logic
 */
export const useErrorBoundaryReset = (resetKeys?: any[]) => {
  const [resetCount, setResetCount] = useState(0);

  const resetError = useCallback(() => {
    setResetCount(count => count + 1);
  }, []);

  return {
    resetError,
    resetCount,
    resetKeys: resetKeys ? [...resetKeys, resetCount] : [resetCount],
  };
};

export default useErrorBoundary;