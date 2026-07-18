import { notFound } from "next/navigation";
import { getModule } from "@/lib/modules";
import { getRefOptions } from "@/lib/crud";
import { createModuleRecord } from "@/lib/actions";
import ModuleForm from "@/components/ModuleForm";

export default async function NewModuleRecordPage({
  params,
}: {
  params: Promise<{ modulo: string }>;
}) {
  const { modulo } = await params;
  const mod = getModule(modulo);
  if (!mod) notFound();

  const refOptions: Record<string, { id: number; label: string }[]> = {};
  for (const field of mod.fields) {
    if (field.type === "ref" && field.refTable && field.refLabel) {
      refOptions[field.refTable] = await getRefOptions(field.refTable, field.refLabel);
    }
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-gray-900">
        {mod.icon} Nuevo — {mod.label}
      </h1>
      <ModuleForm
        fields={mod.fields}
        refOptions={refOptions}
        action={createModuleRecord.bind(null, mod.slug)}
        cancelHref={`/${mod.slug}`}
        submitLabel="Guardar"
      />
    </div>
  );
}
