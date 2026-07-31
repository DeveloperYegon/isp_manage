'use client';

import { useEffect, useState } from 'react';
import { Building2, MapPin, Mail, Phone, CreditCard, Calendar, Users, Router, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import type { Tenant, TenantPackage } from '@/lib/types';
import { PageShell } from '@/components/page-shell';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatCurrency, formatDate } from '@/lib/utils';

export default function SettingsPage() {
  const { tenant, profile, user } = useAuth();
  const [packages, setPackages] = useState<TenantPackage[]>([]);
  const [counts, setCounts] = useState({ nas: 0, users: 0, plans: 0 });
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ company_name: '', contact_email: '', contact_phone: '', country: 'Kenya', city: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!tenant) return;
    setForm({ company_name: tenant.company_name, contact_email: tenant.contact_email, contact_phone: tenant.contact_phone ?? '', country: tenant.country, city: tenant.city ?? '' });
    supabase.from('tenant_packages').select('*').eq('is_active', true).order('sort_order').then(({ data }) => setPackages((data as TenantPackage[]) ?? []));
    Promise.all([
      supabase.from('nas').select('id', { count: 'exact', head: true }),
      supabase.from('radcheck').select('id', { count: 'exact', head: true }).eq('is_voucher', false),
      supabase.from('radgroupreply').select('id', { count: 'exact', head: true }),
    ]).then(([n, u, p]) => setCounts({ nas: n.count ?? 0, users: u.count ?? 0, plans: p.count ?? 0 }));
  }, [tenant]);

  async function saveProfile() {
    if (!tenant) return;
    setSaving(true);
    const { error } = await supabase.from('tenants').update({
      company_name: form.company_name.trim(),
      contact_email: form.contact_email.trim(),
      contact_phone: form.contact_phone.trim() || null,
      country: form.country,
      city: form.city.trim() || null,
    }).eq('id', tenant.id);
    setSaving(false);
    if (error) { toast.error('Failed to save settings'); return; }
    toast.success('Settings saved'); setEditing(false);
  }

  if (!tenant) {
    return <PageShell title="Settings" subtitle="Account & subscription"><Card><CardContent className="p-8 text-center text-sm text-muted-foreground">Loading...</CardContent></Card></PageShell>;
  }

  const trialEnded = tenant.trial_ends_at && new Date(tenant.trial_ends_at) < new Date();
  const trialDaysLeft = tenant.trial_ends_at ? Math.max(0, Math.ceil((new Date(tenant.trial_ends_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24))) : 0;

  return (
    <PageShell title="Settings" subtitle="Account & subscription management">
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Company info */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div><CardTitle className="text-base">Company Information</CardTitle><CardDescription>Your ISP company details</CardDescription></div>
              {!editing && <Button variant="outline" size="sm" onClick={() => setEditing(true)}>Edit</Button>}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {editing ? (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label htmlFor="s-company">Company Name</Label><Input id="s-company" value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} /></div>
                  <div className="space-y-2"><Label htmlFor="s-email">Contact Email</Label><Input id="s-email" type="email" value={form.contact_email} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label htmlFor="s-phone">Phone</Label><Input id="s-phone" value={form.contact_phone} onChange={(e) => setForm({ ...form, contact_phone: e.target.value })} /></div>
                  <div className="space-y-2"><Label>Country</Label><Select value={form.country} onValueChange={(v) => setForm({ ...form, country: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Kenya">Kenya</SelectItem><SelectItem value="Uganda">Uganda</SelectItem><SelectItem value="Tanzania">Tanzania</SelectItem><SelectItem value="Rwanda">Rwanda</SelectItem><SelectItem value="Nigeria">Nigeria</SelectItem><SelectItem value="Ghana">Ghana</SelectItem><SelectItem value="South Africa">South Africa</SelectItem><SelectItem value="Other">Other</SelectItem></SelectContent></Select></div>
                </div>
                <div className="space-y-2"><Label htmlFor="s-city">City</Label><Input id="s-city" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
                <div className="flex gap-2"><Button onClick={saveProfile} disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</Button><Button variant="outline" onClick={() => setEditing(false)}>Cancel</Button></div>
              </>
            ) : (
              <div className="space-y-3">
                <InfoRow icon={Building2} label="Company" value={tenant.company_name} />
                <InfoRow icon={Mail} label="Email" value={tenant.contact_email} />
                <InfoRow icon={Phone} label="Phone" value={tenant.contact_phone ?? '—'} />
                <InfoRow icon={MapPin} label="Location" value={`${tenant.city ?? '—'}, ${tenant.country}`} />
                <InfoRow icon={Users} label="Account Owner" value={profile?.full_name ?? user?.email ?? '—'} />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Subscription */}
        <Card>
          <CardHeader><CardTitle className="text-base">Subscription</CardTitle><CardDescription>Current plan & status</CardDescription></CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">Current Plan</span>
                <span className="text-sm font-semibold text-foreground">{tenant.package?.name ?? 'Starter'}</span>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">Status</span>
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${tenant.subscription_status === 'trial' ? 'bg-warning/15 text-warning' : tenant.subscription_status === 'active' ? 'bg-success/15 text-success' : 'bg-destructive/15 text-destructive'}`}>{tenant.subscription_status}</span>
              </div>
              {tenant.subscription_status === 'trial' && (
                <div className="mt-3">
                  {trialEnded ? (
                    <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-2 text-xs text-destructive"><AlertCircle className="h-4 w-4" /> Trial expired</div>
                  ) : (
                    <div className="flex items-center gap-2 rounded-lg bg-warning/10 p-2 text-xs text-warning"><Calendar className="h-4 w-4" /> {trialDaysLeft} days remaining</div>
                  )}
                </div>
              )}
              {tenant.subscription_ends_at && (
                <div className="mt-2 text-xs text-muted-foreground">Renews: {formatDate(tenant.subscription_ends_at)}</div>
              )}
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground">RESOURCE USAGE</p>
              <UsageBar icon={Router} label="NAS Devices" used={counts.nas} max={tenant.max_nas} />
              <UsageBar icon={Users} label="RADIUS Users" used={counts.users} max={tenant.max_users} />
              <UsageBar icon={CreditCard} label="Service Plans" used={counts.plans} max={50} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Available packages */}
      <Card className="mt-6">
        <CardHeader><CardTitle className="text-base">Available Plans</CardTitle><CardDescription>Upgrade or change your subscription</CardDescription></CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {packages.map((pkg) => (
              <div key={pkg.id} className={`rounded-xl border p-5 ${pkg.id === tenant.package_id ? 'border-primary ring-1 ring-primary/20' : ''}`}>
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold">{pkg.name}</h4>
                  {pkg.id === tenant.package_id && <CheckCircle2 className="h-4 w-4 text-primary" />}
                </div>
                <p className="mt-2 text-2xl font-bold">{formatCurrency(Number(pkg.price_monthly))}<span className="text-sm font-normal text-muted-foreground">/mo</span></p>
                <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                  <div>{pkg.max_nas >= 999 ? 'Unlimited' : pkg.max_nas} NAS devices</div>
                  <div>{pkg.max_users >= 999999 ? 'Unlimited' : pkg.max_users.toLocaleString()} RADIUS users</div>
                </div>
                {pkg.id !== tenant.package_id && <Button variant="outline" size="sm" className="mt-4 w-full" onClick={() => toast.info('Subscription upgrades require M-Pesa payment integration. Contact support.')}>Upgrade</Button>}
                {pkg.id === tenant.package_id && <div className="mt-4 text-center text-xs font-medium text-primary">Current Plan</div>}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </PageShell>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (<div className="flex items-center gap-3"><div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-muted-foreground"><Icon className="h-4 w-4" /></div><div className="flex-1"><p className="text-xs text-muted-foreground">{label}</p><p className="text-sm font-medium text-foreground">{value}</p></div></div>);
}

function UsageBar({ icon: Icon, label, used, max }: { icon: React.ElementType; label: string; used: number; max: number }) {
  const pct = Math.min(100, Math.round((used / max) * 100));
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs"><span className="flex items-center gap-1.5 text-muted-foreground"><Icon className="h-3.5 w-3.5" /> {label}</span><span className="font-medium text-foreground">{used} / {max >= 999 ? '∞' : max.toLocaleString()}</span></div>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted"><div className={`h-full rounded-full ${pct > 80 ? 'bg-destructive' : pct > 50 ? 'bg-warning' : 'bg-success'}`} style={{ width: `${pct}%` }} /></div>
    </div>
  );
}
