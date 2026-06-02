// scripts/sync-sheets.mjs
//
// Modo A — 3 Sheets separados (recomendado):
//   SHEETS_PRODUCTOS_ID, SHEETS_VARIANTES_ID, SHEETS_STOCK_ID configurados →
//   lee la primera pestaña de cada Sheet → products-raw.ts + stock.ts
//
// Modo B — 1 Sheet con 3 pestañas (legacy):
//   SHEETS_ID configurado → lee pestañas "Productos", "Variantes", "Stock" → products-raw.ts + stock.ts
//
// Sin ningún SHEETS_*: data/stock.csv + products-raw.ts → stock.ts  (modo local)
//
// Columnas esperadas:
//   Productos  — productId, slug, nombre, marca, categoria, precio, precio_tachado,
//                descripcion_corta, descripcion, imagenes, destacado, tags
//   Variantes  — productId, variantId, nombre_variante, precio_variante
//   Stock      — productId, variantId, stock
//
// Para imágenes, el campo "imagenes" acepta:
//   - URLs separadas por coma
//   - "PLACEHOLDER_MAKEUP" o "PLACEHOLDER_SKINCARE" (se expanden a las URLs de placeholder)

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const PRODUCTS_RAW_TS = resolve(ROOT, "src/lib/data/products-raw.ts");
const STOCK_TS = resolve(ROOT, "src/lib/data/stock.ts");
const CSV_PATH = resolve(ROOT, "data/stock.csv");

const PLACEHOLDER_MAKEUP = [
  "https://images.unsplash.com/photo-1631214540553-ff044a3ff1d4?auto=format&fit=crop&w=1000&q=80",
  "https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=1000&q=80",
];
const PLACEHOLDER_SKINCARE = [
  "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&w=1000&q=80",
  "https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?auto=format&fit=crop&w=1000&q=80",
];

// ── RFC 4180 CSV Parser ──────────────────────────────────────────────────────
// Handles quoted fields with embedded commas, newlines, and escaped quotes.

function parseCsvRfc4180(text) {
  // Strip BOM if present
  const src = text.startsWith("﻿") ? text.slice(1) : text;
  const rows = [];
  let pos = 0;
  const n = src.length;

  while (pos < n) {
    const row = [];

    while (pos < n) {
      let field;
      if (src[pos] === '"') {
        pos++; // skip opening quote
        let v = "";
        while (pos < n) {
          if (src[pos] === '"') {
            if (pos + 1 < n && src[pos + 1] === '"') {
              v += '"';
              pos += 2;
            } else {
              pos++; // skip closing quote
              break;
            }
          } else {
            v += src[pos++];
          }
        }
        field = v;
      } else {
        const start = pos;
        while (pos < n && src[pos] !== "," && src[pos] !== "\r" && src[pos] !== "\n") pos++;
        field = src.slice(start, pos);
      }

      row.push(field);

      if (pos < n && src[pos] === ",") {
        pos++; // next field
      } else {
        break; // end of row
      }
    }

    if (row.some((f) => f !== "")) rows.push(row);

    if (pos < n && src[pos] === "\r") pos++;
    if (pos < n && src[pos] === "\n") pos++;
  }

  return rows;
}

function rowsToObjects(rows) {
  if (rows.length < 2) return [];
  const header = rows[0].map((h) => h.trim());
  return rows
    .slice(1)
    .filter((row) => row.some((f) => f.trim() !== ""))
    .map((row) => {
      const obj = {};
      header.forEach((key, i) => {
        obj[key] = (row[i] ?? "").trim();
      });
      return obj;
    });
}

// ── Google Sheets Fetch ──────────────────────────────────────────────────────

// fetchSheetTab: for one sheet with multiple named tabs (Modo B)
async function fetchSheetTab(sheetsId, tabName) {
  const url = `https://docs.google.com/spreadsheets/d/${sheetsId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(tabName)}`;
  return _fetchSheetUrl(url, `pestaña "${tabName}" del sheet ${sheetsId}`);
}

