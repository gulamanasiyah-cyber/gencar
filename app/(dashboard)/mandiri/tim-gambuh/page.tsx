"use client";

import Topbar from "@/components/Topbar";
import { useState, useEffect, useCallback } from "react";
import Swal from "sweetalert2";
import { 
    Timer, LogOut, Search, Undo2, RefreshCw
} from "lucide-react";
import { getPusherClient } from "@/lib/pusher";

function RoomTimer({ startTime }: { startTime: string }) {
    const [timeLeft, setTimeLeft] = useState<string>("");
    const [isOver, setIsOver] = useState(false);

    useEffect(() => {
        const calculateTime = () => {
            if (!startTime) {
                setTimeLeft("Belum Dimulai");
                return;
            }

            const isoString = startTime.includes(' ')
                ? startTime.replace(' ', 'T') + 'Z'
                : startTime;

            const start = new Date(isoString).getTime();
            const now = new Date().getTime();

            const limit = 15 * 60 * 1000;
            const elapsed = now - start;
            const remaining = limit - elapsed;

            if (remaining <= 0) {
                setIsOver(true);
                setTimeLeft("Selesai");
            } else {
                setIsOver(false);
                const mins = Math.floor(remaining / 60000);
                const secs = Math.floor((remaining % 60000) / 1000);
                setTimeLeft(`${mins}:${secs.toString().padStart(2, '0')}`);
            }
        };

        calculateTime();
        const timer = setInterval(calculateTime, 1000);
        return () => clearInterval(timer);
    }, [startTime]);

    if (!startTime) {
        return (
            <div className="room-timer-badge not-started">
                <Timer size={12} />
                <span>Belum Dimulai</span>
            </div>
        );
    }

    return (
        <div className={`room-timer-badge ${isOver ? 'over' : ''}`}>
            <Timer size={12} />
            <span>{timeLeft}</span>
        </div>
    );
}

