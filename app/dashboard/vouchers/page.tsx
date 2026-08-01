'use client';

import { useEffect, useMemo, useState } from 'react';
import { Ticket, Search, MoreHorizontal, Trash2, Copy, Sparkles, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api';
import type { RadCheck, RadGroupReply, UserStatus } from '@/lib/types';
import { PageShell } from '@/components/page-shell';
import { StatusBadge, statusVariant } from '@/components/status-badge';
import { TableSkeleton } from '@/components/skeletons';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatCurrency, formatRelativeTime, generateVoucherCode, generateVoucherPassword } from '@/lib/utils';

export default function VouchersPage() {
  const [vouchers, setVouchers] = useState<RadCheck[]>([]);
  const [plans, setPlans] = useState<RadGroupReply[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [planFilter, setPlanFilter] = useState('all');
  const [genOpen, setGenOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [genPlan, setGenPlan] = useState('__none__');
  const [genCount, setGenCount] = useState(5);
  const [generating, setGenerating] = useState(false);
  const [recentlyGenerated, setRecentlyGenerated] = useState<{ code: string; pass: string }[]>([]);

  async function load() {
    setLoading(true);
    try {
      const [vouchersData, plansData] = await Promise.all([
        apiFetch<RadCheck[]>('/vouchers?is_voucher=true'),
        apiFetch<RadGroupReply[]>('/plans'),
      ]);
      setVouchers(vouchersData ?? []);
      setPlans(plansData ?? []);
    } catch (error) {
      toast.error('Failed to load vouchers');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => vouchers.filter((v) => {
    const mq = !query || v.username.toLowerCase().includes(query.toLowerCase());
    const ms = statusFilter === 'all' || v.status === statusFilter;
    const mp = planFilter === 'all' || v.plan_id === planFilter;
    return mq && ms && mp;
  }), [vouchers, query, statusFilter, planFilter]);

  const stats = useMemo(() => ({
    total: vouchers.length,
    unused: vouchers.filter((v) => v.status === 'unused').length,
    active: vouchers.filter((v) => v.status === 'active').length,
    used: vouchers.filter((v) => v.status === 'used').length,
    revenue: vouchers.filter((v) => v.status === 'used' || v.status === 'active').reduce((s, v) => s + Number(v.plan?.plan_price ?? 0), 0),
  }), [vouchers]);

  async function generate() {
    if (genPlan === '__none__') { toast.error('Select a plan for the vouchers'); return; }
    const count = Math.max(1, Math.min(50, genCount));
    setGenerating(true);
    const rows = Array.from({ length: count }, () => {
      const code = generateVoucherCode();
      return { username: code, attribute: 'Cleartext-Password', op: ':=', value: generateVoucherPassword(), plan_id: genPlan, is_voucher: true, status: 'unused' as UserStatus };
    });
    setGenerating(true);
    try {
      const data = await apiFetch<{ username: string; value: string }[]>('/vouchers', {
        method: 'POST',
        body: rows,
      });
      const generated = (data ?? []).map((r) => ({ code: r.username, pass: r.value }));
      setRecentlyGenerated(generated);
      toast.success(`${count} voucher${count > 1 ? 's' : ''} generated`);
      load();
    } catch (error) {
      toast.error('Failed to generate vouchers');
    } finally {
      setGenerating(false);
    }
  }

  async function copyCode(code: string, pass: string) {
    try { await navigator.clipboard.writeText(`${code} / ${pass}`); toast.success('Voucher copied', { description: `${code} / ${pass}` }); } catch { toast.error('Could not copy'); }
  }

  async function copyAllGenerated() {
    try { await navigator.clipboard.writeText(recentlyGenerated.map((g) => `${g.code} / ${g.pass}`).join('\n')); toast.success(`${recentlyGenerated.length} vouchers copied`); } catch { toast.error('Could not copy'); }
  }

  async function confirmDelete() {
    if (!deleteId) return;
    try {
      await apiFetch(`/vouchers/${deleteId}`, { method: 'DELETE' });
      toast.success('Voucher deleted');
      setDeleteId(null);
      load();
    } catch (error) {
      toast.error('Failed to delete voucher');
    }
  }

  return (
    <PageShell title="Vouchers" subtitle="Prepaid voucher codes (FreeRADIUS radcheck)" actions={
      <Button onClick={() => { setGenPlan('__none__'); setGenCount(5); setRecentlyGenerated([]); setGenOpen(true); }} className="gap-1.5"><Sparkles className="h-4 w-4" /> Generate Vouchers</Button>
    }>
      {!loading && (
        <div className="mb-5 grid gap-4 sm:grid-cols-4">
          <MiniStat label="Total Vouchers" value={stats.total} icon={Ticket} accent="text-primary" />
          <MiniStat label="Unused" value={stats.unused} icon={Ticket} accent="text-info" />
          <MiniStat label="Redeemed" value={stats.active + stats.used} icon={CheckCircle2} accent="text-success" />
          <MiniStat label="Voucher Revenue" value={formatCurrency(stats.revenue)} icon={Ticket} accent="text-warning" />
        </div>
      )}

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input placeholder="Search by voucher code..." value={query} onChange={(e) => setQuery(e.target.value)} className="pl-9" /></div>
        <Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger className="w-full lg:w-40"><SelectValue placeholder="Status" /></SelectTrigger><SelectContent><SelectItem value="all">All Status</SelectItem><SelectItem value="unused">Unused</SelectItem><SelectItem value="active">Active</SelectItem><SelectItem value="used">Used</SelectItem><SelectItem value="expired">Expired</SelectItem></SelectContent></Select>
        <Select value={planFilter} onValueChange={setPlanFilter}><SelectTrigger className="w-full lg:w-44"><SelectValue placeholder="Plan" /></SelectTrigger><SelectContent><SelectItem value="all">All Plans</SelectItem>{plans.map((p) => <SelectItem key={p.id} value={p.id}>{p.plan_name}</SelectItem>)}</SelectContent></Select>
      </div>

      <Card><CardContent className="p-0">
        {loading ? <div className="p-4"><TableSkeleton rows={8} cols={5} /></div> : filtered.length === 0 ? (
          <div className="p-12 text-center"><p className="text-sm text-muted-foreground">No vouchers found.</p></div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Code / Password</TableHead><TableHead>Plan</TableHead><TableHead>Created</TableHead><TableHead>Status</TableHead><TableHead className="w-12" />
              </TableRow></TableHeader>
              <TableBody>
                {filtered.map((v) => {
                  const sv = statusVariant(v.status);
                  return (
                    <TableRow key={v.id}>
                      <TableCell>
                        <button onClick={() => copyCode(v.username, v.value)} className="group inline-flex flex-col gap-0.5 font-mono text-sm font-medium text-foreground transition-colors hover:text-primary" title="Click to copy">
                          <span className="flex items-center gap-1.5">{v.username}<Copy className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-60" /></span>
                          <span className="text-xs text-muted-foreground">Pass: {v.value}</span>
                        </button>
                      </TableCell>
                      <TableCell className="text-sm">{v.plan ? <div><div>{v.plan.plan_name}</div><div className="text-xs text-muted-foreground">{formatCurrency(Number(v.plan.plan_price))}</div></div> : <span className="text-muted-foreground">No plan</span>}</TableCell>
                      <TableCell className="text-muted-foreground">{formatRelativeTime(v.created_at)}</TableCell>
                      <TableCell><StatusBadge label={v.status} variant={sv.variant} /></TableCell>
                      <TableCell><DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end"><DropdownMenuItem onClick={() => copyCode(v.username, v.value)}><Copy className="mr-2 h-3.5 w-3.5" /> Copy code</DropdownMenuItem><DropdownMenuItem className="text-destructive" onClick={() => setDeleteId(v.id)}><Trash2 className="mr-2 h-3.5 w-3.5" /> Delete</DropdownMenuItem></DropdownMenuContent>
                      </DropdownMenu></TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent></Card>

      <Dialog open={genOpen} onOpenChange={setGenOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Generate Vouchers</DialogTitle><DialogDescription>Create a batch of prepaid access codes tied to a plan.</DialogDescription></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2"><Label>Plan</Label><Select value={genPlan} onValueChange={setGenPlan}><SelectTrigger><SelectValue placeholder="Select plan" /></SelectTrigger><SelectContent>{plans.map((p) => <SelectItem key={p.id} value={p.id}>{p.plan_name} — {formatCurrency(Number(p.plan_price))} / {p.plan_duration_hours}h</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-2"><Label htmlFor="v-count">Quantity (1–50)</Label><Input id="v-count" type="number" min={1} max={50} value={genCount} onChange={(e) => setGenCount(Number(e.target.value))} /></div>
            {recentlyGenerated.length > 0 && (
              <div className="rounded-lg border bg-muted/40 p-3">
                <div className="mb-2 flex items-center justify-between"><p className="text-xs font-semibold text-foreground">{recentlyGenerated.length} new code{recentlyGenerated.length > 1 ? 's' : ''}</p><Button variant="ghost" size="sm" className="h-6 gap-1 px-2 text-xs" onClick={copyAllGenerated}><Copy className="h-3 w-3" /> Copy all</Button></div>
                <div className="max-h-32 space-y-1 overflow-y-auto scrollbar-thin">
                  {recentlyGenerated.map((g) => (<div key={g.code} className="flex items-center justify-between rounded bg-card px-2 py-1 font-mono text-xs"><span>{g.code} / {g.pass}</span><button onClick={() => copyCode(g.code, g.pass)} className="text-muted-foreground hover:text-primary"><Copy className="h-3 w-3" /></button></div>))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setGenOpen(false)}>Close</Button><Button onClick={generate} disabled={generating} className="gap-1.5">{generating ? 'Generating...' : <><Sparkles className="h-4 w-4" /> Generate</>}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <DialogContent className="sm:max-w-md"><DialogHeader><DialogTitle>Delete voucher?</DialogTitle><DialogDescription>This will permanently remove the voucher code.</DialogDescription></DialogHeader><DialogFooter><Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button><Button variant="destructive" onClick={confirmDelete}>Delete</Button></DialogFooter></DialogContent>
      </Dialog>
    </PageShell>
  );
}

function MiniStat({ label, value, icon: Icon, accent }: { label: string; value: string | number; icon: React.ElementType; accent: string }) {
  return (<Card><CardContent className="flex items-center gap-3 p-4"><div className={`flex h-10 w-10 items-center justify-center rounded-lg bg-muted ${accent}`}><Icon className="h-5 w-5" /></div><div><p className="text-2xl font-semibold text-foreground">{value}</p><p className="text-xs text-muted-foreground">{label}</p></div></CardContent></Card>);
}
