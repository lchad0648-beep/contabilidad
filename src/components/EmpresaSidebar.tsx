"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Icon, { type IconName } from "./Icon";

const NAV_ITEM =
  "relative flex items-center justify-between gap-3 rounded-lg mx-2 px-3 py-2 text-sm font-medium transition-all duration-150";
const NAV_ACTIVE =
  "bg-blue-500/10 text-blue-700 dark:bg-blue-400/15 dark:text-blue-300 shadow-sm";
const NAV_INACTIVE =
  "text-slate-600 hover:bg-black/5 hover:translate-x-0.5 dark:text-slate-300 dark:hover:bg-white/5";

export type BolsaTabEstado = "bloqueada" | "cooldown" | "lanzada";

export default function EmpresaSidebar({ bolsaEstado }: { bolsaEstado: BolsaTabEstado }) {
  const pathname = usePathname();

  return (
    <nav className="flex h-full w-72 flex-col gap-0.5 overflow-y-auto py-3">
      <EmpresaLink href="/empresa" icon="monitor" label="Resumen" active={pathname === "/empresa"} />
      <EmpresaLink
        href="/empresa/logistica"
        icon="box"
        label="Logística"
        active={pathname?.startsWith("/empresa/logistica")}
      />
      <EmpresaLink
        href="/empresa/empleados"
        icon="users"
        label="Empleados"
        active={pathname?.startsWith("/empresa/empleados")}
      />

      <div className="my-1 mx-4 border-t border-black/5 dark:border-white/5" />

      <Link
        href="/empresa/bolsa"
        className={`${NAV_ITEM} ${
          pathname?.startsWith("/empresa/bolsa")
            ? NAV_ACTIVE
            : bolsaEstado === "cooldown"
              ? "text-red-600 dark:text-red-400 animate-glow-red"
              : NAV_INACTIVE
        }`}
      >
        {pathname?.startsWith("/empresa/bolsa") && (
          <span className="absolute -left-2 top-1/2 h-5 w-1 -translate-y-1/2 rounded-full bg-blue-500 dark:bg-blue-400" />
        )}
        <span className="flex items-center gap-3">
          <span className="flex w-5 items-center justify-center">
            <Icon
              name={bolsaEstado === "lanzada" ? "graph-up" : "lock"}
              size={18}
              weight={pathname?.startsWith("/empresa/bolsa") ? "filled" : "outline"}
            />
          </span>
          Bolsa
        </span>
      </Link>
    </nav>
  );
}

function EmpresaLink({
  href,
  icon,
  label,
  active,
}: {
  href: string;
  icon: IconName;
  label: string;
  active?: boolean;
}) {
  return (
    <Link href={href} className={`${NAV_ITEM} ${active ? NAV_ACTIVE : NAV_INACTIVE}`}>
      {active && (
        <span className="absolute -left-2 top-1/2 h-5 w-1 -translate-y-1/2 rounded-full bg-blue-500 dark:bg-blue-400" />
      )}
      <span className="flex items-center gap-3">
        <span className="flex w-5 items-center justify-center">
          <Icon name={icon} size={18} weight={active ? "filled" : "outline"} />
        </span>
        {label}
      </span>
    </Link>
  );
}
