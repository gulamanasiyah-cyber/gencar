"use client";

import { useState, useEffect, useCallback, useMemo, useRef, forwardRef, useImperativeHandle } from "react";
import Link from "next/link";
import { ArrowLeft, RefreshCw, Trophy, RotateCcw, X } from "lucide-react";
import { fetchRetry } from "@/lib/fetch-retry";

type Peserta = {
  id: string;
  generusId?: string;
  nomorUrut?: number;
  nomorUnik?: string;
  nama?: string;
  jenisKelamin?: string;
  desaKota?: string;
  desaNama?: string;
  isPanitia?: boolean | number | string;
};

const isPanitiaOf = (p: Peserta) => p.isPanitia === true || p.isPanitia === 1 || p.isPanitia === "true";
const keyOf = (p: Peserta) => String(p.generusId || p.id);

const PALETTE_L = ["#1d4ed8", "#2563eb", "#0ea5e9", "#0891b2", "#4f46e5", "#3b82f6"];
const PALETTE_P = ["#be185d", "#db2777", "#e11d48", "#c026d3", "#f43f5e", "#a21caf"];

function randInt(n: number) {
  if (n <= 0) return 0;
  try {
    const a = new Uint32Array(1);
    crypto.getRandomValues(a);
    return a[0] % n;
  } catch {
    return Math.floor(Math.random() * n);
  }
}

type WheelHandle = { spin: () => Promise<Peserta | null> };

const Wheel = forwardRef<WheelHandle, { items: Peserta[]; palette: string[]; size?: number }>(function Wheel(
  { items, palette, size = 420 },
  ref
) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rotRef = useRef(0);
  const spinningRef = useRef(false);
  const itemsRef = useRef(items);
  itemsRef.current = items;

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size, size);
    const cx = size / 2;
    const r = size / 2 - 6;
    const list = itemsRef.current;
    const n = list.length;

    if (n === 0) {
      ctx.beginPath();
      ctx.arc(cx, cx, r, 0, Math.PI * 2);
      ctx.fillStyle = "#e2e8f0";
      ctx.fill();
      ctx.fillStyle = "#64748b";
      ctx.font = "600 15px Inter, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Tidak ada peserta", cx, cx);
      return;
    }

    const seg = (Math.PI * 2) / n;
    ctx.save();
    ctx.translate(cx, cx);
    ctx.rotate(rotRef.current);
    for (let i = 0; i < n; i++) {
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, r, i * seg, (i + 1) * seg);
      ctx.closePath();
      ctx.fillStyle = palette[i % palette.length];
      ctx.fill();
      if (n <= 100) {
        ctx.strokeStyle = "rgba(255,255,255,.7)";
        ctx.lineWidth = 1;
        ctx.stroke();
      }
      // Label hanya jika segmen cukup lebar
      const arcPx = seg * r * 0.6;
      if (arcPx >= 11) {
        ctx.save();
        ctx.rotate(i * seg + seg / 2);
        ctx.fillStyle = "#fff";
        ctx.textAlign = "right";
        ctx.textBaseline = "middle";
        const fs = Math.max(9, Math.min(15, arcPx * 0.8));
        ctx.font = `700 ${fs}px Inter, sans-serif`;
        const p = list[i];
        let label = `${p.nomorUrut ?? ""} ${p.nama ?? ""}`.trim();
        const maxChars = Math.floor((r - 40) / (fs * 0.55));
        if (label.length > maxChars) label = label.slice(0, Math.max(1, maxChars - 1)) + "…";
        ctx.fillText(label, r - 12, 0);
        ctx.restore();
      }
    }
    ctx.restore();

    // hub
    ctx.beginPath();
    ctx.arc(cx, cx, 26, 0, Math.PI * 2);
    ctx.fillStyle = "#fff";
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = "#1e293b";
    ctx.stroke();
  }, [palette, size]);

  useEffect(() => {
    draw();
  }, [draw, items]);

  useImperativeHandle(ref, () => ({
    spin: () =>
      new Promise<Peserta | null>((resolve) => {
        const list = itemsRef.current;
        const n = list.length;
        if (n === 0 || spinningRef.current) return resolve(null);
        spinningRef.current = true;
        const idx = randInt(n);
        const seg = (Math.PI * 2) / n;
        const jitter = (Math.random() - 0.5) * seg * 0.7;
        const TAU = Math.PI * 2;
        const start = rotRef.current;
        // pointer di atas (-PI/2): pusat segmen idx harus berada di sana
        let target = -Math.PI / 2 - (idx + 0.5) * seg - jitter;
        const minTurns = 6 + Math.random() * 2;
        while (target < start + minTurns * TAU) target += TAU;
        const duration = 5200 + Math.random() * 1200;
        const t0 = performance.now();
        const step = (now: number) => {
          const t = Math.min(1, (now - t0) / duration);
          const eased = 1 - Math.pow(1 - t, 4);
          rotRef.current = start + (target - start) * eased;
          draw();
          if (t < 1) requestAnimationFrame(step);
          else {
            rotRef.current = target % TAU;
            spinningRef.current = false;
            resolve(list[idx]);
          }
        };
        requestAnimationFrame(step);
      }),
  }));

  return (
    <div className="wheel-wrap" style={{ width: "100%", maxWidth: size }}>
      <div className="pointer" />
      <canvas ref={canvasRef} style={{ width: "100%", height: "auto", aspectRatio: "1 / 1", display: "block" }} />
      <style jsx>{`
        .wheel-wrap { position: relative; margin: 0 auto; }
        .pointer { position: absolute; top: -4px; left: 50%; transform: translateX(-50%); z-index: 2; width: 0; height: 0;
          border-left: 14px solid transparent; border-right: 14px solid transparent; border-top: 30px solid #f59e0b;
          filter: drop-shadow(0 2px 2px rgba(0,0,0,.35)); }
      `}</style>
    </div>
  );
});

