"use client";

import * as React from "react";
import { Minus, Plus, ShoppingBag, MessageCircle, Truck, ShieldCheck } from "lucide-react";
import type { Product, ProductVariant } from "@/types";
import { useCart } from "@/lib/store/cart";
import { PriceTag } from "@/components/ui/PriceTag";
import { Rating } from "@/components/ui/Rating";
import { getRating } from "@/lib/ratings";
import { ProductGallery } from "./ProductGallery";
import { Button } from "@/components/ui/Button";
import { toast } from "@/components/ui/Toast";
import { buildOrderMessage, getWhatsAppUrl } from "@/lib/whatsapp";
import { siteConfig } from "@/config/site";
import { formatARS } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { getCategory } from "@/lib/data/categories";

interface ProductDetailProps {
  product: Product;
}

function DescriptionBlock({ text }: { text: string }) {
  const paragraphs = text.split(/\n\n+/);
  return (
    <div className="space-y-3 text-[14px] leading-relaxed text-ink-soft">
      {paragraphs.map((para, i) => {
        const lines = para.split("\n").filter(Boolean);
        const bulletLines = lines.filter((l) => /^[•\-]/.test(l.trim()));
        const headerLines = lines.filter((l) => !/^[•\-]/.test(l.trim()));

        if (bulletLines.length > 0) {
          return (
            <div key={i}>
              {headerLines.map((h, j) => (
                <p key={j} className="mb-2">
                  {h}
                </p>
              ))}
              <ul className="space-y-1.5">
                {bulletLines.map((b, j) => (
                  <li key={j} className="flex items-start gap-2.5">
                    <span className="mt-[7px] size-1.5 flex-shrink-0 rounded-full bg-lavender-deep" />
                    <span>{b.trim().replace(/^[•\-]\s*/, "")}</span>
                  </li>
                ))}
              </ul>
            </div>
          );
        }

        return (
          <p key={i}>
            {lines.map((line, j) => (
              <React.Fragment key={j}>
                {line}
                {j < lines.length - 1 && <br />}
              </React.Fragment>
            ))}
          </p>
        );
      })}
    </div>
  );
}

