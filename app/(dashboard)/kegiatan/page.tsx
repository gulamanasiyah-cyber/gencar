"use client";

import Topbar from "@/components/Topbar";

import { useState, useEffect, useCallback } from "react";
import Swal from "sweetalert2";

interface KegiatanItem {
  id: string;
  judul: string;
  deskripsi: string | null;
  tanggal: string;
  jam?: string | null;
  lokasi: string | null;
  desaNama: string | null;
  kelompokNama: string | null;
  desaId?: number | null;
  kelompokId?: number | null;
  createdAt: string | null;
}

export default function KegiatanPage() {
  const [data, setData] = useState<KegiatanItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<KegiatanItem | null>(null);
  const [userRole, setUserRole] = useState("");
  const [activeTab, setActiveTab] = useState<"aktif" | "riwayat">("aktif");

  const todayStr = new Date().toLocaleDateString('en-CA'); // Gets YYYY-MM-DD in local time
  const activeData = data.filter(item => item.tanggal >= todayStr);
  const historyData = data.filter(item => item.tanggal < todayStr);
  const displayData = activeTab === "aktif" ? activeData : historyData;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/kegiatan");
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
    fetch("/api/profile").then(r => r.json()).then(d => setUserRole(d.role || ""));
  }, [fetchData]);

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
      await fetch(`/api/kegiatan/${id}`, { method: "DELETE" });
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
      <Topbar title="Kegiatan" role={userRole} />
      <div className="page-content">
        <div className="page-header">
          <div className="page-header-left">
            <h2>Manajemen Kegiatan</h2>
            <p>Kelola kegiatan desa dan kelompok</p>
          </div>
          <button className="btn btn-primary" onClick={() => { setEditItem(null); setShowModal(true); }}>
            + Tambah Kegiatan
          </button>
        </div>

        <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
          <button 
            className={`btn ${activeTab === "aktif" ? "btn-primary" : "btn-secondary"}`} 
            onClick={() => setActiveTab("aktif")}
            style={{ borderRadius: "20px", padding: "6px 16px", fontSize: "14px" }}
          >
            Kegiatan Mendatang ({activeData.length})
          </button>
          <button 
            className={`btn ${activeTab === "riwayat" ? "btn-primary" : "btn-secondary"}`} 
            onClick={() => setActiveTab("riwayat")}
            style={{ borderRadius: "20px", padding: "6px 16px", fontSize: "14px" }}
          >
            Riwayat Kegiatan ({historyData.length})
          </button>
        </div>

        <div className="card">
          {loading ? (
            <div className="loading"><div className="spinner" /></div>
          ) : displayData.length === 0 ? (
            <div className="empty-state">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              <h3>{activeTab === "aktif" ? "Belum ada kegiatan mendatang" : "Belum ada riwayat kegiatan"}</h3>
              {activeTab === "aktif" && <p>Klik &quot;Tambah Kegiatan&quot; untuk membuat kegiatan baru</p>}
            </div>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Kegiatan</th>
                    <th>Deskripsi</th>
                    <th>Tanggal</th>
                    <th>Jam</th>
                    <th>Lokasi</th>
                    <th>Desa/Kelompok</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {displayData.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <div style={{ fontWeight: 500 }}>{item.judul}</div>
                      </td>
                      <td style={{ maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis" }}>
                        {item.deskripsi || "-"}
                      </td>
                      <td style={{ whiteSpace: "nowrap" }}>
                        {formatDate(item.tanggal)}
                      </td>
                      <td style={{ whiteSpace: "nowrap" }}>
                        {item.jam || "-"}
                      </td>
                      <td>{item.lokasi || "-"}</td>
                      <td>
                        {item.kelompokNama && <div className="text-sm">{item.kelompokNama}</div>}
                        {item.desaNama && <div className="text-sm text-muted">{item.desaNama}</div>}
                      </td>
                      <td>
                        <div className="flex gap-2">
                          <a href={`/absensi?kegiatanId=${item.id}`} className="btn btn-sm btn-success">Absensi</a>
                          <button className="btn btn-sm btn-secondary" onClick={() => { setEditItem(item); setShowModal(true); }}>Edit</button>
                          <button className="btn btn-sm btn-danger" onClick={() => handleDelete(item.id)}>Hapus</button>
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

      {showModal && (
        <KegiatanModal
          item={editItem}
          onClose={() => { setShowModal(false); setEditItem(null); }}
          onSaved={(updatedItem) => {
            setShowModal(false);
            setEditItem(null);
            if (updatedItem && editItem) {
              setData((prev) => prev.map((d) => d.id === updatedItem.id ? updatedItem : d));
            } else {
              fetchData();
            }
          }}
        />
      )}
    </div>
  );
}

function KegiatanModal({ item, onClose, onSaved }: {
  item: KegiatanItem | null;
  onClose: () => void;
  onSaved: (updated?: KegiatanItem) => void;
}) {
  const isEdit = !!item?.id;

  const [form, setForm] = useState({
    judul: item?.judul || "",
    deskripsi: item?.deskripsi || "",
    tanggal: item?.tanggal || "",
    jam: item?.jam || "",
    lokasi: item?.lokasi || "",
    desaId: item?.desaId ? String(item.desaId) : "",
    kelompokId: item?.kelompokId ? String(item.kelompokId) : "",
  });
  const [desaList, setDesaList] = useState<{ id: number; nama: string }[]>([]);
  const [kelompokList, setKelompokList] = useState<{ id: number; nama: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchingItem, setFetchingItem] = useState(false);
  const [fetchError, setFetchError] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/auth/desa").then(r => r.json()).then(setDesaList).catch(console.error);
  }, []);

  useEffect(() => {
    if (!form.desaId) { setKelompokList([]); return; }
    fetch(`/api/auth/kelompok?desaId=${form.desaId}`)
      .then(r => r.json())
      .then(setKelompokList)
      .catch(console.error);
  }, [form.desaId]);

  useEffect(() => {
    if (!isEdit || !item?.id) return;

    setFetchingItem(true);
    setFetchError("");

    fetch(`/api/kegiatan/${item.id}`, { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) throw new Error("Gagal mengambil data terbaru");
        const fresh: KegiatanItem = await res.json();
        setForm({
          judul: fresh.judul || "",
          deskripsi: fresh.deskripsi || "",
          tanggal: fresh.tanggal || "",
          jam: fresh.jam || "",
          lokasi: fresh.lokasi || "",
          desaId: fresh.desaId ? String(fresh.desaId) : "",
          kelompokId: fresh.kelompokId ? String(fresh.kelompokId) : "",
        });
      })
      .catch(() => {
        setFetchError("Tidak dapat memuat data terbaru. Menampilkan data terakhir yang tersimpan.");
        setForm({
          judul: item.judul || "",
          deskripsi: item.deskripsi || "",
          tanggal: item.tanggal || "",
          jam: item.jam || "",
          lokasi: item.lokasi || "",
          desaId: item.desaId ? String(item.desaId) : "",
          kelompokId: item.kelompokId ? String(item.kelompokId) : "",
        });
      })
      .finally(() => setFetchingItem(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item?.id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const url = item ? `/api/kegiatan/${item.id}` : "/api/kegiatan";
      const method = item ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { 
        Swal.fire({
          icon: 'error',
          title: 'Gagal',
          text: data.error || "Gagal menyimpan"
        });
        setError(data.error || "Gagal menyimpan"); 
        return; 
      }
      
      Swal.fire({
        icon: 'success',
        title: 'Berhasil',
        text: 'Kegiatan berhasil disimpan!',
        timer: 1500,
        showConfirmButton: false
      });
      onSaved(data.data ?? undefined);
    } catch {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: "Terjadi kesalahan jaringan"
      });
      setError("Terjadi kesalahan jaringan");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <span className="modal-title">{isEdit ? "Edit Kegiatan" : "Tambah Kegiatan"}</span>
          <button className="modal-close" onClick={onClose} disabled={fetchingItem}>×</button>
        </div>
        {fetchingItem ? (
          <div className="modal-body" style={{ minHeight: 200, display: "flex", justifyContent: "center", alignItems: "center" }}>
            <div className="loading"><div className="spinner" /> Memuat data terbaru...</div>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="modal-body">
              {fetchError && (
                <div style={{ background: "#fef9c3", color: "#854d0e", borderLeft: "4px solid #eab308", padding: "10px 14px", borderRadius: 6, marginBottom: 16, fontSize: 13 }}>
                  ⚠️ {fetchError}
                </div>
              )}
              {error && <div className="alert alert-error">{error}</div>}
              <div className="form-group">
                <label className="form-label">Judul Kegiatan <span className="required">*</span></label>
                <input name="judul" className="form-control" value={form.judul} onChange={handleChange} required placeholder="Nama kegiatan" />
              </div>
              <div className="form-row" style={{ display: "flex", gap: "12px" }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Tanggal <span className="required">*</span></label>
                  <input name="tanggal" type="date" className="form-control" value={form.tanggal} onChange={handleChange} required />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Jam</label>
                  <input name="jam" type="time" className="form-control" value={form.jam} onChange={handleChange} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Lokasi</label>
                <input name="lokasi" className="form-control" value={form.lokasi} onChange={handleChange} placeholder="Tempat kegiatan" />
              </div>
              <div className="form-group">
                <label className="form-label">Deskripsi</label>
                <textarea name="deskripsi" className="form-control" value={form.deskripsi} onChange={handleChange} placeholder="Deskripsi kegiatan..." />
              </div>
              <div className="form-row" style={{ display: "flex", gap: "12px" }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Desa</label>
                  <select name="desaId" className="form-control" value={form.desaId} onChange={handleChange}>
                    <option value="">Pilih Desa (Opsional)</option>
                    {desaList.map(d => <option key={d.id} value={d.id}>{d.nama}</option>)}
                  </select>
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Kelompok</label>
                  <select name="kelompokId" className="form-control" value={form.kelompokId} onChange={handleChange}>
                    <option value="">Pilih Kelompok (Opsional)</option>
                    {kelompokList.map(k => <option key={k.id} value={k.id}>{k.nama}</option>)}
                  </select>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={onClose}>Batal</button>
              <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? "Menyimpan..." : "Simpan"}</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
