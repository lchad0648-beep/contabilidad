"use client";

import { useState } from "react";
import Icon from "./Icon";

export default function LanzamientoForm({
  comisionPct,
  totalAcciones,
  valorEmpresa,
  action,
}: {
  comisionPct: number;
  totalAcciones: number;
  valorEmpresa: number;
  action: (formData: FormData) => void;
}) {
  const [pctSalida, setPctSalida] = useState(50);

  const accionesSalida = Math.round(totalAcciones * (pctSalida / 100));
  const accionesBanco = Math.round(accionesSalida * (comisionPct / 100));
  const accionesMercado = accionesSalida - accionesBanco;
  const precioSalida = totalAcciones > 0 ? valorEmpresa / totalAcciones : 0;

  return (
    <div className="glass-card rounded-2xl p-6">
      <div className="mb-4 grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-xs text-gray-500 dark:text-slate-400">Comisión del banco</p>
          <p className="font-medium text-gray-800 dark:text-slate-100">{comisionPct}%</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 dark:text-slate-400">Total de acciones</p>
          <p className="font-medium text-gray-800 dark:text-slate-100">{totalAcciones.toLocaleString("es")}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 dark:text-slate-400">Valor de la empresa</p>
          <p className="font-medium text-gray-800 dark:text-slate-100">
            {valorEmpresa.toLocaleString("es", { style: "currency", currency: "USD" })}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500 dark:text-slate-400">Precio de salida por acción</p>
          <p className="font-medium text-gray-800 dark:text-slate-100">
            {precioSalida.toLocaleString("es", { style: "currency", currency: "USD" })}
          </p>
        </div>
      </div>

      <form action={action} className="space-y-4">
        <div>
          <label className="mb-1 flex items-center justify-between text-sm font-medium text-gray-700 dark:text-slate-300">
            <span>% de acciones que sale a bolsa</span>
            <span className="text-blue-600 dark:text-blue-400">{pctSalida}%</span>
          </label>
          <input
            type="range"
            name="pct_salida"
            min={1}
            max={100}
            value={pctSalida}
            onChange={(e) => setPctSalida(Number(e.target.value))}
            className="w-full"
          />
        </div>

        <div className="rounded-xl bg-black/[0.03] p-4 text-sm dark:bg-white/[0.03]">
          <p className="mb-2 flex items-center gap-1.5 font-medium text-gray-700 dark:text-slate-200">
            <Icon name="graph-up" size={14} /> Resultado al lanzar
          </p>
          <div className="space-y-1 text-gray-600 dark:text-slate-300">
            <p>
              Acciones que salen en total: <b>{accionesSalida.toLocaleString("es")}</b>
            </p>
            <p>
              El banco se lleva ({comisionPct}% de ese {pctSalida}%): <b>{accionesBanco.toLocaleString("es")}</b>{" "}
              acciones
            </p>
            <p>
              Disponibles para el público: <b>{accionesMercado.toLocaleString("es")}</b> acciones
            </p>
          </div>
        </div>

        <button
          type="submit"
          disabled={accionesMercado <= 0}
          className="glass-button-accent w-full rounded-full px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          Confirmar salida a bolsa
        </button>
      </form>
    </div>
  );
}
