import { useMemo, useState, useRef } from "react";
import { Lock, X, Check, Camera, Loader2 } from "lucide-react";
import type { MemberIdentity } from "./types";
import type { AchievementState } from "./types";
import { AVATARS, isAvatarUnlocked, avatarUnlockProgress, resolveGender, isAvatarGenderMismatch, type AvatarGender } from "./avatarCatalog";
import { uploadImageDirect } from "../../lib/storage";

type Props = {
  me: MemberIdentity;
  achievements: AchievementState[];
  onClose: () => void;
  onPick: (avatarId: string | null, jenisKelamin: AvatarGender, customFoto?: string | null) => void;
};

export default function AvatarPicker({ me, achievements, onClose, onPick }: Props) {
  const initialGender: AvatarGender | null = (me.jenisKelamin as AvatarGender | null) ?? resolveGender(me) ?? null;
  const [gender, setGender] = useState<AvatarGender>("cowok");
  const genderLocked = Boolean(initialGender);
  const displayGender: AvatarGender = genderLocked ? (initialGender as AvatarGender) : gender;

  const [uploadStatus, setUploadStatus] = useState<"idle" | "uploading" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const list = useMemo(() => AVATARS.filter((a) => a.gender === displayGender), [displayGender]);

  const currentId = me.avatarId ?? (displayGender === "cewek" ? "caya-base" : "genta-base");
  const hasCustomPhoto = Boolean(me.foto && !me.avatarId);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      alert("Hanya file gambar yang diperbolehkan.");
      return;
    }

    setUploadStatus("uploading");
    setErrorMessage(null);
    try {
      const result = await uploadImageDirect(file);
      await onPick(null, displayGender, result.viewUrl);
      setUploadStatus("success");
      setTimeout(() => {
        setUploadStatus("idle");
        onClose();
      }, 1200);
    } catch (err: any) {
      // Fallback base64
      const reader = new FileReader();
      reader.onload = async (ev) => {
        if (ev.target?.result) {
          try {
            await onPick(null, displayGender, ev.target.result as string);
            setUploadStatus("success");
            setTimeout(() => {
              setUploadStatus("idle");
              onClose();
            }, 1200);
          } catch (e2: any) {
            setUploadStatus("error");
            setErrorMessage(e2.message || "Gagal menyimpan foto");
          }
        }
      };
      reader.onerror = () => {
        setUploadStatus("error");
        setErrorMessage("Gagal membaca file gambar");
      };
      reader.readAsDataURL(file);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="trophy-modal-overlay avatar-picker-overlay" onClick={onClose} style={{ zIndex: 70 }}>
      <div className="trophy-modal avatar-picker-modal" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="trophy-modal-close" onClick={onClose}><X size={18} /></button>
        <div className="avatar-picker-title">Pilih Avatar</div>
        <div className="avatar-picker-sub">
          Cowok hanya avatar Genta · Cewek hanya avatar Cahya · Avatar terbuka lewat trophy
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
            const isActive = !hasCustomPhoto && currentId === a.id;
            return (
              <button
                key={a.id}
                type="button"
                disabled={!unlocked}
                onClick={() => {
                  if (!unlocked) return;
                  if (isAvatarGenderMismatch(a.id, displayGender)) return;
                  onPick(a.id, displayGender, null);
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

          {/* OPSI UPLOAD / AMBIL FOTO SENDIRI */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={handleFileUpload}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className={`avatar-picker-cell unlocked ${hasCustomPhoto ? "active" : ""}`}
            style={{
              borderStyle: "dashed",
              borderColor: hasCustomPhoto ? "var(--primary)" : "var(--line)",
              background: hasCustomPhoto ? "var(--primary-subtle, #fff1e6)" : "#fafafa",
            }}
            title="Upload atau ambil foto dari kamera"
          >
            <span className="avatar-picker-thumbWrap">
              <span className={`avatar-picker-thumb ${hasCustomPhoto ? "active" : ""}`} style={{ background: "#fff", display: "grid", placeItems: "center" }}>
                {uploadStatus === "uploading" ? (
                  <Loader2 size={24} className="animate-spin" color="var(--primary)" />
                ) : hasCustomPhoto && me.foto ? (
                  <img src={me.foto} alt="Foto Profil" width={64} height={64} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, color: "var(--muted)" }}>
                    <Camera size={22} />
                  </div>
                )}
              </span>
              {hasCustomPhoto && (
                <span className="avatar-picker-check"><Check size={10} color="#fff" /></span>
              )}
            </span>
            <span className="avatar-picker-label" style={{ fontWeight: 800, color: "var(--ink)" }}>
              {uploadStatus === "uploading" ? "Mengupload…" : hasCustomPhoto ? "Foto Sendiri" : "+ Upload Foto"}
            </span>
            <span className="avatar-picker-need" style={{ color: "var(--primary)" }}>Kamera / Galeri</span>
          </button>
        </div>

        <div className="avatar-picker-foot">
          {list.filter((a) => isAvatarUnlocked(a.id, achievements)).length} / {list.length} avatar terbuka untuk {displayGender === "cowok" ? "Genta" : "Cahya"}
        </div>

        {/* MODAL STATUS / LOADING OVERLAY */}
        {uploadStatus === "uploading" && (
          <div style={{ position: "absolute", inset: 0, background: "rgba(255,255,255,0.92)", backdropFilter: "blur(4px)", borderRadius: 24, zIndex: 80, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12 }}>
            <Loader2 size={36} className="animate-spin" color="var(--primary)" />
            <div style={{ fontWeight: 800, fontSize: 15, color: "var(--ink)" }}>Mengupload Foto ke R2…</div>
            <div className="muted" style={{ fontSize: 12 }}>Mohon tunggu sebentar</div>
          </div>
        )}

        {uploadStatus === "success" && (
          <div style={{ position: "absolute", inset: 0, background: "rgba(255,255,255,0.95)", backdropFilter: "blur(4px)", borderRadius: 24, zIndex: 80, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10 }}>
            <div style={{ width: 44, height: 44, borderRadius: "50%", background: "#dcfce7", display: "grid", placeItems: "center", color: "#16a34a" }}>
              <Check size={26} />
            </div>
            <div style={{ fontWeight: 800, fontSize: 15, color: "#16a34a" }}>Foto Berhasil Diupload & Disimpan!</div>
          </div>
        )}

        {uploadStatus === "error" && (
          <div style={{ position: "absolute", inset: 0, background: "rgba(255,255,255,0.95)", backdropFilter: "blur(4px)", borderRadius: 24, zIndex: 80, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, padding: 24, textAlign: "center" }}>
            <div style={{ width: 44, height: 44, borderRadius: "50%", background: "#fee2e2", display: "grid", placeItems: "center", color: "#dc2626" }}>
              <X size={26} />
            </div>
            <div style={{ fontWeight: 800, fontSize: 15, color: "#dc2626" }}>Gagal Mengupload Foto</div>
            <div className="muted" style={{ fontSize: 12 }}>{errorMessage || "Terjadi kesalahan saat upload."}</div>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setUploadStatus("idle")} style={{ marginTop: 6 }}>
              Tutup & Coba Lagi
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
