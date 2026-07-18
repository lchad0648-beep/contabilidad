import Link from "next/link";
import { notFound } from "next/navigation";
import { getModule } from "@/lib/modules";
import { listRecords, getRefOptions } from "@/lib/crud";
import { deleteModuleRecord } from "@/lib/actions";

export default async function ModuleListPage({
  params,
}: {
  params: Promise<{ modulo: string }>;
}) {
  const { modulo } = await params;
  const mod = getModule(modulo);
  if (!mod) notFound();

  const records = await listRecords(mod);
  const displayFields = mod.fields.filter((f) => f.type !== "textarea");

  const refLabelMaps: Record<string, Map<number, string>> = {};
  for (const field of mod.fields) {
    if (field.type === "ref" && field.refTable && field.refLabel) {
      const options = await getRefOptions(field.refTable, field.refLabel);
      refLabelMaps[field.name] = new Map(options.map((o) => [o.id, o.label]));
    }
  }

  return (
    <div className="animate-fade-in-up">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-slate-100">
            {mod.icon} {mod.label}
          </h1>
          <p className="text-sm text-gray-500 dark:text-slate-400">{records.length} registro(s)</p>
        </div>
        <Link
          href={`/${mod.slug}/nuevo`}
          className="glass-button-accent rounded-full px-4 py-2 text-sm font-medium text-white"
        >
          + Nuevo
        </Link>
      </div>

      {records.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-black/10 bg-black/[0.02] p-10 text-center text-sm text-gray-500 dark:border-white/10 dark:bg-white/[0.02] dark:text-slate-400">
          Aún no hay registros en {mod.label}.
        </div>
      ) : (
        <div className="glass-card overflow-x-auto rounded-2xl">
          <table className="min-w-full divide-y divide-black/5 text-sm dark:divide-white/5">
            <thead className="bg-black/[0.02] dark:bg-white/[0.03]">
              <tr>
                {displayFields.map((f) => (
                  <th
                    key={f.name}
                    className="px-4 py-2 text-left font-medium text-gray-600 dark:text-slate-300"
                  >
                    {f.label}
                  </th>
                ))}
                <th className="px-4 py-2 text-right font-medium text-gray-600 dark:text-slate-300">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5 dark:divide-white/5">
              {records.map((record) => (
                <tr key={String(record.id)} className="transition hover:bg-black/[0.02] dark:hover:bg-white/[0.03]">
                  {displayFields.map((f) => (
                    <td key={f.name} className="px-4 py-2 text-gray-700 dark:text-slate-300">
                      {formatCell(f, record[f.name], refLabelMaps)}
                    </td>
                  ))}
                  <td className="px-4 py-2 text-right">
                    <Link
                      href={`/${mod.slug}/${record.id}`}
                      className="mr-3 text-blue-600 hover:underline dark:text-blue-400"
                    >
                      Editar
                    </Link>
                    <form
                      action={deleteModuleRecord.bind(null, mod.slug, Number(record.id))}
                      className="inline"
                    >
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

function formatCell(
  field: { name: string; type: string },
  value: unknown,
  refLabelMaps: Record<string, Map<number, string>>
) {
  if (value == null || value === "") return "—";
  if (field.type === "ref") {
    const map = refLabelMaps[field.name];
    return map?.get(Number(value)) ?? "—";
  }
  if (field.type === "number") {
    const n = Number(value);
    return Number.isFinite(n) ? n.toLocaleString("es", { maximumFractionDigits: 2 }) : String(value);
  }
  return String(value);
}
