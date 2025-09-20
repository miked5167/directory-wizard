'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

export interface LoadingState {
  isLoading: boolean;
  message?: string;
  progress?: number;
  error?: string;
}

export interface UseLoadingOptions {
  initialLoading?: boolean;
  initialMessage?: string;
  timeout?: number;
  onTimeout?: () => void;
}

export interface UseLoadingReturn {
  loading: LoadingState;
  startLoading: (message?: string) => void;
  stopLoading: () => void;
  setProgress: (progress: number) => void;
  setMessage: (message: string) => void;
  setError: (error: string) => void;
  clearError: () => void;
  withLoading: <T extends any[], R>(
    fn: (...args: T) => Promise<R>,
    message?: string
  ) => (...args: T) => Promise<R>;
}

export const useLoading = (options: UseLoadingOptions = {}): UseLoadingReturn => {
  const {
    initialLoading = false,
    initialMessage,
    timeout,
    onTimeout,
  } = options;

  const [loading, setLoading] = useState<LoadingState>({
    isLoading: initialLoading,
    message: initialMessage,
    progress: undefined,
    error: undefined,
  });

  const timeoutRef = useRef<NodeJS.Timeout>();

  const startLoading = useCallback((message?: string) => {
    setLoading(prev => ({
      ...prev,
      isLoading: true,
      message: message || prev.message,
      error: undefined,
    }));

    // Set timeout if provided
    if (timeout && timeout > 0) {
      timeoutRef.current = setTimeout(() => {
        setLoading(prev => ({
          ...prev,
          isLoading: false,
          error: 'Operation timed out',
        }));
        onTimeout?.();
      }, timeout);
    }
  }, [timeout, onTimeout]);

  const stopLoading = useCallback(() => {
    setLoading(prev => ({
      ...prev,
      isLoading: false,
      progress: undefined,
    }));

    // Clear timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = undefined;
    }
  }, []);

  const setProgress = useCallback((progress: number) => {
    setLoading(prev => ({
      ...prev,
      progress: Math.max(0, Math.min(100, progress)),
    }));
  }, []);

  const setMessage = useCallback((message: string) => {
    setLoading(prev => ({
      ...prev,
      message,
    }));
  }, []);

  const setError = useCallback((error: string) => {
    setLoading(prev => ({
      ...prev,
      isLoading: false,
      error,
      progress: undefined,
    }));

    // Clear timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = undefined;
    }
  }, []);

  const clearError = useCallback(() => {
    setLoading(prev => ({
      ...prev,
      error: undefined,
    }));
  }, []);

  const withLoading = useCallback(<T extends any[], R>(
    fn: (...args: T) => Promise<R>,
    message?: string
  ) => {
    return async (...args: T): Promise<R> => {
      try {
        startLoading(message);
        const result = await fn(...args);
        stopLoading();
        return result;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'An error occurred';
        setError(errorMessage);
        throw error;
      }
    };
  }, [startLoading, stopLoading, setError]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    loading,
    startLoading,
    stopLoading,
    setProgress,
    setMessage,
    setError,
    clearError,
    withLoading,
  };
};

// Hook for managing multiple loading states
export interface UseMultiLoadingReturn {
  loadingStates: Record<string, LoadingState>;
  startLoading: (key: string, message?: string) => void;
  stopLoading: (key: string) => void;
  setProgress: (key: string, progress: number) => void;
  setMessage: (key: string, message: string) => void;
  setError: (key: string, error: string) => void;
  clearError: (key: string) => void;
  isAnyLoading: boolean;
  withLoading: <T extends any[], R>(
    key: string,
    fn: (...args: T) => Promise<R>,
    message?: string
  ) => (...args: T) => Promise<R>;
}

export const useMultiLoading = (): UseMultiLoadingReturn => {
  const [loadingStates, setLoadingStates] = useState<Record<string, LoadingState>>({});

  const updateLoadingState = useCallback((key: string, updates: Partial<LoadingState>) => {
    setLoadingStates(prev => ({
      ...prev,
      [key]: {
        isLoading: false,
        ...prev[key],
        ...updates,
      },
    }));
  }, []);

  const startLoading = useCallback((key: string, message?: string) => {
    updateLoadingState(key, {
      isLoading: true,
      message,
      error: undefined,
    });
  }, [updateLoadingState]);

  const stopLoading = useCallback((key: string) => {
    updateLoadingState(key, {
      isLoading: false,
      progress: undefined,
    });
  }, [updateLoadingState]);

  const setProgress = useCallback((key: string, progress: number) => {
    updateLoadingState(key, {
      progress: Math.max(0, Math.min(100, progress)),
    });
  }, [updateLoadingState]);

  const setMessage = useCallback((key: string, message: string) => {
    updateLoadingState(key, { message });
  }, [updateLoadingState]);

  const setError = useCallback((key: string, error: string) => {
    updateLoadingState(key, {
      isLoading: false,
      error,
      progress: undefined,
    });
  }, [updateLoadingState]);

  const clearError = useCallback((key: string) => {
    updateLoadingState(key, { error: undefined });
  }, [updateLoadingState]);

  const isAnyLoading = Object.values(loadingStates).some(state => state.isLoading);

  const withLoading = useCallback(<T extends any[], R>(
    key: string,
    fn: (...args: T) => Promise<R>,
    message?: string
  ) => {
    return async (...args: T): Promise<R> => {
      try {
        startLoading(key, message);
        const result = await fn(...args);
        stopLoading(key);
        return result;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'An error occurred';
        setError(key, errorMessage);
        throw error;
      }
    };
  }, [startLoading, stopLoading, setError]);

  return {
    loadingStates,
    startLoading,
    stopLoading,
    setProgress,
    setMessage,
    setError,
    clearError,
    isAnyLoading,
    withLoading,
  };
};

export default useLoading;