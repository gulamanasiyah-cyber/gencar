import { useEffect, useMemo, useRef, useState } from "react";
import { Clock3, QrCode, LocateFixed, ChevronLeft, ChevronRight, CalendarDays, MapPin, X as IcoX, ShieldCheck, AlertTriangle, Send } from "lucide-react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Html5Qrcode } from "html5-qrcode";
import { haversineM } from "shared/validation";
import { apiFetch } from "../../lib/api";
import { Select } from "../../components/Select";
import { DEMO_KEGIATAN_MEMBER, type MemberIdentity, type MemberKegiatan } from "./types";

// Fix default marker icons for Vite bundling
import iconRetinaUrl from "leaflet/dist/images/marker-icon-2x.png";
import iconUrl from "leaflet/dist/images/marker-icon.png";
import shadowUrl from "leaflet/dist/images/marker-shadow.png";
// @ts-ignore
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({ iconRetinaUrl, iconUrl, shadowUrl });

type AbsenRow = { id: string; tanggal: string; judul: string; status: "hadir" | "izin" | "alpha"; jam: string; catatan?: string | null; izinSumber?: string | null };
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
  lat?: number | null;
  lng?: number | null;
  radiusM?: number | null;
};
type ScanResultModal =
  | { kind: "success"; judul: string; jam: string; izinCount: number }
  | { kind: "gps"; reason: "no_gps" | "out_of_range"; message: string; judul: string; dist: number | null; radiusM: number; lat: number | null; lng: number | null }
  | { kind: "empty"; message: string }
  | { kind: "error"; message: string };

