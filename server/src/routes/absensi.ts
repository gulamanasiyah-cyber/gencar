import { Hono } from "hono";
import { eq, and, like, or } from "drizzle-orm";
import { absensi, generus, kegiatan, desa, kelompok, kegiatanPeserta } from "../../../shared/schema";
import { getDb } from "../utils/db";
import { isDiundang } from "../utils/undangan";
import { isEventActiveNow } from "../utils/kegiatanTime";
import { isGenerusEligibleForKegiatan, matchesQrScope } from "../utils/eligibility";
import { requireAuth } from "../middleware/auth";

type Env = { DB: D1Database; JWT_SECRET: string; [k: string]: unknown };
const r = new Hono<{ Bindings: Env }>();
r.use("/*", requireAuth());

r.get("/", async (c) => {
  const session = c.get("user" as any) as any;
  const kegiatanId = c.req.query("kegiatanId");
  if (!kegiatanId) return c.json({ error: "kegiatanId diperlukan" }, 400);
  const db = getDb(c.env);
  const targetKegiatan: any = await db.query.kegiatan.findFirst({ where: eq(kegiatan.id, kegiatanId) });
  if (!targetKegiatan) return c.json({ error: "Kegiatan tidak ditemukan" }, 404);
  if (session.role === "admin_desa" && targetKegiatan.desaId != session.desaId) return c.json({ error: "Tidak diizinkan" }, 403);
  if (session.role === "admin_kelompok") {
    if (targetKegiatan.kelompokId !== null && targetKegiatan.kelompokId != session.kelompokId) return c.json({ error: "Tidak diizinkan" }, 403);
    if (targetKegiatan.desaId !== null && targetKegiatan.desaId != session.desaId) return c.json({ error: "Tidak diizinkan" }, 403);
  }
  const data = await db.select({ id: absensi.id, kegiatanId: absensi.kegiatanId, generusId: absensi.generusId, timestamp: absensi.timestamp, keterangan: absensi.keterangan, generusNama: generus.nama, generusNomorUnik: generus.nomorUnik, generusKategori: generus.kategori, generusJenisKelamin: generus.jenisKelamin, desaId: generus.desaId, desaNama: desa.nama, kelompokId: generus.kelompokId, kelompokNama: kelompok.nama }).from(absensi).leftJoin(generus, eq(absensi.generusId, generus.id)).leftJoin(desa, eq(generus.desaId, desa.id)).leftJoin(kelompok, eq(generus.kelompokId, kelompok.id)).where(eq(absensi.kegiatanId, kegiatanId));
  return c.json(data, 200, { "Cache-Control": "no-store" } as any);
});

// search generus for QR - matches original absensi/search
r.get("/search", async (c) => {
  const session = c.get("user" as any) as any;
  const q = (c.req.query("q") || "").trim();
  if (!q) return c.json([]);
  const conditions: any[] = [or(like(generus.nama, `%${q}%`), like(generus.nomorUnik, `%${q}%`))];
  if (session.role === "admin_desa" && session.desaId) conditions.push(eq(generus.desaId, session.desaId));
  else if (session.role === "admin_kelompok" && session.kelompokId) conditions.push(eq(generus.kelompokId, session.kelompokId));
  const db = getDb(c.env);
  const data = await db.select().from(generus).where(and(...conditions)).limit(10);
  return c.json(data);
});

