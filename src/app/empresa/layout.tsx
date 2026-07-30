import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentEmpresa } from "@/lib/empresa-auth";
import { getBolsaEstado, type BolsaEstado } from "@/lib/bolsa";
import EmpresaSidebar, { type BolsaTabEstado } from "@/components/EmpresaSidebar";
import EmpresaLogoutButton from "@/components/EmpresaLogoutButton";
import ThemeToggle from "@/components/ThemeToggle";
import Icon from "@/components/Icon";

function mapBolsaTabEstado(estado: BolsaEstado): BolsaTabEstado {
  if (estado.tipo === "lanzada") return "lanzada";
  if (estado.tipo === "rechazada_cooldown") return "cooldown";
  return "bloqueada";
}

export default async function EmpresaLayout({ children }: { children: React.ReactNode }) {
  const empresa = await getCurrentEmpresa();
  if (!empresa) redirect("/empresas/login");

  const bolsaEstado = await getBolsaEstado(empresa.id);

  return (
    <div className="flex h-screen w-full bg-[var(--background)]">
      <div className="glass-sidebar">
        <EmpresaSidebar bolsaEstado={mapBolsaTabEstado(bolsaEstado)} />
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="glass-header sticky top-0 z-20 flex items-center justify-between px-6 py-3">
          <Link
            href="/empresa"
            className="flex items-center gap-2 text-lg font-semibold text-gray-800 dark:text-slate-100"
          >
            <Icon name="money-bag" size={20} /> {empresa.nombre}
          </Link>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600 dark:text-slate-300">
              {empresa.usuario} <span className="text-xs text-blue-600 dark:text-blue-400">(empresa)</span>
            </span>
            <ThemeToggle />
            <EmpresaLogoutButton />
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-6 animate-fade-in-up">{children}</main>
      </div>
    </div>
  );
}
