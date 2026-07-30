import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { verifyPassword, createEmpresaSession, EMPRESA_SESSION_COOKIE } from "@/lib/empresa-auth";

interface EmpresaRow {
  id: number;
  password_hash: string;
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const usuario = typeof body?.usuario === "string" ? body.usuario.trim() : "";
  const password = typeof body?.password === "string" ? body.password : "";

  if (!usuario || !password) {
    return NextResponse.json({ error: "Usuario y contraseña son requeridos." }, { status: 400 });
  }

  const db = getDb();
  const empresa = (await db
    .prepare(`SELECT id, password_hash FROM empresas WHERE usuario = ?`)
    .get(usuario)) as EmpresaRow | undefined;

  if (!empresa || !verifyPassword(password, empresa.password_hash)) {
    return NextResponse.json({ error: "Usuario o contraseña incorrectos." }, { status: 401 });
  }

  const { token, expiresAt } = await createEmpresaSession(empresa.id);
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
