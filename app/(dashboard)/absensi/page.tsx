"use client";



import Topbar from "@/components/Topbar";

import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { QRCodeCanvas } from "qrcode.react";
import Swal from "sweetalert2";
import { BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface KegiatanItem {
  id: string;
  judul: string;
  deskripsi?: string | null;
  tanggal: string;
  jam?: string | null;
  desaId?: number | null;
  kelompokId?: number | null;
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
  desaId?: number | null;
  desaNama?: string | null;
  kelompokId?: number | null;
  kelompokNama?: string | null;
}

interface GenerusResult {
  id: string;
  nomorUnik: string;
  nama: string;
  kategoriUsia: string;
}

const BAR_COLORS = [
  "#2563eb", // Blue
  "#10b981", // Emerald
  "#f59e0b", // Amber
  "#ef4444", // Red
  "#8b5cf6", // Violet
  "#ec4899", // Pink
  "#06b6d4", // Cyan
  "#f43f5e", // Rose
  "#14b8a6", // Teal
  "#6366f1", // Indigo
  "#a855f7", // Purple
];

function AbsensiContent() {
  const searchParams = useSearchParams();
  const [allKegiatan, setAllKegiatan] = useState<KegiatanItem[]>([]);
  const [kegiatan, setKegiatan] = useState<KegiatanItem[]>([]);
  const [selectedKegiatan, setSelectedKegiatan] = useState<string>(searchParams.get("kegiatanId") || "");
  const [selectedBulan, setSelectedBulan] = useState<string>((new Date().getMonth() + 1).toString());
  const [selectedTahun, setSelectedTahun] = useState<string>(new Date().getFullYear().toString());
  const [tingkatFilter, setTingkatFilter] = useState("");
  const [absensiList, setAbsensiList] = useState<AbsensiItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [userRole, setUserRole] = useState("");
  const [userDesaId, setUserDesaId] = useState<number | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<GenerusResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const [desaFilter, setDesaFilter] = useState("");
  const [kelompokFilter, setKelompokFilter] = useState("");
  const [kategoriFilter, setKategoriFilter] = useState("");
  const [desas, setDesas] = useState<{id: number, nama: string}[]>([]);
  const [kelompoks, setKelompoks] = useState<{id: number, nama: string}[]>([]);

  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`/api/generus?search=${encodeURIComponent(searchQuery)}&limit=10`);
        const data = await res.json();
        setSearchResults(data.data || []);
      } catch (err) {
        console.error("Search error:", err);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleManualHadir = async (user: GenerusResult) => {
    if (!selectedKegiatan) return;
    
    try {
      const res = await fetch("/api/absensi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kegiatanId: selectedKegiatan,
          generusId: user.id,
          keterangan: "hadir"
        })
      });
      
      const data = await res.json();
      if (res.ok) {
        Swal.fire({
          icon: 'success',
          title: 'Berhasil',
          text: `${user.nama} berhasil dicatat hadir.`,
          timer: 1500,
          showConfirmButton: false
        });
        setSearchQuery(""); // Clear search after successful add
        setSearchResults([]);
        fetchAbsensi(true);
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Gagal',
          text: data.error || 'Gagal mencatat kehadiran'
        });
      }
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Terjadi kesalahan jaringan'
      });
    }
  };

  useEffect(() => {
    fetch("/api/kegiatan").then((r) => r.json()).then((d) => {
      if (Array.isArray(d)) {
        setAllKegiatan(d);
      } else {
        setAllKegiatan([]);
      }
    });
    fetch("/api/profile").then(r => r.json()).then(d => {
      setUserRole(d.role || "");
      setUserDesaId(d.desaId || null);
      if (["admin", "pengurus_daerah", "kmm_daerah"].includes(d.role)) {
        fetch("/api/admin/desa").then(r => r.json()).then(setDesas);
        fetch("/api/admin/kelompok").then(r => r.json()).then(setKelompoks);
      } else if (["desa", "kelompok"].includes(d.role) && d.desaId) {
        fetch(`/api/auth/kelompok?desaId=${d.desaId}`).then(r => r.json()).then(setKelompoks);
      }
    });
  }, []);

  useEffect(() => {
    const paddedBulan = selectedBulan.padStart(2, '0');
    const prefix = `${selectedTahun}-${paddedBulan}`;
    const filtered = allKegiatan.filter(k => {
      const matchDate = k.tanggal.startsWith(prefix);
      
      let matchTingkat = true;
      if (tingkatFilter === "daerah") {
        matchTingkat = !k.desaId && !k.kelompokId;
      } else if (tingkatFilter === "desa") {
        matchTingkat = !!k.desaId && !k.kelompokId;
      } else if (tingkatFilter === "kelompok") {
        matchTingkat = !!k.kelompokId;
      }

      return matchDate && matchTingkat;
    });
    setKegiatan(filtered);
  }, [allKegiatan, selectedBulan, selectedTahun, tingkatFilter]);

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

  const filteredAbsensiList = absensiList.filter((item) => {
    let match = true;
    if (desaFilter) {
      match = match && item.desaId === Number(desaFilter);
    }
    if (kelompokFilter) {
      match = match && item.kelompokId === Number(kelompokFilter);
    }
    if (kategoriFilter) {
      match = match && item.generusKategori === kategoriFilter;
    }
    return match;
  });

  const getComparisonData = () => {
    const groups: Record<string, { name: string; kehadiranRaw: number }> = {};
    
    const isComparingDesa = !desaFilter && !["desa", "kelompok"].includes(userRole);

    if (isComparingDesa) {
      desas.forEach(d => {
        groups[d.nama] = { name: d.nama, kehadiranRaw: 0 };
      });
      groups["Lainnya"] = { name: "Lainnya", kehadiranRaw: 0 };

      let totalKehadiran = 0;
      absensiList.forEach(item => {
        const key = item.desaNama || "Lainnya";
        if (!groups[key]) {
          groups[key] = { name: key, kehadiranRaw: 0 };
        }
        groups[key].kehadiranRaw += 1;
        totalKehadiran += 1;
      });

      if (groups["Lainnya"] && groups["Lainnya"].kehadiranRaw === 0) {
        delete groups["Lainnya"];
      }

      return Object.values(groups).map(g => ({
        name: g.name,
        kehadiran: totalKehadiran > 0 ? Number(((g.kehadiranRaw / totalKehadiran) * 100).toFixed(1)) : 0,
        kehadiranRaw: g.kehadiranRaw
      }));
    } else {
      const targetDesaId = (userRole === "desa" || userRole === "kelompok") ? userDesaId : Number(desaFilter);
      
      if (targetDesaId) {
        kelompoks
          .filter(k => (userRole === "desa" || userRole === "kelompok") ? true : (k as any).desaId === targetDesaId)
          .forEach(k => {
            groups[k.nama] = { name: k.nama, kehadiranRaw: 0 };
          });
      }
      groups["Lainnya"] = { name: "Lainnya", kehadiranRaw: 0 };

      const desaAbsensi = (userRole === "desa" || userRole === "kelompok") 
        ? absensiList 
        : absensiList.filter(item => item.desaId === targetDesaId);

      let totalKehadiran = 0;
      desaAbsensi.forEach(item => {
        const key = item.kelompokNama || "Lainnya";
        if (!groups[key]) {
          groups[key] = { name: key, kehadiranRaw: 0 };
        }
        groups[key].kehadiranRaw += 1;
        totalKehadiran += 1;
      });

      if (groups["Lainnya"] && groups["Lainnya"].kehadiranRaw === 0) {
        delete groups["Lainnya"];
      }

      return Object.values(groups).map(g => ({
        name: g.name,
        kehadiran: totalKehadiran > 0 ? Number(((g.kehadiranRaw / totalKehadiran) * 100).toFixed(1)) : 0,
        kehadiranRaw: g.kehadiranRaw
      }));
    }
  };

  const chartData = getComparisonData();

  const handleExportExcel = () => {
    const selectedKegiatanItem = allKegiatan.find(k => k.id === selectedKegiatan);
    const kegiatanTitle = selectedKegiatanItem?.judul || "Kegiatan";
    const kegiatanTanggal = selectedKegiatanItem?.tanggal || "";
    const kegiatanDeskripsi = selectedKegiatanItem?.deskripsi || "-";

    const exportData = filteredAbsensiList.map((item, index) => ({
      No: index + 1,
      Kegiatan: kegiatanTitle,
      "Deskripsi Kegiatan": kegiatanDeskripsi,
      Nama: item.generusNama || "-",
      "No. Unik": item.generusNomorUnik || "-",
      Kategori: item.generusKategori || "-",
      "Jenis Kelamin": item.generusJenisKelamin === "L" ? "Laki-laki" : (item.generusJenisKelamin === "P" ? "Perempuan" : "-"),
      Desa: item.desaNama || "-",
      Kelompok: item.kelompokNama || "-",
      Keterangan: item.keterangan || "Hadir",
      Waktu: item.timestamp ? new Date(item.timestamp).toLocaleTimeString("id-ID") : "-"
    }));
    
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Kehadiran");
    XLSX.writeFile(wb, `Kehadiran_${kegiatanTitle.replace(/\s+/g, "_")}_${kegiatanTanggal}.xlsx`);
  };

  const handleExportPDF = () => {
    const selectedKegiatanItem = allKegiatan.find(k => k.id === selectedKegiatan);
    const kegiatanTitle = selectedKegiatanItem?.judul || "Kegiatan";
    const kegiatanTanggal = selectedKegiatanItem?.tanggal || "";
    const kegiatanDeskripsi = selectedKegiatanItem?.deskripsi || "-";

    const doc = new jsPDF();
    doc.text(`Data Kehadiran: ${kegiatanTitle}`, 14, 15);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Tanggal Kegiatan: ${kegiatanTanggal} | Total Hadir: ${filteredAbsensiList.length}`, 14, 22);

    const tableColumn = ["No", "Kegiatan", "Deskripsi", "Nama", "No. Unik", "Kategori", "JK", "Desa", "Kelompok", "Keterangan", "Waktu"];
    const tableRows = filteredAbsensiList.map((item, index) => [
      index + 1,
      kegiatanTitle,
      kegiatanDeskripsi,
      item.generusNama || "-",
      item.generusNomorUnik || "-",
      item.generusKategori || "-",
      item.generusJenisKelamin || "-",
      item.desaNama || "-",
      item.kelompokNama || "-",
      item.keterangan || "Hadir",
      item.timestamp ? new Date(item.timestamp).toLocaleTimeString("id-ID") : "-"
    ]);

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 27,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [59, 130, 246] }
    });

    doc.save(`Kehadiran_${kegiatanTitle.replace(/\s+/g, "_")}_${kegiatanTanggal}.pdf`);
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
          {selectedKegiatan && (
            <div className="page-header-actions" style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              <button className="btn btn-success" onClick={handleExportExcel} style={{ display: "flex", alignItems: "center", gap: "6px", flex: "1 1 auto" }} disabled={absensiList.length === 0}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
                </svg>
                Excel
              </button>
              <button className="btn btn-danger" onClick={handleExportPDF} style={{ display: "flex", alignItems: "center", gap: "6px", flex: "1 1 auto" }} disabled={absensiList.length === 0}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
                </svg>
                PDF
              </button>
            </div>
          )}
        </div>

        {message && (
          <div className={`alert ${message.type === "success" ? "alert-success" : "alert-error"}`} style={{ marginBottom: 16 }}>
            {message.text}
          </div>
        )}

        {selectedKegiatan && (
          <div className="card" style={{ marginBottom: "20px" }}>
            <div className="card-header">
              <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 600 }}>
                {(!desaFilter && !["desa", "kelompok"].includes(userRole)) ? "Grafik Perbandingan Kehadiran Antar-Desa" : "Grafik Perbandingan Kehadiran Antar-Kelompok"}
              </h3>
            </div>
            <div className="card-body" style={{ padding: "20px" }}>
              {chartData.length > 0 ? (
                <div>
                  <div style={{ width: '100%', overflowX: 'auto', overflowY: 'hidden', paddingBottom: "10px" }}>
                    <div style={{ height: 300, minWidth: `${Math.max(chartData.length * 120, 600)}px` }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} />
                          <YAxis 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fill: '#64748b', fontSize: 12 }} 
                            domain={[0, 100]} 
                            tickFormatter={(tick) => `${tick}%`}
                          />
                          <Tooltip 
                            cursor={{ fill: '#f1f5f9' }} 
                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} 
                            formatter={(value: any, name: any, props: any) => {
                              const raw = props.payload.kehadiranRaw;
                              return [`${value}% (${raw} orang)`, name];
                            }}
                          />
                          <Bar dataKey="kehadiran" name="Kehadiran" radius={[4, 4, 0, 0]}>
                            {chartData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={BAR_COLORS[index % BAR_COLORS.length]} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                  {/* Color Legend */}
                  <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "16px", marginTop: "16px", padding: "12px", background: "var(--bg)", borderRadius: "8px", border: "1px solid var(--border)" }}>
                    {chartData.map((entry, index) => (
                      <div key={entry.name} style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12.5px", fontWeight: 500, color: "var(--text)" }}>
                        <span style={{ display: "inline-block", width: "12px", height: "12px", borderRadius: "3px", backgroundColor: BAR_COLORS[index % BAR_COLORS.length] }} />
                        {entry.name}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p style={{ textAlign: "center", color: "#64748b", margin: "40px 0" }}>Tidak ada data untuk ditampilkan pada grafik.</p>
              )}
            </div>
          </div>
        )}

        <div className="responsive-grid-2" style={{ marginBottom: 20 }}>
          {/* Left: Scan & Search */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">Pilih Kegiatan</span>
            </div>
            <div className="card-body">
              <div className="form-row" style={{ marginBottom: "16px" }}>
                <div style={{ flex: 1 }}>
                  <label className="form-label" style={{ fontSize: "12px" }}>Bulan</label>
                  <select className="form-control" value={selectedBulan} onChange={(e) => { setSelectedBulan(e.target.value); setSelectedKegiatan(""); }}>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                      <option key={m} value={m.toString()}>
                        {new Date(2000, m - 1, 1).toLocaleString('id-ID', { month: 'long' })}
                      </option>
                    ))}
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label className="form-label" style={{ fontSize: "12px" }}>Tahun</label>
                  <select className="form-control" value={selectedTahun} onChange={(e) => { setSelectedTahun(e.target.value); setSelectedKegiatan(""); }}>
                    {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map((y) => (
                      <option key={y} value={y.toString()}>{y}</option>
                    ))}
                  </select>
                </div>
              </div>

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
                <>
                  {(() => {
                    const k = kegiatan.find(x => x.id === selectedKegiatan);
                    if (!k) return false;
                    
                    if (userRole === "desa") {
                      if (k.kelompokId !== null || k.desaId === null) return false;
                    }
                    
                    if (userRole === "kelompok") {
                      if (k.kelompokId === null) return false;
                    }
                    
                    return true;
                  })() && (
                    <div style={{ borderTop: "1px solid var(--border)", paddingTop: 16, marginTop: 16 }}>
                      <div className="form-label" style={{ marginBottom: 12 }}>Pencarian Manual</div>
                    <div style={{ position: "relative" }}>
                      <input 
                        type="text" 
                        className="form-control" 
                        placeholder="Ketik nama lengkap atau nomor unik..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                      {isSearching && <div style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)" }} className="spinner-small" />}
                      
                      {searchResults.length > 0 && searchQuery.length >= 2 && (
                        <div style={{ 
                          position: "absolute", 
                          top: "100%", 
                          left: 0, 
                          right: 0, 
                          background: "white", 
                          border: "1px solid var(--border)", 
                          borderRadius: 4, 
                          maxHeight: 200, 
                          overflowY: "auto", 
                          zIndex: 10,
                          boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)"
                        }}>
                          {searchResults.map((user) => (
                            <div 
                              key={user.id} 
                              style={{ 
                                padding: "8px 12px", 
                                borderBottom: "1px solid var(--border)", 
                                cursor: "pointer",
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center"
                              }}
                              onClick={() => handleManualHadir(user)}
                              onMouseOver={(e) => e.currentTarget.style.backgroundColor = "var(--bg-light)"}
                              onMouseOut={(e) => e.currentTarget.style.backgroundColor = "white"}
                            >
                              <div>
                                <div style={{ fontWeight: 500, fontSize: 14 }}>{user.nama}</div>
                                <div style={{ fontSize: 12, color: "var(--muted)" }}>{user.nomorUnik} • {user.kategoriUsia}</div>
                              </div>
                              <button className="btn btn-sm btn-primary" style={{ padding: "4px 8px", fontSize: 12 }}>
                                Hadir
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {searchResults.length === 0 && searchQuery.length >= 2 && !isSearching && (
                        <div style={{ 
                          position: "absolute", 
                          top: "100%", 
                          left: 0, 
                          right: 0, 
                          background: "white", 
                          border: "1px solid var(--border)", 
                          borderRadius: 4, 
                          padding: "12px",
                          textAlign: "center",
                          color: "var(--muted)",
                          zIndex: 10,
                          boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)"
                        }}>
                          Tidak ada data ditemukan
                        </div>
                      )}
                    </div>
                      <p className="text-sm text-muted" style={{ marginTop: 8 }}>
                        Cari peserta dan klik tombol Hadir untuk mencatat kehadiran secara manual.
                      </p>
                    </div>
                  )}

                  {(() => {
                    const k = kegiatan.find(x => x.id === selectedKegiatan);
                    if (!k) return false;
                    
                    if (userRole === "desa") {
                      // Hide if not Pengajian Desa
                      if (k.kelompokId !== null || k.desaId === null) return false;
                    }
                    
                    if (userRole === "kelompok") {
                      // Hide if not Pengajian Kelompok
                      if (k.kelompokId === null) return false;
                    }
                    
                    return true;
                  })() && (
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
                </>
              )}
            </div>
          </div>

          {/* Right: Attendance list */}
          <div className="card">
            <div className="card-header" style={{ display: "flex", flexDirection: "column", gap: "16px", alignItems: "stretch" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
                <span className="card-title">Daftar Hadir</span>
                <span className="badge badge-blue">{filteredAbsensiList.length} total hadir</span>
              </div>
              
              <div className="filter-selects-container" style={{ display: "flex", gap: "8px", flexWrap: "wrap", width: "100%" }}>
                <select 
                  className="form-control" 
                  style={{ flex: "1 1 180px", minWidth: "130px", padding: "8px 12px", fontSize: "13px", height: "38px", borderRadius: "8px" }}
                  value={tingkatFilter}
                  onChange={(e) => { setTingkatFilter(e.target.value); setSelectedKegiatan(""); }}
                >
                  <option value="">Semua Tingkat</option>
                  {["admin", "pengurus_daerah", "kmm_daerah"].includes(userRole) && (
                    <option value="daerah">Pengajian Daerah</option>
                  )}
                  <option value="desa">Pengajian Desa</option>
                  <option value="kelompok">Pengajian Kelompok</option>
                </select>

                {["admin", "pengurus_daerah", "kmm_daerah"].includes(userRole) && (
                  <select 
                    className="form-control" 
                    style={{ flex: "1 1 180px", minWidth: "130px", padding: "8px 12px", fontSize: "13px", height: "38px", borderRadius: "8px" }}
                    value={desaFilter}
                    onChange={(e) => { setDesaFilter(e.target.value); setKelompokFilter(""); }}
                  >
                    <option value="">Semua Desa</option>
                    {desas.map(d => <option key={d.id} value={d.id}>{d.nama}</option>)}
                  </select>
                )}

                {["admin", "pengurus_daerah", "kmm_daerah", "desa"].includes(userRole) && (
                  <select 
                    className="form-control" 
                    style={{ flex: "1 1 180px", minWidth: "130px", padding: "8px 12px", fontSize: "13px", height: "38px", borderRadius: "8px" }}
                    value={kelompokFilter}
                    onChange={(e) => setKelompokFilter(e.target.value)}
                  >
                    <option value="">Semua Kelompok</option>
                    {kelompoks
                      .filter(k => (userRole === "desa") ? true : (!desaFilter || (k as any).desaId === Number(desaFilter)))
                      .map(k => <option key={k.id} value={k.id}>{k.nama}</option>)}
                  </select>
                )}

                <select 
                  className="form-control" 
                  style={{ flex: "1 1 180px", minWidth: "130px", padding: "8px 12px", fontSize: "13px", height: "38px", borderRadius: "8px" }}
                  value={kategoriFilter}
                  onChange={(e) => setKategoriFilter(e.target.value)}
                >
                  <option value="">Semua Kategori</option>
                  <option value="Generus">Generus</option>
                  <option value="Usia Mandiri">Usia Mandiri</option>
                </select>
              </div>
            </div>
            
            {selectedKegiatan && filteredAbsensiList.length > 0 && (
              <div className="stats-grid" style={{ padding: "16px", borderBottom: "1px solid var(--border)", background: "var(--bg-light)", marginBottom: 0, gap: "12px" }}>
                <div style={{ background: "white", padding: "12px", borderRadius: "8px", border: "1px solid var(--border)", textAlign: "center" }}>
                  <div style={{ fontSize: "11px", color: "var(--muted)", fontWeight: 600, textTransform: "uppercase", marginBottom: "4px" }}>Laki-laki</div>
                  <div style={{ fontSize: "18px", fontWeight: 700, color: "var(--primary)" }}>{filteredAbsensiList.filter(a => a.generusJenisKelamin === "L").length}</div>
                </div>
                <div style={{ background: "white", padding: "12px", borderRadius: "8px", border: "1px solid var(--border)", textAlign: "center" }}>
                  <div style={{ fontSize: "11px", color: "var(--muted)", fontWeight: 600, textTransform: "uppercase", marginBottom: "4px" }}>Perempuan</div>
                  <div style={{ fontSize: "18px", fontWeight: 700, color: "#ec4899" }}>{filteredAbsensiList.filter(a => a.generusJenisKelamin === "P").length}</div>
                </div>
                <div style={{ background: "white", padding: "12px", borderRadius: "8px", border: "1px solid var(--border)", textAlign: "center" }}>
                  <div style={{ fontSize: "11px", color: "var(--muted)", fontWeight: 600, textTransform: "uppercase", marginBottom: "4px" }}>Generus</div>
                  <div style={{ fontSize: "18px", fontWeight: 700, color: "#10b981" }}>{filteredAbsensiList.filter(a => a.generusKategori === "Generus").length}</div>
                </div>
                <div style={{ background: "white", padding: "12px", borderRadius: "8px", border: "1px solid var(--border)", textAlign: "center" }}>
                  <div style={{ fontSize: "11px", color: "var(--muted)", fontWeight: 600, textTransform: "uppercase", marginBottom: "4px" }}>Usia Mandiri</div>
                  <div style={{ fontSize: "18px", fontWeight: 700, color: "#f59e0b" }}>{filteredAbsensiList.filter(a => a.generusKategori === "Usia Mandiri").length}</div>
                </div>
              </div>
            )}

            {!selectedKegiatan ? (
              <div className="empty-state" style={{ padding: "40px 20px", textAlign: "center" }}>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="1" style={{ margin: "0 auto 16px" }}>
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <line x1="16" y1="13" x2="8" y2="13"></line>
                  <line x1="16" y1="17" x2="8" y2="17"></line>
                  <polyline points="10 9 9 9 8 9"></polyline>
                </svg>
                <h3 style={{ fontSize: "16px", fontWeight: 600, color: "var(--text)" }}>Pilih kegiatan terlebih dahulu</h3>
                <p style={{ color: "var(--muted)", fontSize: "14px", marginTop: "8px" }}>Silakan pilih kegiatan di panel sebelah kiri untuk melihat daftar hadir.</p>
              </div>
            ) : loading ? (
              <div className="loading"><div className="spinner" /></div>
            ) : filteredAbsensiList.length === 0 ? (
              <div className="empty-state">
                <h3>Belum ada yang hadir</h3>
                <p>Scan QR code, sistem akan mencatat kehadiran</p>
              </div>
            ) : (
              <div className="table-wrapper">
                <table className="responsive-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Kegiatan & Deskripsi</th>
                      <th>Nama</th>
                      <th>Kategori</th>
                      <th>Waktu</th>
                      <th>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAbsensiList.map((item, i) => (
                      <tr key={item.id}>
                        <td className="text-muted" data-label="#">{i + 1}</td>
                        <td data-label="Kegiatan & Deskripsi">
                          <div style={{ fontWeight: 500 }}>{allKegiatan.find(k => k.id === selectedKegiatan)?.judul || "-"}</div>
                          <div className="text-sm text-muted" style={{ maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis" }}>{allKegiatan.find(k => k.id === selectedKegiatan)?.deskripsi || "-"}</div>
                        </td>
                        <td data-label="Nama">
                          <div style={{ fontWeight: 500 }}>{item.generusNama}</div>
                          <div className="text-sm text-muted" style={{ fontFamily: "monospace", marginBottom: "2px" }}>{item.generusNomorUnik}</div>
                          {(item.desaNama || item.kelompokNama) && (
                            <div className="text-sm text-muted" style={{ fontSize: "11px" }}>{item.desaNama} {item.desaNama && item.kelompokNama ? '•' : ''} {item.kelompokNama}</div>
                          )}
                        </td>
                        <td data-label="Kategori"><span className="badge badge-blue">{item.generusKategori}</span></td>
                        <td className="text-sm text-muted" data-label="Waktu">
                          {item.timestamp ? new Date(item.timestamp).toLocaleTimeString("id-ID") : "-"}
                        </td>
                        <td data-label="Aksi">
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
