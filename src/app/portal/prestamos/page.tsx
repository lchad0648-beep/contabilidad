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
    <div className="animate-fade-in-up">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Préstamos</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Solicita y da seguimiento a tus préstamos.
          </p>
        </div>
        <Link
          href="/portal/prestamos/nuevo"
          className="glass-button-accent rounded-full px-4 py-2 text-sm font-medium text-white"
        >
          + Nuevo préstamo
        </Link>
      </div>

      <div className="mb-6 flex gap-1 border-b border-black/10 dark:border-white/10">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/portal/prestamos?tab=${t.key}`}
            className={`border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
              tab === t.key
                ? "border-blue-600 text-blue-700 dark:border-blue-400 dark:text-blue-300"
                : "border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {tab !== "por-pagar" ? (
        <div className="space-y-3">
          {(tab === "activos" ? activos : pagados).length === 0 ? (
            <div className="glass-card rounded-2xl border-dashed p-10 text-center text-sm text-slate-500 dark:text-slate-400">
              No hay préstamos en esta categoría.
            </div>
          ) : (
            (tab === "activos" ? activos : pagados).map((p) => (
              <Link
                key={p.id}
                href={`/portal/prestamos/${p.id}`}
                className="glass-card flex items-center justify-between rounded-2xl p-4 transition hover:-translate-y-0.5 hover:shadow-lg"
              >
                <div>
                  <p className="font-medium text-slate-800 dark:text-slate-100">
                    ${p.monto_solicitado.toLocaleString("es")} — {p.motivo}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
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
        <div className="glass-card overflow-hidden rounded-2xl">
          {cuotasPendientes.length === 0 ? (
            <p className="p-10 text-center text-sm text-slate-500 dark:text-slate-400">
              No tienes cuotas pendientes.
            </p>
          ) : (
            <table className="min-w-full divide-y divide-black/5 text-sm dark:divide-white/5">
              <thead className="bg-black/[0.02] dark:bg-white/[0.03]">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-slate-600 dark:text-slate-300">
                    Préstamo
                  </th>
                  <th className="px-4 py-2 text-left font-medium text-slate-600 dark:text-slate-300">
                    Cuota
                  </th>
                  <th className="px-4 py-2 text-left font-medium text-slate-600 dark:text-slate-300">
                    Vence
                  </th>
                  <th className="px-4 py-2 text-right font-medium text-slate-600 dark:text-slate-300">
                    Monto
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5 dark:divide-white/5">
                {cuotasPendientes.map((c) => (
                  <tr key={c.id}>
                    <td className="px-4 py-2">
                      <Link
                        href={`/portal/prestamos/${c.prestamo_id}`}
                        className="text-blue-600 hover:underline dark:text-blue-400"
                      >
                        {c.asunto}
                      </Link>
                    </td>
                    <td className="px-4 py-2 text-slate-600 dark:text-slate-300">#{c.numero}</td>
                    <td className="px-4 py-2 text-slate-500 dark:text-slate-400">{c.fecha_vencimiento}</td>
                    <td className="px-4 py-2 text-right font-medium text-slate-700 dark:text-slate-200">
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
