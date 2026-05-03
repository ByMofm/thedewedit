// scripts/sync-stock.mjs
// Modo normal:  data/stock.csv          -> src/lib/data/stock.ts
// Modo --init:  src/lib/data/products.ts -> data/stock.csv (one-time bootstrap)

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const CSV_PATH = resolve(ROOT, "data/stock.csv");
const PRODUCTS_TS = resolve(ROOT, "src/lib/data/products.ts");
const STOCK_TS = resolve(ROOT, "src/lib/data/stock.ts");

// ─────────────────────── Parser de products.ts ───────────────────────

function parseProductsTs(source) {
  const decl = source.match(/(?:export\s+)?const\s+products(?:Raw)?\s*:[^=]*=\s*\[/);
  if (!decl) throw new Error("No se encontró 'export const products[Raw]: ... = [' en products.ts");
  const bracketStart = decl.index + decl[0].length - 1;

  const objects = [];
  let i = bracketStart + 1;
  let depthBrace = 0;
  let depthBracket = 1;
  let inString = false;
  let stringChar = "";
  let escape = false;
  let inLineComment = false;
  let inBlockComment = false;
  let currentStart = -1;

  while (i < source.length) {
    const c = source[i];
    const next = source[i + 1];

    if (inLineComment) {
      if (c === "\n") inLineComment = false;
      i++;
      continue;
    }
    if (inBlockComment) {
      if (c === "*" && next === "/") { inBlockComment = false; i += 2; continue; }
      i++;
      continue;
    }
    if (inString) {
      if (escape) { escape = false; i++; continue; }
      if (c === "\\") { escape = true; i++; continue; }
      if (c === stringChar) { inString = false; }
      i++;
      continue;
    }

    if (c === "/" && next === "/") { inLineComment = true; i += 2; continue; }
    if (c === "/" && next === "*") { inBlockComment = true; i += 2; continue; }
    if (c === '"' || c === "'" || c === "`") { inString = true; stringChar = c; i++; continue; }

    if (c === "{") {
      if (depthBrace === 0) currentStart = i;
      depthBrace++;
      i++;
      continue;
    }
    if (c === "}") {
      depthBrace--;
      if (depthBrace === 0 && currentStart !== -1) {
        objects.push(source.slice(currentStart, i + 1));
        currentStart = -1;
      }
      i++;
      continue;
    }
    if (c === "[") { depthBracket++; i++; continue; }
    if (c === "]") {
      depthBracket--;
      if (depthBracket === 0) break;
      i++;
      continue;
    }

    i++;
  }

  return objects.map(parseProduct);
}

function parseProduct(blob) {
  const idMatch = blob.match(/\bid:\s*"([^"]+)"/);
  if (!idMatch) throw new Error(`Producto sin id en bloque:\n${blob.slice(0, 120)}…`);
  const id = idMatch[1];

  let beforeVariants = blob;
  let variants = [];
  const variantsField = blob.match(/\bvariants:\s*\[/);
  if (variantsField) {
    const arrayOpen = variantsField.index + variantsField[0].length - 1;
    const arrayClose = matchClosingBracket(blob, arrayOpen);
    beforeVariants = blob.slice(0, variantsField.index) + blob.slice(arrayClose + 1);
    variants = parseVariants(blob.slice(arrayOpen + 1, arrayClose));
  }

  const stockMatch = beforeVariants.match(/\bstock:\s*(\d+)/);
  const stock = stockMatch ? parseInt(stockMatch[1], 10) : 0;

  return { id, stock, variants };
}

function parseVariants(content) {
  const variants = [];
  let i = 0;
  let depthBrace = 0;
  let inString = false;
  let stringChar = "";
  let escape = false;
  let currentStart = -1;

  while (i < content.length) {
    const c = content[i];
    if (inString) {
      if (escape) { escape = false; i++; continue; }
      if (c === "\\") { escape = true; i++; continue; }
      if (c === stringChar) { inString = false; }
      i++;
      continue;
    }
    if (c === '"' || c === "'" || c === "`") { inString = true; stringChar = c; i++; continue; }
    if (c === "{") {
      if (depthBrace === 0) currentStart = i;
      depthBrace++;
      i++;
      continue;
    }
    if (c === "}") {
      depthBrace--;
      if (depthBrace === 0 && currentStart !== -1) {
        const v = content.slice(currentStart, i + 1);
        const idMatch = v.match(/\bid:\s*"([^"]+)"/);
        if (!idMatch) throw new Error(`Variante sin id: ${v}`);
        const stockMatch = v.match(/\bstock:\s*(\d+)/);
        variants.push({
          id: idMatch[1],
          stock: stockMatch ? parseInt(stockMatch[1], 10) : undefined,
        });
        currentStart = -1;
      }
      i++;
      continue;
    }
    i++;
  }

  return variants;
}

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
      if (c === stringChar) { inString = false; }
      continue;
    }
    if (c === '"' || c === "'" || c === "`") { inString = true; stringChar = c; continue; }
    if (c === "[") depth++;
    else if (c === "]") {
      depth--;
      if (depth === 0) return i;
    }
  }
  throw new Error("Bracket de cierre no encontrado");
}

