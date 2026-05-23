"use client";

import Topbar from "@/components/Topbar";
import Link from "next/link";

import React, { useState, useEffect, useCallback } from "react";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";

const MySwal = withReactContent(Swal);

interface UserItem {
  id: string;
  name: string;
  email: string;
  role: string;
  desaId: number | null;
  kelompokId: number | null;
  desaNama: string | null;
  kelompokNama: string | null;
  createdAt: string | null;
  generusNomorUnik: string | null;
  isMandiri: number;
  mandiriStatus: string | null;
  mandiriNomorUrut: number | null;
}

interface DesaItem { id: number; nama: string; }
interface KelompokItem { id: number; nama: string; desaId: number; }

function AddUserForm({ desaList, kelompokList, onSuccess, onCancel }: { desaList: DesaItem[], kelompokList: KelompokItem[], onSuccess: () => void, onCancel: () => void }) {
  const [addForm, setAddForm] = useState({ name: '', email: '', password: '', role: 'generus', desaId: '', kelompokId: '' });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(addForm)
      });
      const data = await res.json();
      if (res.ok) {
        Swal.fire({ icon: 'success', title: 'Berhasil', text: 'User berhasil ditambahkan', timer: 1500 });
        onSuccess();
      } else {
        Swal.fire({ icon: 'error', title: 'Gagal', text: data.error || 'Gagal menambahkan user' });
      }
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Gagal', text: 'Terjadi kesalahan sistem' });
    }
    setSubmitting(false);
  };

  return (
    <form onSubmit={handleSubmit} style={{ textAlign: 'left' }}>
      <div className="form-group" style={{ marginBottom: '15px' }}>
        <label className="form-label" style={{ display: 'block', marginBottom: '5px' }}>Nama Lengkap</label>
        <input type="text" className="form-control" required value={addForm.name} onChange={e => setAddForm({...addForm, name: e.target.value})} />
      </div>
      <div className="form-group" style={{ marginBottom: '15px' }}>
        <label className="form-label" style={{ display: 'block', marginBottom: '5px' }}>Email</label>
        <input type="email" className="form-control" required value={addForm.email} onChange={e => setAddForm({...addForm, email: e.target.value})} />
      </div>
      <div className="form-group" style={{ marginBottom: '15px' }}>
        <label className="form-label" style={{ display: 'block', marginBottom: '5px' }}>Password</label>
        <input type="password" className="form-control" required value={addForm.password} onChange={e => setAddForm({...addForm, password: e.target.value})} />
      </div>
      <div className="form-group" style={{ marginBottom: '15px' }}>
        <label className="form-label" style={{ display: 'block', marginBottom: '5px' }}>Role</label>
        <select className="form-control" value={addForm.role} onChange={e => setAddForm({...addForm, role: e.target.value, desaId: '', kelompokId: ''})}>
          <option value="generus">Generus</option>
          <option value="peserta">Peserta (Mandiri)</option>
          <option value="creator">Creator/Penulis</option>
          <option value="kelompok">Pengurus Kelompok</option>
          <option value="desa">Pengurus Desa</option>
          <option value="admin">Admin Utama</option>
          <option value="pengurus_daerah">Pengurus Daerah</option>
          <option value="kmm_daerah">KMM Daerah</option>
          <option value="tim_pnkb">Tim PNKB</option>
          <option value="admin_romantic_room">Admin Romantic Room</option>
          <option value="admin_keuangan">Admin Keuangan</option>
          <option value="admin_kegiatan">Admin Kegiatan</option>
        </select>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
        <button type="button" className="btn btn-secondary" onClick={onCancel}>Batal</button>
        <button type="submit" className="btn btn-primary" disabled={submitting}>
          {submitting ? 'Menyimpan...' : 'Simpan User'}
        </button>
      </div>
    </form>
  );
}

