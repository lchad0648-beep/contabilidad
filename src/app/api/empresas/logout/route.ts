import { NextRequest, NextResponse } from "next/server";
import { destroyEmpresaSession, EMPRESA_SESSION_COOKIE } from "@/lib/empresa-auth";

export async function POST(req: NextRequest) {
  const token = req.cookies.get(EMPRESA_SESSION_COOKIE)?.value;
  if (token) await destroyEmpresaSession(token);
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(EMPRESA_SESSION_COOKIE);
  return res;
}
