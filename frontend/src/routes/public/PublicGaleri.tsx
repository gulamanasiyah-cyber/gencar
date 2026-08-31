import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { Play, Sparkles, X, MapPin, CalendarDays, Share2, Tag, Layers, Shuffle, ChevronLeft, ChevronRight } from "lucide-react";
import { apiFetch } from "../../lib/api";

export type GaleriItem = {
  id: string;
  type: "reel" | "photo" | "quote";
  judul: string;
  image: string;
  kategori: string;
  tanggal: string;
  lokasi: string;
  aspectRatio: "portrait" | "landscape" | "square" | "tall";
  quote?: string;
  author?: string;
  durasi?: string;
  deskripsi?: string;
};

const CATEGORIES = ["Semua", "Reels", "Foto Kegiatan", "Sambung Rutin", "Festival", "Olahraga"];

type PolaroidTransform = { rotate: number; y: number; x: number; marginTop: string; zIndex: number };

function shuffleArray<T>(array: T[], seed: number): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const s = Math.sin(seed * 777 + (i + 1) * 99) * 10000;
    const j = Math.floor((s - Math.floor(s)) * (i + 1));
    const temp = arr[i]!;
    arr[i] = arr[j]!;
    arr[j] = temp;
  }
  return arr;
}

function generateRandomTransforms(count: number, seed: number): PolaroidTransform[] {
  const result: PolaroidTransform[] = [];
  for (let i = 0; i < count; i++) {
    const s = Math.sin(seed * 999 + (i + 1) * 77) * 10000;
    const rnd1 = s - Math.floor(s);
    const s2 = Math.cos(seed * 333 + (i + 1) * 43) * 10000;
    const rnd2 = s2 - Math.floor(s2);
    const s3 = Math.sin(seed * 111 + (i + 1) * 19) * 10000;
    const rnd3 = s3 - Math.floor(s3);

    const rotate = Math.round((rnd1 * 14 - 7) * 10) / 10;
    const y = Math.round(rnd2 * 32 - 16);
    const x = Math.round(rnd3 * 24 - 12);
    const isTopRowItem = i < 4;
    const marginTopVal = isTopRowItem ? 0 : Math.round(-35 - rnd1 * 45);
    const zIndex = Math.floor(rnd2 * 8) + 1;

    result.push({
      rotate,
      y,
      x,
      marginTop: `${marginTopVal}px`,
      zIndex,
    });
  }
  return result;
}

