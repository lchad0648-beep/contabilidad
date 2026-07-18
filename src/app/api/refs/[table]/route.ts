import { NextRequest, NextResponse } from "next/server";
import { getRefOptions } from "@/lib/crud";
import { getCurrentUser } from "@/lib/auth";

const LABEL_BY_TABLE: Record<string, string> = {
  clientes: "nombre",
  proveedores: "nombre",
};

export async function GET(_req: NextRequest, ctx: { params: Promise<{ table: string }> }) {
  const user = await getCurrentUser();
  if (!user || user.status !== "approved") {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }
  const { table } = await ctx.params;
  const label = LABEL_BY_TABLE[table];
  if (!label) return NextResponse.json({ options: [] });
  return NextResponse.json({ options: await getRefOptions(table, label) });
}
