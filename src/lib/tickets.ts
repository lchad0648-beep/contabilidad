import { getDb } from "./db";

export interface TicketRow {
  id: number;
  cliente_user_id: number;
  cliente_username: string;
  asunto: string;
  estado: "Abierto" | "En progreso" | "Cerrado";
  asignado_a: number | null;
  asignado_username: string | null;
  tipo: "soporte" | "prestamo";
  prestamo_id: number | null;
  created_at: string;
  updated_at: string;
}

export interface MensajeRow {
  id: number;
  ticket_id: number;
  user_id: number;
  username: string;
  role: string;
  mensaje: string;
  created_at: string;
}

export async function listTicketsForStaff(): Promise<TicketRow[]> {
  const db = getDb();
  return (await db
    .prepare(
      `SELECT t.*, c.username as cliente_username, a.username as asignado_username
       FROM tickets t
       JOIN users c ON c.id = t.cliente_user_id
       LEFT JOIN users a ON a.id = t.asignado_a
       WHERE t.tipo = 'soporte'
       ORDER BY (t.estado = 'Cerrado') ASC, t.updated_at DESC`
    )
    .all()) as TicketRow[];
}

export async function listTicketsForClient(clienteUserId: number): Promise<TicketRow[]> {
  const db = getDb();
  return (await db
    .prepare(
      `SELECT t.*, c.username as cliente_username, a.username as asignado_username
       FROM tickets t
       JOIN users c ON c.id = t.cliente_user_id
       LEFT JOIN users a ON a.id = t.asignado_a
       WHERE t.cliente_user_id = ? AND t.tipo = 'soporte'
       ORDER BY t.updated_at DESC`
    )
    .all(clienteUserId)) as TicketRow[];
}

export async function getTicket(id: number): Promise<TicketRow | null> {
  const db = getDb();
  const row = (await db
    .prepare(
      `SELECT t.*, c.username as cliente_username, a.username as asignado_username
       FROM tickets t
       JOIN users c ON c.id = t.cliente_user_id
       LEFT JOIN users a ON a.id = t.asignado_a
       WHERE t.id = ?`
    )
    .get(id)) as TicketRow | undefined;
  return row ?? null;
}

export async function createTicket(
  clienteUserId: number,
  asunto: string,
  primerMensaje: string
): Promise<number> {
  const db = getDb();
  const info = await db
    .prepare(`INSERT INTO tickets (cliente_user_id, asunto) VALUES (?, ?)`)
    .run(clienteUserId, asunto);
  const ticketId = Number(info.lastInsertRowid);
  await db
    .prepare(`INSERT INTO ticket_mensajes (ticket_id, user_id, mensaje) VALUES (?, ?, ?)`)
    .run(ticketId, clienteUserId, primerMensaje);
  return ticketId;
}

export async function createTicketForPrestamo(
  clienteUserId: number,
  prestamoId: number,
  asunto: string,
  primerMensaje: string
): Promise<number> {
  const db = getDb();
  const info = await db
    .prepare(
      `INSERT INTO tickets (cliente_user_id, asunto, tipo, prestamo_id) VALUES (?, ?, 'prestamo', ?)`
    )
    .run(clienteUserId, asunto, prestamoId);
  const ticketId = Number(info.lastInsertRowid);
  await db
    .prepare(`INSERT INTO ticket_mensajes (ticket_id, user_id, mensaje) VALUES (?, ?, ?)`)
    .run(ticketId, clienteUserId, primerMensaje);
  return ticketId;
}

export async function addMessage(ticketId: number, userId: number, mensaje: string) {
  const db = getDb();
  await db
    .prepare(`INSERT INTO ticket_mensajes (ticket_id, user_id, mensaje) VALUES (?, ?, ?)`)
    .run(ticketId, userId, mensaje);
  await db.prepare(`UPDATE tickets SET updated_at = datetime('now') WHERE id = ?`).run(ticketId);
}

export async function listMessages(ticketId: number, afterId = 0): Promise<MensajeRow[]> {
  const db = getDb();
  return (await db
    .prepare(
      `SELECT m.id, m.ticket_id, m.user_id, u.username, u.role, m.mensaje, m.created_at
       FROM ticket_mensajes m
       JOIN users u ON u.id = m.user_id
       WHERE m.ticket_id = ? AND m.id > ?
       ORDER BY m.id ASC`
    )
    .all(ticketId, afterId)) as MensajeRow[];
}

export async function setTicketEstado(ticketId: number, estado: string) {
  const db = getDb();
  await db
    .prepare(`UPDATE tickets SET estado = ?, updated_at = datetime('now') WHERE id = ?`)
    .run(estado, ticketId);
}

export async function assignTicket(ticketId: number, userId: number | null) {
  const db = getDb();
  await db
    .prepare(`UPDATE tickets SET asignado_a = ?, updated_at = datetime('now') WHERE id = ?`)
    .run(userId, ticketId);
}
