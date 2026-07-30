import Link from "next/link";
import { getCurrentEmpresa } from "@/lib/empresa-auth";
import { listEmpleados } from "@/lib/empresa-empleados";
import EmpresaContratarForm from "@/components/EmpresaContratarForm";
import Icon from "@/components/Icon";

export default async function EmpleadosPage() {
  const empresa = await getCurrentEmpresa();
  if (!empresa) return null;

  const empleados = await listEmpleados(empresa.id);

  return (
    <div className="animate-fade-in-up">
      <h1 className="mb-1 flex items-center gap-2 text-2xl font-semibold text-gray-900 dark:text-slate-100">
        <Icon name="users" size={22} /> Empleados
      </h1>
      <p className="mb-6 text-sm text-gray-500 dark:text-slate-400">{empleados.length} empleado(s) en total</p>

      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {empleados.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-black/10 bg-black/[0.02] p-10 text-center text-sm text-gray-500 dark:border-white/10 dark:bg-white/[0.02] dark:text-slate-400">
              <Icon name="users" size={40} className="mx-auto mb-3 block opacity-25" />
              Todavía no has contratado a nadie.
            </div>
          ) : (
            <div className="glass-card overflow-x-auto rounded-2xl">
              <table className="min-w-full divide-y divide-black/5 text-sm dark:divide-white/5">
                <thead className="bg-black/[0.02] dark:bg-white/[0.03]">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium text-gray-600 dark:text-slate-300">Usuario</th>
                    <th className="px-4 py-2 text-right font-medium text-gray-600 dark:text-slate-300">Salario</th>
                    <th className="px-4 py-2 text-right font-medium text-gray-600 dark:text-slate-300">
                      Gasto total
                    </th>
                    <th className="px-4 py-2 text-left font-medium text-gray-600 dark:text-slate-300">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5 dark:divide-white/5">
                  {empleados.map((e) => (
                    <tr key={e.id} className="transition hover:bg-black/[0.02] dark:hover:bg-white/[0.03]">
                      <td className="px-4 py-2">
                        <Link
                          href={`/empresa/empleados/${e.id}`}
                          className="font-medium text-blue-600 hover:underline dark:text-blue-400"
                        >
                          {e.username}
                        </Link>
                      </td>
                      <td className="px-4 py-2 text-right text-gray-700 dark:text-slate-300">
                        {e.salario.toLocaleString("es", { style: "currency", currency: "USD" })}
                      </td>
                      <td className="px-4 py-2 text-right text-gray-700 dark:text-slate-300">
                        {e.gasto_total.toLocaleString("es", { style: "currency", currency: "USD" })}
                      </td>
                      <td className="px-4 py-2">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            e.estado === "activo"
                              ? "bg-green-100 text-green-800"
                              : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {e.estado === "activo" ? "Activo" : "Despedido"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <EmpresaContratarForm />
      </div>
    </div>
  );
}
