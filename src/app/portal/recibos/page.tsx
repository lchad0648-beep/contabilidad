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
    <div>
      <h1 className="mb-1 text-2xl font-semibold text-slate-900">Mis facturas</h1>
      <p className="mb-6 text-sm text-slate-500">{recibos.length} factura(s)</p>

      {recibos.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">
          Todavía no tienes facturas registradas.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-2 text-left font-medium text-slate-600">Número</th>
                <th className="px-4 py-2 text-left font-medium text-slate-600">Fecha</th>
                <th className="px-4 py-2 text-right font-medium text-slate-600">Monto</th>
                <th className="px-4 py-2 text-right font-medium text-slate-600">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recibos.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2 text-slate-700">{r.numero || `#${r.id}`}</td>
                  <td className="px-4 py-2 text-slate-500">{r.fecha}</td>
                  <td className="px-4 py-2 text-right text-slate-700">
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
