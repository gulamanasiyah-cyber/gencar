/**
 * Cache memori in-process untuk data yang jarang berubah (settings, daftar
 * kegiatan, wilayah daerah/desa/kelompok).
 *
 * Setiap query ke Turso adalah satu HTTP round-trip (~100–150 ms), dan hampir
 * semua halaman/endpoint membaca data yang sama berulang-ulang. Menyimpannya di
 * memori menghapus round-trip tersebut dari setiap request.
 *
 * - Penulisan di dalam aplikasi memanggil `invalidateCache(prefix)` sehingga
 *   perubahan langsung terlihat (aplikasi berjalan sebagai satu proses Node).
 * - TTL pendek tetap dipakai sebagai jaring pengaman bila database diubah dari
 *   luar proses ini (mis. skrip atau Drizzle Studio).
 * - Request bersamaan untuk key yang sama berbagi satu query (dedupe).
 *
 * Nilai yang dikembalikan dipakai bersama antar-request: JANGAN dimutasi.
 */

type Entry = { value: unknown; expiresAt: number };

interface CacheState {
  store: Map<string, Entry>;
  inflight: Map<string, Promise<unknown>>;
  version: number;
}

const g = globalThis as typeof globalThis & { __gencarServerCache?: CacheState };
const state: CacheState = (g.__gencarServerCache ??= {
  store: new Map(),
  inflight: new Map(),
  version: 0,
});

export async function cached<T>(key: string, ttlMs: number, loader: () => Promise<T>): Promise<T> {
  const hit = state.store.get(key);
  if (hit && hit.expiresAt > Date.now()) return hit.value as T;

  const pending = state.inflight.get(key);
  if (pending) return pending as Promise<T>;

  const startVersion = state.version;
  // Promise.resolve().then(...) memastikan loader selalu berjalan async sehingga
  // `promise` sudah terdaftar sebelum blok finally dijalankan.
  const promise: Promise<T> = Promise.resolve()
    .then(loader)
    .then((value) => {
      // Jangan simpan hasil yang mungkin usang karena ada invalidasi saat query berjalan.
      if (state.version === startVersion) {
        state.store.set(key, { value, expiresAt: Date.now() + ttlMs });
      }
      return value;
    })
    .finally(() => {
      if (state.inflight.get(key) === promise) state.inflight.delete(key);
    });

  state.inflight.set(key, promise);
  return promise;
}

/** Hapus entri cache yang key-nya diawali salah satu prefix (tanpa argumen = semua). */
export function invalidateCache(...prefixes: string[]): void {
  state.version++;
  const matches = (key: string) => prefixes.length === 0 || prefixes.some((p) => key.startsWith(p));
  for (const key of Array.from(state.store.keys())) {
    if (matches(key)) state.store.delete(key);
  }
  for (const key of Array.from(state.inflight.keys())) {
    if (matches(key)) state.inflight.delete(key);
  }
}
