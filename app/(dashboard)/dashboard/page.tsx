import { getSession } from "@/lib/auth";
import { Metadata } from "next";

export const metadata: Metadata = { title: "Dashboard" };

import { db } from "@/lib/db";
import {
  generus,
  kegiatan,
  artikel,
  users,
  mandiriKegiatan,
  mandiri,
  mandiriAbsensi,
  formPanitiaDanPengurus,
  mandiriDesa,
  mandiriDaerah,
  mandiriKelompok,
  mandiriKegiatanDaerah,
  mandiriKunjungan,
  mandiriPemilihan,
  settings,
} from "@/lib/schema";
import {
  eq,
  and,
  sql,
  or,
  isNull,
  not,
  notInArray,
  desc,
  inArray,
  aliasedTable,
  isNotNull,
} from "drizzle-orm";

async function getStats(session: any, searchParams?: any) {
  try {
    if (!session) return null;
    const isManagementOrPNKB = ["desa", "kelompok", "tim_pnkb"].includes(
      session.role,
    );
    const desaFilter =
      (session.role === "desa" ||
        (session.role === "tim_pnkb" && !session.kelompokId)) &&
      session.desaId
        ? eq(generus.desaId, session.desaId)
        : undefined;
    const kelompokFilter =
      (session.role === "kelompok" ||
        (session.role === "tim_pnkb" && session.kelompokId)) &&
      session.kelompokId
        ? eq(generus.kelompokId, session.kelompokId)
        : undefined;
    const generusFilter = desaFilter || kelompokFilter;

    const desaFilterKegiatan =
      (session.role === "desa" ||
        (session.role === "tim_pnkb" && !session.kelompokId)) &&
      session.desaId
        ? eq(kegiatan.desaId, session.desaId)
        : undefined;
    const kelompokFilterKegiatan =
      (session.role === "kelompok" ||
        (session.role === "tim_pnkb" && session.kelompokId)) &&
      session.kelompokId
        ? eq(kegiatan.kelompokId, session.kelompokId)
        : undefined;
    const kegiatanFilter = desaFilterKegiatan || kelompokFilterKegiatan;

    const offsetTz = new Date().getTimezoneOffset();
    const localToday = new Date(new Date().getTime() - offsetTz * 60 * 1000);
    const todayStr = localToday.toISOString().split("T")[0];
    const finalKegiatanFilter = kegiatanFilter
      ? and(kegiatanFilter, sql`${kegiatan.tanggal} >= ${todayStr}`)
      : (sql`${kegiatan.tanggal} >= ${todayStr}` as any);
    const historyKegiatanFilter = kegiatanFilter
      ? and(kegiatanFilter, sql`${kegiatan.tanggal} < ${todayStr}`)
      : (sql`${kegiatan.tanggal} < ${todayStr}` as any);

    const roleExclusion = or(
      isNull(users.role),
      notInArray(users.role, [
        "tim_pnkb",
        "pengurus_daerah",
        "kmm_daerah",
        "desa",
        "kelompok",
        "creator",
      ]),
    );

    const finalGenerusFilter = generusFilter
      ? and(generusFilter, roleExclusion)
      : (roleExclusion as any);

    // Active Mandiri Kegiatan from settings
    const activeSetting = await db
      .select()
      .from(settings)
      .where(eq(settings.key, "mandiri_active_kegiatan_id"));
    const currentActivityId = activeSetting[0]?.value || undefined;

    let activeKegiatanTitle = "";
    if (currentActivityId) {
      const kegiatanInfo = await db
        .select({ judul: mandiriKegiatan.judul })
        .from(mandiriKegiatan)
        .where(eq(mandiriKegiatan.id, currentActivityId))
        .limit(1);
      if (kegiatanInfo.length > 0) {
        activeKegiatanTitle = kegiatanInfo[0].judul;
      }
    }

    const attendanceFilter = (extra?: any) => {
      const base = [eq(mandiriAbsensi.keterangan, "hadir")];
      if (currentActivityId)
        base.push(eq(mandiriAbsensi.kegiatanId, currentActivityId));
      else base.push(sql`1=0`);
      return extra ? and(...base, extra) : and(...base);
    };

    const desaFilterPanitia =
      (session.role === "desa" ||
        (session.role === "tim_pnkb" && !session.kelompokId)) &&
      session.desaId
        ? eq(formPanitiaDanPengurus.mandiriDesaId, session.desaId)
        : undefined;
    const kelompokFilterPanitia =
      (session.role === "kelompok" ||
        (session.role === "tim_pnkb" && session.kelompokId)) &&
      session.kelompokId
        ? eq(formPanitiaDanPengurus.mandiriKelompokId, session.kelompokId)
        : undefined;
    const panitiaFilter = desaFilterPanitia || kelompokFilterPanitia;

    // Mandiri Specific Filters from searchParams
    const mCity = searchParams?.city;
    const mVillage = searchParams?.village;
    const mGroup = searchParams?.group;
    const mGender = searchParams?.gender;

    let mandiriUserConditions: any[] = [];
    let panitiaConditions: any[] = [];

    if (mGender) {
      mandiriUserConditions.push(eq(generus.jenisKelamin, mGender as any));
      panitiaConditions.push(
        eq(formPanitiaDanPengurus.jenisKelamin, mGender as any),
      );
    }

    let mandiriDesaIds: number[] | undefined = undefined;
    if (mCity || mVillage) {
      const conditions = [];
      if (mCity) conditions.push(eq(mandiriDaerah.nama, mCity));
      if (mVillage) conditions.push(eq(mandiriDesa.nama, mVillage));

      const matchedDesas = await db
        .select({ id: mandiriDesa.id })
        .from(mandiriDesa)
        .leftJoin(
          mandiriDaerah,
          eq(mandiriDesa.mandiriDaerahId, mandiriDaerah.id),
        )
        .where(and(...conditions));
      mandiriDesaIds = matchedDesas.map((d: { id: number }) => d.id);

      if (mandiriDesaIds && mandiriDesaIds.length === 0) {
        mandiriUserConditions.push(sql`1=0`);
        panitiaConditions.push(sql`1=0`);
      } else if (mandiriDesaIds) {
        mandiriUserConditions.push(
          inArray(generus.mandiriDesaId, mandiriDesaIds),
        );
        panitiaConditions.push(
          inArray(formPanitiaDanPengurus.mandiriDesaId, mandiriDesaIds),
        );
      }
    }

    if (mGroup) {
      const matchedGroups = await db
        .select({ id: mandiriKelompok.id })
        .from(mandiriKelompok)
        .where(eq(mandiriKelompok.nama, mGroup));
      const mandiriKelompokIds = matchedGroups.map((g) => g.id);
      if (mandiriKelompokIds.length === 0) {
        mandiriUserConditions.push(sql`1=0`);
        panitiaConditions.push(sql`1=0`);
      } else {
        mandiriUserConditions.push(
          inArray(generus.mandiriKelompokId, mandiriKelompokIds),
        );
        panitiaConditions.push(
          inArray(formPanitiaDanPengurus.mandiriKelompokId, mandiriKelompokIds),
        );
      }
    }

    const mandiriUserFilter =
      mandiriUserConditions.length > 0
        ? and(...mandiriUserConditions)
        : undefined;
    const panitiaFilterWithParams =
      panitiaConditions.length > 0 ? and(...panitiaConditions) : undefined;

    let artikelAuthorConditions = [];
    if (["desa", "kelompok", "creator"].includes(session.role)) {
      if (
        session.desaId &&
        (session.role === "desa" || session.role === "creator")
      ) {
        artikelAuthorConditions.push(eq(users.desaId, session.desaId));
      }
      if (
        session.kelompokId &&
        (session.role === "kelompok" || session.role === "creator")
      ) {
        artikelAuthorConditions.push(eq(users.kelompokId, session.kelompokId));
      }
    }
    const artikelAuthorFilter =
      artikelAuthorConditions.length > 0
        ? and(...artikelAuthorConditions)
        : undefined;

    const [
      generusCount,
      kegiatanCount,
      historyKegiatanCount,
      artikelCount,
      beritaCount,
      userCount,
      marriedCount,
      notMarriedCount,
      paudCount,
      tkCount,
      sdCount,
      smpCount,
      smaCount,
      smkCount,
      kuliahCount,
      bekerjaCount,
      usiaMandiriCount,
      mandiriCount,
      mandiriHadirPeserta,
      mandiriHadirLaki,
      mandiriHadirPerempuan,
      mandiriHadirPanitia,
      mandiriHadirPanitiaLaki,
      mandiriHadirPanitiaPerempuan,
      mandiriTotalPanitia,
    ] = await Promise.all([
      db
        .select({ count: sql<number>`count(DISTINCT ${generus.id})` })
        .from(generus)
        .leftJoin(users, eq(generus.id, users.generusId))
        .where(and(finalGenerusFilter, eq(generus.isGenerus, 1))),
      db
        .select({ count: sql<number>`count(*)` })
        .from(kegiatan)
        .where(finalKegiatanFilter),
      db
        .select({ count: sql<number>`count(*)` })
        .from(kegiatan)
        .where(historyKegiatanFilter),
      db
        .select({ count: sql<number>`count(*)` })
        .from(artikel)
        .leftJoin(users, eq(artikel.authorId, users.id))
        .where(
          artikelAuthorFilter
            ? and(
                eq(artikel.status, "published"),
                eq(artikel.tipe, "artikel"),
                artikelAuthorFilter,
              )
            : and(eq(artikel.status, "published"), eq(artikel.tipe, "artikel")),
        ),
      db
        .select({ count: sql<number>`count(*)` })
        .from(artikel)
        .leftJoin(users, eq(artikel.authorId, users.id))
        .where(
          artikelAuthorFilter
            ? and(
                eq(artikel.status, "published"),
                eq(artikel.tipe, "berita"),
                artikelAuthorFilter,
              )
            : and(eq(artikel.status, "published"), eq(artikel.tipe, "berita")),
        ),
      [
        "admin",
        "pengurus_daerah",
        "kmm_daerah",
        "admin_romantic_room",
      ].includes(session.role)
        ? db.select({ count: sql<number>`count(*)` }).from(users)
        : Promise.resolve([{ count: 0 }]),
      db
        .select({ count: sql<number>`count(DISTINCT ${generus.id})` })
        .from(generus)
        .leftJoin(users, eq(generus.id, users.generusId))
        .where(
          and(
            finalGenerusFilter,
            eq(generus.isGenerus, 1),
            eq(generus.statusNikah, "Menikah"),
          ),
        ),
      db
        .select({ count: sql<number>`count(DISTINCT ${generus.id})` })
        .from(generus)
        .leftJoin(users, eq(generus.id, users.generusId))
        .where(
          and(
            finalGenerusFilter,
            eq(generus.isGenerus, 1),
            eq(generus.statusNikah, "Belum Menikah"),
          ),
        ),
      db
        .select({ count: sql<number>`count(DISTINCT ${generus.id})` })
        .from(generus)
        .leftJoin(users, eq(generus.id, users.generusId))
        .where(
          and(
            finalGenerusFilter,
            eq(generus.isGenerus, 1),
            eq(generus.kategoriUsia, "PAUD"),
          ),
        ),
      db
        .select({ count: sql<number>`count(DISTINCT ${generus.id})` })
        .from(generus)
        .leftJoin(users, eq(generus.id, users.generusId))
        .where(
          and(
            finalGenerusFilter,
            eq(generus.isGenerus, 1),
            eq(generus.kategoriUsia, "TK"),
          ),
        ),
      db
        .select({ count: sql<number>`count(DISTINCT ${generus.id})` })
        .from(generus)
        .leftJoin(users, eq(generus.id, users.generusId))
        .where(
          and(
            finalGenerusFilter,
            eq(generus.isGenerus, 1),
            eq(generus.kategoriUsia, "SD"),
          ),
        ),
      db
        .select({ count: sql<number>`count(DISTINCT ${generus.id})` })
        .from(generus)
        .leftJoin(users, eq(generus.id, users.generusId))
        .where(
          and(
            finalGenerusFilter,
            eq(generus.isGenerus, 1),
            eq(generus.kategoriUsia, "SMP"),
          ),
        ),
      db
        .select({ count: sql<number>`count(DISTINCT ${generus.id})` })
        .from(generus)
        .leftJoin(users, eq(generus.id, users.generusId))
        .where(
          and(
            finalGenerusFilter,
            eq(generus.isGenerus, 1),
            eq(generus.kategoriUsia, "SMA"),
          ),
        ),
      db
        .select({ count: sql<number>`count(DISTINCT ${generus.id})` })
        .from(generus)
        .leftJoin(users, eq(generus.id, users.generusId))
        .where(
          and(
            finalGenerusFilter,
            eq(generus.isGenerus, 1),
            eq(generus.kategoriUsia, "SMK"),
          ),
        ),
      db
        .select({ count: sql<number>`count(DISTINCT ${generus.id})` })
        .from(generus)
        .leftJoin(users, eq(generus.id, users.generusId))
        .where(
          and(
            finalGenerusFilter,
            eq(generus.isGenerus, 1),
            eq(generus.kategoriUsia, "Kuliah"),
          ),
        ),
      db
        .select({ count: sql<number>`count(DISTINCT ${generus.id})` })
        .from(generus)
        .leftJoin(users, eq(generus.id, users.generusId))
        .where(
          and(
            finalGenerusFilter,
            eq(generus.isGenerus, 1),
            eq(generus.kategoriUsia, "Bekerja"),
          ),
        ),
      db
        .select({ count: sql<number>`count(DISTINCT ${generus.id})` })
        .from(generus)
        .leftJoin(users, eq(generus.id, users.generusId))
        .where(
          and(
            finalGenerusFilter,
            eq(generus.isGenerus, 1),
            or(
              eq(users.role, "usia_mandiri"),
              eq(generus.kategori, "Usia Mandiri"),
            ),
          ),
        ),
      db
        .select({ count: sql<number>`count(DISTINCT ${mandiri.id})` })
        .from(mandiri)
        .innerJoin(generus, eq(mandiri.generusId, generus.id))
        .where(
          and(
            generusFilter,
            mandiriUserFilter,
            currentActivityId
              ? eq(mandiri.kegiatanId, currentActivityId)
              : undefined,
            currentActivityId
              ? sql`${mandiri.generusId} NOT IN (SELECT generus_id FROM form_panitia_dan_pengurus WHERE generus_id IS NOT NULL AND kegiatan_id = ${currentActivityId})`
              : sql`${mandiri.generusId} NOT IN (SELECT generus_id FROM form_panitia_dan_pengurus WHERE generus_id IS NOT NULL)`
          ),
        ),
      // Hadir Peserta (ada di mandiri, TIDAK ada di formPanitiaDanPengurus)
      db
        .select({ count: sql<number>`count(DISTINCT ${mandiri.id})` })
        .from(mandiriAbsensi)
        .innerJoin(mandiri, eq(mandiriAbsensi.generusId, mandiri.generusId))
        .innerJoin(generus, eq(mandiriAbsensi.generusId, generus.id))
        .where(
          and(
            attendanceFilter(),
            generusFilter,
            mandiriUserFilter,
            currentActivityId
              ? sql`${mandiriAbsensi.generusId} NOT IN (SELECT generus_id FROM form_panitia_dan_pengurus WHERE generus_id IS NOT NULL AND kegiatan_id = ${currentActivityId})`
              : sql`${mandiriAbsensi.generusId} NOT IN (SELECT generus_id FROM form_panitia_dan_pengurus WHERE generus_id IS NOT NULL)`,
          ),
        ),
      // Hadir Peserta Laki-laki (peserta, bukan panitia)
      db
        .select({ count: sql<number>`count(DISTINCT ${mandiri.id})` })
        .from(mandiriAbsensi)
        .innerJoin(mandiri, eq(mandiriAbsensi.generusId, mandiri.generusId))
        .innerJoin(generus, eq(mandiriAbsensi.generusId, generus.id))
        .where(
          and(
            attendanceFilter(eq(generus.jenisKelamin, "L")),
            generusFilter,
            mandiriUserFilter,
            currentActivityId
              ? sql`${mandiriAbsensi.generusId} NOT IN (SELECT generus_id FROM form_panitia_dan_pengurus WHERE generus_id IS NOT NULL AND kegiatan_id = ${currentActivityId})`
              : sql`${mandiriAbsensi.generusId} NOT IN (SELECT generus_id FROM form_panitia_dan_pengurus WHERE generus_id IS NOT NULL)`,
          ),
        ),
      // Hadir Peserta Perempuan (peserta, bukan panitia)
      db
        .select({ count: sql<number>`count(DISTINCT ${mandiri.id})` })
        .from(mandiriAbsensi)
        .innerJoin(mandiri, eq(mandiriAbsensi.generusId, mandiri.generusId))
        .innerJoin(generus, eq(mandiriAbsensi.generusId, generus.id))
        .where(
          and(
            attendanceFilter(eq(generus.jenisKelamin, "P")),
            generusFilter,
            mandiriUserFilter,
            currentActivityId
              ? sql`${mandiriAbsensi.generusId} NOT IN (SELECT generus_id FROM form_panitia_dan_pengurus WHERE generus_id IS NOT NULL AND kegiatan_id = ${currentActivityId})`
              : sql`${mandiriAbsensi.generusId} NOT IN (SELECT generus_id FROM form_panitia_dan_pengurus WHERE generus_id IS NOT NULL)`,
          ),
        ),
      // Hadir Panitia
      db
        .select({
          count: sql<number>`count(DISTINCT ${formPanitiaDanPengurus.id})`,
        })
        .from(mandiriAbsensi)
        .innerJoin(
          formPanitiaDanPengurus,
          eq(mandiriAbsensi.generusId, formPanitiaDanPengurus.generusId),
        )
        .where(and(attendanceFilter(), panitiaFilter, panitiaFilterWithParams)),
      // Hadir Panitia Laki-laki
      db
        .select({
          count: sql<number>`count(DISTINCT ${formPanitiaDanPengurus.id})`,
        })
        .from(mandiriAbsensi)
        .innerJoin(
          formPanitiaDanPengurus,
          eq(mandiriAbsensi.generusId, formPanitiaDanPengurus.generusId),
        )
        .where(
          and(
            attendanceFilter(eq(formPanitiaDanPengurus.jenisKelamin, "L")),
            panitiaFilter,
            panitiaFilterWithParams,
          ),
        ),
      // Hadir Panitia Perempuan
      db
        .select({
          count: sql<number>`count(DISTINCT ${formPanitiaDanPengurus.id})`,
        })
        .from(mandiriAbsensi)
        .innerJoin(
          formPanitiaDanPengurus,
          eq(mandiriAbsensi.generusId, formPanitiaDanPengurus.generusId),
        )
        .where(
          and(
            attendanceFilter(eq(formPanitiaDanPengurus.jenisKelamin, "P")),
            panitiaFilter,
            panitiaFilterWithParams,
          ),
        ),
      // Total Panitia
      db
        .select({ count: sql<number>`count(*)` })
        .from(formPanitiaDanPengurus)
        .where(
          and(
            panitiaFilter,
            panitiaFilterWithParams,
            currentActivityId
              ? eq(formPanitiaDanPengurus.kegiatanId, currentActivityId)
              : undefined,
          ),
        ),
    ]);

    // Session Results Stats
    const g1 = aliasedTable(generus, "g1");
    const g2 = aliasedTable(generus, "g2");
    const md1 = aliasedTable(mandiriDesa, "md1");
    const md2 = aliasedTable(mandiriDesa, "md2");
    const mda1 = aliasedTable(mandiriDaerah, "mda1");
    const mda2 = aliasedTable(mandiriDaerah, "mda2");
    const mk1 = aliasedTable(mandiriKelompok, "mk1");
    const mk2 = aliasedTable(mandiriKelompok, "mk2");
    const pan1 = aliasedTable(formPanitiaDanPengurus, "pan1");
    const pan2 = aliasedTable(formPanitiaDanPengurus, "pan2");

    const allVisits = await db
      .select({
        h1: mandiriPemilihan.hasilPengirim,
        h2: mandiriPemilihan.hasilPenerima,
        city1: mda1.nama,
        village1: md1.nama,
        group1: mk1.nama,
        city2: mda2.nama,
        village2: md2.nama,
        group2: mk2.nama,
      })
      .from(mandiriKunjungan)
      .innerJoin(
        mandiriPemilihan,
        eq(mandiriKunjungan.pemilihanId, mandiriPemilihan.id),
      )
      .leftJoin(
        g1,
        eq(
          sql`COALESCE(${mandiriPemilihan.pengirimId}, ${mandiriKunjungan.generusId})`,
          g1.id,
        ),
      )
      .leftJoin(g2, eq(mandiriPemilihan.penerimaId, g2.id))
      .leftJoin(pan1, eq(g1.id, pan1.generusId))
      .leftJoin(pan2, eq(g2.id, pan2.generusId))
      .leftJoin(
        md1,
        eq(sql`COALESCE(${g1.mandiriDesaId}, ${pan1.mandiriDesaId})`, md1.id),
      )
      .leftJoin(
        md2,
        eq(sql`COALESCE(${g2.mandiriDesaId}, ${pan2.mandiriDesaId})`, md2.id),
      )
      .leftJoin(mda1, eq(md1.mandiriDaerahId, mda1.id))
      .leftJoin(mda2, eq(md2.mandiriDaerahId, mda2.id))
      .leftJoin(
        mk1,
        eq(
          sql`COALESCE(${g1.mandiriKelompokId}, ${pan1.mandiriKelompokId})`,
          mk1.id,
        ),
      )
      .leftJoin(
        mk2,
        eq(
          sql`COALESCE(${g2.mandiriKelompokId}, ${pan2.mandiriKelompokId})`,
          mk2.id,
        ),
      )
      .where(
        currentActivityId
          ? and(
              isNotNull(mandiriKunjungan.pemilihanId),
              eq(mandiriKunjungan.kegiatanId, currentActivityId),
            )
          : isNotNull(mandiriKunjungan.pemilihanId),
      )
      .groupBy(mandiriKunjungan.pemilihanId);

    const filteredVisits = allVisits.filter((v: any) => {
      let match = true;
      if (mCity) match = v.city1 === mCity || v.city2 === mCity;
      if (mVillage && match)
        match = v.village1 === mVillage || v.village2 === mVillage;
      if (mGroup && match) match = v.group1 === mGroup || v.group2 === mGroup;
      return match;
    });

    const sessionStats = {
      totalSelesai: filteredVisits.filter((v: any) => v.h1 && v.h2).length,
      lanjutLanjut: filteredVisits.filter(
        (v: any) => v.h1 === "Lanjut" && v.h2 === "Lanjut",
      ).length,
      lanjutTidak: filteredVisits.filter(
        (v: any) =>
          (v.h1 === "Lanjut" && v.h2 === "Tidak Lanjut") ||
          (v.h1 === "Tidak Lanjut" && v.h2 === "Lanjut"),
      ).length,
      tidakTidak: filteredVisits.filter(
        (v: any) => v.h1 === "Tidak Lanjut" && v.h2 === "Tidak Lanjut",
      ).length,
      raguRagu: filteredVisits.filter(
        (v: any) => v.h1 === "Ragu-ragu" && v.h2 === "Ragu-ragu",
      ).length,
      lanjutRagu: filteredVisits.filter(
        (v: any) =>
          (v.h1 === "Lanjut" && v.h2 === "Ragu-ragu") ||
          (v.h1 === "Ragu-ragu" && v.h2 === "Lanjut"),
      ).length,
      tidakRagu: filteredVisits.filter(
        (v: any) =>
          (v.h1 === "Tidak Lanjut" && v.h2 === "Ragu-ragu") ||
          (v.h1 === "Ragu-ragu" && v.h2 === "Tidak Lanjut"),
      ).length,
    };

    return {
      activeKegiatanTitle,
      generus: Number(generusCount[0].count),
      kegiatan: Number(kegiatanCount[0].count),
      historyKegiatan: Number(historyKegiatanCount[0].count),
      artikel: Number(artikelCount[0].count),
      berita: Number(beritaCount[0].count),
      users: Number(userCount[0].count),
      married: Number(marriedCount[0].count),
      notMarried: Number(notMarriedCount[0].count),
      paud: Number(paudCount[0].count),
      tk: Number(tkCount[0].count),
      sd: Number(sdCount[0].count),
      smp: Number(smpCount[0].count),
      sma: Number(smaCount[0].count),
      smk: Number(smkCount[0].count),
      kuliah: Number(kuliahCount[0].count),
      bekerja: Number(bekerjaCount[0].count),
      usiaMandiri: Number(usiaMandiriCount[0].count),
      mandiri: Number(mandiriCount[0].count),
      mandiriHadirPeserta: Number(mandiriHadirPeserta[0]?.count || 0),
      mandiriHadirLaki: Number(mandiriHadirLaki[0]?.count || 0),
      mandiriHadirPerempuan: Number(mandiriHadirPerempuan[0]?.count || 0),
      mandiriHadirPanitia: Number(mandiriHadirPanitia[0]?.count || 0),
      mandiriHadirPanitiaLaki: Number(mandiriHadirPanitiaLaki[0]?.count || 0),
      mandiriHadirPanitiaPerempuan: Number(
        mandiriHadirPanitiaPerempuan[0]?.count || 0,
      ),
      mandiriTotalPanitia: Number(mandiriTotalPanitia[0]?.count || 0),
      mandiriTidakHadirPeserta: Math.max(
        0,
        Number(mandiriCount[0].count) -
          Number(mandiriHadirPeserta[0]?.count || 0),
      ),
      mandiriTidakHadirPanitia: Math.max(
        0,
        Number(mandiriTotalPanitia[0]?.count || 0) -
          Number(mandiriHadirPanitia[0]?.count || 0),
      ),
      sessionStats,
    };
  } catch (error) {
    console.error("Dashboard DB fetch error:", error);
    return null;
  }
}

