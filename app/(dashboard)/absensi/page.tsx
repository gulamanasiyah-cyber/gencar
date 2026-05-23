"use client";

import Topbar from "@/components/Topbar";

import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Swal from "sweetalert2";

interface KegiatanItem {
  id: string;
  judul: string;
  tanggal: string;
}

interface AbsensiItem {
  id: string;
  generusId: string;
  generusNama: string | null;
  generusNomorUnik: string | null;
  generusKategori: string | null;
  timestamp: string | null;
  keterangan: string | null;
}

interface GenerusResult {
  id: string;
  nomorUnik: string;
  nama: string;
  kategoriUsia: string;
}

function AbsensiContent() {
  const searchParams = useSearchParams();
  const [kegiatan, setKegiatan] = useState<KegiatanItem[]>([]);
  const [selectedKegiatan, setSelectedKegiatan] = useState<string>(searchParams.get("kegiatanId") || "");
  const [absensiList, setAbsensiList] = useState<AbsensiItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [scannerType, setScannerType] = useState<"camera" | "physical">("camera");
  const [scanMode, setScanMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<GenerusResult[]>([]);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [scanFeedback, setScanFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [physicalInput, setPhysicalInput] = useState("");
  const [userRole, setUserRole] = useState("");
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const scannerRef = useRef<{ stop: () => void } | null>(null);
  const scanLockRef = useRef(false); // prevents concurrent scan callbacks
  const physicalInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/kegiatan").then((r) => r.json()).then((d) => {
      if (Array.isArray(d)) {
        const offsetTz = new Date().getTimezoneOffset();
        const localToday = new Date(new Date().getTime() - (offsetTz * 60 * 1000));
        const todayStr = localToday.toISOString().split('T')[0];
        const upcoming = d.filter(k => k.tanggal >= todayStr);
        setKegiatan(upcoming);
      } else {
        setKegiatan([]);
      }
    });
    fetch("/api/profile").then(r => r.json()).then(d => setUserRole(d.role || ""));
  }, []);

  const fetchAbsensi = useCallback(async () => {
    if (!selectedKegiatan) { setAbsensiList([]); return; }
    setLoading(true);
    const res = await fetch(`/api/absensi?kegiatanId=${selectedKegiatan}`);
    const data = await res.json();
    setAbsensiList(Array.isArray(data) ? data : []);
    setLoading(false);
  }, [selectedKegiatan]);

  useEffect(() => { fetchAbsensi(); }, [fetchAbsensi]);

  // Handle focus for physical scanner
  useEffect(() => {
    if (scannerType === "physical" && scanMode) {
      physicalInputRef.current?.focus();
    }
  }, [scannerType, scanMode]);

  const handleSearch = async (q: string) => {
    setSearchQuery(q);
    if (!q) { setSearchResults([]); return; }
    const res = await fetch(`/api/absensi/search?q=${encodeURIComponent(q)}`);
    const data = await res.json();
    setSearchResults(Array.isArray(data) ? data : []);
  };

  const recordAbsensi = async (generusId: string) => {
    if (!selectedKegiatan) {
      setMessage({ type: "error", text: "Pilih kegiatan terlebih dahulu" });
      return;
    }
    const res = await fetch("/api/absensi", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kegiatanId: selectedKegiatan, generusId, keterangan: "hadir" }),
    });
    const data = await res.json();
    if (!res.ok && res.status !== 409) {
      Swal.fire({ icon: 'error', title: 'Gagal', text: data.error || "Gagal mencatat absensi", toast: true, position: 'top-end', timer: 3000, showConfirmButton: false });
      setMessage({ type: "error", text: data.error || "Gagal mencatat absensi" });
    } else if (res.status === 409) {
      Swal.fire({ icon: 'info', title: 'Sudah Ada', text: 'Generus sudah tercatat hadir!', toast: true, position: 'top-end', timer: 2000, showConfirmButton: false });
      setMessage({ type: "error", text: "Generus sudah tercatat hadir!" });
    } else {
      Swal.fire({ icon: 'success', title: 'Berhasil', text: 'Absensi berhasil dicatat!', toast: true, position: 'top-end', timer: 2000, showConfirmButton: false });
      setMessage({ type: "success", text: "Absensi berhasil dicatat!" });
      setSearchQuery("");
      setSearchResults([]);
      fetchAbsensi();
    }
    setTimeout(() => setMessage(null), 3000);
  };

  const startQRScan = async () => {
    if (!selectedKegiatan) {
      setMessage({ type: "error", text: "Pilih kegiatan terlebih dahulu" });
      return;
    }
    setScanMode(true);
    scanLockRef.current = false;
    
    if (scannerType === "camera") {
      try {
        const { Html5Qrcode } = await import("html5-qrcode");
        const scanner = new Html5Qrcode("qr-reader");
        scannerRef.current = scanner;
        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          async (decodedText: string) => {
            if (scanLockRef.current) return;
            scanLockRef.current = true;
            setScanFeedback(null);
            try {
              const res = await fetch("/api/absensi", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ kegiatanId: selectedKegiatan, generusId: decodedText, keterangan: "hadir" }),
              });
              const data = await res.json();
              if (res.status === 409) {
                setScanFeedback({ type: "error", text: `⚠️ Sudah tercatat hadir` });
              } else if (!res.ok) {
                setScanFeedback({ type: "error", text: `✗ ${data.error || "Gagal mencatat"}` });
              } else {
                setScanFeedback({ type: "success", text: `✓ ${data.generusNama || "Hadir dicatat!"}` });
                fetchAbsensi();
              }
            } catch {
              setScanFeedback({ type: "error", text: "✗ Koneksi gagal" });
            }
            setTimeout(() => {
              scanLockRef.current = false;
              setScanFeedback(null);
            }, 2000);
          },
          () => {}
        );
      } catch (e) {
        console.error("QR scanner error:", e);
        setMessage({ type: "error", text: "Gagal membuka kamera. Pastikan izin kamera diberikan." });
        setScanMode(false);
      }
    }
  };

  const handlePhysicalInput = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      const code = physicalInput.trim();
      if (!code) return;
      
      setPhysicalInput("");
      setScanFeedback({ type: "success", text: "Memproses..." });
      
      try {
        const res = await fetch("/api/absensi", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ kegiatanId: selectedKegiatan, generusId: code, keterangan: "hadir" }),
        });
        const data = await res.json();
        
        if (res.status === 409) {
          setScanFeedback({ type: "error", text: `⚠️ Sudah tercatat hadir` });
        } else if (!res.ok) {
          setScanFeedback({ type: "error", text: `✗ ${data.error || "Gagal mencatat"}` });
        } else {
          setScanFeedback({ type: "success", text: `✓ ${data.generusNama || "Hadir dicatat!"}` });
          fetchAbsensi();
        }
      } catch {
        setScanFeedback({ type: "error", text: "✗ Koneksi gagal" });
      }
      
      setTimeout(() => setScanFeedback(null), 2000);
    }
  };

  const stopScan = async () => {
    if (scannerRef.current) {
      try { await (scannerRef.current as any).stop(); } catch {}
      scannerRef.current = null;
    }
    setScanMode(false);
    setPhysicalInput("");
  };

  return (
    <div>
      <Topbar title="Absensi" role={userRole} />
      <div className="page-content">
        <div className="page-header">
          <div className="page-header-left">
            <h2>Sistem Absensi</h2>
            <p>Catat kehadiran menggunakan QR Code atau pencarian manual</p>
          </div>
        </div>

        {message && (
          <div className={`alert ${message.type === "success" ? "alert-success" : "alert-error"}`} style={{ marginBottom: 16 }}>
            {message.text}
          </div>
        )}

        <div className="responsive-grid-2" style={{ marginBottom: 20 }}>
          {/* Left: Scan & Search */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">Pilih Kegiatan</span>
            </div>
            <div className="card-body">
              <div className="form-group">
                <label className="form-label">Kegiatan <span className="required">*</span></label>
                <select className="form-control" value={selectedKegiatan} onChange={(e) => setSelectedKegiatan(e.target.value)}>
                  <option value="">-- Pilih Kegiatan --</option>
                  {kegiatan.map((k) => (
                    <option key={k.id} value={k.id}>{k.judul} ({k.tanggal})</option>
                  ))}
                </select>
              </div>

              <div style={{ borderTop: "1px solid var(--border)", paddingTop: 16, marginTop: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <div className="form-label" style={{ margin: 0 }}>Scan QR Code</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span className="text-sm text-muted">Mode:</span>
                    <select 
                      className="form-control text-sm" 
                      style={{ padding: "4px 8px", width: "auto" }}
                      value={scannerType}
                      onChange={(e) => {
                        setScannerType(e.target.value as any);
                        if (scanMode) stopScan();
                      }}
                    >
                      <option value="camera">📷 Kamera (Browser)</option>
                      <option value="physical">🔌 Mesin Scanner (Fisik)</option>
                    </select>
                  </div>
                </div>

                {!scanMode ? (
                  <button className="btn btn-primary btn-full" onClick={startQRScan} disabled={!selectedKegiatan}>
                    {scannerType === "camera" ? "📷 Buka Kamera Scan QR" : "🔌 Aktifkan Mesin Scanner"}
                  </button>
                ) : (
                  <div>
                    {scannerType === "camera" ? (
                      <div style={{ position: "relative" }}>
                        <div id="qr-reader" style={{ width: "100%", borderRadius: 8, overflow: "hidden" }} />
                        {scanFeedback && (
                          <div style={{
                            position: "absolute", bottom: 0, left: 0, right: 0,
                            padding: "10px 14px", textAlign: "center",
                            fontWeight: 600, fontSize: 14,
                            background: scanFeedback.type === "success" ? "rgba(21,128,61,0.92)" : "rgba(185,28,28,0.92)",
                            color: "white", borderBottomLeftRadius: 8, borderBottomRightRadius: 8,
                            zIndex: 10
                          }}>
                            {scanFeedback.text}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div style={{ 
                        padding: 24, 
                        border: "2px dashed var(--primary)", 
                        borderRadius: 8, 
                        textAlign: "center",
                        background: "var(--bg-light)",
                        position: "relative"
                      }}>
                        <div style={{ fontSize: 40, marginBottom: 12 }}>🔌</div>
                        <div style={{ fontWeight: 600, marginBottom: 4 }}>Mesin Scanner Aktif</div>
                        <p className="text-sm text-muted">Arahkan scanner ke QR Code dan tekan tombol scan di alat.</p>
                        
                        <input
                          ref={physicalInputRef}
                          type="text"
                          className="form-control"
                          style={{ position: "absolute", opacity: 0, pointerEvents: "none", top: 0, left: 0 }}
                          value={physicalInput}
                          onChange={(e) => setPhysicalInput(e.target.value)}
                          onKeyDown={handlePhysicalInput}
                          autoFocus
                          onBlur={(e) => {
                             // Keep focus for scanner unless stopping or switching modes
                             if (scanMode && scannerType === "physical") {
                               setTimeout(() => e.target.focus(), 100);
                             }
                          }}
                        />

                        <div style={{ position: "relative", zIndex: 1 }}>
                          <div style={{ fontSize: 40, marginBottom: 12 }}>{scanFeedback?.type === "success" ? "✅" : scanFeedback?.type === "error" ? "❌" : "🔌"}</div>
                          <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 4, color: "var(--text)" }}>
                            {scanFeedback ? (scanFeedback.type === "success" ? "Berhasil!" : "Gagal!") : "Mesin Scanner Aktif"}
                          </div>
                          <p className="text-sm text-muted">
                            {scanFeedback ? scanFeedback.text : "Arahkan scanner ke QR Code dan tekan tombol scan di alat."}
                          </p>
                          
                          {scanFeedback && (
                            <div style={{
                              marginTop: 16,
                              padding: "10px 16px",
                              borderRadius: 8,
                              fontWeight: 600,
                              background: scanFeedback.type === "success" ? "rgba(22,163,74,0.1)" : "rgba(220,38,38,0.1)",
                              color: scanFeedback.type === "success" ? "var(--success)" : "var(--danger)",
                              border: `1px solid ${scanFeedback.type === "success" ? "rgba(22,163,74,0.2)" : "rgba(220,38,38,0.2)"}`,
                              display: "inline-block"
                            }}>
                              {scanFeedback.text}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    <button className="btn btn-danger btn-full" style={{ marginTop: 12 }} onClick={stopScan}>
                      ✕ Stop Scan
                    </button>
                  </div>
                )}
              </div>

              <div style={{ borderTop: "1px solid var(--border)", paddingTop: 16, marginTop: 16 }}>
                <div className="form-label" style={{ marginBottom: 8 }}>Cari Manual</div>
                <div className="search-bar">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
                  </svg>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Nama atau nomor unik..."
                    value={searchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                  />
                </div>
                {searchResults.length > 0 && (
                  <div style={{ marginTop: 8, border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
                    {searchResults.map((g) => (
                      <div
                        key={g.id}
                        style={{ padding: "10px 14px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}
                        onClick={() => recordAbsensi(g.id)}
                      >
                        <div>
                          <div style={{ fontWeight: 500 }}>{g.nama}</div>
                          <div className="text-sm text-muted">{g.nomorUnik} • {g.kategoriUsia}</div>
                        </div>
                        <span className="badge badge-green">Catat</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right: Attendance list */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">Daftar Hadir</span>
              <span className="badge badge-blue">{absensiList.length} hadir</span>
            </div>
            {loading ? (
              <div className="loading"><div className="spinner" /></div>
            ) : absensiList.length === 0 ? (
              <div className="empty-state">
                <h3>Belum ada yang hadir</h3>
                <p>Scan QR code atau cari manual untuk mencatat</p>
              </div>
            ) : (
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Nama</th>
                      <th>Kategori</th>
                      <th>Waktu</th>
                    </tr>
                  </thead>
                  <tbody>
                    {absensiList.map((item, i) => (
                      <tr key={item.id}>
                        <td className="text-muted">{i + 1}</td>
                        <td>
                          <div style={{ fontWeight: 500 }}>{item.generusNama}</div>
                          <div className="text-sm text-muted" style={{ fontFamily: "monospace" }}>{item.generusNomorUnik}</div>
                        </td>
                        <td><span className="badge badge-blue">{item.generusKategori}</span></td>
                        <td className="text-sm text-muted">
                          {item.timestamp ? new Date(item.timestamp).toLocaleTimeString("id-ID") : "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AbsensiPage() {
  return (
    <Suspense fallback={<div className="loading"><div className="spinner" /></div>}>
      <AbsensiContent />
    </Suspense>
  );
}
