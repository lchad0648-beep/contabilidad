import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getModule } from "@/lib/modules";
import { getRecord, getRefOptions } from "@/lib/crud";
import { updateModuleRecord, deleteModuleRecord, solicitarBorradoAction } from "@/lib/actions";
import { getDb } from "@/lib/db";
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

  const user = await getCurrentUser();
  const esAdmin = user?.role === "admin";

  const refOptions: Record<string, { id: number; label: string }[]> = {};
  for (const field of mod.fields) {
    if (field.type === "ref" && field.refTable && field.refLabel) {
      refOptions[field.refTable] = await getRefOptions(field.refTable, field.refLabel);
    }
  }

  let solicitudPendiente = false;
  if (!esAdmin) {
    const db = getDb();
    const row = (await db
      .prepare(
        `SELECT id FROM solicitudes_borrado WHERE modulo = ? AND registro_id = ? AND estado = 'Pendiente'`
      )
      .get(mod.slug, recordId)) as { id: number } | undefined;
    solicitudPendiente = !!row;
  }

  return (
    <div className="animate-fade-in-up">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-slate-100">
          {mod.icon} Editar — {mod.label}
        </h1>
        {esAdmin ? (
          <form action={deleteModuleRecord.bind(null, mod.slug, recordId)}>
            <button type="submit" className="text-sm text-red-600 hover:underline dark:text-red-400">
              Eliminar registro
            </button>
          </form>
        ) : solicitudPendiente ? (
          <span className="text-sm text-amber-600 dark:text-amber-400">
            Solicitud de borrado pendiente de revisión
          </span>
        ) : (
          <details className="text-sm">
            <summary className="cursor-pointer text-red-600 hover:underline dark:text-red-400">
              Solicitar borrado
            </summary>
            <form
              action={solicitarBorradoAction.bind(null, mod.slug, recordId)}
              className="glass-card mt-2 flex flex-col gap-2 rounded-xl p-3"
            >
              <textarea
                name="motivo"
                rows={2}
                placeholder="Motivo del borrado (opcional)"
                className="w-full rounded-lg border border-black/10 bg-white/60 px-2 py-1 text-sm text-gray-900 focus:border-blue-500 focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-slate-100"
              />
              <button
                type="submit"
                className="self-end rounded-full bg-red-600 px-3 py-1 text-xs font-medium text-white hover:bg-red-700"
              >
                Enviar solicitud a un admin
              </button>
            </form>
          </details>
        )}
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
