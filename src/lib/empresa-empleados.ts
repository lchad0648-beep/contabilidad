import { getDb } from "./db";

export interface EmpleadoRow {
  id: number;
  empresa_id: number;
  user_id: number;
  username: string;
  salario: number;
  gasto_total: number;
  anotaciones: string | null;
  estado: "activo" | "despedido";
  created_at: string;
  despedido_at: string | null;
}

export interface EmpleoActivoRow {
  id: number;
  empresa_id: number;
  empresa_nombre: string;
  salario: number;
  gasto_total: number;
  anotaciones: string | null;
  created_at: string;
}

export interface EmpleadoMensajeRow {
  id: number;
  empleado_id: number;
  autor: "empresa" | "empleado";
  mensaje: string;
  created_at: string;
}

export async function listEmpleados(empresaId: number): Promise<EmpleadoRow[]> {
  const db = getDb();
  return (await db
    .prepare(
      `SELECT ee.*, u.username
       FROM empresa_empleados ee
       JOIN users u ON u.id = ee.user_id
       WHERE ee.empresa_id = ?
       ORDER BY (ee.estado = 'activo') DESC, ee.created_at DESC`
    )
    .all(empresaId)) as EmpleadoRow[];
}

export async function getEmpleado(empresaId: number, id: number): Promise<EmpleadoRow | undefined> {
  const db = getDb();
  return (await db
    .prepare(
      `SELECT ee.*, u.username FROM empresa_empleados ee JOIN users u ON u.id = ee.user_id
       WHERE ee.id = ? AND ee.empresa_id = ?`
    )
    .get(id, empresaId)) as EmpleadoRow | undefined;
}

export async function buscarUsuariosParaContratar(
  query: string
): Promise<{ id: number; username: string; role: string; empleado: boolean }[]> {
  const db = getDb();
  const rows = (await db
    .prepare(
      `SELECT u.id, u.username, u.role,
              EXISTS(SELECT 1 FROM empresa_empleados e WHERE e.user_id = u.id AND e.estado = 'activo') as empleado
       FROM users u
       WHERE u.username ILIKE ? AND u.status = 'approved'
       ORDER BY u.username LIMIT 10`
    )
    .all(`%${query}%`)) as { id: number; username: string; role: string; empleado: boolean }[];
  return rows;
}

export async function contratarUsuario(
  empresaId: number,
  userId: number,
  salario: number
): Promise<{ ok: boolean; error?: string }> {
  const db = getDb();
  const existente = (await db
    .prepare(`SELECT id FROM empresa_empleados WHERE user_id = ? AND estado = 'activo'`)
    .get(userId)) as { id: number } | undefined;
  if (existente) return { ok: false, error: "Ese usuario ya tiene un empleo activo." };

  await db
    .prepare(`INSERT INTO empresa_empleados (empresa_id, user_id, salario) VALUES (?, ?, ?)`)
    .run(empresaId, userId, salario);
  return { ok: true };
}

export async function despedirEmpleado(empresaId: number, id: number): Promise<void> {
  const db = getDb();
  await db
    .prepare(
      `UPDATE empresa_empleados SET estado = 'despedido', despedido_at = now() WHERE id = ? AND empresa_id = ?`
    )
    .run(id, empresaId);
}

export async function actualizarEmpleado(
  empresaId: number,
  id: number,
  salario: number,
  anotaciones: string
): Promise<void> {
  const db = getDb();
  await db
    .prepare(`UPDATE empresa_empleados SET salario = ?, anotaciones = ? WHERE id = ? AND empresa_id = ?`)
    .run(salario, anotaciones || null, id, empresaId);
}

export async function getEmpleoActivoDeUsuario(userId: number): Promise<EmpleoActivoRow | undefined> {
  const db = getDb();
  return (await db
    .prepare(
      `SELECT ee.id, ee.empresa_id, e.nombre as empresa_nombre, ee.salario, ee.gasto_total, ee.anotaciones, ee.created_at
       FROM empresa_empleados ee
       JOIN empresas e ON e.id = ee.empresa_id
       WHERE ee.user_id = ? AND ee.estado = 'activo'`
    )
    .get(userId)) as EmpleoActivoRow | undefined;
}

export async function listMensajesEmpleado(empleadoId: number): Promise<EmpleadoMensajeRow[]> {
  const db = getDb();
  return (await db
    .prepare(`SELECT * FROM empresa_empleado_mensajes WHERE empleado_id = ? ORDER BY created_at ASC`)
    .all(empleadoId)) as EmpleadoMensajeRow[];
}

export async function enviarMensajeEmpleado(
  empleadoId: number,
  autor: "empresa" | "empleado",
  mensaje: string
): Promise<void> {
  const db = getDb();
  await db
    .prepare(`INSERT INTO empresa_empleado_mensajes (empleado_id, autor, mensaje) VALUES (?, ?, ?)`)
    .run(empleadoId, autor, mensaje);
}
