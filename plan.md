# Plan — Halaman Publik + CMS Admin (Gencar)

> Status: **LOCKED — keputusan user 2026-08-22** | Mode: SELECTIVE EXPANSION | Arsitektur: **B (Ideal, M effort) + modifikasi Q4 tabel terpisah** | Estimasi 10 jam
> Referensi: riset LDII/NU/Muhammadiyah (hero + rubrik + lintas daerah + pengurus + tentang + SEO) sudah di-review di sesi CEO-review.

## 1. Konteks & Tujuan
- **Request:** Halaman untuk public berisi konten publik — kegiatan-kegiatan kita (bukan kegiatan internal), blog, artikel. Di admin ada **module CMS** untuk kelola halaman public termasuk artikel & kegiatan.
- **Keputusan user yang sudah lock (final 2026-08-22):**
  - CMS di admin untuk kelola konten public (artikel, kegiatan) + artikel/berita juga via CMS (`Q8 A`).
  - Kegiatan publik = **tabel terpisah `kegiatan_publik`** (`Q4 B`) — bukan flag di `kegiatan` internal. Alasan: pisah concern public vs internal, `kegiatan` internal tetap untuk absensi/GPS, `kegiatan_publik` untuk etalase.
  - **Cover boleh URL eksternal juga** (`Q7 B`) — tapi default upload R2, validasi `image/*` tetap.
  - **URL di root** (`Q1 A`): `/kegiatan/:slug` dsb — bukan `/public/*`.
  - **Slug = slugify(judul) saja** (`Q2 B`) — duplikat → `-2`, `-3` (tanpa suffix id).
  - **Editor = TipTap WYSIWYG langsung di P0** (`Q3 B`).
  - **CMS boleh diisi member juga, tapi harus dikurasi admin daerah** (`Q5 custom`): `member` boleh `POST draft`, publish butuh approve `admin|pengurus_daerah|kmm_daerah|admin_daerah`.
  - **Sitemap + jadwal sholat widget include di baseline** (`Q6 A`).
  - **Anon boleh baca & submit saran/komentar, tapi wajib captcha sebelum submit** (`Q9 custom`) — pakai Turnstile/hCaptcha (Cloudflare-native, no Google deps).
- **Tujuan bisnis:** visitor umum bisa lihat aktivitas Gencar → percaya → hubungi/daftar. Jadi butuh URL shareable, cover, SEO dasar.

## 2. Riset — Web Organisasi Lain (LDII, NU, Muhammadiyah)
**Pola yang berulang:**
- Hero/Headline slider 3–5 berita utama + grid Kabar / Lintas Daerah
- Rubrik: Warta (Nasional/Daerah), Keislaman (Khutbah, Syariah, Tafsir, Hikmah), Opini, Tokoh, Kesehatan/Iptek
- Indeks berita & artikel paginated + filter kategori + search (LDII 1.184 halaman)
- Agenda/Kegiatan (foto + judul + tanggal + lokasi) — analog dengan `kegiatan` kita
- Pengurus/Tokoh (foto, nama, jabatan) — kita sudah punya `organisasiPengurus` (`shared/schema.ts:527`)
- Tentang (AD/ART, Sejarah, Struktur), Kontak, Footer (alamat, sosmed, sitemap)
- Utilitas: Kirim Berita, Jadwal Sholat, Kalkulator Zakat, Video

**Implikasi untuk Gencar:**
- `kegiatan publik` = Lintas Daerah versi Gencar
- `artikel` (`tipe=artikel`) + `berita` (`tipe=berita`) = Rubrik — **reuse endpoint existing** (`server/src/routes/artikel.ts:10`, `berita.ts:10` sudah `optionalAuth` + `status=published`)
- `pengurus`, `tentang` (`settings` key), `jadwal sholat` (`misc.ts:18`), `saran` (`public.ts:23`) — **reuse**
- Pelajaran arsitektur: tanpa slug + OG + pagination = traffic 0 → butuh router + slug (alasan pilih B atas A).

