// scripts/export-to-sheets.mjs
//
// Exporta los datos actuales de products-raw.ts y data/stock.csv a 3 archivos CSV
// listos para importar en Google Sheets:
//
//   data/sheets-export-productos.csv  → pestaña "Productos"
//   data/sheets-export-variantes.csv  → pestaña "Variantes"
//   data/sheets-export-stock.csv      → pestaña "Stock"
//
// Uso: node scripts/export-to-sheets.mjs
//
// Después de importar en Google Sheets:
//   1. Configurar SHEETS_ID en .env.local y en Vercel
//   2. Correr: pnpm sheets:sync
//   3. Verificar que los archivos generados son iguales a los anteriores

import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const PRODUCTS_RAW_TS = resolve(ROOT, "src/lib/data/products-raw.ts");
const CSV_PATH = resolve(ROOT, "data/stock.csv");
const OUT_PRODUCTOS = resolve(ROOT, "data/sheets-export-productos.csv");
const OUT_VARIANTES = resolve(ROOT, "data/sheets-export-variantes.csv");
const OUT_STOCK = resolve(ROOT, "data/sheets-export-stock.csv");

// ── Escape para CSV (RFC 4180) ───────────────────────────────────────────────

function csvField(value) {
  const s = String(value ?? "");
  if (s.includes(",") || s.includes('"') || s.includes("\n") || s.includes("\r")) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

function csvRow(...fields) {
  return fields.map(csvField).join(",");
}

// ── Parser de products-raw.ts (extrae todos los campos) ─────────────────────

function matchClosingBracket(s, openIdx) {
  let depth = 0, inString = false, stringChar = "", escape = false;
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

function extractProductBlobs(source) {
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
    const c = source[i], next = source[i + 1];

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

  return objects;
}

function decodeStr(escaped) {
  return escaped
    .replace(/\\n/g, "\n")
    .replace(/\\t/g, "\t")
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, "\\");
}

function extractStr(blob, key) {
  const re = new RegExp(`\\b${key}:\\s*"((?:[^"\\\\]|\\\\.)*)"`);
  const m = blob.match(re);
  return m ? decodeStr(m[1]) : null;
}

function extractNum(blob, key) {
  const m = blob.match(new RegExp(`\\b${key}:\\s*(\\d+)`));
  return m ? parseInt(m[1], 10) : null;
}

function extractBool(blob, key) {
  const m = blob.match(new RegExp(`\\b${key}:\\s*(true|false)`));
  return m ? m[1] === "true" : false;
}

function extractTags(blob) {
  const m = blob.match(/\btags:\s*\[([^\]]*)\]/);
  if (!m) return "";
  const tags = [];
  const re = /"([^"]*)"/g;
  let tm;
  while ((tm = re.exec(m[1])) !== null) tags.push(tm[1]);
  return tags.join(",");
}

function extractImages(blob) {
  if (blob.match(/\bimages:\s*PLACEHOLDER_MAKEUP\b/)) return "PLACEHOLDER_MAKEUP";
  if (blob.match(/\bimages:\s*PLACEHOLDER_SKINCARE\b/)) return "PLACEHOLDER_SKINCARE";
  const m = blob.match(/\bimages:\s*\[([^\]]*)\]/);
  if (!m) return "";
  const urls = [];
  const re = /"([^"]*)"/g;
  let um;
  while ((um = re.exec(m[1])) !== null) urls.push(um[1]);
  return urls.join(",");
}

function parseProductFull(blob) {
  // Strip variants block to avoid field name collisions
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
          const vid = extractStr(vb, "id");
          const vname = extractStr(vb, "name");
          const vprice = extractNum(vb, "price");
          if (vid) variants.push({ id: vid, name: vname || "", price: vprice });
          vStart = -1;
        }
        vi++; continue;
      }
      vi++;
    }
  }

  return {
    productId: extractStr(beforeVariants, "id") || "",
    slug: extractStr(beforeVariants, "slug") || "",
    nombre: extractStr(beforeVariants, "name") || "",
    marca: extractStr(beforeVariants, "brand") || "",
    categoria: extractStr(beforeVariants, "category") || "",
    precio: extractNum(beforeVariants, "price") ?? 0,
    precio_tachado: extractNum(beforeVariants, "compareAtPrice") ?? "",
    descripcion_corta: extractStr(beforeVariants, "shortDescription") || "",
    descripcion: extractStr(beforeVariants, "description") || "",
    imagenes: extractImages(beforeVariants),
    destacado: extractBool(beforeVariants, "featured") ? "TRUE" : "FALSE",
    tags: extractTags(beforeVariants),
    variants,
  };
}