// fetchSheetById: for a standalone sheet (first tab) (Modo A)
async function fetchSheetById(sheetsId, label) {
  const url = `https://docs.google.com/spreadsheets/d/${sheetsId}/gviz/tq?tqx=out:csv`;
  return _fetchSheetUrl(url, `${label} (${sheetsId})`);
}

async function _fetchSheetUrl(url, desc) {
  let res;
  try {
    res = await fetch(url);
  } catch (e) {
    throw new Error(
      `No se pudo conectar con Google Sheets (${desc}): ${e.message}\n` +
        `Verificá que el Sheet es público (Compartir → "Cualquiera con el enlace" → Lector).`,
    );
  }

  if (!res.ok) {
    throw new Error(
      `Google Sheets respondió ${res.status} para ${desc}.\n` +
        `Verificá que el Sheet existe y es público (Compartir → "Cualquiera con el enlace" → Lector).`,
    );
  }

  const text = await res.text();

  if (text.trimStart().startsWith("<!DOCTYPE") || text.trimStart().startsWith("<html")) {
    throw new Error(
      `Google Sheets devolvió una página de error para ${desc}.\n` +
        `Verificá que el Sheet es público (Compartir → "Cualquiera con el enlace" → Lector).`,
    );
  }

  return rowsToObjects(parseCsvRfc4180(text));
}

// ── products-raw.ts parser (minimal: id + variants only, for local validation) ──

function matchClosingBracket(s, openIdx) {
  let depth = 0;
  let inString = false;
  let stringChar = "";
  let escape = false;
  for (let i = openIdx; i < s.length; i++) {
    const c = s[i];
    if (inString) {
      if (escape) { escape = false; continue; }
      if (c === "\\") { escape = true; continue; }
      if (c === stringChar) inString = false;
      continue;
    }
    if (c === '"' || c === "'" || c === "`") { inString = true; stringChar = c; continue; }
    if (c === "[") depth++;
    else if (c === "]") { depth--; if (depth === 0) return i; }
  }
  throw new Error("Bracket de cierre no encontrado");
}

function parseProductsRawTs(source) {
  const decl = source.match(/(?:export\s+)?const\s+products(?:Raw)?\s*:[^=]*=\s*\[/);
  if (!decl) throw new Error("No se encontró 'const productsRaw' en products-raw.ts");
  const bracketStart = decl.index + decl[0].length - 1;

  const objects = [];
  let i = bracketStart + 1;
  let depthBrace = 0, depthBracket = 1;
  let inString = false, stringChar = "", escape = false;
  let inLineComment = false, inBlockComment = false;
  let currentStart = -1;

  while (i < source.length) {
    const c = source[i];
    const next = source[i + 1];

    if (inLineComment) { if (c === "\n") inLineComment = false; i++; continue; }
    if (inBlockComment) {
      if (c === "*" && next === "/") { inBlockComment = false; i += 2; continue; }
      i++; continue;
    }
    if (inString) {
      if (escape) { escape = false; i++; continue; }
      if (c === "\\") { escape = true; i++; continue; }
      if (c === stringChar) inString = false;
      i++; continue;
    }
    if (c === "/" && next === "/") { inLineComment = true; i += 2; continue; }
    if (c === "/" && next === "*") { inBlockComment = true; i += 2; continue; }
    if (c === '"' || c === "'" || c === "`") { inString = true; stringChar = c; i++; continue; }

    if (c === "{") { if (depthBrace === 0) currentStart = i; depthBrace++; i++; continue; }
    if (c === "}") {
      depthBrace--;
      if (depthBrace === 0 && currentStart !== -1) { objects.push(source.slice(currentStart, i + 1)); currentStart = -1; }
      i++; continue;
    }
    if (c === "[") { depthBracket++; i++; continue; }
    if (c === "]") { depthBracket--; if (depthBracket === 0) break; i++; continue; }
    i++;
  }

  return objects.map((blob) => {
    const idMatch = blob.match(/\bid:\s*"([^"]+)"/);
    if (!idMatch) throw new Error(`Producto sin id: ${blob.slice(0, 80)}…`);
    const id = idMatch[1];

    let beforeVariants = blob;
    let variants = [];
    const variantsField = blob.match(/\bvariants:\s*\[/);
    if (variantsField) {
      const arrayOpen = variantsField.index + variantsField[0].length - 1;
      const arrayClose = matchClosingBracket(blob, arrayOpen);
      beforeVariants = blob.slice(0, variantsField.index) + blob.slice(arrayClose + 1);
      const content = blob.slice(arrayOpen + 1, arrayClose);
      let vi = 0, vDepth = 0, vStart = -1, vIn = false, vChar = "", vEsc = false;
      while (vi < content.length) {
        const vc = content[vi];
        if (vIn) {
          if (vEsc) { vEsc = false; vi++; continue; }
          if (vc === "\\") { vEsc = true; vi++; continue; }
          if (vc === vChar) vIn = false;
          vi++; continue;
        }
        if (vc === '"' || vc === "'" || vc === "`") { vIn = true; vChar = vc; vi++; continue; }
        if (vc === "{") { if (vDepth === 0) vStart = vi; vDepth++; vi++; continue; }
        if (vc === "}") {
          vDepth--;
          if (vDepth === 0 && vStart !== -1) {
            const vb = content.slice(vStart, vi + 1);
            const vidMatch = vb.match(/\bid:\s*"([^"]+)"/);
            if (vidMatch) variants.push({ id: vidMatch[1] });
            vStart = -1;
          }
          vi++; continue;
        }
        vi++;
      }
    }

    return { id, variants };
  });
}

