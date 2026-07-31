'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Wifi, Mail, Lock, User, Building2, Phone, ArrowRight, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const COUNTRIES = [
  'Kenya', 'Uganda', 'Tanzania', 'Rwanda', 'Nigeria', 'Ghana', 'South Africa', 'Ethiopia', 'Other',
];

function SignupForm() {
  const router = useRouter();
  const params = useSearchParams();
  const selectedPackage = params.get('package');

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [phone, setPhone] = useState('');
  const [country, setCountry] = useState('Kenya');
  const [city, setCity] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!fullName.trim() || !email.trim() || !password || !companyName.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    setLoading(true);

    // 1. Create auth account
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
    });
    if (authError) {
      setLoading(false);
      if (authError.message.includes('already registered')) {
        toast.error('An account with this email already exists. Please sign in.');
      } else {
        toast.error('Could not create your account. Please try again.');
      }
      return;
    }
    if (!authData.user) {
      setLoading(false);
      toast.error('Account creation failed. Please try again.');
      return;
    }

    const userId = authData.user.id;

    // 2. Create profile + tenant via RPC
    // First try to claim the demo tenant (gives instant data)
    const { data: claimed } = await supabase.rpc('claim_demo_tenant');

    if (!claimed) {
      // Demo already claimed — create a fresh tenant
      const { error: tenantError } = await supabase.rpc('create_tenant', {
        p_company_name: companyName.trim(),
        p_contact_email: email.trim(),
        p_contact_phone: phone.trim() || null,
        p_country: country,
        p_city: city.trim() || null,
        p_package_id: selectedPackage || null,
      });
      if (tenantError) {
        setLoading(false);
        toast.error('Account created but tenant setup failed. Please contact support.');
        return;
      }
    } else {
      // Claimed demo tenant — update its company name to the user's
      await supabase
        .from('tenants')
        .update({ company_name: companyName.trim(), contact_email: email.trim(), contact_phone: phone.trim() || null })
        .eq('id', 'd0000000-0000-0000-0000-000000000001');
    }

    // 3. Create profile
    await supabase.from('tenant_profile').upsert({
      user_id: userId,
      full_name: fullName.trim(),
    });

    setLoading(false);
    toast.success('Account created! Welcome to WispNet.');
    router.push('/dashboard');
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4 py-8">
      <div className="w-full max-w-lg">
        <div className="mb-6 flex flex-col items-center">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Wifi className="h-5 w-5" />
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-base font-bold text-foreground">WispNet</span>
              <span className="text-xs text-muted-foreground">Hotspot Management</span>
            </div>
          </Link>
        </div>

        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-xl">Create your ISP account</CardTitle>
            <CardDescription>
              Start your 14-day free trial. No credit card required.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name *</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="fullName"
                    placeholder="John Doe"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="company">Company / ISP Name *</Label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="company"
                    placeholder="Acme Internet Ltd"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@isp.co.ke"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password *</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="Min 6 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="phone"
                      placeholder="+254700000000"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Country</Label>
                  <Select value={country} onValueChange={setCountry}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {COUNTRIES.map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="city"
                    placeholder="Nairobi"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>

              <Button type="submit" className="w-full gap-1.5" disabled={loading}>
                {loading ? 'Creating account...' : <>Create Account <ArrowRight className="h-4 w-4" /></>}
              </Button>
            </form>

            <div className="mt-6 text-center text-sm text-muted-foreground">
              Already have an account?{' '}
              <Link href="/login" className="font-medium text-primary hover:underline">
                Sign in
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><Wifi className="h-8 w-8 animate-pulse text-primary" /></div>}>
      <SignupForm />
    </Suspense>
  );
}
