"use client";

import { useState, useEffect, useCallback } from "react";
import Swal from "sweetalert2";
import SearchableSelect from "@/components/mandiri/SearchableSelect";

interface Daerah { id: number; nama: string; }
interface Desa { id: number; nama: string; mandiriDaerahId: number; }
interface Kelompok { id: number; nama: string; mandiriDesaId: number; }

export default function MandiriDaftarWilayahPage() {
  const [daerahList, setDaerahList] = useState<Daerah[]>([]);
  const [desaList, setDesaList] = useState<Desa[]>([]);
  const [kelompokList, setKelompokList] = useState<Kelompok[]>([]);
  const [siteLogo, setSiteLogo] = useState<string | null>(null);

  const [daerahId, setDaerahId] = useState("");
  const [desaId, setDesaId] = useState("");
  const [kelompokId, setKelompokId] = useState("");

  const fetchAll = useCallback(async () => {
    const [da, de, ke] = await Promise.all([
      fetch("/api/public/mandiri/daerah", { cache: "no-store" }).then((r) => r.json()),
      fetch("/api/public/mandiri/desa?scope=all", { cache: "no-store" }).then((r) => r.json()),
      fetch("/api/public/mandiri/kelompok?scope=all", { cache: "no-store" }).then((r) => r.json()),
    ]);
    setDaerahList(Array.isArray(da) ? da : []);
    setDesaList(Array.isArray(de) ? de : []);
    setKelompokList(Array.isArray(ke) ? ke : []);
  }, []);

  useEffect(() => {
    fetchAll();
    if (typeof window !== "undefined") {
      const handleLogoUpdate = () => setSiteLogo((window as any).__SITE_LOGO__ || null);
      handleLogoUpdate();
      window.addEventListener("site-logo-updated", handleLogoUpdate);
      return () => window.removeEventListener("site-logo-updated", handleLogoUpdate);
    }
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

  const handleReset = () => {
    setDaerahId("");
    setDesaId("");
    setKelompokId("");
  };

  return (
    <div className="auth-page" style={{ padding: "40px 20px" }}>
      <div className="auth-card" style={{ maxWidth: "600px" }}>
        <div className="auth-logo" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "12px", marginBottom: "20px" }}>
          {siteLogo && <img src={siteLogo} alt="Logo" style={{ width: "40px", height: "40px", objectFit: "contain" }} />}
          <div style={{ textAlign: "left" }}>
            <h1 style={{ margin: 0, lineHeight: 1 }}>GENCAR</h1>
            <p style={{ margin: 0, fontSize: "11px" }}>Sistem Manajemen Mandiri JB2</p>
          </div>
        </div>

        <div style={{ marginBottom: "24px", textAlign: "center" }}>
          <h2 style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--text)", marginBottom: "8px" }}>
            Pendaftaran Daerah, Desa & Kelompok
          </h2>
          <p style={{ fontSize: "14px", color: "var(--text-muted)" }}>
            Pilih Daerah, Desa, dan Kelompok yang sudah ada, atau ketik nama baru untuk mendaftarkannya langsung.
          </p>
        </div>

        <div className="form-group">
          <label className="form-label">Daerah <span className="required">*</span></label>
          <SearchableSelect
            placeholder="Pilih/Tambah Daerah..."
            options={daerahList.map((d) => ({ id: d.id, name: d.nama }))}
            value={daerahId}
            onChange={(val) => {
              setDaerahId(val);
              setDesaId("");
              setKelompokId("");
            }}
            onAddNew={handleAddNewDaerah}
          />
        </div>

        <div className="form-group" style={{ marginTop: "16px" }}>
          <label className="form-label">Desa <span className="required">*</span></label>
          <SearchableSelect
            placeholder="Pilih/Tambah Desa..."
            options={desaOptions.map((d) => ({ id: d.id, name: d.nama }))}
            value={desaId}
            onChange={(val) => {
              setDesaId(val);
              setKelompokId("");
            }}
            disabled={!daerahId}
            onAddNew={handleAddNewDesa}
          />
        </div>

        <div className="form-group" style={{ marginTop: "16px" }}>
          <label className="form-label">Kelompok <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>(Opsional)</span></label>
          <SearchableSelect
            placeholder="Pilih/Tambah Kelompok..."
            options={kelompokOptions.map((k) => ({ id: k.id, name: k.nama }))}
            value={kelompokId}
            onChange={(val) => setKelompokId(val)}
            disabled={!desaId}
            onAddNew={handleAddNewKelompok}
          />
        </div>

        <button type="button" className="btn btn-secondary btn-full" style={{ marginTop: "24px" }} onClick={handleReset}>
          Daftarkan Wilayah Lain
        </button>

        <p style={{ textAlign: "center", fontSize: "12px", color: "var(--text-muted)", marginTop: "20px" }}>
          Setiap pilihan "Tambah baru" langsung didaftarkan ke sistem. Data yang didaftarkan di sini akan diverifikasi dan diaktifkan oleh Admin sebelum digunakan pada pendaftaran peserta.
        </p>
      </div>
    </div>
  );
}
