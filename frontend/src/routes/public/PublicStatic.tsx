import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence, useInView, useReducedMotion } from "motion/react";
import { ArrowRight, MapPin, Quote, Sparkles, Users, CalendarDays, MessageCircle, X } from "lucide-react";
import { MOCK_PENGURUS, MOCK_STORIES, TENTANG_TIMELINE, TENTANG_NILAI, type PubPengurus, type PengurusLevel } from "./data";

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
    const duration = 1600;

    const step = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
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

function waLink(raw?: string | null) {
  if (!raw) return null;
  const d = raw.replace(/\D/g, "");
  if (!d) return null;
  return `https://wa.me/${d}`;
}
function initials(nama: string) {
  return nama.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}



export function PublicPengurus() {
  const [active, setActive] = useState<PubPengurus | null>(null);
  const [mobileActiveIdx, setMobileActiveIdx] = useState<number | null>(null);

  const ordered = useMemo(() => {
    const src: PubPengurus[] = MOCK_PENGURUS;
    const order: Record<PengurusLevel, number> = { pimpinan: 0, sekretariat: 1, bidang: 2, koordinator: 3 };
    return [...src].sort((a, b) => {
      const oa = order[a.level as PengurusLevel] ?? 2;
      const ob = order[b.level as PengurusLevel] ?? 2;
      if (oa !== ob) return oa - ob;
      return (a.urutan ?? 0) - (b.urutan ?? 0);
    });
  }, []);

  useEffect(() => {
    const mql = window.matchMedia("(max-width: 640px)");
    const update = () => {
      const cards = Array.from(document.querySelectorAll<HTMLElement>(".swiss-card"));
      if (!cards.length) return;
      if (!mql.matches) {
        setMobileActiveIdx(null);
        return;
      }
      const vh = window.innerHeight;
      const centerY = vh * 0.5;
      let bestIdx = 0;
      let bestDist = Infinity;
      cards.forEach((el, i) => {
        const r = el.getBoundingClientRect();
        const elCenter = r.top + r.height / 2;
        const dist = Math.abs(elCenter - centerY);
        if (dist < bestDist) {
          bestDist = dist;
          bestIdx = i;
        }
      });
      setMobileActiveIdx(bestIdx);
    };
    let ticking = false;
    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(() => {
          update();
          ticking = false;
        });
      }
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    const mqlHandler = () => update();
    mql.addEventListener?.("change", mqlHandler);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      mql.removeEventListener?.("change", mqlHandler);
    };
  }, [ordered.length]);

  return (
    <div className="pub-section swiss-pengurus-wrap" style={{ paddingTop: 32 }}>
      <div className="pub-section-head" style={{ textAlign: "center", marginBottom: 28, alignItems: "center" as any }}>
        <h2>Struktur Organisasi</h2>
        <p style={{ textAlign: "center", marginInline: "auto" }}>Tata cetak grafis tebal — nomor urut, garis batas, foto kontras. Klasifikasi jelas tanpa hiasan.</p>
      </div>

      <motion.div
        className="swiss-pengurus-grid"
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.12 }}
        variants={{ hidden: {}, show: { transition: { staggerChildren: 0.06 } } }}
      >
        {ordered.map((p, idx) => (
          <SwissCard
            key={p.nama + p.role}
            p={p}
            index={idx}
            featured={idx === 0}
            isMobileActive={mobileActiveIdx === idx}
            onOpen={setActive}
          />
        ))}
      </motion.div>

      <div className="retro-cta">
        <p>Klik kartu untuk lihat bio & kontak WA — susunan cetak 3 kolom, nomor 01 sebagai pimpinan utama.</p>
        <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap", marginTop: 10 }}>
          <Link to="/tentang" className="btn-lime">Kenalan Gencar <ArrowRight size={14} /></Link>
          <a href="mailto:halo@gencar.id" className="btn-ghost-dark"><MapPin size={14} /> halo@gencar.id</a>
        </div>
      </div>

      <AnimatePresence>
        {active && <SwissModal p={active} onClose={() => setActive(null)} />}
      </AnimatePresence>
    </div>
  );
}

