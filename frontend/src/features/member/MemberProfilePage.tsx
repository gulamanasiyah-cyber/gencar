import { useRef, useMemo } from "react";
import { MapPin, Phone, GraduationCap, Home, Download } from "lucide-react";
import { QRCodeCanvas } from "qrcode.react";
import { toPng } from "html-to-image";
import type { MemberIdentity, MemberKehadiran, MemberKegiatan } from "./types";
import { computeAchievements } from "./types";
import { MemberAvatar } from "./avatars";
import MemberTrophyCase from "./MemberTrophyCase";

type Props = {
  me: MemberIdentity;
  stat?: MemberKehadiran;
  kegiatan?: MemberKegiatan[];
  onUpdate?: (m: MemberIdentity) => void;
};

export default function MemberProfilePage({ me, stat, kegiatan }: Props) {
  const cardRef = useRef<HTMLDivElement>(null);

  const achievements = useMemo(
    () => computeAchievements({ kehadiran: stat ?? { total: 0, hadir: 0, izin: 0, alpha: 0, hadirRate: 0, tren: [] }, identity: me, kegiatan }),
    [stat, me, kegiatan],
  );

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
          <span className="member-profile-avatarWrap">
            <MemberAvatar me={me} size={60} />
          </span>
          <div className="member-profile-hero-main">
            <div className="member-profile-name">{me.nama}</div>
            <div className="member-profile-metaLine">
              <span className="member-profile-nomor">{me.nomorUnik}</span>
              <span className={`pill ${me.status === "aktif" ? "pill-emerald" : "pill-amber"} member-profile-status`}>{me.status}</span>
            </div>
          </div>
        </div>
        <div className="member-profile-divider" aria-hidden />
        <div className="member-profile-pills">
          <span className="pill pill-slate"><Home size={12} /> {me.kelompok}</span>
          <span className="pill pill-slate"><MapPin size={12} /> Desa {me.desa}</span>
          <span className="pill pill-slate member-profile-cap">{me.kategoriMudaMudi}</span>
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
    </div>
  );
}
