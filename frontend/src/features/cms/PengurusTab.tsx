import { useEffect, useMemo, useState } from "react";
import { Users as IcoUsers, CalendarDays as IcoCalendar, Shield as IcoShield, MapPin as IcoMapPin, Pencil as IcoEdit, Trash2 as IcoTrash } from "lucide-react";
import KpiCard from "../../components/admin/KpiCard";
import SearchInput from "../../components/admin/SearchInput";
import AdminModal from "../../components/admin/Modal";

type PengurusLevel = "pimpinan" | "sekretariat" | "bidang" | "koordinator";
type PengurusRow = { id: string; nama: string; dapukan: string; foto: string | null; level: PengurusLevel; bio: string | null; kontakWa: string | null; urutan: number };
const PENGURUS_LEVEL_OPTIONS: { value: PengurusLevel; label: string }[] = [
  { value: "pimpinan", label: "Pimpinan Inti" },
  { value: "sekretariat", label: "Sekretariat" },
  { value: "bidang", label: "Bidang" },
  { value: "koordinator", label: "Koordinator Wilayah" },
];

function Select({ value, onChange, options, ariaLabel }: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[]; ariaLabel?: string }) {
  const [open, setOpen] = useState(false);
  const cur = options.find((o) => o.value === value);
  return (
    <div className="select" data-open={open}>
      <button type="button" className="select-trigger" onClick={() => setOpen((o) => !o)} aria-haspopup="listbox" aria-expanded={open} aria-label={ariaLabel}>
        <span>{cur?.label ?? "Pilih"}</span>
      </button>
      {open && (
        <div className="select-menu" role="listbox">
          {options.map((o) => (
            <button key={o.value} type="button" role="option" aria-selected={o.value === value} className={`select-option ${o.value === value ? "selected" : ""}`} onClick={() => { onChange(o.value); setOpen(false); }}>{o.label}</button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function PengurusTab() {
  const [rows, setRows] = useState<PengurusRow[]>(() => [
    { id: "1", nama: "Fulan A", dapukan: "Ketua Umum", foto: null, level: "pimpinan", bio: "Penanggung jawab harian.", kontakWa: null, urutan: 0 },
    { id: "2", nama: "Fulanah B", dapukan: "Sekretaris", foto: null, level: "sekretariat", bio: "Arsip & jadwal.", kontakWa: null, urutan: 1 },
    { id: "3", nama: "Fulan C", dapukan: "Bendahara", foto: null, level: "sekretariat", bio: "Kelola kas.", kontakWa: null, urutan: 2 },
  ]);
  const [editing, setEditing] = useState<PengurusRow | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [q, setQ] = useState("");

  useEffect(() => {
    fetch("/api/admin/pengurus").then((r) => r.ok ? r.json() : Promise.reject(r.status)).then((j) => {
      if (Array.isArray(j) && j.length) setRows(j.map((x: any) => ({ id: x.id, nama: x.nama, dapukan: x.dapukan, foto: x.foto ?? null, level: (x.level as PengurusLevel) || "bidang", bio: x.bio ?? null, kontakWa: x.kontakWa ?? x.kontak_wa ?? null, urutan: Number(x.urutan ?? 0) })));
    }).catch(() => {});
  }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter((r) => `${r.nama} ${r.dapukan} ${r.level} ${r.bio ?? ""}`.toLowerCase().includes(s));
  }, [rows, q]);

  const grouped = useMemo(() => {
    const g: Record<PengurusLevel, PengurusRow[]> = { pimpinan: [], sekretariat: [], bidang: [], koordinator: [] };
    for (const r of filtered) {
      const lvl = (r.level as PengurusLevel) || "bidang";
      (g[lvl] ? g[lvl].push(r) : g.bidang.push(r));
    }
    for (const k of Object.keys(g) as PengurusLevel[]) g[k].sort((a, b) => (a.urutan ?? 0) - (b.urutan ?? 0));
    return g;
  }, [filtered]);

  const openCreate = () => { setEditing(null); setShowForm(true); };
  const openEdit = (r: PengurusRow) => { setEditing(r); setShowForm(true); };
  const handleDelete = (id: string) => {
    if (!confirm("Hapus pengurus ini?")) return;
    setRows((prev) => prev.filter((x) => x.id !== id));
    void fetch(`/api/admin/pengurus?id=${encodeURIComponent(id)}`, { method: "DELETE" }).catch(() => {});
  };
  const levelLabel = (lvl: PengurusLevel) => PENGURUS_LEVEL_OPTIONS.find((o) => o.value === lvl)?.label ?? lvl;

  return (
    <div>
      <div className="kpi">
        <KpiCard icon={<span className="kpi-icon kpi-icon--emerald"><IcoUsers size={18} /></span>} label="Pimpinan" value={grouped.pimpinan.length} />
        <KpiCard icon={<span className="kpi-icon kpi-icon--amber"><IcoShield size={18} /></span>} label="Sekretariat" value={grouped.sekretariat.length} />
        <KpiCard icon={<span className="kpi-icon kpi-icon--peach"><IcoCalendar size={18} /></span>} label="Bidang" value={grouped.bidang.length} />
        <KpiCard icon={<span className="kpi-icon kpi-icon--slate"><IcoMapPin size={18} /></span>} label="Total" value={rows.length} />
      </div>
      <div className="admin-toolbar" style={{ marginTop: 16 }}>
        <SearchInput value={q} onChange={setQ} placeholder="Cari nama / dapukan / level..." />
        <button className="btn btn-primary btn-sm btn-auto" onClick={openCreate}>+ Tambah Pengurus</button>
        <a href="/pengurus" target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm btn-auto">Lihat publik →</a>
      </div>
      {(["pimpinan", "sekretariat", "bidang", "koordinator"] as PengurusLevel[]).map((lvl) => {
        const list = grouped[lvl];
        if (!list.length && q.trim()) return null;
        return (
          <div key={lvl} className="card" style={{ marginTop: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, paddingBottom: 10, borderBottom: "1px solid var(--line)" }}>
              <span style={{ width: 8, height: 8, borderRadius: 999, background: lvl === "pimpinan" ? "var(--ink)" : lvl === "sekretariat" ? "var(--primary)" : "var(--amber)", display: "inline-block" }} />
              <strong style={{ fontSize: 13, letterSpacing: "-0.01em" }}>{levelLabel(lvl)}</strong>
              <span className="pill pill-slate">{list.length}</span>
              {lvl === "pimpinan" && list.length > 2 && <span className="pill pill-amber">Ideal 1–2</span>}
            </div>
            {list.length === 0 ? <div className="muted" style={{ padding: 8 }}>Belum ada — tambah pengurus di level ini.</div> : (
              <div style={{ display: "grid", gap: 8 }}>
                {list.map((r) => (
                  <div key={r.id} className="pengurus-row" style={{ display: "flex", gap: 10, alignItems: "center", padding: "10px 12px", borderRadius: 12, border: "1px solid var(--line)", background: "#fff", minWidth: 0, maxWidth: "100%", overflow: "hidden" }}>
                    <span className="pill pill-slate" style={{ minWidth: 28, justifyContent: "center" }}>{r.urutan}</span>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: "var(--primary)", color: "#fff", display: "grid", placeItems: "center", fontWeight: 800, fontSize: 12, overflow: "hidden", flexShrink: 0 }}>
                      {r.foto ? <img src={r.foto} alt={r.nama} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : r.nama.split(" ").map((w) => w[0]).slice(0, 2).join("")}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.nama} <span className="muted">· {r.dapukan}</span></div>
                      {r.bio ? <div className="muted" style={{ fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.bio}</div> : <div className="muted" style={{ fontSize: 11 }}>— tanpa bio</div>}
                    </div>
                    <div className="pengurus-row-actions" style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                      <button className="btn btn-ghost row-icon-btn" aria-label="Edit pengurus" title="Edit" onClick={() => openEdit(r)}><IcoEdit size={16} /></button>
                      <button className="btn btn-danger row-icon-btn" aria-label="Hapus pengurus" title="Hapus" onClick={() => handleDelete(r.id)}><IcoTrash size={16} /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
      {showForm && (
        <PengurusFormModal initial={editing} onClose={() => setShowForm(false)} onSave={(saved) => {
          if (editing) {
            setRows((prev) => prev.map((x) => x.id === saved.id ? saved : x));
            void fetch("/api/admin/pengurus", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: saved.id, nama: saved.nama, dapukan: saved.dapukan, foto: saved.foto, level: saved.level, bio: saved.bio, kontakWa: saved.kontakWa, urutan: saved.urutan }) }).catch(() => {});
          } else {
            setRows((prev) => [saved, ...prev]);
            void fetch("/api/admin/pengurus", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ nama: saved.nama, dapukan: saved.dapukan, foto: saved.foto, level: saved.level, bio: saved.bio, kontakWa: saved.kontakWa, urutan: saved.urutan }) }).then((r) => r.json()).then((j) => { if (j?.id) setRows((prev) => prev.map((x) => x.id === saved.id ? { ...x, id: j.id } : x)); }).catch(() => {});
          }
          setShowForm(false); setEditing(null);
        }} />
      )}
    </div>
  );
}

function PengurusFormModal({ initial, onClose, onSave }: { initial: PengurusRow | null; onClose: () => void; onSave: (r: PengurusRow) => void }) {
  const [form, setForm] = useState(() => ({
    nama: initial?.nama ?? "", dapukan: initial?.dapukan ?? "", foto: initial?.foto ?? "",
    level: (initial?.level ?? "bidang") as PengurusLevel, bio: initial?.bio ?? "", kontakWa: initial?.kontakWa ?? "", urutan: String(initial?.urutan ?? 0),
  }));
  const valid = form.nama.trim().length >= 2 && form.dapukan.trim().length >= 2;
  return (
    <AdminModal title={initial ? "Edit Pengurus" : "Tambah Pengurus"} onClose={onClose} maxWidth={560}>
      <div style={{ display: "grid", gap: 12 }}>
        <div className="field"><label>Nama *</label><input value={form.nama} onChange={(e) => setForm({ ...form, nama: e.target.value })} placeholder="Nama lengkap" /></div>
        <div className="field"><label>Dapukan / Jabatan *</label><input value={form.dapukan} onChange={(e) => setForm({ ...form, dapukan: e.target.value })} placeholder="Ketua Umum, Sekretaris, dll" /></div>
        <div className="field"><label>Level *</label><Select value={form.level} onChange={(v) => setForm({ ...form, level: v as PengurusLevel })} ariaLabel="Level" options={PENGURUS_LEVEL_OPTIONS.map((o) => ({ value: o.value, label: o.label }))} /></div>
        <div className="field"><label>Bio singkat (max 280)</label><textarea rows={2} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} placeholder="Tugas & tanggung jawab — 1 kalimat" maxLength={280} /></div>
        <div className="form-grid-2">
          <div className="field"><label>Urutan</label><input type="number" min={0} max={999} value={form.urutan} onChange={(e) => setForm({ ...form, urutan: e.target.value })} /></div>
          <div className="field"><label>Kontak WA</label><input value={form.kontakWa} onChange={(e) => setForm({ ...form, kontakWa: e.target.value })} placeholder="62812..." /></div>
        </div>
        <div className="field"><label>Foto (URL)</label><input value={form.foto} onChange={(e) => setForm({ ...form, foto: e.target.value })} placeholder="https://..." /></div>
        <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
          <button className="btn btn-ghost" style={{ flex: 1 }} onClick={onClose}>Batal</button>
          <button className="btn btn-primary" style={{ flex: 1 }} disabled={!valid} onClick={() => onSave({ id: initial?.id ?? `tmp-${Date.now()}`, nama: form.nama.trim(), dapukan: form.dapukan.trim(), foto: form.foto.trim() || null, level: form.level, bio: form.bio.trim() || null, kontakWa: form.kontakWa.trim() || null, urutan: Math.max(0, Math.min(999, parseInt(form.urutan, 10) || 0)) })}>Simpan</button>
        </div>
      </div>
    </AdminModal>
  );
}
