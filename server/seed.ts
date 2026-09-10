import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import bcrypt from "bcryptjs";

const isRemote = process.argv.includes("--remote");
const envFlag = isRemote ? "--remote" : "--local";

console.log(`🌱 Seeding database (${isRemote ? "REMOTE" : "LOCAL"})...`);

const adminPasswordHash = bcrypt.hashSync("admin123", 10);
const generusPasswordHash = bcrypt.hashSync("generus123", 10);

const sqlContent = `
-- 1. Wilayah Dasar (8 Desa & 25 Kelompok)
INSERT OR IGNORE INTO desa (id, nama) VALUES 
  (7, 'Cengkareng'),
  (8, 'Kapuk Melati'),
  (9, 'Bandara'),
  (10, 'Kalideres'),
  (11, 'Kebon Jahe'),
  (12, 'Jelambar'),
  (13, 'Taman Kota'),
  (14, 'Cipondoh');

INSERT OR IGNORE INTO kelompok (id, nama, desa_id) VALUES 
  (7, 'Fajar A', 7),
  (8, 'Fajar B', 7),
  (9, 'Fajar C', 7),
  (10, 'BGN', 8),
  (11, 'Melati A', 8),
  (12, 'Melati B', 8),
  (13, 'Prima', 9),
  (14, 'Rawa Lele A', 9),
  (15, 'Rawa Lele B', 9),
  (16, 'Kampung Duri', 9),
  (17, 'Tegalalur A', 10),
  (18, 'Tegalalur B', 10),
  (19, 'Prepedan A', 10),
  (20, 'Prepedan B', 10),
  (24, 'Pondok Kelapa', 10),
  (21, 'Kebon Jahe A', 11),
  (22, 'Kebon Jahe B', 11),
  (23, 'Garikas', 11),
  (25, 'Taniwan', 11),
  (26, 'Jelambar A', 12),
  (27, 'Jelambar B', 12),
  (28, 'Taman Kota A', 13),
  (29, 'Taman Kota B', 13),
  (30, 'Cipondoh A', 14),
  (31, 'Cipondoh B', 14);

-- 2. User Admin Default
INSERT OR IGNORE INTO users (id, name, email, password_hash, password_plain, role, desa_id, kelompok_id) VALUES 
  ('usr_admin_daerah', 'Admin Daerah Cengkareng', 'admin@gencar.com', '${adminPasswordHash}', 'admin123', 'admin_daerah', NULL, NULL),
  ('usr_admin_desa', 'Admin Desa Cengkareng', 'admindesa@gencar.com', '${adminPasswordHash}', 'admin123', 'admin_desa', 7, NULL),
  ('usr_admin_kelompok', 'Admin Kelompok Fajar C', 'adminkelompok@gencar.com', '${adminPasswordHash}', 'admin123', 'admin_kelompok', 7, 9);

-- 3. Generus Data & Akun Generus
INSERT OR IGNORE INTO generus (id, nomor_unik, nama, jenis_kelamin, kategori_usia, desa_id, kelompok_id, status_nikah) VALUES 
  ('gen_sample_1', 'GNR991569', 'Ahmad Generus Teladan', 'L', 'Mandiri', 7, 9, 'Belum Menikah');

INSERT OR IGNORE INTO users (id, name, email, password_hash, password_plain, role, desa_id, kelompok_id, generus_id) VALUES 
  ('usr_generus_1', 'Ahmad Generus Teladan', 'gnr991569@gencar.com', '${generusPasswordHash}', 'generus123', 'generus', 7, 9, 'gen_sample_1');

-- 4. Kegiatan Publik (CMS)
INSERT OR IGNORE INTO kegiatan_publik (id, slug, judul, excerpt, konten, cover_image, kategori, kategori_acara, tanggal, jam, lokasi, status, published_at) VALUES
  ('kp_1', 'ngaji-rutin-selasa-malam', 'Ngaji Rutin Selasa Malam — bedah kitab & tanya jawab', 'Kajian mingguan yang santai tapi ngena. Materi terapan, bukan ceramah satu arah.', '<p>Kajian rutin Selasa malam — kitanya duduk melingkar, bukan baris. Tanya jawab bebas, pulang bawa 1 amalan yang langsung dipraktikin.</p>', 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=900&h=700&q=80', 'Sambung Rutin', 'sambung_rutin', '2026-09-02', '19:30', 'Musala Al-Falah', 'published', datetime('now')),
  ('kp_2', 'festival-anak-cengkareng', 'Festival Anak Cengkareng — lomba, bazaar, dan panggung kreasi', 'Seharian penuh buat anak-anak: lomba mewarnai, bazaar UMKM, dan panggung kreasi.', '<p>Festival tahunan merangkul cabe rawit dan pra-remaja se-Cengkareng.</p>', 'https://images.unsplash.com/photo-1531058020387-3be344556be6?auto=format&fit=crop&w=900&h=700&q=80', 'Lainnya', 'lainnya', '2026-09-15', '08:00', 'Lapangan Cengkareng', 'published', datetime('now')),
  ('kp_3', 'pelatihan-kepemimpinan-muda', 'Pelatihan Kepemimpinan Muda — dari anggota jadi penggerak', 'Workshop 1 hari: public speaking, manajemen konflik, dan cara bikin keputusan bareng.', '<p>Mencetak generasi muda yang berjiwa amanah, komunikatif, dan siap memimpin.</p>', 'https://images.unsplash.com/photo-1515187029135-18ee286d815b?auto=format&fit=crop&w=900&h=700&q=80', 'Pemantapan', 'pemantapan', '2026-09-20', '09:00', 'Aula Kecamatan', 'published', datetime('now')),
  ('kp_4', 'sambung-akbar-q4', 'Sambung Akbar Q4 — temu 500 muda-mudi se-Cengkareng', 'Sambung terbesar tahun ini. Kajian tematik dan penguatan 6 Karakter Luhur.', '<p>Pertemuan akbar triwulan menyatukan visi dan kerukunan pemuda pemudi.</p>', 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&w=900&h=700&q=80', 'Sambung Rutin', 'sambung_rutin', '2026-11-08', '19:00', 'Aula Cengkareng', 'published', datetime('now'));

-- 5. Artikel & Berita (CMS)
INSERT OR IGNORE INTO artikel (id, slug, judul, ringkasan, konten, cover_image, kategori, tipe, status, author_id, published_at) VALUES
  ('art_1', 'cara-bikin-kegiatan-yang-orang-mau-datang', 'Cara bikin kegiatan yang orang mau datang (tanpa spam broadcast)', 'Rumus sederhana: janji jelas, tempat jelas, pulang bawa cerita.', '<p>Kegiatan yang bermakna berakar dari niat ikhlas dan persiapan matang. Jangan hanya broadcast berulang-ulang, buatlah agenda yang menjawab kebutuhan jamaah muda-mudi.</p>', 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=700&h=480&q=80', 'Tuntunan Ibadah', 'artikel', 'published', 'usr_admin_daerah', datetime('now')),
  ('art_2', 'kenapa-dokumentasi-kegiatan-itu-penting', 'Kenapa dokumentasi kegiatan itu penting — bukan buat pamer', 'Arsip yang rapi bikin regenerasi nggak mulai dari nol.', '<p>Dokumentasi adalah ikhtiar merawat sejarah pembinaan. Catatan yang rapi akan menjadi rujukan pengurus generasi berikutnya.</p>', 'https://images.unsplash.com/photo-1454165205744-3b78555e5572?auto=format&fit=crop&w=700&h=480&q=80', 'Kisah', 'artikel', 'published', 'usr_admin_daerah', datetime('now')),
  ('art_3', 'ngelola-komunitas-tanpa-burnout', 'Ngelola komunitas tanpa burnout: sistem kecil yang jalan terus', 'Checklist, rotasi, dan dokumentasi — tiga hal yang menyelamatkan panitia.', '<p>Beban kepengurusan harus dipikul bersama secara rukun dan kompak. Hindari bertumpu pada satu orang saja.</p>', 'https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=700&h=480&q=80', 'Info Kesehatan', 'artikel', 'published', 'usr_admin_daerah', datetime('now')),
  ('art_4', 'briefing-panitia-15-menit-yang-efektif', 'Briefing panitia 15 menit yang efektif — bukan rapat 2 jam', 'Format briefing yang bikin semua tau tugasnya sebelum acara mulai.', '<p>Briefing singkat berfokus pada eksekusi lapangan, koordinasi penanggung jawab, dan doa bersama.</p>', 'https://images.unsplash.com/photo-1515187029135-18ee286d815b?auto=format&fit=crop&w=700&h=480&q=80', 'Berita', 'berita', 'published', 'usr_admin_daerah', datetime('now'));

-- 6. Galeri (CMS)
INSERT OR IGNORE INTO galeri (id, judul, image, kategori, type, aspect_ratio, deskripsi, tanggal, lokasi, status) VALUES
  ('gal_1', 'Kajian Akbar Generus 2026', 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&w=800&h=1000&q=80', 'Sambung Rutin', 'photo', 'portrait', 'Temu 300 muda-mudi se-Cengkareng dalam kajian tematik Al-Qur''an & Hadits.', '2026-03-08', 'Aula Cengkareng', 'published'),
  ('gal_2', 'Highlight: Futsal Persahabatan', 'https://images.unsplash.com/photo-1518091043644-c1d4457512c6?auto=format&fit=crop&w=720&h=1280&q=80', 'Olahraga', 'reel', 'tall', 'Momen seru turnamen keakraban antar-kelompok.', '2026-02-20', 'Lapangan Cengkareng', 'published'),
  ('gal_3', '“Rukun, Kompak, Kerja Sama yang Baik”', 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=800&h=800&q=80', 'Karakter', 'quote', 'square', 'Penanaman 6 Karakter Luhur dalam setiap dinamika kepengurusan.', '2026-01-15', 'Cengkareng', 'published'),
  ('gal_4', 'Bakti Sosial & Sembako', 'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?auto=format&fit=crop&w=1000&h=700&q=80', 'Sosial', 'photo', 'landscape', 'Penyaluran paket bantuan pangan untuk warga sekitar.', '2026-02-02', 'Cengkareng', 'published');
`;

const tempSqlPath = path.resolve(process.cwd(), ".seed-temp.sql");

try {
  fs.writeFileSync(tempSqlPath, sqlContent, "utf-8");
  execSync(`npx wrangler d1 execute gencar-db ${envFlag} --file "${tempSqlPath}"`, {
    stdio: "inherit",
  });
  console.log("\n✅ Seeding database sukses!");
  console.log("\nAkun tersimpan:");
  console.log("-----------------------------------------");
  console.log("Admin Daerah   : admin@gencar.com / admin123");
  console.log("Admin Desa     : admindesa@gencar.com / admin123");
  console.log("Admin Kelompok : adminkelompok@gencar.com / admin123");
  console.log("User Generus   : gnr991569@gencar.com / generus123");
  console.log("-----------------------------------------");
} catch (err) {
  console.error("❌ Gagal seeding:", (err as any)?.message);
} finally {
  if (fs.existsSync(tempSqlPath)) {
    fs.unlinkSync(tempSqlPath);
  }
}
