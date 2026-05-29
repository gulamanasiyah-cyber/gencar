"use client";
export const runtime = "edge";


import Topbar from "@/components/Topbar";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Swal from "sweetalert2";

interface ArtikelItem {
  id: string;
  judul: string;
  tipe: string;
  status: string;
  createdAt: string | null;
  ringkasan: string | null;
}

export default function BeritaListPage() {
  const router = useRouter();
  const [data, setData] = useState<ArtikelItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [userRole, setUserRole] = useState("");

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/berita");
      const json = await res.json();
      setData(Array.isArray(json) ? json : []);
    } catch {
      setData([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (mounted) {
      fetchData();
      fetch("/api/profile").then(r => r.json()).then(d => setUserRole(d.role || ""));
    }
  }, [mounted, fetchData]);

  const formatDate = (d: string | null) => {
    if (!d) return "-";
    return new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
  };

  if (!mounted) return <div className="loading"><div className="spinner" /></div>;

  return (
    <div>
      <Topbar title="Manajemen Berita Saya" role={userRole} />
      <div className="page-content">
        <div className="page-header">
          <div className="page-header-left">
            <h2>Berita Saya</h2>
            <p>Kelola konten berita yang telah Anda buat atau ajukan</p>
          </div>
          <Link href="/berita/tulis" className="btn btn-primary">✏️ Tulis Berita Baru</Link>
        </div>

        <div className="card">
          {loading ? (
            <div className="loading"><div className="spinner" /></div>
          ) : data.length === 0 ? (
            <div className="empty-state">
              <div style={{ fontSize: 48, marginBottom: 16 }}>🗞️</div>
              <h3>Belum ada berita</h3>
              <p>Mulai tulis berita pertama Anda sekarang!</p>
              <Link href="/berita/tulis" className="btn btn-primary" style={{ marginTop: 16 }}>Tulis Berita</Link>
            </div>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Judul</th>
                    <th>Tipe</th>
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
                      <td>
                        <span className="badge badge-blue">{item.tipe}</span>
                      </td>
                      <td className="text-muted">{formatDate(item.createdAt)}</td>
                      <td>
                        <span className={`badge ${item.status === "published" ? "badge-green" : item.status === "pending" ? "badge-orange" : "badge-red"}`}>
                          {item.status === "published" ? "Tayang" : item.status === "pending" ? "Dalam Review" : "Ditolak"}
                        </span>
                      </td>
                      <td>
                        <div className="flex gap-2">
                          <Link href={`/berita/${item.id}`} className="btn btn-sm btn-secondary">Lihat</Link>
                          <Link href={`/berita/${item.id}/edit`} className="btn btn-sm btn-info">Edit</Link>
                          <button 
                             className="btn btn-sm btn-danger" 
                             onClick={async () => {
                               const result = await Swal.fire({
                                 title: 'Hapus Berita?',
                                 text: "Berita yang sudah dihapus tidak dapat dikembalikan!",
                                 icon: 'warning',
                                 showCancelButton: true,
                                 confirmButtonColor: '#ef4444',
                                 cancelButtonColor: '#64748b',
                                 confirmButtonText: 'Ya, Hapus!',
                                 cancelButtonText: 'Batal'
                               });
                               if (result.isConfirmed) {
                                 await fetch(`/api/berita/${item.id}`, { method: "DELETE" });
                                 Swal.fire({
                                   icon: 'success',
                                   title: 'Terhapus!',
                                   text: 'Berita berhasil dihapus.',
                                   timer: 1500,
                                   showConfirmButton: false
                                 });
                                 fetchData();
                               }
                             }}>
                             Hapus
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="alert alert-info" style={{ marginTop: 24 }}>
          ℹ️ Berita dengan status <strong>Dalam Review</strong> akan diperiksa oleh Admin sebelum dipublikasikan ke halaman utama.
        </div>
      </div>
    </div>
  );
}
