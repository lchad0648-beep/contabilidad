import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { hashPassword, createEmpresaSession, EMPRESA_SESSION_COOKIE } from "@/lib/empresa-auth";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const nombre = typeof body?.nombre === "string" ? body.nombre.trim() : "";
  const usuario = typeof body?.usuario === "string" ? body.usuario.trim() : "";
  const password = typeof body?.password === "string" ? body.password : "";

  if (nombre.length < 2) {
    return NextResponse.json({ error: "El nombre de la empresa debe tener al menos 2 caracteres." }, { status: 400 });
  }
  if (usuario.length < 3 || password.length < 6) {
    return NextResponse.json(
      { error: "El usuario debe tener al menos 3 caracteres y la contraseña al menos 6." },
      { status: 400 }
    );
  }

  const db = getDb();
  const existing = await db.prepare(`SELECT id FROM empresas WHERE usuario = ?`).get(usuario);
  if (existing) {
    return NextResponse.json({ error: "Ese usuario de empresa ya existe." }, { status: 409 });
  }

  const hash = hashPassword(password);
  const info = await db
    .prepare(`INSERT INTO empresas (nombre, usuario, password_hash) VALUES (?, ?, ?)`)
    .run(nombre, usuario, hash);
  const empresaId = Number(info.lastInsertRowid);

  const { token, expiresAt } = await createEmpresaSession(empresaId);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(EMPRESA_SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
  return res;
}
