'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Wifi,
  LayoutDashboard,
  Router,
  Users,
  CreditCard,
  Activity,
  Ticket,
  Receipt,
  Settings,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth-context';

const nav = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/nas', label: 'NAS Devices', icon: Router },
  { href: '/dashboard/users', label: 'RADIUS Users', icon: Users },
  { href: '/dashboard/plans', label: 'Service Plans', icon: CreditCard },
  { href: '/dashboard/sessions', label: 'Sessions', icon: Activity },
  { href: '/dashboard/vouchers', label: 'Vouchers', icon: Ticket },
  { href: '/dashboard/billing', label: 'Billing', icon: Receipt },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
];

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { tenant } = useAuth();

  return (
    <div className="flex h-full flex-col bg-card">
      <div className="flex h-16 items-center gap-2.5 border-b px-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
          <Wifi className="h-5 w-5" />
        </div>
        <div className="flex min-w-0 flex-col leading-tight">
          <span className="text-sm font-semibold text-foreground">WispNet</span>
          <span className="truncate text-[11px] text-muted-foreground">
            {tenant?.company_name ?? 'Loading...'}
          </span>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3 scrollbar-thin">
        {nav.map((item) => {
          const active =
            item.href === '/dashboard'
              ? pathname === '/dashboard'
              : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all',
                active
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <Icon
                className={cn(
                  'h-[18px] w-[18px] transition-colors',
                  active ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'
                )}
              />
              {item.label}
              {active && (
                <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary" />
              )}
            </Link>
          );
        })}
      </nav>

      {tenant && (
        <div className="border-t p-4">
          <div className="rounded-lg bg-gradient-to-br from-primary/10 to-info/10 p-3.5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-foreground">Subscription</p>
              <span
                className={cn(
                  'rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize',
                  tenant.subscription_status === 'trial'
                    ? 'bg-warning/15 text-warning'
                    : tenant.subscription_status === 'active'
                      ? 'bg-success/15 text-success'
                      : 'bg-destructive/15 text-destructive'
                )}
              >
                {tenant.subscription_status}
              </span>
            </div>
            <p className="mt-1.5 text-[11px] text-muted-foreground">
              {tenant.package?.name ?? 'No package'} plan
            </p>
            <Link
              href="/dashboard/settings"
              onClick={onNavigate}
              className="mt-2 block text-[11px] font-medium text-primary hover:underline"
            >
              Manage subscription →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
