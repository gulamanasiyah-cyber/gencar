"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { ArrowLeft, RefreshCw, Search, Users } from "lucide-react";
import { fetchRetry } from "@/lib/fetch-retry";
import { getPusherClient } from "@/lib/pusher-client";

type Peserta = {
  id: string;
  generusId?: string;
  nomorUrut?: number;
  nomorUnik?: string;
  nama?: string;
  jenisKelamin?: string;
  noTelp?: string;
  desaKota?: string;
  desaNama?: string;
  isPanitia?: boolean | number | string;
};

const isPanitiaOf = (p: Peserta) => p.isPanitia === true || p.isPanitia === 1 || p.isPanitia === "true";

export default function BelumMasukRRPage() {
  const [participants, setParticipants] = useState<Peserta[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [queue, setQueue] = useState<any[]>([]);
  const [kegiatanList, setKegiatanList] = useState<{ id: string; judul: string; kota: string }[]>([]);
  const [kegiatanId, setKegiatanId] = useState("");
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tipe, setTipe] = useState<"Semua" | "Peserta" | "Panitia">("Semua");
  const [gender, setGender] = useState<"Semua" | "L" | "P">("Semua");
  const [onlyNotQueued, setOnlyNotQueued] = useState(false);

  // Daftar kegiatan + kegiatan aktif (sekali saat awal)
  useEffect(() => {
    (async () => {
      try {
        const [kRes, sRes] = await Promise.all([fetchRetry("/api/mandiri/kegiatan"), fetchRetry("/api/settings")]);
        const kList = kRes.ok ? await kRes.json() : [];
        const s = sRes.ok ? await sRes.json() : {};
        if (Array.isArray(kList)) setKegiatanList(kList);
        setKegiatanId(s.mandiri_active_kegiatan_id || (Array.isArray(kList) ? kList[0]?.id : "") || "");
      } catch (e) {
        console.error(e);
        setKegiatanId("");
      }
    })();
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const kg = kegiatanId ? `kegiatanId=${kegiatanId}` : "";
      const [pRes, rRes, hRes, qRes] = await Promise.all([
        fetchRetry(`/api/mandiri?limit=1000&onlyAttended=true${kg ? `&${kg}` : ""}`),
        fetchRetry(`/api/mandiri/rooms${kg ? `?${kg}` : ""}`),
        fetchRetry(`/api/mandiri/kunjungan${kg ? `?${kg}` : ""}`),
        fetchRetry(`/api/mandiri/pilih?all=true${kg ? `&${kg}` : ""}`),
      ]);
      if (pRes.ok) {
        const j = await pRes.json();
        setParticipants(Array.isArray(j.data) ? j.data : []);
      }
      if (rRes.ok) {
        const j = await rRes.json();
        setRooms(Array.isArray(j) ? j : []);
      }
      if (hRes.ok) {
        const j = await hRes.json();
        setHistory(Array.isArray(j) ? j : []);
      }
      if (qRes.ok) {
        const j = await qRes.json();
        setQueue(Array.isArray(j) ? j.filter((q: any) => q.status === "Menunggu") : []);
      }
    } catch (e) {
      console.error("Gagal memuat data belum masuk RR:", e);
    } finally {
      setLoading(false);
    }
  }, [kegiatanId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Realtime: perubahan ruangan / pemilihan / absensi
  useEffect(() => {
    const pusher = getPusherClient();
    if (!pusher) return;
    const channel = pusher.subscribe("taaruf-channel");
    const refresh = () => fetchData();
    channel.bind("taaruf-changed", refresh);
    channel.bind("room-changed", refresh);
    channel.bind("absensi-updated", refresh);
    return () => {
      channel.unbind("taaruf-changed", refresh);
      channel.unbind("room-changed", refresh);
      channel.unbind("absensi-updated", refresh);
    };
  }, [fetchData]);

  const { belumMasuk, queuedSet } = useMemo(() => {
    const entered = new Set<string>();
    rooms.forEach((r) => {
      if (!r.pemilihanId) return;
      if (r.pengirimNo) entered.add(String(r.pengirimNo));
      if (r.penerimaNo) entered.add(String(r.penerimaNo));
    });
    history.forEach((h) => {
      if (h.pemilihNo) entered.add(String(h.pemilihNo));
      if (h.terpilihNo) entered.add(String(h.terpilihNo));
    });
    const queued = new Set<string>();
    queue.forEach((q) => {
      if (q.pengirimNo) queued.add(String(q.pengirimNo));
      if (q.penerimaNo) queued.add(String(q.penerimaNo));
    });
    return {
      belumMasuk: participants.filter((p) => p.nomorUnik && !entered.has(String(p.nomorUnik))),
      queuedSet: queued,
    };
  }, [participants, rooms, history, queue]);

  const list = useMemo(() => {
    const q = search.trim().toLowerCase();
    return belumMasuk
      .filter((p) => {
        const pan = isPanitiaOf(p);
        if (tipe === "Peserta" && pan) return false;
        if (tipe === "Panitia" && !pan) return false;
        if (gender !== "Semua" && p.jenisKelamin !== gender) return false;
        if (onlyNotQueued && queuedSet.has(String(p.nomorUnik))) return false;
        if (!q) return true;
        return (
          (p.nama || "").toLowerCase().includes(q) ||
          String(p.nomorUrut ?? "").includes(q) ||
          (p.nomorUnik || "").toLowerCase().includes(q) ||
          (p.desaNama || "").toLowerCase().includes(q) ||
          (p.desaKota || "").toLowerCase().includes(q)
        );
      })
      .sort((a, b) => (Number(a.nomorUrut) || 0) - (Number(b.nomorUrut) || 0));
  }, [belumMasuk, search, tipe, gender, onlyNotQueued, queuedSet]);

  const countPeserta = belumMasuk.filter((p) => !isPanitiaOf(p)).length;
  const countPanitia = belumMasuk.length - countPeserta;

  return (
    <div className="bm-page">
      <header className="bm-header">
        <Link href="/mandiri/romantic-room" className="bm-back" aria-label="Kembali ke Romantic Room">
          <ArrowLeft size={20} />
        </Link>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1>Belum Masuk Romantic Room</h1>
          <p>Peserta dan panitia yang sudah hadir tetapi belum pernah masuk ke Romantic Room.</p>
        </div>
        <button className="bm-refresh" onClick={fetchData} disabled={loading}>
          <RefreshCw size={16} className={loading ? "bm-spin" : ""} /> Muat Ulang
        </button>
      </header>

      <div className="bm-stats">
        <div className="bm-stat"><span>{belumMasuk.length}</span>Total belum masuk</div>
        <div className="bm-stat"><span>{countPeserta}</span>Peserta</div>
        <div className="bm-stat"><span>{countPanitia}</span>Panitia</div>
        <div className="bm-stat"><span>{belumMasuk.filter((p) => queuedSet.has(String(p.nomorUnik))).length}</span>Sudah dalam antrean</div>
      </div>

      <div className="bm-toolbar">
        {kegiatanList.length > 0 && (
          <select value={kegiatanId} onChange={(e) => setKegiatanId(e.target.value)}>
            {kegiatanList.map((k) => (
              <option key={k.id} value={k.id}>{k.judul} ({k.kota})</option>
            ))}
          </select>
        )}
        <div className="bm-search">
          <Search size={16} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari nama, nomor, desa, atau kota..." />
        </div>
        <select value={tipe} onChange={(e) => setTipe(e.target.value as any)}>
          <option value="Semua">Peserta & Panitia</option>
          <option value="Peserta">Peserta saja</option>
          <option value="Panitia">Panitia saja</option>
        </select>
        <select value={gender} onChange={(e) => setGender(e.target.value as any)}>
          <option value="Semua">Semua Gender</option>
          <option value="L">Laki-laki</option>
          <option value="P">Perempuan</option>
        </select>
        <label className="bm-check">
          <input type="checkbox" checked={onlyNotQueued} onChange={(e) => setOnlyNotQueued(e.target.checked)} />
          Belum antre
        </label>
      </div>

      <div className="bm-count">Menampilkan {list.length} dari {belumMasuk.length}</div>

      {loading && participants.length === 0 ? (
        <div className="bm-empty">Memuat data...</div>
      ) : list.length === 0 ? (
        <div className="bm-empty">
          <Users size={32} />
          {belumMasuk.length === 0 ? "Semua peserta & panitia yang hadir sudah masuk Romantic Room" : "Tidak ada data yang cocok"}
        </div>
      ) : (
        <div className="bm-grid">
          {list.map((p) => {
            const pan = isPanitiaOf(p);
            const inQueue = queuedSet.has(String(p.nomorUnik));
            return (
              <div className="bm-card" key={p.generusId || p.id}>
                <div className="bm-card-top">
                  <span className="bm-no">{p.nomorUrut ?? "-"}</span>
                  <strong title={p.nama}>{p.nama}</strong>
                </div>
                <div className="bm-tags">
                  <span className={pan ? "tag-panitia" : "tag-peserta"}>{pan ? "PANITIA" : "PESERTA"}</span>
                  {p.jenisKelamin && <span className="tag-gender">{p.jenisKelamin === "L" ? "Laki-laki" : "Perempuan"}</span>}
                  {inQueue && <span className="tag-queue">DALAM ANTREAN</span>}
                </div>
                <div className="bm-meta">{p.desaKota || "-"} / {p.desaNama || "-"}</div>
                {p.noTelp && <div className="bm-meta">📞 {p.noTelp}</div>}
              </div>
            );
          })}
        </div>
      )}

      <style jsx>{`
        .bm-page { padding: 24px; width: 100%; max-width: 1200px; min-width: 0; box-sizing: border-box; overflow-x: hidden; margin: 0 auto; font-family: 'Inter', sans-serif; color: #334155; }
        .bm-header { display: flex; align-items: center; gap: 14px; margin-bottom: 18px; flex-wrap: wrap; }
        .bm-header h1 { margin: 0; font-size: 22px; font-weight: 800; color: #1e293b; }
        .bm-header p { margin: 2px 0 0; font-size: 13px; color: #64748b; }
        .bm-back { display: inline-flex; width: 38px; height: 38px; align-items: center; justify-content: center; border-radius: 10px; border: 1px solid #e2e8f0; background: #fff; color: #475569; }
        .bm-refresh { display: inline-flex; align-items: center; gap: 6px; height: 36px; padding: 0 14px; border: 1px solid #cbd5e1; border-radius: 8px; background: #fff; font-size: 12px; font-weight: 700; cursor: pointer; }
        .bm-refresh:disabled { opacity: .6; cursor: not-allowed; }
        .bm-spin { animation: bm-rot 1s linear infinite; }
        @keyframes bm-rot { to { transform: rotate(360deg); } }
        .bm-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(150px, 100%), 1fr)); gap: 10px; margin-bottom: 16px; }
        .bm-stat { min-width: 0; background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px 14px; font-size: 12px; color: #64748b; font-weight: 600; }
        .bm-stat span { display: block; font-size: 24px; font-weight: 800; color: #1e293b; }
        .bm-toolbar { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; margin-bottom: 10px; }
        .bm-toolbar select { height: 36px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 12px; padding: 0 8px; background: #fff; max-width: 100%; }
        .bm-search { position: relative; flex: 1 1 240px; display: flex; align-items: center; }
        .bm-search :global(svg) { position: absolute; left: 12px; color: #94a3b8; }
        .bm-search input { width: 100%; height: 36px; padding-left: 36px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 12px; outline: none; }
        .bm-check { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 600; }
        .bm-count { font-size: 12px; color: #64748b; margin-bottom: 10px; }
        .bm-empty { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 48px 16px; color: #94a3b8; font-size: 14px; text-align: center; background: #fff; border: 1px dashed #cbd5e1; border-radius: 12px; }
        .bm-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(260px, 100%), 1fr)); gap: 10px; }
        .bm-card { min-width: 0; box-sizing: border-box; background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px 14px; display: flex; flex-direction: column; gap: 6px; }
        .bm-card-top { display: flex; align-items: center; gap: 8px; }
        .bm-card-top strong { flex: 1; min-width: 0; font-size: 14px; color: #1e293b; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .bm-no { background: #1e293b; color: #fff; font-size: 11px; font-weight: 800; border-radius: 6px; padding: 1px 7px; }
        .bm-tags { display: flex; gap: 6px; flex-wrap: wrap; font-size: 10px; font-weight: 700; }
        .bm-tags span { padding: 1px 6px; border-radius: 4px; }
        .tag-panitia { background: #fef3c7; color: #92400e; }
        .tag-peserta { background: #dcfce7; color: #166534; }
        .tag-gender { background: #f1f5f9; color: #475569; }
        .tag-queue { background: #dbeafe; color: #1d4ed8; }
        .bm-meta { font-size: 12px; color: #64748b; }
        @media (max-width: 640px) {
          .bm-page { padding: 14px 12px; }
          .bm-header h1 { font-size: 18px; }
          .bm-stats { grid-template-columns: repeat(2, minmax(0, 1fr)); }
          .bm-toolbar { flex-direction: column; align-items: stretch; }
          .bm-toolbar select, .bm-search { width: 100%; flex: 1 1 auto; }
          .bm-refresh { width: 100%; justify-content: center; }
          .bm-grid { grid-template-columns: minmax(0, 1fr); }
        }
      `}</style>
    </div>
  );
}
