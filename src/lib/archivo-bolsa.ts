import { getDb } from "./db";

const DIAS_A_CONSERVAR = 13;

export interface FilaHistorialArchivable {
  id: number;
  empresa_nombre: string;
  precio: number;
  created_at: string;
}

/** Filas de acciones_precio_historial con más de DIAS_A_CONSERVAR días de antigüedad. */
export async function listFilasParaArchivar(): Promise<FilaHistorialArchivable[]> {
  const db = getDb();
  return (await db
    .prepare(
      `SELECT h.id, e.nombre as empresa_nombre, h.precio, h.created_at
       FROM acciones_precio_historial h
       JOIN empresas e ON e.id = h.empresa_id
       WHERE h.created_at < now() - interval '${DIAS_A_CONSERVAR} days'
       ORDER BY h.created_at ASC`
    )
    .all()) as FilaHistorialArchivable[];
}

export function filasACsv(filas: FilaHistorialArchivable[]): string {
  const encabezado = "empresa,precio,fecha";
  const escapar = (valor: string) => (/[",\n]/.test(valor) ? `"${valor.replace(/"/g, '""')}"` : valor);
  const lineas = filas.map((f) => `${escapar(f.empresa_nombre)},${f.precio},${f.created_at}`);
  return [encabezado, ...lineas].join("\n");
}

export async function borrarFilasArchivadas(ids: number[]): Promise<void> {
  if (ids.length === 0) return;
  const db = getDb();
  await db.prepare(`DELETE FROM acciones_precio_historial WHERE id = ANY($1)`).run(ids);
}

/**
 * Sube el CSV al repositorio de GitHub del proyecto (Contents API), en
 * data/bolsa-historico/<fecha>.csv. Cada corrida crea un archivo nuevo (no
 * pisa uno existente), así que no hace falta leer el SHA de un archivo previo.
 */
export async function subirCsvAGitHub(nombreArchivo: string, contenido: string): Promise<{ url: string }> {
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO;
  if (!token || !repo) {
    throw new Error("Falta GITHUB_TOKEN o GITHUB_REPO para subir el archivo de historial.");
  }

  const path = `data/bolsa-historico/${nombreArchivo}`;
  const res = await fetch(`https://api.github.com/repos/${repo}/contents/${path}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message: `Archiva historial de precios de bolsa (${nombreArchivo})`,
      content: Buffer.from(contenido, "utf-8").toString("base64"),
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`GitHub API error (${res.status}): ${detail.slice(0, 300)}`);
  }

  const data = (await res.json()) as { content?: { html_url?: string } };
  return { url: data.content?.html_url ?? `https://github.com/${repo}/blob/main/${path}` };
}
