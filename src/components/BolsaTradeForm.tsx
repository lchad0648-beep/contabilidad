"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function BolsaTradeForm({
  empresaId,
  precioActual,
  tenencia,
  saldoUsuario,
}: {
  empresaId: number;
  precioActual: number;
  tenencia: number;
  saldoUsuario: number;
}) {
  const router = useRouter();
  const [cantidad, setCantidad] = useState(1);
  const [loading, setLoading] = useState<"compra" | "venta" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function operar(tipo: "compra" | "venta") {
    setError(null);
    setLoading(tipo);
    try {
      const res = await fetch(`/api/bolsa/${tipo === "compra" ? "comprar" : "vender"}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ empresaId, cantidad }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "No se pudo completar la operación.");
        return;
      }
      router.refresh();
    } finally {
      setLoading(null);
    }
  }

  const total = cantidad * precioActual;

  return (
    <div className="glass-card rounded-2xl p-5">
      <h2 className="mb-3 text-sm font-semibold text-gray-700 dark:text-slate-200">Operar</h2>
      <p className="mb-3 text-xs text-gray-500 dark:text-slate-400">
        Tienes {tenencia.toLocaleString("es")} acciones · saldo{" "}
        {saldoUsuario.toLocaleString("es", { style: "currency", currency: "USD" })}
      </p>

      {error && (
        <div className="mb-3 rounded-xl bg-red-500/10 px-3 py-2 text-xs text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      <div className="mb-3">
        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-300">Cantidad</label>
        <input
          type="number"
          min={1}
          step={1}
          value={cantidad}
          onChange={(e) => setCantidad(Math.max(1, Math.floor(Number(e.target.value) || 1)))}
          className="w-full rounded-xl border border-black/10 bg-white/60 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-slate-100"
        />
        <p className="mt-1 text-xs text-gray-400 dark:text-slate-500">
          Total: {total.toLocaleString("es", { style: "currency", currency: "USD" })}
        </p>
      </div>

      <div className="flex gap-3">
        <button
          onClick={() => operar("compra")}
          disabled={loading !== null}
          className="glass-button-accent flex-1 rounded-full px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {loading === "compra" ? "Comprando..." : "Comprar"}
        </button>
        <button
          onClick={() => operar("venta")}
          disabled={loading !== null || tenencia <= 0}
          className="flex-1 rounded-full border border-red-500/30 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-500/10 disabled:opacity-50 dark:text-red-400"
        >
          {loading === "venta" ? "Vendiendo..." : "Vender"}
        </button>
      </div>
    </div>
  );
}
