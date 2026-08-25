import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion, useAnimation, useInView, useReducedMotion, type Variants } from "motion/react";
import { ArrowRight, CalendarDays, MapPin, ChevronLeft, ChevronRight } from "lucide-react";
import { MOCK_KEGIATAN, MOCK_ARTIKEL, MOCK_PENGURUS } from "./data";
import { MOSQUE_PATH, MOSQUE_VIEWBOX } from "./mosquePath";
import { DATE_TREE_VIEWBOX, DATE_TREE_PATHS } from "./decorPath";

const HERO_THUMBS = MOCK_KEGIATAN.slice(0, 4);
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

function CountUp({ target, prefix = "", suffix = "", decimals = 0 }: { target: number; prefix?: string; suffix?: string; decimals?: number }) {
  const [val, setVal] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.5 });
  const reduce = useReducedMotion();

  useEffect(() => {
    if (reduce) {
      setVal(target);
      return;
    }
    if (!isInView) return;
    const startTime = performance.now();
    const duration = 1600; // ms

    const step = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const ease = 1 - Math.pow(1 - progress, 3);
      setVal(target * ease);
      if (progress < 1) {
        requestAnimationFrame(step);
      }
    };
    requestAnimationFrame(step);
  }, [isInView, target, reduce]);

  const formatted = decimals > 0 ? val.toFixed(decimals) : Math.round(val).toLocaleString("id-ID");

  return <span ref={ref}>{prefix}{formatted}{suffix}</span>;
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

