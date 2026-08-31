export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: string; status: number };

function getCsrfToken(): string | null {
  try {
    const m = document.cookie.match(/(?:^|;\s*)csrf-token=([^;]+)/);
    return m ? decodeURIComponent(m[1]!) : null;
  } catch {
    return null;
  }
}

let csrfWarmupPromise: Promise<void> | null = null;

async function ensureCsrfWarmup(): Promise<void> {
  if (getCsrfToken()) return;
  if (csrfWarmupPromise) return csrfWarmupPromise;
  csrfWarmupPromise = fetch("/api/health", { credentials: "include" })
    .then(() => undefined)
    .catch(() => undefined)
    .finally(() => {
      csrfWarmupPromise = null;
    });
  return csrfWarmupPromise;
}

function getAuthToken(): string | null {
  try {
    const t = localStorage.getItem("token");
    // guard junk persisted by stale builds: "undefined", "", "null"
    if (!t || t === "undefined" || t === "null" || t.trim() === "") return null;
    return t;
  } catch {
    return null;
  }
}

/**
 * Central fetch: credentials:include (cookie) + dual Authorization fallback +
 * CSRF double-submit for mutating methods. Handles both envelope shapes:
 *   array (legacy) and {data, meta} / {data, total, page, limit}
 */
export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers as HeadersInit | undefined);
  if (!headers.has("Content-Type") && init.body && !(init.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  const token = getAuthToken();
  if (token && !headers.has("Authorization")) headers.set("Authorization", `Bearer ${token}`);

  const method = (init.method ?? "GET").toUpperCase();
  if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
    let csrf = getCsrfToken();
    if (!csrf) {
      await ensureCsrfWarmup();
      csrf = getCsrfToken();
    }
    if (csrf && !headers.has("X-CSRF-Token")) headers.set("X-CSRF-Token", csrf);
  }

  const doFetch = async (hdrs: Headers): Promise<Response> => fetch(path, { credentials: "include", ...init, headers: hdrs });

  let res = await doFetch(headers);

  // One retry on CSRF 403: warm up and resend with fresh token
  if (res.status === 403) {
    const text = await res.clone().text().catch(() => "");
    const isMismatch = text.toLowerCase().includes("csrf");
    if (isMismatch) {
      await ensureCsrfWarmup();
      const fresh = getCsrfToken();
      if (fresh) {
        headers.set("X-CSRF-Token", fresh);
        res = await doFetch(headers);
      }
    }
  }

  if (res.status === 401) {
    const text = await res.text().catch(() => "");
    let msg = text || "Unauthorized";
    try {
      const j = JSON.parse(text);
      msg = j.error || j.message || msg || "Unauthorized";
    } catch { if (text.trim()) msg = text.trim(); }
    const err = new Error(msg) as Error & { status: number; body: string };
    err.status = 401;
    err.body = text;
    throw err;
  }
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    let msg = text || res.statusText;
    try {
      const j = JSON.parse(text);
      msg = j.error || j.message || msg;
    } catch {}
    const err = new Error(msg) as Error & { status: number; body: string };
    err.status = res.status;
    err.body = text;
    throw err;
  }
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) {
    return (await res.json()) as T;
  }
  return (await res.text()) as unknown as T;
}

export async function apiGet<T>(path: string, init?: RequestInit): Promise<ApiResult<T>> {
  try {
    const data = await apiFetch<T>(path, { ...init, method: "GET" });
    return { ok: true, data };
  } catch (e) {
    const err = e as Error & { status?: number };
    return { ok: false, error: String(err?.message ?? e), status: err?.status ?? 0 };
  }
}

/** Unwrap additive envelope: array | {data, meta} | {data, total, page, limit} */
export function unwrapList<T>(raw: unknown): { data: T[]; total?: number; page?: number; limit?: number; meta?: unknown } {
  if (Array.isArray(raw)) return { data: raw as T[] };
  if (raw && typeof raw === "object") {
    const o = raw as Record<string, unknown>;
    if (Array.isArray(o["data"])) {
      return {
        data: o["data"] as T[],
        total: typeof o["total"] === "number" ? (o["total"] as number) : (o["meta"] as { total?: number } | undefined)?.total,
        page: typeof o["page"] === "number" ? (o["page"] as number) : undefined,
        limit: typeof o["limit"] === "number" ? (o["limit"] as number) : undefined,
        meta: o["meta"],
      };
    }
  }
  return { data: [] };
}
