// Server-only. Acceso de ESCRITURA al Google Sheet "caja negra" vía service
// account. La LECTURA del catálogo para el build / stock en vivo sigue siendo
// pública (gviz CSV, sin credenciales); esto es para el admin y el webhook de
// ventas, que necesitan escribir filas y descontar stock.
//
// Requiere en el entorno:
//   SHEETS_ID                            — id de la planilla
//   GOOGLE_SERVICE_ACCOUNT_EMAIL         — ...@...iam.gserviceaccount.com
//   GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY   — clave privada del JSON (con \n o saltos reales)
// y compartir la planilla con ese email como Editor.

import crypto from "node:crypto";

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const SCOPE = "https://www.googleapis.com/auth/spreadsheets";

// ── Auth: JWT RS256 → access token (cacheado en memoria) ─────────────────────
// ponytail: JWT firmado a mano con node:crypto en vez de google-auth-library;
// es un solo scope y un solo endpoint. Si algún día suma scopes/refresh, migrar.

let cached: { token: string; exp: number } | null = null;

function b64url(buf: Buffer | string): string {
  return Buffer.from(buf).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function privateKey(): string {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
  if (!raw) throw new Error("Falta GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY");
  return raw.includes("\\n") ? raw.replace(/\\n/g, "\n") : raw;
}

async function getAccessToken(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (cached && now < cached.exp - 60) return cached.token;

  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  if (!email) throw new Error("Falta GOOGLE_SERVICE_ACCOUNT_EMAIL");

  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = b64url(
    JSON.stringify({ iss: email, scope: SCOPE, aud: TOKEN_URL, iat: now, exp: now + 3600 }),
  );
  const signature = b64url(
    crypto.createSign("RSA-SHA256").update(`${header}.${claim}`).sign(privateKey()),
  );
  const assertion = `${header}.${claim}.${signature}`;

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });
  if (!res.ok) {
    throw new Error(`Token de service account falló: ${res.status} ${await res.text()}`);
  }
  const data = (await res.json()) as { access_token: string; expires_in: number };
  cached = { token: data.access_token, exp: now + data.expires_in };
  return data.access_token;
}

// ── Sheets API v4 ─────────────────────────────────────────────────────────────

function spreadsheetId(): string {
  const id = process.env.SHEETS_ID;
  if (!id) throw new Error("Falta SHEETS_ID");
  return id;
}

async function api(path: string, init?: RequestInit): Promise<unknown> {
  const token = await getAccessToken();
  const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId()}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...init?.headers },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Sheets API ${res.status}: ${await res.text()}`);
  return res.json();
}

/** A1 con nombre de pestaña entrecomillado (soporta acentos/espacios, ej. 'Órdenes'). */
function range(tab: string, a1 = ""): string {
  return encodeURIComponent(`'${tab.replace(/'/g, "''")}'${a1 ? "!" + a1 : ""}`);
}

export interface TabData {
  header: string[];
  /** Filas como objetos columna→valor. */
  rows: Record<string, string>[];
  /** Número de fila real en la planilla por cada `rows[i]` (header = fila 1). */
  rowNumbers: number[];
}

/** Lee una pestaña completa (autenticado). */
export async function readTab(tab: string): Promise<TabData> {
  const data = (await api(`/values/${range(tab)}`)) as { values?: string[][] };
  const values = data.values ?? [];
  if (values.length === 0) return { header: [], rows: [], rowNumbers: [] };
  const header = values[0].map((h) => String(h).trim());
  const rows: Record<string, string>[] = [];
  const rowNumbers: number[] = [];
  for (let r = 1; r < values.length; r++) {
    const obj: Record<string, string> = {};
    header.forEach((key, i) => (obj[key] = String(values[r][i] ?? "").trim()));
    if (Object.values(obj).some((v) => v !== "")) {
      rows.push(obj);
      rowNumbers.push(r + 1); // 1-based, +1 por el header
    }
  }
  return { header, rows, rowNumbers };
}

/** Agrega una o más filas al final de la pestaña. */
export async function appendRows(tab: string, values: (string | number)[][]): Promise<void> {
  await api(`/values/${range(tab)}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`, {
    method: "POST",
    body: JSON.stringify({ values }),
  });
}

/** Reescribe una fila completa (1-based) con los valores dados. */
export async function updateRow(tab: string, rowNumber: number, values: (string | number)[]): Promise<void> {
  await api(`/values/${range(tab, `A${rowNumber}`)}?valueInputOption=RAW`, {
    method: "PUT",
    body: JSON.stringify({ values: [values] }),
  });
}

/** Actualiza una sola celda (1-based fila, 0-based columna). */
export async function updateCell(
  tab: string,
  rowNumber: number,
  colIndex: number,
  value: string | number,
): Promise<void> {
  const colA1 = columnLetter(colIndex);
  await api(`/values/${range(tab, `${colA1}${rowNumber}`)}?valueInputOption=RAW`, {
    method: "PUT",
    body: JSON.stringify({ values: [[value]] }),
  });
}

/** 0 → "A", 25 → "Z", 26 → "AA". */
export function columnLetter(index: number): string {
  let s = "";
  let n = index;
  do {
    s = String.fromCharCode(65 + (n % 26)) + s;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return s;
}

/** sheetId numérico (gid) de una pestaña, necesario para borrar filas. */
async function getSheetId(tab: string): Promise<number> {
  const data = (await api(`?fields=sheets(properties(sheetId,title))`)) as {
    sheets: { properties: { sheetId: number; title: string } }[];
  };
  const s = data.sheets.find((x) => x.properties.title === tab);
  if (!s) throw new Error(`Pestaña '${tab}' no encontrada`);
  return s.properties.sheetId;
}

/** Borra físicamente filas (1-based) de una pestaña. */
export async function deleteRows(tab: string, rowNumbers: number[]): Promise<void> {
  if (rowNumbers.length === 0) return;
  const sheetId = await getSheetId(tab);
  // De abajo hacia arriba: borrar una fila más baja no corre el índice de las más altas.
  const sorted = [...new Set(rowNumbers)].sort((a, b) => b - a);
  const requests = sorted.map((rn) => ({
    deleteDimension: { range: { sheetId, dimension: "ROWS", startIndex: rn - 1, endIndex: rn } },
  }));
  await api(`:batchUpdate`, { method: "POST", body: JSON.stringify({ requests }) });
}

// ── productId ────────────────────────────────────────────────────────────────

/** "Rhode Lip Tint!" → "rhode-lip-tint". */
export function slugify(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // quita acentos
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Slug único frente a una lista de ids existentes (agrega -2, -3, … si choca). */
export function uniqueProductId(name: string, existing: Iterable<string>): string {
  const taken = new Set(existing);
  const base = slugify(name) || "producto";
  if (!taken.has(base)) return base;
  let n = 2;
  while (taken.has(`${base}-${n}`)) n++;
  return `${base}-${n}`;
}
