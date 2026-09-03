import { useEffect, useState } from "react";
import { ArrowLeft, CalendarDays, ExternalLink, Pencil as IcoEdit, Plus, Save, Share2, Trash2 as IcoTrash, User2 } from "lucide-react";
import { apiFetch } from "../../lib/api";
import SearchInput from "../../components/admin/SearchInput";
import ImageUploadInput from "../../components/admin/ImageUploadInput";
import RichTextEditor from "../../components/admin/RichTextEditor";
import DeleteConfirmModal from "../../components/DeleteConfirmModal";
import CategoryInput from "../../components/CategoryInput";
import { labelKategori } from "../../lib/labelKategori";
import SplitPreviewLayout from "./SplitPreviewLayout";

type Row = {
  id: string;
  slug?: string | null;
  judul: string;
  ringkasan?: string | null;
  konten?: string | null;
  coverImage?: string | null;
  status: string;
  tipe: string;
  kategori?: string;
  authorName?: string;
  authorId?: string;
  publishedAt?: string | null;
  createdAt?: string;
};

type AdminRole = "admin_daerah" | "admin_desa" | "admin_kelompok";

export default function ArtikelTab({ tipe = "artikel", role, userId }: { tipe?: "artikel" | "berita"; role: AdminRole; userId?: string }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [q, setQ] = useState("");
  const [viewMode, setViewMode] = useState<"list" | "editor">("list");
  const [editing, setEditing] = useState<Row | null>(null);

  const load = () => {
    const qs = q ? `?q=${encodeURIComponent(q)}` : "";
    const url = tipe === "berita" ? `/api/berita${qs}` : `/api/artikel${qs}`;
    apiFetch<unknown>(url)
      .then((j) => {
        const list = Array.isArray(j) ? j : (j as any).data || [];
        const filtered = q ? list.filter((x: any) => `${x.judul} ${x.ringkasan || ""}`.toLowerCase().includes(q.toLowerCase())) : list;
        setRows(filtered);
      })
      .catch(() => {});
  };

  const [deleteTarget, setDeleteTarget] = useState<Row | null>(null);

  useEffect(() => {
    if (viewMode === "list") load();
  }, [q, viewMode, tipe]);

  const handleDelete = (r: Row) => {
    setDeleteTarget(r);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const id = deleteTarget.id;
    setRows((p) => p.filter((x) => x.id !== id));
    const url = tipe === "berita" ? `/api/berita/${id}` : `/api/artikel/${id}`;
    await apiFetch(url, { method: "DELETE" });
  };

  const openCreate = () => {
    setEditing(null);
    setViewMode("editor");
  };

  const openEdit = (r: Row) => {
    // Fetch detail if needed
    const url = tipe === "berita" ? `/api/berita/${r.id}` : `/api/artikel/${r.id}`;
    apiFetch<Row>(url)
      .then((detail) => {
        setEditing(detail);
        setViewMode("editor");
      })
      .catch(() => {
        setEditing(r);
        setViewMode("editor");
      });
  };

  const existingCategories = Array.from(
    new Set([
      "Tuntunan Ibadah",
      "Info Kesehatan",
      "Tafsir",
      "Kisah",
      "Berita",
      ...rows.map((r) => r.kategori).filter(Boolean),
    ])
  );

  const canEditItem = (r: Row) => role === "admin_daerah" || r.authorId === userId;

  if (viewMode === "editor") {
    return (
      <ArtikelEditorPage
        tipe={tipe}
        initial={editing}
        existingCategories={existingCategories as string[]}
        role={role}
        onBack={() => setViewMode("list")}
        onSaveSuccess={() => {
          setViewMode("list");
          load();
        }}
      />
    );
  }

  return (
    <div>
      <div className="admin-toolbar">
        <SearchInput value={q} onChange={setQ} placeholder={`Cari ${tipe}...`} />
        <button type="button" className="btn btn-primary btn-sm btn-auto" onClick={openCreate}>
          <Plus size={16} /> Buat {tipe === "berita" ? "Berita" : "Artikel"}
        </button>
        <span className="pill pill-slate">{rows.length}</span>
      </div>

      <p className="muted" style={{ marginBottom: 14 }}>
        Kelola {tipe === "berita" ? "Berita" : "Artikel"} publik &mdash; otomatis tampil di halaman <code>/{tipe}</code>. Klik buat untuk masuk ke halaman editor &amp; live preview.
      </p>

      <div style={{ display: "grid", gap: 10 }}>
        {rows.length === 0 && (
          <div className="lp-empty-card">
            Belum ada {tipe}. Klik tombol <strong>+ Buat {tipe === "berita" ? "Berita" : "Artikel"}</strong> untuk mulai menulis.
          </div>
        )}
        {rows.map((r) => (
          <div key={r.id} className="cms-row">
            {r.coverImage && (
              <img
                src={r.coverImage}
                alt={r.judul}
                className="cms-row-thumb"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            )}
            <div className="cms-row-main">
              <div className="cms-row-title">{r.judul}</div>
              <div className="cms-row-meta">
                {r.ringkasan || "— tanpa ringkasan"} &bull;{" "}
                <span className={`pill ${r.status === "published" ? "pill-emerald" : "pill-amber"}`} style={{ fontSize: 10, padding: "2px 6px" }}>
                  {r.status}
                </span>{" "}
                &bull; {labelKategori(r.kategori) || r.tipe}
              </div>
            </div>
            <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
              <a href={`/${tipe}/${r.slug || r.id}`} target="_blank" rel="noopener noreferrer" className="btn btn-ghost row-icon-btn" title="Preview" aria-label="Preview">
                <ExternalLink size={16} />
              </a>
              {canEditItem(r) && (
              <>
              <button type="button" className="btn btn-ghost row-icon-btn" aria-label="Edit" title="Edit" onClick={() => openEdit(r)}>
                <IcoEdit size={16} />
              </button>
              <button type="button" className="btn btn-danger row-icon-btn" aria-label="Hapus" title="Hapus" onClick={() => handleDelete(r)}>
                <IcoTrash size={16} />
              </button>
              </>
              )}
            </div>
          </div>
        ))}
      </div>

      {deleteTarget && (
        <DeleteConfirmModal
          itemName={deleteTarget.judul}
          description={`${tipe === "berita" ? "Berita" : "Artikel"} "${deleteTarget.judul}" akan dihapus permanen.`}
          onClose={() => setDeleteTarget(null)}
          onConfirm={confirmDelete}
        />
      )}
    </div>
  );
}

