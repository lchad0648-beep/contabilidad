import { NextRequest, NextResponse } from "next/server";
import { getModule } from "@/lib/modules";
import { listRecords, createRecord } from "@/lib/crud";
import { getCurrentUser } from "@/lib/auth";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ modulo: string }> }) {
  const user = await getCurrentUser();
  if (!user || user.status !== "approved") {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }
  const { modulo } = await ctx.params;
  const mod = getModule(modulo);
  if (!mod) return NextResponse.json({ error: "Módulo no encontrado." }, { status: 404 });
  return NextResponse.json({ records: await listRecords(mod) });
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ modulo: string }> }) {
  const user = await getCurrentUser();
  if (!user || user.status !== "approved") {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }
  const { modulo } = await ctx.params;
  const mod = getModule(modulo);
  if (!mod) return NextResponse.json({ error: "Módulo no encontrado." }, { status: 404 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Cuerpo inválido." }, { status: 400 });

  for (const field of mod.fields) {
    if (field.required && !body[field.name]) {
      return NextResponse.json({ error: `El campo "${field.label}" es requerido.` }, { status: 400 });
    }
  }

  const id = await createRecord(mod, body);
  return NextResponse.json({ ok: true, id });
}
