"use client";
export const runtime = "edge";


import Topbar from "@/components/Topbar";
import { useState, useEffect } from "react";
import Swal from "sweetalert2";
import { Settings2, ShieldCheck, ShieldAlert, Clock } from "lucide-react";

export default function AdminMaintenancePage() {
  const [maintenanceMode, setMaintenanceMode] = useState<boolean>(false);
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
        
        setMaintenanceMode(settingsData.MAINTENANCE_MODE === "true");
        setUserRole(profileData.role || "");
      } catch (err) {
        console.error("Init Error:", err);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  const toggleMaintenance = async () => {
    const newValue = !maintenanceMode;
    
    const result = await Swal.fire({
      title: newValue ? 'Aktifkan Mode Perbaikan?' : 'Matikan Mode Perbaikan?',
      text: newValue 
        ? "Halaman depan akan berubah menjadi tampilan maintenance dan tidak bisa diakses publik." 
        : "Website akan kembali normal dan dapat diakses oleh semua orang.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: newValue ? '#dc2626' : '#16a34a',
      cancelButtonColor: '#64748b',
      confirmButtonText: newValue ? 'Ya, Aktifkan!' : 'Ya, Matikan!',
      cancelButtonText: 'Batal'
    });

    if (result.isConfirmed) {
      Swal.fire({ title: 'Memproses...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
      
      try {
        const res = await fetch("/api/settings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key: "MAINTENANCE_MODE", value: newValue.toString() })
        });
        
        if (res.ok) {
          setMaintenanceMode(newValue);
          Swal.fire("Berhasil", `Mode Maintenance berhasil ${newValue ? 'diaktifkan' : 'dimatikan'}`, "success");
        } else {
          throw new Error("Gagal menyimpan pengaturan");
        }
      } catch (e) {
        Swal.fire("Error", "Gagal mengubah mode maintenance", "error");
      }
    }
  };

  if (loading) {
    return <div className="p-8 text-center">Memuat...</div>;
  }

  return (
    <div>
      <Topbar title="Mode Maintenance" role={userRole} />
      <div className="page-content">
        <div className="page-header">
          <div className="page-header-left">
            <h2>Pengaturan Akses Publik</h2>
            <p>Kelola status ketersediaan website untuk publik</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="card">
            <div className="card-body" style={{ padding: "32px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "24px" }}>
                <div style={{ 
                  width: "48px", 
                  height: "48px", 
                  borderRadius: "12px", 
                  background: maintenanceMode ? "var(--danger-lt)" : "var(--success-lt)", 
                  display: "flex", 
                  justifyContent: "center", 
                  alignItems: "center",
                  color: maintenanceMode ? "var(--danger)" : "var(--success)"
                }}>
                  {maintenanceMode ? <ShieldAlert size={24} /> : <ShieldCheck size={24} />}
                </div>
                <div>
                  <h3 style={{ fontSize: "18px", fontWeight: "700", color: "var(--navy)" }}>Status Saat Ini</h3>
                  <p style={{ fontSize: "14px", color: "var(--gray)" }}>
                    Website sedang dalam mode {maintenanceMode ? "PERBAIKAN" : "NORMAL"}
                  </p>
                </div>
              </div>

              <div style={{ 
                padding: "20px", 
                borderRadius: "12px", 
                background: "var(--bg)", 
                border: "1px solid var(--border)",
                marginBottom: "24px"
              }}>
                <p style={{ fontSize: "14px", lineHeight: "1.6", color: "var(--slate)" }}>
                  {maintenanceMode 
                    ? "Mode perbaikan sedang AKTIF. Pengunjung umum akan melihat halaman 'Sedang Dalam Perbaikan' saat mengakses website ini. Hanya administrator yang dapat mengakses dashboard."
                    : "Website dapat diakses secara normal oleh publik. Semua fitur pendaftaran, artikel, dan berita tersedia untuk umum."}
                </p>
              </div>

              <button 
                onClick={toggleMaintenance}
                className={`btn ${maintenanceMode ? "btn-success" : "btn-danger"}`}
                style={{ width: "100%", padding: "14px", borderRadius: "10px", fontWeight: "700", fontSize: "15px" }}
              >
                {maintenanceMode ? "Matikan Mode Maintenance" : "Aktifkan Mode Maintenance"}
              </button>
            </div>
          </div>

          <div className="card">
            <div className="card-body" style={{ padding: "32px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "20px" }}>
                <div style={{ 
                  width: "40px", 
                  height: "40px", 
                  borderRadius: "10px", 
                  background: "var(--primary-lt)", 
                  display: "flex", 
                  justifyContent: "center", 
                  alignItems: "center",
                  color: "var(--primary)"
                }}>
                  <Clock size={20} />
                </div>
                <h3 style={{ fontSize: "16px", fontWeight: "700", color: "var(--navy)" }}>Informasi Penting</h3>
              </div>
              
              <ul style={{ padding: 0, margin: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: "12px" }}>
                {[
                  "Aktifkan mode ini saat sedang melakukan update besar atau migrasi database.",
                  "Mode ini tidak berpengaruh pada akses login Administrator.",
                  "Perubahan status akan langsung berdampak pada seluruh pengunjung secara real-time.",
                  "Pastikan untuk mematikan mode ini setelah proses pemeliharaan selesai."
                ].map((tip, i) => (
                  <li key={i} style={{ display: "flex", gap: "10px", fontSize: "13px", color: "var(--gray)" }}>
                    <span style={{ color: "var(--primary)", fontWeight: "bold" }}>•</span>
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
