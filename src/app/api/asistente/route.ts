import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, type SessionUser } from "@/lib/auth";
import { MODULES, type ModuleConfig } from "@/lib/modules";
import { streamAssistantReply, type ChatMessage } from "@/lib/ai";
import {
  listFacturasPendientes,
  listTicketsAbiertosResumen,
  listResumenModulos,
  listUsuariosPendientes,
  listPrestamosPendientesResumen,
  listStaffUsuarios,
  getResumenCuentaCliente,
  getResumenFinancieroCompacto,
} from "@/lib/asistente-contexto";

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
- Si falta un dato, pregúntalo primero y NO incluyas el bloque todavía.
- Nunca inventes montos, motivos, ids, usernames o mensajes que el usuario no te haya dado o confirmado.
- El bloque no se ejecuta solo: el usuario verá un botón para "Seguir adelante" o "Rechazar". Puedes mencionar que va a aparecer ese botón.
- Para acciones irreversibles o sensibles (eliminar un registro, rechazar un usuario o un préstamo), menciona claramente en tu texto qué se va a hacer antes del bloque, para que la confirmación sea informada.
- El JSON debe ser válido y usar exactamente las claves indicadas.
`.trim();

const METODO_TRABAJO = `
Antes de responder, sigue mentalmente estos pasos (sin escribirlos, solo aplícalos):
1. Identifica qué pide exactamente el usuario: ¿es una pregunta de solo información, una tarea que la app puede automatizar, o algo fuera de tu alcance?
2. Revisa los datos reales que tienes más abajo en este mensaje. Si la respuesta está ahí, úsala tal cual. Si NO está, dilo claramente en vez de inventar o adivinar.
3. Si es una tarea automatizable, verifica que tengas TODOS los datos obligatorios antes de proponer el bloque <accion>; si falta algo, pregúntalo primero.
4. Responde en 2-6 frases como máximo salvo que el usuario pida un detalle largo: directo, sin relleno, sin repetir la pregunta.
`.trim();

const EJEMPLOS = `
Ejemplo 1 (pregunta con datos reales disponibles):
Usuario: "¿cuánto debo?"
Asistente: "Tu saldo actual es de 250 (facturaste 400 y pagaste 150). Si quieres, puedo ayudarte a revisar el detalle en Mis facturas."

Ejemplo 2 (tarea automatizable, con todos los datos):
Usuario: "abre un ticket, el asunto es 'no veo mi pago' y el mensaje es 'pagué el martes y no aparece'"
Asistente: "Listo, voy a abrir el ticket con ese asunto y mensaje. Te va a aparecer un botón para confirmar.
<accion tipo="crear_ticket">{"asunto":"no veo mi pago","mensaje":"pagué el martes y no aparece"}</accion>"

