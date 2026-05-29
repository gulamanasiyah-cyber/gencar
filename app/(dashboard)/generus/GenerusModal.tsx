"use client";

import { useState, useEffect } from "react";
import { GenerusItem } from "@/lib/types";
import Swal from "sweetalert2";

interface Desa { id: number; nama: string; }
interface Kelompok { id: number; nama: string; }

interface Props {
  item: GenerusItem | null;
  onClose: () => void;
  onSaved: (updatedItem?: GenerusItem) => void;
  isMandiri?: boolean;
}

const KATEGORI = ["SMP", "SMA", "SMK", "Kuliah", "Bekerja"];

const EMPTY_FORM = {
  nama: "",
  jenisKelamin: "L",
  kategoriUsia: "SMP",
  kategori: "Generus",
  tempatLahir: "",
  tanggalLahir: "",
  namaOrtu: "",
  alamat: "",
  noTelp: "",
  noTelpOrtu: "",
  pendidikan: "",
  pekerjaan: "",
  statusNikah: "Belum Menikah",
  hobi: "",
  makananMinumanFavorit: "",
  suku: "",
  foto: "",
  desaId: "",
  kelompokId: "",
  mandiriDesaId: "",
  mandiriKelompokId: "",
  instagram: "",
  email: "",
  password: "",
};

function itemToForm(src: GenerusItem) {
  return {
    nama: src.nama || "",
    jenisKelamin: src.jenisKelamin || "L",
    kategoriUsia: src.kategoriUsia || "SMP",
    kategori: src.kategori || "Generus",
    namaOrtu: src.namaOrtu || "",
    tempatLahir: src.tempatLahir || "",
    tanggalLahir: src.tanggalLahir || "",
    alamat: src.alamat || "",
    noTelp: src.noTelp || "",
    noTelpOrtu: src.noTelpOrtu || "",
    pendidikan: src.pendidikan || "",
    pekerjaan: src.pekerjaan || "",
    statusNikah: src.statusNikah || "Belum Menikah",
    hobi: src.hobi || "",
    makananMinumanFavorit: src.makananMinumanFavorit || "",
    suku: src.suku || "",
    foto: src.foto || "",
    desaId: String(src.desaId || ""),
    kelompokId: String(src.kelompokId || ""),
    mandiriDesaId: String(src.mandiriDesaId || ""),
    mandiriKelompokId: String(src.mandiriKelompokId || ""),
    instagram: src.instagram || "",
    email: src.email || "",
    password: "",
  };
}

