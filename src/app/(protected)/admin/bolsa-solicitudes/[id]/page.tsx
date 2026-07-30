import { redirect, notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getSolicitudConMensajes } from "@/lib/bolsa";
import {
  aprobarSolicitudBolsaAction,
  rechazarSolicitudBolsaAction,
  enviarMensajeBolsaStaffAction,
} from "@/lib/empresa-actions";
import Icon from "@/components/Icon";

export default async function BolsaSolicitudDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const me = await getCurrentUser();
  if (!me || me.role === "cliente") redirect("/");

  const { id } = await params;
  const detalle = await getSolicitudConMensajes(Number(id));
  if (!detalle) notFound();
  const { solicitud, mensajes } = detalle;

  return (
    <div className="animate-fade-in-up mx-auto max-w-2xl">
      <h1 className="mb-1 text-2xl font-semibold text-gray-900 dark:text-slate-100">{solicitud.empresa_nombre}</h1>
      <p className="mb-6 text-sm text-gray-500 dark:text-slate-400">
        Solicitud de salida a bolsa · {solicitud.estado}
      </p>

      {solicitud.estado === "Pendiente" && (
        <div className="mb-6 glass-card rounded-2xl p-5">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-slate-200">
            <Icon name="graph-up" size={16} /> Aprobar salida a bolsa
          </h2>
          <form action={aprobarSolicitudBolsaAction.bind(null, solicitud.id)} className="space-y-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-300">
                Comisión del banco (% de lo que salga a mercado)
              </label>
              <input
                name="comision_pct"
                type="number"
                step="any"
                min="0"
                max="100"
                required
                defaultValue={5}
                className="w-full rounded-xl border border-black/10 bg-white/60 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-300">
                Total de acciones en las que se divide la empresa
              </label>
              <input
                name="total_acciones"
                type="number"
                step="1"
                min="1"
                required
                defaultValue={1000}
                className="w-full rounded-xl border border-black/10 bg-white/60 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-300">
                Valor total de la empresa (define el precio por acción)
              </label>
              <input
                name="valor_empresa"
                type="number"
                step="any"
                min="0"
                required
                className="w-full rounded-xl border border-black/10 bg-white/60 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-slate-100"
              />
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                className="glass-button-accent rounded-full px-4 py-2 text-sm font-medium text-white"
              >
                Aprobar
              </button>
              <button
                formAction={rechazarSolicitudBolsaAction.bind(null, solicitud.id)}
                className="rounded-full border border-red-500/30 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-500/10 dark:text-red-400"
              >
                Rechazar (bloquea 12h)
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="glass-card overflow-hidden rounded-2xl">
        <h2 className="flex items-center gap-2 border-b border-black/5 px-5 py-3 text-sm font-semibold text-gray-700 dark:border-white/5 dark:text-slate-200">
          <Icon name="message-circle" size={16} /> Conversación
        </h2>
        <div className="max-h-80 space-y-3 overflow-y-auto p-4">
          {mensajes.length === 0 && (
            <p className="text-center text-sm text-gray-400 dark:text-slate-500">Sin mensajes todavía.</p>
          )}
          {mensajes.map((m) => (
            <div key={m.id} className={`flex flex-col ${m.autor_tipo === "staff" ? "items-end" : "items-start"}`}>
              <div
                className={`max-w-[80%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm ${
                  m.autor_tipo === "staff"
                    ? "glass-button-accent text-white"
                    : "bg-black/5 text-gray-800 dark:bg-white/10 dark:text-slate-100"
                }`}
              >
                <p className="mb-0.5 text-[10px] opacity-70">{m.autor_nombre}</p>
                {m.mensaje}
              </div>
            </div>
          ))}
        </div>
        <form
          action={enviarMensajeBolsaStaffAction.bind(null, solicitud.id)}
          className="flex gap-2 border-t border-black/5 p-3 dark:border-white/5"
        >
          <input
            name="mensaje"
            placeholder="Escribe un mensaje..."
            className="flex-1 rounded-full border border-black/10 bg-white/60 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-slate-100"
          />
          <button
            type="submit"
            className="glass-button-accent flex items-center justify-center rounded-full px-4 py-2 text-sm font-medium text-white"
          >
            <Icon name="send" size={16} />
          </button>
        </form>
      </div>
    </div>
  );
}
