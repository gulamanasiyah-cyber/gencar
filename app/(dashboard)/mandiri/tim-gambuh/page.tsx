"use client";

import Topbar from "@/components/Topbar";
import { useState, useEffect, useCallback, useRef } from "react";
import Swal from "sweetalert2";
import {
    Timer, LogOut, Search, Undo2, RefreshCw, BookOpen, FileSpreadsheet, QrCode, X, CheckCircle, Camera
} from "lucide-react";
import { getPusherClient } from "@/lib/pusher-client";
import Link from "next/link";
import * as XLSX from "xlsx";

const pad2 = (n: number) => String(n).padStart(2, "0");

function formatWaktuIndonesia(value: any): string {
    if (!value) return "-";
    const d = new Date(value);
    if (isNaN(d.getTime())) return "-";
    return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()} ${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
}

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
    const [selectedRoom, setSelectedRoom] = useState<any>(null);
    const [visitHistory, setVisitHistory] = useState<any[]>([]);
    const [queueData, setQueueData] = useState<any[]>([]);
    const [reportSearch, setReportSearch] = useState("");
    const [resultFilter, setResultFilter] = useState("Semua");
    
    // Scanner Absensi
    const [showAbsenScanner, setShowAbsenScanner] = useState(false);
    const [scanFeedback, setScanFeedback] = useState<any>(null);
    const [isScanning, setIsScanning] = useState(false);
    const [hasAttended, setHasAttended] = useState(false);
    const absenScannerRef = useRef<any>(null);

    const saveCurrentIdentity = useCallback((identity: any) => {
        const normalizedId = String(identity?.id || "").trim();
        const normalizedNama = String(identity?.nama || "").trim();
        const normalizedTipe = String(identity?.tipe || "").trim();

        if (!normalizedId) return;

        try {
            localStorage.setItem("my_tim_pnkb_gambuh_id", normalizedId);
            localStorage.setItem("my_tim_pnkb_gambuh_nama", normalizedNama);
            if (normalizedTipe) {
                localStorage.setItem("my_tim_pnkb_gambuh_tipe", normalizedTipe);
            }
        } catch (storageErr) {
            console.warn("Gagal menyimpan identitas Tim Gambuh di browser:", storageErr);
        }

        setMyId(normalizedId);
        setMyName(normalizedNama);
    }, []);

    const showSelectIdentityModal = useCallback(async (forced = false) => {
        Swal.fire({
            title: 'Memuat Data...',
            text: 'Mengambil daftar pendamping...',
            allowOutsideClick: !forced,
            allowEscapeKey: !forced,
            showConfirmButton: false,
            didOpen: () => { Swal.showLoading(); }
        });

        try {
            const res = await fetch("/api/admin/tim-gambuh");
            if (!res.ok) throw new Error("Gagal mengambil data");
            let data: any[] = await res.json();
            Swal.close();

            const buildOptionHtml = (list: any[]) =>
                list.map(item => `<option value="${item.id}">${item.nama} (${item.tipe})</option>`).join('');

            // Removed currentSavedId logic so it always defaults to empty

            const { value: selectedId, isConfirmed } = await Swal.fire({
                title: 'Pilih Identitas Anda',
                html: `
                    <p style="font-size:13px;color:#64748b;margin:0 0 10px;">Pilih nama Anda dari daftar Tim PNKB &amp; Ibu Gambuh:</p>
                    <select id="swal-identity" style="width:100%;padding:8px 10px;border:1px solid #d1d5db;border-radius:8px;font-size:14px;color:#1e293b;background:#fff;outline:none;cursor:pointer;">
                        <option value="">-- Pilih Nama Anda --</option>
                        ${buildOptionHtml(data)}
                    </select>
                    <div style="margin-top:14px;border-top:1px solid #e2e8f0;padding-top:12px;text-align:left;">
                        <button type="button" id="btn-toggle-add" style="background:none;border:none;color:#3b82f6;font-size:13px;font-weight:600;cursor:pointer;padding:0;display:flex;align-items:center;gap:5px;">
                            <span style="font-size:16px;line-height:1;">＋</span> Tambah Data Tim PNKB &amp; Ibu Gambuh
                        </button>
                        <div id="add-member-form" style="display:none;margin-top:10px;padding:12px;background:#f8fafc;border-radius:8px;border:1px solid #e2e8f0;">
                            <div style="margin-bottom:8px;text-align:left;">
                                <label style="font-size:11px;font-weight:700;color:#64748b;display:block;margin-bottom:4px;text-transform:uppercase;letter-spacing:0.5px;">Nama Lengkap *</label>
                                <input id="new-member-nama" type="text" placeholder="Masukkan nama lengkap..." style="width:100%;padding:8px 10px;border:1px solid #d1d5db;border-radius:7px;font-size:13px;color:#1e293b;box-sizing:border-box;outline:none;" />
                            </div>
                            <div style="margin-bottom:10px;text-align:left;">
                                <label style="font-size:11px;font-weight:700;color:#64748b;display:block;margin-bottom:4px;text-transform:uppercase;letter-spacing:0.5px;">Tipe *</label>
                                <select id="new-member-tipe" style="width:100%;padding:8px 10px;border:1px solid #d1d5db;border-radius:7px;font-size:13px;color:#1e293b;background:#fff;outline:none;cursor:pointer;">
                                    <option value="">-- Pilih Tipe --</option>
                                    <option value="PNKB">PNKB</option>
                                    <option value="Ibu Gambuh">Ibu Gambuh</option>
                                </select>
                            </div>
                            <button type="button" id="btn-save-member" style="width:100%;background:#3b82f6;color:#fff;border:none;padding:8px 16px;border-radius:7px;font-size:13px;font-weight:700;cursor:pointer;">
                                Simpan Anggota Baru
                            </button>
                            <div id="add-status" style="margin-top:7px;font-size:12px;text-align:center;min-height:18px;"></div>
                        </div>
                    </div>
                `,
                showCancelButton: !forced,
                allowOutsideClick: !forced,
                allowEscapeKey: !forced,
                confirmButtonText: 'Simpan',
                cancelButtonText: 'Batal',
                preConfirm: () => {
                    const val = (document.getElementById('swal-identity') as HTMLSelectElement)?.value;
                    if (!val) {
                        Swal.showValidationMessage('Anda harus memilih identitas Anda!');
                        return false;
                    }
                    return val;
                },
                didOpen: () => {
                    const sel = document.getElementById('swal-identity') as HTMLSelectElement;
                    // Do not pre-select value, defaulting to "-- Pilih Nama Anda --"

                    document.getElementById('btn-toggle-add')?.addEventListener('click', () => {
                        const form = document.getElementById('add-member-form');
                        if (form) form.style.display = form.style.display === 'none' ? 'block' : 'none';
                    });

                    document.getElementById('btn-save-member')?.addEventListener('click', async () => {
                        const nama = ((document.getElementById('new-member-nama') as HTMLInputElement)?.value || '').trim();
                        const tipe = (document.getElementById('new-member-tipe') as HTMLSelectElement)?.value;
                        const statusEl = document.getElementById('add-status');

                        if (!nama || !tipe) {
                            if (statusEl) statusEl.innerHTML = '<span style="color:#ef4444;">Nama dan Tipe wajib diisi!</span>';
                            return;
                        }

                        const saveBtn = document.getElementById('btn-save-member') as HTMLButtonElement;
                        if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = 'Menyimpan...'; }

                        try {
                            const postRes = await fetch('/api/admin/tim-gambuh', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ nama, tipe })
                            });

                            if (!postRes.ok) {
                                const errData = await postRes.json();
                                throw new Error(errData.error || 'Gagal menyimpan');
                            }

                            const newMember = await postRes.json();

                            // Refresh the member list
                            const refreshRes = await fetch('/api/admin/tim-gambuh');
                            if (refreshRes.ok) {
                                data = await refreshRes.json();
                                const sel2 = document.getElementById('swal-identity') as HTMLSelectElement;
                                if (sel2) {
                                    sel2.innerHTML = `<option value="">-- Pilih Nama Anda --</option>${buildOptionHtml(data)}`;
                                    if (newMember.id) sel2.value = newMember.id;
                                }
                            }

                            // Reset & close add form
                            (document.getElementById('new-member-nama') as HTMLInputElement).value = '';
                            (document.getElementById('new-member-tipe') as HTMLSelectElement).value = '';
                            const form = document.getElementById('add-member-form');
                            if (form) form.style.display = 'none';

                            if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = 'Simpan Anggota Baru'; }
                            if (statusEl) {
                                statusEl.innerHTML = `<span style="color:#10b981;">✓ ${nama} berhasil ditambahkan!</span>`;
                                setTimeout(() => { if (statusEl) statusEl.innerHTML = ''; }, 3000);
                            }
                        } catch (err: any) {
                            if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = 'Simpan Anggota Baru'; }
                            if (statusEl) statusEl.innerHTML = `<span style="color:#ef4444;">${err.message}</span>`;
                        }
                    });
                }
            });

            if (isConfirmed && selectedId) {
                const selectedItem = data.find((d: any) => String(d.id).trim() === String(selectedId).trim());
                if (selectedItem) {
                    const normalizedNama = String(selectedItem.nama || "").trim();
                    saveCurrentIdentity(selectedItem);
                    Swal.fire({
                        icon: 'success',
                        title: 'Identitas Disimpan',
                        text: `Anda sekarang bertindak sebagai: ${normalizedNama}`,
                        timer: 2000,
                        showConfirmButton: false
                    });
                }
            }
        } catch (err) {
            Swal.fire("Error", "Gagal mengambil daftar anggota Tim PNKB & Ibu Gambuh.", "error");
        }
    }, [saveCurrentIdentity]);

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

            const kunjunganRes = await fetch("/api/mandiri/kunjungan", { credentials: "include" });
            if (kunjunganRes.ok) {
                const kunjunganJson = await kunjunganRes.json();
                setVisitHistory(Array.isArray(kunjunganJson) ? kunjunganJson : []);
            } else {
                console.error("Failed to fetch visit history", kunjunganRes.status, await kunjunganRes.text());
            }

            const queueRes = await fetch("/api/mandiri/pilih?all=true", { credentials: "include" });
            if (queueRes.ok) {
                const queueJson = await queueRes.json();
                const waiting = Array.isArray(queueJson) ? queueJson.filter((q: any) => q.status === "Menunggu") : [];
                setQueueData(waiting);
            } else {
                console.error("Failed to fetch queue", queueRes.status, await queueRes.text());
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

        let cancelled = false;

        const initializeIdentity = async () => {
            const url = new URL(window.location.href);
            const requestedIdentityId = (url.searchParams.get("identityId") || "").trim();

            if (requestedIdentityId) {
                try {
                    const res = await fetch("/api/admin/tim-gambuh");
                    if (res.ok) {
                        const data = await res.json();
                        const selectedItem = Array.isArray(data)
                            ? data.find((item: any) => String(item.id).trim() === requestedIdentityId)
                            : null;

                        if (!cancelled && selectedItem) {
                            saveCurrentIdentity(selectedItem);
                            url.searchParams.delete("identityId");
                            window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
                            return;
                        }
                    }
                } catch (err) {
                    console.error("Gagal menyinkronkan identitas Tim Gambuh dari URL:", err);
                }
            }

            if (cancelled) return;

            // Selalu mengharuskan user memilih identitas pada saat pertama kali komponen dibuka
            setMyId("");
            setMyName("");
            showSelectIdentityModal(true);
        };

        initializeIdentity();

        // Realtime updates using Pusher
        const pusher = getPusherClient();
        if (!pusher) {
            return () => {
                cancelled = true;
            };
        }

        const channel = pusher.subscribe("taaruf-channel");
        
        channel.bind("taaruf-changed", () => {
            fetchData();
        });
        
        channel.bind("room-changed", (eventData: any) => {
            fetchData();
            if (eventData && eventData.action === "assign") {
                const { roomNama, pengirimNama, pengirimNoUrut, penerimaNama, penerimaNoUrut, assignedCallerNama, assignedCallerId, assignedCaller2Nama, assignedCaller2Id, assignedGuardNama, assignedGuardId } = eventData;
                const savedId = localStorage.getItem("my_tim_pnkb_gambuh_id") || "";
                const isMyAssignment = assignedCallerId === savedId || assignedCaller2Id === savedId || assignedGuardId === savedId;

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
                            <div style="margin-top: 10px; padding-top: 8px; border-top: 1px dashed #e2e8f0; display: flex; flex-direction: column; gap: 4px;">
                                <p style="margin: 0;">📢 <strong>Pemanggil 1:</strong> <span style="color: ${assignedCallerId === savedId ? '#3b82f6' : 'inherit'}; font-weight: bold;">${assignedCallerNama || '-'} ${assignedCallerId === savedId ? '(Anda)' : ''}</span></p>
                                ${assignedCaller2Nama ? `<p style="margin: 0;">📢 <strong>Pemanggil 2:</strong> <span style="color: ${assignedCaller2Id === savedId ? '#3b82f6' : 'inherit'}; font-weight: bold;">${assignedCaller2Nama} ${assignedCaller2Id === savedId ? '(Anda)' : ''}</span></p>` : ''}
                                <p style="margin: 0;">🚪 <strong>Penunggu:</strong> <span style="color: ${assignedGuardId === savedId ? '#10b981' : 'inherit'}; font-weight: bold;">${assignedGuardNama || '-'} ${assignedGuardId === savedId ? '(Anda)' : ''}</span></p>
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
            cancelled = true;
            channel.unbind("taaruf-changed");
            channel.unbind("room-changed");
            pusher.unsubscribe("taaruf-channel");
        };
    }, [fetchData, saveCurrentIdentity, showSelectIdentityModal]);

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

    useEffect(() => {
        if (showAbsenScanner && !hasAttended) {
            let scanner: any = null;
            const initScanner = async () => {
                try {
                    const { Html5Qrcode } = await import("html5-qrcode");
                    if (absenScannerRef.current) {
                        try { await absenScannerRef.current.stop(); } catch(e){}
                    }
                    scanner = new Html5Qrcode("gambuh-scanner-box");
                    absenScannerRef.current = scanner;
                    
                    await scanner.start(
                        { facingMode: "environment" },
                        { fps: 10, qrbox: { width: 250, height: 250 } },
                        (decodedText: string) => {
                            if (decodedText.includes("kegiatanId=")) {
                                try {
                                    const urlObj = new URL(decodedText);
                                    const kId = urlObj.searchParams.get("kegiatanId");
                                    if (kId) {
                                        handleAbsenScan(kId);
                                    }
                                } catch(e) {}
                            }
                        },
                        () => {} // ignore
                    );
                    setIsScanning(true);
                } catch(e) {
                   Swal.fire('Error', 'Kamera gagal dimulai', 'error');
                   setShowAbsenScanner(false);
                }
            };
            initScanner();

            return () => {
                if (scanner) {
                    try { scanner.stop(); } catch(e){}
                }
            };
        } else {
            if (absenScannerRef.current) {
                try { absenScannerRef.current.stop(); } catch(e){}
                absenScannerRef.current = null;
            }
            setIsScanning(false);
            if (!hasAttended) {
                setScanFeedback(null);
            }
        }
    }, [showAbsenScanner, hasAttended]);

    const handleAbsenScan = async (kegiatanId: string) => {
        if (absenScannerRef.current) {
            try { await absenScannerRef.current.stop(); } catch(e){}
        }
        setIsScanning(false);

        setScanFeedback({ type: "processing", text: "Mengirim absensi..." });

        try {
            const res = await fetch("/api/mandiri/absensi", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    kegiatanId,
                    generusId: myId
                })
            });
            const data = await res.json();
            if (res.ok) {
                 setShowAbsenScanner(false);
                 setHasAttended(true);
                 Swal.fire("Berhasil", "Kehadiran Anda tersimpan.", "success");
            } else if (res.status === 409) {
                 setShowAbsenScanner(false);
                 setHasAttended(true);
                 Swal.fire("Info", "Kehadiran Anda sudah tercatat sebelumnya.", "info");
            } else {
                 throw new Error(data.error);
            }
        } catch (e: any) {
            setScanFeedback({ type: "error", text: e.message || "Gagal absen" });
        }
    };

    const handleOpenAbsensi = async () => {
        if (!myId) {
            Swal.fire("Pilih Identitas", "Pilih nama Anda terlebih dahulu sebelum absen.", "warning");
            return;
        }
        
        // Asumsi kita buka dlu
        setShowAbsenScanner(true);
        setScanFeedback(null);
        setHasAttended(false); 
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
                            <option value="Ragu-ragu">Ragu-ragu</option>
                            <option value="Tidak Lanjut">Tidak Lanjut</option>
                        </select>
                    </div>

                    <div>
                        <label style="display: block; font-weight: 700; font-size: 12px; color: #475569; margin-bottom: 8px;">Hasil Penerima (${room.penerimaNama || 'Wanita'}):</label>
                        <select id="swal-hasil-penerima" class="swal2-select" style="width: 100%; margin: 0; padding: 8px; border-radius: 8px; border: 1px solid #cbd5e1; font-size: 14px;">
                            <option value="Lanjut">Lanjut</option>
                            <option value="Ragu-ragu">Ragu-ragu</option>
                            <option value="Tidak Lanjut">Tidak Lanjut</option>
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

    const handleEditReportRecord = async (item: any) => {
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
            })
        });

        if (!formValues) return;
        try {
            const res = await fetch(`/api/mandiri/kunjungan/${item.pemilihanId || item.id}`, {
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

    const handleReturnReportToQueue = async (item: any) => {
        const result = await Swal.fire({
            title: 'Kembalikan ke Antrean?',
            html: `Pasangan <b>${item.pemilihNama}</b> &amp; <b>${item.terpilihNama}</b> akan dikembalikan ke daftar antrean. Data hasil pertemuan akan dihapus.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#f59e0b',
            confirmButtonText: 'Ya, Kembalikan!',
            cancelButtonText: 'Batal'
        });

        if (!result.isConfirmed) return;
        try {
            const res = await fetch(`/api/mandiri/kunjungan/${item.pemilihanId || item.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "return_to_queue" })
            });
            if (!res.ok) throw new Error((await res.json()).error);
            Swal.fire({ title: "Berhasil", text: "Pasangan dikembalikan ke daftar antrean.", icon: "success", timer: 1500, showConfirmButton: false });
            fetchData();
        } catch (err: any) {
            Swal.fire("Error", err.message, "error");
        }
    };

    const handleDeleteReportRecord = async (item: any) => {
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
            const res = await fetch(`/api/mandiri/kunjungan/${item.pemilihanId || item.id}`, { method: "DELETE" });
            if (!res.ok) throw new Error((await res.json()).error);
            Swal.fire({ title: "Terhapus!", text: "Record berhasil dihapus permanen.", icon: "success", timer: 1500, showConfirmButton: false });
            fetchData();
        } catch (err: any) {
            Swal.fire("Error", err.message, "error");
        }
    };

    const handleDeleteReportQueue = async (item: any) => {
        const result = await Swal.fire({
            title: 'Hapus Antrean?',
            html: `Antrean antara <b>${item.pemilihNama}</b> &amp; <b>${item.terpilihNama}</b> akan dihapus.`,
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

    const normalizeId = (value: any) => (value == null ? "" : String(value).trim());
    const normalizedMyId = normalizeId(myId);

    // Filter Rooms based on search & Sort so that rooms assigned to me come first
    const filteredRooms = allRooms.filter(room => {
        const query = roomSearch.toLowerCase();
        const matchesSearch = (
            room.nama.toLowerCase().includes(query) ||
            room.pengirimNama?.toLowerCase().includes(query) ||
            room.penerimaNama?.toLowerCase().includes(query) ||
            room.pengirimNo?.toLowerCase().includes(query) ||
            room.penerimaNo?.toLowerCase().includes(query)
        );

        // Only show rooms with an active session assigned to me (by admin romantic
        // room or the system's auto-assignment). Kosong rooms carry no assignment
        // (it's cleared when a session ends), so they're hidden entirely too.
        if (room.status !== "Terisi") return false;

        return matchesSearch;
    }).sort((a, b) => {
        const aIsMine = normalizeId(a.assignedCallerId) === normalizedMyId || normalizeId(a.assignedGuardId) === normalizedMyId;
        const bIsMine = normalizeId(b.assignedCallerId) === normalizedMyId || normalizeId(b.assignedGuardId) === normalizedMyId;
        
        if (aIsMine && !bIsMine) return -1;
        if (!aIsMine && bIsMine) return 1;
        
        return a.nama.localeCompare(b.nama, undefined, { numeric: true, sensitivity: 'base' });
    });

    // Laporan hasil peserta & panitia: gabungan antrean (Menunggu) + riwayat
    // pertemuan selesai, persis seperti tampilan di halaman Admin Romantic Room.
    const normalizedQueue = queueData.map((q) => ({
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
        pemilihWa: q.pengirimWa,
        terpilihWa: q.penerimaWa,
        assignedCallerNama: null,
        assignedCaller2Nama: null,
        assignedGuardNama: null,
        isQueue: true,
    }));

    const normalizedActiveRooms = allRooms
        .filter((r) => r.status === "Terisi")
        .map((r) => ({
            id: r.id,
            pemilihNomorUrut: r.pengirimNomorUrut,
            pemilihNo: r.pengirimNo,
            pemilihNama: r.pengirimNama,
            pemilihStatus: r.pengirimStatus,
            pemilihKota: r.pengirimKota,
            pemilihDesa: r.pengirimDesa,
            pemilihHasil: "Menunggu",
            terpilihNomorUrut: r.penerimaNomorUrut,
            terpilihNo: r.penerimaNo,
            terpilihNama: r.penerimaNama,
            terpilihStatus: r.penerimaStatus,
            terpilihKota: r.penerimaKota,
            terpilihDesa: r.penerimaDesa,
            terpilihHasil: "Menunggu",
            roomNama: r.nama,
            createdAt: r.startedAt || r.updatedAt,
            status: "Berlangsung",
            pemilihWa: r.pengirimWa,
            terpilihWa: r.penerimaWa,
            assignedCallerNama: r.assignedCallerNama,
            assignedCaller2Nama: r.assignedCaller2Nama,
            assignedGuardNama: r.assignedGuardNama,
        }));

    const combinedReportList = [
        ...normalizedQueue,
        ...normalizedActiveRooms,
        ...visitHistory.map((h) => ({ ...h, status: "Selesai" })),
    ];

    const reportData = combinedReportList.filter((item) => {
        const query = reportSearch.toLowerCase();
        const matchesSearch = !query || (
            item.pemilihNama?.toLowerCase().includes(query) ||
            item.terpilihNama?.toLowerCase().includes(query) ||
            item.roomNama?.toLowerCase().includes(query)
        );
        if (!matchesSearch) return false;

        if (resultFilter === "Semua") return true;

        if (resultFilter === "Sedang Menunggu") {
            return item.status === "Menunggu";
        }

        if (item.status === "Menunggu") return false;

        const res1 = item.pemilihHasil;
        const res2 = item.terpilihHasil;

        if (resultFilter === "Lanjut - Lanjut") {
            return res1 === "Lanjut" && res2 === "Lanjut";
        } else if (resultFilter === "Lanjut - Tidak Lanjut") {
            return (res1 === "Lanjut" && res2 === "Tidak Lanjut") || (res1 === "Tidak Lanjut" && res2 === "Lanjut");
        } else if (resultFilter === "Tidak Lanjut - Tidak Lanjut") {
            return res1 === "Tidak Lanjut" && res2 === "Tidak Lanjut";
        } else if (resultFilter === "Ragu-ragu - Ragu-ragu") {
            return res1 === "Ragu-ragu" && res2 === "Ragu-ragu";
        } else if (resultFilter === "Lanjut - Ragu-ragu") {
            return (res1 === "Lanjut" && res2 === "Ragu-ragu") || (res1 === "Ragu-ragu" && res2 === "Lanjut");
        } else if (resultFilter === "Tidak Lanjut - Ragu-ragu") {
            return (res1 === "Tidak Lanjut" && res2 === "Ragu-ragu") || (res1 === "Ragu-ragu" && res2 === "Tidak Lanjut");
        }

        return true;
    });

    const handleExportReportExcel = () => {
        if (reportData.length === 0) {
            Swal.fire({ icon: "warning", title: "Tidak Ada Data", text: "Belum ada laporan hasil untuk diekspor." });
            return;
        }

        const exportData = reportData.map((item) => ({
            "Ruangan": item.roomNama || "-",
            "No. Peserta 1": item.pemilihNomorUrut || item.pemilihNo || "-",
            "Nama Peserta 1": item.pemilihNama || "-",
            "Daerah/Desa Peserta 1": `${item.pemilihKota || "-"} / ${item.pemilihDesa || "-"}`,
            "WhatsApp Peserta 1": item.pemilihWa || "-",
            "Status Peserta 1": item.pemilihStatus || "-",
            "Hasil Peserta 1": item.pemilihHasil || "-",
            "No. Peserta 2": item.terpilihNomorUrut || item.terpilihNo || "-",
            "Nama Peserta 2": item.terpilihNama || "-",
            "Daerah/Desa Peserta 2": `${item.terpilihKota || "-"} / ${item.terpilihDesa || "-"}`,
            "WhatsApp Peserta 2": item.terpilihWa || "-",
            "Status Peserta 2": item.terpilihStatus || "-",
            "Hasil Peserta 2": item.terpilihHasil || "-",
            "Status": item.status || "-",
            "Pemanggil 1": item.assignedCallerNama || "-",
            "Pemanggil 2": item.assignedCaller2Nama || "-",
            "Penunggu": item.assignedGuardNama || "-",
            "WhatsApp PNKB": item.assignedCallerWa || "-",
            "Waktu": formatWaktuIndonesia(item.createdAt),
        }));

        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Laporan Hasil");
        const tanggal = new Date().toISOString().slice(0, 10);
        XLSX.writeFile(wb, `Laporan_Hasil_${(myName || "Tim_Gambuh").replace(/\s+/g, "_")}_${tanggal}.xlsx`);
    };

    return (
        <div className="operator-layout">
            <Topbar title="Panel Tim PNKB & Ibu Gambuh" role={userRole} />
            <div className="page-content">
                
                <div className="operator-header">
                    <div>
                        <h2>Panel Tim PNKB & Ibu Gambuh</h2>
                        <p>Kelola sesi taaruf di dalam ruangan: Mulai timer, dampingi, dan simpan hasil pertemuan.</p>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <span className="identity-badge">
                            Sebagai: <strong>{myName || "Pilih Nama Anda"}</strong>
                        </span>
                        <button className="btn-identity" onClick={() => showSelectIdentityModal(false)} title="Ubah Identitas">
                            Ubah Identitas
                        </button>
                        <button className="btn-refresh" onClick={handleOpenAbsensi} style={{
                            display: 'flex', alignItems: 'center', gap: '6px',
                            background: '#fef3c7', color: '#92400e',
                            border: '1px solid #fde68a', padding: '8px 16px',
                            borderRadius: '8px', fontSize: '13px', fontWeight: '600',
                            cursor: 'pointer'
                        }}>
                            <QrCode size={16} />
                            Absensi
                        </button>
                        <Link href="/tim-gambuh/katalog" className="btn-refresh" title="Katalog Peserta" style={{
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
                            <div className="empty-state">
                                {roomSearch ? "Tidak ada ruangan ditemukan" : "Belum ada ruangan yang ditugaskan untuk Anda saat ini"}
                            </div>
                        ) : (
                            filteredRooms.map((room) => (
                                <div key={room.id} className={`room-tile ${room.status?.toLowerCase()} ${room.status === "Terisi" && !room.startedAt ? "not-started" : ""} ${room.assignedGuardId === myId || room.assignedCallerId === myId || room.assignedCaller2Id === myId ? "my-assigned-room" : ""}`} onClick={() => setSelectedRoom(room)} style={{ cursor: "pointer" }}>
                                    <div className="room-top">
                                        <span className="room-name">{room.nama}</span>
                                        {(room.assignedGuardId === myId || room.assignedCallerId === myId || room.assignedCaller2Id === myId) && (
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
                                                
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', marginTop: '6px', fontSize: '10px', width: '100%', padding: '6px 0 4px', borderTop: '1px dashed #f1f5f9' }}>
                                                    {room.assignedCallerNama && (
                                                        <div style={{ color: '#2563eb', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                            📢 <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                                                                P1: {room.assignedCallerNama.split(' ')[0]} {room.assignedCallerId === myId ? <strong>(Anda)</strong> : ''}
                                                            </span>
                                                        </div>
                                                    )}
                                                    {room.assignedCaller2Nama && (
                                                        <div style={{ color: '#7c3aed', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                            📢 <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                                                                P2: {room.assignedCaller2Nama.split(' ')[0]} {room.assignedCaller2Id === myId ? <strong>(Anda)</strong> : ''}
                                                            </span>
                                                        </div>
                                                    )}
                                                    {room.assignedGuardNama && (
                                                        <div style={{ color: '#059669', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                            🚪 <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                                                                {room.assignedGuardNama.split(' ')[0]} {room.assignedGuardId === myId ? <strong>(Anda)</strong> : ''}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>

                                                {room.assignedGuardId === myId && (
                                                    <div className="action-row">
                                                        {room.startedAt ? (
                                                            <div style={{ fontSize: '10px', color: '#64748b', textAlign: 'center', width: '100%', padding: '6px', fontStyle: 'italic', background: '#f1f5f9', borderRadius: '6px' }}>
                                                                Menunggu hasil RR dari kedua pasangan tersebut
                                                            </div>
                                                        ) : (
                                                            <button
                                                                className="btn-start-timer"
                                                                onClick={(e) => { e.stopPropagation(); handleStartRoom(room.id); }}
                                                            >
                                                                <Timer size={12} fill="white" /> Mulai Sesi
                                                            </button>
                                                        )}
                                                    </div>
                                                )}
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

                <div className="card shadow-sm" style={{ marginTop: '20px' }}>
                    <div className="card-header-inner">
                        <h3>Laporan Hasil Peserta & Panitia</h3>
                        <button
                            className="btn-refresh"
                            onClick={handleExportReportExcel}
                            title="Export Laporan ke Excel"
                            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                        >
                            <FileSpreadsheet size={16} /> Export Excel
                        </button>
                    </div>

                    <div style={{ display: 'flex', gap: '10px', margin: '0 16px 16px', flexWrap: 'wrap' }}>
                        <div className="search-bar-container" style={{ flex: '1 1 240px' }}>
                            <Search size={16} />
                            <input
                                type="text"
                                placeholder="Cari nama peserta atau ruangan..."
                                value={reportSearch}
                                onChange={(e) => setReportSearch(e.target.value)}
                            />
                        </div>
                        <select
                            className="filter-select"
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
                    </div>

                    {reportData.length === 0 ? (
                        <div className="empty-state">Belum ada laporan hasil pertemuan</div>
                    ) : (
                        <div className="table-wrapper">
                            <table className="responsive-table">
                                <thead>
                                    <tr>
                                        <th>No. Peserta 1</th>
                                        <th>Nama Peserta 1</th>
                                        <th>Daerah/Desa Peserta 1</th>
                                        <th>WhatsApp Peserta 1</th>
                                        <th>Status Peserta 1</th>
                                        <th>Hasil Peserta 1</th>
                                        <th>No. Peserta 2</th>
                                        <th>Nama Peserta 2</th>
                                        <th>Daerah/Desa Peserta 2</th>
                                        <th>WhatsApp Peserta 2</th>
                                        <th>Status Peserta 2</th>
                                        <th>Hasil Peserta 2</th>
                                        <th>Status</th>
                                        <th>Ruangan</th>
                                        <th>Pemanggil 1</th>
                                        <th>Pemanggil 2</th>
                                        <th>Penunggu</th>
                                        <th>WhatsApp PNKB</th>
                                        <th>Waktu</th>
                                        <th>Aksi</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {reportData.map((item) => {
                                        const hasilBadgeClass = (hasil: string) =>
                                            hasil === "Lanjut" ? "badge-green"
                                            : hasil === "Tidak Lanjut" ? "badge-red"
                                            : hasil === "Ragu-ragu" ? "badge-orange"
                                            : hasil === "Menunggu" ? "badge-blue"
                                            : "badge-gray";
                                        return (
                                            <tr key={item.id}>
                                                <td data-label="No. Peserta 1">{item.pemilihNomorUrut || item.pemilihNo || "-"}</td>
                                                <td data-label="Nama Peserta 1">{item.pemilihNama || "-"}</td>
                                                <td data-label="Daerah/Desa Peserta 1">{item.pemilihKota || "-"} / {item.pemilihDesa || "-"}</td>
                                                <td data-label="WhatsApp Peserta 1">{item.pemilihWa || "-"}</td>
                                                <td data-label="Status Peserta 1">{item.pemilihStatus || "-"}</td>
                                                <td data-label="Hasil Peserta 1">
                                                    <span className={`badge ${hasilBadgeClass(item.pemilihHasil)}`}>
                                                        {item.pemilihHasil || "-"}
                                                    </span>
                                                </td>
                                                <td data-label="No. Peserta 2">{item.terpilihNomorUrut || item.terpilihNo || "-"}</td>
                                                <td data-label="Nama Peserta 2">{item.terpilihNama || "-"}</td>
                                                <td data-label="Daerah/Desa Peserta 2">{item.terpilihKota || "-"} / {item.terpilihDesa || "-"}</td>
                                                <td data-label="WhatsApp Peserta 2">{item.terpilihWa || "-"}</td>
                                                <td data-label="Status Peserta 2">{item.terpilihStatus || "-"}</td>
                                                <td data-label="Hasil Peserta 2">
                                                    <span className={`badge ${hasilBadgeClass(item.terpilihHasil)}`}>
                                                        {item.terpilihHasil || "-"}
                                                    </span>
                                                </td>
                                                <td data-label="Status">
                                                    <span className={`badge ${item.status === "Menunggu" ? "badge-blue" : item.status === "Berlangsung" ? "badge-orange" : "badge-green"}`}>
                                                        {item.status}
                                                    </span>
                                                </td>
                                                <td data-label="Ruangan">{item.roomNama || "-"}</td>
                                                <td data-label="Pemanggil 1">{item.assignedCallerNama || "-"}</td>
                                                <td data-label="Pemanggil 2">{item.assignedCaller2Nama || "-"}</td>
                                                <td data-label="Penunggu">{item.assignedGuardNama || "-"}</td>
                                                <td data-label="WhatsApp PNKB">{item.assignedCallerWa || "-"}</td>
                                                <td data-label="Waktu">{formatWaktuIndonesia(item.createdAt)}</td>
                                                <td data-label="Aksi">
                                                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                                        {item.status === "Menunggu" && (
                                                            <button className="btn-act btn-del" onClick={() => handleDeleteReportQueue(item)} title="Hapus Antrean">🗑️</button>
                                                        )}
                                                        {item.status === "Selesai" && (
                                                            <>
                                                                <button className="btn-act btn-edit" onClick={() => handleEditReportRecord(item)} title="Edit Hasil">✏️</button>
                                                                <button className="btn-act btn-return" onClick={() => handleReturnReportToQueue(item)} title="Kembalikan ke Antrean">↩️</button>
                                                                <button className="btn-act btn-del" onClick={() => handleDeleteReportRecord(item)} title="Hapus Permanen">🗑️</button>
                                                            </>
                                                        )}
                                                        {item.status === "Berlangsung" && (
                                                            <span style={{ color: '#94a3b8', fontSize: '11px' }}>-</span>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

            </div>

            {showAbsenScanner && (
                <div style={{
                    position: "fixed", inset: 0, zIndex: 9999,
                    background: "rgba(0,0,0,0.8)", display: "flex",
                    alignItems: "center", justifyContent: "center", padding: "16px"
                }} onClick={() => setShowAbsenScanner(false)}>
                    <div style={{
                        background: "white", borderRadius: "16px", padding: "24px",
                        width: "100%", maxWidth: "400px", textAlign: "center"
                    }} onClick={e => e.stopPropagation()}>
                        <h3 style={{ marginBottom: "16px" }}>{hasAttended ? "Sudah Hadir" : "Scan QR Absensi"}</h3>
                        
                        {hasAttended ? (
                           <div style={{ padding: "40px 20px", display: "flex", flexDirection: "column", alignItems: "center", gap: "10px" }}>
                              <CheckCircle size={64} style={{ color: "#10b981", animation: "pulse 2s infinite" }} />
                              <p style={{ fontSize: "16px", fontWeight: "bold", color: "#1e293b", margin: 0 }}>Anda sudah tercatat hadir!</p>
                           </div>
                        ) : (
                           <div style={{ width: "100%", aspectRatio: "1/1", background: "#f8fafc", borderRadius: "8px", overflow: "hidden", border: "2px dashed #94a3b8" }}>
                               <div id="gambuh-scanner-box" style={{ width: "100%", height: "100%" }}></div>
                           </div>
                        )}
                        
                        {scanFeedback && !hasAttended && (
                            <div style={{ marginTop: "12px", padding: "10px", borderRadius: "8px", fontSize: "13px", fontWeight: 600, background: scanFeedback.type === 'error' ? '#fef2f2' : (scanFeedback.type === 'processing' ? '#eff6ff' : '#ecfdf5'), color: scanFeedback.type === 'error' ? '#ef4444' : (scanFeedback.type === 'processing' ? '#3b82f6' : '#10b981') }}>
                                {scanFeedback.text}
                            </div>
                        )}
                        
                        <button onClick={() => setShowAbsenScanner(false)} style={{ marginTop: "24px", padding: "12px 20px", width: "100%", borderRadius: "8px", border: "none", background: "#ef4444", color: "white", fontWeight: "bold", cursor: "pointer" }}>Tutup</button>
                    </div>
                </div>
            )}

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
                                {(selectedRoom.assignedCallerNama || selectedRoom.assignedCaller2Nama || selectedRoom.assignedGuardNama) && (
                                    <div style={{ background: "#f0fdf4", borderRadius: "10px", padding: "14px", marginBottom: "14px", border: "1px solid #bbf7d0" }}>
                                        <div style={{ fontSize: "10px", fontWeight: 800, color: "#059669", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "10px" }}>Tim Pendamping</div>
                                        {selectedRoom.assignedCallerNama && (
                                            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                                                <span style={{ fontSize: "14px" }}>📢</span>
                                                <div>
                                                    <div style={{ fontSize: "10px", color: "#64748b", fontWeight: 600 }}>Pemanggil 1 <span style={{ color: '#2563eb' }}>(PNKB)</span></div>
                                                    <div style={{ fontSize: "13px", fontWeight: 700, color: selectedRoom.assignedCallerId === myId ? "#2563eb" : "#0f172a" }}>
                                                        {selectedRoom.assignedCallerNama} {selectedRoom.assignedCallerId === myId ? "(Anda)" : ""}
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                        {selectedRoom.assignedCaller2Nama && (
                                            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                                                <span style={{ fontSize: "14px" }}>📢</span>
                                                <div>
                                                    <div style={{ fontSize: "10px", color: "#64748b", fontWeight: 600 }}>Pemanggil 2 <span style={{ color: '#7c3aed' }}>(Ibu Gambuh)</span></div>
                                                    <div style={{ fontSize: "13px", fontWeight: 700, color: selectedRoom.assignedCaller2Id === myId ? "#7c3aed" : "#0f172a" }}>
                                                        {selectedRoom.assignedCaller2Nama} {selectedRoom.assignedCaller2Id === myId ? "(Anda)" : ""}
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

                                {/* Action buttons — for all assigned staff */}
                                {(selectedRoom.assignedGuardId === myId) && (
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
                                            <div style={{ textAlign: "center", padding: "12px", background: "#f8fafc", borderRadius: "10px", border: "1px dashed #cbd5e1", color: "#64748b", fontSize: "13px", fontWeight: 600 }}>
                                                Menunggu hasil RR dari kedua pasangan tersebut
                                            </div>
                                        )}
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
                .filter-select {
                    padding: 10px 12px;
                    border: 1px solid #cbd5e1;
                    border-radius: 8px;
                    font-size: 13px;
                    color: #334155;
                    background: white;
                    outline: none;
                    cursor: pointer;
                    transition: border-color 0.2s;
                }
                .filter-select:focus {
                    border-color: #3b82f6;
                }
                .btn-act { border: none; border-radius: 4px; padding: 3px 7px; font-size: 12px; cursor: pointer; transition: opacity 0.2s; }
                .btn-act:hover { opacity: 0.75; }
                .btn-edit { background: #eff6ff; }
                .btn-del { background: #fef2f2; }
                .btn-return { background: #fffbeb; }
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
