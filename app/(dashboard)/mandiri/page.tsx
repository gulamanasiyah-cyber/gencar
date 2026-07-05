"use client";



import Topbar from "@/components/Topbar";

import { useState, useEffect, useCallback } from "react";
import Swal from "sweetalert2";
import * as XLSX from "xlsx";

interface MandiriItem {
   id: string;
   nomorUrut?: number;
   statusMandiri: string;
   statusPeserta?: string;
   dibayarkanSenilai?: number | null;
   buktiPembayaran?: string | null;
   catatan: string;
   generusId: string;
   nama: string;
   jenisKelamin: string;
   kategoriUsia: string;
   tanggalLahir?: string | null;
   pekerjaan?: string | null;
   desaNama: string;
   desaKota: string;
   kelompokNama?: string;
   noTelp: string;
   foto: string;
   createdAt: string;
   nomorUnik: string;
   isHadir?: number;
   waktuHadir?: string;
   keterangan?: string;
}

interface KegiatanOption { id: string; judul: string; kota: string; }

function hitungUmur(tanggalLahir?: string | null): string {
   if (!tanggalLahir) return "-";
   const lahir = new Date(tanggalLahir);
   if (isNaN(lahir.getTime())) return "-";
   const now = new Date();
   let umur = now.getFullYear() - lahir.getFullYear();
   const belumUlangTahun = now.getMonth() < lahir.getMonth() || (now.getMonth() === lahir.getMonth() && now.getDate() < lahir.getDate());
   if (belumUlangTahun) umur--;
   return `${umur} th`;
}

