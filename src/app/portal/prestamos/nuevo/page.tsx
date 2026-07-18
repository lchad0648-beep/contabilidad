import { crearPrestamoAction } from "@/lib/actions";

export default function NuevoPrestamoPage() {
  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-slate-900">Solicitar un préstamo</h1>

      <form
        action={crearPrestamoAction}
        className="max-w-xl space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Cantidad solicitada</label>
          <input
            type="number"
            name="monto_solicitado"
            step="0.01"
            min="1"
            required
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            placeholder="0.00"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">¿Para qué necesitas el préstamo?</label>
          <textarea
            name="motivo"
            required
            rows={5}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            placeholder="Cuéntanos el motivo de tu solicitud..."
          />
        </div>
        <button
          type="submit"
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Enviar solicitud
        </button>
        <p className="text-xs text-slate-500">
          Un administrador revisará tu solicitud y definirá el plazo y la tasa de interés al aprobarla.
        </p>
      </form>
    </div>
  );
}
