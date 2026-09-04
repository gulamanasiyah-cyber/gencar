import type { CSSProperties } from "react";

export function Skeleton({
  width,
  height,
  radius,
  style,
  className = "",
  minHeight,
  aspectRatio,
}: {
  width?: CSSProperties["width"];
  height?: CSSProperties["height"];
  radius?: CSSProperties["borderRadius"];
  style?: CSSProperties;
  className?: string;
  minHeight?: CSSProperties["minHeight"];
  aspectRatio?: CSSProperties["aspectRatio"];
}) {
  return (
    <div
      className={`skel ${className}`}
      style={{
        width,
        height,
        minHeight,
        aspectRatio,
        borderRadius: radius ?? 8,
        ...style,
      }}
    />
  );
}

/* ── Kegiatan Card Skeleton ── */
export function SkeletonKegiatanCard() {
  return (
    <article className="pub-kegiatan-card" aria-busy="true" aria-label="Memuat kegiatan…">
      <div className="pub-kegiatan-card-media">
        <Skeleton width="100%" height="100%" radius={0} style={{ position: "absolute", inset: 0 }} />
      </div>
      <div className="pub-kegiatan-card-body" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <Skeleton width={80} height={12} radius={6} />
        <Skeleton width="90%" height={18} radius={6} />
        <Skeleton width="100%" height={14} radius={4} />
        <Skeleton width="60%" height={12} radius={4} />
      </div>
    </article>
  );
}

/* ── Artikel Card Skeleton ── */
export function SkeletonArtikelCard() {
  return (
    <div className="pub-artikel-card" aria-busy="true" aria-label="Memuat artikel…">
      <div className="pub-artikel-thumb" style={{ position: "relative", overflow: "hidden" }}>
        <Skeleton width="100%" height="100%" radius={0} style={{ position: "absolute", inset: 0 }} />
      </div>
      <div className="pub-artikel-body" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <Skeleton width="70%" height={11} radius={4} />
        <Skeleton width="85%" height={16} radius={6} />
        <Skeleton width="100%" height={12} radius={4} />
        <Skeleton width={90} height={11} radius={4} />
      </div>
    </div>
  );
}

