import type { ShippingOption } from "@/types";

// API PyME de Andreani (el mismo que consume el plugin oficial de WooCommerce).
// El "Credencial ID" se genera en https://pymes.andreani.com/integraciones/ (opción WooCommerce)
// y funciona como bearer contra este host: NO requiere el API de developers (apis.andreani.com).
const API_BASE = "https://woocommerce-api-acom.andreani.com";
const LOGIN_URL = `${API_BASE}/api/v1/Login`;
const RATES_URL = `${API_BASE}/api/v1/Pyme/rates`;

// ponytail: caja por defecto en cm; subir a config/producto si algún día cotiza mal por volumen.
const DEFAULT_BOX = { width: 20, height: 15, depth: 10 };

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
  const credencial = process.env.ANDREANI_CREDENCIAL_ID;
  if (!credencial || !process.env.ANDREANI_CP_ORIGEN) {
    throw new AndreaniUnavailableError("no_credentials");
  }

  if (tokenCache && tokenCache.expiresAt > Date.now()) {
    return tokenCache.token;
  }

  const res = await fetch(LOGIN_URL, {
    method: "POST",
    headers: { Authorization: credencial, "Content-Type": "application/json" },
  });

  if (!res.ok) {
    throw new AndreaniUnavailableError("auth_failed");
  }

  const data = (await res.json()) as { response?: { accessToken?: string } };
  const token = data.response?.accessToken;
  if (!token) {
    throw new AndreaniUnavailableError("auth_failed");
  }

  tokenCache = { token, expiresAt: Date.now() + TOKEN_TTL_MS };
  return token;
}

interface RawRate {
  code: string;
  total: number;
  diasHabiles?: number;
}

function slugify(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function parseRate(raw: RawRate): ShippingOption {
  // Los code reales son "estándar", "sucursal", "llega hoy", "bigger":
  // solo "sucursal" es retiro en sucursal; el resto es entrega a domicilio.
  const type: ShippingOption["type"] = raw.code.toUpperCase().includes("SUCURSAL")
    ? "sucursal"
    : "domicilio";

  return {
    id: slugify(raw.code),
    name: raw.code,
    type,
    price: raw.total,
    diasHabiles: raw.diasHabiles ?? 0,
  };
}

export async function getShippingQuote(
  postalCode: string,
  weightKg: number,
  declaredValue: number,
): Promise<ShippingOption[]> {
  const token = await getAuthToken();

  const body = {
    postal_code_origin: process.env.ANDREANI_CP_ORIGEN,
    postal_code_destination: postalCode,
    products: [
      {
        quantity: 1,
        price: Math.round(declaredValue),
        dimensions: { ...DEFAULT_BOX, grams: Math.max(1, Math.round(weightKg * 1000)) },
      },
    ],
  };

  const res = await fetch(RATES_URL, {
    method: "POST",
    headers: { "X-Auth-Token": token, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new AndreaniUnavailableError("api_error");
  }

  const data = (await res.json()) as { response?: { rates?: RawRate[] } };
  const rates = data.response?.rates ?? [];

  // El API repite "sucursal" por cada punto de retiro (mismo precio, distinta reference):
  // dedupe por id quedándonos con la más barata.
  const byId = new Map<string, ShippingOption>();
  for (const raw of rates) {
    const opt = parseRate(raw);
    const prev = byId.get(opt.id);
    if (!prev || opt.price < prev.price) byId.set(opt.id, opt);
  }
  const options = [...byId.values()];

  return options.sort((a, b) => {
    if (a.type !== b.type) return a.type === "domicilio" ? -1 : 1;
    return a.price - b.price;
  });
}
