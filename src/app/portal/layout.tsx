import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import LogoutButton from "@/components/LogoutButton";
import ThemeToggle from "@/components/ThemeToggle";
import PortalNav from "@/components/PortalNav";
import AsistenteIA from "@/components/AsistenteIA";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  if (!user) redirect("/login");
  if (user.status !== "approved") redirect("/login?pending=1");
  if (user.role !== "cliente") redirect("/");

  return (
    <div className="flex min-h-screen flex-col bg-[var(--background)]">
      <header className="glass-header sticky top-0 z-20">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link href="/portal" className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            🏠 Mi cuenta
          </Link>
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-600 dark:text-slate-300">{user.username}</span>
            <ThemeToggle />
            <LogoutButton />
          </div>
        </div>
        <PortalNav />
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-8 animate-fade-in-up">{children}</main>
      <AsistenteIA />
    </div>
  );
}
