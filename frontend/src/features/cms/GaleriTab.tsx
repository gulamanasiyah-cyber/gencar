import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Eye, Pencil as IcoEdit, Play, Plus, RotateCcw, Trash2 as IcoTrash } from "lucide-react";
import { apiFetch } from "../../lib/api";
import AdminModal from "../../components/admin/Modal";
import SearchInput from "../../components/admin/SearchInput";
import ImageUploadInput from "../../components/admin/ImageUploadInput";
import DeleteConfirmModal from "../../components/DeleteConfirmModal";
import CategoryInput from "../../components/CategoryInput";
import { labelKategori } from "../../lib/labelKategori";

export type GaleriItem = {
  id: string;
  judul: string;
  image: string;
  kategori: string;
  type: "photo" | "reel" | "quote";
  aspectRatio: "portrait" | "landscape" | "square" | "tall";
  deskripsi?: string | null;
  quote?: string | null;
  author?: string | null;
  durasi?: string | null;
  tanggal?: string | null;
  lokasi?: string | null;
  status: "draft" | "published";
  authorId?: string;
};

const KATEGORI_OPTIONS = ["Kegiatan", "Sambung Rutin", "Festival", "Olahraga", "Workshop", "Sosial"];

type AdminRole = "admin_daerah" | "admin_desa" | "admin_kelompok";