export default function TimGambuhOperatorPage() {
    const [allRooms, setAllRooms] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [userRole, setUserRole] = useState("");
    const [roomSearch, setRoomSearch] = useState("");
    const [myId, setMyId] = useState<string>("");
    const [myName, setMyName] = useState<string>("");

    const showSelectIdentityModal = useCallback(async (forced = false) => {
        // Show loading state immediately to block screen and show visual feedback
        Swal.fire({
            title: 'Memuat Data...',
            text: 'Mengambil daftar pendamping Tim Gambuh...',
            allowOutsideClick: !forced,
            allowEscapeKey: !forced,
            showConfirmButton: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });

        try {
            const res = await fetch("/api/admin/tim-gambuh");
            if (!res.ok) throw new Error("Gagal mengambil data");
            const data = await res.json();
            
            // Close the loading dialog
            Swal.close();

            if (!Array.isArray(data) || data.length === 0) {
                Swal.fire("Pemberitahuan", "Belum ada data anggota Tim Gambuh aktif di kegiatan ini. Silakan hubungi Admin untuk menambahkan anggota Tim Gambuh.", "warning");
                return;
            }

            const options = data.reduce((acc: any, item: any) => {
                acc[item.id] = `${item.nama} (${item.tipe})`;
                return acc;
            }, {});

            const currentSavedId = localStorage.getItem("my_tim_gambuh_id") || "";

            const { value: selectedId } = await Swal.fire({
                title: 'Pilih Identitas Anda',
                text: 'Silakan pilih nama Anda dari daftar pendamping Tim Gambuh:',
                input: 'select',
                inputOptions: options,
                inputValue: currentSavedId,
                inputPlaceholder: '-- Pilih Anggota --',
                showCancelButton: !forced,
                allowOutsideClick: !forced,
                allowEscapeKey: !forced,
                confirmButtonText: 'Simpan',
                cancelButtonText: 'Batal',
                inputValidator: (value) => {
                    if (!value) {
                        return 'Anda harus memilih identitas Anda!';
                    }
                    return null;
                }
            });

            if (selectedId) {
                const selectedItem = data.find((d: any) => d.id === selectedId);
                if (selectedItem) {
                    localStorage.setItem("my_tim_gambuh_id", selectedItem.id);
                    localStorage.setItem("my_tim_gambuh_nama", selectedItem.nama);
                    setMyId(selectedItem.id);
                    setMyName(selectedItem.nama);
                    Swal.fire({
                        icon: 'success',
                        title: 'Identitas Disimpan',
                        text: `Anda sekarang bertindak sebagai: ${selectedItem.nama}`,
                        timer: 2000,
                        showConfirmButton: false
                    });
                }
            }
        } catch (err) {
            Swal.fire("Error", "Gagal mengambil daftar anggota Tim Gambuh.", "error");
        }
    }, []);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const roomsRes = await fetch("/api/mandiri/rooms");
            if (roomsRes.ok) {
                const roomsJson = await roomsRes.json();
                const sortedRooms = Array.isArray(roomsJson)
                    ? [...roomsJson].sort((a, b) => a.nama.localeCompare(b.nama, undefined, { numeric: true, sensitivity: 'base' }))
                    : [];
                setAllRooms(sortedRooms);
            }
        } catch (err) {
            console.error("Error fetching rooms:", err);
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

        // Initialize identity from localStorage
        const savedId = localStorage.getItem("my_tim_gambuh_id") || "";
        const savedNama = localStorage.getItem("my_tim_gambuh_nama") || "";
        if (savedId) {
            setMyId(savedId);
            setMyName(savedNama);
        } else {
            showSelectIdentityModal(true);
        }

        // Realtime updates using Pusher
        const pusher = getPusherClient();
        if (!pusher) return;

        const channel = pusher.subscribe("taaruf-channel");
        
        channel.bind("taaruf-changed", () => {
            fetchData();
        });
        
        channel.bind("room-changed", (eventData: any) => {
            fetchData();
            if (eventData && eventData.action === "assign") {
                const { roomNama, timGambuhNama, pengirimNama, pengirimNoUrut, penerimaNama, penerimaNoUrut } = eventData;
                const currentName = localStorage.getItem("my_tim_gambuh_nama") || "";
                const isMyAssignment = timGambuhNama === currentName;

                Swal.fire({
                    title: isMyAssignment ? 'Tugas Pendampingan Baru!' : 'Sesi Pertemuan Baru!',
                    html: `
                        <div style="text-align: left; font-size: 13px; line-height: 1.6;">
                            <p style="margin-bottom: 8px;"><strong>Ruangan:</strong> ${roomNama}</p>
                            <p style="margin-bottom: 6px;"><strong>Peserta:</strong></p>
                            <ul style="margin-bottom: 8px; padding-left: 20px;">
                                <li>Pria: No. ${pengirimNoUrut || '-'} - ${pengirimNama}</li>
                                <li>Wanita: No. ${penerimaNoUrut || '-'} - ${penerimaNama}</li>
                            </ul>
                            <p style="margin-top: 10px;"><strong>Pendamping:</strong> <span style="color: ${isMyAssignment ? '#ec4899' : 'inherit'}; font-weight: bold;">${timGambuhNama} ${isMyAssignment ? '(Anda)' : ''}</span></p>
                        </div>
                    `,
                    icon: isMyAssignment ? 'success' : 'info',
                    toast: true,
                    position: 'top-end',
                    showConfirmButton: true,
                    confirmButtonText: 'Tutup',
                    timer: 15000,
                    timerProgressBar: true
                });
            }
        });

        return () => {
            channel.unbind("taaruf-changed");
            channel.unbind("room-changed");
            pusher.unsubscribe("taaruf-channel");
        };
    }, [fetchData, showSelectIdentityModal]);

    const handleStartRoom = async (id: string) => {
        try {
            const res = await fetch(`/api/mandiri/rooms/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "start", operatorCompanionId: myId })
            });
            if (res.ok) {
                fetchData();
            } else {
                const errData = await res.json();
                Swal.fire("Error", errData.error || "Gagal memulai timer", "error");
            }
        } catch (err) {
            Swal.fire("Error", "Gagal memproses permintaan", "error");
        }
    };

    const handleClearRoom = async (id: string) => {
        const room = allRooms.find(r => r.id === id);
        if (!room) return;

        const { value: formValues } = await Swal.fire({
            title: 'Selesaikan Sesi Taaruf?',
            html: `
                <div style="text-align: left; margin-bottom: 20px;">
                    <p style="font-size: 14px; margin-bottom: 15px; color: #64748b;">Tentukan hasil pertemuan untuk kedua belah pihak:</p>
                    
                    <div style="margin-bottom: 20px;">
                        <label style="display: block; font-weight: 700; font-size: 12px; color: #475569; margin-bottom: 8px;">Hasil Pengirim (${room.pengirimNama || 'Pria'}):</label>
                        <select id="swal-hasil-pengirim" class="swal2-select" style="width: 100%; margin: 0; padding: 8px; border-radius: 8px; border: 1px solid #cbd5e1; font-size: 14px;">
                            <option value="Lanjut">Lanjut</option>
                            <option value="Tidak Lanjut">Tidak Lanjut</option>
                            <option value="Batal">Batal</option>
                        </select>
                    </div>

                    <div>
                        <label style="display: block; font-weight: 700; font-size: 12px; color: #475569; margin-bottom: 8px;">Hasil Penerima (${room.penerimaNama || 'Wanita'}):</label>
                        <select id="swal-hasil-penerima" class="swal2-select" style="width: 100%; margin: 0; padding: 8px; border-radius: 8px; border: 1px solid #cbd5e1; font-size: 14px;">
                            <option value="Lanjut">Lanjut</option>
                            <option value="Tidak Lanjut">Tidak Lanjut</option>
                            <option value="Batal">Batal</option>
                        </select>
                    </div>
                </div>
            `,
            focusConfirm: false,
            showCancelButton: true,
            confirmButtonText: 'Simpan & Selesaikan',
            cancelButtonText: 'Batal',
            preConfirm: () => {
                return {
                    hasilPengirim: (document.getElementById('swal-hasil-pengirim') as HTMLSelectElement).value,
                    hasilPenerima: (document.getElementById('swal-hasil-penerima') as HTMLSelectElement).value
                }
            }
        });

        if (formValues) {
            try {
                const res = await fetch(`/api/mandiri/rooms/${id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        action: "clear",
                        hasilPengirim: formValues.hasilPengirim,
                        hasilPenerima: formValues.hasilPenerima,
                        operatorCompanionId: myId
                    })
                });
                if (res.ok) {
                    Swal.fire("Berhasil", "Sesi taaruf telah diselesaikan dan hasil disimpan.", "success");
                    fetchData();
                } else {
                    const errData = await res.json();
                    Swal.fire("Error", errData.error || "Gagal menyelesaikan sesi", "error");
                }
            } catch (err) {
                Swal.fire("Error", "Gagal menyelesaikan sesi", "error");
            }
        }
    };

    const handleUndoRoom = async (id: string) => {
        const result = await Swal.fire({
            title: 'Kembalikan ke Antrean?',
            text: "Pasangan akan dikeluarkan dari ruangan dan dikembalikan ke antrean utama.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#64748b',
            confirmButtonText: 'Ya, Kembalikan'
        });

        if (result.isConfirmed) {
            try {
                const res = await fetch(`/api/mandiri/rooms/${id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ action: "undo" })
                });
                if (res.ok) {
                    Swal.fire("Berhasil", "Pasangan dikembalikan ke antrean.", "success");
                    fetchData();
                } else {
                    const errData = await res.json();
                    Swal.fire("Error", errData.error || "Gagal mengembalikan pasangan", "error");
                }
            } catch (err) {
                Swal.fire("Error", "Gagal memproses antrean", "error");
            }
        }
    };

    // Filter Rooms based on search & Sort so that rooms assigned to me come first
    const filteredRooms = allRooms.filter(room => {
        const query = roomSearch.toLowerCase();
        return (
            room.nama.toLowerCase().includes(query) ||
            room.pengirimNama?.toLowerCase().includes(query) ||
            room.penerimaNama?.toLowerCase().includes(query) ||
            room.pengirimNo?.toLowerCase().includes(query) ||
            room.penerimaNo?.toLowerCase().includes(query)
        );
    }).sort((a, b) => {
        const aIsMine = a.timGambuhId === myId;
        const bIsMine = b.timGambuhId === myId;
        
        if (aIsMine && !bIsMine) return -1;
        if (!aIsMine && bIsMine) return 1;
        
        return a.nama.localeCompare(b.nama, undefined, { numeric: true, sensitivity: 'base' });
    });

    return (
        <div className="operator-layout">
            <Topbar title="Operator Tim Gambuh" role={userRole} />
            <div className="page-content">
                
                <div className="operator-header">
                    <div>
                        <h2>Panel Pendamping Tim Gambuh</h2>
                        <p>Kelola sesi taaruf di dalam ruangan: Mulai timer, dampingi, dan simpan hasil pertemuan.</p>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        {myName && (
                            <span className="identity-badge">
                                Sebagai: <strong>{myName}</strong>
                            </span>
                        )}
                        <button className="btn-identity" onClick={() => showSelectIdentityModal(false)} title="Ubah Identitas">
                            Ubah Identitas
                        </button>
                        <button className="btn-refresh" onClick={fetchData} title="Refresh Data">
                            <RefreshCw size={16} /> Refresh
                        </button>
                    </div>
                </div>

                <div className="search-bar-container" style={{ marginBottom: '20px' }}>
                    <Search size={16} />
                    <input
                        type="text"
                        placeholder="Cari nama peserta, nomor urut, atau ruangan..."
                        value={roomSearch}
                        onChange={(e) => setRoomSearch(e.target.value)}
                    />
                </div>

                <div className="card shadow-sm">
                    <div className="card-header-inner">
                        <h3>Daftar Ruangan Taaruf</h3>
                        <span className="badge-total">
                            {allRooms.filter(r => r.status === 'Terisi').length} Aktif / {allRooms.length} Total
                        </span>
                    </div>

                    <div className="grid-rooms">
                        {filteredRooms.length === 0 ? (
                            <div className="empty-state">Tidak ada ruangan ditemukan</div>
                        ) : (
                            filteredRooms.map((room) => (
                                <div key={room.id} className={`room-tile ${room.status?.toLowerCase()} ${room.status === "Terisi" && !room.startedAt ? "not-started" : ""} ${room.timGambuhId === myId ? "my-assigned-room" : ""}`}>
                                    <div className="room-top">
                                        <span className="room-name">{room.nama}</span>
                                        {room.timGambuhId === myId && (
                                            <span className="my-task-badge">Tugas Anda</span>
                                        )}
                                        {room.status === "Terisi" && room.startedAt && (
                                            <RoomTimer startTime={room.startedAt} />
                                        )}
                                    </div>
                                    <div className="room-middle">
                                        {room.status === "Terisi" ? (
                                            <div className="occupied-info">
                                                <div className="occupied-pair">
                                                    <div className="pair-member">
                                                        <span className="room-p-number">{room.pengirimNomorUrut || room.pengirimNo || '-'}</span>
                                                        <span className="room-p-name">{room.pengirimNama}</span>
                                                    </div>
                                                    <span className="pair-separator">&</span>
                                                    <div className="pair-member">
                                                        <span className="room-p-number">{room.penerimaNomorUrut || room.penerimaNo || '-'}</span>
                                                        <span className="room-p-name">{room.penerimaNama}</span>
                                                    </div>
                                                </div>
                                                
                                                {room.timGambuhNama && (
                                                    <div className="room-companion-badge">
                                                        Pendamping: {room.timGambuhNama}
                                                    </div>
                                                )}

                                                <div className="action-row">
                                                    {room.timGambuhId === myId ? (
                                                        room.startedAt ? (
                                                            <button className="btn-clear" onClick={() => handleClearRoom(room.id)}>
                                                                <LogOut size={12} /> Selesaikan Sesi
                                                            </button>
                                                        ) : (
                                                            <button className="btn-start-timer" onClick={() => handleStartRoom(room.id)}>
                                                                <Timer size={12} fill="white" /> Mulai Sesi
                                                            </button>
                                                        )
                                                    ) : (
                                                        <div className="non-assigned-companion" style={{
                                                            fontSize: '11px',
                                                            color: '#94a3b8',
                                                            textAlign: 'center',
                                                            width: '100%',
                                                            padding: '6px',
                                                            background: '#f8fafc',
                                                            borderRadius: '6px',
                                                            border: '1px solid #cbd5e1'
                                                        }}>
                                                            Bukan Pendampingan Anda
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ) : (
                                            <span className="empty-label">Kosong</span>
                                        )}
                                    </div>
                                    <div className="room-footer">
                                        <span className={`status-dot ${room.status?.toLowerCase()}`}></span>
                                        {room.status}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

            </div>

            <style jsx>{`
                .operator-layout {
                    min-height: 100vh;
                    background-color: #f8fafc;
                }
                .page-content {
                    padding: 24px;
                    max-width: 1200px;
                    margin: 0 auto;
                }
                .operator-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 24px;
                }
                .operator-header h2 {
                    font-size: 22px;
                    font-weight: 800;
                    color: #0f172a;
                    margin-bottom: 4px;
                }
                .operator-header p {
                    font-size: 13px;
                    color: #64748b;
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
                .search-bar-container {
                    position: relative;
                    width: 100%;
                }
                .search-bar-container :global(svg) {
                    position: absolute;
                    left: 12px;
                    top: 50%;
                    transform: translateY(-50%);
                    color: #94a3b8;
                }
                .search-bar-container input {
                    width: 100%;
                    padding: 10px 10px 10px 40px;
                    border: 1px solid #cbd5e1;
                    border-radius: 8px;
                    font-size: 13px;
                    outline: none;
                    background: white;
                    transition: border-color 0.2s;
                }
                .search-bar-container input:focus {
                    border-color: #3b82f6;
                }
                .card {
                    background: white;
                    border-radius: 12px;
                    border: 1px solid #e2e8f0;
                    padding: 20px;
                }
                .card-header-inner {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    border-bottom: 1px solid #f1f5f9;
                    padding-bottom: 12px;
                    margin-bottom: 16px;
                }
                .card-header-inner h3 {
                    font-size: 16px;
                    font-weight: 800;
                    color: #0f172a;
                }
                .badge-total {
                    background: #eff6ff;
                    color: #1d4ed8;
                    font-size: 11px;
                    font-weight: 700;
                    padding: 4px 10px;
                    border-radius: 20px;
                }
                .grid-rooms {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
                    gap: 16px;
                }
                .room-tile {
                    border-radius: 12px;
                    border: 1px solid #e2e8f0;
                    padding: 12px;
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                    transition: all 0.3s;
                    background: white;
                }
                .room-tile.terisi {
                    background: #f0fdf4;
                    border-color: #bbf7d0;
                    box-shadow: 0 4px 12px rgba(34, 197, 94, 0.05);
                }
                .room-tile.terisi.not-started {
                    background: #fffbeb;
                    border-color: #fde68a;
                    box-shadow: 0 4px 12px rgba(245, 158, 11, 0.04);
                }
                .room-tile.kosong {
                    background: #fff1f2;
                    border-color: #fecdd3;
                    opacity: 0.8;
                }
                .room-tile:hover {
                    transform: scale(1.02);
                }
                .room-top {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                .room-name {
                    font-weight: 800;
                    font-size: 13px;
                    color: #1e293b;
                }
                .room-middle {
                    min-height: 70px;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    text-align: center;
                    gap: 8px;
                    width: 100%;
                }
                .empty-label {
                    color: #ef4444;
                    font-weight: 900;
                    font-size: 10px;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                }
                .occupied-info {
                    width: 100%;
                }
                .occupied-pair {
                    display: flex;
                    flex-direction: column;
                    gap: 4px;
                    width: 100%;
                    background: rgba(255, 255, 255, 0.5);
                    padding: 8px;
                    border-radius: 6px;
                }
                .pair-member {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    justify-content: center;
                    min-width: 0;
                }
                .room-p-number {
                    background: #166534;
                    color: white;
                    padding: 1px 4px;
                    border-radius: 4px;
                    font-size: 9px;
                    font-weight: 800;
                    flex-shrink: 0;
                }
                .room-tile.not-started .room-p-number {
                    background: #9a3412;
                }
                .room-p-name {
                    font-size: 11px;
                    font-weight: 700;
                    color: #166534;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }
                .room-tile.not-started .room-p-name {
                    color: #9a3412;
                }
                .pair-separator {
                    font-size: 10px;
                    color: #166534;
                    opacity: 0.4;
                    font-weight: 800;
                }
                .room-tile.not-started .pair-separator {
                    color: #9a3412;
                }
                .room-companion-badge {
                    font-size: 11px;
                    color: #475569;
                    background-color: #f1f5f9;
                    padding: 4px 8px;
                    border-radius: 4px;
                    margin-top: 6px;
                    text-align: center;
                    font-weight: 600;
                    width: 100%;
                    border: 1px solid #e2e8f0;
                }
                .action-row {
                    display: flex;
                    gap: 4px;
                    width: 100%;
                    margin-top: 8px;
                }
                .btn-clear {
                    background: #166534;
                    color: white;
                    border: none;
                    border-radius: 6px;
                    padding: 6px 8px;
                    font-size: 10px;
                    font-weight: 800;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 4px;
                    flex: 1;
                    transition: all 0.2s;
                }
                .btn-clear:hover {
                    background: #14532d;
                }
                .btn-start-timer {
                    background: #d97706;
                    color: white;
                    border: none;
                    border-radius: 6px;
                    padding: 6px 8px;
                    font-size: 10px;
                    font-weight: 800;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 4px;
                    flex: 1;
                    transition: all 0.2s;
                }
                .btn-start-timer:hover {
                    background: #b45309;
                }
                .btn-undo-room {
                    background: #64748b;
                    color: white;
                    border: none;
                    border-radius: 6px;
                    padding: 6px 8px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.2s;
                }
                .btn-undo-room:hover {
                    background: #475569;
                }
                .room-footer {
                    border-top: 1px solid rgba(0,0,0,0.05);
                    padding-top: 8px;
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    font-size: 9px;
                    font-weight: 800;
                    text-transform: uppercase;
                    color: #64748b;
                }
                .status-dot {
                    width: 6px;
                    height: 6px;
                    border-radius: 50%;
                }
                .status-dot.kosong {
                    background: #f43f5e;
                    box-shadow: 0 0 8px rgba(244, 63, 94, 0.4);
                }
                .status-dot.terisi {
                    background: #22c55e;
                    box-shadow: 0 0 8px rgba(34, 197, 94, 0.4);
                }
                .room-timer-badge {
                    display: flex;
                    align-items: center;
                    gap: 4px;
                    background: #ef4444;
                    color: white;
                    padding: 2px 6px;
                    border-radius: 4px;
                    font-size: 10px;
                    font-weight: 700;
                }
                .room-timer-badge.not-started {
                    background: #f59e0b;
                }
                .room-timer-badge.over {
                    background: #ef4444;
                    animation: pulse 1s infinite;
                }
                @keyframes pulse {
                    0% { opacity: 0.6; }
                    50% { opacity: 1; }
                    100% { opacity: 0.6; }
                }
                .empty-state {
                    grid-column: 1 / -1;
                    padding: 40px;
                    text-align: center;
                    color: #94a3b8;
                    font-size: 14px;
                    border: 2px dashed #cbd5e1;
                    border-radius: 8px;
                }
                .btn-identity {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    background: linear-gradient(135deg, #ec4899, #db2777);
                    border: none;
                    padding: 8px 16px;
                    border-radius: 8px;
                    font-size: 12px;
                    font-weight: 700;
                    color: white;
                    cursor: pointer;
                    transition: all 0.2s;
                    box-shadow: 0 4px 10px rgba(236, 72, 153, 0.2);
                }
                .btn-identity:hover {
                    background: linear-gradient(135deg, #db2777, #be185d);
                    transform: translateY(-1px);
                    box-shadow: 0 6px 14px rgba(236, 72, 153, 0.3);
                }
                .identity-badge {
                    font-size: 12px;
                    color: #475569;
                    background: #f1f5f9;
                    padding: 6px 12px;
                    border-radius: 8px;
                    border: 1px solid #e2e8f0;
                }
                .room-tile.my-assigned-room {
                    border-color: #ec4899;
                    box-shadow: 0 0 12px rgba(236, 72, 153, 0.15), inset 0 0 6px rgba(236, 72, 153, 0.05);
                    animation: subtle-pulse 2s infinite alternate;
                }
                .my-task-badge {
                    background: linear-gradient(135deg, #ec4899, #db2777);
                    color: white;
                    font-size: 9px;
                    font-weight: 800;
                    padding: 2px 6px;
                    border-radius: 4px;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                    box-shadow: 0 2px 4px rgba(236, 72, 153, 0.3);
                }
                @keyframes subtle-pulse {
                    from {
                        box-shadow: 0 0 8px rgba(236, 72, 153, 0.15);
                        border-color: #ec4899;
                    }
                    to {
                        box-shadow: 0 0 14px rgba(236, 72, 153, 0.3);
                        border-color: #db2777;
                    }
                }
                @media (max-width: 768px) {
                    .page-content {
                        padding: 12px;
                    }
                    .operator-header {
                        flex-direction: column;
                        align-items: stretch;
                        gap: 12px;
                        margin-bottom: 16px;
                    }
                    .operator-header h2 {
                        font-size: 20px;
                    }
                    .operator-header p {
                        font-size: 12px;
                        margin-bottom: 8px;
                    }
                    .operator-header > div:last-child {
                        flex-direction: column;
                        align-items: stretch !important;
                        gap: 8px !important;
                        width: 100%;
                    }
                    .identity-badge {
                        text-align: center;
                        font-size: 12px;
                        padding: 8px;
                        width: 100%;
                    }
                    .btn-identity, .btn-refresh {
                        width: 100%;
                        justify-content: center;
                        padding: 10px;
                        font-size: 13px;
                    }
                    .card {
                        padding: 12px;
                    }
                    .grid-rooms {
                        gap: 12px;
                    }
                }
            `}</style>
        </div>
    );
}
