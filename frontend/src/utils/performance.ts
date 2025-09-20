'use client';

import { useMemo, useRef, useEffect, useCallback, useState } from 'react';

// Debounce utility for performance optimization
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// Throttle utility for scroll events and similar
export function useThrottle<T extends (...args: any[]) => void>(
  callback: T,
  delay: number
): T {
  const lastCall = useRef<number>(0);
  const timeoutRef = useRef<NodeJS.Timeout>();

  return useCallback((...args: Parameters<T>) => {
    const now = Date.now();

    if (now - lastCall.current >= delay) {
      lastCall.current = now;
      callback(...args);
    } else {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        lastCall.current = Date.now();
        callback(...args);
      }, delay - (now - lastCall.current));
    }
  }, [callback, delay]) as T;
}

// Memoized computation hook
export function useMemoizedComputation<T>(
  computation: () => T,
  dependencies: React.DependencyList
): T {
  return useMemo(computation, dependencies);
}

// Previous value hook for comparison
export function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T>();

  useEffect(() => {
    ref.current = value;
  }, [value]);

  return ref.current;
}

// Component update reason debugging (development only)
export function useWhyDidYouUpdate(name: string, props: Record<string, any>) {
  if (process.env.NODE_ENV !== 'development') return;

  const previous = useRef<Record<string, any>>();

  useEffect(() => {
    if (previous.current) {
      const allKeys = Object.keys({ ...previous.current, ...props });
      const changes: Record<string, { from: any; to: any }> = {};

      allKeys.forEach(key => {
        if (previous.current![key] !== props[key]) {
          changes[key] = {
            from: previous.current![key],
            to: props[key],
          };
        }
      });

      if (Object.keys(changes).length) {
        console.log('[WhyDidYouUpdate]', name, changes);
      }
    }

    previous.current = props;
  });
}

// Intersection Observer hook for lazy loading
export function useIntersectionObserver(
  options: IntersectionObserverInit = {}
): [React.RefCallback<Element>, boolean] {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const [element, setElement] = useState<Element | null>(null);

  const callbackRef = useCallback((node: Element | null) => {
    setElement(node);
  }, []);

  useEffect(() => {
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsIntersecting(entry.isIntersecting);
      },
      options
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [element, options]);

  return [callbackRef, isIntersecting];
}

// Bundle size optimization utilities
export const loadComponent = async (importFn: () => Promise<{ default: React.ComponentType<any> }>) => {
  try {
    const module = await importFn();
    return module.default;
  } catch (error) {
    console.error('Failed to load component:', error);
    throw error;
  }
};

// Memory usage monitoring (development only)
export function useMemoryMonitor(name: string) {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return;

    const checkMemory = () => {
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        console.log(`[Memory] ${name}:`, {
          used: Math.round(memory.usedJSHeapSize / 1024 / 1024) + ' MB',
          total: Math.round(memory.totalJSHeapSize / 1024 / 1024) + ' MB',
          limit: Math.round(memory.jsHeapSizeLimit / 1024 / 1024) + ' MB',
        });
      }
    };

    const interval = setInterval(checkMemory, 5000); // Check every 5 seconds

    return () => {
      clearInterval(interval);
    };
  }, [name]);
}

// Performance measurement hook
export function usePerformanceMeasure(name: string, enabled: boolean = true) {
  const startTime = useRef<number>();

  const start = useCallback(() => {
    if (!enabled || process.env.NODE_ENV !== 'development') return;
    startTime.current = performance.now();
  }, [enabled]);

  const end = useCallback((operation?: string) => {
    if (!enabled || process.env.NODE_ENV !== 'development' || !startTime.current) return;

    const endTime = performance.now();
    const duration = endTime - startTime.current;
    const label = operation ? `${name} - ${operation}` : name;

    console.log(`[Performance] ${label}: ${duration.toFixed(2)}ms`);
    startTime.current = undefined;
  }, [enabled, name]);

  return { start, end };
}

// Local storage with size limit
export class LimitedLocalStorage {
  private maxSize: number;
  private keyPrefix: string;

  constructor(maxSize: number = 5 * 1024 * 1024, keyPrefix: string = 'app_') {
    this.maxSize = maxSize;
    this.keyPrefix = keyPrefix;
  }

  setItem(key: string, value: string): boolean {
    const fullKey = this.keyPrefix + key;
    const item = {
      value,
      timestamp: Date.now(),
      size: new Blob([value]).size,
    };

    const serialized = JSON.stringify(item);

    if (serialized.length > this.maxSize) {
      console.warn('Item too large for limited storage:', key);
      return false;
    }

    // Check total size and clean up if necessary
    this.cleanup();

    try {
      localStorage.setItem(fullKey, serialized);
      return true;
    } catch (error) {
      console.error('Failed to store item:', error);
      this.cleanup(true); // Force cleanup
      try {
        localStorage.setItem(fullKey, serialized);
        return true;
      } catch {
        return false;
      }
    }
  }

  getItem(key: string): string | null {
    const fullKey = this.keyPrefix + key;
    try {
      const stored = localStorage.getItem(fullKey);
      if (!stored) return null;

      const item = JSON.parse(stored);
      return item.value;
    } catch {
      localStorage.removeItem(fullKey);
      return null;
    }
  }

  removeItem(key: string): void {
    const fullKey = this.keyPrefix + key;
    localStorage.removeItem(fullKey);
  }

  private cleanup(force: boolean = false): void {
    const items: { key: string; timestamp: number; size: number }[] = [];
    let totalSize = 0;

    // Collect all items with our prefix
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key?.startsWith(this.keyPrefix)) continue;

      try {
        const stored = localStorage.getItem(key);
        if (!stored) continue;

        const item = JSON.parse(stored);
        items.push({
          key,
          timestamp: item.timestamp,
          size: item.size || stored.length,
        });
        totalSize += item.size || stored.length;
      } catch {
        localStorage.removeItem(key);
      }
    }

    // Remove items if over limit or forced
    if (totalSize > this.maxSize || force) {
      // Sort by timestamp (oldest first)
      items.sort((a, b) => a.timestamp - b.timestamp);

      // Remove oldest items until under limit
      while (totalSize > this.maxSize * 0.8 && items.length > 0) {
        const item = items.shift()!;
        localStorage.removeItem(item.key);
        totalSize -= item.size;
      }
    }
  }
}

// React component optimization utilities
export const OptimizationUtils = {
  // Check if objects are shallowly equal
  shallowEqual: <T extends Record<string, any>>(obj1: T, obj2: T): boolean => {
    const keys1 = Object.keys(obj1);
    const keys2 = Object.keys(obj2);

    if (keys1.length !== keys2.length) return false;

    for (const key of keys1) {
      if (obj1[key] !== obj2[key]) return false;
    }

    return true;
  },

  // Create stable callback references
  useStableCallback: <T extends (...args: any[]) => any>(callback: T): T => {
    const ref = useRef<T>(callback);
    ref.current = callback;

    return useCallback((...args: Parameters<T>) => {
      return ref.current(...args);
    }, []) as T;
  },

  // Memoize expensive calculations
  useMemoWithDeps: <T>(factory: () => T, deps: React.DependencyList): T => {
    return useMemo(factory, deps);
  },
};

export default {
  useDebounce,
  useThrottle,
  useMemoizedComputation,
  usePrevious,
  useWhyDidYouUpdate,
  useIntersectionObserver,
  loadComponent,
  useMemoryMonitor,
  usePerformanceMeasure,
  LimitedLocalStorage,
  OptimizationUtils,
};