// ─────────────────────── Parser de CSV ───────────────────────

function parseCsv(content) {
  const lines = content.split(/\r?\n/);
  const rows = [];
  let header = null;
  for (let li = 0; li < lines.length; li++) {
    const raw = lines[li];
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const cols = line.split(",").map((c) => c.trim());
    if (!header) {
      if (cols.length !== 3 || cols[0] !== "productId" || cols[1] !== "stock" || cols[2] !== "variant") {
        throw new Error(`Header inválido en línea ${li + 1}: esperaba 'productId,stock,variant', encontró '${raw}'`);
      }
      header = cols;
      continue;
    }
    if (cols.length !== 3) {
      throw new Error(`Línea ${li + 1}: esperaban 3 columnas, hay ${cols.length}: '${raw}'`);
    }
    const [productId, stockStr, variantId] = cols;
    if (!productId) {
      throw new Error(`Línea ${li + 1}: productId vacío`);
    }
    const stock = Number(stockStr);
    if (!Number.isInteger(stock) || stock < 0) {
      throw new Error(`Línea ${li + 1}: stock inválido '${stockStr}' (debe ser entero >= 0)`);
    }
    rows.push({ productId, variantId, stock, line: li + 1 });
  }
  if (!header) throw new Error("CSV vacío o sin header");
  return rows;
}

// ─────────────────────── Generadores ───────────────────────

function genCsv(productsInfo) {
  const rows = [];
  for (const p of productsInfo) {
    if (p.variants.length === 0) {
      rows.push({ productId: p.id, variantId: "", stock: p.stock });
    } else {
      for (const v of p.variants) {
        rows.push({ productId: p.id, variantId: v.id, stock: v.stock ?? 0 });
      }
    }
  }
  rows.sort((a, b) => {
    if (a.productId !== b.productId) return a.productId.localeCompare(b.productId);
    return a.variantId.localeCompare(b.variantId);
  });
  const lines = [
    "# data/stock.csv — fuente única de stock. Editá y corré `pnpm stock:sync`.",
    "# Una fila por SKU vendible. variant vacío para productos sin variantes; con valor indica variación relacionada.",
    "productId,stock,variant",
    ...rows.map((r) => `${r.productId},${r.stock},${r.variantId}`),
  ];
  return lines.join("\n") + "\n";
}

