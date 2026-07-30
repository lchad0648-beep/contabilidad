import { getDb, withTransaction, type Db } from "./db";
import { registrarTransferenciaEmpresa } from "./empresas";

const COOLDOWN_MS = 12 * 60 * 60 * 1000; // 12 horas
const IMPACT_FACTOR = 2.2; // qué tan fuerte mueve el precio una compra/venta según su tamaño relativo al mercado
const DRIFT_TICK_MS = 60 * 1000; // cada cuánto se aplica una "vela" de deriva aleatoria
const DRIFT_MAX_PCT = 0.006; // variación aleatoria máxima por tick (0.6%)
const MAX_CATCHUP_TICKS = 60; // tope de velas a rellenar de una sola vez si el servidor estuvo inactivo

export interface SolicitudBolsaRow {
  id: number;
  empresa_id: number;
  estado: "Pendiente" | "Aprobada" | "Rechazada";
  mensaje_inicial: string | null;
  revisado_por: number | null;
  revisado_at: string | null;
  bloqueada_hasta: string | null;
  comision_pct: number | null;
  total_acciones: number | null;
  valor_empresa: number | null;
  pct_salida: number | null;
  lanzada: boolean;
  created_at: string;
}

export interface AccionesEmpresaRow {
  empresa_id: number;
  solicitud_id: number;
  total_acciones: number;
  acciones_banco: number;
  acciones_mercado_totales: number;
  acciones_disponibles: number;
  precio_salida: number;
  precio_actual: number;
  ultimo_tick_at: string;
  lanzada_at: string;
}

export type BolsaEstado =
  | { tipo: "sin_solicitud" }
  | { tipo: "pendiente"; solicitud: SolicitudBolsaRow }
  | { tipo: "rechazada_cooldown"; solicitud: SolicitudBolsaRow; hastaMs: number }
  | { tipo: "aprobada_config_pendiente"; solicitud: SolicitudBolsaRow }
  | { tipo: "lanzada"; solicitud: SolicitudBolsaRow; acciones: AccionesEmpresaRow };

export async function getUltimaSolicitud(empresaId: number): Promise<SolicitudBolsaRow | undefined> {
  const db = getDb();
  return (await db
    .prepare(`SELECT * FROM empresa_bolsa_solicitudes WHERE empresa_id = ? ORDER BY id DESC LIMIT 1`)
    .get(empresaId)) as SolicitudBolsaRow | undefined;
}

export async function getAccionesEmpresa(empresaId: number): Promise<AccionesEmpresaRow | undefined> {
  const db = getDb();
  return (await db.prepare(`SELECT * FROM empresa_acciones WHERE empresa_id = ?`).get(empresaId)) as
    | AccionesEmpresaRow
    | undefined;
}

export async function getBolsaEstado(empresaId: number): Promise<BolsaEstado> {
  const solicitud = await getUltimaSolicitud(empresaId);
  if (!solicitud) return { tipo: "sin_solicitud" };

  if (solicitud.lanzada) {
    const acciones = await getAccionesEmpresa(empresaId);
    if (acciones) return { tipo: "lanzada", solicitud, acciones };
  }

  if (solicitud.estado === "Pendiente") return { tipo: "pendiente", solicitud };

  if (solicitud.estado === "Rechazada") {
    const hastaMs = solicitud.bloqueada_hasta ? new Date(solicitud.bloqueada_hasta + "Z").getTime() : 0;
    if (hastaMs > Date.now()) return { tipo: "rechazada_cooldown", solicitud, hastaMs };
    return { tipo: "sin_solicitud" };
  }

  // Aprobada pero todavía no lanzada: la empresa debe fijar el % de salida.
  return { tipo: "aprobada_config_pendiente", solicitud };
}

export async function crearSolicitudBolsa(
  empresaId: number,
  mensajeInicial: string
): Promise<{ ok: boolean; error?: string; id?: number }> {
  const estado = await getBolsaEstado(empresaId);
  if (estado.tipo === "pendiente") return { ok: false, error: "Ya tienes una solicitud pendiente de revisión." };
  if (estado.tipo === "rechazada_cooldown") {
    return { ok: false, error: "Debes esperar el tiempo de bloqueo antes de volver a solicitar." };
  }
  if (estado.tipo === "aprobada_config_pendiente" || estado.tipo === "lanzada") {
    return { ok: false, error: "Tu empresa ya tiene un proceso de salida a bolsa en curso." };
  }

  const db = getDb();
  const info = await db
    .prepare(`INSERT INTO empresa_bolsa_solicitudes (empresa_id, mensaje_inicial) VALUES (?, ?)`)
    .run(empresaId, mensajeInicial || null);
  return { ok: true, id: Number(info.lastInsertRowid) };
}

