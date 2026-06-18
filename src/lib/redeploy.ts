// Dispara un redeploy de producción en Vercel (que corre el build → re-sincroniza
// desde el Sheet). Usado por /api/publish (secret) y /api/admin/publish (sesión).

export type RedeployResult =
  | { ok: true; url: string }
  | { ok: false; error: unknown; status: number };

export async function triggerRedeploy(): Promise<RedeployResult> {
  const token = process.env.VERCEL_DEPLOY_TOKEN;
  const projectId = process.env.VERCEL_PROJECT_ID;
  if (!token || !projectId) {
    return { ok: false, status: 500, error: "VERCEL_DEPLOY_TOKEN / VERCEL_PROJECT_ID not configured" };
  }

  const listRes = await fetch(
    `https://api.vercel.com/v6/deployments?projectId=${projectId}&limit=1&target=production`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!listRes.ok) return { ok: false, status: 500, error: "failed to list deployments" };
  const { deployments } = await listRes.json();
  const latest = deployments?.[0];
  if (!latest) return { ok: false, status: 500, error: "no production deployment found" };

  const redeployRes = await fetch("https://api.vercel.com/v13/deployments", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ source: "redeploy", deploymentId: latest.uid }),
  });
  const result = await redeployRes.json();
  if (!redeployRes.ok) return { ok: false, status: 500, error: result };
  return { ok: true, url: result.url };
}