// ── Parser del CSV de stock local ────────────────────────────────────────────

function parseStockCsv(content) {
  const lines = content.split(/\r?\n/);
  const rows = [];
  let header = null;
  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const cols = line.split(",").map((c) => c.trim());
    if (!header) { header = cols; continue; }
    if (cols.length < 2) continue;
    // CSV format: productId,stock,variant
    rows.push({ productId: cols[0], stock: cols[1], variantId: cols[2] || "" });
  }
  return rows;
}

// ── Main ─────────────────────────────────────────────────────────────────────

function main() {
  const source = readFileSync(PRODUCTS_RAW_TS, "utf8");
  const blobs = extractProductBlobs(source);
  const products = blobs.map(parseProductFull).filter((p) => p.productId);

  // ── Productos CSV ──
  const productosHeader = csvRow(
    "productId", "slug", "nombre", "marca", "categoria",
    "precio", "precio_tachado", "descripcion_corta", "descripcion",
    "imagenes", "destacado", "tags",
  );
  const productosRows = products.map((p) =>
    csvRow(
      p.productId, p.slug, p.nombre, p.marca, p.categoria,
      p.precio, p.precio_tachado, p.descripcion_corta, p.descripcion,
      p.imagenes, p.destacado, p.tags,
    ),
  );
  writeFileSync(OUT_PRODUCTOS, [productosHeader, ...productosRows].join("\n") + "\n");
  console.log(`OK: ${OUT_PRODUCTOS} — ${products.length} productos`);

  // ── Variantes CSV ──
  const variantesHeader = csvRow("productId", "variantId", "nombre_variante", "precio_variante");
  const variantesRows = [];
  for (const p of products) {
    for (const v of p.variants) {
      variantesRows.push(csvRow(p.productId, v.id, v.name, v.price ?? ""));
    }
  }
  writeFileSync(OUT_VARIANTES, [variantesHeader, ...variantesRows].join("\n") + "\n");
  console.log(`OK: ${OUT_VARIANTES} — ${variantesRows.length} variantes`);

  // ── Stock CSV (from existing stock.csv, converted to new format) ──
  const stockHeader = csvRow("productId", "variantId", "stock");
  let stockRows = [];
  try {
    const csvContent = readFileSync(CSV_PATH, "utf8");
    stockRows = parseStockCsv(csvContent).map((r) =>
      csvRow(r.productId, r.variantId, r.stock),
    );
    console.log(`OK: ${OUT_STOCK} — ${stockRows.length} entradas (desde data/stock.csv)`);
  } catch {
    console.warn(`WARN: no se encontró data/stock.csv — generando stock.csv vacío`);
    // Generate empty rows with 0 stock for each product/variant
    for (const p of products) {
      if (p.variants.length === 0) {
        stockRows.push(csvRow(p.productId, "", "0"));
      } else {
        for (const v of p.variants) {
          stockRows.push(csvRow(p.productId, v.id, "0"));
        }
      }
    }
  }
  writeFileSync(OUT_STOCK, [stockHeader, ...stockRows].join("\n") + "\n");

  console.log(`
Listo. Pasos siguientes:
  1. Abrí Google Sheets y creá un Spreadsheet nuevo
  2. Creá 3 pestañas: "Productos", "Variantes", "Stock"
  3. En cada pestaña: Archivo → Importar → seleccioná el CSV correspondiente
       - Productos:  data/sheets-export-productos.csv
       - Variantes:  data/sheets-export-variantes.csv
       - Stock:      data/sheets-export-stock.csv
  4. Copiá el ID del Sheet desde la URL (la parte entre /d/ y /edit)
  5. Agregá SHEETS_ID=<el-id> a tu .env.local
  6. Corré: pnpm sheets:sync
  7. Verificá que el sitio sigue funcionando igual
`);
}

main();
