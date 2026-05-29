"use client";
export const runtime = "edge";



import Topbar from "@/components/Topbar";

import { useState, useEffect, useCallback } from "react";
import Swal from "sweetalert2";

interface MandiriItem {
   id: string;
   nomorUrut?: number;
   statusMandiri: string;
   catatan: string;
   generusId: string;
   nama: string;
   jenisKelamin: string;
   kategoriUsia: string;
   desaNama: string;
   desaKota: string;
   noTelp: string;
   foto: string;
   createdAt: string;
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
   const [isClosed, setIsClosed] = useState(false);


   const limit = 10;

   useEffect(() => {
      fetch("/api/profile").then(r => r.json()).then(d => setUserRole(d.role || ""));

      // Fetch individual settings
      const fetchSettings = async () => {
         try {
            const res = await fetch("/api/settings");
            const s = await res.json();
            const statusVal = s.mandiri_registration_status || "1";
            setRegStatus(statusVal);
            setIsClosed(statusVal === "0");
            setRegTitle(s.mandiri_registration_title || "");
            setRegDesc(s.mandiri_registration_description || "");
         } catch (e) {
            console.error("Failed to fetch unified settings:", e);
         }
      };
      fetchSettings();
   }, []);


   const handleSettings = async () => {
      const { value: formValues } = await Swal.fire({
         title: "Pengaturan Pendaftaran",
         html: `
        <div style="text-align: left">
          <label class="form-label">Nama Kegiatan / Judul Form</label>
          <input id="swal-title" class="form-control" value="${regTitle}" placeholder="Contoh: Pra-Nikah Daerah 2024" style="margin-bottom: 12px">
          <label class="form-label">Deskripsi Kegiatan</label>
          <textarea id="swal-desc" class="form-control" rows="3" placeholder="Contoh: Diikuti oleh seluruh usia mandiri..." style="margin-bottom: 12px">${regDesc}</textarea>
          <label class="form-label">Status Pendaftaran</label>
          <select id="swal-status" class="form-control">
            <option value="1" ${regStatus === "1" ? "selected" : ""}>Buka (Open)</option>
            <option value="0" ${regStatus === "0" ? "selected" : ""}>Tutup (Closed)</option>
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
               status: (document.getElementById("swal-status") as HTMLSelectElement).value,
            };
         },
         footer: "Nama & deskripsi akan muncul di form publik"
      });

      if (formValues) {
         try {
            await Promise.all([
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
               })
            ]);
            setRegTitle(formValues.title);
            setRegDesc(formValues.desc);
            setRegStatus(formValues.status);
            setIsClosed(formValues.status === "Waktu Habis");
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
         const res = await fetch(`/api/mandiri?${params}`);
         const json = await res.json();
         setData(json.data || []);
         setTotal(json.total || 0);
      } catch (e) {
         console.error(e);
      } finally {
         setLoading(false);
      }
   }, [search, page, sort]);


   useEffect(() => {
      setPage(1);
   }, [search, sort]);


   useEffect(() => {
      fetchData();
   }, [fetchData]);


   const handleUpdate = async (item: MandiriItem) => {
      const { value: formValues } = await Swal.fire({
         title: "Update Status Mandiri",
         html: `
        <div style="text-align: left">
          <label class="form-label">Status</label>
          <select id="swal-status" class="form-control" style="margin-bottom: 12px">
            <option value="Aktif" ${item.statusMandiri === "Aktif" ? "selected" : ""}>Aktif</option>
            <option value="Selesai" ${item.statusMandiri === "Selesai" ? "selected" : ""}>Selesai</option>
            <option value="Batal" ${item.statusMandiri === "Batal" ? "selected" : ""}>Batal</option>
          </select>
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


   return (
      <div style={{ display: "flex", minHeight: "calc(100vh - 64px)" }}>
         <div style={{ flex: 1, position: "relative" }}>
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
                  <div style={{ display: "flex", gap: "10px" }}>
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
                  </div>
               </div>

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
                        <table>
                           <thead>
                              <tr>
                                 <th>No. Peserta</th>
                                 <th>Foto</th>
                                 <th>Nama</th>
                                 <th>JK</th>
                                 <th>Kategori</th>
                                 <th>Daerah / Desa</th>
                                 <th>Status Mandiri</th>
                                 <th>Catatan</th>
                                 <th>Aksi</th>
                              </tr>
                           </thead>
                           <tbody>
                              {data.map((item) => (
                                 <tr key={item.id}>
                                    <td>
                                       <span style={{ fontWeight: "700", color: "var(--primary)" }}>{item.nomorUrut}</span>
                                    </td>
                                    <td>
                                       <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#f1f5f9", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12 }}>
                                          {item.foto ? <img src={item.foto} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : item.nama.charAt(0)}
                                       </div>
                                    </td>
                                    <td style={{ fontWeight: 500 }}>{item.nama}</td>
                                    <td>{item.jenisKelamin}</td>
                                    <td>{item.kategoriUsia}</td>
                                    <td style={{ fontSize: 12, opacity: 0.8 }}>
                                       {item.desaKota} / {item.desaNama}
                                    </td>
                                    <td>
                                       <span className={`badge ${item.statusMandiri === "Aktif" ? "badge-blue" : "badge-gray"}`}>
                                          {item.statusMandiri}
                                       </span>
                                    </td>
                                    <td style={{ fontSize: 12, maxWidth: "150px", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                                       {item.catatan || "-"}
                                    </td>
                                    <td>
                                       <div className="flex gap-2">
                                          <button className="btn btn-sm btn-secondary" onClick={() => handleUpdate(item)}>Edit</button>
                                          <button className="btn btn-sm btn-danger" onClick={() => handleDelete(item.id)}>Hapus</button>
                                       </div>
                                    </td>
                                 </tr>
                              ))}
                           </tbody>
                        </table>
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
            .badge-blue { background: #eff6ff; color: #1d4ed8; }
            .badge-gray { background: #f1f5f9; color: #475569; }
            table thead th {
               position: sticky;
               top: 0;
               background: #f8fafc;
               z-index: 10;
               box-shadow: 0 1px 0 #e2e8f0;
            }
         `}</style>
      </div>
   );
}
