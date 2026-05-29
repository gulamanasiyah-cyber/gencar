"use client";
export const runtime = "edge";


import Topbar from "@/components/Topbar";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import Swal from "sweetalert2";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

interface RundownItem {
  id: string;
  waktu: string;
  agenda: string;
  pic: string | null;
  keterangan: string | null;
  order: number;
}

interface Activity {
  id: string;
  judul: string;
  tanggal: string;
  type: 'kegiatan' | 'mandiri';
}

export default function RundownPage() {
  const pageTitle = "Rundown Acara";
  const pageSubtitle = "Pengelolaan urutan acara dan jadwal kegiatan";
  
  const [activities, setActivities] = useState<Activity[]>([]);
  const [selectedActivityKey, setSelectedActivityKey] = useState<string>(""); // format: "type:id"
  const [rundownItems, setRundownItems] = useState<RundownItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<RundownItem | null>(null);
  const [session, setSession] = useState<any>(null);
  const [approvalStatus, setApprovalStatus] = useState<any>(null);
  const [approving, setApproving] = useState(false);

  // Helper to get type and id from key
  const getSelectedInfo = useCallback(() => {
    if (!selectedActivityKey) return { type: null, id: null };
    const [type, id] = selectedActivityKey.split(":");
    return { type, id };
  }, [selectedActivityKey]);

  const fetchActivities = useCallback(async () => {
    try {
      const [resK, resM] = await Promise.all([
        fetch("/api/kegiatan"),
        fetch("/api/mandiri/kegiatan")
      ]);
      const [dataK, dataM] = await Promise.all([resK.json(), resM.json()]);
      
      const combined: Activity[] = [
        ...(Array.isArray(dataK) ? dataK.map((a: any) => ({ ...a, type: 'kegiatan' })) : []),
        ...(Array.isArray(dataM) ? dataM.map((a: any) => ({ ...a, type: 'mandiri' })) : [])
      ];
      
      // Sort by date descending
      combined.sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime());
      
      setActivities(combined);
    } catch (e) {
      console.error("Failed to fetch activities", e);
    }
  }, []);

  const fetchApprovalStatus = useCallback(async (type: string, id: string) => {
    if (!id) return;
    try {
      const isMandiri = type === "mandiri";
      const param = isMandiri ? `mandiriKegiatanId=${id}` : `kegiatanId=${id}`;
      const res = await fetch(`/api/rundown/approval?${param}`);
      const data = await res.json();
      setApprovalStatus(data);
    } catch (e) {
      console.error("Failed to fetch approval status", e);
    }
  }, []);

  const fetchRundownItems = useCallback(async (type: string, id: string) => {
    if (!id) {
      setRundownItems([]);
      return;
    }
    setLoading(true);
    try {
      const isMandiri = type === "mandiri";
      const param = isMandiri ? `mandiriKegiatanId=${id}` : `kegiatanId=${id}`;
      const res = await fetch(`/api/rundown?${param}`);
      const data = await res.json();
      setRundownItems(Array.isArray(data) ? data : []);
      fetchApprovalStatus(type, id);
    } catch (e) {
      console.error("Failed to fetch Rundown items", e);
    } finally {
      setLoading(false);
    }
  }, [fetchApprovalStatus]);

  useEffect(() => {
    fetch("/api/profile").then(r => r.json()).then(setSession).catch(() => setSession(null));
    fetchActivities();
  }, [fetchActivities]);

  useEffect(() => {
    const { type, id } = getSelectedInfo();
    if (id && type) {
      fetchRundownItems(type, id);
    } else {
      setRundownItems([]);
      setApprovalStatus(null);
    }
  }, [selectedActivityKey, fetchRundownItems, getSelectedInfo]);

  const handleDelete = async (id: string) => {
    const res = await Swal.fire({
      title: 'Hapus Agenda?',
      text: "Data yang dihapus tidak dapat dikembalikan!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Ya, Hapus!',
      cancelButtonText: 'Batal'
    });
    
    if (res.isConfirmed) {
      const response = await fetch(`/api/rundown/${id}`, { method: "DELETE" });
      if (response.ok) {
        Swal.fire({ icon: 'success', title: 'Terhapus!', timer: 1000, showConfirmButton: false });
        const { type, id: activityId } = getSelectedInfo();
        if (type && activityId) fetchRundownItems(type, activityId);
      }
    }
  };

  const handleApproval = async (status: string) => {
    const { type, id } = getSelectedInfo();
    if (!type || !id) return;

    const { value: catatan } = await Swal.fire({
      title: `${status === 'approved' ? 'Setujui' : 'Tolak'} Rundown ini?`,
      input: 'textarea',
      inputLabel: 'Tambahkan catatan (opsional)',
      inputPlaceholder: 'Tulis catatan Anda di sini...',
      showCancelButton: true,
      confirmButtonColor: status === 'approved' ? '#22c55e' : '#ef4444',
      confirmButtonText: status === 'approved' ? 'Ya, Setujui' : 'Ya, Tolak',
      cancelButtonText: 'Batal'
    });

    if (catatan !== undefined) {
      setApproving(true);
      try {
        const body = {
          [type === 'mandiri' ? "mandiriKegiatanId" : "kegiatanId"]: id,
          status,
          catatan
        };
        const res = await fetch("/api/rundown/approval", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body)
        });
        if (res.ok) {
          Swal.fire({ icon: 'success', title: 'Berhasil', timer: 1500, showConfirmButton: false });
          fetchApprovalStatus(type, id);
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
    const { type, id } = getSelectedInfo();
    if (!type || !id) return;

    const res = await Swal.fire({
      title: submit ? 'Ajukan Rundown ini?' : 'Batalkan Pengajuan Rundown?',
      text: submit ? 'Rundown akan diajukan ke Pengurus Daerah untuk ditinjau.' : 'Status pengajuan akan dibatalkan.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#3b82f6',
      confirmButtonText: submit ? 'Ya, Ajukan' : 'Ya, Batalkan'
    });

    if (res.isConfirmed) {
      setApproving(true);
      try {
        const body = {
          [type === 'mandiri' ? "mandiriKegiatanId" : "kegiatanId"]: id,
          isSubmitted: submit
        };
        const apiRes = await fetch("/api/rundown/approval", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body)
        });
        if (apiRes.ok) {
          Swal.fire({ icon: 'success', title: 'Berhasil', timer: 1500, showConfirmButton: false });
          fetchApprovalStatus(type, id);
        }
      } catch (e) {
        Swal.fire("Error", "Gagal menghubungi server", "error");
      } finally {
        setApproving(false);
      }
    }
  };

  const selectedActivity = useMemo(() => {
    const { type, id } = getSelectedInfo();
    return activities.find(a => a.id === id && a.type === type);
  }, [activities, getSelectedInfo]);

  const handleExportPDF = () => {
    if (!selectedActivity || rundownItems.length === 0) return;

    const doc = new jsPDF();
    const title = `RUNDOWN ACARA / AGENDA KEGIATAN`;
    const activityName = selectedActivity.judul.toUpperCase();
    const dateStr = new Date(selectedActivity.tanggal).toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text(title, 105, 15, { align: "center" });
    doc.setFontSize(14);
    doc.text(activityName, 105, 23, { align: "center" });
    
    doc.setLineWidth(0.5);
    doc.line(14, 28, 196, 28);

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Tanggal Kegiatan : ${dateStr}`, 14, 38);
    doc.text(`Dicetak Oleh       : ${session?.name || "User"}`, 14, 43);
    doc.text(`Waktu Cetak       : ${new Date().toLocaleString("id-ID")}`, 14, 48);

    const tableData = rundownItems.map((item, index) => [
      index + 1,
      item.waktu,
      item.agenda,
      item.pic || "-",
      item.keterangan || "-"
    ]);

    autoTable(doc, {
      head: [["No", "Waktu", "Agenda / Kegiatan", "PIC", "Keterangan"]],
      body: tableData,
      startY: 55,
      theme: "grid",
      headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255], fontStyle: "bold" },
      columnStyles: {
        0: { cellWidth: 10 },
        1: { cellWidth: 30 },
        3: { cellWidth: 35 },
      }
    });

    const finalY = (doc as any).lastAutoTable.finalY + 15;

    if (finalY < 250) {
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text("STATUS PERSETUJUAN:", 14, finalY);
      
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text(`Pengurus Daerah : ${approvalStatus?.statusPengurus?.toUpperCase() || 'PENDING'}`, 14, finalY + 8);
      if (approvalStatus?.catatanPengurus) doc.text(`Catatan: ${approvalStatus.catatanPengurus}`, 14, finalY + 13);
    }

    doc.save(`Rundown_${selectedActivity.judul.replace(/\s+/g, "_")}.pdf`);
  };

  const handleImportPDF = () => {
    const { type, id: activityId } = getSelectedInfo();
    if (!type || !activityId) return;

    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".pdf";
    input.onchange = async (e: any) => {
      const file = e.target.files[0];
      if (!file) return;

      Swal.fire({ title: 'Membaca PDF...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
      
      try {
        // @ts-ignore - Using stable CJS build for Next.js compatibility
        const pdfjsModule = await import("pdfjs-dist/build/pdf");
        const pdfjsLib = pdfjsModule.default || pdfjsModule;
        
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.js`;

        const arrayBuffer = await file.arrayBuffer();
        const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
        const pdf = await loadingTask.promise;
        const totalPages = pdf.numPages;
        
        const extractedRows: any[] = [];
        
        for (let i = 1; i <= totalPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          
          const itemsByY: Record<string, any[]> = {};
          textContent.items.forEach((item: any) => {
            const y = Math.round(item.transform[5]); 
            if (!itemsByY[y]) itemsByY[y] = [];
            itemsByY[y].push(item);
          });
          
          const sortedY = Object.keys(itemsByY).sort((a, b) => Number(b) - Number(a));
          sortedY.forEach(y => {
            const row = itemsByY[y].sort((a, b) => a.transform[4] - b.transform[4]);
            const rowText = row.map(i => i.str.trim()).filter(s => s !== "");
            if (rowText.length >= 2) {
               extractedRows.push(rowText);
            }
          });
        }

        let tableStarted = false;
        const itemsToImport: any[] = [];
        
        extractedRows.forEach(row => {
          const text = row.join(" ").toLowerCase();
          if (text.includes("waktu") && text.includes("agenda")) {
            tableStarted = true;
            return;
          }
          if (tableStarted) {
            const timeMatch = row.some((txt: string) => /^\d{2}[:.]\d{2}/.test(txt));
            if (timeMatch) {
               const waktu = row.find((txt: string) => /^\d{2}[:.]\d{2}/.test(txt)) || "";
               const agenda = row.find((txt: string) => txt.length > 5 && !/^\d{2}[:.]\d{2}/.test(txt)) || row[row.length-1];
               if (waktu && agenda) {
                  itemsToImport.push({
                    waktu, 
                    agenda,
                    pic: row.length > 3 ? row[row.length-2] : "",
                    keterangan: row.length > 4 ? row[row.length-1] : ""
                  });
               }
            }
          }
        });

        if (itemsToImport.length === 0) {
           return Swal.fire("Error", "Gagal menemukan tabel rundown di dalam PDF ini.", "error");
        }

        const confirm = await Swal.fire({
          title: 'Konfirmasi Impor',
          text: `Ditemukan ${itemsToImport.length} agenda. Lanjutkan impor?`,
          icon: 'info',
          showCancelButton: true,
          confirmButtonText: 'Ya, Impor Semua'
        });

        if (confirm.isConfirmed) {
          Swal.fire({ title: 'Sedang mengimpor...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
          for (const item of itemsToImport) {
            await fetch("/api/rundown", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                [type === 'mandiri' ? "mandiriKegiatanId" : "kegiatanId"]: activityId,
                ...item
              })
            });
          }
          Swal.fire({ icon: 'success', title: 'Berhasil!', timer: 2000, showConfirmButton: false });
          fetchRundownItems(type, activityId);
        }

      } catch (err) {
        console.error("PDF parse error", err);
        Swal.fire("Error", "Gagal memproses file PDF", "error");
      }
    };
    input.click();
  };

  const handleImportExcel = () => {
    const { type, id } = getSelectedInfo();
    if (!type || !id) return;

    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".xlsx, .xls";
    input.onchange = async (e: any) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = async (evt: any) => {
        try {
          const bstr = evt.target.result;
          const wb = XLSX.read(bstr, { type: 'binary' });
          const wsname = wb.SheetNames[0];
          const ws = wb.Sheets[wsname];
          const data = XLSX.utils.sheet_to_json(ws);
          
          if (!data || data.length === 0) {
             return Swal.fire("Error", "File Excel Anda terlihat kosong.", "error");
          }

          Swal.fire({ title: 'Mengimport...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
          
          for (const row of data as any[]) {
            const body = {
              [type === 'mandiri' ? "mandiriKegiatanId" : "kegiatanId"]: id,
              waktu: row.Waktu || row.waktu || "00:00",
              agenda: row.Agenda || row.agenda || "Tanpa Judul",
              pic: row.PIC || row.pic || "",
              keterangan: row.Keterangan || row.keterangan || ""
            };
            await fetch("/api/rundown", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(body)
            });
          }

          Swal.fire({ icon: 'success', title: 'Berhasil mengimpor!', timer: 2000, showConfirmButton: false });
          fetchRundownItems(type, id);
        } catch (err) {
          Swal.fire("Error", "Gagal membaca file Excel", "error");
        }
      };
      reader.readAsBinaryString(file);
    };
    input.click();
  };

  const isEditor = session?.role === "admin_kegiatan" || session?.role === "kmm_daerah";
  const isApprover = session?.role === "pengurus_daerah";
  const isViewer = session?.role === "admin" || session?.role === "admin_romantic_room";
  const canEditItems = isEditor;
  const canImport = isEditor;
  const canApprove = isApprover && approvalStatus?.isSubmitted === 1;

  return (
    <div>
      <Topbar title={pageTitle} role={session?.role} />
      <div className="page-content">
        <div className="page-header">
          <div className="page-header-left">
            <h2>{pageTitle}</h2>
            <p>{pageSubtitle}</p>
          </div>
        </div>

        <div className="card" style={{ marginBottom: "24px" }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontWeight: 600 }}>Pilih Kegiatan:</label>
            <select 
              className="form-control" 
              value={selectedActivityKey} 
              onChange={(e) => setSelectedActivityKey(e.target.value)}
              style={{ maxWidth: "450px" }}
            >
              <option value="">-- Pilih Kegiatan --</option>
              {activities.map((act) => (
                <option key={`${act.type}:${act.id}`} value={`${act.type}:${act.id}`}>
                  [{act.type === 'mandiri' ? 'Mandiri' : 'Umum'}] {act.judul} ({new Date(act.tanggal).toLocaleDateString("id-ID")})
                </option>
              ))}
            </select>
          </div>
        </div>

        {selectedActivityKey ? (
          <>
            <div className="card" style={{ marginBottom: "24px" }}>
              <div className="card-header">
                <h3>Status Persetujuan Rundown</h3>
              </div>
              <div className="card-body">
                <div className="responsive-grid-2">
                  <div style={{ padding: "16px", borderRadius: "12px", border: "1px solid var(--border)", background: "var(--bg-faded)" }}>
                    <div style={{ fontSize: "14px", fontWeight: 700, marginBottom: "8px", color: "var(--text-muted)" }}>STATUS PENGAJUAN</div>
                    <div className="flex items-center gap-2">
                      <span className={`badge ${approvalStatus?.isSubmitted ? 'badge-blue' : 'badge-gray'}`}>
                        {approvalStatus?.isSubmitted ? 'Telah Diajukan' : 'Draf'}
                      </span>
                    </div>
                    {isEditor && (
                      <div style={{ marginTop: "12px" }}>
                        {approvalStatus?.isSubmitted ? (
                          <button className="btn btn-sm btn-secondary" onClick={() => handleSubmission(false)} disabled={approving || approvalStatus?.statusPengurus === 'approved'}>Batal Ajukan</button>
                        ) : (
                          <button className="btn btn-sm btn-primary" onClick={() => handleSubmission(true)} disabled={approving || rundownItems.length === 0}>Ajukan Sekarang</button>
                        )}
                      </div>
                    )}
                  </div>
                  <div style={{ padding: "16px", borderRadius: "12px", border: "1px solid var(--border)", background: "var(--bg-faded)" }}>
                    <div style={{ fontSize: "14px", fontWeight: 700, marginBottom: "8px", color: "var(--text-muted)" }}>PERSETUJUAN PENGURUS DAERAH</div>
                    <div className="flex items-center gap-2">
                      <span className={`badge ${
                        approvalStatus?.statusPengurus === 'approved' ? 'badge-green' : 
                        approvalStatus?.statusPengurus === 'rejected' ? 'badge-red' : 'badge-gray'
                      }`}>
                        {approvalStatus?.statusPengurus?.toUpperCase() || 'PENDING'}
                      </span>
                    </div>
                    {isApprover && approvalStatus?.isSubmitted === 1 && (
                      <div style={{ marginTop: "12px", display: "flex", gap: "8px" }}>
                        <button className="btn btn-sm btn-danger" onClick={() => handleApproval('rejected')} disabled={approving}>Tolak</button>
                        <button className="btn btn-sm btn-primary" onClick={() => handleApproval('approved')} disabled={approving} style={{ background: "#22c55e" }}>Setujui</button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
                  <h3>Rincian Rundown</h3>
                  {canImport && <span style={{ fontSize: 11, color: "var(--text-muted)" }}>(Rundown dapat diimpor dari Excel atau PDF)</span>}
                </div>
                <div className="flex gap-2">
                  {canImport && (
                    <>
                      <button className="btn btn-secondary btn-sm" onClick={handleImportExcel} style={{ backgroundColor: "#10b981", color: "white" }}>📥 Import Excel</button>
                      <button className="btn btn-secondary btn-sm" onClick={handleImportPDF} style={{ backgroundColor: "#3b82f6", color: "white" }}>📄 Import PDF</button>
                    </>
                  )}
                  <button className="btn btn-secondary btn-sm" onClick={handleExportPDF} style={{ backgroundColor: "#ef4444", color: "white" }}>📄 Export PDF</button>
                  {canEditItems && (
                    <button className="btn btn-primary btn-sm" onClick={() => { setEditItem(null); setShowModal(true); }}>+ Tambah Agenda</button>
                  )}
                </div>
              </div>
              
              {loading ? (
                <div style={{ padding: "40px", textAlign: "center" }}>Memuat...</div>
              ) : rundownItems.length === 0 ? (
                <div className="empty-state" style={{ padding: "40px" }}>
                  <p>Belum ada agenda untuk kegiatan ini.</p>
                </div>
              ) : (
                <div className="table-wrapper">
                  <table>
                    <thead>
                      <tr>
                        <th style={{ width: "100px" }}>Waktu</th>
                        <th>Agenda</th>
                        <th>PIC</th>
                        <th>Keterangan</th>
                        {canEditItems && <th>Aksi</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {rundownItems.map((item) => (
                        <tr key={item.id}>
                          <td style={{ fontWeight: 600 }}>{item.waktu}</td>
                          <td style={{ fontWeight: 500 }}>{item.agenda}</td>
                          <td>{item.pic || "-"}</td>
                          <td>{item.keterangan || "-"}</td>
                          {canEditItems && (
                            <td>
                              <div className="flex gap-2">
                                <button className="btn btn-sm btn-secondary" onClick={() => { setEditItem(item); setShowModal(true); }}>Edit</button>
                                <button className="btn btn-sm btn-danger" onClick={() => handleDelete(item.id)}>Hapus</button>
                              </div>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="card" style={{ padding: "60px", textAlign: "center", borderStyle: "dashed", opacity: 0.7 }}>
             <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="48" height="48" style={{ margin: "0 auto 16px", display: "block", color: "var(--text-muted)" }}>
                <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
             </svg>
             <h3>Pilih kegiatan untuk mengelola rundown</h3>
          </div>
        )}
      </div>

      {showModal && (
        <RundownModal
          activityId={getSelectedInfo().id}
          isMandiri={getSelectedInfo().type === 'mandiri'}
          item={editItem}
          onClose={() => setShowModal(false)}
          onSaved={() => {
            setShowModal(false);
            const { type, id } = getSelectedInfo();
            if (type && id) fetchRundownItems(type, id);
          }}
        />
      )}
    </div>
  );
}

function RundownModal({ activityId, isMandiri, item, onClose, onSaved }: any) {
  const [form, setForm] = useState({
    waktu: item?.waktu || "",
    agenda: item?.agenda || "",
    pic: item?.pic || "",
    keterangan: item?.keterangan || "",
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const url = item ? `/api/rundown/${item.id}` : "/api/rundown";
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
        Swal.fire("Error", "Gagal menyimpan", "error");
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
          <span className="modal-title">{item ? "Edit Agenda" : "Tambah Agenda"}</span>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
             <div className="form-group">
                <label className="form-label">Waktu <span className="required">*</span></label>
                <input className="form-control" type="text" value={form.waktu} onChange={(e) => setForm({...form, waktu: e.target.value})} required placeholder="Contoh: 08:00 - 09:00" />
             </div>
             <div className="form-group">
                <label className="form-label">Agenda / Kegiatan <span className="required">*</span></label>
                <input className="form-control" value={form.agenda} onChange={(e) => setForm({...form, agenda: e.target.value})} required placeholder="Apa yang dilakukan?" />
             </div>
             <div className="form-group">
                <label className="form-label">PIC / Penanggung Jawab</label>
                <input className="form-control" value={form.pic} onChange={(e) => setForm({...form, pic: e.target.value})} placeholder="Siapa yang bertanggung jawab?" />
             </div>
             <div className="form-group">
                <label className="form-label">Keterangan</label>
                <textarea className="form-control" value={form.keterangan} onChange={(e) => setForm({...form, keterangan: e.target.value})} placeholder="Catatan tambahan" rows={2} />
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
