export type CategorySlug =
  | "makeup"
  | "skincare"
  | "brushes"
  | "accesorios"
  | "ojos"
  | "labios"
  | "mejillas"
  | "rostro"
  | "ojos-paletas"
  | "ojos-mascara"
  | "ojos-delineador"
  | "ojos-cejas"
  | "labios-tratamientos"
  | "labios-liner"
  | "labios-lips"
  | "mejillas-contorno"
  | "mejillas-base"
  | "mejillas-blush"
  | "mejillas-corrector"
  | "mejillas-setting"
  | "mejillas-iluminador"
  | "rostro-setting-spray"
  | "rostro-polvos";

export interface Category {
  slug: CategorySlug;
  name: string;
  description?: string;
  image?: string;
  parent?: CategorySlug;
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  brand?: string;
  shortDescription: string;
  description: string;
  price: number;
  compareAtPrice?: number;
  category: CategorySlug;
  tags?: string[];
  images: string[];
  stock: number;
  featured?: boolean;
  variants?: ProductVariant[];
}

export interface ProductVariant {
  id: string;
  name: string;
  price?: number;
  stock?: number;
}

export type ProductSeed = Omit<Product, "stock"> & {
  variants?: Omit<ProductVariant, "stock">[];
};

export interface CartItem {
  productId: string;
  slug: string;
  name: string;
  price: number;
  image: string;
  quantity: number;
  variantId?: string;
  variantName?: string;
}

export interface OrderPayer {
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  zip: string;
}

export type ShippingServiceType = "domicilio" | "sucursal";

export interface ShippingOption {
  id: string;
  name: string;
  type: ShippingServiceType;
  price: number;
  diasHabiles: number;
}

export interface ShippingQuoteResult {
  postalCode: string;
  options: ShippingOption[];
  fetchedAt: number;
}

export type ShippingQuoteState =
  | { status: "idle" }
  | { status: "loading"; postalCode: string }
  | { status: "error"; postalCode: string; message: string; unavailable?: boolean }
  | { status: "success"; result: ShippingQuoteResult; selectedId: string | null };
