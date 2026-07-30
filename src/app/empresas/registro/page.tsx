"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import AuthBackground from "@/components/AuthBackground";
import ThemeToggle from "@/components/ThemeToggle";

export default function RegistroEmpresaPage() {
  const router = useRouter();
  const [nombre, setNombre] = useState("");
  const [usuario, setUsuario] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/empresas/registro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre, usuario, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Error al registrar la empresa.");
        return;
      }
      router.push("/empresa");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center px-4 py-10">
      <AuthBackground />
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>

      <div className="glass-card w-full max-w-md animate-fade-in-up rounded-3xl p-8">
        <h1 className="mb-1 text-xl font-semibold text-gray-900 dark:text-slate-100">Registrar empresa</h1>
        <p className="mb-6 text-sm text-gray-500 dark:text-slate-400">
          Crea la cuenta de tu empresa: podrás gestionar tu dinero, logística, empleados y salir a bolsa.
        </p>

        {error && (
          <div className="mb-4 rounded-xl bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-300">
              Nombre de la empresa
            </label>
            <input
              className="w-full rounded-xl border border-black/10 bg-white/60 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-slate-100"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              minLength={2}
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-300">Usuario</label>
            <input
              className="w-full rounded-xl border border-black/10 bg-white/60 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-slate-100"
              value={usuario}
              onChange={(e) => setUsuario(e.target.value)}
              minLength={3}
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
              minLength={6}
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="glass-button-accent w-full rounded-xl px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {loading ? "Creando..." : "Registrar empresa"}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-gray-500 dark:text-slate-400">
          ¿Ya tienes una empresa registrada?{" "}
          <Link href="/empresas/login" className="font-medium text-blue-600 hover:underline dark:text-blue-400">
            Inicia sesión
          </Link>
        </p>
        <p className="mt-2 text-center text-xs text-gray-400 dark:text-slate-500">
          ¿Eres una persona, no una empresa?{" "}
          <Link href="/login" className="underline">
            Ir al inicio de sesión normal
          </Link>
        </p>
      </div>
    </div>
  );
}
