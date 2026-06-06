"use client";



import Topbar from "@/components/Topbar";

import { useState, useEffect, useCallback } from "react";
import Swal from "sweetalert2";

interface DesaItem { id: number; nama: string; }
interface KelompokItem { id: number; nama: string; desaId: number; desaNama: string | null; }

export default function AdminDesaPage() {
  const [desaList, setDesaList] = useState<DesaItem[]>([]);
  const [kelompokList, setKelompokList] = useState<KelompokItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [newDesa, setNewDesa] = useState("");
  const [newKelompok, setNewKelompok] = useState({ nama: "", desaId: "" });
  const [error, setError] = useState("");
  const [userRole, setUserRole] = useState("");

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [d, k] = await Promise.all([
      fetch("/api/admin/desa").then((r) => r.json()),
      fetch("/api/admin/kelompok").then((r) => r.json()),
    ]);
    setDesaList(Array.isArray(d) ? d : []);
    setKelompokList(Array.isArray(k) ? k : []);
    setLoading(false);
  }, []);

  useEffect(() => { 
    fetchAll(); 
    fetch("/api/profile").then(r => r.json()).then(d => setUserRole(d.role || ""));
  }, [fetchAll]);

  const handleAddDesa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDesa.trim()) return;
    setError("");
    const res = await fetch("/api/admin/desa", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nama: newDesa }),
    });
    if (!res.ok) { 
      const d = await res.json(); 
      Swal.fire({ icon: 'error', title: 'Gagal', text: d.error });
      setError(d.error); 
      return; 
    }
    Swal.fire({
      icon: 'success',
      title: 'Berhasil',
      text: 'Desa berhasil ditambahkan',
      timer: 1500,
      showConfirmButton: false
    });
    setNewDesa("");
    fetchAll();
  };

  const handleDeleteDesa = async (id: number) => {
    const res = await Swal.fire({
      title: 'Hapus Desa?',
      text: "Seluruh data kelompok, generus, dan user di desa ini akan ikut terhapus!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Ya, Hapus!',
      cancelButtonText: 'Batal'
    });
    
    if (res.isConfirmed) {
      await fetch(`/api/admin/desa?id=${id}`, { method: "DELETE" });
      Swal.fire({
        icon: 'success',
        title: 'Terhapus!',
        text: 'Desa berhasil dihapus.',
        timer: 1500,
        showConfirmButton: false
      });
      fetchAll();
    }
  };

  const handleAddKelompok = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKelompok.nama || !newKelompok.desaId) return;
    setError("");
    const res = await fetch("/api/admin/kelompok", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nama: newKelompok.nama, desaId: Number(newKelompok.desaId) }),
    });
    if (!res.ok) { 
      const d = await res.json(); 
      Swal.fire({ icon: 'error', title: 'Gagal', text: d.error });
      setError(d.error); 
      return; 
    }
    Swal.fire({
      icon: 'success',
      title: 'Berhasil',
      text: 'Kelompok berhasil ditambahkan',
      timer: 1500,
      showConfirmButton: false
    });
    setNewKelompok({ nama: "", desaId: "" });
    fetchAll();
  };

  const handleDeleteKelompok = async (id: number) => {
    const res = await Swal.fire({
      title: 'Hapus Kelompok?',
      text: "Seluruh data generus dan user di kelompok ini akan ikut terhapus!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Ya, Hapus!',
      cancelButtonText: 'Batal'
    });
    
    if (res.isConfirmed) {
      await fetch(`/api/admin/kelompok?id=${id}`, { method: "DELETE" });
      Swal.fire({
        icon: 'success',
        title: 'Terhapus!',
        text: 'Kelompok berhasil dihapus.',
        timer: 1500,
        showConfirmButton: false
      });
      fetchAll();
    }
  };

  return (
    <div>
      <Topbar title="Admin - Kelola Desa & Kelompok" role={userRole} />
      <div className="page-content">
        <div className="page-header">
          <div className="page-header-left">
            <h2>Kelola Desa & Kelompok</h2>
            <p>Tambah dan kelola wilayah dalam sistem</p>
          </div>
        </div>

        {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>}

        {loading ? (
          <div className="loading"><div className="spinner" /></div>
        ) : (
          <div className="responsive-grid-2">
            {/* Desa */}
            <div className="card">
              <div className="card-header">
                <span className="card-title">Daftar Desa</span>
                <span className="badge badge-blue">{desaList.length}</span>
              </div>
              <div className="card-body">
                <form onSubmit={handleAddDesa} className="flex gap-2 mb-4" style={{ marginBottom: 16 }}>
                  <input
                    className="form-control"
                    placeholder="Nama desa baru..."
                    value={newDesa}
                    onChange={(e) => setNewDesa(e.target.value)}
                    required
                  />
                  <button type="submit" className="btn btn-primary" style={{ whiteSpace: "nowrap" }}>+ Tambah</button>
                </form>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {desaList.map((d) => (
                    <div key={d.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", background: "var(--bg)", borderRadius: 8 }}>
                      <span style={{ fontWeight: 500 }}>{d.nama}</span>
                      <button className="btn btn-sm btn-danger" onClick={() => handleDeleteDesa(d.id)}>Hapus</button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Kelompok */}
            <div className="card">
              <div className="card-header">
                <span className="card-title">Daftar Kelompok</span>
                <span className="badge badge-green">{kelompokList.length}</span>
              </div>
              <div className="card-body">
                <form onSubmit={handleAddKelompok} style={{ marginBottom: 16 }}>
                  <div className="form-row" style={{ marginBottom: 8 }}>
                    <input
                      className="form-control"
                      placeholder="Nama kelompok baru..."
                      value={newKelompok.nama}
                      onChange={(e) => setNewKelompok((p) => ({ ...p, nama: e.target.value }))}
                      required
                    />
                    <select
                      className="form-control"
                      value={newKelompok.desaId}
                      onChange={(e) => setNewKelompok((p) => ({ ...p, desaId: e.target.value }))}
                      required
                    >
                      <option value="">Pilih Desa</option>
                      {desaList.map((d) => <option key={d.id} value={d.id}>{d.nama}</option>)}
                    </select>
                  </div>
                  <button type="submit" className="btn btn-primary btn-full">+ Tambah Kelompok</button>
                </form>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {kelompokList.map((k) => (
                    <div key={k.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", background: "var(--bg)", borderRadius: 8 }}>
                      <div>
                        <span style={{ fontWeight: 500 }}>{k.nama}</span>
                        <span className="text-sm text-muted" style={{ marginLeft: 8 }}>{k.desaNama}</span>
                      </div>
                      <button className="btn btn-sm btn-danger" onClick={() => handleDeleteKelompok(k.id)}>Hapus</button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