export async function listSolicitudesBolsaPendientes(): Promise<(SolicitudBolsaRow & { empresa_nombre: string })[]> {
  const db = getDb();
  return (await db
    .prepare(
      `SELECT s.*, e.nombre as empresa_nombre
       FROM empresa_bolsa_solicitudes s
       JOIN empresas e ON e.id = s.empresa_id
       WHERE s.estado = 'Pendiente'
       ORDER BY s.created_at ASC`
    )
    .all()) as (SolicitudBolsaRow & { empresa_nombre: string })[];
}

export async function getSolicitudConMensajes(id: number) {
  const db = getDb();
  const solicitud = (await db
    .prepare(
      `SELECT s.*, e.nombre as empresa_nombre
       FROM empresa_bolsa_solicitudes s
       JOIN empresas e ON e.id = s.empresa_id
       WHERE s.id = ?`
    )
    .get(id)) as (SolicitudBolsaRow & { empresa_nombre: string }) | undefined;
  if (!solicitud) return null;
  const mensajes = (await db
    .prepare(`SELECT * FROM empresa_bolsa_mensajes WHERE solicitud_id = ? ORDER BY created_at ASC`)
    .all(id)) as { id: number; autor_tipo: string; autor_nombre: string; mensaje: string; created_at: string }[];
  return { solicitud, mensajes };
}

export async function enviarMensajeBolsa(
  solicitudId: number,
  autorTipo: "empresa" | "staff",
  autorNombre: string,
  mensaje: string
): Promise<void> {
  const db = getDb();
  await db
    .prepare(
      `INSERT INTO empresa_bolsa_mensajes (solicitud_id, autor_tipo, autor_nombre, mensaje) VALUES (?, ?, ?, ?)`
    )
    .run(solicitudId, autorTipo, autorNombre, mensaje);
}

export async function rechazarSolicitudBolsa(id: number, staffId: number): Promise<void> {
  const bloqueadaHasta = new Date(Date.now() + COOLDOWN_MS);
  const db = getDb();
  await db
    .prepare(
      `UPDATE empresa_bolsa_solicitudes
       SET estado = 'Rechazada', revisado_por = ?, revisado_at = now(), bloqueada_hasta = ?
       WHERE id = ? AND estado = 'Pendiente'`
    )
    .run(staffId, bloqueadaHasta, id);
}

export async function aprobarSolicitudBolsa(
  id: number,
  staffId: number,
  comisionPct: number,
  totalAcciones: number,
  valorEmpresa: number
): Promise<void> {
  const db = getDb();
  await db
    .prepare(
      `UPDATE empresa_bolsa_solicitudes
       SET estado = 'Aprobada', revisado_por = ?, revisado_at = now(),
           comision_pct = ?, total_acciones = ?, valor_empresa = ?
       WHERE id = ? AND estado = 'Pendiente'`
    )
    .run(staffId, comisionPct, totalAcciones, valorEmpresa, id);
}

/**
 * La empresa confirma qué % de sus acciones sale al mercado. El banco se
 * lleva `comision_pct` de ESE porcentaje (no del 100%): si sale 60% y la
 * comisión es 5%, el banco recibe 0.05 * 0.60 = 3% del total de acciones, y
 * el resto de ese 60% (57%) queda disponible para que el público compre.
 */
