import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import ErrorBoundary, { ErrorFallbackProps } from '../ErrorBoundary';

// Mock console.error to avoid noise in tests
const originalConsoleError = console.error;
beforeEach(() => {
  console.error = vi.fn();
});

afterEach(() => {
  console.error = originalConsoleError;
});

// Test component that throws an error
const ThrowingComponent: React.FC<{ shouldThrow?: boolean; message?: string }> = ({
  shouldThrow = true,
  message = 'Test error',
}) => {
  if (shouldThrow) {
    throw new Error(message);
  }
  return <div data-testid="working-component">Working component</div>;
};

// Custom fallback component for testing
const CustomFallback: React.FC<ErrorFallbackProps> = ({
  error,
  errorId,
  resetError,
  level,
}) => (
  <div data-testid="custom-fallback">
    <h2>Custom Error: {error.message}</h2>
    <p>Error ID: {errorId}</p>
    <p>Level: {level}</p>
    <button onClick={resetError} data-testid="custom-reset">
      Reset
    </button>
  </div>
);

describe('ErrorBoundary', () => {
  it('renders children when there is no error', () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent shouldThrow={false} />
      </ErrorBoundary>
    );

    expect(screen.getByTestId('working-component')).toBeInTheDocument();
  });

  it('renders default error fallback when component throws error', () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent message="Test error message" />
      </ErrorBoundary>
    );

    expect(screen.getByTestId('error-boundary-fallback')).toBeInTheDocument();
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByTestId('retry-button')).toBeInTheDocument();
    expect(screen.getByTestId('error-id')).toBeInTheDocument();
  });

  it('renders custom fallback when provided', () => {
    render(
      <ErrorBoundary fallback={CustomFallback} level="page">
        <ThrowingComponent message="Custom error test" />
      </ErrorBoundary>
    );

    expect(screen.getByTestId('custom-fallback')).toBeInTheDocument();
    expect(screen.getByText('Custom Error: Custom error test')).toBeInTheDocument();
    expect(screen.getByText('Level: page')).toBeInTheDocument();
  });

  it('calls onError callback when error occurs', () => {
    const onError = vi.fn();

    render(
      <ErrorBoundary onError={onError}>
        <ThrowingComponent message="Callback test error" />
      </ErrorBoundary>
    );

    expect(onError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.any(Object),
      expect.any(String)
    );

    const [error, errorInfo, errorId] = onError.mock.calls[0];
    expect(error.message).toBe('Callback test error');
    expect(errorInfo.componentStack).toBeDefined();
    expect(errorId).toMatch(/^error_\d+_[a-z0-9]+$/);
  });

  it('resets error state when reset button is clicked', async () => {
    const TestComponent: React.FC = () => {
      const [shouldThrow, setShouldThrow] = React.useState(true);

      React.useEffect(() => {
        const timer = setTimeout(() => setShouldThrow(false), 100);
        return () => clearTimeout(timer);
      }, []);

      return <ThrowingComponent shouldThrow={shouldThrow} />;
    };

    render(
      <ErrorBoundary>
        <TestComponent />
      </ErrorBoundary>
    );

    // Should show error boundary initially
    expect(screen.getByTestId('error-boundary-fallback')).toBeInTheDocument();

    // Click retry button
    fireEvent.click(screen.getByTestId('retry-button'));

    // Should show working component after reset
    await waitFor(() => {
      expect(screen.getByTestId('working-component')).toBeInTheDocument();
    });
  });

  it('displays different UI based on error level', () => {
    const { rerender } = render(
      <ErrorBoundary level="app">
        <ThrowingComponent />
      </ErrorBoundary>
    );

    expect(screen.getByText('Application Error')).toBeInTheDocument();
    expect(screen.getByTestId('reload-button')).toBeInTheDocument();

    rerender(
      <ErrorBoundary level="page">
        <ThrowingComponent />
      </ErrorBoundary>
    );

    expect(screen.getByText('Page Error')).toBeInTheDocument();

    rerender(
      <ErrorBoundary level="component">
        <ThrowingComponent />
      </ErrorBoundary>
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByTestId('go-back-button')).toBeInTheDocument();
  });

  it('shows error details in development mode', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    render(
      <ErrorBoundary>
        <ThrowingComponent message="Development error" />
      </ErrorBoundary>
    );

    expect(screen.getByText('Error Details (Development)')).toBeInTheDocument();
    expect(screen.getByText('Development error')).toBeInTheDocument();

    process.env.NODE_ENV = originalEnv;
  });

  it('hides error details in production mode', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    render(
      <ErrorBoundary>
        <ThrowingComponent message="Production error" />
      </ErrorBoundary>
    );

    expect(screen.queryByText('Error Details (Development)')).not.toBeInTheDocument();

    process.env.NODE_ENV = originalEnv;
  });

  it('resets on props change when resetOnPropsChange is true', () => {
    const TestWrapper: React.FC<{ resetKey: string }> = ({ resetKey }) => (
      <ErrorBoundary resetOnPropsChange={true} resetKeys={[resetKey]}>
        <ThrowingComponent shouldThrow={resetKey === 'throw'} />
      </ErrorBoundary>
    );

    const { rerender } = render(<TestWrapper resetKey="throw" />);

    // Should show error boundary
    expect(screen.getByTestId('error-boundary-fallback')).toBeInTheDocument();

    // Change props to trigger reset
    rerender(<TestWrapper resetKey="no-throw" />);

    // Should show working component after prop change
    expect(screen.getByTestId('working-component')).toBeInTheDocument();
  });

  it('handles report issue button click', () => {
    // Mock window.open
    const originalOpen = window.open;
    window.open = vi.fn();

    render(
      <ErrorBoundary>
        <ThrowingComponent message="Report test error" />
      </ErrorBoundary>
    );

    fireEvent.click(screen.getByTestId('report-issue-button'));

    expect(window.open).toHaveBeenCalledWith(
      expect.stringContaining('mailto:support@directoryplatform.com')
    );

    window.open = originalOpen;
  });

  it('stores error reports in localStorage', () => {
    // Mock localStorage
    const localStorageMock = {
      getItem: vi.fn().mockReturnValue('[]'),
      setItem: vi.fn(),
    };
    Object.defineProperty(window, 'localStorage', { value: localStorageMock });

    render(
      <ErrorBoundary>
        <ThrowingComponent message="Storage test error" />
      </ErrorBoundary>
    );

    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'error_reports',
      expect.stringContaining('Storage test error')
    );
  });

  it('generates unique error IDs', () => {
    const onError1 = vi.fn();
    const onError2 = vi.fn();

    const { rerender } = render(
      <ErrorBoundary onError={onError1}>
        <ThrowingComponent message="First error" />
      </ErrorBoundary>
    );

    rerender(
      <ErrorBoundary onError={onError2}>
        <ThrowingComponent message="Second error" />
      </ErrorBoundary>
    );

    const errorId1 = onError1.mock.calls[0][2];
    const errorId2 = onError2.mock.calls[0][2];

    expect(errorId1).not.toBe(errorId2);
    expect(errorId1).toMatch(/^error_\d+_[a-z0-9]+$/);
    expect(errorId2).toMatch(/^error_\d+_[a-z0-9]+$/);
  });

  it('handles reload button click', () => {
    // Mock window.location.reload
    const originalReload = window.location.reload;
    window.location.reload = vi.fn();

    render(
      <ErrorBoundary level="app">
        <ThrowingComponent />
      </ErrorBoundary>
    );

    fireEvent.click(screen.getByTestId('reload-button'));

    expect(window.location.reload).toHaveBeenCalled();

    window.location.reload = originalReload;
  });

  it('handles go back button click', () => {
    // Mock window.history.back
    const originalBack = window.history.back;
    window.history.back = vi.fn();

    render(
      <ErrorBoundary level="component">
        <ThrowingComponent />
      </ErrorBoundary>
    );

    fireEvent.click(screen.getByTestId('go-back-button'));

    expect(window.history.back).toHaveBeenCalled();

    window.history.back = originalBack;
  });
});