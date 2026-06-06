
export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { mandiriPemilihan, users, generus, mandiriAntrean, mandiri, formPanitiaDanPengurus, mandiriDesa, mandiriAbsensi, mandiriKegiatan } from "@/lib/schema";
import { eq, and, or, count, desc, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/sqlite-core";
import { getSession } from "@/lib/auth";
import { v4 as uuidv4 } from "uuid";

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const nomorUnikReq = searchParams.get("nomorUnik");
        const tokenReq = searchParams.get("token");

        let currentGenerusId: string | null = null;
        let isAdmin = false;

        const session = await getSession();
        if (session) {
            currentGenerusId = session.generusId || null;
            isAdmin = ["admin", "kmm_daerah", "admin_romantic_room", "pengurus_daerah", "tim_pnkb"].includes(session.role);
        }

        // If not logged in but has token, verify token
        if (!currentGenerusId && nomorUnikReq && tokenReq) {
            const m = await db.select({ generusId: mandiri.generusId, lastSessionToken: mandiri.lastSessionToken })
                .from(mandiri)
                .innerJoin(generus, eq(mandiri.generusId, generus.id))
                .where(eq(generus.nomorUnik, nomorUnikReq))
                .limit(1);
            if (m.length > 0 && (m[0].lastSessionToken === tokenReq || m[0].lastSessionToken === null)) {
                currentGenerusId = m[0].generusId;
            }
        }

        if (!currentGenerusId && !isAdmin) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        if (isAdmin && searchParams.get("all") === "true") {
            const latestActivity = await db.select({ id: mandiriKegiatan.id }).from(mandiriKegiatan).orderBy(desc(mandiriKegiatan.tanggal)).limit(1);
            const kegiatanId = latestActivity[0]?.id || "";

            const g1 = alias(generus, "g1");
            const g2 = alias(generus, "g2");
            const m1 = alias(mandiri, "m1");
            const m2 = alias(mandiri, "m2");
            const pan1 = alias(formPanitiaDanPengurus, "pan1");
            const pan2 = alias(formPanitiaDanPengurus, "pan2");
            const md1 = alias(mandiriDesa, "md1");
            const md2 = alias(mandiriDesa, "md2");
            const abs1 = alias(mandiriAbsensi, "abs1");
            const abs2 = alias(mandiriAbsensi, "abs2");

            const allSelections = await db.select({
                id: mandiriPemilihan.id,
                status: mandiriPemilihan.status,
                createdAt: mandiriPemilihan.createdAt,
                pengirimNama: g1.nama,
                pengirimNo: g1.nomorUnik,
                pengirimNomorUrut: m1.nomorUrut,
                pengirimStatus: sql<string>`CASE WHEN ${pan1.id} IS NOT NULL THEN 'Panitia' ELSE 'Peserta' END`,
                pengirimKota: md1.kota,
                pengirimDesa: md1.nama,
                penerimaNama: g2.nama,
                penerimaNo: g2.nomorUnik,
                penerimaNomorUrut: m2.nomorUrut,
                penerimaStatus: sql<string>`CASE WHEN ${pan2.id} IS NOT NULL THEN 'Panitia' ELSE 'Peserta' END`,
                penerimaKota: md2.kota,
                penerimaDesa: md2.nama,
                pengirimWa: sql<string>`COALESCE(${g1.noTelp}, ${pan1.noTelp})`,
                penerimaWa: sql<string>`COALESCE(${g2.noTelp}, ${pan2.noTelp})`,
                pengirimJenisKelamin: g1.jenisKelamin,
                penerimaJenisKelamin: g2.jenisKelamin,
                pengirimKeterangan: abs1.keterangan,
                penerimaKeterangan: abs2.keterangan
            })
            .from(mandiriPemilihan)
            .innerJoin(g1, eq(mandiriPemilihan.pengirimId, g1.id))
            .innerJoin(g2, eq(mandiriPemilihan.penerimaId, g2.id))
            .leftJoin(m1, eq(g1.id, m1.generusId))
            .leftJoin(m2, eq(g2.id, m2.generusId))
            .leftJoin(pan1, eq(g1.id, pan1.generusId))
            .leftJoin(pan2, eq(g2.id, pan2.generusId))
            .leftJoin(md1, eq(sql`COALESCE(${g1.mandiriDesaId}, ${pan1.mandiriDesaId})`, md1.id))
            .leftJoin(md2, eq(sql`COALESCE(${g2.mandiriDesaId}, ${pan2.mandiriDesaId})`, md2.id))
            .leftJoin(abs1, and(eq(g1.id, abs1.generusId), eq(abs1.kegiatanId, kegiatanId)))
            .leftJoin(abs2, and(eq(g2.id, abs2.generusId), eq(abs2.kegiatanId, kegiatanId)))
            .orderBy(desc(mandiriPemilihan.createdAt));

            return NextResponse.json(allSelections);
        }

        const targetPengirimId = searchParams.get("pengirimId") || currentGenerusId;
        if (!targetPengirimId) return NextResponse.json({ error: "Identitas tidak ditemukan" }, { status: 400 });

        const selections = await db.select({
            id: mandiriPemilihan.id,
            status: mandiriPemilihan.status,
            penerimaId: mandiriPemilihan.penerimaId,
            createdAt: mandiriPemilihan.createdAt,
            penerimaNama: generus.nama,
            penerimaNo: generus.nomorUnik,
            penerimaNoUrut: mandiri.nomorUrut
        })
        .from(mandiriPemilihan)
        .innerJoin(generus, eq(mandiriPemilihan.penerimaId, generus.id))
        .leftJoin(mandiri, eq(generus.id, mandiri.generusId))
        .where(eq(mandiriPemilihan.pengirimId, targetPengirimId))
        .orderBy(desc(mandiriPemilihan.createdAt));

        return NextResponse.json(selections);
    } catch (error) {
        console.error("GET selection error:", error);
        return NextResponse.json({ error: "Gagal mengambil data" }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { targetId, nomorUnik, token } = body;

        let pengirimId: string | null = null;

        const session = await getSession();
        if (session) {
            pengirimId = session.generusId || null;
        }

        // Token validation for independent participants
        if (!pengirimId && nomorUnik && token) {
            // Try exact token match first
            const m = await db.select({ generusId: mandiri.generusId, lastSessionToken: mandiri.lastSessionToken })
                .from(mandiri)
                .innerJoin(generus, eq(mandiri.generusId, generus.id))
                .where(eq(generus.nomorUnik, nomorUnik))
                .limit(1);
            if (m.length > 0 && (m[0].lastSessionToken === token || m[0].lastSessionToken === null)) {
                pengirimId = m[0].generusId;
            }
        }

        if (!pengirimId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        if (!targetId) return NextResponse.json({ error: "Target pilihan tidak valid" }, { status: 400 });
        if (pengirimId === targetId) return NextResponse.json({ error: "Tidak dapat memilih diri sendiri" }, { status: 400 });

        // Block selection if target is logged out (pulang)
        const latestActivity = await db.select({ id: mandiriKegiatan.id }).from(mandiriKegiatan).orderBy(desc(mandiriKegiatan.tanggal)).limit(1);
        const kegiatanId = latestActivity[0]?.id;
        if (kegiatanId) {
            const targetAbs = await db.select({ keterangan: mandiriAbsensi.keterangan })
                .from(mandiriAbsensi)
                .where(and(eq(mandiriAbsensi.generusId, targetId), eq(mandiriAbsensi.kegiatanId, kegiatanId)))
                .limit(1);
            if (targetAbs.length > 0 && targetAbs[0].keterangan === "pulang") {
                return NextResponse.json({ error: "Peserta yang Anda pilih sudah logout (pulang)" }, { status: 400 });
            }
        }

        // Check if already selected
        const existing = await db.query.mandiriPemilihan.findFirst({
            where: and(eq(mandiriPemilihan.pengirimId, pengirimId), eq(mandiriPemilihan.penerimaId, targetId))
        });
        if (existing) return NextResponse.json({ error: "Anda sudah memilih peserta ini" }, { status: 400 });

        // Count active selections from this sender (max 3)
        const activeCount = await db.select({ value: count() }).from(mandiriPemilihan)
            .where(and(eq(mandiriPemilihan.pengirimId, pengirimId), or(eq(mandiriPemilihan.status, "Menunggu"), eq(mandiriPemilihan.status, "Diterima"))));
        
        const countVal = Number(activeCount[0]?.value || 0);
        if (countVal >= 3) {
             return NextResponse.json({ error: "Anda telah mencapai batas maksimum 3 pemilihan" }, { status: 403 });
        }

        // Count how many times the target has been selected by others (max 5)
        const targetActiveCount = await db.select({ value: count() }).from(mandiriPemilihan)
            .where(and(eq(mandiriPemilihan.penerimaId, targetId), or(eq(mandiriPemilihan.status, "Menunggu"), eq(mandiriPemilihan.status, "Diterima"), eq(mandiriPemilihan.status, "Selesai"))));
        
        const targetCountVal = Number(targetActiveCount[0]?.value || 0);
        if (targetCountVal >= 5) {
             return NextResponse.json({ error: "Peserta ini sudah mencapai batas maksimum terpilih (5 kali)" }, { status: 403 });
        }

        const id = uuidv4();
        await db.insert(mandiriPemilihan).values({
            id,
            pengirimId,
            penerimaId: targetId,
            status: "Menunggu"
        });

        // Optimization: Return the updated selections list directly
        const updatedSelections = await db.select({
            id: mandiriPemilihan.id,
            status: mandiriPemilihan.status,
            penerimaId: mandiriPemilihan.penerimaId,
            createdAt: mandiriPemilihan.createdAt,
            penerimaNama: generus.nama,
            penerimaNo: generus.nomorUnik,
            penerimaNoUrut: mandiri.nomorUrut
        })
        .from(mandiriPemilihan)
        .innerJoin(generus, eq(mandiriPemilihan.penerimaId, generus.id))
        .leftJoin(mandiri, eq(generus.id, mandiri.generusId))
        .where(eq(mandiriPemilihan.pengirimId, pengirimId))
        .orderBy(desc(mandiriPemilihan.createdAt));

        return NextResponse.json({ success: true, id, selections: updatedSelections });
    } catch (error) {
        console.error("POST selection error:", error);
        return NextResponse.json({ error: "Gagal memproses pilihan" }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const targetId = searchParams.get("targetId");
        const nomorUnik = searchParams.get("nomorUnik");
        const token = searchParams.get("token");

        let pengirimId: string | null = null;

        const session = await getSession();
        if (session) {
            pengirimId = session.generusId || null;
        }

        // Token validation for independent participants
        if (!pengirimId && nomorUnik && token) {
            const m = await db.select({ generusId: mandiri.generusId, lastSessionToken: mandiri.lastSessionToken })
                .from(mandiri)
                .innerJoin(generus, eq(mandiri.generusId, generus.id))
                .where(eq(generus.nomorUnik, nomorUnik))
                .limit(1);
            if (m.length > 0 && (m[0].lastSessionToken === token || m[0].lastSessionToken === null)) {
                pengirimId = m[0].generusId;
            }
        }

        if (!pengirimId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        if (!targetId) return NextResponse.json({ error: "Target pilihan tidak valid" }, { status: 400 });

        const selection = await db.query.mandiriPemilihan.findFirst({
            where: and(eq(mandiriPemilihan.pengirimId, pengirimId), eq(mandiriPemilihan.penerimaId, targetId))
        });

        if (!selection) return NextResponse.json({ error: "Data pilihan tidak ditemukan" }, { status: 404 });
        
        if (selection.status !== "Menunggu") {
            return NextResponse.json({ error: "Pilihan yang sudah diproses oleh admin tidak dapat dibatalkan" }, { status: 400 });
        }

        await db.delete(mandiriPemilihan)
            .where(and(eq(mandiriPemilihan.pengirimId, pengirimId), eq(mandiriPemilihan.penerimaId, targetId)));

        const updatedSelections = await db.select({
            id: mandiriPemilihan.id,
            status: mandiriPemilihan.status,
            penerimaId: mandiriPemilihan.penerimaId,
            createdAt: mandiriPemilihan.createdAt,
            penerimaNama: generus.nama,
            penerimaNo: generus.nomorUnik,
            penerimaNoUrut: mandiri.nomorUrut
        })
        .from(mandiriPemilihan)
        .innerJoin(generus, eq(mandiriPemilihan.penerimaId, generus.id))
        .leftJoin(mandiri, eq(generus.id, mandiri.generusId))
        .where(eq(mandiriPemilihan.pengirimId, pengirimId))
        .orderBy(desc(mandiriPemilihan.createdAt));

        return NextResponse.json({ success: true, selections: updatedSelections });
    } catch (error) {
        console.error("DELETE selection error:", error);
        return NextResponse.json({ error: "Gagal membatalkan pilihan" }, { status: 500 });
    }
}
