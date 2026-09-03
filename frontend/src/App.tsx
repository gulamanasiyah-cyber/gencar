import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { sambungJudulTemplate } from "../../shared/validation";
import { PEKERJAAN_GROUPS } from "../../shared/pekerjaan";
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
  List as IcoList,
  LayoutGrid as IcoGrid,
  Trash2 as IcoTrash,
  Pencil as IcoEdit,
  LogOut as IcoLogOut,
} from "lucide-react";
import MapPickerModal from "./components/MapPickerModal";
import AdminModal from "./components/admin/Modal";
import KpiCard from "./components/admin/KpiCard";
import PageHeader from "./components/admin/PageHeader";
import SearchInput from "./components/admin/SearchInput";
import { apiFetch, unwrapList } from "./lib/api";
import { useAuth } from "./lib/auth";
import { useNavigate } from "react-router-dom";
import { computeAchievements, RARITY_META, HOBBY_META, parseHobiDetail, type HobbyKey } from "./features/member/types";

const TROPHY_PNG_MAP: Record<string, string> = {
  pertama_kali: "kehadiran_1",
  hadir_5: "kehadiran_5",
  hadir_10: "kehadiran_10",
  hadir_25: "kehadiran_25",
  hadir_50: "kehadiran_50",
  hadir_100: "kehadiran_100",
  hadir_150: "kehadiran_150",
  hadir_200: "kehadiran_200",
  streak_5: "streak_5",
  streak_10: "streak_10",
  streak_20: "streak_20",
  streak_40: "streak_40",
  streak_75: "streak_75",
  streak_100: "streak_100",
  streak_reset: "streak_reset",
  streak_salvage: "streak_salvage",
  penjelajah: "penjelajah",
  domisili_match: "domisili_match",
  zero_telat: "zero_telat",
  zero_telat_25: "zero_telat_25",
  zero_telat_50: "zero_telat_50",
  zero_telat_100: "zero_telat_100",
  first_late: "first_late",
  telat_5: "telat_5",
  telat_10: "telat_10",
  overcome_late: "overcome_late",
  double_duty: "double_duty",
  siang_malam: "siang_malam",
  tingkat_kelompok: "tingkat_kelompok",
  tingkat_desa: "tingkat_desa",
  tingkat_daerah: "tingkat_daerah",
  izin_pertama: "izin_pertama",
  absen_weekend: "absen_weekend",
  consec_3: "consec_3",
  consec_7: "consec_7",
  pagi_early: "pagi_early",
  jelajah_lokasi: "jelajah_lokasi",
  legenda_waktu: "legenda_waktu",
  avatar_custom: "avatar_custom",
  avatar_legend: "avatar_legend",
  qr_download: "qr_download",
  tampil_kece: "tampil_kece",
  hobi_isi: "hobi_isi",
  hobi_kolektor: "hobi_kolektor",
  hobi_olahraga: "hobi_olahraga",
  hobi_traveling: "hobi_traveling",
  hobi_seni: "hobi_seni",
  hobi_musik: "hobi_musik",
  hobi_kuliner: "hobi_kuliner",
  hobi_teknologi: "hobi_teknologi",
  hobi_literasi: "hobi_literasi",
  hobi_gaming: "hobi_gaming",
};

function getTrophyIconPath(id: string): string {
  const file = TROPHY_PNG_MAP[id] || id;
  return `/achievements/${file}.webp`;
}

function MemberAvatarCircle({ member, size = 36 }: { member: { nama: string; foto?: string | null; avatarId?: string | null }; size?: number }) {
  const initials = member.nama.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]).join("") || "A";
  if (member.foto && member.foto.trim()) {
    return (
      <img
        src={member.foto}
        alt={member.nama}
        onError={(e) => {
          (e.target as HTMLElement).style.display = "none";
        }}
        style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", display: "block" }}
      />
    );
  }
  if (member.avatarId) {
    const file = member.avatarId.replace(/\.png$/, "") + ".webp";
    return (
      <div style={{ width: size, height: size, borderRadius: "50%", background: "var(--surface-sunken, #f1f5f9)", border: "1px solid var(--line, #e2e8f0)", display: "grid", placeItems: "center", overflow: "hidden", flexShrink: 0 }}>
        <img
          src={`/avatars/${file}`}
          alt={member.nama}
          onError={(e) => {
            (e.target as HTMLElement).style.display = "none";
          }}
          style={{ width: "90%", height: "90%", objectFit: "contain", display: "block" }}
        />
      </div>
    );
  }
  return <div className="avatar" style={{ width: size, height: size, fontSize: Math.max(10, Math.round(size * 0.35)) }}>{initials}</div>;
}

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
      const target = e.target as Node;
      if (ref.current && !ref.current.contains(target) && !(menuRef.current && menuRef.current.contains(target))) setOpen(false);
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

  const triggerRect = open ? ref.current?.getBoundingClientRect() : null;
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuH, setMenuH] = useState(0);
  useEffect(() => {
    if (open && menuRef.current) setMenuH(menuRef.current.offsetHeight);
  }, [open, options]);
  const openUp = triggerRect ? triggerRect.bottom + menuH + 6 > window.innerHeight : false;

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
      {open && triggerRect && createPortal(
        <div
          ref={menuRef}
          className="select-menu"
          role="listbox"
          id={listboxId}
          aria-labelledby={triggerId.current}
          style={{ position: "fixed", top: menuH ? (openUp ? triggerRect.top - menuH - 6 : triggerRect.bottom + 6) : -9999, left: triggerRect.left, width: triggerRect.width, zIndex: 9999 }}
        >
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
        </div>,
        document.body,
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
  deskripsi?: string;
  kategori: Kategori;
  kategoriCustom?: string;
  tingkat: Tingkat;
  desa?: string;
  kelompok?: string;
  desaId?: number | null;
  kelompokId?: number | null;
  tanggal: string;
  jam: string;
  lokasi: string;
  lat: number | null;
  lng: number | null;
  radiusM: number;
  gpsRequired?: number;
  createdBy?: string;
  pesertaCount?: number;
  pendingPesertaCount?: number;
  pesertaStatus?: "pending" | "approved" | "rejected" | null;
  myPesertaId?: string | null;
  pesertaCatatan?: string | null;
  pesertaEntries?: { id: string; status: string; catatan: string | null; desaNama: string | null; kelompokNama: string | null }[];
};

type Member = {
  id: string;
  nama: string;
  desa: string;
  kelompok: string;
  pendidikan: string;
  pekerjaan?: string | null;
  noTelp: string;
  kategoriMudaMudi: "pribumi" | "perantauan";
  domisiliAnak: string;
  isOrtuSama: boolean;
  foto?: string | null;
  avatarId?: string | null;
  jenisKelamin?: string | null;
  hobi?: string | null;
  hobiDetail?: string | null;
  status: "aktif" | "pending";
};

type DesaWilayah = { id: string; nama: string };
type KelompokWilayah = { id: string; nama: string; desaId: string };

// DEMO_KEGIATAN removed — live from /api/kegiatan
void ([] as Kegiatan[]) as unknown as void;

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

// ── QR Profil Anggota modal ──
function MemberQrModal({ member, onClose }: { member: { id: string; nama: string; desa: string; kelompok: string }; onClose: () => void }) {
  const [busy, setBusy] = useState(false);
  const value = `gencar-profil|${member.id}`;

  async function download() {
    const node = document.getElementById("member-qr-card") as HTMLElement | null;
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
        backgroundColor: null as unknown as string,
        style: { margin: "0", transform: "none", boxShadow: "none" },
      });
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `qr-profil-${member.nama.toLowerCase().replace(/\s+/g, "-")}.png`;
      a.click();
    } finally {
      setBusy(false);
    }
  }

  return (
    <AdminModal title="QR Profil Anggota" onClose={onClose} className="qr-modal">
      <div>
        <div id="member-qr-card" style={{
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
              <div style={{ color: "rgba(255,255,255,0.62)", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>Profil Anggota</div>
            </div>
          </div>

          <div style={{ padding: "20px 16px 16px", display: "grid", justifyItems: "center", gap: 10, background: "#fff" }}>
            <QRCodeCanvas value={value} size={196} level="M" includeMargin={false} bgColor="#ffffff" fgColor="#1b0f0a" />
            <div style={{ fontWeight: 800, fontSize: 15, textAlign: "center", lineHeight: 1.25 }}>{member.nama}</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "center" }}>
              {member.desa && <span className="pill pill-slate">{member.desa}</span>}
              {member.kelompok && <span className="pill pill-emerald">{member.kelompok}</span>}
            </div>
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
            Scan untuk lihat profil &bull; Daerah Cengkareng
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

// ── Statistik ── recharts
type StatFilter = {
  waktu: "harian" | "mingguan" | "bulanan" | "tahunan";
  wilayah: "semua" | "daerah" | "desa" | "kelompok";
  kategori: "semua" | Kategori;
  kategoriMudaMudi: "semua" | "pribumi" | "perantauan";
  jenisKelamin: "semua" | "L" | "P";
};

function StatistikPage({ role }: { role: AdminRole }) {
  const [f, setF] = useState<StatFilter>({ waktu: "bulanan", wilayah: "semua", kategori: "semua", kategoriMudaMudi: "semua", jenisKelamin: "semua" });
  const isMobile = useIsMobile();
  const [live, setLive] = useState<{
    summary: { totalGenerus: number; totalKegiatan: number; totalAbsensi: number; hadir: number; izin: number; alpha: number; hadirRate: number };
    member: { byGender: { name: string; value: number }[]; byMudaMudi: { name: string; value: number }[]; byDesa: { name: string; value: number }[]; byPendidikan: { name: string; value: number }[]; byPekerjaan: { name: string; value: number }[] };
    absensi: { byKeterangan: { name: string; value: number }[]; timeSeries: { date: string; hadir: number; izin: number; alpha: number; total: number }[] };
    kegiatan: { total: number; byKategori: { name: string; value: number }[]; monthly: { name: string; value: number }[] };
  } | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsErr, setStatsErr] = useState<string | null>(null);

  useEffect(() => {
    let hasToken = false;
    try { hasToken = Boolean(localStorage.getItem("token")); } catch {}
    if (!hasToken) return;
    let cancel = false;
    const params = new URLSearchParams();
    if (f.kategori !== "semua") params.set("kategoriAcara", f.kategori);
    if (f.kategoriMudaMudi !== "semua") params.set("kategoriMudaMudi", f.kategoriMudaMudi);
    if (f.jenisKelamin !== "semua") params.set("jenisKelamin", f.jenisKelamin);
    setStatsLoading(true);
    setStatsErr(null);
    void apiFetch<unknown>(`/api/statistik?${params.toString()}`)
      .then((raw: unknown) => {
        if (cancel) return;
        const j = raw as {
          summary?: { totalGenerus: number; totalKegiatan: number; totalAbsensi: number; hadir: number; izin: number; alpha: number; hadirRate: number };
          member?: { byGender: unknown[]; byMudaMudi: unknown[]; byDesa: unknown[]; byPendidikan: unknown[]; byPekerjaan: unknown[] };
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
              byPekerjaan: (j.member?.byPekerjaan as { name: string; value: number }[]) ?? [],
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

  const s = live;
  const loading = statsLoading && !s;

  return (
    <div className="statistik-page" style={{ minWidth: 0 }}>
      <div className="page-header">
        <div>
          <h1>Statistik</h1>
          <div className="page-header-sub">Ringkasan kehadiran &amp; sebaran anggota{s ? " · data live" : loading ? " · memuat…" : statsErr ? " · error" : ""} {statsErr && `— ${statsErr.slice(0, 80)}`}</div>
        </div>
      </div>

      <div className="card statistik-filters" style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", marginBottom: 16 }}>
        <span className="muted" style={{ fontWeight: 700, fontSize: 12, flexShrink: 0 }}>FILTER</span>
        <Select value={f.waktu} onChange={(v) => setF({ ...f, waktu: v as StatFilter["waktu"] })} ariaLabel="Waktu" options={[{ value: "harian", label: "Harian" }, { value: "mingguan", label: "Mingguan" }, { value: "bulanan", label: "Bulanan" }, { value: "tahunan", label: "Tahunan" }]} />
        {role !== "admin_kelompok" && (
        <Select value={f.wilayah} onChange={(v) => setF({ ...f, wilayah: v as StatFilter["wilayah"] })} ariaLabel="Wilayah" options={[{ value: "semua", label: "Semua wilayah" }, { value: "daerah", label: "Daerah" }, { value: "desa", label: "Desa" }, { value: "kelompok", label: "Kelompok" }]} />
        )}
        <Select value={f.kategori} onChange={(v) => setF({ ...f, kategori: v as StatFilter["kategori"] })} ariaLabel="Jenis kegiatan" options={[{ value: "semua", label: "Semua jenis" }, { value: "sambung_rutin", label: "Sambung Rutin" }, { value: "keakraban", label: "Keakraban" }, { value: "pemantapan", label: "Pemantapan" }, { value: "lainnya", label: "Lainnya" }]} />
        <Select value={f.kategoriMudaMudi} onChange={(v) => setF({ ...f, kategoriMudaMudi: v as StatFilter["kategoriMudaMudi"] })} ariaLabel="Kategori" options={[{ value: "semua", label: "Semua kategori" }, { value: "pribumi", label: "Pribumi" }, { value: "perantauan", label: "Perantauan" }]} />
        <Select value={f.jenisKelamin} onChange={(v) => setF({ ...f, jenisKelamin: v as StatFilter["jenisKelamin"] })} ariaLabel="JK" options={[{ value: "semua", label: "Semua JK" }, { value: "L", label: "Laki-laki" }, { value: "P", label: "Perempuan" }]} />
        {s && <span className="pill pill-slate statistik-filter-count">{s.summary.totalGenerus} anggota</span>}
      </div>

      {loading && (
        <div className="card" style={{ textAlign: "center", padding: 40, color: "var(--muted)" }}>Memuat data statistik…</div>
      )}

      {statsErr && !s && (
        <div className="card" style={{ textAlign: "center", padding: 40, color: "#991b1b" }}>Gagal memuat: {statsErr}</div>
      )}

      {s && (
      <>
      {/* ═══ SEKSI 1: DATA KEHADIRAN ═══ */}
      <div className="statistik-section-head">
        <span className="kpi-icon kpi-icon--emerald"><IcoCalendar size={18} /></span>
        <div>
          <h2>Data Kehadiran</h2>
          <p>Rekap absensi dari seluruh kegiatan — hadir, izin, alpha</p>
        </div>
      </div>

      <div className="kpi" style={{ marginBottom: 16 }}>
        <KpiCard icon={<span className="kpi-icon kpi-icon--slate"><IcoCalendar size={18} /></span>} label="Hadir Rate" value={`${s.summary.hadirRate}%`} />
        <KpiCard icon={<span className="kpi-icon kpi-icon--emerald"><IcoUsers size={18} /></span>} label="Total Absensi" value={s.summary.totalAbsensi} />
        <KpiCard icon={<span className="kpi-icon kpi-icon--amber"><IcoBarChart size={18} /></span>} label="Total Kegiatan" value={s.summary.totalKegiatan} />
        <KpiCard icon={<span className="kpi-icon kpi-icon--peach"><IcoMapPin size={18} /></span>} label="Rata-rata / Kegiatan" value={s.summary.totalKegiatan > 0 ? (s.summary.totalAbsensi / s.summary.totalKegiatan).toFixed(1) : "—"} />
      </div>

      <div className="statistik-grid-2" style={{ display: "grid", gap: 16, marginBottom: 24 }}>
        <div className="card" style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 800, marginBottom: 4 }}>Tren Kehadiran</div>
          <div className="muted" style={{ marginBottom: 8 }}>{s.absensi.timeSeries.length ? "Hadir / Izin / Alpha per tanggal" : "Belum ada data absensi"}</div>
          <div style={{ height: isMobile ? 200 : 220, minWidth: 0 }}>
            {s.absensi.timeSeries.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={s.absensi.timeSeries}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" tick={{ fontSize: isMobile ? 10 : 12 }} />
                <YAxis tick={{ fontSize: isMobile ? 10 : 12 }} width={isMobile ? 28 : 36} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: isMobile ? 11 : 12 }} />
                <Area type="linear" dataKey="hadir" stroke="#16a34a" fill="#16a34a" fillOpacity={0.14} strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 4 }} />
                <Area type="linear" dataKey="izin" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.12} strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 4 }} />
                <Area type="linear" dataKey="alpha" stroke="#ef4444" fill="#ef4444" fillOpacity={0.10} strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 4 }} />
              </AreaChart>
            </ResponsiveContainer>
            ) : (
              <div style={{ display: "grid", placeItems: "center", height: "100%", color: "var(--muted)", fontSize: 13 }}>Belum ada data</div>
            )}
          </div>
        </div>

        <div className="card" style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 800, marginBottom: 4 }}>Komposisi Kehadiran</div>
          <div className="muted" style={{ marginBottom: 8 }}>Hadir / Izin / Alpha</div>
          <div style={{ height: isMobile ? 200 : 220, minWidth: 0 }}>
            {s.absensi.byKeterangan.length ? (
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
              <div style={{ display: "grid", placeItems: "center", height: "100%", color: "var(--muted)", fontSize: 13 }}>Belum ada data</div>
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
        <KpiCard icon={<span className="kpi-icon kpi-icon--emerald"><IcoUsers size={18} /></span>} label="Total Anggota" value={s.summary.totalGenerus} />
        <KpiCard icon={<span className="kpi-icon kpi-icon--peach"><IcoUsers size={18} /></span>} label="Pribumi" value={(s.member.byMudaMudi.find((x) => x.name === "pribumi") ?? { value: 0 }).value} />
        <KpiCard icon={<span className="kpi-icon kpi-icon--slate"><IcoMapPin size={18} /></span>} label="Perantauan" value={(s.member.byMudaMudi.find((x) => x.name === "perantauan") ?? { value: 0 }).value} />
        <KpiCard icon={<span className="kpi-icon kpi-icon--amber"><IcoMapPin size={18} /></span>} label="Jumlah Desa" value={s.member.byDesa.length} />
      </div>

      <div className="statistik-grid-3" style={{ display: "grid", gap: 16, marginBottom: 16 }}>
        <div className="card" style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 800, marginBottom: 8 }}>Jenis Kelamin</div>
          <div style={{ height: isMobile ? 160 : 180, minWidth: 0 }}>
            {s.member.byGender.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={s.member.byGender.map((r) => ({ label: r.name === "L" ? "Laki-laki" : "Perempuan", value: r.value, color: r.name === "L" ? "#3b82f6" : "#ec4899" }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="label" tick={{ fontSize: isMobile ? 10 : 12 }} interval={0} angle={isMobile ? -12 : 0} dy={isMobile ? 8 : 0} height={isMobile ? 36 : 30} />
                <YAxis tick={{ fontSize: isMobile ? 10 : 12 }} width={isMobile ? 28 : 32} />
                <Tooltip />
                <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                  {s.member.byGender.map((r, i) => (
                    <Cell key={i} fill={r.name === "L" ? "#3b82f6" : "#ec4899"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            ) : (
              <div style={{ display: "grid", placeItems: "center", height: "100%", color: "var(--muted)", fontSize: 13 }}>Belum ada data</div>
            )}
          </div>
        </div>
        <div className="card" style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 800, marginBottom: 8 }}>Pribumi vs Perantauan</div>
          <div style={{ height: isMobile ? 180 : 180, minWidth: 0 }}>
            {s.member.byMudaMudi.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart margin={{ top: 8, right: 16, bottom: 8, left: 16 }}>
                <Pie data={s.member.byMudaMudi.map((r) => ({ label: r.name, value: r.value, color: r.name === "pribumi" ? "#8b5cf6" : "#06b6d4" }))} dataKey="value" nameKey="label" cx="50%" cy="50%" outerRadius={isMobile ? 56 : 66} labelLine={false} label={false}>
                  {s.member.byMudaMudi.map((r, i) => (
                    <Cell key={i} fill={r.name === "pribumi" ? "#8b5cf6" : "#06b6d4"} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: isMobile ? 11 : 12 }} />
              </PieChart>
            </ResponsiveContainer>
            ) : (
              <div style={{ display: "grid", placeItems: "center", height: "100%", color: "var(--muted)", fontSize: 13 }}>Belum ada data</div>
            )}
          </div>
        </div>
        <div className="card" style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 800, marginBottom: 8 }}>Per Desa</div>
          <div style={{ height: isMobile ? 160 : 180, minWidth: 0 }}>
            {s.member.byDesa.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={s.member.byDesa.map((r) => ({ label: r.name, value: r.value }))} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis type="number" tick={{ fontSize: isMobile ? 10 : 12 }} />
                <YAxis type="category" dataKey="label" width={isMobile ? 90 : 110} tick={{ fontSize: isMobile ? 10 : 12 }} />
                <Tooltip />
                <Bar dataKey="value" fill="#06b6d4" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
            ) : (
              <div style={{ display: "grid", placeItems: "center", height: "100%", color: "var(--muted)", fontSize: 13 }}>Belum ada data</div>
            )}
          </div>
        </div>
      </div>

      <div className="card" style={{ minWidth: 0 }}>
        <div style={{ fontWeight: 800, marginBottom: 8 }}>Per Pendidikan (Top)</div>
        <div style={{ height: isMobile ? 180 : 200, minWidth: 0 }}>
          {s.member.byPendidikan?.length ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={s.member.byPendidikan}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" tick={{ fontSize: isMobile ? 10 : 12 }} interval={0} angle={isMobile ? -14 : 0} dy={10} height={isMobile ? 42 : 30} />
              <YAxis tick={{ fontSize: isMobile ? 10 : 12 }} width={isMobile ? 28 : 32} />
              <Tooltip />
              <Bar dataKey="value" fill="#f59e0b" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          ) : (
            <div style={{ display: "grid", placeItems: "center", height: "100%", color: "var(--muted)", fontSize: 13 }}>Belum ada data</div>
          )}
        </div>
      </div>

      {/* ═══ SEKSI 3: SEBARAN PEKERJAAN (BUBBLE) ═══ */}
      <div className="statistik-section-head">
        <span className="kpi-icon kpi-icon--amber"><IcoBarChart size={18} /></span>
        <div>
          <h2>Sebaran Pekerjaan</h2>
          <p>Distribusi pekerjaan anggota berdasarkan data teks bebas — dinormalisasi otomatis</p>
        </div>
      </div>

      <div className="card" style={{ minWidth: 0 }}>
        <div style={{ fontWeight: 800, marginBottom: 4 }}>Komposisi Pekerjaan</div>
        <div className="muted" style={{ marginBottom: 8 }}>Top 8 pekerjaan terbanyak (plus &quot;Lainnya&quot;)</div>
        {s.member.byPekerjaan.length ? (
        (() => {
          const top8 = s.member.byPekerjaan.slice(0, 8);
          const lainnyaVal = s.member.byPekerjaan.slice(8).reduce((a, r) => a + r.value, 0);
          const display = lainnyaVal > 0 ? [...top8, { name: "Lainnya", value: lainnyaVal }] : top8;
          const maxVal = Math.max(...display.map((d) => d.value));
          const colors = ["#16a34a", "#0ea5e9", "#8b5cf6", "#f59e0b", "#ec4899", "#06b6d4", "#6366f1", "#84cc16", "#94a3b8"];
          const MIN_R = isMobile ? 22 : 28;
          const MAX_R = isMobile ? 48 : 64;
          return (
            <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", alignItems: "center", gap: isMobile ? 8 : 12, padding: isMobile ? "12px 0" : "16px 0", minHeight: isMobile ? 200 : 260 }}>
              {display.map((d, i) => {
                const r = Math.max(MIN_R, Math.min(MAX_R, Math.sqrt(d.value / maxVal) * MAX_R));
                return (
                  <div key={i} title={`${d.name}: ${d.value} anggota`} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                    <div style={{ width: r * 2, height: r * 2, borderRadius: "50%", background: colors[i % colors.length], opacity: 0.85, display: "grid", placeItems: "center", boxShadow: `0 2px 8px ${colors[i % colors.length]}33`, transition: "transform .15s", cursor: "default" }}>
                      <span style={{ fontSize: isMobile ? 11 : 13, fontWeight: 800, color: "#fff", textShadow: "0 1px 2px rgba(0,0,0,.15)" }}>{d.value}</span>
                    </div>
                    <span style={{ fontSize: isMobile ? 9 : 10, fontWeight: 600, color: "var(--text-secondary)", maxWidth: r * 2 + 12, textAlign: "center", lineHeight: 1.2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.name}</span>
                  </div>
                );
              })}
            </div>
          );
        })()
        ) : (
          <div style={{ display: "grid", placeItems: "center", height: isMobile ? 180 : 220, color: "var(--muted)", fontSize: 13 }}>Belum ada data pekerjaan</div>
        )}
      </div>
      </>
      )}
    </div>
  );
}

