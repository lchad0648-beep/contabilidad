import { notFound } from "next/navigation";
import { getModule } from "@/lib/modules";
import { getRecord, getRefOptions } from "@/lib/crud";
import { updateModuleRecord, deleteModuleRecord } from "@/lib/actions";
import ModuleForm from "@/components/ModuleForm";

export default async function EditModuleRecordPage({
  params,
}: {
  params: Promise<{ modulo: string; id: string }>;
}) {
  const { modulo, id } = await params;
  const mod = getModule(modulo);
  if (!mod) notFound();

  const recordId = Number(id);
  if (!Number.isFinite(recordId)) notFound();

  const record = await getRecord(mod, recordId);
  if (!record) notFound();

  const refOptions: Record<string, { id: number; label: string }[]> = {};
  for (const field of mod.fields) {
    if (field.type === "ref" && field.refTable && field.refLabel) {
      refOptions[field.refTable] = await getRefOptions(field.refTable, field.refLabel);
    }
  }

  return (
    <div className="animate-fade-in-up">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-slate-100">
          {mod.icon} Editar — {mod.label}
        </h1>
        <form action={deleteModuleRecord.bind(null, mod.slug, recordId)}>
          <button type="submit" className="text-sm text-red-600 hover:underline dark:text-red-400">
            Eliminar registro
          </button>
        </form>
      </div>
      <ModuleForm
        fields={mod.fields}
        initialValues={record}
        refOptions={refOptions}
        action={updateModuleRecord.bind(null, mod.slug, recordId)}
        cancelHref={`/${mod.slug}`}
        submitLabel="Guardar cambios"
      />
    </div>
  );
}
