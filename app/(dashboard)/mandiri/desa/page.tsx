"use client";
export const runtime = "edge";


import Topbar from "@/components/Topbar";

import { useState, useEffect, useCallback } from "react";
import Swal from "sweetalert2";

interface MandiriDesaItem { id: number; nama: string; kota: string; }
interface MandiriKelompokItem { id: number; nama: string; mandiriDesaId: number; desaNama: string | null; }

export default function MandiriDesaPage() {
  const [desaList, setDesaList] = useState<MandiriDesaItem[]>([]);
  const [kelompokList, setKelompokList] = useState<MandiriKelompokItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [newDesa, setNewDesa] = useState({ nama: "", kota: "Jakarta Barat" });
  const [newKelompok, setNewKelompok] = useState({ nama: "", mandiriDesaId: "" });
  const [error, setError] = useState("");
  const [userRole, setUserRole] = useState("");

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [d, k] = await Promise.all([
        fetch("/api/mandiri/desa").then((r) => r.json()),
        fetch("/api/mandiri/kelompok").then((r) => r.json()),
      ]);
      setDesaList(Array.isArray(d) ? d : []);
      setKelompokList(Array.isArray(k) ? k : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { 
    fetchAll(); 
    fetch("/api/profile").then(r => r.json()).then(d => setUserRole(d.role || ""));
  }, [fetchAll]);

  const handleAddDesa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDesa.nama.trim() || !newDesa.kota.trim()) return;
    setError("");
    const res = await fetch("/api/mandiri/desa", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newDesa),
    });
    if (!res.ok) { 
      const d = await res.json(); 
      Swal.fire({ icon: 'error', title: 'Gagal', text: d.error });
      setError(d.error); 
      return; 
    }
    Swal.fire({ icon: 'success', title: 'Berhasil', text: 'Daerah berhasil ditambahkan', timer: 1500, showConfirmButton: false });
    setNewDesa({ nama: "", kota: "Jakarta Barat" });
    fetchAll();
  };

  const handleDeleteDesa = async (id: number) => {
    const res = await Swal.fire({
      title: 'Hapus Daerah?',
      text: "Seluruh data desa di daerah ini akan ikut terhapus!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Ya, Hapus!',
      cancelButtonText: 'Batal'
    });
    
    if (res.isConfirmed) {
      await fetch(`/api/mandiri/desa?id=${id}`, { method: "DELETE" });
      Swal.fire({ icon: 'success', title: 'Terhapus!', text: 'Daerah berhasil dihapus.', timer: 1500, showConfirmButton: false });
      fetchAll();
    }
  };

  const handleAddKelompok = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKelompok.nama || !newKelompok.mandiriDesaId) return;
    setError("");
    const res = await fetch("/api/mandiri/kelompok", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nama: newKelompok.nama, mandiriDesaId: Number(newKelompok.mandiriDesaId) }),
    });
    if (!res.ok) { 
      const d = await res.json(); 
      Swal.fire({ icon: 'error', title: 'Gagal', text: d.error });
      setError(d.error); 
      return; 
    }
    Swal.fire({ icon: 'success', title: 'Berhasil', text: 'Desa berhasil ditambahkan', timer: 1500, showConfirmButton: false });
    setNewKelompok({ nama: "", mandiriDesaId: "" });
    fetchAll();
  };

  const handleDeleteKelompok = async (id: number) => {
    const res = await Swal.fire({
      title: 'Hapus Desa?',
      text: "Data desa ini akan terhapus dari sistem!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Ya, Hapus!',
      cancelButtonText: 'Batal'
    });
    
    if (res.isConfirmed) {
      await fetch(`/api/mandiri/kelompok?id=${id}`, { method: "DELETE" });
      Swal.fire({ icon: 'success', title: 'Terhapus!', text: 'Desa berhasil dihapus.', timer: 1500, showConfirmButton: false });
      fetchAll();
    }
  };

  return (
    <div>
      <Topbar title="Usia Mandiri/Nikah - Kelola Daerah / Desa & Kelompok" role={userRole} />
      <div className="page-content">
        <div className="page-header">
          <div className="page-header-left">
            <h2>Kelola Daerah / Desa</h2>
            <p>Wilayah khusus untuk kegiatan Usia Mandiri / Nikah</p>
          </div>
        </div>

        {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>}

        {loading ? (
          <div className="loading"><div className="spinner" /></div>
        ) : (
          <div className="responsive-grid-2">
            {/* Desa Mandiri */}
            <div className="card">
              <div className="card-header">
                <span className="card-title">Daftar Daerah</span>
                <span className="badge badge-blue">{desaList.length}</span>
              </div>
              <div className="card-body">
                <form onSubmit={handleAddDesa} style={{ marginBottom: 16 }}>
                  <div className="flex flex-col gap-2">
                    <input
                      className="form-control"
                      placeholder="Nama daerah..."
                      value={newDesa.nama}
                      onChange={(e) => setNewDesa(p => ({ ...p, nama: e.target.value }))}
                      required
                    />
                    <input
                      className="form-control"
                      placeholder="Kota..."
                      value={newDesa.kota}
                      onChange={(e) => setNewDesa(p => ({ ...p, kota: e.target.value }))}
                      required
                    />
                    <button type="submit" className="btn btn-primary btn-full">+ Tambah Daerah</button>
                  </div>
                </form>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {desaList.map((d) => (
                    <div key={d.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl">
                      <div>
                        <div style={{ fontWeight: 600 }}>{d.nama}</div>
                        <div className="text-xs text-muted">Kota: {d.kota}</div>
                      </div>
                      <button className="btn btn-sm btn-danger" onClick={() => handleDeleteDesa(d.id)}>Hapus</button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Kelompok Mandiri */}
            <div className="card">
              <div className="card-header">
                <span className="card-title">Daftar Desa</span>
                <span className="badge badge-green">{kelompokList.length}</span>
              </div>
              <div className="card-body">
                <form onSubmit={handleAddKelompok} style={{ marginBottom: 16 }}>
                  <div className="flex flex-col gap-2">
                    <input
                      className="form-control"
                      placeholder="Nama desa..."
                      value={newKelompok.nama}
                      onChange={(e) => setNewKelompok((p) => ({ ...p, nama: e.target.value }))}
                      required
                    />
                    <select
                      className="form-control"
                      value={newKelompok.mandiriDesaId}
                      onChange={(e) => setNewKelompok((p) => ({ ...p, mandiriDesaId: e.target.value }))}
                      required
                    >
                      <option value="">Pilih Daerah</option>
                      {desaList.map((d) => <option key={d.id} value={d.id}>{d.nama} ({d.kota})</option>)}
                    </select>
                    <button type="submit" className="btn btn-primary btn-full">+ Tambah Desa</button>
                  </div>
                </form>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {kelompokList.map((k) => (
                    <div key={k.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl">
                      <div>
                        <div style={{ fontWeight: 600 }}>{k.nama}</div>
                        <div className="text-xs text-muted">Daerah: {k.desaNama}</div>
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