// ── Admin pages (desktop-first) ──
function AdminShell({
  page, setPage, role, children,
}: {
  page: string; setPage: (p: string) => void; role: AdminRole; children: React.ReactNode;
}) {
  const { logout } = useAuth();
  const navigate = useNavigate();
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
    ...(role === "admin_daerah" ? [{ key: "wilayah", label: "Wilayah", icon: <IcoMapPin /> }] : []),
    { key: "cms", label: "CMS", icon: <IcoFileText /> },
    { key: "statistik", label: "Statistik", icon: <IcoBarChart /> },
  ];
  return (
    <div className="admin-shell">
      <nav className="admin-sidebar hide-scrollbar" aria-label="Admin navigation">
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
        <div style={{ marginTop: "auto" }} />
        <div className="sidebar-divider" />
        <button className="sidebar-logout" onClick={async () => { await logout(); navigate("/login", { replace: true }); }} aria-label="Logout">
          <IcoLogOut size={18} /> <span>Keluar</span>
        </button>
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
  role,
}: {
  open: boolean;
  onClose: () => void;
  statusFilter: string; setStatusFilter: (v: string) => void;
  kategoriFilter: string; setKategoriFilter: (v: string) => void;
  desaFilter: string; setDesaFilter: (v: string) => void;
  kelompokFilter: string; setKelompokFilter: (v: string) => void;
  desaOptions: string[];
  kelompokOptions: string[];
  role?: AdminRole;
}) {
  if (!open) return null;
  const showDesa = role === "admin_daerah";
  const showKelompok = role === "admin_daerah" || role === "admin_desa";
  const hasActive = statusFilter !== "semua" || kategoriFilter !== "semua" || (showDesa && desaFilter !== "Semua") || (showKelompok && kelompokFilter !== "semua");
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
        {showDesa && (
          <div className="filter-group">
            <span className="filter-label">Desa</span>
            <Select value={desaFilter} onChange={setDesaFilter} ariaLabel="Desa" options={[{ value: "Semua", label: "Semua desa" }, ...desaOptions.map((d) => ({ value: d, label: d }))]} />
          </div>
        )}
        {showKelompok && (
          <div className="filter-group">
            <span className="filter-label">Kelompok</span>
            <Select value={kelompokFilter} onChange={setKelompokFilter} ariaLabel="Kelompok" options={[{ value: "semua", label: "Semua kelompok" }, ...kelompokOptions.map((k) => ({ value: k, label: k }))]} />
          </div>
        )}
      </div>
      <div className="filter-actions">
        <button type="button" className="btn btn-ghost btn-sm" disabled={!hasActive} onClick={reset}>Reset</button>
        <button type="button" className="btn btn-primary btn-sm" onClick={onClose}>Terapkan</button>
      </div>
    </AdminModal>
  );
}

function AnggotaPage({ role: _role }: { role: AdminRole }) {
  const { user } = useAuth();
  const [q, setQ] = useState("");
  const [view, setView] = useState<ViewMode>("list");
  const [showFilter, setShowFilter] = useState(false);
  const [statusFilter, setStatusFilter] = useState("semua");
  const [kategoriFilter, setKategoriFilter] = useState("semua");
  const [desaFilter, setDesaFilter] = useState("Semua");
  const [kelompokFilter, setKelompokFilter] = useState("semua");
  const [showAdd, setShowAdd] = useState(false);
  const [magicLinkModal, setMagicLinkModal] = useState<string | null>(null);
  const [detailMember, setDetailMember] = useState<Member | null>(null);
  const [qrMember, setQrMember] = useState<Member | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; nama: string } | null>(null);
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
          pekerjaan: (r as any).pekerjaan ?? null,
          noTelp: r.noTelp ?? "",
          kategoriMudaMudi: (r.kategoriMudaMudi as Member["kategoriMudaMudi"]) ?? "pribumi",
          domisiliAnak: (r as { domisiliAnak?: string }).domisiliAnak ?? (r as { alamat?: string }).alamat ?? "",
          isOrtuSama: r.isDomisiliOrtuSama == null ? true : Boolean(r.isDomisiliOrtuSama),
          foto: (r as any).foto ?? null,
          avatarId: (r as any).avatarId ?? null,
          jenisKelamin: (r as any).jenisKelamin ?? null,
          hobi: (r as any).hobi ?? null,
          hobiDetail: (r as any).hobiDetail ?? null,
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
    if (kelompokFilterOpts.length > 0) {
      let filtered = kelompokFilterOpts;
      if (_role === "admin_desa" && user?.desaId != null) filtered = filtered.filter((k) => k.desaId === user.desaId);
      return [...new Set(filtered.map((k) => k.nama))].sort();
    }
    return [...new Set(members.map((m) => m.kelompok).filter(Boolean))].sort();
  }, [members, kelompokFilterOpts, _role, user?.desaId]);

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
        role={_role}
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
                      <MemberAvatarCircle member={m} size={36} />
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
                      <InlineMagicLinkBtn generusId={m.id} onLink={setMagicLinkModal} />
                      <button className="btn btn-ghost row-icon-btn" aria-label="Buat QR" title="Buat QR" onClick={() => setQrMember(m)}><IcoQr size={16} /></button>
                      <button
                        className="btn btn-ghost row-icon-btn"
                        aria-label="Hapus anggota"
                        title="Hapus anggota"
                        onClick={() => setDeleteTarget({ id: m.id, nama: m.nama })}
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
                <MemberAvatarCircle member={m} size={40} />
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
                <button className="btn btn-primary row-icon-btn" aria-label="Buat QR" title="Buat QR" style={{ background: "var(--primary)", borderColor: "var(--primary)", color: "#fff" }} onClick={() => setQrMember(m)}><IcoQr size={16} /></button>
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
            setMagicLinkModal(link);
          }}
        />
      )}
      {magicLinkModal && <MagicLinkModal link={magicLinkModal} onClose={() => setMagicLinkModal(null)} />}
      {qrMember && (
        <MemberQrModal
          member={{ id: qrMember.id, nama: qrMember.nama, desa: qrMember.desa, kelompok: qrMember.kelompok }}
          onClose={() => setQrMember(null)}
        />
      )}
      {deleteTarget && (
        <DeleteAnggotaConfirmModal
          nama={deleteTarget.nama}
          onClose={() => setDeleteTarget(null)}
          onConfirm={async () => {
            await apiFetch(`/api/generus/${encodeURIComponent(deleteTarget.id)}`, { method: "DELETE" });
            setMembers((prev) => prev.filter((x) => x.id !== deleteTarget.id));
            setDeleteTarget(null);
          }}
        />
      )}
    </div>
  );
}

