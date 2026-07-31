'use client';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type Variant = 'success' | 'warning' | 'destructive' | 'info' | 'muted';

const variants: Record<Variant, string> = {
  success: 'bg-success/10 text-success border-success/20',
  warning: 'bg-warning/10 text-warning border-warning/20',
  destructive: 'bg-destructive/10 text-destructive border-destructive/20',
  info: 'bg-info/10 text-info border-info/20',
  muted: 'bg-muted text-muted-foreground border-border',
};

const dotColors: Record<Variant, string> = {
  success: 'bg-success',
  warning: 'bg-warning',
  destructive: 'bg-destructive',
  info: 'bg-info',
  muted: 'bg-muted-foreground',
};

export function StatusBadge({
  label,
  variant,
  pulse = false,
  className,
}: {
  label: string;
  variant: Variant;
  pulse?: boolean;
  className?: string;
}) {
  return (
    <Badge
      variant="outline"
      className={cn(
        'inline-flex items-center gap-1.5 font-medium capitalize border',
        variants[variant],
        className
      )}
    >
      <span className="relative inline-flex h-1.5 w-1.5">
        {pulse && (
          <span
            className={cn(
              'absolute inline-flex h-full w-full rounded-full opacity-60 animate-ping',
              dotColors[variant]
            )}
          />
        )}
        <span
          className={cn(
            'relative inline-flex h-1.5 w-1.5 rounded-full',
            dotColors[variant]
          )}
        />
      </span>
      {label}
    </Badge>
  );
}

export function statusVariant(
  status: string
): { variant: Variant; pulse?: boolean } {
  switch (status) {
    case 'online':
    case 'active':
    case 'connected':
    case 'completed':
    case 'used':
      return { variant: 'success', pulse: status === 'online' || status === 'connected' };
    case 'degraded':
    case 'pending':
    case 'suspended':
      return { variant: 'warning' };
    case 'offline':
    case 'failed':
    case 'expired':
      return { variant: 'destructive' };
    case 'unused':
      return { variant: 'info' };
    default:
      return { variant: 'muted' };
  }
}
