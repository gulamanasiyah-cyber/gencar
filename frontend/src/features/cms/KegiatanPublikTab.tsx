import { useEffect, useState } from "react";
import { ArrowLeft, CalendarDays, Eye, MapPin, Pencil as IcoEdit, Plus, Save, Share2, Timer, Trash2 as IcoTrash } from "lucide-react";
import { apiFetch } from "../../lib/api";
import SearchInput from "../../components/admin/SearchInput";
import ImageUploadInput from "../../components/admin/ImageUploadInput";
import RichTextEditor from "../../components/admin/RichTextEditor";
import SplitPreviewLayout from "./SplitPreviewLayout";

type Row = {
  id: string;
  slug: string;
  judul: string;
  excerpt?: string | null;
  konten?: string | null;
  coverImage?: string | null;
  kategori?: string | null;
  kategoriAcara?: string;
  kategoriCustom?: string | null;
  tanggal: string;
  jam?: string | null;
  lokasi?: string | null;
  status: string;
  authorId?: string;
};

type AdminRole = "admin_daerah" | "admin_desa" | "admin_kelompok";

export default function KegiatanPublikTab({ role, userId }: { role: AdminRole; userId?: string }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [q, setQ] = useState("");
  const [viewMode, setViewMode] = useState<"list" | "editor">("list");
  const [editing, setEditing] = useState<Row | null>(null);

  const load = () => {
    apiFetch<unknown>(`/api/cms/kegiatan-publik?q=${encodeURIComponent(q)}`)
      .then((j: any) => setRows(j.data || j || []))
      .catch(() => {});
  };

  useEffect(() => {
    if (viewMode === "list") load();
  }, [q, viewMode]);

  const handleDelete = (id: string) => {
    if (!confirm("Hapus kegiatan publik ini?")) return;
    setRows((p) => p.filter((x) => x.id !== id));
    void apiFetch(`/api/cms/kegiatan-publik/${id}`, { method: "DELETE" }).catch(() => {});
  };

  const existingCategories = Array.from(
    new Set([
      "Sambung Rutin",
      "Keakraban",
      "Pemantapan",
      "Lainnya",
      ...rows.map((r) => r.kategori || r.kategoriAcara).filter(Boolean),
    ])
  );

  const canEditItem = (r: Row) => role === "admin_daerah" || r.authorId === userId;

  if (viewMode === "editor") {
    return (
      <KegiatanPublikEditorPage
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
        <SearchInput value={q} onChange={setQ} placeholder="Cari judul publik..." />
        <button
          type="button"
          className="btn btn-primary btn-sm btn-auto"
          onClick={() => {
            setEditing(null);
            setViewMode("editor");
          }}
        >
          <Plus size={16} /> Buat Kegiatan Publik
        </button>
        <span className="pill pill-slate">{rows.length}</span>
      </div>

      <p className="muted" style={{ marginBottom: 14 }}>
        Kegiatan publik = etalase web (berbeda dengan Kegiatan internal absensi/GPS). Tampil di <code>/kegiatan</code>. Klik buat untuk masuk ke halaman editor &amp; live preview.
      </p>

      <div className="cms-card-grid">
        {rows.length === 0 && (
          <div className="lp-empty-card" style={{ gridColumn: "1/-1" }}>
            Belum ada kegiatan publik. Klik <strong>+ Buat Kegiatan Publik</strong> untuk mulai membuat.
          </div>
        )}
        {rows.map((r) => (
          <div key={r.id} className="card" style={{ padding: 14, display: "grid", gap: 8 }}>
            {r.coverImage && (
              <img
                src={r.coverImage}
                alt={r.judul}
                style={{ width: "100%", height: 120, objectFit: "cover", borderRadius: 10, border: "1px solid var(--line)" }}
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            )}
            <strong style={{ fontSize: 13, lineHeight: 1.3 }}>{r.judul}</strong>
            <span className="muted" style={{ fontSize: 11 }}>
              {r.slug} &bull; {r.kategoriAcara} &bull; {r.tanggal} {r.jam || ""}
            </span>
            <span
              className={`pill ${r.status === "published" ? "pill-emerald" : r.status === "pending_review" ? "pill-amber" : "pill-slate"}`}
              style={{ width: "fit-content", fontSize: 10, padding: "2px 8px" }}
            >
              {r.status}
            </span>
            <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
              {canEditItem(r) && (
              <>
              <button
                type="button"
                className="btn btn-ghost row-icon-btn"
                aria-label="Edit"
                title="Edit"
                onClick={() => {
                  setEditing(r);
                  setViewMode("editor");
                }}
              >
                <IcoEdit size={16} />
              </button>
              <button type="button" className="btn btn-danger row-icon-btn" aria-label="Hapus" title="Hapus" onClick={() => handleDelete(r.id)}>
                <IcoTrash size={16} />
              </button>
              </>
              )}
              <a
                href={`/kegiatan/${r.slug}`}
                target="_blank"
                rel="noreferrer"
                className="btn btn-ghost row-icon-btn"
                aria-label="Preview web publik"
                title="Preview web publik"
              >
                <Eye size={16} />
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function KegiatanPublikEditorPage({
  initial,
  existingCategories = [],
  role,
  onBack,
  onSaveSuccess,
}: {
  initial: Row | null;
  existingCategories?: string[];
  role: AdminRole;
  onBack: () => void;
  onSaveSuccess: (saved: any) => void;
}) {
  const [f, setF] = useState(() => ({
    judul: initial?.judul ?? "",
    slug: initial?.slug ?? "",
    excerpt: initial?.excerpt ?? "",
    konten: initial?.konten ?? "",
    coverImage: initial?.coverImage ?? "",
    kategori: initial?.kategoriAcara ?? "Sambung Rutin",
    kategoriAcara: initial?.kategoriAcara ?? "sambung_rutin",
    tanggal: initial?.tanggal ?? new Date().toISOString().slice(0, 10),
    jam: initial?.jam ?? "19:30",
    lokasi: initial?.lokasi ?? "Musala Al-Falah",
    status: initial?.status ?? "published",
  }));
  const [saving, setSaving] = useState(false);

  const valid = f.judul.trim().length >= 2 && f.tanggal;

  const handleSave = async () => {
    if (!valid) return;
    setSaving(true);
    try {
      const isEdit = !!initial?.id;
      const url = isEdit ? `/api/cms/kegiatan-publik/${initial.id}` : "/api/cms/kegiatan-publik";
      const method = isEdit ? "PUT" : "POST";
      const data = await apiFetch(url, {
        method,
        body: JSON.stringify({
          id: initial?.id,
          slug: f.slug || undefined,
          judul: f.judul.trim(),
          excerpt: f.excerpt || null,
          konten: f.konten || null,
          coverImage: f.coverImage || null,
          kategori: f.kategori,
          kategoriAcara: f.kategori.toLowerCase().replace(/\s+/g, "_"),
          tanggal: f.tanggal,
          jam: f.jam || null,
          lokasi: f.lokasi || null,
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
              {initial ? "Edit Kegiatan Publik" : "Buat Kegiatan Publik Baru"}
            </h2>
            <span className="muted" style={{ fontSize: 11 }}>Halaman editor lengkap &amp; Live Preview detail kegiatan</span>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button type="button" className="btn btn-primary btn-sm" disabled={!valid || saving} onClick={handleSave}>
            <Save size={14} /> {saving ? "Menyimpan..." : "Simpan & Publikasikan"}
          </button>
        </div>
      </div>

      <SplitPreviewLayout
        storageKey="preview_kegiatan"
        defaultSplit={50}
        form={
          <div className="cms-section-card" style={{ padding: 18, display: "grid", gap: 14 }}>
            <div className="field">
              <label>Judul Kegiatan Publik *</label>
              <input
                value={f.judul}
                onChange={(e) => setF({ ...f, judul: e.target.value })}
                placeholder="Mis. Ngaji Rutin Selasa Malam &mdash; bedah kitab..."
                style={{ fontSize: 15, fontWeight: 700 }}
              />
            </div>

            <div className="form-grid-2">
              <div className="field">
                <label>Kategori (Ketik bebas / Pilih dari list)</label>
                <input
                  value={f.kategori}
                  onChange={(e) => setF({ ...f, kategori: e.target.value })}
                  placeholder="Mis. Sambung Rutin, Keakraban, Festival, dll"
                  list="kegiatan-kategori-list"
                />
                <datalist id="kegiatan-kategori-list">
                  {existingCategories.map((k) => (
                    <option key={k} value={k} />
                  ))}
                </datalist>
              </div>

              <div className="field">
                <label>Status Publikasi</label>
                <select
                  value={f.status}
                  onChange={(e) => setF({ ...f, status: e.target.value })}
                  className="filter-input"
                >
                  {role === "admin_daerah" && <option value="published">Published (Tayang)</option>}
                  <option value="pending_review">Pending Review</option>
                  <option value="draft">Draft (Tersimpan)</option>
                </select>
              </div>
            </div>

            <div className="form-grid-2">
              <div className="field">
                <label>Tanggal Acara *</label>
                <input type="date" value={f.tanggal} onChange={(e) => setF({ ...f, tanggal: e.target.value })} />
              </div>
              <div className="field">
                <label>Waktu / Jam</label>
                <input type="time" value={f.jam} onChange={(e) => setF({ ...f, jam: e.target.value })} />
              </div>
            </div>

            <div className="form-grid-2">
              <div className="field">
                <label>Lokasi Acara</label>
                <input
                  value={f.lokasi}
                  onChange={(e) => setF({ ...f, lokasi: e.target.value })}
                  placeholder="Mis. Musala Al-Falah, Cengkareng"
                />
              </div>
              <div className="field">
                <label>Slug Custom (Opsional)</label>
                <input
                  value={f.slug}
                  onChange={(e) => setF({ ...f, slug: e.target.value })}
                  placeholder="Auto-generate dari judul"
                />
              </div>
            </div>

            <ImageUploadInput
              label="Banner / Cover Kegiatan"
              value={f.coverImage || ""}
              onChange={(val) => setF({ ...f, coverImage: val })}
              placeholder="Pilih file foto atau tempel URL gambar..."
            />

            <div className="field">
              <label>Ringkasan Singkat (Excerpt)</label>
              <textarea
                rows={2}
                value={f.excerpt}
                onChange={(e) => setF({ ...f, excerpt: e.target.value })}
                placeholder="Ringkasan 1-2 kalimat untuk kartu depan..."
                maxLength={300}
              />
            </div>

            <div className="field">
              <label>Konten Lengkap Kegiatan (Rich Text Editor)</label>
              <RichTextEditor
                value={f.konten || ""}
                onChange={(html) => setF({ ...f, konten: html })}
                placeholder="Tulis deskripsi detail kegiatan di sini... Gunakan toolbar untuk susunan acara, kutipan, poin, dll."
                minHeight={240}
              />
            </div>
          </div>
        }
        preview={
          <div className="pub-section pub-detail">
            <div style={{ fontSize: 13, fontWeight: 700, display: "inline-flex", gap: 6, alignItems: "center", width: "fit-content", color: "var(--pub-ink)" }}>
              <ArrowLeft size={14} /> Semua kegiatan
            </div>

            <div className="pub-detail-hero" style={{ marginTop: 12 }}>
              {f.coverImage ? (
                <img src={f.coverImage} alt={f.judul || "Cover"} style={{ width: "100%", maxHeight: 260, objectFit: "cover", borderRadius: 16 }} />
              ) : (
                <div style={{ height: 180, background: "var(--pub-paper-2)", borderRadius: 16, border: "1px dashed var(--pub-line)", display: "grid", placeItems: "center", color: "var(--pub-muted)" }}>
                  Tanpa Cover Banner
                </div>
              )}
            </div>

                  <div className="pub-detail-meta" style={{ marginTop: 12 }}>
                    <span className="pub-tag" style={{ textTransform: "capitalize" }}>{f.kategori || "Kegiatan"}</span>
                    <span>
                      <CalendarDays size={12} /> {f.tanggal || "Tanggal"} {f.jam ? `· ${f.jam} WIB` : ""}
                    </span>
                    <span>
                      <MapPin size={12} /> {f.lokasi || "Lokasi kegiatan"}
                    </span>
                    <span className="pill pill-amber" style={{ gap: 4 }}>
                      <Timer size={11} /> Akan datang
                    </span>
                  </div>

            <h1 className="pub-detail-title" style={{ fontSize: 24, marginTop: 8 }}>
              {f.judul || "Judul Kegiatan Akan Muncul Di Sini"}
            </h1>

            {f.excerpt && <p className="pub-detail-excerpt">{f.excerpt}</p>}

            <div className="pub-prose" style={{ marginTop: 16 }}>
              {f.konten ? (
                <div dangerouslySetInnerHTML={{ __html: f.konten }} />
              ) : (
                <p style={{ color: "var(--pub-muted)", fontStyle: "italic" }}>
                  Deskripsi lengkap kegiatan publik belum diisi...
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
