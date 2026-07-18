import { Pool, types, type PoolClient } from "pg";
import bcrypt from "bcryptjs";
import fs from "node:fs";
import path from "node:path";

// Postgres devuelve DATE/TIMESTAMP como objetos Date por defecto; los forzamos
// a texto plano para que el resto de la app (que espera strings tipo SQLite)
// no tenga que cambiar su forma de mostrar/comparar fechas.
types.setTypeParser(1082, (val) => val); // date
types.setTypeParser(1114, (val) => (val ? val.replace(/\.\d+$/, "") : val)); // timestamp sin zona
types.setTypeParser(20, (val) => parseInt(val, 10)); // bigint/int8 (p.ej. COUNT(*)) -> number

const CONNECTION_STRING =
  process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.POSTGRES_URL_NON_POOLING;

declare global {
  // eslint-disable-next-line no-var
  var __pgPool__: Pool | undefined;
  // eslint-disable-next-line no-var
  var __dbReady__: Promise<void> | undefined;
}

function getPool(): Pool {
  if (!CONNECTION_STRING) {
    throw new Error(
      "Falta DATABASE_URL (o POSTGRES_URL): la cadena de conexión a Postgres/Supabase."
    );
  }
  if (!global.__pgPool__) {
    global.__pgPool__ = new Pool({
      connectionString: CONNECTION_STRING,
      ssl: CONNECTION_STRING.includes("sslmode=") ? undefined : { rejectUnauthorized: false },
      max: 5,
    });
  }
  return global.__pgPool__;
}

function toPgQuery(sql: string): string {
  let i = 0;
  return sql
    .replace(/datetime\('now'\)/gi, "now()")
    .replace(/date\('now'\)/gi, "CURRENT_DATE")
    .replace(/\?/g, () => `$${++i}`);
}

// Todas las tablas usan "id" como PK autogenerada, excepto "sessions" (usa "token").
const TABLES_WITHOUT_ID = /^\s*insert\s+into\s+sessions\b/i;

function needsReturningId(sql: string): boolean {
  return /^\s*insert\s+into/i.test(sql) && !/returning/i.test(sql) && !TABLES_WITHOUT_ID.test(sql);
}

interface RunResult {
  lastInsertRowid: number | undefined;
  changes: number;
}

// Devuelve `any` a propósito (igual que better-sqlite3) para que los call sites
// puedan seguir usando `as MiTipo[]` sin pelear con el chequeo de "overlap" de TS.
export interface Statement {
  get: (...params: unknown[]) => Promise<any>;
  all: (...params: unknown[]) => Promise<any[]>;
  run: (...params: unknown[]) => Promise<RunResult>;
}

interface Queryable {
  query: (sql: string, params?: unknown[]) => Promise<{ rows: any[]; rowCount: number | null }>;
}

function statementFor(queryable: Queryable, sql: string): Statement {
  const finalSql = needsReturningId(sql) ? `${toPgQuery(sql)} RETURNING id` : toPgQuery(sql);

  async function exec(params: unknown[]) {
    await global.__dbReady__;
    return queryable.query(finalSql, params);
  }

  return {
    async get(...params: unknown[]) {
      const result = await exec(params);
      return result.rows[0];
    },
    async all(...params: unknown[]) {
      const result = await exec(params);
      return result.rows;
    },
    async run(...params: unknown[]) {
      const result = await exec(params);
      return { lastInsertRowid: result.rows[0]?.id, changes: result.rowCount ?? 0 };
    },
  };
}

export interface Db {
  prepare: (sql: string) => Statement;
}

function dbFor(queryable: Queryable): Db {
  return { prepare: (sql: string) => statementFor(queryable, sql) };
}

/** Ejecuta un callback dentro de una transacción real de Postgres (BEGIN/COMMIT/ROLLBACK). */
export async function withTransaction<T>(callback: (tx: Db) => Promise<T>): Promise<T> {
  await global.__dbReady__;
  const pool = getPool();
  const client: PoolClient = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await callback(dbFor(client));
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

async function init(): Promise<void> {
  const pool = getPool();
  const schemaPath = path.join(process.cwd(), "db", "schema.sql");
  const schema = fs.readFileSync(schemaPath, "utf-8");
  await pool.query(schema);

  const username = process.env.ADMIN_USER || "admin";
  const password = process.env.ADMIN_PASSWORD || "admin123";
  const hash = bcrypt.hashSync(password, 10);
  // ON CONFLICT ... DO UPDATE: si ADMIN_USER/ADMIN_PASSWORD cambian en las variables
  // de entorno, el próximo arranque (cold start / redeploy) sincroniza la contraseña
  // del admin sembrado en vez de dejarla congelada en el primer valor que tuvo.
  await pool.query(
    `INSERT INTO users (username, password_hash, role, status, approved_at)
     VALUES ($1, $2, 'admin', 'approved', now())
     ON CONFLICT (username) DO UPDATE SET password_hash = EXCLUDED.password_hash
     WHERE users.role = 'admin'`,
    [username, hash]
  );
}

export function getDb(): Db {
  if (!global.__dbReady__) {
    global.__dbReady__ = init();
  }
  return dbFor(getPool());
}
