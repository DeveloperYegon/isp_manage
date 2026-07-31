'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Wifi, Mail, Lock, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

// Read configuration route domains directly from target environment strings
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://yourwisp.com';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password) {
      toast.error('Enter your email and password');
      return;
    }
    
    setLoading(true);

    try {
      // Fire authorization payload directly down to your droplet node server pipeline
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password: password,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || result.message || 'Invalid email or password');
      }

      // Intercept execution metrics token and linked tenant_id context configurations
      const { token, tenantId } = result.data;

      // Mount into browser local memory context keys to authorize dashboard component loads
      localStorage.setItem('tenant_token', token);
      localStorage.setItem('current_tenant_id', String(tenantId));

      toast.success('Welcome back!');
      
      // Clear out client runtime cache layouts and redirect to application suite
      router.push('/dashboard');
      router.refresh();

    } catch (error: any) {
      console.error('Login authorization compilation execution error:', error);
      toast.error(error.message || 'Authentication block fault. Verify credentials.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
      <div className="w-full max-w-md">
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
            <CardTitle className="text-xl">Sign in to your account</CardTitle>
            <CardDescription>Enter your credentials to access the dashboard</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@isp.co.ke"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-9"
                    autoComplete="email"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-9"
                    autoComplete="current-password"
                  />
                </div>
              </div>
              <Button type="submit" className="w-full gap-1.5" disabled={loading}>
                {loading ? 'Signing in...' : <>Sign In <ArrowRight className="h-4 w-4" /></>}
              </Button>
            </form>

            <div className="mt-6 text-center text-sm text-muted-foreground">
              Don&apos;t have an account?{' '}
              <Link href="/signup" className="font-medium text-primary hover:underline">
                Sign up
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
