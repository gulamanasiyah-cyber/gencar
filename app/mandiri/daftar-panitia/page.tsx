"use client";




import { useState, useEffect } from "react";
import Swal from "sweetalert2";
import Link from "next/link";
import { Calendar, Clock, MapPin, ExternalLink } from "lucide-react";
import PhotoUpload from "@/components/mandiri/PhotoUpload";
import QRCode from "qrcode";


interface Desa { id: number; nama: string; kota: string; }
interface Kelompok { id: number; nama: string; }

export default function PanitiaDaftarPage() {
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
    anakKe: "",
    jumlahSaudara: "",
    tinggiBadan: "",
    foto: "",
    mandiriDesaId: "",
    mandiriKelompokId: "",
    instagram: "",
    kriteriaPasangan: "",
    dapukan: "Panitia",
    statusHaid: "Tidak",
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
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [isClosed, setIsClosed] = useState(false);
  const [regTitle, setRegTitle] = useState("");
  const [regDesc, setRegDesc] = useState("");
  const [regLocation, setRegLocation] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [regGender, setRegGender] = useState("Semua");
  const [siteLogo, setSiteLogo] = useState<string | null>(null);
  const [haidKeterangan, setHaidKeterangan] = useState("");

  useEffect(() => {
    if (!result?.nomorUnik) return;
    QRCode.toDataURL(result.nomorUnik, { margin: 2, width: 400 })
      .then(url => setQrDataUrl(url))
      .catch(err => console.error("Error generating QR code:", err));
  }, [result]);


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
    Promise.all([
      fetch("/api/public/mandiri/settings?key=mandiri_panitia_registration_status").then(r => r.json()),
      fetch("/api/public/mandiri/settings?key=mandiri_registration_status").then(r => r.json()),
      fetch("/api/public/mandiri/settings?key=mandiri_registration_title").then(r => r.json()),
      fetch("/api/public/mandiri/settings?key=mandiri_registration_description").then(r => r.json()),
      fetch("/api/public/mandiri/settings?key=mandiri_registration_gender").then(r => r.json()),
      fetch("/api/public/mandiri/settings?key=mandiri_registration_location").then(r => r.json()),
      fetch("/api/public/mandiri/settings?key=mandiri_haid_keterangan").then(r => r.json()),
      fetch("/api/public/mandiri/desa").then((r) => r.json()),
      fetch("/api/public/mandiri/kelompok").then((r) => r.json()),
    ]).then(([panitiaStatus, mainStatus, title, desc, gender, loc, haidKet, daerahs, desas]) => {
      if (panitiaStatus.value === "0" || mainStatus.value === "0") {
        setIsClosed(true);
      }
      if (title?.value) setRegTitle(title.value);
      if (desc?.value) setRegDesc(desc.value);
      if (loc?.value) setRegLocation(loc.value);
      if (haidKet?.value) setHaidKeterangan(haidKet.value);
      if (gender?.value) {
        setRegGender(gender.value);
        if (gender.value === "Laki-laki") setForm(prev => ({ ...prev, jenisKelamin: "L" }));
        else if (gender.value === "Perempuan") setForm(prev => ({ ...prev, jenisKelamin: "P" }));
      }
      if (Array.isArray(daerahs)) {
        setDaerahList(daerahs);
        const cities = Array.from(new Set(daerahs.map((d: any) => d.kota))).sort() as string[];
        setKotaList(cities);
      }
      if (Array.isArray(desas)) setDesaList(desas);
    });
  }, []);


  const renderTextWithLinks = (text: string) => {
    if (!text) return text;
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);
    return parts.map((part, i) => {
      if (part.match(urlRegex)) {
        return (
          <a
            key={i}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "#3b82f6", textDecoration: "underline", fontWeight: 600 }}
          >
            {part}
          </a>
        );
      }
      return part;
    });
  };

  const handleOpenGmaps = (rawInput: string, placeName?: string | null) => {
    if (!rawInput) return;
    const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
    const isAndroid = /Android/i.test(navigator.userAgent);

    const cleanInput = rawInput.trim();
    const isUrl = cleanInput.startsWith("http://") || cleanInput.startsWith("https://");

    if (isUrl) {
      const coordMatch =
        cleanInput.match(/@([-\d.]+),([-\d.]+)/) ||
        cleanInput.match(/[?&]ll=([-\d.]+),([-\d.]+)/) ||
        cleanInput.match(/[?&]q=([-\d.]+),([-\d.]+)/);

      if (coordMatch) {
        const lat = coordMatch[1];
        const lng = coordMatch[2];
        const label = encodeURIComponent(placeName || 'Lokasi Acara');

        if (isIOS) {
          window.location.href = `comgooglemaps://?q=${lat},${lng}&zoom=15`;
          setTimeout(() => {
            window.open(`https://maps.apple.com/?q=${lat},${lng}&ll=${lat},${lng}`, '_blank');
          }, 600);
        } else if (isAndroid) {
          window.location.href = `geo:${lat},${lng}?q=${lat},${lng}(${label})`;
        } else {
          window.open(`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`, '_blank', 'noopener,noreferrer');
        }
      } else if (placeName) {
        const encodedPlace = encodeURIComponent(placeName);
        if (isIOS) {
          window.location.href = `comgooglemaps://?q=${encodedPlace}`;
        } else if (isAndroid) {
          window.location.href = `geo:0,0?q=${encodedPlace}`;
        } else {
          window.open(`https://www.google.com/maps/search/?api=1&query=${encodedPlace}`, '_blank', 'noopener,noreferrer');
        }
      } else {
        window.open(cleanInput, '_blank', 'noopener,noreferrer');
      }
    } else {
      const encodedPlace = encodeURIComponent(cleanInput);
      if (isIOS) {
        window.location.href = `comgooglemaps://?q=${encodedPlace}`;
      } else if (isAndroid) {
        window.location.href = `geo:0,0?q=${encodedPlace}`;
      } else {
        window.open(`https://www.google.com/maps/search/?api=1&query=${encodedPlace}`, '_blank', 'noopener,noreferrer');
      }
    }
  };

  const renderEnhancedDescription = (text: string) => {
    if (!text && !regLocation) return null;

    let rawGmapsLoc = regLocation;
    let gmapsMatch = (text || "").match(/Link Gmaps\s*:\s*([^\n]+)/i);
    if (gmapsMatch && gmapsMatch[1]) {
      if (!rawGmapsLoc) rawGmapsLoc = gmapsMatch[1].trim();
    }

    let cleanText = (text || "").replace(/Link Gmaps\s*:\s*[^\n]*/gi, "").trim();
    const urlMatch = cleanText.match(/(https?:\/\/[^\s]+)/);
    if (!rawGmapsLoc && urlMatch) {
      rawGmapsLoc = urlMatch[1];
    }

    const markers = ["Tanggal Acara :", "Waktu Acara :", "Tempat Acara :"];
    const hasMarkers = markers.some(m => cleanText.includes(m));

    if (!hasMarkers) {
      return (
        <div style={{ padding: "0 10px", textAlign: "center" }}>
          {cleanText && (
            <div style={{ fontSize: "14px", color: "var(--text-muted)", lineHeight: "1.6", marginBottom: rawGmapsLoc ? "16px" : "0" }}>
              {renderTextWithLinks(cleanText)}
            </div>
          )}
          {rawGmapsLoc && (
            <button
              type="button"
              onClick={() => handleOpenGmaps(rawGmapsLoc)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                background: '#3b82f6',
                color: 'white',
                padding: '12px 18px',
                borderRadius: '12px',
                fontSize: '14px',
                fontWeight: '700',
                textDecoration: 'none',
                justifyContent: 'center',
                margin: '10px auto 0 auto',
                boxShadow: '0 4px 12px rgba(59, 130, 246, 0.25)',
                border: 'none',
                cursor: 'pointer',
                width: '100%',
                maxWidth: '360px'
              }}
            >
              <ExternalLink size={16} /> Lihat Lokasi di Google Maps
            </button>
          )}
        </div>
      );
    }

    let mainText = cleanText;
    let firstMarkerIndex = -1;
    markers.forEach(m => {
      const idx = cleanText.indexOf(m);
      if (idx !== -1 && (firstMarkerIndex === -1 || idx < firstMarkerIndex)) {
        firstMarkerIndex = idx;
      }
    });

    if (firstMarkerIndex !== -1) {
      mainText = cleanText.substring(0, firstMarkerIndex).trim();
    }

    const dateMatch = cleanText.match(/Tanggal Acara\s*:\s*(.*?)(?=\s*(?:Waktu Acara|Tempat Acara|https?:\/\/|$))/);
    const timeMatch = cleanText.match(/Waktu Acara\s*:\s*(.*?)(?=\s*(?:Tanggal Acara|Tempat Acara|https?:\/\/|$))/);
    const placeMatch = cleanText.match(/Tempat Acara\s*:\s*(.*?)(?=\s*(?:Tanggal Acara|Waktu Acara|https?:\/\/|$))/);

    const details = [];
    if (dateMatch) details.push({ icon: Calendar, label: "Tanggal", value: dateMatch[1].trim() });
    if (timeMatch) details.push({ icon: Clock, label: "Waktu", value: timeMatch[1].trim() });
    if (placeMatch) details.push({ icon: MapPin, label: "Tempat", value: placeMatch[1].trim() });

    const effectiveGmapsTarget = rawGmapsLoc || (urlMatch ? urlMatch[1] : null);

    return (
      <div style={{ textAlign: 'left' }}>
        {mainText && (
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
        )}

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

          {effectiveGmapsTarget && (
            <button
              type="button"
              onClick={() => handleOpenGmaps(effectiveGmapsTarget, placeMatch ? placeMatch[1].trim() : null)}
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
              <ExternalLink size={16} /> Lihat Lokasi di Google Maps
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

  const showHaidPopup = (customText?: string) => {
    const textToShow = customText || haidKeterangan || "Bagi peserta yang sedang haid/berhalangan, silakan melapor ke panitia untuk lokasi pos berhalangan.";
    Swal.fire({
      title: "🌸 Arahan Tempat Peserta Haid",
      html: `<div style="text-align: left; background: #fff1f2; padding: 16px; border-radius: 12px; border: 1px solid #fecdd3; color: #9f1239; font-size: 14px; line-height: 1.6; font-weight: 500;">${textToShow}</div>`,
      icon: "info",
      confirmButtonText: "Saya Mengerti",
      confirmButtonColor: "#e11d48",
    });
  };

  const handleChange = (e: any) => {
    const { name, value } = e.target;
    setForm((prev) => {
      const updated = { ...prev, [name]: value };
      if (name === "statusHaid" && value === "Ya" && updated.jenisKelamin === "P") {
        setTimeout(() => showHaidPopup(), 150);
      } else if (name === "jenisKelamin" && value === "P" && updated.statusHaid === "Ya") {
        setTimeout(() => showHaidPopup(), 150);
      }
      return updated;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (!form.nama || !form.jenisKelamin || !form.mandiriDesaId || !form.mandiriKelompokId || !form.tempatLahir || !form.tanggalLahir || !form.noTelp || !form.pendidikan || !form.pekerjaan || !form.hobi || !form.anakKe || !form.jumlahSaudara || !form.tinggiBadan) {
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

      const res = await fetch("/api/public/mandiri/registrasi-panitia", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Gagal mendaftar");
      setSuccess(true);
      setResult(data);
      await Swal.fire({
        icon: "success",
        title: "Berhasil!",
        text: "Data Anda sebagai Panitia telah tercatat.",
        confirmButtonColor: "#3b82f6",
        confirmButtonText: "Oke"
      });

      // Generate PDF Automatically
      try {
        Swal.fire({
          title: "Membuat PDF...",
          text: "Mohon tunggu sebentar.",
          allowOutsideClick: false,
          didOpen: () => {
            Swal.showLoading();
          }
        });

        const { jsPDF } = await import("jspdf");
        const doc = new jsPDF();

        doc.setFontSize(22);
        doc.setFont("helvetica", "bold");
        doc.text("Bukti Pendaftaran Panitia", 105, 30, { align: "center" });

        doc.setFontSize(12);
        doc.setFont("helvetica", "normal");
        doc.text(`Nama Kegiatan   : ${data.namaKegiatan || "Kegiatan Mandiri"}`, 20, 50);
        doc.text(`Nama Lengkap    : ${form.nama}`, 20, 60);
        doc.text(`Nomor Urut      : ${data.nomorUrut}`, 20, 70);
        doc.text(`Kode Unik Login : ${data.nomorUnik}`, 20, 80);

        let qrY = 100;
        if (form.jenisKelamin === "P" && form.statusHaid === "Ya") {
          doc.setTextColor(225, 29, 72);
          doc.setFont("helvetica", "bold");
          doc.text(`Status Haid      : Ya (Sedang Haid / Berhalangan)`, 20, 90);

          doc.setTextColor(159, 18, 57);
          doc.setFont("helvetica", "normal");
          doc.text(`Arahan Tempat   : ${haidKeterangan || "Silakan melapor ke panitia/Admin Romantic Room."}`, 20, 98);
          qrY = 112;
        }

        // Generate QR Code locally
        const QRCode = await import("qrcode");
        const qrDataUrl = await QRCode.toDataURL(data.nomorUnik, { margin: 2, width: 400 });
        doc.addImage(qrDataUrl, "PNG", 75, qrY, 60, 60);

        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text("Simpan file ini dan tunjukkan kepada panitia registrasi ulang.", 105, 170, { align: "center" });

        doc.setFontSize(11);
        doc.setTextColor(59, 130, 246);
        doc.text("Akses Katalog: https://gencar.my.id/mandiri/katalog", 105, 180, { align: "center" });
        doc.link(55, 175, 100, 8, { url: "https://gencar.my.id/mandiri/katalog" });

        doc.setFontSize(10);
        doc.setTextColor(100, 116, 139);
        doc.text("Tata Cara Buka Halaman Katalog:", 105, 190, { align: "center" });
        doc.setFontSize(9);
        doc.text("1. Buka link di atas melalui browser (HP/PC)", 105, 196, { align: "center" });
        doc.text("2. Masukkan Kode Unik Login Anda pada halaman login", 105, 202, { align: "center" });
        doc.text("3. Anda kini dapat mengakses data peserta", 105, 208, { align: "center" });

        doc.save(`Bukti_Panitia_${data.nomorUrut}_${form.nama.replace(/\s+/g, '_')}.pdf`);
        Swal.close();
      } catch (pdfErr) {
        console.error("Gagal membuat PDF:", pdfErr);
        Swal.fire({
          icon: "error",
          title: "Gagal Mengunduh PDF",
          text: "Terjadi kesalahan saat memproses data PDF."
        });
      }
    } catch (err: any) {
      Swal.fire({ icon: "error", title: "Gagal", text: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadBarcode = async () => {
    if (!result?.nomorUnik) return;
    try {
      const QRCode = await import("qrcode");
      const dataUrl = await QRCode.toDataURL(result.nomorUnik, { margin: 2, width: 1000 });
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = `QR_PANITIA_${result?.nomorUrut || 'BARCODE'}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Download error:", error);
      Swal.fire({ icon: "error", title: "Gagal", text: "Gagal mengunduh barcode." });
    }
  };

  if (success) {
    return (
      <div className="auth-page">
        <div className="auth-card" style={{ maxWidth: "500px", textAlign: "center" }}>
          <div style={{ fontSize: "60px", marginBottom: "20px" }}>👋</div>
          <h2 style={{ marginBottom: "10px" }}>Pendaftaran Sukses!</h2>
          <p style={{ color: "var(--text-muted)", marginBottom: "24px" }}>
            Pendaftaran Berhasil! Silakan tunjukkan <b>Barcode</b> atau <b>Nomor Unik</b> ini di meja panitia (Admin Romantic Room) untuk melakukan konfirmasi kehadiran (absensi).
          </p>

          <div style={{ background: "white", padding: "30px", borderRadius: "16px", border: "2px dashed #3b82f6", marginBottom: "24px", position: "relative" }}>
            <p style={{ fontSize: "11px", color: "#64748b", margin: "0 0 8px 0", textTransform: "uppercase", fontWeight: "700", letterSpacing: "1px" }}>Nomor Panitia</p>
            <h3 style={{ fontSize: "42px", color: "var(--primary)", letterSpacing: "2px", margin: "0 0 5px 0", fontWeight: "900" }}>#{result?.nomorUrut}</h3>
            <p style={{ fontSize: "14px", color: "#3b82f6", fontWeight: "800", marginBottom: "20px", background: "#eff6ff", display: "inline-block", padding: "4px 12px", borderRadius: "20px" }}>ID Login: {result?.nomorUnik}</p>

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
              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt="QR Code"
                  style={{ width: "220px", height: "220px", borderRadius: "12px", border: "4px solid white" }}
                />
              ) : (
                <div style={{ width: "220px", height: "220px", display: "flex", alignItems: "center", justifyContent: "center", color: "#64748b" }}>
                  Memuat QR Code...
                </div>
              )}
              <button
                onClick={handleDownloadBarcode}
                style={{
                  marginTop: "16px",
                  background: "white",
                  border: "1px solid #e2e8f0",
                  padding: "10px 20px",
                  borderRadius: "12px",
                  fontSize: "13px",
                  fontWeight: "700",
                  color: "#3b82f6",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)"
                }}
              >
                💾 Unduh Barcode
              </button>
            </div>
          </div>
          <p style={{ fontSize: "14px", color: "var(--text-muted)", marginTop: "24px", lineHeight: "1.6", background: "#f8fafc", padding: "16px", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
            Setelah selesai melakukan absensi di meja admin, silakan klik tombol di bawah ini lalu login menggunakan <b>Nomor Unik (ID Login)</b> untuk mengakses katalog.
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
            Pendaftaran Panitia saat ini sedang ditutup.
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
            <h1 style={{ margin: 0, lineHeight: 1 }}>GENCAR</h1>
            <p style={{ margin: 0, fontSize: '11px' }}>Portal Pendaftaran Panitia</p>
          </div>
        </div>
        <div style={{ marginBottom: "24px", textAlign: "center" }}>
          <h2 style={{ fontSize: "1.5rem", fontWeight: "800", color: "var(--text)", marginBottom: "12px" }}>
            {regTitle}
          </h2>
          {regDesc ? renderEnhancedDescription(regDesc) : (
            <p style={{ fontSize: "14px", color: "var(--text-muted)" }}>
              {regDesc}
            </p>
          )}
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            <div className="form-group" style={{ textAlign: "center" }}>
              <PhotoUpload
                value={form.foto}
                onChange={(url) => setForm(prev => ({ ...prev, foto: url }))}
                helperText="Ambil atau unggah foto terbaru dengan wajah tampak jelas"
                maxSizeMb={10}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Nama Lengkap <span className="required">*</span></label>
              <input name="nama" className="form-control" value={form.nama} onChange={handleChange} required placeholder="Masukkan nama lengkap" />
            </div>

            <div className="form-group">
              <label className="form-label">Jenis Kelamin <span className="required">*</span></label>
              <select name="jenisKelamin" className="form-control" value={form.jenisKelamin} onChange={handleChange} required>
                {regGender !== "Perempuan" && <option value="L">Laki-laki</option>}
                {regGender !== "Laki-laki" && <option value="P">Perempuan</option>}
              </select>
            </div>

            {form.jenisKelamin === "P" && (
              <div className="form-group">
                <label className="form-label">Apakah Anda Sedang Haid? <span className="required">*</span></label>
                <select name="statusHaid" className="form-control" value={form.statusHaid || "Tidak"} onChange={handleChange} required>
                  <option value="Tidak">Tidak</option>
                  <option value="Ya">Ya</option>
                </select>
              </div>
            )}

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Kota Tempat Lahir <span className="required">*</span></label>
                <input name="tempatLahir" className="form-control" value={form.tempatLahir} onChange={handleChange} required placeholder="Kota kelahiran" />
              </div>
              <div className="form-group">
                <label className="form-label">Tanggal Lahir <span className="required">*</span></label>
                <input
                  name="tanggalLahir"
                  type="date"
                  className="form-control"
                  value={form.tanggalLahir}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Daerah <span className="required">*</span></label>
              <select className="form-control" value={selectedKota} onChange={(e) => setSelectedKota(e.target.value)} required>
                <option value="">Pilih Daerah</option>
                {kotaList.map(k => <option key={k} value={k}>{k}</option>)}
              </select>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Desa <span className="required">*</span></label>
                <select name="mandiriDesaId" className="form-control" value={form.mandiriDesaId} onChange={(e) => {
                  setForm(prev => ({ ...prev, mandiriDesaId: e.target.value, mandiriKelompokId: "" }));
                }} required disabled={!selectedKota}>
                  <option value="">Pilih Desa</option>
                  {filteredDaerahList.map(d => <option key={d.id} value={d.id}>{d.nama}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Kelompok <span className="required">*</span></label>
                <select name="mandiriKelompokId" className="form-control" value={form.mandiriKelompokId} onChange={handleChange} required disabled={!form.mandiriDesaId}>
                  <option value="">Pilih Kelompok</option>
                  {filteredDesaList.map(k => <option key={k.id} value={k.id}>{k.nama}</option>)}
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">No. Telepon / WhatsApp <span className="required">*</span></label>
                <input name="noTelp" className="form-control" value={form.noTelp} onChange={handleChange} required placeholder="08xx-xxxx-xxxx" />
                <p style={{ fontSize: "10.5px", color: "var(--text-muted)", marginTop: "4px", lineHeight: "1.3" }}>
                  Minimal 11 atau 12 angka.
                </p>
              </div>
              <div className="form-group">
                <label className="form-label">Pendidikan Terakhir <span className="required">*</span></label>
                <input name="pendidikan" className="form-control" value={form.pendidikan} onChange={handleChange} required placeholder="S1/SMA/dll" />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Pekerjaan <span className="required">*</span></label>
                <input name="pekerjaan" className="form-control" value={form.pekerjaan} onChange={handleChange} required placeholder="Pekerjaan saat ini" />
              </div>
              <div className="form-group">
                <label className="form-label">Suku (Opsional)</label>
                <input name="suku" className="form-control" value={form.suku} onChange={handleChange} placeholder="Betawi / Jawa / dll" />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Anak Ke <span className="required">*</span></label>
                <input type="number" name="anakKe" className="form-control" value={form.anakKe} onChange={handleChange} required placeholder="Contoh: 1" min={1} />
              </div>
              <div className="form-group">
                <label className="form-label">Dari Saudara <span className="required">*</span></label>
                <input type="number" name="jumlahSaudara" className="form-control" value={form.jumlahSaudara} onChange={handleChange} required placeholder="Contoh: 3" min={1} />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Tinggi Badan (cm) <span className="required">*</span></label>
              <input type="number" name="tinggiBadan" className="form-control" value={form.tinggiBadan} onChange={handleChange} required placeholder="Contoh: 165" min={100} max={250} />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Hobi <span className="required">*</span></label>
                <input name="hobi" className="form-control" value={form.hobi} onChange={handleChange} required placeholder="Hobi anda" />
              </div>
              <div className="form-group">
                <label className="form-label">Favorit Makanan/Minuman (Opsional)</label>
                <input name="makananMinumanFavorit" className="form-control" value={form.makananMinumanFavorit} onChange={handleChange} placeholder="Sate / Jus / dll" />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Kriteria Pasangan (Opsional)</label>
              <textarea name="kriteriaPasangan" className="form-control" value={form.kriteriaPasangan} onChange={handleChange} placeholder="Sebutkan kriteria pasangan yang Anda harapkan" rows={3} />
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
            </div>


            <div className="form-group" style={{ padding: "15px", background: "#f8fafc", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
              <div style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
                <input
                  type="checkbox"
                  id="agree-check"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  required
                />
                <label htmlFor="agree-check" style={{ fontSize: "12.5px", cursor: "pointer", fontWeight: "600" }}>
                  Saya menyatakan data yang diisi adalah benar.
                </label>
              </div>
            </div>

            <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading || !agreed}>

              {loading ? "Memproses..." : "Kirim Pendaftaran"}
            </button>
          </div>
        </form>
      </div>

    </div>
  );
}
