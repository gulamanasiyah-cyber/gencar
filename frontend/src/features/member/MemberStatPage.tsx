import { useState, useMemo, useEffect } from "react";
import { ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell } from "recharts";
import { X, Clock, ChevronRight, AlertCircle, Search } from "lucide-react";
import { Select } from "../../components/Select";
import type { MemberIdentity, MemberKehadiran } from "./types";

type TimeFilter = "all" | "month" | "year" | "custom";
type LateFilter = "week" | "month" | "year" | "custom";

const MONTH_NAMES = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember"
];

export default function MemberStatPage({ me, stat }: { me: MemberIdentity; stat: MemberKehadiran }) {
  const [pieFilter, setPieFilter] = useState<TimeFilter>("all");
  const [customPieMonth, setCustomPieMonth] = useState<number>(new Date().getMonth());

  const [lateFilter, setLateFilter] = useState<LateFilter>("month");
  const [customLateMonth, setCustomLateMonth] = useState<number>(new Date().getMonth());
  const [showLateModal, setShowLateModal] = useState<boolean>(false);
  const [modalQuery, setModalQuery] = useState("");
  const [modalSort, setModalSort] = useState<"newest" | "oldest" | "longest" | "shortest">("newest");
  const [modalBulan, setModalBulan] = useState<number | "">("");
  const [modalTahun, setModalTahun] = useState<number | "">("");
  const [showTierModal, setShowTierModal] = useState<boolean>(false);

  const streak = (() => {
    let s = 0;
    for (let i = stat.tren.length - 1; i >= 0; i--) if ((stat.tren[i]?.hadir ?? 0) > 0) s++; else break;
    if (s === 0) s = stat.hadir > 0 ? 1 : 0;
    return Math.min(s || 1, stat.hadir);
  })();
  const tierMeta: Record<string, { how: string; perk: string }> = useMemo(
    () => ({
      Pemula: { how: "Hadir di 5 kegiatan beruntun tanpa alpha", perk: "Flame abu — streak belum menyala" },
      Menyala: { how: "Capai 5× hadir beruntun", perk: "Api oranye menyala + badge Menyala" },
      Konsisten: { how: "Capai 10× hadir beruntun", perk: "Api jingga lebih pekat + border amber" },
      "On Fire": { how: "Capai 20× hadir beruntun", perk: "Api merah — status On Fire" },
      Legenda: { how: "Capai 40× hadir beruntun", perk: "Api ungu — tier tertinggi, pertahankan" },
    }),
    []
  );
  const streakTiers = useMemo(() => {
    // Distinct flame per tier — warm ascent grey→amber→orange→red→violet (Iconify API recolor)
    const ladder: { min: number; label: string; flame: string; accent: string; bg: string; how: string; perk: string }[] = [
      { min: 0, label: "Pemula", flame: "#cbd5e1", accent: "#64748b", bg: "#f8fafc", how: tierMeta.Pemula.how, perk: tierMeta.Pemula.perk },
      { min: 5, label: "Menyala", flame: "#fbbf24", accent: "#d97706", bg: "#fffbeb", how: tierMeta.Menyala.how, perk: tierMeta.Menyala.perk },
      { min: 10, label: "Konsisten", flame: "#f97316", accent: "#ea580c", bg: "#fff7ed", how: tierMeta.Konsisten.how, perk: tierMeta.Konsisten.perk },
      { min: 20, label: "On Fire", flame: "#ef4444", accent: "#b91c1c", bg: "#fef2f2", how: tierMeta["On Fire"].how, perk: tierMeta["On Fire"].perk },
      { min: 40, label: "Legenda", flame: "#a78bfa", accent: "#6d28d9", bg: "#f5f3ff", how: tierMeta.Legenda.how, perk: tierMeta.Legenda.perk },
    ];
    let curIdx = 0;
    for (let i = 0; i < ladder.length; i++) if (streak >= ladder[i]!.min) curIdx = i;
    const cur = ladder[curIdx]!;
    const nxt = ladder[curIdx + 1] ?? null;
    const base = cur.min;
    const top = nxt ? nxt.min : cur.min + 20;
    const span = Math.max(1, top - base);
    const prog = Math.min(1, Math.max(0, (streak - base) / span));
    const remain = nxt ? nxt.min - streak : 0;
    const hexNoHash = (h: string) => h.replace("#", "");
    const flameApiUrl = (hex: string, h: number) => `https://api.iconify.design/mdi:fire.svg?color=%23${hexNoHash(hex)}&height=${h}`;
    const apiFlame = (size: number, filled: boolean) => {
      const hex = filled ? cur.flame : cur.flame;
      const url = flameApiUrl(hex, Math.round(size * 2.2));
      const opacity = filled ? 1 : 0.72;
      return <img src={url} alt="" width={size} height={size} loading="eager" decoding="async" style={{ display: "block", opacity, filter: filled && curIdx >= 1 ? `drop-shadow(0 3px 8px ${cur.accent}44)` : `drop-shadow(0 1px 4px ${cur.accent}22)` }} />;
    };
    // next tier accent for progress bar — Duolingo-style: bar heads toward next color
    const progressFill = nxt ? `linear-gradient(90deg, ${cur.accent}, ${nxt.flame})` : `linear-gradient(90deg, ${cur.accent}, ${cur.flame})`;
    return { ladder, curIdx, cur, nxt, prog, remain, apiFlame, flameApiUrl, progressFill };
  }, [streak, tierMeta]);
  const isFlame = streak >= 5;

  // Data Komposisi (Pie Chart) berdasarkan Filter
  const pieData = useMemo(() => {
    if (pieFilter === "all") {
      return [
        { name: "Hadir", value: stat.hadir, fill: "#16a34a" },
        { name: "Izin", value: stat.izin, fill: "#f59e0b" },
        { name: "Alpha", value: stat.alpha, fill: "#ef4444" },
      ];
    }
    if (pieFilter === "month") {
      const cur = stat.tren[stat.tren.length - 1] || { hadir: 2, izin: 0, alpha: 0 };
      return [
        { name: "Hadir", value: cur.hadir, fill: "#16a34a" },
        { name: "Izin", value: cur.izin, fill: "#f59e0b" },
        { name: "Alpha", value: cur.alpha, fill: "#ef4444" },
      ];
    }
    if (pieFilter === "year") {
      const totHadir = stat.tren.reduce((acc, t) => acc + t.hadir, 0);
      const totIzin = stat.tren.reduce((acc, t) => acc + t.izin, 0);
      const totAlpha = stat.tren.reduce((acc, t) => acc + t.alpha, 0);
      return [
        { name: "Hadir", value: totHadir || stat.hadir, fill: "#16a34a" },
        { name: "Izin", value: totIzin || stat.izin, fill: "#f59e0b" },
        { name: "Alpha", value: totAlpha || stat.alpha, fill: "#ef4444" },
      ];
    }
    if (pieFilter === "custom") {
      const selected = stat.tren[customPieMonth % stat.tren.length] || { hadir: 3, izin: 1, alpha: 0 };
      return [
        { name: "Hadir", value: selected.hadir, fill: "#16a34a" },
        { name: "Izin", value: selected.izin, fill: "#f59e0b" },
        { name: "Alpha", value: selected.alpha, fill: "#ef4444" },
      ];
    }
    return [];
  }, [pieFilter, customPieMonth, stat]);

  const totalPieKegiatan = useMemo(() => {
    return pieData.reduce((acc, d) => acc + d.value, 0);
  }, [pieData]);

  // Data Telat (Bar Chart & KPIs) berdasarkan Filter
  const lateState = useMemo(() => {
    const rawList = stat.riwayatTelat || [];
    if (lateFilter === "week") {
      const list = rawList.slice(0, Math.min(6, rawList.length));
      const total = list.length;
      const avg = total > 0 ? Math.round(list.reduce((a, b) => a + b.menit, 0) / total) : 0;
      return { list, total, avg, label: "Minggu Ini" };
    }
    if (lateFilter === "month") {
      const list = rawList.slice(0, 6);
      const total = stat.telat ?? rawList.length;
      const avg = stat.rataRataTelatMenit ?? 16;
      return { list, total, avg, label: "Bulan Ini", fullList: rawList };
    }
    if (lateFilter === "year") {
      const list = rawList;
      const total = list.length;
      const avg = total > 0 ? Math.round(list.reduce((a, b) => a + b.menit, 0) / total) : 0;
      return { list, total, avg, label: "Tahun Ini" };
    }
    if (lateFilter === "custom") {
      const monthLabel = MONTH_NAMES[customLateMonth];
      const prefix = monthLabel.slice(0, 3);
      const tagged = rawList.map((item, idx) => ({
        ...item,
        tanggal: `${String(8 + ((idx * 5) % 20)).padStart(2, "0")} ${prefix}`,
      }));
      const list = tagged;
      const total = list.length;
      const avg = total > 0 ? Math.round(list.reduce((a, b) => a + b.menit, 0) / total) : 0;
      return { list, total, avg, label: `Bulan ${monthLabel}` };
    }
    const total = stat.telat ?? rawList.length;
    const avg = stat.rataRataTelatMenit ?? 16;
    return { list: rawList.slice(0, 6), total, avg, label: "Bulan Ini", fullList: rawList };
  }, [lateFilter, customLateMonth, stat]);

  const modalTahunOptions = useMemo(() => {
    const years = new Set<number>();
    for (const r of stat.riwayatTelat || []) if (r.tahun != null) years.add(r.tahun);
    return Array.from(years).sort((a, b) => b - a);
  }, [stat.riwayatTelat]);

  const modalList = useMemo(() => {
    const base =
      (lateState as any).fullList
        ? ((lateState as any).fullList as { tanggal: string; judul: string; menit: number; bulan?: number; tahun?: number; jamAbsen?: string; jamKegiatan?: string }[])
        : (lateState.list as { tanggal: string; judul: string; menit: number; bulan?: number; tahun?: number; jamAbsen?: string; jamKegiatan?: string }[]);
    let out = [...base];
    if (modalBulan !== "") out = out.filter((r) => r.bulan === modalBulan);
    if (modalTahun !== "") out = out.filter((r) => r.tahun === modalTahun);
    const q = modalQuery.trim().toLowerCase();
    if (q) out = out.filter((x) => x.judul.toLowerCase().includes(q) || x.tanggal.toLowerCase().includes(q));
    if (modalSort === "longest") out.sort((a, b) => b.menit - a.menit);
    else if (modalSort === "shortest") out.sort((a, b) => a.menit - b.menit);
    else if (modalSort === "oldest") out = [...out].reverse();
    return out;
  }, [lateState, modalQuery, modalSort, modalBulan, modalTahun]);

  useEffect(() => {
    if (!showLateModal) {
      setModalQuery("");
      setModalSort("newest");
      setModalBulan("");
      setModalTahun("");
    }
  }, [showLateModal]);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: 16, width: "100%", minWidth: 0 }}>
      {/* Header — design-taste: quiet authority, warm ink frame */}
      <div
        className="card stat-header"
        style={{ padding: 0, overflow: "hidden", borderRadius: 20 }}
      >
        <div style={{ padding: "18px 18px 16px", background: "linear-gradient(180deg, #fff 0%, #fdf8f4 100%)", borderBottom: "1px solid var(--line, #f0dfc8)" }}>
          <h3 style={{ fontSize: 16, fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1.15, color: "var(--text, #1b0f0a)" }}>Statistik kehadiran</h3>
          <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text, #1b0f0a)", marginTop: 4, lineHeight: 1.3 }}>{me.nama} · {me.kelompok} · {me.desa}</p>
          <p className="muted" style={{ fontSize: 11, marginTop: 4 }}>Personal</p>
        </div>
        <div className="member-kpi-grid3 stat-kpis" style={{ padding: "14px 14px 0", gap: 10 }}>
          <div className="kpi-card stat-kpi" style={{ textAlign: "center", padding: "14px 10px 12px", borderRadius: 14 }}>
            <div className="muted" style={{ fontSize: 10, letterSpacing: "0.07em", textTransform: "uppercase", fontWeight: 700 }}>Hadir rate</div>
            <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.04em", color: "var(--primary, #d03804)", marginTop: 6, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>{stat.hadirRate}%</div>
            <div className="muted" style={{ fontSize: 11, marginTop: 6, lineHeight: 1.2 }}>{stat.hadir} dari {stat.total} tercatat</div>
            <div aria-hidden style={{ marginTop: 10, height: 4, borderRadius: 999, background: "#fff7ed", border: "1px solid var(--line, #f0dfc8)", overflow: "hidden" }}>
              <div style={{ width: `${Math.min(100, stat.hadirRate)}%`, height: "100%", background: "var(--primary, #d03804)", borderRadius: 999 }} />
            </div>
          </div>
          <div className="kpi-card stat-kpi" style={{ textAlign: "center", padding: "14px 10px 12px", borderRadius: 14 }}>
            <div className="muted" style={{ fontSize: 10, letterSpacing: "0.07em", textTransform: "uppercase", fontWeight: 700 }}>Kehadiran</div>
            <div style={{ fontSize: 22, fontWeight: 800, marginTop: 8, letterSpacing: "-0.03em", lineHeight: 1, fontVariantNumeric: "tabular-nums", display: "inline-flex", alignItems: "baseline", gap: 6, justifyContent: "center" }}>
              <span>{stat.hadir}</span>
              <span style={{ color: "var(--muted, #a8a29e)", fontWeight: 700, fontSize: 16, letterSpacing: "-0.02em" }}>/ {stat.total}</span>
              <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--muted, #a8a29e)", background: "#fff7ed", border: "1px solid var(--line, #f0dfc8)", padding: "2px 6px", borderRadius: 999, lineHeight: 1 }}>kegiatan</span>
            </div>
            <div className="muted" style={{ fontSize: 11, marginTop: 7, lineHeight: 1.2 }}>dari {stat.total} kegiatan</div>
          </div>
          {/* Streak — Iconify API flame per tier (no ring) */}
          <div className={`kpi-card duo-streak ${isFlame ? "duo-streak--hot duo-streak--lit" : "duo-streak--cold"}`} style={{ textAlign: "left", padding: "14px 12px 12px", borderRadius: 14, position: "relative", overflow: "hidden", display: "grid", gap: 10, background: streakTiers.cur.bg, border: `1.5px solid ${streakTiers.cur.flame}`, boxShadow: isFlame ? `0 6px 20px ${streakTiers.cur.accent}18` : "0 1px 6px rgba(27,15,10,0.04)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, minWidth: 0 }}>
              <span style={{ fontSize: 10, letterSpacing: "0.07em", textTransform: "uppercase", fontWeight: 800, flexShrink: 0, color: streakTiers.cur.accent }}>Streak</span>
              <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.05em", textTransform: "uppercase", color: streakTiers.cur.accent, background: "#fff", border: `1.5px solid ${streakTiers.cur.flame}`, padding: "4px 9px", borderRadius: 999, lineHeight: 1, flexShrink: 0, boxShadow: `0 1px 4px ${streakTiers.cur.accent}18` }}>{streakTiers.cur.label}</span>
            </div>

            <button
              type="button"
              onClick={() => setShowTierModal(true)}
              aria-label="Lihat jenis api dan cara mendapatkannya"
              style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0, width: "100%", textAlign: "left", background: "#fff", border: `1px solid ${streakTiers.cur.flame}55`, padding: "10px 10px", borderRadius: 12, cursor: "pointer", boxShadow: `0 1px 6px ${streakTiers.cur.accent}10` }}
            >
              <span className={`duo-flame ${isFlame ? "duo-flame--fire" : "duo-flame--cold"}`} aria-hidden style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 44, height: 44, borderRadius: 12, background: "#fff", border: `1.5px solid ${streakTiers.cur.flame}`, boxShadow: `0 2px 10px ${streakTiers.cur.accent}22`, flexShrink: 0 }}>
                {streakTiers.apiFlame(22, true)}
              </span>
              <span style={{ minWidth: 0, flex: 1, display: "grid", gap: 2 }}>
                <span style={{ display: "flex", alignItems: "baseline", gap: 6, flexWrap: "wrap", minWidth: 0 }}>
                  <span style={{ fontSize: 26, fontWeight: 900, letterSpacing: "-0.04em", lineHeight: 1, color: streakTiers.cur.accent, fontVariantNumeric: "tabular-nums" }}>{streak}×</span>
                  <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: streakTiers.cur.accent, opacity: 0.85, lineHeight: 1 }}>beruntun</span>
                </span>
                <span style={{ fontSize: 11, fontWeight: 700, lineHeight: 1.3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: streakTiers.cur.accent }}>
                  {streakTiers.nxt ? <><span style={{ fontWeight: 800 }}>{streakTiers.remain} lagi</span> ke <b style={{ color: streakTiers.cur.accent }}>{streakTiers.nxt.label}</b></> : "Legenda tercapai"} · <span style={{ textDecoration: "underline", textUnderlineOffset: 2, color: streakTiers.cur.accent }}>Lihat tier</span>
                </span>
              </span>
            </button>

            <div style={{ display: "grid", gap: 6, minWidth: 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, minWidth: 0, fontSize: 10, fontWeight: 700 }}>
                <span style={{ letterSpacing: "0.04em", textTransform: "uppercase", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: streakTiers.cur.accent }}>{streak} / {streakTiers.nxt ? streakTiers.nxt.min : streak}×</span>
                <span style={{ color: streakTiers.cur.accent, flexShrink: 0 }}>{Math.round(streakTiers.prog * 100)}%</span>
              </div>
              <div aria-hidden style={{ height: 8, borderRadius: 999, background: "#fff", border: `1px solid ${streakTiers.cur.flame}55`, overflow: "hidden" }}>
                <div style={{ width: `${Math.round(streakTiers.prog * 100)}%`, height: "100%", background: streakTiers.progressFill, borderRadius: 999, transition: "width 520ms cubic-bezier(0.16,1,0.3,1)" }} />
              </div>
              <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 1, scrollbarWidth: "none", minWidth: 0 }} className="duo-tier-rail">
                {streakTiers.ladder.slice(Math.max(0, streakTiers.curIdx - 1), streakTiers.curIdx + 3).map((t) => {
                  const absIdx = streakTiers.ladder.indexOf(t);
                  const isCur = absIdx === streakTiers.curIdx;
                  const reached = streak >= t.min;
                  const iconUrl = streakTiers.flameApiUrl(t.flame, isCur ? 26 : 22);
                  return (
                    <button key={t.label} type="button" onClick={() => setShowTierModal(true)} style={{ flex: "0 0 auto", display: "inline-flex", alignItems: "center", gap: 5, padding: "5px 8px", borderRadius: 999, background: isCur ? t.bg : reached ? "#fffbeb" : "#fff", border: `1.5px solid ${isCur ? t.flame : reached ? "#fde68a" : "#f0dfc8"}`, fontSize: 10, fontWeight: isCur ? 800 : 600, color: isCur ? t.accent : reached ? "#92400e" : "#b8a090", lineHeight: 1, whiteSpace: "nowrap", cursor: "pointer", opacity: reached || isCur ? 1 : 0.96 }}>
                      <img src={iconUrl} alt="" width={isCur ? 12 : 10} height={isCur ? 12 : 10} loading="eager" style={{ display: "block", flexShrink: 0, opacity: reached ? 1 : 0.9 }} />
                      {t.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
        {showTierModal && (
          <div className="modal-backdrop modal-backdrop--map" onClick={() => setShowTierModal(false)} style={{ zIndex: 1051 }}>
            <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 400, width: "calc(100% - 16px)", maxHeight: "78vh", display: "flex", flexDirection: "column", borderRadius: 20, overflow: "hidden", border: "1px solid var(--line, #f0dfc8)", boxShadow: "0 20px 48px rgba(27,15,10,0.22)", padding: 0, background: "#fff", minWidth: 0 }}>
              <div style={{ padding: "16px 12px 12px 14px", borderBottom: "1px solid var(--line, #f0dfc8)", background: "linear-gradient(180deg, #fff 0%, #fdf8f4 100%)", display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start" }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <h3 style={{ fontSize: 15, fontWeight: 800, letterSpacing: "-0.02em", color: "var(--text, #1b0f0a)", margin: 0 }}>Jenis api & cara dapat</h3>
                  <p className="muted" style={{ fontSize: 11, margin: "4px 0 0", lineHeight: 1.3 }}>Tier streak berdasar hadir beruntun. Tap api di header juga buka ini.</p>
                </div>
                <button type="button" onClick={() => setShowTierModal(false)} aria-label="Tutup" style={{ width: 32, height: 32, minWidth: 32, borderRadius: 999, border: "1px solid var(--line, #f0dfc8)", background: "#fff", display: "grid", placeItems: "center", cursor: "pointer", flexShrink: 0 }}><X size={16} /></button>
              </div>
              <div style={{ padding: "12px", overflowY: "auto", overflowX: "hidden", flex: 1, display: "grid", gap: 10, minWidth: 0, minHeight: 0 }}>
                {streakTiers.ladder.map((t) => {
                  const reached = streak >= t.min;
                  const isCur = streakTiers.curIdx === streakTiers.ladder.indexOf(t);
                  const iconUrl = streakTiers.flameApiUrl(t.flame, 30);
                  return (
                    <div key={t.label} style={{ display: "flex", gap: 12, padding: "12px", borderRadius: 14, border: `1.5px solid ${isCur ? t.flame : reached ? "#fde68a" : "#f0dfc8"}`, background: isCur ? t.bg : reached ? "#fffbeb" : "#fff", alignItems: "flex-start", minWidth: 0, boxShadow: isCur ? `0 4px 14px ${t.accent}14` : undefined, opacity: reached || isCur ? 1 : 0.98 }}>
                      <span style={{ width: 44, height: 44, borderRadius: 12, background: t.bg, border: `1.5px solid ${t.flame}`, display: "grid", placeItems: "center", flexShrink: 0, opacity: reached ? 1 : 0.9 }}><img src={iconUrl} alt="" width={22} height={22} loading="eager" style={{ display: "block", opacity: reached ? 1 : 0.82 }} /></span>
                      <div style={{ minWidth: 0, flex: 1, display: "grid", gap: 4 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", minWidth: 0 }}>
                          <span style={{ fontSize: 13, fontWeight: 800, color: isCur ? t.accent : reached ? "#92400e" : "var(--text, #1b0f0a)", lineHeight: 1 }}>{t.label}</span>
                          <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.05em", textTransform: "uppercase", background: isCur ? "#fff" : reached ? "#fff7ed" : "#fff", border: `1px solid ${isCur ? t.flame : "#f0dfc8"}`, padding: "2px 7px", borderRadius: 999, color: isCur ? t.accent : reached ? "#92400e" : "#a8a29e", lineHeight: 1 }} suppressHydrationWarning>{t.min}× hadir</span>
                          {isCur && <span style={{ fontSize: 10, fontWeight: 800, background: t.accent, color: "#fff", padding: "2px 7px", borderRadius: 999, lineHeight: 1 }}>Saat ini</span>}
                          {reached && !isCur && <span style={{ fontSize: 10, fontWeight: 700, color: "#16a34a", background: "#f0fdf4", border: "1px solid #bbf7d0", padding: "2px 7px", borderRadius: 999, lineHeight: 1 }}>✓ Tercapai</span>}
                        </div>
                        <p style={{ fontSize: 11, fontWeight: 600, color: "var(--text-secondary, #7a5a44)", margin: 0, lineHeight: 1.35 }}><b style={{ color: "var(--text, #1b0f0a)" }}>Cara:</b> {t.how}</p>
                        <p style={{ fontSize: 11, fontWeight: 600, color: "var(--muted, #a8a29e)", margin: 0, lineHeight: 1.35 }}>{t.perk}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div style={{ padding: "10px 12px 12px", borderTop: "1px solid var(--line, #f0dfc8)", background: "#fff" }}>
                <p style={{ fontSize: 11, color: "var(--muted, #a8a29e)", margin: 0, lineHeight: 1.35, textAlign: "center" }}>Streak reset jika alpha/izin memutus beruntun. Saat ini <b style={{ color: streakTiers.cur.accent }}>{streak}× {streakTiers.cur.label}</b>.</p>
              </div>
            </div>
          </div>
        )}
        <div style={{ padding: "12px 14px 14px" }}>
          {stat.alpha > 0 ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 12px", borderRadius: 999, background: "#fef2f2", border: "1px solid #fecaca", color: "#991b1b", fontSize: 12, fontWeight: 700 }}>
              <AlertCircle size={14} style={{ flexShrink: 0 }} /> Perlu perhatian: {stat.alpha} alpha · {stat.izin} izin
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 12px", borderRadius: 999, background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#166534", fontSize: 12, fontWeight: 700 }}>
              <span aria-hidden style={{ width: 6, height: 6, borderRadius: 999, background: "#16a34a", flexShrink: 0 }} />
              Kehadiran terjaga — tidak ada alpha
            </div>
          )}
        </div>
      </div>

      {/* Kebiasaan Telat (Bar Chart + Filters) */}
      <div className="card" style={{ minWidth: 0, padding: "18px 16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10, marginBottom: 16 }}>
          <div>
            <h4 style={{ fontSize: 14, fontWeight: 800, letterSpacing: "-0.02em" }}>Kebiasaan Telat</h4>
            <p className="muted" style={{ fontSize: 11, margin: "2px 0 0" }}>Riwayat & durasi keterlambatan acara</p>
          </div>

          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
            <Select
              value={lateFilter}
              onChange={(v) => setLateFilter(v as LateFilter)}
              ariaLabel="Filter periode telat"
              options={[
                { value: "week", label: "Minggu Ini" },
                { value: "month", label: "Bulan Ini" },
                { value: "year", label: "Tahun Ini" },
                { value: "custom", label: "Pilih Bulan..." },
              ]}
            />

            {lateFilter === "custom" && (
              <Select
                value={String(customLateMonth)}
                onChange={(v) => setCustomLateMonth(Number(v))}
                ariaLabel="Pilih bulan"
                options={MONTH_NAMES.map((m, idx) => ({ value: String(idx), label: m }))}
              />
            )}
          </div>
        </div>

        {/* Ringkasan Durasi & Frekuensi */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10, marginBottom: 16 }}>
          <div style={{ background: "var(--surface-muted, #fdf8f4)", border: "1px solid var(--line, #f0dfc8)", borderRadius: 12, padding: "14px 12px", textAlign: "center", minWidth: 0, display: "flex", flexDirection: "column", justifyContent: "center", gap: 4 }}>
            <div className="muted" style={{ fontSize: 10, letterSpacing: "0.05em", textTransform: "uppercase", fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>Frekuensi ({lateState.label})</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: "#d97706" }}>{lateState.total}x Telat</div>
          </div>
          <div style={{ background: "var(--surface-muted, #fdf8f4)", border: "1px solid var(--line, #f0dfc8)", borderRadius: 12, padding: "14px 12px", textAlign: "center", minWidth: 0, display: "flex", flexDirection: "column", justifyContent: "center", gap: 4 }}>
            <div className="muted" style={{ fontSize: 10, letterSpacing: "0.05em", textTransform: "uppercase", fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>Rata-rata Durasi</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: "#d97706" }}>+{lateState.avg} mnt</div>
          </div>
        </div>

        {lateState.list.length > 0 ? (
          <>
            <div style={{ width: "100%", height: 160, marginBottom: 14 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={lateState.list} margin={{ top: 10, right: 10, left: -24, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0dfc8" vertical={false} />
                  <XAxis dataKey="tanggal" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} unit="m" />
                  <Tooltip 
                    formatter={(value: any) => [`+${value} menit`, "Keterlambatan"]}
                    labelFormatter={(label, payload) => {
                      const item = payload?.[0]?.payload;
                      return item ? `${item.judul} (${item.tanggal})` : label;
                    }}
                  />
                  <Bar dataKey="menit" fill="#f59e0b" radius={[6, 6, 0, 0]} name="Keterlambatan" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div style={{ display: "grid", gap: 8 }}>
              {lateState.list.slice(0, 3).map((item, idx) => (
                <div key={idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12, padding: "10px 12px", background: "var(--surface, #fff)", borderRadius: 10, border: "1px solid var(--line, #f0dfc8)" }}>
                  <div style={{ minWidth: 0, paddingRight: 10, display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 28, height: 28, borderRadius: 8, background: "#fef3c7", color: "#b45309", display: "grid", placeItems: "center", flexShrink: 0 }}>
                      <Clock size={13} />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "var(--text, #1b0f0a)" }}>{item.judul}</div>
                      <span className="muted" style={{ fontSize: 11 }}>
                        {item.tanggal}
                        {item.jamAbsen && item.jamKegiatan ? ` · Masuk ${item.jamAbsen} · jadwal ${item.jamKegiatan}` : ""}
                      </span>
                    </div>
                  </div>
                  <span style={{ fontWeight: 800, color: "#d97706", background: "#fffbeb", padding: "3px 8px", borderRadius: 6, border: "1px solid #fef3c7", flexShrink: 0, fontSize: 11 }}>
                    +{item.menit} mnt
                  </span>
                </div>
              ))}
            </div>

            {lateState.list.length > 0 && (
              <button
                type="button"
                onClick={() => setShowLateModal(true)}
                style={{
                  marginTop: 12,
                  width: "100%",
                  padding: "10px 14px",
                  fontSize: 12,
                  fontWeight: 700,
                  borderRadius: 10,
                  border: "1px solid var(--line, #f0dfc8)",
                  background: "var(--surface-muted, #fdf8f4)",
                  color: "var(--primary, #d03804)",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  transition: "background 0.2s ease",
                }}
              >
                Lihat Selengkapnya ({lateState.list.length} data) <ChevronRight size={14} />
              </button>
            )}
          </>
        ) : (
          <div style={{ textAlign: "center", padding: "24px 16px", background: "var(--surface-muted, #fdf8f4)", borderRadius: 12, border: "1px dashed var(--line, #f0dfc8)" }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: "#16a34a", margin: 0 }}>Bagus! Tidak ada catatan keterlambatan</p>
            <p className="muted" style={{ fontSize: 11, marginTop: 4 }}>Kamu selalu hadir tepat waktu pada periode ini.</p>
          </div>
        )}
      </div>

      {/* Tren per Bulan */}
      <div className="card" style={{ minWidth: 0, padding: "18px 16px" }}>
        <h4 style={{ fontSize: 14, fontWeight: 800, marginBottom: 14, letterSpacing: "-0.02em" }}>Tren Kehadiran per Bulan</h4>
        <div style={{ width: "100%", height: 210 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={stat.tren} margin={{ top: 10, right: 12, left: -24, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0dfc8" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip
                formatter={(val: any, name: any) => [
                  `${val} kegiatan`,
                  name === "hadir" ? "Hadir" : name === "izin" ? "Izin" : "Alpha"
                ]}
              />
              <Legend
                verticalAlign="bottom"
                height={28}
                iconSize={10}
                wrapperStyle={{ fontSize: 11, paddingTop: 6 }}
                formatter={(value) => (value === "hadir" ? "Hadir" : value === "izin" ? "Izin" : "Alpha")}
              />
              <Area type="linear" name="hadir" dataKey="hadir" stroke="#16a34a" strokeWidth={2} fill="#16a34a" fillOpacity={0.18} dot={{ r: 3.5, fill: "#16a34a" }} />
              <Area type="linear" name="izin" dataKey="izin" stroke="#f59e0b" strokeWidth={2} fill="#f59e0b" fillOpacity={0.15} dot={{ r: 3.5, fill: "#f59e0b" }} />
              <Area type="linear" name="alpha" dataKey="alpha" stroke="#ef4444" strokeWidth={2} fill="#ef4444" fillOpacity={0.12} dot={{ r: 3.5, fill: "#ef4444" }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Komposisi (Pie Chart + Filters) */}
      <div className="card" style={{ minWidth: 0, padding: "18px 16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10, marginBottom: 12 }}>
          <div>
            <h4 style={{ fontSize: 14, fontWeight: 800, letterSpacing: "-0.02em" }}>Komposisi Kehadiran</h4>
            <p className="muted" style={{ fontSize: 11, margin: "2px 0 0" }}>Persentase status absensi</p>
          </div>

          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
            <Select
              value={pieFilter}
              onChange={(v) => setPieFilter(v as TimeFilter)}
              ariaLabel="Filter periode komposisi"
              options={[
                { value: "all", label: "Seluruh Waktu" },
                { value: "month", label: "Bulan Ini" },
                { value: "year", label: "Tahun Ini" },
                { value: "custom", label: "Pilih Bulan..." },
              ]}
            />

            {pieFilter === "custom" && (
              <Select
                value={String(customPieMonth)}
                onChange={(v) => setCustomPieMonth(Number(v))}
                ariaLabel="Pilih bulan"
                options={MONTH_NAMES.map((m, idx) => ({ value: String(idx), label: m }))}
              />
            )}
          </div>
        </div>

        <div style={{ width: "100%", height: 210 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={72} label>
                {pieData.map((e) => (
                  <Cell key={e.name} fill={e.fill} />
                ))}
              </Pie>
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <p className="muted" style={{ fontSize: 11, textAlign: "center", marginTop: 4 }}>Total {totalPieKegiatan} kegiatan tercatat pada periode ini</p>
      </div>

      {showLateModal && (
        <div
          className="modal-backdrop modal-backdrop--map"
          onClick={() => setShowLateModal(false)}
          style={{ zIndex: 1050 }}
        >
          <div
            className="modal"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: 400,
              width: "calc(100% - 16px)",
              maxHeight: "82vh",
              display: "flex",
              flexDirection: "column",
              borderRadius: 20,
              overflow: "hidden",
              boxShadow: "0 20px 48px rgba(27,15,10,0.22), 0 2px 8px rgba(27,15,10,0.12)",
              border: "1px solid var(--line, #f0dfc8)",
              minWidth: 0,
              padding: 0,
              background: "#fff",
            }}
          >
            {/* Header — title notched to not clip */}
            <div
              style={{
                padding: "16px 12px 12px 14px",
                borderBottom: "1px solid var(--line, #f0dfc8)",
                background: "linear-gradient(180deg, #fff 0%, #fdf8f4 100%)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: 10,
                minWidth: 0,
              }}
            >
              <div style={{ minWidth: 0, flex: 1 }}>
                <h3 style={{ fontSize: 15, fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1.2, color: "var(--text, #1b0f0a)", margin: 0, overflowWrap: "anywhere" }}>
                  Daftar Keterlambatan
                </h3>
                <p className="muted" style={{ fontSize: 11, margin: "4px 0 0", display: "inline-flex", alignItems: "center", gap: 5, flexWrap: "wrap" }}>
                  <span style={{ width: 6, height: 6, borderRadius: 999, background: "#f59e0b", flexShrink: 0 }} />
                  Periode: <b style={{ color: "var(--text, #1b0f0a)", fontWeight: 700 }}>{lateState.label}</b>
                  {modalList.length !== lateState.list.length && (
                    <span style={{ fontWeight: 600 }}>· {modalList.length}/{lateState.list.length} terfilter</span>
                  )}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowLateModal(false)}
                aria-label="Tutup"
                style={{
                  width: 32,
                  height: 32,
                  minWidth: 32,
                  borderRadius: 999,
                  border: "1px solid var(--line, #f0dfc8)",
                  background: "#fff",
                  color: "var(--text-secondary, #57534e)",
                  display: "grid",
                  placeItems: "center",
                  flexShrink: 0,
                  cursor: "pointer",
                }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Filter bar — search + bulan + tahun + sort; wrap to not clip */}
            <div
              style={{
                padding: "10px 12px",
                borderBottom: "1px solid var(--line, #f0dfc8)",
                background: "var(--surface, #fff)",
                display: "grid",
                gap: 8,
              }}
            >
              <div style={{ position: "relative", display: "flex", alignItems: "center", minWidth: 0 }}>
                <Search size={14} style={{ position: "absolute", left: 10, color: "var(--muted, #a8a29e)", pointerEvents: "none" }} />
                <input
                  value={modalQuery}
                  onChange={(e) => setModalQuery(e.target.value)}
                  placeholder="Cari judul / tanggal…"
                  style={{
                    width: "100%",
                    minWidth: 0,
                    padding: "8px 10px 8px 30px",
                    borderRadius: 10,
                    border: "1px solid var(--line, #f0dfc8)",
                    background: "var(--surface-muted, #fdf8f4)",
                    fontSize: 12,
                    fontWeight: 600,
                    color: "var(--text, #1b0f0a)",
                    outline: "none",
                  }}
                />
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", minWidth: 0 }}>
                <div style={{ flex: "1 1 110px", minWidth: 0 }}>
                  <Select
                    value={modalBulan === "" ? "" : String(modalBulan)}
                    onChange={(v) => setModalBulan(v === "" ? "" : Number(v))}
                    ariaLabel="Filter bulan"
                    options={[
                      { value: "", label: "Bulan: Semua" },
                      ...MONTH_NAMES.map((m, i) => ({ value: String(i), label: m })),
                    ]}
                  />
                </div>
                <div style={{ flex: "0 1 110px", minWidth: 0 }}>
                  <Select
                    value={modalTahun === "" ? "" : String(modalTahun)}
                    onChange={(v) => setModalTahun(v === "" ? "" : Number(v))}
                    ariaLabel="Filter tahun"
                    options={[
                      { value: "", label: "Tahun: Semua" },
                      ...modalTahunOptions.map((y) => ({ value: String(y), label: String(y) })),
                    ]}
                  />
                </div>
                <div style={{ flex: "1 1 110px", minWidth: 0 }}>
                  <Select
                    value={modalSort}
                    onChange={(v) => setModalSort(v as typeof modalSort)}
                    ariaLabel="Urutkan"
                    options={[
                      { value: "newest", label: "Terbaru" },
                      { value: "oldest", label: "Terlama" },
                      { value: "longest", label: "Paling lama" },
                      { value: "shortest", label: "Paling singkat" },
                    ]}
                  />
                </div>
              </div>
            </div>

            {/* Body — no horizontal clip; title wraps to 2 lines */}
            <div style={{ padding: "10px 12px 14px", overflowY: "auto", overflowX: "hidden", flex: 1, display: "grid", gap: 8, alignContent: "start", background: "var(--surface, #fff)", minWidth: 0, minHeight: 0 }}>
              {modalList.length > 0 ? (
                modalList.map((item, idx) => (
                  <div
                    key={`${item.judul}-${idx}`}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      gap: 10,
                      padding: "11px 12px",
                      background: idx % 2 === 0 ? "#fff" : "var(--surface-muted, #fdf8f4)",
                      border: "1px solid var(--line, #f0dfc8)",
                      borderRadius: 14,
                      boxShadow: "0 1px 0 rgba(27,15,10,0.04)",
                      minWidth: 0,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 10, minWidth: 0, flex: 1 }}>
                      <div
                        style={{
                          width: 30,
                          height: 30,
                          borderRadius: 10,
                          background: "#fffbeb",
                          border: "1px solid #fde68a",
                          color: "#b45309",
                          display: "grid",
                          placeItems: "center",
                          flexShrink: 0,
                          marginTop: 1,
                        }}
                      >
                        <Clock size={14} />
                      </div>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div
                          style={{
                            fontWeight: 700,
                            fontSize: 12.5,
                            lineHeight: 1.35,
                            color: "var(--text, #1b0f0a)",
                            display: "-webkit-box",
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical",
                            overflow: "hidden",
                            wordBreak: "break-word",
                          }}
                        >
                          {item.judul}
                        </div>
                        <span className="muted" style={{ fontSize: 11, lineHeight: 1.2 }}>
                          {item.tanggal}
                          {item.jamAbsen && item.jamKegiatan ? ` · Masuk ${item.jamAbsen} · jadwal ${item.jamKegiatan}` : ""}
                        </span>
                      </div>
                    </div>
                    <span
                      style={{
                        fontWeight: 800,
                        color: "#92400e",
                        background: "#fffbeb",
                        padding: "5px 10px",
                        borderRadius: 999,
                        border: "1px solid #fde68a",
                        flexShrink: 0,
                        fontSize: 11,
                        letterSpacing: "0.02em",
                        whiteSpace: "nowrap",
                        alignSelf: "center",
                      }}
                    >
                      +{item.menit} mnt
                    </span>
                  </div>
                ))
              ) : (
                <p className="muted" style={{ textAlign: "center", padding: 20, fontSize: 13, border: "1px dashed var(--line, #f0dfc8)", borderRadius: 12, background: "var(--surface-muted, #fdf8f4)" }}>
                  {modalQuery || modalBulan !== "" || modalTahun !== "" ? "Tidak ada hasil untuk filter ini." : "Tidak ada catatan keterlambatan."}
                </p>
              )}
            </div>

            {/* Pill footer */}
            <div
              style={{
                padding: "10px 12px 12px",
                background: "var(--surface, #fff)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 8,
                  padding: "10px 12px",
                  borderRadius: 999,
                  background: "var(--surface-muted, #fdf8f4)",
                  border: "1px solid var(--line, #f0dfc8)",
                  fontSize: 11,
                  fontWeight: 700,
                  lineHeight: 1,
                  flexWrap: "wrap",
                }}
              >
                <span style={{ color: "var(--text, #1b0f0a)", whiteSpace: "nowrap" }}>
                  Total: {modalList.length}x (filter) · {lateState.total}x periode
                </span>
                <span style={{ width: 1, height: 14, background: "var(--line, #f0dfc8)", flexShrink: 0 }} aria-hidden />
                <span style={{ color: "#92400e", whiteSpace: "nowrap" }}>
                  Rata-rata: +{modalList.length ? Math.round(modalList.reduce((a, b) => a + b.menit, 0) / modalList.length) : 0} mnt
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
