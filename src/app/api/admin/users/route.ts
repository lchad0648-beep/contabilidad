import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  const me = await getCurrentUser();
  if (!me || me.role !== "admin") {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }
  const db = getDb();
  const users = await db
    .prepare(
      `SELECT id, username, role, status, created_at, approved_at FROM users ORDER BY created_at DESC`
    )
    .all();
  return NextResponse.json({ users });
}

export async function PATCH(req: NextRequest) {
  const me = await getCurrentUser();
  if (!me || me.role !== "admin") {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }
  const body = await req.json().catch(() => null);
  const id = Number(body?.id);
  const status = body?.status;
  if (!id || !["approved", "rejected", "pending"].includes(status)) {
    return NextResponse.json({ error: "Parámetros inválidos." }, { status: 400 });
  }

  const db = getDb();
  await db
    .prepare(`UPDATE users SET status = ?, approved_by = ?, approved_at = datetime('now') WHERE id = ?`)
    .run(status, me.id, id);

  return NextResponse.json({ ok: true });
}
