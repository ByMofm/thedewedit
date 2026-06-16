// Server-only: importado únicamente desde la API route de preferencia (usa env
// vars de servidor y hace fetch al Sheet). No importar desde componentes cliente.
import type { CartItem } from "@/types";
import { stockMap as staticStockMap } from "@/lib/data/stock";

/**
 * Lectura de stock EN VIVO desde Google Sheets, para validar al momento de pagar.
 *
 * El catálogo es estático (stock horneado en build → `stockMap`), así que entre
 * una venta y el próximo redeploy ese número queda viejo. Esta lectura consulta
 * la planilla de Stock en tiempo real para evitar sobreventa en el checkout.
 *
 * Si no hay Sheets configurado o la consulta falla, cae al `stockMap` estático
 * (mejor un dato viejo que bloquear todas las compras por un error transitorio).
 */

const CACHE_TTL_MS = 45 * 1000;

interface Cache {
  map: Record<string, number>;
  fetchedAt: number;
}
let cache: Cache | null = null;

/** Misma clave que `stockMap`: `productId` o `productId::variantId`. */
function stockKey(productId: string, variantId?: string): string {
  return variantId ? `${productId}::${variantId}` : productId;
}

/** URL gviz-CSV de la planilla de Stock, según el modo configurado. */
function stockSheetCsvUrl(): string | null {
  const stockId = process.env.SHEETS_STOCK_ID;
  if (stockId) {
    return `https://docs.google.com/spreadsheets/d/${stockId}/gviz/tq?tqx=out:csv`;
  }
  const singleId = process.env.SHEETS_ID;
  if (singleId) {
    return `https://docs.google.com/spreadsheets/d/${singleId}/gviz/tq?tqx=out:csv&sheet=Stock`;
  }
  return null;
}

// Parser CSV mínimo con soporte de comillas (el output de gviz entrecomilla cada campo).
function parseCsv(text: string): string[][] {
  const src = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (inQuotes) {
      if (c === '"') {
        if (src[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field); field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && src[i + 1] === "\n") i++;
      row.push(field); field = "";
      if (row.some((f) => f !== "")) rows.push(row);
      row = [];
    } else field += c;
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    if (row.some((f) => f !== "")) rows.push(row);
  }
  return rows;
}

function rowsToStockMap(rows: string[][]): Record<string, number> {
  if (rows.length < 2) return {};
  const header = rows[0].map((h) => h.trim());
  const iProduct = header.indexOf("productId");
  const iVariant = header.indexOf("variantId");
  const iStock = header.indexOf("stock");
  if (iProduct === -1 || iStock === -1) return {};

  const map: Record<string, number> = {};
  for (const row of rows.slice(1)) {
    const productId = (row[iProduct] ?? "").trim();
    if (!productId) continue;
    const variantId = iVariant >= 0 ? (row[iVariant] ?? "").trim() : "";
    const stock = Number((row[iStock] ?? "").trim());
    if (!Number.isFinite(stock)) continue;
    map[stockKey(productId, variantId || undefined)] = stock;
  }
  return map;
}

/**
 * Stock actual por SKU. Devuelve el mapa en vivo del Sheet (cacheado ~45s) o,
 * si no hay Sheets / falla la consulta, el `stockMap` estático del build.
 */
export async function getLiveStock(): Promise<Record<string, number>> {
  if (cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) {
    return cache.map;
  }
  const url = stockSheetCsvUrl();
  if (!url) return staticStockMap;

  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return staticStockMap;
    const text = await res.text();
    if (text.trimStart().startsWith("<")) return staticStockMap; // página de error de Google
    const map = rowsToStockMap(parseCsv(text));
    if (Object.keys(map).length === 0) return staticStockMap;
    cache = { map, fetchedAt: Date.now() };
    return map;
  } catch {
    return staticStockMap;
  }
}

export interface StockShortage {
  name: string;
  requested: number;
  available: number;
}

/**
 * Valida las líneas del carrito contra el stock en vivo. Devuelve la lista de
 * ítems sin stock suficiente (vacía si todo OK).
 */
export async function checkCartStock(items: CartItem[]): Promise<StockShortage[]> {
  const map = await getLiveStock();
  const shortages: StockShortage[] = [];
  for (const item of items) {
    const available = map[stockKey(item.productId, item.variantId)] ?? 0;
    if (item.quantity > available) {
      const name = item.variantName ? `${item.name} (${item.variantName})` : item.name;
      shortages.push({ name, requested: item.quantity, available });
    }
  }
  return shortages;
}
