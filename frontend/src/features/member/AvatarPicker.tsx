import { useMemo, useState } from "react";
import { Lock, X, Check } from "lucide-react";
import type { MemberIdentity } from "./types";
import type { AchievementState } from "./types";
import { AVATARS, isAvatarUnlocked, avatarUnlockProgress, resolveGender, isAvatarGenderMismatch, type AvatarGender } from "./avatarCatalog";

type Props = {
  me: MemberIdentity;
  achievements: AchievementState[];
  onClose: () => void;
  onPick: (avatarId: string, jenisKelamin: AvatarGender) => void;
};

export default function AvatarPicker({ me, achievements, onClose, onPick }: Props) {
  const initialGender: AvatarGender | null = (me.jenisKelamin as AvatarGender | null) ?? resolveGender(me) ?? null;
  const [gender, setGender] = useState<AvatarGender>("cowok");
  // If user hasn't set gender yet, allow toggle; otherwise lock to theirs (can still change via profile setting separately)
  const genderLocked = Boolean(initialGender);
  const displayGender: AvatarGender = genderLocked ? (initialGender as AvatarGender) : gender;

  const list = useMemo(() => AVATARS.filter((a) => a.gender === displayGender), [displayGender]);

  const currentId = me.avatarId ?? (displayGender === "cewek" ? "caya-base" : "genta-base");

  return (
    <div className="trophy-modal-overlay" onClick={onClose} style={{ zIndex: 70 }}>
      <div className="trophy-modal" onClick={(e) => e.stopPropagation()} style={{ width: "min(520px, 96vw)", maxHeight: "88vh", overflow: "auto", padding: "22px 18px 18px" }}>
        <button type="button" className="trophy-modal-close" onClick={onClose}><X size={18} /></button>
        <div style={{ fontSize: 16, fontWeight: 900, color: "var(--ink)", textAlign: "left", width: "100%" }}>Pilih Avatar</div>
        <div style={{ fontSize: 11, fontWeight: 600, color: "var(--muted)", textAlign: "left", width: "100%", marginTop: 2 }}>
          Cowok hanya avatar Genta · Cewek hanya avatar Cahya · Avatar terkunci terbuka lewat trophy
        </div>

        {/* Gender toggle (only when not locked) */}
        {!genderLocked ? (
          <div style={{ display: "flex", gap: 8, marginTop: 12, width: "100%" }}>
            <button
              type="button"
              onClick={() => setGender("cowok")}
              style={{
                flex: 1, padding: "10px 12px", borderRadius: 12, fontWeight: 800, fontSize: 13,
                border: `1.5px solid ${displayGender === "cowok" ? "var(--ink)" : "var(--line)"}`,
                background: displayGender === "cowok" ? "var(--ink)" : "#fff",
                color: displayGender === "cowok" ? "#fff" : "var(--ink)", cursor: "pointer",
              }}
            >
              Cowok — Genta
            </button>
            <button
              type="button"
              onClick={() => setGender("cewek")}
              style={{
                flex: 1, padding: "10px 12px", borderRadius: 12, fontWeight: 800, fontSize: 13,
                border: `1.5px solid ${displayGender === "cewek" ? "#db2777" : "var(--line)"}`,
                background: displayGender === "cewek" ? "#db2777" : "#fff",
                color: displayGender === "cewek" ? "#fff" : "var(--ink)", cursor: "pointer",
              }}
            >
              Cewek — Cahya
            </button>
          </div>
        ) : (
          <div style={{ marginTop: 10, width: "100%", display: "flex", gap: 6, alignItems: "center" }}>
            <span className="pill pill-slate" style={{ fontSize: 11, fontWeight: 800 }}>
              {displayGender === "cowok" ? "Genta — Cowok" : "Cahya — Cewek"}
            </span>
            <span style={{ fontSize: 11, color: "var(--muted)", fontWeight: 600 }}>Terkunci gender — ubah di profil jika salah</span>
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginTop: 14, width: "100%" }}>
          {list.map((a) => {
            const unlocked = isAvatarUnlocked(a.id, achievements);
            const prog = !unlocked ? avatarUnlockProgress(a.id, achievements) : null;
            const isActive = currentId === a.id;
            return (
              <button
                key={a.id}
                type="button"
                disabled={!unlocked}
                onClick={() => {
                  if (!unlocked) return;
                  if (isAvatarGenderMismatch(a.id, displayGender)) return;
                  onPick(a.id, displayGender);
                }}
                style={{
                  position: "relative", display: "grid", gap: 6, justifyItems: "center",
                  padding: "10px 6px 8px", borderRadius: 14,
                  border: `1.5px solid ${isActive ? "var(--primary)" : unlocked ? "var(--line)" : "#e2e8f0"}`,
                  background: isActive ? "#f0fdf4" : unlocked ? "#fff" : "#f8fafc",
                  cursor: unlocked ? "pointer" : "not-allowed",
                  opacity: unlocked ? 1 : 0.92,
                  boxShadow: isActive ? "0 2px 12px rgba(34,197,94,0.18)" : "none",
                }}
                title={unlocked ? a.label : `Terkunci: ${a.needLabel}`}
              >
                <span style={{ position: "relative", width: 64, height: 64, borderRadius: 999, overflow: "hidden", border: `2px solid ${isActive ? "var(--primary)" : "#fff"}`, boxShadow: "0 2px 10px rgba(0,0,0,0.08)", display: "block", background: "#fff7ed" }}>
                  <img
                    src={`/avatars/${a.file}`}
                    alt={a.label}
                    width={64}
                    height={64}
                    style={{ width: 64, height: 64, objectFit: "cover", display: "block", filter: unlocked ? "none" : "grayscale(1) opacity(0.55)" }}
                    loading="lazy"
                  />
                  {!unlocked && (
                    <span style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", background: "rgba(255,255,255,0.42)" }}>
                      <span style={{ background: "#fff", borderRadius: 999, padding: 4, border: "1px solid #e2e8f0", lineHeight: 0 }}><Lock size={12} color="#94a3b8" /></span>
                    </span>
                  )}
                  {isActive && unlocked && (
                    <span style={{ position: "absolute", top: 2, right: 2, background: "var(--primary)", borderRadius: 999, padding: 3, lineHeight: 0, border: "2px solid #fff" }}><Check size={10} color="#fff" /></span>
                  )}
                </span>
                <span style={{ fontSize: 10, fontWeight: 800, color: unlocked ? "var(--ink)" : "#94a3b8", textAlign: "center", lineHeight: 1.15, minHeight: 14 }}>{a.label}</span>
                {!unlocked && (
                  <span style={{ fontSize: 9, fontWeight: 700, color: "#94a3b8", textAlign: "center", lineHeight: 1.2 }}>Butuh: {a.needLabel}</span>
                )}
                {!unlocked && prog && prog.target > 1 && (
                  <span style={{ fontSize: 9, fontWeight: 700, color: "#94a3b8" }}>{prog.current}/{prog.target}</span>
                )}
              </button>
            );
          })}
        </div>

        <div style={{ marginTop: 12, fontSize: 11, fontWeight: 600, color: "var(--muted)", textAlign: "center", width: "100%" }}>
          {list.filter((a) => isAvatarUnlocked(a.id, achievements)).length} / {list.length} terbuka untuk {displayGender === "cowok" ? "Genta" : "Cahya"}
        </div>
      </div>
    </div>
  );
}
