"use client";

import Topbar from "@/components/Topbar";
import { useState, useEffect, useCallback } from "react";
import Swal from "sweetalert2";
import { Plus, Trash2, MapPin, Map, Users, Info } from "lucide-react";

interface MandiriDaerahItem { id: number; nama: string; }
interface MandiriDesaItem { id: number; nama: string; mandiriDaerahId: number; daerahNama: string | null; kota: string | null; }
interface MandiriKelompokItem { id: number; nama: string; mandiriDesaId: number; desaNama: string | null; }

export default function MandiriDesaPage() {
  const [daerahList, setDaerahList] = useState<MandiriDaerahItem[]>([]);
  const [desaList, setDesaList] = useState<MandiriDesaItem[]>([]);
  const [kelompokList, setKelompokList] = useState<MandiriKelompokItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [newDaerah, setNewDaerah] = useState({ nama: "" });
  const [newDesa, setNewDesa] = useState({ nama: "", mandiriDaerahId: "" });
  const [newKelompok, setNewKelompok] = useState({ nama: "", mandiriDesaId: "" });
  const [error, setError] = useState("");
  const [userRole, setUserRole] = useState("");

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [da, de, ke] = await Promise.all([
        fetch("/api/mandiri/daerah").then((r) => r.json()),
        fetch("/api/mandiri/desa").then((r) => r.json()),
        fetch("/api/mandiri/kelompok").then((r) => r.json()),
      ]);
      setDaerahList(Array.isArray(da) ? da : []);
      setDesaList(Array.isArray(de) ? de : []);
      setKelompokList(Array.isArray(ke) ? ke : []);
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

  const handleAddDaerah = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDaerah.nama.trim()) return;
    setError("");
    const res = await fetch("/api/mandiri/daerah", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newDaerah),
    });
    if (!res.ok) { 
      const d = await res.json(); 
      Swal.fire({ icon: 'error', title: 'Gagal', text: d.error });
      setError(d.error); 
      return; 
    }
    Swal.fire({ icon: 'success', title: 'Berhasil', text: 'Daerah berhasil ditambahkan', timer: 1500, showConfirmButton: false });
    setNewDaerah({ nama: "" });
    fetchAll();
  };

  const handleDeleteDaerah = async (id: number) => {
    const res = await Swal.fire({
      title: 'Hapus Daerah?',
      text: "Seluruh data desa dan kelompok di daerah ini akan ikut terhapus!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Ya, Hapus!',
      cancelButtonText: 'Batal'
    });
    
    if (res.isConfirmed) {
      await fetch(`/api/mandiri/daerah?id=${id}`, { method: "DELETE" });
      Swal.fire({ icon: 'success', title: 'Terhapus!', text: 'Daerah berhasil dihapus.', timer: 1500, showConfirmButton: false });
      fetchAll();
    }
  };

  const handleAddDesa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDesa.nama.trim() || !newDesa.mandiriDaerahId) return;
    setError("");
    const res = await fetch("/api/mandiri/desa", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nama: newDesa.nama, mandiriDaerahId: Number(newDesa.mandiriDaerahId) }),
    });
    if (!res.ok) { 
      const d = await res.json(); 
      Swal.fire({ icon: 'error', title: 'Gagal', text: d.error });
      setError(d.error); 
      return; 
    }
    Swal.fire({ icon: 'success', title: 'Berhasil', text: 'Desa berhasil ditambahkan', timer: 1500, showConfirmButton: false });
    setNewDesa({ nama: "", mandiriDaerahId: "" });
    fetchAll();
  };

  const handleDeleteDesa = async (id: number) => {
    const res = await Swal.fire({
      title: 'Hapus Desa?',
      text: "Seluruh data kelompok di desa ini akan ikut terhapus!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Ya, Hapus!',
      cancelButtonText: 'Batal'
    });
    
    if (res.isConfirmed) {
      await fetch(`/api/mandiri/desa?id=${id}`, { method: "DELETE" });
      Swal.fire({ icon: 'success', title: 'Terhapus!', text: 'Desa berhasil dihapus.', timer: 1500, showConfirmButton: false });
      fetchAll();
    }
  };

  const handleAddKelompok = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKelompok.nama.trim() || !newKelompok.mandiriDesaId) return;
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
    Swal.fire({ icon: 'success', title: 'Berhasil', text: 'Kelompok berhasil ditambahkan', timer: 1500, showConfirmButton: false });
    setNewKelompok({ nama: "", mandiriDesaId: "" });
    fetchAll();
  };

  const handleDeleteKelompok = async (id: number) => {
    const res = await Swal.fire({
      title: 'Hapus Kelompok?',
      text: "Data kelompok ini akan terhapus dari sistem!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Ya, Hapus!',
      cancelButtonText: 'Batal'
    });
    
    if (res.isConfirmed) {
      await fetch(`/api/mandiri/kelompok?id=${id}`, { method: "DELETE" });
      Swal.fire({ icon: 'success', title: 'Terhapus!', text: 'Kelompok berhasil dihapus.', timer: 1500, showConfirmButton: false });
      fetchAll();
    }
  };

  return (
    <div>
      <Topbar title="Usia Mandiri/Nikah - Kelola Wilayah" role={userRole} />
      <div className="page-content" style={{ maxWidth: "1400px", margin: "0 auto", padding: "24px" }}>
        <div className="page-header" style={{ marginBottom: "28px" }}>
          <div className="page-header-left">
            <h2 style={{ fontSize: "24px", fontWeight: 700, color: "#0f172a", marginBottom: "6px" }}>Kelola Daerah, Desa & Kelompok</h2>
            <p style={{ color: "#64748b", fontSize: "14px" }}>Kelola struktur wilayah administratif khusus untuk kepesertaan Usia Mandiri / Nikah</p>
          </div>
        </div>

        {error && (
          <div className="alert alert-error" style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px", padding: "12px 16px", borderRadius: "10px" }}>
            <Info size={18} />
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div className="loading" style={{ display: "flex", justifyContent: "center", padding: "60px 0" }}>
            <div className="spinner" />
          </div>
        ) : (
          <div className="responsive-grid-3" style={{ gap: "24px" }}>
            
            {/* Column 1: Daerah */}
            <div className="card" style={{ display: "flex", flexDirection: "column", borderRadius: "16px", overflow: "hidden", border: "1px solid #e2e8f0", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.05)" }}>
              <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", background: "linear-gradient(to right, #f8fafc, #f1f5f9)", borderBottom: "1px solid #e2e8f0" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <MapPin size={18} className="text-blue-500" />
                  <span className="card-title" style={{ fontWeight: 600, color: "#1e293b", fontSize: "16px" }}>Daftar Daerah</span>
                </div>
                <span className="badge badge-blue" style={{ fontSize: "12px", padding: "4px 8px" }}>{daerahList.length}</span>
              </div>
              <div className="card-body" style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "16px", flexGrow: 1 }}>
                <form onSubmit={handleAddDaerah}>
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    <input
                      className="form-control"
                      placeholder="Input nama daerah baru..."
                      value={newDaerah.nama}
                      onChange={(e) => setNewDaerah({ nama: e.target.value })}
                      required
                      style={{ borderRadius: "8px", padding: "10px 12px" }}
                    />
                    <button type="submit" className="btn btn-primary btn-full" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", borderRadius: "8px", padding: "10px" }}>
                      <Plus size={16} /> Tambah Daerah
                    </button>
                  </div>
                </form>
                
                <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "450px", overflowY: "auto", paddingRight: "4px" }}>
                  {daerahList.length === 0 ? (
                    <div style={{ textAlign: "center", color: "#94a3b8", padding: "30px 0", fontSize: "14px" }}>Belum ada data daerah</div>
                  ) : (
                    daerahList.map((d) => (
                      <div key={d.id} className="flex justify-between items-center p-3 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-100 transition-all">
                        <span style={{ fontWeight: 550, color: "#334155", fontSize: "14px" }}>{d.nama}</span>
                        <button 
                          className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded-lg transition-colors border-0 bg-transparent cursor-pointer"
                          onClick={() => handleDeleteDaerah(d.id)}
                          title="Hapus Daerah"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Column 2: Desa */}
            <div className="card" style={{ display: "flex", flexDirection: "column", borderRadius: "16px", overflow: "hidden", border: "1px solid #e2e8f0", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.05)" }}>
              <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", background: "linear-gradient(to right, #f8fafc, #f1f5f9)", borderBottom: "1px solid #e2e8f0" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <Map size={18} className="text-purple-500" />
                  <span className="card-title" style={{ fontWeight: 600, color: "#1e293b", fontSize: "16px" }}>Daftar Desa</span>
                </div>
                <span className="badge badge-purple" style={{ fontSize: "12px", padding: "4px 8px" }}>{desaList.length}</span>
              </div>
              <div className="card-body" style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "16px", flexGrow: 1 }}>
                <form onSubmit={handleAddDesa}>
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    <input
                      className="form-control"
                      placeholder="Input nama desa baru..."
                      value={newDesa.nama}
                      onChange={(e) => setNewDesa(p => ({ ...p, nama: e.target.value }))}
                      required
                      style={{ borderRadius: "8px", padding: "10px 12px" }}
                    />
                    <select
                      className="form-control"
                      value={newDesa.mandiriDaerahId}
                      onChange={(e) => setNewDesa(p => ({ ...p, mandiriDaerahId: e.target.value }))}
                      required
                      style={{ borderRadius: "8px", padding: "10px 12px" }}
                    >
                      <option value="">Pilih Daerah Rujukan</option>
                      {daerahList.map((d) => <option key={d.id} value={d.id}>{d.nama}</option>)}
                    </select>
                    <button type="submit" className="btn btn-primary btn-full" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", borderRadius: "8px", padding: "10px" }}>
                      <Plus size={16} /> Tambah Desa
                    </button>
                  </div>
                </form>
                
                <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "450px", overflowY: "auto", paddingRight: "4px" }}>
                  {desaList.length === 0 ? (
                    <div style={{ textAlign: "center", color: "#94a3b8", padding: "30px 0", fontSize: "14px" }}>Belum ada data desa</div>
                  ) : (
                    desaList.map((d) => (
                      <div key={d.id} className="flex justify-between items-center p-3 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-100 transition-all">
                        <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                          <span style={{ fontWeight: 550, color: "#334155", fontSize: "14px" }}>{d.nama}</span>
                          <span style={{ fontSize: "11px", color: "#64748b", fontWeight: 500 }}>Daerah: {d.daerahNama || d.kota || "-"}</span>
                        </div>
                        <button 
                          className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded-lg transition-colors border-0 bg-transparent cursor-pointer"
                          onClick={() => handleDeleteDesa(d.id)}
                          title="Hapus Desa"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Column 3: Kelompok */}
            <div className="card" style={{ display: "flex", flexDirection: "column", borderRadius: "16px", overflow: "hidden", border: "1px solid #e2e8f0", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.05)" }}>
              <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", background: "linear-gradient(to right, #f8fafc, #f1f5f9)", borderBottom: "1px solid #e2e8f0" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <Users size={18} className="text-green-500" />
                  <span className="card-title" style={{ fontWeight: 600, color: "#1e293b", fontSize: "16px" }}>Daftar Kelompok</span>
                </div>
                <span className="badge badge-green" style={{ fontSize: "12px", padding: "4px 8px" }}>{kelompokList.length}</span>
              </div>
              <div className="card-body" style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "16px", flexGrow: 1 }}>
                <form onSubmit={handleAddKelompok}>
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    <input
                      className="form-control"
                      placeholder="Input nama kelompok baru..."
                      value={newKelompok.nama}
                      onChange={(e) => setNewKelompok((p) => ({ ...p, nama: e.target.value }))}
                      required
                      style={{ borderRadius: "8px", padding: "10px 12px" }}
                    />
                    <select
                      className="form-control"
                      value={newKelompok.mandiriDesaId}
                      onChange={(e) => setNewKelompok((p) => ({ ...p, mandiriDesaId: e.target.value }))}
                      required
                      style={{ borderRadius: "8px", padding: "10px 12px" }}
                    >
                      <option value="">Pilih Desa Rujukan</option>
                      {desaList.map((d) => <option key={d.id} value={d.id}>{d.nama} ({d.daerahNama || d.kota || "-"})</option>)}
                    </select>
                    <button type="submit" className="btn btn-primary btn-full" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", borderRadius: "8px", padding: "10px" }}>
                      <Plus size={16} /> Tambah Kelompok
                    </button>
                  </div>
                </form>
                
                <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "450px", overflowY: "auto", paddingRight: "4px" }}>
                  {kelompokList.length === 0 ? (
                    <div style={{ textAlign: "center", color: "#94a3b8", padding: "30px 0", fontSize: "14px" }}>Belum ada data kelompok</div>
                  ) : (
                    kelompokList.map((k) => (
                      <div key={k.id} className="flex justify-between items-center p-3 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-100 transition-all">
                        <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                          <span style={{ fontWeight: 550, color: "#334155", fontSize: "14px" }}>{k.nama}</span>
                          <span style={{ fontSize: "11px", color: "#64748b", fontWeight: 500 }}>Desa: {k.desaNama}</span>
                        </div>
                        <button 
                          className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded-lg transition-colors border-0 bg-transparent cursor-pointer"
                          onClick={() => handleDeleteKelompok(k.id)}
                          title="Hapus Kelompok"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
