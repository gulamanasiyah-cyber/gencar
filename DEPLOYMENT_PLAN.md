# Panduan & Rencana Deployment Cloudflare (Gencar Fullstack)

Dokumen ini memuat panduan komprehensif, arsitektur, dan langkah demi langkah untuk men-deploy aplikasi **Gencar** ke infrastruktur **Cloudflare** (Cloudflare Workers, D1, R2, Cron Triggers, Assets).

---

## 1. Arsitektur Fullstack di Cloudflare

Aplikasi Gencar dirancang dengan arsitektur **Single Cloudflare Worker** yang menyatukan Backend API dan Frontend SPA dalam satu domain:

```
                  ┌──────────────────────────────────────────────┐
                  │          Cloudflare Edge Network             │
                  │                                              │
  User Browser ───►  Cloudflare Worker ("gencar-api")            │
                  │  ├── [Assets Binding] -> Frontend Vite SPA   │
                  │  │   (Routing client-side /admin, /login, dll)
                  │  │                                           │
                  │  ├── [Hono REST API]  -> /api/*              │
                  │  │   ├── Autentikasi JWT (jose)              │
                  │  │   ├── Proteksi CSRF & Rate Limiting       │
                  │  │   └── RBAC (admin_daerah/desa/kelompok)   │
                  │  │                                           │
                  │  ├── [Cron Trigger]   -> */15 * * * *        │
                  │  │   └── Sweep absensi alpha otomatis        │
                  │  │                                           │
                  │  ├── [D1 Database]    -> binding "DB"        │
                  │  └── [R2 Storage]     -> binding "R2_BUCKET" │
                  └──────────────────────────────────────────────┘
```

---

## 2. Resource Cloudflare yang Diperlukan

| Service Cloudflare | Binding di Kode | Nama Resource | Fungsi Utama |
|---|---|---|---|
| **Cloudflare Workers** | `-` | `gencar-api` | Menjalankan serverless backend Hono & asset server |
| **Worker Assets (SPA)** | `ASSETS` | `frontend/dist` | Menyajikan SPA React dengan fallback client routing |
| **Cloudflare D1** | `DB` | `gencar-db` | Database SQLite relasional di edge |
| **Cloudflare R2** | `R2_BUCKET` | `gencar-uploads` | Object storage foto profil, bukti izin, galeri, cover |
| **Cron Triggers** | `-` | `*/15 * * * *` | Scheduler sweep status alpha otomatis tiap 15 menit |
| **Workers Secrets** | `JWT_SECRET` | *(Encrypted)* | Kunci rahasia token JWT (wajib min. 32 karakter di prod) |

---

## 3. Data Awal & Seeder Database

### A. Data Wilayah Resmi (8 Desa & 25 Kelompok)
Database remote akan di-seed dengan data wilayah aktual Cengkareng:
- **8 Desa (IDs 7–14)**:
  1. `(7)` Cengkareng
  2. `(8)` Kapuk Melati
  3. `(9)` Bandara
  4. `(10)` Kalideres
  5. `(11)` Kebon Jahe
  6. `(12)` Jelambar
  7. `(13)` Taman Kota
  8. `(14)` Cipondoh
- **25 Kelompok (IDs 7–31)**:
  - Cengkareng: `(7)` Fajar A, `(8)` Fajar B, `(9)` Fajar C
  - Kapuk Melati: `(10)` BGN, `(11)` Melati A, `(12)` Melati B
  - Bandara: `(13)` Prima, `(14)` Rawa Lele A, `(15)` Rawa Lele B, `(16)` Kampung Duri
  - Kalideres: `(17)` Tegalalur A, `(18)` Tegalalur B, `(19)` Prepedan A, `(20)` Prepedan B, `(24)` Pondok Kelapa
  - Kebon Jahe: `(21)` Kebon Jahe A, `(22)` Kebon Jahe B, `(23)` Garikas, `(25)` Taniwan
  - Jelambar: `(26)` Jelambar A, `(27)` Jelambar B
  - Taman Kota: `(28)` Taman Kota A, `(29)` Taman Kota B
  - Cipondoh: `(30)` Cipondoh A, `(31)` Cipondoh B

### B. Akun Login Bawaan (Default Seed)
- **Admin Daerah (Super Admin)**: `admin@gencar.com` / `admin123`
- **Admin Desa (Cengkareng)**: `admindesa@gencar.com` / `admin123`
- **Admin Kelompok (Fajar C)**: `adminkelompok@gencar.com` / `admin123`
- **User Generus (Sample)**: `gnr991569@gencar.com` / `generus123`

