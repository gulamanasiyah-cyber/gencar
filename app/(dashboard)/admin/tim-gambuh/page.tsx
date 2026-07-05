"use client";

import Topbar from "@/components/Topbar";
import { useState, useEffect, useCallback } from "react";
import Swal from "sweetalert2";
import { Search, UserPlus, Edit2, Trash2, Shield, Link as LinkIcon, CheckCircle2 } from "lucide-react";

interface TimGambuhItem {
  id: string;
  nama: string;
  daerahId: number | null;
  daerahNama: string | null;
  desaId: number | null;
  desaNama: string | null;
  tipe: "PNKB" | "Ibu Gambuh" | "Penunggu PNKB" | "Penunggu Ibu Gambuh";
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

// Indonesian name-based gender detection
function detectGenderFromName(nama: string): "PNKB" | "Ibu Gambuh" | "Penunggu PNKB" | "Penunggu Ibu Gambuh" | null {
  if (!nama.trim()) return null;
  const lower = nama.toLowerCase().trim();
  const firstWord = lower.split(/\s+/)[0];
  const lastWord = lower.split(/\s+/).pop() || "";

  const femaleSuffixes = [
    "wati","ningsih","yanti","anti","sari","dewi","ayu","indah","putri","rina",
    "ani","yani","tuti","nita","linda","diana","fitri","handayani","lestari",
    "kartika","endah","ratna","asih","murni","hasanah","khasanah","fauziah",
    "rohmah","maryam","fatimah","halimah","aminah","zahra","rahayu","novita",
    "susanti","priyanti","apriyanti","oktaviani","nurani","sundari","wardani",
    "pertiwi","anggraeni","anggraini","wahyuni","astuti","widyawati","utami",
  ];
  const femaleFirstNames = [
    "siti","sri","dewi","ayu","putri","rini","rina","dian","diana","fitri",
    "yuni","juni","mega","citra","hana","ratu","bunga","nurul","nuraini","ida",
    "eka","desi","evi","yuli","lia","lina","lisa","rita","rosa","tuti","wati",
    "sari","indah","maya","mira","nia","nita","novi","novia","risa","sinta",
    "tika","winda","zara","zahra","nayla","nadia","rahma","salma","dina","fina",
    "gina","heni","irma","karin","lana","mila","nana","olga","vera","weni",
    "anisa","annisa","bella","cindy","della","ella","feby","ghina","hilda",
    "julia","karina","laila","melia","nela","reni","selvi","tiara","ulfa","vina",
    "widya","yessi","zelda","nabila","aulia","azizah","halimah","khairunnisa",
    "nur","nurhasanah","nurhayati","nurlela","nurlia","nisa","nisaa","risa",
    "risma","safitri","salsa","shinta","silvi","silvya","sindy","tri","triana",
    "umy","umi","yesi","yola","zulfa","zulia","zuhriyah",
  ];
  const maleSuffixes = ["wan","wira","pratama","putra","tama","anto","ianto"];
  const maleFirstNames = [
    "ahmad","muhammad","budi","eko","andi","aditya","fajar","rizki","doni",
    "hendra","agus","wahyu","yudi","hadi","arif","dedi","feri","gani","heri",
    "ilham","joko","koko","luki","madi","pandu","rudi","sandi","toni","udin",
    "abi","adi","agung","akbar","alan","aldo","alex","alfian","ali","alif",
    "amin","amri","anang","anas","andika","andri","anjar","anto","anwar","ari",
    "arman","aryo","asep","aziz","bagas","bagus","bayu","benny","bima","bisma",
    "dani","danu","darmawan","dede","deny","dicky","dimas","dodi","donny",
    "dwi","edy","edwin","efendi","egi","elang","erlan","erwin","farhan","faris",
    "ferry","firman","fuad","galang","galih","gilang","giri","gunawan","guntur",
    "hafiz","haikal","hamid","hamza","hanif","haris","hendri","herman","herwin",
    "hilman","ibnu","ichsan","iqbal","irfan","ismail","iwan","jefri","julian",
    "karyo","kemal","khairul","latif","lukman","lutfi","mahdi","mahmud","maman",
    "mario","marwan","maulana","miko","mirza","mustofa","nando","nanang","naufal",
    "nizar","noval","novian","oka","otto","panji","prasetyo","prima","puji",
    "rafi","rafik","rahmat","randa","randy","rangga","reza","ridho","riski",
    "rivai","rizal","robby","rohman","rohmat","roni","royan","rudy","safri",
    "sahrul","salman","satrio","satya","setiawan","sigit","slamet","sofyan",
    "soleh","subhan","subhi","sudirman","sugeng","sugianto","suharto","sulaiman",
    "supri","surya","susanto","syaiful","tegar","teguh","topan","umar","wahid",
    "wahyudi","wandi","willy","wisnu","yasin","yogi","yudha","yulian","yusuf",
    "zaenal","zainal","zaki","zuhal","faiz","faizal","fajri","fakhri","faris",
    "habib","hafidz","hakim","harun","haykal","haza","heru","hikam","ibra",
    "imam","ipang","irvan","irwan","ivan","jasper","javier","jeremy","kevin",
    "khafi","khoirul","kinan","krisna","lucky","luqman","made","malik","mansur",
    "marco","marsh","martin","mas","masrul","maulidan","maxiel","mikael","nabil",
    "nadir","najib","naldi","nasir","noval","oky","oscar","panca","paras",
    "parno","pras","rafi","rafly","raka","raki","ralan","ramadhan","rana",
    "randy","rano","ranto","rayhan","razan","rehan","reihan","renaldi","rendy",
    "reno","riant","rico","rido","rifki","rifky","rihan","rimba","rino",
    "risal","rivan","rivandi","riyan","riyandi","ryan","sandy","satria","sigit",
  ];

  if (femaleSuffixes.some(s => lower.endsWith(s) || lastWord === s)) return "Ibu Gambuh";
  if (femaleFirstNames.includes(firstWord)) return "Ibu Gambuh";
  if (maleSuffixes.some(s => lower.endsWith(s))) return "PNKB";
  if (maleFirstNames.includes(firstWord)) return "PNKB";

  return null; // unknown, don't override
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

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"All" | "PNKB" | "Ibu Gambuh" | "Penunggu PNKB" | "Penunggu Ibu Gambuh">("All");

  // Form State
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState("");
  const [copiedLink, setCopiedLink] = useState(false);
  const [autoDetected, setAutoDetected] = useState(false);
  const [form, setForm] = useState({
    nama: "",
    daerahId: "",
    desaId: "",
    tipe: "PNKB" as "PNKB" | "Ibu Gambuh" | "Penunggu PNKB" | "Penunggu Ibu Gambuh",
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [membersRes, daerahsRes, desasRes, kegiatanRes] = await Promise.all([
        fetch(`/api/admin/tim-gambuh?kegiatanId=${selectedKegiatanId}`).then((r) => r.json()),
        fetch("/api/public/mandiri/daerah").then((r) => r.json()),
        fetch("/api/public/mandiri/desa").then((r) => r.json()),
        fetch("/api/mandiri/kegiatan").then((r) => r.json()),
      ]);

      setMembers(Array.isArray(membersRes) ? membersRes : []);
      setDaerahList(Array.isArray(daerahsRes) ? daerahsRes : []);
      setDesaList(Array.isArray(desasRes) ? desasRes : []);
      setKegiatanList(Array.isArray(kegiatanRes) ? kegiatanRes : []);
    } catch (err) {
      console.error("Error fetching Tim Gambuh data:", err);
    } finally {
      setLoading(false);
    }
  }, [selectedKegiatanId]);

