import { getReportRows } from "@/lib/reports";

export default async function ReportesPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const { from, to } = await searchParams;
  const rows = await getReportRows(from, to);

  const totalRegistros = rows.reduce((acc, r) => acc + r.count, 0);
  const totalMonto = rows.reduce((acc, r) => acc + (r.total ?? 0), 0);

  const csvHref = `/api/reports/csv${from || to ? `?${new URLSearchParams({ ...(from ? { from } : {}), ...(to ? { to } : {}) })}` : ""}`;

  return (
    <div>
      <h1 className="mb-1 text-2xl font-semibold text-gray-900">📈 Reportes</h1>
      <p className="mb-6 text-sm text-gray-500">
        Totales y conteos por módulo. Filtra por rango de fechas (aplica a los módulos con fecha).
      </p>

      <form className="mb-6 flex flex-wrap items-end gap-3 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">Desde</label>
          <input
            type="date"
            name="from"
            defaultValue={from ?? ""}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">Hasta</label>
          <input
            type="date"
            name="to"
            defaultValue={to ?? ""}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm"
          />
        </div>
        <button
          type="submit"
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Filtrar
        </button>
        <a
          href={csvHref}
          className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          ⬇ Exportar CSV
        </a>
      </form>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-gray-500">Total de registros</p>
          <p className="text-2xl font-semibold text-gray-900">{totalRegistros}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-gray-500">Suma de montos (todos los módulos con monto)</p>
          <p className="text-2xl font-semibold text-gray-900">
            {totalMonto.toLocaleString("es", { style: "currency", currency: "USD" })}
          </p>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left font-medium text-gray-600">Módulo</th>
              <th className="px-4 py-2 text-right font-medium text-gray-600">Registros</th>
              <th className="px-4 py-2 text-right font-medium text-gray-600">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((r) => (
              <tr key={r.slug} className="hover:bg-gray-50">
                <td className="px-4 py-2 text-gray-700">
                  {r.icon} {r.label}
                </td>
                <td className="px-4 py-2 text-right text-gray-700">{r.count}</td>
                <td className="px-4 py-2 text-right text-gray-700">
                  {r.total != null
                    ? r.total.toLocaleString("es", { style: "currency", currency: "USD" })
                    : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
