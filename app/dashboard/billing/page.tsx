'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Receipt, Search, DollarSign, TrendingUp, ArrowDownRight, ArrowUpRight,
  Smartphone, CreditCard, Banknote, Building2, Plus, Clock, CheckCircle2,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import type {
  BillingTransaction, PaymentMethod, RadCheck, RadGroupReply,
  TransactionStatus, TransactionType,
} from '@/lib/types';
import { PageShell } from '@/components/page-shell';
import { StatusBadge, statusVariant } from '@/components/status-badge';
import { TableSkeleton } from '@/components/skeletons';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatCurrency, formatDateTime } from '@/lib/utils';

const paymentIcons: Record<PaymentMethod, React.ElementType> = { mpesa: Smartphone, card: CreditCard, cash: Banknote, bank: Building2 };
const typeLabels: Record<TransactionType, string> = { plan_purchase: 'Plan Purchase', topup: 'Top-up', voucher_sale: 'Voucher Sale', subscription: 'Subscription', refund: 'Refund' };

export default function BillingPage() {
  const [transactions, setTransactions] = useState<BillingTransaction[]>([]);
  const [users, setUsers] = useState<RadCheck[]>([]);
  const [plans, setPlans] = useState<RadGroupReply[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [methodFilter, setMethodFilter] = useState('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [stkOpen, setStkOpen] = useState(false);
  const [form, setForm] = useState({ customer_username: '__none__', plan_id: '__none__', amount: 0, type: 'topup' as TransactionType, status: 'completed' as TransactionStatus, payment_method: 'mpesa' as PaymentMethod, reference: '' });
  const [stkForm, setStkForm] = useState({ phone: '', plan_id: '__none__', amount: 0 });
  const [stkLoading, setStkLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const [tRes, uRes, pRes] = await Promise.all([
      supabase.from('billing_transactions').select('*, plan:radgroupreply(id,plan_name)').order('created_at', { ascending: false }).limit(100),
      supabase.from('radcheck').select('id, username, full_name').eq('is_voucher', false).order('username'),
      supabase.from('radgroupreply').select('id, plan_name, plan_price').order('sort_order'),
    ]);
    if (tRes.error) { toast.error('Failed to load transactions'); setLoading(false); return; }
    setTransactions(tRes.data as BillingTransaction[]);
    setUsers((uRes.data as RadCheck[]) ?? []);
    setPlans((pRes.data as RadGroupReply[]) ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => transactions.filter((t) => {
    const mq = !query || (t.customer_username ?? '').toLowerCase().includes(query.toLowerCase()) || (t.reference ?? '').toLowerCase().includes(query.toLowerCase());
    const mt = typeFilter === 'all' || t.type === typeFilter;
    const ms = statusFilter === 'all' || t.status === statusFilter;
    const mm = methodFilter === 'all' || t.payment_method === methodFilter;
    return mq && mt && ms && mm;
  }), [transactions, query, typeFilter, statusFilter, methodFilter]);

  const stats = useMemo(() => {
    const completed = transactions.filter((t) => t.status === 'completed');
    const revenue = completed.filter((t) => t.type !== 'refund').reduce((s, t) => s + Number(t.amount), 0);
    const refunds = completed.filter((t) => t.type === 'refund').reduce((s, t) => s + Number(t.amount), 0);
    const pending = transactions.filter((t) => t.status === 'pending').length;
    return { revenue, refunds, net: revenue - refunds, pending };
  }, [transactions]);

  const revenueByMethod = useMemo(() => {
    const map = new Map<string, number>();
    transactions.filter((t) => t.status === 'completed' && t.type !== 'refund').forEach((t) => map.set(t.payment_method, (map.get(t.payment_method) ?? 0) + Number(t.amount)));
    return Array.from(map.entries()).map(([method, amount]) => ({ method: method.charAt(0).toUpperCase() + method.slice(1), amount }));
  }, [transactions]);

  async function save() {
    setSaving(true);
    const payload = { customer_username: form.customer_username === '__none__' ? null : form.customer_username, plan_id: form.plan_id === '__none__' ? null : form.plan_id, amount: Number(form.amount) || 0, type: form.type, status: form.status, payment_method: form.payment_method, reference: form.reference.trim() || null };
    const { error } = await supabase.from('billing_transactions').insert(payload);
    setSaving(false);
    if (error) { toast.error('Failed to record transaction'); return; }
    toast.success('Transaction recorded'); setCreateOpen(false); load();
  }

  async function stkPush() {
    if (!stkForm.phone.trim() || stkForm.amount <= 0) { toast.error('Enter phone number and amount'); return; }
    setStkLoading(true);
    const ref = `STK-${Date.now()}`;
    const { data, error } = await supabase.from('billing_transactions').insert({
      customer_username: null,
      plan_id: stkForm.plan_id === '__none__' ? null : stkForm.plan_id,
      amount: Number(stkForm.amount),
      type: 'plan_purchase',
      status: 'pending',
      payment_method: 'mpesa',
      mpesa_phone: stkForm.phone.trim(),
      reference: ref,
      callback_received: false,
    }).select('id').single();

    setStkLoading(false);
    if (error || !data) { toast.error('Could not initiate M-Pesa payment'); return; }

    // Call edge function for STK push
    const apiUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/mpesa-stk-push`;
    try {
      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}` },
        body: JSON.stringify({ transactionId: data.id, phone: stkForm.phone.trim(), amount: Number(stkForm.amount), reference: ref }),
      });
      if (!res.ok) { toast.error('M-Pesa STK push failed to initiate'); return; }
      const result = await res.json();
      if (result.checkoutRequestId) {
        await supabase.from('billing_transactions').update({ mpesa_checkout_request_id: result.checkoutRequestId, mpesa_merchant_request_id: result.merchantRequestId }).eq('id', data.id);
      }
      toast.success('M-Pesa STK push sent! Check the customer phone to complete payment.', { description: `Ref: ${ref}` });
      setStkOpen(false); load();
    } catch {
      toast.error('M-Pesa request failed. The payment is pending and will be processed.');
      setStkOpen(false); load();
    }
  }

  return (
    <PageShell title="Billing" subtitle="M-Pesa Daraja transactions & revenue" actions={
      <div className="flex gap-2">
        <Button variant="outline" onClick={() => setStkOpen(true)} className="gap-1.5"><Smartphone className="h-4 w-4" /> M-Pesa STK Push</Button>
        <Button onClick={() => setCreateOpen(true)} className="gap-1.5"><Plus className="h-4 w-4" /> Record Transaction</Button>
      </div>
    }>
      {!loading && (
        <>
          <div className="mb-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <RevenueCard label="Gross Revenue" value={formatCurrency(stats.revenue)} icon={DollarSign} accent="text-success" trend="up" />
            <RevenueCard label="Net Revenue" value={formatCurrency(stats.net)} icon={TrendingUp} accent="text-primary" trend="up" />
            <RevenueCard label="Refunds" value={formatCurrency(stats.refunds)} icon={ArrowDownRight} accent="text-destructive" trend="down" />
            <RevenueCard label="Pending" value={stats.pending} icon={Clock} accent="text-warning" />
          </div>

          {revenueByMethod.length > 0 && (
            <Card className="mb-6"><CardHeader><CardTitle className="text-base">Revenue by Payment Method</CardTitle></CardHeader><CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={revenueByMethod} margin={{ left: -12, right: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="method" tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} tickFormatter={(v) => (v >= 1000 ? `${v / 1000}k` : v)} />
                  <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }} cursor={{ fill: 'hsl(var(--muted))' }} formatter={(v: number) => [formatCurrency(v), 'Revenue']} />
                  <Bar dataKey="amount" radius={[6, 6, 0, 0]} fill="hsl(var(--primary))" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent></Card>
          )}
        </>
      )}

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input placeholder="Search by user or reference..." value={query} onChange={(e) => setQuery(e.target.value)} className="pl-9" /></div>
        <Select value={typeFilter} onValueChange={setTypeFilter}><SelectTrigger className="w-full lg:w-40"><SelectValue placeholder="Type" /></SelectTrigger><SelectContent><SelectItem value="all">All Types</SelectItem><SelectItem value="plan_purchase">Plan Purchase</SelectItem><SelectItem value="topup">Top-up</SelectItem><SelectItem value="voucher_sale">Voucher Sale</SelectItem><SelectItem value="subscription">Subscription</SelectItem><SelectItem value="refund">Refund</SelectItem></SelectContent></Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger className="w-full lg:w-36"><SelectValue placeholder="Status" /></SelectTrigger><SelectContent><SelectItem value="all">All Status</SelectItem><SelectItem value="completed">Completed</SelectItem><SelectItem value="pending">Pending</SelectItem><SelectItem value="failed">Failed</SelectItem></SelectContent></Select>
        <Select value={methodFilter} onValueChange={setMethodFilter}><SelectTrigger className="w-full lg:w-36"><SelectValue placeholder="Method" /></SelectTrigger><SelectContent><SelectItem value="all">All Methods</SelectItem><SelectItem value="mpesa">M-Pesa</SelectItem><SelectItem value="card">Card</SelectItem><SelectItem value="cash">Cash</SelectItem><SelectItem value="bank">Bank</SelectItem></SelectContent></Select>
      </div>

      <Card><CardContent className="p-0">
        {loading ? <div className="p-4"><TableSkeleton rows={8} cols={6} /></div> : filtered.length === 0 ? (
          <div className="p-12 text-center"><p className="text-sm text-muted-foreground">No transactions found.</p></div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader><TableRow>
                <TableHead>User</TableHead><TableHead>Type</TableHead><TableHead>Plan / Ref</TableHead><TableHead>Method</TableHead><TableHead>Amount</TableHead><TableHead>Date</TableHead><TableHead>Status</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {filtered.map((t) => {
                  const sv = statusVariant(t.status);
                  const PayIcon = paymentIcons[t.payment_method];
                  const isRefund = t.type === 'refund';
                  return (
                    <TableRow key={t.id}>
                      <TableCell className="font-medium">{t.customer_username ?? '—'}</TableCell>
                      <TableCell className="text-sm">{typeLabels[t.type]}</TableCell>
                      <TableCell><div className="space-y-0.5 text-xs">{t.plan && <div className="text-foreground">{t.plan.plan_name}</div>}{t.reference && <div className="font-mono text-muted-foreground">{t.reference}</div>}{t.mpesa_receipt && <div className="flex items-center gap-1 text-success"><CheckCircle2 className="h-3 w-3" /> {t.mpesa_receipt}</div>}</div></TableCell>
                      <TableCell><span className="inline-flex items-center gap-1.5 text-sm capitalize"><PayIcon className="h-3.5 w-3.5 text-muted-foreground" />{t.payment_method}</span></TableCell>
                      <TableCell><span className={`inline-flex items-center gap-1 font-semibold ${isRefund ? 'text-destructive' : 'text-foreground'}`}>{isRefund ? <ArrowDownRight className="h-3.5 w-3.5" /> : <ArrowUpRight className="h-3.5 w-3.5 text-success" />}{formatCurrency(Number(t.amount))}</span></TableCell>
                      <TableCell className="text-xs text-muted-foreground">{formatDateTime(t.created_at)}</TableCell>
                      <TableCell><StatusBadge label={t.status} variant={sv.variant} /></TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent></Card>

      {/* Record transaction dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Record Transaction</DialogTitle><DialogDescription>Manually log a payment.</DialogDescription></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>User</Label><Select value={form.customer_username} onValueChange={(v) => setForm({ ...form, customer_username: v })}><SelectTrigger><SelectValue placeholder="Select user" /></SelectTrigger><SelectContent><SelectItem value="__none__">No user</SelectItem>{users.map((u) => <SelectItem key={u.id} value={u.username}>{u.username}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-2"><Label>Type</Label><Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v as TransactionType })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="plan_purchase">Plan Purchase</SelectItem><SelectItem value="topup">Top-up</SelectItem><SelectItem value="voucher_sale">Voucher Sale</SelectItem><SelectItem value="refund">Refund</SelectItem></SelectContent></Select></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Plan</Label><Select value={form.plan_id} onValueChange={(v) => setForm({ ...form, plan_id: v })}><SelectTrigger><SelectValue placeholder="Select plan" /></SelectTrigger><SelectContent><SelectItem value="__none__">No plan</SelectItem>{plans.map((p) => <SelectItem key={p.id} value={p.id}>{p.plan_name} ({formatCurrency(Number(p.plan_price))})</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-2"><Label htmlFor="t-amt">Amount (KES)</Label><Input id="t-amt" type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Payment Method</Label><Select value={form.payment_method} onValueChange={(v) => setForm({ ...form, payment_method: v as PaymentMethod })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="mpesa">M-Pesa</SelectItem><SelectItem value="card">Card</SelectItem><SelectItem value="cash">Cash</SelectItem><SelectItem value="bank">Bank</SelectItem></SelectContent></Select></div>
              <div className="space-y-2"><Label>Status</Label><Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as TransactionStatus })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="completed">Completed</SelectItem><SelectItem value="pending">Pending</SelectItem><SelectItem value="failed">Failed</SelectItem></SelectContent></Select></div>
            </div>
            <div className="space-y-2"><Label htmlFor="t-ref">Reference</Label><Input id="t-ref" value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} placeholder="MPESA-XXX or CARD-YYY" /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button><Button onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Record Transaction'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* M-Pesa STK Push dialog */}
      <Dialog open={stkOpen} onOpenChange={setStkOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>M-Pesa STK Push</DialogTitle><DialogDescription>Send a payment prompt to the customer&apos;s phone via Safaricom Daraja API.</DialogDescription></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2"><Label htmlFor="stk-phone">Customer Phone (M-Pesa)</Label><Input id="stk-phone" placeholder="2547XXXXXXXX" value={stkForm.phone} onChange={(e) => setStkForm({ ...stkForm, phone: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Plan (optional)</Label><Select value={stkForm.plan_id} onValueChange={(v) => { const plan = plans.find((p) => p.id === v); setStkForm({ ...stkForm, plan_id: v, amount: plan ? Number(plan.plan_price) : stkForm.amount }); }}><SelectTrigger><SelectValue placeholder="Select plan" /></SelectTrigger><SelectContent><SelectItem value="__none__">No plan</SelectItem>{plans.map((p) => <SelectItem key={p.id} value={p.id}>{p.plan_name}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-2"><Label htmlFor="stk-amt">Amount (KES)</Label><Input id="stk-amt" type="number" value={stkForm.amount} onChange={(e) => setStkForm({ ...stkForm, amount: Number(e.target.value) })} /></div>
            </div>
            <div className="rounded-lg bg-info/5 border border-info/20 p-3 text-xs text-muted-foreground">
              <p className="flex items-center gap-1.5 font-medium text-info"><Smartphone className="h-3.5 w-3.5" /> How it works</p>
              <p className="mt-1.5">An STK push prompt will be sent to the customer&apos;s phone. Once they enter their M-Pesa PIN, the Daraja callback URL will automatically update the transaction status and receipt number.</p>
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setStkOpen(false)}>Cancel</Button><Button onClick={stkPush} disabled={stkLoading} className="gap-1.5">{stkLoading ? 'Sending...' : <><Smartphone className="h-4 w-4" /> Send STK Push</>}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}

function RevenueCard({ label, value, icon: Icon, accent, trend }: { label: string; value: string | number; icon: React.ElementType; accent: string; trend?: 'up' | 'down' }) {
  return (<Card><CardContent className="p-5"><div className="flex items-center justify-between"><div><p className="text-sm font-medium text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-semibold tracking-tight text-foreground">{value}</p></div><div className={`flex h-10 w-10 items-center justify-center rounded-lg bg-muted ${accent}`}><Icon className="h-5 w-5" /></div></div></CardContent></Card>);
}
