import { getDb } from "./db";

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
