'use client';

import { useEffect, useMemo, useState } from 'react';
import { Plus, CreditCard, Search, MoreHorizontal, Pencil, Trash2, Zap, Clock, Database, Users, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import type { RadGroupReply } from '@/lib/types';
import { PageShell } from '@/components/page-shell';
import { StatusBadge } from '@/components/status-badge';
import { TableSkeleton } from '@/components/skeletons';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { formatCurrency, generateRadiusValue } from '@/lib/utils';

const emptyForm = { groupname: '', plan_name: '', plan_description: '', plan_price: 0, plan_down_mbps: 10, plan_up_mbps: 5, plan_duration_hours: 24, plan_data_limit_gb: '' as string | number, is_active: true, sort_order: 0 };

export default function PlansPage() {
  const [plans, setPlans] = useState<RadGroupReply[]>([]);
  const [userCounts, setUserCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [view, setView] = useState<'cards' | 'table'>('cards');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editing, setEditing] = useState<RadGroupReply | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const [pRes, uRes] = await Promise.all([
      supabase.from('radgroupreply').select('*').order('sort_order'),
      supabase.from('radcheck').select('plan_id'),
    ]);
    if (pRes.error) { toast.error('Failed to load plans'); setLoading(false); return; }
    const counts: Record<string, number> = {};
    (uRes.data ?? []).forEach((u: { plan_id: string | null }) => { if (u.plan_id) counts[u.plan_id] = (counts[u.plan_id] ?? 0) + 1; });
    setPlans(pRes.data as RadGroupReply[]);
    setUserCounts(counts);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => plans.filter((p) => !query || p.plan_name.toLowerCase().includes(query.toLowerCase()) || p.groupname.toLowerCase().includes(query.toLowerCase())), [plans, query]);

  function openCreate() { setEditing(null); setForm(emptyForm); setDialogOpen(true); }
  function openEdit(p: RadGroupReply) {
    setEditing(p);
    setForm({ groupname: p.groupname, plan_name: p.plan_name, plan_description: p.plan_description ?? '', plan_price: Number(p.plan_price), plan_down_mbps: p.plan_down_mbps, plan_up_mbps: p.plan_up_mbps, plan_duration_hours: p.plan_duration_hours, plan_data_limit_gb: p.plan_data_limit_gb ?? '', is_active: p.is_active, sort_order: p.sort_order });
    setDialogOpen(true);
  }

  async function save() {
    if (!form.groupname.trim() || !form.plan_name.trim()) { toast.error('Group name and plan name are required'); return; }
    setSaving(true);
    const dataLimit = form.plan_data_limit_gb === '' ? null : Number(form.plan_data_limit_gb);
    const radiusValue = generateRadiusValue(Number(form.plan_down_mbps), Number(form.plan_up_mbps), dataLimit);
    const payload = {
      groupname: form.groupname.trim().replace(/\s+/g, '-').toLowerCase(),
      attribute: 'Mikrotik-Rate-Limit', op: ':=', value: radiusValue,
      plan_name: form.plan_name.trim(),
      plan_description: form.plan_description.trim() || null,
      plan_price: Number(form.plan_price) || 0,
      plan_duration_hours: Number(form.plan_duration_hours) || 1,
      plan_data_limit_gb: dataLimit,
      plan_down_mbps: Number(form.plan_down_mbps) || 1,
      plan_up_mbps: Number(form.plan_up_mbps) || 1,
      is_active: form.is_active,
      sort_order: Number(form.sort_order) || 0,
    };
    let res;
    if (editing) res = await supabase.from('radgroupreply').update(payload).eq('id', editing.id);
    else res = await supabase.from('radgroupreply').insert(payload);
    setSaving(false);
    if (res.error) { toast.error(editing ? 'Failed to update plan' : 'Failed to create plan'); return; }
    toast.success(editing ? 'Plan updated' : 'Plan created');
    setDialogOpen(false); load();
  }

  async function confirmDelete() {
    if (!deleteId) return;
    const { error } = await supabase.from('radgroupreply').delete().eq('id', deleteId);
    if (error) { toast.error('Failed to delete plan'); return; }
    toast.success('Plan deleted'); setDeleteId(null); load();
  }

  return (
    <PageShell title="Service Plans" subtitle="FreeRADIUS group reply attributes (bandwidth plans)" actions={
      <div className="flex items-center gap-2">
        <div className="hidden items-center rounded-lg border bg-card p-0.5 sm:flex">
          <button onClick={() => setView('cards')} className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${view === 'cards' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}>Cards</button>
          <button onClick={() => setView('table')} className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${view === 'table' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}>Table</button>
        </div>
        <Button onClick={openCreate} className="gap-1.5"><Plus className="h-4 w-4" /> Add Plan</Button>
      </div>
    }>
      <div className="mb-5 relative max-w-md"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input placeholder="Search plans..." value={query} onChange={(e) => setQuery(e.target.value)} className="pl-9" /></div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-64 animate-pulse rounded-xl border bg-card" />)}</div>
      ) : view === 'cards' ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {filtered.map((p) => (
            <Card key={p.id} className="group relative flex flex-col transition-shadow hover:shadow-md">
              <div className={`h-1 ${p.is_active ? 'bg-primary' : 'bg-muted-foreground/30'}`} />
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div><CardTitle className="text-base">{p.plan_name}</CardTitle><CardDescription className="mt-1 font-mono text-xs">{p.groupname}</CardDescription></div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 transition-opacity group-hover:opacity-100"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                    <DropdownMenuContent align="end"><DropdownMenuItem onClick={() => openEdit(p)}><Pencil className="mr-2 h-3.5 w-3.5" /> Edit</DropdownMenuItem><DropdownMenuItem className="text-destructive" onClick={() => setDeleteId(p.id)}><Trash2 className="mr-2 h-3.5 w-3.5" /> Delete</DropdownMenuItem></DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col gap-4 pt-0">
                <div><span className="text-2xl font-bold text-foreground">{formatCurrency(Number(p.plan_price))}</span><span className="text-sm text-muted-foreground"> / {p.plan_duration_hours}h</span></div>
                <div className="grid grid-cols-2 gap-3">
                  <Feature icon={Zap} label="Down" value={`${p.plan_down_mbps}M`} />
                  <Feature icon={Zap} label="Up" value={`${p.plan_up_mbps}M`} />
                  <Feature icon={Clock} label="Duration" value={`${p.plan_duration_hours}h`} />
                  <Feature icon={Database} label="Data" value={p.plan_data_limit_gb ? `${p.plan_data_limit_gb}G` : 'Unlimited'} />
                </div>
                <div className="mt-auto flex items-center justify-between border-t pt-3">
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground"><Users className="h-3.5 w-3.5" />{userCounts[p.id] ?? 0} user{(userCounts[p.id] ?? 0) !== 1 ? 's' : ''}</span>
                  <StatusBadge label={p.is_active ? 'active' : 'expired'} variant={p.is_active ? 'success' : 'muted'} />
                </div>
              </CardContent>
            </Card>
          ))}
          {filtered.length === 0 && <div className="col-span-full p-12 text-center"><p className="text-sm text-muted-foreground">No plans found.</p></div>}
        </div>
      ) : (
        <Card><CardContent className="p-0">
          {filtered.length === 0 ? <div className="p-12 text-center"><p className="text-sm text-muted-foreground">No plans found.</p></div> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b text-left">
                  <th className="px-4 py-3 font-medium text-muted-foreground">Plan</th><th className="px-4 py-3 font-medium text-muted-foreground">Price</th><th className="px-4 py-3 font-medium text-muted-foreground">Bandwidth</th><th className="px-4 py-3 font-medium text-muted-foreground">Duration</th><th className="px-4 py-3 font-medium text-muted-foreground">RADIUS Value</th><th className="px-4 py-3 font-medium text-muted-foreground">Users</th><th className="px-4 py-3 font-medium text-muted-foreground">Active</th><th className="w-12" />
                </tr></thead>
                <tbody>
                  {filtered.map((p) => (
                    <tr key={p.id} className="border-b last:border-0 hover:bg-muted/40">
                      <td className="px-4 py-3"><div className="font-medium">{p.plan_name}</div><div className="font-mono text-xs text-muted-foreground">{p.groupname}</div></td>
                      <td className="px-4 py-3 font-medium">{formatCurrency(Number(p.plan_price))}</td>
                      <td className="px-4 py-3 text-muted-foreground">{p.plan_down_mbps}/{p.plan_up_mbps} Mbps</td>
                      <td className="px-4 py-3 text-muted-foreground">{p.plan_duration_hours}h</td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{p.value}</td>
                      <td className="px-4 py-3">{userCounts[p.id] ?? 0}</td>
                      <td className="px-4 py-3"><StatusBadge label={p.is_active ? 'active' : 'expired'} variant={p.is_active ? 'success' : 'muted'} /></td>
                      <td className="px-4 py-3"><DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end"><DropdownMenuItem onClick={() => openEdit(p)}><Pencil className="mr-2 h-3.5 w-3.5" /> Edit</DropdownMenuItem><DropdownMenuItem className="text-destructive" onClick={() => setDeleteId(p.id)}><Trash2 className="mr-2 h-3.5 w-3.5" /> Delete</DropdownMenuItem></DropdownMenuContent>
                      </DropdownMenu></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent></Card>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>{editing ? 'Edit Plan' : 'Add Service Plan'}</DialogTitle><DialogDescription>{editing ? 'Update plan details.' : 'Create a new bandwidth plan (FreeRADIUS radgroupreply).'}</DialogDescription></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label htmlFor="p-name">Plan Name</Label><Input id="p-name" value={form.plan_name} onChange={(e) => setForm({ ...form, plan_name: e.target.value })} placeholder="Daily Pro" /></div>
              <div className="space-y-2"><Label htmlFor="p-group">Group Name</Label><Input id="p-group" value={form.groupname} onChange={(e) => setForm({ ...form, groupname: e.target.value })} placeholder="daily-pro" /></div>
            </div>
            <div className="space-y-2"><Label htmlFor="p-desc">Description</Label><Input id="p-desc" value={form.plan_description} onChange={(e) => setForm({ ...form, plan_description: e.target.value })} placeholder="Streaming & social media" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label htmlFor="p-price">Price (KES)</Label><Input id="p-price" type="number" value={form.plan_price} onChange={(e) => setForm({ ...form, plan_price: Number(e.target.value) })} /></div>
              <div className="space-y-2"><Label htmlFor="p-dur">Duration (hours)</Label><Input id="p-dur" type="number" value={form.plan_duration_hours} onChange={(e) => setForm({ ...form, plan_duration_hours: Number(e.target.value) })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label htmlFor="p-down">Download (Mbps)</Label><Input id="p-down" type="number" value={form.plan_down_mbps} onChange={(e) => setForm({ ...form, plan_down_mbps: Number(e.target.value) })} /></div>
              <div className="space-y-2"><Label htmlFor="p-up">Upload (Mbps)</Label><Input id="p-up" type="number" value={form.plan_up_mbps} onChange={(e) => setForm({ ...form, plan_up_mbps: Number(e.target.value) })} /></div>
            </div>
            <div className="space-y-2"><Label htmlFor="p-data">Data Limit (GB, blank = unlimited)</Label><Input id="p-data" type="number" value={form.plan_data_limit_gb} onChange={(e) => setForm({ ...form, plan_data_limit_gb: e.target.value })} placeholder="Unlimited" /></div>
            <div className="flex items-center justify-between rounded-lg border p-3"><div><Label htmlFor="p-active" className="cursor-pointer">Active</Label><p className="text-xs text-muted-foreground">Available for new subscriptions</p></div><Switch id="p-active" checked={form.is_active} onCheckedChange={(c) => setForm({ ...form, is_active: c })} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button><Button onClick={save} disabled={saving}>{saving ? 'Saving...' : editing ? 'Save Changes' : 'Create Plan'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <DialogContent className="sm:max-w-md"><DialogHeader><DialogTitle>Delete plan?</DialogTitle><DialogDescription>Users on this plan will lose their plan reference.</DialogDescription></DialogHeader><DialogFooter><Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button><Button variant="destructive" onClick={confirmDelete}>Delete</Button></DialogFooter></DialogContent>
      </Dialog>
    </PageShell>
  );
}

function Feature({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (<div className="flex items-center gap-2"><Icon className="h-3.5 w-3.5 text-muted-foreground" /><div><p className="text-[11px] text-muted-foreground">{label}</p><p className="text-sm font-medium">{value}</p></div></div>);
}
