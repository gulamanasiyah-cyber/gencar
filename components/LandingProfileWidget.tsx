"use client";

import { useState, useEffect, useRef } from "react";
import Swal from "sweetalert2";

export default function LandingProfileWidget({ session }: { session: any }) {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!session || !["generus", "usia_mandiri"].includes(session.role)) {
      setLoading(false);
      return;
    }

    // Fetch user's generus data
    fetch("/api/profile")
      .then(res => res.json())
      .then(data => {
        setProfile(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [session]);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      window.location.href = "/";
    } catch (err) {
      console.error(err);
    }
  };

  const handlePhotoClick = () => {
    fileInputRef.current?.click();
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = reader.result as string;
      try {
        const res = await fetch("/api/profile", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ foto: base64String })
        });
        const data = await res.json();
        if (res.ok) {
          setProfile((prev: any) => ({ ...prev, foto: base64String }));
          Swal.fire({ icon: 'success', title: 'Berhasil', text: 'Foto profil diperbarui', timer: 1500, showConfirmButton: false });
        } else {
          throw new Error(data.error);
        }
      } catch (err: any) {
        Swal.fire({ icon: 'error', title: 'Gagal', text: err.message || 'Gagal mengunggah foto' });
      }
    };
    reader.readAsDataURL(file);
  };

  if (!session || !["generus", "usia_mandiri"].includes(session.role)) {
    return null;
  }

  if (loading) return <div style={{ width: 150, height: 40, background: "#f1f5f9", borderRadius: 8 }} />;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginLeft: '24px', borderLeft: '1px solid var(--border)', paddingLeft: '24px' }}>
      <div 
        style={{ position: 'relative', width: '48px', height: '48px', borderRadius: '50%', background: 'var(--primary-lt)', cursor: 'pointer', overflow: 'hidden', border: '2px solid var(--primary)' }}
        onClick={handlePhotoClick}
        title="Ubah Foto Profil"
      >
        {profile?.foto ? (
          <img src={profile.foto} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', fontWeight: 600, fontSize: '18px' }}>
            {session.name.charAt(0).toUpperCase()}
          </div>
        )}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,0.5)', color: 'white', fontSize: '8px', textAlign: 'center', padding: '2px 0', opacity: 0, transition: 'opacity 0.2s' }} className="photo-overlay">
          Ubah
        </div>
      </div>
      
      <input type="file" ref={fileInputRef} onChange={handlePhotoChange} accept="image/*" style={{ display: 'none' }} />

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', textAlign: 'left' }}>
        <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--navy)', lineHeight: 1.2 }}>
          {session.name}
        </div>
        <div style={{ fontSize: '11px', color: 'var(--gray)', marginTop: '2px' }}>
          {profile?.desaNama || "-"} • {profile?.kelompokNama || "-"}
        </div>
        <button onClick={handleLogout} style={{ background: 'none', border: 'none', color: 'var(--danger)', fontSize: '10px', fontWeight: 600, textAlign: 'left', cursor: 'pointer', padding: 0, marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
          Keluar
        </button>
      </div>
      <style jsx>{`
        div:hover > .photo-overlay { opacity: 1 !important; }
      `}</style>
    </div>
  );
}