export default function AdminUsersPage() {
  const [data, setData] = useState<UserItem[]>([]);
  const [desaList, setDesaList] = useState<DesaItem[]>([]);
  const [kelompokList, setKelompokList] = useState<KelompokItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [userRole, setUserRole] = useState("");
  const limit = 50;

  useEffect(() => {
    setMounted(true);
    fetch("/api/profile").then(r => r.json()).then(d => setUserRole(d.role || ""));
  }, []);

  const fetchStaticData = useCallback(async () => {
    try {
      const [dRes, kRes] = await Promise.all([
        fetch("/api/admin/desa"),
        fetch("/api/admin/kelompok"),
      ]);
      const [dJson, kJson] = await Promise.all([dRes.json(), kRes.json()]);
      setDesaList(Array.isArray(dJson) ? dJson : []);
      setKelompokList(Array.isArray(kJson) ? kJson : []);
    } catch (error) {
      console.error("Failed to fetch static data:", error);
    }
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const uParams = new URLSearchParams({ 
        search, 
        page: String(page), 
        limit: String(limit) 
      });
      if (filterRole) uParams.append("role", filterRole);
      const uRes = await fetch(`/api/admin/users?${uParams}`);
      const uJson = await uRes.json();
      setData(uJson.data || []);
      setTotal(uJson.total || 0);
    } catch (error) {
      console.error("Failed to fetch user data:", error);
    }
    setLoading(false);
  }, [search, filterRole, page]);

  useEffect(() => {
    fetchStaticData();
  }, [fetchStaticData]);

  useEffect(() => { 
    const timer = setTimeout(fetchData, 300);
    return () => clearTimeout(timer);
  }, [fetchData]);

  if (!mounted) return <div className="loading"><div className="spinner" /></div>;

  const totalPages = Math.ceil(total / limit);

  // Remaining functions...
  const updateUser = async (id: string, updates: Partial<UserItem>) => {
    try {
      const res = await fetch("/api/admin/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...updates }),
      });
      if (res.ok) {
        Swal.fire({
          icon: 'success', title: 'Diperbarui', text: 'Data user berhasil diupdate',
          toast: true, position: 'top-end', timer: 2000, showConfirmButton: false
        });
        fetchData();
      }
    } catch {
      Swal.fire({ icon: 'error', title: 'Gagal', text: 'Terjadi kesalahan saat update user' });
    }
  };

  const handleDelete = async (id: string) => {
    const res = await Swal.fire({
      title: 'Hapus User?',
      text: "Akun user akan dihapus permanen dari sistem!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Ya, Hapus!',
      cancelButtonText: 'Batal'
    });
    
    if (res.isConfirmed) {
      await fetch(`/api/admin/users?id=${id}`, { method: "DELETE" });
      Swal.fire({ icon: 'success', title: 'Terhapus!', text: 'User berhasil dihapus.', timer: 1500, showConfirmButton: false });
      fetchData();
    }
  };

  const handleBulkDeleteRole = async () => {
    if (!filterRole) return;
    
    const res = await Swal.fire({
      title: 'Hapus Semua User dengan Role Ini?',
      text: `Semua akun user dengan role "${filterRole}" akan dihapus permanen dari sistem!`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Ya, Hapus Semua!',
      cancelButtonText: 'Batal'
    });
    
    if (res.isConfirmed) {
      const resp = await fetch(`/api/admin/users?role=${filterRole}`, { method: "DELETE" });
      if (resp.ok) {
        Swal.fire({ icon: 'success', title: 'Terhapus!', text: `Semua user dengan role ${filterRole} berhasil dihapus.`, timer: 1500, showConfirmButton: false });
        fetchData();
      } else {
        Swal.fire({ icon: 'error', title: 'Gagal', text: 'Terjadi kesalahan saat menghapus data.' });
      }
    }
  };

   const roleColors: Record<string, string> = {
    admin: "badge-red", pengurus_daerah: "badge-red", kmm_daerah: "badge-red",
    desa: "badge-blue", kelompok: "badge-green", generus: "badge-purple", peserta: "badge-indigo",
    creator: "badge-orange", pending: "badge-gray", tim_pnkb: "badge-blue",
    admin_romantic_room: "badge-purple", admin_keuangan: "badge-blue",
    admin_kegiatan: "badge-orange",
  };

  const handleOpenAddUser = () => {
    const formElement = (
      <AddUserForm 
        desaList={desaList} 
        kelompokList={kelompokList} 
        onSuccess={() => { MySwal.close(); fetchData(); }} 
        onCancel={() => MySwal.close()} 
      />
    );
    MySwal.fire({
      title: 'Tambah User Baru',
      html: formElement,
      showConfirmButton: false,
      showCloseButton: true,
      allowOutsideClick: false,
      width: '500px'
    });
  };

  return (
    <div>
      <Topbar title="Admin - Kelola User" role={userRole} />
      <div className="page-content">
        <div className="page-header">
          <div className="page-header-left">
            <h2>Kelola User</h2>
            <p>Manage hak akses pengguna sistem</p>
          </div>
          <div className="page-header-right" style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <span className="badge badge-blue">{total} user ditemukan</span>
            <button className="btn btn-primary" onClick={handleOpenAddUser} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                <path d="M12 5v14M5 12h14"/>
              </svg>
              Daftar User
            </button>
          </div>
        </div>

        <div className="card">
          <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
            <div className="search-bar" style={{ flex: 1, maxWidth: "400px" }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
              </svg>
              <input
                type="text"
                className="form-control"
                placeholder="Cari nama atau email..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              />
            </div>
            <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
              <select
                className="form-control"
                style={{ width: "auto" }}
                value={filterRole}
                onChange={(e) => { setFilterRole(e.target.value); setPage(1); }}
              >
                <option value="">Semua Role</option>
                <option value="generus">Generus</option>
                <option value="peserta">Peserta (Mandiri)</option>
                <option value="creator">Creator/Penulis</option>
                <option value="kelompok">Pengurus Kelompok</option>
                <option value="desa">Pengurus Desa</option>
                <option value="pending">Menunggu (Pending)</option>
                <option value="admin">Admin Utama</option>
                <option value="pengurus_daerah">Pengurus Daerah</option>
                <option value="kmm_daerah">KMM Daerah</option>
                <option value="tim_pnkb">Tim PNKB</option>
                <option value="admin_romantic_room">Admin Romantic Room</option>
                <option value="admin_keuangan">Admin Keuangan</option>
                <option value="admin_kegiatan">Admin Kegiatan</option>
              </select>
              {filterRole && (
                <button className="btn btn-sm btn-danger" onClick={handleBulkDeleteRole}>
                  Hapus ({filterRole})
                </button>
              )}
            </div>
          </div>

          <div className="table-wrapper">
            {loading ? (
              <div className="loading"><div className="spinner" /></div>
            ) : data.length === 0 ? (
               <div className="empty-state">
                 <p>Tidak ada user ditemukan.</p>
               </div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Nama</th>
                    <th>Email</th>
                    <th>Profil</th>
                    <th>Role</th>
                    <th>Desa/Kelompok</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((user) => (
                    <tr key={user.id}>
                      <td style={{ fontWeight: 500 }}>{user.name}</td>
                       <td className="text-muted">{user.email}</td>
                      <td>
                        <div className="flex flex-col gap-1">
                          {user.generusNomorUnik ? (
                            <span className="badge badge-purple" style={{ fontSize: 10, padding: "2px 4px" }}>
                              Generus: #{user.generusNomorUnik}
                            </span>
                          ) : (
                            <span className="text-gray-400" style={{ fontSize: 10 }}>-</span>
                          )}
                          {user.isMandiri ? (
                            <span className="badge badge-indigo" style={{ fontSize: 10, padding: "2px 4px" }}>
                              Mandiri ({user.mandiriNomorUrut || "-"})
                            </span>
                          ) : null}
                        </div>
                      </td>
                      <td>
                        <span className={`badge ${roleColors[user.role] || "badge-gray"}`}>
                          {user.role}
                        </span>
                      </td>
                      <td>
                        <div className="flex flex-col gap-1">
                          {["desa", "kelompok", "creator", "generus", "peserta", "tim_pnkb"].includes(user.role) ? (
                            <>
                              <select className="form-control" style={{ padding: "4px 8px", fontSize: 11, minWidth: 120 }} value={user.desaId || ""} onChange={(e) => updateUser(user.id, { desaId: Number(e.target.value) })}>
                                <option value="">Pilih Desa</option>
                                {desaList.map(d => <option key={d.id} value={d.id}>{d.nama}</option>)}
                              </select>
                              {["kelompok", "creator", "generus", "peserta", "tim_pnkb"].includes(user.role) && (
                                <select className="form-control" style={{ padding: "4px 8px", fontSize: 11, minWidth: 120 }} value={user.kelompokId || ""} onChange={(e) => updateUser(user.id, { kelompokId: Number(e.target.value) })}>
                                  <option value="">Pilih Kelompok</option>
                                  {kelompokList.filter(k => !user.desaId || k.desaId === user.desaId).map(k => <option key={k.id} value={k.id}>{k.nama}</option>)}
                                </select>
                              )}
                            </>
                          ) : "-"}
                        </div>
                      </td>
                      <td>
                        <div className="flex gap-2">
                          <select className="form-control" style={{ padding: "4px 8px", fontSize: 12, width: "auto" }} value={user.role} onChange={(e) => updateUser(user.id, { role: e.target.value })}>
                            <option value="generus">Generus</option>
                            <option value="peserta">Peserta (Mandiri)</option>
                            <option value="creator">Creator/Penulis</option>
                            <option value="kelompok">Pengurus Kelompok</option>
                            <option value="desa">Pengurus Desa</option>
                            <option value="pending">Menunggu (Pending)</option>
                            <option value="admin">Admin Utama</option>
                            <option value="pengurus_daerah">Pengurus Daerah</option>
                            <option value="kmm_daerah">KMM Daerah</option>
                            <option value="tim_pnkb">Tim PNKB</option>
                            <option value="admin_romantic_room">Admin Romantic Room</option>
                            <option value="admin_keuangan">Admin Keuangan</option>
                            <option value="admin_kegiatan">Admin Kegiatan</option>
                          </select>
                          <button className="btn btn-sm btn-danger" onClick={() => handleDelete(user.id)}>Hapus</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {totalPages > 1 && (
            <div className="pagination">
              <span className="page-info">Halaman {page} dari {totalPages}</span>
              <div className="page-buttons">
                <button
                  className="btn btn-sm btn-secondary"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >← Prev</button>
                <button
                  className="btn btn-sm btn-secondary"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >Next →</button>
              </div>
            </div>
          )}
        </div>
        </div>
      </div>

  );
}
