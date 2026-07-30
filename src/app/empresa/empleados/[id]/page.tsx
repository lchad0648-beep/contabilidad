import { notFound } from "next/navigation";
import { getCurrentEmpresa } from "@/lib/empresa-auth";
import { getEmpleado, listMensajesEmpleado } from "@/lib/empresa-empleados";
import {
  actualizarEmpleadoAction,
  despedirEmpleadoAction,
  pagarSalarioAction,
  enviarMensajeEmpleadoDesdeEmpresaAction,
} from "@/lib/empresa-actions";
import Icon from "@/components/Icon";

export default async function EmpleadoDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const empresa = await getCurrentEmpresa();
  if (!empresa) return null;

  const empleado = await getEmpleado(empresa.id, Number(id));
  if (!empleado) notFound();

  const mensajes = await listMensajesEmpleado(empleado.id);

  return (
    <div className="animate-fade-in-up mx-auto max-w-2xl">
      <h1 className="mb-1 text-2xl font-semibold text-gray-900 dark:text-slate-100">{empleado.username}</h1>
      <p className="mb-6 text-sm text-gray-500 dark:text-slate-400">
        Empleado desde {new Date(empleado.created_at + "Z").toLocaleDateString("es")}
        {empleado.estado === "despedido" && " · Despedido"}
      </p>

      <div className="mb-6 grid grid-cols-2 gap-4">
        <div className="glass-card rounded-2xl p-4">
          <p className="text-xs text-gray-500 dark:text-slate-400">Gasto total</p>
          <p className="text-xl font-semibold text-gray-900 dark:text-slate-100">
            {empleado.gasto_total.toLocaleString("es", { style: "currency", currency: "USD" })}
          </p>
        </div>
        <div className="glass-card rounded-2xl p-4">
          <p className="text-xs text-gray-500 dark:text-slate-400">Salario actual</p>
          <p className="text-xl font-semibold text-gray-900 dark:text-slate-100">
            {empleado.salario.toLocaleString("es", { style: "currency", currency: "USD" })}
          </p>
        </div>
      </div>

      {empleado.estado === "activo" && (
        <div className="mb-6 glass-card rounded-2xl p-5">
          <h2 className="mb-3 text-sm font-semibold text-gray-700 dark:text-slate-200">Salario y anotaciones</h2>
          <form action={actualizarEmpleadoAction.bind(null, empleado.id)} className="space-y-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-300">Salario</label>
              <input
                name="salario"
                type="number"
                step="any"
                min="0"
                defaultValue={empleado.salario}
                className="w-full rounded-xl border border-black/10 bg-white/60 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-300">
                Anotaciones
              </label>
              <textarea
                name="anotaciones"
                rows={3}
                defaultValue={empleado.anotaciones ?? ""}
                className="w-full rounded-xl border border-black/10 bg-white/60 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-slate-100"
              />
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                className="glass-button-accent rounded-full px-4 py-2 text-sm font-medium text-white"
              >
                Guardar
              </button>
              <button
                formAction={pagarSalarioAction.bind(null, empleado.id)}
                className="rounded-full border border-black/10 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-black/5 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/10"
              >
                Pagar salario ahora
              </button>
              <button
                formAction={despedirEmpleadoAction.bind(null, empleado.id)}
                className="rounded-full border border-red-500/30 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-500/10 dark:text-red-400"
              >
                Despedir
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="glass-card overflow-hidden rounded-2xl">
        <h2 className="flex items-center gap-2 border-b border-black/5 px-5 py-3 text-sm font-semibold text-gray-700 dark:border-white/5 dark:text-slate-200">
          <Icon name="message-circle" size={16} /> Mensajes
        </h2>
        <div className="max-h-96 space-y-3 overflow-y-auto p-4">
          {mensajes.length === 0 && (
            <p className="text-center text-sm text-gray-400 dark:text-slate-500">Sin mensajes todavía.</p>
          )}
          {mensajes.map((m) => (
            <div key={m.id} className={`flex flex-col ${m.autor === "empresa" ? "items-end" : "items-start"}`}>
              <div
                className={`max-w-[80%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm ${
                  m.autor === "empresa"
                    ? "glass-button-accent text-white"
                    : "bg-black/5 text-gray-800 dark:bg-white/10 dark:text-slate-100"
                }`}
              >
                {m.mensaje}
              </div>
              <span className="mt-0.5 text-[10px] text-gray-400 dark:text-slate-500">
                {new Date(m.created_at + "Z").toLocaleString("es")}
              </span>
            </div>
          ))}
        </div>
        {empleado.estado === "activo" && (
          <form
            action={enviarMensajeEmpleadoDesdeEmpresaAction.bind(null, empleado.id)}
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
        )}
      </div>
    </div>
  );
}
