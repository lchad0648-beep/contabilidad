import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getTicket, listMessages } from "@/lib/tickets";
import TicketChat from "@/components/TicketChat";

const ESTADO_COLOR: Record<string, string> = {
  Abierto: "bg-yellow-100 text-yellow-800",
  "En progreso": "bg-blue-100 text-blue-800",
  Cerrado: "bg-gray-100 text-gray-600",
};

export default async function PortalTicketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ticketId = Number(id);
  if (!Number.isFinite(ticketId)) notFound();

  const user = await getCurrentUser();
  const ticket = await getTicket(ticketId);
  if (!ticket || !user || ticket.cliente_user_id !== user.id) notFound();

  const mensajes = await listMessages(ticketId, 0);

  return (
    <div className="animate-fade-in-up">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">{ticket.asunto}</h1>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${ESTADO_COLOR[ticket.estado]}`}>
          {ticket.estado}
        </span>
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
