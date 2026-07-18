import { NextRequest, NextResponse } from "next/server";
import { getReportRows } from "@/lib/reports";
import { getCurrentUser } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.status !== "approved") {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from") || undefined;
  const to = searchParams.get("to") || undefined;

  return NextResponse.json({ rows: await getReportRows(from, to), from, to });
}