## 3. Diagnosis Existing (source of truth)
- **BE artikel/berita publik:** sudah siap (`artikel.ts:10`, `berita.ts:10`) — anon bisa `?status=published` — reuse 100%.
- **BE kegiatan publik:** belum ada listing public. `kegiatan.ts:10` full `requireAuth()`, `public.ts:39` cuma `GET /kegiatan/:id` satuan — **gap**.
- **Model:** `shared/schema.ts:127` `kegiatan` belum ada `coverImage`, `visibility`, `slug`, `konten`/`excerpt` — padahal cover wajib.
- **FE:** `frontend/src/App.tsx:1627` monolit tanpa `react-router-dom` (`frontend/package.json` belum ada router). `frontend/src/main.tsx:1` mount langsung `App`. Tambah public sebagai tab = tech debt.
- **Upload:** `server/src/routes/misc.ts:30` POST `/upload` → R2 (`R2_BUCKET`) — reuse untuk cover wajib.
- **Validation:** `shared/validation.ts:51` `kegiatanCreateSchema` belum include visibility/coverImage/slug.

## 4. Scope Locked (Baseline B)
### 4.1 Data & Migration (`drizzle/0007_public_content.sql` + `0008_kegiatan_publik.sql`)
- **Tabel baru `kegiatan_publik`** (pisah dari `kegiatan` internal per Q4 B) — kolom: `id TEXT PK`, `slug TEXT UNIQUE`, `judul TEXT NOT NULL`, `excerpt TEXT`, `konten TEXT`, `cover_image TEXT`, `kategori_acara TEXT ENUM('sambung_rutin','keakraban','pemantapan','lainnya')`, `kategori_custom TEXT`, `tanggal TEXT NOT NULL`, `jam TEXT`, `lokasi TEXT`, `lat REAL`, `lng REAL`, `status TEXT ENUM('draft','pending_review','published','rejected') DEFAULT 'draft'`, `author_id TEXT FK users.id`, `published_at TEXT`, `created_at TEXT`, `updated_at TEXT` — index `status+tanggal DESC`, `slug` unique, `kategori_acara`
- `kegiatan` internal **tidak diubah** (tetap untuk absensi/GPS)
- `artikel`: tambah `slug TEXT UNIQUE` (optional, fallback id) + index `idx_artikel_slug`
- Validation `shared/validation.ts:51`: `kegiatanPublikSchema` terpisah — `slug` `^[a-z0-9-]+$` max 120 unique, `coverImage` `z.string().url()` (R2 atau eksternal, Q7 B) — **tidak required di schema strict** tapi FE wajib isi sebelum publish (validasi publish-time), `excerpt` max 300, `konten` min 20 jika `published`, TipTap JSON/HTML sanitized
- Workflow kurasi (Q5 custom): `member`/`generus` → `status='pending_review'` saat submit, `admin|pengurus_daerah|kmm_daerah|admin_daerah` yang approve → `published` (atau `rejected` + `catatan`)
- Captcha (Q9 custom): `POST /api/public/saran` wajib `cf-turnstile-response` (atau `h-captcha-response`) — verify server-side via Turnstile `siteverify` API (env `TURNSTILE_SECRET_KEY`), rate limit anon 5/min/IP

### 4.2 Backend
- **Public read** `server/src/routes/public.ts:1` extend:
  - `GET /api/public/kegiatan` — anon, `?q&kategoriAcara&from&to&page&limit` (default 12, max 24), filter `status='published'` di tabel `kegiatan_publik`, whitelist fields, pagination `{data, meta}`, `Cache-Control: public, max-age=60, stale-while-revalidate=120`, sanitasi `q`
  - `GET /api/public/kegiatan/:slugOrId` — slug dulu fallback id, 404 cantik
  - `GET /api/public/feed` — 6 kegiatan_publik + 6 artikel + 6 berita terbaru untuk hero
  - `GET /api/public/sitemap.xml` — generate XML dari published slugs (Q6 A)
  - `GET /api/public/pengurus`, `GET /api/public/tentang` — reuse existing
  - `POST /api/public/saran` — tambah verify Turnstile captcha (`cf-turnstile-response`), **tidak ada auth** tapi captcha wajib (Q9 custom)
