import Link from "next/link";
import { getDb } from "@/lib/db";
import { MODULES } from "@/lib/modules";
import { getCurrentUser } from "@/lib/auth";
import { getEstadosFinancieros } from "@/lib/estados-financieros";
import FinancialStatementCard from "@/components/FinancialStatementCard";

export default async function ResumenPage() {
  const user = await getCurrentUser();
  const db = getDb();
  const estados = await getEstadosFinancieros();

  const counts = await Promise.all(
    MODULES.map(async (mod) => {
      const row = (await db.prepare(`SELECT COUNT(*) as n FROM ${mod.table}`).get()) as { n: number };
      return { ...mod, count: row.n };
    })
  );

  return (
    <div>
      <h1 className="mb-1 text-2xl font-semibold text-gray-900">Resumen</h1>
      <p className="mb-6 text-sm text-gray-500">
        Bienvenido, {user?.username}. Aquí tienes un vistazo general de todos los módulos.
      </p>

      <div className="mb-8">
        <h2 className="mb-1 text-lg font-semibold text-gray-900">Resumen financiero</h2>
        <p className="mb-4 text-xs text-gray-500">
          Vista simplificada calculada a partir de tus módulos actuales (Recibos, Pagos, Cuentas de
          capital, Inversiones, etc.) — no reemplaza un balance contable certificado.
        </p>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div>
            <FinancialStatementCard categoria={estados.activos} />
          </div>
          <div className="flex flex-col gap-6">
            <FinancialStatementCard categoria={estados.ingresos} />
            <FinancialStatementCard categoria={estados.gastos} />
          </div>
          <div className="flex flex-col gap-6">
            <FinancialStatementCard categoria={estados.pasivos} />
            <FinancialStatementCard categoria={estados.patrimonio} />
          </div>
        </div>
      </div>

      <h2 className="mb-3 text-lg font-semibold text-gray-900">Módulos</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {counts.map((mod) => (
          <Link
            key={mod.slug}
            href={`/${mod.slug}`}
            className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition hover:border-blue-300 hover:shadow"
          >
            <div className="flex items-center gap-3">
              <span className="text-xl">{mod.icon}</span>
              <span className="text-sm font-medium text-gray-700">{mod.label}</span>
            </div>
            <span className="rounded-full bg-gray-100 px-2.5 py-1 text-sm font-semibold text-gray-700">
              {mod.count}
            </span>
          </Link>
        ))}
      </div>

      <div className="mt-8">
        <Link
          href="/reportes"
          className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          📈 Ver Reportes
        </Link>
      </div>
    </div>
  );
}
