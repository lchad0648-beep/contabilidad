import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getModule } from "@/lib/modules";

const MAX_TEXTO = 4000;
const PLAZO_UNIDADES = new Set(["dias", "semanas", "meses"]);
const TIPOS_PAGO = new Set(["unico", "cuotas"]);
const TICKET_ESTADOS = new Set(["Abierto", "En progreso", "Cerrado"]);

function texto(valor: unknown, max = MAX_TEXTO): string | null {
  if (typeof valor !== "string") return null;
  const limpio = valor.trim();
  return limpio.length > 0 ? limpio.slice(0, max) : null;
}

function numeroPositivo(valor: unknown): number | null {
  const n = typeof valor === "number" ? valor : Number(valor);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function numero(valor: unknown): number | null {
  const n = typeof valor === "number" ? valor : Number(valor);
  return Number.isFinite(n) ? n : null;
}

async function resolverReferencias(mod: NonNullable<ReturnType<typeof getModule>>, datos: Record<string, unknown>) {
  const { getRefOptions } = await import("@/lib/crud");
  const resultado: Record<string, unknown> = { ...datos };
  for (const field of mod.fields) {
    if (field.type !== "ref" || !field.refTable || !field.refLabel) continue;
    const valor = resultado[field.name];
    if (typeof valor !== "string" || valor.trim() === "") continue;
    if (/^\d+$/.test(valor.trim())) continue;
    const opciones = await getRefOptions(field.refTable, field.refLabel);
    const match = opciones.find((o) => o.label.toLowerCase() === valor.trim().toLowerCase());
    if (match) resultado[field.name] = match.id;
    else delete resultado[field.name];
  }
  return resultado;
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
  const p = payload as Record<string, unknown>;

  try {
    // ---------- Acciones de cliente ----------
    if (tipo === "crear_ticket") {
      if (user.role !== "cliente") {
        return NextResponse.json({ error: "Solo los clientes pueden abrir tickets." }, { status: 403 });
      }
      const asunto = texto(p.asunto, 200);
      const mensaje = texto(p.mensaje);
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
      const monto = numeroPositivo(p.monto);
      const motivo = texto(p.motivo);
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

    // A partir de aquí, todo es exclusivo de staff (admin/profesional).
    if (user.role === "cliente") {
      return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    }

    // ---------- CRUD genérico de módulos ----------
    if (tipo === "crud_crear" || tipo === "crud_actualizar" || tipo === "crud_eliminar") {
      const moduloSlug = texto(p.modulo, 60);
      const mod = moduloSlug ? getModule(moduloSlug) : undefined;
      if (!mod) return NextResponse.json({ error: "Módulo desconocido." }, { status: 400 });

      const { createRecord, updateRecord, deleteRecord } = await import("@/lib/crud");

      if (tipo === "crud_crear") {
        const datosRaw = typeof p.datos === "object" && p.datos !== null ? (p.datos as Record<string, unknown>) : {};
        const datos = await resolverReferencias(mod, datosRaw);
        const faltantes = mod.fields.filter((f) => f.required && (datos[f.name] === undefined || datos[f.name] === null || datos[f.name] === ""));
        if (faltantes.length > 0) {
          return NextResponse.json(
            { error: `Faltan campos obligatorios: ${faltantes.map((f) => f.label).join(", ")}.` },
            { status: 400 }
          );
        }
        const id = await createRecord(mod, datos);
        return NextResponse.json({
          ok: true,
          mensaje: `Listo, creé el registro #${id} en ${mod.label}.`,
          url: `/${mod.slug}/${id}`,
        });
      }

      const id = numeroPositivo(p.id);
      if (!id) return NextResponse.json({ error: "Falta el id del registro." }, { status: 400 });

      if (tipo === "crud_actualizar") {
        const datosRaw = typeof p.datos === "object" && p.datos !== null ? (p.datos as Record<string, unknown>) : {};
        const datos = await resolverReferencias(mod, datosRaw);
        await updateRecord(mod, id, datos);
        return NextResponse.json({
          ok: true,
          mensaje: `Listo, actualicé el registro #${id} de ${mod.label}.`,
          url: `/${mod.slug}/${id}`,
        });
      }

      // crud_eliminar
      await deleteRecord(mod, id);
      return NextResponse.json({ ok: true, mensaje: `Listo, eliminé el registro #${id} de ${mod.label}.` });
    }

    // ---------- Tickets ----------
    if (tipo === "responder_ticket") {
      const ticketId = numeroPositivo(p.ticket_id);
      const mensaje = texto(p.mensaje);
      if (!ticketId || !mensaje) {
        return NextResponse.json({ error: "Falta el ticket_id o el mensaje de respuesta." }, { status: 400 });
      }
      const { getTicket, addMessage } = await import("@/lib/tickets");
      const ticket = await getTicket(ticketId);
      if (!ticket) return NextResponse.json({ error: "El ticket indicado no existe." }, { status: 404 });
      await addMessage(ticketId, user.id, mensaje);
      return NextResponse.json({
        ok: true,
        mensaje: `Listo, envié tu respuesta en el ticket #${ticketId}.`,
        url: "/tickets/" + ticketId,
      });
    }

    if (tipo === "asignar_ticket") {
      const ticketId = numeroPositivo(p.ticket_id);
      const a = texto(p.a, 60);
      if (!ticketId || !a) {
        return NextResponse.json({ error: "Falta el ticket_id o a quién asignarlo." }, { status: 400 });
      }
      const { getTicket, assignTicket } = await import("@/lib/tickets");
      const ticket = await getTicket(ticketId);
      if (!ticket) return NextResponse.json({ error: "El ticket indicado no existe." }, { status: 404 });

      let targetId = user.id;
      if (a.toLowerCase() !== "yo" && a.toLowerCase() !== "mí" && a.toLowerCase() !== user.username.toLowerCase()) {
        const { getUserIdByUsername } = await import("@/lib/asistente-contexto");
        const found = await getUserIdByUsername(a, true);
        if (!found) return NextResponse.json({ error: `No encontré a "${a}" entre el staff.` }, { status: 400 });
        targetId = found;
      }
      await assignTicket(ticketId, targetId);
      return NextResponse.json({ ok: true, mensaje: `Listo, asigné el ticket #${ticketId}.`, url: "/tickets/" + ticketId });
    }

    if (tipo === "cambiar_estado_ticket") {
      const ticketId = numeroPositivo(p.ticket_id);
      const estado = texto(p.estado, 20);
      if (!ticketId || !estado || !TICKET_ESTADOS.has(estado)) {
        return NextResponse.json({ error: "Falta el ticket_id o el estado es inválido." }, { status: 400 });
      }
      const { getTicket, setTicketEstado } = await import("@/lib/tickets");
      const ticket = await getTicket(ticketId);
      if (!ticket) return NextResponse.json({ error: "El ticket indicado no existe." }, { status: 404 });
      await setTicketEstado(ticketId, estado);
      return NextResponse.json({
        ok: true,
        mensaje: `Listo, el ticket #${ticketId} ahora está "${estado}".`,
        url: "/tickets/" + ticketId,
      });
    }

    // ---------- Préstamos ----------
    if (tipo === "aprobar_prestamo") {
      const prestamoId = numeroPositivo(p.prestamo_id);
      const plazoValor = numeroPositivo(p.plazo_valor);
      const plazoUnidad = texto(p.plazo_unidad, 20);
      const tipoPago = texto(p.tipo_pago, 20);
      const tasaInteres = numero(p.tasa_interes);
      const numCuotas = numero(p.num_cuotas) ?? 1;

      if (!prestamoId || !plazoValor || !plazoUnidad || !PLAZO_UNIDADES.has(plazoUnidad)) {
        return NextResponse.json({ error: "Faltan datos válidos de plazo para aprobar el préstamo." }, { status: 400 });
      }
      if (!tipoPago || !TIPOS_PAGO.has(tipoPago)) {
        return NextResponse.json({ error: "El tipo de pago debe ser 'unico' o 'cuotas'." }, { status: 400 });
      }
      if (tasaInteres === null || tasaInteres < 0) {
        return NextResponse.json({ error: "Falta una tasa de interés válida." }, { status: 400 });
      }
      const { aprobarPrestamo } = await import("@/lib/prestamos");
      await aprobarPrestamo(prestamoId, user.id, {
        plazoValor,
        plazoUnidad: plazoUnidad as "dias" | "semanas" | "meses",
        tipoPago: tipoPago as "unico" | "cuotas",
        numCuotas,
        tasaInteres,
      });
      return NextResponse.json({
        ok: true,
        mensaje: `Listo, aprobé el préstamo #${prestamoId}.`,
        url: "/prestamos/" + prestamoId,
      });
    }

    if (tipo === "rechazar_prestamo") {
      const prestamoId = numeroPositivo(p.prestamo_id);
      if (!prestamoId) return NextResponse.json({ error: "Falta el prestamo_id." }, { status: 400 });
      const { rechazarPrestamo } = await import("@/lib/prestamos");
      await rechazarPrestamo(prestamoId, user.id);
      return NextResponse.json({ ok: true, mensaje: `Listo, rechacé el préstamo #${prestamoId}.`, url: "/prestamos/" + prestamoId });
    }

    if (tipo === "reasignar_prestamo") {
      const prestamoId = numeroPositivo(p.prestamo_id);
      const staffUsername = texto(p.staff_username, 60);
      if (!prestamoId || !staffUsername) {
        return NextResponse.json({ error: "Falta el prestamo_id o el usuario destino." }, { status: 400 });
      }
      const { getUserIdByUsername } = await import("@/lib/asistente-contexto");
      const targetId = await getUserIdByUsername(staffUsername, true);
      if (!targetId) return NextResponse.json({ error: `No encontré a "${staffUsername}" entre el staff.` }, { status: 400 });
      const { reasignarPrestamo } = await import("@/lib/prestamos");
      await reasignarPrestamo(prestamoId, targetId);
      return NextResponse.json({
        ok: true,
        mensaje: `Listo, reasigné el préstamo #${prestamoId} a ${staffUsername}.`,
        url: "/prestamos/" + prestamoId,
      });
    }

    if (tipo === "marcar_cuota_pagada") {
      const prestamoId = numeroPositivo(p.prestamo_id);
      const numeroCuota = numeroPositivo(p.numero_cuota);
      if (!prestamoId || !numeroCuota) {
        return NextResponse.json({ error: "Falta el prestamo_id o el número de cuota." }, { status: 400 });
      }
      const { listCuotas, marcarCuotaPagada } = await import("@/lib/prestamos");
      const cuotas = await listCuotas(prestamoId);
      const cuota = cuotas.find((c) => c.numero === numeroCuota);
      if (!cuota) return NextResponse.json({ error: "No encontré esa cuota para ese préstamo." }, { status: 404 });
      await marcarCuotaPagada(cuota.id);
      return NextResponse.json({
        ok: true,
        mensaje: `Listo, marqué la cuota ${numeroCuota} del préstamo #${prestamoId} como pagada.`,
        url: "/prestamos/" + prestamoId,
      });
    }

    // ---------- Solo admin ----------
    if (tipo === "aprobar_usuario" || tipo === "rechazar_usuario") {
      if (user.role !== "admin") {
        return NextResponse.json({ error: "Solo un administrador puede aprobar o rechazar usuarios." }, { status: 403 });
      }
      const username = texto(p.username, 60);
      if (!username) return NextResponse.json({ error: "Falta el username." }, { status: 400 });
      const { getUserIdByUsername } = await import("@/lib/asistente-contexto");
      const targetId = await getUserIdByUsername(username);
      if (!targetId) return NextResponse.json({ error: `No encontré al usuario "${username}".` }, { status: 400 });
      const { setUserStatus } = await import("@/lib/actions");
      await setUserStatus(targetId, tipo === "aprobar_usuario" ? "approved" : "rejected");
      return NextResponse.json({
        ok: true,
        mensaje: `Listo, ${tipo === "aprobar_usuario" ? "aprobé" : "rechacé"} a ${username}.`,
        url: "/admin/usuarios",
      });
    }

    return NextResponse.json({ error: "Tipo de acción desconocido." }, { status: 400 });
  } catch (err) {
    console.error("Error ejecutando acción del asistente IA:", err);
    return NextResponse.json({ error: "No se pudo completar la acción." }, { status: 500 });
  }
}
