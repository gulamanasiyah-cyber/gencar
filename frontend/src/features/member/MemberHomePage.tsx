import { useEffect, useMemo, useRef, useState } from "react";
import { Clock3, QrCode, LocateFixed, ChevronLeft, ChevronRight, CalendarDays, MapPin, X as IcoX, ShieldCheck, AlertTriangle } from "lucide-react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Html5Qrcode } from "html5-qrcode";
import { haversineM } from "shared/validation";
import { apiFetch } from "../../lib/api";
import { DEMO_KEGIATAN_MEMBER, type MemberIdentity, type MemberKegiatan } from "./types";

// Fix default marker icons for Vite bundling
import iconRetinaUrl from "leaflet/dist/images/marker-icon-2x.png";
import iconUrl from "leaflet/dist/images/marker-icon.png";
import shadowUrl from "leaflet/dist/images/marker-shadow.png";
// @ts-ignore
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({ iconRetinaUrl, iconUrl, shadowUrl });

type AbsenRow = { id: string; tanggal: string; judul: string; status: "hadir" | "izin" | "alpha"; jam: string };
type GpsState = { lat: number; lng: number; acc: number | null } | null;
type QrHit = { level: string; nama: string } | null;
type ConflictKegiatan = {
  id: string;
  judul: string;
  tanggal: string;
  tanggalSelesai?: string | null;
  jam?: string | null;
  jamMulai?: string | null;
  jamSelesai?: string | null;
  lokasi?: string | null;
};

const DEMO_RIWAYAT: AbsenRow[] = [
  { id: "a1", tanggal: "2026-05-07", judul: "Sambung Muda-Mudi Kelompok Fajar C", status: "hadir", jam: "19:42" },
  { id: "a2", tanggal: "2026-05-02", judul: "Keakraban: Futsal Bareng", status: "izin", jam: "—" },
  { id: "a3", tanggal: "2026-04-28", judul: "Pemantapan Materi Pra-Nikah", status: "hadir", jam: "13:10" },
];

function parseQrToken(raw: string): QrHit {
  const t = raw.trim();
  if (t.startsWith("gencar-absen|")) {
    const [, level = "", nama = ""] = t.split("|");
    return { level: level || "?", nama: nama || "?" };
  }
  return null;
}

