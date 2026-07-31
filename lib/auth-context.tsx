'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type {
  AuthSession,
  Tenant,
  TenantProfile,
  TenantUser,
} from '@/lib/types';

const defaultAuth: AuthSession = {
  user: null,
  profile: null,
  tenant: null,
  tenantUser: null,
  loading: true,
};

const AuthContext = createContext<AuthSession>(defaultAuth);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [auth, setAuth] = useState<AuthSession>(defaultAuth);

  useEffect(() => {
    let active = true;

    async function buildSession(session: Session | null) {
      if (!active) return;
      if (!session?.user) {
        setAuth({ user: null, profile: null, tenant: null, tenantUser: null, loading: false });
        return;
      }

      const userId = session.user.id;

      const [profileRes, tenantUserRes] = await Promise.all([
        supabase.from('tenant_profile').select('*').eq('user_id', userId).maybeSingle(),
        supabase.from('tenant_users').select('*').eq('user_id', userId).maybeSingle(),
      ]);

      if (!active) return;

      let tenant: Tenant | null = null;
      const tenantUser = (tenantUserRes.data as TenantUser) ?? null;

      if (tenantUser?.tenant_id) {
        const { data: tenantData } = await supabase
          .from('tenants')
          .select('*, package:tenant_packages(id, name)')
          .eq('id', tenantUser.tenant_id)
          .maybeSingle();
        if (active) tenant = (tenantData as Tenant) ?? null;
      }

      if (!active) return;
      setAuth({
        user: { id: userId, email: session.user.email ?? '' },
        profile: (profileRes.data as TenantProfile) ?? null,
        tenant,
        tenantUser,
        loading: false,
      });
    }

    supabase.auth.getSession().then(({ data }) => buildSession(data.session));

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      (async () => buildSession(session))();
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
