"use client";




import { useState, useEffect, useCallback, useRef } from "react";
import QRCode from "qrcode";
import Swal from "sweetalert2";
import Link from "next/link";
import { GenerusItem } from "@/lib/types";
import {
  Sparkles, Search, User, MapPin, Phone, GraduationCap,
  Briefcase, Heart, Globe, Calendar, Lock, ClipboardList,
  Download, Eye, EyeOff, ChevronDown, ChevronUp, Settings2, Users, Share2, Music, Utensils, Printer, Home, Instagram, QrCode, FileSpreadsheet, FileText, X, ArrowUpDown
} from "lucide-react";
import { getPusherClient } from "@/lib/pusher-client";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import html2canvas from "html2canvas";
import { utils, writeFile } from "xlsx";

export default function AdminKatalogPage() {
  const [data, setData] = useState<GenerusItem[]>([]);
  const [myProfile, setMyProfile] = useState<GenerusItem | null>(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [gender, setGender] = useState<string>("all");
  const [status, setStatus] = useState("all");
  const [pendidikan, setPendidikan] = useState("all");
  const [page, setPage] = useState(1);
  const [pendidikanList, setPendidikanList] = useState<string[]>([]);
  const [daerahList, setDaerahList] = useState<any[]>([]);
  const [selectedDaerah, setSelectedDaerah] = useState("all");
  const [desaList, setDesaList] = useState<any[]>([]);
  const [selectedDesa, setSelectedDesa] = useState("all");
  const [kelompokList, setKelompokList] = useState<any[]>([]);
  const [selectedKelompok, setSelectedKelompok] = useState("all");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [authorizedChecked, setAuthorizedChecked] = useState(false);
  const [latestActivity, setLatestActivity] = useState<any>(null);
  const [publicStatus, setPublicStatus] = useState<string>("closed");
  const [kegiatanList, setKegiatanList] = useState<{ id: string; judul: string; kota: string }[]>([]);
  const [selectedKegiatanId, setSelectedKegiatanId] = useState("");
  const [boxLoveStatus, setBoxLoveStatus] = useState<string>("closed");
  const [activeRooms, setActiveRooms] = useState<any[]>([]);
  const [selectedParticipant, setSelectedParticipant] = useState<GenerusItem | null>(null);
  const cardCanvasRef = useRef<HTMLCanvasElement>(null);
  const singleCardRef = useRef<HTMLDivElement>(null);
  const exportCardRef = useRef<HTMLDivElement>(null);
  const exportQRCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportParticipant, setExportParticipant] = useState<GenerusItem | null>(null);
  const [siteLogo, setSiteLogo] = useState<string | null>(null);
  const [showAccessQR, setShowAccessQR] = useState(false);
  const accessQRCanvasRef = useRef<HTMLCanvasElement>(null);
  const [profileDetail, setProfileDetail] = useState<GenerusItem | null>(null);
  const [zoomPhoto, setZoomPhoto] = useState<GenerusItem | null>(null);
  const limit = 20;

  const fetchData = useCallback(async () => {
    if (!isAuthorized) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        search,
        page: String(page),
        limit: String(limit),
        all: "true",
        mandiriOnly: "true",
        jenisKelamin: gender,
        status: status,
        pendidikan: pendidikan,
        mandiriDaerahId: selectedDaerah,
        mandiriDesaId: selectedDesa,
        mandiriKelompokId: selectedKelompok,
        sortBy: "nomorUrut",
        order: sortOrder,
        ...(selectedKegiatanId ? { kegiatanId: selectedKegiatanId } : {}),
      });
      const res = await fetch(`/api/generus?${params}`, { cache: "no-store" });
      const json = await res.json();
      setData(json.data || []);
      setTotal(json.total || 0);
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [isAuthorized, search, page, gender, status, pendidikan, selectedDaerah, selectedDesa, selectedKelompok, sortOrder, selectedKegiatanId]);

  useEffect(() => {
    async function init() {
      try {
        const profileRes = await fetch("/api/profile", { cache: "no-store" });
        if (!profileRes.ok) throw new Error("Gagal mengambil profil");
        const profileJson = await profileRes.json();
        setMyProfile(profileJson);
        setIsAuthorized(!!profileJson.isInPdkt || ["admin", "tim_pnkb", "admin_romantic_room", "kmm_daerah", "pengurus_daerah", "admin_pdkt", "tim_pnkb_gambuh"].includes(profileJson.role));

        if (profileJson.role !== "admin" && profileJson.role !== "tim_pnkb_gambuh" && profileJson.jenisKelamin) {
          setGender("all");
        }

        // Fetch activity info + kegiatan list + active setting
        const [activityRes, kegiatanRes, settingsRes] = await Promise.all([
          fetch("/api/mandiri/kegiatan?limit=1", { cache: "no-store" }),
          fetch("/api/mandiri/kegiatan", { cache: "no-store" }),
          fetch("/api/settings", { cache: "no-store" }),
        ]);
        if (activityRes.ok) {
          const activities = await activityRes.json();
          if (activities.length > 0) setLatestActivity(activities[0]);
        }
        if (kegiatanRes.ok) {
          const kList = await kegiatanRes.json();
          if (Array.isArray(kList)) {
            setKegiatanList(kList);
            const s = settingsRes.ok ? await settingsRes.json() : {};
            const activeId = s.mandiri_active_kegiatan_id || "";
            if (activeId) setSelectedKegiatanId(activeId);
            else if (kList.length > 0) setSelectedKegiatanId(kList[0].id);
          }
        }
        // Fetch public status
        const statusRes = await fetch("/api/mandiri/settings?key=mandiri_katalog_public_status", { cache: "no-store" });
        if (statusRes.ok) {
          const statusJson = await statusRes.json();
          setPublicStatus(statusJson.value || "closed");
        }

        // Fetch Box Love status
        const boxLoveRes = await fetch("/api/mandiri/box-love?action=status", { cache: "no-store" });
        if (boxLoveRes.ok) {
          const boxLoveJson = await boxLoveRes.json();
          setBoxLoveStatus(boxLoveJson.value || "closed");
        }

        // Fetch site logo
        if (typeof window !== 'undefined') {
          const handleLogoUpdate = () => {
            setSiteLogo((window as any).__SITE_LOGO__ || null);
          };
          handleLogoUpdate();
          window.addEventListener('site-logo-updated', handleLogoUpdate);

          if (!(window as any).__SITE_LOGO__) {
            const settingsRes = await fetch("/api/settings");
            if (settingsRes.ok) {
              const settingsData = await settingsRes.json();
              if (settingsData.site_logo) {
                setSiteLogo(settingsData.site_logo);
                (window as any).__SITE_LOGO__ = settingsData.site_logo;
                window.dispatchEvent(new Event('site-logo-updated'));
              }
            }
          }
        }

        // Fetch dynamic filters
        const filterRes = await fetch("/api/generus/filters", { cache: "no-store" });
        if (filterRes.ok) {
          const filterJson = await filterRes.json();
          setPendidikanList(filterJson.pendidikan || []);
          setDaerahList(filterJson.daerahs || []);
          setDesaList(filterJson.desas || []);
          setKelompokList(filterJson.kelompoks || []);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setAuthorizedChecked(true);
      }
    }
    init();
  }, []);

  useEffect(() => {
    let interval: any;
    const fetchRooms = async () => {
      try {
        const r = await fetch("/api/mandiri/rooms", { cache: "no-store" });
        if (r.ok) {
          const rJson = await r.json();
          let rooms = Array.isArray(rJson) ? rJson : [];
          if (!rooms.some(r => r.status === "Terisi")) {
            rooms.push({
              status: "Terisi",
              nama: "Room 1 (Preview)",
              pengirimNama: "Budi Hermawan",
              penerimaNama: "Dedi Kurniawan",
              assignedCallerNama: "Bpk. Operator 1",
              assignedCaller2Nama: "Ibu Operator 2",
              assignedGuardNama: "Mas Penjaga"
            });
          }
          setActiveRooms(rooms);
        }
      } catch (e) {}
    };

    if (isAuthorized) {
      fetchRooms();
      interval = setInterval(fetchRooms, 10000);

      const pusher = getPusherClient();
      if (pusher) {
        const channel = pusher.subscribe("taaruf-channel");
        channel.bind("room-changed", () => {
          fetchRooms();
          fetchData();
        });
        channel.bind("taaruf-changed", () => {
          fetchRooms();
          fetchData();
        });
        return () => {
          clearInterval(interval);
          channel.unbind("room-changed");
          channel.unbind("taaruf-changed");
          pusher.unsubscribe("taaruf-channel");
        };
      }
    }
    return () => clearInterval(interval);
  }, [isAuthorized, fetchData]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchTerm);
      setPage(1);
    }, 400); // Debounce to allow smooth typing
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    const timer = setTimeout(fetchData, 100);
    return () => clearTimeout(timer);
  }, [fetchData]);

  useEffect(() => {
    if (selectedParticipant && cardCanvasRef.current) {
      QRCode.toCanvas(cardCanvasRef.current, selectedParticipant.nomorUnik, {
        width: 120,
        margin: 1,
        color: { dark: "#000000", light: "#ffffff" },
      });
    }
  }, [selectedParticipant]);

  useEffect(() => {
    if (showAccessQR && accessQRCanvasRef.current) {
      const url = `${window.location.origin}/mandiri/katalog`;
      QRCode.toCanvas(accessQRCanvasRef.current, url, {
        width: 300,
        margin: 2,
        color: { dark: "#000000", light: "#ffffff" },
      });
    }
  }, [showAccessQR]);

  const handleTogglePublic = async () => {
    const newStatus = publicStatus === "open" ? "closed" : "open";
    const { isConfirmed } = await Swal.fire({
      title: "Ubah Status Katalog Publik?",
      text: `Katalog akan ${newStatus === "open" ? "dibuka" : "ditutup"} untuk umum.`,
      icon: "warning",
      showCancelButton: true
    });

    if (isConfirmed) {
      await fetch("/api/mandiri/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "mandiri_katalog_public_status", value: newStatus })
      });
      setPublicStatus(newStatus);
      Swal.fire("Berhasil", "Status diperbarui", "success");
    }
  };

  const handleToggleBoxLove = async () => {
    const newStatus = boxLoveStatus === "open" ? "closed" : "open";
    const { isConfirmed } = await Swal.fire({
      title: "Ubah Status Box Love?",
      text: `Box Love akan ${newStatus === "open" ? "dibuka" : "ditutup"} untuk peserta.`,
      icon: "warning",
      showCancelButton: true
    });

    if (isConfirmed) {
      const res = await fetch("/api/mandiri/box-love", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "toggle" })
      });
      if (res.ok) {
        const json = await res.json();
        setBoxLoveStatus(json.value || newStatus);
        Swal.fire("Berhasil", `Box Love ${json.value === "open" ? "dibuka" : "ditutup"}`, "success");
      }
    }
  };

  const handleExportIDCards = async () => {
    setIsExporting(true);
    Swal.fire({
      title: "Menyiapkan ID Card...",
      text: "Sedang mengambil data dan merender kartu. Harap tunggu sebentar.",
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    try {
      const params = new URLSearchParams({
        search,
        all: "true",
        mandiriOnly: "true",
        jenisKelamin: gender,
        status: status,
        pendidikan: pendidikan,
        mandiriDaerahId: selectedDaerah,
        mandiriDesaId: selectedDesa,
        mandiriKelompokId: selectedKelompok,
        sortBy: "nomorUrut",
        order: sortOrder,
        ...(selectedKegiatanId ? { kegiatanId: selectedKegiatanId } : {}),
      });
      const res = await fetch(`/api/generus?${params}`, { cache: "no-store" });
      const json = await res.json();
      const allParticipants: GenerusItem[] = json.data || [];

      if (allParticipants.length === 0) {
        Swal.fire("Info", "Tidak ada data peserta untuk diekspor", "info");
        setIsExporting(false);
        return;
      }

      const pdf = new jsPDF({
        orientation: "p",
        unit: "mm",
        format: "a4"
      });

      const cardsPerPage = 1;

      for (let i = 0; i < allParticipants.length; i++) {
        const item = allParticipants[i];

        setExportParticipant(item);

        await new Promise(resolve => setTimeout(resolve, 300));

        const cardElement = exportCardRef.current;
        if (!cardElement) continue;

        const canvas = await html2canvas(cardElement, {
          useCORS: true,
          scale: 2,
          logging: false,
          backgroundColor: null,
        });

        const imgData = canvas.toDataURL("image/jpeg", 0.95);

        if (i > 0) pdf.addPage();

        pdf.addImage(imgData, "JPEG", 52.5, 63.5, 105, 170);

        Swal.update({
          text: `Merender kartu: ${i + 1} dari ${allParticipants.length}`
        });
      }

      pdf.save(`ID_CARDS_${new Date().getTime()}.pdf`);
      Swal.fire("Berhasil", `${allParticipants.length} ID Card telah diekspor.`, "success");
    } catch (e: any) {
      console.error(e);
      Swal.fire("Gagal", "Terjadi kesalahan saat mengekspor PDF", "error");
    } finally {
      setIsExporting(false);
      setExportParticipant(null);
    }
  };

  useEffect(() => {
    if (exportParticipant && exportQRCanvasRef.current) {
      QRCode.toCanvas(exportQRCanvasRef.current, exportParticipant.nomorUnik, {
        width: 120,
        margin: 1,
        color: { dark: "#000000", light: "#ffffff" },
      });
    }
  }, [exportParticipant]);

  const handleExportSinglePDF = async (item: GenerusItem) => {
    Swal.fire({
      title: "Menyiapkan PDF...",
      allowOutsideClick: false,
      didOpen: () => { Swal.showLoading(); }
    });

    try {
      if (!singleCardRef.current) throw new Error("Card element not found");

      const pdf = new jsPDF({
        orientation: "p",
        unit: "mm",
        format: "a4"
      });

      const canvas = await html2canvas(singleCardRef.current, {
        useCORS: true,
        scale: 2,
        backgroundColor: null,
      });

      const imgData = canvas.toDataURL("image/jpeg", 0.95);
      pdf.addImage(imgData, "JPEG", 52.5, 63.5, 105, 170);
      pdf.save(`ID_CARD_${item.nama.replace(/\s+/g, '_')}_${item.nomorUnik}.pdf`);
      Swal.close();
    } catch (e) {
      console.error(e);
      Swal.fire("Gagal", "Gagal mengekspor PDF", "error");
    }
  };

  const handleExportKatalogPDF = async () => {
    Swal.fire({
      title: "Menyiapkan PDF Katalog...",
      text: "Sedang mengambil data dan menyusun laporan. Harap tunggu sebentar.",
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    try {
      const params = new URLSearchParams({
        search,
        all: "true",
        mandiriOnly: "true",
        jenisKelamin: gender,
        status: status,
        pendidikan: pendidikan,
        mandiriDaerahId: selectedDaerah,
        mandiriDesaId: selectedDesa,
        mandiriKelompokId: selectedKelompok,
        sortBy: "nomorUrut",
        order: sortOrder,
        ...(selectedKegiatanId ? { kegiatanId: selectedKegiatanId } : {}),
      });
      const res = await fetch(`/api/generus?${params}`, { cache: "no-store" });
      const json = await res.json();
      const allParticipants: GenerusItem[] = json.data || [];

      if (allParticipants.length === 0) {
        Swal.fire("Info", "Tidak ada data untuk diekspor", "info");
        return;
      }

      const doc = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4"
      });

      // Simple Branding / Header
      const pageWidth = doc.internal.pageSize.getWidth();

      doc.setFillColor(30, 58, 138); // Primary blue
      doc.rect(0, 0, pageWidth, 40, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(24);
      doc.setFont("helvetica", "bold");
      doc.text("KATALOG LENGKAP PESERTA", 15, 20);

      const daerahPart = selectedDaerah !== "all" ? daerahList.find(d => String(d.id) === selectedDaerah)?.nama : "SEMUA_DAERAH";
      const desaPart = selectedDesa !== "all" ? desaList.find(d => String(d.id) === selectedDesa)?.nama : "";
      const kelompokPart = selectedKelompok !== "all" ? kelompokList.find(k => String(k.id) === selectedKelompok)?.nama : "";

      let filterSuffix = daerahPart;
      if (desaPart) filterSuffix += `_${desaPart}`;
      if (kelompokPart) filterSuffix += `_${kelompokPart}`;
      const cleanSuffix = filterSuffix.replace(/[^a-zA-Z0-9_]/g, "_").toUpperCase();

      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      doc.text(latestActivity?.judul || "Daftar Peserta Aktif", 15, 28);
      
      let filterText = "Semua Daerah";
      if (selectedDaerah !== "all") {
        const dNama = daerahList.find(d => String(d.id) === selectedDaerah)?.nama || "";
        const dDesa = selectedDesa !== "all" ? desaList.find(d => String(d.id) === selectedDesa)?.nama || "" : "";
        const dKel = selectedKelompok !== "all" ? kelompokList.find(k => String(k.id) === selectedKelompok)?.nama || "" : "";
        filterText = dNama + (dDesa ? ` → ${dDesa}` : "") + (dKel ? ` → ${dKel}` : "");
      }
      doc.text(`Total: ${allParticipants.length} Orang  |  Filter: ${filterText}`, 15, 34);

      doc.setFontSize(9);
      doc.text(`Dicetak pada: ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`, pageWidth - 15, 34, { align: "right" });

      // Table Data
      const tableColumn = ["No", "Nama Lengkap", "L/P", "Usia", "Status", "Daerah / Desa / Kelompok", "Kontak / Sosial Media", "Pendidikan & Pekerjaan"];
      const tableRows = allParticipants.map((item, index) => [
        index + 1,
        item.nama.toUpperCase(),
        item.jenisKelamin || "-",
        calculateAge(item.tanggalLahir ?? undefined),
        (item.panitiaStatus || item.role === 'admin') ? "PANITIA" : "PESERTA",
        `${item.mandiriDesaKota || "-"}\n${item.mandiriDesaNama || "-"}\n${item.mandiriKelompokNama || "-"}`,
        `${item.noTelp || "-"}\n${item.instagram ? '@' + item.instagram.replace('@', '') : "-"}`,
        `${item.pendidikan || "-"}\n${item.pekerjaan || "-"}`
      ]);

      autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 45,
        theme: 'grid',
        headStyles: {
          fillColor: [30, 58, 138],
          textColor: 255,
          fontSize: 9,
          halign: 'center',
          valign: 'middle',
          fontStyle: 'bold'
        },
        bodyStyles: {
          fontSize: 8,
          textColor: [30, 41, 59],
          valign: 'middle'
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252]
        },
        columnStyles: {
          0: { halign: 'center', cellWidth: 10 },
          1: { fontStyle: 'bold', cellWidth: 50 },
          2: { halign: 'center', cellWidth: 10 },
          3: { halign: 'center', cellWidth: 12 },
          4: { halign: 'center', fontStyle: 'bold', cellWidth: 20 },
          5: { cellWidth: 45 },
          6: { cellWidth: 45 },
          7: { cellWidth: 45 },
        },
        margin: { left: 15, right: 15, bottom: 20 },
        didDrawPage: (data) => {
          // Footer
          const pageCount = doc.getNumberOfPages();
          doc.setFontSize(8);
          doc.setTextColor(100, 116, 139);
          doc.text(`Halaman ${data.pageNumber} dari ${pageCount}`, pageWidth / 2, doc.internal.pageSize.height - 10, { align: "center" });
          doc.text("Sistem Informasi Katalog Peserta - gencar.com", 15, doc.internal.pageSize.height - 10);
        }
      });

      doc.save(`KATALOG_${cleanSuffix}_${new Date().getTime()}.pdf`);
      Swal.fire("Berhasil", "Laporan PDF telah berhasil diunduh.", "success");
    } catch (e) {
      console.error(e);
      Swal.fire("Gagal", "Terjadi kesalahan saat membuat PDF", "error");
    }
  };

  const handleExportExcel = async () => {
    Swal.fire({
      title: "Menyiapkan Excel...",
      text: "Sedang mengambil data. Harap tunggu sebentar.",
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    try {
      const params = new URLSearchParams({
        search,
        all: "true",
        mandiriOnly: "true",
        jenisKelamin: gender,
        status: status,
        pendidikan: pendidikan,
        mandiriDaerahId: selectedDaerah,
        mandiriDesaId: selectedDesa,
        mandiriKelompokId: selectedKelompok,
        sortBy: "nomorUrut",
        order: sortOrder,
        ...(selectedKegiatanId ? { kegiatanId: selectedKegiatanId } : {}),
      });
      const res = await fetch(`/api/generus?${params}`, { cache: "no-store" });
      const json = await res.json();
      const allParticipants: GenerusItem[] = json.data || [];

      if (allParticipants.length === 0) {
        Swal.fire("Info", "Tidak ada data untuk diekspor", "info");
        return;
      }

      const excelData = allParticipants.map((item) => ({
        "Nama Lengkap": item.nama,
        "Nomor Peserta": item.nomorUrut || "-",
        "Status": (item.panitiaStatus || item.role === 'admin') ? "Panitia" : "Peserta",
        "Daerah": item.mandiriDesaKota || "-",
        "Desa": item.mandiriDesaNama || "-",
        "Kelompok": item.mandiriKelompokNama || "-"
      }));

      const wb = utils.book_new();
      const ws = utils.json_to_sheet(excelData);

      // Set column widths
      const wscols = [
        { wch: 30 }, // Nama Lengkap
        { wch: 15 }, // Nomor Peserta
        { wch: 15 }, // Status
        { wch: 20 }, // Daerah
        { wch: 20 }, // Desa
        { wch: 20 }, // Kelompok
      ];
      ws['!cols'] = wscols;

      utils.book_append_sheet(wb, ws, "Daftar Katalog");
      writeFile(wb, `KATALOG_PESERTA_${new Date().getTime()}.xlsx`);

      Swal.fire("Berhasil", "Data telah diekspor ke Excel", "success");
    } catch (e) {
      console.error(e);
      Swal.fire("Gagal", "Gagal mengekspor Excel", "error");
    }
  };


  const copyPublicLink = () => {
    const url = `${window.location.origin}/mandiri/katalog`;
    navigator.clipboard.writeText(url);
    Swal.fire({ icon: "success", title: "Link Tersalin", timer: 1000, showConfirmButton: false });
  };

  if (loading && !authorizedChecked) {
    return <div className="flex h-screen items-center justify-center"><div className="h-10 w-10 animate-spin rounded-full border-4 border-t-blue-500 border-slate-200"></div></div>;
  }

  return (
    <div className="pdkt-admin-container">
      <header
        className="page-header"
        style={{ textAlign: 'center', display: 'block' }}
      >
        <h1>
          KATALOG <span style={{ color: 'inherit' }}>PESERTA</span>
        </h1>
        <span className="subtitle">{kegiatanList.find(k => k.id === selectedKegiatanId)?.judul || latestActivity?.judul || "Daftar Peserta Aktif"}</span>

      </header>
      <div className="toolbar-section">
        <div className="toolbar-top-row">
          <div className="search-box">
            <Search size={18} className="icon-muted" />
            <input
              type="text"
              placeholder="Cari nama, nomor, desa, atau alamat..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button 
                className="clear-search-btn-admin"
                onClick={() => setSearchTerm("")}
              >
                <X size={14} />
              </button>
            )}
          </div>
          <div className="main-actions">
            <button className={`btn-toggle-public ${publicStatus === "open" ? "active" : ""}`} onClick={handleTogglePublic}>
              {publicStatus === "open" ? <Eye size={16} /> : <EyeOff size={16} />}
              <span>Public View</span>
            </button>
            {publicStatus === "open" && (
              <button className="btn-icon-sq" onClick={copyPublicLink} title="Salin Link Publik">
                <Share2 size={16} />
              </button>
            )}
          </div>
        </div>

        <div className="export-actions-bar">
          <div className="export-group">
            <button className="btn-export-id-cards" style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }} onClick={() => setShowAccessQR(true)}>
              <QrCode size={16} />
              <span>QR Akses</span>
            </button>
            <button className="btn-export-id-cards" style={{ background: 'linear-gradient(135deg, #059669, #047857)' }} onClick={handleExportExcel}>
              <FileSpreadsheet size={16} />
              <span>Export Excel</span>
            </button>
            <button className="btn-export-id-cards" style={{ background: 'linear-gradient(135deg, #4f46e5, #4338ca)' }} onClick={handleExportKatalogPDF}>
              <FileText size={16} />
              <span>Export PDF</span>
            </button>
            <button className="btn-export-id-cards" onClick={handleExportIDCards} disabled={isExporting}>
              <Printer size={16} />
              <span>Cetak ID Card</span>
            </button>
          </div>
        </div>

        <div className="filters-container">
          <div className="filters-header">
            <Settings2 size={14} />
            <span>Filter Data</span>
          </div>
          <div className="filters-grid">
              <div className="filter-group">
                <label>Gender</label>
                <div className="pill-group">
                  <button className={gender === "all" ? "active" : ""} onClick={() => setGender("all")}>Semua</button>
                  <button className={gender === "L" ? "active" : ""} onClick={() => setGender("L")}>L</button>
                  <button className={gender === "P" ? "active" : ""} onClick={() => setGender("P")}>P</button>
                </div>
              </div>

            <div className="filter-group">
              <label>Status</label>
              <div className="pill-group">
                <button className={status === "all" ? "active" : ""} onClick={() => setStatus("all")}>Semua</button>
                <button className={status === "peserta" ? "active" : ""} onClick={() => setStatus("peserta")}>Peserta</button>
                <button className={status === "panitia" ? "active" : ""} onClick={() => setStatus("panitia")}>Panitia</button>
              </div>
            </div>

            <div className="filter-group">
              <label>Pendidikan</label>
              <div className="select-box-wrapper">
                <select
                  className="dropdown-box"
                  value={pendidikan}
                  onChange={(e) => { setPendidikan(e.target.value); setPage(1); }}
                >
                  <option value="all">Semua Pendidikan</option>
                  {pendidikanList.map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
                <ChevronDown size={14} className="dropdown-arrow" />
              </div>
            </div>

            <div className="filter-group">
              <label>Daerah</label>
              <div className="select-box-wrapper">
                <select
                  className="dropdown-box"
                  value={selectedDaerah}
                  onChange={(e) => {
                    setSelectedDaerah(e.target.value);
                    setSelectedDesa("all");
                    setSelectedKelompok("all");
                    setPage(1);
                  }}
                >
                  <option value="all">Semua Daerah</option>
                  {daerahList.map(d => (
                    <option key={d.id} value={d.id}>{d.nama}</option>
                  ))}
                </select>
                <ChevronDown size={14} className="dropdown-arrow" />
              </div>
            </div>

            <div className="filter-group">
              <label>Desa</label>
              <div className="select-box-wrapper">
                <select
                  className="dropdown-box"
                  value={selectedDesa}
                  onChange={(e) => {
                    setSelectedDesa(e.target.value);
                    setSelectedKelompok("all");
                    setPage(1);
                  }}
                >
                  <option value="all">Semua Desa</option>
                  {desaList
                    .filter(d => selectedDaerah === "all" || d.daerahId === Number(selectedDaerah))
                    .map(d => (
                      <option key={d.id} value={d.id}>{d.nama}</option>
                    ))}
                </select>
                <ChevronDown size={14} className="dropdown-arrow" />
              </div>
            </div>

            <div className="filter-group">
              <label>Kelompok</label>
              <div className="select-box-wrapper">
                <select
                  className="dropdown-box"
                  value={selectedKelompok}
                  onChange={(e) => {
                    setSelectedKelompok(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="all">Semua Kelompok</option>
                  {kelompokList
                    .filter(k => selectedDesa === "all" || k.desaId === Number(selectedDesa))
                    .map(k => (
                      <option key={k.id} value={k.id}>{k.nama}</option>
                    ))}
                </select>
                <ChevronDown size={14} className="dropdown-arrow" />
              </div>
            </div>

            {kegiatanList.length > 0 && (
              <div className="filter-group">
                <label>Kegiatan</label>
                <div className="select-box-wrapper">
                  <select
                    className="dropdown-box"
                    value={selectedKegiatanId}
                    onChange={(e) => { setSelectedKegiatanId(e.target.value); setPage(1); }}
                  >
                    {kegiatanList.map(k => (
                      <option key={k.id} value={k.id}>{k.judul} ({k.kota})</option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="dropdown-arrow" />
                </div>
              </div>
            )}

            <div className="filter-group">
              <label>Urutan No</label>
              <button 
                className={`pill-btn-sort ${sortOrder === 'asc' ? 'asc' : 'desc'}`}
                onClick={() => {
                  setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
                  setPage(1);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 16px',
                  borderRadius: '12px',
                  fontSize: '12px',
                  fontWeight: '700',
                  transition: '0.2s',
                  border: '1.5px solid #f1f5f9',
                  background: sortOrder === 'asc' ? '#f0fdf4' : '#fef2f2',
                  color: sortOrder === 'asc' ? '#166534' : '#991b1b',
                  height: '38px',
                  cursor: 'pointer'
                }}
              >
                <ArrowUpDown size={14} />
                <span>{sortOrder === 'asc' ? 'Terkecil' : 'Terbesar'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="grid-section">
        {data.map((item) => {
          const isPulang = item.keterangan === "pulang";
          const isTidakHadir = item.keterangan === "alpha" || item.keterangan === "izin";
          const isUnavailable = isPulang || isTidakHadir;
          return (
          <div key={item.id} className={`participant-card gender-${item.jenisKelamin?.toLowerCase()} ${isUnavailable ? "disabled" : ""}`} style={{ position: "relative" }}>
            <div className="card-inner" style={{ filter: isUnavailable ? "blur(3px)" : "none", pointerEvents: isUnavailable ? "none" : "auto" }}>
              <div className="card-main">
                <div className="card-photo-col">
                  <div className="photo-wrapper photo-clickable" onClick={() => setZoomPhoto(item)} title="Lihat foto">
                    {item.foto ? <img src={item.foto} alt={item.nama} /> : <div className="photo-placeholder">{item.nama.charAt(0)}</div>}
                    <div className={`status-badge ${item.panitiaStatus || item.role === 'admin' ? 'panitia' : 'peserta'}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                      {siteLogo && <img src={siteLogo} alt="" style={{ width: '10px', height: '10px', objectFit: 'contain', filter: 'brightness(0) invert(1)' }} />}
                      <span>{item.panitiaStatus || item.role === 'admin' ? "Panitia" : "Peserta"}</span>
                    </div>
                    <div className="photo-zoom-hint">🔍</div>
                  </div>
                  <div className="no-urut-tag">#{item.nomorUrut || "000"}</div>
                </div>

                <div className="card-info-col">
                  <div className="info-header">
                    <h3 className="participant-name">{item.nama}</h3>
                    <div className="region-tag">
                      <MapPin size={10} />
                      <span>{item.mandiriDesaKota || "Tanpa Kota"} &bull; {item.mandiriDesaNama || item.desaNama || "Desa"}</span>
                    </div>
                  </div>

                  <div className="tags-row">
                    <div className="info-pill"><User size={10} /> <span>{calculateAge(item.tanggalLahir ?? undefined)} thn &bull; {item.jenisKelamin === 'L' ? 'Laki-laki' : item.jenisKelamin === 'P' ? 'Perempuan' : item.jenisKelamin || '-'}</span></div>
                    <div className="info-pill"><GraduationCap size={10} /> <span>{item.pendidikan || "-"}</span></div>
                    <div className="info-pill" style={{ background: '#f0fdf4', color: '#166534', border: '1px solid #dcfce7' }}>
                      <span>Dipanggil: <strong style={{ fontWeight: 850 }}>{(item as any).totalDipanggil || 0}</strong></span>
                    </div>
                    <div className="info-pill" style={{ background: '#eff6ff', color: '#1e40af', border: '1px solid #dbeafe' }}>
                      <span>Memanggil: <strong style={{ fontWeight: 850 }}>{(item as any).totalMemanggil || 0}</strong></span>
                    </div>
                  </div>

                  <div className="contact-info">
                    {item.noTelp && (
                      <div className="contact-item">
                        <Phone size={12} className="text-wa" />
                        <a
                          href={`https://wa.me/${item.noTelp.replace(/\D/g, '').replace(/^0/, '62')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="wa-link-text"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {item.noTelp}
                        </a>
                      </div>
                    )}
                    <div className="contact-item">
                      <Briefcase size={12} className="text-job" />
                      <span>{item.pekerjaan || "Belum Bekerja"}</span>
                    </div>
                    {item.instagram && (
                      <div className="contact-item">
                        <Instagram size={12} className="text-ig" />
                        <a
                          href={`https://instagram.com/${item.instagram.replace('@', '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="instagram-link-contact"
                          onClick={(e) => e.stopPropagation()}
                        >
                          @{item.instagram.replace('@', '')}
                        </a>
                      </div>
                    )}
                    {item.alamat && (
                      <div className="contact-item address-item" title={item.alamat}>
                        <Home size={12} className="text-home" />
                        <span className="line-clamp-1"><strong>Alamat:</strong> {item.alamat}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Active Room Badge */}
              {(() => {
                const room = activeRooms.find(r => r.status === "Terisi" && (r.pengirimNama === item.nama || r.penerimaNama === item.nama));
                if (room) {
                  return (
                    <div style={{ marginTop: '20px', padding: '20px', background: '#fdf4ff', border: '2px solid #fbcfe8', borderRadius: '16px', fontSize: '14px', color: '#831843', width: '100%' }}>
                      <div style={{ fontWeight: '800', fontSize: '18px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Heart size={20} className="text-pink-500" /> Sedang di {room.nama}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '15px' }}>
                        <div><span style={{ fontWeight: '700' }}>Bersama:</span> {item.nama === room.pengirimNama ? room.penerimaNama : room.pengirimNama}</div>
                        <div><span style={{ fontWeight: '700' }}>Pemanggil 1:</span> {room.assignedCallerNama || '-'}</div>
                        <div><span style={{ fontWeight: '700' }}>Pemanggil 2:</span> {room.assignedCaller2Nama || '-'}</div>
                        <div><span style={{ fontWeight: '700' }}>Penunggu:</span> {room.assignedGuardNama || '-'}</div>
                      </div>
                    </div>
                  );
                }
                return null;
              })()}

              <div className="card-footer" style={{ marginTop: '16px', display: 'flex', gap: '10px' }}>
                <button 
                  className="footer-btn btn-profile" 
                  onClick={() => setProfileDetail(item)}
                  style={{ 
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', 
                    width: '100%', padding: '10px', borderRadius: '12px', 
                    background: '#3b82f6', border: 'none', 
                    color: 'white', fontSize: '13px', fontWeight: '700', cursor: 'pointer', transition: '0.2s'
                  }}
                  onMouseOver={(e) => { e.currentTarget.style.background = '#2563eb'; }}
                  onMouseOut={(e) => { e.currentTarget.style.background = '#3b82f6'; }}
                >
                  <User size={14} />
                  <span>Lihat Profile</span>
                </button>
              </div>
            </div>

            {isUnavailable && (
              <div style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 10,
                padding: "24px"
              }}>
                <div style={{
                  background: "rgba(255, 255, 255, 0.95)",
                  padding: "20px",
                  borderRadius: "20px",
                  textAlign: "center",
                  color: "#ef4444",
                  fontWeight: 700,
                  fontSize: "14px",
                  boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
                  border: "2px solid #fee2e2",
                  lineHeight: 1.5,
                  backdropFilter: "blur(4px)"
                }}>
                  Mohon maaf, peserta {item.nama} {isPulang ? "pulang lebih awal" : "tidak hadir"}, Anda tidak bisa memproses peserta tersebut.
                </div>
              </div>
            )}
          </div>
          );
        })}
      </div>

      {zoomPhoto && (
        <div className="modal-overlay zoom-overlay" onClick={() => setZoomPhoto(null)}>
          <div className="zoom-modal" onClick={e => e.stopPropagation()}>
            <button className="close-modal" onClick={() => setZoomPhoto(null)}>&times;</button>
            {zoomPhoto.foto
              ? <img src={zoomPhoto.foto} alt={zoomPhoto.nama} className="zoom-img" />
              : <div className="zoom-placeholder">{zoomPhoto.nama.charAt(0)}</div>
            }
            <div className="zoom-name">{zoomPhoto.nama}</div>
            <button className="zoom-detail-btn" onClick={() => { setZoomPhoto(null); setProfileDetail(zoomPhoto); }}>
              <User size={14} /> Lihat Profil Lengkap
            </button>
          </div>
        </div>
      )}

      {profileDetail && (
        <div className="modal-overlay" onClick={() => setProfileDetail(null)}>
          <div className="modal-content profile-detail-modal" onClick={e => e.stopPropagation()}>
            <button className="close-modal" onClick={() => setProfileDetail(null)}>&times;</button>
            <div className="pd-header" style={{ background: profileDetail.jenisKelamin === 'P' ? 'linear-gradient(135deg, #be185d, #ec4899)' : 'linear-gradient(135deg, #1d4ed8, #3b82f6)' }}>
              <div className="pd-photo">
                {profileDetail.foto
                  ? <img src={profileDetail.foto} alt={profileDetail.nama} />
                  : <div className="pd-initials">{profileDetail.nama.charAt(0)}</div>
                }
              </div>
              <div className="pd-header-info">
                <div className="pd-status-badge">{profileDetail.panitiaStatus || profileDetail.role === 'admin' ? "Panitia" : "Peserta"} #{profileDetail.nomorUrut || "-"}</div>
                <h2 className="pd-name">{profileDetail.nama}</h2>
                <div className="pd-region"><MapPin size={12} /> {profileDetail.mandiriDesaKota || "-"} &bull; {profileDetail.mandiriDesaNama || profileDetail.desaNama || "-"}</div>
              </div>
            </div>
            <div className="pd-body">
              <div className="pd-grid">
                <div className="pd-item">
                  <span className="pd-label">Jenis Kelamin</span>
                  <span className="pd-value">{profileDetail.jenisKelamin === 'L' ? 'Laki-laki' : profileDetail.jenisKelamin === 'P' ? 'Perempuan' : '-'}</span>
                </div>
                <div className="pd-item">
                  <span className="pd-label">Usia</span>
                  <span className="pd-value">{calculateAge(profileDetail.tanggalLahir ?? undefined)} tahun</span>
                </div>
                <div className="pd-item" style={{ background: '#f0fdf4', borderRadius: '12px', padding: '12px' }}>
                  <span className="pd-label" style={{ color: '#166534' }}>Total Dipanggil</span>
                  <span className="pd-value" style={{ color: '#14532d', fontWeight: 800 }}>{(profileDetail as any).totalDipanggil || 0} kali</span>
                </div>
                <div className="pd-item" style={{ background: '#eff6ff', borderRadius: '12px', padding: '12px' }}>
                  <span className="pd-label" style={{ color: '#1e40af' }}>Total Memanggil</span>
                  <span className="pd-value" style={{ color: '#1e3a8a', fontWeight: 800 }}>{(profileDetail as any).totalMemanggil || 0} kali</span>
                </div>
                <div className="pd-item">
                  <span className="pd-label">Tempat Lahir</span>
                  <span className="pd-value">{profileDetail.tempatLahir || "-"}</span>
                </div>
                <div className="pd-item">
                  <span className="pd-label">Tanggal Lahir</span>
                  <span className="pd-value">{profileDetail.tanggalLahir || "-"}</span>
                </div>
                <div className="pd-item">
                  <span className="pd-label">Status Nikah</span>
                  <span className="pd-value">{profileDetail.statusNikah || "-"}</span>
                </div>
                <div className="pd-item">
                  <span className="pd-label">Pendidikan</span>
                  <span className="pd-value">{profileDetail.pendidikan || "-"}</span>
                </div>
                <div className="pd-item">
                  <span className="pd-label">Pekerjaan</span>
                  <span className="pd-value">{profileDetail.pekerjaan || "-"}</span>
                </div>
                <div className="pd-item">
                  <span className="pd-label">Suku</span>
                  <span className="pd-value">{profileDetail.suku || "-"}</span>
                </div>
                {profileDetail.noTelp && (
                  <div className="pd-item">
                    <span className="pd-label">WhatsApp</span>
                    <a href={`https://wa.me/${profileDetail.noTelp.replace(/\D/g,'').replace(/^0/,'62')}`} target="_blank" rel="noopener noreferrer" className="pd-link pd-link-wa">{profileDetail.noTelp}</a>
                  </div>
                )}
                {profileDetail.instagram && (
                  <div className="pd-item">
                    <span className="pd-label">Instagram</span>
                    <a href={`https://instagram.com/${profileDetail.instagram.replace('@','')}`} target="_blank" rel="noopener noreferrer" className="pd-link pd-link-ig">@{profileDetail.instagram.replace('@','')}</a>
                  </div>
                )}
                {profileDetail.hobi && (
                  <div className="pd-item pd-item-full">
                    <span className="pd-label">Hobi</span>
                    <span className="pd-value">{profileDetail.hobi}</span>
                  </div>
                )}
                {profileDetail.kriteriaPasangan && (
                  <div className="pd-item pd-item-full">
                    <span className="pd-label">Kriteria Pasangan</span>
                    <span className="pd-value">{profileDetail.kriteriaPasangan}</span>
                  </div>
                )}
                {profileDetail.makananMinumanFavorit && (
                  <div className="pd-item pd-item-full">
                    <span className="pd-label">Makanan / Minuman Favorit</span>
                    <span className="pd-value">{profileDetail.makananMinumanFavorit}</span>
                  </div>
                )}
                {profileDetail.alamat && (
                  <div className="pd-item pd-item-full">
                    <span className="pd-label">Alamat</span>
                    <span className="pd-value">{profileDetail.alamat}</span>
                  </div>
                )}
              </div>
            </div>
            <div className="pd-footer">
              <button className="btn-print-card" style={{ background: '#3b82f6' }} onClick={() => { setProfileDetail(null); setSelectedParticipant(profileDetail); }}>
                <Sparkles size={16} /> <span>Lihat ID Card</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {showAccessQR && (
        <div className="modal-overlay" onClick={() => setShowAccessQR(false)}>
          <div className="modal-content" style={{ maxWidth: '500px', background: 'white', borderRadius: '32px', padding: '20px' }} onClick={e => e.stopPropagation()}>
            <button className="close-modal" onClick={() => setShowAccessQR(false)}>&times;</button>
            <div className="qr-access-container" style={{ textAlign: 'center', padding: '20px' }}>
              <h2 style={{ fontSize: '24px', fontWeight: '900', marginBottom: '8px', color: '#1e3a8a' }}>Barcode Akses Katalog</h2>
              <p style={{ color: '#64748b', marginBottom: '24px', fontSize: '14px' }}>Scan barcode ini untuk masuk ke halaman Katalog Peserta secara mandiri.</p>

              <div style={{ background: 'white', padding: '20px', borderRadius: '32px', display: 'inline-flex', boxShadow: '0 20px 40px rgba(0,0,0,0.08)', border: '1px solid #f1f5f9', marginBottom: '24px' }}>
                <canvas ref={accessQRCanvasRef} style={{ width: '280px', height: '280px' }} />
              </div>

              <div className="url-display" style={{ background: '#f8fafc', padding: '12px 20px', borderRadius: '16px', border: '1px dashed #e2e8f0', marginBottom: '30px' }}>
                <span style={{ fontSize: '13px', color: '#64748b', fontWeight: '600' }}>{window.location.origin}/mandiri/katalog</span>
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                <button
                  className="btn-print-card"
                  style={{ background: '#3b82f6' }}
                  onClick={() => {
                    const canvas = accessQRCanvasRef.current;
                    if (canvas) {
                      const link = document.createElement('a');
                      link.download = `QR_AKSES_KATALOG_${new Date().getTime()}.png`;
                      link.href = canvas.toDataURL('image/png');
                      link.click();
                    }
                  }}
                >
                  <Download size={16} /> <span>Unduh Barcode</span>
                </button>
                <button className="btn-print-card" style={{ background: '#64748b' }} onClick={() => window.print()}>
                  <Printer size={16} /> <span>Cetak</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedParticipant && (
        <div className="modal-overlay" onClick={() => setSelectedParticipant(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <button className="close-modal" onClick={() => setSelectedParticipant(null)}>&times;</button>
            <div ref={singleCardRef} className={`id-card-comprehensive role-${["pengurus_daerah", "desa", "kelompok"].includes(selectedParticipant.role || "") ? "pengurus" :
              ["admin", "kmm_daerah", "tim_pnkb", "admin_romantic_room"].includes(selectedParticipant.role || "") || selectedParticipant.panitiaStatus ? "panitia" :
                "peserta"
              }`}>
              <div className="id-watermark-container">
                <div className="id-watermark wm-1">
                  {["pengurus_daerah", "desa", "kelompok"].includes(selectedParticipant.role || "") ? "PENGURUS" :
                    ["admin", "kmm_daerah", "tim_pnkb", "admin_romantic_room"].includes(selectedParticipant.role || "") ? "PANITIA" :
                      "PESERTA"}
                </div>
                <div className="id-watermark wm-2">
                  {["pengurus_daerah", "desa", "kelompok"].includes(selectedParticipant.role || "") ? "PENGURUS" :
                    ["admin", "kmm_daerah", "tim_pnkb", "admin_romantic_room"].includes(selectedParticipant.role || "") ? "PANITIA" :
                      "PESERTA"}
                </div>
                <div className="id-watermark wm-3">
                  {["pengurus_daerah", "desa", "kelompok"].includes(selectedParticipant.role || "") ? "PENGURUS" :
                    ["admin", "kmm_daerah", "tim_pnkb", "admin_romantic_room"].includes(selectedParticipant.role || "") || selectedParticipant.panitiaStatus ? "PANITIA" :
                      "PESERTA"}
                </div>
              </div>
              <div className="id-card-header">
                <div className="id-logo-box">
                  {siteLogo ? (
                    <img src={siteLogo} alt="Logo" style={{ width: "24px", height: "24px", objectFit: "contain" }} />
                  ) : (
                    <div style={{ width: "24px", height: "24px", background: "rgba(255,255,255,0.2)", borderRadius: "6px" }} />
                  )}
                  <span>{["pengurus_daerah", "desa", "kelompok"].includes(selectedParticipant.role || "") ? "PENGURUS" :
                    ["admin", "kmm_daerah", "tim_pnkb", "admin_romantic_room"].includes(selectedParticipant.role || "") || selectedParticipant.panitiaStatus ? "PANITIA" :
                      "PESERTA"}</span>
                </div>
                <div className="id-org-name" style={{ textTransform: "uppercase" }}>
                  {selectedParticipant.mandiriDesaKota || "Jakarta Barat 2"} &bull; {selectedParticipant.mandiriDesaNama || selectedParticipant.desaNama || "Semua"}
                </div>
              </div>

              <div className="id-card-main-content">
                <div className="id-photo-section">
                  <div className="id-photo-frame">
                    {selectedParticipant.foto ? <img src={selectedParticipant.foto} alt={selectedParticipant.nama} /> : <div className="id-initials-modal">{selectedParticipant.nama.charAt(0)}</div>}
                    <div className="id-kategori-sticker">
                      {["pengurus_daerah", "desa", "kelompok"].includes(selectedParticipant.role || "") ? "Pengurus" :
                        ["admin", "kmm_daerah", "tim_pnkb", "admin_romantic_room"].includes(selectedParticipant.role || "") || selectedParticipant.panitiaStatus ? "Panitia" :
                          "Peserta"}
                    </div>
                  </div>
                </div>

                <div className="id-info-section">
                  <h1 className="id-full-name">{selectedParticipant.nama}</h1>
                  <div style={{ display: "flex", flexDirection: "column", gap: "5px", alignItems: "center", justifyContent: "center", marginTop: "10px" }}>
                    <div className="id-member-code" style={{ fontSize: "16px", fontWeight: "900" }}>ID: {selectedParticipant.nomorUnik}</div>
                    {selectedParticipant.nomorUrut && (
                      <div className="id-member-code" style={{ opacity: 1, color: "white", background: "rgba(255,255,255,0.15)", padding: "4px 15px", borderRadius: "8px", border: "1.5px solid rgba(255,255,255,0.2)", fontSize: "18px", fontWeight: "950" }}>
                        NO. URUT: {selectedParticipant.nomorUrut}
                      </div>
                    )}
                  </div>


                  <div className="id-qr-box" style={{ padding: "10px", borderRadius: "14px", marginTop: "15px", background: "white", width: "140px", margin: "15px auto" }}>
                    <canvas ref={cardCanvasRef} style={{ width: '120px', height: '120px' }} />
                    <div className="id-qr-label" style={{ fontSize: "9px", marginTop: "6px", fontWeight: "900", color: "#000000", textTransform: "uppercase" }}>Verified Digital ID</div>
                  </div>
                </div>

                <div className="id-footer-section">
                  <div className="id-footer-grid">
                    <div className="id-footer-item">
                      <label>Alamat Tinggal</label>
                      <p>{selectedParticipant.alamat || "Detail alamat tidak tersedia"}</p>
                    </div>
                    {selectedParticipant.noTelp && (
                      <div className="id-footer-item">
                        <label>Nomor WhatsApp</label>
                        <p>{selectedParticipant.noTelp}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="id-card-footer">
                <div className="id-loc-pill">
                  <MapPin size={14} />
                  <span>{selectedParticipant.mandiriDesaKota || "-"} &bull; {selectedParticipant.mandiriDesaNama || selectedParticipant.desaNama || "-"}</span>
                </div>
                <div className="id-footer-right">
                  GENCAR &copy; 2026
                </div>
              </div>
              <div className="id-card-seal" />
            </div>

            <div className="modal-actions-print" style={{ gap: '12px' }}>
              <button className="btn-print-card" onClick={() => window.print()} style={{ background: '#64748b' }}>
                <Printer size={16} /> <span>Print</span>
              </button>
              <button className="btn-print-card" onClick={() => handleExportSinglePDF(selectedParticipant)}>
                <Download size={16} /> <span>Download PDF</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hidden Export Card Renderer */}
      <div style={{ position: "absolute", left: "-9999px", top: 0, zIndex: -100 }}>
        {exportParticipant && (
          <div ref={exportCardRef} className={`id-card-comprehensive role-${["pengurus_daerah", "desa", "kelompok"].includes(exportParticipant.role || "") ? "pengurus" :
            ["admin", "kmm_daerah", "tim_pnkb", "admin_romantic_room"].includes(exportParticipant.role || "") || exportParticipant.panitiaStatus ? "panitia" :
              "peserta"
            }`} style={{ boxShadow: 'none' }}>
            <div className="id-watermark-container">
              <div className="id-watermark wm-1">
                {["pengurus_daerah", "desa", "kelompok"].includes(exportParticipant.role || "") ? "PENGURUS" :
                  ["admin", "kmm_daerah", "tim_pnkb", "admin_romantic_room"].includes(exportParticipant.role || "") || exportParticipant.panitiaStatus ? "PANITIA" :
                    "PESERTA"}
              </div>
              <div className="id-watermark wm-2">
                {["pengurus_daerah", "desa", "kelompok"].includes(exportParticipant.role || "") ? "PENGURUS" :
                  ["admin", "kmm_daerah", "tim_pnkb", "admin_romantic_room"].includes(exportParticipant.role || "") || exportParticipant.panitiaStatus ? "PANITIA" :
                    "PESERTA"}
              </div>
            </div>
            <div className="id-card-header">
              <div className="id-logo-box">
                {siteLogo ? (
                  <img src={siteLogo} alt="Logo" style={{ width: "24px", height: "24px", objectFit: "contain" }} />
                ) : (
                  <div style={{ width: "24px", height: "24px", background: "rgba(255,255,255,0.2)", borderRadius: "6px" }} />
                )}
                <span>{["pengurus_daerah", "desa", "kelompok"].includes(exportParticipant.role || "") ? "PENGURUS" :
                  ["admin", "kmm_daerah", "tim_pnkb", "admin_romantic_room"].includes(exportParticipant.role || "") || exportParticipant.panitiaStatus ? "PANITIA" :
                    "PESERTA"}</span>
              </div>
              <div className="id-org-name">
                {exportParticipant.mandiriDesaKota || "Jakarta Barat 2"} &bull; {exportParticipant.mandiriDesaNama || exportParticipant.desaNama || "Semua"}
              </div>
            </div>

            <div className="id-card-main-content">
              <div className="id-photo-section">
                <div className="id-photo-frame">
                  {exportParticipant.foto ? <img src={exportParticipant.foto} alt={exportParticipant.nama} crossOrigin="anonymous" /> : <div className="id-initials-modal">{exportParticipant.nama.charAt(0)}</div>}
                  <div className="id-kategori-sticker">
                    {["pengurus_daerah", "desa", "kelompok"].includes(exportParticipant.role || "") ? "Pengurus" :
                      ["admin", "kmm_daerah", "tim_pnkb", "admin_romantic_room"].includes(exportParticipant.role || "") || exportParticipant.panitiaStatus ? "Panitia" :
                        "Peserta"}
                  </div>
                </div>
              </div>

              <div className="id-info-section">
                <h1 className="id-full-name">{exportParticipant.nama}</h1>
                <div style={{ display: "flex", flexDirection: "column", gap: "5px", alignItems: "center", justifyContent: "center", marginTop: "10px" }}>
                  <div className="id-member-code" style={{ fontSize: "16px", fontWeight: "900" }}>ID: {exportParticipant.nomorUnik}</div>
                  {exportParticipant.nomorUrut && (
                    <div className="id-member-code" style={{ opacity: 1, color: "white", background: "rgba(255,255,255,0.15)", padding: "4px 15px", borderRadius: "8px", border: "1.5px solid rgba(255,255,255,0.2)", fontSize: "18px", fontWeight: "950" }}>
                      NO. URUT: {exportParticipant.nomorUrut}
                    </div>
                  )}
                </div>


                <div className="id-qr-box" style={{ padding: "10px", borderRadius: "14px", marginTop: "15px", background: "white", width: "140px", margin: "15px auto" }}>
                  <canvas ref={exportQRCanvasRef} style={{ width: '120px', height: '120px' }} />
                  <div className="id-qr-label" style={{ fontSize: "9px", marginTop: "6px", fontWeight: "900", color: "#000000", textTransform: "uppercase" }}>Verified Digital ID</div>
                </div>
              </div>
              <div className="id-footer-section">
                <div className="id-address-section">
                  <label>Alamat Tinggal</label>
                  <p>{exportParticipant.alamat || "Detail alamat tidak tersedia"}</p>
                </div>
              </div>
            </div>

            <div className="id-card-footer">
              <div className="id-loc-pill">
                <MapPin size={14} />
                <span>{exportParticipant.mandiriDesaKota || "-"} &bull; {exportParticipant.mandiriDesaNama || exportParticipant.desaNama || "-"}</span>
              </div>
              <div className="id-footer-right">GENCAR &copy; 2026</div>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .pdkt-admin-container { 
          padding: 40px; 
          background: #fdfdfe; 
          min-height: 100vh; 
          font-family: 'Inter', system-ui, -apple-system, sans-serif; 
          color: #1e293b;
        }

        /* Header Styles */
        .page-header { 
          margin-bottom: 40px; 
        }
        .top-badge { 
          display: inline-flex; 
          align-items: center; 
          gap: 8px; 
          background: #eff6ff; 
          color: #3b82f6; 
          padding: 6px 14px; 
          border-radius: 30px; 
          font-size: 11px; 
          font-weight: 800; 
          letter-spacing: 0.5px;
          margin-bottom: 16px; 
        }
        .page-header h1 { 
          font-size: 34px; 
          font-weight: 900; 
          margin: 0; 
          letter-spacing: -0.5px;
        }
        .page-header h1 span { 
          background: linear-gradient(135deg, #3b82f6, #1d4ed8);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .subtitle { 
          color: #64748b; 
          font-size: 15px; 
          margin-top: 8px; 
          font-weight: 500; 
        }

        /* Stats Row */
        .stats-row {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 20px;
          margin-bottom: 32px;
        }
        .stat-card {
          background: white;
          padding: 24px;
          border-radius: 24px;
          border: 1px solid #f1f5f9;
          display: flex;
          align-items: center;
          gap: 16px;
          transition: 0.3s;
        }
        .stat-card:hover {
          box-shadow: 0 10px 25px rgba(0,0,0,0.04);
          border-color: #e2e8f0;
          transform: translateY(-2px);
        }
        .stat-icon {
          width: 48px;
          height: 48px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .stat-icon-blue { background: #eff6ff; color: #2563eb; }
        .stat-icon-indigo { background: #eef2ff; color: #4f46e5; }
        .stat-icon-pink { background: #fdf2f8; color: #db2777; }
        .stat-icon-green { background: #f0fdf4; color: #16a34a; }
        
        .stat-info {
          display: flex;
          flex-direction: column;
        }
        .stat-label {
          font-size: 13px;
          color: #64748b;
          font-weight: 600;
        }
        .stat-value {
          font-size: 24px;
          font-weight: 800;
          line-height: 1;
          margin-top: 4px;
        }
        .val-indigo { color: #3730a3; }
        .val-pink { color: #9d174d; }
        
        .stat-status {
          font-size: 11px;
          font-weight: 900;
          margin-top: 6px;
          padding: 2px 8px;
          border-radius: 6px;
          display: inline-block;
          width: fit-content;
        }
        .stat-status.open { background: #dcfce7; color: #166534; }
        .stat-status.closed { background: #fee2e2; color: #991b1b; }

        /* Toolbar Styles */
        .toolbar-section { 
          background: white; 
          padding: 30px; 
          border-radius: 32px; 
          box-shadow: 0 4px 30px rgba(0,0,0,0.02); 
          border: 1px solid #f1f5f9; 
          margin-bottom: 40px;
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .toolbar-top-row {
          display: flex;
          gap: 20px;
          align-items: center;
          flex-wrap: wrap;
        }

        .search-box { 
          flex: 2; 
          min-width: 300px;
          display: flex; 
          align-items: center; 
          gap: 12px; 
          background: #f8fafc; 
          border: 1.5px solid #f1f5f9; 
          padding: 12px 20px; 
          border-radius: 18px; 
          transition: 0.2s;
          position: relative;
        }
        .search-box:focus-within {
          background: white;
          border-color: #3b82f6;
          box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.08);
        }
        .search-box input { 
          border: none; 
          background: transparent; 
          outline: none; 
          width: 100%; 
          color: #1e293b; 
          font-size: 14px;
          font-weight: 500; 
        }
        .clear-search-btn-admin {
          background: #f1f5f9;
          border: none;
          border-radius: 50%;
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          color: #64748b;
          transition: 0.2s;
        }
        .clear-search-btn-admin:hover {
          background: #e2e8f0;
          color: #1e293b;
        }

        .main-actions {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }

        .export-actions-bar {
          background: #f8fafc;
          padding: 16px;
          border-radius: 20px;
          border: 1px solid #f1f5f9;
        }
        .export-group {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
        }

        .btn-toggle-public {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 0 18px;
          height: 44px;
          border-radius: 14px;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          transition: 0.2s;
          border: 1.5px solid #fee2e2;
          background: #fef2f2;
          color: #ef4444;
        }
        .btn-toggle-public.active {
          background: #f0fdf4;
          border-color: #dcfce7;
          color: #16a34a;
        }
        .btn-box-love {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 0 18px;
          height: 44px;
          border-radius: 14px;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          transition: 0.2s;
          border: 1.5px solid #fce7f3;
          background: #fdf2f8;
          color: #be185d;
        }
        .btn-box-love.active {
          background: linear-gradient(135deg, #ec4899, #be185d);
          border-color: #be185d;
          color: white;
          box-shadow: 0 4px 12px rgba(190, 24, 93, 0.2);
        }
        .btn-export-id-cards {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 0 18px;
          height: 40px;
          border-radius: 12px;
          background: #1e293b;
          color: white;
          border: none;
          font-size: 11px;
          font-weight: 700;
          cursor: pointer;
          transition: 0.2s;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .btn-export-id-cards:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
          filter: brightness(1.1);
        }
        .btn-icon-sq {
          width: 44px;
          height: 44px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 14px;
          border: 1.5px solid #e2e8f0;
          background: white;
          color: #64748b;
          cursor: pointer;
          transition: 0.2s;
        }

        .filters-container {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .filters-header {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 12px;
          font-weight: 800;
          color: #1e293b;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        .filters-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 20px;
        }
        .filter-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .filter-group label {
          font-size: 10px;
          font-weight: 800;
          color: #94a3b8;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          padding-left: 4px;
        }
        .pill-group { 
          display: flex; 
          background: #f1f5f9; 
          padding: 3px; 
          border-radius: 12px; 
          gap: 3px; 
        }
        .pill-group button { 
          border: none; 
          background: transparent; 
          padding: 8px 12px; 
          border-radius: 9px; 
          font-size: 11px; 
          font-weight: 700; 
          color: #64748b; 
          cursor: pointer; 
          transition: 0.2s; 
          flex: 1;
        }
        .pill-group button.active { 
          background: white; 
          color: #3b82f6; 
          box-shadow: 0 2px 6px rgba(0,0,0,0.05); 
        }

        .select-box-wrapper { position: relative; display: flex; align-items: center; }
        .dropdown-box { 
          appearance: none;
          background: white; 
          border: 1.5px solid #f1f5f9; 
          padding: 10px 36px 10px 14px; 
          border-radius: 12px; 
          font-size: 11px; 
          font-weight: 700; 
          color: #1e293b; 
          cursor: pointer;
          outline: none;
          width: 100%;
          transition: 0.2s;
        }
        .dropdown-box:focus {
          border-color: #3b82f6;
        }
        .dropdown-arrow {
          position: absolute;
          right: 12px;
          pointer-events: none;
          color: #94a3b8;
        }

        /* Grid & Card Styles */
        .grid-section { 
          display: grid; 
          grid-template-columns: repeat(auto-fill, minmax(420px, 1fr)); 
          gap: 30px; 
        }
        .participant-card { 
          background: white; 
          border-radius: 32px; 
          border: 1px solid #f1f5f9; 
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1); 
          overflow: hidden; 
          position: relative;
        }
        .participant-card:hover { 
          transform: translateY(-6px); 
          box-shadow: 0 20px 40px rgba(0,0,0,0.06); 
          border-color: #3b82f633; 
        }
        .card-inner {
          height: 100%;
          display: flex;
          flex-direction: column;
        }
        .card-main {
          padding: 32px;
          display: flex;
          gap: 24px;
          flex: 1;
        }
        .card-photo-col {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
        }
        .photo-wrapper {
          width: 120px;
          height: 120px;
          border-radius: 28px;
          position: relative;
          background: #f8fafc;
          overflow: hidden;
          border: 4px solid white;
          box-shadow: 0 8px 24px rgba(0,0,0,0.1);
        }
        .photo-wrapper img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .photo-placeholder {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 40px;
          font-weight: 900;
          color: #3b82f6;
          background: #eff6ff;
        }
        .status-badge {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          padding: 4px 0;
          font-size: 8px;
          font-weight: 950;
          text-align: center;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: white;
        }
        .status-badge.peserta { background: #3b82f6; }
        .status-badge.panitia { background: #10b981; }

        .no-urut-tag {
          font-size: 13px;
          font-weight: 900;
          color: #3b82f6;
          font-family: 'JetBrains Mono', monospace;
          background: #eff6ff;
          padding: 2px 10px;
          border-radius: 8px;
        }

        .card-info-col {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 12px;
          min-width: 0;
        }
        .info-header {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .participant-name {
          font-size: 24px;
          font-weight: 800;
          margin: 0;
          color: #0f172a;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .region-tag {
          display: flex;
          align-items: center;
          gap: 4px;
          color: #64748b;
          font-size: 12px;
          font-weight: 600;
        }
        .region-tag svg { color: #3b82f6; }

        .tags-row {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }
        .info-pill {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          border-radius: 10px;
          background: #f1f5f9;
          font-size: 12px;
          font-weight: 700;
          color: #475569;
        }
        .ig-pill {
          background: #fdf2f8;
          color: #be185d;
        }
        
        /* Instagram Link Styles */
        .instagram-link {
          color: #be185d;
          text-decoration: none;
          transition: opacity 0.2s;
        }
        .instagram-link:hover {
          text-decoration: underline;
          opacity: 0.8;
        }
        
        .instagram-link-contact {
          color: #be185d;
          text-decoration: none;
          font-weight: 600;
          transition: opacity 0.2s;
        }
        .instagram-link-contact:hover {
          text-decoration: underline;
          opacity: 0.8;
        }

        .contact-info {
          display: flex;
          flex-direction: column;
          gap: 6px;
          margin-top: auto;
        }
        .contact-item {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 14px;
          font-weight: 600;
          color: #1e293b;
        }
        .text-wa { color: #16a34a; }
        .wa-link-text { 
          color: #16a34a; 
          text-decoration: none; 
          font-weight: 700; 
        }
        .wa-link-text:hover { 
          text-decoration: underline; 
        }
        
        .address-item {
          font-size: 13px !important;
          color: #475569 !important;
        }
        
        .id-footer-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          text-align: left;
        }
        .id-footer-item label {
          display: block;
          font-size: 10px;
          font-weight: 800;
          color: rgba(255,255,255,0.6);
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-bottom: 4px;
        }
        .id-footer-item p {
          font-size: 12px;
          color: white;
          font-weight: 600;
          margin: 0;
          line-height: 1.4;
        }
        .text-job { color: #3b82f6; }
        .text-ig { color: #be185d; }

        .card-footer {
          display: flex;
          padding: 16px 24px;
          gap: 12px;
          background: #fbfcfd;
          border-top: 1px solid #f1f5f9;
        }
        .footer-btn {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          height: 42px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          transition: 0.2s;
          text-decoration: none;
        }
        .btn-id-card {
          background: #eff6ff;
          color: #3b82f6;
          border: 1px solid #dbeafe;
        }
        .btn-id-card:hover { background: #dbeafe; }
        .btn-profile-detail {
          background: white;
          color: #475569;
          border: 1px solid #e2e8f0;
        }
        .btn-profile-detail:hover { background: #f8fafc; border-color: #cbd5e1; }

        /* Photo clickable */
        .photo-clickable { cursor: pointer; }
        .photo-zoom-hint {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(0,0,0,0.4);
          font-size: 20px;
          opacity: 0;
          transition: opacity 0.2s;
          border-radius: 22px;
        }
        .photo-clickable:hover .photo-zoom-hint { opacity: 1; }

        /* Zoom Photo Modal */
        .zoom-overlay { background: rgba(0,0,0,0.75); backdrop-filter: blur(12px); }
        .zoom-modal {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
          padding: 16px;
        }
        .zoom-img {
          width: 340px;
          height: 340px;
          object-fit: cover;
          border-radius: 28px;
          border: 4px solid white;
          box-shadow: 0 30px 60px rgba(0,0,0,0.4);
        }
        .zoom-placeholder {
          width: 340px;
          height: 340px;
          border-radius: 28px;
          border: 4px solid white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 120px;
          font-weight: 900;
          color: #3b82f6;
          background: #eff6ff;
        }
        .zoom-name {
          color: white;
          font-size: 20px;
          font-weight: 800;
          text-align: center;
          text-shadow: 0 2px 8px rgba(0,0,0,0.5);
        }
        .zoom-detail-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          background: white;
          color: #1e293b;
          border: none;
          padding: 12px 24px;
          border-radius: 16px;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          transition: 0.2s;
        }
        .zoom-detail-btn:hover { background: #f1f5f9; transform: translateY(-1px); }

        /* Profile Detail Modal */
        .profile-detail-modal {
          background: white;
          border-radius: 28px;
          width: 480px;
          max-width: 100%;
          overflow: hidden;
          padding: 0 !important;
        }
        .pd-header {
          display: flex;
          align-items: center;
          gap: 20px;
          padding: 28px 28px 24px;
          color: white;
        }
        .pd-photo {
          width: 80px;
          height: 80px;
          border-radius: 20px;
          overflow: hidden;
          border: 3px solid rgba(255,255,255,0.4);
          flex-shrink: 0;
        }
        .pd-photo img { width: 100%; height: 100%; object-fit: cover; }
        .pd-initials {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 32px;
          font-weight: 900;
          background: rgba(255,255,255,0.2);
        }
        .pd-header-info { flex: 1; min-width: 0; }
        .pd-status-badge {
          display: inline-block;
          background: rgba(255,255,255,0.2);
          border: 1px solid rgba(255,255,255,0.3);
          padding: 2px 10px;
          border-radius: 20px;
          font-size: 11px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 6px;
        }
        .pd-name {
          font-size: 20px;
          font-weight: 900;
          margin: 0 0 6px;
          line-height: 1.2;
        }
        .pd-region {
          display: flex;
          align-items: center;
          gap: 5px;
          font-size: 12px;
          font-weight: 600;
          opacity: 0.85;
        }
        .pd-body { padding: 24px 28px; }
        .pd-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }
        .pd-item {
          display: flex;
          flex-direction: column;
          gap: 3px;
        }
        .pd-item-full { grid-column: 1 / -1; }
        .pd-label {
          font-size: 10px;
          font-weight: 800;
          color: #94a3b8;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .pd-value {
          font-size: 13px;
          font-weight: 600;
          color: #1e293b;
          line-height: 1.4;
        }
        .pd-link {
          font-size: 13px;
          font-weight: 700;
          text-decoration: none;
        }
        .pd-link-wa { color: #16a34a; }
        .pd-link-wa:hover { text-decoration: underline; }
        .pd-link-ig { color: #be185d; }
        .pd-link-ig:hover { text-decoration: underline; }
        .pd-footer {
          padding: 16px 28px 24px;
          display: flex;
          justify-content: center;
          border-top: 1px solid #f1f5f9;
        }

        /* Modal & Print Styles (Preserved/Enhanced) */
        .modal-overlay { position: fixed; inset: 0; background: rgba(15, 23, 42, 0.4); backdrop-filter: blur(8px); z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 20px; }
        .modal-content { position: relative; max-width: 100%; max-height: 95vh; overflow-y: auto; padding: 10px; }
        .close-modal { position: absolute; top: 0; right: 0; width: 44px; height: 44px; border-radius: 50%; background: white; border: none; font-size: 24px; font-weight: 700; cursor: pointer; box-shadow: 0 10px 20px rgba(0,0,0,0.1); z-index: 10; display: flex; align-items: center; justify-content: center; }
        
        @media (max-width: 992px) {
          .toolbar-top-row { flex-direction: column; align-items: stretch; }
          .search-box { width: 100%; flex: none; }
          .main-actions { justify-content: space-between; }
        }

        @media (max-width: 768px) {
          .pdkt-admin-container { padding: 20px; }
          .toolbar-section { padding: 20px; }
          .export-group { justify-content: center; }
          .btn-export-id-cards { flex: 1; min-width: 140px; justify-content: center; }
          .filters-grid { grid-template-columns: 1fr; }
          .grid-section { grid-template-columns: 1fr; }
        }
        .modal-actions-print { margin-top: 20px; display: flex; justify-content: center; gap: 12px; }
        .btn-print-card { display: flex; align-items: center; gap: 10px; background: #1e293b; color: white; border: none; padding: 12px 24px; border-radius: 16px; font-size: 14px; font-weight: 700; cursor: pointer; transition: 0.3s; }
        .btn-print-card:hover { transform: translateY(-2px); box-shadow: 0 10px 20px rgba(0,0,0,0.2); }

        /* ID Card Styles */
        .id-card-comprehensive { width: 10.5cm; height: 17cm; border-radius: 12mm; position: relative; overflow: hidden; display: flex; flex-direction: column; color: white; background: white; box-shadow: 0 20px 50px rgba(0,0,0,0.3); }
        .role-peserta { background: linear-gradient(180deg, #be185d 0%, #9d174d 100%); border: 1px solid #be185d; color: white; }
        .role-pengurus { background: linear-gradient(180deg, #059669 0%, #064e3b 100%); border: 1px solid #059669; color: white; }
        .role-panitia { background: linear-gradient(180deg, #1d4ed8 0%, #1e3a8a 100%); border: 1px solid #1d4ed8; color: white; }

        .id-watermark-container { position: absolute; inset: 0; display: flex; flex-direction: column; justify-content: space-around; align-items: center; pointer-events: none; z-index: 1; }
        .id-watermark { font-size: 80px; font-weight: 950; opacity: 0.08; transform: rotate(-30deg); white-space: nowrap; letter-spacing: 10px; text-transform: uppercase; }
        .wm-1 { margin-top: 100px; margin-left: -50px; }
        .wm-2 { margin-left: 50px; }
        .wm-3 { margin-bottom: 100px; margin-left: -50px; }

        .id-card-header { height: 2.5cm; padding: 0 30px; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; gap: 8px; position: relative; z-index: 5; background: rgba(0,0,0,0.1); }
        .role-peserta .id-card-header { background: linear-gradient(135deg, #be185d, #ec4899); color: white; }
        .role-pengurus .id-card-header { background: linear-gradient(135deg, #2e7d32, #4caf50); color: white; }
        .role-panitia .id-card-header { background: linear-gradient(135deg, #0d47a1, #2196f3); color: white; }

        .id-logo-box { display: flex; align-items: center; gap: 10px; }
        .id-logo-box span { font-weight: 950; font-size: 20px; letter-spacing: 2px; color: white !important; }
        .id-org-name { font-size: 11px; font-weight: 700; opacity: 0.9; text-transform: uppercase; color: white !important; }

        .id-card-main-content { flex: 1; display: flex; flex-direction: column; padding: 30px; align-items: center; gap: 20px; position: relative; z-index: 5; }
        .id-photo-frame { width: 4.5cm; height: 6cm; background: #f1f5f9; border-radius: 10mm; overflow: hidden; border: 4px solid white; box-shadow: 0 10px 20px rgba(0,0,0,0.1); position: relative; }
        .id-photo-frame img { width: 100%; height: 100%; object-fit: cover; }
        .id-initials-modal { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background: #f1f5f9; color: #64748b; font-size: 60px; font-weight: 950; }
        .id-kategori-sticker { position: absolute; bottom: 0; left: 0; right: 0; background: rgba(255,255,255,0.95); padding: 10px 5px; text-align: center; font-size: 16px; font-weight: 950; text-transform: uppercase; letter-spacing: 1px; }
        .role-peserta .id-kategori-sticker { color: #be185d; }
        .role-pengurus .id-kategori-sticker { color: #2e7d32; }
        .role-panitia .id-kategori-sticker { color: #0d47a1; }

        .id-full-name { font-size: 24px; font-weight: 950; line-height: 1.1; margin-bottom: 5px; text-align: center; }
        .id-member-code { font-size: 14px; font-weight: 800; opacity: 0.7; font-family: monospace; }
        .id-qr-box { display: flex; flex-direction: column; align-items: center; gap: 8px; background: white; border-radius: 15px; box-shadow: 0 4px 10px rgba(0,0,0,0.05); }
        .id-qr-label { font-size: 9px; font-weight: 800; color: #1e40af; text-transform: uppercase; }

        .id-footer-section { width: 100%; margin-top: auto; }
        .id-address-section { margin-top: 15px; border-top: 1px dashed rgba(255,255,255,0.3); padding-top: 12px; text-align: left; width: 100%; }
        .id-address-section label { font-size: 9px; text-transform: uppercase; font-weight: 800; opacity: 0.8; color: inherit; display: block; margin-bottom: 4px; letter-spacing: 0.5px; }
        .id-address-section p { font-size: 11px; margin: 0; line-height: 1.4; color: inherit; font-weight: 600; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; }
        
        .text-home { color: #8b5cf6; }
        .address-item { margin-top: 4px; border-top: 1px solid #f8fafc; padding-top: 4px; }
        .id-card-footer { height: 2.2cm; padding: 0 30px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; position: relative; z-index: 5; background: rgba(0,0,0,0.05); }
        .role-peserta .id-card-footer { background: #1e3a8a; color: white !important; }
        .role-pengurus .id-card-footer { background: #1b5e20; color: white !important; }
        .role-panitia .id-card-footer { background: #0d47a1; color: white !important; }
        .id-loc-pill { display: flex; align-items: center; gap: 8px; color: white; padding: 8px 18px; border-radius: 30px; font-size: 13px; font-weight: 800; background: rgba(255,255,255,0.15); border: 1px solid rgba(255,255,255,0.3); }
        .id-footer-right { font-size: 11px; font-weight: 800; opacity: 0.5; text-transform: uppercase; letter-spacing: 1px; color: white !important; }
        .id-card-seal { position: absolute; bottom: -40px; right: -40px; width: 150px; height: 150px; background: #cbd5e1; opacity: 0.1; border-radius: 50%; }
        
        .line-clamp-1 {
          display: -webkit-box;
          -webkit-line-clamp: 1;
          -webkit-box-orient: vertical;  
          overflow: hidden;
        }

        @media print {
          .pdkt-admin-container > * { display: none !important; }
          .modal-overlay { position: static; background: none; padding: 0; display: block; }
          .modal-content { padding: 0; overflow: visible; display: flex; justify-content: center; align-items: center; min-height: 100vh; }
          .close-modal, .modal-actions-print { display: none !important; }
          .id-card-comprehensive { box-shadow: none; margin: 0; border: none; break-inside: avoid; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        }
        .url-display {
          transition: all 0.3s ease;
        }
        .url-display:hover {
          background: #eff6ff !important;
          border-color: #3b82f6 !important;
        }
        .qr-access-container canvas {
          max-width: 100%;
          height: auto !important;
        }
      `}</style>
    </div>
  );
}

function calculateAge(birthdayStr?: string) {
  if (!birthdayStr) return "-";
  const birthDate = new Date(birthdayStr);
  if (isNaN(birthDate.getTime())) return "-";
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  if (today.getMonth() < birthDate.getMonth() || (today.getMonth() === birthDate.getMonth() && today.getDate() < birthDate.getDate())) age--;
  return age;
}
