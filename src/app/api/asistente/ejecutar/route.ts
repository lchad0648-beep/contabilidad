import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getModule, type ModuleConfig } from "@/lib/modules";

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

type Resuelto<T = number> = { id: T } | { error: string };

async function resolverPrestamoId(
  p: Record<string, unknown>,
  filtro?: (estado: string) => boolean
): Promise<Resuelto> {
  const idDirecto = numeroPositivo(p.prestamo_id);
  if (idDirecto) return { id: idDirecto };

  const cliente = texto(p.cliente, 60);
  if (!cliente) return { error: "Falta el prestamo_id o el nombre del cliente." };

  const { buscarPrestamosPorCliente } = await import("@/lib/asistente-contexto");
  let candidatos = await buscarPrestamosPorCliente(cliente);
  if (filtro) candidatos = candidatos.filter((c) => filtro(c.estado));

  if (candidatos.length === 0) return { error: `No encontré un préstamo de "${cliente}" que coincida.` };
  if (candidatos.length > 1) {
    return {
      error: `"${cliente}" tiene varios préstamos que coinciden (${candidatos
        .map((c) => `#${c.id}`)
        .join(", ")}); especifica el prestamo_id.`,
    };
  }
  return { id: candidatos[0].id };
}

async function resolverTicketId(p: Record<string, unknown>): Promise<Resuelto> {
  const idDirecto = numeroPositivo(p.ticket_id);
  if (idDirecto) return { id: idDirecto };

  const cliente = texto(p.cliente, 60);
  const asunto = texto(p.asunto, 200);
  if (!cliente && !asunto) return { error: "Falta el ticket_id, el cliente o el asunto del ticket." };

  const { buscarTickets } = await import("@/lib/asistente-contexto");
  const candidatos = await buscarTickets(cliente ?? undefined, asunto ?? undefined);

  if (candidatos.length === 0) return { error: "No encontré ningún ticket que coincida." };
  if (candidatos.length > 1) {
    return {
      error: `Hay varios tickets que coinciden (${candidatos.map((c) => `#${c.id}`).join(", ")}); especifica el ticket_id.`,
    };
  }
  return { id: candidatos[0].id };
}

async function resolverRegistroId(mod: ModuleConfig, p: Record<string, unknown>): Promise<Resuelto> {
  const idDirecto = numeroPositivo(p.id);
  if (idDirecto) return { id: idDirecto };

  const buscar = texto(p.buscar, 200);
  if (!buscar) return { error: "Falta el id del registro, o un texto para buscarlo (parámetro 'buscar')." };

  const { buscarRegistroPorTitulo } = await import("@/lib/asistente-contexto");
  const ids = await buscarRegistroPorTitulo(mod, buscar);

  if (ids.length === 0) return { error: `No encontré ningún registro de "${mod.label}" que coincida con "${buscar}".` };
  if (ids.length > 1) {
    return { error: `Hay varios registros de "${mod.label}" que coinciden (${ids.map((i) => `#${i}`).join(", ")}); especifica el id.` };
  }
  return { id: ids[0] };
}

async function resolverReferencias(mod: ModuleConfig, datos: Record<string, unknown>) {
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
        const faltantes = mod.fields.filter(
          (f) => f.required && (datos[f.name] === undefined || datos[f.name] === null || datos[f.name] === "")
        );
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

      const resuelto = await resolverRegistroId(mod, p);
      if ("error" in resuelto) return NextResponse.json({ error: resuelto.error }, { status: 400 });
      const id = resuelto.id;

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

      // crud_eliminar (solo admin; profesional debe usar solicitar_borrado)
      if (user.role !== "admin") {
        return NextResponse.json(
          { error: "Solo un administrador puede eliminar directamente. Usa la acción 'solicitar_borrado'." },
          { status: 403 }
        );
      }
      await deleteRecord(mod, id);
      return NextResponse.json({ ok: true, mensaje: `Listo, eliminé el registro #${id} de ${mod.label}.` });
    }

    // ---------- Solicitud de borrado (profesional; admin también puede usarla) ----------
    if (tipo === "solicitar_borrado") {
      const moduloSlug = texto(p.modulo, 60);
      const mod = moduloSlug ? getModule(moduloSlug) : undefined;
      if (!mod) return NextResponse.json({ error: "Módulo desconocido." }, { status: 400 });

      const resuelto = await resolverRegistroId(mod, p);
      if ("error" in resuelto) return NextResponse.json({ error: resuelto.error }, { status: 400 });
      const id = resuelto.id;
      const motivo = texto(p.motivo, 500);

      const { getRecord } = await import("@/lib/crud");
      const record = await getRecord(mod, id);
      const descripcion = record && record[mod.titleField] != null ? String(record[mod.titleField]) : `#${id}`;

      const { createSolicitud } = await import("@/lib/solicitudes-borrado");
      await createSolicitud(mod.slug, id, descripcion, user.id, motivo);

      return NextResponse.json({
        ok: true,
        mensaje: `Listo, envié la solicitud de borrado de "${descripcion}" (${mod.label}). Un administrador la va a revisar.`,
        url: "/admin/solicitudes-borrado",
      });
    }

    // ---------- Tickets ----------
    if (tipo === "responder_ticket") {
      const resuelto = await resolverTicketId(p);
      if ("error" in resuelto) return NextResponse.json({ error: resuelto.error }, { status: 400 });
      const ticketId = resuelto.id;
      const mensaje = texto(p.mensaje);
      if (!mensaje) return NextResponse.json({ error: "Falta el mensaje de respuesta." }, { status: 400 });

      const { addMessage } = await import("@/lib/tickets");
      await addMessage(ticketId, user.id, mensaje);
      return NextResponse.json({
        ok: true,
        mensaje: `Listo, envié tu respuesta en el ticket #${ticketId}.`,
        url: "/tickets/" + ticketId,
      });
    }

    if (tipo === "asignar_ticket") {
      const resuelto = await resolverTicketId(p);
      if ("error" in resuelto) return NextResponse.json({ error: resuelto.error }, { status: 400 });
      const ticketId = resuelto.id;
      const a = texto(p.a, 60);
      if (!a) return NextResponse.json({ error: "Falta a quién asignar el ticket." }, { status: 400 });

      const { assignTicket } = await import("@/lib/tickets");
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
      const resuelto = await resolverTicketId(p);
      if ("error" in resuelto) return NextResponse.json({ error: resuelto.error }, { status: 400 });
      const ticketId = resuelto.id;
      const estado = texto(p.estado, 20);
      if (!estado || !TICKET_ESTADOS.has(estado)) {
        return NextResponse.json({ error: "El estado indicado no es válido." }, { status: 400 });
      }
      const { setTicketEstado } = await import("@/lib/tickets");
      await setTicketEstado(ticketId, estado);
      return NextResponse.json({
        ok: true,
        mensaje: `Listo, el ticket #${ticketId} ahora está "${estado}".`,
        url: "/tickets/" + ticketId,
      });
    }

    // ---------- Préstamos ----------
    if (tipo === "aprobar_prestamo") {
      const resuelto = await resolverPrestamoId(p, (estado) => estado === "Pendiente");
      if ("error" in resuelto) return NextResponse.json({ error: resuelto.error }, { status: 400 });
      const prestamoId = resuelto.id;

      const plazoValor = numeroPositivo(p.plazo_valor);
      const plazoUnidad = texto(p.plazo_unidad, 20);
      const tipoPago = texto(p.tipo_pago, 20);
      const tasaInteres = numero(p.tasa_interes);
      const numCuotas = numero(p.num_cuotas) ?? 1;

      if (!plazoValor || !plazoUnidad || !PLAZO_UNIDADES.has(plazoUnidad)) {
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
      const resuelto = await resolverPrestamoId(p, (estado) => estado === "Pendiente");
      if ("error" in resuelto) return NextResponse.json({ error: resuelto.error }, { status: 400 });
      const prestamoId = resuelto.id;
      const { rechazarPrestamo } = await import("@/lib/prestamos");
      await rechazarPrestamo(prestamoId, user.id);
      return NextResponse.json({ ok: true, mensaje: `Listo, rechacé el préstamo #${prestamoId}.`, url: "/prestamos/" + prestamoId });
    }

    if (tipo === "reasignar_prestamo") {
      const resuelto = await resolverPrestamoId(p);
      if ("error" in resuelto) return NextResponse.json({ error: resuelto.error }, { status: 400 });
      const prestamoId = resuelto.id;
      const staffUsername = texto(p.staff_username, 60);
      if (!staffUsername) return NextResponse.json({ error: "Falta el usuario destino." }, { status: 400 });

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
      const resuelto = await resolverPrestamoId(p);
      if ("error" in resuelto) return NextResponse.json({ error: resuelto.error }, { status: 400 });
      const prestamoId = resuelto.id;
      const numeroCuota = numeroPositivo(p.numero_cuota);
      if (!numeroCuota) return NextResponse.json({ error: "Falta el número de cuota." }, { status: 400 });

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
