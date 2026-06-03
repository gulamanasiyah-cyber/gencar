"use client";



import { useState, useEffect } from "react";
import Swal from "sweetalert2";
import Link from "next/link";
import { Calendar, Clock, MapPin, ExternalLink } from "lucide-react";
import PhotoUpload from "@/components/mandiri/PhotoUpload";


interface Desa { id: number; nama: string; kota: string; }
interface Kelompok { id: number; nama: string; }

export default function MandiriDaftarPage() {
  const [form, setForm] = useState({
    nama: "",
    jenisKelamin: "L",
    tempatLahir: "",
    tanggalLahir: "",
    alamat: "",
    noTelp: "",
    pendidikan: "",
    pekerjaan: "",
    statusNikah: "Belum Menikah",
    hobi: "",
    makananMinumanFavorit: "",
    suku: "",
    foto: "",
    mandiriDesaId: "",
    mandiriKelompokId: "",
    instagram: "",
  });

  const [daerahList, setDaerahList] = useState<Desa[]>([]);
  const [desaList, setDesaList] = useState<Kelompok[]>([]);
  const [filteredDaerahList, setFilteredDaerahList] = useState<Desa[]>([]);
  const [filteredDesaList, setFilteredDesaList] = useState<Kelompok[]>([]);
  const [kotaList, setKotaList] = useState<string[]>([]);
  const [selectedKota, setSelectedKota] = useState("");
  const [loading, setLoading] = useState(false);

  const [success, setSuccess] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [isClosed, setIsClosed] = useState(false);
  const [regStatus, setRegStatus] = useState("1");
  const [regTitle, setRegTitle] = useState("");
  const [regDesc, setRegDesc] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [siteLogo, setSiteLogo] = useState<string | null>(null);


  useEffect(() => {
    if (typeof window !== 'undefined') {
      const handleLogoUpdate = () => {
        setSiteLogo((window as any).__SITE_LOGO__ || null);
      };
      handleLogoUpdate();
      window.addEventListener('site-logo-updated', handleLogoUpdate);
      return () => window.removeEventListener('site-logo-updated', handleLogoUpdate);
    }
  }, []);

  useEffect(() => {
    fetch("/api/public/mandiri/settings?key=mandiri_registration_status")
      .then(r => r.json())
      .then(d => {
        setRegStatus(d.value ?? "1");
        if (d.value === "0") {
          setIsClosed(true);
        }
      });

    fetch("/api/public/mandiri/settings?key=mandiri_registration_title")
      .then(r => r.json())
      .then(d => {
        if (d.value) setRegTitle(d.value);
      });

    fetch("/api/public/mandiri/settings?key=mandiri_registration_description")
      .then(r => r.json())
      .then(d => {
        if (d.value) setRegDesc(d.value);
      });

    Promise.all([
      fetch("/api/public/mandiri/desa").then((r) => r.json()),
      fetch("/api/public/mandiri/kelompok").then((r) => r.json()),
    ]).then(([daerahs, desas]) => {
      if (Array.isArray(daerahs)) {
        setDaerahList(daerahs);
        const cities = Array.from(new Set(daerahs.map((d: any) => d.kota))).sort() as string[];
        setKotaList(cities);
      }
      if (Array.isArray(desas)) setDesaList(desas);
    });
  }, []);


  const renderTextWithLinks = (text: string) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);
    return parts.map((part, i) => {
      if (part.match(urlRegex)) {
        return <a key={i} href={part} target="_blank" rel="noopener noreferrer" style={{ color: "#3b82f6", textDecoration: "underline" }}>{part}</a>;
      }
      return part;
    });
  };

  const renderEnhancedDescription = (text: string) => {
    if (!text) return null;

    // Check if it contains our markers
    const markers = ["Tanggal Acara :", "Waktu Acara :", "Tempat Acara :"];
    const hasMarkers = markers.some(m => text.includes(m));

    if (!hasMarkers) {
      return (
        <div style={{ fontSize: "14px", color: "var(--text-muted)", lineHeight: "1.6", padding: "0 10px" }}>
          {renderTextWithLinks(text)}
        </div>
      );
    }

    let mainText = text;
    let firstMarkerIndex = -1;
    markers.forEach(m => {
      const idx = text.indexOf(m);
      if (idx !== -1 && (firstMarkerIndex === -1 || idx < firstMarkerIndex)) {
        firstMarkerIndex = idx;
      }
    });

    if (firstMarkerIndex !== -1) {
      mainText = text.substring(0, firstMarkerIndex).trim();
    }

    // Extracting details using regex
    const dateMatch = text.match(/Tanggal Acara\s*:\s*(.*?)(?=\s*(?:Waktu Acara|Tempat Acara|https?:\/\/|$))/);
    const timeMatch = text.match(/Waktu Acara\s*:\s*(.*?)(?=\s*(?:Tanggal Acara|Tempat Acara|https?:\/\/|$))/);
    const placeMatch = text.match(/Tempat Acara\s*:\s*(.*?)(?=\s*(?:Tanggal Acara|Waktu Acara|https?:\/\/|$))/);
    const urlMatch = text.match(/(https?:\/\/[^\s]+)/);

    const details = [];
    if (dateMatch) details.push({ icon: Calendar, label: "Tanggal", value: dateMatch[1].trim() });
    if (timeMatch) details.push({ icon: Clock, label: "Waktu", value: timeMatch[1].trim() });
    if (placeMatch) details.push({ icon: MapPin, label: "Tempat", value: placeMatch[1].trim() });

    return (
      <div style={{ textAlign: 'left' }}>
        <p style={{
          fontSize: "14px",
          color: "var(--text-muted)",
          lineHeight: "1.6",
          padding: "0 10px",
          textAlign: 'center',
          marginBottom: '20px'
        }}>
          {mainText}
        </p>

        <div style={{
          background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
          borderRadius: '20px',
          padding: '20px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05)',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          margin: '0 10px'
        }}>
          {details.map((item, i) => (
            <div key={i} style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
              <div style={{
                background: '#eff6ff',
                padding: '10px',
                borderRadius: '12px',
                color: '#3b82f6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 6px -1px rgba(59, 130, 246, 0.1)'
              }}>
                <item.icon size={18} />
              </div>
              <div style={{ flex: 1 }}>
                <p style={{
                  fontSize: '11px',
                  fontWeight: '800',
                  color: '#94a3b8',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  marginBottom: '2px',
                  marginTop: 0
                }}>
                  {item.label}
                </p>
                <p style={{
                  fontSize: '14px',
                  color: '#1e293b',
                  fontWeight: '600',
                  margin: 0,
                  lineHeight: '1.4'
                }}>
                  {item.value}
                </p>
              </div>
            </div>
          ))}

          {urlMatch && (
            <button
              type="button"
              onClick={() => {
                const rawUrl = urlMatch[1];
                const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
                const isAndroid = /Android/i.test(navigator.userAgent);

                // Extract coordinates from URL (e.g., @-7.123,112.456 or ll= or q=)
                const coordMatch =
                  rawUrl.match(/@([-\d.]+),([-\d.]+)/) ||
                  rawUrl.match(/[?&]ll=([-\d.]+),([-\d.]+)/) ||
                  rawUrl.match(/[?&]q=([-\d.]+),([-\d.]+)/);

                // Use the Tempat Acara value as the place search query
                const placeName = placeMatch ? placeMatch[1].trim() : null;

                if (coordMatch) {
                  const lat = coordMatch[1];
                  const lng = coordMatch[2];
                  const label = encodeURIComponent(placeName || 'Lokasi Acara');

                  if (isIOS) {
                    // comgooglemaps:// is the native scheme — Google Maps app handles it correctly
                    // Fallback to Apple Maps after 500ms if app not installed
                    window.location.href = `comgooglemaps://?q=${lat},${lng}&zoom=15`;
                    setTimeout(() => {
                      window.open(`https://maps.apple.com/?q=${lat},${lng}&ll=${lat},${lng}`, '_blank');
                    }, 600);
                  } else if (isAndroid) {
                    // geo: URI is handled natively by any Maps app on Android
                    window.location.href = `geo:${lat},${lng}?q=${lat},${lng}(${label})`;
                  } else {
                    window.open(
                      `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`,
                      '_blank',
                      'noopener,noreferrer'
                    );
                  }
                } else if (placeName) {
                  // No coordinates found — use place name to search directly via native scheme
                  // This AVOIDS Universal Link interception (maps.app.goo.gl → Maps app rejection)
                  const encodedPlace = encodeURIComponent(placeName);

                  if (isIOS) {
                    window.location.href = `comgooglemaps://?q=${encodedPlace}`;
                  } else if (isAndroid) {
                    window.location.href = `geo:0,0?q=${encodedPlace}`;
                  } else {
                    window.open(
                      `https://www.google.com/maps/search/?api=1&query=${encodedPlace}`,
                      '_blank',
                      'noopener,noreferrer'
                    );
                  }
                } else {
                  // Last resort: open raw URL in new tab (desktop or unknown device)
                  window.open(rawUrl, '_blank', 'noopener,noreferrer');
                }
              }}
              style={{
                marginTop: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                background: '#3b82f6',
                color: 'white',
                padding: '12px 16px',
                borderRadius: '12px',
                fontSize: '14px',
                fontWeight: '700',
                textDecoration: 'none',
                justifyContent: 'center',
                transition: 'all 0.2s ease',
                boxShadow: '0 4px 12px rgba(59, 130, 246, 0.25)',
                border: 'none',
                cursor: 'pointer',
                width: '100%'
              }}
              onMouseOver={(e) => e.currentTarget.style.background = '#2563eb'}
              onMouseOut={(e) => e.currentTarget.style.background = '#3b82f6'}
            >
              <ExternalLink size={16} /> Lihat Lokasi di Maps
            </button>
          )}
        </div>
      </div>
    );
  };

  useEffect(() => {
    if (selectedKota) {
      setFilteredDaerahList(daerahList.filter(d => d.kota === selectedKota));
    } else {
      setFilteredDaerahList([]);
    }
    setForm(prev => ({ ...prev, mandiriDesaId: "", mandiriKelompokId: "" }));
  }, [selectedKota, daerahList]);

  useEffect(() => {
    if (form.mandiriDesaId) {
      setFilteredDesaList(desaList.filter((d: any) => d.mandiriDesaId === Number(form.mandiriDesaId)));
    } else {
      setFilteredDesaList([]);
    }
  }, [form.mandiriDesaId, desaList]);

  const handleChange = (e: any) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (!form.nama || !form.jenisKelamin || !form.mandiriDesaId || !form.tempatLahir || !form.tanggalLahir || !form.noTelp || !form.pendidikan || !form.pekerjaan || !form.hobi || !form.makananMinumanFavorit) {
        Swal.fire({ icon: "warning", title: "Data Belum Lengkap", text: "Mohon lengkapi semua data wajib yang bertanda bintang (*)." });
        setLoading(false);
        return;
      }

      const cleanNoTelp = form.noTelp.replace(/\D/g, "");
      if (cleanNoTelp.length < 11) {
        Swal.fire({ icon: "warning", title: "Nomor Telepon Tidak Valid", text: "Nomor telepon/WhatsApp minimal harus 11 atau 12 angka." });
        setLoading(false);
        return;
      }

      if (!form.foto) {
        Swal.fire({ icon: "warning", title: "Foto Belum Ada", text: "Mohon ambil foto atau unggah foto Anda terlebih dahulu." });
        setLoading(false);
        return;
      }

      const res = await fetch("/api/public/mandiri/registrasi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();

      if (data.isAlreadyRegistered) {
        setSuccess(true);
        setResult({ ...data, alreadyExists: true });
        Swal.fire({ icon: "info", title: "Sudah Terdaftar", text: "Anda sudah terdaftar sebagai peserta sebelumnya." });
        return;
      }

      if (!res.ok) throw new Error(data.error || "Gagal mendaftar");
      setSuccess(true);
      setResult(data);
      Swal.fire({ icon: "success", title: "Berhasil!", text: "Data Anda telah tercatat." });
    } catch (err: any) {
      Swal.fire({ icon: "error", title: "Gagal", text: err.message });
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <WaitingRoom result={result} />
    );
  }

  function WaitingRoom({ result }: { result: any }) {
    const [status, setStatus] = useState<string>("waiting");
    const [kegiatanJudul, setKegiatanJudul] = useState<string>("");

    useEffect(() => {
      if (!result?.nomorUnik) return;

      const checkStatus = async () => {
        try {
          let deviceId = localStorage.getItem("mandiri_device_id");
          if (!deviceId) {
            deviceId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
            localStorage.setItem("mandiri_device_id", deviceId);
          }
          const res = await fetch(`/api/public/mandiri/katalog/check-status?nomorUnik=${result.nomorUnik}&deviceId=${deviceId}`);
          const data = await res.json();
          if (data.status === "attended") {
            setStatus("attended");
            setKegiatanJudul(data.kegiatanJudul);
            localStorage.setItem("attended_nomor_unik", data.nomorUnik || result.nomorUnik);
            localStorage.setItem("attended_session_token", data.sessionToken);
            Swal.fire({
              icon: "success",
              title: "Konfirmasi Berhasil!",
              text: `Kehadiran Anda di "${data.kegiatanJudul}" telah dicatat. Anda sekarang dapat mengakses katalog.`,
              confirmButtonText: "Buka Katalog",
              timer: 5000,
              timerProgressBar: true
            });
          }
        } catch (err) {
          console.error("Polling error:", err);
        }
      };

      const interval = setInterval(() => {
        if (status !== "attended") checkStatus();
      }, 3000);

      return () => clearInterval(interval);
    }, [result, status]);

    const handleDownload = async () => {
      const url = `https://api.qrserver.com/v1/create-qr-code/?size=1000x1000&data=${result?.nomorUnik}&margin=10`;
      try {
        const response = await fetch(url);
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = blobUrl;
        link.download = `QR_PESERTA_${result?.nomorUrut}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(blobUrl);
      } catch (error) {
        console.error("Download error:", error);
        alert("Gagal mengunduh QR Code.");
      }
    };

    return (
      <div className="auth-page">
        <div className="auth-card" style={{ maxWidth: "500px", textAlign: "center" }}>
          <div style={{ fontSize: "60px", marginBottom: "20px" }}>👋</div>
          <h2 style={{ marginBottom: "10px" }}>Pendaftaran Sukses!</h2>
          <p style={{ color: "var(--text-muted)", marginBottom: "24px" }}>
            Pendaftaran Berhasil! Silakan tunjukkan <b>Barcode</b> atau <b>Nomor Unik</b> ini di meja panitia (Admin Romantic Room) untuk melakukan konfirmasi kehadiran (absensi).
          </p>

          <div style={{ background: "white", padding: "30px", borderRadius: "16px", border: "2px dashed #3b82f6", marginBottom: "24px", position: "relative" }}>
            <p style={{ fontSize: "11px", color: "#64748b", margin: "0 0 8px 0", textTransform: "uppercase", fontWeight: "700", letterSpacing: "1px" }}>Nomor Peserta</p>
            <h3 style={{ fontSize: "42px", color: "var(--primary)", letterSpacing: "2px", margin: "0 0 5px 0", fontWeight: "900" }}>#{result?.nomorUrut}</h3>
            <p style={{ fontSize: "14px", color: "#3b82f6", fontWeight: "800", marginBottom: "20px", background: "#eff6ff", display: "inline-block", padding: "4px 12px", borderRadius: "20px" }}>ID Login: {result?.nomorUnik}</p>

            {/* QR Code Section */}
            <div style={{
              background: "#f8fafc",
              padding: "20px",
              borderRadius: "24px",
              border: "1px solid #e2e8f0",
              display: "inline-flex",
              flexDirection: "column",
              alignItems: "center",
              boxShadow: "0 15px 30px rgba(0,0,0,0.05)"
            }}>
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${result?.nomorUnik}&margin=10`}
                alt="QR Code Peserta"
                style={{ width: "220px", height: "220px", borderRadius: "12px", border: "4px solid white" }}
              />
              <button
                onClick={handleDownload}
                style={{
                  marginTop: "16px",
                  background: "white",
                  border: "1px solid #e2e8f0",
                  padding: "8px 16px",
                  borderRadius: "8px",
                  fontSize: "12px",
                  fontWeight: "700",
                  color: "#3b82f6",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px"
                }}
              >
                💾 Simpan Kode QR
              </button>
            </div>

            {status === "attended" ? (
              <div style={{ marginTop: "20px", fontSize: "14px", background: "#dcfce7", color: "#166534", padding: "10px 20px", borderRadius: "8px", display: "inline-flex", alignItems: "center", gap: "8px", fontWeight: "700" }}>
                ✅ Terkonfirmasi (Hadir)
              </div>
            ) : (
              <div style={{ marginTop: "20px", fontSize: "12px", background: "#fef3c7", color: "#92400e", padding: "8px 16px", borderRadius: "8px", display: "inline-block" }}>
                <b>Status:</b> Menunggu Konfirmasi Panitia...
              </div>
            )}
          </div>

          <p style={{ fontSize: "14px", color: "var(--text-muted)", background: "#f8fafc", padding: "16px", borderRadius: "12px", lineHeight: "1.6", border: "1px solid #e2e8f0" }}>
            Setelah selesai melakukan absensi di meja admin, silakan klik tombol di bawah ini lalu login menggunakan <b>Nomor Unik (ID Login)</b> Anda untuk mengakses katalog.
          </p>

          <Link href="/mandiri/katalog" className="btn btn-primary btn-full" style={{ marginTop: "24px", padding: "15px", fontSize: "16px", fontWeight: "700" }}>
            Buka Katalog Peserta
          </Link>
        </div>
      </div>
    );
  }

  if (isClosed) {
    return (
      <div className="auth-page">
        <div className="auth-card" style={{ maxWidth: "500px", textAlign: "center" }}>
          <div style={{ fontSize: "60px", marginBottom: "20px" }}>⌛</div>
          <h2 style={{ marginBottom: "10px" }}>Pendaftaran Ditutup</h2>
          <p style={{ color: "var(--text-muted)", marginBottom: "24px" }}>
            Mohon maaf, pendaftaran saat ini sedang ditutup secara manual oleh admin.
          </p>
          <p style={{ fontSize: "13px", color: "var(--text-muted)" }}>
            Silakan hubungi pengurus setempat untuk informasi lebih lanjut.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page" style={{ padding: "40px 20px" }}>
      <div className="auth-card" style={{ maxWidth: "600px" }}>
        <div className="auth-logo" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginBottom: '20px' }}>
          {siteLogo && (
            <img src={siteLogo} alt="Logo" style={{ width: "40px", height: "40px", objectFit: "contain" }} />
          )}
          <div style={{ textAlign: 'left' }}>
            <h1 style={{ margin: 0, lineHeight: 1 }}>GENCAR BERKARYA</h1>
            <p style={{ margin: 0, fontSize: '11px' }}>Sistem Manajemen Mandiri JB2</p>
          </div>
        </div>
        <div style={{ marginBottom: "24px", textAlign: "center" }}>
          <h2 style={{
            fontSize: "1.5rem",
            fontWeight: "800",
            color: "var(--text)",
            marginBottom: "12px",
            lineHeight: "1.3"
          }}>
            {regTitle || ""}
          </h2>
          {regDesc ? (
            renderEnhancedDescription(regDesc)
          ) : (
            <p style={{ fontSize: "14px", color: "var(--text-muted)" }}>

            </p>
          )}


        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            <div className="form-group" style={{ textAlign: "center" }}>
              <PhotoUpload 
                value={form.foto} 
                onChange={(url) => setForm(prev => ({ ...prev, foto: url }))}
                helperText="Kirim foto yang terbaik & terbaru, foto bebas, dan muka tampak jelas (tidak tertutup masker)"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Nama Lengkap <span className="required">*</span></label>
              <input name="nama" className="form-control" value={form.nama} onChange={handleChange} required placeholder="Masukkan nama lengkap" />
              <p style={{ fontSize: "10.5px", color: "var(--text-muted)", marginTop: "4px" }}>
                Contoh Format Penulisan: Raka Gladhi Pratama (Tanpa disingkat dan huruf kapital pada setiap awal kata)
              </p>
            </div>

            <div className="form-group">
              <label className="form-label">Jenis Kelamin <span className="required">*</span></label>
              <select name="jenisKelamin" className="form-control" value={form.jenisKelamin} onChange={handleChange} required>
                <option value="L">Laki-laki</option>
                <option value="P">Perempuan</option>
              </select>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Kota Tempat Lahir <span className="required">*</span></label>
                <input name="tempatLahir" className="form-control" value={form.tempatLahir} onChange={handleChange} required placeholder="Kota kelahiran" />
              </div>
              <div className="form-group">
                <label className="form-label">Tanggal Lahir <span className="required">*</span></label>
                <input name="tanggalLahir" type="date" className="form-control" value={form.tanggalLahir} onChange={handleChange} required />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              <div className="form-group">
                <label className="form-label">Daerah <span className="required">*</span></label>
                <select className="form-control" value={selectedKota} onChange={(e) => setSelectedKota(e.target.value)} required>
                  <option value="">Pilih Daerah</option>
                  {kotaList.map(k => <option key={k} value={k}>{k}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Desa <span className="required">*</span></label>
                <select name="mandiriDesaId" className="form-control" value={form.mandiriDesaId} onChange={(e) => {
                  handleChange(e);
                  setForm(prev => ({ ...prev, mandiriKelompokId: "" }));
                }} required disabled={!selectedKota}>
                  <option value="">Pilih Desa</option>
                  {filteredDaerahList.map(d => <option key={d.id} value={d.id}>{d.nama}</option>)}
                </select>
              </div>

            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">No. Telepon / WhatsApp <span className="required">*</span></label>
                <input name="noTelp" className="form-control" value={form.noTelp} onChange={handleChange} required placeholder="08xx-xxxx-xxxx" />
                <p style={{ fontSize: "10.5px", color: "var(--text-muted)", marginTop: "4px", lineHeight: "1.3" }}>
                  Minimal 11 atau 12 angka. Nomor ini tidak akan disebarluaskan, hanya digunakan untuk keperluan kordinasi antara panitia dengan peserta.
                </p>
              </div>
              <div className="form-group">
                <label className="form-label">Pendidikan Terakhir <span className="required">*</span></label>
                <input name="pendidikan" className="form-control" value={form.pendidikan} onChange={handleChange} required placeholder="S1/SMA/dll" />
                <p style={{ fontSize: "10.5px", color: "var(--text-muted)", marginTop: "4px" }}>
                  Contoh Penulisan: S1 - Psikologi atau SMA - IPA
                </p>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Pekerjaan <span className="required">*</span></label>
                <input name="pekerjaan" className="form-control" value={form.pekerjaan} onChange={handleChange} required placeholder="Pekerjaan saat ini" />
              </div>
              <div className="form-group">
                <label className="form-label">Suku <span className="required">*</span></label>
                <input name="suku" className="form-control" value={form.suku} onChange={handleChange} required placeholder="Betawi / Jawa / dll" />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Hobi <span className="required">*</span></label>
                <input name="hobi" className="form-control" value={form.hobi} onChange={handleChange} required placeholder="Hobi anda" />
              </div>
              <div className="form-group">
                <label className="form-label">Favorit Makanan/Minuman <span className="required">*</span></label>
                <input name="makananMinumanFavorit" className="form-control" value={form.makananMinumanFavorit} onChange={handleChange} required placeholder="Sate / Jus / dll" />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Akun Instagram (Opsional)</label>
              <div style={{ display: "flex", alignItems: "center", position: "relative" }}>
                <span style={{ position: "absolute", left: "10px", color: "var(--text-muted)" }}>@</span>
                <input
                  name="instagram"
                  className="form-control"
                  value={form.instagram}
                  onChange={handleChange}
                  placeholder="username_kamu"
                  style={{ paddingLeft: "30px" }}
                />
              </div>
              <p style={{ fontSize: "10.5px", color: "var(--text-muted)", marginTop: "4px" }}>
                Gunakan username Instagram tanpa simbol @.
              </p>
            </div>

            <div className="form-group">
              <label className="form-label">Alamat Lengkap</label>
              <textarea name="alamat" className="form-control" value={form.alamat} onChange={handleChange} placeholder="Alamat saat ini (opsional)" />
            </div>

            <div className="form-group" style={{ padding: "15px", background: "#f8fafc", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
              <div style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
                <input
                  type="checkbox"
                  id="agree-check"
                  style={{ transform: "scale(1.2)", marginTop: "3px" }}
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  required
                />
                <label htmlFor="agree-check" style={{ fontSize: "12.5px", cursor: "pointer", fontWeight: "600" }}>
                  Saya menyatakan Setuju & Sanggup:
                </label>
              </div>
              <ol style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "10px", paddingLeft: "35px", marginBottom: 0, lineHeight: "1.6" }}>
                <li>Sanggup mengikuti seluruh rangkaian acara dan menaati aturannya.</li>
                <li>Menyetujui penyebarluasan data diri kepada Tim PNKB dan Peserta PDKT 2.0 untuk keperluan acara.</li>
              </ol>
            </div>

            <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading || !agreed}>
              {loading ? "Memproses..." : "Kirim Pendaftaran"}
            </button>

            <p style={{ textAlign: "center", fontSize: "12px", color: "var(--text-muted)" }}>
              Dengan mengeklik tombol di atas, Anda menyatakan bahwa data yang diberikan adalah benar.
            </p>
          </div>
        </form>
      </div>

      {/* Removed orphaned camera block */}
    </div>
  );
}

