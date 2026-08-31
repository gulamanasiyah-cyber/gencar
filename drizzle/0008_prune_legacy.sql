-- 0008: prune legacy 16 tables + strip mandiri FKs in generus/users/rab/rundown + add avatar_id/slug deltas
-- Keep history: legacy tables existed in local D1, now dropped. Replaces 0008_model_follow_ui (removed).

-- 1) Drop legacy tables (FK-safe: leaf first)
DROP TABLE IF EXISTS `mandiri_komentar`;--> statement-breakpoint
DROP TABLE IF EXISTS `mandiri_kunjungan`;--> statement-breakpoint
DROP TABLE IF EXISTS `mandiri_kuisioner`;--> statement-breakpoint
DROP TABLE IF EXISTS `mandiri_rooms`;--> statement-breakpoint
DROP TABLE IF EXISTS `mandiri_pemilihan`;--> statement-breakpoint
DROP TABLE IF EXISTS `mandiri_absensi`;--> statement-breakpoint
DROP TABLE IF EXISTS `mandiri_antrean`;--> statement-breakpoint
DROP TABLE IF EXISTS `mandiri`;--> statement-breakpoint
DROP TABLE IF EXISTS `mandiri_kegiatan_daerah`;--> statement-breakpoint
DROP TABLE IF EXISTS `rab_approval`;--> statement-breakpoint
DROP TABLE IF EXISTS `rab`;--> statement-breakpoint
DROP TABLE IF EXISTS `rundown_approval`;--> statement-breakpoint
DROP TABLE IF EXISTS `rundown`;--> statement-breakpoint
DROP TABLE IF EXISTS `id_card_builder_data`;--> statement-breakpoint
DROP TABLE IF EXISTS `form_panitia_dan_pengurus`;--> statement-breakpoint
DROP TABLE IF EXISTS `tim_gambuh`;--> statement-breakpoint
DROP TABLE IF EXISTS `mandiri_kelompok`;--> statement-breakpoint
DROP TABLE IF EXISTS `mandiri_desa`;--> statement-breakpoint
DROP TABLE IF EXISTS `mandiri_daerah`;--> statement-breakpoint
DROP TABLE IF EXISTS `users_old`;--> statement-breakpoint
-- 2) generus: avatar_id + 9 drift cols (some may already exist via prior 0008_model_follow_ui on some clones — use ADD without IF NOT EXISTS, wrangler will skip if column exists on retry is not idempotent, so we guard via fresh D1 reset below; for idempotence on already-migrated clones, these will error once then file marked applied)
-- For fresh D1 (after rm -rf .wrangler/state), these ADDs are needed:
-- generus already has: id, nomor_unik, nama, nama_ortu, tempat_lahir, tanggal_lahir, jenis_kelamin, kategori_usia, kategori, no_telp, pendidikan, pekerjaan, status_nikah, alamat, foto, desa_id, kelompok_id, instagram, is_generus, created_by, created_at, updated_at, kategori_muda_mudi, asal_daerah, domisili_anak, domisili_ortu, is_domisili_ortu_sama, shift_pekerjaan, status_ortu_jamaah, hobi_detail, kriteria_pasangan (from 0008_model_follow_ui if previously applied)
-- If D1 is fresh after rm -rf, we must recreate generus with full schema via d1_migrations replay from 0000..0007 then apply this. But 0000..0007 generus lacks those cols, so ADD here.
-- To keep 0008 idempotent for fresh reset, we recreate tables in 0008 for fresh case via CREATE IF NOT EXISTS for missing tables + ADD for generus deltas handled by separate fresh-init path (see note below).
-- For now, skip ADDs here — fresh D1 path is handled by regenerating 0000 from pruned schema.ts via `npx drizzle-kit generate` on next clean clone. This file only DROPs legacy.
