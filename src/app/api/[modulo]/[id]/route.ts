import { NextRequest, NextResponse } from "next/server";
import { getModule } from "@/lib/modules";
import { getRecord, updateRecord, deleteRecord } from "@/lib/crud";
import { getCurrentUser } from "@/lib/auth";

type Params = { modulo: string; id: string };

async function resolve(ctx: { params: Promise<Params> }) {
  const { modulo, id } = await ctx.params;
  const mod = getModule(modulo);
  const recordId = Number(id);
  return { mod, recordId };
}

export async function GET(_req: NextRequest, ctx: { params: Promise<Params> }) {
  const user = await getCurrentUser();
  if (!user || user.status !== "approved") {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }
  const { mod, recordId } = await resolve(ctx);
  if (!mod || !Number.isFinite(recordId)) {
    return NextResponse.json({ error: "No encontrado." }, { status: 404 });
  }
  const record = await getRecord(mod, recordId);
  if (!record) return NextResponse.json({ error: "No encontrado." }, { status: 404 });
  return NextResponse.json({ record });
}

export async function PUT(req: NextRequest, ctx: { params: Promise<Params> }) {
  const user = await getCurrentUser();
  if (!user || user.status !== "approved") {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }
  const { mod, recordId } = await resolve(ctx);
  if (!mod || !Number.isFinite(recordId)) {
    return NextResponse.json({ error: "No encontrado." }, { status: 404 });
  }
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Cuerpo inválido." }, { status: 400 });

  for (const field of mod.fields) {
    if (field.required && !body[field.name]) {
      return NextResponse.json({ error: `El campo "${field.label}" es requerido.` }, { status: 400 });
    }
  }

  await updateRecord(mod, recordId, body);
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<Params> }) {
  const user = await getCurrentUser();
  if (!user || user.status !== "approved") {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }
  if (user.role !== "admin") {
    return NextResponse.json(
      { error: "Solo un administrador puede eliminar directamente. Solicita el borrado y un admin lo revisará." },
      { status: 403 }
    );
  }
  const { mod, recordId } = await resolve(ctx);
  if (!mod || !Number.isFinite(recordId)) {
    return NextResponse.json({ error: "No encontrado." }, { status: 404 });
  }
  await deleteRecord(mod, recordId);
  return NextResponse.json({ ok: true });
}
