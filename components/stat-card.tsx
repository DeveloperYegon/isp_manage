'use client';

import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, TrendingDown } from 'lucide-react';

export function StatCard({
  label,
  value,
  icon: Icon,
  trend,
  trendLabel,
  accent = 'primary',
  footer,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  trend?: number;
  trendLabel?: string;
  accent?: 'primary' | 'success' | 'warning' | 'info' | 'destructive';
  footer?: React.ReactNode;
}) {
  const accentMap = {
    primary: 'bg-primary/10 text-primary',
    success: 'bg-success/10 text-success',
    warning: 'bg-warning/10 text-warning',
    info: 'bg-info/10 text-info',
    destructive: 'bg-destructive/10 text-destructive',
  };

  const trendUp = trend != null && trend >= 0;

  return (
    <Card className="relative overflow-hidden transition-shadow hover:shadow-md">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">{label}</p>
            <p className="text-2xl font-semibold tracking-tight text-foreground">
              {value}
            </p>
          </div>
          <div
            className={cn(
              'flex h-10 w-10 items-center justify-center rounded-lg',
              accentMap[accent]
            )}
          >
            <Icon className="h-5 w-5" />
          </div>
        </div>

        {(trend != null || footer) && (
          <div className="mt-4 flex items-center gap-2">
            {trend != null && (
              <span
                className={cn(
                  'inline-flex items-center gap-0.5 text-xs font-semibold',
                  trendUp ? 'text-success' : 'text-destructive'
                )}
              >
                {trendUp ? (
                  <TrendingUp className="h-3.5 w-3.5" />
                ) : (
                  <TrendingDown className="h-3.5 w-3.5" />
                )}
                {trendUp ? '+' : ''}
                {trend}%
              </span>
            )}
            {trendLabel && (
              <span className="text-xs text-muted-foreground">{trendLabel}</span>
            )}
            {footer}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
