"use client";




import Topbar from "@/components/Topbar";
import { useState, useEffect, useCallback, useRef } from "react";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";
import Link from "next/link";
import PhotoUpload from "@/components/mandiri/PhotoUpload";
import IDCardComponent from "@/components/IDCardComponent";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { Printer, Eye } from "lucide-react";

const MySwal = withReactContent(Swal);

interface PanitiaItem {
  id: string;
  nama: string;
  nomorUnik: string;
  jenisKelamin: string;
  dapukan: string;
  desaKota: string;
  desaNama: string;
  noTelp: string;
  foto: string;
  isHadir: number;
  waktuHadir?: string;
  tanggalLahir?: string;
  pekerjaan?: string;
  tempatLahir?: string;
  alamat?: string;
  pendidikan?: string;
  suku?: string;
  hobi?: string;
  makananMinumanFavorit?: string;
  instagram?: string;
  kriteriaPasangan?: string;
  mandiriDaerahId?: number | null;
  mandiriDesaId?: number | null;
  mandiriKelompokId?: number | null;
  kelompokNama?: string;
  generusId?: string;
  createdAt: string;
}

interface KegiatanOption { id: string; judul: string; kota: string; }

export default function MandiriPanitiaPage() {
  const [data, setData] = useState<PanitiaItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [userRole, setUserRole] = useState("");
  const [kegiatanList, setKegiatanList] = useState<KegiatanOption[]>([]);
  const [selectedKegiatanId, setSelectedKegiatanId] = useState("");
  const limit = 200;
  const cardRef = useRef<HTMLDivElement>(null);

  // Wilayah state
  const [daerahList, setDaerahList] = useState<{id: number, nama: string}[]>([]);
  const [desaList, setDesaList] = useState<{id: number, nama: string, mandiriDaerahId: number}[]>([]);
  const [kelompokList, setKelompokList] = useState<{id: number, nama: string, mandiriDesaId: number}[]>([]);

  // Edit Modal State
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editForm, setEditForm] = useState({
     id: "",
     generusId: "",
     nama: "",
     jenisKelamin: "L",
     noTelp: "",
     tanggalLahir: "",
     pekerjaan: "",
     tempatLahir: "",
     alamat: "",
     pendidikan: "",
     suku: "",
     hobi: "",
     makananMinumanFavorit: "",
     instagram: "",
     kriteriaPasangan: "",
     mandiriDaerahId: "",
     mandiriDesaId: "",
     mandiriKelompokId: "",
     dapukan: "Panitia",
     foto: "",
     nomorUnik: "",
  });


  useEffect(() => {
    fetch("/api/profile")
      .then((r) => r.json())
      .then((d) => setUserRole(d.role || ""));

    const fetchInit = async () => {
      try {
        const [settingsRes, kegiatanRes, daerahRes, desaRes, kelRes] = await Promise.all([
          fetch("/api/settings"),
          fetch("/api/mandiri/kegiatan"),
          fetch("/api/public/mandiri/daerah"),
          fetch("/api/public/mandiri/desa?scope=all"),
          fetch("/api/public/mandiri/kelompok?scope=all")
        ]);
        const s = await settingsRes.json();
        const kList = await kegiatanRes.json();
        if (Array.isArray(kList)) {
          setKegiatanList(kList);
          const activeId = s.mandiri_active_kegiatan_id || "";
          if (activeId) setSelectedKegiatanId(activeId);
          else if (kList.length > 0) setSelectedKegiatanId(kList[0].id);
        }
        const ds = await daerahRes.json();
        if (Array.isArray(ds)) setDaerahList(ds);
        const de = await desaRes.json();
        if (Array.isArray(de)) setDesaList(de);
        const kl = await kelRes.json();
        if (Array.isArray(kl)) setKelompokList(kl);
      } catch (e) {
        console.error("Failed to fetch init data:", e);
      }
    };
    fetchInit();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [search, selectedKegiatanId]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ search, page: String(page), limit: String(limit) });
      if (selectedKegiatanId) params.set("kegiatanId", selectedKegiatanId);
      const res = await fetch(`/api/mandiri/panitia?${params}`);
      const json = await res.json();
      setData(json.data || []);
      setTotal(json.total || 0);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [search, page, selectedKegiatanId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleUpdate = (item: PanitiaItem) => {
    setEditForm({
      id: item.id,
      generusId: item.generusId || "",
      nama: item.nama || "",
      jenisKelamin: item.jenisKelamin || "L",
      noTelp: item.noTelp || "",
      tanggalLahir: item.tanggalLahir || "",
      pekerjaan: item.pekerjaan || "",
      tempatLahir: item.tempatLahir || "",
      alamat: item.alamat || "",
      pendidikan: item.pendidikan || "",
      suku: item.suku || "",
      hobi: item.hobi || "",
      makananMinumanFavorit: item.makananMinumanFavorit || "",
      instagram: item.instagram || "",
      kriteriaPasangan: item.kriteriaPasangan || "",
      mandiriDaerahId: item.mandiriDaerahId ? String(item.mandiriDaerahId) : "",
      mandiriDesaId: item.mandiriDesaId ? String(item.mandiriDesaId) : "",
      mandiriKelompokId: item.mandiriKelompokId ? String(item.mandiriKelompokId) : "",
      dapukan: item.dapukan || "Panitia",
      foto: item.foto || "",
      nomorUnik: item.nomorUnik || "",
    });
    setEditModalOpen(true);
  };

  const submitEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/mandiri/panitia", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });

      if (!res.ok) {
         const data = await res.json();
         throw new Error(data.error || "Gagal update status");
      }

      setEditModalOpen(false);
      Swal.fire({ icon: "success", title: "Berhasil Diperbarui", timer: 1500, showConfirmButton: false });
      fetchData();
    } catch (err: any) {
      Swal.fire({ icon: "error", title: "Gagal", text: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    const res = await Swal.fire({
      title: "Hapus Panitia/Pengurus?",
      text: "Data akan dihapus secara permanen.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#64748b",
      confirmButtonText: "Ya, Hapus!",
    });

    if (res.isConfirmed) {
      const resp = await fetch(`/api/mandiri/panitia?id=${id}`, { method: "DELETE" });
      if (resp.ok) {
        Swal.fire({ icon: "success", title: "Terhapus!", timer: 1500, showConfirmButton: false });
        fetchData();
      } else {
        Swal.fire({ icon: "error", title: "Gagal", text: "Terjadi kesalahan saat menghapus data." });
      }
    }
  };

  const handleViewCard = (item: PanitiaItem) => {
     MySwal.fire({
        title: <span style={{ fontSize: 18, fontWeight: 700 }}>Pratinjau ID Card</span>,
        html: (
           <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0' }}>
              <IDCardComponent 
                 nama={item.nama}
                 nomorUnik={item.nomorUnik}
                 dapukan={item.dapukan}
                 daerah={item.desaKota}
                 desa={item.desaNama}
                 foto={item.foto}
                 gradient={item.dapukan === 'Pengurus' ? 'linear-gradient(135deg, #92400e 0%, #f59e0b 100%)' : undefined}
              />
           </div>
        ),
        showConfirmButton: false,
        showCloseButton: true,
        width: 450,
     });
  };

  const handleDownloadPDF = async (item: PanitiaItem) => {
     Swal.fire({
        title: "Menyiapkan PDF...",
        text: "Mohon tunggu sebentar",
        allowOutsideClick: false,
        didOpen: () => { Swal.showLoading(); }
     });

     try {
        // Create a temporary hidden container to render the card
        const container = document.createElement("div");
        container.style.position = "absolute";
        container.style.left = "-9999px";
        container.style.top = "-9999px";
        document.body.appendChild(container);

        // Render the component into the container
        const MySwalTemp = withReactContent(Swal);
        // We use a trick to render React component to DOM
        const root = document.createElement("div");
        container.appendChild(root);
        
        // Using MySwal.fire is easy but we need it for generation.
        // Instead, let's just use the fact that we have the component.
        // We'll use a hidden div in the page for this.
        const hiddenDiv = document.getElementById("hidden-card-gen");
        if (!hiddenDiv) throw new Error("Internal error: target div not found");
        
        // Trigger a temporary state or just use the card already in the page if we had one.
        // Actually, let's just use MySwal to render it and then capture it.
        
        await MySwal.fire({
           html: (
              <div id="capture-box">
                 <IDCardComponent 
                    nama={item.nama}
                    nomorUnik={item.nomorUnik}
                    dapukan={item.dapukan}
                    daerah={item.desaKota}
                    desa={item.desaNama}
                    foto={item.foto}
                    gradient={item.dapukan === 'Pengurus' ? 'linear-gradient(135deg, #92400e 0%, #f59e0b 100%)' : undefined}
                 />
              </div>
           ),
           showConfirmButton: false,
           showCancelButton: false,
           timer: 1, // Close immediately
           didOpen: async (el) => {
              const box = el.querySelector("#capture-box") as HTMLElement;
              if (box) {
                 const canvas = await html2canvas(box, {
                    useCORS: true,
                    scale: 3,
                    backgroundColor: "#ffffff",
                 });
                 
                 const imgData = canvas.toDataURL("image/jpeg", 1.0);
                 const pdf = new jsPDF({
                    orientation: "p",
                    unit: "mm",
                    format: "a4"
                 });
                 
                 const cardWidth = 100;
                 const cardHeight = 160;
                 const x = (210 - cardWidth) / 2;
                 const y = (297 - cardHeight) / 2;
                 
                 pdf.addImage(imgData, "JPEG", x, y, cardWidth, cardHeight);
                 pdf.save(`KARTU_${item.nama.replace(/\s+/g, "_")}.pdf`);
                 Swal.close();
                 Swal.fire({ icon: "success", title: "Berhasil!", text: "PDF Berhasil diunduh", timer: 1500, showConfirmButton: false });
              }
           }
        });

     } catch (e: any) {
        console.error(e);
        Swal.fire("Gagal", "Gagal mengunduh PDF: " + e.message, "error");
     }
  };

  return (
    <div style={{ display: "flex", height: "calc(100vh - 64px)", overflow: "hidden" }}>
      <div style={{ flex: 1, overflowY: "auto", position: "relative" }}>
        <Topbar title="Panitia & Pengurus" role={userRole} />

        <div className="page-content">
          <div className="page-header">
            <div className="page-header-left">
              <h2>Pengelolaan Panitia</h2>
              <p>Daftar pengguna yang sudah terdaftar sebagai panitia kegiatan.</p>
            </div>
            <div style={{ display: "flex", gap: "10px" }}>
              <Link href="/mandiri/daftar-panitia" className="btn btn-primary" title="Tambah Panitia/Pengurus">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16 }}>
                  <path d="M12 5v14M5 12h14" />
                </svg>
                Daftar Panitia Baru
              </Link>
              <button
                className="btn btn-secondary"
                onClick={() => {
                  const url = `${window.location.origin}/mandiri/daftar-panitia`;
                  navigator.clipboard.writeText(url);
                  Swal.fire({ icon: "success", title: "Link Disalin!", text: "Link pendaftaran panitia & pengurus berhasil disalin ke clipboard.", timer: 1500, showConfirmButton: false });
                }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16 }}>
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                </svg>
                Bagikan Link
              </button>
            </div>
          </div>

          {kegiatanList.length > 0 && (
            <div style={{ marginBottom: "16px", display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
              <label style={{ fontWeight: 600, fontSize: 14, color: "#475569", whiteSpace: "nowrap" }}>Pilih Kegiatan:</label>
              <select
                className="form-control"
                style={{ maxWidth: 320 }}
                value={selectedKegiatanId}
                onChange={e => setSelectedKegiatanId(e.target.value)}
              >
                {kegiatanList.map(k => (
                  <option key={k.id} value={k.id}>{k.judul} ({k.kota})</option>
                ))}
              </select>
            </div>
          )}

          <div className="card">
            <div className="card-header" style={{ justifyContent: "space-between" }}>
              <span className="card-title">Daftar Panitia({total})</span>
              <div className="search-bar" style={{ maxWidth: "250px" }}>
                <input type="text" className="form-control" placeholder="Cari nama atau status..." value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
            </div>

            <div className="table-wrapper">
              {loading && data.length === 0 ? (
                <div className="loading">
                  <div className="spinner" />
                </div>
              ) : data.length === 0 ? (
                <div className="empty-state" style={{ padding: "40px" }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: 48, opacity: 0.3 }}>
                    <path d="M12 2v20M2 12h20" />
                  </svg>
                  <p>Belum ada panitia yang terdaftar.</p>
                </div>
              ) : (
                <table className="responsive-table">
                  <thead>
                    <tr>
                      <th>Foto</th>
                      <th>Nama</th>
                      <th>JK</th>
                      <th>Dapukan</th>
                      <th>Daerah / Desa</th>
                      <th>No. Telp</th>
                      <th>Nomor Unik</th>
                      <th style={{ textAlign: "center" }}>Status Kehadiran</th>
                      <th style={{ textAlign: "center" }}>Lihat Kartu</th>
                      <th style={{ textAlign: "center" }}>Cetak PDF</th>
                      <th style={{ textAlign: "right" }}>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.map((item) => (
                      <tr key={item.id}>
                        <td data-label="Foto">
                          <div style={{ width: 40, height: 40, borderRadius: "50%", background: "#f1f5f9", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>
                            {item.foto ? <img src={item.foto} alt={item.nama} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : item.nama.charAt(0)}
                          </div>
                        </td>
                        <td data-label="Nama" style={{ fontWeight: 600 }}>{item.nama}</td>
                        <td data-label="JK">{item.jenisKelamin}</td>
                        <td data-label="Dapukan">
                          <span className={`badge ${item.dapukan === "Pengurus" ? "badge-amber" : "badge-blue"}`}>
                            {item.dapukan}
                          </span>
                        </td>
                        <td data-label="Daerah / Desa" style={{ fontSize: 12, opacity: 0.8 }}>
                          {item.desaKota && item.desaKota !== "N/A" ? item.desaKota : "-"} / {item.desaNama && item.desaNama !== "N/A" ? item.desaNama : "-"}
                        </td>
                        <td data-label="No. Telp" style={{ fontSize: 13 }}>{item.noTelp}</td>
                        <td data-label="Nomor Unik" style={{ fontFamily: "monospace", fontSize: 14, fontWeight: "700", color: "var(--primary)" }}>{item.nomorUnik}</td>
                        <td data-label="Status Kehadiran" style={{ textAlign: "center" }}>
                          {item.isHadir === 1 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                              <span className="badge badge-green">Hadir</span>
                              {item.waktuHadir && <span style={{ fontSize: '10px', opacity: 0.6 }}>{new Date(item.waktuHadir).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>}
                            </div>
                          ) : (
                            <span className="badge badge-gray">Belum Hadir</span>
                          )}
                        </td>
                        <td data-label="Lihat Kartu" style={{ textAlign: "center" }}>
                           <button
                              className="btn-icon"
                              title="Lihat Kartu"
                              onClick={() => handleViewCard(item)}
                              style={{ color: 'var(--primary)', background: 'var(--primary-light)', padding: '6px', borderRadius: '8px', border: 'none' }}
                           >
                              <Eye size={18} />
                           </button>
                        </td>
                        <td data-label="Cetak PDF" style={{ textAlign: "center" }}>
                           <button
                              className="btn-icon"
                              title="Download PDF"
                              onClick={() => handleDownloadPDF(item)}
                              style={{ color: '#16a34a', background: '#f0fdf4', padding: '6px', borderRadius: '8px', border: 'none' }}
                           >
                              <Printer size={18} />
                           </button>
                        </td>
                        <td data-label="Aksi" style={{ textAlign: "right" }}>
                          <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                            <button className="btn btn-sm btn-secondary" onClick={() => handleUpdate(item)}>
                              Edit
                            </button>
                            <button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(item.id)}>
                              Hapus
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Target for PDF generation if needed */}
      <div id="hidden-card-gen" style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}></div>
      {/* Edit Modal */}
      {editModalOpen && (
         <div
            style={{
               position: "fixed",
               left: 0,
               top: 0,
               width: "100%",
               height: "100%",
               backgroundColor: "rgba(15, 23, 42, 0.6)",
               backdropFilter: "blur(4px)",
               display: "flex",
               alignItems: "center",
               justifyContent: "center",
               zIndex: 9999,
            }}
         >
            <div
               className="card animate-fade-in"
               style={{
                  width: "100%",
                  maxWidth: "500px",
                  margin: "20px",
                  padding: "24px",
                  boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
                  maxHeight: "90vh",
                  overflowY: "auto"
               }}
            >
               <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                  <h3 style={{ fontSize: "18px", fontWeight: "800", color: "#0f172a", margin: 0 }}>
                     Update Panitia
                  </h3>
                  <button 
                     onClick={() => setEditModalOpen(false)}
                     style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b" }}
                  >
                     <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 20, height: 20 }}>
                        <path d="M18 6L6 18M6 6l12 12" />
                     </svg>
                  </button>
               </div>
               
               <div style={{ padding: "12px", background: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0", marginBottom: "20px" }}>
                  <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "2px" }}>User</div>
                  <div style={{ fontWeight: "700", color: "#0f172a" }}>{editForm.nama} <span style={{ color: "#94a3b8", fontWeight: "normal" }}>#{editForm.nomorUnik}</span></div>
               </div>

               <form onSubmit={submitEdit}>
                  {/* Data Diri Section */}
                  <div style={{ marginBottom: "20px" }}>
                     <div style={{ fontSize: "14px", fontWeight: "700", color: "#334155", borderBottom: "1px solid #e2e8f0", paddingBottom: "8px", marginBottom: "16px" }}>1. Data Pengguna</div>

                     <div className="form-group" style={{ marginBottom: "24px", textAlign: "center" }}>
                        <PhotoUpload
                           value={editForm.foto}
                           onChange={(url) => setEditForm((prev) => ({ ...prev, foto: url }))}
                           helperText="Maksimal 1 MB"
                        />
                     </div>
                     
                     <div className="form-group" style={{ marginBottom: "16px" }}>
                        <label className="form-label">Nama Lengkap</label>
                        <input
                           type="text"
                           className="form-control"
                           value={editForm.nama}
                           onChange={(e) => setEditForm({ ...editForm, nama: e.target.value })}
                           required
                        />
                     </div>

                     <div style={{ display: "flex", gap: "12px", marginBottom: "16px" }}>
                        <div className="form-group" style={{ flex: 1 }}>
                           <label className="form-label">Jenis Kelamin</label>
                           <select
                              className="form-control"
                              value={editForm.jenisKelamin}
                              onChange={(e) => setEditForm({ ...editForm, jenisKelamin: e.target.value })}
                              required
                           >
                              <option value="L">Laki-laki</option>
                              <option value="P">Perempuan</option>
                           </select>
                        </div>
                        <div className="form-group" style={{ flex: 1 }}>
                           <label className="form-label">Nomor WA</label>
                           <input
                              type="text"
                              className="form-control"
                              value={editForm.noTelp}
                              onChange={(e) => setEditForm({ ...editForm, noTelp: e.target.value })}
                           />
                        </div>
                     </div>

                     <div style={{ display: "flex", gap: "12px", marginBottom: "16px" }}>
                        <div className="form-group" style={{ flex: 1 }}>
                           <label className="form-label">Tempat Lahir</label>
                           <input
                              type="text"
                              className="form-control"
                              value={editForm.tempatLahir}
                              onChange={(e) => setEditForm({ ...editForm, tempatLahir: e.target.value })}
                           />
                        </div>
                        <div className="form-group" style={{ flex: 1 }}>
                           <label className="form-label">Tanggal Lahir</label>
                           <input
                              type="date"
                              className="form-control"
                              value={editForm.tanggalLahir}
                              onChange={(e) => setEditForm({ ...editForm, tanggalLahir: e.target.value })}
                           />
                        </div>
                     </div>

                     <div className="form-group" style={{ marginBottom: "16px" }}>
                        <label className="form-label">Pendidikan Terakhir <span style={{ color: "#ef4444" }}>*</span></label>
                        <input
                           type="text"
                           className="form-control"
                           placeholder="S1/SMA/dll"
                           value={editForm.pendidikan || ""}
                           onChange={(e) => setEditForm({ ...editForm, pendidikan: e.target.value })}
                           required
                        />
                     </div>

                     <div style={{ display: "flex", gap: "12px", marginBottom: "16px" }}>
                        <div className="form-group" style={{ flex: 1 }}>
                           <label className="form-label">Pekerjaan <span style={{ color: "#ef4444" }}>*</span></label>
                           <input
                              type="text"
                              className="form-control"
                              placeholder="Pekerjaan saat ini"
                              value={editForm.pekerjaan || ""}
                              onChange={(e) => setEditForm({ ...editForm, pekerjaan: e.target.value })}
                              required
                           />
                        </div>
                        <div className="form-group" style={{ flex: 1 }}>
                           <label className="form-label">Suku <span style={{ color: "#ef4444" }}>*</span></label>
                           <input
                              type="text"
                              className="form-control"
                              placeholder="Betawi / Jawa / dll"
                              value={editForm.suku || ""}
                              onChange={(e) => setEditForm({ ...editForm, suku: e.target.value })}
                              required
                           />
                        </div>
                     </div>

                     <div style={{ display: "flex", gap: "12px", marginBottom: "16px" }}>
                        <div className="form-group" style={{ flex: 1 }}>
                           <label className="form-label">Hobi <span style={{ color: "#ef4444" }}>*</span></label>
                           <input
                              type="text"
                              className="form-control"
                              placeholder="Hobi anda"
                              value={editForm.hobi || ""}
                              onChange={(e) => setEditForm({ ...editForm, hobi: e.target.value })}
                              required
                           />
                        </div>
                        <div className="form-group" style={{ flex: 1 }}>
                           <label className="form-label">Favorit Makanan/Minuman <span style={{ color: "#ef4444" }}>*</span></label>
                           <input
                              type="text"
                              className="form-control"
                              placeholder="Sate / Jus / dll"
                              value={editForm.makananMinumanFavorit || ""}
                              onChange={(e) => setEditForm({ ...editForm, makananMinumanFavorit: e.target.value })}
                              required
                           />
                        </div>
                     </div>

                     <div className="form-group" style={{ marginBottom: "16px" }}>
                        <label className="form-label">Kriteria Pasangan (Opsional)</label>
                        <textarea
                           className="form-control"
                           rows={3}
                           placeholder="Sebutkan kriteria pasangan yang Anda harapkan"
                           value={editForm.kriteriaPasangan || ""}
                           onChange={(e) => setEditForm({ ...editForm, kriteriaPasangan: e.target.value })}
                        />
                     </div>

                     <div className="form-group" style={{ marginBottom: "16px" }}>
                        <label className="form-label">Akun Instagram (Opsional)</label>
                        <div style={{ display: "flex", alignItems: "center", position: "relative" }}>
                           <span style={{ position: "absolute", left: "10px", color: "#94a3b8" }}>@</span>
                           <input
                              type="text"
                              className="form-control"
                              style={{ paddingLeft: "30px" }}
                              placeholder="username_kamu"
                              value={editForm.instagram || ""}
                              onChange={(e) => setEditForm({ ...editForm, instagram: e.target.value })}
                           />
                        </div>
                     </div>

                     <div className="form-group" style={{ marginBottom: "16px" }}>
                        <label className="form-label">Alamat Lengkap</label>
                        <textarea
                           className="form-control"
                           rows={3}
                           placeholder="Alamat saat ini (opsional)"
                           value={editForm.alamat || ""}
                           onChange={(e) => setEditForm({ ...editForm, alamat: e.target.value })}
                        />
                     </div>
                     
                     <div className="form-group">
                        <label className="form-label">Dapukan</label>
                        <select
                           className="form-control"
                           value={editForm.dapukan}
                           onChange={(e) => setEditForm({ ...editForm, dapukan: e.target.value })}
                           required
                        >
                           <option value="Panitia">Panitia</option>
                        </select>
                     </div>
                  </div>

                  {/* Wilayah Section */}
                  <div style={{ marginBottom: "20px" }}>
                     <div style={{ fontSize: "14px", fontWeight: "700", color: "#334155", borderBottom: "1px solid #e2e8f0", paddingBottom: "8px", marginBottom: "16px" }}>2. Wilayah / Asal</div>
                     
                     <div className="form-group" style={{ marginBottom: "16px" }}>
                        <label className="form-label">Daerah</label>
                        <select
                           className="form-control"
                           value={editForm.mandiriDaerahId}
                           onChange={(e) => setEditForm({ ...editForm, mandiriDaerahId: e.target.value, mandiriDesaId: "", mandiriKelompokId: "" })}
                        >
                           <option value="">-- Pilih Daerah --</option>
                           {daerahList.map(d => <option key={d.id} value={d.id}>{d.nama}</option>)}
                        </select>
                     </div>

                     <div style={{ display: "flex", gap: "12px", marginBottom: "16px" }}>
                        <div className="form-group" style={{ flex: 1 }}>
                           <label className="form-label">Desa</label>
                           <select
                              className="form-control"
                              value={editForm.mandiriDesaId}
                              onChange={(e) => setEditForm({ ...editForm, mandiriDesaId: e.target.value, mandiriKelompokId: "" })}
                              disabled={!editForm.mandiriDaerahId}
                           >
                              <option value="">-- Pilih Desa --</option>
                              {desaList.filter(d => d.mandiriDaerahId === Number(editForm.mandiriDaerahId)).map(d => <option key={d.id} value={d.id}>{d.nama}</option>)}
                           </select>
                        </div>
                        <div className="form-group" style={{ flex: 1 }}>
                           <label className="form-label">Kelompok</label>
                           <select
                              className="form-control"
                              value={editForm.mandiriKelompokId}
                              onChange={(e) => setEditForm({ ...editForm, mandiriKelompokId: e.target.value })}
                              disabled={!editForm.mandiriDesaId}
                           >
                              <option value="">-- Pilih Kelompok --</option>
                              {kelompokList.filter(k => k.mandiriDesaId === Number(editForm.mandiriDesaId)).map(k => <option key={k.id} value={k.id}>{k.nama}</option>)}
                           </select>
                        </div>
                     </div>
                  </div>

                  <div style={{ marginTop: "24px", display: "flex", gap: "12px", justifyContent: "flex-end", borderTop: "1px solid #e2e8f0", paddingTop: "16px" }}>
                     <button type="button" className="btn btn-secondary" onClick={() => setEditModalOpen(false)}>
                        Batal
                     </button>
                     <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                        {isSubmitting ? "Menyimpan..." : "Simpan Perubahan"}
                     </button>
                  </div>
               </form>
            </div>
         </div>
      )}


      <style jsx>{`
        .badge-blue {
          background: #eff6ff;
          color: #1d4ed8;
          padding: 4px 8px;
          border-radius: 6px;
          font-size: 11px;
          font-weight: 700;
        }
        .badge-amber {
          background: #fffbeb;
          color: #b45309;
          padding: 4px 8px;
          border-radius: 6px;
          font-size: 11px;
          font-weight: 700;
        }
        .btn-outline-danger {
          background: transparent;
          border: 1px solid #fee2e2;
          color: #ef4444;
        }
        .btn-outline-danger:hover {
          background: #fef2f2;
          border-color: #fecaca;
        }
        .badge-green {
          background: #f0fdf4;
          color: #16a34a;
          padding: 4px 8px;
          border-radius: 6px;
          font-size: 11px;
          font-weight: 700;
        }
        .badge-gray {
          background: #f8fafc;
          color: #64748b;
          padding: 4px 8px;
          border-radius: 6px;
          font-size: 11px;
          font-weight: 700;
        }
        .btn-icon {
           cursor: pointer;
           transition: all 0.2s;
           display: flex;
           align-items: center;
           justify-content: center;
           margin: 0 auto;
        }
        .btn-icon:hover {
           transform: scale(1.1);
           filter: brightness(0.95);
        }
      `}</style>
    </div>
  );
}
