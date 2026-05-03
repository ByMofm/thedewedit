import type { Category, CategorySlug } from "@/types";

export const categories: Category[] = [
  // Top level
  {
    slug: "makeup",
    name: "Make Up",
    description: "Paletas, labios, mejillas y rostro de las mejores marcas.",
    image: "https://images.unsplash.com/photo-1631214540553-ff044a3ff1d4?auto=format&fit=crop&w=1200&q=80",
  },
  {
    slug: "skincare",
    name: "Skin Care",
    description: "Mascarillas, parches y tratamientos para una piel radiante.",
    image: "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&w=1200&q=80",
  },
  {
    slug: "brushes",
    name: "Brushes",
    description: "Pinceles y brochas de aplicación profesional.",
    image: "https://images.unsplash.com/photo-1522335789203-aaa2f6b7f31e?auto=format&fit=crop&w=1200&q=80",
  },
  {
    slug: "accesorios",
    name: "Accesorios",
    description: "Todo lo que necesitás para completar tu rutina.",
    image: "https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=1200&q=80",
  },

  // Make Up — nivel 2
  { slug: "ojos",     name: "Ojos",     parent: "makeup" },
  { slug: "labios",   name: "Labios",   parent: "makeup" },
  { slug: "mejillas", name: "Mejillas", parent: "makeup" },
  { slug: "rostro",   name: "Rostro",   parent: "makeup" },

  // Ojos — nivel 3
  { slug: "ojos-paletas",    name: "Paletas",    parent: "ojos" },
  { slug: "ojos-mascara",    name: "Máscara",    parent: "ojos" },
  { slug: "ojos-delineador", name: "Delineador", parent: "ojos" },
  { slug: "ojos-cejas",      name: "Cejas",      parent: "ojos" },

  // Labios — nivel 3
  { slug: "labios-tratamientos", name: "Tratamientos", parent: "labios" },
  { slug: "labios-liner",        name: "Lip Liner",    parent: "labios" },
  { slug: "labios-lips",         name: "Lips",         parent: "labios" },

  // Mejillas — nivel 3
  { slug: "mejillas-contorno",    name: "Contorno",    parent: "mejillas" },
  { slug: "mejillas-base",        name: "Base",        parent: "mejillas" },
  { slug: "mejillas-blush",       name: "Blush",       parent: "mejillas" },
  { slug: "mejillas-corrector",   name: "Corrector",   parent: "mejillas" },
  { slug: "mejillas-setting",     name: "Setting",     parent: "mejillas" },
  { slug: "mejillas-iluminador",  name: "Iluminador",  parent: "mejillas" },

  // Rostro — nivel 3
  { slug: "rostro-setting-spray", name: "Setting Spray", parent: "rostro" },
  { slug: "rostro-polvos",        name: "Polvos",        parent: "rostro" },
];

export function getCategory(slug: string): Category | undefined {
  return categories.find((c) => c.slug === slug);
}

export function getTopLevelCategories(): Category[] {
  return categories.filter((c) => !c.parent);
}

export function getDescendantSlugs(slug: CategorySlug): CategorySlug[] {
  const result: CategorySlug[] = [slug];
  for (const c of categories) {
    if (c.parent === slug) {
      result.push(...getDescendantSlugs(c.slug));
    }
  }
  return result;
}

export function getChildren(slug: CategorySlug): Category[] {
  return categories.filter((c) => c.parent === slug);
}

export function getCategoryPath(slug: CategorySlug): Category[] {
  const cat = getCategory(slug);
  if (!cat) return [];
  if (!cat.parent) return [cat];
  return [...getCategoryPath(cat.parent), cat];
}
