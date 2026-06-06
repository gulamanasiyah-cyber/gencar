import { db } from "@/lib/db";
import { artikel, users } from "@/lib/schema";
import { eq, desc, and, ne } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";
import HomeHeader from "@/components/HomeHeader";
import HomeNavbar from "@/components/HomeNavbar";
import NewsTicker from "@/components/NewsTicker";
import { getSession } from "@/lib/auth";

export default async function PublicArtikelDetailPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const session = await getSession();

  // Fetch article data
  const data = await db.query.artikel.findFirst({
    where: eq(artikel.id, id),
  });

  if (!notPublished(data)) {
    // If not published, only author or admin can see it
    if (!session || (session.userId !== data?.authorId && !["admin", "pengurus_daerah", "kmm_daerah"].includes(session.role))) {
        notFound();
    }
  }

  function notPublished(d: any) {
    return d && (d.status === "published" || d.status === "approved");
  }

  if (!data) notFound();

  const author = await db.query.users.findFirst({ where: eq(users.id, data.authorId) });

  // Fetch related articles (same type, excluding current)
  const related = await db.select({
    id: artikel.id,
    judul: artikel.judul,
    coverImage: artikel.coverImage,
    publishedAt: artikel.publishedAt
  })
  .from(artikel)
  .where(and(eq(artikel.tipe, data.tipe), ne(artikel.id, data.id), eq(artikel.status, "published")))
  .orderBy(desc(artikel.publishedAt))
  .limit(4);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Merriweather:ital,wght@0,300;0,400;0,700;0,900;1,400&family=Playfair+Display:wght@700;800;900&display=swap');

        .journal-wrap { 
          max-width: 1200px; 
          margin: 0 auto; 
          padding: 80px 20px; 
          display: grid; 
          grid-template-columns: 1fr 300px; 
          gap: 60px;
        }

        .journal-body { 
          background: transparent; 
        }

        .journal-header { 
          border-bottom: 2px solid #1a1a1a; 
          padding-bottom: 40px; 
          margin-bottom: 50px; 
        }

        .journal-cat { 
          font-family: 'Inter', sans-serif;
          font-size: 11px; 
          font-weight: 800; 
          text-transform: uppercase; 
          letter-spacing: 2px; 
          color: #666;
          margin-bottom: 15px;
          display: block;
        }

        .journal-title { 
          font-family: 'Playfair Display', serif; 
          font-size: 52px; 
          font-weight: 800; 
          color: #1a1a1a; 
          line-height: 1.1; 
          margin-bottom: 30px; 
          letter-spacing: -1px;
        }

        .journal-meta { 
          display: flex; 
          align-items: center; 
          justify-content: space-between;
          font-family: 'Merriweather', serif;
          font-style: italic;
          font-size: 15px;
          color: #444;
          border-top: 1px solid #eee;
          padding-top: 20px;
        }

        .author-info { display: flex; align-items: center; gap: 10px; }
        .author-name { font-weight: 700; font-style: normal; text-decoration: underline; text-underline-offset: 4px; }

        .journal-actions { display: flex; gap: 12px; }
        .j-btn { 
          padding: 6px 14px; 
          border: 1px solid #1a1a1a; 
          font-size: 12px; 
          font-weight: 700; 
          text-transform: uppercase;
          text-decoration: none;
          color: #1a1a1a;
          transition: all 0.2s;
        }
        .j-btn:hover { background: #1a1a1a; color: white; }
        .j-btn-dark { background: #1a1a1a; color: white; }

        .journal-cover-wrap {
          margin-bottom: 50px;
          position: relative;
        }
        .journal-cover { 
          width: 100%; 
          aspect-ratio: 16/9;
          object-fit: cover; 
          filter: grayscale(20%);
          transition: filter 0.5s;
        }
        .journal-cover:hover { filter: grayscale(0%); }

        .journal-content { 
          font-family: 'Merriweather', serif;
          font-size: 20px; 
          line-height: 1.85; 
          color: #1a1a1a; 
          max-width: 720px;
          margin: 0 auto;
        }
        .journal-content p { margin-bottom: 32px; font-weight: 300; }
        .journal-content blockquote { 
          margin: 60px -40px; 
          padding: 0 40px;
          border-left: 3px solid #1a1a1a;
          font-size: 28px;
          line-height: 1.4;
          font-weight: 700;
          color: #000;
        }

        .sidebar-section { margin-bottom: 60px; }
        .sidebar-hd { 
          font-family: 'Playfair Display', serif;
          font-size: 20px; 
          font-weight: 800; 
          border-bottom: 1px solid #000;
          padding-bottom: 10px;
          margin-bottom: 25px;
        }

        .j-related-card { 
          display: block; 
          text-decoration: none; 
          margin-bottom: 30px; 
          padding-bottom: 20px;
          border-bottom: 1px solid #f0f0f0;
        }
        .j-related-cat { font-size: 9px; font-weight: 900; text-transform: uppercase; color: #888; margin-bottom: 8px; display: block; }
        .j-related-title { 
          font-family: 'Playfair Display', serif;
          font-size: 18px; 
          font-weight: 700; 
          color: #1a1a1a; 
          line-height: 1.3;
          margin-bottom: 8px;
        }
        .j-related-title:hover { text-decoration: underline; }

        .j-cta { 
          background: #f9f9f9; 
          padding: 30px; 
          border: 1px solid #eee;
          text-align: center;
        }
        .j-cta-hd { font-family: 'Playfair Display', serif; font-size: 22px; font-weight: 800; margin-bottom: 15px; }
        .j-cta-txt { font-family: 'Merriweather', serif; font-size: 14px; color: #666; margin-bottom: 20px; font-style: italic; }

        @media (max-width: 1024px) {
          .journal-wrap { grid-template-columns: 1fr; padding: 40px 20px; }
          .journal-title { font-size: 38px; }
          .journal-content { font-size: 18px; }
          .journal-content blockquote { margin: 40px 0; padding: 0 20px; }
        }
      `}</style>

      <HomeHeader session={session} />
      <HomeNavbar session={session} />
      <NewsTicker customText="Pusat informasi dan berita kegiatan GENCAR. Punya karya tulis atau info kegiatan terbaru? Yuk, kontribusi! Hubungi Admin untuk memuat artikel atau berita Kamu di sini." />

      <main style={{ background: '#fff' }}>
        <div className="journal-wrap">
          <article className="journal-body">
            <header className="journal-header">
              <span className="journal-cat">{data.tipe} / Vol. {new Date().getFullYear()}</span>
              <h1 className="journal-title">{data.judul}</h1>
              
              <div className="journal-meta">
                <div className="author-info">
                  Oleh <span className="author-name">{author?.name || "Redaksi GENCAR"}</span>
                </div>
                <div>
                  {data.publishedAt ? new Date(data.publishedAt).toLocaleDateString("id-ID", { day: 'numeric', month: 'long', year: 'numeric' }) : "-"}
                </div>
              </div>

              {session && (["admin", "pengurus_daerah", "kmm_daerah"].includes(session.role) || session.userId === data.authorId) && (
                <div className="journal-actions" style={{ marginTop: 20 }}>
                  <Link href={`/admin/artikel`} className="j-btn">Index</Link>
                  <Link href={`/artikel/${id}/edit`} className="j-btn j-btn-dark">Edit Script</Link>
                </div>
              )}
            </header>

            {data.coverImage && (
              <div className="journal-cover-wrap">
                <img src={data.coverImage} alt={data.judul} className="journal-cover" />
              </div>
            )}

            <div className="journal-content">
               {data.ringkasan && (
                 <blockquote>{data.ringkasan}</blockquote>
               )}
               <div style={{ whiteSpace: 'pre-wrap' }}>
                 {data.konten}
               </div>
            </div>
          </article>

          <aside className="journal-sidebar">
            <div className="sidebar-section">
              <h3 className="sidebar-hd">
                {data.tipe === "berita" ? "Berita Terkait" : "Artikel Terkait"}
              </h3>
              <div className="related-list">
                {related.map(r => (
                  <Link href={`/artikel/${r.id}`} key={r.id} className="j-related-card">
                    <span className="j-related-cat">Digital Journal</span>
                    <h4 className="j-related-title">{r.judul}</h4>
                    <div style={{ fontSize: 12, color: '#999', fontStyle: 'italic', fontFamily: 'Merriweather' }}>
                      {r.publishedAt ? new Date(r.publishedAt).toLocaleDateString("id-ID", { month: 'short', year: 'numeric' }) : "-"}
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            <div className="j-cta">
              <h3 className="j-cta-hd">Kontribusi Jurnal</h3>
              <p className="j-cta-txt">Kami menerima artikel ilmiah, opini, dan berita inspiratif dari seluruh generus.</p>
              <Link href="/login" className="j-btn j-btn-dark" style={{ display: 'block' }}>Kirim Naskah</Link>
            </div>
          </aside>
        </div>
      </main>

      <footer className="footer">
        <div className="wrap">
          <div className="footer-main">
            <div>
              <span className="footer-logo-name">GENCAR</span>
              <p className="footer-desc">
                Portal berita dan sistem manajemen digital resmi GENCAR.
                Membangun generasi Profesional yang Religius.
              </p>
            </div>
            <div>
              <div className="footer-col-hd">Navigasi</div>
              <Link href="/" className="footer-link">Beranda</Link>
              <Link href="/#artikel" className="footer-link">Artikel</Link>
              <Link href="/#berita" className="footer-link">Berita</Link>
            </div>
            <div>
              <div className="footer-col-hd">Lokasi</div>
              <Link href="https://share.google/GsGIX55kXxJnpXWIu" className="footer-link">Masjid Baitul Muttaqin</Link>
            </div>
            <div>
              <div className="footer-col-hd">Organisasi</div>
              <Link href="/#profile" className="footer-link">Profil Anggota</Link>
              <Link href="/#kegiatan" className="footer-link">Kegiatan</Link>
            </div>
          </div>
          <hr className="footer-sep" />
          <div className="footer-bottom">
            <span className="footer-copy">© 2026 GENCAR — Hak Cipta Dilindungi</span>
            <div className="footer-bottom-right">
              <span className="footer-bottom-link">Kebijakan Privasi</span>
              <span className="footer-bottom-link">Syarat & Ketentuan</span>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}



