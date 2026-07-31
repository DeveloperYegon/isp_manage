'use client';

import { useEffect, useMemo, useState } from 'react';
import { Plus, Users, Search, MoreHorizontal, Pencil, Trash2, Ticket, UserCircle } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import type { RadCheck, RadGroupReply, UserStatus } from '@/lib/types';
import { PageShell } from '@/components/page-shell';
import { StatusBadge, statusVariant } from '@/components/status-badge';
import { TableSkeleton } from '@/components/skeletons';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatMB, formatRelativeTime, initials } from '@/lib/utils';

const emptyForm = { username: '', value: '', plan_id: '__none__', status: 'active' as UserStatus, full_name: '', phone: '', email: '', is_voucher: false };

export default function UsersPage() {
  const [users, setUsers] = useState<RadCheck[]>([]);
  const [plans, setPlans] = useState<RadGroupReply[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editing, setEditing] = useState<RadCheck | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const [u, p] = await Promise.all([
      supabase.from('radcheck').select('*, plan:radgroupreply(id,plan_name)').order('created_at', { ascending: false }),
      supabase.from('radgroupreply').select('*').order('sort_order'),
    ]);
    if (u.error) { toast.error('Failed to load users'); setLoading(false); return; }
    setUsers(u.data as RadCheck[]);
    setPlans((p.data as RadGroupReply[]) ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => users.filter((u) => {
    const mq = !query || u.username.toLowerCase().includes(query.toLowerCase()) || (u.full_name ?? '').toLowerCase().includes(query.toLowerCase()) || (u.email ?? '').toLowerCase().includes(query.toLowerCase());
    const ms = statusFilter === 'all' || u.status === statusFilter;
    const mt = typeFilter === 'all' || (typeFilter === 'regular' && !u.is_voucher) || (typeFilter === 'voucher' && u.is_voucher);
    return mq && ms && mt;
  }), [users, query, statusFilter, typeFilter]);

  function openCreate() { setEditing(null); setForm(emptyForm); setDialogOpen(true); }
  function openEdit(u: RadCheck) {
    setEditing(u);
    setForm({ username: u.username, value: u.value, plan_id: u.plan_id ?? '__none__', status: u.status, full_name: u.full_name ?? '', phone: u.phone ?? '', email: u.email ?? '', is_voucher: u.is_voucher });
    setDialogOpen(true);
  }

  async function save() {
    if (!form.username.trim() || !form.value.trim()) { toast.error('Username and password are required'); return; }
    setSaving(true);
    const payload = {
      username: form.username.trim(),
      attribute: 'Cleartext-Password', op: ':=',
      value: form.value.trim(),
      plan_id: form.plan_id === '__none__' ? null : form.plan_id,
      status: form.status,
      full_name: form.full_name.trim() || null,
      phone: form.phone.trim() || null,
      email: form.email.trim() || null,
      is_voucher: form.is_voucher,
    };
    let res;
    if (editing) res = await supabase.from('radcheck').update(payload).eq('id', editing.id);
    else res = await supabase.from('radcheck').insert(payload);
    setSaving(false);
    if (res.error) { toast.error(editing ? 'Failed to update user' : 'Failed to create user'); return; }

    // Sync radusergroup
    if (form.plan_id !== '__none__') {
      const plan = plans.find((p) => p.id === form.plan_id);
      if (plan) {
        if (editing) {
          await supabase.from('radusergroup').delete().eq('username', editing.username);
        }
        await supabase.from('radusergroup').insert({ username: form.username.trim(), groupname: plan.groupname, priority: 1 });
      }
    }
    toast.success(editing ? 'User updated' : 'User created');
    setDialogOpen(false); load();
  }

  async function confirmDelete() {
    if (!deleteId) return;
    const user = users.find((u) => u.id === deleteId);
    if (user) await supabase.from('radusergroup').delete().eq('username', user.username);
    const { error } = await supabase.from('radcheck').delete().eq('id', deleteId);
    if (error) { toast.error('Failed to delete user'); return; }
    toast.success('User deleted'); setDeleteId(null); load();
  }

  return (
    <PageShell title="RADIUS Users" subtitle="FreeRADIUS user accounts & credentials" actions={<Button onClick={openCreate} className="gap-1.5"><Plus className="h-4 w-4" /> Add User</Button>}>
      {!loading && (
        <div className="mb-5 grid gap-4 sm:grid-cols-3">
          <MiniStat label="Total Users" value={users.filter((u) => !u.is_voucher).length} icon={Users} accent="text-primary" />
          <MiniStat label="Active" value={users.filter((u) => u.status === 'active' && !u.is_voucher).length} icon={UserCircle} accent="text-success" />
          <MiniStat label="Vouchers" value={users.filter((u) => u.is_voucher).length} icon={Ticket} accent="text-info" />
        </div>
      )}

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input placeholder="Search by username, name, or email..." value={query} onChange={(e) => setQuery(e.target.value)} className="pl-9" /></div>
        <Select value={typeFilter} onValueChange={setTypeFilter}><SelectTrigger className="w-full lg:w-36"><SelectValue placeholder="Type" /></SelectTrigger><SelectContent><SelectItem value="all">All Types</SelectItem><SelectItem value="regular">Regular Users</SelectItem><SelectItem value="voucher">Vouchers</SelectItem></SelectContent></Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger className="w-full lg:w-36"><SelectValue placeholder="Status" /></SelectTrigger><SelectContent><SelectItem value="all">All Status</SelectItem><SelectItem value="active">Active</SelectItem><SelectItem value="disabled">Disabled</SelectItem><SelectItem value="expired">Expired</SelectItem></SelectContent></Select>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? <div className="p-4"><TableSkeleton rows={8} cols={6} /></div> : filtered.length === 0 ? (
            <div className="p-12 text-center"><p className="text-sm text-muted-foreground">No users found.</p></div>
          ) : (
            <Table>
              <TableHeader><TableRow>
                <TableHead>User</TableHead><TableHead>Username</TableHead><TableHead>Plan</TableHead><TableHead>Data Used</TableHead><TableHead>Created</TableHead><TableHead>Status</TableHead><TableHead className="w-12" />
              </TableRow></TableHeader>
              <TableBody>
                {filtered.map((u) => {
                  const sv = statusVariant(u.status);
                  return (
                    <TableRow key={u.id}>
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className={`text-xs font-semibold ${u.is_voucher ? 'bg-info/10 text-info' : 'bg-primary/10 text-primary'}`}>
                              {u.is_voucher ? <Ticket className="h-4 w-4" /> : (u.full_name ? initials(u.full_name) : '?')}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="text-sm font-medium">{u.full_name ?? (u.is_voucher ? 'Voucher' : '—')}</div>
                            {u.is_voucher && <span className="text-[10px] text-info">Voucher account</span>}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{u.username}</TableCell>
                      <TableCell>{u.plan ? <span className="text-sm">{u.plan.plan_name}</span> : <span className="text-sm text-muted-foreground">No plan</span>}</TableCell>
                      <TableCell className="text-sm">{formatMB(Number(u.data_used_mb))}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{formatRelativeTime(u.created_at)}</TableCell>
                      <TableCell><StatusBadge label={u.status} variant={sv.variant} /></TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEdit(u)}><Pencil className="mr-2 h-3.5 w-3.5" /> Edit</DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive" onClick={() => setDeleteId(u.id)}><Trash2 className="mr-2 h-3.5 w-3.5" /> Delete</DropdownMenuItem>
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
          <DialogHeader><DialogTitle>{editing ? 'Edit User' : 'Add RADIUS User'}</DialogTitle><DialogDescription>{editing ? 'Update user credentials and plan.' : 'Create a new FreeRADIUS user account.'}</DialogDescription></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label htmlFor="u-user">Username</Label><Input id="u-user" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} placeholder="john.doe" /></div>
              <div className="space-y-2"><Label htmlFor="u-pass">Password</Label><Input id="u-pass" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} placeholder="password123" /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label htmlFor="u-name">Full Name</Label><Input id="u-name" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} placeholder="John Doe" /></div>
              <div className="space-y-2"><Label>Plan</Label><Select value={form.plan_id} onValueChange={(v) => setForm({ ...form, plan_id: v })}><SelectTrigger><SelectValue placeholder="Select plan" /></SelectTrigger><SelectContent><SelectItem value="__none__">No plan</SelectItem>{plans.map((p) => <SelectItem key={p.id} value={p.id}>{p.plan_name}</SelectItem>)}</SelectContent></Select></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label htmlFor="u-phone">Phone</Label><Input id="u-phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+254700000000" /></div>
              <div className="space-y-2"><Label htmlFor="u-email">Email</Label><Input id="u-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="john@email.com" /></div>
            </div>
            <div className="space-y-2"><Label>Status</Label><Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as UserStatus })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="disabled">Disabled</SelectItem><SelectItem value="expired">Expired</SelectItem></SelectContent></Select></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button><Button onClick={save} disabled={saving}>{saving ? 'Saving...' : editing ? 'Save Changes' : 'Create User'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <DialogContent className="sm:max-w-md"><DialogHeader><DialogTitle>Delete user?</DialogTitle><DialogDescription>This will remove the RADIUS user and their group mapping.</DialogDescription></DialogHeader><DialogFooter><Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button><Button variant="destructive" onClick={confirmDelete}>Delete</Button></DialogFooter></DialogContent>
      </Dialog>
    </PageShell>
  );
}

function MiniStat({ label, value, icon: Icon, accent }: { label: string; value: number; icon: React.ElementType; accent: string }) {
  return (<Card><CardContent className="flex items-center gap-3 p-4"><div className={`flex h-10 w-10 items-center justify-center rounded-lg bg-muted ${accent}`}><Icon className="h-5 w-5" /></div><div><p className="text-2xl font-semibold text-foreground">{value}</p><p className="text-xs text-muted-foreground">{label}</p></div></CardContent></Card>);
}
