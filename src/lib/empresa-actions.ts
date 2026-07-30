"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getCurrentEmpresa } from "./empresa-auth";
import { getCurrentUser } from "./auth";
import { crearMaterial, eliminarMaterial } from "./empresa-materiales";
import {
  contratarUsuario,
  despedirEmpleado,
  actualizarEmpleado,
  enviarMensajeEmpleado,
  getEmpleoActivoDeUsuario,
} from "./empresa-empleados";
import { pagarSalario } from "./empresas";
import {
  crearSolicitudBolsa,
  enviarMensajeBolsa,
  lanzarBolsa,
  aprobarSolicitudBolsa,
  rechazarSolicitudBolsa,
  comprarAcciones,
  venderAcciones,
  getUltimaSolicitud,
} from "./bolsa";

async function requireEmpresa() {
  const empresa = await getCurrentEmpresa();
  if (!empresa) throw new Error("No autorizado.");
  return empresa;
}

async function requireStaff() {
  const user = await getCurrentUser();
  if (!user || user.status !== "approved" || user.role === "cliente") {
    throw new Error("No autorizado.");
  }
  return user;
}

async function requireUser() {
  const user = await getCurrentUser();
  if (!user || user.status !== "approved") throw new Error("No autorizado.");
  return user;
}

// ---------------------------------------------------------------- Logística

export async function crearMaterialAction(formData: FormData) {
  const empresa = await requireEmpresa();
  const nombre = String(formData.get("nombre") ?? "").trim();
  const cantidad = Number(formData.get("cantidad") ?? 0);
  const tipoPrecio = String(formData.get("tipo_precio") ?? "unidad") as "unidad" | "stack64" | "stack_custom";
  const stackSize = formData.get("stack_size") ? Number(formData.get("stack_size")) : null;
  const precioPorStack = Number(formData.get("precio_por_stack") ?? 0);

  if (!nombre) throw new Error("El nombre es obligatorio.");

  await crearMaterial(empresa.id, nombre, cantidad, tipoPrecio, stackSize, precioPorStack);
  revalidatePath("/empresa/logistica");
  redirect("/empresa/logistica");
}

export async function eliminarMaterialAction(id: number) {
  const empresa = await requireEmpresa();
  await eliminarMaterial(empresa.id, id);
  revalidatePath("/empresa/logistica");
}

// ---------------------------------------------------------------- Empleados

export async function contratarEmpleadoAction(formData: FormData) {
  const empresa = await requireEmpresa();
  const userId = Number(formData.get("user_id"));
  const salario = Number(formData.get("salario") ?? 0);
  if (!userId) throw new Error("Selecciona un usuario.");

  const result = await contratarUsuario(empresa.id, userId, salario);
  if (!result.ok) throw new Error(result.error);
  revalidatePath("/empresa/empleados");
  redirect("/empresa/empleados");
}

export async function despedirEmpleadoAction(id: number) {
  const empresa = await requireEmpresa();
  await despedirEmpleado(empresa.id, id);
  revalidatePath("/empresa/empleados");
}

export async function actualizarEmpleadoAction(id: number, formData: FormData) {
  const empresa = await requireEmpresa();
  const salario = Number(formData.get("salario") ?? 0);
  const anotaciones = String(formData.get("anotaciones") ?? "");
  await actualizarEmpleado(empresa.id, id, salario, anotaciones);
  revalidatePath(`/empresa/empleados/${id}`);
}

export async function pagarSalarioAction(id: number) {
  const empresa = await requireEmpresa();
  const result = await pagarSalario(empresa.id, id);
  if (!result.ok) throw new Error(result.error);
  revalidatePath(`/empresa/empleados/${id}`);
  revalidatePath("/empresa");
}

export async function enviarMensajeEmpleadoDesdeEmpresaAction(empleadoId: number, formData: FormData) {
  await requireEmpresa();
  const mensaje = String(formData.get("mensaje") ?? "").trim();
  if (!mensaje) return;
  await enviarMensajeEmpleado(empleadoId, "empresa", mensaje);
  revalidatePath(`/empresa/empleados/${empleadoId}`);
}

