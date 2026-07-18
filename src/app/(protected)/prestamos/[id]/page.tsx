import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { getPrestamo, listCuotas } from "@/lib/prestamos";
import { listMessages } from "@/lib/tickets";
import TicketChat from "@/components/TicketChat";
import AprobarPrestamoForm from "@/components/AprobarPrestamoForm";
import { rechazarPrestamoAction, reasignarPrestamoAction, marcarCuotaPagadaAction } from "@/lib/actions";

const ESTADO_COLOR: Record<string, string> = {
  Pendiente: "bg-yellow-100 text-yellow-800",
  Aprobado: "bg-blue-100 text-blue-800",
  Rechazado: "bg-red-100 text-red-800",
  Pagado: "bg-green-100 text-green-800",
};

export default async function StaffPrestamoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const prestamoId = Number(id);
  if (!Number.isFinite(prestamoId)) notFound();

  const user = await getCurrentUser();
  const prestamo = await getPrestamo(prestamoId);
  if (!prestamo || !user) notFound();

  const cuotas = await listCuotas(prestamoId);
  const mensajes = prestamo.ticket_id ? await listMessages(prestamo.ticket_id, 0) : [];

  const staff = (await getDb()
    .prepare(`SELECT id, username, role FROM users WHERE role IN ('admin','profesional') ORDER BY username`)
    .all()) as { id: number; username: string; role: string }[];

  const isPendiente = prestamo.estado === "Pendiente";

  return (
    <div>
      <div className="glass-card sticky top-0 z-10 mb-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl p-4">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-slate-100">
            {prestamo.cliente_username} — ${prestamo.monto_solicitado.toLocaleString("es")}
          </h1>
          <p className="text-sm text-gray-500 dark:text-slate-400">{prestamo.motivo}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className={`rounded-full px-3 py-1 text-xs font-medium ${ESTADO_COLOR[prestamo.estado]}`}>
            {prestamo.estado}
          </span>

          {isPendiente && (
            <>
              <AprobarPrestamoForm prestamoId={prestamoId} />
              <form action={rechazarPrestamoAction.bind(null, prestamoId)}>
                <button
                  type="submit"
                  className="rounded-full bg-red-600 px-4 py-1.5 text-sm font-semibold text-white transition hover:bg-red-700"
                >
                  ✕ Rechazar
                </button>
              </form>
            </>
          )}

          <form action={reasignarPrestamoAction.bind(null, prestamoId)} className="flex items-center gap-1">
            <select
              name="staffUserId"
              defaultValue={prestamo.asignado_a ?? ""}
              className="rounded-full border border-gray-300 bg-white/70 px-3 py-1.5 text-xs dark:border-slate-600 dark:bg-slate-800/70 dark:text-slate-100"
            >
              <option value="" disabled>
                Reasignar a…
              </option>
              {staff
                .filter((s) => s.id !== user.id)
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.username} ({s.role})
                  </option>
                ))}
            </select>
            <button
              type="submit"
              className="rounded-full border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-white/10"
            >
              Enviar
            </button>
          </form>
        </div>
      </div>

      {prestamo.estado === "Aprobado" || prestamo.estado === "Pagado" ? (
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <p className="text-xs text-gray-500 dark:text-slate-400">Monto a devolver</p>
            <p className="mt-1 text-xl font-semibold text-gray-900 dark:text-slate-100">
              ${prestamo.monto_a_devolver?.toLocaleString("es")}
            </p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <p className="text-xs text-gray-500 dark:text-slate-400">Tasa de interés</p>
            <p className="mt-1 text-xl font-semibold text-gray-900 dark:text-slate-100">
              {prestamo.tasa_interes}%
            </p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <p className="text-xs text-gray-500 dark:text-slate-400">Plazo</p>
            <p className="mt-1 text-xl font-semibold text-gray-900 dark:text-slate-100">
              {prestamo.plazo_valor} {prestamo.plazo_unidad}
            </p>
          </div>
        </div>
      ) : null}

      {cuotas.length > 0 && (
        <div className="mb-6 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <div className="border-b border-gray-100 px-5 py-3 dark:border-slate-700">
            <h2 className="text-sm font-semibold text-gray-800 dark:text-slate-100">Calendario de pagos</h2>
          </div>
          <table className="min-w-full divide-y divide-gray-100 text-sm dark:divide-slate-700">
            <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
              {cuotas.map((c) => (
                <tr key={c.id}>
                  <td className="px-5 py-3 text-gray-600 dark:text-slate-300">Cuota #{c.numero}</td>
                  <td className="px-5 py-3 text-gray-500 dark:text-slate-400">{c.fecha_vencimiento}</td>
                  <td className="px-5 py-3 text-right text-gray-700 dark:text-slate-200">
                    ${c.monto.toLocaleString("es")}
                  </td>
                  <td className="px-5 py-3 text-right">
                    {c.pagada ? (
                      <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                        Pagada
                      </span>
                    ) : (
                      <form action={marcarCuotaPagadaAction.bind(null, c.id, prestamoId)}>
                        <button type="submit" className="text-xs font-medium text-blue-600 hover:underline">
                          Marcar pagada
                        </button>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {prestamo.ticket_id && (
        <TicketChat
          ticketId={prestamo.ticket_id}
          currentUserId={user.id}
          initialMessages={mensajes}
          closed={false}
        />
      )}
    </div>
  );
}
