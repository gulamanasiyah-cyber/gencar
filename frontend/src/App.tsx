import { useEffect, useMemo, useRef, useState } from "react";
import { sambungJudulTemplate } from "../../shared/validation";
import {
  ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
  PieChart, Pie, Cell,
  AreaChart, Area,
} from "recharts";
import { QRCodeCanvas } from "qrcode.react";
import { toPng } from "html-to-image";
import {
  Users as IcoUsers,
  CalendarDays as IcoCalendar,
  Shield as IcoShield,
  QrCode as IcoQr,
  Search as IcoSearch,
  X as IcoX,
  ChevronDown as IcoChevronDown,
  MapPin as IcoMapPin,
  BarChart3 as IcoBarChart,
  FoldVertical as IcoFold,
  UnfoldVertical as IcoUnfold,
  FileText as IcoFileText,
  FileCheck as IcoFileCheck,
  SlidersHorizontal as IcoFilter,
  Eye as IcoEye,
  Power as IcoPower,
  List as IcoList,
  LayoutGrid as IcoGrid,
  Trash2 as IcoTrash,
} from "lucide-react";
import MapPickerModal from "./components/MapPickerModal";
import AdminModal from "./components/admin/Modal";
import KpiCard from "./components/admin/KpiCard";
import PageHeader from "./components/admin/PageHeader";
import SearchInput from "./components/admin/SearchInput";
import { apiFetch, unwrapList } from "./lib/api";

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 640px)");
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return isMobile;
}

// ── Icons: lucide-react (aliased ke nama Ico* biar call site nggak berubah) ──

