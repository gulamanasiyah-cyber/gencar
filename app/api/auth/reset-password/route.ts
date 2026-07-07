// Polyfill setImmediate for Edge Runtime
if (typeof globalThis.setImmediate === 'undefined') {
  (globalThis as any).setImmediate = (fn: any, ...args: any[]) => setTimeout(fn, 0, ...args);
}
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import nodemailer from "nodemailer";

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: "Email wajib diisi" }, { status: 400 });
    }

    const lowerEmail = email.toLowerCase();
    const user = await db.query.users.findFirst({
      where: eq(users.email, lowerEmail),
    });

    if (!user) {
      // Kita kembalikan sukses saja untuk mencegah email enumeration (keamanan)
      // Tapi untuk simplicity bisa juga return error
      return NextResponse.json({ error: "Email tidak terdaftar dalam sistem" }, { status: 400 });
    }

    const defaultPassword = "gencar313";
    const passwordHash = bcrypt.hashSync(defaultPassword, 12);

    // Update password user di DB
    await db.update(users)
      .set({ passwordHash })
      .where(eq(users.id, user.id));

    // Kirim email lewat mudamudicengkareng@gmail.com
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: "mudamudicengkareng@gmail.com",
        pass: process.env.GMAIL_APP_PASSWORD, // Pastikan ini di-set di .env.local
      },
    });

    const mailOptions = {
      from: '"GENCAR" <mudamudicengkareng@gmail.com>',
      to: email,
      subject: "Reset Password - GENCAR",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
          <h2 style="color: #3b82f6; text-align: center;">Reset Password GENCAR</h2>
          <p>Halo, <strong>${user.name || "Pengguna"}</strong>,</p>
          <p>Anda baru saja mengajukan permohonan lupa password. Berikut adalah password default Anda yang baru:</p>
          <div style="background: #f1f5f9; padding: 16px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 2px; border-radius: 8px; margin: 20px 0;">
            ${defaultPassword}
          </div>
          <p>Silakan masuk menggunakan password di atas dan <strong>segera ubah password Anda</strong> setelah berhasil login demi keamanan akun Anda.</p>
          <p style="margin-top: 30px; font-size: 12px; color: #64748b; text-align: center;">
            Jika Anda tidak meminta reset password ini, abaikan email ini.
          </p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);

    return NextResponse.json({ success: true, message: "Password berhasil diperbarui dan dikirim ke email" });
  } catch (error) {
    console.error("Reset Password error:", error);
    return NextResponse.json({ error: "Terjadi kesalahan server saat mengirim email" }, { status: 500 });
  }
}
