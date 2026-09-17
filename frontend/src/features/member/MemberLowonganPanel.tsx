import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Briefcase,
  Plus,
  Search,
  Share2,
  Trash2,
  Flag,
  RotateCcw,
  EyeOff,
  Building,
  MapPin,
  Phone,
  X,
  Check,
  AlertCircle,
  Clock,
} from "lucide-react";
import { apiFetch } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import type { Lowongan } from "../../../../shared/schema";
import { getTodayJakartaStr, lowonganCreateSchema, type LowonganTipe } from "../../../../shared/validation";

interface LowonganItem extends Lowongan {
  isOwner?: boolean;
  isOwnHidden?: boolean;
}

const TIPE_OPTIONS: { value: LowonganTipe; label: string; pillClass: string }[] = [
  { value: "full_time", label: "Full Time", pillClass: "pill-primary" },
  { value: "part_time", label: "Part Time", pillClass: "pill-emerald" },
  { value: "freelance", label: "Freelance", pillClass: "pill-amber" },
  { value: "sampingan", label: "Kerja Sampingan", pillClass: "pill-slate" },
];

function getDaysRemaining(expiresAt: string): { text: string; isUrgent: boolean; isToday: boolean } {
  try {
    const expTime = Date.parse(expiresAt);
    if (isNaN(expTime)) return { text: "—", isUrgent: false, isToday: false };
    const diffMs = expTime - Date.now();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays <= 0) {
      return { text: "Berakhir hari ini", isUrgent: true, isToday: true };
    }
    if (diffDays <= 3) {
      return { text: `Sisa ${diffDays} hari`, isUrgent: true, isToday: false };
    }
    return { text: `Sisa ${diffDays} hari`, isUrgent: false, isToday: false };
  } catch {
    return { text: "—", isUrgent: false, isToday: false };
  }
}

