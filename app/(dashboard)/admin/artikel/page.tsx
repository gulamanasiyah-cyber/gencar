"use client";



import Topbar from "@/components/Topbar";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Swal from "sweetalert2";
import { useSearchParams } from "next/navigation";

interface ArtikelItem {
  id: string;
  judul: string;
  tipe: string;
  status: string;
  authorName: string | null;
  createdAt: string | null;
  ringkasan: string | null;
}

export default function AdminArtikelPage() {
  const [data, setData] = useState<ArtikelItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"pending" | "published" | "rejected">("pending");
  const [mounted, setMounted] = useState(false);
  const [userRole, setUserRole] = useState("");

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/artikel?status=${filter}`);
    const json = await res.json();
    setData(Array.isArray(json) ? json : []);
    setLoading(false);
  }, [filter]);

  useEffect(() => { 
    fetchData(); 
    fetch("/api/profile").then(r => r.json()).then(d => setUserRole(d.role || ""));
  }, [fetchData]);

  const updateStatus = async (id: string, status: string) => {
    const confirmMsg = status === "published" ? "Terbitkan" : status === "rejected" ? "Tolak" : "Kembalikan ke Pending";
    const res = await Swal.fire({
      title: `${confirmMsg} Artikel?`,
      text: `Apakah Anda yakin ingin melakukan aksi ${confirmMsg.toLowerCase()} pada artikel ini?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: status === "published" ? '#15803d' : '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Ya, Lanjutkan!',
      cancelButtonText: 'Batal'
    });
    
    if (res.isConfirmed) {
      await fetch(`/api/artikel/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      Swal.fire({
        icon: 'success',
        title: 'Berhasil!',
        text: `Artikel telah di-${status === "published" ? "publiikasikan" : status === "rejected" ? "tolak" : "update"}.`,
        timer: 1500,
        showConfirmButton: false
      });
      fetchData();
    }
  };

  const deleteArtikel = async (id: string) => {
    const res = await Swal.fire({
      title: 'Hapus Artikel?',
      text: "Data yang dihapus tidak dapat dikembalikan!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Ya, Hapus!',
      cancelButtonText: 'Batal'
    });
    
    if (res.isConfirmed) {
      await fetch(`/api/artikel/${id}`, { method: "DELETE" });
      Swal.fire({
        icon: 'success',
        title: 'Terhapus!',
        text: 'Artikel berhasil dihapus.',
        timer: 1500,
        showConfirmButton: false
      });
      fetchData();
    }
  };

  const formatDate = (d: string | null) => {
    if (!d) return "-";
    return new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
  };

  if (!mounted) return <div className="loading"><div className="spinner" /></div>;

  return (
    <div>
      <Topbar title="Admin - Moderasi Artikel" role={userRole} />
      <div className="page-content">
        <div className="page-header">
          <div className="page-header-left">
            <h2>Moderasi Artikel</h2>
            <p>Review, publikasikan, dan kelola konten Artikel</p>
          </div>
          <Link href="/artikel/tulis" className="btn btn-primary">✏️ Tulis Artikel Baru</Link>
        </div>

        <div className="flex gap-2 mb-4" style={{ marginBottom: 16 }}>
          {(["pending", "published", "rejected"] as const).map((s) => (
            <button key={s} className={`btn ${filter === s ? "btn-primary" : "btn-secondary"}`} onClick={() => setFilter(s)}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>

        <div className="card">
          {loading ? (
            <div className="loading"><div className="spinner" /></div>
          ) : data.length === 0 ? (
            <div className="empty-state">
              <h3>Tidak ada artikel {filter}</h3>
            </div>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Judul</th>
                    <th>Penulis</th>
                    <th>Tanggal</th>
                    <th>Status</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <div style={{ fontWeight: 500 }}>{item.judul}</div>
                        {item.ringkasan && <div className="text-sm text-muted" style={{ maxWidth: 300, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.ringkasan}</div>}
                      </td>
                      <td>{item.authorName || "Anonim"}</td>
                      <td className="text-muted">{formatDate(item.createdAt)}</td>
                      <td>
                        <span className={`badge ${item.status === "published" ? "badge-green" : item.status === "pending" ? "badge-orange" : "badge-red"}`}>
                          {item.status}
                        </span>
                      </td>
                      <td>
                        <div className="flex gap-2">
                          <Link href={`/artikel/${item.id}`} className="btn btn-sm btn-secondary">Baca</Link>
                          <Link href={`/artikel/${item.id}/edit`} className="btn btn-sm btn-info">Edit</Link>
                          <button className="btn btn-sm btn-danger" onClick={() => deleteArtikel(item.id)}>Hapus</button>
                          {item.status === "pending" && (
                            <>
                              <button className="btn btn-sm btn-success" onClick={() => updateStatus(item.id, "published")}>✓ Publish</button>
                              <button className="btn btn-sm btn-danger" onClick={() => updateStatus(item.id, "rejected")}>✕ Tolak</button>
                            </>
                          )}
                          {item.status === "published" && (
                            <button className="btn btn-sm btn-danger" onClick={() => updateStatus(item.id, "rejected")}>Batalkan</button>
                          )}
                          {item.status === "rejected" && (
                            <button className="btn btn-sm btn-success" onClick={() => updateStatus(item.id, "published")}>Publish</button>
                          )}
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
    </div>
  );
}
