"use client";

import Topbar from "@/components/Topbar";
import { useState, useEffect, useCallback } from "react";
import Swal from "sweetalert2";
import { 
    Search, RefreshCw, MapPin, Heart, Users, Camera, Check
} from "lucide-react";
import { getPusherClient } from "@/lib/pusher";

export default function TimJepretOperatorPage() {
    const [allQueue, setAllQueue] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [userRole, setUserRole] = useState("");
    const [queueSearch, setQueueSearch] = useState("");

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const qRes = await fetch(`/api/mandiri/pilih?all=true`);
            if (qRes.ok) {
                const qJson = await qRes.json();
                const waiting = Array.isArray(qJson) ? qJson.filter((q: any) => q.status === "Menunggu") : [];
                // Sort ascending by createdAt (earliest first)
                waiting.sort((a: any, b: any) => {
                    const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                    const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                    return dateA - dateB;
                });
                setAllQueue(waiting);
            }
        } catch (err) {
            console.error("Error fetching queue data:", err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();

        // Fetch current user details
        fetch("/api/profile")
            .then((r) => r.json())
            .then((d) => {
                setUserRole(d.role || "");
            });

        // Realtime updates using Pusher
        const pusher = getPusherClient();
        if (!pusher) return;

        const channel = pusher.subscribe("taaruf-channel");

        channel.bind("taaruf-changed", (eventData: any) => {
            fetchData();
            if (eventData && eventData.type === "update-status-tunggu" && eventData.statusTunggu === "dipanggil") {
                Swal.fire({
                    title: '📢 Panggil ke Ruang Tunggu!',
                    html: `
                        <div style="font-size: 14px; text-align: left; line-height: 1.6;">
                            <p>Admin RR telah memanggil pasangan berikut ke Ruang Tunggu:</p>
                            <div style="background: #f1f5f9; padding: 10px; border-radius: 8px; font-weight: bold; color: #1e293b; margin-top: 10px; border-left: 4px solid #10b981;">
                                🧑 Pria: #${eventData.pengirimNoUrut || '-'} ${eventData.pengirimNama}<br/>
                                👩 Wanita: #${eventData.penerimaNoUrut || '-'} ${eventData.penerimaNama}
                            </div>
                            <p style="margin-top: 10px; font-weight: 800; color: #ef4444; text-align: center;">Silakan panggil peserta ke area Ruang Tunggu!</p>
                        </div>
                    `,
                    icon: 'warning',
                    confirmButtonText: 'Saya Panggil',
                    confirmButtonColor: '#10b981'
                });
            }
        });

        channel.bind("room-changed", () => {
            fetchData();
        });

        return () => {
            channel.unbind("taaruf-changed");
            channel.unbind("room-changed");
            pusher.unsubscribe("taaruf-channel");
        };
    }, [fetchData]);

    const handleConfirmPresence = async (pemilihanId: string) => {
        try {
            Swal.fire({
                title: 'Memproses...',
                allowOutsideClick: false,
                didOpen: () => {
                    Swal.showLoading();
                }
            });

            const res = await fetch("/api/mandiri/pilih", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ pemilihanId, statusTunggu: "ada" })
            });

            if (res.ok) {
                Swal.fire("Berhasil", "Kehadiran peserta berhasil dikonfirmasi. Admin RR dapat melihat status hadir ini.", "success");
                fetchData();
            } else {
                const errData = await res.json();
                Swal.fire("Error", errData.error || "Gagal memperbarui status", "error");
            }
        } catch (err) {
            Swal.fire("Error", "Terjadi kesalahan jaringan", "error");
        }
    };

    const otwQueue = allQueue.filter((item: any) => item.statusTunggu === "dipanggil");
    const arrivedQueue = allQueue.filter((item: any) => item.statusTunggu === "ada");

    const filteredOtwQueue = otwQueue.filter((item: any) => {
        const search = queueSearch.toLowerCase();
        return (
            item.pengirimNama?.toLowerCase().includes(search) ||
            item.penerimaNama?.toLowerCase().includes(search) ||
            (item.pengirimNomorUrut || item.pengirimNo || '').toString().includes(search) ||
            (item.penerimaNomorUrut || item.penerimaNo || '').toString().includes(search)
        );
    });

    const filteredArrivedQueue = arrivedQueue.filter((item: any) => {
        const search = queueSearch.toLowerCase();
        return (
            item.pengirimNama?.toLowerCase().includes(search) ||
            item.penerimaNama?.toLowerCase().includes(search) ||
            (item.pengirimNomorUrut || item.pengirimNo || '').toString().includes(search) ||
            (item.penerimaNomorUrut || item.penerimaNo || '').toString().includes(search)
        );
    });

    return (
        <div className="operator-layout">
            <Topbar title="Panel Tim Jepret" role={userRole} />

            <main className="page-content">
                <header className="operator-header">
                    <div>
                        <h2>Panel Operasional Tim Jepret <Camera size={24} style={{ display: 'inline', verticalAlign: 'middle', marginLeft: '5px', color: '#f43f5e' }} /></h2>
                        <p>Kelola kedatangan peserta ke Ruang Tunggu Romantic Room secara real-time</p>
                    </div>
                    <div className="header-controls">
                        <div className="search-bar-box">
                            <Search size={16} />
                            <input
                                type="text"
                                placeholder="Cari nama atau nomor..."
                                value={queueSearch}
                                onChange={(e) => setQueueSearch(e.target.value)}
                            />
                        </div>
                        <button className="btn-refresh" onClick={fetchData} disabled={loading}>
                            <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh Data
                        </button>
                    </div>
                </header>

                <div className="stats-row-grid">
                    <div className="stat-card yellow-card">
                        <div className="stat-icon waiting-yellow"><Users size={24} /></div>
                        <div className="stat-info">
                            <span className="stat-val">{otwQueue.length}</span>
                            <span className="stat-label">Sedang OTW (Dipanggil)</span>
                        </div>
                    </div>
                    <div className="stat-card green-card">
                        <div className="stat-icon arrived-green"><Check size={24} /></div>
                        <div className="stat-info">
                            <span className="stat-val">{arrivedQueue.length} / 5</span>
                            <span className="stat-label">Hadir di Ruang Tunggu</span>
                        </div>
                    </div>
                </div>

                <div className="admin-grid-stacked">
                    {/* OTW / Called Card */}
                    <div className="admin-card border-yellow">
                        <div className="card-header-custom header-yellow">
                            <div className="header-title-flex">
                                <Users size={20} color="#b45309" />
                                <h3 style={{ color: '#78350f' }}>Sedang Menuju Ruang Tunggu (OTW)</h3>
                                <span className="count-badge-pill bg-yellow">{filteredOtwQueue.length} Pasang</span>
                            </div>
                        </div>

                        <div className="card-body">
                            {filteredOtwQueue.length === 0 ? (
                                <div className="empty-state">Tidak ada peserta yang sedang dipanggil / OTW</div>
                            ) : (
                                <div className="scroll-wrapper">
                                    <div className="horizontal-scroll">
                                        {filteredOtwQueue.map((item: any) => (
                                            <div key={item.id} className="queue-item-card border-left-yellow">
                                                <div className="pair-names-row">
                                                    {/* Caller */}
                                                    <div className="participant caller">
                                                        <span className="role-tag caller">Pemanggil</span>
                                                        <div className="name-box">
                                                            <span className="number-badge">{item.pengirimNomorUrut || item.pengirimNo || '-'}</span>
                                                            <span className="name-text">{item.pengirimNama}</span>
                                                        </div>
                                                        <div className="sub-info">
                                                            <MapPin size={8} /> <span>{item.pengirimKota || '-'} / {item.pengirimDesa || '-'}</span>
                                                        </div>
                                                    </div>

                                                    <div className="heart-divider-icon">
                                                        <Heart size={12} fill="#d97706" color="#d97706" />
                                                    </div>

                                                    {/* Called */}
                                                    <div className="participant called">
                                                        <span className="role-tag called-yellow">Dipanggil</span>
                                                        <div className="name-box reverse">
                                                            <span className="number-badge">{item.penerimaNomorUrut || item.penerimaNo || '-'}</span>
                                                            <span className="name-text">{item.penerimaNama}</span>
                                                        </div>
                                                        <div className="sub-info reverse">
                                                            <span>{item.penerimaKota || '-'} / {item.penerimaDesa || '-'}</span> <MapPin size={8} />
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="card-actions-row">
                                                    <button 
                                                        className="btn-action-green"
                                                        onClick={() => handleConfirmPresence(item.id)}
                                                    >
                                                        <Check size={12} /> Sudah Ada (Hadir)
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Present/Arrived Card */}
                    <div className="admin-card border-green">
                        <div className="card-header-custom header-green">
                            <div className="header-title-flex">
                                <Check size={20} color="#10b981" />
                                <h3 style={{ color: '#065f46' }}>Sudah Hadir di Ruang Tunggu</h3>
                                <span className="count-badge-pill bg-green">{filteredArrivedQueue.length} / 5 Pasang</span>
                            </div>
                        </div>

                        <div className="card-body">
                            {filteredArrivedQueue.length === 0 ? (
                                <div className="empty-state">Belum ada peserta yang dikonfirmasi hadir</div>
                            ) : (
                                <div className="scroll-wrapper">
                                    <div className="horizontal-scroll">
                                        {filteredArrivedQueue.map((item: any) => (
                                            <div key={item.id} className="queue-item-card border-left-green bg-green-light">
                                                <div className="pair-names-row">
                                                    {/* Caller */}
                                                    <div className="participant caller">
                                                        <span className="role-tag caller">Pemanggil</span>
                                                        <div className="name-box">
                                                            <span className="number-badge">{item.pengirimNomorUrut || item.pengirimNo || '-'}</span>
                                                            <span className="name-text">{item.pengirimNama}</span>
                                                        </div>
                                                        <div className="sub-info">
                                                            <MapPin size={8} /> <span>{item.pengirimKota || '-'} / {item.pengirimDesa || '-'}</span>
                                                        </div>
                                                    </div>

                                                    <div className="heart-divider-icon">
                                                        <Heart size={12} fill="#10b981" color="#10b981" />
                                                    </div>

                                                    {/* Called */}
                                                    <div className="participant called">
                                                        <span className="role-tag called-green">Dipanggil</span>
                                                        <div className="name-box reverse">
                                                            <span className="number-badge">{item.penerimaNomorUrut || item.penerimaNo || '-'}</span>
                                                            <span className="name-text">{item.penerimaNama}</span>
                                                        </div>
                                                        <div className="sub-info reverse">
                                                            <span>{item.penerimaKota || '-'} / {item.penerimaDesa || '-'}</span> <MapPin size={8} />
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="presence-banner">
                                                    <span className="dot-green-pulse" /> Sudah Hadir di Lokasi
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </main>

            <style jsx>{`
                .operator-layout {
                    min-height: 100vh;
                    background-color: #f8fafc;
                    width: 100%;
                    min-width: 0;
                    overflow-x: hidden;
                }
                .page-content {
                    padding: 24px;
                    max-width: 1400px;
                    margin: 0 auto;
                    width: 100%;
                    min-width: 0;
                    box-sizing: border-box;
                }
                .operator-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 24px;
                    flex-wrap: wrap;
                    gap: 15px;
                }
                .operator-header h2 {
                    font-size: 24px;
                    font-weight: 850;
                    color: #0f172a;
                    margin: 0 0 4px 0;
                }
                .operator-header p {
                    font-size: 13px;
                    color: #64748b;
                    margin: 0;
                }
                .btn-refresh {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    background: white;
                    border: 1px solid #cbd5e1;
                    padding: 8px 16px;
                    border-radius: 8px;
                    font-size: 12px;
                    font-weight: 700;
                    color: #334155;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .btn-refresh:hover {
                    background: #f1f5f9;
                    border-color: #94a3b8;
                }
                
                /* Stats Grid */
                .stats-row-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
                    gap: 16px;
                    margin-bottom: 24px;
                }
                .stat-card {
                    background: white;
                    border-radius: 14px;
                    border: 1px solid #e2e8f0;
                    padding: 16px 20px;
                    display: flex;
                    align-items: center;
                    gap: 15px;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.01);
                }
                .stat-card.yellow-card {
                    border-left: 4px solid #f59e0b;
                }
                .stat-card.green-card {
                    border-left: 4px solid #10b981;
                }
                .stat-icon {
                    width: 48px;
                    height: 48px;
                    border-radius: 10px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .stat-icon.waiting-yellow {
                    background: #fffbeb;
                    color: #d97706;
                }
                .stat-icon.arrived-green {
                    background: #ecfdf5;
                    color: #10b981;
                }
                .stat-info {
                    display: flex;
                    flex-direction: column;
                }
                .stat-val {
                    font-size: 22px;
                    font-weight: 850;
                    color: #1e293b;
                    line-height: 1.2;
                }
                .stat-label {
                    font-size: 11px;
                    font-weight: 700;
                    color: #64748b;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }

                /* Admin Grid Stacked */
                .admin-grid-stacked {
                    display: flex;
                    flex-direction: column;
                    gap: 24px;
                    width: 100%;
                    min-width: 0;
                    max-width: 100%;
                }
                .admin-card {
                    background: white;
                    border-radius: 16px;
                    border: 1px solid #e2e8f0;
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;
                    box-shadow: 0 4px 20px rgba(0,0,0,0.02);
                    width: 100%;
                    min-width: 0;
                    max-width: 100%;
                    box-sizing: border-box;
                }
                .admin-card.border-yellow {
                    border-left: 4px solid #f59e0b;
                }
                .admin-card.border-green {
                    border-left: 4px solid #10b981;
                }
                
                .card-header-custom {
                    padding: 16px 20px;
                    border-bottom: 1px solid #f1f5f9;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    flex-wrap: wrap;
                    gap: 15px;
                    background: #fff;
                }
                .card-header-custom.header-yellow {
                    background: linear-gradient(to right, #fffbeb, #ffffff);
                    border-radius: 16px 16px 0 0;
                }
                .card-header-custom.header-green {
                    background: linear-gradient(to right, #f0fdf4, #ffffff);
                    border-radius: 16px 16px 0 0;
                }
                .header-title-flex {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }
                .header-title-flex h3 {
                    font-size: 15px;
                    font-weight: 800;
                    margin: 0;
                    color: #1e293b;
                }
                .count-badge-pill {
                    background: #fef2f2;
                    color: #f43f5e;
                    padding: 3px 10px;
                    border-radius: 20px;
                    font-size: 11px;
                    font-weight: 800;
                }
                .count-badge-pill.bg-yellow {
                    background: #fef3c7;
                    color: #d97706;
                }
                .count-badge-pill.bg-green {
                    background: #10b981;
                    color: white;
                }

                .search-bar-box {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    background: #f8fafc;
                    border: 1px solid #e2e8f0;
                    padding: 6px 12px;
                    border-radius: 8px;
                    min-width: 260px;
                }
                .search-bar-box svg {
                    color: #94a3b8;
                }
                .search-bar-box input {
                    border: none;
                    background: transparent;
                    outline: none;
                    font-size: 12px;
                    font-weight: 600;
                    color: #1e293b;
                    width: 100%;
                }
                .search-bar-box input::placeholder {
                    color: #cbd5e1;
                }

                .card-body {
                    padding: 16px;
                    flex: 1 1 auto;
                    min-width: 0;
                    max-width: 100%;
                    display: flex;
                    flex-direction: column;
                }
                .empty-state {
                    text-align: center;
                    color: #94a3b8;
                    padding: 30px 20px;
                    font-style: italic;
                    font-size: 13px;
                }

                /* Scroll wrappers */
                .scroll-wrapper {
                    width: 100%;
                    overflow-x: auto;
                    overflow-y: hidden;
                }
                .scroll-wrapper::-webkit-scrollbar {
                    height: 6px;
                }
                .scroll-wrapper::-webkit-scrollbar-thumb {
                    background: #cbd5e1;
                    border-radius: 10px;
                }
                .scroll-wrapper::-webkit-scrollbar-track {
                    background: #f1f5f9;
                    border-radius: 10px;
                }

                .horizontal-scroll {
                    display: flex;
                    gap: 12px;
                    padding: 5px 4px 12px 4px;
                    width: max-content;
                    scroll-behavior: smooth;
                    box-sizing: border-box;
                }

                /* Queue Item Cards */
                .queue-item-card {
                    background: #fff;
                    border: 1px solid #f1f5f9;
                    padding: 12px;
                    border-radius: 12px;
                    width: 460px;
                    flex-shrink: 0;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.01);
                    box-sizing: border-box;
                }
                .queue-item-card.border-left-yellow {
                    border-left: 3px solid #f59e0b;
                    background: #fafafa;
                }
                .queue-item-card.border-left-green {
                    border-left: 3px solid #10b981;
                }
                .queue-item-card.bg-green-light {
                    background: #f0fdf4;
                }

                .pair-names-row {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    margin-bottom: 8px;
                }
                .participant {
                    flex: 1;
                    min-width: 0;
                    display: flex;
                    flex-direction: column;
                    gap: 2px;
                }
                .participant.called {
                    align-items: flex-end;
                    text-align: right;
                }
                .role-tag {
                    font-size: 7px;
                    font-weight: 800;
                    text-transform: uppercase;
                    padding: 1px 4px;
                    border-radius: 3px;
                    align-self: flex-start;
                }
                .role-tag.caller {
                    background: #e0f2fe;
                    color: #0369a1;
                }
                .role-tag.called {
                    background: #f1f5f9;
                    color: #64748b;
                    align-self: flex-end;
                }
                .role-tag.called-yellow {
                    background: #fffbeb;
                    color: #b45309;
                    align-self: flex-end;
                }
                .role-tag.called-green {
                    background: #fef3c7;
                    color: #b45309;
                    align-self: flex-end;
                }
                .name-box {
                    display: flex;
                    align-items: center;
                    gap: 4px;
                    margin-top: 2px;
                }
                .name-box.reverse {
                    flex-direction: row-reverse;
                }
                .number-badge {
                    background: #1e293b;
                    color: white;
                    padding: 1px 4px;
                    border-radius: 4px;
                    font-size: 9px;
                    font-weight: 800;
                    min-width: 22px;
                    text-align: center;
                }
                .name-text {
                    color: #1e293b;
                    font-size: 13px;
                    font-weight: 800;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }
                .sub-info {
                    font-size: 9px;
                    color: #64748b;
                    display: flex;
                    align-items: center;
                    gap: 2px;
                }
                .sub-info.reverse {
                    justify-content: flex-end;
                }
                .heart-divider-icon {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;
                }

                .presence-banner {
                    background: #e2fdf0;
                    color: #15803d;
                    border: 1px solid #bbf7d0;
                    padding: 4px 8px;
                    border-radius: 6px;
                    font-size: 10px;
                    font-weight: 700;
                    display: flex;
                    align-items: center;
                    gap: 5px;
                    justify-content: center;
                    margin: 4px 0 4px 0;
                }

                .dot-green-pulse {
                    width: 6px;
                    height: 6px;
                    background-color: #10b981;
                    border-radius: 50%;
                    display: inline-block;
                    box-shadow: 0 0 6px rgba(16, 185, 129, 0.6);
                    animation: pulse-green 1s infinite alternate;
                }
                @keyframes pulse-green {
                    0% { transform: scale(0.9); opacity: 0.7; }
                    100% { transform: scale(1.3); opacity: 1; }
                }

                .card-actions-row {
                    display: flex;
                    gap: 6px;
                    border-top: 1px solid #f1f5f9;
                    padding-top: 8px;
                    margin-top: 4px;
                }
                .btn-action-green {
                    flex: 1;
                    background: #10b981;
                    color: white;
                    border: none;
                    padding: 8px 12px;
                    border-radius: 6px;
                    font-weight: 700;
                    font-size: 11px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 4px;
                    transition: all 0.2s;
                    white-space: nowrap;
                    box-shadow: 0 2px 4px rgba(16, 185, 129, 0.2);
                }
                .btn-action-green:hover {
                    background: #059669;
                }
                
                .header-controls {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    flex-wrap: wrap;
                }

                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                .animate-spin {
                    animation: spin 1s linear infinite;
                }

                /* Mobile responsiveness styling */
                @media (max-width: 768px) {
                    .page-content {
                        padding: 12px;
                    }
                    .operator-header {
                        flex-direction: column;
                        align-items: stretch;
                        gap: 12px;
                    }
                    .operator-header div {
                        text-align: center;
                    }
                    .operator-header h2 {
                        font-size: 20px !important;
                    }
                    .operator-header p {
                        font-size: 11px !important;
                    }
                    .header-controls {
                        flex-direction: column;
                        align-items: stretch;
                        width: 100%;
                    }
                    .search-bar-box {
                        width: 100% !important;
                        min-width: 0 !important;
                        box-sizing: border-box;
                    }
                    .btn-refresh {
                        width: 100%;
                        justify-content: center;
                    }

                    .stats-row-grid {
                        grid-template-columns: 1fr;
                        gap: 12px;
                    }
                    .stat-card {
                        padding: 12px 16px;
                    }

                    .scroll-wrapper {
                        overflow-x: visible;
                    }
                    .horizontal-scroll {
                        flex-direction: column;
                        width: 100%;
                        gap: 16px;
                        padding: 0;
                    }
                    .queue-item-card {
                        width: 100% !important;
                        max-width: 100%;
                        box-sizing: border-box;
                    }

                    .pair-names-row {
                        flex-direction: column;
                        align-items: stretch;
                        gap: 8px;
                    }
                    .participant {
                        align-items: flex-start !important;
                        text-align: left !important;
                    }
                    .participant.called {
                        border-top: 1px dashed #e2e8f0;
                        padding-top: 8px;
                    }
                    .name-box.reverse {
                        flex-direction: row;
                    }
                    .sub-info.reverse {
                        justify-content: flex-start;
                    }
                    .role-tag.called, .role-tag.called-yellow, .role-tag.called-green {
                        align-self: flex-start !important;
                    }
                    .heart-divider-icon {
                        display: none;
                    }
                }
            `}</style>
        </div>
    );
}