function genStockTs(rows, productsInfo) {
  const productsById = new Map(productsInfo.map((p) => [p.id, p]));
  const variantSets = new Map(
    productsInfo.map((p) => [p.id, new Set(p.variants.map((v) => v.id))]),
  );

  const map = {};
  let warnings = 0;
  const seen = new Set();

  for (const row of rows) {
    const key = row.variantId ? `${row.productId}::${row.variantId}` : row.productId;
    if (seen.has(key)) {
      throw new Error(`Línea ${row.line}: clave duplicada '${key}'`);
    }
    seen.add(key);

    const product = productsById.get(row.productId);
    if (!product) {
      console.warn(`WARN: línea ${row.line}: productId '${row.productId}' no existe en products.ts (ignorado)`);
      warnings++;
      continue;
    }

    const productHasVariants = product.variants.length > 0;
    if (productHasVariants && !row.variantId) {
      console.warn(`WARN: línea ${row.line}: '${row.productId}' tiene variantes; ignorando fila sin variantId`);
      warnings++;
      continue;
    }
    if (!productHasVariants && row.variantId) {
      console.warn(`WARN: línea ${row.line}: '${row.productId}' no tiene variantes; ignorando fila con variantId='${row.variantId}'`);
      warnings++;
      continue;
    }
    if (productHasVariants && !variantSets.get(row.productId).has(row.variantId)) {
      console.warn(`WARN: línea ${row.line}: variant '${row.variantId}' del producto '${row.productId}' no existe (ignorado)`);
      warnings++;
      continue;
    }

    map[key] = row.stock;
  }

  for (const p of productsInfo) {
    if (p.variants.length === 0) {
      if (!(p.id in map)) {
        console.warn(`WARN: producto '${p.id}' falta en stock.csv (se asumirá stock=0)`);
        warnings++;
      }
    } else {
      for (const v of p.variants) {
        const k = `${p.id}::${v.id}`;
        if (!(k in map)) {
          console.warn(`WARN: variant '${v.id}' del producto '${p.id}' falta en stock.csv (se asumirá stock=0)`);
          warnings++;
        }
      }
    }
  }

  const sortedKeys = Object.keys(map).sort();
  const body = sortedKeys.map((k) => `  ${JSON.stringify(k)}: ${map[k]},`).join("\n");

  const ts = `// AUTO-GENERATED by scripts/sync-stock.mjs — do not edit by hand.
// Source: data/stock.csv
// Run \`pnpm stock:sync\` to regenerate.
export const stockMap: Record<string, number> = {
${body}
};
`;

  return { ts, warnings };
}

// ─────────────────────── Main ───────────────────────

function ensureDir(filePath) {
  const dir = dirname(filePath);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

function main() {
  const args = process.argv.slice(2);
  const initMode = args.includes("--init");

  const productsSource = readFileSync(PRODUCTS_TS, "utf8");
  const productsInfo = parseProductsTs(productsSource);

  if (initMode) {
    if (existsSync(CSV_PATH)) {
      console.error(`ERROR: ${CSV_PATH} ya existe. Borralo primero si querés regenerarlo desde products.ts.`);
      process.exit(1);
    }
    ensureDir(CSV_PATH);
    const csv = genCsv(productsInfo);
    writeFileSync(CSV_PATH, csv);
    const totalRows = productsInfo.reduce((s, p) => s + Math.max(p.variants.length, 1), 0);
    console.log(`OK: data/stock.csv generado con ${totalRows} filas (${productsInfo.length} productos).`);
    const ambiguous = productsInfo.filter(
      (p) => p.variants.length > 0 && p.variants.every((v) => v.stock === undefined) && p.stock > 0,
    );
    if (ambiguous.length > 0) {
      console.warn("");
      console.warn("AVISO: los siguientes productos tienen variantes SIN stock declarado en products.ts");
      console.warn("       pero el producto top-level dice stock > 0. Quedaron como 0 en el CSV.");
      console.warn("       Revisá y ajustá manualmente antes de commitear:");
      for (const p of ambiguous) {
        console.warn(`  - ${p.id} (stock previo: ${p.stock}, variantes: ${p.variants.map((v) => v.id).join(", ")})`);
      }
    }
    return;
  }

  if (!existsSync(CSV_PATH)) {
    console.error(`ERROR: falta data/stock.csv. Corré 'pnpm stock:sync --init' para generarlo desde products.ts.`);
    process.exit(1);
  }

  const csvSource = readFileSync(CSV_PATH, "utf8");
  let rows;
  try {
    rows = parseCsv(csvSource);
  } catch (e) {
    console.error(`ERROR parseando CSV: ${e.message}`);
    process.exit(1);
  }

  const { ts, warnings } = genStockTs(rows, productsInfo);
  ensureDir(STOCK_TS);
  writeFileSync(STOCK_TS, ts);
  const variantCount = productsInfo.reduce((s, p) => s + p.variants.length, 0);
  console.log(`OK: ${productsInfo.length} productos, ${variantCount} variantes, ${warnings} warnings.`);
}

main();
