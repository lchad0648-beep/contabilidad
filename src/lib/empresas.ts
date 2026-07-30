import { getDb, withTransaction, type Db } from "./db";

export interface EmpresaRow {
  id: number;
  nombre: string;
  usuario: string;
  saldo: number;
  created_at: string;
}

export interface TransferenciaRow {
  id: number;
  empresa_id: number;
  tipo: "ingreso" | "egreso";
  monto: number;
  descripcion: string | null;
  created_at: string;
}

export async function getEmpresa(id: number): Promise<EmpresaRow | undefined> {
  const db = getDb();
  return (await db.prepare(`SELECT * FROM empresas WHERE id = ?`).get(id)) as EmpresaRow | undefined;
}

export async function listEmpresas(): Promise<EmpresaRow[]> {
  const db = getDb();
  return (await db.prepare(`SELECT * FROM empresas ORDER BY nombre`).all()) as EmpresaRow[];
}

export async function listTransferencias(empresaId: number, limit = 30): Promise<TransferenciaRow[]> {
  const db = getDb();
  return (await db
    .prepare(`SELECT * FROM empresa_transferencias WHERE empresa_id = ? ORDER BY created_at DESC LIMIT ?`)
    .all(empresaId, limit)) as TransferenciaRow[];
}

/**
 * Registra un movimiento de dinero y actualiza el saldo de la empresa en la
 * misma transacción. `monto` siempre se pasa en positivo; el signo lo decide
 * `tipo`.
 */
export async function registrarTransferenciaEmpresa(
  empresaId: number,
  tipo: "ingreso" | "egreso",
  monto: number,
  descripcion?: string,
  txDb?: Db
): Promise<void> {
  const delta = tipo === "ingreso" ? monto : -monto;
  const run = async (db: Db) => {
    await db
      .prepare(`INSERT INTO empresa_transferencias (empresa_id, tipo, monto, descripcion) VALUES (?, ?, ?, ?)`)
      .run(empresaId, tipo, monto, descripcion ?? null);
    await db.prepare(`UPDATE empresas SET saldo = saldo + ? WHERE id = ?`).run(delta, empresaId);
  };
  if (txDb) {
    await run(txDb);
  } else {
    await withTransaction(run);
  }
}

/** Serie de saldo acumulado en el tiempo, reconstruida a partir de las transferencias, para graficar rendimiento. */
export async function getSaldoHistorial(empresaId: number): Promise<{ date: Date; value: number }[]> {
  const db = getDb();
  const movimientos = (await db
    .prepare(
      `SELECT tipo, monto, created_at FROM empresa_transferencias WHERE empresa_id = ? ORDER BY created_at ASC`
    )
    .all(empresaId)) as { tipo: "ingreso" | "egreso"; monto: number; created_at: string }[];

  if (movimientos.length === 0) return [];

  let acumulado = 0;
  const puntos = movimientos.map((m) => {
    acumulado += m.tipo === "ingreso" ? m.monto : -m.monto;
    return { date: new Date(m.created_at + "Z"), value: acumulado };
  });
  return puntos;
}

/** Le paga el salario de un empleado, moviendo dinero de la empresa a la billetera del usuario. */
export async function pagarSalario(empresaId: number, empleadoId: number): Promise<{ ok: boolean; error?: string }> {
  return withTransaction(async (db) => {
    const empleado = (await db
      .prepare(`SELECT * FROM empresa_empleados WHERE id = ? AND empresa_id = ? AND estado = 'activo'`)
      .get(empleadoId, empresaId)) as { user_id: number; salario: number } | undefined;
    if (!empleado) return { ok: false, error: "Empleado no encontrado." };

    const empresa = (await db.prepare(`SELECT saldo FROM empresas WHERE id = ?`).get(empresaId)) as {
      saldo: number;
    };
    if (empresa.saldo < empleado.salario) {
      return { ok: false, error: "Saldo insuficiente para pagar el salario." };
    }

    await registrarTransferenciaEmpresa(empresaId, "egreso", empleado.salario, "Pago de salario", db);
    await db.prepare(`UPDATE users SET saldo = saldo + ? WHERE id = ?`).run(empleado.salario, empleado.user_id);
    await db
      .prepare(`UPDATE empresa_empleados SET gasto_total = gasto_total + ? WHERE id = ?`)
      .run(empleado.salario, empleadoId);
    return { ok: true };
  });
}