- **Write CMS** `server/src/routes/cms.ts` **baru** (pisah dari `kegiatan.ts` — karena tabel terpisah):
  - `GET /api/cms/kegiatan-publik` — auth, list dengan filter `status`, pagination, role: member lihat milik sendiri, admin lihat semua pending
  - `POST /api/cms/kegiatan-publik` — auth `member|generus|desa|kelompok|creator|admin|pengurus_daerah|kmm_daerah|admin_daerah` — jika role member → `pending_review`, jika admin → `draft`/`published` langsung, slug generate `slugify(judul)` + cek unique (`slug`, `slug-2`… Q2 B), cover boleh R2 atau URL eksternal (Q7 B, validasi `image/*` jika upload)
  - `PUT /api/cms/kegiatan-publik/:id` — edit (member hanya milik sendiri yang belum published), admin bisa approve `pending_review → published` + set `publishedAt`
  - `DELETE /api/cms/kegiatan-publik/:id` — guard owner/admin
- `kegiatan.ts:24` internal **tidak diubah** — tetap `requireAuth()` untuk absensi

### 4.3 Frontend Routing & Layout
- Dep baru: `react-router-dom` + `react-helmet-async` + `@tiptap/react` + `@tiptap/starter-kit` + `@tiptap/extension-image` + `@tiptap/extension-link` + `@tiptap/extension-placeholder` (Q3 B TipTap P0)
- Split `frontend/src/App.tsx:1627`:
  - `frontend/src/routes/public/PublicLayout.tsx` — header (logo G, nav: Beranda, Kegiatan, Artikel, Berita, Tentang, Pengurus), footer, `Outlet`
  - `PublicHome.tsx` — hero cover besar, 3 card terbaru per kategori, jadwal sholat widget (Q6 A, fetch `misc.ts:18` `/api/sholat`), saran form + Turnstile widget (Q9)
  - `PublicKegiatanList.tsx` / `PublicKegiatanDetail.tsx` — fetch dari `kegiatan_publik` public API, URL `/kegiatan/:slug` di root (Q1 A, slug Q2 B)
  - `PublicArtikelList/Detail`, `PublicBeritaList/Detail`, `PublicTentang.tsx`, `PublicPengurus.tsx`
  - `frontend/src/routes/public/SitemapRoute.tsx` + `server` serve `sitemap.xml` (Q6 A)
  - Router di `frontend/src/main.tsx:1` — `createBrowserRouter([{path:'/', element:<PublicLayout>, children:[...public]}, {path:'/admin/*', element:<App>}, {path:'/member/*', element:<App>}])` — migrasi bertahap, `App.tsx` tetap admin/member
- Image: `/api/images/:filename` (R2) atau URL eksternal (Q7 B) — `loading="lazy"`, 16:9, placeholder, validasi preview
- TipTap editor di CMS (`frontend/src/features/cms/TipTapEditor.tsx`): toolbar bold/italic/heading/bullet/ordered/quote/link/image/upload, `onUpdate` → HTML sanitized, placeholder "Tulis konten kegiatan…"

