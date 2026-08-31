-- 0010: drop remaining legacy FKs/indexes that reference deleted tables
-- generus.mandiri_* and users.mandiri_* are legacy — schema.ts already removed them, drop if still present
-- SQLite cannot DROP COLUMN with FK constraint directly without table rebuild; D1 sqlite allows it since 3.20+ via ALTER DROP COLUMN if compiled with SQLITE_ENABLE_COLUMN_METADATA.
-- Use rebuild via temp table if needed; for local D1 we attempt DROP COLUMN, else recreate.
-- For now, ensure indexes are dropped; FKs will be ignored since referenced tables gone (or use PRAGMA foreign_keys=OFF on next rebuild).
DROP INDEX IF EXISTS `generus_mandiri_desa_id_idx`;--> statement-breakpoint
DROP INDEX IF EXISTS `generus_mandiri_kelompok_id_idx`;--> statement-breakpoint
DROP INDEX IF EXISTS `users_mandiri_desa_id_idx`;--> statement-breakpoint
DROP INDEX IF EXISTS `users_mandiri_kelompok_id_idx`;--> statement-breakpoint
-- artikel.kategori check: if missing, add (schema expects it)
-- 0000 artikel had no kategori column; 0005 didn't add — 0009 added slug but not kategori — add now
-- Use ADD without IF NOT EXISTS; on fresh D1 after 0009, this is first add for kategori
ALTER TABLE `artikel` ADD `kategori` text DEFAULT 'Tuntunan Ibadah';--> statement-breakpoint