export async function lanzarBolsa(
  solicitudId: number,
  empresaId: number,
  pctSalida: number
): Promise<{ ok: boolean; error?: string }> {
  return withTransaction(async (db) => {
    const solicitud = (await db
      .prepare(`SELECT * FROM empresa_bolsa_solicitudes WHERE id = ? AND empresa_id = ? AND estado = 'Aprobada'`)
      .get(solicitudId, empresaId)) as SolicitudBolsaRow | undefined;
    if (!solicitud || solicitud.lanzada) return { ok: false, error: "Solicitud no válida para lanzar." };
    if (pctSalida <= 0 || pctSalida > 100) return { ok: false, error: "El % de salida debe estar entre 0 y 100." };

    const totalAcciones = Number(solicitud.total_acciones);
    const comisionPct = Number(solicitud.comision_pct);
    const valorEmpresa = Number(solicitud.valor_empresa);

    const accionesSalida = Math.round(totalAcciones * (pctSalida / 100));
    const accionesBanco = Math.round(accionesSalida * (comisionPct / 100));
    const accionesMercado = accionesSalida - accionesBanco;
    const precioSalida = valorEmpresa / totalAcciones;

    if (accionesMercado <= 0) {
      return { ok: false, error: "Con ese % de salida no queda ninguna acción disponible para el mercado." };
    }

    await db
      .prepare(
        `INSERT INTO empresa_acciones
           (empresa_id, solicitud_id, total_acciones, acciones_banco, acciones_mercado_totales,
            acciones_disponibles, precio_salida, precio_actual)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(empresaId, solicitudId, totalAcciones, accionesBanco, accionesMercado, accionesMercado, precioSalida, precioSalida);

    await db
      .prepare(`INSERT INTO acciones_precio_historial (empresa_id, precio) VALUES (?, ?)`)
      .run(empresaId, precioSalida);

    await db
      .prepare(`UPDATE empresa_bolsa_solicitudes SET lanzada = true, pct_salida = ? WHERE id = ?`)
      .run(pctSalida, solicitudId);

    return { ok: true };
  });
}

function seededRandom(seed: number): number {
  // PRNG determinista simple (mulberry32) para que rellenar velas pasadas dé
  // siempre el mismo resultado sin importar cuántas veces se recalculen.
  let t = (seed += 0x6d2b79f5);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/**
 * Simula el paso del tiempo en el mercado: si pasaron >= DRIFT_TICK_MS desde
 * el último tick, rellena velas de variación aleatoria hasta "ahora" (con un
 * tope para no generar miles de filas si el servidor estuvo apagado mucho
 * tiempo). Se llama de forma perezosa cada vez que se lee el estado de la
 * bolsa, así que no depende de tener un cron corriendo de verdad.
 */
export async function aplicarDerivaMercado(empresaId: number): Promise<void> {
  await withTransaction(async (db) => {
    const acciones = (await db
      .prepare(`SELECT * FROM empresa_acciones WHERE empresa_id = ? FOR UPDATE`)
      .get(empresaId)) as AccionesEmpresaRow | undefined;
    if (!acciones) return;

    const ultimo = new Date(acciones.ultimo_tick_at + "Z").getTime();
    const ahora = Date.now();
    let ticksPendientes = Math.floor((ahora - ultimo) / DRIFT_TICK_MS);
    if (ticksPendientes <= 0) return;
    ticksPendientes = Math.min(ticksPendientes, MAX_CATCHUP_TICKS);

    let precio = acciones.precio_actual;
    let tickTime = ultimo;
    for (let i = 0; i < ticksPendientes; i++) {
      tickTime += DRIFT_TICK_MS;
      const r = seededRandom(empresaId * 1_000_003 + Math.floor(tickTime / DRIFT_TICK_MS));
      const variacion = (r - 0.5) * 2 * DRIFT_MAX_PCT;
      precio = Math.max(0.01, precio * (1 + variacion));
      await db
        .prepare(`INSERT INTO acciones_precio_historial (empresa_id, precio, created_at) VALUES (?, ?, ?)`)
        .run(empresaId, precio, new Date(tickTime));
    }

    await db
      .prepare(`UPDATE empresa_acciones SET precio_actual = ?, ultimo_tick_at = ? WHERE empresa_id = ?`)
      .run(precio, new Date(tickTime), empresaId);
  });
}

export async function listEmpresasEnBolsa(): Promise<
  (AccionesEmpresaRow & { empresa_nombre: string; precio_apertura_dia: number })[]
> {
  const db = getDb();
  const rows = (await db
    .prepare(
      `SELECT a.*, e.nombre as empresa_nombre
       FROM empresa_acciones a
       JOIN empresas e ON e.id = a.empresa_id
       ORDER BY e.nombre`
    )
    .all()) as (AccionesEmpresaRow & { empresa_nombre: string })[];

  for (const row of rows) {
    await aplicarDerivaMercado(row.empresa_id);
  }

  const result = [];
  for (const row of rows) {
    const fresh = await getAccionesEmpresa(row.empresa_id);
    const apertura = (await db
      .prepare(
        `SELECT precio FROM acciones_precio_historial
         WHERE empresa_id = ? AND created_at >= now() - interval '24 hours'
         ORDER BY created_at ASC LIMIT 1`
      )
      .get(row.empresa_id)) as { precio: number } | undefined;
    result.push({
      ...row,
      precio_actual: fresh?.precio_actual ?? row.precio_actual,
      precio_apertura_dia: apertura?.precio ?? fresh?.precio_actual ?? row.precio_actual,
    });
  }
  return result;
}

export async function getHistorialPrecio(
  empresaId: number,
  horas = 24
): Promise<{ precio: number; created_at: string }[]> {
  await aplicarDerivaMercado(empresaId);
  const db = getDb();
  return (await db
    .prepare(
      `SELECT precio, created_at FROM acciones_precio_historial
       WHERE empresa_id = ? AND created_at >= now() - interval '${Math.max(1, Math.floor(horas))} hours'
       ORDER BY created_at ASC`
    )
    .all(empresaId)) as { precio: number; created_at: string }[];
}

export async function getTenencia(empresaId: number, userId: number): Promise<number> {
  const db = getDb();
  const row = (await db
    .prepare(`SELECT cantidad FROM acciones_tenencias WHERE empresa_id = ? AND user_id = ?`)
    .get(empresaId, userId)) as { cantidad: number } | undefined;
  return row?.cantidad ?? 0;
}

export async function listTenenciasUsuario(
  userId: number
): Promise<{ empresa_id: number; empresa_nombre: string; cantidad: number; precio_actual: number }[]> {
  const db = getDb();
  return (await db
    .prepare(
      `SELECT t.empresa_id, e.nombre as empresa_nombre, t.cantidad, a.precio_actual
       FROM acciones_tenencias t
       JOIN empresas e ON e.id = t.empresa_id
       JOIN empresa_acciones a ON a.empresa_id = t.empresa_id
       WHERE t.user_id = ? AND t.cantidad > 0
       ORDER BY e.nombre`
    )
    .all(userId)) as { empresa_id: number; empresa_nombre: string; cantidad: number; precio_actual: number }[];
}

export async function comprarAcciones(
  empresaId: number,
  userId: number,
  cantidad: number
): Promise<{ ok: boolean; error?: string }> {
  if (!Number.isFinite(cantidad) || cantidad <= 0) return { ok: false, error: "Cantidad inválida." };
  await aplicarDerivaMercado(empresaId);

  return withTransaction(async (db) => {
    const acciones = (await db
      .prepare(`SELECT * FROM empresa_acciones WHERE empresa_id = ? FOR UPDATE`)
      .get(empresaId)) as AccionesEmpresaRow | undefined;
    if (!acciones) return { ok: false, error: "Esta empresa no cotiza en bolsa." };
    if (cantidad > acciones.acciones_disponibles) {
      return { ok: false, error: `Solo quedan ${acciones.acciones_disponibles} acciones disponibles.` };
    }

    const user = (await db.prepare(`SELECT saldo FROM users WHERE id = ? FOR UPDATE`).get(userId)) as {
      saldo: number;
    };
    const total = cantidad * acciones.precio_actual;
    if (user.saldo < total) return { ok: false, error: "Saldo insuficiente." };

    const nuevoPrecio = Math.max(
      0.01,
      acciones.precio_actual * (1 + IMPACT_FACTOR * (cantidad / acciones.acciones_mercado_totales))
    );

    await db.prepare(`UPDATE users SET saldo = saldo - ? WHERE id = ?`).run(total, userId);
    await db
      .prepare(
        `INSERT INTO acciones_tenencias (empresa_id, user_id, cantidad) VALUES (?, ?, ?)
         ON CONFLICT (empresa_id, user_id) DO UPDATE SET cantidad = acciones_tenencias.cantidad + EXCLUDED.cantidad`
      )
      .run(empresaId, userId, cantidad);
    await db
      .prepare(
        `UPDATE empresa_acciones SET acciones_disponibles = acciones_disponibles - ?, precio_actual = ? WHERE empresa_id = ?`
      )
      .run(cantidad, nuevoPrecio, empresaId);
    await db
      .prepare(`INSERT INTO acciones_precio_historial (empresa_id, precio) VALUES (?, ?)`)
      .run(empresaId, nuevoPrecio);
    await db
      .prepare(
        `INSERT INTO acciones_transacciones (empresa_id, user_id, tipo, cantidad, precio, total) VALUES (?, ?, 'compra', ?, ?, ?)`
      )
      .run(empresaId, userId, cantidad, acciones.precio_actual, total);

    await registrarTransferenciaEmpresa(
      empresaId,
      "ingreso",
      total,
      `Venta de ${cantidad} acciones en bolsa`,
      db
    );

    return { ok: true };
  });
}

export async function venderAcciones(
  empresaId: number,
  userId: number,
  cantidad: number
): Promise<{ ok: boolean; error?: string }> {
  if (!Number.isFinite(cantidad) || cantidad <= 0) return { ok: false, error: "Cantidad inválida." };
  await aplicarDerivaMercado(empresaId);

  return withTransaction(async (db) => {
    const acciones = (await db
      .prepare(`SELECT * FROM empresa_acciones WHERE empresa_id = ? FOR UPDATE`)
      .get(empresaId)) as AccionesEmpresaRow | undefined;
    if (!acciones) return { ok: false, error: "Esta empresa no cotiza en bolsa." };

    const tenencia = (await db
      .prepare(`SELECT cantidad FROM acciones_tenencias WHERE empresa_id = ? AND user_id = ? FOR UPDATE`)
      .get(empresaId, userId)) as { cantidad: number } | undefined;
    if (!tenencia || tenencia.cantidad < cantidad) {
      return { ok: false, error: "No tienes suficientes acciones para vender." };
    }

    const total = cantidad * acciones.precio_actual;
    const empresaRow = (await db.prepare(`SELECT saldo FROM empresas WHERE id = ? FOR UPDATE`).get(empresaId)) as {
      saldo: number;
    };
    if (empresaRow.saldo < total) {
      return { ok: false, error: "La empresa no tiene liquidez suficiente para recomprar ahora mismo." };
    }

    const nuevoPrecio = Math.max(
      0.01,
      acciones.precio_actual * (1 - IMPACT_FACTOR * (cantidad / acciones.acciones_mercado_totales))
    );

    await db.prepare(`UPDATE users SET saldo = saldo + ? WHERE id = ?`).run(total, userId);
    await db
      .prepare(`UPDATE acciones_tenencias SET cantidad = cantidad - ? WHERE empresa_id = ? AND user_id = ?`)
      .run(cantidad, empresaId, userId);
    await db
      .prepare(
        `UPDATE empresa_acciones SET acciones_disponibles = acciones_disponibles + ?, precio_actual = ? WHERE empresa_id = ?`
      )
      .run(cantidad, nuevoPrecio, empresaId);
    await db
      .prepare(`INSERT INTO acciones_precio_historial (empresa_id, precio) VALUES (?, ?)`)
      .run(empresaId, nuevoPrecio);
    await db
      .prepare(
        `INSERT INTO acciones_transacciones (empresa_id, user_id, tipo, cantidad, precio, total) VALUES (?, ?, 'venta', ?, ?, ?)`
      )
      .run(empresaId, userId, cantidad, acciones.precio_actual, total);

    await registrarTransferenciaEmpresa(
      empresaId,
      "egreso",
      total,
      `Recompra de ${cantidad} acciones en bolsa`,
      db
    );

    return { ok: true };
  });
}

export async function listTransaccionesUsuario(
  empresaId: number,
  userId: number,
  limit = 20
): Promise<{ id: number; tipo: string; cantidad: number; precio: number; total: number; created_at: string }[]> {
  const db = getDb();
  return (await db
    .prepare(
      `SELECT id, tipo, cantidad, precio, total, created_at FROM acciones_transacciones
       WHERE empresa_id = ? AND user_id = ? ORDER BY created_at DESC LIMIT ?`
    )
    .all(empresaId, userId, limit)) as {
    id: number;
    tipo: string;
    cantidad: number;
    precio: number;
    total: number;
    created_at: string;
  }[];
}

export interface EmpresaAdminRow {
  id: number;
  nombre: string;
  saldo: number;
  lanzada: boolean;
  comision_pct: number | null;
  acciones_banco: number | null;
  precio_actual: number | null;
  valor_comision_banco: number | null;
}

/** Para el panel admin "Empresas": estado de bolsa y cuánto vale la comisión del banco en cada una. */
export async function listEmpresasConEstadoBolsa(): Promise<EmpresaAdminRow[]> {
  const db = getDb();
  const rows = (await db
    .prepare(
      `SELECT e.id, e.nombre, e.saldo,
              COALESCE(a.empresa_id IS NOT NULL, false) as lanzada,
              s.comision_pct,
              a.acciones_banco,
              a.precio_actual
       FROM empresas e
       LEFT JOIN empresa_acciones a ON a.empresa_id = e.id
       LEFT JOIN empresa_bolsa_solicitudes s ON s.id = a.solicitud_id
       ORDER BY e.nombre`
    )
    .all()) as (EmpresaAdminRow & { acciones_banco: number | null; precio_actual: number | null })[];

  for (const row of rows) {
    if (row.lanzada) await aplicarDerivaMercado(row.id);
  }

  const result: EmpresaAdminRow[] = [];
  for (const row of rows) {
    let precioActual = row.precio_actual;
    if (row.lanzada) {
      const fresh = await getAccionesEmpresa(row.id);
      precioActual = fresh?.precio_actual ?? precioActual;
    }
    result.push({
      ...row,
      precio_actual: precioActual,
      valor_comision_banco:
        row.lanzada && row.acciones_banco != null && precioActual != null ? row.acciones_banco * precioActual : null,
    });
  }
  return result;
}

export type { Db };
