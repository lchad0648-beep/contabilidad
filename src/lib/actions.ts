"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getModule } from "./modules";
import { createRecord, updateRecord, deleteRecord, getRecord } from "./crud";
import { getCurrentUser } from "./auth";

async function requireApprovedUser() {
  const user = await getCurrentUser();
  if (!user || user.status !== "approved") {
    throw new Error("No autorizado.");
  }
  return user;
}

function formDataToRecord(fields: { name: string }[], formData: FormData) {
  const data: Record<string, unknown> = {};
  for (const field of fields) {
    data[field.name] = formData.get(field.name);
  }
  return data;
}

export async function createModuleRecord(modulo: string, formData: FormData) {
  await requireApprovedUser();
  const mod = getModule(modulo);
  if (!mod) throw new Error("Módulo no encontrado.");

  const data = formDataToRecord(mod.fields, formData);
  await createRecord(mod, data);
  revalidatePath(`/${modulo}`);
  redirect(`/${modulo}`);
}

export async function updateModuleRecord(modulo: string, id: number, formData: FormData) {
  await requireApprovedUser();
  const mod = getModule(modulo);
  if (!mod) throw new Error("Módulo no encontrado.");

  const data = formDataToRecord(mod.fields, formData);
  await updateRecord(mod, id, data);
  revalidatePath(`/${modulo}`);
  redirect(`/${modulo}`);
}

export async function deleteModuleRecord(modulo: string, id: number) {
  const user = await requireApprovedUser();
  if (user.role !== "admin") {
    throw new Error("Solo un administrador puede eliminar directamente. Usa 'Solicitar borrado'.");
  }
  const mod = getModule(modulo);
  if (!mod) throw new Error("Módulo no encontrado.");

  await deleteRecord(mod, id);
  revalidatePath(`/${modulo}`);
  redirect(`/${modulo}`);
}

export async function solicitarBorradoAction(modulo: string, id: number, formData: FormData) {
  const user = await requireApprovedUser();
  if (user.role === "cliente") throw new Error("No autorizado.");

  const mod = getModule(modulo);
  if (!mod) throw new Error("Módulo no encontrado.");

  const record = await getRecord(mod, id);
  if (!record) throw new Error("Registro no encontrado.");

  const motivo = String(formData.get("motivo") ?? "").trim() || null;
  const descripcion = record[mod.titleField] != null ? String(record[mod.titleField]) : `#${id}`;

  const { createSolicitud } = await import("./solicitudes-borrado");
  await createSolicitud(mod.slug, id, descripcion, user.id, motivo);

  revalidatePath(`/${modulo}`);
  redirect(`/${modulo}`);
}

export async function aprobarSolicitudBorradoAction(solicitudId: number) {
  const user = await requireApprovedUser();
  if (user.role !== "admin") throw new Error("No autorizado.");

  const { aprobarSolicitud } = await import("./solicitudes-borrado");
  await aprobarSolicitud(solicitudId, user.id);
  revalidatePath("/admin/solicitudes-borrado");
}

export async function rechazarSolicitudBorradoAction(solicitudId: number) {
  const user = await requireApprovedUser();
  if (user.role !== "admin") throw new Error("No autorizado.");

  const { rechazarSolicitud } = await import("./solicitudes-borrado");
  await rechazarSolicitud(solicitudId, user.id);
  revalidatePath("/admin/solicitudes-borrado");
}

const USER_STATUSES = new Set(["approved", "rejected", "pending"]);

export async function setUserStatus(userId: number, status: "approved" | "rejected" | "pending") {
  const { getDb } = await import("./db");
  const admin = await getCurrentUser();
  if (!admin || admin.role !== "admin") {
    throw new Error("No autorizado.");
  }
  if (!USER_STATUSES.has(status)) throw new Error("Estado inválido.");
  const db = getDb();
  await db
    .prepare(`UPDATE users SET status = ?, approved_by = ?, approved_at = datetime('now') WHERE id = ?`)
    .run(status, admin.id, userId);
  revalidatePath("/admin/usuarios");
}

export async function createTicketAction(formData: FormData) {
  const user = await requireApprovedUser();
  if (user.role !== "cliente") throw new Error("Solo los clientes pueden abrir tickets.");

  const asunto = String(formData.get("asunto") ?? "").trim();
  const mensaje = String(formData.get("mensaje") ?? "").trim();
  if (!asunto || !mensaje) throw new Error("Asunto y mensaje son requeridos.");

  const { createTicket } = await import("./tickets");
  const ticketId = await createTicket(user.id, asunto, mensaje);
  revalidatePath("/portal/tickets");
  redirect(`/portal/tickets/${ticketId}`);
}

const TICKET_ESTADOS = new Set(["Abierto", "En progreso", "Cerrado"]);

