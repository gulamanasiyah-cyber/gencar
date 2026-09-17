import { Briefcase, Sparkles, ShieldCheck } from "lucide-react";
import type { MemberIdentity } from "./types";
import MemberLowonganPanel from "./MemberLowonganPanel";

export default function MemberPekerjaanPage({ me }: { me: MemberIdentity }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: 16, width: "100%", minWidth: 0 }}>
      {/* Header Banner */}
      <div
        className="card"
        style={{
          padding: 0,
          overflow: "hidden",
          borderRadius: 20,
          background: "linear-gradient(135deg, #1e1b4b 0%, #312e81 60%, #4338ca 100%)",
          color: "#fff",
          boxShadow: "0 8px 30px rgba(49, 46, 129, 0.22)",
        }}
      >
        <div style={{ padding: "20px 20px 18px", position: "relative" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
            <div style={{ display: "grid", gap: 6, minWidth: 0 }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,0.15)", padding: "3px 10px", borderRadius: 999, fontSize: 11, fontWeight: 700, width: "fit-content", backdropFilter: "blur(8px)" }}>
                <Sparkles size={12} color="#fde047" />
                <span>Peluang & Sinergi Generus</span>
              </div>
              <h2 style={{ fontSize: 20, fontWeight: 900, letterSpacing: "-0.03em", margin: 0, lineHeight: 1.2 }}>
                Pekerjaan & Opportunity
              </h2>
              <p style={{ fontSize: 12, margin: 0, opacity: 0.85, lineHeight: 1.4, maxWidth: 520 }}>
                Ruang berbagi info lowongan kerja, peluang usaha, dan kerja sampingan antar sesama warga muda-mudi Cengkareng.
              </p>
            </div>

            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 14,
                background: "rgba(255,255,255,0.12)",
                display: "grid",
                placeItems: "center",
                flexShrink: 0,
                border: "1px solid rgba(255,255,255,0.2)",
              }}
            >
              <Briefcase size={22} color="#fff" />
            </div>
          </div>

          <div
            style={{
              marginTop: 14,
              paddingTop: 12,
              borderTop: "1px solid rgba(255,255,255,0.12)",
              display: "flex",
              alignItems: "center",
              gap: 12,
              fontSize: 11,
              opacity: 0.8,
              flexWrap: "wrap",
            }}
          >
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
              <ShieldCheck size={13} color="#a7f3d0" /> Postingan Langsung Tayang
            </span>
            <span>•</span>
            <span>Wilayah: {me.desa ? `${me.desa}, Cengkareng` : "Daerah Cengkareng"}</span>
          </div>
        </div>
      </div>

      {/* Main Lowongan Panel */}
      <MemberLowonganPanel />
    </div>
  );
}
