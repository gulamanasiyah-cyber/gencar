"use client";




import { useState, useEffect, useCallback, useRef } from "react";
import Swal from "sweetalert2";
import {
  Sparkles, Search, User, MapPin, Heart, Calendar,
  GraduationCap, Briefcase, Lock, LogOut, ChevronDown,
  Settings2, CheckCircle2, UserCheck, Users, Globe, Music, Utensils,
  X, ShieldCheck, Star, UtilityPole as UtensilsIcon, ArrowLeft, Instagram, Timer, MessageSquare, Clock, QrCode, Send
} from "lucide-react";
import Link from "next/link";
import { getPusherClient } from "@/lib/pusher-client";
import JsBarcode from "jsbarcode";

function LocalBarcode({ value }: { value: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (canvasRef.current && value) {
      try {
        JsBarcode(canvasRef.current, value, {
          format: "CODE128",
          width: 2,
          height: 40,
          displayValue: true,
          fontSize: 10,
          textMargin: 2
        });
      } catch (err) {
        console.error("JsBarcode error:", err);
      }
    }
  }, [value]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        maxWidth: "260px",
        width: "100%",
        height: "auto",
        display: "block",
        margin: "0 auto"
      }}
    />
  );
}

function IndonesianDateInput({ value, onChange, ...props }: any) {
  const dateInputRef = useRef<HTMLInputElement>(null);
  const displayValue = value ? value.split('-').reverse().join('/') : "";

  const handleTriggerPicker = () => {
    if (dateInputRef.current) {
      try {
        dateInputRef.current.showPicker();
      } catch (err) {
        console.error("Failed to showpicker:", err);
      }
    }
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '45px' }}>
      <input
        type="text"
        value={displayValue}
        placeholder="DD/MM/YYYY"
        readOnly
        onClick={handleTriggerPicker}
        style={{
          ...props.style,
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 1,
          cursor: 'pointer',
          background: 'white'
        }}
      />
      {/* Calendar icon absolute positioned */}
      <span 
        onClick={handleTriggerPicker} 
        style={{
          position: 'absolute',
          right: '16px',
          top: '50%',
          transform: 'translateY(-50%)',
          zIndex: 2,
          cursor: 'pointer',
          pointerEvents: 'auto',
          display: 'flex',
          alignItems: 'center',
          color: '#64748b'
        }}
      >
        <Calendar size={18} />
      </span>
      {/* Native hidden date field that opens the picker */}
      <input
        ref={dateInputRef}
        type="date"
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          opacity: 0,
          zIndex: 0,
          pointerEvents: 'none'
        }}
      />
    </div>
  );
}

