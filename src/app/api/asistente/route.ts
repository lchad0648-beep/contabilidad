import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { MODULES } from "@/lib/modules";
import { streamAssistantReply, type ChatMessage } from "@/lib/ai";
import { listFacturasPendientes, listTicketsAbiertosResumen } from "@/lib/asistente-contexto";

const MAX_MENSAJES = 20;
const MAX_LARGO_MENSAJE = 4000;

const ACCION_PROTOCOLO = `
Puedes AUTOMATIZAR tareas dentro de la app. Cuando el usuario pida claramente algo que
la app puede hacer por él Y tengas todos los datos necesarios, termina tu respuesta con
un bloque en una sola línea, exactamente con este formato (no lo expliques ni lo muestres
como código al usuario, solo escríbelo tal cual al final):
<accion tipo="TIPO">{"campo":"valor"}</accion>

Reglas estrictas:
- Solo un bloque <accion> por respuesta, y solo si tienes TODOS los datos requeridos.
- Si falta un dato (por ejemplo el motivo o el monto), pregúntalo primero y NO incluyas el bloque todavía.
- Nunca inventes montos, motivos, ids o mensajes que el usuario no te haya dado o confirmado.
- El bloque no se ejecuta solo: el usuario verá un botón para "Seguir adelante" o "Rechazar". Puedes mencionar que va a aparecer ese botón.
- El JSON debe ser válido y usar exactamente las claves indicadas.
`.trim();

function accionesDisponibles(role: string): string {
  if (role === "cliente") {
    return [
      'Tipos de acción disponibles para este usuario (cliente):',
      '- crear_ticket: {"asunto": string, "mensaje": string} — abre un ticket de soporte para este cliente.',
      '- solicitar_prestamo: {"monto": number, "motivo": string} — crea una solicitud de préstamo para este cliente.',
    ].join("\n");
  }
  return [
    "Tipos de acción disponibles para este usuario (staff):",
    '- responder_ticket: {"ticket_id": number, "mensaje": string} — envía, en tu nombre, una respuesta dentro de un ticket de soporte existente, con tono humano, profesional y empático.',
    "Usa el ticket_id exacto de la lista de tickets abiertos que se te da abajo; si no ves el ticket que el admin menciona, pregunta el número o el asunto antes de actuar.",
  ].join("\n");
}

async function buildSystemPrompt(role: string, pagina: string | undefined): Promise<string> {
  const modulosStaff = MODULES.map((m) => m.label).join(", ");
  const contextoRol =
    role === "cliente"
      ? "Este usuario es un cliente y solo ve su propio portal: su resumen de cuenta, recibos, pagos, préstamos y tickets de soporte. No tiene acceso a los módulos internos de contabilidad ni a datos de otros clientes."
      : `Este usuario es parte del staff (rol: ${role}) y tiene acceso a los módulos: ${modulosStaff}, además de Reportes, Tickets, Préstamos y (si es admin) la gestión de usuarios.`;

  const partes = [
    "Eres el asistente de IA integrado en una app web de contabilidad estilo Zoho Books, con estética 'liquid glass' y modo claro/oscuro.",
    contextoRol,
    pagina ? `El usuario está actualmente en la sección: ${pagina}.` : "",
    "Ayudas respondiendo preguntas sobre cómo usar la app, explicando conceptos de contabilidad en términos simples, y sugiriendo pasos concretos dentro de la interfaz (nombres de botones, menús o campos tal como aparecen en la app).",
    "Responde siempre en español, de forma breve, directa y con un tono humano y cercano.",
    ACCION_PROTOCOLO,
    accionesDisponibles(role),
  ];

  if (role !== "cliente") {
    const [facturas, tickets] = await Promise.all([listFacturasPendientes(), listTicketsAbiertosResumen()]);

    partes.push(
      facturas.length > 0
        ? [
            "Facturas (recibos) pendientes de cobro reales, en este momento (úsalas tal cual, no inventes otras):",
            ...facturas.map(
              (f) =>
                `- ${f.numero} | Cliente: ${f.cliente ?? "sin cliente"} | Monto: ${f.monto} | Estado: ${
                  f.estado ?? "sin estado"
                } | Fecha: ${f.fecha}`
            ),
          ].join("\n")
        : "No hay facturas (recibos) pendientes de cobro en este momento."
    );

    partes.push(
      tickets.length > 0
        ? [
            "Tickets de soporte abiertos reales, en este momento (usa estos ticket_id, no inventes otros):",
            ...tickets.map((t) => `- ticket_id ${t.id} | Cliente: ${t.cliente} | Asunto: ${t.asunto} | Estado: ${t.estado}`),
          ].join("\n")
        : "No hay tickets de soporte abiertos en este momento."
    );
  } else {
    partes.push(
      "No inventes datos financieros específicos del usuario (saldos, montos, nombres) que no te haya dado él mismo en la conversación; si pregunta por sus datos reales, indícale en qué sección de la app puede consultarlos."
    );
  }

  return partes.filter(Boolean).join("\n\n");
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.status !== "approved") {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const historial: unknown[] = Array.isArray(body?.mensajes) ? body.mensajes : [];
  const pagina = typeof body?.pagina === "string" ? body.pagina.slice(0, 200) : undefined;

  if (historial.length === 0) {
    return NextResponse.json({ error: "Falta el historial de mensajes." }, { status: 400 });
  }

  function esMensajeValido(m: unknown): m is ChatMessage {
    return (
      typeof m === "object" &&
      m !== null &&
      (("role" in m && (m as ChatMessage).role === "user") || (m as ChatMessage).role === "assistant") &&
      typeof (m as ChatMessage).content === "string"
    );
  }

  const mensajesValidos: ChatMessage[] = historial
    .slice(-MAX_MENSAJES)
    .filter(esMensajeValido)
    .map((m: ChatMessage) => ({ role: m.role, content: m.content.slice(0, MAX_LARGO_MENSAJE) }));

  if (mensajesValidos.length === 0) {
    return NextResponse.json({ error: "Historial inválido." }, { status: 400 });
  }

  const messages: ChatMessage[] = [
    { role: "system", content: await buildSystemPrompt(user.role, pagina) },
    ...mensajesValidos,
  ];

  try {
    const stream = await streamAssistantReply(messages);
    return new NextResponse(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("Error del asistente IA:", err);
    return NextResponse.json({ error: "El asistente no está disponible en este momento." }, { status: 502 });
  }
}
