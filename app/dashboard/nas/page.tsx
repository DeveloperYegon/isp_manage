'use client';

import { useEffect, useMemo, useState } from 'react';
import { Plus, Router, Search, MoreHorizontal, Pencil, Trash2, Wifi, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import type { Nas, NasStatus, RadAcct } from '@/lib/types';
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

interface NasWithLoad extends Nas { activeSessions: number }

const emptyForm = { nasname: '', shortname: '', type: 'other', secret: '', ports: 0, description: '', status: 'online' as NasStatus, location: '', max_connections: 50 };

export default function NasPage() {
  const { tenant } = useAuth();
  const [devices, setDevices] = useState<NasWithLoad[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Nas | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const { data: nasData, error } = await supabase.from('nas').select('*').order('shortname');
    if (error) { toast.error('Failed to load NAS devices'); setLoading(false); return; }
    const { data: sess } = await supabase.from('radacct').select('nasipaddress, status').eq('status', 'connected');
    const loadMap = new Map<string, number>();
    (sess ?? []).forEach((s: Pick<RadAcct, 'nasipaddress' | 'status'>) => {
      if (s.nasipaddress) loadMap.set(s.nasipaddress, (loadMap.get(s.nasipaddress) ?? 0) + 1);
    });
    setDevices((nasData as Nas[]).map((n) => ({ ...n, activeSessions: loadMap.get(n.nasname) ?? 0 })));
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => devices.filter((d) => {
    const mq = !query || d.shortname.toLowerCase().includes(query.toLowerCase()) || d.nasname.includes(query) || (d.location ?? '').toLowerCase().includes(query.toLowerCase());
    const ms = statusFilter === 'all' || d.status === statusFilter;
    return mq && ms;
  }), [devices, query, statusFilter]);

  function openCreate() { setEditing(null); setForm(emptyForm); setDialogOpen(true); }
  function openEdit(n: Nas) {
    setEditing(n);
    setForm({ nasname: n.nasname, shortname: n.shortname, type: n.type, secret: n.secret, ports: n.ports, description: n.description ?? '', status: n.status, location: n.location ?? '', max_connections: n.max_connections });
    setDialogOpen(true);
  }

  async function save() {
    if (!form.nasname.trim() || !form.shortname.trim() || !form.secret.trim()) { toast.error('NAS name, shortname, and secret are required'); return; }
    setSaving(true);
    const payload = { nasname: form.nasname.trim(), shortname: form.shortname.trim(), type: form.type, secret: form.secret.trim(), ports: Number(form.ports) || 0, description: form.description.trim() || null, status: form.status, location: form.location.trim() || null, max_connections: Number(form.max_connections) || 50 };
    let res;
    if (editing) res = await supabase.from('nas').update(payload).eq('id', editing.id);
    else res = await supabase.from('nas').insert(payload);
    setSaving(false);
    if (res.error) { toast.error(editing ? 'Failed to update NAS' : 'Failed to create NAS'); return; }
    toast.success(editing ? 'NAS updated' : 'NAS created');
    setDialogOpen(false); load();
  }

  async function confirmDelete() {
    if (!deleteId) return;
    const { error } = await supabase.from('nas').delete().eq('id', deleteId);
    if (error) { toast.error('Failed to delete NAS'); return; }
    toast.success('NAS deleted'); setDeleteId(null); load();
  }

  return (
    <PageShell title="NAS Devices" subtitle="FreeRADIUS Network Access Servers" actions={<Button onClick={openCreate} className="gap-1.5"><Plus className="h-4 w-4" /> Add NAS</Button>}>
      {!loading && (
        <div className="mb-5 grid gap-4 sm:grid-cols-3">
          <MiniStat label="Total NAS" value={devices.length} icon={Router} accent="text-primary" />
          <MiniStat label="Online" value={devices.filter((d) => d.status === 'online').length} icon={Wifi} accent="text-success" />
          <MiniStat label="Active Connections" value={devices.reduce((s, d) => s + d.activeSessions, 0)} icon={MapPin} accent="text-info" />
        </div>
      )}

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search by name, IP, or location..." value={query} onChange={(e) => setQuery(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent><SelectItem value="all">All Status</SelectItem><SelectItem value="online">Online</SelectItem><SelectItem value="degraded">Degraded</SelectItem><SelectItem value="offline">Offline</SelectItem></SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? <div className="p-4"><TableSkeleton rows={5} cols={5} /></div> : filtered.length === 0 ? (
            <div className="p-12 text-center"><p className="text-sm text-muted-foreground">No NAS devices found.</p></div>
          ) : (
            <Table>
              <TableHeader><TableRow>
                <TableHead>Device</TableHead><TableHead>IP / NAS Name</TableHead><TableHead>Secret</TableHead><TableHead>Load</TableHead><TableHead>Status</TableHead><TableHead className="w-12" />
              </TableRow></TableHeader>
              <TableBody>
                {filtered.map((n) => {
                  const sv = statusVariant(n.status);
                  const loadPct = Math.round((n.activeSessions / n.max_connections) * 100);
                  return (
                    <TableRow key={n.id}>
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary"><Router className="h-4 w-4" /></div>
                          <div><div className="font-medium">{n.shortname}</div><div className="text-xs text-muted-foreground">{n.location ?? '—'}</div></div>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{n.nasname}</TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">{n.secret.slice(0, 4)}••••</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-20 overflow-hidden rounded-full bg-muted">
                            <div className={loadPct > 80 ? 'h-full rounded-full bg-destructive' : loadPct > 50 ? 'h-full rounded-full bg-warning' : 'h-full rounded-full bg-success'} style={{ width: `${loadPct}%` }} />
                          </div>
                          <span className="text-xs text-muted-foreground">{n.activeSessions}/{n.max_connections}</span>
                        </div>
                      </TableCell>
                      <TableCell><StatusBadge label={n.status} variant={sv.variant} pulse={sv.pulse} /></TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEdit(n)}><Pencil className="mr-2 h-3.5 w-3.5" /> Edit</DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive" onClick={() => setDeleteId(n.id)}><Trash2 className="mr-2 h-3.5 w-3.5" /> Delete</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? 'Edit NAS' : 'Add NAS Device'}</DialogTitle><DialogDescription>{editing ? 'Update the NAS device configuration.' : 'Register a new FreeRADIUS Network Access Server.'}</DialogDescription></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label htmlFor="n-short">Short Name</Label><Input id="n-short" value={form.shortname} onChange={(e) => setForm({ ...form, shortname: e.target.value })} placeholder="Central Cafe" /></div>
              <div className="space-y-2"><Label htmlFor="n-nas">NAS IP / Hostname</Label><Input id="n-nas" value={form.nasname} onChange={(e) => setForm({ ...form, nasname: e.target.value })} placeholder="10.0.1.1" /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label htmlFor="n-secret">RADIUS Secret</Label><Input id="n-secret" value={form.secret} onChange={(e) => setForm({ ...form, secret: e.target.value })} placeholder="sharedSecret123" /></div>
              <div className="space-y-2"><Label htmlFor="n-loc">Location</Label><Input id="n-loc" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Nairobi CBD" /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label htmlFor="n-cap">Max Connections</Label><Input id="n-cap" type="number" value={form.max_connections} onChange={(e) => setForm({ ...form, max_connections: Number(e.target.value) })} /></div>
              <div className="space-y-2"><Label>Status</Label><Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as NasStatus })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="online">Online</SelectItem><SelectItem value="degraded">Degraded</SelectItem><SelectItem value="offline">Offline</SelectItem></SelectContent></Select></div>
            </div>
            <div className="space-y-2"><Label htmlFor="n-desc">Description</Label><Input id="n-desc" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="MikroTik hAP ac2" /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button><Button onClick={save} disabled={saving}>{saving ? 'Saving...' : editing ? 'Save Changes' : 'Create NAS'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <DialogContent className="sm:max-w-md"><DialogHeader><DialogTitle>Delete NAS device?</DialogTitle><DialogDescription>This will remove the NAS from your FreeRADIUS configuration.</DialogDescription></DialogHeader><DialogFooter><Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button><Button variant="destructive" onClick={confirmDelete}>Delete</Button></DialogFooter></DialogContent>
      </Dialog>
    </PageShell>
  );
}

function MiniStat({ label, value, icon: Icon, accent }: { label: string; value: number; icon: React.ElementType; accent: string }) {
  return (<Card><CardContent className="flex items-center gap-3 p-4"><div className={`flex h-10 w-10 items-center justify-center rounded-lg bg-muted ${accent}`}><Icon className="h-5 w-5" /></div><div><p className="text-2xl font-semibold text-foreground">{value}</p><p className="text-xs text-muted-foreground">{label}</p></div></CardContent></Card>);
}
