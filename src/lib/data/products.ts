import type { Product, ProductVariant, ProductSeed } from "@/types";
import { stockMap } from "./stock";
import { productsRaw } from "./products-raw";

function applyStock(p: ProductSeed): Product {
  if (p.variants && p.variants.length > 0) {
    const variants: ProductVariant[] = p.variants.map((v) => ({
      ...v,
      stock: stockMap[`${p.id}::${v.id}`] ?? 0,
    }));
    const total = variants.reduce((sum, v) => sum + (v.stock ?? 0), 0);
    return { ...p, stock: total, variants };
  }
  return { ...p, stock: stockMap[p.id] ?? 0 };
}

export const products: Product[] = productsRaw.map(applyStock);

export function getProduct(slug: string): Product | undefined {
  const p = productsRaw.find((x) => x.slug === slug);
  return p ? applyStock(p) : undefined;
}

export function getFeatured(): Product[] {
  return productsRaw.filter((p) => p.featured).map(applyStock);
}

export function getByCategory(category: string): Product[] {
  return productsRaw.filter((p) => p.category === category).map(applyStock);
}

export function getRelated(product: Product, count = 4): Product[] {
  return productsRaw
    .filter((p) => p.id !== product.id && p.category === product.category)
    .map(applyStock)
    .slice(0, count);
}