export default function MemberLowonganPanel() {
  const { user } = useAuth();
  const isAdmin = ["admin_daerah", "admin_desa", "admin_kelompok"].includes(user?.role ?? "");

  const [items, setItems] = useState<LowonganItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Filter & Search
  const [selectedTipe, setSelectedTipe] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Modals & Feedback
  const [showPostModal, setShowPostModal] = useState(false);
  const [toastMsg, setToastMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [reportingId, setReportingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [takedownId, setTakedownId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Form State for Posting
  const defaultDateStr = useMemo(() => {
    const d = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000 + 7 * 60 * 60 * 1000);
    return d.toISOString().slice(0, 10);
  }, []);

  const minDateStr = useMemo(() => getTodayJakartaStr(), []);
  const maxDateStr = useMemo(() => {
    const d = new Date(Date.now() + 180 * 24 * 60 * 60 * 1000 + 7 * 60 * 60 * 1000);
    return d.toISOString().slice(0, 10);
  }, []);

  const [formData, setFormData] = useState({
    judul: "",
    pemberi: "",
    tipe: "part_time" as LowonganTipe,
    lokasi: "",
    kontak: "",
    expiresAt: defaultDateStr,
    deskripsi: "",
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const showToast = useCallback((text: string, type: "success" | "error" = "success") => {
    setToastMsg({ text, type });
    setTimeout(() => {
      setToastMsg((prev) => (prev?.text === text ? null : prev));
    }, 4000);
  }, []);

  // Fetch lowongan data
  const loadLowongan = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const queryParams = new URLSearchParams();
      if (isAdmin) {
        queryParams.set("includeHidden", "1");
      }
      queryParams.set("limit", "50");

      const res = await apiFetch<{ data: LowonganItem[] }>(`/api/lowongan?${queryParams.toString()}`);
      if (Array.isArray(res?.data)) {
        setItems(res.data);
      } else {
        setItems([]);
      }
    } catch (e: any) {
      setErrorMsg(e?.message || "Gagal memuat lowongan");
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    loadLowongan();
  }, [loadLowongan]);

  // Client-side filtering by selected category & search query
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (selectedTipe !== "all" && item.tipe !== selectedTipe) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const inJudul = item.judul.toLowerCase().includes(q);
        const inPemberi = item.pemberi.toLowerCase().includes(q);
        const inLokasi = item.lokasi.toLowerCase().includes(q);
        const inDeskripsi = item.deskripsi.toLowerCase().includes(q);
        if (!inJudul && !inPemberi && !inLokasi && !inDeskripsi) return false;
      }
      return true;
    });
  }, [items, selectedTipe, searchQuery]);

  // Active count (excluding hidden)
  const activeCount = useMemo(() => {
    return items.filter((i) => i.hidden === 0).length;
  }, [items]);

  // Share action
  const handleShare = async (item: LowonganItem) => {
    const tipeObj = TIPE_OPTIONS.find((t) => t.value === item.tipe);
    const tipeLabel = tipeObj ? tipeObj.label : item.tipe;
    const shareText = `💼 *${item.judul}* (${tipeLabel})\n🏢 ${item.pemberi}\n📍 ${item.lokasi}\n📞 Kontak: ${item.kontak}\n\n${item.deskripsi}\n\n_Dibagikan dari Komunitas Muda-Mudi Cengkareng_`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: item.judul,
          text: shareText,
        });
        showToast("Lowongan berhasil dibagikan!");
        return;
      } catch (err: any) {
        if (err?.name === "AbortError") return;
      }
    }

    try {
      await navigator.clipboard.writeText(shareText);
      setCopiedId(item.id);
      showToast("Teks lowongan disalin ke clipboard!");
      setTimeout(() => setCopiedId(null), 3000);
    } catch {
      showToast("Gagal menyalin teks", "error");
    }
  };

  // Submit Post Lowongan
  const handlePostSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors({});

    const parsed = lowonganCreateSchema.safeParse(formData);
    if (!parsed.success) {
      const errMap: Record<string, string> = {};
      parsed.error.issues.forEach((issue) => {
        const path = issue.path[0];
        if (path && typeof path === "string") {
          errMap[path] = issue.message;
        }
      });
      setFormErrors(errMap);
      return;
    }

    setSubmitting(true);
    try {
      const res = await apiFetch<{ success: boolean; data: LowonganItem }>("/api/lowongan", {
        method: "POST",
        body: JSON.stringify(formData),
      });

      if (res?.data) {
        setItems((prev) => [res.data, ...prev]);
        setShowPostModal(false);
        setFormData({
          judul: "",
          pemberi: "",
          tipe: "part_time",
          lokasi: "",
          kontak: "",
          expiresAt: defaultDateStr,
          deskripsi: "",
        });
        showToast("Lowongan berhasil diposting dan langsung tayang!");
      }
    } catch (err: any) {
      showToast(err?.message || "Gagal memposting lowongan", "error");
    } finally {
      setSubmitting(false);
    }
  };

  // Report action
  const handleConfirmReport = async () => {
    if (!reportingId) return;
    try {
      const res = await apiFetch<{ success: boolean; autoHidden: boolean }>("/api/lowongan/" + reportingId + "/report", {
        method: "POST",
      });
      if (res?.autoHidden) {
        if (!isAdmin) {
          setItems((prev) => prev.filter((i) => i.id !== reportingId));
        } else {
          loadLowongan();
        }
        showToast("Laporan diterima. Postingan telah disembunyikan otomatis.");
      } else {
        showToast("Laporan berhasil dikirim ke pengurus.");
      }
    } catch (err: any) {
      showToast(err?.message || "Gagal mengirim laporan", "error");
    } finally {
      setReportingId(null);
    }
  };

  // Delete action
  const handleConfirmDelete = async () => {
    if (!deletingId) return;
    try {
      await apiFetch(`/api/lowongan/${deletingId}`, {
        method: "DELETE",
      });
      setItems((prev) => prev.filter((i) => i.id !== deletingId));
      showToast("Lowongan berhasil dihapus.");
    } catch (err: any) {
      showToast(err?.message || "Gagal menghapus lowongan", "error");
    } finally {
      setDeletingId(null);
    }
  };

  // Takedown action (Admin only)
  const handleConfirmTakedown = async () => {
    if (!takedownId) return;
    try {
      await apiFetch(`/api/lowongan/${takedownId}/takedown`, {
        method: "POST",
      });
      setItems((prev) =>
        prev.map((i) => (i.id === takedownId ? { ...i, hidden: 1, hiddenReason: "admin" } : i))
      );
      showToast("Postingan berhasil diturunkan.");
    } catch (err: any) {
      showToast(err?.message || "Gagal menurunkan postingan", "error");
    } finally {
      setTakedownId(null);
    }
  };

  // Restore action (Admin only)
  const handleRestore = async (id: string) => {
    try {
      await apiFetch(`/api/lowongan/${id}/restore`, {
        method: "POST",
      });
      setItems((prev) =>
        prev.map((i) => (i.id === id ? { ...i, hidden: 0, hiddenReason: null, reportCount: 0 } : i))
      );
      showToast("Postingan berhasil dipulihkan.");
    } catch (err: any) {
      showToast(err?.message || "Gagal memulihkan postingan", "error");
    }
  };

  return (
    <div id="tour-member-lowongan" className="card" style={{ display: "grid", gap: 14 }}>
      {/* Toast alert */}
      {toastMsg && (
        <div
          style={{
            padding: "8px 12px",
            borderRadius: 8,
            fontSize: 12,
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: toastMsg.type === "success" ? "#ecfdf5" : "#fef2f2",
            color: toastMsg.type === "success" ? "#065f46" : "#991b1b",
            border: `1px solid ${toastMsg.type === "success" ? "#a7f3d0" : "#fecaca"}`,
          }}
        >
          {toastMsg.type === "success" ? <Check size={16} /> : <AlertCircle size={16} />}
          <span>{toastMsg.text}</span>
        </div>
      )}

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 11,
              background: "linear-gradient(135deg, #4f46e5, #06b6d4)",
              display: "grid",
              placeItems: "center",
              flexShrink: 0,
              boxShadow: "0 3px 12px rgba(79, 70, 229, 0.25)",
            }}
          >
            <Briefcase size={18} color="#fff" />
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 800, color: "var(--ink)", lineHeight: 1.15 }}>
              Pekerjaan & Opportunity
            </div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)" }}>
              {activeCount} lowongan aktif se-Daerah
            </div>
          </div>
        </div>

        <button
          type="button"
          className="btn btn-primary btn-sm"
          onClick={() => {
            setFormData({
              judul: "",
              pemberi: "",
              tipe: "part_time",
              lokasi: "",
              kontak: "",
              expiresAt: defaultDateStr,
              deskripsi: "",
            });
            setFormErrors({});
            setShowPostModal(true);
          }}
          style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 12px" }}
        >
          <Plus size={15} />
          <span>Posting</span>
        </button>
      </div>

      {/* Filter Chips & Search Bar */}
      <div style={{ display: "grid", gap: 8 }}>
        <div style={{ display: "flex", gap: 6, overflowX: "auto", scrollbarWidth: "none", paddingBottom: 2 }}>
          <button
            type="button"
            className={`chip ${selectedTipe === "all" ? "active" : ""}`}
            onClick={() => setSelectedTipe("all")}
          >
            Semua
          </button>
          {TIPE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={`chip ${selectedTipe === opt.value ? "active" : ""}`}
              onClick={() => setSelectedTipe(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Search input */}
        <div style={{ position: "relative", width: "100%" }}>
          <Search
            size={15}
            color="var(--muted)"
            style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)" }}
          />
          <input
            type="text"
            placeholder="Cari judul, usaha, lokasi..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: "100%",
              padding: "7px 10px 7px 32px",
              fontSize: 12,
              borderRadius: 999,
              border: "1px solid var(--line)",
              background: "#f8fafc",
              color: "var(--ink)",
              outline: "none",
            }}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              style={{
                position: "absolute",
                right: 8,
                top: "50%",
                transform: "translateY(-50%)",
                background: "transparent",
                border: "none",
                cursor: "pointer",
                padding: 2,
              }}
            >
              <X size={14} color="var(--muted)" />
            </button>
          )}
        </div>
      </div>

      {/* List Container */}
      <div style={{ display: "grid", gap: 10 }}>
        {loading && (
          <div style={{ textAlign: "center", padding: "24px 0", color: "var(--muted)", fontSize: 12 }}>
            Memuat daftar lowongan...
          </div>
        )}

        {errorMsg && !loading && (
          <div style={{ textAlign: "center", padding: "16px 0", color: "#ef4444", fontSize: 12 }}>
            <p>{errorMsg}</p>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={loadLowongan}
              style={{ marginTop: 6 }}
            >
              Coba Lagi
            </button>
          </div>
        )}

        {!loading && !errorMsg && filteredItems.length === 0 && (
          <div className="lp-empty-card" style={{ padding: "24px 16px", textAlign: "center" }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: "#f1f5f9", display: "grid", placeItems: "center", margin: "0 auto 8px" }}>
              <Briefcase size={22} color="#94a3b8" />
            </div>
            <div style={{ fontSize: 13, fontWeight: 800, color: "var(--ink)" }}>Belum ada lowongan</div>
            <div style={{ fontSize: 11, color: "var(--muted)", maxWidth: 280, margin: "2px auto 12px" }}>
              Punya info pekerjaan atau kerja sampingan untuk sesama anggota? Bagikan di sini!
            </div>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => setShowPostModal(true)}
              style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
            >
              <Plus size={14} />
              <span>Posting Lowongan</span>
            </button>
          </div>
        )}

        {!loading &&
          !errorMsg &&
          filteredItems.map((item) => {
            const tipeObj = TIPE_OPTIONS.find((t) => t.value === item.tipe);
            const remaining = getDaysRemaining(item.expiresAt);
            const isHidden = item.hidden === 1;

            return (
              <div
                key={item.id}
                style={{
                  padding: "12px 14px",
                  borderRadius: 12,
                  border: isHidden ? "1px dashed #f87171" : "1px solid var(--line)",
                  background: isHidden ? "#fef2f2" : "#fff",
                  opacity: isHidden ? 0.75 : 1,
                  display: "grid",
                  gap: 8,
                }}
              >
                {/* Header row of card */}
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: "var(--ink)", lineHeight: 1.3 }}>
                      {item.judul}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--muted)", marginTop: 2, flexWrap: "wrap" }}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
                        <Building size={12} /> {item.pemberi}
                      </span>
                      <span>•</span>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
                        <MapPin size={12} /> {item.lokasi}
                      </span>
                    </div>
                  </div>

                  {/* Pills */}
                  <div style={{ display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap" }}>
                    <span className={`pill ${tipeObj?.pillClass || "pill-slate"}`} style={{ fontSize: 10 }}>
                      {tipeObj?.label || item.tipe}
                    </span>
                    {isHidden && isAdmin && (
                      <span className="pill pill-red" style={{ fontSize: 10 }}>
                        {item.hiddenReason === "auto_report"
                          ? `Disembunyikan otomatis · ${item.reportCount ?? 0} laporan`
                          : "Diturunkan pengurus"}
                      </span>
                    )}
                    {isHidden && !isAdmin && item.isOwnHidden && (
                      <span className="pill pill-amber" style={{ fontSize: 10 }}>
                        Tersembunyi
                      </span>
                    )}
                  </div>
                </div>

                {/* Deskripsi */}
                <div
                  style={{
                    fontSize: 12,
                    color: "var(--ink)",
                    lineHeight: 1.5,
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                  }}
                >
                  {item.deskripsi}
                </div>

                {/* Kontak & Expiry info */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap", fontSize: 11, borderTop: "1px solid var(--line)", paddingTop: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 4, color: "var(--primary)", fontWeight: 700 }}>
                    <Phone size={12} />
                    <span>{item.kontak}</span>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 4, color: remaining.isUrgent ? "#dc2626" : "var(--muted)", fontWeight: remaining.isUrgent ? 800 : 600 }}>
                    <Clock size={12} />
                    <span>{remaining.text}</span>
                  </div>
                </div>

                {/* Actions Footer */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 6, paddingTop: 2 }}>
                  {/* Share button */}
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => handleShare(item)}
                    style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, padding: "4px 8px" }}
                  >
                    {copiedId === item.id ? <Check size={13} color="#059669" /> : <Share2 size={13} />}
                    <span>{copiedId === item.id ? "Tersalin" : "Bagikan"}</span>
                  </button>

                  {/* Laporkan button (for non-owner) */}
                  {!item.isOwner && (
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => setReportingId(item.id)}
                      style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, padding: "4px 8px", color: "#64748b" }}
                    >
                      <Flag size={13} />
                      <span>Laporkan</span>
                    </button>
                  )}

                  {/* Admin actions: Takedown / Restore */}
                  {isAdmin && (
                    <>
                      {isHidden ? (
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => handleRestore(item.id)}
                          style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, padding: "4px 8px", color: "#059669" }}
                        >
                          <RotateCcw size={13} />
                          <span>Pulihkan</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => setTakedownId(item.id)}
                          style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, padding: "4px 8px", color: "#ea580c" }}
                        >
                          <EyeOff size={13} />
                          <span>Turunkan</span>
                        </button>
                      )}
                    </>
                  )}

                  {/* Hapus button (for owner or admin) */}
                  {(item.isOwner || isAdmin) && (
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => setDeletingId(item.id)}
                      style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, padding: "4px 8px", color: "#ef4444" }}
                    >
                      <Trash2 size={13} />
                      <span>Hapus</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
      </div>

      {/* ── MODAL: Posting Lowongan ── */}
      {showPostModal && (
        <div
          className="modal-backdrop"
          onClick={() => !submitting && setShowPostModal(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            display: "grid",
            placeItems: "center",
            zIndex: 1000,
            padding: 16,
            backdropFilter: "blur(4px)",
          }}
        >
          <div
            className="modal"
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#fff",
              borderRadius: 16,
              maxWidth: 480,
              width: "100%",
              maxHeight: "90vh",
              overflowY: "auto",
              padding: "20px",
              display: "grid",
              gap: 14,
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: "#eef2ff", display: "grid", placeItems: "center" }}>
                  <Briefcase size={16} color="#4f46e5" />
                </div>
                <h3 style={{ fontSize: 15, fontWeight: 800, margin: 0, color: "var(--ink)" }}>Posting Info Lowongan</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowPostModal(false)}
                disabled={submitting}
                style={{ background: "transparent", border: "none", cursor: "pointer", padding: 4 }}
              >
                <X size={18} color="var(--muted)" />
              </button>
            </div>

            <form onSubmit={handlePostSubmit} style={{ display: "grid", gap: 12 }}>
              {/* Judul */}
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 4, color: "var(--ink)" }}>
                  Judul Pekerjaan / Opportunity *
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Barista Kafe Sore, Desain Flyer Freelance"
                  value={formData.judul}
                  onChange={(e) => setFormData({ ...formData, judul: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "8px 10px",
                    borderRadius: 8,
                    border: `1px solid ${formErrors.judul ? "#ef4444" : "var(--line)"}`,
                    fontSize: 13,
                    outline: "none",
                  }}
                />
                {formErrors.judul && <div style={{ fontSize: 11, color: "#ef4444", marginTop: 2 }}>{formErrors.judul}</div>}
              </div>

              {/* Pemberi & Tipe */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 4, color: "var(--ink)" }}>
                    Pemberi Kerja / Usaha *
                  </label>
                  <input
                    type="text"
                    placeholder="Nama Toko / Usaha"
                    value={formData.pemberi}
                    onChange={(e) => setFormData({ ...formData, pemberi: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "8px 10px",
                      borderRadius: 8,
                      border: `1px solid ${formErrors.pemberi ? "#ef4444" : "var(--line)"}`,
                      fontSize: 13,
                      outline: "none",
                    }}
                  />
                  {formErrors.pemberi && <div style={{ fontSize: 11, color: "#ef4444", marginTop: 2 }}>{formErrors.pemberi}</div>}
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 4, color: "var(--ink)" }}>
                    Tipe Pekerjaan *
                  </label>
                  <select
                    value={formData.tipe}
                    onChange={(e) => setFormData({ ...formData, tipe: e.target.value as LowonganTipe })}
                    style={{
                      width: "100%",
                      padding: "8px 10px",
                      borderRadius: 8,
                      border: `1px solid ${formErrors.tipe ? "#ef4444" : "var(--line)"}`,
                      fontSize: 13,
                      background: "#fff",
                      outline: "none",
                    }}
                  >
                    {TIPE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  {formErrors.tipe && <div style={{ fontSize: 11, color: "#ef4444", marginTop: 2 }}>{formErrors.tipe}</div>}
                </div>
              </div>

              {/* Lokasi & Kontak */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 4, color: "var(--ink)" }}>
                    Lokasi / Domisili *
                  </label>
                  <input
                    type="text"
                    placeholder="Cengkareng Barat / Remote"
                    value={formData.lokasi}
                    onChange={(e) => setFormData({ ...formData, lokasi: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "8px 10px",
                      borderRadius: 8,
                      border: `1px solid ${formErrors.lokasi ? "#ef4444" : "var(--line)"}`,
                      fontSize: 13,
                      outline: "none",
                    }}
                  />
                  {formErrors.lokasi && <div style={{ fontSize: 11, color: "#ef4444", marginTop: 2 }}>{formErrors.lokasi}</div>}
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 4, color: "var(--ink)" }}>
                    Kontak WA / HP *
                  </label>
                  <input
                    type="text"
                    placeholder="08123456789"
                    value={formData.kontak}
                    onChange={(e) => setFormData({ ...formData, kontak: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "8px 10px",
                      borderRadius: 8,
                      border: `1px solid ${formErrors.kontak ? "#ef4444" : "var(--line)"}`,
                      fontSize: 13,
                      outline: "none",
                    }}
                  />
                  {formErrors.kontak && <div style={{ fontSize: 11, color: "#ef4444", marginTop: 2 }}>{formErrors.kontak}</div>}
                </div>
              </div>

              {/* Batas Kedaluwarsa */}
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 4, color: "var(--ink)" }}>
                  Tanggal Berakhir Lowongan *
                </label>
                <div style={{ position: "relative" }}>
                  <input
                    type="date"
                    min={minDateStr}
                    max={maxDateStr}
                    value={formData.expiresAt}
                    onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "8px 10px",
                      borderRadius: 8,
                      border: `1px solid ${formErrors.expiresAt ? "#ef4444" : "var(--line)"}`,
                      fontSize: 13,
                      outline: "none",
                      background: "#fff",
                    }}
                  />
                </div>
                <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 2 }}>
                  Otomatis disembunyikan setelah tanggal ini (maks 180 hari ke depan).
                </div>
                {formErrors.expiresAt && <div style={{ fontSize: 11, color: "#ef4444", marginTop: 2 }}>{formErrors.expiresAt}</div>}
              </div>

              {/* Deskripsi */}
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 4, color: "var(--ink)" }}>
                  Deskripsi & Kualifikasi *
                </label>
                <textarea
                  rows={4}
                  placeholder="Jelaskan detail pekerjaan, jam kerja, kisaran gaji/upah, syarat, dan cara melamar..."
                  value={formData.deskripsi}
                  onChange={(e) => setFormData({ ...formData, deskripsi: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "8px 10px",
                    borderRadius: 8,
                    border: `1px solid ${formErrors.deskripsi ? "#ef4444" : "var(--line)"}`,
                    fontSize: 13,
                    outline: "none",
                    resize: "vertical",
                  }}
                />
                {formErrors.deskripsi && <div style={{ fontSize: 11, color: "#ef4444", marginTop: 2 }}>{formErrors.deskripsi}</div>}
              </div>

              {/* Actions */}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 4 }}>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setShowPostModal(false)}
                  disabled={submitting}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submitting}
                  style={{ minWidth: 100 }}
                >
                  {submitting ? "Memposting..." : "Posting Sekarang"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: Konfirmasi Lapor ── */}
      {reportingId && (
        <div
          className="modal-backdrop"
          onClick={() => setReportingId(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            display: "grid",
            placeItems: "center",
            zIndex: 1000,
            padding: 16,
          }}
        >
          <div
            className="modal"
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#fff",
              borderRadius: 14,
              maxWidth: 380,
              width: "100%",
              padding: 20,
              display: "grid",
              gap: 12,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#ea580c" }}>
              <Flag size={20} />
              <h4 style={{ margin: 0, fontSize: 14, fontWeight: 800 }}>Laporkan Postingan Ini?</h4>
            </div>
            <p style={{ margin: 0, fontSize: 12, color: "var(--ink)", lineHeight: 1.4 }}>
              Apakah Anda yakin postingan ini tidak sesuai, melanggar etika, atau terindikasi penipuan? Postingan yang menerima 3 laporan akan disembunyikan otomatis.
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 6 }}>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setReportingId(null)}>
                Batal
              </button>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={handleConfirmReport}
                style={{ background: "#ea580c", borderColor: "#ea580c" }}
              >
                Kirim Laporan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: Konfirmasi Hapus ── */}
      {deletingId && (
        <div
          className="modal-backdrop"
          onClick={() => setDeletingId(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            display: "grid",
            placeItems: "center",
            zIndex: 1000,
            padding: 16,
          }}
        >
          <div
            className="modal"
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#fff",
              borderRadius: 14,
              maxWidth: 380,
              width: "100%",
              padding: 20,
              display: "grid",
              gap: 12,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#ef4444" }}>
              <Trash2 size={20} />
              <h4 style={{ margin: 0, fontSize: 14, fontWeight: 800 }}>Hapus Lowongan Ini?</h4>
            </div>
            <p style={{ margin: 0, fontSize: 12, color: "var(--ink)", lineHeight: 1.4 }}>
              Postingan yang dihapus tidak dapat dipulihkan kembali. Lanjutkan?
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 6 }}>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setDeletingId(null)}>
                Batal
              </button>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={handleConfirmDelete}
                style={{ background: "#ef4444", borderColor: "#ef4444" }}
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: Konfirmasi Turunkan (Admin) ── */}
      {takedownId && (
        <div
          className="modal-backdrop"
          onClick={() => setTakedownId(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            display: "grid",
            placeItems: "center",
            zIndex: 1000,
            padding: 16,
          }}
        >
          <div
            className="modal"
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#fff",
              borderRadius: 14,
              maxWidth: 380,
              width: "100%",
              padding: 20,
              display: "grid",
              gap: 12,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#ea580c" }}>
              <EyeOff size={20} />
              <h4 style={{ margin: 0, fontSize: 14, fontWeight: 800 }}>Turunkan Postingan?</h4>
            </div>
            <p style={{ margin: 0, fontSize: 12, color: "var(--ink)", lineHeight: 1.4 }}>
              Sebagai pengurus, Anda akan menyembunyikan postingan ini dari anggota biasa. Anda dapat memulihkannya sewaktu-waktu.
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 6 }}>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setTakedownId(null)}>
                Batal
              </button>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={handleConfirmTakedown}
                style={{ background: "#ea580c", borderColor: "#ea580c" }}
              >
                Turunkan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
