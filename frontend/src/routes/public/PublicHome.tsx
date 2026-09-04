import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion, useAnimation, useInView, useReducedMotion, type Variants } from "motion/react";
import { ArrowRight, CalendarDays, MapPin, ChevronLeft, ChevronRight } from "lucide-react";
import { MOSQUE_PATH, MOSQUE_VIEWBOX } from "./mosquePath";
import { DATE_TREE_VIEWBOX, DATE_TREE_PATHS } from "./decorPath";
import { apiFetch, unwrapList } from "../../lib/api";
import { labelKategori } from "../../lib/labelKategori";
import { SkeletonHeroBento, SkeletonEditorial, SkeletonReelsTrack, SkeletonMarquee } from "../../components/Skeleton";
import type { PubKegiatan, PubArticle, PubPengurus } from "./data";

const ABOUT_IMG = "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=900&h=700&q=80";

const SPRING_TRANSITION = { type: "spring", stiffness: 260, damping: 24 } as const;

const STAGGER_CONTAINER: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.05,
    },
  },
};

const FADE_UP_ITEM: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] },
  },
};

function Reveal({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const reduce = useReducedMotion();
  if (reduce) return <>{children}</>;
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.6, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}

function parseMs(k: { tanggal: string; jam?: string }) {
  const t = `${k.tanggal}T${(k.jam ?? "00:00").padStart(5, "0")}:00`;
  const ms = Date.parse(t);
  return Number.isNaN(ms) ? Date.parse(k.tanggal) : ms;
}

function useCountdown(targetMs: number | null) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (targetMs == null || targetMs <= Date.now()) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [targetMs]);
  if (targetMs == null) return null;
  const diff = targetMs - now;
  if (diff <= 0) return { past: true as const, days: 0, hours: 0, mins: 0, secs: 0 };
  return { past: false as const, days: Math.floor(diff / 86400000), hours: Math.floor((diff % 86400000) / 3600000), mins: Math.floor((diff % 3600000) / 60000), secs: Math.floor((diff % 60000) / 1000) };
}

function TrainMarquee({ items }: { items: PubPengurus[] }) {
  const controls = useAnimation();
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.15 });
  const reduce = useReducedMotion();

  useEffect(() => {
    if (reduce || !items.length) return;
    let isCancelled = false;

    if (isInView) {
      const sequence = async () => {
        await controls.start({
          x: ["60vw", "0%"],
          opacity: [0, 1],
          transition: { duration: 1.8, ease: [0.16, 1, 0.3, 1] },
        });

        if (isCancelled) return;

        controls.start({
          x: ["0%", "-50%"],
          transition: { duration: 32, ease: "linear", repeat: Infinity },
        });
      };
      sequence();
    }

    return () => {
      isCancelled = true;
    };
  }, [isInView, controls, reduce, items]);

  if (!items.length) return null;

  return (
    <div
      className="pub-marquee"
      ref={ref}
      onMouseEnter={() => controls.stop()}
      onMouseLeave={() => {
        if (!reduce && isInView && items.length > 0) {
          controls.start({
            x: ["0%", "-50%"],
            transition: { duration: 32, ease: "linear", repeat: Infinity },
          });
        }
      }}
    >
      <motion.div className="pub-marquee-motion-track" animate={controls}>
        {[...items, ...items].map((p, i) => (
          <div key={`${p.nama}-${i}`} className="pub-person" aria-hidden={i >= items.length ? true : undefined}>
            {p.foto ? <img src={p.foto} alt={p.nama} loading="lazy" /> : <div style={{ width: "100%", height: 200, display: "grid", placeItems: "center", background: "var(--pub-paper-2)", fontWeight: 800 }}>{p.nama.slice(0, 2).toUpperCase()}</div>}
            <div className="pub-person-body">
              <strong>{p.nama}</strong>
              <span>{p.role}</span>
            </div>
          </div>
        ))}
      </motion.div>
    </div>
  );
}

