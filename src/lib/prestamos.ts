import { getDb, withTransaction } from "./db";

export type PlazoUnidad = "dias" | "semanas" | "meses";
export type TipoPago = "unico" | "cuotas";
export type PrestamoEstado = "Pendiente" | "Aprobado" | "Rechazado" | "Pagado";

export interface PrestamoRow {
  id: number;
  cliente_user_id: number;
  cliente_username: string;
  monto_solicitado: number;
  motivo: string;
  estado: PrestamoEstado;
  plazo_valor: number | null;
  plazo_unidad: PlazoUnidad | null;
  tipo_pago: TipoPago | null;
  num_cuotas: number | null;
  tasa_interes: number | null;
  monto_a_devolver: number | null;
  fecha_aprobacion: string | null;
  fecha_vencimiento: string | null;
  aprobado_por: number | null;
  aprobado_por_username: string | null;
  asignado_a: number | null;
  asignado_username: string | null;
  ticket_id: number | null;
  created_at: string;
  updated_at: string;
}

export interface CuotaRow {
  id: number;
  prestamo_id: number;
  numero: number;
  fecha_vencimiento: string;
  monto: number;
  pagada: number;
  fecha_pago: string | null;
}

const SELECT_PRESTAMO = `
  SELECT p.*, c.username as cliente_username, a.username as asignado_username, ap.username as aprobado_por_username
  FROM prestamos p
  JOIN users c ON c.id = p.cliente_user_id
  LEFT JOIN users a ON a.id = p.asignado_a
  LEFT JOIN users ap ON ap.id = p.aprobado_por
`;

export async function listPrestamosForStaff(): Promise<PrestamoRow[]> {
  const db = getDb();
  return (await db
    .prepare(`${SELECT_PRESTAMO} ORDER BY (p.estado = 'Pendiente') DESC, p.updated_at DESC`)
    .all()) as PrestamoRow[];
}

export async function listPrestamosForCliente(clienteUserId: number): Promise<PrestamoRow[]> {
  const db = getDb();
  return (await db
    .prepare(`${SELECT_PRESTAMO} WHERE p.cliente_user_id = ? ORDER BY p.updated_at DESC`)
    .all(clienteUserId)) as PrestamoRow[];
}

export async function getPrestamo(id: number): Promise<PrestamoRow | null> {
  const db = getDb();
  const row = (await db.prepare(`${SELECT_PRESTAMO} WHERE p.id = ?`).get(id)) as
    | PrestamoRow
    | undefined;
  return row ?? null;
}

export async function listCuotas(prestamoId: number): Promise<CuotaRow[]> {
  const db = getDb();
  return (await db
    .prepare(`SELECT * FROM prestamo_cuotas WHERE prestamo_id = ? ORDER BY numero ASC`)
    .all(prestamoId)) as CuotaRow[];
}

export async function listCuotasPendientesForCliente(
  clienteUserId: number
): Promise<(CuotaRow & { prestamo_id: number; asunto: string })[]> {
  const db = getDb();
  return (await db
    .prepare(
      `SELECT pc.*, p.motivo as asunto
       FROM prestamo_cuotas pc
       JOIN prestamos p ON p.id = pc.prestamo_id
       WHERE p.cliente_user_id = ? AND pc.pagada = 0
       ORDER BY pc.fecha_vencimiento ASC`
    )
    .all(clienteUserId)) as (CuotaRow & { asunto: string })[];
}

function addPlazo(date: Date, valor: number, unidad: PlazoUnidad): Date {
  const d = new Date(date.getTime());
  if (unidad === "dias") d.setDate(d.getDate() + valor);
  else if (unidad === "semanas") d.setDate(d.getDate() + valor * 7);
  else if (unidad === "meses") d.setMonth(d.getMonth() + valor);
  return d;
}

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function buildCuotas(
  fechaInicio: Date,
  fechaFin: Date,
  numCuotas: number,
  montoTotal: number
): { numero: number; fecha: string; monto: number }[] {
  const totalMs = fechaFin.getTime() - fechaInicio.getTime();
  const cuotas: { numero: number; fecha: string; monto: number }[] = [];
  let acumulado = 0;
  const montoBase = Math.round((montoTotal / numCuotas) * 100) / 100;
  for (let i = 1; i <= numCuotas; i++) {
    const fecha = new Date(fechaInicio.getTime() + (totalMs * i) / numCuotas);
    const monto = i === numCuotas ? Math.round((montoTotal - acumulado) * 100) / 100 : montoBase;
    acumulado += monto;
    cuotas.push({ numero: i, fecha: toDateStr(fecha), monto });
  }
  return cuotas;
}

export interface AprobarPrestamoInput {
  plazoValor: number;
  plazoUnidad: PlazoUnidad;
  tipoPago: TipoPago;
  numCuotas: number; // 1 si es pago único
  tasaInteres: number;
}

