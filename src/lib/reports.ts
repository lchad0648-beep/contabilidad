import { getDb } from "./db";
import { MODULES } from "./modules";

export interface ReportRow {
  slug: string;
  label: string;
  icon: string;
  count: number;
  total: number | null;
  dateFiltered: boolean;
}

const AMOUNT_FIELD_BY_TABLE: Record<string, string> = {
  recibos: "monto",
  pagos: "monto",
  notas_credito: "monto",
  notas_debito: "monto",
  cargos_pago_atrasado: "monto",
  recibos_retencion_impuestos: "monto",
  cotizaciones_compras: "monto",
  inversiones: "monto",
  activos_intangibles: "valor",
  cuentas_capital: "monto",
  cuentas_especiales: "monto",
};

export async function getReportRows(from?: string, to?: string): Promise<ReportRow[]> {
  const db = getDb();

  return Promise.all(
    MODULES.map(async (mod) => {
      const dateCol = mod.fields.some((f) => f.name === "fecha")
        ? "fecha"
        : mod.fields.some((f) => f.name === "fecha_adquisicion")
          ? "fecha_adquisicion"
          : null;
      const amountCol = AMOUNT_FIELD_BY_TABLE[mod.table] ?? null;

      let where = "";
      const bindParams: string[] = [];
      if (dateCol && from) {
        where += ` AND ${dateCol} >= ?`;
        bindParams.push(from);
      }
      if (dateCol && to) {
        where += ` AND ${dateCol} <= ?`;
        bindParams.push(to);
      }

      const countRow = (await db
        .prepare(`SELECT COUNT(*) as n FROM ${mod.table} WHERE 1=1 ${where}`)
        .get(...bindParams)) as { n: number };

      let total: number | null = null;
      if (amountCol) {
        const sumRow = (await db
          .prepare(`SELECT COALESCE(SUM(${amountCol}), 0) as s FROM ${mod.table} WHERE 1=1 ${where}`)
          .get(...bindParams)) as { s: number };
        total = sumRow.s;
      }

      return {
        slug: mod.slug,
        label: mod.label,
        icon: mod.icon,
        count: countRow.n,
        total,
        dateFiltered: Boolean(dateCol),
      };
    })
  );
}
