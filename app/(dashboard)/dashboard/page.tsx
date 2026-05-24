import { getSession } from "@/lib/auth";
import { Metadata } from "next";

export const metadata: Metadata = { title: "Dashboard" };

import { db } from "@/lib/db";
import { generus, kegiatan, artikel, users, mandiriKegiatan, mandiri, mandiriAbsensi, formPanitiaDanPengurus, mandiriDesa, mandiriKunjungan, mandiriPemilihan } from "@/lib/schema";
import { eq, and, sql, or, isNull, not, notInArray, desc, inArray, aliasedTable, isNotNull } from "drizzle-orm";

async function getStats(session: any, searchParams?: any) {
  try {
    if (!session) return null;
    const isManagementOrPNKB = ["desa", "kelompok", "tim_pnkb"].includes(session.role);
    const desaFilter = (session.role === "desa" || (session.role === "tim_pnkb" && !session.kelompokId)) && session.desaId ? eq(generus.desaId, session.desaId) : undefined;
    const kelompokFilter = (session.role === "kelompok" || (session.role === "tim_pnkb" && session.kelompokId)) && session.kelompokId ? eq(generus.kelompokId, session.kelompokId) : undefined;
    const generusFilter = desaFilter || kelompokFilter;

    const desaFilterKegiatan = (session.role === "desa" || (session.role === "tim_pnkb" && !session.kelompokId)) && session.desaId ? eq(kegiatan.desaId, session.desaId) : undefined;
    const kelompokFilterKegiatan = (session.role === "kelompok" || (session.role === "tim_pnkb" && session.kelompokId)) && session.kelompokId ? eq(kegiatan.kelompokId, session.kelompokId) : undefined;
    const kegiatanFilter = desaFilterKegiatan || kelompokFilterKegiatan;

    const offsetTz = new Date().getTimezoneOffset();
    const localToday = new Date(new Date().getTime() - (offsetTz * 60 * 1000));
    const todayStr = localToday.toISOString().split('T')[0];
    const finalKegiatanFilter = kegiatanFilter
      ? and(kegiatanFilter, sql`${kegiatan.tanggal} >= ${todayStr}`)
      : sql`${kegiatan.tanggal} >= ${todayStr}` as any;
    const historyKegiatanFilter = kegiatanFilter
      ? and(kegiatanFilter, sql`${kegiatan.tanggal} < ${todayStr}`)
      : sql`${kegiatan.tanggal} < ${todayStr}` as any;

    const roleExclusion = or(
      isNull(users.role),
      notInArray(users.role, ["tim_pnkb", "pengurus_daerah", "kmm_daerah", "desa", "kelompok", "creator"])
    );

    const finalGenerusFilter = generusFilter ? and(generusFilter, roleExclusion) : roleExclusion as any;

    // Latest Mandiri Activity for Attendance Stats
    const latestMandiriKegiatan = await db.select().from(mandiriKegiatan).orderBy(desc(mandiriKegiatan.tanggal)).limit(1);
    const currentActivityId = latestMandiriKegiatan[0]?.id;
    const attendanceFilter = (extra?: any) => {
      const base = [eq(mandiriAbsensi.keterangan, "hadir")];
      if (currentActivityId) base.push(eq(mandiriAbsensi.kegiatanId, currentActivityId));
      else base.push(sql`1=0`);
      return extra ? and(...base, extra) : and(...base);
    };

    const desaFilterPanitia = (session.role === "desa" || (session.role === "tim_pnkb" && !session.kelompokId)) && session.desaId ? eq(formPanitiaDanPengurus.mandiriDesaId, session.desaId) : undefined;
    const kelompokFilterPanitia = (session.role === "kelompok" || (session.role === "tim_pnkb" && session.kelompokId)) && session.kelompokId ? eq(formPanitiaDanPengurus.mandiriKelompokId, session.kelompokId) : undefined;
    const panitiaFilter = desaFilterPanitia || kelompokFilterPanitia;

    // Mandiri Specific Filters from searchParams
    const mCity = searchParams?.city;
    const mVillage = searchParams?.village;
    const mGender = searchParams?.gender;

    let mandiriUserConditions = [];
    if (mGender) mandiriUserConditions.push(eq(generus.jenisKelamin, mGender as any));

    let mandiriDesaIds: number[] | undefined = undefined;
    if (mCity || mVillage) {
      const conditions = [];
      if (mCity) conditions.push(eq(mandiriDesa.kota, mCity));
      if (mVillage) conditions.push(eq(mandiriDesa.nama, mVillage));

      const matchedDesas = await db.select({ id: mandiriDesa.id }).from(mandiriDesa).where(and(...conditions));
      mandiriDesaIds = matchedDesas.map(d => d.id);

      if (mandiriDesaIds.length === 0) {
        mandiriUserConditions.push(sql`1=0`);
      } else {
        mandiriUserConditions.push(inArray(generus.mandiriDesaId, mandiriDesaIds));
      }
    }
    const mandiriUserFilter = mandiriUserConditions.length > 0 ? and(...mandiriUserConditions) : undefined;

    let panitiaConditions = [];
    if (mGender) panitiaConditions.push(eq(formPanitiaDanPengurus.jenisKelamin, mGender as any));
    if (mandiriDesaIds) {
      if (mandiriDesaIds.length === 0) panitiaConditions.push(sql`1=0`);
      else panitiaConditions.push(inArray(formPanitiaDanPengurus.mandiriDesaId, mandiriDesaIds));
    }
    const panitiaFilterWithParams = panitiaConditions.length > 0 ? and(...panitiaConditions) : undefined;

    let artikelAuthorConditions = [];
    if (["desa", "kelompok", "creator"].includes(session.role)) {
      if (session.desaId && (session.role === "desa" || session.role === "creator")) {
        artikelAuthorConditions.push(eq(users.desaId, session.desaId));
      }
      if (session.kelompokId && (session.role === "kelompok" || session.role === "creator")) {
        artikelAuthorConditions.push(eq(users.kelompokId, session.kelompokId));
      }
    }
    const artikelAuthorFilter = artikelAuthorConditions.length > 0 ? and(...artikelAuthorConditions) : undefined;

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
      db.select({ count: sql<number>`count(DISTINCT ${generus.id})` }).from(generus).leftJoin(users, eq(generus.id, users.generusId)).where(and(finalGenerusFilter, eq(generus.isGenerus, 1))),
      db.select({ count: sql<number>`count(*)` }).from(kegiatan).where(finalKegiatanFilter),
      db.select({ count: sql<number>`count(*)` }).from(kegiatan).where(historyKegiatanFilter),
      db.select({ count: sql<number>`count(*)` })
        .from(artikel)
        .leftJoin(users, eq(artikel.authorId, users.id))
        .where(
          artikelAuthorFilter 
            ? and(eq(artikel.status, "published"), eq(artikel.tipe, "artikel"), artikelAuthorFilter)
            : and(eq(artikel.status, "published"), eq(artikel.tipe, "artikel"))
        ),
      db.select({ count: sql<number>`count(*)` })
        .from(artikel)
        .leftJoin(users, eq(artikel.authorId, users.id))
        .where(
          artikelAuthorFilter 
            ? and(eq(artikel.status, "published"), eq(artikel.tipe, "berita"), artikelAuthorFilter)
            : and(eq(artikel.status, "published"), eq(artikel.tipe, "berita"))
        ),
      ["admin", "pengurus_daerah", "kmm_daerah", "admin_romantic_room"].includes(session.role)
        ? db.select({ count: sql<number>`count(*)` }).from(users)
        : Promise.resolve([{ count: 0 }]),
      db.select({ count: sql<number>`count(DISTINCT ${generus.id})` })
        .from(generus)
        .leftJoin(users, eq(generus.id, users.generusId))
        .where(and(finalGenerusFilter, eq(generus.isGenerus, 1), eq(generus.statusNikah, "Menikah"))),
      db.select({ count: sql<number>`count(DISTINCT ${generus.id})` })
        .from(generus)
        .leftJoin(users, eq(generus.id, users.generusId))
        .where(and(finalGenerusFilter, eq(generus.isGenerus, 1), eq(generus.statusNikah, "Belum Menikah"))),
      db.select({ count: sql<number>`count(DISTINCT ${generus.id})` })
        .from(generus)
        .leftJoin(users, eq(generus.id, users.generusId))
        .where(and(finalGenerusFilter, eq(generus.isGenerus, 1), eq(generus.kategoriUsia, "PAUD"))),
      db.select({ count: sql<number>`count(DISTINCT ${generus.id})` })
        .from(generus)
        .leftJoin(users, eq(generus.id, users.generusId))
        .where(and(finalGenerusFilter, eq(generus.isGenerus, 1), eq(generus.kategoriUsia, "TK"))),
      db.select({ count: sql<number>`count(DISTINCT ${generus.id})` })
        .from(generus)
        .leftJoin(users, eq(generus.id, users.generusId))
        .where(and(finalGenerusFilter, eq(generus.isGenerus, 1), eq(generus.kategoriUsia, "SD"))),
      db.select({ count: sql<number>`count(DISTINCT ${generus.id})` })
        .from(generus)
        .leftJoin(users, eq(generus.id, users.generusId))
        .where(and(finalGenerusFilter, eq(generus.isGenerus, 1), eq(generus.kategoriUsia, "SMP"))),
      db.select({ count: sql<number>`count(DISTINCT ${generus.id})` })
        .from(generus)
        .leftJoin(users, eq(generus.id, users.generusId))
        .where(and(finalGenerusFilter, eq(generus.isGenerus, 1), eq(generus.kategoriUsia, "SMA"))),
      db.select({ count: sql<number>`count(DISTINCT ${generus.id})` })
        .from(generus)
        .leftJoin(users, eq(generus.id, users.generusId))
        .where(and(finalGenerusFilter, eq(generus.isGenerus, 1), eq(generus.kategoriUsia, "SMK"))),
      db.select({ count: sql<number>`count(DISTINCT ${generus.id})` })
        .from(generus)
        .leftJoin(users, eq(generus.id, users.generusId))
        .where(and(finalGenerusFilter, eq(generus.isGenerus, 1), eq(generus.kategoriUsia, "Kuliah"))),
      db.select({ count: sql<number>`count(DISTINCT ${generus.id})` })
        .from(generus)
        .leftJoin(users, eq(generus.id, users.generusId))
        .where(and(finalGenerusFilter, eq(generus.isGenerus, 1), eq(generus.kategoriUsia, "Bekerja"))),
      db.select({ count: sql<number>`count(DISTINCT ${generus.id})` })
        .from(generus)
        .leftJoin(users, eq(generus.id, users.generusId))
        .where(and(finalGenerusFilter, eq(generus.isGenerus, 1), or(eq(users.role, "usia_mandiri"), eq(generus.kategori, "Usia Mandiri")))),
      db.select({ count: sql<number>`count(DISTINCT ${generus.id})` })
        .from(generus)
        .leftJoin(users, eq(generus.id, users.generusId))
        .where(and(finalGenerusFilter, mandiriUserFilter, eq(generus.isGenerus, 1))),
      // Hadir Peserta (ada di mandiri, TIDAK ada di formPanitiaDanPengurus)
      db.select({ count: sql<number>`count(DISTINCT ${mandiri.id})` })
        .from(mandiriAbsensi)
        .innerJoin(mandiri, eq(mandiriAbsensi.generusId, mandiri.generusId))
        .innerJoin(generus, eq(mandiriAbsensi.generusId, generus.id))
        .where(and(
          attendanceFilter(),
          generusFilter,
          mandiriUserFilter,
          sql`${mandiriAbsensi.generusId} NOT IN (SELECT generus_id FROM form_panitia_dan_pengurus WHERE generus_id IS NOT NULL)`
        )),
      // Hadir Peserta Laki-laki (peserta, bukan panitia)
      db.select({ count: sql<number>`count(DISTINCT ${mandiri.id})` })
        .from(mandiriAbsensi)
        .innerJoin(mandiri, eq(mandiriAbsensi.generusId, mandiri.generusId))
        .innerJoin(generus, eq(mandiriAbsensi.generusId, generus.id))
        .where(and(
          attendanceFilter(eq(generus.jenisKelamin, "L")),
          generusFilter,
          mandiriUserFilter,
          sql`${mandiriAbsensi.generusId} NOT IN (SELECT generus_id FROM form_panitia_dan_pengurus WHERE generus_id IS NOT NULL)`
        )),
      // Hadir Peserta Perempuan (peserta, bukan panitia)
      db.select({ count: sql<number>`count(DISTINCT ${mandiri.id})` })
        .from(mandiriAbsensi)
        .innerJoin(mandiri, eq(mandiriAbsensi.generusId, mandiri.generusId))
        .innerJoin(generus, eq(mandiriAbsensi.generusId, generus.id))
        .where(and(
          attendanceFilter(eq(generus.jenisKelamin, "P")),
          generusFilter,
          mandiriUserFilter,
          sql`${mandiriAbsensi.generusId} NOT IN (SELECT generus_id FROM form_panitia_dan_pengurus WHERE generus_id IS NOT NULL)`
        )),
      // Hadir Panitia
      db.select({ count: sql<number>`count(DISTINCT ${formPanitiaDanPengurus.id})` })
        .from(mandiriAbsensi)
        .innerJoin(formPanitiaDanPengurus, eq(mandiriAbsensi.generusId, formPanitiaDanPengurus.generusId))
        .where(and(attendanceFilter(), panitiaFilter, panitiaFilterWithParams)),
      // Hadir Panitia Laki-laki
      db.select({ count: sql<number>`count(DISTINCT ${formPanitiaDanPengurus.id})` })
        .from(mandiriAbsensi)
        .innerJoin(formPanitiaDanPengurus, eq(mandiriAbsensi.generusId, formPanitiaDanPengurus.generusId))
        .where(and(attendanceFilter(eq(formPanitiaDanPengurus.jenisKelamin, "L")), panitiaFilter, panitiaFilterWithParams)),
      // Hadir Panitia Perempuan
      db.select({ count: sql<number>`count(DISTINCT ${formPanitiaDanPengurus.id})` })
        .from(mandiriAbsensi)
        .innerJoin(formPanitiaDanPengurus, eq(mandiriAbsensi.generusId, formPanitiaDanPengurus.generusId))
        .where(and(attendanceFilter(eq(formPanitiaDanPengurus.jenisKelamin, "P")), panitiaFilter, panitiaFilterWithParams)),
      // Total Panitia
      db.select({ count: sql<number>`count(*)` })
        .from(formPanitiaDanPengurus)
        .where(and(panitiaFilter, panitiaFilterWithParams)),
    ]);

    // Session Results Stats
    const g1 = aliasedTable(generus, "g1");
    const g2 = aliasedTable(generus, "g2");
    const md1 = aliasedTable(mandiriDesa, "md1");
    const md2 = aliasedTable(mandiriDesa, "md2");
    const pan1 = aliasedTable(formPanitiaDanPengurus, "pan1");
    const pan2 = aliasedTable(formPanitiaDanPengurus, "pan2");

    const allVisits = await db.select({
      h1: mandiriPemilihan.hasilPengirim,
      h2: mandiriPemilihan.hasilPenerima,
      city1: md1.kota,
      village1: md1.nama,
      city2: md2.kota,
      village2: md2.nama,
    })
      .from(mandiriKunjungan)
      .innerJoin(mandiriPemilihan, eq(mandiriKunjungan.pemilihanId, mandiriPemilihan.id))
      .leftJoin(g1, eq(sql`COALESCE(${mandiriPemilihan.pengirimId}, ${mandiriKunjungan.generusId})`, g1.id))
      .leftJoin(g2, eq(mandiriPemilihan.penerimaId, g2.id))
      .leftJoin(pan1, eq(g1.id, pan1.generusId))
      .leftJoin(pan2, eq(g2.id, pan2.generusId))
      .leftJoin(md1, eq(sql`COALESCE(${g1.mandiriDesaId}, ${pan1.mandiriDesaId})`, md1.id))
      .leftJoin(md2, eq(sql`COALESCE(${g2.mandiriDesaId}, ${pan2.mandiriDesaId})`, md2.id))
      .where(isNotNull(mandiriKunjungan.pemilihanId))
      .groupBy(mandiriKunjungan.pemilihanId);

    const filteredVisits = allVisits.filter(v => {
      let match = true;
      if (mCity) match = (v.city1 === mCity || v.city2 === mCity);
      if (mVillage && match) match = (v.village1 === mVillage || v.village2 === mVillage);
      return match;
    });

    const sessionStats = {
      lanjutLanjut: filteredVisits.filter(v => v.h1 === 'Lanjut' && v.h2 === 'Lanjut').length,
      lanjutTidak: filteredVisits.filter(v => (v.h1 === 'Lanjut' && v.h2 === 'Tidak Lanjut') || (v.h1 === 'Tidak Lanjut' && v.h2 === 'Lanjut')).length,
      tidakTidak: filteredVisits.filter(v => v.h1 === 'Tidak Lanjut' && v.h2 === 'Tidak Lanjut').length,
      raguRagu: filteredVisits.filter(v => v.h1 === 'Ragu-ragu' && v.h2 === 'Ragu-ragu').length,
      lanjutRagu: filteredVisits.filter(v => (v.h1 === 'Lanjut' && v.h2 === 'Ragu-ragu') || (v.h1 === 'Ragu-ragu' && v.h2 === 'Lanjut')).length,
      tidakRagu: filteredVisits.filter(v => (v.h1 === 'Tidak Lanjut' && v.h2 === 'Ragu-ragu') || (v.h1 === 'Ragu-ragu' && v.h2 === 'Tidak Lanjut')).length,
    };

    return {
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
      mandiriHadirPanitiaPerempuan: Number(mandiriHadirPanitiaPerempuan[0]?.count || 0),
      mandiriTotalPanitia: Number(mandiriTotalPanitia[0]?.count || 0),
      mandiriTidakHadirPeserta: Math.max(0, Number(mandiriCount[0].count) - Number(mandiriHadirPeserta[0]?.count || 0)),
      mandiriTidakHadirPanitia: Math.max(0, Number(mandiriTotalPanitia[0]?.count || 0) - Number(mandiriHadirPanitia[0]?.count || 0)),
      sessionStats,
    };
  } catch (error) {
    console.error("Dashboard DB fetch error:", error);
    return null;
  }
}

