import Link from "next/link";
import { listPrestamosForStaff } from "@/lib/prestamos";
import LoanCalendar from "@/components/LoanCalendar";

const ESTADO_COLOR: Record<string, string> = {
  Pendiente: "bg-yellow-100 text-yellow-800",
  Aprobado: "bg-blue-100 text-blue-800",
  Rechazado: "bg-red-100 text-red-800",
  Pagado: "bg-green-100 text-green-800",
};

export default async function StaffPrestamosPage() {
  const prestamos = await listPrestamosForStaff();
  const now = new Date();

  return (
    <div>
      <h1 className="mb-1 text-2xl font-semibold text-gray-900">💰 Préstamos</h1>
      <p className="mb-6 text-sm text-gray-500">
        Solicitudes de clientes y calendario de cobros esperados.
      </p>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_360px]">
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left font-medium text-gray-600">Cliente</th>
                <th className="px-4 py-2 text-right font-medium text-gray-600">Solicitado</th>
                <th className="px-4 py-2 text-right font-medium text-gray-600">A devolver</th>
                <th className="px-4 py-2 text-left font-medium text-gray-600">Asignado a</th>
                <th className="px-4 py-2 text-left font-medium text-gray-600">Estado</th>
                <th className="px-4 py-2 text-left font-medium text-gray-600">Actualizado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {prestamos.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-gray-400">
                    No hay solicitudes de préstamo todavía.
                  </td>
                </tr>
              ) : (
                prestamos.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2">
                      <Link href={`/prestamos/${p.id}`} className="text-blue-600 hover:underline">
                        {p.cliente_username}
                      </Link>
                    </td>
                    <td className="px-4 py-2 text-right text-gray-700">
                      ${p.monto_solicitado.toLocaleString("es")}
                    </td>
                    <td className="px-4 py-2 text-right text-gray-700">
                      {p.monto_a_devolver ? `$${p.monto_a_devolver.toLocaleString("es")}` : "—"}
                    </td>
                    <td className="px-4 py-2 text-gray-500">{p.asignado_username ?? "—"}</td>
                    <td className="px-4 py-2">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${ESTADO_COLOR[p.estado]}`}>
                        {p.estado}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-gray-500">{p.updated_at}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div>
          <LoanCalendar initialYear={now.getFullYear()} initialMonth={now.getMonth() + 1} />
        </div>
      </div>
    </div>
  );
}