export function ProductDetail({ product }: ProductDetailProps) {
  const [qty, setQty] = React.useState(1);
  const [variant, setVariant] = React.useState<ProductVariant | undefined>(
    product.variants?.[0],
  );
  const addItem = useCart((s) => s.addItem);
  const hasVariants = (product.variants?.length ?? 0) > 0;
  const effectiveStock = hasVariants ? (variant?.stock ?? 0) : product.stock;
  const rating = getRating(product.id);
  const categoryName = getCategory(product.category)?.name;

  React.useEffect(() => {
    setQty((q) => Math.max(1, Math.min(q, effectiveStock || 1)));
  }, [effectiveStock]);

  const handleAdd = () => {
    addItem(product, variant, qty);
    toast(`${product.name} agregado al carrito`);
  };

  const handleWhatsApp = () => {
    const item = {
      productId: product.id,
      slug: product.slug,
      name: product.name,
      price: variant?.price ?? product.price,
      image: product.images[0],
      quantity: qty,
      variantId: variant?.id,
      variantName: variant?.name,
    };
    const message = buildOrderMessage([item], item.price * item.quantity);
    window.open(getWhatsAppUrl(message), "_blank", "noopener");
  };

  return (
    <div className="container-page py-10 md:py-14">

      {/* Top: image + buy box */}
      <div className="grid gap-10 md:grid-cols-[1.1fr_1fr] md:gap-14">
        <ProductGallery images={product.images} alt={product.name} />

        <div className="flex flex-col gap-6">

          {/* Identity */}
          <div>
            <div className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.13em] text-ink-soft">
              {product.brand && <span>{product.brand}</span>}
              {product.brand && categoryName && <span className="opacity-30">·</span>}
              {categoryName && <span>{categoryName}</span>}
            </div>
            <h1 className="mt-2 font-display text-[1.9rem] leading-tight md:text-[2.3rem]">
              {product.name}
            </h1>
            <div className="mt-2">
              <Rating score={rating.score} count={rating.count} size="md" />
            </div>
          </div>

          {/* Price */}
          <PriceTag
            price={variant?.price ?? product.price}
            compareAtPrice={product.compareAtPrice}
            size="lg"
            showCash
          />

          <hr className="border-ink/8" />

          {/* Variants */}
          {hasVariants && product.variants && (
            <div>
              <p className="mb-3 text-[13px] text-ink-soft">
                Tono:{" "}
                <span className="font-medium text-ink">{variant?.name ?? "—"}</span>
              </p>
              <div className="flex flex-wrap gap-2">
                {product.variants.map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => setVariant(v)}
                    className={cn(
                      "rounded-full border px-3.5 py-1.5 text-[12px] transition-all",
                      v.id === variant?.id
                        ? "border-lavender bg-lavender text-white"
                        : "border-ink/15 text-ink-soft hover:border-ink/35 hover:text-ink",
                    )}
                  >
                    {v.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Quantity + Add to cart */}
          <div className="flex items-center gap-3">
            <div className="flex h-11 items-center rounded-full border border-ink/15">
              <button
                type="button"
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                className="flex size-11 items-center justify-center rounded-full hover:bg-ink/5"
                aria-label="Restar"
              >
                <Minus className="size-3.5" />
              </button>
              <span className="min-w-[2rem] text-center text-sm tabular-nums">{qty}</span>
              <button
                type="button"
                onClick={() => setQty((q) => Math.min(effectiveStock, q + 1))}
                className="flex size-11 items-center justify-center rounded-full hover:bg-ink/5"
                aria-label="Sumar"
                disabled={qty >= effectiveStock}
              >
                <Plus className="size-3.5" />
              </button>
            </div>

            <button
              type="button"
              onClick={handleAdd}
              disabled={effectiveStock <= 0}
              className="flex h-11 flex-1 items-center justify-center gap-2 rounded-full bg-ink px-5 text-[13px] font-medium text-cream-soft transition hover:bg-ink/85 disabled:pointer-events-none disabled:opacity-50"
            >
              <ShoppingBag className="size-4" />
              Agregar al carrito
            </button>
          </div>

          {/* Stock indicator */}
          <p className="-mt-3 text-[12px] text-ink-soft">
            {effectiveStock > 5
              ? "En stock"
              : effectiveStock > 0
                ? `Solo ${effectiveStock} disponibles`
                : "Sin stock"}
          </p>

          {/* WhatsApp */}
          <Button variant="whatsapp" size="md" type="button" onClick={handleWhatsApp}>
            <MessageCircle className="size-4" />
            Consultar por WhatsApp
          </Button>

          {/* Trust signals */}
          <div className="rounded-[var(--radius-md)] border border-ink/8 bg-cream-soft p-4 text-[12px] text-ink-soft">
            <div className="flex items-start gap-2.5">
              <Truck className="mt-0.5 size-3.5 flex-shrink-0 text-lavender-deep" />
              <p>
                {siteConfig.payments.freeShippingThreshold > 0 ? (
                  <>
                    <span className="font-medium text-ink">Envío gratis</span> en compras
                    superiores a {formatARS(siteConfig.payments.freeShippingThreshold)}.{" "}
                  </>
                ) : (
                  <>
                    <span className="font-medium text-ink">Envíos a todo el país</span> con
                    Andreani.{" "}
                  </>
                )}
                Entrega en 24–72hs hábiles.
              </p>
            </div>
            <div className="mt-2.5 flex items-start gap-2.5">
              <ShieldCheck className="mt-0.5 size-3.5 flex-shrink-0 text-lavender-deep" />
              <p>
                <span className="font-medium text-ink">Cambios sin vueltas</span> dentro de los 15
                días si el producto está sin usar.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Description — full width, centered below */}
      <div className="mx-auto mt-14 max-w-2xl border-t border-ink/8 pt-10">
        <h2 className="mb-5 text-[11px] uppercase tracking-[0.13em] text-ink-soft">
          Descripción
        </h2>
        <DescriptionBlock text={product.description} />
      </div>

    </div>
  );
}
