import { NextRequest, NextResponse } from "next/server";
import { getCurrentEmpresa, type SessionEmpresa } from "@/lib/empresa-auth";
import { streamAssistantReply, type ChatMessage } from "@/lib/ai";
import { listTransferencias } from "@/lib/empresas";
import { listMateriales, precioUnitario, totalMaterial } from "@/lib/empresa-materiales";
import { listEmpleados } from "@/lib/empresa-empleados";
import { getBolsaEstado } from "@/lib/bolsa";

const MAX_MENSAJES = 20;
const MAX_LARGO_MENSAJE = 4000;

const ACCION_PROTOCOLO = `
Puedes AUTOMATIZAR tareas dentro del panel de la empresa. Cuando quien te escribe pida claramente
algo que puedes hacer por él Y tengas todos los datos necesarios, termina tu respuesta con un
bloque en una sola línea, exactamente con este formato (no lo expliques ni lo muestres como
código, solo escríbelo tal cual al final):
<accion tipo="TIPO">{"campo":"valor"}</accion>

Reglas estrictas:
- Solo un bloque <accion> por respuesta, y solo si tienes TODOS los datos requeridos.
- Si falta un dato, pregúntalo primero y NO incluyas el bloque todavía.
- Nunca inventes montos, nombres, cantidades o mensajes que no te hayan dado o confirmado.
- El bloque no se ejecuta solo: va a aparecer un botón para "Seguir adelante" o "Rechazar".
- Para acciones sensibles (despedir a alguien, vender acciones), menciona claramente en tu texto qué se va a hacer antes del bloque.
- El JSON debe ser válido y usar exactamente las claves indicadas.

Tipos de acción disponibles:
- crear_material: {"nombre": string, "cantidad": number, "tipo_precio": "unidad"|"stack64"|"stack_custom", "stack_size": number (solo si tipo_precio es stack_custom), "precio_por_stack": number} — añade un objeto a Logística.
- contratar_empleado: {"usuario": string (username exacto), "salario": number} — contrata a un usuario existente. Debe aparecer en la lista de "usuarios contratables" de abajo si ya se buscó.
- actualizar_salario: {"empleado": string (username), "salario": number}
- pagar_salario: {"empleado": string (username)} — paga ahora mismo el salario de ese empleado.
- despedir_empleado: {"empleado": string (username)} — termina el empleo. Menciónalo claramente antes del bloque.
- enviar_mensaje_empleado_empresa: {"empleado": string (username), "mensaje": string} — le envía un mensaje a un empleado.
- solicitar_bolsa: {"mensaje": string} — abre el ticket para pedirle al banco salir a bolsa (solo si todavía no hay ninguna solicitud en curso).
- lanzar_bolsa: {"pct_salida": number} — confirma la salida a bolsa con ese % de acciones (solo si el banco ya aprobó la solicitud y falta lanzarla).
`.trim();

const EJEMPLOS = `
Ejemplo 1 (pregunta con datos reales disponibles):
Usuario: "¿cuánto dinero tengo?"
Asistente: "Tu saldo actual es de 1200. Tienes 3 empleados activos y 2 materiales en Logística."

Ejemplo 2 (tarea automatizable con todos los datos):
Usuario: "págale el salario a Juan"
Asistente: "Listo, voy a pagar el salario de Juan ahora mismo.
<accion tipo="pagar_salario">{"empleado":"Juan"}</accion>"

Ejemplo 3 (falta un dato):
Usuario: "añade diamante a logística"
Asistente: "Claro, dime la cantidad y el precio (por unidad, por stack de 64, o el tamaño de stack que uses) para dejarlo listo."
`.trim();

