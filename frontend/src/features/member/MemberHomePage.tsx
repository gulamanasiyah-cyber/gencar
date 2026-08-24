import { CalendarDays, MapPin, Clock3, ArrowRight } from "lucide-react";
import { DEMO_KEGIATAN_MEMBER, type MemberIdentity, type MemberKegiatan } from "./types";
import type { MemberPageKey } from "./MemberShell";

export default function MemberHomePage({
  me,
  go,
}: {
  me: MemberIdentity;
  go: (k: MemberPageKey) => void;
}) {
  const next = DEMO_KEGIATAN_MEMBER.slice(0, 3);
  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div className="card" style={{ display: "flex", gap: 14, alignItems: "center" }}>
        <div className="avatar" style={{ width: 52, height: 52, fontSize: 16 }}>
          {me.nama
            .split(" ")
            .map((w) => w[0])
            .slice(0, 2)
            .join("")}
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontWeight: 800, lineHeight: 1.1 }}>{me.nama}</div>
          <div className="muted" style={{ fontSize: 12 }}>
            Base: {me.kelompok} · Desa {me.desa} · Domisili: {me.domisiliAnak}
          </div>
          <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
            <span className="pill pill-slate">{me.kategoriMudaMudi}</span>
            <span className="pill pill-emerald">{me.status}</span>
            <span className="pill pill-slate">{me.nomorUnik}</span>
          </div>
        </div>
      </div>

      <div className="card">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <div>
            <h3 style={{ fontSize: 15, fontWeight: 800 }}>Informasi Terkini</h3>
            <p className="muted" style={{ fontSize: 12 }}>Agenda terdekat & pengumuman untuk {me.desa}</p>
          </div>
          <span className="pill pill-slate">
            <CalendarDays size={12} /> {next.length} agenda
          </span>
        </div>

        <div style={{ display: "grid", gap: 10, marginTop: 14 }}>
          {next.map((k: MemberKegiatan) => (
            <div
              key={k.id}
              className="card"
              style={{ padding: 12, display: "grid", gap: 8, background: "#f8fafc" }}
            >
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <span className={`pill ${k.kategori === "sambung_rutin" ? "pill-emerald" : "pill-slate"}`}>
                  {k.kategori === "sambung_rutin" ? "Sambung Rutin" : k.kategori}
                </span>
                <span className="pill pill-slate">{k.tingkat}</span>
              </div>
              <div style={{ fontWeight: 800, lineHeight: 1.25 }}>{k.judul}</div>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", fontSize: 12, color: "#475569" }}>
                <span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
                  <Clock3 size={12} /> {k.tanggal} · {k.jam}
                </span>
                <span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
                  <MapPin size={12} /> {k.lokasi}
                </span>
              </div>
            </div>
          ))}
        </div>

        <button className="btn btn-primary" style={{ width: "100%", marginTop: 14 }} onClick={() => go("absen")}>
          Absen Hari Ini <ArrowRight size={14} />
        </button>
      </div>

      <div className="card">
        <h3 style={{ fontSize: 14, fontWeight: 800, marginBottom: 6 }}>Pengumuman</h3>
        <ul style={{ paddingLeft: 18, display: "grid", gap: 6, fontSize: 13, color: "#334155" }}>
          <li>Jaga adab & kebersihan base. Izin jika berhalangan.</li>
          <li>Update domisili di Profil jika pindah — biar absen sesuai radius.</li>
          <li>QR identitas di Profil dipakai untuk absen kegiatan.</li>
        </ul>
      </div>
    </div>
  );
}