// ── Stock TypeScript Generator ───────────────────────────────────────────────

function genStockTs(stockRows, productsInfo, source) {
  const productsById = new Map(productsInfo.map((p) => [p.id, p]));
  const variantSets = new Map(productsInfo.map((p) => [p.id, new Set(p.variants.map((v) => v.id))]));

  const map = {};
  let warnings = 0;
  const seen = new Set();

  for (const row of stockRows) {
    const key = row.variantId ? `${row.productId}::${row.variantId}` : row.productId;
    if (seen.has(key)) {
      throw new Error(`Clave duplicada en Stock: '${key}'`);
    }
    seen.add(key);

    const product = productsById.get(row.productId);
    if (!product) {
      console.warn(`WARN: productId '${row.productId}' no existe en products-raw.ts (ignorado)`);
      warnings++;
      continue;
    }

    const hasVariants = product.variants.length > 0;
    if (hasVariants && !row.variantId) {
      console.warn(`WARN: '${row.productId}' tiene variantes; ignorando fila sin variantId`);
      warnings++;
      continue;
    }
    if (!hasVariants && row.variantId) {
      console.warn(`WARN: '${row.productId}' no tiene variantes; ignorando fila con variantId='${row.variantId}'`);
      warnings++;
      continue;
    }
    if (hasVariants && !variantSets.get(row.productId).has(row.variantId)) {
      console.warn(`WARN: variant '${row.variantId}' del producto '${row.productId}' no existe (ignorado)`);
      warnings++;
      continue;
    }

    map[key] = row.stock;
  }

  for (const p of productsInfo) {
    if (p.variants.length === 0) {
      if (!(p.id in map)) {
        console.warn(`WARN: producto '${p.id}' falta en Stock (se asumirá stock=0)`);
        warnings++;
      }
    } else {
      for (const v of p.variants) {
        const k = `${p.id}::${v.id}`;
        if (!(k in map)) {
          console.warn(`WARN: variant '${v.id}' del producto '${p.id}' falta en Stock (se asumirá stock=0)`);
          warnings++;
        }
      }
    }
  }

  const sortedKeys = Object.keys(map).sort();
  const body = sortedKeys.map((k) => `  ${JSON.stringify(k)}: ${map[k]},`).join("\n");

  const ts = `// AUTO-GENERATED by scripts/sync-sheets.mjs — do not edit by hand.
// Source: ${source}
// Run \`pnpm sheets:sync\` to regenerate.
export const stockMap: Record<string, number> = {
${body}
};
`;

  return { ts, warnings };
}

