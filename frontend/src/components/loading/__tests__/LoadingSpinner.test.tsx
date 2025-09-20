import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import LoadingSpinner from '../LoadingSpinner';

describe('LoadingSpinner', () => {
  it('renders with default props', () => {
    render(<LoadingSpinner />);

    const spinner = screen.getByTestId('loading-spinner');
    expect(spinner).toBeInTheDocument();
    expect(spinner).toHaveAttribute('role', 'status');
    expect(spinner).toHaveAttribute('aria-label', 'Loading...');
  });

  it('renders with custom label', () => {
    const customLabel = 'Processing data...';
    render(<LoadingSpinner label={customLabel} />);

    const spinner = screen.getByTestId('loading-spinner');
    expect(spinner).toHaveAttribute('aria-label', customLabel);

    const label = screen.getByTestId('spinner-label');
    expect(label).toHaveTextContent(customLabel);
  });

  it('applies correct size classes', () => {
    const { rerender } = render(<LoadingSpinner size="xs" />);
    let spinnerElement = screen.getByTestId('spinner-element');
    expect(spinnerElement).toHaveClass('w-3', 'h-3');

    rerender(<LoadingSpinner size="sm" />);
    spinnerElement = screen.getByTestId('spinner-element');
    expect(spinnerElement).toHaveClass('w-4', 'h-4');

    rerender(<LoadingSpinner size="md" />);
    spinnerElement = screen.getByTestId('spinner-element');
    expect(spinnerElement).toHaveClass('w-6', 'h-6');

    rerender(<LoadingSpinner size="lg" />);
    spinnerElement = screen.getByTestId('spinner-element');
    expect(spinnerElement).toHaveClass('w-8', 'h-8');

    rerender(<LoadingSpinner size="xl" />);
    spinnerElement = screen.getByTestId('spinner-element');
    expect(spinnerElement).toHaveClass('w-12', 'h-12');
  });

  it('applies correct variant classes', () => {
    const { rerender } = render(<LoadingSpinner variant="primary" />);
    let spinnerElement = screen.getByTestId('spinner-element');
    expect(spinnerElement).toHaveClass('border-blue-600', 'border-t-transparent');

    rerender(<LoadingSpinner variant="secondary" />);
    spinnerElement = screen.getByTestId('spinner-element');
    expect(spinnerElement).toHaveClass('border-gray-600', 'border-t-transparent');

    rerender(<LoadingSpinner variant="success" />);
    spinnerElement = screen.getByTestId('spinner-element');
    expect(spinnerElement).toHaveClass('border-green-600', 'border-t-transparent');

    rerender(<LoadingSpinner variant="warning" />);
    spinnerElement = screen.getByTestId('spinner-element');
    expect(spinnerElement).toHaveClass('border-yellow-600', 'border-t-transparent');

    rerender(<LoadingSpinner variant="error" />);
    spinnerElement = screen.getByTestId('spinner-element');
    expect(spinnerElement).toHaveClass('border-red-600', 'border-t-transparent');

    rerender(<LoadingSpinner variant="white" />);
    spinnerElement = screen.getByTestId('spinner-element');
    expect(spinnerElement).toHaveClass('border-white', 'border-t-transparent');
  });

  it('applies correct speed classes', () => {
    const { rerender } = render(<LoadingSpinner speed="slow" />);
    let spinnerElement = screen.getByTestId('spinner-element');
    expect(spinnerElement).toHaveClass('animate-spin-slow');

    rerender(<LoadingSpinner speed="normal" />);
    spinnerElement = screen.getByTestId('spinner-element');
    expect(spinnerElement).toHaveClass('animate-spin');

    rerender(<LoadingSpinner speed="fast" />);
    spinnerElement = screen.getByTestId('spinner-element');
    expect(spinnerElement).toHaveClass('animate-spin-fast');
  });

  it('applies custom className', () => {
    const customClass = 'custom-spinner-class';
    render(<LoadingSpinner className={customClass} />);

    const spinner = screen.getByTestId('loading-spinner');
    expect(spinner).toHaveClass(customClass);
  });

  it('hides label when not provided', () => {
    render(<LoadingSpinner label="" />);

    const label = screen.queryByTestId('spinner-label');
    expect(label).not.toBeInTheDocument();
  });

  it('has accessible attributes', () => {
    render(<LoadingSpinner label="Loading content" />);

    const spinner = screen.getByTestId('loading-spinner');
    expect(spinner).toHaveAttribute('role', 'status');
    expect(spinner).toHaveAttribute('aria-label', 'Loading content');

    const srText = screen.getByTestId('spinner-label');
    expect(srText).toHaveClass('sr-only');
  });
});