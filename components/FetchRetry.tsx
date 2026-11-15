"use client";

// Membungkus window.fetch sekali saja (saat modul dimuat di browser, sebelum efek komponen mana pun
// berjalan) untuk permintaan GET ke /api:
//  1. Permintaan identik yang sedang berjalan bersamaan dipakai bersama.
//  2. Semua GET yang muncul dalam jendela singkat (BATCH_WINDOW_MS) digabung menjadi SATU
//     request POST /api/batch, sehingga satu halaman cukup satu hit API (dan satu hit ke nginx).
//     Jika hanya ada satu GET, dikirim langsung seperti biasa.
//  3. Jawaban 429 (rate limit) dicoba ulang otomatis dengan jeda bertahap.
//  4. Jika /api/batch gagal, tiap GET dikirim sendiri-sendiri (fallback), jadi tidak ada fitur yang rusak.
// Metode tulis (POST/PUT/DELETE) tidak pernah diubah atau diulang agar data tidak terduplikasi.
const MAX_RETRY = 3;
const BATCH_WINDOW_MS = 25;
const MAX_BATCH = 25;
const NO_BODY_STATUS = [101, 204, 205, 304];
// Endpoint yang tidak cocok digabung (unduhan/berkas/stream)
const SKIP = /^\/api\/(batch|download|upload)|export|stream|pdf|\.(png|jpe?g|webp|pdf|xlsx?)(\?|$)/i;
// Data referensi yang jarang berubah: disimpan singkat di browser dan dipakai bersama semua komponen/halaman.
// Seluruh cache dibuang begitu ada permintaan tulis (POST/PUT/PATCH/DELETE) ke /api. Pemanggil yang
// meminta cache: "no-store" / "reload" tetap selalu mengambil data baru.
const CACHE_TTL_MS = 20_000;
const CACHEABLE = /^\/api\/(settings|public\/mandiri\/(daerah|desa|kelompok)|mandiri\/(kegiatan|daerah|desa|kelompok))(\?|$)/;
// Hanya endpoint ringan (sudah di-cache di server) yang digabung ke /api/batch. Endpoint berat
// (daftar katalog, ruangan, profil, dll.) dikirim sendiri agar tidak menahan atau ditahan yang lain,
// karena batch baru selesai setelah item paling lambat selesai.
const BATCHABLE = /^\/api\/(settings|public\/mandiri\/(daerah|desa|kelompok|settings)|mandiri\/(kegiatan|daerah|desa|kelompok|settings))(\?|$)/;
const BATCH_TIMEOUT_MS = 8000;
const PASS_HEADERS = ["x-nomor-unik", "x-session-token", "authorization"];

type Waiter = {
  path: string;
  headers: Record<string, string>;
  input: RequestInfo | URL;
  init?: RequestInit;
  resolve: (r: Response) => void;
  reject: (e: unknown) => void;
};

