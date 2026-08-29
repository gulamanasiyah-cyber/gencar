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
    <div className="trophy-modal-overlay avatar-picker-overlay" onClick={onClose} style={{ zIndex: 70 }}>
      <div className="trophy-modal avatar-picker-modal" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="trophy-modal-close" onClick={onClose}><X size={18} /></button>
        <div className="avatar-picker-title">Pilih Avatar</div>
        <div className="avatar-picker-sub">
          Cowok hanya avatar Genta · Cewek hanya avatar Cahya · Avatar terkunci terbuka lewat trophy
        </div>

        {/* Gender toggle (only when not locked) */}
        {!genderLocked ? (
          <div className="avatar-picker-genderRow">
            <button type="button" className={`avatar-picker-genderBtn ${displayGender === "cowok" ? "on" : ""}`} onClick={() => setGender("cowok")}>
              Cowok — Genta
            </button>
            <button type="button" className={`avatar-picker-genderBtn avatar-picker-genderBtn--cewek ${displayGender === "cewek" ? "on" : ""}`} onClick={() => setGender("cewek")}>
              Cewek — Cahya
            </button>
          </div>
        ) : (
          <div className="avatar-picker-genderLocked">
            <span className="pill pill-slate avatar-picker-genderPill">
              {displayGender === "cowok" ? "Genta — Cowok" : "Cahya — Cewek"}
            </span>
            <span className="avatar-picker-genderHint">Terkunci gender — ubah di profil jika salah</span>
          </div>
        )}

        <div className="avatar-picker-grid">
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
                className={`avatar-picker-cell ${unlocked ? "unlocked" : "locked"} ${isActive ? "active" : ""}`}
                title={unlocked ? a.label : `Terkunci: ${a.needLabel}`}
              >
                <span className="avatar-picker-thumbWrap">
                  <span className={`avatar-picker-thumb ${isActive ? "active" : ""}`}>
                    <img
                      src={`/avatars/${a.file}`}
                      alt={a.label}
                      width={64}
                      height={64}
                      className={unlocked ? "" : "locked"}
                      loading="lazy"
                    />
                    {!unlocked && (
                      <span className="avatar-picker-lockOverlay">
                        <span className="avatar-picker-lockBadge"><Lock size={12} color="#94a3b8" /></span>
                      </span>
                    )}
                  </span>
                  {isActive && unlocked && (
                    <span className="avatar-picker-check"><Check size={10} color="#fff" /></span>
                  )}
                </span>
                <span className={`avatar-picker-label ${unlocked ? "" : "locked"}`}>{a.label}</span>
                {!unlocked && (
                  <span className="avatar-picker-need">Butuh: {a.needLabel}</span>
                )}
                {!unlocked && prog && prog.target > 1 && (
                  <span className="avatar-picker-progress">{prog.current}/{prog.target}</span>
                )}
              </button>
            );
          })}
        </div>

        <div className="avatar-picker-foot">
          {list.filter((a) => isAvatarUnlocked(a.id, achievements)).length} / {list.length} terbuka untuk {displayGender === "cowok" ? "Genta" : "Cahya"}
        </div>
      </div>
    </div>
  );
}
