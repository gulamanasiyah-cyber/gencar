import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import {
  CalendarDays,
  MapPin,
  Search,
  ArrowLeft,
  Clock3,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  Share2,
  Timer,
} from "lucide-react";
import { apiFetch, unwrapList } from "../../lib/api";
import { labelKategori } from "../../lib/labelKategori";
import { Skeleton, SkeletonKegiatanCard, SkeletonDetailPage } from "../../components/Skeleton";
import type { PubKegiatan } from "./data";

const PER_PAGE = 6;

function parseKegiatanMs(k: PubKegiatan): number {
  const t = `${k.tanggal}T${(k.jam ?? "00:00").padStart(5, "0")}:00`;
  const ms = Date.parse(t);
  return Number.isNaN(ms) ? Date.parse(k.tanggal) : ms;
}

function useCountdown(targetMs: number | null) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (targetMs == null) return;
    if (targetMs <= Date.now()) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [targetMs]);
  if (targetMs == null) return null;
  const diff = targetMs - now;
  if (diff <= 0) return { past: true as const, days: 0, hours: 0, mins: 0, secs: 0 };
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);
  const secs = Math.floor((diff % 60000) / 1000);
  return { past: false as const, days, hours, mins, secs };
}

function getPages(current: number, total: number): (number | "…")[] {
  if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1);
  const out: (number | "…")[] = [1];
  if (current > 3) out.push("…");
  for (let p = Math.max(2, current - 1); p <= Math.min(total - 1, current + 1); p++) out.push(p);
  if (current < total - 2) out.push("…");
  out.push(total);
  return out.filter((v, i, a) => !(v === "…" && a[i - 1] === "…"));
}

