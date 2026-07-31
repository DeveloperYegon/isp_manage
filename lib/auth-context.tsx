'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
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

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://yourwisp.com';

const AuthContext = createContext<AuthSession>(defaultAuth);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [auth, setAuth] = useState<AuthSession>(defaultAuth);

  useEffect(() => {
    let active = true;

    async function loadNodeSession() {
      const token = localStorage.getItem('tenant_token');
      const tenantId = localStorage.getItem('current_tenant_id');

      if (!token || !tenantId) {
        if (active) {
          setAuth({ user: null, profile: null, tenant: null, tenantUser: null, loading: false });
        }
        return;
      }

      try {
        // Query your Node.js Droplet stack configuration profile endpoints to reconstruct states
        const response = await fetch(`${API_BASE_URL}/auth/me`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'X-Tenant-ID': tenantId,
            'Content-Type': 'application/json'
          }
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
          // Token expired or deleted remotely - wipe local settings layout parameters safely
          localStorage.removeItem('tenant_token');
          localStorage.removeItem('current_tenant_id');
          if (active) {
            setAuth({ user: null, profile: null, tenant: null, tenantUser: null, loading: false });
          }
          return;
        }

        const sessionData = result.data; // Expects compiled profile schema blocks array metrics mapping

        if (!active) return;

        setAuth({
          user: { 
            id: sessionData.user.id, 
            email: sessionData.user.email 
          },
          profile: {
            user_id: sessionData.user.id,
            full_name: sessionData.profile.fullName,
            created_at: sessionData.profile.createdAt
          } as TenantProfile,
          tenant: {
            id: sessionData.tenant.id,
            company_name: sessionData.tenant.businessName,
            contact_email: sessionData.tenant.email,
            contact_phone: sessionData.tenant.phone,
            country: sessionData.tenant.country,
            city: sessionData.tenant.city,
            package_id: sessionData.tenant.packageId
          } as Tenant,
          tenantUser: {
            id: sessionData.tenantUser.id,
            tenant_id: sessionData.tenant.id,
            user_id: sessionData.user.id,
            role: sessionData.tenantUser.role
          } as TenantUser,
          loading: false,
        });

      } catch (error) {
        console.error('Session sync fallback block failure:', error);
        if (active) {
          setAuth({ user: null, profile: null, tenant: null, tenantUser: null, loading: false });
        }
      }
    }

    loadNodeSession();

    // Setup an interval pool checker or hook listener to mirror real-time adjustments if required
    const handleStorageChange = () => loadNodeSession();
    window.addEventListener('storage', handleStorageChange);

    return () => {
      active = false;
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
