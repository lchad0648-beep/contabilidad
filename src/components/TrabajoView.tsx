import { getCurrentUser } from "@/lib/auth";
import { getEmpleoActivoDeUsuario, listMensajesEmpleado } from "@/lib/empresa-empleados";
import { enviarMensajeEmpleadoDesdeUsuarioAction } from "@/lib/empresa-actions";
import Icon from "./Icon";

export default async function TrabajoView() {
  const user = await getCurrentUser();
  if (!user) return null;

  const empleo = await getEmpleoActivoDeUsuario(user.id);

  if (!empleo) {
    return (
      <div className="animate-fade-in-up">
        <h1 className="mb-6 flex items-center gap-2 text-2xl font-semibold text-gray-900 dark:text-slate-100">
          <Icon name="lock" size={22} /> Trabajo
        </h1>
        <div className="rounded-2xl border border-dashed border-black/10 bg-black/[0.02] p-10 text-center text-sm text-gray-500 dark:border-white/10 dark:bg-white/[0.02] dark:text-slate-400">
          <Icon name="lock" size={40} className="mx-auto mb-3 block opacity-25" />
          Todavía no tienes trabajo. Esta pestaña se desbloqueará cuando una empresa te contrate.
        </div>
      </div>
    );
  }

  const mensajes = await listMensajesEmpleado(empleo.id);

  return (
    <div className="animate-fade-in-up">
      <h1 className="mb-1 flex items-center gap-2 text-2xl font-semibold text-gray-900 dark:text-slate-100">
        <Icon name="lock" size={22} weight="filled" /> Trabajo
      </h1>
      <p className="mb-6 text-sm text-gray-500 dark:text-slate-400">
        Trabajas en <span className="font-medium">{empleo.empresa_nombre}</span> desde{" "}
        {new Date(empleo.created_at + "Z").toLocaleDateString("es")}.
      </p>

      <div className="mb-6 grid grid-cols-2 gap-4">
        <div className="glass-card rounded-2xl p-4">
          <p className="text-xs text-gray-500 dark:text-slate-400">Salario</p>
          <p className="text-xl font-semibold text-gray-900 dark:text-slate-100">
            {empleo.salario.toLocaleString("es", { style: "currency", currency: "USD" })}
          </p>
        </div>
        <div className="glass-card rounded-2xl p-4">
          <p className="text-xs text-gray-500 dark:text-slate-400">Total pagado por la empresa</p>
          <p className="text-xl font-semibold text-gray-900 dark:text-slate-100">
            {empleo.gasto_total.toLocaleString("es", { style: "currency", currency: "USD" })}
          </p>
        </div>
      </div>

      {empleo.anotaciones && (
        <div className="mb-6 glass-card rounded-2xl p-4">
          <p className="mb-1 text-xs text-gray-500 dark:text-slate-400">Anotaciones de tu empleador</p>
          <p className="text-sm text-gray-700 dark:text-slate-300">{empleo.anotaciones}</p>
        </div>
      )}

      <div className="glass-card overflow-hidden rounded-2xl">
        <h2 className="flex items-center gap-2 border-b border-black/5 px-5 py-3 text-sm font-semibold text-gray-700 dark:border-white/5 dark:text-slate-200">
          <Icon name="message-circle" size={16} /> Mensajes con tu empleador
        </h2>
        <div className="max-h-96 space-y-3 overflow-y-auto p-4">
          {mensajes.length === 0 && (
            <p className="text-center text-sm text-gray-400 dark:text-slate-500">Sin mensajes todavía.</p>
          )}
          {mensajes.map((m) => (
            <div key={m.id} className={`flex flex-col ${m.autor === "empleado" ? "items-end" : "items-start"}`}>
              <div
                className={`max-w-[80%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm ${
                  m.autor === "empleado"
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
        <form
          action={enviarMensajeEmpleadoDesdeUsuarioAction}
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