const DEMO_RIWAYAT: AbsenRow[] = [];

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
  const [resultModal, setResultModal] = useState<ScanResultModal | null>(null);

  function closeResultModal() {
    setResultModal(null);
    // reset guard supaya kamera langsung bisa scan lagi
    scannedRef.current = false;
    setQr(null);
    if (!scannerRef.current) void startScan();
  }
  const [riwayat, setRiwayat] = useState<AbsenRow[]>(DEMO_RIWAYAT);
  const [riwayatLoading, setRiwayatLoading] = useState(true);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyAll, setHistoryAll] = useState<AbsenRow[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyStatus, setHistoryStatus] = useState<"all" | "hadir" | "izin" | "alpha">("all");
  const [izinOpen, setIzinOpen] = useState(false);
  const [izinKegiatanList, setIzinKegiatanList] = useState<ConflictKegiatan[]>([]);
  const [izinKegiatanId, setIzinKegiatanId] = useState("");
  const [izinAlasan, setIzinAlasan] = useState("");
  const [izinSaving, setIzinSaving] = useState(false);
  const [izinErr, setIzinErr] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannedRef = useRef(false);
  // Ref selalu-terbaru supaya callback scanner (di-capture saat mount) tidak basi
  const gpsRef = useRef<GpsState>(gps);
  const gpsLoadingRef = useRef(gpsLoading);

  useEffect(() => {
    gpsRef.current = gps;
  }, [gps]);
  useEffect(() => {
    gpsLoadingRef.current = gpsLoading;
  }, [gpsLoading]);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  const timeStr = now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", hour12: false });

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

  const mapRiwayatRow = (r: any): AbsenRow => ({
    id: r.id,
    tanggal: r.tanggal ?? (r.timestamp ? String(r.timestamp).slice(0, 10) : ""),
    judul: r.judul ?? "Kegiatan",
    status: (r.keterangan === "izin" ? "izin" : r.keterangan === "alpha" ? "alpha" : "hadir") as AbsenRow["status"],
    jam: r.jam ?? (r.timestamp ? String(r.timestamp).slice(11, 16) : "—"),
    catatan: r.catatan ?? null,
    izinSumber: r.izinSumber ?? null,
  });

  async function loadRiwayat() {
    try {
      const rows: any = await apiFetch("/api/absensi/mine?limit=5");
      if (!Array.isArray(rows)) return;
      setRiwayat(rows.map(mapRiwayatRow));
    } catch {} finally {
      setRiwayatLoading(false);
    }
  }

  useEffect(() => {
    void loadRiwayat();
  }, []);

  async function openHistoryModal() {
    setHistoryOpen(true);
    setHistoryStatus("all");
    await loadHistory("all");
  }

  async function loadHistory(status: "all" | "hadir" | "izin" | "alpha") {
    setHistoryLoading(true);
    try {
      const qs = status === "all" ? "" : `&status=${status}`;
      const rows: any = await apiFetch(`/api/absensi/mine?limit=500${qs}`);
      if (Array.isArray(rows)) setHistoryAll(rows.map(mapRiwayatRow));
    } catch {} finally {
      setHistoryLoading(false);
    }
  }

  async function openModalIzin() {
    setIzinErr(null);
    setIzinAlasan("");
    setIzinKegiatanId("");
    setIzinOpen(true);
    try {
      const rows: any = await apiFetch("/api/absensi/upcoming");
      setIzinKegiatanList(Array.isArray(rows) ? rows : []);
    } catch { setIzinKegiatanList([]); }
  }

  async function submitIzin() {
    if (!izinKegiatanId) { setIzinErr("Pilih kegiatan dulu"); return; }
    if (izinAlasan.trim().length < 5) { setIzinErr("Alasan minimal 5 karakter"); return; }
    setIzinSaving(true);
    setIzinErr(null);
    try {
      await apiFetch("/api/absensi/izin", {
        method: "POST",
        body: JSON.stringify({ kegiatanId: izinKegiatanId, alasan: izinAlasan.trim() }),
      });
      setIzinOpen(false);
      void loadRiwayat();
    } catch (e: any) {
      setIzinErr(e?.message || "Gagal mengajukan izin");
    } finally {
      setIzinSaving(false);
    }
  }

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
    if (!hit) {
      scannedRef.current = true;
      setResultModal({ kind: "error", message: "QR tidak dikenali. Scan QR wilayah yang resmi dari admin." });
      return;
    }
    const curGps = gpsRef.current;
    const curGpsLoading = gpsLoadingRef.current;
    // GPS belum lock → jangan submit ke backend, langsung kasih tahu user
    if (!curGps || curGpsLoading) {
      scannedRef.current = true;
      setResultModal({
        kind: "gps",
        reason: "no_gps",
        message: curGpsLoading
          ? "GPS sedang mencari lokasi. Tunggu sebentar lalu scan ulang."
          : "GPS belum aktif. Aktifkan izin lokasi di browser lalu scan ulang.",
        judul: "",
        dist: null,
        radiusM: 0,
        lat: null,
        lng: null,
      });
      return;
    }
    scannedRef.current = true;
    setQr(hit);

    // Auto-detect: kirim scan ke backend, backend tentukan kegiatan eligible
    try {
      const res: any = await apiFetch("/api/absensi/scan", {
        method: "POST",
        body: JSON.stringify({
          qrToken: decoded,
          lat: curGps?.lat,
          lng: curGps?.lng,
          accuracy: curGps?.acc,
        }),
      });
      const nowTime = new Date();
      const jam = `${String(nowTime.getHours()).padStart(2, "0")}:${String(nowTime.getMinutes()).padStart(2, "0")}`;
      if (res?.status === "success" && res?.attendedKegiatan) {
        const k = res.attendedKegiatan as ConflictKegiatan;
        void loadRiwayat();
        setResultModal({
          kind: "success",
          judul: k.judul,
          jam,
          izinCount: Array.isArray(res?.autoIzinKegiatan) ? res.autoIzinKegiatan.length : 0,
        });
      } else if (res?.status === "multiple") {
        setConflictList((res.eligibleKegiatan ?? []) as ConflictKegiatan[]);
        setConflictAll((res.allConcurrentKegiatan ?? res.eligibleKegiatan ?? []) as ConflictKegiatan[]);
        setConflictOpen(true);
        setMsg(`Ada ${(res.eligibleKegiatan ?? []).length} kegiatan aktif di wilayah ini. Pilih yang kamu hadiri.`);
      } else if (res?.status === "gps_required") {
        setResultModal({
          kind: "gps",
          reason: res?.reason === "out_of_range" ? "out_of_range" : "no_gps",
          message: res?.message || "Kegiatan ini membutuhkan GPS. Aktifkan lokasi lalu scan ulang.",
          judul: res?.kegiatan?.judul || "Kegiatan",
          dist: res?.dist ?? null,
          radiusM: res?.radiusM ?? 100,
          lat: res?.kegiatan?.lat ?? null,
          lng: res?.kegiatan?.lng ?? null,
        });
      } else {
        setResultModal({ kind: "empty", message: res?.message || "Tidak ada kegiatan aktif untuk wilayah ini saat ini." });
      }
    } catch (e: any) {
      const errTxt = e?.message || "Gagal mencatat absensi";
      setResultModal({ kind: "error", message: errTxt });
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
        void loadRiwayat();
        setResultModal({ kind: "success", judul: picked.judul, jam, izinCount: Math.max(0, conflictAll.length - 1) });
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
          {!qr && (
            <div style={{ textAlign: "center", fontSize: 11, color: "var(--muted)", padding: "8px 0 10px", fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase" }}>
              {gps ? "Arahkan kamera ke QR wilayah" : gpsLoading ? "Mencari GPS..." : "Aktifkan GPS lalu scan QR"}
            </div>
          )}
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

        {/* Modal hasil scan: sukses / GPS / tidak ada kegiatan / error */}
        {resultModal && (
          <div className="modal-backdrop" onClick={closeResultModal} style={{ zIndex: 1200, display: "grid", placeItems: "center", padding: 16 }}>
            <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 400, width: "100%", padding: 22, borderRadius: 20, textAlign: "center" }}>
              {resultModal.kind === "success" && (
                <>
                  <div style={{ width: 52, height: 52, borderRadius: "50%", background: "#f0fdf4", color: "#16a34a", display: "grid", placeItems: "center", margin: "0 auto 12px" }}>
                    <ShieldCheck size={26} />
                  </div>
                  <h3 style={{ fontSize: 17, fontWeight: 900, margin: "0 0 6px", color: "var(--ink)" }}>Hadir Tercatat!</h3>
                  <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5, margin: "0 0 4px" }}>
                    <b>{resultModal.judul}</b> &bull; pukul {resultModal.jam}
                  </p>
                  {resultModal.izinCount > 0 && (
                    <p style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.5, margin: "0 0 4px" }}>
                      {resultModal.izinCount} acara lain otomatis tercatat izin.
                    </p>
                  )}
                  <button type="button" className="btn btn-primary" onClick={closeResultModal} style={{ width: "100%", marginTop: 12, fontWeight: 800 }}>
                    Tutup
                  </button>
                </>
              )}
              {resultModal.kind === "gps" && (
                <>
                  <div style={{ width: 52, height: 52, borderRadius: "50%", background: "#fffbeb", color: "#d97706", display: "grid", placeItems: "center", margin: "0 auto 12px" }}>
                    <MapPin size={26} />
                  </div>
                  <h3 style={{ fontSize: 17, fontWeight: 900, margin: "0 0 6px", color: "var(--ink)" }}>
                    {resultModal.reason === "out_of_range" ? "Di Luar Jangkauan" : "GPS Belum Aktif"}
                  </h3>
                  <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5, margin: "0 0 4px" }}>
                    {resultModal.message}
                  </p>
                  {resultModal.reason === "out_of_range" && resultModal.dist != null && (
                    <p style={{ fontSize: 12, fontWeight: 800, color: "var(--ink)", margin: "8px 0 0" }}>
                      Jarak kamu ~{resultModal.dist}m &bull; radius {resultModal.radiusM}m
                    </p>
                  )}
                  <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
                    {resultModal.reason === "no_gps" ? (
                      <button
                        type="button"
                        className="btn btn-primary"
                        style={{ flex: 1, fontWeight: 800 }}
                        onClick={() => { ambilGps(); closeResultModal(); }}
                      >
                        <LocateFixed size={14} /> Aktifkan GPS
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="btn btn-primary"
                        style={{ flex: 1, fontWeight: 800 }}
                        onClick={() => {
                          if (resultModal.lat != null && resultModal.lng != null) {
                            setActiveKegiatanModal({
                              id: "",
                              judul: resultModal.judul,
                              tanggal: "",
                              jam: "",
                              lokasi: "",
                              lat: resultModal.lat,
                              lng: resultModal.lng,
                              radiusM: resultModal.radiusM,
                            } as MemberKegiatan);
                            setShowMapModal(true);
                          }
                          closeResultModal();
                        }}
                      >
                        <MapPin size={14} /> Lihat Lokasi
                      </button>
                    )}
                    <button type="button" className="btn btn-ghost" style={{ flex: 1 }} onClick={closeResultModal}>
                      Scan Ulang
                    </button>
                  </div>
                </>
              )}
              {(resultModal.kind === "empty" || resultModal.kind === "error") && (
                <>
                  <div style={{ width: 52, height: 52, borderRadius: "50%", background: resultModal.kind === "error" ? "#fef2f2" : "#f8fafc", color: resultModal.kind === "error" ? "#b91c1c" : "var(--muted)", display: "grid", placeItems: "center", margin: "0 auto 12px" }}>
                    <AlertTriangle size={26} />
                  </div>
                  <h3 style={{ fontSize: 17, fontWeight: 900, margin: "0 0 6px", color: "var(--ink)" }}>
                    {resultModal.kind === "error" ? "Gagal Absen" : "Tidak Ada Kegiatan"}
                  </h3>
                  <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5, margin: "0 0 4px" }}>
                    {resultModal.message}
                  </p>
                  <button type="button" className="btn btn-primary" onClick={closeResultModal} style={{ width: "100%", marginTop: 12, fontWeight: 800 }}>
                    Scan Ulang
                  </button>
                </>
              )}
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

      {/* 7. AJUKAN IZIN KEGIATAN */}
      <div className="card" style={{ padding: "14px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
          <div style={{ width: 38, height: 38, borderRadius: 12, background: "rgba(208,56,4,0.1)", color: "var(--primary)", display: "grid", placeItems: "center", flexShrink: 0 }}>
            <Send size={18} />
          </div>
          <div style={{ minWidth: 0 }}>
            <h3 style={{ fontSize: 13, fontWeight: 800, letterSpacing: "-0.02em", margin: 0, color: "var(--ink)" }}>
              Ajukan Izin Kegiatan
            </h3>
            <p className="muted" style={{ fontSize: 11, margin: "2px 0 0", lineHeight: 1.3 }}>
              Berhalangan hadir di acara mendatang? Ajukan lebih awal.
            </p>
          </div>
        </div>
        <button
          type="button"
          className="btn btn-primary btn-sm"
          onClick={openModalIzin}
          style={{ width: "auto", minHeight: 34, padding: "6px 14px", fontSize: 12, borderRadius: 10, fontWeight: 800, flexShrink: 0 }}
        >
          Ajukan Izin
        </button>
      </div>

      {/* 8. RIWAYAT ABSENSI */}
      <div id="riwayat-section" className="card" style={{ padding: 16, display: "grid", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
          <h3 style={{ fontSize: 14, fontWeight: 800, letterSpacing: "-0.02em", margin: 0 }}>
            Riwayat Absensi
          </h3>
          <span className="pill pill-slate" style={{ fontSize: 10, padding: "2px 7px" }}>
            5 terbaru
          </span>
        </div>

        {riwayatLoading ? (
          <div className="lp-empty-card" style={{ fontSize: 12 }}>Memuat riwayat…</div>
        ) : riwayat.length === 0 ? (
          <div className="lp-empty-card" style={{ fontSize: 12 }}>
            Belum ada riwayat absensi. Scan QR wilayah saat ada kegiatan untuk mencatat kehadiran.
          </div>
        ) : (
          <div style={{ display: "grid", gap: 8 }}>
            {riwayat.map((r) => {
              const displayCatatan = r.catatan ? r.catatan.replace(/^Izin\s*\(ajuan\):\s*/i, "") : null;
              return (
                <div key={r.id} style={{ display: "flex", gap: 10, alignItems: "center", padding: "10px 12px", borderRadius: 12, border: "1px solid var(--line)", background: "#fff" }}>
                  <span
                    className={`pill ${r.status === "hadir" ? "pill-emerald" : r.status === "izin" ? "pill-amber" : "pill-slate"}`}
                    style={{ textTransform: "capitalize", flexShrink: 0, fontSize: 11 }}
                  >
                    {r.status === "izin" && r.izinSumber === "ajuan" ? "Izin (Ajuan)" : r.status === "izin" ? "Izin" : r.status}
                  </span>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, lineHeight: 1.3, color: "var(--ink)" }}>{r.judul}</div>
                    {displayCatatan && (
                      <div className="muted" style={{ fontSize: 11, fontStyle: "italic", marginTop: 1 }}>{displayCatatan}</div>
                    )}
                    <div className="muted" style={{ fontSize: 11, marginTop: 2 }}>
                      {r.tanggal}{r.jam && r.jam !== "—" ? ` · ${r.jam}` : ""}
                    </div>
                  </div>
                </div>
              );
            })}
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => void openHistoryModal()}
              style={{ width: "100%", minHeight: 34, fontSize: 12, borderRadius: 10, marginTop: 4, fontWeight: 700 }}
            >
              Lihat Semua Riwayat &amp; Filter →
            </button>
          </div>
        )}

        {/* Modal Ajukan Izin */}
        {izinOpen && (
          <div className="modal-backdrop" onClick={() => setIzinOpen(false)} style={{ zIndex: 1200, display: "grid", placeItems: "center", padding: 16 }}>
            <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 420, width: "100%", padding: 20, borderRadius: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                <h3 style={{ fontSize: 16, fontWeight: 900, color: "var(--ink)", margin: 0 }}>Ajukan Izin</h3>
                <button type="button" className="trophy-modal-close" onClick={() => setIzinOpen(false)} aria-label="Tutup">
                  <IcoX size={18} />
                </button>
              </div>
              <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: "0 0 12px", lineHeight: 1.5 }}>
                Izin langsung tercatat untuk kegiatan mendatang. Admin dapat membatalkan jika tidak sesuai.
              </p>
              <div style={{ display: "grid", gap: 10 }}>
                <label style={{ display: "grid", gap: 4, textAlign: "left" }}>
                  <span style={{ fontSize: 11, fontWeight: 800, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.04em" }}>Kegiatan *</span>
                  <Select
                    value={izinKegiatanId}
                    onChange={setIzinKegiatanId}
                    ariaLabel="Pilih kegiatan"
                    options={[
                      { value: "", label: "-- Pilih kegiatan mendatang --" },
                      ...izinKegiatanList.map((k) => ({ value: k.id, label: `${k.judul} — ${k.tanggal}${k.jamMulai ? ` ${k.jamMulai}` : ""}` })),
                    ]}
                  />
                  {izinKegiatanList.length === 0 && (
                    <span style={{ fontSize: 11, color: "var(--muted)" }}>Tidak ada kegiatan mendatang yang bisa diizinkan.</span>
                  )}
                </label>
                <label style={{ display: "grid", gap: 4, textAlign: "left" }}>
                  <span style={{ fontSize: 11, fontWeight: 800, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.04em" }}>Alasan *</span>
                  <textarea
                    value={izinAlasan}
                    onChange={(e) => setIzinAlasan(e.target.value)}
                    rows={3}
                    maxLength={300}
                    placeholder="Contoh: Ada urusan keluarga di luar kota…"
                    style={{ width: "100%", padding: "9px 11px", borderRadius: 10, border: "1.5px solid var(--line)", fontSize: 13, resize: "vertical" }}
                  />
                  <span style={{ fontSize: 10, color: "var(--muted)" }}>{izinAlasan.length}/300</span>
                </label>
                {izinErr && (
                  <div style={{ fontSize: 12, color: "#b91c1c", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: "8px 10px" }}>
                    {izinErr}
                  </div>
                )}
                <div style={{ display: "flex", gap: 8 }}>
                  <button type="button" className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setIzinOpen(false)} disabled={izinSaving}>
                    Batal
                  </button>
                  <button type="button" className="btn btn-primary" style={{ flex: 1, fontWeight: 800 }} onClick={submitIzin} disabled={izinSaving}>
                    {izinSaving ? "Mengirim…" : "Kirim Izin"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal: Semua Riwayat Absensi (dengan filter) */}
      {historyOpen && (
        <div className="modal-backdrop" onClick={() => setHistoryOpen(false)} style={{ zIndex: 1200, display: "grid", placeItems: "start center", padding: 16, overflowY: "auto" }}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 520, width: "100%", padding: 20, borderRadius: 20, marginTop: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <h3 style={{ fontSize: 16, fontWeight: 900, color: "var(--ink)", margin: 0 }}>Riwayat Absensi</h3>
              <button type="button" className="trophy-modal-close" onClick={() => setHistoryOpen(false)} aria-label="Tutup">
                <IcoX size={18} />
              </button>
            </div>

            {/* Filter status */}
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
              {([["all", "Semua"], ["hadir", "Hadir"], ["izin", "Izin"], ["alpha", "Alpha"]] as const).map(([val, label]) => (
                <button
                  key={val}
                  type="button"
                  className={`chip ${historyStatus === val ? "active" : ""}`}
                  onClick={() => { setHistoryStatus(val); void loadHistory(val); }}
                >
                  {label}
                </button>
              ))}
              <span className="muted" style={{ marginLeft: "auto", fontSize: 11 }}>{historyAll.length} entri</span>
            </div>

            {historyLoading ? (
              <div className="lp-empty-card" style={{ fontSize: 12 }}>Memuat riwayat…</div>
            ) : historyAll.length === 0 ? (
              <div className="lp-empty-card" style={{ fontSize: 12 }}>
                {historyStatus === "all" ? "Belum ada riwayat absensi." : `Tidak ada riwayat dengan status ${historyStatus}.`}
              </div>
            ) : (
              <div style={{ display: "grid", gap: 8, maxHeight: "60vh", overflowY: "auto", paddingRight: 2 }}>
                {historyAll.map((r) => {
                  const displayCatatan = r.catatan ? r.catatan.replace(/^Izin\s*\(ajuan\):\s*/i, "") : null;
                  return (
                    <div key={r.id} style={{ display: "flex", gap: 10, alignItems: "center", padding: "10px 12px", borderRadius: 12, border: "1px solid var(--line)", background: "#fff" }}>
                      <span
                        className={`pill ${r.status === "hadir" ? "pill-emerald" : r.status === "izin" ? "pill-amber" : "pill-slate"}`}
                        style={{ textTransform: "capitalize", flexShrink: 0, fontSize: 11 }}
                      >
                        {r.status === "izin" && r.izinSumber === "ajuan" ? "Izin (Ajuan)" : r.status === "izin" ? "Izin" : r.status}
                      </span>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: 13, lineHeight: 1.3, color: "var(--ink)" }}>{r.judul}</div>
                        {displayCatatan && (
                          <div className="muted" style={{ fontSize: 11, fontStyle: "italic", marginTop: 1 }}>{displayCatatan}</div>
                        )}
                        <div className="muted" style={{ fontSize: 11, marginTop: 2 }}>
                          {r.tanggal}{r.jam && r.jam !== "—" ? ` · ${r.jam}` : ""}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

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

function isEventAvailableForAbsen(k: {
  tanggal: string;
  tanggalSelesai?: string | null;
  jam?: string;
  jamMulai?: string | null;
  jamSelesai?: string | null;
}): {
  available: boolean;
  statusText: string;
  statusType: "open" | "upcoming" | "ended";
} {
  try {
    const startTimeStr = k.jamMulai || k.jam || "00:00";
    const [sH = 0, sM = 0] = startTimeStr.split(":").map(Number);
    const [year, month, day] = k.tanggal.split("-").map(Number);
    if (!year || !month || !day) {
      return { available: true, statusText: "Bisa absen sekarang", statusType: "open" };
    }

    const start = new Date(year, month - 1, day, sH, sM, 0);
    let end: Date;
    if (k.tanggalSelesai && k.jamSelesai) {
      const [eH = 23, eM = 59] = k.jamSelesai.split(":").map(Number);
      const [eY, eMo, eD] = k.tanggalSelesai.split("-").map(Number);
      end = new Date(eY!, eMo! - 1, eD!, eH, eM, 0);
    } else if (k.jamSelesai) {
      const [eH = 0, eM = 0] = k.jamSelesai.split(":").map(Number);
      if (k.jamSelesai < startTimeStr) {
        const nextDay = new Date(start);
        nextDay.setDate(nextDay.getDate() + 1);
        end = new Date(nextDay.getFullYear(), nextDay.getMonth(), nextDay.getDate(), eH, eM, 0);
      } else {
        end = new Date(year, month - 1, day, eH, eM, 0);
      }
    } else {
      end = new Date(start.getTime() + 2 * 60 * 60 * 1000);
    }

    const windowOpen = new Date(start.getTime() - 30 * 60 * 1000);
    const windowClose = end;
    const now = new Date();

    if (now < windowOpen) {
      const diffMs = windowOpen.getTime() - now.getTime();
      const diffMin = Math.ceil(diffMs / (60 * 1000));
      const diffHours = Math.floor(diffMin / 60);
      const diffDays = Math.floor(diffHours / 24);

      let text: string;
      if (diffDays >= 1) {
        text = `Dibuka ${diffDays} hari lagi (${diffHours % 24 > 0 ? `${diffHours % 24} jam ` : ""}sebelum acara)`;
      } else if (diffHours >= 1) {
        const remMin = diffMin % 60;
        text = `Dibuka ${diffHours} jam ${remMin > 0 ? `${remMin} mnt ` : ""}lagi`;
      } else {
        text = `Dibuka ${diffMin} menit lagi`;
      }
      return { available: false, statusText: text, statusType: "upcoming" };
    } else if (now > windowClose) {
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
  const timeAvail = useMemo(() => isEventAvailableForAbsen(today), [today]);

  // Format tanggal Indonesia
  const jadwalStr = useMemo(() => {
    try {
      const d = new Date(today.tanggal + "T00:00:00");
      const dayName = d.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "short", year: "numeric" });
      const jam = today.jamMulai || today.jam || "—";
      const selesai = today.jamSelesai ? ` – ${today.jamSelesai}` : "";
      return `${dayName} · ${jam}${selesai} WIB`;
    } catch {
      return `${today.tanggal} · ${today.jamMulai || today.jam}`;
    }
  }, [today]);

  const distFormatted = useMemo(() => {
    if (dist == null) return null;
    return dist >= 1000 ? `${(dist / 1000).toFixed(1)} km` : `${dist}m`;
  }, [dist]);

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
        .bindPopup(`<b>Posisi Kamu</b><br/>Akurasi ±${gps.acc ? Math.round(gps.acc) : "?"}m<br/>${distFormatted ? `Jarak ke acara: ${distFormatted}` : ""}`);
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
  }, [today, gps, inRadius, dist, distFormatted]);

  return (
    <div className="modal-backdrop modal-backdrop--map" onClick={onClose}>
      <div className="modal modal--map" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 540, padding: 18, gap: 12, borderRadius: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
          <div style={{ minWidth: 0 }}>
            <strong className="modal-title" style={{ fontSize: 16, fontWeight: 900, color: "var(--ink)", display: "block" }}>
              Status Lokasi &amp; Waktu
            </strong>
            <p className="muted" style={{ fontSize: 12, margin: "2px 0 0", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {today.judul}
            </p>
          </div>
          <button type="button" className="trophy-modal-close" aria-label="Tutup" onClick={onClose} style={{ position: "static", flexShrink: 0 }}>
            <IcoX size={16} />
          </button>
        </div>

        {/* Map Container */}
        <div style={{ height: 260, borderRadius: 14, overflow: "hidden", border: "1px solid var(--line)", position: "relative" }}>
          <div ref={containerRef} style={{ height: "100%", width: "100%" }} />
          {/* Legend overlay on top of map */}
          <div style={{ position: "absolute", top: 8, right: 8, zIndex: 1000, background: "rgba(255,255,255,0.92)", backdropFilter: "blur(4px)", padding: "6px 10px", borderRadius: 8, border: "1px solid var(--line)", fontSize: 10, display: "grid", gap: 3, fontWeight: 700 }}>
            <span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}><span style={{ width: 8, height: 8, borderRadius: 999, background: "#d03804" }} /> Acara ({today.radiusM}m)</span>
            <span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}><span style={{ width: 8, height: 8, borderRadius: 999, background: "#2563eb" }} /> Posisi Kamu</span>
          </div>
        </div>

        {/* Status Window: Ketersediaan Waktu & Jarak */}
        <div style={{ display: "grid", gap: 10, padding: 12, background: "var(--bg)", borderRadius: 14, border: "1px solid var(--line)" }}>
          {/* Row 1: Badges & Refresh button */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", minWidth: 0, flex: 1 }}>
              <span className={`pill ${timeAvail.statusType === "open" ? "pill-emerald" : timeAvail.statusType === "upcoming" ? "pill-amber" : "pill-slate"}`} style={{ fontSize: 11, fontWeight: 800 }}>
                <Clock3 size={12} /> {timeAvail.statusText}
              </span>
              {distFormatted != null && (
                <span className={`pill ${inRadius ? "pill-emerald" : "pill-amber"}`} style={{ fontSize: 11, fontWeight: 800 }}>
                  {inRadius ? <ShieldCheck size={12} /> : <AlertTriangle size={12} />} {inRadius ? `Dalam Radius` : `Jarak ~${distFormatted}`}
                </span>
              )}
            </div>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={onRefreshGps}
              disabled={gpsLoading}
              style={{ width: "auto", minHeight: 30, padding: "4px 10px", fontSize: 11, borderRadius: 8, fontWeight: 700, flexShrink: 0 }}
            >
              <LocateFixed size={12} /> Refresh GPS
            </button>
          </div>

          {/* Row 2: Detail Info */}
          <div style={{ fontSize: 11, color: "var(--text-secondary)", lineHeight: 1.55, borderTop: "1px solid rgba(0,0,0,0.06)", paddingTop: 8 }}>
            <div><b>Jadwal:</b> {jadwalStr}</div>
            {today.lokasi && <div><b>Lokasi:</b> {today.lokasi} · radius {today.radiusM}m</div>}
            <div style={{ marginTop: 2 }}>
              <b>Status Kamu:</b>{" "}
              {gps ? (
                inRadius && timeAvail.available ? (
                  <span style={{ color: "#16a34a", fontWeight: 800 }}>Siap absen saat ini</span>
                ) : (
                  <span>
                    {inRadius ? "Di dalam lokasi acara" : `Di luar radius (${distFormatted} dari titik acara)`} &bull; mendekat saat waktu absen dibuka
                  </span>
                )
              ) : (
                <span style={{ color: "#d97706", fontWeight: 700 }}>Izin lokasi belum aktif &bull; tap Refresh GPS</span>
              )}
            </div>
          </div>
        </div>

        <button type="button" className="btn btn-primary" onClick={onClose} style={{ width: "100%", borderRadius: 12, fontWeight: 800, minHeight: 40 }}>
          Selesai
        </button>
      </div>
    </div>
  );
}