  useEffect(() => {
    fetchData();
    fetch("/api/profile")
      .then((r) => r.json())
      .then((d) => setUserRole(d.role || ""));
  }, [fetchData]);

  // Filter Desa (mandiriDesa) based on selected Daerah (mandiriDaerah)
  useEffect(() => {
    if (form.daerahId) {
      const filtered = desaList.filter((d) => d.mandiriDaerahId === Number(form.daerahId));
      setFilteredDesaList(filtered);
    } else {
      setFilteredDesaList([]);
    }
  }, [form.daerahId, desaList]);

  const handleOpenAdd = () => {
    setIsEditing(false);
    setEditId("");
    setAutoDetected(false);
    setForm({ nama: "", daerahId: "", desaId: "", tipe: "PNKB" });
    setFilteredDesaList([]);
    setShowModal(true);
  };

  const handleOpenEdit = (member: TimGambuhItem) => {
    setIsEditing(true);
    setEditId(member.id);
    setAutoDetected(false);
    setForm({
      nama: member.nama,
      daerahId: member.daerahId ? String(member.daerahId) : "",
      desaId: member.desaId ? String(member.desaId) : "",
      tipe: member.tipe,
    });
    if (member.daerahId) {
      setFilteredDesaList(desaList.filter((d) => d.mandiriDaerahId === Number(member.daerahId)));
    } else {
      setFilteredDesaList([]);
    }
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nama.trim() || !form.tipe || !form.daerahId || !form.desaId) {
      Swal.fire({ icon: "warning", title: "Data Tidak Lengkap", text: "Nama, Tipe, Daerah, dan Desa wajib diisi" });
      return;
    }

