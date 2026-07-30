import { getCurrentEmpresa } from "@/lib/empresa-auth";
import { getBolsaEstado, getSolicitudConMensajes, getHistorialPrecio } from "@/lib/bolsa";
import { solicitarBolsaAction, enviarMensajeBolsaEmpresaAction, lanzarBolsaAction } from "@/lib/empresa-actions";
import PriceChart from "@/components/PriceChart";
import CountdownTimer from "@/components/CountdownTimer";
import Icon from "@/components/Icon";
import LanzamientoForm from "@/components/LanzamientoForm";

export default async function EmpresaBolsaPage() {
  const empresa = await getCurrentEmpresa();
  if (!empresa) return null;

  const estado = await getBolsaEstado(empresa.id);

  if (estado.tipo === "sin_solicitud") {
    return (
      <div className="animate-fade-in-up mx-auto max-w-lg">
        <h1 className="mb-1 flex items-center gap-2 text-2xl font-semibold text-gray-900 dark:text-slate-100">
          <Icon name="lock" size={22} /> Bolsa
        </h1>
        <p className="mb-6 text-sm text-gray-500 dark:text-slate-400">
          Tu empresa todavía no cotiza en bolsa. Abre un ticket para que un admin o profesional revise tu
          salida a bolsa.
        </p>
        <div className="glass-card rounded-2xl p-6 text-center">
          <Icon name="lock" size={48} className="mx-auto mb-4 opacity-40" />
          <form action={solicitarBolsaAction} className="space-y-3 text-left">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-300">
                Cuéntale al banco por qué quieres salir a bolsa
              </label>
              <textarea
                name="mensaje"
                rows={3}
                required
                className="w-full rounded-xl border border-black/10 bg-white/60 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-slate-100"
              />
            </div>
            <button
              type="submit"
              className="glass-button-accent w-full rounded-full px-4 py-2 text-sm font-medium text-white"
            >
              Abrir ticket de salida a bolsa
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (estado.tipo === "rechazada_cooldown") {
    return (
      <div className="animate-fade-in-up mx-auto max-w-lg text-center">
        <h1 className="mb-1 flex items-center justify-center gap-2 text-2xl font-semibold text-red-600 dark:text-red-400">
          <Icon name="lock" size={22} weight="filled" /> Bolsa bloqueada
        </h1>
        <p className="mb-6 text-sm text-gray-500 dark:text-slate-400">
          Tu solicitud fue rechazada. Debes esperar antes de volver a intentarlo.
        </p>
        <div className="glass-card animate-glow-red rounded-2xl p-8">
          <Icon name="lock" size={48} weight="filled" className="mx-auto mb-4 text-red-500" />
          <p className="text-3xl text-red-600 dark:text-red-400">
            <CountdownTimer targetMs={estado.hastaMs} />
          </p>
        </div>
      </div>
    );
  }

  if (estado.tipo === "pendiente" || estado.tipo === "aprobada_config_pendiente") {
    const detalle = await getSolicitudConMensajes(estado.solicitud.id);
    return (
      <div className="animate-fade-in-up mx-auto max-w-lg">
        <h1 className="mb-1 flex items-center gap-2 text-2xl font-semibold text-gray-900 dark:text-slate-100">
          <Icon name="lock" size={22} /> Bolsa
        </h1>
        <p className="mb-6 text-sm text-gray-500 dark:text-slate-400">
          {estado.tipo === "pendiente"
            ? "Tu solicitud está en revisión por un admin o profesional."
            : "¡Fuiste aprobado! Define el % de acciones que sale a bolsa para lanzar."}
        </p>

        {estado.tipo === "aprobada_config_pendiente" && (
          <LanzamientoForm
            comisionPct={estado.solicitud.comision_pct ?? 0}
            totalAcciones={estado.solicitud.total_acciones ?? 0}
            valorEmpresa={estado.solicitud.valor_empresa ?? 0}
            action={lanzarBolsaAction}
          />
        )}

        <div className="glass-card mt-6 overflow-hidden rounded-2xl">
          <h2 className="flex items-center gap-2 border-b border-black/5 px-5 py-3 text-sm font-semibold text-gray-700 dark:border-white/5 dark:text-slate-200">
            <Icon name="message-circle" size={16} /> Conversación con el banco
          </h2>
          <div className="max-h-72 space-y-3 overflow-y-auto p-4">
            {detalle?.mensajes.length === 0 && (
              <p className="text-center text-sm text-gray-400 dark:text-slate-500">Sin mensajes todavía.</p>
            )}
            {detalle?.mensajes.map((m) => (
              <div key={m.id} className={`flex flex-col ${m.autor_tipo === "empresa" ? "items-end" : "items-start"}`}>
                <div
                  className={`max-w-[80%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm ${
                    m.autor_tipo === "empresa"
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
            action={enviarMensajeBolsaEmpresaAction.bind(null, estado.solicitud.id)}
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

  // lanzada
  const { acciones } = estado;
  const historial = (await getHistorialPrecio(empresa.id, 24 * 7)).map((h) => ({
    date: new Date(h.created_at + "Z"),
    value: h.precio,
  }));
  const valorMercado = acciones.acciones_mercado_totales * acciones.precio_actual;

  return (
    <div className="animate-fade-in-up">
      <h1 className="mb-1 flex items-center gap-2 text-2xl font-semibold text-gray-900 dark:text-slate-100">
        <Icon name="graph-up" size={22} /> Bolsa
      </h1>
      <p className="mb-6 text-sm text-gray-500 dark:text-slate-400">
        Tu empresa cotiza en bolsa desde {new Date(acciones.lanzada_at + "Z").toLocaleDateString("es")}.
      </p>

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="glass-card rounded-2xl p-4">
          <p className="text-xs text-gray-500 dark:text-slate-400">Precio actual</p>
          <p className="text-xl font-semibold text-gray-900 dark:text-slate-100">
            {acciones.precio_actual.toLocaleString("es", { style: "currency", currency: "USD" })}
          </p>
        </div>
        <div className="glass-card rounded-2xl p-4">
          <p className="text-xs text-gray-500 dark:text-slate-400">Acciones disponibles</p>
          <p className="text-xl font-semibold text-gray-900 dark:text-slate-100">
            {acciones.acciones_disponibles.toLocaleString("es")} / {acciones.acciones_mercado_totales.toLocaleString("es")}
          </p>
        </div>
        <div className="glass-card rounded-2xl p-4">
          <p className="text-xs text-gray-500 dark:text-slate-400">Valor de mercado</p>
          <p className="text-xl font-semibold text-gray-900 dark:text-slate-100">
            {valorMercado.toLocaleString("es", { style: "currency", currency: "USD" })}
          </p>
        </div>
        <div className="glass-card rounded-2xl p-4">
          <p className="text-xs text-gray-500 dark:text-slate-400">Precio de salida</p>
          <p className="text-xl font-semibold text-gray-900 dark:text-slate-100">
            {acciones.precio_salida.toLocaleString("es", { style: "currency", currency: "USD" })}
          </p>
        </div>
      </div>

      <div className="glass-card rounded-2xl p-5">
        <h2 className="mb-3 text-sm font-semibold text-gray-700 dark:text-slate-200">Precio de la acción</h2>
        <PriceChart data={historial} gradientId="empresa-bolsa-precio" />
      </div>
    </div>
  );
}