Ejemplo 3 (falta un dato, NO se propone el bloque todavía):
Usuario: "quiero pedir un préstamo"
Asistente: "Claro, dime el monto que necesitas y para qué lo vas a usar, y te lo dejo listo para confirmar."
`.trim();

function describirCamposModulo(mod: ModuleConfig): string {
  const campos = mod.fields.map((f) => {
    let tipo: string = f.type;
    if (f.type === "select" && f.options) tipo = `una de estas opciones: ${f.options.join("/")}`;
    if (f.type === "ref") tipo = `nombre exacto de un registro existente en ${f.refTable}`;
    if (f.type === "date") tipo = "fecha en formato YYYY-MM-DD";
    if (f.type === "number") tipo = "número";
    return `${f.name}${f.required ? " (obligatorio)" : ""}: ${tipo}`;
  });
  return `  * ${mod.slug} — ${campos.join("; ")}`;
}

function accionesDisponibles(role: string): string {
  if (role === "cliente") {
    return [
      "Tipos de acción disponibles para este usuario (cliente):",
      '- crear_ticket: {"asunto": string, "mensaje": string} — abre un ticket de soporte para este cliente.',
      '- solicitar_prestamo: {"monto": number, "motivo": string} — crea una solicitud de préstamo para este cliente.',
    ].join("\n");
  }

  const camposPorModulo = MODULES.map(describirCamposModulo).join("\n");

  const lineas = [
    "Tipos de acción disponibles para este usuario (staff). Tienes acceso a TODOS los módulos y funciones de gestión, no solo a una parte:",
    "",
    "IMPORTANTE sobre identificadores: NUNCA inventes ni transcribas un id numérico de memoria. Para referirte a un préstamo, ticket o registro de un módulo, usa el nombre/username/texto que te dio el usuario (los campos 'cliente', 'asunto', 'buscar' de abajo) y el servidor lo va a buscar por ti. Solo usa un id numérico ('prestamo_id', 'ticket_id', 'id') si el usuario te lo dio explícitamente como número, o si ya te lo confirmó en un mensaje anterior de esta misma conversación.",
    "",
    '- crud_crear: {"modulo": string (slug del módulo), "datos": {...campos...}} — crea un registro nuevo en cualquiera de los módulos de abajo.',
    '- crud_actualizar: {"modulo": string, "buscar": string (nombre/número del registro tal como lo dio el usuario) | "id": number, "datos": {...campos a cambiar...}} — actualiza un registro existente (solo incluye los campos que cambian). Prefiere "buscar" sobre "id".',
    '- crud_eliminar: {"modulo": string, "buscar": string | "id": number} — elimina un registro. Es irreversible: antes de proponer el bloque, confirma en tu texto qué registro exacto se va a borrar.',
    "",
    "Módulos disponibles y sus campos (usa exactamente estos nombres de slug y de campo):",
    camposPorModulo,
    "",
    '- responder_ticket: {"cliente": string (username) | "asunto": string | "ticket_id": number, "mensaje": string} — envía, en tu nombre, una respuesta dentro de un ticket de soporte existente, con tono humano, profesional y empático. Prefiere "cliente" o "asunto" sobre "ticket_id".',
    '- asignar_ticket: {"cliente": string | "asunto": string | "ticket_id": number, "a": string} — asigna un ticket a un miembro del staff. Usa "a": "yo" si el usuario pide asignárselo a sí mismo, o el username exacto de otro miembro del staff de la lista de abajo.',
    '- cambiar_estado_ticket: {"cliente": string | "asunto": string | "ticket_id": number, "estado": "Abierto"|"En progreso"|"Cerrado"}',
    "",
    '- aprobar_prestamo: {"cliente": string (username del cliente) | "prestamo_id": number, "plazo_valor": number, "plazo_unidad": "dias"|"semanas"|"meses", "tipo_pago": "unico"|"cuotas", "num_cuotas": number, "tasa_interes": number} — aprueba una solicitud de préstamo pendiente y define sus condiciones. "num_cuotas" solo aplica si tipo_pago es "cuotas" (usa 1 si es "unico"). Prefiere "cliente" sobre "prestamo_id".',
    '- rechazar_prestamo: {"cliente": string | "prestamo_id": number}',
    '- reasignar_prestamo: {"cliente": string | "prestamo_id": number, "staff_username": string}',
    '- marcar_cuota_pagada: {"cliente": string | "prestamo_id": number, "numero_cuota": number} — marca como pagada una cuota específica de un préstamo.',
    "",
    'Si al confirmar una acción el sistema responde que hay varias coincidencias (ids listados) o que no encontró nada, pregunta al usuario para desambiguar en vez de adivinar un id.',
  ];

  if (role === "admin") {
    lineas.push(
      "",
      "Acciones exclusivas de administrador:",
      '- aprobar_usuario: {"username": string} — aprueba a un usuario de staff (admin/profesional) pendiente de aprobación.',
      '- rechazar_usuario: {"username": string}'
    );
  }

  return lineas.join("\n");
}

async function buildSystemPrompt(user: SessionUser, pagina: string | undefined): Promise<string> {
  const role = user.role;
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
    METODO_TRABAJO,
    ACCION_PROTOCOLO,
    accionesDisponibles(role),
    EJEMPLOS,
  ];

  if (role !== "cliente") {
    const [facturas, tickets, modulos, prestamosPendientes, staff, financiero] = await Promise.all([
      listFacturasPendientes(),
      listTicketsAbiertosResumen(),
      listResumenModulos(),
      listPrestamosPendientesResumen(),
      listStaffUsuarios(),
      getResumenFinancieroCompacto(),
    ]);

    partes.push(
      [
        "Resumen financiero real del negocio, en este momento (vista simplificada derivada de los módulos, no un balance certificado; úsalo para responder preguntas de reportes/estados financieros):",
        `- Activos: ${financiero.activos}`,
        `- Pasivos: ${financiero.pasivos}`,
        `- Patrimonio: ${financiero.patrimonio}`,
        `- Ingresos: ${financiero.ingresos}`,
        `- Gastos: ${financiero.gastos}`,
      ].join("\n")
    );

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

    partes.push(
      prestamosPendientes.length > 0
        ? [
            "Solicitudes de préstamo pendientes de revisión reales (usa estos prestamo_id, no inventes otros):",
            ...prestamosPendientes.map(
              (p) => `- prestamo_id ${p.id} | Cliente: ${p.cliente} | Monto solicitado: ${p.monto_solicitado} | Motivo: ${p.motivo}`
            ),
          ].join("\n")
        : "No hay solicitudes de préstamo pendientes de revisión en este momento."
    );

    partes.push(
      [
        "Resumen real de TODOS los módulos de la app (total de registros y algunos recientes; usa estos datos tal cual, no inventes otros):",
        ...modulos.map(
          (m) =>
            `- ${m.label} (slug: ${m.slug}): ${m.total} registro(s)${
              m.recientes.length > 0 ? ` | recientes: ${m.recientes.join(" ~ ")}` : ""
            }`
        ),
      ].join("\n")
    );

    partes.push(
      staff.length > 0
        ? [
            "Miembros del staff disponibles para asignar tickets o préstamos (username | rol):",
            ...staff.map((s) => `- ${s.username} | ${s.role}`),
          ].join("\n")
        : "No hay otros miembros de staff registrados."
    );

    if (role === "admin") {
      const usuariosPendientes = await listUsuariosPendientes();
      partes.push(
        usuariosPendientes.length > 0
          ? [
              "Usuarios de staff pendientes de aprobación reales (usa estos usernames, no inventes otros):",
              ...usuariosPendientes.map((u) => `- ${u.username} | rol solicitado: ${u.role}`),
            ].join("\n")
          : "No hay usuarios pendientes de aprobación en este momento."
      );
    }
  } else if (user.cliente_id) {
    const cuenta = await getResumenCuentaCliente(user.cliente_id, user.id);
    partes.push(
      [
        "Datos reales de la cuenta de ESTE cliente, en este momento (úsalos tal cual para responder, no inventes otros ni muestres datos de otros clientes):",
        `- Total facturado: ${cuenta.totalFacturado}`,
        `- Total pagado: ${cuenta.totalPagado}`,
        `- Saldo (positivo = debe, negativo = pagó de más): ${cuenta.saldo}`,
        `- Tickets de soporte abiertos: ${cuenta.ticketsAbiertos}`,
        cuenta.facturasRecientes.length > 0
          ? `- Facturas recientes: ${cuenta.facturasRecientes
              .map((f) => `${f.numero} (${f.fecha}, ${f.monto}, ${f.estado ?? "sin estado"})`)
              .join(" ~ ")}`
          : "- Sin facturas registradas todavía.",
        cuenta.pagosRecientes.length > 0
          ? `- Pagos recientes: ${cuenta.pagosRecientes
              .map((p) => `${p.numero ?? "sin número"} (${p.fecha}, ${p.monto})`)
              .join(" ~ ")}`
          : "- Sin pagos registrados todavía.",
        cuenta.prestamos.length > 0
          ? `- Préstamos: ${cuenta.prestamos
              .map((p) => `#${p.id} estado ${p.estado}, solicitado ${p.monto_solicitado}${p.monto_a_devolver ? `, a devolver ${p.monto_a_devolver}` : ""}`)
              .join(" ~ ")}`
          : "- Sin préstamos registrados todavía.",
      ].join("\n")
    );
    partes.push(
      "No inventes ningún dato de la cuenta que no esté en la lista de arriba; si te preguntan algo que no tienes (ej. facturas más antiguas que las listadas), indica en qué sección de la app puede consultarlo."
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
    { role: "system", content: await buildSystemPrompt(user, pagina) },
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
