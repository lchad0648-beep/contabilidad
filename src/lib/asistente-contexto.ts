import { getDb } from "./db";
import type { ModuleConfig } from "./modules";

export interface FacturaPendienteResumen {
  numero: string;
  cliente: string | null;
  monto: number;
  estado: string | null;
  fecha: string;
}

export async function listFacturasPendientes(limit = 15): Promise<FacturaPendienteResumen[]> {
  const db = getDb();
  return (await db
    .prepare(
      `SELECT r.numero, c.nombre as cliente, r.monto, r.estado, r.fecha
       FROM recibos r
       LEFT JOIN clientes c ON c.id = r.cliente_id
       WHERE r.estado IS NULL OR r.estado != 'Pagado'
       ORDER BY r.fecha ASC
       LIMIT ?`
    )
    .all(limit)) as FacturaPendienteResumen[];
}

export interface TicketAbiertoResumen {
  id: number;
  cliente: string;
  asunto: string;
  estado: string;
}

export async function listTicketsAbiertosResumen(limit = 15): Promise<TicketAbiertoResumen[]> {
  const { listTicketsForStaff } = await import("./tickets");
  const tickets = await listTicketsForStaff();
  return tickets
    .filter((t) => t.estado !== "Cerrado")
    .slice(0, limit)
    .map((t) => ({ id: t.id, cliente: t.cliente_username, asunto: t.asunto, estado: t.estado }));
}

function describirFila(mod: ModuleConfig, row: Record<string, unknown>): string {
  const titulo = row[mod.titleField] ?? `#${row.id}`;
  const partes = [`id ${row.id}`, String(titulo)];
  if (row.monto != null) partes.push(`monto ${row.monto}`);
  if (row.estado != null) partes.push(`estado ${row.estado}`);
  if (row.fecha != null) partes.push(`fecha ${row.fecha}`);
  return partes.join(" | ");
}

export interface ModuloResumen {
  slug: string;
  label: string;
  total: number;
  recientes: string[];
}

export async function listResumenModulos(maxRecientesPorModulo = 5): Promise<ModuloResumen[]> {
  const { MODULES } = await import("./modules");
  const { listRecords } = await import("./crud");
  const resumenes: ModuloResumen[] = [];
  for (const mod of MODULES) {
    const rows = await listRecords(mod);
    resumenes.push({
      slug: mod.slug,
      label: mod.label,
      total: rows.length,
      recientes: rows.slice(0, maxRecientesPorModulo).map((r) => describirFila(mod, r)),
    });
  }
  return resumenes;
}

export interface UsuarioPendienteResumen {
  id: number;
  username: string;
  role: string;
}

export async function listUsuariosPendientes(limit = 15): Promise<UsuarioPendienteResumen[]> {
  const db = getDb();
  return (await db
    .prepare(`SELECT id, username, role FROM users WHERE status = 'pending' ORDER BY id ASC LIMIT ?`)
    .all(limit)) as UsuarioPendienteResumen[];
}

export interface PrestamoPendienteResumen {
  id: number;
  cliente: string;
  monto_solicitado: number;
  motivo: string;
}

export async function listPrestamosPendientesResumen(limit = 15): Promise<PrestamoPendienteResumen[]> {
  const { listPrestamosForStaff } = await import("./prestamos");
  const prestamos = await listPrestamosForStaff();
  return prestamos
    .filter((p) => p.estado === "Pendiente")
    .slice(0, limit)
    .map((p) => ({
      id: p.id,
      cliente: p.cliente_username,
      monto_solicitado: p.monto_solicitado,
      motivo: p.motivo,
    }));
}

export interface StaffUsuarioResumen {
  id: number;
  username: string;
  role: string;
}

export async function listStaffUsuarios(limit = 30): Promise<StaffUsuarioResumen[]> {
  const db = getDb();
  return (await db
    .prepare(
      `SELECT id, username, role FROM users WHERE role != 'cliente' AND status = 'approved' ORDER BY username ASC LIMIT ?`
    )
    .all(limit)) as StaffUsuarioResumen[];
}

export async function getUserIdByUsername(username: string, excludeCliente = false): Promise<number | null> {
  const db = getDb();
  const row = (await db
    .prepare(
      excludeCliente
        ? `SELECT id FROM users WHERE username = ? AND role != 'cliente'`
        : `SELECT id FROM users WHERE username = ?`
    )
    .get(username)) as { id: number } | undefined;
  return row?.id ?? null;
}

