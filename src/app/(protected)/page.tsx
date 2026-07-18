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
    <div className="animate-fade-in-up">
      <h1 className="mb-1 text-2xl font-semibold text-gray-900 dark:text-slate-100">Resumen</h1>
      <p className="mb-6 text-sm text-gray-500 dark:text-slate-400">
        Bienvenido, {user?.username}. Aquí tienes un vistazo general de todos los módulos.
      </p>

      <div className="mb-8">
        <h2 className="mb-1 text-lg font-semibold text-gray-900 dark:text-slate-100">
          Resumen financiero
        </h2>
        <p className="mb-4 text-xs text-gray-500 dark:text-slate-400">
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

      <h2 className="mb-3 text-lg font-semibold text-gray-900 dark:text-slate-100">Módulos</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {counts.map((mod) => (
          <Link
            key={mod.slug}
            href={`/${mod.slug}`}
            className="glass-card flex items-center justify-between rounded-2xl p-4 transition hover:-translate-y-0.5 hover:shadow-lg"
          >
            <div className="flex items-center gap-3">
              <span className="text-xl">{mod.icon}</span>
              <span className="text-sm font-medium text-gray-700 dark:text-slate-200">{mod.label}</span>
            </div>
            <span className="rounded-full bg-black/5 px-2.5 py-1 text-sm font-semibold text-gray-700 dark:bg-white/10 dark:text-slate-200">
              {mod.count}
            </span>
          </Link>
        ))}
      </div>

      <div className="mt-8">
        <Link
          href="/reportes"
          className="glass-button-accent inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium text-white"
        >
          📈 Ver Reportes
        </Link>
      </div>
    </div>
  );
}