// ── products-raw.ts Generator ────────────────────────────────────────────────

function resolveImages(raw) {
  const v = (raw || "").trim();
  if (v === "PLACEHOLDER_MAKEUP") return PLACEHOLDER_MAKEUP;
  if (v === "PLACEHOLDER_SKINCARE") return PLACEHOLDER_SKINCARE;
  if (!v) return [];
  return v.split(",").map((u) => u.trim()).filter(Boolean);
}

function genProductsRawTs(productos, variantes, sheetsId) {
  const variantsMap = new Map();
  for (const v of variantes) {
    if (!variantsMap.has(v.productId)) variantsMap.set(v.productId, []);
    variantsMap.get(v.productId).push(v);
  }

  const productStrings = productos.map((p) => {
    const variantList = variantsMap.get(p.productId) || [];
    const images = resolveImages(p.imagenes);
    const tags = (p.tags || "").split(",").map((t) => t.trim()).filter(Boolean);
    const precio = parseInt(p.precio, 10) || 0;
    const precioTachado = p.precio_tachado ? parseInt(p.precio_tachado, 10) : null;
    const destacado = p.destacado?.toUpperCase() === "TRUE" || p.destacado === "1";

    let s = `  {\n`;
    s += `    id: ${JSON.stringify(p.productId)},\n`;
    s += `    slug: ${JSON.stringify(p.slug || p.productId)},\n`;
    s += `    name: ${JSON.stringify(p.nombre || "")},\n`;
    if (p.marca) s += `    brand: ${JSON.stringify(p.marca)},\n`;
    s += `    shortDescription: ${JSON.stringify(p.descripcion_corta || "")},\n`;
    s += `    description: ${JSON.stringify(p.descripcion || "")},\n`;
    s += `    price: ${precio},\n`;
    if (precioTachado) s += `    compareAtPrice: ${precioTachado},\n`;
    s += `    category: ${JSON.stringify(p.categoria || "")},\n`;
    if (tags.length > 0) s += `    tags: ${JSON.stringify(tags)},\n`;
    s += `    images: ${JSON.stringify(images)},\n`;
    if (destacado) s += `    featured: true,\n`;
    if (variantList.length > 0) {
      s += `    variants: [\n`;
      for (const v of variantList) {
        s += `      { id: ${JSON.stringify(v.variantId)}, name: ${JSON.stringify(v.nombre_variante || "")}`;
        if (v.precio_variante) s += `, price: ${parseInt(v.precio_variante, 10)}`;
        s += ` },\n`;
      }
      s += `    ],\n`;
    }
    s += `  }`;
    return s;
  });

  return `// AUTO-GENERATED by scripts/sync-sheets.mjs — do not edit by hand.
// Source: Google Sheets ${sheetsId}
// Run \`pnpm sheets:sync\` to regenerate.

import type { ProductSeed } from "@/types";

export const productsRaw: ProductSeed[] = [
${productStrings.join(",\n")}
];
`;
}

// ── Validación de datos del Sheet ────────────────────────────────────────────

function validateProductos(rows) {
  const required = ["productId", "slug", "nombre", "categoria", "precio"];
  const missing = required.filter((col) => !Object.keys(rows[0] || {}).includes(col));
  if (missing.length > 0) {
    throw new Error(
      `Faltan columnas en la pestaña "Productos": ${missing.join(", ")}\n` +
        `Columnas requeridas: ${required.join(", ")}`,
    );
  }
  const ids = new Set();
  for (const row of rows) {
    if (!row.productId) throw new Error(`Fila sin productId en la pestaña "Productos"`);
    if (ids.has(row.productId)) throw new Error(`productId duplicado: '${row.productId}'`);
    ids.add(row.productId);
  }
  return ids;
}

