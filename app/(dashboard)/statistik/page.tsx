"use client";

import { useEffect, useMemo, useState } from "react";
import Topbar from "@/components/Topbar";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
  AreaChart,
  Area,
  LineChart,
  Line,
} from "recharts";

type FilterState = {
  from: string;
  to: string;
  kategoriAcara: string;
  desaId: string;
  kelompokId: string;
  daerahId: string;
  mandiriDesaId: string;
  mandiriKelompokId: string;
  kategoriMudaMudi: string;
  jenisKelamin: string;
  kategoriUsia: string;
};

type Options = {
  desas: { id: number; nama: string }[];
  kelompoks: { id: number; nama: string; desaId: number }[];
  daerahs: { id: number; nama: string }[];
  mandiriDesas: { id: number; nama: string; daerahId: number | null }[];
  mandiriKelompoks: { id: number; nama: string; desaId: number }[];
  kategoriAcaraOptions: string[];
  kategoriUsiaOptions: string[];
};

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16", "#f97316", "#6366f1"];
const GENDER_COLORS: Record<string, string> = { L: "#3b82f6", P: "#ec4899" };
const KETERANGAN_COLORS: Record<string, string> = { hadir: "#10b981", izin: "#f59e0b", alpha: "#ef4444" };

function labelKategoriAcara(v: string) {
  const map: Record<string, string> = { sambung_rutin: "Sambung Rutin", keakraban: "Keakraban", pemantapan: "Pemantapan", lainnya: "Lainnya" };
  return map[v] || v;
}
function labelMudaMudi(v: string) {
  if (v === "pribumi") return "Pribumi";
  if (v === "perantauan") return "Pendatang";
  if (v === "belum_diisi") return "Belum diisi";
  return v;
}
function labelGender(v: string) {
  return v === "L" ? "Laki-laki" : v === "P" ? "Perempuan" : v;
}

function Card({ children, className = "", style }: { children: React.ReactNode; className?: string; style?: any }) {
  return (
    <div className={"card " + className} style={{ padding: 16, ...style }}>
      {children}
    </div>
  );
}

function SectionTitle({ icon, title, subtitle }: { icon?: React.ReactNode; title: string; subtitle?: string }) {
  return (
    <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 12 }}>
      {icon && (
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "linear-gradient(135deg, #3b82f6, #1d4ed8)",
            color: "white",
            flexShrink: 0,
          }}
        >
          {icon}
        </div>
      )}
      <div>
        <div style={{ fontWeight: 800, fontSize: 14, color: "var(--text)" }}>{title}</div>
        {subtitle && <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{subtitle}</div>}
      </div>
    </div>
  );
}

