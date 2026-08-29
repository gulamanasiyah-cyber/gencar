import { Hono } from "hono";
import { eq, and, sql, like, or, desc } from "drizzle-orm";
import { absensi, kegiatan, generus, desa, kelompok, saranMasukan, mandiri, mandiriDesa, mandiriDaerah, mandiriKelompok, mandiriKegiatan, timGambuh, settings } from "../../../shared/schema";
import { getDb } from "../utils/db";
import { optionalAuth } from "../middleware/auth";

type Env = { DB: D1Database; JWT_SECRET: string; [k: string]: unknown };
const r = new Hono<{ Bindings: Env }>();

// public/absensi - record absensi without session (QR public)
r.post("/absensi", async (c) => {
  const body: any = await c.req.json().catch(() => ({}));
  const { kegiatanId, generusId, keterangan } = body;
  if (!kegiatanId || !generusId) return c.json({ error: "kegiatanId dan generusId diperlukan" }, 400);
  const db = getDb(c.env);
  const existing: any = await db.query.absensi.findFirst({ where: and(eq(absensi.kegiatanId, kegiatanId), eq(absensi.generusId, generusId)) });
  if (existing) return c.json({ error: "Sudah diabsen" }, 409);
  const id = crypto.randomUUID();
  await db.insert(absensi).values({ id, kegiatanId, generusId, keterangan: keterangan || "hadir", timestamp: new Date().toISOString() } as any);
  return c.json({ success: true, id });
});

// public/saran
r.post("/saran", async (c) => {
  const body: any = await c.req.json().catch(() => ({}));
  const { untuk, kepada, saran, nama, isAnonim } = body;
  if (!untuk || !saran) return c.json({ error: "untuk dan saran wajib" }, 400);
  const db = getDb(c.env);
  await db.insert(saranMasukan).values({ id: crypto.randomUUID(), untuk, kepada: kepada || null, saran, nama: nama || null, isAnonim: isAnonim ? 1 : 0 } as any);
  return c.json({ success: true });
});
r.get("/saran", async (c) => {
  const db = getDb(c.env);
  const data = await db.select().from(saranMasukan).limit(50);
  return c.json(data);
});

r.get("/kegiatan-publik", async (c) => {
  const db = getDb(c.env);
  const { kegiatanPublik } = await import("../../../shared/schema");
  const q = (c.req.query("q") || "").trim().toLowerCase();
  const kategori = c.req.query("kategoriAcara") || c.req.query("kategori") || "";
  const page = Math.max(1, Number(c.req.query("page") || "1"));
  const limit = Math.min(24, Math.max(1, Number(c.req.query("limit") || "12")));
  const offset = (page - 1) * limit;
  const conds: any[] = [eq(kegiatanPublik.status, "published")];
  if (q) conds.push(or(like(kegiatanPublik.judul, `%${q}%`), like(kegiatanPublik.excerpt, `%${q}%`)));
  if (kategori) conds.push(eq(kegiatanPublik.kategoriAcara, kategori as any));
  const where = and(...conds);
  const rows: any[] = await db.select().from(kegiatanPublik).where(where).orderBy(desc(kegiatanPublik.tanggal)).limit(limit).offset(offset);
  const cnt: any = await db.select({ count: sql<number>`count(*)` }).from(kegiatanPublik).where(where);
  c.header("Cache-Control", "public, max-age=60, stale-while-revalidate=120");
  return c.json({ data: rows, total: Number(cnt[0]?.count || 0), page, limit });
});

r.get("/kegiatan-publik/:slug", async (c) => {
  const slug = c.req.param("slug");
  const db = getDb(c.env);
  const { kegiatanPublik } = await import("../../../shared/schema");
  let row: any = await db.query.kegiatanPublik.findFirst({ where: and(eq(kegiatanPublik.slug, slug), eq(kegiatanPublik.status, "published")) });
  if (!row) row = await db.query.kegiatanPublik.findFirst({ where: and(eq(kegiatanPublik.id, slug), eq(kegiatanPublik.status, "published")) });
  if (!row) return c.json({ error: "Tidak ditemukan" }, 404);
  c.header("Cache-Control", "public, max-age=60, stale-while-revalidate=120");
  return c.json(row);
});

