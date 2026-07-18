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
        metodo: string;
        referencia: string | null;
      }[])
    : [];

  return (
    <div>
      <h1 className="mb-1 text-2xl font-semibold text-slate-900">Mis pagos</h1>
      <p className="mb-6 text-sm text-slate-500">{pagos.length} pago(s) registrado(s)</p>

      {pagos.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">
          Todavía no tienes pagos registrados.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-2 text-left font-medium text-slate-600">Número</th>
                <th className="px-4 py-2 text-left font-medium text-slate-600">Fecha</th>
                <th className="px-4 py-2 text-left font-medium text-slate-600">Método</th>
                <th className="px-4 py-2 text-right font-medium text-slate-600">Monto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pagos.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2 text-slate-700">{p.numero || `#${p.id}`}</td>
                  <td className="px-4 py-2 text-slate-500">{p.fecha}</td>
                  <td className="px-4 py-2 text-slate-500">{p.metodo}</td>
                  <td className="px-4 py-2 text-right text-slate-700">
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
