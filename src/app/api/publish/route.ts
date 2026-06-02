import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  let body: Record<string, string> = {};
  try { body = await req.json(); } catch { /* no body */ }

  const publishSecret = process.env.PUBLISH_SECRET;
  if (!publishSecret || body.secret !== publishSecret) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const token = process.env.VERCEL_DEPLOY_TOKEN;
  const projectId = process.env.VERCEL_PROJECT_ID;
  if (!token || !projectId) {
    return NextResponse.json({ error: "VERCEL_DEPLOY_TOKEN / VERCEL_PROJECT_ID not configured" }, { status: 500 });
  }

  // Find latest production deployment
  const listRes = await fetch(
    `https://api.vercel.com/v6/deployments?projectId=${projectId}&limit=1&target=production`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!listRes.ok) {
    return NextResponse.json({ error: "failed to list deployments" }, { status: 500 });
  }
  const { deployments } = await listRes.json();
  const latest = deployments?.[0];
  if (!latest) {
    return NextResponse.json({ error: "no production deployment found" }, { status: 500 });
  }

  // Trigger redeploy — Vercel will run the full build (including prebuild/sheets:sync)
  const redeployRes = await fetch("https://api.vercel.com/v13/deployments", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ source: "redeploy", deploymentId: latest.uid }),
  });
  const result = await redeployRes.json();

  if (!redeployRes.ok) {
    return NextResponse.json({ error: result }, { status: 500 });
  }

  return NextResponse.json({ ok: true, url: result.url });
}
