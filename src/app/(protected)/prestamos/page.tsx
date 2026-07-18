import Link from "next/link";
import { listPrestamosForStaff } from "@/lib/prestamos";
import LoanCalendar from "@/components/LoanCalendar";

const ESTADO_COLOR: Record<string, string> = {
  Pendiente: "bg-yellow-100 text-yellow-800",
  Aprobado: "bg-blue-100 text-blue-800",
  Rechazado: "bg-red-100 text-red-800",
  Pagado: "bg-green-100 text-green-800",
};

export default async function StaffPrestamosPage() {
  const prestamos = await listPrestamosForStaff();
  const now = new Date();

  return (
    <div className="animate-fade-in-up">
      <h1 className="mb-1 text-2xl font-semibold text-gray-900 dark:text-slate-100">💰 Préstamos</h1>
      <p className="mb-6 text-sm text-gray-500 dark:text-slate-400">
        Solicitudes de clientes y calendario de cobros esperados.
      </p>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_360px]">
        <div className="glass-card overflow-x-auto rounded-2xl">
          <table className="min-w-full divide-y divide-black/5 text-sm dark:divide-white/5">
            <thead className="bg-black/[0.02] dark:bg-white/[0.03]">
              <tr>
                <th className="px-4 py-2 text-left font-medium text-gray-600 dark:text-slate-300">
                  Cliente
                </th>
                <th className="px-4 py-2 text-right font-medium text-gray-600 dark:text-slate-300">
                  Solicitado
                </th>
                <th className="px-4 py-2 text-right font-medium text-gray-600 dark:text-slate-300">
                  A devolver
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
              {prestamos.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-gray-400 dark:text-slate-500">
                    No hay solicitudes de préstamo todavía.
                  </td>
                </tr>
              ) : (
                prestamos.map((p) => (
                  <tr key={p.id} className="transition hover:bg-black/[0.02] dark:hover:bg-white/[0.03]">
                    <td className="px-4 py-2">
                      <Link href={`/prestamos/${p.id}`} className="text-blue-600 hover:underline dark:text-blue-400">
                        {p.cliente_username}
                      </Link>
                    </td>
                    <td className="px-4 py-2 text-right text-gray-700 dark:text-slate-300">
                      ${p.monto_solicitado.toLocaleString("es")}
                    </td>
                    <td className="px-4 py-2 text-right text-gray-700 dark:text-slate-300">
                      {p.monto_a_devolver ? `$${p.monto_a_devolver.toLocaleString("es")}` : "—"}
                    </td>
                    <td className="px-4 py-2 text-gray-500 dark:text-slate-400">{p.asignado_username ?? "—"}</td>
                    <td className="px-4 py-2">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${ESTADO_COLOR[p.estado]}`}>
                        {p.estado}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-gray-500 dark:text-slate-400">{p.updated_at}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div>
          <LoanCalendar initialYear={now.getFullYear()} initialMonth={now.getMonth() + 1} />
        </div>
      </div>
    </div>
  );
}
