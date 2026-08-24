import { useRef, useState } from "react";
import { MapPin, Phone, GraduationCap, Home, Download, Pencil, Upload } from "lucide-react";
import { QRCodeCanvas } from "qrcode.react";
import { toPng } from "html-to-image";
import { z } from "zod";
import type { MemberIdentity } from "./types";
import { pendidikanEnum, kategoriMudaMudiEnum } from "shared/validation";

type Props = { me: MemberIdentity; onUpdate: (m: MemberIdentity) => void };

// Tidak bisa .pick() dari generusAdminCreateSchema (punya superRefine) — bikin schema sendiri.
const profileEditSchema = z
  .object({
    nama: z.string().min(2, "Nama minimal 2 karakter").max(100).trim(),
    noTelp: z.string().min(10, "No telp minimal 10 digit").regex(/^\d+$/, "No telp hanya angka").trim(),
    pendidikan: z.enum(pendidikanEnum),
    domisiliAnak: z.string().min(3, "Domisili anak wajib diisi"),
    isDomisiliOrtuSama: z.boolean(),
    domisiliOrtu: z.string().nullable(),
    kategoriMudaMudi: z.enum(kategoriMudaMudiEnum),
    asalDaerah: z.string().nullable(),
  })
  .superRefine((v, ctx) => {
    if (v.kategoriMudaMudi === "perantauan" && !v.asalDaerah?.trim()) {
      ctx.addIssue({ code: "custom", message: "Asal daerah wajib jika perantauan", path: ["asalDaerah"] });
    }
    if (!v.isDomisiliOrtuSama && !v.domisiliOrtu?.trim()) {
      ctx.addIssue({ code: "custom", message: "Domisili ortu wajib jika tidak sama dengan anak", path: ["domisiliOrtu"] });
    }
  });

