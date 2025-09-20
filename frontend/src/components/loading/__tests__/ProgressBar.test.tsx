import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import ProgressBar from '../ProgressBar';

describe('ProgressBar', () => {
  it('renders with default props', () => {
    render(<ProgressBar value={50} />);

    const progressBar = screen.getByTestId('progress-bar');
    expect(progressBar).toBeInTheDocument();

    const progressContainer = screen.getByTestId('progress-container');
    expect(progressContainer).toHaveAttribute('role', 'progressbar');
    expect(progressContainer).toHaveAttribute('aria-valuenow', '50');
    expect(progressContainer).toHaveAttribute('aria-valuemin', '0');
    expect(progressContainer).toHaveAttribute('aria-valuemax', '100');
  });

  it('displays correct progress percentage', () => {
    render(<ProgressBar value={75} />);

    const progressFill = screen.getByTestId('progress-fill');
    expect(progressFill).toHaveStyle({ width: '75%' });
  });

  it('handles values outside of bounds', () => {
    const { rerender } = render(<ProgressBar value={-10} />);
    let progressFill = screen.getByTestId('progress-fill');
    expect(progressFill).toHaveStyle({ width: '0%' });

    rerender(<ProgressBar value={150} />);
    progressFill = screen.getByTestId('progress-fill');
    expect(progressFill).toHaveStyle({ width: '100%' });
  });

  it('handles custom max value', () => {
    render(<ProgressBar value={50} max={200} />);

    const progressContainer = screen.getByTestId('progress-container');
    expect(progressContainer).toHaveAttribute('aria-valuemax', '200');

    const progressFill = screen.getByTestId('progress-fill');
    expect(progressFill).toHaveStyle({ width: '25%' }); // 50/200 = 25%
  });

  it('displays label when provided', () => {
    const label = 'Upload Progress';
    render(<ProgressBar value={60} label={label} />);

    const labelElement = screen.getByTestId('progress-label');
    expect(labelElement).toHaveTextContent(label);
  });

  it('shows percentage when enabled', () => {
    render(<ProgressBar value={75} label="Progress" showPercentage={true} />);

    const valueElement = screen.getByTestId('progress-value');
    expect(valueElement).toHaveTextContent('75%');
  });

  it('shows value when enabled', () => {
    render(<ProgressBar value={30} max={50} label="Progress" showValue={true} />);

    const valueElement = screen.getByTestId('progress-value');
    expect(valueElement).toHaveTextContent('30/50');
  });

  it('applies correct size classes', () => {
    const { rerender } = render(<ProgressBar value={50} size="sm" />);
    let progressContainer = screen.getByTestId('progress-container');
    expect(progressContainer).toHaveClass('h-2');

    rerender(<ProgressBar value={50} size="md" />);
    progressContainer = screen.getByTestId('progress-container');
    expect(progressContainer).toHaveClass('h-3');

    rerender(<ProgressBar value={50} size="lg" />);
    progressContainer = screen.getByTestId('progress-container');
    expect(progressContainer).toHaveClass('h-4');
  });

  it('applies correct variant classes', () => {
    const { rerender } = render(<ProgressBar value={50} variant="primary" />);
    let progressFill = screen.getByTestId('progress-fill');
    expect(progressFill).toHaveClass('bg-blue-600');

    rerender(<ProgressBar value={50} variant="secondary" />);
    progressFill = screen.getByTestId('progress-fill');
    expect(progressFill).toHaveClass('bg-gray-600');

    rerender(<ProgressBar value={50} variant="success" />);
    progressFill = screen.getByTestId('progress-fill');
    expect(progressFill).toHaveClass('bg-green-600');

    rerender(<ProgressBar value={50} variant="warning" />);
    progressFill = screen.getByTestId('progress-fill');
    expect(progressFill).toHaveClass('bg-yellow-500');

    rerender(<ProgressBar value={50} variant="error" />);
    progressFill = screen.getByTestId('progress-fill');
    expect(progressFill).toHaveClass('bg-red-600');
  });

  it('applies striped styling when enabled', () => {
    render(<ProgressBar value={50} striped={true} />);

    const progressFill = screen.getByTestId('progress-fill');
    expect(progressFill).toHaveClass('bg-gradient-to-r');
  });

  it('applies animated styling when enabled', () => {
    render(<ProgressBar value={50} animated={true} />);

    const progressFill = screen.getByTestId('progress-fill');
    expect(progressFill).toHaveClass('animate-pulse');
  });

  it('has accessible screen reader text', () => {
    render(<ProgressBar value={75} label="File Upload" />);

    const srText = screen.getByTestId('progress-sr-text');
    expect(srText).toHaveClass('sr-only');
    expect(srText).toHaveTextContent('File Upload: Progress 75 percent complete');
  });

  it('provides accessible aria-label when no label is provided', () => {
    render(<ProgressBar value={45} />);

    const progressContainer = screen.getByTestId('progress-container');
    expect(progressContainer).toHaveAttribute('aria-label', 'Progress: 45%');
  });

  it('applies custom className', () => {
    const customClass = 'custom-progress-class';
    render(<ProgressBar value={50} className={customClass} />);

    const progressBar = screen.getByTestId('progress-bar');
    expect(progressBar).toHaveClass(customClass);
  });
});