r.post("/", async (c) => {
  const session = c.get("user" as any) as any;
  const body: any = await c.req.json().catch(() => ({}));
  const { kegiatanId, generusId: rawGenerusId, keterangan, lat, lng, accuracy, qrWilayahLevel } = body;
  if (!kegiatanId || !rawGenerusId) return c.json({ error: "kegiatanId dan generusId diperlukan" }, 400);
  const db = getDb(c.env);
  const kegiatanExists: any = await db.query.kegiatan.findFirst({ where: eq(kegiatan.id, kegiatanId) });
  if (!kegiatanExists) return c.json({ error: "Kegiatan tidak ditemukan" }, 404);
  if (session.role === "admin_desa" && kegiatanExists.desaId && kegiatanExists.desaId != session.desaId) return c.json({ error: "Tidak diizinkan" }, 403);
  if (session.role === "admin_kelompok") {
    if (kegiatanExists.desaId && kegiatanExists.desaId != session.desaId) return c.json({ error: "Tidak diizinkan" }, 403);
    if (kegiatanExists.kelompokId && kegiatanExists.kelompokId != session.kelompokId) return c.json({ error: "Tidak diizinkan" }, 403);
  }
  let resolvedGenerus: any = await db.query.generus.findFirst({ where: eq(generus.id, rawGenerusId) });
  if (!resolvedGenerus) resolvedGenerus = await db.query.generus.findFirst({ where: eq(generus.nomorUnik, rawGenerusId) });
  if (!resolvedGenerus) return c.json({ error: "Generus tidak ditemukan" }, 404);
  if (kegiatanExists.kelompokId && resolvedGenerus.kelompokId != kegiatanExists.kelompokId) {
    // Di luar scope pemilik — beri kesempatan lewat undangan approved (acara gabungan)
    const diundang = await isDiundang(db, kegiatanId, resolvedGenerus);
    if (!diundang) return c.json({ error: "Generus bukan bagian dari kelompok ini" }, 403);
  } else if (kegiatanExists.desaId && !kegiatanExists.kelompokId && resolvedGenerus.desaId != kegiatanExists.desaId) {
    const diundang = await isDiundang(db, kegiatanId, resolvedGenerus);
    if (!diundang) return c.json({ error: "Generus bukan bagian dari desa ini" }, 403);
  }
  const resolvedGenerusId = resolvedGenerus.id;
  const existing: any = await db.query.absensi.findFirst({ where: and(eq(absensi.kegiatanId, kegiatanId), eq(absensi.generusId, resolvedGenerusId)) });
  if (existing) return c.json({ error: "Sudah diabsen", existing }, 409);
  const id = crypto.randomUUID();
  await db.insert(absensi).values({ id, kegiatanId, generusId: resolvedGenerusId, desaId: resolvedGenerus.desaId ?? null, kelompokId: resolvedGenerus.kelompokId ?? null, keterangan: keterangan || "hadir", timestamp: new Date().toISOString(), lat: lat ? Number(lat) : null, lng: lng ? Number(lng) : null, accuracy: accuracy ? Number(accuracy) : null, qrWilayahLevel: qrWilayahLevel || null } as any);
  return c.json({ success: true, id, generusNama: resolvedGenerus.nama });
});

// ── Auto-detect scan: evaluasi kegiatan eligible saat scan QR wilayah ──
function parseQrToken(raw: string): { level: "kelompok" | "desa" | "daerah"; nama: string } | null {
  const t = String(raw || "").trim();
  if (!t.startsWith("gencar-absen|")) return null;
  const [, level = "", nama = ""] = t.split("|");
  if (level !== "kelompok" && level !== "desa" && level !== "daerah") return null;
  return { level, nama: (nama || "").trim() };
}

async function resolveQrWilayah(db: any, qr: { level: "kelompok" | "desa" | "daerah"; nama: string }) {
  if (qr.level === "kelompok") {
    const k: any = await db.query.kelompok.findFirst({
      where: like(kelompok.nama, qr.nama),
    });
    if (!k) return null;
    const d: any = k.desaId ? await db.query.desa.findFirst({ where: eq(desa.id, k.desaId) }) : null;
    return { level: qr.level as const, kelompokId: k.id as number, desaId: (k.desaId ?? null) as number | null, nama: k.nama };
  }
  if (qr.level === "desa") {
    const d: any = await db.query.desa.findFirst({ where: like(desa.nama, qr.nama) });
    if (!d) return null;
    return { level: qr.level as const, kelompokId: null, desaId: d.id as number, nama: d.nama };
  }
  return { level: "daerah" as const, kelompokId: null, desaId: null, nama: "Cengkareng" };
}