r.get("/galeri", async (c) => {
  const db = getDb(c.env);
  const { galeri } = await import("../../../shared/schema");
  const items: any[] = await db.select().from(galeri).where(eq(galeri.status, "published")).orderBy(desc(galeri.createdAt));
  c.header("Cache-Control", "public, max-age=60, stale-while-revalidate=120");
  return c.json(items);
});

r.get("/galeri/:id", async (c) => {
  const id = c.req.param("id");
  const db = getDb(c.env);
  const { galeri } = await import("../../../shared/schema");
  const item: any = await db.query.galeri.findFirst({ where: and(eq(galeri.id, id), eq(galeri.status, "published")) });
  if (!item) return c.json({ error: "Tidak ditemukan" }, 404);
  c.header("Cache-Control", "public, max-age=60, stale-while-revalidate=120");
  return c.json(item);
});

r.get("/tentang", async (c) => {
  const db = getDb(c.env);
  const [rowHtml, rowJson] = await Promise.all([
    db.query.settings.findFirst({ where: eq(settings.key, "tentang_html") }),
    db.query.settings.findFirst({ where: eq(settings.key, "tentang_json") }),
  ]);
  let parsedJson = null;
  if (rowJson?.value) {
    try {
      parsedJson = JSON.parse(rowJson.value);
    } catch {}
  }
  c.header("Cache-Control", "public, max-age=60, stale-while-revalidate=120");
  return c.json({ html: rowHtml?.value || "", json: parsedJson });
});

// public/pengurus — anon, grouped by level, ordered by level priority then urutan
const PENGURUS_LEVEL_ORDER: Record<string, number> = { pimpinan: 0, sekretariat: 1, bidang: 2, koordinator: 3 }
r.get("/pengurus", async (c) => {
  const db = getDb(c.env)
  const { organisasiPengurus } = await import("../../../shared/schema")
  const rows: any[] = await db.select().from(organisasiPengurus)
  rows.sort((a: any, b: any) => {
    const la = PENGURUS_LEVEL_ORDER[a.level ?? "bidang"] ?? 2
    const lb = PENGURUS_LEVEL_ORDER[b.level ?? "bidang"] ?? 2
    if (la !== lb) return la - lb
    const ua = Number(a.urutan ?? 0)
    const ub = Number(b.urutan ?? 0)
    if (ua !== ub) return ua - ub
    return String(a.createdAt ?? "").localeCompare(String(b.createdAt ?? ""))
  })
  const sanitized = rows.map((r: any) => ({
    id: r.id, nama: r.nama, dapukan: r.dapukan, foto: r.foto,
    level: r.level ?? "bidang", bio: r.bio ?? null, kontakWa: r.kontakWa ?? null, urutan: r.urutan ?? 0,
  }))
  c.header("Cache-Control", "public, max-age=60, stale-while-revalidate=120")
  return c.json(sanitized)
})

// public/kegiatan/:id
r.get("/kegiatan/:id", async (c) => {
  const id = c.req.param("id");
  const db = getDb(c.env);
  const row: any = await db.query.kegiatan.findFirst({ where: eq(kegiatan.id, id) });
  if (!row) return c.json({ error: "Tidak ditemukan" }, 404);
  return c.json(row);
});

// public/generus/* - registrasi lookup & list
r.post("/generus/registrasi", async (c) => {
  const body: any = await c.req.json().catch(() => ({}));
  const { nama, jenisKelamin, kategoriUsia, desaId, kelompokId } = body;
  if (!nama || !jenisKelamin || !kategoriUsia) return c.json({ error: "Data tidak lengkap" }, 400);
  const db = getDb(c.env);
  const id = crypto.randomUUID();
  const nomorUnik = `G-${Math.floor(100000 + Math.random() * 900000)}`;
  await db.insert(generus).values({ id, nomorUnik, nama, jenisKelamin, kategoriUsia, desaId: desaId ? Number(desaId) : null, kelompokId: kelompokId ? Number(kelompokId) : null, isGenerus: 1 } as any);
  return c.json({ success: true, id, nomorUnik });
});
r.get("/generus/desa", async (c) => {
  const db = getDb(c.env);
  const rows = await db.select().from(desa);
  return c.json(rows);
});
r.get("/generus/kelompok", async (c) => {
  const desaId = c.req.query("desaId");
  const db = getDb(c.env);
  const rows = desaId ? await db.select().from(kelompok).where(eq(kelompok.desaId, Number(desaId))) : await db.select().from(kelompok);
  return c.json(rows);
});

