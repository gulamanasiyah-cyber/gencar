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
import { MOCK_KEGIATAN, type PubKegiatan } from "./data";

const PER_PAGE = 6;

// ── helpers ─────────────────────────────────────────────────────────────
function parseKegiatanMs(k: PubKegiatan): number {
  // tanggal "YYYY-MM-DD", jam "HH:mm" (WIB → treat as local)
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
  // 2026-09-02 → 2 Sep 2026 (tanpa Intl biar deterministik)
  const [y, m, d] = iso.split("-").map(Number);
  const bulan = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
  if (!y || !m || !d) return iso;
  return `${d} ${bulan[m - 1] ?? m} ${y}`;
}

// ── LIST ────────────────────────────────────────────────────────────────
export function PublicKegiatanList() {
  const [searchParams, setSearchParams] = useSearchParams();
  const cats = ["Semua", "Sambung Rutin", "Keakraban", "Pemantapan", "Lainnya"] as const;
  const urlCat = searchParams.get("kategori");
  const urlPage = parseInt(searchParams.get("page") ?? "1", 10);
  const urlQ = searchParams.get("q") ?? "";
  const validCat = (cats as readonly string[]).includes(urlCat ?? "") ? (urlCat as typeof cats[number]) : "Semua";
  const [q, setQ] = useState(urlQ);
  const [cat, setCat] = useState<typeof cats[number]>(validCat);
  const [page, setPage] = useState(Number.isFinite(urlPage) && urlPage >= 1 ? urlPage : 1);
  const qDebounceRef = useRef<number | null>(null);

  // hydrate from URL when searchParams change externally (back/forward, direct link)
  useEffect(() => {
    const uq = searchParams.get("q") ?? "";
    const uc = searchParams.get("kategori");
    const up = parseInt(searchParams.get("page") ?? "1", 10);
    const vc = (cats as readonly string[]).includes(uc ?? "") ? (uc as typeof cats[number]) : "Semua";
    if (uq !== q) setQ(uq);
    if (vc !== cat) setCat(vc);
    const np = Number.isFinite(up) && up >= 1 ? up : 1;
    if (np !== page) setPage(np);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // sync q/cat/page → URL (replace, debounce q)
  const syncUrl = (nextQ: string, nextCat: string, nextPage: number) => {
    const next = new URLSearchParams();
    if (nextQ.trim()) next.set("q", nextQ.trim());
    if (nextCat !== "Semua") next.set("kategori", nextCat);
    if (nextPage > 1) next.set("page", String(nextPage));
    setSearchParams(next, { replace: true });
  };

  const setQAndUrl = (v: string) => {
    setQ(v);
    setPage(1);
    if (qDebounceRef.current) window.clearTimeout(qDebounceRef.current);
    qDebounceRef.current = window.setTimeout(() => syncUrl(v, cat, 1), 180);
  };
  const setCatAndUrl = (v: typeof cats[number]) => {
    setCat(v);
    setPage(1);
    if (qDebounceRef.current) window.clearTimeout(qDebounceRef.current);
    syncUrl(q, v, 1);
  };

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return MOCK_KEGIATAN.filter((k) => {
      if (cat !== "Semua" && k.kategori !== cat) return false;
      if (!s) return true;
      return (k.judul + " " + k.excerpt + " " + k.lokasi).toLowerCase().includes(s);
    });
  }, [q, cat]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const slice = useMemo(() => filtered.slice((safePage - 1) * PER_PAGE, safePage * PER_PAGE), [filtered, safePage]);
  const goPage = (n: number) => {
    const np = Math.max(1, Math.min(totalPages, n));
    setPage(np);
    syncUrl(q, cat, np);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // header besar: kegiatan terdekat (upcoming paling dekat) — independen dari filter biar selalu kelihatan
  const upcoming: PubKegiatan | null = useMemo(() => {
    const now = Date.now();
    const future = MOCK_KEGIATAN.map((k) => ({ k, ms: parseKegiatanMs(k) }))
      .filter((x) => x.ms > now)
      .sort((a, b) => a.ms - b.ms);
    return future[0]?.k ?? null;
  }, []);
  const countdown = useCountdown(upcoming ? parseKegiatanMs(upcoming) : null);
  const isUpcomingVisible = upcoming != null && countdown != null && !countdown.past;

  return (
    <div className="pub-section">
      {/* head */}
      <div className="pub-section-head-row" style={{ marginBottom: 18 }}>
        <div className="pub-section-head" style={{ marginBottom: 0 }}>
          <span className="pub-eyebrow">Agenda Publik</span>
          <h2>Kegiatan</h2>
          <p>Kegiatan publik yang sudah tayang — dikurasi pengurus. Bukan kegiatan internal. {filtered.length} kegiatan.</p>
        </div>
        <span className="pub-trust-pill" style={{ alignSelf: "end" }}>
          {filtered.length} kegiatan
        </span>
      </div>

      {/* header besar — kegiatan terdekat + countdown */}
      {upcoming && (
        <Link to={`/kegiatan/${upcoming.slug}`} className="pub-kegiatan-hero">
          <div className="pub-kegiatan-hero-media">
            <img src={upcoming.cover} alt={upcoming.judul} loading="eager" />
            <span className="pub-tag pub-kegiatan-hero-tag">{upcoming.kategori}</span>
          </div>
          <div className="pub-kegiatan-hero-body">
            <span className="pub-kegiatan-hero-kicker">
              <Timer size={12} /> Kegiatan terdekat
              {isUpcomingVisible ? <span className="pub-kegiatan-hero-live">· countdown live</span> : null}
            </span>
            <h3 className="pub-kegiatan-hero-title">{upcoming.judul}</h3>
            <p className="pub-kegiatan-hero-excerpt">{upcoming.excerpt}</p>
            <div className="pub-kegiatan-hero-meta">
              <span>
                <CalendarDays size={13} /> {formatTanggalIndo(upcoming.tanggal)} {upcoming.jam ? `· ${upcoming.jam} WIB` : ""}
              </span>
              <span>
                <MapPin size={13} /> {upcoming.lokasi}
              </span>
            </div>

            {isUpcomingVisible && countdown && (
              <div className="pub-countdown" aria-label="Hitung mundur ke kegiatan terdekat">
                <div className="pub-countdown-box">
                  <strong>{String(countdown.days).padStart(2, "0")}</strong>
                  <span>hari</span>
                </div>
                <span className="pub-countdown-sep">:</span>
                <div className="pub-countdown-box">
                  <strong>{String(countdown.hours).padStart(2, "0")}</strong>
                  <span>jam</span>
                </div>
                <span className="pub-countdown-sep">:</span>
                <div className="pub-countdown-box">
                  <strong>{String(countdown.mins).padStart(2, "0")}</strong>
                  <span>menit</span>
                </div>
                <span className="pub-countdown-sep">:</span>
                <div className="pub-countdown-box pub-countdown-box--sec">
                  <strong>{String(countdown.secs).padStart(2, "0")}</strong>
                  <span>detik</span>
                </div>
              </div>
            )}
            {!isUpcomingVisible && <span className="pub-countdown-done">Sudah lewat — lihat dokumentasinya di detail.</span>}

            <span className="pub-kegiatan-hero-cta">
              Lihat detail <ArrowRight size={14} />
            </span>
          </div>
        </Link>
      )}

      {/* toolbar — search + kategori + meta — URL-synced */}
      <div className="pub-list-toolbar">
        <label className="pub-search">
          <Search size={14} />
          <input value={q} onChange={(e) => setQAndUrl(e.target.value)} placeholder="Cari judul / lokasi..." aria-label="Cari kegiatan" />
          {q && (
            <button type="button" className="pub-search-clear" onClick={() => setQAndUrl("")} aria-label="Hapus pencarian">
              ×
            </button>
          )}
        </label>
        <span className="pub-toolbar-meta">
          Hal {safePage} dari {totalPages} · {filtered.length} hasil · share URL simpan filter
        </span>
      </div>
      <div className="pub-kegiatan-catbar" role="tablist" aria-label="Filter kategori">
        {cats.map((c) => (
          <button
            key={c}
            role="tab"
            aria-selected={cat === c}
            onClick={() => setCatAndUrl(c as typeof cats[number])}
            className={`pub-kegiatan-cat ${cat === c ? "is-active" : ""}`}
          >
            {c}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="pub-empty">
          <p style={{ fontWeight: 800 }}>Belum ada kegiatan yang cocok.</p>
          <p style={{ fontSize: 13, color: "var(--pub-muted)", marginTop: 6 }}>Coba ganti kata kunci atau kategori.</p>
          <button
            type="button"
            className="btn-ghost-dark"
            style={{ marginTop: 14 }}
            onClick={() => {
              setQ("");
              setCat("Semua");
              setPage(1);
              syncUrl("", "Semua", 1);
            }}
          >
            Reset filter
          </button>
        </div>
      ) : (
        <>
          <div className="pub-kegiatan-grid">
            {slice.map((k) => {
              const ms = parseKegiatanMs(k);
              const isFuture = ms > Date.now();
              return (
                <Link key={k.slug} to={`/kegiatan/${k.slug}`} className="pub-kegiatan-card">
                  <div className="pub-kegiatan-card-media">
                    <img src={k.cover} alt={k.judul} loading="lazy" />
                    {isFuture && <span className="pub-kegiatan-badge">Akan datang</span>}
                  </div>
                  <div className="pub-kegiatan-card-body">
                    <span className="pub-kegiatan-card-kicker">{k.kategori}</span>
                    <strong className="pub-kegiatan-card-title">{k.judul}</strong>
                    <p className="pub-kegiatan-card-excerpt">{k.excerpt}</p>
                    <span className="pub-kegiatan-card-meta">
                      <span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
                        <CalendarDays size={12} /> {formatTanggalIndo(k.tanggal)} {k.jam ? `· ${k.jam}` : ""}
                      </span>
                      <span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
                        <MapPin size={12} /> {k.lokasi}
                      </span>
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
          <Pagination page={safePage} totalPages={totalPages} onPage={goPage} />
        </>
      )}
    </div>
  );
}

// ── DETAIL ──────────────────────────────────────────────────────────────
export function PublicKegiatanDetail() {
  const { slug } = useParams();
  const item = MOCK_KEGIATAN.find((k) => k.slug === slug);
  if (!item) {
    return (
      <div className="pub-section">
        <div className="pub-empty">
          <p style={{ fontWeight: 800 }}>Kegiatan tidak ditemukan.</p>
          <p style={{ fontSize: 13, color: "var(--pub-muted)", marginTop: 6 }}>
            Slug <code>{slug}</code> belum tayang. Mungkin masih draft atau salah alamat.
          </p>
          <Link to="/kegiatan" className="btn-lime" style={{ marginTop: 14, width: "fit-content", marginInline: "auto" }}>
            <ArrowLeft size={14} /> Kembali ke kegiatan
          </Link>
        </div>
      </div>
    );
  }
  const ms = parseKegiatanMs(item);
  const isFuture = ms > Date.now();
  const countdown = useCountdown(isFuture ? ms : null);
  const related = MOCK_KEGIATAN.filter((k) => k.slug !== item.slug).slice(0, 3);

  return (
    <div className="pub-section pub-detail">
      <Link to="/kegiatan" style={{ fontSize: 13, fontWeight: 700, display: "inline-flex", gap: 6, alignItems: "center", width: "fit-content" }}>
        <ArrowLeft size={14} /> Semua kegiatan
      </Link>

      <div className="pub-detail-hero">
        <img src={item.cover} alt={item.judul} />
      </div>

      <div className="pub-detail-meta">
        <span className="pub-tag">{item.kategori}</span>
        <span>
          <CalendarDays size={12} /> {formatTanggalIndo(item.tanggal)} {item.jam ? `· ${item.jam} WIB` : ""}
        </span>
        <span>
          <MapPin size={12} /> {item.lokasi}
        </span>
        {isFuture ? (
          <span className="pill pill-amber" style={{ gap: 6 }}>
            <Timer size={11} /> Akan datang
          </span>
        ) : (
          <span className="pill pill-slate">Selesai</span>
        )}
      </div>

      <h1 className="pub-detail-title">{item.judul}</h1>
      <p className="pub-detail-excerpt">{item.excerpt}</p>

      {isFuture && countdown && !countdown.past && (
        <div className="pub-countdown pub-countdown--detail" aria-label="Hitung mundur kegiatan">
          <span className="pub-countdown-label">
            <Clock3 size={12} /> Mulai dalam
          </span>
          <div className="pub-countdown-row">
            <div className="pub-countdown-box">
              <strong>{String(countdown.days).padStart(2, "0")}</strong>
              <span>hari</span>
            </div>
            <span className="pub-countdown-sep">:</span>
            <div className="pub-countdown-box">
              <strong>{String(countdown.hours).padStart(2, "0")}</strong>
              <span>jam</span>
            </div>
            <span className="pub-countdown-sep">:</span>
            <div className="pub-countdown-box">
              <strong>{String(countdown.mins).padStart(2, "0")}</strong>
              <span>menit</span>
            </div>
            <span className="pub-countdown-sep">:</span>
            <div className="pub-countdown-box pub-countdown-box--sec">
              <strong>{String(countdown.secs).padStart(2, "0")}</strong>
              <span>detik</span>
            </div>
          </div>
        </div>
      )}

      {item.konten ? <div className="pub-prose" dangerouslySetInnerHTML={{ __html: item.konten }} /> : <div className="pub-prose"><p>Konten lengkap akan diisi via CMS (TipTap) — placeholder untuk development.</p></div>}

      <div className="pub-detail-actions">
        <a href={`https://wa.me/?text=${encodeURIComponent(item.judul + " — " + (typeof window !== "undefined" ? window.location.href : ""))}`} target="_blank" rel="noreferrer" className="btn-lime">
          <Share2 size={14} /> Share ke WhatsApp
        </a>
        <button type="button" className="btn-ghost-dark" onClick={() => navigator.clipboard.writeText(window.location.href)}>
          Copy link
        </button>
      </div>

      {related.length > 0 && (
        <div className="pub-related">
          <h3>Kegiatan lain</h3>
          <div className="pub-related-grid">
            {related.map((k) => (
              <Link key={k.slug} to={`/kegiatan/${k.slug}`} className="pub-related-card">
                <img src={k.cover} alt={k.judul} loading="lazy" />
                <div>
                  <strong>{k.judul}</strong>
                  <span>
                    {formatTanggalIndo(k.tanggal)} · {k.lokasi}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
