import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams, Navigate } from "react-router-dom";
import { ArrowLeft, Search, ChevronLeft, ChevronRight, CalendarDays, User2, Share2, ArrowRight, Sparkles } from "lucide-react";
import { type PubArticle } from "./data";
import { apiFetch, unwrapList } from "../../lib/api";
import { labelKategori } from "../../lib/labelKategori";
import { SkeletonArtikelCard, SkeletonDetailPage, Skeleton } from "../../components/Skeleton";

const PER_PAGE_ARTIKEL = 6;

function getPages(current: number, total: number): (number | "…")[] {
  if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1);
  const out: (number | "…")[] = [1];
  if (current > 3) out.push("…");
  for (let p = Math.max(2, current - 1); p <= Math.min(total - 1, current + 1); p++) out.push(p);
  if (current < total - 2) out.push("…");
  out.push(total);
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

export function PublicArtikelList() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [q, setQ] = useState("");
  const [kategori, setKategori] = useState<string>("semua");
  const [page, setPage] = useState(1);
  const [articles, setArticles] = useState<PubArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [showMoreCats, setShowMoreCats] = useState(false);

  // Derive categories from fetched articles
  const dataCats = useMemo(() => {
    const cats = new Set<string>();
    for (const a of articles) {
      if (a.kategori) cats.add(a.kategori);
    }
    return Array.from(cats);
  }, [articles]);

  const visibleCats = useMemo(() => dataCats.slice(0, 3), [dataCats]);
  const overflowCats = useMemo(() => dataCats.slice(3), [dataCats]);
  const isOverflowActive = useMemo(() => overflowCats.includes(kategori), [overflowCats, kategori]);

  useEffect(() => {
    const urlKat = searchParams.get("kategori") ?? "semua";
    if (urlKat !== kategori) setKategori(urlKat);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  useEffect(() => {
    let cancel = false;
    setLoading(true);
    apiFetch<unknown>("/api/artikel?status=published")
      .then((raw) => {
        if (cancel) return;
        const unwrapped = unwrapList<{
          id?: string;
          slug?: string;
          judul: string;
          ringkasan?: string;
          coverImage?: string;
          cover_image?: string;
          kategori?: string;
          publishedAt?: string;
          createdAt?: string;
          authorName?: string;
        }>(raw);

        const list: PubArticle[] = unwrapped.data.map((r) => ({
          slug: r.slug ?? r.id ?? "",
          judul: r.judul,
          excerpt: r.ringkasan ?? "",
          cover: r.coverImage ?? r.cover_image ?? "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=700&h=480&q=80",
          tanggal: (r.publishedAt ?? r.createdAt ?? "").slice(0, 10),
          author: r.authorName ?? "Pengurus",
          kategori: r.kategori ?? "Lainnya",
        }));

        setArticles(list);
        setLoading(false);
      })
      .catch(() => {
        if (!cancel) {
          setArticles([]);
          setLoading(false);
        }
      });

    return () => { cancel = true; };
  }, []);

  const setKategoriAndUrl = (v: string) => {
    setKategori(v);
    const next = new URLSearchParams(searchParams);
    if (v === "semua") next.delete("kategori");
    else next.set("kategori", v);
    setSearchParams(next, { replace: true });
  };

  const filtered = useMemo(() => {
    let list = articles;
    if (kategori !== "semua") list = list.filter((a) => a.kategori === kategori);
    const s = q.trim().toLowerCase();
    if (s) list = list.filter((a) => `${a.judul} ${a.excerpt} ${a.author} ${a.kategori}`.toLowerCase().includes(s));
    return list;
  }, [articles, q, kategori]);

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

  const featured = articles[0] ?? null;

  return (
    <div className="pub-section">
      <div className="pub-section-head-row" style={{ marginBottom: 18 }}>
        <div className="pub-section-head" style={{ marginBottom: 0 }}>
          <span className="pub-eyebrow">Tulisan Praktis</span>
          <h2>Artikel &amp; Risalah</h2>
          <p>Tulisan seputar ibadah, akhlak, kesehatan, dan panduan kegiatan muda-mudi Cengkareng.</p>
        </div>
        <span className="pub-trust-pill" style={{ alignSelf: "end" }}>
          {filtered.length} artikel
        </span>
      </div>

      {loading ? (
        <div className="pub-artikel-hero" aria-busy="true" aria-label="Memuat artikel unggulan…">
          <div className="pub-artikel-hero-media">
            <Skeleton width="100%" height={320} radius={0} />
          </div>
          <div className="pub-artikel-hero-body" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <Skeleton width={160} height={14} radius={999} />
            <Skeleton width="85%" height={24} radius={6} />
            <Skeleton width="100%" height={14} radius={4} />
            <Skeleton width="60%" height={14} radius={4} />
            <Skeleton width={120} height={16} radius={999} />
          </div>
        </div>
      ) : featured ? (
        <Link to={`/artikel/${featured.slug}`} className="pub-artikel-hero">
          <div className="pub-artikel-hero-media">
            <img src={featured.cover} alt={featured.judul} loading="eager" />
            <span className="pub-tag pub-artikel-hero-tag">Artikel pilihan</span>
          </div>
          <div className="pub-artikel-hero-body">
            <span className="pub-kegiatan-hero-kicker">
              <Sparkles size={12} /> Terbaru · {labelKategori(featured.kategori)}
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
      ) : null}

      <div className="pub-kegiatan-catbar">
        {/* Semua selalu ada */}
        <button
          type="button"
          className={`pub-kegiatan-cat ${kategori === "semua" ? "is-active" : ""}`}
          onClick={() => setKategoriAndUrl("semua")}
        >
          Semua
        </button>

        {/* Max 3 data kategori */}
        {visibleCats.map((cat) => (
          <button
            key={cat}
            type="button"
            className={`pub-kegiatan-cat ${kategori === cat ? "is-active" : ""}`}
            onClick={() => setKategoriAndUrl(cat)}
          >
            {labelKategori(cat)}
          </button>
        ))}

        {/* Overflow: "+N" buka modal */}
        {overflowCats.length > 0 && (
          <button
            type="button"
            className={`pub-kegiatan-cat ${isOverflowActive ? "is-active" : ""}`}
            onClick={() => setShowMoreCats(true)}
          >
            +{overflowCats.length} Lainnya
          </button>
        )}
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

      {loading ? (
        <div className="pub-artikel-grid" style={{ marginTop: 20 }} aria-busy="true" aria-label="Memuat artikel…">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <SkeletonArtikelCard key={i} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="pub-empty">
          <p style={{ fontWeight: 800 }}>Nggak ketemu.</p>
          <p style={{ fontSize: 13, color: "var(--pub-muted)", marginTop: 6 }}>Coba kata kunci lain atau pilih kategori Semua.</p>
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
                    <CalendarDays size={11} /> {a.tanggal} · <User2 size={11} /> {a.author} · {labelKategori(a.kategori)}
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

      {/* MODAL KATEGORI LAINNYA */}
      {showMoreCats && (
        <div className="modal-backdrop" onClick={() => setShowMoreCats(false)} style={{ zIndex: 1200, display: "grid", placeItems: "center", padding: 16 }}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 420, width: "100%", padding: 22, borderRadius: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <h3 style={{ fontSize: 16, fontWeight: 800, margin: 0 }}>Kategori Lainnya</h3>
              <button type="button" style={{ padding: 6, background: "none", border: "none", cursor: "pointer", color: "var(--muted)" }} onClick={() => setShowMoreCats(false)}>✕</button>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {overflowCats.map((cat) => {
                const active = kategori === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    className={`pub-kegiatan-cat ${active ? "is-active" : ""}`}
                    style={{ fontSize: 13, padding: "8px 14px" }}
                    onClick={() => {
                      setKategoriAndUrl(cat);
                      setShowMoreCats(false);
                    }}
                  >
                    {labelKategori(cat)}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function PublicArtikelDetail() {
  const { slug } = useParams<{ slug: string }>();
  const [item, setItem] = useState<{ judul: string; ringkasan?: string; konten: string; coverImage?: string; cover_image?: string; publishedAt?: string; createdAt?: string; authorName?: string; kategori?: string } | null>(null);
  const [related, setRelated] = useState<PubArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!slug) return;
    let cancel = false;
    setLoading(true);

    apiFetch<any>(`/api/artikel/${encodeURIComponent(slug)}`)
      .then((raw) => {
        if (cancel || !raw) return;
        setItem(raw);
        setLoading(false);

        apiFetch<unknown>("/api/artikel?status=published")
          .then((relRaw) => {
            if (cancel) return;
            const unwrapped = unwrapList<{ slug?: string; id?: string; judul: string; ringkasan?: string; coverImage?: string; cover_image?: string; publishedAt?: string; createdAt?: string; authorName?: string; kategori?: string }>(relRaw);
            const relList = unwrapped.data
              .filter((x) => (x.slug ?? x.id) !== slug)
              .slice(0, 3)
              .map((x) => ({
                slug: x.slug ?? x.id ?? "",
                judul: x.judul,
                excerpt: x.ringkasan ?? "",
                cover: x.coverImage ?? x.cover_image ?? "",
                tanggal: (x.publishedAt ?? x.createdAt ?? "").slice(0, 10),
                author: x.authorName ?? "Pengurus",
                kategori: x.kategori ?? "Lainnya",
              }));
            setRelated(relList);
          })
          .catch(() => {});
      })
      .catch(() => {
        if (!cancel) {
          setItem(null);
          setLoading(false);
        }
      });

    return () => { cancel = true; };
  }, [slug]);

  const onShare = async () => {
    if (navigator.share && item) {
      try {
        await navigator.share({ title: item.judul, text: item.ringkasan, url: window.location.href });
        return;
      } catch {}
    }
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  if (loading) {
    return (
      <div className="pub-section" style={{ paddingTop: 32 }}>
        <SkeletonDetailPage />
      </div>
    );
  }

  if (!item) {
    return (
      <div className="pub-section" style={{ paddingTop: 32 }}>
        <div className="pub-empty">
          <h2>Artikel tidak ditemukan</h2>
          <p>Mungkin tautan sudah berganti atau artikel telah diarsipkan.</p>
          <Link to="/artikel" className="btn-lime">
            <ArrowLeft size={14} /> Kembali ke Indeks Artikel
          </Link>
        </div>
      </div>
    );
  }

  const cover = item.coverImage ?? item.cover_image ?? "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=900&h=600&q=80";
  const dateStr = (item.publishedAt ?? item.createdAt ?? "").slice(0, 10);
  const author = item.authorName ?? "Pengurus";
  const kat = item.kategori ?? "Lainnya";

  return (
    <article className="pub-section" style={{ paddingTop: 24 }}>
      <div className="pub-detail-back">
        <Link to="/artikel" className="pub-link" style={{ borderBottom: "none" }}>
          <ArrowLeft size={14} /> Semua Artikel
        </Link>
      </div>

      <header className="pub-detail-head">
        <span className="pub-tag" style={{ width: "fit-content", marginBottom: 12 }}>
          {labelKategori(kat)}
        </span>
        <h1 className="pub-detail-title">{item.judul}</h1>
        {item.ringkasan && <p className="pub-detail-lead">{item.ringkasan}</p>}
        <div className="pub-detail-meta-bar">
          <div className="pub-detail-meta-item"><CalendarDays size={15} /><strong>{dateStr}</strong></div>
          <div className="pub-detail-meta-item"><User2 size={15} /><strong>{author}</strong></div>
          <button type="button" className="pub-detail-share" onClick={onShare} aria-label="Bagikan artikel">
            <Share2 size={14} /> {copied ? "Tersalin!" : "Bagikan"}
          </button>
        </div>
      </header>

      <div className="pub-detail-media">
        <img src={cover} alt={item.judul} loading="eager" />
      </div>

      <div className="pub-detail-content">
        <div className="pub-prose" dangerouslySetInnerHTML={{ __html: item.konten }} />
      </div>

      {related.length > 0 && (
        <section className="pub-detail-related">
          <h2>Artikel Terkait Lainnya</h2>
          <div className="pub-artikel-grid">
            {related.map((r) => (
              <Link key={r.slug} to={`/artikel/${r.slug}`} className="pub-artikel-card">
                <div className="pub-artikel-thumb">
                  <img src={r.cover} alt={r.judul} loading="lazy" />
                </div>
                <div className="pub-artikel-body">
                  <span className="pub-artikel-meta">
                    <CalendarDays size={11} /> {r.tanggal} · <User2 size={11} /> {r.author}
                  </span>
                  <strong className="pub-artikel-title">{r.judul}</strong>
                  <p className="pub-artikel-excerpt">{r.excerpt}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </article>
  );
}

export function PublicBeritaList() {
  return <Navigate to="/artikel?kategori=berita" replace />;
}

export function PublicBeritaDetail() {
  const { slug } = useParams();
  return <Navigate to={`/artikel/${slug ?? ""}`} replace />;
}
