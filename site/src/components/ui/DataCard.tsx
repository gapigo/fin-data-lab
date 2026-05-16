import React from 'react';

interface DataCardProps {
  label: string;
  value: string | number;
  delta?: number;
  deltaLabel?: string;
  icon?: React.ReactNode;
  pillar?: 'cvm' | 'acoes' | 'crypto';
}

export const DataCard: React.FC<DataCardProps> = ({
  label,
  value,
  delta,
  deltaLabel,
  icon,
  pillar,
}) => {
  const borderColor = pillar
    ? `var(--${pillar}-color)`
    : 'transparent';

  const deltaColor =
    delta === undefined
      ? undefined
      : delta >= 0
      ? 'var(--positive)'
      : 'var(--negative)';

  return (
    <div
      className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-4 transition-all duration-150 hover:border-[var(--border-default)]"
      style={{
        borderLeftWidth: pillar ? '3px' : '1px',
        borderLeftColor: borderColor,
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-[var(--text-muted)] text-xs uppercase tracking-wider font-medium">
          {label}
        </span>
        {icon && (
          <span className="text-[var(--text-muted)]">{icon}</span>
        )}
      </div>
      <div className="flex items-baseline gap-2">
        <span
          className="text-2xl font-semibold text-[var(--text-primary)]"
          style={{ fontFamily: 'var(--font-mono)' }}
        >
          {value}
        </span>
        {delta !== undefined && (
          <span
            className="text-sm font-medium flex items-center gap-0.5"
            style={{ color: deltaColor, fontFamily: 'var(--font-mono)' }}
          >
            {delta >= 0 ? '+' : ''}
            {delta.toFixed(2)}%
            {deltaLabel && (
              <span className="text-[var(--text-muted)] text-xs ml-1">
                {deltaLabel}
              </span>
            )}
          </span>
        )}
      </div>
    </div>
  );
};