import Topbar from "@/components/Topbar";
import DashboardFilter from "@/components/mandiri/DashboardFilter";

export default async function DashboardPage({ searchParams }: { searchParams: any }) {
  const session = await getSession();
  const stats = await getStats(session, searchParams);

  // Fetch Cities & Villages for Filter
  const villages = await db.select().from(mandiriDesa).orderBy(mandiriDesa.nama);
  const cities = Array.from(new Set(villages.map((v) => v.kota))).sort();

  const isUser = session?.role === "generus" || session?.role === "creator";

  return (
    <div>
      <Topbar
        title={isUser ? "Dashboard User" : "Dashboard Admin"}
        role={session?.role || "kelompok"}
        userName={session?.name}
      />

      <div className="page-content">
        <div className="page-header">
          <div className="page-header-left">
            <h2>Selamat datang, {session?.name}!</h2>
            <p>{isUser ? "Berikut ringkasan profil dan aktivitas Anda" : "Berikut ringkasan data sistem JB2.ID"}</p>
          </div>
        </div>

        {isUser ? (
          <UserDashboard session={session} stats={stats} />
        ) : (
          <AdminDashboard role={session?.role || "kelompok"} stats={stats} cities={cities} villages={villages} />
        )}
      </div>
    </div>
  );
}