function MemberDetailModal({ member, onClose, onMagicLink }: { member: Member; onClose: () => void; onMagicLink?: (link: string) => void }) {
  const [showQr, setShowQr] = useState(false);
  const [showFullAvatar, setShowFullAvatar] = useState(false);
  const [statsData, setStatsData] = useState<{
    total?: number;
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
  const [selectedHobi, setSelectedHobi] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    let cancel = false;
    setLoadingStats(true);
    apiFetch<{ stats?: { total?: number; hadir: number; izin: number; alpha: number; rate: number; streak: number; trophiesCount: number; trophies?: string[]; telatCount?: number; avgTelatMenit?: number; riwayatTelat?: { id: string; judul?: string; tanggal: string; jamKegiatan: string; jamAbsen: string; menit: number }[]; riwayat?: { id: string; tanggal: string; jam?: string; keterangan: string; kategoriAcara?: string; tingkat?: string }[] } }>(`/api/generus/${member.id}`)
      .then((res) => {
        if (cancel) return;
        if (res && res.stats) {
          setStatsData(res.stats);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancel) setLoadingStats(false);
      });
    return () => { cancel = true; };
  }, [member.id]);

  const rows: { label: string; value: string }[] = [
    { label: "Nama", value: member.nama },
    { label: "Desa / Kelompok", value: `${member.desa} / ${member.kelompok}` },
    { label: "Pendidikan", value: member.pendidikan },
    { label: "Pekerjaan", value: member.pekerjaan || "—" },
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

  const memberAchievements = useMemo(() => {
    return computeAchievements({
      kehadiran: {
        total: statsData?.total ?? 0,
        hadir: statsData?.hadir ?? 0,
        izin: statsData?.izin ?? 0,
        alpha: statsData?.alpha ?? 0,
        hadirRate: statsData?.rate ?? 0,
        telat: statsData?.telatCount ?? 0,
        rataRataTelatMenit: statsData?.avgTelatMenit ?? 0,
        riwayatTelat: (statsData?.riwayatTelat ?? []).map((r) => ({ tanggal: r.tanggal, judul: r.judul ?? "", menit: r.menit ?? 0 })),
        tren: [],
      },
      identity: {
        id: member.id,
        nama: member.nama,
        desa: member.desa,
        kelompok: member.kelompok,
        pendidikan: member.pendidikan,
        noTelp: member.noTelp,
        kategoriMudaMudi: member.kategoriMudaMudi,
        asalDaerah: null,
        domisiliAnak: member.domisiliAnak,
        domisiliOrtu: member.domisiliAnak,
        isOrtuSama: member.isOrtuSama,
        foto: member.foto,
        avatarId: member.avatarId,
        jenisKelamin: (member.jenisKelamin as any) ?? null,
        status: member.status,
        hobi: member.hobi,
        hobiDetail: member.hobiDetail,
      },
      kegiatan: (statsData?.riwayat ?? []).map((rk) => ({
        id: rk.id,
        judul: (rk as any).judul ?? "Kegiatan",
        tanggal: rk.tanggal,
        jam: rk.jam ?? "08:00",
        lokasi: "Cengkareng",
        lat: null,
        lng: null,
        radiusM: 100,
        kategori: rk.kategoriAcara,
        tingkat: rk.tingkat,
        statusAbsen: (rk.keterangan as any) ?? "hadir",
      })),
    });
  }, [statsData, member]);

  const totalUnlockedTrophies = useMemo(() => {
    return memberAchievements.filter((a) => a.unlocked).length;
  }, [memberAchievements]);

  return (
    <>
    <AdminModal title="Detail Anggota" onClose={onClose}>
      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 16 }}>
        <button
          type="button"
          onClick={() => setShowFullAvatar(true)}
          style={{ background: "transparent", border: "none", padding: 0, cursor: "pointer", borderRadius: "50%", display: "inline-flex" }}
          title="Klik untuk melihat foto/avatar ukuran penuh"
        >
          <MemberAvatarCircle member={member} size={52} />
        </button>
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
            {loadingStats ? "…" : `${totalUnlockedTrophies}`}
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
      {member.hobi && (() => {
        let hobbyNames: string[] = [];
        try { hobbyNames = JSON.parse(member.hobi); } catch { hobbyNames = []; }
        if (hobbyNames.length === 0) return null;
        const details = parseHobiDetail(member.hobiDetail);
        return (
          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--muted, #6b7280)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>Hobi (klik untuk detail)</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {hobbyNames.map((h) => {
                const key = h.toLowerCase().trim() as HobbyKey;
                const meta = HOBBY_META[key] || { label: h, color: "#64748b", bg: "#f1f5f9" };
                return (
                  <button
                    key={h}
                    type="button"
                    onClick={() => setSelectedHobi(h)}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                      padding: "4px 10px",
                      borderRadius: 999,
                      border: `1px solid ${meta.color}33`,
                      background: meta.bg,
                      color: meta.color,
                      fontSize: 11,
                      fontWeight: 800,
                      cursor: "pointer",
                      textTransform: "capitalize",
                      transition: "transform 0.12s, box-shadow 0.12s",
                    }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.transform = "translateY(-1px)"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = "none"; }}
                  >
                    <span>{meta.label}</span>
                    {details[key] && <span style={{ width: 5, height: 5, borderRadius: "50%", background: meta.color }} />}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })()}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 16 }}>
        <button
          className="btn btn-danger"
          style={{ width: "100%", justifyContent: "center" }}
          onClick={() => setShowDeleteConfirm(true)}
        >
          <IcoTrash size={14} /> Hapus Anggota
        </button>
        <OpenAccessButton memberId={member.id} memberName={member.nama} onCopied={onMagicLink} />
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
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 800, margin: 0 }}>Daftar Trophy ({member.nama})</h3>
                <span style={{ fontSize: 12, color: "var(--muted)" }}>{totalUnlockedTrophies} dari {memberAchievements.length} piala terbuka</span>
              </div>
              <button type="button" className="btn btn-ghost" style={{ padding: 6 }} onClick={() => setActiveModalTab(null)}>✕</button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: 10, maxHeight: 380, overflowY: "auto", padding: 4 }}>
              {memberAchievements.map((tr) => {
                const unlocked = tr.unlocked;
                const rMeta = RARITY_META[tr.rarity] || { color: "#64748b", bg: "#f8fafc", border: "#cbd5e1" };
                return (
                  <div
                    key={tr.id}
                    style={{
                      padding: "12px 8px",
                      borderRadius: 14,
                      background: unlocked ? rMeta.bg : "#f8fafc",
                      border: `1.5px solid ${unlocked ? rMeta.border : "#e2e8f0"}`,
                      textAlign: "center",
                      opacity: unlocked ? 1 : 0.6,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 4
                    }}
                  >
                    <div style={{ width: 56, height: 56, display: "grid", placeItems: "center" }}>
                      <img
                        src={getTrophyIconPath(tr.id)}
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = "none";
                        }}
                        alt={tr.name}
                        width={52}
                        height={52}
                        loading="lazy"
                        style={{
                          display: "block",
                          filter: unlocked ? "none" : "grayscale(1) opacity(0.4)",
                          objectFit: "contain",
                        }}
                      />
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 800, color: unlocked ? rMeta.color : "var(--muted)", lineHeight: 1.2 }}>{tr.name}</span>
                    <span style={{ fontSize: 10, color: "var(--muted)", lineHeight: 1.2 }}>{tr.desc}</span>
                    <span style={{ fontSize: 9, fontWeight: 800, textTransform: "uppercase", padding: "2px 6px", borderRadius: 999, background: unlocked ? rMeta.border : "#e2e8f0", color: unlocked ? rMeta.color : "#64748b", marginTop: 2 }}>
                      {unlocked ? "Terbuka" : `${tr.current}/${tr.target}`}
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

      {/* POPUP SUB-MODAL HOBI DETAIL */}
      {selectedHobi && (() => {
        const key = selectedHobi.toLowerCase().trim() as HobbyKey;
        const meta = HOBBY_META[key] || { label: selectedHobi, color: "#64748b", bg: "#f1f5f9" };
        const details = parseHobiDetail(member.hobiDetail);
        const specificNote = details[key];
        return (
          <div className="modal-backdrop" onClick={() => setSelectedHobi(null)} style={{ zIndex: 1100 }}>
            <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 380, width: "calc(100% - 24px)", padding: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ display: "inline-block", width: 12, height: 12, borderRadius: "50%", background: meta.color }} />
                  <h3 style={{ fontSize: 16, fontWeight: 800, margin: 0, color: "var(--ink)" }}>Hobi: {meta.label}</h3>
                </div>
                <button type="button" className="btn btn-ghost" style={{ padding: 6 }} onClick={() => setSelectedHobi(null)}>✕</button>
              </div>

              <div style={{ padding: 14, borderRadius: 12, background: meta.bg, border: `1.5px solid ${meta.color}33`, marginBottom: 14 }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: meta.color, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>
                  Catatan / Rincian Hobi
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "var(--ink)", lineHeight: 1.4 }}>
                  {specificNote && specificNote.trim() ? specificNote : `Anggota ini menyukai ${meta.label.toLowerCase()} (belum ada catatan tambahan).`}
                </div>
              </div>

              <div style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.4 }}>
                Diisi langsung oleh <b>{member.nama}</b> di halaman profil generus.
              </div>

              <div style={{ marginTop: 16 }}>
                <button type="button" className="btn btn-primary" style={{ width: "100%" }} onClick={() => setSelectedHobi(null)}>Tutup</button>
              </div>
            </div>
          </div>
        );
      })()}

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

      {/* MODAL PREVIEW FULL AVATAR / FOTO */}
      {showFullAvatar && (
        <div className="modal-backdrop" onClick={() => setShowFullAvatar(false)} style={{ zIndex: 1200, background: "rgba(0,0,0,0.75)", display: "grid", placeItems: "center", padding: 16 }}>
          <div
            className="modal"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: 420,
              width: "100%",
              padding: 20,
              textAlign: "center",
              borderRadius: 20,
              background: "#fff",
              position: "relative",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div style={{ fontWeight: 800, fontSize: 16, textAlign: "left" }}>Foto Profil ({member.nama})</div>
              <button type="button" className="btn btn-ghost" style={{ padding: 6 }} onClick={() => setShowFullAvatar(false)}>✕</button>
            </div>

            <div style={{ width: "100%", aspectRatio: "1 / 1", borderRadius: 16, overflow: "hidden", background: "var(--surface-sunken, #f8fafc)", border: "1px solid var(--line)", display: "grid", placeItems: "center", marginBottom: 14 }}>
              {member.foto ? (
                <img
                  src={member.foto}
                  alt={member.nama}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              ) : member.avatarId ? (
                <img
                  src={`/avatars/${member.avatarId.replace(/\.png$/, "")}.webp`}
                  alt={member.nama}
                  style={{ width: "80%", height: "80%", objectFit: "contain" }}
                />
              ) : (
                <div style={{ fontSize: 64, fontWeight: 900, color: "var(--primary)" }}>
                  {member.nama.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]).join("") || "A"}
                </div>
              )}
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span className="muted" style={{ fontSize: 12 }}>
                {member.foto ? "Foto Kustom R2" : member.avatarId ? `Avatar: ${member.avatarId}` : "Inisial"}
              </span>
              <button type="button" className="btn btn-primary" onClick={() => setShowFullAvatar(false)}>
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

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
      {showQr && (
        <MemberQrModal
          member={{ id: member.id, nama: member.nama, desa: member.desa, kelompok: member.kelompok }}
          onClose={() => setShowQr(false)}
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
  const confirmText = `Hapus ${nama}`;
  const isMatch = typed.trim() === confirmText;

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
    <AdminModal title={`Hapus ${nama}?`} onClose={onClose}>
      <div style={{ display: "grid", gap: 14 }}>
        <div style={{ padding: "12px 14px", borderRadius: 12, background: "#fffbeb", border: "1px solid #fde68a", color: "#78350f", fontSize: 13, lineHeight: 1.5 }}>
          <strong>{nama}</strong> akan dihapus permanen. Data <strong>generus</strong> dan <strong>akun login</strong> akan terhapus.
        </div>
        <div style={{ fontSize: 13, lineHeight: 1.5 }}>
          Ketik <strong style={{ fontFamily: "monospace", background: "#f1f5f9", padding: "2px 6px", borderRadius: 6 }}>{confirmText}</strong> untuk melanjutkan.
        </div>
        <div className="field">
          <label>Konfirmasi *</label>
          <input value={typed} onChange={(e) => setTyped(e.target.value)} placeholder={confirmText} disabled={busy} autoComplete="off" autoFocus />
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
            {busy ? "Menghapus…" : confirmText}
          </button>
        </div>
      </div>
    </AdminModal>
  );
}