export async function aprobarPrestamo(
  prestamoId: number,
  adminId: number,
  input: AprobarPrestamoInput
): Promise<{ montoADevolver: number; fechaVencimiento: string }> {
  const prestamo = await getPrestamo(prestamoId);
  if (!prestamo) throw new Error("Préstamo no encontrado.");

  const montoADevolver =
    Math.round(prestamo.monto_solicitado * (1 + input.tasaInteres / 100) * 100) / 100;

  const fechaInicio = new Date();
  const fechaFin = addPlazo(fechaInicio, input.plazoValor, input.plazoUnidad);
  const numCuotas = input.tipoPago === "unico" ? 1 : Math.max(1, input.numCuotas);
  const cuotas = buildCuotas(fechaInicio, fechaFin, numCuotas, montoADevolver);

  await withTransaction(async (tx) => {
    await tx
      .prepare(
        `UPDATE prestamos SET
           estado = 'Aprobado',
           plazo_valor = ?, plazo_unidad = ?, tipo_pago = ?, num_cuotas = ?,
           tasa_interes = ?, monto_a_devolver = ?,
           fecha_aprobacion = datetime('now'), fecha_vencimiento = ?,
           aprobado_por = ?, updated_at = datetime('now')
         WHERE id = ?`
      )
      .run(
        input.plazoValor,
        input.plazoUnidad,
        input.tipoPago,
        numCuotas,
        input.tasaInteres,
        montoADevolver,
        toDateStr(fechaFin),
        adminId,
        prestamoId
      );

    const insertCuota = tx.prepare(
      `INSERT INTO prestamo_cuotas (prestamo_id, numero, fecha_vencimiento, monto) VALUES (?, ?, ?, ?)`
    );
    for (const c of cuotas) {
      await insertCuota.run(prestamoId, c.numero, c.fecha, c.monto);
    }
  });

  return { montoADevolver, fechaVencimiento: toDateStr(fechaFin) };
}

export async function rechazarPrestamo(prestamoId: number, adminId: number) {
  const db = getDb();
  await db
    .prepare(
      `UPDATE prestamos SET estado = 'Rechazado', aprobado_por = ?, updated_at = datetime('now') WHERE id = ?`
    )
    .run(adminId, prestamoId);
}

export async function reasignarPrestamo(prestamoId: number, userId: number) {
  const db = getDb();
  await db
    .prepare(`UPDATE prestamos SET asignado_a = ?, updated_at = datetime('now') WHERE id = ?`)
    .run(userId, prestamoId);
}

export async function marcarCuotaPagada(cuotaId: number) {
  const db = getDb();
  const cuota = (await db.prepare(`SELECT * FROM prestamo_cuotas WHERE id = ?`).get(cuotaId)) as
    | CuotaRow
    | undefined;
  if (!cuota) throw new Error("Cuota no encontrada.");

  await withTransaction(async (tx) => {
    await tx
      .prepare(`UPDATE prestamo_cuotas SET pagada = 1, fecha_pago = date('now') WHERE id = ?`)
      .run(cuotaId);

    const pendientes = (await tx
      .prepare(`SELECT COUNT(*) as n FROM prestamo_cuotas WHERE prestamo_id = ? AND pagada = 0`)
      .get(cuota.prestamo_id)) as { n: number };

    if (pendientes.n === 0) {
      await tx
        .prepare(`UPDATE prestamos SET estado = 'Pagado', updated_at = datetime('now') WHERE id = ?`)
        .run(cuota.prestamo_id);
    }
  });
}

export async function linkTicket(prestamoId: number, ticketId: number) {
  const db = getDb();
  await db.prepare(`UPDATE prestamos SET ticket_id = ? WHERE id = ?`).run(ticketId, prestamoId);
}

export interface CalendarioDia {
  fecha: string;
  total: number;
  items: { cliente: string; monto: number; prestamo_id: number; cuota_id: number }[];
}

export async function getCalendarioCobros(desde: string, hasta: string): Promise<CalendarioDia[]> {
  const db = getDb();
  const rows = (await db
    .prepare(
      `SELECT pc.id as cuota_id, pc.prestamo_id, pc.fecha_vencimiento, pc.monto, u.username as cliente
       FROM prestamo_cuotas pc
       JOIN prestamos p ON p.id = pc.prestamo_id
       JOIN users u ON u.id = p.cliente_user_id
       WHERE pc.pagada = 0 AND pc.fecha_vencimiento BETWEEN ? AND ?
       ORDER BY pc.fecha_vencimiento ASC`
    )
    .all(desde, hasta)) as {
    cuota_id: number;
    prestamo_id: number;
    fecha_vencimiento: string;
    monto: number;
    cliente: string;
  }[];

  const byDate = new Map<string, CalendarioDia>();
  for (const row of rows) {
    const existing = byDate.get(row.fecha_vencimiento);
    const item = {
      cliente: row.cliente,
      monto: row.monto,
      prestamo_id: row.prestamo_id,
      cuota_id: row.cuota_id,
    };
    if (existing) {
      existing.total += row.monto;
      existing.items.push(item);
    } else {
      byDate.set(row.fecha_vencimiento, { fecha: row.fecha_vencimiento, total: row.monto, items: [item] });
    }
  }
  return Array.from(byDate.values());
}
