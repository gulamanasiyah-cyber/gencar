import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams, Navigate } from "react-router-dom";
import { ArrowLeft, Search, ChevronLeft, ChevronRight, CalendarDays, User2, Share2, ArrowRight, Sparkles } from "lucide-react";
import { MOCK_ARTIKEL, ARTIKEL_KATEGORI_LABEL, type ArtikelKategori } from "./data";

const PER_PAGE_ARTIKEL = 6;

function getPages(current: number, total: number): (number | "…")[] {
  if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1);
  const out: (number | "…")[] = [1];
  if (current > 3) out.push("…");
  for (let p = Math.max(2, current - 1); p <= Math.min(total - 1, current + 1); p++) out.push(p);
  if (current < total - 2) out.push("…");
  out.push(total);
  // dedupe ellipsis neighbours
  return out.filter((v, i, a) => !(v === "…" && a[i - 1] === "…"));
}

function Pagination({
  page,
  totalPages,
  onPage,
}: {
  page: number;
  totalPages: number;
  onPage: (n: number) => void;
}) {
  if (totalPages <= 1) return null;
  const pages = getPages(page, totalPages);
  return (
    <nav className="pub-pagination" aria-label="Pagination">
      <button
        type="button"
        className="pub-pagination-btn"
        disabled={page <= 1}
        onClick={() => onPage(page - 1)}
        aria-label="Halaman sebelumnya"
      >
        <ChevronLeft size={16} /> Prev
      </button>
      <div className="pub-pagination-pages" role="list">
        {pages.map((p, i) =>
          p === "…" ? (
            <span key={`e-${i}`} className="pub-pagination-ellipsis">
              …
            </span>
          ) : (
            <button
              key={p}
              type="button"
              role="listitem"
              aria-current={page === p ? "page" : undefined}
              aria-label={`Halaman ${p}`}
              className={`pub-pagination-num ${page === p ? "is-active" : ""}`}
              onClick={() => onPage(p as number)}
            >
              {p}
            </button>
          ),
        )}
      </div>
      <button
        type="button"
        className="pub-pagination-btn"
        disabled={page >= totalPages}
        onClick={() => onPage(page + 1)}
        aria-label="Halaman berikutnya"
      >
        Next <ChevronRight size={16} />
      </button>
    </nav>
  );
}

// ── ARTIKEL LIST ── berita digabung ke artikel dengan kategori ──
const ARTIKEL_KATEGORI_OPTS: { value: ArtikelKategori | "semua"; label: string }[] = [
  { value: "semua", label: "Semua" },
  { value: "tuntunan_ibadah", label: "Tuntunan Ibadah" },
  { value: "info_kesehatan", label: "Info Kesehatan" },
  { value: "tafsir", label: "Tafsir" },
  { value: "kisah", label: "Kisah" },
  { value: "berita", label: "Berita" },
];

