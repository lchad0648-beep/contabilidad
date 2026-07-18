import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

const MAX_TEXTO = 4000;

function texto(valor: unknown, max = MAX_TEXTO): string | null {
  if (typeof valor !== "string") return null;
  const limpio = valor.trim();
  return limpio.length > 0 ? limpio.slice(0, max) : null;
}

function numeroPositivo(valor: unknown): number | null {
  const n = typeof valor === "number" ? valor : Number(valor);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.status !== "approved") {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const tipo = typeof body?.tipo === "string" ? body.tipo : null;
  const payload = body?.payload;

  if (!tipo || typeof payload !== "object" || payload === null) {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
  }

  try {
    if (tipo === "crear_ticket") {
      if (user.role !== "cliente") {
        return NextResponse.json({ error: "Solo los clientes pueden abrir tickets." }, { status: 403 });
      }
      const asunto = texto((payload as Record<string, unknown>).asunto, 200);
      const mensaje = texto((payload as Record<string, unknown>).mensaje);
      if (!asunto || !mensaje) {
        return NextResponse.json({ error: "Falta el asunto o el mensaje del ticket." }, { status: 400 });
      }
      const { createTicket } = await import("@/lib/tickets");
      const ticketId = await createTicket(user.id, asunto, mensaje);
      return NextResponse.json({
        ok: true,
        mensaje: `Listo, abrí el ticket #${ticketId}: "${asunto}".`,
        url: "/portal/tickets/" + ticketId,
      });
    }

    if (tipo === "solicitar_prestamo") {
      if (user.role !== "cliente") {
        return NextResponse.json({ error: "Solo los clientes pueden solicitar préstamos." }, { status: 403 });
      }
      const monto = numeroPositivo((payload as Record<string, unknown>).monto);
      const motivo = texto((payload as Record<string, unknown>).motivo);
      if (!monto || !motivo) {
        return NextResponse.json({ error: "Falta el monto o el motivo del préstamo." }, { status: 400 });
      }
      const { crearPrestamo } = await import("@/lib/prestamos");
      const prestamoId = await crearPrestamo(user.id, monto, motivo);
      return NextResponse.json({
        ok: true,
        mensaje: `Listo, envié tu solicitud de préstamo #${prestamoId} por ${monto.toLocaleString("es")}.`,
        url: "/portal/prestamos/" + prestamoId,
      });
    }

    if (tipo === "responder_ticket") {
      if (user.role === "cliente") {
        return NextResponse.json({ error: "No autorizado." }, { status: 403 });
      }
      const ticketId = numeroPositivo((payload as Record<string, unknown>).ticket_id);
      const mensaje = texto((payload as Record<string, unknown>).mensaje);
      if (!ticketId || !mensaje) {
        return NextResponse.json({ error: "Falta el ticket_id o el mensaje de respuesta." }, { status: 400 });
      }
      const { getTicket, addMessage } = await import("@/lib/tickets");
      const ticket = await getTicket(ticketId);
      if (!ticket) {
        return NextResponse.json({ error: "El ticket indicado no existe." }, { status: 404 });
      }
      await addMessage(ticketId, user.id, mensaje);
      return NextResponse.json({
        ok: true,
        mensaje: `Listo, envié tu respuesta en el ticket #${ticketId}.`,
        url: "/tickets/" + ticketId,
      });
    }

    return NextResponse.json({ error: "Tipo de acción desconocido." }, { status: 400 });
  } catch (err) {
    console.error("Error ejecutando acción del asistente IA:", err);
    return NextResponse.json({ error: "No se pudo completar la acción." }, { status: 500 });
  }
}
