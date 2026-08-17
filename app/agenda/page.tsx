import { db } from "@/lib/db";
import { kegiatan, desa, kelompok, mandiriKegiatan, mandiriDesa, mandiriKelompok } from "@/lib/schema";
import { eq, desc } from "drizzle-orm";
import Link from "next/link";
import HomeHeader from "@/components/HomeHeader";
import HomeNav from "@/components/HomeNav";
import { getSession } from "@/lib/auth";

async function getAllKegiatan() {
  try {
    const k1 = await db
      .select({
        id: kegiatan.id,
        judul: kegiatan.judul,
        deskripsi: kegiatan.deskripsi,
        tanggal: kegiatan.tanggal,
        lokasi: kegiatan.lokasi,
        desaNama: desa.nama,
        kelompokNama: kelompok.nama,
      })
      .from(kegiatan)
      .leftJoin(desa, eq(kegiatan.desaId, desa.id))
      .leftJoin(kelompok, eq(kegiatan.kelompokId, kelompok.id));

    const k2 = await db
      .select({
        id: mandiriKegiatan.id,
        judul: mandiriKegiatan.judul,
        deskripsi: mandiriKegiatan.deskripsi,
        tanggal: mandiriKegiatan.tanggal,
        lokasi: mandiriKegiatan.lokasi,
        desaNama: mandiriDesa.nama,
        kelompokNama: mandiriKelompok.nama,
      })
      .from(mandiriKegiatan)
      .leftJoin(mandiriDesa, eq(mandiriKegiatan.desaId, mandiriDesa.id))
      .leftJoin(mandiriKelompok, eq(mandiriKegiatan.kelompokId, mandiriKelompok.id));

    return [...k1, ...k2].sort((a, b) => new Date(b.tanggal || 0).getTime() - new Date(a.tanggal || 0).getTime());
  } catch (error) {
    console.error("Error fetching kegiatan:", error);
    return [];
  }
}

function formatDateFull(dateStr: string | null) {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("id-ID", {
    weekday: 'long',
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatDateShort(dateStr: string | null): { day: string | number; month: string | number; year: string | number } {
  const fallback = { day: '?', month: '?', year: '?' };
  if (!dateStr) return fallback;
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return fallback;
    return {
      day: d.getDate(),
      month: d.toLocaleDateString("id-ID", { month: "short" }).toUpperCase(),
      year: d.getFullYear()
    };
  } catch {
    return fallback;
  }
}

export default async function KegiatanPage() {
  const session = await getSession();
  const allKegiatan = await getAllKegiatan();

  return (
    <>
      <style>{`
        body { background: #f8fafc; font-family: 'Inter', sans-serif; color: #1e293b; }
        .wrap { max-width: 1000px; margin: 0 auto; padding: 0 20px; }
        .page-header { background: #fff; padding: 60px 0; border-bottom: 1px solid #e2e8f0; margin-bottom: 40px; text-align: center; }
        .page-title { font-family: 'Merriweather', serif; font-size: 42px; font-weight: 900; color: #0f172a; margin-bottom: 12px; }
        .page-subtitle { font-size: 16px; color: #64748b; max-width: 600px; margin: 0 auto; line-height: 1.6; }
        
        .keg-list { display: flex; flex-direction: column; gap: 24px; margin-bottom: 60px; }
        .keg-item { 
          display: flex; background: #fff; border-radius: 20px; overflow: hidden; 
          border: 1px solid #e2e8f0; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }
        .keg-item:hover { transform: translateY(-4px); box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1); border-color: #2563eb; }
        
        .keg-date-box { 
          background: #2563eb; color: #fff; width: 120px; flex-shrink: 0; 
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          padding: 20px;
        }
        .keg-day { font-size: 32px; font-weight: 800; line-height: 1; margin-bottom: 4px; }
        .keg-month { font-size: 14px; font-weight: 700; opacity: 0.9; }
        .keg-year { font-size: 12px; font-weight: 600; opacity: 0.7; margin-top: 4px; }
        
        .keg-content { padding: 32px; flex: 1; display: flex; flex-direction: column; justify-content: center; }
        .keg-info { display: flex; gap: 16px; font-size: 13px; font-weight: 600; color: #2563eb; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.5px; }
        .keg-title { font-family: 'Merriweather', serif; font-size: 24px; font-weight: 800; color: #0f172a; margin-bottom: 14px; line-height: 1.3; }
        .keg-desc { font-size: 15px; color: #475569; line-height: 1.6; margin-bottom: 20px; }
        
        .keg-loc { display: flex; align-items: center; gap: 8px; font-size: 14px; color: #64748b; font-weight: 500; }
        .keg-loc svg { color: #ef4444; }
        
        .empty-state { text-align: center; padding: 100px 20px; background: #fff; border-radius: 24px; border: 2px dashed #e2e8f0; }
        .empty-icon { font-size: 64px; margin-bottom: 20px; }
        .empty-text { font-size: 18px; color: #64748b; font-weight: 500; }

        @media (max-width: 640px) {
          .keg-item { flex-direction: column; }
          .keg-date-box { width: 100%; flex-direction: row; gap: 12px; padding: 15px; }
          .keg-content { padding: 24px; }
          .page-title { font-size: 32px; }
        }
      `}</style>

      <HomeHeader session={session} />
      <HomeNav />
      
      <div className="page-header">
        <div className="wrap">
          <h1 className="page-title">Agenda Kegiatan</h1>
          <p className="page-subtitle">Informasi jadwal kegiatan mendatang dan dokumentasi kegiatan terbaru di lingkungan Jakarta Barat 2.</p>
        </div>
      </div>

      <div className="wrap">
        {allKegiatan.length > 0 ? (
          <div className="keg-list">
            {allKegiatan.map((k) => {
              const dateObj = formatDateShort(k.tanggal);
              return (
                <div key={k.id} className="keg-item">
                  <div className="keg-date-box">
                    <span className="keg-day">{dateObj.day}</span>
                    <span className="keg-month">{dateObj.month}</span>
                    <span className="keg-year">{dateObj.year}</span>
                  </div>
                  <div className="keg-content">
                    <div className="keg-info">
                      <span>{k.desaNama || "Umum"}</span>
                      {k.kelompokNama && (
                        <>
                          <span>•</span>
                          <span>{k.kelompokNama}</span>
                        </>
                      )}
                    </div>
                    <h2 className="keg-title">{k.judul}</h2>
                    <p className="keg-desc">{k.deskripsi || "Tidak ada deskripsi tersedia untuk kegiatan ini."}</p>
                    <div className="keg-loc">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>
                      {k.lokasi || "Lokasi belum ditentukan"}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-icon">📅</div>
            <p className="empty-text">Belum ada kegiatan yang terjadwal saat ini.</p>
            <Link href="/" style={{ color: '#2563eb', fontWeight: 700, marginTop: 20, display: 'inline-block' }}>Kembali ke Beranda</Link>
          </div>
        )}
      </div>

      <footer style={{ background: '#0f172a', padding: '40px 0', color: 'rgba(255,255,255,0.4)', textAlign: 'center', fontSize: '13px' }}>
        <div className="wrap">
          © 2026 GENCAR — Portal Digital Jakarta Barat 2
        </div>
      </footer>
    </>
  );
}
