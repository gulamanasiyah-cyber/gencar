"use client";

import Topbar from "@/components/Topbar";
import { useState, useEffect, useCallback } from "react";
import Swal from "sweetalert2";
import {
  Search,
  UserPlus,
  Edit2,
  Trash2,
  Shield,
  Link as LinkIcon,
  CheckCircle2,
  ToggleLeft,
  ToggleRight,
  Upload,
  X,
  Mars,
  Venus,
  Download,
} from "lucide-react";
import ExcelJS from "exceljs";

type TimGambuhType =
  | "PNKB"
  | "Ibu Gambuh"
  | "Penunggu PNKB"
  | "Penunggu Ibu Gambuh";

interface TimGambuhItem {
  id: string;
  nama: string;
  umur: number | null;
  daerahId: number | null;
  daerahNama: string | null;
  desaId: number | null;
  desaNama: string | null;
  kelompokId?: number | null;
  kelompokNama?: string | null;
  tipe: TimGambuhType;
  noTelp?: string | null;
  foto?: string | null;
  createdAt: string | null;
}

interface DaerahItem {
  id: number;
  nama: string;
}

interface DesaItem {
  id: number;
  nama: string;
  mandiriDaerahId: number;
}

interface FormState {
  nama: string;
  umur: string;
  daerahId: string;
  desaId: string;
  tipe: TimGambuhType;
  foto: string;
}

const initialForm: FormState = {
  nama: "",
  umur: "",
  daerahId: "",
  desaId: "",
  tipe: "PNKB",
  foto: "",
};

