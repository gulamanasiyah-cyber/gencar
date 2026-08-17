
export const dynamic = 'force-dynamic';
import { db } from "@/lib/db";
import { artikel, users, generus, kegiatan, visitorStats, mandiriKegiatan } from "@/lib/schema";
import { eq, desc, and, inArray, sql, like, gt } from "drizzle-orm";

import Link from "next/link";
import FeaturedArticleSlider from "@/components/FeaturedArticleSlider";
import { getSession } from "@/lib/auth";

import HomeHeader from "@/components/HomeHeader";
import HomeNavbar from "@/components/HomeNavbar";
import NewsTicker from "@/components/NewsTicker";
import { AutoCarousel } from "@/components/AutoCarousel";
import MaintenanceView from "@/components/MaintenanceView";

import { settings } from "@/lib/schema";
import { checkMaintenance } from "@/lib/maintenance";
import JadwalSholat from "@/components/JadwalSholat";
import "./landing.css";

async function getSiteSettings() {
  try {
    const data = await db.select().from(settings);
    const result: any = {};
    data.forEach(s => { result[s.key] = s.value; });
    return result;
  } catch (err) {
    console.error("DEBUG: Failed to fetch site settings in server component:", err);
    return {};
  }
}

async function getVisitorStats() {
  try {
    return await db.select().from(visitorStats).orderBy(desc(visitorStats.count)).limit(6);
  } catch {
    return [];
  }
}

async function recordVisit() {
  try {
    // Untuk demo/sederhana, kita asumsikan pengunjung dari Indonesia (ID)
    // Di aplikasi nyata, ini bisa menggunakan GeoIP berdasarkan IP address
    const countryCode = "ID";
    const countryName = "Indonesia";

    const existing = await db.select().from(visitorStats).where(eq(visitorStats.countryCode, countryCode)).limit(1);

    if (existing.length > 0) {
      await db.update(visitorStats)
        .set({
          count: sql`${visitorStats.count} + 1`,
          updatedAt: new Date().toISOString()
        })
        .where(eq(visitorStats.countryCode, countryCode));
    } else {
      await db.insert(visitorStats).values({
        countryCode,
        countryName,
        count: 1
      });
    }
  } catch (error) {
    console.error("Error recording visit:", error);
  }
}
async function getPublishedArticles(limit = 12, tipe?: "artikel" | "berita", searchQuery?: string) {
  try {
    // Hanya ambil artikel (bukan berita) yang sudah disetujui (approved/published)
    const filters = [inArray(artikel.status, ["published", "approved"])];

    if (tipe) {
      filters.push(eq(artikel.tipe, tipe));
    }

    if (searchQuery) {
      filters.push(like(artikel.judul, `%${searchQuery}%`));
    }

    return await db
      .select({
        id: artikel.id,
        judul: artikel.judul,
        ringkasan: artikel.ringkasan,
        tipe: artikel.tipe,
        coverImage: artikel.coverImage,
        publishedAt: artikel.publishedAt,
        authorName: users.name,
      })
      .from(artikel)
      .leftJoin(users, eq(artikel.authorId, users.id))
      .where(and(...filters))
      .orderBy(desc(artikel.publishedAt))
      .limit(limit);
  } catch (error) {
    console.error("Error fetching articles:", error);
    return [];
  }
}

async function getPopularArticles(limit = 6) {
  try {
    return await db
      .select({
        id: artikel.id,
        judul: artikel.judul,
        coverImage: artikel.coverImage,
        publishedAt: artikel.publishedAt,
        ratingSum: artikel.ratingSum,
        ratingCount: artikel.ratingCount,
      })
      .from(artikel)
      .where(and(inArray(artikel.status, ["published", "approved"]), gt(artikel.ratingCount, 0)))
      .orderBy(desc(artikel.ratingSum))
      .limit(limit);
  } catch (error) {
    console.error("Error fetching popular articles:", error);
    return [];
  }
}