### 4.4 Admin — Module CMS (`frontend/src/App.tsx:478` AdminShell nav `CMS`)
- `frontend/src/features/cms/CmsPage.tsx` — tabs: Kegiatan Publik | Artikel | Berita | Pengurus | Tentang
- Tabel kegiatan: thumb, judul, slug (Q2 B), status pill (`draft`/`pending_review`/`published`/`rejected`), tanggal, author, aksi (Edit, Hapus, Preview, Approve/Reject)
- Form `CmsKegiatanForm`: judul (slug auto `slugify(judul)`, editable, duplikat → `-2` Q2 B), excerpt, **TipTap editor** untuk `konten` (Q3 B), kategoriAcara, tanggal/jam/lokasi, desa/kelompok, **cover** — pilihan: Upload R2 (`POST /api/upload`) **atau** URL eksternal (Q7 B, preview + validasi `image/*`, <5MB jika upload), status (`draft`/`pending_review`/`published`), Simpan Draft / Ajukan Review (member) / Publish (admin) / Preview (`/kegiatan/:slug?preview=1` dengan token preview)
- Kurasi (Q5 custom): member submit → `pending_review` → admin daerah (`admin|admin_daerah|pengurus_daerah|kmm_daerah`) approve → `published` (atau reject + catatan). Member lihat tab "Kegiatan Saya" vs admin lihat "Perlu Review".
- Artikel/Berita form via CMS juga (Q8 A, CRUD via `/api/artikel` & `/api/berita`, tambah slug & cover), Pengurus reuse `admin.ts:186`, Tentang save ke `settings` key `tentang_html`
- Guard: `requireRole` CMS allow `['admin','pengurus_daerah','kmm_daerah','admin_daerah','desa','kelompok','creator','generus','peserta']` untuk create draft, tapi **publish/approve** hanya `['admin','pengurus_daerah','kmm_daerah','admin_daerah']`

### 4.5 Design & UX
- Tokens `frontend/src/index.css:1` (`--primary #c5f54c`, `--ink #1a1a2e`, `--radius 16px`)
- Hero + filter chips + grid 3 col desktop / 1 col mobile (`kegiatan-grid`, `cards-grid`)
- Empty: `lp-empty-card` + CTA, Loading: skeleton, Error: retry, Detail: breadcrumbs + prose + share WA/copy, related 3
- A11y: `article`, `nav`, `alt` cover wajib, `aria-label`

## 5. Review 11 Seksi (ringkas)
1. **Architecture:** `Browser → /api/public/* (anon cached) → D1 → PublicLayout (CSR)` ; CMS isolate `features/cms/*` — rollback additive.
2. **Error:** 500 D1 → ErrorBoundary + retry; 404 slug → halaman 404 + related; validasi cover → 400 field error.
3. **Security:** whitelist fields, sanitasi `q`, anon rate limit 60/min/IP (tambah di `server/src/index.ts:27`), validasi MIME/size upload, sanitasi HTML `sanitize.ts`.
4. **Data Flow Edge:** tanggal regex, kategori enum 400, slug duplikat 409 + suggest `-2`, page/limit default, cover URL non-R2 allowed + warning.
5. **Code Quality:** ekstrak `PublicCard`, `PublicPagination`, `CoverUpload`, cyclomatic <15.
6. **Test:** smoke public list/empty/pagination/filter/detail 404/OK, API only-published, POST tanpa cover → 400, R2 e2e, Playwright home→list→detail→back, unit slugify/schema.
7. **Observability:** `public_kegiatan_list_p95`, `404_rate`, `cms_publish_count`, `upload_fail`, CF Analytics, alert 5xx >1% 5m.
8. **DB:** `idx_kegiatan_public(visibility,status,tanggal)`, `UNIQUE(slug)`, migration `0007` via `drizzle-kit push` dry-run, app-layer NOT NULL cover jika public.
9. **API Contract:** `GET /api/public/kegiatan?page&limit&q&kategoriAcara&from&to` → `{data, meta}`, `GET /:slugOrId` → `KegiatanPublic|404`, `POST /api/kegiatan` body extended, backward compat.
10. **Perf:** limit 12 + whitelist + Cache-Control + lazy + R2 immutable 1y + code-split.
11. **Design:** hierarki header sticky → hero → chips → grid → pagination → footer; skeleton, prose, share.

