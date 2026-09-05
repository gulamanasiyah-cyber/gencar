import { useCallback, useEffect, useMemo, useState } from "react";
import { Check as IcoCheck, X as IcoX, Clock3 as IcoClock, AlertCircle as IcoAlert, User as IcoUser, CalendarDays as IcoCal, Search as IcoSearch } from "lucide-react";
import KpiCard from "../../components/admin/KpiCard";
import { apiFetch, unwrapList } from "../../lib/api";

type IzinRow = {
  id: string;
  kegiatanId: string;
  generusId: string;
  catatan: string | null;
  timestamp: string | null;
  generusNama?: string | null;
  generusNomorUnik?: string | null;
  desaNama?: string | null;
  kelompokNama?: string | null;
  judul: string;
  tanggal: string;
  jamMulai?: string | null;
  lokasi?: string | null;
};

function fmtDate(s?: string | null) {
  if (!s) return "—";
  try {
    const d = new Date(s);
    if (Number.isNaN(d.getTime())) return s;
    return d.toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short", hourCycle: "h23" });
  } catch { return s; }
}

export default function IzinAdminPanel() {
  const [rows, setRows] = useState<IzinRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<"all" | "upcoming" | "past">("all");

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const raw: unknown = await apiFetch("/api/admin/izin");
      const unwrapped = unwrapList<IzinRow>(raw);
      const list = Array.isArray(raw) ? (raw as IzinRow[]) : (Array.isArray((raw as { data?: unknown }).data) ? ((raw as { data: IzinRow[] }).data) : unwrapped.data);
      setRows(Array.isArray(list) ? list : []);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (String(msg).includes("401") || String(msg).toLowerCase().includes("unauthorized")) { setRows([]); setErr(null); }
      else setErr(msg);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function reject(id: string) {
    if (busyId) return;
    setBusyId(id);
    try {
      await apiFetch(`/api/admin/izin/${id}/reject`, { method: "POST" });
      setRows((prev) => prev.filter((r) => r.id !== id));
      setToast("Izin dibatalkan — anggota dapat absen normal.");
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally { setBusyId(null); }
  }

  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), 2500); return () => clearTimeout(t); }, [toast]);

  const todayStr = new Date().toISOString().slice(0, 10);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return rows.filter((r) => {
      // Filter status kegiatan
      if (tab === "upcoming" && r.tanggal < todayStr) return false;
      if (tab === "past" && r.tanggal >= todayStr) return false;
      // Pencarian
      if (!s) return true;
      const hay = [
        r.generusNama ?? "",
        r.generusNomorUnik ?? "",
        r.desaNama ?? "",
        r.kelompokNama ?? "",
        r.judul ?? "",
        r.catatan ?? "",
        r.lokasi ?? "",
      ].join(" ").toLowerCase();
      return hay.includes(s);
    });
  }, [rows, q, tab, todayStr]);

  const upcomingCount = rows.filter((r) => r.tanggal >= todayStr).length;
  const pastCount = rows.filter((r) => r.tanggal < todayStr).length;

  return (
    <div>
      <div className="kpi">
        <KpiCard icon={<span className="kpi-icon kpi-icon--amber"><IcoClock size={18} /></span>} label="Ajuan izin" value={rows.length} />
        <KpiCard icon={<span className="kpi-icon kpi-icon--emerald"><IcoCal size={18} /></span>} label="Kegiatan mendatang" value={upcomingCount} />
        <KpiCard icon={<span className="kpi-icon kpi-icon--slate"><IcoClock size={18} /></span>} label="Sudah lewat" value={pastCount} />
      </div>

      {toast && (
        <div role="status" aria-live="polite" style={{ position: "fixed", left: "50%", bottom: 24, transform: "translateX(-50%)", background: "var(--ink)", color: "#fff", padding: "10px 14px", borderRadius: 12, fontSize: 13, fontWeight: 700, boxShadow: "0 8px 24px rgba(0,0,0,0.22)", zIndex: 80, display: "flex", gap: 8, alignItems: "center" }}>
          <IcoCheck size={14} /> {toast}
        </div>
      )}

      {err && (
        <div className="card" style={{ borderColor: "#fecaca", background: "#fef2f2", color: "#991b1b", display: "flex", gap: 8, alignItems: "center", marginBottom: 12 }}>
          <IcoAlert size={16} /> <span style={{ fontSize: 13, fontWeight: 700 }}>{err}</span>
          <button type="button" className="btn btn-ghost btn-sm" style={{ marginLeft: "auto" }} onClick={() => void load()}>Retry</button>
          <button type="button" className="btn-close" aria-label="Tutup" onClick={() => setErr(null)} style={{ width: 28, height: 28, minWidth: 28 }}><IcoX size={12} /></button>
        </div>
      )}

      {/* Toolbar filter */}
      <div className="admin-toolbar" style={{ marginBottom: 12, flexWrap: "wrap" }}>
        <label className="search" style={{ flex: 1, minWidth: 200 }}>
          <IcoSearch size={14} />
          <input placeholder="Cari anggota / kegiatan / desa / alasan…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Cari ajuan izin" />
          {q && (
            <button type="button" className="btn-close" style={{ width: 26, height: 26, minWidth: 26 }} aria-label="Hapus pencarian" onClick={() => setQ("")}>
              <IcoX size={12} />
            </button>
          )}
        </label>
        <div className="filter-chips" style={{ flexShrink: 0, display: "flex", gap: 6 }}>
          {([["all", "Semua"], ["upcoming", "Mendatang"], ["past", "Sudah lewat"]] as const).map(([val, label]) => (
            <button key={val} type="button" className={`chip ${tab === val ? "active" : ""}`} onClick={() => setTab(val)}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="card" style={{ padding: 24, textAlign: "center" }}><span className="muted">Memuat ajuan izin…</span></div>
      ) : rows.length === 0 ? (
        <div className="lp-empty-card">Tidak ada ajuan izin member. Izin muncul di sini saat member mengajukan izin untuk kegiatan mendatang.</div>
      ) : filtered.length === 0 ? (
        <div className="lp-empty-card">Tidak ada ajuan izin yang cocok dengan filter.</div>
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {filtered.map((r) => (
            <div key={r.id} className="card" style={{ padding: 14, display: "grid", gap: 8 }}>
              <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                <span className="kpi-icon kpi-icon--slate" style={{ width: 36, height: 36, borderRadius: 12, display: "grid", placeItems: "center" }}>
                  <IcoUser size={17} />
                </span>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontWeight: 800, fontSize: 14, color: "var(--ink)" }}>
                    {r.generusNama || "Anggota"} {r.generusNomorUnik ? <span className="muted" style={{ fontSize: 11, fontWeight: 600 }}>· {r.generusNomorUnik}</span> : null}
                  </div>
                  <div className="muted" style={{ fontSize: 11 }}>{[r.desaNama && `Desa ${r.desaNama}`, r.kelompokNama && `Kelompok ${r.kelompokNama}`].filter(Boolean).join(" · ") || "—"}</div>
                </div>
                <span className={`pill ${r.tanggal >= todayStr ? "pill-amber" : "pill-slate"}`} style={{ fontSize: 10 }}>
                  {r.tanggal >= todayStr ? "Menunggu" : "Kegiatan lewat"}
                </span>
              </div>

              <div style={{ borderTop: "1px solid var(--line)", paddingTop: 8, display: "grid", gap: 4 }}>
                <div style={{ fontWeight: 700, fontSize: 13 }}>{r.judul}</div>
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap", fontSize: 11, color: "var(--text-secondary)" }}>
                  <span style={{ display: "inline-flex", gap: 4, alignItems: "center" }}><IcoCal size={11} /> {r.tanggal}{r.jamMulai ? ` · ${r.jamMulai}` : ""}</span>
                  {r.lokasi ? <span style={{ fontSize: 11 }}>📍 {r.lokasi}</span> : null}
                </div>
              </div>

              {r.catatan && (
                <div style={{ fontSize: 12, color: "var(--text-secondary)", background: "var(--bg)", border: "1px solid var(--line)", borderRadius: 10, padding: "8px 10px", lineHeight: 1.45 }}>
                  {r.catatan}
                </div>
              )}
              <div className="muted" style={{ fontSize: 10 }}>Diajukan {fmtDate(r.timestamp)}</div>

              <div style={{ display: "flex", gap: 8 }}>
                <button type="button" className="btn btn-danger btn-sm" disabled={busyId === r.id} onClick={() => reject(r.id)} style={{ flex: 1, fontSize: 12 }}>
                  {busyId === r.id ? "…" : <><IcoX size={13} /> Batalkan Izin</>}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
