import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { verifyPassword, createSession, SESSION_COOKIE } from "@/lib/auth";

interface UserRow {
  id: number;
  password_hash: string;
  status: "pending" | "approved" | "rejected";
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const username = typeof body?.username === "string" ? body.username.trim() : "";
  const password = typeof body?.password === "string" ? body.password : "";

  if (!username || !password) {
    return NextResponse.json({ error: "Usuario y contraseña son requeridos." }, { status: 400 });
  }

  const db = getDb();
  const user = (await db
    .prepare(`SELECT id, password_hash, status FROM users WHERE username = ?`)
    .get(username)) as UserRow | undefined;

  if (!user || !verifyPassword(password, user.password_hash)) {
    return NextResponse.json({ error: "Usuario o contraseña incorrectos." }, { status: 401 });
  }

  if (user.status === "pending") {
    return NextResponse.json(
      { error: "Tu cuenta está pendiente de aprobación por un administrador." },
      { status: 403 }
    );
  }
  if (user.status === "rejected") {
    return NextResponse.json({ error: "Tu cuenta fue rechazada por un administrador." }, { status: 403 });
  }

  const { token, expiresAt } = await createSession(user.id);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
  return res;
}
