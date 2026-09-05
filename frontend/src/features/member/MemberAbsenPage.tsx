import { useEffect, useMemo, useRef, useState } from "react";
import { MapPin, Clock3, ShieldCheck, AlertTriangle, QrCode, Camera, CameraOff, LocateFixed } from "lucide-react";
import { Html5Qrcode } from "html5-qrcode";
import { haversineM } from "shared/validation";
import { DEMO_KEGIATAN_MEMBER as DEMO, type MemberIdentity } from "./types";

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

export default function MemberAbsenPage({ me: _me }: { me: MemberIdentity }) {
  const today = DEMO[0]!;
  const [gps, setGps] = useState<GpsState>(null);
  const [gpsErr, setGpsErr] = useState<string | null>(null);
  const [gpsLoading, setGpsLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [qr, setQr] = useState<QrHit>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [riwayat, setRiwayat] = useState<AbsenRow[]>(DEMO_RIWAYAT);
  const [now, setNow] = useState(new Date());
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannedRef = useRef(false);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  const timeStr = now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", hour12: false });

  function ambilGps() {
    setGpsLoading(true);
    setGpsErr(null);
    if (!navigator.geolocation) {
      setGpsErr("Geolocation tidak tersedia di browser ini.");
      setGpsLoading(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setGps({ lat: p.coords.latitude, lng: p.coords.longitude, acc: p.coords.accuracy ?? null });
        setGpsLoading(false);
      },
      (err) => {
        setGpsErr(
          err.code === err.PERMISSION_DENIED
            ? "Permission GPS ditolak. Izinkan lokasi di browser."
            : "Gagal ambil GPS. Coba lagi di area terbuka."
        );
        setGpsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 15000 }
    );
  }

  useEffect(() => {
    ambilGps();
  }, []);

  useEffect(() => () => void stopScan(), []);

  async function startScan() {
    if (scannerRef.current) return;
    try {
      const s = new Html5Qrcode("qr-reader", { verbose: false });
      scannerRef.current = s;
      scannedRef.current = false;
      await s.start({ facingMode: "environment" }, { fps: 10, qrbox: { width: 220, height: 220 } }, onScan, () => {});
      setScanning(true);
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
    } catch {
    }
    scannerRef.current = null;
    setScanning(false);
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
  }

  const dist = useMemo(() => {
    if (gps == null || today.lat == null || today.lng == null) return null;
    return Math.round(haversineM(gps.lat, gps.lng, today.lat, today.lng));
  }, [gps, today.lat, today.lng]);
  const inRadius = dist != null ? dist <= today.radiusM : true;

  function absenHadir() {
    if (gps == null) {
      setMsg("GPS belum terkunci. Tunggu sebentar atau tap 'Refresh GPS'.");
      return;
    }
    if (today.lat != null && !inRadius) {
      setMsg(`Di luar radius ${today.radiusM}m (jarak ${dist}m). Mendekat ke lokasi dulu.`);
      return;
    }
    const jam = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    setRiwayat((prev) => [{ id: `a_${Date.now()}`, tanggal: today.tanggal, judul: today.judul, status: "hadir", jam }, ...prev]);
    setMsg(`Hadir tercatat pukul ${jam} (mock). Nanti POST /api/absensi dengan lat/lng + qrWilayahLevel.`);
  }

  const canHadir = gps != null && (today.lat == null || inRadius);

  return (
    <div style={{ display: "grid", gap: 16 }}>
      {/* Hero clock — per HP kanan: Start Time 09:00 PM */}
      <div className="member-hero-clock">
        <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--muted)" }}>Start Time</div>
        <div className="member-hero-clock-time">{timeStr}</div>
        <div className="member-hero-clock-sub">
          <MapPin size={11} /> {today.lokasi} · Radius {today.radiusM}m
        </div>
      </div>

      <div className="card" style={{ paddingLeft: 20, paddingRight: 20 }}>
        <div style={{ fontWeight: 800, fontSize: 13, letterSpacing: "-0.02em" }}>{today.judul}</div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 4, fontSize: 12, color: "var(--text-secondary)" }}>
          <span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}><Clock3 size={12} /> {today.tanggal} · {today.jam}</span>
        </div>

        {/* GPS pills */}
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginTop: 12 }}>
          {gps == null ? (
            <span className={`pill ${gpsLoading ? "pill-slate" : "pill-amber"}`}>
              <LocateFixed size={12} /> {gpsLoading ? "Mencari GPS..." : "GPS belum aktif"}
            </span>
          ) : (
            <span className="pill pill-emerald">
              <MapPin size={12} /> GPS ok ±{gps.acc ? Math.round(gps.acc) : "?"}m
            </span>
          )}
          {dist != null && (
            <span className={`pill ${inRadius ? "pill-emerald" : "pill-amber"}`}>
              {inRadius ? <ShieldCheck size={12} /> : <AlertTriangle size={12} />} jarak {dist}m
            </span>
          )}
          <button type="button" className="btn btn-ghost btn-sm" onClick={ambilGps} disabled={gpsLoading}>
            <LocateFixed size={12} /> Refresh GPS
          </button>
        </div>
        {gpsErr && (
          <div style={{ fontSize: 12, padding: "8px 10px", borderRadius: 10, background: "#fef2f2", color: "#b91c1c", border: "1px solid #fecaca", marginTop: 8 }}>
            {gpsErr}
          </div>
        )}

        {/* Peta mini — per HP kanan (iya) */}
        <div className="member-map-wrap" style={{ marginTop: 14 }}>
          <div style={{ width: "100%", height: "100%", background: "linear-gradient(135deg, #e0f2fe 0%, #fef3c7 45%, #f0dfc8 100%)", display: "grid", placeItems: "center", position: "relative" }}>
            <div style={{ width: 44, height: 44, borderRadius: 999, background: "rgba(208,56,4,0.14)", display: "grid", placeItems: "center", border: "2px solid var(--primary)" }}>
              <MapPin size={20} color="var(--primary)" />
            </div>
            <div style={{ position: "absolute", bottom: 8, left: 8, right: 8, background: "rgba(255,255,255,0.92)", border: "1px solid var(--line)", borderRadius: 10, padding: "6px 10px", fontSize: 11, color: "var(--text-secondary)", textAlign: "center" }}>
              {gps ? `${gps.lat.toFixed(5)}, ${gps.lng.toFixed(5)}` : today.lokasi} · ±{today.radiusM}m
            </div>
          </div>
        </div>
        <p className="muted" style={{ fontSize: 11, textAlign: "center", marginTop: 6 }}>Lokasi acara — pastikan GPS dalam radius</p>

        {/* Scanner polaroid */}
        <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
          <div className="member-polaroid-frame">
            <div id="qr-reader" style={{ borderRadius: 2, overflow: "hidden", border: scanning ? "2px solid var(--primary)" : "2px dashed var(--line)", background: "#0f172a", minHeight: scanning ? 220 : 0 }} />
            {!scanning && !qr && <div style={{ textAlign: "center", fontSize: 11, color: "var(--muted)", marginTop: 8, fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase" }}>Arahkan ke QR wilayah</div>}
          </div>
          {!scanning && !qr && (
            <button type="button" className="btn btn-primary" onClick={startScan} style={{ width: "100%" }}>
              <Camera size={16} /> Mulai Scan QR Wilayah
            </button>
          )}
          {scanning && (
            <button type="button" className="btn btn-ghost" onClick={stopScan} style={{ width: "100%" }}>
              <CameraOff size={16} /> Stop Kamera
            </button>
          )}
          {qr && (
            <span className="pill pill-emerald" style={{ justifyContent: "center", textTransform: "capitalize" }}>
              <QrCode size={12} /> QR ok — {qr.level}: {qr.nama}
            </span>
          )}
        </div>

        {msg && (
          <div style={{ fontSize: 12, padding: "8px 10px", borderRadius: 10, background: "#fef3c7", color: "#92400e", border: "1px solid #fde68a", marginTop: 10 }}>
            {msg}
          </div>
        )}

        {/* FAB bulat — per request: bulat */}
        <div style={{ display: "grid", placeItems: "center", marginTop: 16, gap: 8 }}>
          {!canHadir && <span className="pill pill-amber" style={{ fontSize: 11 }}>Aktifkan GPS & scan QR dulu</span>}
          <button type="button" className="member-fab" disabled={!canHadir} onClick={absenHadir} aria-label="Hadir">
            <span style={{ display: "grid", gap: 2, justifyItems: "center" }}>
              <ShieldCheck size={22} />
              <span>Check In</span>
            </span>
          </button>
        </div>
      </div>

      <div className="card">
        <h3 style={{ fontSize: 14, fontWeight: 800, marginBottom: 8 }}>Riwayat</h3>
        <div style={{ display: "grid", gap: 8 }}>
          {riwayat.map((r) => (
            <div key={r.id} style={{ display: "flex", gap: 10, alignItems: "center", padding: "10px 12px", borderRadius: 12, border: "1px solid var(--line)", background: "#fff" }}>
              <span className={`pill ${r.status === "hadir" ? "pill-emerald" : r.status === "izin" ? "pill-amber" : "pill-slate"}`} style={{ textTransform: "capitalize" }}>
                {r.status}
              </span>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 13, lineHeight: 1.2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.judul}</div>
                <div className="muted" style={{ fontSize: 11 }}>{r.tanggal} · {r.jam}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
