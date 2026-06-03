"use client";



import Topbar from "@/components/Topbar";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import Swal from "sweetalert2";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

interface RabItem {
  id: string;
  item: string;
  volume: number;
  satuan: string;
  hargaSatuan: number;
  totalHarga: number;
  keterangan: string | null;
}

interface Activity {
  id: string;
  judul: string;
  tanggal: string;
}

export default function RabPage() {
  const searchParams = useSearchParams();
  const type = searchParams.get("type") || "kegiatan"; // "kegiatan" or "mandiri"
  const isMandiri = type === "mandiri";
  
  const pageTitle = isMandiri ? "RAB Usia Mandiri/Nikah" : "Rencana Anggaran Biaya (RAB)";
  const pageSubtitle = isMandiri ? "Pengelolaan anggaran khusus kegiatan Usia Mandiri / Nikah" : "Rincian rencana anggaran biaya untuk setiap kegiatan";
  
  const [activities, setActivities] = useState<Activity[]>([]);
  const [selectedActivityId, setSelectedActivityId] = useState<string>("");
  const [rabItems, setRabItems] = useState<RabItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<RabItem | null>(null);
  const [session, setSession] = useState<any>(null);
  const [approvalStatus, setApprovalStatus] = useState<any>(null);
  const [approving, setApproving] = useState(false);



  const fetchActivities = useCallback(async () => {
    try {
      const endpoint = isMandiri ? "/api/mandiri/kegiatan" : "/api/kegiatan";
      const res = await fetch(endpoint);
      const data = await res.json();
      setActivities(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("Failed to fetch activities", e);
    }
  }, [isMandiri]);

  const fetchApprovalStatus = useCallback(async (activityId: string) => {
    if (!activityId) return;
    try {
      const param = isMandiri ? `mandiriKegiatanId=${activityId}` : `kegiatanId=${activityId}`;
      const res = await fetch(`/api/rab/approval?${param}`);
      const data = await res.json();
      setApprovalStatus(data);
    } catch (e) {
      console.error("Failed to fetch approval status", e);
    }
  }, [isMandiri]);

  const fetchRabItems = useCallback(async (activityId: string) => {
    if (!activityId) {
      setRabItems([]);
      return;
    }
    setLoading(true);
    try {
      const param = isMandiri ? `mandiriKegiatanId=${activityId}` : `kegiatanId=${activityId}`;
      const res = await fetch(`/api/rab?${param}`);
      const data = await res.json();
      setRabItems(Array.isArray(data) ? data : []);
      fetchApprovalStatus(activityId);
    } catch (e) {
      console.error("Failed to fetch RAB items", e);
    } finally {
      setLoading(false);
    }
  }, [isMandiri, fetchApprovalStatus]);

  useEffect(() => {
    fetch("/api/profile").then(r => r.json()).then(setSession).catch(() => setSession(null));
    fetchActivities();
    setSelectedActivityId(""); // Reset when type changes
  }, [fetchActivities, type]);

  useEffect(() => {
    if (selectedActivityId) {
      fetchRabItems(selectedActivityId);
    } else {
      setRabItems([]);
    }
  }, [selectedActivityId, fetchRabItems]);

  const handleDelete = async (id: string) => {
    const res = await Swal.fire({
      title: 'Hapus Item?',
      text: "Data yang dihapus tidak dapat dikembalikan!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Ya, Hapus!',
      cancelButtonText: 'Batal'
    });
    
    if (res.isConfirmed) {
      const response = await fetch(`/api/rab/${id}`, { method: "DELETE" });
      if (response.ok) {
        Swal.fire({ icon: 'success', title: 'Terhapus!', timer: 1000, showConfirmButton: false });
        fetchRabItems(selectedActivityId);
      }
    }
  };

  const handleApproval = async (status: string) => {
    const isReset = status === 'pending';
    const { value: catatan } = await Swal.fire({
      title: isReset ? 'Batalkan Status Persetujuan?' : `${status === 'approved' ? 'Setujui' : 'Tolak'} RAB ini?`,
      input: isReset ? undefined : 'textarea',
      inputLabel: isReset ? (status === 'pending' ? 'Status akan dikembalikan ke PENDING' : 'Tambahkan catatan (opsional)') : 'Tambahkan catatan (opsional)',
      inputPlaceholder: 'Tulis catatan Anda di sini...',
      showCancelButton: true,
      confirmButtonColor: isReset ? '#64748b' : (status === 'approved' ? '#22c55e' : '#ef4444'),
      confirmButtonText: isReset ? 'Ya, Batalkan' : (status === 'approved' ? 'Ya, Setujui' : 'Ya, Tolak'),
      cancelButtonText: 'Batal'
    });

    if (catatan !== undefined || isReset) {
      setApproving(true);
      try {
        const body = {
          [isMandiri ? "mandiriKegiatanId" : "kegiatanId"]: selectedActivityId,
          status,
          catatan
        };
        const res = await fetch("/api/rab/approval", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body)
        });
        if (res.ok) {
          Swal.fire({ icon: 'success', title: 'Berhasil', timer: 1500, showConfirmButton: false });
          fetchApprovalStatus(selectedActivityId);
        } else {
          Swal.fire("Error", "Gagal memperbarui status", "error");
        }
      } catch (e) {
        Swal.fire("Error", "Gagal menghubungi server", "error");
      } finally {
        setApproving(false);
      }
    }
  };

  const handleSubmission = async (submit: boolean) => {
    const res = await Swal.fire({
      title: submit ? 'Ajukan RAB ini?' : 'Batalkan Pengajuan RAB?',
      text: submit ? 'RAB akan diajukan ke Pengurus Daerah untuk ditinjau.' : 'Status pengajuan akan dibatalkan.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#3b82f6',
      confirmButtonText: submit ? 'Ya, Ajukan' : 'Ya, Batalkan'
    });

    if (res.isConfirmed) {
      setApproving(true);
      try {
        const body = {
          [isMandiri ? "mandiriKegiatanId" : "kegiatanId"]: selectedActivityId,
          isSubmitted: submit
        };
        const apiRes = await fetch("/api/rab/approval", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body)
        });
        if (apiRes.ok) {
          Swal.fire({ icon: 'success', title: 'Berhasil', timer: 1500, showConfirmButton: false });
          fetchApprovalStatus(selectedActivityId);
        }
      } catch (e) {
        Swal.fire("Error", "Gagal menghubungi server", "error");
      } finally {
        setApproving(false);
      }
    }
  };

  const totalAnggaran = useMemo(() => {
    return rabItems.reduce((sum, item) => sum + item.totalHarga, 0);
  }, [rabItems]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(val);
  };

  const selectedActivity = useMemo(() => {
    return activities.find(a => a.id === selectedActivityId);
  }, [activities, selectedActivityId]);

  const handleExportPDFV2 = () => {
    if (!selectedActivity || rabItems.length === 0) return;

    const doc = new jsPDF();
    const title = `RENCANA ANGGARAN BIAYA (RAB)`;
    const subtitle = isMandiri ? `KEGIATAN USIA MANDIRI/NIKAH` : `PENGELOLAAN KEGIATAN`;
    const activityName = selectedActivity.judul.toUpperCase();
    const dateStr = new Date(selectedActivity.tanggal).toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

    // Header
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text(title, 105, 15, { align: "center" });
    doc.setFontSize(12);
    doc.text(subtitle, 105, 22, { align: "center" });
    doc.setFontSize(14);
    doc.text(activityName, 105, 30, { align: "center" });
    
    doc.setLineWidth(0.5);
    doc.line(14, 35, 196, 35);

    // Info
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Tanggal Kegiatan : ${dateStr}`, 14, 45);
    doc.text(`Dicetak Oleh       : ${session?.nama || session?.name || "User"}`, 14, 50);
    doc.text(`Waktu Cetak       : ${new Date().toLocaleString("id-ID")}`, 14, 55);

    const tableData = rabItems.map((item, index) => [
      index + 1,
      item.item,
      `${item.volume} ${item.satuan}`,
      formatCurrency(item.hargaSatuan),
      formatCurrency(item.totalHarga),
      item.keterangan || "-"
    ]);

    autoTable(doc, {
      head: [["No", "Item Pekerjaan/Barang", "Volume", "Harga Satuan", "Total", "Keterangan"]],
      body: tableData,
      startY: 65,
      theme: "striped",
      headStyles: { fillColor: [37, 99, 235], textColor: [255, 255, 255], fontStyle: "bold" },
      foot: [["", "", "", "TOTAL ANGGARAN", formatCurrency(totalAnggaran), ""]],
      footStyles: { fillColor: [241, 245, 249], textColor: [0, 0, 0], fontStyle: "bold" },
      columnStyles: {
        0: { cellWidth: 10 },
        2: { halign: 'center' },
        3: { halign: 'right' },
        4: { halign: 'right' },
      }
    });

    const finalY = (doc as any).lastAutoTable.finalY + 15;

    // Approval Section
    if (finalY < 230) {
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text("STATUS PERSETUJUAN:", 14, finalY);
      
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text(`1. Pengurus Daerah : ${approvalStatus?.statusPengurus?.toUpperCase() || 'PENDING'}`, 14, finalY + 8);
      if (approvalStatus?.catatanPengurus) doc.text(`   Catatan: ${approvalStatus.catatanPengurus}`, 14, finalY + 13);
      
      const nextY = approvalStatus?.catatanPengurus ? 22 : 16;
      doc.text(`2. Admin Utama     : ${approvalStatus?.statusAdmin?.toUpperCase() || 'PENDING'}`, 14, finalY + nextY);
      if (approvalStatus?.catatanAdmin) doc.text(`   Catatan: ${approvalStatus.catatanAdmin}`, 14, finalY + nextY + 5);

      // Signature placements
      const signY = finalY + 40;
      if (signY < 270) {
        doc.text("Dibuat Oleh,", 30, signY);
        doc.text("____________________", 20, signY + 25);
        doc.text("( Admin Keuangan )", 25, signY + 32);

        doc.text("Disetujui Oleh,", 150, signY);
        doc.text("____________________", 140, signY + 25);
        doc.text("( Pengurus Daerah )", 143, signY + 32);
      }
    }

    doc.save(`RAB_${selectedActivity.judul.replace(/\s+/g, "_")}.pdf`);
  };

  const handleExportExcel = () => {
    if (!selectedActivity || rabItems.length === 0) return;

    const exportData = rabItems.map((item) => ({
      "Nama Item": item.item,
      "Volume": item.volume,
      "Satuan": item.satuan,
      "Harga Satuan": item.hargaSatuan,
      "Total Harga": item.totalHarga,
      "Keterangan": item.keterangan || "-"
    }));

    // Add Total Row
    exportData.push({
      "Nama Item": "TOTAL",
      "Volume": 0,
      "Satuan": "",
      "Harga Satuan": 0,
      "Total Harga": totalAnggaran,
      "Keterangan": ""
    });

    // Approval Status Row
    exportData.push({
      "Nama Item": "--- STATUS PERSETUJUAN ---",
      "Volume": 0,
      "Satuan": "",
      "Harga Satuan": 0,
      "Total Harga": 0,
      "Keterangan": ""
    });
    exportData.push({
      "Nama Item": "Pengurus Daerah",
      "Volume": 0,
      "Satuan": "",
      "Harga Satuan": 0,
      "Total Harga": 0,
      "Keterangan": approvalStatus?.statusPengurus?.toUpperCase() || "PENDING"
    });
    exportData.push({
      "Nama Item": "Admin Utama",
      "Volume": 0,
      "Satuan": "",
      "Harga Satuan": 0,
      "Total Harga": 0,
      "Keterangan": approvalStatus?.statusAdmin?.toUpperCase() || "PENDING"
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "RAB");
    XLSX.writeFile(wb, `RAB_${selectedActivity.judul.replace(/\s+/g, "_")}.xlsx`);
  };


  return (
    <div>
      <Topbar title={pageTitle} role={session?.role} />
      <div className="page-content">
        <div className="page-header">
          <div className="page-header-left">
            <h2 className="flex items-center gap-2">
               {isMandiri ? (
                 <span style={{ padding: '4px 10px', background: 'rgba(236, 72, 153, 0.1)', color: '#ec4899', borderRadius: '6px', fontSize: '12px', fontWeight: 600 }}>USIA MANDIRI/NIKAH</span>
               ) : (
                 <span style={{ padding: '4px 10px', background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', borderRadius: '6px', fontSize: '12px', fontWeight: 600 }}>DATA & KONTEN</span>
               )}
               {isMandiri ? "Formulir RAB Kegiatan Mandiri" : "Formulir RAB Kegiatan"}
            </h2>
            <p>{pageSubtitle}</p>
          </div>
        </div>

        <div className="card" style={{ marginBottom: "24px" }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontWeight: 600 }}>Pilih Kegiatan:</label>
            <select 
              className="form-control" 
              value={selectedActivityId} 
              onChange={(e) => setSelectedActivityId(e.target.value)}
              style={{ maxWidth: "400px" }}
            >
              <option value="">-- Pilih Kegiatan --</option>
              {activities.map((act) => (
                <option key={act.id} value={act.id}>
                  {act.judul} ({new Date(act.tanggal).toLocaleDateString("id-ID")})
                </option>
              ))}
            </select>
          </div>
        </div>

        {selectedActivityId ? (
          <>
            <div className="stats-grid" style={{ marginBottom: "24px" }}>
              <div className="stat-card">
                <div className="stat-icon" style={{ background: "rgba(34, 197, 94, 0.1)", color: "#22c55e" }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
                    <line x1="12" y1="1" x2="12" y2="23" />
                    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                  </svg>
                </div>
                <div className="stat-info">
                  <div className="stat-label">Total Rencana</div>
                  <div className="stat-value">{formatCurrency(totalAnggaran)}</div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon" style={{ background: "rgba(59, 130, 246, 0.1)", color: "#3b82f6" }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>
                </div>
                <div className="stat-info">
                  <div className="stat-label">Jumlah Item</div>
                  <div className="stat-value">{rabItems.length}</div>
                </div>
              </div>
            </div>

            <div className="card" style={{ marginBottom: "24px" }}>
              <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h3 className="flex items-center gap-2">
                  Status Persetujuan RAB
                  {approvalStatus?.statusAdmin === 'approved' && (
                    <span className="badge badge-green">SELESAI / FINAL</span>
                  )}
                </h3>
              </div>
              <div className="card-body">
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "20px" }}>
                  <div style={{ padding: "16px", borderRadius: "12px", border: "1px solid var(--border)", background: "var(--bg-faded)" }}>
                    <div style={{ fontSize: "14px", fontWeight: 700, marginBottom: "8px", color: "var(--text-muted)" }}>STATUS PENGAJUAN</div>
                    <div className="flex items-center gap-2">
                      <span className={`badge ${approvalStatus?.isSubmitted ? 'badge-blue' : 'badge-gray'}`}>
                        {approvalStatus?.isSubmitted ? 'Selesai Diajukan' : 'Belum Diajukan (DRAF)'}
                      </span>
                    </div>
                    {["admin_keuangan", "creator"].includes(session?.role) && (
                      <div style={{ marginTop: "12px" }}>
                        {approvalStatus?.isSubmitted ? (
                          <button 
                            className="btn btn-sm btn-secondary" 
                            onClick={() => handleSubmission(false)}
                            disabled={approving || approvalStatus?.statusPengurus === 'approved'}
                          >
                            Batal Ajukan
                          </button>
                        ) : (
                          <button 
                            className="btn btn-sm btn-primary" 
                            onClick={() => handleSubmission(true)}
                            disabled={approving || rabItems.length === 0}
                          >
                            Ajukan RAB
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                  <div style={{ padding: "16px", borderRadius: "12px", border: "1px solid var(--border)", background: "var(--bg-faded)" }}>
                    <div style={{ fontSize: "14px", fontWeight: 700, marginBottom: "8px", color: "var(--text-muted)" }}>TAHAP 1: PENGURUS DAERAH</div>
                    <div className="flex items-center gap-2">
                      <span className={`badge ${
                        approvalStatus?.statusPengurus === 'approved' ? 'badge-green' : 
                        approvalStatus?.statusPengurus === 'rejected' ? 'badge-red' : 'badge-gray'
                      }`}>
                        {approvalStatus?.statusPengurus?.toUpperCase() || 'PENDING'}
                      </span>
                      {approvalStatus?.catatanPengurus && (
                        <p className="text-sm">Catatan: {approvalStatus.catatanPengurus}</p>
                      )}
                    </div>
                  </div>
                  <div style={{ padding: "16px", borderRadius: "12px", border: "1px solid var(--border)", background: "var(--bg-faded)" }}>
                    <div style={{ fontSize: "14px", fontWeight: 700, marginBottom: "8px", color: "var(--text-muted)" }}>TAHAP 2: ADMIN UTAMA</div>
                    <div className="flex items-center gap-2">
                      <span className={`badge ${
                        approvalStatus?.statusAdmin === 'approved' ? 'badge-green' : 
                        approvalStatus?.statusAdmin === 'rejected' ? 'badge-red' : 'badge-gray'
                      }`}>
                        {approvalStatus?.statusAdmin?.toUpperCase() || 'PENDING'}
                      </span>
                      {approvalStatus?.catatanAdmin && (
                        <p className="text-sm">Catatan: {approvalStatus.catatanAdmin}</p>
                      )}
                    </div>
                  </div>
                </div>

                {(session?.role === "pengurus_daerah" || session?.role === "admin") && approvalStatus?.isSubmitted === 1 && (
                  <div style={{ marginTop: "20px", display: "flex", gap: "12px", justifyContent: "flex-end" }}>
                    {(session.role === 'pengurus_daerah' ? approvalStatus?.statusPengurus !== 'pending' : approvalStatus?.statusAdmin !== 'pending') && (
                      <button 
                        className="btn btn-secondary"
                        onClick={() => handleApproval('pending')}
                        disabled={approving}
                      >
                        Batal
                      </button>
                    )}
                    <button 
                      className="btn btn-danger" 
                      onClick={() => handleApproval('rejected')}
                      disabled={approving || (session.role === 'admin' && approvalStatus?.statusPengurus !== 'approved')}
                    >
                      Tolak RAB
                    </button>
                    <button 
                      className="btn btn-primary" 
                      onClick={() => handleApproval('approved')}
                      disabled={approving || (session.role === 'admin' && approvalStatus?.statusPengurus !== 'approved')}
                      style={{ background: "#22c55e" }}
                    >
                      Setujui RAB
                    </button>
                  </div>
                )}
                {session?.role === 'admin' && approvalStatus?.statusPengurus !== 'approved' && (
                  <p className="text-sm text-muted" style={{ textAlign: "right", marginTop: "8px" }}>
                    * Menunggu persetujuan Pengurus Daerah terlebih dahulu.
                  </p>
                )}
              </div>
            </div>

            <div className="card">
              <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
                <h3>Rincian RAB</h3>
                <div className="flex gap-2">
                  <button className="btn btn-secondary btn-sm" onClick={handleExportExcel} style={{ backgroundColor: "#10b981", color: "white" }}>
                    📊 Excel
                  </button>
                  <button className="btn btn-secondary btn-sm" onClick={handleExportPDFV2} style={{ backgroundColor: "#ef4444", color: "white" }}>
                    📄 PDF
                  </button>
                  {["admin_keuangan", "creator"].includes(session?.role) && approvalStatus?.statusAdmin !== 'approved' && (
                    <button className="btn btn-primary btn-sm" onClick={() => { setEditItem(null); setShowModal(true); }}>
                      + Tambah Item
                    </button>
                  )}
                </div>
              </div>
              
              {loading ? (
                <div style={{ padding: "40px", textAlign: "center" }}>Memuat...</div>
              ) : rabItems.length === 0 ? (
                <div className="empty-state" style={{ padding: "40px" }}>
                  <p>Belum ada rincian biaya untuk kegiatan ini.</p>
                </div>
              ) : (
                <div className="table-wrapper">
                  <table>
                    <thead>
                      <tr>
                        <th>Item Pekerjaan/Barang</th>
                        <th style={{ textAlign: "center" }}>Volume</th>
                        <th>Harga Satuan</th>
                        <th>Total</th>
                        <th>Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rabItems.map((item) => (
                        <tr key={item.id}>
                          <td>
                            <div style={{ fontWeight: 500 }}>{item.item}</div>
                            {item.keterangan && <div className="text-sm text-muted">{item.keterangan}</div>}
                          </td>
                          <td style={{ textAlign: "center" }}>{item.volume} {item.satuan}</td>
                          <td>{formatCurrency(item.hargaSatuan)}</td>
                          <td style={{ fontWeight: 600 }}>{formatCurrency(item.totalHarga)}</td>
                          <td>
                            <div className="flex gap-2">
                              {["admin_keuangan", "creator"].includes(session?.role) && approvalStatus?.statusAdmin !== 'approved' && (
                                <>
                                  <button className="btn btn-sm btn-secondary" onClick={() => { setEditItem(item); setShowModal(true); }}>Edit</button>
                                  <button className="btn btn-sm btn-danger" onClick={() => handleDelete(item.id)}>Hapus</button>
                                </>
                              )}
                              {(!["admin_keuangan", "creator"].includes(session?.role) || approvalStatus?.statusAdmin === 'approved') && (
                                <span className="text-xs text-muted">Aksi tidak tersedia</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                       <tr style={{ background: "var(--bg-faded)", fontWeight: "bold" }}>
                          <td colSpan={3} style={{ textAlign: "right" }}>TOTAL RENCANA ANGGARAN:</td>
                          <td>{formatCurrency(totalAnggaran)}</td>
                          <td></td>
                       </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="card" style={{ padding: "60px", textAlign: "center", borderStyle: "dashed", opacity: 0.7 }}>
             <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="48" height="48" style={{ margin: "0 auto 16px", display: "block", color: "var(--text-muted)" }}>
                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
             </svg>
             <h3>Silakan pilih kegiatan untuk mengelola RAB</h3>
             <p className="text-muted">Gunakan dropdown di atas untuk memulai.</p>
          </div>
        )}
      </div>

      {showModal && (
        <RabModal
          activityId={selectedActivityId}
          isMandiri={isMandiri}
          item={editItem}
          onClose={() => setShowModal(false)}
          onSaved={() => {
            setShowModal(false);
            fetchRabItems(selectedActivityId);
          }}
        />
      )}
    </div>
  );
}

function RabModal({ activityId, isMandiri, item, onClose, onSaved }: any) {
  const [form, setForm] = useState({
    item: item?.item || "",
    volume: item?.volume || 1,
    satuan: item?.satuan || "pcs",
    hargaSatuan: item?.hargaSatuan || 0,
    keterangan: item?.keterangan || "",
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const url = item ? `/api/rab/${item.id}` : "/api/rab";
      const method = item ? "PUT" : "POST";
      const body = {
        ...form,
        [isMandiri ? "mandiriKegiatanId" : "kegiatanId"]: activityId,
      };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        Swal.fire({ icon: 'success', title: 'Berhasil', timer: 1500, showConfirmButton: false });
        onSaved();
      } else {
        const errorData = await res.json();
        Swal.fire("Error", errorData.error || "Gagal menyimpan", "error");
      }
    } catch (e) {
      Swal.fire("Error", "Kesalahan jaringan", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 500 }}>
        <div className="modal-header">
          <span className="modal-title">{item ? "Edit Item RAB" : "Tambah Item RAB"}</span>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
             <div className="form-group">
                <label className="form-label">Nama Item <span className="required">*</span></label>
                <input 
                  className="form-control" 
                  value={form.item} 
                  onChange={(e) => setForm({...form, item: e.target.value})} 
                  required 
                  placeholder="Contoh: Transportasi, Konsumsi, dsb"
                />
             </div>
             <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Volume <span className="required">*</span></label>
                  <input 
                    type="number"
                    className="form-control" 
                    value={form.volume} 
                    onChange={(e) => setForm({...form, volume: Number(e.target.value)})} 
                    required 
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Satuan <span className="required">*</span></label>
                  <input 
                    className="form-control" 
                    value={form.satuan} 
                    onChange={(e) => setForm({...form, satuan: e.target.value})} 
                    required 
                    placeholder="pcs, orang, kali, dsb"
                  />
                </div>
             </div>
             <div className="form-group">
                <label className="form-label">Harga Satuan <span className="required">*</span></label>
                <input 
                  type="number"
                  className="form-control" 
                  value={form.hargaSatuan} 
                  onChange={(e) => setForm({...form, hargaSatuan: Number(e.target.value)})} 
                  required 
                />
             </div>
             <div className="form-group">
                <label className="form-label">Keterangan</label>
                <textarea 
                  className="form-control" 
                  value={form.keterangan} 
                  onChange={(e) => setForm({...form, keterangan: e.target.value})} 
                  placeholder="Catatan tambahan (optional)"
                  rows={2}
                />
             </div>
             <div style={{ marginTop: "16px", padding: "12px", background: "var(--bg-faded)", borderRadius: "8px", textAlign: "right" }}>
                <span style={{ fontSize: "14px", color: "var(--text-muted)" }}>Subtotal: </span>
                <span style={{ fontWeight: "bold", fontSize: "18px" }}>
                  {new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(form.volume * form.hargaSatuan)}
                </span>
             </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Batal</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? "Menyimpan..." : "Simpan"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
