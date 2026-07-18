import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getTicket, listMessages } from "@/lib/tickets";
import TicketChat from "@/components/TicketChat";
import { setTicketEstadoAction, assignTicketToMeAction } from "@/lib/actions";

const ESTADOS = ["Abierto", "En progreso", "Cerrado"] as const;

export default async function StaffTicketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ticketId = Number(id);
  if (!Number.isFinite(ticketId)) notFound();

  const user = await getCurrentUser();
  const ticket = await getTicket(ticketId);
  if (!ticket || !user) notFound();

  const mensajes = await listMessages(ticketId, 0);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">{ticket.asunto}</h1>
          <p className="text-sm text-gray-500">
            Cliente: {ticket.cliente_username} · Asignado a: {ticket.asignado_username ?? "sin asignar"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {ticket.asignado_a !== user.id && (
            <form action={assignTicketToMeAction.bind(null, ticketId)}>
              <button
                type="submit"
                className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
              >
                Asignarme
              </button>
            </form>
          )}
          {ESTADOS.map((estado) => (
            <form key={estado} action={setTicketEstadoAction.bind(null, ticketId, estado)}>
              <button
                type="submit"
                disabled={ticket.estado === estado}
                className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                  ticket.estado === estado
                    ? "bg-gray-200 text-gray-500"
                    : "bg-blue-600 text-white hover:bg-blue-700"
                }`}
              >
                {estado}
              </button>
            </form>
          ))}
        </div>
      </div>

      <TicketChat
        ticketId={ticketId}
        currentUserId={user.id}
        initialMessages={mensajes}
        closed={ticket.estado === "Cerrado"}
      />
    </div>
  );
}
