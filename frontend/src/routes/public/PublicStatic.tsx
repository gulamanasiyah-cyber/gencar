import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, MapPin, Quote, Sparkles, Users, CalendarDays, MessageCircle, X } from "lucide-react";
import { MOCK_PENGURUS, MOCK_STORIES, TENTANG_TIMELINE, TENTANG_NILAI, type PubPengurus, type PengurusLevel } from "./data";

function waLink(raw?: string | null) {
  if (!raw) return null;
  const d = raw.replace(/\D/g, "");
  if (!d) return null;
  return `https://wa.me/${d}`;
}
function initials(nama: string) {
  return nama.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}

function Daisy({ pos }: { pos: string }) {
  return <span className={`retro-daisy ${pos}`} aria-hidden><span className="retro-daisy-face">☺</span></span>;
}
// used via CSS deco — keep for retro pengurus board
function RedFlower({ style, className }: { style?: React.CSSProperties; className?: string }) {
  return <span className={`retro-redflower ${className ?? ""}`} style={style} aria-hidden>✿</span>;
}
void RedFlower;
function Squiggle({ kind, style }: { kind: "green" | "peach" | "arrow"; style?: React.CSSProperties }) {
  if (kind === "arrow") return <span style={{ ...style, fontSize: 28, color: "#3B82F6", fontWeight: 900, display: "inline-block", transform: "rotate(-20deg)" }} aria-hidden>⬆</span>;
  return <span className={`retro-squiggle retro-squiggle--${kind}`} style={style} aria-hidden>{kind === "green" ? "〰〰" : "〜〜"}</span>;
}
void Squiggle;