export async function buscarPrestamosPorCliente(cliente: string) {
  const { listPrestamosForStaff } = await import("./prestamos");
  const prestamos = await listPrestamosForStaff();
  const needle = cliente.trim().toLowerCase();
  return prestamos.filter((p) => p.cliente_username.toLowerCase() === needle);
}

export async function buscarTickets(cliente?: string, asunto?: string) {
  const { listTicketsForStaff } = await import("./tickets");
  const tickets = await listTicketsForStaff();
  return tickets.filter((t) => {
    const clienteOk = cliente ? t.cliente_username.toLowerCase() === cliente.trim().toLowerCase() : true;
    const asuntoOk = asunto ? t.asunto.toLowerCase().includes(asunto.trim().toLowerCase()) : true;
    return clienteOk && asuntoOk;
  });
}

export async function buscarRegistroPorTitulo(mod: ModuleConfig, valor: string): Promise<number[]> {
  const db = getDb();
  const rows = (await db
    .prepare(`SELECT id FROM ${mod.table} WHERE ${mod.titleField}::text ILIKE ?`)
    .all(`%${valor}%`)) as { id: number }[];
  return rows.map((r) => r.id);
}

export interface ResumenCuentaCliente {
  totalFacturado: number;
  totalPagado: number;
  saldo: number;
  facturasRecientes: { numero: string; fecha: string; monto: number; estado: string | null }[];
  pagosRecientes: { numero: string | null; fecha: string; monto: number }[];
  prestamos: { id: number; estado: string; monto_solicitado: number; monto_a_devolver: number | null }[];
  ticketsAbiertos: number;
}

export async function getResumenCuentaCliente(clienteId: number, userId: number): Promise<ResumenCuentaCliente> {
  const db = getDb();
  const [facturadoRow, pagadoRow, facturasRecientes, pagosRecientes, ticketsRow] = await Promise.all([
    db.prepare(`SELECT COALESCE(SUM(monto), 0) as s FROM recibos WHERE cliente_id = ?`).get(clienteId) as Promise<{
      s: number;
    }>,
    db.prepare(`SELECT COALESCE(SUM(monto), 0) as s FROM pagos WHERE cliente_id = ?`).get(clienteId) as Promise<{
      s: number;
    }>,
    db
      .prepare(`SELECT numero, fecha, monto, estado FROM recibos WHERE cliente_id = ? ORDER BY fecha DESC, id DESC LIMIT 8`)
      .all(clienteId) as Promise<{ numero: string; fecha: string; monto: number; estado: string | null }[]>,
    db
      .prepare(`SELECT numero, fecha, monto FROM pagos WHERE cliente_id = ? ORDER BY fecha DESC, id DESC LIMIT 8`)
      .all(clienteId) as Promise<{ numero: string | null; fecha: string; monto: number }[]>,
    db
      .prepare(`SELECT COUNT(*) as n FROM tickets WHERE cliente_user_id = ? AND estado != 'Cerrado'`)
      .get(userId) as Promise<{ n: number }>,
  ]);

  const { listPrestamosForCliente } = await import("./prestamos");
  const prestamos = await listPrestamosForCliente(userId);

  return {
    totalFacturado: facturadoRow.s,
    totalPagado: pagadoRow.s,
    saldo: facturadoRow.s - pagadoRow.s,
    facturasRecientes,
    pagosRecientes,
    prestamos: prestamos.map((p) => ({
      id: p.id,
      estado: p.estado,
      monto_solicitado: p.monto_solicitado,
      monto_a_devolver: p.monto_a_devolver,
    })),
    ticketsAbiertos: ticketsRow.n,
  };
}

export interface ResumenFinancieroCompacto {
  activos: number;
  pasivos: number;
  patrimonio: number;
  ingresos: number;
  gastos: number;
}

export async function getResumenFinancieroCompacto(): Promise<ResumenFinancieroCompacto> {
  const { getEstadosFinancieros } = await import("./estados-financieros");
  const e = await getEstadosFinancieros();
  return {
    activos: e.activos.total,
    pasivos: e.pasivos.total,
    patrimonio: e.patrimonio.total,
    ingresos: e.ingresos.total,
    gastos: e.gastos.total,
  };
}
