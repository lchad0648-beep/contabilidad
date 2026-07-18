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
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            Préstamo — ${prestamo.monto_solicitado.toLocaleString("es")}
          </h1>
          <p className="text-sm text-slate-500">{prestamo.motivo}</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-medium ${ESTADO_COLOR[prestamo.estado]}`}>
          {prestamo.estado}
        </span>
      </div>

      {prestamo.estado === "Aprobado" || prestamo.estado === "Pagado" ? (
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs text-slate-500">Monto a devolver</p>
            <p className="mt-1 text-xl font-semibold text-slate-900">
              ${prestamo.monto_a_devolver?.toLocaleString("es")}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs text-slate-500">Tasa de interés</p>
            <p className="mt-1 text-xl font-semibold text-slate-900">{prestamo.tasa_interes}%</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs text-slate-500">Plazo</p>
            <p className="mt-1 text-xl font-semibold text-slate-900">
              {prestamo.plazo_valor} {prestamo.plazo_unidad}
            </p>
          </div>
        </div>
      ) : prestamo.estado === "Pendiente" ? (
        <div className="mb-6 rounded-xl border border-dashed border-yellow-300 bg-yellow-50 p-4 text-sm text-yellow-800">
          Tu solicitud está en revisión. Puedes usar el chat de abajo para agregar detalles.
        </div>
      ) : (
        <div className="mb-6 rounded-xl border border-dashed border-red-300 bg-red-50 p-4 text-sm text-red-800">
          Esta solicitud fue rechazada.
        </div>
      )}

      {cuotas.length > 0 && (
        <div className="mb-6 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-3">
            <h2 className="text-sm font-semibold text-slate-800">Calendario de pagos</h2>
          </div>
          <table className="min-w-full divide-y divide-slate-100 text-sm">
            <tbody className="divide-y divide-slate-100">
              {cuotas.map((c) => (
                <tr key={c.id}>
                  <td className="px-5 py-3 text-slate-600">Cuota #{c.numero}</td>
                  <td className="px-5 py-3 text-slate-500">{c.fecha_vencimiento}</td>
                  <td className="px-5 py-3 text-right text-slate-700">
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
