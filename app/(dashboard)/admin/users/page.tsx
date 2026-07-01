"use client";



import Topbar from "@/components/Topbar";
import Link from "next/link";

import React, { useState, useEffect, useCallback } from "react";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

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
          <option value="usia_mandiri">Usia Mandiri</option>
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
          <option value="tim_gambuh">Tim Gambuh</option>
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

function EditUserForm({ user, onSuccess, onCancel }: { user: UserItem, onSuccess: () => void, onCancel: () => void }) {
  const [editForm, setEditForm] = useState({ name: user.name, email: user.email, password: '' });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload: any = { id: user.id, name: editForm.name, email: editForm.email };
      if (editForm.password) {
        payload.password = editForm.password;
      }
      
      const res = await fetch("/api/admin/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok) {
        Swal.fire({ icon: 'success', title: 'Berhasil', text: 'Data user berhasil diperbarui', timer: 1500 });
        onSuccess();
      } else {
        Swal.fire({ icon: 'error', title: 'Gagal', text: data.error || 'Gagal memperbarui user' });
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
        <input type="text" className="form-control" required value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} />
      </div>
      <div className="form-group" style={{ marginBottom: '15px' }}>
        <label className="form-label" style={{ display: 'block', marginBottom: '5px' }}>Email</label>
        <input type="email" className="form-control" required value={editForm.email} onChange={e => setEditForm({...editForm, email: e.target.value})} />
      </div>
      <div className="form-group" style={{ marginBottom: '15px' }}>
        <label className="form-label" style={{ display: 'block', marginBottom: '5px' }}>Password Baru <small>(Kosongkan jika tidak diubah)</small></label>
        <input type="password" className="form-control" value={editForm.password} onChange={e => setEditForm({...editForm, password: e.target.value})} placeholder="Masukkan password baru..." />
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
        <button type="button" className="btn btn-secondary" onClick={onCancel}>Batal</button>
        <button type="submit" className="btn btn-primary" disabled={submitting}>
          {submitting ? 'Menyimpan...' : 'Simpan Perubahan'}
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
  const [filterDesa, setFilterDesa] = useState("");
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
      if (filterDesa) uParams.append("desaId", filterDesa);
      const uRes = await fetch(`/api/admin/users?${uParams}`);
      const uJson = await uRes.json();
      setData(uJson.data || []);
      setTotal(uJson.total || 0);
    } catch (error) {
      console.error("Failed to fetch user data:", error);
    }
    setLoading(false);
  }, [search, filterRole, filterDesa, page]);

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

  const handleExportPDF = async () => {
    // Show SweetAlert role selector modal for multiple roles selection
    const { value: selectedRoles } = await Swal.fire({
      title: "Pilih Role Pengurus untuk PDF",
      html: `
        <div style="text-align: left; display: grid; grid-template-columns: 1fr; gap: 8px; font-size: 14px; padding: 10px;">
          <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
            <input type="checkbox" id="role-desa" value="desa" checked style="width: 16px; height: 16px;" />
            <span>Pengurus Desa</span>
          </label>
          <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
            <input type="checkbox" id="role-kelompok" value="kelompok" checked style="width: 16px; height: 16px;" />
            <span>Pengurus Kelompok</span>
          </label>
          <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
            <input type="checkbox" id="role-pengurus_daerah" value="pengurus_daerah" style="width: 16px; height: 16px;" />
            <span>Pengurus Daerah</span>
          </label>
          <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
            <input type="checkbox" id="role-kmm_daerah" value="kmm_daerah" style="width: 16px; height: 16px;" />
            <span>KMM Daerah</span>
          </label>
          <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
            <input type="checkbox" id="role-admin" value="admin" style="width: 16px; height: 16px;" />
            <span>Admin Utama</span>
          </label>
          <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
            <input type="checkbox" id="role-tim_pnkb" value="tim_pnkb" style="width: 16px; height: 16px;" />
            <span>Tim PNKB</span>
          </label>
          <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
            <input type="checkbox" id="role-admin_romantic_room" value="admin_romantic_room" style="width: 16px; height: 16px;" />
            <span>Admin Romantic Room</span>
          </label>
          <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
            <input type="checkbox" id="role-admin_keuangan" value="admin_keuangan" style="width: 16px; height: 16px;" />
            <span>Admin Keuangan</span>
          </label>
          <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
            <input type="checkbox" id="role-admin_kegiatan" value="admin_kegiatan" style="width: 16px; height: 16px;" />
            <span>Admin Kegiatan</span>
          </label>
          <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
            <input type="checkbox" id="role-tim_gambuh" value="tim_gambuh" style="width: 16px; height: 16px;" />
            <span>Tim Gambuh</span>
          </label>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: "Export PDF",
      cancelButtonText: "Batal",
      preConfirm: () => {
        const getVal = (id: string) => {
          const el = document.getElementById(id) as HTMLInputElement;
          return el ? el.checked : false;
        };
        const roles = [];
        if (getVal("role-desa")) roles.push("desa");
        if (getVal("role-kelompok")) roles.push("kelompok");
        if (getVal("role-pengurus_daerah")) roles.push("pengurus_daerah");
        if (getVal("role-kmm_daerah")) roles.push("kmm_daerah");
        if (getVal("role-admin")) roles.push("admin");
        if (getVal("role-tim_pnkb")) roles.push("tim_pnkb");
        if (getVal("role-admin_romantic_room")) roles.push("admin_romantic_room");
        if (getVal("role-admin_keuangan")) roles.push("admin_keuangan");
        if (getVal("role-admin_kegiatan")) roles.push("admin_kegiatan");
        if (getVal("role-tim_gambuh")) roles.push("tim_gambuh");
        return roles;
      }
    });

    if (!selectedRoles) return; // cancelled

    if (selectedRoles.length === 0) {
      Swal.fire({
        icon: "warning",
        title: "Peringatan",
        text: "Pilih minimal satu role pengurus untuk diekspor.",
      });
      return;
    }

    Swal.fire({
      title: "Menyiapkan PDF Pengurus...",
      text: "Mengambil data pengurus",
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      },
    });

    try {
      const uParams = new URLSearchParams({ all: "true" });
      if (filterDesa) uParams.append("desaId", filterDesa);
      const res = await fetch(`/api/admin/users?${uParams}`);
      const json = await res.json();
      const exportData = json.data || [];

      // Filter only selected roles
      const filteredData = exportData.filter((item: any) =>
        selectedRoles.includes(item.role)
      );

      if (filteredData.length === 0) {
        Swal.fire({
          icon: "info",
          title: "Tidak ada data",
          text: "Tidak ada data Pengurus dengan role terpilih ditemukan.",
        });
        return;
      }

      const doc = new jsPDF();
      doc.setFontSize(18);
      doc.text("Daftar Pengurus Sistem", 14, 15);

      const selectedDesaObj = desaList.find(
        (d) => String(d.id) === String(filterDesa)
      );
      const desaName = selectedDesaObj ? selectedDesaObj.nama : "Semua Desa";
      
      const roleLabels: Record<string, string> = {
        desa: "Pengurus Desa",
        kelompok: "Pengurus Kelompok",
        pengurus_daerah: "Pengurus Daerah",
        kmm_daerah: "KMM Daerah",
        admin: "Admin Utama",
        tim_pnkb: "Tim PNKB",
        admin_romantic_room: "Admin Romantic Room",
        admin_keuangan: "Admin Keuangan",
        admin_kegiatan: "Admin Kegiatan",
        tim_gambuh: "Tim Gambuh",
      };

      const selectedRoleLabels = selectedRoles.map((r: string) => roleLabels[r] || r).join(", ");

      doc.setFontSize(9);
      doc.setTextColor(100);
      doc.text(`Desa: ${desaName} | Waktu: ${new Date().toLocaleString("id-ID")} | Total: ${filteredData.length}`, 14, 21);
      
      const splitRoles = doc.splitTextToSize(`Role: ${selectedRoleLabels}`, 180);
      doc.text(splitRoles, 14, 26);

      const startY = 28 + (splitRoles.length * 4);

      const tableRows = filteredData.map((item: any, index: number) => [
        index + 1,
        item.name,
        roleLabels[item.role] || item.role,
        item.desaNama || "-",
        item.kelompokNama || "-",
        item.email,
      ]);

      autoTable(doc, {
        head: [["No", "Nama Lengkap", "Role", "Desa", "Kelompok", "Email"]],
        body: tableRows,
        startY: startY,
        theme: "striped",
        headStyles: { fillColor: [30, 41, 59] }, // Elegant dark slate
        styles: { fontSize: 8, cellPadding: 3 },
        margin: { top: 27 },
      });

      doc.save(`Daftar_Pengurus_${new Date().getTime()}.pdf`);

      Swal.fire({
        icon: "success",
        title: "Selesai!",
        text: "File PDF berhasil dibuat.",
        timer: 1500,
        showConfirmButton: false,
      });
    } catch (error) {
      console.error(error);
      Swal.fire({
        icon: "error",
        title: "Gagal",
        text: "Terjadi kesalahan saat mengekspor PDF.",
      });
    }
  };

   const roleColors: Record<string, string> = {
    admin: "badge-red", pengurus_daerah: "badge-red", kmm_daerah: "badge-red",
    desa: "badge-blue", kelompok: "badge-green", generus: "badge-purple", peserta: "badge-indigo", usia_mandiri: "badge-pink",
    creator: "badge-orange", pending: "badge-gray", tim_pnkb: "badge-blue",
    admin_romantic_room: "badge-purple", admin_keuangan: "badge-blue",
    admin_kegiatan: "badge-orange", tim_gambuh: "badge-indigo",
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

  const handleOpenEditUser = (user: UserItem) => {
    const formElement = (
      <EditUserForm 
        user={user} 
        onSuccess={() => { MySwal.close(); fetchData(); }} 
        onCancel={() => MySwal.close()} 
      />
    );
    MySwal.fire({
      title: 'Edit User',
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
            <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
              <select
                className="form-control"
                style={{ width: "auto" }}
                value={filterDesa}
                onChange={(e) => { setFilterDesa(e.target.value); setPage(1); }}
              >
                <option value="">Semua Desa</option>
                {desaList.map(d => (
                  <option key={d.id} value={d.id}>{d.nama}</option>
                ))}
              </select>
              <select
                className="form-control"
                style={{ width: "auto" }}
                value={filterRole}
                onChange={(e) => { setFilterRole(e.target.value); setPage(1); }}
              >
                <option value="">Semua Role</option>
                <option value="generus">Generus</option>
                <option value="usia_mandiri">Usia Mandiri</option>
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
                <option value="tim_gambuh">Tim Gambuh</option>
              </select>
              {filterRole && (
                <button className="btn btn-sm btn-danger" onClick={handleBulkDeleteRole}>
                  Hapus ({filterRole})
                </button>
              )}
              <button 
                className="btn btn-secondary" 
                onClick={handleExportPDF} 
                style={{ display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap', backgroundColor: "#10b981", color: "white" }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>
                </svg>
                Export PDF Pengurus
              </button>
            </div>
          </div>

          {loading ? (
            <div className="loading"><div className="spinner" /></div>
          ) : data.length === 0 ? (
             <div className="empty-state">
               <p>Tidak ada user ditemukan.</p>
             </div>
          ) : (
            <>
              {/* 🖥️ Desktop Table View */}
              <div className="table-wrapper desktop-only">
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
                          {["pengurus_daerah", "desa", "kelompok"].includes(user.role) ? (
                            <span className="text-gray-400" style={{ fontSize: 10 }}>-</span>
                          ) : (
                            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
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
                          )}
                        </td>
                        <td>
                          <span className={`badge ${roleColors[user.role] || "badge-gray"}`}>
                            {user.role}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                            {["desa", "kelompok", "creator", "generus", "usia_mandiri", "peserta", "tim_pnkb"].includes(user.role) ? (
                              <>
                                <select className="form-control" style={{ padding: "4px 8px", fontSize: 11, minWidth: 120 }} value={user.desaId || ""} onChange={(e) => updateUser(user.id, { desaId: Number(e.target.value) })}>
                                  <option value="">Pilih Desa</option>
                                  {desaList.map(d => <option key={d.id} value={d.id}>{d.nama}</option>)}
                                </select>
                                {["kelompok", "creator", "generus", "usia_mandiri", "peserta", "tim_pnkb"].includes(user.role) && (
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
                              <option value="usia_mandiri">Usia Mandiri</option>
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
                              <option value="tim_gambuh">Tim Gambuh</option>
                            </select>
                            <div className="flex gap-2" style={{ marginTop: "8px" }}>
                              <button className="btn btn-sm btn-secondary" onClick={() => handleOpenEditUser(user)}>Edit</button>
                              <button className="btn btn-sm btn-danger" onClick={() => handleDelete(user.id)}>Hapus</button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* 📱 Mobile Card View */}
              <div className="mobile-only" style={{ display: "flex", flexDirection: "column", gap: "14px", padding: "12px 14px" }}>
                {data.map((user) => (
                  <div 
                    key={user.id} 
                    style={{ 
                      padding: "16px", 
                      display: "flex", 
                      flexDirection: "column", 
                      gap: "12px", 
                      border: "1px solid var(--border)", 
                      borderRadius: "14px", 
                      background: "var(--bg-card)",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.02)"
                    }}
                  >
                    {/* Header: Name, Email & Role Badge */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "10px" }}>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <h4 style={{ margin: "0 0 2px 0", fontSize: "14.5px", fontWeight: 600, color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{user.name}</h4>
                        <span style={{ fontSize: "12px", color: "var(--muted)", wordBreak: "break-all" }}>{user.email}</span>
                      </div>
                      <span className={`badge ${roleColors[user.role] || "badge-gray"}`} style={{ fontSize: "9.5px", padding: "3px 8px", flexShrink: 0 }}>
                        {user.role}
                      </span>
                    </div>

                    {/* Profil details (e.g., Generus/Mandiri) */}
                    {(user.generusNomorUnik || user.isMandiri) && (
                      <div style={{ padding: "8px 10px", background: "var(--bg-light)", borderRadius: "8px", display: "flex", flexWrap: "wrap", gap: "6px" }}>
                        {user.generusNomorUnik && (
                          <span className="badge badge-purple" style={{ fontSize: "9px", padding: "2px 6px" }}>
                            Generus: #{user.generusNomorUnik}
                          </span>
                        )}
                        {user.isMandiri && (
                          <span className="badge badge-indigo" style={{ fontSize: "9px", padding: "2px 6px" }}>
                            Mandiri ({user.mandiriNomorUrut || "-"})
                          </span>
                        )}
                      </div>
                    )}

                    {/* Desa/Kelompok assignments */}
                    {["desa", "kelompok", "creator", "generus", "usia_mandiri", "peserta", "tim_pnkb"].includes(user.role) && (
                      <div style={{ display: "flex", flexDirection: "column", gap: "6px", borderTop: "1px solid var(--border)", paddingTop: "10px" }}>
                        <span style={{ fontSize: "10.5px", fontWeight: 700, textTransform: "uppercase", color: "var(--muted)", letterSpacing: "0.2px" }}>Wilayah Tugas</span>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                          <div>
                            <select 
                              className="form-control" 
                              style={{ padding: "6px 8px", fontSize: "11.5px", height: "34px", borderRadius: "8px" }} 
                              value={user.desaId || ""} 
                              onChange={(e) => updateUser(user.id, { desaId: Number(e.target.value) })}
                            >
                              <option value="">Pilih Desa</option>
                              {desaList.map(d => <option key={d.id} value={d.id}>{d.nama}</option>)}
                            </select>
                          </div>
                          {["kelompok", "creator", "generus", "usia_mandiri", "peserta", "tim_pnkb"].includes(user.role) && (
                            <div>
                              <select 
                                className="form-control" 
                                style={{ padding: "6px 8px", fontSize: "11.5px", height: "34px", borderRadius: "8px" }} 
                                value={user.kelompokId || ""} 
                                onChange={(e) => updateUser(user.id, { kelompokId: Number(e.target.value) })}
                              >
                                <option value="">Pilih Kelompok</option>
                                {kelompokList.filter(k => !user.desaId || k.desaId === user.desaId).map(k => <option key={k.id} value={k.id}>{k.nama}</option>)}
                              </select>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Actions Area */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px", borderTop: "1px solid var(--border)", paddingTop: "10px", marginTop: "2px" }}>
                      <span style={{ fontSize: "10.5px", fontWeight: 700, textTransform: "uppercase", color: "var(--muted)", letterSpacing: "0.2px" }}>Ubah Role & Aksi</span>
                      <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                        <select 
                          className="form-control" 
                          style={{ padding: "6px 10px", fontSize: "12px", height: "36px", flex: 1, borderRadius: "8px" }} 
                          value={user.role} 
                          onChange={(e) => updateUser(user.id, { role: e.target.value })}
                        >
                          <option value="generus">Generus</option>
                          <option value="usia_mandiri">Usia Mandiri</option>
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
                          <option value="tim_gambuh">Tim Gambuh</option>
                        </select>
                        <div style={{ display: "flex", gap: "6px", flexShrink: 0 }}>
                          <button 
                            className="btn btn-secondary" 
                            onClick={() => handleOpenEditUser(user)} 
                            style={{ padding: "0 12px", height: "36px", fontSize: "12px", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center" }}
                          >
                            Edit
                          </button>
                          <button 
                            className="btn btn-danger" 
                            onClick={() => handleDelete(user.id)} 
                            style={{ padding: "0 12px", height: "36px", fontSize: "12px", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#ef4444", color: "white" }}
                          >
                            Hapus
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

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
