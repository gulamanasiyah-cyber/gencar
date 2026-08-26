import { useMemo, useState } from "react";
import { Lock, Trophy, X } from "lucide-react";
import type { AchievementState, AchievementCategory, AchievementRarity } from "./types";
import { RARITY_META, CATEGORY_META } from "./types";

type Props = { achievements: AchievementState[] };

function trophySvgUrl(id: string): string {
  return `/achievements/${id}.svg`;
}

function trophyStyle(color: string, unlocked: boolean): React.CSSProperties {
  if (!unlocked) return { filter: "grayscale(1) opacity(0.45)" };
  const c = color.replace("#", "");
  const r = parseInt(c.substring(0, 2), 16) / 255;
  const g = parseInt(c.substring(2, 4), 16) / 255;
  const b = parseInt(c.substring(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h = Math.round(h * 60);
    if (h < 0) h += 360;
  }
  const s = max === 0 ? 0 : Math.round((d / max) * 100);
  const l = Math.round(max * 100);
  return { filter: `brightness(0) invert(${l}%) sepia(${s}%) saturate(${s * 3}%) hue-rotate(${h}deg)` };
}

const rarityOrder: AchievementRarity[] = ["common", "uncommon", "rare", "epic", "legendary", "mythic"];
const catOrder: AchievementCategory[] = ["kehadiran", "streak", "ketepatan", "kegiatan", "profil"];

export default function MemberTrophyCase({ achievements }: Props) {
  const [cat, setCat] = useState<AchievementCategory | "all">("all");
  const [detail, setDetail] = useState<AchievementState | null>(null);

  const unlockedCount = useMemo(() => achievements.filter((a) => a.unlocked).length, [achievements]);
  const totalCount = achievements.length;

  const filtered = useMemo(() => {
    const list = cat === "all" ? achievements : achievements.filter((a) => a.category === cat);
    // Sort: unlocked first, then by rarity (mythic→legendary→...), then by id
    return [...list].sort((a, b) => {
      if (a.unlocked !== b.unlocked) return a.unlocked ? -1 : 1;
      const ri = rarityOrder.indexOf(a.rarity) - rarityOrder.indexOf(b.rarity);
      if (ri !== 0) return -ri; // higher rarity first
      return a.id.localeCompare(b.id);
    });
  }, [achievements, cat]);

  return (
    <div className="card trophy-case" style={{ display: "grid", gap: 14 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 11, background: "linear-gradient(135deg, #f59e0b, #d97706)", display: "grid", placeItems: "center", flexShrink: 0, boxShadow: "0 3px 12px #f59e0b33" }}>
            <Trophy size={18} color="#fff" />
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 800, color: "var(--ink)", lineHeight: 1.15 }}>Pencapaian</div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)" }}>{unlockedCount} / {totalCount} terbuka</div>
          </div>
        </div>
        {/* Progress */}
        <div style={{ display: "grid", gap: 3, minWidth: 80, textAlign: "right" }}>
          <div style={{ fontSize: 10, fontWeight: 800, color: "var(--primary)" }}>{Math.round((unlockedCount / totalCount) * 100)}%</div>
          <div style={{ height: 6, borderRadius: 999, background: "#fff7ed", border: "1px solid #f0dfc8", overflow: "hidden" }}>
            <div style={{ width: `${(unlockedCount / totalCount) * 100}%`, height: "100%", background: "linear-gradient(90deg, #d03804, #f59e0b)", borderRadius: 999, transition: "width 520ms cubic-bezier(0.16,1,0.3,1)" }} />
          </div>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="trophy-cats" style={{ display: "flex", gap: 6, overflowX: "auto", scrollbarWidth: "none", paddingBottom: 1 }}>
        <button type="button" className={`trophy-cat-btn ${cat === "all" ? "active" : ""}`} onClick={() => setCat("all")}>
          Semua
        </button>
        {catOrder.map((c) => {
          const m = CATEGORY_META[c];
          const count = achievements.filter((a) => a.category === c && a.unlocked).length;
          return (
            <button key={c} type="button" className={`trophy-cat-btn ${cat === c ? "active" : ""}`} onClick={() => setCat(c)} style={cat === c ? { borderColor: m.color, color: m.color } : undefined}>
              <span>{m.label}</span>
              {count > 0 && <span className="trophy-cat-count">{count}</span>}
            </button>
          );
        })}
      </div>

      {/* Trophy Grid */}
      <div className="trophy-grid">
        {filtered.map((a) => {
          const rm = RARITY_META[a.rarity];
          return (
            <button key={a.id} type="button" className={`trophy-item ${a.unlocked ? "unlocked" : "locked"}`} style={a.unlocked ? { borderColor: rm.border, background: rm.bg, boxShadow: `0 2px 10px ${rm.glow}` } : undefined} onClick={() => setDetail(a)}>
              <div className="trophy-icon-wrap" style={a.unlocked ? { borderColor: rm.border, background: "#fff" } : { borderColor: "#e2e8f0", background: "#f8fafc" }}>
                <img src={trophySvgUrl(a.id)} alt="" width={22} height={22} loading="eager" style={{ display: "block", ...trophyStyle(rm.color, a.unlocked) }} />
                {!a.unlocked && <Lock size={10} color="#94a3b8" style={{ position: "absolute", bottom: -1, right: -1, background: "#fff", borderRadius: 999, padding: 2 }} />}
              </div>
              <span className="trophy-name" style={a.unlocked ? { color: rm.color } : { color: "#94a3b8" }}>{a.name}</span>
              {!a.unlocked && a.target > 1 && (
                <div className="trophy-progress-wrap">
                  <div style={{ height: 3, borderRadius: 999, background: "#e2e8f0", overflow: "hidden" }}>
                    <div style={{ width: `${a.progress * 100}%`, height: "100%", background: rm.color, borderRadius: 999 }} />
                  </div>
                  <span className="trophy-progress-label">{a.current}/{a.target}</span>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Detail Modal */}
      {detail && (
        <div className="trophy-modal-overlay" onClick={() => setDetail(null)}>
          <div className="trophy-modal" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="trophy-modal-close" onClick={() => setDetail(null)}><X size={18} /></button>
            <div className="trophy-modal-icon" style={{ borderColor: RARITY_META[detail.rarity].border, background: RARITY_META[detail.rarity].bg }}>
              <img src={trophySvgUrl(detail.id)} alt="" width={32} height={32} loading="eager" style={{ display: "block", ...trophyStyle(RARITY_META[detail.rarity].color, detail.unlocked) }} />
            </div>
            <div className="trophy-modal-name" style={{ color: RARITY_META[detail.rarity].color }}>{detail.name}</div>
            <div className="trophy-modal-rarity" style={{ color: RARITY_META[detail.rarity].color, background: RARITY_META[detail.rarity].bg, border: `1px solid ${RARITY_META[detail.rarity].border}` }}>{RARITY_META[detail.rarity].label}</div>
            <div className="trophy-modal-desc">{detail.desc}</div>
            <div className="trophy-modal-category">{CATEGORY_META[detail.category].label}</div>
            {detail.unlocked ? (
              <div className="trophy-modal-status unlocked">Tercapai!</div>
            ) : (
              <div className="trophy-modal-progress">
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, fontWeight: 700, color: "var(--muted)" }}>
                  <span>Progres</span>
                  <span>{detail.current} / {detail.target}</span>
                </div>
                <div style={{ height: 8, borderRadius: 999, background: "#e2e8f0", overflow: "hidden" }}>
                  <div style={{ width: `${detail.progress * 100}%`, height: "100%", background: RARITY_META[detail.rarity].color, borderRadius: 999, transition: "width 520ms cubic-bezier(0.16,1,0.3,1)" }} />
                </div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", textAlign: "center" }}>{Math.round(detail.progress * 100)}%</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