## 6. Urutan Implementasi
**Phase 0 Prep (30m):** `npm i react-router-dom react-helmet-async @tiptap/react @tiptap/starter-kit @tiptap/extension-image @tiptap/extension-link @tiptap/extension-placeholder`, backup D1, cek `_journal.json`, set env `TURNSTILE_SECRET_KEY` + `TURNSTILE_SITE_KEY` (Q9).
**Phase 1 DDL & Validation (1h):** `shared/schema.ts:127` + tambah `kegiatanPublik` tabel baru + `shared/validation.ts:51` `kegiatanPublikSchema` + `drizzle/0007_public_content.sql` (artikel slug) + `drizzle/0008_kegiatan_publik.sql` push local.
**Phase 2 BE Public API + CMS API (2h):** `server/src/routes/public.ts` (public read + sitemap + saran+Turnstile) + `server/src/routes/cms.ts` baru (CRUD kegiatan_publik + kurasi) + `middleware/security.ts` rateLimitPublic + Turnstile verify helper.
**Phase 3 FE Router & Public Pages (3h):** `routes/public/*` 6 file + `main.tsx` router + `index.css` prose/hero + `TipTapEditor.tsx` + Turnstile widget di saran + jadwal sholat widget.
**Phase 4 Admin CMS (3h):** `features/cms/CmsPage.tsx` + `App.tsx:478` nav + wiring upload (R2 + URL eksternal Q7 B) + kurasi approve flow.
**Phase 5 Polish & QA (1.5h):** helmet/OG, `sitemap.xml` real, 404/empty/loading, a11y, `npm run build --prefix frontend`, `wrangler dev --local` smoke — Turnstile test key.

## 7. Keputusan Final (locked 2026-08-22)

| Q | Pilihan | Keputusan |
|---|---------|-----------|
| Q1 URL | **A** | Di root: `/kegiatan/:slug`, `/artikel/:slug`, `/berita/:slug`, `/tentang`, `/pengurus` |
| Q2 Slug | **B** | `slugify(judul)` saja, duplikat → `-2`, `-3` |
| Q3 Editor | **B** | TipTap WYSIWYG langsung di P0 |
| Q4 Tabel | **B** | Tabel terpisah `kegiatan_publik` |
| Q5 Role | **Custom** | Member juga boleh buat draft (`pending_review`), publish/approve hanya admin daerah (`admin`/`admin_daerah`/`pengurus_daerah`/`kmm_daerah`) |
| Q6 Baseline | **A** | Include sitemap + jadwal sholat widget di baseline |
| Q7 Cover | **B** | Boleh URL eksternal + upload R2 |
| Q8 Artikel/Berita | **A** | Kelola via CMS baru (tab di `CmsPage`) |
| Q9 Auth/Captcha | **Custom** | Anon boleh baca & submit saran, tapi wajib **captcha (Turnstile)** sebelum submit |

---

## 8. CEO Review Summary
- **Mode:** SELECTIVE EXPANSION, arsitektur B + modifikasi tabel terpisah (Q4 B)
- **Strongest challenges:** (1) Tanpa router+slug → tidak shareable/SEO 0, (2) kegiatan publik butuh tabel baru + kurasi member→admin, (3) public anon tanpa captcha/rate-limit → spam saran.
- **Accepted scope:** DDL `kegiatan_publik` baru, public API paginated+detail+feed+sitemap, 6 route public di root, TipTap di CMS, cover R2+URL eksternal, kurasi member→admin daerah, captcha Turnstile untuk saran, jadwal sholat widget, CMS kelola kegiatan_publik+artikel/berita+pengurus+tentang.
- **Deferred:** FTS, OG generator, view counter, video/galeri, newsletter — backlog P1/P2.
- **NOT in scope:** Ubah `kegiatan` internal/absensi, ubah member flow, statistik/rab/rundown, SSR/SSG, auth public untuk baca, pembayaran.

---

## 9. Next Step
Plan locked — lanjut Phase 0→5 sesuai keputusan di §7. Tidak perlu polling lagi; revisi via amend plan ini.
