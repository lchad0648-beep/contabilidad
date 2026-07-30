import { NextRequest, NextResponse } from "next/server";
import { getCurrentEmpresa } from "@/lib/empresa-auth";
import { buscarUsuariosParaContratar } from "@/lib/empresa-empleados";

export async function GET(req: NextRequest) {
  const empresa = await getCurrentEmpresa();
  if (!empresa) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  const query = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (query.length < 2) return NextResponse.json({ resultados: [] });

  const resultados = await buscarUsuariosParaContratar(query);
  return NextResponse.json({ resultados });
}
