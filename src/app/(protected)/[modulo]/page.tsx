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
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            {mod.icon} {mod.label}
          </h1>
          <p className="text-sm text-gray-500">{records.length} registro(s)</p>
        </div>
        <Link
          href={`/${mod.slug}/nuevo`}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          + Nuevo
        </Link>
      </div>

      {records.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 bg-white p-10 text-center text-sm text-gray-500">
          Aún no hay registros en {mod.label}.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                {displayFields.map((f) => (
                  <th key={f.name} className="px-4 py-2 text-left font-medium text-gray-600">
                    {f.label}
                  </th>
                ))}
                <th className="px-4 py-2 text-right font-medium text-gray-600">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {records.map((record) => (
                <tr key={String(record.id)} className="hover:bg-gray-50">
                  {displayFields.map((f) => (
                    <td key={f.name} className="px-4 py-2 text-gray-700">
                      {formatCell(f, record[f.name], refLabelMaps)}
                    </td>
                  ))}
                  <td className="px-4 py-2 text-right">
                    <Link
                      href={`/${mod.slug}/${record.id}`}
                      className="mr-3 text-blue-600 hover:underline"
                    >
                      Editar
                    </Link>
                    <form
                      action={deleteModuleRecord.bind(null, mod.slug, Number(record.id))}
                      className="inline"
                    >
                      <button type="submit" className="text-red-600 hover:underline">
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