export default function MemberProfilePage({ me, onUpdate }: Props) {
  const [open, setOpen] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const [form, setForm] = useState({
    nama: me.nama,
    noTelp: me.noTelp,
    pendidikan: me.pendidikan as (typeof pendidikanEnum)[number],
    domisiliAnak: me.domisiliAnak,
    isOrtuSama: me.isOrtuSama,
    domisiliOrtu: me.domisiliOrtu ?? "",
    kategoriMudaMudi: me.kategoriMudaMudi,
    asalDaerah: me.asalDaerah ?? "",
  });

  async function downloadQrCard() {
    const el = cardRef.current;
    if (!el) return;
    const url = await toPng(el, { cacheBust: true, pixelRatio: 2 });
    const a = document.createElement("a");
    a.href = url;
    a.download = `qr-${me.nomorUnik ?? me.id}.png`;
    a.click();
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    const parsed = profileEditSchema.safeParse({
      nama: form.nama,
      noTelp: form.noTelp,
      pendidikan: form.pendidikan,
      domisiliAnak: form.domisiliAnak,
      isDomisiliOrtuSama: form.isOrtuSama,
      domisiliOrtu: form.domisiliOrtu || null,
      kategoriMudaMudi: form.kategoriMudaMudi,
      asalDaerah: form.asalDaerah || null,
    });
    if (!parsed.success) {
      setErr(parsed.error.issues[0]?.message ?? "Validasi gagal");
      return;
    }
    // zod handles perantauan→asalDaerah & domisiliOrtu conditional
    onUpdate({
      ...me,
      nama: form.nama.trim(),
      noTelp: form.noTelp.trim(),
      pendidikan: form.pendidikan,
      domisiliAnak: form.domisiliAnak.trim(),
      isOrtuSama: form.isOrtuSama,
      domisiliOrtu: form.isOrtuSama ? null : form.domisiliOrtu.trim() || null,
      kategoriMudaMudi: form.kategoriMudaMudi as MemberIdentity["kategoriMudaMudi"],
      asalDaerah: form.kategoriMudaMudi === "perantauan" ? form.asalDaerah.trim() || null : null,
    });
    setOpen(false);
  }

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div className="card" style={{ display: "flex", gap: 14, alignItems: "center" }}>
        <div className="avatar" style={{ width: 64, height: 64, fontSize: 18 }}>
          {me.nama
            .split(" ")
            .map((w) => w[0])
            .slice(0, 2)
            .join("")}
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontWeight: 800, fontSize: 16, lineHeight: 1.1 }}>{me.nama}</div>
          <div className="muted" style={{ fontSize: 12 }}>{me.nomorUnik} · {me.status}</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
            <span className="pill pill-slate">
              <Home size={12} /> Base: {me.kelompok}
            </span>
            <span className="pill pill-slate">
              <MapPin size={12} /> {me.desa}
            </span>
            <span className="pill pill-slate">{me.kategoriMudaMudi}</span>
          </div>
        </div>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setOpen(true)}>
          <Pencil size={14} /> Edit
        </button>
      </div>

      <div className="card" style={{ display: "grid", gap: 8 }}>
        <h3 style={{ fontSize: 14, fontWeight: 800 }}>Tempat Basen & Domisili</h3>
        <div className="data-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <div className="muted" style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase" }}>Base Operasional</div>
            <div style={{ fontWeight: 700, fontSize: 13 }}>Kelompok {me.kelompok} — Desa {me.desa}</div>
          </div>
          <div>
            <div className="muted" style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase" }}>Domisili Anak</div>
            <div style={{ fontSize: 13 }}>{me.domisiliAnak}</div>
          </div>
          <div>
            <div className="muted" style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase" }}>Domisili Ortu</div>
            <div style={{ fontSize: 13 }}>{me.isOrtuSama ? "Sama dengan anak" : me.domisiliOrtu || "—"}</div>
          </div>
          <div>
            <div className="muted" style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase" }}>Asal Daerah</div>
            <div style={{ fontSize: 13 }}>{me.kategoriMudaMudi === "perantauan" ? me.asalDaerah || "—" : "Pribumi"}</div>
          </div>
        </div>
      </div>

      <div className="card" style={{ display: "grid", gap: 8 }}>
        <h3 style={{ fontSize: 14, fontWeight: 800 }}>Kontak & Pendidikan</h3>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", fontSize: 13 }}>
          <span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
            <Phone size={14} /> {me.noTelp}
          </span>
          <span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
            <GraduationCap size={14} /> {me.pendidikan}
          </span>
        </div>
      </div>

      <div className="card" style={{ display: "grid", gap: 10, justifyItems: "center", textAlign: "center" }}>
        <h3 style={{ fontSize: 14, fontWeight: 800 }}>QR Identitas</h3>
        <div
          ref={cardRef}
          style={{
            padding: 16,
            borderRadius: 16,
            background: "#fff",
            border: "1px solid var(--line)",
            display: "grid",
            gap: 10,
            justifyItems: "center",
            width: "min(320px, 100%)",
          }}
        >
          <div style={{ fontWeight: 800, fontSize: 12, letterSpacing: "0.06em", textTransform: "uppercase", color: "#1a1a2e" }}>GENCAR · {me.nomorUnik}</div>
          <QRCodeCanvas value={me.nomorUnik ?? me.id} size={180} level="M" />
          <div className="muted" style={{ fontSize: 11 }}>{me.nama} · {me.kelompok}</div>
        </div>
        <button type="button" className="btn btn-ghost" onClick={downloadQrCard}>
          <Download size={14} /> Download Kartu (PNG)
        </button>
        <p className="muted" style={{ fontSize: 11 }}>Dipakai untuk absen — frame ikut terdownload.</p>
      </div>

      {open && (
        <div className="modal-backdrop" onClick={() => setOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 560 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <strong>Edit Profil</strong>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setOpen(false)}>
                Tutup
              </button>
            </div>
            <form onSubmit={submit} style={{ display: "grid", gap: 12 }}>
              <label className="field">
                <span>Nama</span>
                <input value={form.nama} onChange={(e) => setForm((s) => ({ ...s, nama: e.target.value }))} />
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <label className="field">
                  <span>No Telp</span>
                  <input value={form.noTelp} onChange={(e) => setForm((s) => ({ ...s, noTelp: e.target.value }))} />
                </label>
                <label className="field">
                  <span>Pendidikan</span>
                  <select value={form.pendidikan} onChange={(e) => setForm((s) => ({ ...s, pendidikan: e.target.value as unknown as typeof s.pendidikan }))}>
                    {(pendidikanEnum as unknown as string[]).map((x: string) => (
                      <option key={x} value={x}>
                        {x}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <label className="field">
                <span>Domisili Anak *</span>
                <input value={form.domisiliAnak} onChange={(e) => setForm((s) => ({ ...s, domisiliAnak: e.target.value }))} />
              </label>
              <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13 }}>
                <input type="checkbox" checked={form.isOrtuSama} onChange={(e) => setForm((s) => ({ ...s, isOrtuSama: e.target.checked }))} /> Domisili ortu sama dengan anak
              </label>
              {!form.isOrtuSama && (
                <label className="field">
                  <span>Domisili Ortu *</span>
                  <input value={form.domisiliOrtu} onChange={(e) => setForm((s) => ({ ...s, domisiliOrtu: e.target.value }))} />
                </label>
              )}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <label className="field">
                  <span>Kategori</span>
                  <select value={form.kategoriMudaMudi} onChange={(e) => setForm((s) => ({ ...s, kategoriMudaMudi: e.target.value as any }))}>
                    <option value="pribumi">pribumi</option>
                    <option value="perantauan">perantauan</option>
                  </select>
                </label>
                {form.kategoriMudaMudi === "perantauan" && (
                  <label className="field">
                    <span>Asal Daerah *</span>
                    <input value={form.asalDaerah} onChange={(e) => setForm((s) => ({ ...s, asalDaerah: e.target.value }))} />
                  </label>
                )}
              </div>
              {err && <div style={{ fontSize: 12, color: "#b91c1c", background: "#fef2f2", border: "1px solid #fecaca", padding: "8px 10px", borderRadius: 10 }}>{err}</div>}
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>
                  Batal
                </button>
                <button type="submit" className="btn btn-primary">
                  <Upload size={14} /> Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
