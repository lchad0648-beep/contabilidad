import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { listEmpresasEnBolsa, listTenenciasUsuario } from "@/lib/bolsa";
import Icon from "./Icon";

export default async function BolsaMercadoView({ basePath }: { basePath: string }) {
  const user = await getCurrentUser();
  if (!user) return null;

  const [empresas, tenencias] = await Promise.all([listEmpresasEnBolsa(), listTenenciasUsuario(user.id)]);

  const valorPortafolio = tenencias.reduce((acc, t) => acc + t.cantidad * t.precio_actual, 0);

  return (
    <div className="animate-fade-in-up">
      <h1 className="mb-1 flex items-center gap-2 text-2xl font-semibold text-gray-900 dark:text-slate-100">
        <Icon name="graph-up" size={22} /> Bolsa
      </h1>
      <p className="mb-6 text-sm text-gray-500 dark:text-slate-400">
        Compra y vende acciones de las empresas que salieron a bolsa.
      </p>

      {tenencias.length > 0 && (
        <div className="mb-6 glass-card rounded-2xl p-5">
          <p className="mb-3 text-xs text-gray-500 dark:text-slate-400">
            Tu portafolio · valor total{" "}
            <b className="text-gray-800 dark:text-slate-100">
              {valorPortafolio.toLocaleString("es", { style: "currency", currency: "USD" })}
            </b>
          </p>
          <div className="flex flex-wrap gap-2">
            {tenencias.map((t) => (
              <Link
                key={t.empresa_id}
                href={`${basePath}/${t.empresa_id}`}
                className="rounded-full bg-black/5 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-black/10 dark:bg-white/10 dark:text-slate-200 dark:hover:bg-white/15"
              >
                {t.empresa_nombre}: {t.cantidad.toLocaleString("es")} acc.
              </Link>
            ))}
          </div>
        </div>
      )}

      {empresas.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-black/10 bg-black/[0.02] p-10 text-center text-sm text-gray-500 dark:border-white/10 dark:bg-white/[0.02] dark:text-slate-400">
          <Icon name="graph-up" size={40} className="mx-auto mb-3 block opacity-25" />
          Todavía no hay empresas que coticen en bolsa.
        </div>
      ) : (
        <div className="glass-card overflow-x-auto rounded-2xl">
          <table className="min-w-full divide-y divide-black/5 text-sm dark:divide-white/5">
            <thead className="bg-black/[0.02] dark:bg-white/[0.03]">
              <tr>
                <th className="px-4 py-2 text-left font-medium text-gray-600 dark:text-slate-300">Empresa</th>
                <th className="px-4 py-2 text-right font-medium text-gray-600 dark:text-slate-300">Precio</th>
                <th className="px-4 py-2 text-right font-medium text-gray-600 dark:text-slate-300">
                  Variación 24h
                </th>
                <th className="px-4 py-2 text-right font-medium text-gray-600 dark:text-slate-300">
                  Disponibles
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5 dark:divide-white/5">
              {empresas.map((e) => {
                const variacion =
                  e.precio_apertura_dia > 0
                    ? ((e.precio_actual - e.precio_apertura_dia) / e.precio_apertura_dia) * 100
                    : 0;
                const positivo = variacion >= 0;
                return (
                  <tr key={e.empresa_id} className="transition hover:bg-black/[0.02] dark:hover:bg-white/[0.03]">
                    <td className="px-4 py-2">
                      <Link
                        href={`${basePath}/${e.empresa_id}`}
                        className="font-medium text-blue-600 hover:underline dark:text-blue-400"
                      >
                        {e.empresa_nombre}
                      </Link>
                    </td>
                    <td className="px-4 py-2 text-right font-medium text-gray-800 dark:text-slate-100">
                      {e.precio_actual.toLocaleString("es", { style: "currency", currency: "USD" })}
                    </td>
                    <td
                      className={`px-4 py-2 text-right font-medium ${
                        positivo ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
                      }`}
                    >
                      <span className="inline-flex items-center gap-1">
                        <Icon name={positivo ? "graph-up" : "chart-line"} size={14} />
                        {positivo ? "+" : ""}
                        {variacion.toFixed(2)}%
                      </span>
                    </td>
                    <td className="px-4 py-2 text-right text-gray-500 dark:text-slate-400">
                      {e.acciones_disponibles.toLocaleString("es")}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