export default function SpinnerPage() {
  const [participants, setParticipants] = useState<Peserta[]>([]);
  const [pulangIds, setPulangIds] = useState<Set<string>>(new Set());
  const [pulangNomor, setPulangNomor] = useState<Set<string>>(new Set());
  const [enteredNomor, setEnteredNomor] = useState<Set<string>>(new Set());
  const [onlyBelumRR, setOnlyBelumRR] = useState(true);
  const [kegiatanList, setKegiatanList] = useState<{ id: string; judul: string; kota: string }[]>([]);
  const [kegiatanId, setKegiatanId] = useState("");
  const [loading, setLoading] = useState(true);
  const [tipe, setTipe] = useState<"Peserta" | "Panitia" | "Semua">("Peserta");
  const [removeWinner, setRemoveWinner] = useState(true);
  const [excluded, setExcluded] = useState<Set<string>>(new Set());
  const [spinningL, setSpinningL] = useState(false);
  const [spinningP, setSpinningP] = useState(false);
  const [winner, setWinner] = useState<{ p: Peserta; gender: "L" | "P" } | null>(null);
  const [history, setHistory] = useState<{ p: Peserta; gender: "L" | "P" }[]>([]);
  const wheelL = useRef<WheelHandle>(null);
  const wheelP = useRef<WheelHandle>(null);

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
      }
    })();
  }, []);

  const fetchData = useCallback(async () => {
    if (!kegiatanId) return;
    setLoading(true);
    try {
      const [pRes, gRes, rRes, hRes] = await Promise.all([
        fetchRetry(`/api/mandiri?limit=1000&onlyAttended=true&kegiatanId=${kegiatanId}`),
        fetchRetry(`/api/mandiri/pulang?kegiatanId=${kegiatanId}`),
        fetchRetry(`/api/mandiri/rooms?kegiatanId=${kegiatanId}`),
        fetchRetry(`/api/mandiri/kunjungan?kegiatanId=${kegiatanId}`),
      ]);
      if (pRes.ok) {
        const j = await pRes.json();
        setParticipants(Array.isArray(j.data) ? j.data : []);
      }
      // Sama dengan halaman "Belum Masuk Romantic Room": yang pernah masuk RR
      const entered = new Set<string>();
      if (rRes.ok) {
        const j = await rRes.json();
        (Array.isArray(j) ? j : []).forEach((r: any) => {
          if (!r.pemilihanId) return;
          if (r.pengirimNo) entered.add(String(r.pengirimNo));
          if (r.penerimaNo) entered.add(String(r.penerimaNo));
        });
      }
      if (hRes.ok) {
        const j = await hRes.json();
        (Array.isArray(j) ? j : []).forEach((h: any) => {
          if (h.pemilihNo) entered.add(String(h.pemilihNo));
          if (h.terpilihNo) entered.add(String(h.terpilihNo));
        });
      }
      setEnteredNomor(entered);
      if (gRes.ok) {
        const j = await gRes.json();
        const ids = new Set<string>();
        const nomor = new Set<string>();
        (Array.isArray(j) ? j : []).forEach((x: any) => {
          if (x.generusId) ids.add(String(x.generusId));
          if (x.generusNomorUnik) nomor.add(String(x.generusNomorUnik));
        });
        setPulangIds(ids);
        setPulangNomor(nomor);
      }
    } catch (e) {
      console.error("Gagal memuat data spinner:", e);
    } finally {
      setLoading(false);
    }
  }, [kegiatanId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Hadir & belum pulang
  const eligible = useMemo(
    () =>
      participants.filter((p) => {
        if (pulangIds.has(String(p.generusId || p.id)) || (p.nomorUnik && pulangNomor.has(String(p.nomorUnik)))) return false;
        if (onlyBelumRR && (!p.nomorUnik || enteredNomor.has(String(p.nomorUnik)))) return false;
        const pan = isPanitiaOf(p);
        if (tipe === "Peserta" && pan) return false;
        if (tipe === "Panitia" && !pan) return false;
        return true;
      }),
    [participants, pulangIds, pulangNomor, enteredNomor, onlyBelumRR, tipe]
  );

  const sortFn = (a: Peserta, b: Peserta) => (Number(a.nomorUrut) || 0) - (Number(b.nomorUrut) || 0);
  const itemsL = useMemo(() => eligible.filter((p) => p.jenisKelamin === "L" && !excluded.has(keyOf(p))).sort(sortFn), [eligible, excluded]);
  const itemsP = useMemo(() => eligible.filter((p) => p.jenisKelamin === "P" && !excluded.has(keyOf(p))).sort(sortFn), [eligible, excluded]);
  const totalL = eligible.filter((p) => p.jenisKelamin === "L").length;
  const totalP = eligible.filter((p) => p.jenisKelamin === "P").length;

  const busy = spinningL || spinningP;

  const finish = (p: Peserta | null, gender: "L" | "P") => {
    if (!p) return;
    setWinner({ p, gender });
    setHistory((h) => [{ p, gender }, ...h]);
  };

  const spin = async (gender: "L" | "P") => {
    if (busy) return;
    const set = gender === "L" ? setSpinningL : setSpinningP;
    set(true);
    const p = await (gender === "L" ? wheelL : wheelP).current?.spin();
    set(false);
    finish(p ?? null, gender);
  };

  const spinBoth = async () => {
    if (busy) return;
    setSpinningL(true);
    setSpinningP(true);
    const [l, p] = await Promise.all([wheelL.current?.spin(), wheelP.current?.spin()]);
    setSpinningL(false);
    setSpinningP(false);
    // dua pemenang ditampilkan berurutan: simpan keduanya, tampilkan sebagai pasangan
    if (l) setHistory((h) => [{ p: l, gender: "L" }, ...h]);
    if (p) setHistory((h) => [{ p, gender: "P" }, ...h]);
    setPair({ l: l ?? null, p: p ?? null });
  };

  const [pair, setPair] = useState<{ l: Peserta | null; p: Peserta | null } | null>(null);

  const closeModal = () => {
    if (removeWinner) {
      const ids: string[] = [];
      if (winner) ids.push(keyOf(winner.p));
      if (pair?.l) ids.push(keyOf(pair.l));
      if (pair?.p) ids.push(keyOf(pair.p));
      if (ids.length) setExcluded((prev) => new Set(Array.from(prev).concat(ids)));
    }
    setWinner(null);
    setPair(null);
  };

  const resetExcluded = () => {
    setExcluded(new Set());
    setHistory([]);
  };

  const WinnerCard = ({ p, gender }: { p: Peserta; gender: "L" | "P" }) => (
    <div className={`win-card ${gender === "L" ? "win-l" : "win-p"}`}>
      <div className="win-badge">{gender === "L" ? "Laki-laki" : "Perempuan"}</div>
      <div className="win-no">{p.nomorUrut ?? "-"}</div>
      <div className="win-name">{p.nama}</div>
      <div className="win-meta">{p.desaKota || "-"} / {p.desaNama || "-"}</div>
    </div>
  );

  return (
    <div className="sp-page">
      <header className="sp-header">
        <Link href="/mandiri/romantic-room" className="sp-back" aria-label="Kembali">
          <ArrowLeft size={20} />
        </Link>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1>Spinner Wheel</h1>
          <p>Undian dari peserta yang sudah absen dan belum pulang.</p>
        </div>
        <button className="sp-btn-outline" onClick={fetchData} disabled={loading || busy}>
          <RefreshCw size={16} className={loading ? "sp-spin" : ""} /> Muat Ulang
        </button>
      </header>

      <div className="sp-toolbar">
        {kegiatanList.length > 0 && (
          <select value={kegiatanId} onChange={(e) => { setKegiatanId(e.target.value); setExcluded(new Set()); setHistory([]); }}>
            {kegiatanList.map((k) => (
              <option key={k.id} value={k.id}>{k.judul} ({k.kota})</option>
            ))}
          </select>
        )}
        <select value={tipe} onChange={(e) => setTipe(e.target.value as any)}>
          <option value="Peserta">Peserta saja</option>
          <option value="Panitia">Panitia saja</option>
          <option value="Semua">Peserta & Panitia</option>
        </select>
        <label className="sp-check">
          <input type="checkbox" checked={onlyBelumRR} onChange={(e) => setOnlyBelumRR(e.target.checked)} />
          Hanya yang belum masuk Romantic Room
        </label>
        <label className="sp-check">
          <input type="checkbox" checked={removeWinner} onChange={(e) => setRemoveWinner(e.target.checked)} />
          Keluarkan pemenang dari putaran berikutnya
        </label>
        {excluded.size > 0 && (
          <button className="sp-btn-outline" onClick={resetExcluded} disabled={busy}>
            <RotateCcw size={14} /> Reset ({excluded.size})
          </button>
        )}
      </div>

      {loading && participants.length === 0 ? (
        <div className="sp-empty">Memuat data...</div>
      ) : (
        <>
          <div className="sp-wheels">
            <section className="sp-panel sp-l">
              <h2>Laki-laki <small>{itemsL.length} / {totalL}</small></h2>
              <Wheel ref={wheelL} items={itemsL} palette={PALETTE_L} />
              <button className="sp-spin-btn sp-spin-l" onClick={() => spin("L")} disabled={busy || itemsL.length === 0}>
                {spinningL ? "Memutar..." : "PUTAR LAKI-LAKI"}
              </button>
            </section>
            <section className="sp-panel sp-p">
              <h2>Perempuan <small>{itemsP.length} / {totalP}</small></h2>
              <Wheel ref={wheelP} items={itemsP} palette={PALETTE_P} />
              <button className="sp-spin-btn sp-spin-p" onClick={() => spin("P")} disabled={busy || itemsP.length === 0}>
                {spinningP ? "Memutar..." : "PUTAR PEREMPUAN"}
              </button>
            </section>
          </div>

          <div className="sp-both">
            <button className="sp-spin-btn sp-spin-both" onClick={spinBoth} disabled={busy || itemsL.length === 0 || itemsP.length === 0}>
              PUTAR KEDUANYA
            </button>
          </div>

          {history.length > 0 && (
            <section className="sp-history">
              <h3><Trophy size={16} /> Riwayat pemenang</h3>
              <ol>
                {history.map((h, i) => (
                  <li key={i} className={h.gender === "L" ? "h-l" : "h-p"}>
                    <span className="h-no">{h.p.nomorUrut ?? "-"}</span>
                    <strong>{h.p.nama}</strong>
                    <em>{h.gender === "L" ? "Laki-laki" : "Perempuan"}</em>
                  </li>
                ))}
              </ol>
            </section>
          )}
        </>
      )}

      {(winner || pair) && (
        <div className="sp-modal" onClick={closeModal}>
          <div className="sp-modal-box" onClick={(e) => e.stopPropagation()}>
            <button className="sp-close" onClick={closeModal} aria-label="Tutup"><X size={18} /></button>
            <div className="sp-trophy"><Trophy size={36} /></div>
            <h2>Selamat!</h2>
            <div className="win-row">
              {winner && <WinnerCard p={winner.p} gender={winner.gender} />}
              {pair?.l && <WinnerCard p={pair.l} gender="L" />}
              {pair?.p && <WinnerCard p={pair.p} gender="P" />}
            </div>
            <button className="sp-spin-btn sp-spin-both" onClick={closeModal}>Tutup</button>
          </div>
        </div>
      )}

      <style jsx>{`
        .sp-page { padding: 24px; width: 100%; max-width: 1200px; min-width: 0; box-sizing: border-box; overflow-x: hidden; margin: 0 auto; font-family: 'Inter', sans-serif; color: #334155; }
        .sp-header { display: flex; align-items: center; gap: 14px; margin-bottom: 18px; flex-wrap: wrap; }
        .sp-header h1 { margin: 0; font-size: 22px; font-weight: 800; color: #1e293b; }
        .sp-header p { margin: 2px 0 0; font-size: 13px; color: #64748b; }
        .sp-back { display: inline-flex; width: 38px; height: 38px; align-items: center; justify-content: center; border-radius: 10px; border: 1px solid #e2e8f0; background: #fff; color: #475569; }
        .sp-btn-outline { display: inline-flex; align-items: center; gap: 6px; height: 36px; padding: 0 14px; border: 1px solid #cbd5e1; border-radius: 8px; background: #fff; font-size: 12px; font-weight: 700; cursor: pointer; }
        .sp-btn-outline:disabled { opacity: .6; cursor: not-allowed; }
        .sp-spin { animation: sp-rot 1s linear infinite; }
        @keyframes sp-rot { to { transform: rotate(360deg); } }
        .sp-toolbar { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; margin-bottom: 18px; }
        .sp-toolbar select { height: 36px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 12px; padding: 0 8px; background: #fff; max-width: 100%; }
        .sp-check { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 600; }
        .sp-empty { padding: 48px 16px; text-align: center; color: #94a3b8; background: #fff; border: 1px dashed #cbd5e1; border-radius: 12px; }
        .sp-wheels { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 18px; }
        .sp-panel { background: #fff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 18px 16px 20px; display: flex; flex-direction: column; gap: 14px; min-width: 0; }
        .sp-panel h2 { margin: 0; font-size: 17px; font-weight: 800; text-align: center; }
        .sp-panel h2 small { font-size: 12px; font-weight: 600; color: #64748b; margin-left: 6px; }
        .sp-l h2 { color: #1d4ed8; }
        .sp-p h2 { color: #be185d; }
        .sp-spin-btn { height: 44px; border: 0; border-radius: 10px; color: #fff; font-weight: 800; font-size: 14px; letter-spacing: .5px; cursor: pointer; padding: 0 20px; }
        .sp-spin-btn:disabled { opacity: .5; cursor: not-allowed; }
        .sp-spin-l { background: #2563eb; }
        .sp-spin-p { background: #db2777; }
        .sp-spin-both { background: #1e293b; }
        .sp-both { display: flex; justify-content: center; margin-top: 18px; }
        .sp-both .sp-spin-btn { min-width: 260px; }
        .sp-history { margin-top: 22px; background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px 16px; }
        .sp-history h3 { display: flex; align-items: center; gap: 6px; margin: 0 0 10px; font-size: 14px; color: #1e293b; }
        .sp-history ol { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 6px; max-height: 280px; overflow-y: auto; }
        .sp-history li { display: flex; align-items: center; gap: 8px; font-size: 13px; padding: 6px 10px; border-radius: 8px; min-width: 0; }
        .sp-history li strong { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .sp-history li em { font-style: normal; font-size: 11px; font-weight: 700; }
        .h-l { background: #eff6ff; } .h-l em { color: #1d4ed8; }
        .h-p { background: #fdf2f8; } .h-p em { color: #be185d; }
        .h-no { background: #1e293b; color: #fff; font-size: 11px; font-weight: 800; border-radius: 6px; padding: 1px 7px; }
        .sp-modal { position: fixed; inset: 0; background: rgba(15,23,42,.6); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 16px; }
        .sp-modal-box { position: relative; background: #fff; border-radius: 18px; padding: 28px 24px 24px; width: 100%; max-width: 560px; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 12px; animation: sp-pop .3s ease-out; max-height: 92vh; overflow-y: auto; }
        @keyframes sp-pop { from { transform: scale(.85); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        .sp-modal-box h2 { margin: 0; font-size: 24px; font-weight: 800; color: #1e293b; }
        .sp-trophy { color: #f59e0b; }
        .sp-close { position: absolute; top: 10px; right: 10px; border: 0; background: #f1f5f9; border-radius: 8px; width: 32px; height: 32px; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; }
        .win-row { display: flex; gap: 12px; flex-wrap: wrap; justify-content: center; width: 100%; }
        .win-card { flex: 1 1 200px; min-width: 0; border-radius: 14px; padding: 16px 12px; display: flex; flex-direction: column; gap: 6px; align-items: center; }
        .win-l { background: #eff6ff; border: 2px solid #2563eb; }
        .win-p { background: #fdf2f8; border: 2px solid #db2777; }
        .win-badge { font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: .5px; }
        .win-l .win-badge { color: #1d4ed8; } .win-p .win-badge { color: #be185d; }
        .win-no { font-size: 34px; font-weight: 900; color: #1e293b; line-height: 1; }
        .win-name { font-size: 18px; font-weight: 800; color: #1e293b; word-break: break-word; }
        .win-meta { font-size: 12px; color: #64748b; }
        @media (max-width: 760px) {
          .sp-page { padding: 14px 12px; }
          .sp-header h1 { font-size: 18px; }
          .sp-wheels { grid-template-columns: minmax(0, 1fr); }
          .sp-toolbar { flex-direction: column; align-items: stretch; }
          .sp-toolbar select { width: 100%; }
          .sp-both .sp-spin-btn { width: 100%; min-width: 0; }
        }
      `}</style>
    </div>
  );
}
