import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Play, Sparkles, X, MapPin, CalendarDays, Share2, Tag, Layers } from "lucide-react";

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
    aspectRatio: "tall", // 9:16 portrait
    durasi: "0:45",
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
    kategori: "Prinsip",
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
    kategori: "Kaderisasi",
    tanggal: "2026-09-20",
    lokasi: "Aula Kecamatan",
    aspectRatio: "tall", // 9:16
    durasi: "0:58",
  },
  {
    id: "g6",
    type: "photo",
    judul: "Jalan Sehat Keluarga Gencar — Start Masjid Al-Ikhlas",
    image: "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=1000&h=700&q=80",
    kategori: "Keakraban",
    tanggal: "2026-10-04",
    lokasi: "Masjid Al-Ikhlas",
    aspectRatio: "landscape",
  },
  {
    id: "g7",
    type: "photo",
    judul: "Workshop Konten Kreatif #2 — Bikin Visual Rapi",
    image: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=800&h=1000&q=80",
    kategori: "Pelatihan",
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
    kategori: "Sosial",
    tanggal: "2026-08-25",
    lokasi: "Musala RW 04",
    aspectRatio: "landscape",
  },
  {
    id: "g10",
    type: "reel",
    judul: "Behind the Scenes — Tim Kreatif Siapkan Poster & Deck",
    image: "https://images.unsplash.com/photo-1531403009284-440f080d1e12?auto=format&fit=crop&w=600&h=1000&q=80",
    kategori: "Kreatif",
    tanggal: "2026-10-10",
    lokasi: "Studio Gencar",
    aspectRatio: "tall",
    durasi: "0:42",
  },
];

const CATEGORIES = ["Semua", "Reels", "Foto Kegiatan", "Sambung Rutin", "Festival", "Olahraga"];

export function PublicGaleri() {
  const [activeTab, setActiveTab] = useState("Semua");
  const [selectedItem, setSelectedItem] = useState<GaleriItem | null>(null);

  const filtered = MOCK_GALERI.filter((item) => {
    if (activeTab === "Semua") return true;
    if (activeTab === "Reels") return item.type === "reel";
    if (activeTab === "Foto Kegiatan") return item.type === "photo";
    return item.kategori === activeTab;
  });

  return (
    <div className="pub-galeri-page">
      {/* HEADER HERO */}
      <section className="pub-section pub-galeri-hero">
        <div className="pub-section-head-row">
          <div className="pub-section-head" style={{ marginBottom: 0 }}>
            <span className="pub-proof-kicker">
              <Sparkles size={13} /> Dokumentasi Visual
            </span>
            <h1 className="pub-galeri-title">Galeri &amp; Reel Kegiatan</h1>
            <p className="pub-galeri-desc">
              Dokumentasi nyata kegiatan muda-mudi Gencar Cengkareng — dari reel 9:16, foto
              lapangan, hingga momen keakraban bersama.
            </p>
          </div>
        </div>

        {/* CATEGORY FILTER TABS */}
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
      </section>

      {/* PINTEREST-STYLE IRREGULAR BENTO MASONRY GRID */}
      <section className="pub-section" style={{ paddingTop: 0 }}>
        <div className="pub-galeri-bento">
          {filtered.map((item, idx) => {
            const isQuote = item.type === "quote";

            return (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.45, delay: idx * 0.04 }}
                className={`pub-galeri-card pub-galeri-card--${item.aspectRatio}${isQuote ? " pub-galeri-card--quote" : ""}`}
                onClick={() => setSelectedItem(item)}
              >
                {!isQuote ? (
                  <>
                    <img src={item.image} alt={item.judul} loading="lazy" />

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

                      <div className="pub-galeri-card-bottom">
                        <h4>{item.judul}</h4>
                        <div className="pub-galeri-card-meta">
                          <span><CalendarDays size={11} /> {item.tanggal}</span>
                          <span><MapPin size={11} /> {item.lokasi}</span>
                        </div>
                      </div>
                    </div>

                    {/* REEL CENTER PLAY ICON */}
                    {item.type === "reel" && (
                      <div className="pub-galeri-play-center">
                        <Play size={20} fill="#ffffff" color="#ffffff" />
                      </div>
                    )}
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
      </section>

      {/* FULLSCREEN LIGHTBOX MODAL — TikTok & Instagram Reel Style */}
      <AnimatePresence>
        {selectedItem && (
          <motion.div
            className="pub-lightbox-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedItem(null)}
          >
            <motion.div
              className={`pub-lightbox-modal${selectedItem.type === "reel" ? " pub-lightbox-modal--reel" : ""}`}
              initial={{ scale: 0.92, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0, y: 20 }}
              transition={{ type: "spring", damping: 28, stiffness: 320 }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                className="pub-lightbox-close"
                onClick={() => setSelectedItem(null)}
                aria-label="Tutup"
              >
                <X size={20} />
              </button>

              {/* MEDIA DISPLAY — NO ASPECT RATIO DISTORTION */}
              <div className="pub-lightbox-stage">
                {selectedItem.type !== "quote" ? (
                  <div className="pub-lightbox-media-wrap">
                    <img
                      src={selectedItem.image}
                      alt={selectedItem.judul}
                      className={`pub-lightbox-img pub-lightbox-img--${selectedItem.aspectRatio}`}
                    />
                    {selectedItem.type === "reel" && (
                      <div className="pub-lightbox-reel-badge">
                        <Play size={14} fill="currentColor" /> {selectedItem.durasi ?? "Reel 9:16"}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="pub-lightbox-quote-stage">
                    <blockquote>“{selectedItem.quote}”</blockquote>
                    <cite>— {selectedItem.author}</cite>
                  </div>
                )}
              </div>

              {/* CAPTION & DETAILS PANEL — WHITE CAPTION BELOW / ASIDE */}
              <div className="pub-lightbox-caption-panel">
                <div className="pub-lightbox-caption-head">
                  <span className="pub-galeri-tag">{selectedItem.kategori}</span>
                  <span className="pub-lightbox-type-badge">
                    {selectedItem.type === "reel" ? "Video Reel" : selectedItem.type === "photo" ? "Foto Dokumentasi" : "Kutipan"}
                  </span>
                </div>
                
                <h3 className="pub-lightbox-caption-title">{selectedItem.judul}</h3>

                <div className="pub-lightbox-meta-row">
                  <span><CalendarDays size={13} /> {selectedItem.tanggal}</span>
                  <span><MapPin size={13} /> {selectedItem.lokasi}</span>
                </div>

                <div className="pub-lightbox-footer">
                  <button
                    type="button"
                    className="btn-lime"
                    onClick={() => {
                      if (navigator.share) {
                        navigator.share({ title: selectedItem.judul, url: window.location.href });
                      } else {
                        navigator.clipboard.writeText(window.location.href);
                        alert("Link berhasil di-copy!");
                      }
                    }}
                  >
                    <Share2 size={15} /> Bagikan
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
