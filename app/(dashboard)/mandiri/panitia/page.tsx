"use client";
export const runtime = "edge";


import Topbar from "@/components/Topbar";
import { useState, useEffect, useCallback, useRef } from "react";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";
import Link from "next/link";
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
  createdAt: string;
}

export default function MandiriPanitiaPage() {
  const [data, setData] = useState<PanitiaItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [userRole, setUserRole] = useState("");
  const limit = 200;
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => r.json())
      .then((d) => setUserRole(d.role || ""));
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ search, page: String(page), limit: String(limit) });
      const res = await fetch(`/api/mandiri/panitia?${params}`);
      const json = await res.json();
      setData(json.data || []);
      setTotal(json.total || 0);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [search, page]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleUpdate = async (item: PanitiaItem) => {
    const { value: dapukan } = await Swal.fire({
      title: "Update Dapukan",
      input: "select",
      inputOptions: {
        Panitia: "Panitia",
        Pengurus: "Pengurus",
      },
      inputValue: item.dapukan,
      showCancelButton: true,
      confirmButtonText: "Simpan",
    });

    if (dapukan) {
      try {
        const res = await fetch("/api/mandiri/panitia", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: item.id, dapukan }),
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
              <h2>Pengelolaan Panitia & Pengurus</h2>
              <p>Daftar pengguna yang sudah terdaftar sebagai panitia dan pengurus kegiatan.</p>
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

          <div className="card">
            <div className="card-header" style={{ justifyContent: "space-between" }}>
              <span className="card-title">Daftar Panitia & Pengurus ({total})</span>
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
                  <p>Belum ada panitia atau pengurus yang terdaftar.</p>
                </div>
              ) : (
                <table>
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
                        <td>
                          <div style={{ width: 40, height: 40, borderRadius: "50%", background: "#f1f5f9", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>
                            {item.foto ? <img src={item.foto} alt={item.nama} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : item.nama.charAt(0)}
                          </div>
                        </td>
                        <td style={{ fontWeight: 600 }}>{item.nama}</td>
                        <td>{item.jenisKelamin}</td>
                        <td>
                          <span className={`badge ${item.dapukan === "Pengurus" ? "badge-amber" : "badge-blue"}`}>
                            {item.dapukan}
                          </span>
                        </td>
                        <td style={{ fontSize: 12, opacity: 0.8 }}>
                          {item.desaKota} / {item.desaNama}
                        </td>
                        <td style={{ fontSize: 13 }}>{item.noTelp}</td>
                        <td style={{ fontFamily: "monospace", fontSize: 14, fontWeight: "700", color: "var(--primary)" }}>{item.nomorUnik}</td>
                        <td style={{ textAlign: "center" }}>
                          {item.isHadir === 1 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                              <span className="badge badge-green">Hadir</span>
                              {item.waktuHadir && <span style={{ fontSize: '10px', opacity: 0.6 }}>{new Date(item.waktuHadir).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>}
                            </div>
                          ) : (
                            <span className="badge badge-gray">Belum Hadir</span>
                          )}
                        </td>
                        <td style={{ textAlign: "center" }}>
                           <button 
                              className="btn-icon" 
                              title="Lihat Kartu"
                              onClick={() => handleViewCard(item)}
                              style={{ color: 'var(--primary)', background: 'var(--primary-light)', padding: '6px', borderRadius: '8px', border: 'none' }}
                           >
                              <Eye size={18} />
                           </button>
                        </td>
                        <td style={{ textAlign: "center" }}>
                           <button 
                              className="btn-icon" 
                              title="Download PDF"
                              onClick={() => handleDownloadPDF(item)}
                              style={{ color: '#16a34a', background: '#f0fdf4', padding: '6px', borderRadius: '8px', border: 'none' }}
                           >
                              <Printer size={18} />
                           </button>
                        </td>
                        <td style={{ textAlign: "right" }}>
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
