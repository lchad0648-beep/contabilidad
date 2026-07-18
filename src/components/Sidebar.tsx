"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MODULES } from "@/lib/modules";

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
      <SidebarLink href="/" icon="🖥️" label="Resumen" active={pathname === "/"} />

      <div className="my-1 mx-4 border-t border-black/5 dark:border-white/5" />

      {MODULES.map((mod) => (
        <SidebarLink
          key={mod.slug}
          href={`/${mod.slug}`}
          icon={mod.icon}
          label={mod.label}
          active={pathname?.startsWith(`/${mod.slug}`)}
        />
      ))}

      <div className="my-1 mx-4 border-t border-black/5 dark:border-white/5" />

      <SidebarLink href="/reportes" icon="📈" label="Reportes" active={pathname === "/reportes"} />
      <SidebarLink
        href="/tickets"
        icon="💬"
        label="Tickets de soporte"
        active={pathname?.startsWith("/tickets")}
      />
      <SidebarLink
        href="/prestamos"
        icon="💰"
        label="Préstamos"
        active={pathname?.startsWith("/prestamos")}
      />

      {isAdmin && (
        <SidebarLink
          href="/admin/usuarios"
          icon="🛡️"
          label="Usuarios (admin)"
          active={pathname === "/admin/usuarios"}
        />
      )}
    </nav>
  );
}

function SidebarLink({
  href,
  icon,
  label,
  active,
}: {
  href: string;
  icon: string;
  label: string;
  active?: boolean;
}) {
  return (
    <Link href={href} className={`${NAV_ITEM} ${active ? NAV_ACTIVE : NAV_INACTIVE}`}>
      <span className="flex items-center gap-3">
        <span className="w-5 text-center">{icon}</span>
        {label}
      </span>
    </Link>
  );
}