function SwissCard({ p, index, featured, isMobileActive, onOpen }: { p: PubPengurus; index: number; featured?: boolean; isMobileActive?: boolean; onOpen: (p: PubPengurus) => void }) {
  const num = String(index + 1).padStart(2, "0");
  const wa = waLink(p.kontakWa);
  const cardVariants = {
    hidden: { opacity: 0, y: 18 },
    show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] as const } },
  };
  return (
    <motion.button
      type="button"
      className={`swiss-card ${featured ? "swiss-card--hero" : ""} ${isMobileActive ? "is-mobile-active" : ""}`}
      onClick={() => onOpen(p)}
      aria-label={`Lihat detail ${p.nama}`}
      variants={cardVariants}
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 320, damping: 24 }}
    >
      <span className="swiss-num">{num}</span>
      <div className="swiss-photo">
        {p.foto ? <img src={p.foto} alt={p.nama} loading={featured ? "eager" : "lazy"} /> : <div className="swiss-initials">{initials(p.nama)}</div>}
      </div>
      <div className="swiss-copy">
        <span className="swiss-role">{p.role}</span>
        <strong className="swiss-name">{p.nama}</strong>
        <span className="swiss-level">{p.level}</span>
        {p.bio && <p className="swiss-bio">{p.bio}</p>}
      </div>
      {wa && <span className="swiss-wa">WA</span>}
    </motion.button>
  );
}

