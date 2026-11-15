"use client";

import { useState, useEffect, useCallback } from "react";
import { Bell, ArrowLeft, Send, Trash2, Smartphone, Users } from "lucide-react";
import Link from "next/link";
import Swal from "sweetalert2";

const MAX_JUDUL = 65;
const MAX_DESKRIPSI = 240;

type Notif = {
    id: string;
    judul: string;
    deskripsi: string;
    sentCount: number;
    failedCount: number;
    createdBy: string | null;
    createdAt: string | null;
};

function formatTanggal(value: string | null) {
    if (!value) return "-";
    const d = new Date(value.replace(" ", "T") + "Z");
    return d.toLocaleString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function NotifikasiRomanticRoom() {
    const [judul, setJudul] = useState("");
    const [deskripsi, setDeskripsi] = useState("");
    const [history, setHistory] = useState<Notif[]>([]);
    const [deviceCount, setDeviceCount] = useState(0);
    const [userCount, setUserCount] = useState(0);
    const [registeredCount, setRegisteredCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);

    const fetchData = useCallback(async () => {
        try {
            const res = await fetch("/api/mandiri/notifikasi", { cache: "no-store" });
            if (res.ok) {
                const json = await res.json();
                setHistory(Array.isArray(json.history) ? json.history : []);
                setDeviceCount(json.deviceCount || 0);
                setUserCount(json.userCount || 0);
                setRegisteredCount(json.registeredCount || 0);
            }
        } catch (error) {
            console.error("Error fetching notifikasi:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void fetchData();
    }, [fetchData]);

    const handleSend = async () => {
        if (!judul.trim() || !deskripsi.trim()) {
            Swal.fire("Lengkapi Data", "Judul dan deskripsi wajib diisi.", "warning");
            return;
        }
        const confirm = await Swal.fire({
            title: "Kirim Notifikasi?",
            html: `Notifikasi akan dikirim ke <b>${deviceCount}</b> perangkat aktif (${userCount} dari ${registeredCount} pengguna terdaftar). Pendaftar baru dalam 7 hari ke depan juga akan menerimanya.`,
            icon: "question",
            showCancelButton: true,
            confirmButtonColor: "#dc2626",
            cancelButtonColor: "#94a3b8",
            confirmButtonText: "Ya, Kirim",
            cancelButtonText: "Batal",
        });
        if (!confirm.isConfirmed) return;

        setSending(true);
        try {
            const res = await fetch("/api/mandiri/notifikasi", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ judul, deskripsi }),
            });
            const json = await res.json();
            if (res.ok) {
                Swal.fire("Terkirim!", `Berhasil ke ${json.sent} perangkat${json.failed ? `, gagal ${json.failed}` : ""}.`, "success");
                setJudul("");
                setDeskripsi("");
                void fetchData();
            } else {
                Swal.fire("Gagal", json.error || "Gagal mengirim notifikasi", "error");
            }
        } catch {
            Swal.fire("Error", "Terjadi kesalahan jaringan", "error");
        } finally {
            setSending(false);
        }
    };

    const handleDelete = async (id: string) => {
        const confirm = await Swal.fire({
            title: "Hapus Riwayat?",
            text: "Notifikasi yang sudah terkirim tidak ditarik dari perangkat, tetapi tidak akan dikirim lagi ke pendaftar baru.",
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#ef4444",
            cancelButtonColor: "#94a3b8",
            confirmButtonText: "Ya, Hapus",
            cancelButtonText: "Batal",
        });
        if (!confirm.isConfirmed) return;
        const res = await fetch(`/api/mandiri/notifikasi?id=${id}`, { method: "DELETE" });
        if (res.ok) void fetchData();
        else Swal.fire("Gagal", "Gagal menghapus riwayat", "error");
    };

    const previewTitle = judul.trim() || "Judul notifikasi";
    const previewBody = deskripsi.trim() || "Deskripsi notifikasi akan tampil seperti ini di perangkat pengguna.";

    return (
        <div className="notif-layout">
            <header className="page-header">
                <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
                    <Link href="/mandiri/romantic-room" className="back-button">
                        <ArrowLeft size={20} />
                    </Link>
                    <div>
                        <h1>Notifikasi</h1>
                        <p>Kirim push notification ke perangkat pengguna terdaftar</p>
                    </div>
                </div>
            </header>

            <div className="stats">
                <div className="stat"><Smartphone size={18} /><b>{deviceCount}</b><span>Perangkat aktif</span></div>
                <div className="stat"><Users size={18} /><b>{registeredCount}</b><span>Pengguna terdaftar</span></div>
                <div className="stat"><Bell size={18} /><b>{userCount}</b><span>Pengguna aktif notifikasi</span></div>
            </div>

            <div className="grid">
                <section className="card">
                    <h3><Bell size={18} color="#dc2626" /> Buat Notifikasi</h3>
                    <label>Judul <small>{judul.length}/{MAX_JUDUL}</small></label>
                    <input
                        value={judul}
                        maxLength={MAX_JUDUL}
                        onChange={(e) => setJudul(e.target.value)}
                        placeholder="Contoh: Pengumuman Romantic Room"
                    />
                    <label>Deskripsi <small>{deskripsi.length}/{MAX_DESKRIPSI}</small></label>
                    <textarea
                        value={deskripsi}
                        maxLength={MAX_DESKRIPSI}
                        rows={5}
                        onChange={(e) => setDeskripsi(e.target.value)}
                        placeholder="Isi pesan yang ingin disampaikan..."
                    />
                    <button className="send" onClick={handleSend} disabled={sending || !judul.trim() || !deskripsi.trim()}>
                        <Send size={16} /> {sending ? "Mengirim..." : "Kirim ke Semua Pengguna"}
                    </button>
                </section>

                <section className="card">
                    <h3>Pratinjau di Perangkat</h3>
                    <div className="phone">
                        <div className="push">
                            <img src="/img/logo-jb2.png" alt="" className="push-icon" />
                            <div className="push-text">
                                <div className="push-app">GENCAR · sekarang</div>
                                <div className="push-title">{previewTitle}</div>
                                <div className="push-body">{previewBody}</div>
                            </div>
                        </div>
                    </div>
                </section>
            </div>

            <section className="card" style={{ marginTop: 20 }}>
                <h3>Riwayat Notifikasi</h3>
                {loading ? (
                    <p className="muted">Memuat...</p>
                ) : history.length === 0 ? (
                    <p className="muted">Belum ada notifikasi yang dikirim.</p>
                ) : (
                    <ul className="history">
                        {history.map((n) => (
                            <li key={n.id}>
                                <div className="h-main">
                                    <b>{n.judul}</b>
                                    <p>{n.deskripsi}</p>
                                    <span className="muted">
                                        {formatTanggal(n.createdAt)} · {n.createdBy || "-"} · terkirim {n.sentCount}
                                        {n.failedCount ? `, gagal ${n.failedCount}` : ""}
                                    </span>
                                </div>
                                <button className="del" onClick={() => handleDelete(n.id)} aria-label="Hapus">
                                    <Trash2 size={16} />
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </section>

            <style jsx>{`
                .notif-layout { padding: 24px; max-width: 1100px; margin: 0 auto; }
                .page-header h1 { font-size: 24px; font-weight: 800; margin: 0; color: #0f172a; }
                .page-header p { margin: 4px 0 0; color: #64748b; font-size: 14px; }
                .page-header { margin-bottom: 20px; }
                .stats { display: flex; gap: 12px; margin-bottom: 20px; flex-wrap: wrap; }
                .stat { display: flex; align-items: center; gap: 8px; background: white; border: 1px solid #e2e8f0; border-radius: 12px; padding: 10px 16px; color: #475569; font-size: 14px; }
                .stat b { color: #0f172a; font-size: 18px; }
                .grid { display: grid; grid-template-columns: 1.2fr 1fr; gap: 20px; }
                @media (max-width: 800px) { .grid { grid-template-columns: 1fr; } .notif-layout { padding: 16px; } }
                .card { background: white; border: 1px solid #e2e8f0; border-radius: 16px; padding: 20px; }
                .card h3 { display: flex; align-items: center; gap: 8px; margin: 0 0 16px; font-size: 16px; color: #0f172a; }
                label { display: flex; justify-content: space-between; font-size: 13px; font-weight: 600; color: #475569; margin: 12px 0 6px; }
                label small { font-weight: 500; color: #94a3b8; }
                input, textarea { width: 100%; padding: 10px 12px; border: 1px solid #cbd5e1; border-radius: 10px; font-size: 14px; font-family: inherit; outline: none; box-sizing: border-box; resize: vertical; }
                input:focus, textarea:focus { border-color: #dc2626; box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.12); }
                .send { margin-top: 16px; width: 100%; display: flex; align-items: center; justify-content: center; gap: 8px; padding: 12px; border: none; border-radius: 10px; background: linear-gradient(135deg, #dc2626, #7c3aed); color: white; font-weight: 700; font-size: 14px; cursor: pointer; }
                .send:disabled { opacity: 0.5; cursor: not-allowed; }
                .phone { background: linear-gradient(160deg, #1e293b, #0f172a); border-radius: 20px; padding: 24px 14px; }
                .push { display: flex; gap: 12px; background: rgba(255, 255, 255, 0.96); border-radius: 16px; padding: 12px; box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35); }
                .push-icon { width: 40px; height: 40px; border-radius: 10px; object-fit: contain; background: #fff; flex-shrink: 0; }
                .push-text { min-width: 0; }
                .push-app { font-size: 11px; color: #64748b; margin-bottom: 2px; }
                .push-title { font-weight: 700; font-size: 14px; color: #0f172a; word-break: break-word; }
                .push-body { font-size: 13px; color: #334155; margin-top: 2px; word-break: break-word; white-space: pre-wrap; }
                .muted { color: #94a3b8; font-size: 12px; }
                .history { list-style: none; margin: 0; padding: 0; }
                .history li { display: flex; justify-content: space-between; gap: 12px; padding: 12px 0; border-top: 1px solid #f1f5f9; }
                .history li:first-child { border-top: none; }
                .h-main p { margin: 2px 0 4px; color: #475569; font-size: 14px; white-space: pre-wrap; }
                .del { border: none; background: #fef2f2; color: #dc2626; border-radius: 8px; width: 34px; height: 34px; cursor: pointer; flex-shrink: 0; }
            `}</style>
        </div>
    );
}
