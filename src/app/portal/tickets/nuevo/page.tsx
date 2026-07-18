import { createTicketAction } from "@/lib/actions";

export default function NewTicketPage() {
  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-slate-900">Nuevo ticket de soporte</h1>

      <form
        action={createTicketAction}
        className="max-w-xl space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Asunto</label>
          <input
            name="asunto"
            required
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            placeholder="Ej: Duda sobre mi última factura"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Mensaje</label>
          <textarea
            name="mensaje"
            required
            rows={5}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            placeholder="Cuéntanos en qué te podemos ayudar..."
          />
        </div>
        <button
          type="submit"
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Enviar ticket
        </button>
      </form>
    </div>
  );
}
