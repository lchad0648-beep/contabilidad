import Link from "next/link";
import { getCurrentEmpresa } from "@/lib/empresa-auth";
import { listMateriales, precioUnitario, totalMaterial } from "@/lib/empresa-materiales";
import { eliminarMaterialAction } from "@/lib/empresa-actions";
import Icon from "@/components/Icon";

const TIPO_LABEL: Record<string, string> = {
  unidad: "Por unidad",
  stack64: "Stack de 64",
  stack_custom: "Stack personalizado",
};

export default async function LogisticaPage() {
  const empresa = await getCurrentEmpresa();
  if (!empresa) return null;

  const materiales = await listMateriales(empresa.id);
  const totalGeneral = materiales.reduce((acc, m) => acc + totalMaterial(m), 0);

  return (
    <div className="animate-fade-in-up">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold text-gray-900 dark:text-slate-100">
            <Icon name="box" size={22} /> Logística
          </h1>
          <p className="text-sm text-gray-500 dark:text-slate-400">{materiales.length} material(es)</p>
        </div>
        <Link
          href="/empresa/logistica/nuevo"
          className="glass-button-accent rounded-full px-4 py-2 text-sm font-medium text-white"
        >
          + Añadir objeto
        </Link>
      </div>

      <div className="mb-6 glass-card rounded-2xl p-5">
        <p className="text-xs text-gray-500 dark:text-slate-400">Total general del inventario</p>
        <p className="text-2xl font-semibold text-gray-900 dark:text-slate-100">
          {totalGeneral.toLocaleString("es", { style: "currency", currency: "USD" })}
        </p>
      </div>

      {materiales.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-black/10 bg-black/[0.02] p-10 text-center text-sm text-gray-500 dark:border-white/10 dark:bg-white/[0.02] dark:text-slate-400">
          <Icon name="box" size={40} className="mx-auto mb-3 block opacity-25" />
          Aún no has añadido ningún material.
        </div>
      ) : (
        <div className="glass-card overflow-x-auto rounded-2xl">
          <table className="min-w-full divide-y divide-black/5 text-sm dark:divide-white/5">
            <thead className="bg-black/[0.02] dark:bg-white/[0.03]">
              <tr>
                <th className="px-4 py-2 text-left font-medium text-gray-600 dark:text-slate-300">Material</th>
                <th className="px-4 py-2 text-right font-medium text-gray-600 dark:text-slate-300">Cantidad</th>
                <th className="px-4 py-2 text-left font-medium text-gray-600 dark:text-slate-300">Precio</th>
                <th className="px-4 py-2 text-right font-medium text-gray-600 dark:text-slate-300">
                  Precio unitario
                </th>
                <th className="px-4 py-2 text-right font-medium text-gray-600 dark:text-slate-300">Total</th>
                <th className="px-4 py-2 text-right font-medium text-gray-600 dark:text-slate-300">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5 dark:divide-white/5">
              {materiales.map((m) => (
                <tr key={m.id} className="transition hover:bg-black/[0.02] dark:hover:bg-white/[0.03]">
                  <td className="px-4 py-2 font-medium text-gray-800 dark:text-slate-100">{m.nombre}</td>
                  <td className="px-4 py-2 text-right text-gray-700 dark:text-slate-300">
                    {m.cantidad.toLocaleString("es")}
                  </td>
                  <td className="px-4 py-2 text-gray-600 dark:text-slate-400">
                    {m.precio_por_stack.toLocaleString("es", { style: "currency", currency: "USD" })} /{" "}
                    {TIPO_LABEL[m.tipo_precio]}
                    {m.tipo_precio === "stack_custom" ? ` (${m.stack_size})` : ""}
                  </td>
                  <td className="px-4 py-2 text-right text-gray-700 dark:text-slate-300">
                    {precioUnitario(m).toLocaleString("es", { style: "currency", currency: "USD" })}
                  </td>
                  <td className="px-4 py-2 text-right font-semibold text-gray-900 dark:text-slate-100">
                    {totalMaterial(m).toLocaleString("es", { style: "currency", currency: "USD" })}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <form action={eliminarMaterialAction.bind(null, m.id)} className="inline">
                      <button type="submit" className="text-red-600 hover:underline dark:text-red-400">
                        Eliminar
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
