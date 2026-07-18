import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { cookies } from "next/headers";
import { getDb } from "./db";
import { SESSION_COOKIE } from "./session-cookie";

export { SESSION_COOKIE };
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

export interface SessionUser {
  id: number;
  username: string;
  role: "admin" | "profesional" | "cliente";
  status: "pending" | "approved" | "rejected";
  cliente_id: number | null;
}

export function hashPassword(password: string): string {
  return bcrypt.hashSync(password, 10);
}

export function verifyPassword(password: string, hash: string): boolean {
  return bcrypt.compareSync(password, hash);
}

export async function createSession(userId: number): Promise<{ token: string; expiresAt: Date }> {
  const db = getDb();
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await db
    .prepare(`INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)`)
    .run(token, userId, expiresAt);
  return { token, expiresAt };
}

export async function destroySession(token: string) {
  const db = getDb();
  await db.prepare(`DELETE FROM sessions WHERE token = ?`).run(token);
}

export async function getUserByToken(token: string): Promise<SessionUser | null> {
  const db = getDb();
  const row = (await db
    .prepare(
      `SELECT u.id, u.username, u.role, u.status, u.cliente_id
       FROM sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.token = ? AND s.expires_at > now()`
    )
    .get(token)) as SessionUser | undefined;
  return row ?? null;
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return getUserByToken(token);
}
