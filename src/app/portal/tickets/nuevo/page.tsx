import { createTicketAction } from "@/lib/actions";

export default function NewTicketPage() {
  return (
    <div className="animate-fade-in-up">
      <h1 className="mb-6 text-2xl font-semibold text-slate-900 dark:text-slate-100">
        Nuevo ticket de soporte
      </h1>

      <form action={createTicketAction} className="glass-card max-w-xl space-y-4 rounded-2xl p-6">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
            Asunto
          </label>
          <input
            name="asunto"
            required
            className="w-full rounded-xl border border-black/10 bg-white/60 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-slate-100"
            placeholder="Ej: Duda sobre mi última factura"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
            Mensaje
          </label>
          <textarea
            name="mensaje"
            required
            rows={5}
            className="w-full rounded-xl border border-black/10 bg-white/60 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-slate-100"
            placeholder="Cuéntanos en qué te podemos ayudar..."
          />
        </div>
        <button
          type="submit"
          className="glass-button-accent rounded-full px-4 py-2 text-sm font-medium text-white"
        >
          Enviar ticket
        </button>
      </form>
    </div>
  );
}