function TrainMarquee({ items }: { items: typeof MOCK_PENGURUS }) {
  const controls = useAnimation();
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.15 });
  const reduce = useReducedMotion();

  useEffect(() => {
    if (reduce) return;
    let isCancelled = false;

    if (isInView) {
      const sequence = async () => {
        // Step 1: Train Arrival Entrance (fast glide from right: 60vw to 0%)
        await controls.start({
          x: ["60vw", "0%"],
          opacity: [0, 1],
          transition: { duration: 1.8, ease: [0.16, 1, 0.3, 1] },
        });

        if (isCancelled) return;

        // Step 2: Continuous Seamless Infinite Loop (0% to -50%)
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
  }, [isInView, controls, reduce]);

  return (
    <div
      className="pub-marquee"
      ref={ref}
      onMouseEnter={() => controls.stop()}
      onMouseLeave={() => {
        if (!reduce && isInView) {
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
            <img src={p.foto} alt={p.nama} loading="lazy" />
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

  const scrollReels = (direction: "left" | "right") => {
    if (!reelsTrackRef.current) return;
    const amount = direction === "left" ? -320 : 320;
    reelsTrackRef.current.scrollBy({ left: amount, behavior: "smooth" });
  };
  const featured = MOCK_KEGIATAN[0] ?? null;
  const side = MOCK_KEGIATAN.length >= 3 ? MOCK_KEGIATAN.slice(1, 3) : MOCK_KEGIATAN.slice(1);
  const row2 = MOCK_KEGIATAN.length >= 5 ? MOCK_KEGIATAN.slice(3, 5) : MOCK_KEGIATAN.slice(3);
  const leadArticle = MOCK_ARTIKEL[0] ?? null;
  const upcoming = MOCK_KEGIATAN.map((k) => ({ k, ms: parseMs(k) })).filter((x) => x.ms > Date.now()).sort((a, b) => a.ms - b.ms)[0]?.k ?? featured;
  const countdown = useCountdown(upcoming ? parseMs(upcoming) : null);
  const live = countdown != null && !countdown.past;

  const [deck, setDeck] = useState([0, 1, 2, 3]);
  const activeHeroIdx = deck[0];

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
    const timer = setInterval(() => {
      swapNext();
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div>
      {/* HERO — duotone band (top paper-2 + topo, bottom ink) */}
      <section className="pub-hero pub-hero--band">
        <div className="pub-hero-band-bg" aria-hidden="true" />

        {/* Siluet Pohon Kurma c999 — berdiri di area margin luar kiri & kanan di atas pita coklat hero */}
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
          {/* LEFT — visual */}
          <div className="pub-hero-media">
            <span className="pub-hero-sun" aria-hidden="true" />

            <Link to="/galeri" className="pub-hero-polaroid-wrap" aria-label="Lihat galeri foto kegiatan">
              {deck.map((itemIdx, pos) => {
                const k = HERO_THUMBS[itemIdx];
                if (!k) return null;
                const isFront = pos === 0;

                const yOffset = pos * 10;
                const rotateDeg = pos === 0 ? 0 : pos === 1 ? -4 : pos === 2 ? 3.5 : -2.5;
                const scaleVal = 1 - pos * 0.05;
                const zIdx = 4 - pos;

                return (
                  <motion.div
                    key={k.slug}
                    className="pub-hero-polaroid-card"
                    layout
                    initial={false}
                    animate={{
                      y: yOffset,
                      rotate: rotateDeg,
                      scale: scaleVal,
                      zIndex: zIdx,
                      opacity: 1,
                    }}
                    transition={{
                      type: "spring",
                      stiffness: 280,
                      damping: 24,
                    }}
                    whileHover={isFront && !reduce ? { scale: 1.02, rotate: 1 } : undefined}
                  >
                    <div className="pub-hero-polaroid-img-box">
                      <img src={k.cover} alt={`Kegiatan Gencar — ${k.judul}`} loading="eager" />
                    </div>
                    <div className="pub-hero-polaroid-footer">
                      <span className="pub-hero-polaroid-title">{k.judul}</span>
                      <span className="pub-hero-polaroid-date">{k.tanggal}</span>
                    </div>
                  </motion.div>
                );
              })}
            </Link>

            <div className="pub-hero-thumbs" role="list">
              {HERO_THUMBS.map((k, i) => (
                <button
                  key={k.slug}
                  type="button"
                  role="listitem"
                  className={`pub-hero-thumb${i === activeHeroIdx ? " is-active" : ""}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    changeImage(i);
                  }}
                  aria-label={k.judul}
                  style={{ backgroundImage: `url(${k.cover})` }}
                >
                  {i === activeHeroIdx && <span className="pub-hero-thumb-progress" key={activeHeroIdx} />}
                </button>
              ))}
            </div>
          </div>

          {/* RIGHT — copy */}
          <div className="pub-hero-copy">
            {/* Siluet masjid trace cbaef6305 — terikat langsung di kanan judul h1 */}
            <div className="pub-hero-mosque" aria-hidden="true">
              <svg
                viewBox={MOSQUE_VIEWBOX}
                preserveAspectRatio="xMidYMid meet"
                xmlns="http://www.w3.org/2000/svg"
                role="presentation"
              >
                <path d={MOSQUE_PATH} fill="currentColor" />
              </svg>
            </div>
            <h1>
              Muda,<br /><em>Bertakwa,</em><br /><span style={{ color: "var(--pub-primary)" }}>Berkarya.</span>
            </h1>
            <span className="pub-hero-pill">CENGKARENG, JAKARTA BARAT</span>
            <div className="pub-hero-card">
              <div className="pub-hero-countdown-row">
                <span className="pub-hero-countdown-label">
                  <CalendarDays size={12} /> Agenda terdekat
                  {live && <span className="pub-hero-live-badge">live</span>}
                </span>
                <div className="pub-hero-countdown-meta">
                  <span><CalendarDays size={11} /> {upcoming?.tanggal ?? "—"}</span>
                  <span><MapPin size={11} /> {upcoming?.lokasi ?? "—"}</span>
                </div>
                {live && countdown && (
                  <div className="pub-hero-countdown-boxes">
                    <span className="pub-hero-cd-box">{String(countdown.days).padStart(2, "0")}h</span>
                    <span className="pub-hero-cd-box">{String(countdown.hours).padStart(2, "0")}j</span>
                    <span className="pub-hero-cd-box pub-hero-cd-box--accent">{String(countdown.secs).padStart(2, "0")}d</span>
                  </div>
                )}
              </div>
              <div className="pub-hero-actions">
                <Link to="/kegiatan" className="btn-lime">
                  Lihat Kegiatan <ArrowRight size={16} />
                </Link>
                <Link to="/tentang" className="btn-ghost-dark">
                  Tentang Gencar
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* BENTO — kegiatan terlaksana */}
      <section className="pub-section">
        <Reveal>
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
        </Reveal>
      </section>

      {/* PROOF — contained band + delta */}
      <section className="pub-section pub-proof">
        <Reveal>
          <div className="pub-proof-contained">
            <div className="pub-proof-inner">
              <div className="pub-proof-locations">
                <div className="pub-proof-kicker"><MapPin size={12} /> Titik Kegiatan</div>
                <h3>Jejak kami di Cengkareng</h3>
                <div className="pub-proof-loc-list">
                  <div className="pub-proof-loc">
                    <span className="pub-proof-dot pub-proof-dot--primary" />
                    <div><strong>Musala Al-Falah</strong><span>Ngaji Rutin · Selasa 19:30</span></div>
                  </div>
                  <div className="pub-proof-loc">
                    <span className="pub-proof-dot pub-proof-dot--accent" />
                    <div><strong>Lapangan Cengkareng</strong><span>Festival &amp; Futsal · Akhir pekan</span></div>
                  </div>
                  <div className="pub-proof-loc">
                    <span className="pub-proof-dot pub-proof-dot--deep" />
                    <div><strong>Aula Kecamatan</strong><span>Pelatihan &amp; Sambung Akbar</span></div>
                  </div>
                </div>
                <Link to="/kegiatan" className="pub-proof-link">Lihat semua kegiatan <ArrowRight size={12} /></Link>
              </div>
              <div className="pub-proof-stats-panel">
                <div className="pub-proof-stat-item pub-proof-stat-item--primary">
                  <div className="pub-proof-stat-head">
                    <span className="pub-proof-stat-label">Kegiatan</span>
                    <span className="pub-proof-stat-badge pub-proof-stat-badge--gold">
                      +<CountUp target={3} /> bulan ini
                    </span>
                  </div>
                  <div className="pub-proof-stat-num">
                    <CountUp target={MOCK_KEGIATAN.length} />
                  </div>
                  <span className="pub-proof-stat-sub">Dokumentasi publik terverifikasi</span>
                </div>

                <div className="pub-proof-stat-item">
                  <div className="pub-proof-stat-head">
                    <span className="pub-proof-stat-label">Kehadiran</span>
                    <span className="pub-proof-stat-badge pub-proof-stat-badge--green">
                      +<CountUp target={18} suffix="%" /> vs bulan lalu
                    </span>
                  </div>
                  <div className="pub-proof-stat-num">
                    <CountUp target={1.2} decimals={1} suffix="k" />
                  </div>
                  <span className="pub-proof-stat-sub">Total partisipasi muda-mudi</span>
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      {/* PARTNER — overdrive static grid (tanpa marquee) */}
      <section className="pub-partners-section pub-partners--overdrive">
        <div className="pub-partners-ghost" aria-hidden>MITRA</div>
        <div className="pub-partners">
          <span className="pub-partners-kicker">Kolaborasi</span>
          <h2 className="pub-partners-label">Mitra dan Naungan</h2>
          <div className="pub-partners-grid">
            <div className="pub-partner-card"><img src="/logos/ldii.png" alt="LDII" loading="lazy" /><span>LDII</span></div>
            <div className="pub-partner-card"><img src="/logos/senkom.png" alt="SENKOM Mitra Polri" loading="lazy" /><span>SENKOM</span></div>
            <div className="pub-partner-card"><img src="/logos/persinas.png" alt="PERSINAS ASAD" loading="lazy" /><span>PERSINAS ASAD</span></div>
            <div className="pub-partner-card"><img src="/logos/forsgi.png" alt="FORSGI" loading="lazy" /><span>FORSGI</span></div>
          </div>
        </div>
      </section>

      {/* EDITORIAL — tulisan pilihan */}
      <section className="pub-section">
        <Reveal>
          <div className="pub-section-head-row">
            <div className="pub-section-head" style={{ marginBottom: 0 }}>
              <h2>Tulisan Pilihan</h2>
              <p>Rangkuman dan panduan praktis seputar pengelolaan kegiatan dan komunitas.</p>
            </div>
            <Link to="/artikel" className="pub-link">Semua artikel <ArrowRight size={14} /></Link>
          </div>

          <div className="pub-editorial" style={{ marginTop: 18 }}>
            {leadArticle && (
              <motion.div whileHover={reduce ? undefined : { y: -4 }} transition={SPRING_TRANSITION}>
                <Link to={`/artikel/${leadArticle.slug}`} className="pub-feature-article">
                  <img src={leadArticle.cover} alt={leadArticle.judul} loading="lazy" />
                  <div className="pub-feature-article-body">
                    <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--pub-muted)" }}>{leadArticle.author} · {leadArticle.tanggal}</span>
                    <h3>{leadArticle.judul}</h3>
                    <p>{leadArticle.excerpt}</p>
                    <span style={{ fontSize: 13, fontWeight: 700, display: "inline-flex", gap: 6, alignItems: "center" }}>Baca artikel <ArrowRight size={14} /></span>
                  </div>
                </Link>
              </motion.div>
            )}

            <motion.div
              className="pub-side-list"
              initial={reduce ? false : "hidden"}
              whileInView="show"
              viewport={{ once: true }}
              variants={STAGGER_CONTAINER}
            >
              {MOCK_ARTIKEL.slice(1, 4).map((a) => (
                <motion.div key={a.slug} variants={FADE_UP_ITEM} whileHover={reduce ? undefined : { x: 4 }} transition={SPRING_TRANSITION}>
                  <Link to={`/artikel/${a.slug}`} className="pub-side-item">
                    <span style={{ fontSize: 11, color: "var(--pub-muted)", fontWeight: 700 }}>{a.tanggal} · {a.author}</span>
                    <h4>{a.judul}</h4>
                    <p>{a.excerpt}</p>
                  </Link>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </Reveal>
      </section>

      {/* REEL — Lihat keseruan kami */}
      <section className="pub-section pub-reels">
        <div className="pub-section-head-row">
          <div className="pub-section-head" style={{ marginBottom: 0 }}>
            <h2>Lihat Keseruan Kami</h2>
            <p>Scroll samping — kayak reel. Kegiatan terbaru dalam format portrait.</p>
          </div>
          <div className="pub-reels-actions">
            <button
              type="button"
              className="pub-reels-arrow"
              onClick={() => scrollReels("left")}
              aria-label="Scroll reels ke kiri"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              type="button"
              className="pub-reels-arrow"
              onClick={() => scrollReels("right")}
              aria-label="Scroll reels ke kanan"
            >
              <ChevronRight size={16} />
            </button>
            <Link to="/kegiatan" className="pub-link">Semua kegiatan <ArrowRight size={14} /></Link>
          </div>
        </div>
        <motion.div
          ref={reelsTrackRef}
          className="pub-reels-track"
          initial={reduce ? false : "hidden"}
          whileInView="show"
          viewport={{ once: true, amount: 0.15 }}
          variants={STAGGER_CONTAINER}
        >
          {MOCK_KEGIATAN.slice(0, 6).map((k) => (
            <motion.div
              key={k.slug}
              variants={FADE_UP_ITEM}
              style={{ flex: "0 0 280px", display: "flex" }}
            >
              <Link to={`/kegiatan/${k.slug}`} className="pub-reel" style={{ width: "100%" }}>
                <img src={k.cover} alt={k.judul} loading="lazy" />
                <div className="pub-reel-overlay">
                  <span className="pub-reel-play">▶</span>
                  <strong>{k.judul}</strong>
                  <span style={{ display: "inline-flex", gap: 6, alignItems: "center", fontSize: 11 }}><CalendarDays size={11} /> {k.tanggal}</span>
                </div>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* PENGURUS — marquee */}
      <section className="pub-section">
        <Reveal>
          <div className="pub-section-head-row" style={{ marginBottom: 15 }}>
            <div className="pub-section-head" style={{ marginBottom: 0 }}>
              <h2>Pengurus Harian</h2>
              <p>Mengenal pengurus yang mengelola kegiatan dan pembinaan sehari-hari.</p>
            </div>
            <Link to="/pengurus" className="pub-link">Semua pengurus <ArrowRight size={14} /></Link>
          </div>
          <TrainMarquee items={MOCK_PENGURUS} />
        </Reveal>
      </section>

      {/* TENTANG — ajakan formal overdrive */}
      <section className="pub-section" style={{ paddingTop: 0 }}>
        <Reveal>
          <div className="pub-about pub-about--overdrive">
            <div className="pub-about-content">
              <span className="pub-about-kicker">Rumah Komunitas</span>
              <h3>Gencar adalah Rumah Bersama</h3>
              <p>
                Kami berkumpul untuk tumbuh bersama melalui kegiatan yang terbuka dan
                terdokumentasi. Foto, lokasi, dan cerita tersedia secara transparan.
                Bagi yang ingin mengikuti atau mendukung, pintu kami selalu terbuka.
              </p>
              <div className="pub-about-actions">
                <Link to="/tentang" className="btn-lime">
                  Tentang Gencar <ArrowRight size={16} />
                </Link>
                <Link to="/kegiatan" className="btn-ghost-light">
                  Lihat Kegiatan
                </Link>
              </div>
            </div>
            <div className="pub-about-visual">
              <img src={ABOUT_IMG} alt="Suasana Gencar" loading="lazy" />
              <div className="pub-about-badge">
                <span className="pub-about-badge-dot" />
                <span>100% Terbuka &amp; Transparan</span>
              </div>
            </div>
          </div>
        </Reveal>
      </section>
    </div>
  );
}
