import { useRef, useMemo, useState, useEffect } from "react";
import { MapPin, Phone, GraduationCap, Home, Download, Heart, X, Check, Pencil, Volleyball, Plane, Palette, Music, ChefHat, Laptop, BookOpen, Gamepad2, Sparkles, Send, Clock3, AlertCircle } from "lucide-react";
import { QRCodeCanvas } from "qrcode.react";
import { toPng } from "html-to-image";
import type { MemberIdentity, MemberKehadiran, MemberKegiatan } from "./types";
import { computeAchievements, HOBBY_KEYS, HOBBY_META, HOBBY_DETAIL_PLACEHOLDER, parseHobi, parseHobiDetail, serializeHobi, serializeHobiDetail } from "./types";
import type { HobbyKey } from "./types";
import { MemberAvatar } from "./avatars";
import MemberTrophyCase from "./MemberTrophyCase";
import AvatarPicker from "./AvatarPicker";
import { defaultAvatarFor } from "./avatarCatalog";

type Props = {
  me: MemberIdentity;
  stat?: MemberKehadiran;
  kegiatan?: MemberKegiatan[];
  onUpdate?: (m: MemberIdentity) => void;
};

export default function MemberProfilePage({ me, stat, kegiatan, onUpdate }: Props) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [hobiOpen, setHobiOpen] = useState(false);
  const [avatarOpen, setAvatarOpen] = useState(false);
  const [ajukanOpen, setAjukanOpen] = useState(false);
  const [pendingReq, setPendingReq] = useState<{ section: string; status: string }[] | null>(null);
  const hobbySet = useMemo(() => parseHobi(me.hobi), [me.hobi]);
  const hobiDetail = useMemo(() => parseHobiDetail(me.hobiDetail), [me.hobiDetail]);

  const achievements = useMemo(
    () => computeAchievements({ kehadiran: stat ?? { total: 0, hadir: 0, izin: 0, alpha: 0, hadirRate: 0, tren: [] }, identity: me, kegiatan }),
    [stat, me, kegiatan],
  );

  useEffect(() => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;
      void fetch("/api/profile/requests", { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => (r.ok ? r.json() : []))
        .then((rows: any[]) => {
          if (Array.isArray(rows)) setPendingReq(rows.filter((r: any) => r.status === "pending").map((r: any) => ({ section: r.section, status: r.status })));
        })
        .catch(() => {});
    } catch {}
  }, []);

  async function downloadQrCard() {
    const el = cardRef.current;
    if (!el) return;
    const url = await toPng(el, { cacheBust: true, pixelRatio: 2 });
    const a = document.createElement("a");
    a.href = url;
    a.download = `qr-${me.nomorUnik ?? me.id}.png`;
    a.click();
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: 16, width: "100%", minWidth: 0 }}>
      <div className="card member-profile-hero">
        <div className="member-profile-hero-top">
          <button
            type="button"
            className="member-profile-avatarWrap"
            onClick={() => setAvatarOpen(true)}
            aria-label={`Ganti avatar — ${me.nama}`}
            style={{ border: "none", cursor: "pointer", padding: 2 }}
          >
            <MemberAvatar me={me} size={64} />
            <span className="member-profile-avatarEdit" aria-hidden>
              <Pencil size={11} />
            </span>
          </button>
          <div className="member-profile-hero-main">
            <div className="member-profile-name">{me.nama}</div>
            <div className="member-profile-byline">
              <span className="member-profile-nomor">{me.nomorUnik}</span>
              <span className="member-profile-dot" aria-hidden />
              <span className={`pill ${me.status === "aktif" ? "pill-emerald" : "pill-amber"} member-profile-status`}>{me.status}</span>
              <span className="member-profile-dot" aria-hidden />
              <span className="member-profile-genderLabel">{me.jenisKelamin ?? "—"}</span>
              <span className="member-profile-dot" aria-hidden />
              <span className="member-profile-cap">{me.kategoriMudaMudi}</span>
            </div>
            <div className="member-profile-pills">
              <span className="pill pill-slate"><Home size={10} /> {me.kelompok}</span>
              <span className="pill pill-slate"><MapPin size={10} /> Desa {me.desa}</span>
            </div>
          </div>
        </div>
        {!me.jenisKelamin && (
          <div className="member-profile-genderBar">
            <span className="member-profile-genderBarLabel">Lengkapi profil</span>
            <button
              type="button"
              className="member-profile-genderPick"
              onClick={() => (onUpdate as any)?.({ ...me, jenisKelamin: "cowok", avatarId: me.avatarId ?? defaultAvatarFor("cowok") })}
            >
              Cowok — Genta
            </button>
            <button
              type="button"
              className="member-profile-genderPick member-profile-genderPick--cewek"
              onClick={() => (onUpdate as any)?.({ ...me, jenisKelamin: "cewek", avatarId: me.avatarId ?? defaultAvatarFor("cewek") })}
            >
              Cewek — Cahya
            </button>
          </div>
        )}
        <div className="member-ajukanBar">
          {pendingReq && pendingReq.length > 0 && (
            <span className="pill pill-amber member-ajukanPending">
              <Clock3 size={10} /> Menunggu: {pendingReq.map((p) => p.section).join(", ")}
            </span>
          )}
          <button type="button" className="member-ajukanCta" onClick={() => setAjukanOpen(true)}>
            <Send size={12} /> Ajukan Perubahan Data
          </button>
        </div>
      </div>

      {/* Informasi Domisili & Wilayah */}
      <div className="card" style={{ padding: 18, display: "grid", gap: 14 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h3 style={{ fontSize: 14, fontWeight: 800, letterSpacing: "-0.02em", color: "var(--ink)", margin: 0 }}>Informasi Wilayah & Domisili</h3>
          <span className="pill pill-slate" style={{ fontSize: 10 }}>Terdaftar</span>
        </div>

        <div style={{ display: "grid", gap: 10 }}>
          {/* Row 1: Base Operasional */}
          <div style={{ display: "flex", gap: 12, alignItems: "center", padding: "10px 12px", background: "var(--bg)", borderRadius: 12, border: "1px solid var(--line)" }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: "#fff", border: "1px solid var(--line)", display: "grid", placeItems: "center", flexShrink: 0 }}>
              <Home size={16} color="var(--primary)" />
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "var(--muted)", letterSpacing: "0.04em" }}>Base Sambung</div>
              <div style={{ fontSize: 13, fontWeight: 800, color: "var(--ink)", lineHeight: 1.2 }}>Kelompok {me.kelompok} · Desa {me.desa}</div>
            </div>
          </div>

          {/* Row 2: Domisili Anak (Tinggal Sekarang) */}
          <div style={{ display: "flex", gap: 12, alignItems: "center", padding: "10px 12px", background: "var(--bg)", borderRadius: 12, border: "1px solid var(--line)" }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: "#fff", border: "1px solid var(--line)", display: "grid", placeItems: "center", flexShrink: 0 }}>
              <MapPin size={16} color="var(--primary)" />
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "var(--muted)", letterSpacing: "0.04em" }}>Alamat Tinggal (Anak)</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)", lineHeight: 1.3 }}>{me.domisiliAnak}</div>
            </div>
          </div>

          {/* Row 3: Detail Status & Asal (2 Col) */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div style={{ padding: "10px 12px", background: "#fff", borderRadius: 12, border: "1px solid var(--line)", display: "grid", gap: 3 }}>
              <span style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", color: "var(--muted)", letterSpacing: "0.04em" }}>Domisili Orang Tua</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: "var(--ink)" }}>{me.isOrtuSama ? "Sama dengan anak" : (me.domisiliOrtu || "Berbeda")}</span>
            </div>
            <div style={{ padding: "10px 12px", background: "#fff", borderRadius: 12, border: "1px solid var(--line)", display: "grid", gap: 3 }}>
              <span style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", color: "var(--muted)", letterSpacing: "0.04em" }}>Status Asal</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: "var(--ink)", textTransform: "capitalize" }}>{me.kategoriMudaMudi === "perantauan" ? `Perantauan (${me.asalDaerah || "Luar Daerah"})` : "Warga Pribumi"}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="card" style={{ display: "grid", gap: 8 }}>
        <h3 style={{ fontSize: 14, fontWeight: 800 }}>Kontak & Pendidikan</h3>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", fontSize: 13 }}>
          <span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
            <Phone size={14} /> {me.noTelp}
          </span>
          <span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
            <GraduationCap size={14} /> {me.pendidikan}
          </span>
        </div>
      </div>

      {/* Hobi & Badge — per-type badges */}
      <div className="card hobi-card">
        <div className="hobi-head">
          <h3 className="hobi-title"><Heart size={15} color="#db2777" /> Hobi & Badge</h3>
          <button type="button" className="hobi-edit-icon" onClick={() => setHobiOpen(true)} aria-label={hobbySet.size > 0 ? "Ubah hobi" : "Tambah hobi"}>
            <Pencil size={13} />
          </button>
        </div>

        {hobbySet.size === 0 ? (
          <div className="hobi-empty">
            <div style={{ fontSize: 22 }}>🎨</div>
            <div className="hobi-emptyText">Belum ada hobi — tambah hobi biar badge kamu muncul!</div>
            <button type="button" className="btn btn-primary btn-sm" onClick={() => setHobiOpen(true)}>Pilih hobi</button>
          </div>
        ) : (
          <div className="hobi-list">
            {[...hobbySet].map((k) => {
              const m = HOBBY_META[k];
              const detail = k === "lainnya" ? me.hobiCustom : hobiDetail[k];
              const Icon = ({ olahraga: Volleyball, traveling: Plane, seni: Palette, musik: Music, kuliner: ChefHat, teknologi: Laptop, literasi: BookOpen, gaming: Gamepad2, lainnya: Sparkles } as Record<string, typeof Volleyball>)[k] ?? Sparkles;
              const hasDetail = Boolean(detail);
              return (
                <div key={k} className="hobi-row">
                  <span className="hobi-icon" style={{ background: m.color }}><Icon size={15} color="#fff" /></span>
                  <div className="hobi-main">
                    <div className="hobi-label" style={{ color: m.color }}>{m.label}</div>
                    <div className={hasDetail ? "hobi-detail" : "hobi-placeholder"}>{detail || HOBBY_DETAIL_PLACEHOLDER[k]}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <div className="hobi-foot">
          <span className="hobi-progress" aria-hidden>
            {Array.from({ length: 8 }, (_, i) => (
              <i key={i} className={i < hobbySet.size ? "on" : ""} />
            ))}
          </span>
          <span className="hobi-count">{hobbySet.size} dari 8 tipe</span>
        </div>
      </div>

      {hobiOpen && (
        <HobiEditor
          initial={hobbySet}
          initialCustom={me.hobiCustom ?? ""}
          initialDetail={hobiDetail}
          onClose={() => setHobiOpen(false)}
          onSave={(keys, custom, detail) => {
            (onUpdate as any)?.({ ...me, hobi: keys.length ? serializeHobi(keys) : null, hobiCustom: custom || null, hobiDetail: serializeHobiDetail(detail) });
            setHobiOpen(false);
          }}
        />
      )}

      <div className="card member-qr-card" style={{ display: "grid", gap: 10, justifyItems: "center", textAlign: "center" }}>
        <h3 style={{ fontSize: 14, fontWeight: 800 }}>QR Identitas</h3>
        <div
          ref={cardRef}
          style={{
            padding: 16,
            borderRadius: 16,
            background: "#fff",
            border: "1px solid var(--line)",
            display: "grid",
            gap: 10,
            justifyItems: "center",
            width: "min(320px, 100%)",
          }}
        >
          <div style={{ fontWeight: 800, fontSize: 12, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--ink)" }}>GENCAR · {me.nomorUnik}</div>
          <QRCodeCanvas value={me.nomorUnik ?? me.id} size={180} level="M" />
          <div className="muted" style={{ fontSize: 11 }}>{me.nama} · {me.kelompok}</div>
        </div>
        <button type="button" className="btn btn-ghost" onClick={downloadQrCard}>
          <Download size={14} /> Download Kartu (PNG)
        </button>
        <p className="muted" style={{ fontSize: 11 }}>Dipakai untuk absen — frame ikut terdownload.</p>
      </div>

      <MemberTrophyCase achievements={achievements} />

      {avatarOpen && (
        <AvatarPicker
          me={me}
          achievements={achievements}
          onClose={() => setAvatarOpen(false)}
          onPick={(avatarId, jenisKelamin) => {
            (onUpdate as any)?.({ ...me, avatarId, jenisKelamin });
            setAvatarOpen(false);
          }}
        />
      )}
      {ajukanOpen && (
        <AjukanPerubahan
          me={me}
          onClose={() => setAjukanOpen(false)}
          onSuccess={(section: string) => {
            setPendingReq((prev) => [...(prev ?? []), { section, status: "pending" }]);
            setAjukanOpen(false);
          }}
        />
      )}
    </div>
  );
}

function AjukanPerubahan({
  me,
  onClose,
  onSuccess,
}: {
  me: MemberIdentity;
  onClose: () => void;
  onSuccess: (section: string) => void;
}) {
  const [section, setSection] = useState<"kontak" | "wilayah" | "identitas">("kontak");
  const [fields, setFields] = useState<Record<string, string>>({});
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const sections: { key: "kontak" | "wilayah" | "identitas"; label: string; desc: string }[] = [
    { key: "kontak", label: "Kontak & Pendidikan", desc: "No HP, pendidikan" },
    { key: "wilayah", label: "Wilayah & Domisili", desc: "Alamat, desa/kelompok, domisili" },
    { key: "identitas", label: "Identitas", desc: "Nama, tempat/tgl lahir, suku" },
  ];

  const fieldDefs: Record<string, { key: string; label: string; placeholder: string; max?: number }[]> = {
    kontak: [
      { key: "noTelp", label: "No. HP", placeholder: me.noTelp || "08...", max: 15 },
      { key: "pendidikan", label: "Pendidikan", placeholder: me.pendidikan || "SMA" },
    ],
    wilayah: [
      { key: "domisiliAnak", label: "Alamat Tinggal (Anak)", placeholder: me.domisiliAnak || "" },
      { key: "domisiliOrtu", label: "Alamat Ortu", placeholder: me.domisiliOrtu || "" },
      { key: "isDomisiliOrtuSama", label: "Ortu sama dengan anak? (ya/tidak)", placeholder: me.isOrtuSama ? "ya" : "tidak" },
      { key: "asalDaerah", label: "Asal Daerah (jika perantau)", placeholder: me.asalDaerah || "" },
      { key: "alamat", label: "Alamat lengkap", placeholder: (me.domisiliAnak as string) || "" },
    ],
    identitas: [
      { key: "nama", label: "Nama Lengkap", placeholder: me.nama },
      { key: "tempatLahir", label: "Tempat Lahir", placeholder: "—" },
      { key: "tanggalLahir", label: "Tanggal Lahir (YYYY-MM-DD)", placeholder: "—" },
      { key: "suku", label: "Suku", placeholder: "—" },
    ],
  };

  async function submit() {
    const payload: Record<string, string> = {};
    for (const [k, v] of Object.entries(fields)) {
      const t = String(v ?? "").trim();
      if (t) payload[k] = t;
    }
    if (Object.keys(payload).length === 0) {
      setErr("Isi minimal 1 field yang ingin diubah");
      return;
    }
    if (reason.trim().length < 10) {
      setErr("Alasan minimal 10 karakter");
      return;
    }
    setSaving(true);
    setErr(null);
    try {
      const token = localStorage.getItem("token") ?? "";
      const res = await fetch("/api/profile/request", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ section, payload, reason: reason.trim() }),
      });
      const data: any = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Gagal mengirim pengajuan");
      onSuccess(section);
    } catch (e: any) {
      setErr(e.message || "Gagal mengirim");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="trophy-modal-overlay hobi-editor-overlay" onClick={onClose} style={{ zIndex: 65 }}>
      <div className="trophy-modal hobi-editor-modal" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="trophy-modal-close" onClick={onClose}>
          <X size={18} />
        </button>
        <div style={{ fontSize: 15, fontWeight: 900, color: "var(--ink)", textAlign: "left", width: "100%" }}>Ajukan Perubahan Data</div>
        <div style={{ fontSize: 11, fontWeight: 600, color: "var(--muted)", textAlign: "left", width: "100%", marginTop: 2 }}>
          Pilih bagian yang ingin diubah — admin akan verifikasi
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginTop: 12 }}>
          {sections.map((s) => (
            <button
              key={s.key}
              type="button"
              onClick={() => {
                setSection(s.key);
                setFields({});
                setErr(null);
              }}
              style={{
                padding: "10px 8px",
                borderRadius: 12,
                border: `1.5px solid ${section === s.key ? "var(--primary)" : "var(--line)"}`,
                background: section === s.key ? "#fff1e6" : "#fff",
                color: section === s.key ? "var(--primary)" : "var(--ink)",
                fontWeight: 800,
                fontSize: 12,
                cursor: "pointer",
              }}
            >
              <div>{s.label}</div>
              <div style={{ fontSize: 10, fontWeight: 600, color: "var(--muted)" }}>{s.desc}</div>
            </button>
          ))}
        </div>

        <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
          {(fieldDefs[section] ?? []).map((f) => (
            <label key={f.key} style={{ display: "grid", gap: 4, textAlign: "left" }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.04em" }}>{f.label}</span>
              <input
                value={fields[f.key] ?? ""}
                onChange={(e) => setFields((prev) => ({ ...prev, [f.key]: e.target.value }))}
                placeholder={f.placeholder}
                maxLength={f.max}
                style={{ width: "100%", padding: "9px 11px", borderRadius: 10, border: "1.5px solid var(--line)", fontSize: 13 }}
              />
            </label>
          ))}
        </div>

        <label style={{ display: "grid", gap: 4, marginTop: 10, textAlign: "left" }}>
          <span style={{ fontSize: 11, fontWeight: 800, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>Alasan perubahan *</span>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Contoh: Pindah kos / salah input admin..."
            rows={3}
            maxLength={500}
            style={{ width: "100%", padding: "9px 11px", borderRadius: 10, border: "1.5px solid var(--line)", fontSize: 13, resize: "vertical" }}
          />
          <span style={{ fontSize: 10, color: "var(--muted)" }}>{reason.length}/500</span>
        </label>

        {err && (
          <div style={{ display: "flex", gap: 6, alignItems: "center", color: "#b91c1c", fontSize: 11, fontWeight: 700, background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: "8px 10px" }}>
            <AlertCircle size={13} /> {err}
          </div>
        )}

        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <button type="button" className="btn btn-ghost" onClick={onClose} style={{ flex: 1 }} disabled={saving}>
            Batal
          </button>
          <button type="button" className="btn btn-primary" onClick={submit} disabled={saving} style={{ flex: 1, fontWeight: 800 }}>
            {saving ? "Mengirim..." : "Kirim Pengajuan"}
          </button>
        </div>
      </div>
    </div>
  );
}

function HobiEditor({ initial, initialCustom, initialDetail, onClose, onSave }: { initial: Set<HobbyKey>; initialCustom: string; initialDetail: Record<string, string>; onClose: () => void; onSave: (keys: HobbyKey[], custom: string, detail: Record<string, string>) => void }) {
  const [sel, setSel] = useState<Set<HobbyKey>>(new Set(initial));
  const [custom, setCustom] = useState(initialCustom);
  const [detail, setDetail] = useState<Record<string, string>>(initialDetail);

  function toggle(k: HobbyKey) {
    setSel((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else {
        if (next.size >= 8) return next;
        next.add(k);
      }
      return next;
    });
  }

  return (
    <div className="trophy-modal-overlay hobi-editor-overlay" onClick={onClose} style={{ zIndex: 60 }}>
      <div className="trophy-modal hobi-editor-modal" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="trophy-modal-close" onClick={onClose}><X size={18} /></button>
        <div style={{ fontSize: 15, fontWeight: 900, color: "var(--ink)" }}>Pilih Hobi</div>
        <div style={{ fontSize: 11, fontWeight: 600, color: "var(--muted)" }}>Pilih sampai 8 tipe — tiap tipe dapat badge warna-warni di profil.</div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 12 }}>
          {HOBBY_KEYS.map((k) => {
            const m = HOBBY_META[k];
            const active = sel.has(k);
            const Icon = ({ olahraga: Volleyball, traveling: Plane, seni: Palette, musik: Music, kuliner: ChefHat, teknologi: Laptop, literasi: BookOpen, gaming: Gamepad2, lainnya: Sparkles } as Record<string, typeof Volleyball>)[k] ?? Sparkles;
            return (
              <button
                key={k}
                type="button"
                onClick={() => toggle(k)}
                style={{
                  display: "flex", alignItems: "center", gap: 10, padding: "11px 12px", borderRadius: 14,
                  border: `1.5px solid ${active ? m.color : "var(--line)"}`,
                  background: active ? m.bg : "#fff",
                  color: active ? m.color : "var(--ink)",
                  fontWeight: 800, fontSize: 13, textAlign: "left", cursor: "pointer",
                  boxShadow: active ? `0 2px 10px ${m.color}22` : "none",
                  position: "relative",
                }}
              >
                <span style={{ width: 28, height: 28, borderRadius: 9, background: active ? m.color : `${m.color}14`, display: "grid", placeItems: "center", flexShrink: 0, color: active ? "#fff" : m.color }}>
                  {active ? <Check size={14} /> : <Icon size={14} />}
                </span>
                <span style={{ flex: 1 }}>{m.label}</span>
              </button>
            );
          })}
        </div>

        {sel.has("lainnya" as HobbyKey) && (
          <div style={{ marginTop: 10 }}>
            <label style={{ fontSize: 11, fontWeight: 800, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>Hobi lainnya</label>
            <input value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="Contoh: Hadroh, Kaligrafi..." maxLength={40} style={{ width: "100%", marginTop: 6, padding: "10px 12px", borderRadius: 10, border: "1.5px solid var(--line)", fontSize: 13 }} />
          </div>
        )}

        {[...sel].filter((k) => k !== "lainnya").length > 0 && (
          <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>Detail khusus tiap hobi</div>
            {[...sel].filter((k) => k !== "lainnya").map((k) => {
              const m = HOBBY_META[k];
              return (
                <label key={k} style={{ display: "grid", gap: 4 }}>
                  <span style={{ fontSize: 11, fontWeight: 800, color: m.color }}>{m.label}</span>
                  <input
                    value={detail[k] ?? ""}
                    onChange={(e) => setDetail((prev) => ({ ...prev, [k]: e.target.value }))}
                    placeholder={HOBBY_DETAIL_PLACEHOLDER[k]}
                    maxLength={80}
                    style={{ width: "100%", padding: "9px 11px", borderRadius: 10, border: "1.5px solid var(--line)", fontSize: 13 }}
                  />
                </label>
              );
            })}
          </div>
        )}

        <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
          <button type="button" className="btn btn-ghost" onClick={onClose} style={{ flex: 1 }}>Batal</button>
          <button type="button" className="btn btn-primary" onClick={() => { const filtered: Record<string,string> = {}; for (const k of sel) if (detail[k]?.trim()) filtered[k] = detail[k].trim(); if (custom.trim() && sel.has("lainnya" as HobbyKey)) filtered["lainnya_custom"] = custom.trim(); onSave([...sel], custom, filtered); }} style={{ flex: 1, fontWeight: 800 }}>Simpan ({sel.size})</button>
        </div>
      </div>
    </div>
  );
}
