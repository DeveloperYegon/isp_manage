'use client';

import { TopBar } from '@/components/topbar';

export function PageShell({
  title,
  subtitle,
  actions,
  children,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <>
      <TopBar title={title} subtitle={subtitle} />
      {actions && (
        <div className="flex items-center justify-end gap-3 border-b bg-muted/30 px-4 py-3 md:px-6">
          {actions}
        </div>
      )}
      <main className="flex-1 overflow-y-auto p-4 md:p-6 scrollbar-thin">{children}</main>
    </>
  );
}