export async function setTicketEstadoAction(ticketId: number, estado: "Abierto" | "En progreso" | "Cerrado") {
  const user = await requireApprovedUser();
  if (user.role === "cliente") throw new Error("No autorizado.");
  if (!TICKET_ESTADOS.has(estado)) throw new Error("Estado inválido.");

  const { setTicketEstado } = await import("./tickets");
  await setTicketEstado(ticketId, estado);
  revalidatePath(`/tickets/${ticketId}`);
  revalidatePath("/tickets");
}

export async function assignTicketToMeAction(ticketId: number) {
  const user = await requireApprovedUser();
  if (user.role === "cliente") throw new Error("No autorizado.");

  const { assignTicket } = await import("./tickets");
  await assignTicket(ticketId, user.id);
  revalidatePath(`/tickets/${ticketId}`);
  revalidatePath("/tickets");
}

export async function crearPrestamoAction(formData: FormData) {
  const user = await requireApprovedUser();
  if (user.role !== "cliente") throw new Error("Solo los clientes pueden solicitar préstamos.");

  const montoSolicitado = Number(formData.get("monto_solicitado"));
  const motivo = String(formData.get("motivo") ?? "").trim();
  if (!Number.isFinite(montoSolicitado) || montoSolicitado <= 0) {
    throw new Error("El monto debe ser un número mayor a 0.");
  }
  if (!motivo) throw new Error("Indica el motivo del préstamo.");

  const { crearPrestamo } = await import("./prestamos");
  const prestamoId = await crearPrestamo(user.id, montoSolicitado, motivo);

  revalidatePath("/portal/prestamos");
  redirect(`/portal/prestamos/${prestamoId}`);
}

const PLAZO_UNIDADES = new Set(["dias", "semanas", "meses"]);
const TIPOS_PAGO = new Set(["unico", "cuotas"]);

export async function aprobarPrestamoAction(prestamoId: number, formData: FormData) {
  const user = await requireApprovedUser();
  if (user.role === "cliente") throw new Error("No autorizado.");

  const plazoValor = Number(formData.get("plazo_valor"));
  const plazoUnidad = String(formData.get("plazo_unidad") ?? "");
  const tipoPago = String(formData.get("tipo_pago") ?? "");
  const numCuotas = Number(formData.get("num_cuotas") ?? 1);
  const tasaInteres = Number(formData.get("tasa_interes"));

  if (!Number.isFinite(plazoValor) || plazoValor <= 0) throw new Error("Plazo inválido.");
  if (!PLAZO_UNIDADES.has(plazoUnidad)) throw new Error("Unidad de plazo inválida.");
  if (!TIPOS_PAGO.has(tipoPago)) throw new Error("Tipo de pago inválido.");
  if (!Number.isFinite(tasaInteres) || tasaInteres < 0) throw new Error("Tasa de interés inválida.");
  if (tipoPago === "cuotas" && (!Number.isFinite(numCuotas) || numCuotas < 1)) {
    throw new Error("Número de cuotas inválido.");
  }

  const { aprobarPrestamo } = await import("./prestamos");
  await aprobarPrestamo(prestamoId, user.id, {
    plazoValor,
    plazoUnidad: plazoUnidad as "dias" | "semanas" | "meses",
    tipoPago: tipoPago as "unico" | "cuotas",
    numCuotas,
    tasaInteres,
  });

  revalidatePath(`/prestamos/${prestamoId}`);
  revalidatePath("/prestamos");
}

export async function rechazarPrestamoAction(prestamoId: number) {
  const user = await requireApprovedUser();
  if (user.role === "cliente") throw new Error("No autorizado.");

  const { rechazarPrestamo } = await import("./prestamos");
  await rechazarPrestamo(prestamoId, user.id);

  revalidatePath(`/prestamos/${prestamoId}`);
  revalidatePath("/prestamos");
}

export async function reasignarPrestamoAction(prestamoId: number, formData: FormData) {
  const user = await requireApprovedUser();
  if (user.role === "cliente") throw new Error("No autorizado.");

  const staffUserId = Number(formData.get("staffUserId"));
  if (!Number.isFinite(staffUserId)) throw new Error("Usuario destino inválido.");

  const { getDb } = await import("./db");
  const target = (await getDb().prepare(`SELECT id, role FROM users WHERE id = ?`).get(staffUserId)) as
    | { id: number; role: string }
    | undefined;
  if (!target || target.role === "cliente") throw new Error("Usuario destino inválido.");

  const { reasignarPrestamo } = await import("./prestamos");
  await reasignarPrestamo(prestamoId, staffUserId);
  revalidatePath(`/prestamos/${prestamoId}`);
  revalidatePath("/prestamos");
}

export async function marcarCuotaPagadaAction(cuotaId: number, prestamoId: number) {
  const user = await requireApprovedUser();
  if (user.role === "cliente") throw new Error("No autorizado.");

  const { marcarCuotaPagada } = await import("./prestamos");
  await marcarCuotaPagada(cuotaId);
  revalidatePath(`/prestamos/${prestamoId}`);
  revalidatePath("/prestamos");
}
