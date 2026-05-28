"use client";

import Topbar from "@/components/Topbar";

import { useState, useEffect, useCallback } from "react";
import Swal from "sweetalert2";
import { BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface KegiatanItem {
  id: string;
  judul: string;
  deskripsi: string | null;
  tanggal: string;
  jam?: string | null;
  lokasi: string | null;
  desaNama: string | null;
  kelompokNama: string | null;
  desaId?: number | null;
  kelompokId?: number | null;
  createdAt: string | null;
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

export default function KegiatanPage() {
  const [data, setData] = useState<KegiatanItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<KegiatanItem | null>(null);
  const [userRole, setUserRole] = useState("");
  const [userDesaId, setUserDesaId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<"aktif" | "riwayat">("aktif");

  const [filterDesaId, setFilterDesaId] = useState<string>("");
  const [filterKelompokId, setFilterKelompokId] = useState<string>("");
  const [filterBulan, setFilterBulan] = useState<string>("");
  const [filterTahun, setFilterTahun] = useState<string>("");
  const [filterTingkat, setFilterTingkat] = useState<string>("");
  const [desaList, setDesaList] = useState<{ id: number; nama: string }[]>([]);
  const [kelompokList, setKelompokList] = useState<{ id: number; nama: string }[]>([]);

  useEffect(() => {
    fetch("/api/auth/desa").then(r => r.json()).then(setDesaList).catch(console.error);
  }, []);

  useEffect(() => {
    const fetchDesaId = (userRole === "desa" || userRole === "kelompok") ? userDesaId : filterDesaId;
    
    if (!fetchDesaId) {
      if (["admin", "pengurus_daerah", "kmm_daerah"].includes(userRole)) {
        fetch("/api/admin/kelompok")
          .then(r => r.json())
          .then(setKelompokList)
          .catch(console.error);
      } else {
        setKelompokList([]);
      }
      setFilterKelompokId("");
      return;
    }
    fetch(`/api/auth/kelompok?desaId=${fetchDesaId}`)
      .then(r => r.json())
      .then(setKelompokList)
      .catch(console.error);
  }, [filterDesaId, userRole, userDesaId]);

  const todayStr = new Date().toLocaleDateString('en-CA'); // Gets YYYY-MM-DD in local time
  
  const filteredData = data.filter(item => {
    if (filterDesaId && item.desaId !== Number(filterDesaId)) return false;
    if (filterKelompokId && item.kelompokId !== Number(filterKelompokId)) return false;
    
    if (filterBulan || filterTahun) {
      const dateObj = new Date(item.tanggal);
      const m = (dateObj.getMonth() + 1).toString().padStart(2, '0');
      const y = dateObj.getFullYear().toString();
      
      if (filterBulan && m !== filterBulan) return false;
      if (filterTahun && y !== filterTahun) return false;
    }
    
    if (filterTingkat === "daerah" && (item.desaId || item.kelompokId)) return false;
    if (filterTingkat === "desa" && (!item.desaId || item.kelompokId)) return false;
    if (filterTingkat === "kelompok" && !item.kelompokId) return false;

    return true;
  });

  const activeData = filteredData.filter(item => item.tanggal >= todayStr);
  const historyData = filteredData.filter(item => item.tanggal < todayStr);
  const displayData = activeTab === "aktif" ? activeData : historyData;

  const isComparingDesa = !filterDesaId && ["admin", "pengurus_daerah", "kmm_daerah"].includes(userRole) && filterTingkat !== "kelompok";

  const getComparisonData = () => {
    const groups: Record<string, { name: string; mendatang: number; riwayat: number }> = {};
    
    if (isComparingDesa) {
      desaList.forEach(d => {
        groups[d.nama] = { name: d.nama, mendatang: 0, riwayat: 0 };
      });
    } else {
      if (filterKelompokId) {
        const selectedK = kelompokList.find(k => k.id === Number(filterKelompokId));
        if (selectedK) {
          groups[selectedK.nama] = { name: selectedK.nama, mendatang: 0, riwayat: 0 };
        }
      } else {
        kelompokList.forEach(k => {
          groups[k.nama] = { name: k.nama, mendatang: 0, riwayat: 0 };
        });
      }
    }

    const getGroupKey = (item: KegiatanItem) => {
      // We don't use getGroupKey directly anymore
      return null;
    };

    let totalMendatang = 0;
    let totalRiwayat = 0;

    filteredData.forEach(item => {
      const isMendatang = item.tanggal >= todayStr;

      if (isComparingDesa) {
        if (item.desaNama) {
          const key = item.desaNama;
          if (groups[key]) {
            groups[key].mendatang += isMendatang ? 1 : 0;
            groups[key].riwayat += isMendatang ? 0 : 1;
            totalMendatang += isMendatang ? 1 : 0;
            totalRiwayat += isMendatang ? 0 : 1;
          }
        } else {
          Object.keys(groups).forEach(key => {
            groups[key].mendatang += isMendatang ? 1 : 0;
            groups[key].riwayat += isMendatang ? 0 : 1;
            totalMendatang += isMendatang ? 1 : 0;
            totalRiwayat += isMendatang ? 0 : 1;
          });
        }
      } else {
        if (item.kelompokNama) {
          const key = item.kelompokNama;
          if (groups[key]) {
            groups[key].mendatang += isMendatang ? 1 : 0;
            groups[key].riwayat += isMendatang ? 0 : 1;
            totalMendatang += isMendatang ? 1 : 0;
            totalRiwayat += isMendatang ? 0 : 1;
          }
        } else {
          Object.keys(groups).forEach(key => {
            groups[key].mendatang += isMendatang ? 1 : 0;
            groups[key].riwayat += isMendatang ? 0 : 1;
            totalMendatang += isMendatang ? 1 : 0;
            totalRiwayat += isMendatang ? 0 : 1;
          });
        }
      }
    });

    if (isComparingDesa && groups["Sak Daerah"]?.mendatang === 0 && groups["Sak Daerah"]?.riwayat === 0) {
      delete groups["Sak Daerah"];
    }

    return Object.values(groups).map(g => ({
      name: g.name,
      mendatang: totalMendatang > 0 ? Number(((g.mendatang / totalMendatang) * 100).toFixed(1)) : 0,
      riwayat: totalRiwayat > 0 ? Number(((g.riwayat / totalRiwayat) * 100).toFixed(1)) : 0,
      mendatangRaw: g.mendatang,
      riwayatRaw: g.riwayat
    }));
  };

  const chartData = getComparisonData();
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 11 }, (_, i) => currentYear - 5 + i);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/kegiatan");
      const json = await res.json();
      setData(Array.isArray(json) ? json : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { 
    fetchData(); 
    fetch("/api/profile").then(r => r.json()).then(d => {
      setUserRole(d.role || "");
      setUserDesaId(d.desaId || null);
    });
  }, [fetchData]);

  const handleDelete = async (id: string) => {
    const res = await Swal.fire({
      title: 'Hapus Kegiatan?',
      text: "Data yang dihapus tidak dapat dikembalikan!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Ya, Hapus!',
      cancelButtonText: 'Batal'
    });
    
    if (res.isConfirmed) {
      await fetch(`/api/kegiatan/${id}`, { method: "DELETE" });
      Swal.fire({
        icon: 'success',
        title: 'Terhapus!',
        text: 'Kegiatan berhasil dihapus.',
        timer: 1500,
        showConfirmButton: false
      });
      fetchData();
    }
  };

  const formatDate = (d: string) => {
    return new Date(d).toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  };

  const handleExportExcel = () => {
    const exportData = displayData.map((item, index) => ({
      No: index + 1,
      Kegiatan: item.judul,
      Deskripsi: item.deskripsi || "-",
      Tanggal: formatDate(item.tanggal),
      Jam: item.jam || "-",
      Lokasi: item.lokasi || "-",
      Desa: item.desaNama || "-",
      Kelompok: item.kelompokNama || "-"
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Kegiatan");
    XLSX.writeFile(wb, `Data_Kegiatan_${activeTab}.xlsx`);
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    doc.text(`Data Kegiatan ${activeTab === 'aktif' ? 'Mendatang' : 'Riwayat'}`, 14, 15);
    
    const tableColumn = ["No", "Kegiatan", "Deskripsi", "Tanggal", "Jam", "Lokasi", "Desa", "Kelompok"];
    const tableRows = displayData.map((item, index) => [
      index + 1,
      item.judul,
      item.deskripsi || "-",
      formatDate(item.tanggal),
      item.jam || "-",
      item.lokasi || "-",
      item.desaNama || "-",
      item.kelompokNama || "-"
    ]);

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 20,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [59, 130, 246] }
    });

    doc.save(`Data_Kegiatan_${activeTab}.pdf`);
  };

  return (
    <div>
      <Topbar title="Kegiatan" role={userRole} />
      <div className="page-content">
        <div className="page-header">
          <div className="page-header-left">
            <h2>Manajemen Kegiatan</h2>
            <p>Kelola kegiatan desa dan kelompok</p>
          </div>
          <div className="page-header-right" style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <button className="btn btn-success" onClick={handleExportExcel} style={{ flex: "1 1 auto", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }} disabled={displayData.length === 0}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
              </svg>
              Excel
            </button>
            <button className="btn btn-danger" onClick={handleExportPDF} style={{ flex: "1 1 auto", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }} disabled={displayData.length === 0}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
              </svg>
              PDF
            </button>
            <button className="btn btn-primary" onClick={() => { setEditItem(null); setShowModal(true); }} style={{ flex: "1 1 auto" }}>
              + Tambah Kegiatan
            </button>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginBottom: "16px" }}>
          <div style={{ display: "flex", gap: "8px", overflowX: "auto", paddingBottom: "4px" }}>
            <button 
              className={`btn ${activeTab === "aktif" ? "btn-primary" : "btn-secondary"}`} 
              onClick={() => setActiveTab("aktif")}
              style={{ borderRadius: "20px", padding: "6px 16px", fontSize: "14px", whiteSpace: "nowrap" }}
            >
              Kegiatan Mendatang ({activeData.length})
            </button>
            <button 
              className={`btn ${activeTab === "riwayat" ? "btn-primary" : "btn-secondary"}`} 
              onClick={() => setActiveTab("riwayat")}
              style={{ borderRadius: "20px", padding: "6px 16px", fontSize: "14px", whiteSpace: "nowrap" }}
            >
              Riwayat Kegiatan ({historyData.length})
            </button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "8px" }}>
            <select 
              className="form-control" 
              value={filterBulan} 
              onChange={e => setFilterBulan(e.target.value)} 
              style={{ borderRadius: "8px", width: "100%" }}
            >
              <option value="">Semua Bulan</option>
              <option value="01">Januari</option>
              <option value="02">Februari</option>
              <option value="03">Maret</option>
              <option value="04">April</option>
              <option value="05">Mei</option>
              <option value="06">Juni</option>
              <option value="07">Juli</option>
              <option value="08">Agustus</option>
              <option value="09">September</option>
              <option value="10">Oktober</option>
              <option value="11">November</option>
              <option value="12">Desember</option>
            </select>
            <select 
              className="form-control" 
              value={filterTahun} 
              onChange={e => setFilterTahun(e.target.value)} 
              style={{ borderRadius: "8px", width: "100%" }}
            >
              <option value="">Semua Tahun</option>
              {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <select 
              className="form-control" 
              value={filterTingkat} 
              onChange={e => setFilterTingkat(e.target.value)} 
              style={{ borderRadius: "8px", width: "100%" }}
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
                value={filterDesaId} 
                onChange={e => { setFilterDesaId(e.target.value); setFilterKelompokId(""); }} 
                style={{ borderRadius: "8px", width: "100%" }}
              >
                <option value="">Semua Desa</option>
                {desaList.map(d => <option key={d.id} value={d.id}>{d.nama}</option>)}
              </select>
            )}
            <select 
              className="form-control" 
              value={filterKelompokId} 
              onChange={e => setFilterKelompokId(e.target.value)} 
              style={{ borderRadius: "8px", width: "100%" }}
            >
              <option value="">Semua Kelompok</option>
              {kelompokList.map(k => <option key={k.id} value={k.id}>{k.nama}</option>)}
            </select>
          </div>
        </div>

        <div className="card" style={{ marginBottom: "20px" }}>
          <div className="card-header">
            <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 600 }}>
              <span className="card-title">
                {(!filterDesaId && ["admin", "pengurus_daerah", "kmm_daerah"].includes(userRole) && filterTingkat !== "kelompok") ? "Grafik Perbandingan Kegiatan Antar-Desa" : "Grafik Perbandingan Kegiatan Antar-Kelompok"}
              </span>
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
                            const raw = name === "Kegiatan Mendatang" ? props.payload.mendatangRaw : props.payload.riwayatRaw;
                            return [`${value}% (${raw} kegiatan)`, name];
                          }}
                        />
                        {activeTab === "aktif" ? (
                          <Bar dataKey="mendatang" name="Kegiatan Mendatang" radius={[4, 4, 0, 0]}>
                            {chartData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={BAR_COLORS[index % BAR_COLORS.length]} />
                            ))}
                          </Bar>
                        ) : (
                          <Bar dataKey="riwayat" name="Riwayat Kegiatan" radius={[4, 4, 0, 0]}>
                            {chartData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={BAR_COLORS[index % BAR_COLORS.length]} />
                            ))}
                          </Bar>
                        )}
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

        <div className="card">
          {loading ? (
            <div className="loading"><div className="spinner" /></div>
          ) : displayData.length === 0 ? (
            <div className="empty-state">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              <h3>{activeTab === "aktif" ? "Belum ada kegiatan mendatang" : "Belum ada riwayat kegiatan"}</h3>
              {activeTab === "aktif" && <p>Klik &quot;Tambah Kegiatan&quot; untuk membuat kegiatan baru</p>}
            </div>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Kegiatan</th>
                    <th>Deskripsi</th>
                    <th>Tanggal</th>
                    <th>Jam</th>
                    <th>Lokasi</th>
                    <th>Desa/Kelompok</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {displayData.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <div style={{ fontWeight: 500 }}>{item.judul}</div>
                      </td>
                      <td style={{ maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis" }}>
                        {item.deskripsi || "-"}
                      </td>
                      <td style={{ whiteSpace: "nowrap" }}>
                        {formatDate(item.tanggal)}
                      </td>
                      <td style={{ whiteSpace: "nowrap" }}>
                        {item.jam || "-"}
                      </td>
                      <td>{item.lokasi || "-"}</td>
                      <td>
                        {item.kelompokId ? (
                          <div className="flex flex-col gap-1">
                            <span className="text-sm font-medium">{item.kelompokNama || "-"}</span>
                            <span className="text-xs text-muted">{item.desaNama || "-"}</span>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-1">
                            <span className="text-sm font-medium">{!item.desaId ? "Semua Desa" : "Semua Kelompok"}</span>
                            <span className="text-xs text-muted">{item.desaNama || "Sak Daerah"}</span>
                          </div>
                        )}
                      </td>
                      <td>
                        <div className="flex gap-2">
                          <a href={`/absensi?kegiatanId=${item.id}`} className="btn btn-sm btn-success">Absensi</a>
                          <button className="btn btn-sm btn-secondary" onClick={() => { setEditItem(item); setShowModal(true); }}>Edit</button>
                          <button className="btn btn-sm btn-danger" onClick={() => handleDelete(item.id)}>Hapus</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <KegiatanModal
          item={editItem}
          onClose={() => { setShowModal(false); setEditItem(null); }}
          onSaved={(updatedItem) => {
            setShowModal(false);
            setEditItem(null);
            if (updatedItem && editItem) {
              setData((prev) => prev.map((d) => d.id === updatedItem.id ? updatedItem : d));
            } else {
              fetchData();
            }
          }}
        />
      )}
    </div>
  );
}

function KegiatanModal({ item, onClose, onSaved }: {
  item: KegiatanItem | null;
  onClose: () => void;
  onSaved: (updated?: KegiatanItem) => void;
}) {
  const isEdit = !!item?.id;

  const [form, setForm] = useState({
    judul: item?.judul || "",
    deskripsi: item?.deskripsi || "",
    tanggal: item?.tanggal || "",
    jam: item?.jam || "",
    lokasi: item?.lokasi || "",
    desaId: item?.desaId ? String(item.desaId) : "",
    kelompokId: item?.kelompokId ? String(item.kelompokId) : "",
  });
  const [desaList, setDesaList] = useState<{ id: number; nama: string }[]>([]);
  const [kelompokList, setKelompokList] = useState<{ id: number; nama: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchingItem, setFetchingItem] = useState(false);
  const [fetchError, setFetchError] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/auth/desa").then(r => r.json()).then(setDesaList).catch(console.error);
  }, []);

  useEffect(() => {
    if (!form.desaId) { setKelompokList([]); return; }
    fetch(`/api/auth/kelompok?desaId=${form.desaId}`)
      .then(r => r.json())
      .then(setKelompokList)
      .catch(console.error);
  }, [form.desaId]);

  useEffect(() => {
    if (!isEdit || !item?.id) return;

    setFetchingItem(true);
    setFetchError("");

    fetch(`/api/kegiatan/${item.id}`, { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) throw new Error("Gagal mengambil data terbaru");
        const fresh: KegiatanItem = await res.json();
        setForm({
          judul: fresh.judul || "",
          deskripsi: fresh.deskripsi || "",
          tanggal: fresh.tanggal || "",
          jam: fresh.jam || "",
          lokasi: fresh.lokasi || "",
          desaId: fresh.desaId ? String(fresh.desaId) : "",
          kelompokId: fresh.kelompokId ? String(fresh.kelompokId) : "",
        });
      })
      .catch(() => {
        setFetchError("Tidak dapat memuat data terbaru. Menampilkan data terakhir yang tersimpan.");
        setForm({
          judul: item.judul || "",
          deskripsi: item.deskripsi || "",
          tanggal: item.tanggal || "",
          jam: item.jam || "",
          lokasi: item.lokasi || "",
          desaId: item.desaId ? String(item.desaId) : "",
          kelompokId: item.kelompokId ? String(item.kelompokId) : "",
        });
      })
      .finally(() => setFetchingItem(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item?.id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const url = item ? `/api/kegiatan/${item.id}` : "/api/kegiatan";
      const method = item ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { 
        Swal.fire({
          icon: 'error',
          title: 'Gagal',
          text: data.error || "Gagal menyimpan"
        });
        setError(data.error || "Gagal menyimpan"); 
        return; 
      }
      
      Swal.fire({
        icon: 'success',
        title: 'Berhasil',
        text: 'Kegiatan berhasil disimpan!',
        timer: 1500,
        showConfirmButton: false
      });
      onSaved(data.data ?? undefined);
    } catch {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: "Terjadi kesalahan jaringan"
      });
      setError("Terjadi kesalahan jaringan");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <span className="modal-title">{isEdit ? "Edit Kegiatan" : "Tambah Kegiatan"}</span>
          <button className="modal-close" onClick={onClose} disabled={fetchingItem}>×</button>
        </div>
        {fetchingItem ? (
          <div className="modal-body" style={{ minHeight: 200, display: "flex", justifyContent: "center", alignItems: "center" }}>
            <div className="loading"><div className="spinner" /> Memuat data terbaru...</div>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="modal-body">
              {fetchError && (
                <div style={{ background: "#fef9c3", color: "#854d0e", borderLeft: "4px solid #eab308", padding: "10px 14px", borderRadius: 6, marginBottom: 16, fontSize: 13 }}>
                  ⚠️ {fetchError}
                </div>
              )}
              {error && <div className="alert alert-error">{error}</div>}
              <div className="form-group">
                <label className="form-label">Judul Kegiatan <span className="required">*</span></label>
                <input name="judul" className="form-control" value={form.judul} onChange={handleChange} required placeholder="Nama kegiatan" />
              </div>
              <div className="form-row" style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                <div className="form-group" style={{ flex: "1 1 200px" }}>
                  <label className="form-label">Tanggal <span className="required">*</span></label>
                  <input name="tanggal" type="date" className="form-control" value={form.tanggal} onChange={handleChange} required />
                </div>
                <div className="form-group" style={{ flex: "1 1 200px" }}>
                  <label className="form-label">Jam</label>
                  <input name="jam" type="time" className="form-control" value={form.jam} onChange={handleChange} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Lokasi</label>
                <input name="lokasi" className="form-control" value={form.lokasi} onChange={handleChange} placeholder="Tempat kegiatan" />
              </div>
              <div className="form-group">
                <label className="form-label">Deskripsi</label>
                <textarea name="deskripsi" className="form-control" value={form.deskripsi} onChange={handleChange} placeholder="Deskripsi kegiatan..." />
              </div>
              <div className="form-row" style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                <div className="form-group" style={{ flex: "1 1 200px" }}>
                  <label className="form-label">Desa</label>
                  <select name="desaId" className="form-control" value={form.desaId} onChange={handleChange}>
                    <option value="">Pilih Desa (Opsional)</option>
                    {desaList.map(d => <option key={d.id} value={d.id}>{d.nama}</option>)}
                  </select>
                </div>
                <div className="form-group" style={{ flex: "1 1 200px" }}>
                  <label className="form-label">Kelompok</label>
                  <select name="kelompokId" className="form-control" value={form.kelompokId} onChange={handleChange}>
                    <option value="">Pilih Kelompok (Opsional)</option>
                    {kelompokList.map(k => <option key={k.id} value={k.id}>{k.nama}</option>)}
                  </select>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={onClose}>Batal</button>
              <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? "Menyimpan..." : "Simpan"}</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
