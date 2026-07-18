import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";

export default async function PortalPagosPage() {
  const user = await getCurrentUser();
  const clienteId = user?.cliente_id ?? null;
  const db = getDb();

  const pagos = clienteId
    ? ((await db
        .prepare(`SELECT * FROM pagos WHERE cliente_id = ? ORDER BY fecha DESC, id DESC`)
        .all(clienteId)) as {
        id: number;
        numero: string;
        fecha: string;
        monto: number;
        referencia: string | null;
      }[])
    : [];

  return (
    <div className="animate-fade-in-up">
      <h1 className="mb-1 text-2xl font-semibold text-slate-900 dark:text-slate-100">Mis pagos</h1>
      <p className="mb-6 text-sm text-slate-500 dark:text-slate-400">
        {pagos.length} pago(s) registrado(s)
      </p>

      {pagos.length === 0 ? (
        <div className="glass-card rounded-2xl border-dashed p-10 text-center text-sm text-slate-500 dark:text-slate-400">
          Todavía no tienes pagos registrados.
        </div>
      ) : (
        <div className="glass-card overflow-x-auto rounded-2xl">
          <table className="min-w-full divide-y divide-black/5 text-sm dark:divide-white/5">
            <thead className="bg-black/[0.02] dark:bg-white/[0.03]">
              <tr>
                <th className="px-4 py-2 text-left font-medium text-slate-600 dark:text-slate-300">
                  Número
                </th>
                <th className="px-4 py-2 text-left font-medium text-slate-600 dark:text-slate-300">
                  Fecha
                </th>
                <th className="px-4 py-2 text-right font-medium text-slate-600 dark:text-slate-300">
                  Monto
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5 dark:divide-white/5">
              {pagos.map((p) => (
                <tr key={p.id} className="transition hover:bg-black/[0.02] dark:hover:bg-white/[0.03]">
                  <td className="px-4 py-2 text-slate-700 dark:text-slate-300">{p.numero || `#${p.id}`}</td>
                  <td className="px-4 py-2 text-slate-500 dark:text-slate-400">{p.fecha}</td>
                  <td className="px-4 py-2 text-right text-slate-700 dark:text-slate-300">
                    {Number(p.monto).toLocaleString("es", { style: "currency", currency: "USD" })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
