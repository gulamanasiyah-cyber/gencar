"use client";



import Topbar from "@/components/Topbar";
import { useState, useEffect, useCallback } from "react";
import GlobalLoading from "@/components/GlobalLoading";
import Swal from "sweetalert2";

interface UserItem {
  id: string;
  name: string;
  email: string;
  role: string;
  generusId: string | null;
  nomorUnik: string | null;
  mandiriDesaNama: string | null;
  mandiriDesaKota: string | null;
  mandiriKelompokNama: string | null;
  createdAt: string | null;
}

export default function MandiriDataPage() {
  const [data, setData] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [userRole, setUserRole] = useState("");
  const limit = 50;

  useEffect(() => {
    fetch("/api/profile").then(r => r.json()).then(d => setUserRole(d.role || ""));
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ 
        search, 
        page: String(page), 
        limit: String(limit) 
      });
      const res = await fetch(`/api/mandiri/data?${params}`);
      const json = await res.json();
      setData(json.data || []);
      setTotal(json.total || 0);
    } catch (error) {
      console.error("Failed to fetch mandiri data:", error);
    }
    setLoading(false);
  }, [search, page]);

  useEffect(() => {
    const timer = setTimeout(fetchData, 300);
    return () => clearTimeout(timer);
  }, [fetchData]);

  const handleEdit = async (user: UserItem) => {
    const { value: formValues } = await Swal.fire({
      title: 'Update Akun Mandiri',
      html: `
        <div style="text-align: left; padding: 0 10px;">
          <div class="form-group" style="margin-bottom: 16px;">
            <label class="form-label" style="display: block; margin-bottom: 4px; font-weight: 600; font-size: 13px;">Nama Lengkap</label>
            <input id="swal-name" class="form-control" value="${user.name}" placeholder="Nama lengkap">
          </div>
          <div class="form-group">
            <label class="form-label" style="display: block; margin-bottom: 4px; font-weight: 600; font-size: 13px;">Alamat Email</label>
            <input id="swal-email" type="email" class="form-control" value="${user.email}" placeholder="contoh@email.com">
          </div>
        </div>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'Simpan',
      cancelButtonText: 'Batal',
      confirmButtonColor: 'var(--primary)',
      preConfirm: () => {
        const name = (document.getElementById('swal-name') as HTMLInputElement).value;
        const email = (document.getElementById('swal-email') as HTMLInputElement).value;
        if (!name || !email) {
            Swal.showValidationMessage('Nama dan Email wajib diisi');
            return false;
        }
        return { name, email };
      }
    });

    if (formValues) {
      try {
        const res = await fetch("/api/mandiri/data", {
           method: "PUT",
           headers: { "Content-Type": "application/json" },
           body: JSON.stringify({ id: user.id, ...formValues }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Gagal mengupdate");
        
        Swal.fire({ icon: 'success', title: 'Berhasil', text: 'Data akun berhasil diperbarui.', timer: 1500, showConfirmButton: false });
        fetchData();
      } catch (err: any) {
        Swal.fire({ icon: 'error', title: 'Error', text: err.message });
      }
    }
  };

  const handleDelete = async (id: string, name: string) => {
    const res = await Swal.fire({
      title: 'Hapus Akun Login?',
      text: `Akun login untuk ${name} akan dihapus. Data profil peserta tetap ada, namun akun login ini akan hilang.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Ya, Hapus!',
      cancelButtonText: 'Batal'
    });
    
    if (res.isConfirmed) {
      try {
        const res = await fetch(`/api/mandiri/data?id=${id}`, { method: "DELETE" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Gagal menghapus");
        
        Swal.fire({ icon: 'success', title: 'Terhapus!', text: 'Akun berhasil dihapus.', timer: 1500, showConfirmButton: false });
        fetchData();
      } catch (err: any) {
        Swal.fire({ icon: 'error', title: 'Error', text: err.message });
      }
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div>
      <Topbar title="Data Usia Mandiri" role={userRole} />
      <div className="page-content">
        <div className="page-header">
          <div className="page-header-left">
            <h2>Data Akun Usia Mandiri</h2>
            <p>Daftar akun login yang otomatis dibuat setelah pendaftaran Mandiri / Persiapan Nikah</p>
          </div>
          <span className="badge badge-blue">{total} akun terdaftar</span>
        </div>

        <div className="card">
          <div className="card-header" style={{ justifyContent: "space-between" }}>
            <span className="card-title">Daftar Akun Login</span>
            <div className="search-bar" style={{ maxWidth: "300px" }}>
              <input
                type="text"
                className="form-control"
                placeholder="Cari nama atau email..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              />
            </div>
          </div>

          <div className="table-wrapper">
            {loading && data.length === 0 ? (
              <div style={{ padding: "40px", textAlign: "center" }}><div className="spinner" /></div>
            ) : data.length === 0 ? (
               <div className="empty-state" style={{ padding: "60px", textAlign: "center" }}>
                 <div style={{ fontSize: "40px", marginBottom: "12px", opacity: 0.2 }}>👥</div>
                 <p style={{ color: "var(--text-muted)" }}>Tidak ada data akun mandiri ditemukan.</p>
               </div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Nama Lengkap</th>
                    <th>Email / Username</th>
                    <th>No. Unik (PW Awal)</th>
                    <th>Kota/Desa Mandiri</th>
                    <th>Akses</th>
                    <th>Tgl Bergabung</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((user) => (
                    <tr key={user.id}>
                      <td style={{ fontWeight: 600, color: "var(--primary)" }}>{user.name}</td>
                      <td className="text-muted">{user.email}</td>
                      <td><code style={{ background: "#f1f5f9", padding: "2px 6px", borderRadius: "4px", fontSize: "11px" }}>{user.nomorUnik}</code></td>
                      <td>
                        <div style={{ fontSize: "12px" }}>
                          <span style={{ fontWeight: 600 }}>{user.mandiriDesaKota || "-"}</span><br/>
                          <span className="text-muted" style={{ fontSize: "11px" }}>{user.mandiriDesaNama || "-"}</span>
                        </div>
                      </td>
                      <td>
                        <span className="badge badge-gray">{user.role}</span>
                      </td>
                      <td style={{ fontSize: "12px", opacity: 0.8 }}>
                        {user.createdAt ? new Date(user.createdAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : "-"}
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: "6px" }}>
                          <button 
                            className="btn btn-sm btn-secondary" 
                            onClick={() => handleEdit(user)}
                            style={{ padding: "4px 10px" }}
                          >
                            Edit
                          </button>
                          <button 
                            className="btn btn-sm btn-danger" 
                            onClick={() => handleDelete(user.id, user.name)}
                            style={{ padding: "4px 10px" }}
                          >
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

          {totalPages > 1 && (
            <div className="pagination" style={{ borderTop: "1px solid #f1f5f9", marginTop: 0 }}>
              <span className="page-info">Halaman {page} dari {totalPages}</span>
              <div className="page-buttons">
                <button
                  className="btn btn-sm btn-secondary"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >Sebelumnya</button>
                <button
                  className="btn btn-sm btn-secondary"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >Selanjutnya</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
