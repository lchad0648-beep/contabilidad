import { crearPrestamoAction } from "@/lib/actions";

export default function NuevoPrestamoPage() {
  return (
    <div className="animate-fade-in-up">
      <h1 className="mb-6 text-2xl font-semibold text-slate-900 dark:text-slate-100">
        Solicitar un préstamo
      </h1>

      <form action={crearPrestamoAction} className="glass-card max-w-xl space-y-4 rounded-2xl p-6">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
            Cantidad solicitada
          </label>
          <input
            type="number"
            name="monto_solicitado"
            step="0.01"
            min="1"
            required
            className="w-full rounded-xl border border-black/10 bg-white/60 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-slate-100"
            placeholder="0.00"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
            ¿Para qué necesitas el préstamo?
          </label>
          <textarea
            name="motivo"
            required
            rows={5}
            className="w-full rounded-xl border border-black/10 bg-white/60 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-slate-100"
            placeholder="Cuéntanos el motivo de tu solicitud..."
          />
        </div>
        <button
          type="submit"
          className="glass-button-accent rounded-full px-4 py-2 text-sm font-medium text-white"
        >
          Enviar solicitud
        </button>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Un administrador revisará tu solicitud y definirá el plazo y la tasa de interés al aprobarla.
        </p>
      </form>
    </div>
  );
}
