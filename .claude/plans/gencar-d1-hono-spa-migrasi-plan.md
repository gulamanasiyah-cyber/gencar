# Gencar → D1 + Hono Worker + Full SPA — Migrasi Plan

**Stack:** `Downloads/jb2id (1).db` (Turso `lib/db.ts: @libsql/client/web`, `drizzle.config.ts: dialect turso`) → **Cloudflare D1** + **Hono Worker** + **Vite SPA**. Fokus: Kegiatan & Absensi. Daerah = singleton implisit "Cengkareng" (tanpa tabel daerah).

**Status:** Approved 2026-05-03 — Build mode. Strangler 2 minggu Turso read-only sebelum cutover.

---

## 0. Koreksi Terkunci

- Daerah tanpa entitas DB. `settings.daerah_nama` / konstanta FE saja. `kegiatan` infer tingkat via `kegiatan.desaId/kelompokId null` (`lib/schema.ts:111`, `app/(dashboard)/kegiatan/page.tsx:99`).
- Domisili terbalik + admin-driven: `domisiliAnak` wajib, `domisiliOrtu` kondisional (`isDomisiliOrtuSama` default centang → hide). Pendaftaran oleh admin saja.
- Kategori acara: `Sambung Rutin` / `Keakraban` / `Pemantapan` / `Lainnya (isi bebas)` → enum + `kategoriCustom text`.
- Judul template Sambung: `Sambung Muda-Mudi {Tingkat} {Nama Wilayah}` (`Kelompok Fajar C`, `Desa ...`, `Daerah`) auto-fill saat `sambung_rutin`, editable. `deskripsi` bebas.
- Magic link 30m onboarding sekali pakai: admin generate → peserta klik → wajib `set password` → selanjutnya password.
- Manage jadwal = admin saja (`admin_daerah/desa/kelompok` `lib/schema.ts:70` + `middleware.ts` guard).
- QR statis per wilayah (1/kelompok, 1/desa, 1 daerah). 2+ kegiatan aktif → modal pilih kegiatan setelah filter GPS (yang jauh > radius dibuang). Cetak A4, tidak rotasi.
- `perantauan` → `asalDaerah` text wajib.
- `shiftPekerjaan` = JSON TEXT fleksibel (`{mode, masuk, pulang, shifts[]}`), P1 hidden.
- Data wajib: `nama`, `pendidikan` (`SD|SMP|SMA|Sedang menempuh perguruan tinggi|Sarjana`), `tanggalLahir`, `noTelp`, `tempatLahir` + `domisiliAnak`, `kategoriMudaMudi`, `jenisKelamin`, `desa/kelompok`.

## 1. Tujuan P0 vs Non-tujuan

**P0 (5–6 minggu) — OS Kegiatan & Absensi:** Daftar admin-driven → manage jadwal 3 tingkat (Daerah/Desa/Kelompok) → buat kegiatan (kategori+template judul+deskripsi+GPS) → absen scan QR wilayah + GPS + modal → rekap.

**P1 (kolom siap, UI hidden):** `shiftPekerjaan` JSON + `statusOrtuJamaah` (`lib/schema.ts:19-62`).

**Cut MVP:** `mandiri/romantic-room/pemilihan/rooms` (`lib/schema.ts:183-317`), `rab:375`/`rundown:407`, `tim-gambuh:516`, `katalog/id-card` full — schema tetap, route tidak di-expose. Turso read-only 2 minggu rollback.

## 2. Arsitektur Target

```
Vite SPA (TanStack Router + Query + zod)
  frontend/dist --[assets]--> Hono Worker (cloudflare:workers, hono/jwt, hono/cors)
                               --drizzle/d1--> D1 gencar-db + KV (magic/rate-limit) + R2 (upload)
```

- `wrangler.toml` tambah `[[d1_databases]] binding=DB` + `[[kv_namespaces]]`, `[assets] directory="frontend/dist"`, hapus `open-next.config.ts` + `@libsql/isomorphic-ws`.
- `drizzle.config.ts` `turso` → `sqlite` `driver:d1-http`, `schema:"./shared/schema.ts"`.
- `lib/db.ts` `createClient({TURSO_*})` → `drizzle(env.DB)` via `getRequestContext().env.DB`. Fallback Turso selama strangler.
- Dump: `sqlite3 "Downloads/jb2id (1).db" .dump | wrangler d1 execute DB --file=-` + `scripts/migrate-jb2id-to-d1.ts` normalisasi `datetime('now')`.
- `next.config.mjs:73` `geolocation=()` → `geolocation=(self)` untuk `/hadir` & form kegiatan.
- Build: `frontend: vite build` + `worker: wrangler deploy` (dua build). Lokal `wrangler d1 execute --local`.

## 3. Data Model Delta D1

