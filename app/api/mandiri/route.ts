export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { mandiri, generus, desa, kelompok, mandiriDesa, mandiriKelompok, users, mandiriKegiatan, mandiriAbsensi } from "@/lib/schema";
import { eq, and, or, like, sql, desc } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { v4 as uuidv4 } from "uuid";

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const allowedRoles = ["admin", "pengurus_daerah", "kmm_daerah", "admin_romantic_room", "admin_keuangan", "admin_kegiatan"];
    if (!allowedRoles.includes(session.role)) {
      return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const search = (searchParams.get("search") || "").trim();
    const page = Number(searchParams.get("page") || "1");
    const limit = Number(searchParams.get("limit") || "20");
    const offset = (page - 1) * limit;

    const conditions = [];

    if (search) {
      if (/^\d+$/.test(search)) {
        conditions.push(eq(mandiri.nomorUrut, Number(search)));
      } else {
        conditions.push(
          or(
            like(generus.nama, `%${search}%`),
            like(generus.nomorUnik, `%${search}%`),
            like(mandiriDesa.nama, `%${search}%`),
            like(mandiriDesa.kota, `%${search}%`)
          )
        );
      }
    }

    const sort = searchParams.get("sort") || ""; // "asc" or "desc"

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Determine order
    let orderClause: any = desc(mandiri.createdAt);
    if (sort === "asc") {
      orderClause = sql`${mandiri.nomorUrut} ASC`;
    } else if (sort === "desc") {
      orderClause = sql`${mandiri.nomorUrut} DESC`;
    }

    // Get the latest activity
    const latestActivity = await db.select({ id: mandiriKegiatan.id }).from(mandiriKegiatan).orderBy(desc(mandiriKegiatan.tanggal)).limit(1);
    const kegiatanId = latestActivity[0]?.id || "";

    // Optimized Data Query - Based on MANDIRI table
    const dataQuery = db
      .select({
        id: mandiri.id, 
        nomorUrut: mandiri.nomorUrut,
        statusMandiri: mandiri.statusMandiri,
        catatan: mandiri.catatan,
        generusId: mandiri.generusId,
        nama: generus.nama,
        nomorUnik: generus.nomorUnik,
        jenisKelamin: generus.jenisKelamin,
        kategoriUsia: generus.kategoriUsia,
        desaKota: sql<string>`COALESCE(${mandiriDesa.kota}, 'Luar JB2')`,
        desaNama: sql<string>`COALESCE(${mandiriDesa.nama}, ${desa.nama}, 'N/A')`,
        kelompokNama: sql<string>`COALESCE(${mandiriKelompok.nama}, ${kelompok.nama}, 'N/A')`,
        noTelp: generus.noTelp,
        foto: generus.foto,
        createdAt: mandiri.createdAt,
        userId: users.id,
        isHadir: sql<number>`CASE WHEN ${mandiriAbsensi.id} IS NOT NULL THEN 1 ELSE 0 END`,
        waktuHadir: mandiriAbsensi.timestamp,
        keterangan: mandiriAbsensi.keterangan,
      })
      .from(mandiri)
      .innerJoin(generus, eq(mandiri.generusId, generus.id))
      .leftJoin(users, eq(generus.id, users.generusId))
      .leftJoin(desa, eq(generus.desaId, desa.id))
      .leftJoin(kelompok, eq(generus.kelompokId, kelompok.id))
      .leftJoin(mandiriDesa, eq(generus.mandiriDesaId, mandiriDesa.id))
      .leftJoin(mandiriKelompok, eq(generus.mandiriKelompokId, mandiriKelompok.id))
      .leftJoin(mandiriAbsensi, and(
        eq(generus.id, mandiriAbsensi.generusId),
        eq(mandiriAbsensi.kegiatanId, kegiatanId)
      ))
      .where(whereClause)
      .limit(limit)
      .offset(offset)
      .orderBy(orderClause);

    // Optimized Count Query
    const countQuery = db
      .select({ count: sql<number>`count(*)` })
      .from(mandiri)
      .innerJoin(generus, eq(mandiri.generusId, generus.id));

    if (search && !/^\d+$/.test(search)) {
      countQuery.leftJoin(mandiriDesa, eq(generus.mandiriDesaId, mandiriDesa.id));
    }

    const countResult = await countQuery.where(whereClause);

    const data = await dataQuery;

    return NextResponse.json({
      data,
      total: Number(countResult[0]?.count || 0),
      page,
      limit,
    }, {
      headers: { "Cache-Control": "private, s-maxage=30, stale-while-revalidate=60" }
    });
  } catch (error) {
    console.error("Mandiri GET error:", error);
    return NextResponse.json({ error: "Gagal mengambil data" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const allowedRoles = ["admin_romantic_room", "admin", "pengurus_daerah", "kmm_daerah"];
    if (!allowedRoles.includes(session.role)) {
      return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
    }

    // Check Deadline for non-admins
    if (session.role !== "admin") {
      const settingsTable = (await import("@/lib/schema")).settings;
      const statusSet = await db.select().from(settingsTable).where(eq(settingsTable.key, "mandiri_registration_status"));
      if (statusSet[0]?.value === "0") {
        return NextResponse.json({ error: "Pendaftaran saat ini ditutup manual oleh admin. Penambahan manual dikunci." }, { status: 403 });
      }
    }

    const body = await request.json();
    const { generusId, statusMandiri, catatan } = body;

    if (!generusId) {
      return NextResponse.json({ error: "Generus ID wajib diisi" }, { status: 400 });
    }

    // Check if already in list
    const existing = await db.query.mandiri.findFirst({
      where: eq(mandiri.generusId, generusId),
    });

    if (existing) {
      return NextResponse.json({ error: "Generus ini sudah ada dalam daftar Mandiri" }, { status: 400 });
    }

    // Fetch participant gender to determine numbering range
    const genData = await db.query.generus.findFirst({
        where: eq(generus.id, generusId),
        columns: { jenisKelamin: true, nama: true, nomorUnik: true, desaId: true, kelompokId: true, mandiriDesaId: true, mandiriKelompokId: true }
    });
    
    if (!genData) {
        return NextResponse.json({ error: "Data Generus tidak ditemukan" }, { status: 404 });
    }

    const { jenisKelamin } = genData;

    // Calculate next nomorUrut based on gender
    // Laki-laki: 1-199, Perempuan: 200+
    let nextNr;
    if (jenisKelamin === "L") {
        const lastRes = await db.select({ maxNr: sql<number>`max(${mandiri.nomorUrut})` })
            .from(mandiri)
            .where(sql`${mandiri.nomorUrut} < 200`);
        nextNr = (lastRes[0]?.maxNr || 0) + 1;
    } else {
        const lastRes = await db.select({ maxNr: sql<number>`max(${mandiri.nomorUrut})` })
            .from(mandiri)
            .where(sql`${mandiri.nomorUrut} >= 200`);
        nextNr = Math.max(lastRes[0]?.maxNr || 199, 199) + 1;
    }

    const id = uuidv4();
    await db.insert(mandiri).values({
      id,
      generusId,
      nomorUrut: nextNr,
      statusMandiri: statusMandiri || "Aktif",
      catatan,
    });

    // Remove from youth category (isGenerus = 0) and cleanup old account
    await db.update(generus).set({ isGenerus: 0 }).where(eq(generus.id, generusId));
    await db.delete(users).where(eq(users.generusId, generusId));

    // AUTO-SYNC USER ACCOUNT to 'peserta' role
    if (genData) {
      const existingUser = await db.query.users.findFirst({ where: eq(users.generusId, generusId) });
      if (!existingUser) {
        // Create account with participant's nomor unik as initial password
        const passwordHash = await (await import("bcryptjs")).hash(genData.nomorUnik, 10);
        await db.insert(users).values({
          id: uuidv4(),
          name: genData.nama,
          email: `${genData.nomorUnik.toLowerCase()}@gencar.com`, // Default email since admin may not have it
          passwordHash,
          role: "peserta",
          generusId: generusId,
          desaId: genData.desaId,
          kelompokId: genData.kelompokId,
          mandiriDesaId: genData.mandiriDesaId,
          mandiriKelompokId: genData.mandiriKelompokId,
        });
      } else if (existingUser.role === "generus" || existingUser.role === "pending") {
          await db.update(users).set({ role: "peserta" }).where(eq(users.id, existingUser.id));
      }
    }

    return NextResponse.json({ success: true, id, nomorUrut: nextNr });
  } catch (error) {
    console.error("Mandiri POST error:", error);
    return NextResponse.json({ error: "Gagal menyimpan data" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { id: mandiriId, statusMandiri, catatan, resetDevice } = body;

    if (!mandiriId) return NextResponse.json({ error: "ID wajib diisi" }, { status: 400 });

    const entry = await db.query.mandiri.findFirst({ where: eq(mandiri.id, mandiriId) });
    if (!entry) return NextResponse.json({ error: "Data pendaftaran tidak ditemukan" }, { status: 404 });

    const updateData: any = { statusMandiri, catatan, updatedAt: sql`(datetime('now'))` };
    if (resetDevice) updateData.deviceId = null;

    await db.update(mandiri)
      .set(updateData)
      .where(eq(mandiri.id, mandiriId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Mandiri PUT error:", error);
    return NextResponse.json({ error: "Gagal update data" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const allowedRoles = ["admin", "admin_romantic_room", "pengurus_daerah", "kmm_daerah"];
    if (!allowedRoles.includes(session.role)) {
      return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const mandiriId = searchParams.get("id");

    if (!mandiriId) return NextResponse.json({ error: "ID wajib diisi" }, { status: 400 });

    const entry = await db.query.mandiri.findFirst({ where: eq(mandiri.id, mandiriId) });
    if (!entry) return NextResponse.json({ error: "Data tidak ditemukan" }, { status: 404 });

    // Hapus data generus (otomatis menghapus dari daftar mandiri & akun user via cascade)
    await db.delete(generus).where(eq(generus.id, entry.generusId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Mandiri DELETE error:", error);
    return NextResponse.json({ error: "Gagal menghapus data" }, { status: 500 });
  }
}
