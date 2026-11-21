
export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { mandiriKomentar, generus, mandiri } from "@/lib/schema";
import { v4 as uuidv4 } from "uuid";
import { resolveParticipant } from "@/lib/participant-auth";

import { eq, desc, and } from "drizzle-orm";

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const penerimaId = searchParams.get("penerimaId");
        const pengirimId = searchParams.get("pengirimId");

        const who = await resolveParticipant(request);
        if (!who.generusId && !who.isAdmin) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        // Hanya pemilik data (atau admin) yang boleh membaca komentar diterima / terkirim
        if (!who.isAdmin && (pengirimId ? pengirimId !== who.generusId : penerimaId !== who.generusId)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        if (pengirimId) {
            // Fetch comments sent by this user with recipient details
            const data = await db.select({
                id: mandiriKomentar.id,
                komentar: mandiriKomentar.komentar,
                createdAt: mandiriKomentar.createdAt,
                penerimaId: mandiriKomentar.penerimaId,
                penerimaNama: generus.nama,
                penerimaNoUrut: mandiri.nomorUrut
            })
            .from(mandiriKomentar)
            .innerJoin(generus, eq(mandiriKomentar.penerimaId, generus.id))
            .leftJoin(mandiri, eq(generus.id, mandiri.generusId))
            .where(eq(mandiriKomentar.pengirimId, pengirimId))
            .orderBy(desc(mandiriKomentar.createdAt))
            .limit(200);

            return NextResponse.json(data);
        }

        if (!penerimaId) {
            return NextResponse.json({ error: "penerimaId or pengirimId required" }, { status: 400 });
        }

        const data = await db.select({
            id: mandiriKomentar.id,
            komentar: mandiriKomentar.komentar,
            createdAt: mandiriKomentar.createdAt,
            pengirimId: mandiriKomentar.pengirimId,
            pengirimNama: mandiriKomentar.pengirimNama,
            isAnonim: mandiriKomentar.isAnonim,
            realPengirimNama: generus.nama,
            realPengirimNoUrut: mandiri.nomorUrut
        })
        .from(mandiriKomentar)
        .leftJoin(generus, eq(mandiriKomentar.pengirimId, generus.id))
        .leftJoin(mandiri, eq(generus.id, mandiri.generusId))
        .where(eq(mandiriKomentar.penerimaId, penerimaId))
        .orderBy(desc(mandiriKomentar.createdAt))
        .limit(50);

        // Identitas pengirim anonim hanya terlihat oleh admin
        const out = who.isAdmin ? data : data.map((c: any) => (c.isAnonim
            ? { ...c, pengirimId: null, realPengirimNama: null, realPengirimNoUrut: null }
            : c));
        return NextResponse.json(out);
    } catch (error) {
        console.error("GET komentar error:", error);
        return NextResponse.json({ error: "Gagal mengambil komentar" }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const who = await resolveParticipant(request);
        if (!who.generusId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const body = await request.json();
        const { penerimaId, pengirimNama, isAnonim } = body;
        const komentar = typeof body.komentar === "string" ? body.komentar.trim().slice(0, 1000) : "";
        const pengirimId = who.generusId; // jangan percaya pengirimId dari klien

        if (!penerimaId || typeof penerimaId !== "string" || !komentar || penerimaId === pengirimId) {
            return NextResponse.json({ error: "Data tidak lengkap" }, { status: 400 });
        }

        // Enforce one comment per recipient per sender
        if (pengirimId) {
            const alreadyCommentedToRecipient = await db.query.mandiriKomentar.findFirst({
                where: and(
                    eq(mandiriKomentar.pengirimId, pengirimId),
                    eq(mandiriKomentar.penerimaId, penerimaId)
                )
            });

            if (alreadyCommentedToRecipient) {
                return NextResponse.json({ error: "Anda sudah mengirimkan komentar kepada peserta ini." }, { status: 400 });
            }
        }

        const id = uuidv4();
        await db.insert(mandiriKomentar).values({
            id,
            penerimaId,
            pengirimId: pengirimId || null,
            pengirimNama: isAnonim ? "Anonim" : String(pengirimNama || "").slice(0, 100),
            isAnonim: isAnonim ? 1 : 0,
            komentar,
            createdAt: new Date().toISOString()
        });

        return NextResponse.json({ success: true, id });
    } catch (error) {
        console.error("POST komentar error:", error);
        return NextResponse.json({ error: "Gagal mengirim komentar" }, { status: 500 });
    }
}
