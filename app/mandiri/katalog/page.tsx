"use client";




import { useState, useEffect, useCallback } from "react";
import Swal from "sweetalert2";
import {
  Sparkles, Search, User, MapPin, Heart, Calendar,
  GraduationCap, Briefcase, Lock, LogOut, ChevronDown,
  Settings2, CheckCircle2, UserCheck, Users, Globe, Music, Utensils,
  X, ShieldCheck, Star, UtilityPole as UtensilsIcon, ArrowLeft, Instagram, Timer, MessageSquare
} from "lucide-react";
import Link from "next/link";

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
  const [isBoxLoveOpen, setIsBoxLoveOpen] = useState(false);
  const [boxLoveSearch, setBoxLoveSearch] = useState("");
  const [boxLoveResults, setBoxLoveResults] = useState<any[]>([]);
  const [boxLoveTarget, setBoxLoveTarget] = useState<any>(null);
  const [boxLoveLoading, setBoxLoveLoading] = useState(false);
  const [boxLoveSubmitting, setBoxLoveSubmitting] = useState(false);

  // Komentar state
  const [komentarNama, setKomentarNama] = useState("");
  const [komentarAnon, setKomentarAnon] = useState(false);
  const [submittingKomentar, setSubmittingKomentar] = useState<string | null>(null);
  const [userComments, setUserComments] = useState<any[]>([]);
  const [sentComments, setSentComments] = useState<any[]>([]);
  const [isCommentsModalOpen, setIsCommentsModalOpen] = useState(false);
  const [hasNewComments, setHasNewComments] = useState(false);

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
        status: category,
        pendidikan,
        mandiriDesaId: desaFilter,
        kota: selectedKota,
        nomorUnik: storedUnik || "",
        sessionToken: storedToken || "",
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
  }, [search, page, gender, category, pendidikan, selectedKota, desaFilter]);

  useEffect(() => {
    async function init() {
      try {
        const [titleRes, descRes] = await Promise.all([
          fetch("/api/public/mandiri/settings?key=mandiri_registration_title"),
          fetch("/api/public/mandiri/settings?key=mandiri_registration_description")
        ]);

        let title = "KATALOG PESERTA dan PANITIA";
        let description = "";
        if (titleRes.ok) { const t = await titleRes.json(); if (t.value) title = t.value; }
        if (descRes.ok) { const d = await descRes.json(); if (d.value) description = d.value; }
        setLatestActivity({ title, description });

        const filterRes = await fetch("/api/public/mandiri/filters");
        if (filterRes.ok) {
          const filterJson = await filterRes.json();
          setPendidikanList(filterJson.pendidikan || []);
          setKotaList(filterJson.kota || []);
          setWilayahList(filterJson.wilayah || []);
        }

        const boxLoveRes = await fetch("/api/mandiri/box-love?action=status");
        if (boxLoveRes.ok) {
          const boxLoveJson = await boxLoveRes.json();
          setBoxLoveStatus(boxLoveJson.value || "closed");
        }

        const storedUnik = localStorage.getItem("attended_nomor_unik");
        const storedToken = localStorage.getItem("attended_session_token");
        let deviceId = localStorage.getItem("mandiri_device_id");
        if (!deviceId) {
          deviceId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
          localStorage.setItem("mandiri_device_id", deviceId);
        }

        if (storedUnik) {
          // FIX: All query params encoded via buildQuery
          const qs = buildQuery({
            nomorUnik: storedUnik,
            ...(storedToken ? { sessionToken: storedToken } : {}),
            deviceId,
          });
          const res = await fetch(`/api/public/mandiri/katalog/check-status?${qs}`);
          const rawText = await res.text();
          if (!rawText) throw new Error("Empty response from check-status");
          const data = JSON.parse(rawText);

          if (data.status === "attended") {
            setHasAttended(true);
            const userRole = data.role || localStorage.getItem("attended_role") || "Peserta";
            setCurrentUser({
              id: data.id,
              nama: data.nama,
              nomorUrut: data.nomorUrut,
              mandiriDesaNama: data.mandiriDesaNama,
              mandiriDesaKota: data.mandiriDesaKota,
              jenisKelamin: data.jenisKelamin,
              role: userRole,
            });
            if (data.jenisKelamin) {
              setGender(data.jenisKelamin === "L" ? "P" : "L");
            }
            setKomentarNama(data.nama);
            localStorage.setItem("attended_role", userRole);
            fetchUserComments(data.id);

            // FIX: Encode pilih params too
            const selQs = buildQuery({ nomorUnik: storedUnik, token: storedToken || "" });
            const selRes = await fetch(`/api/mandiri/pilih?${selQs}`);
            if (selRes.ok) {
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
      } catch (e) {
        console.error("init error:", e);
      } finally {
        setVerifying(false);
      }
    }
    init();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchTerm);
      setPage(1);
    }, 400); // Increased debounce slightly for better mobile performance
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    const timer = setTimeout(fetchData, 100);
    return () => clearTimeout(timer);
  }, [fetchData]);

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

  const handleLogout = () => {
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

  const openBoxLove = () => {
    setIsBoxLoveOpen(true);
    setBoxLoveSearch("");
    setBoxLoveResults([]);
    setBoxLoveTarget(null);
    lockBodyScroll();
  };

  const closeBoxLove = () => {
    setIsBoxLoveOpen(false);
    unlockBodyScroll();
  };

  const searchBoxLove = async (q: string) => {
    setBoxLoveSearch(q);
    if (!q || q.length < 1) { setBoxLoveResults([]); return; }
    setBoxLoveLoading(true);
    const nomorUnik = localStorage.getItem("attended_nomor_unik");
    const token = localStorage.getItem("attended_session_token");
    const oppositeGender = currentUser?.jenisKelamin === "L" ? "P" : "L";
    try {
      // FIX: All params encoded via buildQuery
      const qs = buildQuery({
        action: "search",
        q,
        jenisKelamin: oppositeGender,
        nomorUnik: nomorUnik || "",
        token: token || "",
      });
      const res = await fetch(`/api/mandiri/box-love?${qs}`);
      if (res.ok) {
        const results = await res.json();
        setBoxLoveResults(results);
      }
    } catch (e) {
      console.error("searchBoxLove error:", e);
    } finally {
      setBoxLoveLoading(false);
    }
  };

  const handleBoxLoveSubmit = async () => {
    if (!boxLoveTarget) return;
    const nomorUnik = localStorage.getItem("attended_nomor_unik");
    const token = localStorage.getItem("attended_session_token");
    setBoxLoveSubmitting(true);
    try {
      const res = await fetch("/api/mandiri/box-love", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "submit", nomorUnik, token, targetId: boxLoveTarget.id }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal mengirim");

      if (json.selections) {
        setSelections(json.selections);
        setSelectedIds(json.selections.map((s: any) => String(s.penerimaId)));
        setStatusQueue(json.selections.find((s: any) => s.status === "Menunggu") || null);
      }

      const targetIdToUpdate = boxLoveTarget.id;
      setData(prev => prev.map(item =>
        item.id === targetIdToUpdate ? { ...item, selectedCount: (item.selectedCount || 0) + 1 } : item
      ));

      Swal.fire({
        title: "Berhasil Masuk Box Love! 💝",
        html: `Permintaan Anda ke <b>${boxLoveTarget.nama}</b> telah dikirim ke Daftar Antrean Romantic Room. Admin akan menghubungi Anda segera.`,
        icon: "success",
        timer: 4000,
        showConfirmButton: false,
      });
      closeBoxLove();
    } catch (err: any) {
      Swal.fire("Gagal", err.message, "error");
    } finally {
      setBoxLoveSubmitting(false);
    }
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

  // ─── Early returns ────────────────────────────────────────────────────────

  if (isLocked) {
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
    return (
      <div className="login-backdrop">
        <LoginModal
          onVerified={(userData) => {
            setHasAttended(true);
            setCurrentUser(userData);
            if (userData.jenisKelamin) setGender(userData.jenisKelamin === "L" ? "P" : "L");
            if (userData.id) fetchUserComments(userData.id);
          }}
        />
        <style jsx>{`
          .login-backdrop {
            min-height: 100vh;
            background: #f1f5f9;
            background-image:
              radial-gradient(at 0% 0%, rgba(59,130,246,0.1) 0px, transparent 50%),
              radial-gradient(at 100% 0%, rgba(236,72,153,0.1) 0px, transparent 50%);
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
          }
        `}</style>
      </div>
    );
  }

  // ─── LoginModal (inner component) ─────────────────────────────────────────
  function LoginModal({ onVerified }: { onVerified: (userData: any) => void }) {
    const [unik, setUnik] = useState("");
    const [status, setStatus] = useState<"idle" | "verifying" | "error" | "waiting">("idle");
    const [errorMsg, setErrorMsg] = useState("");

    const verify = async () => {
      if (!unik.trim()) return;
      setStatus("verifying");
      setErrorMsg("");

      let deviceId = localStorage.getItem("mandiri_device_id");
      if (!deviceId) {
        deviceId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        localStorage.setItem("mandiri_device_id", deviceId);
      }

      try {
        // FIX: Use buildQuery so nomor unik (e.g. "MND123+456") is safely encoded
        const qs = buildQuery({ nomorUnik: unik.trim(), deviceId });
        const res = await fetch(`/api/public/mandiri/katalog/check-status?${qs}`);

        // FIX: Check response Content-Type before .json() to avoid parse errors
        const contentType = res.headers.get("content-type") || "";
        if (!contentType.includes("application/json")) {
          throw new Error(`Unexpected response: ${res.status}`);
        }

        const resData = await res.json();

        if (resData.status === "attended") {
          localStorage.setItem("attended_nomor_unik", resData.nomorUnik || unik.trim());
          localStorage.setItem("attended_session_token", resData.sessionToken);
          localStorage.setItem("attended_nomor_urut_peserta", resData.nomorUrut);
          localStorage.setItem("attended_role", resData.role || "Peserta");
          onVerified({
            id: resData.id,
            nama: resData.nama,
            nomorUrut: resData.nomorUrut,
            mandiriDesaNama: resData.mandiriDesaNama,
            mandiriDesaKota: resData.mandiriDesaKota,
            jenisKelamin: resData.jenisKelamin,
            role: resData.role || "Peserta",
          });
          Swal.fire({ title: `Selamat Datang, ${resData.nama}!`, text: "Berhasil masuk ke Katalog Peserta.", icon: "success", timer: 2000, showConfirmButton: false, toast: true, position: 'top-end' });
        } else if (resData.status === "waiting") {
          setStatus("waiting");
          setErrorMsg("Silakan lakukan absensi terlebih dahulu di meja panitia.");
        } else if (resData.status === "multi_login") {
          setErrorMsg("Nomor Unik ini sudah digunakan di perangkat lain (Single Session).");
          setStatus("error");
        } else if (resData.status === "not_found") {
          setErrorMsg("Nomor Unik tidak ditemukan. Pastikan Anda sudah terdaftar.");
          setStatus("error");
        } else {
          setErrorMsg(resData.error || "Terjadi kesalahan saat verifikasi.");
          setStatus("error");
        }
      } catch (e: any) {
        console.error("verify error:", e);
        // FIX: Distinguish network error from unexpected response
        if (e instanceof TypeError && e.message.includes("fetch")) {
          setErrorMsg("Gagal terhubung ke server. Periksa koneksi internet Anda.");
        } else {
          setErrorMsg("Terjadi kesalahan. Coba lagi dalam beberapa saat.");
        }
        setStatus("error");
      }
    };

    return (
      <div className="modal-box">
        <div className="modal-header">
          <div className="icon-badge">
            <Lock size={28} className="text-blue-500" />
          </div>
          <h2>Login Katalog</h2>
          <p>Masukkan Nomor Unik Anda untuk akses penuh</p>
        </div>

        <div className="modal-body">
          <div className="input-field">
            <User size={18} className="input-icon" />
            <input
              type="text"
              // FIX: inputMode & autoCapitalize for better mobile UX + avoid pattern mismatch
              inputMode="text"
              autoCapitalize="characters"
              autoCorrect="off"
              autoComplete="off"
              spellCheck={false}
              placeholder="Contoh: MND123456 atau PNB123456"
              value={unik}
              onChange={(e) => setUnik(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && verify()}
              autoFocus
            />
          </div>

          <button
            className={`login-btn ${status === "verifying" ? "loading" : ""}`}
            onClick={verify}
            disabled={status === "verifying" || !unik.trim()}
          >
            {status === "verifying" ? (
              <span className="flex items-center gap-2">
                <span className="spinner-small"></span> Memproses...
              </span>
            ) : "Masuk Sekarang"}
          </button>

          {status === "error" && (
            <div className="error-alert">
              <ShieldCheck size={16} />
              <span>{errorMsg}</span>
            </div>
          )}

          {status === "waiting" && (
            <div className="warning-alert">
              <Calendar size={16} />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <p>Belum punya nomor? <Link href="/mandiri/daftar">Daftar Online</Link></p>
        </div>

        <style jsx>{`
          .modal-box {
            background: rgba(255,255,255,0.95);
            backdrop-filter: blur(10px);
            width: 100%;
            max-width: 420px;
            padding: 40px;
            border-radius: 32px;
            box-shadow: 0 25px 50px -12px rgba(0,0,0,0.1);
            border: 1px solid rgba(255,255,255,0.5);
            animation: modalFadeIn 0.5s cubic-bezier(0.16,1,0.3,1);
          }
          @keyframes modalFadeIn { from { opacity:0; transform:translateY(20px) scale(0.95); } to { opacity:1; transform:translateY(0) scale(1); } }
          .modal-header { text-align:center; margin-bottom:32px; }
          .icon-badge { width:64px; height:64px; background:#eff6ff; color:#3b82f6; display:flex; align-items:center; justify-content:center; border-radius:20px; margin:0 auto 20px; box-shadow:inset 0 0 0 1px rgba(59,130,246,0.1); }
          h2 { font-size:26px; font-weight:800; color:#1e293b; margin-bottom:8px; letter-spacing:-0.025em; }
          p { color:#64748b; font-size:15px; }
          .modal-body { display:flex; flex-direction:column; gap:20px; }
          .input-field { position:relative; }
          .input-icon { position:absolute; left:16px; top:50%; transform:translateY(-50%); color:#94a3b8; }
          input {
            width:100%; background:#f8fafc; border:2px solid #e2e8f0;
            padding:16px 16px 16px 48px; border-radius:16px;
            font-size:16px; font-weight:600; transition:all 0.2s; color:#1e293b;
            /* FIX: Prevent iOS zoom on focus (min font-size 16px already set) */
          }
          input:focus { background:white; border-color:#3b82f6; box-shadow:0 0 0 4px rgba(59,130,246,0.1); outline:none; }
          .login-btn { background:linear-gradient(135deg,#3b82f6,#2563eb); color:white; border:none; padding:16px; border-radius:16px; font-size:16px; font-weight:700; cursor:pointer; transition:all 0.3s; display:flex; align-items:center; justify-content:center; gap:10px; width:100%; }
          .login-btn:hover:not(:disabled) { transform:translateY(-2px); box-shadow:0 10px 20px -5px rgba(59,130,246,0.4); }
          .login-btn:disabled { opacity:0.6; cursor:not-allowed; }
          .error-alert { padding:14px; background:#fef2f2; border-radius:12px; color:#b91c1c; font-size:14px; font-weight:600; display:flex; align-items:center; gap:10px; border:1px solid #fee2e2; }
          .warning-alert { padding:14px; background:#fffbeb; border-radius:12px; color:#92400e; font-size:14px; font-weight:600; display:flex; align-items:center; gap:10px; border:1px solid #fef3c7; }
          .modal-footer { margin-top:32px; text-align:center; border-top:1px solid #f1f5f9; padding-top:24px; }
          .modal-footer p { font-size:14px; color:#64748b; margin:0; }
          .modal-footer a { color:#3b82f6; text-decoration:none; font-weight:700; }
          .modal-footer a:hover { text-decoration:underline; }
          .spinner-small { width:18px; height:18px; border:2px solid rgba(255,255,255,0.3); border-top-color:white; border-radius:50%; animation:spin 0.8s linear infinite; }
          @keyframes spin { to { transform:rotate(360deg); } }
        `}</style>
      </div>
    );
  }

  const selectedNames = selections.map(item => `${item.penerimaNama} (#${item.penerimaNoUrut || item.penerimaNo})`);

  return (
    <div className="container">

      {/* HEADER */}
      <header className="page-header">
        <div className="badge-top">
          <Sparkles size={12} />
          KATALOG PESERTA
        </div>
        <h1>DATA <span>PESERTA</span></h1>
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

      <div className="toolbar">
        <div className="search-group">
          <div className="search-bar">
            <Search size={18} className="search-icon" />
            <input
              type="text"
              inputMode="search"
              autoCorrect="off"
              autoComplete="off"
              placeholder="Cari nama, no. urut, kota, atau desa..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
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
          <button className="btn-advanced" onClick={() => {
            setSearch("");
            setSearchTerm("");
            setGender(currentUser?.jenisKelamin === "L" ? "P" : (currentUser?.jenisKelamin === "P" ? "L" : "all"));
            setCategory("all");
            setPendidikan("all");
            setSelectedKota("all");
            setDesaFilter("all");
            setPage(1);
          }}>
            <X size={16} />
            <span>Reset Filter</span>
          </button>
        </div>

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

          <div className="status-badge">
            <Users size={16} />
            <span>{total} Peserta</span>
          </div>

          <button className="btn-logout" onClick={handleLogout}>
            <LogOut size={16} />
            <span>Keluar</span>
          </button>
        </div>
      </div>

      <div className="selection-banner">
        <div className="banner-left">
          <div className="banner-icon"><CheckCircle2 size={24} /></div>
          <div className="banner-text">
            <span className="banner-label">PILIHAN SAYA</span>
            <p className="banner-value">{selectedNames.length > 0 ? selectedNames.join(", ") : "Pilih peserta favorit Anda (Maks. 3)"}</p>
          </div>
        </div>
        <div className="banner-right">
          <div className={`pilihan-pill ${selectedIds.length >= 3 ? "full" : ""}`}>{selectedIds.length}/3 Terpilih</div>
        </div>
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
          data.map((item) => (
            <div key={item.id} className="participant-card">
              <div className="card-image-wrapper">
                <img
                  src={item.foto || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.nama)}&background=random`}
                  alt={item.nama}
                  className="card-image"
                  loading="lazy"
                />
                <div className="floating-badge id-badge">#{item.nomorUrut || "-"}</div>
                {item.selectedCount >= 5 && (
                  <div className="floating-badge full-badge">PENUH (5/5)</div>
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
                  {item.nomorUrut !== currentUser?.nomorUrut && (
                    <button
                      className={`btn-primary ${selectedIds.includes(String(item.id)) ? "selected" : ""} ${(selectedIds.length >= 3 && !selectedIds.includes(String(item.id))) || ((item.selectedCount || 0) >= 5 && !selectedIds.includes(String(item.id))) ? "disabled" : ""}`}
                      onClick={() => handleConfirmSelection(String(item.id), item.nama)}
                      disabled={selectedIds.includes(String(item.id)) || (selectedIds.length >= 3 && !selectedIds.includes(String(item.id))) || ((item.selectedCount || 0) >= 5 && !selectedIds.includes(String(item.id)))}
                    >
                      {selectedIds.includes(String(item.id)) ? <CheckCircle2 size={16} /> : <Heart size={16} />}
                      <span>{selectedIds.includes(String(item.id)) ? "Terpilih" : ((item.selectedCount || 0) >= 5 ? "Penuh" : (selectedIds.length >= 3 ? "Batas Tercapai" : "Pilih"))}</span>
                    </button>
                  )}
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
          ))
        )}
      </main>

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
              <div className="dm-hero" style={{background: accentGrad}}>
                <button className="dm-close" onClick={closeDetail}><X size={18}/></button>
                <div className="dm-avatar-wrap">
                  {sp.foto
                    ? <img src={sp.foto} alt={sp.nama} className="dm-avatar-img"/>
                    : <div className="dm-avatar-init" style={{background: accentColor}}>{sp.nama.charAt(0)}</div>
                  }
                </div>
                <div className="dm-hero-badge">#{sp.nomorUrut || "-"}</div>
                <h2 className="dm-name">{sp.nama}</h2>
                <div className="dm-loc"><MapPin size={13}/><span>{sp.mandiriDesaKota || "-"} • {sp.mandiriDesaNama || sp.desaNama || "-"}</span></div>
                <div className="dm-chips">
                  <span className="dm-chip">{isMale ? "👨 Laki-laki" : "👩 Perempuan"}</span>
                  <span className="dm-chip">{sp.statusNikah || "Belum Menikah"}</span>
                  <span className="dm-chip"><UserCheck size={12}/> {sp.selectedCount || 0}/5</span>
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
                  <div className="dm-field dm-field-full"><span className="dm-label">Alamat</span><span className="dm-val">{sp.alamat || "-"}</span></div>
                </div>
              </div>

              {/* CTA */}
              <div className="dm-cta">
                {isMe ? (
                  <button className="dm-btn dm-btn-disabled" disabled>Ini Profil Anda</button>
                ) : isSelected ? (
                  <button className="dm-btn dm-btn-selected" disabled><CheckCircle2 size={18}/>Sudah Terpilih</button>
                ) : isFull ? (
                  <button className="dm-btn dm-btn-disabled" disabled>Peserta Penuh (5/5)</button>
                ) : isMaxed ? (
                  <button className="dm-btn dm-btn-disabled" disabled>Batas Pilihan Tercapai (3/3)</button>
                ) : (
                  <button className="dm-btn" style={{background: accentGrad}} onClick={() => handleConfirmSelection(String(sp.id), sp.nama)}>
                    <Heart size={18} fill="white"/>Pilih Peserta Ini
                  </button>
                )}
              </div>

            </div>
          </div>
        );
      })()}

      {/* BOX LOVE FAB */}
      {boxLoveStatus === "open" && (
        <button className="box-love-fab" onClick={openBoxLove} title="Box Love">
          <Heart size={24} fill="white" />
          <span>Box Love</span>
        </button>
      )}

      {/* BOX LOVE POPUP */}
      {isBoxLoveOpen && (
        <div className="bl-overlay" onClick={closeBoxLove}>
          <div className="bl-popup" onClick={e => e.stopPropagation()}>
            <div className="bl-header">
              <div className="bl-logo">
                <div className="bl-logo-icon">💝</div>
                <div>
                  <h2 className="bl-title">Box Love</h2>
                  <p className="bl-subtitle">Ingin berkenalan? Masukkan ke Box Love!</p>
                </div>
              </div>
              <button className="bl-close" onClick={closeBoxLove}><X size={20} /></button>
            </div>

            <div className="bl-notice">
              <span>🔔 Admin akan menghubungi Anda untuk Romantic Room</span>
            </div>

            <div className="bl-body">
              <div className="bl-section">
                <div className="bl-section-label">
                  <span>{currentUser?.jenisKelamin === "P" ? "👩" : "👨"}</span>
                  <span>Peserta {currentUser?.jenisKelamin === "L" ? "Laki-laki" : "Perempuan"}</span>
                </div>
                <div className="bl-my-info">
                  <div className="bl-my-avatar">
                    {currentUser?.foto ? <img src={currentUser.foto} alt={currentUser.nama} /> : <span>{currentUser?.nama?.charAt(0) || "?"}</span>}
                  </div>
                  <div>
                    <div className="bl-my-name">#{currentUser?.nomorUrut} {currentUser?.nama}</div>
                    <div className="bl-my-loc">{currentUser?.mandiriDesaKota || "-"}</div>
                  </div>
                  <CheckCircle2 size={20} className="bl-check" />
                </div>
              </div>

              <div className="bl-heart-divider">💗</div>

              <div className="bl-section">
                <div className="bl-section-label">
                  <span>{currentUser?.jenisKelamin === "L" ? "👩" : "👨"}</span>
                  <span>Peserta {currentUser?.jenisKelamin === "L" ? "Perempuan" : "Laki-laki"}</span>
                </div>
                <div className="bl-search-bar">
                  <input
                    type="text"
                    inputMode="search"
                    autoCorrect="off"
                    autoComplete="off"
                    placeholder={`Nomor peserta (${currentUser?.jenisKelamin === "L" ? "200-299" : "1-199"})`}
                    value={boxLoveSearch}
                    onChange={e => searchBoxLove(e.target.value)}
                  />
                  <Search size={18} className="bl-search-icon" />
                </div>

                {boxLoveLoading && <div className="bl-loading">Mencari...</div>}

                {boxLoveResults.length > 0 && (
                  <div className="bl-results">
                    {boxLoveResults.map(r => (
                      <div key={r.id} className={`bl-result-item ${boxLoveTarget?.id === r.id ? "selected" : ""}`} onClick={() => setBoxLoveTarget(r)}>
                        <div className="bl-result-avatar">
                          {r.foto ? <img src={r.foto} alt={r.nama} /> : <span>{r.nama?.charAt(0)}</span>}
                        </div>
                        <div className="bl-result-info">
                          <div className="bl-result-name">#{r.nomorUrut} {r.nama}</div>
                          <div className="bl-result-loc">{r.mandiriDesaKota || "-"} • {r.mandiriDesaNama || "-"}</div>
                        </div>
                        {boxLoveTarget?.id === r.id && <CheckCircle2 size={18} className="bl-check" />}
                      </div>
                    ))}
                  </div>
                )}

                {boxLoveSearch.length > 0 && !boxLoveLoading && boxLoveResults.length === 0 && (
                  <div className="bl-empty">Peserta tidak ditemukan</div>
                )}
              </div>
            </div>

            <div className="bl-footer">
              <button className="bl-submit-btn" onClick={handleBoxLoveSubmit} disabled={!boxLoveTarget || boxLoveSubmitting}>
                <Heart size={18} fill="white" />
                <span>{boxLoveSubmitting ? "Mengirim..." : "Masukkan Box Love 💌"}</span>
              </button>
              <p className="bl-footer-note">Setelah dikirim, Admin Romantic Room akan memanggil Anda berdua untuk sesi perkenalan di Romantic Room.</p>
            </div>
          </div>
        </div>
      )}

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
        .container { max-width:1200px; margin:0 auto; padding:40px 20px; font-family:'Inter',sans-serif; color:#334155; }

        .page-header { text-align:center; margin-bottom:40px; display:flex; flex-direction:column; align-items:center; gap:8px; }
        .badge-top { display:inline-flex; align-items:center; gap:6px; background:#f1f5f9; color:#3b82f6; padding:6px 14px; border-radius:20px; font-size:11px; font-weight:800; letter-spacing:0.5px; }
        .page-header h1 { font-size:42px; font-weight:900; letter-spacing:-1px; margin:0; color:#1e293b; line-height:1.1; }
        .page-header h1 span { color:#3b82f6; }
        .welcome-msg { color:#64748b; font-size:16px; margin:0; }

        .toolbar { display:flex; flex-direction:column; gap:16px; background:white; padding:16px; border-radius:24px; box-shadow:0 4px 15px rgba(0,0,0,0.03); border:1px solid #f1f5f9; margin-bottom:24px; }
        .search-group { display:flex; gap:12px; }
        .search-bar { flex:1; position:relative; display:flex; align-items:center; gap:12px; background:#f8fafc; border:1px solid #e2e8f0; padding:12px 20px; border-radius:16px; }
        .search-bar input { border:none; background:transparent; outline:none; width:100%; font-size:14px; font-weight:500; }
        .search-icon { color:#94a3b8; }
        .clear-search-btn { background:#e2e8f0; border:none; border-radius:50%; width:20px; height:20px; display:flex; align-items:center; justify-content:center; cursor:pointer; color:#64748b; transition:0.2s; margin-left:4px; }
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

        .selection-banner { background:#232d3f; padding:24px 32px; border-radius:28px; display:flex; justify-content:space-between; align-items:center; color:white; margin-bottom:32px; box-shadow:0 15px 30px rgba(35,45,63,0.2); }
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

        .pagination { margin-top:48px; display:flex; align-items:center; justify-content:center; gap:24px; }
        .pagination button { background:white; border:1px solid #e2e8f0; padding:10px 20px; border-radius:12px; font-size:14px; font-weight:600; cursor:pointer; }
        .pagination button:disabled { opacity:0.5; cursor:not-allowed; }
        .page-numbers { display:flex; gap:8px; }
        .page-numbers button { width:40px; height:40px; padding:0; display:flex; align-items:center; justify-content:center; }
        .page-numbers button.active { background:#1e293b; color:white; border-color:#1e293b; }

        .skeleton-card { height:600px; background:#f1f5f9; border-radius:32px; animation:pulse 1.5s infinite; }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }

        /* ── Mobile responsive ─────────────────────────────────────────── */
        @media (max-width:768px) {
          .container { padding:20px 12px; }
          .page-header h1 { font-size:28px; }
          .toolbar { border-radius:16px; }
          .grid-container { grid-template-columns:1fr; }
          .btn-logout { margin-left:0; width:100%; justify-content:center; }
          .search-group { flex-direction:column; }
          .selection-banner { padding:16px 20px; flex-direction:column; gap:12px; align-items:flex-start; }
          .banner-value { font-size:15px; }
          .filter-controls { gap:8px; }
          .select-box { min-width:130px; font-size:12px; }
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

        /* SweetAlert2 z-index override */
        :global(.swal2-container) { z-index:10000 !important; }
      `}</style>
    </div>
  );
}
