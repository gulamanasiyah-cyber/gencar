"use client";

import { useState, useEffect, useCallback } from "react";
import Swal from "sweetalert2";
import { MapPin } from "lucide-react";

interface Daerah { id: number; nama: string; }
interface Desa { id: number; nama: string; mandiriDaerahId: number; }
interface Kelompok { id: number; nama: string; mandiriDesaId: number; }

export default function MandiriDaftarWilayahPage() {
  const [daerahList, setDaerahList] = useState<Daerah[]>([]);
  const [desaList, setDesaList] = useState<Desa[]>([]);
  const [kelompokList, setKelompokList] = useState<Kelompok[]>([]);

  const [daerahId, setDaerahId] = useState("");
  const [desaId, setDesaId] = useState("");
  const [kelompokId, setKelompokId] = useState("");

  const fetchAll = useCallback(async () => {
    try {
      const [da, de, ke] = await Promise.all([
        fetch("/api/public/mandiri/daerah", { cache: "no-store" }).then((r) => r.json()),
        fetch("/api/public/mandiri/desa?scope=all", { cache: "no-store" }).then((r) => r.json()),
        fetch("/api/public/mandiri/kelompok?scope=all", { cache: "no-store" }).then((r) => r.json()),
      ]);
      setDaerahList(Array.isArray(da) ? da : []);
      setDesaList(Array.isArray(de) ? de : []);
      setKelompokList(Array.isArray(ke) ? ke : []);
    } catch (error) {
      console.error("Gagal mengambil data wilayah:", error);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const desaOptions = desaList.filter((d) => String(d.mandiriDaerahId) === daerahId);
  const kelompokOptions = kelompokList.filter((k) => String(k.mandiriDesaId) === desaId);

  const handleAddNewDaerah = async (name: string) => {
    const res = await fetch("/api/public/mandiri/wilayah", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "daerah", nama: name }),
    });
    const data = await res.json();
    if (!res.ok) {
      Swal.fire({ icon: "error", title: "Gagal", text: data.error || "Gagal menambah daerah baru" });
      throw new Error(data.error);
    }
    setDaerahList((prev) => (prev.some((d) => d.id === data.id) ? prev : [...prev, { id: data.id, nama: data.nama }]));
    Swal.fire({ icon: "success", title: "Berhasil", text: `Daerah "${data.nama}" berhasil didaftarkan.`, timer: 1500, showConfirmButton: false, toast: true, position: "top-end" });
    return { id: data.id, name: data.nama };
  };

  const handleAddNewDesa = async (name: string) => {
    if (!daerahId) return { id: "", name: "" };
    const res = await fetch("/api/public/mandiri/wilayah", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "desa", nama: name, parentId: Number(daerahId) }),
    });
    const data = await res.json();
    if (!res.ok) {
      Swal.fire({ icon: "error", title: "Gagal", text: data.error || "Gagal menambah desa baru" });
      throw new Error(data.error);
    }
    setDesaList((prev) => (prev.some((d) => d.id === data.id) ? prev : [...prev, { id: data.id, nama: data.nama, mandiriDaerahId: Number(daerahId) }]));
    Swal.fire({ icon: "success", title: "Berhasil", text: `Desa "${data.nama}" berhasil didaftarkan.`, timer: 1500, showConfirmButton: false, toast: true, position: "top-end" });
    return { id: data.id, name: data.nama };
  };

  const handleAddNewKelompok = async (name: string) => {
    if (!desaId) return { id: "", name: "" };
    const res = await fetch("/api/public/mandiri/wilayah", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "kelompok", nama: name, parentId: Number(desaId) }),
    });
    const data = await res.json();
    if (!res.ok) {
      Swal.fire({ icon: "error", title: "Gagal", text: data.error || "Gagal menambah kelompok baru" });
      throw new Error(data.error);
    }
    setKelompokList((prev) => (prev.some((k) => k.id === data.id) ? prev : [...prev, { id: data.id, nama: data.nama, mandiriDesaId: Number(desaId) }]));
    Swal.fire({ icon: "success", title: "Berhasil", text: `Kelompok "${data.nama}" berhasil didaftarkan.`, timer: 1500, showConfirmButton: false, toast: true, position: "top-end" });
    return { id: data.id, name: data.nama };
  };

  const handleSelectDaerah = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === "add_new") {
      setDaerahId("");
      const { value: name } = await Swal.fire({
        title: "Tambah Daerah Baru",
        input: "text",
        inputPlaceholder: "Masukkan nama daerah",
        showCancelButton: true,
        confirmButtonText: "Simpan",
        cancelButtonText: "Batal",
      });
      if (name) {
        try {
          const newDaerah = await handleAddNewDaerah(name);
          setDaerahId(String(newDaerah.id));
          setDesaId("");
          setKelompokId("");
        } catch (error) {}
      }
    } else {
      setDaerahId(val);
      setDesaId("");
      setKelompokId("");
    }
  };

  const handleSelectDesa = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === "add_new") {
      setDesaId("");
      const { value: name } = await Swal.fire({
        title: "Tambah Desa Baru",
        input: "text",
        inputPlaceholder: "Masukkan nama desa",
        showCancelButton: true,
        confirmButtonText: "Simpan",
        cancelButtonText: "Batal",
      });
      if (name) {
        try {
          const newDesa = await handleAddNewDesa(name);
          setDesaId(String(newDesa.id));
          setKelompokId("");
        } catch (error) {}
      }
    } else {
      setDesaId(val);
      setKelompokId("");
    }
  };

  const handleSelectKelompok = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === "add_new") {
      setKelompokId("");
      const { value: name } = await Swal.fire({
        title: "Tambah Kelompok Baru",
        input: "text",
        inputPlaceholder: "Masukkan nama kelompok",
        showCancelButton: true,
        confirmButtonText: "Simpan",
        cancelButtonText: "Batal",
      });
      if (name) {
        try {
          const newKelompok = await handleAddNewKelompok(name);
          setKelompokId(String(newKelompok.id));
        } catch (error) {}
      }
    } else {
      setKelompokId(val);
    }
  };

  const handleSave = () => {
    if (!daerahId || !desaId || !kelompokId) {
      Swal.fire({
        icon: 'warning',
        title: 'Perhatian',
        text: 'Mohon lengkapi Daerah, Desa, dan Kelompok.'
      });
      return;
    }
    Swal.fire({
      icon: 'success',
      title: 'Berhasil',
      text: 'Wilayah berhasil disimpan untuk sesi ini.',
      timer: 1500,
      showConfirmButton: false
    });
    setDaerahId("");
    setDesaId("");
    setKelompokId("");
  };

  return (
    <div className="auth-page" style={{ padding: "40px 20px", display: "flex", justifyContent: "center", alignItems: "flex-start", minHeight: "100vh", backgroundColor: "#f8fafc" }}>
      <div className="auth-card" style={{ width: "100%", maxWidth: "500px", padding: "32px", borderRadius: "16px", backgroundColor: "#fff", boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)" }}>
        
        <div style={{ display: "flex", justifyContent: "center", marginBottom: "16px" }}>
          <div style={{ 
            width: "56px", 
            height: "56px", 
            backgroundColor: "#7c3aed", 
            borderRadius: "16px", 
            display: "flex", 
            alignItems: "center", 
            justifyContent: "center" 
          }}>
            <MapPin size={28} color="#fff" strokeWidth={2} />
          </div>
        </div>

        <div style={{ marginBottom: "24px", textAlign: "center" }}>
          <h2 style={{ fontSize: "1.5rem", fontWeight: 700, color: "#0f172a", marginBottom: "8px" }}>
            Daftar Wilayah
          </h2>
          <p style={{ fontSize: "14px", color: "#64748b", lineHeight: "1.5" }}>
            Pilih wilayah yang sudah ada, atau ketik nama baru untuk mendaftarkannya.
          </p>
        </div>

        <div className="form-group">
          <label className="form-label" style={{ fontSize: "14px", fontWeight: 600, color: "#1e293b", marginBottom: "8px", display: "block" }}>
            Daerah <span className="required" style={{ color: "#ef4444" }}>*</span>
          </label>
          <select 
            className="form-control" 
            value={daerahId} 
            onChange={handleSelectDaerah}
            style={{ 
              width: "100%", 
              padding: "10px 12px", 
              borderRadius: "8px", 
              border: "1px solid #cbd5e1", 
              fontSize: "14px",
              backgroundColor: "#fff",
              outline: "none"
            }}
          >
            <option value="" disabled>-- Pilih Daerah --</option>
            {daerahList.map((d) => (
              <option key={d.id} value={d.id}>{d.nama}</option>
            ))}
            <option value="add_new">+ Tambah daerah baru...</option>
          </select>
        </div>

        {daerahId && (
          <div className="form-group" style={{ marginTop: "16px" }}>
            <label className="form-label" style={{ fontSize: "14px", fontWeight: 600, color: "#1e293b", marginBottom: "8px", display: "block" }}>
              Desa <span className="required" style={{ color: "#ef4444" }}>*</span>
            </label>
            <select 
              className="form-control" 
              value={desaId} 
              onChange={handleSelectDesa}
              style={{ 
                width: "100%", 
                padding: "10px 12px", 
                borderRadius: "8px", 
                border: "1px solid #cbd5e1", 
                fontSize: "14px",
                backgroundColor: "#fff",
                outline: "none"
              }}
            >
              <option value="" disabled>-- Pilih Desa --</option>
              {desaOptions.map((d) => (
                <option key={d.id} value={d.id}>{d.nama}</option>
              ))}
              <option value="add_new">+ Tambah desa baru...</option>
            </select>
          </div>
        )}

        {desaId && (
          <div className="form-group" style={{ marginTop: "16px" }}>
            <label className="form-label" style={{ fontSize: "14px", fontWeight: 600, color: "#1e293b", marginBottom: "8px", display: "block" }}>
              Kelompok <span className="required" style={{ color: "#ef4444" }}>*</span>
            </label>
            <select 
              className="form-control" 
              value={kelompokId} 
              onChange={handleSelectKelompok}
              style={{ 
                width: "100%", 
                padding: "10px 12px", 
                borderRadius: "8px", 
                border: "1px solid #cbd5e1", 
                fontSize: "14px",
                backgroundColor: "#fff",
                outline: "none"
              }}
            >
              <option value="" disabled>-- Pilih Kelompok --</option>
              {kelompokOptions.map((k) => (
                <option key={k.id} value={k.id}>{k.nama}</option>
              ))}
              <option value="add_new">+ Tambah kelompok baru...</option>
            </select>
          </div>
        )}

        <button 
          type="button" 
          className="btn btn-primary btn-full" 
          style={{ 
            marginTop: "24px", 
            width: "100%", 
            padding: "12px", 
            backgroundColor: (daerahId && desaId && kelompokId) ? "#8b5cf6" : "#c4b5fd", 
            color: "#fff", 
            border: "none", 
            borderRadius: "8px", 
            fontWeight: 600, 
            cursor: (daerahId && desaId && kelompokId) ? "pointer" : "not-allowed",
            transition: "background-color 0.2s"
          }} 
          onClick={handleSave}
          disabled={!daerahId || !desaId || !kelompokId}
        >
          Simpan Wilayah
        </button>

        <p style={{ textAlign: "center", fontSize: "12px", color: "#94a3b8", marginTop: "24px" }}>
          Data yang didaftarkan akan diverifikasi dan diaktifkan oleh Admin sebelum digunakan pada pendaftaran peserta.
        </p>
      </div>
    </div>
  );
}

