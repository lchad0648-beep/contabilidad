import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { listSolicitudesBolsaPendientes } from "@/lib/bolsa";
import Icon from "@/components/Icon";

export default async function BolsaSolicitudesPage() {
  const me = await getCurrentUser();
  if (!me || me.role === "cliente") redirect("/");

  const solicitudes = await listSolicitudesBolsaPendientes();

  return (
    <div className="animate-fade-in-up">
      <h1 className="mb-1 flex items-center gap-2 text-2xl font-semibold text-gray-900 dark:text-slate-100">
        <Icon name="lock" size={22} /> Solicitudes de bolsa
      </h1>
      <p className="mb-6 text-sm text-gray-500 dark:text-slate-400">
        Empresas esperando revisión para salir a bolsa.
      </p>

      {solicitudes.length === 0 ? (
        <div className="glass-card rounded-2xl border-dashed p-10 text-center text-sm text-gray-500 dark:text-slate-400">
          <Icon name="lock" size={40} className="mx-auto mb-3 block opacity-25" />
          No hay solicitudes pendientes.
        </div>
      ) : (
        <div className="glass-card overflow-x-auto rounded-2xl">
          <table className="min-w-full divide-y divide-black/5 text-sm dark:divide-white/5">
            <thead className="bg-black/[0.02] dark:bg-white/[0.03]">
              <tr>
                <th className="px-4 py-2 text-left font-medium text-gray-600 dark:text-slate-300">Empresa</th>
                <th className="px-4 py-2 text-left font-medium text-gray-600 dark:text-slate-300">Mensaje</th>
                <th className="px-4 py-2 text-left font-medium text-gray-600 dark:text-slate-300">Fecha</th>
                <th className="px-4 py-2 text-right font-medium text-gray-600 dark:text-slate-300">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5 dark:divide-white/5">
              {solicitudes.map((s) => (
                <tr key={s.id} className="transition hover:bg-black/[0.02] dark:hover:bg-white/[0.03]">
                  <td className="px-4 py-2 font-medium text-gray-800 dark:text-slate-100">{s.empresa_nombre}</td>
                  <td className="max-w-xs truncate px-4 py-2 text-gray-500 dark:text-slate-400">
                    {s.mensaje_inicial ?? "—"}
                  </td>
                  <td className="px-4 py-2 text-xs text-gray-400 dark:text-slate-500">
                    {new Date(s.created_at + "Z").toLocaleString("es")}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <Link
                      href={`/admin/bolsa-solicitudes/${s.id}`}
                      className="text-blue-600 hover:underline dark:text-blue-400"
                    >
                      Revisar
                    </Link>
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
