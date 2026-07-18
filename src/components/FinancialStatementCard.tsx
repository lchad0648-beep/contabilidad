import { Categoria } from "@/lib/estados-financieros";

function formatMonto(monto: number | null) {
  if (monto == null) return "-";
  return monto.toLocaleString("es", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function FinancialStatementCard({ categoria }: { categoria: Categoria }) {
  const isGastos = categoria.key === "gastos";

  return (
    <div className="glass-card overflow-hidden rounded-2xl">
      <div className="flex items-center justify-between bg-amber-500/10 px-5 py-4 dark:bg-amber-400/10">
        <h3 className="text-base font-semibold text-gray-900 dark:text-slate-100">
          {isGastos ? (
            <>
              <span className="underline">Menos</span> Gastos
            </>
          ) : (
            categoria.label
          )}
        </h3>
        <span className="text-base font-semibold text-gray-900 dark:text-slate-100">
          {categoria.total.toLocaleString("es", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      </div>
      <div className="divide-y divide-black/5 dark:divide-white/5">
        {categoria.items.map((item) => (
          <div key={item.label} className="flex items-center justify-between gap-4 px-5 py-3 text-sm">
            <span className="text-gray-700 dark:text-slate-300">{item.label}</span>
            <span
              className={
                item.monto == null
                  ? "text-blue-400/60 dark:text-blue-300/50"
                  : "font-medium text-blue-600 dark:text-blue-300"
              }
            >
              {formatMonto(item.monto)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
