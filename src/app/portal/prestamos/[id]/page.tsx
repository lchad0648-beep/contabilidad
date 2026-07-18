import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getPrestamo, listCuotas } from "@/lib/prestamos";
import { listMessages } from "@/lib/tickets";
import TicketChat from "@/components/TicketChat";

const ESTADO_COLOR: Record<string, string> = {
  Pendiente: "bg-yellow-100 text-yellow-800",
  Aprobado: "bg-blue-100 text-blue-800",
  Rechazado: "bg-red-100 text-red-800",
  Pagado: "bg-green-100 text-green-800",
};

export default async function PortalPrestamoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const prestamoId = Number(id);
  if (!Number.isFinite(prestamoId)) notFound();

  const user = await getCurrentUser();
  const prestamo = await getPrestamo(prestamoId);
  if (!prestamo || !user || prestamo.cliente_user_id !== user.id) notFound();

  const cuotas = await listCuotas(prestamoId);
  const mensajes = prestamo.ticket_id ? await listMessages(prestamo.ticket_id, 0) : [];

  return (
    <div className="animate-fade-in-up">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
            Préstamo — ${prestamo.monto_solicitado.toLocaleString("es")}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">{prestamo.motivo}</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-medium ${ESTADO_COLOR[prestamo.estado]}`}>
          {prestamo.estado}
        </span>
      </div>

      {prestamo.estado === "Aprobado" || prestamo.estado === "Pagado" ? (
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="glass-card rounded-2xl p-4">
            <p className="text-xs text-slate-500 dark:text-slate-400">Monto a devolver</p>
            <p className="mt-1 text-xl font-semibold text-slate-900 dark:text-slate-100">
              ${prestamo.monto_a_devolver?.toLocaleString("es")}
            </p>
          </div>
          <div className="glass-card rounded-2xl p-4">
            <p className="text-xs text-slate-500 dark:text-slate-400">Tasa de interés</p>
            <p className="mt-1 text-xl font-semibold text-slate-900 dark:text-slate-100">
              {prestamo.tasa_interes}%
            </p>
          </div>
          <div className="glass-card rounded-2xl p-4">
            <p className="text-xs text-slate-500 dark:text-slate-400">Plazo</p>
            <p className="mt-1 text-xl font-semibold text-slate-900 dark:text-slate-100">
              {prestamo.plazo_valor} {prestamo.plazo_unidad}
            </p>
          </div>
        </div>
      ) : prestamo.estado === "Pendiente" ? (
        <div className="mb-6 rounded-2xl border border-dashed border-yellow-400/50 bg-yellow-500/10 p-4 text-sm text-yellow-800 dark:text-yellow-300">
          Tu solicitud está en revisión. Puedes usar el chat de abajo para agregar detalles.
        </div>
      ) : (
        <div className="mb-6 rounded-2xl border border-dashed border-red-400/50 bg-red-500/10 p-4 text-sm text-red-800 dark:text-red-300">
          Esta solicitud fue rechazada.
        </div>
      )}

      {cuotas.length > 0 && (
        <div className="glass-card mb-6 overflow-hidden rounded-2xl">
          <div className="border-b border-black/5 px-5 py-3 dark:border-white/5">
            <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Calendario de pagos</h2>
          </div>
          <table className="min-w-full divide-y divide-black/5 text-sm dark:divide-white/5">
            <tbody className="divide-y divide-black/5 dark:divide-white/5">
              {cuotas.map((c) => (
                <tr key={c.id}>
                  <td className="px-5 py-3 text-slate-600 dark:text-slate-300">Cuota #{c.numero}</td>
                  <td className="px-5 py-3 text-slate-500 dark:text-slate-400">{c.fecha_vencimiento}</td>
                  <td className="px-5 py-3 text-right text-slate-700 dark:text-slate-200">
                    ${c.monto.toLocaleString("es")}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        c.pagada ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {c.pagada ? "Pagada" : "Pendiente"}
                    </span>
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
