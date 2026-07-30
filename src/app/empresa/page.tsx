import { getCurrentEmpresa } from "@/lib/empresa-auth";
import { listTransferencias, getSaldoHistorial } from "@/lib/empresas";
import PriceChart from "@/components/PriceChart";
import Icon from "@/components/Icon";

const TIPO_ICON = { ingreso: "money-bag", egreso: "credit-card" } as const;

export default async function EmpresaResumenPage() {
  const empresa = await getCurrentEmpresa();
  if (!empresa) return null;

  const [transferencias, historial] = await Promise.all([
    listTransferencias(empresa.id),
    getSaldoHistorial(empresa.id),
  ]);

  return (
    <div className="animate-fade-in-up">
      <h1 className="mb-1 text-2xl font-semibold text-gray-900 dark:text-slate-100">Resumen</h1>
      <p className="mb-6 text-sm text-gray-500 dark:text-slate-400">
        Vistazo general del dinero y rendimiento de {empresa.nombre}.
      </p>

      <div className="mb-6 glass-card rounded-2xl p-5">
        <p className="text-xs text-gray-500 dark:text-slate-400">Dinero actual</p>
        <p className="text-3xl font-semibold text-gray-900 dark:text-slate-100">
          {empresa.saldo.toLocaleString("es", { style: "currency", currency: "USD" })}
        </p>
      </div>

      <div className="mb-6 glass-card rounded-2xl p-5">
        <h2 className="mb-3 text-sm font-semibold text-gray-700 dark:text-slate-200">
          Rendimiento (saldo acumulado)
        </h2>
        <PriceChart data={historial} gradientId="empresa-rendimiento" />
      </div>

      <div className="glass-card overflow-hidden rounded-2xl">
        <h2 className="border-b border-black/5 px-5 py-3 text-sm font-semibold text-gray-700 dark:border-white/5 dark:text-slate-200">
          Transferencias recientes
        </h2>
        {transferencias.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-500 dark:text-slate-400">
            Todavía no hay movimientos de dinero.
          </div>
        ) : (
          <table className="min-w-full divide-y divide-black/5 text-sm dark:divide-white/5">
            <tbody className="divide-y divide-black/5 dark:divide-white/5">
              {transferencias.map((t) => (
                <tr key={t.id} className="transition hover:bg-black/[0.02] dark:hover:bg-white/[0.03]">
                  <td className="px-5 py-2.5">
                    <span
                      className={`flex items-center gap-2 ${
                        t.tipo === "ingreso"
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-red-600 dark:text-red-400"
                      }`}
                    >
                      <Icon name={TIPO_ICON[t.tipo]} size={16} />
                      {t.descripcion ?? (t.tipo === "ingreso" ? "Ingreso" : "Egreso")}
                    </span>
                  </td>
                  <td className="px-5 py-2.5 text-right font-medium text-gray-800 dark:text-slate-100">
                    {t.tipo === "ingreso" ? "+" : "-"}
                    {t.monto.toLocaleString("es", { style: "currency", currency: "USD" })}
                  </td>
                  <td className="px-5 py-2.5 text-right text-xs text-gray-400 dark:text-slate-500">
                    {new Date(t.created_at + "Z").toLocaleString("es")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
