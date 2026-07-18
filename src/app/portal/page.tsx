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
      <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
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
  const saldoColor = saldo > 0 ? "text-red-600" : saldo < 0 ? "text-green-600" : "text-slate-700";
  const ticketsAbiertos = ticketsRow.n;

  return (
    <div>
      <h1 className="mb-1 text-2xl font-semibold text-slate-900">Hola, {user?.username} 👋</h1>
      <p className="mb-6 text-sm text-slate-500">Este es el resumen de tu cuenta.</p>

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs text-slate-500">Total facturado</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">
            {totalFacturado.toLocaleString("es", { style: "currency", currency: "USD" })}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs text-slate-500">Total pagado</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">
            {totalPagado.toLocaleString("es", { style: "currency", currency: "USD" })}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs text-slate-500">{saldoLabel}</p>
          <p className={`mt-1 text-2xl font-semibold ${saldoColor}`}>
            {Math.abs(saldo).toLocaleString("es", { style: "currency", currency: "USD" })}
          </p>
          {saldo < 0 && <p className="mt-1 text-xs text-slate-400">Pagaste más de lo facturado.</p>}
        </div>
      </div>

      <div className="mb-8 flex flex-wrap gap-3">
        <Link
          href="/portal/tickets/nuevo"
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          💬 Abrir un ticket de soporte
        </Link>
        <Link
          href="/portal/tickets"
          className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Ver mis tickets {ticketsAbiertos > 0 && `(${ticketsAbiertos} abiertos)`}
        </Link>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
          <h2 className="text-sm font-semibold text-slate-800">Facturas recientes</h2>
          <Link href="/portal/recibos" className="text-sm text-blue-600 hover:underline">
            Ver todas
          </Link>
        </div>
        {recibosRecientes.length === 0 ? (
          <p className="px-5 py-6 text-center text-sm text-slate-400">Aún no tienes facturas.</p>
        ) : (
          <table className="min-w-full divide-y divide-slate-100 text-sm">
            <tbody className="divide-y divide-slate-100">
              {recibosRecientes.map((r) => (
                <tr key={r.id}>
                  <td className="px-5 py-3 text-slate-700">{r.numero || `#${r.id}`}</td>
                  <td className="px-5 py-3 text-slate-500">{r.fecha}</td>
                  <td className="px-5 py-3 text-right text-slate-700">
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
