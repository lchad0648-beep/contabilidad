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
    <form action={action} className="max-w-xl space-y-4 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      {fields.map((field) => {
        const value = initialValues?.[field.name];
        return (
          <div key={field.name}>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              {field.label}
              {field.required && <span className="text-red-500"> *</span>}
            </label>
            {renderInput(field, value, refOptions)}
          </div>
        );
      })}

      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          {submitLabel}
        </button>
        <Link href={cancelHref} className="text-sm text-gray-600 hover:underline">
          Cancelar
        </Link>
      </div>
    </form>
  );
}

function renderInput(field: FieldConfig, value: unknown, refOptions: RefOptions) {
  const base =
    "w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none";

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
          <option key={opt} value={opt}>
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
        <option value="">-- Ninguno --</option>
        {options.map((opt) => (
          <option key={opt.id} value={opt.id}>
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
