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

export type ModuleCategory = "ventas" | "compras" | "inventario" | "finanzas";

const CATEGORY_STYLES: Record<ModuleCategory, { text: string; bg: string }> = {
  ventas: { text: "text-blue-600 dark:text-blue-400", bg: "bg-blue-500/15" },
  compras: { text: "text-amber-600 dark:text-amber-400", bg: "bg-amber-500/15" },
  inventario: { text: "text-teal-600 dark:text-teal-400", bg: "bg-teal-500/15" },
  finanzas: { text: "text-violet-600 dark:text-violet-400", bg: "bg-violet-500/15" },
};

export function categoryTextClass(category: ModuleCategory): string {
  return CATEGORY_STYLES[category].text;
}

export function categoryBgClass(category: ModuleCategory): string {
  return CATEGORY_STYLES[category].bg;
}

export interface ModuleConfig {
  slug: string;
  label: string;
  icon: string;
  category: ModuleCategory;
  table: string;
  titleField: string; // field used as the row title in lists
  fields: FieldConfig[];
}

export const MODULES: ModuleConfig[] = [
  {
    slug: "recibos",
    label: "Recibos",
    icon: "receipt",
    category: "ventas",
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
    icon: "credit-card",
    category: "ventas",
    table: "pagos",
    titleField: "numero",
    fields: [
      { name: "cliente_id", label: "Cliente", type: "ref", refTable: "clientes", refLabel: "nombre" },
      { name: "fecha", label: "Fecha", type: "date", required: true },
      { name: "monto", label: "Monto", type: "number", required: true },
      { name: "referencia", label: "Referencia", type: "text" },
    ],
  },
  {
    slug: "clientes",
    label: "Clientes",
    icon: "building",
    category: "ventas",
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
    icon: "receipt-discount",
    category: "ventas",
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
    icon: "bell",
    category: "ventas",
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
    icon: "truck",
    category: "ventas",
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
    icon: "clock",
    category: "ventas",
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
    icon: "paperclip",
    category: "ventas",
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
    icon: "building2",
    category: "compras",
    table: "proveedores",
    titleField: "nombre",
    fields: [
      { name: "nombre", label: "Nombre", type: "text", required: true },
      { name: "notas", label: "Notas", type: "textarea" },
    ],
  },
  {
    slug: "cotizaciones-de-compras",
    label: "Cotizaciones de Compras",
    icon: "clipboard-text",
    category: "compras",
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
    icon: "receipt-minus",
    category: "compras",
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
    icon: "inbox-in",
    category: "compras",
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
    icon: "shuffle",
    category: "inventario",
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
    icon: "chart-bar",
    category: "finanzas",
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
    icon: "diamonds",
    category: "finanzas",
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
    icon: "bank",
    category: "finanzas",
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
    icon: "link",
    category: "finanzas",
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
    icon: "scale",
    category: "finanzas",
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
