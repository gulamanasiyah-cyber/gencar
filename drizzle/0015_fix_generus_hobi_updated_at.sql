-- 0015: fix generus hobi_updated_at (missing -> insert gagal) + drop sisa tabel mandiri orphan
-- Root cause error simpan generus: schema.ts punya hobi_updated_at tapi tidak pernah ada di migrasi,
-- sehingga Drizzle insert full-column gagal dengan "table generus has no column named hobi_updated_at".
ALTER TABLE `generus` ADD `hobi_updated_at` text;--> statement-breakpoint
-- mandiri_kegiatan: tabel yatim program lama (tidak ada di schema.ts, FK-nya menunjuk ke
-- mandiri_desa/mandiri_kelompok yang sudah di-drop di 0008). Tidak dipakai kode mana pun.
DROP TABLE IF EXISTS `mandiri_kegiatan`;--> statement-breakpoint
-- Bersih-bersih index yatim kalau masih ada
DROP INDEX IF EXISTS `generus_mandiri_desa_id_idx`;--> statement-breakpoint
DROP INDEX IF EXISTS `generus_mandiri_kelompok_id_idx`;--> statement-breakpoint
DROP INDEX IF EXISTS `users_mandiri_desa_id_idx`;--> statement-breakpoint
DROP INDEX IF EXISTS `users_mandiri_kelompok_id_idx`;
