import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import Sidebar from "@/components/Sidebar";
import LogoutButton from "@/components/LogoutButton";
import ThemeToggle from "@/components/ThemeToggle";
import Link from "next/link";

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  if (!user) redirect("/login");
  if (user.status !== "approved") redirect("/login?pending=1");
  if (user.role === "cliente") redirect("/portal");

  return (
    <div className="flex h-screen w-full bg-[var(--background)]">
      <div className="glass-sidebar">
        <Sidebar isAdmin={user.role === "admin"} />
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="glass-header sticky top-0 z-20 flex items-center justify-between px-6 py-3">
          <Link href="/" className="text-lg font-semibold text-gray-800 dark:text-slate-100">
            Contabilidad
          </Link>
          <div className="flex items-center gap-4">
            <Link
              href="/reportes"
              className="glass-button-accent rounded-full px-3 py-1.5 text-sm font-medium text-white"
            >
              📈 Reportes
            </Link>
            <span className="text-sm text-gray-600 dark:text-slate-300">
              {user.username}{" "}
              <span className="text-xs text-blue-600 dark:text-blue-400">({user.role})</span>
            </span>
            <ThemeToggle />
            <LogoutButton />
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-6 animate-fade-in-up">{children}</main>
      </div>
    </div>
  );
}
