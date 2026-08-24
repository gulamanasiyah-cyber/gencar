/** Minimal fetch wrapper untuk member (frontend mock → real via proxy). */
export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: string; status: number };

export async function apiGet<T>(path: string, init?: RequestInit): Promise<ApiResult<T>> {
  try {
    const r = await fetch(path, { credentials: "include", ...init });
    if (!r.ok) {
      const text = await r.text().catch(() => "");
      return { ok: false, error: text || r.statusText, status: r.status };
    }
    const data = (await r.json()) as T;
    return { ok: true, data };
  } catch (e) {
    return { ok: false, error: String((e as Error)?.message ?? e), status: 0 };
  }
}
