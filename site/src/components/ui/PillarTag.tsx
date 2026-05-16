import React from 'react';

interface PillarTagProps {
  pillar: 'cvm' | 'acoes' | 'crypto' | 'sistema';
}

const PILLAR_CONFIG = {
  cvm: { label: 'CVM', color: 'var(--cvm-color)', bg: 'var(--cvm-light)' },
  acoes: { label: 'Ações', color: 'var(--acoes-color)', bg: 'var(--acoes-light)' },
  crypto: { label: 'Crypto', color: 'var(--crypto-color)', bg: 'var(--crypto-light)' },
  sistema: { label: 'Sistema', color: 'var(--text-muted)', bg: 'var(--bg-sunken)' },
};

export const PillarTag: React.FC<PillarTagProps> = ({ pillar }) => {
  const config = PILLAR_CONFIG[pillar];

  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium"
      style={{
        backgroundColor: config.bg,
        color: config.color,
      }}
    >
      <span
        className="w-2 h-2 rounded-full"
        style={{ backgroundColor: config.color }}
      />
      {config.label}
    </span>
  );
};