function validateVariantes(rows, productIds) {
  let warnings = 0;
  for (const row of rows) {
    if (!row.productId || !row.variantId) {
      console.warn(`WARN Variantes: fila incompleta (productId='${row.productId}', variantId='${row.variantId}') — ignorada`);
      warnings++;
      continue;
    }
    if (!productIds.has(row.productId)) {
      console.warn(`WARN Variantes: productId '${row.productId}' no existe en Productos — ignorado`);
      warnings++;
    }
  }
  return warnings;
}

function parseStockRows(rows) {
  const parsed = [];
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!row.productId) {
      console.warn(`WARN Stock: fila ${i + 2} sin productId — ignorada`);
      continue;
    }
    const stock = Number(row.stock);
    if (!Number.isInteger(stock) || stock < 0) {
      throw new Error(`Stock inválido '${row.stock}' para '${row.productId}' (debe ser entero ≥ 0)`);
    }
    parsed.push({ productId: row.productId, variantId: row.variantId || "", stock });
  }
  return parsed;
}

// ── Modo Sheets ──────────────────────────────────────────────────────────────

async function syncFromSheets({ productosId, variantesId, stockId, singleId }) {
  let productosRaw, variantesRaw, stockRaw, sourceLabel;

  if (singleId) {
    // Modo B: un solo Sheet con 3 pestañas
    console.log(`Sincronizando desde Google Sheets (ID: ${singleId}, 3 pestañas)…`);
    sourceLabel = `Google Sheets ${singleId}`;
    [productosRaw, variantesRaw, stockRaw] = await Promise.all([
      fetchSheetTab(singleId, "Productos"),
      fetchSheetTab(singleId, "Variantes"),
      fetchSheetTab(singleId, "Stock"),
    ]);
  } else {
    // Modo A: 3 Sheets separados
    console.log(`Sincronizando desde 3 Google Sheets separados…`);
    sourceLabel = `Productos:${productosId} Variantes:${variantesId} Stock:${stockId}`;
    [productosRaw, variantesRaw, stockRaw] = await Promise.all([
      fetchSheetById(productosId, "Productos"),
      fetchSheetById(variantesId, "Variantes"),
      fetchSheetById(stockId, "Stock"),
    ]);
  }

  if (productosRaw.length === 0) throw new Error('El sheet "Productos" está vacío.');
  if (stockRaw.length === 0) throw new Error('El sheet "Stock" está vacío.');

  const productIds = validateProductos(productosRaw);
  const varWarnings = validateVariantes(variantesRaw, productIds);
  const stockRows = parseStockRows(stockRaw);

  // Generate products-raw.ts
  const productsTsContent = genProductsRawTs(productosRaw, variantesRaw, sourceLabel);
  writeFileSync(PRODUCTS_RAW_TS, productsTsContent);
  console.log(`OK: products-raw.ts generado con ${productosRaw.length} productos, ${variantesRaw.length} variantes.`);

  // Build productsInfo for stock validation (from the Sheets data, not parsing TS)
  const variantsMap = new Map();
  for (const v of variantesRaw) {
    if (!variantsMap.has(v.productId)) variantsMap.set(v.productId, []);
    variantsMap.get(v.productId).push({ id: v.variantId });
  }
  const productsInfo = productosRaw.map((p) => ({
    id: p.productId,
    variants: variantsMap.get(p.productId) || [],
  }));

  const { ts: stockTsContent, warnings: stockWarnings } = genStockTs(
    stockRows,
    productsInfo,
    sourceLabel,
  );
  writeFileSync(STOCK_TS, stockTsContent);

  const totalWarnings = varWarnings + stockWarnings;
  console.log(
    `OK: stock.ts generado con ${stockRows.length} entradas.` +
      (totalWarnings > 0 ? ` (${totalWarnings} warnings)` : ""),
  );
}