function Pagination({ page, totalPages, onPage }: { page: number; totalPages: number; onPage: (n: number) => void }) {
  if (totalPages <= 1) return null;
  const pages = getPages(page, totalPages);
  return (
    <nav className="pub-pagination" aria-label="Pagination">
      <button type="button" className="pub-pagination-btn" disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label="Halaman sebelumnya">
        <ChevronLeft size={16} /> Prev
      </button>
      <div className="pub-pagination-pages" role="list">
        {pages.map((p, i) =>
          p === "…" ? (
            <span key={`e-${i}`} className="pub-pagination-ellipsis">…</span>
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
      <button type="button" className="pub-pagination-btn" disabled={page >= totalPages} onClick={() => onPage(page + 1)} aria-label="Halaman berikutnya">
        Next <ChevronRight size={16} />
      </button>
    </nav>
  );
}

function formatTanggalIndo(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const bulan = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
  if (!y || !m || !d) return iso;
  return `${d} ${bulan[m - 1] ?? m} ${y}`;
}

type CategoryItem = { label: string; value: string; count: number };

export function PublicKegiatanList() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [serverCats, setServerCats] = useState<CategoryItem[]>([]);
  const [showMoreModal, setShowMoreModal] = useState(false);

  const urlCat = searchParams.get("kategori") ?? "Semua";
  const urlPage = parseInt(searchParams.get("page") ?? "1", 10);
  const urlQ = searchParams.get("q") ?? "";

  const [q, setQ] = useState(urlQ);
  const [cat, setCat] = useState<string>(urlCat);
  const [page, setPage] = useState(Number.isFinite(urlPage) && urlPage >= 1 ? urlPage : 1);
  const qDebounceRef = useRef<number | null>(null);

  const [items, setItems] = useState<PubKegiatan[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Fetch categories from backend
  useEffect(() => {
    apiFetch<CategoryItem[]>("/api/public/kegiatan-publik/kategori")
      .then((data) => {
        if (Array.isArray(data)) setServerCats(data);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const uq = searchParams.get("q") ?? "";
    const uc = searchParams.get("kategori") ?? "Semua";
    const up = parseInt(searchParams.get("page") ?? "1", 10);
    if (uq !== q) setQ(uq);
    if (uc !== cat) setCat(uc);
    const np = Number.isFinite(up) && up >= 1 ? up : 1;
    if (np !== page) setPage(np);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  useEffect(() => {
    let cancel = false;
    setLoading(true);

    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (cat !== "Semua") {
      const match = serverCats.find((c) => c.label === cat || c.value === cat);
      params.set("kategoriAcara", match ? match.value : cat);
    }
    params.set("page", String(page));
    params.set("limit", String(PER_PAGE));

    apiFetch<unknown>(`/api/public/kegiatan-publik?${params.toString()}`)
      .then((raw) => {
        if (cancel) return;
        const unwrapped = unwrapList<{
          slug: string;
          judul: string;
          excerpt?: string;
          coverImage?: string;
          cover_image?: string;
          kategori?: string;
          tanggal: string;
          lokasi?: string;
          jam?: string;
          konten?: string;
        }>(raw);

        const list: PubKegiatan[] = unwrapped.data.map((r) => ({
          slug: r.slug,
          judul: r.judul,
          excerpt: r.excerpt ?? "",
          cover: r.coverImage ?? r.cover_image ?? "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=900&h=700&q=80",
          kategori: r.kategori ?? "Kegiatan",
          tanggal: r.tanggal,
          lokasi: r.lokasi ?? "Cengkareng",
          jam: r.jam,
          konten: r.konten,
        }));

        setItems(list);
        setTotalCount(unwrapped.total ?? list.length);
        setLoading(false);
      })
      .catch(() => {
        if (!cancel) {
          setItems([]);
          setTotalCount(0);
          setLoading(false);
        }
      });

    return () => { cancel = true; };
  }, [q, cat, page, serverCats]);

  const updateUrl = (newQ: string, newCat: string, newPage: number) => {
    const nextParams = new URLSearchParams();
    if (newQ.trim()) nextParams.set("q", newQ.trim());
    if (newCat !== "Semua") nextParams.set("kategori", newCat);
    if (newPage > 1) nextParams.set("page", String(newPage));
    setSearchParams(nextParams, { replace: true });
  };

  const onSearchChange = (val: string) => {
    setQ(val);
    if (qDebounceRef.current) window.clearTimeout(qDebounceRef.current);
    qDebounceRef.current = window.setTimeout(() => {
      setPage(1);
      updateUrl(val, cat, 1);
    }, 250);
  };

  const onCatChange = (c: string) => {
    setCat(c);
    setPage(1);
    updateUrl(q, c, 1);
  };

  const onPageChange = (np: number) => {
    setPage(np);
    updateUrl(q, cat, np);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const visibleCats = useMemo(() => {
    return serverCats.slice(0, 3);
  }, [serverCats]);

  const overflowCats = useMemo(() => {
    return serverCats.slice(5);
  }, [serverCats]);

  const isOverflowSelected = useMemo(() => {
    return overflowCats.some((c) => c.label === cat || c.value === cat);
  }, [overflowCats, cat]);

  const overflowSelectedLabel = useMemo(() => {
    const hit = overflowCats.find((c) => c.label === cat || c.value === cat);
    return hit ? hit.label : null;
  }, [overflowCats, cat]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PER_PAGE));
  const upcomingHero = useMemo(() => {
    return items.map((k) => ({ k, ms: parseKegiatanMs(k) }))
      .filter((x) => x.ms > Date.now())
      .sort((a, b) => a.ms - b.ms)[0]?.k ?? items[0] ?? null;
  }, [items]);

  const countdown = useCountdown(upcomingHero ? parseKegiatanMs(upcomingHero) : null);
  const isFuture = countdown != null && !countdown.past;

  return (
    <div className="pub-section" style={{ paddingTop: 32 }}>
      {/* ── Hero: upcoming highlight ── */}
      {loading ? (
        <div className="pub-kegiatan-hero" aria-busy="true" aria-label="Memuat kegiatan…">
          <div className="pub-kegiatan-hero-body">
            <div className="pub-kegiatan-hero-main" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "flex", gap: 8 }}>
                <Skeleton width={80} height={22} radius={999} />
                <Skeleton width={50} height={22} radius={999} />
              </div>
              <Skeleton width="85%" height={28} radius={6} />
              <Skeleton width="100%" height={16} radius={4} />
              <Skeleton width="60%" height={14} radius={4} />
              <Skeleton width={140} height={36} radius={999} style={{ marginTop: 4 }} />
            </div>
          </div>
          <div className="pub-kegiatan-hero-media" style={{ position: "relative", overflow: "hidden" }}>
            <Skeleton width="100%" height="100%" radius={0} style={{ position: "absolute", inset: 0 }} />
          </div>
        </div>
      ) : upcomingHero ? (
        <div className="pub-kegiatan-hero">
          <div className="pub-kegiatan-hero-body">
            <div className="pub-kegiatan-hero-main">
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <span className="pub-tag">{labelKategori(upcomingHero.kategori)}</span>
                {isFuture && <span className="pub-tag" style={{ background: "#22c55e", color: "#fff" }}>Segera</span>}
              </div>
              <h1 className="pub-kegiatan-hero-title">{upcomingHero.judul}</h1>
              <p className="pub-kegiatan-hero-excerpt">{upcomingHero.excerpt}</p>
              <div className="pub-kegiatan-hero-meta">
                <span><CalendarDays size={13} /> {formatTanggalIndo(upcomingHero.tanggal)}{upcomingHero.jam ? ` · ${upcomingHero.jam}` : ""}</span>
                <span><MapPin size={13} /> {upcomingHero.lokasi}</span>
              </div>
            </div>

            <div className="pub-kegiatan-hero-footer" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {isFuture && countdown && (
                <div className="pub-countdown" aria-label={`Hitung mundur: ${countdown.days} hari ${countdown.hours} jam ${countdown.mins} menit ${countdown.secs} detik`}>
                  <div className="pub-countdown-item"><strong>{countdown.days}</strong><span>Hari</span></div>
                  <span className="pub-countdown-sep">:</span>
                  <div className="pub-countdown-item"><strong>{String(countdown.hours).padStart(2, "0")}</strong><span>Jam</span></div>
                  <span className="pub-countdown-sep">:</span>
                  <div className="pub-countdown-item"><strong>{String(countdown.mins).padStart(2, "0")}</strong><span>Menit</span></div>
                  <span className="pub-countdown-sep">:</span>
                  <div className="pub-countdown-item"><strong>{String(countdown.secs).padStart(2, "0")}</strong><span>Detik</span></div>
                </div>
              )}

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <Link to={`/kegiatan/${upcomingHero.slug}`} className="btn-lime">
                  Detail Kegiatan <ArrowRight size={14} />
                </Link>
              </div>
            </div>
          </div>
          <div className="pub-kegiatan-hero-media">
            <img src={upcomingHero.cover} alt={upcomingHero.judul} loading="eager" />
          </div>
        </div>
      ) : null}

      {/* ── Toolbar: search & category filter ── */}
      <div className="pub-kegiatan-toolbar">
        <label className="pub-kegiatan-search">
          <Search size={15} />
          <input
            type="search"
            placeholder="Cari kegiatan, topik, atau lokasi…"
            value={q}
            onChange={(e) => onSearchChange(e.target.value)}
            aria-label="Cari kegiatan"
          />
        </label>

        <div className="pub-kegiatan-cats" role="tablist" aria-label="Kategori kegiatan">
          {/* Semua selalu ada */}
          <button
            type="button"
            role="tab"
            aria-selected={cat === "Semua"}
            className={`chip ${cat === "Semua" ? "active" : ""}`}
            onClick={() => onCatChange("Semua")}
          >
            Semua
          </button>

          {/* Top 5 kategori dari backend */}
          {visibleCats.map((c) => (
            <button
              key={c.value}
              type="button"
              role="tab"
              aria-selected={cat === c.label || cat === c.value}
              className={`chip ${cat === c.label || cat === c.value ? "active" : ""}`}
              onClick={() => onCatChange(c.label)}
            >
              {c.label}
            </button>
          ))}

          {/* "+ N Lainnya" bila ada overflow */}
          {overflowCats.length > 0 && (
            <button
              type="button"
              role="tab"
              aria-selected={isOverflowSelected}
              className={`chip ${isOverflowSelected ? "active" : ""}`}
              onClick={() => setShowMoreModal(true)}
            >
              {isOverflowSelected ? overflowSelectedLabel : `+${overflowCats.length} Lainnya`}
            </button>
          )}
        </div>
      </div>

      {/* MODAL KATEGORI LAINNYA */}
      {showMoreModal && (
        <div className="modal-backdrop" onClick={() => setShowMoreModal(false)} style={{ zIndex: 1200, display: "grid", placeItems: "center", padding: 16 }}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 420, width: "100%", padding: 22, borderRadius: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <h3 style={{ fontSize: 16, fontWeight: 800, margin: 0 }}>Kategori Lainnya</h3>
              <button type="button" className="btn btn-ghost" style={{ padding: 6 }} onClick={() => setShowMoreModal(false)}>✕</button>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {overflowCats.map((c) => {
                const active = cat === c.label || cat === c.value;
                return (
                  <button
                    key={c.value}
                    type="button"
                    className={`chip ${active ? "active" : ""}`}
                    style={{ fontSize: 13, padding: "8px 14px" }}
                    onClick={() => {
                      onCatChange(c.label);
                      setShowMoreModal(false);
                    }}
                  >
                    {c.label}
                    <span className="muted" style={{ marginLeft: 4, fontSize: 11 }}>({c.count})</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <div className="pub-kegiatan-meta-count">
        <span>Menampilkan <strong>{items.length}</strong> dari <strong>{totalCount}</strong> kegiatan</span>
        {(q || cat !== "Semua") && (
          <button
            type="button"
            className="pub-kegiatan-reset"
            onClick={() => {
              setQ("");
              setCat("Semua");
              setPage(1);
              updateUrl("", "Semua", 1);
            }}
          >
            Reset filter
          </button>
        )}
      </div>

      {/* ── Grid Cards ── */}
      {loading ? (
        <div className="pub-kegiatan-grid" style={{ marginTop: 24 }} aria-busy="true" aria-label="Memuat daftar kegiatan…">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <SkeletonKegiatanCard key={i} />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="pub-empty">
          <h3>Tidak ada kegiatan yang cocok</h3>
          <p>Coba gunakan kata kunci lain atau pilih kategori Semua.</p>
          <button
            type="button"
            className="btn-ghost-dark"
            onClick={() => {
              setQ("");
              setCat("Semua");
              setPage(1);
              updateUrl("", "Semua", 1);
            }}
          >
            Tampilkan Semua Kegiatan
          </button>
        </div>
      ) : (
        <div className="pub-kegiatan-grid">
          {items.map((k) => (
            <article key={k.slug} className="pub-kegiatan-card">
              <Link to={`/kegiatan/${k.slug}`} className="pub-kegiatan-card-media" tabIndex={-1} aria-hidden="true">
                <img src={k.cover} alt="" loading="lazy" />
                <span className="pub-kegiatan-badge">{labelKategori(k.kategori)}</span>
              </Link>
              <div className="pub-kegiatan-card-body">
                <span className="pub-kegiatan-card-kicker">{formatTanggalIndo(k.tanggal)}</span>
                <h2 className="pub-kegiatan-card-title">
                  <Link to={`/kegiatan/${k.slug}`}>{k.judul}</Link>
                </h2>
                <p className="pub-kegiatan-card-excerpt">{k.excerpt}</p>
                <div className="pub-kegiatan-card-meta">
                  <span><MapPin size={13} /> {k.lokasi}</span>
                  {k.jam && <span><Clock3 size={13} /> {k.jam}</span>}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* ── Pagination ── */}
      <Pagination page={page} totalPages={totalPages} onPage={onPageChange} />
    </div>
  );
}

export function PublicKegiatanDetail() {
  const { slug } = useParams<{ slug: string }>();
  const [item, setItem] = useState<PubKegiatan | null>(null);
  const [related, setRelated] = useState<PubKegiatan[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!slug) return;
    let cancel = false;
    setLoading(true);

    apiFetch<any>(`/api/public/kegiatan-publik/${encodeURIComponent(slug)}`)
      .then((raw) => {
        if (cancel || !raw) return;
        const k: PubKegiatan = {
          slug: raw.slug,
          judul: raw.judul,
          excerpt: raw.excerpt ?? "",
          cover: raw.coverImage ?? raw.cover_image ?? "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=900&h=700&q=80",
          kategori: raw.kategori ?? "Kegiatan",
          tanggal: raw.tanggal,
          lokasi: raw.lokasi ?? "Cengkareng",
          jam: raw.jam,
          konten: raw.konten,
        };
        setItem(k);
        setLoading(false);

        // Fetch related
        apiFetch<unknown>("/api/public/kegiatan-publik?limit=4")
          .then((relRaw) => {
            if (cancel) return;
            const unwrapped = unwrapList<{ slug: string; judul: string; excerpt?: string; coverImage?: string; cover_image?: string; kategori?: string; tanggal: string; lokasi?: string }>(relRaw);
            const relList = unwrapped.data
              .filter((x) => x.slug !== k.slug)
              .slice(0, 3)
              .map((x) => ({
                slug: x.slug,
                judul: x.judul,
                excerpt: x.excerpt ?? "",
                cover: x.coverImage ?? x.cover_image ?? "",
                kategori: x.kategori ?? "Kegiatan",
                tanggal: x.tanggal,
                lokasi: x.lokasi ?? "Cengkareng",
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

  const countdown = useCountdown(item ? parseKegiatanMs(item) : null);
  const isFuture = countdown != null && !countdown.past;

  const onShare = async () => {
    const url = window.location.href;
    if (navigator.share && item) {
      try {
        await navigator.share({ title: item.judul, text: item.excerpt, url });
        return;
      } catch {}
    }
    try {
      await navigator.clipboard.writeText(url);
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
          <h2>Kegiatan tidak ditemukan</h2>
          <p>Mungkin tautan sudah usang atau acara telah dihapus.</p>
          <Link to="/kegiatan" className="btn-lime">
            <ArrowLeft size={14} /> Kembali ke Daftar Kegiatan
          </Link>
        </div>
      </div>
    );
  }

  return (
    <article className="pub-section" style={{ paddingTop: 24 }}>
      <div className="pub-detail-back">
        <Link to="/kegiatan" className="pub-link" style={{ borderBottom: "none" }}>
          <ArrowLeft size={14} /> Semua Kegiatan
        </Link>
      </div>

      <header className="pub-detail-head">
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 12 }}>
                  <span className="pub-tag">{labelKategori(item.kategori)}</span>
          {isFuture && <span className="pub-tag" style={{ background: "#22c55e", color: "#fff" }}>Segera</span>}
        </div>

        <h1 className="pub-detail-title">{item.judul}</h1>
        <p className="pub-detail-lead">{item.excerpt}</p>

        <div className="pub-detail-meta-bar">
          <div className="pub-detail-meta-item"><CalendarDays size={15} /><strong>{formatTanggalIndo(item.tanggal)}</strong></div>
          {item.jam && <div className="pub-detail-meta-item"><Clock3 size={15} /><strong>{item.jam} WIB</strong></div>}
          <div className="pub-detail-meta-item"><MapPin size={15} /><strong>{item.lokasi}</strong></div>
          <button type="button" className="pub-detail-share" onClick={onShare} aria-label="Bagikan kegiatan">
            <Share2 size={14} /> {copied ? "Tautan Tersalin!" : "Bagikan"}
          </button>
        </div>
      </header>

      {/* Hero Media */}
      <div className="pub-detail-media">
        <img src={item.cover} alt={item.judul} loading="eager" />
      </div>

      {/* Countdown Card (if upcoming) */}
      {isFuture && countdown && (
        <div className="pub-detail-countdown-card">
          <div>
            <span className="pub-detail-cd-kicker"><Timer size={14} /> Hitung Mundur Acara</span>
            <div style={{ fontWeight: 800, fontSize: 15, marginTop: 2 }}>Waktu tersisa menuju kegiatan</div>
          </div>
          <div className="pub-countdown" aria-label={`Hitung mundur: ${countdown.days} hari ${countdown.hours} jam`}>
            <div className="pub-countdown-item"><strong>{countdown.days}</strong><span>Hari</span></div>
            <span className="pub-countdown-sep">:</span>
            <div className="pub-countdown-item"><strong>{String(countdown.hours).padStart(2, "0")}</strong><span>Jam</span></div>
            <span className="pub-countdown-sep">:</span>
            <div className="pub-countdown-item"><strong>{String(countdown.mins).padStart(2, "0")}</strong><span>Menit</span></div>
            <span className="pub-countdown-sep">:</span>
            <div className="pub-countdown-item"><strong>{String(countdown.secs).padStart(2, "0")}</strong><span>Detik</span></div>
          </div>
        </div>
      )}

      {/* Content body */}
      <div className="pub-detail-content">
        <div className="pub-prose">
          {item.konten ? (
            <div dangerouslySetInnerHTML={{ __html: item.konten }} />
          ) : (
            <>
              <p>
                Kegiatan <strong>{item.judul}</strong> diselenggarakan dalam rangka mempererat ukhuwah dan pembinaan generus muda-mudi di lingkungan Daerah Cengkareng.
              </p>
              <p>
                Seluruh peserta diharapkan hadir tepat waktu di <em>{item.lokasi}</em> dengan berpakaian rapi dan sopan. Untuk konfirmasi kehadiran dan koordinasi transportasi kelompok, silakan hubungi penanggung jawab masing-masing.
              </p>
            </>
          )}
        </div>
      </div>

      {/* Related activities */}
      {related.length > 0 && (
        <section className="pub-detail-related">
          <h2>Kegiatan Terkait Lainnya</h2>
          <div className="pub-kegiatan-grid">
            {related.map((r) => (
              <article key={r.slug} className="pub-kegiatan-card">
                <Link to={`/kegiatan/${r.slug}`} className="pub-kegiatan-card-media" tabIndex={-1} aria-hidden="true">
                  <img src={r.cover} alt="" loading="lazy" />
                  <span className="pub-kegiatan-badge">{labelKategori(r.kategori)}</span>
                </Link>
                <div className="pub-kegiatan-card-body">
                  <span className="pub-kegiatan-card-kicker">{formatTanggalIndo(r.tanggal)}</span>
                  <h3 className="pub-kegiatan-card-title">
                    <Link to={`/kegiatan/${r.slug}`}>{r.judul}</Link>
                  </h3>
                  <p className="pub-kegiatan-card-excerpt">{r.excerpt}</p>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
    </article>
  );
}
