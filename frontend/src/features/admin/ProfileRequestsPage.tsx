import { useEffect, useMemo, useState } from "react";
import { Check as IcoCheck, X as IcoX, Clock3 as IcoClock, Search as IcoSearch, AlertCircle as IcoAlert, ExternalLink as IcoLink, ShieldCheck as IcoShield, User as IcoUser } from "lucide-react";
import KpiCard from "../../components/admin/KpiCard";
import SearchInput from "../../components/admin/SearchInput";
import Modal from "../../components/admin/Modal";
import { apiFetch, unwrapList } from "../../lib/api";

type ReqStatus = "pending" | "approved" | "rejected";
type ReqSection = "kontak" | "wilayah" | "identitas";
type TabKey = ReqStatus | "all";

type Row = {
  id: string;
  generusId: string;
  section: ReqSection;
  payload: string; // JSON string
  reason: string;
  attachmentUrl?: string | null;
  status: ReqStatus;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  createdAt: string;
};

type GenerusLite = { id: string; nama: string; nomorUnik: string; foto?: string | null; desaId?: number | null; kelompokId?: number | null } | null;

const FIELD_LABEL: Record<string, string> = {
  noTelp: "No. HP",
  pendidikan: "Pendidikan",
  domisiliAnak: "Alamat Anak",
  domisiliOrtu: "Alamat Ortu",
  isDomisiliOrtuSama: "Ortu sama",
  asalDaerah: "Asal Daerah",
  kategoriMudaMudi: "Kategori",
  alamat: "Alamat",
  desaId: "Desa",
  kelompokId: "Kelompok",
  nama: "Nama",
  tempatLahir: "Tempat Lahir",
  tanggalLahir: "Tanggal Lahir",
  suku: "Suku",
  foto: "Foto",
};

function parsePayload(s: string): Record<string, unknown> {
  try {
    const o = JSON.parse(s);
    return o && typeof o === "object" ? (o as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

function fmtDate(s?: string | null) {
  if (!s) return "—";
  try {
    const d = new Date(s);
    if (Number.isNaN(d.getTime())) return s;
    return d.toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return s;
  }
}

function useIsMobile() {
  const [v, setV] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 640px)");
    const u = () => setV(mq.matches);
    u();
    mq.addEventListener("change", u);
    return () => mq.removeEventListener("change", u);
  }, []);
  return v;
}

