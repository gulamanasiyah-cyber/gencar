"use client";

import Topbar from "@/components/Topbar";
import { useState, useEffect, useCallback } from "react";
import Swal from "sweetalert2";
import { Plus, Trash2, ChevronDown, ChevronRight, MapPin, Map, Users, Info, ToggleLeft, ToggleRight, Link2 } from "lucide-react";

interface MandiriDaerahItem { id: number; nama: string; isActive?: number; }
interface MandiriDesaItem { id: number; nama: string; mandiriDaerahId: number; daerahNama: string | null; kota: string | null; }
interface MandiriKelompokItem { id: number; nama: string; mandiriDesaId: number; desaNama: string | null; }
interface KegiatanItem { id: string; judul: string; tanggal: string; }

export default function MandiriDesaTreePage() {
  const [daerahList, setDaerahList] = useState<MandiriDaerahItem[]>([]);
  const [desaList, setDesaList] = useState<MandiriDesaItem[]>([]);
  const [kelompokList, setKelompokList] = useState<MandiriKelompokItem[]>([]);
  const [kegiatanList, setKegiatanList] = useState<KegiatanItem[]>([]);
  const [selectedKegiatan, setSelectedKegiatan] = useState("");
  const [loading, setLoading] = useState(true);
  const [newDaerahName, setNewDaerahName] = useState("");
  const [error, setError] = useState("");
  const [userRole, setUserRole] = useState("");
  
  // Collapse/Expand state
  const [collapsedDaerahs, setCollapsedDaerahs] = useState<Record<number, boolean>>({});
  const [collapsedDesas, setCollapsedDesas] = useState<Record<number, boolean>>({});

  const fetchAll = useCallback(async (kegId?: string) => {
    setLoading(true);
    try {
      const activeKegId = kegId || selectedKegiatan;
      const daerahUrl = activeKegId ? `/api/mandiri/daerah?kegiatanId=${activeKegId}` : "/api/mandiri/daerah";
      const [da, de, ke] = await Promise.all([
        fetch(daerahUrl, { cache: 'no-store' }).then((r) => r.json()),
        fetch("/api/mandiri/desa", { cache: 'no-store' }).then((r) => r.json()),
        fetch("/api/mandiri/kelompok", { cache: 'no-store' }).then((r) => r.json()),
      ]);
      setDaerahList(Array.isArray(da) ? da : []);
      setDesaList(Array.isArray(de) ? de : []);
      setKelompokList(Array.isArray(ke) ? ke : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [selectedKegiatan]);

  useEffect(() => { 
    async function init() {
      try {
        const kegRes = await fetch("/api/mandiri/kegiatan", { cache: 'no-store' });
        const kegs = await kegRes.json();
        setKegiatanList(Array.isArray(kegs) ? kegs : []);

        const activeRes = await fetch("/api/public/mandiri/settings?key=mandiri_active_kegiatan_id", { cache: 'no-store' });
        const activeJson = await activeRes.json();
        const activeId = activeJson.value || (kegs.length > 0 ? kegs[0].id : "");
        setSelectedKegiatan(activeId);
        
        fetchAll(activeId);
      } catch (err) {
        console.error("Init error in MandiriDesaPage:", err);
        fetchAll();
      }
    }
    init();
    fetch("/api/profile", { cache: 'no-store' }).then(r => r.json()).then(d => setUserRole(d.role || ""));
  }, []);

  useEffect(() => {
    if (selectedKegiatan) {
      fetchAll(selectedKegiatan);
    }
  }, [selectedKegiatan]);

  const handleToggleDaerahActive = async (daerahId: number, currentActive: boolean) => {
    if (!selectedKegiatan) {
      Swal.fire({ icon: 'warning', title: 'Perhatian', text: 'Silakan pilih kegiatan terlebih dahulu' });
      return;
    }
    try {
      const res = await fetch("/api/mandiri/daerah", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: daerahId,
          kegiatanId: selectedKegiatan,
          isActive: !currentActive
        })
      });
      if (res.ok) {
        setDaerahList(prev => prev.map(d => d.id === daerahId ? { ...d, isActive: !currentActive ? 1 : 0 } : d));
        Swal.fire({
          icon: 'success',
          title: 'Status Diperbarui',
          text: `Daerah berhasil di-${!currentActive ? 'aktifkan' : 'nonaktifkan'} untuk kegiatan ini.`,
          timer: 1500,
          showConfirmButton: false,
          toast: true,
          position: 'top-end'
        });
      } else {
        const err = await res.json();
        Swal.fire({ icon: 'error', title: 'Gagal', text: err.error || "Gagal mengubah status aktif daerah" });
      }
    } catch (e) {
      console.error(e);
      Swal.fire({ icon: 'error', title: 'Error', text: "Terjadi kesalahan sistem" });
    }
  };

  const handleAddDaerah = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDaerahName.trim()) return;
    setError("");
    const res = await fetch("/api/mandiri/daerah", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nama: newDaerahName }),
    });
    if (!res.ok) { 
      const d = await res.json(); 
      Swal.fire({ icon: 'error', title: 'Gagal', text: d.error });
      setError(d.error); 
      return; 
    }
    Swal.fire({ icon: 'success', title: 'Berhasil', text: 'Daerah baru berhasil ditambahkan', timer: 1500, showConfirmButton: false });
    setNewDaerahName("");
    fetchAll();
  };

  const handleAddDesa = async (daerahId: number, daerahNama: string) => {
    const { value: desaNama } = await Swal.fire({
      title: 'Tambah Desa Baru',
      text: `Masukkan nama desa untuk daerah: ${daerahNama}`,
      input: 'text',
      inputPlaceholder: 'Nama desa...',
      showCancelButton: true,
      confirmButtonText: 'Tambah',
      cancelButtonText: 'Batal',
      inputValidator: (value) => {
        if (!value) {
          return 'Nama desa tidak boleh kosong!';
        }
      }
    });

    if (desaNama) {
      const res = await fetch("/api/mandiri/desa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nama: desaNama.trim(), mandiriDaerahId: daerahId }),
      });
      if (res.ok) {
        Swal.fire({ icon: 'success', title: 'Berhasil', text: 'Desa berhasil ditambahkan', timer: 1500, showConfirmButton: false });
        fetchAll();
      } else {
        const d = await res.json();
        Swal.fire({ icon: 'error', title: 'Gagal', text: d.error || 'Gagal menambahkan desa' });
      }
    }
  };

  const handleAddKelompok = async (desaId: number, desaNama: string) => {
    const { value: kelompokNama } = await Swal.fire({
      title: 'Tambah Kelompok Baru',
      text: `Masukkan nama kelompok untuk desa: ${desaNama}`,
      input: 'text',
      inputPlaceholder: 'Nama kelompok...',
      showCancelButton: true,
      confirmButtonText: 'Tambah',
      cancelButtonText: 'Batal',
      inputValidator: (value) => {
        if (!value) {
          return 'Nama kelompok tidak boleh kosong!';
        }
      }
    });

    if (kelompokNama) {
      const res = await fetch("/api/mandiri/kelompok", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nama: kelompokNama.trim(), mandiriDesaId: desaId }),
      });
      if (res.ok) {
        Swal.fire({ icon: 'success', title: 'Berhasil', text: 'Kelompok berhasil ditambahkan', timer: 1500, showConfirmButton: false });
        fetchAll();
      } else {
        const d = await res.json();
        Swal.fire({ icon: 'error', title: 'Gagal', text: d.error || 'Gagal menambahkan kelompok' });
      }
    }
  };

  const handleDeleteDaerah = async (id: number, name: string) => {
    const res = await Swal.fire({
      title: 'Hapus Daerah?',
      text: `Seluruh data desa dan kelompok di bawah "${name}" akan ikut terhapus permanen!`,
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

  const handleDeleteDesa = async (id: number, name: string) => {
    const res = await Swal.fire({
      title: 'Hapus Desa?',
      text: `Seluruh data kelompok di bawah "${name}" akan ikut terhapus!`,
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

  const handleDeleteKelompok = async (id: number, name: string) => {
    const res = await Swal.fire({
      title: 'Hapus Kelompok?',
      text: `Data kelompok "${name}" akan terhapus permanen!`,
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

  const handleShowAllLinks = () => {
    const url = `${typeof window !== 'undefined' ? window.location.origin : ''}/mandiri/daftar-wilayah`;
    Swal.fire({
      title: '<span style="font-size:17px;font-weight:800">🔗 Link Pendaftaran</span>',
      html: `
        <div style="text-align:left">
          <div style="display:flex;align-items:center;gap:8px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:10px 12px;margin-bottom:14px">
            <span style="font-size:12px;color:#1e293b;word-break:break-all;flex:1;font-family:monospace">${url}</span>
            <button id="swal-copy-umum" onclick="navigator.clipboard.writeText('${url}').then(()=>{var b=document.getElementById('swal-copy-umum');b.textContent='✓ Tersalin';b.style.background='#dcfce7';b.style.color='#16a34a';setTimeout(()=>{b.textContent='Salin';b.style.background='#eff6ff';b.style.color='#2563eb';},2000)})" style="border:none;background:#eff6ff;color:#2563eb;padding:5px 12px;border-radius:6px;cursor:pointer;font-size:12px;font-weight:700;white-space:nowrap;flex-shrink:0">Salin</button>
          </div>
          <div style="display:flex;justify-content:center;margin-bottom:8px">
            <img src="https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(url)}" alt="QR Code" style="border-radius:8px;border:1px solid #e2e8f0" onerror="this.style.display='none'" />
          </div>
          <p style="text-align:center;font-size:11px;color:#94a3b8;margin:0">Bagikan link atau scan QR code ini ke peserta</p>
        </div>
      `,
      showConfirmButton: false,
      showCloseButton: true,
      width: 420,
    });
  };

  // Toggle collapse handlers
  const toggleDaerahCollapse = (id: number) => {
    setCollapsedDaerahs(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleDesaCollapse = (id: number) => {
    setCollapsedDesas(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Build the hierarchical tree data
  const treeData = daerahList.map(daerah => {
    const desas = desaList
      .filter(desa => desa.mandiriDaerahId === daerah.id)
      .map(desa => {
        const kelompoks = kelompokList.filter(kel => kel.mandiriDesaId === desa.id);
        return { ...desa, kelompoks };
      });
    return { ...daerah, desas };
  });

  return (
    <div>
      <Topbar title="Usia Mandiri/Nikah - Kelola Wilayah" role={userRole} />
      <div className="page-content" style={{ maxWidth: "1400px", margin: "0 auto", padding: "24px" }}>
        
        <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px", marginBottom: "28px" }}>
          <div className="page-header-left">
            <h2 style={{ fontSize: "24px", fontWeight: 700, color: "#0f172a", marginBottom: "6px" }}>Kelola Wilayah & Kelompok (Tree View)</h2>
            <p style={{ color: "#64748b", fontSize: "14px" }}>Kelola daerah rujukan, desa, dan kelompok peserta dalam satu peta hirarki struktur</p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", background: "#f8fafc", padding: "10px 14px", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
              <span style={{ fontSize: "14px", fontWeight: 600, color: "#475569" }}>Filter Kegiatan:</span>
              <select
                value={selectedKegiatan}
                onChange={(e) => setSelectedKegiatan(e.target.value)}
                style={{
                  padding: "8px 12px",
                  borderRadius: "8px",
                  border: "1px solid #cbd5e1",
                  fontSize: "14px",
                  fontWeight: 500,
                  color: "#1e293b",
                  backgroundColor: "#fff",
                  outline: "none",
                  minWidth: "220px",
                  cursor: "pointer"
                }}
              >
                <option value="">Pilih Kegiatan</option>
                {kegiatanList.map(k => (
                  <option key={k.id} value={k.id}>{k.judul}</option>
                ))}
              </select>
            </div>
            <button
              onClick={handleShowAllLinks}
              style={{
                display: "flex", alignItems: "center", gap: "6px",
                padding: "10px 16px", borderRadius: "12px",
                border: "1px solid #e2e8f0", background: "#fff",
                color: "#475569", fontSize: "14px", fontWeight: 600,
                cursor: "pointer", transition: "all 0.2s",
                boxShadow: "0 1px 3px rgba(0,0,0,0.06)"
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = '#6366f1'; e.currentTarget.style.color = '#6366f1'; }}
              onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.color = '#475569'; }}
            >
              <Link2 size={15} /> Link Pendaftaran
            </button>
          </div>
        </div>

        {error && (
          <div className="alert alert-error" style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px", padding: "12px 16px", borderRadius: "10px" }}>
            <Info size={18} />
            <span>{error}</span>
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 2.5fr", gap: "24px", alignItems: "start" }}>
          
          {/* Left Panel: Form Tambah Daerah */}
          <div className="card" style={{ padding: "24px", borderRadius: "16px", border: "1px solid #e2e8f0", background: "#fff", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.05)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
              <div style={{ background: "#eff6ff", color: "#2563eb", padding: "10px", borderRadius: "10px" }}>
                <MapPin size={20} />
              </div>
              <h3 style={{ fontSize: "17px", fontWeight: 700, color: "#0f172a", margin: 0 }}>Tambah Daerah Rujukan</h3>
            </div>
            
            <form onSubmit={handleAddDaerah}>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <div>
                  <label style={{ fontSize: "13px", fontWeight: 600, color: "#475569", marginBottom: "6px", display: "block" }}>Nama Daerah</label>
                  <input
                    className="form-control"
                    placeholder="Nama daerah rujukan baru (misal: Cengkareng)..."
                    value={newDaerahName}
                    onChange={(e) => setNewDaerahName(e.target.value)}
                    required
                    style={{ borderRadius: "8px", padding: "10px 12px", width: "100%" }}
                  />
                </div>
                <button type="submit" className="btn btn-primary btn-full" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", borderRadius: "8px", padding: "12px", fontSize: "14px", fontWeight: 600 }}>
                  <Plus size={16} /> Tambah Daerah
                </button>
              </div>
            </form>
          </div>

          {/* Right Panel: Tree View Map */}
          <div className="card" style={{ padding: "24px", borderRadius: "16px", border: "1px solid #e2e8f0", background: "#fff", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.05)", minHeight: "500px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: "16px", borderBottom: "1px solid #f1f5f9", marginBottom: "20px" }}>
              <h3 style={{ fontSize: "18px", fontWeight: 700, color: "#0f172a", margin: 0 }}>Peta Hirarki Wilayah</h3>
              <div style={{ display: "flex", gap: "12px", fontSize: "12.5px", color: "#64748b" }}>
                <span>Daerah: <b>{daerahList.length}</b></span>
                <span>Desa: <b>{desaList.length}</b></span>
                <span>Kelompok: <b>{kelompokList.length}</b></span>
              </div>
            </div>

            {loading ? (
              <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "300px" }}>
                <div className="spinner" />
              </div>
            ) : treeData.length === 0 ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "300px", color: "#94a3b8" }}>
                <Info size={36} style={{ marginBottom: "12px", color: "#cbd5e1" }} />
                <span style={{ fontSize: "14px" }}>Belum ada data struktur wilayah.</span>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {treeData.map(daerah => {
                  const isDaerahCollapsed = !!collapsedDaerahs[daerah.id];
                  
                  return (
                    <div 
                      key={daerah.id} 
                      style={{ 
                        borderRadius: "12px", 
                        border: "1px solid #f1f5f9", 
                        background: "#fafafa",
                        overflow: "hidden"
                      }}
                    >
                      {/* Daerah Node */}
                      <div 
                        style={{ 
                          display: "flex", 
                          justifyContent: "space-between", 
                          alignItems: "center", 
                          padding: "12px 16px",
                          background: "#fff",
                          borderBottom: isDaerahCollapsed ? "none" : "1px solid #f1f5f9",
                        }}
                      >
                        <div 
                          onClick={() => toggleDaerahCollapse(daerah.id)}
                          style={{ 
                            display: "flex", 
                            alignItems: "center", 
                            gap: "8px", 
                            cursor: "pointer",
                            userSelect: "none"
                          }}
                        >
                          {isDaerahCollapsed ? <ChevronRight size={18} color="#64748b" /> : <ChevronDown size={18} color="#64748b" />}
                          <MapPin size={16} className="text-blue-500" />
                          <span style={{ fontWeight: 700, color: "#1e293b", fontSize: "15px" }}>{daerah.nama}</span>
                          <span style={{ fontSize: "11px", color: "#94a3b8", background: "#f1f5f9", padding: "2px 6px", borderRadius: "10px" }}>
                            {daerah.desas.length} Desa
                          </span>
                        </div>
                        
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          {/* Toggle Active Button */}
                          <button
                            onClick={() => handleToggleDaerahActive(daerah.id, daerah.isActive !== 0)}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "4px",
                              padding: "4px 8px",
                              borderRadius: "6px",
                              fontSize: "11.5px",
                              fontWeight: 600,
                              border: "none",
                              cursor: "pointer",
                              backgroundColor: daerah.isActive !== 0 ? "#dcfce7" : "#fee2e2",
                              color: daerah.isActive !== 0 ? "#166534" : "#991b1b",
                              transition: "all 0.2s"
                            }}
                            title={`Toggle keaktifan daerah untuk kegiatan ini`}
                          >
                            {daerah.isActive !== 0 ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                            {daerah.isActive !== 0 ? "Aktif" : "Non-Aktif"}
                          </button>

                          {/* Add Desa Button */}
                          <button
                            onClick={() => handleAddDesa(daerah.id, daerah.nama)}
                            style={{
                              padding: "4px 8px",
                              borderRadius: "6px",
                              fontSize: "11.5px",
                              fontWeight: 600,
                              background: "#eff6ff",
                              color: "#2563eb",
                              border: "none",
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              gap: "4px"
                            }}
                          >
                            <Plus size={12} /> Desa
                          </button>

                          {/* Delete Button */}
                          <button
                            onClick={() => handleDeleteDaerah(daerah.id, daerah.nama)}
                            style={{
                              padding: "6px",
                              background: "transparent",
                              color: "#ef4444",
                              border: "none",
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              borderRadius: "6px"
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = '#fef2f2'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>

                      {/* Desas List (Child of Daerah) */}
                      {!isDaerahCollapsed && (
                        <div style={{ padding: "8px 16px 12px 28px", display: "flex", flexDirection: "column", gap: "10px" }}>
                          {daerah.desas.length === 0 ? (
                            <div style={{ fontSize: "13px", color: "#94a3b8", padding: "4px 8px" }}>Belum ada data desa di daerah ini.</div>
                          ) : (
                            daerah.desas.map(desa => {
                              const isDesaCollapsed = !!collapsedDesas[desa.id];
                              
                              return (
                                <div 
                                  key={desa.id} 
                                  style={{ 
                                    background: "#fff", 
                                    borderRadius: "10px", 
                                    border: "1px solid #f1f5f9"
                                  }}
                                >
                                  {/* Desa Node */}
                                  <div 
                                    style={{ 
                                      display: "flex", 
                                      justifyContent: "space-between", 
                                      alignItems: "center", 
                                      padding: "10px 14px",
                                      borderBottom: isDesaCollapsed ? "none" : "1px solid #f1f5f9"
                                    }}
                                  >
                                    <div 
                                      onClick={() => toggleDesaCollapse(desa.id)}
                                      style={{ 
                                        display: "flex", 
                                        alignItems: "center", 
                                        gap: "6px", 
                                        cursor: "pointer",
                                        userSelect: "none"
                                      }}
                                    >
                                      {isDesaCollapsed ? <ChevronRight size={16} color="#64748b" /> : <ChevronDown size={16} color="#64748b" />}
                                      <Map size={14} className="text-purple-500" />
                                      <span style={{ fontWeight: 600, color: "#334155", fontSize: "14px" }}>{desa.nama}</span>
                                      <span style={{ fontSize: "10.5px", color: "#94a3b8", background: "#f8fafc", padding: "1px 5px", borderRadius: "8px" }}>
                                        {desa.kelompoks.length} Kelompok
                                      </span>
                                    </div>

                                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                      {/* Add Kelompok Button */}
                                      <button
                                        onClick={() => handleAddKelompok(desa.id, desa.nama)}
                                        style={{
                                          padding: "3px 6px",
                                          borderRadius: "5px",
                                          fontSize: "11px",
                                          fontWeight: 600,
                                          background: "#faf5ff",
                                          color: "#7e22ce",
                                          border: "none",
                                          cursor: "pointer",
                                          display: "flex",
                                          alignItems: "center",
                                          gap: "3px"
                                        }}
                                      >
                                        <Plus size={10} /> Kelompok
                                      </button>

                                      {/* Delete Button */}
                                      <button
                                        onClick={() => handleDeleteDesa(desa.id, desa.nama)}
                                        style={{
                                          padding: "5px",
                                          background: "transparent",
                                          color: "#ef4444",
                                          border: "none",
                                          cursor: "pointer",
                                          display: "flex",
                                          alignItems: "center",
                                          borderRadius: "5px"
                                        }}
                                        onMouseEnter={e => e.currentTarget.style.background = '#fef2f2'}
                                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                      >
                                        <Trash2 size={14} />
                                      </button>
                                    </div>
                                  </div>

                                  {/* Kelompoks List (Child of Desa) */}
                                  {!isDesaCollapsed && (
                                    <div style={{ padding: "8px 12px 10px 24px", display: "flex", flexDirection: "column", gap: "6px", background: "#fafafa", borderBottomLeftRadius: "10px", borderBottomRightRadius: "10px" }}>
                                      {desa.kelompoks.length === 0 ? (
                                        <div style={{ fontSize: "12.5px", color: "#94a3b8", padding: "2px 6px" }}>Belum ada data kelompok di desa ini.</div>
                                      ) : (
                                        desa.kelompoks.map(kelompok => (
                                          <div 
                                            key={kelompok.id} 
                                            style={{ 
                                              display: "flex", 
                                              justifyContent: "space-between", 
                                              alignItems: "center", 
                                              padding: "6px 10px",
                                              background: "#fff",
                                              borderRadius: "6px",
                                              border: "1px solid #f1f5f9"
                                            }}
                                          >
                                            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                              <Users size={12} className="text-green-500" />
                                              <span style={{ fontSize: "13.5px", color: "#475569", fontWeight: 500 }}>{kelompok.nama}</span>
                                            </div>

                                            <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                                              {/* Delete Button */}
                                              <button
                                                onClick={() => handleDeleteKelompok(kelompok.id, kelompok.nama)}
                                                style={{ padding: "4px", background: "transparent", color: "#ef4444", border: "none", cursor: "pointer", display: "flex", alignItems: "center", borderRadius: "4px" }}
                                                onMouseEnter={e => e.currentTarget.style.background = '#fef2f2'}
                                                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                              >
                                                <Trash2 size={13} />
                                              </button>
                                            </div>
                                          </div>
                                        ))
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            })
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
