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
        const interval = setInterval(fetchData, 10000); // fallback polling
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
    
    const formatTime = (d: Date) => {
        return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div style={{
            minHeight: "100vh",
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
                padding: "30px 50px",
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
            <div style={{ flex: 1, padding: "40px 50px", overflowY: "auto" }}>
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
                        gridTemplateColumns: "repeat(auto-fit, minmax(600px, 1fr))",
                        gap: "40px",
                        alignItems: "start"
                    }}>
                        {rooms.map((room) => (
                            <div key={room.id} style={{
                                background: "#ffffff",
                                border: "1px solid rgba(0, 0, 0, 0.05)",
                                borderRadius: "24px",
                                overflow: "hidden",
                                boxShadow: "0 10px 30px rgba(0, 0, 0, 0.05)",
                                animation: "fadeIn 0.5s ease-out"
                            }}>
                                <div style={{
                                    backgroundColor: "rgba(0,0,0,0.02)",
                                    padding: "20px 30px",
                                    borderBottom: "1px solid rgba(0,0,0,0.05)",
                                    display: "flex",
                                    justifyContent: "center"
                                }}>
                                    <h2 style={{ margin: 0, fontSize: "32px", fontWeight: 800, color: "#0f172a", letterSpacing: "1px" }}>
                                        {room.nama.toUpperCase()}
                                    </h2>
                                </div>
                                <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", padding: "40px 30px", alignItems: "center" }}>
                                    
                                    {/* Caller / Pemanggil */}
                                    <div style={{ textAlign: "center" }}>
                                        <div style={{ fontSize: "16px", color: "#64748b", fontWeight: 600, textTransform: "uppercase", letterSpacing: "2px", marginBottom: "10px" }}>
                                            Pemanggil
                                        </div>
                                        <div style={{
                                            fontSize: "80px", 
                                            fontWeight: 900, 
                                            color: "#0284c7",
                                            lineHeight: 1,
                                            textShadow: "0 0 20px rgba(2, 132, 199, 0.2)"
                                        }}>
                                            {room.pemilihNomorUrut || "-"}
                                        </div>
                                    </div>
                                    
                                    {/* Icon */}
                                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                                        <Heart size={60} color="#f43f5e" fill="#f43f5e" style={{ filter: "drop-shadow(0 0 15px rgba(244, 63, 94, 0.3))" }} />
                                    </div>
                                    
                                    {/* Called / Terpilih */}
                                    <div style={{ textAlign: "center" }}>
                                        <div style={{ fontSize: "16px", color: "#64748b", fontWeight: 600, textTransform: "uppercase", letterSpacing: "2px", marginBottom: "10px" }}>
                                            Dipanggil
                                        </div>
                                        <div style={{
                                            fontSize: "80px", 
                                            fontWeight: 900, 
                                            color: "#7c3aed",
                                            lineHeight: 1,
                                            textShadow: "0 0 20px rgba(124, 58, 237, 0.2)"
                                        }}>
                                            {room.terpilihNomorUrut || "-"}
                                        </div>
                                    </div>

                                </div>
                            </div>
                        ))}
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
