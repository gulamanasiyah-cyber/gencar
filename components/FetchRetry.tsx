"use client";

// Membungkus window.fetch sekali saja (saat modul dimuat di browser, sebelum efek komponen mana pun
// berjalan): permintaan GET/HEAD ke /api yang dijawab 429 (rate limit) dicoba ulang otomatis
// dengan jeda bertahap. Metode tulis (POST/PUT/DELETE) tidak pernah diulang agar tidak terduplikasi.
const MAX_RETRY = 3;

function installFetchRetry() {
  if (typeof window === "undefined") return;
  const w = window as any;
  if (w.__fetchRetryInstalled) return;
  w.__fetchRetryInstalled = true;

  const originalFetch = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    let res = await originalFetch(input, init);
    if (res.status !== 429) return res;

    const method = (init?.method || (input instanceof Request ? input.method : "GET")).toUpperCase();
    if (method !== "GET" && method !== "HEAD") return res;

    let url = "";
    try {
      url = new URL(input instanceof Request ? input.url : String(input), window.location.origin).pathname;
    } catch {
      return res;
    }
    if (!url.startsWith("/api/")) return res;

    for (let i = 0; i < MAX_RETRY && res.status === 429; i++) {
      const retryAfter = Number(res.headers.get("retry-after"));
      const wait = retryAfter > 0 ? retryAfter * 1000 : 600 * 2 ** i + Math.random() * 400;
      await new Promise((r) => setTimeout(r, wait));
      // Request yang sudah dipakai tidak bisa dikirim ulang; klon dari input asli
      res = await originalFetch(input instanceof Request ? input.clone() : input, init);
    }
    return res;
  };
}

installFetchRetry();

export default function FetchRetry() {
  return null;
}