export default function GenerusModal({ item, onClose, onSaved, isMandiri }: Props) {
  const isEdit = !!item?.id;

  const [form, setForm] = useState(item ? itemToForm(item) : {
    ...EMPTY_FORM,
    kategoriUsia: isMandiri ? "Kuliah" : EMPTY_FORM.kategoriUsia
  });
  const [session, setSession] = useState<any>(null);
  const [desaList, setDesaList] = useState<any[]>([]); // Using any[] to account for 'kota'
  const [kelompokList, setKelompokList] = useState<Kelompok[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedKota, setSelectedKota] = useState("");

  // ─── Ambil data sesi ──────────────────────────────────────────────────────────
  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((s) => {
        setSession(s);
        if (!isEdit && s) {
          setForm(prev => ({
            ...prev,
            desaId: s.desaId ? String(s.desaId) : prev.desaId,
            kelompokId: s.kelompokId ? String(s.kelompokId) : prev.kelompokId
          }));
        }
      });
  }, [isEdit]);
  const [fetchingItem, setFetchingItem] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [fetchError, setFetchError] = useState("");
  const [error, setError] = useState("");

  // Populate selectedKota if edit mode
  useEffect(() => {
    if (isEdit && desaList.length > 0) {
      const idToFind = isMandiri ? form.mandiriDesaId : form.desaId;
      if (idToFind) {
        const currentDesa = desaList.find(d => String(d.id) === idToFind);
        if (currentDesa && !selectedKota) {
          setSelectedKota(currentDesa.kota);
        }
      }
    }
  }, [isMandiri, isEdit, desaList, form.mandiriDesaId, form.desaId, selectedKota]);

  // ─── Ambil data terbaru dari server saat mode Edit dibuka ───────────────────
  useEffect(() => {
    if (!isEdit || !item?.id) return;

    setFetchingItem(true);
    setFetchError("");

    fetch(`/api/generus/${item.id}`, { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) throw new Error("Gagal mengambil data terbaru");
        const fresh: GenerusItem = await res.json();
        setForm(itemToForm(fresh));
      })
      .catch(() => {
        // Fallback ke data dari state lokal jika fetch gagal
        setFetchError("Tidak dapat memuat data terbaru. Menampilkan data terakhir yang tersimpan.");
        setForm(itemToForm(item));
      })
      .finally(() => setFetchingItem(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item?.id]);

  // ─── Muat daftar desa ────────────────────────────────────────────────────────
  useEffect(() => {
    const api = isMandiri ? "/api/mandiri/desa" : "/api/auth/desa";
    fetch(api).then((r) => r.json()).then(setDesaList).catch(console.error);
  }, [isMandiri]);

  // ─── Muat kelompok berdasarkan desa yang dipilih ─────────────────────────────
  useEffect(() => {
    if (!form.desaId && !form.mandiriDesaId) { setKelompokList([]); return; }
    const id = isMandiri ? form.mandiriDesaId : form.desaId;
    const api = isMandiri ? `/api/mandiri/kelompok?mandiriDesaId=${id}` : `/api/auth/kelompok?desaId=${id}`;
    fetch(api).then((r) => r.json()).then(setKelompokList);
  }, [form.desaId, form.mandiriDesaId, isMandiri]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const url = item ? `/api/generus/${item.id}` : "/api/generus";
      const method = item ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          desaId: isMandiri ? null : (form.desaId ? Number(form.desaId) : null),
          kelompokId: isMandiri ? null : (form.kelompokId ? Number(form.kelompokId) : null),
          mandiriDesaId: isMandiri ? (form.mandiriDesaId ? Number(form.mandiriDesaId) : null) : null,
          mandiriKelompokId: isMandiri ? (form.mandiriKelompokId ? Number(form.mandiriKelompokId) : null) : null,
          email: form.email,
          password: form.password,
        }),
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
        text: 'Data muda-mudi berhasil disimpan!',
        timer: 1500,
        showConfirmButton: false
      });
      onSaved(data.success ? (data.data || data) : undefined);
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

  const kotaList = Array.from(new Set(desaList.map(d => d.kota))).sort();
  const filteredDesaList = isMandiri ? desaList.filter(d => d.kota === selectedKota) : desaList;

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-lg">
        <div className="modal-header">
          <span className="modal-title">{isEdit ? "Edit Muda-Mudi" : "Tambah Muda-Mudi"}</span>
          <button className="modal-close" onClick={onClose} disabled={fetchingItem}>×</button>
        </div>

        {/* Skeleton loading saat mengambil data terbaru dari server */}
        {fetchingItem ? (
          <div className="modal-body" style={{ minHeight: 340 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{
                display: "flex", alignItems: "center", gap: 10,
                color: "#64748b", fontSize: 14, marginBottom: 8,
              }}>
                <span style={{
                  width: 18, height: 18,
                  border: "2px solid #cbd5e1", borderTopColor: "#3b82f6",
                  borderRadius: "50%", display: "inline-block",
                  animation: "gm-spin 0.8s linear infinite", flexShrink: 0,
                }} />
                Memuat data terbaru dari server...
              </div>
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="form-row" style={{ gap: 12 }}>
                  {[0, 1].map((j) => (
                    <div key={j} style={{
                      height: 42, borderRadius: 8,
                      background: "linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%)",
                      backgroundSize: "200% 100%",
                      animation: `gm-shimmer 1.4s ${(i * 2 + j) * 0.1}s infinite`,
                    }} />
                  ))}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="modal-body">
              {fetchError && (
                <div style={{
                  background: "#fef9c3", color: "#854d0e",
                  borderLeft: "4px solid #eab308",
                  padding: "10px 14px", borderRadius: 6,
                  marginBottom: 16, fontSize: 13,
                }}>
                  ⚠️ {fetchError}
                </div>
              )}
              {error && <div className="alert alert-error">{error}</div>}

              <div className="form-group" style={{ textAlign: "center", marginBottom: 20 }}>
                <div style={{ position: "relative", display: "inline-block" }}>
                  <div style={{
                    width: 100, height: 100, borderRadius: "50%", background: "#f1f5f9",
                    margin: "0 auto 10px", overflow: "hidden", border: "2px solid #e2e8f0"
                  }}>
                    {form.foto ? (
                      <img src={form.foto} alt="Preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#94a3b8", fontSize: "40px" }}>
                        👤
                      </div>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
                    <label className="btn btn-sm btn-secondary" style={{ cursor: "pointer" }}>
                      {uploading ? "..." : "Upload Foto"}
                      <input
                        type="file"
                        hidden
                        accept="image/*"
                        disabled={uploading}
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          setUploading(true);
                          const formData = new FormData();
                          formData.append("file", file);
                          try {
                            const res = await fetch("/api/upload", { method: "POST", body: formData });
                            const json = await res.json();
                            if (json.url) setForm({ ...form, foto: json.url });
                          } catch (err) {
                            console.error(err);
                          } finally {
                            setUploading(false);
                          }
                        }}
                      />
                    </label>
                    <p style={{ fontSize: "11px", color: "var(--text-muted)", margin: "8px auto 0", maxWidth: "250px", textAlign: "center" }}>
                      Kirim foto yang terbaik & terbaru, foto bebas, dan muka tampak jelas (tidak tertutup masker)
                    </p>
                    {form.foto && (
                      <button
                        type="button"
                        className="btn btn-sm btn-secondary"
                        style={{ color: "#ef4444", width: 32, height: 32, padding: 0, display: "flex", alignItems: "center", justifyContent: "center" }}
                        onClick={async () => {
                          const res = await Swal.fire({
                            title: 'Hapus foto?',
                            text: "Hapus foto profil muda-mudi?",
                            icon: 'warning',
                            showCancelButton: true,
                            confirmButtonColor: '#3b82f6',
                            cancelButtonColor: '#64748b',
                            confirmButtonText: 'Ya, hapus!',
                            cancelButtonText: 'Batal'
                          });
                          if (res.isConfirmed) setForm({ ...form, foto: "" });
                        }}
                        title="Hapus"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                          <polyline points="3 6 5 6 21 6"></polyline>
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Nama Lengkap <span className="required">*</span></label>
                  <input name="nama" className="form-control" value={form.nama} onChange={handleChange} required placeholder="Nama lengkap" />
                  <p style={{ fontSize: "10.5px", color: "var(--text-muted)", marginTop: "4px" }}>
                    Contoh Format Penulisan: Raka Gladhi Pratama (Tanpa disingkat dan huruf kapital pada setiap awal kata)
                  </p>
                </div>
                <div className="form-group">
                  <label className="form-label">Jenis Kelamin <span className="required">*</span></label>
                  <select name="jenisKelamin" className="form-control" value={form.jenisKelamin} onChange={handleChange}>
                    <option value="L">Laki-laki</option>
                    <option value="P">Perempuan</option>
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Tempat Lahir <span className="required">*</span></label>
                  <input name="tempatLahir" className="form-control" value={form.tempatLahir} onChange={handleChange} required placeholder="Kota kelahiran" />
                </div>
                <div className="form-group">
                  <label className="form-label">Tanggal Lahir <span className="required">*</span></label>
                  <input name="tanggalLahir" type="date" className="form-control" value={form.tanggalLahir} onChange={handleChange} required />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Kategori <span className="required">*</span></label>
                  <select name="kategori" className="form-control" value={form.kategori} onChange={handleChange} required>
                    <option value="Generus">Muda-Mudi</option>
                    <option value="Usia Mandiri">Usia Mandiri</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Pendidikan / Pekerjaan <span className="required">*</span></label>
                  <select name="kategoriUsia" className="form-control" value={form.kategoriUsia} onChange={handleChange} required>
                    {KATEGORI.filter(k => !isMandiri || ["Kuliah", "Bekerja"].includes(k)).map((k) => (
                      <option key={k} value={k}>{k}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Status Nikah</label>
                <select name="statusNikah" className="form-control" value={form.statusNikah} onChange={handleChange}>
                  <option value="Belum Menikah">Belum Menikah</option>
                  <option value="Menikah">Menikah</option>
                </select>
              </div>

              <div className="form-row">
                {isMandiri ? (
                  <>
                    <div className="form-group">
                      <label className="form-label">Kota / Daerah <span className="required">*</span></label>
                      <select
                        className="form-control"
                        value={selectedKota}
                        onChange={(e) => {
                          setSelectedKota(e.target.value);
                          setForm(prev => ({ ...prev, mandiriDesaId: "", mandiriKelompokId: "" }));
                        }}
                        required
                      >
                        <option value="">Pilih Kota/Daerah</option>
                        {kotaList.map((k) => <option key={k} value={k}>{k}</option>)}
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Desa <span className="required">*</span></label>
                      <select
                        name="mandiriDesaId"
                        className="form-control"
                        value={form.mandiriDesaId}
                        onChange={handleChange}
                        required
                        disabled={!selectedKota}
                      >
                        <option value="">Pilih Desa</option>
                        {filteredDesaList.map((d) => <option key={d.id} value={d.id}>{d.nama}</option>)}
                      </select>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="form-group">
                      <label className="form-label">Desa <span className="required">*</span></label>
                      <select
                        name="desaId"
                        className="form-control"
                        value={form.desaId}
                        onChange={handleChange}
                        required
                        disabled={(session?.role !== "admin" && !!session?.desaId)}
                      >
                        <option value="">Pilih Desa</option>
                        {desaList.map((d) => <option key={d.id} value={d.id}>{d.nama}</option>)}
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Kelompok <span className="required">*</span></label>
                      <select
                        name="kelompokId"
                        className="form-control"
                        value={form.kelompokId}
                        onChange={handleChange}
                        required
                        disabled={(!form.desaId || (session?.role !== "admin" && !!session?.kelompokId))}
                      >
                        <option value="">Pilih Kelompok</option>
                        {kelompokList.map((k) => <option key={k.id} value={k.id}>{k.nama}</option>)}
                      </select>
                    </div>
                  </>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">Alamat</label>
                <textarea name="alamat" className="form-control" value={form.alamat} onChange={handleChange} placeholder="Alamat lengkap" style={{ minHeight: 70 }} />
              </div>

              <div className="form-group">
                <label className="form-label">Nama Orang Tua</label>
                <input name="namaOrtu" className="form-control" value={form.namaOrtu} onChange={handleChange} placeholder="Nama Ayah / Ibu" />
              </div>

              <div className="form-group">
                <label className="form-label">Nomor WhatsApp Anda <span className="required">*</span></label>
                <input name="noTelp" className="form-control" value={form.noTelp} onChange={handleChange} required placeholder="08xx-xxxx-xxxx" />
                <p style={{ fontSize: "10.5px", color: "var(--text-muted)", marginTop: "4px" }}>
                  Nomor ini tidak akan disebarluaskan, hanya digunakan untuk keperluan kordinasi antar pengurus.
                </p>
              </div>

              <div className="form-group">
                <label className="form-label">Nomor WhatsApp Orangtua</label>
                <input name="noTelpOrtu" className="form-control" value={form.noTelpOrtu} onChange={handleChange} placeholder="08xx-xxxx-xxxx" />
              </div>

              <div style={{ marginTop: "20px", padding: "15px", background: "#f8fafc", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
                <p style={{ fontWeight: 600, fontSize: "14px", marginBottom: "12px", display: "flex", alignItems: "center", gap: "6px" }}>
                  <span style={{ fontSize: "18px" }}>🔐</span> Akun Login (Opsional)
                </p>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Email Login</label>
                    <input name="email" className="form-control" value={form.email} onChange={handleChange} placeholder="Email untuk login..." style={{ background: "#fff" }} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">{isEdit ? "Ubah Password" : "Password Login"}</label>
                    <input name="password" type="password" className="form-control" value={form.password} onChange={handleChange} placeholder={isEdit ? "Kosongkan jika tidak diubah" : "Kosongkan untuk otomatis"} style={{ background: "#fff" }} />
                  </div>
                </div>
                {!isEdit && (
                  <p style={{ fontSize: "11px", color: "#64748b", marginTop: "4px" }}>
                    Jika dikosongkan, sistem akan otomatis menggunakan <b>Nomor Unik</b> sebagai Email & Password.
                  </p>
                )}
              </div>
            </div>

            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={onClose}>Batal</button>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? "Menyimpan..." : "Simpan"}
              </button>
            </div>
          </form>
        )}

        <style>{`
          @keyframes gm-shimmer {
            0%   { background-position:  200% 0; }
            100% { background-position: -200% 0; }
          }
          @keyframes gm-spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </div>
  );
}
