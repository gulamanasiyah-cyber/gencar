import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { generus, mandiri } from "@/lib/schema";
import { and, eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";

const ADMIN_ROLES = ["admin", "kmm_daerah", "admin_romantic_room", "pengurus_daerah", "tim_pnkb", "tim_pnkb_gambuh"];

/**
 * Identitas pemanggil untuk fitur Usia Mandiri: sesi login (cookie) ATAU
 * pasangan header x-nomor-unik + x-session-token milik peserta.
 */
export async function resolveParticipant(request: NextRequest): Promise<{ generusId: string | null; isAdmin: boolean }> {
  const session = await getSession();
  if (session) {
    return { generusId: session.generusId || null, isAdmin: ADMIN_ROLES.includes(session.role) };
  }
  const unik = request.headers.get("x-nomor-unik");
  const token = request.headers.get("x-session-token");
  if (unik && token) {
    const rows = await db
      .select({ generusId: mandiri.generusId, last: mandiri.lastSessionToken })
      .from(mandiri)
      .innerJoin(generus, eq(mandiri.generusId, generus.id))
      .where(and(eq(generus.nomorUnik, unik), eq(mandiri.lastSessionToken, token)))
      .limit(1);
    if (rows.length && rows[0].last && rows[0].last === token) return { generusId: rows[0].generusId, isAdmin: false };
  }
  return { generusId: null, isAdmin: false };
}