export default function PublicHome() {
  const reduce = useReducedMotion();
  const reelsTrackRef = useRef<HTMLDivElement>(null);

  const [kegiatanList, setKegiatanList] = useState<PubKegiatan[]>([]);
  const [artikelList, setArtikelList] = useState<PubArticle[]>([]);
  const [pengurusList, setPengurusList] = useState<PubPengurus[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancel = false;
    Promise.all([
      apiFetch<unknown>("/api/public/kegiatan-publik?limit=12").catch(() => ({ data: [] })),
      apiFetch<unknown>("/api/artikel?status=published").catch(() => []),
      apiFetch<unknown>("/api/public/pengurus").catch(() => []),
    ]).then(([kegRaw, artRaw, pengRaw]) => {
      if (cancel) return;
      const unwrappedKeg = unwrapList<{ slug: string; judul: string; excerpt?: string; coverImage?: string; cover_image?: string; kategori?: string; tanggal: string; lokasi?: string; jam?: string; konten?: string }>(kegRaw);
      const kList: PubKegiatan[] = unwrappedKeg.data.map((r) => ({
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
      setKegiatanList(kList);

      const unwrappedArt = unwrapList<{ slug?: string; id?: string; judul: string; ringkasan?: string; coverImage?: string; cover_image?: string; publishedAt?: string; createdAt?: string; authorName?: string; kategori?: string }>(artRaw);
      const aList: PubArticle[] = unwrappedArt.data.map((r) => ({
        slug: r.slug ?? r.id ?? "",
        judul: r.judul,
        excerpt: r.ringkasan ?? "",
        cover: r.coverImage ?? r.cover_image ?? "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=700&h=480&q=80",
        tanggal: (r.publishedAt ?? r.createdAt ?? "").slice(0, 10),
        author: r.authorName ?? "Pengurus",
        kategori: "tuntunan_ibadah",
      }));
      setArtikelList(aList);

      const pList: PubPengurus[] = Array.isArray(pengRaw) ? pengRaw.map((p: any) => ({
        id: p.id,
        nama: p.nama,
        role: p.dapukan ?? p.role ?? "Pengurus",
        foto: p.foto ?? "",
        level: p.level ?? "bidang",
        bio: p.bio,
        kontakWa: p.kontakWa,
        urutan: p.urutan,
      })) : [];
      setPengurusList(pList);
      setLoading(false);
    });

    return () => { cancel = true; };
  }, []);

  const scrollReels = (direction: "left" | "right") => {
    if (!reelsTrackRef.current) return;
    const amount = direction === "left" ? -320 : 320;
    reelsTrackRef.current.scrollBy({ left: amount, behavior: "smooth" });
  };

  const featured = kegiatanList[0] ?? null;
  const side = kegiatanList.length >= 3 ? kegiatanList.slice(1, 3) : kegiatanList.slice(1);
  const row2 = kegiatanList.length >= 5 ? kegiatanList.slice(3, 5) : kegiatanList.slice(3);
  const leadArticle = artikelList[0] ?? null;
  const upcoming = kegiatanList.map((k) => ({ k, ms: parseMs(k) })).filter((x) => x.ms > Date.now()).sort((a, b) => a.ms - b.ms)[0]?.k ?? featured;
  const countdown = useCountdown(upcoming ? parseMs(upcoming) : null);
  const live = countdown != null && !countdown.past;

  const heroThumbs = kegiatanList.slice(0, 4);
  const [deck, setDeck] = useState([0, 1, 2, 3]);
  const activeHeroIdx = heroThumbs[deck[0]] ? deck[0] : 0;

  const swapNext = () => {
    setDeck((prev) => [...prev.slice(1), prev[0]]);
  };

  const changeImage = (targetIndex: number) => {
    setDeck((prev) => {
      const pos = prev.indexOf(targetIndex);
      if (pos <= 0) return prev;
      return [...prev.slice(pos), ...prev.slice(0, pos)];
    });
  };

  useEffect(() => {
    if (heroThumbs.length <= 1) return;
    const timer = setInterval(() => {
      swapNext();
    }, 5000);
    return () => clearInterval(timer);
  }, [heroThumbs.length]);

  return (
    <div>
      {/* HERO — duotone band */}
      <section className="pub-hero pub-hero--band">
        <div className="pub-hero-band-bg" aria-hidden="true" />

        <div className="pub-hero-tree pub-hero-tree--left" aria-hidden="true">
          <svg viewBox={DATE_TREE_VIEWBOX} preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg" role="presentation">
            {DATE_TREE_PATHS.map((d, idx) => (
              <path key={idx} d={d} fill="currentColor" />
            ))}
          </svg>
        </div>

        <div className="pub-hero-tree pub-hero-tree--left-2" aria-hidden="true">
          <svg viewBox={DATE_TREE_VIEWBOX} preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg" role="presentation">
            {DATE_TREE_PATHS.map((d, idx) => (
              <path key={idx} d={d} fill="currentColor" />
            ))}
          </svg>
        </div>

        <div className="pub-hero-tree pub-hero-tree--right-2" aria-hidden="true">
          <svg viewBox={DATE_TREE_VIEWBOX} preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg" role="presentation">
            {DATE_TREE_PATHS.map((d, idx) => (
              <path key={idx} d={d} fill="currentColor" />
            ))}
          </svg>
        </div>

        <div className="pub-hero-tree pub-hero-tree--right" aria-hidden="true">
          <svg viewBox={DATE_TREE_VIEWBOX} preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg" role="presentation">
            {DATE_TREE_PATHS.map((d, idx) => (
              <path key={idx} d={d} fill="currentColor" />
            ))}
          </svg>
        </div>

        <div className="pub-hero-inner">
          {/* MEDIA SISI KIRI: Polaroid Stack Deck */}
          <div className="pub-hero-media">
            <div className="pub-hero-sun" aria-hidden="true" />

            <div className="pub-hero-polaroid-wrap">
              <span className="pub-hero-img-tag">
                <span className="pub-hero-tag-dot" />
                Dokumentasi Kegiatan
              </span>

              {heroThumbs.length > 0 ? (
                deck.map((itemIdx, stackOrder) => {
                  const item = heroThumbs[itemIdx];
                  if (!item) return null;
                  const isTop = stackOrder === 0;
                  const rotations = [-2.5, 3.2, -1.8, 2.1];
                  const xOffsets = [-4, 6, -3, 5];
                  const yOffsets = [stackOrder * 3, stackOrder * 5, stackOrder * 7, stackOrder * 9];
                  const rot = isTop ? 0 : rotations[itemIdx % rotations.length];
                  const xOff = isTop ? 0 : xOffsets[itemIdx % xOffsets.length];
                  const yOff = yOffsets[stackOrder] || 0;

                  return (
                    <motion.div
                      key={`polaroid-${itemIdx}`}
                      className="pub-hero-polaroid-card"
                      style={{
                        zIndex: 10 - stackOrder,
                        cursor: isTop ? "pointer" : "default",
                      }}
                      animate={{
                        rotate: rot,
                        x: xOff,
                        y: yOff,
                        scale: 1 - stackOrder * 0.03,
                        opacity: stackOrder > 2 ? 0 : 1,
                      }}
                      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                      onClick={isTop ? swapNext : undefined}
                      whileHover={isTop && !reduce ? { scale: 1.02, y: yOff - 4 } : undefined}
                      whileTap={isTop && !reduce ? { scale: 0.98 } : undefined}
                    >
                      <div className="pub-hero-polaroid-img-box">
                        <img
                          src={item.cover}
                          alt={item.judul}
                          loading={isTop ? "eager" : "lazy"}
                        />
                      </div>
                      <div className="pub-hero-polaroid-footer">
                        <span className="pub-hero-polaroid-title">{item.judul}</span>
                        <span className="pub-hero-polaroid-date">{item.tanggal}</span>
                      </div>
                    </motion.div>
                  );
                })
              ) : (
                <div className="pub-hero-polaroid-card" style={{ display: "grid", placeItems: "center" }}>
                  <span className="muted">Memuat agenda kegiatan…</span>
                </div>
              )}
            </div>

            {heroThumbs.length > 1 && (
              <div className="pub-hero-thumbs" role="tablist" aria-label="Pilih foto dokumentasi">
                {heroThumbs.map((k, idx) => {
                  const isActive = activeHeroIdx === idx;
                  return (
                    <button
                      key={k.slug + idx}
                      type="button"
                      role="tab"
                      aria-selected={isActive}
                      aria-label={`Lihat foto: ${k.judul}`}
                      className={`pub-hero-thumb ${isActive ? "is-active" : ""}`}
                      style={{ backgroundImage: `url(${k.cover})` }}
                      onClick={() => changeImage(idx)}
                    >
                      {isActive && <span className="pub-hero-thumb-progress" key={`prog-${deck[0]}`} />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* COPY SISI KANAN */}
          <div className="pub-hero-copy">
            <div className="pub-hero-mosque" aria-hidden="true">
              <svg viewBox={MOSQUE_VIEWBOX} fill="currentColor" preserveAspectRatio="xMidYMax meet" xmlns="http://www.w3.org/2000/svg" role="presentation">
                <path d={MOSQUE_PATH} />
              </svg>
            </div>

            <div className="pub-hero-pill">
              Muda-Mudi LDII Daerah Cengkareng
            </div>

            <h1>
              Muda,<br />
              Bertakwa,<br />
              <em>Berkarya</em>.
            </h1>

            <div className="pub-hero-card">
              <p className="pub-hero-sub">
                Etalase kegiatan kepemudaan, risalah ibadah, dan ruang dokumentasi resmi warga muda LDII se-Daerah Cengkareng. Terbuka, tertib, dan berkelanjutan.
              </p>

              {upcoming && (
                <div className="pub-hero-countdown-row">
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                    <span className="pub-hero-countdown-label">
                      <CalendarDays size={13} />
                      Agenda terdekat
                    </span>
                    {live ? (
                      <span className="pub-hero-live-badge">Segera Berlangsung</span>
                    ) : (
                      <span className="pub-hero-countdown-meta">Selesai</span>
                    )}
                  </div>

                  <div style={{ fontWeight: 800, fontSize: 15, color: "var(--pub-ink)", lineHeight: 1.3 }}>
                    {upcoming.judul}
                  </div>

                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", paddingTop: 2 }}>
                    <div className="pub-hero-countdown-meta">
                      <span><CalendarDays size={12} /> {upcoming.tanggal}{upcoming.jam ? ` · ${upcoming.jam}` : ""}</span>
                      <span><MapPin size={12} /> {upcoming.lokasi}</span>
                    </div>

                    {live && countdown && (
                      <div className="pub-hero-countdown-boxes" aria-label={`Hitung mundur: ${countdown.days} hari ${countdown.hours} jam ${countdown.mins} menit`}>
                        {countdown.days > 0 && <span className="pub-hero-cd-box pub-hero-cd-box--accent">{countdown.days}h</span>}
                        <span className="pub-hero-cd-box">{String(countdown.hours).padStart(2, "0")}j</span>
                        <span className="pub-hero-cd-box">{String(countdown.mins).padStart(2, "0")}m</span>
                        <span className="pub-hero-cd-box">{String(countdown.secs).padStart(2, "0")}d</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="pub-hero-actions">
                <Link to="/kegiatan" className="btn-lime">
                  Jelajahi Agenda <ArrowRight size={14} />
                </Link>
                <Link to="/tentang" className="btn-ghost-dark">
                  Tentang Kami
                </Link>
                {upcoming && (
                  <Link to={`/kegiatan/${upcoming.slug}`} className="pub-hero-card-link" aria-label={`Detail: ${upcoming.judul}`}>
                    <ArrowRight size={14} />
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ SECTION 2: BENTO AGENDA PUBLIK ═══ */}
      <section className="pub-section">
        <div className="pub-section-head-row">
          <div className="pub-section-head">
            <h2>Dokumentasi &amp; Agenda</h2>
            <p>Rangkaian sambung rutin, pembinaan karakter luhur, dan keakraban muda-mudi di Cengkareng.</p>
          </div>
          <Link to="/kegiatan" className="pub-link">Lihat semua agenda ({kegiatanList.length}) →</Link>
        </div>

        {loading ? (
          <SkeletonHeroBento />
        ) : kegiatanList.length === 0 ? (
          <div className="lp-empty-card">Belum ada agenda yang dipublikasikan.</div>
        ) : (
          <motion.div
            className="pub-bento"
            variants={STAGGER_CONTAINER}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.1 }}
          >
            {featured && (
              <motion.div className="pub-bento-featured" variants={FADE_UP_ITEM} whileHover={reduce ? undefined : { scale: 1.01 }} transition={SPRING_TRANSITION}>
                <img src={featured.cover} alt={featured.judul} loading="lazy" />
                <div className="pub-bento-featured-content">
                  <span className="pub-tag">{labelKategori(featured.kategori)}</span>
                  <h3>{featured.judul}</h3>
                  <div className="meta">
                    <span><CalendarDays size={12} /> {featured.tanggal}{featured.jam ? ` · ${featured.jam}` : ""}</span>
                    <span><MapPin size={12} /> {featured.lokasi}</span>
                  </div>
                  <Link to={`/kegiatan/${featured.slug}`} className="btn-lime" style={{ width: "fit-content", marginTop: 4 }}>
                    Detail Kegiatan <ArrowRight size={14} />
                  </Link>
                </div>
              </motion.div>
            )}

            <div className="pub-bento-side">
              {side.map((k) => (
                <motion.div key={k.slug} variants={FADE_UP_ITEM}>
                  <Link to={`/kegiatan/${k.slug}`} className="pub-mini-card">
                    <img src={k.cover} alt={k.judul} loading="lazy" />
                    <div>
                      <span className="pub-tag" style={{ fontSize: 10, padding: "3px 8px" }}>{k.kategori}</span>
                      <h4>{k.judul}</h4>
                      <p><CalendarDays size={11} /> {k.tanggal} · <MapPin size={11} /> {k.lokasi}</p>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>

            {row2.length > 0 && (
              <div className="pub-bento-row2">
                {row2.map((k) => (
                  <motion.div key={k.slug} variants={FADE_UP_ITEM}>
                    <Link to={`/kegiatan/${k.slug}`} className="pub-wide-card">
                      <div className="pub-wide-card-body">
                      <span className="pub-tag" style={{ fontSize: 10, padding: "3px 8px" }}>{labelKategori(k.kategori)}</span>
                        <h4>{k.judul}</h4>
                        <p>{k.excerpt}</p>
                        <span className="muted" style={{ fontSize: 12 }}><CalendarDays size={11} /> {k.tanggal} · <MapPin size={11} /> {k.lokasi}</span>
                      </div>
                      <img src={k.cover} alt={k.judul} loading="lazy" />
                    </Link>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </section>

      {/* ═══ SECTION 3: EDITORIAL ARTIKEL ═══ */}
      <section className="pub-section">
        <div className="pub-section-head-row">
          <div className="pub-section-head">
            <h2>Risalah &amp; Kepemudaan</h2>
            <p>Tulisan seputar tuntunan ibadah, akhlakul karimah, kesehatan, dan inspirasi kemandirian.</p>
          </div>
          <Link to="/artikel" className="pub-link">Semua artikel ({artikelList.length}) →</Link>
        </div>

        {loading ? (
          <SkeletonEditorial />
        ) : artikelList.length === 0 ? (
          <div className="lp-empty-card">Belum ada artikel yang dipublikasikan.</div>
        ) : (
          <div className="pub-editorial">
            {leadArticle && (
              <Reveal>
                <Link to={`/artikel/${leadArticle.slug}`} className="pub-feature-article">
                  <img src={leadArticle.cover} alt={leadArticle.judul} loading="lazy" />
                  <div className="pub-feature-article-body">
                    <span className="pub-tag" style={{ fontSize: 10, padding: "3px 8px" }}>{leadArticle.author}</span>
                    <h3>{leadArticle.judul}</h3>
                    <p>{leadArticle.excerpt}</p>
                    <span className="muted" style={{ fontSize: 12 }}>{leadArticle.tanggal}</span>
                  </div>
                </Link>
              </Reveal>
            )}

            <div className="pub-side-list">
              {artikelList.slice(1, 4).map((a, i) => (
                <Reveal key={a.slug} delay={i * 0.1}>
                  <Link to={`/artikel/${a.slug}`} className="pub-side-item">
                    <span className="pub-tag" style={{ fontSize: 9, padding: "2px 6px" }}>{a.author}</span>
                    <h4>{a.judul}</h4>
                    <p>{a.excerpt}</p>
                    <span className="muted" style={{ fontSize: 11 }}>{a.tanggal}</span>
                  </Link>
                </Reveal>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* ═══ SECTION 4: KILAS REELS ═══ */}
      {(loading || kegiatanList.length > 0) && (
        <section className="pub-section pub-reels">
          <div className="pub-section-head-row">
            <div className="pub-section-head">
              <h2>Momen &amp; Dokumentasi Visual</h2>
              <p>Cuplikan dinamika kebersamaan dan kegiatan rutin muda-mudi di lapangan.</p>
            </div>
            {!loading && (
              <div className="pub-reels-actions">
                <button type="button" className="pub-reels-arrow" aria-label="Geser ke kiri" onClick={() => scrollReels("left")}>
                  <ChevronLeft size={18} />
                </button>
                <button type="button" className="pub-reels-arrow" aria-label="Geser ke kanan" onClick={() => scrollReels("right")}>
                  <ChevronRight size={18} />
                </button>
                <Link to="/galeri" className="pub-link">Buka Galeri →</Link>
              </div>
            )}
          </div>

          {loading ? (
            <SkeletonReelsTrack />
          ) : (
            <div className="pub-reels-track" ref={reelsTrackRef}>
              {kegiatanList.slice(0, 6).map((k) => (
                <Link key={`reel-${k.slug}`} to={`/kegiatan/${k.slug}`} className="pub-reel">
                  <img src={k.cover} alt={k.judul} loading="lazy" />
                  <div className="pub-reel-overlay">
                    <span className="pub-reel-play">▶</span>
                    <strong>{k.judul}</strong>
                    <span style={{ fontSize: 11, opacity: 0.85 }}><CalendarDays size={11} /> {k.tanggal}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      )}

      {/* ═══ SECTION 5: MARQUEE PENGURUS ═══ */}
      {(loading || pengurusList.length > 0) && (
        <section className="pub-section" style={{ paddingBottom: 0 }}>
          <div className="pub-section-head-row">
            <div className="pub-section-head">
              <h2>Pengurus &amp; Pembina</h2>
              <p>Struktur kepengurusan muda-mudi se-Daerah Cengkareng masa bakti aktif.</p>
            </div>
            {!loading && <Link to="/pengurus" className="pub-link">Bagan Organisasi →</Link>}
          </div>
          {loading ? <SkeletonMarquee /> : <TrainMarquee items={pengurusList} />}
        </section>
      )}

      {/* ═══ SECTION 6: TENTANG RINGKAS (About Overdrive) ═══ */}
      <section className="pub-section">
        <div className="pub-about pub-about--overdrive">
          <div className="pub-about-content">
            <span className="pub-about-kicker">Muda-Mudi Cengkareng</span>
            <h3>Membina Generasi yang Alim, Berakhlak, dan Mandiri.</h3>
            <p>
              GENCAR merupakan wadah komunikasi, pembinaan, dan syiar kebaikan generasi muda LDII di tingkat kelompok, desa, hingga daerah Cengkareng.
            </p>
            <div className="pub-about-actions">
              <Link to="/tentang" className="btn-lime">
                Selengkapnya Tentang Kami <ArrowRight size={14} />
              </Link>
              <Link to="/pengurus" className="btn-ghost-light">
                Struktur Pengurus
              </Link>
            </div>
          </div>
          <div className="pub-about-visual">
            <img src={ABOUT_IMG} alt="Generus Cengkareng" loading="lazy" />
            <div className="pub-about-badge">
              <span>Tri Sukses Generus</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
