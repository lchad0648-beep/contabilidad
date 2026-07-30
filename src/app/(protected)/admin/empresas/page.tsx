import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { listEmpresasConEstadoBolsa } from "@/lib/bolsa";
import Icon from "@/components/Icon";

export default async function AdminEmpresasPage() {
  const me = await getCurrentUser();
  if (!me || me.role !== "admin") redirect("/");

  const empresas = await listEmpresasConEstadoBolsa();
  const totalComisionBanco = empresas.reduce((acc, e) => acc + (e.valor_comision_banco ?? 0), 0);

  return (
    <div className="animate-fade-in-up">
      <h1 className="mb-1 flex items-center gap-2 text-2xl font-semibold text-gray-900 dark:text-slate-100">
        <Icon name="money-bag" size={22} /> Empresas
      </h1>
      <p className="mb-6 text-sm text-gray-500 dark:text-slate-400">{empresas.length} empresa(s) registradas</p>

      <div className="mb-6 glass-card rounded-2xl p-5">
        <p className="text-xs text-gray-500 dark:text-slate-400">Valor total de la comisión del banco</p>
        <p className="text-2xl font-semibold text-gray-900 dark:text-slate-100">
          {totalComisionBanco.toLocaleString("es", { style: "currency", currency: "USD" })}
        </p>
      </div>

      {empresas.length === 0 ? (
        <div className="glass-card rounded-2xl border-dashed p-10 text-center text-sm text-gray-500 dark:text-slate-400">
          <Icon name="money-bag" size={40} className="mx-auto mb-3 block opacity-25" />
          Todavía no hay empresas registradas.
        </div>
      ) : (
        <div className="glass-card overflow-x-auto rounded-2xl">
          <table className="min-w-full divide-y divide-black/5 text-sm dark:divide-white/5">
            <thead className="bg-black/[0.02] dark:bg-white/[0.03]">
              <tr>
                <th className="px-4 py-2 text-left font-medium text-gray-600 dark:text-slate-300">Empresa</th>
                <th className="px-4 py-2 text-left font-medium text-gray-600 dark:text-slate-300">
                  Salió a bolsa
                </th>
                <th className="px-4 py-2 text-right font-medium text-gray-600 dark:text-slate-300">
                  % del banco
                </th>
                <th className="px-4 py-2 text-right font-medium text-gray-600 dark:text-slate-300">
                  Valor comisión banco
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5 dark:divide-white/5">
              {empresas.map((e) => (
                <tr key={e.id} className="transition hover:bg-black/[0.02] dark:hover:bg-white/[0.03]">
                  <td className="px-4 py-2 font-medium text-gray-800 dark:text-slate-100">{e.nombre}</td>
                  <td className="px-4 py-2">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        e.lanzada ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {e.lanzada ? "Sí" : "No"}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right text-gray-700 dark:text-slate-300">
                    {e.comision_pct != null ? `${e.comision_pct}%` : "—"}
                  </td>
                  <td className="px-4 py-2 text-right font-semibold text-gray-900 dark:text-slate-100">
                    {e.valor_comision_banco != null
                      ? e.valor_comision_banco.toLocaleString("es", { style: "currency", currency: "USD" })
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
