import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { setUserStatus } from "@/lib/actions";

interface UserRow {
  id: number;
  username: string;
  role: "admin" | "profesional" | "cliente";
  status: "pending" | "approved" | "rejected";
  created_at: string;
  approved_at: string | null;
  cliente_nombre: string | null;
}

const ROLE_LABEL: Record<UserRow["role"], string> = {
  admin: "Admin",
  profesional: "Profesional",
  cliente: "Cliente",
};

const STATUS_LABEL: Record<UserRow["status"], string> = {
  pending: "Pendiente",
  approved: "Aprobado",
  rejected: "Rechazado",
};

const STATUS_COLOR: Record<UserRow["status"], string> = {
  pending: "bg-yellow-100 text-yellow-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
};

export default async function AdminUsuariosPage() {
  const me = await getCurrentUser();
  if (!me || me.role !== "admin") redirect("/");

  const db = getDb();
  const users = (await db
    .prepare(
      `SELECT u.id, u.username, u.role, u.status, u.created_at, u.approved_at, c.nombre as cliente_nombre
       FROM users u
       LEFT JOIN clientes c ON c.id = u.cliente_id
       ORDER BY u.created_at DESC`
    )
    .all()) as UserRow[];

  return (
    <div>
      <h1 className="mb-1 text-2xl font-semibold text-gray-900">🛡️ Usuarios</h1>
      <p className="mb-6 text-sm text-gray-500">
        Solo los usuarios que apruebes aquí podrán iniciar sesión en el sistema.
      </p>

      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left font-medium text-gray-600">Usuario</th>
              <th className="px-4 py-2 text-left font-medium text-gray-600">Rol</th>
              <th className="px-4 py-2 text-left font-medium text-gray-600">Cliente vinculado</th>
              <th className="px-4 py-2 text-left font-medium text-gray-600">Estado</th>
              <th className="px-4 py-2 text-left font-medium text-gray-600">Creado</th>
              <th className="px-4 py-2 text-right font-medium text-gray-600">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-gray-50">
                <td className="px-4 py-2 font-medium text-gray-800">{u.username}</td>
                <td className="px-4 py-2 text-gray-600">{ROLE_LABEL[u.role]}</td>
                <td className="px-4 py-2 text-gray-500">{u.cliente_nombre ?? "—"}</td>
                <td className="px-4 py-2">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLOR[u.status]}`}>
                    {STATUS_LABEL[u.status]}
                  </span>
                </td>
                <td className="px-4 py-2 text-gray-500">{u.created_at}</td>
                <td className="px-4 py-2 text-right">
                  {u.id === me.id ? (
                    <span className="text-xs text-gray-400">Tú</span>
                  ) : (
                    <div className="flex justify-end gap-3">
                      {u.status !== "approved" && (
                        <form action={setUserStatus.bind(null, u.id, "approved")}>
                          <button type="submit" className="text-green-600 hover:underline">
                            Aprobar
                          </button>
                        </form>
                      )}
                      {u.status !== "rejected" && (
                        <form action={setUserStatus.bind(null, u.id, "rejected")}>
                          <button type="submit" className="text-red-600 hover:underline">
                            Rechazar
                          </button>
                        </form>
                      )}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
