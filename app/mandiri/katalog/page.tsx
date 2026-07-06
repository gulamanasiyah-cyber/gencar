"use client";




import { useState, useEffect, useCallback, useRef } from "react";
import Swal from "sweetalert2";
import {
  Sparkles, Search, User, MapPin, Heart, Calendar,
  GraduationCap, Briefcase, Lock, LogOut, ChevronDown,
  Settings2, CheckCircle2, UserCheck, Users, Globe, Music, Utensils,
  X, ShieldCheck, Star, UtilityPole as UtensilsIcon, ArrowLeft, Instagram, Timer, MessageSquare, Clock, QrCode
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
  const [kotaList, setKotaList] = useState<string[]>([]);
  const [selectedKota, setSelectedKota] = useState("all");
  const [page, setPage] = useState(1);
  const [currentUser, setCurrentUser] = useState<any>(null);
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
  const [activeTab, setActiveTab] = useState<"katalog" | "cart" | "profile" | "absen">("katalog");
  const [absenTabMode, setAbsenTabMode] = useState<"show_barcode" | "scan_camera">("show_barcode");
  const [scanningAbsen, setScanningAbsen] = useState(false);
  const absenScannerRef = useRef<any>(null);
  const [myFullProfile, setMyFullProfile] = useState<any>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [showFilters, setShowFilters] = useState(false);



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
              Swal.fire({ icon: "info", title: "Sudah Hadir", text: "Anda sudah tercatat hadir untuk kegiatan ini." });
            } else if (!res.ok) {
              Swal.fire({ icon: "error", title: "Gagal", text: data.error || "Gagal mencatat absensi." });
            } else {
              Swal.fire({ icon: "success", title: "Berhasil", text: "Kehadiran Anda berhasil dicatat!", timer: 2000, showConfirmButton: false });
              setAbsenTabMode("show_barcode");
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
        kota: selectedKota,
        nomorUnik: storedUnik || "",
        sessionToken: storedToken || "",
        onlyChosen: category === "pilihan" ? "true" : "",
      });

      const res = await fetch(`/api/public/mandiri/katalog?${qs}`);

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
  }, [search, page, gender, category, pendidikan, selectedKota, desaFilter, hasAttended]);

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
        const [titleRes, descRes, filterRes, boxLoveRes, publicStatusRes, statusRes] = await Promise.all([
          fetch("/api/public/mandiri/settings?key=mandiri_registration_title"),
          fetch("/api/public/mandiri/settings?key=mandiri_registration_description"),
          fetch("/api/public/mandiri/filters"),
          fetch("/api/mandiri/box-love?action=status"),
          fetch("/api/public/mandiri/settings?key=mandiri_katalog_public_status"),
          storedUnik ? fetch(`/api/public/mandiri/katalog/check-status?${buildQuery({
            nomorUnik: storedUnik,
            ...(storedToken ? { sessionToken: storedToken } : {}),
            deviceId,
          })}`) : Promise.resolve(null)
        ]);

        let title = "KATALOG PESERTA dan PANITIA";
        let description = "";
        if (titleRes.ok) { const t = await titleRes.json(); if (t.value) title = t.value; }
        if (descRes.ok) { const d = await descRes.json(); if (d.value) description = d.value; }
        setLatestActivity({ title, description });

        if (filterRes.ok) {
          const filterJson = await filterRes.json();
          setPendidikanList(filterJson.pendidikan || []);
          setKotaList(filterJson.kota || []);
          setWilayahList(filterJson.wilayah || []);
        }

        if (boxLoveRes.ok) {
          const boxLoveJson = await boxLoveRes.json();
          setBoxLoveStatus(boxLoveJson.value || "closed");
        }

        if (publicStatusRes.ok) {
          const publicStatusJson = await publicStatusRes.json();
          setKatalogPublicStatus(publicStatusJson.value || "closed");
        }

        if (statusRes && statusRes.ok) {
          const rawText = await statusRes.text();
          if (rawText) {
            const data = JSON.parse(rawText);

            if (data.status === "attended" || data.status === "waiting") {
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
                setGender(data.jenisKelamin === "L" ? "P" : "L");
              }
              setKomentarNama(data.nama);
              localStorage.setItem("attended_role", userRole);

              // Parallelize comments check and selections fetch
              const selQs = buildQuery({ nomorUnik: storedUnik, token: storedToken || "" });
              const [commRes, selRes] = await Promise.all([
                fetchUserComments(data.id),
                fetch(`/api/mandiri/pilih?${selQs}`)
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
            }
          }
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

  // Realtime updates using Pusher
  useEffect(() => {
    const pusher = getPusherClient();
    if (!pusher) return;

    const channel = pusher.subscribe("taaruf-channel");

    const handleUpdate = () => {
      // Trigger data refetching
      fetchData();
      fetchSelections();
    };

    const handleBoxLoveUpdate = (data: any) => {
      if (data && data.status) {
        setBoxLoveStatus(data.status);
      }
    };

    channel.bind("taaruf-changed", handleUpdate);
    channel.bind("room-changed", handleUpdate);
    channel.bind("box-love-status-changed", handleBoxLoveUpdate);

    return () => {
      channel.unbind("taaruf-changed", handleUpdate);
      channel.unbind("room-changed", handleUpdate);
      channel.unbind("box-love-status-changed", handleBoxLoveUpdate);
      pusher.unsubscribe("taaruf-channel");
    };
  }, [fetchData, fetchSelections]);

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
    window.location.reload();
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
    window.location.reload();
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
    if (!verifying && !isLocked && !hasAttended && katalogPublicStatus !== "closed") {
      window.location.href = "/mandiri/katalog/login";
    }
  }, [verifying, isLocked, hasAttended, katalogPublicStatus]);

  // ─── Early returns ────────────────────────────────────────────────────────

  if (isLocked || (katalogPublicStatus === "closed" && !hasAttended)) {
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



  if (!hasAttended) {
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
          {activeTab === "profile" && "PROFIL SAYA"}
          {activeTab === "absen" && "ABSENSI SAYA"}
        </div>
        <h1>
          {activeTab === "katalog" && <>DATA <span>PESERTA</span></>}
          {activeTab === "cart" && <>LOVE <span>LETTER</span></>}
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
                  <select className="select-box" value={desaFilter} onChange={(e) => { setDesaFilter(e.target.value); setPage(1); }} disabled={selectedKota === "all"}>
                    <option value="all">Semua Desa</option>
                    {wilayahList.filter(w => w.kota === selectedKota).map(w => <option key={w.id} value={w.id}>{w.nama}</option>)}
                  </select>
                  <ChevronDown size={14} className="select-arrow" />
                </div>

                <button className="btn-reset-filters" onClick={() => {
                  setSearch("");
                  setSearchTerm("");
                  setGender(currentUser?.jenisKelamin === "L" ? "P" : (currentUser?.jenisKelamin === "P" ? "L" : "all"));
                  setCategory("all");
                  setPendidikan("all");
                  setSelectedKota("all");
                  setDesaFilter("all");
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
            <h3>{currentUser?.nama || "User Profile"}</h3>
            <div className="user-meta">
              <span>No. Urut Peserta : {currentUser?.nomorUrut || "-"}</span>
              {currentUser?.mandiriDesaKota && (
                <span className="location">@{currentUser?.mandiriDesaKota} • {currentUser?.mandiriDesaNama}</span>
              )}
            </div>
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
                const isBelumHadir = item.isHadir === 0;
                const isUnavailable = isPulang || isTidakHadir;
                return (
                  <div key={item.id} className={`participant-card ${isUnavailable ? "is-pulang" : ""}`} style={{ position: "relative", opacity: isUnavailable ? 1 : undefined, filter: isUnavailable ? "none" : undefined }}>
                    <div style={isUnavailable ? { filter: "blur(5px) grayscale(0.6)", opacity: 0.7, pointerEvents: "none", userSelect: "none" } : {}}>
                      <div className="card-image-wrapper">
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
                        <div className={`floating-badge label-badge ${item.panitiaStatus ? "status-panitia" : ""}`}>
                          {item.panitiaStatus ? "PANITIA" : "PESERTA"}
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
                          <div className="stat-pill"><Heart size={14} /><span>{item.statusNikah || "Belum Menikah"}</span></div>
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
                                  <button className="btn-secondary disabled" disabled style={{ background: "#f1f5f9", color: "#64748b", border: "1px solid #e2e8f0" }}>
                                    <Users size={16} />
                                    <span>Sudah Bertemu</span>
                                  </button>
                                );
                              }
                              if (item.handshakeStatus === "Diterima") {
                                return (
                                  <button className="btn-secondary disabled" disabled style={{ background: "#f1f5f9", color: "#64748b", border: "1px solid #e2e8f0" }}>
                                    <Users size={16} />
                                    <span>Dalam Ruangan</span>
                                  </button>
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

                            if (currentUser?.status === "waiting" || isBelumHadir) {
                              return null;
                            }

                            if (boxLoveStatus === "open") {
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
                            }
                            
                            return null;
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

      {/* TAB CONTENT: PROFILE */}
      {activeTab === "profile" && (
        <div className="profile-tab-container">
          {loadingProfile ? (
            <div className="skeleton-profile" />
          ) : myFullProfile ? (
            <div className="profile-details-card">
              <div className="profile-header-main">
                <div className="profile-avatar-large">
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
                  <div className="profile-info-row">
                    <span className="label">Status Nikah</span>
                    <span className="value">{myFullProfile.statusNikah || "Belum Menikah"}</span>
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
          className={`nav-bar-item ${activeTab === "profile" ? "active" : ""}`}
          onClick={() => setActiveTab("profile")}
        >
          <User size={20} />
          <span>Profil</span>
        </button>
        <button
          className={`nav-bar-item ${activeTab === "absen" ? "active" : ""}`}
          onClick={() => setActiveTab("absen")}
        >
          <QrCode size={20} />
          <span>Absen</span>
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
                <div className="dm-avatar-wrap">
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
                  <span className="dm-chip">{sp.statusNikah || "Belum Menikah"}</span>
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
                      return <button className="dm-btn dm-btn-disabled" disabled><Users size={18} />Sudah Bertemu</button>;
                    }
                    if (sp.handshakeStatus === "Diterima") {
                      return <button className="dm-btn dm-btn-disabled" disabled><Users size={18} />Dalam Ruangan</button>;
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



                  if (boxLoveStatus === "open") {
                    return (
                      <button className="dm-btn" style={{ background: accentGrad }} onClick={() => handleConfirmSelection(String(sp.id), sp.nama)}>
                        <Heart size={18} fill="white" />Pilih Peserta Ini
                      </button>
                    );
                  }

                  return null;
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
          .badge-icon-wrapper {
            position: relative;
            display: inline-flex;
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
          padding: 6px 0;
          font-size: 13px;
        }
        .profile-info-row .label {
          color: #64748b;
          font-weight: 600;
        }
        .profile-info-row .value {
          color: #1e293b;
          font-weight: 750;
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
