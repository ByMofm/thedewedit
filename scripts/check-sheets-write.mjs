// Diagnóstico: verifica que la service account puede AUTENTICARSE y ESCRIBIR el
// Sheet (permiso de Editor). Lee credenciales del entorno. No imprime secretos.
//
// Uso:  set -a; . ./.env.local; set +a;  node scripts/check-sheets-write.mjs

import crypto from "node:crypto";

const SHEET = process.env.SHEETS_ID;
const EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
let KEY = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY || "";
KEY = KEY.includes("\\n") ? KEY.replace(/\\n/g, "\n") : KEY;

if (!SHEET || !EMAIL || !KEY) {
  console.error("Falta SHEETS_ID / GOOGLE_SERVICE_ACCOUNT_EMAIL / GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY");
  process.exit(1);
}

const ORDER_COLS = [
  "paymentId", "createdAt", "approvedAt", "status", "statusDetail", "amount",
  "currency", "paymentMethod", "installments", "payerEmail", "payerName",
  "payerPhone", "shippingAddress", "shippingZip", "items", "preferenceId",
];

const b64url = (b) => Buffer.from(b).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

async function token() {
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = b64url(JSON.stringify({
    iss: EMAIL, scope: "https://www.googleapis.com/auth/spreadsheets",
    aud: "https://oauth2.googleapis.com/token", iat: now, exp: now + 3600,
  }));
  const sig = b64url(crypto.createSign("RSA-SHA256").update(`${header}.${claim}`).sign(KEY));
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: `${header}.${claim}.${sig}` }),
  });
  if (!res.ok) throw new Error(`token ${res.status}: ${await res.text()}`);
  return (await res.json()).access_token;
}

const rng = (a1) => encodeURIComponent(`'Órdenes'!${a1}`);

async function main() {
  const t = await token();
  console.log("✅ Autenticación OK (token de service account obtenido).");
  const base = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET}`;
  const auth = { Authorization: `Bearer ${t}` };

  // Lectura autenticada (prueba acceso a la planilla).
  const readRes = await fetch(`${base}/values/${rng("A1:P1")}`, { headers: auth });
  if (!readRes.ok) throw new Error(`read ${readRes.status}: ${await readRes.text()}`);
  const existing = (await readRes.json()).values?.[0] ?? [];

  if (existing.length > 0) {
    console.log("✅ Pestaña 'Órdenes' ya tiene encabezado — escritura ya verificada antes.");
    return;
  }

  // Escritura: poner el encabezado de Órdenes (prueba permiso de Editor).
  const writeRes = await fetch(`${base}/values/${rng("A1")}:append?valueInputOption=RAW`, {
    method: "POST", headers: { ...auth, "Content-Type": "application/json" },
    body: JSON.stringify({ values: [ORDER_COLS] }),
  });
  if (!writeRes.ok) throw new Error(`write ${writeRes.status}: ${await writeRes.text()}`);
  console.log("✅ Escritura OK — encabezado de 'Órdenes' creado. La service account es Editor.");
}

main().catch((e) => { console.error("❌", e.message); process.exit(1); });
