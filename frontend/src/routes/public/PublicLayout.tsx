import { useState } from "react";
import { NavLink, Outlet, Link, useLocation } from "react-router-dom";
import { Menu, X, ArrowRight, MapPin, Mail, Phone, LogIn } from "lucide-react";
import { motion, useScroll, useSpring } from "motion/react";

export default function PublicLayout() {
  const [open, setOpen] = useState(false);
  const loc = useLocation();
  const isHome = loc.pathname === "/";
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 400, damping: 30, restDelta: 0.001 });

  return (
    <div className="pub-root">
      <header className="pub-nav">
        <motion.div
          className="pub-nav-progress"
          style={{ scaleX, transformOrigin: "0%" }}
        />
        <div className="pub-nav-inner">
          <Link to="/" className="pub-brand" aria-label="Gencar home">
            <img src="/logos/gencar.png" alt="Gencar" className="pub-brand-logo" width={40} height={40} />
            <span>GENCAR</span>
            <small>Cengkareng</small>
          </Link>

          <nav className="pub-nav-links" aria-label="Primary">
            <NavLink to="/" className={({ isActive }) => (isActive ? "active" : "")}>Beranda</NavLink>
            <NavLink to="/kegiatan" className={({ isActive }) => (isActive ? "active" : "")}>Kegiatan</NavLink>
            <NavLink to="/galeri" className={({ isActive }) => (isActive ? "active" : "")}>Galeri</NavLink>
            <NavLink to="/artikel" className={({ isActive }) => (isActive ? "active" : "")}>Artikel</NavLink>
            <NavLink to="/pengurus" className={({ isActive }) => (isActive ? "active" : "")}>Pengurus</NavLink>
            <NavLink to="/tentang" className={({ isActive }) => (isActive ? "active" : "")}>Tentang</NavLink>
          </nav>

          <Link to="/login" className="pub-nav-ghost" aria-label="Masuk ke portal">
            <LogIn size={14} /> Masuk
          </Link>

          <Link to="/kegiatan" className="pub-nav-cta">
            Lihat Kegiatan <ArrowRight size={14} />
          </Link>

          <button
            className="pub-nav-burger btn-ghost pub-nav-burger--styled"
            aria-label={open ? "Tutup menu" : "Buka menu"}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>

        {open && (
          <div className="pub-mobile-drawer">
            {[
              ["/", "Beranda"],
              ["/kegiatan", "Kegiatan"],
              ["/galeri", "Galeri"],
              ["/artikel", "Artikel"],
              ["/pengurus", "Pengurus"],
              ["/tentang", "Tentang"],
            ].map(([to, label]) => (
              <Link
                key={to}
                to={to}
                onClick={() => setOpen(false)}
                style={{
                  padding: "12px 14px",
                  borderRadius: 12,
                  background: loc.pathname === to ? "var(--pub-ink)" : "var(--pub-paper-2)",
                  color: loc.pathname === to ? "#fff" : "var(--pub-ink)",
                  fontWeight: 700,
                  fontSize: 14,
                }}
              >
                {label}
              </Link>
            ))}
            <div style={{ height: 1, background: "var(--pub-line)", margin: "4px 0" }} aria-hidden />
            <Link
              to="/login"
              onClick={() => setOpen(false)}
              style={{
                padding: "12px 14px",
                borderRadius: 12,
                background: "var(--pub-ink)",
                color: "#fff",
                fontWeight: 800,
                fontSize: 14,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <LogIn size={16} /> Masuk — Absensi
            </Link>
          </div>
        )}
      </header>

      {!isHome && (
        <div className="pub-breadcrumb-wrap">
          <nav className="pub-breadcrumb" aria-label="Breadcrumb">
            <Link to="/">Beranda</Link>
            <span aria-hidden>›</span>
            <span className="pub-breadcrumb-current">
              {loc.pathname.split("/").filter(Boolean)[0] || "Beranda"}
            </span>
          </nav>
        </div>
      )}

      <main>
        <Outlet />
      </main>

      <footer className="pub-footer">
        <div className="pub-footer-inner">
          <div>
            <div className="pub-footer-brand">
              <img src="/logos/gencar.png" alt="Gencar" className="pub-brand-logo pub-brand-logo--footer" width={36} height={36} />
              <strong>GENCAR</strong>
              <span className="pub-footer-brand-sub">Cengkareng</span>
            </div>
            <p>
              Generasi Cahaya — wadah muda-mudi Cengkareng. Kegiatan publik dan artikel
              (tuntunan ibadah, info kesehatan, tafsir, kisah, berita) dikurasi pengurus.
              Konten internal tetap di sistem absensi.
            </p>
            <div className="pub-footer-social">
              <a href="https://instagram.com/gencar" aria-label="Instagram" target="_blank" rel="noopener noreferrer">IG</a>
              <a href="https://youtube.com/@gencar" aria-label="YouTube" target="_blank" rel="noopener noreferrer">YT</a>
            </div>
          </div>
          <div>
            <h4>Jelajah</h4>
            <div className="pub-footer-links">
              <Link to="/kegiatan">Kegiatan</Link>
              <Link to="/artikel">Artikel</Link>
              <Link to="/artikel?kategori=berita">Berita</Link>
              <Link to="/pengurus">Pengurus</Link>
              <Link to="/tentang">Tentang</Link>
            </div>
          </div>
          <div>
            <h4>Kategori</h4>
            <div className="pub-footer-links">
              <Link to="/kegiatan?kategori=sambung_rutin">Sambung Rutin</Link>
              <Link to="/kegiatan?kategori=keakraban">Keakraban</Link>
              <Link to="/kegiatan?kategori=pemantapan">Pemantapan</Link>
              <Link to="/kegiatan?kategori=lainnya">Lainnya</Link>
            </div>
          </div>
          <div>
            <h4>Kontak</h4>
            <div className="pub-footer-contact">
              <span className="pub-footer-contact-row"><MapPin size={14} /> Cengkareng, Jakarta Barat</span>
              <a href="mailto:halo@gencar.id" className="pub-footer-contact-row"><Mail size={14} /> halo@gencar.id</a>
              <a href="tel:+622100000000" className="pub-footer-contact-row"><Phone size={14} /> +62 21 0000 0000</a>
            </div>
          </div>
        </div>
        <div className="pub-footer-bottom">
          <span>© {new Date().getFullYear()} Gencar — Muda-Mudi Cengkareng. Dibuat dengan rapi, bukan template.</span>
          <span className="pub-footer-legal">
            <a href="/sitemap.xml">Sitemap</a>
            <a href="/tentang">Kebijakan</a>
          </span>
        </div>
      </footer>
    </div>
  );
}
