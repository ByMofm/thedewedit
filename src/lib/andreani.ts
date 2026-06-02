import type { ShippingOption } from "@/types";

export class AndreaniUnavailableError extends Error {
  constructor(public readonly reason: "no_credentials" | "auth_failed" | "api_error") {
    super(reason);
    this.name = "AndreaniUnavailableError";
  }
}

interface TokenCache {
  token: string;
  expiresAt: number;
}

let tokenCache: TokenCache | null = null;
const TOKEN_TTL_MS = 55 * 60 * 1000;

async function getAuthToken(): Promise<string> {
  const usuario = process.env.ANDREANI_USUARIO;
  const clave = process.env.ANDREANI_CLAVE;

  if (!usuario || !clave || !process.env.ANDREANI_CONTRATO) {
    throw new AndreaniUnavailableError("no_credentials");
  }

  if (tokenCache && tokenCache.expiresAt > Date.now()) {
    return tokenCache.token;
  }

  const res = await fetch("https://apis.andreani.com/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ usuario, clave }),
  });

  if (!res.ok) {
    throw new AndreaniUnavailableError("auth_failed");
  }

  const data = (await res.json()) as { token?: string };
  if (!data.token) {
    throw new AndreaniUnavailableError("auth_failed");
  }

  tokenCache = { token: data.token, expiresAt: Date.now() + TOKEN_TTL_MS };
  return data.token;
}

interface RawAndreaniOption {
  nombre: string;
  precio: number;
  diasHabiles: number;
}

function slugify(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function parseOption(raw: RawAndreaniOption): ShippingOption | null {
  const nombre = raw.nombre.toUpperCase();
  let type: ShippingOption["type"] | null = null;
  if (nombre.includes("DOMICILIO")) type = "domicilio";
  else if (nombre.includes("SUCURSAL")) type = "sucursal";
  else return null;

  return {
    id: slugify(raw.nombre),
    name: raw.nombre,
    type,
    price: raw.precio,
    diasHabiles: raw.diasHabiles,
  };
}

export async function getShippingQuote(
  postalCode: string,
  weightKg: number,
  declaredValue: number,
): Promise<ShippingOption[]> {
  const token = await getAuthToken();
  const contrato = process.env.ANDREANI_CONTRATO!;

  const url = new URL("https://apis.andreani.com/v2/tarifas");
  url.searchParams.set("cpDestino", postalCode);
  url.searchParams.set("pesoBruto", String(weightKg));
  url.searchParams.set("contrato", contrato);
  url.searchParams.set("valorDeclarado", String(declaredValue));

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    throw new AndreaniUnavailableError("api_error");
  }

  const raw = (await res.json()) as RawAndreaniOption[];
  const options = raw.flatMap((r) => {
    const parsed = parseOption(r);
    return parsed ? [parsed] : [];
  });

  return options.sort((a, b) => {
    if (a.type !== b.type) return a.type === "domicilio" ? -1 : 1;
    return a.price - b.price;
  });
}
