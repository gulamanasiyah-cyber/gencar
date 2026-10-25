import { sql } from "drizzle-orm";
import { db } from "@/lib/db";

type SchemaColumn = {
  table: "mandiri_rooms" | "mandiri_pemilihan";
  name: string;
  statement: ReturnType<typeof sql>;
};

const requiredColumns: SchemaColumn[] = [
  { table: "mandiri_rooms", name: "assigned_caller_id", statement: sql`ALTER TABLE mandiri_rooms ADD COLUMN assigned_caller_id TEXT` },
  { table: "mandiri_rooms", name: "assigned_caller2_id", statement: sql`ALTER TABLE mandiri_rooms ADD COLUMN assigned_caller2_id TEXT` },
  { table: "mandiri_rooms", name: "assigned_guard_id", statement: sql`ALTER TABLE mandiri_rooms ADD COLUMN assigned_guard_id TEXT` },
  { table: "mandiri_pemilihan", name: "assigned_caller_id", statement: sql`ALTER TABLE mandiri_pemilihan ADD COLUMN assigned_caller_id TEXT` },
  { table: "mandiri_pemilihan", name: "assigned_caller2_id", statement: sql`ALTER TABLE mandiri_pemilihan ADD COLUMN assigned_caller2_id TEXT` },
  { table: "mandiri_pemilihan", name: "assigned_guard_id", statement: sql`ALTER TABLE mandiri_pemilihan ADD COLUMN assigned_guard_id TEXT` },
];

type SchemaGlobal = typeof globalThis & {
  __mandiriRoomSchemaReady?: Promise<void>;
  __saranActivitySchemaReady?: Promise<void>;
};

const schemaGlobal = globalThis as SchemaGlobal;

/**
 * Keep compatibility with older databases without issuing ALTER TABLE on every
 * dashboard request. The table definition is inspected once per process, and
 * only missing columns are added.
 */
export function ensureMandiriRoomSchema(): Promise<void> {
  if (!schemaGlobal.__mandiriRoomSchemaReady) {
    schemaGlobal.__mandiriRoomSchemaReady = (async () => {
      const tables = await db.select({
        name: sql<string>`name`,
        definition: sql<string>`sql`,
      })
        .from(sql`sqlite_master`)
        .where(sql`type = 'table' AND name IN ('mandiri_rooms', 'mandiri_pemilihan')`);
      const definitions = new Map<string, string>(
        tables.map((table: any) => [String(table.name), String(table.definition || "").toLowerCase()])
      );

      for (const tableName of ["mandiri_rooms", "mandiri_pemilihan"]) {
        if (!definitions.has(tableName)) {
          throw new Error(`Missing required table: ${tableName}`);
        }
      }

      for (const column of requiredColumns) {
        if (!definitions.get(column.table)?.includes(column.name)) {
          await db.run(column.statement);
        }
      }
    })().catch((error) => {
      schemaGlobal.__mandiriRoomSchemaReady = undefined;
      throw error;
    });
  }

  return schemaGlobal.__mandiriRoomSchemaReady!;
}

/** Add the optional activity link to old suggestion databases only once. */
export function ensureSaranActivitySchema(): Promise<void> {
  if (!schemaGlobal.__saranActivitySchemaReady) {
    schemaGlobal.__saranActivitySchemaReady = (async () => {
      const tables = await db.select({
        name: sql<string>`name`,
        definition: sql<string>`sql`,
      })
        .from(sql`sqlite_master`)
        .where(sql`type = 'table' AND name = 'saran_masukan'`);
      const tableDefinition = String(tables[0]?.definition || "").toLowerCase();
      if (!tableDefinition) throw new Error("Missing required table: saran_masukan");
      if (!tableDefinition.includes("kegiatan_id")) {
        await db.run(sql`ALTER TABLE saran_masukan ADD COLUMN kegiatan_id TEXT`);
      }
      await db.run(sql`CREATE INDEX IF NOT EXISTS saran_masukan_kegiatan_id_idx ON saran_masukan(kegiatan_id)`);
    })().catch((error) => {
      schemaGlobal.__saranActivitySchemaReady = undefined;
      throw error;
    });
  }

  return schemaGlobal.__saranActivitySchemaReady!;
}