function detectGenderFromName(nama: string): TimGambuhType | null {
  if (!nama.trim()) return null;

  const lower = nama.toLowerCase().trim();
  const firstWord = lower.split(/\s+/)[0];
  const lastWord = lower.split(/\s+/).pop() || "";

  const femaleSuffixes = [
    "wati",
    "ningsih",
    "yanti",
    "anti",
    "sari",
    "dewi",
    "ayu",
    "indah",
    "putri",
    "rina",
    "ani",
    "yani",
    "tuti",
    "nita",
    "linda",
    "diana",
    "fitri",
    "handayani",
    "lestari",
    "kartika",
    "endah",
    "ratna",
    "asih",
    "murni",
    "hasanah",
    "khasanah",
    "fauziah",
    "rohmah",
    "maryam",
    "fatimah",
    "halimah",
    "aminah",
    "zahra",
    "rahayu",
    "novita",
    "susanti",
    "priyanti",
    "apriyanti",
    "oktaviani",
    "nurani",
    "sundari",
    "wardani",
    "pertiwi",
    "anggraeni",
    "anggraini",
    "wahyuni",
    "astuti",
    "widyawati",
    "utami",
  ];

  const femaleFirstNames = [
    "siti",
    "sri",
    "dewi",
    "ayu",
    "putri",
    "rini",
    "rina",
    "dian",
    "diana",
    "fitri",
    "yuni",
    "juni",
    "mega",
    "citra",
    "hana",
    "ratu",
    "bunga",
    "nurul",
    "nuraini",
    "ida",
    "eka",
    "desi",
    "evi",
    "yuli",
    "lia",
    "lina",
    "lisa",
    "rita",
    "rosa",
    "tuti",
    "wati",
    "sari",
    "indah",
    "maya",
    "mira",
    "nia",
    "nita",
    "novi",
    "novia",
    "risa",
    "sinta",
    "tika",
    "winda",
    "zara",
    "zahra",
    "nayla",
    "nadia",
    "rahma",
    "salma",
    "dina",
    "fina",
    "gina",
    "heni",
    "irma",
    "karin",
    "lana",
    "mila",
    "nana",
    "olga",
    "vera",
    "weni",
    "anisa",
    "annisa",
    "bella",
    "cindy",
    "della",
    "ella",
    "feby",
    "ghina",
    "hilda",
    "julia",
    "karina",
    "laila",
    "melia",
    "nela",
    "reni",
    "selvi",
    "tiara",
    "ulfa",
    "vina",
    "widya",
    "yessi",
    "zelda",
    "nabila",
    "aulia",
    "azizah",
    "halimah",
    "khairunnisa",
    "nur",
    "nurhasanah",
    "nurhayati",
    "nurlela",
    "nurlia",
    "nisa",
    "nisaa",
    "risma",
    "safitri",
    "salsa",
    "shinta",
    "silvi",
    "silvya",
    "sindy",
    "tri",
    "triana",
    "umy",
    "umi",
    "yesi",
    "yola",
    "zulfa",
    "zulia",
    "zuhriyah",
  ];

  const maleSuffixes = [
    "wan",
    "wira",
    "pratama",
    "putra",
    "tama",
    "anto",
    "ianto",
  ];

  const maleFirstNames = [
    "ahmad",
    "muhammad",
    "budi",
    "eko",
    "andi",
    "aditya",
    "fajar",
    "rizki",
    "doni",
    "hendra",
    "agus",
    "wahyu",
    "yudi",
    "hadi",
    "arif",
    "dedi",
    "feri",
    "gani",
    "heri",
    "ilham",
    "joko",
    "koko",
    "luki",
    "madi",
    "pandu",
    "rudi",
    "sandi",
    "toni",
    "udin",
    "abi",
    "adi",
    "agung",
    "akbar",
    "alan",
    "aldo",
    "alex",
    "alfian",
    "ali",
    "alif",
    "amin",
    "amri",
    "anang",
    "anas",
    "andika",
    "andri",
    "anjar",
    "anto",
    "anwar",
    "ari",
    "arman",
    "aryo",
    "asep",
    "aziz",
    "bagas",
    "bagus",
    "bayu",
    "benny",
    "bima",
    "bisma",
    "dani",
    "danu",
    "darmawan",
    "dede",
    "deny",
    "dicky",
    "dimas",
    "dodi",
    "donny",
    "dwi",
    "edy",
    "edwin",
    "efendi",
    "egi",
    "elang",
    "erlan",
    "erwin",
    "farhan",
    "faris",
    "ferry",
    "firman",
    "fuad",
    "galang",
    "galih",
    "gilang",
    "giri",
    "gunawan",
    "guntur",
    "hafiz",
    "haikal",
    "hamid",
    "hamza",
    "hanif",
    "haris",
    "hendri",
    "herman",
    "herwin",
    "hilman",
    "ibnu",
    "ichsan",
    "iqbal",
    "irfan",
    "ismail",
    "iwan",
    "jefri",
    "julian",
    "karyo",
    "kemal",
    "khairul",
    "latif",
    "lukman",
    "lutfi",
    "mahdi",
    "mahmud",
    "maman",
    "mario",
    "marwan",
    "maulana",
    "miko",
    "mirza",
    "mustofa",
    "nando",
    "nanang",
    "naufal",
    "nizar",
    "noval",
    "novian",
    "oka",
    "panji",
    "prasetyo",
    "prima",
    "puji",
    "rafi",
    "rafik",
    "rahmat",
    "randy",
    "rangga",
    "reza",
    "ridho",
    "riski",
    "rizal",
    "robby",
    "rohman",
    "rohmat",
    "roni",
    "rudy",
    "salman",
    "satrio",
    "satya",
    "setiawan",
    "sigit",
    "slamet",
    "sofyan",
    "soleh",
    "subhan",
    "sudirman",
    "sugeng",
    "sugianto",
    "suharto",
    "sulaiman",
    "surya",
    "susanto",
    "syaiful",
    "tegar",
    "teguh",
    "umar",
    "wahid",
    "wahyudi",
    "wisnu",
    "yasin",
    "yogi",
    "yudha",
    "yusuf",
    "zainal",
    "zaki",
    "faiz",
    "faizal",
    "fajri",
    "fakhri",
    "habib",
    "hafidz",
    "hakim",
    "harun",
    "haykal",
    "imam",
    "irvan",
    "irwan",
    "ivan",
    "kevin",
    "malik",
    "nabil",
    "najib",
    "rayhan",
    "rifki",
    "rifky",
    "riyandi",
    "ryan",
    "satria",
  ];

  if (femaleSuffixes.some((s) => lower.endsWith(s) || lastWord === s)) {
    return "Ibu Gambuh";
  }

  if (femaleFirstNames.includes(firstWord)) {
    return "Ibu Gambuh";
  }

  if (maleSuffixes.some((s) => lower.endsWith(s) || lastWord === s)) {
    return "PNKB";
  }

  if (maleFirstNames.includes(firstWord)) {
    return "PNKB";
  }

  return null;
}

