import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import nodemailer from "nodemailer";
import { createResetToken, verifyResetToken, resetTokenMatches } from "@/lib/auth";
import { checkRateLimit } from "@/lib/cache";
import { getClientIp } from "@/lib/request-ip";

/**
 * Reset password dua langkah (tanpa akun login):
 *  1) POST { email }                → kirim tautan berisi token ke email terdaftar (respons selalu sama).
 *  2) POST { token, newPassword }   → ganti password; token 30 menit & sekali pakai.
 * Membutuhkan env SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, (opsional SMTP_FROM, NEXT_PUBLIC_APP_URL).
 */
const GENERIC = { success: true, message: "Jika email terdaftar, tautan reset password telah dikirim." };

async function sendResetEmail(to: string, link: string) {
  const host = process.env.SMTP_HOST;
  if (!host) {
    console.error("[reset-password] SMTP belum dikonfigurasi; email reset tidak terkirim.");
    return;
  }
  const transporter = nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT || 587),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
  });
  await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to,
    subject: "Reset Password GENCAR",
    text: `Klik tautan berikut untuk mengatur password baru (berlaku 30 menit):\n\n${link}\n\nAbaikan email ini jika Anda tidak memintanya.`,
  });
}

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request.headers);
    if (!checkRateLimit(`reset:${ip}`, 5, 15 * 60_000).success) {
      return NextResponse.json({ error: "Terlalu banyak percobaan. Coba lagi nanti." }, { status: 429 });
    }

    const body = await request.json().catch(() => ({}));
    const { email, token, newPassword } = body as { email?: unknown; token?: unknown; newPassword?: unknown };

    // ── Langkah 2: konfirmasi dengan token ──
    if (typeof token === "string" && token) {
      if (typeof newPassword !== "string" || newPassword.length < 8 || newPassword.length > 128) {
        return NextResponse.json({ error: "Password baru harus 8-128 karakter" }, { status: 400 });
      }
      const claims = await verifyResetToken(token);
      if (!claims) {
        return NextResponse.json({ error: "Tautan reset tidak valid atau sudah kedaluwarsa" }, { status: 400 });
      }
      const user = await db.query.users.findFirst({ where: eq(users.id, claims.userId) });
      if (!user || !(await resetTokenMatches(claims.pv, user.passwordHash))) {
        return NextResponse.json({ error: "Tautan reset tidak valid atau sudah dipakai" }, { status: 400 });
      }
      const passwordHash = await bcrypt.hash(newPassword, 12);
      await db.update(users).set({ passwordHash, passwordPlain: null }).where(eq(users.id, user.id));
      return NextResponse.json({ success: true, message: "Password berhasil diperbarui" });
    }

    // ── Langkah 1: minta tautan reset ──
    if (typeof email !== "string" || !email || email.length > 255) {
      return NextResponse.json({ error: "Email wajib diisi" }, { status: 400 });
    }
    const user = await db.query.users.findFirst({ where: eq(users.email, email.toLowerCase().trim()) });
    if (user) {
      const t = await createResetToken(user.id, user.passwordHash);
      const base = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
      await sendResetEmail(user.email, `${base}/login/forgot-password?token=${encodeURIComponent(t)}`).catch((e) =>
        console.error("[reset-password] gagal kirim email:", e?.message)
      );
    }
    return NextResponse.json(GENERIC);
  } catch (error) {
    console.error("Reset Password error:", error);
    return NextResponse.json({ error: "Terjadi kesalahan server" }, { status: 500 });
  }
}
