/** LRU cache — Works on Workers (per-isolate). For distributed prod, swap to KV/Durable Object. Ported from lib/cache.ts */
export class LRUCache<T> {
  private max: number;
  private cache: Map<string, { value: T; expiresAt: number }>;
  constructor(max = 1000) {
    this.max = max;
    this.cache = new Map();
  }
  get(key: string): T | undefined {
    const item = this.cache.get(key);
    if (!item) return undefined;
    if (Date.now() > item.expiresAt) {
      this.cache.delete(key);
      return undefined;
    }
    this.cache.delete(key);
    this.cache.set(key, item);
    return item.value;
  }
  set(key: string, value: T, ttlMs: number): void {
    if (this.cache.has(key)) this.cache.delete(key);
    else if (this.cache.size >= this.max) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) this.cache.delete(firstKey);
    }
    this.cache.set(key, { value, expiresAt: Date.now() + ttlMs });
  }
  delete(key: string): void {
    this.cache.delete(key);
  }
  purgeStale(): void {
    const now = Date.now();
    this.cache.forEach((item, key) => {
      if (now > item.expiresAt) this.cache.delete(key);
    });
  }
}

const rateLimitCache = new LRUCache<{ count: number }>(5000);

export function checkRateLimit(ip: string, limit = 10, windowMs = 60_000): { success: boolean; current: number } {
  if (Math.random() < 0.1) rateLimitCache.purgeStale();
  const record = rateLimitCache.get(ip);
  if (!record) {
    rateLimitCache.set(ip, { count: 1 }, windowMs);
    return { success: true, current: 1 };
  }
  record.count++;
  rateLimitCache.set(ip, record, windowMs);
  return { success: record.count <= limit, current: record.count };
}

const revokedTokens = new LRUCache<boolean>(2000);
export function revokeToken(token: string, tokenAgeMs = 7 * 24 * 60 * 60 * 1000): void {
  revokedTokens.set(token, true, tokenAgeMs);
}
export function isTokenRevoked(token: string): boolean {
  return revokedTokens.get(token) === true;
}
