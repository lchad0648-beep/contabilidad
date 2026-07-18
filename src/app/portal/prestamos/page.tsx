import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { listPrestamosForCliente, listCuotasPendientesForCliente } from "@/lib/prestamos";

const ESTADO_COLOR: Record<string, string> = {
  Pendiente: "bg-yellow-100 text-yellow-800",
  Aprobado: "bg-blue-100 text-blue-800",
  Rechazado: "bg-red-100 text-red-800",
  Pagado: "bg-green-100 text-green-800",
};

const TABS = [
  { key: "activos", label: "Activos" },
  { key: "pagados", label: "Pagados" },
  { key: "por-pagar", label: "Por pagar" },
] as const;

export default async function PortalPrestamosPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab: rawTab } = await searchParams;
  const tab = (TABS.some((t) => t.key === rawTab) ? rawTab : "activos") as (typeof TABS)[number]["key"];

  const user = await getCurrentUser();
  const prestamos = user ? await listPrestamosForCliente(user.id) : [];
  const cuotasPendientes = user ? await listCuotasPendientesForCliente(user.id) : [];

  const activos = prestamos.filter((p) => p.estado !== "Pagado");
  const pagados = prestamos.filter((p) => p.estado === "Pagado");

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Préstamos</h1>
          <p className="text-sm text-slate-500">Solicita y da seguimiento a tus préstamos.</p>
        </div>
        <Link
          href="/portal/prestamos/nuevo"
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          + Nuevo préstamo
        </Link>
      </div>

      <div className="mb-6 flex gap-1 border-b border-slate-200">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/portal/prestamos?tab=${t.key}`}
            className={`border-b-2 px-3 py-2 text-sm font-medium ${
              tab === t.key
                ? "border-blue-600 text-blue-700"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {tab !== "por-pagar" ? (
        <div className="space-y-3">
          {(tab === "activos" ? activos : pagados).length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">
              No hay préstamos en esta categoría.
            </div>
          ) : (
            (tab === "activos" ? activos : pagados).map((p) => (
              <Link
                key={p.id}
                href={`/portal/prestamos/${p.id}`}
                className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:border-blue-300 hover:shadow"
              >
                <div>
                  <p className="font-medium text-slate-800">
                    ${p.monto_solicitado.toLocaleString("es")} — {p.motivo}
                  </p>
                  <p className="text-xs text-slate-500">
                    {p.estado === "Aprobado" && p.monto_a_devolver
                      ? `A devolver: $${p.monto_a_devolver.toLocaleString("es")} · vence ${p.fecha_vencimiento}`
                      : `Solicitado: ${p.created_at}`}
                  </p>
                </div>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${ESTADO_COLOR[p.estado]}`}>
                  {p.estado}
                </span>
              </Link>
            ))
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          {cuotasPendientes.length === 0 ? (
            <p className="p-10 text-center text-sm text-slate-500">No tienes cuotas pendientes.</p>
          ) : (
            <table className="min-w-full divide-y divide-slate-100 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-slate-600">Préstamo</th>
                  <th className="px-4 py-2 text-left font-medium text-slate-600">Cuota</th>
                  <th className="px-4 py-2 text-left font-medium text-slate-600">Vence</th>
                  <th className="px-4 py-2 text-right font-medium text-slate-600">Monto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {cuotasPendientes.map((c) => (
                  <tr key={c.id}>
                    <td className="px-4 py-2">
                      <Link href={`/portal/prestamos/${c.prestamo_id}`} className="text-blue-600 hover:underline">
                        {c.asunto}
                      </Link>
                    </td>
                    <td className="px-4 py-2 text-slate-600">#{c.numero}</td>
                    <td className="px-4 py-2 text-slate-500">{c.fecha_vencimiento}</td>
                    <td className="px-4 py-2 text-right font-medium text-slate-700">
                      ${c.monto.toLocaleString("es")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
