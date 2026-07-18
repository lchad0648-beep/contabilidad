import { NextRequest, NextResponse } from "next/server";
import { getReportRows } from "@/lib/reports";
import { getCurrentUser } from "@/lib/auth";

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.status !== "approved") {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from") || undefined;
  const to = searchParams.get("to") || undefined;

  const rows = await getReportRows(from, to);
  const lines = [
    ["Módulo", "Registros", "Total"].join(","),
    ...rows.map((r) =>
      [csvEscape(r.label), String(r.count), r.total != null ? r.total.toFixed(2) : ""].join(",")
    ),
  ];

  return new NextResponse(lines.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="reporte.csv"`,
    },
  });
}
