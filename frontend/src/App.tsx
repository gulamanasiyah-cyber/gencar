import { useEffect, useMemo, useRef, useState } from "react";
import { sambungJudulTemplate } from "../../shared/validation";
import {
  ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
  PieChart, Pie, Cell,
  AreaChart, Area,
} from "recharts";

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

// ── Inline SVG icons (currentColor, 16-18px) — no extra dep ──
function IcoUsers(props: { size?: number }) {
  return (
    <svg width={props.size ?? 16} height={props.size ?? 16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx={9} cy={7} r={4} /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}
function IcoCalendar(props: { size?: number }) {
  return (
    <svg width={props.size ?? 16} height={props.size ?? 16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x={3} y={4} width={18} height={18} rx={2} /><path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}
function IcoShield(props: { size?: number }) {
  return (
    <svg width={props.size ?? 16} height={props.size ?? 16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
    </svg>
  );
}
function IcoQr(props: { size?: number }) {
  return (
    <svg width={props.size ?? 16} height={props.size ?? 16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x={3} y={3} width={7} height={7} rx={1} /><rect x={14} y={3} width={7} height={7} rx={1} /><rect x={14} y={14} width={7} height={7} rx={1} /><rect x={3} y={14} width={7} height={7} rx={1} />
    </svg>
  );
}
function IcoSearch(props: { size?: number }) {
  return (
    <svg width={props.size ?? 16} height={props.size ?? 16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx={11} cy={11} r={7} /><path d="m20 20-3.5-3.5" />
    </svg>
  );
}
function IcoX(props: { size?: number }) {
  return (
    <svg width={props.size ?? 16} height={props.size ?? 16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}
function IcoChevronDown(props: { size?: number }) {
  return (
    <svg width={props.size ?? 16} height={props.size ?? 16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}
function IcoMapPin(props: { size?: number }) {
  return (
    <svg width={props.size ?? 16} height={props.size ?? 16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx={12} cy={10} r={3} />
    </svg>
  );
}
function IcoBarChart(props: { size?: number }) {
  return (
    <svg width={props.size ?? 16} height={props.size ?? 16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3 3v18h18" /><path d="M7 16V9" /><path d="M12 16V5" /><path d="M17 16v-3" />
    </svg>
  );
}

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
  const ref = useRef<HTMLDivElement>(null);
  const current = options.find((o) => o.value === value);

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

  return (
    <div className={`select ${className ?? ""}`} data-open={open} ref={ref}>
      <button
        type="button"
        className="select-trigger"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
      >
        <span>{current?.label ?? "Pilih"}</span>
        <IcoChevronDown size={14} />
      </button>
      {open && (
        <div className="select-menu" role="listbox">
          {options.map((o) => (
            <button
              key={o.value}
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

void ["#16a34a", "#f59e0b", "#ef4444", "#3b82f6", "#ec4899", "#8b5cf6", "#06b6d4"];

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

      <div className="kpi" style={{ marginBottom: 16 }}>
        <div className="kpi-card" style={{ display: "flex", gap: 12, alignItems: "center" }}><span className="kpi-icon kpi-icon--emerald"><IcoUsers size={18} /></span><div><div className="muted">Total Anggota</div><strong>{STAT_MOCK.kpi.totalAnggota}</strong></div></div>
        <div className="kpi-card" style={{ display: "flex", gap: 12, alignItems: "center" }}><span className="kpi-icon kpi-icon--slate"><IcoCalendar size={18} /></span><div><div className="muted">Hadir Rate</div><strong>{STAT_MOCK.kpi.hadirRate}%</strong></div></div>
        <div className="kpi-card" style={{ display: "flex", gap: 12, alignItems: "center" }}><span className="kpi-icon kpi-icon--amber"><IcoBarChart size={18} /></span><div><div className="muted">Total Kegiatan</div><strong>{STAT_MOCK.kpi.totalKegiatan}</strong></div></div>
        <div className="kpi-card" style={{ display: "flex", gap: 12, alignItems: "center" }}><span className="kpi-icon kpi-icon--peach"><IcoMapPin size={18} /></span><div><div className="muted">Rata-rata / Kegiatan</div><strong>{STAT_MOCK.kpi.avgPerKegiatan}</strong></div></div>
      </div>

      {/* Tren + Komposisi — single col on mobile */}
      <div className="statistik-grid-2" style={{ display: "grid", gap: 16, marginBottom: 16 }}>
        <div className="card" style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 800, marginBottom: 4 }}>Tren Kehadiran per Bulan</div>
          <div className="muted" style={{ marginBottom: 8 }}>Hadir / Izin / Alpha — stacked area</div>
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
  return (
    <div className="admin-shell">
      <nav className="admin-sidebar" aria-label="Admin navigation">
        <div className="sidebar-logo">
          <div className="brand-mark">G</div>
          <span className="sidebar-brand-text">Gencar</span>
        </div>
        <div className="sidebar-divider" />
        <button aria-label="Anggota" className={page === "anggota" ? "active" : ""} onClick={() => setPage("anggota")}><IcoUsers /> <span>Anggota</span></button>
        <button aria-label="Kegiatan" className={page === "kegiatan" ? "active" : ""} onClick={() => setPage("kegiatan")}><IcoCalendar /> <span>Kegiatan</span></button>
        <button aria-label="Kelola user" className={page === "users" ? "active" : ""} onClick={() => setPage("users")}><IcoShield /> <span>User</span></button>
        <button aria-label="Manajemen wilayah" className={page === "wilayah" ? "active" : ""} onClick={() => setPage("wilayah")}><IcoMapPin /> <span>Wilayah</span></button>
        <button aria-label="Statistik" className={page === "statistik" ? "active" : ""} onClick={() => setPage("statistik")}><IcoBarChart /> <span>Statistik</span></button>
      </nav>
      <main className="admin-main">{children}</main>
    </div>
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

  void (() => {
    void setStatusFilter; void setKategoriFilter; void setDesaFilter; void setKelompokFilter;
  });

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Anggota</h1>
          <div className="page-header-sub">Kelola data anggota muda-mudi</div>
        </div>
        <button className="btn btn-primary" style={{ width: "auto" }} onClick={() => setShowAdd(true)}>+ Tambah Anggota</button>
      </div>
      <div className="kpi">
        <div className="kpi-card" style={{ display: "flex", gap: 12, alignItems: "center" }}><span className="kpi-icon kpi-icon--emerald"><IcoUsers size={18} /></span><div><div className="muted">Total anggota (scope)</div><strong>{filtered.length}</strong></div></div>
        <div className="kpi-card" style={{ display: "flex", gap: 12, alignItems: "center" }}><span className="kpi-icon kpi-icon--slate"><IcoShield size={18} /></span><div><div className="muted">Aktif</div><strong>{filtered.filter((m) => m.status === "aktif").length}</strong></div></div>
        <div className="kpi-card" style={{ display: "flex", gap: 12, alignItems: "center" }}><span className="kpi-icon kpi-icon--amber"><IcoCalendar size={18} /></span><div><div className="muted">Pending</div><strong>{filtered.filter((m) => m.status === "pending").length}</strong></div></div>
        <div className="kpi-card" style={{ display: "flex", gap: 12, alignItems: "center" }}><span className="kpi-icon kpi-icon--peach"><IcoUsers size={18} /></span><div><div className="muted">Perantauan</div><strong>{filtered.filter((m) => m.kategoriMudaMudi === "perantauan").length}</strong></div></div>
      </div>

      <div className="admin-toolbar">
        <label className="search">
          <IcoSearch size={14} />
          <input placeholder="Cari nama / no telp / kelompok..." value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
        <button className={`btn ${showFilter ? "btn-primary" : "btn-ghost"} btn-sm`} onClick={() => setShowFilter((s) => !s)} style={{ width: "auto" }}>
          Filter {adaFilterAktif && <span className="filter-count">{(statusFilter !== "semua" ? 1 : 0) + (kategoriFilter !== "semua" ? 1 : 0) + (desaFilter !== "Semua" ? 1 : 0) + (kelompokFilter !== "semua" ? 1 : 0)}</span>}
        </button>
        {!isMobile && (
          <div className="view-toggle" role="group" aria-label="View mode">
            <button className={view === "list" ? "on" : ""} onClick={() => setView("list")}>List</button>
            <button className={view === "card" ? "on" : ""} onClick={() => setView("card")}>Card</button>
          </div>
        )}
      </div>

      {effectiveView === "list" ? (
        <div className="table-wrap">
          <table className="admin-table">
            <thead>
              <tr><th>Nama</th><th>Wilayah</th><th>Pendidikan</th><th>Domisili</th><th>No Telp</th><th>Status</th><th>Aksi</th></tr>
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
                      <button className="btn btn-ghost btn-sm" onClick={() => setDetailMember(m)}>Detail</button>
                      <button className="btn btn-ghost btn-sm" onClick={() => setMembers((prev) => prev.map((x) => x.id === m.id ? { ...x, status: x.status === "aktif" ? "pending" : "aktif" } : x))}>
                        {m.status === "aktif" ? "Nonaktifkan" : "Aktifkan"}
                      </button>
                      <button className="btn btn-ghost btn-sm">Buat QR</button>
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
                <button className="btn btn-ghost btn-sm" onClick={() => setDetailMember(m)}>Detail</button>
                <button className="btn btn-primary btn-sm">Buat QR</button>
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
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <strong className="modal-title">Detail Anggota</strong>
          <button className="btn-close" aria-label="Tutup" onClick={onClose}><IcoX /></button>
        </div>
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
      </div>
    </div>
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
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <strong className="modal-title">Tambah Anggota (oleh Admin)</strong>
          <button className="btn-close" aria-label="Tutup" onClick={onClose}><IcoX /></button>
        </div>
        <div className="stepper" style={{ marginBottom: 12 }}>{[1, 2, 3].map((n) => <div key={n} className={`step-dot ${s >= n ? "on" : ""}`} />)}</div>
        <div className="muted" style={{ marginBottom: 16 }}>Langkah {s}/3 &bull; Wajib: nama, pendidikan, tanggal lahir, no telp, tempat lahir, domisili anak.</div>

        {s === 1 && (
          <div style={{ display: "grid", gap: 12 }}>
            <div className="field"><label>Nama *</label><input value={form.nama} onChange={(e) => setForm({ ...form, nama: e.target.value })} placeholder="Nama lengkap" /></div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div className="field"><label>Tempat Lahir *</label><input value={form.tempatLahir} onChange={(e) => setForm({ ...form, tempatLahir: e.target.value })} /></div>
              <div className="field"><label>Tanggal Lahir *</label><input type="date" value={form.tanggalLahir} onChange={(e) => setForm({ ...form, tanggalLahir: e.target.value })} /></div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
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
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
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
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
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
            <div className="card" style={{ background: "#f8fafc" }}>
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
      </div>
    </div>
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
      <div className="page-header">
        <div>
          <h1>Kegiatan</h1>
          <div className="page-header-sub">Kelola agenda dan kegiatan</div>
        </div>
        <button className="btn btn-primary" style={{ width: "auto" }} onClick={() => setShowForm(true)}>+ Buat Kegiatan</button>
      </div>
      <div className="admin-toolbar" style={{ marginBottom: 16 }}>
        <label className="search">
          <IcoSearch size={14} />
          <input placeholder="Cari judul / lokasi..." value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
        <button className={`btn ${showFilter ? "btn-primary" : "btn-ghost"} btn-sm`} onClick={() => setShowFilter((s) => !s)} style={{ width: "auto" }}>
          Filter {adaFilterAktif && <span className="filter-count">{(dateFrom ? 1 : 0) + (dateTo ? 1 : 0) + (waktuFilter !== "semua" ? 1 : 0) + (wilayahFilter !== "semua" ? 1 : 0) + (kategoriFilter !== "semua" ? 1 : 0)}</span>}
        </button>
      </div>

      {showFilter && (
        <div className="modal-backdrop" onClick={() => setShowFilter(false)}>
          <div className="modal filter-modal" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <strong className="modal-title">Filter Kegiatan</strong>
              <button className="btn-close" aria-label="Tutup" onClick={() => setShowFilter(false)}><IcoX /></button>
            </div>
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
          </div>
        </div>
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
        <div className="modal-backdrop" onClick={() => setShowForm(false)}>
          <div className="modal modal--kegiatan" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, gap: 12 }}>
              <strong className="modal-title">Buat Kegiatan</strong>
              <button className="btn-close" aria-label="Tutup" onClick={() => setShowForm(false)}><IcoX /></button>
            </div>
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
              <div className="field"><label>GPS (lat,lng,radius)</label>
                <div className="kegiatan-form-grid-gps">
                  <input placeholder="lat -6.14" id="lat" /><input placeholder="lng 106.7" id="lng" />
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
              </div>
              {!canCreate && <div className="pill pill-amber" style={{ justifyContent: "center" }}>Role kamu tidak boleh buat di tingkat {tingkat}</div>}
              <button
                className="btn btn-primary" style={{ width: "100%" }} disabled={!canCreate}
                onClick={() => {
                  const v = (id: string) => (document.getElementById(id) as HTMLInputElement)?.value || "";
                  const judul = v("judul") || tpl || "Tanpa judul";
                  void v("deskripsi");
                  const tanggal = v("tanggal") || new Date().toISOString().slice(0, 10);
                  const jam = v("jam") || ""; const lokasi = v("lokasi") || ""; const lat = parseFloat(v("lat")); const lng = parseFloat(v("lng"));
                  const radius = parseInt(radiusM, 10);
                  const kategoriCustom = v("kategoriCustom") || undefined;
                  const tingkatVal = tingkat as Tingkat;
                  setList((prev) => [{ id: `k${Date.now()}`, judul, kategori: kategori as Kategori, kategoriCustom, tingkat: tingkatVal, desa: tingkatVal === "desa" || tingkatVal === "kelompok" ? (tingkatVal === "desa" ? namaWilayah : "Fajar") : undefined, kelompok: tingkatVal === "kelompok" ? namaWilayah : undefined, tanggal, jam, lokasi, lat: Number.isFinite(lat) ? lat : null, lng: Number.isFinite(lng) ? lng : null, radiusM: radius }, ...prev]);
                  setShowForm(false);
                }}
              >
                Simpan Kegiatan
              </button>
            </div>
          </div>
        </div>
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
      <div className="page-header">
        <div>
          <h1>Kelola User</h1>
          <div className="page-header-sub">Kelola akun admin di bawah kamu</div>
        </div>
        <button className="btn btn-primary" style={{ width: "auto" }} disabled={role === "admin_kelompok"} onClick={() => setShowAdd(true)}>+ Tambah Admin</button>
      </div>
      <div className="info-banner">
        <span className="info-banner-icon"><IcoShield size={18} /></span>
        <div className="info-banner-body">
          <strong className="info-banner-title">Kelola User di bawah kamu</strong>
          <p className="info-banner-desc">{role === "admin_daerah" ? "Kelola semua admin di wilayah kamu." : role === "admin_desa" ? "Kelola admin kelompok di desamu." : "Kamu tidak bisa kelola user."}</p>
        </div>
      </div>
      <div className="admin-toolbar" style={{ marginBottom: 16 }}>
        <label className="search">
          <IcoSearch size={14} />
          <input placeholder="Cari nama / wilayah / role..." value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
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
                <button className="btn btn-ghost btn-sm" disabled={!canManage(u.role)} onClick={() => setUsers((prev) => prev.map((x) => x.id === u.id ? { ...x, status: x.status === "aktif" ? "pending" : "aktif" } : x))}>
                  {u.status === "aktif" ? "Nonaktifkan" : "Aktifkan"}
                </button>
                <button className="btn btn-danger btn-sm" disabled={!canManage(u.role)}>Hapus</button>
              </div>
            </div>
          ))}
          {filteredUsers.length === 0 && <div className="lp-empty-card">Belum ada admin di bawah kamu.</div>}
        </div>
      ) : (
        <div className="table-wrap">
          <table className="admin-table">
            <thead><tr><th>Nama</th><th>Role</th><th>Wilayah</th><th>Status</th><th>Aksi</th></tr></thead>
            <tbody>
              {filteredUsers.map((u) => (
                <tr key={u.id}>
                  <td style={{ fontWeight: 700 }}>{u.nama}</td>
                  <td><span className="pill pill-slate">{u.role}</span></td>
                  <td>{u.wilayah}</td>
                  <td><span className={`pill ${u.status === "aktif" ? "pill-emerald" : "pill-amber"}`}>{u.status}</span></td>
                  <td>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button className="btn btn-ghost btn-sm" disabled={!canManage(u.role)} onClick={() => setUsers((prev) => prev.map((x) => x.id === u.id ? { ...x, status: x.status === "aktif" ? "pending" : "aktif" } : x))}>
                        {u.status === "aktif" ? "Nonaktifkan" : "Aktifkan"}
                      </button>
                      <button className="btn btn-danger btn-sm" disabled={!canManage(u.role)}>Hapus</button>
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
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <strong className="modal-title">Tambah Admin</strong>
          <button className="btn-close" aria-label="Tutup" onClick={onClose}><IcoX /></button>
        </div>
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
      </div>
    </div>
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

  const countDesa = desas.length;
  const countKelompok = kelompoks.length;
  const countAnggota = DEMO_MEMBERS.length;

  const anggotaDesa = (nama: string) => DEMO_MEMBERS.filter((m) => m.desa === nama).length;
  const anggotaKelompok = (nama: string) => DEMO_MEMBERS.filter((m) => m.kelompok === nama).length;

  function hapusDesa(id: string) {
    setDesas((prev) => prev.filter((d) => d.id !== id));
    setKelompoks((prev) => prev.filter((k) => k.desaId !== id));
  }

  function tambahDesa(nama: string) {
    setDesas((prev) => [...prev, { id: `d${Date.now()}`, nama }]);
    setShowAddDesa(false);
  }

  function tambahKelompok(desaId: string, nama: string) {
    setKelompoks((prev) => [...prev, { id: `w${Date.now()}`, nama, desaId }]);
    setShowAddKelompok(null);
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Manajemen Wilayah</h1>
          <div className="page-header-sub">Kelola desa dan kelompok di bawah Daerah Cengkareng</div>
        </div>
        <button className="btn btn-primary" style={{ width: "auto" }} onClick={() => setShowAddDesa(true)}>+ Tambah Desa</button>
      </div>

      <div className="kpi">
        <div className="kpi-card" style={{ display: "flex", gap: 12, alignItems: "center" }}><span className="kpi-icon kpi-icon--emerald"><IcoMapPin size={18} /></span><div><div className="muted">Desa</div><strong>{countDesa}</strong></div></div>
        <div className="kpi-card" style={{ display: "flex", gap: 12, alignItems: "center" }}><span className="kpi-icon kpi-icon--slate"><IcoUsers size={18} /></span><div><div className="muted">Kelompok</div><strong>{countKelompok}</strong></div></div>
        <div className="kpi-card" style={{ display: "flex", gap: 12, alignItems: "center" }}><span className="kpi-icon kpi-icon--amber"><IcoCalendar size={18} /></span><div><div className="muted">Total anggota</div><strong>{countAnggota}</strong></div></div>
        <div className="kpi-card" style={{ display: "flex", gap: 12, alignItems: "center" }}><span className="kpi-icon kpi-icon--peach"><IcoQr size={18} /></span><div><div className="muted">Rata-rata / desa</div><strong>{desas.length ? (countKelompok / desas.length).toFixed(1) : 0}</strong></div></div>
      </div>

      <div className="wilayah-tree card">
        <div className="wilayah-desa-head">
          <span className="kpi-icon kpi-icon--emerald"><IcoMapPin size={18} /></span>
          <div>
            <div style={{ fontWeight: 800 }}>Daerah Cengkareng</div>
            <span className="pill pill-emerald">Daerah</span>
          </div>
          <div className="muted" style={{ marginLeft: "auto" }}>Singleton &mdash; root tanpa tabel daerah</div>
          <div className="wilayah-qr" title="QR Daerah Cengkareng"><IcoQr size={22} /></div>
        </div>
      </div>

      <div style={{ display: "grid", gap: 16, marginTop: 16 }}>
        {desas.map((desa) => {
          const dus = kelompoks.filter((k) => k.desaId === desa.id);
          return (
            <div key={desa.id} className="card wilayah-desa">
              <div className="wilayah-desa-head">
                <span className="kpi-icon kpi-icon--slate"><IcoMapPin size={18} /></span>
                <div>
                  <div style={{ fontWeight: 800 }}>{desa.nama}</div>
                  <div style={{ display: "flex", gap: 6, marginTop: 2 }}>
                    <span className="pill pill-slate">Desa</span>
                    <span className="pill pill-emerald">{dus.length} kelompok</span>
                    <span className="pill pill-slate">{anggotaDesa(desa.nama)} anggota</span>
                  </div>
                </div>
                <div className="wilayah-actions">
                  <button className="btn btn-ghost btn-sm" onClick={() => setShowAddKelompok(desa.id)}>+ Kelompok</button>
                  <button className="btn btn-danger btn-sm" onClick={() => hapusDesa(desa.id)}>Hapus</button>
                  <div className="wilayah-qr" title={`QR Desa ${desa.nama}`}><IcoQr size={20} /></div>
                </div>
              </div>

              <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
                {dus.map((kel) => (
                  <div key={kel.id} className="wilayah-kelompok-row">
                    <span className="wilayah-kelompok-dot" />
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 13 }}>{kel.nama}</div>
                      <span className="pill pill-slate">{anggotaKelompok(kel.nama)} anggota</span>
                    </div>
                    <div className="wilayah-actions" style={{ marginLeft: "auto" }}>
                      <button className="btn btn-danger btn-sm" onClick={() => setKelompoks((prev) => prev.filter((k) => k.id !== kel.id))}>Hapus</button>
                      <div className="wilayah-qr wilayah-qr--sm" title={`QR Kelompok ${kel.nama}`}><IcoQr size={16} /></div>
                    </div>
                  </div>
                ))}
                {dus.length === 0 && <div className="muted">Belum ada kelompok di desa ini.</div>}
              </div>
            </div>
          );
        })}
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
        <div className="modal-backdrop" onClick={() => setShowAddKelompok(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <strong className="modal-title">Tambah Kelompok</strong>
              <button className="btn-close" aria-label="Tutup" onClick={() => setShowAddKelompok(null)}><IcoX /></button>
            </div>
            <AddWilayahForm
              label="Nama Kelompok"
              placeholder="Mis. Fajar D"
              onCancel={() => setShowAddKelompok(null)}
              onSave={(nama) => tambahKelompok(showAddKelompok, nama)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function AddWilayahModal({
  title, label, placeholder, onClose, onSave,
}: {
  title: string; label: string; placeholder: string; onClose: () => void; onSave: (nama: string) => void;
}) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <strong className="modal-title">{title}</strong>
          <button className="btn-close" aria-label="Tutup" onClick={onClose}><IcoX /></button>
        </div>
        <AddWilayahForm label={label} placeholder={placeholder} onCancel={onClose} onSave={onSave} />
      </div>
    </div>
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

export default function App() {
  const [role] = useState<AdminRole>("admin_kelompok");
  const [page, setPage] = useState("anggota");

  return (
    <>
      <AdminShell page={page} setPage={setPage}>
        {page === "anggota" && <AnggotaPage role={role} />}
        {page === "kegiatan" && <KegiatanAdmin role={role} />}
        {page === "users" && <UsersManage role={role} />}
        {page === "wilayah" && <WilayahPage />}
        {page === "statistik" && <StatistikPage />}
      </AdminShell>
    </>
  );
}
