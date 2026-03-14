export interface ApiResponse<T> {
  ok: boolean;
  status: number;
  url: string;
  data: T;
}

export async function apiFetch<T>(
  input: RequestInfo,
  init?: RequestInit
): Promise<ApiResponse<T>> {
  const res = await fetch(input, init);
  const data = await res.json().catch(() => ({}));
  return {
    ok: res.ok,
    status: res.status,
    url: res.url,
    data: data as T
  };
}

const baseUrl = (process.env.NEXT_PUBLIC_BACKEND_URL || '').replace(/\/$/, '');

function buildUrl(path: string): string {
  return `${baseUrl}${path}`;
}

function getAuthHeaders(): Record<string, string> {
  const token =
    typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;

  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
}

export function getMenuWeeks() { return apiFetch<any[]>(buildUrl('/admin/menu/weeks/'), { headers: getAuthHeaders() }); }
export function createMenuWeek(payload: { selling_days: string; status: string; published: boolean; starts_at: string; }) {
  return apiFetch<any>(buildUrl('/admin/menu/weeks/'), { method: 'POST', headers: getAuthHeaders(), body: JSON.stringify(payload) });
}
export function updateMenuWeek(id: number, payload: Partial<{ selling_days: string; status: string; published: boolean; starts_at: string; }>) {
  return apiFetch<any>(buildUrl(`/admin/menu/weeks/${id}`), { method: 'PATCH', headers: getAuthHeaders(), body: JSON.stringify(payload) });
}
export function getWeekItems(weekId: number) { return apiFetch<any[]>(buildUrl(`/admin/menu/weeks/${weekId}/items`), { headers: getAuthHeaders() }); }
export function createMenuItem(payload: { menu_week_id: number; name: string; description?: string; photo_url?: string; price_cents: number; available: boolean; }) {
  return apiFetch<any>(buildUrl('/admin/menu/items/'), { method: 'POST', headers: getAuthHeaders(), body: JSON.stringify(payload) });
}
export function updateMenuItem(id: number, payload: Partial<{ name: string; description?: string; photo_url?: string; price_cents: number; available: boolean; }>) {
  return apiFetch<any>(buildUrl(`/admin/menu/items/${id}`), { method: 'PATCH', headers: getAuthHeaders(), body: JSON.stringify(payload) });
}

export function getAdminOrders() { return apiFetch<any[]>(buildUrl('/api/admin/orders/'), { headers: getAuthHeaders() }); }
export function getAdminOrdersTally() { return apiFetch<any>(buildUrl('/api/admin/orders/tally'), { headers: getAuthHeaders() }); }
export function updateAdminOrderStatus(orderId: number, status: string) {
  return apiFetch<any>(buildUrl(`/api/admin/orders/${orderId}/status`), { method: 'PATCH', headers: getAuthHeaders(), body: JSON.stringify({ status }) });
}
export function updateAdminOrder(orderId: number, payload: any) {
  return apiFetch<any>(buildUrl(`/api/admin/orders/${orderId}`), { method: 'PATCH', headers: getAuthHeaders(), body: JSON.stringify(payload) });
}
export function deleteAdminOrder(orderId: number) {
  return apiFetch<any>(buildUrl(`/api/admin/orders/${orderId}`), { method: 'DELETE', headers: getAuthHeaders() });
}
export function createAdminOrder(payload: any) {
  return apiFetch<any>(buildUrl('/api/admin/orders/'), { method: 'POST', headers: getAuthHeaders(), body: JSON.stringify(payload) });
}

export function getCustomers() { return apiFetch<any[]>(buildUrl('/api/admin/customers/'), { headers: getAuthHeaders() }); }
export function createCustomer(payload: any) {
  return apiFetch<any>(buildUrl('/api/admin/customers/'), { method: 'POST', headers: getAuthHeaders(), body: JSON.stringify(payload) });
}
export function updateCustomer(id: number, payload: any) {
  return apiFetch<any>(buildUrl(`/api/admin/customers/${id}`), { method: 'PATCH', headers: getAuthHeaders(), body: JSON.stringify(payload) });
}
export function deleteCustomer(id: number) { return apiFetch<any>(buildUrl(`/api/admin/customers/${id}`), { method: 'DELETE', headers: getAuthHeaders() }); }

export function getAdminSettings() {
  return apiFetch<{ data: Record<string, any> }>(buildUrl('/api/admin/settings'), { headers: getAuthHeaders() });
}
export function updateAdminSettings(data: Record<string, any>) {
  return apiFetch<{ data: Record<string, any> }>(buildUrl('/api/admin/settings'), { method: 'PUT', headers: getAuthHeaders(), body: JSON.stringify({ data }) });
}
