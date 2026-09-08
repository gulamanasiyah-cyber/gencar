"use client";

import { useState, useEffect } from "react";
import { Heart, Search, RefreshCw, Filter, CheckCircle2, AlertCircle, Phone, ArrowLeft } from "lucide-react";
import Link from "next/link";
import Swal from "sweetalert2";

interface PesertaHaid {
  generusId: string;
  nomorUnik: string;
  nama: string;
  jenisKelamin: string;
  tanggalLahir: string;
  noTelp: string;
  foto: string;
  statusHaid: string | null;
  pekerjaan: string;
  mandiriDesaNama: string;
  mandiriDaerahNama: string;
  mandiriKelompokNama: string;
  nomorUrut: number;
  statusMandiri: string;
  statusPeserta: string;
}

export default function MandiriHaidPage() {
  const [pesertaList, setPesertaList] = useState<PesertaHaid[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterHaid, setFilterHaid] = useState<"Semua" | "Ya" | "Tidak">("Semua");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [keterangan, setKeterangan] = useState("");
  const [savingKeterangan, setSavingKeterangan] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/mandiri/haid");
      if (res.ok) {
        const json = await res.json();
        setPesertaList(Array.isArray(json) ? json : []);
      }
    } catch (error) {
      console.error("Error fetching data haid:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchKeterangan = async () => {
    try {
      const res = await fetch("/api/mandiri/settings?key=mandiri_haid_keterangan");
      if (res.ok) {
        const json = await res.json();
        if (json.value) setKeterangan(json.value);
      }
    } catch (error) {
      console.error("Error fetching keterangan haid:", error);
    }
  };

  useEffect(() => {
    fetchData();
    fetchKeterangan();
  }, []);

  const handleSaveKeterangan = async () => {
    setSavingKeterangan(true);
    try {
      const res = await fetch("/api/mandiri/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "mandiri_haid_keterangan", value: keterangan }),
      });
      if (res.ok) {
        Swal.fire({
          icon: "success",
          title: "Berhasil Disimpan",
          text: "Keterangan / Arahan Tempat Peserta Haid berhasil diperbarui.",
          timer: 1500,
          showConfirmButton: false,
        });
      } else {
        Swal.fire("Gagal", "Gagal menyimpan keterangan", "error");
      }
    } catch (error) {
      Swal.fire("Error", "Terjadi kesalahan jaringan", "error");
    } finally {
      setSavingKeterangan(false);
    }
  };

  const handleToggleStatusHaid = async (generusId: string, currentStatus: string | null) => {
    const newStatus = currentStatus === "Ya" ? "Tidak" : "Ya";
    setUpdatingId(generusId);

    try {
      const res = await fetch("/api/mandiri/haid", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ generusId, statusHaid: newStatus }),
      });

      if (res.ok) {
        setPesertaList(prev =>
          prev.map(item => (item.generusId === generusId ? { ...item, statusHaid: newStatus } : item))
        );
        Swal.fire({
          icon: "success",
          title: "Status Diperbarui",
          text: `Status haid berhasil diubah menjadi: ${newStatus === "Ya" ? "Sedang Haid" : "Tidak Haid"}`,
          timer: 1500,
          showConfirmButton: false,
        });
      } else {
        const err = await res.json();
        Swal.fire("Gagal", err.error || "Gagal memperbarui status", "error");
      }
    } catch (error) {
      Swal.fire("Error", "Terjadi kesalahan jaringan", "error");
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredList = pesertaList.filter(p => {
    const matchesSearch =
      !search ||
      p.nama?.toLowerCase().includes(search.toLowerCase()) ||
      p.nomorUnik?.toLowerCase().includes(search.toLowerCase()) ||
      p.noTelp?.includes(search);

    if (filterHaid === "Ya") return matchesSearch && p.statusHaid === "Ya";
    if (filterHaid === "Tidak") return matchesSearch && (p.statusHaid === "Tidak" || !p.statusHaid);
    return matchesSearch;
  });

  const totalPesertaP = pesertaList.length;
  const countHaid = pesertaList.filter(p => p.statusHaid === "Ya").length;
  const countTidakHaid = totalPesertaP - countHaid;

  return (
    <div className="haid-page-container">
      <header className="page-header">
        <div className="header-left">
          <Link href="/mandiri/romantic-room" className="back-button">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1>Sedang Haid / Berhalangan</h1>
            <p>Daftar peserta perempuan yang sedang haid/berhalangan untuk kegiatan Romantic Room</p>
          </div>
        </div>
        <button onClick={fetchData} className="refresh-btn" disabled={loading}>
          <RefreshCw size={16} className={loading ? "spin" : ""} />
          <span>Muat Ulang</span>
        </button>
      </header>

      {/* STATS SUMMARY */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon total">
            <Heart size={22} />
          </div>
          <div className="stat-info">
            <span className="stat-value">{totalPesertaP}</span>
            <span className="stat-label">Total Peserta (P)</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon haid">
            <AlertCircle size={22} />
          </div>
          <div className="stat-info">
            <span className="stat-value">{countHaid}</span>
            <span className="stat-label">Sedang Haid</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon suci">
            <CheckCircle2 size={22} />
          </div>
          <div className="stat-info">
            <span className="stat-value">{countTidakHaid}</span>
            <span className="stat-label">Tidak Haid / Suci</span>
          </div>
        </div>
      </div>

      {/* ARAHAN TEMPAT KETERANGAN CARD */}
      <div className="admin-card" style={{ marginBottom: "25px", padding: "20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
          <AlertCircle size={20} color="#e11d48" />
          <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "#1e293b" }}>
            Keterangan Tambahan / Arahan Tempat Peserta Haid
          </h3>
        </div>
        <p style={{ margin: "0 0 12px 0", fontSize: "13px", color: "#64748b", lineHeight: "1.5" }}>
          Informasi ini akan ditampilkan dalam <strong>pop-up arahan</strong> di halaman pendaftaran (pendaftaran peserta & panitia) saat opsi perempuan sedang haid dipilih, serta dicantumkan di <strong>Dokumen PDF</strong>.
        </p>
        <textarea
          rows={3}
          value={keterangan}
          onChange={e => setKeterangan(e.target.value)}
          placeholder="Contoh: Bagi peserta yang sedang haid, lokasi kegiatan/pos berada di Ruang Serbaguna Lt. 2 (Saung Mawar)..."
          style={{
            width: "100%",
            padding: "12px 14px",
            borderRadius: "12px",
            border: "1px solid #cbd5e1",
            fontSize: "14px",
            outline: "none",
            boxSizing: "border-box",
            resize: "vertical",
            fontFamily: "inherit",
          }}
        />
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "12px" }}>
          <button
            onClick={handleSaveKeterangan}
            disabled={savingKeterangan}
            style={{
              padding: "10px 20px",
              background: "#e11d48",
              color: "white",
              border: "none",
              borderRadius: "10px",
              fontWeight: 700,
              fontSize: "13.5px",
              cursor: "pointer",
              transition: "all 0.2s",
              boxShadow: "0 2px 8px rgba(225, 29, 72, 0.25)",
            }}
          >
            {savingKeterangan ? "Memproses..." : "Simpan Arahan Tempat"}
          </button>
        </div>
      </div>

      {/* FILTER & SEARCH BAR */}
      <div className="admin-card">
        <div className="card-controls">
          <div className="search-box">
            <Search size={18} className="search-icon" />
            <input
              type="text"
              placeholder="Cari nama, nomor unik, atau WhatsApp..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <div className="filter-pills">
            <button
              className={`pill ${filterHaid === "Semua" ? "active" : ""}`}
              onClick={() => setFilterHaid("Semua")}
            >
              Semua ({pesertaList.length})
            </button>
            <button
              className={`pill haid-pill ${filterHaid === "Ya" ? "active" : ""}`}
              onClick={() => setFilterHaid("Ya")}
            >
              Sedang Haid ({countHaid})
            </button>
            <button
              className={`pill suci-pill ${filterHaid === "Tidak" ? "active" : ""}`}
              onClick={() => setFilterHaid("Tidak")}
            >
              Tidak Haid ({countTidakHaid})
            </button>
          </div>
        </div>

        {/* DATA TABLE */}
        <div className="table-responsive">
          {loading ? (
            <div className="empty-state">
              <RefreshCw size={32} className="spin" />
              <p>Memuat data peserta...</p>
            </div>
          ) : filteredList.length === 0 ? (
            <div className="empty-state">
              <Heart size={36} />
              <p>Tidak ada data peserta yang sesuai.</p>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>No. Urut</th>
                  <th>Peserta</th>
                  <th>Nomor Unik</th>
                  <th>Daerah / Desa</th>
                  <th>Kelompok</th>
                  <th>No. WhatsApp</th>
                  <th style={{ textAlign: "center" }}>Status Haid</th>
                  <th style={{ textAlign: "center" }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filteredList.map(item => {
                  const isHaid = item.statusHaid === "Ya";
                  return (
                    <tr key={item.generusId} className={isHaid ? "row-haid" : ""}>
                      <td>
                        <span className="badge-urut">#{item.nomorUrut || "-"}</span>
                      </td>
                      <td>
                        <div className="user-info-cell">
                          <img
                            src={item.foto || "/placeholder-avatar.png"}
                            alt={item.nama}
                            className="avatar-img"
                            onError={e => {
                              (e.target as HTMLImageElement).src =
                                "https://api.dicebear.com/7.x/bottts/svg?seed=" + item.nama;
                            }}
                          />
                          <div>
                            <div className="user-name">{item.nama}</div>
                            <div className="user-subtext">{item.pekerjaan || "Peserta"}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="code-badge">{item.nomorUnik}</span>
                      </td>
                      <td>
                        <div className="location-text">
                          <strong>{item.mandiriDaerahNama || "-"}</strong>
                          <span className="sub">{item.mandiriDesaNama || "-"}</span>
                        </div>
                      </td>
                      <td>{item.mandiriKelompokNama || "-"}</td>
                      <td>
                        {item.noTelp ? (
                          <a
                            href={`https://wa.me/${item.noTelp.replace(/[^0-9]/g, "")}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="wa-link"
                          >
                            <Phone size={14} />
                            <span>{item.noTelp}</span>
                          </a>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <span className={`haid-badge ${isHaid ? "badge-haid-true" : "badge-haid-false"}`}>
                          {isHaid ? "🌸 Sedang Haid" : "✓ Tidak Haid"}
                        </span>
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <button
                          className={`btn-action ${isHaid ? "btn-reset" : "btn-set-haid"}`}
                          onClick={() => handleToggleStatusHaid(item.generusId, item.statusHaid)}
                          disabled={updatingId === item.generusId}
                        >
                          {updatingId === item.generusId
                            ? "Menyimpan..."
                            : isHaid
                            ? "Ubah Ke Tidak Haid"
                            : "Tandai Sedang Haid"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <style jsx>{`
        .haid-page-container {
          width: 100%;
          max-width: 1400px;
          padding: 20px;
          margin: 0 auto;
          min-height: 100vh;
          box-sizing: border-box;
        }

        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 25px;
          flex-wrap: wrap;
          gap: 15px;
        }

        .header-left {
          display: flex;
          align-items: center;
          gap: 15px;
        }

        .page-header h1 {
          font-size: 24px;
          font-weight: 800;
          color: #1e293b;
          margin: 0 0 4px 0;
        }

        .page-header p {
          color: #64748b;
          margin: 0;
          font-size: 14px;
        }

        .back-button {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 40px;
          height: 40px;
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          color: #64748b;
          transition: all 0.2s;
        }

        .back-button:hover {
          background: #f8fafc;
          color: #1e293b;
          border-color: #cbd5e1;
        }

        .refresh-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 18px;
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          color: #3b82f6;
          font-weight: 600;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .refresh-btn:hover {
          background: #eff6ff;
          border-color: #bfdbfe;
        }

        .spin {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 20px;
          margin-bottom: 25px;
        }

        .stat-card {
          background: white;
          border-radius: 16px;
          padding: 20px;
          border: 1px solid #e2e8f0;
          display: flex;
          align-items: center;
          gap: 16px;
          box-shadow: 0 4px 15px rgba(0,0,0,0.02);
        }

        .stat-icon {
          width: 50px;
          height: 50px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .stat-icon.total { background: #eff6ff; color: #3b82f6; }
        .stat-icon.haid { background: #fff1f2; color: #f43f5e; }
        .stat-icon.suci { background: #f0fdf4; color: #16a34a; }

        .stat-info {
          display: flex;
          flex-direction: column;
        }

        .stat-value {
          font-size: 26px;
          font-weight: 800;
          color: #0f172a;
          line-height: 1.2;
        }

        .stat-label {
          font-size: 13px;
          color: #64748b;
          font-weight: 500;
        }

        .admin-card {
          background: white;
          border-radius: 16px;
          border: 1px solid #e2e8f0;
          overflow: hidden;
          box-shadow: 0 4px 20px rgba(0,0,0,0.03);
        }

        .card-controls {
          padding: 20px;
          border-bottom: 1px solid #f1f5f9;
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 15px;
          background: #fafafa;
        }

        .search-box {
          position: relative;
          min-width: 300px;
          flex: 1;
        }

        .search-icon {
          position: absolute;
          left: 14px;
          top: 50%;
          transform: translateY(-50%);
          color: #94a3b8;
        }

        .search-box input {
          width: 100%;
          padding: 10px 14px 10px 42px;
          border-radius: 12px;
          border: 1px solid #cbd5e1;
          font-size: 14px;
          outline: none;
          background: white;
        }

        .search-box input:focus {
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59,130,246,0.1);
        }

        .filter-pills {
          display: flex;
          gap: 8px;
        }

        .pill {
          padding: 8px 16px;
          border-radius: 20px;
          border: 1px solid #e2e8f0;
          background: white;
          color: #64748b;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .pill.active {
          background: #3b82f6;
          color: white;
          border-color: #3b82f6;
        }

        .pill.haid-pill.active {
          background: #f43f5e;
          border-color: #f43f5e;
        }

        .pill.suci-pill.active {
          background: #16a34a;
          border-color: #16a34a;
        }

        .table-responsive {
          width: 100%;
          overflow-x: auto;
        }

        .data-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
          font-size: 14px;
        }

        .data-table th {
          padding: 14px 18px;
          background: #f8fafc;
          color: #475569;
          font-weight: 700;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          border-bottom: 1px solid #e2e8f0;
        }

        .data-table td {
          padding: 14px 18px;
          border-bottom: 1px solid #f1f5f9;
          vertical-align: middle;
          color: #334155;
        }

        .row-haid {
          background: #fff5f5;
        }

        .user-info-cell {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .avatar-img {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          object-fit: cover;
          border: 2px solid #e2e8f0;
        }

        .user-name {
          font-weight: 700;
          color: #0f172a;
        }

        .user-subtext {
          font-size: 12px;
          color: #64748b;
        }

        .badge-urut {
          font-weight: 800;
          color: #3b82f6;
          background: #eff6ff;
          padding: 4px 8px;
          border-radius: 8px;
          font-size: 13px;
        }

        .code-badge {
          font-family: monospace;
          font-weight: 700;
          color: #475569;
          background: #f1f5f9;
          padding: 4px 8px;
          border-radius: 6px;
          font-size: 12px;
        }

        .location-text {
          display: flex;
          flex-direction: column;
          font-size: 13px;
        }

        .location-text .sub {
          font-size: 12px;
          color: #64748b;
        }

        .wa-link {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          color: #16a34a;
          font-weight: 600;
          text-decoration: none;
          background: #f0fdf4;
          padding: 4px 10px;
          border-radius: 20px;
          font-size: 12px;
          transition: background 0.2s;
        }

        .wa-link:hover {
          background: #dcfce7;
        }

        .haid-badge {
          display: inline-block;
          padding: 6px 14px;
          border-radius: 20px;
          font-size: 12.5px;
          font-weight: 700;
        }

        .badge-haid-true {
          background: #ffe4e6;
          color: #e11d48;
        }

        .badge-haid-false {
          background: #f0fdf4;
          color: #16a34a;
        }

        .btn-action {
          padding: 6px 14px;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 700;
          border: none;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-set-haid {
          background: #fff1f2;
          color: #e11d48;
          border: 1px solid #fecdd3;
        }

        .btn-set-haid:hover {
          background: #e11d48;
          color: white;
        }

        .btn-reset {
          background: #f0fdf4;
          color: #16a34a;
          border: 1px solid #bbf7d0;
        }

        .btn-reset:hover {
          background: #16a34a;
          color: white;
        }

        .empty-state {
          padding: 50px 20px;
          text-align: center;
          color: #94a3b8;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
        }
      `}</style>
    </div>
  );
}
