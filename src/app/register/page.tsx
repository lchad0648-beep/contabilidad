"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import AuthBackground from "@/components/AuthBackground";
import ThemeToggle from "@/components/ThemeToggle";

type Role = "cliente" | "profesional" | "admin";

const ROLE_OPTIONS: { value: Role; label: string; description: string }[] = [
  { value: "cliente", label: "Cliente", description: "Ver mis facturas, pagos y abrir tickets de soporte" },
  { value: "profesional", label: "Profesional", description: "Gestionar contabilidad y atender clientes" },
  { value: "admin", label: "Admin", description: "Acceso completo y aprobación de usuarios" },
];

export default function RegisterPage() {
  const router = useRouter();
  const [role, setRole] = useState<Role>("cliente");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, role }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Error al registrar.");
        return;
      }
      if (data.autoLogin) {
        router.push("/portal");
        router.refresh();
        return;
      }
      setSuccess(data.message);
      setUsername("");
      setPassword("");
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
        <h1 className="mb-1 text-xl font-semibold text-gray-900 dark:text-slate-100">Crear cuenta</h1>
        <p className="mb-6 text-sm text-gray-500 dark:text-slate-400">
          {role === "cliente"
            ? "Los clientes pueden registrarse libremente, sin aprobación."
            : "Esta cuenta quedará pendiente hasta que un administrador la apruebe."}
        </p>

        {error && (
          <div className="mb-4 rounded-xl bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 rounded-xl bg-green-500/10 px-3 py-2 text-sm text-green-700 dark:text-green-300">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-slate-300">
              Tipo de cuenta
            </label>
            <div className="grid grid-cols-1 gap-2">
              {ROLE_OPTIONS.map((opt) => (
                <label
                  key={opt.value}
                  className={`flex cursor-pointer items-start gap-3 rounded-xl border px-3 py-2 text-sm transition ${
                    role === opt.value
                      ? "border-blue-500 bg-blue-500/10"
                      : "border-black/10 hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/5"
                  }`}
                >
                  <input
                    type="radio"
                    name="role"
                    className="mt-1"
                    checked={role === opt.value}
                    onChange={() => setRole(opt.value)}
                  />
                  <span>
                    <span className="block font-medium text-gray-800 dark:text-slate-100">{opt.label}</span>
                    <span className="block text-xs text-gray-500 dark:text-slate-400">{opt.description}</span>
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-300">
              Usuario
            </label>
            <input
              className="w-full rounded-xl border border-black/10 bg-white/60 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-slate-100"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              minLength={3}
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-300">
              Contraseña
            </label>
            <input
              type="password"
              className="w-full rounded-xl border border-black/10 bg-white/60 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-slate-100"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={6}
              required
            />
          </div>

          {role === "cliente" && (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Entrarás de inmediato, sin esperar aprobación. Se creará un registro de cliente con
              tu nombre de usuario; un profesional podrá completar tus datos (nombre, correo,
              teléfono) más adelante desde Clientes.
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="glass-button-accent w-full rounded-xl px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {loading ? "Enviando..." : "Registrarme"}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-gray-500 dark:text-slate-400">
          ¿Ya tienes cuenta?{" "}
          <Link href="/login" className="font-medium text-blue-600 hover:underline dark:text-blue-400">
            Inicia sesión
          </Link>
        </p>
      </div>
    </div>
  );
}