// public/mandiri/*
r.get("/mandiri/daerah", async (c) => { const db = getDb(c.env); return c.json(await db.select().from(mandiriDaerah)); });
r.get("/mandiri/desa", async (c) => {
  const daerahId = c.req.query("daerahId");
  const db = getDb(c.env);
  const rows = daerahId ? await db.select().from(mandiriDesa).where(eq(mandiriDesa.mandiriDaerahId, Number(daerahId))) : await db.select().from(mandiriDesa);
  return c.json(rows);
});
r.get("/mandiri/kelompok", async (c) => {
  const desaId = c.req.query("desaId");
  const db = getDb(c.env);
  const rows = desaId ? await db.select().from(mandiriKelompok).where(eq(mandiriKelompok.mandiriDesaId, Number(desaId))) : await db.select().from(mandiriKelompok);
  return c.json(rows);
});
r.get("/mandiri/wilayah", async (c) => {
  const db = getDb(c.env);
  const [daerah, mDesa, mKel] = await Promise.all([db.select().from(mandiriDaerah), db.select().from(mandiriDesa), db.select().from(mandiriKelompok)]);
  return c.json({ daerah, desa: mDesa, kelompok: mKel });
});
r.get("/mandiri/filters", async (c) => {
  const db = getDb(c.env);
  const [desaRows, kelRows] = await Promise.all([db.select().from(mandiriDesa), db.select().from(mandiriKelompok)]);
  return c.json({ desa: desaRows, kelompok: kelRows });
});
r.get("/mandiri/settings", async (c) => {
  const db = getDb(c.env);
  const rows = await db.select().from(settings);
  const map: Record<string, string> = {};
  for (const r of rows as any[]) map[r.key] = r.value;
  return c.json(map);
});
r.post("/mandiri/registrasi", async (c) => {
  const body: any = await c.req.json().catch(() => ({}));
  const { statusPeserta, dibayarkanSenilai, buktiPembayaran, ...rest } = body;
  const reqStatusPeserta = statusPeserta || "Utusan Daerah";
  const db = getDb(c.env);

  // registration open/close check (ported from good_route.ts)
  const statusSet: any = await db.select().from(settings).where(eq(settings.key, "mandiri_registration_status"));
  const currentStatus = statusSet[0]?.value;
  if (currentStatus === "0") return c.json({ error: "Mohon maaf, pendaftaran saat ini sudah ditutup" }, 403);
  if (currentStatus === "tutup_utusan" && reqStatusPeserta !== "Person") return c.json({ error: "Pendaftaran untuk Utusan Daerah saat ini sedang ditutup." }, 403);
  if (currentStatus === "tutup_person" && reqStatusPeserta === "Person") return c.json({ error: "Pendaftaran untuk Peserta Person saat ini sedang ditutup." }, 403);

  const activeSetting: any = await db.query.settings.findFirst({ where: eq(settings.key, "mandiri_active_kegiatan_id") });
  const activeKegiatanId = activeSetting?.value;
  if (!activeKegiatanId) return c.json({ error: "Tidak ada kegiatan mandiri yang sedang aktif." }, 400);

  const activeKegRes: any = await db.select().from(mandiriKegiatan).where(eq(mandiriKegiatan.id, activeKegiatanId)).limit(1);
  void activeKegRes;

  const { nama, jenisKelamin, tempatLahir, tanggalLahir, alamat, noTelp, pendidikan, pekerjaan, statusNikah, hobi, makananMinumanFavorit, suku, foto, mandiriDesaId, mandiriKelompokId, instagram, kriteriaPasangan } = body;
  if (!nama || !jenisKelamin || !mandiriDesaId || !tempatLahir || !tanggalLahir || !noTelp || !pendidikan || !pekerjaan || !hobi || !makananMinumanFavorit || !foto) return c.json({ error: "Mohon lengkapi semua data wajib." }, 400);
  if (!["L", "P"].includes(jenisKelamin)) return c.json({ error: "Jenis kelamin tidak valid." }, 400);
  if (reqStatusPeserta === "Person" && (!dibayarkanSenilai || !buktiPembayaran)) return c.json({ error: "Mohon lengkapi nominal dan bukti pembayaran." }, 400);

  // quota checks
  const { getMandiriPersonPerempuanQuotaStatus, getNextMandiriNomorUrut, isMandiriJenisKelamin } = await import("../services/mandiriNomorUrut");
  if (!isMandiriJenisKelamin(jenisKelamin)) return c.json({ error: "Jenis kelamin tidak valid." }, 400);
  if (reqStatusPeserta === "Person" && jenisKelamin === "P") {
    const quota = await getMandiriPersonPerempuanQuotaStatus(db, activeKegiatanId);
    if (!quota.femaleAvailable) return c.json({ status: "person_female_quota_full", error: "Kuota perempuan sudah full.", ...quota }, 409);
  }
  const desaRecord: any = await db.select({ daerahId: mandiriDesa.mandiriDaerahId, daerahNama: mandiriDaerah.nama }).from(mandiriDesa).leftJoin(mandiriDaerah, eq(mandiriDesa.mandiriDaerahId, mandiriDaerah.id)).where(eq(mandiriDesa.id, Number(mandiriDesaId))).limit(1);
  const catatanPembayaran = reqStatusPeserta === "Person" ? "Sudah dibayar oleh peserta Person" : `Sudah dibayar oleh ${desaRecord[0]?.daerahNama || "Daerah Terkait"}`;
  if (reqStatusPeserta !== "Person" && desaRecord.length > 0 && desaRecord[0].daerahId) {
    const targetDaerahId = desaRecord[0].daerahId;
    const { formPanitiaDanPengurus } = await import("../../../shared/schema");
    const { desa, kelompok } = await import("../../../shared/schema");
    void desa; void kelompok;
    const countResult: any = await db.select({ count: sql<number>`count(*)` }).from(mandiri).innerJoin(generus, eq(mandiri.generusId, generus.id)).innerJoin(mandiriDesa, eq(generus.mandiriDesaId, mandiriDesa.id)).leftJoin(formPanitiaDanPengurus, and(eq(generus.id, formPanitiaDanPengurus.generusId), eq(formPanitiaDanPengurus.kegiatanId, activeKegiatanId))).where(and(eq(mandiri.kegiatanId, activeKegiatanId), eq(mandiriDesa.mandiriDaerahId, targetDaerahId), eq(generus.jenisKelamin, jenisKelamin as any), eq(mandiri.statusPeserta, "Utusan Daerah" as any), sql`${formPanitiaDanPengurus.id} IS NULL`));
    if (Number(countResult[0]?.count || 0) >= 5) return c.json({ status: "quota_full", error: `Kuota peserta ${jenisKelamin === "L" ? "pria" : "wanita"} untuk daerah ${desaRecord[0].daerahNama} sudah penuh.` }, 409);
  }

  // duplicate check — reuse existing generus if found
  const dupConditions: any[] = [];
  if (nama && tanggalLahir) dupConditions.push(and(eq(generus.nama, nama), eq(generus.tanggalLahir, tanggalLahir)));
  if (noTelp) dupConditions.push(eq(generus.noTelp, noTelp));
  const duplicate: any = dupConditions.length > 0 ? await db.query.generus.findFirst({ where: or(...dupConditions) }) : null;
  if (duplicate) {
    const existingMandiri: any = await db.query.mandiri.findFirst({ where: and(eq(mandiri.generusId, duplicate.id), eq(mandiri.kegiatanId, activeKegiatanId)) });
    if (existingMandiri) return c.json({ isAlreadyRegistered: true, nomorUnik: duplicate.nomorUnik, nomorUrut: existingMandiri.nomorUrut, nama: duplicate.nama, message: "Peserta sudah terdaftar sebelumnya." });
    await db.update(generus).set({ nama, jenisKelamin, tempatLahir, tanggalLahir, alamat, noTelp, pendidikan, pekerjaan, statusNikah: statusNikah || "Belum Menikah", hobi, makananMinumanFavorit, suku, foto, mandiriDesaId: Number(mandiriDesaId), mandiriKelompokId: mandiriKelompokId ? Number(mandiriKelompokId) : null, instagram: instagram || duplicate.instagram, kriteriaPasangan: kriteriaPasangan || duplicate.kriteriaPasangan, isGenerus: 0, updatedAt: new Date().toISOString() } as any).where(eq(generus.id, duplicate.id));
    const { users } = await import("../../../shared/schema");
    await db.delete(users).where(eq(users.generusId, duplicate.id));
    const nextNr = await getNextMandiriNomorUrut(db, jenisKelamin as any, activeKegiatanId);
    await db.insert(mandiri).values({ id: crypto.randomUUID(), generusId: duplicate.id, nomorUrut: nextNr, kegiatanId: activeKegiatanId, statusMandiri: "Aktif", statusPeserta: reqStatusPeserta === "Person" ? "Person" : "Utusan Daerah", dibayarkanSenilai: reqStatusPeserta === "Person" ? Number(dibayarkanSenilai) : null, buktiPembayaran: reqStatusPeserta === "Person" ? buktiPembayaran : null, catatan: catatanPembayaran } as any);
    return c.json({ success: true, generusId: duplicate.id, nomorUnik: duplicate.nomorUnik, nomorUrut: nextNr });
  }

  // new generus
  const { desa, kelompok } = await import("../../../shared/schema");
  const fkWorkaround: any = await db.select({ kId: kelompok.id, dId: kelompok.desaId }).from(kelompok).limit(1);
  let defaultDesaId: any = null; let defaultKelompokId: any = null;
  if (fkWorkaround.length > 0) { defaultKelompokId = fkWorkaround[0].kId; defaultDesaId = fkWorkaround[0].dId; }
  else { const firstDesa: any = await db.select({ id: desa.id }).from(desa).limit(1); defaultDesaId = firstDesa[0]?.id; }
  let nomorUnik = `MND${Math.floor(100000 + Math.random() * 900000)}`;
  let exists: any = await db.query.generus.findFirst({ where: eq(generus.nomorUnik, nomorUnik) });
  while (exists) { nomorUnik = `MND${Math.floor(100000 + Math.random() * 900000)}`; exists = await db.query.generus.findFirst({ where: eq(generus.nomorUnik, nomorUnik) }); }
  const generusId = crypto.randomUUID();
  await db.insert(generus).values({ id: generusId, nomorUnik, nama, jenisKelamin, kategoriUsia: "Bekerja" as any, tempatLahir, tanggalLahir, alamat, noTelp, pendidikan, pekerjaan, statusNikah: statusNikah || "Belum Menikah", hobi, makananMinumanFavorit, suku, foto, desaId: defaultDesaId, kelompokId: defaultKelompokId, mandiriDesaId: Number(mandiriDesaId), mandiriKelompokId: mandiriKelompokId ? Number(mandiriKelompokId) : null, instagram, kriteriaPasangan, createdBy: "FORM_MANDIRI", isGenerus: 0 } as any);
  const nextNr = await getNextMandiriNomorUrut(db, jenisKelamin as any, activeKegiatanId);
  await db.insert(mandiri).values({ id: crypto.randomUUID(), generusId, nomorUrut: nextNr, kegiatanId: activeKegiatanId, statusMandiri: "Aktif", statusPeserta: reqStatusPeserta === "Person" ? "Person" : "Utusan Daerah", dibayarkanSenilai: reqStatusPeserta === "Person" ? Number(dibayarkanSenilai) : null, buktiPembayaran: reqStatusPeserta === "Person" ? buktiPembayaran : null, catatan: catatanPembayaran } as any);
  return c.json({ success: true, generusId, nomorUnik, nomorUrut: nextNr });
});
r.post("/mandiri/registrasi-panitia", async (c) => {
  const body: any = await c.req.json().catch(() => ({}));
  const { generusId, kegiatanId, dapukan } = body;
  if (!generusId) return c.json({ error: "generusId wajib" }, 400);
  const db = getDb(c.env);
  const { formPanitiaDanPengurus } = await import("../../../shared/schema");
  const id = crypto.randomUUID();
  await db.insert(formPanitiaDanPengurus).values({ id, generusId, kegiatanId: kegiatanId || null, nama: body.nama || "", dapukan: dapukan || "Panitia", jenisKelamin: body.jenisKelamin || null } as any);
  return c.json({ success: true, id });
});
r.get("/mandiri/daftar-tim-gambuh", async (c) => {
  const db = getDb(c.env);
  const rows = await db.select().from(timGambuh).where(eq(timGambuh.tipe, "PNKB" as any));
  return c.json(rows);
});
r.get("/mandiri/daftar-tim-penunggu", async (c) => {
  const db = getDb(c.env);
  const rows = await db.select().from(timGambuh).where(or(eq(timGambuh.tipe, "Tim Penunggu" as any), eq(timGambuh.tipe, "Penunggu PNKB" as any)) as any);
  return c.json(rows);
});
r.get("/mandiri/person-quota", async (c) => {
  const kegiatanId = c.req.query("kegiatanId");
  if (!kegiatanId) return c.json({ quota: null });
  const db = getDb(c.env);
  const cnt: any = await db.select({ count: sql<number>`count(*)` }).from(mandiri).where(and(eq(mandiri.kegiatanId, kegiatanId), eq(mandiri.statusPeserta, "Person" as any)));
  return c.json({ quota: Number(cnt[0]?.count || 0) });
});
r.get("/mandiri/katalog", async (c) => {
  const kegiatanId = c.req.query("kegiatanId");
  const db = getDb(c.env);
  let rows: any;
  if (kegiatanId) rows = await db.select().from(mandiri).where(eq(mandiri.kegiatanId, kegiatanId)).leftJoin(generus, eq(mandiri.generusId, generus.id)).then((r: any) => r);
  else rows = await db.select().from(mandiri).limit(50);
  return c.json(rows);
});
r.get("/mandiri/katalog/:id", async (c) => {
  const id = c.req.param("id");
  const db = getDb(c.env);
  const row: any = await db.query.mandiri.findFirst({ where: eq(mandiri.id, id) });
  if (!row) return c.json({ error: "Tidak ditemukan" }, 404);
  return c.json(row);
});
r.post("/mandiri/katalog/check-status", async (c) => {
  const body: any = await c.req.json().catch(() => ({}));
  const { generusId, kegiatanId } = body;
  if (!generusId) return c.json({ error: "generusId wajib" }, 400);
  const db = getDb(c.env);
  const row: any = kegiatanId ? await db.query.mandiri.findFirst({ where: and(eq(mandiri.generusId, generusId), eq(mandiri.kegiatanId, kegiatanId)) }) : await db.query.mandiri.findFirst({ where: eq(mandiri.generusId, generusId) });
  return c.json(row || { status: "not_found" });
});
r.post("/mandiri/katalog/pulang", async (c) => {
  const body: any = await c.req.json().catch(() => ({}));
  const { generusId, kegiatanId } = body;
  if (!generusId) return c.json({ error: "generusId wajib" }, 400);
  const db = getDb(c.env);
  const { mandiriAbsensi } = await import("../../../shared/schema");
  const id = crypto.randomUUID();
  await db.insert(mandiriAbsensi).values({ id, generusId, kegiatanId: kegiatanId || "", keterangan: "pulang", alasanPulang: body.alasan || null, waktuPulang: new Date().toISOString() } as any);
  return c.json({ success: true });
});
r.post("/mandiri/katalog/logout", async (c) => c.json({ success: true }));

export default r;
