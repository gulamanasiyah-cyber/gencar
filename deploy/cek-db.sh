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
let createClient;
try {
  createClient = require("@libsql/client/web").createClient;
} catch (e) {
  try {
    createClient = require("@libsql/client").createClient;
  } catch (err2) {
    console.error("❌ Gagal memuat driver @libsql/client:", err2.message);
    process.exit(1);
  }
}

const overrideArg = process.argv[1] || "";
let url = (process.env.TURSO_DATABASE_URL || "").trim();
let authToken = (process.env.TURSO_AUTH_TOKEN || "").trim();

if (overrideArg) {
  if (overrideArg.startsWith("libsql://") || overrideArg.startsWith("https://") || overrideArg.startsWith("http://")) {
    url = overrideArg;
  } else {
    authToken = overrideArg;
  }
}

console.log("📍 DATABASE_URL :", url ? (url.startsWith("libsql://") ? url.split("@")[0] : url) : "(Kosong / Belum diset)");
console.log("🔑 AUTH_TOKEN   :", authToken ? "Tersedia (" + authToken.slice(0, 10) + "...)" : "Tidak ada / Kosong");

if (!url) {
  console.error("\n❌ TURSO_DATABASE_URL belum diatur di file .env container!");
  console.error("👉 Silakan isi TURSO_DATABASE_URL dan TURSO_AUTH_TOKEN di file .env di server.");
  process.exit(1);
}

const client = createClient({ url, authToken });

async function test() {
  try {
    console.log("\n🔄 Menghubungi database...");
    const res = await client.execute({sql: "SELECT name FROM sqlite_master WHERE type=?", args: ["table"]});
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
    } else if (err.message && (err.message.includes("UNAUTHORIZED") || err.message.includes("401"))) {
      console.error("👉 Penyebab: TURSO_AUTH_TOKEN salah atau kadaluarsa.");
    }
  }
}

test();
' "$@"
