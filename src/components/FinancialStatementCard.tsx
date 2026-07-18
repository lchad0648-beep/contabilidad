import { Categoria } from "@/lib/estados-financieros";

function formatMonto(monto: number | null) {
  if (monto == null) return "-";
  return monto.toLocaleString("es", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function FinancialStatementCard({ categoria }: { categoria: Categoria }) {
  const isGastos = categoria.key === "gastos";

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="flex items-center justify-between bg-amber-50/70 px-5 py-4">
        <h3 className="text-base font-semibold text-gray-900">
          {isGastos ? (
            <>
              <span className="underline">Menos</span> Gastos
            </>
          ) : (
            categoria.label
          )}
        </h3>
        <span className="text-base font-semibold text-gray-900">
          {categoria.total.toLocaleString("es", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      </div>
      <div className="divide-y divide-gray-100">
        {categoria.items.map((item) => (
          <div key={item.label} className="flex items-center justify-between gap-4 px-5 py-3 text-sm">
            <span className="text-gray-700">{item.label}</span>
            <span className={item.monto == null ? "text-blue-300" : "font-medium text-blue-600"}>
              {formatMonto(item.monto)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
