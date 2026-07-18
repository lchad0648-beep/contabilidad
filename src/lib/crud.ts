import { getDb } from "./db";
import { ModuleConfig } from "./modules";

function dataFields(mod: ModuleConfig) {
  return mod.fields.map((f) => f.name);
}

function coerceValue(mod: ModuleConfig, name: string, raw: unknown): unknown {
  const field = mod.fields.find((f) => f.name === name);
  if (!field) return null;
  if (raw === "" || raw === undefined || raw === null) return null;
  if (field.type === "number" || field.type === "ref") {
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  }
  return String(raw);
}

export async function listRecords(mod: ModuleConfig): Promise<Record<string, unknown>[]> {
  const db = getDb();
  const orderCol = mod.fields.some((f) => f.name === "fecha") ? "fecha" : "id";
  return (await db
    .prepare(`SELECT * FROM ${mod.table} ORDER BY ${orderCol} DESC, id DESC`)
    .all()) as Record<string, unknown>[];
}

export async function getRecord(mod: ModuleConfig, id: number): Promise<Record<string, unknown> | null> {
  const db = getDb();
  const row = await db.prepare(`SELECT * FROM ${mod.table} WHERE id = ?`).get(id);
  return (row as Record<string, unknown>) ?? null;
}

export async function createRecord(mod: ModuleConfig, data: Record<string, unknown>): Promise<number> {
  const db = getDb();
  const fields = dataFields(mod);
  const cols = fields.filter((f) => f in data);
  const placeholders = cols.map(() => "?").join(", ");
  const values = cols.map((c) => coerceValue(mod, c, data[c]));
  const info = await db
    .prepare(`INSERT INTO ${mod.table} (${cols.join(", ")}) VALUES (${placeholders})`)
    .run(...values);
  return Number(info.lastInsertRowid);
}

export async function updateRecord(mod: ModuleConfig, id: number, data: Record<string, unknown>) {
  const db = getDb();
  const fields = dataFields(mod);
  const cols = fields.filter((f) => f in data);
  if (cols.length === 0) return;
  const setClause = cols.map((c) => `${c} = ?`).join(", ");
  const values = cols.map((c) => coerceValue(mod, c, data[c]));
  await db.prepare(`UPDATE ${mod.table} SET ${setClause} WHERE id = ?`).run(...values, id);
}

export async function deleteRecord(mod: ModuleConfig, id: number) {
  const db = getDb();
  await db.prepare(`DELETE FROM ${mod.table} WHERE id = ?`).run(id);
}

const REF_TABLES = new Set(["clientes", "proveedores"]);

export async function getRefOptions(
  refTable: string,
  refLabel: string
): Promise<{ id: number; label: string }[]> {
  if (!REF_TABLES.has(refTable)) return [];
  const db = getDb();
  const rows = (await db
    .prepare(`SELECT id, ${refLabel} as label FROM ${refTable} ORDER BY ${refLabel} ASC`)
    .all()) as { id: number; label: string }[];
  return rows;
}
