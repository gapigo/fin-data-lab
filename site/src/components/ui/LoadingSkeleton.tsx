import React from 'react';

interface LoadingSkeletonProps {
  width?: string | number;
  height?: string | number;
  className?: string;
  variant?: 'text' | 'card' | 'chart' | 'table-row';
}

const VARIANT_HEIGHTS: Record<string, string> = {
  text: '1em',
  card: '120px',
  chart: '300px',
  'table-row': '40px',
};

export const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({
  width = '100%',
  height,
  className = '',
  variant = 'text',
}) => {
  const resolvedHeight = height || VARIANT_HEIGHTS[variant];

  return (
    <div
      className={`skeleton ${className}`}
      style={{
        width: typeof width === 'number' ? `${width}px` : width,
        height: typeof resolvedHeight === 'number' ? `${resolvedHeight}px` : resolvedHeight,
      }}
    />
  );
};
