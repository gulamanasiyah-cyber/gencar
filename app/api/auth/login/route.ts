// Polyfill setImmediate for Edge Runtime
if (typeof globalThis.setImmediate === 'undefined') {
  (globalThis as any).setImmediate = (fn: any, ...args: any[]) => setTimeout(fn, 0, ...args);
}

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { setSession } from "@/lib/auth";
import { loginSchema } from "@/lib/validation";
import { sanitizeString, detectPromptInjection } from "@/lib/sanitize";

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.json();

    // 1. Zod schema validation
    const parsed = loginSchema.safeParse(rawBody);
    if (!parsed.success) {
      const firstError = (parsed.error as any).issues?.[0]?.message || (parsed.error as any).errors?.[0]?.message || "Input tidak valid";
      return NextResponse.json({ error: firstError }, { status: 400 });
    }

    const { email, password } = parsed.data;

    // 2. Prompt injection detection
    if (detectPromptInjection(email) || detectPromptInjection(password)) {
      return NextResponse.json({ error: "Input ditolak" }, { status: 400 });
    }

    // 3. Sanitize email
    const cleanEmail = sanitizeString(email).toLowerCase();

    const user = await db.query.users.findFirst({
      where: eq(users.email, cleanEmail),
    });

    // Generic error message to prevent user enumeration
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
