import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getModule } from "@/lib/modules";
import { listSolicitudes } from "@/lib/solicitudes-borrado";
import { aprobarSolicitudBorradoAction, rechazarSolicitudBorradoAction } from "@/lib/actions";

const ESTADO_COLOR: Record<string, string> = {
  Pendiente: "bg-yellow-100 text-yellow-800",
  Aprobada: "bg-green-100 text-green-800",
  Rechazada: "bg-red-100 text-red-800",
};

export default async function SolicitudesBorradoPage() {
  const me = await getCurrentUser();
  if (!me || me.role !== "admin") redirect("/");

  const solicitudes = await listSolicitudes();

  return (
    <div className="animate-fade-in-up">
      <h1 className="mb-1 text-2xl font-semibold text-gray-900 dark:text-slate-100">
        🗑️ Solicitudes de borrado
      </h1>
      <p className="mb-6 text-sm text-gray-500 dark:text-slate-400">
        Los profesionales no pueden eliminar registros directamente: piden tu aprobación aquí.
      </p>

      {solicitudes.length === 0 ? (
        <div className="glass-card rounded-2xl border-dashed p-10 text-center text-sm text-gray-500 dark:text-slate-400">
          No hay solicitudes de borrado todavía.
        </div>
      ) : (
        <div className="glass-card overflow-x-auto rounded-2xl">
          <table className="min-w-full divide-y divide-black/5 text-sm dark:divide-white/5">
            <thead className="bg-black/[0.02] dark:bg-white/[0.03]">
              <tr>
                <th className="px-4 py-2 text-left font-medium text-gray-600 dark:text-slate-300">Módulo</th>
                <th className="px-4 py-2 text-left font-medium text-gray-600 dark:text-slate-300">Registro</th>
                <th className="px-4 py-2 text-left font-medium text-gray-600 dark:text-slate-300">
                  Solicitado por
                </th>
                <th className="px-4 py-2 text-left font-medium text-gray-600 dark:text-slate-300">Motivo</th>
                <th className="px-4 py-2 text-left font-medium text-gray-600 dark:text-slate-300">Estado</th>
                <th className="px-4 py-2 text-right font-medium text-gray-600 dark:text-slate-300">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5 dark:divide-white/5">
              {solicitudes.map((s) => {
                const mod = getModule(s.modulo);
                return (
                  <tr key={s.id} className="transition hover:bg-black/[0.02] dark:hover:bg-white/[0.03]">
                    <td className="px-4 py-2 text-gray-700 dark:text-slate-300">
                      {mod ? `${mod.icon} ${mod.label}` : s.modulo}
                    </td>
                    <td className="px-4 py-2 text-gray-700 dark:text-slate-300">
                      {mod ? (
                        <a href={`/${mod.slug}/${s.registro_id}`} className="text-blue-600 hover:underline dark:text-blue-400">
                          {s.registro_descripcion ?? `#${s.registro_id}`}
                        </a>
                      ) : (
                        s.registro_descripcion ?? `#${s.registro_id}`
                      )}
                    </td>
                    <td className="px-4 py-2 text-gray-600 dark:text-slate-300">{s.solicitado_por_username}</td>
                    <td className="px-4 py-2 text-gray-500 dark:text-slate-400">{s.motivo ?? "—"}</td>
                    <td className="px-4 py-2">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${ESTADO_COLOR[s.estado]}`}>
                        {s.estado}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-right">
                      {s.estado === "Pendiente" ? (
                        <div className="flex justify-end gap-3">
                          <form action={aprobarSolicitudBorradoAction.bind(null, s.id)}>
                            <button type="submit" className="text-green-600 hover:underline dark:text-green-400">
                              Aprobar (elimina)
                            </button>
                          </form>
                          <form action={rechazarSolicitudBorradoAction.bind(null, s.id)}>
                            <button type="submit" className="text-red-600 hover:underline dark:text-red-400">
                              Rechazar
                            </button>
                          </form>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400 dark:text-slate-500">
                          {s.revisado_por_username ? `Revisado por ${s.revisado_por_username}` : "—"}
                        </span>
                      )}
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
