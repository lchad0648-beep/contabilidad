import { getDb } from "./db";

export interface MaterialRow {
  id: number;
  empresa_id: number;
  nombre: string;
  cantidad: number;
  tipo_precio: "unidad" | "stack64" | "stack_custom";
  stack_size: number;
  precio_por_stack: number;
  created_at: string;
}

export function precioUnitario(m: MaterialRow): number {
  return m.stack_size > 0 ? m.precio_por_stack / m.stack_size : 0;
}

export function totalMaterial(m: MaterialRow): number {
  return m.cantidad * precioUnitario(m);
}

export async function listMateriales(empresaId: number): Promise<MaterialRow[]> {
  const db = getDb();
  return (await db
    .prepare(`SELECT * FROM empresa_materiales WHERE empresa_id = ? ORDER BY nombre`)
    .all(empresaId)) as MaterialRow[];
}

export async function crearMaterial(
  empresaId: number,
  nombre: string,
  cantidad: number,
  tipoPrecio: "unidad" | "stack64" | "stack_custom",
  stackSizeInput: number | null,
  precioPorStack: number
): Promise<void> {
  const stackSize = tipoPrecio === "unidad" ? 1 : tipoPrecio === "stack64" ? 64 : Math.max(1, stackSizeInput || 1);
  const db = getDb();
  await db
    .prepare(
      `INSERT INTO empresa_materiales (empresa_id, nombre, cantidad, tipo_precio, stack_size, precio_por_stack)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(empresaId, nombre, cantidad, tipoPrecio, stackSize, precioPorStack);
}

export async function eliminarMaterial(empresaId: number, id: number): Promise<void> {
  const db = getDb();
  await db.prepare(`DELETE FROM empresa_materiales WHERE id = ? AND empresa_id = ?`).run(id, empresaId);
}