import Topbar from "@/components/Topbar";
import DashboardFilter from "@/components/mandiri/DashboardFilter";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: any;
}) {
  const session = await getSession();
  const stats = await getStats(session, searchParams);

  // Fetch Cities, Villages & Groups for Filter based on active kegiatan
  const activeSetting = await db
    .select()
    .from(settings)
    .where(eq(settings.key, "mandiri_active_kegiatan_id"));
  const currentActivityId = activeSetting[0]?.value || undefined;

  let activeDaerahIds: number[] = [];
  if (currentActivityId) {
    const active = await db
      .select({ daerahId: mandiriKegiatanDaerah.daerahId })
      .from(mandiriKegiatanDaerah)
      .where(
        and(
          eq(mandiriKegiatanDaerah.kegiatanId, currentActivityId),
          eq(mandiriKegiatanDaerah.isActive, 1),
        ),
      );
    activeDaerahIds = active.map((a: any) => a.daerahId);
  }

  let villageQuery = db
    .select({
      id: mandiriDesa.id,
      nama: mandiriDesa.nama,
      mandiriDaerahId: mandiriDesa.mandiriDaerahId,
      kota: mandiriDaerah.nama,
    })
    .from(mandiriDesa)
    .leftJoin(mandiriDaerah, eq(mandiriDesa.mandiriDaerahId, mandiriDaerah.id));

  if (currentActivityId) {
    if (activeDaerahIds.length > 0) {
      villageQuery = villageQuery.where(
        inArray(mandiriDesa.mandiriDaerahId, activeDaerahIds),
      ) as any;
    } else {
      villageQuery = villageQuery.where(sql`1=0`) as any;
    }
  }
  const villages = await villageQuery.orderBy(mandiriDesa.nama);
  const cities = Array.from(
    new Set(villages.map((v: any) => v.kota).filter(Boolean)),
  ).sort();

  let groupQuery = db
    .select({
      id: mandiriKelompok.id,
      nama: mandiriKelompok.nama,
      mandiriDesaId: mandiriKelompok.mandiriDesaId,
      desa: mandiriDesa.nama,
      kota: mandiriDaerah.nama,
    })
    .from(mandiriKelompok)
    .leftJoin(mandiriDesa, eq(mandiriKelompok.mandiriDesaId, mandiriDesa.id))
    .leftJoin(mandiriDaerah, eq(mandiriDesa.mandiriDaerahId, mandiriDaerah.id));

  if (currentActivityId) {
    if (activeDaerahIds.length > 0) {
      groupQuery = groupQuery.where(
        inArray(mandiriDesa.mandiriDaerahId, activeDaerahIds),
      ) as any;
    } else {
      groupQuery = groupQuery.where(sql`1=0`) as any;
    }
  }
  const groups = await groupQuery.orderBy(mandiriKelompok.nama);

  const isUser = session?.role === "generus" || session?.role === "creator";

  let userFoto = "";
  if (session?.generusId) {
    const res = await db
      .select({ foto: generus.foto })
      .from(generus)
      .where(eq(generus.id, session.generusId))
      .limit(1);
    if (res.length > 0) userFoto = res[0].foto || "";
  }

  const displayName =
    session?.role === "tim_pnkb_gambuh"
      ? "Tim PNKB & Ibu Gambuh"
      : session?.name || "??";
  const initials = displayName
    .split(" ")
    .map((n: string) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  // Greeting based on time
  const hour = new Date().getHours();
  const greeting =
    hour < 12
      ? "Selamat Pagi"
      : hour < 15
        ? "Selamat Siang"
        : hour < 18
          ? "Selamat Sore"
          : "Selamat Malam";

  return (
    <div>
      <Topbar
        title={isUser ? "Dashboard User" : "Dashboard Admin"}
        role={session?.role || "kelompok"}
        userName={session?.name}
      />

      <div className="page-content">
        {/* Hero Welcome Banner */}
        <div className="db-hero-banner">
          <div className="db-hero-content">
            <div className="db-hero-greeting">{greeting} 👋</div>
            <h1 className="db-hero-name">{displayName}</h1>
            <p className="db-hero-subtitle">
              {isUser
                ? "Berikut ringkasan profil dan aktivitas Anda hari ini"
                : "Selamat datang di sistem GENCAR. Berikut ringkasan data terkini."}
            </p>
            <div className="db-hero-pills">
              <span className="db-hero-pill">
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 6v6l4 2" />
                </svg>
                {new Date().toLocaleDateString("id-ID", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </span>
              <span className="db-hero-pill db-hero-pill-role">
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                {session?.role?.replace(/_/g, " ") || "User"}
              </span>
            </div>
          </div>
          <div className="db-hero-visual">
            <div className="db-hero-circle db-hero-circle-1"></div>
            <div className="db-hero-circle db-hero-circle-2"></div>
            <div className="db-hero-circle db-hero-circle-3"></div>
            <div className="db-hero-avatar">
              {userFoto ? (
                <img
                  src={userFoto}
                  alt={displayName}
                  style={{
                    width: "100%",
                    height: "100%",
                    borderRadius: "50%",
                    objectFit: "cover",
                  }}
                />
              ) : (
                <span>{initials}</span>
              )}
            </div>
          </div>
        </div>

        {isUser ? (
          <UserDashboard session={session} stats={stats} />
        ) : (
          <AdminDashboard
            role={session?.role || "kelompok"}
            stats={stats}
            cities={cities}
            villages={villages}
            groups={groups}
          />
        )}
      </div>
    </div>
  );
}

/* ─── Attendance Chart ─────────────────── */
function AttendanceChart({
  label,
  present,
  absent,
  color = "#10b981",
}: {
  label: string;
  present: number;
  absent: number;
  color?: string;
}) {
  const total = present + absent;
  const presentPercent = total > 0 ? (present / total) * 100 : 0;

  return (
    <div className="db-attendance-card">
      <div className="db-attendance-header">
        <div className="db-attendance-title">
          <div
            className="db-attendance-dot"
            style={{ background: color }}
          ></div>
          Kehadiran {label}
        </div>
        <div
          className="db-attendance-badge"
          style={{ color, background: `${color}18` }}
        >
          {Math.round(presentPercent)}% hadir
        </div>
      </div>
      <div className="db-attendance-body">
        <div className="db-attendance-chart">
          <svg
            viewBox="0 0 36 36"
            style={{
              width: "100%",
              height: "100%",
              transform: "rotate(-90deg)",
            }}
          >
            <circle
              cx="18"
              cy="18"
              r="15.915"
              fill="transparent"
              stroke="var(--border)"
              strokeWidth="3"
            ></circle>
            <circle
              cx="18"
              cy="18"
              r="15.915"
              fill="transparent"
              stroke={color}
              strokeWidth="3.5"
              strokeDasharray={`${presentPercent} ${100 - presentPercent}`}
              strokeDashoffset="0"
              style={{
                transition: "stroke-dasharray 0.8s ease",
                strokeLinecap: "round",
              }}
            ></circle>
          </svg>
          <div className="db-attendance-center">
            <div className="db-attendance-pct" style={{ color }}>
              {Math.round(presentPercent)}%
            </div>
          </div>
        </div>
        <div className="db-attendance-stats">
          <div className="db-attendance-stat">
            <div
              className="db-attendance-stat-dot"
              style={{ background: color }}
            ></div>
            <div className="db-attendance-stat-info">
              <span>Hadir</span>
              <strong style={{ color }}>{present}</strong>
            </div>
          </div>
          <div className="db-attendance-stat">
            <div
              className="db-attendance-stat-dot"
              style={{ background: "#ef4444" }}
            ></div>
            <div className="db-attendance-stat-info">
              <span>Tidak Hadir</span>
              <strong style={{ color: "#ef4444" }}>{absent}</strong>
            </div>
          </div>
          <div className="db-attendance-total">
            <span>Total Terdaftar</span>
            <strong>{total}</strong>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Admin Dashboard ─────────────────── */
function AdminDashboard({
  role,
  stats,
  cities,
  villages,
  groups,
}: {
  role: string;
  stats: any;
  cities?: any[];
  villages?: any[];
  groups?: any[];
}) {
  if (role === "admin_romantic_room" || role === "tim_pnkb_gambuh") {
    return (
      <div>
        <DashboardFilter
          cities={cities || []}
          villages={villages || []}
          groups={groups || []}
        />

        <div
          style={{
            marginBottom: "1.5rem",
            padding: "1.25rem",
            borderRadius: "1rem",
            background: "linear-gradient(135deg, #eff6ff, #dbeafe)",
            border: "1px solid #bfdbfe",
            boxShadow: "0 2px 4px rgba(0, 0, 0, 0.02)",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            color: "#1e40af",
          }}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          <div>
            <div
              style={{
                fontSize: "11px",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                opacity: 0.8,
              }}
            >
              Kegiatan Mandiri Aktif
            </div>
            <div style={{ fontSize: "16px", fontWeight: 800 }}>
              {stats?.activeKegiatanTitle || "Tidak Ada Kegiatan Aktif"}
            </div>
          </div>
        </div>

        <div className="db-section-header">
          <div
            className="db-section-icon"
            style={{ background: "linear-gradient(135deg, #3b82f6, #1d4ed8)" }}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2"
            >
              <polyline points="9 11 12 14 22 4" />
              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
            </svg>
          </div>
          <div>
            <h2 className="db-section-title">Kehadiran Mandiri</h2>
            <p className="db-section-sub">
              Ringkasan kehadiran kegiatan terakhir
            </p>
          </div>
        </div>

        <div className="stats-grid" style={{ marginBottom: "2rem" }}>
          <StatCard
            icon="check-square"
            color="blue"
            label="Total Hadir Peserta"
            value={stats?.mandiriHadirPeserta ?? 0}
            href="/mandiri/absensi"
          />
          <StatCard
            icon="user-check"
            color="indigo"
            label="Peserta Laki-laki"
            value={stats?.mandiriHadirLaki ?? 0}
            href="/mandiri/absensi"
          />
          <StatCard
            icon="user-check"
            color="pink"
            label="Peserta Perempuan"
            value={stats?.mandiriHadirPerempuan ?? 0}
            href="/mandiri/absensi"
          />
          <StatCard
            icon="users"
            color="emerald"
            label="Total Hadir Panitia"
            value={stats?.mandiriHadirPanitia ?? 0}
            href="/mandiri/absensi"
          />
          <StatCard
            icon="user-check"
            color="indigo"
            label="Panitia Laki-laki"
            value={stats?.mandiriHadirPanitiaLaki ?? 0}
            href="/mandiri/absensi"
          />
          <StatCard
            icon="user-check"
            color="pink"
            label="Panitia Perempuan"
            value={stats?.mandiriHadirPanitiaPerempuan ?? 0}
            href="/mandiri/absensi"
          />
        </div>

        <div className="db-section-header">
          <div
            className="db-section-icon"
            style={{ background: "linear-gradient(135deg, #ec4899, #db2777)" }}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2"
            >
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l8.78-8.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
          </div>
          <div>
            <h2 className="db-section-title">Hasil Pertemuan</h2>
            <p className="db-section-sub">
              Rekap session results romantic room
            </p>
          </div>
        </div>

        <div className="stats-grid" style={{ marginBottom: "2rem" }}>
          <StatCard
            icon="check-square"
            color="pink"
            label="Total Pertemuan Selesai"
            value={stats?.sessionStats?.totalSelesai ?? 0}
            href="/mandiri/romantic-room"
          />
          <StatCard
            icon="heart"
            color="emerald"
            label="Lanjut — Lanjut"
            value={stats?.sessionStats?.lanjutLanjut ?? 0}
            href="/mandiri/romantic-room"
          />
          <StatCard
            icon="heart-off"
            color="red"
            label="Tidak — Tidak"
            value={stats?.sessionStats?.tidakTidak ?? 0}
            href="/mandiri/romantic-room"
          />
          <StatCard
            icon="help-circle"
            color="indigo"
            label="Ragu — Ragu"
            value={stats?.sessionStats?.raguRagu ?? 0}
            href="/mandiri/romantic-room"
          />
          <StatCard
            icon="shuffle"
            color="orange"
            label="Lanjut — Tidak"
            value={stats?.sessionStats?.lanjutTidak ?? 0}
            href="/mandiri/romantic-room"
          />
          <StatCard
            icon="shuffle"
            color="blue"
            label="Lanjut — Ragu"
            value={stats?.sessionStats?.lanjutRagu ?? 0}
            href="/mandiri/romantic-room"
          />
          <StatCard
            icon="shuffle"
            color="gray"
            label="Tidak — Ragu"
            value={stats?.sessionStats?.tidakRagu ?? 0}
            href="/mandiri/romantic-room"
          />
        </div>

        <div className="db-section-header">
          <div
            className="db-section-icon"
            style={{ background: "linear-gradient(135deg, #10b981, #059669)" }}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="10" />
              <polyline points="16 12 12 8 8 12" />
              <line x1="12" y1="16" x2="12" y2="8" />
            </svg>
          </div>
          <div>
            <h2 className="db-section-title">Grafik Kehadiran</h2>
            <p className="db-section-sub">
              Visualisasi kehadiran peserta dan panitia
            </p>
          </div>
        </div>
        <div className="db-charts-grid">
          <AttendanceChart
            label="Peserta"
            present={stats?.mandiriHadirPeserta ?? 0}
            absent={stats?.mandiriTidakHadirPeserta ?? 0}
            color="#3b82f6"
          />
          <AttendanceChart
            label="Panitia"
            present={stats?.mandiriHadirPanitia ?? 0}
            absent={stats?.mandiriTidakHadirPanitia ?? 0}
            color="#10b981"
          />
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Generus Section */}
      {(role === "admin" ||
        role === "pengurus_daerah" ||
        role === "kmm_daerah" ||
        role === "desa" ||
        role === "kelompok" ||
        role === "tim_pnkb") && (
        <>
          <div className="db-section-header">
            <div
              className="db-section-icon"
              style={{
                background: "linear-gradient(135deg, #3b82f6, #1d4ed8)",
              }}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="2"
              >
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
            <div>
              <h2 className="db-section-title">Data Generus</h2>
              <p className="db-section-sub">
                Statistik keanggotaan dan pendidikan
              </p>
            </div>
          </div>

          {/* Highlight cards - top 3 most important */}
          <div className="db-highlight-grid">
            <a
              href="/generus"
              className="db-highlight-card db-highlight-primary"
            >
              <div className="db-highlight-icon">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </div>
              <div className="db-highlight-value">{stats?.generus ?? 0}</div>
              <div className="db-highlight-label">Total Generus</div>
              <div className="db-highlight-sub">Seluruh anggota aktif</div>
            </a>
            <a
              href="/generus"
              className="db-highlight-card db-highlight-success"
            >
              <div className="db-highlight-icon">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </div>
              <div className="db-highlight-value">
                {stats?.usiaMandiri ?? 0}
              </div>
              <div className="db-highlight-label">Usia Mandiri</div>
              <div className="db-highlight-sub">Siap mengikuti mandiri</div>
            </a>
            <a href="/generus" className="db-highlight-card db-highlight-warm">
              <div className="db-highlight-icon">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l8.78-8.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                </svg>
              </div>
              <div className="db-highlight-value">{stats?.notMarried ?? 0}</div>
              <div className="db-highlight-label">Belum Menikah</div>
              <div className="db-highlight-sub">
                vs {stats?.married ?? 0} sudah menikah
              </div>
            </a>
          </div>

          {/* Education breakdown */}
          <div className="db-edu-section">
            <div className="db-edu-title">Sebaran Pendidikan</div>
            <div className="db-edu-grid">
              {[
                { label: "SMP", value: stats?.smp ?? 0, color: "#8b5cf6" },
                { label: "SMA", value: stats?.sma ?? 0, color: "#ec4899" },
                { label: "SMK", value: stats?.smk ?? 0, color: "#6366f1" },
                {
                  label: "Kuliah",
                  value: stats?.kuliah ?? 0,
                  color: "#3b82f6",
                },
                {
                  label: "Bekerja",
                  value: stats?.bekerja ?? 0,
                  color: "#10b981",
                },
              ].map((item) => {
                const total =
                  (stats?.smp ?? 0) +
                  (stats?.sma ?? 0) +
                  (stats?.smk ?? 0) +
                  (stats?.kuliah ?? 0) +
                  (stats?.bekerja ?? 0);
                const pct =
                  total > 0 ? Math.round((item.value / total) * 100) : 0;
                return (
                  <a key={item.label} href="/generus" className="db-edu-card">
                    <div className="db-edu-bar-wrap">
                      <div
                        className="db-edu-bar"
                        style={{
                          height: `${Math.max(8, pct * 1.5)}px`,
                          background: item.color,
                        }}
                      ></div>
                    </div>
                    <div className="db-edu-value" style={{ color: item.color }}>
                      {item.value}
                    </div>
                    <div className="db-edu-label">{item.label}</div>
                    <div className="db-edu-pct">{pct}%</div>
                  </a>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* Aktivitas Section */}
      <div className="db-section-header" style={{ marginTop: "1.5rem" }}>
        <div
          className="db-section-icon"
          style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)" }}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="2"
          >
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
        </div>
        <div>
          <h2 className="db-section-title">Aktivitas & Administrasi</h2>
          <p className="db-section-sub">Kegiatan dan konten yang dikelola</p>
        </div>
      </div>

      <div className="stats-grid" style={{ marginBottom: "2rem" }}>
        {(role === "admin" ||
          role === "pengurus_daerah" ||
          role === "kmm_daerah" ||
          role === "desa" ||
          role === "kelompok" ||
          role === "tim_pnkb") && (
          <>
            <StatCard
              icon="calendar"
              color="green"
              label="Kegiatan Mendatang"
              value={stats?.kegiatan ?? 0}
              href="/kegiatan"
              gradient="linear-gradient(135deg, #22c55e 0%, #16a34a 100%)"
            />
            <StatCard
              icon="calendar"
              color="gray"
              label="History Kegiatan"
              value={stats?.historyKegiatan ?? 0}
              href="/kegiatan"
            />
          </>
        )}
        {(role === "admin" ||
          role === "pengurus_daerah" ||
          role === "kmm_daerah" ||
          role === "tim_pnkb") && (
          <>
            <StatCard
              icon="file-text"
              color="orange"
              label="Artikel Tayang"
              value={stats?.artikel ?? 0}
              href="/admin/artikel"
            />
            <StatCard
              icon="file-text"
              color="red"
              label="Berita Tayang"
              value={stats?.berita ?? 0}
              href="/admin/berita"
            />
          </>
        )}
      </div>

      {/* Quick Actions + Info */}
      <div className="responsive-grid-2">
        <QuickActions role={role} />
        <RecentInfo />
      </div>
    </div>
  );
}

/* ─── User Dashboard ─────────────────── */
function UserDashboard({ session, stats }: { session: any; stats: any }) {
  const isCreatorOrGenerus =
    session?.role === "creator" || session?.role === "generus";
  return (
    <div className={isCreatorOrGenerus ? "responsive-grid-2" : ""}>
      {/* Member Card */}
      <div className="db-member-card">
        <div className="db-member-avatar">
          {(session?.name || "U").charAt(0).toUpperCase()}
        </div>
        <div className="db-member-info">
          <h3 className="db-member-name">{session?.name || "User"}</h3>
          <div className="db-member-email">{session?.email || "-"}</div>
          <span className="badge badge-blue db-member-role">
            {session?.role?.replace(/_/g, " ") || "-"}
          </span>
        </div>
        <a
          href="/profile"
          className="btn btn-primary btn-full"
          style={{ marginTop: "20px" }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            style={{ marginRight: 6 }}
          >
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
          Buka Profil & Barcode QR
        </a>
      </div>

      {isCreatorOrGenerus && (
        <div className="card">
          <div className="card-header">
            <span className="card-title">Ringkasan Aktivitas</span>
          </div>
          <div className="card-body">
            <div
              style={{ display: "flex", flexDirection: "column", gap: "10px" }}
            >
              {session?.role !== "creator" && (
                <div className="db-activity-row">
                  <div
                    className="db-activity-icon"
                    style={{ background: "#eff6ff", color: "#2563eb" }}
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <rect x="3" y="4" width="18" height="18" rx="2" />
                      <line x1="16" y1="2" x2="16" y2="6" />
                      <line x1="8" y1="2" x2="8" y2="6" />
                      <line x1="3" y1="10" x2="21" y2="10" />
                    </svg>
                  </div>
                  <span className="db-activity-label">Total Kegiatan</span>
                  <span
                    className="badge badge-green"
                    style={{ fontWeight: 800 }}
                  >
                    {stats?.kegiatan ?? 0}
                  </span>
                </div>
              )}
              {session?.role === "creator" && (
                <>
                  <div className="db-activity-row">
                    <div
                      className="db-activity-icon"
                      style={{ background: "#fff7ed", color: "#d97706" }}
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                      </svg>
                    </div>
                    <span className="db-activity-label">Artikel Tayang</span>
                    <span
                      className="badge badge-orange"
                      style={{ fontWeight: 800 }}
                    >
                      {stats?.artikel ?? 0}
                    </span>
                  </div>
                  <div className="db-activity-row">
                    <div
                      className="db-activity-icon"
                      style={{ background: "#fef2f2", color: "#dc2626" }}
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                      </svg>
                    </div>
                    <span className="db-activity-label">Berita Tayang</span>
                    <span
                      className="badge badge-red"
                      style={{ fontWeight: 800 }}
                    >
                      {stats?.berita ?? 0}
                    </span>
                  </div>
                  <div style={{ marginTop: 8 }}>
                    <a
                      href="/artikel/tulis"
                      className="btn btn-secondary btn-full"
                    >
                      ✏️ Tulis Artikel Baru
                    </a>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Stat Card ─────────────────── */
function StatCard({
  icon,
  color,
  label,
  href,
  value,
  gradient,
}: {
  icon: string;
  color: string;
  label: string;
  href: string;
  value: number | string;
  gradient?: string;
}) {
  const iconSvgs: Record<string, React.ReactNode> = {
    users: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
    calendar: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    ),
    "file-text": (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
      </svg>
    ),
    heart: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l8.78-8.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
    ),
    "heart-off": (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M2 2l20 20M19.5 13.5L21 12l-1.06-1.06a5.5 5.5 0 0 0-7.78-7.78l-1.06 1.06M9 3.13a5.5 5.5 0 0 0-5.83 5.48c0 .32.03.63.08.93l1.06 1.06L12 21.23l2.5-2.5" />
      </svg>
    ),
    school: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
        <path d="M6 12v5c3 3 9 3 12 0v-5" />
      </svg>
    ),
    "book-open": (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
        <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
      </svg>
    ),
    "graduation-cap": (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
        <path d="M6 12v5c3 3 9 3 12 0v-5" />
      </svg>
    ),
    briefcase: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
        <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
      </svg>
    ),
    "check-square": (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polyline points="9 11 12 14 22 4" />
        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
      </svg>
    ),
    "user-check": (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="8.5" cy="7" r="4" />
        <polyline points="17 11 19 13 23 9" />
      </svg>
    ),
    "help-circle": (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="10" />
        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    ),
    shuffle: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polyline points="16 3 21 3 21 8" />
        <line x1="4" y1="20" x2="21" y2="3" />
        <polyline points="21 16 21 21 16 21" />
        <line x1="15" y1="15" x2="21" y2="21" />
        <line x1="4" y1="4" x2="9" y2="9" />
      </svg>
    ),
  };

  return (
    <a
      href={href}
      className="stat-card premium-stat-card"
      style={{
        textDecoration: "none",
        display: "flex",
        background: gradient ? gradient : "var(--bg-card)",
        color: gradient ? "white" : "inherit",
      }}
    >
      <div
        className={`stat-icon ${color}`}
        style={{
          background: gradient ? "rgba(255,255,255,0.2)" : undefined,
          color: gradient ? "white" : undefined,
          backdropFilter: gradient ? "blur(4px)" : undefined,
        }}
      >
        {iconSvgs[icon]}
      </div>
      <div>
        <div
          className="stat-value"
          style={{ color: gradient ? "white" : undefined }}
        >
          {value}
        </div>
        <div
          className="stat-label"
          style={{ color: gradient ? "rgba(255,255,255,0.85)" : undefined }}
        >
          {label}
        </div>
      </div>
    </a>
  );
}

/* ─── Quick Actions ─────────────────── */
function QuickActions({ role }: { role: string }) {
  const actions: {
    href: string;
    label: string;
    icon: React.ReactNode;
    variant: string;
    desc: string;
  }[] = [];

  if (role !== "creator" && role !== "generus") {
    actions.push({
      href: "/generus",
      label: "Kelola Generus",
      desc: "Tambah & edit data anggota",
      icon: (
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      ),
      variant: "blue",
    });
    if (role !== "tim_pnkb") {
      actions.push({
        href: "/kegiatan",
        label: "Kelola Kegiatan",
        desc: "Atur jadwal & kegiatan",
        icon: (
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
        ),
        variant: "green",
      });
      actions.push({
        href: "/absensi",
        label: "Scan Absensi QR",
        desc: "Catat kehadiran via QR",
        icon: (
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <rect x="3" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" />
            <rect x="14" y="14" width="3" height="3" rx="0.5" />
            <rect x="18" y="18" width="3" height="3" rx="0.5" />
            <rect x="14" y="18" width="3" height="3" rx="0.5" />
          </svg>
        ),
        variant: "purple",
      });
    }
  }
  if (["admin", "pengurus_daerah", "kmm_daerah", "creator"].includes(role)) {
    actions.push({
      href: "/artikel/tulis",
      label: "Tulis Artikel",
      desc: "Buat konten baru",
      icon: (
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
        </svg>
      ),
      variant: "orange",
    });
  }
  if (["creator", "generus"].includes(role)) {
    actions.push({
      href: "/profile",
      label: "Lihat Profil Saya",
      desc: "Edit profil & QR code",
      icon: (
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      ),
      variant: "pink",
    });
  }

  const colorMap: Record<string, { bg: string; color: string }> = {
    blue: { bg: "#eff6ff", color: "#2563eb" },
    green: { bg: "#f0fdf4", color: "#16a34a" },
    purple: { bg: "#faf5ff", color: "#7c3aed" },
    orange: { bg: "#fff7ed", color: "#d97706" },
    pink: { bg: "#fdf2f8", color: "#db2777" },
  };

  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">Aksi Cepat</span>
        <span
          style={{
            fontSize: 11,
            color: "var(--text-muted)",
            background: "var(--bg)",
            padding: "3px 10px",
            borderRadius: 20,
            fontWeight: 600,
          }}
        >
          {actions.length} aksi
        </span>
      </div>
      <div
        className="card-body"
        style={{
          padding: "16px 20px",
          display: "flex",
          flexDirection: "column",
          gap: "10px",
        }}
      >
        {actions.map((action) => {
          const c = colorMap[action.variant] || colorMap.blue;
          return (
            <a key={action.href} href={action.href} className="db-quick-action">
              <div
                className="db-quick-icon"
                style={{ background: c.bg, color: c.color }}
              >
                {action.icon}
              </div>
              <div className="db-quick-text">
                <div className="db-quick-label">{action.label}</div>
                <div className="db-quick-desc">{action.desc}</div>
              </div>
              <svg
                className="db-quick-arrow"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M9 18l6-6-6-6" />
              </svg>
            </a>
          );
        })}
        {actions.length === 0 && (
          <div
            style={{
              textAlign: "center",
              color: "var(--text-muted)",
              fontSize: 13,
              padding: "16px 0",
            }}
          >
            Tidak ada aksi tersedia
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Recent Info ─────────────────── */
function RecentInfo() {
  const infoItems = [
    {
      label: "Kategori Usia",
      value: "SMP, SMA, Kuliah, Bekerja",
      icon: "🎓",
      color: "#8b5cf6",
    },
    {
      label: "Fitur QR Code",
      value: "Setiap generus memiliki QR unik",
      icon: "📱",
      color: "#3b82f6",
    },
    {
      label: "Absensi",
      value: "Scan QR atau cari manual",
      icon: "✅",
      color: "#10b981",
    },
    {
      label: "Artikel",
      value: "Submit artikel, admin yang mempublish",
      icon: "📝",
      color: "#f59e0b",
    },
  ];

  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">Informasi Sistem</span>
        <span
          style={{
            fontSize: 11,
            color: "var(--text-muted)",
            background: "var(--bg)",
            padding: "3px 10px",
            borderRadius: 20,
            fontWeight: 600,
          }}
        >
          v1.0
        </span>
      </div>
      <div className="card-body" style={{ padding: "16px 20px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
          {infoItems.map((info, i) => (
            <div
              key={info.label}
              className="db-info-row"
              style={{
                borderBottom:
                  i < infoItems.length - 1 ? "1px solid var(--border)" : "none",
              }}
            >
              <div className="db-info-icon">{info.icon}</div>
              <div>
                <div className="db-info-label">{info.label}</div>
                <div className="db-info-value">{info.value}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
