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
    <div className="animate-fade-in-up">
      <h1 className="mb-1 text-2xl font-semibold text-gray-900 dark:text-slate-100">📈 Reportes</h1>
      <p className="mb-6 text-sm text-gray-500 dark:text-slate-400">
        Totales y conteos por módulo. Filtra por rango de fechas (aplica a los módulos con fecha).
      </p>

      <form className="glass-card mb-6 flex flex-wrap items-end gap-3 rounded-2xl p-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-slate-300">
            Desde
          </label>
          <input
            type="date"
            name="from"
            defaultValue={from ?? ""}
            className="rounded-lg border border-black/10 bg-white/60 px-3 py-1.5 text-sm text-gray-900 dark:border-white/10 dark:bg-white/5 dark:text-slate-100"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-slate-300">
            Hasta
          </label>
          <input
            type="date"
            name="to"
            defaultValue={to ?? ""}
            className="rounded-lg border border-black/10 bg-white/60 px-3 py-1.5 text-sm text-gray-900 dark:border-white/10 dark:bg-white/5 dark:text-slate-100"
          />
        </div>
        <button
          type="submit"
          className="glass-button-accent rounded-full px-4 py-2 text-sm font-medium text-white"
        >
          Filtrar
        </button>
        <a
          href={csvHref}
          className="rounded-full border border-black/10 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-black/5 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/10"
        >
          ⬇ Exportar CSV
        </a>
      </form>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="glass-card rounded-2xl p-4">
          <p className="text-xs text-gray-500 dark:text-slate-400">Total de registros</p>
          <p className="text-2xl font-semibold text-gray-900 dark:text-slate-100">{totalRegistros}</p>
        </div>
        <div className="glass-card rounded-2xl p-4">
          <p className="text-xs text-gray-500 dark:text-slate-400">
            Suma de montos (todos los módulos con monto)
          </p>
          <p className="text-2xl font-semibold text-gray-900 dark:text-slate-100">
            {totalMonto.toLocaleString("es", { style: "currency", currency: "USD" })}
          </p>
        </div>
      </div>

      <div className="glass-card overflow-x-auto rounded-2xl">
        <table className="min-w-full divide-y divide-black/5 text-sm dark:divide-white/5">
          <thead className="bg-black/[0.02] dark:bg-white/[0.03]">
            <tr>
              <th className="px-4 py-2 text-left font-medium text-gray-600 dark:text-slate-300">
                Módulo
              </th>
              <th className="px-4 py-2 text-right font-medium text-gray-600 dark:text-slate-300">
                Registros
              </th>
              <th className="px-4 py-2 text-right font-medium text-gray-600 dark:text-slate-300">
                Total
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/5 dark:divide-white/5">
            {rows.map((r) => (
              <tr key={r.slug} className="transition hover:bg-black/[0.02] dark:hover:bg-white/[0.03]">
                <td className="px-4 py-2 text-gray-700 dark:text-slate-300">
                  {r.icon} {r.label}
                </td>
                <td className="px-4 py-2 text-right text-gray-700 dark:text-slate-300">{r.count}</td>
                <td className="px-4 py-2 text-right text-gray-700 dark:text-slate-300">
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
