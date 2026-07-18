import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { listTicketsForClient } from "@/lib/tickets";

const ESTADO_COLOR: Record<string, string> = {
  Abierto: "bg-yellow-100 text-yellow-800",
  "En progreso": "bg-blue-100 text-blue-800",
  Cerrado: "bg-gray-100 text-gray-600",
};

export default async function PortalTicketsPage() {
  const user = await getCurrentUser();
  const tickets = user ? await listTicketsForClient(user.id) : [];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Soporte</h1>
          <p className="text-sm text-slate-500">{tickets.length} ticket(s)</p>
        </div>
        <Link
          href="/portal/tickets/nuevo"
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          + Nuevo ticket
        </Link>
      </div>

      {tickets.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">
          No has abierto ningún ticket todavía.
        </div>
      ) : (
        <div className="space-y-3">
          {tickets.map((t) => (
            <Link
              key={t.id}
              href={`/portal/tickets/${t.id}`}
              className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:border-blue-300 hover:shadow"
            >
              <div>
                <p className="font-medium text-slate-800">{t.asunto}</p>
                <p className="text-xs text-slate-500">Actualizado: {t.updated_at}</p>
              </div>
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${ESTADO_COLOR[t.estado]}`}>
                {t.estado}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