```ts
// shared/schema.ts — tanpa tabel daerah
generus {
  nama text not null; tempatLahir text not null; tanggalLahir text not null; noTelp text not null;
  pendidikan text not null; // zod enum SD|SMP|SMA|Sedang menempuh perguruan tinggi|Sarjana
  jenisKelamin enum['L','P'] not null;
  kategoriMudaMudi enum['perantauan','pribumi'] nullable; asalDaerah text nullable;
  domisiliAnak text not null; domisiliOrtu text nullable; isDomisiliOrtuSama integer default 1;
  desaId integer FK desa.id nullable; kelompokId integer FK kelompok.id nullable;
  shiftPekerjaan text nullable; // JSON: {"mode":"fleksibel","shifts":[{"nama":"Pagi","masuk":"06:00","pulang":"14:00"}]}
  statusOrtuJamaah enum['sudah','belum'] nullable; // P1
}
kegiatan { kategoriAcara enum['sambung_rutin','keakraban','pemantapan','lainnya'] not null; kategoriCustom text nullable;
           judul text not null; deskripsi text nullable;
           lat real nullable; lng real nullable; radiusM integer default 100; gpsRequired integer default 0 }
absensi { lat real; lng real; accuracy real; isGpsValid integer; qrWilayahLevel enum['kelompok','desa','daerah'] }
magic_tokens { id text PK; generusId text FK; email text; tokenHash text unique; expiresAt text (30m); consumedAt text nullable; createdAt text } index tokenHash
wilayah_qr { id text PK; level enum['kelompok','desa','daerah']; desaId integer nullable; kelompokId integer nullable; qrToken text unique }
users { role enum + 'admin_daerah','admin_desa','admin_kelompok' } // map dari pengurus_daerah/desa/kelompok lib/schema.ts:70
```

Tanpa tabel `daerah`. `kegiatan` tingkat tetap infer `desaId/kelompokId null` = Daerah.

`shiftPekerjaan` JSON validasi `zod` union `mode:tetap|fleksibel` + `shifts[]`, FE editor `+ Tambah Shift` (P1).

## 4. RBAC 3 Tingkat (1 daerah implisit)

| Role | Daftar peserta di | Buat kegiatan di | Lihat | Absensi |
|---|---|---|---|---|
| `admin_daerah` | semua | daerah+desa/kelompok manapun | semua | semua |
| `admin_desa` | desanya | desanya+kelompok di bawahnya | desanya+kelompok di dalamnya+kegiatan daerah read | desanya |
| `admin_kelompok` | kelompoknya | hanya kelompoknya | kelompoknya+kegiatan desa/daerah induk read | kelompoknya |

`app/register/page.tsx` + `lib/validation.ts` ganti `role` 3 itu, cascading `Desa→Kelompok` saja, `admin_daerah desaId=kelompokId=null` di JWT `lib/auth.ts:25`. Approval `pending` → `admin_daerah` approve `desa/kelompok` di bawahnya.

## 5. Alur Pendaftaran Admin-Driven + Magic 30m

`Admin POST /api/generus {nama, pendidikan, tempatLahir, tanggalLahir, noTelp, kategoriMudaMudi, asalDaerah?, domisiliAnak, isDomisiliOrtuSama, domisiliOrtu?, desaId?, kelompokId?}` → `zod superRefine` (5 wajib + `perantauan→asalDaerah`, `isDomisiliOrtuSama==false→domisiliOrtu`) → `generus` + `users(role generus, password null)` → `POST /api/auth/magic/generate {generusId}` (sha256 32B, ttl 30m, KV rate 3/jam, kirim `nodemailer`/`FONNTE_TOKEN`) → peserta `GET /api/auth/magic/verify?token=` → `setSession` (`jose` 7d cookie httpOnly + `Bearer` fallback) → `/set-password` wajib → `POST /api/auth/set-password` (`bcryptjs`) → login password selanjutnya. Token sekali pakai `consumedAt`.

## 6. Kegiatan — Kategori + Template Judul

Admin `POST /api/kegiatan {kategoriAcara, kategoriCustom?, judul, deskripsi, tanggal, jam, lokasi, desaId?, kelompokId?, lat,lng,radiusM}` — validasi wilayah. FE: pilih `Sambung Rutin` → `judul` auto `Sambung Muda-Mudi {Tingkat} {Nama}` (`Kelompok Fajar C` dari `kelompok.nama:10`, `Desa ...`, `Daerah` untuk `null/null`) editable; `Keakraban/Pemantapan` judul bebas; `Lainnya` wajib `kategoriCustom`. `deskripsi` textarea.

## 7. QR Wilayah Statis + Modal Multi-Kegiatan (GPS Filter)

Seed `wilayah_qr` 1/kelompok+1/desa+1 daerah, QR=`https://app/hadir?qr=qrToken` statis cetak A4. Scan `app/scan/page.tsx` (`html5-qrcode`) → `POST /api/absensi/scan {qrToken, lat,lng,accuracy}` → resolve `wilayah_qr` → cari kegiatan aktif tingkat itu (`kegiatan where tanggal=today` atau `status aktif` + `desaId/kelompokId` match). 0→404, 1→validasi GPS `haversine <= radiusM+10m` (`accuracy>100m reject`, `gpsRequired 0=advisory flag merah, 1=strict 403`) → insert `absensi`. 2+ → filter GPS dulu (tanpa `lat/lng` lolos, yang jauh dibuang) → sisa 0/1/2+ → 1 langsung absen, 2+ modal pilih kegiatan (card `judul`+badge kategori+`jam/lokasi`+pill `Di radius/Luar radius`) → `POST /api/absensi {kegiatanId,...}`. Validasi peserta `generus.desaId/kelompokId` dalam wilayah QR + duplikat `409`.

