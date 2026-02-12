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
  const data = await res.json();
  return {
    ok: res.ok,
    status: res.status,
    url: res.url,
    data
  };
}