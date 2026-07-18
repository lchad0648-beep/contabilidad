import Link from "next/link";
import { FieldConfig } from "@/lib/modules";

interface RefOptions {
  [refTable: string]: { id: number; label: string }[];
}

export default function ModuleForm({
  fields,
  initialValues,
  refOptions,
  action,
  cancelHref,
  submitLabel,
}: {
  fields: FieldConfig[];
  initialValues?: Record<string, unknown>;
  refOptions: RefOptions;
  action: (formData: FormData) => void;
  cancelHref: string;
  submitLabel: string;
}) {
  return (
    <form action={action} className="glass-card max-w-xl space-y-4 rounded-2xl p-6">
      {fields.map((field) => {
        const value = initialValues?.[field.name];
        return (
          <div key={field.name}>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-300">
              {field.label}
              {field.required && <span className="text-red-500 dark:text-red-400"> *</span>}
            </label>
            {renderInput(field, value, refOptions)}
          </div>
        );
      })}

      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          className="glass-button-accent rounded-full px-4 py-2 text-sm font-medium text-white"
        >
          {submitLabel}
        </button>
        <Link
          href={cancelHref}
          className="text-sm text-gray-600 hover:underline dark:text-slate-400"
        >
          Cancelar
        </Link>
      </div>
    </form>
  );
}

function renderInput(field: FieldConfig, value: unknown, refOptions: RefOptions) {
  const base =
    "w-full rounded-xl border border-black/10 bg-white/60 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-slate-100";

  if (field.type === "textarea") {
    return (
      <textarea
        name={field.name}
        defaultValue={value != null ? String(value) : ""}
        required={field.required}
        rows={3}
        className={base}
      />
    );
  }

  if (field.type === "select") {
    return (
      <select
        name={field.name}
        defaultValue={value != null ? String(value) : field.options?.[0] ?? ""}
        required={field.required}
        className={base}
      >
        {field.options?.map((opt) => (
          <option key={opt} value={opt} className="dark:bg-slate-800">
            {opt}
          </option>
        ))}
      </select>
    );
  }

  if (field.type === "ref") {
    const options = field.refTable ? refOptions[field.refTable] ?? [] : [];
    return (
      <select
        name={field.name}
        defaultValue={value != null ? String(value) : ""}
        required={field.required}
        className={base}
      >
        <option value="" className="dark:bg-slate-800">
          -- Ninguno --
        </option>
        {options.map((opt) => (
          <option key={opt.id} value={opt.id} className="dark:bg-slate-800">
            {opt.label}
          </option>
        ))}
      </select>
    );
  }

  if (field.type === "number") {
    return (
      <input
        type="number"
        step="any"
        name={field.name}
        defaultValue={value != null ? String(value) : ""}
        required={field.required}
        className={base}
      />
    );
  }

  if (field.type === "date") {
    return (
      <input
        type="date"
        name={field.name}
        defaultValue={value != null ? String(value).slice(0, 10) : ""}
        required={field.required}
        className={base}
      />
    );
  }

  return (
    <input
      type="text"
      name={field.name}
      defaultValue={value != null ? String(value) : ""}
      required={field.required}
      className={base}
    />
  );
}