## 8. GPS

Admin map picker Leaflet set `lat/lng+radius 50/100/200`. Peserta `navigator.geolocation.getCurrentPosition({enableHighAccuracy:true, timeout:10000})`. Server `haversine`, simpan `absensi.lat/lng/accuracy/isGpsValid`. Default `advisory`. `next.config.mjs` `geolocation=()` → per-path `(self)`.

## 9. API Hono

`POST /api/auth/magic/generate|verify`, `POST /api/auth/set-password`, `POST /api/auth/login`, `GET /api/auth/me`, `GET /api/desa`, `GET /api/kelompok?desaId=`, `GET/POST /api/kegiatan?tingkat=&kategori=`, `GET /api/wilayah-qr`, `POST /api/absensi/scan` (qrToken+GPS+modal), `POST /api/absensi` (manual), `POST /api/generus` (admin-driven, domisiliAnak wajib + pendidikan enum + shift JSON P1 hidden).

## 10. FE SPA Mobile (design-taste-frontend/gpt-taste)

Shell bottom-tab 4 (Beranda/Jadwal/Absensi/Profil) + app-bar 56px ganti `Sidebar:250px`+`Topbar`. Daftar stepper S1 `nama+tempatLahir+tanggalLahir+noTelp+pendidikan(SD..Sarjana)+jenisKelamin+perantauan→asalDaerah`, S2 `Domisili Anak` wajib+checkbox `ortu sama`→hide `domisiliOrtu`, S3 wilayah+foto+shift JSON (hidden P1). Jadwal chip `Daerah|Desa|Kelompok`+badge kategori, card `judul` prominent. Absensi QR fullscreen+modal+pill `Di radius`. Token emerald/ink+amber, `Plus_Jakarta_Sans`+`Inter` (`app/layout.tsx`), radius 16, hit 44px, skeleton.

## 11. Fase & Verifikasi

- **F0 3d** `wrangler d1 create gencar-db` + dump jb2id, mapping `pendidikan` lama→enum, row count
- **F1 1w** schema delta+`wilayah_qr` seed, `drizzle-kit generate`, `migrations apply --local/--remote`, `shiftPekerjaan` JSON test
- **F2 1.5w** Hono scaffold `worker/app.ts` + 5 route inti+magic30m+QR wilayah+GPS, `vitest` matrix 3 role+GPS, `hono/jwt`+RBAC
- **F3 1.5w** SPA Vite+auth guard+register stepper+template judul+jadwal CRUD+scan QR wilayah+modal GPS, `frontend/dist`→`[assets]`
- **F4 3d** cutover `[assets] frontend/dist`, hapus `open-next`/`TURSO_*`
- **F5 1w** P1 shift JSON editor+`statusOrtuJamaah`+R2+PWA+design QA

Verifikasi: `wrangler d1 execute --local` CRUD 3 tingkat, `POST /api/absensi/scan` single vs multi vs GPS-filtered modal, magic 30m expiry+`consumedAt`, `haversine` unit, RBAC matrix 3 role, mobile design QA.

## 12. Risiko

- D1 ALTER FK vs Turso — test `--local` dulu, keep Turso read-only rollback
- Cookie httpOnly vs SPA — dual cookie+Bearer, CORS `credentials:true` untuk `localhost:5173`
- GPS indoor `advisory` + tampilkan `accuracy`
- Magic spam — ttl 30m, rate 3/jam, fallback password tetap hidup
- 16 role regresi — port `middleware.ts` whitelist 1:1 + test matrix

## 13. File Map

- `shared/schema.ts` (baru, sumber kebenaran D1)
- `drizzle.config.ts` (turso → sqlite d1-http)
- `lib/db.ts` (Turso → `env.DB`, strangler fallback)
- `wrangler.toml` / `wrangler.jsonc` (D1 binding + KV + assets)
- `worker/` (Hono)
- `frontend/` (Vite SPA)
- `scripts/migrate-jb2id-to-d1.ts` (dump + normalisasi)

## 14. Acceptance

- [ ] `wrangler d1 execute --local "select count(*) from generus"` == jb2id dump count
- [ ] `POST /api/generus` 5 field wajib + pendidikan enum + domisili terbalik validasi
- [ ] Magic 30m sekali pakai + `set-password` wajib
- [ ] `POST /api/kegiatan` template judul Sambung + GPS radius
- [ ] `POST /api/absensi/scan` single / multi+modal+GPS filter / 404 / 409 duplikat / 403 strict
- [ ] RBAC 3 tingkat scoping benar
- [ ] SPA mobile bottom-tab + stepper + chip filter + modal QR