export async function enviarMensajeEmpleadoDesdeUsuarioAction(formData: FormData) {
  const user = await requireUser();
  const mensaje = String(formData.get("mensaje") ?? "").trim();
  if (!mensaje) return;
  const empleo = await getEmpleoActivoDeUsuario(user.id);
  if (!empleo) throw new Error("No tienes un empleo activo.");
  await enviarMensajeEmpleado(empleo.id, "empleado", mensaje);
  revalidatePath("/trabajo");
}

// -------------------------------------------------------------------- Bolsa

export async function solicitarBolsaAction(formData: FormData) {
  const empresa = await requireEmpresa();
  const mensaje = String(formData.get("mensaje") ?? "").trim();
  const result = await crearSolicitudBolsa(empresa.id, mensaje);
  if (!result.ok) throw new Error(result.error);
  revalidatePath("/empresa/bolsa");
}

export async function enviarMensajeBolsaEmpresaAction(solicitudId: number, formData: FormData) {
  const empresa = await requireEmpresa();
  const mensaje = String(formData.get("mensaje") ?? "").trim();
  if (!mensaje) return;
  await enviarMensajeBolsa(solicitudId, "empresa", empresa.nombre, mensaje);
  revalidatePath("/empresa/bolsa");
}

export async function lanzarBolsaAction(formData: FormData) {
  const empresa = await requireEmpresa();
  const pctSalida = Number(formData.get("pct_salida") ?? 0);
  const solicitud = await getUltimaSolicitud(empresa.id);
  if (!solicitud) throw new Error("No hay solicitud aprobada.");
  const result = await lanzarBolsa(solicitud.id, empresa.id, pctSalida);
  if (!result.ok) throw new Error(result.error);
  revalidatePath("/empresa/bolsa");
}

export async function aprobarSolicitudBolsaAction(id: number, formData: FormData) {
  const staff = await requireStaff();
  const comisionPct = Number(formData.get("comision_pct") ?? 0);
  const totalAcciones = Number(formData.get("total_acciones") ?? 0);
  const valorEmpresa = Number(formData.get("valor_empresa") ?? 0);
  if (comisionPct < 0 || comisionPct > 100) throw new Error("Comisión inválida.");
  if (totalAcciones <= 0) throw new Error("Total de acciones inválido.");
  if (valorEmpresa <= 0) throw new Error("Valor de empresa inválido.");
  await aprobarSolicitudBolsa(id, staff.id, comisionPct, totalAcciones, valorEmpresa);
  revalidatePath("/admin/bolsa-solicitudes");
  redirect("/admin/bolsa-solicitudes");
}

export async function rechazarSolicitudBolsaAction(id: number) {
  const staff = await requireStaff();
  await rechazarSolicitudBolsa(id, staff.id);
  revalidatePath("/admin/bolsa-solicitudes");
  redirect("/admin/bolsa-solicitudes");
}

export async function enviarMensajeBolsaStaffAction(solicitudId: number, formData: FormData) {
  const staff = await requireStaff();
  const mensaje = String(formData.get("mensaje") ?? "").trim();
  if (!mensaje) return;
  await enviarMensajeBolsa(solicitudId, "staff", staff.username, mensaje);
  revalidatePath(`/admin/bolsa-solicitudes/${solicitudId}`);
}

export async function comprarAccionesAction(empresaId: number, formData: FormData) {
  const user = await requireUser();
  const cantidad = Math.floor(Number(formData.get("cantidad") ?? 0));
  const result = await comprarAcciones(empresaId, user.id, cantidad);
  if (!result.ok) throw new Error(result.error);
  revalidatePath(`/bolsa/${empresaId}`);
  revalidatePath("/bolsa");
}

export async function venderAccionesAction(empresaId: number, formData: FormData) {
  const user = await requireUser();
  const cantidad = Math.floor(Number(formData.get("cantidad") ?? 0));
  const result = await venderAcciones(empresaId, user.id, cantidad);
  if (!result.ok) throw new Error(result.error);
  revalidatePath(`/bolsa/${empresaId}`);
  revalidatePath("/bolsa");
}
