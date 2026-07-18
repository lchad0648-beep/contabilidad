import Link from "next/link";
import { listTicketsForStaff } from "@/lib/tickets";

const ESTADO_COLOR: Record<string, string> = {
  Abierto: "bg-yellow-100 text-yellow-800",
  "En progreso": "bg-blue-100 text-blue-800",
  Cerrado: "bg-gray-100 text-gray-600",
};

export default async function StaffTicketsPage() {
  const tickets = await listTicketsForStaff();

  return (
    <div>
      <h1 className="mb-1 text-2xl font-semibold text-gray-900">💬 Tickets de soporte</h1>
      <p className="mb-6 text-sm text-gray-500">Consultas abiertas por los clientes.</p>

      {tickets.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 bg-white p-10 text-center text-sm text-gray-500">
          No hay tickets todavía.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left font-medium text-gray-600">Asunto</th>
                <th className="px-4 py-2 text-left font-medium text-gray-600">Cliente</th>
                <th className="px-4 py-2 text-left font-medium text-gray-600">Asignado a</th>
                <th className="px-4 py-2 text-left font-medium text-gray-600">Estado</th>
                <th className="px-4 py-2 text-left font-medium text-gray-600">Actualizado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {tickets.map((t) => (
                <tr key={t.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2">
                    <Link href={`/tickets/${t.id}`} className="text-blue-600 hover:underline">
                      {t.asunto}
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-gray-700">{t.cliente_username}</td>
                  <td className="px-4 py-2 text-gray-500">{t.asignado_username ?? "—"}</td>
                  <td className="px-4 py-2">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${ESTADO_COLOR[t.estado]}`}>
                      {t.estado}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-gray-500">{t.updated_at}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
