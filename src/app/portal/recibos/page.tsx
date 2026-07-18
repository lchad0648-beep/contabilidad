import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";

const ESTADO_COLOR: Record<string, string> = {
  Borrador: "bg-gray-100 text-gray-600",
  Enviado: "bg-blue-100 text-blue-800",
  Pagado: "bg-green-100 text-green-800",
  Vencido: "bg-red-100 text-red-800",
};

export default async function PortalRecibosPage() {
  const user = await getCurrentUser();
  const clienteId = user?.cliente_id ?? null;
  const db = getDb();

  const recibos = clienteId
    ? ((await db
        .prepare(`SELECT * FROM recibos WHERE cliente_id = ? ORDER BY fecha DESC, id DESC`)
        .all(clienteId)) as {
        id: number;
        numero: string;
        fecha: string;
        monto: number;
        estado: string;
        notas: string | null;
      }[])
    : [];

  return (
    <div className="animate-fade-in-up">
      <h1 className="mb-1 text-2xl font-semibold text-slate-900 dark:text-slate-100">Mis facturas</h1>
      <p className="mb-6 text-sm text-slate-500 dark:text-slate-400">{recibos.length} factura(s)</p>

      {recibos.length === 0 ? (
        <div className="glass-card rounded-2xl border-dashed p-10 text-center text-sm text-slate-500 dark:text-slate-400">
          Todavía no tienes facturas registradas.
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
                <th className="px-4 py-2 text-right font-medium text-slate-600 dark:text-slate-300">
                  Estado
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5 dark:divide-white/5">
              {recibos.map((r) => (
                <tr key={r.id} className="transition hover:bg-black/[0.02] dark:hover:bg-white/[0.03]">
                  <td className="px-4 py-2 text-slate-700 dark:text-slate-300">{r.numero || `#${r.id}`}</td>
                  <td className="px-4 py-2 text-slate-500 dark:text-slate-400">{r.fecha}</td>
                  <td className="px-4 py-2 text-right text-slate-700 dark:text-slate-300">
                    {Number(r.monto).toLocaleString("es", { style: "currency", currency: "USD" })}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${ESTADO_COLOR[r.estado]}`}>
                      {r.estado}
                    </span>
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
