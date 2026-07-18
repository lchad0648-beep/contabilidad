import { getDb } from "./db";

export interface SolicitudBorradoRow {
  id: number;
  modulo: string;
  registro_id: number;
  registro_descripcion: string | null;
  solicitado_por: number;
  solicitado_por_username: string;
  motivo: string | null;
  estado: "Pendiente" | "Aprobada" | "Rechazada";
  revisado_por: number | null;
  revisado_por_username: string | null;
  revisado_at: string | null;
  created_at: string;
}

const SELECT_SOLICITUD = `
  SELECT s.*, u.username as solicitado_por_username, r.username as revisado_por_username
  FROM solicitudes_borrado s
  JOIN users u ON u.id = s.solicitado_por
  LEFT JOIN users r ON r.id = s.revisado_por
`;

export async function createSolicitud(
  modulo: string,
  registroId: number,
  descripcion: string | null,
  solicitadoPor: number,
  motivo: string | null
): Promise<number> {
  const db = getDb();
  const info = await db
    .prepare(
      `INSERT INTO solicitudes_borrado (modulo, registro_id, registro_descripcion, solicitado_por, motivo)
       VALUES (?, ?, ?, ?, ?)`
    )
    .run(modulo, registroId, descripcion, solicitadoPor, motivo);
  return Number(info.lastInsertRowid);
}

export async function listSolicitudesPendientes(): Promise<SolicitudBorradoRow[]> {
  const db = getDb();
  return (await db
    .prepare(`${SELECT_SOLICITUD} WHERE s.estado = 'Pendiente' ORDER BY s.created_at ASC`)
    .all()) as SolicitudBorradoRow[];
}

export async function listSolicitudes(limit = 50): Promise<SolicitudBorradoRow[]> {
  const db = getDb();
  return (await db
    .prepare(`${SELECT_SOLICITUD} ORDER BY (s.estado = 'Pendiente') DESC, s.created_at DESC LIMIT ?`)
    .all(limit)) as SolicitudBorradoRow[];
}

export async function getSolicitud(id: number): Promise<SolicitudBorradoRow | null> {
  const db = getDb();
  const row = (await db.prepare(`${SELECT_SOLICITUD} WHERE s.id = ?`).get(id)) as
    | SolicitudBorradoRow
    | undefined;
  return row ?? null;
}

export async function aprobarSolicitud(id: number, adminId: number): Promise<void> {
  const { withTransaction } = await import("./db");
  const { getModule } = await import("./modules");
  const { deleteRecord } = await import("./crud");

  await withTransaction(async (tx) => {
    const solicitud = (await tx.prepare(`SELECT * FROM solicitudes_borrado WHERE id = ?`).get(id)) as
      | { id: number; modulo: string; registro_id: number; estado: string }
      | undefined;
    if (!solicitud) throw new Error("Solicitud no encontrada.");
    if (solicitud.estado !== "Pendiente") throw new Error("Esta solicitud ya fue revisada.");

    const mod = getModule(solicitud.modulo);
    if (!mod) throw new Error("Módulo desconocido.");

    await deleteRecord(mod, solicitud.registro_id);
    await tx
      .prepare(
        `UPDATE solicitudes_borrado SET estado = 'Aprobada', revisado_por = ?, revisado_at = now() WHERE id = ?`
      )
      .run(adminId, id);
  });
}

export async function rechazarSolicitud(id: number, adminId: number): Promise<void> {
  const db = getDb();
  await db
    .prepare(
      `UPDATE solicitudes_borrado SET estado = 'Rechazada', revisado_por = ?, revisado_at = now() WHERE id = ? AND estado = 'Pendiente'`
    )
    .run(adminId, id);
}
