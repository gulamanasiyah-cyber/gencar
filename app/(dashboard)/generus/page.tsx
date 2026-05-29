"use client";
export const runtime = "edge";


import Topbar from "@/components/Topbar";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Swal from "sweetalert2";
import GenerusModal from "./GenerusModal";
import ImportModal from "./ImportModal";
import QRModal from "./QRModal";
import { GenerusItem } from "@/lib/types";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

export default function GenerusPage() {
  const [data, setData] = useState<GenerusItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [editItem, setEditItem] = useState<GenerusItem | null>(null);
  const [showQR, setShowQR] = useState<GenerusItem | null>(null);
  
  // New Filter states
  const [userRole, setUserRole] = useState("");
  const [userName, setUserName] = useState("");
  const [statusNikahFilter, setStatusNikahFilter] = useState("all");
  const [kategoriFilter, setKategoriFilter] = useState("all");
  const [desaFilter, setDesaFilter] = useState("");
  const [kelompokFilter, setKelompokFilter] = useState("");
  const [desas, setDesas] = useState<{id: number, nama: string}[]>([]);
  const [kelompoks, setKelompoks] = useState<{id: number, nama: string}[]>([]);
  const [isActive, setIsActive] = useState("true");
  const [regTitle, setRegTitle] = useState("");
  const [regDesc, setRegDesc] = useState("");
  
  const limit = 10;

  // Fetch user role and filter options
  useEffect(() => {
    fetch("/api/profile").then(r => r.json()).then(data => {
      setUserRole(data.role || "");
      setUserName(data.nama || "");
      if (["admin", "pengurus_daerah", "kmm_daerah"].includes(data.role)) {
        fetch("/api/admin/desa").then(r => r.json()).then(setDesas);
        fetch("/api/admin/kelompok").then(r => r.json()).then(setKelompoks);
      }
    });

    const fetchSettings = async () => {
        try {
            const res = await fetch("/api/settings");
            const s = await res.json();
            setIsActive(s.generus_registration_active ?? "true");
            setRegTitle(s.generus_registration_title || "");
            setRegDesc(s.generus_registration_description || "");
        } catch (e) {
            console.error("Failed to fetch unified settings:", e);
        }
    };
    fetchSettings();
  }, []);

  const handleSettings = async () => {
    const { value: formValues } = await Swal.fire({
      title: "Pengaturan Pendaftaran Muda-Mudi",
      html: `
        <div style="text-align: left">
          <label class="form-label">Nama Kegiatan / Judul Form</label>
          <input id="swal-title" class="form-control" value="${regTitle}" placeholder="Contoh: Pendataan Generus Daerah 2026" style="margin-bottom: 12px">
          <label class="form-label">Deskripsi Kegiatan</label>
          <textarea id="swal-desc" class="form-control" rows="3" placeholder="Contoh: Pendataan seluruh muda-mudi..." style="margin-bottom: 12px">${regDesc}</textarea>
          <label class="form-label">Status Pendaftaran</label>
          <select id="swal-active" class="form-control" style="margin-bottom: 12px">
            <option value="true" ${isActive !== "false" ? "selected" : ""}>Aktif (Buka)</option>
            <option value="false" ${isActive === "false" ? "selected" : ""}>Nonaktif (Tutup)</option>
          </select>
        </div>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: "Simpan",
      preConfirm: () => {
        return {
          title: (document.getElementById("swal-title") as HTMLInputElement).value,
          desc: (document.getElementById("swal-desc") as HTMLTextAreaElement).value,
          active: (document.getElementById("swal-active") as HTMLSelectElement).value,
        };
      },
      footer: "Nama & deskripsi akan muncul di form publik muda-mudi"
    });

    if (formValues) {
      try {
        await Promise.all([
            fetch("/api/mandiri/settings", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ key: "generus_registration_title", value: formValues.title }),
            }),
            fetch("/api/mandiri/settings", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ key: "generus_registration_description", value: formValues.desc }),
            }),
            fetch("/api/mandiri/settings", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ key: "generus_registration_active", value: formValues.active }),
            })
        ]);
        setRegTitle(formValues.title);
        setRegDesc(formValues.desc);
        setIsActive(formValues.active);
        Swal.fire({ icon: "success", title: "Berhasil disimpan", timer: 1000, showConfirmButton: false });
      } catch (e: any) {
        Swal.fire({ icon: "error", title: "Error", text: e.message });
      }
    }
  };

  const handleBagikanLink = () => {
    const link = `${window.location.origin}/generus/daftar`;
    navigator.clipboard.writeText(link);
    Swal.fire({
      title: "Link Pendaftaran Muda-Mudi",
      html: `
        <div style="background: var(--bg); padding: 12px; border-radius: 8px; font-family: monospace; font-size: 13px; margin-bottom: 20px; border: 1px dashed var(--border)">
            ${link}
        </div>
        <p style="font-size: 14px; margin-bottom: 10px">Link telah disalin ke papan klip!</p>
        <a href="${link}" target="_blank" class="btn btn-secondary btn-full" style="text-decoration: none; display: block; padding: 10px">Buka Form Publik</a>
      `,
      icon: "success",
    });
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ 
        search, 
        page: String(page), 
        limit: String(limit),
        statusNikah: statusNikahFilter,
        kategoriUsia: kategoriFilter,
        desaId: desaFilter,
        kelompokId: kelompokFilter
      });
      const res = await fetch(`/api/generus?${params}`, { cache: "no-store" });
      const json = await res.json();
      setData(json.data || []);
      setTotal(json.total || 0);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [search, page, statusNikahFilter, kategoriFilter, desaFilter, kelompokFilter]);

  useEffect(() => {
    const timer = setTimeout(fetchData, 300);
    return () => clearTimeout(timer);
  }, [fetchData]);

  const handleDelete = async (id: string) => {
    const res = await Swal.fire({
      title: 'Hapus Data Muda-Mudi?',
      text: "Data yang dihapus tidak dapat dikembalikan!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Ya, Hapus!',
      cancelButtonText: 'Batal'
    });
    
    if (res.isConfirmed) {
      await fetch(`/api/generus/${id}`, { method: "DELETE" });
      Swal.fire({
        icon: 'success',
        title: 'Terhapus!',
        text: 'Data muda-mudi berhasil dihapus.',
        timer: 1500,
        showConfirmButton: false
      });
      fetchData();
    }
  };

  const handleSaved = (updatedItem?: GenerusItem) => {
    setShowModal(false);
    setEditItem(null);
    if (updatedItem && editItem) {
      // Mode edit: update item di list secara langsung (tanpa fetch ulang)
      setData((prev) => prev.map((d) => d.id === updatedItem.id ? updatedItem : d));
    } else {
      // Mode tambah baru atau tidak ada data update: fetch ulang
      fetchData();
    }
  };

  const handleDeleteAll = async () => {
    const res = await Swal.fire({
      title: 'Hapus SEMUA Data Muda-Mudi?',
      text: "Data yang dihapus (Muda-Mudi & Absensi) tidak dapat dikembalikan! Akun User yang terhubung juga akan terhapus.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Ya, Hapus Semua!',
      cancelButtonText: 'Batal'
    });

    if (res.isConfirmed) {
      const confirm2 = await Swal.fire({
        title: 'Konfirmasi Terakhir',
        text: 'Ketik "HAPUS SEMUA" untuk mengonfirmasi penghapusan seluruh database muda-mudi.',
        input: 'text',
        inputPlaceholder: 'HAPUS SEMUA',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        cancelButtonText: 'Batal',
        preConfirm: (value) => {
          if (value !== 'HAPUS SEMUA') {
            Swal.showValidationMessage('Konfirmasi tidak cocok!');
          }
        }
      });

      if (!confirm2.isConfirmed) return;

      Swal.fire({
        title: 'Sedang menghapus...',
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });

      try {
        const response = await fetch("/api/generus/delete-all", { method: "POST" });
        const result = await response.json();
        
        if (result.success) {
          Swal.fire({
            icon: 'success',
            title: 'Selesai!',
            text: result.message,
          });
          fetchData();
        } else {
          Swal.fire({
            icon: 'error',
            title: 'Gagal',
            text: result.error || 'Terjadi kesalahan sistem.',
          });
        }
      } catch (e) {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'Gagal menghubungi server.',
        });
      }
    }
  };
  
  const handleExportLoginPDF = async () => {
    if (userRole !== "admin") {
      Swal.fire({ icon: "error", title: "Akses Ditolak", text: "Fitur ini hanya untuk Admin." });
      return;
    }

    Swal.fire({
      title: "Menyiapkan PDF Login...",
      text: "Mengambil data kredensial login muda-mudi",
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      },
    });

    try {
      const params = new URLSearchParams({ all: "true" });
      const res = await fetch(`/api/generus?${params}`);
      const json = await res.json();
      const exportData = json.data || [];

      if (exportData.length === 0) {
        Swal.fire({ icon: "info", title: "Tidak ada data", text: "Tidak ada data muda-mudi ditemukan." });
        return;
      }

      const doc = new jsPDF();
      doc.setFontSize(18);
      doc.text("Daftar Akun Login Muda-Mudi - Admin", 14, 15);
      
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`Waktu: ${new Date().toLocaleString('id-ID')} | Total: ${exportData.length}`, 14, 22);

      const tableData = exportData.map((item: any) => [
        item.nama,
        item.desaNama || "-",
        item.kelompokNama || "-",
        item.email || "Belum ada akun",
        "generusjb2",
      ]);

      autoTable(doc, {
        head: [["Nama Lengkap", "Desa", "Kelompok", "Email", "Password"]],
        body: tableData,
        startY: 27,
        theme: "grid",
        headStyles: { fillColor: [59, 130, 246] }, // Admin colors
        styles: { fontSize: 7, cellPadding: 2 },
        margin: { top: 27 },
      });

      doc.save(`Data_Login_Generus_Admin_${new Date().getTime()}.pdf`);

      Swal.fire({ icon: "success", title: "Selesai!", text: "File PDF login berhasil dibuat.", timer: 1500, showConfirmButton: false });
    } catch (error) {
      console.error(error);
      Swal.fire({ icon: "error", title: "Gagal", text: "Terjadi kesalahan saat mengekspor PDF." });
    }
  };

  const handleExportPDF = async () => {
    // For admin, give choice between filtered view or full database
    let exportMode: 'filtered' | 'full' = 'filtered';
    
    if (userRole === "admin") {
      const result = await Swal.fire({
        title: 'Metode Ekspor PDF',
        text: "Pilih data muda-mudi yang ingin diekspor:",
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#10b981',
        cancelButtonColor: '#3b82f6',
        confirmButtonText: 'Export Seluruh Database',
        cancelButtonText: 'Export Sesuai Filter'
      });
      
      if (result.isConfirmed) {
        exportMode = 'full';
      } else if (result.dismiss === Swal.DismissReason.cancel) {
        exportMode = 'filtered';
      } else {
        return; // User closed modal
      }
    }

    Swal.fire({
      title: "Sedang menyiapkan PDF...",
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      },
    });

    try {
      const params = new URLSearchParams({ all: "true", isGenerus: "true" });
      
      if (exportMode === 'filtered') {
        if (search) params.set("search", search);
        if (statusNikahFilter !== "all") params.set("statusNikah", statusNikahFilter);
        if (kategoriFilter !== "all") params.set("kategoriUsia", kategoriFilter);
        if (desaFilter) params.set("desaId", desaFilter);
        if (kelompokFilter) params.set("kelompokId", kelompokFilter);
      }
      
      const res = await fetch(`/api/generus?${params}`);
      const json = await res.json();
      let exportData = json.data || [];

      // Abaikan admin/pengurus, tapi tetap sertakan yang tidak memiliki akun (role null)
      exportData = exportData.filter((item: any) => !item.role || ["generus", "usia_mandiri", "peserta"].includes(item.role));

      if (exportData.length === 0) {
        Swal.fire({ icon: "info", title: "Tidak ada data", text: "Tidak ada data pengguna yang sesuai untuk diekspor." });
        return;
      }

      const doc = new jsPDF();
      doc.setFontSize(18);
      doc.text(exportMode === 'full' ? "Database Lengkap Muda-Mudi" : "Data Muda-Mudi (Filtered)", 14, 15);
      
      const filterText = (exportMode === 'filtered') 
        ? [`Waktu: ${new Date().toLocaleString('id-ID')}`, `Total: ${exportData.length}`]
        : ["Mode: Seluruh Database", `Waktu: ${new Date().toLocaleString('id-ID')}`];

      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(filterText.join(" | "), 14, 22);

      const tableData = exportData.map((item: any) => [
        item.name || item.nama, // Handling fallback just in case
        item.desaNama || "-",
        item.kelompokNama || "-",
        item.email || "-",
        item.passwordPlain || (item.email ? "*** (Rahasia)" : "Belum Ada Akun"),
      ]);

      autoTable(doc, {
        head: [["Nama Lengkap", "Desa", "Kelompok", "Email", "Password"]],
        body: tableData,
        startY: 27,
        theme: "striped",
        headStyles: { fillColor: [16, 185, 129] },
        styles: { fontSize: 7, cellPadding: 2 },
        margin: { top: 27 },
      });

      const fileName = exportMode === 'full' ? `Full_Database_Generus_${new Date().getTime()}.pdf` : `Data_Filtered_Generus_${new Date().getTime()}.pdf`;
      doc.save(fileName);

      Swal.fire({ icon: "success", title: "Selesai!", text: "File PDF berhasil dibuat.", timer: 1500, showConfirmButton: false });
    } catch (error) {
      console.error(error);
      Swal.fire({ icon: "error", title: "Gagal", text: "Terjadi kesalahan saat mengekspor PDF." });
    }
  };
    
  const kategoriColor: Record<string, string> = {
    PAUD: "badge-purple",
    TK: "badge-blue",
    SD: "badge-cyan",
    SMP: "badge-green",
    SMA: "badge-orange",
    SMK: "badge-indigo",
    Kuliah: "badge-red",
    Bekerja: "badge-gray",
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div>
      <Topbar title="Data Muda-Mudi" role={userRole} userName={userName} />

      <div className="page-content">
        <div className="page-header">
          <div className="page-header-left">
            <h2>Data Muda-Mudi</h2>
            <p>Total {total} muda-mudi terdaftar</p>
          </div>
          <div className="page-header-actions" style={{ display: "flex", gap: "10px", flexWrap: "wrap", width: "100%", justifyContent: "flex-end" }}>
            {["admin", "pengurus_daerah", "kmm_daerah"].includes(userRole) && (
              <>
                <button
                  className="btn btn-secondary"
                  onClick={handleBagikanLink}
                >
                  🔗 Bagikan Link Form
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={handleSettings}
                >
                  ⚙️ Atur Pendaftaran
                </button>
              </>
            )}
            {userRole === "admin" && (
              <>
                <button
                  className="btn btn-danger"
                  onClick={handleDeleteAll}
                  style={{ backgroundColor: "#ef4444", color: "white" }}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: "4px" }}>
                    <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6" />
                  </svg>
                  Hapus Data Semua
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={handleExportPDF}
                  style={{ backgroundColor: "#10b981", color: "white" }}
                >
                  📄 Database (PDF)
                </button>
              </>
            )}
            <button
              className="btn btn-secondary"
              onClick={() => setShowImport(true)}
            >
              📥 Import Excel
            </button>
            <button
              className="btn btn-primary"
              onClick={() => { setEditItem(null); setShowModal(true); }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Tambah Muda-Mudi
            </button>
          </div>
        </div>

        <div className="card">
          <div className="card-header" style={{ flexDirection: "column", gap: "16px", alignItems: "flex-start" }}>
            {/* Kategori Usia Buttons */}
            <div style={{ display: "flex", gap: "8px", overflowX: "auto", width: "100%", paddingBottom: "4px", scrollbarWidth: "none" }}>
              <button 
                className={`btn btn-sm ${kategoriFilter === "all" ? "btn-primary" : "btn-secondary"}`}
                onClick={() => { setKategoriFilter("all"); setPage(1); }}
                style={{ borderRadius: "20px", whiteSpace: "nowrap", padding: "6px 16px" }}
              >
                Semua Kategori
              </button>
              {["SMP", "SMA", "SMK", "Kuliah", "Bekerja"].map((cat) => (
                <button
                  key={cat}
                  className={`btn btn-sm ${kategoriFilter === cat ? "btn-primary" : "btn-secondary"}`}
                  onClick={() => { setKategoriFilter(cat); setPage(1); }}
                  style={{ borderRadius: "20px", whiteSpace: "nowrap", padding: "6px 16px" }}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="filter-container" style={{ display: "flex", gap: "12px", width: "100%", flexWrap: "wrap", alignItems: "center" }}>
              <div className="search-bar" style={{ flex: 1, minWidth: "250px" }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
                </svg>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Cari nama atau nomor unik..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                />
              </div>

              <div className="filter-selects" style={{ display: "flex", gap: "8px", flexWrap: "wrap", width: "100%" }}>
                <select 
                  className="form-control" 
                  style={{ flex: "1 1 140px" }}
                  value={statusNikahFilter}
                  onChange={(e) => { setStatusNikahFilter(e.target.value); setPage(1); }}
                >
                  <option value="all">Semua Status Nikah</option>
                  <option value="Belum Menikah">Belum Menikah</option>
                  <option value="Sudah Menikah">Sudah Menikah</option>
                </select>

                {["admin", "pengurus_daerah", "kmm_daerah"].includes(userRole) && (
                  <>
                    <select 
                      className="form-control" 
                      style={{ flex: "1 1 140px" }}
                      value={desaFilter}
                      onChange={(e) => { setDesaFilter(e.target.value); setPage(1); setKelompokFilter(""); }}
                    >
                      <option value="">Semua Desa</option>
                      {desas.map(d => <option key={d.id} value={d.id}>{d.nama}</option>)}
                    </select>

                    <select 
                      className="form-control" 
                      style={{ flex: "1 1 140px" }}
                      value={kelompokFilter}
                      onChange={(e) => { setKelompokFilter(e.target.value); setPage(1); }}
                    >
                      <option value="">Semua Kelompok</option>
                      {kelompoks
                        .filter(k => !desaFilter || (k as any).desaId === Number(desaFilter))
                        .map(k => <option key={k.id} value={k.id}>{k.nama}</option>)}
                    </select>
                  </>
                )}
              </div>
            </div>
            
            <div style={{ display: "flex", justifyContent: "space-between", width: "100%" }}>
               <span className="text-sm text-muted">{total} data ditemukan</span>
               {(statusNikahFilter !== "all" || kategoriFilter !== "all" || desaFilter !== "" || kelompokFilter !== "") && (
                 <button 
                    className="btn btn-sm btn-link" 
                    style={{ padding: 0, height: "auto" }}
                    onClick={() => { setStatusNikahFilter("all"); setKategoriFilter("all"); setDesaFilter(""); setKelompokFilter(""); setSearch(""); }}
                 >
                    Reset Filter
                 </button>
               )}
            </div>
          </div>

          <div className="table-wrapper">
            {loading ? (
              <div className="loading"><div className="spinner" /></div>
            ) : data.length === 0 ? (
              <div className="empty-state">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                </svg>
                <h3>Belum ada data muda-mudi</h3>
                <p>Klik &quot;Tambah Muda-Mudi&quot; untuk menambahkan data</p>
              </div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Foto</th>
                    <th>No. Unik</th>
                    <th>Nama</th>
                    <th>JK</th>
                    <th>TTL / Umur</th>
                    <th>Kategori</th>
                    <th>Pend / Pekerjaan</th>
                    <th>Desa</th>
                    <th>Kelompok</th>
                    <th>Alamat</th>
                    <th>No. Telp</th>
                    <th>Status</th>
                    <th>Akun Login</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((item) => {
                    let umur = "-";
                    if (item.tanggalLahir) {
                      const diff = Date.now() - new Date(item.tanggalLahir).getTime();
                      const age = Math.abs(new Date(diff).getUTCFullYear() - 1970);
                      if (age >= 0) umur = `${age} Thn`;
                    }
                    return (
                    <tr key={item.id}>
                      <td>
                        <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#f1f5f9", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12 }}>
                          {item.foto ? (
                            <img src={item.foto} alt="Avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          ) : (
                            item.nama.charAt(0)
                          )}
                        </div>
                      </td>
                      <td>
                        <span style={{ fontFamily: "monospace", fontSize: 12 }}>{item.nomorUnik}</span>
                      </td>
                      <td style={{ fontWeight: 500 }}>{item.nama}</td>
                      <td>{item.jenisKelamin === "L" ? "Laki-laki" : "Perempuan"}</td>
                      <td>
                        <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                          {item.tempatLahir ? item.tempatLahir + ", " : ""}{item.tanggalLahir || "-"}
                        </div>
                        <div style={{ fontWeight: 500 }}>{umur}</div>
                      </td>
                      <td>
                        <span className={`badge ${item.kategori === "Usia Mandiri" ? "badge-purple" : "badge-blue"}`}>
                          {item.kategori === "Generus" ? "Muda-Mudi" : (item.kategori || "Muda-Mudi")}
                        </span>
                      </td>
                      <td style={{ maxWidth: "150px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        <span className={`badge ${kategoriColor[item.kategoriUsia] || "badge-gray"}`} style={{ display: "inline-block", marginBottom: (item.pendidikan || item.pekerjaan) ? "4px" : "0" }}>
                          {item.kategoriUsia}
                        </span>
                        {(item.pendidikan || item.pekerjaan) && (
                          <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px", fontWeight: 500 }}>
                            {item.pendidikan || item.pekerjaan}
                          </div>
                        )}
                      </td>
                      <td>{item.desaNama || "-"}</td>
                      <td>{item.kelompokNama || "-"}</td>
                      <td style={{ maxWidth: "150px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={item.alamat || "-"}>
                        {item.alamat || "-"}
                      </td>
                      <td style={{ fontSize: "11px" }}>
                        <div style={{ color: "var(--text-main)", fontWeight: 500 }}>{item.noTelp || "-"}</div>
                        {item.noTelpOrtu && <div style={{ color: "var(--text-muted)", marginTop: "2px" }}>Ortu: {item.noTelpOrtu}</div>}
                      </td>
                      <td>
                        <span className={`badge ${item.statusNikah === "Menikah" ? "badge-green" : "badge-gray"}`}>
                          {item.statusNikah || "Belum Menikah"}
                        </span>
                      </td>
                      <td style={{ maxWidth: "150px", overflow: "hidden", textOverflow: "ellipsis" }}>
                        <div style={{ fontSize: "11px", fontWeight: 500, color: "var(--text-muted)", display: "flex", flexDirection: "column", gap: "2px" }}>
                           {item.email ? (
                             <>
                               <span style={{ color: "var(--text-main)" }} title={item.email}>{item.email}</span>
                               <span style={{ color: "var(--color-primary)" }}>P: {item.passwordPlain || "***"}</span>
                             </>
                           ) : (
                             <span>-</span>
                           )}
                        </div>
                      </td>
                      <td>
                        <div className="flex gap-2">
                          <button
                            className="btn btn-sm btn-secondary"
                            onClick={() => setShowQR(item)}
                            title="Lihat QR"
                          >QR</button>
                          <button
                            className="btn btn-sm btn-secondary"
                            onClick={() => { setEditItem(item); setShowModal(true); }}
                          >Edit</button>
                          <button
                            className="btn btn-sm btn-danger"
                            onClick={() => handleDelete(item.id)}
                          >Hapus</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                </tbody>
              </table>
            )}
          </div>

          {totalPages > 1 && (
            <div className="pagination">
              <span className="page-info">
                Halaman {page} dari {totalPages}
              </span>
              <div className="page-buttons">
                <button
                  className="btn btn-sm btn-secondary"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  ← Prev
                </button>
                <button
                  className="btn btn-sm btn-secondary"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  Next →
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {showImport && (
        <ImportModal
          onClose={() => setShowImport(false)}
          onSaved={handleSaved}
        />
      )}

      {showModal && (
        <GenerusModal
          item={editItem}
          onClose={() => { setShowModal(false); setEditItem(null); }}
          onSaved={handleSaved}
        />
      )}

      {showQR && (
        <QRModal item={showQR} onClose={() => setShowQR(null)} />
      )}
    </div>
  );
}