function StatMini({ label, value, sub, color }: { label: string; value: number | string; sub?: string; color?: string }) {
  return (
    <div className="stat-card" style={{ padding: "16px 18px" }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</div>
        <div style={{ fontSize: 24, fontWeight: 800, marginTop: 4, color: color || "var(--text)" }}>{value}</div>
        {sub && <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{sub}</div>}
      </div>
      <div
        className="stat-icon"
        style={{
          background: color ? `${color}14` : "#eff6ff",
          color: color || "#2563eb",
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <path d="M3 9h18M9 21V9" />
        </svg>
      </div>
    </div>
  );
}

function EmptyChart({ text = "Belum ada data untuk filter ini" }: { text?: string }) {
  return (
    <div style={{ height: 220, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", fontSize: 13, border: "1px dashed var(--border)", borderRadius: 12, background: "#f8fafc" }}>
      {text}
    </div>
  );
}

export default function StatistikPage() {
  const [filters, setFilters] = useState<FilterState>({
    from: "",
    to: "",
    kategoriAcara: "all",
    desaId: "",
    kelompokId: "",
    daerahId: "",
    mandiriDesaId: "",
    mandiriKelompokId: "",
    kategoriMudaMudi: "all",
    jenisKelamin: "all",
    kategoriUsia: "all",
  });
  const [options, setOptions] = useState<Options | null>(null);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [fetching, setFetching] = useState(false);

  const filteredMandiriDesas = useMemo(() => {
    if (!options) return [];
    if (filters.daerahId) return options.mandiriDesas.filter((d) => String(d.daerahId) === filters.daerahId);
    return options.mandiriDesas;
  }, [options, filters.daerahId]);

  const filteredKelompoks = useMemo(() => {
    if (!options) return [];
    if (filters.desaId) return options.kelompoks.filter((k) => String(k.desaId) === filters.desaId);
    return options.kelompoks;
  }, [options, filters.desaId]);

  const filteredMandiriKelompoks = useMemo(() => {
    if (!options) return [];
    if (filters.mandiriDesaId) return options.mandiriKelompoks.filter((k) => String(k.desaId) === filters.mandiriDesaId);
    return options.mandiriKelompoks;
  }, [options, filters.mandiriDesaId]);

  async function fetchOptions() {
    const res = await fetch("/api/statistik/options", { cache: "no-store" });
    const json = await res.json();
    setOptions(json);
  }

  async function fetchStats(f: FilterState) {
    setFetching(true);
    try {
      const params = new URLSearchParams();
      if (f.from) params.set("from", f.from);
      if (f.to) params.set("to", f.to);
      if (f.kategoriAcara !== "all") params.set("kategoriAcara", f.kategoriAcara);
      if (f.desaId) params.set("desaId", f.desaId);
      if (f.kelompokId) params.set("kelompokId", f.kelompokId);
      if (f.daerahId) params.set("daerahId", f.daerahId);
      if (f.mandiriDesaId) params.set("mandiriDesaId", f.mandiriDesaId);
      if (f.mandiriKelompokId) params.set("mandiriKelompokId", f.mandiriKelompokId);
      if (f.kategoriMudaMudi !== "all") params.set("kategoriMudaMudi", f.kategoriMudaMudi);
      if (f.jenisKelamin !== "all") params.set("jenisKelamin", f.jenisKelamin);
      if (f.kategoriUsia !== "all") params.set("kategoriUsia", f.kategoriUsia);
      const res = await fetch(`/api/statistik?${params.toString()}`, { cache: "no-store" });
      const json = await res.json();
      setData(json);
    } finally {
      setFetching(false);
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchOptions();
  }, []);
  useEffect(() => {
    fetchStats(filters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleApply = () => fetchStats(filters);
  const handleReset = () => {
    const reset: FilterState = {
      from: "",
      to: "",
      kategoriAcara: "all",
      desaId: "",
      kelompokId: "",
      daerahId: "",
      mandiriDesaId: "",
      mandiriKelompokId: "",
      kategoriMudaMudi: "all",
      jenisKelamin: "all",
      kategoriUsia: "all",
    };
    setFilters(reset);
    fetchStats(reset);
  };

  const setField = (k: keyof FilterState, v: string) => setFilters((prev) => ({ ...prev, [k]: v }));

  // Derived display data with labels
  const memberByGender = (data?.member?.byGender || []).map((d: any) => ({ ...d, label: labelGender(d.name) }));
  const memberByMudaMudi = (data?.member?.byMudaMudi || []).map((d: any) => ({ ...d, label: labelMudaMudi(d.name) }));
  const absensiByGender = (data?.absensi?.byGender || []).map((d: any) => ({ ...d, label: labelGender(d.name) }));
  const absensiByMudaMudi = (data?.absensi?.byMudaMudi || []).map((d: any) => ({ ...d, label: labelMudaMudi(d.name) }));
  const kegiatanByKategori = (data?.kegiatan?.byKategori || []).map((d: any) => ({ ...d, label: labelKategoriAcara(d.name) }));
  const absensiByKategoriAcara = (data?.absensi?.byKategoriAcara || []).map((d: any) => ({ ...d, label: labelKategoriAcara(d.name) }));

  return (
    <div>
      <Topbar title="Statistik" />
      <div className="page-content">
        {/* Filters */}
        <div className="card" style={{ padding: 16, marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: "#eff6ff", display: "flex", alignItems: "center", justifyContent: "center", color: "#2563eb" }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 6h18M3 12h18M3 18h18" />
                  <circle cx="8" cy="6" r="1.5" fill="currentColor" />
                  <circle cx="16" cy="12" r="1.5" fill="currentColor" />
                  <circle cx="11" cy="18" r="1.5" fill="currentColor" />
                </svg>
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: 14 }}>Filter Statistik</div>
                <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Per jenis kegiatan • per waktu • per wilayah • pribumi/pendatang • JK • usia</div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button className="btn btn-secondary btn-sm" onClick={handleReset} disabled={fetching}>
                Reset
              </button>
              <button className="btn btn-primary btn-sm" onClick={handleApply} disabled={fetching}>
                {fetching ? "Memuat..." : "Terapkan Filter"}
              </button>
            </div>
          </div>

          {/* Row 1: Waktu & Kegiatan */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 12 }}>
            <div>
              <label className="form-label" style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted)" }}>
                Dari Tanggal
              </label>
              <input type="date" className="form-control" value={filters.from} onChange={(e) => setField("from", e.target.value)} />
            </div>
            <div>
              <label className="form-label" style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted)" }}>
                Sampai Tanggal
              </label>
              <input type="date" className="form-control" value={filters.to} onChange={(e) => setField("to", e.target.value)} />
            </div>
            <div>
              <label className="form-label" style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted)" }}>
                Jenis Kegiatan
              </label>
              <select className="form-control" value={filters.kategoriAcara} onChange={(e) => setField("kategoriAcara", e.target.value)}>
                <option value="all">Semua Jenis</option>
                {(options?.kategoriAcaraOptions || ["sambung_rutin", "keakraban", "pemantapan", "lainnya"]).map((k) => (
                  <option key={k} value={k}>
                    {labelKategoriAcara(k)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="form-label" style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted)" }}>
                Kategori Usia
              </label>
              <select className="form-control" value={filters.kategoriUsia} onChange={(e) => setField("kategoriUsia", e.target.value)}>
                <option value="all">Semua Usia</option>
                {(options?.kategoriUsiaOptions || []).map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 2: Wilayah resmi */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 12 }}>
            <div>
              <label className="form-label" style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted)" }}>
                Desa (resmi)
              </label>
              <select className="form-control" value={filters.desaId} onChange={(e) => setField("desaId", e.target.value)}>
                <option value="">Semua Desa</option>
                {options?.desas?.map((d) => (
                  <option key={d.id} value={String(d.id)}>
                    {d.nama}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="form-label" style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted)" }}>
                Kelompok (resmi)
              </label>
              <select className="form-control" value={filters.kelompokId} onChange={(e) => setField("kelompokId", e.target.value)}>
                <option value="">Semua Kelompok</option>
                {filteredKelompoks.map((k) => (
                  <option key={k.id} value={String(k.id)}>
                    {k.nama}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="form-label" style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted)" }}>
                Daerah (Mandiri)
              </label>
              <select
                className="form-control"
                value={filters.daerahId}
                onChange={(e) => {
                  setField("daerahId", e.target.value);
                  setField("mandiriDesaId", "");
                  setField("mandiriKelompokId", "");
                }}
              >
                <option value="">Semua Daerah</option>
                {options?.daerahs?.map((d) => (
                  <option key={d.id} value={String(d.id)}>
                    {d.nama}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="form-label" style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted)" }}>
                Desa (Mandiri)
              </label>
              <select
                className="form-control"
                value={filters.mandiriDesaId}
                onChange={(e) => {
                  setField("mandiriDesaId", e.target.value);
                  setField("mandiriKelompokId", "");
                }}
              >
                <option value="">Semua Desa Mandiri</option>
                {filteredMandiriDesas.map((d) => (
                  <option key={d.id} value={String(d.id)}>
                    {d.nama}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 3: kategori member */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
            <div>
              <label className="form-label" style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted)" }}>
                Kelompok Mandiri
              </label>
              <select className="form-control" value={filters.mandiriKelompokId} onChange={(e) => setField("mandiriKelompokId", e.target.value)}>
                <option value="">Semua Kelompok Mandiri</option>
                {filteredMandiriKelompoks.map((k) => (
                  <option key={k.id} value={String(k.id)}>
                    {k.nama}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="form-label" style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted)" }}>
                Pribumi / Pendatang
              </label>
              <select className="form-control" value={filters.kategoriMudaMudi} onChange={(e) => setField("kategoriMudaMudi", e.target.value)}>
                <option value="all">Semua</option>
                <option value="pribumi">Pribumi</option>
                <option value="perantauan">Pendatang (Perantauan)</option>
              </select>
            </div>
            <div>
              <label className="form-label" style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted)" }}>
                Jenis Kelamin
              </label>
              <select className="form-control" value={filters.jenisKelamin} onChange={(e) => setField("jenisKelamin", e.target.value)}>
                <option value="all">Semua</option>
                <option value="L">Laki-laki</option>
                <option value="P">Perempuan</option>
              </select>
            </div>
            <div style={{ display: "flex", alignItems: "end", gap: 8 }}>
              <div style={{ flex: 1, fontSize: 11, color: "var(--text-muted)", background: "#f8fafc", border: "1px solid var(--border)", borderRadius: 10, padding: "10px 12px" }}>
                <b style={{ color: "var(--text)" }}>Tips:</b> Kosongkan filter untuk melihat semua data. Filter kombinasi akan mempersempit hasil (AND).
              </div>
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="stats-grid" style={{ marginBottom: 16 }}>
          <StatMini label="Total Member (Generus)" value={loading ? "—" : data?.summary?.totalGenerus ?? 0} sub="sesuai filter wilayah & kategori" color="#2563eb" />
          <StatMini label="Total Kegiatan" value={loading ? "—" : data?.summary?.totalKegiatan ?? 0} sub="per waktu & jenis" color="#7c3aed" />
          <StatMini label="Total Absensi" value={loading ? "—" : data?.summary?.totalAbsensi ?? 0} sub="records hadir/izin/alpha" color="#0891b2" />
          <StatMini label="Hadir Rate" value={loading ? "—" : `${data?.summary?.hadirRate ?? 0}%`} sub={`${data?.summary?.hadir ?? 0} hadir • ${data?.summary?.izin ?? 0} izin • ${data?.summary?.alpha ?? 0} alpha`} color="#16a34a" />
        </div>

        {loading ? (
          <div className="loading">
            <div className="spinner" />
          </div>
        ) : (
          <>
            {/* Time Series + Keterangan */}
            <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 16, marginBottom: 16 }} className="responsive-grid-2">
              <Card>
                <SectionTitle title="Tren Kehadiran per Tanggal Kegiatan" subtitle="Hadir / Izin / Alpha — filter waktu & jenis kegiatan berpengaruh" />
                {data?.absensi?.timeSeries?.length ? (
                  <div style={{ height: 260 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={data.absensi.timeSeries}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Legend />
                        <Area type="monotone" dataKey="hadir" stackId="1" stroke="#10b981" fill="#10b981" fillOpacity={0.6} />
                        <Area type="monotone" dataKey="izin" stackId="1" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.6} />
                        <Area type="monotone" dataKey="alpha" stackId="1" stroke="#ef4444" fill="#ef4444" fillOpacity={0.6} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <EmptyChart />
                )}
              </Card>
              <Card>
                <SectionTitle title="Komposisi Kehadiran" subtitle="Hadir / Izin / Alpha" />
                {data?.absensi?.byKeterangan?.length ? (
                  <div style={{ height: 260 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={data.absensi.byKeterangan} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={88} label={(e: any) => `${e.name}: ${e.value}`}>
                          {(data.absensi.byKeterangan as any[]).map((e: any, i: number) => (
                            <Cell key={i} fill={KETERANGAN_COLORS[e.name] || COLORS[i % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <EmptyChart />
                )}
              </Card>
            </div>

            {/* Member breakdown */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16, marginBottom: 16 }}>
              <Card>
                <SectionTitle title="Member per Jenis Kelamin" subtitle="Filter kategori member diterapkan" />
                {memberByGender.length ? (
                  <div style={{ height: 220 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={memberByGender} dataKey="value" nameKey="label" cx="50%" cy="50%" outerRadius={78} label={(e: any) => `${e.label}: ${e.value}`}>
                          {memberByGender.map((e: any, i: number) => (
                            <Cell key={i} fill={GENDER_COLORS[e.name] || COLORS[i % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <EmptyChart />
                )}
              </Card>
              <Card>
                <SectionTitle title="Member Pribumi vs Pendatang" subtitle="Kategori muda-mudi" />
                {memberByMudaMudi.length ? (
                  <div style={{ height: 220 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={memberByMudaMudi} dataKey="value" nameKey="label" cx="50%" cy="50%" outerRadius={78} label={(e: any) => `${e.label}: ${e.value}`}>
                          {memberByMudaMudi.map((e: any, i: number) => (
                            <Cell key={i} fill={COLORS[i % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <EmptyChart />
                )}
              </Card>
              <Card>
                <SectionTitle title="Absensi per Jenis Kelamin" subtitle="Seberapa aktif per JK" />
                {absensiByGender.length ? (
                  <div style={{ height: 220 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={absensiByGender}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                          {absensiByGender.map((e: any, i: number) => (
                            <Cell key={i} fill={GENDER_COLORS[e.name] || COLORS[i % COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <EmptyChart />
                )}
              </Card>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 16, marginBottom: 16 }} className="responsive-grid-2">
              <Card>
                <SectionTitle title="Member per Kategori Usia" subtitle="PAUD → Mandiri" />
                {data?.member?.byUsia?.length ? (
                  <div style={{ height: 260 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data.member.byUsia}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-12} dy={10} height={40} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Bar dataKey="value" fill="#3b82f6" radius={[8, 8, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <EmptyChart />
                )}
              </Card>
              <Card>
                <SectionTitle title="Absensi per Kategori Usia" subtitle="Usia paling aktif hadir" />
                {data?.absensi?.byUsia?.length ? (
                  <div style={{ height: 260 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data.absensi.byUsia} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis type="number" tick={{ fontSize: 11 }} />
                        <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={80} />
                        <Tooltip />
                        <Bar dataKey="value" fill="#8b5cf6" radius={[0, 8, 8, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <EmptyChart />
                )}
              </Card>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }} className="responsive-grid-2">
              <Card>
                <SectionTitle title="Kegiatan per Jenis" subtitle="Sambung rutin / Keakraban / Pemantapan / Lainnya" />
                {kegiatanByKategori.length ? (
                  <div style={{ height: 240 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={kegiatanByKategori}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="label" tick={{ fontSize: 11 }} interval={0} angle={-10} dy={10} height={50} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                          {kegiatanByKategori.map((_: any, i: number) => (
                            <Cell key={i} fill={COLORS[i % COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <EmptyChart />
                )}
              </Card>
              <Card>
                <SectionTitle title="Absensi per Jenis Kegiatan" subtitle="Jenis acara mana paling ramai" />
                {absensiByKategoriAcara.length ? (
                  <div style={{ height: 240 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={absensiByKategoriAcara}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="label" tick={{ fontSize: 11 }} interval={0} angle={-10} dy={10} height={50} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                          {absensiByKategoriAcara.map((_: any, i: number) => (
                            <Cell key={i} fill={COLORS[i % COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <EmptyChart />
                )}
              </Card>
            </div>

            <Card style={{ marginBottom: 16 }}>
              <SectionTitle title="Kegiatan per Bulan" subtitle="Tren pembuatan kegiatan (YYYY-MM)" />
              {data?.kegiatan?.monthly?.length ? (
                <div style={{ height: 220 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data.kegiatan.monthly}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <EmptyChart />
              )}
            </Card>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }} className="responsive-grid-2">
              <Card>
                <SectionTitle title="Member per Desa" subtitle="Top wilayah resmi" />
                {data?.member?.byDesa?.length ? (
                  <div style={{ height: 280 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data.member.byDesa.slice(0, 8)} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis type="number" tick={{ fontSize: 11 }} />
                        <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={110} />
                        <Tooltip />
                        <Bar dataKey="value" fill="#06b6d4" radius={[0, 8, 8, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <EmptyChart />
                )}
              </Card>
              <Card>
                <SectionTitle title="Absensi per Desa (Top 10)" subtitle="Wilayah dengan kehadiran terbanyak" />
                {data?.absensi?.byDesa?.length ? (
                  <div style={{ height: 280 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data.absensi.byDesa} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis type="number" tick={{ fontSize: 11 }} />
                        <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={110} />
                        <Tooltip />
                        <Bar dataKey="value" fill="#10b981" radius={[0, 8, 8, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <EmptyChart />
                )}
              </Card>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <Card>
                <SectionTitle title="Member per Daerah (Mandiri)" subtitle="Sebaran daerah mandiri" />
                {data?.member?.byDaerah?.length ? (
                  <div style={{ height: 260 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data.member.byDaerah.slice(0, 8)}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-12} dy={10} height={50} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Bar dataKey="value" fill="#f59e0b" radius={[8, 8, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <EmptyChart />
                )}
              </Card>
              <Card>
                <SectionTitle title="Absensi Pribumi vs Pendatang" subtitle="Perantauan sering disebut pendatang" />
                {absensiByMudaMudi.length ? (
                  <div style={{ height: 260 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={absensiByMudaMudi} dataKey="value" nameKey="label" cx="50%" cy="50%" outerRadius={80} label={(e: any) => `${e.label}: ${e.value}`}>
                          {absensiByMudaMudi.map((_: any, i: number) => (
                            <Cell key={i} fill={COLORS[i % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <EmptyChart />
                )}
              </Card>
            </div>

            {/* Pendidikan */}
            <Card style={{ marginTop: 16 }}>
              <SectionTitle title="Member per Pendidikan (Top 10)" subtitle="Jurusan/pendidikan terbanyak" />
              {data?.member?.byPendidikan?.length ? (
                <div style={{ height: 240 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.member.byPendidikan}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-12} dy={12} height={50} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Bar dataKey="value" fill="#6366f1" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <EmptyChart />
              )}
            </Card>

            <div style={{ marginTop: 12, fontSize: 11, color: "var(--text-muted)", textAlign: "center" }}>
              Data diperbarui sesuai filter. Gunakan <b>Terapkan Filter</b> setelah mengubah pilihan.
            </div>
          </>
        )}
      </div>
    </div>
  );
}
