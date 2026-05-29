// Polyfill setImmediate for Edge Runtime
if (typeof globalThis.setImmediate === 'undefined') {
  (globalThis as any).setImmediate = (fn: any, ...args: any[]) => setTimeout(fn, 0, ...args);
}

export const runtime = "edge";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { setSession } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email dan password diperlukan" }, { status: 400 });
    }

    let user = await db.query.users.findFirst({
      where: eq(users.email, email.toLowerCase()),
    });

    // If not found in users, check users_old (Generus / Legacy)
    let isLegacy = false;
    if (!user) {
        const { users } = await import("@/lib/schema");
        user = await db.query.users.findFirst({
            where: eq(users.email, email.toLowerCase()),
        }) as any;
        if (user) isLegacy = true;
    }

    if (!user) {
      return NextResponse.json({ error: "Email atau password salah" }, { status: 401 });
    }

    const validPassword = bcrypt.compareSync(password, user.passwordHash);
    if (!validPassword) {
      return NextResponse.json({ error: "Email atau password salah" }, { status: 401 });
    }

    await setSession({
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      desaId: user.desaId,
      kelompokId: user.kelompokId,
      generusId: user.generusId,
    });

    return NextResponse.json({
      success: true,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json({ error: "Terjadi kesalahan server" }, { status: 500 });
  }
}
