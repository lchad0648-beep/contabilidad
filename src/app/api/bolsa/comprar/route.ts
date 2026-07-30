import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { comprarAcciones } from "@/lib/bolsa";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.status !== "approved") {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const empresaId = Number(body?.empresaId);
  const cantidad = Math.floor(Number(body?.cantidad));
  if (!empresaId || !cantidad) {
    return NextResponse.json({ error: "Datos inválidos." }, { status: 400 });
  }

  const result = await comprarAcciones(empresaId, user.id, cantidad);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ ok: true });
}
