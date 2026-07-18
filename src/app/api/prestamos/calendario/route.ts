import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getCalendarioCobros } from "@/lib/prestamos";

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.status !== "approved" || user.role === "cliente") {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const year = Number(searchParams.get("year"));
  const month = Number(searchParams.get("month")); // 1-12

  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
    return NextResponse.json({ error: "Parámetros inválidos." }, { status: 400 });
  }

  const desde = `${year}-${pad(month)}-01`;
  const ultimoDia = new Date(year, month, 0).getDate();
  const hasta = `${year}-${pad(month)}-${pad(ultimoDia)}`;

  const dias = await getCalendarioCobros(desde, hasta);
  return NextResponse.json({ dias });
}