async function buildEligibleSets(
  db: any,
  resolvedGenerus: any,
  qr: { level: "kelompok" | "desa" | "daerah"; kelompokId: number | null; desaId: number | null },
  userLocation: { lat: number; lng: number } | null,
  now: Date
) {
  const allKegiatan: any[] = await db.select().from(kegiatan);
  const active = allKegiatan.filter((k: any) => isEventActiveNow(k, now));
  const kegIds = active.map((k: any) => k.id);
  let pesertaRows: any[] = [];
  if (kegIds.length > 0) {
    const targetConds: any[] = [eq(kegiatanPeserta.generusId, resolvedGenerus.id)];
    if (resolvedGenerus.kelompokId != null) targetConds.push(eq(kegiatanPeserta.kelompokId, resolvedGenerus.kelompokId));
    if (resolvedGenerus.desaId != null) targetConds.push(eq(kegiatanPeserta.desaId, resolvedGenerus.desaId));
    pesertaRows = await db.select().from(kegiatanPeserta).where(
      and(eq(kegiatanPeserta.status, "approved"), or(...targetConds))
    ).catch(() => []);
  }
  const byKegiatan = new Map<string, any[]>();
  for (const p of pesertaRows) {
    if (!byKegiatan.has(p.kegiatanId)) byKegiatan.set(p.kegiatanId, []);
    byKegiatan.get(p.kegiatanId)!.push(p);
  }
  const scope = {
    id: resolvedGenerus.id,
    desaId: resolvedGenerus.desaId ?? null,
    kelompokId: resolvedGenerus.kelompokId ?? null,
    jenisKelamin: resolvedGenerus.jenisKelamin ?? null,
    kategoriMudaMudi: resolvedGenerus.kategoriMudaMudi ?? null,
    pendidikan: resolvedGenerus.pendidikan ?? null,
    tanggalLahir: resolvedGenerus.tanggalLahir ?? null,
  };
  const A = active.filter((k: any) =>
    isGenerusEligibleForKegiatan(scope, k, byKegiatan.get(k.id) ?? [], userLocation)
  );
  const B = A.filter((k: any) => matchesQrScope(k, qr.level, qr.desaId, qr.kelompokId));

  // Kandidat yang cocok QR + kriteria tapi terhalang GPS (untuk pesan error spesifik)
  const { haversineM } = await import("../../../shared/validation");
  const gpsBlocked: { kegiatan: any; reason: "no_gps" | "out_of_range"; dist: number | null; radiusM: number }[] = [];
  for (const k: any of active) {
    if (!matchesQrScope(k, qr.level, qr.desaId, qr.kelompokId)) continue;
    if (B.includes(k)) continue;
    const okNoGps = isGenerusEligibleForKegiatan(scope, k, byKegiatan.get(k.id) ?? [], null, { skipGps: true });
    if (!okNoGps) continue;
    if (!(k.gpsRequired === 1 && k.lat != null && k.lng != null)) continue;
    const radiusM = k.radiusM || 100;
    if (!userLocation) {
      gpsBlocked.push({ kegiatan: k, reason: "no_gps", dist: null, radiusM });
    } else {
      const dist = Math.round(haversineM(userLocation.lat, userLocation.lng, k.lat, k.lng));
      if (dist > radiusM) gpsBlocked.push({ kegiatan: k, reason: "out_of_range", dist, radiusM });
    }
  }
  return { A, B, gpsBlocked };
}

function toKegiatanCard(k: any) {
  return {
    id: k.id,
    judul: k.judul,
    tanggal: k.tanggal,
    tanggalSelesai: k.tanggalSelesai ?? null,
    jam: k.jam ?? null,
    jamMulai: k.jamMulai ?? k.jam ?? null,
    jamSelesai: k.jamSelesai ?? null,
    lokasi: k.lokasi ?? null,
    desaId: k.desaId ?? null,
    kelompokId: k.kelompokId ?? null,
  };
}

