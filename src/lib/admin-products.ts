// Lógica de alta/edición de productos sobre la "caja negra" (Google Sheet).
// Server-only: usa src/lib/sheets.ts (service account).

import { appendRows, deleteRows, readTab, updateRow, uniqueProductId, slugify } from "@/lib/sheets";
import { categories } from "@/lib/data/categories";

const PRODUCTOS = "Productos";
const VARIANTES = "Variantes";

// Orden EXACTO de columnas (debe coincidir con el header del Sheet y con sync-sheets.mjs).
const PRODUCT_COLS = [
  "productId", "nombre", "marca", "categoria", "precio", "precio_tachado",
  "descripcion_corta", "descripcion", "imagenes", "destacado", "tags", "stock",
] as const;
const VARIANT_COLS = ["productId", "variantId", "nombre_variante", "precio_variante", "stock"] as const;

export interface VariantInput {
  variantId?: string;
  nombre: string;
  precio?: number | null;
  stock: number;
}

export interface ProductInput {
  nombre: string;
  marca?: string;
  categoria: string;
  precio: number;
  precioTachado?: number | null;
  descripcionCorta: string;
  descripcion: string;
  imagenes: string[];
  destacado: boolean;
  tags: string[];
  stock: number; // solo aplica si no hay variantes
  variants: VariantInput[];
}

const validCategorySlugs = new Set(categories.map((c) => c.slug));

export class ValidationError extends Error {}

function isNonNegInt(n: unknown): n is number {
  return typeof n === "number" && Number.isInteger(n) && n >= 0;
}

export function validate(p: ProductInput): void {
  if (!p.nombre?.trim()) throw new ValidationError("El nombre es obligatorio.");
  if (!validCategorySlugs.has(p.categoria)) throw new ValidationError(`Categoría inválida: '${p.categoria}'.`);
  if (!(Number.isInteger(p.precio) && p.precio > 0)) throw new ValidationError("El precio debe ser un entero mayor a 0.");
  if (p.precioTachado != null && !(Number.isInteger(p.precioTachado) && p.precioTachado > 0))
    throw new ValidationError("El precio tachado debe ser un entero mayor a 0.");
  if (!Array.isArray(p.imagenes) || p.imagenes.length === 0)
    throw new ValidationError("Subí al menos una imagen.");
  if (p.variants.length === 0) {
    if (!isNonNegInt(p.stock)) throw new ValidationError("El stock debe ser un entero ≥ 0.");
  } else {
    for (const v of p.variants) {
      if (!v.nombre?.trim()) throw new ValidationError("Cada variante necesita un nombre.");
      if (!isNonNegInt(v.stock)) throw new ValidationError(`Stock inválido en la variante '${v.nombre}'.`);
      if (v.precio != null && !(Number.isInteger(v.precio) && v.precio > 0))
        throw new ValidationError(`Precio inválido en la variante '${v.nombre}'.`);
    }
  }
}

function productRow(id: string, p: ProductInput): (string | number)[] {
  return [
    id,
    p.nombre.trim(),
    p.marca?.trim() ?? "",
    p.categoria,
    p.precio,
    p.precioTachado ?? "",
    p.descripcionCorta?.trim() ?? "",
    p.descripcion?.trim() ?? "",
    p.imagenes.join(","),
    p.destacado ? "TRUE" : "FALSE",
    p.tags.map((t) => t.trim()).filter(Boolean).join(","),
    p.variants.length === 0 ? p.stock : "", // con variantes, el stock va por variante
  ];
}

function variantRow(productId: string, variantId: string, v: VariantInput): (string | number)[] {
  return [productId, variantId, v.nombre.trim(), v.precio ?? "", v.stock];
}

/** Asigna variantIds únicos dentro del producto a las variantes que no lo tengan. */
function withVariantIds(variants: VariantInput[]): { variantId: string; v: VariantInput }[] {
  const taken = new Set(variants.map((v) => v.variantId).filter(Boolean) as string[]);
  return variants.map((v) => {
    if (v.variantId) return { variantId: v.variantId, v };
    const id = uniqueProductId(v.nombre, taken); // mismo slugify+unicidad
    taken.add(id);
    return { variantId: id, v };
  });
}

// ── Listado / detalle ────────────────────────────────────────────────────────

export interface ProductSummary {
  id: string;
  nombre: string;
  categoria: string;
  precio: number;
  stock: number;
  imagen: string;
  hasVariants: boolean;
}

export async function listProducts(): Promise<ProductSummary[]> {
  const [productos, variantes] = await Promise.all([readTab(PRODUCTOS), readTab(VARIANTES)]);
  const variantStock = new Map<string, number>(); // productId → suma de stock de variantes
  const hasVariants = new Set<string>();
  for (const v of variantes.rows) {
    if (!v.productId) continue;
    hasVariants.add(v.productId);
    variantStock.set(v.productId, (variantStock.get(v.productId) ?? 0) + (Number(v.stock) || 0));
  }
  return productos.rows.map((r) => ({
    id: r.productId,
    nombre: r.nombre,
    categoria: r.categoria,
    precio: Number(r.precio) || 0,
    stock: hasVariants.has(r.productId) ? (variantStock.get(r.productId) ?? 0) : Number(r.stock) || 0,
    imagen: (r.imagenes || "").split(",")[0]?.trim() ?? "",
    hasVariants: hasVariants.has(r.productId),
  }));
}

