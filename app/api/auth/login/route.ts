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
import { resetRateLimit, checkRateLimit } from "@/lib/cache";
import { getClientIp } from "@/lib/request-ip";
import { sanitizeString, detectPromptInjection } from "@/lib/sanitize";

// Hash dummy untuk menyamakan waktu respons saat email tidak ditemukan (anti user-enumeration via timing)
const DUMMY_HASH = "$2a$12$C6UzMDM.H6dfI/f/IKcEeO5RtEGnYwpwk5b5Q4cZ7oJz1m5rXK1Wa";
const MAX_FAILED = 8;
const WINDOW_MS = 15 * 60_000;

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

    // 1.5 Rate Limiting (Pencegahan Brute-Force)
    const ip = getClientIp(request.headers);
    const rlKeyAcc = `login-acc:${email}`;
    if (!checkRateLimit(`login-ip:${ip}`, 30, WINDOW_MS).success || !checkRateLimit(rlKeyAcc, MAX_FAILED, WINDOW_MS).success) {
      return NextResponse.json({ error: "Terlalu banyak percobaan. Silakan coba lagi dalam 15 menit." }, { status: 429 });
    }

    // 2. Prompt injection detection (hanya cek email agar user dengan password unik tidak terblokir)
    if (detectPromptInjection(email)) {
      return NextResponse.json({ error: "Input ditolak" }, { status: 400 });
    }

    // 3. Sanitize email
    const cleanEmail = sanitizeString(email).toLowerCase();

    const user = await db.query.users.findFirst({
      where: eq(users.email, cleanEmail),
    });

    // Generic error message to prevent user enumeration
    if (!user) {
      await bcrypt.compare(password, DUMMY_HASH);
      return NextResponse.json({ error: "Email atau password salah" }, { status: 401 });
    }

    const validPassword = await bcrypt.compare(password, user.passwordHash);
    if (!validPassword) {
      return NextResponse.json({ error: "Email atau password salah" }, { status: 401 });
    }

    resetRateLimit(rlKeyAcc);
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
