"use client";

import { useState, useMemo } from "react";
import * as XLSX from "xlsx";

interface Member {
  id: number;
  name: string;
  role: string;
  foto: string | null;
  desaNama: string | null;
  kelompokNama: string | null;
}

function getInitials(name: string) {
  return name
    .split(" ")
    .filter((n) => n.length > 0)
    .map((n) => n[0].toUpperCase())
    .slice(0, 2)
    .join("");
}

function getRoleLabel(role: string) {
  const labels: Record<string, string> = {
    admin: "Administrator",
    desa: "Pengurus Desa",
    kelompok: "Pengurus Kelompok",
    creator: "Kontributor",
    generus: "Generasi Penerus",
  };
  return labels[role] || "Member";
}

export default function MembersList({ members }: { members: Member[] }) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search.trim()) return members;
    const q = search.toLowerCase();
    return members.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        getRoleLabel(m.role).toLowerCase().includes(q) ||
        (m.desaNama && m.desaNama.toLowerCase().includes(q)) ||
        (m.kelompokNama && m.kelompokNama.toLowerCase().includes(q))
    );
  }, [members, search]);

  function exportExcel() {
    const data = filtered.map((m, i) => ({
      No: i + 1,
      Nama: m.name,
      Role: getRoleLabel(m.role),
      Desa: m.desaNama || "-",
      Kelompok: m.kelompokNama || "-",
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Anggota");
    XLSX.writeFile(wb, "data-anggota.xlsx");
  }

  return (
    <>
      <div className="toolbar">
        <div className="search-box">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            placeholder="Cari nama, role, desa, kelompok..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button className="btn-export" onClick={exportExcel}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Export Excel
        </button>
      </div>

      {filtered.length > 0 ? (
        <div className="members-grid">
          {filtered.map((m) => (
            <div key={m.id} className="member-card">
              <div className="member-avatar">
                {m.foto ? (
                  <img src={m.foto} alt={m.name} />
                ) : (
                  getInitials(m.name) || "?"
                )}
              </div>
              <div className="member-name">{m.name}</div>
              <div className="member-role">{getRoleLabel(m.role)}</div>
              <div className="member-info">
                <div className="member-loc">
                  Desa: <span className="member-loc-val">{m.desaNama || "Umum"}</span>
                </div>
                {m.kelompokNama && (
                  <div className="member-loc">
                    Kelompok: <span className="member-loc-val">{m.kelompokNama}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ textAlign: "center", padding: "100px 0", opacity: 0.5 }}>
          <div style={{ fontSize: 64, marginBottom: 20 }}>🔍</div>
          <p style={{ fontSize: 20, fontWeight: 700 }}>
            {search ? "Tidak ada anggota yang cocok dengan pencarian." : "Belum ada data anggota yang tersedia."}
          </p>
        </div>
      )}

      <style>{`
        .toolbar {
          display: flex; gap: 16px; margin-bottom: 40px; flex-wrap: wrap; align-items: center;
        }
        .search-box {
          flex: 1; min-width: 240px; display: flex; align-items: center; gap: 10px;
          background: #fff; border: 2px solid #e2e8f0; border-radius: 14px; padding: 12px 18px;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .search-box:focus-within {
          border-color: #2563eb; box-shadow: 0 0 0 3px rgba(37,99,235,0.1);
        }
        .search-box svg { color: #94a3b8; flex-shrink: 0; }
        .search-box input {
          border: none; outline: none; font-size: 15px; font-weight: 500; width: 100%;
          background: transparent; color: #0f172a;
        }
        .search-box input::placeholder { color: #94a3b8; }
        .btn-export {
          display: inline-flex; align-items: center; gap: 8px; padding: 12px 24px;
          background: #16a34a; color: #fff; border: none; border-radius: 14px;
          font-size: 14px; font-weight: 700; cursor: pointer; transition: all 0.2s;
          white-space: nowrap;
        }
        .btn-export:hover { background: #15803d; transform: translateY(-1px); }
        .btn-export:active { transform: translateY(0); }
      `}</style>
    </>
  );
}
