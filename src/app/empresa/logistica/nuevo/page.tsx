"use client";

import { useState } from "react";
import Link from "next/link";
import { crearMaterialAction } from "@/lib/empresa-actions";

type TipoPrecio = "unidad" | "stack64" | "stack_custom";

const TIPO_OPTIONS: { value: TipoPrecio; label: string; description: string }[] = [
  { value: "unidad", label: "Por unidad", description: "El precio ingresado es por cada objeto individual" },
  { value: "stack64", label: "Stack de 64", description: "El precio ingresado es por un stack de 64 unidades" },
  { value: "stack_custom", label: "Stack personalizado", description: "Defines tú el tamaño del stack" },
];

export default function NuevoMaterialPage() {
  const [tipoPrecio, setTipoPrecio] = useState<TipoPrecio>("unidad");

  return (
    <div className="animate-fade-in-up mx-auto max-w-lg">
      <h1 className="mb-6 text-2xl font-semibold text-gray-900 dark:text-slate-100">Añadir material</h1>

      <form action={crearMaterialAction} className="glass-card space-y-4 rounded-2xl p-6">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-300">Nombre</label>
          <input
            name="nombre"
            required
            className="w-full rounded-xl border border-black/10 bg-white/60 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-slate-100"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-300">Cantidad</label>
          <input
            name="cantidad"
            type="number"
            step="any"
            min="0"
            required
            defaultValue={0}
            className="w-full rounded-xl border border-black/10 bg-white/60 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-slate-100"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-slate-300">
            Tipo de precio
          </label>
          <div className="grid grid-cols-1 gap-2">
            {TIPO_OPTIONS.map((opt) => (
              <label
                key={opt.value}
                className={`flex cursor-pointer items-start gap-3 rounded-xl border px-3 py-2 text-sm transition ${
                  tipoPrecio === opt.value
                    ? "border-blue-500 bg-blue-500/10"
                    : "border-black/10 hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/5"
                }`}
              >
                <input
                  type="radio"
                  name="tipo_precio"
                  value={opt.value}
                  className="mt-1"
                  checked={tipoPrecio === opt.value}
                  onChange={() => setTipoPrecio(opt.value)}
                />
                <span>
                  <span className="block font-medium text-gray-800 dark:text-slate-100">{opt.label}</span>
                  <span className="block text-xs text-gray-500 dark:text-slate-400">{opt.description}</span>
                </span>
              </label>
            ))}
          </div>
        </div>

        {tipoPrecio === "stack_custom" && (
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-300">
              Tamaño del stack
            </label>
            <input
              name="stack_size"
              type="number"
              min="1"
              step="1"
              required
              defaultValue={16}
              className="w-full rounded-xl border border-black/10 bg-white/60 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-slate-100"
            />
          </div>
        )}

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-300">
            Precio por{" "}
            {tipoPrecio === "unidad" ? "unidad" : tipoPrecio === "stack64" ? "stack de 64" : "stack"}
          </label>
          <input
            name="precio_por_stack"
            type="number"
            step="any"
            min="0"
            required
            defaultValue={0}
            className="w-full rounded-xl border border-black/10 bg-white/60 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-slate-100"
          />
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            className="glass-button-accent rounded-full px-4 py-2 text-sm font-medium text-white"
          >
            Guardar
          </button>
          <Link
            href="/empresa/logistica"
            className="rounded-full border border-black/10 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-black/5 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/10"
          >
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  );
}
