import crypto from "node:crypto";
import { cookies } from "next/headers";
import { getDb } from "./db";
import { hashPassword, verifyPassword } from "./auth";
import { EMPRESA_SESSION_COOKIE } from "./session-cookie";

export { EMPRESA_SESSION_COOKIE, hashPassword, verifyPassword };
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 días

export interface SessionEmpresa {
  id: number;
  nombre: string;
  usuario: string;
  saldo: number;
}

export async function createEmpresaSession(empresaId: number): Promise<{ token: string; expiresAt: Date }> {
  const db = getDb();
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await db
    .prepare(`INSERT INTO empresa_sessions (token, empresa_id, expires_at) VALUES (?, ?, ?)`)
    .run(token, empresaId, expiresAt);
  return { token, expiresAt };
}

export async function destroyEmpresaSession(token: string) {
  const db = getDb();
  await db.prepare(`DELETE FROM empresa_sessions WHERE token = ?`).run(token);
}

export async function getEmpresaByToken(token: string): Promise<SessionEmpresa | null> {
  const db = getDb();
  const row = (await db
    .prepare(
      `SELECT e.id, e.nombre, e.usuario, e.saldo
       FROM empresa_sessions s
       JOIN empresas e ON e.id = s.empresa_id
       WHERE s.token = ? AND s.expires_at > now()`
    )
    .get(token)) as SessionEmpresa | undefined;
  return row ?? null;
}

export async function getCurrentEmpresa(): Promise<SessionEmpresa | null> {
  const store = await cookies();
  const token = store.get(EMPRESA_SESSION_COOKIE)?.value;
  if (!token) return null;
  return getEmpresaByToken(token);
}