r.post("/scan", async (c) => {
  const session = c.get("user" as any) as any;
  const body: any = await c.req.json().catch(() => ({}));
  const { qrToken, lat, lng, accuracy } = body;
  if (!qrToken) return c.json({ error: "qrToken diperlukan" }, 400);
  const db = getDb(c.env);
  const user: any = await db.query.users.findFirst({ where: eq((await import("../../../shared/schema")).users.id, session.userId) });
  if (!user?.generusId) return c.json({ error: "Akun belum taut generus" }, 400);
  const resolvedGenerus: any = await db.query.generus.findFirst({ where: eq(generus.id, user.generusId) });
  if (!resolvedGenerus) return c.json({ error: "Generus tidak ditemukan" }, 404);

  const parsed = parseQrToken(qrToken);
  if (!parsed) return c.json({ error: "QR tidak dikenali" }, 400);
  const qr = await resolveQrWilayah(db, parsed);
  if (!qr) return c.json({ error: "QR wilayah tidak terdaftar" }, 404);

  // QR harus milik wilayah asal generus sendiri
  if (qr.level === "kelompok" && qr.kelompokId !== resolvedGenerus.kelompokId) {
    return c.json({ error: "QR ini bukan milik kelompok kamu" }, 403);
  }
  if (qr.level === "desa" && qr.desaId !== resolvedGenerus.desaId) {
    return c.json({ error: "QR ini bukan milik desa kamu" }, 403);
  }

  const userLocation = lat != null && lng != null ? { lat: Number(lat), lng: Number(lng) } : null;
  const now = new Date();
  const { A, B, gpsBlocked } = await buildEligibleSets(db, resolvedGenerus, qr, userLocation, now);

  // Filter yang sudah diabsen hari ini untuk kegiatan tersebut
  const existing: any[] = await db.select().from(absensi).where(eq(absensi.generusId, resolvedGenerus.id));
  const doneSet = new Set(existing.map((a: any) => a.kegiatanId));
  const freshB = B.filter((k: any) => !doneSet.has(k.id));

  if (freshB.length === 0) {
    const freshGps = gpsBlocked.filter((g) => !doneSet.has(g.kegiatan.id));
    if (freshGps.length > 0) {
      const g = freshGps[0];
      return c.json({
        status: "gps_required",
        message: g.reason === "no_gps"
          ? `Kegiatan "${g.kegiatan.judul}" membutuhkan GPS. Aktifkan lokasi di HP lalu scan ulang.`
          : `Kamu di luar radius ${g.radiusM}m dari "${g.kegiatan.judul}" (jarak ~${g.dist}m). Mendekat ke lokasi dulu lalu scan ulang.`,
        kegiatan: toKegiatanCard(g.kegiatan),
        reason: g.reason,
        dist: g.dist,
        radiusM: g.radiusM,
      });
    }
    return c.json({ status: "no_event", message: "Tidak ada kegiatan aktif untuk wilayah ini saat ini." });
  }
  if (freshB.length === 1) {
    const target = freshB[0];
    const id = crypto.randomUUID();
    await db.insert(absensi).values({
      id,
      kegiatanId: target.id,
      generusId: resolvedGenerus.id,
      desaId: resolvedGenerus.desaId ?? null,
      kelompokId: resolvedGenerus.kelompokId ?? null,
      keterangan: "hadir",
      timestamp: now.toISOString(),
      lat: lat != null ? Number(lat) : null,
      lng: lng != null ? Number(lng) : null,
      accuracy: accuracy != null ? Number(accuracy) : null,
      qrWilayahLevel: qr.level,
    } as any);
    const others = A.filter((k: any) => k.id !== target.id && !doneSet.has(k.id));
    for (const o of others) {
      await db.insert(absensi).values({
        id: crypto.randomUUID(),
        kegiatanId: o.id,
        generusId: resolvedGenerus.id,
        desaId: resolvedGenerus.desaId ?? null,
        kelompokId: resolvedGenerus.kelompokId ?? null,
        keterangan: "izin",
        catatan: `Menghadiri kegiatan ${target.judul}`,
        timestamp: now.toISOString(),
        qrWilayahLevel: qr.level,
      } as any);
    }
    return c.json({
      status: "success",
      attendedKegiatan: toKegiatanCard(target),
      autoIzinKegiatan: others.map(toKegiatanCard),
    });
  }
  return c.json({
    status: "multiple",
    eligibleKegiatan: freshB.map(toKegiatanCard),
    allConcurrentKegiatan: A.filter((k: any) => !doneSet.has(k.id)).map(toKegiatanCard),
  });
});

