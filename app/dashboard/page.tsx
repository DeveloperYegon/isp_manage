'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  Activity,
  DollarSign,
  Router,
  Users,
  Wifi,
  Zap,
  Ticket,
  TrendingUp,
  ArrowRight,
} from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import type { Nas, RadAcct, RadCheck, RadGroupReply, BillingTransaction } from '@/lib/types';
import { PageShell } from '@/components/page-shell';
import { StatCard } from '@/components/stat-card';
import { StatusBadge, statusVariant } from '@/components/status-badge';
import { ChartSkeleton, StatCardSkeleton } from '@/components/skeletons';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { formatCurrency, formatOctets, formatRelativeTime, formatDuration } from '@/lib/utils';

interface DashboardData {
  nas: Nas[];
  users: RadCheck[];
  plans: RadGroupReply[];
  sessions: RadAcct[];
  transactions: BillingTransaction[];
}

export default function DashboardPage() {
  const { tenant } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [nas, users, plans, sessions, transactions] = await Promise.all([
          apiFetch<Nas[]>('/nas'),
          apiFetch<RadCheck[]>('/users'),
          apiFetch<RadGroupReply[]>('/plans'),
          apiFetch<RadAcct[]>('/sessions'),
          apiFetch<BillingTransaction[]>('/transactions'),
        ]);

        if (cancelled) return;

        setData({
          nas: nas ?? [],
          users: users ?? [],
          plans: plans ?? [],
          sessions: sessions ?? [],
          transactions: transactions ?? [],
        });
      } catch (e) {
        if (!cancelled) {
          setError('Failed to load dashboard data');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const stats = useMemo(() => {
    if (!data) return null;
    const activeSessions = data.sessions.filter((s) => s.status === 'connected');
    const onlineNas = data.nas.filter((n) => n.status === 'online');
    const activeUsers = data.users.filter((u) => u.status === 'active' && !u.is_voucher);
    const totalRevenue = data.transactions
      .filter((t) => t.status === 'completed' && t.type !== 'refund')
      .reduce((sum, t) => sum + Number(t.amount), 0);
    const unusedVouchers = data.users.filter((u) => u.is_voucher && u.status === 'unused').length;
    return {
      activeSessions: activeSessions.length,
      onlineNas: onlineNas.length,
      totalNas: data.nas.length,
      activeUsers: activeUsers.length,
      totalUsers: data.users.filter((u) => !u.is_voucher).length,
      totalRevenue,
      unusedVouchers,
    };
  }, [data]);

  const revenueByDay = useMemo(() => {
    if (!data) return [];
    const map = new Map<string, { date: string; revenue: number; sessions: number }>();
    const today = new Date();
    for (let i = 13; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      map.set(key, { date: key, revenue: 0, sessions: 0 });
    }
    data.transactions
      .filter((t) => t.status === 'completed' && t.type !== 'refund')
      .forEach((t) => {
        const key = t.created_at.slice(0, 10);
        if (map.has(key)) map.get(key)!.revenue += Number(t.amount);
      });
    data.sessions.forEach((s) => {
      const key = s.acctstarttime.slice(0, 10);
      if (map.has(key)) map.get(key)!.sessions += 1;
    });
    return Array.from(map.values()).map((d) => ({
      ...d,
      label: new Date(d.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }),
    }));
  }, [data]);

  const planDistribution = useMemo(() => {
    if (!data) return [];
    const counts = new Map<string, number>();
    data.users.filter((u) => !u.is_voucher).forEach((u) => {
      const name = u.plan?.plan_name ?? 'No Plan';
      counts.set(name, (counts.get(name) ?? 0) + 1);
    });
    const colors = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))', 'hsl(var(--muted-foreground))'];
    return Array.from(counts.entries()).map(([name, value], i) => ({
      name, value, fill: colors[i % colors.length],
    }));
  }, [data]);

  const nasLoad = useMemo(() => {
    if (!data) return [];
    return data.nas.map((n) => {
      const active = data.sessions.filter((s) => s.nasipaddress === n.nasname && s.status === 'connected').length;
      return {
        name: n.shortname.replace(/\s.*/, ''),
        active,
        capacity: n.max_connections,
        pct: Math.round((active / n.max_connections) * 100),
      };
    }).sort((a, b) => b.active - a.active).slice(0, 6);
  }, [data]);

  const recentSessions = useMemo(() => data?.sessions.slice(0, 6) ?? [], [data]);

  if (loading) {
    return (
      <PageShell title="Dashboard" subtitle="Network overview & performance">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)}
        </div>
        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          <ChartSkeleton className="lg:col-span-2" />
          <ChartSkeleton />
        </div>
      </PageShell>
    );
  }

  if (error || !data || !stats) {
    return (
      <PageShell title="Dashboard" subtitle="Network overview & performance">
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-sm text-destructive">{error ?? 'Unable to load dashboard data.'}</p>
          </CardContent>
        </Card>
      </PageShell>
    );
  }

  return (
    <PageShell title="Dashboard" subtitle={`${tenant?.company_name ?? 'Your ISP'} — Network overview`}>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Active Sessions" value={stats.activeSessions} icon={Activity} accent="info" trend={12} trendLabel="vs yesterday" />
        <StatCard label="Online NAS" value={`${stats.onlineNas}/${stats.totalNas}`} icon={Router} accent="success" trend={0} trendLabel="stable" />
        <StatCard label="RADIUS Users" value={stats.activeUsers} icon={Users} accent="primary" trend={8} trendLabel="this month" />
        <StatCard label="Revenue (14d)" value={formatCurrency(stats.totalRevenue)} icon={DollarSign} accent="warning" trend={15} trendLabel="vs last period" />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Revenue & Sessions</CardTitle>
                <CardDescription>Last 14 days</CardDescription>
              </div>
              <div className="flex items-center gap-4 text-xs">
                <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-primary" /> Revenue</span>
                <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-info" /> Sessions</span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={revenueByDay} margin={{ left: -12, right: 8 }}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="sessGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--info))" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="hsl(var(--info))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} />
                <YAxis yAxisId="left" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} tickFormatter={(v) => (v >= 1000 ? `${v / 1000}k` : v)} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }}
                  formatter={(value: number, name: string) => (name === 'revenue' ? [formatCurrency(value), 'Revenue'] : [value, 'Sessions'])}
                />
                <Area yAxisId="left" type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#revGrad)" />
                <Area yAxisId="right" type="monotone" dataKey="sessions" stroke="hsl(var(--info))" strokeWidth={2} fill="url(#sessGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Plan Distribution</CardTitle>
            <CardDescription>Active user subscriptions</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={planDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2}>
                  {planDistribution.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Pie>
                <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-3 space-y-1.5">
              {planDistribution.map((p) => (
                <div key={p.name} className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-sm" style={{ background: p.fill }} />
                    <span className="text-muted-foreground">{p.name}</span>
                  </span>
                  <span className="font-medium text-foreground">{p.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">NAS Device Load</CardTitle>
              <CardDescription>Active connections vs capacity</CardDescription>
            </div>
            <Link href="/dashboard/nas">
              <Button variant="ghost" size="sm" className="gap-1 text-primary">View all <ArrowRight className="h-3.5 w-3.5" /></Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={nasLoad} margin={{ left: -12, right: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }} cursor={{ fill: 'hsl(var(--muted))' }} />
              <Bar dataKey="active" radius={[6, 6, 0, 0]} fill="hsl(var(--primary))" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Live Sessions</CardTitle>
                <CardDescription>Most recent RADIUS accounting records</CardDescription>
              </div>
              <Link href="/dashboard/sessions">
                <Button variant="ghost" size="sm" className="gap-1 text-primary">View all <Activity className="h-3.5 w-3.5" /></Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>NAS IP</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Started</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentSessions.map((s) => {
                  const sv = statusVariant(s.status);
                  const totalOctets = Number(s.acctinputoctets) + Number(s.acctoutputoctets);
                  return (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.username ?? '—'}</TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">{s.nasipaddress ?? '—'}</TableCell>
                      <TableCell>{formatOctets(totalOctets)}</TableCell>
                      <TableCell>{formatDuration(s.acctsessiontime)}</TableCell>
                      <TableCell className="text-muted-foreground">{formatRelativeTime(s.acctstarttime)}</TableCell>
                      <TableCell><StatusBadge label={s.status} variant={sv.variant} pulse={sv.pulse} /></TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Quick Stats</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <QuickStat icon={Wifi} label="Total Data Served" value={formatOctets(data.sessions.reduce((s, x) => s + Number(x.acctinputoctets) + Number(x.acctoutputoctets), 0))} accent="text-info" />
              <QuickStat icon={Ticket} label="Unused Vouchers" value={stats.unusedVouchers} accent="text-primary" />
              <QuickStat icon={Zap} label="Avg. Session Duration" value={formatDuration(Math.round(data.sessions.reduce((s, x) => s + x.acctsessiontime, 0) / (data.sessions.length || 1)))} accent="text-warning" />
              <QuickStat icon={TrendingUp} label="Avg. Revenue / Day" value={formatCurrency(stats.totalRevenue / 14)} accent="text-success" />
            </CardContent>
          </Card>
        </div>
      </div>
    </PageShell>
  );
}

function QuickStat({ icon: Icon, label, value, accent }: { icon: React.ElementType; label: string; value: string | number; accent: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className={`flex h-9 w-9 items-center justify-center rounded-lg bg-muted ${accent}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-semibold text-foreground">{value}</p>
      </div>
    </div>
  );
}
