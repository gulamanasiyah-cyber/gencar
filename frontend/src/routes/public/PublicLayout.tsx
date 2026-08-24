import { useState } from "react";
import { NavLink, Outlet, Link, useLocation } from "react-router-dom";
import { Menu, X, ArrowRight, MapPin, Mail, Phone } from "lucide-react";

export default function PublicLayout() {
  const [open, setOpen] = useState(false);
  const loc = useLocation();
  const isHome = loc.pathname === "/";

  return (
    <div className="pub-root">
      <header className="pub-nav">
        <div className="pub-nav-inner">
          <Link to="/" className="pub-brand" aria-label="Gencar home">
            <span className="pub-brand-mark">G</span>
            <span>GENCAR</span>
            <small>Cengkareng</small>
          </Link>

          <nav className="pub-nav-links" aria-label="Primary">
            <NavLink to="/" className={({ isActive }) => (isActive ? "active" : "")}>Beranda</NavLink>
            <NavLink to="/kegiatan" className={({ isActive }) => (isActive ? "active" : "")}>Kegiatan</NavLink>
            <NavLink to="/artikel" className={({ isActive }) => (isActive ? "active" : "")}>Artikel</NavLink>
            <NavLink to="/pengurus" className={({ isActive }) => (isActive ? "active" : "")}>Pengurus</NavLink>
            <NavLink to="/tentang" className={({ isActive }) => (isActive ? "active" : "")}>Tentang</NavLink>
          </nav>

          <Link to="/kegiatan" className="pub-nav-cta">
            Lihat Kegiatan <ArrowRight size={14} />
          </Link>

          <button
            className="pub-nav-burger btn-ghost"
            aria-label={open ? "Tutup menu" : "Buka menu"}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            style={{ borderRadius: 999, padding: 10, minHeight: 40 }}
          >
            {open ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>

        {open && (
          <div
            style={{
              background: "#fff",
              borderTop: "1px solid var(--pub-line)",
              padding: "10px var(--pub-gutter) 14px",
              display: "grid",
              gap: 6,
            }}
          >
            {[
              ["/", "Beranda"],
              ["/kegiatan", "Kegiatan"],
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
          </div>
        )}
      </header>

      {!isHome && (
        <div style={{ maxWidth: "var(--pub-max)", margin: "0 auto", padding: "12px var(--pub-gutter) 0" }}>
          <nav aria-label="Breadcrumb" style={{ fontSize: 12, color: "var(--pub-muted)", display: "flex", gap: 6 }}>
            <Link to="/" style={{ textDecoration: "underline", textUnderlineOffset: 3 }}>Beranda</Link>
            <span aria-hidden>›</span>
            <span style={{ color: "var(--pub-ink)", fontWeight: 700, textTransform: "capitalize" }}>
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
            <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 10 }}>
              <span className="pub-brand-mark" style={{ background: "#fff", color: "#111118" }}>G</span>
              <strong style={{ letterSpacing: "-0.03em" }}>GENCAR</strong>
              <span style={{ fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", opacity: 0.6 }}>Cengkareng</span>
            </div>
            <p>
              Generasi Cahaya — wadah muda-mudi Cengkareng. Kegiatan publik dan artikel
              (tuntunan ibadah, info kesehatan, tafsir, kisah, berita) dikurasi pengurus.
              Konten internal tetap di sistem absensi.
            </p>
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <a href="#" aria-label="Instagram" style={{ width: 36, height: 36, borderRadius: 999, background: "rgba(255,255,255,0.08)", display: "grid", placeItems: "center", border: "1px solid rgba(255,255,255,0.1)", fontSize: 11, fontWeight: 800 }}>IG</a>
              <a href="#" aria-label="YouTube" style={{ width: 36, height: 36, borderRadius: 999, background: "rgba(255,255,255,0.08)", display: "grid", placeItems: "center", border: "1px solid rgba(255,255,255,0.1)", fontSize: 11, fontWeight: 800 }}>YT</a>
            </div>
          </div>
          <div>
            <h4>Jelajah</h4>
            <div style={{ display: "grid", gap: 6 }}>
              <Link to="/kegiatan">Kegiatan</Link>
              <Link to="/artikel">Artikel</Link>
              <Link to="/artikel?kategori=berita">Berita</Link>
              <Link to="/pengurus">Pengurus</Link>
              <Link to="/tentang">Tentang</Link>
            </div>
          </div>
          <div>
            <h4>Kategori</h4>
            <div style={{ display: "grid", gap: 6 }}>
              <a href="/kegiatan?kategori=sambung_rutin">Sambung Rutin</a>
              <a href="/kegiatan?kategori=keakraban">Keakraban</a>
              <a href="/kegiatan?kategori=pemantapan">Pemantapan</a>
              <a href="/kegiatan?kategori=lainnya">Lainnya</a>
            </div>
          </div>
          <div>
            <h4>Kontak</h4>
            <div style={{ display: "grid", gap: 8 }}>
              <a href="#" style={{ display: "flex", gap: 8, alignItems: "center" }}><MapPin size={14} /> Cengkareng, Jakarta Barat</a>
              <a href="mailto:halo@gencar.id" style={{ display: "flex", gap: 8, alignItems: "center" }}><Mail size={14} /> halo@gencar.id</a>
              <a href="tel:+622100000000" style={{ display: "flex", gap: 8, alignItems: "center" }}><Phone size={14} /> +62 21 0000 0000</a>
            </div>
          </div>
        </div>
        <div className="pub-footer-bottom">
          <span>© {new Date().getFullYear()} Gencar — Muda-Mudi Cengkareng. Dibuat dengan rapi, bukan template.</span>
          <span style={{ display: "flex", gap: 12 }}>
            <a href="/sitemap.xml">Sitemap</a>
            <a href="#">Kebijakan</a>
          </span>
        </div>
      </footer>
    </div>
  );
}