export async function getProductForEdit(id: string): Promise<ProductInput & { id: string }> {
  const [productos, variantes] = await Promise.all([readTab(PRODUCTOS), readTab(VARIANTES)]);
  const row = productos.rows.find((r) => r.productId === id);
  if (!row) throw new ValidationError("Producto no encontrado.");
  const variants: VariantInput[] = variantes.rows
    .filter((v) => v.productId === id)
    .map((v) => ({
      variantId: v.variantId,
      nombre: v.nombre_variante,
      precio: v.precio_variante ? Number(v.precio_variante) : null,
      stock: Number(v.stock) || 0,
    }));
  return {
    id,
    nombre: row.nombre,
    marca: row.marca,
    categoria: row.categoria,
    precio: Number(row.precio) || 0,
    precioTachado: row.precio_tachado ? Number(row.precio_tachado) : null,
    descripcionCorta: row.descripcion_corta,
    descripcion: row.descripcion,
    imagenes: (row.imagenes || "").split(",").map((s) => s.trim()).filter(Boolean),
    destacado: row.destacado?.toUpperCase() === "TRUE" || row.destacado === "1",
    tags: (row.tags || "").split(",").map((s) => s.trim()).filter(Boolean),
    stock: Number(row.stock) || 0,
    variants,
  };
}

// ── Alta / edición ─────────────────────────────────────────────────────────────

export async function createProduct(p: ProductInput): Promise<string> {
  validate(p);
  const productos = await readTab(PRODUCTOS);
  const id = uniqueProductId(p.nombre, productos.rows.map((r) => r.productId));

  await appendRows(PRODUCTOS, [productRow(id, p)]);
  if (p.variants.length > 0) {
    const rows = withVariantIds(p.variants).map(({ variantId, v }) => variantRow(id, variantId, v));
    await appendRows(VARIANTES, rows);
  }
  return id;
}

export async function updateProduct(id: string, p: ProductInput): Promise<void> {
  validate(p);
  const [productos, variantes] = await Promise.all([readTab(PRODUCTOS), readTab(VARIANTES)]);

  const idx = productos.rows.findIndex((r) => r.productId === id);
  if (idx === -1) throw new ValidationError("Producto no encontrado.");
  await updateRow(PRODUCTOS, productos.rowNumbers[idx], productRow(id, p));

  // Variantes: actualizar las existentes (por variantId) en su fila; agregar las nuevas.
  // ponytail: no se borra físicamente una variante eliminada — se deja en stock 0 (raro en
  // este catálogo). Agregar deleteDimension si hace falta limpiar filas de verdad.
  const existing = new Map<string, number>(); // variantId → rowNumber
  variantes.rows.forEach((v, i) => {
    if (v.productId === id && v.variantId) existing.set(v.variantId, variantes.rowNumbers[i]);
  });

  const toAppend: (string | number)[][] = [];
  for (const { variantId, v } of withVariantIds(p.variants)) {
    const rowNumber = existing.get(variantId);
    if (rowNumber) await updateRow(VARIANTES, rowNumber, variantRow(id, variantId, v));
    else toAppend.push(variantRow(id, variantId, v));
  }
  if (toAppend.length > 0) await appendRows(VARIANTES, toAppend);
}

export async function deleteProduct(id: string): Promise<void> {
  const [productos, variantes] = await Promise.all([readTab(PRODUCTOS), readTab(VARIANTES)]);
  const idx = productos.rows.findIndex((r) => r.productId === id);
  if (idx === -1) throw new ValidationError("Producto no encontrado.");
  await deleteRows(PRODUCTOS, [productos.rowNumbers[idx]]);

  const variantRowNumbers = variantes.rows
    .map((r, i) => (r.productId === id ? variantes.rowNumbers[i] : -1))
    .filter((n) => n > 0);
  if (variantRowNumbers.length > 0) await deleteRows(VARIANTES, variantRowNumbers);
}

/** Opciones de categoría para el dropdown del admin (slug + breadcrumb). */
export function categoryOptions(): { slug: string; label: string }[] {
  const bySlug = new Map(categories.map((c) => [c.slug, c]));
  function path(slug: string): string {
    const c = bySlug.get(slug);
    if (!c) return slug;
    return c.parent ? `${path(c.parent)} › ${c.name}` : c.name;
  }
  return categories
    .map((c) => ({ slug: c.slug, label: path(c.slug) }))
    .sort((a, b) => a.label.localeCompare(b.label, "es"));
}

export { PRODUCT_COLS, VARIANT_COLS };
