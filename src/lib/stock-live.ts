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

/** Misma clave que `stockMap`: `productId` o `productId::variantId`. */
function stockKey(productId: string, variantId?: string): string {
  return variantId ? `${productId}::${variantId}` : productId;
}

/** URL gviz-CSV de una pestaña del Sheet único (caja negra). */
function tabCsvUrl(tab: string): string | null {
  const id = process.env.SHEETS_ID;
  if (!id) return null;
  return `https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(tab)}`;
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

/** Índice de una columna por nombre en la fila de header. */
function col(rows: string[][], name: string): { header: string[]; i: number } {
  const header = (rows[0] ?? []).map((h) => h.trim());
  return { header, i: header.indexOf(name) };
}

/** Descarga y parsea una pestaña; null si no hay Sheet, falla o es página de error. */
async function fetchTab(tab: string): Promise<string[][] | null> {
  const url = tabCsvUrl(tab);
  if (!url) return null;
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    const text = await res.text();
    if (text.trimStart().startsWith("<")) return null; // página de error de Google
    return parseCsv(text);
  } catch {
    return null;
  }
}

/**
 * Stock actual por SKU, leído EN VIVO del Sheet (sin caché: es un chequeo de
 * sobreventa y el checkout es de bajo volumen). El stock vive en la fila del
 * dato: `Productos.stock` para productos simples y `Variantes.stock` por
 * variante. Si no hay Sheet configurado o falla la consulta, cae al `stockMap`
 * estático del build (mejor un dato viejo que bloquear todas las compras).
 */
export async function getLiveStock(): Promise<Record<string, number>> {
  const [productos, variantes] = await Promise.all([fetchTab("Productos"), fetchTab("Variantes")]);
  if (!productos) return staticStockMap;

  const map: Record<string, number> = {};
  const hasVariants = new Set<string>();

  // Variantes primero: definen el stock de los productos con variantes.
  if (variantes && variantes.length >= 2) {
    const { i: iP } = col(variantes, "productId");
    const { i: iV } = col(variantes, "variantId");
    const { i: iS } = col(variantes, "stock");
    if (iP >= 0 && iV >= 0 && iS >= 0) {
      for (const row of variantes.slice(1)) {
        const pid = (row[iP] ?? "").trim();
        const vid = (row[iV] ?? "").trim();
        const stock = Number((row[iS] ?? "").trim());
        if (!pid || !vid || !Number.isFinite(stock)) continue;
        map[stockKey(pid, vid)] = stock;
        hasVariants.add(pid);
      }
    }
  }

  // Productos: stock a nivel producto, solo para los que NO tienen variantes.
  const { i: iP } = col(productos, "productId");
  const { i: iS } = col(productos, "stock");
  if (iP >= 0 && iS >= 0) {
    for (const row of productos.slice(1)) {
      const pid = (row[iP] ?? "").trim();
      if (!pid || hasVariants.has(pid)) continue;
      const stock = Number((row[iS] ?? "").trim());
      if (!Number.isFinite(stock)) continue;
      map[stockKey(pid)] = stock;
    }
  }

  return Object.keys(map).length === 0 ? staticStockMap : map;
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
