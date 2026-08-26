import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { Play, Sparkles, X, MapPin, CalendarDays, Share2, Tag, Layers, Shuffle, ChevronLeft, ChevronRight } from "lucide-react";

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

export const MOCK_GALERI: GaleriItem[] = [
  {
    id: "g1",
    type: "reel",
    judul: "Keseruan Futsal & Silaturahmi Pemuda Cengkareng",
    image: "https://images.unsplash.com/photo-1552674605-db6ffd4facb5?auto=format&fit=crop&w=600&h=1000&q=80",
    kategori: "Olahraga",
    tanggal: "2026-09-18",
    lokasi: "Lapangan Futsal Cengkareng",
    aspectRatio: "tall",
    durasi: "0:45",
    deskripsi:
      "Sore itu lapangan futsal penuh tawa dan sorak. Dari pemanasan canggung sampai gol-gol yang dirayakan berlebihan, semua jadi alasan untuk saling sapa. Yang kalah tetap foto bareng, yang menang traktir es teh. Di Gencar, olahraga bukan soal skor — tapi soal silaturahmi yang dijaga lewat keringat bareng.",
  },
  {
    id: "g2",
    type: "photo",
    judul: "Suasana Ngaji Rutin Selasa Malam di Musala Al-Falah",
    image: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=900&h=700&q=80",
    kategori: "Sambung Rutin",
    tanggal: "2026-09-02",
    lokasi: "Musala Al-Falah",
    aspectRatio: "landscape",
    deskripsi:
      "Setiap Selasa malam, Musala Al-Falah terisi penuh. Bukan sekadar mengaji — ada tanya jawab yang jujur, ada cerita yang dibagi pelan-pelan. Kitab dibuka, hati ikut dibuka. Setelah doa, obrolan berlanjut di teras sampai malam makin larut. Di sinilah banyak dari kami belajar arti istiqomah yang sederhana.",
  },
  {
    id: "g3",
    type: "photo",
    judul: "Panggung Kreasi Festival Anak Cengkareng",
    image: "https://images.unsplash.com/photo-1531058020387-3be344556be6?auto=format&fit=crop&w=800&h=1000&q=80",
    kategori: "Festival",
    tanggal: "2026-09-15",
    lokasi: "Lapangan Cengkareng",
    aspectRatio: "portrait",
  },
  {
    id: "g4",
    type: "quote",
    judul: "Rumah Bersama",
    image: "",
    kategori: "Sambung Rutin",
    tanggal: "2026-09-01",
    lokasi: "Cengkareng",
    aspectRatio: "square",
    quote: "Sistem kecil yang jalan terus lebih penting dari acara besar yang sekali lalu hilang.",
    author: "Panitia Gencar",
  },
  {
    id: "g5",
    type: "reel",
    judul: "Highlights Pelatihan Kepemimpinan Muda 2026",
    image: "https://images.unsplash.com/photo-1515187029135-18ee286d815b?auto=format&fit=crop&w=600&h=1000&q=80",
    kategori: "Foto Kegiatan",
    tanggal: "2026-09-20",
    lokasi: "Aula Kecamatan",
    aspectRatio: "tall",
    durasi: "0:58",
  },
  {
    id: "g6",
    type: "photo",
    judul: "Jalan Sehat Keluarga Gencar — Start Masjid Al-Ikhlas",
    image: "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=1000&h=700&q=80",
    kategori: "Foto Kegiatan",
    tanggal: "2026-10-04",
    lokasi: "Masjid Al-Ikhlas",
    aspectRatio: "landscape",
  },
  {
    id: "g7",
    type: "photo",
    judul: "Workshop Konten Kreatif #2 — Bikin Visual Rapi",
    image: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=800&h=1000&q=80",
    kategori: "Foto Kegiatan",
    tanggal: "2026-10-12",
    lokasi: "Basecamp Gencar",
    aspectRatio: "portrait",
  },
  {
    id: "g8",
    type: "reel",
    judul: "Bazaar & Kuliner UMKM Pemda Cengkareng",
    image: "https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&w=600&h=1000&q=80",
    kategori: "Festival",
    tanggal: "2026-09-16",
    lokasi: "Alun-alun Cengkareng",
    aspectRatio: "tall",
    durasi: "0:35",
  },
  {
    id: "g9",
    type: "photo",
    judul: "Kerja Bakti & Resik Musala Sebelum Ramadan",
    image: "https://images.unsplash.com/photo-1582213782179-e0d53f98f2ca?auto=format&fit=crop&w=900&h=700&q=80",
    kategori: "Foto Kegiatan",
    tanggal: "2026-08-25",
    lokasi: "Musala RW 04",
    aspectRatio: "landscape",
  },
  {
    id: "g10",
    type: "reel",
    judul: "Behind the Scenes — Tim Kreatif Siapkan Poster & Deck",
    image: "https://images.unsplash.com/photo-1531403009284-440f080d1e12?auto=format&fit=crop&w=600&h=1000&q=80",
    kategori: "Foto Kegiatan",
    tanggal: "2026-10-10",
    lokasi: "Studio Gencar",
    aspectRatio: "tall",
    durasi: "0:42",
  },
  {
    id: "g11",
    type: "photo",
    judul: "Foto Bersama Pengurus & Pembina Gencar Cengkareng",
    image: "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&w=900&h=700&q=80",
    kategori: "Foto Kegiatan",
    tanggal: "2026-07-14",
    lokasi: "Basecamp Gencar",
    aspectRatio: "landscape",
  },
  {
    id: "g12",
    type: "photo",
    judul: "Senyum Kebersamaan Selepas Kajian Rutin",
    image: "https://images.unsplash.com/photo-1543269865-cbf427effbad?auto=format&fit=crop&w=800&h=1000&q=80",
    kategori: "Sambung Rutin",
    tanggal: "2026-06-22",
    lokasi: "Musala Al-Falah",
    aspectRatio: "portrait",
  },
  {
    id: "g13",
    type: "reel",
    judul: "Turnamen Futsal Pemuda — Gol Penentu Kemenangan",
    image: "https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?auto=format&fit=crop&w=600&h=1000&q=80",
    kategori: "Olahraga",
    tanggal: "2026-05-18",
    lokasi: "GOR Cengkareng",
    aspectRatio: "tall",
    durasi: "0:52",
  },
  {
    id: "g14",
    type: "photo",
    judul: "Penyaluran Paket Sembako & Berbagi Takjil",
    image: "https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?auto=format&fit=crop&w=900&h=700&q=80",
    kategori: "Foto Kegiatan",
    tanggal: "2026-04-10",
    lokasi: "Cengkareng Barat",
    aspectRatio: "landscape",
  },
  {
    id: "g15",
    type: "photo",
    judul: "Panggung Seni & Pentas Musik Islami Muda-Mudi",
    image: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=800&h=1000&q=80",
    kategori: "Festival",
    tanggal: "2026-03-30",
    lokasi: "Taman Cengkareng",
    aspectRatio: "portrait",
  },
  {
    id: "g16",
    type: "quote",
    judul: "Gotong Royong",
    image: "",
    kategori: "Foto Kegiatan",
    tanggal: "2026-03-01",
    lokasi: "Cengkareng Timur",
    aspectRatio: "square",
    quote: "Gotong royong itu bukan nostalgia, tapi sistem operasi kehidupan bermasyarakat.",
    author: "Humas Gencar",
  },
  {
    id: "g17",
    type: "photo",
    judul: "Kunjungan & Silaturahmi Tokoh Masyarakat",
    image: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=900&h=700&q=80",
    kategori: "Sambung Rutin",
    tanggal: "2026-02-14",
    lokasi: "Aula Kecamatan",
    aspectRatio: "landscape",
  },
  {
    id: "g18",
    type: "reel",
    judul: "Reel Dokumentasi Kemah Pemuda Cengkareng",
    image: "https://images.unsplash.com/photo-1526772662000-3f88f10405ff?auto=format&fit=crop&w=600&h=1000&q=80",
    kategori: "Foto Kegiatan",
    tanggal: "2026-01-25",
    lokasi: "Bumi Perkemahan",
    aspectRatio: "tall",
    durasi: "1:10",
  },
  {
    id: "g19",
    type: "photo",
    judul: "Diskusi Lintas Generasi & Rapat Anggaran",
    image: "https://images.unsplash.com/photo-1542744173-8e7e53415bb4?auto=format&fit=crop&w=800&h=1000&q=80",
    kategori: "Foto Kegiatan",
    tanggal: "2026-01-10",
    lokasi: "Ruang Rapat Gencar",
    aspectRatio: "portrait",
  },
  {
    id: "g20",
    type: "photo",
    judul: "Foto Bersama Panitia Sehabis Event Festival",
    image: "https://images.unsplash.com/photo-1527529482837-4698179dc6ce?auto=format&fit=crop&w=900&h=700&q=80",
    kategori: "Festival",
    tanggal: "2025-12-28",
    lokasi: "Cengkareng",
    aspectRatio: "landscape",
  },
];

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
  const canvasRef = useRef<HTMLDivElement>(null);

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

  const filteredBase = MOCK_GALERI.filter((item) => {
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
        {!isMobile ? (
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
