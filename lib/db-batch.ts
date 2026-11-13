import { getDb } from "@/lib/db";

/**
 * Jalankan beberapa query BACA dalam satu round-trip ke database (`db.batch`).
 *
 * Ke Turso, setiap `await db.select(...)` adalah satu HTTP request (~100–150 ms).
 * Tiga query berurutan ≈ 300–450 ms, sedangkan 30+ query dalam satu batch tetap
 * ≈ 1 round-trip. Gunakan ini untuk query yang saling independen.
 *
 * Elemen array boleh campuran query builder Drizzle (belum di-await) dan nilai
 * atau Promise biasa (mis. `Promise.resolve([{ count: 0 }])`); urutan hasil
 * sama dengan urutan input.
 */
export async function batchQueries<T extends readonly unknown[]>(
  items: readonly [...T]
): Promise<{ -readonly [K in keyof T]: Awaited<T[K]> }> {
  const queryIndexes: number[] = [];
  const queries: any[] = [];
  items.forEach((item, index) => {
    if (isDrizzleQuery(item)) {
      queryIndexes.push(index);
      queries.push(item);
    }
  });

  const othersPromise = Promise.all(
    items.map((item, index) => (queryIndexes.includes(index) ? undefined : item))
  );
  // Cegah "unhandled rejection" bila query DB gagal lebih dulu; error tetap
  // dilempar ulang saat othersPromise di-await di bawah.
  othersPromise.catch(() => undefined);

  let queryResults: unknown[] = [];
  if (queries.length === 1) {
    queryResults = [await queries[0]];
  } else if (queries.length > 1) {
    const database = getDb();
    if (typeof database?.batch === "function") {
      try {
        queryResults = await database.batch(queries);
      } catch (error) {
        // Query builder Drizzle bisa dieksekusi ulang, jadi aman jatuh ke paralel.
        console.warn("[batchQueries] batch gagal, fallback ke Promise.all:", error);
        queryResults = await Promise.all(queries);
      }
    } else {
      queryResults = await Promise.all(queries);
    }
  }

  const results = (await othersPromise) as unknown[];
  queryIndexes.forEach((itemIndex, i) => {
    results[itemIndex] = queryResults[i];
  });
  return results as any;
}

function isDrizzleQuery(value: unknown): boolean {
  return (
    !!value &&
    typeof value === "object" &&
    typeof (value as any)._prepare === "function" &&
    typeof (value as any).then === "function"
  );
}
