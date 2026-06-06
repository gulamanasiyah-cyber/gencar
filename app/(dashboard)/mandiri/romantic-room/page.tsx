"use client";




import { useState, useEffect } from "react";
import Swal from "sweetalert2";
import {
    Heart, MessageSquare, User, Phone, MapPin, ClipboardList,
    CheckCircle, Star, Download, Sparkles, Send, Timer,
    Globe, Plus, Trash2, LogOut, Users, DoorOpen, Search, Undo2
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

function RoomTimer({ startTime }: { startTime: string }) {
    const [timeLeft, setTimeLeft] = useState<string>("");
    const [isOver, setIsOver] = useState(false);

    useEffect(() => {
        const calculateTime = () => {
            if (!startTime) {
                setTimeLeft("Belum Dimulai");
                return;
            }

            // SQLite datetime('now') returns "YYYY-MM-DD HH:mm:ss" in UTC
            // We need to format it to "YYYY-MM-DDTHH:mm:ssZ" for JS to parse it reliably as UTC
            const isoString = startTime.includes(' ')
                ? startTime.replace(' ', 'T') + 'Z'
                : startTime;

            const start = new Date(isoString).getTime();
            const now = new Date().getTime();

            // Adjust for possible timezone difference if needed, but usually datetime('now') in SQLite matches system
            // 15 minutes in milliseconds
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

export default function RomanticRoomPage() {
    const [loading, setLoading] = useState(true);
    const [myProfile, setMyProfile] = useState<any>(null);
    const [allRooms, setAllRooms] = useState<any[]>([]);
    const [allQueue, setAllQueue] = useState<any[]>([]); // Status "Menunggu"
    const [allParticipants, setAllParticipants] = useState<any[]>([]);
    const [resultFilter, setResultFilter] = useState("Semua");
    const [myRoom, setMyRoom] = useState<any>(null);
    const [myQueueStatus, setMyQueueStatus] = useState<any>(null);
    const [visitHistory, setVisitHistory] = useState<any[]>([]);
    const [attendanceCount, setAttendanceCount] = useState<number>(0);
    const [queueSearch, setQueueSearch] = useState("");
    const [roomSearch, setRoomSearch] = useState("");

    const [allCities, setAllCities] = useState<string[]>([]);
    const [allVillages, setAllVillages] = useState<any[]>([]);
    const [cityFilter, setCityFilter] = useState("Semua Kota");
    const [villageFilter, setVillageFilter] = useState("Semua Desa");

    const [showSurvey, setShowSurvey] = useState(false);
    const [form, setForm] = useState({
        namaPnkb: "",
        noHpPnkb: "",
        tanggapan: "Baik",
        rekomendasi: "Lanjut"
    });

    // Helper for independent auth
    const getAuthHeaders = () => {
        const headers: any = { "Content-Type": "application/json" };
        const u = localStorage.getItem("attended_nomor_unik");
        const t = localStorage.getItem("attended_session_token");
        if (u) headers["x-nomor-unik"] = u;
        if (t) headers["x-session-token"] = t;
        return headers;
    };

    const isAdmin = ["admin", "kmm_daerah", "admin_romantic_room", "pengurus_daerah", "tim_pnkb"].includes(myProfile?.role || "");

    const fetchData = async () => {
        setLoading(true);
        try {
            const h = getAuthHeaders();
            const profRes = await fetch("/api/profile", { headers: h });
            const profJson = await profRes.json();

            if (profRes.status === 401) {
                // If not authorized as independent OR session, redirect back
                Swal.fire("Akses Ditolak", "Silakan login atau masukkan Nomor Peserta di Katalog terlebih dahulu.", "error").then(() => {
                    window.location.href = "/mandiri/katalog";
                });
                return;
            }

            setMyProfile(profJson);

            const isUserAdmin = ["admin", "kmm_daerah", "admin_romantic_room", "pengurus_daerah", "tim_pnkb"].includes(profJson.role);

            // Fetch Rooms
            const roomsRes = await fetch("/api/mandiri/rooms", { headers: h });
            const roomsJson = await roomsRes.json();
            const sortedRooms = Array.isArray(roomsJson)
                ? [...roomsJson].sort((a, b) => a.nama.localeCompare(b.nama, undefined, { numeric: true, sensitivity: 'base' }))
                : [];
            setAllRooms(sortedRooms);

            if (isUserAdmin) {
                // Fetch All Selections for Queue
                const qRes = await fetch("/api/mandiri/pilih?all=true");
                const qJson = await qRes.json();
                const waiting = Array.isArray(qJson) ? qJson.filter((q: any) => q.status === "Menunggu") : [];
                setAllQueue(waiting);

                // Fetch Visit History
                const histRes = await fetch("/api/mandiri/kunjungan", { headers: h });
                const histJson = await histRes.json();
                setVisitHistory(Array.isArray(histJson) ? histJson : []);

                // Fetch All Participants for Manual Dropdown
                const pRes = await fetch("/api/mandiri?limit=1000", { headers: h });
                const pJson = await pRes.json();
                setAllParticipants(Array.isArray(pJson.data) ? pJson.data : []);

                // Fetch Attendance Stats
                const statsRes = await fetch("/api/mandiri/stats/attendance");
                const statsJson = await statsRes.json();
                setAttendanceCount(statsJson.count || 0);

                // Fetch Cities & Villages
                const desaRes = await fetch("/api/mandiri/desa");
                const desaJson = await desaRes.json();
                if (Array.isArray(desaJson)) {
                    setAllVillages(desaJson);
                    const cities = Array.from(new Set(desaJson.map((d: any) => d.kota))).sort() as string[];
                    setAllCities(cities);
                }
            } else {
                // Check if user is in a room or queue
                const myRooms = (Array.isArray(roomsJson) ? roomsJson : []).find((r: any) =>
                    r.pemilihanId && r.status === "Terisi" &&
                    (r.pengirimNama === profJson.nama || r.penerimaNama === profJson.nama)
                );

                if (myRooms) {
                    setMyRoom(myRooms);
                    setMyQueueStatus(null);
                } else {
                    const u = localStorage.getItem("attended_nomor_unik");
                    const t = localStorage.getItem("attended_session_token");
                    const selRes = await fetch(`/api/mandiri/pilih?nomorUnik=${u || ""}&token=${t || ""}`);
                    const selJson = await selRes.json();
                    if (Array.isArray(selJson)) {
                        const inQueue = selJson.find((s: any) => s.status === "Menunggu");
                        setMyQueueStatus(inQueue);
                        setMyRoom(null);
                    }
                }
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 10000); // Poll every 10s for status updates
        return () => clearInterval(interval);
    }, []);


    const handleCreateRoom = async () => {
        const { value: roomName } = await Swal.fire({
            title: 'Buat Ruangan Baru',
            input: 'text',
            inputLabel: 'Nama Ruangan',
            inputPlaceholder: 'Contoh: Room 1',
            showCancelButton: true,
            inputValidator: (value) => {
                if (!value) {
                    return 'Nama ruangan tidak boleh kosong!'
                }
            }
        });

        if (roomName) {
            try {
                const res = await fetch("/api/mandiri/rooms", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ nama: roomName })
                });
                if (res.ok) {
                    Swal.fire("Berhasil", `Ruangan ${roomName} berhasil dibuat`, "success");
                    fetchData();
                } else {
                    const err = await res.json();
                    throw new Error(err.error || "Gagal membuat ruangan");
                }
            } catch (err: any) {
                Swal.fire("Error", err.message, "error");
            }
        }
    };

    const handleBulkCreateRooms = async () => {
        const result = await Swal.fire({
            title: 'Buat 10 Ruangan?',
            text: "Sistem akan otomatis membuat 10 ruangan baru",
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Ya, Buat!',
            cancelButtonText: 'Batal'
        });

        if (result.isConfirmed) {
            Swal.fire({
                title: 'Sedang memproses...',
                allowOutsideClick: false,
                didOpen: () => {
                    Swal.showLoading();
                }
            });

            try {
                const prefix = "Room";
                const startCount = allRooms.length + 1;
                const promises = [];
                for (let i = 0; i < 10; i++) {
                    promises.push(
                        fetch("/api/mandiri/rooms", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ nama: `${prefix} ${startCount + i}` })
                        })
                    );
                }
                await Promise.all(promises);
                Swal.fire("Berhasil", "10 Ruangan 'Room' berhasil dibuat", "success");
                fetchData();
            } catch (err) {
                Swal.fire("Error", "Gagal membuat beberapa ruangan", "error");
            }
        }
    };

    const handleDeleteRoom = async (id: string) => {
        const result = await Swal.fire({
            title: 'Hapus Ruangan?',
            text: "Data ruangan akan dihapus permanen.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#f43f5e',
            confirmButtonText: 'Ya, Hapus!'
        });

        if (result.isConfirmed) {
            try {
                await fetch(`/api/mandiri/rooms/${id}`, { method: "DELETE" });
                fetchData();
            } catch (err) {
                Swal.fire("Error", "Gagal menghapus ruangan", "error");
            }
        }
    };

    const handleAssignToRoom = async (pemilihanId: string, pengirim: string, penerima: string, pengirimKeterangan?: string, penerimaKeterangan?: string) => {
        if (pengirimKeterangan === "pulang") {
            Swal.fire("Gagal Masuk Room", `${pengirim} sudah logout (pulang). Tidak dapat memasukkan pasangan ini ke dalam ruangan.`, "error");
            return;
        }
        if (penerimaKeterangan === "pulang") {
            Swal.fire("Gagal Masuk Room", `${penerima} sudah logout (pulang). Tidak dapat memasukkan pasangan ini ke dalam ruangan.`, "error");
            return;
        }

        const availableRooms = allRooms.filter(r => r.status === "Kosong");
        if (availableRooms.length === 0) {
            Swal.fire("Penuh", "Tidak ada ruangan kosong tersedia. Silakan buat ruangan baru.", "warning");
            return;
        }

        const { value: roomId } = await Swal.fire({
            title: 'Pilih Ruangan',
            input: 'select',
            inputOptions: Object.fromEntries(availableRooms.map(r => [r.id, r.nama])),
            inputPlaceholder: 'Pilih ruangan...',
            showCancelButton: true
        });

        if (roomId) {
            try {
                const res = await fetch(`/api/mandiri/rooms/${roomId}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ pemilihanId, action: "assign" })
                });
                if (res.ok) {
                    Swal.fire("Berhasil", `${pengirim} & ${penerima} telah masuk ke ruangan.`, "success");
                    fetchData();
                } else {
                    const errData = await res.json();
                    Swal.fire("Error", errData.error || "Gagal memproses validasi", "error");
                }
            } catch (err) {
                Swal.fire("Error", "Gagal memproses validasi", "error");
            }
        }
    };

    const handleDeleteAllRooms = async () => {
        const result = await Swal.fire({
            title: 'Hapus Semua Ruangan?',
            text: "Seluruh data ruangan akan dihapus permanen. Tindakan ini tidak dapat dibatalkan.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#f43f5e',
            confirmButtonText: 'Ya, Hapus Semua!'
        });

        if (result.isConfirmed) {
            try {
                await fetch("/api/mandiri/rooms", { method: "DELETE" });
                fetchData();
            } catch (err) {
                Swal.fire("Error", "Gagal menghapus semua ruangan", "error");
            }
        }
    };

    const handleClearRoom = async (id: string) => {
        const room = allRooms.find(r => r.id === id);
        if (!room) return;

        const { value: formValues } = await Swal.fire({
            title: 'Selesaikan Sesi?',
            html: `
                <div style="text-align: left; margin-bottom: 20px;">
                    <p style="font-size: 14px; margin-bottom: 15px; color: #64748b;">Tentukan hasil pertemuan untuk kedua belah pihak:</p>
                    
                    <div style="margin-bottom: 20px;">
                        <label style="display: block; font-weight: 800; font-size: 11px; text-transform: uppercase; color: #1e293b; margin-bottom: 8px; letter-spacing: 0.5px;">
                            Pemilih: <span style="color: #f43f5e; margin-left: 4px;">${room.pengirimNama}</span>
                        </label>
                        <div style="display: flex; gap: 8px;">
                            <input type="radio" id="p_lanjut" name="hasil_p" value="Lanjut" checked style="display:none">
                            <label for="p_lanjut" class="swal-custom-radio">Lanjut</label>
                            
                            <input type="radio" id="p_ragu" name="hasil_p" value="Ragu-ragu" style="display:none">
                            <label for="p_ragu" class="swal-custom-radio">Ragu-ragu</label>

                            <input type="radio" id="p_tidak" name="hasil_p" value="Tidak Lanjut" style="display:none">
                            <label for="p_tidak" class="swal-custom-radio">Tidak Lanjut</label>
                        </div>
                    </div>

                    <div>
                        <label style="display: block; font-weight: 800; font-size: 11px; text-transform: uppercase; color: #1e293b; margin-bottom: 8px; letter-spacing: 0.5px;">
                            Terpilih: <span style="color: #f43f5e; margin-left: 4px;">${room.penerimaNama}</span>
                        </label>
                        <div style="display: flex; gap: 8px;">
                            <input type="radio" id="t_lanjut" name="hasil_t" value="Lanjut" checked style="display:none">
                            <label for="t_lanjut" class="swal-custom-radio">Lanjut</label>
                            
                            <input type="radio" id="t_ragu" name="hasil_t" value="Ragu-ragu" style="display:none">
                            <label for="t_ragu" class="swal-custom-radio">Ragu-ragu</label>

                            <input type="radio" id="t_tidak" name="hasil_t" value="Tidak Lanjut" style="display:none">
                            <label for="t_tidak" class="swal-custom-radio">Tidak Lanjut</label>
                        </div>
                    </div>

                    <style>
                        .swal-custom-radio { 
                            flex: 1; 
                            padding: 10px; 
                            border: 2px solid #f1f5f9; 
                            border-radius: 10px; 
                            text-align: center; 
                            cursor: pointer; 
                            font-weight: 800; 
                            font-size: 12px;
                            transition: all 0.2s;
                            color: #64748b;
                        }
                        .swal-custom-radio:hover {
                            background: #f8fafc;
                            border-color: #e2e8f0;
                        }
                        input[id$="_lanjut"]:checked + .swal-custom-radio { 
                            background: #f0fdf4; 
                            color: #16a34a; 
                            border-color: #16a34a; 
                        }
                        input[id$="_ragu"]:checked + .swal-custom-radio { 
                            background: #fffbeb; 
                            color: #d97706; 
                            border-color: #d97706; 
                        }
                        input[id$="_tidak"]:checked + .swal-custom-radio { 
                            background: #fef2f2; 
                            color: #dc2626; 
                            border-color: #dc2626; 
                        }
                        .swal2-html-container { margin: 1.5em 1.6em 0.5em !important; }
                    </style>
                </div>
            `,
            focusConfirm: false,
            showCancelButton: true,
            confirmButtonText: 'Simpan & Selesaikan',
            confirmButtonColor: '#1e293b',
            cancelButtonText: 'Batal',
            preConfirm: () => {
                const p = (document.querySelector('input[name="hasil_p"]:checked') as HTMLInputElement)?.value;
                const t = (document.querySelector('input[name="hasil_t"]:checked') as HTMLInputElement)?.value;
                return { hasilPengirim: p, hasilPenerima: t };
            }
        });

        if (formValues) {
            try {
                await fetch(`/api/mandiri/rooms/${id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        action: "clear",
                        hasilPengirim: formValues.hasilPengirim,
                        hasilPenerima: formValues.hasilPenerima
                    })
                });
                fetchData();
            } catch (err) {
                Swal.fire("Error", "Gagal mengosongkan ruangan", "error");
            }
        }
    };

    const handleUndoRoom = async (id: string) => {
        const room = allRooms.find(r => r.id === id);
        if (!room) return;

        const result = await Swal.fire({
            title: 'Batalkan Pertemuan?',
            text: `Kembalikan ${room.pengirimNama} & ${room.penerimaNama} ke kotak antrean?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#f43f5e',
            confirmButtonText: 'Ya, Kembalikan!',
            cancelButtonText: 'Batal'
        });

        if (result.isConfirmed) {
            try {
                const res = await fetch(`/api/mandiri/rooms/${id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ action: "undo" })
                });
                if (res.ok) {
                    Swal.fire({
                        title: "Berhasil",
                        text: "Data berhasil dikembalikan ke antrean.",
                        icon: "success",
                        timer: 1500,
                        showConfirmButton: false
                    });
                    fetchData();
                } else {
                    const err = await res.json();
                    throw new Error(err.error || "Gagal melakukan undo");
                }
            } catch (err: any) {
                Swal.fire("Error", err.message, "error");
            }
        }
    };

    const handleStartRoom = async (id: string) => {
        const room = allRooms.find(r => r.id === id);
        if (!room) return;

        const result = await Swal.fire({
            title: 'Mulai Sesi Waktu?',
            text: `Apakah Anda yakin ingin memulai sesi waktu 15 menit untuk ${room.pengirimNama} & ${room.penerimaNama}?`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#22c55e',
            confirmButtonText: 'Ya, Mulai!',
            cancelButtonText: 'Batal'
        });

        if (result.isConfirmed) {
            try {
                const res = await fetch(`/api/mandiri/rooms/${id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ action: "start" })
                });
                if (res.ok) {
                    Swal.fire({
                        title: "Sesi Dimulai",
                        text: "Timer 15 menit telah diaktifkan.",
                        icon: "success",
                        timer: 1500,
                        showConfirmButton: false
                    });
                    fetchData();
                } else {
                    const err = await res.json();
                    throw new Error(err.error || "Gagal memulai sesi");
                }
            } catch (err: any) {
                Swal.fire("Error", err.message, "error");
            }
        }
    };



    const handleSubmitSurvey = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const u = localStorage.getItem("attended_nomor_unik");
            const t = localStorage.getItem("attended_session_token");
            const res = await fetch("/api/mandiri/kuisioner", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    pemilihanId: myRoom?.pemilihanId,
                    nomorUnik: u,
                    token: t,
                    ...form
                })
            });
            if (!res.ok) throw new Error("Gagal menyimpan kuisioner");
            Swal.fire("Berhasil", "Kuisioner berhasil disimpan. Terima kasih.", "success");
            setShowSurvey(false);
            fetchData();
        } catch (err: any) {
            Swal.fire("Error", err.message, "error");
        }
    };

    const handleExportPDF = () => {
        const doc = new jsPDF();
        doc.setFontSize(22);
        doc.setTextColor(244, 63, 94);
        doc.text("Laporan Pertemuan PDKT", 105, 20, { align: "center" });

        const tableData = [
            ["1. Nama PNKB", form.namaPnkb || "-"],
            ["2. No. HP PNKB", form.noHpPnkb || "-"],
            ["3. Nama Lengkap", myProfile?.nama || "-"],
            ["4. No. Peserta", myProfile?.nomorUrut || "-"],
            ["5. Daerah/Kota", `${myProfile?.mandiriDesaNama || "-"} / ${myProfile?.kota || "-"}`],
            ["6. Lawan Bicara", myRoom?.pengirimNama === myProfile?.nama ? myRoom?.penerimaNama : myRoom?.pengirimNama],
            ["7. Tanggapan", form.tanggapan],
            ["8. Hasil", form.rekomendasi]
        ];

        autoTable(doc, {
            startY: 40,
            head: [['Kriteria', 'Keterangan']],
            body: tableData,
            theme: 'striped',
            headStyles: { fillColor: [244, 63, 94] }
        });

        doc.save(`Kuisioner_PDKT_${myProfile?.nama}.pdf`);
    };

    const handleEditRecord = async (item: any) => {
        const { value: formValues } = await Swal.fire({
            title: 'Edit Hasil Pertemuan',
            html: `
                <div style="text-align:left">
                    <p style="font-size:13px;color:#64748b;margin-bottom:16px">
                        <b>${item.pemilihNama}</b> &amp; <b>${item.terpilihNama}</b>
                    </p>
                    <label style="font-size:11px;font-weight:800;text-transform:uppercase;color:#1e293b">Hasil Pemilih (${item.pemilihNama})</label>
                    <select id="edit_pengirim" style="width:100%;padding:8px;border-radius:8px;border:1px solid #e2e8f0;margin:6px 0 16px;font-size:13px">
                        <option value="Lanjut" ${item.pemilihHasil === 'Lanjut' ? 'selected' : ''}>Lanjut</option>
                        <option value="Ragu-ragu" ${item.pemilihHasil === 'Ragu-ragu' ? 'selected' : ''}>Ragu-ragu</option>
                        <option value="Tidak Lanjut" ${item.pemilihHasil === 'Tidak Lanjut' ? 'selected' : ''}>Tidak Lanjut</option>
                    </select>
                    <label style="font-size:11px;font-weight:800;text-transform:uppercase;color:#1e293b">Hasil Terpilih (${item.terpilihNama})</label>
                    <select id="edit_penerima" style="width:100%;padding:8px;border-radius:8px;border:1px solid #e2e8f0;margin:6px 0 16px;font-size:13px">
                        <option value="Lanjut" ${item.terpilihHasil === 'Lanjut' ? 'selected' : ''}>Lanjut</option>
                        <option value="Ragu-ragu" ${item.terpilihHasil === 'Ragu-ragu' ? 'selected' : ''}>Ragu-ragu</option>
                        <option value="Tidak Lanjut" ${item.terpilihHasil === 'Tidak Lanjut' ? 'selected' : ''}>Tidak Lanjut</option>
                    </select>
                    <label style="font-size:11px;font-weight:800;text-transform:uppercase;color:#1e293b">Nomor Room</label>
                    <select id="edit_room" style="width:100%;padding:8px;border-radius:8px;border:1px solid #e2e8f0;margin:6px 0 0;font-size:13px">
                        ${allRooms.map(r => `<option value="${r.id}" ${r.id === item.roomId ? 'selected' : ''}>${r.nama}</option>`).join('')}
                    </select>
                </div>
            `,
            focusConfirm: false,
            showCancelButton: true,
            confirmButtonText: 'Simpan',
            cancelButtonText: 'Batal',
            confirmButtonColor: '#1e293b',
            preConfirm: () => ({
                hasilPengirim: (document.getElementById('edit_pengirim') as HTMLSelectElement).value,
                hasilPenerima: (document.getElementById('edit_penerima') as HTMLSelectElement).value,
                roomId: (document.getElementById('edit_room') as HTMLSelectElement).value,
            })
        });

        if (!formValues) return;
        try {
            const res = await fetch(`/api/mandiri/kunjungan/${item.pemilihanId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formValues)
            });
            if (!res.ok) throw new Error((await res.json()).error);
            Swal.fire({ title: "Berhasil", text: "Data berhasil diupdate.", icon: "success", timer: 1500, showConfirmButton: false });
            fetchData();
        } catch (err: any) {
            Swal.fire("Error", err.message, "error");
        }
    };

    const handleDeleteRecord = async (item: any) => {
        const result = await Swal.fire({
            title: 'Hapus Record Ini?',
            html: `Data pertemuan <b>${item.pemilihNama}</b> &amp; <b>${item.terpilihNama}</b> akan dihapus permanen termasuk data pemilihan. Tindakan ini tidak dapat dibatalkan.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#dc2626',
            confirmButtonText: 'Ya, Hapus Permanen!',
            cancelButtonText: 'Batal'
        });

        if (!result.isConfirmed) return;
        try {
            const res = await fetch(`/api/mandiri/kunjungan/${item.pemilihanId}`, { method: "DELETE" });
            if (!res.ok) throw new Error((await res.json()).error);
            Swal.fire({ title: "Terhapus!", text: "Record berhasil dihapus permanen.", icon: "success", timer: 1500, showConfirmButton: false });
            fetchData();
        } catch (err: any) {
            Swal.fire("Error", err.message, "error");
        }
    };

    const handleDeleteQueue = async (item: any) => {
        const result = await Swal.fire({
            title: 'Hapus Antrean?',
            html: `Antrean antara <b>${item.pengirimNama}</b> &amp; <b>${item.penerimaNama}</b> akan dihapus.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#dc2626',
            confirmButtonText: 'Ya, Hapus!',
            cancelButtonText: 'Batal'
        });

        if (!result.isConfirmed) return;
        try {
            const res = await fetch(`/api/mandiri/kunjungan/${item.id}`, { method: "DELETE" });
            if (!res.ok) throw new Error((await res.json()).error);
            Swal.fire({ title: "Terhapus!", text: "Antrean berhasil dihapus.", icon: "success", timer: 1500, showConfirmButton: false });
            fetchData();
        } catch (err: any) {
            Swal.fire("Error", err.message, "error");
        }
    };

    const handleExportExcel = () => {
        const data = filteredData.map(item => ({
            "Nomor Peserta Pemilih": item.pemilihNomorUrut || item.pemilihNo || "-",
            "Nama Pemilih": item.pemilihNama,
            "Jenis Kelamin Pemilih": item.pemilihJenisKelamin || "-",
            "Daerah/Kota Pemilih": item.pemilihKota || "-",
            "Desa Pemilih": item.pemilihDesa || "-",
            "WhatsApp Pemilih": item.pemilihWa || "-",
            "Status Pemilih": item.pemilihStatus,
            "Hasil Pemilih": item.pemilihHasil || "-",
            "Nomor Peserta Terpilih": item.terpilihNomorUrut || item.terpilihNo || "-",
            "Nama Terpilih": item.terpilihNama,
            "Jenis Kelamin Terpilih": item.terpilihJenisKelamin || "-",
            "Daerah/Kota Terpilih": item.terpilihKota || "-",
            "Desa Terpilih": item.terpilihDesa || "-",
            "WhatsApp Terpilih": item.terpilihWa || "-",
            "Status Terpilih": item.terpilihStatus,
            "Hasil Terpilih": item.terpilihHasil || "-",
            "Nomor Room": item.roomNama,
            "Waktu": item.createdAt ? new Date(item.createdAt).toLocaleString("id-ID") : "-",
            "Status": item.status || "Selesai"
        }));

        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Laporan");
        XLSX.writeFile(wb, "Laporan_Hasil_Romantic_Room.xlsx");
    };

    const handleShareWhatsApp = async () => {
        Swal.fire({
            title: 'Menyiapkan Laporan WhatsApp...',
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });

        try {
            const res = await fetch("/api/mandiri/stats/whatsapp-report");
            const data = await res.json();

            if (!res.ok) throw new Error(data.error || "Gagal mengambil data laporan");

            let message = `*LAPORAN STATISTIK ROMANTIC ROOM*\n`;
            message += `*KEGIATAN:* ${data.kegiatan}\n`;
            message += `*WAKTU:* ${new Date().toLocaleString("id-ID")}\n\n`;

            data.reports.forEach((report: any) => {
                message += `==========================\n`;
                message += `*DAERAH/KOTA: ${report.kota}*\n`;
                message += `==========================\n`;
                message += `• Total Peserta Hadir: *${report.pesertaHadir}*\n`;
                message += `  - Laki-laki: ${report.pesertaLaki}\n`;
                message += `  - Perempuan: ${report.pesertaPerempuan}\n`;
                message += `• Total Panitia Hadir: *${report.panitiaHadir}*\n`;
                message += `  - Laki-laki: ${report.panitiaLaki}\n`;
                message += `  - Perempuan: ${report.panitiaPerempuan}\n\n`;
                
                message += `*HASIL ROMANTIC ROOM:*\n`;
                message += `• Lanjut - Lanjut: *${report.rr.lanjutLanjut}*\n`;
                message += `• Tidak Lanjut - Lanjut: *${report.rr.tidakLanjutLanjut}*\n`;
                message += `• Tidak Lanjut - Tidak Lanjut: *${report.rr.tidakLanjutTidakLanjut}*\n`;
                message += `• Ragu-ragu - Ragu-ragu: *${report.rr.raguRaguRaguRagu}*\n`;
                message += `• Ragu-ragu - Lanjut: *${report.rr.raguRaguLanjut}*\n`;
                message += `• Ragu-ragu - Tidak Lanjut: *${report.rr.raguRaguTidakLanjut}*\n`;
                message += `• Menunggu Antrean: *${report.menungguAntrean}*\n\n`;
            });

            message += `==========================\n`;
            message += `*GRAND TOTAL KESELURUHAN*\n`;
            message += `==========================\n`;
            message += `• Total Peserta Hadir: *${data.grandTotal.pesertaHadir}*\n`;
            message += `• Total Panitia Hadir: *${data.grandTotal.panitiaHadir}*\n`;
            message += `• Total Menunggu Antrean: *${data.grandTotal.menungguAntrean}*\n\n`;

            message += `_Laporan otomatis dikirim melalui Sistem Muda-Mudi Cengkareng Jakarta Barat 2_`;

            const encodedMessage = encodeURIComponent(message);
            const whatsappUrl = `https://wa.me/62882000089120?text=${encodedMessage}`;
            
            Swal.close();
            window.open(whatsappUrl, '_blank');
        } catch (err: any) {
            Swal.fire("Error", err.message, "error");
        }
    };

    const normalizedQueue = allQueue.map(q => ({
        id: q.id,
        pemilihNomorUrut: q.pengirimNomorUrut,
        pemilihNo: q.pengirimNo,
        pemilihNama: q.pengirimNama,
        pemilihStatus: q.pengirimStatus,
        pemilihKota: q.pengirimKota,
        pemilihDesa: q.pengirimDesa,
        pemilihHasil: "Menunggu",
        terpilihNomorUrut: q.penerimaNomorUrut,
        terpilihNo: q.penerimaNo,
        terpilihNama: q.penerimaNama,
        terpilihStatus: q.penerimaStatus,
        terpilihKota: q.penerimaKota,
        terpilihDesa: q.penerimaDesa,
        terpilihHasil: "Menunggu",
        roomNama: "Antrean",
        createdAt: q.createdAt,
        status: "Menunggu",
        pemilihanId: q.id,
        pemilihWa: q.pengirimWa,
        terpilihWa: q.penerimaWa,
        pemilihJenisKelamin: q.pengirimJenisKelamin,
        terpilihJenisKelamin: q.penerimaJenisKelamin,
        isQueue: true
    }));

    const combinedList = [
        ...normalizedQueue,
        ...visitHistory.map(h => ({ ...h, status: "Selesai", isQueue: false }))
    ];

    const filteredData = combinedList.filter(item => {
        // Result Filter
        let matchResult = true;
        if (resultFilter === "Sedang Menunggu") {
            matchResult = (item.status === "Menunggu");
        } else if (resultFilter !== "Semua") {
            // Only history items can match specific result filters
            if (item.status === "Menunggu") {
                matchResult = false;
            } else {
                const res1 = item.pemilihHasil;
                const res2 = item.terpilihHasil;

                if (resultFilter === "Lanjut - Lanjut") {
                    matchResult = (res1 === "Lanjut" && res2 === "Lanjut");
                } else if (resultFilter === "Lanjut - Tidak Lanjut") {
                    matchResult = (res1 === "Lanjut" && res2 === "Tidak Lanjut") || (res1 === "Tidak Lanjut" && res2 === "Lanjut");
                } else if (resultFilter === "Tidak Lanjut - Tidak Lanjut") {
                    matchResult = (res1 === "Tidak Lanjut" && res2 === "Tidak Lanjut");
                } else if (resultFilter === "Ragu-ragu - Ragu-ragu") {
                    matchResult = (res1 === "Ragu-ragu" && res2 === "Ragu-ragu");
                } else if (resultFilter === "Lanjut - Ragu-ragu") {
                    matchResult = (res1 === "Lanjut" && res2 === "Ragu-ragu") || (res1 === "Ragu-ragu" && res2 === "Lanjut");
                } else if (resultFilter === "Tidak Lanjut - Ragu-ragu") {
                    matchResult = (res1 === "Tidak Lanjut" && res2 === "Ragu-ragu") || (res1 === "Ragu-ragu" && res2 === "Tidak Lanjut");
                }
            }
        }

        // City Filter
        let matchCity = true;
        if (cityFilter !== "Semua Kota") {
            matchCity = (item.pemilihKota === cityFilter || item.terpilihKota === cityFilter);
        }

        // Village Filter
        let matchVillage = true;
        if (villageFilter !== "Semua Desa") {
            matchVillage = (item.pemilihDesa === villageFilter || item.terpilihDesa === villageFilter);
        }

        return matchResult && matchCity && matchVillage;
    });

    if (loading && !myProfile) return <div className="room-loading">Membuka Romantic Room...</div>;

    if (isAdmin) {
        const sessionStats = {
            lanjutLanjut: visitHistory.filter(h => h.pemilihHasil === 'Lanjut' && h.terpilihHasil === 'Lanjut').length,
            lanjutTidak: visitHistory.filter(h =>
                (h.pemilihHasil === 'Lanjut' && h.terpilihHasil === 'Tidak Lanjut') ||
                (h.pemilihHasil === 'Tidak Lanjut' && h.terpilihHasil === 'Lanjut')
            ).length,
            tidakTidak: visitHistory.filter(h => h.pemilihHasil === 'Tidak Lanjut' && h.terpilihHasil === 'Tidak Lanjut').length,
            raguRagu: visitHistory.filter(h => h.pemilihHasil === 'Ragu-ragu' && h.terpilihHasil === 'Ragu-ragu').length,
            lanjutRagu: visitHistory.filter(h =>
                (h.pemilihHasil === 'Lanjut' && h.terpilihHasil === 'Ragu-ragu') ||
                (h.pemilihHasil === 'Ragu-ragu' && h.terpilihHasil === 'Lanjut')
            ).length,
            tidakRagu: visitHistory.filter(h =>
                (h.pemilihHasil === 'Tidak Lanjut' && h.terpilihHasil === 'Ragu-ragu') ||
                (h.pemilihHasil === 'Ragu-ragu' && h.terpilihHasil === 'Tidak Lanjut')
            ).length,
        };

        const filteredRooms = allRooms.filter((room) => {
            const search = roomSearch.toLowerCase();
            return (
                room.nama?.toLowerCase().includes(search) ||
                room.pengirimNama?.toLowerCase().includes(search) ||
                room.penerimaNama?.toLowerCase().includes(search) ||
                (room.pengirimNomorUrut || room.pengirimNo || '').toString().includes(search) ||
                (room.penerimaNomorUrut || room.penerimaNo || '').toString().includes(search)
            );
        });

        return (
            <div className="romantic-container admin-layout">
                <header className="room-header-modern">
                    <div className="header-top">
                        <div className="title-area">
                            <h1>Management <span>Romantic Room</span> <Sparkles size={24} className="sparkle-icon" /></h1>
                            <p>Pantau antrean, alokasi ruangan, dan hasil pertemuan secara real-time</p>
                        </div>
                        <div className="stats-row">
                            <div className="mini-stat">
                                <Timer size={16} />
                                <div className="ms-content">
                                    <span className="ms-label">Antrean</span>
                                    <span className="ms-value">{allQueue.length}</span>
                                </div>
                            </div>
                            <div className="mini-stat">
                                <DoorOpen size={16} />
                                <div className="ms-content">
                                    <span className="ms-label">Ruangan</span>
                                    <span className="ms-value">{allRooms.filter(r => r.status === 'Terisi').length}/{allRooms.length}</span>
                                </div>
                            </div>
                            <div className="mini-stat">
                                <ClipboardList size={16} />
                                <div className="ms-content">
                                    <span className="ms-label">Total Record</span>
                                    <span className="ms-value">{visitHistory.length}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="summary-section-container">
                        <div className="summary-grid-modern">
                            <div className="summary-card-modern match">
                                <div className="card-dot"></div>
                                <div className="card-content">
                                    <span className="card-val">{sessionStats.lanjutLanjut}</span>
                                    <span className="card-lbl">Lanjut - Lanjut</span>
                                </div>
                            </div>
                            <div className="summary-card-modern one-sided">
                                <div className="card-dot"></div>
                                <div className="card-content">
                                    <span className="card-val">{sessionStats.lanjutTidak}</span>
                                    <span className="card-lbl">Lanjut - Tidak</span>
                                </div>
                            </div>
                            <div className="summary-card-modern reject">
                                <div className="card-dot"></div>
                                <div className="card-content">
                                    <span className="card-val">{sessionStats.tidakTidak}</span>
                                    <span className="card-lbl">Tidak - Tidak</span>
                                </div>
                            </div>
                            <div className="summary-card-modern ragu">
                                <div className="card-dot"></div>
                                <div className="card-content">
                                    <span className="card-val">{sessionStats.raguRagu}</span>
                                    <span className="card-lbl">Ragu - Ragu</span>
                                </div>
                            </div>
                            <div className="summary-card-modern mix">
                                <div className="card-dot"></div>
                                <div className="card-content">
                                    <span className="card-val">{sessionStats.lanjutRagu}</span>
                                    <span className="card-lbl">Lanjut - Ragu</span>
                                </div>
                            </div>
                            <div className="summary-card-modern mix">
                                <div className="card-dot"></div>
                                <div className="card-content">
                                    <span className="card-val">{sessionStats.tidakRagu}</span>
                                    <span className="card-lbl">Tidak - Ragu</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </header>

                <div className="admin-grid">
                    {/* Queue Box */}
                    <div className="admin-card queue-box">
                        <div className="card-header">
                            <div className="header-title">
                                <Timer size={20} />
                                <h3>Kotak Antrean</h3>
                            </div>
                            <span className="count-badge">{allQueue.length} Antrean</span>
                        </div>
                        <div className="search-bar-container">
                            <Search size={16} />
                            <input
                                type="text"
                                placeholder="Cari nama atau nomor..."
                                value={queueSearch}
                                onChange={(e) => setQueueSearch(e.target.value)}
                            />
                        </div>
                        <div className="card-body scrollable">
                            {allQueue.length === 0 ? (
                                <div className="empty-state">Antrean kosong</div>
                            ) : (
                                allQueue
                                    .filter((item: any) => {
                                        const search = queueSearch.toLowerCase();
                                        return (
                                            item.pengirimNama?.toLowerCase().includes(search) ||
                                            item.penerimaNama?.toLowerCase().includes(search) ||
                                            (item.pengirimNomorUrut || item.pengirimNo || '').toString().includes(search) ||
                                            (item.penerimaNomorUrut || item.penerimaNo || '').toString().includes(search)
                                        );
                                    })
                                    .map((item: any) => (
                                        <div key={item.id} className="queue-item">
                                            <div className="pair-names">
                                                {/* Caller */}
                                                <div className="participant-row caller">
                                                    <div className="p-role-tag caller">Pemanggil</div>
                                                    <div className="p-main-box">
                                                        <span className="p-number-badge">{item.pengirimNomorUrut || item.pengirimNo || '-'}</span>
                                                        <span className="p-name">
                                                            {item.pengirimNama}
                                                            {item.pengirimKeterangan === 'pulang' && <span className="p-pulang-badge"> (Pulang)</span>}
                                                        </span>
                                                    </div>
                                                    <div className="p-meta-list">
                                                        <div className="p-sub-info">
                                                            <MapPin size={10} /> <span>{item.pengirimKota || '-'} / {item.pengirimDesa || '-'}</span>
                                                        </div>
                                                        <div className="p-sub-info">
                                                            <Phone size={10} /> <span>{item.pengirimWa || '-'}</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="heart-divider">
                                                    <div className="line"></div>
                                                    <Heart size={14} fill="#f43f5e" color="#f43f5e" />
                                                    <div className="line"></div>
                                                </div>

                                                {/* Called */}
                                                <div className="participant-row called">
                                                    <div className="p-role-tag called">Dipanggil</div>
                                                    <div className="p-main-box">
                                                        <span className="p-number-badge">{item.penerimaNomorUrut || item.penerimaNo || '-'}</span>
                                                        <span className="p-name">
                                                            {item.penerimaNama}
                                                            {item.penerimaKeterangan === 'pulang' && <span className="p-pulang-badge"> (Pulang)</span>}
                                                        </span>
                                                    </div>
                                                    <div className="p-meta-list">
                                                        <div className="p-sub-info">
                                                            <span>{item.penerimaKota || '-'} / {item.penerimaDesa || '-'}</span> <MapPin size={10} />
                                                        </div>
                                                        <div className="p-sub-info">
                                                            <span>{item.penerimaWa || '-'}</span> <Phone size={10} />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="queue-actions">
                                                <button 
                                                    className={`btn-validate ${(item.pengirimKeterangan === 'pulang' || item.penerimaKeterangan === 'pulang') ? 'btn-disabled' : ''}`} 
                                                    onClick={() => handleAssignToRoom(item.id, item.pengirimNama, item.penerimaNama, item.pengirimKeterangan, item.penerimaKeterangan)}
                                                >
                                                    Validasi & Masuk Room
                                                </button>
                                                <button className="btn-delete-queue" onClick={() => handleDeleteQueue(item)} title="Hapus Antrean">
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    ))
                            )}
                        </div>
                    </div>

                    {/* Rooms Box */}
                    <div className="admin-card rooms-box">
                        <div className="card-header">
                            <div className="header-title">
                                <DoorOpen size={20} />
                                <h3>Daftar Ruangan</h3>
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button className="btn-delete-all" onClick={handleDeleteAllRooms}>
                                    <Trash2 size={12} /> Clear All
                                </button>
                                <button className="btn-add-room-bulk" onClick={handleBulkCreateRooms}>
                                    <Plus size={14} /> +10 Rooms
                                </button>
                                <button className="btn-add-room" onClick={handleCreateRoom}>
                                    <Plus size={14} /> Create Ruangan
                                </button>
                            </div>
                        </div>
                        <div className="search-bar-container">
                            <Search size={16} />
                            <input
                                type="text"
                                placeholder="Cari nama, nomor peserta, atau nomor ruangan..."
                                value={roomSearch}
                                onChange={(e) => setRoomSearch(e.target.value)}
                            />
                        </div>
                        <div className="card-body grid-rooms">
                            {filteredRooms.length === 0 ? (
                                <div className="empty-state" style={{ gridColumn: '1/-1' }}>Tidak ada ruangan yang ditemukan</div>
                            ) : (
                                filteredRooms.map((room) => (
                                    <div key={room.id} className={`room-tile ${room.status?.toLowerCase()} ${room.status === "Terisi" && !room.startedAt ? "not-started" : ""}`}>
                                        <div className="room-top">
                                            <span className="room-name">{room.nama}</span>
                                            {room.status === "Terisi" && room.startedAt && (
                                                <RoomTimer startTime={room.startedAt} />
                                            )}
                                            <button className="btn-delete-room" onClick={() => handleDeleteRoom(room.id)}>
                                                <Trash2 size={14} />
                                            </button>
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
                                                    <div style={{ display: 'flex', gap: '4px', width: '100%', marginTop: '6px' }}>
                                                        {room.startedAt ? (
                                                            <button className="btn-clear" onClick={() => handleClearRoom(room.id)} style={{ flex: 1 }}>
                                                                <LogOut size={12} /> Selesaikan
                                                            </button>
                                                        ) : (
                                                            <button className="btn-start-timer" onClick={() => handleStartRoom(room.id)}>
                                                                <Timer size={12} fill="white" /> Mulai
                                                            </button>
                                                        )}
                                                        <button className="btn-undo-room" onClick={() => handleUndoRoom(room.id)} title="Undo / Kembalikan ke Antrean">
                                                            <Undo2 size={12} />
                                                        </button>
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

                    {/* Visit History Box */}
                    <div className="admin-card history-box">
                        <div className="card-header">
                            <div className="header-title">
                                <h3>Laporan Hasil Romantic Room Peserta & Panitia</h3>
                            </div>
                            <div className="manual-record-box">
                                <button className="btn-export-excel" onClick={handleExportExcel} style={{ marginRight: '10px', background: '#16a34a' }}>
                                    <Download size={16} /> Export Excel
                                </button>

                                <button className="btn-share-wa" onClick={handleShareWhatsApp} style={{ marginRight: '10px', background: '#25d366', color: 'white', border: 'none', padding: '4px 10px', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: '700', cursor: 'pointer' }}>
                                    <MessageSquare size={16} /> Kirim WhatsApp
                                </button>

                                <select
                                    className="dropdown-peserta"
                                    value={cityFilter}
                                    onChange={(e) => {
                                        setCityFilter(e.target.value);
                                        setVillageFilter("Semua Desa");
                                    }}
                                >
                                    <option value="Semua Kota">Semua Kota</option>
                                    {allCities.map(city => (
                                        <option key={city} value={city}>{city}</option>
                                    ))}
                                </select>

                                <select
                                    className="dropdown-peserta"
                                    value={villageFilter}
                                    onChange={(e) => setVillageFilter(e.target.value)}
                                >
                                    <option value="Semua Desa">Semua Desa</option>
                                    {allVillages
                                        .filter(v => cityFilter === "Semua Kota" || v.kota === cityFilter)
                                        .map(v => (
                                            <option key={v.id} value={v.nama}>{v.nama}</option>
                                        ))
                                    }
                                </select>

                                <select
                                    className="dropdown-peserta"
                                    value={resultFilter}
                                    onChange={(e) => setResultFilter(e.target.value)}
                                >
                                    <option value="Semua">Tampilkan Semua Hasil</option>
                                    <option value="Sedang Menunggu">Sedang Menunggu</option>
                                    <option value="Lanjut - Lanjut">Lanjut - Lanjut</option>
                                    <option value="Lanjut - Tidak Lanjut">Lanjut - Tidak Lanjut</option>
                                    <option value="Tidak Lanjut - Tidak Lanjut">Tidak Lanjut - Tidak Lanjut</option>
                                    <option value="Ragu-ragu - Ragu-ragu">Ragu-ragu - Ragu-ragu</option>
                                    <option value="Lanjut - Ragu-ragu">Lanjut - Ragu-ragu</option>
                                    <option value="Tidak Lanjut - Ragu-ragu">Tidak Lanjut - Ragu-ragu</option>
                                </select>
                                <span className="count-badge">{filteredData.length} Record</span>
                            </div>
                        </div>
                        <div className="card-body scrollable">
                            {filteredData.length === 0 ? (
                                <div className="empty-state">Tidak ada data yang sesuai dengan filter</div>
                            ) : (
                                <>
                                    {/* Desktop View */}
                                    <div className="desktop-only" style={{ overflowX: 'auto' }}>
                                        <table className="history-table">
                                            <thead>
                                                <tr>
                                                    <th>Nomor Peserta Pemilih</th>
                                                    <th>Nama Pemilih</th>
                                                    <th>Daerah / Desa Pemilih</th>
                                                    <th>WhatsApp Pemilih</th>
                                                    <th>Status Pemilih</th>
                                                    <th>Hasil Pemilih</th>
                                                    <th>Nomor Peserta Terpilih</th>
                                                    <th>Nama Terpilih</th>
                                                    <th>Daerah / Desa Terpilih</th>
                                                    <th>WhatsApp Terpilih</th>
                                                    <th>Status Terpilih</th>
                                                    <th>Hasil Terpilih</th>
                                                    <th className="text-center">Status</th>
                                                    <th className="text-center">Nomor Room</th>
                                                    <th className="text-center">Aksi</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {filteredData.map((item: any, idx) => (
                                                    <tr key={idx}>
                                                        <td>{item.pemilihNomorUrut || item.pemilihNo || '-'}</td>
                                                        <td className="font-bold">{item.pemilihNama}</td>
                                                        <td style={{ fontSize: '11px' }}>{item.pemilihKota || '-'} / {item.pemilihDesa || '-'}</td>
                                                        <td style={{ fontSize: '11px' }}>{item.pemilihWa || '-'}</td>
                                                        <td>{item.pemilihStatus}</td>
                                                        <td>
                                                            {item.pemilihHasil && (
                                                                <span className={`result-badge ${item.pemilihHasil === 'Lanjut' ? 'badge-success' :
                                                                    item.pemilihHasil === 'Ragu-ragu' ? 'badge-warning' :
                                                                        item.pemilihHasil === 'Menunggu' ? 'badge-info' :
                                                                            'badge-danger'
                                                                    }`}>
                                                                    {item.pemilihHasil}
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td>{item.terpilihNomorUrut || item.terpilihNo || '-'}</td>
                                                        <td className="font-bold">{item.terpilihNama}</td>
                                                        <td style={{ fontSize: '11px' }}>{item.terpilihKota || '-'} / {item.terpilihDesa || '-'}</td>
                                                        <td style={{ fontSize: '11px' }}>{item.terpilihWa || '-'}</td>
                                                        <td>{item.terpilihStatus}</td>
                                                        <td>
                                                            {item.terpilihHasil && (
                                                                <span className={`result-badge ${item.terpilihHasil === 'Lanjut' ? 'badge-success' :
                                                                    item.terpilihHasil === 'Ragu-ragu' ? 'badge-warning' :
                                                                        item.terpilihHasil === 'Menunggu' ? 'badge-info' :
                                                                            'badge-danger'
                                                                    }`}>
                                                                    {item.terpilihHasil}
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td className="text-center">
                                                            <span className={`status-badge-inline ${item.status === 'Menunggu' ? 'waiting' : 'finished'}`}>
                                                                {item.status}
                                                            </span>
                                                        </td>
                                                        <td className="text-center">
                                                            <span className="visit-count">{item.roomNama}</span>
                                                        </td>
                                                        <td className="text-center">
                                                            <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                                                                {!item.isQueue && (
                                                                    <>
                                                                        <button className="btn-act btn-edit" onClick={() => handleEditRecord(item)} title="Edit Hasil">✏️</button>
                                                                        <button className="btn-act btn-del" onClick={() => handleDeleteRecord(item)} title="Hapus Permanen">🗑️</button>
                                                                    </>
                                                                )}
                                                                {item.isQueue && (
                                                                    <button className="btn-act btn-del" onClick={() => handleDeleteQueue(item)} title="Hapus Antrean">🗑️</button>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* Mobile Card View */}
                                    <div className="mobile-only">
                                        {filteredData.map((item: any, idx) => (
                                            <div key={idx} className="mobile-history-card">
                                                <div className="card-top-row">
                                                    <span className={`status-badge-inline ${item.status === 'Menunggu' ? 'waiting' : 'finished'}`}>
                                                        {item.status}
                                                    </span>
                                                    <span className="visit-count">{item.roomNama}</span>
                                                </div>

                                                <div className="member-section voter">
                                                    <div className="member-label">Pemilih</div>
                                                    <div className="member-details">
                                                        <div className="member-header">
                                                            <span className="member-no">#{item.pemilihNomorUrut || item.pemilihNo || '-'}</span>
                                                            <span className="member-name">{item.pemilihNama}</span>
                                                            <span className="member-status-tag">{item.pemilihStatus}</span>
                                                        </div>
                                                        <div className="member-subtext">{item.pemilihKota || '-'} / {item.pemilihDesa || '-'}</div>
                                                        <div className="member-subtext">WA: {item.pemilihWa || '-'}</div>
                                                        <div className="member-result">
                                                            {item.pemilihHasil && (
                                                                <span className={`result-badge ${item.pemilihHasil === 'Lanjut' ? 'badge-success' :
                                                                    item.pemilihHasil === 'Ragu-ragu' ? 'badge-warning' :
                                                                        item.pemilihHasil === 'Menunggu' ? 'badge-info' :
                                                                            'badge-danger'
                                                                    }`}>
                                                                    Hasil: {item.pemilihHasil}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="heart-divider" style={{ margin: '8px 0' }}>
                                                    <div className="line"></div>
                                                    <span style={{ fontSize: '12px' }}>❤️</span>
                                                    <div className="line"></div>
                                                </div>

                                                <div className="member-section voted">
                                                    <div className="member-label">Terpilih</div>
                                                    <div className="member-details">
                                                        <div className="member-header">
                                                            <span className="member-no">#{item.terpilihNomorUrut || item.terpilihNo || '-'}</span>
                                                            <span className="member-name">{item.terpilihNama}</span>
                                                            <span className="member-status-tag">{item.terpilihStatus}</span>
                                                        </div>
                                                        <div className="member-subtext">{item.terpilihKota || '-'} / {item.terpilihDesa || '-'}</div>
                                                        <div className="member-subtext">WA: {item.terpilihWa || '-'}</div>
                                                        <div className="member-result">
                                                            {item.terpilihHasil && (
                                                                <span className={`result-badge ${item.terpilihHasil === 'Lanjut' ? 'badge-success' :
                                                                    item.terpilihHasil === 'Ragu-ragu' ? 'badge-warning' :
                                                                        item.terpilihHasil === 'Menunggu' ? 'badge-info' :
                                                                            'badge-danger'
                                                                    }`}>
                                                                    Hasil: {item.terpilihHasil}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="card-actions-row">
                                                    {!item.isQueue && (
                                                        <>
                                                            <button className="btn-act-mobile btn-edit-mobile" onClick={() => handleEditRecord(item)}>✏️ Edit Hasil</button>
                                                            <button className="btn-act-mobile btn-del-mobile" onClick={() => handleDeleteRecord(item)}>🗑️ Hapus</button>
                                                        </>
                                                    )}
                                                    {item.isQueue && (
                                                        <button className="btn-act-mobile btn-del-mobile" style={{ width: '100%' }} onClick={() => handleDeleteQueue(item)}>🗑️ Hapus Antrean</button>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                <style jsx>{`
                    .admin-layout { max-width: 1400px; padding: 20px; margin: 0 auto; background: #f8fafc; min-height: 100vh; }
                    .room-header-modern { margin-bottom: 25px; }
                    .header-top { display: flex; justify-content: space-between; align-items: flex-start; gap: 20px; }
                    .title-area h1 { font-size: 28px; font-weight: 900; color: #1e293b; margin: 0; display: flex; align-items: center; gap: 10px; }
                    .title-area h1 span { color: #f43f5e; }
                    .sparkle-icon { color: #f43f5e; animation: float 3s ease-in-out infinite; }
                    .title-area p { color: #64748b; margin: 5px 0 0; font-size: 14px; }
                    
                    .stats-row { display: flex; gap: 12px; }
                    .mini-stat { background: white; padding: 10px 15px; border-radius: 12px; border: 1px solid #e2e8f0; display: flex; align-items: center; gap: 12px; box-shadow: 0 2px 4px rgba(0,0,0,0.02); }
                    .mini-stat svg { color: #f43f5e; }
                    .ms-content { display: flex; flex-direction: column; }
                    .ms-label { font-size: 10px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; }
                    .ms-value { font-size: 16px; font-weight: 800; color: #1e293b; line-height: 1.2; }

                    .summary-section-container { margin-top: 20px; }
                    .summary-grid-modern { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 12px; }
                    .summary-card-modern { background: white; padding: 12px 16px; border-radius: 14px; border: 1px solid #e2e8f0; display: flex; align-items: center; gap: 12px; transition: all 0.2s; position: relative; overflow: hidden; }
                    .summary-card-modern:hover { transform: translateY(-2px); border-color: #fecdd3; }
                    .card-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
                    .match .card-dot { background: #16a34a; box-shadow: 0 0 8px rgba(22, 163, 74, 0.4); }
                    .one-sided .card-dot { background: #d97706; box-shadow: 0 0 8px rgba(217, 119, 6, 0.4); }
                    .reject .card-dot { background: #dc2626; box-shadow: 0 0 8px rgba(220, 38, 38, 0.4); }
                    .ragu .card-dot { background: #6366f1; box-shadow: 0 0 8px rgba(99, 102, 241, 0.4); }
                    .mix .card-dot { background: #94a3b8; box-shadow: 0 0 8px rgba(148, 163, 184, 0.4); }
                    
                    .card-content { display: flex; flex-direction: column; }
                    .card-val { font-size: 18px; font-weight: 900; color: #1e293b; line-height: 1; }
                    .card-lbl { font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 2px; }

                    .admin-grid { display: grid; grid-template-columns: 320px 1fr; gap: 20px; }
                    .admin-card { background: white; border-radius: 16px; border: 1px solid #e2e8f0; display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.03); transition: all 0.3s; }
                    .admin-card:hover { box-shadow: 0 10px 30px rgba(0,0,0,0.05); border-color: #fecdd3; }
                    .queue-box { height: 0; min-height: 100%; }
                    
                    .card-header { padding: 15px 20px; border-bottom: 1px solid #f1f5f9; display: flex; justify-content: space-between; align-items: center; background: #fff; }
                    .header-title { display: flex; align-items: center; gap: 10px; color: #1e293b; }
                    .header-title svg { color: #f43f5e; }
                    .header-title h3 { font-size: 15px; font-weight: 800; margin: 0; }
                    .count-badge { background: #fef2f2; color: #f43f5e; padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 800; }
                    
                    .search-bar-container { padding: 12px 15px; border-bottom: 1px solid #f1f5f9; display: flex; align-items: center; gap: 10px; background: #fff; }
                    .search-bar-container svg { color: #94a3b8; }
                    .search-bar-container input { border: none; background: transparent; font-size: 12px; color: #1e293b; width: 100%; outline: none; font-weight: 600; }
                    .search-bar-container input::placeholder { color: #cbd5e1; }
                    
                    .card-body { padding: 15px; flex: 1; }
                    .scrollable { max-height: 600px; overflow-y: auto; padding-right: 5px; }
                    .scrollable::-webkit-scrollbar { width: 4px; }
                    .scrollable::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
                    .queue-box .card-body { display: flex; flex-direction: column; min-height: 0; }
                    .queue-box .scrollable { flex: 1; max-height: none; }
                    
                    .empty-state { text-align: center; color: #94a3b8; padding: 40px 20px; font-style: italic; font-size: 13px; display: flex; flex-direction: column; align-items: center; gap: 10px; }

                    .queue-item { background: #fff; border: 1px solid #f1f5f9; padding: 12px; border-radius: 12px; margin-bottom: 10px; transition: all 0.2s; position: relative; }
                    .queue-item:hover { transform: translateY(-2px); border-color: #fecdd3; background: #fffcfc; }
                    
                    .pair-names { display: flex; flex-direction: column; gap: 0; margin-bottom: 15px; width: 100%; }
                    .participant-row { display: flex; flex-direction: column; min-width: 0; width: 100%; }
                    .participant-row.called { align-items: flex-end; }
                    
                    .p-role-tag { font-size: 8px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 6px; padding: 2px 8px; border-radius: 4px; display: inline-block; }
                    .p-role-tag.caller { background: #fff1f2; color: #f43f5e; }
                    .p-role-tag.called { background: #f1f5f9; color: #64748b; }
                    
                    .p-main-box { display: flex; align-items: flex-start; gap: 10px; width: 100%; }
                    .participant-row.called .p-main-box { flex-direction: row-reverse; text-align: right; }
                    
                    .p-number-badge { background: #1e293b; color: white; padding: 3px 8px; border-radius: 6px; font-size: 11px; font-weight: 800; min-width: 32px; text-align: center; flex-shrink: 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1); margin-top: 1px; }
                    .p-name { color: #1e293b; font-size: 14px; font-weight: 800; line-height: 1.4; word-break: break-word; flex: 1; }
                    
                    .p-meta-list { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 6px; }
                    .participant-row.called .p-meta-list { justify-content: flex-end; }
                    
                    .p-sub-info { font-size: 10px; color: #64748b; display: flex; align-items: center; gap: 4px; font-weight: 600; }
                    .p-sub-info svg { color: #94a3b8; flex-shrink: 0; }
                    
                    .heart-divider { display: flex; align-items: center; gap: 12px; margin: 15px 0; width: 100%; }
                    .heart-divider .line { flex: 1; height: 1px; background: #f1f5f9; }
                    
                    .queue-actions { display: flex; gap: 8px; border-top: 1px solid #f1f5f9; padding-top: 15px; margin-top: 5px; }
                    .btn-validate { flex: 1; background: linear-gradient(135deg, #f43f5e 0%, #e11d48 100%); color: white; border: none; padding: 8px; border-radius: 8px; font-size: 11px; font-weight: 800; cursor: pointer; transition: all 0.2s; box-shadow: 0 4px 12px rgba(244, 63, 94, 0.2); }
                    .btn-validate:hover { transform: translateY(-1px); box-shadow: 0 6px 15px rgba(244, 63, 94, 0.3); }
                    .btn-validate.btn-disabled { background: #cbd5e1 !important; color: #94a3b8 !important; cursor: not-allowed !important; box-shadow: none !important; transform: none !important; }
                    .p-pulang-badge { color: #ef4444; font-size: 11px; font-weight: 800; margin-left: 4px; }
                    .btn-delete-queue { background: #fef2f2; color: #dc2626; border: 1px solid #fee2e2; padding: 8px; border-radius: 8px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; }
                    .btn-delete-queue:hover { background: #fee2e2; color: #b91c1c; }
                    
                    .btn-add-room { background: #1e293b; color: white; border: none; padding: 6px 12px; border-radius: 8px; display: flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 700; cursor: pointer; transition: all 0.2s; }
                    .btn-add-room:hover { background: #334155; transform: translateY(-1px); }
                    .btn-add-room-bulk { background: #0891b2; color: white; border: none; padding: 6px 12px; border-radius: 8px; display: flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 700; cursor: pointer; transition: all 0.2s; }
                    .btn-add-room-bulk:hover { background: #0e7490; transform: translateY(-1px); }
                    .btn-delete-all { background: #f43f5e; color: white; border: none; padding: 6px 12px; border-radius: 8px; display: flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 700; cursor: pointer; transition: all 0.2s; }
                    .btn-delete-all:hover { background: #e11d48; transform: translateY(-1px); }
                    
                    .grid-rooms { 
                        display: grid; 
                        grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); 
                        gap: 15px; 
                    }
                    
                    .room-tile { min-width: 0; border-radius: 12px; border: 1px solid #e2e8f0; padding: 12px; display: flex; flex-direction: column; gap: 10px; transition: all 0.3s; background: white; }
                    .room-tile.terisi { background: #f0fdf4; border-color: #bbf7d0; box-shadow: 0 4px 12px rgba(34, 197, 94, 0.05); }
                    .room-tile.terisi.not-started { background: #fffbeb; border-color: #fde68a; box-shadow: 0 4px 12px rgba(245, 158, 11, 0.04); }
                    .room-tile.kosong { background: #fff1f2; border-color: #fecdd3; opacity: 0.8; }
                    .room-tile:hover { transform: scale(1.02); }
                    
                    .room-top { display: flex; justify-content: space-between; align-items: flex-start; }
                    .room-name { font-weight: 800; font-size: 12px; color: #1e293b; }
                    .btn-delete-room { color: #94a3b8; background: none; border: none; cursor: pointer; padding: 0; transition: color 0.2s; }
                    .btn-delete-room:hover { color: #ef4444; }
                    
                    .room-middle { min-height: 45px; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; gap: 8px; }
                    .empty-label { color: #f43f5e; font-weight: 900; font-size: 10px; text-transform: uppercase; letter-spacing: 1px; }
                    
                    .occupied-pair { display: flex; flex-direction: column; gap: 6px; width: 100%; }
                    .pair-member { display: flex; align-items: center; gap: 6px; justify-content: center; min-width: 0; }
                    .room-p-number { background: #166534; color: white; padding: 1px 4px; border-radius: 4px; font-size: 9px; font-weight: 800; flex-shrink: 0; }
                    .room-p-name { font-size: 11px; font-weight: 700; color: #166534; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
                    .pair-separator { font-size: 10px; color: #166534; opacity: 0.4; font-weight: 800; }
                    
                    .btn-clear { background: #166534; color: white; border: none; border-radius: 6px; padding: 4px 8px; font-size: 10px; font-weight: 800; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 4px; width: 100%; transition: all 0.2s; }
                    .btn-clear:hover { background: #14532d; transform: scale(1.02); }
                    .btn-start-timer { background: #d97706; color: white; border: none; border-radius: 6px; padding: 4px 8px; font-size: 10px; font-weight: 800; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 4px; width: 100%; transition: all 0.2s; }
                    .btn-start-timer:hover { background: #b45309; transform: scale(1.02); }
                    
                    .btn-undo-room { background: #64748b; color: white; border: none; border-radius: 6px; padding: 4px 8px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; }
                    .btn-undo-room:hover { background: #475569; transform: scale(1.05); }
                    
                    .room-footer { border-top: 1px solid rgba(0,0,0,0.05); padding-top: 8px; display: flex; align-items: center; gap: 6px; font-size: 9px; font-weight: 800; text-transform: uppercase; color: #64748b; }
                    .status-dot { width: 6px; height: 6px; border-radius: 50%; }
                    .status-dot.kosong { background: #f43f5e; box-shadow: 0 0 8px rgba(244, 63, 94, 0.4); }
                    .status-dot.terisi { background: #22c55e; box-shadow: 0 0 8px rgba(34, 197, 94, 0.4); }

                    .history-box { grid-column: span 2; margin-top: 10px; }
                    .history-table { width: 100%; border-collapse: separate; border-spacing: 0; }
                    .history-table th { text-align: center; font-size: 11px; color: #64748b; padding: 15px 10px; border-bottom: 2px solid #f1f5f9; text-transform: uppercase; letter-spacing: 0.5px; }
                    .history-table td { padding: 12px 10px; border-bottom: 1px solid #f1f5f9; font-size: 13px; text-align: center; color: #1e293b; }
                    .history-table tr:hover td { background: #f8fafc; }
                    .history-table tr:last-child td { border: none; }
                    
                    .visit-count { background: #f0f9ff; color: #0369a1; padding: 2px 8px; border-radius: 12px; font-weight: 800; font-size: 11px; border: 1px solid #bae6fd; }

                    .desktop-only { display: block; }
                    .mobile-only { display: none; }

                    .mobile-history-card {
                        background: white;
                        border: 1px solid #e2e8f0;
                        border-radius: 12px;
                        padding: 16px;
                        display: flex;
                        flex-direction: column;
                        gap: 12px;
                        box-shadow: 0 2px 4px rgba(0,0,0,0.02);
                        text-align: left;
                    }

                    .card-top-row {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                    }

                    .member-section {
                        display: flex;
                        flex-direction: column;
                        gap: 6px;
                    }

                    .member-label {
                        font-size: 10px;
                        font-weight: 800;
                        text-transform: uppercase;
                        letter-spacing: 0.5px;
                        color: #94a3b8;
                    }

                    .member-details {
                        display: flex;
                        flex-direction: column;
                        gap: 4px;
                    }

                    .member-header {
                        display: flex;
                        align-items: center;
                        gap: 8px;
                        flex-wrap: wrap;
                    }

                    .member-no {
                        background: #f1f5f9;
                        color: #475569;
                        padding: 1px 6px;
                        border-radius: 4px;
                        font-size: 11px;
                        font-weight: 800;
                    }

                    .member-name {
                        font-size: 14px;
                        font-weight: 700;
                        color: #1e293b;
                    }

                    .member-status-tag {
                        background: #f8fafc;
                        border: 1px solid #e2e8f0;
                        color: #64748b;
                        padding: 1px 6px;
                        border-radius: 4px;
                        font-size: 9px;
                        font-weight: 700;
                    }

                    .member-subtext {
                        font-size: 12px;
                        color: #64748b;
                    }

                    .member-result {
                        margin-top: 4px;
                    }

                    .card-actions-row {
                        display: flex;
                        gap: 8px;
                        border-top: 1px solid #f1f5f9;
                        padding-top: 12px;
                    }

                    .btn-act-mobile {
                        flex: 1;
                        border: none;
                        border-radius: 8px;
                        padding: 8px;
                        font-size: 12px;
                        font-weight: 700;
                        cursor: pointer;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        gap: 4px;
                        transition: background 0.2s;
                    }

                    .btn-edit-mobile {
                        background: #eff6ff;
                        color: #2563eb;
                    }
                    .btn-edit-mobile:hover {
                        background: #dbeafe;
                    }

                    .btn-del-mobile {
                        background: #fef2f2;
                        color: #dc2626;
                    }
                    .btn-del-mobile:hover {
                        background: #fee2e2;
                    }
                    .font-bold { font-weight: 700; color: #1e293b; }
                    
                    .manual-record-box { display: flex; align-items: center; gap: 12px; }
                    .dropdown-peserta { padding: 8px 12px; border-radius: 10px; border: 1px solid #e2e8f0; font-size: 13px; font-weight: 600; outline: none; min-width: 150px; background: white; cursor: pointer; }
                    .dropdown-peserta:focus { border-color: #f43f5e; box-shadow: 0 0 0 3px rgba(244, 63, 94, 0.1); }

                    @keyframes float {
                        0% { transform: translateY(0); }
                        50% { transform: translateY(-5px); }
                        100% { transform: translateY(0); }
                    }

                    @media (max-width: 1024px) {
                        .admin-grid { grid-template-columns: 1fr; }
                        .history-box { grid-column: span 1; }
                        .header-top { flex-direction: column; }
                        .stats-row { width: 100%; overflow-x: auto; padding-bottom: 5px; }
                        .queue-box { height: auto; min-height: 0; }
                        .queue-box .scrollable { max-height: 600px; }
                    }

                    @media (max-width: 768px) {
                        .desktop-only { display: none; }
                        .mobile-only { display: flex; flex-direction: column; gap: 12px; }
                        .manual-record-box { flex-direction: column; align-items: stretch; width: 100%; gap: 8px; }
                        .manual-record-box select, .manual-record-box button { width: 100%; margin-right: 0 !important; }
                        .card-header { flex-direction: column; align-items: flex-start; gap: 12px; }
                    }
                    .btn-record-manual { background: #1e293b; color: white; border: none; padding: 4px 10px; border-radius: 6px; display: flex; align-items: center; gap: 4px; font-size: 11px; font-weight: 700; cursor: pointer; transition: all 0.2s; }
                    .btn-record-manual:hover { background: #334155; }
                    .btn-export-excel { background: #16a34a; color: white; border: none; padding: 4px 10px; border-radius: 6px; display: flex; align-items: center; gap: 4px; font-size: 11px; font-weight: 700; cursor: pointer; transition: all 0.2s; }
                    .btn-export-excel:hover { background: #15803d; }

                    .result-badge { 
                        padding: 4px 10px; 
                        border-radius: 4px; 
                        font-size: 10px; 
                        font-weight: 800; 
                        text-transform: uppercase;
                        color: white !important;
                    }
                    .result-badge.badge-success { background: #16a34a; }
                    .result-badge.badge-warning { background: #d97706; }
                    .result-badge.badge-danger { background: #dc2626; }
                    .result-badge.badge-info { background: #0891b2; }

                    .status-badge-inline {
                        padding: 3px 8px;
                        border-radius: 6px;
                        font-size: 10px;
                        font-weight: 800;
                        text-transform: uppercase;
                        display: inline-block;
                    }
                    .status-badge-inline.waiting { background: #fff1f2; color: #f43f5e; border: 1px solid #fecdd3; }
                    .status-badge-inline.finished { background: #f0fdf4; color: #16a34a; border: 1px solid #bbf7d0; }
                    .btn-act { border: none; border-radius: 4px; padding: 3px 7px; font-size: 12px; cursor: pointer; transition: opacity 0.2s; }
                    .btn-act:hover { opacity: 0.75; }
                    .btn-edit { background: #eff6ff; }
                    .btn-del { background: #fef2f2; }

                    .room-timer-badge {
                        display: flex;
                        align-items: center;
                        gap: 4px;
                        background: #f1f5f9;
                        padding: 2px 6px;
                        border-radius: 4px;
                        font-size: 10px;
                        font-weight: 800;
                        color: #1e293b;
                        border: 1px solid #e2e8f0;
                    }
                    .room-timer-badge.over {
                        background: #dc2626;
                        color: white !important;
                        border-color: #b91c1c;
                        animation: pulse 0.6s infinite;
                        font-weight: 950;
                        box-shadow: 0 0 12px rgba(220, 38, 38, 0.4);
                    }
                    .room-timer-badge.not-started {
                        background: #f8fafc;
                        color: #64748b !important;
                        border-color: #cbd5e1;
                    }
                    @keyframes pulse {
                        0% { opacity: 1; }
                        50% { opacity: 0.5; }
                        100% { opacity: 1; }
                    }

                    .user-timer-wrapper {
                        margin-top: 15px;
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        gap: 5px;
                    }
                    .user-timer-wrapper :global(.room-timer-badge) {
                        font-size: 24px;
                        padding: 10px 25px;
                        border-radius: 12px;
                        gap: 10px;
                    }
                    .user-timer-wrapper :global(.room-timer-badge svg) {
                        width: 24px;
                        height: 24px;
                    }
                    .timer-label {
                        font-size: 11px;
                        font-weight: 700;
                        text-transform: uppercase;
                        letter-spacing: 1px;
                        color: #64748b;
                    }
                `}</style>
            </div>
        );
    }

    // User View
    if (myRoom) {
        const partnerName = myRoom.pengirimNama === myProfile?.nama ? myRoom.penerimaNama : myRoom.pengirimNama;
        return (
            <div className="romantic-container">
                <header className="room-header">
                    <h1>Romantic <span>Room</span> <Sparkles size={24} color="#f43f5e" /></h1>
                    <p>Selamat! Anda telah masuk ke ruangan <b>{myRoom.nama}</b></p>
                    <div className="user-timer-wrapper">
                        <RoomTimer startTime={myRoom.startedAt} />
                        <span className="timer-label">
                            {myRoom.startedAt ? "Sisa Waktu Sesi" : "Menunggu Admin Memulai Sesi"}
                        </span>
                    </div>
                </header>

                <div className="room-card">
                    <div className="partner-section">
                        <div className="partner-avatar">
                            <div className="avatar-placeholder">{partnerName?.charAt(0) || "P"}</div>
                        </div>
                        <div className="partner-info">
                            <h2>{partnerName}</h2>
                            <p className="partner-tagline">Teman Obrolan Anda</p>
                        </div>
                    </div>

                    <div className="room-content">
                        {!showSurvey ? (
                            <div className="welcome-chat">
                                <div className="chat-bubble">
                                    <p>Silakan nikmati waktu Anda di <b>{myRoom.nama}</b> bersama <b>{partnerName}</b>. Setelah sesi obrolan selesai, mohon lengkapi kuisioner di bawah ini.</p>
                                </div>
                                <button className="btn-start-survey" onClick={() => setShowSurvey(true)}>
                                    <ClipboardList size={20} />
                                    Isi Kuisioner Pertemuan
                                </button>
                            </div>
                        ) : (
                            <form className="survey-form" onSubmit={handleSubmitSurvey}>
                                <h3 className="form-title">Kuisioner Pertemuan</h3>
                                <div className="form-grid">
                                    <div className="form-group">
                                        <label>Nama PNKB</label>
                                        <input value={form.namaPnkb} onChange={e => setForm({ ...form, namaPnkb: e.target.value })} placeholder="Nama pendamping..." />
                                    </div>
                                    <div className="form-group">
                                        <label>No. HP PNKB</label>
                                        <input value={form.noHpPnkb} onChange={e => setForm({ ...form, noHpPnkb: e.target.value })} placeholder="08xxxx" />
                                    </div>
                                    <div className="form-group span-2">
                                        <label>Lawan Bicara</label>
                                        <div className="readonly-info">{partnerName}</div>
                                    </div>
                                    <div className="form-group span-2">
                                        <label>Tanggapan Anda</label>
                                        <div className="tanggapan-options">
                                            {["Baik", "Humble", "Pendiam", "Penyabar", "Friendly"].map(opt => (
                                                <button
                                                    key={opt}
                                                    type="button"
                                                    className={form.tanggapan === opt ? "active" : ""}
                                                    onClick={() => setForm({ ...form, tanggapan: opt })}
                                                >
                                                    {opt}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="form-group span-2">
                                        <label>Hasil Pertemuan</label>
                                        <div className="radio-group-pdkt">
                                            {["Lanjut", "Ragu-ragu", "Tidak Lanjut"].map(opt => (
                                                <button key={opt} type="button" className={form.rekomendasi === opt ? "active" : ""} onClick={() => setForm({ ...form, rekomendasi: opt })}>{opt}</button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                                <div className="form-actions">
                                    <button type="button" className="btn-cancel-room" onClick={() => setShowSurvey(false)}>Batal</button>
                                    <button type="button" className="btn-pdf-room" onClick={handleExportPDF}><Download size={18} /> PDF</button>
                                    <button type="submit" className="btn-submit-room"><Send size={18} /> Kirim & Selesai</button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>

                <style jsx>{`
                    .romantic-container { padding: 40px 20px; max-width: 800px; margin: 0 auto; min-height: 100vh; }
                    .room-header { margin-bottom: 40px; text-align: center; }
                    .room-header h1 { font-size: 36px; font-weight: 900; color: #1e293b; display: flex; align-items: center; justify-content: center; gap: 12px; }
                    .room-header h1 span { color: #f43f5e; }
                    .room-header p { color: #64748b; margin-top: 10px; font-size: 15px; }
                    .room-card { background: white; border-radius: 30px; overflow: hidden; box-shadow: 0 25px 50px -12px rgba(244, 63, 94, 0.15); border: 1px solid #fecdd3; }
                    .partner-section { background: linear-gradient(135deg, #fb7185 0%, #f43f5e 100%); padding: 40px; display: flex; align-items: center; gap: 30px; color: white; }
                    .partner-avatar { width: 80px; height: 80px; border-radius: 50%; background: white; display: flex; align-items: center; justify-content: center; font-size: 32px; font-weight: 800; color: #fb7185; border: 4px solid rgba(255,255,255,0.3); }
                    .partner-info h2 { font-size: 24px; font-weight: 800; margin: 0; }
                    .partner-tagline { font-size: 12px; text-transform: uppercase; letter-spacing: 1px; opacity: 0.8; }
                    .room-content { padding: 40px; }
                    .welcome-chat { text-align: center; }
                    .chat-bubble { background: #fef2f2; padding: 24px; border-radius: 20px; color: #9f1239; font-size: 15px; margin-bottom: 30px; border: 1px dashed #fda4af; }
                    .btn-start-survey { background: #f43f5e; color: white; border: none; padding: 16px 32px; border-radius: 16px; font-weight: 800; cursor: pointer; display: inline-flex; align-items: center; gap: 10px; }
                    .survey-form { animation: slideUp 0.4s ease-out; }
                    .form-title { font-size: 18px; font-weight: 800; border-left: 4px solid #f43f5e; padding-left: 12px; margin-bottom: 20px; }
                    .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
                    .span-2 { grid-column: span 2; }
                    .form-group label { display: block; font-size: 13px; font-weight: 700; margin-bottom: 8px; color: #64748b; }
                    .form-group input { width: 100%; padding: 12px; border-radius: 10px; border: 1px solid #e2e8f0; }
                    .readonly-info { background: #f8fafc; padding: 12px; border-radius: 10px; color: #1e293b; font-weight: 700; }
                    .tanggapan-options { display: flex; flex-wrap: wrap; gap: 8px; }
                    .tanggapan-options button { padding: 8px 16px; border-radius: 20px; border: 1px solid #e2e8f0; background: white; cursor: pointer; font-size: 13px; }
                    .tanggapan-options button.active { background: #f43f5e; color: white; border-color: #f43f5e; }
                    .radio-group-pdkt { display: flex; gap: 10px; }
                    .radio-group-pdkt button { flex: 1; padding: 12px; border-radius: 10px; border: 1px solid #e2e8f0; background: white; font-weight: 700; cursor: pointer; font-size: 14px; }
                    .radio-group-pdkt button.active { border-color: #f43f5e; background: #fff1f2; color: #f43f5e; }
                    .form-actions { display: flex; justify-content: flex-end; gap: 12px; margin-top: 30px; }
                    .btn-submit-room { background: #f43f5e; color: white; border: none; padding: 12px 20px; border-radius: 10px; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 8px; }
                    .btn-pdf-room { background: white; border: 1px solid #e2e8f0; padding: 12px; border-radius: 10px; cursor: pointer; }
                    .btn-cancel-room { border: none; background: none; color: #94a3b8; font-weight: 700; cursor: pointer; }
                    .room-loading { padding: 100px; text-align: center; color: #f43f5e; font-weight: 800; font-size: 20px; }
                    @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
                `}</style>
            </div>
        );
    }

    if (myQueueStatus) {
        return (
            <div className="romantic-container empty-state-view">
                <Timer size={64} style={{ color: '#fda4af', marginBottom: 20 }} />
                <h2>Sedang Dalam Antrean</h2>
                <p>Anda sudah memilih <b>{myQueueStatus.penerimaNama || "Peserta"}</b>. Mohon tunggu admin melakukan validasi untuk masuk keruangan pertemuan.</p>
                <div className="queue-badge">Status: Menunggu Antrean</div>

                <style jsx>{`
                    .romantic-container { padding: 40px 20px; max-width: 800px; margin: 0 auto; min-height: 100vh; }
                    .empty-state-view { text-align: center; padding: 100px 40px; background: white; border-radius: 20px; border: 2px dashed #fecdd3; display: flex; flex-direction: column; align-items: center; margin-top: 40px; }
                    .queue-badge { margin-top: 20px; background: #fff1f2; color: #f43f5e; padding: 8px 20px; border-radius: 20px; font-weight: 800; text-transform: uppercase; font-size: 12px; }
                    h2 { color: #1e293b; font-weight: 800; }
                    p { color: #64748b; max-width: 400px; line-height: 1.6; }
                `}</style>
            </div>
        );
    }

    return (
        <div className="romantic-container empty-state-view">
            <Heart size={64} style={{ color: '#fda4af', marginBottom: 20 }} />
            <h2>Belum Ada Pertemuan Aktif</h2>
            <p>Silakan lakukan pemilihan peserta di Katalog PDKT terlebih dahulu.</p>
            <style jsx>{`
                .romantic-container { padding: 40px 20px; max-width: 800px; margin: 0 auto; min-height: 100vh; }
                .empty-state-view { text-align: center; padding: 100px 40px; background: white; border-radius: 20px; border: 2px dashed #fecdd3; display: flex; flex-direction: column; align-items: center; margin-top: 40px; }
                h2 { color: #1e293b; font-weight: 800; }
                p { color: #64748b; max-width: 400px; line-height: 1.6; }
            `}</style>
        </div>
    );
}
