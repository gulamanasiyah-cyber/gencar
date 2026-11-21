export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generus, users, desa, kelompok, absensi, mandiri, mandiriDesa, mandiriKelompok, mandiriDaerah } from "@/lib/schema";
import { eq, or } from "drizzle-orm";
import { getSession, JWTPayload } from "@/lib/auth";

// ── Hak akses ────────────────────────────────────────────────────────
// Staf boleh melihat data generus (dibatasi scope desa/kelompok lewat outOfScope).
const STAFF_VIEW_ROLES = ["admin", "pengurus_daerah", "kmm_daerah", "desa", "kelompok", "admin_romantic_room", "tim_pnkb", "tim_pnkb_gambuh", "admin_pdkt", "admin_kegiatan", "creator", "admin_keuangan"];
// Boleh mengubah/menghapus data generus.
const STAFF_EDIT_ROLES = ["admin", "pengurus_daerah", "kmm_daerah", "desa", "kelompok"];
// Boleh mengubah email/password akun.
const CREDENTIAL_ROLES = ["admin", "pengurus_daerah", "kmm_daerah"];
// Akun dengan peran ini hanya boleh diubah oleh admin.
const PRIVILEGED_ROLES = ["admin", "pengurus_daerah", "kmm_daerah"];
// Peran peserta yang boleh membuka profil katalog peserta lain.
const PARTICIPANT_ROLES = ["generus", "peserta", "usia_mandiri"];
// Disembunyikan dari peserta lain (profil katalog hanya menampilkan data non-pribadi).
const PRIVATE_FIELDS = ["noTelp", "noTelpOrtu", "alamat", "namaOrtu", "nomorUnik"] as const;

type Session = JWTPayload;
type Ctx = { params: { id: string } };

const NO_STORE = { "Cache-Control": "no-store, no-cache, must-revalidate" };
const fail = (error: string, status: number) => NextResponse.json({ error }, { status });
const forbidden = () => fail("Tidak diizinkan", 403);

/** Staf desa/kelompok hanya boleh menyentuh data di wilayahnya sendiri. */
function outOfScope(
  session: Pick<Session, "role" | "desaId" | "kelompokId">,
  row: { desaId: number | null; kelompokId: number | null }
) {
  if (session.role === "kelompok") return !session.kelompokId || row.kelompokId !== session.kelompokId;
  if (session.role === "desa") return !session.desaId || row.desaId !== session.desaId;
  return false;
}

const isSelfOf = (session: Session, generusId: string) => !!session.generusId && session.generusId === generusId;

/** Cari generus berdasarkan UUID atau nomor unik. */
async function findGenerus(id: string) {
  const [row] = await db.select().from(generus).where(or(eq(generus.id, id), eq(generus.nomorUnik, id))).limit(1);
  return row;
}

// Kolom dasar yang dipakai GET dan respons PUT.
const baseColumns = {
  id: generus.id,
  nomorUnik: generus.nomorUnik,
  nama: generus.nama,
  tempatLahir: generus.tempatLahir,
  tanggalLahir: generus.tanggalLahir,
  jenisKelamin: generus.jenisKelamin,
  kategoriUsia: generus.kategoriUsia,
  kategori: generus.kategori,
  namaOrtu: generus.namaOrtu,
  alamat: generus.alamat,
  noTelp: generus.noTelp,
  noTelpOrtu: generus.noTelpOrtu,
  pendidikan: generus.pendidikan,
  pekerjaan: generus.pekerjaan,
  statusNikah: generus.statusNikah,
  desaId: generus.desaId,
  kelompokId: generus.kelompokId,
  desaNama: desa.nama,
  kelompokNama: kelompok.nama,
  hobi: generus.hobi,
  makananMinumanFavorit: generus.makananMinumanFavorit,
  suku: generus.suku,
  foto: generus.foto,
  instagram: generus.instagram,
  role: users.role,
  createdAt: generus.createdAt,
};

// ── GET ──────────────────────────────────────────────────────────────
export async function GET(_request: NextRequest, { params }: Ctx) {
  try {
    const session = await getSession();
    if (!session) return fail("Unauthorized", 401);

    const rows = await db
      .select({
        ...baseColumns,
        kriteriaPasangan: generus.kriteriaPasangan,
        nomorUrut: mandiri.nomorUrut,
        mandiriDesaNama: mandiriDesa.nama,
        mandiriKelompokNama: mandiriKelompok.nama,
        kota: mandiriDaerah.nama,
      })
      .from(generus)
      .leftJoin(desa, eq(generus.desaId, desa.id))
      .leftJoin(kelompok, eq(generus.kelompokId, kelompok.id))
      .leftJoin(users, eq(generus.id, users.generusId))
      .leftJoin(mandiri, eq(generus.id, mandiri.generusId))
      .leftJoin(mandiriDesa, eq(generus.mandiriDesaId, mandiriDesa.id))
      .leftJoin(mandiriKelompok, eq(generus.mandiriKelompokId, mandiriKelompok.id))
      .leftJoin(mandiriDaerah, eq(mandiriDesa.mandiriDaerahId, mandiriDaerah.id))
      .where(or(eq(generus.id, params.id), eq(generus.nomorUnik, params.id)))
      .limit(1);

    const data = rows[0];
    if (!data) return fail("Data tidak ditemukan", 404);

    const isSelf = isSelfOf(session, data.id);
    const isStaff = STAFF_VIEW_ROLES.includes(session.role);

    if (!isSelf && !isStaff && !PARTICIPANT_ROLES.includes(session.role)) return forbidden();
    if (!isSelf && isStaff && outOfScope(session, data)) return forbidden();

    // Peserta lain hanya boleh melihat profil katalog (tanpa data pribadi / kredensial)
    if (!isSelf && !isStaff) {
      const safe: Record<string, unknown> = { ...data };
      for (const field of PRIVATE_FIELDS) delete safe[field];
      return NextResponse.json(safe, { headers: NO_STORE });
    }

    // no-store agar modal edit tidak pernah mendapat data lama dari cache
    return NextResponse.json(data, { headers: NO_STORE });
  } catch (error) {
    console.error("Generus GET[id] error:", error);
    return fail("Gagal mengambil data", 500);
  }
}

