"use client";



import { useState, useEffect } from "react";
import Swal from "sweetalert2";
import Link from "next/link";
import { Calendar, Clock, MapPin, ExternalLink } from "lucide-react";
import PhotoUpload from "@/components/mandiri/PhotoUpload";
import SearchableSelect from "@/components/mandiri/SearchableSelect";
import jsPDF from "jspdf";
import JsBarcode from "jsbarcode";
import QRCode from "qrcode";

interface Desa { id: number; nama: string; kota: string; }
interface Kelompok { id: number; nama: string; }

export default function MandiriDaftarPage() {
  const maxDate = new Date();
  maxDate.setFullYear(maxDate.getFullYear() - 25);
  const maxDateString = maxDate.toISOString().split("T")[0];

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
    kriteriaPasangan: "",
    dibayarkanSenilai: "",
    buktiPembayaran: "",
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
  const [regStatusPeserta, setRegStatusPeserta] = useState("Utusan Daerah");
  const [regGender, setRegGender] = useState("Semua");
  const [agreed, setAgreed] = useState(false);
  const [siteLogo, setSiteLogo] = useState<string | null>(null);
  const [uploadingBukti, setUploadingBukti] = useState(false);


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
    let currentPesertaType = "Utusan Daerah";
    
    // Determine Peserta Type from URL ONLY
    const urlParams = new URLSearchParams(window.location.search);
    const statusParam = urlParams.get('status');
    if (statusParam && statusParam.toLowerCase() === 'person') {
      setRegStatusPeserta("Person");
      currentPesertaType = "Person";
    } else {
      setRegStatusPeserta("Utusan Daerah");
    }

    fetch("/api/public/mandiri/settings?key=mandiri_registration_status")
      .then((r) => r.json())
      .then((d) => {
        const val = d.value || "1";
        setRegStatus(val);
        const specificClosed = 
          (val === "tutup_utusan" && currentPesertaType === "Utusan Daerah") ||
          (val === "tutup_person" && currentPesertaType === "Person");

        if (val === "0" || specificClosed) {
          setIsClosed(true);
        }
      });
      
    fetch("/api/public/mandiri/settings?key=mandiri_registration_gender")
      .then((r) => r.json())
      .then((d) => {
        if (d.value) {
           setRegGender(d.value);
           if (d.value === "Laki-laki") setForm(prev => ({...prev, jenisKelamin: "L"}));
           else if (d.value === "Perempuan") setForm(prev => ({...prev, jenisKelamin: "P"}));
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

  const handleDibayarkanChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digitsOnly = e.target.value.replace(/\D/g, "");
    setForm((prev) => ({ ...prev, dibayarkanSenilai: digitsOnly }));
  };

  const handleBuktiPembayaranChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedExts = ["jpg", "jpeg", "png"];
    const fileExt = file.name.split(".").pop()?.toLowerCase() || "";
    const allowedMimes = ["image/jpeg", "image/jpg", "image/png"];

    if (!allowedExts.includes(fileExt) || !allowedMimes.includes(file.type)) {
      Swal.fire({ icon: "error", title: "Format Tidak Didukung", text: "Bukti pembayaran hanya boleh berformat JPEG, JPG, atau PNG." });
      e.target.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      Swal.fire({ icon: "error", title: "File Terlalu Besar", text: "Ukuran bukti pembayaran maksimal 5 MB." });
      e.target.value = "";
      return;
    }

    setUploadingBukti(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok || !json.url) throw new Error(json.error || "Gagal mengunggah bukti pembayaran");
      setForm((prev) => ({ ...prev, buktiPembayaran: json.url }));
      Swal.fire({ icon: "success", title: "Bukti Pembayaran Terunggah", toast: true, position: "top-end", showConfirmButton: false, timer: 2000 });
    } catch (err: any) {
      Swal.fire({ icon: "error", title: "Upload Gagal", text: err.message || "Terjadi kesalahan saat mengunggah bukti pembayaran." });
    } finally {
      setUploadingBukti(false);
      e.target.value = "";
    }
  };



  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (!form.nama || !form.jenisKelamin || !form.mandiriDesaId || !form.mandiriKelompokId || !form.tempatLahir || !form.tanggalLahir || !form.noTelp || !form.pendidikan || !form.pekerjaan || !form.hobi || !form.makananMinumanFavorit) {
        Swal.fire({ icon: "warning", title: "Data Belum Lengkap", text: "Mohon lengkapi semua data wajib yang bertanda bintang (*)." });
        setLoading(false);
        return;
      }

      const cleanNoTelp = form.noTelp.replace(/\D/g, "");
      if (cleanNoTelp.length < 10) {
        Swal.fire({ icon: "warning", title: "Nomor Telepon Tidak Valid", text: "Nomor telepon/WhatsApp minimal harus 10 angka." });
        setLoading(false);
        return;
      }

      if (!form.foto) {
        Swal.fire({ icon: "warning", title: "Foto Belum Ada", text: "Mohon ambil foto atau unggah foto Anda terlebih dahulu." });
        setLoading(false);
        return;
      }

      if (regStatusPeserta === "Person" && (!form.dibayarkanSenilai || !form.buktiPembayaran)) {
        Swal.fire({ icon: "warning", title: "Data Pembayaran Belum Lengkap", text: "Mohon isi nominal yang dibayarkan dan unggah bukti pembayaran." });
        setLoading(false);
        return;
      }

      const res = await fetch("/api/public/mandiri/registrasi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          statusPeserta: regStatusPeserta,
          dibayarkanSenilai: regStatusPeserta === "Person" ? Number(form.dibayarkanSenilai) : undefined,
        }),
      });
      const data = await res.json();

      if (res.status === 409 && data.status === "quota_full") {
        Swal.fire({
          icon: "warning",
          title: "Kuota Daerah Penuh",
          html: `<p>${data.error}</p><span style="font-size: 13px; color: #64748b;">Harap lapor kepada Tim PNKB/Ibu Gambuh untuk informasi lebih lanjut.</span>`,
          confirmButtonText: "Mengerti",
          confirmButtonColor: "#f59e0b"
        });
        setLoading(false);
        return;
      }

      if (data.isAlreadyRegistered) {
        setSuccess(true);
        setResult({ ...data, alreadyExists: true });
        return;
      }

      if (!res.ok) throw new Error(data.error || "Gagal mendaftar");
      
      // Bind FCM to newly registered phone number
      if (typeof window !== "undefined" && cleanNoTelp) {
        import("@/lib/fcm-client").then(({ registerFCM }) => {
          registerFCM(cleanNoTelp);
        }).catch(e => console.error("FCM client import failed:", e));
      }

      setSuccess(true);
      setResult(data);
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
    const [qrDataUrl, setQrDataUrl] = useState<string>("");

    useEffect(() => {
      if (!result?.nomorUnik) return;
      QRCode.toDataURL(result.nomorUnik, { margin: 2, width: 400 })
        .then(url => setQrDataUrl(url))
        .catch(err => console.error("Error generating QR code:", err));
    }, [result]);

    useEffect(() => {
      if (!result) return;

      const initSuccess = async () => {
        if (result.alreadyExists) {
          await Swal.fire({
            icon: "info",
            title: "Sudah Terdaftar",
            text: "Anda sudah terdaftar sebagai peserta sebelumnya.",
            confirmButtonColor: "#3b82f6",
            confirmButtonText: "Oke"
          });
        } else {
          await Swal.fire({
            icon: "success",
            title: "Berhasil!",
            text: "Data Anda telah tercatat.",
            confirmButtonColor: "#3b82f6",
            confirmButtonText: "Oke"
          });
        }
        // Automatically download the PDF ticket on successful registration after OK is clicked
        handleDownload();
      };

      initSuccess();
    }, [result]);

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
          console.error("Status check error:", err);
        }
      };

      // Execute once only (1 hit check)
      if (status !== "attended") {
        checkStatus();
      }
    }, [result]);

    const handleDownload = async () => {
      Swal.fire({
        title: "Membuat PDF...",
        text: "Mohon tunggu sebentar.",
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });

      try {
        const doc = new jsPDF({
          orientation: "portrait",
          unit: "mm",
          format: [90, 180]
        });

        const displayName = result?.nama || form.nama || "Peserta Mandiri";
        const displayKegiatan = regTitle || "PDKT Cengkareng";
        const displayNomorUrut = result?.nomorUrut || "";
        const displayNomorUnik = result?.nomorUnik || "";

        // 1. Header background
        doc.setFillColor(29, 78, 216); // Royal Blue
        doc.rect(0, 0, 90, 25, "F");

        // 2. Header Text
        doc.setTextColor(255, 255, 255);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(13);
        doc.text("KARTU PESERTA MANDIRI", 45, 10, { align: "center" });

        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.text(displayKegiatan.toUpperCase(), 45, 17, { align: "center" });

        // 3. Body Text - Name
        doc.setTextColor(30, 41, 59); // Slate 800
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.text("NAMA PESERTA", 15, 36);

        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.text(displayName.toUpperCase(), 15, 41);

        // 4. Sequence Number
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.text("NOMOR URUT", 15, 50);

        doc.setFont("helvetica", "bold");
        doc.setFontSize(22);
        doc.setTextColor(29, 78, 216); // Primary Color
        doc.text(`#${displayNomorUrut}`, 15, 59);

        // 5. Login ID
        doc.setTextColor(30, 41, 59); // Slate 800
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.text("ID LOGIN / KODE UNIK", 15, 68);

        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.text(displayNomorUnik, 15, 73);

        // 6. Dashed line pattern separator
        doc.setLineDashPattern([1.5, 1.5], 0);
        doc.setDrawColor(203, 213, 225); // Slate 300
        doc.line(10, 81, 80, 81);
        doc.setLineDashPattern([], 0); // Reset dash pattern

        // 7. QR Code Image
        const qrBase64 = await QRCode.toDataURL(displayNomorUnik, { margin: 2, width: 400 });
        doc.addImage(qrBase64, "PNG", 27.5, 87, 35, 35);

        // 8. Barcode Image
        const canvas = document.createElement("canvas");
        JsBarcode(canvas, displayNomorUnik, {
          format: "CODE128",
          width: 2,
          height: 40,
          displayValue: true,
          fontSize: 10,
          textMargin: 2
        });
        const barcodeDataUrl = canvas.toDataURL("image/png");
        doc.addImage(barcodeDataUrl, "PNG", 15, 130, 60, 18);

        // 9. Catalog Link
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(59, 130, 246);
        doc.text("Akses Katalog: https://gencar.my.id/mandiri/katalog", 45, 154, { align: "center" });
        doc.link(15, 150, 60, 6, { url: "https://gencar.my.id/mandiri/katalog" });

        // 10. Login Instructions
        doc.setFontSize(7);
        doc.setTextColor(100, 116, 139);
        doc.text("Tata Cara Buka Halaman Katalog:", 45, 161, { align: "center" });
        doc.text("1. Buka link di atas melalui browser (HP/PC)", 45, 165, { align: "center" });
        doc.text("2. Masukkan ID Login Anda pada halaman login", 45, 169, { align: "center" });
        doc.text("3. Anda kini dapat mengakses data peserta", 45, 173, { align: "center" });

        // Save PDF
        doc.save(`TICKET_MANDIRI_${displayNomorUrut || displayNomorUnik}.pdf`);
        Swal.close();
      } catch (error) {
        console.error("PDF download error:", error);
        Swal.fire({
          icon: "error",
          title: "Gagal Mengunduh PDF",
          text: "Terjadi kesalahan saat memproses data PDF."
        });
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
              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt="QR Code Peserta"
                  style={{ width: "220px", height: "220px", borderRadius: "12px", border: "4px solid white" }}
                />
              ) : (
                <div style={{ width: "220px", height: "220px", display: "flex", alignItems: "center", justifyContent: "center", color: "#64748b" }}>
                  Memuat QR Code...
                </div>
              )}
            </div>

            {/* Big download PDF button */}
            <button
              onClick={handleDownload}
              style={{
                marginTop: "20px",
                width: "100%",
                background: "#3b82f6",
                color: "white",
                border: "none",
                padding: "12px 24px",
                borderRadius: "10px",
                fontSize: "14px",
                fontWeight: "700",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                boxShadow: "0 4px 6px -1px rgba(59, 130, 246, 0.1)"
              }}
            >
              📥 Simpan PDF Tiket
            </button>
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
          <p style={{ color: "var(--text-muted)", fontSize: "15px", marginBottom: "16px" }}>
            Mohon maaf, pendaftaran peserta sudah ditutup.
          </p>
          <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "16px", display: "inline-block", textAlign: "center" }}>
            <p style={{ fontSize: "13.5px", color: "var(--text-muted)", margin: 0, lineHeight: "1.6" }}>
              <strong>Pendaftaran Ta'aruf Kubro V9.0</strong><br />
              Sudah ditutup pada hari <span style={{ color: "var(--text)", fontWeight: 600 }}>Kamis, 23 Juli 2026</span><br />
              Pukul 00.00 WIB <span style={{ fontSize: "12px", opacity: 0.8 }}>(Waktu Indonesia Bagian Barat).</span>
            </p>
          </div>
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
                maxSizeMb={5}
              />
            </div>

            {/* --- SEKSI 1: INFORMASI PRIBADI --- */}
            <h3 className="section-title" style={{ marginTop: "10px", marginBottom: "16px" }}>Informasi Pribadi</h3>
            
            <div className="form-group">
              <label className="form-label">Nama Lengkap <span className="required">*</span></label>
              <input name="nama" className="form-control" value={form.nama} onChange={handleChange} required placeholder="Masukkan nama lengkap" />
              <p style={{ fontSize: "10.5px", color: "var(--text-muted)", marginTop: "4px" }}>
                Contoh Format Penulisan: Raka Gladhi Pratama (Tanpa disingkat dan huruf kapital pada setiap awal kata)
              </p>
            </div>

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
                  onFocus={(e) => {
                    if (!form.tanggalLahir) {
                      setForm(prev => ({ ...prev, tanggalLahir: maxDateString }));
                    }
                  }}
                  onClick={(e) => {
                    if (!form.tanggalLahir) {
                      setForm(prev => ({ ...prev, tanggalLahir: maxDateString }));
                    }
                  }}
                  required 
                  max={maxDateString}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Jenis Kelamin <span className="required">*</span></label>
                <select name="jenisKelamin" className="form-control" value={form.jenisKelamin} onChange={handleChange} required>
                  {regGender !== "Perempuan" && <option value="L">Laki-laki</option>}
                  {regGender !== "Laki-laki" && <option value="P">Perempuan</option>}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Suku <span className="required">*</span></label>
                <input name="suku" className="form-control" value={form.suku} onChange={handleChange} required placeholder="Betawi / Jawa / dll" />
              </div>
            </div>

            {/* --- SEKSI 2: KONTAK & DOMISILI --- */}
            <h3 className="section-title" style={{ marginTop: "24px", marginBottom: "16px" }}>Kontak & Domisili</h3>

            <div className="form-group">
              <label className="form-label">No. Telepon / WhatsApp <span className="required">*</span></label>
              <input type="tel" name="noTelp" className="form-control" value={form.noTelp} onChange={handleChange} required minLength={10} placeholder="08xx-xxxx-xxxx" pattern="[0-9]*" inputMode="numeric" />
              <p style={{ fontSize: "10.5px", color: "var(--text-muted)", marginTop: "4px", lineHeight: "1.3" }}>
                Minimal 10 angka. Nomor ini tidak akan disebarluaskan, hanya untuk keperluan komunikasi antara peserta dengan panitia.
              </p>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Daerah <span className="required">*</span></label>
                <SearchableSelect
                  placeholder="Pilih Daerah..."
                  options={kotaList.map(k => ({ id: k, name: k }))}
                  value={selectedKota}
                  onChange={(val) => setSelectedKota(val)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Desa <span className="required">*</span></label>
                <SearchableSelect
                  placeholder="Pilih Desa..."
                  options={filteredDaerahList.map(d => ({ id: d.id, name: d.nama }))}
                  value={form.mandiriDesaId}
                  onChange={(val) => {
                    setForm(prev => ({ ...prev, mandiriDesaId: val, mandiriKelompokId: "" }));
                  }}
                  disabled={!selectedKota}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Kelompok <span className="required">*</span></label>
              <SearchableSelect
                placeholder="Pilih Kelompok..."
                options={filteredDesaList.map(k => ({ id: k.id, name: k.nama }))}
                value={form.mandiriKelompokId}
                onChange={(val) => {
                  setForm(prev => ({ ...prev, mandiriKelompokId: val }));
                }}
                disabled={!form.mandiriDesaId}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Alamat Lengkap</label>
              <textarea name="alamat" className="form-control" value={form.alamat} onChange={handleChange} placeholder="Alamat saat ini (opsional)" rows={2} style={{ minHeight: "80px" }} />
            </div>

            {/* --- SEKSI 3: LATAR BELAKANG --- */}
            <h3 className="section-title" style={{ marginTop: "24px", marginBottom: "16px" }}>Latar Belakang & Minat</h3>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Pendidikan Terakhir <span className="required">*</span></label>
                <input name="pendidikan" className="form-control" value={form.pendidikan} onChange={handleChange} required placeholder="S1/SMA/dll" />
                <p style={{ fontSize: "10.5px", color: "var(--text-muted)", marginTop: "4px" }}>
                  Contoh Penulisan: S1 - Psikologi atau SMA - IPA
                </p>
              </div>
              <div className="form-group">
                <label className="form-label">Pekerjaan <span className="required">*</span></label>
                <input name="pekerjaan" className="form-control" value={form.pekerjaan} onChange={handleChange} required placeholder="Pekerjaan saat ini" />
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
                <span style={{ position: "absolute", left: "12px", color: "var(--text-muted)" }}>@</span>
                <input
                  name="instagram"
                  className="form-control"
                  value={form.instagram}
                  onChange={handleChange}
                  placeholder="username_kamu"
                  style={{ paddingLeft: "32px" }}
                />
              </div>
              <p style={{ fontSize: "10.5px", color: "var(--text-muted)", marginTop: "4px" }}>
                Gunakan username Instagram tanpa simbol @.
              </p>
            </div>
            
            <div className="form-group">
              <label className="form-label">Kriteria Pasangan (Opsional)</label>
              <textarea
                name="kriteriaPasangan"
                className="form-control"
                value={form.kriteriaPasangan}
                onChange={handleChange}
                placeholder="Kriteria pasangan yang diinginkan (contoh: mandiri, sholeh/sholehah, suka membaca, dll.)"
                rows={3}
              />
            </div>

            {regStatusPeserta === "Person" && (
              <div className="form-group" style={{ padding: "15px", background: "#fffbeb", borderRadius: "10px", border: "1px solid #fde68a" }}>
                <h4 style={{ margin: "0 0 12px", fontSize: "14px", fontWeight: 700, color: "#92400e" }}>Informasi Pembayaran</h4>

                <div style={{ marginBottom: "16px", padding: "12px", background: "#fef3c7", borderRadius: "8px", fontSize: "13px", color: "#92400e", lineHeight: "1.5", border: "1px dashed #fbbf24" }}>
                  <p style={{ margin: 0, fontWeight: 600 }}>Silakan transfer ke rekening berikut:</p>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", margin: "6px 0" }}>
                     <p style={{ margin: 0, fontSize: "16px", fontWeight: 800, letterSpacing: "1px", color: "#b45309" }}>379601007016501</p>
                     <button
                        type="button"
                        onClick={() => {
                           navigator.clipboard.writeText("379601007016501");
                           Swal.fire({ icon: "success", title: "Tersalin", text: "Nomor rekening berhasil disalin!", timer: 1500, showConfirmButton: false, width: "300px" });
                        }}
                        style={{ padding: "4px 10px", background: "#f59e0b", color: "#fff", border: "none", borderRadius: "6px", fontSize: "12px", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: "4px", transition: "all 0.2s ease" }}
                        onMouseOver={(e) => e.currentTarget.style.background = "#d97706"}
                        onMouseOut={(e) => e.currentTarget.style.background = "#f59e0b"}
                     >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                        Salin
                     </button>
                  </div>
                  <p style={{ margin: 0 }}>Bank BRI<br/>a.n. Aos Burhanudin</p>
                </div>

                <div className="form-group">
                  <label className="form-label">Dibayarkan Senilai <span className="required">*</span></label>
                  <div style={{ display: "flex", alignItems: "center", position: "relative" }}>
                    <span style={{ position: "absolute", left: "12px", color: "var(--text-muted)", fontWeight: 600 }}>Rp</span>
                    <input
                      name="dibayarkanSenilai"
                      className="form-control"
                      inputMode="numeric"
                      value={form.dibayarkanSenilai ? Number(form.dibayarkanSenilai).toLocaleString("id-ID") : ""}
                      onChange={handleDibayarkanChange}
                      required={regStatusPeserta === "Person"}
                      placeholder="0"
                      style={{ paddingLeft: "34px" }}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Bukti Pembayaran <span className="required">*</span></label>
                  <input
                    type="file"
                    className="form-control"
                    accept="image/jpeg,image/jpg,image/png"
                    onChange={handleBuktiPembayaranChange}
                    disabled={uploadingBukti}
                    required={regStatusPeserta === "Person" && !form.buktiPembayaran}
                  />
                  <p style={{ fontSize: "10.5px", color: "var(--text-muted)", marginTop: "4px" }}>
                    Format JPEG, JPG, atau PNG. Ukuran maksimal 5 MB.
                  </p>
                  {uploadingBukti && (
                    <p style={{ fontSize: "12px", color: "#3b82f6", marginTop: "6px" }}>Mengunggah...</p>
                  )}
                  {form.buktiPembayaran && !uploadingBukti && (
                    <div style={{ marginTop: "10px" }}>
                      <img src={form.buktiPembayaran} alt="Bukti Pembayaran" style={{ maxWidth: "160px", borderRadius: "8px", border: "1px solid #e2e8f0" }} />
                    </div>
                  )}
                </div>
              </div>
            )}

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
                <li>Menyetujui penyebarluasan data diri kepada Tim PNKB dan Peserta {regTitle || "Kegiatan"} untuk keperluan acara.</li>
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

