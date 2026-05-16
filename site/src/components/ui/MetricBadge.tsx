import React from 'react';

interface MetricBadgeProps {
  value: number;
  format: 'percent' | 'currency' | 'number';
  size?: 'sm' | 'md';
}

function formatValue(value: number, format: MetricBadgeProps['format']): string {
  switch (format) {
    case 'percent':
      return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
    case 'currency':
      return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        notation: 'compact',
      }).format(value);
    case 'number':
      return new Intl.NumberFormat('pt-BR', { notation: 'compact' }).format(value);
  }
}

export const MetricBadge: React.FC<MetricBadgeProps> = ({
  value,
  format,
  size = 'md',
}) => {
  const color = value >= 0 ? 'var(--positive)' : 'var(--negative)';
  const bgColor = value >= 0 ? 'var(--positive-bg)' : 'var(--negative-bg)';

  const sizeClasses = size === 'sm'
    ? 'text-xs px-1.5 py-0.5 rounded'
    : 'text-sm px-2 py-1 rounded-md';

  return (
    <span
      className={`inline-flex items-center font-medium ${sizeClasses}`}
      style={{
        color,
        backgroundColor: bgColor,
        fontFamily: 'var(--font-mono)',
      }}
    >
      {formatValue(value, format)}
    </span>
  );
};
