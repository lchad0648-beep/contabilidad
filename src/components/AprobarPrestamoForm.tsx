"use client";

import { useState } from "react";
import { aprobarPrestamoAction } from "@/lib/actions";

export default function AprobarPrestamoForm({ prestamoId }: { prestamoId: number }) {
  const [open, setOpen] = useState(false);
  const [tipoPago, setTipoPago] = useState<"unico" | "cuotas">("unico");

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="glass-button-accent rounded-full px-4 py-1.5 text-sm font-semibold text-white transition"
      >
        ✓ Aceptar
      </button>
    );
  }

  return (
    <form
      action={aprobarPrestamoAction.bind(null, prestamoId)}
      className="glass-card w-full max-w-lg space-y-3 rounded-2xl p-4 text-sm"
    >
      <p className="font-semibold text-slate-800 dark:text-slate-100">Definir términos del préstamo</p>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">Plazo</label>
          <input
            type="number"
            name="plazo_valor"
            min="1"
            required
            defaultValue={30}
            className="w-full rounded-md border border-slate-300 bg-white/70 px-2 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-800/70 dark:text-slate-100"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">Unidad</label>
          <select
            name="plazo_unidad"
            defaultValue="dias"
            className="w-full rounded-md border border-slate-300 bg-white/70 px-2 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-800/70 dark:text-slate-100"
          >
            <option value="dias">Días</option>
            <option value="semanas">Semanas</option>
            <option value="meses">Meses</option>
          </select>
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">Forma de pago</label>
        <select
          name="tipo_pago"
          value={tipoPago}
          onChange={(e) => setTipoPago(e.target.value as "unico" | "cuotas")}
          className="w-full rounded-md border border-slate-300 bg-white/70 px-2 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-800/70 dark:text-slate-100"
        >
          <option value="unico">Pago único al final del plazo</option>
          <option value="cuotas">Cuotas iguales durante el plazo</option>
        </select>
      </div>

      {tipoPago === "cuotas" && (
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">
            Número de cuotas
          </label>
          <input
            type="number"
            name="num_cuotas"
            min="2"
            required
            defaultValue={3}
            className="w-full rounded-md border border-slate-300 bg-white/70 px-2 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-800/70 dark:text-slate-100"
          />
        </div>
      )}

      <div>
        <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">
          Tasa de interés total (%)
        </label>
        <input
          type="number"
          name="tasa_interes"
          min="0"
          step="0.01"
          required
          defaultValue={10}
          className="w-full rounded-md border border-slate-300 bg-white/70 px-2 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-800/70 dark:text-slate-100"
        />
      </div>

      <div className="flex gap-2 pt-1">
        <button type="submit" className="glass-button-accent rounded-full px-4 py-1.5 font-semibold text-white">
          Confirmar aprobación
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-full px-4 py-1.5 text-slate-600 hover:bg-black/5 dark:text-slate-300 dark:hover:bg-white/10"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
