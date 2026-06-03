"use client";



import Topbar from "@/components/Topbar";
import { useState, useEffect, useRef } from "react";
import Swal from "sweetalert2";

export default function AdminLogoPage() {
  const [logo, setLogo] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState("");

  useEffect(() => {
    async function init() {
      try {
        const [settingsRes, profileRes] = await Promise.all([
          fetch("/api/settings"),
          fetch("/api/profile")
        ]);
        const settingsData = await settingsRes.json();
        const profileData = await profileRes.json();
        
        if (settingsData.site_logo) setLogo(settingsData.site_logo);
        setUserRole(profileData.role || "");
      } catch (err) {
        console.error("Init Error:", err);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    Swal.fire({ title: 'Uploading...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData
      });
      const data = await res.json();
      
      if (data.url) {
        setLogo(data.url);
        await saveSetting("site_logo", data.url);
        Swal.fire("Berhasil", "Logo berhasil diperbarui", "success");
        window.location.reload();
      }
    } catch (e) {
      Swal.fire("Error", "Gagal mengunggah logo", "error");
    }
  };

  const saveSetting = async (key: string, value: string) => {
    await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, value })
    });
  };

  if (loading) {
    return <div className="p-8 text-center">Memuat...</div>;
  }

  return (
    <div>
      <Topbar title="Pengaturan Logo & Tema" role={userRole} />
      <div className="page-content">
        <div className="page-header">
          <div className="page-header-left">
            <h2>Pengaturan Logo Situs</h2>
            <p>Kelola logo resmi website GENCAR BERKARYA</p>
          </div>
        </div>

        <div className="card">
          <div className="card-body" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "24px", padding: "40px" }}>
             <div style={{ width: "200px", height: "200px", border: "2px dashed var(--border)", borderRadius: "20px", display: "flex", justifyContent: "center", alignItems: "center", overflow: "hidden", background: "var(--bg)" }}>
                {logo ? (
                  <img src={logo} alt="Site Logo" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
                ) : (
                  <span className="text-muted">Belum ada logo</span>
                )}
             </div>
             
             <div style={{ textAlign: "center" }}>
                <input 
                  type="file" 
                  id="logo-upload" 
                  accept="image/*" 
                  onChange={handleUpload} 
                  style={{ display: "none" }} 
                />
                <label htmlFor="logo-upload" className="btn btn-primary" style={{ cursor: "pointer" }}>
                   {logo ? "Ganti Logo" : "Unggah Logo"}
                </label>
                <p className="text-sm text-muted" style={{ marginTop: "12px" }}>
                  Gunakan gambar persegi (PNG/JPG) untuk hasil terbaik.
                </p>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
