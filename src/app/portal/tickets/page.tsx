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
    <div className="animate-fade-in-up">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Soporte</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">{tickets.length} ticket(s)</p>
        </div>
        <Link
          href="/portal/tickets/nuevo"
          className="glass-button-accent rounded-full px-4 py-2 text-sm font-medium text-white"
        >
          + Nuevo ticket
        </Link>
      </div>

      {tickets.length === 0 ? (
        <div className="glass-card rounded-2xl border-dashed p-10 text-center text-sm text-slate-500 dark:text-slate-400">
          No has abierto ningún ticket todavía.
        </div>
      ) : (
        <div className="space-y-3">
          {tickets.map((t) => (
            <Link
              key={t.id}
              href={`/portal/tickets/${t.id}`}
              className="glass-card flex items-center justify-between rounded-2xl p-4 transition hover:-translate-y-0.5 hover:shadow-lg"
            >
              <div>
                <p className="font-medium text-slate-800 dark:text-slate-100">{t.asunto}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Actualizado: {t.updated_at}</p>
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
