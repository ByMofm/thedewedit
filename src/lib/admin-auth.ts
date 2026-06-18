// Auth del admin: una sola contraseña (ADMIN_PASSWORD) → cookie con un HMAC
// determinístico de la contraseña. Usa Web Crypto (global), así corre igual en
// el middleware (edge) y en las route handlers (node).
//
// ponytail: 1 sola contraseña compartida, sin usuarios ni sesiones server-side.
// Si alguna vez hay varios usuarios o hay que revocar accesos, migrar a auth real.

export const ADMIN_COOKIE = "tde_admin";

function b64url(buf: ArrayBuffer): string {
  return Buffer.from(buf).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function hmac(secret: string, msg: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return b64url(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(msg)));
}

/** Token de sesión esperado, derivado de ADMIN_PASSWORD. null si no hay contraseña configurada. */
export async function sessionToken(): Promise<string | null> {
  const pw = process.env.ADMIN_PASSWORD;
  if (!pw) return null;
  return hmac(pw, "tde-admin-v1");
}

/** true si la contraseña ingresada coincide (compara HMACs, no el texto plano). */
export async function passwordIsValid(input: string): Promise<boolean> {
  const expected = await sessionToken();
  if (!expected) return false;
  const candidate = await hmac(input, "tde-admin-v1");
  return candidate === expected;
}

/** true si la cookie presentada es la sesión válida. */
export async function cookieIsValid(cookieValue: string | undefined): Promise<boolean> {
  if (!cookieValue) return false;
  const expected = await sessionToken();
  return expected != null && cookieValue === expected;
}