// ── Modo local (fallback sin SHEETS_ID) ─────────────────────────────────────

function parseCsvLocal(content) {
  const lines = content.split(/\r?\n/);
  const rows = [];
  let header = null;
  for (let li = 0; li < lines.length; li++) {
    const raw = lines[li];
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const cols = line.split(",").map((c) => c.trim());
    if (!header) {
      if (cols.length !== 3 || cols[0] !== "productId" || cols[2] !== "variant") {
        throw new Error(`Header inválido en línea ${li + 1}: esperaba 'productId,stock,variant', encontró '${raw}'`);
      }
      header = cols;
      continue;
    }
    if (cols.length !== 3) throw new Error(`Línea ${li + 1}: esperaban 3 columnas: '${raw}'`);
    const [productId, stockStr, variantId] = cols;
    if (!productId) throw new Error(`Línea ${li + 1}: productId vacío`);
    const stock = Number(stockStr);
    if (!Number.isInteger(stock) || stock < 0) throw new Error(`Línea ${li + 1}: stock inválido '${stockStr}'`);
    rows.push({ productId, variantId, stock });
  }
  if (!header) throw new Error("CSV vacío o sin header");
  return rows;
}

function syncFromLocalCsv() {
  if (!existsSync(CSV_PATH)) {
    console.error(`ERROR: falta data/stock.csv. Configurá SHEETS_ID o corré 'pnpm sheets:sync --init'.`);
    process.exit(1);
  }
  if (!existsSync(PRODUCTS_RAW_TS)) {
    console.error(`ERROR: falta src/lib/data/products-raw.ts.`);
    process.exit(1);
  }

  const csvSource = readFileSync(CSV_PATH, "utf8");
  let rows;
  try {
    rows = parseCsvLocal(csvSource);
  } catch (e) {
    console.error(`ERROR parseando CSV: ${e.message}`);
    process.exit(1);
  }

  const productsSource = readFileSync(PRODUCTS_RAW_TS, "utf8");
  const productsInfo = parseProductsRawTs(productsSource);

  const { ts, warnings } = genStockTs(rows, productsInfo, "data/stock.csv");
  writeFileSync(STOCK_TS, ts);
  const variantCount = productsInfo.reduce((s, p) => s + p.variants.length, 0);
  console.log(`OK: ${productsInfo.length} productos, ${variantCount} variantes, ${warnings} warnings.`);
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const stockOnly = args.includes("--stock-only");

  const productosId = !stockOnly && process.env.SHEETS_PRODUCTOS_ID;
  const variantesId = !stockOnly && process.env.SHEETS_VARIANTES_ID;
  const stockId = !stockOnly && process.env.SHEETS_STOCK_ID;
  const singleId = !stockOnly && process.env.SHEETS_ID;

  const useSeparate = productosId && variantesId && stockId;
  const useSingle = !useSeparate && singleId;

  if (useSeparate || useSingle) {
    try {
      await syncFromSheets({
        productosId: productosId || undefined,
        variantesId: variantesId || undefined,
        stockId: stockId || undefined,
        singleId: useSingle ? singleId : undefined,
      });
    } catch (e) {
      console.error(`\nERROR: ${e.message}`);
      process.exit(1);
    }
  } else {
    const hasAnySheetVar =
      process.env.SHEETS_PRODUCTOS_ID !== undefined ||
      process.env.SHEETS_VARIANTES_ID !== undefined ||
      process.env.SHEETS_STOCK_ID !== undefined ||
      process.env.SHEETS_ID !== undefined;

    if (!stockOnly && !hasAnySheetVar && !existsSync(CSV_PATH)) {
      console.log("INFO: Sin SHEETS_* vars ni data/stock.csv — usando archivos generados existentes.");
      process.exit(0);
    }
    syncFromLocalCsv();
  }
}

main();