export function PublicArtikelList() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialKat = (searchParams.get("kategori") as ArtikelKategori | null) ?? "semua";
  const validKat = (ARTIKEL_KATEGORI_OPTS.some((o) => o.value === initialKat) ? initialKat : "semua") as ArtikelKategori | "semua";
  const [q, setQ] = useState("");
  const [kategori, setKategori] = useState<ArtikelKategori | "semua">(validKat);
  const [page, setPage] = useState(1);

  useEffect(() => {
    const urlKat = (searchParams.get("kategori") as ArtikelKategori | null) ?? "semua";
    if (ARTIKEL_KATEGORI_OPTS.some((o) => o.value === urlKat) && urlKat !== kategori) setKategori(urlKat as ArtikelKategori | "semua");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const setKategoriAndUrl = (v: ArtikelKategori | "semua") => {
    setKategori(v);
    const next = new URLSearchParams(searchParams);
    if (v === "semua") next.delete("kategori");
    else next.set("kategori", v);
    setSearchParams(next, { replace: true });
  };

  const filtered = useMemo(() => {
    let list = MOCK_ARTIKEL;
    if (kategori !== "semua") list = list.filter((a) => a.kategori === kategori);
    const s = q.trim().toLowerCase();
    if (s) list = list.filter((a) => `${a.judul} ${a.excerpt} ${a.author} ${ARTIKEL_KATEGORI_LABEL[a.kategori]}`.toLowerCase().includes(s));
    return list;
  }, [q, kategori]);

  useEffect(() => {
    setPage(1);
  }, [q, kategori]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE_ARTIKEL));
  const safePage = Math.min(page, totalPages);
  const slice = useMemo(
    () => filtered.slice((safePage - 1) * PER_PAGE_ARTIKEL, safePage * PER_PAGE_ARTIKEL),
    [filtered, safePage],
  );

  const goPage = (n: number) => {
    setPage(Math.max(1, Math.min(totalPages, n)));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // header besar: artikel terbaru (MOCK_ARTIKEL[0] = terbaru), independen dari filter kayak Kegiatan
  const featured = MOCK_ARTIKEL[0] ?? null;

  return (
    <div className="pub-section">
      <div className="pub-section-head-row" style={{ marginBottom: 18 }}>
        <div className="pub-section-head" style={{ marginBottom: 0 }}>
          <span className="pub-eyebrow">Tulisan Praktis</span>
          <h2>Artikel</h2>
          <p>Tulisan praktis untuk panitia dan pengurus — bisa langsung dipake. {filtered.length} tulisan.</p>
        </div>
        <span className="pub-trust-pill" style={{ alignSelf: "end" }}>
          {filtered.length} artikel
        </span>
      </div>

      {featured && (
        <Link to={`/artikel/${featured.slug}`} className="pub-artikel-hero">
          <div className="pub-artikel-hero-media">
            <img src={featured.cover} alt={featured.judul} loading="eager" />
            <span className="pub-tag pub-artikel-hero-tag">Artikel pilihan</span>
          </div>
          <div className="pub-artikel-hero-body">
            <span className="pub-kegiatan-hero-kicker">
              <Sparkles size={12} /> Terbaru · {ARTIKEL_KATEGORI_LABEL[featured.kategori]}
            </span>
            <h3 className="pub-kegiatan-hero-title">{featured.judul}</h3>
            <p className="pub-kegiatan-hero-excerpt">{featured.excerpt}</p>
            <span className="pub-kegiatan-hero-meta">
              <span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
                <CalendarDays size={12} /> {featured.tanggal}
              </span>
              <span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
                <User2 size={12} /> {featured.author}
              </span>
            </span>
            <span className="pub-kegiatan-hero-cta">
              Baca artikel <ArrowRight size={14} />
            </span>
          </div>
        </Link>
      )}

      <div className="pub-kegiatan-catbar">
        {ARTIKEL_KATEGORI_OPTS.map((o) => (
          <button
            key={o.value}
            type="button"
            className={`pub-kegiatan-cat ${kategori === o.value ? "is-active" : ""}`}
            onClick={() => setKategoriAndUrl(o.value)}
          >
            {o.label}
          </button>
        ))}
      </div>

      <div className="pub-list-toolbar">
        <label className="pub-search">
          <Search size={14} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari judul / topik / penulis..." aria-label="Cari artikel" />
          {q && (
            <button type="button" className="pub-search-clear" onClick={() => setQ("")} aria-label="Hapus pencarian">
              ×
            </button>
          )}
        </label>
        <span className="pub-toolbar-meta">
          Hal {safePage} dari {totalPages} · {filtered.length} hasil
        </span>
      </div>

      {filtered.length === 0 ? (
        <div className="pub-empty">
          <p style={{ fontWeight: 800 }}>Nggak ketemu.</p>
          <p style={{ fontSize: 13, color: "var(--pub-muted)", marginTop: 6 }}>Coba kata kunci lain — misal “panitia”, “poster”, atau “laporan”.</p>
          <button type="button" className="btn-ghost-dark" style={{ marginTop: 14 }} onClick={() => setQ("")}>
            Reset pencarian
          </button>
        </div>
      ) : (
        <>
          <div className="pub-artikel-grid">
            {slice.map((a) => (
              <Link key={a.slug} to={`/artikel/${a.slug}`} className="pub-artikel-card">
                <div className="pub-artikel-thumb">
                  <img src={a.cover} alt={a.judul} loading="lazy" />
                </div>
                <div className="pub-artikel-body">
                  <span className="pub-artikel-meta">
                    <CalendarDays size={11} /> {a.tanggal} · <User2 size={11} /> {a.author} · {ARTIKEL_KATEGORI_LABEL[a.kategori]}
                  </span>
                  <strong className="pub-artikel-title">{a.judul}</strong>
                  <p className="pub-artikel-excerpt">{a.excerpt}</p>
                  <span className="pub-artikel-cta">Baca artikel →</span>
                </div>
              </Link>
            ))}
          </div>
          <Pagination page={safePage} totalPages={totalPages} onPage={goPage} />
        </>
      )}
    </div>
  );
}

// ── ARTIKEL DETAIL ──────────────────────────────────────────────────────
export function PublicArtikelDetail() {
  const { slug } = useParams();
  const a = MOCK_ARTIKEL.find((x) => x.slug === slug);
  if (!a)
    return (
      <div className="pub-section">
        <div className="pub-empty">
          <p style={{ fontWeight: 800 }}>Artikel tidak ditemukan</p>
          <p style={{ fontSize: 13, color: "var(--pub-muted)", marginTop: 6 }}>
            Slug <code>{slug}</code> belum tayang.
          </p>
          <Link to="/artikel" className="btn-lime" style={{ marginTop: 14 }}>
            <ArrowLeft size={14} /> Kembali ke artikel
          </Link>
        </div>
      </div>
    );
  const related = MOCK_ARTIKEL.filter((x) => x.slug !== a.slug).slice(0, 3);
  return (
    <div className="pub-section pub-detail">
      <Link
        to="/artikel"
        style={{ fontSize: 13, fontWeight: 700, display: "inline-flex", gap: 6, alignItems: "center", width: "fit-content" }}
      >
        <ArrowLeft size={14} /> Semua artikel
      </Link>
      <div className="pub-detail-hero">
        <img src={a.cover} alt={a.judul} />
      </div>
      <div className="pub-detail-meta">
        <span>
          <CalendarDays size={12} /> {a.tanggal}
        </span>
        <span>
          <User2 size={12} /> {a.author}
        </span>
        <span className="pill pill-slate">{ARTIKEL_KATEGORI_LABEL[a.kategori]}</span>
      </div>
      <h1 className="pub-detail-title">{a.judul}</h1>
      <p className="pub-detail-excerpt">{a.excerpt}</p>
      <div className="pub-prose">
        <p>{a.excerpt}</p>
        <p>
          Konten lengkap via CMS (TipTap). Placeholder prose untuk preview layout — nanti diganti HTML rich-text dari API{" "}
          <code>/api/artikel/:slug</code>. Struktur heading, list, dan blockquote sudah di-style di <code>.pub-prose</code>.
        </p>
        <h2>Kenapa tulisan ini kepake</h2>
        <p>
          Tujuannya bukan teori panjang. Panitia butuh langkah yang bisa langsung dicoba besok — makanya tiap artikel
          ditutup checklist 3 poin dan template yang bisa di-copy.
        </p>
        <blockquote>
          Yang bikin tulisan kepake itu bukan panjangnya — tapi habis baca, orang tau mau ngapain besok pagi.
        </blockquote>
      </div>
      <div className="pub-detail-actions">
        <a
          href={`https://wa.me/?text=${encodeURIComponent(a.judul + " — " + (typeof window !== "undefined" ? window.location.href : ""))}`}
          target="_blank"
          rel="noreferrer"
          className="btn-lime"
        >
          <Share2 size={14} /> Share ke WhatsApp
        </a>
        <button type="button" className="btn-ghost-dark" onClick={() => navigator.clipboard.writeText(window.location.href)}>
          Copy link
        </button>
      </div>
      {related.length > 0 && (
        <div className="pub-related">
          <h3>Artikel lain</h3>
          <div className="pub-related-grid">
            {related.map((r) => (
              <Link key={r.slug} to={`/artikel/${r.slug}`} className="pub-related-card">
                <img src={r.cover} alt={r.judul} loading="lazy" />
                <div>
                  <strong>{r.judul}</strong>
                  <span>{r.tanggal} · {r.author}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── BERITA LIST — digabung ke Artikel (kategori berita) ──
export function PublicBeritaList() {
  return <Navigate to="/artikel?kategori=berita" replace />;
}

// ── BERITA DETAIL — redirect ke artikel detail ──
export function PublicBeritaDetail() {
  const { slug } = useParams();
  if (!slug) return <Navigate to="/artikel?kategori=berita" replace />;
  return <Navigate to={`/artikel/${slug}`} replace />;
}
