export const runtime = "edge";
import { db } from "@/lib/db";
import { artikel, users, organisasiPengurus, settings } from "@/lib/schema";
import { desc, asc, and, eq, inArray } from "drizzle-orm";
import Link from "next/link";
import { getSession } from "@/lib/auth";

import HomeHeader from "@/components/HomeHeader";

async function getBeritaUtama(limit = 6) {
  try {
    return await db
      .select({
        id: artikel.id,
        judul: artikel.judul,
        ringkasan: artikel.ringkasan,
        coverImage: artikel.coverImage,
        publishedAt: artikel.publishedAt,
        authorName: users.name,
      })
      .from(artikel)
      .leftJoin(users, eq(artikel.authorId, users.id))
      .where(and(eq(artikel.tipe, "berita"), inArray(artikel.status, ["published", "approved"])))
      .orderBy(desc(artikel.publishedAt))
      .limit(limit);
  } catch (error) {
    console.error("Error fetching berita utama:", error);
    return [];
  }
}


async function getPengurus() {
  try {
    return await db
      .select()
      .from(organisasiPengurus)
      .orderBy(asc(organisasiPengurus.urutan), desc(organisasiPengurus.createdAt));
  } catch {
    return [];
  }
}

async function getSettings() {
  try {
    const res = await db.select().from(settings);
    const obj: Record<string, string | null> = {};
    res.forEach((s) => {
      obj[s.key] = s.value;
    });
    return obj;
  } catch {
    return {};
  }
}

function getEmbedUrl(mapsLink: string, placeName: string) {
  if (!mapsLink) {
    if (placeName) {
      return `https://maps.google.com/maps?q=${encodeURIComponent(placeName)}&t=&z=15&ie=UTF8&iwloc=&output=embed`;
    }
    return "";
  }
  
  // If it's already an iframe source or output=embed
  if (mapsLink.includes("output=embed") || mapsLink.includes("google.com/maps/embed")) {
    return mapsLink;
  }

  // Check if it has coordinates (@lat,lng)
  const coordRegex = /@(-?\d+\.\d+),(-?\d+\.\d+)/;
  const match = mapsLink.match(coordRegex);
  if (match) {
    const lat = match[1];
    const lng = match[2];
    return `https://maps.google.com/maps?q=${lat},${lng}&t=&z=15&ie=UTF8&iwloc=&output=embed`;
  }

  // Check if it's a search link with q=
  if (mapsLink.includes("q=")) {
    try {
      const urlObj = new URL(mapsLink);
      const q = urlObj.searchParams.get("q");
      if (q) {
        return `https://maps.google.com/maps?q=${encodeURIComponent(q)}&t=&z=15&ie=UTF8&iwloc=&output=embed`;
      }
    } catch (e) {
      // Ignore URL parsing errors
    }
  }

  // Fallback to place name or encode the whole link as query
  const query = placeName || mapsLink;
  return `https://maps.google.com/maps?q=${encodeURIComponent(query)}&t=&z=15&ie=UTF8&iwloc=&output=embed`;
}