### C. Data Konten Publik (CMS)
- **12 Kegiatan Publik**: Telah disiapkan untuk etalase web `/kegiatan`.
- **12 Artikel & Berita**: Telah disiapkan untuk halaman literasi `/artikel` dan `/berita`.
- **8 Item Galeri**: Foto polaroid & reels di `/galeri`.
- **Pengurus Organisasi**: Dikosongkan (0 baris), siap diisi melalui menu Admin CMS (`/admin/cms` → tab Pengurus).

---

## 4. Langkah-Langkah Deployment (Step-by-Step)

### Prasyarat:
Pastikan Anda berada di direktori root `gencar` pada terminal / PowerShell.

```bash
cd C:\Users\user\Documents\maul\gencar
```

---

### Langkah 1: Login ke Cloudflare via Wrangler
Hubungkan terminal dengan akun Cloudflare Anda:
```bash
npx wrangler login
```
*Browser akan terbuka, klik tombol **Allow**.*

---

### Langkah 2: Buat Database D1 di Cloudflare
Jalankan pembuatan database D1:
```bash
npx wrangler d1 create gencar-db
```

Output terminal akan memberikan `database_id`, contoh:
```
[[d1_databases]]
binding = "DB"
database_name = "gencar-db"
database_id = "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
```

Buka file `wrangler.toml` dan ganti `database_id = "local-gencar-db"` dengan ID asli di atas:
```toml
[[d1_databases]]
binding = "DB"
database_name = "gencar-db"
database_id = "PASTE_DATABASE_ID_DARI_CLOUDFLARE_DI_SINI"
migrations_dir = "drizzle"
```

---

### Langkah 3: Terapkan Migrasi Schema ke Database Remote
Jalankan semua berkas migrasi SQL (`drizzle/0000_*.sql` s.d `drizzle/0018_*.sql`):
```bash
npx wrangler d1 migrations apply gencar-db --remote
```
*Tekan `Y` untuk menyetujui eksekusi migrasi di Cloudflare.*

---

### Langkah 4: Jalankan Seeder Database ke Remote
Isi data wilayah (8 Desa & 25 Kelompok), akun admin default, dan konten publik CMS:
```bash
npm run db:seed:remote
```

---

### Langkah 5: Buat Bucket R2 untuk Penyimpanan Media
Buat bucket R2 untuk upload gambar, bukti izin, dan avatar:
```bash
npx wrangler r2 bucket create gencar-uploads
```

---

### Langkah 6: Atur Production Secret (JWT_SECRET)
Atur kunci enkripsi JWT rahasia (wajib minimal 32 karakter di production):
```bash
npx wrangler secret put JWT_SECRET
```
*Masukkan passphrase aman, misalnya: `gencar-super-secret-production-key-2026-cengkareng-secure`.*

---

### Langkah 7: Build Frontend & Deploy Aplikasi
Jalankan proses compile Vite SPA dan deployment Worker secara bersamaan:
```bash
npm run deploy
```
*(Perintah ini menjalankan `npm run build --prefix frontend && wrangler deploy`)*

Setelah selesai, URL live akan muncul di terminal:
`https://gencar-api.<account-subdomain>.workers.dev`

---

## 5. Verifikasi Pasca-Deployment (Smoke Test)

1. **Akses Web Publik**:
   - Buka `https://<worker-url>.workers.dev` → Pastikan hero, section kegiatan publik, artikel, dan galeri tampil rapi.
   - Buka `/pengurus` → Memastikan tampilan empty state ("Bagan Belum Dipublikasikan") tampil dengan baik.
2. **Health Check API**:
   - Buka `https://<worker-url>.workers.dev/api/health` → Response: `{"ok":true,"daerah":"Cengkareng"}`.
3. **Login Panel Admin**:
   - Buka `/login` → Masuk dengan `admin@gencar.com` / `admin123`.
   - Pastikan masuk ke Dashboard Admin, data desa/kelompok terbaca, dan tab CMS berfungsi.
4. **Keamanan**:
   - Ganti password akun admin default setelah berhasil login pertama kali.

---

## 6. Pengaturan Custom Domain (Opsional)

1. Masuk ke [Cloudflare Dashboard](https://dash.cloudflare.com/) → **Workers & Pages**.
2. Pilih worker **`gencar-api`** → tab **Settings** → **Domains & Routes**.
3. Klik **Add Custom Domain** → Masukkan domain Anda (misal `app.gencar.id` atau `gencar.or.id`).
4. Cloudflare akan mengonfigurasi DNS dan SSL otomatis.