function SwissModal({ p, onClose }: { p: PubPengurus; onClose: () => void }) {
  const wa = waLink(p.kontakWa);
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
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [onClose, flipped]);
  return (
    <motion.div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-label={`Detail ${p.nama}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
      <div style={{ perspective: 1000, width: "100%", maxWidth: 440, display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }} onClick={(e) => e.stopPropagation()}>
        <motion.div
          className="swiss-polaroid-flip"
          animate={{ rotateY: flipped ? 180 : 0 }}
          transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
          style={{ transformStyle: "preserve-3d" as const, width: "100%", cursor: "pointer" }}
          onClick={() => setFlipped((v) => !v)}
          role="button"
          tabIndex={0}
          aria-label={flipped ? "Lihat foto" : "Balik untuk bio"}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setFlipped((v) => !v); } }}
        >
          {/* FRONT — polaroid foto */}
          <div className="swiss-flip-face swiss-flip-front">
            <div className="swiss-polaroid-card">
              <button type="button" className="swiss-polaroid-close" onClick={(e) => { e.stopPropagation(); onClose(); }} aria-label="Tutup"><X size={14} /></button>
              <div className="swiss-polaroid-media">
                {p.foto ? <img src={p.foto} alt={p.nama} /> : <div className="swiss-initials" style={{ height: 220 }}>{initials(p.nama)}</div>}
                <span className="swiss-flip-hint">Tap untuk balik ↻</span>
              </div>
              <div className="swiss-polaroid-caption">
                <span className="swiss-polaroid-num">{String(orderedIndex(p)).padStart(2, "0")}</span>
                <strong>{p.nama}</strong>
                <span>{p.role} · {p.level}</span>
              </div>
            </div>
          </div>
          {/* BACK — bio tulisan tangan */}
          <div className="swiss-flip-face swiss-flip-back">
            <div className="swiss-polaroid-card swiss-polaroid-card--back">
              <button type="button" className="swiss-polaroid-close" onClick={(e) => { e.stopPropagation(); onClose(); }} aria-label="Tutup"><X size={14} /></button>
              <div className="swiss-flip-back-body">
                <span className="swiss-flip-kicker">Catatan pengurus</span>
                {p.bio ? (
                  <p className="swiss-handwriting">{p.bio}</p>
                ) : (
                  <p className="swiss-handwriting swiss-handwriting--empty">Belum ada catatan — kenalan langsung aja biar lebih akrab.</p>
                )}
                <span className="swiss-flip-hint">Tap untuk kembali ↩</span>
              </div>
            </div>
          </div>
        </motion.div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
          {wa ? <a href={wa} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", gap: 6, alignItems: "center", padding: "10px 16px", background: "var(--pub-ink)", color: "#fff", fontWeight: 800, fontSize: 13, border: "1px solid var(--pub-ink)", borderRadius: 999 }}><MessageCircle size={14} /> Chat WA</a> : <span className="pill pill-slate">Kontak menyusul</span>}
          <button className="btn-ghost-dark" onClick={onClose} style={{ padding: "10px 16px", fontSize: 13 }}>Tutup</button>
        </div>
      </div>
    </motion.div>
  );
}

function orderedIndex(p: PubPengurus): number {
  const order: Record<PengurusLevel, number> = { pimpinan: 0, sekretariat: 1, bidang: 2, koordinator: 3 };
  return [...MOCK_PENGURUS].sort((a, b) => {
    const oa = order[a.level as PengurusLevel] ?? 2;
    const ob = order[b.level as PengurusLevel] ?? 2;
    if (oa !== ob) return oa - ob;
    return (a.urutan ?? 0) - (b.urutan ?? 0);
  }).findIndex((x) => x.nama === p.nama && x.role === p.role) + 1;
}

export function PublicTentang() {
  const lead = MOCK_STORIES[0];
  const side = MOCK_STORIES.slice(1);
  return (
    <div style={{ display: "grid", gap: 0 }}>
      <div className="tentang-ink-hero">
        <div className="tentang-ink-inner">
          <div className="tentang-ink-copy">
            <span className="tentang-kicker">Etalase Muda-Mudi Cengkareng</span>
            <h1>Wadah kebersamaan &amp; <em>pembinaan generus</em> di Cengkareng.</h1>
            <p className="lead">Ruang dokumentasi resmi kegiatan, syiar nilai budi pekerti, dan etalase karya generasi muda LDII Daerah Cengkareng — dari tingkat kelompok hingga daerah.</p>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", paddingTop: 4 }}>
              <Link to="/kegiatan" className="btn-lime">Arsip kegiatan <ArrowRight size={16} /></Link>
              <Link to="/pengurus" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "12px 18px", borderRadius: 999, background: "rgba(255,255,255,0.1)", color: "#fff", fontWeight: 700, fontSize: 14, border: "1px solid rgba(255,255,255,0.16)" }}>Struktur Pengurus</Link>
            </div>
            <div className="tentang-ink-meta">
              <span><Sparkles size={14} /> Etalase Dokumentasi</span>
              <span><Users size={14} /> Daerah Cengkareng</span>
              <span><CalendarDays size={14} /> Pembinaan Berkelanjutan</span>
            </div>
            <div className="tentang-ghost-num" aria-hidden>LDII</div>
          </div>
          <div className="tentang-ink-visual">
            <img src="https://picsum.photos/seed/gencar-tentang-hero/900/900" alt="Kebersamaan Muda-Mudi Cengkareng" loading="eager" />
            <div className="tentang-ink-float">
              <span style={{ width: 32, height: 32, borderRadius: 10, background: "var(--pub-lime)", display: "grid", placeItems: "center", flexShrink: 0 }}><Quote size={14} /></span>
              <span>“Rukun, kompak, dan kerja sama yang baik.”</span>
              <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--pub-muted)", whiteSpace: "nowrap" }}>— Karakter Luhur</span>
            </div>
          </div>
        </div>
      </div>

      <div className="tentang-letter">
        <figure className="tentang-letter-illus">
          <img src="https://picsum.photos/seed/gencar-origin/700/800" alt="Pembinaan Generasi Muda" loading="lazy" />
          <figcaption>Dokumentasi pembinaan berjenjang: dari kelompok, desa, hingga tingkat daerah Cengkareng.</figcaption>
        </figure>
        <div className="tentang-letter-body">
          <h2>Dinamika Pembinaan &amp; Sinergi Generus</h2>
          <p className="dropcap">Pembinaan generasi muda di Cengkareng berakar dari pengajian rutin kelompok hingga kegiatan terpadu tingkat daerah. Setiap jenjang usia dirangkul melalui materi Al-Qur'an dan Al-Hadits yang aplikatif serta pembiasaan akhlak mulia.</p>
          <p>Tujuan utama kami adalah mencetak generasi penerus yang memiliki Tri Sukses: alim dan faqih dalam ilmu agama, berakhlakul karimah dalam pergaulan, serta mandiri dalam mengarungi kehidupan bermasyarakat.</p>
          <p>Laman web ini dihadirkan sebagai etalase publik yang transparan dan rapi. Seluruh dokumentasi kegiatan, artikel kepemudaan, dan karya warga tersaji agar menjadi inspirasi positif bagi sesama dan masyarakat luas.</p>
          <div className="pub-quote">“Membina generus bukan sekadar program tahunan, melainkan ikhtiar berkesinambungan mencetak insan yang bermanfaat bagi agama, nusa, dan bangsa.”<cite>— Pembina Muda-Mudi Cengkareng</cite></div>
        </div>
      </div>

      <div className="tentang-manifesto">
        <h2 style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: 24, letterSpacing: "-0.03em" }}>Pondasi Pembinaan: Tri Sukses Generus</h2>
        <p style={{ fontSize: 13, color: "var(--pub-muted)", marginTop: 6 }}>Tiga target utama yang senantiasa ditanamkan dalam setiap kegiatan muda-mudi.</p>
        <div className="tentang-manifesto-grid">
          <div className="tentang-mani-card tentang-mani-card--ink">
            <span className="tentang-mani-num">01</span>
            <h3>{TENTANG_NILAI[0].title}</h3>
            <p>{TENTANG_NILAI[0].body}</p>
            <Link to={TENTANG_NILAI[0].href}>{TENTANG_NILAI[0].proof} <ArrowRight size={14} /></Link>
          </div>
          <div className="tentang-mani-card">
            <span className="tentang-mani-num">02</span>
            <h3>{TENTANG_NILAI[1].title}</h3>
            <p>{TENTANG_NILAI[1].body}</p>
            <Link to={TENTANG_NILAI[1].href}>{TENTANG_NILAI[1].proof} <ArrowRight size={14} /></Link>
          </div>
          <div className="tentang-mani-card">
            <span className="tentang-mani-num">03</span>
            <h3>{TENTANG_NILAI[2].title}</h3>
            <p>{TENTANG_NILAI[2].body}</p>
            <a href={TENTANG_NILAI[2].href}>{TENTANG_NILAI[2].proof} <ArrowRight size={14} /></a>
          </div>
        </div>
      </div>

      <div className="tentang-chronicle">
        <h2 style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: 24, letterSpacing: "-0.03em" }}>Pilar &amp; Dimensi Pembinaan</h2>
        <p style={{ fontSize: 13, color: "var(--pub-muted)", marginTop: 6 }}>Fokus pengembangan potensi generasi muda se-Daerah Cengkareng.</p>
        <div className="tentang-chrono-grid">
          {TENTANG_TIMELINE.map((t, i) => (
            <div key={t.year} className="tentang-chrono-card">
              <img src={`https://picsum.photos/seed/gencar-chrono-${i}/300/300`} alt="" loading="lazy" />
              <div className="tentang-chrono-body">
                <strong>{t.year}</strong>
                <h4>{t.title}</h4>
                <p>{t.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div id="cerita" className="tentang-voices">
        <h2 style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: 24, letterSpacing: "-0.03em" }}>Cerita dari Lapangan</h2>
        <p style={{ fontSize: 13, color: "var(--pub-muted)", marginTop: 6 }}>Refleksi nyata dari muda-mudi, pembina, dan penggerak kegiatan di Cengkareng.</p>
        <div className="tentang-voices-grid">
          <div className="tentang-voice-feature">
            <img src={lead.foto} alt={lead.nama} loading="lazy" />
            <div className="tentang-voice-feature-content">
              <blockquote>“{lead.quote}”</blockquote>
              <cite>{lead.nama} · {lead.peran} · {lead.angkatan}</cite>
            </div>
          </div>
          <div className="tentang-voices-side">
            {side.map((s) => (
              <div key={s.nama} className="tentang-voice-card">
                <blockquote>“{s.quote}”</blockquote>
                <cite>{s.nama} · {s.peran} · {s.angkatan}</cite>
                <p>{s.konteks}</p>
              </div>
            ))}
          </div>
        </div>
        <p style={{ fontSize: 12, color: "var(--pub-muted)", marginTop: 8, lineHeight: 1.5 }}>{lead.konteks}</p>
      </div>

      <div className="tentang-stats-ink">
        <div className="tentang-stats-row">
          <div className="tentang-stat tentang-stat--ink"><strong><CountUp target={48} /></strong><span>Kegiatan Terdokumentasi</span></div>
          <div className="tentang-stat"><strong><CountUp target={1.2} decimals={1} suffix="k" /></strong><span>Muda-Mudi Terbina</span></div>
          <div className="tentang-stat tentang-stat--lime"><strong><CountUp target={36} /></strong><span>Artikel &amp; Risalah</span></div>
          <div className="tentang-stat"><strong><CountUp target={12} /></strong><span>Pengurus &amp; Koordinator</span></div>
        </div>
        <div style={{ textAlign: "center", marginTop: 12 }}>
          <Link to="/kegiatan" style={{ fontSize: 13, fontWeight: 700, display: "inline-flex", gap: 6, alignItems: "center", borderBottom: "1px solid var(--pub-ink)", paddingBottom: 2 }}>Jelajahi arsip kegiatan terlaksana <ArrowRight size={14} /></Link>
        </div>
      </div>

      <div className="pub-section">
        <div className="pub-about">
          <div>
            <h3>Etalase &amp; Informasi Kepengurusan</h3>
            <p>Untuk koordinasi internal, informasi jadwal kegiatan tingkat daerah, atau pertanyaan seputar dokumentasi publik generus Cengkareng, silakan hubungi perwakilan pengurus.</p>
            <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
              <Link to="/kegiatan" className="btn-lime">Dokumentasi Kegiatan</Link>
              <Link to="/pengurus" className="btn-ghost-dark"><Users size={14} /> Pengurus Daerah</Link>
            </div>
          </div>
          <img src="https://picsum.photos/seed/gencar-cta/700/500" alt="Generus Cengkareng" loading="lazy" />
        </div>
      </div>
    </div>
  );
}
