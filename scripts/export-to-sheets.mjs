// scripts/export-to-sheets.mjs
//
// Exporta los datos actuales (products-raw.ts + stock.ts) a 2 CSV listos para
// importar en el Google Sheet único (caja negra), con el stock ya embebido en
// la fila:
//
//   data/sheets-export-productos.csv  → pestaña "Productos"  (stock en la fila)
//   data/sheets-export-variantes.csv  → pestaña "Variantes"  (stock por variante)
//
// Uso: node scripts/export-to-sheets.mjs
//
// Después de importar en Google Sheets:
//   1. Configurar SHEETS_ID en .env.local y en Vercel
//   2. Correr: pnpm sheets:sync
//   3. Verificar que products-raw.ts / stock.ts quedan iguales (solo cambia el comentario de origen)

import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const PRODUCTS_RAW_TS = resolve(ROOT, "src/lib/data/products-raw.ts");
const STOCK_TS = resolve(ROOT, "src/lib/data/stock.ts");
const OUT_PRODUCTOS = resolve(ROOT, "data/sheets-export-productos.csv");
const OUT_VARIANTES = resolve(ROOT, "data/sheets-export-variantes.csv");

// stockMap desde stock.ts (fuente actual de stock). Claves: "id" o "id::variantId".
function readStockMap() {
  const src = readFileSync(STOCK_TS, "utf8");
  const map = {};
  const re = /"([^"]+)":\s*(\d+)/g;
  let m;
  while ((m = re.exec(src)) !== null) map[m[1]] = Number(m[2]);
  return map;
}

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


// ── Main ─────────────────────────────────────────────────────────────────────

function main() {
  const source = readFileSync(PRODUCTS_RAW_TS, "utf8");
  const blobs = extractProductBlobs(source);
  const products = blobs.map(parseProductFull).filter((p) => p.productId);
  const stockMap = readStockMap();

  // ── Productos CSV (stock embebido para productos sin variantes) ──
  const productosHeader = csvRow(
    "productId", "nombre", "marca", "categoria",
    "precio", "precio_tachado", "descripcion_corta", "descripcion",
    "imagenes", "destacado", "tags", "stock",
  );
  const productosRows = products.map((p) => {
    const stock = p.variants.length === 0 ? (stockMap[p.productId] ?? 0) : ""; // con variantes: stock por variante
    return csvRow(
      p.productId, p.nombre, p.marca, p.categoria,
      p.precio, p.precio_tachado, p.descripcion_corta, p.descripcion,
      p.imagenes, p.destacado, p.tags, stock,
    );
  });
  writeFileSync(OUT_PRODUCTOS, [productosHeader, ...productosRows].join("\n") + "\n");
  console.log(`OK: ${OUT_PRODUCTOS} — ${products.length} productos`);

  // ── Variantes CSV (stock por variante) ──
  const variantesHeader = csvRow("productId", "variantId", "nombre_variante", "precio_variante", "stock");
  const variantesRows = [];
  for (const p of products) {
    for (const v of p.variants) {
      const stock = stockMap[`${p.productId}::${v.id}`] ?? 0;
      variantesRows.push(csvRow(p.productId, v.id, v.name, v.price ?? "", stock));
    }
  }
  writeFileSync(OUT_VARIANTES, [variantesHeader, ...variantesRows].join("\n") + "\n");
  console.log(`OK: ${OUT_VARIANTES} — ${variantesRows.length} variantes`);

  console.log(`
Listo. Pasos siguientes:
  1. Creá 1 Google Sheet nuevo con 3 pestañas: "Productos", "Variantes", "Órdenes"
  2. En "Productos" y "Variantes": Archivo → Importar → reemplazar hoja con el CSV:
       - Productos:  data/sheets-export-productos.csv
       - Variantes:  data/sheets-export-variantes.csv
     ("Órdenes" se deja vacía; la llena el webhook de ventas)
  3. Copiá el ID del Sheet desde la URL (la parte entre /d/ y /edit)
  4. Agregá SHEETS_ID=<el-id> a tu .env.local y a Vercel
  5. Corré: pnpm sheets:sync  → products-raw.ts / stock.ts deben quedar iguales
`);
}

main();