function installFetchRetry() {
  if (typeof window === "undefined") return;
  const w = window as any;
  if (w.__fetchRetryInstalled) return;
  w.__fetchRetryInstalled = true;

  const originalFetch = window.fetch.bind(window);
  const inFlight = new Map<string, Promise<Response>>();
  const cache = new Map<string, { at: number; status: number; contentType: string; body: string }>();
  let queue: Waiter[] = [];
  let timer: ReturnType<typeof setTimeout> | null = null;

  const withRetry = async (input: RequestInfo | URL, init?: RequestInit) => {
    let res = await originalFetch(input, init);
    for (let i = 0; i < MAX_RETRY && res.status === 429; i++) {
      const retryAfter = Number(res.headers.get("retry-after"));
      const wait = retryAfter > 0 ? retryAfter * 1000 : 600 * 2 ** i + Math.random() * 400;
      await new Promise((r) => setTimeout(r, wait));
      res = await originalFetch(input, init);
    }
    return res;
  };

  const single = (x: Waiter) =>
    withRetry(x.input, x.init).then(x.resolve, x.reject);

  const flushChunk = async (chunk: Waiter[]) => {
    if (chunk.length === 1) return single(chunk[0]);
    try {
      const res = await withRetry("/api/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        cache: "no-store",
        signal: AbortSignal.timeout(BATCH_TIMEOUT_MS),
        body: JSON.stringify({ requests: chunk.map((x) => ({ path: x.path, headers: x.headers })) }),
      });
      if (!res.ok) throw new Error(`batch ${res.status}`);
      const json = await res.json();
      if (!Array.isArray(json?.results) || json.results.length !== chunk.length) throw new Error("batch format");
      chunk.forEach((x, i) => {
        const r = json.results[i];
        const status = Number(r.status) || 500;
        const headers: Record<string, string> = { "Content-Type": r.contentType || "application/json" };
        if (r.location) headers["Location"] = r.location;
        x.resolve(new Response(NO_BODY_STATUS.includes(status) ? null : r.body, { status, headers }));
      });
    } catch {
      // Fallback: kirim satu per satu agar halaman tetap berfungsi
      await Promise.all(chunk.map(single));
    }
  };

  const flush = () => {
    timer = null;
    const items = queue;
    queue = [];
    for (let i = 0; i < items.length; i += MAX_BATCH) {
      void flushChunk(items.slice(i, i + MAX_BATCH));
    }
  };

  window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    // Hanya string/URL biasa tanpa AbortSignal (signal milik satu pemanggil tidak boleh dibagi)
    if (input instanceof Request || init?.signal) return originalFetch(input, init);

    const method = (init?.method || "GET").toUpperCase();
    if (method !== "GET") {
      // Ada perubahan data: buang cache agar bacaan berikutnya selalu baru
      try {
        if (new URL(String(input), window.location.origin).pathname.startsWith("/api/")) cache.clear();
      } catch { /* abaikan */ }
      return originalFetch(input, init);
    }

    let path = "";
    try {
      const u = new URL(String(input), window.location.origin);
      if (u.origin !== window.location.origin || !u.pathname.startsWith("/api/")) {
        return originalFetch(input, init);
      }
      path = u.pathname + u.search;
    } catch {
      return originalFetch(input, init);
    }
    if (SKIP.test(path)) return originalFetch(input, init);

    // Header selain daftar yang diteruskan server tidak bisa dibawa lewat batch
    const headers: Record<string, string> = {};
    let hasOther = false;
    try {
      if (init?.headers) {
        new Headers(init.headers).forEach((v, k) => {
          const key = k.toLowerCase();
          if (PASS_HEADERS.includes(key)) headers[key] = v;
          else if (key !== "accept" && key !== "content-type") hasOther = true;
        });
      }
    } catch {
      return originalFetch(input, init);
    }
    if (hasOther || (init?.credentials && init.credentials !== "same-origin" && init.credentials !== "include")) {
      return originalFetch(input, init);
    }

    const key = `${path} ${JSON.stringify(headers)}`;

    const useCache = CACHEABLE.test(path) && init?.cache !== "no-store" && init?.cache !== "reload";
    if (useCache) {
      const hit = cache.get(key);
      if (hit && Date.now() - hit.at < CACHE_TTL_MS) {
        return Promise.resolve(
          new Response(hit.body, { status: hit.status, headers: { "Content-Type": hit.contentType } })
        );
      }
    }

    let pending = inFlight.get(key);
    if (!pending) {
      const batchable = BATCHABLE.test(path);
      pending = (batchable
        ? new Promise<Response>((resolve, reject) => {
            queue.push({ path, headers, input, init, resolve, reject });
            if (!timer) timer = setTimeout(flush, BATCH_WINDOW_MS);
          })
        : withRetry(input, init)
      ).finally(() => inFlight.delete(key));
      if (useCache) {
        pending.then(async (res) => {
          if (res.status !== 200) return;
          const body = await res.clone().text();
          cache.set(key, { at: Date.now(), status: 200, contentType: res.headers.get("content-type") || "application/json", body });
        }).catch(() => { /* abaikan */ });
      }
      inFlight.set(key, pending);
    }
    // Tiap pemanggil mendapat salinan sendiri agar body bisa dibaca masing-masing
    return pending.then((res) => res.clone());
  };
}

installFetchRetry();

export default function FetchRetry() {
  return null;
}
