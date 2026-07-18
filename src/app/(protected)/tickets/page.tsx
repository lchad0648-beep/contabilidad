import Link from "next/link";
import { listTicketsForStaff } from "@/lib/tickets";

const ESTADO_COLOR: Record<string, string> = {
  Abierto: "bg-yellow-100 text-yellow-800",
  "En progreso": "bg-blue-100 text-blue-800",
  Cerrado: "bg-gray-100 text-gray-600",
};

export default async function StaffTicketsPage() {
  const tickets = await listTicketsForStaff();

  return (
    <div className="animate-fade-in-up">
      <h1 className="mb-1 text-2xl font-semibold text-gray-900 dark:text-slate-100">
        💬 Tickets de soporte
      </h1>
      <p className="mb-6 text-sm text-gray-500 dark:text-slate-400">
        Consultas abiertas por los clientes.
      </p>

      {tickets.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-black/10 bg-black/[0.02] p-10 text-center text-sm text-gray-500 dark:border-white/10 dark:bg-white/[0.02] dark:text-slate-400">
          No hay tickets todavía.
        </div>
      ) : (
        <div className="glass-card overflow-x-auto rounded-2xl">
          <table className="min-w-full divide-y divide-black/5 text-sm dark:divide-white/5">
            <thead className="bg-black/[0.02] dark:bg-white/[0.03]">
              <tr>
                <th className="px-4 py-2 text-left font-medium text-gray-600 dark:text-slate-300">
                  Asunto
                </th>
                <th className="px-4 py-2 text-left font-medium text-gray-600 dark:text-slate-300">
                  Cliente
                </th>
                <th className="px-4 py-2 text-left font-medium text-gray-600 dark:text-slate-300">
                  Asignado a
                </th>
                <th className="px-4 py-2 text-left font-medium text-gray-600 dark:text-slate-300">
                  Estado
                </th>
                <th className="px-4 py-2 text-left font-medium text-gray-600 dark:text-slate-300">
                  Actualizado
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5 dark:divide-white/5">
              {tickets.map((t) => (
                <tr key={t.id} className="transition hover:bg-black/[0.02] dark:hover:bg-white/[0.03]">
                  <td className="px-4 py-2">
                    <Link href={`/tickets/${t.id}`} className="text-blue-600 hover:underline dark:text-blue-400">
                      {t.asunto}
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-gray-700 dark:text-slate-300">{t.cliente_username}</td>
                  <td className="px-4 py-2 text-gray-500 dark:text-slate-400">{t.asignado_username ?? "—"}</td>
                  <td className="px-4 py-2">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${ESTADO_COLOR[t.estado]}`}>
                      {t.estado}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-gray-500 dark:text-slate-400">{t.updated_at}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