export default function MandiriPage() {
   const [data, setData] = useState<MandiriItem[]>([]);
   const [total, setTotal] = useState(0);
   const [loading, setLoading] = useState(true);
   const [search, setSearch] = useState("");
   const [sort, setSort] = useState(""); // "" (default), "asc", "desc"
   const [page, setPage] = useState(1);
   const [userRole, setUserRole] = useState("");
   const [regStatus, setRegStatus] = useState("1");
   const [regTitle, setRegTitle] = useState("");
   const [regDesc, setRegDesc] = useState("");
   const [regStatusPeserta, setRegStatusPeserta] = useState("Utusan Daerah");
   const [isClosed, setIsClosed] = useState(false);
   const [kegiatanList, setKegiatanList] = useState<KegiatanOption[]>([]);
   const [selectedKegiatanId, setSelectedKegiatanId] = useState("");

   const limit = 10;

   useEffect(() => {
      fetch("/api/profile").then(r => r.json()).then(d => setUserRole(d.role || ""));

      const fetchSettings = async () => {
         try {
            const [settingsRes, kegiatanRes] = await Promise.all([
               fetch("/api/settings"),
               fetch("/api/mandiri/kegiatan"),
            ]);
            const s = await settingsRes.json();
            const statusVal = s.mandiri_registration_status || "1";
            setRegStatus(statusVal);
            setIsClosed(statusVal === "0");
            setRegTitle(s.mandiri_registration_title || "");
            setRegDesc(s.mandiri_registration_description || "");
            setRegStatusPeserta(s.mandiri_registration_status_peserta || "Utusan Daerah");

            const kList = await kegiatanRes.json();
            if (Array.isArray(kList)) {
               setKegiatanList(kList);
               const activeId = s.mandiri_active_kegiatan_id || "";
               if (activeId) setSelectedKegiatanId(activeId);
               else if (kList.length > 0) setSelectedKegiatanId(kList[0].id);
            }
         } catch (e) {
            console.error("Failed to fetch unified settings:", e);
         }
      };
      fetchSettings();
   }, []);


   const handleSettings = async () => {
      // Fetch kegiatan list
      let kegiatanOptions = "";
      try {
         const res = await fetch("/api/mandiri/kegiatan");
         const kegiatanList = await res.json();
         if (Array.isArray(kegiatanList)) {
            kegiatanOptions = kegiatanList.map((k: any) => {
               const descSafe = (k.deskripsi || "").replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '&#10;');
               return `<option value="${k.id}" data-judul="${k.judul}" data-desc="${descSafe}" ${regTitle === k.judul ? "selected" : ""}>${k.judul} (${k.kota})</option>`;
            }).join("");
         }
      } catch (e) {
         console.error("Gagal mengambil kegiatan:", e);
      }

      if (!kegiatanOptions) {
          kegiatanOptions = `<option value="">-- Belum ada kegiatan --</option>`;
      }

      const { value: formValues } = await Swal.fire({
         title: "Pengaturan Pendaftaran",
         html: `
        <div style="text-align: left">
          <label class="form-label">Nama Kegiatan / Judul Form</label>
          <select id="swal-title" class="form-control" style="margin-bottom: 12px" onchange="document.getElementById('swal-desc').value = this.options[this.selectedIndex].getAttribute('data-desc') || ''">
             <option value="" data-desc="">-- Pilih Kegiatan --</option>
             ${kegiatanOptions}
          </select>
          <label class="form-label">Deskripsi Kegiatan</label>
          <textarea id="swal-desc" class="form-control" rows="3" placeholder="Contoh: Diikuti oleh seluruh usia mandiri..." style="margin-bottom: 12px">${regDesc}</textarea>
          <label class="form-label">Status Pendaftaran</label>
          <select id="swal-status" class="form-control" style="margin-bottom: 12px">
            <option value="1" ${regStatus === "1" ? "selected" : ""}>Buka (Open)</option>
            <option value="0" ${regStatus === "0" ? "selected" : ""}>Tutup (Closed)</option>
          </select>
          <label class="form-label">Status Peserta</label>
          <select id="swal-status-peserta" class="form-control">
            <option value="Utusan Daerah" ${regStatusPeserta === "Utusan Daerah" ? "selected" : ""}>Utusan Daerah</option>
            <option value="Person" ${regStatusPeserta === "Person" ? "selected" : ""}>Person</option>
          </select>
        </div>
      `,
         focusConfirm: false,
         showCancelButton: true,
         confirmButtonText: "Simpan",
         preConfirm: () => {
            const selectEl = document.getElementById("swal-title") as HTMLSelectElement;
            const selectedOption = selectEl.options[selectEl.selectedIndex];
            const titleText = selectedOption && selectEl.value !== "" ? (selectedOption.getAttribute("data-judul") || selectedOption.text) : "";
            
            return {
               id: selectEl.value,
               title: titleText,
               desc: (document.getElementById("swal-desc") as HTMLTextAreaElement).value,
               status: (document.getElementById("swal-status") as HTMLSelectElement).value,
               statusPeserta: (document.getElementById("swal-status-peserta") as HTMLSelectElement).value,
            };
         },
         footer: "Nama & deskripsi akan muncul di form publik"
      });

      if (formValues) {
         try {
            const updatePromises = [
               fetch("/api/mandiri/settings", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ key: "mandiri_registration_title", value: formValues.title }),
               }),
               fetch("/api/mandiri/settings", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ key: "mandiri_registration_description", value: formValues.desc }),
               }),
               fetch("/api/mandiri/settings", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ key: "mandiri_registration_status", value: formValues.status }),
               }),
               fetch("/api/mandiri/settings", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ key: "mandiri_registration_status_peserta", value: formValues.statusPeserta }),
               })
            ];

            // Also update active kegiatan id if an activity was selected
            if (formValues.id) {
               updatePromises.push(
                  fetch("/api/mandiri/settings", {
                     method: "POST",
                     headers: { "Content-Type": "application/json" },
                     body: JSON.stringify({ key: "mandiri_active_kegiatan_id", value: formValues.id }),
                  })
               );
            }

            await Promise.all(updatePromises);

            setRegTitle(formValues.title);
            setRegDesc(formValues.desc);
            setRegStatus(formValues.status);
            setRegStatusPeserta(formValues.statusPeserta);
            setIsClosed(formValues.status === "0");
            if (formValues.id) setSelectedKegiatanId(formValues.id);
            Swal.fire({ icon: "success", title: "Berhasil disimpan", timer: 1000, showConfirmButton: false });
         } catch (e: any) {
            Swal.fire({ icon: "error", title: "Error", text: e.message });
         }
      }
   };

   const fetchData = useCallback(async () => {
      setLoading(true);
      try {
         const params = new URLSearchParams({
            search,
            page: String(page),
            limit: String(limit),
            sort: sort
         });
         if (selectedKegiatanId) params.set("kegiatanId", selectedKegiatanId);
         const res = await fetch(`/api/mandiri?${params}`);
         const json = await res.json();
         setData(json.data || []);
         setTotal(json.total || 0);
      } catch (e) {
         console.error(e);
      } finally {
         setLoading(false);
      }
   }, [search, page, sort, selectedKegiatanId]);


   useEffect(() => {
      setPage(1);
   }, [search, sort, selectedKegiatanId]);


   useEffect(() => {
      fetchData();
   }, [fetchData]);


   const handleUpdate = async (item: MandiriItem) => {
      const { value: formValues } = await Swal.fire({
         title: "Update Status Akun",
         html: `
        <div style="text-align: left">
          <label class="form-label">Status Akun</label>
          <select id="swal-status" class="form-control" style="margin-bottom: 12px">
            <option value="Aktif" ${item.statusMandiri === "Aktif" ? "selected" : ""}>Aktif</option>
            <option value="Selesai" ${item.statusMandiri === "Selesai" ? "selected" : ""}>Selesai</option>
            <option value="Batal" ${item.statusMandiri === "Batal" ? "selected" : ""}>Batal</option>
          </select>
          <label class="form-label">Status Peserta</label>
          <select id="swal-status-peserta" class="form-control" style="margin-bottom: 12px" onchange="document.getElementById('swal-dibayarkan-container').style.display = this.value === 'Person' ? 'block' : 'none'">
            <option value="Utusan Daerah" ${item.statusPeserta !== "Person" ? "selected" : ""}>Utusan Daerah</option>
            <option value="Person" ${item.statusPeserta === "Person" ? "selected" : ""}>Person</option>
          </select>
          <div id="swal-dibayarkan-container" style="display: ${item.statusPeserta === "Person" ? 'block' : 'none'}">
             <label class="form-label">Dibayarkan Senilai (Rp)</label>
             <input type="number" id="swal-dibayarkan" class="form-control" style="margin-bottom: 12px" value="${item.dibayarkanSenilai || ''}" placeholder="Contoh: 150000" />
          </div>
          <label class="form-label">Catatan</label>
          <textarea id="swal-catatan" class="form-control" style="margin-bottom: 12px">${item.catatan || ""}</textarea>
          <div style="margin-top: 15px; padding: 12px; background: #fff7ed; border: 1px solid #ffedd5; border-radius: 8px;">
            <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; color: #9a3412; font-weight: 500;">
              <input type="checkbox" id="swal-reset-device" style="width: 16px; height: 16px;">
              Reset Perangkat (Unbind Device)
            </label>
            <p style="margin: 4px 0 0 24px; fontSize: 11px; color: #c2410c;">Centang ini jika peserta ingin mengganti perangkat login.</p>
          </div>
        </div>
      `,
         focusConfirm: false,
         showCancelButton: true,
         preConfirm: () => {
            return {
               statusMandiri: (document.getElementById("swal-status") as HTMLSelectElement).value,
               statusPeserta: (document.getElementById("swal-status-peserta") as HTMLSelectElement).value,
               dibayarkanSenilai: (document.getElementById("swal-dibayarkan") as HTMLInputElement).value || null,
               catatan: (document.getElementById("swal-catatan") as HTMLTextAreaElement).value,
               resetDevice: (document.getElementById("swal-reset-device") as HTMLInputElement).checked,
            };
         },
      });

      if (formValues) {
         try {
            const res = await fetch("/api/mandiri", {
               method: "PUT",
               headers: { "Content-Type": "application/json" },
               body: JSON.stringify({ id: item.id, ...formValues }),
            });
            if (!res.ok) throw new Error("Gagal update");
            Swal.fire({ icon: "success", title: "Berhasil", timer: 1000, showConfirmButton: false });
            fetchData();
         } catch (e: any) {
            Swal.fire({ icon: "error", title: "Error", text: e.message });
         }
      }
   };

   const handleDelete = async (id: string) => {
      const res = await Swal.fire({
         title: "Hapus Peserta?",
         text: "Data registrasi, data muda-mudi, dan akun login akan dihapus secara permanen.",
         icon: "warning",
         showCancelButton: true,
         confirmButtonColor: "#ef4444",
         cancelButtonColor: "#64748b",
         confirmButtonText: "Ya, Hapus!",
      });

      if (res.isConfirmed) {
         await fetch(`/api/mandiri?id=${id}`, { method: "DELETE" });
         Swal.fire({ icon: "success", title: "Terhapus!", timer: 1500, showConfirmButton: false });
         fetchData();
      }
   };

   const handleExportExcel = async () => {
      try {
         const params = new URLSearchParams({ search, sort, page: "1", limit: "9999" });
         if (selectedKegiatanId) params.set("kegiatanId", selectedKegiatanId);
         const res = await fetch(`/api/mandiri?${params}`);
         const json = await res.json();
         const rows: MandiriItem[] = Array.isArray(json.data) ? json.data : [];

         if (rows.length === 0) {
            Swal.fire({ icon: "warning", title: "Tidak Ada Data", text: "Tidak ada data peserta untuk diekspor." });
            return;
         }

         const exportData = rows.map((item) => ({
            "No. Peserta": item.nomorUrut ?? "-",
            "No. Unik": item.nomorUnik,
            "Nama": item.nama,
            "JK": item.jenisKelamin === "L" ? "Laki-laki" : "Perempuan",
            "Umur": hitungUmur(item.tanggalLahir),
            "Pekerjaan": item.pekerjaan || "-",
            "Daerah": item.desaKota,
            "Desa": item.desaNama,
            "Kelompok": item.kelompokNama && item.kelompokNama !== "N/A" ? item.kelompokNama : "-",
            "Kehadiran": item.keterangan === "pulang" ? "Pulang" : item.isHadir === 1 ? "Hadir" : "Belum Hadir",
            "Status Akun": item.statusMandiri,
            "Status Peserta": item.statusPeserta || "Utusan Daerah",
            "Dibayarkan Senilai": item.statusPeserta === "Person"
               ? (item.dibayarkanSenilai ? `Rp ${Number(item.dibayarkanSenilai).toLocaleString("id-ID")}` : "-")
               : "Gratis",
            "Catatan": item.catatan || "-",
         }));

         const ws = XLSX.utils.json_to_sheet(exportData);
         const wb = XLSX.utils.book_new();
         XLSX.utils.book_append_sheet(wb, ws, "Peserta Mandiri");
         const namaKegiatan = (regTitle || "Peserta_Mandiri").replace(/\s+/g, "_");
         const tanggal = new Date().toISOString().slice(0, 10);
         XLSX.writeFile(wb, `${namaKegiatan}_${tanggal}.xlsx`);
      } catch (e) {
         Swal.fire({ icon: "error", title: "Gagal", text: "Gagal mengekspor data ke Excel." });
      }
   };

   return (
      <div style={{ display: "flex", minHeight: "calc(100vh - 64px)" }}>
         <div style={{ flex: 1, minWidth: 0, position: "relative" }}>
            <Topbar title={regTitle || "Usia Mandiri / Persiapan Nikah"} role={userRole} />

            <div className="page-content">

               {isClosed && (
                  <div style={{
                     background: "#fef2f2", border: "1px solid #fee2e2", borderRadius: "12px",
                     padding: "16px", marginBottom: "20px", display: "flex", alignItems: "center", gap: "12px",
                     color: "#b91c1c"
                  }}>
                     <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 24, height: 24 }}>
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
                     </svg>
                     <div>
                        <h4 style={{ margin: 0, fontWeight: "700" }}>Pendaftaran Ditutup Manual</h4>
                        <p style={{ margin: 0, fontSize: "13px", opacity: 0.9 }}>
                           Pendaftaran mandiri saat ini ditutup oleh Admin. Calon peserta tidak dapat mengisi formulir pendaftaran.
                        </p>
                     </div>
                  </div>
               )}
               <div className="page-header">
                  <div className="page-header-left">
                     <h2>{regTitle || "Pengelolaan Peserta Mandiri"}</h2>
                     <p>Kelola data muda-mudi yang memasuki usia mandiri / persiapan nikah</p>
                  </div>
                  <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                     <button
                        className={`btn ${regStatus === "1" ? 'btn-success' : 'btn-danger'}`}
                        onClick={handleSettings}
                        title="Pengaturan Pendaftaran"
                     >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16 }}>
                           <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                        </svg>
                        {regStatus === "1" ? "Pendaftaran Buka" : "Pendaftaran Tutup"}
                     </button>
                     <button
                        className="btn btn-secondary"
                        onClick={() => {
                           const url = `${window.location.origin}/mandiri/daftar`;
                           navigator.clipboard.writeText(url);
                           Swal.fire({ icon: "success", title: "Link Disalin!", text: "Link pendaftaran mandiri berhasil disalin ke clipboard.", timer: 1500, showConfirmButton: false });
                        }}
                     >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16 }}>
                           <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                           <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                        </svg>
                        Bagikan Link
                     </button>
                     {userRole === "admin_romantic_room" && (
                        <button
                           className="btn btn-secondary"
                           onClick={handleExportExcel}
                           title="Export Data Peserta ke Excel"
                        >
                           <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16 }}>
                              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
                           </svg>
                           Export Excel
                        </button>
                     )}
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
                  <div className="card-header" style={{ justifyContent: "space-between", flexWrap: "wrap", gap: "10px" }}>
                     <span className="card-title">Daftar Peserta Mandiri ({total})</span>
                     <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                        <div className="flex gap-1">
                           <button 
                              className={`btn btn-sm ${sort === 'asc' ? 'btn-primary' : 'btn-secondary'}`} 
                              onClick={() => setSort(sort === 'asc' ? '' : 'asc')}
                              title="Urutkan No. Terkecil ke Terbesar"
                           >
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 14 }}>
                                 <path d="M12 19V5M5 12l7-7 7 7" />
                              </svg>
                              1-9
                           </button>
                           <button 
                              className={`btn btn-sm ${sort === 'desc' ? 'btn-primary' : 'btn-secondary'}`} 
                              onClick={() => setSort(sort === 'desc' ? '' : 'desc')}
                              title="Urutkan No. Terbesar ke Terkecil"
                           >
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 14 }}>
                                 <path d="M12 5v14M5 12l7 7 7-7" />
                              </svg>
                              9-1
                           </button>
                        </div>
                        <div className="search-bar" style={{ maxWidth: "250px" }}>
                           <input type="text" className="form-control" placeholder="Cari di list ini..." value={search} onChange={(e) => setSearch(e.target.value)} />
                        </div>
                     </div>
                  </div>

                  <div className="table-wrapper">
                     {loading && data.length === 0 ? (
                        <div className="loading"><div className="spinner" /></div>
                     ) : data.length === 0 ? (
                        <div className="empty-state" style={{ padding: "40px" }}>
                           <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: 48, opacity: 0.3 }}><path d="M12 2v20M2 12h20" /></svg>
                           <p>Belum ada peserta mandiri yang terdaftar.</p>
                        </div>
                     ) : (
                        <>
                           <div className="desktop-only-table">
                              <table>
                                 <thead>
                                    <tr>
                                       <th>No. Peserta</th>
                                       <th>No. Unik</th>
                                       <th>Foto</th>
                                       <th>Nama</th>
                                       <th>JK</th>
                                       <th>Umur</th>
                                       <th>Pekerjaan</th>
                                       <th>Daerah / Desa</th>
                                       <th>Kelompok</th>
                                       <th style={{ textAlign: "center" }}>Kehadiran</th>
                                       <th>Status Akun</th>
                                       <th>Status Peserta</th>
                                       <th>Dibayarkan Senilai</th>
                                       <th>Foto Bukti Bayar</th>
                                       <th>Catatan</th>
                                       <th>Aksi</th>
                                    </tr>
                                 </thead>
                                 <tbody>
                                    {data.map((item) => (
                                       <tr key={item.id}>
                                          <td data-label="No. Peserta">
                                             <span style={{ fontWeight: "700", color: "var(--primary)" }}>{item.nomorUrut}</span>
                                          </td>
                                          <td data-label="No. Unik">
                                             <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                                <span style={{ fontFamily: "monospace", fontSize: 14, fontWeight: "700", color: "var(--primary)" }}>{item.nomorUnik}</span>
                                                <button 
                                                   onClick={() => {
                                                      navigator.clipboard.writeText(item.nomorUnik);
                                                      Swal.fire({ icon: "success", title: "Disalin!", text: `Nomor unik ${item.nomorUnik} berhasil disalin.`, timer: 1000, showConfirmButton: false });
                                                   }}
                                                   style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", display: "inline-flex", alignItems: "center", color: "#64748b", borderRadius: "4px" }}
                                                   title="Salin Nomor Unik"
                                                   onMouseOver={(e) => e.currentTarget.style.background = "#f1f5f9"}
                                                   onMouseOut={(e) => e.currentTarget.style.background = "none"}
                                                >
                                                   <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: 13, height: 13 }}>
                                                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                                                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                                                   </svg>
                                                </button>
                                             </div>
                                          </td>
                                          <td data-label="Foto">
                                             <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#f1f5f9", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12 }}>
                                                {item.foto ? <img src={item.foto} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : item.nama.charAt(0)}
                                             </div>
                                          </td>
                                          <td data-label="Nama" style={{ fontWeight: 500 }}>{item.nama}</td>
                                          <td data-label="JK">{item.jenisKelamin}</td>
                                          <td data-label="Umur">{hitungUmur(item.tanggalLahir)}</td>
                                          <td data-label="Pekerjaan">{item.pekerjaan || "-"}</td>
                                          <td data-label="Daerah / Desa" style={{ fontSize: 12, opacity: 0.8 }}>
                                             {item.desaKota} / {item.desaNama}
                                          </td>
                                          <td data-label="Kelompok" style={{ fontSize: 12, opacity: 0.8 }}>
                                             {item.kelompokNama && item.kelompokNama !== "N/A" ? item.kelompokNama : "-"}
                                          </td>
                                          <td data-label="Kehadiran" style={{ textAlign: "center" }}>
                                             {item.keterangan === "pulang" ? (
                                                <span className="badge" style={{ background: '#fee2e2', color: '#ef4444', border: '1px solid #fca5a5', padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' }}>Pulang</span>
                                             ) : item.isHadir === 1 ? (
                                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                                                   <span className="badge badge-green">Hadir</span>
                                                   {item.waktuHadir && (
                                                      <span style={{ fontSize: '10px', opacity: 0.6 }}>
                                                         {new Date(item.waktuHadir).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                                                      </span>
                                                   )}
                                                </div>
                                             ) : (
                                                <span className="badge badge-gray">Belum Hadir</span>
                                             )}
                                          </td>
                                          <td data-label="Status Akun">
                                             <span className={`badge ${item.statusMandiri === "Aktif" ? "badge-blue" : "badge-gray"}`}>
                                                {item.statusMandiri}
                                             </span>
                                          </td>
                                          <td data-label="Status Peserta">
                                             <span className={`badge ${item.statusPeserta === "Person" ? "badge-purple" : "badge-blue"}`}>
                                                {item.statusPeserta || "Utusan Daerah"}
                                             </span>
                                          </td>
                                          <td data-label="Dibayarkan Senilai">
                                             {item.statusPeserta !== "Person" ? (
                                                <span className="badge badge-green">Gratis</span>
                                             ) : item.dibayarkanSenilai ? (
                                                <span style={{ fontWeight: 600, color: "#166534" }}>
                                                   Rp {Number(item.dibayarkanSenilai).toLocaleString("id-ID")}
                                                </span>
                                             ) : (
                                                <span style={{ color: "#94a3b8", fontSize: 12 }}>-</span>
                                             )}
                                          </td>
                                          <td data-label="Foto Bukti Bayar">
                                             {item.statusPeserta !== "Person" ? (
                                                <span className="badge badge-green">Gratis</span>
                                             ) : item.buktiPembayaran ? (
                                                <a href={item.buktiPembayaran} target="_blank" rel="noopener noreferrer" title="Lihat bukti pembayaran ukuran penuh">
                                                   <img
                                                      src={item.buktiPembayaran}
                                                      alt="Bukti Pembayaran"
                                                      style={{ width: 44, height: 44, borderRadius: 8, objectFit: "cover", border: "1px solid #e2e8f0" }}
                                                   />
                                                </a>
                                             ) : (
                                                <span style={{ color: "#94a3b8", fontSize: 12 }}>-</span>
                                             )}
                                          </td>
                                          <td data-label="Catatan" style={{ fontSize: 12, maxWidth: "150px", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                                             {item.catatan || "gratis"}
                                          </td>
                                          <td data-label="Aksi">
                                             <div className="flex gap-2">
                                                <button className="btn btn-sm btn-secondary" onClick={() => handleUpdate(item)}>Edit</button>
                                                <button className="btn btn-sm btn-danger" onClick={() => handleDelete(item.id)}>Hapus</button>
                                             </div>
                                          </td>
                                       </tr>
                                    ))}
                                 </tbody>
                              </table>
                           </div>

                           <div className="mobile-only-cards">
                              {data.map((item) => (
                                 <div key={item.id} className="mobile-card">
                                    <div className="card-top-row">
                                       <span className="no-urut-badge">#{item.nomorUrut}</span>
                                       <div className="unik-badge-container">
                                          <span className="unik-label">ID:</span>
                                          <span className="unik-value">{item.nomorUnik}</span>
                                          <button 
                                             onClick={() => {
                                                navigator.clipboard.writeText(item.nomorUnik);
                                                Swal.fire({ icon: "success", title: "Disalin!", text: `Nomor unik ${item.nomorUnik} berhasil disalin.`, timer: 1000, showConfirmButton: false });
                                             }}
                                             className="btn-copy-unik"
                                             title="Salin Nomor Unik"
                                          >
                                             <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: 12, height: 12 }}>
                                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                                             </svg>
                                          </button>
                                       </div>
                                    </div>

                                    <div className="profile-row">
                                       <div className="avatar-wrapper">
                                          {item.foto ? (
                                             <img src={item.foto} alt={item.nama} className="avatar-img" />
                                          ) : (
                                             <span className="avatar-initial">{item.nama.charAt(0).toUpperCase()}</span>
                                          )}
                                       </div>
                                       <div className="profile-info">
                                          <h3 className="profile-name">{item.nama}</h3>
                                          <div className="profile-badges">
                                             <span className={`gender-badge ${item.jenisKelamin === 'L' ? 'male' : 'female'}`}>
                                                {item.jenisKelamin === 'L' ? 'Laki-laki' : 'Perempuan'}
                                             </span>
                                             <span className="category-badge">{hitungUmur(item.tanggalLahir)}</span>
                                          </div>
                                       </div>
                                    </div>

                                    <div className="location-row">
                                       <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="loc-icon">
                                          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                                          <circle cx="12" cy="10" r="3" />
                                       </svg>
                                       <span className="location-text">
                                          {item.desaKota} / {item.desaNama}
                                          {item.kelompokNama && item.kelompokNama !== "N/A" ? ` / ${item.kelompokNama}` : ""}
                                       </span>
                                    </div>

                                    <div className="status-row">
                                       <div className="status-item">
                                          <span className="status-label">Pekerjaan</span>
                                          <span style={{ fontSize: 12 }}>{item.pekerjaan || "-"}</span>
                                       </div>

                                       <div className="status-item">
                                          <span className="status-label">Kehadiran</span>
                                          {item.keterangan === "pulang" ? (
                                             <span className="badge-red">Pulang</span>
                                          ) : item.isHadir === 1 ? (
                                             <div className="attendance-present">
                                                <span className="badge badge-green">Hadir</span>
                                                {item.waktuHadir && (
                                                   <span className="attendance-time">
                                                      {new Date(item.waktuHadir).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                                                   </span>
                                                )}
                                             </div>
                                          ) : (
                                             <span className="badge badge-gray">Belum Hadir</span>
                                          )}
                                       </div>

                                       <div className="status-item">
                                          <span className="status-label">Status Akun</span>
                                          <span className={`badge ${item.statusMandiri === "Aktif" ? "badge-blue" : "badge-gray"}`}>
                                             {item.statusMandiri}
                                          </span>
                                       </div>
                                       <div className="status-item">
                                          <span className="status-label">Status Peserta</span>
                                          <span className={`badge ${item.statusPeserta === "Person" ? "badge-purple" : "badge-blue"}`}>
                                             {item.statusPeserta || "Utusan Daerah"}
                                          </span>
                                       </div>
                                       <div className="status-item">
                                          <span className="status-label">Dibayarkan Senilai</span>
                                          {item.statusPeserta !== "Person" ? (
                                             <span className="badge badge-green">Gratis</span>
                                          ) : item.dibayarkanSenilai ? (
                                             <span style={{ fontSize: 12, fontWeight: 600, color: "#166534" }}>
                                                Rp {Number(item.dibayarkanSenilai).toLocaleString("id-ID")}
                                             </span>
                                          ) : (
                                             <span style={{ color: "#94a3b8", fontSize: 12 }}>-</span>
                                          )}
                                       </div>
                                       <div className="status-item">
                                          <span className="status-label">Foto Bukti Bayar</span>
                                          {item.statusPeserta !== "Person" ? (
                                             <span className="badge badge-green">Gratis</span>
                                          ) : item.buktiPembayaran ? (
                                             <a href={item.buktiPembayaran} target="_blank" rel="noopener noreferrer" title="Lihat bukti pembayaran ukuran penuh">
                                                <img
                                                   src={item.buktiPembayaran}
                                                   alt="Bukti Pembayaran"
                                                   style={{ width: 44, height: 44, borderRadius: 8, objectFit: "cover", border: "1px solid #e2e8f0" }}
                                                />
                                             </a>
                                          ) : (
                                             <span style={{ color: "#94a3b8", fontSize: 12 }}>-</span>
                                          )}
                                       </div>
                                    </div>

                                    {item.catatan && (
                                       <div className="notes-box">
                                          <span className="notes-title">Catatan:</span>
                                          <p className="notes-content">{item.catatan}</p>
                                       </div>
                                    )}

                                    <div className="card-actions">
                                       <button className="btn btn-sm btn-secondary flex-grow" onClick={() => handleUpdate(item)}>
                                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 14, height: 14, marginRight: 6 }}>
                                             <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                             <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                          </svg>
                                          Edit Status
                                       </button>
                                       <button className="btn btn-sm btn-danger-outline" onClick={() => handleDelete(item.id)}>
                                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 14, height: 14 }}>
                                             <polyline points="3 6 5 6 21 6" />
                                             <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                          </svg>
                                       </button>
                                    </div>
                                 </div>
                              ))}
                           </div>
                        </>
                     )}
                  </div>

                  {total > limit && (
                     <div className="card-footer" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 20px", borderTop: "1px solid #e2e8f0" }}>
                        <span style={{ fontSize: "13px", color: "#64748b" }}>
                           Halaman {page} dari {Math.ceil(total / limit)}
                        </span>
                        <div style={{ display: "flex", gap: "5px" }}>
                           <button 
                              className="btn btn-sm btn-secondary" 
                              disabled={page === 1} 
                              onClick={() => setPage(p => Math.max(1, p - 1))}
                           >
                              Prev
                           </button>
                           {/* Simple pagination: show max 5 page buttons */}
                           {Array.from({ length: Math.ceil(total / limit) }, (_, i) => i + 1)
                              .filter(p => p === 1 || p === Math.ceil(total / limit) || Math.abs(p - page) <= 1)
                              .map((p, i, arr) => (
                                 <div key={p} style={{ display: "flex", gap: "5px" }}>
                                    {i > 0 && p - arr[i-1] > 1 && <span style={{ alignSelf: "flex-end", color: "#cbd5e1" }}>...</span>}
                                    <button 
                                       className={`btn btn-sm ${page === p ? 'btn-primary' : 'btn-secondary'}`}
                                       onClick={() => setPage(p)}
                                    >
                                       {p}
                                    </button>
                                 </div>
                              ))
                           }
                           <button 
                              className="btn btn-sm btn-secondary" 
                              disabled={page === Math.ceil(total / limit)} 
                              onClick={() => setPage(p => Math.min(Math.ceil(total / limit), p + 1))}
                           >
                              Next
                           </button>
                        </div>
                     </div>
                  )}
               </div>
            </div>
         </div>
         <style jsx>{`
            .desktop-only-table {
               display: block;
               overflow-x: auto;
               -webkit-overflow-scrolling: touch;
            }
            .desktop-only-table table {
               min-width: 1500px;
            }
            .mobile-only-cards {
               display: none;
            }
            .badge-blue { background: #eff6ff; color: #1d4ed8; }
            .badge-gray {
               background: #f8fafc;
               color: #64748b;
               padding: 4px 8px;
               border-radius: 6px;
               font-size: 11px;
               font-weight: 700;
            }
            .badge-green {
               background: #f0fdf4;
               color: #16a34a;
               padding: 4px 8px;
               border-radius: 6px;
               font-size: 11px;
               font-weight: 700;
            }
            table thead th {
               position: sticky;
               top: 0;
               background: #f8fafc;
               z-index: 10;
               box-shadow: 0 1px 0 #e2e8f0;
            }
            @media (max-width: 1024px) {
               .desktop-only-table {
                  display: none;
               }
               .mobile-only-cards {
                  display: flex;
                  flex-direction: column;
                  gap: 14px;
                  padding: 4px 0;
               }
               .mobile-card {
                  background: #ffffff;
                  border: 1px solid #e2e8f0;
                  border-radius: 12px;
                  padding: 14px;
                  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px 0 rgba(0, 0, 0, 0.03);
                  display: flex;
                  flex-direction: column;
                  gap: 12px;
                  transition: transform 0.2s, box-shadow 0.2s;
               }
               .mobile-card:hover {
                  transform: translateY(-1px);
                  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
               }
               .card-top-row {
                  display: flex;
                  justify-content: space-between;
                  align-items: center;
                  border-bottom: 1px solid #f1f5f9;
                  padding-bottom: 8px;
               }
               .no-urut-badge {
                  background: #f1f5f9;
                  color: #475569;
                  font-weight: 700;
                  font-size: 12px;
                  padding: 4px 8px;
                  border-radius: 6px;
               }
               .unik-badge-container {
                  display: flex;
                  align-items: center;
                  gap: 4px;
                  background: #f0fdf4;
                  border: 1px solid #bbf7d0;
                  padding: 2px 8px;
                  border-radius: 6px;
               }
               .unik-label {
                  font-size: 10px;
                  font-weight: 600;
                  color: #16a34a;
                  text-transform: uppercase;
               }
               .unik-value {
                  font-family: monospace;
                  font-size: 13px;
                  font-weight: 700;
                  color: #15803d;
               }
               .btn-copy-unik {
                  background: none;
                  border: none;
                  padding: 2px;
                  cursor: pointer;
                  color: #16a34a;
                  display: inline-flex;
                  align-items: center;
                  border-radius: 4px;
               }
               .btn-copy-unik:hover {
                  background: #dcfce7;
               }
               .profile-row {
                  display: flex;
                  gap: 12px;
                  align-items: center;
               }
               .avatar-wrapper {
                  width: 48px;
                  height: 48px;
                  border-radius: 50%;
                  overflow: hidden;
                  background: #f1f5f9;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  border: 2px solid #e2e8f0;
                  flex-shrink: 0;
               }
               .avatar-img {
                  width: 100%;
                  height: 100%;
                  object-fit: cover;
               }
               .avatar-initial {
                  font-size: 18px;
                  font-weight: 700;
                  color: #64748b;
               }
               .profile-info {
                  display: flex;
                  flex-direction: column;
                  gap: 4px;
               }
               .profile-name {
                  margin: 0;
                  font-size: 15px;
                  font-weight: 700;
                  color: #1e293b;
               }
               .profile-badges {
                  display: flex;
                  gap: 6px;
                  flex-wrap: wrap;
               }
               .gender-badge {
                  font-size: 11px;
                  padding: 2px 6px;
                  border-radius: 4px;
                  font-weight: 500;
               }
               .gender-badge.male {
                  background: #e0f2fe;
                  color: #0369a1;
               }
               .gender-badge.female {
                  background: #fce7f3;
                  color: #be185d;
               }
               .category-badge {
                  background: #f3f4f6;
                  color: #4b5563;
                  font-size: 11px;
                  padding: 2px 6px;
                  border-radius: 4px;
                  font-weight: 500;
               }
               .location-row {
                  display: flex;
                  align-items: center;
                  gap: 6px;
                  color: #64748b;
                  font-size: 12.5px;
               }
               .loc-icon {
                  width: 14px;
                  height: 14px;
                  color: #94a3b8;
                  flex-shrink: 0;
               }
               .location-text {
                  font-weight: 500;
               }
               .status-row {
                  display: grid;
                  grid-template-columns: 1fr 1fr;
                  gap: 12px;
                  background: #f8fafc;
                  padding: 10px;
                  border-radius: 10px;
               }
               .status-item {
                  display: flex;
                  flex-direction: column;
                  gap: 4px;
               }
               .status-label {
                  font-size: 10px;
                  font-weight: 600;
                  color: #94a3b8;
                  text-transform: uppercase;
                  letter-spacing: 0.5px;
               }
               .attendance-present {
                  display: flex;
                  flex-direction: column;
                  gap: 2px;
               }
               .attendance-time {
                  font-size: 9.5px;
                  color: #64748b;
                  font-weight: 500;
                  padding-left: 2px;
               }
               .notes-box {
                  background: #fffbeb;
                  border: 1px dashed #fef3c7;
                  border-radius: 8px;
                  padding: 8px 12px;
               }
               .notes-title {
                  font-size: 10px;
                  font-weight: 700;
                  color: #b45309;
                  text-transform: uppercase;
                  display: block;
                  margin-bottom: 2px;
               }
               .notes-content {
                  margin: 0;
                  font-size: 12px;
                  color: #78350f;
                  line-height: 1.4;
               }
               .card-actions {
                  display: flex;
                  gap: 8px;
                  padding: 14px;
                  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px 0 rgba(0, 0, 0, 0.03);
                  display: flex;
                  flex-direction: column;
gap: 12px;
                  transition: transform 0.2s, box-shadow 0.2s;
               }
               .mobile-card:hover {
                  transform: translateY(-1px);
                  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
               }
               .card-top-row {
                  display: flex;
                  justify-content: space-between;
                  align-items: center;
                  border-bottom: 1px solid #f1f5f9;
                  padding-bottom: 8px;
               }
               .no-urut-badge {
                  background: #f1f5f9;
                  color: #475569;
                  font-weight: 700;
                  font-size: 12px;
                  padding: 4px 8px;
                  border-radius: 6px;
               }
               .unik-badge-container {
                  display: flex;
                  align-items: center;
                  gap: 4px;
                  background: #f0fdf4;
                  border: 1px solid #bbf7d0;
                  padding: 2px 8px;
                  border-radius: 6px;
               }
               .unik-label {
                  font-size: 10px;
                  font-weight: 600;
                  color: #16a34a;
                  text-transform: uppercase;
               }
               .unik-value {
                  font-family: monospace;
                  font-size: 13px;
                  font-weight: 700;
                  color: #15803d;
               }
               .btn-copy-unik {
                  background: none;
                  border: none;
                  padding: 2px;
                  cursor: pointer;
                  color: #16a34a;
                  display: inline-flex;
                  align-items: center;
                  border-radius: 4px;
               }
               .btn-copy-unik:hover {
                  background: #dcfce7;
               }
               .profile-row {
                  display: flex;
                  gap: 12px;
                  align-items: center;
               }
               .avatar-wrapper {
                  width: 48px;
                  height: 48px;
                  border-radius: 50%;
                  overflow: hidden;
                  background: #f1f5f9;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  border: 2px solid #e2e8f0;
                  flex-shrink: 0;
               }
               .avatar-img {
                  width: 100%;
                  height: 100%;
                  object-fit: cover;
               }
               .avatar-initial {
                  font-size: 18px;
                  font-weight: 700;
                  color: #64748b;
               }
               .profile-info {
                  display: flex;
                  flex-direction: column;
                  gap: 4px;
               }
               .profile-name {
                  margin: 0;
                  font-size: 15px;
                  font-weight: 700;
                  color: #1e293b;
               }
               .profile-badges {
                  display: flex;
                  gap: 6px;
                  flex-wrap: wrap;
               }
               .gender-badge {
                  font-size: 11px;
                  padding: 2px 6px;
                  border-radius: 4px;
                  font-weight: 500;
               }
               .gender-badge.male {
                  background: #e0f2fe;
                  color: #0369a1;
               }
               .gender-badge.female {
                  background: #fce7f3;
                  color: #be185d;
               }
               .category-badge {
                  background: #f3f4f6;
                  color: #4b5563;
                  font-size: 11px;
                  padding: 2px 6px;
                  border-radius: 4px;
                  font-weight: 500;
               }
               .location-row {
                  display: flex;
                  align-items: center;
                  gap: 6px;
                  color: #64748b;
                  font-size: 12.5px;
               }
               .loc-icon {
                  width: 14px;
                  height: 14px;
                  color: #94a3b8;
                  flex-shrink: 0;
               }
               .location-text {
                  font-weight: 500;
               }
               .status-row {
                  display: grid;
                  grid-template-columns: 1fr 1fr;
                  gap: 12px;
                  background: #f8fafc;
                  padding: 10px;
                  border-radius: 10px;
               }
               .status-item {
                  display: flex;
                  flex-direction: column;
                  gap: 4px;
               }
               .status-label {
                  font-size: 10px;
                  font-weight: 600;
                  color: #94a3b8;
                  text-transform: uppercase;
                  letter-spacing: 0.5px;
               }
               .attendance-present {
                  display: flex;
                  flex-direction: column;
                  gap: 2px;
               }
               .attendance-time {
                  font-size: 9.5px;
                  color: #64748b;
                  font-weight: 500;
                  padding-left: 2px;
               }
               .notes-box {
                  background: #fffbeb;
                  border: 1px dashed #fef3c7;
                  border-radius: 8px;
                  padding: 8px 12px;
               }
               .notes-title {
                  font-size: 10px;
                  font-weight: 700;
                  color: #b45309;
                  text-transform: uppercase;
                  display: block;
                  margin-bottom: 2px;
               }
               .notes-content {
                  margin: 0;
                  font-size: 12px;
                  color: #78350f;
                  line-height: 1.4;
               }
               .card-actions {
                  display: flex;
                  gap: 8px;
                  margin-top: 4px;
               }
               .flex-grow {
                  flex-grow: 1;
               }
               .btn-danger-outline {
                  background: #fff5f5;
                  border: 1px solid #fee2e2;
                  color: #ef4444;
                  padding: 6px 12px;
                  border-radius: 6px;
                  cursor: pointer;
                  display: inline-flex;
                  align-items: center;
                  justify-content: center;
                  transition: all 0.2s;
               }
               .btn-danger-outline:hover {
                  background: #fee2e2;
                  border-color: #fca5a5;
               }
               .badge-red {
                  background: #fee2e2;
                  color: #ef4444;
                  border: 1px solid #fca5a5;
                  padding: 3px 8px;
                  border-radius: 4px;
                  font-size: 11px;
                  font-weight: bold;
                  display: inline-block;
                  width: fit-content;
               }
               
               /* Make page header and card search-bar stack nicely on mobile */
               .page-header {
                  flex-direction: column;
                  align-items: stretch !important;
                  gap: 12px !important;
               }
               .page-header-left {
                  margin-bottom: 4px;
               }
               .page-header > div {
                  display: flex;
                  width: 100%;
                  gap: 8px;
                  flex-wrap: wrap;
               }
               .page-header > div > .btn {
                  flex: 1;
                  justify-content: center;
                  font-size: 13px;
                  padding: 8px 12px;
                  white-space: nowrap;
               }
               .card-header {
                  flex-direction: column;
                  align-items: stretch !important;
                  gap: 12px !important;
               }
               .card-header > div {
                  width: 100%;
                  justify-content: space-between;
               }
               .search-bar {
                  max-width: none !important;
                  flex-grow: 1;
               }
            }
         `}</style>
      </div>
   );
}