r.post("/resolve", async (c) => {
  const session = c.get("user" as any) as any;
  const body: any = await c.req.json().catch(() => ({}));
  const { selectedKegiatanId, allEligibleKegiatanIds, lat, lng, accuracy, qrWilayahLevel } = body;
  if (!selectedKegiatanId || !Array.isArray(allEligibleKegiatanIds)) {
    return c.json({ error: "selectedKegiatanId dan allEligibleKegiatanIds diperlukan" }, 400);
  }
  const db = getDb(c.env);
  const { users } = await import("../../../shared/schema");
  const user: any = await db.query.users.findFirst({ where: eq(users.id, session.userId) });
  if (!user?.generusId) return c.json({ error: "Akun belum taut generus" }, 400);
  const resolvedGenerus: any = await db.query.generus.findFirst({ where: eq(generus.id, user.generusId) });
  if (!resolvedGenerus) return c.json({ error: "Generus tidak ditemukan" }, 404);
  const target: any = await db.query.kegiatan.findFirst({ where: eq(kegiatan.id, selectedKegiatanId) });
  if (!target) return c.json({ error: "Kegiatan tidak ditemukan" }, 404);

  const now = new Date();
  const existing: any = await db.query.absensi.findFirst({
    where: and(eq(absensi.kegiatanId, selectedKegiatanId), eq(absensi.generusId, resolvedGenerus.id)),
  });
  if (!existing) {
    await db.insert(absensi).values({
      id: crypto.randomUUID(),
      kegiatanId: selectedKegiatanId,
      generusId: resolvedGenerus.id,
      desaId: resolvedGenerus.desaId ?? null,
      kelompokId: resolvedGenerus.kelompokId ?? null,
      keterangan: "hadir",
      timestamp: now.toISOString(),
      lat: lat != null ? Number(lat) : null,
      lng: lng != null ? Number(lng) : null,
      accuracy: accuracy != null ? Number(accuracy) : null,
      qrWilayahLevel: qrWilayahLevel || null,
    } as any);
  }
  const others = (allEligibleKegiatanIds as string[]).filter((id) => id !== selectedKegiatanId);
  for (const oid of others) {
    const done: any = await db.query.absensi.findFirst({
      where: and(eq(absensi.kegiatanId, oid), eq(absensi.generusId, resolvedGenerus.id)),
    });
    if (done) continue;
    await db.insert(absensi).values({
      id: crypto.randomUUID(),
      kegiatanId: oid,
      generusId: resolvedGenerus.id,
      desaId: resolvedGenerus.desaId ?? null,
      kelompokId: resolvedGenerus.kelompokId ?? null,
      keterangan: "izin",
      catatan: `Menghadiri kegiatan ${target.judul}`,
      timestamp: now.toISOString(),
      qrWilayahLevel: qrWilayahLevel || null,
    } as any);
  }
  return c.json({ success: true, message: "Absensi dan izin otomatis berhasil dicatat." });
});

r.delete("/", async (c) => {  const session = c.get("user" as any) as any;
  const id = c.req.query("id");
  if (!id) return c.json({ error: "id absensi diperlukan" }, 400);
  const db = getDb(c.env);
  const existing: any = await db.query.absensi.findFirst({ where: eq(absensi.id, id) });
  if (!existing) return c.json({ error: "Absensi tidak ditemukan" }, 404);
  if (session.role === "admin_desa" || session.role === "admin_kelompok") {
    const relatedKegiatan: any = await db.query.kegiatan.findFirst({ where: eq(kegiatan.id, existing.kegiatanId) });
    if (session.role === "admin_desa" && relatedKegiatan?.desaId != session.desaId) return c.json({ error: "Tidak diizinkan" }, 403);
    if (session.role === "admin_kelompok") {
      if (relatedKegiatan?.kelompokId !== null && relatedKegiatan?.kelompokId != session.kelompokId) return c.json({ error: "Tidak diizinkan" }, 403);
      if (relatedKegiatan?.desaId !== null && relatedKegiatan?.desaId != session.desaId) return c.json({ error: "Tidak diizinkan" }, 403);
    }
  }
  await db.delete(absensi).where(eq(absensi.id, id));
  return c.json({ success: true });
});

export default r;
