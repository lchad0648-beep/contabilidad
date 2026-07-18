import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getTicket, listMessages, addMessage } from "@/lib/tickets";

async function authorizeTicket(ticketId: number) {
  const user = await getCurrentUser();
  if (!user || user.status !== "approved") return { user: null, ticket: null };
  const ticket = await getTicket(ticketId);
  if (!ticket) return { user, ticket: null };
  const allowed = user.role !== "cliente" || ticket.cliente_user_id === user.id;
  return { user, ticket: allowed ? ticket : null };
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const ticketId = Number(id);
  const { user, ticket } = await authorizeTicket(ticketId);
  if (!user) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  if (!ticket) return NextResponse.json({ error: "No encontrado." }, { status: 404 });

  const after = Number(new URL(req.url).searchParams.get("after") ?? 0);
  const mensajes = await listMessages(ticketId, Number.isFinite(after) ? after : 0);
  return NextResponse.json({ mensajes });
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const ticketId = Number(id);
  const { user, ticket } = await authorizeTicket(ticketId);
  if (!user) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  if (!ticket) return NextResponse.json({ error: "No encontrado." }, { status: 404 });
  if (ticket.estado === "Cerrado") {
    return NextResponse.json({ error: "El ticket está cerrado." }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const mensaje = typeof body?.mensaje === "string" ? body.mensaje.trim() : "";
  if (!mensaje) return NextResponse.json({ error: "Mensaje vacío." }, { status: 400 });

  await addMessage(ticketId, user.id, mensaje);
  return NextResponse.json({ ok: true });
}
