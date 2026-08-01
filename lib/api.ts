const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://yourwisp.com';

type ApiOptions = RequestInit & { noJson?: boolean };

export async function apiFetch<T = any>(path: string, options: ApiOptions = {}) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  };

  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('tenant_token');
    const tenantId = localStorage.getItem('current_tenant_id');

    if (token) headers.Authorization = `Bearer ${token}`;
    if (tenantId) headers['X-Tenant-ID'] = tenantId;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
    body:
      options.body && typeof options.body !== 'string'
        ? JSON.stringify(options.body)
        : options.body,
  });

  if (options.noJson) {
    if (!response.ok) {
      throw new Error(response.statusText || 'API request failed');
    }
    return null as unknown as T;
  }

  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const message =
      payload?.message || payload?.error || response.statusText || 'API request failed';
    throw new Error(message);
  }

  if (payload && typeof payload === 'object' && 'success' in payload) {
    if (!payload.success) {
      throw new Error(payload.message || 'API request failed');
    }
    return payload.data as T;
  }

  return payload as T;
}
