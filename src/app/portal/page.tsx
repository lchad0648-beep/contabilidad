import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";

const ESTADO_COLOR: Record<string, string> = {
  Borrador: "bg-gray-100 text-gray-600",
  Enviado: "bg-blue-100 text-blue-800",
  Pagado: "bg-green-100 text-green-800",
  Vencido: "bg-red-100 text-red-800",
};

export default async function PortalDashboard() {
  const user = await getCurrentUser();
  const db = getDb();
  const clienteId = user?.cliente_id ?? null;

  if (!clienteId) {
    return (
      <div className="glass-card rounded-2xl border-dashed p-8 text-center text-sm text-slate-500 dark:text-slate-400">
        Tu cuenta todavía no está vinculada a un registro de cliente. Contacta a soporte.
      </div>
    );
  }

  const [facturadoRow, pagadoRow, recibosRecientes, ticketsRow] = await Promise.all([
    db.prepare(`SELECT COALESCE(SUM(monto), 0) as s FROM recibos WHERE cliente_id = ?`).get(clienteId) as Promise<{
      s: number;
    }>,
    db.prepare(`SELECT COALESCE(SUM(monto), 0) as s FROM pagos WHERE cliente_id = ?`).get(clienteId) as Promise<{
      s: number;
    }>,
    db
      .prepare(`SELECT * FROM recibos WHERE cliente_id = ? ORDER BY fecha DESC, id DESC LIMIT 5`)
      .all(clienteId) as Promise<
      { id: number; numero: string; fecha: string; monto: number; estado: string }[]
    >,
    db
      .prepare(`SELECT COUNT(*) as n FROM tickets WHERE cliente_user_id = ? AND estado != 'Cerrado'`)
      .get(user!.id) as Promise<{ n: number }>,
  ]);

  const totalFacturado = facturadoRow.s;
  const totalPagado = pagadoRow.s;
  // saldo > 0: el cliente debe dinero (facturado sin pagar).
  // saldo < 0: el cliente pagó de más / por adelantado (a favor).
  const saldo = totalFacturado - totalPagado;
  const saldoLabel = saldo > 0 ? "Saldo pendiente" : saldo < 0 ? "Saldo a favor" : "Saldo";
  const saldoColor = saldo > 0 ? "text-red-600" : saldo < 0 ? "text-green-600" : "text-slate-700 dark:text-slate-200";
  const ticketsAbiertos = ticketsRow.n;

  return (
    <div className="animate-fade-in-up">
      <h1 className="mb-1 text-2xl font-semibold text-slate-900 dark:text-slate-100">
        Hola, {user?.username} 👋
      </h1>
      <p className="mb-6 text-sm text-slate-500 dark:text-slate-400">Este es el resumen de tu cuenta.</p>

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="glass-card rounded-2xl p-5">
          <p className="text-xs text-slate-500 dark:text-slate-400">Total facturado</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900 dark:text-slate-100">
            {totalFacturado.toLocaleString("es", { style: "currency", currency: "USD" })}
          </p>
        </div>
        <div className="glass-card rounded-2xl p-5">
          <p className="text-xs text-slate-500 dark:text-slate-400">Total pagado</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900 dark:text-slate-100">
            {totalPagado.toLocaleString("es", { style: "currency", currency: "USD" })}
          </p>
        </div>
        <div className="glass-card rounded-2xl p-5">
          <p className="text-xs text-slate-500 dark:text-slate-400">{saldoLabel}</p>
          <p className={`mt-1 text-2xl font-semibold ${saldoColor}`}>
            {Math.abs(saldo).toLocaleString("es", { style: "currency", currency: "USD" })}
          </p>
          {saldo < 0 && (
            <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">Pagaste más de lo facturado.</p>
          )}
        </div>
      </div>

      <div className="mb-8 flex flex-wrap gap-3">
        <Link
          href="/portal/tickets/nuevo"
          className="glass-button-accent rounded-full px-4 py-2 text-sm font-medium text-white"
        >
          💬 Abrir un ticket de soporte
        </Link>
        <Link
          href="/portal/tickets"
          className="rounded-full border border-black/10 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-black/5 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/10"
        >
          Ver mis tickets {ticketsAbiertos > 0 && `(${ticketsAbiertos} abiertos)`}
        </Link>
      </div>

      <div className="glass-card rounded-2xl">
        <div className="flex items-center justify-between border-b border-black/5 px-5 py-3 dark:border-white/5">
          <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Facturas recientes</h2>
          <Link href="/portal/recibos" className="text-sm text-blue-600 hover:underline dark:text-blue-400">
            Ver todas
          </Link>
        </div>
        {recibosRecientes.length === 0 ? (
          <p className="px-5 py-6 text-center text-sm text-slate-400 dark:text-slate-500">
            Aún no tienes facturas.
          </p>
        ) : (
          <table className="min-w-full divide-y divide-black/5 text-sm dark:divide-white/5">
            <tbody className="divide-y divide-black/5 dark:divide-white/5">
              {recibosRecientes.map((r) => (
                <tr key={r.id}>
                  <td className="px-5 py-3 text-slate-700 dark:text-slate-300">{r.numero || `#${r.id}`}</td>
                  <td className="px-5 py-3 text-slate-500 dark:text-slate-400">{r.fecha}</td>
                  <td className="px-5 py-3 text-right text-slate-700 dark:text-slate-300">
                    {Number(r.monto).toLocaleString("es", { style: "currency", currency: "USD" })}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${ESTADO_COLOR[r.estado]}`}>
                      {r.estado}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
