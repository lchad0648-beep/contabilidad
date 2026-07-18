"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/portal", label: "Inicio" },
  { href: "/portal/recibos", label: "Mis facturas" },
  { href: "/portal/pagos", label: "Mis pagos" },
  { href: "/portal/prestamos", label: "Préstamos" },
  { href: "/portal/tickets", label: "Soporte" },
];

export default function PortalNav() {
  const pathname = usePathname();

  return (
    <nav className="mx-auto flex max-w-5xl gap-1 px-6">
      {ITEMS.map((item) => {
        const active = item.href === "/portal" ? pathname === "/portal" : pathname?.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
              active
                ? "border-blue-600 text-blue-700 dark:border-blue-400 dark:text-blue-300"
                : "border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