function AttendanceChart({ label, present, absent }: { label: string; present: number; absent: number }) {
  const total = present + absent;
  const presentPercent = total > 0 ? (present / total) * 100 : 0;

  return (
    <div className="card" style={{ height: '100%' }}>
      <div className="card-header">
        <span className="card-title">Perbandingan Kehadiran {label}</span>
      </div>
      <div className="card-body">
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', height: '100%' }}>
          <div style={{ position: 'relative', width: '80px', height: '80px' }}>
            <svg viewBox="0 0 36 36" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
              <circle cx="18" cy="18" r="15.915" fill="transparent" stroke="#f3f4f6" strokeWidth="4"></circle>
              <circle cx="18" cy="18" r="15.915" fill="transparent" stroke="#10b981" strokeWidth="4"
                strokeDasharray={`${presentPercent} ${100 - presentPercent}`} strokeDashoffset="0"></circle>
            </svg>
            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
              <div style={{ fontSize: '12px', fontWeight: 'bold' }}>{Math.round(presentPercent)}%</div>
            </div>
          </div>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '2px', backgroundColor: '#10b981' }}></div>
              <div style={{ flex: 1, fontSize: '13px' }}>Hadir</div>
              <div style={{ fontSize: '13px', fontWeight: 'bold' }}>{present}</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '2px', backgroundColor: '#ef4444' }}></div>
              <div style={{ flex: 1, fontSize: '13px' }}>Tidak Hadir</div>
              <div style={{ fontSize: '13px', fontWeight: 'bold' }}>{absent}</div>
            </div>
            <div style={{ marginTop: '4px', paddingTop: '4px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Total Terdaftar</div>
              <div style={{ fontSize: '12px', fontWeight: 'bold' }}>{total}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function AdminDashboard({ role, stats, cities, villages }: { role: string; stats: any; cities?: any[]; villages?: any[] }) {
  if (role === "admin_romantic_room") {
    return (
      <div>
        <DashboardFilter cities={cities || []} villages={villages || []} />
        <h3 className="section-title" style={{ marginTop: "1rem", marginBottom: "1rem" }}>Ringkasan Kehadiran Mandiri</h3>
        <div className="stats-grid" style={{ marginBottom: "2rem" }}>
          <StatCard icon="check-square" color="blue" label="Total Kehadiran Peserta" value={stats?.mandiriHadirPeserta ?? 0} href="/mandiri/absensi" />
          <StatCard icon="user-check" color="indigo" label="Kehadiran Peserta Laki-laki" value={stats?.mandiriHadirLaki ?? 0} href="/mandiri/absensi" />
          <StatCard icon="user-check" color="pink" label="Kehadiran Peserta Perempuan" value={stats?.mandiriHadirPerempuan ?? 0} href="/mandiri/absensi" />
          <StatCard icon="users" color="emerald" label="Total Kehadiran Panitia" value={stats?.mandiriHadirPanitia ?? 0} href="/mandiri/absensi" />
          <StatCard icon="user-check" color="indigo" label="Kehadiran Panitia Laki-laki" value={stats?.mandiriHadirPanitiaLaki ?? 0} href="/mandiri/absensi" />
          <StatCard icon="user-check" color="pink" label="Kehadiran Panitia Perempuan" value={stats?.mandiriHadirPanitiaPerempuan ?? 0} href="/mandiri/absensi" />
        </div>

        <h3 className="section-title" style={{ marginTop: "1rem", marginBottom: "1rem" }}>Hasil Pertemuan (Session Results)</h3>
        <div className="stats-grid" style={{ marginBottom: "2rem" }}>
          <StatCard icon="heart" color="emerald" label="Lanjut - Lanjut" value={stats?.sessionStats?.lanjutLanjut ?? 0} href="/mandiri/romantic-room" />
          <StatCard icon="heart-off" color="red" label="Tidak Lanjut - Tidak Lanjut" value={stats?.sessionStats?.tidakTidak ?? 0} href="/mandiri/romantic-room" />
          <StatCard icon="help-circle" color="indigo" label="Ragu-ragu - Ragu-ragu" value={stats?.sessionStats?.raguRagu ?? 0} href="/mandiri/romantic-room" />
          <StatCard icon="shuffle" color="orange" label="Lanjut - Tidak Lanjut" value={stats?.sessionStats?.lanjutTidak ?? 0} href="/mandiri/romantic-room" />
          <StatCard icon="shuffle" color="blue" label="Lanjut - Ragu-ragu" value={stats?.sessionStats?.lanjutRagu ?? 0} href="/mandiri/romantic-room" />
          <StatCard icon="shuffle" color="gray" label="Tidak Lanjut - Ragu-ragu" value={stats?.sessionStats?.tidakRagu ?? 0} href="/mandiri/romantic-room" />
        </div>

        <div className="responsive-grid-2" style={{ marginBottom: "2.5rem" }}>
          <AttendanceChart label="Peserta" present={stats?.mandiriHadirPeserta ?? 0} absent={stats?.mandiriTidakHadirPeserta ?? 0} />
          <AttendanceChart label="Panitia" present={stats?.mandiriHadirPanitia ?? 0} absent={stats?.mandiriTidakHadirPanitia ?? 0} />
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Generus */}
      <h3 className="section-title" style={{ marginTop: "1rem", marginBottom: "1rem" }}>Data Generus & Pendidikan</h3>
      <div className="stats-grid" style={{ marginBottom: "2.5rem" }}>
        {(role === "admin" || role === "pengurus_daerah" || role === "kmm_daerah" || role === "desa" || role === "kelompok" || role === "tim_pnkb") && (
          <>
            <StatCard icon="users" color="blue" label="Total Generus" value={stats?.generus ?? 0} href="/generus" gradient="linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)" />
            <StatCard icon="heart" color="red" label="Sudah Menikah" value={stats?.married ?? 0} href="/generus" />
            <StatCard icon="heart-off" color="orange" label="Belum Menikah" value={stats?.notMarried ?? 0} href="/generus" />
            <StatCard icon="user-check" color="pink" label="Total Usia Mandiri" value={stats?.usiaMandiri ?? 0} href="/generus" />
            <StatCard icon="briefcase" color="emerald" label="Total Bekerja" value={stats?.bekerja ?? 0} href="/generus" />
            <StatCard icon="book-open" color="purple" label="SMP" value={stats?.smp ?? 0} href="/generus" />
            <StatCard icon="school" color="pink" label="SMA" value={stats?.sma ?? 0} href="/generus" />
            <StatCard icon="school" color="indigo" label="SMK" value={stats?.smk ?? 0} href="/generus" />
            <StatCard icon="graduation-cap" color="blue" label="Kuliah" value={stats?.kuliah ?? 0} href="/generus" />
          </>
        )}
      </div>

      {/* Database & Metadata Section */}
      <h3 className="section-title" style={{ marginTop: "1rem", marginBottom: "1rem" }}>Aktivitas & Administrasi</h3>
      <div className="stats-grid">
        {(role === "admin" || role === "pengurus_daerah" || role === "kmm_daerah" || role === "desa" || role === "kelompok" || role === "tim_pnkb") && (
          <>
            <StatCard icon="calendar" color="green" label="Total Kegiatan" value={stats?.kegiatan ?? 0} href="/kegiatan" />
            <StatCard icon="calendar" color="gray" label="History Kegiatan" value={stats?.historyKegiatan ?? 0} href="/kegiatan" />
          </>
        )}
        {(role === "admin" || role === "pengurus_daerah" || role === "kmm_daerah" || role === "tim_pnkb") && (
          <>
            <StatCard icon="file-text" color="orange" label="Artikel" value={stats?.artikel ?? 0} href="/admin/artikel" />
            <StatCard icon="file-text" color="red" label="Berita" value={stats?.berita ?? 0} href="/admin/berita" />
          </>
        )}
      </div>

      <div className="responsive-grid-2">
        <QuickActions role={role} />
        <RecentInfo />
      </div>
    </div>
  );
}

function UserDashboard({ session, stats }: { session: any; stats: any }) {
  return (
    <div className={(session?.role === "creator" || session?.role === "generus") ? "responsive-grid-2" : ""}>
      <div className="card">
        <div className="card-header">
          <span className="card-title">Kartu Anggota</span>
        </div>
        <div className="card-body">
          <div className="profile-hero" style={{ marginBottom: 0, paddingBottom: 0 }}>
            <div className="profile-avatar-large" style={{ width: 64, height: 64, fontSize: 24 }}>
              {(session?.name || "U").charAt(0).toUpperCase()}
            </div>
            <div className="profile-hero-info">
              <h3 style={{ margin: 0, fontSize: 18 }}>{session?.name || "User"}</h3>
              <div className="text-muted" style={{ fontSize: 13 }}>{session?.email || "-"}</div>
              <div className="badge badge-blue" style={{ marginTop: 8 }}>{session?.role || "-"}</div>
            </div>
          </div>
          <div style={{ marginTop: 24 }}>
            <a href="/profile" className="btn btn-primary btn-full">Buka Profil & Barcode QR</a>
          </div>
        </div>
      </div>

      {(session?.role === "creator" || session?.role === "generus") && (
        <div className="card">
          <div className="card-header">
            <span className="card-title">Ringkasan Aktivitas</span>
          </div>
          <div className="card-body">
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {session?.role !== "creator" && (
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px", backgroundColor: "var(--bg)", borderRadius: "8px" }}>
                  <span className="text-sm font-semibold">Total Kegiatan</span>
                  <span className="badge badge-green font-bold">{stats?.kegiatan ?? 0}</span>
                </div>
              )}
              {session?.role === "creator" && (
                <>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px", backgroundColor: "var(--bg)", borderRadius: "8px" }}>
                    <span className="text-sm font-semibold">Artikel Tayang</span>
                    <span className="badge badge-orange font-bold">{stats?.artikel ?? 0}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px", backgroundColor: "var(--bg)", borderRadius: "8px" }}>
                    <span className="text-sm font-semibold">Berita Tayang</span>
                    <span className="badge badge-red font-bold">{stats?.berita ?? 0}</span>
                  </div>
                </>
              )}
            </div>
            {session.role === "creator" && (
              <div style={{ marginTop: 20 }}>
                <a href="/artikel/tulis" className="btn btn-secondary btn-full">✏️ Tulis Artikel Baru</a>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon, color, label, href, value, gradient }: {
  icon: string;
  color: string;
  label: string;
  href: string;
  value: number | string;
  gradient?: string;
}) {
  const iconSvgs: Record<string, React.ReactNode> = {
    users: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></svg>,
    calendar: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>,
    "file-text": <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>,
    user: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>,
    heart: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l8.78-8.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></svg>,
    "heart-off": <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 2l20 20M19.5 13.5L21 12l-1.06-1.06a5.5 5.5 0 0 0-7.78-7.78l-1.06 1.06M9 3.13a5.5 5.5 0 0 0-5.83 5.48c0 .32.03.63.08.93l1.06 1.06L12 21.23l2.5-2.5" /></svg>,
    school: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 10v6M2 10l10-5 10 5-10 5z" /><path d="M6 12v5c3 3 9 3 12 0v-5" /></svg>,
    "book-open": <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" /></svg>,
    library: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m16 6 4 14M12 6v14M8 8v12M4 4v16" /></svg>,
    "graduation-cap": <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 10v6M2 10l10-5 10 5-10 5z" /><path d="M6 12v5c3 3 9 3 12 0v-5" /></svg>,
    briefcase: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2" ry="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" /></svg>,
    sparkles: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" /><path d="m5 3 1 1" /><path d="m19 17 1 1" /><path d="M19 3l1 1" /><path d="m5 17 1 1" /></svg>,
    "check-square": <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 11 12 14 22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg>,
    "user-check": <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="8.5" cy="7" r="4" /><polyline points="17 11 19 13 23 9" /></svg>,
    "user-cog": <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="7" r="4" /><path d="M10 15H6a4 4 0 0 0-4 4v2" /><circle cx="19" cy="16" r="3" /><path d="m19 19-3 3h6l-3-3z" /></svg>,
    "user-x": <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="8.5" cy="7" r="4" /><line x1="18" y1="8" x2="23" y2="13" /><line x1="23" y1="8" x2="18" y2="13" /></svg>,
    "help-circle": <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>,
    "shuffle": <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 3 21 3 21 8" /><line x1="4" y1="20" x2="21" y2="3" /><polyline points="21 16 21 21 16 21" /><line x1="15" y1="15" x2="21" y2="21" /><line x1="4" y1="4" x2="9" y2="9" /></svg>,
  };

  return (
    <a href={href} className="stat-card premium-stat-card" style={{
      textDecoration: "none",
      display: "flex",
      background: gradient ? gradient : "white",
      color: gradient ? "white" : "inherit"
    }}>
      <div className={`stat-icon ${color}`} style={{
        background: gradient ? "rgba(255,255,255,0.2)" : undefined,
        color: gradient ? "white" : undefined,
        backdropFilter: gradient ? "blur(4px)" : undefined
      }}>
        {iconSvgs[icon]}
      </div>
      <div>
        <div className="stat-value" style={{ color: gradient ? "white" : undefined }}>{value}</div>
        <div className="stat-label" style={{ color: gradient ? "rgba(255,255,255,0.8)" : undefined }}>{label}</div>
      </div>
    </a>
  );
}

function QuickActions({ role }: { role: string }) {
  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">Aksi Cepat</span>
      </div>
      <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {role !== "creator" && role !== "generus" && (
          <>
            <a href="/generus" className="btn btn-primary btn-full">
              📂 Kelola Generus
            </a>
            {role !== "tim_pnkb" && (
              <>
                <a href="/kegiatan" className="btn btn-secondary btn-full">
                  📅 Kelola Kegiatan
                </a>
                <a href="/absensi" className="btn btn-secondary btn-full">
                  📷 Scan Absensi QR
                </a>
              </>
            )}
          </>
        )}
        {(role === "admin" || role === "pengurus_daerah" || role === "kmm_daerah" || role === "creator") && (
          <a href="/artikel/tulis" className="btn btn-secondary btn-full">
            ✏️ Tulis Artikel Berita
          </a>
        )}
        {(role === "creator" || role === "generus") && (
          <a href="/profile" className="btn btn-primary btn-full">
            👤 Lihat Profil Saya
          </a>
        )}
      </div>
    </div>
  );
}

function RecentInfo() {
  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">Informasi Sistem</span>
      </div>
      <div className="card-body">
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {[
            { label: "Kategori Usia", value: "SMP, SMA, Kuliah, Bekerja" },
            { label: "Fitur QR Code", value: "Aktif - setiap generus memiliki QR unik" },
            { label: "Absensi", value: "Scan QR atau cari manual" },
            { label: "Artikel", value: "Submit artikel, admin yang mempublish" },
          ].map((info) => (
            <div key={info.label} style={{ borderBottom: "1px solid var(--border)", paddingBottom: "10px" }}>
              <div className="text-sm font-semibold">{info.label}</div>
              <div className="text-sm text-muted" style={{ marginTop: "2px" }}>{info.value}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
