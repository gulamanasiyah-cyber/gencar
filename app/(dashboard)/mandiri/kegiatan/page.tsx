"use client";

import Topbar from "@/components/Topbar";

import { useState, useEffect, useCallback } from "react";
import Swal from "sweetalert2";

interface MandiriKegiatanItem {
  id: string;
  judul: string;
  deskripsi: string | null;
  tanggal: string;
  lokasi: string | null;
  kota: string;
  desaNama: string | null;
  kelompokNama: string | null;
  desaId: number | null;
  kelompokId: number | null;
  createdAt: string | null;
}

interface Desa { id: number; nama: string; }
interface Kelompok { id: number; nama: string; mandiriDesaId: number; }

export default function MandiriKegiatanPage() {
  const [data, setData] = useState<MandiriKegiatanItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<MandiriKegiatanItem | null>(null);
  const [userRole, setUserRole] = useState("");
  const [activeKegiatanId, setActiveKegiatanId] = useState("");

  const fetchActiveKegiatan = async () => {
    try {
      const res = await fetch("/api/mandiri/settings?key=mandiri_active_kegiatan_id");
      const json = await res.json();
      setActiveKegiatanId(json.value || "");
    } catch (e) {
      console.error(e);
    }
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/mandiri/kegiatan");
      const json = await res.json();
      setData(Array.isArray(json) ? json : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { 
    fetchData(); 
    fetchActiveKegiatan();
    fetch("/api/profile").then(r => r.json()).then(d => setUserRole(d.role || ""));
  }, [fetchData]);

  const setActiveKegiatan = async (id: string) => {
    try {
      await fetch("/api/mandiri/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "mandiri_active_kegiatan_id", value: id }),
      });
      setActiveKegiatanId(id);
      Swal.fire({
        icon: 'success',
        title: 'Berhasil',
        text: 'Kegiatan aktif berhasil diubah!',
        timer: 1500,
        showConfirmButton: false
      });
    } catch {
      Swal.fire("Error", "Gagal mengubah kegiatan aktif", "error");
    }
  };

  const handleDelete = async (id: string) => {
    const res = await Swal.fire({
      title: 'Hapus Kegiatan?',
      text: "Data yang dihapus tidak dapat dikembalikan!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Ya, Hapus!',
      cancelButtonText: 'Batal'
    });
    
    if (res.isConfirmed) {
      await fetch(`/api/mandiri/kegiatan/${id}`, { method: "DELETE" });
      Swal.fire({
        icon: 'success',
        title: 'Terhapus!',
        text: 'Kegiatan berhasil dihapus.',
        timer: 1500,
        showConfirmButton: false
      });
      fetchData();
    }
  };

  const formatDate = (d: string) => {
    return new Date(d).toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  };

  return (
    <div>
      <Topbar title="Kegiatan Usia Mandiri/Nikah" role={userRole} />
      <div className="page-content">
        <div className="page-header">
          <div className="page-header-left">
            <h2>Manajemen Kegiatan Mandiri</h2>
            <p>Kelola kegiatan untuk peserta usia mandiri / nikah</p>
          </div>
          <button className="btn btn-primary" onClick={() => { setEditItem(null); setShowModal(true); }}>
            + Tambah Kegiatan Baru
          </button>
        </div>

        {/* Active Kegiatan Selector Card */}
        <div className="card" style={{ marginBottom: "20px", padding: "20px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "15px" }}>
            <div>
              <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "#1e293b" }}>Kegiatan Aktif Saat Ini</h3>
              <p style={{ margin: "4px 0 0 0", fontSize: "13px", color: "#64748b" }}>Pilih kegiatan yang sedang berlangsung untuk absensi dan katalog publik</p>
            </div>
            <div style={{ minWidth: "250px" }}>
              <select
                className="form-control"
                value={activeKegiatanId}
                onChange={(e) => setActiveKegiatan(e.target.value)}
                style={{ fontWeight: 600 }}
              >
                <option value="">-- Pilih Kegiatan Aktif --</option>
                {data.map(item => (
                  <option key={item.id} value={item.id}>
                    {item.judul} ({item.kota})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="card">
          {loading ? (
            <div className="loading"><div className="spinner" /></div>
          ) : data.length === 0 ? (
            <div className="empty-state">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              <h3>Belum ada kegiatan</h3>
              <p>Klik &quot;Tambah Kegiatan Baru&quot; untuk membuat kegiatan baru</p>
            </div>
          ) : (
            <div className="table-wrapper">
              <table className="responsive-table">
                <thead>
                  <tr>
                    <th style={{ width: 100 }}>Status</th>
                    <th>Kegiatan</th>
                    <th>Kota</th>
                    <th>Tanggal</th>
                    <th>Lokasi</th>
                    <th>Desa/Kelompok</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((item) => {
                    const isActive = item.id === activeKegiatanId;
                    return (
                      <tr key={item.id} style={isActive ? { background: "#f0fdf4", borderLeft: "3px solid #22c55e" } : undefined}>
                        <td data-label="Status">
                          {isActive ? (
                            <span className="badge badge-green" style={{ fontSize: 11, padding: "4px 8px", borderRadius: 6, fontWeight: 700, background: "#dcfce7", color: "#15803d", display: "inline-block" }}>Aktif</span>
                          ) : (
                            <button
                              className="btn btn-sm btn-outline"
                              style={{ fontSize: 11, padding: "2px 8px" }}
                              onClick={() => setActiveKegiatan(item.id)}
                            >
                              Set Aktif
                            </button>
                          )}
                        </td>
                        <td data-label="Kegiatan">
                          <div style={{ fontWeight: 500 }}>{item.judul}</div>
                          {item.deskripsi && (
                            <div className="text-sm text-muted" style={{ marginTop: 2, maxWidth: 280, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {item.deskripsi}
                            </div>
                          )}
                        </td>
                        <td data-label="Kota">{item.kota}</td>
                        <td data-label="Tanggal" style={{ whiteSpace: "nowrap" }}>
                          {formatDate(item.tanggal)}
                        </td>
                        <td data-label="Lokasi">{item.lokasi || "-"}</td>
                        <td data-label="Desa/Kelompok">
                          {item.kelompokNama && <div className="text-sm">{item.kelompokNama}</div>}
                          {item.desaNama && <div className="text-sm text-muted">{item.desaNama}</div>}
                          {!item.desaNama && "-"}
                        </td>
                        <td data-label="Aksi">
                          <div className="flex gap-2">
                            <button className="btn btn-sm btn-secondary" onClick={() => { setEditItem(item); setShowModal(true); }}>Edit</button>
                            <button className="btn btn-sm btn-danger" onClick={() => handleDelete(item.id)}>Hapus</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <MandiriKegiatanModal
          item={editItem}
          onClose={() => { setShowModal(false); setEditItem(null); }}
          onSaved={() => {
            setShowModal(false);
            setEditItem(null);
            fetchData();
          }}
        />
      )}
    </div>
  );
}

function MandiriKegiatanModal({ item, onClose, onSaved }: {
  item: MandiriKegiatanItem | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!item?.id;

  const [form, setForm] = useState({
    judul: item?.judul || "",
    deskripsi: item?.deskripsi || "",
    tanggal: item?.tanggal || "",
    lokasi: item?.lokasi || "",
    kota: item?.kota || "Jakarta Barat",
    desaId: item?.desaId ? String(item.desaId) : "",
    kelompokId: item?.kelompokId ? String(item.kelompokId) : "",
  });

  const [desas, setDesas] = useState<Desa[]>([]);
  const [kelompoks, setKelompoks] = useState<Kelompok[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    // Fetch Desas and Kelompoks for dropdown from MANDIRI APIs
    fetch("/api/mandiri/desa").then(r => r.json()).then(d => setDesas(Array.isArray(d) ? d : []));
    fetch("/api/mandiri/kelompok").then(r => r.json()).then(d => setKelompoks(Array.isArray(d) ? d : []));
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm((prev) => {
      const next = { ...prev, [name]: value };
      if (name === "desaId") next.kelompokId = ""; // Reset kelompok when desa changes
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const url = item ? `/api/mandiri/kegiatan/${item.id}` : "/api/mandiri/kegiatan";
      const method = item ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          desaId: form.desaId || null,
          kelompokId: form.kelompokId || null,
        }),
      });
      const resJson = await res.json();
      if (!res.ok) { 
        Swal.fire("Gagal", resJson.error || "Gagal menyimpan", "error");
        setError(resJson.error || "Gagal menyimpan"); 
        return; 
      }
      
      Swal.fire({ icon: 'success', title: 'Berhasil', text: 'Data berhasil disimpan!', timer: 1500, showConfirmButton: false });
      onSaved();
    } catch {
      Swal.fire("Error", "Terjadi kesalahan jaringan", "error");
      setError("Terjadi kesalahan jaringan");
    } finally {
      setLoading(false);
    }
  };

  const filteredKelompoks = kelompoks.filter(k => !form.desaId || k.mandiriDesaId === Number(form.desaId));

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 600 }}>
        <div className="modal-header">
          <span className="modal-title">{isEdit ? "Edit Kegiatan" : "Tambah Kegiatan Baru"}</span>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && <div className="alert alert-error">{error}</div>}
            
            <div className="form-group">
              <label className="form-label">Judul Kegiatan <span className="required">*</span></label>
              <input name="judul" className="form-control" value={form.judul} onChange={handleChange} required placeholder="Nama kegiatan" />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Kota <span className="required">*</span></label>
                <input name="kota" className="form-control" value={form.kota} onChange={handleChange} required placeholder="Contoh: Jakarta Barat" />
              </div>
              <div className="form-group">
                <label className="form-label">Tanggal <span className="required">*</span></label>
                <input name="tanggal" type="date" className="form-control" value={form.tanggal} onChange={handleChange} required />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Desa (Optional)</label>
                <select name="desaId" className="form-control" value={form.desaId} onChange={handleChange}>
                  <option value="">-- Semua Desa --</option>
                  {desas.map(d => <option key={d.id} value={d.id}>{d.nama}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Kelompok (Optional)</label>
                <select name="kelompokId" className="form-control" value={form.kelompokId} onChange={handleChange}>
                  <option value="">-- Semua Kelompok --</option>
                  {filteredKelompoks.map(k => <option key={k.id} value={k.id}>{k.nama}</option>)}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Lokasi Detail</label>
              <input name="lokasi" className="form-control" value={form.lokasi} onChange={handleChange} placeholder="Tempat kegiatan (Nama gedung/rumah)" />
            </div>

            <div className="form-group">
              <label className="form-label">Deskripsi</label>
              <textarea name="deskripsi" className="form-control" value={form.deskripsi} onChange={handleChange} placeholder="Deskripsi kegiatan..." rows={3} />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Batal</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? "Menyimpan..." : "Simpan"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