// ── Custom select (bukan bawaan browser) ──
function Select({
  value, onChange, options, className, ariaLabel,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  className?: string;
  ariaLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const ref = useRef<HTMLDivElement>(null);
  const triggerId = useRef(`select-${Math.random().toString(36).slice(2, 8)}`);
  const listboxId = `${triggerId.current}-listbox`;
  const current = options.find((o) => o.value === value);

  useEffect(() => {
    if (open) {
      const idx = options.findIndex((o) => o.value === value);
      setActiveIndex(idx >= 0 ? idx : 0);
    }
  }, [open, value, options]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("keydown", esc);
    };
  }, []);

  const onTriggerKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!open) setOpen(true);
      else setActiveIndex((prev) => {
        const n = options.length;
        if (n === 0) return -1;
        if (e.key === "ArrowDown") return prev < n - 1 ? prev + 1 : 0;
        return prev > 0 ? prev - 1 : n - 1;
      });
    } else if (e.key === "Home") {
      e.preventDefault();
      if (open) setActiveIndex(0);
    } else if (e.key === "End") {
      e.preventDefault();
      if (open) setActiveIndex(options.length - 1);
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (open && activeIndex >= 0) {
        onChange(options[activeIndex]!.value);
        setOpen(false);
      } else setOpen((o) => !o);
    }
  };

  return (
    <div className={`select ${className ?? ""}`} data-open={open} ref={ref}>
      <button
        type="button"
        id={triggerId.current}
        className="select-trigger"
        onClick={() => setOpen((o) => !o)}
        onKeyDown={onTriggerKeyDown}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-activedescendant={open && activeIndex >= 0 ? `${listboxId}-opt-${activeIndex}` : undefined}
        aria-label={ariaLabel}
      >
        <span>{current?.label ?? "Pilih"}</span>
        <IcoChevronDown size={14} />
      </button>
      {open && (
        <div className="select-menu" role="listbox" id={listboxId} aria-labelledby={triggerId.current}>
          {options.map((o, idx) => (
            <button
              key={o.value}
              id={`${listboxId}-opt-${idx}`}
              type="button"
              role="option"
              aria-selected={o.value === value}
              className={`select-option ${o.value === value ? "selected" : ""}`}
              onClick={() => {
                onChange(o.value);
                setOpen(false);
              }}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

type Kategori = "sambung_rutin" | "keakraban" | "pemantapan" | "lainnya";
type Tingkat = "daerah" | "desa" | "kelompok";
type AdminRole = "admin_daerah" | "admin_desa" | "admin_kelompok";
type ViewMode = "list" | "card";

type Kegiatan = {
  id: string;
  judul: string;
  kategori: Kategori;
  kategoriCustom?: string;
  tingkat: Tingkat;
  desa?: string;
  kelompok?: string;
  tanggal: string;
  jam: string;
  lokasi: string;
  lat: number | null;
  lng: number | null;
  radiusM: number;
};

type Member = {
  id: string;
  nama: string;
  desa: string;
  kelompok: string;
  pendidikan: string;
  noTelp: string;
  kategoriMudaMudi: "pribumi" | "perantauan";
  domisiliAnak: string;
  isOrtuSama: boolean;
  status: "aktif" | "pending";
};

type DesaWilayah = { id: string; nama: string };
type KelompokWilayah = { id: string; nama: string; desaId: string };

// DEMO_KEGIATAN removed — live from /api/kegiatan
void ([] as Kegiatan[]) as unknown as void;

const DEMO_MEMBERS: Member[] = [
  { id: "m1", nama: "Ahmad Fauzi", desa: "Fajar", kelompok: "Fajar C", pendidikan: "SMA", noTelp: "081234567890", kategoriMudaMudi: "pribumi", domisiliAnak: "Jl. Fajar No 12", isOrtuSama: true, status: "aktif" },
  { id: "m2", nama: "Budi Santoso", desa: "Fajar", kelompok: "Fajar C", pendidikan: "SMP", noTelp: "081234567891", kategoriMudaMudi: "perantauan", domisiliAnak: "Kos Fajar", isOrtuSama: false, status: "aktif" },
  { id: "m3", nama: "Citra Lestari", desa: "Fajar", kelompok: "Fajar B", pendidikan: "Sarjana", noTelp: "081234567892", kategoriMudaMudi: "pribumi", domisiliAnak: "Jl. Duri No 5", isOrtuSama: true, status: "pending" },
  { id: "m4", nama: "Dedi Hermawan", desa: "Cengkareng Timur", kelompok: "Timur A", pendidikan: "Sedang menempuh perguruan tinggi", noTelp: "081234567893", kategoriMudaMudi: "perantauan", domisiliAnak: "Kontrakan Timur", isOrtuSama: false, status: "aktif" },
  { id: "m5", nama: "Eka Putri", desa: "Fajar", kelompok: "Fajar C", pendidikan: "SMA", noTelp: "081234567894", kategoriMudaMudi: "pribumi", domisiliAnak: "Jl. Fajar No 8", isOrtuSama: true, status: "aktif" },
];

// ── QR Absensi modal (kartu template + download PNG) ──
type QrTarget = { level: "daerah" | "desa" | "kelompok"; nama: string };

function QrModal({ target, onClose }: { target: QrTarget; onClose: () => void }) {
  const [busy, setBusy] = useState(false);
  const value = `gencar-absen|${target.level}|${target.nama}`;

  async function download() {
    const node = document.getElementById("qr-template-card") as HTMLElement | null;
    if (!node) return;
    setBusy(true);
    try {
      const w = Math.ceil(node.offsetWidth);
      const h = Math.ceil(node.offsetHeight);
      const scale = 3;
      const dataUrl = await toPng(node, {
        cacheBust: true,
        pixelRatio: scale,
        width: w,
        height: h,
        canvasWidth: w * scale,
        canvasHeight: h * scale,
        // transparent biar sudut rounded nggak ketutup kotak putih di curve
        backgroundColor: null as unknown as string,
        style: { margin: "0", transform: "none", boxShadow: "none" },
      });
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `qr-absen-${target.nama.toLowerCase().replace(/\s+/g, "-")}.png`;
      a.click();
    } finally {
      setBusy(false);
    }
  }

  return (
    <AdminModal title="QR Absensi" onClose={onClose} className="qr-modal">
      <div>

        <div id="qr-template-card" style={{
          borderRadius: 18,
          overflow: "hidden",
          border: "1px solid var(--line)",
          background: "#fff",
          maxWidth: 320,
          margin: "0 auto",
        }}>
          <div style={{
            background: "var(--ink)",
            padding: "14px 16px",
            display: "flex", alignItems: "center", gap: 10,
          }}>
            <div style={{
              width: 34, height: 34, borderRadius: 10,
              background: "var(--primary)", color: "#fff",
              display: "grid", placeItems: "center",
              fontWeight: 800, fontSize: 15,
            }}>G</div>
            <div>
              <div style={{ color: "#fff", fontWeight: 800, fontSize: 14, letterSpacing: "-0.01em" }}>GENCAR</div>
              <div style={{ color: "rgba(255,255,255,0.62)", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>QR Absensi Kegiatan</div>
            </div>
          </div>

          <div style={{ padding: "20px 16px 16px", display: "grid", justifyItems: "center", gap: 10, background: "#fff" }}>
            <span className="pill pill-slate">{target.level}</span>
            <QRCodeCanvas value={value} size={196} level="M" includeMargin={false} bgColor="#ffffff" fgColor="#1b0f0a" />
            <div style={{ fontWeight: 800, fontSize: 15, textAlign: "center", lineHeight: 1.25 }}>{target.nama}</div>
          </div>

          <div style={{
            borderTop: "1px dashed var(--line)",
            background: "var(--bg)",
            padding: "10px 16px",
            textAlign: "center",
            fontSize: 11,
            color: "var(--text-secondary)",
            fontWeight: 600,
          }}>
            Scan untuk absensi &bull; Daerah Cengkareng
          </div>
        </div>

        <p className="muted" style={{ textAlign: "center", marginTop: 12, marginBottom: 0 }}>
          Download dapat file PNG utuh (frame + QR), siap diprint / dibagikan ke grup.
        </p>

        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <button className="btn btn-ghost" style={{ flex: 1 }} onClick={onClose}>Tutup</button>
          <button className="btn btn-primary" style={{ flex: 1 }} disabled={busy} onClick={download}>
            {busy ? "Menyiapkan..." : "Download PNG"}
          </button>
        </div>
      </div>
    </AdminModal>
  );
}

// ── Statistik (mock data — frontend only, no API) ── recharts
type StatFilter = {
  waktu: "harian" | "mingguan" | "bulanan" | "tahunan";
  wilayah: "semua" | "daerah" | "desa" | "kelompok";
  kategori: "semua" | Kategori;
  kategoriMudaMudi: "semua" | "pribumi" | "perantauan";
  jenisKelamin: "semua" | "L" | "P";
};

const STAT_MOCK = {
  kpi: { totalAnggota: 342, hadirRate: 78, totalKegiatan: 48, avgPerKegiatan: 26 },
  tren: [
    { label: "Jan", hadir: 22, izin: 4, alpha: 2 },
    { label: "Feb", hadir: 28, izin: 3, alpha: 1 },
    { label: "Mar", hadir: 24, izin: 6, alpha: 3 },
    { label: "Apr", hadir: 30, izin: 2, alpha: 1 },
    { label: "Mei", hadir: 26, izin: 5, alpha: 2 },
  ],
  komposisi: [
    { name: "Hadir", value: 130, color: "#16a34a" },
    { name: "Izin", value: 20, color: "#f59e0b" },
    { name: "Alpha", value: 9, color: "#ef4444" },
  ],
  byGender: [
    { label: "Laki-laki", value: 82, color: "#3b82f6" },
    { label: "Perempuan", value: 77, color: "#ec4899" },
  ],
  byMudaMudi: [
    { label: "Pribumi", value: 95, color: "#8b5cf6" },
    { label: "Perantauan", value: 64, color: "#06b6d4" },
  ],
  byDesa: [
    { label: "Fajar", value: 88 },
    { label: "Cengkareng Timur", value: 71 },
  ],
  byPendidikan: [
    { label: "SMA", value: 62 },
    { label: "SMP", value: 41 },
    { label: "Sarjana", value: 28 },
    { label: "SD", value: 18 },
  ],
};

void ["#16a34a", "#f59e0b", "#ef4444", "#3b82f6", "#ec4899", "#8b5cf6", "#06b6d4"] as unknown as void;

function StatistikPage() {
  const [f, setF] = useState<StatFilter>({ waktu: "bulanan", wilayah: "semua", kategori: "semua", kategoriMudaMudi: "semua", jenisKelamin: "semua" });
  const isMobile = useIsMobile();
  const [live, setLive] = useState<{
    summary: { totalGenerus: number; totalKegiatan: number; totalAbsensi: number; hadir: number; izin: number; alpha: number; hadirRate: number };
    member: { byGender: { name: string; value: number }[]; byMudaMudi: { name: string; value: number }[]; byDesa: { name: string; value: number }[]; byPendidikan: { name: string; value: number }[] };
    absensi: { byKeterangan: { name: string; value: number }[]; timeSeries: { date: string; hadir: number; izin: number; alpha: number; total: number }[] };
    kegiatan: { total: number; byKategori: { name: string; value: number }[]; monthly: { name: string; value: number }[] };
  } | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsErr, setStatsErr] = useState<string | null>(null);

  // Fetch live statistik — additive; fallback to STAT_MOCK if 401/err
  useEffect(() => {
    let hasToken = false;
    try { hasToken = Boolean(localStorage.getItem("token")); } catch {}
    if (!hasToken) return;
    let cancel = false;
    const params = new URLSearchParams();
    if (f.kategori !== "semua") params.set("kategoriAcara", f.kategori);
    if (f.kategoriMudaMudi !== "semua") params.set("kategoriMudaMudi", f.kategoriMudaMudi);
    if (f.jenisKelamin !== "semua") params.set("jenisKelamin", f.jenisKelamin);
    // wilayah map: desa/kelompok currently "all" — skip unless spesifik (future: desa dropdown)
    setStatsLoading(true);
    setStatsErr(null);
    void apiFetch<unknown>(`/api/statistik?${params.toString()}`)
      .then((raw: unknown) => {
        if (cancel) return;
        const j = raw as {
          summary?: { totalGenerus: number; totalKegiatan: number; totalAbsensi: number; hadir: number; izin: number; alpha: number; hadirRate: number };
          member?: { byGender: unknown[]; byMudaMudi: unknown[]; byDesa: unknown[]; byPendidikan: unknown[] };
          absensi?: { byKeterangan: unknown[]; timeSeries: unknown[] };
          kegiatan?: { total: number; byKategori: unknown[]; monthly: unknown[] };
        };
        if (j && j.summary) {
          setLive({
            summary: j.summary,
            member: {
              byGender: (j.member?.byGender as { name: string; value: number }[]) ?? [],
              byMudaMudi: (j.member?.byMudaMudi as { name: string; value: number }[]) ?? [],
              byDesa: (j.member?.byDesa as { name: string; value: number }[]) ?? [],
              byPendidikan: (j.member?.byPendidikan as { name: string; value: number }[]) ?? [],
            },
            absensi: {
              byKeterangan: (j.absensi?.byKeterangan as { name: string; value: number }[]) ?? [],
              timeSeries: (j.absensi?.timeSeries as { date: string; hadir: number; izin: number; alpha: number; total: number }[]) ?? [],
            },
            kegiatan: {
              total: j.kegiatan?.total ?? 0,
              byKategori: (j.kegiatan?.byKategori as { name: string; value: number }[]) ?? [],
              monthly: (j.kegiatan?.monthly as { name: string; value: number }[]) ?? [],
            },
          });
        }
      })
      .catch((e: unknown) => {
        if (cancel) return;
        const msg = e instanceof Error ? e.message : String(e);
        if (!msg.includes("401")) setStatsErr(msg);
      })
      .finally(() => { if (!cancel) setStatsLoading(false); });
    return () => { cancel = true; };
  }, [f.kategori, f.kategoriMudaMudi, f.jenisKelamin]);

  // Keep filtered for display count (client-only fallback); live counts drive charts
  const filtered = useMemo(() => {
    let list = DEMO_MEMBERS;
    if (f.kategoriMudaMudi !== "semua") list = list.filter((m) => m.kategoriMudaMudi === f.kategoriMudaMudi);
    if (f.jenisKelamin !== "semua") list = list.filter((m) => (f.jenisKelamin === "L" ? m.nama.length % 2 === 0 : m.nama.length % 2 === 1));
    return list;
  }, [f]);

  const totalFiltered = filtered.length;
  const s = live; // alias

  return (
    <div className="statistik-page" style={{ minWidth: 0 }}>
      <div className="page-header">
        <div>
          <h1>Statistik</h1>
          <div className="page-header-sub">Ringkasan kehadiran &amp; sebaran anggota{s ? " · data live" : statsLoading ? " · memuat…" : " · demo"} {statsErr && `— ${statsErr.slice(0, 80)}`}</div>
        </div>
      </div>

      <div className="card statistik-filters" style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", marginBottom: 16 }}>
        <span className="muted" style={{ fontWeight: 700, fontSize: 12, flexShrink: 0 }}>FILTER</span>
        <Select value={f.waktu} onChange={(v) => setF({ ...f, waktu: v as StatFilter["waktu"] })} ariaLabel="Waktu" options={[{ value: "harian", label: "Harian" }, { value: "mingguan", label: "Mingguan" }, { value: "bulanan", label: "Bulanan" }, { value: "tahunan", label: "Tahunan" }]} />
        <Select value={f.wilayah} onChange={(v) => setF({ ...f, wilayah: v as StatFilter["wilayah"] })} ariaLabel="Wilayah" options={[{ value: "semua", label: "Semua wilayah" }, { value: "daerah", label: "Daerah" }, { value: "desa", label: "Desa" }, { value: "kelompok", label: "Kelompok" }]} />
        <Select value={f.kategori} onChange={(v) => setF({ ...f, kategori: v as StatFilter["kategori"] })} ariaLabel="Jenis kegiatan" options={[{ value: "semua", label: "Semua jenis" }, { value: "sambung_rutin", label: "Sambung Rutin" }, { value: "keakraban", label: "Keakraban" }, { value: "pemantapan", label: "Pemantapan" }, { value: "lainnya", label: "Lainnya" }]} />
        <Select value={f.kategoriMudaMudi} onChange={(v) => setF({ ...f, kategoriMudaMudi: v as StatFilter["kategoriMudaMudi"] })} ariaLabel="Kategori" options={[{ value: "semua", label: "Semua kategori" }, { value: "pribumi", label: "Pribumi" }, { value: "perantauan", label: "Perantauan" }]} />
        <Select value={f.jenisKelamin} onChange={(v) => setF({ ...f, jenisKelamin: v as StatFilter["jenisKelamin"] })} ariaLabel="JK" options={[{ value: "semua", label: "Semua JK" }, { value: "L", label: "Laki-laki" }, { value: "P", label: "Perempuan" }]} />
        <span className="pill pill-slate statistik-filter-count">{totalFiltered} anggota (filter)</span>
      </div>

      {/* ═══ SEKSI 1: DATA KEHADIRAN ═══ */}
      <div className="statistik-section-head">
        <span className="kpi-icon kpi-icon--emerald"><IcoCalendar size={18} /></span>
        <div>
          <h2>Data Kehadiran</h2>
          <p>Rekap absensi dari seluruh kegiatan — hadir, izin, alpha</p>
        </div>
      </div>

      <div className="kpi" style={{ marginBottom: 16 }}>
        {s ? (
          <>
            <KpiCard icon={<span className="kpi-icon kpi-icon--slate"><IcoCalendar size={18} /></span>} label="Hadir Rate" value={`${s.summary.hadirRate}%`} />
            <KpiCard icon={<span className="kpi-icon kpi-icon--emerald"><IcoUsers size={18} /></span>} label="Total Absensi" value={s.summary.totalAbsensi} />
            <KpiCard icon={<span className="kpi-icon kpi-icon--amber"><IcoBarChart size={18} /></span>} label="Total Kegiatan" value={s.summary.totalKegiatan} />
            <KpiCard icon={<span className="kpi-icon kpi-icon--peach"><IcoMapPin size={18} /></span>} label="Rata-rata / Kegiatan" value={s.summary.totalKegiatan > 0 ? (s.summary.totalAbsensi / s.summary.totalKegiatan).toFixed(1) : "—"} />
          </>
        ) : (
          <>
            <KpiCard icon={<span className="kpi-icon kpi-icon--slate"><IcoCalendar size={18} /></span>} label="Hadir Rate" value={`${STAT_MOCK.kpi.hadirRate}%`} />
            <KpiCard icon={<span className="kpi-icon kpi-icon--emerald"><IcoUsers size={18} /></span>} label="Total Absensi" value={159} />
            <KpiCard icon={<span className="kpi-icon kpi-icon--amber"><IcoBarChart size={18} /></span>} label="Total Kegiatan" value={STAT_MOCK.kpi.totalKegiatan} />
            <KpiCard icon={<span className="kpi-icon kpi-icon--peach"><IcoMapPin size={18} /></span>} label="Rata-rata / Kegiatan" value={STAT_MOCK.kpi.avgPerKegiatan} />
          </>
        )}
      </div>

      {/* Tren + Komposisi — single col on mobile */}
      <div className="statistik-grid-2" style={{ display: "grid", gap: 16, marginBottom: 24 }}>
        <div className="card" style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 800, marginBottom: 4 }}>Tren Kehadiran{s ? " (live)" : " per Bulan"}</div>
          <div className="muted" style={{ marginBottom: 8 }}>{s && s.absensi.timeSeries.length ? "Hadir / Izin / Alpha per tanggal" : "Hadir / Izin / Alpha per bulan"}</div>
          <div style={{ height: isMobile ? 200 : 220, minWidth: 0 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={(s && s.absensi.timeSeries.length ? s.absensi.timeSeries : (STAT_MOCK.tren as unknown[])) as unknown[]}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey={(s && s.absensi.timeSeries.length ? "date" : "label") as string} tick={{ fontSize: isMobile ? 10 : 12 }} />
                <YAxis tick={{ fontSize: isMobile ? 10 : 12 }} width={isMobile ? 28 : 36} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: isMobile ? 11 : 12 }} />
                <Area type="linear" dataKey="hadir" stroke="#16a34a" fill="#16a34a" fillOpacity={0.14} strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 4 }} />
                <Area type="linear" dataKey="izin" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.12} strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 4 }} />
                <Area type="linear" dataKey="alpha" stroke="#ef4444" fill="#ef4444" fillOpacity={0.10} strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 4 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card" style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 800, marginBottom: 4 }}>Komposisi Kehadiran</div>
          <div className="muted" style={{ marginBottom: 8 }}>Hadir / Izin / Alpha{s ? " (live)" : ""}</div>
          <div style={{ height: isMobile ? 200 : 220, minWidth: 0 }}>
            {s && s.absensi.byKeterangan.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart margin={{ top: 8, right: 16, bottom: 8, left: 16 }}>
                  <Pie data={s.absensi.byKeterangan.map((r) => ({ name: r.name, value: r.value, color: r.name === "hadir" ? "#16a34a" : r.name === "izin" ? "#f59e0b" : "#ef4444" }))} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={isMobile ? 58 : 74} labelLine={false} label={false}>
                    {s.absensi.byKeterangan.map((e, i) => (
                      <Cell key={i} fill={e.name === "hadir" ? "#16a34a" : e.name === "izin" ? "#f59e0b" : "#ef4444"} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: isMobile ? 11 : 12 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart margin={{ top: 8, right: 16, bottom: 8, left: 16 }}>
                  <Pie data={STAT_MOCK.komposisi} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={isMobile ? 58 : 74} labelLine={false} label={false}>
                    {STAT_MOCK.komposisi.map((e, i) => (
                      <Cell key={i} fill={e.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: isMobile ? 11 : 12 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* ═══ SEKSI 2: KOMPOSISI MEMBER ═══ */}
      <div className="statistik-section-head">
        <span className="kpi-icon kpi-icon--slate"><IcoUsers size={18} /></span>
        <div>
          <h2>Komposisi Member</h2>
          <p>Sebaran demografi anggota terdaftar — terpisah dari data kehadiran</p>
        </div>
      </div>

      <div className="kpi" style={{ marginBottom: 16 }}>
        {s ? (
          <>
            <KpiCard icon={<span className="kpi-icon kpi-icon--emerald"><IcoUsers size={18} /></span>} label="Total Anggota" value={s.summary.totalGenerus} />
            <KpiCard icon={<span className="kpi-icon kpi-icon--peach"><IcoUsers size={18} /></span>} label="Pribumi" value={(s.member.byMudaMudi.find((x) => x.name === "pribumi") ?? { value: 0 }).value} />
            <KpiCard icon={<span className="kpi-icon kpi-icon--slate"><IcoMapPin size={18} /></span>} label="Perantauan" value={(s.member.byMudaMudi.find((x) => x.name === "perantauan") ?? { value: 0 }).value} />
            <KpiCard icon={<span className="kpi-icon kpi-icon--amber"><IcoMapPin size={18} /></span>} label="Jumlah Desa" value={s.member.byDesa.length} />
          </>
        ) : (
          <>
            <KpiCard icon={<span className="kpi-icon kpi-icon--emerald"><IcoUsers size={18} /></span>} label="Total Anggota" value={STAT_MOCK.kpi.totalAnggota} />
            <KpiCard icon={<span className="kpi-icon kpi-icon--peach"><IcoUsers size={18} /></span>} label="Pribumi" value={STAT_MOCK.byMudaMudi[0].value} />
            <KpiCard icon={<span className="kpi-icon kpi-icon--slate"><IcoMapPin size={18} /></span>} label="Perantauan" value={STAT_MOCK.byMudaMudi[1].value} />
            <KpiCard icon={<span className="kpi-icon kpi-icon--amber"><IcoMapPin size={18} /></span>} label="Jumlah Desa" value={STAT_MOCK.byDesa.length} />
          </>
        )}
      </div>

      {/* Sebaran — 1 col on mobile, 2 on tablet, 3 on desktop */}
      <div className="statistik-grid-3" style={{ display: "grid", gap: 16, marginBottom: 16 }}>
        <div className="card" style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 800, marginBottom: 8 }}>Jenis Kelamin {s ? " · live" : ""}</div>
          <div style={{ height: isMobile ? 160 : 180, minWidth: 0 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={(s && s.member.byGender.length ? s.member.byGender.map((r) => ({ label: r.name, value: r.value, color: r.name === "L" ? "#3b82f6" : "#ec4899" })) : (STAT_MOCK.byGender as unknown[])) as unknown[]}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="label" tick={{ fontSize: isMobile ? 10 : 12 }} interval={0} angle={isMobile ? -12 : 0} dy={isMobile ? 8 : 0} height={isMobile ? 36 : 30} />
                <YAxis tick={{ fontSize: isMobile ? 10 : 12 }} width={isMobile ? 28 : 32} />
                <Tooltip />
                <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                  {((s && s.member.byGender.length ? s.member.byGender.map((r) => ({ color: r.name === "L" ? "#3b82f6" : "#ec4899" })) : STAT_MOCK.byGender) as { color: string }[]).map((e, i) => (
                    <Cell key={i} fill={e.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="card" style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 800, marginBottom: 8 }}>Pribumi vs Perantauan {s ? " · live" : ""}</div>
          <div style={{ height: isMobile ? 180 : 180, minWidth: 0 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart margin={{ top: 8, right: 16, bottom: 8, left: 16 }}>
                <Pie data={(s && s.member.byMudaMudi.length ? s.member.byMudaMudi.map((r) => ({ label: r.name, value: r.value, color: r.name === "pribumi" ? "#8b5cf6" : "#06b6d4" })) : (STAT_MOCK.byMudaMudi as unknown[])) as unknown[]} dataKey="value" nameKey="label" cx="50%" cy="50%" outerRadius={isMobile ? 56 : 66} labelLine={false} label={false}>
                  {((s && s.member.byMudaMudi.length ? s.member.byMudaMudi.map((r) => ({ color: r.name === "pribumi" ? "#8b5cf6" : "#06b6d4" })) : STAT_MOCK.byMudaMudi) as { color: string }[]).map((e, i) => (
                    <Cell key={i} fill={e.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: isMobile ? 11 : 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="card" style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 800, marginBottom: 8 }}>Per Desa {s ? "· live" : ""}</div>
          <div style={{ height: isMobile ? 160 : 180, minWidth: 0 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={(s && s.member.byDesa.length ? s.member.byDesa.map((r) => ({ label: r.name, value: r.value })) : (STAT_MOCK.byDesa as unknown[])) as unknown[]} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis type="number" tick={{ fontSize: isMobile ? 10 : 12 }} />
                <YAxis type="category" dataKey="label" width={isMobile ? 90 : 110} tick={{ fontSize: isMobile ? 10 : 12 }} />
                <Tooltip />
                <Bar dataKey="value" fill="#06b6d4" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="card" style={{ minWidth: 0 }}>
        <div style={{ fontWeight: 800, marginBottom: 8 }}>Per Pendidikan (Top) {s && (s.member.byPendidikan?.length ?? 0) > 0 ? "· live" : ""}</div>
        <div style={{ height: isMobile ? 180 : 200, minWidth: 0 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={(s && s.member.byPendidikan?.length ? s.member.byPendidikan : (STAT_MOCK.byPendidikan as unknown[])) as unknown[]}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey={s && s.member.byPendidikan?.length ? "name" : "label"} tick={{ fontSize: isMobile ? 10 : 12 }} interval={0} angle={isMobile ? -14 : 0} dy={10} height={isMobile ? 42 : 30} />
              <YAxis tick={{ fontSize: isMobile ? 10 : 12 }} width={isMobile ? 28 : 32} />
              <Tooltip />
              <Bar dataKey="value" fill="#f59e0b" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="muted" style={{ marginTop: 8, fontSize: 11 }}>{s ? "Data live dari /api/statistik." : "Demo — akan diganti data live saat login."}</div>
      </div>
    </div>
  );
}

// ── Admin pages (desktop-first) ──
function AdminShell({
  page, setPage, children,
}: {
  page: string; setPage: (p: string) => void; children: React.ReactNode;
}) {
  const [pendingCount, setPendingCount] = useState(0);
  useEffect(() => {
    let cancel = false;
    let hadAuthOnce = false;
    const load = async () => {
      try {
        const raw: unknown = await apiFetch("/api/admin/profile-requests?status=pending");
        hadAuthOnce = true;
        const unwrapped = unwrapList(raw);
        const list = Array.isArray(raw) ? (raw as unknown[]) : unwrapped.data;
        if (!cancel) setPendingCount(list.length);
      } catch (e: unknown) {
        const status = (e as { status?: number })?.status;
        // 401 = not logged in — stop polling to avoid spam
        if (status === 401 && !hadAuthOnce) {
          if (!cancel) setPendingCount(0);
          return;
        }
      }
    };
    void load();
    let id: number | null = null;
    const startPoll = () => {
      if (id != null) return;
      id = window.setInterval(() => void load(), 60000);
    };
    // Only poll when pengajuan page is active or after first success
    if (page === "pengajuan") startPoll();
    const onFocus = () => void load();
    const onRefresh = () => {
      hadAuthOnce = true;
      void load();
      startPoll();
    };
    window.addEventListener("focus", onFocus);
    window.addEventListener("pengajuan:refresh" as unknown as string, onRefresh);
    const onVis = () => { if (document.visibilityState === "visible") void load(); };
    document.addEventListener("visibilitychange", onVis);
    return () => { cancel = true; if (id != null) window.clearInterval(id); window.removeEventListener("focus", onFocus); window.removeEventListener("pengajuan:refresh" as unknown as string, onRefresh); document.removeEventListener("visibilitychange", onVis); };
  }, [page]);
  const navItems: { key: string; label: string; icon: React.ReactNode; badge?: number }[] = [
    { key: "anggota", label: "Anggota", icon: <IcoUsers /> },
    { key: "kegiatan", label: "Kegiatan", icon: <IcoCalendar /> },
    { key: "pengajuan", label: "Pengajuan", icon: <IcoFileCheck />, badge: pendingCount },
    { key: "users", label: "User", icon: <IcoShield /> },
    { key: "wilayah", label: "Wilayah", icon: <IcoMapPin /> },
    { key: "cms", label: "CMS", icon: <IcoFileText /> },
    { key: "statistik", label: "Statistik", icon: <IcoBarChart /> },
  ];
  return (
    <div className="admin-shell">
      <nav className="admin-sidebar" aria-label="Admin navigation">
        <div className="sidebar-logo">
          <div className="brand-mark">G</div>
          <span className="sidebar-brand-text">Gencar</span>
        </div>
        <div className="sidebar-divider" />
        {navItems.map((it) => (
          <button
            key={it.key}
            aria-label={it.label}
            aria-current={page === it.key ? "page" : undefined}
            className={page === it.key ? "active" : ""}
            onClick={() => setPage(it.key)}
            style={{ position: "relative" }}
          >
            {it.icon} <span>{it.label}</span>
            {it.badge != null && it.badge > 0 && (
              <span
                aria-label={`${it.badge} menunggu`}
                style={{
                  marginLeft: "auto",
                  minWidth: 20,
                  height: 20,
                  padding: "0 6px",
                  borderRadius: 999,
                  background: page === it.key ? "#fff" : "var(--primary)",
                  color: page === it.key ? "var(--primary)" : "#fff",
                  fontSize: 11,
                  fontWeight: 800,
                  display: "inline-grid",
                  placeItems: "center",
                  lineHeight: 1,
                }}
              >
                {it.badge > 99 ? "99+" : it.badge}
              </span>
            )}
          </button>
        ))}
      </nav>
      <main className="admin-main">{children}</main>
    </div>
  );
}

function _AdminLogoutButton_unused() {
  void useAuth;
  void useNavigate;
  return null as unknown as React.ReactElement;
}
void _AdminLogoutButton_unused;


function AnggotaFilterModal({
  open,
  onClose,
  statusFilter, setStatusFilter,
  kategoriFilter, setKategoriFilter,
  desaFilter, setDesaFilter,
  kelompokFilter, setKelompokFilter,
  desaOptions, kelompokOptions,
}: {
  open: boolean;
  onClose: () => void;
  statusFilter: string; setStatusFilter: (v: string) => void;
  kategoriFilter: string; setKategoriFilter: (v: string) => void;
  desaFilter: string; setDesaFilter: (v: string) => void;
  kelompokFilter: string; setKelompokFilter: (v: string) => void;
  desaOptions: string[];
  kelompokOptions: string[];
}) {
  if (!open) return null;
  const hasActive = statusFilter !== "semua" || kategoriFilter !== "semua" || desaFilter !== "Semua" || kelompokFilter !== "semua";
  const reset = () => { setStatusFilter("semua"); setKategoriFilter("semua"); setDesaFilter("Semua"); setKelompokFilter("semua"); };
  return (
    <AdminModal title="Filter Anggota" onClose={onClose} className="filter-modal">
      <div className="filter-groups">
        <div className="filter-group">
          <span className="filter-label">Status</span>
          <div className="filter-chips">
            {(["semua", "aktif", "pending"] as const).map((v) => (
              <button key={v} type="button" className={`chip ${statusFilter === v ? "active" : ""}`} onClick={() => setStatusFilter(v)}>{v === "semua" ? "Semua" : v}</button>
            ))}
          </div>
        </div>
        <div className="filter-group">
          <span className="filter-label">Kategori</span>
          <div className="filter-chips">
            {(["semua", "pribumi", "perantauan"] as const).map((v) => (
              <button key={v} type="button" className={`chip ${kategoriFilter === v ? "active" : ""}`} onClick={() => setKategoriFilter(v)}>{v === "semua" ? "Semua" : v}</button>
            ))}
          </div>
        </div>
        <div className="filter-group">
          <span className="filter-label">Desa</span>
          <Select value={desaFilter} onChange={setDesaFilter} ariaLabel="Desa" options={[{ value: "Semua", label: "Semua desa" }, ...desaOptions.map((d) => ({ value: d, label: d }))]} />
        </div>
        <div className="filter-group">
          <span className="filter-label">Kelompok</span>
          <Select value={kelompokFilter} onChange={setKelompokFilter} ariaLabel="Kelompok" options={[{ value: "semua", label: "Semua kelompok" }, ...kelompokOptions.map((k) => ({ value: k, label: k }))]} />
        </div>
      </div>
      <div className="filter-actions">
        <button type="button" className="btn btn-ghost btn-sm" disabled={!hasActive} onClick={reset}>Reset</button>
        <button type="button" className="btn btn-primary btn-sm" onClick={onClose}>Terapkan</button>
      </div>
    </AdminModal>
  );
}

function AnggotaPage({ role: _role }: { role: AdminRole }) {
  const [q, setQ] = useState("");
  const [view, setView] = useState<ViewMode>("list");
  const [showFilter, setShowFilter] = useState(false);
  const [statusFilter, setStatusFilter] = useState("semua");
  const [kategoriFilter, setKategoriFilter] = useState("semua");
  const [desaFilter, setDesaFilter] = useState("Semua");
  const [kelompokFilter, setKelompokFilter] = useState("semua");
  const [showAdd, setShowAdd] = useState(false);
  const [detailMember, setDetailMember] = useState<Member | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [totalMeta, setTotalMeta] = useState<number | null>(null);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [membersErr, setMembersErr] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [desaFilterOpts, setDesaFilterOpts] = useState<{ id: number; nama: string }[]>([]);
  const [kelompokFilterOpts, setKelompokFilterOpts] = useState<{ id: number; nama: string; desaId: number }[]>([]);
  const isMobile = useIsMobile();
  const effectiveView: ViewMode = isMobile ? "card" : view;

  // Fetch desa/kelompok options for filter (public, no auth required)
  useEffect(() => {
    void apiFetch<{ desa?: { id: number; nama: string }[]; kelompok?: { id: number; nama: string; desaId: number }[] } | { id: number; nama: string }[]>("/api/auth/desa")
      .then((j: unknown) => {
        if (Array.isArray(j)) setDesaFilterOpts(j as { id: number; nama: string }[]);
        else if (j && typeof j === "object" && Array.isArray((j as { desa?: unknown[] }).desa)) setDesaFilterOpts(((j as { desa: { id: number; nama: string }[] }).desa) ?? []);
      })
      .catch(() => {});
    void apiFetch<{ id: number; nama: string; desaId: number }[]>("/api/auth/kelompok")
      .then((j: unknown) => {
        if (Array.isArray(j)) setKelompokFilterOpts(j as { id: number; nama: string; desaId: number }[]);
      })
      .catch(() => {});
  }, []);

  // Debounce q
  const [qDebounced, setQDebounced] = useState(q);
  useEffect(() => {
    const t = setTimeout(() => setQDebounced(q), 300);
    return () => clearTimeout(t);
  }, [q]);

  // Reset page on filter change
  useEffect(() => { setPage(1); }, [qDebounced, statusFilter, kategoriFilter, desaFilter, kelompokFilter]);

  // Fetch members from BE — live; cookie-auth (token localStorage optional, not required)
  useEffect(() => {
    const _token = (() => { try { return localStorage.getItem("token"); } catch { return null; } })();
    void _token;
    let cancel = false;
    setLoadingMembers(true);
    setMembersErr(null);
    const params = new URLSearchParams();
    if (qDebounced.trim()) params.set("q", qDebounced.trim());
    if (desaFilter !== "Semua") {
      const hit = desaFilterOpts.find((d) => d.nama === desaFilter);
      if (hit) params.set("desaId", String(hit.id));
      else params.set("desaId", desaFilter);
    }
    if (kelompokFilter !== "semua") {
      const hit = kelompokFilterOpts.find((k) => k.nama === kelompokFilter);
      if (hit) params.set("kelompokId", String(hit.id));
      else params.set("kelompokId", kelompokFilter);
    }
    if (statusFilter !== "semua") params.set("status", statusFilter);
    params.set("page", String(page));
    params.set("limit", String(limit));
    // kategoriMudaMudi client-only for now (no BE column filter yet) — keep client filter
    const url = `/api/generus?${params.toString()}`;
    void apiFetch<unknown>(url)
      .then((raw: unknown) => {
        if (cancel) return;
        const unwrapped = unwrapList<{
          id: string; nama: string; desaNama?: string | null; kelompokNama?: string | null;
          desaId?: number | null; kelompokId?: number | null;
          pendidikan?: string | null; noTelp?: string | null;
          kategoriMudaMudi?: string | null; domisiliAnak?: string | null; isDomisiliOrtuSama?: number | null;
          domisiliOrtu?: string | null;
        }>(raw);
        const mapped: Member[] = unwrapped.data.map((r) => ({
          id: r.id,
          nama: r.nama,
          desa: r.desaNama ?? "",
          kelompok: r.kelompokNama ?? "",
          pendidikan: (r.pendidikan as Member["pendidikan"]) ?? "SMA",
          noTelp: r.noTelp ?? "",
          kategoriMudaMudi: (r.kategoriMudaMudi as Member["kategoriMudaMudi"]) ?? "pribumi",
          domisiliAnak: (r as { domisiliAnak?: string }).domisiliAnak ?? (r as { alamat?: string }).alamat ?? "",
          isOrtuSama: r.isDomisiliOrtuSama == null ? true : Boolean(r.isDomisiliOrtuSama),
          status: "aktif",
        }));
        // Client-side kategori filter (BE not yet indexed)
        const filteredMapped = kategoriFilter !== "semua" ? mapped.filter((m) => m.kategoriMudaMudi === kategoriFilter) : mapped;
        setMembers(filteredMapped.length > 0 ? filteredMapped : mapped.length === 0 ? [] : filteredMapped);
        if (unwrapped.total != null) setTotalMeta(unwrapped.total);
        else if (Array.isArray(raw)) setTotalMeta((raw as unknown[]).length);
        else setTotalMeta(null);
      })
      .catch((e: unknown) => {
        if (cancel) return;
        const msg = e instanceof Error ? e.message : String(e);
        if (String(msg).includes("401") || String(msg).toLowerCase().includes("unauthorized")) {
          setMembers([]);
          setTotalMeta(0);
          setMembersErr("Sesi habis — silakan login ulang.");
          return;
        }
        setMembersErr(msg);
        setMembers([]);
        setTotalMeta(0);
      })
      .finally(() => { if (!cancel) setLoadingMembers(false); });
    return () => { cancel = true; };
  }, [qDebounced, desaFilter, kelompokFilter, statusFilter, page, limit, desaFilterOpts, kelompokFilterOpts, kategoriFilter]);

  // Signal from MemberDetailModal after DELETE — force members reload
  useEffect(() => {
    const token = (() => { try { return localStorage.getItem("token"); } catch { return null; } })();
    void token;
    const handler = () => setPage((p) => p + 1000);
    window.addEventListener("anggota:refresh" as unknown as string, handler as unknown as EventListener);
    return () => window.removeEventListener("anggota:refresh" as unknown as string, handler as unknown as EventListener);
  }, []);

  const filtered = useMemo(() => {
    let list = members;
    if (kategoriFilter !== "semua") list = list.filter((m) => m.kategoriMudaMudi === kategoriFilter);
    return list;
  }, [members, kategoriFilter]);

  const adaFilterAktif = statusFilter !== "semua" || kategoriFilter !== "semua" || desaFilter !== "Semua" || kelompokFilter !== "semua" || q.trim().length > 0;
  const desaOptions = useMemo(() => {
    if (desaFilterOpts.length > 0) return [...new Set(desaFilterOpts.map((d) => d.nama))].sort();
    return [...new Set(members.map((m) => m.desa).filter(Boolean))].sort();
  }, [members, desaFilterOpts]);
  const kelompokOptions = useMemo(() => {
    if (kelompokFilterOpts.length > 0) return [...new Set(kelompokFilterOpts.map((k) => k.nama))].sort();
    return [...new Set(members.map((m) => m.kelompok).filter(Boolean))].sort();
  }, [members, kelompokFilterOpts]);

  return (
    <div>
      <PageHeader title="Anggota" sub="Kelola data anggota muda-mudi" action={<button className="btn btn-primary btn-auto" onClick={() => setShowAdd(true)}>+ Tambah Anggota</button>} />
      {membersErr && (
        <div className="card" style={{ borderColor: "#fecaca", background: "#fef2f2", color: "#991b1b", display: "flex", gap: 8, alignItems: "center", marginBottom: 12 }}>
          <IcoX size={14} /> <span style={{ fontSize: 13, fontWeight: 700, flex: 1 }}>{membersErr}</span>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setMembersErr(null)}>Tutup</button>
        </div>
      )}
      <div className="kpi">
        <KpiCard icon={<span className="kpi-icon kpi-icon--emerald"><IcoUsers size={18} /></span>} label="Total anggota (scope)" value={totalMeta ?? (loadingMembers ? "…" : filtered.length)} />
        <KpiCard icon={<span className="kpi-icon kpi-icon--slate"><IcoShield size={18} /></span>} label="Aktif" value={filtered.filter((m) => m.status === "aktif").length} />
        <KpiCard icon={<span className="kpi-icon kpi-icon--amber"><IcoCalendar size={18} /></span>} label="Pending" value={filtered.filter((m) => m.status === "pending").length} />
        <KpiCard icon={<span className="kpi-icon kpi-icon--peach"><IcoUsers size={18} /></span>} label="Perantauan" value={filtered.filter((m) => m.kategoriMudaMudi === "perantauan").length} />
      </div>

      <div className="admin-toolbar">
        <SearchInput value={q} onChange={setQ} placeholder="Cari nama / no telp / kelompok..." />
        <button
          type="button"
          className={`btn ${showFilter ? "btn-primary has-active" : "btn-ghost"} toolbar-icon-btn`}
          aria-expanded={showFilter}
          aria-haspopup="dialog"
          aria-label="Filter anggota"
          onClick={() => setShowFilter((s) => !s)}
        >
          <IcoFilter size={18} />
          {adaFilterAktif && <span className="filter-count">{(statusFilter !== "semua" ? 1 : 0) + (kategoriFilter !== "semua" ? 1 : 0) + (desaFilter !== "Semua" ? 1 : 0) + (kelompokFilter !== "semua" ? 1 : 0)}</span>}
        </button>
        {!isMobile && (
          <div className="view-toggle" role="group" aria-label="View mode">
            <button className={view === "list" ? "on" : ""} onClick={() => setView("list")} aria-label="Tampilan list" title="List">
              <IcoList size={16} />
            </button>
            <button className={view === "card" ? "on" : ""} onClick={() => setView("card")} aria-label="Tampilan card" title="Card">
              <IcoGrid size={16} />
            </button>
          </div>
        )}
        {totalMeta != null && totalMeta > limit && (
          <div style={{ display: "inline-flex", gap: 6, alignItems: "center", marginLeft: "auto", flexShrink: 0 }}>
            <button type="button" className="btn btn-ghost btn-sm" disabled={page <= 1 || loadingMembers} onClick={() => setPage((p) => Math.max(1, p - 1))}>Prev</button>
            <span className="muted" style={{ fontSize: 12, fontWeight: 700 }}>Hal {page} / {Math.max(1, Math.ceil(totalMeta / limit))}</span>
            <button type="button" className="btn btn-ghost btn-sm" disabled={page >= Math.ceil(totalMeta / limit) || loadingMembers} onClick={() => setPage((p) => p + 1)}>Next</button>
          </div>
        )}
      </div>
      {loadingMembers && <div className="muted" style={{ marginBottom: 10, fontSize: 12 }}>Memuat anggota…</div>}
      <AnggotaFilterModal
        open={showFilter}
        onClose={() => setShowFilter(false)}
        statusFilter={statusFilter} setStatusFilter={setStatusFilter}
        kategoriFilter={kategoriFilter} setKategoriFilter={setKategoriFilter}
        desaFilter={desaFilter} setDesaFilter={setDesaFilter}
        kelompokFilter={kelompokFilter} setKelompokFilter={setKelompokFilter}
        desaOptions={desaOptions}
        kelompokOptions={kelompokOptions}
      />

      {effectiveView === "list" ? (
        <div className="table-wrap">
          <table className="admin-table">
            <caption className="sr-only">Daftar anggota — nama, wilayah, pendidikan, domisili, nomor telepon, status, dan aksi</caption>
            <thead>
              <tr><th scope="col">Nama</th><th scope="col">Wilayah</th><th scope="col">Pendidikan</th><th scope="col">Domisili</th><th scope="col">No Telp</th><th scope="col">Status</th><th scope="col">Aksi</th></tr>
            </thead>
            <tbody>
              {filtered.map((m) => (
                <tr key={m.id}>
                  <td>
                    <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                      <div className="avatar">{m.nama.split(" ").map((w) => w[0]).slice(0, 2).join("")}</div>
                      <div><div style={{ fontWeight: 700 }}>{m.nama}</div><div className="muted">{m.kategoriMudaMudi} · {m.pendidikan}</div></div>
                    </div>
                  </td>
                  <td><span className="pill pill-slate">{m.desa} / {m.kelompok}</span></td>
                  <td>{m.pendidikan}</td>
                  <td title={m.domisiliAnak} style={{ maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {m.domisiliAnak} {m.isOrtuSama ? "" : "· ortu beda"}
                  </td>
                  <td>{m.noTelp}</td>
                  <td><span className={`pill ${m.status === "aktif" ? "pill-emerald" : "pill-amber"}`}>{m.status}</span></td>
                  <td>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button className="btn btn-ghost row-icon-btn" aria-label="Lihat detail" title="Detail" onClick={() => setDetailMember(m)}><IcoEye size={16} /></button>
                      <InlineMagicLinkBtn generusId={m.id} />
                      <button className="btn btn-ghost row-icon-btn" aria-label="Buat QR" title="Buat QR"><IcoQr size={16} /></button>
                      <button
                        className="btn btn-ghost row-icon-btn"
                        aria-label="Hapus anggota"
                        title="Hapus anggota"
                        onClick={async () => {
                          if (!window.confirm(`Hapus anggota "${m.nama}"? Tindakan ini permanen.`)) return;
                          try {
                            await apiFetch(`/api/generus/${encodeURIComponent(m.id)}`, { method: "DELETE" });
                            setMembers((prev) => prev.filter((x) => x.id !== m.id));
                          } catch (e: unknown) {
                            setMembersErr(e instanceof Error ? e.message : String(e));
                          }
                        }}
                      >
                        <IcoTrash size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={7} style={{ textAlign: "center", padding: 24 }} className="muted">Tidak ada anggota di scope ini.</td></tr>}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="cards-grid">
          {filtered.map((m) => (
            <div key={m.id} className="member-card" role="button" tabIndex={0} onClick={() => setDetailMember(m)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setDetailMember(m); } }}>
              <div className="member-card-head">
                <div className="avatar">{m.nama.split(" ").map((w) => w[0]).slice(0, 2).join("")}</div>
                <div className="member-card-head-info">
                  <div className="member-card-name">{m.nama}</div>
                  <div className="muted">{m.desa} / {m.kelompok}</div>
                </div>
                <span className={`pill ${m.status === "aktif" ? "pill-emerald" : "pill-amber"}`}>{m.status}</span>
              </div>

              <div className="member-card-meta">
                <span className="pill pill-slate">{m.kategoriMudaMudi}</span>
                <span className="muted">{m.pendidikan}</span>
              </div>

              <div className="member-card-info">
                <div className="member-info-row">
                  <span className="detail-label">Domisili</span>
                  <span className="member-info-value">{m.domisiliAnak} {m.isOrtuSama ? "(ortu sama)" : "(ortu beda)"}</span>
                </div>
                <div className="member-info-row">
                  <span className="detail-label">No Telp</span>
                  <span className="member-info-value">{m.noTelp}</span>
                </div>
              </div>

              <div className="member-card-actions" onClick={(e) => e.stopPropagation()}>
                <button className="btn btn-ghost row-icon-btn" aria-label="Lihat detail" title="Detail" onClick={() => setDetailMember(m)}><IcoEye size={16} /></button>
                <button className="btn btn-primary row-icon-btn" aria-label="Buat QR" title="Buat QR" style={{ background: "var(--primary)", borderColor: "var(--primary)", color: "#fff" }}><IcoQr size={16} /></button>
              </div>
            </div>
          ))}
          {filtered.length === 0 && <div className="lp-empty-card">Tidak ada anggota di scope ini.</div>}
        </div>
      )}

      {showAdd && <AddMemberModal onClose={() => setShowAdd(false)} onSave={(m) => { setMembers((prev) => [m, ...prev]); setShowAdd(false); }} />}
      {detailMember && (
        <MemberDetailModal
          member={detailMember}
          onClose={() => setDetailMember(null)}
          onMagicLink={(link) => {
            void navigator.clipboard?.writeText(link).then(() => {
              alert(`Link Buka Akses Login (15 menit, sekali pakai) sudah di-copy.\n\n${link}`);
            }).catch(() => {
              alert(`Link Buka Akses Login (15 menit, sekali pakai):\n\n${link}`);
            });
          }}
        />
      )}
    </div>
  );
}

function MemberDetailModal({ member, onClose, onMagicLink }: { member: Member; onClose: () => void; onMagicLink?: (link: string) => void }) {
  const [statsData, setStatsData] = useState<{
    hadir: number;
    izin: number;
    alpha: number;
    rate: number;
    streak: number;
    trophiesCount: number;
    trophies?: string[];
    telatCount?: number;
    avgTelatMenit?: number;
    riwayatTelat?: { id: string; judul?: string; tanggal: string; jamKegiatan: string; jamAbsen: string; menit: number }[];
    riwayat?: { id: string; tanggal: string; jam?: string; keterangan: string; kategoriAcara?: string; tingkat?: string }[];
  } | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [activeModalTab, setActiveModalTab] = useState<"kehadiran" | "streak" | "trophy" | "telat" | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    let cancel = false;
    setLoadingStats(true);
    apiFetch<{ stats?: { hadir: number; izin: number; alpha: number; rate: number; streak: number; trophiesCount: number; trophies?: string[]; telatCount?: number; avgTelatMenit?: number; riwayatTelat?: { id: string; judul?: string; tanggal: string; jamKegiatan: string; jamAbsen: string; menit: number }[]; riwayat?: { id: string; tanggal: string; jam?: string; keterangan: string; kategoriAcara?: string; tingkat?: string }[] } }>(`/api/generus/${member.id}`)
      .then((res) => {
        if (cancel) return;
        if (res && res.stats) {
          setStatsData(res.stats);
        } else {
          setStatsData({
            hadir: 12,
            izin: 1,
            alpha: 0,
            rate: 92,
            streak: 6,
            trophiesCount: 5,
            trophies: ["pertama_kali", "hadir_5", "hadir_10", "streak_5", "zero_telat"],
            telatCount: 2,
            avgTelatMenit: 14,
            riwayatTelat: [
              { id: "t1", tanggal: "2026-05-01", jamKegiatan: "19:30", jamAbsen: "19:48", menit: 18 },
              { id: "t2", tanggal: "2026-04-24", jamKegiatan: "19:30", jamAbsen: "19:40", menit: 10 },
            ],
          });
        }
      })
      .catch(() => {
        if (!cancel) {
          setStatsData({
            hadir: 12,
            izin: 1,
            alpha: 0,
            rate: 92,
            streak: 6,
            trophiesCount: 5,
            trophies: ["pertama_kali", "hadir_5", "hadir_10", "streak_5", "zero_telat"],
            telatCount: 2,
            avgTelatMenit: 14,
            riwayatTelat: [
              { id: "t1", tanggal: "2026-05-01", jamKegiatan: "19:30", jamAbsen: "19:48", menit: 18 },
              { id: "t2", tanggal: "2026-04-24", jamKegiatan: "19:30", jamAbsen: "19:40", menit: 10 },
            ],
          });
        }
      })
      .finally(() => {
        if (!cancel) setLoadingStats(false);
      });
    return () => { cancel = true; };
  }, [member.id]);

  const rows: { label: string; value: string }[] = [
    { label: "Nama", value: member.nama },
    { label: "Desa / Kelompok", value: `${member.desa} / ${member.kelompok}` },
    { label: "Pendidikan", value: member.pendidikan },
    { label: "No Telp", value: member.noTelp },
    { label: "Kategori", value: member.kategoriMudaMudi === "pribumi" ? "Pribumi" : "Perantauan" },
    { label: "Domisili Anak", value: member.domisiliAnak },
    { label: "Status Ortu", value: member.isOrtuSama ? "Domisili ortu sama dengan anak" : "Domisili ortu berbeda" },
  ];

  const streak = statsData?.streak ?? 0;
  const isFlame = streak >= 5;

  const pieStats = [
    { name: "Hadir", value: statsData?.hadir ?? 0, color: "#16a34a" },
    { name: "Izin", value: statsData?.izin ?? 0, color: "#f59e0b" },
    { name: "Alpha", value: statsData?.alpha ?? 0, color: "#ef4444" },
  ].filter((d) => d.value > 0);

  const streakLadders = [
    { min: 0, label: "Pemula", flame: "#94a3b8", bg: "#f8fafc", desc: "Hadir berturut-turut tanpa jeda" },
    { min: 5, label: "Menyala", flame: "#f59e0b", bg: "#fffbeb", desc: "5× hadir beruntun" },
    { min: 10, label: "Konsisten", flame: "#ea580c", bg: "#fff7ed", desc: "10× hadir beruntun" },
    { min: 20, label: "On Fire", flame: "#dc2626", bg: "#fef2f2", desc: "20× hadir beruntun" },
    { min: 40, label: "Legenda", flame: "#7c3aed", bg: "#f5f3ff", desc: "40× hadir beruntun" },
  ];

  const allTrophies = [
    { id: "pertama_kali", file: "kehadiran_1", name: "Langkah Pertama", desc: "Absen pertama kali", rarity: "Common" },
    { id: "hadir_5", file: "kehadiran_5", name: "Rajin", desc: "Hadir 5× total", rarity: "Common" },
    { id: "hadir_10", file: "kehadiran_10", name: "Penuh Semangat", desc: "Hadir 10× total", rarity: "Common" },
    { id: "hadir_25", file: "kehadiran_25", name: "Sulung", desc: "Hadir 25× total", rarity: "Uncommon" },
    { id: "hadir_50", file: "kehadiran_50", name: "Veteran", desc: "Hadir 50× total", rarity: "Rare" },
    { id: "hadir_100", file: "kehadiran_100", name: "Centurion", desc: "Hadir 100× total", rarity: "Epic" },
    { id: "streak_5", file: "streak_5", name: "Menyala", desc: "Streak beruntun 5×", rarity: "Common" },
    { id: "streak_10", file: "streak_10", name: "Konsisten", desc: "Streak beruntun 10×", rarity: "Uncommon" },
    { id: "streak_20", file: "streak_20", name: "On Fire", desc: "Streak beruntun 20×", rarity: "Rare" },
    { id: "streak_40", file: "streak_40", name: "Legenda", desc: "Streak beruntun 40×", rarity: "Legendary" },
    { id: "zero_telat", file: "zero_telat", name: "Tepat Waktu", desc: "0 keterlambatan", rarity: "Common" },
  ];

  return (
    <>
    <AdminModal title="Detail Anggota" onClose={onClose}>
      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 16 }}>
        <div className="avatar" style={{ width: 52, height: 52, fontSize: 16 }}>{member.nama.split(" ").map((w) => w[0]).slice(0, 2).join("")}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 800, fontSize: 16 }}>{member.nama}</div>
          <div style={{ display: "flex", gap: 6, marginTop: 4, flexWrap: "wrap" }}>
            <span className={`pill ${member.status === "aktif" ? "pill-emerald" : "pill-amber"}`}>{member.status}</span>
            <span className="pill pill-slate">{member.kategoriMudaMudi}</span>
          </div>
        </div>
      </div>

      {/* Gamifikasi & Statistik Kehadiran Highlight (Interactive Buttons) */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(4, 1fr)",
        gap: 6,
        background: "var(--surface-sunken, #f8fafc)",
        padding: 8,
        borderRadius: 14,
        border: "1px solid var(--line, #e2e8f0)",
        marginBottom: 16,
        textAlign: "center"
      }}>
        <button
          type="button"
          onClick={() => setActiveModalTab("kehadiran")}
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 2,
            background: "transparent",
            border: "none",
            cursor: "pointer",
            padding: "4px 1px",
            borderRadius: 8,
          }}
          title="Klik untuk melihat diagram kehadiran"
        >
          <span style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", color: "var(--muted, #64748b)" }}>Hadir</span>
          <div style={{ fontSize: 15, fontWeight: 900, color: "#16a34a" }}>
            {loadingStats ? "…" : `${statsData?.rate ?? 0}%`}
          </div>
          <span style={{ fontSize: 9, color: "var(--muted, #64748b)" }}>
            {loadingStats ? "" : `${statsData?.hadir ?? 0}× ↗`}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveModalTab("streak")}
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 2,
            background: "transparent",
            border: "none",
            borderLeft: "1px solid var(--line, #e2e8f0)",
            cursor: "pointer",
            padding: "4px 1px",
            borderRadius: 8,
          }}
          title="Klik untuk melihat detail streak & tier"
        >
          <span style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", color: isFlame ? "#d97706" : "var(--muted, #64748b)" }}>🔥 Streak</span>
          <div style={{ fontSize: 15, fontWeight: 900, color: isFlame ? "#ea580c" : "var(--ink, #0f172a)" }}>
            {loadingStats ? "…" : `${streak}×`}
          </div>
          <span style={{ fontSize: 9, color: isFlame ? "#d97706" : "var(--muted, #64748b)" }}>
            {isFlame ? "Menyala ↗" : "Beruntun ↗"}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveModalTab("telat")}
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 2,
            background: "transparent",
            border: "none",
            borderLeft: "1px solid var(--line, #e2e8f0)",
            borderRight: "1px solid var(--line, #e2e8f0)",
            cursor: "pointer",
            padding: "4px 1px",
            borderRadius: 8,
          }}
          title="Klik untuk melihat riwayat keterlambatan"
        >
          <span style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", color: (statsData?.telatCount ?? 0) > 0 ? "#ea580c" : "var(--muted, #64748b)" }}>⏱️ Telat</span>
          <div style={{ fontSize: 15, fontWeight: 900, color: (statsData?.telatCount ?? 0) > 0 ? "#ea580c" : "#16a34a" }}>
            {loadingStats ? "…" : `${statsData?.avgTelatMenit ?? 0}m`}
          </div>
          <span style={{ fontSize: 9, color: "var(--muted, #64748b)" }}>
            {loadingStats ? "" : `${statsData?.telatCount ?? 0}× acara ↗`}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveModalTab("trophy")}
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 2,
            background: "transparent",
            border: "none",
            cursor: "pointer",
            padding: "4px 1px",
            borderRadius: 8,
          }}
          title="Klik untuk melihat piala & trofi"
        >
          <span style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", color: "var(--muted, #64748b)" }}>🏆 Trophy</span>
          <div style={{ fontSize: 15, fontWeight: 900, color: "#d97706" }}>
            {loadingStats ? "…" : `${statsData?.trophiesCount ?? 0}`}
          </div>
          <span style={{ fontSize: 9, color: "var(--muted, #64748b)" }}>List ↗</span>
        </button>
      </div>

      <div className="detail-rows">
        {rows.map((r) => (
          <div key={r.label} className="detail-row">
            <span className="detail-label">{r.label}</span>
            <span className="detail-value">{r.value}</span>
          </div>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 16 }}>
        <button
          className="btn btn-danger row-icon-btn"
          style={{ width: "100%", justifyContent: "center" }}
          onClick={() => setShowDeleteConfirm(true)}
        >
          <IcoTrash size={14} /> Hapus Anggota
        </button>
        <OpenAccessButton memberId={member.id} memberName={member.nama} onCopied={onMagicLink} />
      </div>
      <div style={{ marginTop: 8 }}>
        <button className="btn btn-primary" style={{ width: "100%" }}>Buat QR</button>
      </div>

      {/* POPUP SUB-MODAL KEHADIRAN */}
      {activeModalTab === "kehadiran" && (
        <div className="modal-backdrop" onClick={() => setActiveModalTab(null)} style={{ zIndex: 1100 }}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 440, width: "calc(100% - 24px)", padding: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <h3 style={{ fontSize: 16, fontWeight: 800, margin: 0 }}>Statistik Kehadiran ({member.nama})</h3>
              <button type="button" className="btn btn-ghost" style={{ padding: 6 }} onClick={() => setActiveModalTab(null)}>✕</button>
            </div>
            
            <div style={{ height: 180, width: "100%", position: "relative" }}>
              {pieStats.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                    <Pie data={pieStats} dataKey="value" nameKey="name" innerRadius={50} outerRadius={75} paddingAngle={4}>
                      {pieStats.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ display: "grid", placeItems: "center", height: "100%", color: "var(--muted)" }}>Belum ada data absensi</div>
              )}
            </div>

            <div style={{ display: "flex", justifyContent: "space-around", marginTop: 12, borderTop: "1px solid var(--line)", paddingTop: 12 }}>
              <div style={{ textAlign: "center" }}>
                <span style={{ fontSize: 11, color: "var(--muted)", display: "block" }}>Hadir</span>
                <b style={{ color: "#16a34a", fontSize: 16 }}>{statsData?.hadir ?? 0}</b>
              </div>
              <div style={{ textAlign: "center" }}>
                <span style={{ fontSize: 11, color: "var(--muted)", display: "block" }}>Izin</span>
                <b style={{ color: "#f59e0b", fontSize: 16 }}>{statsData?.izin ?? 0}</b>
              </div>
              <div style={{ textAlign: "center" }}>
                <span style={{ fontSize: 11, color: "var(--muted)", display: "block" }}>Alpha</span>
                <b style={{ color: "#ef4444", fontSize: 16 }}>{statsData?.alpha ?? 0}</b>
              </div>
            </div>

            <div style={{ marginTop: 16, textAlign: "right" }}>
              <button type="button" className="btn btn-primary" style={{ width: "100%" }} onClick={() => setActiveModalTab(null)}>Tutup</button>
            </div>
          </div>
        </div>
      )}

      {/* POPUP SUB-MODAL STREAK */}
      {activeModalTab === "streak" && (
        <div className="modal-backdrop" onClick={() => setActiveModalTab(null)} style={{ zIndex: 1100 }}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 440, width: "calc(100% - 24px)", padding: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <h3 style={{ fontSize: 16, fontWeight: 800, margin: 0 }}>Jenjang Streak ({member.nama})</h3>
              <button type="button" className="btn btn-ghost" style={{ padding: 6 }} onClick={() => setActiveModalTab(null)}>✕</button>
            </div>

            <div style={{ padding: 12, borderRadius: 12, background: isFlame ? "#fffbeb" : "#f8fafc", border: `1.5px solid ${isFlame ? "#fde68a" : "#e2e8f0"}`, marginBottom: 14, textAlign: "center" }}>
              <span style={{ fontSize: 24 }}>🔥</span>
              <div style={{ fontSize: 20, fontWeight: 900, color: isFlame ? "#ea580c" : "var(--ink)" }}>{streak}× Hadir Beruntun</div>
              <p style={{ fontSize: 12, color: "var(--muted)", margin: "4px 0 0" }}>{isFlame ? "Streak aktif menyala!" : "Pertahankan kehadiran untuk menyalakan api."}</p>
            </div>

            <div style={{ display: "grid", gap: 8, maxHeight: 260, overflowY: "auto", paddingRight: 4 }}>
              {streakLadders.map((t) => {
                const unlocked = streak >= t.min;
                return (
                  <div key={t.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", borderRadius: 10, background: unlocked ? t.bg : "#fff", border: `1px solid ${unlocked ? t.flame : "#e2e8f0"}` }}>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 13, color: unlocked ? t.flame : "var(--ink)" }}>{t.label} ({t.min}×)</div>
                      <div style={{ fontSize: 11, color: "var(--muted)" }}>{t.desc}</div>
                    </div>
                    <div>
                      {unlocked ? <span style={{ color: "#16a34a", fontSize: 12, fontWeight: 800 }}>✓ Tercapai</span> : <span style={{ color: "var(--muted)", fontSize: 11 }}>Terkunci</span>}
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ marginTop: 16 }}>
              <button type="button" className="btn btn-primary" style={{ width: "100%" }} onClick={() => setActiveModalTab(null)}>Tutup</button>
            </div>
          </div>
        </div>
      )}

      {/* POPUP SUB-MODAL TROPHY */}
      {activeModalTab === "trophy" && (
        <div className="modal-backdrop" onClick={() => setActiveModalTab(null)} style={{ zIndex: 1100 }}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 460, width: "calc(100% - 24px)", padding: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <h3 style={{ fontSize: 16, fontWeight: 800, margin: 0 }}>Daftar Trophy ({member.nama})</h3>
              <button type="button" className="btn btn-ghost" style={{ padding: 6 }} onClick={() => setActiveModalTab(null)}>✕</button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: 12, maxHeight: 380, overflowY: "auto", padding: 4 }}>
              {allTrophies.map((tr) => {
                const unlocked = statsData?.trophies?.includes(tr.id) || (tr.id === "pertama_kali" && (statsData?.hadir ?? 0) >= 1) || (tr.id === "hadir_5" && (statsData?.hadir ?? 0) >= 5) || (tr.id === "streak_5" && streak >= 5);
                return (
                  <div
                    key={tr.id}
                    style={{
                      padding: "14px 10px",
                      borderRadius: 16,
                      background: unlocked ? "#fffbeb" : "#f8fafc",
                      border: `1.5px solid ${unlocked ? "#fcd34d" : "#e2e8f0"}`,
                      textAlign: "center",
                      opacity: unlocked ? 1 : 0.6,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 6
                    }}
                  >
                    <div style={{ width: 68, height: 68, display: "grid", placeItems: "center", filter: unlocked ? "drop-shadow(0 4px 10px rgba(217, 119, 6, 0.25))" : "none" }}>
                      <img
                        src={`/achievements/${tr.file}.png`}
                        alt={tr.name}
                        width={60}
                        height={60}
                        loading="lazy"
                        style={{
                          display: "block",
                          filter: unlocked ? "none" : "grayscale(1) opacity(0.45)",
                          objectFit: "contain",
                        }}
                      />
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 800, color: unlocked ? "#92400e" : "var(--muted)" }}>{tr.name}</span>
                    <span style={{ fontSize: 11, color: "var(--muted)", lineHeight: 1.25 }}>{tr.desc}</span>
                    <span style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", padding: "2px 8px", borderRadius: 999, background: unlocked ? "#fde68a" : "#e2e8f0", color: unlocked ? "#78350f" : "#64748b", marginTop: 2 }}>
                      {unlocked ? "Terbuka" : "Terkunci"}
                    </span>
                  </div>
                );
              })}
            </div>

            <div style={{ marginTop: 16 }}>
              <button type="button" className="btn btn-primary" style={{ width: "100%" }} onClick={() => setActiveModalTab(null)}>Tutup</button>
            </div>
          </div>
        </div>
      )}

      {/* POPUP SUB-MODAL TELAT */}
      {activeModalTab === "telat" && (
        <div className="modal-backdrop" onClick={() => setActiveModalTab(null)} style={{ zIndex: 1100 }}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 440, width: "calc(100% - 24px)", padding: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <h3 style={{ fontSize: 16, fontWeight: 800, margin: 0 }}>Riwayat Telat ({member.nama})</h3>
              <button type="button" className="btn btn-ghost" style={{ padding: 6 }} onClick={() => setActiveModalTab(null)}>✕</button>
            </div>

            <div style={{ padding: 12, borderRadius: 12, background: (statsData?.telatCount ?? 0) > 0 ? "#fff7ed" : "#f0fdf4", border: `1.5px solid ${(statsData?.telatCount ?? 0) > 0 ? "#ffedd5" : "#bbf7d0"}`, marginBottom: 14, textAlign: "center" }}>
              <span style={{ fontSize: 24 }}>{(statsData?.telatCount ?? 0) > 0 ? "⏱️" : "✨"}</span>
              <div style={{ fontSize: 18, fontWeight: 900, color: (statsData?.telatCount ?? 0) > 0 ? "#ea580c" : "#16a34a" }}>
                {(statsData?.telatCount ?? 0) > 0 ? `Rata-rata telat ${statsData?.avgTelatMenit ?? 0} menit` : "Selalu tepat waktu!"}
              </div>
              <p style={{ fontSize: 12, color: "var(--muted)", margin: "4px 0 0" }}>
                {(statsData?.telatCount ?? 0) > 0 ? `Tercatat ${statsData?.telatCount ?? 0} kali terlambat hadir dari total kegiatan.` : "Tidak ada keterlambatan tercatat."}
              </p>
            </div>

            <div style={{ display: "grid", gap: 8, maxHeight: 260, overflowY: "auto", paddingRight: 4 }}>
              {(statsData?.riwayatTelat ?? []).length > 0 ? (
                (statsData?.riwayatTelat ?? []).map((t) => (
                  <div key={t.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", borderRadius: 10, background: "#fff", border: "1px solid var(--line)" }}>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 13 }}>{t.tanggal}</div>
                      <div style={{ fontSize: 11, color: "var(--muted)" }}>Jadwal: {t.jamKegiatan} · Hadir: {t.jamAbsen}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <span style={{ color: "#ea580c", fontSize: 12, fontWeight: 900, background: "#fff7ed", padding: "2px 8px", borderRadius: 999, border: "1px solid #ffedd5" }}>
                        +{t.menit} mnt
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ textAlign: "center", padding: "16px 0", color: "var(--muted)", fontSize: 13 }}>
                  Bersih! Tidak ada riwayat telat.
                </div>
              )}
            </div>

            <div style={{ marginTop: 16 }}>
              <button type="button" className="btn btn-primary" style={{ width: "100%" }} onClick={() => setActiveModalTab(null)}>Tutup</button>
            </div>
          </div>
        </div>
      )}
    </AdminModal>

      {showDeleteConfirm && (
        <DeleteAnggotaConfirmModal
          nama={member.nama}
          onClose={() => setShowDeleteConfirm(false)}
          onConfirm={async () => {
            await apiFetch(`/api/generus/${encodeURIComponent(member.id)}`, { method: "DELETE" });
            onClose();
            try { window.dispatchEvent(new Event("anggota:refresh")); } catch {}
          }}
        />
      )}
    </>
  );
}

function DeleteAnggotaConfirmModal({
  nama,
  onClose,
  onConfirm,
}: {
  nama: string;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}) {
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const isMatch = typed.trim().toLowerCase() === "hapus";

  async function handleConfirm() {
    if (!isMatch || busy) return;
    setBusy(true);
    setErr(null);
    try {
      await onConfirm();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setErr(msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AdminModal title="Hapus Anggota?" onClose={onClose}>
      <div style={{ display: "grid", gap: 14 }}>
        <div style={{ padding: "12px 14px", borderRadius: 12, background: "#fffbeb", border: "1px solid #fde68a", color: "#78350f", fontSize: 13, lineHeight: 1.5 }}>
          <strong>{nama}</strong> akan dihapus permanen. Data <strong>generus</strong> dan <strong>akun login</strong> akan terhapus.
        </div>
        <div style={{ fontSize: 13, lineHeight: 1.5 }}>
          Ketik <strong style={{ fontFamily: "monospace", background: "#f1f5f9", padding: "2px 6px", borderRadius: 6 }}>hapus</strong> untuk melanjutkan.
        </div>
        <div className="field">
          <label>Konfirmasi *</label>
          <input value={typed} onChange={(e) => setTyped(e.target.value)} placeholder="hapus" disabled={busy} autoComplete="off" autoFocus />
        </div>
        {err && (
          <div style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid #fecaca", background: "#fef2f2", color: "#991b1b", fontSize: 13, display: "flex", gap: 8 }}>
            <span style={{ flex: 1, wordBreak: "break-word" }}>{err}</span>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setErr(null)}>Tutup</button>
          </div>
        )}
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-ghost" style={{ flex: 1 }} disabled={busy} onClick={onClose}>Batal</button>
          <button className="btn btn-danger" style={{ flex: 1 }} disabled={!isMatch || busy} aria-busy={busy} onClick={() => void handleConfirm()}>
            {busy ? "Menghapus…" : "Hapus Anggota"}
          </button>
        </div>
      </div>
    </AdminModal>
  );
}

function InlineMagicLinkBtn({ generusId }: { generusId: string }) {
  const [busy, setBusy] = useState(false);
  const [ok, setOk] = useState(false);

  async function onClick() {
    if (busy) return;
    setBusy(true);
    setOk(false);
    try {
      const j = await apiFetch<{ token: string }>("/api/auth/magic/generate", {
        method: "POST",
        body: JSON.stringify({ generusId }),
      });
      const tok = (j as { token?: string })?.token ?? "";
      if (!tok) throw new Error("Gagal membuat link");
      const link = `${window.location.origin}/aktivasi?token=${encodeURIComponent(tok)}`;
      let copied = false;
      try { await navigator.clipboard.writeText(link); copied = true; } catch {}
      setOk(true);
      // eslint-disable-next-line no-alert
      if (copied) alert(`Link Buka Akses Login (15 menit, sekali pakai) sudah di-copy:\n\n${link}`);
      // eslint-disable-next-line no-alert
      else window.prompt(`Link Buka Akses Login (15 menit, sekali pakai) — salin link ini:`, link);
      setTimeout(() => setOk(false), 1800);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      // eslint-disable-next-line no-alert
      alert(msg || "Gagal membuat link akses login.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      className="btn btn-ghost row-icon-btn"
      onClick={onClick}
      disabled={busy}
      aria-label={ok ? "Link akses login disalin" : "Buka akses login"}
      title={ok ? "Link akses login disalin" : "Buka akses login — buat magic link 15 menit untuk aktivasi password pertama"}
      style={ok ? { background: "#f0fdf4", borderColor: "#86efac" } : undefined}
    >
      <IcoShield size={16} />
    </button>
  );
}

function OpenAccessButton({ memberId, memberName, onCopied }: { memberId: string; memberName: string; onCopied?: (link: string) => void }) {
  const [busy, setBusy] = useState(false);
  const [copiedOnce, setCopiedOnce] = useState(false);

  async function handleOpenAccess() {
    if (busy) return;
    setBusy(true);
    try {
      const j = await apiFetch<{ token: string; expiresAt: string }>("/api/auth/magic/generate", {
        method: "POST",
        body: JSON.stringify({ generusId: memberId }),
      });
      const tok = (j as { token?: string })?.token ?? "";
      if (!tok) throw new Error("Gagal membuat link");
      const link = `${window.location.origin}/aktivasi?token=${encodeURIComponent(tok)}`;
      let didClipboard = false;
      try {
        await navigator.clipboard.writeText(link);
        didClipboard = true;
      } catch {}
      setCopiedOnce(true);
      onCopied?.(link);
      if (!didClipboard) {
        // eslint-disable-next-line no-alert
        window.prompt(`Link Buka Akses Login untuk ${memberName} (15 menit, sekali pakai) — salin link ini:`, link);
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      // eslint-disable-next-line no-alert
      alert(msg || "Gagal membuat link akses login.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      className="btn btn-ghost"
      onClick={handleOpenAccess}
      disabled={busy}
      title="Buat magic link 15 menit (sekali pakai) untuk generus atur password pertama — link langsung di-copy"
      style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6 }}
    >
      {copiedOnce ? <IcoShield size={14} /> : <IcoShield size={14} />}
      {busy ? "Membuat…" : copiedOnce ? "Link dibuat ✓" : "Buka Akses Login"}
    </button>
  );
}

function AddMemberModal({ onClose, onSave }: { onClose: () => void; onSave: (m: Member) => void }) {
  const [s, setS] = useState(1);
  const [form, setForm] = useState({
    nama: "", tempatLahir: "", tanggalLahir: "", noTelp: "", pendidikan: "SMA" as Member["pendidikan"],
    jenisKelamin: "L" as "L" | "P", kategoriMudaMudi: "pribumi" as Member["kategoriMudaMudi"], asalDaerah: "",
    domisiliAnak: "", isOrtuSama: true, domisiliOrtu: "", desa: "Fajar", kelompok: "Fajar C",
  });
  const [saving, setSaving] = useState(false);
  const [saveErr, setSaveErr] = useState<string | null>(null);

  async function handleCreate() {
    if (saving) return;
    if (!form.nama.trim() || !form.tempatLahir.trim() || !form.tanggalLahir || !form.noTelp.trim()) {
      setSaveErr("Nama, tempat lahir, tanggal lahir, dan no telp wajib diisi.");
      return;
    }
    if (form.kategoriMudaMudi === "perantauan" && !form.asalDaerah.trim()) {
      setSaveErr("Asal daerah wajib jika kategori perantauan.");
      return;
    }
    if (form.domisiliAnak.trim().length < 3) { setSaveErr("Domisili anak wajib (min 3 karakter)."); return; }
    if (!form.isOrtuSama && form.domisiliOrtu.trim().length < 3) { setSaveErr("Domisili ortu wajib jika ortu beda."); return; }
    setSaveErr(null);
    setSaving(true);
    try {
      // Resolve desaId/kelompokId numerik dari nama display
      let desaId: number | undefined;
      let kelompokId: number | undefined;
      try {
        const desaRows = await apiFetch<unknown>("/api/auth/desa").catch(() => null);
        const arr: { id: number; nama: string }[] = Array.isArray(desaRows) ? desaRows as { id: number; nama: string }[] : (desaRows && typeof desaRows === "object" && Array.isArray((desaRows as { desa?: unknown[] }).desa) ? (desaRows as { desa: { id: number; nama: string }[] }).desa : []);
        const hitD = arr.find((d) => d.nama.toLowerCase() === String(form.desa).toLowerCase().trim());
        if (hitD) desaId = hitD.id;
        if (hitD && form.kelompok) {
          const kelRows = await apiFetch<unknown>(`/api/auth/kelompok?desaId=${hitD.id}`).catch(() => null);
          let kelArr: { id: number; nama: string; desaId: number }[] = [];
          if (Array.isArray(kelRows)) kelArr = kelRows as { id: number; nama: string; desaId: number }[];
          else if (kelRows && typeof kelRows === "object" && Array.isArray((kelRows as { kelompok?: unknown[] }).kelompok)) kelArr = (kelRows as { kelompok: { id: number; nama: string; desaId: number }[] }).kelompok
          else {
            const allK = await apiFetch<unknown>("/api/auth/kelompok").catch(() => null);
            if (Array.isArray(allK)) kelArr = allK as { id: number; nama: string; desaId: number }[];
          }
          const hitK = kelArr.find((k) => k.nama.toLowerCase() === String(form.kelompok).toLowerCase().trim() && k.desaId === hitD.id);
          if (hitK) kelompokId = hitK.id;
        }
      } catch {}
      // Fallback to defaults used by backend: desa Fajar->id maybe 1, but omit if not resolved; POST will accept desaId/kelompokId optional
      const resp = await apiFetch<{ success?: boolean; id?: string; nomorUnik?: string }>(`/api/generus`, {
        method: "POST",
        body: JSON.stringify({
          nama: form.nama.trim(),
          tempatLahir: form.tempatLahir.trim(),
          tanggalLahir: form.tanggalLahir,
          jenisKelamin: form.jenisKelamin,
          noTelp: form.noTelp.trim(),
          pendidikan: form.pendidikan,
          hobi: form.kategoriMudaMudi === "perantauan" ? form.asalDaerah.trim() : undefined,
          // server expects: nama, tempatLahir, tanggalLahir, jenisKelamin, kategoriUsia, etc — map minimally
          kategoriUsia: "Pra-remaja" as string,
          kategoriMudaMudi: form.kategoriMudaMudi,
          asalDaerah: form.asalDaerah.trim() || undefined,
          domisiliAnak: form.domisiliAnak.trim(),
          isDomisiliOrtuSama: form.isOrtuSama ? 1 : 0,
          domisiliOrtu: form.isOrtuSama ? undefined : form.domisiliOrtu.trim(),
          desaId: desaId ?? undefined,
          kelompokId: kelompokId ?? undefined,
        }),
      });
      const newId = (resp as { id?: string })?.id ?? `m${Date.now()}`;
      onSave({
        id: newId,
        nama: form.nama.trim(),
        desa: form.desa,
        kelompok: form.kelompok,
        pendidikan: form.pendidikan,
        noTelp: form.noTelp.trim(),
        kategoriMudaMudi: form.kategoriMudaMudi,
        domisiliAnak: form.domisiliAnak.trim(),
        isOrtuSama: form.isOrtuSama,
        status: "aktif",
      });
    } catch (e: unknown) {
      setSaveErr(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  const canNext1 = form.nama.trim().length >= 2 && form.tempatLahir.trim() && form.tanggalLahir && form.noTelp.trim().length >= 10;
  const canNext2 = form.domisiliAnak.trim().length >= 3 && (form.isOrtuSama || form.domisiliOrtu.trim().length >= 3);
  const needAsal = form.kategoriMudaMudi === "perantauan" && !form.asalDaerah.trim();

  return (
    <AdminModal title="Tambah Anggota (oleh Admin)" onClose={onClose}>
        <div className="stepper" style={{ marginBottom: 12 }}>{[1, 2, 3].map((n) => <div key={n} className={`step-dot ${s >= n ? "on" : ""}`} />)}</div>
        <div className="muted" style={{ marginBottom: 16 }}>Langkah {s}/3 &bull; Wajib: nama, pendidikan, tanggal lahir, no telp, tempat lahir, domisili anak.</div>

        {s === 1 && (
          <div style={{ display: "grid", gap: 12 }}>
            <div className="field"><label>Nama *</label><input value={form.nama} onChange={(e) => setForm({ ...form, nama: e.target.value })} placeholder="Nama lengkap" /></div>
            <div className="form-grid-2">
              <div className="field"><label>Tempat Lahir *</label><input value={form.tempatLahir} onChange={(e) => setForm({ ...form, tempatLahir: e.target.value })} /></div>
              <div className="field"><label>Tanggal Lahir *</label><input type="date" value={form.tanggalLahir} onChange={(e) => setForm({ ...form, tanggalLahir: e.target.value })} /></div>
            </div>
            <div className="form-grid-2">
              <div className="field"><label>No Telp *</label><input value={form.noTelp} onChange={(e) => setForm({ ...form, noTelp: e.target.value })} placeholder="0812..." /></div>
              <div className="field"><label>Pendidikan *</label>
                <Select
                  value={form.pendidikan}
                  onChange={(v) => setForm({ ...form, pendidikan: v as any })}
                  ariaLabel="Pendidikan"
                  options={[
                    { value: "SD", label: "SD" },
                    { value: "SMP", label: "SMP" },
                    { value: "SMA", label: "SMA" },
                    { value: "Sedang menempuh perguruan tinggi", label: "Sedang menempuh perguruan tinggi" },
                    { value: "Sarjana", label: "Sarjana" },
                  ]}
                />
              </div>
            </div>
            <div className="form-grid-2">
              <div className="field"><label>Jenis Kelamin *</label>
                <Select
                  value={form.jenisKelamin}
                  onChange={(v) => setForm({ ...form, jenisKelamin: v as any })}
                  ariaLabel="Jenis kelamin"
                  options={[
                    { value: "L", label: "Laki-laki" },
                    { value: "P", label: "Perempuan" },
                  ]}
                />
              </div>
              <div className="field"><label>Kategori *</label>
                <Select
                  value={form.kategoriMudaMudi}
                  onChange={(v) => setForm({ ...form, kategoriMudaMudi: v as any })}
                  ariaLabel="Kategori"
                  options={[
                    { value: "pribumi", label: "Pribumi" },
                    { value: "perantauan", label: "Perantauan" },
                  ]}
                />
              </div>
            </div>
            {form.kategoriMudaMudi === "perantauan" && <div className="field"><label>Asal Daerah *</label><input value={form.asalDaerah} onChange={(e) => setForm({ ...form, asalDaerah: e.target.value })} placeholder="Kabupaten / kota asal" /></div>}
            {needAsal && <div className="pill pill-amber">Asal daerah wajib jika perantauan</div>}
            <div className="form-grid-2">
              <div className="field"><label>Desa</label>
                <Select
                  value={form.desa}
                  onChange={(v) => setForm({ ...form, desa: v })}
                  ariaLabel="Desa"
                  options={[
                    { value: "Fajar", label: "Fajar" },
                    { value: "Cengkareng Timur", label: "Cengkareng Timur" },
                  ]}
                />
              </div>
              <div className="field"><label>Kelompok</label>
                <Select
                  value={form.kelompok}
                  onChange={(v) => setForm({ ...form, kelompok: v })}
                  ariaLabel="Kelompok"
                  options={[
                    { value: "Fajar C", label: "Fajar C" },
                    { value: "Fajar B", label: "Fajar B" },
                    { value: "Timur A", label: "Timur A" },
                  ]}
                />
              </div>
            </div>
            <button className="btn btn-primary" disabled={!canNext1 || needAsal} onClick={() => setS(2)}>Lanjut: Domisili</button>
          </div>
        )}

        {s === 2 && (
          <div style={{ display: "grid", gap: 12 }}>
            <div className="field"><label>Domisili Anak *</label><textarea rows={2} value={form.domisiliAnak} onChange={(e) => setForm({ ...form, domisiliAnak: e.target.value })} placeholder="Alamat domisili anak saat ini" /></div>
            <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13, fontWeight: 700 }}>
              <input type="checkbox" checked={form.isOrtuSama} onChange={(e) => setForm({ ...form, isOrtuSama: e.target.checked })} />
              Domisili ortu sama dengan anak
            </label>
            {!form.isOrtuSama && <div className="field"><label>Domisili Ortu *</label><textarea rows={2} value={form.domisiliOrtu} onChange={(e) => setForm({ ...form, domisiliOrtu: e.target.value })} placeholder="Alamat ortu jika berbeda" /></div>}
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setS(1)}>Kembali</button>
              <button className="btn btn-primary" style={{ flex: 1 }} disabled={!canNext2} onClick={() => setS(3)}>Lanjut: Ringkas</button>
            </div>
          </div>
        )}

        {s === 3 && (
          <div style={{ display: "grid", gap: 12 }}>
            <div className="card" style={{ background: "var(--bg)" }}>
              <div style={{ fontWeight: 700 }}>{form.nama || "(nama)"} &bull; {form.pendidikan} &bull; {form.jenisKelamin}</div>
              <div className="muted">{form.tempatLahir} &bull; {form.tanggalLahir} &bull; {form.noTelp}</div>
              <div className="muted">{form.kategoriMudaMudi}{form.asalDaerah ? ` &bull; asal ${form.asalDaerah}` : ""} &bull; {form.desa}/{form.kelompok}</div>
              <div className="muted">Domisili anak: {form.domisiliAnak || "-"} {form.isOrtuSama ? "(ortu sama)" : `&bull; ortu: ${form.domisiliOrtu || "-"}`}</div>
            </div>
            <p className="muted">Shift JSON fleksibel &amp; status ortu jamaah. P1 (kolom D1 sudah siap, UI hide).</p>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setS(2)}>Kembali</button>
              {saveErr && <div style={{ fontSize: 12, color: "#991b1b", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: "8px 10px" }}>{saveErr}</div>}
              <button
                className="btn btn-primary"
                style={{ flex: 1 }}
                disabled={saving}
                onClick={() => void handleCreate()}
              >
                {saving ? "Menyimpan…" : "Simpan & buat QR"}
              </button>
            </div>
          </div>
        )}
    </AdminModal>
  );
}

function KegiatanAdmin({ role }: { role: AdminRole }) {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [waktuFilter, setWaktuFilter] = useState("semua");
  const [wilayahFilter, setWilayahFilter] = useState("semua");
  const [kategoriFilter, setKategoriFilter] = useState<Kategori | "semua">("semua");
  const [q, setQ] = useState("");
  const [kategori, setKategori] = useState<Kategori>("sambung_rutin");
  const [tingkat, setTingkat] = useState<Tingkat>(role === "admin_kelompok" ? "kelompok" : role === "admin_desa" ? "desa" : "daerah");
  const [namaWilayah, setNamaWilayah] = useState(role === "admin_kelompok" ? "Fajar C" : role === "admin_desa" ? "Fajar" : "Cengkareng");
  const [showForm, setShowForm] = useState(false);
  const [showFilter, setShowFilter] = useState(false);
  const [list, setList] = useState<Kegiatan[]>([]);
  const [loadingKegiatan, setLoadingKegiatan] = useState(false);
  const [kegiatanErr, setKegiatanErr] = useState<string | null>(null);
  const [radiusM, setRadiusM] = useState("100");
  const [gpsLat, setGpsLat] = useState("");
  const [gpsLng, setGpsLng] = useState("");
  const [showMap, setShowMap] = useState(false);
  const [savingKegiatan, setSavingKegiatan] = useState(false);

  async function loadKegiatan() {
    let hasToken = false;
    try { hasToken = Boolean(localStorage.getItem("token")); } catch {}
    if (!hasToken) { setLoadingKegiatan(false); setKegiatanErr(null); return; }
    setLoadingKegiatan(true);
    setKegiatanErr(null);
    try {
      const raw: unknown = await apiFetch("/api/kegiatan");
      const u = unwrapList<{
        id: string; judul: string; deskripsi?: string | null; tanggal: string; jam?: string | null; lokasi?: string | null;
        kategoriAcara?: string | null; kategoriCustom?: string | null; desaNama?: string | null; kelompokNama?: string | null;
        lat?: number | null; lng?: number | null; radiusM?: number | null;
      }>(raw);
      const arr = Array.isArray(raw) ? (raw as typeof u.data) : u.data;
      const mapped: Kegiatan[] = (arr as typeof u.data).map((k) => {
        const ka = (k.kategoriAcara as Kategori | null) ?? "sambung_rutin";
        const isKel = Boolean(k.kelompokNama);
        const isDesa = !isKel && Boolean(k.desaNama);
        const tk: Tingkat = isKel ? "kelompok" : isDesa ? "desa" : "daerah";
        return {
          id: k.id,
          judul: k.judul,
          kategori: ka,
          kategoriCustom: k.kategoriCustom ?? undefined,
          tingkat: tk,
          desa: k.desaNama ?? undefined,
          kelompok: k.kelompokNama ?? undefined,
          tanggal: k.tanggal,
          jam: (k.jam as string) ?? "",
          lokasi: (k.lokasi as string) ?? "",
          lat: k.lat ?? null,
          lng: k.lng ?? null,
          radiusM: (k.radiusM as number) ?? 100,
        };
      });
      setList(mapped);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (!msg.includes("401")) setKegiatanErr(msg);
    } finally {
      setLoadingKegiatan(false);
    }
  }

  useEffect(() => { void loadKegiatan(); }, []);

  const tpl = useMemo(() => (kategori === "sambung_rutin" ? sambungJudulTemplate(tingkat as Tingkat, tingkat === "daerah" ? "" : namaWilayah) : ""), [kategori, tingkat, namaWilayah]);
  const filtered = useMemo(() => {
    let l = list;
    if (dateFrom) l = l.filter((k) => k.tanggal >= dateFrom);
    if (dateTo) l = l.filter((k) => k.tanggal <= dateTo);
    if (waktuFilter !== "semua") {
      l = l.filter((k) => {
        const h = parseInt(k.jam.split(":")[0] || "0", 10);
        if (waktuFilter === "pagi") return h >= 5 && h < 11;
        if (waktuFilter === "siang") return h >= 11 && h < 15;
        if (waktuFilter === "sore") return h >= 15 && h < 18;
        return h >= 18 || h < 5; // malam
      });
    }
    if (wilayahFilter !== "semua") l = l.filter((k) => k.tingkat === wilayahFilter);
    if (kategoriFilter !== "semua") l = l.filter((k) => k.kategori === kategoriFilter);
    if (q.trim()) {
      const s = q.toLowerCase();
      l = l.filter((k) => k.judul.toLowerCase().includes(s) || k.lokasi.toLowerCase().includes(s));
    }
    return l;
  }, [list, dateFrom, dateTo, waktuFilter, wilayahFilter, kategoriFilter, q]);

  const canCreate = role === "admin_daerah" || (role === "admin_desa" && tingkat !== "daerah") || (role === "admin_kelompok" && tingkat === "kelompok");

  const adaFilterAktif = dateFrom || dateTo || waktuFilter !== "semua" || wilayahFilter !== "semua" || kategoriFilter !== "semua" || q.trim();

  const resetFilter = () => {
    setDateFrom("");
    setDateTo("");
    setWaktuFilter("semua");
    setWilayahFilter("semua");
    setKategoriFilter("semua");
    setQ("");
  };

  return (
    <div>
      <PageHeader title="Kegiatan" sub={`Kelola agenda dan kegiatan${kegiatanErr ? ` · ${kegiatanErr.slice(0, 80)}` : loadingKegiatan ? " · memuat…" : ""}`} action={<button className="btn btn-primary btn-auto" onClick={() => setShowForm(true)}>+ Buat Kegiatan</button>} />
      {kegiatanErr && <div className="card" style={{ borderColor: "#fecaca", background: "#fef2f2", color: "#991b1b", display: "flex", gap: 8, alignItems: "center", marginBottom: 12 }}><span style={{ fontSize: 13, fontWeight: 700 }}>{kegiatanErr}</span><button type="button" className="btn btn-ghost btn-sm" style={{ marginLeft: "auto" }} onClick={() => void loadKegiatan()}>Retry</button></div>}
      <div className="admin-toolbar" style={{ marginBottom: 16 }}>
        <SearchInput value={q} onChange={setQ} placeholder="Cari judul / lokasi..." />
        <button className={`btn ${showFilter ? "btn-primary" : "btn-ghost"} btn-sm btn-auto`} aria-expanded={showFilter} aria-haspopup="dialog" onClick={() => setShowFilter((s) => !s)}>
          Filter {adaFilterAktif && <span className="filter-count">{(dateFrom ? 1 : 0) + (dateTo ? 1 : 0) + (waktuFilter !== "semua" ? 1 : 0) + (wilayahFilter !== "semua" ? 1 : 0) + (kategoriFilter !== "semua" ? 1 : 0)}</span>}
        </button>
      </div>

      {showFilter && (
        <AdminModal title="Filter Kegiatan" onClose={() => setShowFilter(false)} className="filter-modal">
          <div className="filter-groups">
            <div className="filter-group">
              <span className="filter-label">Tanggal</span>
              <input type="date" className="filter-input" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} aria-label="Dari tanggal" />
              <span className="filter-sep">s/d</span>
              <input type="date" className="filter-input" value={dateTo} onChange={(e) => setDateTo(e.target.value)} aria-label="Sampai tanggal" />
            </div>
            <div className="filter-group">
              <span className="filter-label">Waktu</span>
              <div className="filter-chips">
                {(["semua", "pagi", "siang", "sore", "malam"] as const).map((w) => (
                  <button key={w} className={`chip ${waktuFilter === w ? "active" : ""}`} onClick={() => setWaktuFilter(w)}>{w === "semua" ? "Semua" : w}</button>
                ))}
              </div>
            </div>
            <div className="filter-group">
              <span className="filter-label">Wilayah</span>
              <div className="filter-chips">
                {(["semua", "daerah", "desa", "kelompok"] as const).map((f) => (
                  <button key={f} className={`chip ${wilayahFilter === f ? "active" : ""}`} onClick={() => setWilayahFilter(f)}>{f === "semua" ? "Semua" : f}</button>
                ))}
              </div>
            </div>
            <div className="filter-group">
              <span className="filter-label">Jenis Kegiatan</span>
              <div className="filter-chips">
                {(["semua", "sambung_rutin", "keakraban", "pemantapan", "lainnya"] as const).map((f) => (
                  <button key={f} className={`chip ${kategoriFilter === f ? "active" : ""}`} onClick={() => setKategoriFilter(f)}>{f === "semua" ? "Semua" : f === "sambung_rutin" ? "Sambung Rutin" : f}</button>
                ))}
              </div>
            </div>
          </div>
          <div className="filter-actions">
            <button className="btn btn-ghost btn-sm" onClick={() => { resetFilter(); setShowFilter(false); }}>Reset</button>
            <button className="btn btn-primary btn-sm" onClick={() => setShowFilter(false)}>Terapkan</button>
          </div>
        </AdminModal>
      )}

      <div className="kegiatan-grid">
        {loadingKegiatan && filtered.length === 0 && <div className="lp-empty-card">Memuat kegiatan dari API…</div>}
        {filtered.map((k) => (
          <div key={k.id} className="card kegiatan-card">
            <div className="kegiatan-card-head">
              <span className={`pill ${k.kategori === "sambung_rutin" ? "pill-emerald" : "pill-slate"}`}>{k.kategori === "sambung_rutin" ? "Sambung Rutin" : k.kategori}</span>
              <span className="pill pill-slate">{k.tingkat}{k.kelompok ? ` • ${k.kelompok}` : k.desa ? ` • ${k.desa}` : " • Cengkareng"}</span>
              {k.lat != null && <span className="pill pill-slate" title={`GPS radius ${k.radiusM}m`}><IcoMapPin size={10} /> {k.radiusM}m</span>}
            </div>
            <div className="kegiatan-card-body">
              <div className="kegiatan-title">{k.judul}</div>
              {k.kategoriCustom && <div className="kegiatan-desc">{k.kategoriCustom}</div>}
            </div>
            <div className="kegiatan-meta">
              <div className="kegiatan-meta-row">
                <span className="detail-label"><IcoCalendar size={12} /> Waktu</span>
                <span className="kegiatan-meta-value">{k.tanggal}{k.jam ? ` • ${k.jam}` : ""}</span>
              </div>
              <div className="kegiatan-meta-row">
                <span className="detail-label"><IcoMapPin size={12} /> Lokasi</span>
                <span className="kegiatan-meta-value">{k.lokasi || "—"}</span>
              </div>
            </div>
          </div>
        ))}
        {filtered.length === 0 && <div className="lp-empty-card">Tidak ada kegiatan yang cocok.</div>}
      </div>

      {showForm && (
        <AdminModal title="Buat Kegiatan" onClose={() => setShowForm(false)} className="modal--kegiatan">
          <div style={{ display: "grid", gap: 12 }}>
              <div className="field"><label>Kategori Acara</label>
                <Select
                  value={kategori}
                  onChange={(v) => setKategori(v as Kategori)}
                  ariaLabel="Kategori acara"
                  options={[
                    { value: "sambung_rutin", label: "Sambung Rutin" },
                    { value: "keakraban", label: "Keakraban" },
                    { value: "pemantapan", label: "Pemantapan" },
                    { value: "lainnya", label: "Lainnya (isi bebas)" },
                  ]}
                />
              </div>
              {kategori === "lainnya" && <div className="field"><label>Kategori Custom *</label><input placeholder="Mis. Kerja Bakti" id="kategoriCustom" /></div>}
              <div className="kegiatan-form-grid-2">
                <div className="field"><label>Tingkat</label>
                  <Select
                    value={tingkat}
                    onChange={(v) => setTingkat(v as Tingkat)}
                    ariaLabel="Tingkat"
                    options={[
                      ...(role !== "admin_kelompok" ? [{ value: "daerah", label: "Daerah (Cengkareng)" }] : []),
                      ...(role !== "admin_kelompok" ? [{ value: "desa", label: "Desa" }] : []),
                      { value: "kelompok", label: "Kelompok" },
                    ]}
                  />
                </div>
                <div className="field"><label>Nama Wilayah</label><input value={tingkat === "daerah" ? "Cengkareng" : namaWilayah} onChange={(e) => setNamaWilayah(e.target.value)} disabled={tingkat === "daerah"} /></div>
              </div>
              <div className="field"><label>Judul {kategori === "sambung_rutin" && "(auto template, bisa edit)"}</label>
                <input key={tpl} defaultValue={tpl} placeholder={kategori === "sambung_rutin" ? tpl : "Judul bebas"} id="judul" />
                {kategori === "sambung_rutin" && <span className="muted">Template: {tpl}</span>}
              </div>
              <div className="field"><label>Deskripsi</label><textarea rows={2} placeholder="Detail acara..." id="deskripsi" /></div>
              <div className="kegiatan-form-grid-3">
                <div className="field"><label>Tanggal</label><input type="date" id="tanggal" defaultValue={new Date().toISOString().slice(0, 10)} /></div>
                <div className="field"><label>Jam</label><input type="time" id="jam" /></div>
                <div className="field"><label>Lokasi</label><input id="lokasi" placeholder="Masjid / Aula" /></div>
              </div>
              <div className="field">
                <label>Lokasi GPS — tap untuk pilih di peta</label>
                <div className="kegiatan-form-grid-gps">
                  <button
                    type="button"
                    className={`gps-picker-trigger ${gpsLat && gpsLng ? "has-value" : ""}`}
                    onClick={() => setShowMap(true)}
                    aria-label="Pilih lokasi di peta"
                  >
                    <IcoMapPin size={14} />
                    <span>{gpsLat && gpsLng ? `${Number(gpsLat).toFixed(6)}, ${Number(gpsLng).toFixed(6)}` : "Pilih lokasi di peta — tap untuk cari"}</span>
                  </button>
                  <Select
                    value={radiusM}
                    onChange={setRadiusM}
                    ariaLabel="Radius GPS"
                    options={[
                      { value: "50", label: "50m" },
                      { value: "100", label: "100m" },
                      { value: "200", label: "200m" },
                    ]}
                  />
                </div>
                {gpsLat && gpsLng ? (
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <span className="muted" style={{ fontSize: 11 }}>Radius absen {radiusM}m • geser pin atau cari ulang di peta</span>
                    <button type="button" className="btn btn-ghost btn-sm" style={{ width: "auto", minHeight: 28, padding: "4px 10px", fontSize: 12 }} onClick={() => { setGpsLat(""); setGpsLng(""); }}>Hapus lokasi</button>
                  </div>
                ) : (
                  <span className="muted" style={{ fontSize: 11 }}>Kosong = tanpa validasi GPS (opsional). Pasang pin untuk absen berbasis lokasi.</span>
                )}
              </div>
              {!canCreate && <div className="pill pill-amber" style={{ justifyContent: "center" }}>Role kamu tidak boleh buat di tingkat {tingkat}</div>}
              <button
                className="btn btn-primary" style={{ width: "100%" }} disabled={!canCreate || savingKegiatan}
                onClick={async () => {
                  if (savingKegiatan) return;
                  const v = (id: string) => (document.getElementById(id) as HTMLInputElement)?.value || "";
                  const judul = (v("judul") || tpl || "").trim();
                  if (!judul) { setKegiatanErr("Judul wajib diisi."); return; }
                  const tanggal = v("tanggal") || new Date().toISOString().slice(0, 10);
                  const jam = v("jam") || "";
                  const lokasi = v("lokasi") || "";
                  const deskripsi = v("deskripsi") || "";
                  const lat = parseFloat(gpsLat); const lng = parseFloat(gpsLng);
                  const radius = Number.isFinite(parseInt(radiusM, 10)) ? parseInt(radiusM, 10) : 100;
                  const kategoriCustom = v("kategoriCustom") || undefined;
                  // Resolve desaId/kelompokId numeric if name provided — look up from /api/auth maps; empty = daerah
                  let desaId: number | null = null;
                  let kelompokId: number | null = null;
                  if (tingkat !== "daerah" && namaWilayah) {
                    try {
                      const desaRows = await apiFetch<unknown>("/api/auth/desa").catch(() => null);
                      const arr: { id: number; nama: string }[] = Array.isArray(desaRows) ? desaRows as { id: number; nama: string }[] : (desaRows && typeof desaRows === "object" && Array.isArray((desaRows as { desa?: unknown[] }).desa) ? (desaRows as { desa: { id: number; nama: string }[] }).desa : []);
                      if (tingkat === "desa") {
                        const hit = arr.find((d) => d.nama.toLowerCase() === namaWilayah.toLowerCase().trim());
                        if (hit) desaId = hit.id;
                      } else if (tingkat === "kelompok") {
                        const kelGroups = await apiFetch<unknown>("/api/auth/kelompok").catch(() => null);
                        const kelArr: { id: number; nama: string; desaId: number }[] = Array.isArray(kelGroups) ? kelGroups as { id: number; nama: string; desaId: number }[] : [];
                        let hit = kelArr.find((k) => k.nama.toLowerCase() === namaWilayah.toLowerCase().trim());
                        if (hit) { kelompokId = hit.id; desaId = hit.desaId; }
                      }
                    } catch {}
                  }
                  setSavingKegiatan(true);
                  setKegiatanErr(null);
                  try {
                    const resp = await apiFetch<{ success?: boolean; id?: string }>("/api/kegiatan", {
                      method: "POST",
                      body: JSON.stringify({
                        judul, deskripsi, tanggal, jam, lokasi,
                        desaId: desaId ?? undefined,
                        kelompokId: kelompokId ?? undefined,
                        kategoriAcara: kategori,
                        kategoriCustom,
                        lat: Number.isFinite(lat) ? lat : null,
                        lng: Number.isFinite(lng) ? lng : null,
                        radiusM: radius,
                        gpsRequired: Number.isFinite(lat) && Number.isFinite(lng) ? 1 : 0,
                      }),
                    });
                    // Optimistic: prepend live entry; then reload for consistency
                    const newId = (resp as { id?: string })?.id ?? `k${Date.now()}`;
                    const tingkatVal = tingkat as Tingkat;
                    setList((prev) => [{ id: newId, judul, kategori: kategori as Kategori, kategoriCustom, tingkat: tingkatVal, desa: tingkatVal === "desa" || tingkatVal === "kelompok" ? (tingkatVal === "desa" ? namaWilayah : (desaId ? String(desaId) : "Fajar")) : undefined, kelompok: tingkatVal === "kelompok" ? namaWilayah : undefined, tanggal, jam, lokasi, lat: Number.isFinite(lat) ? lat : null, lng: Number.isFinite(lng) ? lng : null, radiusM: radius }, ...prev]);
                    setGpsLat(""); setGpsLng(""); setShowForm(false);
                    void loadKegiatan();
                  } catch (e: unknown) {
                    setKegiatanErr(e instanceof Error ? e.message : String(e));
                  } finally {
                    setSavingKegiatan(false);
                  }
                }}
              >
                {savingKegiatan ? "Menyimpan…" : "Simpan Kegiatan"}
              </button>
              {kegiatanErr && <div style={{ fontSize: 12, color: "#991b1b", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: "8px 10px" }}>{kegiatanErr}</div>}
          </div>
          <MapPickerModal
            open={showMap}
            initialLat={gpsLat ? parseFloat(gpsLat) : null}
            initialLng={gpsLng ? parseFloat(gpsLng) : null}
            radiusM={parseInt(radiusM, 10) || 100}
            onClose={() => setShowMap(false)}
            onPick={(lat, lng, displayName) => {
              setGpsLat(String(lat));
              setGpsLng(String(lng));
              if (displayName) {
                const el = document.getElementById("lokasi") as HTMLInputElement | null;
                if (el && !el.value.trim()) el.value = displayName.split(",").slice(0, 2).join(",").trim();
              }
            }}
          />
        </AdminModal>
      )}
    </div>
  );
}

function UsersManage({ role }: { role: AdminRole }) {
  const [users, setUsers] = useState<{ id: string; nama: string; role: AdminRole; wilayah: string; status: string }[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersErr, setUsersErr] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [q, setQ] = useState("");
  const isMobile = useIsMobile();

  async function loadUsers() {
    let hasToken = false;
    try { hasToken = Boolean(localStorage.getItem("token")); } catch {}
    if (!hasToken) return;
    setUsersLoading(true);
    setUsersErr(null);
    try {
      const raw: unknown = await apiFetch("/api/admin/users?all=true");
      const u = unwrapList<{ id: string; name: string; email: string; role: string; desaNama?: string | null; kelompokNama?: string | null }>(raw);
      const arr = Array.isArray(raw) ? (raw as typeof u.data) : u.data;
      const mapped = (arr as typeof u.data).map((r) => ({
        id: r.id,
        nama: r.name,
        role: r.role as AdminRole,
        wilayah: (r.kelompokNama ?? r.desaNama ?? "—") as string,
        status: "aktif" as const,
      }));
      setUsers(mapped);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (!msg.includes("401")) setUsersErr(msg);
    } finally {
      setUsersLoading(false);
    }
  }

  useEffect(() => { void loadUsers(); }, []);

  const canManage = (targetRole: AdminRole) => {
    if (role === "admin_daerah") return true;
    if (role === "admin_desa") return targetRole === "admin_kelompok";
    return false;
  };

  const filteredUsers = useMemo(() => {
    if (!q.trim()) return users;
    const s = q.toLowerCase();
    return users.filter((u) => u.nama.toLowerCase().includes(s) || u.wilayah.toLowerCase().includes(s) || u.role.toLowerCase().includes(s));
  }, [users, q]);

  const roleOptions: { value: AdminRole; label: string }[] = [
    ...(role === "admin_daerah" ? [{ value: "admin_desa" as AdminRole, label: "Admin Desa" }] : []),
    { value: "admin_kelompok" as AdminRole, label: "Admin Kelompok" },
  ];

  const handleAdd = async (nama: string, roleBaru: AdminRole, _wilayah: string, email?: string, password?: string, desaId?: number, kelompokId?: number) => {
    try {
      const e = (email ?? `${nama.toLowerCase().replace(/\s+/g, ".")}@gencar.local`).trim().toLowerCase();
      const pw = (password ?? "admin123").trim();
      if (!e.includes("@")) throw new Error("Email tidak valid.");
      if (pw.length < 8) throw new Error("Password minimal 8 karakter.");
      await apiFetch("/api/admin/users", {
        method: "POST",
        body: JSON.stringify({ name: nama, email: e, password: pw, role: roleBaru, desaId: desaId || undefined, kelompokId: kelompokId || undefined }),
      });
      setShowAdd(false);
      void loadUsers();
    } catch (e: unknown) {
      setUsersErr(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <div>
      <PageHeader title="Kelola User" sub={`Kelola akun admin di bawah kamu${usersErr ? ` · ${usersErr.slice(0, 80)}` : ""}`} action={<button className="btn btn-primary btn-auto" disabled={role === "admin_kelompok"} onClick={() => setShowAdd(true)}>+ Tambah Admin</button>} />
      {usersErr && <div className="card" style={{ borderColor: "#fecaca", background: "#fef2f2", color: "#991b1b", display: "flex", gap: 8, alignItems: "center", marginBottom: 12 }}><span style={{ fontSize: 13, fontWeight: 700 }}>{usersErr}</span><button type="button" className="btn btn-ghost btn-sm" style={{ marginLeft: "auto" }} onClick={() => setUsersErr(null)}>Tutup</button><button type="button" className="btn btn-ghost btn-sm" onClick={() => void loadUsers()}>Retry</button></div>}
      {usersLoading && <div className="muted" style={{ marginBottom: 8, fontSize: 12 }}>Memuat user…</div>}
      <div className="info-banner">
        <span className="info-banner-icon"><IcoShield size={18} /></span>
        <div className="info-banner-body">
          <strong className="info-banner-title">Kelola User di bawah kamu</strong>
          <p className="info-banner-desc">{role === "admin_daerah" ? "Kelola semua admin di wilayah kamu." : role === "admin_desa" ? "Kelola admin kelompok di desamu." : "Kamu tidak bisa kelola user."}</p>
        </div>
      </div>
      <div className="admin-toolbar" style={{ marginBottom: 16 }}>
        <SearchInput value={q} onChange={setQ} placeholder="Cari nama / wilayah / role..." />
      </div>
      {isMobile ? (
        <div className="cards-grid">
          {filteredUsers.map((u) => (
            <div key={u.id} className="card user-card">
              <div className="user-card-head">
                <div className="avatar">{u.nama.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]).join("") || "A"}</div>
                <div className="member-card-head-info">
                  <div className="member-card-name">{u.nama}</div>
                  <div className="muted">{u.wilayah}</div>
                </div>
                <span className={`pill ${u.status === "aktif" ? "pill-emerald" : "pill-amber"}`}>{u.status}</span>
              </div>

              <div className="member-card-info">
                <div className="member-info-row">
                  <span className="detail-label">Role</span>
                  <span className="member-info-value">{u.role}</span>
                </div>
              </div>

              <div className="member-card-actions">
                <button className="btn btn-ghost row-icon-btn" aria-label={u.status === "aktif" ? "Nonaktifkan" : "Aktifkan"} title={u.status === "aktif" ? "Nonaktifkan" : "Aktifkan"} disabled={!canManage(u.role)} onClick={() => setUsers((prev) => prev.map((x) => x.id === u.id ? { ...x, status: x.status === "aktif" ? "pending" : "aktif" } : x))}><IcoPower size={16} /></button>
                <button className="btn btn-danger row-icon-btn" aria-label="Hapus" title="Hapus" disabled={!canManage(u.role)}><IcoTrash size={16} /></button>
              </div>
            </div>
          ))}
          {filteredUsers.length === 0 && <div className="lp-empty-card">Belum ada admin di bawah kamu.</div>}
        </div>
      ) : (
        <div className="table-wrap">
          <table className="admin-table">
            <caption className="sr-only">Daftar admin — nama, role, wilayah, status, dan aksi</caption>
            <thead><tr><th scope="col">Nama</th><th scope="col">Role</th><th scope="col">Wilayah</th><th scope="col">Status</th><th scope="col">Aksi</th></tr></thead>
            <tbody>
              {filteredUsers.map((u) => (
                <tr key={u.id}>
                  <td style={{ fontWeight: 700 }}>{u.nama}</td>
                  <td><span className="pill pill-slate">{u.role}</span></td>
                  <td>{u.wilayah}</td>
                  <td><span className={`pill ${u.status === "aktif" ? "pill-emerald" : "pill-amber"}`}>{u.status}</span></td>
                  <td>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button className="btn btn-ghost row-icon-btn" aria-label={u.status === "aktif" ? "Nonaktifkan" : "Aktifkan"} title={u.status === "aktif" ? "Nonaktifkan" : "Aktifkan"} disabled={!canManage(u.role)} onClick={() => setUsers((prev) => prev.map((x) => x.id === u.id ? { ...x, status: x.status === "aktif" ? "pending" : "aktif" } : x))}><IcoPower size={16} /></button>
                      <button className="btn btn-danger row-icon-btn" aria-label="Hapus" title="Hapus" disabled={!canManage(u.role)}><IcoTrash size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredUsers.length === 0 && <tr><td colSpan={5} style={{ textAlign: "center", padding: 24 }} className="muted">Tidak ada admin yang cocok.</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {showAdd && (
        <AddAdminModal
          onClose={() => setShowAdd(false)}
          onSave={handleAdd}
          roleOptions={roleOptions}
        />
      )}
    </div>
  );
}

function AddAdminModal({
  onClose, onSave, roleOptions,
}: {
  onClose: () => void;
  onSave: (nama: string, role: AdminRole, wilayah: string, email?: string, password?: string, desaId?: number, kelompokId?: number) => void;
  roleOptions: { value: AdminRole; label: string }[];
}) {
  const [nama, setNama] = useState("");
  const [roleBaru, setRoleBaru] = useState<AdminRole>(roleOptions[0]?.value ?? "admin_kelompok");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [desaList, setDesaList] = useState<{ id: number; nama: string }[]>([]);
  const [kelList, setKelList] = useState<{ id: number; nama: string; desaId: number }[]>([]);
  const [selectedDesaId, setSelectedDesaId] = useState<number | "">("");
  const [selectedKelId, setSelectedKelId] = useState<number | "">("");

  useEffect(() => {
    apiFetch("/api/admin/desa").then((r: any) => setDesaList(Array.isArray(r) ? r : [])).catch(() => {});
    apiFetch("/api/admin/kelompok").then((r: any) => setKelList(Array.isArray(r) ? r : [])).catch(() => {});
  }, []);

  useEffect(() => {
    setSelectedDesaId("");
    setSelectedKelId("");
  }, [roleBaru]);

  const filteredKel = selectedDesaId ? kelList.filter((k) => k.desaId === Number(selectedDesaId)) : [];
  const needDesa = roleBaru === "admin_desa" || roleBaru === "admin_kelompok";
  const needKel = roleBaru === "admin_kelompok";
  const valid = nama.trim().length >= 3 && email.trim().includes("@") && password.length >= 8 && (!needDesa || selectedDesaId !== "") && (!needKel || selectedKelId !== "");

  return (
    <AdminModal title="Tambah Admin" onClose={onClose}>
      <div style={{ display: "grid", gap: 12 }}>
        <div className="field">
          <label>Nama *</label>
          <input value={nama} onChange={(e) => setNama(e.target.value)} placeholder="Nama admin" />
        </div>
        <div className="field">
          <label>Role *</label>
          <Select
            value={roleBaru}
            onChange={(v) => setRoleBaru(v as AdminRole)}
            ariaLabel="Role admin"
            options={roleOptions.map((o) => ({ value: o.value, label: o.label }))}
          />
        </div>
        {needDesa && (
          <div className="field">
            <label>Desa *</label>
            <Select
              value={selectedDesaId === "" ? "" : String(selectedDesaId)}
              onChange={(v) => { setSelectedDesaId(v ? Number(v) : ""); setSelectedKelId(""); }}
              ariaLabel="Pilih desa"
              options={[{ value: "", label: "-- Pilih Desa --" }, ...desaList.map((d) => ({ value: String(d.id), label: d.nama }))]}
            />
          </div>
        )}
        {needKel && selectedDesaId && (
          <div className="field">
            <label>Kelompok *</label>
            <Select
              value={selectedKelId === "" ? "" : String(selectedKelId)}
              onChange={(v) => setSelectedKelId(v ? Number(v) : "")}
              ariaLabel="Pilih kelompok"
              options={[{ value: "", label: "-- Pilih Kelompok --" }, ...filteredKel.map((k) => ({ value: String(k.id), label: k.nama }))]}
            />
          </div>
        )}
        <div className="field"><label>Email *</label><input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nama@email.com" /></div>
        <div className="field"><label>Password *</label><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min 8 karakter" /></div>
        <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
          <button className="btn btn-ghost" style={{ flex: 1 }} onClick={onClose}>Batal</button>
          <button
            className="btn btn-primary"
            style={{ flex: 1 }}
            disabled={!valid}
            onClick={() => onSave(nama.trim(), roleBaru, "", email.trim().toLowerCase(), password, selectedDesaId ? Number(selectedDesaId) : undefined, selectedKelId ? Number(selectedKelId) : undefined)}
          >
            Simpan Admin
          </button>
        </div>
      </div>
    </AdminModal>
  );
}

function WilayahPage() {
  const [desas, setDesas] = useState<DesaWilayah[]>([]);
  const [kelompoks, setKelompoks] = useState<KelompokWilayah[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loadingWilayah, setLoadingWilayah] = useState(false);
  const [_wilayahErr, setWilayahErr] = useState<string | null>(null);
  void loadingWilayah as unknown as void;
  const [showAddDesa, setShowAddDesa] = useState(false);
  const [showAddKelompok, setShowAddKelompok] = useState<string | null>(null);
  const [qrTarget, setQrTarget] = useState<QrTarget | null>(null);
  const [qWilayah, setQWilayah] = useState("");
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());

  async function loadWilayah() {
    // Gencar auth is cookie-based (httpOnly auth-token + CSRF). No localStorage token required.
    void localStorage.getItem("token"); // kept for compat if Bearer token present, but do not gate
    setLoadingWilayah(true);
    setWilayahErr(null);
    try {
      const [desaRaw, kelRaw, statRaw] = await Promise.all([
        apiFetch<unknown>("/api/admin/desa").catch(() => apiFetch<unknown>("/api/auth/desa")),
        apiFetch<unknown>("/api/admin/kelompok").catch(() => apiFetch<unknown>("/api/auth/kelompok")),
        apiFetch<unknown>("/api/statistik").catch(() => null),
      ]);
      const uD = unwrapList<{ id: number | string; nama: string }>(desaRaw as unknown);
      const arrD = Array.isArray(desaRaw) ? desaRaw as { id: number | string; nama: string }[] : uD.data as { id: number | string; nama: string }[];
      setDesas((arrD as { id: number | string; nama: string }[]).map((d) => ({ id: String(d.id), nama: d.nama })));
      const uK = unwrapList<{ id: number | string; nama: string; desaId: number | string }>(kelRaw as unknown);
      const arrK = Array.isArray(kelRaw) ? kelRaw as { id: number | string; nama: string; desaId: number | string }[] : uK.data as { id: number | string; nama: string; desaId: number | string }[];
      setKelompoks((arrK as { id: number | string; nama: string; desaId: number | string }[]).map((k) => ({ id: String(k.id), nama: k.nama, desaId: String(k.desaId) })));
      if (statRaw && typeof statRaw === "object" && (statRaw as { member?: { byDesa?: { name: string; value: number }[] } }).member?.byDesa) {
        const byDesa = (statRaw as { member: { byDesa: { name: string; value: number }[] } }).member.byDesa;
        const m: Record<string, number> = {};
        for (const r of byDesa) m[r.name] = r.value;
        setCounts(m);
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (!msg.includes("401")) setWilayahErr(msg);
    } finally {
      setLoadingWilayah(false);
    }
  }

  useEffect(() => { void loadWilayah(); }, []);

  const countDesa = desas.length;
  const countKelompok = kelompoks.length;
  const countAnggota = Object.values(counts).reduce((a, b) => a + b, 0) || 0;

  const anggotaDesa = (nama: string) => counts[nama] ?? 0;
  const anggotaKelompok = (_nama: string) => 0;

  const [deleteTarget, setDeleteTarget] = useState<{ kind: "desa" | "kelompok"; id: string; nama: string; kelompokCount?: number } | null>(null);

  async function doDelete(target: { kind: "desa" | "kelompok"; id: string }) {
    if (target.kind === "desa") {
      await apiFetch(`/api/admin/desa?id=${encodeURIComponent(target.id)}`, { method: "DELETE" });
    } else {
      await apiFetch(`/api/admin/kelompok?id=${encodeURIComponent(target.id)}`, { method: "DELETE" });
    }
    setDeleteTarget(null);
    await loadWilayah();
  }

  async function tambahDesa(nama: string) {
    await apiFetch("/api/admin/desa", { method: "POST", body: JSON.stringify({ nama }) });
    await loadWilayah();
    setShowAddDesa(false);
  }

  async function tambahKelompok(desaId: string, nama: string) {
    await apiFetch("/api/admin/kelompok", { method: "POST", body: JSON.stringify({ nama, desaId: Number(desaId) }) });
    await loadWilayah();
    setCollapsed((prev) => {
      const n = new Set(prev);
      n.delete(desaId);
      return n;
    });
    setShowAddKelompok(null);
  }

  const lowerQ = qWilayah.trim().toLowerCase();
  const isSearching = lowerQ.length > 0;

  const filteredDesas = useMemo(() => {
    if (!isSearching) return desas.map((d) => ({ desa: d, matchDesa: false as boolean, kelompokMatchIds: new Set<string>() as Set<string> }));
    return desas
      .map((d) => {
        const matchDesa = d.nama.toLowerCase().includes(lowerQ);
        const kms = kelompoks.filter((k) => k.desaId === d.id);
        const matchedKel = kms.filter((k) => k.nama.toLowerCase().includes(lowerQ));
        const kelompokMatchIds = new Set(matchedKel.map((k) => k.id));
        const keep = matchDesa || matchedKel.length > 0;
        return { desa: d, matchDesa, kelompokMatchIds, keep, matchedKel, kms };
      })
      .filter((x: any) => x.keep)
      .map((x: any) => ({ desa: x.desa, matchDesa: x.matchDesa, kelompokMatchIds: x.kelompokMatchIds }));
  }, [desas, kelompoks, lowerQ, isSearching]);

  function toggleDesa(id: string) {
    setCollapsed((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  const firstMatchKelompokId = useMemo(() => {
    if (!isSearching) return null;
    for (const { kelompokMatchIds } of filteredDesas) {
      for (const id of kelompokMatchIds) return id;
    }
    return null;
  }, [filteredDesas, isSearching]);

  useEffect(() => {
    if (!firstMatchKelompokId) return;
    const t = setTimeout(() => {
      const el = document.getElementById(`wilayah-kel-${firstMatchKelompokId}`);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 80);
    return () => clearTimeout(t);
  }, [firstMatchKelompokId, qWilayah]);

  return (
    <div>
      <PageHeader title="Manajemen Wilayah" sub="Kelola desa dan kelompok di bawah Daerah Cengkareng" action={<button className="btn btn-primary btn-auto" onClick={() => setShowAddDesa(true)}>+ Tambah Desa</button>} />

      <div className="kpi">
        <KpiCard icon={<span className="kpi-icon kpi-icon--emerald"><IcoMapPin size={18} /></span>} label="Desa" value={countDesa} />
        <KpiCard icon={<span className="kpi-icon kpi-icon--slate"><IcoUsers size={18} /></span>} label="Kelompok" value={countKelompok} />
        <KpiCard icon={<span className="kpi-icon kpi-icon--amber"><IcoCalendar size={18} /></span>} label="Total anggota" value={countAnggota} />
        <KpiCard icon={<span className="kpi-icon kpi-icon--peach"><IcoQr size={18} /></span>} label="Rata-rata / desa" value={desas.length ? (countKelompok / desas.length).toFixed(1) : 0} />
      </div>

      <div className="wilayah-tree card">
        <div className="wilayah-desa-head">
          <span className="kpi-icon kpi-icon--emerald"><IcoMapPin size={18} /></span>
          <div>
            <div style={{ fontWeight: 800 }}>Daerah Cengkareng</div>
            <span className="pill pill-emerald">Daerah</span>
          </div>
          <div className="muted" style={{ marginLeft: "auto" }}>Singleton &mdash; root tanpa tabel daerah</div>
          <button className="btn btn-ghost row-icon-btn" aria-label="QR Absen" title="QR Absen" onClick={() => setQrTarget({ level: "daerah", nama: "Daerah Cengkareng" })}>
            <IcoQr size={16} />
          </button>
        </div>
      </div>

      <div className="admin-toolbar wilayah-toolbar" style={{ marginTop: 16, marginBottom: 12 }}>
        <label className="search" style={{ maxWidth: 420 }}>
          <IcoSearch size={14} />
          <input
            placeholder="Cari desa / kelompok..."
            value={qWilayah}
            onChange={(e) => setQWilayah(e.target.value)}
            aria-label="Cari wilayah"
          />
          {qWilayah && (
            <button
              type="button"
              className="btn-close"
              style={{ width: 28, height: 28, minWidth: 28, minHeight: 28 }}
              aria-label="Hapus pencarian"
              onClick={() => setQWilayah("")}
            >
              <IcoX size={12} />
            </button>
          )}
        </label>
        {isSearching && <span className="pill pill-slate">{filteredDesas.length} desa cocok</span>}
        {isSearching && firstMatchKelompokId && <span className="muted" style={{ fontSize: 12 }}>Kelompok cocok auto terbuka &amp; fokus</span>}
        {!isSearching && desas.length > 0 && (() => {
          const allCollapsed = desas.length > 0 && desas.every((d) => collapsed.has(d.id));
          return (
            <button
              type="button"
              className="wilayah-collapse-toggle"
              aria-label={allCollapsed ? "Buka semua desa" : "Collapse semua desa"}
              aria-pressed={allCollapsed}
              title={allCollapsed ? "Buka semua" : "Collapse semua"}
              onClick={() => setCollapsed(allCollapsed ? new Set() : new Set(desas.map((d) => d.id)))}
            >
              {allCollapsed ? <IcoUnfold size={16} /> : <IcoFold size={16} />}
            </button>
          );
        })()}
      </div>

      <div style={{ display: "grid", gap: 16 }}>
        {filteredDesas.map(({ desa, matchDesa, kelompokMatchIds }) => {
          const allForDesa = kelompoks.filter((k) => k.desaId === desa.id);
          const visibleKel = isSearching
            ? (matchDesa ? allForDesa : allForDesa.filter((k) => kelompokMatchIds.has(k.id)))
            : allForDesa;
          const hasKelMatch = kelompokMatchIds.size > 0;
          const forceOpen = isSearching && (matchDesa || hasKelMatch);
          const isCollapsed = collapsed.has(desa.id) && !forceOpen;
          const isOpen = !isCollapsed;
          return (
            <div key={desa.id} className={`card wilayah-desa ${matchDesa ? "wilayah-desa--match" : ""} ${isCollapsed ? "wilayah-desa--collapsed" : ""}`}>
              <div className="wilayah-desa-head">
                <button
                  type="button"
                  className={`wilayah-toggle ${isOpen ? "open" : ""}`}
                  aria-label={isOpen ? "Tutup desa" : "Buka desa"}
                  aria-expanded={isOpen}
                  onClick={() => toggleDesa(desa.id)}
                >
                  <IcoChevronDown size={14} />
                </button>
                <span className="kpi-icon kpi-icon--slate"><IcoMapPin size={18} /></span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 800 }}>{desa.nama}</div>
                  <div style={{ display: "flex", gap: 6, marginTop: 2, flexWrap: "wrap" }}>
                    <span className="pill pill-slate">Desa</span>
                    <span className="pill pill-emerald">{allForDesa.length} kelompok</span>
                    <span className="pill pill-slate">{anggotaDesa(desa.nama)} anggota</span>
                    {isSearching && visibleKel.length !== allForDesa.length && (
                      <span className="pill pill-amber">{visibleKel.length} cocok</span>
                    )}
                  </div>
                </div>
                <div className="wilayah-actions">
                  <span className="muted" style={{ fontSize: 12, marginRight: 2 }}>{visibleKel.length} kelompok{isCollapsed ? " • tertutup" : ""}</span>
                  <button className="btn btn-ghost row-icon-btn" aria-label="Tambah kelompok" title="Tambah kelompok" onClick={() => setShowAddKelompok(desa.id)}>
                    <span aria-hidden="true" style={{ fontSize: 20, fontWeight: 700, lineHeight: 1 }}>+</span>
                  </button>
                    <button className="btn btn-danger row-icon-btn" aria-label="Hapus desa" title="Hapus desa — harus kosong" onClick={() => setDeleteTarget({ kind: "desa", id: desa.id, nama: desa.nama, kelompokCount: allForDesa.length })}>
                    <IcoTrash size={16} />
                  </button>
                  <button className="btn btn-ghost row-icon-btn" aria-label="QR Absen" title="QR Absen" onClick={() => setQrTarget({ level: "desa", nama: desa.nama })}>
                    <IcoQr size={16} />
                  </button>
                </div>
              </div>

              {isOpen && (
                <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
                  {visibleKel.map((kel) => {
                    const isKelMatch = isSearching && kelompokMatchIds.has(kel.id);
                    return (
                      <div
                        key={kel.id}
                        id={`wilayah-kel-${kel.id}`}
                        className={`wilayah-kelompok-row ${isKelMatch ? "wilayah-kelompok-row--match" : ""}`}
                      >
                        <span className="wilayah-kelompok-dot" />
                        <div className="wilayah-kelompok-main">
                          <div className="wilayah-kelompok-info">
                            <span className="wilayah-kelompok-name">{kel.nama}</span>
                            <span className="pill pill-slate">{anggotaKelompok(kel.nama)} anggota</span>
                          </div>
                          <div className="wilayah-kelompok-actions">
                            <button className="btn btn-danger row-icon-btn" aria-label="Hapus kelompok" title="Hapus kelompok — harus kosong" onClick={() => setDeleteTarget({ kind: "kelompok", id: kel.id, nama: kel.nama })}>
                              <IcoTrash size={15} />
                            </button>
                            <button className="btn btn-ghost row-icon-btn" aria-label="QR Absen" title="QR Absen" onClick={() => setQrTarget({ level: "kelompok", nama: kel.nama })}>
                              <IcoQr size={15} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {visibleKel.length === 0 && (
                    <div className="muted">{isSearching ? "Tidak ada kelompok yang cocok." : "Belum ada kelompok di desa ini."}</div>
                  )}
                </div>
              )}
            </div>
          );
        })}
        {filteredDesas.length === 0 && (
          <div className="lp-empty-card">Tidak ada desa / kelompok yang cocok untuk &ldquo;{qWilayah}&rdquo;.</div>
        )}
      </div>

      {showAddDesa && (
        <AddWilayahModal
          title="Tambah Desa"
          label="Nama Desa"
          placeholder="Mis. Fajar"
          onClose={() => setShowAddDesa(false)}
          onSave={tambahDesa}
        />
      )}

      {showAddKelompok && (
        <AdminModal title="Tambah Kelompok" onClose={() => setShowAddKelompok(null)}>
          <AddWilayahForm
            label="Nama Kelompok"
            placeholder="Mis. Fajar D"
            onCancel={() => setShowAddKelompok(null)}
            onSave={(nama) => tambahKelompok(showAddKelompok, nama)}
          />
        </AdminModal>
      )}

      {qrTarget && <QrModal target={qrTarget} onClose={() => setQrTarget(null)} />}

      {deleteTarget && (
        <DeleteWilayahConfirmModal
          kind={deleteTarget.kind}
          nama={deleteTarget.nama}
          kelompokCount={deleteTarget.kelompokCount}
          onClose={() => setDeleteTarget(null)}
          onConfirm={() => doDelete(deleteTarget)}
        />
      )}
    </div>
  );
}

function DeleteWilayahConfirmModal({
  kind,
  nama,
  kelompokCount,
  onClose,
  onConfirm,
}: {
  kind: "desa" | "kelompok";
  nama: string;
  kelompokCount?: number;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}) {
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const isMatch = typed.trim() === nama;
  const hintLabel = kind === "desa" ? "desa" : "kelompok";

  async function handleConfirm() {
    if (!isMatch || busy) return;
    setBusy(true);
    setErr(null);
    try {
      await onConfirm();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setErr(msg);
    } finally {
      setBusy(false);
    }
  }

  const emptyPrecheck =
    kind === "desa" && kelompokCount !== undefined && kelompokCount > 0
      ? `Desa ini masih punya ${kelompokCount} kelompok. Hapus semua kelompok dulu — anggota akan menjadi tidak ter-assign, kegiatan ikut terhapus.`
      : null;

  return (
    <AdminModal title={`Hapus ${hintLabel}?`} onClose={onClose}>
      <div style={{ display: "grid", gap: 14 }}>
        {emptyPrecheck ? (
          <div style={{ padding: "12px 14px", borderRadius: 12, background: "#fef2f2", border: "1px solid #fecaca", color: "#7f1d1d", fontSize: 13, lineHeight: 1.5 }}>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>Belum kosong</div>
            <div>{emptyPrecheck}</div>
          </div>
        ) : (
          <div style={{ padding: "12px 14px", borderRadius: 12, background: "#fffbeb", border: "1px solid #fde68a", color: "#78350f", fontSize: 13, lineHeight: 1.5 }}>
            {kind === "desa" ? (
              <>Desa akan dihapus. <strong>Kegiatan</strong> desa ini ikut terhapus. <strong>Anggota</strong> desa ini menjadi tidak memiliki desa (desa_id → null).</>
            ) : (
              <>Kelompok akan dihapus. <strong>Kegiatan</strong> kelompok ini ikut terhapus. <strong>Anggota</strong> kelompok ini menjadi tidak memiliki kelompok (kelompok_id → null).</>
            )}
          </div>
        )}

        <div style={{ fontSize: 13, lineHeight: 1.5 }}>
          Ketik nama <strong style={{ fontFamily: "monospace", background: "#f1f5f9", padding: "2px 6px", borderRadius: 6 }}>{nama}</strong> persis untuk melanjutkan.
        </div>

        <div className="field">
          <label>Ketik nama {hintLabel} *</label>
          <input value={typed} onChange={(e) => setTyped(e.target.value)} placeholder={nama} disabled={busy || !!emptyPrecheck} autoComplete="off" autoFocus={!emptyPrecheck} />
        </div>

        {err && (
          <div style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid #fecaca", background: "#fef2f2", color: "#991b1b", fontSize: 13, display: "flex", gap: 8 }}>
            <span style={{ flex: 1, wordBreak: "break-word" }}>{err}</span>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setErr(null)}>Tutup</button>
          </div>
        )}

        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-ghost" style={{ flex: 1 }} disabled={busy} onClick={onClose}>Batal</button>
          <button
            className="btn btn-danger"
            style={{ flex: 1 }}
            disabled={!isMatch || busy || !!emptyPrecheck}
            aria-busy={busy}
            onClick={() => void handleConfirm()}
          >
            {busy ? "Menghapus…" : `Hapus ${hintLabel}`}
          </button>
        </div>
      </div>
    </AdminModal>
  );
}

function AddWilayahModal({
  title, label, placeholder, onClose, onSave,
}: {
  title: string; label: string; placeholder: string; onClose: () => void; onSave: (nama: string) => void | Promise<void>;
}) {
  return (
    <AdminModal title={title} onClose={onClose}>
      <AddWilayahForm label={label} placeholder={placeholder} onCancel={onClose} onSave={onSave} />
    </AdminModal>
  );
}

function AddWilayahForm({
  label, placeholder, onCancel, onSave,
}: {
  label: string; placeholder: string; onCancel: () => void; onSave: (nama: string) => void | Promise<void>;
}) {
  const [nama, setNama] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const valid = nama.trim().length >= 2;

  async function handleSave() {
    if (!valid || busy) return;
    setBusy(true);
    setErr(null);
    try {
      await onSave(nama.trim());
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      // Surface inline + keep modal open so user can retry
      setErr(msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div className="field">
        <label>{label} *</label>
        <input value={nama} onChange={(e) => setNama(e.target.value)} placeholder={placeholder} disabled={busy} />
      </div>
      {err && (
        <div style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid #fecaca", background: "#fef2f2", color: "#991b1b", fontSize: 13, display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ flex: 1, wordBreak: "break-word" }}>{err}</span>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setErr(null)}>Tutup</button>
        </div>
      )}
      <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
        <button className="btn btn-ghost" style={{ flex: 1 }} disabled={busy} onClick={onCancel}>Batal</button>
        <button className="btn btn-primary" style={{ flex: 1 }} disabled={!valid || busy} aria-busy={busy} onClick={() => void handleSave()}>{busy ? "Menyimpan…" : "Simpan"}</button>
      </div>
      {busy && <span className="muted" style={{ fontSize: 11, textAlign: "center" }}>Menyimpan — jangan tutup.</span>}
    </div>
  );
}

import CmsPage from "./features/cms/CmsPage";
import ProfileRequestsPage from "./features/admin/ProfileRequestsPage";
import MemberShell from "./features/member/MemberShell";
import { useAuth } from "./lib/auth";
import { useNavigate } from "react-router-dom";
import type { MemberPageKey } from "./features/member/MemberShell";
import MemberHomePage from "./features/member/MemberHomePage";
import MemberProfilePage from "./features/member/MemberProfilePage";
import MemberStatPage from "./features/member/MemberStatPage";
import { DEMO_SELF, DEMO_KEHADIRAN, DEMO_KEGIATAN_MEMBER } from "./features/member/types";

export default function App({ initialMode }: { initialMode?: "admin" | "member" } = {}) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const role: AdminRole = (user?.role as AdminRole | undefined) ?? "admin_kelompok";
  const [_mode, _setMode] = useState<"admin" | "member">(initialMode ?? "member");
  void _mode; void _setMode;
  const [page, setPage] = useState("anggota");
  const [memberPage, setMemberPage] = useState<MemberPageKey>("beranda");
  const [me, setMe] = useState(DEMO_SELF);

  const isAdmin = ["admin_daerah", "admin_desa", "admin_kelompok"].includes(String(role));

  if (initialMode === "member") {
    return (
      <MemberShell
        page={memberPage}
        setPage={setMemberPage}
        me={me}
        onExit={async () => { await logout(); navigate("/login", { replace: true }); }}
        onLogout={async () => { await logout(); navigate("/login", { replace: true }); }}
      >
        {memberPage === "beranda" && <MemberHomePage me={me} />}
        {memberPage === "profil" && <MemberProfilePage me={me} stat={DEMO_KEHADIRAN} kegiatan={DEMO_KEGIATAN_MEMBER} onUpdate={setMe} />}
        {memberPage === "statistik" && <MemberStatPage me={me} stat={DEMO_KEHADIRAN} />}
      </MemberShell>
    );
  }

  if (!isAdmin) {
    // Should not happen due to RequireAuth, but guard: non-admin hitting /admin → bounce to member
    return (
      <MemberShell
        page={memberPage}
        setPage={setMemberPage}
        me={me}
        onExit={async () => { await logout(); navigate("/login", { replace: true }); }}
        onLogout={async () => { await logout(); navigate("/login", { replace: true }); }}
      >
        {memberPage === "beranda" && <MemberHomePage me={me} />}
        {memberPage === "profil" && <MemberProfilePage me={me} stat={DEMO_KEHADIRAN} kegiatan={DEMO_KEGIATAN_MEMBER} onUpdate={setMe} />}
        {memberPage === "statistik" && <MemberStatPage me={me} stat={DEMO_KEHADIRAN} />}
      </MemberShell>
    );
  }

  const effectivePage = page === "pengurus" ? "cms" : page;
  return (
    <>
      <AdminShell page={effectivePage} setPage={setPage}>
        {effectivePage === "anggota" && <AnggotaPage role={role} />}
        {effectivePage === "kegiatan" && <KegiatanAdmin role={role} />}
        {effectivePage === "pengajuan" && <ProfileRequestsPage />}
        {effectivePage === "users" && <UsersManage role={role} />}
        {effectivePage === "wilayah" && <WilayahPage />}
        {effectivePage === "cms" && <CmsPage />}
        {effectivePage === "statistik" && <StatistikPage />}
      </AdminShell>
    </>
  );
}
