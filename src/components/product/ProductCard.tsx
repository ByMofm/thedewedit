"use client";

import Image from "next/image";
import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { motion } from "framer-motion";
import type { Product } from "@/types";
import { useCart } from "@/lib/store/cart";
import { PriceTag } from "@/components/ui/PriceTag";
import { Rating } from "@/components/ui/Rating";
import { toast } from "@/components/ui/Toast";
import { percentOff } from "@/lib/formatters";
import { getRating } from "@/lib/ratings";

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const addItem = useCart((s) => s.addItem);
  const hasDiscount =
    product.compareAtPrice != null && product.compareAtPrice > product.price;
  const off = hasDiscount ? percentOff(product.price, product.compareAtPrice!) : 0;
  const hasVariants = (product.variants?.length ?? 0) > 0;
  const rating = getRating(product.id);

  const handleAdd = () => {
    if (hasVariants) return;
    addItem(product);
    toast(`${product.name} agregado al carrito`);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="group flex flex-col"
    >
      <Link
        href={`/productos/${product.slug}`}
        className="relative block overflow-hidden rounded-[var(--radius-lg)] bg-cream"
      >
        <div className="relative aspect-[4/5]">
          <Image
            src={product.images[0]}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
          />
          {product.images[1] && (
            <Image
              src={product.images[1]}
              alt=""
              aria-hidden
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              className="object-cover opacity-0 transition-opacity duration-500 group-hover:opacity-100"
            />
          )}
        </div>

        {hasDiscount && (
          <span className="absolute left-3 top-3 rounded-full bg-peach px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-white">
            {off}% off
          </span>
        )}
        {product.stock <= 5 && product.stock > 0 && (
          <span className="absolute right-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-ink backdrop-blur-sm">
            Últimas unidades
          </span>
        )}
      </Link>

      <div className="flex flex-1 flex-col gap-1.5 pt-3">
        <Link href={`/productos/${product.slug}`} className="line-clamp-2 min-h-[2.6rem] text-[13.5px] leading-snug text-ink hover:text-lavender-deep">
          {product.name}
        </Link>
        <Rating score={rating.score} count={rating.count} />
        <div className="mt-1.5">
          <PriceTag price={product.price} compareAtPrice={product.compareAtPrice} size="md" />
        </div>

        {hasVariants ? (
          <Link
            href={`/productos/${product.slug}`}
            className="mt-auto inline-flex h-9 items-center justify-center rounded-full border border-ink/15 px-4 text-[13px] font-medium text-ink hover:border-ink/40"
          >
            Ver opciones
          </Link>
        ) : (
          <button
            type="button"
            onClick={handleAdd}
            disabled={product.stock <= 0}
            className="mt-auto inline-flex h-9 items-center justify-center gap-2 rounded-full bg-ink text-cream-soft px-4 text-[13px] font-medium hover:bg-ink/85 disabled:opacity-50 disabled:pointer-events-none"
          >
            <ShoppingBag className="size-4" />
            Agregar
          </button>
        )}
      </div>
    </motion.div>
  );
}
