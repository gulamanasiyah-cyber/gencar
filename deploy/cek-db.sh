#!/usr/bin/env bash
# ==================================================================
#  Gencar — Pengecekan Database (libSQL / Turso)
# ==================================================================
[ -n "${BASH_VERSION:-}" ] || exec bash "$0" "$@"
set -euo pipefail

GC_APP="${GC_APP:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
. "$GC_APP/deploy/umum.sh"

langkah "Memeriksa Status Database Gencar di Container"

dc exec app node -e '
const { createClient } = require("@libsql/client");

const url = (process.env.TURSO_DATABASE_URL || "file:local.db").trim();
const authToken = (process.env.TURSO_AUTH_TOKEN || "").trim();

console.log("📍 DATABASE_URL :", url.startsWith("libsql://") ? url.split("@")[0] : url);
console.log("🔑 AUTH_TOKEN   :", authToken ? "Tersedia (" + authToken.slice(0, 10) + "...)" : "Tidak ada / Kosong");

const client = createClient({ url, authToken });

async function test() {
  try {
    console.log("\n🔄 Menghubungi database...");
    const res = await client.execute("SELECT name FROM sqlite_master WHERE type=\"table\"");
    const tables = res.rows.map(r => r[0] || r.name);
    console.log("✅ KONEKSI BERHASIL!");
    console.log("📊 Daftar Tabel:", tables.length > 0 ? tables.join(", ") : "(Belum ada tabel!)");
    
    if (!tables.includes("users")) {
      console.log("\n⚠️  PERINGATAN: Tabel \"users\" BELUM ADA di database!");
      console.log("   Penyebab login gagal adalah karena tabel belum dibuat.");
      console.log("   Solusi: Jalankan \"npm run db:push\" dari laptop untuk membuat tabel.");
    } else {
      const users = await client.execute("SELECT count(*) as total FROM users");
      const total = users.rows[0].total ?? users.rows[0][0];
      console.log("👥 Total User di tabel \"users\":", total);
      if (total === 0) {
        console.log("⚠️  Tabel \"users\" masih kosong (belum ada akun terdaftar).");
      }
    }
  } catch (err) {
    console.error("\n❌ GAGAL MENGHUBUNGI DATABASE!");
    console.error("Pesan Error:", err.message || err);
    if (err.message && err.message.includes("URL_INVALID")) {
      console.error("👉 Penyebab: Nilai TURSO_DATABASE_URL di file .env tidak valid.");
    } else if (err.message && err.message.includes("UNAUTHORIZED")) {
      console.error("👉 Penyebab: TURSO_AUTH_TOKEN salah atau kadaluarsa.");
    }
  }
}

test();
'
