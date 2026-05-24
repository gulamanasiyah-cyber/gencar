"use client";

import Topbar from "@/components/Topbar";

import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { QRCodeCanvas } from "qrcode.react";
import Swal from "sweetalert2";

interface KegiatanItem {
  id: string;
  judul: string;
  tanggal: string;
  jam?: string | null;
}

interface AbsensiItem {
  id: string;
  generusId: string;
  generusNama: string | null;
  generusNomorUnik: string | null;
  generusKategori: string | null;
  generusJenisKelamin: string | null;
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
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [userRole, setUserRole] = useState("");

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

  const fetchAbsensi = useCallback(async (isPolling = false) => {
    if (!selectedKegiatan) { setAbsensiList([]); return; }
    if (!isPolling) setLoading(true);
    const res = await fetch(`/api/absensi?kegiatanId=${selectedKegiatan}`);
    const data = await res.json();
    setAbsensiList(Array.isArray(data) ? data : []);
    if (!isPolling) setLoading(false);
  }, [selectedKegiatan]);

  useEffect(() => {
    fetchAbsensi();

    // Polling setiap 5 detik
    if (selectedKegiatan) {
      const interval = setInterval(() => {
        fetchAbsensi(true);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [fetchAbsensi, selectedKegiatan]);



  const downloadQRCode = () => {
    const canvas = document.getElementById("qrCodeCanvas") as HTMLCanvasElement;
    if (canvas) {
      const pngUrl = canvas.toDataURL("image/png").replace("image/png", "image/octet-stream");
      let downloadLink = document.createElement("a");
      downloadLink.href = pngUrl;
      const selectedItem = kegiatan.find(k => k.id === selectedKegiatan);
      downloadLink.download = `QRCode_${selectedItem?.judul?.replace(/\s+/g, "_") || "Kegiatan"}.png`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
    }
  };

  const handleDelete = async (id: string, nama: string | null) => {
    const result = await Swal.fire({
      title: 'Hapus Kehadiran?',
      text: `Apakah Anda yakin ingin membatalkan kehadiran ${nama || 'peserta ini'}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Ya, Hapus',
      cancelButtonText: 'Batal',
      confirmButtonColor: '#ef4444'
    });

    if (result.isConfirmed) {
      try {
        const res = await fetch(`/api/absensi?id=${id}`, { method: 'DELETE' });
        if (res.ok) {
          Swal.fire({ icon: 'success', title: 'Berhasil', text: 'Data kehadiran dihapus', timer: 1500, showConfirmButton: false });
          fetchAbsensi(true);
        } else {
          const data = await res.json();
          Swal.fire({ icon: 'error', title: 'Gagal', text: data.error || 'Gagal menghapus data' });
        }
      } catch (err) {
        Swal.fire({ icon: 'error', title: 'Error', text: 'Terjadi kesalahan jaringan' });
      }
    }
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

              {selectedKegiatan && (
                <div style={{ borderTop: "1px solid var(--border)", paddingTop: 16, marginTop: 16 }}>
                  <div className="form-label" style={{ marginBottom: 12 }}>QR Code Kegiatan</div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: 24, background: "white", borderRadius: 8, border: "1px solid var(--border)" }}>
                    <QRCodeCanvas
                      id="qrCodeCanvas"
                      value={typeof window !== "undefined" ? `${window.location.origin}/hadir?kegiatanId=${selectedKegiatan}` : ""}
                      size={200}
                      level={"M"}
                      includeMargin={true}
                    />
                    <div style={{ marginTop: 16, textAlign: "center", fontWeight: 500, color: "var(--text)" }}>
                      {kegiatan.find(k => k.id === selectedKegiatan)?.judul}
                    </div>
                    <div className="text-sm text-muted" style={{ textAlign: "center", marginTop: 4 }}>
                      {kegiatan.find(k => k.id === selectedKegiatan)?.tanggal} • {kegiatan.find(k => k.id === selectedKegiatan)?.jam || "-"}
                    </div>
                    <p className="text-sm text-muted" style={{ textAlign: "center", marginTop: 16, marginBottom: 16 }}>
                      Generus dapat memindai QR Code ini untuk mencatat kehadiran.
                    </p>
                    <button className="btn btn-primary" onClick={downloadQRCode}>
                      ⬇️ Unduh Barcode
                    </button>
                  </div>
                </div>
              )}


            </div>
          </div>

          {/* Right: Attendance list */}
          <div className="card">
            <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span className="card-title">Daftar Hadir</span>
              <span className="badge badge-blue">{absensiList.length} total hadir</span>
            </div>
            
            {selectedKegiatan && absensiList.length > 0 && (
              <div style={{ padding: "16px", borderBottom: "1px solid var(--border)", display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "12px", background: "var(--bg-light)" }}>
                <div style={{ background: "white", padding: "12px", borderRadius: "8px", border: "1px solid var(--border)", textAlign: "center" }}>
                  <div style={{ fontSize: "11px", color: "var(--muted)", fontWeight: 600, textTransform: "uppercase", marginBottom: "4px" }}>Laki-laki</div>
                  <div style={{ fontSize: "18px", fontWeight: 700, color: "var(--primary)" }}>{absensiList.filter(a => a.generusJenisKelamin === "L").length}</div>
                </div>
                <div style={{ background: "white", padding: "12px", borderRadius: "8px", border: "1px solid var(--border)", textAlign: "center" }}>
                  <div style={{ fontSize: "11px", color: "var(--muted)", fontWeight: 600, textTransform: "uppercase", marginBottom: "4px" }}>Perempuan</div>
                  <div style={{ fontSize: "18px", fontWeight: 700, color: "#ec4899" }}>{absensiList.filter(a => a.generusJenisKelamin === "P").length}</div>
                </div>
                <div style={{ background: "white", padding: "12px", borderRadius: "8px", border: "1px solid var(--border)", textAlign: "center" }}>
                  <div style={{ fontSize: "11px", color: "var(--muted)", fontWeight: 600, textTransform: "uppercase", marginBottom: "4px" }}>Generus</div>
                  <div style={{ fontSize: "18px", fontWeight: 700, color: "#10b981" }}>{absensiList.filter(a => a.generusKategori === "Generus").length}</div>
                </div>
                <div style={{ background: "white", padding: "12px", borderRadius: "8px", border: "1px solid var(--border)", textAlign: "center" }}>
                  <div style={{ fontSize: "11px", color: "var(--muted)", fontWeight: 600, textTransform: "uppercase", marginBottom: "4px" }}>Usia Mandiri</div>
                  <div style={{ fontSize: "18px", fontWeight: 700, color: "#f59e0b" }}>{absensiList.filter(a => a.generusKategori === "Usia Mandiri").length}</div>
                </div>
              </div>
            )}

            {loading ? (
              <div className="loading"><div className="spinner" /></div>
            ) : absensiList.length === 0 ? (
              <div className="empty-state">
                <h3>Belum ada yang hadir</h3>
                <p>Scan QR code, sistem akan mencatat kehadiran</p>
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
                      <th>Aksi</th>
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
                        <td>
                          <button 
                            style={{ padding: "4px 8px", background: "none", border: "none", color: "var(--danger)", cursor: "pointer", display: "flex", alignItems: "center" }}
                            onClick={() => handleDelete(item.id, item.generusNama)}
                            title="Hapus Kehadiran"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                          </button>
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
