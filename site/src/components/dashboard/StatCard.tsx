import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { ReactNode } from 'react';

interface StatCardProps {
  title: string;
  value: string;
  change?: number;
  icon: ReactNode;
  colorClass?: string;
}

export const StatCard = ({
  title,
  value,
  change,
  icon,
  colorClass = 'from-primary to-accent',
}: StatCardProps) => {
  const isPositive = change && change > 0;

  return (
    <div className="bg-card rounded-xl border border-border p-5 animate-fade-in group hover:border-primary/30 transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>

          {change !== undefined && (
            <div
              className={cn(
                'flex items-center gap-1 mt-2 text-sm font-medium',
                isPositive ? 'text-accent' : 'text-destructive'
              )}
            >
              {isPositive ? (
                <TrendingUp className="w-4 h-4" />
              ) : (
                <TrendingDown className="w-4 h-4" />
              )}
              <span>{Math.abs(change)}%</span>
              <span className="text-muted-foreground font-normal">
                vs mês anterior
              </span>
            </div>
          )}
        </div>

        <div
          className={cn(
            'w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center text-primary-foreground',
            colorClass
          )}
        >
          {icon}
        </div>
      </div>
    </div>
  );
};