function ArtikelEditorPage({
  tipe,
  initial,
  existingCategories = [],
  role,
  onBack,
  onSaveSuccess,
}: {
  tipe: string;
  initial: Row | null;
  existingCategories?: string[];
  role: AdminRole;
  onBack: () => void;
  onSaveSuccess: (saved: any) => void;
}) {
  const [f, setF] = useState({
    judul: initial?.judul ?? "",
    ringkasan: initial?.ringkasan ?? "",
    konten: initial?.konten ?? "",
    coverImage: initial?.coverImage ?? "",
    kategori: initial?.kategori ?? (tipe === "berita" ? "Berita" : "Tuntunan Ibadah"),
    status: initial?.status ?? "published",
  });
  const [saving, setSaving] = useState(false);

  const valid = f.judul.trim().length >= 2;

  const handleSave = async () => {
    if (!valid) return;
    setSaving(true);
    try {
      const isEdit = !!initial?.id;
      const base = tipe === "berita" ? "/api/berita" : "/api/artikel";
      const url = isEdit ? `${base}/${initial.id}` : base;
      const method = isEdit ? "PUT" : "POST";
      const data = await apiFetch(url, {
        method,
        body: JSON.stringify({
          id: initial?.id,
          judul: f.judul.trim(),
          ringkasan: f.ringkasan || null,
          konten: f.konten || f.ringkasan || f.judul,
          coverImage: f.coverImage || null,
          kategori: f.kategori,
          status: f.status,
        }),
      });
      onSaveSuccess(data);
    } catch (e: any) {
      alert(e.message || "Gagal menyimpan");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="cms-tentang-container">
      {/* Top Header */}
      <div className="cms-tentang-header">
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onBack} aria-label="Kembali">
            <ArrowLeft size={16} /> Kembali
          </button>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 800, margin: 0 }}>
              {initial ? `Edit ${tipe === "berita" ? "Berita" : "Artikel"}` : `Buat ${tipe === "berita" ? "Berita" : "Artikel"} Baru`}
            </h2>
            <span className="muted" style={{ fontSize: 11 }}>Halaman editor lengkap &amp; Live Preview artikel publik</span>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button type="button" className="btn btn-primary btn-sm" disabled={!valid || saving} onClick={handleSave}>
            <Save size={14} /> {saving ? "Menyimpan..." : "Simpan & Publikasikan"}
          </button>
        </div>
      </div>

      <SplitPreviewLayout
        storageKey={`preview_${tipe}`}
        defaultSplit={50}
        form={
          <div className="cms-section-card" style={{ padding: 18, display: "grid", gap: 14 }}>
            <div className="field">
              <label>Judul {tipe === "berita" ? "Berita" : "Artikel"} *</label>
              <input
                value={f.judul}
                onChange={(e) => setF({ ...f, judul: e.target.value })}
                placeholder={`Judul ${tipe} yang menarik...`}
                style={{ fontSize: 15, fontWeight: 700 }}
              />
            </div>

            <div className="form-grid-2">
              <div className="field">
                <label>Kategori</label>
                <CategoryInput
                  value={f.kategori}
                  onChange={(v) => setF({ ...f, kategori: v })}
                  existingCategories={existingCategories}
                  placeholder="Ketik atau pilih kategori..."
                />
              </div>

              <div className="field">
                <label>Status</label>
                <select
                  value={f.status}
                  onChange={(e) => setF({ ...f, status: e.target.value })}
                  className="filter-input"
                >
                  {role === "admin_daerah" && <option value="published">Published (Tayang)</option>}
                  <option value="pending">Pending / Draft</option>
                </select>
              </div>
            </div>

            <ImageUploadInput
              label="Cover Image Artikel"
              value={f.coverImage || ""}
              onChange={(val) => setF({ ...f, coverImage: val })}
              placeholder="Pilih file foto atau tempel URL gambar..."
            />

            <div className="field">
              <label>Ringkasan Singkat (Excerpt)</label>
              <textarea
                rows={2}
                value={f.ringkasan}
                onChange={(e) => setF({ ...f, ringkasan: e.target.value })}
                placeholder="Deskripsi ringkas 1-2 kalimat untuk kartu depan..."
                maxLength={300}
              />
            </div>

            <div className="field">
              <label>Konten Lengkap Artikel (Rich Text Editor)</label>
              <RichTextEditor
                value={f.konten || ""}
                onChange={(html) => setF({ ...f, konten: html })}
                placeholder="Tulis artikel lengkap di sini... Gunakan toolbar untuk formatting tebal, miring, heading, quote, list, dll."
                minHeight={260}
              />
            </div>
          </div>
        }
        preview={
          <div className="pub-section pub-detail">
            <div style={{ fontSize: 13, fontWeight: 700, display: "inline-flex", gap: 6, alignItems: "center", width: "fit-content", color: "var(--pub-ink)" }}>
              <ArrowLeft size={14} /> Semua {tipe}
            </div>

            <div className="pub-detail-hero" style={{ marginTop: 12 }}>
              {f.coverImage ? (
                <img src={f.coverImage} alt={f.judul || "Cover"} style={{ width: "100%", maxHeight: 280, objectFit: "cover", borderRadius: 16 }} />
              ) : (
                <div style={{ height: 180, background: "var(--pub-paper-2)", borderRadius: 16, border: "1px dashed var(--pub-line)", display: "grid", placeItems: "center", color: "var(--pub-muted)" }}>
                  Tanpa Cover Image
                </div>
              )}
            </div>

            <div className="pub-detail-meta" style={{ marginTop: 12 }}>
              <span>
                <CalendarDays size={12} /> {new Date().toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
              </span>
              <span>
                <User2 size={12} /> Tim Gencar
              </span>
              <span className="pill pill-slate">{labelKategori(f.kategori) || (tipe === "berita" ? "Berita" : "Artikel")}</span>
            </div>

            <h1 className="pub-detail-title" style={{ fontSize: 24, marginTop: 8 }}>
              {f.judul || "Judul Artikel Akan Muncul Di Sini"}
            </h1>

            {f.ringkasan && <p className="pub-detail-excerpt">{f.ringkasan}</p>}

            <div className="pub-prose" style={{ marginTop: 16 }}>
              {f.konten ? (
                <div dangerouslySetInnerHTML={{ __html: f.konten }} />
              ) : (
                <p style={{ color: "var(--pub-muted)", fontStyle: "italic" }}>
                  Konten lengkap artikel belum diisi...
                </p>
              )}
            </div>

            <div className="pub-detail-actions" style={{ marginTop: 24 }}>
              <span className="btn-lime" style={{ pointerEvents: "none" }}>
                <Share2 size={14} /> Share ke WhatsApp
              </span>
            </div>
          </div>
        }
      />
    </div>
  );
}
