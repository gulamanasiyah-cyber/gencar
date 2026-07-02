"use client";

import Topbar from "@/components/Topbar";
import { useState, useEffect, useCallback } from "react";
import Swal from "sweetalert2";
import { 
    Timer, LogOut, Search, Undo2, RefreshCw, BookOpen
} from "lucide-react";
import { getPusherClient } from "@/lib/pusher-client";
import Link from "next/link";

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

export default function TimPenungguOperatorPage() {
    const [allRooms, setAllRooms] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [userRole, setUserRole] = useState("");
    const [roomSearch, setRoomSearch] = useState("");
    const [myId, setMyId] = useState<string>("");
    const [myName, setMyName] = useState<string>("");
    const [selectedRoom, setSelectedRoom] = useState<any>(null);

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
            const res = await fetch("/api/admin/tim-penunggu");
            if (!res.ok) throw new Error("Gagal mengambil data");
            const data = await res.json();
            
            // Close the loading dialog
            Swal.close();

            if (!Array.isArray(data) || data.length === 0) {
                Swal.fire("Pemberitahuan", "Belum ada data anggota Tim Penunggu aktif di kegiatan ini. Silakan hubungi Admin untuk menambahkan anggota Tim Penunggu.", "warning");
                return;
            }

            const options = data.reduce((acc: any, item: any) => {
                acc[item.id] = `${item.nama} (${item.tipe})`;
                return acc;
            }, {});

            const currentSavedId = localStorage.getItem("my_tim_penunggu_id") || "";

            const { value: selectedId } = await Swal.fire({
                title: 'Pilih Identitas Anda',
                text: 'Silakan pilih nama Anda dari daftar pendamping Tim Penunggu:',
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
                    localStorage.setItem("my_tim_penunggu_id", selectedItem.id);
                    localStorage.setItem("my_tim_penunggu_nama", selectedItem.nama);
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
            Swal.fire("Error", "Gagal mengambil daftar anggota Tim Penunggu.", "error");
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
        const savedId = localStorage.getItem("my_tim_penunggu_id") || "";
        const savedNama = localStorage.getItem("my_tim_penunggu_nama") || "";
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
                const { roomNama, pengirimNama, pengirimNoUrut, penerimaNama, penerimaNoUrut, assignedCallerNama, assignedCallerId, assignedGuardNama, assignedGuardId } = eventData;
                const savedId = localStorage.getItem("my_tim_penunggu_id") || "";
                const isMyAssignment = assignedCallerId === savedId || assignedGuardId === savedId;

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
                            <div style="margin-top: 10px; padding-top: 8px; border-top: 1px dashed #e2e8f0; display: flex; flexDirection: column; gap: 4px;">
                                <p style="margin: 0;"><strong>Pemanggil:</strong> <span style="color: ${assignedCallerId === savedId ? '#3b82f6' : 'inherit'}; font-weight: bold;">${assignedCallerNama || 'Belum ditentukan'} ${assignedCallerId === savedId ? '(Anda)' : ''}</span></p>
                                <p style="margin: 0;"><strong>Penunggu:</strong> <span style="color: ${assignedGuardId === savedId ? '#10b981' : 'inherit'}; font-weight: bold;">${assignedGuardNama || 'Belum ditentukan'} ${assignedGuardId === savedId ? '(Anda)' : ''}</span></p>
                            </div>
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
        const aIsMine = a.assignedCallerId === myId || a.assignedGuardId === myId;
        const bIsMine = b.assignedCallerId === myId || b.assignedGuardId === myId;
        
        if (aIsMine && !bIsMine) return -1;
        if (!aIsMine && bIsMine) return 1;
        
        return a.nama.localeCompare(b.nama, undefined, { numeric: true, sensitivity: 'base' });
    });

    return (
        <div className="operator-layout">
            <Topbar title="Operator Tim Penunggu" role={userRole} />
            <div className="page-content">
                
                <div className="operator-header">
                    <div>
                        <h2>Panel Pendamping Tim Penunggu</h2>
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
                        <Link href="/admin/katalog" className="btn-refresh" title="Katalog Peserta" style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            background: '#e0f2fe',
                            color: '#0369a1',
                            border: '1px solid #bae6fd',
                            padding: '8px 16px',
                            borderRadius: '8px',
                            fontSize: '13px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            textDecoration: 'none',
                            transition: 'all 0.2s'
                        }}>
                            <BookOpen size={16} /> Katalog Peserta
                        </Link>
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
                                <div key={room.id} className={`room-tile ${room.status?.toLowerCase()} ${room.status === "Terisi" && !room.startedAt ? "not-started" : ""} ${room.assignedGuardId === myId || room.assignedCallerId === myId ? "my-assigned-room" : ""}`} onClick={() => setSelectedRoom(room)} style={{ cursor: "pointer" }}>
                                    <div className="room-top">
                                        <span className="room-name">{room.nama}</span>
                                        {(room.assignedGuardId === myId || room.assignedCallerId === myId) && (
                                            <span className="my-task-badge" style={{ backgroundColor: room.assignedGuardId === myId ? '#10b981' : '#3b82f6', color: 'white', fontSize: '9px', fontWeight: 800, padding: '2px 6px', borderRadius: '4px' }}>
                                                {room.assignedGuardId === myId ? 'Penunggu' : 'Pemanggil'}
                                            </span>
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
                                                
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', marginTop: '6px', fontSize: '10px', width: '100%', padding: '4px 0', borderTop: '1px dashed #f1f5f9' }}>
                                                    {room.assignedCallerNama && (
                                                        <div style={{ color: '#2563eb', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                            📢 <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>Pemanggil: {room.assignedCallerNama} {room.assignedCallerId === myId ? '(Anda)' : ''}</span>
                                                        </div>
                                                    )}
                                                    {room.assignedGuardNama && (
                                                        <div style={{ color: '#059669', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                            🚪 <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>Penunggu: {room.assignedGuardNama} {room.assignedGuardId === myId ? '(Anda)' : ''}</span>
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="action-row">
                                                    {room.assignedGuardId === myId ? (
                                                        room.startedAt ? (
                                                            <button 
                                                                className="btn-clear" 
                                                                onClick={(e) => { e.stopPropagation(); handleClearRoom(room.id); }}
                                                            >
                                                                <LogOut size={12} /> Selesaikan Sesi
                                                            </button>
                                                        ) : (
                                                            <button 
                                                                className="btn-start-timer" 
                                                                onClick={(e) => { e.stopPropagation(); handleStartRoom(room.id); }}
                                                            >
                                                                <Timer size={12} fill="white" /> Mulai Sesi
                                                            </button>
                                                        )
                                                    ) : room.assignedCallerId === myId ? (
                                                        <div className="non-assigned-companion" style={{
                                                            fontSize: '11px',
                                                            color: '#2563eb',
                                                            textAlign: 'center',
                                                            width: '100%',
                                                            padding: '6px',
                                                            background: '#eff6ff',
                                                            borderRadius: '6px',
                                                            border: '1px solid #bfdbfe',
                                                            fontWeight: '600'
                                                        }}>
                                                            Tugas Anda: Pemanggil
                                                        </div>
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
                                                            Bukan Ruangan Anda
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

            {selectedRoom && (
                <div style={{
                    position: "fixed", inset: 0, zIndex: 9999,
                    background: "rgba(15,23,42,0.55)", backdropFilter: "blur(4px)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    padding: "16px"
                }} onClick={() => setSelectedRoom(null)}>
                    <div style={{
                        background: "white", borderRadius: "16px", padding: "24px",
                        width: "100%", maxWidth: "420px", boxShadow: "0 24px 60px rgba(0,0,0,0.25)",
                        position: "relative", maxHeight: "90vh", overflowY: "auto"
                    }} onClick={e => e.stopPropagation()}>
                        {/* Close button */}
                        <button onClick={() => setSelectedRoom(null)} style={{
                            position: "absolute", top: "14px", right: "14px",
                            background: "#f1f5f9", border: "none", borderRadius: "8px",
                            width: "30px", height: "30px", cursor: "pointer",
                            fontSize: "16px", fontWeight: 800, color: "#475569",
                            display: "flex", alignItems: "center", justifyContent: "center"
                        }}>×</button>

                        {/* Room header */}
                        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "18px" }}>
                            <div style={{
                                background: selectedRoom.status === "Terisi" ? "linear-gradient(135deg,#10b981,#059669)" : "linear-gradient(135deg,#94a3b8,#64748b)",
                                borderRadius: "10px", width: "44px", height: "44px",
                                display: "flex", alignItems: "center", justifyContent: "center",
                                fontSize: "20px", flexShrink: 0
                            }}>🚪</div>
                            <div>
                                <div style={{ fontSize: "18px", fontWeight: 800, color: "#0f172a" }}>{selectedRoom.nama}</div>
                                <div style={{ fontSize: "12px", color: selectedRoom.status === "Terisi" ? "#10b981" : "#94a3b8", fontWeight: 700 }}>
                                    ● {selectedRoom.status || "Kosong"}
                                </div>
                            </div>
                            {selectedRoom.status === "Terisi" && selectedRoom.startedAt && (
                                <div style={{ marginLeft: "auto" }}>
                                    <RoomTimer startTime={selectedRoom.startedAt} />
                                </div>
                            )}
                        </div>

                        {selectedRoom.status === "Terisi" ? (
                            <>
                                {/* Participants */}
                                <div style={{ background: "#f8fafc", borderRadius: "10px", padding: "14px", marginBottom: "14px", border: "1px solid #e2e8f0" }}>
                                    <div style={{ fontSize: "10px", fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "10px" }}>Peserta</div>
                                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                        <div style={{ flex: 1, textAlign: "center" }}>
                                            <div style={{ fontSize: "22px", fontWeight: 900, color: "#3b82f6" }}>{selectedRoom.pengirimNomorUrut || selectedRoom.pengirimNo || "-"}</div>
                                            <div style={{ fontSize: "12px", fontWeight: 700, color: "#1e40af", marginTop: "2px" }}>{selectedRoom.pengirimNama}</div>
                                            <div style={{ fontSize: "10px", color: "#94a3b8", marginTop: "2px" }}>Pria</div>
                                        </div>
                                        <div style={{ fontSize: "20px", color: "#e2e8f0", fontWeight: 900 }}>&amp;</div>
                                        <div style={{ flex: 1, textAlign: "center" }}>
                                            <div style={{ fontSize: "22px", fontWeight: 900, color: "#ec4899" }}>{selectedRoom.penerimaNomorUrut || selectedRoom.penerimaNo || "-"}</div>
                                            <div style={{ fontSize: "12px", fontWeight: 700, color: "#be185d", marginTop: "2px" }}>{selectedRoom.penerimaNama}</div>
                                            <div style={{ fontSize: "10px", color: "#94a3b8", marginTop: "2px" }}>Wanita</div>
                                        </div>
                                    </div>
                                </div>

                                {/* Companions */}
                                {(selectedRoom.assignedCallerNama || selectedRoom.assignedGuardNama) && (
                                    <div style={{ background: "#f0fdf4", borderRadius: "10px", padding: "14px", marginBottom: "14px", border: "1px solid #bbf7d0" }}>
                                        <div style={{ fontSize: "10px", fontWeight: 800, color: "#059669", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "10px" }}>Tim Pendamping</div>
                                        {selectedRoom.assignedCallerNama && (
                                            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                                                <span style={{ fontSize: "14px" }}>📢</span>
                                                <div>
                                                    <div style={{ fontSize: "10px", color: "#64748b", fontWeight: 600 }}>Pemanggil</div>
                                                    <div style={{ fontSize: "13px", fontWeight: 700, color: selectedRoom.assignedCallerId === myId ? "#2563eb" : "#0f172a" }}>
                                                        {selectedRoom.assignedCallerNama} {selectedRoom.assignedCallerId === myId ? "(Anda)" : ""}
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                        {selectedRoom.assignedGuardNama && (
                                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                                <span style={{ fontSize: "14px" }}>🚪</span>
                                                <div>
                                                    <div style={{ fontSize: "10px", color: "#64748b", fontWeight: 600 }}>Penunggu</div>
                                                    <div style={{ fontSize: "13px", fontWeight: 700, color: selectedRoom.assignedGuardId === myId ? "#059669" : "#0f172a" }}>
                                                        {selectedRoom.assignedGuardNama} {selectedRoom.assignedGuardId === myId ? "(Anda)" : ""}
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Action buttons — only for assigned guard */}
                                {selectedRoom.assignedGuardId === myId && (
                                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                                        {!selectedRoom.startedAt ? (
                                            <button onClick={() => { setSelectedRoom(null); handleStartRoom(selectedRoom.id); }} style={{
                                                background: "linear-gradient(135deg,#d97706,#b45309)", color: "white", border: "none",
                                                borderRadius: "10px", padding: "12px", fontSize: "13px", fontWeight: 800,
                                                cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
                                                boxShadow: "0 4px 12px rgba(217,119,6,0.3)"
                                            }}>
                                                <Timer size={14} fill="white" /> Mulai Sesi
                                            </button>
                                        ) : (
                                            <button onClick={() => { setSelectedRoom(null); handleClearRoom(selectedRoom.id); }} style={{
                                                background: "linear-gradient(135deg,#166534,#14532d)", color: "white", border: "none",
                                                borderRadius: "10px", padding: "12px", fontSize: "13px", fontWeight: 800,
                                                cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
                                                boxShadow: "0 4px 12px rgba(22,101,52,0.3)"
                                            }}>
                                                <LogOut size={14} /> Selesaikan Sesi
                                            </button>
                                        )}

                                    </div>
                                )}
                                {selectedRoom.assignedCallerId === myId && (
                                    <div style={{
                                        background: "#eff6ff", borderRadius: "10px", padding: "12px", textAlign: "center",
                                        color: "#2563eb", fontWeight: 700, fontSize: "13px", border: "1px solid #bfdbfe"
                                    }}>
                                        📢 Tugas Anda: Pemanggil — Tunggu instruksi Penunggu
                                    </div>
                                )}
                            </>
                        ) : (
                            <div style={{ textAlign: "center", padding: "30px 0", color: "#94a3b8" }}>
                                <div style={{ fontSize: "40px", marginBottom: "12px" }}>🏠</div>
                                <div style={{ fontWeight: 700, fontSize: "14px" }}>Ruangan Kosong</div>
                                <div style={{ fontSize: "12px", marginTop: "4px" }}>Belum ada pasangan di ruangan ini</div>
                            </div>
                        )}
                    </div>
                </div>
            )}

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
