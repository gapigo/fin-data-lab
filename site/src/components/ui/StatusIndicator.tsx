import React from 'react';

interface StatusIndicatorProps {
  lastUpdate: Date;
  thresholds?: { green: number; yellow: number };
}

function getRelativeTime(date: Date): string {
  const hours = (Date.now() - date.getTime()) / (1000 * 60 * 60);
  if (hours < 1) return `${Math.floor(hours * 60)} min atrás`;
  if (hours < 24) return `${Math.floor(hours)}h atrás`;
  return `${Math.floor(hours / 24)} dias atrás`;
}

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({
  lastUpdate,
  thresholds = { green: 24, yellow: 72 },
}) => {
  const hoursAgo = (Date.now() - lastUpdate.getTime()) / (1000 * 60 * 60);

  let statusColor: string;
  let statusText: string;

  if (hoursAgo < thresholds.green) {
    statusColor = 'var(--positive)';
    statusText = 'Atualizado';
  } else if (hoursAgo < thresholds.yellow) {
    statusColor = 'var(--accent-primary)';
    statusText = getRelativeTime(lastUpdate);
  } else {
    statusColor = 'var(--negative)';
    statusText = `${Math.floor(hoursAgo / 24)} dias desatualizado`;
  }

  const absDate = lastUpdate.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="group inline-flex items-center gap-2">
      <span
        className="w-2 h-2 rounded-full"
        style={{ backgroundColor: statusColor }}
      />
      <span className="text-xs text-[var(--text-secondary)]">{statusText}</span>
      <span className="text-xs text-[var(--text-muted)] opacity-0 group-hover:opacity-100 transition-opacity">
        {absDate}
      </span>
    </div>
  );
};
