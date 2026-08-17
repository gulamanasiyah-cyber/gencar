"use client";

import Topbar from "@/components/Topbar";
import { useState, useEffect, useCallback } from "react";
import Swal from "sweetalert2";
import { MessageSquare, Trash2, Calendar, User, UserCheck, HelpCircle } from "lucide-react";

interface SaranItem {
  id: string;
  untuk: string;
  saran: string;
  nama: string | null;
  isAnonim: number;
  createdAt: string;
}

export default function AdminSaranPage() {
  const [saranList, setSaranList] = useState<SaranItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all"); // 'all', 'anonim', 'nama'

  const fetchSaran = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/saran");
      if (res.ok) {
        const data = await res.json();
        setSaranList(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSaran();
    fetch("/api/profile")
      .then((r) => r.json())
      .then((d) => setUserRole(d.role || ""));
  }, [fetchSaran]);

  const handleDelete = async (id: string) => {
    const result = await Swal.fire({
      title: "Hapus Saran?",
      text: "Data saran/masukan ini akan dihapus secara permanen dari sistem!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#64748b",
      confirmButtonText: "Ya, Hapus!",
      cancelButtonText: "Batal",
    });

    if (result.isConfirmed) {
      try {
        const res = await fetch(`/api/admin/saran?id=${id}`, {
          method: "DELETE",
        });
        if (res.ok) {
          Swal.fire({
            icon: "success",
            title: "Berhasil",
            text: "Saran/masukan berhasil dihapus.",
            timer: 1500,
            showConfirmButton: false,
          });
          fetchSaran();
        } else {
          const data = await res.json();
          Swal.fire("Gagal", data.error || "Gagal menghapus saran", "error");
        }
      } catch (err) {
        console.error(err);
        Swal.fire("Error", "Terjadi kesalahan saat menghapus saran", "error");
      }
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      // Fallback for invalid date parse
      if (isNaN(date.getTime())) return dateStr;
      
      return date.toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
    } catch (e) {
      return dateStr;
    }
  };

  // Filter logic
  const filteredSaran = saranList.filter((item) => {
    // Search filter
    const matchesSearch = 
      item.untuk.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.saran.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.nama && item.nama.toLowerCase().includes(searchTerm.toLowerCase()));

    // Dropdown type filter
    if (filterType === "anonim") {
      return matchesSearch && item.isAnonim === 1;
    }
    if (filterType === "nama") {
      return matchesSearch && item.isAnonim === 0;
    }
    return matchesSearch;
  });

  return (
    <div>
      <Topbar title="Admin - Kotak Saran & Masukan" role={userRole} />
      
      <div className="page-content">
        <div className="page-header">
          <div className="page-header-left">
            <h2>Kotak Saran & Masukan</h2>
            <p>Lihat dan kelola saran atau masukan dari muda/i untuk pengurus atau panitia</p>
          </div>
        </div>

        {/* Filter controls */}
        <div className="card" style={{ marginBottom: "20px" }}>
          <div className="card-body" style={{ padding: "16px 20px" }}>
            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "center" }}>
              <div style={{ flex: 1, minWidth: "240px" }}>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Cari penerima, isi saran, atau pengirim..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid var(--border)" }}
                />
              </div>
              <div style={{ width: "180px" }}>
                <select
                  className="form-control"
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid var(--border)", background: "white" }}
                >
                  <option value="all">Semua Pengirim</option>
                  <option value="anonim">Hanya Anonim</option>
                  <option value="nama">Pengirim Bernama</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* List of Suggestions */}
        {loading ? (
          <div className="loading" style={{ padding: "80px 0" }}><div className="spinner" /></div>
        ) : filteredSaran.length === 0 ? (
          <div style={{ 
            textAlign: "center", 
            padding: "80px 20px", 
            background: "white", 
            borderRadius: "16px", 
            border: "1px dashed var(--border)", 
            color: "var(--gray)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "12px"
          }}>
            <MessageSquare size={48} style={{ opacity: 0.3 }} />
            <span style={{ fontSize: "15px", fontWeight: "600" }}>Belum ada data saran atau masukan.</span>
            <span style={{ fontSize: "13px", opacity: 0.7 }}>Saran yang dikirim melalui Landing Page akan muncul di sini.</span>
          </div>
        ) : (
          <div className="table-wrapper">
            <div className="table-responsive" style={{ border: "1px solid var(--border)", borderRadius: "12px", background: "var(--bg)" }}>
              <table className="table">
                <thead>
                  <tr>
                    <th style={{ width: "40px", textAlign: "center" }}>No</th>
                    <th style={{ minWidth: "150px" }}>Pengirim</th>
                    <th style={{ minWidth: "160px" }}>Tujuan (Untuk)</th>
                    <th style={{ minWidth: "350px" }}>Saran / Masukan</th>
                    <th style={{ width: "160px" }}>Waktu Masuk</th>
                    <th style={{ width: "80px", textAlign: "center" }}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSaran.map((item, index) => (
                    <tr key={item.id} className="table-row-hover">
                      <td style={{ textAlign: "center", color: "var(--text-muted)", fontWeight: 500 }}>
                        {index + 1}
                      </td>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          {item.isAnonim ? (
                            <HelpCircle size={15} style={{ color: "var(--text-muted)" }} />
                          ) : (
                            <UserCheck size={15} style={{ color: "var(--color-primary)" }} />
                          )}
                          <span style={{ fontWeight: 600, color: item.isAnonim ? "var(--text-muted)" : "var(--text-main)" }}>
                            {item.nama || "Anonim"}
                          </span>
                        </div>
                      </td>
                      <td>
                        <span className="badge badge-blue">
                          {item.untuk}
                        </span>
                      </td>
                      <td style={{ whiteSpace: "pre-wrap", color: "var(--text-main)", fontSize: "14px", lineHeight: "1.5" }}>
                        {item.saran}
                      </td>
                      <td style={{ color: "var(--text-muted)", fontSize: "13px" }}>
                        {formatDate(item.createdAt)}
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <button
                          className="btn btn-sm btn-danger"
                          onClick={() => handleDelete(item.id)}
                          title="Hapus Masukan"
                          style={{ padding: "6px", width: "32px", height: "32px", display: "inline-flex", alignItems: "center", justifyContent: "center" }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
