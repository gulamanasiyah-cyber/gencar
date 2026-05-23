import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users, generus, mandiri } from "@/lib/schema";
import { eq, and } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";

export async function POST(request: NextRequest) {
  try {
    const { name, email, password, desaId, kelompokId, dapukan, jenisKelamin } = await request.json();

    if (!name || !email || !password || !desaId || !kelompokId || !dapukan || !jenisKelamin) {
      return NextResponse.json({ error: "Semua field wajib diisi" }, { status: 400 });
    }

    // 2. Check if Email already has an account
    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, email.toLowerCase()),
    });

    if (existingUser) {
      return NextResponse.json({ error: "Email sudah terdaftar" }, { status: 409 });
    }

    // 3. Create User
    const passwordHash = await bcrypt.hash(password, 12);
    const id = uuidv4();
    const validRoles = ["generus", "kelompok", "desa", "pengurus_daerah"];
    const assignedRole = validRoles.includes(dapukan) ? dapukan : "generus";

    // Auto-create Generus profile
    const generusId = uuidv4();
    const prefix = assignedRole === "generus" ? "G" : "P";
    const nomorUnik = `${prefix}-${Math.floor(100000 + Math.random() * 900000)}`;

    await db.insert(generus).values({
      id: generusId,
      nomorUnik,
      nama: name,
      jenisKelamin: jenisKelamin === "P" ? "P" : "L",
      kategoriUsia: "SMA", // default
      desaId: Number(desaId),
      kelompokId: Number(kelompokId),
      isGenerus: 1, // Ensure it appears in Data Generus
    });

    await db.insert(users).values({
      id,
      name,
      email: email.toLowerCase(),
      passwordHash,
      role: assignedRole,
      desaId: Number(desaId),
      kelompokId: Number(kelompokId),
      generusId: generusId,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Register error:", error);
    return NextResponse.json({ error: "Terjadi kesalahan server" }, { status: 500 });
  }
}
