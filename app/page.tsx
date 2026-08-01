'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  Wifi,
  Router,
  Users,
  Ticket,
  Activity,
  Shield,
  Smartphone,
  CheckCircle2,
  ArrowRight,
  Server,
  Zap,
  Globe,
} from 'lucide-react';
import { apiFetch } from '@/lib/api';
import type { TenantPackage } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export default function LandingPage() {
  const [packages, setPackages] = useState<TenantPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [billing, setBilling] = useState<'monthly' | 'yearly'>('monthly');

  useEffect(() => {
    async function loadPackages() {
      try {
        const packagesData = await apiFetch<TenantPackage[]>('/packages/active');
        setPackages(packagesData ?? []);
      } catch (error) {
        console.error('Failed to load packages', error);
      } finally {
        setLoading(false);
      }
    }

    loadPackages();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Wifi className="h-5 w-5" />
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-sm font-bold text-foreground">WispNet</span>
              <span className="text-[11px] text-muted-foreground">Hotspot Management Platform</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/login">
              <Button variant="ghost" size="sm">Sign In</Button>
            </Link>
            <Link href="/signup">
              <Button size="sm" className="gap-1.5">
                Get Started <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div className="absolute left-1/4 top-0 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
          <div className="absolute right-1/4 top-40 h-72 w-72 rounded-full bg-info/10 blur-3xl" />
        </div>
        <div className="mx-auto max-w-6xl px-4 py-20 text-center md:py-28">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border bg-card px-4 py-1.5 text-sm text-muted-foreground">
            <span className="flex h-2 w-2 rounded-full bg-success animate-pulse" />
            FreeRADIUS-compatible & M-Pesa Daraja integrated
          </div>
          <h1 className="mx-auto max-w-3xl text-4xl font-bold tracking-tight text-foreground md:text-5xl">
            Run your ISP hotspot business{' '}
            <span className="bg-gradient-to-r from-primary to-info bg-clip-text text-transparent">
              in the cloud
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            Multitenant hotspot management powered by FreeRADIUS. Manage NAS devices,
            RADIUS users, vouchers, and billing — with built-in M-Pesa Daraja STK push
            payments. Sign up, subscribe, and start operating in minutes.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/signup">
              <Button size="lg" className="gap-1.5">
                Start Free Trial <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/pricing">
              <Button size="lg" variant="outline">View Pricing</Button>
            </Link>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            14-day free trial · No credit card required
          </p>
        </div>
      </section>

      {/* Features */}
      <section className="border-t bg-muted/30">
        <div className="mx-auto max-w-6xl px-4 py-20">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold tracking-tight">Everything you need to run a hotspot network</h2>
            <p className="mt-3 text-muted-foreground">From NAS provisioning to M-Pesa payments — all in one platform</p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            <FeatureCard
              icon={Router}
              title="FreeRADIUS Compatible"
              description="Works directly with your existing FreeRADIUS database schema. NAS, radcheck, radacct, radgroupreply — all managed through the UI."
            />
            <FeatureCard
              icon={Smartphone}
              title="M-Pesa Daraja STK Push"
              description="Built-in Safaricom Daraja API integration. Customers pay via STK push and get activated automatically on callback."
            />
            <FeatureCard
              icon={Ticket}
              title="Voucher Generation"
              description="Generate bulk prepaid voucher codes tied to plans. Print, share, or sell. Users authenticate with voucher credentials."
            />
            <FeatureCard
              icon={Activity}
              title="Session Monitoring"
              description="Real-time RADIUS accounting. See who's connected, data usage, session durations, and disconnect events as they happen."
            />
            <FeatureCard
              icon={Users}
              title="Multitenant by Design"
              description="Each ISP gets isolated data with tenant-scoped RLS. Multiple operators on one platform with full data separation."
            />
            <FeatureCard
              icon={Shield}
              title="Secure & Reliable"
              description="Row-level security on every table. Server-enforced tenant isolation. Your data never leaks to another ISP."
            />
          </div>
        </div>
      </section>

      {/* Pricing preview */}
      <section className="border-t">
        <div className="mx-auto max-w-6xl px-4 py-20">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold tracking-tight">Simple, transparent pricing</h2>
            <p className="mt-3 text-muted-foreground">Choose the plan that fits your ISP size</p>
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
                <Skeleton key={i} className="h-80 rounded-xl" />
              ))}
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-4">
              {packages.map((pkg, i) => (
                <PricingCard
                  key={pkg.id}
                  pkg={pkg}
                  billing={billing}
                  featured={i === 1}
                />
              ))}
            </div>
          )}
          <div className="mt-8 text-center">
            <Link href="/pricing">
              <Button variant="outline">Compare all features <ArrowRight className="ml-1.5 h-4 w-4" /></Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <section className="border-t bg-primary text-primary-foreground">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-8 px-4 py-12 md:grid-cols-4">
          <StatBar icon={Server} label="FreeRADIUS Tables" value="12+" />
          <StatBar icon={Zap} label="M-Pesa STK Push" value="Instant" />
          <StatBar icon={Globe} label="Multitenant" value="Unlimited" />
          <StatBar icon={Shield} label="Row-Level Security" value="100%" />
        </div>
      </section>

      {/* CTA */}
      <section className="border-t">
        <div className="mx-auto max-w-3xl px-4 py-20 text-center">
          <h2 className="text-3xl font-bold tracking-tight">Ready to launch your hotspot network?</h2>
          <p className="mt-3 text-muted-foreground">Sign up today and get a 14-day free trial. No credit card needed.</p>
          <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link href="/signup">
              <Button size="lg" className="gap-1.5">
                Create Account <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="outline">Sign In</Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-muted/30">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-8">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Wifi className="h-4 w-4" /> WispNet — Hotspot Management Platform
          </div>
          <p className="text-sm text-muted-foreground">FreeRADIUS · M-Pesa Daraja · Multitenant SaaS</p>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon: Icon, title, description }: { icon: React.ElementType; title: string; description: string }) {
  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardContent className="p-6">
        <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <h3 className="mb-2 font-semibold text-foreground">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
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
        <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{pkg.description}</p>
        <div className="mt-4">
          <span className="text-3xl font-bold text-foreground">{formatCurrency(price)}</span>
          <span className="text-sm text-muted-foreground">{period}</span>
        </div>
        <div className="mt-4 space-y-2 flex-1">
          {pkg.features.map((f, i) => (
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

function StatBar({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="text-center">
      <Icon className="mx-auto mb-2 h-6 w-6 opacity-80" />
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-sm opacity-80">{label}</p>
    </div>
  );
}