/* ── Hero Section Skeleton (PublicHome) ── */
export function SkeletonHeroBento() {
  return (
    <div className="pub-bento" aria-busy="true" aria-label="Memuat agenda kegiatan…">
      {/* Featured */}
      <div className="pub-bento-featured" style={{ position: "relative", overflow: "hidden", minHeight: 380 }}>
        <Skeleton width="100%" height="100%" radius={0} style={{ position: "absolute", inset: 0 }} />
        <div className="pub-bento-featured-content" style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", gap: 10 }}>
          <Skeleton width={100} height={22} radius={999} />
          <Skeleton width="80%" height={22} radius={6} />
          <Skeleton width="50%" height={14} radius={4} />
          <Skeleton width={140} height={36} radius={999} />
        </div>
      </div>
      {/* Side cards */}
      <div className="pub-bento-side">
        {[0, 1].map((i) => (
          <div key={i} className="pub-mini-card" style={{ position: "relative", overflow: "hidden" }}>
            <Skeleton width={120} height="100%" radius={0} style={{ flexShrink: 0 }} />
            <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
              <Skeleton width={60} height={16} radius={999} />
              <Skeleton width="90%" height={16} radius={4} />
              <Skeleton width="60%" height={11} radius={4} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Editorial Skeleton (PublicHome articles) ── */
export function SkeletonEditorial() {
  return (
    <div className="pub-editorial" aria-busy="true" aria-label="Memuat artikel…">
      {/* Lead article — matches pub-feature-article: img + body as siblings */}
      <div className="pub-feature-article">
        <Skeleton width="100%" height={280} radius={0} />
        <div className="pub-feature-article-body">
          <Skeleton width={80} height={18} radius={999} />
          <Skeleton width="85%" height={22} radius={6} />
          <Skeleton width="100%" height={14} radius={4} />
          <Skeleton width={90} height={12} radius={4} />
        </div>
      </div>
      {/* Side list */}
      <div className="pub-side-list">
        {[0, 1, 2].map((i) => (
          <div key={i} className="pub-side-item" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <Skeleton width={60} height={14} radius={999} />
            <Skeleton width="85%" height={16} radius={4} />
            <Skeleton width="100%" height={12} radius={4} />
            <Skeleton width={80} height={11} radius={4} />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Kegiatan Hero Skeleton ── */
export function SkeletonKegiatanHero() {
  return (
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
  );
}

/* ── Detail Page Skeleton ── */
export function SkeletonDetailPage() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }} aria-busy="true" aria-label="Memuat…">
      <Skeleton width={140} height={14} radius={4} />
      <div style={{ display: "flex", gap: 8 }}>
        <Skeleton width={80} height={22} radius={999} />
        <Skeleton width={60} height={22} radius={999} />
      </div>
      <Skeleton width="80%" height={32} radius={8} />
      <Skeleton width="100%" height={16} radius={4} />
      <Skeleton width="60%" height={14} radius={4} />
      <div style={{ display: "flex", gap: 12 }}>
        <Skeleton width={120} height={18} radius={4} />
        <Skeleton width={100} height={18} radius={4} />
        <Skeleton width={130} height={18} radius={4} />
      </div>
      <Skeleton width="100%" height={360} radius="var(--pub-radius-lg)" />
      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 8 }}>
        <Skeleton width="100%" height={16} radius={4} />
        <Skeleton width="100%" height={16} radius={4} />
        <Skeleton width="90%" height={16} radius={4} />
        <Skeleton width="95%" height={16} radius={4} />
        <Skeleton width="70%" height={16} radius={4} />
      </div>
    </div>
  );
}

/* ── Pengurus Grid Skeleton ── */
export function SkeletonPengurusGrid() {
  return (
    <div className="swiss-pengurus-grid" aria-busy="true" aria-label="Memuat bagan kepengurusan…">
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="swiss-card" style={{ display: "flex", flexDirection: "column", gap: 10, padding: 16 }}>
          <Skeleton width={28} height={28} radius={6} />
          <Skeleton width={80} height={80} radius={12} />
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <Skeleton width="80%" height={12} radius={4} />
            <Skeleton width="60%" height={16} radius={4} />
            <Skeleton width="50%" height={11} radius={4} />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Galeri Canvas Skeleton ── */
export function SkeletonGaleriCanvas() {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16, padding: "8px 0" }} aria-busy="true" aria-label="Memuat galeri…">
      {[0, 1, 2, 3, 4, 5].map((i) => {
        const heights = [240, 280, 200, 260, 220, 300];
        return (
          <div key={i} className="pub-polaroid-frame" style={{ display: "flex", flexDirection: "column" }}>
            <Skeleton width="100%" height={heights[i]} radius="var(--pub-radius-md)" />
            <div style={{ padding: "10px 4px", display: "flex", flexDirection: "column", gap: 6 }}>
              <Skeleton width="80%" height={13} radius={4} />
              <Skeleton width="50%" height={11} radius={4} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ── Marquee / Person Skeleton ── */
export function SkeletonMarquee() {
  return (
    <div style={{ display: "flex", gap: 16, overflow: "hidden", padding: "12px 0" }} aria-busy="true" aria-label="Memuat pengurus…">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} style={{ flexShrink: 0, width: 160 }}>
          <Skeleton width={160} height={120} radius="var(--pub-radius-md)" />
          <div style={{ display: "flex", flexDirection: "column", gap: 6, padding: "8px 4px" }}>
            <Skeleton width="80%" height={13} radius={4} />
            <Skeleton width="50%" height={11} radius={4} />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Reels Track Skeleton ── */
export function SkeletonReelsTrack() {
  return (
    <div className="pub-reels-track" aria-busy="true" aria-label="Memuat dokumentasi visual…">
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="pub-reel" style={{ position: "relative" }}>
          <Skeleton width="100%" height="100%" radius={22} />
          <div className="pub-reel-overlay" style={{ pointerEvents: "none" }}>
            <Skeleton width={48} height={48} radius={999} style={{ background: "rgba(255,255,255,0.4)" }} />
            <Skeleton width="85%" height={16} radius={4} style={{ background: "rgba(255,255,255,0.4)", marginTop: 4 }} />
            <Skeleton width="50%" height={12} radius={4} style={{ background: "rgba(255,255,255,0.3)" }} />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Tentang Full Page Skeleton ── */
export function SkeletonTentangHero() {
  return (
    <div style={{ width: "100%" }} aria-busy="true" aria-label="Memuat informasi profil…">
      {/* Hero — grid: 1.05fr 0.95fr, min-height 520px */}
      <div className="tentang-ink-hero">
        <div className="tentang-ink-inner">
          <div className="tentang-ink-copy">
            <Skeleton width={180} height={12} radius={999} style={{ background: "rgba(255,255,255,0.15)" }} />
            <div style={{ display: "grid", gap: 6 }}>
              <Skeleton width="100%" height={50} radius={6} style={{ background: "rgba(255,255,255,0.1)" }} />
              <Skeleton width="88%" height={50} radius={6} style={{ background: "rgba(255,255,255,0.1)" }} />
              <Skeleton width="60%" height={50} radius={6} style={{ background: "rgba(255,255,255,0.1)" }} />
            </div>
            <div style={{ display: "grid", gap: 4 }}>
              <Skeleton width="100%" height={14} radius={4} style={{ background: "rgba(255,255,255,0.08)" }} />
              <Skeleton width="90%" height={14} radius={4} style={{ background: "rgba(255,255,255,0.08)" }} />
              <Skeleton width="75%" height={14} radius={4} style={{ background: "rgba(255,255,255,0.08)" }} />
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
              <Skeleton width={130} height={40} radius={999} style={{ background: "rgba(255,255,255,0.12)" }} />
              <Skeleton width={150} height={40} radius={999} style={{ background: "rgba(255,255,255,0.08)" }} />
            </div>
            <div className="tentang-ink-meta">
              <Skeleton width={110} height={26} radius={999} style={{ background: "rgba(255,255,255,0.1)" }} />
              <Skeleton width={100} height={26} radius={999} style={{ background: "rgba(255,255,255,0.1)" }} />
              <Skeleton width={130} height={26} radius={999} style={{ background: "rgba(255,255,255,0.1)" }} />
            </div>
          </div>
          <div className="tentang-ink-visual" style={{ background: "#0a0a12" }}>
            <Skeleton width="100%" aspectRatio="1 / 1" radius={0} />
            <div className="tentang-ink-float">
              <Skeleton width={32} height={32} radius={10} style={{ background: "rgba(0,0,0,0.08)" }} />
              <Skeleton width="60%" height={12} radius={4} style={{ background: "rgba(0,0,0,0.06)" }} />
            </div>
          </div>
        </div>
      </div>

      {/* Letter — grid: 0.42fr 0.58fr */}
      <div className="tentang-letter">
        <figure className="tentang-letter-illus">
          <Skeleton width="100%" height={420} radius={0} />
          <div style={{ padding: "10px 12px", display: "grid", gap: 4 }}>
            <Skeleton width="100%" height={12} radius={4} />
            <Skeleton width="70%" height={12} radius={4} />
          </div>
        </figure>
        <div className="tentang-letter-body">
          <Skeleton width="55%" height={27} radius={6} />
          {/* dropcap paragraph: big first letter + 3 lines */}
          <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
            <Skeleton width={36} height={44} radius={4} style={{ flexShrink: 0 }} />
            <div style={{ flex: 1, display: "grid", gap: 6, paddingTop: 4 }}>
              <Skeleton width="100%" height={13} radius={4} />
              <Skeleton width="100%" height={13} radius={4} />
              <Skeleton width="92%" height={13} radius={4} />
            </div>
          </div>
          {/* paragraph 2 */}
          <div style={{ display: "grid", gap: 6, marginTop: 10 }}>
            <Skeleton width="100%" height={13} radius={4} />
            <Skeleton width="96%" height={13} radius={4} />
          </div>
          {/* paragraph 3 */}
          <div style={{ display: "grid", gap: 6, marginTop: 10 }}>
            <Skeleton width="100%" height={13} radius={4} />
            <Skeleton width="100%" height={13} radius={4} />
            <Skeleton width="88%" height={13} radius={4} />
          </div>
          {/* quote */}
          <div style={{ borderLeft: "3px solid var(--pub-accent)", paddingLeft: 14, marginTop: 14 }}>
            <div style={{ display: "grid", gap: 6 }}>
              <Skeleton width="100%" height={13} radius={4} />
              <Skeleton width="100%" height={13} radius={4} />
              <Skeleton width="85%" height={13} radius={4} />
            </div>
            <Skeleton width="35%" height={12} radius={4} style={{ marginTop: 10 }} />
          </div>
        </div>
      </div>

      {/* Manifesto — 3-col grid, cards min-height 190px, num 42px */}
      <div className="tentang-manifesto">
        <Skeleton width="40%" height={24} radius={6} />
        <Skeleton width="60%" height={13} radius={4} style={{ marginTop: 6 }} />
        <div className="tentang-manifesto-grid">
          {[0, 1, 2].map((i) => (
            <div key={i} className="tentang-mani-card">
              <Skeleton width={42} height={42} radius={4} style={{ background: "var(--pub-line)" }} />
              <Skeleton width="100%" height={16} radius={4} />
              <Skeleton width="100%" height={14} radius={4} />
              <Skeleton width="100%" height={14} radius={4} />
              <Skeleton width="45%" height={13} radius={4} />
            </div>
          ))}
        </div>
      </div>

      {/* Chronicle — 2-col grid, card: 112px img + body */}
      <div className="tentang-chronicle">
        <Skeleton width="35%" height={24} radius={6} />
        <Skeleton width="50%" height={13} radius={4} style={{ marginTop: 6 }} />
        <div className="tentang-chrono-grid">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="tentang-chrono-card">
              <Skeleton width={112} height={132} radius={0} />
              <div className="tentang-chrono-body">
                <Skeleton width={50} height={11} radius={4} />
                <Skeleton width="100%" height={14} radius={4} />
                <Skeleton width="100%" height={12} radius={4} />
                <Skeleton width="100%" height={12} radius={4} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Voices — grid: 1.15fr 0.85fr, feature min-height 360px dark */}
      <div className="tentang-voices">
        <Skeleton width="30%" height={24} radius={6} />
        <Skeleton width="45%" height={13} radius={4} style={{ marginTop: 6 }} />
        <div className="tentang-voices-grid">
          <div className="tentang-voice-feature" style={{ minHeight: 360 }}>
            <Skeleton width="100%" height="100%" radius={0} style={{ position: "absolute", inset: 0 }} />
            <div className="tentang-voice-feature-content">
              <Skeleton width="85%" height={18} radius={4} style={{ background: "rgba(255,255,255,0.25)" }} />
              <Skeleton width="65%" height={12} radius={4} style={{ background: "rgba(255,255,255,0.2)" }} />
            </div>
          </div>
          <div className="tentang-voices-side">
            {[0, 1, 2].map((i) => (
              <div key={i} className="tentang-voice-card">
                <Skeleton width="95%" height={13} radius={4} />
                <Skeleton width="60%" height={11} radius={4} style={{ marginTop: 4 }} />
                <Skeleton width="100%" height={12} radius={4} />
                <Skeleton width="85%" height={12} radius={4} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Stats — 4-col grid */}
      <div className="tentang-stats-ink" style={{ maxWidth: 932 }}>
        <div className="tentang-stats-row">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="tentang-stat">
              <Skeleton width={90} height={45} radius={6} />
              <Skeleton width="70%" height={15} radius={4} />
            </div>
          ))}
        </div>
      </div>

      {/* CTA — pub-about layout */}
      <div className="pub-section">
        <div className="pub-about">
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <Skeleton width="70%" height={26} radius={6} />
            <Skeleton width="100%" height={14} radius={4} />
            <Skeleton width="95%" height={14} radius={4} />
            <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
              <Skeleton width={160} height={40} radius={999} />
              <Skeleton width={160} height={40} radius={999} />
            </div>
          </div>
          <Skeleton width="100%" aspectRatio="7 / 5" radius="var(--pub-radius-lg)" />
        </div>
      </div>
    </div>
  );
}

export default Skeleton;
