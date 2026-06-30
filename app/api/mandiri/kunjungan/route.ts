
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { mandiriKunjungan, generus, mandiriPemilihan, mandiriRooms, formPanitiaDanPengurus, mandiri, mandiriDesa, settings, mandiriKegiatan, mandiriDaerah } from "@/lib/schema";
import { eq, sql, desc, isNotNull, and, or } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { aliasedTable } from "drizzle-orm";

export async function GET(request: NextRequest) {
    try {
        const session = await getSession();
        if (!session || !["admin", "admin_romantic_room", "tim_pnkb", "pengurus_daerah", "kmm_daerah"].includes(session.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        let kegiatanId = searchParams.get("kegiatanId") || "";
        if (!kegiatanId) {
            const activeSetting = await db.select().from(settings).where(eq(settings.key, "mandiri_active_kegiatan_id")).limit(1);
            kegiatanId = activeSetting[0]?.value || "";
        }

        const g1 = aliasedTable(generus, "g1");
        const g2 = aliasedTable(generus, "g2");
        const m1 = aliasedTable(mandiri, "m1");
        const m2 = aliasedTable(mandiri, "m2");
        const pan1 = aliasedTable(formPanitiaDanPengurus, "pan1");
        const pan2 = aliasedTable(formPanitiaDanPengurus, "pan2");
        const md1 = aliasedTable(mandiriDesa, "md1");
        const md2 = aliasedTable(mandiriDesa, "md2");
        const mda1 = aliasedTable(mandiriDaerah, "mda1");
        const mda2 = aliasedTable(mandiriDaerah, "mda2");

        // Get detailed pairing history
        const history = await db.select({
            id: mandiriKunjungan.id,
            roomId: mandiriKunjungan.roomId,
            roomNama: mandiriRooms.nama,
            createdAt: mandiriKunjungan.createdAt,
            // Pemilih (Pengirim)
            pemilihNomorUrut: m1.nomorUrut,
            pemilihNo: g1.nomorUnik,
            pemilihNama: g1.nama,
            pemilihStatus: sql<string>`CASE WHEN ${pan1.id} IS NOT NULL THEN 'Panitia' ELSE 'Peserta' END`,
            pemilihHasil: mandiriPemilihan.hasilPengirim,
            pemilihKota: mda1.nama,
            pemilihDesa: md1.nama,
            // Terpilih (Penerima)
            terpilihNomorUrut: m2.nomorUrut,
            terpilihNo: g2.nomorUnik,
            terpilihNama: g2.nama,
            terpilihStatus: sql<string>`CASE WHEN ${pan2.id} IS NOT NULL THEN 'Panitia' ELSE 'Peserta' END`,
            terpilihHasil: mandiriPemilihan.hasilPenerima,
            terpilihKota: mda2.nama,
            terpilihDesa: md2.nama,
            pemilihWa: sql<string>`COALESCE(${g1.noTelp}, ${pan1.noTelp})`,
            terpilihWa: sql<string>`COALESCE(${g2.noTelp}, ${pan2.noTelp})`,
            pemilihanId: mandiriKunjungan.pemilihanId,
            pemilihJenisKelamin: g1.jenisKelamin,
            terpilihJenisKelamin: g2.jenisKelamin
        })
        .from(mandiriKunjungan)
        .leftJoin(mandiriRooms, eq(mandiriKunjungan.roomId, mandiriRooms.id))
        .leftJoin(mandiriPemilihan, eq(mandiriKunjungan.pemilihanId, mandiriPemilihan.id))
        // Join for Pengirim (if selection exists) or the record holder
        .leftJoin(g1, eq(sql`COALESCE(${mandiriPemilihan.pengirimId}, ${mandiriKunjungan.generusId})`, g1.id))
        // Join for Penerima (only if selection exists)
        .leftJoin(g2, eq(mandiriPemilihan.penerimaId, g2.id))
        // Join Mandiri table to get Nomor Urut (Nomor Peserta based on gender)
        .leftJoin(m1, eq(g1.id, m1.generusId))
        .leftJoin(m2, eq(g2.id, m2.generusId))
        // Panitia Status
        .leftJoin(pan1, eq(g1.id, pan1.generusId))
        .leftJoin(pan2, eq(g2.id, pan2.generusId))
        // Join MandiriDesa using COALESCE to check both generus and panitia table
        .leftJoin(md1, eq(sql`COALESCE(${g1.mandiriDesaId}, ${pan1.mandiriDesaId})`, md1.id))
        .leftJoin(md2, eq(sql`COALESCE(${g2.mandiriDesaId}, ${pan2.mandiriDesaId})`, md2.id))
        .leftJoin(mda1, eq(md1.mandiriDaerahId, mda1.id))
        .leftJoin(mda2, eq(md2.mandiriDaerahId, mda2.id))
        .where(and(isNotNull(mandiriKunjungan.pemilihanId), eq(mandiriKunjungan.kegiatanId, kegiatanId)))
        .groupBy(mandiriKunjungan.pemilihanId)
        .orderBy(desc(mandiriKunjungan.createdAt));

        return NextResponse.json(history);
    } catch (error) {
        console.error("GET visit history error:", error);
        return NextResponse.json({ error: "Gagal mengambil riwayat kunjungan" }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const session = await getSession();
        if (!session || !["admin", "admin_romantic_room", "tim_pnkb"].includes(session.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { generusId, roomId } = body;

        if (!generusId || !roomId) {
            return NextResponse.json({ error: "Generus ID dan Room ID wajib diisi" }, { status: 400 });
        }

        const activeSetting = await db.select().from(settings).where(eq(settings.key, "mandiri_active_kegiatan_id")).limit(1);
        const kegiatanId = activeSetting[0]?.value || "";

        const id = crypto.randomUUID();
        await db.insert(mandiriKunjungan).values({
            id,
            generusId,
            roomId,
            kegiatanId,
            createdAt: sql`(datetime('now'))`
        });

        return NextResponse.json({ success: true, id });
    } catch (error) {
        console.error("POST visit error:", error);
        return NextResponse.json({ error: "Gagal menyimpan kunjungan" }, { status: 500 });
    }
}


