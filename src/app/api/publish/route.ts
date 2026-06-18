import { NextRequest, NextResponse } from "next/server";
import { triggerRedeploy } from "@/lib/redeploy";

export async function POST(req: NextRequest) {
  let body: Record<string, string> = {};
  try { body = await req.json(); } catch { /* no body */ }

  const publishSecret = process.env.PUBLISH_SECRET;
  if (!publishSecret || body.secret !== publishSecret) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const result = await triggerRedeploy();
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ ok: true, url: result.url });
}
