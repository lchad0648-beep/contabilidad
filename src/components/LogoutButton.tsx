"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      onClick={handleLogout}
      disabled={loading}
      className="rounded-full border border-black/10 px-3 py-1.5 text-sm text-gray-700 transition hover:bg-black/5 disabled:opacity-50 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/10"
    >
      {loading ? "Saliendo..." : "Cerrar sesión"}
    </button>
  );
}
