import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { MODULES } from "@/lib/modules";
import { streamAssistantReply, type ChatMessage } from "@/lib/ai";

const MAX_MENSAJES = 20;
const MAX_LARGO_MENSAJE = 4000;

function buildSystemPrompt(role: string, pagina: string | undefined): string {
  const modulosStaff = MODULES.map((m) => m.label).join(", ");
  const contextoRol =
    role === "cliente"
      ? "Este usuario es un cliente y solo ve su propio portal: su resumen de cuenta, recibos, pagos, préstamos y tickets de soporte. No tiene acceso a los módulos internos de contabilidad ni a datos de otros clientes."
      : `Este usuario es parte del staff (rol: ${role}) y tiene acceso a los módulos: ${modulosStaff}, además de Reportes, Tickets, Préstamos y (si es admin) la gestión de usuarios.`;

  return [
    "Eres el asistente de IA integrado en una app web de contabilidad estilo Zoho Books, con estética 'liquid glass' y modo claro/oscuro.",
    contextoRol,
    pagina ? `El usuario está actualmente en la sección: ${pagina}.` : "",
    "Ayudas respondiendo preguntas sobre cómo usar la app, explicando conceptos de contabilidad en términos simples, y sugiriendo pasos concretos dentro de la interfaz (nombres de botones, menús o campos tal como aparecen en la app).",
    "No inventes datos financieros específicos del usuario (saldos, montos, nombres de clientes) porque no tienes acceso directo a la base de datos; si te preguntan por esos datos, indica en qué sección de la app pueden consultarlos.",
    "Responde siempre en español, de forma breve y directa.",
  ]
    .filter(Boolean)
    .join("\n");
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
    { role: "system", content: buildSystemPrompt(user.role, pagina) },
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