async function getRecentKegiatan(limit = 4, searchQuery?: string) {
  try {
    const filters1 = [];
    if (searchQuery) filters1.push(like(kegiatan.judul, `%${searchQuery}%`));

    const k1 = await db
      .select({ id: kegiatan.id, judul: kegiatan.judul, tanggal: kegiatan.tanggal, lokasi: kegiatan.lokasi })
      .from(kegiatan)
      .where(filters1.length > 0 ? and(...filters1) : undefined);

    const filters2 = [];
    if (searchQuery) filters2.push(like(mandiriKegiatan.judul, `%${searchQuery}%`));

    const k2 = await db
      .select({ id: mandiriKegiatan.id, judul: mandiriKegiatan.judul, tanggal: mandiriKegiatan.tanggal, lokasi: mandiriKegiatan.lokasi })
      .from(mandiriKegiatan)
      .where(filters2.length > 0 ? and(...filters2) : undefined);

    const merged = [...k1, ...k2].sort((a, b) => new Date(b.tanggal || 0).getTime() - new Date(a.tanggal || 0).getTime());
    return merged.slice(0, limit);
  } catch {
    return [];
  }
}


function formatDate(dateStr: string | null) {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatDateShort(dateStr: string | null) {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function timeAgo(dateStr: string | null) {
  if (!dateStr) return "";
  const now = new Date();
  const past = new Date(dateStr);
  const diff = Math.floor((now.getTime() - past.getTime()) / 1000);
  if (diff < 60) return `${diff} detik lalu`;
  if (diff < 3600) return `${Math.floor(diff / 60)} menit lalu`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} jam lalu`;
  return formatDateShort(dateStr);
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

export default async function LandingPage({ searchParams }: { searchParams: { q?: string } }) {
  const query = searchParams.q;
  const siteSettings = await getSiteSettings();
  const siteLogo = siteSettings.site_logo;
  const lokasiNama = siteSettings.lokasi_nama || "";
  const lokasiGmaps = siteSettings.lokasi_gmaps || "";
  const session = await getSession();

  // Mode Maintenance Check
  if (await checkMaintenance()) {
    return <MaintenanceView />;
  }

  // Catat Kunjungan
  await recordVisit();

  const articles = await getPublishedArticles(20, "artikel", query);
  const news = await getPublishedArticles(10, "berita", query);
  const popularArticles = await getPopularArticles(6);

  const allCombined = [...articles, ...news]
    .sort((a, b) => new Date(b.publishedAt || 0).getTime() - new Date(a.publishedAt || 0).getTime());

  // Kombinasikan Artikel dan Berita untuk Slider Hero, urutkan berdasarkan tanggal terbaru
  const combinedForHero = allCombined.slice(0, 8);

  const heroSliderArticles = combinedForHero;
  const gridArticles = allCombined.slice(0, 15); // Gunakan pool gabungan untuk grid di bawahnya

  const recentKegiatan = await getRecentKegiatan(4, query);


  const stats = await getVisitorStats();
  const totalVisitors = stats.reduce((acc, s) => acc + s.count, 0);
  const formattedTotal = totalVisitors.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");


  // All date/time logic moved to client-components or removed to prevent hydration mismatch

  return (
    <>
        

      <HomeHeader session={session} />
      <HomeNavbar query={query} session={session} />

      {/* News Ticker */}
      <NewsTicker articles={combinedForHero} />


      {/* ═══ MAIN CONTENT LAYOUT ═══ */}
      <div id="beranda" className="lp-main-layout" suppressHydrationWarning>

        {/* ─── LEFT COLUMN ─── */}
        <div>
          {query ? (
            <div style={{ background: 'white', borderRadius: '16px', padding: '20px', border: '1px solid var(--border)', marginBottom: '28px' }}>
              <div className="lp-sect-hd" style={{ marginBottom: 0 }}>
                <span className="lp-sect-hd-title">Hasil Pencarian: "{query}"</span>
                <Link href="/" className="lp-sect-more">Hapus ×</Link>
              </div>
            </div>
          ) : (
            <div style={{ minWidth: 0, marginBottom: '28px' }}>
              <section id="profile" style={{ marginBottom: '28px' }}>
                <div className="lp-sect-hd" style={{ marginBottom: '16px' }}>
                  <span className="lp-sect-hd-title">Profil Kami</span>
                </div>
                <div className="lp-video-wrap" style={{ marginBottom: '16px' }}>
                  <iframe
                    src="https://www.youtube.com/embed/kkDN69-4zco?autoplay=1&mute=1&loop=1&playlist=kkDN69-4zco&controls=0&modestbranding=1&rel=0&vq=hd720"
                    title="GENCAR Hero Video"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              </section>

              <FeaturedArticleSlider articles={heroSliderArticles} />
            </div>
          )}

          {query ? (
            <div>
              {articles.length === 0 && news.length === 0 ? (
                <div className="lp-empty">
                  <div className="lp-empty-icon">🔍</div>
                  <p className="lp-empty-text">Tidak ditemukan artikel atau berita dengan kata kunci "{query}".</p>
                </div>
              ) : (
                <div className="lp-art-grid">
                  {[...articles, ...news].map((item) => (
                    <Link href={`/artikel/${item.id}`} key={item.id} className="lp-art-card">
                      <div className="lp-art-img">
                        {item.coverImage
                          ? <img src={item.coverImage} alt={item.judul} />
                          : <div className="lp-art-img-placeholder">📄</div>
                        }
                        <span className={`lp-art-badge ${item.tipe === 'berita' ? 'lp-art-badge-berita' : 'lp-art-badge-artikel'}`}>{item.tipe}</span>
                      </div>
                      <div className="lp-art-body">
                        <h3 className="lp-art-title">{item.judul}</h3>
                        <div className="lp-art-foot">
                          <span className="lp-art-date">
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                            {formatDateShort(item.publishedAt)}
                          </span>
                          <span className="lp-art-read">Baca →</span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <>
              {/* ARTIKEL TERBARU */}
              <div className="lp-sect-hd" style={{ marginBottom: '20px' }}>
                <span className="lp-sect-hd-title">Artikel & Berita Terbaru</span>
                <Link href="/#artikel" className="lp-sect-more">Lihat Semua →</Link>
              </div>

              <div className="lp-art-grid">
                {gridArticles.map((item) => (
                  <Link href={`/artikel/${item.id}`} key={item.id} className="lp-art-card">
                    <div className="lp-art-img">
                      {item.coverImage
                        ? <img src={item.coverImage} alt={item.judul} />
                        : <div className="lp-art-img-placeholder">📄</div>
                      }
                      <span className={`lp-art-badge ${item.tipe === 'berita' ? 'lp-art-badge-berita' : 'lp-art-badge-artikel'}`}>{item.tipe}</span>
                    </div>
                    <div className="lp-art-body">
                      <h3 className="lp-art-title">{item.judul}</h3>
                      <div className="lp-art-foot">
                        <span className="lp-art-date">
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                          {formatDateShort(item.publishedAt)}
                        </span>
                        <span className="lp-art-read">Baca →</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>

              {/* LOKASI KAMI */}
              {lokasiNama && (
                <div style={{ marginBottom: '40px' }}>
                  <div className="lp-sect-hd" style={{ marginBottom: '16px' }}>
                    <span className="lp-sect-hd-title">Lokasi Kami</span>
                    {lokasiGmaps && (
                      <a
                        href={lokasiGmaps}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="lp-sect-more"
                      >
                        Buka Maps →
                      </a>
                    )}
                  </div>
                  <div style={{ background: 'white', borderRadius: '16px', border: '1px solid var(--border)', overflow: 'hidden', boxShadow: '0 4px 16px rgba(0,0,0,0.05)' }}>
                    <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: '36px', height: '36px', background: 'var(--primary-lt)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--navy)' }}>{lokasiNama}</div>
                        <div style={{ fontSize: '12px', color: 'var(--gray)' }}>Petunjuk arah & lokasi sekretariat</div>
                      </div>
                    </div>
                    <div style={{ height: '320px', position: 'relative' }}>
                      {getEmbedUrl(lokasiGmaps, lokasiNama) ? (
                        <iframe
                          src={getEmbedUrl(lokasiGmaps, lokasiNama)}
                          width="100%"
                          height="100%"
                          style={{ border: 0, display: 'block' }}
                          allowFullScreen={true}
                          loading="lazy"
                          referrerPolicy="no-referrer-when-downgrade"
                        />
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--gray)', fontSize: '14px' }}>
                          Peta tidak dapat ditampilkan.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* ─── RIGHT COLUMN (SIDEBAR) ─── */}
        <div className="lp-sidebar">

          {/* Terpopuler */}
          <div className="lp-widget">
            <div className="lp-widget-head">
              <span className="lp-widget-head-bar" />
              <span className="lp-widget-title">Terpopuler</span>
            </div>
            <div className="lp-widget-body">
              {popularArticles.map((item) => (
                <Link href={`/artikel/${item.id}`} key={item.id} className="lp-sw-thumb-item">
                  <div className="lp-sw-thumb">
                    {item.coverImage
                      ? <img src={item.coverImage} alt={item.judul} />
                      : <div className="lp-sw-thumb-placeholder">📰</div>
                    }
                  </div>
                  <div className="lp-sw-thumb-body">
                    <div className="lp-sw-thumb-title">{item.judul}</div>
                    <div className="lp-sw-thumb-date" suppressHydrationWarning>{timeAgo(item.publishedAt)}</div>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Visitor Stats */}
          <div className="lp-widget">
            <div className="lp-widget-head">
              <span className="lp-widget-head-bar" />
              <span className="lp-widget-title">Statistik Pengunjung</span>
            </div>
            <div className="lp-visitor-stats">
              <div className="lp-stats-total">
                <div className="lp-stats-num" suppressHydrationWarning>{formattedTotal}</div>
                <div className="lp-stats-label">Total Kunjungan</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center', fontSize: '11px', color: 'var(--gray)' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
                Data kunjungan real-time
              </div>
            </div>
          </div>

          {/* Agenda Kegiatan */}
          <div className="lp-widget">
            <div className="lp-widget-head">
              <span className="lp-widget-head-bar" />
              <span className="lp-widget-title">Agenda Kegiatan</span>
            </div>
            <div className="lp-widget-body">
              {recentKegiatan.length > 0 ? (
                <>
                  <div className="lp-keg-list">
                    {recentKegiatan.map((k) => {
                      const d = k.tanggal ? new Date(k.tanggal) : null;
                      const day = d ? d.getDate().toString().padStart(2, '0') : '—';
                      const mon = d ? d.toLocaleDateString('id-ID', { month: 'short' }) : '';
                      return (
                        <div key={k.id} className="lp-keg-item">
                          <div className="lp-keg-date-block">
                            <span className="lp-keg-date-day">{day}</span>
                            <span className="lp-keg-date-mon">{mon}</span>
                          </div>
                          <div className="lp-keg-body">
                            <div className="lp-keg-title">{k.judul}</div>
                            <div className="lp-keg-meta">
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                              {k.lokasi || 'Lokasi TBD'}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div style={{ padding: '12px 16px', borderTop: '1px solid #f1f5f9' }}>
                    <Link href="/agenda" style={{ display: 'block', textAlign: 'center', padding: '8px', background: 'var(--primary)', color: 'white', borderRadius: '8px', fontSize: '12.5px', fontWeight: 700, transition: 'all 0.2s' }}>
                      Lihat Semua Kegiatan →
                    </Link>
                  </div>
                </>
              ) : (
                <div style={{ padding: '24px', textAlign: 'center', color: 'var(--gray-lt)', fontSize: '13px' }}>
                  Belum ada kegiatan.
                </div>
              )}
            </div>
          </div>

          {/* Visi & Misi */}
          <div className="lp-widget">
            <div className="lp-widget-head">
              <span className="lp-widget-head-bar" />
              <span className="lp-widget-title">Visi & Misi</span>
            </div>
            <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[
                "Menjadi Generasi Penerus yang Berakhlaqul Karimah, Alim dan Faqih.",
                "Menjadi Generasi Penerus Profesional yang Religius.",
                "Mewujudkan Tri Sukses."
              ].map((misi, i) => (
                <div key={i} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                  <div style={{
                    background: 'linear-gradient(135deg, #dc2626, #b91c1c)',
                    color: 'white', width: '22px', height: '22px',
                    borderRadius: '7px', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', fontSize: '11px', fontWeight: 900,
                    flexShrink: 0, boxShadow: '0 2px 8px rgba(220,38,38,0.3)'
                  }}>
                    {i + 1}
                  </div>
                  <p style={{ margin: 0, fontSize: '12.5px', lineHeight: '1.55', color: 'var(--navy)', fontWeight: 500 }}>{misi}</p>
                </div>
              ))}
            </div>
          </div>


          {/* Jadwal Sholat */}
          <div className="lp-widget" style={{ overflow: 'hidden' }}>
            <div className="lp-widget-head">
              <span className="lp-widget-head-bar" />
              <span className="lp-widget-title">Jadwal Sholat</span>
            </div>
            <div style={{ padding: '16px' }}>
              <JadwalSholat />
            </div>
          </div>
        </div>
      </div>

      {/* ═══ ABOUT / VISI MISI STRIP ═══ */}
      <div className="lp-about">
        <div className="lp-wrap">
          <div className="lp-about-inner">
            <div>
              <span className="lp-about-tag">Tentang Kami</span>
              <h2 className="lp-about-title">
                Mewujudkan Generasi Penerus Profesional & Religius
              </h2>
              <p className="lp-about-desc">
                GENCAR adalah portal digital resmi bagi generasi muda Cengkareng yang berkomitmen
                menumbuhkan karakter islami, intelektualitas tinggi, dan profesionalisme dalam kehidupan bermasyarakat.
              </p>
              <div className="lp-about-actions">
                <Link href="/organisasi" className="lp-about-btn-2">Tentang Kami →</Link>
              </div>
            </div>
            <div className="lp-about-values">
              {[
                { icon: '🕌', title: 'Islami', desc: 'Berakhlaqul Karimah, Alim dan Faqih dalam kehidupan sehari-hari' },
                { icon: '🎓', title: 'Intelektual', desc: 'Generasi berpendidikan tinggi dan berpengetahuan luas' },
                { icon: '💼', title: 'Profesional', desc: 'Siap bersaing di era digital dengan kompetensi unggul' },
                { icon: '🤝', title: 'Sosial', desc: 'Berkontribusi aktif bagi masyarakat dan lingkungan sekitar' },
              ].map((v, i) => (
                <div key={i} className="lp-about-val">
                  <div className="lp-about-val-icon">{v.icon}</div>
                  <div className="lp-about-val-title">{v.title}</div>
                  <div className="lp-about-val-desc">{v.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ═══ FOOTER ═══ */}
      <footer className="lp-footer">
        <div className="lp-wrap">
          <div className="lp-footer-main">
            <div>
              <div className="lp-footer-brand">
                {siteLogo ? (
                  <img src={siteLogo} alt="Logo" style={{ width: '42px', height: '42px', objectFit: 'contain', borderRadius: '10px' }} />
                ) : (
                  <div className="lp-footer-logo">G</div>
                )}
                <span className="lp-footer-logo-name">GENCAR</span>
              </div>
              <p className="lp-footer-desc">
                Portal berita dan sistem manajemen digital resmi GENCAR Indonesia.
                Mewujudkan Generasi Penerus Profesional Religius.
              </p>
            </div>
            <div>
              <div className="lp-footer-col-hd">Navigasi</div>
              <a href="#beranda" className="lp-footer-link">Beranda</a>
              <a href="/#artikel" className="lp-footer-link">Artikel</a>
              <a href="/#berita" className="lp-footer-link">Berita</a>
              <a href="/#kegiatan" className="lp-footer-link">Kegiatan</a>
            </div>
            <div>
              <div className="lp-footer-col-hd">Lokasi</div>
              <Link href="https://share.google/GsGIX55kXxJnpXWIu" className="lp-footer-link">Masjid Baitul Muttaqin</Link>
              <Link href="/organisasi" className="lp-footer-link">Tentang Kami</Link>
            </div>
            <div>
              <div className="lp-footer-col-hd">Organisasi</div>
              <Link href="/agenda" className="lp-footer-link">Kegiatan</Link>
              <Link href="/login" className="lp-footer-link">Masuk</Link>
            </div>
          </div>
          <hr className="lp-footer-sep" />
          <div className="lp-footer-bottom" suppressHydrationWarning>
            <span className="lp-footer-copy" suppressHydrationWarning>© {new Date().getFullYear()} GENCAR — Hak Cipta Dilindungi</span>
            <div className="lp-footer-links-right">
              <span className="lp-footer-bl">Kebijakan Privasi</span>
              <span className="lp-footer-bl">Syarat & Ketentuan</span>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}
