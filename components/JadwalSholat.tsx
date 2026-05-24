"use client";

import { useEffect, useState } from "react";

interface Timings {
  Fajr: string;
  Dhuhr: string;
  Asr: string;
  Maghrib: string;
  Isha: string;
}

export default function JadwalSholat() {
  const [mounted, setMounted] = useState(false);
  const [timings, setTimings] = useState<Timings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [time, setTime] = useState("");
  const [dateStr, setDateStr] = useState("");

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    // Clock tick
    const updateTime = () => {
      const now = new Date();
      setTime(
        now.toLocaleTimeString("id-ID", {
          timeZone: "Asia/Jakarta",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }) + " WIB"
      );
      setDateStr(
        now.toLocaleDateString("id-ID", {
          timeZone: "Asia/Jakarta",
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        })
      );
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const fetchPrayerTimes = async () => {
      try {
        const date = new Date();
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');

        const res = await fetch(`/api/sholat?year=${year}&month=${month}&day=${day}`);
        if (res.ok) {
          const json = await res.json();
          if (json.status && json.data && json.data.jadwal) {
            setTimings({
              Fajr: json.data.jadwal.subuh,
              Dhuhr: json.data.jadwal.dzuhur,
              Asr: json.data.jadwal.ashar,
              Maghrib: json.data.jadwal.maghrib,
              Isha: json.data.jadwal.isya,
            });
            setError(false);
          } else {
            setError(true);
          }
        } else {
          setError(true);
        }
      } catch (err) {
        console.error("Failed to fetch prayer times:", err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchPrayerTimes();
  }, []);

  // Determine current/next prayer
  const getNextPrayer = () => {
    if (!timings || !time) return null;
    const currentClock = time.split(" ")[0]; // "HH:MM:SS"
    
    const list = [
      { name: "Subuh", time: timings.Fajr },
      { name: "Dzuhur", time: timings.Dhuhr },
      { name: "Ashar", time: timings.Asr },
      { name: "Maghrib", time: timings.Maghrib },
      { name: "Isya", time: timings.Isha },
    ];

    for (const item of list) {
      if (item.time && item.time > currentClock.substring(0, 5)) {
        return item.name;
      }
    }
    return "Subuh"; // Next day's Fajr
  };

  const nextPrayerName = getNextPrayer();

  const getPrayerItems = () => {
    if (!timings) return [];
    return [
      { id: "Subuh", label: "Subuh", val: timings.Fajr },
      { id: "Dzuhur", label: "Dzuhur", val: timings.Dhuhr },
      { id: "Ashar", label: "Ashar", val: timings.Asr },
      { id: "Maghrib", label: "Maghrib", val: timings.Maghrib },
      { id: "Isya", label: "Isya", val: timings.Isha },
    ];
  };

  if (!mounted) {
    return (
      <div
        style={{
          background: "#f8fafc",
          border: "1px solid var(--border)",
          borderRadius: "12px",
          padding: "16px",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "300px"
        }}
      >
        <div style={{ width: "24px", height: "24px", border: "3px solid var(--border)", borderTopColor: "var(--primary)", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
        <span style={{ fontSize: "11px", color: "var(--gray)", marginTop: "8px" }}>Memuat jadwal sholat...</span>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div
      style={{
        background: "#f8fafc",
        border: "1px solid var(--border)",
        borderRadius: "12px",
        padding: "16px",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
      }}
    >
      {/* Live Header */}
      <div style={{ borderBottom: "1px solid var(--border)", paddingBottom: "12px", marginBottom: "12px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: "14px", fontWeight: 700, color: "var(--navy)", display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#10b981", display: "inline-block", boxShadow: "0 0 8px #10b981", animation: "pulse 1.5s infinite" }} />
            Jadwal Sholat DKI Jakarta
          </span>
          <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--primary)" }}>{time}</span>
        </div>
        <div style={{ fontSize: "11px", color: "var(--gray)", marginTop: "4px", fontWeight: 500 }}>{dateStr}</div>
      </div>

      {/* Body */}
      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", flex: 1, padding: "20px 0" }}>
          <div style={{ width: "24px", height: "24px", border: "3px solid var(--border)", borderTopColor: "var(--primary)", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
          <span style={{ fontSize: "11px", color: "var(--gray)", marginTop: "8px" }}>Memuat jadwal...</span>
        </div>
      ) : error ? (
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", flex: 1, color: "var(--danger)", fontSize: "12px", textAlign: "center", padding: "16px" }}>
          Gagal memuat jadwal sholat secara online.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px", flex: 1, justifyContent: "center" }}>
          {getPrayerItems().map((item) => {
            const isNext = item.id === nextPrayerName;
            return (
              <div
                key={item.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "10px 14px",
                  background: isNext ? "var(--primary-lt)" : "white",
                  borderRadius: "8px",
                  border: isNext ? "1px solid var(--primary)" : "1px solid var(--border)",
                  boxShadow: isNext ? "0 4px 6px -1px rgba(37, 99, 235, 0.08)" : "none",
                  transition: "all 0.2s ease",
                }}
              >
                <span style={{ fontSize: "13px", fontWeight: isNext ? 700 : 600, color: isNext ? "var(--primary)" : "var(--navy)" }}>
                  {item.label}
                  {isNext && <span style={{ fontSize: "9px", padding: "2px 6px", background: "var(--primary)", color: "white", borderRadius: "10px", marginLeft: "8px", fontWeight: 800 }}>BERIKUTNYA</span>}
                </span>
                <span style={{ fontSize: "13px", fontWeight: 700, color: isNext ? "var(--primary)" : "var(--slate)" }}>{item.val}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* CSS Animation injection */}
      <style>{`
        @keyframes pulse {
          0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }
          70% { transform: scale(1); box-shadow: 0 0 0 6px rgba(16, 185, 129, 0); }
          100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
