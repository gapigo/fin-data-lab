import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ChartCardProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
  action?: ReactNode;
}

export const ChartCard = ({
  title,
  subtitle,
  children,
  className,
  action,
}: ChartCardProps) => {
  return (
    <div
      className={cn(
        'bg-card rounded-xl border border-border p-5 animate-fade-in',
        className
      )}
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-semibold text-foreground">{title}</h3>
          {subtitle && (
            <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>
          )}
        </div>
        {action || (
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <MoreHorizontal className="w-4 h-4" />
          </Button>
        )}
      </div>
      {children}
    </div>
  );
};