export default function PublicKatalogPage() {
  const [data, setData] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [gender, setGender] = useState("all");
  const [category, setCategory] = useState("all");
  const [pendidikan, setPendidikan] = useState("all");
  const [desaFilter, setDesaFilter] = useState("all");
  const [kelompokFilter, setKelompokFilter] = useState("all");
  const [pekerjaanFilter, setPekerjaanFilter] = useState("all");
  const [umurFilter, setUmurFilter] = useState("all");
  const [kriteriaFilter, setKriteriaFilter] = useState("all");
  const [hobiFilter, setHobiFilter] = useState("all");
  const [makananFilter, setMakananFilter] = useState("all");

  const [kotaList, setKotaList] = useState<string[]>([]);
  const [selectedKota, setSelectedKota] = useState("all");
  const [page, setPage] = useState(1);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userGender, setUserGender] = useState("");
  const [latestActivity, setLatestActivity] = useState<any>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [hasAttended, setHasAttended] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedParticipant, setSelectedParticipant] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [statusQueue, setStatusQueue] = useState<any>(null);
  const [pendidikanList, setPendidikanList] = useState<string[]>([]);
  const [wilayahList, setWilayahList] = useState<any[]>([]);
  const [kelompokList, setKelompokList] = useState<any[]>([]);
  const [pekerjaanList, setPekerjaanList] = useState<string[]>([]);
  const [umurList, setUmurList] = useState<number[]>([]);
  const [kriteriaList, setKriteriaList] = useState<string[]>([]);
  const [hobiList, setHobiList] = useState<string[]>([]);
  const [makananList, setMakananList] = useState<string[]>([]);
  const [selections, setSelections] = useState<any[]>([]);

  // Box Love state
  const [boxLoveStatus, setBoxLoveStatus] = useState<string>("closed");
  const [katalogPublicStatus, setKatalogPublicStatus] = useState<string>("closed");

  // Komentar state
  const [komentarNama, setKomentarNama] = useState("");
  const [komentarAnon, setKomentarAnon] = useState(false);
  const [submittingKomentar, setSubmittingKomentar] = useState<string | null>(null);
  const [userComments, setUserComments] = useState<any[]>([]);
  const [sentComments, setSentComments] = useState<any[]>([]);
  const [isCommentsModalOpen, setIsCommentsModalOpen] = useState(false);
  const [hasNewComments, setHasNewComments] = useState(false);
  const [activeTab, setActiveTab] = useState<"katalog" | "cart" | "profile" | "absen" | "hasil" | "saran">("katalog");
  const [hasilRRList, setHasilRRList] = useState<any[]>([]);
  const [loadingHasil, setLoadingHasil] = useState(false);
  const [hasilRRDrafts, setHasilRRDrafts] = useState<Record<string, string>>({});
  const [submittingHasilId, setSubmittingHasilId] = useState<string | null>(null);
  const [saranText, setSaranText] = useState("");
  const [kepadaSaran, setKepadaSaran] = useState("");
  const [kepadaSaranLainnya, setKepadaSaranLainnya] = useState("");
  const [isAnonimSaran, setIsAnonimSaran] = useState(false);
  const [submittingSaran, setSubmittingSaran] = useState(false);
  const [mySaranList, setMySaranList] = useState<any[]>([]);
  const [editingSaranId, setEditingSaranId] = useState<string | null>(null);
  const [showSaranForm, setShowSaranForm] = useState(false);
  const [absenTabMode, setAbsenTabMode] = useState<"show_barcode" | "scan_camera">("show_barcode");
  const [scanningAbsen, setScanningAbsen] = useState(false);
  const absenScannerRef = useRef<any>(null);
  const [attendanceValidation, setAttendanceValidation] = useState<{
    kegiatanId?: string | null;
    kegiatanJudul?: string | null;
    keterangan?: string | null;
    timestamp?: string | null;
    nama?: string | null;
    nomorUrut?: string | number | null;
  } | null>(null);
  const [myFullProfile, setMyFullProfile] = useState<any>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editProfileForm, setEditProfileForm] = useState<any>({});
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingFoto, setUploadingFoto] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeRooms, setActiveRooms] = useState<any[]>([]);

  const hasilRRPendingCount = hasilRRList.filter((item) => {
    if (!currentUser?.id) return false;
    const isPengirim = item.pengirimId === currentUser.id;
    const myHasil = isPengirim ? item.hasilPengirim : item.hasilPenerima;
    return !myHasil;
  }).length;



  // ─── HELPER: Safely build a query string with encoded params ──────────────
  // FIX: Prevents "The string did not match the expected pattern" DOMException
  // on mobile WebKit (iOS Safari) caused by unencoded special chars in URLs.
  const buildQuery = (params: Record<string, string | undefined | null>): string => {
    const p = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null) p.set(k, v);
    });
    return p.toString();
  };

  const formatAttendanceDate = (value?: string | null) => {
    if (!value) return "";
    const normalized = value.includes("T") ? value : value.replace(" ", "T");
    const parsed = new Date(normalized);
    if (Number.isNaN(parsed.getTime())) return "";
    return parsed.toLocaleString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const applyAttendanceValidation = useCallback((payload: any, fallback: any = {}) => {
    const attendance = payload?.attendance || payload?.existing || {};
    setAttendanceValidation({
      kegiatanId: attendance.kegiatanId || payload?.kegiatanId || fallback.kegiatanId || null,
      kegiatanJudul: attendance.kegiatanJudul || payload?.kegiatanJudul || fallback.kegiatanJudul || "Kegiatan Mandiri",
      keterangan: attendance.keterangan || payload?.attendanceKeterangan || payload?.keterangan || fallback.keterangan || "hadir",
      timestamp: attendance.timestamp || payload?.attendanceTimestamp || payload?.timestamp || fallback.timestamp || null,
      nama: payload?.nama || payload?.generusNama || fallback.nama || null,
      nomorUrut: payload?.nomorUrut || fallback.nomorUrut || null,
    });
  }, []);

  const refreshAttendanceStatus = useCallback(async () => {
    const storedUnik = localStorage.getItem("attended_nomor_unik");
    if (!storedUnik) return;

    const storedToken = localStorage.getItem("attended_session_token");
    let deviceId = localStorage.getItem("mandiri_device_id");
    if (!deviceId) {
      deviceId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      localStorage.setItem("mandiri_device_id", deviceId);
    }

    try {
      const res = await fetch(`/api/public/mandiri/katalog/check-status?${buildQuery({
        nomorUnik: storedUnik,
        ...(storedToken ? { sessionToken: storedToken } : {}),
        deviceId,
      })}`, { cache: "no-store" });
      if (!res.ok) return;

      const json = await res.json();
      if (json.status === "attended") {
        setHasAttended(true);
        applyAttendanceValidation(json);
        setCurrentUser((prev: any) => prev ? {
          ...prev,
          status: "attended",
          id: json.id || prev.id,
          nama: json.nama || prev.nama,
          nomorUrut: json.nomorUrut || prev.nomorUrut,
          nomorUnik: json.nomorUnik || prev.nomorUnik,
        } : prev);
      } else if (json.status === "waiting") {
        setAttendanceValidation(null);
        setCurrentUser((prev: any) => prev ? { ...prev, status: "waiting" } : prev);
      }
    } catch (e) {
      console.error("refreshAttendanceStatus error:", e);
    }
  }, [applyAttendanceValidation]);

  const stopSelfAbsenScan = async () => {
    if (absenScannerRef.current) {
      try {
        await absenScannerRef.current.stop();
      } catch { }
      absenScannerRef.current = null;
    }
    setScanningAbsen(false);
  };

  const startSelfAbsenScan = async () => {
    const uniqueNo = currentUser?.nomorUnik ||
      myFullProfile?.nomorUnik ||
      (typeof window !== "undefined" && localStorage.getItem("attended_nomor_unik")) ||
      "";
    if (!uniqueNo) {
      Swal.fire({ icon: "error", title: "Gagal", text: "Nomor Unik Anda tidak ditemukan. Pastikan Anda sudah login." });
      return;
    }

    setScanningAbsen(true);
    try {
      const { Html5Qrcode } = await import("html5-qrcode");

      if (absenScannerRef.current) {
        try { await absenScannerRef.current.stop(); } catch { }
      }

      const scanner = new Html5Qrcode("katalog-qr-reader");
      absenScannerRef.current = scanner;

      await scanner.start(
        { facingMode: "environment" },
        { fps: 15, qrbox: { width: 220, height: 220 } },
        async (decodedText) => {
          try {
            const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.frequency.setValueAtTime(880, ctx.currentTime);
            gain.gain.setValueAtTime(0.05, ctx.currentTime);
            osc.start();
            osc.stop(ctx.currentTime + 0.1);
          } catch { }

          await scanner.stop();
          absenScannerRef.current = null;
          setScanningAbsen(false);

          let kegId = "";
          try {
            const urlObj = new URL(decodedText);
            kegId = urlObj.searchParams.get("kegiatanId") || "";
          } catch {
            const match = decodedText.match(/[?&]kegiatanId=([^&]+)/);
            if (match) kegId = match[1];
          }

          if (!kegId) {
            Swal.fire({ icon: "error", title: "QR Code Tidak Valid", text: "QR Code ini bukan untuk absensi kegiatan." });
            return;
          }

          Swal.fire({
            title: "Mencatat Kehadiran...",
            allowOutsideClick: false,
            didOpen: () => { Swal.showLoading(); }
          });

          try {
            const res = await fetch("/api/public/absensi", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ kegiatanId: kegId, nomorUnik: uniqueNo }),
            });
            const data = await res.json();

            if (res.status === 409) {
              applyAttendanceValidation(data, {
                kegiatanId: kegId,
                nama: currentUser?.nama,
                nomorUrut: currentUser?.nomorUrut,
              });
              setCurrentUser((prev: any) => prev ? { ...prev, status: "attended" } : prev);
              setAbsenTabMode("show_barcode");
              Swal.fire({ icon: "info", title: "Sudah Hadir", text: "Anda sudah tercatat hadir untuk kegiatan ini." });
            } else if (!res.ok) {
              Swal.fire({ icon: "error", title: "Gagal", text: data.error || "Gagal mencatat absensi." });
            } else {
              applyAttendanceValidation(data, {
                kegiatanId: kegId,
                nama: currentUser?.nama,
                nomorUrut: currentUser?.nomorUrut,
                timestamp: new Date().toISOString(),
              });
              setCurrentUser((prev: any) => prev ? { ...prev, status: "attended" } : prev);
              Swal.fire({ icon: "success", title: "Berhasil", text: "Kehadiran Anda berhasil dicatat!", timer: 2000, showConfirmButton: false });
              setAbsenTabMode("show_barcode");
              refreshAttendanceStatus();
            }
          } catch {
            Swal.fire({ icon: "error", title: "Error", text: "Terjadi kesalahan jaringan." });
          }
        },
        () => { }
      );
    } catch (e) {
      console.error("Self QR scan error:", e);
      Swal.fire({ icon: "error", title: "Kamera Gagal", text: "Gagal mengakses kamera. Mohon berikan izin kamera." });
    }
  };

  useEffect(() => {
    if (activeTab !== "absen" || absenTabMode !== "scan_camera") {
      stopSelfAbsenScan();
    }
  }, [activeTab, absenTabMode]);

  const fetchUserComments = useCallback(async (userId: string) => {
    try {
      // FIX: Use encodeURIComponent for userId to prevent URL parse errors on mobile
      const resRec = await fetch(`/api/mandiri/komentar?penerimaId=${encodeURIComponent(userId)}`);
      if (resRec.ok) {
        const data = await resRec.json();
        const lastSeen = localStorage.getItem(`last_seen_comment_${userId}`);
        if (data.length > 0 && data[0].id !== lastSeen && !isCommentsModalOpen) {
          setHasNewComments(true);
        }
        setUserComments(data);
      }

      const resSent = await fetch(`/api/mandiri/komentar?pengirimId=${encodeURIComponent(userId)}`);
      if (resSent.ok) {
        const data = await resSent.json();
        setSentComments(data);
      }
    } catch (e) {
      console.error("Error fetching comments:", e);
    }
  }, [isCommentsModalOpen]);

  // Periodic polling for comments
  useEffect(() => {
    if (currentUser?.id) {
      const interval = setInterval(() => {
        fetchUserComments(currentUser.id);
      }, 30000);
      return () => clearInterval(interval);
    }
  }, [currentUser?.id, fetchUserComments]);

  // Update last seen when modal is open
  useEffect(() => {
    if (isCommentsModalOpen && currentUser?.id && userComments.length > 0) {
      localStorage.setItem(`last_seen_comment_${currentUser.id}`, userComments[0].id);
      setHasNewComments(false);
    }
  }, [isCommentsModalOpen, currentUser?.id, userComments]);

  const limit = 20;

  useEffect(() => {
    const saved = localStorage.getItem("mandiri_selections");
    if (saved) {
      try { setSelectedIds(JSON.parse(saved)); } catch (e) { }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("mandiri_selections", JSON.stringify(selectedIds));
  }, [selectedIds]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const storedUnik = localStorage.getItem("attended_nomor_unik");
      const storedToken = localStorage.getItem("attended_session_token");

      // FIX: Use buildQuery helper so ALL values are properly encoded
      // This is the primary fix for "The string did not match the expected pattern"
      const qs = buildQuery({
        search,
        page: String(page),
        limit: String(limit),
        jenisKelamin: gender,
        status: category === "pilihan" ? "all" : category,
        pendidikan,
        mandiriDesaId: desaFilter,
        kelompokId: kelompokFilter,
        pekerjaan: pekerjaanFilter,
        umur: umurFilter,
        kriteria: kriteriaFilter,
        hobi: hobiFilter,
        makanan: makananFilter,
        kota: selectedKota,
        nomorUnik: storedUnik || "",
        sessionToken: storedToken || "",
        onlyChosen: category === "pilihan" ? "true" : "",
      });

      const res = await fetch(`/api/public/mandiri/katalog?${qs}`, { cache: "no-store" });

      if (res.status === 403) {
        setIsLocked(true);
        setLoading(false);
        return;
      }

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const json = await res.json();
      setData(json.data || []);
      setTotal(json.total || 0);
    } catch (e: any) {
      console.error("fetchData error:", e);
    } finally {
      setLoading(false);
    }
  }, [search, page, gender, category, pendidikan, selectedKota, desaFilter, kelompokFilter, pekerjaanFilter, umurFilter, kriteriaFilter, hobiFilter, makananFilter, hasAttended, isAdmin]);

  useEffect(() => {
    if (hasAttended) fetchData();
  }, [fetchData, hasAttended]);

  useEffect(() => {
    async function init() {
      try {
        const storedUnik = localStorage.getItem("attended_nomor_unik");
        const storedToken = localStorage.getItem("attended_session_token");
        let deviceId = localStorage.getItem("mandiri_device_id");
        if (!deviceId) {
          deviceId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
          localStorage.setItem("mandiri_device_id", deviceId);
        }

        // Concurrent fetching for all parallelizable initial endpoints
        const [titleRes, descRes, filterRes, boxLoveRes, katalogStatusRes, profileRes, checkStatusRes, desaRes, kelRes] = await Promise.all([
          fetch("/api/public/mandiri/settings?key=mandiri_registration_title", { cache: "no-store" }),
          fetch("/api/public/mandiri/settings?key=mandiri_registration_description", { cache: "no-store" }),
          fetch("/api/public/mandiri/filters", { cache: "no-store" }),
          fetch("/api/mandiri/box-love?action=status", { cache: "no-store" }),
          fetch("/api/public/mandiri/settings?key=mandiri_katalog_public_status", { cache: "no-store" }),
          fetch("/api/profile", { cache: "no-store" }).catch(() => null),
          storedUnik ? fetch(`/api/public/mandiri/katalog/check-status?${buildQuery({
            nomorUnik: storedUnik,
            ...(storedToken ? { sessionToken: storedToken } : {}),
            deviceId,
          })}`, { cache: "no-store" }) : Promise.resolve(null),
          fetch("/api/public/mandiri/desa", { cache: "no-store" }).catch(() => null),
          fetch("/api/public/mandiri/kelompok", { cache: "no-store" }).catch(() => null)
        ]);

        let title = "KATALOG PESERTA dan PANITIA";
        let description = "";
        if (titleRes.ok) { const t = await titleRes.json(); if (t.value) title = t.value; }
        if (descRes.ok) { const d = await descRes.json(); if (d.value) description = d.value; }
        setLatestActivity({ title, description });

        if (filterRes.ok) {
          const filterJson = await filterRes.json();
          setPendidikanList(filterJson.pendidikan || []);
          setPekerjaanList(filterJson.pekerjaan || []);
          setUmurList(filterJson.umur || []);
          setKriteriaList(filterJson.kriteriaPasangan || []);
          setHobiList(filterJson.hobi || []);
          setMakananList(filterJson.makanan || []);
        }

        if (desaRes && desaRes.ok) {
          const desas = await desaRes.json();
          if (Array.isArray(desas)) {
            setWilayahList(desas);
            const cities = Array.from(new Set(desas.map((d: any) => d.kota || d.daerahNama || ""))).filter(Boolean).sort() as string[];
            setKotaList(cities);
          }
        }

        if (kelRes && kelRes.ok) {
          const kelompoks = await kelRes.json();
          if (Array.isArray(kelompoks)) {
            setKelompokList(kelompoks);
          }
        }

        if (boxLoveRes.ok) {
          const boxLoveJson = await boxLoveRes.json();
          setBoxLoveStatus(boxLoveJson.value || "closed");
        }
        
        if (katalogStatusRes && katalogStatusRes.ok) {
          const json = await katalogStatusRes.json();
          setKatalogPublicStatus(json.value || "closed");
        }

        let userIsAdmin = false;
        let genderFromCheckStatus: string | null = null;

        if (checkStatusRes && checkStatusRes.ok) {
          const rawText = await checkStatusRes.text();
          if (rawText) {
            const data = JSON.parse(rawText);

            if (data.status === "attended" || data.status === "waiting") {
              if (data.status === "attended") {
                applyAttendanceValidation(data);
              } else {
                setAttendanceValidation(null);
              }
              setHasAttended(true);
              const userRole = data.role || localStorage.getItem("attended_role") || "Peserta";
              setCurrentUser({
                id: data.id,
                nama: data.nama,
                nomorUrut: data.nomorUrut,
                nomorUnik: data.nomorUnik || storedUnik || "",
                mandiriDesaNama: data.mandiriDesaNama,
                mandiriDesaKota: data.mandiriDesaKota,
                jenisKelamin: data.jenisKelamin,
                role: userRole,
                noTelp: data.noTelp,
                status: data.status,
              });

              // Bind FCM to existing user phone number
              if (typeof window !== "undefined" && data.noTelp) {
                import("@/lib/fcm-client").then(({ registerFCM }) => {
                  registerFCM(data.noTelp);
                }).catch(e => console.error("FCM client import failed:", e));
              }

              if (data.jenisKelamin) {
                genderFromCheckStatus = data.jenisKelamin;
                setUserGender(data.jenisKelamin);
                // Peserta/panitia melihat katalog lawan jenis
                setGender(data.jenisKelamin === "L" ? "P" : "L");
              }
              setKomentarNama(data.nama);
              localStorage.setItem("attended_role", userRole);

              // Parallelize comments check and selections fetch
              const selQs = buildQuery({ nomorUnik: storedUnik, token: storedToken || "" });
              const [commRes, selRes] = await Promise.all([
                fetchUserComments(data.id),
                fetch(`/api/mandiri/pilih?${selQs}`, { cache: "no-store" })
              ]);

              if (selRes && selRes.ok) {
                const selText = await selRes.text();
                if (selText) {
                  try {
                    const selJson = JSON.parse(selText);
                    if (Array.isArray(selJson)) {
                      setSelections(selJson);
                      setSelectedIds(selJson.map((s: any) => String(s.penerimaId)));
                      setStatusQueue(selJson.find((s: any) => s.status === "Menunggu") || null);
                    }
                  } catch (e) { console.error("selJson parse error:", e); }
                }
              }
            } else if (data.status === "multi_login") {
              handleLogout();
            } else if (data.status === "not_found" || data.status === "no_activity") {
              localStorage.removeItem("attended_nomor_unik");
              localStorage.removeItem("attended_session_token");
              localStorage.removeItem("attended_role");
              setHasAttended(false);
              window.location.href = "/mandiri/katalog/login";
              return;
            }
          }
        }

        // Verifikasi admin/tim_pnkb session via profileRes
        // Hanya set gender dari profile jika checkStatusRes belum menemukannya,
        // untuk mencegah jenisKelamin hardcoded "L" di profile API menimpa data asli peserta/panitia
        if (profileRes && profileRes.ok) {
          try {
            const profile = await profileRes.json();
            if (profile && ["admin", "admin_romantic_room", "tim_pnkb", "tim_pnkb_gambuh"].includes(profile.role)) {
              userIsAdmin = true;
              setIsAdmin(true);
              if (!genderFromCheckStatus && profile.jenisKelamin) {
                setUserGender(profile.jenisKelamin);
                setGender(profile.jenisKelamin === "L" ? "P" : "L");
              }
            }
          } catch (e) {}
        }
        // Fetch active rooms for Admin to allow 'Selesaikan Sesi' from Katalog
        if (userIsAdmin) {
           try {
             const roomsRes = await fetch("/api/mandiri/rooms");
             if (roomsRes.ok) {
               setActiveRooms(await roomsRes.json());
             }
           } catch(e) {}
        }
      } catch (e) {
        console.error("init error:", e);
      } finally {
        setVerifying(false);
      }
    }
    init();
  }, []);

  useEffect(() => {
    if (!currentUser?.id) return;
    async function fetchMyProfile() {
      setLoadingProfile(true);
      try {
        const res = await fetch(`/api/public/mandiri/katalog/${currentUser.id}`);
        if (res.ok) {
          const json = await res.json();
          setMyFullProfile(json);
        }
      } catch (err) {
        console.error("fetchMyProfile error:", err);
      } finally {
        setLoadingProfile(false);
      }
    }
    fetchMyProfile();
  }, [currentUser?.id]);



  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchTerm);
      setPage(1);
    }, 400); // Increased debounce slightly for better mobile performance
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    if (verifying) return; // Do not fetch data while verifying / initializing!
    const timer = setTimeout(fetchData, 100);
    return () => clearTimeout(timer);
  }, [fetchData, verifying]);

  const fetchSelections = useCallback(async () => {
    const storedUnik = localStorage.getItem("attended_nomor_unik");
    const storedToken = localStorage.getItem("attended_session_token");
    if (!storedUnik) return;

    const selQs = buildQuery({ nomorUnik: storedUnik, token: storedToken || "" });
    try {
      const selRes = await fetch(`/api/mandiri/pilih?${selQs}`);
      if (selRes.ok) {
        const selText = await selRes.text();
        if (selText) {
          const selJson = JSON.parse(selText);
          if (Array.isArray(selJson)) {
            setSelections(selJson);
            setSelectedIds(selJson.map((s: any) => String(s.penerimaId)));
            setStatusQueue(selJson.find((s: any) => s.status === "Menunggu") || null);
          }
        }
      }
    } catch (e) {
      console.error("fetchSelections error:", e);
    }
  }, []);

  const fetchHasilRR = useCallback(async (showLoading = false) => {
    if (!currentUser?.id) return;
    if (showLoading) setLoadingHasil(true);
    try {
      const res = await fetch(`/api/mandiri/hasil-rr?generusId=${currentUser.id}`);
      if (res.ok) {
        const json = await res.json();
        setHasilRRList(json);
      }
    } catch (e) {
      console.error("fetchHasilRR error:", e);
    } finally {
      if (showLoading) setLoadingHasil(false);
    }
  }, [currentUser?.id]);

  const fetchMySaran = useCallback(async () => {
    if (!currentUser?.id) return;
    try {
      const res = await fetch(`/api/public/saran?userId=${currentUser.id}`);
      if (res.ok) {
        const json = await res.json();
        setMySaranList(Array.isArray(json) ? json : []);
      }
    } catch (e) {
      console.error("fetchMySaran error:", e);
    }
  }, [currentUser]);

  useEffect(() => {
    if (activeTab === "hasil") {
      fetchHasilRR(true);
    }
    if (activeTab === "saran") {
      fetchMySaran();
    }
  }, [activeTab, fetchHasilRR, fetchMySaran]);

  useEffect(() => {
    if (currentUser?.id) {
      fetchHasilRR(false);
    }
  }, [currentUser?.id, fetchHasilRR]);

  // Realtime updates using Pusher
  useEffect(() => {
    const pusher = getPusherClient();
    if (!pusher) return;

    const channel = pusher.subscribe("taaruf-channel");

    const handleUpdate = () => {
      // Trigger data refetching
      fetchData();
      fetchSelections();
      fetchHasilRR(false);
    };

    const handleAttendanceUpdate = () => {
      fetchData();
      refreshAttendanceStatus();
    };

    const handleBoxLoveUpdate = (data: any) => {
      if (data && data.status) {
        setBoxLoveStatus(data.status);
      }
    };

    channel.bind("taaruf-changed", handleUpdate);
    channel.bind("room-changed", handleUpdate);
    channel.bind("absensi-updated", handleAttendanceUpdate);
    channel.bind("box-love-status-changed", handleBoxLoveUpdate);

    return () => {
      channel.unbind("taaruf-changed", handleUpdate);
      channel.unbind("room-changed", handleUpdate);
      channel.unbind("absensi-updated", handleAttendanceUpdate);
      channel.unbind("box-love-status-changed", handleBoxLoveUpdate);
      pusher.unsubscribe("taaruf-channel");
    };
  }, [fetchData, fetchSelections, fetchHasilRR, refreshAttendanceStatus]);

  const handleSendKomentar = async (penerimaId: string, itemNama: string, komentar: string) => {
    if (submittingKomentar) return;

    if (sentComments.some(sc => sc.penerimaId === penerimaId)) {
      Swal.fire("Akses Diblokir", "Anda sudah mengirimkan komentar kepada peserta ini.", "warning");
      return;
    }

    const { isConfirmed } = await Swal.fire({
      title: `Berikan komentar ${komentar}?`,
      text: `Anda akan memberikan komentar "${komentar}" untuk ${itemNama}. Setelah dikirim, Anda tidak dapat mengubah komentar ini.`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Ya, Kirim',
      cancelButtonText: 'Batal',
      confirmButtonColor: '#3b82f6',
    });

    if (!isConfirmed) return;

    setSubmittingKomentar(penerimaId);
    try {
      const res = await fetch("/api/mandiri/komentar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          penerimaId,
          pengirimId: currentUser?.id,
          pengirimNama: komentarNama,
          isAnonim: komentarAnon,
          komentar,
        }),
      });
      const result = await res.json();
      if (result.success) {
        Swal.fire({ title: "Berhasil!", text: "Komentar Anda telah terkirim.", icon: "success", timer: 2000, showConfirmButton: false, toast: true, position: 'top-end' });
        if (currentUser?.id) fetchUserComments(currentUser.id);
      } else {
        Swal.fire("Gagal", result.error || "Gagal mengirim komentar", "error");
      }
    } catch (e) {
      // FIX: More descriptive error — distinguish network vs server error
      Swal.fire("Error", "Gagal terhubung ke server. Periksa koneksi internet Anda.", "error");
    } finally {
      setSubmittingKomentar(null);
    }
  };

  const submitHasilRR = async (id: string, hasil: string) => {
    setSubmittingHasilId(id);
    try {
      const res = await fetch("/api/mandiri/hasil-rr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, generusId: currentUser?.id, hasil })
      });
      const data = await res.json();
      if (data.success) {
        Swal.fire({ icon: "success", title: "Berhasil", text: "Hasil berhasil disimpan", timer: 1500, showConfirmButton: false });
        setHasilRRDrafts(prev => {
          const next = { ...prev };
          delete next[id];
          return next;
        });
        fetchHasilRR();
      } else {
        Swal.fire("Gagal", data.error || "Gagal menyimpan hasil", "error");
      }
    } catch (e) {
      Swal.fire("Error", "Gagal terhubung ke server", "error");
    } finally {
      setSubmittingHasilId(null);
    }
  };

  const handleSubmitHasilRR = async (id: string, partnerName: string) => {
    const hasil = hasilRRDrafts[id];
    if (!hasil) {
      Swal.fire("Pilih Hasil", "Silakan pilih hasil RR terlebih dahulu.", "warning");
      return;
    }

    const result = await Swal.fire({
      title: "Submit Hasil RR?",
      text: `Anda akan menyimpan jawaban "${hasil}" untuk sesi bersama ${partnerName}.`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Submit",
      cancelButtonText: "Batal",
      confirmButtonColor: "#10b981",
      cancelButtonColor: "#64748b",
      reverseButtons: true,
    });

    if (result.isConfirmed) {
      await submitHasilRR(id, hasil);
    }
  };

  const handleSubmitSaran = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!saranText.trim()) return;
    
    setSubmittingSaran(true);
    try {
      const storedToken = localStorage.getItem("attended_session_token");
      
      const payload: any = {
        untuk: "Romantic Room",
        kepada: kepadaSaran === 'Lainnya' ? kepadaSaranLainnya : kepadaSaran,
        saran: saranText,
        nama: currentUser?.nama || "",
        isAnonim: isAnonimSaran,
        userId: currentUser?.id
      };
      
      let res;
      if (editingSaranId) {
        payload.id = editingSaranId;
        payload.token = storedToken;
        res = await fetch("/api/public/saran", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
      } else {
        res = await fetch("/api/public/saran", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
      }

      const data = await res.json();
      if (res.ok && data.success) {
        Swal.fire({
          icon: "success",
          title: "Berhasil",
          text: "Saran/masukan Anda telah disimpan!",
          timer: 2000,
          showConfirmButton: false
        });
        setSaranText("");
        setKepadaSaran("");
        setKepadaSaranLainnya("");
        setIsAnonimSaran(false);
        setEditingSaranId(null);
        
        // Refresh the list
        if (currentUser?.id) {
          const freshRes = await fetch(`/api/public/saran?userId=${currentUser.id}`);
          if (freshRes.ok) {
            const freshJson = await freshRes.json();
            setMySaranList(Array.isArray(freshJson) ? freshJson : []);
          }
        }
      } else {
        Swal.fire("Gagal", data.error || "Gagal menyimpan saran", "error");
      }
    } catch (err) {
      Swal.fire("Error", "Gagal terhubung ke server", "error");
    } finally {
      setSubmittingSaran(false);
    }
  };

  const handleEditSaran = (saran: any) => {
    setSaranText(saran.saran);
    const standardOptions = ["Tim Acara", "Tim Romantic Room", "Tim PNKB dan Ibu Gambuh"];
    if (saran.kepada && !standardOptions.includes(saran.kepada)) {
      setKepadaSaran("Lainnya");
      setKepadaSaranLainnya(saran.kepada);
    } else {
      setKepadaSaran(saran.kepada || "");
      setKepadaSaranLainnya("");
    }
    setIsAnonimSaran(saran.isAnonim === 1);
    setEditingSaranId(saran.id);
  };

  const handleDeleteSaran = async (id: string) => {
    const result = await Swal.fire({
      title: 'Hapus Saran?',
      text: "Apakah Anda yakin ingin menghapus saran ini?",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#94a3b8',
      confirmButtonText: 'Ya, Hapus!'
    });

    if (result.isConfirmed) {
      try {
        const token = localStorage.getItem("attended_session_token");
        const res = await fetch(`/api/public/saran?id=${id}&userId=${currentUser?.id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          Swal.fire('Terhapus!', 'Saran telah dihapus.', 'success');
          fetchMySaran();
        } else {
          Swal.fire('Gagal', 'Gagal menghapus saran', 'error');
        }
      } catch (e) {
        Swal.fire('Error', 'Terjadi kesalahan jaringan', 'error');
      }
    }
  };

  const handleLogout = async () => {
    const { isConfirmed } = await Swal.fire({
      title: "Keluar dari Akun?",
      text: "Anda akan keluar dari perangkat ini. Status Anda tidak akan diubah.",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Ya, Keluar",
      cancelButtonText: "Batal",
      confirmButtonColor: "#3b82f6",
      cancelButtonColor: "#64748b"
    });

    if (!isConfirmed) return;

    Swal.fire({
      title: "Sedang keluar...",
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    const storedUnik = localStorage.getItem("attended_nomor_unik");
    if (storedUnik) {
      try {
        await fetch("/api/public/mandiri/katalog/logout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nomorUnik: storedUnik })
        });
      } catch (e) {
        console.error("Failed to perform logout API request:", e);
      }
    }
    localStorage.removeItem("attended_nomor_unik");
    localStorage.removeItem("attended_session_token");
    setHasAttended(false);
    unlockBodyScroll();
    Swal.close();
    window.location.href = "/mandiri/katalog/login";
  };

  const handlePulang = async () => {
    const { value: alasan, isConfirmed } = await Swal.fire({
      title: "Konfirmasi Pulang",
      text: "Apakah Anda yakin ingin pulang? Masukkan alasan pulang Anda:",
      input: "text",
      inputPlaceholder: "Contoh: Keperluan keluarga, lelah, dll.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Ya, Saya Pulang",
      cancelButtonText: "Batal",
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#64748b",
      inputValidator: (value) => {
        if (!value || !value.trim()) {
          return "Alasan pulang wajib diisi!";
        }
      }
    });

    if (!isConfirmed) return;

    Swal.fire({
      title: "Sedang memproses...",
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    const storedUnik = localStorage.getItem("attended_nomor_unik");
    if (storedUnik) {
      try {
        const res = await fetch("/api/public/mandiri/katalog/pulang", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nomorUnik: storedUnik, alasanPulang: alasan })
        });
        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || "Gagal memproses");
        }

        await Swal.fire({
          title: "Berhasil",
          text: "Semoga alloh berikan pengampunan dan jodoh yg barokah",
          icon: "success",
          confirmButtonText: "Aamiin",
          confirmButtonColor: "#3b82f6"
        });
      } catch (e: any) {
        console.error("Failed to perform pulang API request:", e);
        Swal.fire("Gagal", e.message || "Gagal memproses data", "error");
        return;
      }
    } else {
      Swal.close();
    }

    localStorage.removeItem("attended_nomor_unik");
    localStorage.removeItem("attended_session_token");
    setHasAttended(false);
    unlockBodyScroll();
    window.location.href = "/mandiri/katalog/login";
  };

  // ─── Box Love handlers ────────────────────────────────────────────────────

  const lockBodyScroll = () => {
    const scrollY = window.scrollY;
    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = "100%";
    document.body.dataset.scrollY = String(scrollY);
  };
  const unlockBodyScroll = () => {
    const scrollY = Number(document.body.dataset.scrollY || "0");
    document.body.style.overflow = "";
    document.body.style.position = "";
    document.body.style.top = "";
    document.body.style.width = "";
    window.scrollTo(0, scrollY);
  };



  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      if (prev.includes(id)) return prev.filter(i => i !== id);
      if (prev.length >= 3) return prev;
      return [...prev, id];
    });
  };

  const handleAdminSelesaikanSesi = async (sp: any) => {
    const room = sp.roomId ? activeRooms.find((r: any) => r.id === sp.roomId) : activeRooms.find((r: any) => String(r.pengirimNo) === String(sp.nomorUnik) || String(r.penerimaNo) === String(sp.nomorUnik));
    
    if (!room) {
        Swal.fire("Error", "Ruangan tidak ditemukan", "error");
        return;
    }

    const isPengirim = String(currentUser?.nomorUnik) === String(room.pengirimNo);
    const isPenerima = String(currentUser?.nomorUnik) === String(room.penerimaNo);
    const isThirdPartyAdmin = !isPengirim && !isPenerima;

    let htmlContent = `<div style="text-align: left; margin-bottom: 20px;">`;
    
    if (isThirdPartyAdmin) {
        htmlContent += `<p style="font-size: 14px; margin-bottom: 15px; color: #64748b;">Tentukan hasil pertemuan untuk kedua belah pihak:</p>`;
    } else {
        htmlContent += `<p style="font-size: 14px; margin-bottom: 15px; color: #64748b;">Bagaimana hasil pertemuan Anda?</p>`;
    }

    if (isPengirim || isThirdPartyAdmin) {
        htmlContent += `
            <div style="margin-bottom: 20px;">
                <label style="display: block; font-weight: 800; font-size: 11px; text-transform: uppercase; color: #1e293b; margin-bottom: 8px; letter-spacing: 0.5px;">
                    ${isThirdPartyAdmin ? 'Pemilih: ' : 'Anda: '}<span style="color: #f43f5e; margin-left: 4px;">${room.pengirimNama}</span>
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
        `;
    }

    if (isPenerima || isThirdPartyAdmin) {
        htmlContent += `
            <div>
                <label style="display: block; font-weight: 800; font-size: 11px; text-transform: uppercase; color: #1e293b; margin-bottom: 8px; letter-spacing: 0.5px;">
                    ${isThirdPartyAdmin ? 'Terpilih: ' : 'Anda: '}<span style="color: #f43f5e; margin-left: 4px;">${room.penerimaNama}</span>
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
        `;
    }

    htmlContent += `
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
            }
            input[type="radio"]:checked + .swal-custom-radio {
                border-color: #f43f5e;
                background: #fff1f2;
                color: #f43f5e;
            }
        </style>
    </div>`;

    const { value: formValues } = await Swal.fire({
            title: isAdmin ? 'Selesaikan Sesi?' : 'Input Hasil RR',
            html: htmlContent,
            showCancelButton: true,
            confirmButtonColor: '#10b981',
            confirmButtonText: 'Simpan',
            cancelButtonText: 'Batal',
            preConfirm: () => {
                const hasil_p = document.querySelector('input[name="hasil_p"]:checked') ? (document.querySelector('input[name="hasil_p"]:checked') as HTMLInputElement).value : undefined;
                const hasil_t = document.querySelector('input[name="hasil_t"]:checked') ? (document.querySelector('input[name="hasil_t"]:checked') as HTMLInputElement).value : undefined;
                return { hasil_p, hasil_t };
            }
        });

        if (formValues) {
            try {
                // If the user only submitted their own result, we can save it via /api/mandiri/hasil-rr first
                if (isPengirim || isPenerima) {
                     const roleSide = isPengirim ? 'Pemilih' : 'Terpilih';
                     const resultVal = isPengirim ? formValues.hasil_p : formValues.hasil_t;
                     // Optional: we could directly submit to hasil-rr if we don't want to clear the room,
                     // BUT clicking "Selesaikan Sesi" implies they are clearing the room. 
                     // We will proceed to clear the room via PATCH.
                }

                const res = await fetch(`/api/mandiri/rooms/${room.id}`, {
                    method: "PATCH",
                    headers: { 
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${localStorage.getItem("attended_session_token") || ""}`
                    },
                    body: JSON.stringify({ action: "clear", hasilPengirim: formValues.hasil_p, hasilPenerima: formValues.hasil_t, operatorCompanionId: currentUser?.id })
                });

                if (!res.ok) throw new Error((await res.json()).error);

                Swal.fire({
                    title: "Berhasil!",
                    text: isAdmin ? "Sesi telah selesai dan hasil disimpan." : "Hasil pertemuan Anda berhasil disimpan.",
                    icon: "success",
                    timer: 1500,
                    showConfirmButton: false
                });
                
                fetchData();
            } catch (err: any) {
                Swal.fire("Error", err.message, "error");
            }
        }
  };

  const handleConfirmSelection = async (targetId: string, targetName: string) => {
    const nomorUnik = localStorage.getItem("attended_nomor_unik");
    const token = localStorage.getItem("attended_session_token");

    const result = await Swal.fire({
      title: 'Pilih Peserta?',
      text: `Apakah Anda yakin ingin memilih ${targetName}? Pilihan ini akan langsung diteruskan ke Romantic Room.`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Ya, Pilih!',
      cancelButtonText: 'Batal',
    });

    if (result.isConfirmed) {
      Swal.fire({
        title: "Memproses Pilihan...",
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });
      try {
        const res = await fetch("/api/mandiri/pilih", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ targetId, nomorUnik, token }),
        });

        const text = await res.text();
        if (!text) throw new Error("Server tidak mengembalikan data. Coba lagi.");
        let json: any;
        try { json = JSON.parse(text); } catch { throw new Error("Respons server tidak valid. Coba lagi."); }
        if (!res.ok) throw new Error(json.error || "Gagal melakukan pemilihan");

        if (json.selections) {
          setSelections(json.selections);
          setSelectedIds(json.selections.map((s: any) => String(s.penerimaId)));
          setStatusQueue(json.selections.find((s: any) => s.status === "Menunggu") || null);
        }

        setData(prev => prev.map(item =>
          item.id === targetId ? { ...item, selectedCount: (item.selectedCount || 0) + 1 } : item
        ));

        if (selectedParticipant && selectedParticipant.id === targetId) {
          setSelectedParticipant((prev: any) => ({ ...prev, selectedCount: (prev.selectedCount || 0) + 1 }));
        }

        Swal.fire({ title: 'Berhasil!', text: 'Pilihan Anda telah dikirim. Sedang dalam antrean admin Romantic Room.', icon: 'success', timer: 3000, showConfirmButton: false });
        closeDetail();
      } catch (err: any) {
        Swal.fire("Gagal", err.message, "error");
      }
    }
  };

  const handleCancelSelection = async (targetId: string, targetName: string) => {
    const nomorUnik = localStorage.getItem("attended_nomor_unik");
    const token = localStorage.getItem("attended_session_token");

    const result = await Swal.fire({
      title: 'Batalkan Pilihan?',
      text: `Apakah Anda yakin ingin membatalkan pilihan Anda untuk ${targetName}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Ya, Batalkan!',
      cancelButtonText: 'Kembali',
    });

    if (result.isConfirmed) {
      try {
        const qs = buildQuery({
          targetId,
          nomorUnik: nomorUnik || "",
          token: token || "",
        });
        const res = await fetch(`/api/mandiri/pilih?${qs}`, {
          method: "DELETE",
        });

        const text = await res.text();
        if (!text) throw new Error("Server tidak mengembalikan data. Coba lagi.");
        let json: any;
        try { json = JSON.parse(text); } catch { throw new Error("Respons server tidak valid. Coba lagi."); }
        if (!res.ok) throw new Error(json.error || "Gagal membatalkan pemilihan");

        if (json.selections) {
          setSelections(json.selections);
          setSelectedIds(json.selections.map((s: any) => String(s.penerimaId)));
          setStatusQueue(json.selections.find((s: any) => s.status === "Menunggu") || null);
        }

        setData(prev => prev.map(item =>
          item.id === targetId ? { ...item, selectedCount: Math.max(0, (item.selectedCount || 0) - 1) } : item
        ));

        if (selectedParticipant && selectedParticipant.id === targetId) {
          setSelectedParticipant((prev: any) => ({ ...prev, selectedCount: Math.max(0, (prev.selectedCount || 0) - 1) }));
        }

        Swal.fire({ title: 'Dibatalkan!', text: 'Pilihan Anda telah berhasil dibatalkan.', icon: 'success', timer: 3000, showConfirmButton: false });
        closeDetail();
      } catch (err: any) {
        Swal.fire("Gagal", err.message, "error");
      }
    }
  };

  const totalPages = Math.ceil(total / limit);

  const openDetail = (participant: any) => {
    setSelectedParticipant(participant);
    setIsModalOpen(true);
    lockBodyScroll();
  };

  const closeDetail = () => {
    setIsModalOpen(false);
    unlockBodyScroll();
  };

  useEffect(() => {
    if (!verifying && !isLocked && !hasAttended) {
      window.location.href = "/mandiri/katalog/login";
    }
  }, [verifying, isLocked, hasAttended]);

  // ─── Early returns ────────────────────────────────────────────────────────

  if (isLocked || (katalogPublicStatus === "closed" && !hasAttended && !isAdmin)) {
    return (
      <div className="locked-container">
        <div className="locked-card">
          <Lock size={48} className="lock-icon" />
          <h1>Halaman Ditutup</h1>
          <p>Maaf, halaman saat ini ditutup oleh Admin.</p>
          <Link href="/" className="home-btn">Kembali ke Beranda</Link>
        </div>
        <style jsx>{`
          .locked-container { min-height: 100vh; display: flex; align-items: center; justify-content: center; background: #f8fafc; padding: 20px; }
          .locked-card { background: white; padding: 40px; border-radius: 24px; box-shadow: 0 10px 25px rgba(0,0,0,0.05); text-align: center; max-width: 400px; border: 1px solid #e2e8f0; }
          .lock-icon { color: #ef4444; margin-bottom: 20px; }
          h1 { font-size: 24px; font-weight: 800; color: #1e293b; margin-bottom: 12px; }
          p { color: #64748b; margin-bottom: 24px; line-height: 1.6; }
          .home-btn { display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; border-radius: 12px; font-weight: 700; text-decoration: none; transition: 0.2s; }
          .home-btn:hover { background: #2563eb; transform: translateY(-2px); }
        `}</style>
      </div>
    );
  }

  if (verifying) {
    return (
      <div className="loading-screen">
        <div className="spinner-large"></div>
        <style jsx>{`
          .loading-screen { min-height: 100vh; display: flex; align-items: center; justify-content: center; background: #f8fafc; flex-direction: column; }
          .spinner-large { width: 50px; height: 50px; border: 5px solid #e2e8f0; border-top-color: #3b82f6; border-radius: 50%; animation: spin 1s linear infinite; }
          @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        `}</style>
      </div>
    );
  }



  if (!hasAttended && !isAdmin) {
    return null; // Return empty while redirecting
  }

  const selectedNames = selections.map(item => `${item.penerimaNama} (#${item.penerimaNoUrut || item.penerimaNo})`);

  return (
    <div className="container pb-24">

      {/* Desktop Tabs */}
      <div className="desktop-tab-nav">
        <button className={activeTab === "katalog" ? "active" : ""} onClick={() => setActiveTab("katalog")}>
          <Users size={16} />
          <span>Katalog</span>
        </button>
        <button className={activeTab === "cart" ? "active" : ""} onClick={() => setActiveTab("cart")}>
          <div className="badge-icon-wrapper">
            <Heart size={16} fill={activeTab === "cart" ? "#f43f5e" : "transparent"} color={activeTab === "cart" ? "#f43f5e" : "#64748b"} />
            {selectedIds.length > 0 && (
              <span className="badge-count-bubble">{selectedIds.length}</span>
            )}
          </div>
          <span>Pilihanku</span>
        </button>
        <button className={activeTab === "hasil" ? "active" : ""} onClick={() => setActiveTab("hasil")}>
          <div className="badge-icon-wrapper">
            <MessageSquare size={16} />
            {hasilRRPendingCount > 0 && (
              <span className="badge-count-bubble">{hasilRRPendingCount}</span>
            )}
          </div>
          <span>Hasil RR</span>
        </button>
        <button className={activeTab === "profile" ? "active" : ""} onClick={() => setActiveTab("profile")}>
          <User size={16} />
          <span>Profil Saya</span>
        </button>
      </div>

      {/* HEADER */}
      <header className="page-header">
        <div className="badge-top">
          <Sparkles size={12} />
          {activeTab === "katalog" && "KATALOG PESERTA"}
          {activeTab === "cart" && "PILIHAN SAYA"}
          {activeTab === "hasil" && "HASIL ROMANTIC ROOM"}
          {activeTab === "saran" && "SARAN & MASUKAN"}
          {activeTab === "profile" && "PROFIL SAYA"}
          {activeTab === "absen" && "ABSENSI SAYA"}
        </div>
        <h1>
          {activeTab === "katalog" && <>DATA <span>PESERTA</span></>}
          {activeTab === "cart" && <>LOVE <span>LETTER</span></>}
          {activeTab === "hasil" && <>HASIL <span>RR</span></>}
          {activeTab === "saran" && <>SARAN <span>MASUKAN</span></>}
          {activeTab === "profile" && <>PROFIL <span>SAYA</span></>}
          {activeTab === "absen" && <>SCAN <span>ABSENSI</span></>}
        </h1>
        <div className="header-actions">
          <p className="welcome-msg">Selamat datang kembali, {currentUser?.nama || "User"}</p>
          <button
            className={`btn-notification ${hasNewComments ? 'has-new' : ''}`}
            onClick={() => {
              setIsCommentsModalOpen(true);
              setHasNewComments(false);
              if (currentUser?.id) fetchUserComments(currentUser.id);
            }}
          >
            <MessageSquare size={20} />
            {hasNewComments && <span className="notification-dot"></span>}
          </button>
        </div>
      </header>

      {(() => {
        if (!currentUser) return null;
        const activeRoomForUser = activeRooms.find((r: any) => 
            String(r.pengirimNo) === String(currentUser.nomorUnik) || 
            String(r.penerimaNo) === String(currentUser.nomorUnik) || 
            r.assignedGuardId === currentUser.id || 
            r.assignedCallerId === currentUser.id || 
            r.assignedCaller2Id === currentUser.id
        );

        if (activeRoomForUser) {
            const isPeserta = (String(activeRoomForUser.pengirimNo) === String(currentUser.nomorUnik) || String(activeRoomForUser.penerimaNo) === String(currentUser.nomorUnik));
            const roleStr = isPeserta ? 'Peserta' : 'Panitia';
            return (
                <div style={{ background: '#fef2f2', border: '1px solid #fecdd3', borderRadius: '12px', padding: '14px 20px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '16px', color: '#9f1239', boxShadow: '0 4px 12px rgba(244, 63, 94, 0.1)' }}>
                    <div style={{ background: '#f43f5e', color: 'white', padding: '10px', borderRadius: '50%', display: 'flex' }}>
                        <Users size={24} />
                    </div>
                    <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 900, fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            Di Dalam Ruangan 
                            <span style={{ fontSize: '10px', background: '#ffe4e6', color: '#be123c', padding: '2px 8px', borderRadius: '12px', fontWeight: 800, textTransform: 'uppercase' }}>
                                {roleStr}
                            </span>
                        </div>
                        <div style={{ fontSize: '13px', marginTop: '4px', opacity: 0.9 }}>
                            Anda saat ini sedang ditugaskan/berada di dalam <strong>{activeRoomForUser.nama || activeRoomForUser.roomNama}</strong>.
                        </div>
                    </div>
                    <button 
                        onClick={() => handleAdminSelesaikanSesi({ roomId: activeRoomForUser.id, ...currentUser })} 
                        style={{ flexShrink: 0, background: '#f43f5e', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '10px', fontWeight: 800, fontSize: '13px', cursor: 'pointer', boxShadow: '0 2px 8px rgba(244, 63, 94, 0.3)', transition: 'transform 0.2s' }}
                        onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                        onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                    >
                        {roleStr === 'Peserta' ? 'Input Hasil RR' : 'Selesaikan Sesi'}
                    </button>
                </div>
            );
        }
        return null;
      })()}

      {/* TAB CONTENT: KATALOG */}
      {activeTab === "katalog" && (
        <>
          <div className="toolbar" style={{ width: '100%', boxSizing: 'border-box', overflow: 'hidden' }}>
            <div className="search-group" style={{ display: 'grid', gridTemplateColumns: '1fr 44px', gap: '8px', width: '100%' }}>
              <div className="search-bar" style={{ minWidth: 0, overflow: 'hidden' }}>
                <Search size={18} className="search-icon" />
                <input
                  type="text"
                  inputMode="search"
                  autoCorrect="off"
                  autoComplete="off"
                  placeholder="Cari nama, no. urut, kota, atau desa..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{ minWidth: 0, width: '100%' }}
                />
                {searchTerm && (
                  <button
                    className="clear-search-btn"
                    onClick={() => setSearchTerm("")}
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
              <button
                className={`btn-filter-toggle ${showFilters ? "active" : ""}`}
                onClick={() => setShowFilters(!showFilters)}
                title="Filter"
                style={{ width: '44px', height: '44px', padding: 0 }}
              >
                <Settings2 size={16} />
              </button>
            </div>

            <div className="toolbar-status-row">
              <div className="status-badge">
                <Users size={14} />
                <span>{total} Peserta</span>
              </div>
            </div>

            {showFilters && (
              <div className="filter-controls">
                <div className="toggle-group">
                  {(["all", "peserta", "panitia"] as const).map(cat => (
                    <button key={cat} className={category === cat ? "active" : ""} onClick={() => { setCategory(cat); setPage(1); }}>
                      {cat === "all" ? "Semua" : cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </button>
                  ))}
                </div>

                <div className="select-container">
                  <select className="select-box" value={pendidikan} onChange={(e) => { setPendidikan(e.target.value); setPage(1); }}>
                    <option value="all">Semua Pendidikan</option>
                    {pendidikanList.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                  <ChevronDown size={14} className="select-arrow" />
                </div>

                <div className="select-container">
                  <select className="select-box" value={selectedKota} onChange={(e) => { setSelectedKota(e.target.value); setDesaFilter("all"); setPage(1); }}>
                    <option value="all">Semua Daerah</option>
                    {kotaList.map(k => <option key={k} value={k}>{k}</option>)}
                  </select>
                  <ChevronDown size={14} className="select-arrow" />
                </div>

                <div className="select-container">
                  <select className="select-box" value={desaFilter} onChange={(e) => { setDesaFilter(e.target.value); setKelompokFilter("all"); setPage(1); }}>
                    <option value="all">Semua Desa</option>
                    {wilayahList.filter(w => selectedKota === "all" || w.kota === selectedKota).map(w => <option key={w.id} value={w.id}>{w.nama}</option>)}
                  </select>
                  <ChevronDown size={14} className="select-arrow" />
                </div>

                <div className="select-container">
                  <select className="select-box" value={kelompokFilter} onChange={(e) => { setKelompokFilter(e.target.value); setPage(1); }}>
                    <option value="all">Semua Kelompok</option>
                    {kelompokList.filter(k => desaFilter === "all" || String(k.desaId || k.mandiriDesaId) === desaFilter).map(k => <option key={k.id} value={k.id}>{k.nama}</option>)}
                  </select>
                  <ChevronDown size={14} className="select-arrow" />
                </div>

                <div className="select-container">
                  <select className="select-box" value={umurFilter} onChange={(e) => { setUmurFilter(e.target.value); setPage(1); }}>
                    <option value="all">Semua Umur</option>
                    {umurList.map(u => <option key={u} value={u}>{u} Tahun</option>)}
                  </select>
                  <ChevronDown size={14} className="select-arrow" />
                </div>

                <div className="select-container">
                  <select className="select-box" value={pekerjaanFilter} onChange={(e) => { setPekerjaanFilter(e.target.value); setPage(1); }}>
                    <option value="all">Semua Pekerjaan</option>
                    {pekerjaanList.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                  <ChevronDown size={14} className="select-arrow" />
                </div>

                <div className="select-container">
                  <select className="select-box" value={hobiFilter} onChange={(e) => { setHobiFilter(e.target.value); setPage(1); }}>
                    <option value="all">Semua Hobi</option>
                    {hobiList.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                  <ChevronDown size={14} className="select-arrow" />
                </div>

                <div className="select-container">
                  <select className="select-box" value={makananFilter} onChange={(e) => { setMakananFilter(e.target.value); setPage(1); }}>
                    <option value="all">Semua Makanan/Minuman</option>
                    {makananList.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                  <ChevronDown size={14} className="select-arrow" />
                </div>

                <div className="select-container">
                  <select className="select-box" value={kriteriaFilter} onChange={(e) => { setKriteriaFilter(e.target.value); setPage(1); }}>
                    <option value="all">Semua Kriteria Pasangan</option>
                    {kriteriaList.map(k => <option key={k} value={k}>{k}</option>)}
                  </select>
                  <ChevronDown size={14} className="select-arrow" />
                </div>

                <button className="btn-reset-filters" onClick={() => {
                  setSearch("");
                  setSearchTerm("");
                  setGender(userGender === "L" ? "P" : (userGender === "P" ? "L" : "all"));
                  setCategory("all");
                  setPendidikan("all");
                  setSelectedKota("all");
                  setDesaFilter("all");
                  setKelompokFilter("all");
                  setPekerjaanFilter("all");
                  setUmurFilter("all");
                  setKriteriaFilter("all");
                  setHobiFilter("all");
                  setMakananFilter("all");
                  setPage(1);
                  setShowFilters(false);
                }}>
                  <X size={14} />
                  <span>Reset</span>
                </button>
              </div>
            )}
          </div>

          <div className="user-title-context">
            {statusQueue && (
              <div className="status-queue-banner">
                <Timer size={14} />
                <span>Sedang dalam antrean admin Romantic Room</span>
              </div>
            )}
          </div>

          <main className="grid-container">
            {loading && data.length === 0 ? (
              [...Array(6)].map((_, i) => <div key={i} className="skeleton-card" />)
            ) : (
              data.filter(item => item.id !== currentUser?.id && item.nomorUrut !== currentUser?.nomorUrut).map((item) => {
                const isPulang = item.keterangan?.toLowerCase() === "pulang";
                const isTidakHadir = item.keterangan?.toLowerCase() === "alpha" || item.keterangan?.toLowerCase() === "izin";
                const isPanitia = Boolean(item.panitiaStatus) || (Boolean(item.role) && item.role !== "generus" && item.role !== "Peserta");
                const isBelumHadir = Number(item.isHadir) === 0;
                const isUnavailable = isPulang || isTidakHadir;
                return (
                  <div key={item.id} className={`participant-card ${isUnavailable ? "is-pulang" : ""}`} style={{ position: "relative", opacity: isUnavailable ? 1 : undefined, filter: isUnavailable ? "none" : undefined }}>
                    <div style={isUnavailable ? { filter: "blur(5px) grayscale(0.6)", opacity: 0.7, pointerEvents: "none", userSelect: "none" } : {}}>
                      <div 
                        className="card-image-wrapper"
                        style={{ cursor: item.foto ? "zoom-in" : "default" }}
                        onClick={(e) => {
                          if (item.foto) {
                            e.stopPropagation();
                            Swal.fire({
                              imageUrl: item.foto,
                              imageAlt: item.nama,
                              showConfirmButton: false,
                              showCloseButton: true,
                              width: "auto",
                              padding: "1rem"
                            });
                          }
                        }}
                      >
                        <img
                          src={item.foto || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.nama)}&background=random`}
                          alt={item.nama}
                          className="card-image"
                          loading="lazy"
                        />
                        <div className="floating-badge id-badge">#{item.nomorUrut || "-"}</div>
                        {item.selectedCount >= 5 && (
                          <div className="floating-badge full-badge" style={isPulang ? { top: '50px' } : undefined}>PENUH (5/5)</div>
                        )}
                        {isPulang && (
                          <div className="floating-badge pulang-badge">PULANG</div>
                        )}
                        <div className={`floating-badge label-badge ${isPanitia ? "status-panitia" : ""}`}>
                          {isPanitia ? "PANITIA" : "PESERTA"}
                        </div>
                      </div>

                      <div className="card-content">
                        <h2 className="card-name">{item.nama}</h2>
                        <div className="card-location">
                          <MapPin size={14} />
                          <span>{item.mandiriDesaKota || "-"} • {item.mandiriDesaNama || item.desaNama || "-"}</span>
                        </div>

                        <div className="card-stats-grid">
                          <div className="stat-pill"><Calendar size={14} /><span>{item.tanggalLahir ? `${new Date().getFullYear() - new Date(item.tanggalLahir).getFullYear()} Tahun` : "-"}</span></div>
                          <div className="stat-pill"><GraduationCap size={14} /><span>{item.pendidikan || "-"}</span></div>
                          <div className="stat-pill"><Briefcase size={14} /><span>{item.pekerjaan || "Swasta"}</span></div>
                          <div className="stat-pill"><Globe size={14} /><span>{item.suku || "-"}</span></div>
                          <div className="stat-pill">
                            <Instagram size={14} />
                            {item.instagram ? (
                              <a href={`https://instagram.com/${item.instagram.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="card-instagram-link">
                                @{item.instagram.replace('@', '')}
                              </a>
                            ) : <span>-</span>}
                          </div>
                          <div className="stat-pill selection-count"><UserCheck size={14} /><span>Dipilih: {item.selectedCount || 0}/5</span></div>
                        </div>

                        <div className="card-passions-mini">
                          <div className="pass-pill"><Music size={12} /><span>Hobi: {item.hobi || "-"}</span></div>
                          <div className="pass-pill"><Utensils size={12} /><span>Makan/Minuman: {item.makananMinumanFavorit || "-"}</span></div>
                        </div>

                        <div className="card-actions">
                          <button className="btn-secondary" onClick={() => openDetail(item)}>Detail Profil</button>
                          {item.nomorUrut !== currentUser?.nomorUrut && (() => {
                            if (isUnavailable) return null;
                            const isSelected = selectedIds.includes(String(item.id));
                            const sel = selections.find((s: any) => String(s.penerimaId) === String(item.id));
                            const isWaiting = sel && sel.status === "Menunggu";

                            if (item.handshakeStatus) {
                              if (item.handshakeStatus === "Selesai") {
                                return (
                                  <>
                                    <button className="btn-secondary disabled" disabled style={{ background: "#f1f5f9", color: "#64748b", border: "1px solid #e2e8f0" }}>
                                      <Users size={16} />
                                      <span>Sudah Bertemu</span>
                                    </button>
                                    <button className="btn-primary" style={{ background: '#10b981', borderColor: '#10b981', marginTop: '8px' }} onClick={() => { setIsModalOpen(false); setActiveTab('hasil'); }}>
                                      <Heart size={16} />
                                      <span>Input Hasil RR</span>
                                    </button>
                                  </>
                                );
                              }
                              if (item.handshakeStatus === "Diterima") {
                                return (
                                  <>
                                    <button className="btn-secondary disabled" disabled style={{ background: "#f1f5f9", color: "#64748b", border: "1px solid #e2e8f0" }}>
                                      <Users size={16} />
                                      <span>Dalam Ruangan</span>
                                    </button>
                                    {(() => {
                                      const room = activeRooms.find((r: any) => String(r.pengirimNo) === String(item.nomorUnik) || String(r.penerimaNo) === String(item.nomorUnik));
                                      const isPart = room && currentUser && (String(currentUser.nomorUnik) === String(room.pengirimNo) || String(currentUser.nomorUnik) === String(room.penerimaNo) || room.assignedGuardId === currentUser.id || room.assignedCallerId === currentUser.id || room.assignedCaller2Id === currentUser.id);
                                      return (isAdmin || isPart) && (
                                        <button className="btn-primary" style={{ background: '#10b981', borderColor: '#10b981', marginTop: '8px' }} onClick={() => handleAdminSelesaikanSesi(item)}>
                                          {isAdmin ? <CheckCircle2 size={16} /> : <Heart size={16} />}
                                          <span>{isAdmin ? 'Selesaikan Sesi' : 'Input Hasil RR'}</span>
                                        </button>
                                      );
                                    })()}
                                  </>
                                );
                              }
                              if (item.handshakeStatus === "Menunggu") {
                                if (!isSelected) {
                                  return (
                                    <button className="btn-secondary disabled" disabled style={{ background: "#f1f5f9", color: "#64748b", border: "1px solid #e2e8f0" }}>
                                      <Clock size={16} />
                                      <span>Dalam Antrean</span>
                                    </button>
                                  );
                                }
                              }
                            }

                            if (isSelected) {
                              if (isWaiting) {
                                return (
                                  <button
                                    className="btn-danger"
                                    onClick={() => handleCancelSelection(String(item.id), item.nama)}
                                  >
                                    <X size={16} />
                                    <span>Batalkan Pilihan</span>
                                  </button>
                                );
                              } else {
                                return (
                                  <button
                                    className="btn-primary selected disabled"
                                    disabled
                                  >
                                    <CheckCircle2 size={16} />
                                    <span>Terpilih</span>
                                  </button>
                                );
                              }
                            }

                            const isFull = (item.selectedCount || 0) >= 5;
                            const isMaxed = selectedIds.length >= 3;
                            const isDisabled = isFull || isMaxed;

                            // Ensure button is visible for BOTH peserta and panitia AS LONG AS they are not waiting.
                            // isBelumHadir already checks for Panitia attendance, and currentUser.status checks for the logged in user.
                            if (currentUser?.status === "waiting" || isBelumHadir || (!hasAttended && isAdmin)) {
                              return null;
                            }

                            return (
                              <button
                                className={`btn-primary ${isDisabled ? "disabled" : ""}`}
                                onClick={() => handleConfirmSelection(String(item.id), item.nama)}
                                disabled={isDisabled}
                              >
                                <Heart size={16} />
                                <span>{isFull ? "Penuh" : (isMaxed ? "Batas Tercapai" : "Pilih")}</span>
                              </button>
                            );
                          })()}
                        </div>

                        {item.id !== currentUser?.id && (
                          <div className="commentary-box">
                            {sentComments.some(sc => sc.penerimaId === item.id) ? (
                              <div className="comment-sent-indicator">
                                <MessageSquare size={14} />
                                <span>Komentar Anda: {sentComments.find(sc => sc.penerimaId === item.id)?.komentar}</span>
                              </div>
                            ) : (
                              <>
                                <div className="commentary-header">
                                  <div className="anon-toggle">
                                    <input type="checkbox" id={`anon-${item.id}`} checked={komentarAnon} onChange={(e) => setKomentarAnon(e.target.checked)} />
                                    <label htmlFor={`anon-${item.id}`}>Anonim</label>
                                  </div>
                                  {!komentarAnon && (
                                    <input
                                      type="text"
                                      className="comment-name-input"
                                      placeholder="Nama Anda..."
                                      value={komentarNama}
                                      onChange={(e) => setKomentarNama(e.target.value)}
                                      disabled={!!currentUser}
                                      autoComplete="off"
                                    />
                                  )}
                                </div>
                                <div className="comment-tags-label">Berikan Komentar Singkat:</div>
                                <div className="comment-buttons">
                                  {["Humble", "Baik", "Pendiam", "Penyabar", "Friendly"].map(tag => (
                                    <button
                                      key={tag}
                                      className={`btn-tag ${submittingKomentar === item.id ? "loading" : ""}`}
                                      onClick={() => handleSendKomentar(item.id, item.nama, tag)}
                                      disabled={!!submittingKomentar}
                                    >
                                      {tag}
                                    </button>
                                  ))}
                                </div>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    {isUnavailable && (
                      <div style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        zIndex: 10,
                        padding: "24px"
                      }}>
                        <div style={{
                          background: "rgba(255, 255, 255, 0.95)",
                          padding: "20px",
                          borderRadius: "20px",
                          textAlign: "center",
                          color: "#ef4444",
                          fontWeight: 700,
                          fontSize: "14px",
                          boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
                          border: "2px solid #fee2e2",
                          lineHeight: 1.5,
                          backdropFilter: "blur(4px)"
                        }}>
                          Mohon maaf peserta {item.nama} {isPulang ? "pulang lebih awal" : (isBelumHadir ? "belum melakukan absensi kehadiran" : "tidak hadir")}, Anda tidak bisa memilih peserta tersebut.
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </main>

          {totalPages > 1 && (
            <div className="pagination">
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)}>Sebelumnya</button>
              <div className="page-numbers">
                {[...Array(Math.min(5, totalPages))].map((_, i) => (
                  <button key={i} className={page === i + 1 ? "active" : ""} onClick={() => setPage(i + 1)}>{i + 1}</button>
                ))}
              </div>
              <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>Berikutnya</button>
            </div>
          )}
        </>
      )}

      {/* TAB CONTENT: CART / LOVE LETTER */}
      {activeTab === "cart" && (
        <div className="cart-container">
          <div className="selection-info-card">
            <Heart size={20} fill="#f43f5e" color="#f43f5e" />
            <span>Pilihan Anda ({selectedIds.length}/3)</span>
          </div>

          {statusQueue && (
            <div className="status-queue-banner block mb-6">
              <Timer size={14} />
              <span>Sedang dalam antrean admin Romantic Room</span>
            </div>
          )}

          {selections.length === 0 ? (
            <div className="empty-cart-state">
              <div className="empty-cart-icon">💌</div>
              <h3>Belum Ada Pilihan</h3>
              <p>Cari peserta yang cocok di tab Katalog, lalu pilih untuk dikirim ke daftar antrean Romantic Room.</p>
              <button className="goto-catalog-btn" onClick={() => setActiveTab("katalog")}>Cari Peserta</button>
            </div>
          ) : (
            <div className="cart-list">
              {selections.map((sel: any) => {
                const isWaiting = sel.status === "Menunggu";
                return (
                  <div key={sel.id} className="cart-item-card">
                    <div className="cart-item-info">
                      <div className="cart-item-avatar">
                        <Heart size={20} fill="#f43f5e" color="#f43f5e" />
                      </div>
                      <div>
                        <div className="cart-item-name">#{sel.penerimaNoUrut || sel.penerimaNo} {sel.penerimaNama}</div>
                        <div className="cart-item-status">
                          <span className={`status-badge-pill ${sel.status.toLowerCase()}`}>
                            {sel.status === "Menunggu" ? "⏳ Menunggu Admin" : `💖 ${sel.status}`}
                          </span>
                        </div>
                      </div>
                    </div>
                    {isWaiting ? (
                      <button
                        className="cart-btn-danger"
                        onClick={() => handleCancelSelection(String(sel.penerimaId), sel.penerimaNama)}
                      >
                        <X size={16} />
                        <span>Batalkan</span>
                      </button>
                    ) : (
                      <button className="cart-btn-disabled" disabled>
                        <CheckCircle2 size={16} />
                        <span>Terpilih</span>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}


        </div>
      )}

      {/* TAB CONTENT: ABSEN */}
      {activeTab === "absen" && (() => {
        const uniqueNo = currentUser?.nomorUnik ||
          myFullProfile?.nomorUnik ||
          (typeof window !== "undefined" && localStorage.getItem("attended_nomor_unik")) ||
          "";
        const attendanceRoleLabel = (() => {
          const role = String(currentUser?.role || "").toLowerCase();
          const nomorUnik = String(currentUser?.nomorUnik || myFullProfile?.nomorUnik || uniqueNo || "").toUpperCase();
          return (role && !["peserta", "generus"].includes(role)) || nomorUnik.startsWith("PNB")
            ? "Panitia"
            : "Peserta";
        })();
        return (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "16px", padding: "24px 16px", minHeight: "60vh", justifyContent: "center" }}>

            {/* Mode Toggle Switch */}
            <div style={{ display: "flex", gap: "6px", background: "#f1f5f9", padding: "4px", borderRadius: "10px", width: "100%", maxWidth: "340px", marginBottom: "4px" }}>
              <button
                type="button"
                onClick={() => setAbsenTabMode("show_barcode")}
                style={{
                  flex: 1,
                  padding: "8px 12px",
                  borderRadius: "8px",
                  border: "none",
                  background: absenTabMode === "show_barcode" ? "white" : "transparent",
                  color: absenTabMode === "show_barcode" ? "#6366f1" : "#64748b",
                  fontWeight: 700,
                  fontSize: "13px",
                  cursor: "pointer",
                  boxShadow: absenTabMode === "show_barcode" ? "0 2px 4px rgba(0,0,0,0.05)" : "none",
                  transition: "all 0.2s"
                }}
              >
                QR Code Saya
              </button>
              <button
                type="button"
                onClick={() => {
                  setAbsenTabMode("scan_camera");
                  setTimeout(() => startSelfAbsenScan(), 100);
                }}
                style={{
                  flex: 1,
                  padding: "8px 12px",
                  borderRadius: "8px",
                  border: "none",
                  background: absenTabMode === "scan_camera" ? "white" : "transparent",
                  color: absenTabMode === "scan_camera" ? "#6366f1" : "#64748b",
                  fontWeight: 700,
                  fontSize: "13px",
                  cursor: "pointer",
                  boxShadow: absenTabMode === "scan_camera" ? "0 2px 4px rgba(0,0,0,0.05)" : "none",
                  transition: "all 0.2s"
                }}
              >
                Scan QR Kegiatan
              </button>
            </div>

            <div style={{ background: "white", borderRadius: "20px", padding: "28px", boxShadow: "0 8px 32px rgba(0,0,0,0.10)", border: "1px solid #f1f5f9", textAlign: "center", width: "100%", maxWidth: "340px" }}>

              {absenTabMode === "show_barcode" ? (
                <>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", marginBottom: "6px" }}>
                    <QrCode size={20} color="#6366f1" />
                    <span style={{ fontWeight: 800, fontSize: "15px", color: "#0f172a" }}>QR Code Absensi</span>
                  </div>
                  <p style={{ fontSize: "12px", color: "#94a3b8", marginBottom: "20px" }}>Tunjukkan QR Code ini ke panitia untuk absensi</p>

                  {uniqueNo ? (
                    <>
                      <div style={{ background: "white", borderRadius: "16px", padding: "16px", display: "inline-block", border: "2px solid #e2e8f0", marginBottom: "16px", boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }}>
                        <img
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${uniqueNo}&margin=10`}
                          alt="QR Code Peserta"
                          style={{ width: "160px", height: "160px", display: "block" }}
                        />
                      </div>
                      <div style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "white", borderRadius: "8px", padding: "8px 18px", fontSize: "18px", fontWeight: 900, letterSpacing: "3px", marginBottom: "8px", display: "inline-block" }}>
                        {uniqueNo}
                      </div>
                      <p style={{ fontSize: "11px", color: "#94a3b8", margin: "8px 0 0" }}>Nomor Unik Peserta</p>
                    </>
                  ) : (
                    <div style={{ padding: "30px", color: "#94a3b8", fontSize: "13px" }}>
                      <QrCode size={40} color="#e2e8f0" style={{ margin: "0 auto 12px" }} />
                      <p>Data QR Code tidak tersedia</p>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", marginBottom: "6px" }}>
                    <QrCode size={20} color="#6366f1" />
                    <span style={{ fontWeight: 800, fontSize: "15px", color: "#0f172a" }}>Scan QR Kegiatan</span>
                  </div>
                  <p style={{ fontSize: "12px", color: "#94a3b8", marginBottom: "20px" }}>Pindai QR Code kegiatan yang ditampilkan panitia</p>

                  <div style={{ position: "relative", width: "100%", height: "240px", borderRadius: "12px", overflow: "hidden", border: "2px dashed #cbd5e1", background: "#f8fafc", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                    <div id="katalog-qr-reader" style={{ width: "100%", height: "100%" }} />
                    <style dangerouslySetInnerHTML={{
                      __html: `
                      #katalog-qr-reader video {
                        width: 100% !important;
                        height: 100% !important;
                        object-fit: cover !important;
                      }
                    `}} />
                    {!scanningAbsen && (
                      <div style={{ position: "absolute", zIndex: 2, padding: "20px", color: "#94a3b8" }}>
                        <button
                          type="button"
                          onClick={startSelfAbsenScan}
                          style={{
                            background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
                            color: "white",
                            border: "none",
                            padding: "10px 20px",
                            borderRadius: "10px",
                            fontWeight: 800,
                            cursor: "pointer",
                            fontSize: "14px",
                            boxShadow: "0 4px 12px rgba(99,102,241,0.3)"
                          }}
                        >
                          Mulai Pindai Kamera
                        </button>
                      </div>
                    )}
                  </div>
                  {scanningAbsen && (
                    <button
                      type="button"
                      onClick={stopSelfAbsenScan}
                      style={{
                        marginTop: "16px",
                        background: "#ef4444",
                        color: "white",
                        border: "none",
                        padding: "8px 16px",
                        borderRadius: "8px",
                        fontWeight: 700,
                        cursor: "pointer",
                        fontSize: "12px"
                      }}
                    >
                      Batal / Matikan Kamera
                    </button>
                  )}
                </>
              )}
            </div>

            {attendanceValidation && (
              <div style={{ background: "linear-gradient(135deg,#f0fdf4,#ffffff)", borderRadius: "16px", padding: "16px", border: "1px solid #bbf7d0", width: "100%", maxWidth: "340px", boxShadow: "0 8px 24px rgba(34,197,94,0.12)" }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
                  <div style={{ width: "42px", height: "42px", borderRadius: "50%", background: "#22c55e", display: "flex", alignItems: "center", justifyContent: "center", color: "white", flexShrink: 0 }}>
                    <ShieldCheck size={22} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#166534", fontSize: "13px", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.3px", marginBottom: "2px" }}>
                      <CheckCircle2 size={15} />
                      <span>Kehadiran Tervalidasi</span>
                    </div>
                    <div style={{ color: "#0f172a", fontSize: "14px", fontWeight: 800, lineHeight: 1.35 }}>
                      {attendanceRoleLabel} sudah hadir.
                    </div>
                    <div style={{ marginTop: "10px", display: "flex", flexDirection: "column", gap: "6px", color: "#475569", fontSize: "12px", fontWeight: 600 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
                        <Calendar size={14} color="#16a34a" />
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{attendanceValidation.kegiatanJudul || "Kegiatan Mandiri"}</span>
                      </div>
                      {attendanceValidation.timestamp && (
                        <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
                          <Clock size={14} color="#16a34a" />
                          <span>{formatAttendanceDate(attendanceValidation.timestamp)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {currentUser && (
              <div style={{ background: "white", borderRadius: "14px", padding: "16px 20px", border: "1px solid #e2e8f0", width: "100%", maxWidth: "340px", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <div style={{ width: "44px", height: "44px", borderRadius: "50%", background: "linear-gradient(135deg,#6366f1,#8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 800, fontSize: "18px", flexShrink: 0 }}>
                    {currentUser.nama?.charAt(0) || "?"}
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: "14px", color: "#0f172a" }}>{currentUser.nama}</div>
                    <div style={{ fontSize: "12px", color: "#64748b" }}>No. Urut #{currentUser.nomorUrut || "-"}</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* TAB CONTENT: HASIL RR */}
      {activeTab === "hasil" && (
        <div className="cart-container" style={{ padding: '0 16px', maxWidth: '600px', margin: '0 auto', animation: 'slideUp 0.3s ease-out' }}>
          {loadingHasil ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>Memuat Hasil...</div>
          ) : hasilRRList.length === 0 ? (
            <div className="empty-cart" style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
              <MessageSquare size={48} style={{ margin: '0 auto 16px', opacity: 0.5 }} />
              <h3>Belum Ada Hasil</h3>
              <p>Anda belum memiliki sesi Romantic Room yang sedang berjalan atau selesai.</p>
            </div>
          ) : (() => {
            const matchList = hasilRRList.filter(h => h.hasilPengirim === "Lanjut" && h.hasilPenerima === "Lanjut");
            return (
            <div className="cart-list" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

              {/* === MATCH SECTION: Both chose Lanjut === */}
              {matchList.length > 0 && (
                <div style={{ marginBottom: '8px' }}>
                  <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                    <span style={{ fontSize: '28px' }}>💕</span>
                    <h3 style={{ margin: '4px 0 2px', fontSize: '17px', fontWeight: 800, color: '#be185d' }}>Pasangan Lanjut</h3>
                    <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>Kedua peserta memilih <b>Lanjut</b></p>
                  </div>
                  {matchList.map(h => {
                    const isPengirim = h.pengirimId === currentUser?.id;
                    const isPenerima = h.penerimaId === currentUser?.id;
                    const isPanitia = !isPengirim && !isPenerima;
                    const partnerName = isPengirim ? h.penerimaNama : h.pengirimNama;
                    const partnerNoUrut = isPengirim ? h.penerimaNoUrut : h.pengirimNoUrut;
                    const myName = isPengirim ? h.pengirimNama : h.penerimaNama;
                    const myNoUrut = isPengirim ? h.pengirimNoUrut : h.penerimaNoUrut;
                    const isDalamRuangan = h.status === "Diterima";

                    if (isPanitia) {
                      return (
                        <div key={`match-${h.id}`} style={{ background: 'white', borderRadius: '16px', padding: '20px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', border: '2px solid #fbcfe8', marginBottom: '4px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <div style={{ fontWeight: 800, fontSize: '16px', color: '#1e293b' }}>
                              Ruangan: {h.roomNama || "Romantic Room"}
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
                              <span style={{ fontSize: '11px', fontWeight: 800, color: isDalamRuangan ? '#1d4ed8' : '#166534', background: isDalamRuangan ? '#eff6ff' : '#f0fdf4', border: `1px solid ${isDalamRuangan ? '#bfdbfe' : '#bbf7d0'}`, borderRadius: '999px', padding: '4px 8px' }}>
                                {isDalamRuangan ? "Dalam Ruangan" : "Selesai"}
                              </span>
                            </div>
                          </div>
                          <div style={{ marginBottom: '16px', fontSize: '13px', color: '#475569' }}>
                            Peserta: <strong>{h.pengirimNama}</strong> & <strong>{h.penerimaNama}</strong>
                          </div>
                          {isDalamRuangan ? (
                            <button
                              onClick={() => handleAdminSelesaikanSesi({ roomId: h.roomId, ...currentUser })}
                              style={{
                                width: '100%',
                                padding: '11px',
                                borderRadius: '10px',
                                border: 'none',
                                background: '#f43f5e',
                                color: 'white',
                                fontSize: '13px',
                                fontWeight: 800,
                                cursor: 'pointer',
                                transition: '0.2s',
                              }}
                            >
                              Selesaikan Sesi
                            </button>
                          ) : (
                            <div style={{ display: 'flex', gap: '12px' }}>
                              <div style={{ flex: 1, padding: '12px', borderRadius: '12px', background: '#dcfce7', border: '1px solid #bbf7d0', textAlign: 'center' }}>
                                <div style={{ fontSize: '12px', fontWeight: 700, color: '#166534', marginBottom: '8px' }}>{h.pengirimNama}:</div>
                                <span style={{ display: 'inline-block', padding: '4px 12px', borderRadius: '999px', fontSize: '12px', fontWeight: 800, background: '#dcfce7', color: '#166534', border: `1px solid #bbf7d0` }}>
                                  ✓ Lanjut
                                </span>
                              </div>
                              <div style={{ flex: 1, padding: '12px', borderRadius: '12px', background: '#dcfce7', border: '1px solid #bbf7d0', textAlign: 'center' }}>
                                <div style={{ fontSize: '12px', fontWeight: 700, color: '#166534', marginBottom: '8px' }}>{h.penerimaNama}:</div>
                                <span style={{ display: 'inline-block', padding: '4px 12px', borderRadius: '999px', fontSize: '12px', fontWeight: 800, background: '#dcfce7', color: '#166534', border: `1px solid #bbf7d0` }}>
                                  ✓ Lanjut
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    }

                    return (
                      <div key={`match-${h.id}`} style={{
                        background: 'linear-gradient(135deg, #fdf2f8 0%, #fff1f2 50%, #fef2f2 100%)',
                        borderRadius: '16px',
                        padding: '20px',
                        border: '2px solid #fbcfe8',
                        boxShadow: '0 4px 15px rgba(190,24,93,0.08)',
                        marginBottom: '4px',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', flexWrap: 'wrap' }}>
                          {/* My side */}
                          <div style={{ textAlign: 'center', flex: 1, minWidth: '100px' }}>
                            <div style={{ fontSize: '14px', fontWeight: 800, color: '#1e293b' }}>{myName}</div>
                            <div style={{ fontSize: '11px', color: '#64748b' }}>#{myNoUrut}</div>
                            <div style={{
                              marginTop: '6px',
                              display: 'inline-block',
                              padding: '3px 10px',
                              borderRadius: '999px',
                              fontSize: '11px',
                              fontWeight: 800,
                              background: '#dcfce7',
                              color: '#166534',
                              border: '1px solid #bbf7d0',
                            }}>✓ Lanjut</div>
                          </div>

                          {/* Heart icon */}
                          <div style={{ fontSize: '28px', lineHeight: 1 }}>❤️</div>

                          {/* Partner side */}
                          <div style={{ textAlign: 'center', flex: 1, minWidth: '100px' }}>
                            <div style={{ fontSize: '14px', fontWeight: 800, color: '#1e293b' }}>{partnerName}</div>
                            <div style={{ fontSize: '11px', color: '#64748b' }}>#{partnerNoUrut}</div>
                            <div style={{
                              marginTop: '6px',
                              display: 'inline-block',
                              padding: '3px 10px',
                              borderRadius: '999px',
                              fontSize: '11px',
                              fontWeight: 800,
                              background: '#dcfce7',
                              color: '#166534',
                              border: '1px solid #bbf7d0',
                            }}>✓ Lanjut</div>
                          </div>
                        </div>
                        <div style={{ textAlign: 'center', marginTop: '12px', fontSize: '12px', color: '#94a3b8' }}>
                          {new Date(h.createdAt).toLocaleDateString('id-ID')}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* === ALL SESSIONS (excluding matches shown above) === */}
              {hasilRRList.filter(h => !(h.hasilPengirim === "Lanjut" && h.hasilPenerima === "Lanjut")).length > 0 && (
                <>
                  {matchList.length > 0 && (
                    <div style={{ textAlign: 'center', margin: '4px 0 8px' }}>
                      <h4 style={{ fontSize: '14px', fontWeight: 700, color: '#475569', margin: 0 }}>Sesi Lainnya</h4>
                    </div>
                  )}
                  {hasilRRList.filter(h => !(h.hasilPengirim === "Lanjut" && h.hasilPenerima === "Lanjut")).map(h => {
                const isPengirim = h.pengirimId === currentUser?.id;
                const partnerName = isPengirim ? h.penerimaNama : h.pengirimNama;
                const partnerNoUrut = isPengirim ? h.penerimaNoUrut : h.pengirimNoUrut;
                const myHasil = isPengirim ? h.hasilPengirim : h.hasilPenerima;
                const partnerHasil = isPengirim ? h.hasilPenerima : h.hasilPengirim;
                const selectedHasil = myHasil || hasilRRDrafts[h.id] || "";
                const isSubmittingThis = submittingHasilId === h.id;
                const isDalamRuangan = h.status === "Diterima";

                const isPanitia = !isPengirim && !isPenerima;
                
                const isRagu = (val: string) => val === "Ragu-Ragu" || val === "Ragu-ragu";

                const bothAnswered = !!myHasil && !!partnerHasil;

                const getResultBadge = (val: string) => {
                  if (val === "Lanjut") return { bg: '#dcfce7', color: '#166534', border: '#bbf7d0', label: '✓ Lanjut' };
                  if (isRagu(val)) return { bg: '#fef9c3', color: '#854d0e', border: '#fde68a', label: '~ Ragu-Ragu' };
                  return { bg: '#fee2e2', color: '#991b1b', border: '#fecaca', label: '✗ Tidak Lanjut' };
                };

                if (isPanitia) {
                  return (
                    <div key={h.id} style={{ background: 'white', borderRadius: '16px', padding: '20px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', border: '1px solid #f1f5f9' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <div style={{ fontWeight: 800, fontSize: '16px', color: '#1e293b' }}>
                          Ruangan: {h.roomNama || "Romantic Room"}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
                          <span style={{ fontSize: '11px', fontWeight: 800, color: isDalamRuangan ? '#1d4ed8' : '#166534', background: isDalamRuangan ? '#eff6ff' : '#f0fdf4', border: `1px solid ${isDalamRuangan ? '#bfdbfe' : '#bbf7d0'}`, borderRadius: '999px', padding: '4px 8px' }}>
                            {isDalamRuangan ? "Dalam Ruangan" : "Selesai"}
                          </span>
                        </div>
                      </div>
                      <div style={{ marginBottom: '16px', fontSize: '13px', color: '#475569' }}>
                        Peserta: <strong>{h.pengirimNama}</strong> & <strong>{h.penerimaNama}</strong>
                      </div>
                      {isDalamRuangan ? (
                        <button
                          onClick={() => handleAdminSelesaikanSesi({ roomId: h.roomId, ...currentUser })}
                          style={{
                            width: '100%',
                            padding: '11px',
                            borderRadius: '10px',
                            border: 'none',
                            background: '#f43f5e',
                            color: 'white',
                            fontSize: '13px',
                            fontWeight: 800,
                            cursor: 'pointer',
                            transition: '0.2s',
                          }}
                        >
                          Selesaikan Sesi
                        </button>
                      ) : (
                        <div style={{ display: 'flex', gap: '12px' }}>
                          <div style={{ flex: 1, padding: '12px', borderRadius: '12px', background: '#f8fafc', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                            <div style={{ fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '8px' }}>{h.pengirimNama}:</div>
                            {h.hasilPengirim ? (
                              <span style={{ display: 'inline-block', padding: '4px 12px', borderRadius: '999px', fontSize: '12px', fontWeight: 800, background: getResultBadge(h.hasilPengirim).bg, color: getResultBadge(h.hasilPengirim).color, border: `1px solid ${getResultBadge(h.hasilPengirim).border}` }}>
                                {getResultBadge(h.hasilPengirim).label}
                              </span>
                            ) : "-"}
                          </div>
                          <div style={{ flex: 1, padding: '12px', borderRadius: '12px', background: '#f8fafc', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                            <div style={{ fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '8px' }}>{h.penerimaNama}:</div>
                            {h.hasilPenerima ? (
                              <span style={{ display: 'inline-block', padding: '4px 12px', borderRadius: '999px', fontSize: '12px', fontWeight: 800, background: getResultBadge(h.hasilPenerima).bg, color: getResultBadge(h.hasilPenerima).color, border: `1px solid ${getResultBadge(h.hasilPenerima).border}` }}>
                                {getResultBadge(h.hasilPenerima).label}
                              </span>
                            ) : "-"}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                }

                return (
                  <div key={h.id} style={{ background: 'white', borderRadius: '16px', padding: '20px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', border: '1px solid #f1f5f9' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                      <div style={{ fontWeight: 800, fontSize: '16px', color: '#1e293b' }}>
                        {partnerName} <span style={{ color: '#64748b', fontSize: '12px' }}>#{partnerNoUrut}</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
                        <span style={{ fontSize: '11px', fontWeight: 800, color: isDalamRuangan ? '#1d4ed8' : '#166534', background: isDalamRuangan ? '#eff6ff' : '#f0fdf4', border: `1px solid ${isDalamRuangan ? '#bfdbfe' : '#bbf7d0'}`, borderRadius: '999px', padding: '4px 8px' }}>
                          {isDalamRuangan ? "Dalam Ruangan" : "Selesai"}
                        </span>
                        <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                          {new Date(h.createdAt).toLocaleDateString('id-ID')}
                        </span>
                      </div>
                    </div>
                    
                    <div style={{ marginBottom: '10px', fontSize: '13px', color: '#475569', fontWeight: 600 }}>Jawaban Anda:</div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button 
                        disabled={!!myHasil}
                        onClick={() => setHasilRRDrafts(prev => ({ ...prev, [h.id]: "Lanjut" }))}
                        style={{ 
                          flex: 1, 
                          padding: '10px', 
                          borderRadius: '10px', 
                          fontSize: '13px', 
                          fontWeight: 700, 
                          border: selectedHasil === "Lanjut" ? '2px solid #22c55e' : '1px solid #e2e8f0',
                          background: selectedHasil === "Lanjut" ? '#f0fdf4' : (!!myHasil ? '#f8fafc' : 'white'),
                          color: selectedHasil === "Lanjut" ? '#166534' : (!!myHasil ? '#94a3b8' : '#64748b'),
                          cursor: !!myHasil ? 'not-allowed' : 'pointer', 
                          transition: '0.2s',
                          opacity: !!myHasil && selectedHasil !== "Lanjut" ? 0.6 : 1
                        }}
                      >Lanjut</button>
                      <button 
                        disabled={!!myHasil}
                        onClick={() => setHasilRRDrafts(prev => ({ ...prev, [h.id]: "Ragu-Ragu" }))}
                        style={{ 
                          flex: 1, 
                          padding: '10px', 
                          borderRadius: '10px', 
                          fontSize: '13px', 
                          fontWeight: 700, 
                          border: isRagu(selectedHasil) ? '2px solid #eab308' : '1px solid #e2e8f0',
                          background: isRagu(selectedHasil) ? '#fefce8' : (!!myHasil ? '#f8fafc' : 'white'),
                          color: isRagu(selectedHasil) ? '#854d0e' : (!!myHasil ? '#94a3b8' : '#64748b'),
                          cursor: !!myHasil ? 'not-allowed' : 'pointer', 
                          transition: '0.2s',
                          opacity: !!myHasil && !isRagu(selectedHasil) ? 0.6 : 1
                        }}
                      >Ragu-Ragu</button>
                      <button 
                        disabled={!!myHasil}
                        onClick={() => setHasilRRDrafts(prev => ({ ...prev, [h.id]: "Tidak Lanjut" }))}
                        style={{ 
                          flex: 1, 
                          padding: '10px', 
                          borderRadius: '10px', 
                          fontSize: '13px', 
                          fontWeight: 700, 
                          border: selectedHasil === "Tidak Lanjut" ? '2px solid #ef4444' : '1px solid #e2e8f0',
                          background: selectedHasil === "Tidak Lanjut" ? '#fef2f2' : (!!myHasil ? '#f8fafc' : 'white'),
                          color: selectedHasil === "Tidak Lanjut" ? '#991b1b' : (!!myHasil ? '#94a3b8' : '#64748b'),
                          cursor: !!myHasil ? 'not-allowed' : 'pointer', 
                          transition: '0.2s',
                          opacity: !!myHasil && selectedHasil !== "Tidak Lanjut" ? 0.6 : 1
                        }}
                      >Tidak Lanjut</button>
                    </div>
                    {!myHasil && (
                      <button
                        disabled={!hasilRRDrafts[h.id] || isSubmittingThis}
                        onClick={() => handleSubmitHasilRR(h.id, partnerName)}
                        style={{
                          width: '100%',
                          marginTop: '14px',
                          padding: '11px',
                          borderRadius: '10px',
                          border: 'none',
                          background: hasilRRDrafts[h.id] ? '#10b981' : '#e2e8f0',
                          color: hasilRRDrafts[h.id] ? 'white' : '#94a3b8',
                          fontSize: '13px',
                          fontWeight: 800,
                          cursor: hasilRRDrafts[h.id] && !isSubmittingThis ? 'pointer' : 'not-allowed',
                          transition: '0.2s',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px'
                        }}
                      >
                        <CheckCircle2 size={16} />
                        {isSubmittingThis ? "Menyimpan..." : "Submit"}
                      </button>
                    )}

                    {/* Show partner's result once both have answered */}
                    {bothAnswered && (
                      <div style={{ marginTop: '14px', padding: '12px', borderRadius: '12px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                        <div style={{ fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '8px' }}>Jawaban {partnerName}:</div>
                        {(() => {
                          const badge = getResultBadge(partnerHasil);
                          return (
                            <span style={{
                              display: 'inline-block',
                              padding: '4px 12px',
                              borderRadius: '999px',
                              fontSize: '12px',
                              fontWeight: 800,
                              background: badge.bg,
                              color: badge.color,
                              border: `1px solid ${badge.border}`,
                            }}>{badge.label}</span>
                          );
                        })()}
                      </div>
                    )}
                    {myHasil && !partnerHasil && (
                      <div style={{ marginTop: '14px', padding: '10px', borderRadius: '12px', background: '#fffbeb', border: '1px solid #fde68a', fontSize: '12px', color: '#92400e', textAlign: 'center' }}>
                        <Timer size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />
                        Menunggu jawaban dari {partnerName}...
                      </div>
                    )}
                  </div>
                )
              })}
                </>
              )}
            </div>
            );
          })()}
        </div>
      )}

      {/* TAB CONTENT: SARAN */}
      {activeTab === "saran" && (
        <div className="cart-container" style={{ padding: '0 16px', maxWidth: '600px', margin: '0 auto', animation: 'slideUp 0.3s ease-out' }}>
          <div style={{ background: 'white', borderRadius: '24px', padding: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', border: '1px solid #f1f5f9' }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: 800, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <MessageSquare size={20} color="#3b82f6" />
              Saran & Masukan
            </h3>
            <p style={{ margin: '0 0 20px 0', fontSize: '13px', color: '#64748b', lineHeight: 1.5 }}>
              Berikan saran, kritik, atau masukan Anda terkait pelaksanaan Romantic Room untuk membantu kami menjadi lebih baik.
            </p>
            
            {mySaranList.length > 0 && !showSaranForm && !editingSaranId ? (
                <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
                            Riwayat saran dan masukan yang pernah Anda kirimkan.
                        </p>
                        <button onClick={() => setShowSaranForm(true)} style={{ background: '#3b82f6', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '12px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                            Tambah
                        </button>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {mySaranList.map((s, idx) => (
                            <div key={idx} style={{ padding: '16px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div style={{ flex: 1, marginRight: '16px' }}>
                                    <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>
                                        {new Date(s.createdAt.replace(' ', 'T') + (!s.createdAt.endsWith('Z') ? 'Z' : '')).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' })} WIB
                                        {s.isAnonim ? ' • Anonim' : ''}
                                        {s.kepada ? ` • Kepada: ${s.kepada}` : ''}
                                    </div>
                                    <div style={{ fontSize: '14px', color: '#334155', whiteSpace: 'pre-wrap' }}>{s.saran}</div>
                                </div>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button onClick={() => handleEditSaran(s)} style={{ background: 'white', border: '1px solid #cbd5e1', color: '#3b82f6', padding: '6px', borderRadius: '6px', cursor: 'pointer' }}>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                                    </button>
                                    <button onClick={() => handleDeleteSaran(s.id)} style={{ background: 'white', border: '1px solid #cbd5e1', color: '#ef4444', padding: '6px', borderRadius: '6px', cursor: 'pointer' }}>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
            <form onSubmit={async (e) => {
                await handleSubmitSaran(e);
                setShowSaranForm(false);
            }}>
              <div style={{ marginBottom: '16px' }}>
                <select
                  value={kepadaSaran}
                  onChange={(e) => setKepadaSaran(e.target.value)}
                  style={{ width: '100%', padding: '16px', borderRadius: '16px', border: '2px solid #e2e8f0', outline: 'none', fontSize: '14px', lineHeight: 1.5, background: '#f8fafc', transition: '0.2s', fontFamily: 'inherit', boxSizing: 'border-box' }}
                  onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                  onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                  required
                >
                  <option value="" disabled>Pilih Tujuan Saran...</option>
                  <option value="Tim Acara">Tim Acara</option>
                  <option value="Tim Romantic Room">Tim Romantic Room</option>
                  <option value="Tim PNKB dan Ibu Gambuh">Tim PNKB dan Ibu Gambuh</option>
                  <option value="Lainnya">Lainnya</option>
                </select>
              </div>

              {kepadaSaran === 'Lainnya' && (
                <div style={{ marginBottom: '16px' }}>
                  <input
                    type="text"
                    value={kepadaSaranLainnya}
                    onChange={(e) => setKepadaSaranLainnya(e.target.value)}
                    placeholder="Masukkan tujuan saran lainnya..."
                    style={{ width: '100%', padding: '16px', borderRadius: '16px', border: '2px solid #e2e8f0', outline: 'none', fontSize: '14px', lineHeight: 1.5, background: '#f8fafc', transition: '0.2s', fontFamily: 'inherit', boxSizing: 'border-box' }}
                    onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                    onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                    required
                  />
                </div>
              )}

              <div style={{ marginBottom: '16px' }}>
                <textarea
                  value={saranText}
                  onChange={(e) => setSaranText(e.target.value)}
                  placeholder="Ketik saran atau masukan Anda di sini..."
                  rows={6}
                  style={{ width: '100%', padding: '16px', borderRadius: '16px', border: '2px solid #e2e8f0', outline: 'none', resize: 'none', fontSize: '14px', lineHeight: 1.5, background: '#f8fafc', transition: '0.2s', fontFamily: 'inherit', boxSizing: 'border-box' }}
                  onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                  onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                  required
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px' }}>
                <input
                  type="checkbox"
                  id="anonim-saran"
                  checked={isAnonimSaran}
                  onChange={(e) => setIsAnonimSaran(e.target.checked)}
                  style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                />
                <label htmlFor="anonim-saran" style={{ fontSize: '13px', color: '#475569', cursor: 'pointer', fontWeight: 600 }}>
                  Kirim sebagai Anonim
                </label>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="submit"
                  disabled={submittingSaran || !saranText.trim()}
                  style={{ flex: 1, padding: '14px', borderRadius: '16px', border: 'none', background: !saranText.trim() ? '#cbd5e1' : '#3b82f6', color: 'white', fontWeight: 800, fontSize: '14px', cursor: !saranText.trim() ? 'not-allowed' : 'pointer', transition: '0.2s', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}
                >
                {submittingSaran ? (
                  "Mengirim..."
                ) : (
                  <>
                    <Send size={18} />
                    Kirim Saran
                  </>
                )}
                </button>
                 {editingSaranId ? (
                  <button 
                    type="button" 
                    onClick={() => { setEditingSaranId(null); setSaranText(''); setKepadaSaran(''); setIsAnonimSaran(false); }}
                    style={{ padding: '14px 20px', borderRadius: '16px', border: '2px solid #e2e8f0', background: 'white', color: '#64748b', fontWeight: 700, fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                  >
                    Batal
                  </button>
                ) : mySaranList.length > 0 && showSaranForm ? (
                  <button 
                    type="button" 
                    onClick={() => { setShowSaranForm(false); setSaranText(''); setKepadaSaran(''); setIsAnonimSaran(false); }}
                    style={{ padding: '14px 20px', borderRadius: '16px', border: '2px solid #e2e8f0', background: 'white', color: '#64748b', fontWeight: 700, fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                  >
                    Batal
                  </button>
                ) : null}
              </div>
            </form>
            )}
          </div>
        </div>
      )}

      {/* TAB CONTENT: PROFILE */}
      {activeTab === "profile" && (
        <div className="profile-tab-container">
          {loadingProfile ? (
            <div className="skeleton-profile" />
          ) : myFullProfile ? (
            <div className="profile-details-card">
              <div className="profile-header-main">
                <div 
                  className="profile-avatar-large"
                  style={{ cursor: myFullProfile.foto ? "zoom-in" : "default" }}
                  onClick={() => {
                    if (myFullProfile.foto) {
                      Swal.fire({
                        imageUrl: myFullProfile.foto,
                        imageAlt: myFullProfile.nama,
                        showConfirmButton: false,
                        showCloseButton: true,
                        width: "auto",
                        padding: "1rem"
                      });
                    }
                  }}
                >
                  {myFullProfile.foto ? (
                    <img src={myFullProfile.foto} alt={myFullProfile.nama} />
                  ) : (
                    <span>{myFullProfile.nama?.charAt(0) || "?"}</span>
                  )}
                </div>
                <h2>#{myFullProfile.nomorUrut || "-"} {myFullProfile.nama}</h2>
                <div className="profile-role-badge">{myFullProfile.panitiaStatus || "PESERTA"}</div>
              </div>

              <div className="profile-info-grid">
                <div className="profile-info-section">
                  <h4>Informasi Personal</h4>
                  <div className="profile-info-row">
                    <span className="label">Nomor Unik</span>
                    <span className="value">{myFullProfile.nomorUnik}</span>
                  </div>
                  <div className="profile-info-row">
                    <span className="label">Jenis Kelamin</span>
                    <span className="value">{myFullProfile.jenisKelamin === "L" ? "Laki-laki" : "Perempuan"}</span>
                  </div>
                  <div className="profile-info-row">
                    <span className="label">Usia</span>
                    <span className="value">
                      {myFullProfile.tanggalLahir ? `${new Date().getFullYear() - new Date(myFullProfile.tanggalLahir).getFullYear()} Tahun` : "-"}
                    </span>
                  </div>
                  <div className="profile-info-row">
                    <span className="label">Suku</span>
                    <span className="value">{myFullProfile.suku || "-"}</span>
                  </div>
                  <div className="profile-info-row">
                    <span className="label">Pendidikan</span>
                    <span className="value">{myFullProfile.pendidikan || "-"}</span>
                  </div>
                  <div className="profile-info-row">
                    <span className="label">Pekerjaan</span>
                    <span className="value">{myFullProfile.pekerjaan || "-"}</span>
                  </div>
                </div>

                <div className="profile-info-section">
                  <h4>Domisili & Kontak</h4>
                  <div className="profile-info-row">
                    <span className="label">Daerah/Kota</span>
                    <span className="value">{myFullProfile.mandiriDesaKota || "-"}</span>
                  </div>
                  <div className="profile-info-row">
                    <span className="label">Desa</span>
                    <span className="value">{myFullProfile.mandiriDesaNama || "-"}</span>
                  </div>
                  <div className="profile-info-row">
                    <span className="label">Instagram</span>
                    <span className="value">
                      {myFullProfile.instagram ? (
                        <a href={`https://instagram.com/${myFullProfile.instagram.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="profile-insta-link">
                          @{myFullProfile.instagram.replace('@', '')}
                        </a>
                      ) : "-"}
                    </span>
                  </div>
                </div>

                <div className="profile-info-section">
                  <h4>Hobi & Favorit</h4>
                  <div className="profile-info-row">
                    <span className="label">Hobi</span>
                    <span className="value">{myFullProfile.hobi || "-"}</span>
                  </div>
                  <div className="profile-info-row">
                    <span className="label">Makanan & Minuman Favorit</span>
                    <span className="value">{myFullProfile.makananMinumanFavorit || "-"}</span>
                  </div>
                  <div className="profile-info-row">
                    <span className="label">Kriteria Pasangan</span>
                    <span className="value">{myFullProfile.kriteriaPasangan || "-"}</span>
                  </div>
                </div>
              </div>

              <div className="profile-actions-bottom" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <button className="profile-edit-btn" onClick={() => {
                  let initKota = "";
                  if (myFullProfile.mandiriDesaId) {
                      const matchW = wilayahList.find(w => String(w.id) === String(myFullProfile.mandiriDesaId));
                      if (matchW) initKota = matchW.kota;
                  }
                  
                  setEditProfileForm({
                    nama: myFullProfile.nama || "",
                    jenisKelamin: myFullProfile.jenisKelamin || "L",
                    tempatLahir: myFullProfile.tempatLahir || "",
                    tanggalLahir: myFullProfile.tanggalLahir || "",
                    alamat: myFullProfile.alamat || "",
                    suku: myFullProfile.suku || "",
                    pendidikan: myFullProfile.pendidikan || "",
                    pekerjaan: myFullProfile.pekerjaan || "",
                    hobi: myFullProfile.hobi || "",
                    makananMinumanFavorit: myFullProfile.makananMinumanFavorit || "",
                    instagram: myFullProfile.instagram || "",
                    kriteriaPasangan: myFullProfile.kriteriaPasangan || "",
                    foto: myFullProfile.foto || "",
                    kota: initKota,
                    mandiriDesaId: myFullProfile.mandiriDesaId?.toString() || "",
                    mandiriKelompokId: myFullProfile.mandiriKelompokId?.toString() || "",
                  });
                  setIsEditingProfile(true);
                }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '14px', borderRadius: '14px', border: 'none', background: '#3b82f6', color: 'white', fontWeight: 800, fontSize: '15px', cursor: 'pointer', transition: '0.2s', width: '100%', marginBottom: '4px' }}>
                  <Settings2 size={18} />
                  <span>Edit Biodata</span>
                </button>
                <button className="profile-pulang-btn" onClick={handlePulang}>
                  <LogOut size={18} />
                  <span>Pulang</span>
                </button>
                <button className="profile-logout-btn" onClick={handleLogout}>
                  <LogOut size={18} />
                  <span>Keluar dari Akun</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="profile-error">Gagal memuat profil Anda. Silakan coba lagi.</div>
          )}
        </div>
      )}

      {/* EDIT PROFILE MODAL */}
      {isEditingProfile && (
        <div className="modal-overlay" onClick={() => setIsEditingProfile(false)} style={{ zIndex: 9999 }}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px', width: '90%', padding: '24px', borderRadius: '24px', background: 'white' }}>
            <h3 style={{ marginTop: 0, marginBottom: '20px', fontSize: '20px', fontWeight: 800, color: '#1e293b' }}>Edit Biodata</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '60vh', overflowY: 'auto', paddingRight: '4px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '16px' }}>
                <div 
                   style={{ width: "100px", height: "100px", borderRadius: "50%", background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", marginBottom: "12px", border: "2px solid #e2e8f0", cursor: editProfileForm.foto ? "zoom-in" : "default" }}
                   onClick={() => {
                        if (editProfileForm.foto) {
                            Swal.fire({
                                imageUrl: editProfileForm.foto,
                                imageAlt: "Foto Profil",
                                showConfirmButton: false,
                                showCloseButton: true,
                                width: "auto",
                                padding: "1rem"
                            });
                        }
                   }}
                >
                  {editProfileForm.foto ? (
                    <img src={editProfileForm.foto} alt="Foto Baru" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                     <User size={40} color="#94a3b8" />
                  )}
                </div>
                <div style={{ display: "flex", gap: "8px" }}>
                  <label style={{ background: "#3b82f6", color: "white", padding: "8px 16px", borderRadius: "8px", fontSize: "12px", fontWeight: "bold", cursor: uploadingFoto ? "not-allowed" : "pointer", opacity: uploadingFoto ? 0.7 : 1 }}>
                    {uploadingFoto ? "Mengunggah..." : "Ganti Foto"}
                    <input 
                      type="file" 
                      hidden 
                      accept="image/jpeg,image/png,image/webp" 
                      disabled={uploadingFoto}
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        if (file.size > 5 * 1024 * 1024) {
                           Swal.fire("File Terlalu Besar", "Maksimal ukuran foto adalah 5MB.", "warning");
                           return;
                        }
                        setUploadingFoto(true);
                        const formData = new FormData();
                        formData.append("file", file);
                        try {
                           const res = await fetch("/api/upload", { method: "POST", body: formData });
                           const data = await res.json();
                           if (res.ok && data.url) {
                              setEditProfileForm({...editProfileForm, foto: data.url});
                           } else {
                              throw new Error(data.error || "Gagal upload");
                           }
                        } catch (err) {
                           Swal.fire("Error", "Gagal mengunggah foto.", "error");
                        } finally {
                           setUploadingFoto(false);
                        }
                      }} 
                    />
                  </label>
                  {editProfileForm.foto && (
                     <button type="button" onClick={() => setEditProfileForm({...editProfileForm, foto: ""})} style={{ background: "#fee2e2", color: "#ef4444", border: "1px solid #fca5a5", padding: "8px 16px", borderRadius: "8px", fontSize: "12px", fontWeight: "bold", cursor: "pointer" }}>
                        Hapus Foto
                     </button>
                  )}
                </div>
                <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "8px" }}>Format JPG/PNG/WEBP maks 5MB.</div>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 600, color: '#64748b' }}>Nama Lengkap</label>
                <input type="text" value={editProfileForm.nama} onChange={e => setEditProfileForm({...editProfileForm, nama: e.target.value})} style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid #e2e8f0', outline: 'none' }} />
              </div>
              <div style={{ display: 'flex', gap: '16px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 600, color: '#64748b' }}>Jenis Kelamin</label>
                  <select value={editProfileForm.jenisKelamin} onChange={e => setEditProfileForm({...editProfileForm, jenisKelamin: e.target.value})} style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid #e2e8f0', outline: 'none' }}>
                    <option value="L">Laki-laki</option>
                    <option value="P">Perempuan</option>
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 600, color: '#64748b' }}>Suku</label>
                  <input type="text" value={editProfileForm.suku} onChange={e => setEditProfileForm({...editProfileForm, suku: e.target.value})} style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid #e2e8f0', outline: 'none' }} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '16px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 600, color: '#64748b' }}>Tempat Lahir</label>
                  <input type="text" value={editProfileForm.tempatLahir} onChange={e => setEditProfileForm({...editProfileForm, tempatLahir: e.target.value})} style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid #e2e8f0', outline: 'none' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 600, color: '#64748b' }}>Tanggal Lahir</label>
                  <IndonesianDateInput value={editProfileForm.tanggalLahir} onChange={(val: string) => setEditProfileForm({...editProfileForm, tanggalLahir: val})} style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid #e2e8f0', outline: 'none', fontFamily: 'inherit' }} />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 600, color: '#64748b' }}>Alamat</label>
                <textarea value={editProfileForm.alamat} onChange={e => setEditProfileForm({...editProfileForm, alamat: e.target.value})} style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid #e2e8f0', outline: 'none', minHeight: '60px', fontFamily: 'inherit' }} />
              </div>
              <div style={{ display: 'flex', gap: '16px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 600, color: '#64748b' }}>Daerah/Kota</label>
                  <select value={editProfileForm.kota || ""} onChange={e => setEditProfileForm({...editProfileForm, kota: e.target.value, mandiriDesaId: "", mandiriKelompokId: ""})} style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid #e2e8f0', outline: 'none' }}>
                    <option value="">Pilih Daerah/Kota</option>
                    {kotaList.map(k => <option key={k} value={k}>{k}</option>)}
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 600, color: '#64748b' }}>Desa</label>
                  <select value={editProfileForm.mandiriDesaId || ""} onChange={e => setEditProfileForm({...editProfileForm, mandiriDesaId: e.target.value, mandiriKelompokId: ""})} style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid #e2e8f0', outline: 'none' }} disabled={!editProfileForm.kota}>
                    <option value="">Pilih Desa</option>
                    {wilayahList.filter(w => w.kota === editProfileForm.kota).map(w => <option key={w.id} value={w.id}>{w.nama}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 600, color: '#64748b' }}>Kelompok</label>
                <select value={editProfileForm.mandiriKelompokId || ""} onChange={e => setEditProfileForm({...editProfileForm, mandiriKelompokId: e.target.value})} style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid #e2e8f0', outline: 'none' }} disabled={!editProfileForm.mandiriDesaId}>
                  <option value="">Pilih Kelompok</option>
                  {kelompokList.filter(k => String(k.desaId || k.mandiriDesaId) === String(editProfileForm.mandiriDesaId)).map(k => <option key={k.id} value={k.id}>{k.nama}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 600, color: '#64748b' }}>Pendidikan</label>
                <input type="text" value={editProfileForm.pendidikan} onChange={e => setEditProfileForm({...editProfileForm, pendidikan: e.target.value})} placeholder="S1/SMA/dll" style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid #e2e8f0', outline: 'none' }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 600, color: '#64748b' }}>Pekerjaan</label>
                <input type="text" value={editProfileForm.pekerjaan} onChange={e => setEditProfileForm({...editProfileForm, pekerjaan: e.target.value})} style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid #e2e8f0', outline: 'none' }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 600, color: '#64748b' }}>Instagram</label>
                <input type="text" value={editProfileForm.instagram} onChange={e => setEditProfileForm({...editProfileForm, instagram: e.target.value})} placeholder="@username" style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid #e2e8f0', outline: 'none' }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 600, color: '#64748b' }}>Hobi</label>
                <input type="text" value={editProfileForm.hobi} onChange={e => setEditProfileForm({...editProfileForm, hobi: e.target.value})} style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid #e2e8f0', outline: 'none' }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 600, color: '#64748b' }}>Makanan/Minuman Favorit</label>
                <input type="text" value={editProfileForm.makananMinumanFavorit} onChange={e => setEditProfileForm({...editProfileForm, makananMinumanFavorit: e.target.value})} style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid #e2e8f0', outline: 'none' }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 600, color: '#64748b' }}>Kriteria Pasangan</label>
                <textarea value={editProfileForm.kriteriaPasangan} onChange={e => setEditProfileForm({...editProfileForm, kriteriaPasangan: e.target.value})} style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid #e2e8f0', outline: 'none', minHeight: '80px', fontFamily: 'inherit' }} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
              <button onClick={() => setIsEditingProfile(false)} disabled={savingProfile} style={{ flex: 1, padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', background: 'white', color: '#64748b', fontWeight: 700, cursor: 'pointer' }}>Batal</button>
              <button onClick={async () => {
                setSavingProfile(true);
                try {
                  const storedUnik = localStorage.getItem("attended_nomor_unik");
                  const storedToken = localStorage.getItem("attended_session_token");
                  const res = await fetch(`/api/public/mandiri/katalog/${currentUser.id}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ nomorUnik: storedUnik, token: storedToken, ...editProfileForm }),
                  });
                  if (!res.ok) throw new Error("Gagal menyimpan");
                  
                  const selectedWilayah = wilayahList.find(w => String(w.id) === String(editProfileForm.mandiriDesaId));
                  
                  setMyFullProfile((prev: any) => ({ 
                    ...prev, 
                    ...editProfileForm,
                    mandiriDesaKota: editProfileForm.kota || prev.mandiriDesaKota,
                    mandiriDesaNama: selectedWilayah ? selectedWilayah.nama : prev.mandiriDesaNama
                  }));
                  setIsEditingProfile(false);
                  Swal.fire({ title: "Berhasil!", text: "Biodata berhasil diperbarui.", icon: "success", timer: 2000, showConfirmButton: false });
                } catch (e) {
                  Swal.fire("Gagal", "Terjadi kesalahan saat menyimpan.", "error");
                } finally {
                  setSavingProfile(false);
                }
              }} disabled={savingProfile} style={{ flex: 1, padding: '12px', borderRadius: '12px', border: 'none', background: '#3b82f6', color: 'white', fontWeight: 700, cursor: 'pointer', transition: '0.2s' }}>
                {savingProfile ? "Menyimpan..." : "Simpan"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BOTTOM MOBILE NAVIGATION BAR */}
      <nav className="mobile-nav-bar">
        <button
          className={`nav-bar-item ${activeTab === "katalog" ? "active" : ""}`}
          onClick={() => setActiveTab("katalog")}
        >
          <Users size={20} />
          <span>Katalog</span>
        </button>
        <button
          className={`nav-bar-item ${activeTab === "cart" ? "active" : ""}`}
          onClick={() => setActiveTab("cart")}
        >
          <div className="badge-icon-wrapper">
            <Heart size={20} fill={activeTab === "cart" ? "#f43f5e" : "transparent"} color={activeTab === "cart" ? "#f43f5e" : "#64748b"} />
            {selectedIds.length > 0 && (
              <span className="badge-count-bubble">{selectedIds.length}</span>
            )}
          </div>
          <span>Pilihanku</span>
        </button>
        <button
          className={`nav-bar-item ${activeTab === "absen" ? "active" : ""}`}
          onClick={() => setActiveTab("absen")}
        >
          <QrCode size={20} />
          <span>Absen</span>
        </button>
        <button
          className={`nav-bar-item ${activeTab === "hasil" ? "active" : ""}`}
          onClick={() => setActiveTab("hasil")}
        >
          <div className="badge-icon-wrapper">
            <MessageSquare size={20} />
            {hasilRRPendingCount > 0 && (
              <span className="badge-count-bubble">{hasilRRPendingCount}</span>
            )}
          </div>
          <span>Hasil RR</span>
        </button>
        <button
          className={`nav-bar-item ${activeTab === "saran" ? "active" : ""}`}
          onClick={() => setActiveTab("saran")}
        >
          <Sparkles size={20} />
          <span>Saran</span>
        </button>
        <button
          className={`nav-bar-item ${activeTab === "profile" ? "active" : ""}`}
          onClick={() => setActiveTab("profile")}
        >
          <User size={20} />
          <span>Profil</span>
        </button>
      </nav>

      {/* DETAIL MODAL */}
      {isModalOpen && selectedParticipant && (() => {
        const sp = selectedParticipant;
        const isMe = sp.nomorUrut === currentUser?.nomorUrut;
        const isSelected = selectedIds.includes(String(sp.id));
        const isFull = (sp.selectedCount || 0) >= 5;
        const isMaxed = selectedIds.length >= 3;
        const isMale = sp.jenisKelamin === "L";
        const accentColor = isMale ? "#3b82f6" : "#ec4899";
        const accentGrad = isMale
          ? "linear-gradient(135deg,#1e40af,#3b82f6)"
          : "linear-gradient(135deg,#be185d,#ec4899)";
        return (
          <div className="dm-overlay" onClick={closeDetail}>
            <div className="dm-sheet" onClick={e => e.stopPropagation()}>

              {/* HERO */}
              <div className="dm-hero" style={{ background: accentGrad }}>
                <button className="dm-close" onClick={closeDetail}><X size={18} /></button>
                <div 
                  className="dm-avatar-wrap"
                  style={{ cursor: sp.foto ? "zoom-in" : "default" }}
                  onClick={() => {
                    if (sp.foto) {
                      Swal.fire({
                        imageUrl: sp.foto,
                        imageAlt: sp.nama,
                        showConfirmButton: false,
                        showCloseButton: true,
                        width: "auto",
                        padding: "1rem"
                      });
                    }
                  }}
                >
                  {sp.foto
                    ? <img src={sp.foto} alt={sp.nama} className="dm-avatar-img" />
                    : <div className="dm-avatar-init" style={{ background: accentColor }}>{sp.nama.charAt(0)}</div>
                  }
                </div>
                <div className="dm-hero-badge">#{sp.nomorUrut || "-"}</div>
                <h2 className="dm-name">{sp.nama}</h2>
                <div className="dm-loc"><MapPin size={13} /><span>{sp.mandiriDesaKota || "-"} • {sp.mandiriDesaNama || sp.desaNama || "-"}</span></div>
                <div className="dm-chips">
                  <span className="dm-chip">{isMale ? "👨 Laki-laki" : "👩 Perempuan"}</span>
                  <span className="dm-chip"><UserCheck size={12} /> {sp.selectedCount || 0}/5</span>
                </div>
              </div>

              {/* BODY */}
              <div className="dm-body">
                <div className="dm-section-title">Informasi Pribadi</div>
                <div className="dm-grid">
                  <div className="dm-field"><span className="dm-label">TTL</span><span className="dm-val">{sp.tempatLahir || "-"}, {sp.tanggalLahir || "-"}</span></div>
                  <div className="dm-field"><span className="dm-label">Usia</span><span className="dm-val">{sp.tanggalLahir ? `${new Date().getFullYear() - new Date(sp.tanggalLahir).getFullYear()} Tahun` : "-"}</span></div>
                  <div className="dm-field"><span className="dm-label">Pendidikan</span><span className="dm-val">{sp.pendidikan || "-"}</span></div>
                  <div className="dm-field"><span className="dm-label">Pekerjaan</span><span className="dm-val">{sp.pekerjaan || "-"}</span></div>
                  <div className="dm-field"><span className="dm-label">Suku</span><span className="dm-val">{sp.suku || "-"}</span></div>
                  <div className="dm-field"><span className="dm-label">Hobi</span><span className="dm-val">{sp.hobi || "-"}</span></div>
                  <div className="dm-field"><span className="dm-label">Instagram</span><span className="dm-val">{sp.instagram ? <a href={`https://instagram.com/${sp.instagram.replace('@', '')}`} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit' }}>@{sp.instagram.replace('@', '')}</a> : "-"}</span></div>
                  <div className="dm-field dm-field-full"><span className="dm-label">Makanan/Minuman Favorit</span><span className="dm-val">{sp.makananMinumanFavorit || "-"}</span></div>
                  <div className="dm-field dm-field-full"><span className="dm-label">Kriteria Pasangan</span><span className="dm-val">{sp.kriteriaPasangan || "-"}</span></div>
                  <div className="dm-field dm-field-full"><span className="dm-label">Alamat</span><span className="dm-val">{sp.alamat || "-"}</span></div>
                </div>
              </div>

              {/* CTA */}
              <div className="dm-cta">
                {(() => {
                  if (isMe) {
                    return <button className="dm-btn dm-btn-disabled" disabled>Ini Profil Anda</button>;
                  }

                  const isPulang = sp.keterangan?.toLowerCase() === "pulang";
                  const isTidakHadir = sp.keterangan?.toLowerCase() === "alpha" || sp.keterangan?.toLowerCase() === "izin";
                  const isBelumHadir = sp.isHadir === 0;
                  
                  if (isPulang || isTidakHadir || isBelumHadir) {
                    return (
                      <div style={{ textAlign: "center", color: "#ef4444", fontSize: "13px", fontWeight: "600", padding: "12px", background: "#fef2f2", borderRadius: "14px", border: "1px solid #fee2e2" }}>
                        Mohon maaf, peserta {sp.nama} {isPulang ? "pulang lebih awal" : (isBelumHadir ? "belum melakukan absensi kehadiran" : "tidak hadir")}, Anda tidak bisa memilih peserta tersebut.
                      </div>
                    );
                  }

                  if (currentUser?.status === "waiting") {
                    return (
                      <div style={{ textAlign: "center", color: "#64748b", fontSize: "13px", fontWeight: "600", padding: "12px", background: "#f1f5f9", borderRadius: "14px", border: "1px solid #e2e8f0" }}>
                        Anda belum melakukan absensi kehadiran. Silakan absen terlebih dahulu untuk dapat memilih peserta.
                      </div>
                    );
                  }

                  if (sp.handshakeStatus) {
                    if (sp.handshakeStatus === "Selesai") {
                      return (
                        <>
                          <button className="dm-btn dm-btn-disabled" disabled><Users size={18} />Sudah Bertemu</button>
                          <button className="dm-btn" style={{ background: '#10b981', color: 'white', border: 'none', marginTop: '8px' }} onClick={() => { setIsModalOpen(false); setActiveTab('hasil'); }}>
                            <Heart size={18} />Input Hasil RR
                          </button>
                        </>
                      );
                    }
                    if (sp.handshakeStatus === "Diterima") {
                      return (
                        <>
                          <button className="dm-btn dm-btn-disabled" disabled><Users size={18} />Dalam Ruangan</button>
                          {(() => {
                            const room = activeRooms.find((r: any) => String(r.pengirimNo) === String(sp.nomorUnik) || String(r.penerimaNo) === String(sp.nomorUnik));
                            const isPart = room && currentUser && (String(currentUser.nomorUnik) === String(room.pengirimNo) || String(currentUser.nomorUnik) === String(room.penerimaNo) || room.assignedGuardId === currentUser.id || room.assignedCallerId === currentUser.id || room.assignedCaller2Id === currentUser.id);
                            return (isAdmin || isPart) && (
                              <button className="dm-btn" style={{ background: '#10b981', color: 'white', border: 'none', marginTop: '8px' }} onClick={() => handleAdminSelesaikanSesi(sp)}>
                                {isAdmin ? <CheckCircle2 size={18} /> : <Heart size={18} />}{isAdmin ? 'Selesaikan Sesi' : 'Input Hasil RR'}
                              </button>
                            );
                          })()}
                        </>
                      );
                    }
                    if (sp.handshakeStatus === "Menunggu") {
                      if (isSelected) {
                        return (
                          <button className="dm-btn dm-btn-danger" onClick={() => handleCancelSelection(String(sp.id), sp.nama)}>
                            <X size={18} />Batalkan Pilihan
                          </button>
                        );
                      }
                      return <button className="dm-btn dm-btn-disabled" disabled><Clock size={18} />Dalam Antrean</button>;
                    }
                  }

                  if (isSelected) {
                    const sel = selections.find((s: any) => String(s.penerimaId) === String(sp.id));
                    const isWaiting = sel && sel.status === "Menunggu";
                    if (isWaiting) {
                      return (
                        <button className="dm-btn dm-btn-danger" onClick={() => handleCancelSelection(String(sp.id), sp.nama)}>
                          <X size={18} />Batalkan Pilihan
                        </button>
                      );
                    } else {
                      return <button className="dm-btn dm-btn-selected" disabled><CheckCircle2 size={18} />Sudah Terpilih</button>;
                    }
                  }

                  if (isFull) {
                    return <button className="dm-btn dm-btn-disabled" disabled>Peserta Penuh (5/5)</button>;
                  }

                  if (isMaxed) {
                    return <button className="dm-btn dm-btn-disabled" disabled>Batas Pilihan Tercapai (3/3)</button>;
                  }



                  return (
                    <button className="dm-btn" style={{ background: accentGrad }} onClick={() => handleConfirmSelection(String(sp.id), sp.nama)}>
                      <Heart size={18} fill="white" />Pilih Peserta Ini
                    </button>
                  );
                })()}
              </div>

            </div>
          </div>
        );
      })()}



      {/* COMMENTS MODAL */}
      {isCommentsModalOpen && (
        <div className="modal-overlay" onClick={() => { setIsCommentsModalOpen(false); unlockBodyScroll(); }}>
          <div className="modal-box comments-modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="icon-badge"><MessageSquare size={28} className="text-blue-500" /></div>
              <h2>Pusat Komentar</h2>
              <p>Kelola komentar masuk dan pantau jejak Anda</p>
              <button className="modal-close-btn" onClick={() => { setIsCommentsModalOpen(false); unlockBodyScroll(); }}><X size={24} /></button>
            </div>

            <div className="modal-body">
              <div className="comment-section-tabs">
                <h3 className="tab-title sent">Jejak Komentar Saya</h3>
                <div className="comments-list sent">
                  {sentComments.length > 0 ? sentComments.map((c) => (
                    <div key={c.id} className="comment-item sent">
                      <div className="comment-bubble sent-red">
                        <div className="sent-indicator">🚩 JEJAK TERKIRIM</div>
                        <p className="comment-text">"{c.komentar}"</p>
                        <div className="comment-meta">
                          <div className="author-info">
                            <span className="author-label text-red-500">Untuk:</span>
                            <span className="comment-author">#{c.penerimaNoUrut} {c.penerimaNama}</span>
                          </div>
                          <span className="comment-date red">{new Date(c.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                  )) : <div className="no-comments mini"><p>Anda belum mengirimkan komentar.</p></div>}
                </div>
              </div>

              <div className="spacer-modal" />

              <div className="comment-section-tabs">
                <h3 className="tab-title">Komentar Untuk Anda</h3>
                <div className="comments-list">
                  {userComments.length > 0 ? userComments.map((c) => (
                    <div key={c.id} className="comment-item">
                      <div className="comment-bubble">
                        <div className="comment-icon"><MessageSquare size={16} fill="#3b82f6" color="#3b82f6" /></div>
                        <p className="comment-text">"{c.komentar}"</p>
                        <div className="comment-meta">
                          <div className="author-info">
                            <span className="author-label">Dari:</span>
                            <span className="comment-author">
                              {c.isAnonim ? "Anonim" : (c.realPengirimNama || c.pengirimNama || "Seseorang")}
                              {c.realPengirimNoUrut && !c.isAnonim && ` (#${c.realPengirimNoUrut})`}
                            </span>
                          </div>
                          <span className="comment-date">{new Date(c.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </div>
                    </div>
                  )) : (
                    <div className="no-comments">
                      <Heart size={48} style={{ marginBottom: "16px", color: "#e2e8f0" }} />
                      <p>Belum ada komentar untuk Anda.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}



      <style jsx>{`
        .container { max-width:1200px; margin:0 auto; padding:40px 20px; font-family:'Inter',sans-serif; color:#334155; overflow-x:hidden; }

        .page-header { text-align:center; margin-bottom:40px; display:flex; flex-direction:column; align-items:center; gap:8px; }
        .badge-top { display:inline-flex; align-items:center; gap:6px; background:#f1f5f9; color:#3b82f6; padding:6px 14px; border-radius:20px; font-size:11px; font-weight:800; letter-spacing:0.5px; }
        .page-header h1 { font-size:42px; font-weight:900; letter-spacing:-1px; margin:0; color:#1e293b; line-height:1.1; }
        .page-header h1 span { color:#3b82f6; }
        .welcome-msg { color:#64748b; font-size:16px; margin:0; }

        .toolbar { display:flex; flex-direction:column; gap:16px; background:white; padding:16px; border-radius:24px; box-shadow:0 4px 15px rgba(0,0,0,0.03); border:1px solid #f1f5f9; margin-bottom:24px; box-sizing:border-box; width:100%; overflow:hidden; }
        .search-group { display:flex; gap:8px; width:100%; overflow:hidden; min-width:0; align-items:center; }
        .search-bar { flex:1; min-width:0; overflow:hidden; position:relative; display:flex; align-items:center; gap:8px; background:#f8fafc; border:1px solid #e2e8f0; padding:10px 14px; border-radius:14px; }
        .search-bar input { border:none; background:transparent; outline:none; width:100%; min-width:0; font-size:14px; font-weight:500; }
        .search-icon { color:#94a3b8; flex-shrink:0; }
        .clear-search-btn { background:#e2e8f0; border:none; border-radius:50%; width:20px; height:20px; flex-shrink:0; display:flex; align-items:center; justify-content:center; cursor:pointer; color:#64748b; transition:0.2s; margin-left:4px; }
        .clear-search-btn:hover { background:#cbd5e1; color:#1e293b; }
        .btn-advanced { display:flex; align-items:center; gap:8px; background:white; border:1px solid #e2e8f0; padding:0 20px; border-radius:16px; font-size:14px; font-weight:600; cursor:pointer; transition:0.2s; white-space:nowrap; }
        .btn-advanced:hover { background:#f8fafc; }
        .filter-controls { display:flex; align-items:center; gap:12px; flex-wrap:wrap; }
        .toggle-group { display:flex; background:#f1f5f9; padding:4px; border-radius:14px; }
        .toggle-group button { border:none; background:transparent; padding:8px 18px; border-radius:10px; font-size:13px; font-weight:700; color:#64748b; cursor:pointer; transition:0.2s; }
        .toggle-group button.active { background:#1e293b; color:white; box-shadow:0 4px 10px rgba(0,0,0,0.1); }
        .select-container { position:relative; display:flex; align-items:center; }
        .select-box { appearance:none; background:white; border:1px solid #e2e8f0; padding:10px 35px 10px 18px; border-radius:14px; font-size:13px; font-weight:600; cursor:pointer; outline:none; min-width:160px; color:#1e293b; transition:0.2s; }
        .select-box:hover { border-color:#cbd5e1; }
        .select-box:focus { border-color:#3b82f6; box-shadow:0 0 0 3px rgba(59,130,246,0.1); }
        .select-arrow { position:absolute; right:14px; pointer-events:none; color:#94a3b8; }
        .status-badge { display:flex; align-items:center; gap:8px; background:#f8fafc; border:1px solid #e2e8f0; padding:10px 18px; border-radius:14px; font-size:13px; font-weight:700; color:#475569; }
        .btn-logout { margin-left:auto; display:flex; align-items:center; gap:8px; background:#fef2f2; color:#ef4444; border:1px solid #fee2e2; padding:10px 18px; border-radius:14px; font-size:13px; font-weight:700; cursor:pointer; transition:0.2s; }
        .btn-logout:hover { background:#fee2e2; }

        .toolbar-status-row {
          display: flex;
          align-items: center;
          margin-top: 4px;
        }
        .btn-filter-toggle {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 44px;
          height: 44px;
          flex-shrink: 0;
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 14px;
          cursor: pointer;
          transition: 0.2s;
          color: #475569;
        }
        .btn-filter-toggle:hover {
          background: #f8fafc;
          border-color: #cbd5e1;
        }
        .btn-filter-toggle.active {
          background: #eff6ff;
          border-color: #3b82f6;
          color: #1d4ed8;
        }
        .btn-reset-filters {
          display: flex;
          align-items: center;
          gap: 6px;
          background: #f1f5f9;
          border: 1px solid #cbd5e1;
          color: #475569;
          padding: 10px 18px;
          border-radius: 14px;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          transition: 0.2s;
        }
        .btn-reset-filters:hover {
          background: #e2e8f0;
        }


        .selection-banner { background:#232d3f; transition: all 0.2s ease; border: 2px solid transparent; }
        .selection-banner:hover { transform: translateY(-2px); box-shadow: 0 20px 40px rgba(35,45,63,0.35); }
        .selection-banner.active-filter { border-color: #3b82f6; background: #1e293b; }
        .selection-banner { padding:24px 32px; border-radius:28px; display:flex; justify-content:space-between; align-items:center; color:white; margin-bottom:32px; box-shadow:0 15px 30px rgba(35,45,63,0.2); }
        .banner-left { display:flex; align-items:center; gap:20px; }
        .banner-icon { background:rgba(255,255,255,0.1); padding:14px; border-radius:18px; color:#60a5fa; }
        .banner-text { display:flex; flex-direction:column; gap:2px; }
        .banner-label { font-size:11px; font-weight:800; color:#94a3b8; letter-spacing:1.5px; }
        .banner-value { font-size:19px; font-weight:800; color:#ffffff; margin:0; }
        .pilihan-pill { background:#3b82f6; color:white; padding:8px 16px; border-radius:20px; font-size:13px; font-weight:800; transition:0.3s; white-space:nowrap; }
        .pilihan-pill.full { background:#10b981; box-shadow:0 0 15px rgba(16,185,129,0.4); }

        .user-title-context { margin-bottom:32px; }
        .user-title-context h3 { font-size:22px; font-weight:800; margin:0 0 6px 0; color:#1e293b; }
        .user-meta { display:flex; justify-content:space-between; color:#64748b; font-size:14px; font-weight:600; flex-wrap:wrap; gap:4px; }

        .grid-container { display:grid; grid-template-columns:repeat(auto-fill,minmax(340px,1fr)); gap:24px; }

        .participant-card { background:white; border-radius:32px; border:1px solid #f1f5f9; overflow:hidden; transition:0.3s cubic-bezier(0.4,0,0.2,1); box-shadow:0 4px 20px rgba(0,0,0,0.02); }
        .participant-card:hover { transform:translateY(-8px); box-shadow:0 20px 40px rgba(0,0,0,0.08); border-color:#3b82f644; }
        .participant-card.is-pulang { opacity:0.65; filter:grayscale(0.3); background:#f8fafc; border-color:#cbd5e1; }
        .participant-card.is-pulang:hover { transform:none; box-shadow:0 4px 20px rgba(0,0,0,0.02); border-color:#cbd5e1; }
        .participant-card.is-pulang .card-image { filter: grayscale(100%); -webkit-filter: grayscale(100%); }
        .pulang-badge { top:16px; right:16px; background:#64748b; color:white; box-shadow:0 4px 12px rgba(100,116,139,0.4); }
        .card-image-wrapper { height:380px; position:relative; overflow:hidden; }
        .card-image { width:100%; height:100%; object-fit:cover; transition:0.5s; }
        .participant-card:hover .card-image { transform:scale(1.05); }
        .floating-badge { position:absolute; padding:6px 12px; border-radius:12px; font-size:12px; font-weight:800; backdrop-filter:blur(8px); }
        .id-badge { top:16px; left:16px; background:#3b82f6; color:white; }
        .full-badge { top:16px; right:16px; background:#ef4444; color:white; box-shadow:0 4px 12px rgba(239,68,68,0.4); animation:pulse-red 2s infinite; }
        @keyframes pulse-red { 0%{transform:scale(1)} 50%{transform:scale(1.05)} 100%{transform:scale(1)} }
        .label-badge { bottom:16px; right:16px; background:rgba(255,255,255,0.9); color:#334155; }
        .label-badge.status-panitia { background:#1e293b; color:white; }
        .card-content { padding:24px; }
        .card-name { font-size:20px; font-weight:800; color:#1e293b; margin:0 0 6px 0; }
        .card-location { display:flex; align-items:center; gap:6px; color:#64748b; font-size:13px; font-weight:600; margin-bottom:20px; }
        .card-stats-grid { display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:16px; }
        .card-passions-mini { display:flex; flex-direction:column; gap:6px; margin-bottom:24px; padding:12px; background:#f8fafc; border-radius:12px; }
        .pass-pill { display:flex; align-items:center; gap:8px; font-size:11px; font-weight:600; color:#475569; }
        .pass-pill svg { color:#3b82f6; opacity:0.8; }
        .stat-pill { background:#f8fafc; padding:10px 14px; border-radius:12px; display:flex; align-items:center; gap:10px; font-size:13px; font-weight:700; color:#475569; }
        .stat-pill svg { color:#3b82f6; opacity:0.8; }
        .stat-pill.selection-count { background:#eff6ff; color:#1d4ed8; border:1px solid #dbeafe; }
        .stat-pill.selection-count svg { color:#2563eb; }
        .card-instagram-link { color:inherit; text-decoration:none; }
        .card-instagram-link:hover { color:#ec4899; text-decoration:underline; }
        .card-actions { display:flex; gap:12px; }
        .btn-secondary { flex:1; background:white; border:1px solid #e2e8f0; color:#334155; padding:12px; border-radius:14px; font-size:13px; font-weight:700; text-align:center; text-decoration:none; transition:0.2s; cursor:pointer; }
        .btn-secondary:hover { background:#f8fafc; border-color:#cbd5e1; }
        .btn-primary { flex:1; display:flex; align-items:center; justify-content:center; gap:8px; background:#3b82f6; color:white; border:none; padding:12px; border-radius:14px; font-size:13px; font-weight:700; cursor:pointer; transition:0.2s; }
        .btn-primary:hover { background:#2563eb; transform:translateY(-2px); }
        .btn-primary.selected { background:#10b981; }
        .btn-primary.disabled { background:#f1f5f9; color:#94a3b8; cursor:not-allowed; border:1px solid #e2e8f0; }
        .btn-primary.disabled:hover { transform:none; background:#f1f5f9; }
        .btn-danger { flex:1; display:flex; align-items:center; justify-content:center; gap:8px; background:#fef2f2; color:#ef4444; border:1px solid #fee2e2; padding:12px; border-radius:14px; font-size:13px; font-weight:700; cursor:pointer; transition:0.2s; }
        .btn-danger:hover { background:#fee2e2; border-color:#fca5a5; transform:translateY(-2px); }

        .pagination { margin-top:48px; display:flex; align-items:center; justify-content:center; gap:24px; }
        .pagination button { background:white; border:1px solid #e2e8f0; padding:10px 20px; border-radius:12px; font-size:14px; font-weight:600; cursor:pointer; }
        .pagination button:disabled { opacity:0.5; cursor:not-allowed; }
        .page-numbers { display:flex; gap:8px; }
        .page-numbers button { width:40px; height:40px; padding:0; display:flex; align-items:center; justify-content:center; }
        .page-numbers button.active { background:#1e293b; color:white; border-color:#1e293b; }

        .skeleton-card { height:600px; background:#f1f5f9; border-radius:32px; animation:pulse 1.5s infinite; }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }

        /* ── Mobile responsive ─────────────────────────────────────────── */
        @media (max-width:1024px) {
          .container { padding:20px 12px; overflow-x:hidden; }
          .page-header h1 { font-size:28px; }
          .toolbar { border-radius:16px; width:100%; box-sizing:border-box; overflow:hidden; }
          .grid-container { grid-template-columns:1fr; }
          .btn-logout { margin-left:0; width:100%; justify-content:center; }
          .search-group { flex-direction:row; width:100%; overflow:hidden; min-width:0; }
          .search-bar { min-width:0; overflow:hidden; }
          .selection-banner { padding:16px 20px; flex-direction:column; gap:12px; align-items:flex-start; }
          .banner-value { font-size:15px; }
          .filter-controls { display:flex; flex-direction:column; gap:10px; align-items:stretch; width:100%; }
          .filter-controls .toggle-group { display:flex; width:100%; }
          .filter-controls .toggle-group button { flex:1; text-align:center; }
          .filter-controls .select-container { width:100%; }
          .filter-controls .select-box { width:100%; min-width:0; }
          .btn-reset-filters { width:100%; justify-content:center; }
        }

        /* ── DETAIL MODAL ───────────────────────────────────────────── */
        .dm-overlay {
          position:fixed; inset:0; z-index:1000;
          background:rgba(15,23,42,0.7);
          backdrop-filter:blur(6px);
          display:flex; align-items:flex-end; justify-content:center;
          animation:fadeIn 0.2s ease;
        }
        @media(min-width:640px) {
          .dm-overlay { align-items:center; padding:20px; }
        }
        .dm-sheet {
          background:white;
          width:100%; max-width:480px;
          border-radius:28px 28px 0 0;
          max-height:92dvh;
          display:flex; flex-direction:column;
          overflow:hidden;
          box-shadow:0 -8px 40px rgba(0,0,0,0.2);
          animation:slideUp 0.35s cubic-bezier(0.16,1,0.3,1);
        }
        @media(min-width:640px) {
          .dm-sheet { border-radius:28px; max-height:90dvh; }
        }

        /* hero */
        .dm-hero {
          position:relative;
          padding:48px 20px 24px;
          display:flex; flex-direction:column; align-items:center;
          flex-shrink:0;
        }
        .dm-close {
          position:absolute; top:14px; right:14px;
          width:32px; height:32px; border-radius:50%;
          background:rgba(255,255,255,0.25); border:none;
          color:white; display:flex; align-items:center; justify-content:center;
          cursor:pointer; transition:0.2s;
        }
        .dm-close:hover { background:rgba(255,255,255,0.4); }
        .dm-avatar-wrap {
          width:100px; height:100px; border-radius:50%;
          border:4px solid rgba(255,255,255,0.5);
          overflow:hidden; margin-bottom:14px;
          box-shadow:0 8px 24px rgba(0,0,0,0.2);
          flex-shrink:0;
        }
        .dm-avatar-img { width:100%; height:100%; object-fit:cover; }
        .dm-avatar-init {
          width:100%; height:100%;
          display:flex; align-items:center; justify-content:center;
          font-size:40px; font-weight:900; color:white;
        }
        .dm-hero-badge {
          background:rgba(255,255,255,0.25);
          color:white; font-size:11px; font-weight:800;
          padding:3px 10px; border-radius:20px;
          margin-bottom:8px; letter-spacing:0.5px;
        }
        .dm-name {
          font-size:22px; font-weight:900; color:white;
          margin:0 0 6px; text-align:center; line-height:1.2;
        }
        .dm-loc {
          display:flex; align-items:center; gap:5px;
          color:rgba(255,255,255,0.85); font-size:12px; font-weight:600;
          margin-bottom:14px; text-align:center;
        }
        .dm-chips { display:flex; flex-wrap:wrap; gap:6px; justify-content:center; }
        .dm-chip {
          background:rgba(255,255,255,0.2);
          color:white; font-size:11px; font-weight:700;
          padding:4px 12px; border-radius:20px;
          display:flex; align-items:center; gap:4px;
        }

        /* body */
        .dm-body { flex:1; overflow-y:auto; -webkit-overflow-scrolling:touch; padding:20px 20px 8px; }
        .dm-section-title {
          font-size:11px; font-weight:800; color:#94a3b8;
          letter-spacing:1px; text-transform:uppercase;
          margin-bottom:14px;
        }
        .dm-grid { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
        .dm-field {
          background:#f8fafc; border-radius:14px;
          padding:12px 14px;
          display:flex; flex-direction:column; gap:4px;
        }
        .dm-field-full { grid-column:span 2; }
        .dm-label { font-size:10px; font-weight:800; color:#94a3b8; text-transform:uppercase; letter-spacing:0.5px; }
        .dm-val { font-size:13px; font-weight:700; color:#1e293b; line-height:1.4; }

        /* cta */
        .dm-cta {
          padding:14px 20px 28px;
          flex-shrink:0;
          background:white;
          border-top:1px solid #f1f5f9;
        }
        .dm-btn {
          width:100%; display:flex; align-items:center; justify-content:center; gap:10px;
          color:white; border:none; padding:16px;
          border-radius:18px; font-size:15px; font-weight:800;
          cursor:pointer; transition:all 0.25s;
        }
        .dm-btn:not(:disabled):active { transform:scale(0.98); }
        .dm-btn-selected { background:#10b981 !important; cursor:default; }
        .dm-btn-disabled { background:#e2e8f0 !important; color:#94a3b8 !important; cursor:not-allowed; }
        .dm-btn-danger { background:#fef2f2 !important; color:#ef4444 !important; border:1px solid #fee2e2 !important; }
        .dm-btn-danger:hover { background:#fee2e2 !important; border-color:#fca5a5 !important; transform:translateY(-2px); }

        @keyframes fadeIn { from{opacity:0} to{opacity:1} }
        @keyframes slideUp { from{transform:translateY(40px) scale(0.98);opacity:0} to{transform:translateY(0) scale(1);opacity:1} }

        .status-queue-banner { margin-top:10px; background:#fff1f2; color:#f43f5e; padding:8px 16px; border-radius:10px; display:inline-flex; align-items:center; gap:8px; font-size:13px; font-weight:700; border:1px dashed #fecdd3; animation:pulse-border 2s infinite; }
        @keyframes pulse-border { 0%{border-color:#fecdd3} 50%{border-color:#f43f5e;box-shadow:0 0 10px rgba(244,63,94,0.1)} 100%{border-color:#fecdd3} }

        /* ── BOX LOVE ─────────────────────────────────────────────────── */
        .box-love-fab { position:fixed; bottom:32px; right:32px; display:flex; align-items:center; gap:10px; background:linear-gradient(135deg,#f472b6,#ec4899,#be185d); color:white; border:none; padding:14px 22px; border-radius:50px; font-size:14px; font-weight:800; cursor:pointer; z-index:100; box-shadow:0 8px 24px rgba(236,72,153,0.4); transition:all 0.3s cubic-bezier(0.16,1,0.3,1); animation:fabPulse 2.5s ease-in-out infinite; }
        .box-love-fab:hover { transform:translateY(-4px) scale(1.04); box-shadow:0 16px 32px rgba(236,72,153,0.5); }
        @keyframes fabPulse { 0%,100%{box-shadow:0 8px 24px rgba(236,72,153,0.4)} 50%{box-shadow:0 8px 32px rgba(236,72,153,0.7)} }

        .bl-overlay { position:fixed; inset:0; background:rgba(15,23,42,0.55); backdrop-filter:blur(12px); z-index:900; display:flex; align-items:center; justify-content:center; padding:20px; animation:fadeIn 0.2s ease; }
        .bl-popup { background:white; border-radius:32px; width:100%; max-width:480px; max-height:90vh; overflow-y:auto; -webkit-overflow-scrolling:touch; display:flex; flex-direction:column; box-shadow:0 40px 80px rgba(0,0,0,0.2); animation:slideUp 0.3s cubic-bezier(0.16,1,0.3,1); }
        .bl-header { display:flex; align-items:center; justify-content:space-between; padding:28px 28px 20px; }
        .bl-logo { display:flex; align-items:center; gap:14px; }
        .bl-logo-icon { font-size:44px; line-height:1; filter:drop-shadow(0 4px 8px rgba(236,72,153,0.3)); }
        .bl-title { font-size:26px; font-weight:900; margin:0; color:#1e293b; letter-spacing:-0.5px; }
        .bl-subtitle { font-size:13px; color:#64748b; margin:0; font-weight:500; }
        .bl-close { width:36px; height:36px; display:flex; align-items:center; justify-content:center; border:none; background:#f1f5f9; border-radius:50%; cursor:pointer; color:#64748b; transition:0.2s; flex-shrink:0; }
        .bl-close:hover { background:#e2e8f0; }
        .bl-notice { margin:0 28px 16px; background:#fff0f6; border:1px solid #fce7f3; border-radius:12px; padding:10px 16px; font-size:13px; color:#be185d; font-weight:600; display:flex; align-items:center; gap:6px; }
        .bl-body { padding:0 28px; flex:1; }
        .bl-section { margin-bottom:20px; }
        .bl-section-label { display:flex; align-items:center; gap:8px; font-size:13px; font-weight:800; color:#475569; margin-bottom:10px; }
        .bl-my-info { display:flex; align-items:center; gap:14px; background:#f0fdf4; border:1.5px solid #bbf7d0; border-radius:16px; padding:14px 18px; position:relative; }
        .bl-my-avatar { width:44px; height:44px; border-radius:50%; overflow:hidden; background:#e0e7ff; display:flex; align-items:center; justify-content:center; font-size:18px; font-weight:900; color:#4f46e5; flex-shrink:0; }
        .bl-my-avatar img { width:100%; height:100%; object-fit:cover; }
        .bl-my-name { font-size:15px; font-weight:800; color:#1e293b; }
        .bl-my-loc { font-size:12px; color:#64748b; font-weight:600; margin-top:2px; }
        .bl-check { margin-left:auto; color:#16a34a; flex-shrink:0; }
        .bl-heart-divider { text-align:center; font-size:24px; margin:4px 0 16px; animation:heartBeat 1.5s ease-in-out infinite; }
        @keyframes heartBeat { 0%,100%{transform:scale(1)} 50%{transform:scale(1.2)} }
        .bl-search-bar { position:relative; display:flex; align-items:center; }
        .bl-search-bar input { width:100%; border:2px solid #e2e8f0; background:#f8fafc; padding:13px 44px 13px 18px; border-radius:14px; font-size:14px; font-weight:600; outline:none; transition:0.2s; color:#1e293b; }
        .bl-search-bar input:focus { border-color:#f472b6; background:white; box-shadow:0 0 0 4px rgba(244,114,182,0.12); }
        .bl-search-icon { position:absolute; right:14px; color:#94a3b8; pointer-events:none; }
        .bl-results { margin-top:10px; border:1.5px solid #fce7f3; border-radius:16px; overflow:hidden; max-height:220px; overflow-y:auto; -webkit-overflow-scrolling:touch; }
        .bl-result-item { display:flex; align-items:center; gap:14px; padding:12px 16px; cursor:pointer; transition:0.15s; border-bottom:1px solid #fff0f6; }
        .bl-result-item:last-child { border-bottom:none; }
        .bl-result-item:hover { background:#fff0f6; }
        .bl-result-item.selected { background:#fdf2f8; }
        .bl-result-avatar { width:40px; height:40px; border-radius:50%; overflow:hidden; background:#fce7f3; display:flex; align-items:center; justify-content:center; font-size:16px; font-weight:900; color:#be185d; flex-shrink:0; }
        .bl-result-avatar img { width:100%; height:100%; object-fit:cover; }
        .bl-result-name { font-size:14px; font-weight:800; color:#1e293b; }
        .bl-result-loc { font-size:11px; color:#64748b; font-weight:600; margin-top:2px; }
        .bl-loading,.bl-empty { text-align:center; padding:12px; color:#94a3b8; font-size:13px; font-weight:600; }
        .bl-footer { padding:20px 28px 28px; }
        .bl-submit-btn { width:100%; display:flex; align-items:center; justify-content:center; gap:10px; background:linear-gradient(135deg,#f472b6,#ec4899,#be185d); color:white; border:none; padding:16px; border-radius:18px; font-size:16px; font-weight:800; cursor:pointer; transition:all 0.3s cubic-bezier(0.16,1,0.3,1); box-shadow:0 6px 20px rgba(236,72,153,0.3); }
        .bl-submit-btn:not(:disabled):hover { transform:translateY(-3px); box-shadow:0 12px 28px rgba(236,72,153,0.45); }
        .bl-submit-btn:disabled { opacity:0.5; cursor:not-allowed; background:#e2e8f0; color:#94a3b8; box-shadow:none; }
        .bl-footer-note { text-align:center; font-size:12px; color:#94a3b8; font-weight:500; margin:12px 0 0; line-height:1.5; }

        /* FIX: Mobile Box Love — bottom sheet style on small screens */
        @media (max-width:480px) {
          .bl-popup { border-radius:24px 24px 0 0; }
          .bl-overlay { align-items:flex-end; padding:0; }
          .box-love-fab { bottom:20px; right:20px; }
        }

        /* ── Commentary ──────────────────────────────────────────────── */
        .commentary-box { margin-top:20px; padding-top:16px; border-top:1px dashed #e2e8f0; }
        .commentary-header { display:flex; align-items:center; gap:12px; margin-bottom:12px; }
        .anon-toggle { display:flex; align-items:center; gap:6px; font-size:12px; font-weight:700; color:#64748b; cursor:pointer; }
        .anon-toggle input { width:14px; height:14px; cursor:pointer; }
        .comment-name-input { flex:1; border:1px solid #e2e8f0; background:#f8fafc; padding:6px 12px; border-radius:8px; font-size:12px; font-weight:600; outline:none; }
        .comment-name-input:focus { border-color:#3b82f6; background:white; }
        .comment-tags-label { font-size:10px; font-weight:800; color:#94a3b8; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:8px; }
        .comment-buttons { display:flex; flex-wrap:wrap; gap:6px; }
        .btn-tag { background:white; border:1px solid #e2e8f0; padding:6px 12px; border-radius:100px; font-size:11px; font-weight:700; color:#475569; cursor:pointer; transition:all 0.2s; }
        .btn-tag:hover { background:#eff6ff; border-color:#3b82f6; color:#3b82f6; transform:translateY(-1px); }
        .btn-tag:disabled { opacity:0.5; cursor:not-allowed; transform:none; }

        /* ── Notification ────────────────────────────────────────────── */
        .header-actions { display:flex; align-items:center; gap:12px; justify-content:center; margin-top:8px; }
        .btn-notification { background:white; border:1px solid #e2e8f0; width:44px; height:44px; border-radius:14px; display:flex; align-items:center; justify-content:center; cursor:pointer; position:relative; transition:all 0.2s; color:#64748b; box-shadow:0 4px 6px -1px rgba(0,0,0,0.1); }
        .btn-notification:hover { background:#f8fafc; border-color:#3b82f6; color:#3b82f6; transform:translateY(-2px); }
        .btn-notification.has-new { border-color:#3b82f6; color:#3b82f6; animation:pulse-ring 2s cubic-bezier(0.4,0,0.6,1) infinite; }
        @keyframes pulse-ring { 0%{box-shadow:0 0 0 0 rgba(59,130,246,0.4)} 70%{box-shadow:0 0 0 10px rgba(59,130,246,0)} 100%{box-shadow:0 0 0 0 rgba(59,130,246,0)} }
        .notification-dot { position:absolute; top:10px; right:10px; width:10px; height:10px; background:#ef4444; border-radius:50%; border:2px solid white; }

        .comment-sent-indicator { display:flex; align-items:center; gap:8px; background:#fef2f2; color:#ef4444; padding:12px 16px; border-radius:12px; font-size:13px; font-weight:700; border:1px solid #fee2e2; animation:slideIn 0.3s ease-out; }
        @keyframes slideIn { from{opacity:0;transform:translateX(-10px)} to{opacity:1;transform:translateX(0)} }

        /* ── Comments Modal ──────────────────────────────────────────── */
        .comments-modal-box { background:white; border-radius:32px; padding:40px; max-width:500px; width:95%; max-height:85vh; overflow-y:auto; -webkit-overflow-scrolling:touch; position:relative; box-shadow:0 25px 50px -12px rgba(0,0,0,0.25); }
        .comments-modal-box .modal-header { text-align:center; margin-bottom:32px; }
        .comments-modal-box .icon-badge { width:64px; height:64px; background:#eff6ff; color:#3b82f6; display:flex; align-items:center; justify-content:center; border-radius:20px; margin:0 auto 20px; box-shadow:inset 0 0 0 1px rgba(59,130,246,0.1); }
        .comments-modal-box h2 { font-size:26px; font-weight:800; color:#1e293b; margin-bottom:8px; letter-spacing:-0.025em; }
        .comments-modal-box p { color:#64748b; font-size:15px; }
        .modal-close-btn { position:absolute; top:20px; right:20px; background:none; border:none; cursor:pointer; color:#64748b; padding:8px; border-radius:50%; transition:all 0.2s; }
        .modal-close-btn:hover { background:#f1f5f9; color:#1e293b; }
        .comments-list { display:flex; flex-direction:column; gap:16px; padding:10px 0; }
        .comment-item { animation:slideUp 0.3s ease-out; }
        .comment-bubble { background:linear-gradient(135deg,#ffffff,#f0f7ff); padding:24px; border-radius:28px; border-bottom-left-radius:4px; border:1px solid #e2e8f0; position:relative; box-shadow:0 10px 25px rgba(59,130,246,0.05); transition:0.3s; }
        .comment-bubble:hover { transform:scale(1.02); box-shadow:0 15px 35px rgba(59,130,246,0.1); border-color:#3b82f6; }
        .comment-icon { position:absolute; top:-12px; left:20px; background:white; width:32px; height:32px; border-radius:10px; display:flex; align-items:center; justify-content:center; box-shadow:0 4px 10px rgba(0,0,0,0.1); border:1px solid #e2e8f0; }
        .comment-text { font-size:22px; font-weight:800; margin-bottom:20px; font-style:italic; line-height:1.4; background:linear-gradient(135deg,#1e293b,#3b82f6); -webkit-background-clip:text; -webkit-text-fill-color:transparent; letter-spacing:-0.01em; }
        .comment-meta { display:flex; justify-content:space-between; align-items:center; font-size:13px; color:#64748b; font-weight:700; border-top:1px solid #f1f5f9; padding-top:16px; flex-wrap:wrap; gap:8px; }
        .author-info { display:flex; align-items:center; gap:6px; }
        .author-label { color:#94a3b8; font-weight:600; text-transform:uppercase; font-size:10px; letter-spacing:0.5px; }
        .comment-author { color:#1e293b; font-weight:800; background:#f1f5f9; padding:4px 10px; border-radius:8px; }
        .comment-date { font-size:11px; background:#eff6ff; color:#3b82f6; padding:4px 10px; border-radius:8px; }
        .no-comments { text-align:center; padding:80px 20px; color:#94a3b8; display:flex; flex-direction:column; align-items:center; background:#f8fafc; border-radius:32px; border:2px dashed #e2e8f0; }

        .tab-title { font-size:14px; font-weight:800; color:#64748b; text-transform:uppercase; letter-spacing:1px; margin-bottom:16px; display:flex; align-items:center; gap:8px; }
        .tab-title.sent { color:#ef4444; }
        .tab-title.sent::before { content:''; width:8px; height:8px; background:#ef4444; border-radius:50%; }
        .comment-bubble.sent-red { background:linear-gradient(135deg,#fff5f5,#fffcfc); border-color:#fecdd3; box-shadow:0 10px 25px rgba(239,68,68,0.05); }
        .sent-indicator { font-size:10px; font-weight:950; color:#ef4444; margin-bottom:8px; letter-spacing:0.5px; }
        .comment-date.red { background:#fef2f2; color:#ef4444; }
        .spacer-modal { height:48px; border-bottom:2px dashed #f1f5f9; margin-bottom:32px; }
        .no-comments.mini { padding:30px; font-size:13px; }

        @media (max-width:480px) {
          .comments-modal-box { padding:24px 16px; max-height:90vh; border-radius:20px; }
          .comment-text { font-size:16px; }
        }

        /* ── DESKTOP TAB NAV ───────────────────────────────────────────── */
        .desktop-tab-nav {
          display: flex;
          justify-content: center;
          gap: 12px;
          margin-bottom: 32px;
        }
        .desktop-tab-nav button {
          display: flex;
          align-items: center;
          gap: 8px;
          background: white;
          border: 1px solid #e2e8f0;
          padding: 10px 24px;
          border-radius: 14px;
          font-size: 14px;
          font-weight: 750;
          color: #64748b;
          cursor: pointer;
          transition: 0.2s;
        }
        .desktop-tab-nav button:hover {
          background: #f8fafc;
          border-color: #cbd5e1;
        }
        .desktop-tab-nav button.active {
          background: #1e293b;
          border-color: #1e293b;
          color: white;
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }
        .desktop-tab-nav button.active :global(svg) {
          color: white !important;
        }
        .badge-icon-wrapper {
          position: relative;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }
        .badge-count-bubble {
          position: absolute;
          top: -6px;
          right: -10px;
          background: #ef4444;
          color: white;
          font-size: 9px;
          font-weight: 900;
          border-radius: 50%;
          min-width: 16px;
          height: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1.5px solid white;
          padding: 0 2px;
        }
        .mobile-nav-bar {
          display: none;
        }

        /* ── BOTTOM MOBILE NAV BAR ─────────────────────────────────────── */
        @media (max-width: 1024px) {
          .desktop-tab-nav {
            display: none;
          }
          .mobile-nav-bar {
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            height: 64px;
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(12px);
            border-top: 1px solid #e2e8f0;
            display: flex;
            align-items: center;
            justify-content: space-around;
            z-index: 500;
            padding-bottom: env(safe-area-inset-bottom);
            box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.05);
          }
          .nav-bar-item {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 4px;
            border: none;
            background: transparent;
            color: #64748b;
            font-size: 10px;
            font-weight: 700;
            cursor: pointer;
            transition: 0.2s;
            flex: 1;
            height: 100%;
          }
          .nav-bar-item.active {
            color: #3b82f6;
          }
          .pb-24 {
            padding-bottom: 96px !important;
          }
        }

        /* ── MOBILE RESPONSIVE CATALOG GRID & CARDS ─────────────────────── */
        @media (max-width: 640px) {
          .grid-container {
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 12px !important;
          }
          .participant-card {
            border-radius: 20px !important;
          }
          .card-image-wrapper {
            height: 180px !important;
          }
          .card-content {
            padding: 12px !important;
          }
          .card-name {
            font-size: 14px !important;
            font-weight: 800 !important;
            margin-bottom: 2px !important;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }
          .card-location {
            font-size: 10px !important;
            margin-bottom: 12px !important;
            gap: 3px !important;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }
          .card-stats-grid {
            display: none !important;
          }
          .card-passions-mini {
            display: none !important;
          }
          .commentary-box {
            display: none !important;
          }
          .card-actions {
            flex-direction: column !important;
            gap: 6px !important;
          }
          .btn-secondary, .btn-primary, .btn-danger {
            padding: 8px 6px !important;
            font-size: 11px !important;
            border-radius: 10px !important;
            width: 100% !important;
            justify-content: center !important;
          }
          .floating-badge {
            font-size: 10px !important;
            padding: 4px 8px !important;
            border-radius: 8px !important;
          }
          .id-badge {
            top: 8px !important;
            left: 8px !important;
          }
          .full-badge {
            top: 8px !important;
            right: 8px !important;
          }
          .label-badge {
            bottom: 8px !important;
            right: 8px !important;
          }
          .pulang-badge {
            top: 8px !important;
            right: 8px !important;
          }
        }

        /* ── CART / LOVE LETTER STYLE ─────────────────────────────────── */
        .cart-container {
          max-width: 600px;
          margin: 0 auto;
          animation: slideUp 0.3s ease-out;
        }
        .selection-info-card {
          display: flex;
          align-items: center;
          gap: 10px;
          background: #fff1f2;
          color: #e11d48;
          padding: 16px 20px;
          border-radius: 16px;
          font-weight: 800;
          font-size: 15px;
          border: 1px solid #ffe4e6;
          margin-bottom: 20px;
        }
        .empty-cart-state {
          text-align: center;
          padding: 60px 20px;
          background: #f8fafc;
          border: 2px dashed #e2e8f0;
          border-radius: 24px;
          display: flex;
          flex-direction: column;
          align-items: center;
          margin-bottom: 20px;
        }
        .empty-cart-icon {
          font-size: 48px;
          margin-bottom: 16px;
          filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.05));
        }
        .empty-cart-state h3 {
          font-size: 18px;
          font-weight: 800;
          color: #1e293b;
          margin: 0 0 8px 0;
        }
        .empty-cart-state p {
          font-size: 13px;
          color: #64748b;
          margin: 0 0 20px 0;
          line-height: 1.5;
          max-width: 280px;
        }
        .goto-catalog-btn {
          background: #3b82f6;
          color: white;
          font-weight: 700;
          font-size: 13px;
          padding: 10px 24px;
          border-radius: 12px;
          border: none;
          cursor: pointer;
          transition: 0.2s;
        }
        .goto-catalog-btn:hover {
          background: #2563eb;
          transform: translateY(-2px);
        }
        .cart-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-bottom: 24px;
        }
        .cart-item-card {
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 20px;
          padding: 16px 20px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.02);
          transition: 0.2s;
        }
        .cart-item-card:hover {
          border-color: #cbd5e1;
          box-shadow: 0 6px 16px rgba(0, 0, 0, 0.04);
        }
        .cart-item-info {
          display: flex;
          align-items: center;
          gap: 16px;
        }
        .cart-item-avatar {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: #fff1f2;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid #ffe4e6;
        }
        .cart-item-name {
          font-size: 14px;
          font-weight: 800;
          color: #1e293b;
          margin-bottom: 4px;
        }
        .status-badge-pill {
          font-size: 11px;
          font-weight: 700;
          padding: 2px 8px;
          border-radius: 6px;
          text-transform: capitalize;
        }
        .status-badge-pill.menunggu {
          background: #fef3c7;
          color: #d97706;
        }
        .status-badge-pill.diterima {
          background: #d1fae5;
          color: #065f46;
        }
        .status-badge-pill.selesai {
          background: #dbeafe;
          color: #1e40af;
        }
        .cart-btn-danger {
          display: flex;
          align-items: center;
          gap: 6px;
          background: #fef2f2;
          color: #ef4444;
          border: 1px solid #fee2e2;
          padding: 8px 14px;
          border-radius: 10px;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          transition: 0.2s;
        }
        .cart-btn-danger:hover {
          background: #fee2e2;
        }
        .cart-btn-disabled {
          display: flex;
          align-items: center;
          gap: 6px;
          background: #f1f5f9;
          color: #94a3b8;
          border: 1px solid #e2e8f0;
          padding: 8px 14px;
          border-radius: 10px;
          font-size: 12px;
          font-weight: 700;
          cursor: default;
        }

        .box-love-section-card {
          background: linear-gradient(135deg, #fff0f6, #fff5f5);
          border: 1px solid #fce7f3;
          border-radius: 24px;
          padding: 24px;
          box-shadow: 0 4px 15px rgba(252, 231, 243, 0.3);
        }
        .box-love-section-header {
          display: flex;
          gap: 16px;
          margin-bottom: 16px;
        }
        .box-love-section-header .emoji {
          font-size: 32px;
          line-height: 1;
        }
        .box-love-section-header h4 {
          font-size: 15px;
          font-weight: 800;
          color: #be185d;
          margin: 0 0 4px 0;
        }
        .box-love-section-header p {
          font-size: 12px;
          color: #9d174d;
          margin: 0;
          line-height: 1.5;
        }
        .box-love-section-btn {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          background: linear-gradient(135deg,#f472b6,#ec4899,#be185d);
          color: white;
          border: none;
          padding: 12px;
          border-radius: 14px;
          font-size: 13px;
          font-weight: 800;
          cursor: pointer;
          box-shadow: 0 4px 12px rgba(236,72,153,0.25);
          transition: 0.2s;
        }
        .box-love-section-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 16px rgba(236,72,153,0.35);
        }

        /* ── PROFILE TAB STYLE ─────────────────────────────────────────── */
        .profile-tab-container {
          max-width: 600px;
          margin: 0 auto;
          animation: slideUp 0.3s ease-out;
        }
        .skeleton-profile {
          height: 400px;
          background: #f1f5f9;
          border-radius: 24px;
          animation: pulse 1.5s infinite;
        }
        .profile-details-card {
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 28px;
          padding: 24px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.02);
        }
        .profile-header-main {
          display: flex;
          flex-direction: column;
          align-items: center;
          margin-bottom: 28px;
          text-align: center;
        }
        .profile-avatar-large {
          width: 90px;
          height: 90px;
          border-radius: 50%;
          overflow: hidden;
          background: #eff6ff;
          color: #3b82f6;
          font-size: 32px;
          font-weight: 900;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 12px;
          border: 3px solid #dbeafe;
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.1);
        }
        .profile-avatar-large img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .profile-header-main h2 {
          font-size: 18px;
          font-weight: 900;
          color: #1e293b;
          margin: 0 0 6px 0;
        }
        .profile-role-badge {
          background: #1e293b;
          color: white;
          font-size: 9px;
          font-weight: 800;
          padding: 3px 8px;
          border-radius: 6px;
          letter-spacing: 0.5px;
        }
        .profile-info-grid {
          display: flex;
          flex-direction: column;
          gap: 20px;
          margin-bottom: 28px;
        }
        .profile-info-section {
          background: #f8fafc;
          border-radius: 16px;
          padding: 16px;
        }
        .profile-info-section h4 {
          font-size: 11px;
          font-weight: 800;
          color: #94a3b8;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin: 0 0 12px 0;
          border-bottom: 1px dashed #e2e8f0;
          padding-bottom: 6px;
        }
        .profile-info-row {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 16px;
          padding: 8px 0;
          font-size: 13px;
        }
        .profile-info-row .label {
          color: #64748b;
          font-weight: 600;
          flex-shrink: 0;
          max-width: 120px;
        }
        .profile-info-row .value {
          color: #1e293b;
          font-weight: 750;
          text-align: right;
          flex: 1;
          word-break: break-word;
          line-height: 1.5;
        }
        .profile-insta-link {
          color: #3b82f6;
          text-decoration: none;
        }
        .profile-insta-link:hover {
          color: #ec4899;
          text-decoration: underline;
        }
        .profile-actions-bottom {
          border-top: 1px solid #f1f5f9;
          padding-top: 20px;
        }
        .profile-pulang-btn {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          background: #fef2f2;
          color: #ef4444;
          border: 1px solid #fee2e2;
          padding: 14px;
          border-radius: 16px;
          font-size: 14px;
          font-weight: 800;
          cursor: pointer;
          transition: 0.2s;
        }
        .profile-pulang-btn:hover {
          background: #fee2e2;
        }
        .profile-logout-btn {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          background: #f8fafc;
          color: #64748b;
          border: 1px solid #e2e8f0;
          padding: 14px;
          border-radius: 16px;
          font-size: 14px;
          font-weight: 800;
          cursor: pointer;
          transition: 0.2s;
        }
        .profile-logout-btn:hover {
          background: #e2e8f0;
        }

        /* SweetAlert2 z-index override */
        :global(.swal2-container) { z-index:10000 !important; }
      `}</style>
    </div>
  );
}
