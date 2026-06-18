// scripts/sync-sheets.mjs
//
// Genera src/lib/data/products-raw.ts y src/lib/data/stock.ts desde la "caja negra"
// de datos (1 Google Sheet con pestañas "Productos" y "Variantes").
//
//   SHEETS_ID configurado → lee las pestañas "Productos" y "Variantes" del Sheet.
//   Sin SHEETS_ID         → modo local: data/sheets-export-productos.csv +
//                           data/sheets-export-variantes.csv (los CSV de migración).
//
// El stock vive en la MISMA fila del dato:
//   - Producto sin variantes → columna `stock` de "Productos".
//   - Producto con variantes  → columna `stock` de cada fila de "Variantes"
//                               (el stock del producto es la suma).
//
// Columnas:
//   Productos  — productId, nombre, marca, categoria, precio, precio_tachado,
//                descripcion_corta, descripcion, imagenes, destacado, tags, stock
//   Variantes  — productId, variantId, nombre_variante, precio_variante, stock
//
// Para imágenes, el campo "imagenes" acepta URLs separadas por coma, o
// "PLACEHOLDER_MAKEUP" / "PLACEHOLDER_SKINCARE".

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const PRODUCTS_RAW_TS = resolve(ROOT, "src/lib/data/products-raw.ts");
const STOCK_TS = resolve(ROOT, "src/lib/data/stock.ts");
const LOCAL_PRODUCTOS = resolve(ROOT, "data/sheets-export-productos.csv");
const LOCAL_VARIANTES = resolve(ROOT, "data/sheets-export-variantes.csv");

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
  const src = text.startsWith("﻿") ? text.slice(1) : text;
  const rows = [];
  let pos = 0;
  const n = src.length;

  while (pos < n) {
    const row = [];
    while (pos < n) {
      let field;
      if (src[pos] === '"') {
        pos++;
        let v = "";
        while (pos < n) {
          if (src[pos] === '"') {
            if (pos + 1 < n && src[pos + 1] === '"') {
              v += '"';
              pos += 2;
            } else {
              pos++;
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
        pos++;
      } else {
        break;
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

async function fetchSheetTab(sheetsId, tabName) {
  const url = `https://docs.google.com/spreadsheets/d/${sheetsId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(tabName)}`;
  let res;
  try {
    res = await fetch(url);
  } catch (e) {
    throw new Error(
      `No se pudo conectar con Google Sheets (pestaña "${tabName}"): ${e.message}\n` +
        `Verificá que el Sheet es público (Compartir → "Cualquiera con el enlace" → Lector).`,
    );
  }
  if (!res.ok) {
    throw new Error(
      `Google Sheets respondió ${res.status} para la pestaña "${tabName}".\n` +
        `Verificá que el Sheet existe, es público, y que la pestaña se llama exactamente "${tabName}".`,
    );
  }
  const text = await res.text();
  if (text.trimStart().startsWith("<!DOCTYPE") || text.trimStart().startsWith("<html")) {
    throw new Error(
      `Google Sheets devolvió una página de error para la pestaña "${tabName}".\n` +
        `Verificá que el Sheet es público (Compartir → "Cualquiera con el enlace" → Lector).`,
    );
  }
  return rowsToObjects(parseCsvRfc4180(text));
}

// ── Validación ───────────────────────────────────────────────────────────────

function asStock(value, where) {
  const n = Number((value ?? "").toString().trim());
  if (!Number.isInteger(n) || n < 0) {
    throw new Error(`Stock inválido '${value}' en ${where} (debe ser entero ≥ 0)`);
  }
  return n;
}

function validateProductos(rows) {
  const required = ["productId", "nombre", "categoria", "precio"];
  const missing = required.filter((col) => !Object.keys(rows[0] || {}).includes(col));
  if (missing.length > 0) {
    throw new Error(
      `Faltan columnas en "Productos": ${missing.join(", ")}\n` +
        `Columnas requeridas: ${required.join(", ")}`,
    );
  }
  const ids = new Set();
  for (const row of rows) {
    if (!row.productId) throw new Error(`Fila sin productId en "Productos"`);
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

// ── Generadores ──────────────────────────────────────────────────────────────

function resolveImages(raw) {
  const v = (raw || "").trim();
  if (v === "PLACEHOLDER_MAKEUP") return PLACEHOLDER_MAKEUP;
  if (v === "PLACEHOLDER_SKINCARE") return PLACEHOLDER_SKINCARE;
  if (!v) return [];
  return v.split(",").map((u) => u.trim()).filter(Boolean);
}

function genProductsRawTs(productos, variantesByProduct, sourceLabel) {
  const productStrings = productos.map((p) => {
    const variantList = variantesByProduct.get(p.productId) || [];
    const images = resolveImages(p.imagenes);
    const tags = (p.tags || "").split(",").map((t) => t.trim()).filter(Boolean);
    const precio = parseInt(p.precio, 10) || 0;
    const precioTachado = p.precio_tachado ? parseInt(p.precio_tachado, 10) : null;
    const destacado = p.destacado?.toUpperCase() === "TRUE" || p.destacado === "1";

    let s = `  {\n`;
    s += `    id: ${JSON.stringify(p.productId)},\n`;
    s += `    slug: ${JSON.stringify(p.productId)},\n`; // slug = productId (sin columna slug)
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
// Source: ${sourceLabel}
// Run \`pnpm sheets:sync\` to regenerate.

import type { ProductSeed } from "@/types";

export const productsRaw: ProductSeed[] = [
${productStrings.join(",\n")}
];
`;
}

function genStockTs(productos, variantesByProduct, sourceLabel) {
  const map = {};
  let warnings = 0;

  for (const p of productos) {
    const variantList = variantesByProduct.get(p.productId) || [];
    if (variantList.length > 0) {
      for (const v of variantList) {
        map[`${p.productId}::${v.variantId}`] = asStock(v.stock, `Variantes '${p.productId}::${v.variantId}'`);
      }
    } else {
      if ((p.stock ?? "") === "") {
        console.warn(`WARN: producto '${p.productId}' sin stock en "Productos" (se asume 0)`);
        warnings++;
        map[p.productId] = 0;
      } else {
        map[p.productId] = asStock(p.stock, `Productos '${p.productId}'`);
      }
    }
  }

  const sortedKeys = Object.keys(map).sort();
  const body = sortedKeys.map((k) => `  ${JSON.stringify(k)}: ${map[k]},`).join("\n");

  const ts = `// AUTO-GENERATED by scripts/sync-sheets.mjs — do not edit by hand.
// Source: ${sourceLabel}
// Run \`pnpm sheets:sync\` to regenerate.
export const stockMap: Record<string, number> = {
${body}
};
`;
  return { ts, warnings };
}

// ── Pipeline ─────────────────────────────────────────────────────────────────

function build(productos, variantes, sourceLabel) {
  if (productos.length === 0) throw new Error('No hay filas en "Productos".');

  const productIds = validateProductos(productos);
  const varWarnings = validateVariantes(variantes, productIds);

  const variantesByProduct = new Map();
  for (const v of variantes) {
    if (!v.productId || !v.variantId || !productIds.has(v.productId)) continue;
    if (!variantesByProduct.has(v.productId)) variantesByProduct.set(v.productId, []);
    variantesByProduct.get(v.productId).push(v);
  }

  writeFileSync(PRODUCTS_RAW_TS, genProductsRawTs(productos, variantesByProduct, sourceLabel));
  const { ts, warnings: stockWarnings } = genStockTs(productos, variantesByProduct, sourceLabel);
  writeFileSync(STOCK_TS, ts);

  const variantCount = [...variantesByProduct.values()].reduce((s, arr) => s + arr.length, 0);
  const total = varWarnings + stockWarnings;
  console.log(
    `OK: ${productos.length} productos, ${variantCount} variantes.` +
      (total > 0 ? ` (${total} warnings)` : ""),
  );
}

async function syncFromSheets(sheetsId) {
  console.log(`Sincronizando desde Google Sheets (ID: ${sheetsId})…`);
  const [productos, variantes] = await Promise.all([
    fetchSheetTab(sheetsId, "Productos"),
    fetchSheetTab(sheetsId, "Variantes"),
  ]);
  build(productos, variantes, `Google Sheets ${sheetsId}`);
}

function syncFromLocalCsv() {
  const productos = rowsToObjects(parseCsvRfc4180(readFileSync(LOCAL_PRODUCTOS, "utf8")));
  const variantes = existsSync(LOCAL_VARIANTES)
    ? rowsToObjects(parseCsvRfc4180(readFileSync(LOCAL_VARIANTES, "utf8")))
    : [];
  build(productos, variantes, "data/sheets-export-*.csv (local)");
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const sheetsId = process.env.SHEETS_ID;

  if (sheetsId) {
    try {
      await syncFromSheets(sheetsId);
    } catch (e) {
      // No romper el deploy si Google falla: si ya hay archivos generados (último
      // build bueno), seguimos con esos. Mejor el sitio arriba con el catálogo
      // anterior que un build caído.
      if (existsSync(PRODUCTS_RAW_TS) && existsSync(STOCK_TS)) {
        console.warn(`\nWARN: falló el sync desde Sheets (${e.message}).`);
        console.warn("Usando el último products-raw.ts / stock.ts generado. Revisá el Sheet y volvé a publicar.");
        process.exit(0);
      }
      console.error(`\nERROR: ${e.message}`);
      process.exit(1);
    }
  } else if (existsSync(LOCAL_PRODUCTOS)) {
    syncFromLocalCsv();
  } else if (existsSync(PRODUCTS_RAW_TS) && existsSync(STOCK_TS)) {
    // Sin SHEETS_ID ni CSV local: usamos el snapshot ya generado (ej. build local
    // sin env, o repo recién clonado). La verdad sigue siendo el Sheet en prod.
    console.log("INFO: sin SHEETS_ID ni CSV local — usando products-raw.ts / stock.ts ya generados.");
    process.exit(0);
  } else {
    console.error(
      "ERROR: sin SHEETS_ID, sin CSV local y sin archivos generados.\n" +
        "Configurá SHEETS_ID o generá los CSV con 'pnpm sheets:export'.",
    );
    process.exit(1);
  }
}

main();
