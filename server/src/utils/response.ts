import type { Context } from "hono";

export function ok<T>(c: Context, data: T, meta?: Record<string, unknown>, headers?: Record<string, string>) {
  const body: Record<string, unknown> = { data };
  if (meta) body["meta"] = meta;
  // Additive: also keep array shape for backward compat when data is array and caller expects array
  // But we always return {data, meta}. FE handles both: Array.isArray(j) ? {data:j} : j
  return c.json(body as unknown as T & { meta?: unknown }, 200, headers as any);
}

export function paginated<T>(c: Context, data: T[], total: number, page: number, limit: number, headers?: Record<string, string>) {
  return c.json({ data, total, page, limit, meta: { total, page, limit } } as unknown as T, 200, headers as any);
}

export function fail(c: Context, code: string, message: string, status: number = 400) {
  return c.json({ error: message, code }, status as any);
}