export default function AdminTimGambuhPage() {
  const [members, setMembers] = useState<TimGambuhItem[]>([]);
  const [daerahList, setDaerahList] = useState<DaerahItem[]>([]);
  const [desaList, setDesaList] = useState<DesaItem[]>([]);
  const [filteredDesaList, setFilteredDesaList] = useState<DesaItem[]>([]);

  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState("");

  const [kegiatanList, setKegiatanList] = useState<any[]>([]);
  const [selectedKegiatanId, setSelectedKegiatanId] = useState<string>("active");

  const [registrationStatus, setRegistrationStatus] = useState<string>("closed");
  const [togglingStatus, setTogglingStatus] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"All" | TimGambuhType>("All");

  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState("");
  const [copiedLink, setCopiedLink] = useState(false);
  const [autoDetected, setAutoDetected] = useState(false);

  // INI BAGIAN PENTING UNTUK MENGATASI ERROR:
  // ReferenceError: uploadingFoto is not defined
  const [uploadingFoto, setUploadingFoto] = useState(false);

  const [form, setForm] = useState<FormState>(initialForm);

  const fetchJson = async (url: string) => {
    const res = await fetch(url, { cache: "no-store" });
    const data = await res.json().catch(() => null);

    if (!res.ok) {
      throw new Error(data?.error || `Gagal mengambil data dari ${url}`);
    }

    return data;
  };

  const fetchData = useCallback(async () => {
    setLoading(true);

    try {
      const [
        membersRes,
        daerahsRes,
        desasRes,
        kegiatanRes,
        statusRes,
      ] = await Promise.all([
        fetchJson(`/api/admin/tim-gambuh?kegiatanId=${selectedKegiatanId}`),
        fetchJson("/api/public/mandiri/daerah"),
        fetchJson("/api/public/mandiri/desa"),
        fetchJson("/api/mandiri/kegiatan"),
        fetchJson("/api/public/mandiri/settings?key=mandiri_daftar_tim_gambuh_status"),
      ]);

      setMembers(Array.isArray(membersRes) ? membersRes : []);
      setDaerahList(Array.isArray(daerahsRes) ? daerahsRes : []);
      setDesaList(Array.isArray(desasRes) ? desasRes : []);
      setKegiatanList(Array.isArray(kegiatanRes) ? kegiatanRes : []);

      if (statusRes?.value) {
        setRegistrationStatus(statusRes.value);
      }
    } catch (err) {
      console.error("Error fetching Tim Gambuh data:", err);

      Swal.fire({
        icon: "error",
        title: "Gagal Memuat Data",
        text: "Terjadi kesalahan saat mengambil data Tim Gambuh.",
      });
    } finally {
      setLoading(false);
    }
  }, [selectedKegiatanId]);

  useEffect(() => {
    fetchData();

    fetch("/api/profile", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setUserRole(d?.role || ""))
      .catch(() => setUserRole(""));
  }, [fetchData]);

  useEffect(() => {
    if (!form.daerahId) {
      setFilteredDesaList([]);
      return;
    }

    const filtered = desaList.filter(
      (d) => d.mandiriDaerahId === Number(form.daerahId)
    );

    setFilteredDesaList(filtered);
  }, [form.daerahId, desaList]);

  const handleOpenAdd = () => {
    setIsEditing(false);
    setEditId("");
    setAutoDetected(false);
    setUploadingFoto(false);
    setForm(initialForm);
    setFilteredDesaList([]);
    setShowModal(true);
  };

  const handleOpenEdit = (member: TimGambuhItem) => {
    setIsEditing(true);
    setEditId(member.id);
    setAutoDetected(false);
    setUploadingFoto(false);

    setForm({
      nama: member.nama || "",
      umur: member.umur != null ? String(member.umur) : "",
      daerahId: member.daerahId ? String(member.daerahId) : "",
      desaId: member.desaId ? String(member.desaId) : "",
      tipe: member.tipe || "PNKB",
      foto: member.foto || "",
    });

    if (member.daerahId) {
      const filtered = desaList.filter(
        (d) => d.mandiriDaerahId === Number(member.daerahId)
      );
      setFilteredDesaList(filtered);
    } else {
      setFilteredDesaList([]);
    }

    setShowModal(true);
  };

  const handleFotoUpload = async (file?: File) => {
    if (!file) return;

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    const maxSize = 2 * 1024 * 1024;

    if (!allowedTypes.includes(file.type)) {
      Swal.fire({
        icon: "warning",
        title: "Format Tidak Valid",
        text: "Gunakan format JPG, PNG, atau WEBP.",
      });
      return;
    }

    if (file.size > maxSize) {
      Swal.fire({
        icon: "warning",
        title: "File Terlalu Besar",
        text: "Ukuran foto maksimal 2MB.",
      });
      return;
    }

    setUploadingFoto(true);

    const uploadForm = new FormData();
    uploadForm.append("file", file);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: uploadForm,
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.url) {
        throw new Error(data?.error || "Gagal mengupload foto.");
      }

      setForm((prev) => ({
        ...prev,
        foto: data.url,
      }));

      Swal.fire({
        icon: "success",
        title: "Foto Berhasil Diupload",
        timer: 1200,
        showConfirmButton: false,
        toast: true,
        position: "top-end",
      });
    } catch (err: any) {
      Swal.fire({
        icon: "error",
        title: "Upload Gagal",
        text: err?.message || "Terjadi kesalahan saat upload foto.",
      });
    } finally {
      setUploadingFoto(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.nama.trim() || !form.tipe || !form.daerahId || !form.desaId) {
      Swal.fire({
        icon: "warning",
        title: "Data Tidak Lengkap",
        text: "Nama, Tipe, Daerah, dan Desa wajib diisi.",
      });
      return;
    }

    setLoading(true);

    try {
      const url = isEditing
        ? `/api/admin/tim-gambuh/${editId}`
        : "/api/admin/tim-gambuh";

      const method = isEditing ? "PUT" : "POST";

      const payload = {
        nama: form.nama.trim(),
        umur: form.umur ? Number(form.umur) : null,
        daerahId: form.daerahId ? Number(form.daerahId) : null,
        desaId: form.desaId ? Number(form.desaId) : null,
        tipe: form.tipe,
        foto: form.foto || null,
      };

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.error || "Gagal menyimpan data.");
      }

      Swal.fire({
        icon: "success",
        title: "Berhasil",
        text: isEditing
          ? "Data berhasil diperbarui."
          : "Anggota berhasil ditambahkan.",
        timer: 1500,
        showConfirmButton: false,
      });

      setShowModal(false);
      setForm(initialForm);
      await fetchData();
    } catch (err: any) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: err?.message || "Terjadi kesalahan saat menyimpan data.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    const confirm = await Swal.fire({
      title: "Hapus Anggota?",
      text: `Apakah Anda yakin ingin menghapus "${name}" dari Tim Gambuh?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#64748b",
      confirmButtonText: "Ya, Hapus!",
      cancelButtonText: "Batal",
    });

    if (!confirm.isConfirmed) return;

    setLoading(true);

    try {
      const res = await fetch(`/api/admin/tim-gambuh/${id}`, {
        method: "DELETE",
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.error || "Gagal menghapus data.");
      }

      Swal.fire({
        icon: "success",
        title: "Terhapus",
        text: "Anggota berhasil dihapus.",
        timer: 1500,
        showConfirmButton: false,
      });

      await fetchData();
    } catch (err: any) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: err?.message || "Terjadi kesalahan saat menghapus data.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAll = async () => {
    if (members.length === 0) {
      Swal.fire({
        icon: "info",
        title: "Info",
        text: "Tidak ada data untuk dihapus.",
      });
      return;
    }

    const confirm = await Swal.fire({
      title: "Hapus Semua Data?",
      text: "Apakah Anda yakin ingin menghapus SEMUA data Tim Gambuh pada kegiatan aktif ini? Tindakan ini tidak dapat dibatalkan.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#64748b",
      confirmButtonText: "Ya, Hapus Semua!",
      cancelButtonText: "Batal",
    });

    if (!confirm.isConfirmed) return;

    setLoading(true);

    try {
      const res = await fetch("/api/admin/tim-gambuh?action=deleteAll", {
        method: "DELETE",
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.error || "Gagal menghapus semua data.");
      }

      Swal.fire({
        icon: "success",
        title: "Terhapus",
        text: "Semua data Tim Gambuh berhasil dihapus.",
        timer: 1500,
        showConfirmButton: false,
      });

      await fetchData();
    } catch (err: any) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: err?.message || "Terjadi kesalahan saat menghapus semua data.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleExportExcel = async () => {
    if (members.length === 0) {
      Swal.fire({
        icon: "warning",
        title: "Tidak Ada Data",
        text: "Tidak ada data Tim Gambuh untuk diekspor.",
      });
      return;
    }

    Swal.fire({
      title: 'Menyiapkan Export...',
      text: 'Mengunduh data dan foto, mohon tunggu.',
      allowOutsideClick: false,
      didOpen: () => { Swal.showLoading(); }
    });

    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Data Tim Gambuh");

      worksheet.columns = [
        { header: "No.", key: "no", width: 5 },
        { header: "Nama Lengkap", key: "nama", width: 30 },
        { header: "No. WhatsApp / Telp", key: "noTelp", width: 25 },
        { header: "Umur", key: "umur", width: 10 },
        { header: "Dapukan / Tipe", key: "tipe", width: 25 },
        { header: "Daerah", key: "daerah", width: 20 },
        { header: "Desa", key: "desa", width: 20 },
        { header: "Waktu Daftar", key: "createdAt", width: 25 },
      ];

      for (let i = 0; i < members.length; i++) {
        const item = members[i];
        const rowNumber = i + 2;
        const rowData = {
          no: i + 1,
          nama: item.nama || "-",
          noTelp: item.noTelp || "-",
          umur: item.umur ? `${item.umur} Tahun` : "-",
          tipe: item.tipe || "-",
          daerah: item.daerahNama || "-",
          desa: item.desaNama || "-",
          createdAt: item.createdAt ? new Date(item.createdAt).toLocaleString("id-ID") : "-",
        };

        worksheet.addRow(rowData);
      }

      // Add a thin border to all cells
      worksheet.eachRow((row, rowNumber) => {
        row.eachCell((cell, colNumber) => {
          if (rowNumber === 1) { // Header
            cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF3B82F6" } };
            cell.alignment = { vertical: "middle", horizontal: "center" };
          } else {
            cell.alignment = { vertical: "middle", horizontal: "left" };
          }
          cell.border = {
            top: { style: "thin", color: { argb: "FFDDDDDD" } },
            left: { style: "thin", color: { argb: "FFDDDDDD" } },
            bottom: { style: "thin", color: { argb: "FFDDDDDD" } },
            right: { style: "thin", color: { argb: "FFDDDDDD" } },
          };
        });
      });

      const kegiatanObj = kegiatanList.find((k) => k.id === selectedKegiatanId);
      const namaKegiatan = kegiatanObj ? kegiatanObj.judul.replace(/\s+/g, "_") : "Semua_Kegiatan";
      const tanggal = new Date().toISOString().slice(0, 10);
      const fileName = `Export_Tim_Gambuh_${namaKegiatan}_${tanggal}.xlsx`;

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      
      const a = document.createElement("a");
      a.href = window.URL.createObjectURL(blob);
      a.download = fileName;
      a.click();
      window.URL.revokeObjectURL(a.href);

      Swal.close();
    } catch (e: any) {
      console.error(e);
      Swal.fire({ icon: "error", title: "Error", text: e.message || "Gagal mengekspor data ke Excel." });
    }
  };

  const handleCopyLink = () => {
    const link = `${window.location.origin}/mandiri/daftar-tim-gambuh`;

    navigator.clipboard.writeText(link).then(() => {
      setCopiedLink(true);

      setTimeout(() => {
        setCopiedLink(false);
      }, 2000);

      Swal.fire({
        icon: "success",
        title: "Tersalin!",
        text: "Link pendaftaran Tim Gambuh berhasil disalin.",
        timer: 1500,
        showConfirmButton: false,
        toast: true,
        position: "top-end",
      });
    });
  };

  const toggleRegistration = async () => {
    if (togglingStatus) return;

    const newStatus = registrationStatus === "open" ? "closed" : "open";

    const confirm = await Swal.fire({
      title: newStatus === "open" ? "Buka Pendaftaran?" : "Tutup Pendaftaran?",
      text:
        newStatus === "open"
          ? "Form pendaftaran /mandiri/daftar-tim-gambuh akan dapat diakses kembali oleh publik."
          : "Form pendaftaran akan ditutup dan peserta tidak dapat mendaftar.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: newStatus === "open" ? "#10b981" : "#ef4444",
      confirmButtonText: "Ya, Lanjutkan",
      cancelButtonText: "Batal",
    });

    if (!confirm.isConfirmed) return;

    setTogglingStatus(true);

    try {
      const res = await fetch("/api/mandiri/settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          key: "mandiri_daftar_tim_gambuh_status",
          value: newStatus,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.error || "Gagal menyimpan pengaturan.");
      }

      setRegistrationStatus(newStatus);

      Swal.fire({
        icon: "success",
        title: "Berhasil",
        text: `Status pendaftaran berhasil diubah menjadi ${newStatus === "open" ? "BUKA" : "TUTUP"
          }.`,
        timer: 1500,
        showConfirmButton: false,
      });
    } catch (err: any) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: err?.message || "Gagal mengubah status pendaftaran.",
      });
    } finally {
      setTogglingStatus(false);
    }
  };

  const filteredMembers = members.filter((member) => {
    const matchesSearch = member.nama
      .toLowerCase()
      .includes(searchQuery.toLowerCase());

    const matchesType = filterType === "All" || member.tipe === filterType;

    return matchesSearch && matchesType;
  });

  return (
    <div>
      <Topbar title="Admin - Kelola Tim PNKB & Ibu Gambuh" role={userRole} />

      <div className="page-content">
        <div className="page-header">
          <div className="page-header-left">
            <h2>Kelola Tim PNKB & Ibu Gambuh</h2>
            <p>Tambah dan kelola anggota Tim PNKB & Ibu Gambuh untuk kegiatan aktif</p>
          </div>

          <div
            style={{
              display: "flex",
              gap: "10px",
              flexWrap: "wrap",
              justifyContent: "flex-end",
            }}
          >
            <button
              onClick={toggleRegistration}
              className="btn btn-outline"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                margin: 0,
                color: registrationStatus === "open" ? "#10b981" : "#ef4444",
                borderColor:
                  registrationStatus === "open" ? "#a7f3d0" : "#fecaca",
                backgroundColor:
                  registrationStatus === "open" ? "#ecfdf5" : "#fef2f2",
              }}
              disabled={togglingStatus}
            >
              {registrationStatus === "open" ? (
                <ToggleRight size={18} />
              ) : (
                <ToggleLeft size={18} />
              )}

              <span style={{ fontWeight: 700 }}>
                Status: {registrationStatus === "open" ? "BUKA" : "TUTUP"}
              </span>
            </button>

            <button
              onClick={handleExportExcel}
              className="btn btn-outline"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                margin: 0,
                color: "#16a34a",
                borderColor: "#bbf7d0",
              }}
            >
              <Download size={16} /> Export Excel
            </button>

            <button
              onClick={handleDeleteAll}
              className="btn btn-outline"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                margin: 0,
                color: "#ef4444",
                borderColor: "#fecaca",
              }}
            >
              <Trash2 size={16} /> Hapus Semua Data
            </button>

            <button
              onClick={handleCopyLink}
              className="btn btn-outline"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                margin: 0,
              }}
            >
              {copiedLink ? (
                <CheckCircle2 size={16} color="#10b981" />
              ) : (
                <LinkIcon size={16} />
              )}

              {copiedLink ? "Link Tersalin" : "Link Pendaftaran"}
            </button>

            <button
              onClick={handleOpenAdd}
              className="btn btn-primary"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                margin: 0,
              }}
            >
              <UserPlus size={16} /> Tambah Anggota
            </button>
          </div>
        </div>

        <div className="card" style={{ marginBottom: "20px", padding: "16px" }}>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "16px",
              alignItems: "center",
            }}
          >
            <div style={{ flex: 1, minWidth: "250px", position: "relative" }}>
              <span
                style={{
                  position: "absolute",
                  left: "12px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "#94a3b8",
                }}
              >
                <Search size={18} />
              </span>

              <input
                type="text"
                className="form-control"
                placeholder="Cari nama anggota..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ paddingLeft: "40px", margin: 0 }}
              />
            </div>

            <div style={{ width: "220px" }}>
              <select
                className="form-control"
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as "All" | TimGambuhType)}
                style={{ margin: 0 }}
              >
                <option value="All">Semua Tipe</option>
                <option value="PNKB">PNKB</option>
                <option value="Ibu Gambuh">Ibu Gambuh</option>
              </select>
            </div>

            <div style={{ width: "250px" }}>
              <select
                className="form-control"
                value={selectedKegiatanId}
                onChange={(e) => setSelectedKegiatanId(e.target.value)}
                style={{ margin: 0 }}
              >
                <option value="active">Kegiatan Aktif</option>
                <option value="all">Semua Kegiatan</option>

                {kegiatanList.map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.judul}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: 0, overflowX: "auto" }}>
          {loading ? (
            <div
              style={{
                padding: "40px",
                textAlign: "center",
                color: "#64748b",
              }}
            >
              Memuat data...
            </div>
          ) : filteredMembers.length === 0 ? (
            <div
              style={{
                padding: "40px",
                textAlign: "center",
                color: "#64748b",
              }}
            >
              Tidak ada data anggota Tim Gambuh yang terdaftar di aktivitas ini.
            </div>
          ) : (
            <table
              className="table responsive-table"
              style={{ width: "100%", borderCollapse: "collapse" }}
            >
              <thead>
                <tr
                  style={{
                    borderBottom: "1px solid #e2e8f0",
                    backgroundColor: "#f8fafc",
                  }}
                >
                  <th
                    style={{
                      padding: "12px 16px",
                      textAlign: "center",
                      fontSize: "12px",
                      fontWeight: "700",
                      color: "#64748b",
                      width: "80px",
                    }}
                  >
                    FOTO
                  </th>

                  <th
                    style={{
                      padding: "12px 16px",
                      textAlign: "left",
                      fontSize: "12px",
                      fontWeight: "700",
                      color: "#64748b",
                    }}
                  >
                    NAMA
                  </th>

                  <th
                    style={{
                      padding: "12px 16px",
                      textAlign: "left",
                      fontSize: "12px",
                      fontWeight: "700",
                      color: "#64748b",
                    }}
                  >
                    UMUR
                  </th>

                  <th
                    style={{
                      padding: "12px 16px",
                      textAlign: "left",
                      fontSize: "12px",
                      fontWeight: "700",
                      color: "#64748b",
                    }}
                  >
                    TIPE
                  </th>

                  <th
                    style={{
                      padding: "12px 16px",
                      textAlign: "left",
                      fontSize: "12px",
                      fontWeight: "700",
                      color: "#64748b",
                    }}
                  >
                    DAERAH
                  </th>

                  <th
                    style={{
                      padding: "12px 16px",
                      textAlign: "left",
                      fontSize: "12px",
                      fontWeight: "700",
                      color: "#64748b",
                    }}
                  >
                    DESA
                  </th>

                  <th
                    style={{
                      padding: "12px 16px",
                      textAlign: "right",
                      fontSize: "12px",
                      fontWeight: "700",
                      color: "#64748b",
                    }}
                  >
                    AKSI
                  </th>
                </tr>
              </thead>

              <tbody>
                {filteredMembers.map((member) => (
                  <tr
                    key={member.id}
                    style={{ borderBottom: "1px solid #e2e8f0" }}
                  >
                    <td
                      data-label="FOTO"
                      style={{
                        padding: "16px",
                        textAlign: "center",
                      }}
                    >
                      <div
                        style={{
                          width: "48px",
                          height: "48px",
                          borderRadius: "50%",
                          background:
                            member.tipe === "Ibu Gambuh" ||
                              member.tipe === "Penunggu Ibu Gambuh"
                              ? "#fdf2f8"
                              : "#eff6ff",
                          color:
                            member.tipe === "Ibu Gambuh" ||
                              member.tipe === "Penunggu Ibu Gambuh"
                              ? "#be185d"
                              : "#2563eb",
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          overflow: "hidden",
                          fontSize: "18px",
                          fontWeight: 700,
                          border: "2px solid #e2e8f0",
                          cursor: member.foto ? "zoom-in" : "default",
                        }}
                        onClick={() => {
                          if (member.foto) {
                            Swal.fire({
                              imageUrl: member.foto,
                              imageAlt: `Foto ${member.nama}`,
                              showConfirmButton: false,
                              showCloseButton: true,
                              width: "auto",
                              padding: "1rem",
                            });
                          }
                        }}
                        title={member.foto ? "Klik untuk memperbesar" : undefined}
                      >
                        {member.foto ? (
                          <img
                            src={member.foto}
                            alt={`Foto ${member.nama}`}
                            style={{
                              width: "100%",
                              height: "100%",
                              objectFit: "cover",
                              transition: "transform 0.3s ease",
                            }}
                            onMouseOver={(e) => {
                              e.currentTarget.style.transform = "scale(1.15)";
                            }}
                            onMouseOut={(e) => {
                              e.currentTarget.style.transform = "scale(1)";
                            }}
                          />
                        ) : (
                          (member.nama || "T").charAt(0).toUpperCase()
                        )}
                      </div>
                    </td>

                    <td
                      data-label="NAMA"
                      style={{
                        padding: "16px",
                        fontWeight: "600",
                        color: "#0f172a",
                      }}
                    >
                      {member.nama}
                    </td>

                    <td
                      data-label="UMUR"
                      style={{ padding: "16px", color: "#334155" }}
                    >
                      {member.umur ?? "-"}
                    </td>

                    <td data-label="TIPE" style={{ padding: "16px" }}>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                          padding: "2px 10px",
                          borderRadius: "20px",
                          fontSize: "12px",
                          fontWeight: "700",
                          backgroundColor:
                            member.tipe === "PNKB" ||
                              member.tipe === "Penunggu PNKB"
                              ? "#eff6ff"
                              : "#fef2f2",
                          color:
                            member.tipe === "PNKB" ||
                              member.tipe === "Penunggu PNKB"
                              ? "#2563eb"
                              : "#dc2626",
                        }}
                      >
                        {member.tipe === "PNKB" || member.tipe === "Penunggu PNKB" ? (
                          <Mars size={12} />
                        ) : member.tipe === "Ibu Gambuh" || member.tipe === "Penunggu Ibu Gambuh" ? (
                          <Venus size={12} />
                        ) : (
                          <Shield size={12} />
                        )}{" "}
                        {member.tipe}
                      </span>
                    </td>

                    <td
                      data-label="DAERAH"
                      style={{ padding: "16px", color: "#334155" }}
                    >
                      {member.daerahNama || "-"}
                    </td>

                    <td
                      data-label="DESA"
                      style={{ padding: "16px", color: "#334155" }}
                    >
                      {member.desaNama || "-"}
                    </td>

                    <td
                      data-label="AKSI"
                      style={{ padding: "16px", textAlign: "right" }}
                    >
                      <div style={{ display: "inline-flex", gap: "8px" }}>
                        <button
                          onClick={() => handleOpenEdit(member)}
                          className="btn btn-outline"
                          style={{
                            padding: "6px 12px",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                          }}
                        >
                          <Edit2 size={14} /> Edit
                        </button>

                        <button
                          onClick={() => handleDelete(member.id, member.nama)}
                          className="btn btn-outline"
                          style={{
                            padding: "6px 12px",
                            color: "#ef4444",
                            borderColor: "#fecaca",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                          }}
                        >
                          <Trash2 size={14} /> Hapus
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {showModal && (
        <div
          style={{
            position: "fixed",
            left: 0,
            top: 0,
            width: "100%",
            height: "100%",
            backgroundColor: "rgba(15, 23, 42, 0.6)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
        >
          <div
            className="card animate-fade-in"
            style={{
              width: "100%",
              maxWidth: "500px",
              maxHeight: "90vh",
              overflowY: "auto",
              margin: "20px",
              padding: "24px",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
            }}
          >
            <h3
              style={{
                fontSize: "18px",
                fontWeight: "800",
                marginBottom: "20px",
                color: "#0f172a",
              }}
            >
              {isEditing ? "Edit Anggota Tim" : "Tambah Anggota Tim"}
            </h3>

            <form onSubmit={handleSubmit}>
              <div
                className="form-group"
                style={{
                  marginBottom: "18px",
                  textAlign: "center",
                }}
              >
                <div
                  style={{
                    width: "110px",
                    height: "110px",
                    borderRadius: "50%",
                    background:
                      form.tipe === "Ibu Gambuh" ||
                        form.tipe === "Penunggu Ibu Gambuh"
                        ? "#fdf2f8"
                        : "#eff6ff",
                    color:
                      form.tipe === "Ibu Gambuh" ||
                        form.tipe === "Penunggu Ibu Gambuh"
                        ? "#be185d"
                        : "#2563eb",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    overflow: "hidden",
                    fontSize: "40px",
                    fontWeight: 800,
                    border: "3px solid #e2e8f0",
                    margin: "0 auto 12px",
                    cursor: form.foto ? "zoom-in" : "default",
                  }}
                  onClick={() => {
                    if (form.foto) {
                      Swal.fire({
                        imageUrl: form.foto,
                        imageAlt: "Foto anggota",
                        showConfirmButton: false,
                        showCloseButton: true,
                        width: "auto",
                        padding: "1rem",
                      });
                    }
                  }}
                  title={form.foto ? "Klik untuk memperbesar" : undefined}
                >
                  {form.foto ? (
                    <img
                      src={form.foto}
                      alt="Foto anggota"
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        transition: "transform 0.3s ease",
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.transform = "scale(1.15)";
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.transform = "scale(1)";
                      }}
                    />
                  ) : (
                    (form.nama || "T").charAt(0).toUpperCase()
                  )}
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    gap: "8px",
                    flexWrap: "wrap",
                  }}
                >
                  <label
                    className="btn btn-outline"
                    style={{
                      margin: 0,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      cursor: uploadingFoto ? "not-allowed" : "pointer",
                      opacity: uploadingFoto ? 0.7 : 1,
                    }}
                  >
                    <Upload size={14} />
                    {uploadingFoto ? "Mengunggah..." : "Upload Foto"}

                    <input
                      type="file"
                      hidden
                      accept="image/jpeg,image/png,image/webp"
                      disabled={uploadingFoto}
                      onChange={(e) => handleFotoUpload(e.target.files?.[0])}
                    />
                  </label>

                  {form.foto && (
                    <button
                      type="button"
                      className="btn btn-outline"
                      style={{
                        margin: 0,
                        color: "#ef4444",
                        borderColor: "#fecaca",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                      }}
                      onClick={() =>
                        setForm((prev) => ({
                          ...prev,
                          foto: "",
                        }))
                      }
                    >
                      <X size={14} /> Hapus
                    </button>
                  )}
                </div>

                <small
                  style={{
                    color: "#64748b",
                    display: "block",
                    marginTop: "8px",
                  }}
                >
                  Format JPG, PNG, WEBP. Maksimal 2MB.
                </small>
              </div>

              <div className="form-group" style={{ marginBottom: "16px" }}>
                <label className="form-label">Nama Lengkap *</label>

                <input
                  type="text"
                  className="form-control"
                  placeholder="Masukkan nama lengkap"
                  value={form.nama}
                  onChange={(e) => {
                    const nama = e.target.value;
                    const detected = detectGenderFromName(nama);

                    if (detected) {
                      setForm((prev) => ({
                        ...prev,
                        nama,
                        tipe: detected,
                      }));
                      setAutoDetected(true);
                    } else {
                      setForm((prev) => ({
                        ...prev,
                        nama,
                      }));
                      setAutoDetected(false);
                    }
                  }}
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: "16px" }}>
                <label className="form-label">Umur (tahun)</label>

                <input
                  type="number"
                  className="form-control"
                  placeholder="Masukkan umur"
                  value={form.umur}
                  min={1}
                  max={99}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      umur: e.target.value,
                    }))
                  }
                />
              </div>

              <div className="form-group" style={{ marginBottom: "16px" }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: "6px",
                  }}
                >
                  <label className="form-label" style={{ margin: 0 }}>
                    Tipe Tim *
                  </label>

                  {autoDetected && (
                    <span
                      style={{
                        fontSize: "11px",
                        fontWeight: 700,
                        padding: "2px 8px",
                        borderRadius: "20px",
                        backgroundColor:
                          form.tipe === "Ibu Gambuh" ? "#fff0f6" : "#eff6ff",
                        color:
                          form.tipe === "Ibu Gambuh" ? "#be185d" : "#2563eb",
                        border: `1px solid ${form.tipe === "Ibu Gambuh" ? "#f9a8d4" : "#bfdbfe"
                          }`,
                      }}
                    >
                      ✨ Auto-deteksi dari nama
                    </span>
                  )}
                </div>

                <select
                  className="form-control"
                  value={form.tipe}
                  onChange={(e) => {
                    setForm((prev) => ({
                      ...prev,
                      tipe: e.target.value as TimGambuhType,
                    }));
                    setAutoDetected(false);
                  }}
                  required
                  style={{
                    borderColor: autoDetected
                      ? form.tipe === "Ibu Gambuh"
                        ? "#f9a8d4"
                        : "#bfdbfe"
                      : undefined,
                  }}
                >
                  <option value="PNKB">♂ PNKB (Laki-laki)</option>
                  <option value="Ibu Gambuh">♀ Ibu Gambuh (Perempuan)</option>
                  <option value="Penunggu PNKB">Penunggu PNKB</option>
                  <option value="Penunggu Ibu Gambuh">
                    Penunggu Ibu Gambuh
                  </option>
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: "16px" }}>
                <label className="form-label">Daerah (Mandiri Daerah) *</label>

                <select
                  className="form-control"
                  value={form.daerahId}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      daerahId: e.target.value,
                      desaId: "",
                    }))
                  }
                  required
                >
                  <option value="">-- Pilih Daerah --</option>

                  {daerahList.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.nama}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: "24px" }}>
                <label className="form-label">Desa (Mandiri Desa) *</label>

                <select
                  className="form-control"
                  value={form.desaId}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      desaId: e.target.value,
                    }))
                  }
                  disabled={!form.daerahId}
                  required
                >
                  <option value="">-- Pilih Desa --</option>

                  {filteredDesaList.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.nama}
                    </option>
                  ))}
                </select>
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: "12px",
                }}
              >
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setUploadingFoto(false);
                  }}
                  className="btn btn-outline"
                  style={{ margin: 0 }}
                >
                  Batal
                </button>

                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ margin: 0 }}
                  disabled={uploadingFoto || loading}
                >
                  {uploadingFoto
                    ? "Menunggu Upload..."
                    : loading
                      ? "Menyimpan..."
                      : "Simpan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}