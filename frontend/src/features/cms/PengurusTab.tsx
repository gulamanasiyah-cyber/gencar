import { useEffect, useMemo, useState } from "react";
import { Pencil as IcoEdit, Trash2 as IcoTrash } from "lucide-react";
import SearchInput from "../../components/admin/SearchInput";
import AdminModal from "../../components/admin/Modal";
import DeleteConfirmModal from "../../components/DeleteConfirmModal";
import ImageUploadInput from "../../components/admin/ImageUploadInput";
import { apiFetch } from "../../lib/api";

type PengurusRow = { id: string; nama: string; dapukan: string; foto: string | null; bio: string | null; kontakWa: string | null; urutan: number };

export default function PengurusTab() {
  const [rows, setRows] = useState<PengurusRow[]>(() => [
    { id: "1", nama: "Fulan A", dapukan: "Ketua Umum", foto: null, bio: "Penanggung jawab harian.", kontakWa: null, urutan: 0 },
    { id: "2", nama: "Fulanah B", dapukan: "Sekretaris", foto: null, bio: "Arsip & jadwal.", kontakWa: null, urutan: 1 },
    { id: "3", nama: "Fulan C", dapukan: "Bendahara", foto: null, bio: "Kelola kas.", kontakWa: null, urutan: 2 },
  ]);
  const [editing, setEditing] = useState<PengurusRow | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [q, setQ] = useState("");

  useEffect(() => {
    apiFetch<any[]>("/api/admin/pengurus")
      .then((j) => {
        if (Array.isArray(j)) {
          setRows(j.map((x: any) => ({
            id: x.id,
            nama: x.nama,
            dapukan: x.dapukan,
            foto: x.foto ?? null,
            bio: x.bio ?? null,
            kontakWa: x.kontakWa ?? x.kontak_wa ?? null,
            urutan: Number(x.urutan ?? 0),
          })));
        }
      })
      .catch(() => {});
  }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    const list = [...rows].sort((a, b) => (a.urutan ?? 0) - (b.urutan ?? 0));
    if (!s) return list;
    return list.filter((r) => `${r.nama} ${r.dapukan} ${r.bio ?? ""}`.toLowerCase().includes(s));
  }, [rows, q]);

  const initials = (nama: string) => nama.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();

  const [deleteTarget, setDeleteTarget] = useState<PengurusRow | null>(null);

  const openCreate = () => { setEditing(null); setShowForm(true); };
  const openEdit = (r: PengurusRow) => { setEditing(r); setShowForm(true); };
  const handleDelete = (r: PengurusRow) => {
    setDeleteTarget(r);
  };
  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const id = deleteTarget.id;
    setRows((prev) => prev.filter((x) => x.id !== id));
    await apiFetch(`/api/admin/pengurus?id=${encodeURIComponent(id)}`, { method: "DELETE" });
  };

  return (
    <div>
      <div className="admin-toolbar">
        <SearchInput value={q} onChange={setQ} placeholder="Cari nama / dapukan..." />
        <button className="btn btn-primary btn-sm btn-auto" onClick={openCreate}>+ Tambah Pengurus</button>
        <a href="/pengurus" target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm btn-auto">Lihat publik →</a>
        <span className="pill pill-slate">{rows.length} pengurus</span>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        {filtered.length === 0 ? (
          <div className="muted" style={{ padding: 16, textAlign: "center" }}>Belum ada data pengurus.</div>
        ) : (
          <div style={{ display: "grid", gap: 8 }}>
            {filtered.map((r) => (
              <div key={r.id} className="pengurus-row" style={{ display: "flex", gap: 10, alignItems: "center", padding: "10px 12px", borderRadius: 12, border: "1px solid var(--line)", background: "#fff", minWidth: 0, maxWidth: "100%", overflow: "hidden" }}>
                <span className="pill pill-slate" style={{ minWidth: 28, justifyContent: "center" }}>#{r.urutan}</span>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: "var(--primary)", color: "#fff", display: "grid", placeItems: "center", fontWeight: 800, fontSize: 12, overflow: "hidden", flexShrink: 0 }}>
                  {r.foto ? <img src={r.foto} alt={r.nama} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : initials(r.nama)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.nama} <span className="muted">· {r.dapukan}</span></div>
                  {r.bio ? <div className="muted" style={{ fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.bio}</div> : <div className="muted" style={{ fontSize: 11 }}>— tanpa bio</div>}
                </div>
                <div className="pengurus-row-actions" style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                  <button className="btn btn-ghost row-icon-btn" aria-label="Edit pengurus" title="Edit" onClick={() => openEdit(r)}><IcoEdit size={16} /></button>
                  <button className="btn btn-danger row-icon-btn" aria-label="Hapus pengurus" title="Hapus" onClick={() => handleDelete(r)}><IcoTrash size={16} /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card" style={{ marginTop: 16, padding: 0, overflow: "hidden", border: "1px solid var(--line)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "12px 16px", borderBottom: "1px solid var(--line)", background: "#fff" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ width: 8, height: 8, borderRadius: 999, background: "var(--ink)", display: "inline-block" }} />
            <strong style={{ fontSize: 13, letterSpacing: "-0.01em" }}>Preview — Tampilan Publik</strong>
            <span className="pill pill-slate">{filtered.length} kartu</span>
          </div>
          <a href="/pengurus" target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm btn-auto" style={{ padding: "6px 10px", fontSize: 12 }}>Buka /pengurus</a>
        </div>
        {filtered.length === 0 ? (
          <div className="muted" style={{ padding: 16 }}>Belum ada pengurus — preview kosong.</div>
        ) : (
          <div style={{ padding: 12, background: "var(--pub-paper, #fff)", overflow: "auto" }}>
            <div className="swiss-pengurus-grid" style={{ maxWidth: 960, margin: "0 auto" }}>
              {filtered.map((p, idx) => {
                const num = String(idx + 1).padStart(2, "0");
                const isHero = idx === 0;
                return (
                  <button
                    key={`preview-${p.id}`}
                    type="button"
                    className={`swiss-card ${isHero ? "swiss-card--hero" : ""}`}
                    onClick={() => openEdit(p)}
                    aria-label={`Edit ${p.nama}`}
                    title="Klik untuk edit"
                  >
                    <div className="swiss-card-top">
                      <span className="swiss-num">{num}</span>
                      <span className="swiss-role">{p.dapukan}</span>
                    </div>
                    <div className="swiss-photo">
                      {p.foto ? (
                        <img src={p.foto} alt={p.nama} loading="lazy" />
                      ) : (
                        <div className="swiss-photo-placeholder" aria-hidden="true">
                          {initials(p.nama)}
                        </div>
                      )}
                    </div>
                    <div className="swiss-copy">
                      <span className="swiss-role">{p.dapukan}</span>
                      <strong className="swiss-name">{p.nama}</strong>
                      {p.bio && <p className="swiss-bio">{p.bio}</p>}
                    </div>
                  </button>
                );
              })}
            </div>
            <p className="muted" style={{ textAlign: "center", marginTop: 10, fontSize: 11 }}>Klik kartu untuk edit · Urutan tampil mengikuti nomor urut.</p>
          </div>
        )}
      </div>
      {showForm && (
        <PengurusFormModal initial={editing} onClose={() => setShowForm(false)} onSave={(saved) => {
          if (editing) {
            setRows((prev) => prev.map((x) => x.id === saved.id ? saved : x));
            void apiFetch("/api/admin/pengurus", { method: "PUT", body: JSON.stringify({ id: saved.id, nama: saved.nama, dapukan: saved.dapukan, foto: saved.foto, bio: saved.bio, kontakWa: saved.kontakWa, urutan: saved.urutan }) }).catch(() => {});
          } else {
            setRows((prev) => [saved, ...prev]);
            void apiFetch<{ id: string }>("/api/admin/pengurus", { method: "POST", body: JSON.stringify({ nama: saved.nama, dapukan: saved.dapukan, foto: saved.foto, bio: saved.bio, kontakWa: saved.kontakWa, urutan: saved.urutan }) }).then((j) => { if (j?.id) setRows((prev) => prev.map((x) => x.id === saved.id ? { ...x, id: j.id } : x)); }).catch(() => {});
          }
          setShowForm(false); setEditing(null);
        }} />
      )}
      {deleteTarget && (
        <DeleteConfirmModal
          itemName={deleteTarget.nama}
          description={`Pengurus ${deleteTarget.nama} (${deleteTarget.dapukan}) akan dihapus permanen dari daftar pengurus daerah.`}
          onClose={() => setDeleteTarget(null)}
          onConfirm={confirmDelete}
        />
      )}
    </div>
  );
}

function PengurusFormModal({ initial, onClose, onSave }: { initial: PengurusRow | null; onClose: () => void; onSave: (r: PengurusRow) => void }) {
  const [form, setForm] = useState(() => ({
    nama: initial?.nama ?? "", dapukan: initial?.dapukan ?? "", foto: initial?.foto ?? "",
    bio: initial?.bio ?? "", kontakWa: initial?.kontakWa ?? "", urutan: String(initial?.urutan ?? 0),
  }));
  const valid = form.nama.trim().length >= 2 && form.dapukan.trim().length >= 2;
  return (
    <AdminModal title={initial ? "Edit Pengurus" : "Tambah Pengurus"} onClose={onClose} maxWidth={560}>
      <div style={{ display: "grid", gap: 12 }}>
        <div className="field"><label>Nama *</label><input value={form.nama} onChange={(e) => setForm({ ...form, nama: e.target.value })} placeholder="Nama lengkap" /></div>
        <div className="field"><label>Dapukan / Jabatan *</label><input value={form.dapukan} onChange={(e) => setForm({ ...form, dapukan: e.target.value })} placeholder="Ketua Umum, Sekretaris, dll" /></div>
        <div className="field"><label>Bio singkat (max 280)</label><textarea rows={2} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} placeholder="Tugas & tanggung jawab — 1 kalimat" maxLength={280} /></div>
        <div className="form-grid-2">
          <div className="field"><label>Urutan</label><input type="number" min={0} max={999} value={form.urutan} onChange={(e) => setForm({ ...form, urutan: e.target.value })} /></div>
          <div className="field"><label>Kontak WA</label><input value={form.kontakWa} onChange={(e) => setForm({ ...form, kontakWa: e.target.value })} placeholder="62812..." /></div>
        </div>
        <ImageUploadInput
          label="Foto Pengurus"
          value={form.foto}
          onChange={(url) => setForm({ ...form, foto: url })}
          placeholder="Upload foto pengurus..."
          helperText="Foto formal/semi-formal pengurus. Ukuran disarankan rasio portrait/square."
        />
        <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
          <button className="btn btn-ghost" style={{ flex: 1 }} onClick={onClose}>Batal</button>
          <button className="btn btn-primary" style={{ flex: 1 }} disabled={!valid} onClick={() => onSave({ id: initial?.id ?? `tmp-${Date.now()}`, nama: form.nama.trim(), dapukan: form.dapukan.trim(), foto: form.foto.trim() || null, bio: form.bio.trim() || null, kontakWa: form.kontakWa.trim() || null, urutan: Math.max(0, Math.min(999, parseInt(form.urutan, 10) || 0)) })}>Simpan</button>
        </div>
      </div>
    </AdminModal>
  );
}