// ── PUT ──────────────────────────────────────────────────────────────
export async function PUT(request: NextRequest, { params }: Ctx) {
  try {
    const session = await getSession();
    if (!session) return fail("Unauthorized", 401);

    const existing = await findGenerus(params.id);
    if (!existing) return fail("Data tidak ditemukan", 404);
    const targetId = existing.id;

    const isStaffEditor = STAFF_EDIT_ROLES.includes(session.role);
    if (!isSelfOf(session, targetId) && (!isStaffEditor || outOfScope(session, existing))) return forbidden();

    const body = await request.json();
    const {
      nama, tempatLahir, tanggalLahir, jenisKelamin, kategoriUsia, kategori,
      namaOrtu, alamat, noTelp, noTelpOrtu, pendidikan, pekerjaan, statusNikah,
      desaId, kelompokId, mandiriDesaId, mandiriKelompokId,
      hobi, makananMinumanFavorit, suku, foto, instagram, kriteriaPasangan,
      email: customEmail, password: customPassword,
    } = body;

    // Field wilayah yang tidak dikirim dipertahankan (bukan di-null-kan).
    // Pengguna biasa (mengedit dirinya sendiri) tidak boleh pindah wilayah.
    const resolveId = (incoming: unknown, current: number | null | undefined) =>
      !isStaffEditor || incoming === undefined ? current ?? null : incoming ? Number(incoming) : null;
    const wilayah = {
      desaId: resolveId(desaId, existing.desaId),
      kelompokId: resolveId(kelompokId, existing.kelompokId),
      mandiriDesaId: resolveId(mandiriDesaId, existing.mandiriDesaId),
      mandiriKelompokId: resolveId(mandiriKelompokId, existing.mandiriKelompokId),
    };

    // Staf desa/kelompok tidak boleh memindahkan data keluar dari wilayahnya.
    if (isStaffEditor && outOfScope(session, wilayah)) return forbidden();

    // ── Validasi kredensial SEBELUM ada penulisan ke database ──
    const accountUpdate: Record<string, unknown> = {
      name: nama,
      ...wilayah,
    };
    if (customEmail || customPassword) {
      if (!CREDENTIAL_ROLES.includes(session.role)) return fail("Tidak diizinkan mengubah kredensial", 403);

      const linked = await db.query.users.findFirst({ where: eq(users.generusId, targetId) });
      if (linked && PRIVILEGED_ROLES.includes(linked.role) && session.role !== "admin") {
        return fail("Tidak diizinkan mengubah akun ini", 403);
      }
      if (customPassword && (typeof customPassword !== "string" || customPassword.length < 8 || customPassword.length > 128)) {
        return fail("Password harus 8-128 karakter", 400);
      }
      if (customEmail) accountUpdate.email = String(customEmail).toLowerCase().trim();
      if (customPassword) {
        const bcrypt = await import("bcryptjs");
        accountUpdate.passwordHash = await bcrypt.hash(customPassword, 12);
        accountUpdate.passwordPlain = null;
      }
    }

    await db
      .update(generus)
      .set({
        nama, tempatLahir, tanggalLahir, jenisKelamin, kategoriUsia, kategori,
        namaOrtu, alamat, noTelp, noTelpOrtu, pendidikan, pekerjaan, statusNikah,
        ...wilayah,
        hobi, makananMinumanFavorit, suku, foto, instagram, kriteriaPasangan,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(generus.id, targetId));

    // Sinkronkan nama, wilayah, dan (jika diizinkan) email/password ke tabel users
    await db.update(users).set(accountUpdate).where(eq(users.generusId, targetId));

    // Kembalikan data terbaru (dengan join desa & kelompok) agar frontend langsung sinkron
    const [updated] = await db
      .select(baseColumns)
      .from(generus)
      .leftJoin(desa, eq(generus.desaId, desa.id))
      .leftJoin(kelompok, eq(generus.kelompokId, kelompok.id))
      .leftJoin(users, eq(generus.id, users.generusId))
      .where(eq(generus.id, targetId))
      .limit(1);

    return NextResponse.json({ success: true, data: updated ?? null });
  } catch (error) {
    console.error("Generus PUT error:", error);
    return fail("Gagal mengupdate data", 500);
  }
}

// ── DELETE ───────────────────────────────────────────────────────────
export async function DELETE(_request: NextRequest, { params }: Ctx) {
  try {
    const session = await getSession();
    if (!session) return fail("Unauthorized", 401);

    const existing = await findGenerus(params.id);
    if (!existing) return fail("Data tidak ditemukan", 404);

    if (!STAFF_EDIT_ROLES.includes(session.role) || outOfScope(session, existing)) return forbidden();

    // Hapus absensi dulu: foreign key SQLite tanpa ON DELETE CASCADE akan menyebabkan error 500.
    // Akun user ikut terhapus lewat cascade pada users.generusId.
    await db.delete(absensi).where(eq(absensi.generusId, existing.id));
    await db.delete(generus).where(eq(generus.id, existing.id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Generus DELETE error:", error);
    return fail("Gagal menghapus data", 500);
  }
}
