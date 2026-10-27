/**
 * Seed Admin Pertama — Gencar
 * Jalankan: npm run seed
 * 
 * Script ini membuat akun admin pertama di database Turso
 * agar bisa login ke dashboard.
 */
import "dotenv/config";
import { createClient } from "@libsql/client";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";

// ── Konfigurasi Admin Default ──
const ADMIN_NAME  = "Admin Gencar";
const ADMIN_EMAIL = "admin@gencar.com";
const ADMIN_PASS  = "Admin123!";

async function seed() {
  const url       = (process.env.TURSO_DATABASE_URL || "").trim();
  const authToken = (process.env.TURSO_AUTH_TOKEN   || "").trim();

  if (!url) {
    console.error("❌ TURSO_DATABASE_URL belum diset di .env!");
    process.exit(1);
  }

  console.log("📍 Database:", url);
  const client = createClient({ url, authToken });

  // 1. Cek apakah sudah ada user admin
  const existing = await client.execute({
    sql: "SELECT id, email, role FROM users WHERE role = ? LIMIT 1",
    args: ["admin"],
  });

  if (existing.rows.length > 0) {
    const row = existing.rows[0];
    console.log(`\n✅ Sudah ada akun admin: ${row.email} (role: ${row.role})`);
    console.log("   Tidak perlu seed ulang.");
    console.log(`\n🔑 Login dengan email: ${row.email}`);
    console.log("   (Password yang diset saat pembuatan akun)");
    process.exit(0);
  }

  // 2. Buat akun admin
  const id = uuidv4();
  const passwordHash = bcrypt.hashSync(ADMIN_PASS, 12);

  await client.execute({
    sql: `INSERT INTO users (id, name, email, password_hash, password_plain, role)
          VALUES (?, ?, ?, ?, ?, ?)`,
    args: [id, ADMIN_NAME, ADMIN_EMAIL, passwordHash, ADMIN_PASS, "admin"],
  });

  console.log("\n✅ AKUN ADMIN BERHASIL DIBUAT!");
  console.log("══════════════════════════════════════");
  console.log(`📧 Email    : ${ADMIN_EMAIL}`);
  console.log(`🔑 Password : ${ADMIN_PASS}`);
  console.log(`👤 Nama     : ${ADMIN_NAME}`);
  console.log(`🛡️  Role     : admin`);
  console.log("══════════════════════════════════════");
  console.log("\n⚠️  PENTING: Segera ganti password setelah login pertama!");
}

seed().catch((err) => {
  console.error("❌ Seed gagal:", err.message || err);
  process.exit(1);
});