export default function MemberHomePage({ me, kegiatanList = [] }: { me: MemberIdentity; kegiatanList?: MemberKegiatan[]; go?: (k: any) => void }) {
  const sourceList = kegiatanList.length > 0 ? kegiatanList : DEMO_KEGIATAN_MEMBER;
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Sorting & finding upcoming / closest event
  const sortedKegiatan = useMemo(() => {
    return [...sourceList].sort((a, b) => {
      const d = a.tanggal.localeCompare(b.tanggal);
      if (d !== 0) return d;
      return (a.jam || "").localeCompare(b.jam || "");
    });
  }, [sourceList]);

  const todayStr = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }, []);

  const upcomingKegiatan = useMemo(() => {
    return sortedKegiatan.filter((k) => k.tanggal >= todayStr);
  }, [sortedKegiatan, todayStr]);

  const todayKegiatan = upcomingKegiatan[0] || sortedKegiatan[0] || DEMO_KEGIATAN_MEMBER[0]!;
  const next = useMemo(() => {
    return upcomingKegiatan.length > 0 ? upcomingKegiatan.slice(0, 5) : sortedKegiatan.slice(0, 5);
  }, [upcomingKegiatan, sortedKegiatan]);

  const [now, setNow] = useState(new Date());

  // GPS & QR State for Absen in Beranda
  const [gps, setGps] = useState<GpsState>(null);
  const [gpsLoading, setGpsLoading] = useState(true);
  const [showMapModal, setShowMapModal] = useState(false);
  const [activeKegiatanModal, setActiveKegiatanModal] = useState<MemberKegiatan | null>(null);
  const [qr, setQr] = useState<QrHit>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [conflictOpen, setConflictOpen] = useState(false);
  const [conflictList, setConflictList] = useState<ConflictKegiatan[]>([]);
  const [conflictAll, setConflictAll] = useState<ConflictKegiatan[]>([]);
  const [resolving, setResolving] = useState(false);
  const [riwayat, setRiwayat] = useState<AbsenRow[]>(DEMO_RIWAYAT);
  void riwayat;
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannedRef = useRef(false);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  const timeStr = now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", hour12: true });

  function ambilGps() {
    setGpsLoading(true);
    if (!navigator.geolocation) {
      setGpsLoading(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setGps({ lat: p.coords.latitude, lng: p.coords.longitude, acc: p.coords.accuracy ?? null });
        setGpsLoading(false);
      },
      (_err) => {
        setGpsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 15000 }
    );
  }

  useEffect(() => {
    ambilGps();
    startScan();
    return () => {
      void stopScan();
    };
  }, []);

  async function startScan() {
    if (scannerRef.current) return;
    const el = document.getElementById("qr-reader");
    if (el) el.innerHTML = "";
    try {
      const s = new Html5Qrcode("qr-reader", {
        verbose: false,
        formatsToSupport: [0], // QR Code only
      });
      scannerRef.current = s;
      scannedRef.current = false;
      await s.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: (viewfinderWidth, viewfinderHeight) => {
            const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
            const edge = Math.floor(minEdge * 0.7);
            return { width: edge, height: edge };
          },
        },
        onScan,
        () => {}
      );
      setMsg(null);
    } catch {
      setMsg("Gagal buka kamera. Pastikan izin kamera diberikan & tidak dipakai app lain.");
      scannerRef.current = null;
    }
  }

  async function stopScan() {
    const s = scannerRef.current;
    if (!s) return;
    try {
      await s.stop();
      s.clear();
    } catch {}
    scannerRef.current = null;
  }

  function resetScan() {
    scannedRef.current = false;
    setQr(null);
    setMsg(null);
    if (!scannerRef.current) void startScan();
  }

  async function onScan(decoded: string) {
    if (scannedRef.current) return;
    const hit = parseQrToken(decoded);
    scannedRef.current = true;
    // Kamera dibiarkan tetap hidup — guard scannedRef mencegah submit ganda
    if (!hit) {
      setMsg("QR tidak dikenali. Scan QR wilayah yang resmi dari admin.");
      return;
    }
    setQr(hit);
    setMsg(null);

    // Auto-detect: kirim scan ke backend, backend tentukan kegiatan eligible
    try {
      const res: any = await apiFetch("/api/absensi/scan", {
        method: "POST",
        body: JSON.stringify({
          qrToken: decoded,
          lat: gps?.lat,
          lng: gps?.lng,
          accuracy: gps?.acc,
        }),
      });
      const nowTime = new Date();
      const jam = `${String(nowTime.getHours()).padStart(2, "0")}:${String(nowTime.getMinutes()).padStart(2, "0")}`;
      if (res?.status === "success" && res?.attendedKegiatan) {
        const k = res.attendedKegiatan as ConflictKegiatan;
        setRiwayat((prev) => [{ id: `a_${Date.now()}`, tanggal: k.tanggal, judul: k.judul, status: "hadir", jam }, ...prev]);
        const izinInfo = Array.isArray(res?.autoIzinKegiatan) && res.autoIzinKegiatan.length > 0
          ? ` (${res.autoIzinKegiatan.length} acara lain otomatis izin)`
          : "";
        setMsg(`Hadir berhasil dicatat pukul ${jam} di "${k.judul}"${izinInfo}.`);
      } else if (res?.status === "multiple") {
        setConflictList((res.eligibleKegiatan ?? []) as ConflictKegiatan[]);
        setConflictAll((res.allConcurrentKegiatan ?? res.eligibleKegiatan ?? []) as ConflictKegiatan[]);
        setConflictOpen(true);
        setMsg(`Ada ${(res.eligibleKegiatan ?? []).length} kegiatan aktif di wilayah ini. Pilih yang kamu hadiri.`);
      } else {
        setMsg(res?.message || "Tidak ada kegiatan aktif untuk wilayah ini saat ini.");
      }
    } catch (e: any) {
      const errTxt = e?.message || "Gagal mencatat absensi";
      setMsg(errTxt);
    }
  }

  async function resolveConflict(selectedId: string) {
    if (resolving) return;
    setResolving(true);
    try {
      await apiFetch("/api/absensi/resolve", {
        method: "POST",
        body: JSON.stringify({
          selectedKegiatanId: selectedId,
          allEligibleKegiatanIds: conflictAll.map((k) => k.id),
          lat: gps?.lat,
          lng: gps?.lng,
          accuracy: gps?.acc,
          qrWilayahLevel: qr?.level,
        }),
      });
      const picked = conflictList.find((k) => k.id === selectedId);
      const nowTime = new Date();
      const jam = `${String(nowTime.getHours()).padStart(2, "0")}:${String(nowTime.getMinutes()).padStart(2, "0")}`;
      if (picked) {
        setRiwayat((prev) => [{ id: `a_${Date.now()}`, tanggal: picked.tanggal, judul: picked.judul, status: "hadir", jam }, ...prev]);
        setMsg(`Hadir berhasil dicatat pukul ${jam} di "${picked.judul}". Acara lain otomatis izin.`);
      }
      setConflictOpen(false);
      setConflictList([]);
      setConflictAll([]);
    } catch (e: any) {
      setMsg(e?.message || "Gagal memilih kegiatan");
    } finally {
      setResolving(false);
    }
  }

  const dist = useMemo(() => {
    if (gps == null || todayKegiatan.lat == null || todayKegiatan.lng == null) return null;
    return Math.round(haversineM(gps.lat, gps.lng, todayKegiatan.lat, todayKegiatan.lng));
  }, [gps, todayKegiatan.lat, todayKegiatan.lng]);

  // Calendar Data & Events Mapping
  const [calDate, setCalDate] = useState(() => new Date());
  const calInfo = useMemo(() => {
    const y = calDate.getFullYear(), m = calDate.getMonth();
    return {
      y, m,
      label: calDate.toLocaleDateString("id-ID", { month: "long", year: "numeric" }),
      daysInMonth: new Date(y, m + 1, 0).getDate(),
      startDay: new Date(y, m, 1).getDay(),
    };
  }, [calDate]);

  const kegiatanByDate = useMemo(() => {
    const map: Record<string, MemberKegiatan[]> = {};
    sourceList.forEach((k) => {
      if (!map[k.tanggal]) map[k.tanggal] = [];
      map[k.tanggal].push(k);
    });
    return map;
  }, [sourceList]);

  const agendaDates = useMemo(() => new Set(Object.keys(kegiatanByDate)), [kegiatanByDate]);
  const selectedDateEvents = selectedDate ? (kegiatanByDate[selectedDate] ?? []) : [];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: 16, width: "100%", minWidth: 0 }}>
      {/* 1. HERO CLOCK (Start/Working Time) */}
      <div className="member-hero-clock">
        <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--muted)" }}>Working Time</div>
        <div className="member-hero-clock-time">{timeStr}</div>
        <div className="member-hero-clock-sub">
          <MapPin size={11} /> {todayKegiatan.lokasi} · Radius {todayKegiatan.radiusM}m
        </div>
      </div>

      {/* 2. FITUR ABSEN UTAMA (Kamera Scanner QR dalam Card + Tombol Check Lokasi) */}
      <div className="card" style={{ padding: 18, display: "grid", gap: 14 }}>
        {/* Scanner QR */}
        <div style={{ borderRadius: 16, overflow: "hidden", background: "#0f172a", position: "relative" }}>
          <div id="qr-reader" style={{ borderRadius: 14, overflow: "hidden", border: "none", outline: "none", background: "#0f172a", width: "100%", maxHeight: 280 }} />
          {!qr && <div style={{ textAlign: "center", fontSize: 11, color: "var(--muted)", padding: "8px 0 10px", fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase" }}>Arahkan kamera ke QR wilayah</div>}
          {qr && (
            <div style={{ padding: "8px 0 12px", display: "grid", gap: 8, placeItems: "center" }}>
              <span className="pill pill-emerald" style={{ justifyContent: "center", textTransform: "capitalize" }}>
                <QrCode size={12} /> QR ok — {qr.level}: {qr.nama}
              </span>
              <button type="button" className="btn btn-ghost btn-sm" onClick={resetScan} style={{ borderRadius: 999 }}>
                Scan lagi
              </button>
            </div>
          )}
        </div>

        {/* Tombol Check Lokasi */}
        <div style={{ display: "flex", justifyContent: "flex-end", paddingTop: 4 }}>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => {
              ambilGps();
              setActiveKegiatanModal(todayKegiatan);
              setShowMapModal(true);
            }}
            style={{ borderRadius: 999 }}
          >
            <LocateFixed size={14} /> Check Lokasi
          </button>
        </div>

        {msg && (
          <div style={{ fontSize: 12, padding: "8px 10px", borderRadius: 10, background: "#fef3c7", color: "#92400e", border: "1px solid #fde68a" }}>
            {msg}
          </div>
        )}

        {/* Modal konflik: >=2 kegiatan aktif di QR yang sama */}
        {conflictOpen && (
          <div className="modal-backdrop" onClick={() => setConflictOpen(false)} style={{ zIndex: 1200, display: "grid", placeItems: "center", padding: 16 }}>
            <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 440, width: "100%", padding: 20, borderRadius: 20 }}>
              <h3 style={{ fontSize: 16, fontWeight: 900, color: "var(--ink)", margin: "0 0 4px" }}>
                Pilih Kegiatan yang Kamu Hadiri
              </h3>
              <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: "0 0 14px", lineHeight: 1.5 }}>
                Ada {conflictList.length} kegiatan aktif di wilayah ini. Memilih satu kegiatan akan otomatis mencatat status <b>Izin</b> pada kegiatan lainnya.
              </p>
              <div style={{ display: "grid", gap: 8 }}>
                {conflictList.map((k) => (
                  <div
                    key={k.id}
                    style={{
                      border: "1.5px solid var(--line)",
                      borderRadius: 14,
                      padding: "12px 14px",
                      background: "#fff",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 10,
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 800, fontSize: 13, color: "var(--ink)" }}>{k.judul}</div>
                      <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>
                        {(k.jamMulai || k.jam || "—")}{k.jamSelesai ? ` – ${k.jamSelesai}` : ""} {(k as any).lokasi ? ` • ${(k as any).lokasi}` : ""}
                      </div>
                    </div>
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      disabled={resolving}
                      onClick={() => void resolveConflict(k.id)}
                      style={{ flexShrink: 0, fontWeight: 800 }}
                    >
                      {resolving ? "…" : "Hadir"}
                    </button>
                  </div>
                ))}
              </div>
              <button type="button" className="btn btn-ghost" onClick={() => { setConflictOpen(false); scannedRef.current = false; }} style={{ width: "100%", marginTop: 12 }}>
                Batal
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 5. AGENDA TERDEKAT */}
      <div className="card">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <div>
            <h3 style={{ fontSize: 14, fontWeight: 800, letterSpacing: "-0.02em" }}>Agenda Terdekat</h3>
            <p className="muted" style={{ fontSize: 12 }}>Untuk {me.desa || "Daerah"} {me.kelompok ? `· ${me.kelompok}` : ""}</p>
          </div>
          <span className="pill pill-slate">
            <CalendarDays size={12} /> {sourceList.length} agenda
          </span>
        </div>

        <div style={{ display: "grid", gap: 10, marginTop: 14 }}>
          {next.map((k: MemberKegiatan) => (
            <div
              key={k.id}
              className="card"
              onClick={() => {
                setSelectedDate(k.tanggal);
                const el = document.getElementById("kalender-section");
                if (el) el.scrollIntoView({ behavior: "smooth" });
              }}
              style={{
                padding: 12,
                display: "grid",
                gap: 6,
                background: selectedDate === k.tanggal ? "var(--bg)" : "#fff",
                borderRadius: 14,
                cursor: "pointer",
                border: selectedDate === k.tanggal ? "1.5px solid var(--primary)" : "1px solid var(--line)",
                transition: "all 0.15s ease",
              }}
            >
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                <span className={`pill ${k.kategori === "sambung_rutin" ? "pill-emerald" : k.kategori === "keakraban" ? "pill-amber" : "pill-slate"}`} style={{ fontSize: 10 }}>
                  {k.kategori === "sambung_rutin" ? "Sambung Rutin" : (k.kategori ?? k.tingkat ?? "—")}
                </span>
                {k.tingkat && <span className="pill pill-slate" style={{ fontSize: 10 }}>{k.tingkat}</span>}
                {k.tanggal === todayStr && <span className="pill pill-emerald" style={{ fontSize: 10 }}>Hari ini</span>}
              </div>
              <div style={{ fontWeight: 800, lineHeight: 1.25, fontSize: 13 }}>{k.judul}</div>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", fontSize: 12, color: "var(--text-secondary)" }}>
                <span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
                  <Clock3 size={12} /> {k.tanggal} · {k.jam}
                </span>
                <span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
                  <MapPin size={12} /> {k.lokasi}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 6. KALENDER KEGIATAN TERINTEGRASI */}
      <div id="kalender-section" className="card" style={{ padding: 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <h3 style={{ fontSize: 13, fontWeight: 800, letterSpacing: "-0.02em" }}>Kalender Kegiatan</h3>
          <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setCalDate(new Date(calInfo.y, calInfo.m - 1, 1)); setSelectedDate(null); }} aria-label="Bulan sebelumnya" style={{ width: 32, height: 32, minHeight: 32, padding: 0, borderRadius: 8 }}><ChevronLeft size={14} /></button>
            <span style={{ fontSize: 12, fontWeight: 800, minWidth: 110, textAlign: "center", textTransform: "capitalize" }}>{calInfo.label}</span>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setCalDate(new Date(calInfo.y, calInfo.m + 1, 1)); setSelectedDate(null); }} aria-label="Bulan berikutnya" style={{ width: 32, height: 32, minHeight: 32, padding: 0, borderRadius: 8 }}><ChevronRight size={14} /></button>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2, marginBottom: 4 }}>
          {["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"].map((d) => (
            <div key={d} style={{ fontSize: 10, fontWeight: 800, textAlign: "center", color: "var(--muted)", padding: "4px 0" }}>{d}</div>
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
          {Array.from({ length: calInfo.startDay }).map((_, i) => (
            <div key={`empty-${i}`} />
          ))}
          {Array.from({ length: calInfo.daysInMonth }).map((_, i) => {
            const day = i + 1;
            const iso = `${calInfo.y}-${String(calInfo.m + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            const isToday = iso === todayStr;
            const hasAgenda = agendaDates.has(iso);
            const isSelected = selectedDate === iso;
            return (
              <button
                key={iso}
                type="button"
                onClick={() => setSelectedDate(isSelected ? null : iso)}
                style={{
                  aspectRatio: "1",
                  borderRadius: 10,
                  display: "grid",
                  placeItems: "center",
                  fontSize: 12,
                  fontWeight: 700,
                  background: isSelected ? "var(--primary)" : hasAgenda ? "#fff" : isToday ? "var(--bg)" : "#fff",
                  color: isSelected ? "#fff" : hasAgenda ? "var(--primary)" : isToday ? "var(--ink)" : "var(--text)",
                  border: isSelected ? "2px solid var(--primary)" : hasAgenda ? "2px solid var(--primary)" : isToday ? "1px solid var(--line)" : "1px solid transparent",
                  position: "relative",
                  cursor: "pointer",
                  padding: 0,
                }}
              >
                {day}
                {hasAgenda && (
                  <span
                    style={{
                      position: "absolute",
                      bottom: 3,
                      width: 4,
                      height: 4,
                      borderRadius: 999,
                      background: isSelected ? "#fff" : "var(--primary)",
                    }}
                  />
                )}
              </button>
            );
          })}
        </div>
        <div style={{ display: "flex", gap: 12, marginTop: 10, fontSize: 11, color: "var(--muted)", flexWrap: "wrap" }}>
          <span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}><span style={{ width: 8, height: 8, borderRadius: 999, background: "var(--primary)", display: "inline-block" }} /> Ada agenda</span>
          <span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}><span style={{ width: 8, height: 8, borderRadius: 4, border: "1px solid var(--line)", display: "inline-block" }} /> Hari ini</span>
          <span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}><span style={{ width: 8, height: 8, borderRadius: 4, background: "var(--primary)", display: "inline-block" }} /> Dipilih</span>
        </div>

        {/* Detail Acara Berdasarkan Tanggal yang Dipilih */}
        {selectedDate && (
          <div style={{ borderTop: "1px solid var(--line)", marginTop: 14, paddingTop: 14, display: "grid", gap: 8 }}>
            <div style={{ fontWeight: 800, fontSize: 13, color: "var(--ink)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span>Agenda {new Date(selectedDate + "T00:00:00").toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</span>
              <span className="pill pill-slate" style={{ fontSize: 10 }}>{selectedDateEvents.length} kegiatan</span>
            </div>

            {selectedDateEvents.length === 0 ? (
              <div style={{ fontSize: 12, color: "var(--muted)", fontStyle: "italic", padding: "8px 0" }}>
                Tidak ada agenda kegiatan pada tanggal ini.
              </div>
            ) : (
              <div style={{ display: "grid", gap: 8 }}>
                {selectedDateEvents.map((ev) => (
                  <div key={ev.id} style={{ padding: "10px 12px", background: "var(--bg)", borderRadius: 10, border: "1px solid var(--line)", display: "grid", gap: 4 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                      <span style={{ fontWeight: 800, fontSize: 13 }}>{ev.judul}</span>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => {
                          ambilGps();
                          setActiveKegiatanModal(ev);
                          setShowMapModal(true);
                        }}
                        style={{ padding: "2px 8px", fontSize: 11, borderRadius: 999, height: "auto" }}
                      >
                        <MapPin size={11} /> Lokasi
                      </button>
                    </div>
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", fontSize: 11, color: "var(--text-secondary)" }}>
                      <span style={{ display: "inline-flex", gap: 4, alignItems: "center" }}><Clock3 size={11} /> {ev.jam}</span>
                      <span style={{ display: "inline-flex", gap: 4, alignItems: "center" }}><MapPin size={11} /> {ev.lokasi}</span>
                      {ev.tingkat && <span className="pill pill-slate" style={{ fontSize: 9, padding: "1px 6px" }}>{ev.tingkat}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 8. MODAL CHECK LOKASI / MAP */}
      {showMapModal && (
        <LocationModal
          today={activeKegiatanModal || todayKegiatan}
          gps={gps}
          gpsLoading={gpsLoading}
          dist={dist}
          onRefreshGps={ambilGps}
          onClose={() => {
            setShowMapModal(false);
            setActiveKegiatanModal(null);
          }}
        />
      )}
    </div>
  );
}

function isEventAvailableForAbsen(tanggal: string, jam: string): {
  available: boolean;
  statusText: string;
  statusType: "open" | "upcoming" | "ended";
} {
  try {
    // format: YYYY-MM-DD dan HH:mm
    const [year, month, day] = tanggal.split("-").map(Number);
    const [hours, minutes] = jam.split(":").map(Number);
    if (!year || !month || !day || isNaN(hours) || isNaN(minutes)) {
      return { available: true, statusText: "Bisa absen sekarang", statusType: "open" };
    }

    const eventStart = new Date(year, month - 1, day, hours, minutes, 0);
    const openTime = new Date(eventStart.getTime() - 30 * 60 * 1000); // 30 menit sebelum
    const endTime = new Date(eventStart.getTime() + 3 * 60 * 60 * 1000); // estimasi akhir acara +3 jam
    const now = new Date();

    if (now < openTime) {
      const diffMin = Math.ceil((openTime.getTime() - now.getTime()) / (60 * 1000));
      const text = diffMin > 60 
        ? `Dibuka ${Math.ceil(diffMin / 60)} jam lagi (30 mnt sebelum acara)` 
        : `Dibuka ${diffMin} menit lagi`;
      return { available: false, statusText: text, statusType: "upcoming" };
    } else if (now > endTime) {
      return { available: false, statusText: "Waktu absensi telah berakhir", statusType: "ended" };
    } else {
      return { available: true, statusText: "Absensi sedang dibuka (aktif)", statusType: "open" };
    }
  } catch {
    return { available: true, statusText: "Bisa absen sekarang", statusType: "open" };
  }
}
function LocationModal({
  today,
  gps,
  gpsLoading,
  dist,
  onRefreshGps,
  onClose,
}: {
  today: MemberKegiatan;
  gps: GpsState;
  gpsLoading: boolean;
  dist: number | null;
  onRefreshGps: () => void;
  onClose: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const inRadius = dist != null ? dist <= today.radiusM : false;
  const timeAvail = useMemo(() => isEventAvailableForAbsen(today.tanggal, today.jam), [today.tanggal, today.jam]);

  useEffect(() => {
    if (!containerRef.current) return;

    const centerLat = today.lat ?? gps?.lat ?? -6.137;
    const centerLng = today.lng ?? gps?.lng ?? 106.7;

    const map = L.map(containerRef.current, {
      center: [centerLat, centerLng],
      zoom: 15,
      zoomControl: true,
    });
    mapRef.current = map;

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    // Marker & radius kegiatan (Area radius yang valid untuk absensi)
    if (today.lat != null && today.lng != null) {
      L.circle([today.lat, today.lng], {
        radius: today.radiusM,
        color: inRadius ? "#16a34a" : "#d03804",
        fillColor: inRadius ? "#16a34a" : "#d03804",
        fillOpacity: 0.18,
        weight: 2,
      }).addTo(map);

      L.marker([today.lat, today.lng])
        .addTo(map)
        .bindPopup(`<b>${today.judul}</b><br/>${today.lokasi}<br/><b>Radius Absen:</b> ${today.radiusM}m`)
        .openPopup();
    }

    // Marker posisi kamu (GPS pengguna saat ini)
    if (gps?.lat != null && gps?.lng != null) {
      const userIcon = L.divIcon({
        className: "user-gps-marker",
        html: `<div style="width: 16px; height: 16px; border-radius: 999px; background: #2563eb; border: 3px solid #ffffff; box-shadow: 0 0 12px rgba(37,99,235,0.7); display: grid; place-items: center;"></div>`,
        iconSize: [16, 16],
        iconAnchor: [8, 8],
      });

      L.marker([gps.lat, gps.lng], { icon: userIcon })
        .addTo(map)
        .bindPopup(`<b>Posisi Kamu</b><br/>Akurasi ±${gps.acc ? Math.round(gps.acc) : "?"}m<br/>${dist != null ? `Jarak ke acara: ${dist}m` : ""}`);
    }

    // Adjust view agar kedua posisi (acara + user) muat pas di layar peta
    if (today.lat != null && today.lng != null && gps?.lat != null && gps?.lng != null) {
      const bounds = L.latLngBounds([
        [today.lat, today.lng],
        [gps.lat, gps.lng],
      ]);
      map.fitBounds(bounds, { padding: [45, 45] });
    }

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [today, gps, inRadius, dist]);

  return (
    <div className="modal-backdrop modal-backdrop--map" onClick={onClose}>
      <div className="modal modal--map" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 560, padding: 18, gap: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <strong className="modal-title" style={{ fontSize: 16 }}>Status Lokasi & Waktu Absensi</strong>
            <p className="muted" style={{ fontSize: 12, margin: 0 }}>{today.judul}</p>
          </div>
          <button className="btn-close" aria-label="Tutup" onClick={onClose}><IcoX size={16} /></button>
        </div>

        {/* Map Container */}
        <div style={{ height: 280, borderRadius: 14, overflow: "hidden", border: "1px solid var(--line)", position: "relative" }}>
          <div ref={containerRef} style={{ height: "100%", width: "100%" }} />
          {/* Legend overlay on top of map */}
          <div style={{ position: "absolute", top: 10, right: 10, zIndex: 1000, background: "rgba(255,255,255,0.92)", backdropFilter: "blur(4px)", padding: "6px 10px", borderRadius: 8, border: "1px solid var(--line)", fontSize: 10, display: "grid", gap: 4 }}>
            <span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}><span style={{ width: 8, height: 8, borderRadius: 999, background: "#d03804" }} /> Titik Acara & Radius ({today.radiusM}m)</span>
            <span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}><span style={{ width: 8, height: 8, borderRadius: 999, background: "#2563eb" }} /> Posisi Kamu</span>
          </div>
        </div>

        {/* Status Window: Ketersediaan Waktu (30 Menit Sebelum Acara) + Jarak GPS */}
        <div style={{ display: "grid", gap: 8, padding: 12, background: "var(--bg)", borderRadius: 12, border: "1px solid var(--line)" }}>
          {/* Row 1: Time availability & GPS Distance */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 6 }}>
            <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
              {/* Window time status */}
              <span className={`pill ${timeAvail.statusType === "open" ? "pill-emerald" : timeAvail.statusType === "upcoming" ? "pill-amber" : "pill-slate"}`}>
                <Clock3 size={12} /> {timeAvail.statusText}
              </span>

              {/* Radius status */}
              {dist != null && (
                <span className={`pill ${inRadius ? "pill-emerald" : "pill-amber"}`}>
                  {inRadius ? <ShieldCheck size={12} /> : <AlertTriangle size={12} />} {inRadius ? `Dalam Radius (${dist}m)` : `Di Luar Radius (${dist}m)`}
                </span>
              )}
            </div>
            <button type="button" className="btn btn-ghost btn-sm" onClick={onRefreshGps} disabled={gpsLoading} style={{ borderRadius: 999 }}>
              <LocateFixed size={13} /> Refresh GPS
            </button>
          </div>

          {/* Row 2: Explanatory note */}
          <div style={{ fontSize: 11, color: "var(--text-secondary)", lineHeight: 1.45, borderTop: "1px solid rgba(0,0,0,0.06)", paddingTop: 8, marginTop: 2 }}>
            <div><b>Jadwal Acara:</b> {today.tanggal} pukul {today.jam} WIB (Mulai dibuka 30 menit sebelum hingga akhir acara).</div>
            <div><b>Status Kamu:</b> {gps ? `${gps.lat.toFixed(5)}, ${gps.lng.toFixed(5)} · ${inRadius && timeAvail.available ? "Siap absen sekarang" : "Mendekat ke radius acara saat waktu dibuka"}` : "Izin lokasi diperlukan untuk verifikasi kehadiran."}</div>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button type="button" className="btn btn-primary" onClick={onClose} style={{ width: "100%", borderRadius: 12 }}>
            Selesai
          </button>
        </div>
      </div>
    </div>
  );
}
