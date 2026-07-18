export type FieldType = "text" | "textarea" | "number" | "date" | "select" | "ref";

export interface FieldConfig {
  name: string;
  label: string;
  type: FieldType;
  required?: boolean;
  options?: string[];
  refTable?: string; // for type "ref": table to pull options from
  refLabel?: string; // column to display for ref options
}

export interface ModuleConfig {
  slug: string;
  label: string;
  icon: string;
  table: string;
  titleField: string; // field used as the row title in lists
  fields: FieldConfig[];
}

export const MODULES: ModuleConfig[] = [
  {
    slug: "recibos",
    label: "Recibos",
    icon: "🧾",
    table: "recibos",
    titleField: "numero",
    fields: [
      { name: "numero", label: "Número", type: "text", required: true },
      { name: "cliente_id", label: "Cliente", type: "ref", refTable: "clientes", refLabel: "nombre" },
      { name: "fecha", label: "Fecha", type: "date", required: true },
      { name: "monto", label: "Monto", type: "number", required: true },
      { name: "estado", label: "Estado", type: "select", options: ["Borrador", "Enviado", "Pagado", "Vencido"] },
      { name: "notas", label: "Notas", type: "textarea" },
    ],
  },
  {
    slug: "pagos",
    label: "Pagos",
    icon: "💳",
    table: "pagos",
    titleField: "numero",
    fields: [
      { name: "numero", label: "Número", type: "text", required: true },
      { name: "cliente_id", label: "Cliente", type: "ref", refTable: "clientes", refLabel: "nombre" },
      { name: "fecha", label: "Fecha", type: "date", required: true },
      { name: "monto", label: "Monto", type: "number", required: true },
      { name: "metodo", label: "Método", type: "select", options: ["Efectivo", "Transferencia", "Tarjeta", "Cheque"] },
      { name: "referencia", label: "Referencia", type: "text" },
    ],
  },
  {
    slug: "clientes",
    label: "Clientes",
    icon: "🏢",
    table: "clientes",
    titleField: "nombre",
    fields: [
      { name: "nombre", label: "Nombre", type: "text", required: true },
      { name: "email", label: "Correo", type: "text" },
      { name: "telefono", label: "Teléfono", type: "text" },
      { name: "direccion", label: "Dirección", type: "text" },
      { name: "notas", label: "Notas", type: "textarea" },
    ],
  },
  {
    slug: "notas-de-credito",
    label: "Notas de crédito",
    icon: "✂️",
    table: "notas_credito",
    titleField: "numero",
    fields: [
      { name: "numero", label: "Número", type: "text", required: true },
      { name: "cliente_id", label: "Cliente", type: "ref", refTable: "clientes", refLabel: "nombre" },
      { name: "fecha", label: "Fecha", type: "date", required: true },
      { name: "monto", label: "Monto", type: "number", required: true },
      { name: "motivo", label: "Motivo", type: "textarea" },
    ],
  },
  {
    slug: "cargos-por-pago-atrasado",
    label: "Cargos por pago atrasado",
    icon: "🔔",
    table: "cargos_pago_atrasado",
    titleField: "descripcion",
    fields: [
      { name: "cliente_id", label: "Cliente", type: "ref", refTable: "clientes", refLabel: "nombre" },
      { name: "fecha", label: "Fecha", type: "date", required: true },
      { name: "monto", label: "Monto", type: "number", required: true },
      { name: "descripcion", label: "Descripción", type: "textarea" },
    ],
  },
  {
    slug: "notas-de-entrega",
    label: "Notas de entrega",
    icon: "🚚",
    table: "notas_entrega",
    titleField: "numero",
    fields: [
      { name: "numero", label: "Número", type: "text", required: true },
      { name: "cliente_id", label: "Cliente", type: "ref", refTable: "clientes", refLabel: "nombre" },
      { name: "fecha", label: "Fecha", type: "date", required: true },
      { name: "estado", label: "Estado", type: "select", options: ["Pendiente", "Entregado", "Cancelado"] },
      { name: "notas", label: "Notas", type: "textarea" },
    ],
  },
  {
    slug: "tiempo-facturable",
    label: "Tiempo facturable",
    icon: "⏱️",
    table: "tiempo_facturable",
    titleField: "descripcion",
    fields: [
      { name: "cliente_id", label: "Cliente", type: "ref", refTable: "clientes", refLabel: "nombre" },
      { name: "fecha", label: "Fecha", type: "date", required: true },
      { name: "horas", label: "Horas", type: "number", required: true },
      { name: "tarifa", label: "Tarifa", type: "number", required: true },
      { name: "descripcion", label: "Descripción", type: "textarea" },
    ],
  },
  {
    slug: "recibos-retencion-impuestos",
    label: "Recibos de retención de impuestos",
    icon: "📎",
    table: "recibos_retencion_impuestos",
    titleField: "numero",
    fields: [
      { name: "numero", label: "Número", type: "text", required: true },
      { name: "cliente_id", label: "Cliente", type: "ref", refTable: "clientes", refLabel: "nombre" },
      { name: "fecha", label: "Fecha", type: "date", required: true },
      { name: "monto", label: "Monto", type: "number", required: true },
      { name: "porcentaje", label: "Porcentaje", type: "number" },
    ],
  },
  {
    slug: "proveedores",
    label: "Proveedores",
    icon: "🏭",
    table: "proveedores",
    titleField: "nombre",
    fields: [
      { name: "nombre", label: "Nombre", type: "text", required: true },
      { name: "email", label: "Correo", type: "text" },
      { name: "telefono", label: "Teléfono", type: "text" },
      { name: "direccion", label: "Dirección", type: "text" },
      { name: "notas", label: "Notas", type: "textarea" },
    ],
  },
  {
    slug: "cotizaciones-de-compras",
    label: "Cotizaciones de Compras",
    icon: "📋",
    table: "cotizaciones_compras",
    titleField: "numero",
    fields: [
      { name: "numero", label: "Número", type: "text", required: true },
      { name: "proveedor_id", label: "Proveedor", type: "ref", refTable: "proveedores", refLabel: "nombre" },
      { name: "fecha", label: "Fecha", type: "date", required: true },
      { name: "monto", label: "Monto", type: "number", required: true },
      { name: "estado", label: "Estado", type: "select", options: ["Pendiente", "Aprobada", "Rechazada"] },
    ],
  },
  {
    slug: "notas-de-debito",
    label: "Notas de débito",
    icon: "✂️",
    table: "notas_debito",
    titleField: "numero",
    fields: [
      { name: "numero", label: "Número", type: "text", required: true },
      { name: "proveedor_id", label: "Proveedor", type: "ref", refTable: "proveedores", refLabel: "nombre" },
      { name: "fecha", label: "Fecha", type: "date", required: true },
      { name: "monto", label: "Monto", type: "number", required: true },
      { name: "motivo", label: "Motivo", type: "textarea" },
    ],
  },
  {
    slug: "recepcion-de-bienes",
    label: "Recepción de bienes",
    icon: "📥",
    table: "recepcion_bienes",
    titleField: "numero",
    fields: [
      { name: "numero", label: "Número", type: "text", required: true },
      { name: "proveedor_id", label: "Proveedor", type: "ref", refTable: "proveedores", refLabel: "nombre" },
      { name: "fecha", label: "Fecha", type: "date", required: true },
      { name: "estado", label: "Estado", type: "select", options: ["Pendiente", "Recibido", "Cancelado"] },
      { name: "notas", label: "Notas", type: "textarea" },
    ],
  },
  {
    slug: "transferencias-de-inventario",
    label: "Transferencias de Inventario",
    icon: "🔀",
    table: "transferencias_inventario",
    titleField: "articulo",
    fields: [
      { name: "fecha", label: "Fecha", type: "date", required: true },
      { name: "origen", label: "Origen", type: "text" },
      { name: "destino", label: "Destino", type: "text" },
      { name: "articulo", label: "Artículo", type: "text", required: true },
      { name: "cantidad", label: "Cantidad", type: "number", required: true },
    ],
  },
  {
    slug: "inversiones",
    label: "Inversiones",
    icon: "📊",
    table: "inversiones",
    titleField: "nombre",
    fields: [
      { name: "nombre", label: "Nombre", type: "text", required: true },
      { name: "fecha", label: "Fecha", type: "date", required: true },
      { name: "monto", label: "Monto", type: "number", required: true },
      { name: "tipo", label: "Tipo", type: "text" },
      { name: "rendimiento", label: "Rendimiento (%)", type: "number" },
    ],
  },
  {
    slug: "activos-intangibles",
    label: "Activos Intangibles",
    icon: "💠",
    table: "activos_intangibles",
    titleField: "nombre",
    fields: [
      { name: "nombre", label: "Nombre", type: "text", required: true },
      { name: "fecha_adquisicion", label: "Fecha de adquisición", type: "date", required: true },
      { name: "valor", label: "Valor", type: "number", required: true },
      { name: "amortizacion_anual", label: "Amortización anual", type: "number" },
    ],
  },
  {
    slug: "cuentas-de-capital",
    label: "Cuentas de capital",
    icon: "🏦",
    table: "cuentas_capital",
    titleField: "nombre",
    fields: [
      { name: "nombre", label: "Nombre", type: "text", required: true },
      { name: "fecha", label: "Fecha", type: "date", required: true },
      { name: "monto", label: "Monto", type: "number", required: true },
      { name: "tipo", label: "Tipo", type: "text" },
    ],
  },
  {
    slug: "cuentas-especiales",
    label: "Cuentas especiales",
    icon: "🔗",
    table: "cuentas_especiales",
    titleField: "nombre",
    fields: [
      { name: "nombre", label: "Nombre", type: "text", required: true },
      { name: "fecha", label: "Fecha", type: "date", required: true },
      { name: "monto", label: "Monto", type: "number", required: true },
      { name: "descripcion", label: "Descripción", type: "textarea" },
    ],
  },
  {
    slug: "asientos-de-diario",
    label: "Asientos de diario",
    icon: "⚖️",
    table: "asientos_diario",
    titleField: "cuenta",
    fields: [
      { name: "fecha", label: "Fecha", type: "date", required: true },
      { name: "cuenta", label: "Cuenta", type: "text", required: true },
      { name: "debe", label: "Debe", type: "number" },
      { name: "haber", label: "Haber", type: "number" },
      { name: "descripcion", label: "Descripción", type: "textarea" },
    ],
  },
];

export function getModule(slug: string): ModuleConfig | undefined {
  return MODULES.find((m) => m.slug === slug);
}

const VALID_TABLES = new Set(MODULES.map((m) => m.table));
export function isValidTable(table: string): boolean {
  return VALID_TABLES.has(table);
}
