import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getAccionesEmpresa, getHistorialPrecio, getTenencia, listTransaccionesUsuario } from "@/lib/bolsa";
import { getEmpresa } from "@/lib/empresas";
import CandleChart from "./CandleChart";
import BolsaTradeForm from "./BolsaTradeForm";
import Icon from "./Icon";

export default async function BolsaEmpresaDetalleView({ empresaId }: { empresaId: number }) {
  const user = await getCurrentUser();
  if (!user) return null;

  const [empresa, acciones] = await Promise.all([getEmpresa(empresaId), getAccionesEmpresa(empresaId)]);
  if (!empresa || !acciones) notFound();

  const [historial, tenencia, transacciones] = await Promise.all([
    getHistorialPrecio(empresaId, 24 * 7),
    getTenencia(empresaId, user.id),
    listTransaccionesUsuario(empresaId, user.id),
  ]);

  const puntos = historial.map((h) => ({ date: new Date(h.created_at + "Z"), value: h.precio }));
  const valorMercado = acciones.acciones_mercado_totales * acciones.precio_actual;

  return (
    <div className="animate-fade-in-up">
      <h1 className="mb-1 flex items-center gap-2 text-2xl font-semibold text-gray-900 dark:text-slate-100">
        <Icon name="graph-up" size={22} /> {empresa.nombre}
      </h1>
      <p className="mb-6 text-sm text-gray-500 dark:text-slate-400">
        {acciones.acciones_disponibles.toLocaleString("es")} de {acciones.acciones_mercado_totales.toLocaleString("es")}{" "}
        acciones disponibles en mercado
      </p>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="mb-6 grid grid-cols-2 gap-4">
            <div className="glass-card rounded-2xl p-4">
              <p className="text-xs text-gray-500 dark:text-slate-400">Precio actual</p>
              <p className="text-xl font-semibold text-gray-900 dark:text-slate-100">
                {acciones.precio_actual.toLocaleString("es", { style: "currency", currency: "USD" })}
              </p>
            </div>
            <div className="glass-card rounded-2xl p-4">
              <p className="text-xs text-gray-500 dark:text-slate-400">Valor de mercado</p>
              <p className="text-xl font-semibold text-gray-900 dark:text-slate-100">
                {valorMercado.toLocaleString("es", { style: "currency", currency: "USD" })}
              </p>
            </div>
          </div>

          <div className="glass-card mb-6 rounded-2xl p-5">
            <CandleChart data={puntos} />
          </div>

          <div className="glass-card overflow-hidden rounded-2xl">
            <h2 className="border-b border-black/5 px-5 py-3 text-sm font-semibold text-gray-700 dark:border-white/5 dark:text-slate-200">
              Tu historial de operaciones
            </h2>
            {transacciones.length === 0 ? (
              <p className="p-6 text-center text-sm text-gray-400 dark:text-slate-500">
                Todavía no has operado esta acción.
              </p>
            ) : (
              <table className="min-w-full divide-y divide-black/5 text-sm dark:divide-white/5">
                <tbody className="divide-y divide-black/5 dark:divide-white/5">
                  {transacciones.map((t) => (
                    <tr key={t.id}>
                      <td
                        className={`px-5 py-2 font-medium ${
                          t.tipo === "compra"
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-red-600 dark:text-red-400"
                        }`}
                      >
                        {t.tipo === "compra" ? "Compra" : "Venta"}
                      </td>
                      <td className="px-5 py-2 text-right text-gray-700 dark:text-slate-300">
                        {t.cantidad.toLocaleString("es")} acc.
                      </td>
                      <td className="px-5 py-2 text-right text-gray-700 dark:text-slate-300">
                        {t.total.toLocaleString("es", { style: "currency", currency: "USD" })}
                      </td>
                      <td className="px-5 py-2 text-right text-xs text-gray-400 dark:text-slate-500">
                        {new Date(t.created_at + "Z").toLocaleString("es")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <BolsaTradeForm
          empresaId={empresaId}
          precioActual={acciones.precio_actual}
          tenencia={tenencia}
          saldoUsuario={user.saldo}
        />
      </div>
    </div>
  );
}
