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

const DEMO_KEGIATAN: Kegiatan[] = [
  { id: "k1", judul: "Sambung Muda-Mudi Kelompok Fajar C", kategori: "sambung_rutin", tingkat: "kelompok", desa: "Fajar", kelompok: "Fajar C", tanggal: "2026-05-08", jam: "19:30", lokasi: "Masjid Fajar", lat: -6.14, lng: 106.7, radiusM: 100 },
  { id: "k2", judul: "Keakraban: Futsal Bareng", kategori: "keakraban", tingkat: "desa", desa: "Cengkareng Timur", tanggal: "2026-05-09", jam: "08:00", lokasi: "Lapangan Duri", lat: -6.141, lng: 106.705, radiusM: 120 },
  { id: "k3", judul: "Pemantapan Materi Pra-Nikah", kategori: "pemantapan", tingkat: "daerah", tanggal: "2026-05-10", jam: "13:00", lokasi: "Aula Daerah Cengkareng", lat: null, lng: null, radiusM: 100 },
  { id: "k4", judul: "Kerja Bakti Lingkungan", kategori: "lainnya", kategoriCustom: "Kerja Bakti", tingkat: "kelompok", desa: "Fajar", kelompok: "Fajar B", tanggal: "2026-05-10", jam: "07:00", lokasi: "Lingkungan RW 02", lat: -6.1395, lng: 106.698, radiusM: 80 },
];

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
  const filtered = useMemo(() => {
    let list = DEMO_MEMBERS;
    if (f.kategoriMudaMudi !== "semua") list = list.filter((m) => m.kategoriMudaMudi === f.kategoriMudaMudi);
    if (f.jenisKelamin !== "semua") list = list.filter((m) => (f.jenisKelamin === "L" ? m.nama.length % 2 === 0 : m.nama.length % 2 === 1));
    return list;
  }, [f]);

  const totalFiltered = filtered.length;

  return (
    <div className="statistik-page" style={{ minWidth: 0 }}>
      <div className="page-header">
        <div>
          <h1>Statistik</h1>
          <div className="page-header-sub">Ringkasan kehadiran &amp; sebaran anggota — recharts (mock)</div>
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
        <KpiCard icon={<span className="kpi-icon kpi-icon--slate"><IcoCalendar size={18} /></span>} label="Hadir Rate" value={`${STAT_MOCK.kpi.hadirRate}%`} />
        <KpiCard icon={<span className="kpi-icon kpi-icon--emerald"><IcoUsers size={18} /></span>} label="Total Absensi" value={159} />
        <KpiCard icon={<span className="kpi-icon kpi-icon--amber"><IcoBarChart size={18} /></span>} label="Total Kegiatan" value={STAT_MOCK.kpi.totalKegiatan} />
        <KpiCard icon={<span className="kpi-icon kpi-icon--peach"><IcoMapPin size={18} /></span>} label="Rata-rata / Kegiatan" value={STAT_MOCK.kpi.avgPerKegiatan} />
      </div>

      {/* Tren + Komposisi — single col on mobile */}
      <div className="statistik-grid-2" style={{ display: "grid", gap: 16, marginBottom: 24 }}>
        <div className="card" style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 800, marginBottom: 4 }}>Tren Kehadiran per Bulan</div>
          <div className="muted" style={{ marginBottom: 8 }}>Hadir / Izin / Alpha per bulan</div>
          <div style={{ height: isMobile ? 200 : 220, minWidth: 0 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={STAT_MOCK.tren}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="label" tick={{ fontSize: isMobile ? 10 : 12 }} />
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
          <div className="muted" style={{ marginBottom: 8 }}>Hadir / Izin / Alpha</div>
          <div style={{ height: isMobile ? 200 : 220, minWidth: 0 }}>
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
        <KpiCard icon={<span className="kpi-icon kpi-icon--emerald"><IcoUsers size={18} /></span>} label="Total Anggota" value={STAT_MOCK.kpi.totalAnggota} />
        <KpiCard icon={<span className="kpi-icon kpi-icon--peach"><IcoUsers size={18} /></span>} label="Pribumi" value={STAT_MOCK.byMudaMudi[0].value} />
        <KpiCard icon={<span className="kpi-icon kpi-icon--slate"><IcoMapPin size={18} /></span>} label="Perantauan" value={STAT_MOCK.byMudaMudi[1].value} />
        <KpiCard icon={<span className="kpi-icon kpi-icon--amber"><IcoMapPin size={18} /></span>} label="Jumlah Desa" value={STAT_MOCK.byDesa.length} />
      </div>

      {/* Sebaran — 1 col on mobile, 2 on tablet, 3 on desktop */}
      <div className="statistik-grid-3" style={{ display: "grid", gap: 16, marginBottom: 16 }}>
        <div className="card" style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 800, marginBottom: 8 }}>Jenis Kelamin</div>
          <div style={{ height: isMobile ? 160 : 180, minWidth: 0 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={STAT_MOCK.byGender as any}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="label" tick={{ fontSize: isMobile ? 10 : 12 }} interval={0} angle={isMobile ? -12 : 0} dy={isMobile ? 8 : 0} height={isMobile ? 36 : 30} />
                <YAxis tick={{ fontSize: isMobile ? 10 : 12 }} width={isMobile ? 28 : 32} />
                <Tooltip />
                <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                  {STAT_MOCK.byGender.map((e, i) => (
                    <Cell key={i} fill={e.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="card" style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 800, marginBottom: 8 }}>Pribumi vs Perantauan</div>
          <div style={{ height: isMobile ? 180 : 180, minWidth: 0 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart margin={{ top: 8, right: 16, bottom: 8, left: 16 }}>
                <Pie data={STAT_MOCK.byMudaMudi as any} dataKey="value" nameKey="label" cx="50%" cy="50%" outerRadius={isMobile ? 56 : 66} labelLine={false} label={false}>
                  {STAT_MOCK.byMudaMudi.map((e, i) => (
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
          <div style={{ fontWeight: 800, marginBottom: 8 }}>Per Desa</div>
          <div style={{ height: isMobile ? 160 : 180, minWidth: 0 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={STAT_MOCK.byDesa as any} layout="vertical">
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
        <div style={{ fontWeight: 800, marginBottom: 8 }}>Per Pendidikan (Top)</div>
        <div style={{ height: isMobile ? 180 : 200, minWidth: 0 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={STAT_MOCK.byPendidikan as any}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="label" tick={{ fontSize: isMobile ? 10 : 12 }} interval={0} angle={isMobile ? -14 : 0} dy={10} height={isMobile ? 42 : 30} />
              <YAxis tick={{ fontSize: isMobile ? 10 : 12 }} width={isMobile ? 28 : 32} />
              <Tooltip />
              <Bar dataKey="value" fill="#f59e0b" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="muted" style={{ marginTop: 8, fontSize: 11 }}>Mock recharts — siap ganti ke data real dari Next API `/api/statistik` kapan pun.</div>
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
  const navItems: { key: string; label: string; icon: React.ReactNode }[] = [
    { key: "anggota", label: "Anggota", icon: <IcoUsers /> },
    { key: "kegiatan", label: "Kegiatan", icon: <IcoCalendar /> },
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
          >
            {it.icon} <span>{it.label}</span>
          </button>
        ))}
      </nav>
      <main className="admin-main">{children}</main>
    </div>
  );
}


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

function AnggotaPage({ role }: { role: AdminRole }) {
  const [q, setQ] = useState("");
  const [view, setView] = useState<ViewMode>("list");
  const [showFilter, setShowFilter] = useState(false);
  const [statusFilter, setStatusFilter] = useState("semua");
  const [kategoriFilter, setKategoriFilter] = useState("semua");
  const [desaFilter, setDesaFilter] = useState("Semua");
  const [kelompokFilter, setKelompokFilter] = useState("semua");
  const [showAdd, setShowAdd] = useState(false);
  const [detailMember, setDetailMember] = useState<Member | null>(null);
  const [members, setMembers] = useState<Member[]>(DEMO_MEMBERS);
  const isMobile = useIsMobile();
  const effectiveView: ViewMode = isMobile ? "card" : view;

  const filtered = useMemo(() => {
    let list = members;
    if (role === "admin_kelompok") list = list.filter((m) => m.kelompok === "Fajar C");
    else if (role === "admin_desa") list = list.filter((m) => m.desa === "Fajar");
    if (statusFilter !== "semua") list = list.filter((m) => m.status === statusFilter);
    if (kategoriFilter !== "semua") list = list.filter((m) => m.kategoriMudaMudi === kategoriFilter);
    if (desaFilter !== "Semua") list = list.filter((m) => m.desa === desaFilter);
    if (kelompokFilter !== "semua") list = list.filter((m) => m.kelompok === kelompokFilter);
    if (q.trim()) {
      const s = q.toLowerCase();
      list = list.filter((m) => m.nama.toLowerCase().includes(s) || m.noTelp.includes(s) || m.kelompok.toLowerCase().includes(s));
    }
    return list;
  }, [members, role, statusFilter, kategoriFilter, desaFilter, kelompokFilter, q]);

  const adaFilterAktif = statusFilter !== "semua" || kategoriFilter !== "semua" || desaFilter !== "Semua" || kelompokFilter !== "semua";
  const desaOptions = useMemo(() => [...new Set(members.map((m) => m.desa))].sort(), [members]);
  const kelompokOptions = useMemo(() => [...new Set(members.map((m) => m.kelompok))].sort(), [members]);

  return (
    <div>
      <PageHeader title="Anggota" sub="Kelola data anggota muda-mudi" action={<button className="btn btn-primary btn-auto" onClick={() => setShowAdd(true)}>+ Tambah Anggota</button>} />
      <div className="kpi">
        <KpiCard icon={<span className="kpi-icon kpi-icon--emerald"><IcoUsers size={18} /></span>} label="Total anggota (scope)" value={filtered.length} />
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
      </div>
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
                      <div><div style={{ fontWeight: 700 }}>{m.nama}</div><div className="muted">{m.kategoriMudaMudi} &bull; {m.pendidikan}</div></div>
                    </div>
                  </td>
                  <td><span className="pill pill-slate">{m.desa} / {m.kelompok}</span></td>
                  <td>{m.pendidikan}</td>
                  <td title={m.domisiliAnak} style={{ maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.domisiliAnak} {m.isOrtuSama ? "" : "&bull; ortu beda"}</td>
                  <td>{m.noTelp}</td>
                  <td><span className={`pill ${m.status === "aktif" ? "pill-emerald" : "pill-amber"}`}>{m.status}</span></td>
                  <td>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button className="btn btn-ghost row-icon-btn" aria-label="Lihat detail" title="Detail" onClick={() => setDetailMember(m)}><IcoEye size={16} /></button>
                      <button className="btn btn-ghost row-icon-btn" aria-label={m.status === "aktif" ? "Nonaktifkan" : "Aktifkan"} title={m.status === "aktif" ? "Nonaktifkan" : "Aktifkan"} onClick={() => setMembers((prev) => prev.map((x) => x.id === m.id ? { ...x, status: x.status === "aktif" ? "pending" : "aktif" } : x))}><IcoPower size={16} /></button>
                      <button className="btn btn-ghost row-icon-btn" aria-label="Buat QR" title="Buat QR"><IcoQr size={16} /></button>
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
          onToggleStatus={() => {
            setMembers((prev) => prev.map((x) => x.id === detailMember.id ? { ...x, status: x.status === "aktif" ? "pending" : "aktif" } : x));
            setDetailMember((prev) => prev ? { ...prev, status: prev.status === "aktif" ? "pending" : "aktif" } : prev);
          }}
        />
      )}
    </div>
  );
}

function MemberDetailModal({ member, onClose, onToggleStatus }: { member: Member; onClose: () => void; onToggleStatus: () => void }) {
  const rows: { label: string; value: string }[] = [
    { label: "Nama", value: member.nama },
    { label: "Desa / Kelompok", value: `${member.desa} / ${member.kelompok}` },
    { label: "Pendidikan", value: member.pendidikan },
    { label: "No Telp", value: member.noTelp },
    { label: "Kategori", value: member.kategoriMudaMudi === "pribumi" ? "Pribumi" : "Perantauan" },
    { label: "Domisili Anak", value: member.domisiliAnak },
    { label: "Status Ortu", value: member.isOrtuSama ? "Domisili ortu sama dengan anak" : "Domisili ortu berbeda" },
  ];

  return (
    <AdminModal title="Detail Anggota" onClose={onClose}>
      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 16 }}>
        <div className="avatar" style={{ width: 48, height: 48, fontSize: 15 }}>{member.nama.split(" ").map((w) => w[0]).slice(0, 2).join("")}</div>
        <div>
          <div style={{ fontWeight: 800 }}>{member.nama}</div>
          <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
            <span className={`pill ${member.status === "aktif" ? "pill-emerald" : "pill-amber"}`}>{member.status}</span>
            <span className="pill pill-slate">{member.kategoriMudaMudi}</span>
          </div>
        </div>
      </div>
      <div className="detail-rows">
        {rows.map((r) => (
          <div key={r.label} className="detail-row">
            <span className="detail-label">{r.label}</span>
            <span className="detail-value">{r.value}</span>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
        <button className="btn btn-ghost" style={{ flex: 1 }} onClick={onToggleStatus}>
          {member.status === "aktif" ? "Nonaktifkan" : "Aktifkan"}
        </button>
        <button className="btn btn-primary" style={{ flex: 1 }}>Buat QR</button>
      </div>
    </AdminModal>
  );
}

function AddMemberModal({ onClose, onSave }: { onClose: () => void; onSave: (m: Member) => void }) {
  const [s, setS] = useState(1);
  const [form, setForm] = useState({
    nama: "", tempatLahir: "", tanggalLahir: "", noTelp: "", pendidikan: "SMA" as Member["pendidikan"],
    jenisKelamin: "L" as "L" | "P", kategoriMudaMudi: "pribumi" as Member["kategoriMudaMudi"], asalDaerah: "",
    domisiliAnak: "", isOrtuSama: true, domisiliOrtu: "", desa: "Fajar", kelompok: "Fajar C",
  });

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
              <button
                className="btn btn-primary"
                style={{ flex: 1 }}
                onClick={() => onSave({
                  id: `m${Date.now()}`, nama: form.nama, desa: form.desa, kelompok: form.kelompok, pendidikan: form.pendidikan, noTelp: form.noTelp,
                  kategoriMudaMudi: form.kategoriMudaMudi, domisiliAnak: form.domisiliAnak, isOrtuSama: form.isOrtuSama, status: "aktif",
                })}
              >
                Simpan &amp; buat QR
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
  const [list, setList] = useState<Kegiatan[]>(DEMO_KEGIATAN);
  const [radiusM, setRadiusM] = useState("100");
  const [gpsLat, setGpsLat] = useState("");
  const [gpsLng, setGpsLng] = useState("");
  const [showMap, setShowMap] = useState(false);

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
      <PageHeader title="Kegiatan" sub="Kelola agenda dan kegiatan" action={<button className="btn btn-primary btn-auto" onClick={() => setShowForm(true)}>+ Buat Kegiatan</button>} />
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
                className="btn btn-primary" style={{ width: "100%" }} disabled={!canCreate}
                onClick={() => {
                  const v = (id: string) => (document.getElementById(id) as HTMLInputElement)?.value || "";
                  const judul = v("judul") || tpl || "Tanpa judul";
                  void v("deskripsi");
                  const tanggal = v("tanggal") || new Date().toISOString().slice(0, 10);
                  const jam = v("jam") || ""; const lokasi = v("lokasi") || "";
                  const lat = parseFloat(gpsLat); const lng = parseFloat(gpsLng);
                  const radius = parseInt(radiusM, 10);
                  const kategoriCustom = v("kategoriCustom") || undefined;
                  const tingkatVal = tingkat as Tingkat;
                  setList((prev) => [{ id: `k${Date.now()}`, judul, kategori: kategori as Kategori, kategoriCustom, tingkat: tingkatVal, desa: tingkatVal === "desa" || tingkatVal === "kelompok" ? (tingkatVal === "desa" ? namaWilayah : "Fajar") : undefined, kelompok: tingkatVal === "kelompok" ? namaWilayah : undefined, tanggal, jam, lokasi, lat: Number.isFinite(lat) ? lat : null, lng: Number.isFinite(lng) ? lng : null, radiusM: radius }, ...prev]);
                  setGpsLat(""); setGpsLng(""); setShowForm(false);
                }}
              >
                Simpan Kegiatan
              </button>
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
  const [users, setUsers] = useState([
    { id: "u1", nama: "Admin Fajar", role: "admin_desa" as AdminRole, wilayah: "Desa Fajar", status: "aktif" },
    { id: "u2", nama: "Admin Fajar C", role: "admin_kelompok" as AdminRole, wilayah: "Kelompok Fajar C", status: "aktif" },
    { id: "u3", nama: "Admin Timur A", role: "admin_kelompok" as AdminRole, wilayah: "Kelompok Timur A", status: "pending" },
  ]);
  const [showAdd, setShowAdd] = useState(false);
  const [q, setQ] = useState("");
  const isMobile = useIsMobile();

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

  const wilayahOptions = role === "admin_desa" ? ["Desa Fajar"] : ["Desa Fajar", "Desa Cengkareng Timur"];

  const handleAdd = (nama: string, roleBaru: AdminRole, wilayah: string) => {
    setUsers((prev) => [...prev, { id: `u${Date.now()}`, nama, role: roleBaru, wilayah, status: "aktif" }]);
    setShowAdd(false);
  };

  return (
    <div>
      <PageHeader title="Kelola User" sub="Kelola akun admin di bawah kamu" action={<button className="btn btn-primary btn-auto" disabled={role === "admin_kelompok"} onClick={() => setShowAdd(true)}>+ Tambah Admin</button>} />
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
          wilayahOptions={wilayahOptions}
        />
      )}
    </div>
  );
}

function AddAdminModal({
  onClose, onSave, roleOptions, wilayahOptions,
}: {
  onClose: () => void;
  onSave: (nama: string, role: AdminRole, wilayah: string) => void;
  roleOptions: { value: AdminRole; label: string }[];
  wilayahOptions: string[];
}) {
  const [nama, setNama] = useState("");
  const [roleBaru, setRoleBaru] = useState<AdminRole>(roleOptions[0]?.value ?? "admin_kelompok");
  const [wilayah, setWilayah] = useState(wilayahOptions[0] ?? "");
  const valid = nama.trim().length >= 3;

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
        <div className="field">
          <label>Wilayah *</label>
          <Select
            value={wilayah}
            onChange={setWilayah}
            ariaLabel="Wilayah admin"
            options={wilayahOptions.map((w) => ({ value: w, label: w }))}
          />
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
          <button className="btn btn-ghost" style={{ flex: 1 }} onClick={onClose}>Batal</button>
          <button
            className="btn btn-primary"
            style={{ flex: 1 }}
            disabled={!valid}
            onClick={() => onSave(nama.trim(), roleBaru, wilayah)}
          >
            Simpan Admin
          </button>
        </div>
      </div>
    </AdminModal>
  );
}

function WilayahPage() {
  const [desas, setDesas] = useState<DesaWilayah[]>([
    { id: "d1", nama: "Fajar" },
    { id: "d2", nama: "Cengkareng Timur" },
  ]);
  const [kelompoks, setKelompoks] = useState<KelompokWilayah[]>([
    { id: "w1", nama: "Fajar C", desaId: "d1" },
    { id: "w2", nama: "Fajar B", desaId: "d1" },
    { id: "w3", nama: "Timur A", desaId: "d2" },
  ]);
  const [showAddDesa, setShowAddDesa] = useState(false);
  const [showAddKelompok, setShowAddKelompok] = useState<string | null>(null);
  const [qrTarget, setQrTarget] = useState<QrTarget | null>(null);
  const [qWilayah, setQWilayah] = useState("");
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());

  const countDesa = desas.length;
  const countKelompok = kelompoks.length;
  const countAnggota = DEMO_MEMBERS.length;

  const anggotaDesa = (nama: string) => DEMO_MEMBERS.filter((m) => m.desa === nama).length;
  const anggotaKelompok = (nama: string) => DEMO_MEMBERS.filter((m) => m.kelompok === nama).length;

  function hapusDesa(id: string) {
    setDesas((prev) => prev.filter((d) => d.id !== id));
    setKelompoks((prev) => prev.filter((k) => k.desaId !== id));
    setCollapsed((prev) => {
      const n = new Set(prev);
      n.delete(id);
      return n;
    });
  }

  function tambahDesa(nama: string) {
    setDesas((prev) => [...prev, { id: `d${Date.now()}`, nama }]);
    setShowAddDesa(false);
  }

  function tambahKelompok(desaId: string, nama: string) {
    setKelompoks((prev) => [...prev, { id: `w${Date.now()}`, nama, desaId }]);
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
                  <button className="btn btn-danger row-icon-btn" aria-label="Hapus desa" title="Hapus desa" onClick={() => hapusDesa(desa.id)}>
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
                            <button className="btn btn-danger row-icon-btn" aria-label="Hapus kelompok" title="Hapus kelompok" onClick={() => setKelompoks((prev) => prev.filter((k) => k.id !== kel.id))}>
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
    </div>
  );
}

function AddWilayahModal({
  title, label, placeholder, onClose, onSave,
}: {
  title: string; label: string; placeholder: string; onClose: () => void; onSave: (nama: string) => void;
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
  label: string; placeholder: string; onCancel: () => void; onSave: (nama: string) => void;
}) {
  const [nama, setNama] = useState("");
  const valid = nama.trim().length >= 2;
  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div className="field">
        <label>{label} *</label>
        <input value={nama} onChange={(e) => setNama(e.target.value)} placeholder={placeholder} />
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
        <button className="btn btn-ghost" style={{ flex: 1 }} onClick={onCancel}>Batal</button>
        <button className="btn btn-primary" style={{ flex: 1 }} disabled={!valid} onClick={() => onSave(nama.trim())}>Simpan</button>
      </div>
    </div>
  );
}

import CmsPage from "./features/cms/CmsPage";
import MemberShell from "./features/member/MemberShell";
import type { MemberPageKey } from "./features/member/MemberShell";
import MemberHomePage from "./features/member/MemberHomePage";
import MemberProfilePage from "./features/member/MemberProfilePage";
import MemberStatPage from "./features/member/MemberStatPage";
import { DEMO_SELF, DEMO_KEHADIRAN, DEMO_KEGIATAN_MEMBER } from "./features/member/types";

export default function App({ initialMode }: { initialMode?: "admin" | "member" } = {}) {
  const [mode, setMode] = useState<"admin" | "member">(initialMode ?? "member");
  const [role] = useState<AdminRole>("admin_kelompok");
  const [page, setPage] = useState("anggota");
  const [memberPage, setMemberPage] = useState<MemberPageKey>("beranda");
  const [me, setMe] = useState(DEMO_SELF);

  if (mode === "member") {
    return (
      <MemberShell page={memberPage} setPage={setMemberPage} me={me} onExit={() => setMode("admin")}>
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
        {effectivePage === "users" && <UsersManage role={role} />}
        {effectivePage === "wilayah" && <WilayahPage />}
        {effectivePage === "cms" && <CmsPage />}
        {effectivePage === "statistik" && <StatistikPage />}
      </AdminShell>
    </>
  );
}
