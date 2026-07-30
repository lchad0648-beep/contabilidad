"use client";

import { useState } from "react";
import { contratarEmpleadoAction } from "@/lib/empresa-actions";
import Icon from "./Icon";

interface Resultado {
  id: number;
  username: string;
  role: string;
  empleado: boolean;
}

export default function EmpresaContratarForm() {
  const [query, setQuery] = useState("");
  const [resultados, setResultados] = useState<Resultado[]>([]);
  const [seleccionado, setSeleccionado] = useState<Resultado | null>(null);
  const [buscando, setBuscando] = useState(false);

  async function handleQueryChange(value: string) {
    setQuery(value);
    setSeleccionado(null);
    if (value.trim().length < 2) {
      setResultados([]);
      return;
    }
    setBuscando(true);
    try {
      const res = await fetch(`/api/empresas/buscar-usuarios?q=${encodeURIComponent(value)}`);
      const data = await res.json();
      setResultados(data.resultados ?? []);
    } finally {
      setBuscando(false);
    }
  }

  return (
    <div className="glass-card rounded-2xl p-5">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-slate-200">
        <Icon name="users" size={16} /> Contratar usuario
      </h2>

      {!seleccionado ? (
        <div>
          <input
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            placeholder="Buscar por nombre de usuario..."
            className="w-full rounded-xl border border-black/10 bg-white/60 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-slate-100"
          />
          {buscando && <p className="mt-2 text-xs text-gray-400 dark:text-slate-500">Buscando...</p>}
          {resultados.length > 0 && (
            <div className="mt-2 space-y-1">
              {resultados.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  disabled={r.empleado}
                  onClick={() => setSeleccionado(r)}
                  className="flex w-full items-center justify-between rounded-lg border border-black/10 px-3 py-2 text-left text-sm hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:hover:bg-white/5"
                >
                  <span>
                    {r.username} <span className="text-xs text-gray-400">({r.role})</span>
                  </span>
                  {r.empleado && <span className="text-xs text-amber-600 dark:text-amber-400">Ya empleado</span>}
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <form action={contratarEmpleadoAction} className="space-y-3">
          <input type="hidden" name="user_id" value={seleccionado.id} />
          <div className="flex items-center justify-between rounded-lg bg-blue-500/10 px-3 py-2 text-sm text-blue-700 dark:text-blue-300">
            <span>Contratando a {seleccionado.username}</span>
            <button
              type="button"
              onClick={() => setSeleccionado(null)}
              className="text-xs underline"
            >
              Cambiar
            </button>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-300">Salario</label>
            <input
              name="salario"
              type="number"
              step="any"
              min="0"
              required
              defaultValue={0}
              className="w-full rounded-xl border border-black/10 bg-white/60 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-slate-100"
            />
          </div>
          <button
            type="submit"
            className="glass-button-accent rounded-full px-4 py-2 text-sm font-medium text-white"
          >
            Confirmar contratación
          </button>
        </form>
      )}
    </div>
  );
}
