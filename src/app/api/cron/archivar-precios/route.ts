import { NextRequest, NextResponse } from "next/server";
import { listFilasParaArchivar, filasACsv, borrarFilasArchivadas, subirCsvAGitHub } from "@/lib/archivo-bolsa";

function autorizado(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = req.headers.get("authorization");
  return header === `Bearer ${secret}`;
}

export async function GET(req: NextRequest) {
  if (!autorizado(req)) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  try {
    const filas = await listFilasParaArchivar();
    if (filas.length === 0) {
      return NextResponse.json({ ok: true, archivadas: 0, mensaje: "No había filas para archivar." });
    }

    const csv = filasACsv(filas);
    const nombreArchivo = `precios-${new Date().toISOString().slice(0, 10)}.csv`;
    const { url } = await subirCsvAGitHub(nombreArchivo, csv);
    await borrarFilasArchivadas(filas.map((f) => f.id));

    return NextResponse.json({ ok: true, archivadas: filas.length, archivo: nombreArchivo, url });
  } catch (err) {
    console.error("Error archivando historial de precios:", err);
    return NextResponse.json({ error: "No se pudo archivar el historial." }, { status: 500 });
  }
}
