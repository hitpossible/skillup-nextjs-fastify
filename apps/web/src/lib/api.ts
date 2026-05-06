const BASE_URL = process.env["NEXT_PUBLIC_API_URL"] ?? "http://localhost:3001/api/v1";

export function getFullImageUrl(url: string | null | undefined) {
  if (!url) return "";
  if (url.startsWith("http") || url.startsWith("blob:") || url.startsWith("data:")) return url;
  const apiBase = BASE_URL.replace(/\/api\/v1\/?$/, "");
  return `${apiBase}${url.startsWith("/") ? "" : "/"}${url}`;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string
  ) {
    super(message);
  }
}

export async function apiFetch<T>(
  path: string,
  options?: RequestInit & { token?: string }
): Promise<T> {
  const { token, ...init } = options ?? {};
  const headers: HeadersInit = {
    ...(init.body ? { "Content-Type": "application/json" } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...init.headers,
  };
  const res = await fetch(`${BASE_URL}${path}`, { ...init, headers });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(
      res.status,
      body?.error?.code ?? "UNKNOWN",
      body?.error?.message ?? res.statusText
    );
  }
  return res.json() as Promise<T>;
}