function PolaroidLightbox({ item, onClose }: { item: GaleriItem; onClose: () => void }) {
  const [flipped, setFlipped] = useState(false);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (flipped) setFlipped(false);
        else onClose();
      }
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose, flipped]);
  const aspectMap: Record<GaleriItem["aspectRatio"], string> = {
    tall: "9 / 16",
    portrait: "4 / 5",
    landscape: "16 / 10",
    square: "1 / 1",
  };
  return (
    <motion.div
      className="modal-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={item.judul}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      style={{ overflowY: "auto", alignContent: "start", padding: "16px", WebkitOverflowScrolling: "touch" } as React.CSSProperties}
    >
      <div
        style={{
          perspective: 1000,
          width: "100%",
          maxWidth: 440,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 14,
          margin: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <motion.div
          className="swiss-polaroid-flip"
          animate={{ rotateY: flipped ? 180 : 0 }}
          transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
          style={{ transformStyle: "preserve-3d" as const, width: "100%", cursor: "pointer" }}
          onClick={() => setFlipped((v) => !v)}
          role="button"
          tabIndex={0}
          aria-label={flipped ? "Lihat foto" : "Balik untuk deskripsi"}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setFlipped((v) => !v);
            }
          }}
        >
          {/* FRONT — polaroid foto (style pengurus) */}
          <div className="swiss-flip-face swiss-flip-front">
            <div className="swiss-polaroid-card">
              <button
                type="button"
                className="swiss-polaroid-close"
                onClick={(e) => {
                  e.stopPropagation();
                  onClose();
                }}
                aria-label="Tutup"
              >
                <X size={14} />
              </button>
              {item.type !== "quote" ? (
                <div className="swiss-polaroid-media">
                  <img
                    src={item.image}
                    alt={item.judul}
                    style={{ aspectRatio: aspectMap[item.aspectRatio] ?? "3 / 4" } as React.CSSProperties}
                  />
                  {item.type === "reel" && (
                    <span className="pub-lightbox-polaroid-badge">
                      <Play size={12} fill="currentColor" /> {item.durasi ?? "Reel"}
                    </span>
                  )}
                  <span className="swiss-flip-hint">Tap untuk balik ↻</span>
                </div>
              ) : (
                <div
                  className="swiss-polaroid-media"
                  style={{
                    padding: "32px 20px",
                    display: "grid",
                    placeItems: "center",
                    background: "var(--pub-paper-2)",
                    aspectRatio: aspectMap[item.aspectRatio] ?? "1 / 1",
                  } as React.CSSProperties}
                >
                  <div style={{ textAlign: "center", display: "grid", gap: 8 }}>
                    <span style={{ fontSize: 28, lineHeight: 1, color: "var(--pub-faint)" }}>“</span>
                    <blockquote
                      style={{
                        fontFamily: "'Space Grotesk', sans-serif",
                        fontSize: 18,
                        fontWeight: 700,
                        lineHeight: 1.4,
                        color: "var(--pub-ink)",
                        margin: 0,
                      }}
                    >
                      “{item.quote}”
                    </blockquote>
                    <cite style={{ fontSize: 12, color: "var(--pub-muted)", fontStyle: "normal" }}>— {item.author}</cite>
                  </div>
                </div>
              )}
              <div className="swiss-polaroid-caption">
                <span>{item.kategori}</span>
                <strong>{item.judul}</strong>
              </div>
            </div>
          </div>
          {/* BACK — deskripsi tulisan tangan */}
          <div className="swiss-flip-face swiss-flip-back">
            <div className="swiss-polaroid-card swiss-polaroid-card--back">
              <button
                type="button"
                className="swiss-polaroid-close"
                onClick={(e) => {
                  e.stopPropagation();
                  onClose();
                }}
                aria-label="Tutup"
              >
                <X size={14} />
              </button>
              <div className="swiss-flip-back-body">
                <span className="swiss-flip-kicker">Cerita di balik foto</span>
                {item.deskripsi ? (
                  <div className="swiss-handwriting">
                    {item.deskripsi.split("\n\n").map((para, i) => (
                      <p key={i}>{para}</p>
                    ))}
                  </div>
                ) : (
                  <p className="swiss-handwriting swiss-handwriting--empty">
                    Belum ada cerita tertulis untuk momen ini — tapi fotonya sudah bercerita banyak.
                  </p>
                )}
                <span className="swiss-flip-hint">Tap untuk kembali ↩</span>
              </div>
            </div>
          </div>
        </motion.div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center", alignItems: "center" }}>
          <span
            style={{
              display: "inline-flex",
              gap: 6,
              alignItems: "center",
              fontSize: 12,
              fontWeight: 600,
              color: "#fff",
              background: "rgba(255,255,255,0.12)",
              border: "1px solid rgba(255,255,255,0.16)",
              padding: "7px 10px",
              borderRadius: 999,
            }}
          >
            <CalendarDays size={12} /> {item.tanggal}
          </span>
          <span
            style={{
              display: "inline-flex",
              gap: 6,
              alignItems: "center",
              fontSize: 12,
              fontWeight: 600,
              color: "#fff",
              background: "rgba(255,255,255,0.12)",
              border: "1px solid rgba(255,255,255,0.16)",
              padding: "7px 10px",
              borderRadius: 999,
            }}
          >
            <MapPin size={12} /> {item.lokasi}
          </span>
          <button
            type="button"
            style={{
              display: "inline-flex",
              gap: 6,
              alignItems: "center",
              padding: "10px 16px",
              background: "var(--pub-ink)",
              color: "#fff",
              fontWeight: 800,
              fontSize: 13,
              border: "1px solid rgba(255,255,255,0.14)",
              borderRadius: 999,
            }}
            onClick={() => {
              if (navigator.share) navigator.share({ title: item.judul, url: window.location.href });
              else {
                navigator.clipboard.writeText(window.location.href);
                alert("Link berhasil di-copy!");
              }
            }}
          >
            <Share2 size={14} /> Bagikan
          </button>
          <button type="button" className="btn-ghost-dark" onClick={onClose} style={{ padding: "10px 16px", fontSize: 13, background: "#fff", borderColor: "#fff" }}>
            Tutup
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function MobilePolaroidDeck({
  items,
  onSelect,
}: {
  items: GaleriItem[];
  onSelect: (item: GaleriItem) => void;
}) {
  const [idx, setIdx] = useState(0);
  const total = items.length;

  useEffect(() => {
    setIdx(0);
  }, [total]);

  if (total === 0) return null;
  const cur = items[idx % total];
  if (!cur) return null;
  const next = () => setIdx((v) => (v + 1) % total);
  const prev = () => setIdx((v) => (v - 1 + total) % total);

  const stack = [0, 1, 2]
    .map((o) => {
      const i = (idx + o) % total;
      return { item: items[i]!, offset: o };
    })
    .filter((s) => s.item);

  return (
    <div className="pub-galeri-deck-wrap">
      <div className="pub-galeri-deck-stack">
        {[...stack].reverse().map(({ item, offset }) => {
          const isTop = offset === 0;
          const peekRotate = offset === 1 ? 2.5 : offset === 2 ? -3 : 0;
          const peekY = offset * 10;
          const peekX = offset === 1 ? 6 : offset === 2 ? -6 : 0;
          const peekScale = 1 - offset * 0.04;
          const peekZ = 10 - offset;

          return (
            <motion.div
              key={`${item.id}-${idx}-${offset}`}
              className="pub-galeri-deck-card"
              drag={isTop ? "x" : false}
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.32}
                  onDragEnd={(_, info) => {
                if (!isTop) return;
                if (Math.abs(info.offset.x) < 50) return;
                // kanan atau kiri — kartu teratas ke belakang (infinite)
                next();
              }}
              initial={false}
              animate={{
                x: peekX,
                y: peekY,
                rotate: peekRotate,
                scale: peekScale,
                zIndex: isTop ? 20 : peekZ,
                opacity: 1,
              }}
              whileTap={isTop ? { cursor: "grabbing" } : undefined}
              transition={{ type: "spring", stiffness: 320, damping: 28 }}
              style={{ cursor: isTop ? "grab" : "default" } as React.CSSProperties}
              onClick={() => isTop && onSelect(item)}
            >
              <div
                className={`pub-galeri-card pub-polaroid-frame pub-galeri-card--${item.aspectRatio}`}
                style={{ marginTop: 0 }}
              >
                <div className="pub-polaroid-img-wrap">
                  <img src={item.image} alt={item.judul} loading="lazy" draggable={false} />
                  <div className="pub-galeri-card-overlay">
                    <div className="pub-galeri-card-top">
                      <span className="pub-galeri-tag">
                        <Tag size={10} /> {item.kategori}
                      </span>
                      {item.type === "reel" && (
                        <span className="pub-galeri-reel-badge">
                          <Play size={10} fill="currentColor" /> {item.durasi ?? "Reel"}
                        </span>
                      )}
                    </div>
                  </div>
                  {item.type === "reel" && (
                    <div className="pub-galeri-play-center">
                      <Play size={20} fill="#ffffff" color="#ffffff" />
                    </div>
                  )}
                </div>
                <div className="pub-polaroid-caption">
                  <h4 className="pub-polaroid-title">{item.judul}</h4>
                  <div className="pub-polaroid-meta">
                    <span>
                      <CalendarDays size={11} /> {item.tanggal}
                    </span>
                    <span>
                      <MapPin size={11} /> {item.lokasi}
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
      <div style={{ display: "flex", justifyContent: "center", gap: 12, marginTop: 18 }}>
        <button type="button" className="pub-deck-nav" onClick={prev} aria-label="Sebelumnya">
          <ChevronLeft size={18} />
        </button>
        <button type="button" className="pub-deck-nav" onClick={next} aria-label="Selanjutnya">
          <ChevronRight size={18} />
        </button>
      </div>
      <p className="pub-galeri-deck-hint">Geser kartu untuk foto selanjutnya — goyangkan HP untuk acak</p>
    </div>
  );
}

export function PublicGaleri() {
  const reduce = useReducedMotion();
  const [activeTab, setActiveTab] = useState("Semua");
  const [selectedItem, setSelectedItem] = useState<GaleriItem | null>(null);
  const [seed, setSeed] = useState(1);
  const [isMobile, setIsMobile] = useState(false);
  const [topCardId, setTopCardId] = useState<string | null>(null);
  const [items, setItems] = useState<GaleriItem[]>([]);
  const [loading, setLoading] = useState(true);
  const canvasRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancel = false;
    setLoading(true);
    apiFetch<unknown>("/api/public/galeri")
      .then((raw) => {
        if (cancel) return;
        const list = Array.isArray(raw) ? (raw as GaleriItem[]) : [];
        setItems(list);
        setLoading(false);
      })
      .catch(() => {
        if (!cancel) {
          setItems([]);
          setLoading(false);
        }
      });
    return () => { cancel = true; };
  }, []);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 640);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // reset deck handled inside MobilePolaroidDeck via items change

  const shuffleCanvas = useCallback(() => {
    setSeed((s) => s + 1);
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      try {
        navigator.vibrate([30, 20, 30]);
      } catch {
        // ignore
      }
    }
  }, []);

  // Phone shake detection via devicemotion
  useEffect(() => {
    let lastTime = 0;
    let lastX = 0;
    let lastY = 0;
    let lastZ = 0;

    const handleMotion = (e: DeviceMotionEvent) => {
      const acc = e.accelerationIncludingGravity;
      if (!acc || acc.x === null || acc.y === null || acc.z === null) return;
      const now = Date.now();
      if (now - lastTime < 700) return;

      const deltaX = acc.x - lastX;
      const deltaY = acc.y - lastY;
      const deltaZ = acc.z - lastZ;

      lastX = acc.x;
      lastY = acc.y;
      lastZ = acc.z;

      const speed = ((Math.abs(deltaX) + Math.abs(deltaY) + Math.abs(deltaZ)) / (now - lastTime || 1)) * 10000;
      if (speed > 160) {
        lastTime = now;
        shuffleCanvas();
      }
    };

    if (typeof window !== "undefined" && "DeviceMotionEvent" in window) {
      window.addEventListener("devicemotion", handleMotion);
    }
    return () => {
      if (typeof window !== "undefined" && "DeviceMotionEvent" in window) {
        window.removeEventListener("devicemotion", handleMotion);
      }
    };
  }, [shuffleCanvas]);

  const filteredBase = items.filter((item) => {
    if (activeTab === "Semua") return true;
    if (activeTab === "Reels") return item.type === "reel";
    if (activeTab === "Foto Kegiatan") return item.type === "photo";
    return item.kategori === activeTab;
  });

  const filtered = seed > 1 ? shuffleArray(filteredBase, seed) : filteredBase;
  const transforms = generateRandomTransforms(filtered.length, seed);

  return (
    <div className="pub-galeri-page">
      {/* HEADER HERO */}
      <section className="pub-section pub-galeri-hero">
        <div className="pub-section-head-row">
          <div className="pub-section-head" style={{ marginBottom: 0 }}>
            <span className="pub-proof-kicker">
              <Sparkles size={13} /> Dokumentasi Visual &amp; Meja Meja Polaroid
            </span>
            <h1 className="pub-galeri-title">Galeri &amp; Reel Kegiatan</h1>
            <p className="pub-galeri-desc">
              Dokumentasi nyata kegiatan muda-mudi Gencar — seret, geser, dan buka foto
              Polaroid interaktif untuk melihat momen kegiatan.
            </p>
          </div>
        </div>

        {/* CATEGORY FILTER TABS + SHUFFLE ACTION (shuffle hidden on mobile — shake only) */}
        <div className="pub-galeri-tabs-row">
          <div className="pub-galeri-tabs" role="tablist">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                role="tab"
                aria-selected={activeTab === cat}
                className={`pub-galeri-tab${activeTab === cat ? " is-active" : ""}`}
                onClick={() => setActiveTab(cat)}
              >
                {cat === "Reels" && <Play size={12} fill="currentColor" />}
                {cat === "Foto Kegiatan" && <Layers size={12} />}
                {cat}
              </button>
            ))}
          </div>

          {!isMobile && (
            <button
              type="button"
              className="pub-galeri-shuffle-btn"
              onClick={shuffleCanvas}
              aria-label="Acak foto galeri"
              title="Acak tata letak foto (Goyang HP / Shake untuk mengacak di HP)"
            >
              <Shuffle size={14} />
            </button>
          )}
        </div>

        {/* DESKTOP: scattered draggable canvas — Mobile: single stacked deck with swipe */}
        {loading ? (
          <div style={{ textAlign: "center", padding: "4rem 1rem", color: "var(--pub-ink-muted, #64748b)" }}>
            Memuat galeri kegiatan...
          </div>
        ) : !isMobile ? (
          <div className="pub-galeri-canvas-wrap" ref={canvasRef}>
            <div className="pub-galeri-bento pub-galeri-scatter">
              {filtered.map((item, idx) => {
                const isQuote = item.type === "quote";
                const tr = transforms[idx] ?? { rotate: 0, y: 0, x: 0, marginTop: "0px", zIndex: 1 };
                const currentZIndex = item.id === topCardId ? 45 : tr.zIndex;

                return (
                  <motion.div
                    key={`${item.id}-${seed}`}
                    layout
                    drag
                    dragConstraints={canvasRef}
                    dragElastic={0.15}
                    dragSnapToOrigin
                    initial={{ opacity: 0, scale: 0.88, rotate: tr.rotate, y: tr.y + 24, x: tr.x }}
                    animate={{ opacity: 1, scale: 1, rotate: tr.rotate, y: tr.y, x: tr.x, zIndex: currentZIndex }}
                    exit={{ opacity: 0, scale: 0.85, rotate: 0 }}
                    whileHover={reduce ? undefined : { scale: 1.05, rotate: 0, zIndex: 35, y: -8 }}
                    whileDrag={reduce ? undefined : { scale: 1.08, rotate: 0, zIndex: 50, cursor: "grabbing" }}
                    transition={{ type: "spring", stiffness: 280, damping: 22 }}
                    style={{ marginTop: tr.marginTop }}
                    className={`pub-galeri-card pub-polaroid-frame pub-galeri-card--${item.aspectRatio}${isQuote ? " pub-galeri-card--quote" : ""}`}
                    onClick={() => {
                      setTopCardId(item.id);
                      setSelectedItem(item);
                    }}
                  >
                {!isQuote ? (
                  <>
                    <div className="pub-polaroid-img-wrap">
                      <img src={item.image} alt={item.judul} loading="lazy" draggable={false} />

                      {/* OVERLAY BADGES & DETAILS */}
                      <div className="pub-galeri-card-overlay">
                        <div className="pub-galeri-card-top">
                          <span className="pub-galeri-tag">
                            <Tag size={10} /> {item.kategori}
                          </span>
                          {item.type === "reel" && (
                            <span className="pub-galeri-reel-badge">
                              <Play size={10} fill="currentColor" /> {item.durasi ?? "Reel"}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* REEL CENTER PLAY ICON */}
                      {item.type === "reel" && (
                        <div className="pub-galeri-play-center">
                          <Play size={20} fill="#ffffff" color="#ffffff" />
                        </div>
                      )}
                    </div>

                    {/* POLAROID PRINT CAPTION FOOTER */}
                    <div className="pub-polaroid-caption">
                      <h4 className="pub-polaroid-title">{item.judul}</h4>
                      <div className="pub-polaroid-meta">
                        <span><CalendarDays size={11} /> {item.tanggal}</span>
                        <span><MapPin size={11} /> {item.lokasi}</span>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="pub-galeri-quote-body">
                    <span className="pub-galeri-quote-icon">“</span>
                    <p>{item.quote}</p>
                    <cite>— {item.author}</cite>
                  </div>
                )}
              </motion.div>
            );
          })}
            </div>
          </div>
        ) : (
          <MobilePolaroidDeck items={filtered} onSelect={setSelectedItem} />
        )}
      </section>

      <AnimatePresence>
        {selectedItem && (
          <PolaroidLightbox
            key={selectedItem.id}
            item={selectedItem}
            onClose={() => setSelectedItem(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
