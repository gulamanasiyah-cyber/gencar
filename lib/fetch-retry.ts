// fetch yang otomatis mencoba ulang saat server membalas 429 (rate limit).
export async function fetchRetry(
  input: RequestInfo | URL,
  init?: RequestInit,
  retries = 3
): Promise<Response> {
  let res = await fetch(input, init);
  for (let i = 0; i < retries && res.status === 429; i++) {
    const retryAfter = Number(res.headers.get("retry-after"));
    const wait = retryAfter > 0 ? retryAfter * 1000 : 500 * 2 ** i + Math.random() * 300;
    await new Promise((r) => setTimeout(r, wait));
    res = await fetch(input, init);
  }
  return res;
}

// Parse JSON dengan aman: kembalikan fallback jika respons bukan JSON / bukan 2xx.
export async function safeJson<T = any>(res: Response, fallback: T): Promise<T> {
  if (!res.ok) return fallback;
  try {
    return await res.json();
  } catch {
    return fallback;
  }
}