async function buildSystemPrompt(empresa: SessionEmpresa, pagina: string | undefined): Promise<string> {
  const [transferencias, materiales, empleados, bolsaEstado] = await Promise.all([
    listTransferencias(empresa.id, 15),
    listMateriales(empresa.id),
    listEmpleados(empresa.id),
    getBolsaEstado(empresa.id),
  ]);

  const empleadosActivos = empleados.filter((e) => e.estado === "activo");
  const totalInventario = materiales.reduce((acc, m) => acc + totalMaterial(m), 0);

  const bolsaTexto =
    bolsaEstado.tipo === "sin_solicitud"
      ? "La empresa todavía no ha solicitado salir a bolsa (pestaña bloqueada)."
      : bolsaEstado.tipo === "pendiente"
        ? "Hay una solicitud de salida a bolsa pendiente de revisión por el banco."
        : bolsaEstado.tipo === "rechazada_cooldown"
          ? "La última solicitud de salida a bolsa fue rechazada; la pestaña está bloqueada temporalmente."
          : bolsaEstado.tipo === "aprobada_config_pendiente"
            ? `El banco aprobó la salida a bolsa (comisión ${bolsaEstado.solicitud.comision_pct}%, ${bolsaEstado.solicitud.total_acciones} acciones totales, valoración ${bolsaEstado.solicitud.valor_empresa}). Falta que la empresa confirme el % que sale a mercado con la acción "lanzar_bolsa".`
            : `La empresa ya cotiza en bolsa. Precio actual: ${bolsaEstado.acciones.precio_actual.toFixed(2)}, acciones disponibles: ${bolsaEstado.acciones.acciones_disponibles}/${bolsaEstado.acciones.acciones_mercado_totales}.`;

  const partes = [
    "Eres el asistente de IA integrado en el panel de gestión de una empresa, dentro de una app de contabilidad estilo Zoho Books con estética 'liquid glass'.",
    `Estás ayudando a la empresa "${empresa.nombre}" (usuario: ${empresa.usuario}). El panel tiene 4 secciones: Resumen, Logística, Empleados y Bolsa.`,
    pagina ? `La empresa está actualmente en la sección: ${pagina}.` : "",
    "Responde siempre en español, de forma breve, directa y con un tono humano y cercano.",
    "Antes de responder: identifica si es una pregunta de información (usa los datos reales de abajo, no inventes) o una tarea automatizable (verifica que tengas todos los datos antes de proponer el bloque <accion>).",
    ACCION_PROTOCOLO,
    EJEMPLOS,
    [
      "Datos reales de la empresa, en este momento (úsalos tal cual, no inventes otros):",
      `- Saldo actual: ${empresa.saldo}`,
      `- Total del inventario en Logística: ${totalInventario.toLocaleString("es")} (${materiales.length} material(es))`,
      materiales.length > 0
        ? `- Materiales: ${materiales
            .map((m) => `${m.nombre} (${m.cantidad} u., precio unitario ${precioUnitario(m).toFixed(2)})`)
            .join(", ")}`
        : "- Todavía no hay materiales en Logística.",
      `- Empleados activos (${empleadosActivos.length}): ${
        empleadosActivos.length > 0
          ? empleadosActivos.map((e) => `${e.username} (salario ${e.salario}, gasto total ${e.gasto_total})`).join(", ")
          : "ninguno"
      }`,
      `- Estado de Bolsa: ${bolsaTexto}`,
      transferencias.length > 0
        ? `- Últimos movimientos de dinero: ${transferencias
            .slice(0, 8)
            .map((t) => `${t.tipo === "ingreso" ? "+" : "-"}${t.monto} (${t.descripcion ?? t.tipo})`)
            .join(", ")}`
        : "- Todavía no hay movimientos de dinero.",
    ].join("\n"),
    "No inventes ningún dato de la empresa que no esté en la lista de arriba.",
  ];

  return partes.filter(Boolean).join("\n\n");
}

export async function POST(req: NextRequest) {
  const empresa = await getCurrentEmpresa();
  if (!empresa) {
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
    { role: "system", content: await buildSystemPrompt(empresa, pagina) },
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
    console.error("Error del asistente IA (empresa):", err);
    return NextResponse.json({ error: "El asistente no está disponible en este momento." }, { status: 502 });
  }
}