    setLoading(true);
    try {
      const url = isEditing ? `/api/admin/tim-gambuh/${editId}` : "/api/admin/tim-gambuh";
      const method = isEditing ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nama: form.nama,
          daerahId: form.daerahId ? Number(form.daerahId) : null,
          desaId: form.desaId ? Number(form.desaId) : null,
          tipe: form.tipe,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gagal menyimpan data");
      }

      Swal.fire({
        icon: "success",
        title: "Berhasil",
        text: isEditing ? "Data berhasil diperbarui" : "Anggota berhasil ditambahkan",
        timer: 1500,
        showConfirmButton: false,
      });

      setShowModal(false);
      fetchData();
    } catch (err: any) {
      Swal.fire({ icon: "error", title: "Error", text: err.message });
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

    if (confirm.isConfirmed) {
      setLoading(true);
      try {
        const res = await fetch(`/api/admin/tim-gambuh/${id}`, { method: "DELETE" });
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Gagal menghapus data");
        }

        Swal.fire({
          icon: "success",
          title: "Terhapus",
          text: "Anggota berhasil dihapus",
          timer: 1500,
          showConfirmButton: false,
        });

        fetchData();
      } catch (err: any) {
        Swal.fire({ icon: "error", title: "Error", text: err.message });
      } finally {
        setLoading(false);
      }
    }
  };

  const handleDeleteAll = async () => {
    if (members.length === 0) {
      Swal.fire({
        icon: "info",
        title: "Info",
        text: "Tidak ada data untuk dihapus",
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

    if (confirm.isConfirmed) {
      setLoading(true);
      try {
        const res = await fetch(`/api/admin/tim-gambuh?action=deleteAll`, { method: "DELETE" });
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Gagal menghapus semua data");
        }

        Swal.fire({
          icon: "success",
          title: "Terhapus",
          text: "Semua data Tim Gambuh berhasil dihapus",
          timer: 1500,
          showConfirmButton: false,
        });

        fetchData();
      } catch (err: any) {
        Swal.fire({ icon: "error", title: "Error", text: err.message });
      } finally {
        setLoading(false);
      }
    }
  };

  const handleCopyLink = () => {
    const link = `${window.location.origin}/mandiri/daftar-tim-gambuh`;
    navigator.clipboard.writeText(link).then(() => {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
      Swal.fire({
        icon: "success",
        title: "Tersalin!",
        text: "Link pendaftaran Tim Gambuh berhasil disalin",
        timer: 1500,
        showConfirmButton: false,
        toast: true,
        position: "top-end"
      });
    });
  };

  // Filter & Search Logic
  const filteredMembers = members.filter((member) => {
    const matchesSearch = member.nama.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === "All" || member.tipe === filterType;
    return matchesSearch && matchesType;
  });

  return (
    <div>
      <Topbar title="Admin - Kelola Tim PNKB & Gambuh" role={userRole} />
      <div className="page-content">
        <div className="page-header">
          <div className="page-header-left">
            <h2>Kelola Tim PNKB & Gambuh</h2>
            <p>Tambah dan kelola anggota Tim PNKB & Gambuh untuk kegiatan aktif</p>
          </div>
          <div style={{ display: "flex", gap: "10px" }}>
            <button 
              onClick={handleDeleteAll} 
              className="btn btn-outline" 
              style={{ display: "flex", alignItems: "center", gap: "8px", margin: 0, color: "#ef4444", borderColor: "#fecaca" }}
            >
              <Trash2 size={16} /> Hapus Semua Data
            </button>
            <button 
              onClick={handleCopyLink} 
              className="btn btn-outline" 
              style={{ display: "flex", alignItems: "center", gap: "8px", margin: 0 }}
            >
              {copiedLink ? <CheckCircle2 size={16} color="#10b981" /> : <LinkIcon size={16} />}
              {copiedLink ? "Link Tersalin" : "Link Pendaftaran"}
            </button>
            <button onClick={handleOpenAdd} className="btn btn-primary" style={{ display: "flex", alignItems: "center", gap: "8px", margin: 0 }}>
              <UserPlus size={16} /> Tambah Anggota
            </button>
          </div>
        </div>

        {/* Filters Card */}
        <div className="card" style={{ marginBottom: "20px", padding: "16px" }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "16px", alignItems: "center" }}>
            <div style={{ flex: 1, minWidth: "250px", position: "relative" }}>
              <span style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }}>
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
            <div style={{ width: "200px" }}>
              <select
                className="form-control"
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as any)}
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
                  <option key={k.id} value={k.id}>{k.judul}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Data Table */}
        <div className="card" style={{ padding: 0, overflowX: "auto" }}>
          {loading ? (
            <div style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>Memuat data...</div>
          ) : filteredMembers.length === 0 ? (
            <div style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>
              Tidak ada data anggota Tim Gambuh yang terdaftar di aktivitas ini.
            </div>
          ) : (
            <table className="table responsive-table" style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #e2e8f0", backgroundColor: "#f8fafc" }}>
                  <th style={{ padding: "12px 16px", textAlign: "left", fontSize: "12px", fontWeight: "700", color: "#64748b" }}>NAMA</th>
                  <th style={{ padding: "12px 16px", textAlign: "left", fontSize: "12px", fontWeight: "700", color: "#64748b" }}>TIPE</th>
                  <th style={{ padding: "12px 16px", textAlign: "left", fontSize: "12px", fontWeight: "700", color: "#64748b" }}>DAERAH</th>
                  <th style={{ padding: "12px 16px", textAlign: "left", fontSize: "12px", fontWeight: "700", color: "#64748b" }}>DESA</th>
                  <th style={{ padding: "12px 16px", textAlign: "right", fontSize: "12px", fontWeight: "700", color: "#64748b" }}>AKSI</th>
                </tr>
              </thead>
              <tbody>
                {filteredMembers.map((member) => (
                  <tr key={member.id} style={{ borderBottom: "1px solid #e2e8f0" }}>
                    <td data-label="NAMA" style={{ padding: "16px", fontWeight: "600", color: "#0f172a" }}>{member.nama}</td>
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
                          backgroundColor: member.tipe === "PNKB" || member.tipe === "Penunggu PNKB" ? "#eff6ff" : "#fef2f2",
                          color: member.tipe === "PNKB" || member.tipe === "Penunggu PNKB" ? "#2563eb" : "#dc2626",
                        }}
                      >
                        <Shield size={12} /> {member.tipe}
                      </span>
                    </td>
                    <td data-label="DAERAH" style={{ padding: "16px", color: "#334155" }}>{member.daerahNama || "-"}</td>
                    <td data-label="DESA" style={{ padding: "16px", color: "#334155" }}>{member.desaNama || "-"}</td>
                    <td data-label="AKSI" style={{ padding: "16px", textAlign: "right" }}>
                      <div style={{ display: "inline-flex", gap: "8px" }}>
                        <button
                          onClick={() => handleOpenEdit(member)}
                          className="btn btn-outline"
                          style={{ padding: "6px 12px", display: "inline-flex", alignItems: "center", gap: "4px" }}
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

      {/* Add / Edit Modal */}
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
            zIndex: 9999,
          }}
        >
          <div
            className="card animate-fade-in"
            style={{
              width: "100%",
              maxWidth: "500px",
              margin: "20px",
              padding: "24px",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
            }}
          >
            <h3 style={{ fontSize: "18px", fontWeight: "800", marginBottom: "20px", color: "#0f172a" }}>
              {isEditing ? "Edit Anggota Tim" : "Tambah Anggota Tim"}
            </h3>
            <form onSubmit={handleSubmit}>
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
                      setForm({ ...form, nama, tipe: detected });
                      setAutoDetected(true);
                    } else {
                      setForm({ ...form, nama });
                      setAutoDetected(false);
                    }
                  }}
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: "16px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
                  <label className="form-label" style={{ margin: 0 }}>Tipe Tim *</label>
                  {autoDetected && (
                    <span style={{ fontSize: "11px", fontWeight: 700, padding: "2px 8px", borderRadius: "20px", backgroundColor: form.tipe === "Ibu Gambuh" ? "#fff0f6" : "#eff6ff", color: form.tipe === "Ibu Gambuh" ? "#be185d" : "#2563eb", border: `1px solid ${form.tipe === "Ibu Gambuh" ? "#f9a8d4" : "#bfdbfe"}` }}>
                      ✨ Auto-deteksi dari nama
                    </span>
                  )}
                </div>
                <select
                  className="form-control"
                  value={form.tipe}
                  onChange={(e) => { setForm({ ...form, tipe: e.target.value as any }); setAutoDetected(false); }}
                  required
                  style={{ borderColor: autoDetected ? (form.tipe === "Ibu Gambuh" ? "#f9a8d4" : "#bfdbfe") : undefined }}
                >
                  <option value="PNKB">♂ PNKB (Laki-laki)</option>
                  <option value="Ibu Gambuh">♀ Ibu Gambuh (Perempuan)</option>
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: "16px" }}>
                <label className="form-label">Daerah (Mandiri Daerah) *</label>
                <select
                  className="form-control"
                  value={form.daerahId}
                  onChange={(e) => setForm({ ...form, daerahId: e.target.value, desaId: "" })}
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
                  onChange={(e) => setForm({ ...form, desaId: e.target.value })}
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

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px" }}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn btn-outline"
                  style={{ margin: 0 }}
                >
                  Batal
                </button>
                <button type="submit" className="btn btn-primary" style={{ margin: 0 }}>
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
