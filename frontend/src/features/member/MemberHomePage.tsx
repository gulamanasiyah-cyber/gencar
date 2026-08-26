import { useEffect, useMemo, useRef, useState } from "react";
import { Clock3, QrCode, LocateFixed, ChevronLeft, ChevronRight, CalendarDays, MapPin, X as IcoX, ShieldCheck, AlertTriangle } from "lucide-react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Html5Qrcode } from "html5-qrcode";
import { haversineM } from "shared/validation";
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

export default function MemberHomePage({ me }: { me: MemberIdentity; go?: (k: any) => void }) {
  const today = DEMO_KEGIATAN_MEMBER[0]!;
  const next = DEMO_KEGIATAN_MEMBER.slice(0, 3);
  const [now, setNow] = useState(new Date());

  // GPS & QR State for Absen in Beranda
  const [gps, setGps] = useState<GpsState>(null);
  const [gpsLoading, setGpsLoading] = useState(true);
  const [showMapModal, setShowMapModal] = useState(false);
  const [qr, setQr] = useState<QrHit>(null);
  const [msg, setMsg] = useState<string | null>(null);
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
  }, []);

  useEffect(() => () => void stopScan(), []);

  async function startScan() {
    if (scannerRef.current) return;
    try {
      const s = new Html5Qrcode("qr-reader", { verbose: false });
      scannerRef.current = s;
      scannedRef.current = false;
      await s.start({ facingMode: "environment" }, { fps: 10, qrbox: { width: 220, height: 220 } }, onScan, () => {});
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

  function onScan(decoded: string) {
    if (scannedRef.current) return;
    const hit = parseQrToken(decoded);
    scannedRef.current = true;
    void stopScan();
    if (!hit) {
      setMsg("QR tidak dikenali. Scan QR wilayah yang resmi dari admin.");
      return;
    }
    setQr(hit);
    setMsg(null);
    // Langsung catat hadir otomatis setelah QR sukses discan (jika GPS valid)
    if (gps != null && (today.lat == null || (dist != null && dist <= today.radiusM))) {
      const nowTime = new Date();
      const jam = `${String(nowTime.getHours()).padStart(2, "0")}:${String(nowTime.getMinutes()).padStart(2, "0")}`;
      setRiwayat((prev) => [{ id: `a_${Date.now()}`, tanggal: today.tanggal, judul: today.judul, status: "hadir", jam }, ...prev]);
      setMsg(`Hadir tercatat pukul ${jam} via scan QR ${hit.nama}.`);
    }
  }

  const dist = useMemo(() => {
    if (gps == null || today.lat == null || today.lng == null) return null;
    return Math.round(haversineM(gps.lat, gps.lng, today.lat, today.lng));
  }, [gps, today.lat, today.lng]);

  // Calendar Data
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
  const agendaDates = useMemo(() => new Set(next.map((k) => k.tanggal)), [next]);
  const todayStr = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }, []);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: 16, width: "100%", minWidth: 0 }}>
      {/* 1. HERO CLOCK (Start/Working Time) */}
      <div className="member-hero-clock">
        <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--muted)" }}>Working Time</div>
        <div className="member-hero-clock-time">{timeStr}</div>
        <div className="member-hero-clock-sub">
          <MapPin size={11} /> {today.lokasi} · Radius {today.radiusM}m
        </div>
      </div>

      {/* 2. FITUR ABSEN UTAMA (Kamera Scanner QR dalam Card + Tombol Check Lokasi) */}
      <div className="card" style={{ padding: 18, display: "grid", gap: 14 }}>
        {/* Scanner QR */}
        <div style={{ borderRadius: 16, overflow: "hidden", background: "#0f172a" }}>
          <div id="qr-reader" style={{ borderRadius: 14, overflow: "hidden", border: "none !important", outline: "none", background: "#0f172a", minHeight: 240 }} />
          {!qr && <div style={{ textAlign: "center", fontSize: 11, color: "var(--muted)", padding: "8px 0 10px", fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase" }}>Arahkan kamera ke QR wilayah</div>}
          {qr && (
            <div style={{ padding: "8px 0 12px", display: "grid", placeItems: "center" }}>
              <span className="pill pill-emerald" style={{ justifyContent: "center", textTransform: "capitalize" }}>
                <QrCode size={12} /> QR ok — {qr.level}: {qr.nama}
              </span>
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
      </div>

      {/* 5. AGENDA TERDEKAT */}
      <div className="card">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <div>
            <h3 style={{ fontSize: 14, fontWeight: 800, letterSpacing: "-0.02em" }}>Agenda Terdekat</h3>
            <p className="muted" style={{ fontSize: 12 }}>Untuk {me.desa} · {me.kelompok}</p>
          </div>
          <span className="pill pill-slate">
            <CalendarDays size={12} /> {next.length} agenda
          </span>
        </div>

        <div style={{ display: "grid", gap: 10, marginTop: 14 }}>
          {next.map((k: MemberKegiatan) => (
            <div
              key={k.id}
              className="card"
              style={{ padding: 12, display: "grid", gap: 6, background: "#fff", borderRadius: 14 }}
            >
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <span className={`pill ${k.kategori === "sambung_rutin" ? "pill-emerald" : "pill-slate"}`} style={{ fontSize: 10 }}>
                  {k.kategori === "sambung_rutin" ? "Sambung Rutin" : (k.kategori ?? k.tingkat ?? "—")}
                </span>
                {k.tingkat && <span className="pill pill-slate" style={{ fontSize: 10 }}>{k.tingkat}</span>}
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

      {/* 6. KALENDER KEGIATAN */}
      <div className="card" style={{ padding: 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <h3 style={{ fontSize: 13, fontWeight: 800, letterSpacing: "-0.02em" }}>Kalender Kegiatan</h3>
          <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setCalDate(new Date(calInfo.y, calInfo.m - 1, 1))} aria-label="Bulan sebelumnya" style={{ width: 32, height: 32, minHeight: 32, padding: 0, borderRadius: 8 }}><ChevronLeft size={14} /></button>
            <span style={{ fontSize: 12, fontWeight: 800, minWidth: 110, textAlign: "center", textTransform: "capitalize" }}>{calInfo.label}</span>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setCalDate(new Date(calInfo.y, calInfo.m + 1, 1))} aria-label="Bulan berikutnya" style={{ width: 32, height: 32, minHeight: 32, padding: 0, borderRadius: 8 }}><ChevronRight size={14} /></button>
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
            return (
              <div
                key={iso}
                style={{
                  aspectRatio: "1",
                  borderRadius: 10,
                  display: "grid",
                  placeItems: "center",
                  fontSize: 12,
                  fontWeight: 700,
                  background: hasAgenda ? "var(--primary)" : isToday ? "var(--bg)" : "#fff",
                  color: hasAgenda ? "#fff" : isToday ? "var(--ink)" : "var(--text)",
                  border: hasAgenda ? "1px solid var(--primary)" : isToday ? "1px solid var(--line)" : "1px solid transparent",
                  position: "relative",
                }}
              >
                {day}
                {hasAgenda && <span style={{ position: "absolute", bottom: 3, width: 4, height: 4, borderRadius: 999, background: "#fff" }} />}
              </div>
            );
          })}
        </div>
        <div style={{ display: "flex", gap: 12, marginTop: 10, fontSize: 11, color: "var(--muted)", flexWrap: "wrap" }}>
          <span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}><span style={{ width: 8, height: 8, borderRadius: 999, background: "var(--primary)", display: "inline-block" }} /> Ada agenda</span>
          <span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}><span style={{ width: 8, height: 8, borderRadius: 4, border: "1px solid var(--line)", display: "inline-block" }} /> Hari ini</span>
        </div>
      </div>

      {/* 8. MODAL CHECK LOKASI / MAP */}
      {showMapModal && (
        <LocationModal
          today={today}
          gps={gps}
          gpsLoading={gpsLoading}
          dist={dist}
          onRefreshGps={ambilGps}
          onClose={() => setShowMapModal(false)}
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