export function PublicPengurus() {
  const [data, setData] = useState<PubPengurus[] | null>(null);
  const [active, setActive] = useState<PubPengurus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    fetch("/api/public/pengurus")
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((j) => {
        if (!alive) return;
        if (Array.isArray(j) && j.length) {
          const mapped: PubPengurus[] = j.map((r: any) => ({
            id: r.id, nama: r.nama, role: r.dapukan, foto: r.foto || "", level: (r.level as PengurusLevel) || "bidang", bio: r.bio ?? null, kontakWa: r.kontakWa ?? null, urutan: r.urutan ?? 0,
          }));
          setData(mapped);
        } else setData(MOCK_PENGURUS);
      })
      .catch(() => { if (alive) setData(MOCK_PENGURUS); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  const ordered = useMemo(() => {
    const src = data && data.length ? data : MOCK_PENGURUS;
    // order by level priority then urutan
    const order: Record<PengurusLevel, number> = { pimpinan: 0, sekretariat: 1, bidang: 2, koordinator: 3 };
    return [...src].sort((a, b) => {
      const oa = order[a.level as PengurusLevel] ?? 2;
      const ob = order[b.level as PengurusLevel] ?? 2;
      if (oa !== ob) return oa - ob;
      return (a.urutan ?? 0) - (b.urutan ?? 0);
    });
  }, [data]);

  // pyramid 1 - 3 - 3 (like screenshot). overflow goes to extra row
  const apex = ordered.slice(0, 1);
  const row2 = ordered.slice(1, 4);
  const row3 = ordered.slice(4, 7);
  const extra = ordered.slice(7);

  return (
    <div className="pub-section retro-pengurus-wrap" style={{ paddingTop: 32 }}>
      <div className="pub-section-head" style={{ textAlign: "center", marginBottom: 28, alignItems: "center" as any }}>
        <span className="pub-eyebrow" style={{ justifyContent: "center" }}>Pengurus</span>
        <h2>Struktur Organisasi</h2>
        <p>Yang ngurus harian — siapa pimpinan, sekretariat, dan bidang. Bentuk piramida biar langsung kebaca.</p>
      </div>

      <div className="retro-board">

        {loading ? (
          <div style={{ display: "grid", gap: 18, padding: "24px 0" }}>
            <div className="pub-skeleton" style={{ height: 220, borderRadius: 24, maxWidth: 260, margin: "0 auto", width: "100%" }} />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14 }}><div className="pub-skeleton" style={{ height: 180, borderRadius: 20 }} /><div className="pub-skeleton" style={{ height: 180, borderRadius: 20 }} /><div className="pub-skeleton" style={{ height: 180, borderRadius: 20 }} /></div>
          </div>
        ) : (
          <>
            <div className="retro-row retro-row--apex">
              {apex.map((p) => (
                <RetroArch key={p.nama + p.role} p={p} featured onOpen={setActive} />
              ))}
            </div>

            {row2.length > 0 && (
              <>
                <div className="retro-row-label"><span>Pimpinan & Sekretariat</span></div>
                <div className="retro-row retro-row--3">
                  {row2.map((p) => (
                    <RetroArch key={p.nama + p.role} p={p} onOpen={setActive} />
                  ))}
                </div>
              </>
            )}

            {row3.length > 0 && (
              <>
                <div className="retro-row-label"><span>Bidang</span></div>
                <div className="retro-row retro-row--3">
                  {row3.map((p) => (
                    <RetroArch key={p.nama + p.role} p={p} onOpen={setActive} />
                  ))}
                </div>
              </>
            )}

            {extra.length > 0 && (
              <div className="retro-row retro-row--3">
                {extra.map((p) => (
                  <RetroArch key={p.nama + p.role} p={p} onOpen={setActive} />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <div className="retro-cta">
        <p>Klik kartu untuk lihat bio & kontak WA — hierarki 1 → 3 → 3 biar langsung kebaca.</p>
        <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap", marginTop: 10 }}>
          <Link to="/tentang" className="btn-lime">Kenalan Gencar <ArrowRight size={14} /></Link>
          <a href="mailto:halo@gencar.id" className="btn-ghost-dark"><MapPin size={14} /> halo@gencar.id</a>
        </div>
      </div>

      {active && <RetroModal p={active} onClose={() => setActive(null)} />}
    </div>
  );
}

function RetroArch({ p, featured, onOpen }: { p: PubPengurus; featured?: boolean; onOpen: (p: PubPengurus) => void }) {
  const wa = waLink(p.kontakWa);
  return (
    <button type="button" className={`retro-arch ${featured ? "retro-arch--featured" : ""}`} onClick={() => onOpen(p)} aria-label={`Lihat detail ${p.nama}`}>
      <span className="retro-arch-name">{p.nama}</span>
      <div className="retro-arch-inner">
        <div className="retro-arch-photo">
          {p.foto ? <img src={p.foto} alt={p.nama} loading={featured ? "eager" : "lazy"} /> : <div className="retro-arch-initials">{initials(p.nama)}</div>}
        </div>
      </div>
      <Daisy pos="retro-daisy--tr" />
      <Daisy pos="retro-daisy--bl" />
      <span className="retro-arch-role">{p.role}</span>
      {wa && <span className="retro-arch-wa" onClick={(e) => e.stopPropagation()}><a href={wa} target="_blank" rel="noopener noreferrer" style={{ color: "inherit", textDecoration: "none" }}>WA</a></span>}
    </button>
  );
}

function RetroModal({ p, onClose }: { p: PubPengurus; onClose: () => void }) {
  const wa = waLink(p.kontakWa);
  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-label={`Detail ${p.nama}`}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 520, border: "3px solid #111", borderRadius: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <strong className="modal-title">Detail Pengurus</strong>
          <button className="btn-close" aria-label="Tutup" onClick={onClose}><X size={16} /></button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: 16, alignItems: "start" }}>
          {p.foto ? <img src={p.foto} alt={p.nama} style={{ width: 120, height: 120, borderRadius: 16, objectFit: "cover", border: "2px solid #111" }} /> : <div className="retro-arch-initials" style={{ width: 120, height: 120, borderRadius: 16, border: "2px solid #111" }}>{initials(p.nama)}</div>}
          <div style={{ display: "grid", gap: 6 }}>
            <strong style={{ fontSize: 18, letterSpacing: "-0.02em" }}>{p.nama}</strong>
            <span style={{ fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 800, color: "var(--pub-muted)" }}>{p.role} · {p.level}</span>
            {p.bio && <p style={{ fontSize: 13, color: "var(--pub-muted)", lineHeight: 1.6, marginTop: 4 }}>{p.bio}</p>}
            <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
              {wa ? <a href={wa} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", gap: 6, alignItems: "center", padding: "10px 16px", borderRadius: 999, background: "#111", color: "#fff", fontWeight: 800, fontSize: 13 }}><MessageCircle size={14} /> Chat WA</a> : <span className="pill pill-slate">Kontak menyusul</span>}
              <button className="btn-ghost-dark" onClick={onClose} style={{ padding: "10px 16px", fontSize: 13 }}>Tutup</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function PublicTentang() {
  const lead = MOCK_STORIES[0];
  const side = MOCK_STORIES.slice(1);
  return (
    <div style={{ display: "grid", gap: 0 }}>
      <div className="tentang-ink-hero">
        <div className="tentang-ink-inner">
          <div className="tentang-ink-copy">
            <span className="tentang-kicker">Tentang Gencar</span>
            <h1>Rumah buat <em>tumbuh bareng</em> di Cengkareng.</h1>
            <p className="lead">Bukan organisasi yang dibikin biar kelihatan besar. Kita mulai dari 12 orang di musala — sekarang jadi etalase yang kebuka buat siapa aja yang mau ikut atau bantu.</p>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", paddingTop: 4 }}>
              <Link to="/kegiatan" className="btn-lime">Lihat kegiatan <ArrowRight size={16} /></Link>
              <Link to="/pengurus" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "12px 18px", borderRadius: 999, background: "rgba(255,255,255,0.1)", color: "#fff", fontWeight: 700, fontSize: 14, border: "1px solid rgba(255,255,255,0.16)" }}>Kenalan pengurus</Link>
            </div>
            <div className="tentang-ink-meta">
              <span><Sparkles size={14} /> Etalase publik</span>
              <span><Users size={14} /> Kurasi pengurus</span>
              <span><CalendarDays size={14} /> Sejak 2019</span>
            </div>
            <div className="tentang-ghost-num" aria-hidden>2019</div>
          </div>
          <div className="tentang-ink-visual">
            <img src="https://picsum.photos/seed/gencar-tentang-hero/900/900" alt="Kebersamaan Gencar" loading="eager" />
            <div className="tentang-ink-float">
              <span style={{ width: 32, height: 32, borderRadius: 10, background: "var(--pub-lime)", display: "grid", placeItems: "center", flexShrink: 0 }}><Quote size={14} /></span>
              <span>“Kalau mau ikut, datang. Kalau mau bantu, ngobrol.”</span>
              <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--pub-muted)", whiteSpace: "nowrap" }}>— Prinsip 2019</span>
            </div>
          </div>
        </div>
      </div>
      <div className="tentang-letter">
        <figure className="tentang-letter-illus">
          <img src="https://picsum.photos/seed/gencar-origin/700/800" alt="Arsip Gencar — musala & catatan" loading="lazy" />
          <figcaption>Arsip 2019–2021: daftar hadir tulis tangan & foto HP pinjam. Sekarang jadi sistem.</figcaption>
        </figure>
        <div className="tentang-letter-body">
          <h2>Asal-usul — bukan dari proposal</h2>
          <p className="dropcap">Awalnya cuma keluhan yang sama: banyak kegiatan lewat, tapi nggak ada yang ngerasa punya. Akhirnya 12 orang mutusin bikin wadah sendiri — namanya belakangan, yang penting jalan dulu.</p>
          <p>Yang bikin awet bukan visi yang panjang, tapi sistem kecil yang jalan terus: checklist 1 halaman, rotasi panitia, dan arsip yang rapi. Jadi tiap angkatan nggak mulai dari nol — tinggal lanjutin.</p>
          <p>Etalase publik ini kita buka biar transparan. Kegiatan internal (absensi, GPS, rekap) tetap di sistem internal — yang di sini hanya yang layak publik lihat. Foto jelas, cerita jujur, jadwal kebaca.</p>
          <div className="pub-quote">“Sistem kecil yang jalan terus lebih penting dari acara besar yang sekali lalu hilang.”<cite>— Dimas, koordinator lapangan sejak 2021</cite></div>
        </div>
      </div>
      <div className="tentang-manifesto">
        <h2 style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: 24, letterSpacing: "-0.03em" }}>Tiga hal yang kita pegang</h2>
        <p style={{ fontSize: 13, color: "var(--pub-muted)", marginTop: 6 }}>Bukan jargon di dinding — ini yang kelihatan di lapangan.</p>
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
            <span style={{ width: 32, height: 32, borderRadius: 10, background: "var(--pub-lime)", display: "grid", placeItems: "center" }}><Quote size={14} /></span>
            <h3>{TENTANG_NILAI[2].title}</h3>
            <p>{TENTANG_NILAI[2].body}</p>
            <a href={TENTANG_NILAI[2].href}>{TENTANG_NILAI[2].proof} <ArrowRight size={14} /></a>
          </div>
        </div>
      </div>
      <div className="tentang-chronicle">
        <h2 style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: 24, letterSpacing: "-0.03em" }}>Perjalanan — pelan tapi jalan</h2>
        <p style={{ fontSize: 13, color: "var(--pub-muted)", marginTop: 6 }}>Biar kebayang ini bukan baru kemarin sore.</p>
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
        <h2 style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: 24, letterSpacing: "-0.03em" }}>Cerita dari orangnya</h2>
        <p style={{ fontSize: 13, color: "var(--pub-muted)", marginTop: 6 }}>Bukan testimoni template — ini yang mereka rasain beneran.</p>
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
          <div className="tentang-stat tentang-stat--ink"><strong>48</strong><span>Kegiatan publik — bukan postingan</span></div>
          <div className="tentang-stat"><strong>1.2k</strong><span>Yang pernah ikut — bukan follower</span></div>
          <div className="tentang-stat tentang-stat--lime"><strong>36</strong><span>Tulisan yang kepake</span></div>
          <div className="tentang-stat"><strong>12</strong><span>Pengurus harian — bukan pajangan</span></div>
        </div>
        <div style={{ textAlign: "center", marginTop: 12 }}>
          <Link to="/kegiatan" style={{ fontSize: 13, fontWeight: 700, display: "inline-flex", gap: 6, alignItems: "center", borderBottom: "1px solid var(--pub-ink)", paddingBottom: 2 }}>Lihat kegiatan yang bikin angka ini <ArrowRight size={14} /></Link>
        </div>
      </div>
      <div className="pub-section" style={{ paddingBottom: 0 }}>
        <div className="pub-about">
          <div>
            <h3>Mau ikut atau mau bantu?</h3>
            <p>Dua-duanya kebuka. Nggak perlu daftar panjang — cukup tau jadwalnya, datang, kenalan.</p>
            <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
              <Link to="/kegiatan" className="btn-lime">Jadwal kegiatan</Link>
              <a href="mailto:halo@gencar.id" className="btn-ghost-dark"><MapPin size={14} /> Hubungi pengurus</a>
            </div>
          </div>
          <img src="https://picsum.photos/seed/gencar-cta/700/500" alt="Ajakan Gencar" loading="lazy" />
        </div>
      </div>
      <div className="pub-section" style={{ paddingTop: 16 }}>
        <div style={{ border: "1px solid var(--pub-line)", borderRadius: 16, padding: 16, background: "var(--pub-paper-2)", display: "grid", gap: 6 }}>
          <strong style={{ fontSize: 13 }}>Cara konten tayang — kurasi, bukan bebas posting</strong>
          <p style={{ fontSize: 13, color: "var(--pub-muted)", lineHeight: 1.6 }}>Member boleh ajukan draft kegiatan publik. Status awal <em>pending_review</em> — admin daerah yang cek dan approve jadi <em>published</em>. Saran dari publik via <code>POST /api/public/saran</code> butuh Turnstile captcha.</p>
        </div>
      </div>
    </div>
  );
}