function formatDateShort(dateStr: string | null) {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default async function OrganisasiPage() {
  const session = await getSession();
  const allBerita = await getBeritaUtama();
  const allPengurus = await getPengurus();
  const allSettings = await getSettings();
  const lokasiNama = allSettings["lokasi_nama"] || "";
  const lokasiGmaps = allSettings["lokasi_gmaps"] || "";

  return (
    <>
      <style>{`
        *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
        html { scroll-behavior: smooth; }
        body {
          font-family: 'Inter', sans-serif;
          color: #111827;
          background: #f8fafc;
          line-height: 1.6;
        }
        a { text-decoration: none; color: inherit; }
        
        :root {
          --primary:  #2563eb;
          --primary-dk: #1d4ed8;
          --primary-lt: #eff6ff;
          --secondary: #64748b;
          --success:  #16a34a;
          --success-dk: #15803d;
          --success-lt: #dcfce7;
          --danger:   #dc2626;
          --navy:     #1e293b;
          --slate:    #334155;
          --gray:     #64748b;
          --gray-lt:  #94a3b8;
          --border:   #e2e8f0;
          --white:    #ffffff;
          --serif:    'Merriweather', Georgia, serif;
        }

        .wrap { max-width: 1200px; margin: 0 auto; padding: 0 20px; }

        .navbar {
          background: var(--primary-dk);
          position: sticky; top: 0; z-index: 100;
          box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        }
        .navbar-inner {
          display: flex; align-items: center; justify-content: space-between;
          height: 52px;
        }
        .nav-links { display: flex; }
        .nav-link {
          display: block; padding: 12px 15px;
          font-size: 13px; font-weight: 600; color: rgba(255,255,255,0.75);
          letter-spacing: 0.2px; transition: all 0.18s;
        }
        .nav-link:hover { color: white; }

        .page-hero {
          background: linear-gradient(135deg, var(--navy) 0%, var(--slate) 100%);
          padding: 80px 0;
          color: white;
          text-align: center;
          position: relative;
          overflow: hidden;
        }
        .page-hero-title {
          font-family: var(--serif);
          font-size: 42px; font-weight: 900;
          margin-bottom: 16px; position: relative;
        }
        .page-hero-sub {
          font-size: 18px; color: rgba(255,255,255,0.7);
          max-width: 700px; margin: 0 auto; position: relative;
        }

        .section { padding: 80px 0; border-bottom: 1px solid var(--border); }
        .section:last-child { border-bottom: none; }
        .section:nth-child(even) { background: white; }

        .sect-hd {
          margin-bottom: 40px; text-align: center;
        }
        .sect-hd-title {
          font-family: var(--serif); font-size: 32px; font-weight: 900;
          color: var(--navy); margin-bottom: 12px;
          display: inline-block; position: relative; padding-bottom: 12px;
        }
        .sect-hd-title::after {
          content: ''; position: absolute; bottom: 0; left: 50%; transform: translateX(-50%);
          width: 60px; height: 4px; background: var(--primary); border-radius: 2px;
        }

        .keg-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 30px; }
        .keg-card {
          background: white; border: 1px solid var(--border); border-radius: 16px;
          padding: 30px; transition: all 0.3s ease;
          display: flex; flex-direction: column;
        }
        .keg-card:hover { transform: translateY(-8px); box-shadow: 0 15px 30px rgba(0,0,0,0.08); border-color: var(--primary); }
        .keg-date {
          display: inline-block; padding: 6px 12px; background: var(--primary-lt);
          color: var(--primary); font-size: 11px; font-weight: 800; border-radius: 8px;
          margin-bottom: 16px; text-transform: uppercase;
        }
        .keg-title { font-family: var(--serif); font-size: 22px; font-weight: 800; color: var(--navy); margin-bottom: 12px; }
        .keg-desc { font-size: 14px; color: var(--gray); margin-bottom: 20px; line-height: 1.6; flex: 1; }
        .keg-loc { display: flex; align-items: center; gap: 8px; font-size: 13px; color: var(--gray-lt); font-weight: 600; }

        .mem-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 24px; }
        .mem-card {
          background: #f8fafc; border: 1px solid var(--border); border-radius: 20px;
          padding: 32px 20px; text-align: center; transition: all 0.3s;
        }
        .mem-card:hover { background: white; border-color: var(--primary); transform: scale(1.02); box-shadow: 0 10px 20px rgba(0,0,0,0.05); }
        .mem-avatar {
          width: 90px; height: 90px; border-radius: 50%; background: white;
          margin: 0 auto 20px; display: flex; align-items: center; justify-content: center;
          font-size: 32px; font-weight: 800; color: var(--gray-lt);
          border: 4px solid var(--primary-lt); box-shadow: 0 4px 10px rgba(0,0,0,0.1); overflow: hidden;
        }
        .mem-avatar img { width: 100%; height: 100%; object-fit: cover; }
        .mem-name { font-size: 16px; font-weight: 700; color: var(--navy); margin-bottom: 6px; }
        .mem-role { font-size: 11px; color: var(--primary); font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; }

        .empty {
          text-align: center; padding: 60px; color: var(--gray-lt);
          background: white; border-radius: 20px; border: 2px dashed var(--border);
        }

        .footer { background: var(--navy); color: white; padding: 60px 0 30px; }
        .footer-inner { display: flex; justify-content: space-between; align-items: center; }
        .footer-logo { font-family: var(--serif); font-size: 24px; font-weight: 900; }
        .footer-copy { font-size: 13px; color: rgba(255,255,255,0.5); }

        @media (max-width: 768px) {
          .page-hero-title { font-size: 32px; }
          .keg-grid, .mem-grid { grid-template-columns: 1fr; }
        }
      `}</style>

      <HomeHeader session={session} />

      <nav className="navbar">
        <div className="wrap">
          <div className="navbar-inner">
            <div className="nav-links">
              <Link href="/" className="nav-link">Beranda</Link>
              <Link href="/organisasi" className="nav-link" style={{ color: 'white' }}>Organisasi</Link>
            </div>
          </div>
        </div>
      </nav>

      <header className="page-hero">
        <div className="wrap">
          <h1 className="page-hero-title">Informasi Organisasi</h1>
          <p className="page-hero-sub">
            Mengenal lebih dekat struktur kepengurusan dan agenda kegiatan kami.
          </p>
        </div>
      </header>

      <main>
        <section id="berita" className="section">
          <div className="wrap">
            <div className="sect-hd">
              <h2 className="sect-hd-title">Berita Utama</h2>
            </div>
            {allBerita.length > 0 ? (
              <div className="keg-grid">
                {allBerita.map((b) => (
                  <Link key={b.id} href={`/berita/${b.id}`} className="keg-card" style={{ cursor: "pointer" }}>
                    {b.coverImage ? (
                      <div style={{ width: "100%", height: "180px", borderRadius: "10px", overflow: "hidden", marginBottom: "16px" }}>
                        <img src={b.coverImage} alt={b.judul} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      </div>
                    ) : (
                      <div style={{ width: "100%", height: "180px", borderRadius: "10px", overflow: "hidden", marginBottom: "16px", background: "linear-gradient(135deg, var(--primary-lt) 0%, #e2e8f0 100%)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "40px" }}>
                        📰
                      </div>
                    )}
                    <span className="keg-date">{formatDateShort(b.publishedAt)}</span>
                    <h3 className="keg-title" style={{ fontSize: "18px", lineHeight: "1.4", minHeight: "50px", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{b.judul}</h3>
                    <p className="keg-desc" style={{ display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden", fontSize: "13px", color: "var(--gray)", marginBottom: "12px" }}>{b.ringkasan || "Tidak ada ringkasan tersedia."}</p>
                    <div style={{ fontSize: "12px", color: "var(--gray-lt)", fontWeight: 600, display: "flex", alignItems: "center", gap: "6px", marginTop: "auto" }}>
                      <span>Oleh: {b.authorName || "Anonim"}</span>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="empty">
                <p>Belum ada berita utama yang dipublikasikan.</p>
              </div>
            )}
          </div>
        </section>

        <section id="profile" className="section">
          <div className="wrap">
            {/* Pengurus / Struktur Kepengurusan */}
            <div className="sect-hd">
              <h2 className="sect-hd-title">Struktur Kepengurusan</h2>
            </div>
            {allPengurus.length > 0 ? (
              <div className="mem-grid">
                {allPengurus.map((p) => (
                  <div key={p.id} className="mem-card">
                    <div className="mem-avatar">
                      {p.foto
                        ? <img src={p.foto} alt={p.nama} />
                        : (p.nama.split(' ').map((n: any) => n[0]).slice(0, 2).join('').toUpperCase() || "?")
                      }
                    </div>
                    <div className="mem-name">{p.nama}</div>
                    <div className="mem-role">{p.dapukan}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty">
                <p>Belum ada data struktur kepengurusan.</p>
              </div>
            )}
          </div>
        </section>

        {lokasiNama && (
          <section id="lokasi" className="section" style={{ background: "white" }}>
            <div className="wrap">
              <div className="sect-hd">
                <h2 className="sect-hd-title">Lokasi Kami</h2>
              </div>
              
              <div style={{
                background: "#f8fafc",
                border: "1px solid var(--border)",
                borderRadius: "24px",
                padding: "24px",
                boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.05), 0 2px 4px -2px rgb(0 0 0 / 0.05)",
                maxWidth: "900px",
                margin: "0 auto"
              }}>
                <div style={{ 
                  display: "flex", 
                  justifyContent: "space-between", 
                  alignItems: "center", 
                  marginBottom: "16px",
                  flexWrap: "wrap",
                  gap: "12px"
                }}>
                  <div>
                    <h3 style={{ fontSize: "20px", fontWeight: 700, color: "var(--navy)" }}>{lokasiNama}</h3>
                    <p style={{ fontSize: "14px", color: "var(--gray)", marginTop: "4px" }}>Petunjuk arah dan lokasi peta sekretariat kami.</p>
                  </div>
                  {lokasiGmaps && (
                    <a 
                      href={lokasiGmaps} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="btn btn-primary"
                      style={{ 
                        display: "inline-flex", 
                        alignItems: "center", 
                        gap: "8px", 
                        padding: "10px 20px", 
                        borderRadius: "12px",
                        fontSize: "14px",
                        fontWeight: 600,
                        backgroundColor: "var(--primary)",
                        color: "white",
                        transition: "background-color 0.2s"
                      }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: "4px" }}>
                        <path d="M15 3h6v6" />
                        <path d="M10 14 21 3" />
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                      </svg>
                      Buka di Google Maps
                    </a>
                  )}
                </div>

                {/* Embedded Map */}
                <div style={{ 
                  width: "100%", 
                  height: "450px", 
                  borderRadius: "16px", 
                  overflow: "hidden", 
                  border: "1px solid var(--border)",
                  boxShadow: "inset 0 2px 4px 0 rgb(0 0 0 / 0.05)"
                }}>
                  {getEmbedUrl(lokasiGmaps, lokasiNama) ? (
                    <iframe
                      src={getEmbedUrl(lokasiGmaps, lokasiNama)}
                      width="100%"
                      height="100%"
                      style={{ border: 0 }}
                      allowFullScreen={true}
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                    />
                  ) : (
                    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--gray)" }}>
                      Peta tidak dapat ditampilkan.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>
        )}
      </main>

      <footer className="footer">
        <div className="wrap">
          <div className="footer-inner">
            <div className="footer-logo">GENCAR BERKARYA</div>
            <div className="footer-copy">© 2026 GENCAR BERKARYA</div>
          </div>
        </div>
      </footer>
    </>
  );
}
