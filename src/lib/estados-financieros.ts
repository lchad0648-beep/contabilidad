import { getDb } from "./db";

export interface LineItem {
  label: string;
  monto: number | null; // null => sin dato ("-")
}

export interface Categoria {
  key: "activos" | "pasivos" | "patrimonio" | "ingresos" | "gastos";
  label: string;
  total: number;
  items: LineItem[];
}

export interface EstadosFinancieros {
  activos: Categoria;
  pasivos: Categoria;
  patrimonio: Categoria;
  ingresos: Categoria;
  gastos: Categoria;
}

/**
 * Vista simplificada de "estados financieros" construida a partir de los módulos
 * existentes (Recibos, Pagos, Cuentas de capital, Inversiones, etc). No es un balance
 * contable de partida doble certificado: es un resumen ejecutivo derivado de los datos
 * que ya se cargan en la app, pensado para que Admin y Profesional vean de un vistazo
 * la salud financiera del negocio desde el Resumen.
 */
export async function getEstadosFinancieros(): Promise<EstadosFinancieros> {
  const db = getDb();

  const one = async (sql: string): Promise<number> =>
    ((await db.prepare(sql).get()) as { s: number }).s;

  const saldosQuery = async (): Promise<{ por_cobrar: number; anticipos: number }> =>
    (await db
      .prepare(
        `WITH saldos AS (
           SELECT c.id,
             COALESCE((SELECT SUM(monto) FROM recibos WHERE cliente_id = c.id), 0)
             - COALESCE((SELECT SUM(monto) FROM pagos WHERE cliente_id = c.id), 0)
             - COALESCE((SELECT SUM(monto) FROM notas_credito WHERE cliente_id = c.id), 0) AS saldo
           FROM clientes c
         )
         SELECT
           COALESCE(SUM(CASE WHEN saldo > 0 THEN saldo ELSE 0 END), 0) as por_cobrar,
           COALESCE(SUM(CASE WHEN saldo < 0 THEN -saldo ELSE 0 END), 0) as anticipos
         FROM saldos`
      )
      .get()) as { por_cobrar: number; anticipos: number };

  // Saldo neto por cliente (facturado - pagado - notas de crédito), partido en
  // "por cobrar" (positivo, es un activo) y "anticipos de clientes" (negativo, es un pasivo).
  const [
    saldos,
    efectivo,
    inversionesMonto,
    activosIntangiblesValor,
    notasDebito,
    retenciones,
    cuentasCapital,
    cuentasEspeciales,
    facturacion,
    cargosPagoAtrasado,
    tiempoFacturable,
    rendimientoInversiones,
    comprasAprobadas,
    notasCredito,
    amortizacion,
  ] = await Promise.all([
    saldosQuery(),
    one(`SELECT COALESCE(SUM(monto), 0) as s FROM pagos`),
    one(`SELECT COALESCE(SUM(monto), 0) as s FROM inversiones`),
    one(`SELECT COALESCE(SUM(valor), 0) as s FROM activos_intangibles`),
    one(`SELECT COALESCE(SUM(monto), 0) as s FROM notas_debito`),
    one(`SELECT COALESCE(SUM(monto), 0) as s FROM recibos_retencion_impuestos`),
    one(`SELECT COALESCE(SUM(monto), 0) as s FROM cuentas_capital`),
    one(`SELECT COALESCE(SUM(monto), 0) as s FROM cuentas_especiales`),
    one(`SELECT COALESCE(SUM(monto), 0) as s FROM recibos`),
    one(`SELECT COALESCE(SUM(monto), 0) as s FROM cargos_pago_atrasado`),
    one(`SELECT COALESCE(SUM(horas * tarifa), 0) as s FROM tiempo_facturable`),
    one(`SELECT COALESCE(SUM(monto * COALESCE(rendimiento, 0) / 100.0), 0) as s FROM inversiones`),
    one(`SELECT COALESCE(SUM(monto), 0) as s FROM cotizaciones_compras WHERE estado = 'Aprobada'`),
    one(`SELECT COALESCE(SUM(monto), 0) as s FROM notas_credito`),
    one(`SELECT COALESCE(SUM(amortizacion_anual), 0) as s FROM activos_intangibles`),
  ]);

  const totalIngresos = facturacion + cargosPagoAtrasado + tiempoFacturable + rendimientoInversiones;
  const totalGastos = comprasAprobadas + notasCredito + amortizacion;
  const resultadoEjercicio = totalIngresos - totalGastos;

  const activosItems: LineItem[] = [
    { label: "Efectivo y equivalentes (pagos recibidos)", monto: efectivo || null },
    { label: "Cuentas por cobrar", monto: saldos.por_cobrar || null },
    { label: "Inversiones", monto: inversionesMonto || null },
    { label: "Activos intangibles", monto: activosIntangiblesValor || null },
  ];

  const pasivosItems: LineItem[] = [
    { label: "Cuentas por pagar (notas de débito)", monto: notasDebito || null },
    { label: "Anticipos de clientes", monto: saldos.anticipos || null },
    { label: "Retenciones de impuestos por pagar", monto: retenciones || null },
  ];

  const patrimonioItems: LineItem[] = [
    { label: "Cuentas de capital", monto: cuentasCapital || null },
    { label: "Cuentas especiales", monto: cuentasEspeciales || null },
    { label: "Resultado del ejercicio (Ingresos − Gastos)", monto: resultadoEjercicio },
  ];

  const ingresosItems: LineItem[] = [
    { label: "Facturación (recibos)", monto: facturacion || null },
    { label: "Cargos por pago atrasado", monto: cargosPagoAtrasado || null },
    { label: "Tiempo facturable", monto: tiempoFacturable || null },
    { label: "Rendimiento de inversiones", monto: rendimientoInversiones || null },
  ];

  const gastosItems: LineItem[] = [
    { label: "Compras a proveedores (cotizaciones aprobadas)", monto: comprasAprobadas || null },
    { label: "Notas de crédito emitidas", monto: notasCredito || null },
    { label: "Amortización de activos intangibles", monto: amortizacion || null },
  ];

  const sum = (items: LineItem[]) => items.reduce((acc, it) => acc + (it.monto ?? 0), 0);

  return {
    activos: { key: "activos", label: "Activos", items: activosItems, total: sum(activosItems) },
    pasivos: { key: "pasivos", label: "Pasivos", items: pasivosItems, total: sum(pasivosItems) },
    patrimonio: {
      key: "patrimonio",
      label: "Patrimonio",
      items: patrimonioItems,
      total: sum(patrimonioItems),
    },
    ingresos: { key: "ingresos", label: "Ingresos", items: ingresosItems, total: sum(ingresosItems) },
    gastos: { key: "gastos", label: "Menos Gastos", items: gastosItems, total: sum(gastosItems) },
  };
}
