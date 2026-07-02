"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import { Filter, X } from "lucide-react";

interface DashboardFilterProps {
  cities: string[];
  villages: { id: number; nama: string; kota: string }[];
  groups?: { id: number; nama: string; desa: string; kota: string }[];
}

export default function DashboardFilter({ cities, villages, groups = [] }: DashboardFilterProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [city, setCity] = useState(searchParams.get("city") || "");
  const [village, setVillage] = useState(searchParams.get("village") || "");
  const [group, setGroup] = useState(searchParams.get("group") || "");
  const [gender, setGender] = useState(searchParams.get("gender") || "");

  const filteredVillages = city
    ? villages.filter((v) => v.kota === city)
    : [];

  const filteredGroups = village
    ? groups.filter((g) => g.desa === village)
    : [];

  const handleFilter = () => {
    const params = new URLSearchParams(searchParams.toString());
    if (city) params.set("city", city);
    else params.delete("city");
    
    if (village) params.set("village", village);
    else params.delete("village");
    
    if (group) params.set("group", group);
    else params.delete("group");
    
    if (gender) params.set("gender", gender);
    else params.delete("gender");
    
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleReset = () => {
    setCity("");
    setVillage("");
    setGroup("");
    setGender("");
    router.push(pathname);
  };

  return (
    <div className="dashboard-filter-container">
      <div className="filter-header">
        <Filter size={18} />
        <span>Filter Data Kehadiran</span>
      </div>
      <div className="filter-grid">
        <div className="filter-item">
          <label>Kota/Daerah</label>
          <select value={city} onChange={(e) => { setCity(e.target.value); setVillage(""); setGroup(""); }}>
            <option value="">Semua Kota</option>
            {cities.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div className="filter-item">
          <label>Desa</label>
          <select value={village} onChange={(e) => { setVillage(e.target.value); setGroup(""); }}>
            <option value="">Semua Desa</option>
            {filteredVillages.map((v) => (
              <option key={v.id} value={v.nama}>{v.nama}</option>
            ))}
          </select>
        </div>
        <div className="filter-item">
          <label>Kelompok</label>
          <select value={group} onChange={(e) => setGroup(e.target.value)}>
            <option value="">Semua Kelompok</option>
            {filteredGroups.map((g) => (
              <option key={g.id} value={g.nama}>{g.nama}</option>
            ))}
          </select>
        </div>
        <div className="filter-item">
          <label>Jenis Kelamin</label>
          <select value={gender} onChange={(e) => setGender(e.target.value)}>
            <option value="">Semua</option>
            <option value="L">Laki-laki</option>
            <option value="P">Perempuan</option>
          </select>
        </div>
        <div className="filter-actions">
          <button className="btn-filter-apply" onClick={handleFilter}>Terapkan Filter</button>
          <button className="btn-filter-reset" onClick={handleReset}>
            <X size={14} /> Reset
          </button>
        </div>
      </div>

      <style jsx>{`
        .dashboard-filter-container {
          background: white;
          padding: 1.5rem;
          border-radius: 1rem;
          border: 1px solid #e2e8f0;
          margin-bottom: 1.5rem;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
        }
        .filter-header {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-weight: 700;
          color: #1e293b;
          margin-bottom: 1.25rem;
          font-size: 0.95rem;
        }
        .filter-header span {
          text-transform: uppercase;
          letter-spacing: 0.025em;
        }
        .filter-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1.25rem;
          align-items: flex-end;
        }
        .filter-item {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .filter-item label {
          font-size: 0.8rem;
          font-weight: 700;
          color: #64748b;
          text-transform: uppercase;
        }
        .filter-item select {
          padding: 0.625rem;
          border-radius: 0.5rem;
          border: 1px solid #e2e8f0;
          font-size: 0.9rem;
          outline: none;
          background-color: #f8fafc;
          transition: all 0.2s;
        }
        .filter-item select:focus {
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
          background-color: white;
        }
        .filter-actions {
          display: flex;
          gap: 0.75rem;
        }
        .btn-filter-apply {
          background: #1e293b;
          color: white;
          border: none;
          padding: 0.625rem 1.25rem;
          border-radius: 0.5rem;
          font-weight: 600;
          font-size: 0.9rem;
          cursor: pointer;
          transition: all 0.2s;
          flex: 1;
        }
        .btn-filter-apply:hover {
          background: #334155;
        }
        .btn-filter-reset {
          background: #f1f5f9;
          color: #64748b;
          border: 1px solid #e2e8f0;
          padding: 0.625rem 1rem;
          border-radius: 0.5rem;
          font-weight: 600;
          font-size: 0.9rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 0.4rem;
          transition: all 0.2s;
        }
        .btn-filter-reset:hover {
          background: #e2e8f0;
          color: #1e293b;
        }
        @media (max-width: 640px) {
          .filter-grid {
            grid-template-columns: 1fr;
          }
          .filter-actions {
            flex-direction: column;
          }
        }
      `}</style>
    </div>
  );
}
