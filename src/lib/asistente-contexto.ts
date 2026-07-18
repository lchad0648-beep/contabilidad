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
