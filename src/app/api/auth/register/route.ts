import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { hashPassword, createSession, SESSION_COOKIE } from "@/lib/auth";

const VALID_ROLES = new Set(["cliente", "profesional", "admin"]);

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const username = typeof body?.username === "string" ? body.username.trim() : "";
  const password = typeof body?.password === "string" ? body.password : "";
  const role = typeof body?.role === "string" && VALID_ROLES.has(body.role) ? body.role : "cliente";

  if (username.length < 3 || password.length < 6) {
    return NextResponse.json(
      { error: "El usuario debe tener al menos 3 caracteres y la contraseña al menos 6." },
      { status: 400 }
    );
  }

  const db = getDb();
  const existing = await db.prepare(`SELECT id FROM users WHERE username = ?`).get(username);
  if (existing) {
    return NextResponse.json({ error: "Ese usuario ya existe." }, { status: 409 });
  }

  const hash = hashPassword(password);

  let clienteId: number | null = null;
  if (role === "cliente") {
    const info = await db.prepare(`INSERT INTO clientes (nombre) VALUES (?)`).run(username);
    clienteId = Number(info.lastInsertRowid);
  }

  // Los clientes se registran libremente y quedan aprobados de inmediato.
  // Profesionales y admins requieren aprobación manual de un administrador.
  const status = role === "cliente" ? "approved" : "pending";

  const info = await db
    .prepare(
      `INSERT INTO users (username, password_hash, role, status, cliente_id) VALUES (?, ?, ?, ?, ?)`
    )
    .run(username, hash, role, status, clienteId);
  const userId = Number(info.lastInsertRowid);

  if (status === "approved") {
    const { token, expiresAt } = await createSession(userId);
    const res = NextResponse.json({ ok: true, autoLogin: true });
    res.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      expires: expiresAt,
    });
    return res;
  }

  return NextResponse.json({
    ok: true,
    autoLogin: false,
    message: "Cuenta creada. Un administrador debe aprobarla antes de que puedas iniciar sesión.",
  });
}
