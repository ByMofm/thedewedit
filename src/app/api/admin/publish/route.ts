import { NextResponse } from "next/server";
import { triggerRedeploy } from "@/lib/redeploy";

// Protegido por el middleware del admin (cookie de sesión). Dispara el redeploy.
export async function POST() {
  const result = await triggerRedeploy();
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ ok: true, url: result.url });
}