function MagicLinkModal({ link, onClose }: { link: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const isErr = link.startsWith("__error:");
  const displayLink = isErr ? link.slice(8) : link;
  const shareText = `Buka akses login Gencar (berlaku 15 menit): ${displayLink}`;
  return (
    <AdminModal title={isErr ? "Gagal" : "Link Buka Akses Login"} onClose={onClose}>
      <div style={{ display: "grid", gap: 12 }}>
        {isErr ? (
          <div className="pill pill-amber" style={{ fontSize: 13 }}>{displayLink}</div>
        ) : (
          <>
            <div className="muted" style={{ fontSize: 13 }}>Berlaku 15 menit, sekali pakai. Link sudah di-copy ke clipboard.</div>
            <div className="card" style={{ background: "var(--bg)", wordBreak: "break-all", fontSize: 13, fontFamily: "monospace" }}>{displayLink}</div>
            <button className="btn btn-ghost" onClick={() => { navigator.clipboard.writeText(displayLink).then(() => setCopied(true)).catch(() => {}); }}>
              {copied ? "✓ Disalin" : "Salin link"}
            </button>
            <div style={{ display: "flex", gap: 8 }}>
              <a className="btn" style={{ flex: 1, justifyContent: "center", textDecoration: "none", background: "#25D366", color: "#fff", fontWeight: 700, fontSize: 13, gap: 8 }} href={`https://wa.me/?text=${encodeURIComponent(shareText)}`} target="_blank" rel="noopener noreferrer">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                WhatsApp
              </a>
              <button className="btn" style={{ flex: 1, background: "linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)", color: "#fff", fontWeight: 700, fontSize: 13, gap: 8 }} onClick={async () => {
                if (navigator.share) {
                  try { await navigator.share({ title: "Link Gencar", text: shareText }); return; } catch {}
                }
                await navigator.clipboard.writeText(shareText).catch(() => {});
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
                Instagram
              </button>
            </div>
          </>
        )}
      </div>
    </AdminModal>
  );
}

function InlineMagicLinkBtn({ generusId, onLink }: { generusId: string; onLink?: (link: string) => void }) {
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
      try { await navigator.clipboard.writeText(link); } catch {}
      setOk(true);
      onLink?.(link);
      setTimeout(() => setOk(false), 1800);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      onLink?.(`__error:${msg || "Gagal membuat link akses login."}`);
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

function OpenAccessButton({ memberId, memberName: _memberName, onCopied }: { memberId: string; memberName: string; onCopied?: (link: string) => void }) {
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
      try { await navigator.clipboard.writeText(link); } catch {}
      setCopiedOnce(true);
      onCopied?.(link);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      onCopied?.(`__error:${msg || "Gagal membuat link akses login."}`);
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
    pekerjaan: "", jenisKelamin: "L" as "L" | "P", kategoriMudaMudi: "pribumi" as Member["kategoriMudaMudi"], asalDaerah: "",
    domisiliAnak: "", isOrtuSama: true, domisiliOrtu: "", desa: "", kelompok: "",
  });
  const [saving, setSaving] = useState(false);
  const [saveErr, setSaveErr] = useState<string | null>(null);
  const [pekerjaanOpen, setPekerjaanOpen] = useState(false);
  const [pekerjaanFreeMode, setPekerjaanFreeMode] = useState(false);
  const pekerjaanRef = useRef<HTMLDivElement>(null);
  const [desaOpts, setDesaOpts] = useState<{ id: number; nama: string }[]>([]);
  const [kelompokOpts, setKelompokOpts] = useState<{ id: number; nama: string; desaId: number }[]>([]);

  useEffect(() => {
    void apiFetch<{ id: number; nama: string }[]>("/api/auth/desa")
      .then((j: unknown) => {
        const arr = Array.isArray(j) ? j as { id: number; nama: string }[] : (j && typeof j === "object" && Array.isArray((j as { desa?: unknown[] }).desa) ? (j as { desa: { id: number; nama: string }[] }).desa : []);
        setDesaOpts(arr);
        if (arr.length > 0) setForm((prev) => ({ ...prev, desa: arr[0].nama }));
      })
      .catch(() => {});
    void apiFetch<{ id: number; nama: string; desaId: number }[]>("/api/auth/kelompok")
      .then((j: unknown) => {
        if (Array.isArray(j)) {
          const arr = j as { id: number; nama: string; desaId: number }[];
          setKelompokOpts(arr);
          if (arr.length > 0) setForm((prev) => ({ ...prev, kelompok: arr[0].nama }));
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!pekerjaanOpen) return;
    const handler = (e: MouseEvent) => {
      if (pekerjaanRef.current && !pekerjaanRef.current.contains(e.target as Node)) setPekerjaanOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [pekerjaanOpen]);

  const filteredKelompok = kelompokOpts.filter((k) => {
    const desa = desaOpts.find((d) => d.nama === form.desa);
    return desa ? k.desaId === desa.id : true;
  });

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
          pekerjaan: form.pekerjaan.trim() || undefined,
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
        pekerjaan: form.pekerjaan.trim() || null,
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

  const canNext1 = form.nama.trim().length >= 2 && form.tempatLahir.trim() && form.tanggalLahir && form.noTelp.trim().length >= 10 && form.pekerjaan.trim().length > 0;
  const canNext2 = form.domisiliAnak.trim().length >= 3 && (form.isOrtuSama || form.domisiliOrtu.trim().length >= 3);
  const needAsal = form.kategoriMudaMudi === "perantauan" && !form.asalDaerah.trim();

  return (
    <AdminModal title="Tambah Anggota (oleh Admin)" onClose={onClose}>
        <div className="stepper" style={{ marginBottom: 12 }}>{[1, 2, 3].map((n) => <div key={n} className={`step-dot ${s >= n ? "on" : ""}`} />)}</div>
        <div className="muted" style={{ marginBottom: 16 }}>Langkah {s}/3 &bull; Wajib: nama, pendidikan, pekerjaan, tanggal lahir, no telp, tempat lahir, domisili anak.</div>

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
            <div className="field" style={{ position: "relative" }} ref={(el) => { if (el) pekerjaanRef.current = el; }}>
              <label>Pekerjaan *</label>
              <div style={{ display: "flex", gap: 0 }}>
                <input
                  data-pekerjaan-input
                  value={form.pekerjaan}
                  onChange={(e) => { setForm({ ...form, pekerjaan: e.target.value }); setPekerjaanOpen(true); setPekerjaanFreeMode(true); }}
                  onFocus={() => setPekerjaanOpen(true)}
                  placeholder={pekerjaanFreeMode ? "Tulis pekerjaan…" : "Ketik atau pilih…"}
                  style={{ flex: 1, borderRadius: "12px 0 0 12px", borderRight: "none" }}
                />
                <button
                  type="button"
                  onClick={() => { setPekerjaanOpen((v) => !v); setPekerjaanFreeMode(true); }}
                  style={{ padding: "0 10px", borderRadius: "0 12px 12px 0", border: "1px solid var(--line)", background: "#f8fafc", cursor: "pointer", display: "grid", placeItems: "center", color: "var(--muted)" }}
                  aria-label="Tampilkan pekerjaan"
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </button>
              </div>
              {pekerjaanOpen && (() => {
                const q = form.pekerjaan.toLowerCase().trim();
                const groups = PEKERJAAN_GROUPS.map((g) => ({
                  ...g,
                  filtered: g.items.filter((it) => !q || it.toLowerCase().includes(q)),
                })).filter((g) => g.filtered.length > 0 || !q);
                return (
                  <div style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 100, background: "#fff", border: "1px solid var(--line)", borderRadius: 12, boxShadow: "0 8px 24px rgba(0,0,0,.08)", maxHeight: 280, overflowY: "auto", marginTop: 4 }}>
                    {groups.length === 0 && (
                      <div style={{ padding: "12px 14px", fontSize: 12, color: "var(--muted)" }}>Tidak ada yang cocok — lanjut ketik bebas</div>
                    )}
                    {groups.map((g) => (
                      <div key={g.label}>
                        <div style={{ padding: "6px 14px 2px", fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--muted)", background: "#f8fafc", position: "sticky", top: 0, zIndex: 1 }}>{g.label}</div>
                        {g.filtered.map((item) => (
                          <button
                            key={item}
                            type="button"
                            onClick={() => { setForm({ ...form, pekerjaan: item }); setPekerjaanOpen(false); setPekerjaanFreeMode(false); }}
                            style={{ display: "block", width: "100%", textAlign: "left", padding: "7px 14px", fontSize: 13, background: form.pekerjaan === item ? "#fff1e6" : "transparent", border: "none", cursor: "pointer", color: form.pekerjaan === item ? "var(--primary)" : "var(--ink)" }}
                          >{item}</button>
                        ))}
                        {!q && (
                          <button
                            type="button"
                            onClick={() => { setForm({ ...form, pekerjaan: "" }); setPekerjaanOpen(false); setPekerjaanFreeMode(true); setTimeout(() => { const inp = document.querySelector<HTMLInputElement>("[data-pekerjaan-input]"); inp?.focus(); }, 50); }}
                            style={{ display: "block", width: "100%", textAlign: "left", padding: "7px 14px", fontSize: 12, fontWeight: 600, background: "transparent", border: "none", color: "var(--muted)", fontStyle: "italic" }}
                          >+ Lainnya (ketik sendiri)…</button>
                        )}
                      </div>
                    ))}
                  </div>
                );
              })()}
              {pekerjaanFreeMode && form.pekerjaan.trim().length === 0 && (
                <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>Ketik pekerjaan jika tidak ada di daftar</div>
              )}
            </div>
            <div className="form-grid-2">
              <div className="field"><label>Jenis Kelamin *</label>
                <Select
                  value={form.jenisKelamin}
                  onChange={(v) => setForm({ ...form, jenisKelamin: v as "L" | "P" })}
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
            {pekerjaanFreeMode && form.pekerjaan.trim().length === 0 && <div className="pill pill-amber">Tulis nama pekerjaan</div>}
            <div className="form-grid-2">
              <div className="field"><label>Desa</label>
                <Select
                  value={form.desa}
                  onChange={(v) => setForm({ ...form, desa: v, kelompok: "" })}
                  ariaLabel="Desa"
                  options={desaOpts.map((d) => ({ value: d.nama, label: d.nama }))}
                />
              </div>
              <div className="field"><label>Kelompok</label>
                <Select
                  value={form.kelompok}
                  onChange={(v) => setForm({ ...form, kelompok: v })}
                  ariaLabel="Kelompok"
                  options={filteredKelompok.map((k) => ({ value: k.nama, label: k.nama }))}
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
              <div className="muted">{form.pekerjaan} &bull; {form.kategoriMudaMudi}{form.asalDaerah ? ` &bull; asal ${form.asalDaerah}` : ""} &bull; {form.desa}/{form.kelompok}</div>
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

function DeleteKegiatanModal({ kegiatan, onClose, onDeleted }: { kegiatan: Kegiatan; onClose: () => void; onDeleted: () => void }) {
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const confirmText = `Hapus ${kegiatan.judul}`;
  const isMatch = typed.trim() === confirmText;

  async function handleDelete() {
    if (!isMatch || busy) return;
    setBusy(true);
    setErr(null);
    try {
      await apiFetch(`/api/kegiatan/${kegiatan.id}`, { method: "DELETE" });
      onDeleted();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  const judulShort = kegiatan.judul.length > 40 ? kegiatan.judul.slice(0, 40) + "…" : kegiatan.judul;

  return (
    <AdminModal title="Hapus Kegiatan?" onClose={onClose}>
      <div style={{ display: "grid", gap: 14 }}>
        <div style={{ padding: "12px 14px", borderRadius: 12, background: "#fffbeb", border: "1px solid #fde68a", color: "#78350f", fontSize: 13, lineHeight: 1.5 }}>
          <strong style={{ wordBreak: "break-word" }}>{kegiatan.judul}</strong> akan dihapus permanen. Data kegiatan ini tidak bisa dikembalikan.
        </div>
        <div style={{ fontSize: 13, lineHeight: 1.5 }}>
          Ketik <strong style={{ fontFamily: "monospace", background: "#f1f5f9", padding: "2px 6px", borderRadius: 6, wordBreak: "break-all" }}>{confirmText}</strong> untuk melanjutkan.
        </div>
        <div className="field">
          <label>Konfirmasi *</label>
          <input value={typed} onChange={(e) => setTyped(e.target.value)} placeholder={judulShort} disabled={busy} autoComplete="off" autoFocus />
        </div>
        {err && (
          <div style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid #fecaca", background: "#fef2f2", color: "#991b1b", fontSize: 13, display: "flex", gap: 8 }}>
            <span style={{ flex: 1, wordBreak: "break-word" }}>{err}</span>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setErr(null)}>Tutup</button>
          </div>
        )}
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-ghost" style={{ flex: 1 }} disabled={busy} onClick={onClose}>Batal</button>
          <button className="btn btn-danger" style={{ flex: 1, minWidth: 0 }} disabled={!isMatch || busy} aria-busy={busy} onClick={() => void handleDelete()}>
            {busy ? "Menghapus…" : "Hapus"}
          </button>
        </div>
      </div>
    </AdminModal>
  );
}

function AbsensiViewerModal({ kegiatan, onClose }: { kegiatan: Kegiatan; onClose: () => void }) {
  const [rows, setRows] = useState<{ id: string; generusNama: string; generusNomorUnik?: string; generusKategori?: string; generusJenisKelamin?: string; keterangan: string; timestamp: string; desaNama?: string; kelompokNama?: string }[]>([]);
  const [pesertaData, setPesertaData] = useState<{ total: number; hadir: number; izin: number; alpha: number; belum: number; peserta: { id: string; nama: string; desaNama: string | null; kelompokNama: string | null; status: string }[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [tab, setTab] = useState<"absensi" | "peserta">("absensi");

  useEffect(() => {
    let cancel = false;
    setLoading(true);
    setErr(null);
    apiFetch<unknown>(`/api/absensi?kegiatanId=${encodeURIComponent(kegiatan.id)}`)
      .then((raw) => {
        if (cancel) return;
        const arr = Array.isArray(raw) ? raw : [];
        setRows(arr as typeof rows);
      })
      .catch((e) => {
        if (!cancel) setErr(e instanceof Error ? e.message : String(e));
      })
      .finally(() => { if (!cancel) setLoading(false); });
    // Fetch peserta data
    apiFetch<any>(`/api/kegiatan/${kegiatan.id}/peserta`).then((res) => {
      if (!cancel && res && res.peserta) setPesertaData(res);
    }).catch(() => {});
    return () => { cancel = true; };
  }, [kegiatan.id]);

  const hadir = rows.filter((r) => r.keterangan === "hadir").length;
  const izin = rows.filter((r) => r.keterangan === "izin").length;
  const alpha = rows.filter((r) => r.keterangan === "alpha").length;

  return (
    <AdminModal title={`Absensi — ${kegiatan.judul}`} onClose={onClose} maxWidth={720}>
      <div style={{ display: "grid", gap: 12 }}>
        {pesertaData && pesertaData.total > 0 && (
          <div style={{ display: "flex", gap: 6, marginBottom: 4 }}>
            <button type="button" className={`chip ${tab === "absensi" ? "active" : ""}`} onClick={() => setTab("absensi")}>Absensi ({rows.length})</button>
            <button type="button" className={`chip ${tab === "peserta" ? "active" : ""}`} onClick={() => setTab("peserta")}>Peserta Wajib ({pesertaData.total})</button>
          </div>
        )}
        {tab === "absensi" && (
          <>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <span className="pill pill-emerald">Hadir: {hadir}</span>
              <span className="pill pill-amber">Izin: {izin}</span>
              <span className="pill pill-slate">Alpha: {alpha}</span>
              <span className="pill pill-slate">Total: {rows.length}</span>
            </div>
            {err && <div style={{ fontSize: 12, color: "#991b1b", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: "8px 10px" }}>{err}</div>}
            {loading ? (
              <div className="lp-empty-card">Memuat data absensi…</div>
            ) : rows.length === 0 ? (
              <div className="lp-empty-card">Belum ada absensi untuk kegiatan ini.</div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table className="admin-table" style={{ fontSize: 13 }}>
                  <thead><tr><th>#</th><th>Nama</th><th>Kelompok</th><th>Keterangan</th><th>Waktu</th></tr></thead>
                  <tbody>
                    {rows.map((r, i) => (
                      <tr key={r.id}>
                        <td>{i + 1}</td>
                        <td><strong>{r.generusNama}</strong>{r.generusNomorUnik ? <span className="muted" style={{ fontSize: 11 }}> · {r.generusNomorUnik}</span> : null}</td>
                        <td>{r.kelompokNama ?? r.desaNama ?? "—"}</td>
                        <td><span className={`pill ${r.keterangan === "hadir" ? "pill-emerald" : r.keterangan === "izin" ? "pill-amber" : "pill-slate"}`} style={{ fontSize: 10, padding: "2px 8px" }}>{r.keterangan}</span></td>
                        <td className="muted" style={{ fontSize: 11, whiteSpace: "nowrap" }}>{r.timestamp ? new Date(r.timestamp).toLocaleString("id-ID", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
        {tab === "peserta" && pesertaData && (
          <>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <span className="pill pill-emerald">Hadir: {pesertaData.hadir}</span>
              <span className="pill pill-amber">Izin: {pesertaData.izin}</span>
              <span className="pill pill-slate">Alpha: {pesertaData.alpha}</span>
              <span className="pill pill-slate">Belum: {pesertaData.belum}</span>
              <span className="pill pill-slate">Total: {pesertaData.total}</span>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table className="admin-table" style={{ fontSize: 13 }}>
                <thead><tr><th>#</th><th>Nama</th><th>Kelompok</th><th>Status</th></tr></thead>
                <tbody>
                  {pesertaData.peserta.map((p, i) => (
                    <tr key={p.id}>
                      <td>{i + 1}</td>
                      <td><strong>{p.nama}</strong></td>
                      <td>{p.kelompokNama ?? p.desaNama ?? "—"}</td>
                      <td><span className={`pill ${p.status === "hadir" ? "pill-emerald" : p.status === "izin" ? "pill-amber" : p.status === "alpha" ? "pill-slate" : "pill-slate"}`} style={{ fontSize: 10, padding: "2px 8px" }}>{p.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </AdminModal>
  );
}

function PesertaKelompokPicker({ kelompokList, selectedIds, onChange, desaList }: {
  kelompokList: { id: number; nama: string; desaId: number }[];
  selectedIds: number[];
  onChange: (ids: number[]) => void;
  desaList?: { id: number; nama: string }[];
}) {
  const [search, setSearch] = useState("");
  const [filterDesa, setFilterDesa] = useState<string>("semua");
  const [showFilter, setShowFilter] = useState(false);
  const desaMap = useMemo(() => {
    const m = new Map<number, string>();
    (desaList ?? []).forEach((d) => m.set(d.id, d.nama));
    return m;
  }, [desaList]);
  const uniqueDesa = useMemo(() => [...new Set(kelompokList.map((k) => desaMap.get(k.desaId)).filter(Boolean))] as string[], [kelompokList, desaMap]);
  const filtered = useMemo(() => kelompokList.filter((k) => {
    if (filterDesa !== "semua" && desaMap.get(k.desaId) !== filterDesa) return false;
    if (search) {
      const s = search.toLowerCase();
      const desaNama = desaMap.get(k.desaId) ?? "";
      if (!k.nama.toLowerCase().includes(s) && !desaNama.toLowerCase().includes(s)) return false;
    }
    return true;
  }), [kelompokList, search, desaMap, filterDesa]);
  const hasFilter = filterDesa !== "semua";
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
        <span style={{ fontWeight: 700, fontSize: 12 }}>Per Kelompok</span>
        <span className="muted" style={{ fontSize: 11 }}>{selectedIds.length} dipilih</span>
      </div>
      <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
        <input type="text" placeholder="Cari nama kelompok…" value={search} onChange={(e) => setSearch(e.target.value)}
          style={{ flex: 1, padding: "8px 12px", fontSize: 13, border: "1px solid var(--line)", borderRadius: 10, outline: "none", background: "var(--bg)" }} />
        <button type="button" className={`btn ${hasFilter ? "btn-primary" : "btn-ghost"} btn-sm`} style={{ minWidth: 36, padding: "6px 10px", fontSize: 12, borderRadius: 10 }}
          onClick={() => setShowFilter((v) => !v)}>
          <IcoFilter size={14} />{hasFilter && <span style={{ marginLeft: 4, fontSize: 10, background: "#fff", color: "var(--primary)", borderRadius: 99, padding: "0 5px", fontWeight: 800 }}>1</span>}
        </button>
      </div>
      {showFilter && (
        <div style={{ display: "grid", gap: 8, padding: 12, border: "1px solid var(--line)", borderRadius: 10, background: "#fff", marginBottom: 8 }}>
          <div className="field" style={{ marginBottom: 0 }}>
            <label style={{ fontSize: 12, fontWeight: 700 }}>Desa</label>
            <Select value={filterDesa} onChange={setFilterDesa} ariaLabel="Filter desa"
              options={[{ value: "semua", label: "Semua Desa" }, ...uniqueDesa.map((d) => ({ value: d, label: d }))]} />
          </div>
          {hasFilter && <button type="button" className="btn btn-ghost btn-sm" style={{ fontSize: 12 }} onClick={() => setFilterDesa("semua")}>Reset Filter</button>}
        </div>
      )}
      <div className="peserta-gen-list" style={{ maxHeight: 180, overflowY: "auto", border: "1px solid var(--line)", borderRadius: 10, background: "#fff" }}>
        {filtered.length === 0 && <div className="muted" style={{ padding: 14, fontSize: 12, textAlign: "center" }}>Tidak ada kelompok.</div>}
        {filtered.map((k) => (
          <label key={k.id} className="peserta-gen-item" style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", fontSize: 13, cursor: "pointer", borderBottom: "1px solid var(--line, #f1f5f9)", background: selectedIds.includes(k.id) ? "#f0fdf4" : "transparent", transition: "background 0.1s" }}>
            <input type="checkbox" checked={selectedIds.includes(k.id)} style={{ width: 16, height: 16, accentColor: "var(--primary)" }}
              onChange={() => {
                const scrollEl = document.querySelector(".modal");
                const scrollTop = scrollEl?.scrollTop ?? 0;
                onChange(selectedIds.includes(k.id) ? selectedIds.filter((x) => x !== k.id) : [...selectedIds, k.id]);
                requestAnimationFrame(() => { if (scrollEl) scrollEl.scrollTop = scrollTop; });
              }} />
            <span style={{ flex: 1, fontWeight: 500 }}>{k.nama}<span className="muted" style={{ fontSize: 11, fontWeight: 400 }}> · {desaMap.get(k.desaId) ?? ""}</span></span>
            {selectedIds.includes(k.id) && <span style={{ fontSize: 11, color: "var(--primary)", fontWeight: 700 }}>✓</span>}
          </label>
        ))}
      </div>
    </div>
  );
}

function PesertaAnggotaPicker({ generusList, selectedIds, onChange, role, userKelompokId }: {
  generusList: { id: string; nama: string; kelompokId?: number | null; desaNama?: string | null; kelompokNama?: string | null }[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  role: AdminRole;
  userKelompokId?: number | null;
  desaList?: { id: number; nama: string }[];
  kelompokList?: { id: number; nama: string; desaId: number }[];
}) {
  const [search, setSearch] = useState("");
  const [filterDesa, setFilterDesa] = useState<string>("semua");
  const [filterKel, setFilterKel] = useState<string>("semua");
  const [showFilterAnggota, setShowFilterAnggota] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const uniqueDesa = useMemo(() => [...new Set(generusList.map((g) => g.desaNama).filter(Boolean))] as string[], [generusList]);
  const uniqueKelompok = useMemo(() => {
    const desaNama = filterDesa !== "semua" ? filterDesa : null;
    return [...new Set(generusList.filter((g) => !desaNama || g.desaNama === desaNama).map((g) => g.kelompokNama).filter(Boolean))] as string[];
  }, [generusList, filterDesa]);
  const getWilayah = (g: { desaNama?: string | null; kelompokNama?: string | null }) => {
    const parts: string[] = [];
    if (g.desaNama) parts.push(g.desaNama);
    if (g.kelompokNama) parts.push(g.kelompokNama);
    return parts.join(" · ");
  };
  const filtered = useMemo(() => generusList.filter((g) => {
    if (role === "admin_kelompok" && g.kelompokId !== userKelompokId) return false;
    if (filterDesa !== "semua" && g.desaNama !== filterDesa) return false;
    if (filterKel !== "semua" && g.kelompokNama !== filterKel) return false;
    if (search) {
      const s = search.toLowerCase();
      const wilayah = getWilayah(g).toLowerCase();
      if (!g.nama.toLowerCase().includes(s) && !wilayah.includes(s)) return false;
    }
    return true;
  }), [generusList, role, userKelompokId, search, filterDesa, filterKel]);
  const hasFilter = filterDesa !== "semua" || filterKel !== "semua";
  const toggle = (id: string) => {
    const scrollEl = document.querySelector(".modal");
    const scrollTop = scrollEl?.scrollTop ?? 0;
    onChange(selectedIds.includes(id) ? selectedIds.filter((x) => x !== id) : [...selectedIds, id]);
    requestAnimationFrame(() => { if (scrollEl) scrollEl.scrollTop = scrollTop; });
  };
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
        <span style={{ fontWeight: 700, fontSize: 12 }}>Per Anggota</span>
        <span className="muted" style={{ fontSize: 11 }}>{selectedIds.length} dipilih</span>
      </div>
      <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
        <input ref={inputRef} type="text" placeholder="Cari nama…" value={search} onChange={(e) => setSearch(e.target.value)}
          style={{ flex: 1, padding: "8px 12px", fontSize: 13, border: "1px solid var(--line)", borderRadius: 10, outline: "none", background: "var(--bg)" }} />
        <button type="button" className={`btn ${hasFilter ? "btn-primary" : "btn-ghost"} btn-sm`} style={{ minWidth: 36, padding: "6px 10px", fontSize: 12, borderRadius: 10 }}
          onClick={() => setShowFilterAnggota((v) => !v)}>
          <IcoFilter size={14} />{hasFilter && <span style={{ marginLeft: 4, fontSize: 10, background: "#fff", color: "var(--primary)", borderRadius: 99, padding: "0 5px", fontWeight: 800 }}>{(filterDesa !== "semua" ? 1 : 0) + (filterKel !== "semua" ? 1 : 0)}</span>}
        </button>
      </div>
      {showFilterAnggota && (
        <div style={{ display: "grid", gap: 8, padding: 12, border: "1px solid var(--line)", borderRadius: 10, background: "#fff", marginBottom: 8 }}>
          <div className="field" style={{ marginBottom: 0 }}>
            <label style={{ fontSize: 12, fontWeight: 700 }}>Desa</label>
            <Select value={filterDesa} onChange={(v) => { setFilterDesa(v); setFilterKel("semua"); }} ariaLabel="Filter desa"
              options={[{ value: "semua", label: "Semua Desa" }, ...uniqueDesa.map((d) => ({ value: d, label: d }))]} />
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label style={{ fontSize: 12, fontWeight: 700 }}>Kelompok</label>
            <Select value={filterKel} onChange={setFilterKel} ariaLabel="Filter kelompok"
              options={[{ value: "semua", label: "Semua Kelompok" }, ...uniqueKelompok.map((k) => ({ value: k, label: k }))]} />
          </div>
          {hasFilter && <button type="button" className="btn btn-ghost btn-sm" style={{ fontSize: 12 }} onClick={() => { setFilterDesa("semua"); setFilterKel("semua"); }}>Reset Filter</button>}
        </div>
      )}
      <div className="peserta-gen-list" style={{ maxHeight: 220, overflowY: "auto", border: "1px solid var(--line)", borderRadius: 10, background: "#fff" }}>
        {filtered.length === 0 && <div className="muted" style={{ padding: 14, fontSize: 12, textAlign: "center" }}>Tidak ada anggota.</div>}
        {filtered.map((g) => (
          <label key={g.id} className="peserta-gen-item" style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", fontSize: 13, cursor: "pointer", borderBottom: "1px solid var(--line, #f1f5f9)", background: selectedIds.includes(g.id) ? "#f0fdf4" : "transparent", transition: "background 0.1s" }}>
            <input type="checkbox" checked={selectedIds.includes(g.id)} style={{ width: 16, height: 16, accentColor: "var(--primary)" }}
              onChange={() => toggle(g.id)} />
            <span style={{ flex: 1, fontWeight: 500 }}>{g.nama}<span className="muted" style={{ fontSize: 11, fontWeight: 400 }}> · {getWilayah(g) || "—"}</span></span>
            {selectedIds.includes(g.id) && <span style={{ fontSize: 11, color: "var(--primary)", fontWeight: 700 }}>✓</span>}
          </label>
        ))}
      </div>
    </div>
  );
}

function KegiatanCalendarModal({ list, onClose }: { list: Kegiatan[]; onClose: () => void }) {
  const today = new Date();
  const [month, setMonth] = useState(today.getMonth());
  const [year, setYear] = useState(today.getFullYear());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();
  const monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

  const kegiatanByDate = useMemo(() => {
    const map: Record<string, Kegiatan[]> = {};
    list.forEach((k) => {
      if (!map[k.tanggal]) map[k.tanggal] = [];
      map[k.tanggal].push(k);
    });
    return map;
  }, [list]);

  const selectedKegiatan = selectedDate ? kegiatanByDate[selectedDate] ?? [] : [];

  const prevMonth = () => { if (month === 0) { setMonth(11); setYear((y) => y - 1); } else setMonth((m) => m - 1); setSelectedDate(null); };
  const nextMonth = () => { if (month === 11) { setMonth(0); setYear((y) => y + 1); } else setMonth((m) => m + 1); setSelectedDate(null); };

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <AdminModal title="Kalender Kegiatan" onClose={onClose} maxWidth={600}>
      <div style={{ display: "grid", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <button className="btn btn-ghost btn-sm" onClick={prevMonth}>← Prev</button>
          <span style={{ fontWeight: 800, fontSize: 15 }}>{monthNames[month]} {year}</span>
          <button className="btn btn-ghost btn-sm" onClick={nextMonth}>Next →</button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, textAlign: "center" }}>
          {["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"].map((d) => (
            <div key={d} style={{ fontSize: 11, fontWeight: 700, color: "var(--text-secondary)", padding: 4 }}>{d}</div>
          ))}
          {cells.map((d, i) => {
            if (d === null) return <div key={`e${i}`} />;
            const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
            const hasKegiatan = !!kegiatanByDate[dateStr]?.length;
            const isToday = d === today.getDate() && month === today.getMonth() && year === today.getFullYear();
            const isSelected = dateStr === selectedDate;
            return (
              <button key={d} type="button"
                onClick={() => setSelectedDate(isSelected ? null : dateStr)}
                style={{ padding: "6px 2px", borderRadius: 8, fontSize: 13, fontWeight: isToday ? 800 : 500, border: isSelected ? "2px solid var(--primary)" : isToday ? "2px solid var(--line)" : "2px solid transparent", background: isSelected ? "var(--primary)" : isToday ? "var(--bg)" : "transparent", color: isSelected ? "#fff" : "var(--text)", cursor: "pointer", position: "relative", transition: "all 0.15s" }}>
                {d}
                {hasKegiatan && <span style={{ position: "absolute", bottom: 2, left: "50%", transform: "translateX(-50%)", width: 5, height: 5, borderRadius: "50%", background: isSelected ? "#fff" : "var(--primary)" }} />}
              </button>
            );
          })}
        </div>
        {selectedDate && (
          <div style={{ borderTop: "1px solid var(--line)", paddingTop: 12 }}>
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8 }}>{selectedKegiatan.length > 0 ? `${selectedKegiatan.length} kegiatan` : "Tidak ada kegiatan"} — {new Date(selectedDate + "T00:00:00").toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</div>
            {selectedKegiatan.map((k) => (
              <div key={k.id} style={{ padding: "10px 14px", borderRadius: 10, background: "#fff", marginBottom: 8, border: "1px solid var(--line)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <span className={`pill ${k.kategori === "sambung_rutin" ? "pill-emerald" : k.kategori === "keakraban" ? "pill-amber" : "pill-slate"}`} style={{ fontSize: 10, flexShrink: 0, padding: "2px 8px" }}>{k.kategori === "sambung_rutin" ? "Sambung Rutin" : k.kategori.charAt(0).toUpperCase() + k.kategori.slice(1)}</span>
                  <span className="muted" style={{ fontSize: 11 }}>{k.tingkat === "daerah" ? "Daerah" : k.tingkat === "desa" ? `Desa · ${k.desa ?? ""}` : `Kelompok · ${k.kelompok ?? ""}`}</span>
                </div>
                <div style={{ fontWeight: 800, fontSize: 14, lineHeight: 1.3, marginBottom: 4 }}>{k.judul}</div>
                <div style={{ display: "flex", gap: 12, fontSize: 12, color: "var(--text-secondary)" }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 4 }}><IcoCalendar size={12} /> {k.jam || "—"}</span>
                  <span style={{ display: "flex", alignItems: "center", gap: 4 }}><IcoMapPin size={12} /> {k.lokasi || "—"}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminModal>
  );
}

function KegiatanAdmin({ role }: { role: AdminRole }) {
  const { user } = useAuth();
  const [, setUserWilayahNama] = useState(role === "admin_kelompok" ? "" : role === "admin_desa" ? "" : "Cengkareng");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [waktuFilter, setWaktuFilter] = useState("semua");
  const [wilayahFilter, setWilayahFilter] = useState("semua");
  const [kategoriFilter, setKategoriFilter] = useState<Kategori | "semua">("semua");
  const [q, setQ] = useState("");
  const [kategori, setKategori] = useState<Kategori>("sambung_rutin");
  const [tingkat, setTingkat] = useState<Tingkat>(role === "admin_kelompok" ? "kelompok" : role === "admin_desa" ? "desa" : "daerah");
  const [namaWilayah, setNamaWilayah] = useState(role === "admin_kelompok" ? "" : role === "admin_desa" ? "" : "Cengkareng");
  const lockWilayah = role === "admin_kelompok" || role === "admin_desa";

  useEffect(() => {
    if (role === "admin_daerah") return;
    const fetchNama = async () => {
      try {
        if (role === "admin_desa" && user?.desaId) {
          const rows = await apiFetch<{ id: number; nama: string }[]>("/api/admin/desa");
          const hit = rows.find((d) => d.id === user.desaId);
          if (hit) { setUserWilayahNama(hit.nama); setNamaWilayah(hit.nama); }
        } else if (role === "admin_kelompok" && user?.kelompokId) {
          const rows = await apiFetch<{ id: number; nama: string }[]>("/api/admin/kelompok");
          const hit = rows.find((k) => k.id === user.kelompokId);
          if (hit) { setUserWilayahNama(hit.nama); setNamaWilayah(hit.nama); }
        }
      } catch {}
    };
    void fetchNama();
  }, [role, user?.desaId, user?.kelompokId]);
  const [showForm, setShowForm] = useState(false);
  const [showFilter, setShowFilter] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [list, setList] = useState<Kegiatan[]>([]);
  const [loadingKegiatan, setLoadingKegiatan] = useState(false);
  const [kegiatanErr, setKegiatanErr] = useState<string | null>(null);
  const [radiusM, setRadiusM] = useState("100");
  const [gpsLat, setGpsLat] = useState("");
  const [gpsLng, setGpsLng] = useState("");
  const [showMap, setShowMap] = useState(false);
  const [editingKegiatan, setEditingKegiatan] = useState<Kegiatan | null>(null);
  const [absensiKegiatan, setAbsensiKegiatan] = useState<Kegiatan | null>(null);
  const [deletingKegiatan, setDeletingKegiatan] = useState<Kegiatan | null>(null);
  const [detailKegiatan, setDetailKegiatan] = useState<Kegiatan | null>(null);
  const [rejectingPeserta, setRejectingPeserta] = useState<{ kegiatanId: string; pesertaId: string } | null>(null);
  const [pesertaDetailKegiatan, setPesertaDetailKegiatan] = useState<Kegiatan | null>(null);
  const [savingKegiatan, setSavingKegiatan] = useState(false);
  const [targetedPeserta, setTargetedPeserta] = useState(false);
  const [pesertaDesaIds, setPesertaDesaIds] = useState<number[]>([]);
  const [pesertaKelompokIds, setPesertaKelompokIds] = useState<number[]>([]);
  const [pesertaGenerusIds, setPesertaGenerusIds] = useState<string[]>([]);
  const [pesertaFilters, setPesertaFilters] = useState<{ pendidikan?: string; kategori?: string; jenisKelamin?: string; usiaMin?: number; usiaMax?: number }>({});
  const [desaList, setDesaList] = useState<{ id: number; nama: string }[]>([]);
  const [kelompokList, setKelompokList] = useState<{ id: number; nama: string; desaId: number }[]>([]);
  const [generusList, setGenerusList] = useState<{ id: string; nama: string; kelompokId?: number | null }[]>([]);

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
        lat?: number | null; lng?: number | null; radiusM?: number | null; gpsRequired?: number | null;
        desaId?: number | null; kelompokId?: number | null; createdBy?: string | null;
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
          deskripsi: k.deskripsi ?? undefined,
          kategori: ka,
          kategoriCustom: k.kategoriCustom ?? undefined,
          tingkat: tk,
          desa: k.desaNama ?? undefined,
          kelompok: k.kelompokNama ?? undefined,
          desaId: k.desaId ?? null,
          kelompokId: k.kelompokId ?? null,
          tanggal: k.tanggal,
          jam: (k.jam as string) ?? "",
          lokasi: (k.lokasi as string) ?? "",
          lat: k.lat ?? null,
          lng: k.lng ?? null,
          radiusM: (k.radiusM as number) ?? 100,
          gpsRequired: k.gpsRequired ?? 0,
          createdBy: k.createdBy ?? undefined,
          pesertaCount: (k as any).pesertaCount ?? 0,
          pendingPesertaCount: (k as any).pendingPesertaCount ?? 0,
          pesertaStatus: (k as any).pesertaStatus ?? null,
          myPesertaId: (k as any).myPesertaId ?? null,
          pesertaCatatan: (k as any).pesertaCatatan ?? null,
          pesertaEntries: (k as any).pesertaEntries ?? [],
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

  // Load existing peserta when editing a kegiatan
  useEffect(() => {
    if (!editingKegiatan) return;
    apiFetch<{ id: string; desaId?: number | null; kelompokId?: number | null; generusId?: string | null }[]>(`/api/kegiatan/${editingKegiatan.id}/peserta-entries`)
      .then((entries) => {
        if (!entries || entries.length === 0) { setTargetedPeserta(false); return; }
        setTargetedPeserta(true);
        setPesertaDesaIds(entries.filter((e) => e.desaId && !e.kelompokId && !e.generusId).map((e) => e.desaId!));
        setPesertaKelompokIds(entries.filter((e) => e.kelompokId).map((e) => e.kelompokId!));
        setPesertaGenerusIds(entries.filter((e) => e.generusId).map((e) => e.generusId!));
      })
      .catch(() => {});
  }, [editingKegiatan?.id]);

  useEffect(() => {
    if (!showForm) return;
    void apiFetch<{ id: number; nama: string }[]>("/api/admin/desa").then((r) => { if (Array.isArray(r)) setDesaList(r); }).catch(() => {});
    void apiFetch<{ id: number; nama: string; desaId: number }[]>("/api/admin/kelompok").then((r) => { if (Array.isArray(r)) setKelompokList(r); }).catch(() => {});
    void apiFetch<unknown>("/api/generus?limit=9999").then((raw) => {
      const u = unwrapList<{ id: string; nama: string; kelompokId?: number | null; desaNama?: string | null; kelompokNama?: string | null }>(raw);
      const arr = Array.isArray(raw) ? (raw as typeof u.data) : u.data;
      setGenerusList(arr as { id: string; nama: string; kelompokId?: number | null; desaNama?: string | null; kelompokNama?: string | null }[]);
    }).catch(() => {});
  }, [showForm]);

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
      <PageHeader title="Kegiatan" sub={`Kelola agenda dan kegiatan${kegiatanErr ? ` · ${kegiatanErr.slice(0, 80)}` : loadingKegiatan ? " · memuat…" : ""}`} action={<button className="btn btn-primary btn-auto" onClick={() => { setEditingKegiatan(null); setTingkat(role === "admin_kelompok" ? "kelompok" : role === "admin_desa" ? "desa" : "daerah"); setNamaWilayah(role === "admin_kelompok" ? "" : role === "admin_desa" ? "" : "Cengkareng"); setTargetedPeserta(false); setPesertaDesaIds([]); setPesertaKelompokIds([]); setPesertaGenerusIds([]); setPesertaFilters({}); setShowForm(true); }}>+ Buat Kegiatan</button>} />
      {kegiatanErr && <div className="card" style={{ borderColor: "#fecaca", background: "#fef2f2", color: "#991b1b", display: "flex", gap: 8, alignItems: "center", marginBottom: 12 }}><span style={{ fontSize: 13, fontWeight: 700 }}>{kegiatanErr}</span><button type="button" className="btn btn-ghost btn-sm" style={{ marginLeft: "auto" }} onClick={() => void loadKegiatan()}>Retry</button></div>}
      <div className="admin-toolbar" style={{ marginBottom: 16 }}>
        <SearchInput value={q} onChange={setQ} placeholder="Cari judul / lokasi..." />
        <div style={{ display: "flex", gap: 6 }}>
          <button className="btn btn-ghost btn-sm btn-auto" onClick={() => setShowCalendar(true)} title="Kalender Kegiatan">
            <IcoCalendar size={14} /> Kalender
          </button>
          <button className={`btn ${showFilter ? "btn-primary" : "btn-ghost"} btn-sm btn-auto`} aria-expanded={showFilter} aria-haspopup="dialog" onClick={() => setShowFilter((s) => !s)}>
            Filter {adaFilterAktif && <span className="filter-count">{(dateFrom ? 1 : 0) + (dateTo ? 1 : 0) + (waktuFilter !== "semua" ? 1 : 0) + (wilayahFilter !== "semua" ? 1 : 0) + (kategoriFilter !== "semua" ? 1 : 0)}</span>}
          </button>
        </div>
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
              <span className={`pill ${k.kategori === "sambung_rutin" ? "pill-emerald" : k.kategori === "keakraban" ? "pill-amber" : k.kategori === "pemantapan" ? "pill-slate" : "pill-slate"}`}>{k.kategori === "sambung_rutin" ? "Sambung Rutin" : k.kategori.charAt(0).toUpperCase() + k.kategori.slice(1)}</span>
              <span className="pill pill-slate" style={{ fontSize: 11 }}>{k.tingkat === "daerah" ? "Daerah" : k.tingkat === "desa" ? `Desa${k.desa ? ` • ${k.desa}` : ""}` : `Kelompok${k.kelompok ? ` • ${k.kelompok}` : ""}`}</span>
              {(k.pesertaCount ?? 0) > 0 && <span className="pill pill-amber" style={{ fontSize: 11 }}><IcoUsers size={10} /> {k.pesertaCount} wajib</span>}
              {(k.pendingPesertaCount ?? 0) > 0 && <span className="pill pill-amber" style={{ fontSize: 11, background: "#fef3c7", color: "#92400e" }}>⏳ {k.pendingPesertaCount} pending</span>}
              {(k.pesertaEntries?.some((e) => e.status === "rejected") ?? false) && (
                <span className="pill" style={{ fontSize: 11, background: "#fef2f2", color: "#991b1b", cursor: "pointer" }} onClick={() => setPesertaDetailKegiatan(k)}>
                  ✗ {k.pesertaEntries!.filter((e) => e.status === "rejected").length} ditolak
                </span>
              )}
            </div>
            <div className="kegiatan-card-body">
              <div className="kegiatan-title">{k.judul}</div>
              {k.kategoriCustom && <div className="kegiatan-desc">{k.kategoriCustom}</div>}
            </div>
            <div className="kegiatan-meta">
              <div className="kegiatan-meta-row">
                <IcoCalendar size={13} />
                <span className="kegiatan-meta-value">{k.tanggal}{k.jam ? ` • ${k.jam}` : ""}</span>
              </div>
              <div className="kegiatan-meta-row">
                <IcoMapPin size={13} />
                <span className="kegiatan-meta-value">{k.lokasi || "—"}</span>
              </div>
            </div>
            {k.pesertaStatus === "pending" && k.myPesertaId && (
              <div style={{ display: "flex", gap: 6, padding: "8px 14px", background: "#fffbeb", borderTop: "1px solid #fde68a" }}>
                <span style={{ fontSize: 12, color: "#92400e", flex: 1, display: "flex", alignItems: "center", gap: 4 }}>Undangan menunggu persetujuan</span>
                <button className="btn btn-primary btn-sm" style={{ fontSize: 11, padding: "4px 10px" }} onClick={async () => { try { await apiFetch(`/api/kegiatan/${k.id}/peserta/${k.myPesertaId}/approve`, { method: "PUT" }); void loadKegiatan(); } catch {} }}>Terima</button>
                <button className="btn btn-ghost btn-sm" style={{ fontSize: 11, padding: "4px 10px" }} onClick={() => setRejectingPeserta({ kegiatanId: k.id, pesertaId: k.myPesertaId! })}>Tolak</button>
              </div>
            )}
            {k.pesertaStatus === "rejected" && (
              <div style={{ padding: "8px 14px", background: "#fef2f2", borderTop: "1px solid #fecaca" }}>
                <div style={{ fontSize: 12, color: "#991b1b", fontWeight: 600 }}>Undangan ditolak</div>
                {k.pesertaCatatan && <div style={{ fontSize: 12, color: "#7f1d1d", marginTop: 2 }}>Alasan: {k.pesertaCatatan}</div>}
              </div>
            )}
            <div className="kegiatan-card-actions">
              <button className="btn btn-ghost row-icon-btn" aria-label="Lihat detail" title="Detail" onClick={() => setDetailKegiatan(k)}>
                <IcoEye size={15} />
              </button>
              <button className="btn btn-ghost row-icon-btn" aria-label="Lihat Absensi" title="Lihat Absensi" onClick={() => setAbsensiKegiatan(k)}>
                <IcoUsers size={15} />
              </button>
              {(role === "admin_daerah" || (role === "admin_desa" && (k.desaId === user?.desaId || k.tingkat === "daerah")) || (role === "admin_kelompok" && (k.kelompokId === user?.kelompokId || k.tingkat === "daerah"))) && (
                <>
                  <button className="btn btn-ghost row-icon-btn" aria-label="Edit" title="Edit" onClick={() => { setEditingKegiatan(k); setShowForm(true); }}>
                    <IcoEdit size={15} />
                  </button>
                  <button className="btn btn-danger row-icon-btn" aria-label="Hapus" title="Hapus" onClick={() => setDeletingKegiatan(k)}>
                    <IcoTrash size={16} />
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
        {filtered.length === 0 && <div className="lp-empty-card">Tidak ada kegiatan yang cocok.</div>}
      </div>

      {showCalendar && <KegiatanCalendarModal list={list} onClose={() => setShowCalendar(false)} />}

      {showForm && (
        <AdminModal title={editingKegiatan ? "Edit Kegiatan" : "Buat Kegiatan"} onClose={() => { setShowForm(false); setEditingKegiatan(null); }} className="modal--kegiatan">
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
              {tingkat !== "daerah" && !lockWilayah && (
                <div className="field"><label>Nama Wilayah</label><input value={namaWilayah} onChange={(e) => setNamaWilayah(e.target.value)} /></div>
              )}
              <div className="field"><label>Judul {kategori === "sambung_rutin" && "(auto template, bisa edit)"}</label>
                <input key={editingKegiatan ? editingKegiatan.id : tpl} defaultValue={editingKegiatan?.judul ?? tpl} placeholder={kategori === "sambung_rutin" ? tpl : "Judul bebas"} id="judul" />
                {kategori === "sambung_rutin" && !editingKegiatan && <span className="muted">Template: {tpl}</span>}
              </div>
              <div className="field"><label>Deskripsi</label><textarea rows={2} placeholder="Detail acara..." id="deskripsi" defaultValue={editingKegiatan?.deskripsi ?? ""} /></div>
              <div className="kegiatan-form-grid-3">
                <div className="field"><label>Tanggal</label><input type="date" id="tanggal" defaultValue={editingKegiatan?.tanggal ?? new Date().toISOString().slice(0, 10)} /></div>
                <div className="field"><label>Jam</label><input type="time" id="jam" defaultValue={editingKegiatan?.jam ?? ""} /></div>
              </div>
              <div className="field"><label>Lokasi</label><textarea id="lokasi" rows={2} placeholder="Masjid / Aula" defaultValue={editingKegiatan?.lokasi ?? ""} /></div>
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
              <div className="field">
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                  <div>
                    <label style={{ marginBottom: 0 }}>Peserta Wajib</label>
                    <div className="muted" style={{ fontSize: 12 }}>{targetedPeserta ? "Pilih siapa yang wajib hadir" : "Semua anggota di tingkat ini wajib hadir"}</div>
                  </div>
                  <label style={{ position: "relative", display: "inline-block", width: 44, height: 24, cursor: "pointer" }}>
                    <input type="checkbox" checked={targetedPeserta} onChange={() => {
                      if (targetedPeserta) { setPesertaDesaIds([]); setPesertaKelompokIds([]); setPesertaGenerusIds([]); setPesertaFilters({}); }
                      setTargetedPeserta((v) => !v);
                    }} style={{ opacity: 0, width: 0, height: 0 }} />
                    <span style={{ position: "absolute", inset: 0, background: targetedPeserta ? "var(--primary)" : "#cbd5e1", borderRadius: 12, transition: "background 0.2s" }} />
                    <span style={{ position: "absolute", top: 2, left: targetedPeserta ? 22 : 2, width: 20, height: 20, background: "#fff", borderRadius: "50%", transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }} />
                  </label>
                </div>
                {targetedPeserta && (
                  <>
                    <div style={{ display: "grid", gap: 8, marginBottom: 10, padding: 10, border: "1px solid var(--line)", borderRadius: 10, background: "#fff" }}>
                      {([
                        { key: "pendidikan" as const, label: "Tingkat Pendidikan", items: [
                          { label: "SD", value: "SD" }, { label: "SMP", value: "SMP" }, { label: "SMA", value: "SMA" },
                          { label: "Kuliah", value: "Sedang menempuh perguruan tinggi" }, { label: "Sarjana", value: "Sarjana" },
                        ]},
                        { key: "kategori" as const, label: "Kategori", items: [
                          { label: "Pribumi", value: "pribumi" }, { label: "Perantauan", value: "perantauan" },
                        ]},
                        { key: "jenisKelamin" as const, label: "Jenis Kelamin", items: [
                          { label: "Laki-laki", value: "L" }, { label: "Perempuan", value: "P" },
                        ]},
                      ]).map((group) => (
                        <div key={group.key}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-secondary)", marginBottom: 4 }}>{group.label}</div>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                            {group.items.map((f) => {
                              const isActive = pesertaFilters[group.key] === f.value;
                              return (
                                <button key={f.label} type="button" className={`chip ${isActive ? "active" : ""}`}
                                  style={{ fontSize: 12, padding: "4px 10px" }}
                                  onClick={() => setPesertaFilters((prev) => ({ ...prev, [group.key]: isActive ? undefined : f.value }))}>
                                  {f.label}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-secondary)", marginBottom: 4 }}>Usia (tahun)</div>
                        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                          <input type="number" min={0} max={100} placeholder="Min" value={pesertaFilters.usiaMin ?? ""}
                            onChange={(e) => setPesertaFilters((prev) => ({ ...prev, usiaMin: e.target.value ? Number(e.target.value) : undefined }))}
                            style={{ width: 70, padding: "4px 8px", fontSize: 12, border: "1px solid var(--line)", borderRadius: 6, outline: "none", textAlign: "center" }} />
                          <span className="muted" style={{ fontSize: 12 }}>–</span>
                          <input type="number" min={0} max={100} placeholder="Max" value={pesertaFilters.usiaMax ?? ""}
                            onChange={(e) => setPesertaFilters((prev) => ({ ...prev, usiaMax: e.target.value ? Number(e.target.value) : undefined }))}
                            style={{ width: 70, padding: "4px 8px", fontSize: 12, border: "1px solid var(--line)", borderRadius: 6, outline: "none", textAlign: "center" }} />
                        </div>
                      </div>
                    </div>
                    {desaList.length > 0 && (
                      <div style={{ marginBottom: 8 }}>
                        <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 4 }}>Per Desa</div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                          {desaList.map((d) => (
                            <button key={d.id} type="button" className={`chip ${pesertaDesaIds.includes(d.id) ? "active" : ""}`}
                              onClick={() => {
                                const scrollEl = document.querySelector(".modal");
                                const scrollTop = scrollEl?.scrollTop ?? 0;
                                setPesertaDesaIds((prev) => prev.includes(d.id) ? prev.filter((x) => x !== d.id) : [...prev, d.id]);
                                requestAnimationFrame(() => { if (scrollEl) scrollEl.scrollTop = scrollTop; });
                              }}>
                              {d.nama}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    {kelompokList.length > 0 && (
                      <PesertaKelompokPicker
                        kelompokList={kelompokList}
                        selectedIds={pesertaKelompokIds}
                        onChange={setPesertaKelompokIds}
                        desaList={desaList}
                      />
                    )}
                    {generusList.length > 0 && (
                      <PesertaAnggotaPicker
                        generusList={generusList}
                        selectedIds={pesertaGenerusIds}
                        onChange={setPesertaGenerusIds}
                        role={role}
                        userKelompokId={user?.kelompokId}
                        desaList={desaList}
                        kelompokList={kelompokList}
                      />
                    )}
                    {(pesertaDesaIds.length + pesertaKelompokIds.length + pesertaGenerusIds.length) > 0 && (
                      <div className="pill pill-emerald" style={{ marginTop: 8 }}>{pesertaDesaIds.length} desa, {pesertaKelompokIds.length} kelompok, {pesertaGenerusIds.length} anggota dipilih</div>
                    )}
                  </>
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
                    const isEdit = !!editingKegiatan;
                    const url = isEdit ? `/api/kegiatan/${editingKegiatan!.id}` : "/api/kegiatan";
                    const method = isEdit ? "PUT" : "POST";
                    const peserta = targetedPeserta ? [
                      ...pesertaDesaIds.map((dId) => ({ desaId: dId })),
                      ...pesertaKelompokIds.map((kId) => ({ kelompokId: kId })),
                      ...pesertaGenerusIds.map((gId) => ({ generusId: gId })),
                    ] : [];
                    const pesertaFilterPayload = targetedPeserta && Object.values(pesertaFilters).some(Boolean) ? pesertaFilters : undefined;
                    await apiFetch<{ success?: boolean; id?: string }>(url, {
                      method,
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
                        peserta: peserta.length > 0 ? peserta : undefined,
                        pesertaFilters: pesertaFilterPayload,
                      }),
                    });
                    setGpsLat(""); setGpsLng(""); setShowForm(false); setEditingKegiatan(null);
                    setTargetedPeserta(false); setPesertaDesaIds([]); setPesertaKelompokIds([]); setPesertaGenerusIds([]); setPesertaFilters({});
                    void loadKegiatan();
                  } catch (e: unknown) {
                    setKegiatanErr(e instanceof Error ? e.message : String(e));
                  } finally {
                    setSavingKegiatan(false);
                  }
                }}
              >
                {savingKegiatan ? "Menyimpan…" : editingKegiatan ? "Simpan Perubahan" : "Simpan Kegiatan"}
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

      {absensiKegiatan && (
        <AbsensiViewerModal kegiatan={absensiKegiatan} onClose={() => setAbsensiKegiatan(null)} />
      )}

      {deletingKegiatan && (
        <DeleteKegiatanModal kegiatan={deletingKegiatan} onClose={() => setDeletingKegiatan(null)} onDeleted={() => { setDeletingKegiatan(null); void loadKegiatan(); }} />
      )}

      {rejectingPeserta && (
        <RejectPesertaModal
          kegiatanId={rejectingPeserta.kegiatanId}
          pesertaId={rejectingPeserta.pesertaId}
          onClose={() => setRejectingPeserta(null)}
          onRejected={() => { setRejectingPeserta(null); void loadKegiatan(); }}
        />
      )}

      {pesertaDetailKegiatan && (
        <AdminModal title="Status Undangan" onClose={() => setPesertaDetailKegiatan(null)}>
          <div style={{ display: "grid", gap: 10 }}>
            {pesertaDetailKegiatan.pesertaEntries?.map((e) => (
              <div key={e.id} style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid #e5e7eb", display: "flex", alignItems: "center", gap: 10 }}>
                <span className={`pill ${e.status === "approved" ? "pill-emerald" : e.status === "rejected" ? "" : "pill-amber"}`} style={e.status === "rejected" ? { background: "#fef2f2", color: "#991b1b" } : { fontSize: 11 }}>
                  {e.status === "approved" ? "Diterima" : e.status === "rejected" ? "Ditolak" : "Menunggu"}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{e.desaNama ? `Desa ${e.desaNama}` : ""}{e.kelompokNama ? ` • ${e.kelompokNama}` : ""}</div>
                  {e.catatan && <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>Alasan: {e.catatan}</div>}
                </div>
              </div>
            ))}
          </div>
        </AdminModal>
      )}

      {detailKegiatan && (
        <AdminModal title="Detail Kegiatan" onClose={() => setDetailKegiatan(null)}>
          <div style={{ display: "grid", gap: 14 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>Judul</div>
              <div style={{ fontSize: 15, fontWeight: 600 }}>{detailKegiatan.judul}</div>
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <span className={`pill ${detailKegiatan.kategori === "sambung_rutin" ? "pill-emerald" : "pill-amber"}`}>{detailKegiatan.kategori === "sambung_rutin" ? "Sambung Rutin" : detailKegiatan.kategoriCustom || detailKegiatan.kategori}</span>
              <span className="pill pill-slate">{detailKegiatan.tingkat === "daerah" ? "Daerah" : detailKegiatan.tingkat === "desa" ? `Desa • ${detailKegiatan.desa || "—"}` : `Kelompok • ${detailKegiatan.kelompok || "—"}`}</span>
              {(detailKegiatan.pesertaCount ?? 0) > 0 && <span className="pill pill-amber"><IcoUsers size={10} /> {detailKegiatan.pesertaCount} wajib</span>}
            </div>
            {detailKegiatan.deskripsi && (
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>Deskripsi</div>
                <div style={{ fontSize: 13, lineHeight: 1.6, color: "#374151", whiteSpace: "pre-wrap" }}>{detailKegiatan.deskripsi}</div>
              </div>
            )}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>Tanggal</div>
                <div style={{ fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}><IcoCalendar size={13} /> {detailKegiatan.tanggal}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>Jam</div>
                <div style={{ fontSize: 13 }}>{detailKegiatan.jam || "—"}</div>
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>Lokasi</div>
              <div style={{ fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}><IcoMapPin size={13} /> {detailKegiatan.lokasi || "—"}</div>
            </div>
            {detailKegiatan.lat && detailKegiatan.lng && (
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>Lokasi di Peta</div>
                <div style={{ borderRadius: 12, overflow: "hidden", border: "1px solid #e5e7eb" }}>
                  <iframe
                    title="Peta Lokasi"
                    width="100%"
                    height="220"
                    style={{ border: 0 }}
                    loading="lazy"
                    src={`https://www.openstreetmap.org/export/embed.html?bbox=${detailKegiatan.lng - 0.008}%2C${detailKegiatan.lat - 0.005}%2C${detailKegiatan.lng + 0.008}%2C${detailKegiatan.lat + 0.005}&layer=mapnik&marker=${detailKegiatan.lat}%2C${detailKegiatan.lng}`}
                  />
                </div>
                <a
                  href={`https://www.openstreetmap.org/?mlat=${detailKegiatan.lat}&mlon=${detailKegiatan.lng}#map=16/${detailKegiatan.lat}/${detailKegiatan.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ fontSize: 12, color: "var(--primary-dark, #65a30d)", display: "inline-flex", alignItems: "center", gap: 4, marginTop: 6 }}
                >Buka di OpenStreetMap →</a>
              </div>
            )}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>Radius</div>
                <div style={{ fontSize: 13 }}>{detailKegiatan.radiusM}m</div>
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>GPS Wajib</div>
                <div style={{ fontSize: 13 }}>{detailKegiatan.gpsRequired ? "Ya" : "Tidak"}</div>
              </div>
            </div>
          </div>
        </AdminModal>
      )}
    </div>
  );
}

function RejectPesertaModal({
  kegiatanId,
  pesertaId,
  onClose,
  onRejected,
}: {
  kegiatanId: string;
  pesertaId: string;
  onClose: () => void;
  onRejected: () => void;
}) {
  const [catatan, setCatatan] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function handleReject() {
    setBusy(true);
    setErr(null);
    try {
      await apiFetch(`/api/kegiatan/${kegiatanId}/peserta/${pesertaId}/reject`, {
        method: "PUT",
        body: JSON.stringify({ catatan: catatan.trim() || null }),
      });
      onRejected();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AdminModal title="Tolak Undangan" onClose={onClose}>
      <div style={{ display: "grid", gap: 14 }}>
        <div style={{ fontSize: 13, lineHeight: 1.5, color: "#374151" }}>
          Berikan alasan penolakan (opsional).
        </div>
        <div className="field">
          <label>Alasan Penolakan</label>
          <textarea
            rows={3}
            value={catatan}
            onChange={(e) => setCatatan(e.target.value)}
            placeholder="Contoh: Jaduran bentrok dengan kegiatan lain"
            disabled={busy}
          />
        </div>
        {err && (
          <div style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid #fecaca", background: "#fef2f2", color: "#991b1b", fontSize: 13 }}>
            {err}
          </div>
        )}
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-ghost" style={{ flex: 1 }} disabled={busy} onClick={onClose}>Batal</button>
          <button className="btn btn-danger" style={{ flex: 1 }} disabled={busy} onClick={() => void handleReject()}>
            {busy ? "Menolak…" : "Tolak"}
          </button>
        </div>
      </div>
    </AdminModal>
  );
}

// UndanganMasukPage removed

function UsersManage({ role }: { role: AdminRole }) {
  const { user } = useAuth();
  const [users, setUsers] = useState<{ id: string; nama: string; role: AdminRole; wilayah: string; email: string; desaId?: number | null; kelompokId?: number | null; status: string }[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersErr, setUsersErr] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [editingUser, setEditingUser] = useState<{ id: string; nama: string; role: AdminRole; wilayah: string; email?: string; desaId?: number | null; kelompokId?: number | null } | null>(null);
  const [deletingUser, setDeletingUser] = useState<{ id: string; nama: string } | null>(null);
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
      const u = unwrapList<{ id: string; name: string; email: string; role: string; desaId?: number | null; kelompokId?: number | null; desaNama?: string | null; kelompokNama?: string | null }>(raw);
      const arr = Array.isArray(raw) ? (raw as typeof u.data) : u.data;
      const mapped = (arr as typeof u.data).map((r) => ({
        id: r.id,
        nama: r.name,
        email: r.email,
        role: r.role as AdminRole,
        wilayah: (r.kelompokNama ?? r.desaNama ?? "—") as string,
        desaId: r.desaId ?? null,
        kelompokId: r.kelompokId ?? null,
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

  const canManage = (targetRole: AdminRole, targetDesaId?: number | null, targetKelompokId?: number | null) => {
    if (role === "admin_daerah") return true;
    if (role === "admin_desa") {
      if (targetRole === "admin_desa" && targetDesaId === user?.desaId) return true;
      if (targetRole === "admin_kelompok" && targetDesaId === user?.desaId) return true;
      return false;
    }
    if (role === "admin_kelompok") {
      return targetRole === "admin_kelompok" && targetKelompokId === user?.kelompokId;
    }
    return false;
  };

  const filteredUsers = useMemo(() => {
    if (!q.trim()) return users;
    const s = q.toLowerCase();
    return users.filter((u) => u.nama.toLowerCase().includes(s) || u.wilayah.toLowerCase().includes(s) || u.role.toLowerCase().includes(s));
  }, [users, q]);

  const roleOptions: { value: AdminRole; label: string }[] = [
    ...(role === "admin_daerah" ? [
      { value: "admin_daerah" as AdminRole, label: "Admin Daerah" },
    ] : []),
    ...(role === "admin_daerah" || role === "admin_desa" ? [
      { value: "admin_desa" as AdminRole, label: "Admin Desa" },
    ] : []),
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

  const handleEdit = async (id: string, data: { name?: string; email?: string; password?: string; role?: AdminRole; desaId?: number | null; kelompokId?: number | null }) => {
    try {
      await apiFetch("/api/admin/users", { method: "PUT", body: JSON.stringify({ id, ...data }) });
      setEditingUser(null);
      void loadUsers();
    } catch (e: unknown) {
      setUsersErr(e instanceof Error ? e.message : String(e));
    }
  };

  const handleDelete = async () => {
    if (!deletingUser) return;
    try {
      await apiFetch(`/api/admin/users?id=${deletingUser.id}`, { method: "DELETE" });
      setDeletingUser(null);
      void loadUsers();
    } catch (e: unknown) {
      setUsersErr(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <div>
      <PageHeader title="Kelola User" sub={`Kelola akun admin di bawah kamu${usersErr ? ` · ${usersErr.slice(0, 80)}` : ""}`} action={<button className="btn btn-primary btn-auto" onClick={() => setShowAdd(true)}>+ Tambah Admin</button>} />
      {usersErr && <div className="card" style={{ borderColor: "#fecaca", background: "#fef2f2", color: "#991b1b", display: "flex", gap: 8, alignItems: "center", marginBottom: 12 }}><span style={{ fontSize: 13, fontWeight: 700 }}>{usersErr}</span><button type="button" className="btn btn-ghost btn-sm" style={{ marginLeft: "auto" }} onClick={() => setUsersErr(null)}>Tutup</button><button type="button" className="btn btn-ghost btn-sm" onClick={() => void loadUsers()}>Retry</button></div>}
      {usersLoading && <div className="muted" style={{ marginBottom: 8, fontSize: 12 }}>Memuat user…</div>}
      <div className="info-banner">
        <span className="info-banner-icon"><IcoShield size={18} /></span>
        <div className="info-banner-body">
          <strong className="info-banner-title">Kelola User di bawah kamu</strong>
          <p className="info-banner-desc">{role === "admin_daerah" ? "Kelola semua admin di wilayah kamu." : role === "admin_desa" ? "Kelola admin desa dan admin kelompok di desamu." : "Kelola admin kelompok di kelompokmu."}</p>
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
                <button className="btn btn-ghost row-icon-btn" aria-label="Edit" title="Edit" disabled={!canManage(u.role, u.desaId, u.kelompokId)} onClick={() => setEditingUser(u)}><IcoEdit size={16} /></button>
                <button className="btn btn-danger row-icon-btn" aria-label="Hapus" title="Hapus" disabled={!canManage(u.role, u.desaId, u.kelompokId)} onClick={() => setDeletingUser({ id: u.id, nama: u.nama })}><IcoTrash size={16} /></button>
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
                      <button className="btn btn-ghost row-icon-btn" aria-label="Edit" title="Edit" disabled={!canManage(u.role, u.desaId, u.kelompokId)} onClick={() => setEditingUser(u)}><IcoEdit size={16} /></button>
                      <button className="btn btn-danger row-icon-btn" aria-label="Hapus" title="Hapus" disabled={!canManage(u.role, u.desaId, u.kelompokId)} onClick={() => setDeletingUser({ id: u.id, nama: u.nama })}><IcoTrash size={16} /></button>
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
          callerRole={role}
          callerDesaId={user?.desaId}
          callerKelompokId={user?.kelompokId}
        />
      )}
      {editingUser && (
        <EditAdminModal
          user={editingUser}
          onClose={() => setEditingUser(null)}
          onSave={(data) => void handleEdit(editingUser.id, data)}
          roleOptions={roleOptions}
        />
      )}
      {deletingUser && (
        <DeleteUserConfirmModal
          nama={deletingUser.nama}
          onClose={() => setDeletingUser(null)}
          onConfirm={handleDelete}
        />
      )}
    </div>
  );
}

function DeleteUserConfirmModal({
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
  const confirmText = `Hapus ${nama}`;
  const isMatch = typed.trim() === confirmText;

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
    <AdminModal title={`Hapus ${nama}?`} onClose={onClose}>
      <div style={{ display: "grid", gap: 14 }}>
        <div style={{ padding: "12px 14px", borderRadius: 12, background: "#fffbeb", border: "1px solid #fde68a", color: "#78350f", fontSize: 13, lineHeight: 1.5 }}>
          <strong>{nama}</strong> akan dihapus permanen. Akun login dan data terkait akan terhapus.
        </div>
        <div style={{ fontSize: 13, lineHeight: 1.5 }}>
          Ketik <strong style={{ fontFamily: "monospace", background: "#f1f5f9", padding: "2px 6px", borderRadius: 6 }}>{confirmText}</strong> untuk melanjutkan.
        </div>
        <div className="field">
          <label>Konfirmasi *</label>
          <input value={typed} onChange={(e) => setTyped(e.target.value)} placeholder={confirmText} disabled={busy} autoComplete="off" autoFocus />
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
            {busy ? "Menghapus…" : confirmText}
          </button>
        </div>
      </div>
    </AdminModal>
  );
}

function EditAdminModal({
  user, onClose, onSave, roleOptions,
}: {
  user: { id: string; nama: string; role: AdminRole; email?: string; desaId?: number | null; kelompokId?: number | null };
  onClose: () => void;
  onSave: (data: { name?: string; email?: string; password?: string; role?: AdminRole; desaId?: number | null; kelompokId?: number | null }) => void;
  roleOptions: { value: AdminRole; label: string }[];
}) {
  const [nama, setNama] = useState(user.nama);
  const [roleBaru, setRoleBaru] = useState<AdminRole>(user.role);
  const [email, setEmail] = useState(user.email);
  const [password, setPassword] = useState("");
  const [desaList, setDesaList] = useState<{ id: number; nama: string }[]>([]);
  const [kelList, setKelList] = useState<{ id: number; nama: string; desaId: number }[]>([]);
  const [selectedDesaId, setSelectedDesaId] = useState<number | "">(user.desaId ?? "");
  const [selectedKelId, setSelectedKelId] = useState<number | "">(user.kelompokId ?? "");

  useEffect(() => {
    apiFetch("/api/admin/desa").then((r: any) => setDesaList(Array.isArray(r) ? r : [])).catch(() => {});
    apiFetch("/api/admin/kelompok").then((r: any) => setKelList(Array.isArray(r) ? r : [])).catch(() => {});
  }, []);

  const filteredKel = selectedDesaId ? kelList.filter((k) => k.desaId === Number(selectedDesaId)) : [];
  const needDesa = roleBaru === "admin_desa" || roleBaru === "admin_kelompok";
  const needKel = roleBaru === "admin_kelompok";
  const valid = nama.trim().length >= 3 && (email ?? "").trim().includes("@")
    && (password === "" || password.length >= 8)
    && (!needDesa || selectedDesaId !== "") && (!needKel || selectedKelId !== "");

  return (
    <AdminModal title="Edit Admin" onClose={onClose}>
      <div style={{ display: "grid", gap: 12 }}>
        <div className="field">
          <label>Nama *</label>
          <input value={nama} onChange={(e) => setNama(e.target.value)} placeholder="Nama admin" />
        </div>
        <div className="field">
          <label>Role *</label>
          <Select value={roleBaru} onChange={(v) => setRoleBaru(v as AdminRole)} ariaLabel="Role admin" options={roleOptions.map((o) => ({ value: o.value, label: o.label }))} />
        </div>
        {needDesa && (
          <div className="field">
            <label>Desa *</label>
            <Select value={selectedDesaId === "" ? "" : String(selectedDesaId)} onChange={(v) => { setSelectedDesaId(v ? Number(v) : ""); setSelectedKelId(""); }} ariaLabel="Pilih desa"
              options={[{ value: "", label: "-- Pilih Desa --" }, ...desaList.map((d) => ({ value: String(d.id), label: d.nama }))]} />
          </div>
        )}
        {needKel && selectedDesaId && (
          <div className="field">
            <label>Kelompok *</label>
            <Select value={selectedKelId === "" ? "" : String(selectedKelId)} onChange={(v) => setSelectedKelId(v ? Number(v) : "")} ariaLabel="Pilih kelompok"
              options={[{ value: "", label: "-- Pilih Kelompok --" }, ...filteredKel.map((k) => ({ value: String(k.id), label: k.nama }))]} />
          </div>
        )}
        <div className="field"><label>Email *</label><input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nama@email.com" /></div>
        <div className="field"><label>Password (kosongkan jika tidak ganti)</label><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min 8 karakter" /></div>
        <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
          <button className="btn btn-ghost" style={{ flex: 1 }} onClick={onClose}>Batal</button>
          <button className="btn btn-primary" style={{ flex: 1 }} disabled={!valid}
            onClick={() => onSave({
              name: nama.trim(),
              email: (email ?? "").trim().toLowerCase(),
              ...(password ? { password } : {}),
              role: roleBaru,
              desaId: needDesa ? (selectedDesaId ? Number(selectedDesaId) : null) : null,
              kelompokId: needKel ? (selectedKelId ? Number(selectedKelId) : null) : null,
            })}>
            Simpan Perubahan
          </button>
        </div>
      </div>
    </AdminModal>
  );
}

function AddAdminModal({
  onClose, onSave, roleOptions, callerRole, callerDesaId, callerKelompokId,
}: {
  onClose: () => void;
  onSave: (nama: string, role: AdminRole, wilayah: string, email?: string, password?: string, desaId?: number, kelompokId?: number) => void;
  roleOptions: { value: AdminRole; label: string }[];
  callerRole: AdminRole;
  callerDesaId?: number | null;
  callerKelompokId?: number | null;
}) {
  const [nama, setNama] = useState("");
  const [roleBaru, setRoleBaru] = useState<AdminRole>(roleOptions[0]?.value ?? "admin_kelompok");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [kelList, setKelList] = useState<{ id: number; nama: string; desaId: number }[]>([]);
  const [selectedKelId, setSelectedKelId] = useState<number | "">("");

  useEffect(() => {
    if (callerRole === "admin_desa" && roleBaru === "admin_kelompok") {
      apiFetch("/api/admin/kelompok").then((r: any) => setKelList(Array.isArray(r) ? r : [])).catch(() => {});
    }
  }, [callerRole, roleBaru]);

  useEffect(() => { setSelectedKelId(""); }, [roleBaru]);

  // Desa/kelompok is auto-assigned from caller context — no selector needed
  const autoDesa = callerRole === "admin_desa" || callerRole === "admin_kelompok";
  const needKelSelect = callerRole === "admin_desa" && roleBaru === "admin_kelompok";
  const filteredKel = callerDesaId ? kelList.filter((k) => k.desaId === Number(callerDesaId)) : kelList;
  const valid = nama.trim().length >= 3 && email.trim().includes("@") && password.length >= 8 && (!needKelSelect || selectedKelId !== "");

  function handleSave() {
    const desaId = autoDesa ? Number(callerDesaId) : undefined;
    const kelompokId = roleBaru === "admin_kelompok"
      ? (needKelSelect ? (selectedKelId ? Number(selectedKelId) : undefined) : Number(callerKelompokId))
      : undefined;
    onSave(nama.trim(), roleBaru, "", email.trim().toLowerCase(), password, desaId, kelompokId);
  }

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
        {needKelSelect && (
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
        <div className="field"><label>Email *</label><input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nama@email.com" autoComplete="off" /></div>
        <div className="field"><label>Password *</label><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min 8 karakter" autoComplete="new-password" /></div>
        <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
          <button className="btn btn-ghost" style={{ flex: 1 }} onClick={onClose}>Batal</button>
          <button
            className="btn btn-primary"
            style={{ flex: 1 }}
            disabled={!valid}
            onClick={handleSave}
          >
            Simpan Admin
          </button>
        </div>
      </div>
    </AdminModal>
  );
}

function WilayahPage({ role }: { role: AdminRole }) {
  const { user } = useAuth();
  const [desas, setDesas] = useState<DesaWilayah[]>([]);
  const [kelompoks, setKelompoks] = useState<KelompokWilayah[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [kelompokCounts, setKelompokCounts] = useState<Record<string, number>>({});
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
      if (statRaw && typeof statRaw === "object") {
        const member = (statRaw as { member?: { byDesa?: { name: string; value: number }[]; byKelompok?: { name: string; value: number }[] } }).member;
        if (member?.byDesa) {
          const m: Record<string, number> = {};
          for (const r of member.byDesa) m[r.name] = r.value;
          setCounts(m);
        }
        if (member?.byKelompok) {
          const k: Record<string, number> = {};
          for (const r of member.byKelompok) k[r.name] = r.value;
          setKelompokCounts(k);
        }
      }
      // Fallback: count members per kelompok directly from generus list
      try {
        const genRaw = await apiFetch<unknown>("/api/generus?limit=9999");
        const genU = unwrapList<{ kelompokNama?: string | null }>(genRaw);
        const genArr = Array.isArray(genRaw) ? (genRaw as typeof genU.data) : genU.data;
        const kCounts: Record<string, number> = {};
        for (const g of genArr) {
          const kn = g.kelompokNama;
          if (kn) kCounts[kn] = (kCounts[kn] ?? 0) + 1;
        }
        if (Object.keys(kCounts).length > 0) setKelompokCounts(kCounts);
        const dCounts: Record<string, number> = {};
        for (const g of genArr) {
          const dn = (g as any).desaNama;
          if (dn) dCounts[dn] = (dCounts[dn] ?? 0) + 1;
        }
        if (Object.keys(dCounts).length > 0) setCounts(dCounts);
      } catch {}
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (!msg.includes("401")) setWilayahErr(msg);
    } finally {
      setLoadingWilayah(false);
    }
  }

  useEffect(() => { void loadWilayah(); }, []);

  // Filter by role: admin_daerah sees all, admin_desa sees own desa, admin_kelompok sees own kelompok
  const userDesaId = user?.desaId != null ? String(user.desaId) : null;
  const userKelompokId = user?.kelompokId != null ? String(user.kelompokId) : null;
  const visibleDesas = role === "admin_daerah" ? desas
    : role === "admin_desa" && userDesaId ? desas.filter((d) => d.id === userDesaId)
    : role === "admin_kelompok" && userKelompokId ? desas.filter((d) => kelompoks.some((k) => k.id === userKelompokId && k.desaId === d.id))
    : desas;
  const visibleKelompoks = role === "admin_daerah" ? kelompoks
    : role === "admin_desa" && userDesaId ? kelompoks.filter((k) => k.desaId === userDesaId)
    : role === "admin_kelompok" && userKelompokId ? kelompoks.filter((k) => k.id === userKelompokId)
    : kelompoks;
  const canManageWilayah = role === "admin_daerah" || role === "admin_desa";

  const countDesa = visibleDesas.length;
  const countKelompok = visibleKelompoks.length;
  const countAnggota = Object.values(counts).reduce((a, b) => a + b, 0) || 0;

  const anggotaDesa = (nama: string) => counts[nama] ?? 0;
  const anggotaKelompok = (nama: string) => kelompokCounts[nama] ?? 0;

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
    if (!isSearching) return visibleDesas.map((d) => ({ desa: d, matchDesa: false as boolean, kelompokMatchIds: new Set<string>() as Set<string> }));
    return visibleDesas
      .map((d) => {
        const matchDesa = d.nama.toLowerCase().includes(lowerQ);
        const kms = visibleKelompoks.filter((k) => k.desaId === d.id);
        const matchedKel = kms.filter((k) => k.nama.toLowerCase().includes(lowerQ));
        const kelompokMatchIds = new Set(matchedKel.map((k) => k.id));
        const keep = matchDesa || matchedKel.length > 0;
        return { desa: d, matchDesa, kelompokMatchIds, keep, matchedKel, kms };
      })
      .filter((x: any) => x.keep)
      .map((x: any) => ({ desa: x.desa, matchDesa: x.matchDesa, kelompokMatchIds: x.kelompokMatchIds }));
  }, [visibleDesas, visibleKelompoks, lowerQ, isSearching]);

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
      <PageHeader title="Manajemen Wilayah" sub={role === "admin_daerah" ? "Kelola desa dan kelompok di bawah Daerah Cengkareng" : role === "admin_desa" ? "Kelola kelompok di desamu" : "Lihat wilayah kelompokmu"} action={canManageWilayah ? <button className="btn btn-primary btn-auto" onClick={() => setShowAddDesa(true)}>+ Tambah Desa</button> : undefined} />

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
        {!isSearching && visibleDesas.length > 0 && (() => {
          const allCollapsed = visibleDesas.length > 0 && visibleDesas.every((d) => collapsed.has(d.id));
          return (
            <button
              type="button"
              className="wilayah-collapse-toggle"
              aria-label={allCollapsed ? "Buka semua desa" : "Collapse semua desa"}
              aria-pressed={allCollapsed}
              title={allCollapsed ? "Buka semua" : "Collapse semua"}
              onClick={() => setCollapsed(allCollapsed ? new Set() : new Set(visibleDesas.map((d) => d.id)))}
            >
              {allCollapsed ? <IcoUnfold size={16} /> : <IcoFold size={16} />}
            </button>
          );
        })()}
      </div>

      <div style={{ display: "grid", gap: 16 }}>
        {filteredDesas.map(({ desa, matchDesa, kelompokMatchIds }) => {
          const allForDesa = visibleKelompoks.filter((k) => k.desaId === desa.id);
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
                  {canManageWilayah && <button className="btn btn-ghost row-icon-btn" aria-label="Tambah kelompok" title="Tambah kelompok" onClick={() => setShowAddKelompok(desa.id)}>
                    <span aria-hidden="true" style={{ fontSize: 20, fontWeight: 700, lineHeight: 1 }}>+</span>
                  </button>}
                    {canManageWilayah && <button className="btn btn-danger row-icon-btn" aria-label="Hapus desa" title="Hapus desa — harus kosong" onClick={() => setDeleteTarget({ kind: "desa", id: desa.id, nama: desa.nama, kelompokCount: allForDesa.length })}>
                    <IcoTrash size={16} />
                  </button>}
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
                            {canManageWilayah && <button className="btn btn-danger row-icon-btn" aria-label="Hapus kelompok" title="Hapus kelompok — harus kosong" onClick={() => setDeleteTarget({ kind: "kelompok", id: kel.id, nama: kel.nama })}>
                              <IcoTrash size={15} />
                            </button>}
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
import type { MemberPageKey } from "./features/member/MemberShell";
import MemberHomePage from "./features/member/MemberHomePage";
import MemberProfilePage from "./features/member/MemberProfilePage";
import MemberStatPage from "./features/member/MemberStatPage";
import { DEMO_KEGIATAN_MEMBER, type MemberIdentity, type MemberKehadiran, type MemberKegiatan } from "./features/member/types";

export default function App({ initialMode }: { initialMode?: "admin" | "member" } = {}) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const role: AdminRole = (user?.role as AdminRole | undefined) ?? "admin_kelompok";
  const [_mode, _setMode] = useState<"admin" | "member">(initialMode ?? "member");
  void _mode; void _setMode;
  const [page, setPage] = useState("anggota");
  const [memberPage, setMemberPage] = useState<MemberPageKey>("beranda");
  const [me, setMe] = useState<MemberIdentity | null>(null);
  const [stat, setStat] = useState<MemberKehadiran | null>(null);
  const [memberKegiatanList, setMemberKegiatanList] = useState<MemberKegiatan[]>([]);

  const isAdmin = ["admin_daerah", "admin_desa", "admin_kelompok"].includes(String(role));

  // Load real kegiatan data for member mode
  useEffect(() => {
    if (initialMode !== "member" && isAdmin) return;
    apiFetch<unknown>("/api/kegiatan")
      .then((raw) => {
        const u = unwrapList<any>(raw);
        const arr = Array.isArray(raw) ? (raw as any[]) : u.data;
        if (!Array.isArray(arr)) return;
        const mapped: MemberKegiatan[] = arr.map((k) => {
          const isKel = Boolean(k.kelompokNama || k.kelompokId);
          const isDesa = !isKel && Boolean(k.desaNama || k.desaId);
          const tk = isKel ? "kelompok" : isDesa ? "desa" : "daerah";
          return {
            id: String(k.id),
            judul: String(k.judul || ""),
            kategori: k.kategoriAcara ?? "sambung_rutin",
            tingkat: tk,
            tanggal: String(k.tanggal || ""),
            jam: String(k.jam || "00:00"),
            lokasi: String(k.lokasi || "—"),
            lat: k.lat != null ? Number(k.lat) : null,
            lng: k.lng != null ? Number(k.lng) : null,
            radiusM: Number(k.radiusM) || 100,
          };
        });
        setMemberKegiatanList(mapped);
      })
      .catch(() => {});
  }, [initialMode, isAdmin]);

  // Load real profile data for member mode
  useEffect(() => {
    if (initialMode !== "member" || !user) return;
    apiFetch<{ user: any; generus: any }>("/api/profile").then(({ user: authUser, generus }) => {
      if (!generus) return;
      const genDesaNama = generus.desaNama ?? "";
      const genKelompokNama = generus.kelompokNama ?? "";
      const mapped: MemberIdentity = {
        email: authUser?.email ?? "",
        id: generus.id,
        nama: generus.nama,
        desa: genDesaNama,
        kelompok: genKelompokNama,
        pendidikan: generus.pendidikan ?? "SMA",
        noTelp: generus.noTelp ?? "",
        kategoriMudaMudi: generus.kategoriMudaMudi ?? "pribumi",
        asalDaerah: generus.asalDaerah ?? null,
        domisiliAnak: generus.domisiliAnak ?? generus.alamat ?? "",
        domisiliOrtu: generus.domisiliOrtu ?? null,
        isOrtuSama: generus.isDomisiliOrtuSama == null ? true : Boolean(generus.isDomisiliOrtuSama),
        foto: generus.foto ?? null,
        avatarId: generus.avatarId ?? null,
        jenisKelamin: generus.jenisKelamin === "L" ? "cowok" : generus.jenisKelamin === "P" ? "cewek" : null,
        nomorUnik: generus.nomorUnik ?? "",
        status: "aktif",
        hobi: generus.hobi ?? null,
        hobiDetail: generus.hobiDetail ?? null,
        hobiUpdatedAt: generus.hobiUpdatedAt ?? null,
      };
      setMe(mapped);
      // Load stats
      apiFetch<{ stats?: any }>(`/api/generus/${generus.id}`).then((detail) => {
        if (!detail?.stats) return;
        const s = detail.stats;
        setStat({
          total: s.total ?? 0,
          hadir: s.hadir ?? 0,
          izin: s.izin ?? 0,
          alpha: s.alpha ?? 0,
          hadirRate: s.rate ?? 0,
          telat: s.telatCount ?? 0,
          rataRataTelatMenit: s.avgTelatMenit ?? 0,
          riwayatTelat: (s.riwayatTelat ?? []).map((r: any) => ({ tanggal: r.tanggal, judul: r.judul ?? "", menit: r.menit ?? 0 })),
          tren: [],
        });
      }).catch(() => {});
    }).catch(() => {});
  }, [initialMode, user]);

  // Persist profile changes to backend
  const handleProfileUpdate = async (m: MemberIdentity) => {
    setMe(m);
    if (m.id) {
      try {
        await apiFetch("/api/profile", {
          method: "PUT",
          body: JSON.stringify({
            hobi: m.hobi,
            hobiDetail: m.hobiDetail,
            foto: m.foto,
            avatarId: m.avatarId,
            jenisKelamin: m.jenisKelamin,
          }),
        });
      } catch (e) {
        console.error("Gagal update profil:", e);
      }
    }
  };

  if (initialMode === "member") {
    const fallbackMe: MemberIdentity = me ?? { id: "", nama: "Memuat…", desa: "", kelompok: "", pendidikan: "", pekerjaan: null, noTelp: "", kategoriMudaMudi: "pribumi", asalDaerah: null, domisiliAnak: "", domisiliOrtu: null, isOrtuSama: true, status: "aktif" };
    const fallbackStat: MemberKehadiran = stat ?? { total: 0, hadir: 0, izin: 0, alpha: 0, hadirRate: 0, tren: [] };
    const effectiveKegiatan = memberKegiatanList.length > 0 ? memberKegiatanList : DEMO_KEGIATAN_MEMBER;
    return (
      <MemberShell
        page={memberPage}
        setPage={setMemberPage}
        me={fallbackMe}
        onExit={async () => { await logout(); navigate("/login", { replace: true }); }}
        onLogout={async () => { await logout(); navigate("/login", { replace: true }); }}
      >
        {memberPage === "beranda" && <MemberHomePage me={fallbackMe} kegiatanList={memberKegiatanList} />}
        {memberPage === "profil" && <MemberProfilePage me={fallbackMe} stat={fallbackStat} kegiatan={effectiveKegiatan} onUpdate={handleProfileUpdate} />}
        {memberPage === "statistik" && <MemberStatPage me={fallbackMe} stat={fallbackStat} />}
      </MemberShell>
    );
  }

  if (!isAdmin) {
    const fallbackMe: MemberIdentity = me ?? { id: "", nama: "Memuat…", desa: "", kelompok: "", pendidikan: "", pekerjaan: null, noTelp: "", kategoriMudaMudi: "pribumi", asalDaerah: null, domisiliAnak: "", domisiliOrtu: null, isOrtuSama: true, status: "aktif" };
    const fallbackStat: MemberKehadiran = stat ?? { total: 0, hadir: 0, izin: 0, alpha: 0, hadirRate: 0, tren: [] };
    const effectiveKegiatan = memberKegiatanList.length > 0 ? memberKegiatanList : DEMO_KEGIATAN_MEMBER;
    return (
      <MemberShell
        page={memberPage}
        setPage={setMemberPage}
        me={fallbackMe}
        onExit={async () => { await logout(); navigate("/login", { replace: true }); }}
        onLogout={async () => { await logout(); navigate("/login", { replace: true }); }}
      >
        {memberPage === "beranda" && <MemberHomePage me={fallbackMe} kegiatanList={memberKegiatanList} />}
        {memberPage === "profil" && <MemberProfilePage me={fallbackMe} stat={fallbackStat} kegiatan={effectiveKegiatan} onUpdate={handleProfileUpdate} />}
        {memberPage === "statistik" && <MemberStatPage me={fallbackMe} stat={fallbackStat} />}
      </MemberShell>
    );
  }

  const effectivePage = page === "pengurus" ? "cms" : page;
  return (
    <>
      <AdminShell page={effectivePage} setPage={setPage} role={role}>
        {effectivePage === "anggota" && <AnggotaPage role={role} />}
        {effectivePage === "kegiatan" && <KegiatanAdmin role={role} />}
        {effectivePage === "pengajuan" && <ProfileRequestsPage />}
        {effectivePage === "users" && <UsersManage role={role} />}
        {effectivePage === "wilayah" && <WilayahPage role={role} />}
        {effectivePage === "cms" && <CmsPage role={role} />}
        {effectivePage === "statistik" && <StatistikPage role={role} />}
      </AdminShell>
    </>
  );
}
