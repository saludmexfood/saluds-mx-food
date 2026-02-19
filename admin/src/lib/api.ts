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

const baseUrl = (process.env.NEXT_PUBLIC_BACKEND_URL || "").replace(/\/$/, "");

function buildUrl(path: string): string {
  return `${baseUrl}${path}`;
}

function getAuthHeaders(): Record<string, string> {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("access_token") : null;

  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
}

export function getMenuWeeks() {
  return apiFetch<any[]>(buildUrl("/admin/menu/weeks/"), {
    headers: getAuthHeaders()
  });
}

export function createMenuWeek(payload: {
  selling_days: string;
  status: string;
  published: boolean;
  starts_at: string;
}) {
  return apiFetch<any>(buildUrl("/admin/menu/weeks/"), {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload)
  });
}

export function updateMenuWeek(
  id: number,
  payload: Partial<{
    selling_days: string;
    status: string;
    published: boolean;
    starts_at: string;
  }>
) {
  return apiFetch<any>(buildUrl(`/admin/menu/weeks/${id}`), {
    method: "PATCH",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload)
  });
}

export function getWeekItems(weekId: number) {
  return apiFetch<any[]>(buildUrl(`/admin/menu/weeks/${weekId}/items`), {
    headers: getAuthHeaders()
  });
}

export function createMenuItem(payload: {
  menu_week_id: number;
  name: string;
  description?: string;
  photo_url?: string;
  price_cents: number;
  available: boolean;
}) {
  return apiFetch<any>(buildUrl("/admin/menu/items/"), {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload)
  });
}

export function updateMenuItem(
  id: number,
  payload: Partial<{
    name: string;
    description?: string;
    photo_url?: string;
    price_cents: number;
    available: boolean;
  }>
) {
  return apiFetch<any>(buildUrl(`/admin/menu/items/${id}`), {
    method: "PATCH",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload)
  });
}
