"use client";

import React, { useState, useEffect, useRef } from "react";
import { getPusherClient } from "@/lib/pusher-client";
import { Heart } from "lucide-react";

export default function RomanticRoomTV() {
    const [rooms, setRooms] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    
    // Add time state for digital clock
    const [currentTime, setCurrentTime] = useState(new Date());

    const fetchData = async () => {
        try {
            const res = await fetch("/api/public/mandiri/romantic-room-tv");
            const data = await res.json();
            if (Array.isArray(data)) {
                setRooms(data);
            }
        } catch (error) {
            console.error("Gagal mengambil data", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchDataRef = useRef(fetchData);
    useEffect(() => {
        fetchDataRef.current = fetchData;
    });

    useEffect(() => {
        fetchData();
        const interval = setInterval(() => { if (!document.hidden) fetchData(); }, 15000); // fallback polling (dilewati saat tab tersembunyi)
        const timeInterval = setInterval(() => setCurrentTime(new Date()), 1000); // Clock update
        return () => {
            clearInterval(interval);
            clearInterval(timeInterval);
        };
    }, []);

    useEffect(() => {
        const pusher = getPusherClient();
        if (!pusher) return;

        const channel = pusher.subscribe("taaruf-channel");

        const handleUpdate = () => {
            fetchDataRef.current();
        };

        channel.bind("taaruf-changed", handleUpdate);
        channel.bind("room-changed", handleUpdate);

        return () => {
            channel.unbind("taaruf-changed", handleUpdate);
            channel.unbind("room-changed", handleUpdate);
            pusher.unsubscribe("taaruf-channel");
        };
    }, []);
    
    // Ukuran viewport untuk auto-fit tile agar semua nomor muat tanpa scroll
    const [vp, setVp] = useState({ w: 1920, h: 1080 });
    useEffect(() => {
        const update = () => setVp({ w: window.innerWidth, h: window.innerHeight });
        update();
        window.addEventListener("resize", update);
        return () => window.removeEventListener("resize", update);
    }, []);

    const numsFor = (g: string) =>
        rooms
            .map(room => room.pemilihGender === g ? room.pemilihNomorUrut : room.terpilihGender === g ? room.terpilihNomorUrut : null)
            .filter(Boolean)
            .sort((a: any, b: any) => Number(a) - Number(b));

    const lNums = numsFor("L");
    const pNums = numsFor("P");

    // Cari font terbesar yang masih muat untuk panel dengan nomor terbanyak
    const fitFont = (() => {
        const count = Math.max(lNums.length, pNums.length, 1);
        const digits = Math.max(1, ...[...lNums, ...pNums].map((n: any) => String(n).length));
        const availW = (vp.w - 100 - 40) / 2 - 40;
        const availH = vp.h - 110 - 66 - 48 - 70 - 40 - 24;
        for (let f = 60; f >= 14; f -= 2) {
            const tileW = f * 0.65 * digits + f * 1.1 + 4;
            const tileH = f * 1.45 + f * 0.5 + 6;
            const gap = f * 0.35;
            const perRow = Math.max(1, Math.floor((availW + gap) / (tileW + gap)));
            const rows = Math.ceil(count / perRow);
            if (rows * (tileH + gap) - gap <= availH) return f;
        }
        return 14;
    })();

    const formatTime = (d: Date) => {
        return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div style={{
            height: "100vh",
            backgroundColor: "#f8fafc",
            backgroundImage: "radial-gradient(circle at top right, #ffffff, #f1f5f9)",
            color: "#0f172a",
            fontFamily: "system-ui, -apple-system, sans-serif",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden"
        }}>
            {/* Header */}
            <div style={{
                padding: "16px 50px",
                borderBottom: "1px solid rgba(0,0,0,0.05)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                backgroundColor: "rgba(255, 255, 255, 0.8)",
                backdropFilter: "blur(12px)"
            }}>
                <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                    <div style={{
                        width: "50px", height: "50px",
                        background: "linear-gradient(135deg, #ec4899, #f43f5e)",
                        borderRadius: "12px",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        boxShadow: "0 0 20px rgba(236, 72, 153, 0.3)"
                    }}>
                        <Heart size={28} color="white" fill="white" />
                    </div>
                    <div>
                        <h1 style={{ margin: 0, fontSize: "28px", fontWeight: 800, letterSpacing: "1px", color: "#0f172a" }}>ROMANTIC ROOM</h1>
                        <p style={{ margin: 0, color: "#475569", fontSize: "16px", marginTop: "2px" }}>Status Antrean Live</p>
                    </div>
                </div>
                
                <div style={{
                    fontSize: "48px",
                    fontWeight: 800,
                    color: "#0f172a",
                    fontVariantNumeric: "tabular-nums",
                    letterSpacing: "2px",
                    textShadow: "0 2px 10px rgba(0,0,0,0.05)"
                }}>
                    {formatTime(currentTime)}
                </div>
            </div>

            {/* Content Display */}
            <div style={{ flex: 1, minHeight: 0, padding: "24px 50px", overflow: "hidden" }}>
                {loading ? (
                    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100%" }}>
                        <div style={{ fontSize: "24px", color: "#475569" }}>Memuat Layar...</div>
                    </div>
                ) : rooms.length === 0 ? (
                    <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", height: "100%", opacity: 0.6 }}>
                        <Heart size={80} color="#0f172a" style={{ marginBottom: "20px" }} />
                        <h2 style={{ fontSize: "32px", fontWeight: 600, color: "#0f172a" }}>TIDAK ADA ROOM YANG TERISI</h2>
                        <p style={{ fontSize: "20px", color: "#475569" }}>Menunggu panggilan dari admin...</p>
                    </div>
                ) : (
                    <div style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: "40px",
                        alignItems: "start"
                    }}>
                        {/* Table Laki-Laki */}
                        <div style={{
                            background: "#ffffff",
                            border: "1px solid rgba(0, 0, 0, 0.05)",
                            borderRadius: "24px",
                            overflow: "hidden",
                            boxShadow: "0 10px 30px rgba(0, 0, 0, 0.05)",
                            animation: "fadeIn 0.5s ease-out"
                        }}>
                            <div style={{
                                backgroundColor: "#e0f2fe",
                                padding: "12px 30px",
                                borderBottom: "3px solid #0284c7",
                                display: "flex",
                                justifyContent: "center"
                            }}>
                                <h2 style={{ margin: 0, fontSize: "28px", fontWeight: 800, color: "#0284c7", letterSpacing: "2px" }}>
                                    LAKI - LAKI
                                </h2>
                            </div>
                            <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: `${fitFont * 0.35}px`, padding: "20px" }}>
                                {lNums
                                    .map((no: any, idx: number) => (
                                        <div key={`L-${no}`} style={{
                                            fontSize: `${fitFont}px`, fontWeight: 900, color: "#0284c7",
                                            textShadow: "0 0 10px rgba(2, 132, 199, 0.1)",
                                            backgroundColor: "#f0f9ff",
                                            padding: `${fitFont * 0.25}px ${fitFont * 0.55}px`,
                                            borderRadius: "24px",
                                            border: "2px solid #bae6fd"
                                        }}>
                                            {no}
                                        </div>
                                    ))
                                }
                                {rooms.filter(room => room.pemilihGender === 'L' || room.terpilihGender === 'L').length === 0 && (
                                    <div style={{ padding: "40px", textAlign: "center", color: "#94a3b8", fontStyle: "italic", width: "100%" }}>
                                        Tidak ada kelompok laki-laki
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Table Perempuan */}
                        <div style={{
                            background: "#ffffff",
                            border: "1px solid rgba(0, 0, 0, 0.05)",
                            borderRadius: "24px",
                            overflow: "hidden",
                            boxShadow: "0 10px 30px rgba(0, 0, 0, 0.05)",
                            animation: "fadeIn 0.5s ease-out",
                            animationDelay: "0.1s",
                            animationFillMode: "both"
                        }}>
                            <div style={{
                                backgroundColor: "#fce7f3",
                                padding: "12px 30px",
                                borderBottom: "3px solid #db2777",
                                display: "flex",
                                justifyContent: "center"
                            }}>
                                <h2 style={{ margin: 0, fontSize: "28px", fontWeight: 800, color: "#db2777", letterSpacing: "2px" }}>
                                    PEREMPUAN
                                </h2>
                            </div>
                            <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: `${fitFont * 0.35}px`, padding: "20px" }}>
                                {pNums
                                    .map((no: any, idx: number) => (
                                        <div key={`P-${no}`} style={{
                                            fontSize: `${fitFont}px`, fontWeight: 900, color: "#ec4899",
                                            textShadow: "0 0 10px rgba(236, 72, 153, 0.1)",
                                            backgroundColor: "#fdf2f8",
                                            padding: `${fitFont * 0.25}px ${fitFont * 0.55}px`,
                                            borderRadius: "24px",
                                            border: "2px solid #fbcfe8"
                                        }}>
                                            {no}
                                        </div>
                                    ))
                                }
                                {rooms.filter(room => room.pemilihGender === 'P' || room.terpilihGender === 'P').length === 0 && (
                                    <div style={{ padding: "40px", textAlign: "center", color: "#94a3b8", fontStyle: "italic", width: "100%" }}>
                                        Tidak ada kelompok perempuan
                                    </div>
                                )}
                            </div>
                        </div>

                    </div>
                )}
            </div>
            
            {/* Footer */}
            <div style={{
                textAlign: "center",
                padding: "20px",
                color: "#64748b",
                fontSize: "14px",
                borderTop: "1px solid rgba(0,0,0,0.05)"
            }}>
                Silakan peserta yang bersangkutan menuju ruangan saat nomor Anda dipanggil
            </div>

            <style dangerouslySetInnerHTML={{__html: `
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(20px) scale(0.95); }
                    to { opacity: 1; transform: translateY(0) scale(1); }
                }
            `}} />
        </div>
    );
}