export default function GaleriTab({ role, userId }: { role: AdminRole; userId?: string }) {
  const [items, setItems] = useState<GaleriItem[]>([]);
  const [q, setQ] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<GaleriItem | null>(null);

  const load = () => {
    apiFetch<unknown>("/api/cms/galeri")
      .then((j) => setItems(Array.isArray(j) ? j : []))
      .catch(() => {});
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = q
    ? items.filter((a) => `${a.judul} ${a.kategori || ""} ${a.lokasi || ""}`.toLowerCase().includes(q.toLowerCase()))
    : items;

  const [deleteTarget, setDeleteTarget] = useState<GaleriItem | null>(null);

  const canEditItem = (item: GaleriItem) => role === "admin_daerah" || item.authorId === userId;

  const handleDelete = (item: GaleriItem) => {
    setDeleteTarget(item);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const id = deleteTarget.id;
    setItems((p) => p.filter((x) => x.id !== id));
    await apiFetch(`/api/cms/galeri/${id}`, { method: "DELETE" });
  };

  const openCreate = () => {
    setEditing(null);
    setShowModal(true);
  };

  const openEdit = (item: GaleriItem) => {
    setEditing(item);
    setShowModal(true);
  };

  return (
    <div>
      <div className="admin-toolbar">
        <SearchInput value={q} onChange={setQ} placeholder="Cari judul / kategori / lokasi..." />
        <button type="button" className="btn btn-primary btn-sm btn-auto" onClick={openCreate}>
          <Plus size={16} /> Tambah Foto Galeri
        </button>
        <span className="pill pill-slate">{items.length}</span>
      </div>

      <p className="muted" style={{ marginBottom: 14 }}>
        Galeri foto &amp; reel publik &mdash; 1 item = 1 foto langsung tanpa cover terpisah. Tampil interaktif di meja Polaroid <code>/galeri</code>.
      </p>

      <div className="cms-card-grid">
        {filtered.length === 0 && (
          <div className="lp-empty-card" style={{ gridColumn: "1/-1" }}>
            Belum ada foto galeri. Klik <strong>+ Tambah Foto Galeri</strong> untuk menambahkan.
          </div>
        )}
        {filtered.map((item) => (
          <div key={item.id} className="card" style={{ padding: 12, display: "grid", gap: 8 }}>
            {item.type !== "quote" ? (
              <div style={{ width: "100%", height: 140, borderRadius: 10, overflow: "hidden", border: "1px solid var(--line)", background: "var(--bg)" }}>
                <img
                  src={item.image}
                  alt={item.judul}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              </div>
            ) : (
              <div style={{ height: 140, borderRadius: 10, background: "var(--ink)", color: "#fff", padding: 12, display: "grid", placeItems: "center", textAlign: "center", fontSize: 11, fontStyle: "italic" }}>
                "{item.quote || item.judul}"
              </div>
            )}

            <div style={{ display: "grid", gap: 2 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 6 }}>
                <span className="pill pill-slate" style={{ fontSize: 9, padding: "2px 6px" }}>{labelKategori(item.kategori)}</span>
                <span className="pill pill-emerald" style={{ fontSize: 9, padding: "2px 6px" }}>{item.type}</span>
              </div>
              <strong style={{ fontSize: 13, lineHeight: 1.2, marginTop: 4 }}>{item.judul}</strong>
              <span className="muted" style={{ fontSize: 11 }}>
                {item.tanggal || "—"} &bull; {item.lokasi || "Cengkareng"}
              </span>
            </div>

            <div style={{ display: "flex", gap: 6, marginTop: 2 }}>
              {canEditItem(item) && (
              <>
              <button
                type="button"
                className="btn btn-ghost row-icon-btn"
                aria-label="Edit"
                title="Edit"
                onClick={() => openEdit(item)}
              >
                <IcoEdit size={16} />
              </button>
              <button
                type="button"
                className="btn btn-danger row-icon-btn"
                aria-label="Hapus"
                title="Hapus"
                onClick={() => handleDelete(item)}
              >
                <IcoTrash size={16} />
              </button>
              </>
              )}
              <a
                href="/galeri"
                target="_blank"
                rel="noreferrer"
                className="btn btn-ghost row-icon-btn"
                aria-label="Lihat di Web Publik"
                title="Lihat di Web Publik"
              >
                <Eye size={16} />
              </a>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <GaleriSingleFotoModal
          initial={editing}
          role={role}
          onClose={() => setShowModal(false)}
          onSaveSuccess={() => {
            setShowModal(false);
            setEditing(null);
            load();
          }}
        />
      )}

      {deleteTarget && (
        <DeleteConfirmModal
          itemName={deleteTarget.judul}
          description={`Foto galeri "${deleteTarget.judul}" akan dihapus permanen.`}
          onClose={() => setDeleteTarget(null)}
          onConfirm={confirmDelete}
        />
      )}
    </div>
  );
}

function GaleriSingleFotoModal({
  initial,
  role,
  onClose,
  onSaveSuccess,
}: {
  initial: GaleriItem | null;
  role: AdminRole;
  onClose: () => void;
  onSaveSuccess: () => void;
}) {
  const [f, setF] = useState(() => ({
    judul: initial?.judul ?? "",
    image: initial?.image ?? "",
    kategori: initial?.kategori ?? "Kegiatan",
    type: (initial?.type ?? "photo") as "photo" | "reel" | "quote",
    aspectRatio: (initial?.aspectRatio ?? "portrait") as "portrait" | "landscape" | "square" | "tall",
    deskripsi: initial?.deskripsi ?? "",
    quote: initial?.quote ?? "",
    author: initial?.author ?? "",
    durasi: initial?.durasi ?? "",
    tanggal: initial?.tanggal ?? new Date().toISOString().slice(0, 10),
    lokasi: initial?.lokasi ?? "Cengkareng",
    status: initial?.status ?? (role === "admin_daerah" ? "published" : "draft"),
  }));
  const [saving, setSaving] = useState(false);
  const [flipped, setFlipped] = useState(false);

  const valid = f.judul.trim().length >= 2 && (f.type === "quote" || f.image.trim().length > 0);

  const aspectMap: Record<GaleriItem["aspectRatio"], string> = {
    tall: "9 / 16",
    portrait: "4 / 5",
    landscape: "16 / 10",
    square: "1 / 1",
  };

  const handleSave = async () => {
    if (!valid) return;
    setSaving(true);
    try {
      const isEdit = !!initial?.id;
      const url = isEdit ? `/api/cms/galeri/${initial.id}` : "/api/cms/galeri";
      const method = isEdit ? "PUT" : "POST";
      await apiFetch(url, { method, body: JSON.stringify(f) });
      onSaveSuccess();
    } catch (e: any) {
      alert(e.message || "Gagal menyimpan");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminModal title={initial ? "Edit Foto Galeri" : "Tambah Foto Galeri"} onClose={onClose} maxWidth={880}>
      <div className="cms-galeri-modal-grid">
        {/* FORM INPUTS */}
        <div style={{ display: "grid", gap: 12 }}>
          <div className="field">
            <label>Judul / Caption Foto *</label>
            <input
              value={f.judul}
              onChange={(e) => setF({ ...f, judul: e.target.value })}
              placeholder="Mis. Keseruan Futsal & Silaturahmi Pemuda..."
            />
          </div>

          <div className="form-grid-3">
            <div className="field">
              <label>Tipe Item</label>
              <select
                value={f.type}
                onChange={(e) => setF({ ...f, type: e.target.value as any })}
                className="filter-input"
              >
                <option value="photo">Foto</option>
                <option value="reel">Reel / Video</option>
                <option value="quote">Quote Card</option>
              </select>
            </div>

            <div className="field">
              <label>Kategori</label>
              <CategoryInput
                value={f.kategori}
                onChange={(v) => setF({ ...f, kategori: v })}
                existingCategories={KATEGORI_OPTIONS}
                placeholder="Ketik atau pilih kategori..."
              />
            </div>

            <div className="field">
              <label>Rasio Foto</label>
              <select
                value={f.aspectRatio}
                onChange={(e) => setF({ ...f, aspectRatio: e.target.value as any })}
                className="filter-input"
              >
                <option value="portrait">Portrait (4:5)</option>
                <option value="landscape">Landscape (16:10)</option>
                <option value="square">Square (1:1)</option>
                <option value="tall">Tall (9:16)</option>
              </select>
            </div>
          </div>

          {f.type !== "quote" ? (
            <ImageUploadInput
              label="File Foto Galeri *"
              value={f.image}
              onChange={(val) => setF({ ...f, image: val })}
              placeholder="Pilih file gambar atau tempel URL foto..."
            />
          ) : (
            <>
              <div className="field">
                <label>Kutipan / Quote *</label>
                <textarea
                  rows={2}
                  value={f.quote}
                  onChange={(e) => setF({ ...f, quote: e.target.value })}
                  placeholder="Tulis kutipan kata inspiratif..."
                />
              </div>
              <div className="field">
                <label>Penulis / Tokoh</label>
                <input
                  value={f.author}
                  onChange={(e) => setF({ ...f, author: e.target.value })}
                  placeholder="Mis. Panitia Gencar"
                />
              </div>
            </>
          )}

          <div className="form-grid-2">
            <div className="field">
              <label>Tanggal</label>
              <input type="date" value={f.tanggal || ""} onChange={(e) => setF({ ...f, tanggal: e.target.value })} />
            </div>
            <div className="field">
              <label>Lokasi</label>
              <input
                value={f.lokasi || ""}
                onChange={(e) => setF({ ...f, lokasi: e.target.value })}
                placeholder="Mis. Musala Al-Falah"
              />
            </div>
          </div>

          {f.type === "reel" && (
            <div className="field">
              <label>Durasi Reel (Opsional)</label>
              <input
                value={f.durasi || ""}
                onChange={(e) => setF({ ...f, durasi: e.target.value })}
                placeholder="Mis. 0:45"
              />
            </div>
          )}

          <div className="field">
            <label>Deskripsi Cerita Momen (Opsional)</label>
            <textarea
              rows={2}
              value={f.deskripsi || ""}
              onChange={(e) => setF({ ...f, deskripsi: e.target.value })}
              placeholder="Ceritakan momen di balik foto ini..."
            />
          </div>

          <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
            <button type="button" className="btn btn-ghost" style={{ flex: 1 }} onClick={onClose}>
              Batal
            </button>
            <button type="button" className="btn btn-primary" style={{ flex: 1 }} disabled={!valid || saving} onClick={handleSave}>
              {saving ? "Menyimpan..." : "Simpan Foto"}
            </button>
          </div>
        </div>

        {/* 3D FLIPPABLE POLAROID PREVIEW (IDENTIK DENGAN PUBLIC LIGHTBOX) */}
        <div className="cms-galeri-preview-col pub-root">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", marginBottom: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "var(--pub-muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
              Live Polaroid Preview
            </span>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              style={{ fontSize: 11, padding: "2px 8px", height: "auto", minHeight: 24 }}
              onClick={() => setFlipped(!flipped)}
            >
              <RotateCcw size={12} /> {flipped ? "Lihat Depan" : "Balik Kartu"}
            </button>
          </div>

          <div style={{ perspective: 1000, width: "100%", maxWidth: 300, display: "flex", flexDirection: "column", alignItems: "center" }}>
            <motion.div
              className="swiss-polaroid-flip"
              animate={{ rotateY: flipped ? 180 : 0 }}
              transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
              style={{ transformStyle: "preserve-3d" as const, width: "100%", cursor: "pointer" }}
              onClick={() => setFlipped((v) => !v)}
              role="button"
              tabIndex={0}
              aria-label={flipped ? "Lihat foto depan" : "Balik untuk deskripsi"}
            >
              {/* FRONT — POLAROID DEPAN */}
              <div className="swiss-flip-face swiss-flip-front">
                <div className="swiss-polaroid-card">
                  {f.type !== "quote" ? (
                    <div className="swiss-polaroid-media">
                      {f.image ? (
                        <img
                          src={f.image}
                          alt={f.judul || "Preview"}
                          style={{ aspectRatio: aspectMap[f.aspectRatio] ?? "4 / 5", width: "100%", objectFit: "cover", display: "block" }}
                          onError={(e) => ((e.target as HTMLImageElement).style.display = "none")}
                        />
                      ) : (
                        <div
                          style={{
                            aspectRatio: aspectMap[f.aspectRatio] ?? "4 / 5",
                            background: "var(--pub-paper-2)",
                            display: "grid",
                            placeItems: "center",
                            color: "var(--pub-muted)",
                            fontSize: 12,
                          }}
                        >
                          Masukkan URL Foto
                        </div>
                      )}
                      {f.type === "reel" && (
                        <span className="pub-lightbox-polaroid-badge">
                          <Play size={11} fill="currentColor" /> {f.durasi || "0:45"}
                        </span>
                      )}
                      <span className="swiss-flip-hint">Tap untuk balik ↻</span>
                    </div>
                  ) : (
                    <div
                      className="swiss-polaroid-media"
                      style={{
                        padding: "24px 16px",
                        display: "grid",
                        placeItems: "center",
                        background: "var(--pub-paper-2)",
                        aspectRatio: aspectMap[f.aspectRatio] ?? "1 / 1",
                      }}
                    >
                      <div style={{ textAlign: "center", display: "grid", gap: 6 }}>
                        <span style={{ fontSize: 24, lineHeight: 1, color: "var(--pub-faint)" }}>“</span>
                        <blockquote
                          style={{
                            fontFamily: "'Space Grotesk', sans-serif",
                            fontSize: 15,
                            fontWeight: 700,
                            lineHeight: 1.35,
                            color: "var(--pub-ink)",
                            margin: 0,
                          }}
                        >
                          “{f.quote || "Kutipan inspiratif..."}”
                        </blockquote>
                        {f.author && <cite style={{ fontSize: 11, color: "var(--pub-muted)", fontStyle: "normal" }}>— {f.author}</cite>}
                      </div>
                      <span className="swiss-flip-hint">Tap untuk balik ↻</span>
                    </div>
                  )}

                  <div className="swiss-polaroid-caption" style={{ padding: "10px 12px" }}>
                    <span style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--pub-muted)", fontWeight: 700 }}>
                      {f.kategori || "Kegiatan"}
                    </span>
                    <strong style={{ fontSize: 13, lineHeight: 1.25, display: "block", marginTop: 2 }}>
                      {f.judul || "Judul / Caption Foto"}
                    </strong>
                  </div>
                </div>
              </div>

              {/* BACK — POLAROID BELAKANG DENGAN CERITA */}
              <div className="swiss-flip-face swiss-flip-back">
                <div className="swiss-polaroid-card swiss-polaroid-card--back" style={{ minHeight: 280 }}>
                  <div className="swiss-flip-back-body" style={{ padding: 16 }}>
                    <span className="swiss-flip-kicker" style={{ fontSize: 11 }}>Cerita di balik foto</span>
                    {f.deskripsi ? (
                      <div className="swiss-handwriting" style={{ fontSize: 13, maxHeight: 180, overflowY: "auto" }}>
                        {f.deskripsi.split("\n\n").map((para, i) => (
                          <p key={i} style={{ margin: "4px 0" }}>{para}</p>
                        ))}
                      </div>
                    ) : (
                      <p className="swiss-handwriting swiss-handwriting--empty" style={{ fontSize: 12 }}>
                        Belum ada cerita tertulis untuk momen ini — tapi fotonya sudah bercerita banyak.
                      </p>
                    )}
                    <span className="swiss-flip-hint">Tap untuk kembali ↩</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </AdminModal>
  );
}
