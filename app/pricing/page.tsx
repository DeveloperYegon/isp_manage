'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Wifi, CheckCircle2, ArrowRight } from 'lucide-react';
import type { TenantPackage } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

// Connect dynamically to your Droplet Node.js deployment instance
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://yourwisp.com';

export default function PricingPage() {
  const [packages, setPackages] = useState<TenantPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [billing, setBilling] = useState<'monthly' | 'yearly'>('monthly');

  useEffect(() => {
    let active = true;

    async function fetchPlatformPackages() {
      try {
        // Query the Node.js public packages path (ensure unauthenticated access is allowed on this endpoint)
        const response = await fetch(`${API_BASE_URL}/packages/public-tiers`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        });
        const result = await response.json();

        if (active && result.success && result.data) {
          // Normalize features parsing if it returns as a raw stringified JSON array array structure
          const normalizedData = result.data.map((pkg: any) => ({
            ...pkg,
            features: typeof pkg.features === 'string' ? JSON.parse(pkg.features) : (pkg.features || [])
          }));
          setPackages(normalizedData);
        }
      } catch (error) {
        console.error('Failed to aggregate platform SaaS tiers maps:', error);
      } finally {
        if (active) setLoading(false);
      }
    }

    fetchPlatformPackages();

    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <nav className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Wifi className="h-5 w-5" />
            </div>
            <span className="text-sm font-bold text-foreground">WispNet</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link href="/login"><Button variant="ghost" size="sm">Sign In</Button></Link>
            <Link href="/signup"><Button size="sm" className="gap-1.5">Get Started <ArrowRight className="h-4 w-4" /></Button></Link>
          </div>
        </div>
      </nav>

      <div className="mx-auto max-w-6xl px-4 py-20">
        <div className="mb-12 text-center">
          <h1 className="text-4xl font-bold tracking-tight">Pricing</h1>
          <p className="mt-3 text-lg text-muted-foreground">Scale your ISP hotspot business with transparent pricing</p>
          <div className="mt-6 inline-flex items-center rounded-lg border bg-card p-0.5">
            <button
              onClick={() => setBilling('monthly')}
              className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${billing === 'monthly' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBilling('yearly')}
              className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${billing === 'yearly' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}
            >
              Yearly <span className="text-xs opacity-80">Save 17%</span>
            </button>
          </div>
        </div>

        {loading ? (
          <div className="grid gap-6 md:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-96 rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-4">
            {packages.map((pkg, i) => (
              <PricingCard key={pkg.id} pkg={pkg} billing={billing} featured={i === 1} />
            ))}
          </div>
        )}

        {/* Comparison table */}
        <div className="mt-20">
          <h2 className="mb-8 text-center text-2xl font-bold">Compare plans</h2>
          <div className="overflow-x-auto rounded-xl border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Feature</th>
                  {packages.map((p) => (
                    <th key={p.id} className="px-4 py-3 text-center font-semibold text-foreground">{p.name}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <ComparisonRow label="NAS Devices" packages={packages} getValue={(p) => p.max_nas >= 999 ? 'Unlimited' : String(p.max_nas)} />
                <ComparisonRow label="RADIUS Users" packages={packages} getValue={(p) => p.max_users >= 999999 ? 'Unlimited' : p.max_users.toLocaleString()} />
                <ComparisonRow label="Hotspot Locations" packages={packages} getValue={(p) => p.max_hotspots >= 999 ? 'Unlimited' : String(p.max_hotspots)} />
                <ComparisonRow label="M-Pesa Daraja" packages={packages} getValue={() => '✓'} />
                <ComparisonRow label="Voucher Generation" packages={packages} getValue={(p) => p.sort_order >= 2 ? '✓' : '—'} />
                <ComparisonRow label="Session Monitoring" packages={packages} getValue={(p) => p.sort_order >= 2 ? '✓' : 'Basic'} />
                <ComparisonRow label="Advanced Analytics" packages={packages} getValue={(p) => p.sort_order >= 2 ? '✓' : '—'} />
                <ComparisonRow label="Custom Branding" packages={packages} getValue={(p) => p.sort_order >= 3 ? '✓' : '—'} />
                <ComparisonRow label="API Access" packages={packages} getValue={(p) => p.sort_order >= 3 ? '✓' : '—'} />
                <ComparisonRow label="Priority Support" packages={packages} getValue={(p) => p.sort_order >= 3 ? '✓' : 'Email'} />
                <ComparisonRow label="Dedicated Manager" packages={packages} getValue={(p) => p.sort_order >= 4 ? '✓' : '—'} />
                <ComparisonRow label="SLA Guarantee" packages={packages} getValue={(p) => p.sort_order >= 4 ? '✓' : '—'} />
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function PricingCard({ pkg, billing, featured }: { pkg: TenantPackage; billing: 'monthly' | 'yearly'; featured?: boolean }) {
  const price = billing === 'monthly' ? pkg.price_monthly : pkg.price_yearly;
  const period = billing === 'monthly' ? '/mo' : '/yr';
  return (
    <Card className={`relative flex flex-col ${featured ? 'border-primary shadow-lg ring-1 ring-primary/20' : ''}`}>
      {featured && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
          Most Popular
        </div>
      )}
      <CardContent className="flex flex-1 flex-col p-6">
        <h3 className="font-semibold text-foreground">{pkg.name}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{pkg.description || 'Flexible infrastructure tier'}</p>
        <div className="mt-4">
          <span className="text-3xl font-bold text-foreground">{formatCurrency(price)}</span>
          <span className="text-sm text-muted-foreground">{period}</span>
        </div>
        <div className="mt-4 flex-1 space-y-2">
          {pkg.features && pkg.features.map((f, i) => (
            <div key={i} className="flex items-start gap-2 text-sm">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
              <span className="text-muted-foreground">{f}</span>
            </div>
          ))}
        </div>
        <Link href={`/signup?package=${pkg.id}`} className="mt-6">
          <Button className="w-full" variant={featured ? 'default' : 'outline'}>
            Choose {pkg.name}
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}

function ComparisonRow({ label, packages, getValue }: { label: string; packages: TenantPackage[]; getValue: (p: TenantPackage) => string }) {
  return (
    <tr className="border-b last:border-0">
      <td className="px-4 py-3 text-muted-foreground">{label}</td>
      {packages.map((p) => (
        <td key={p.id} className="px-4 py-3 text-center font-medium text-foreground">{getValue(p)}</td>
      ))}
    </tr>
  );
}
