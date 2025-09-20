'use client';

import React from 'react';

export interface SkeletonLoaderProps {
  variant?: 'text' | 'rectangular' | 'circular' | 'rounded';
  width?: string | number;
  height?: string | number;
  lines?: number;
  className?: string;
  animate?: boolean;
  delay?: number;
}

const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({
  variant = 'text',
  width,
  height,
  lines = 1,
  className = '',
  animate = true,
  delay = 0,
}) => {
  const getVariantClasses = () => {
    switch (variant) {
      case 'text':
        return 'rounded';
      case 'rectangular':
        return '';
      case 'circular':
        return 'rounded-full';
      case 'rounded':
        return 'rounded-lg';
      default:
        return 'rounded';
    }
  };

  const getAnimationClasses = () => {
    if (!animate) return 'bg-gray-200';
    return 'bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 bg-[length:200%_100%] animate-shimmer';
  };

  const getDimensions = () => {
    const style: React.CSSProperties = {};

    if (width) {
      style.width = typeof width === 'number' ? `${width}px` : width;
    }

    if (height) {
      style.height = typeof height === 'number' ? `${height}px` : height;
    } else if (variant === 'text') {
      // Default text height
      style.height = '1rem';
    }

    if (delay > 0) {
      style.animationDelay = `${delay}ms`;
    }

    return style;
  };

  const renderSingleSkeleton = (index: number = 0) => (
    <div
      key={index}
      className={`
        ${getVariantClasses()}
        ${getAnimationClasses()}
        ${className}
        ${variant === 'text' && !width ? 'w-full' : ''}
        ${variant === 'circular' && !width && !height ? 'w-12 h-12' : ''}
        ${variant === 'rectangular' && !width && !height ? 'w-full h-32' : ''}
        ${variant === 'rounded' && !width && !height ? 'w-full h-24' : ''}
      `}
      style={getDimensions()}
      data-testid={`skeleton-${index}`}
      role="status"
      aria-label="Loading content"
    />
  );

  const renderMultipleLines = () => {
    const skeletons = [];
    for (let i = 0; i < lines; i++) {
      const isLastLine = i === lines - 1;
      const lineWidth = isLastLine ? '75%' : '100%';

      skeletons.push(
        <div
          key={i}
          className={`
            ${getVariantClasses()}
            ${getAnimationClasses()}
            ${className}
            ${i > 0 ? 'mt-2' : ''}
          `}
          style={{
            ...getDimensions(),
            width: width || lineWidth,
            animationDelay: delay > 0 ? `${delay + (i * 100)}ms` : undefined,
          }}
          data-testid={`skeleton-line-${i}`}
          role="status"
          aria-label={`Loading content line ${i + 1}`}
        />
      );
    }
    return skeletons;
  };

  if (variant === 'text' && lines > 1) {
    return <div className="space-y-2">{renderMultipleLines()}</div>;
  }

  return renderSingleSkeleton();
};

// Predefined skeleton components for common use cases
export const SkeletonCard: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`bg-white rounded-lg border border-gray-200 p-6 ${className}`} data-testid="skeleton-card">
    <div className="space-y-4">
      <SkeletonLoader variant="rectangular" height={200} />
      <SkeletonLoader variant="text" lines={1} height={24} />
      <SkeletonLoader variant="text" lines={3} />
      <div className="flex space-x-3">
        <SkeletonLoader variant="rectangular" width={80} height={32} />
        <SkeletonLoader variant="rectangular" width={60} height={32} />
      </div>
    </div>
  </div>
);

export const SkeletonList: React.FC<{ items?: number; className?: string }> = ({
  items = 5,
  className = '',
}) => (
  <div className={`space-y-4 ${className}`} data-testid="skeleton-list">
    {Array.from({ length: items }, (_, index) => (
      <div key={index} className="flex items-center space-x-4 p-4 bg-white rounded-lg border border-gray-200">
        <SkeletonLoader variant="circular" width={48} height={48} />
        <div className="flex-1 space-y-2">
          <SkeletonLoader variant="text" width="60%" height={20} />
          <SkeletonLoader variant="text" width="40%" height={16} />
        </div>
        <SkeletonLoader variant="rectangular" width={80} height={32} />
      </div>
    ))}
  </div>
);

export const SkeletonTable: React.FC<{ rows?: number; columns?: number; className?: string }> = ({
  rows = 5,
  columns = 4,
  className = '',
}) => (
  <div className={`bg-white rounded-lg border border-gray-200 overflow-hidden ${className}`} data-testid="skeleton-table">
    {/* Table Header */}
    <div className="bg-gray-50 px-6 py-3 border-b border-gray-200">
      <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
        {Array.from({ length: columns }, (_, index) => (
          <SkeletonLoader key={index} variant="text" width="80%" height={16} />
        ))}
      </div>
    </div>

    {/* Table Rows */}
    <div className="divide-y divide-gray-200">
      {Array.from({ length: rows }, (_, rowIndex) => (
        <div key={rowIndex} className="px-6 py-4">
          <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
            {Array.from({ length: columns }, (_, colIndex) => (
              <SkeletonLoader
                key={colIndex}
                variant="text"
                width={colIndex === 0 ? "90%" : "70%"}
                height={16}
                delay={rowIndex * 50 + colIndex * 25}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  </div>
);

export const SkeletonForm: React.FC<{ fields?: number; className?: string }> = ({
  fields = 4,
  className = '',
}) => (
  <div className={`bg-white rounded-lg border border-gray-200 p-6 space-y-6 ${className}`} data-testid="skeleton-form">
    {Array.from({ length: fields }, (_, index) => (
      <div key={index} className="space-y-2">
        <SkeletonLoader variant="text" width="30%" height={16} />
        <SkeletonLoader variant="rectangular" width="100%" height={40} />
      </div>
    ))}
    <div className="flex justify-end space-x-3 pt-4">
      <SkeletonLoader variant="rectangular" width={80} height={36} />
      <SkeletonLoader variant="rectangular" width={100} height={36} />
    </div>
  </div>
);

export default SkeletonLoader;