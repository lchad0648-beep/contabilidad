"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import AuthBackground from "@/components/AuthBackground";
import ThemeToggle from "@/components/ThemeToggle";

export default function LoginEmpresaPage() {
  const router = useRouter();
  const [usuario, setUsuario] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/empresas/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usuario, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Error al iniciar sesión.");
        return;
      }
      router.push("/empresa");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center px-4">
      <AuthBackground />
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>

      <div className="glass-card w-full max-w-sm animate-fade-in-up rounded-3xl p-8">
        <h1 className="mb-1 text-xl font-semibold text-gray-900 dark:text-slate-100">Iniciar sesión (empresa)</h1>
        <p className="mb-6 text-sm text-gray-500 dark:text-slate-400">Panel de gestión empresarial</p>

        {error && (
          <div className="mb-4 rounded-xl bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-300">Usuario</label>
            <input
              className="w-full rounded-xl border border-black/10 bg-white/60 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-slate-100"
              value={usuario}
              onChange={(e) => setUsuario(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-300">Contraseña</label>
            <input
              type="password"
              className="w-full rounded-xl border border-black/10 bg-white/60 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-slate-100"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="glass-button-accent w-full rounded-xl px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {loading ? "Ingresando..." : "Ingresar"}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-gray-500 dark:text-slate-400">
          ¿No tienes empresa registrada?{" "}
          <Link href="/empresas/registro" className="font-medium text-blue-600 hover:underline dark:text-blue-400">
            Regístrala
          </Link>
        </p>
      </div>
    </div>
  );
}