export default function ProfileRequestsPage() {
  const [tab, setTab] = useState<TabKey>("pending");
  const [q, setQ] = useState("");
  const [sectionFilter, setSectionFilter] = useState<ReqSection | "all">("all");
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [detail, setDetail] = useState<Row | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const isMobile = useIsMobile();

  // cache generus lite for enrichment
  const [generusMap, setGenerusMap] = useState<Record<string, GenerusLite>>({});
  const [wilayahNames, setWilayahNames] = useState<{ desa: Record<string, string>; kelompok: Record<string, string> } | null>(null);

  async function load() {
    // Skip fetch if not authed — avoid 401 spam before login
    try { if (!localStorage.getItem("token")) { setLoading(false); setRows([]); return; } } catch {}
    setLoading(true);
    setErr(null);
    try {
      const qs = tab === "all" ? "all" : tab;
      const raw: unknown = await apiFetch(`/api/admin/profile-requests?status=${encodeURIComponent(qs)}`);
      const unwrapped = unwrapList<Row>(raw);
      const list = Array.isArray(raw) ? (raw as Row[]) : unwrapped.data.length > 0 ? unwrapped.data : (Array.isArray((raw as { data?: unknown }).data) ? ((raw as { data: Row[] }).data) : (Array.isArray(raw) ? (raw as Row[]) : []));
      const final = Array.isArray(raw) ? (raw as Row[]) : Array.isArray((raw as { data?: unknown }).data) ? ((raw as { data: Row[] }).data) : list;
      setRows(final);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (String(msg).includes("401") || String(msg).toLowerCase().includes("unauthorized")) {
        setRows([]);
        setErr(null);
      } else {
        setErr(msg);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  // fetch wilayah names once (desa/kelompok)
  useEffect(() => {
    if (wilayahNames) return;
    void apiFetch<unknown>("/api/auth/desa")
      .then((j: unknown) => {
        if (Array.isArray(j)) {
          const desa: Record<string, string> = {};
          for (const d of j as { id: number; nama: string }[]) desa[String(d.id)] = d.nama;
          setWilayahNames((prev) => ({ desa, kelompok: prev?.kelompok ?? {} }));
        } else if (j && typeof j === "object" && Array.isArray((j as { desa?: unknown[] }).desa)) {
          const desaArr = (j as { desa: { id: number; nama: string }[] }).desa;
          const desa: Record<string, string> = {};
          for (const d of desaArr ?? []) desa[String(d.id)] = d.nama;
          setWilayahNames((prev) => ({ desa, kelompok: prev?.kelompok ?? {} }));
        }
      })
      .catch(() => {});
    void apiFetch<unknown>("/api/auth/kelompok")
      .then((j: unknown) => {
        if (Array.isArray(j)) {
          const kelompok: Record<string, string> = {};
          for (const k of j as { id: number; nama: string; desaId: number }[]) kelompok[String(k.id)] = k.nama;
          setWilayahNames((prev) => ({ desa: prev?.desa ?? {}, kelompok }));
        }
      })
      .catch(() => {});
  }, [wilayahNames]);

  // enrich generus names for visible rows — skip if not authed
  useEffect(() => {
    let hasToken = false;
    try { hasToken = Boolean(localStorage.getItem("token")); } catch {}
    if (!hasToken) return;
    const ids = [...new Set(rows.map((r) => r.generusId))].filter((id) => !(id in generusMap)).slice(0, 20);
    if (ids.length === 0) return;
    void Promise.all(
      ids.map(async (id) => {
        try {
          const j: unknown = await apiFetch(`/api/generus/${encodeURIComponent(id)}`);
          const g = j as { id?: string; nama?: string; nomorUnik?: string; foto?: string | null };
          return [id, { id: String(g.id ?? id), nama: String(g.nama ?? id), nomorUnik: String((g as { nomorUnik?: string }).nomorUnik ?? ""), foto: (g.foto as string | null) ?? null }] as const;
        } catch {
          return [id, null] as const;
        }
      }),
    ).then((pairs) => {
      setGenerusMap((prev) => {
        const next = { ...prev };
        for (const [id, g] of pairs) next[id] = g;
        return next;
      });
    });
  }, [rows, generusMap]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2400);
    return () => clearTimeout(t);
  }, [toast]);

  const filtered = useMemo(() => {
    let list = rows;
    if (sectionFilter !== "all") list = list.filter((r) => r.section === sectionFilter);
    if (q.trim()) {
      const s = q.trim().toLowerCase();
      list = list.filter((r) => {
        const g = generusMap[r.generusId];
        const hay = [r.id, r.generusId, r.section, r.reason, r.status, g?.nama ?? "", g?.nomorUnik ?? ""].join(" ").toLowerCase();
        // also search payload values
        const p = parsePayload(r.payload);
        const pv = Object.values(p).join(" ").toLowerCase();
        return hay.includes(s) || pv.includes(s);
      });
    }
    return list;
  }, [rows, q, sectionFilter, generusMap]);

  const kpi = useMemo(() => {
    const pending = rows.filter((r) => r.status === "pending").length;
    const approved = rows.filter((r) => r.status === "approved").length;
    const rejected = rows.filter((r) => r.status === "rejected").length;
    return { pending, approved, rejected, total: rows.length };
  }, [rows]);

  async function act(id: string, kind: "approve" | "reject") {
    if (kind === "approve") {
      const ok = window.confirm("Setujui pengajuan ini? Data biodata akan diperbarui permanen.");
      if (!ok) return;
    }
    setBusyId(id);
    try {
      await apiFetch(`/api/admin/profile-requests/${encodeURIComponent(id)}/${kind}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      setToast(kind === "approve" ? "Disetujui — data biodata diperbarui" : "Ditolak");
      setDetail(null);
      try { window.dispatchEvent(new Event("pengajuan:refresh")); } catch {}
      setRows((prev) => prev.filter((r) => r.id !== id));
      if (tab !== "pending") void load();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusyId(null);
    }
  }

  const tabs: { key: TabKey; label: string }[] = [
    { key: "pending", label: "Menunggu" },
    { key: "approved", label: "Disetujui" },
    { key: "rejected", label: "Ditolak" },
    { key: "all", label: "Semua" },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Pengajuan</h1>
          <div className="page-header-sub">Persetujuan pergantian data biodata — per section kontak / wilayah / identitas.</div>
        </div>
      </div>

      <div className="kpi">
        <KpiCard icon={<span className="kpi-icon kpi-icon--amber"><IcoClock size={18} /></span>} label="Menunggu" value={kpi.pending} />
        <KpiCard icon={<span className="kpi-icon kpi-icon--emerald"><IcoCheck size={18} /></span>} label="Disetujui" value={kpi.approved} />
        <KpiCard icon={<span className="kpi-icon kpi-icon--peach"><IcoX size={18} /></span>} label="Ditolak" value={kpi.rejected} />
        <KpiCard icon={<span className="kpi-icon kpi-icon--slate"><IcoShield size={18} /></span>} label="Total (tab)" value={kpi.total} />
      </div>

      <div className="card" style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 12 }}>
        {tabs.map((t) => (
          <button key={t.key} type="button" className={`chip ${tab === t.key ? "active" : ""}`} onClick={() => setTab(t.key)}>
            {t.label}
          </button>
        ))}
        <span className="muted" style={{ marginLeft: "auto", fontSize: 11 }}>{filtered.length} entri</span>
      </div>

      <div className="admin-toolbar">
        <SearchInput value={q} onChange={setQ} placeholder="Cari nama / NIK / alasan / payload..." />
        <div className="filter-chips" style={{ flexShrink: 0 }}>
          {(["all", "kontak", "wilayah", "identitas"] as const).map((s) => (
            <button key={s} type="button" className={`chip ${sectionFilter === s ? "active" : ""}`} onClick={() => setSectionFilter(s)} style={{ padding: "8px 10px", fontSize: 12 }}>
              {s === "all" ? "Semua section" : s}
            </button>
          ))}
        </div>
      </div>

      {err && (
        <div className="card" style={{ borderColor: "#fecaca", background: "#fef2f2", color: "#991b1b", display: "flex", gap: 8, alignItems: "center", marginBottom: 12 }}>
          <IcoAlert size={16} /> <span style={{ fontSize: 13, fontWeight: 700 }}>{err}</span>
          <button type="button" className="btn btn-ghost btn-sm" style={{ marginLeft: "auto" }} onClick={() => void load()}>Retry</button>
          <button type="button" className="btn-close" aria-label="Tutup" onClick={() => setErr(null)} style={{ width: 28, height: 28, minWidth: 28 }}><IcoX size={12} /></button>
        </div>
      )}

      {toast && (
        <div
          role="status"
          aria-live="polite"
          style={{
            position: "fixed",
            left: "50%",
            bottom: 24,
            transform: "translateX(-50%)",
            background: "var(--ink)",
            color: "#fff",
            padding: "10px 14px",
            borderRadius: 12,
            fontSize: 13,
            fontWeight: 700,
            boxShadow: "0 8px 24px rgba(0,0,0,0.22)",
            zIndex: 80,
            display: "flex",
            gap: 8,
            alignItems: "center",
          }}
        >
          <IcoCheck size={14} /> {toast}
        </div>
      )}

      {loading ? (
        <div className="card" style={{ padding: 24, textAlign: "center" }}><span className="muted">Memuat pengajuan…</span></div>
      ) : filtered.length === 0 ? (
        <div className="lp-empty-card">Tidak ada pengajuan di tab ini{sectionFilter !== "all" ? ` (section ${sectionFilter})` : ""}{q.trim() ? ` untuk “${q.trim()}”` : ""}.</div>
      ) : isMobile ? (
        <div className="cards-grid">
          {filtered.map((r) => {
            const g = generusMap[r.generusId];
            const payload = parsePayload(r.payload);
            const preview = Object.entries(payload).slice(0, 2).map(([k, v]) => `${FIELD_LABEL[k] ?? k}: ${String(v)}`).join(" · ");
            return (
              <div key={r.id} className="card member-card" role="button" tabIndex={0} onClick={() => setDetail(r)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setDetail(r); } }}>
                <div className="member-card-head">
                  <div className="avatar" style={{ width: 40, height: 40, fontSize: 12 }}>{(g?.nama ?? r.generusId).slice(0, 2).toUpperCase()}</div>
                  <div className="member-card-head-info">
                    <div className="member-card-name">{g?.nama ?? r.generusId.slice(0, 8)}</div>
                    <div className="muted" style={{ fontSize: 11 }}>{g?.nomorUnik ?? r.generusId} · {fmtDate(r.createdAt)}</div>
                  </div>
                  <span className={`pill ${r.status === "pending" ? "pill-amber" : r.status === "approved" ? "pill-emerald" : "pill-red"}`}>{r.status}</span>
                </div>
                <div className="member-card-meta">
                  <span className="pill pill-slate">{r.section}</span>
                  <span className="muted" style={{ fontSize: 11 }}>{preview || "—"}</span>
                </div>
                <div className="muted" style={{ fontSize: 12, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{r.reason}</div>
                <div className="member-card-actions" onClick={(e) => e.stopPropagation()}>
                  <button type="button" className="btn btn-ghost btn-sm" style={{ flex: 1 }} onClick={() => setDetail(r)}><IcoSearch size={14} /> Detail</button>
                  {r.status === "pending" && (
                    <>
                      <button type="button" className="btn btn-ghost btn-sm" disabled={busyId === r.id} onClick={() => void act(r.id, "reject")}><IcoX size={14} /> Tolak</button>
                      <button type="button" className="btn btn-primary btn-sm" disabled={busyId === r.id} onClick={() => void act(r.id, "approve")}><IcoCheck size={14} /> Setujui</button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="table-wrap">
          <table className="admin-table">
            <caption className="sr-only">Pengajuan perubahan biodata</caption>
            <thead>
              <tr><th scope="col">Anggota</th><th scope="col">Section</th><th scope="col">Perubahan</th><th scope="col">Alasan</th><th scope="col">Status</th><th scope="col">Tanggal</th><th scope="col">Aksi</th></tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const g = generusMap[r.generusId];
                const payload = parsePayload(r.payload);
                const keys = Object.keys(payload);
                return (
                  <tr key={r.id}>
                    <td>
                      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                        <div className="avatar" style={{ width: 36, height: 36, fontSize: 11 }}>{(g?.nama ?? r.generusId).slice(0, 2).toUpperCase()}</div>
                        <div>
                          <div style={{ fontWeight: 800, fontSize: 13 }}>{g?.nama ?? <span className="muted" style={{ fontWeight: 600 }}>{r.generusId.slice(0, 8)}…</span>}</div>
                          <div className="muted" style={{ fontSize: 11 }}>{g?.nomorUnik ?? r.generusId}</div>
                        </div>
                      </div>
                    </td>
                    <td><span className="pill pill-slate">{r.section}</span></td>
                    <td style={{ maxWidth: 260 }}>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                        {keys.slice(0, 4).map((k) => (
                          <span key={k} className="pill pill-slate" style={{ fontSize: 10 }}>{FIELD_LABEL[k] ?? k}: {wilayahNames && (k === "desaId" || k === "kelompokId") ? (() => { const v = String(payload[k] ?? ""); if (k === "desaId") return wilayahNames.desa[v] ?? v; return wilayahNames.kelompok[v] ?? v; })() : String(payload[k] ?? "—").slice(0, 28)}</span>
                        ))}
                        {keys.length > 4 && <span className="muted" style={{ fontSize: 11 }}>+{keys.length - 4} lagi</span>}
                      </div>
                    </td>
                    <td style={{ maxWidth: 220 }}><span className="muted" style={{ fontSize: 12, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{r.reason}</span></td>
                    <td><span className={`pill ${r.status === "pending" ? "pill-amber" : r.status === "approved" ? "pill-emerald" : "pill-red"}`}>{r.status}</span></td>
                    <td style={{ whiteSpace: "nowrap", fontSize: 12 }}>{fmtDate(r.createdAt)}</td>
                    <td>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button type="button" className="btn btn-ghost row-icon-btn" aria-label="Detail" title="Detail" onClick={() => setDetail(r)}><IcoSearch size={14} /></button>
                        {r.status === "pending" ? (
                          <>
                            <button type="button" className="btn btn-ghost row-icon-btn" aria-label="Tolak" title="Tolak" disabled={busyId === r.id} onClick={() => void act(r.id, "reject")}><IcoX size={14} /></button>
                            <button type="button" className="btn btn-primary row-icon-btn" aria-label="Setujui" title="Setujui" disabled={busyId === r.id} onClick={() => void act(r.id, "approve")}><IcoCheck size={14} /></button>
                          </>
                        ) : (
                          <span className="muted" style={{ fontSize: 11, alignSelf: "center" }}>{r.reviewedAt ? fmtDate(r.reviewedAt) : "—"}</span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {detail && (
        <DetailModal
          row={detail}
          generus={generusMap[detail.generusId] ?? null}
          wilayahNames={wilayahNames}
          busy={busyId === detail.id}
          onClose={() => setDetail(null)}
          onApprove={() => void act(detail.id, "approve")}
          onReject={() => void act(detail.id, "reject")}
        />
      )}
    </div>
  );
}

function DetailModal({
  row,
  generus,
  wilayahNames,
  busy,
  onClose,
  onApprove,
  onReject,
}: {
  row: Row;
  generus: GenerusLite;
  wilayahNames: { desa: Record<string, string>; kelompok: Record<string, string> } | null;
  busy: boolean;
  onClose: () => void;
  onApprove: () => void;
  onReject: () => void;
}) {
  const payload = parsePayload(row.payload);
  const [liveGenerus, setLiveGenerus] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    let cancel = false;
    void apiFetch<unknown>(`/api/generus/${encodeURIComponent(row.generusId)}`)
      .then((j: unknown) => {
        if (cancel || !j || typeof j !== "object") return;
        setLiveGenerus(j as Record<string, unknown>);
      })
      .catch(() => {});
    return () => { cancel = true; };
  }, [row.generusId]);

  const isImageAttachment = row.attachmentUrl ? /\.(png|jpe?g|webp|gif)(\?|$)/i.test(row.attachmentUrl) : false;

  return (
    <Modal title="Detail Pengajuan" onClose={onClose} maxWidth={640} className="modal--pengajuan">
      <div style={{ display: "grid", gap: 14 }}>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <div className="avatar" style={{ width: 44, height: 44, fontSize: 13 }}>{(generus?.nama ?? (liveGenerus?.nama as string | undefined) ?? row.generusId).slice(0, 2).toUpperCase()}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 800, fontSize: 14 }}>{String(generus?.nama ?? (liveGenerus?.nama as string | undefined) ?? row.generusId)}</div>
            <div className="muted" style={{ fontSize: 11, display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
              <span style={{ display: "inline-flex", gap: 4, alignItems: "center" }}><IcoUser size={10} /> {String(generus?.nomorUnik ?? (liveGenerus?.nomorUnik as string | undefined) ?? row.generusId)}</span>
              <span>·</span>
              <span className={`pill ${row.status === "pending" ? "pill-amber" : row.status === "approved" ? "pill-emerald" : "pill-red"}`} style={{ fontSize: 10 }}>{row.status}</span>
              <span className="pill pill-slate" style={{ fontSize: 10 }}>{row.section}</span>
            </div>
            <div className="muted" style={{ fontSize: 11 }}>Diajukan {fmtDate(row.createdAt)} · ID {row.id.slice(0, 8)}</div>
          </div>
        </div>

        <div className="card" style={{ background: "var(--bg)", display: "grid", gap: 6 }}>
          <div style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--text-secondary)" }}>Alasan</div>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)", lineHeight: 1.45 }}>{row.reason}</div>
        </div>

        <div style={{ display: "grid", gap: 8 }}>
          <div style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--text-secondary)" }}>Perubahan diajukan</div>
          <div className="detail-rows">
            {Object.entries(payload).length === 0 ? (
              <div className="detail-row"><span className="muted">Payload kosong</span></div>
            ) : (
              Object.entries(payload).map(([k, v]) => {
                const cur = liveGenerus?.[k];
                const curStr = cur == null ? "—" : String(cur);
                const nextStr = v == null ? "—" : String(v);
                const isWilayah = k === "desaId" || k === "kelompokId";
                const curLabel = isWilayah && wilayahNames ? (() => { const s = String(cur ?? ""); if (k === "desaId") return wilayahNames.desa[s] ? `${wilayahNames.desa[s]} (${s})` : s || "—"; return wilayahNames.kelompok[s] ? `${wilayahNames.kelompok[s]} (${s})` : s || "—"; })() : curStr;
                const nextLabel = isWilayah && wilayahNames ? (() => { const s = String(v ?? ""); if (k === "desaId") return wilayahNames.desa[s] ? `${wilayahNames.desa[s]} (${s})` : s; return wilayahNames.kelompok[s] ? `${wilayahNames.kelompok[s]} (${s})` : s; })() : nextStr;
                const changed = String(cur ?? "") !== String(v ?? "");
                return (
                  <div key={k} className="detail-row" style={changed ? { background: "#fffbeb" } : undefined}>
                    <span className="detail-label">{FIELD_LABEL[k] ?? k}</span>
                    <span style={{ display: "grid", gap: 2, textAlign: "right", minWidth: 0 }}>
                      <span className="muted" style={{ fontSize: 10, textDecoration: changed ? "line-through" : undefined }}>{curLabel || "—"}</span>
                      <span className="detail-value" style={{ color: changed ? "#92400e" : undefined }}>{nextLabel}</span>
                    </span>
                  </div>
                );
              })
            )}
          </div>
          <div className="muted" style={{ fontSize: 11 }}>Kuning = nilai berubah. Nilai kiri = saat ini di biodata, kanan = usulan.</div>
        </div>

        {row.attachmentUrl && (
          <div style={{ display: "grid", gap: 6 }}>
            <div style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--text-secondary)" }}>Lampiran</div>
            {isImageAttachment ? (
              <a href={row.attachmentUrl} target="_blank" rel="noopener noreferrer" style={{ display: "block", borderRadius: 12, overflow: "hidden", border: "1px solid var(--line)" }}>
                <img src={row.attachmentUrl} alt="Lampiran pengajuan" style={{ width: "100%", maxHeight: 320, objectFit: "contain", display: "block", background: "#fff" }} loading="lazy" />
              </a>
            ) : (
              <a href={row.attachmentUrl} target="_blank" rel="noopener noreferrer" className="btn btn-ghost" style={{ justifyContent: "center" }}>
                <IcoLink size={14} /> Buka lampiran
              </a>
            )}
            <div className="muted" style={{ fontSize: 11, overflowWrap: "anywhere" }}>{row.attachmentUrl}</div>
          </div>
        )}

        {row.reviewedAt && (
          <div className="muted" style={{ fontSize: 11 }}>
            Direview {fmtDate(row.reviewedAt)} {row.reviewedBy ? `· oleh ${row.reviewedBy.slice(0, 8)}` : ""}
          </div>
        )}

        {row.status === "pending" ? (
          <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
            <button type="button" className="btn btn-ghost" style={{ flex: 1 }} disabled={busy} onClick={onClose}>Tutup</button>
            <button type="button" className="btn btn-ghost" style={{ flex: 1, borderColor: "#fecaca", color: "#b91c1c" }} disabled={busy} onClick={onReject}>
              {busy ? "…" : <><IcoX size={14} /> Tolak</>}
            </button>
            <button type="button" className="btn btn-primary" style={{ flex: 1 }} disabled={busy} onClick={onApprove}>
              {busy ? "Memproses…" : <><IcoCheck size={14} /> Setujui & Update Biodata</>}
            </button>
          </div>
        ) : (
          <button type="button" className="btn btn-ghost" style={{ width: "100%" }} onClick={onClose}>Tutup</button>
        )}
      </div>
    </Modal>
  );
}
