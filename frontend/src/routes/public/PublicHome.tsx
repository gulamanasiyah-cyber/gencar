import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "motion/react";
import { ArrowRight, CalendarDays, MapPin, ArrowUpRight } from "lucide-react";
import { MOCK_KEGIATAN, MOCK_ARTIKEL, MOCK_PENGURUS } from "./data";

const HERO_IMG = "https://picsum.photos/seed/gencar-hero/1100/1100";
const ABOUT_IMG = "https://picsum.photos/seed/gencar-about/900/700";

function Reveal({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const reduce = useReducedMotion();
  if (reduce) return <>{children}</>;
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.55, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}

export default function PublicHome() {
  const featured = MOCK_KEGIATAN[0];
  const side = MOCK_KEGIATAN.slice(1, 3);
  const row2 = MOCK_KEGIATAN.slice(3, 5);
  const leadArticle = MOCK_ARTIKEL[0];

  return (
    <>
      {/* HERO — formal perkenalan awal, 5-detik jelas */}
      <section className="pub-hero">
        <div className="pub-hero-copy">
          <span className="pub-eyebrow">Generasi Cahaya — Muda-Mudi Cengkareng</span>
          <h1>
            Wadah pembinaan generasi muda yang <em>tertata dan terbuka</em>
          </h1>
          <p className="pub-hero-sub">
            Gencar menghimpun dan membina muda-mudi Cengkareng melalui kegiatan yang
            terdokumentasi dengan baik — foto, jadwal, dan lokasi yang jelas. Siapa pun
            dapat mengenal, mengikuti, atau mendukung secara transparan.
          </p>
          <div className="pub-hero-actions">
            <Link to="/kegiatan" className="btn-lime">
              Lihat Kegiatan <ArrowRight size={16} />
            </Link>
            <Link to="/tentang" className="btn-ghost-dark">
              Tentang Gencar
            </Link>
          </div>
        </div>

        <div className="pub-hero-visual">
          <img src={HERO_IMG} alt="Kegiatan Gencar — suasana lapangan" loading="eager" />
          <div className="pub-hero-float">
            <span style={{ width: 36, height: 36, borderRadius: 12, background: "var(--pub-lime)", display: "grid", placeItems: "center", flexShrink: 0 }}>
              <CalendarDays size={16} />
            </span>
            <div style={{ minWidth: 0 }}>
              <strong>Agenda terdekat</strong>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 2 }}>
                <span style={{ display: "inline-flex", gap: 6, alignItems: "center", fontSize: 12 }}><CalendarDays size={12} /> 15 Mar 2026</span>
                <span style={{ display: "inline-flex", gap: 6, alignItems: "center", fontSize: 12 }}><MapPin size={12} /> Cengkareng Timur</span>
              </div>
            </div>
            <Link to={`/kegiatan/${featured.slug}`} style={{ marginLeft: "auto", width: 36, height: 36, borderRadius: 999, background: "var(--pub-ink)", color: "#fff", display: "grid", placeItems: "center", flexShrink: 0 }} aria-label="Lihat kegiatan">
              <ArrowUpRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      {/* BENTO — kegiatan terlaksana */}
      <section className="pub-section">
        <div className="pub-section-head-row">
          <div className="pub-section-head" style={{ marginBottom: 0 }}>
            <h2>Kegiatan yang Terlaksana</h2>
            <p>Dokumentasi kegiatan yang telah terlaksana — lengkap dengan foto, tanggal, dan lokasi.</p>
          </div>
          <Link to="/kegiatan" className="pub-link">Semua kegiatan <ArrowRight size={14} /></Link>
        </div>

        <div className="pub-bento" style={{ marginTop: 18 }}>
          <Link to={`/kegiatan/${featured.slug}`} className="pub-bento-featured">
            <img src={featured.cover} alt={featured.judul} loading="lazy" />
            <div className="pub-bento-featured-content">
              <span className="pub-tag">{featured.kategori}</span>
              <h3>{featured.judul}</h3>
              <div className="meta">
                <span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}><CalendarDays size={12} /> {featured.tanggal}</span>
                <span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}><MapPin size={12} /> {featured.lokasi}</span>
              </div>
            </div>
          </Link>

          <div className="pub-bento-side">
            {side.map((k) => (
              <Link key={k.slug} to={`/kegiatan/${k.slug}`} className="pub-mini-card">
                <img src={k.cover} alt={k.judul} loading="lazy" />
                <div>
                  <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--pub-muted)" }}>{k.kategori}</span>
                  <h4>{k.judul}</h4>
                  <p style={{ display: "flex", gap: 6, alignItems: "center" }}><CalendarDays size={11} /> {k.tanggal} · {k.lokasi}</p>
                </div>
              </Link>
            ))}
          </div>

          <div className="pub-bento-row2">
            {row2.map((k) => (
              <Link key={k.slug} to={`/kegiatan/${k.slug}`} className="pub-wide-card">
                <div className="pub-wide-card-body">
                  <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--pub-muted)" }}>{k.kategori}</span>
                  <h4>{k.judul}</h4>
                  <p>{k.excerpt}</p>
                  <span style={{ fontSize: 12, fontWeight: 700, display: "inline-flex", gap: 6, alignItems: "center", marginTop: 2 }}>{k.tanggal} · {k.lokasi} <ArrowRight size={12} /></span>
                </div>
                <img src={k.cover} alt={k.judul} loading="lazy" />
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* PARTNER — mitra dan naungan — tanpa card, label segede h2 */}
      <section className="pub-section pub-partners-section" style={{ paddingTop: 12, paddingBottom: 12 }}>
        <div className="pub-partners">
          <h2 className="pub-partners-label">Mitra dan Naungan</h2>
          <div className="pub-partners-logos">
            <img src="/logos/ldii.png" alt="LDII" loading="lazy" width="120" height="40" />
            <img src="/logos/senkom.png" alt="SENKOM Mitra Polri" loading="lazy" width="120" height="40" />
            <img src="/logos/persinas.png" alt="PERSINAS ASAD" loading="lazy" width="120" height="40" />
            <img src="/logos/forsgi.png" alt="FORSGI" loading="lazy" width="120" height="40" />
          </div>
        </div>
      </section>

      {/* EDITORIAL — tulisan pilihan */}
      <section className="pub-section" style={{ paddingTop: 0 }}>
        <div className="pub-section-head-row">
          <div className="pub-section-head" style={{ marginBottom: 0 }}>
            <h2>Tulisan Pilihan</h2>
            <p>Rangkuman dan panduan praktis seputar pengelolaan kegiatan dan komunitas.</p>
          </div>
          <Link to="/artikel" className="pub-link">Semua artikel <ArrowRight size={14} /></Link>
        </div>

        <div className="pub-editorial" style={{ marginTop: 18 }}>
          <Link to={`/artikel/${leadArticle.slug}`} className="pub-feature-article">
            <img src={leadArticle.cover} alt={leadArticle.judul} loading="lazy" />
            <div className="pub-feature-article-body">
              <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--pub-muted)" }}>{leadArticle.author} · {leadArticle.tanggal}</span>
              <h3>{leadArticle.judul}</h3>
              <p>{leadArticle.excerpt}</p>
              <span style={{ fontSize: 13, fontWeight: 700, display: "inline-flex", gap: 6, alignItems: "center" }}>Baca artikel <ArrowRight size={14} /></span>
            </div>
          </Link>

          <div className="pub-side-list">
            {MOCK_ARTIKEL.slice(1, 4).map((a) => (
              <Link key={a.slug} to={`/artikel/${a.slug}`} className="pub-side-item">
                <span style={{ fontSize: 11, color: "var(--pub-muted)", fontWeight: 700 }}>{a.tanggal} · {a.author}</span>
                <h4>{a.judul}</h4>
                <p>{a.excerpt}</p>
              </Link>
            ))}
            <Link to="/artikel?kategori=berita" style={{ fontSize: 13, fontWeight: 700, display: "inline-flex", gap: 6, alignItems: "center", paddingTop: 2 }}>
              Lihat berita juga <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </section>

      {/* PENGURUS — pengenalan pengurus */}
      <section className="pub-section" style={{ paddingTop: 0 }}>
        <Reveal>
          <div className="pub-section-head-row">
            <div className="pub-section-head" style={{ marginBottom: 0 }}>
              <h2>Pengurus Harian</h2>
              <p>Mengenal pengurus yang mengelola kegiatan dan pembinaan sehari-hari.</p>
            </div>
            <Link to="/pengurus" className="pub-link">Semua pengurus <ArrowRight size={14} /></Link>
          </div>
          <div className="pub-people" style={{ marginTop: 18 }}>
            {MOCK_PENGURUS.map((p) => (
              <div key={p.nama} className="pub-person">
                <img src={p.foto} alt={p.nama} loading="lazy" />
                <div className="pub-person-body">
                  <strong>{p.nama}</strong>
                  <span>{p.role}</span>
                </div>
              </div>
            ))}
          </div>
        </Reveal>
      </section>

      {/* TENTANG — ajakan formal */}
      <section className="pub-section" style={{ paddingTop: 0 }}>
        <div className="pub-about">
          <div>
            <h3>Gencar adalah Rumah Bersama</h3>
            <p>
              Kami berkumpul untuk tumbuh bersama melalui kegiatan yang terbuka dan
              terdokumentasi. Foto, lokasi, dan cerita tersedia secara transparan.
              Bagi yang ingin mengikuti atau mendukung, pintu kami selalu terbuka.
            </p>
            <div style={{ display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap" }}>
              <Link to="/tentang" className="btn-lime">Tentang Gencar</Link>
              <Link to="/kegiatan" className="btn-ghost-dark">Lihat Kegiatan</Link>
            </div>
          </div>
          <img src={ABOUT_IMG} alt="Suasana Gencar" loading="lazy" />
        </div>
      </section>
    </>
  );
}
