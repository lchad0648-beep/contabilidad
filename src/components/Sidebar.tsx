"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MODULES, categoryTextClass } from "@/lib/modules";
import Icon, { type IconName } from "./Icon";

const NAV_ITEM =
  "flex items-center justify-between gap-3 rounded-lg mx-2 px-3 py-2 text-sm font-medium transition-all duration-150";
const NAV_ACTIVE =
  "bg-blue-500/10 text-blue-700 dark:bg-blue-400/15 dark:text-blue-300 shadow-sm";
const NAV_INACTIVE =
  "text-slate-600 hover:bg-black/5 hover:translate-x-0.5 dark:text-slate-300 dark:hover:bg-white/5";

export default function Sidebar({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();

  return (
    <nav className="flex h-full w-72 flex-col gap-0.5 overflow-y-auto py-3">
      <SidebarLink href="/" icon="monitor" label="Resumen" active={pathname === "/"} />

      <div className="my-1 mx-4 border-t border-black/5 dark:border-white/5" />

      {MODULES.map((mod) => (
        <SidebarLink
          key={mod.slug}
          href={`/${mod.slug}`}
          icon={mod.icon as IconName}
          label={mod.label}
          active={pathname?.startsWith(`/${mod.slug}`)}
          categoryClass={categoryTextClass(mod.category)}
        />
      ))}

      <div className="my-1 mx-4 border-t border-black/5 dark:border-white/5" />

      <SidebarLink href="/reportes" icon="chart-line" label="Reportes" active={pathname === "/reportes"} />
      <SidebarLink
        href="/tickets"
        icon="message-circle"
        label="Tickets de soporte"
        active={pathname?.startsWith("/tickets")}
      />
      <SidebarLink
        href="/prestamos"
        icon="wallet"
        label="Préstamos"
        active={pathname?.startsWith("/prestamos")}
      />

      {isAdmin && (
        <>
          <SidebarLink
            href="/admin/usuarios"
            icon="shield"
            label="Usuarios (admin)"
            active={pathname === "/admin/usuarios"}
          />
          <SidebarLink
            href="/admin/solicitudes-borrado"
            icon="trash"
            label="Solicitudes de borrado"
            active={pathname === "/admin/solicitudes-borrado"}
          />
        </>
      )}
    </nav>
  );
}

function SidebarLink({
  href,
  icon,
  label,
  active,
  categoryClass,
}: {
  href: string;
  icon: IconName;
  label: string;
  active?: boolean;
  categoryClass?: string;
}) {
  return (
    <Link href={href} className={`relative ${NAV_ITEM} ${active ? NAV_ACTIVE : NAV_INACTIVE}`}>
      {active && (
        <span className="absolute -left-2 top-1/2 h-5 w-1 -translate-y-1/2 rounded-full bg-blue-500 dark:bg-blue-400" />
      )}
      <span className="flex items-center gap-3">
        <span className="flex w-5 items-center justify-center">
          <Icon
            name={icon}
            size={18}
            weight={active ? "filled" : "outline"}
            className={!active ? categoryClass : undefined}
          />
        </span>
        {label}
      </span>
    </Link>
  );
}
